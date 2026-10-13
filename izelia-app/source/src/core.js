/* ================= CORE UTILITIES ================= */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = (p='id') => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a + (b-a)*t;
const smooth = t => t*t*(3-2*t);
const nowIso = () => new Date().toISOString();
const clone = o => JSON.parse(JSON.stringify(o));
const r1 = v => Math.round(v*10)/10;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function fmtDate(iso){ if(!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}); }
function fmtAgo(iso){ if(!iso) return ''; const s=(Date.now()-new Date(iso))/1000; if(s<60) return 'just now'; if(s<3600) return Math.floor(s/60)+' min ago'; if(s<86400) return Math.floor(s/3600)+' h ago'; if(s<86400*30) return Math.floor(s/86400)+' d ago'; return fmtDate(iso); }
function initials(n){ return String(n||'?').replace(/\(.*?\)/g,'').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase() || '?'; }

/* Units: everything is stored in centimetres; inches are a display layer only. */
const Units = {
  get sys(){ return (S.settings && S.settings.units) || 'cm'; },
  show(cm, dp){ if (cm==null || cm==='' || isNaN(cm)) return '—'; return this.sys==='in' ? `${(cm/2.54).toFixed(dp??1)} in` : `${r1(cm)} cm`; },
  val(cm){ if (cm==null || cm==='') return ''; return this.sys==='in' ? +(cm/2.54).toFixed(2) : r1(cm); },
  toCm(v){ if (v===''||v==null||isNaN(+v)) return null; return this.sys==='in' ? +v*2.54 : +v; },
  u(){ return this.sys; },
  len(m){ // fabric lengths in metres/yards
    return this.sys==='in' ? `${(m/0.9144).toFixed(2)} yd` : `${m.toFixed(2)} m`;
  },
  w(kg){ if(kg==null) return '—'; return this.sys==='in' ? `${(kg*2.20462).toFixed(1)} lb` : `${r1(kg)} kg`; },
};
function money(v, cur){ if (v==null || isNaN(v)) return '—'; const c = cur || (S.settings&&S.settings.currency) || 'SLE'; const sym = CURRENCIES[c]||c; return `${sym} ${Math.round(v).toLocaleString()}`; }

/* ================= PERSISTENCE =================
   Two backends behind one interface:
   - cloud: the artifact's shared database (garment library + shares) and
     each person's private subtree (profiles, designs, outfits, settings).
   - local: this browser only. Used when no database is available. */
