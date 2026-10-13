/* ================= STOREFRONT + ADMIN ACTIONS ================= */
Object.assign(VIEWS, {home:viewStoreHome, studio:viewHome, shop:viewShop, product:viewProduct, search:viewSearch, wishlist:viewWishlist, bag:viewBag, checkout:viewCheckout, order:viewOrder, account:viewAccount, about:viewAbout, contact:viewContact, policy:viewPolicy, admin:viewAdmin});

function setHash(){
  const r = S.route; let h = r;
  if (r==='shop') h = S.params.c && S.params.c!=='all' ? S.params.c : 'shop';
  else if (r==='policy') h = S.params.p || 'delivery';
  else if (['product','garment','outfit','order','garmentEdit'].includes(r)) h = r==='product' ? 'p'+(S.params.id||'').replace(/^p/,'') : '';
  try { if (h && ('#'+h)!==location.hash) history.replaceState(null, '', '#'+h); } catch{}
}
function routeFromHash(){
  const h = (location.hash||'').replace('#','');
  if (!h) return null;
  if (COLLECTIONS[h]) return ['shop', {c:h}];
  if (h==='shop' || h==='new') return ['shop', {c:h==='new'?'new':'all'}];
  if (['delivery','returns','terms','privacy','faq'].includes(h)) return ['policy', {p:h}];
  if (/^p\d+$/.test(h) && Store.products['p'+h.slice(1)]) return ['product', {id:'p'+h.slice(1)}];
  if (VIEWS[h] && !['product','garment','outfit','order','garmentEdit'].includes(h)) return [h, {}];
  return null;
}
const _go = App.go.bind(App);
App.go = function(route, params={}){ S.drawerOpen = false; _go(route, params); setHash(); };

function readImg(file, max, q){ return downscale(file, max, q); }

