/* ================= IZELIA COMMERCE LAYER =================
   Shared catalogue (products, media, site content) plus each customer's
   wishlist, bag, orders and messages. Same Store object as the tailoring app,
   so shopping and tailoring read one account and one catalogue. */
Object.assign(Store, {
  LKEY:'izelia:v1',
  products:{}, content:null, media:{}, shop:{wishlist:[], bag:[], addresses:[], prefs:{newsletter:false, orderUpdates:true}},
  myOrders:{orders:{}}, allOrders:{}, myInbox:{messages:[], newsletter:null}, allInbox:{}, mediaCache:new Map(), me:null,
});
const _loadLocalBase = Store.loadLocal;
Store.loadLocal = function(){
  _loadLocalBase.call(this);
  let d = null; try { d = JSON.parse(localStorage.getItem(this.LKEY) || 'null'); } catch{ d = null; }
  d = d || {};
  this.products = d.products && Object.keys(d.products).length ? d.products : Object.fromEntries(makeCatalogue().map(p=>[p.id,p]));
  this.content = Object.assign(defaultContent(), d.content || {});
  this.media = d.media || {};
  this.shop = Object.assign({wishlist:[], bag:[], addresses:[], prefs:{newsletter:false, orderUpdates:true}}, d.shop || {});
  this.myOrders = d.myOrders || {orders:{}}; this.allOrders = {local:this.myOrders};
  this.myInbox = d.myInbox || {messages:[], newsletter:null}; this.allInbox = {local:this.myInbox};
};
Store.saveLocal = function(){
  try {
    localStorage.setItem(this.LKEY, JSON.stringify({profiles:this.private.profiles, designs:this.private.designs, outfits:this.private.outfits, settings:this.settings, myShares:this.myShares, garments:this.garments,
      products:this.products, content:this.content, media:this.media, shop:this.shop, myOrders:this.myOrders, myInbox:this.myInbox}));
    return true;
  } catch(e){ toast('Could not save on this device: browser storage is full. Photos take the most space; connect an online database to store them (see README).', true); return false; }
};
const _loadCloudBase = Store.loadCloud;
Store.loadCloud = async function(){
  await _loadCloudBase.call(this);
  const db = this.db;
  const firstSnap = (ref, onData, onLater) => new Promise(resolve => {
    let first = true;
    this.unsub.push(ref.onSnapshot(s => { onData(s); if (first){ first=false; resolve(); } else if (onLater) onLater(s); }, () => { if (first){ first=false; resolve(); } }));
    setTimeout(()=>{ if (first){ first=false; resolve(); } }, 8000);
  });
  await Promise.all([
    firstSnap(db.collection('products'), s => { this.products = Object.fromEntries(s.docs.map(d=>[d.id, d.data()])); }, () => App.onRemote('products')),
    firstSnap(db.doc('content/site'), s => { const j = JSON.stringify(s.exists ? s.data() : null); if (j===this._contentSnap) return; this._contentSnap = j; this.content = Object.assign(defaultContent(), s.exists ? s.data() : {}); applyBrand(); }, () => App.onRemote('content')),
    (async () => { try { const s = await db.doc(`data/users/${this.uid}/shop`).get(); if (s.exists) this.shop = Object.assign(this.shop, s.data()); } catch{} })(),
    firstSnap(db.doc(`orders/${this.uid}`), s => { const before = JSON.stringify(this.myOrders); this.myOrders = s.exists ? s.data() : {orders:{}}; if (!this.myOrders.orders) this.myOrders.orders = {}; if (typeof mergeStatuses==='function') mergeStatuses(); this._ordersChanged = before !== JSON.stringify(this.myOrders); }, () => { if (this._ordersChanged) App.onRemote('myOrders'); }),
    firstSnap(db.doc(`inbox/${this.uid}`), s => { this.myInbox = s.exists ? s.data() : {messages:[], newsletter:null}; }),
  ]);
  if (this.role.owner || this.role.editor){
    this.unsub.push(db.collection('orders').onSnapshot(s => { this.allOrders = Object.fromEntries(s.docs.map(d=>[d.id, d.data()])); if (typeof mergeStatuses==='function') mergeStatuses(); if (this.ready) App.onRemote('allOrders'); }, ()=>{}));
    this.unsub.push(db.collection('inbox').onSnapshot(s => { this.allInbox = Object.fromEntries(s.docs.map(d=>[d.id, d.data()])); if (this.ready) App.onRemote('allInbox'); }, ()=>{}));
  }
  try { this.me = await this.user.me(); } catch{ this.me = null; }
};
Object.assign(Store, {
  async putProduct(p){
    p.updatedAt = nowIso();
    if (this.mode==='local'){ this.products[p.id] = p; return this.saveLocal(); }
    const ref = this.db.collection('products').doc(p.id);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone(p)))); this.products[p.id] = p; return true; } catch(e){ toast(this.explain(e), true); return false; }
  },
  async delProduct(id){
    if (this.mode==='local'){ delete this.products[id]; delete this.media[id]; return this.saveLocal(); }
    try { await this.db.collection('products').doc(id).delete(); await this.db.collection('media').doc(id).delete(); delete this.products[id]; return true; } catch(e){ toast(this.explain(e), true); return false; }
  },
  async getMedia(id){
    if (this.mode==='local') return this.media[id] || null;
    if (this.mediaCache.has(id)) return this.mediaCache.get(id);
    try { const s = await this.db.doc('media/'+id).get(); const v = s.exists ? s.data() : null; this.mediaCache.set(id, v); return v; } catch{ return null; }
  },
  async putMedia(id, m){
    if (this.mode==='local'){ this.media[id] = m; return this.saveLocal(); }
    const ref = this.db.doc('media/'+id);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone(m)))); this.mediaCache.set(id, m); return true; } catch(e){ toast(this.explain(e), true); return false; }
  },
  async putContent(){
    this.content.updatedAt = nowIso();
    if (this.mode==='local') return this.saveLocal();
    const ref = this.db.doc('content/site');
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone(this.content)))); return true; } catch(e){ toast(this.explain(e), true); return false; }
  },
  _shopT:null,
  putShop(){
    if (this.mode==='local') return this.saveLocal();
    clearTimeout(this._shopT);
    this._shopT = setTimeout(() => { const ref = this.db.doc(`data/users/${this.uid}/shop`); this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone(this.shop)))).catch(e=>toast(this.explain(e), true)); }, 400);
    return true;
  },
  async putOrder(o){
    this.myOrders.orders[o.id] = o;
    if (this.mode==='local') return this.saveLocal();
    const ref = this.db.doc(`orders/${this.uid}`);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone({owner:this.uid, orders:this.myOrders.orders})))); return true; } catch(e){ delete this.myOrders.orders[o.id]; toast(this.explain(e), true); return false; }
  },
  async adminUpdateOrder(owner, id, patch){
    if (this.mode==='local'){ Object.assign(this.myOrders.orders[id], patch, {updatedAt:nowIso()}); return this.saveLocal(); }
    const cur = this.allOrders[owner]?.orders?.[id]; if (!cur) return false;
    const merged = Object.assign({}, cur, patch, {updatedAt:nowIso()}); this.allOrders[owner].orders[id] = merged;
    const ref = this.db.doc(`orders/${owner}`);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.update({orders:{[id]:clone(merged)}}))); return true; } catch(e){ toast(this.explain(e), true); return false; }
  },
  async putInbox(){
    if (this.mode==='local') return this.saveLocal();
    const ref = this.db.doc(`inbox/${this.uid}`);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone(Object.assign({owner:this.uid}, this.myInbox))))); return true; } catch(e){ toast(this.explain(e), true); return false; }
  },
});