const Store = {
  mode:'local', db:null, user:null, uid:null,
  role:{owner:false, editor:false, canWrite:null},
  private:{profiles:{}, designs:{}, outfits:{}},
  settings:null, garments:{}, myShares:{items:{}}, allShares:{}, ready:false,
  unsub:[],
  queues:new Map(),

  async init(){
    let db=null, user=null;
    if (window.claude && typeof window.claude.use === 'function'){
      try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch(e){ db=null; user=null; }
    }
    this.user = user;
    if (user){
      try { this.role.owner = !!(await user.isOwner()); } catch{}
      try { this.role.editor = !!(await user.canEdit()); } catch{}
      try { this.role.canWrite = await user.can('data.write'); } catch{ this.role.canWrite = null; }
      try { this.uid = await user.id(); } catch{ this.uid = null; }
    }
    if (db && this.uid){
      this.db = db; this.mode = 'cloud';
      await this.loadCloud();
    } else {
      this.mode = 'local';
      this.loadLocal();
    }
    this.ready = true;
  },

  /* ---------- local ---------- */
  LKEY:'gara-atelier:v1',
  loadLocal(){
    let d=null;
    try { d = JSON.parse(localStorage.getItem(this.LKEY) || 'null'); } catch{ d=null; }
    d = d || {};
    this.private = {profiles:d.profiles||{}, designs:d.designs||{}, outfits:d.outfits||{}};
    this.settings = d.settings || null;
    this.myShares = d.myShares || {items:{}};
    if (d.garments && Object.keys(d.garments).length) this.garments = d.garments;
    else { this.garments = {}; for (const g of makeSeedGarments()) this.garments[g.id]=g; }
    this.allShares = {local:this.myShares};
  },
  saveLocal(){
    try {
      localStorage.setItem(this.LKEY, JSON.stringify({profiles:this.private.profiles, designs:this.private.designs, outfits:this.private.outfits, settings:this.settings, myShares:this.myShares, garments:this.garments}));
      return true;
    } catch(e){ toast('Could not save on this device: browser storage is full or blocked.', true); return false; }
  },

  /* ---------- cloud ---------- */
  home(){ return this.db.doc(`data/users/${this.uid}/home`); },
  async loadCloud(){
    const colls = ['profiles','designs','outfits'];
    await Promise.all(colls.map(async c => {
      try { const snap = await this.home().collection(c).get(); this.private[c] = Object.fromEntries(snap.docs.map(d=>[d.id, d.data()])); }
      catch(e){ this.private[c] = {}; }
    }));
    try { const s = await this.db.doc(`data/users/${this.uid}/settings`).get(); this.settings = s.exists ? s.data() : null; } catch{ this.settings = null; }
    // shared garment library — live, so new garments appear for everyone without a redeploy
    await new Promise(resolve => {
      let first = true;
      const u = this.db.collection('garments').onSnapshot(snap => {
        this.garments = Object.fromEntries(snap.docs.map(d=>[d.id, d.data()]));
        if (first){ first=false; resolve(); } else { App.onRemote('garments', snap.docChanges()); }
      }, err => { if (first){ first=false; resolve(); } toast('Garment library is offline: '+(err.message||err.code), true); });
      this.unsub.push(u);
      setTimeout(()=>{ if(first){ first=false; resolve(); } }, 8000);
    });
    // my shared projects (tailor updates arrive live)
    this.unsub.push(this.db.doc(`shares/${this.uid}`).onSnapshot(s => {
      const before = JSON.stringify(this.myShares);
      this.myShares = s.exists ? s.data() : {items:{}};
      if (!this.myShares.items) this.myShares.items = {};
      if (typeof mergeStatuses==='function') mergeStatuses();
      if (this.ready && before !== JSON.stringify(this.myShares)) App.onRemote('myShares', JSON.parse(before));
    }, ()=>{}));
    if (this.role.editor || this.role.owner){
      this.unsub.push(this.db.collection('shares').onSnapshot(snap => {
        this.allShares = Object.fromEntries(snap.docs.map(d=>[d.id, d.data()]));
        if (typeof mergeStatuses==='function') mergeStatuses();
        if (this.ready) App.onRemote('allShares');
      }, ()=>{}));
    }
  },
  serial(path, fn){
    const prev = this.queues.get(path) || Promise.resolve();
    const p = prev.catch(()=>{}).then(fn);
    this.queues.set(path, p);
    return p;
  },
  async withRetry(fn){
    try { return await fn(); }
    catch(e){ if (e && e.code==='unavailable'){ await sleep(400+Math.random()*600); return fn(); } throw e; }
  },
  explain(e){
    const c = e && e.code;
    if (c==='invalid_argument') return 'Your access level does not allow saving here. Ask the owner for Contributor or Editor access.';
    if (c==='quota_exceeded') return 'Storage is full. Delete some designs or archived garments, then try again.';
    if (c==='resource_exhausted') return 'Too many saves at once. Wait a moment and try again.';
    if (c==='revoked') return 'Access to saved data was withdrawn for this page.';
    return 'Could not save right now. Check your connection and try again.';
  },

  /* ---------- private collections ---------- */
  async put(coll, obj){
    obj.updatedAt = obj.updatedAt || nowIso();
    this.private[coll][obj.id] = obj;
    if (this.mode==='local') return this.saveLocal();
    const ref = this.home().collection(coll).doc(obj.id);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone(obj)))); return true; }
    catch(e){ toast(this.explain(e), true); return false; }
  },
  async del(coll, id){
    delete this.private[coll][id];
    if (this.mode==='local') return this.saveLocal();
    const ref = this.home().collection(coll).doc(id);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.delete())); return true; }
    catch(e){ toast(this.explain(e), true); return false; }
  },
  async putSettings(){
    if (this.mode==='local') return this.saveLocal();
    const ref = this.db.doc(`data/users/${this.uid}/settings`);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone(this.settings)))); return true; }
    catch(e){ toast(this.explain(e), true); return false; }
  },

  /* ---------- shared garment library ---------- */
  canPublish(){
    if (this.mode==='local') return S.demoRole!=='customer';
    return this.role.owner || this.role.editor;
  },
  async putGarment(g){
    g.updatedAt = nowIso();
    if (this.mode==='local'){ this.garments[g.id]=g; return this.saveLocal(); }
    const ref = this.db.collection('garments').doc(g.id);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone(g)))); this.garments[g.id]=g; return true; }
    catch(e){ toast(this.explain(e), true); return false; }
  },
  async delGarment(id){
    if (this.mode==='local'){ delete this.garments[id]; return this.saveLocal(); }
    const ref = this.db.collection('garments').doc(id);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.delete())); delete this.garments[id]; return true; }
    catch(e){ toast(this.explain(e), true); return false; }
  },

  /* ---------- shared projects (customer ↔ tailor) ----------
     Each customer owns shares/<their id>; only they and Editors (tailors) can read it. */
  async putShare(item){
    item.updatedAt = nowIso();
    this.myShares.items[item.id] = item;
    if (this.mode==='local') return this.saveLocal();
    const ref = this.db.doc(`shares/${this.uid}`);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone({owner:this.uid, items:this.myShares.items})))); return true; }
    catch(e){ toast(this.explain(e), true); return false; }
  },
  async delShare(id){
    delete this.myShares.items[id];
    if (this.mode==='local') return this.saveLocal();
    const ref = this.db.doc(`shares/${this.uid}`);
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.set(clone({owner:this.uid, items:this.myShares.items})))); return true; }
    catch(e){ toast(this.explain(e), true); return false; }
  },
  async tailorUpdate(ownerId, itemId, patch){
    if (this.mode==='local'){
      const it = this.myShares.items[itemId]; if (!it) return false;
      Object.assign(it, patch, {updatedAt:nowIso()}); return this.saveLocal();
    }
    const ref = this.db.doc(`shares/${ownerId}`);
    const cur = this.allShares[ownerId]; if (!cur || !cur.items || !cur.items[itemId]) return false;
    const merged = Object.assign({}, cur.items[itemId], patch, {updatedAt:nowIso()});
    cur.items[itemId] = merged;
    try { await this.serial(ref.path, ()=>this.withRetry(()=>ref.update({items:{[itemId]:clone(merged)}}))); return true; }
    catch(e){ toast(this.explain(e), true); return false; }
  },
  async names(ids){
    if (!this.user || !ids.length) return {};
    try { return await this.user.profiles(ids); } catch{ return {}; }
  },
};