Object.assign(ACT, {
  goShop(el){ const c = el.dataset.c || 'all'; if (S.route!=='shop' || S.params.c!==c){ S.shopF = null; } App.go(el.dataset.r==='shop'?'shop':el.dataset.r, el.dataset.r==='shop'?{c}:{}); },
  goPolicy(el){ App.go('policy', {p:el.dataset.p}); },
  openProduct(el, e){ if (e && e.target.closest('[data-a="quickView"],[data-a="wish"]')) return; S.pview = null; App.go('product', {id:el.dataset.id}); },
  quickView(el, e){ e.stopPropagation(); const p = Store.products[el.dataset.id]; S.qv = {id:p.id, size:p.sizes.length===1?p.sizes[0]:null, qty:1}; App.modal(quickViewModal(p)); },
  qvSize(el){ S.qv.size = el.dataset.v; App.modal(quickViewModal(Store.products[S.qv.id])); },
  qvQty(el){ S.qv.qty = clamp((S.qv.qty||1) + +el.dataset.d, 1, 20); App.modal(quickViewModal(Store.products[S.qv.id])); },
  qvAdd(el){ const r = addToBag(el.dataset.id, S.qv.size, S.qv.qty); if (!r.ok){ toast(r.msg, true); return; } App.closeModal(); toast('Added to your bag'); renderNav(); },
  wish(el, e){ e && e.stopPropagation(); const id = el.dataset.id; const w = Store.shop.wishlist; const has = w.includes(id); Store.shop.wishlist = has ? w.filter(x=>x!==id) : [...w, id]; Store.putShop(); toast(has?'Removed from wishlist':'Saved to wishlist'); if ($('#overlay').innerHTML && S.qv) App.modal(quickViewModal(Store.products[S.qv.id])); App.render(); },
  wishToBag(el){ const p = Store.products[el.dataset.id]; if (p.sizes.length>1){ ACT.quickView(el, {stopPropagation(){}}); return; } const r = addToBag(p.id, null, 1); if (!r.ok){ toast(r.msg, true); return; } Store.shop.wishlist = Store.shop.wishlist.filter(x=>x!==p.id); Store.putShop(); toast('Moved to your bag'); App.render(); },
  pImg(el){ S.pview.img = +el.dataset.i; S.pview.zoom = false; App.render(); },
  pZoom(){ S.pview.zoom = !S.pview.zoom; $('.gallery .main')?.classList.toggle('zoom', S.pview.zoom); },
  pSize(el){ S.pview.size = el.dataset.v; App.render(); },
  pQty(el){ S.pview.qty = clamp(S.pview.qty + +el.dataset.d, 1, 20); const i = $('#pq'); if (i) i.value = S.pview.qty; },
  addBag(el){ const r = addToBag(el.dataset.id, S.pview?.size, S.pview?.qty||1); if (!r.ok){ toast(r.msg, true); if (r.needSize) $('.sizes button')?.focus(); return; } toast('Added to your bag'); renderNav(); },
  bagQty(el){ const l = Store.shop.bag[+el.dataset.i]; const p = Store.products[l.pid]; const n = l.qty + +el.dataset.d; const st = stockOf(p); if (n<1){ ACT.bagRemove(el); return; } if (st.qty!=null && n>st.qty){ toast(`Only ${st.qty} available.`, true); return; } if (n>20){ toast('For more than 20, contact IZELIA.', true); return; } l.qty = n; Store.putShop(); App.render(); },
  bagRemove(el){ Store.shop.bag.splice(+el.dataset.i, 1); Store.putShop(); App.render(); },
  openOrder(el){ App.go('order', {id:el.dataset.id}); },
  addrRemove(el){ Store.shop.addresses.splice(+el.dataset.i, 1); Store.putShop(); App.render(); },
  searchSet(el){ S.searchQ = el.dataset.v; App.render(); const i = $('#search-q'); if (i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  shopSub(el){ shopState().sub = el.dataset.v; shopState().page = 1; App.render(); },
  shopPage(el){ shopState().page = +el.dataset.v; App.render(); window.scrollTo(0, 0); },
  scrollTo(el){ document.getElementById(el.dataset.v)?.scrollIntoView({behavior:'smooth', block:'start'}); },
  shopCols(el){ shopState().cols = +el.dataset.v; App.render(); },
  shopClear(el){ const f = shopState(), k = el.dataset.k; if (k==='all') S.shopF = null; else if (k==='avail') f.avail = false; else f[k] = ''; App.render(); },
  copy(el){ const v = el.dataset.v; try { navigator.clipboard.writeText(v).then(()=>toast('Copied'), ()=>toast(v)); } catch{ toast(v); } },
  contactAgain(){ S.contactSent = false; App.render(); },
  /* tailoring entry points */
  tryOnProduct(el){
    const p = Store.products[el.dataset.id]; const g = productAsGarment(p); if (!g){ toast('This piece has no fitting data yet.', true); return; }
    if (!activeProfile()){ S.pendingTryOn = g.id; toast('Add your measurements first. We’ll bring you back to this piece.'); ACT.newProfile(); return; }
    S.gview = null; App.go('garment', {id:g.id});
  },
  customiseProduct(el){
    const p = Store.products[el.dataset.id]; const g = productAsGarment(p);
    let spec;
    if (g) spec = clone(g.spec);
    else { const b = blockForSubtype(p.subtype, p.name); spec = Object.assign(defaultSpec(b.category), b.o); if (b.o.template) spec.template = b.o.template; }
    spec.name = `${p.name} (custom)`; spec.notes = `Inspired by IZELIA ${p.name}.`;
    if (p.thumb){ spec.fabric = 'izelia'; spec.fabricProduct = null; }
    S.studio = {designId:null, spec, profileId:activeProfile()?.id||null, sourceGarmentId:null, sourceProductId:p.id, tab:'style', brief:'', proposal:null, aiBusy:false, compareV:null, savedJSON:null};
    S.undo = []; S.redo = [];
    App.go('create'); toast(g ? 'Started from this piece’s fitting data' : 'Started from the closest pattern block');
  },
  designWithFabric(el, e){
    e && e.stopPropagation();
    const p = Store.products[el.dataset.id];
    const fp = {id:p.id, name:p.name, price:p.price, currency:p.currency, image:p.thumb||null, unit:p.sellingUnit||''};
    if (S.studio && S.route==='create'){ pushUndo(); }
    if (!S.studio) ensureStudio();
    S.studio.spec.fabric = 'izelia'; S.studio.spec.fabricProduct = fp; S.studio.spec.print = 'solid'; S.studio.tab = 'fabric';
    App.go('create'); toast(`${p.name} is now the design’s fabric`);
  },
  clearFabricProduct(){ pushUndo(); S.studio.spec.fabricProduct = null; S.studio.spec.fabric = 'poplin'; App.render(); },
  /* admin */
  adminTab(el){ S.pedit = null; S.adminTab = el.dataset.t; if (S.route!=='admin') App.go('admin'); else App.render(); },
  productNew(){ S.pedit = {isNew:true, media:{images:[]}, p:{id:uid('p'), wcId:null, name:'', slug:'', price:null, currency:'GBP', type:'garment', subtype:'Dresses', collections:['womenswear'], wcCategories:[], sizes:['One Size'], description:'', material:'', care:'', dimensions:'', sellingUnit:'', stock:{tracked:false, qty:null, inStock:true}, imageFile:'', thumb:null, status:'draft', featured:false, tailoring:{status:'none'}, source:'Added in store admin', createdAt:nowIso(), updatedAt:nowIso()}}; App.render(); },
  productEdit(el){ const p = Store.products[el.dataset.id]; S.pedit = {isNew:false, p:clone(p), media:undefined}; Store.getMedia(p.id).then(m => { if (S.pedit && S.pedit.p.id===p.id){ S.pedit.media = m ? clone(m) : {images:[]}; App.softRender(); } }); App.render(); },
  productBack(){ S.pedit = null; App.render(); },
  peColl(el){ const p = S.pedit.p, k = el.dataset.v; p.collections = p.collections.includes(k) ? p.collections.filter(x=>x!==k) : [...p.collections, k]; App.render(); },
  peImgRemove(el){ S.pedit.media.images.splice(+el.dataset.i, 1); S.pedit.dirtyMedia = true; App.render(); },
  peColor(el){ S.pedit.p.tailoring.spec.color = el.dataset.v; App.render(); },
  peChart(){ const t = S.pedit.p.tailoring; t.sizes = productChart(S.pedit.p, t.spec); t.chartVerified = false; toast('Filled with standard block estimates. Replace them with the real garment’s measurements.'); App.render(); },
  async productSave(){
    const ed = S.pedit, p = ed.p;
    if (!p.name.trim()){ toast('Add a product name.', true); return; }
    if (p.price==null || isNaN(p.price) || p.price<0){ toast('Add a valid price.', true); return; }
    if (!p.collections.length){ toast('Choose at least one collection.', true); return; }
    if (p.stock.tracked && (p.stock.qty==null || p.stock.qty<0)){ toast('Enter the quantity in stock.', true); return; }
    if (p.tailoring?.status==='fit-ready' && !Object.keys(p.tailoring.sizes||{}).length){ toast('Add a size chart before enabling try-on.', true); return; }
    if (p.tailoring?.status==='fit-ready'){ p.tailoring.version = (Store.products[p.id]?.tailoring?.version||0) + 1; }
    if (ed.dirtyMedia && ed.media){ if (await Store.putMedia(p.id, ed.media)===false) return; p.thumb = ed.media.images[0] ? (ed.media.images[0].thumb || null) : null; p.hasMedia = ed.media.images.length>0; }
    if (await Store.putProduct(clone(p))!==false){ toast(`${p.name} saved${p.status==='published'?' and live':''}`); for (const k of [...S.fitCache.keys()]) if (k.includes(':prod-'+p.id+':')) S.fitCache.delete(k); S.pedit = null; App.render(); }
  },
  productDelete(){ const p = S.pedit.p; App.confirm(`Delete ${p.name}?`, 'It’s removed from the shop for everyone. Past orders keep their own record of it.', 'Delete product', async ()=>{ await Store.delProduct(p.id); Store.shop.wishlist = Store.shop.wishlist.filter(x=>x!==p.id); Store.shop.bag = Store.shop.bag.filter(l=>l.pid!==p.id); Store.putShop(); S.pedit = null; App.render(); }); },
  async contentSave(){ applyBrand(); if (await Store.putContent()!==false){ toast('Content saved and live'); App.render(); } },
  acTestimonialAdd(){ const n = $('#tm-name').value.trim(), t = $('#tm-text').value.trim(); if (!n || !t){ toast('Add a name and the review text.', true); return; } Store.content.testimonials.push({name:n, text:t, verified:true, source:'Added in admin'}); App.render(); },
  acTestimonialDel(el){ Store.content.testimonials.splice(+el.dataset.i, 1); App.render(); },
});
function productChart(p, spec){
  const base = sizeChartFor(spec);
  const sizes = p.sizes.length ? p.sizes : ['One Size'];
  const map = {'10':'S','12':'M','14':'M','16':'L','18':'XL','Small':'S','Medium':'M','Large':'L','One Size':'L','12 ':'M'};
  return Object.fromEntries(sizes.map(s => [s, clone(base[map[s] || 'M'])]));
}

Object.assign(IN, {
  shopQ(el){ shopState().q = el.value; clearTimeout(IN._sq); IN._sq = setTimeout(()=>{ const pos = el.selectionStart; App.render(); const n = $('#sf-q'); if (n){ n.focus(); n.setSelectionRange(pos,pos); } }, 250); },
  searchQ(el){ S.searchQ = el.value; clearTimeout(IN._s2); IN._s2 = setTimeout(()=>{ const pos = el.selectionStart; App.render(); const n = $('#search-q'); if (n){ n.focus(); n.setSelectionRange(pos,pos); } }, 200); },
  co(el){ S.co[el.dataset.k] = el.value; },
  adminQ(el){ S.adminQ = el.value; clearTimeout(IN._aq); IN._aq = setTimeout(()=>{ const pos = el.selectionStart; App.render(); const n = $('#ad-q'); if (n){ n.focus(); n.setSelectionRange(pos,pos); } }, 250); },
  pe(el){ S.pedit.p[el.dataset.k] = el.value; },
  peNum(el){ S.pedit.p[el.dataset.k] = el.value==='' ? null : +el.value; },
  peSizes(el){ S.pedit.p.sizes = el.value.split(',').map(s=>s.trim()).filter(Boolean); },
  peQty(el){ S.pedit.p.stock.qty = el.value==='' ? null : Math.max(0, Math.round(+el.value)); },
  ac(el){ Store.content[el.dataset.k] = el.value; },
  acContact(el){ Store.content.contact[el.dataset.k] = el.value; },
});
Object.assign(CH, {
  shopF(el){ shopState()[el.dataset.k] = el.value; shopState().page = 1; App.render(); },
  shopAvail(el){ shopState().avail = el.checked; App.render(); },
  pQtyIn(el){ S.pview.qty = clamp(Math.round(+el.value||1), 1, 20); el.value = S.pview.qty; },
  coDel(el){ S.co.delivery = el.value; App.render(); },
  shopPref(el){ Store.shop.prefs = Object.assign({}, Store.shop.prefs, {[el.dataset.k]:el.checked}); Store.putShop(); toast('Preferences saved'); },
  orderStatus(el){ Store.adminUpdateOrder(el.dataset.o, el.dataset.id, {[el.dataset.k]:el.value}).then(ok=>{ if (ok!==false) toast('Order updated'); }); },
  peType(el){ S.pedit.p.type = el.value; App.render(); },
  peTrack(el){ const s = S.pedit.p.stock; s.tracked = el.checked; if (el.checked && s.qty==null) s.qty = 0; App.render(); },
  peInStock(el){ S.pedit.p.stock.inStock = el.checked; },
  pePub(el){ S.pedit.p.status = el.checked ? 'published' : 'draft'; },
  peFeat(el){ S.pedit.p.featured = el.checked; },
  peFit(el){ const p = S.pedit.p; if (el.checked){ const b = blockForSubtype(p.subtype, p.name); const spec = Object.assign(defaultSpec(b.category), b.o, {name:p.name}); if (b.o.template) spec.template = b.o.template; p.tailoring = Object.assign({}, p.tailoring, {status:'fit-ready', spec, sizes:p.tailoring?.sizes || {}, chartVerified:false}); } else p.tailoring = Object.assign({}, p.tailoring, {status:'none'}); App.render(); },
  peBlock(el){ const t = S.pedit.p.tailoring; const b = blockForSubtype(S.pedit.p.subtype, S.pedit.p.name); const keepColor = t.spec?.color; t.spec = Object.assign(defaultSpec(el.value), CAT[el.value].t===CAT[b.category]?.t ? b.o : {}, {name:S.pedit.p.name}); if (keepColor) t.spec.color = keepColor; App.render(); },
  peSize(el){ const t = S.pedit.p.tailoring; const v = el.value==='' ? null : +el.value; if (v==null) delete t.sizes[el.dataset.s][el.dataset.z]; else t.sizes[el.dataset.s][el.dataset.z] = v; t.chartVerified = false; const c = $('#pe-verified'); if (c) c.checked = false; },
  peVerified(el){ S.pedit.p.tailoring.chartVerified = el.checked; },
  async peImg(el){
    const ed = S.pedit; if (!ed.media) ed.media = {images:[]};
    for (const f of [...el.files]){
      if (ed.media.images.length >= 4){ toast('Up to 4 photos per product.', true); break; }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)){ toast(`${f.name} isn’t a JPEG, PNG or WebP.`, true); continue; }
      try { const data = await readImg(f, 900, .78), thumb = await readImg(f, 360, .7); ed.media.images.push({data, thumb, file:f.name}); ed.dirtyMedia = true; if (ed.media.images.length===1) ed.p.thumb = thumb; }
      catch{ toast(`${f.name} couldn’t be read.`, true); }
    }
    App.render();
  },
  async bulkImg(el){
    const files = [...el.files]; if (!files.length) return;
    const norm = n => n.toLowerCase().replace(/-\d+x\d+(?=\.[a-z]+$)/, '').replace(/-scaled(?=\.[a-z]+$)/, '');
    const byFile = {}; for (const p of productsAll()) if (p.imageFile) byFile[p.imageFile.toLowerCase()] = p;
    const contentMap = Object.fromEntries(Object.entries(CONTENT_IMAGE_FILES).map(([k,v])=>[k.toLowerCase(), v]));
    S.imp = {total:files.length, done:0, matched:0, unmatched:[]}; App.render();
    let contentChanged = false;
    for (const f of files){
      const key = norm(f.name);
      try {
        if (byFile[key]){
          const p = clone(byFile[key]);
          const data = await readImg(f, 900, .78), thumb = await readImg(f, 360, .7);
          const m = clone(await Store.getMedia(p.id) || {images:[]});
          if (!m.images.some(i=>i.file && norm(i.file)===key)) m.images.unshift({data, thumb, file:f.name});
          m.images = m.images.slice(0,4);
          if (await Store.putMedia(p.id, m)!==false){ p.thumb = thumb; p.hasMedia = true; await Store.putProduct(p); S.imp.matched++; }
        } else if (contentMap[key]){
          const tgt = contentMap[key], c = Store.content;
          if (tgt==='logo') c.logo = await readImg(f, 400, .9);
          else if (tgt==='hero') c.heroImage = await readImg(f, 1600, .78);
          else if (tgt.startsWith('tile:')) { c.tileImages = c.tileImages||{}; c.tileImages[tgt.slice(5)] = await readImg(f, 1000, .76); }
          else if (tgt.startsWith('about:')) { c.aboutImages = c.aboutImages||[]; c.aboutImages[+tgt.slice(6)] = await readImg(f, 1000, .76); }
          contentChanged = true; S.imp.matched++;
        } else S.imp.unmatched.push(f.name);
      } catch(e){ S.imp.unmatched.push(f.name+' (unreadable)'); }
      S.imp.done++; App.softRender();
    }
    if (contentChanged){ await Store.putContent(); applyBrand(); }
    toast(`${S.imp.matched} photo${S.imp.matched===1?'':'s'} matched and saved`);
    App.render();
  },
  async acImg(el){
    const f = el.files[0]; if (!f) return; if (!/^image\//.test(f.type)){ toast('Choose an image file.', true); return; }
    const k = el.dataset.k, c = Store.content;
    try {
      if (k==='logo') c.logo = await readImg(f, 400, .9);
      else if (k==='hero') c.heroImage = await readImg(f, 1600, .78);
      else if (k.startsWith('tile:')) { c.tileImages = c.tileImages||{}; c.tileImages[k.slice(5)] = await readImg(f, 1000, .76); }
      toast('Image ready. Save content to publish it.'); App.render();
    } catch{ toast('That image couldn’t be read.', true); }
  },
  acBool(el){ Store.content[el.dataset.k] = el.checked; },
  acSel(el){ Store.content[el.dataset.k] = el.value; },
  acAccent(el){ Store.content.accent = el.value; applyBrand(); App.render(); },
  acDelPrice(el){ const d = Store.content.delivery[+el.dataset.i]; d.price = el.value==='' ? null : +el.value; },
  acDelOn(el){ const d = Store.content.delivery[+el.dataset.i]; if (el.checked && d.price==null){ toast('Set a price before switching this option on.', true); el.checked = false; return; } d.enabled = el.checked; },
  acTestimonial(el){ Store.content.testimonials[+el.dataset.i].verified = el.checked; },
});

/* ---------- forms ---------- */
document.addEventListener('submit', async e => {
  const form = e.target.closest('[data-form]'); if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  const val = id => ($('#'+id)?.value || '').trim();
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  if (kind==='newsletter'){
    const em = val('nl-email');
    if (!emailOk(em)){ toast('Enter a valid email address.', true); return; }
    if (!$('#nl-consent').checked){ toast('Tick the box to agree to receive emails.', true); return; }
    Store.myInbox.newsletter = {email:em, at:nowIso(), consent:true};
    Store.shop.prefs = Object.assign({}, Store.shop.prefs, {newsletter:true}); Store.putShop();
    if (await Store.putInbox()!==false){ toast(Store.mode==='cloud' ? 'Subscribed. IZELIA staff can now see your sign-up.' : 'Saved on this device (preview).'); $('#nl-email').value=''; }
  }
  if (kind==='contact'){
    const m = {name:val('ct-name'), email:val('ct-email'), topic:val('ct-topic'), subject:val('ct-subject'), text:val('ct-msg'), at:nowIso()};
    if (!m.name || !m.subject || !m.text){ toast('Fill in your name, a subject and a message.', true); return; }
    if (!emailOk(m.email)){ toast('Enter a valid email address so IZELIA can reply.', true); return; }
    Store.myInbox.messages = [...(Store.myInbox.messages||[]), m].slice(-20);
    if (await Store.putInbox()!==false){ S.contactSent = true; App.render(); }
  }
  if (kind==='checkout'){
    const co = S.co, lines = bagLines();
    const del = Store.content.delivery.find(d=>d.id===co.delivery && d.enabled);
    const missing = [];
    if (!co.name.trim()) missing.push('name'); if (!emailOk(co.email.trim())) missing.push('a valid email');
    if (!del) missing.push('a delivery method');
    if (co.delivery!=='collect'){ if (!co.line1.trim()) missing.push('address line 1'); if (!co.city.trim()) missing.push('town or city'); if (!co.country.trim()) missing.push('country'); }
    if (missing.length){ toast('Add '+missing.join(', ')+'.', true); return; }
    for (const l of lines){ const st = stockOf(l.p); if (!st.ok || (st.qty!=null && l.qty>st.qty)){ toast(`${l.p.name} is no longer available in that quantity.`, true); return; } }
    const sub = bagSubtotal(), id = uid('o');
    const ref = 'IZ-' + Date.now().toString(36).toUpperCase().slice(-6);
    const order = {id, ref, createdAt:nowIso(), updatedAt:nowIso(), items:lines.map(l=>({pid:l.p.id, name:l.p.name, size:l.size, qty:l.qty, price:l.p.price})), subtotal:sub,
      delivery:{id:del.id, label:del.label, price:del.price||0, eta:del.eta}, total:sub+(del.price||0), currency:'GBP',
      contact:{name:co.name.trim(), email:co.email.trim(), phone:co.phone.trim()}, address: co.delivery==='collect' ? null : {name:co.name, line1:co.line1, line2:co.line2, city:co.city, region:co.region, postcode:co.postcode, country:co.country},
      notes:co.notes||'', payment:'Not paid (test checkout)', fulfilment:'New', deliveryStatus:'Not dispatched', test:true};
    if (await Store.putOrder(order)===false) return;
    // stock decrement for tracked products (staff only can write products; customers' orders are reconciled by staff)
    if (Store.canPublish()) for (const l of lines){ if (l.p.stock?.tracked){ const p = clone(l.p); p.stock.qty = Math.max(0, (p.stock.qty||0) - l.qty); await Store.putProduct(p); } }
    if (order.address && $('#co-save')?.checked && !Store.shop.addresses.some(a=>a.line1===order.address.line1 && a.city===order.address.city)) Store.shop.addresses.unshift(order.address);
    Store.shop.bag = []; Store.putShop(); S.co = null;
    notify('tailor', `Order ${ref} recorded`, 'Test checkout: no payment taken', {r:'account'});
    App.go('order', {id});
  }
});