/* ---------- catalogue helpers ---------- */
const productsAll = () => Object.values(Store.products).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
const productsPub = () => productsAll().filter(p=>p.status==='published');
const inCollection = (p, c) => !c || c==='all' || (p.collections||[]).includes(c);
function priceFmt(v, cur){ if (v==null || isNaN(v)) return 'Price on request'; const sym = {GBP:'£', USD:'$', EUR:'€', SLE:'Le '}[cur||'GBP'] || ''; return sym + (+v).toFixed(2).replace(/\.00$/, '.00'); }
function stockOf(p){ if (!p.stock?.tracked) return {ok:p.stock?.inStock!==false, qty:null, label: p.stock?.inStock===false ? 'Out of stock' : 'Available'}; const q = p.stock.qty||0; return {ok:q>0, qty:q, label: q>0 ? (q<=3 ? `Only ${q} left` : 'In stock') : 'Out of stock'}; }
function bagCount(){ return (Store.shop.bag||[]).reduce((a,l)=>a+l.qty, 0); }
function bagLines(){ return (Store.shop.bag||[]).map(l => ({...l, p:Store.products[l.pid]})).filter(l=>l.p); }
function bagSubtotal(){ return bagLines().reduce((a,l)=>a + l.p.price*l.qty, 0); }
function isWished(pid){ return (Store.shop.wishlist||[]).includes(pid); }
function addToBag(pid, size, qty=1){
  const p = Store.products[pid]; if (!p) return {ok:false, msg:'This product is no longer available.'};
  if (p.status!=='published') return {ok:false, msg:'This product is not on sale.'};
  if (p.sizes.length > 1 && !size) return {ok:false, msg:'Choose a size first.', needSize:true};
  if (p.sizes.length===1 && !size) size = p.sizes[0];
  const st = stockOf(p); if (!st.ok) return {ok:false, msg:'This item is out of stock.'};
  const bag = Store.shop.bag;
  const line = bag.find(l => l.pid===pid && (l.size||'')===(size||''));
  const want = (line?.qty||0) + qty;
  if (st.qty!=null && want > st.qty) return {ok:false, msg:`Only ${st.qty} available.`};
  if (want > 20) return {ok:false, msg:'For more than 20 of one item, contact IZELIA.'};
  if (line) line.qty = want; else bag.push({pid, size:size||null, qty, addedAt:nowIso()});
  Store.putShop();
  return {ok:true};
}
function applyBrand(){
  const c = Store.content?.accent;
  if (c && /^#[0-9a-f]{6}$/i.test(c)) document.documentElement.style.setProperty('--accent', c);
}
/* Product → tailoring-library garment, only when the business has added fitting data. */
function productAsGarment(p){
  if (!p || p.tailoring?.status!=='fit-ready' || !p.tailoring.spec) return null;
  return {id:'prod-'+p.id, productId:p.id, name:p.name, category:p.tailoring.spec.category, template:p.tailoring.spec.template, description:p.description || `IZELIA ${p.subtype.toLowerCase()}`,
    spec:p.tailoring.spec, colors:[{n:'As pictured', h:p.tailoring.spec.color}], sizes:p.tailoring.sizes||{}, price:p.price, currency:p.currency, designer:'IZELIA', tags:[], images:p.thumb?[{view:'front', data:p.thumb}]:[],
    fitModes: Object.keys(p.tailoring.sizes||{}).length && p.tailoring.chartVerified ? ['preview','estimated'] : ['preview'], status:'published', version:p.tailoring.version||1, createdAt:p.createdAt, updatedAt:p.updatedAt, fromStore:true};
}
function getGarment(id){ if (Store.garments[id]) return Store.garments[id]; if (String(id).startsWith('prod-')) return productAsGarment(Store.products[id.slice(5)]); return null; }

/* ---------- staff-owned statuses ----------
   Customers write their own order and project records, so the official status
   (payment, fulfilment, delivery, project stage, pattern validation) lives in
   separate staff-only documents that customers can read but not change. */
Object.assign(Store, {myOrderStatus:{orders:{}}, allOrderStatus:{}, myShareStatus:{items:{}}, allShareStatus:{}});
const ORDER_DEFAULTS = {payment:'Not paid (test checkout)', fulfilment:'New', deliveryStatus:'Not dispatched'};
function mergeStatuses(){
  if (Store.mode!=='cloud') return;
  const mergeOrders = (doc, st) => { for (const o of Object.values(doc?.orders||{})){ const s = st?.orders?.[o.id] || {}; for (const k of Object.keys(ORDER_DEFAULTS)) o[k] = s[k] || ORDER_DEFAULTS[k]; } };
  const mergeShares = (doc, st) => { for (const it of Object.values(doc?.items||{})){ const s = st?.items?.[it.id] || {}; it.status = s.status || 'Draft'; it.patternValidated = !!(s.patternValidated && s.validatedVersion===it.designVersion); it.validatedVersion = s.validatedVersion || null; } };
  mergeOrders(Store.myOrders, Store.myOrderStatus); mergeShares(Store.myShares, Store.myShareStatus);
  for (const [o, d] of Object.entries(Store.allOrders||{})) mergeOrders(d, Store.allOrderStatus[o]);
  for (const [o, d] of Object.entries(Store.allShares||{})) mergeShares(d, Store.allShareStatus[o]);
}
const _loadCloudStatus = Store.loadCloud;
Store.loadCloud = async function(){
  await _loadCloudStatus.call(this);
  const db = this.db, uid = this.uid;
  const sub = (ref, set, kind) => new Promise(res => { let f = true; this.unsub.push(ref.onSnapshot(s => { set(s); mergeStatuses(); if (f){ f=false; res(); } else if (this.ready) App.onRemote(kind); }, () => { if (f){ f=false; res(); } })); setTimeout(()=>{ if (f){ f=false; res(); } }, 6000); });
  await Promise.all([
    sub(db.doc('orderStatus/'+uid), s => { this.myOrderStatus = s.exists ? s.data() : {orders:{}}; }, 'myOrderStatus'),
    sub(db.doc('shareStatus/'+uid), s => { this._prevShares = JSON.parse(JSON.stringify(this.myShares)); this.myShareStatus = s.exists ? s.data() : {items:{}}; }, 'myShareStatus'),
  ]);
  if (this.role.owner || this.role.editor){
    this.unsub.push(db.collection('orderStatus').onSnapshot(s => { this.allOrderStatus = Object.fromEntries(s.docs.map(d=>[d.id, d.data()])); mergeStatuses(); if (this.ready) App.onRemote('allOrders'); }, ()=>{}));
    this.unsub.push(db.collection('shareStatus').onSnapshot(s => { this.allShareStatus = Object.fromEntries(s.docs.map(d=>[d.id, d.data()])); mergeStatuses(); if (this.ready) App.onRemote('allShares'); }, ()=>{}));
  }
  mergeStatuses();
};
const STATUS_KEYS = {order:Object.keys(ORDER_DEFAULTS), share:['status','patternValidated','validatedVersion']};
async function writeStatus(coll, owner, field, id, patch){
  const cache = coll==='orderStatus' ? Store.allOrderStatus : Store.allShareStatus;
  const doc = cache[owner] ? clone(cache[owner]) : {owner, [field]:{}};
  doc[field] = doc[field] || {}; doc[field][id] = Object.assign({}, doc[field][id], patch, {updatedAt:nowIso()});
  const ref = Store.db.doc(coll+'/'+owner);
  await Store.serial(ref.path, ()=>Store.withRetry(()=>ref.set(clone(doc))));
  cache[owner] = doc; mergeStatuses();
}
Store.adminUpdateOrder = async function(owner, id, patch){
  if (this.mode==='local'){ Object.assign(this.myOrders.orders[id], patch, {updatedAt:nowIso()}); return this.saveLocal(); }
  try { await writeStatus('orderStatus', owner, 'orders', id, patch); return true; } catch(e){ toast(this.explain(e), true); return false; }
};
const _tailorUpdateBase = Store.tailorUpdate;
Store.tailorUpdate = async function(owner, id, patch){
  if (this.mode==='local') return _tailorUpdateBase.call(this, owner, id, patch);
  const st = {}, rest = {};
  for (const [k,v] of Object.entries(patch)) (STATUS_KEYS.share.includes(k) ? st : rest)[k] = v;
  try {
    if (Object.keys(st).length) await writeStatus('shareStatus', owner, 'items', id, st);
    if (Object.keys(rest).length) return await _tailorUpdateBase.call(this, owner, id, rest);
    return true;
  } catch(e){ toast(this.explain(e), true); return false; }
};
/* What the catalogue says an order should cost, so staff can spot edited totals. */
function expectedTotal(o){
  let t = 0; for (const l of o.items||[]){ const p = Store.products[l.pid]; if (!p) return null; t += p.price*l.qty; }
  const d = (Store.content.delivery||[]).find(x=>x.id===o.delivery?.id); return t + (d?.price||0);
}