/* ================= APP STATE ================= */
const S = {
  route:'home', params:{}, settings:null, demoRole:'customer',
  studio:null,          // working design in Create Your Own
  undo:[], redo:[],
  wardrobe:{tab:'all', q:'', cat:'', color:'', fabric:'', fit:'', designer:'', sort:'new', maxPrice:''},
  outfitDraft:[],       // garment ids being combined
  bodyEdit:null,        // profile being edited (draft)
  workshop:{tab:'materials', source:null},
  viewer:{fitMap:false, tape:false, garmentsOn:true},
  scanPhotos:[],        // session only, never uploaded
  refs:[],              // reference images for studio (session only)
  recent:[],
  fitCache:new Map(),
};

function defaultSettings(){
  return {units:'cm', currency:'GBP', activeProfileId:null, lastSeenGarmentsAt:null, favourites:[], recent:[],
    notif:{newGarments:true, designs:true, tailor:true, processing:true}, notifications:[], technical:false,
    consentScan:false, onboarded:false, theme: window.IZELIA_APP ? 'dark' : 'system', demoRole:'customer'};
}

/* ---------- notifications ---------- */
function notify(kind, title, body, link){
  const s = S.settings; if (!s) return;
  const prefKey = {garment:'newGarments', design:'designs', tailor:'tailor', processing:'processing', profile:'designs'}[kind];
  if (prefKey && s.notif && s.notif[prefKey]===false) return;
  s.notifications = [{id:uid('n'), kind, title, body:body||'', link:link||null, at:nowIso(), read:false}, ...(s.notifications||[])].slice(0,60);
  Store.putSettings();
  App.updateBadges();
}
function unreadCount(){ return (S.settings?.notifications||[]).filter(n=>!n.read).length; }

/* ---------- toasts ---------- */
function toast(msg, bad){
  const box = $('#toasts'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast'+(bad?' bad':''); t.setAttribute('role','status'); t.textContent = msg;
  box.appendChild(t); setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),300); }, bad?5200:2600);
}

/* ---------- capability helpers ---------- */
const Caps = {
  sample:null, downloads:null, sampleImages:false,
  async init(){
    if (!(window.claude && typeof window.claude.use==='function')) return;
    try { this.sample = await window.claude.use('sample'); } catch{ this.sample=null; }
    if (this.sample){ try { const l = await this.sample.limits(); this.sampleImages = !!(l && l.images); } catch{ this.sampleImages=false; } }
    try { this.downloads = await window.claude.use('downloads'); } catch{ this.downloads=null; }
    App.render();
  },
};
async function offerDownload(filename, data){
  if (!Caps.downloads){
    if (!window.claude){ // standalone website or app: plain browser download
      try {
        const ext = filename.split('.').pop();
        const type = {csv:'text/csv', json:'application/json', svg:'image/svg+xml', html:'text/html'}[ext] || 'application/octet-stream';
        const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], {type}));
        const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url), 4000); toast('Downloaded '+filename); return true;
      } catch(e){ toast('This device could not save the file.', true); return false; }
    }
    toast('Saving files is not available in this view.', true); return false;
  }
  try { const r = await Caps.downloads.save({filename, data}); if (r.status==='saved') toast('Saved '+filename); return true; }
  catch(e){
    if (e.code==='declined') return false;
    if (e.code==='rate_limited'){ toast('A save prompt is already open.'); return false; }
    toast('Could not save the file ('+(e.code||'error')+').', true); return false;
  }
}
