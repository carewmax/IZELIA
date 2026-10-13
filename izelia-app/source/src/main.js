/* ================= APP CONTROLLER ================= */
const VIEWS = {home:viewHome, body:viewBody, create:viewCreate, wardrobe:viewWardrobe, garment:viewGarment, outfit:viewOutfit, workshop:viewWorkshop,
  designs:viewDesigns, projects:viewProjects, tailor:viewTailor, garmentEdit:viewGarmentEdit, notifications:viewNotifications, settings:viewSettings};

const App = {
  pendingRender:false,
  render(){
    if (!Store.ready) return;
    renderNav();
    const main = $('#main');
    let html;
    try { html = (VIEWS[S.route] || viewHome)(); }
    catch(e){ console.error(e); html = `<div class="note warn"><b>Something went wrong showing this page.</b> ${esc(e.message)}<br><button class="btn sm" data-a="go" data-r="home" style="margin-top:8px">Go to the homepage</button></div>`; S.vcfg=null; }
    main.innerHTML = html;
    const host = main.querySelector('[data-stage]');
    if (host && S.vcfg){ Viewer.attach(host); Viewer.setConfig(S.vcfg); }
    else Viewer.attach(null);
    this.pendingRender = false;
  },
  refreshViewer(){
    try { (VIEWS[S.route]||viewHome)(); } catch(e){ return; }
    if (S.vcfg && Viewer.ok) Viewer.setConfig(S.vcfg);
  },
  softRender(){
    const a = document.activeElement;
    if (a && $('#main').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)){ this.pendingRender = true; return; }
    this.render();
  },
  go(route, params={}){
    if (S.route==='wardrobe' && route!=='wardrobe' && route!=='garment'){ S.settings.lastSeenGarmentsAt = nowIso(); Store.putSettings(); }
    if (S.route==='body' && route!=='body') S.bodyEdit = null;
    S.route = route; S.params = params;
    this.closeModal();
    this.render();
    window.scrollTo(0,0);
    $('#main').focus({preventScroll:true});
  },
  updateBadges(){ if (Store.ready) renderNav(); },
  modal(html){ $('#overlay').innerHTML = `<div class="scrim" data-a="scrim">${html}</div>`; const f = $('#overlay').querySelector('input,button,select,textarea'); if (f) f.focus(); },
  closeModal(){ $('#overlay').innerHTML = ''; },
  confirm(title, body, label, fn, danger=true){
    App._confirmFn = fn;
    this.modal(`<div class="modal" role="alertdialog" aria-modal="true" aria-label="${esc(title)}"><h2>${esc(title)}</h2><p class="muted">${body}</p><div class="row"><button class="btn ${danger?'danger':'primary'}" data-a="confirmYes">${esc(label)}</button><button class="btn ghost" data-a="closeModal">Cancel</button></div></div>`);
  },
  onRemote(kind, info){
    if (kind==='garments'){
      const fresh = (info||[]).filter(ch => ch.type==='added').map(ch => ch.doc.data && ch.doc.data()).filter(g => g && g.status==='published' && g.createdBy!==Store.uid);
      if (fresh.length > 2){ notify('garment', `${fresh.length} new garments in the library`, 'They fit your saved avatar with no new scan.', {r:'wardrobe'}); toast(`${fresh.length} new garments in the library`); }
      else for (const g of fresh){ notify('garment', `New in the library: ${g.name}`, `${CAT[g.category]?.label||''} by ${g.designer||'a tailor'}`, {r:'garment', id:g.id}); toast(`New garment: ${g.name}`); }
      for (const ch of (info||[])){
        if (ch.type==='modified' || ch.type==='removed'){ for (const k of [...S.fitCache.keys()]) if (k.includes(':'+(ch.doc.id)+':')) S.fitCache.delete(k); }
      }
      if (['wardrobe','garment','studio','home','tailor','outfit'].includes(S.route)) this.softRender(); else this.updateBadges();
    }
    if (kind==='myShareStatus'){ const prev = Store._prevShares; if (prev && JSON.stringify(prev)!==JSON.stringify(Store.myShares)) this.onRemote('myShares', prev); return; }
    if (kind==='myOrderStatus'){ if (['account','order'].includes(S.route)) this.softRender(); return; }
    if (kind==='myShares'){
      const prev = info || {items:{}};
      for (const it of Object.values(Store.myShares.items||{})){
        const old = prev.items?.[it.id];
        if (old && old.status!==it.status) notify('tailor', `${it.designName}: ${it.status}`, 'Status updated by your tailor', {r:'projects'});
        if (old && (it.comments||[]).length > (old.comments||[]).length){ const c = it.comments[it.comments.length-1]; if (c.by==='tailor') notify('tailor', `Message about ${it.designName}`, c.text.slice(0,80), {r:'projects'}); }
        if (old && !old.patternValidated && it.patternValidated) notify('tailor', `${it.designName}: pattern validated`, 'Your tailor validated the pattern', {r:'projects'});
      }
      if (S.route==='projects' || S.route==='create') this.softRender();
    }
    if (['products','content','myOrders','allOrders','allInbox'].includes(kind)){ if (kind==='content') applyBrand(); if (kind==='myOrders'){ for (const o of Object.values(Store.myOrders.orders||{})){ } } this.softRender(); return; }
    if (kind==='allShares'){ if (S.route==='tailor') { this.loadNames(); this.softRender(); } }
  },
  async loadNames(){
    const ids = Object.keys(Store.allShares||{}).filter(id=>id!=='local' && !(S.names||{})[id]);
    if (!ids.length) return;
    const got = await Store.names(ids); S.names = Object.assign(S.names||{}, got);
    if (S.route==='tailor') this.softRender();
  },
};

/* ---------- helpers ---------- */
function pushUndo(){ S.undo.push(JSON.stringify(S.studio.spec)); if (S.undo.length>60) S.undo.shift(); S.redo = []; }
function setSpec(k, v){
  const sp = S.studio.spec;
  if (sp[k]===v) return;
  pushUndo();
  sp[k] = v;
  if (k==='fabric' && v!=='izelia') sp.fabricProduct = null;
  if (k==='closure' && v==='double-breasted' && (sp.buttons%2 || sp.buttons<2)) sp.buttons = 6;
  if (k==='closure' && v==='buttons' && !sp.buttons) sp.buttons = 5;
  if (k==='sleeve' && v!=='long' && ['barrel','french','ribbed'].includes(sp.cuffs)) sp.cuffs = 'none';
  App.render();
}
function validMeasure(k, v){
  if (v==null) return true;
  const r = k==='height' ? [60,240] : k==='weight' ? [3,300] : ['inseam','outseam','armLength'].includes(k) ? [10,150] : [5,220];
  return v>=r[0] && v<=r[1];
}
async function downscale(file, max=480, q=.72){
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej)=>{ const i = new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
    const s = Math.min(1, max/Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width*s); c.height = Math.round(img.height*s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  } finally { URL.revokeObjectURL(url); }
}
function slug(s){ return String(s||'design').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'design'; }
function currentDesignFromStudio(){ return S.studio?.designId ? Store.private.designs[S.studio.designId] : null; }

async function saveStudioDesign(silent){
  const st = S.studio; const prof = studioProfile();
  const spec = clone(st.spec); spec.name = spec.name || 'Untitled design';
  let d = st.designId ? Store.private.designs[st.designId] : null;
  const note = st.vnote || (d ? 'Edited' : (st.sourceGarmentId ? `Started from ${getGarment(st.sourceGarmentId)?.name||'library garment'}` : 'First version'));
  if (!d){
    d = {id:uid('d'), name:spec.name, profileId: prof.ref?null:prof.id, sourceGarmentId:st.sourceGarmentId||null, sourceGarmentVersion: st.sourceGarmentId ? getGarment(st.sourceGarmentId)?.version : null,
      spec, versions:[{v:1, at:nowIso(), spec:clone(spec), note}], favourite:false, needsRecalc:false, prices:{main:null,lining:null,interfacing:null}, createdAt:nowIso(), updatedAt:nowIso()};
  } else {
    if (JSON.stringify(spec)===st.savedJSON && !silent){ toast('No changes since the last version.'); return d; }
    d.spec = spec; d.name = spec.name; d.profileId = prof.ref ? d.profileId : prof.id; d.needsRecalc = false; d.updatedAt = nowIso();
    d.versions.push({v:d.versions.length+1, at:nowIso(), spec:clone(spec), note});
    if (d.versions.length > 25) d.versions = d.versions.slice(-25);
  }
  const ok = await Store.put('designs', d);
  if (ok!==false){ st.designId = d.id; st.savedJSON = JSON.stringify(d.spec); st.vnote = ''; if (!silent) toast(`Saved version ${d.versions.length}`); }
  return d;
}
function openDesignInStudio(d, tab){
  S.studio = {designId:d.id, spec:clone(d.spec), profileId:d.profileId, sourceGarmentId:d.sourceGarmentId, tab:tab||'style', brief:'', proposal:null, aiBusy:false, compareV:null, savedJSON:JSON.stringify(d.spec)};
  S.undo = []; S.redo = [];
  App.go('create');
}
function buildShareItem(d, prof, opts, existing){
  const now = nowIso();
  return Object.assign(existing ? clone(existing) : {id:uid('s'), status:'Draft', comments:[], createdAt:now, patternValidated:false}, {
    designId:d.id, designName:d.name, designVersion:d.versions.length, spec:clone(d.spec), measurements:opts.measurements, profileName:opts.includeName?prof.name:null,
    message:opts.message||'', units:'cm', updatedAt:now,
  }, existing && existing.designVersion!==d.versions.length ? {patternValidated:false} : {});
}

/* ---------- garment processing pipeline (tailor publish) ---------- */
async function runPipeline(target){
  const ge = S.gedit, g = ge.g;
  const steps = [
    {label:'Validate files', run(){ const bad = (g.images||[]).filter(i=>!/^data:image\/(jpeg|png|webp)/.test(i.data)); if (bad.length) return ['bad', 'Unsupported image data']; return ['ok', `${(g.images||[]).length} photo${(g.images||[]).length===1?'':'s'}${g.asset?', 1 3D file checked (not hosted)':''}${g.patternFile?', 1 pattern file noted':''}`]; }},
    {label:'Identify category', run(){ if (!g.name.trim()) return ['bad','Add a garment name']; if (!CAT[g.category]){ const guess = localInterpret(g.name+' '+g.description).fields.category; if (guess){ g.category = guess; return ['warn', `Guessed “${CAT[guess].label}” from the name`]; } return ['bad','Choose a category']; } return ['ok', `${CAT[g.category].label} → ${TEMPLATE_LABEL[g.spec.template]}`]; }},
    {label:'Extract metadata', run(){ if (!(g.tags||[]).length){ const words = (g.description||'').toLowerCase().match(/\b(linen|denim|silk|wool|ankara|gara|damask|formal|summer|casual|evening|office|traditional)\b/g)||[]; g.tags = [...new Set(words)].slice(0,5); } return [g.description.trim()?'ok':'warn', g.description.trim()? `Tags: ${(g.tags||[]).join(', ')||'none'}` : 'No description; customers see an empty text block']; }},
    {label:'Associate measurements and materials', run(){ const need = {top:['chest','waist'], tee:['chest'], hoodie:['chest'], jacket:['chest','waist'], dress:['chest','waist','hip'], robe:['chest'], bottom:['waist','hip'], skirt:['waist','hip'], suit:['chest','waist','hip']}[g.spec.template]||['chest']; const sizes = Object.keys(g.sizes||{}); const miss = sizes.length ? sizes.flatMap(s=>need.filter(z=>!(g.sizes[s][z]>0)).map(z=>`${s} ${z}`)) : ['size chart']; g._missingChart = miss; return miss.length ? ['warn', `Missing ${miss.slice(0,4).join(', ')}${miss.length>4?'…':''}`] : ['ok', `${sizes.length} sizes, ${FABRICS[g.spec.fabric]?.name}`]; }},
    {label:'Prepare 3D representation', run(){ return g.asset ? ['warn', `Uploaded 3D file validated but not hosted (no asset storage). Using the parametric ${TEMPLATE_LABEL[g.spec.template].toLowerCase()}.`] : ['ok', `Parametric ${TEMPLATE_LABEL[g.spec.template].toLowerCase()} generated from the spec`]; }},
    {label:'Check avatar compatibility', run(){ try { for (const s of Object.keys(g.sizes||{})){ const f = computeFit(REF_PROFILE, g.spec, g.sizes, s); if (f.zones.some(z=>z.garment!=null && (isNaN(z.garment) || z.garment<20))) return ['bad', `Size ${s} has implausible values`]; } return ['ok','Fits the parametric avatar system']; } catch(e){ return ['bad', e.message]; } }},
    {label:'Flag missing data', run(){ const m = []; if (!(g.colors||[]).length) m.push('colour options'); if (g.price==null) m.push('price'); if (!(g.images||[]).length) m.push('photos (flat sketch used)'); if ((g._missingChart||[]).length) m.push('size chart values'); g.processing = {ok:true, missing:m.filter(x=>x!=='price' && !x.startsWith('photos')), at:nowIso()}; return [m.length?'warn':'ok', m.length? 'Missing: '+m.join(', ') : 'Nothing missing']; }},
    {label:'Set fitting modes', run(){ g.fitModes = ['preview']; if (!(g._missingChart||[]).length) g.fitModes.push('estimated'); return ['ok', g.fitModes.includes('estimated') ? 'Preview and estimated fit' : 'Preview only (size chart incomplete)']; }},
    {label: target==='published' ? 'Publish to library' : 'Save draft', run(){ return ['ok', target==='published' ? 'Visible to every customer without a redeploy' : 'Only tailors can see drafts']; }},
  ];
  ge.pipeline = steps.map(s=>({label:s.label, state:'', detail:''}));
  App.render();
  let blocked = false;
  for (let i=0;i<steps.length;i++){
    if (blocked){ ge.pipeline[i].state = ''; ge.pipeline[i].detail = 'Skipped'; continue; }
    ge.pipeline[i].state = 'run'; App.softRender();
    await sleep(220);
    const [state, detail] = steps[i].run();
    ge.pipeline[i].state = state; ge.pipeline[i].detail = detail;
    if (state==='bad') blocked = true;
  }
  delete g._missingChart;
  App.softRender();
  return !blocked;
}

/* ---------- click actions ---------- */
const ACT = {
  scrim(el, e){ if (e.target===el) App.closeModal(); },
  closeModal(){ App.closeModal(); if (S.scanStep!=null){ S.scanStep = null; } },
  confirmYes(){ const fn = App._confirmFn; App._confirmFn = null; App.closeModal(); if (fn) fn(); },
  go(el){ App.go(el.dataset.r); },
  moreMenu(){
    const items = NAV.filter(n=>!n.pro || Store.canPublish()).filter(n=>!['home','body','create','wardrobe'].includes(n.r));
    App.modal(`<div class="modal" role="dialog" aria-modal="true" aria-label="More"><h2>More</h2><div class="plist">${items.map(n=>`<button class="pitem" data-a="go" data-r="${n.r}"><span class="dot" style="background:var(--surface-2);color:var(--ink)">${ic(n.i,'style="width:17px;height:17px"')}</span><b>${n.label}</b>${n.r==='notifications'&&unreadCount()?`<span class="chip tape" style="margin-left:auto">${unreadCount()}</span>`:''}</button>`).join('')}</div><div class="mode-chip ${Store.mode==='cloud'?'cloud':''}"><i></i><span>${Store.mode==='cloud'?'Saved to your account':'Saved on this device only'}</span></div></div>`);
  },
  profileSwitcher(){
    const ps = profiles(), a = activeProfile();
    App.modal(`<div class="modal" role="dialog" aria-modal="true" aria-label="Active body profile"><h2>Active body profile</h2><p class="muted">Every garment and design fits to the active profile.</p>
      ${ps.length?`<div class="plist">${ps.map(p=>`<button class="pitem" data-a="activateProfile" data-id="${p.id}" aria-pressed="${p.id===a?.id}"><span class="dot">${initials(p.name)}</span><span style="flex:1"><b>${esc(p.name)}</b><small>${p.kind==='client'?'Client':p.kind==='household'?'Household':'Me'} · ${Math.round(completeness(p).pct*100)}% complete</small></span>${p.id===a?.id?'<span class="chip accent">Active</span>':''}</button>`).join('')}</div>`:'<p class="muted">No profiles yet.</p>'}
      <div class="row"><button class="btn" data-a="newProfile">${ic('plus')}New profile</button><button class="btn ghost" data-a="go" data-r="body">Manage in My Body</button></div></div>`);
  },
  async activateProfile(el){ S.settings.activeProfileId = el.dataset.id; await Store.putSettings(); S.bodyEdit = null; if (S.studio && !S.studio.designId) S.studio.profileId = el.dataset.id; App.closeModal(); toast(`${Store.private.profiles[el.dataset.id]?.name} is now active`); App.render(); },
  /* viewer */
  vtool(el){ const t = el.dataset.t; if (t==='auto'){ Viewer.auto = !Viewer.auto; el.setAttribute('aria-pressed', Viewer.auto); return; } S.viewer[t] = !S.viewer[t]; if (t==='fitMap'){ App.render(); return; } $$(`[data-a="vtool"][data-t="${t}"]`).forEach(b=>b.setAttribute('aria-pressed', S.viewer[t])); if (S.vcfg) Viewer.setConfig(S.vcfg); Viewer.dirty = true; },
  vzoom(el){ Viewer.zoom(+el.dataset.f); },
  vview(el){ Viewer.view(el.dataset.v); $$('[data-a="vview"]').forEach(b=>b.setAttribute('aria-pressed', b===el && el.dataset.v!=='reset')); },
  vfull(el){ const st = el.closest('.stage'); st.classList.toggle('full'); Viewer.resize(); },
  /* profiles */
  newProfile(el, e, kind){
    const t = nowIso();
    S.bodyEdit = {id:uid('p'), name: kind==='client' ? 'New client' : (profiles().length ? 'New profile' : 'Me'), kind: kind||'self', shape:'m', skin:2, sample:false, method:'manual', verified:false, archived:false, consent:false, m:{}, history:[], createdAt:t, updatedAt:t};
    S.route = 'body'; App.closeModal(); App.render(); window.scrollTo(0,0);
    setTimeout(()=>{ const i = $('#m-height'); if (i) i.focus(); }, 50);
  },
  newClient(el,e){ ACT.newProfile(el, e, 'client'); },
  async loadSamples(){
    const ps = makeSampleProfiles();
    for (const p of ps) if (!Store.private.profiles[p.id]) await Store.put('profiles', p);
    const ds = makeSampleDesigns(ps[0].id);
    ds[0].prices = {main:null, lining:null, interfacing:null};
    for (const d of ds) if (!Store.private.designs[d.id]) await Store.put('designs', d);
    if (!Store.private.outfits['o-sample']) await Store.put('outfits', {id:'o-sample', name:'Weekend linen (sample)', profileId:ps[0].id, items:[{g:'g-camp', size:null, color:'#D9C7A2'},{g:'g-shorts', size:null, color:'#5E6236'}], sample:true, createdAt:nowIso()});
    if (!Store.myShares.items['s-sample']){
      const d = ds[0];
      await Store.putShare({id:'s-sample', sample:true, designId:d.id, designName:d.name, designVersion:1, spec:clone(d.spec), measurements:Object.fromEntries(REQ.suit.filter(k=>ps[0].m[k]!=null).map(k=>[k, ps[0].m[k]])), profileName:ps[0].name, message:'Sample project: wedding in March, I already have the lining fabric.', status:'Ready for cutting', patternValidated:false, comments:[{by:'tailor', text:'Measurements received. Toile fitting booked for Saturday.', at:nowIso()}], createdAt:nowIso(), updatedAt:nowIso()});
    }
    S.settings.activeProfileId = ps[0].id; S.settings.onboarded = true; await Store.putSettings();
    notify('profile', 'Sample people added', 'Kofi and Amara are labelled as samples. Remove them in Settings.');
    App.closeModal(); App.go('studio');
  },
  editProfile(el){ const p = Store.private.profiles[el.dataset.id]; S.bodyEdit = clone(p); App.render(); },
  editProfileGo(el){ S.bodyEdit = clone(Store.private.profiles[el.dataset.id]); S.route='body'; App.render(); },
  pfSkin(el){ S.bodyEdit.skin = +el.dataset.i; App.render(); },
  mfocus(el){ const k = el.dataset.k; if (k && S.bodyFocus!==k){ S.bodyFocus = k; const gEl = $('.guide'); if (gEl){ gEl.querySelector('svg').outerHTML = measureGuideSVG(k); const st = gEl.querySelector('.stack'); st.querySelector('h3').textContent = MBYK[k].label; st.querySelector('p').textContent = MBYK[k].guide; } } },
  quickEstimate(){
    const d = S.bodyEdit; const H = d.m.height;
    if (!H){ toast('Enter your height first.', true); $('#m-height')?.focus(); return; }
    const est = estimateFromHeight(H, d.shape, d.m.weight);
    let n = 0; for (const [k,v] of Object.entries(est)){ if (v!=null && d.m[k]==null){ d.m[k] = v; n++; } }
    if (n){ d.method = 'estimated'; d.verified = false; toast(`${n} measurements estimated from height${d.m.weight?' and weight':''}. Replace them with tape measurements when you can.`); }
    else toast('Nothing to fill: every measurement already has a value.');
    App.render();
  },
  async saveProfile(){
    const d = S.bodyEdit; if (!d) return;
    if (!d.name.trim()){ toast('Give the profile a name.', true); return; }
    const bad = Object.entries(d.m).filter(([k,v])=>!validMeasure(k,v));
    if (bad.length){ toast(`Check ${bad.map(([k])=>MBYK[k].label.toLowerCase()).join(', ')}: the value looks out of range.`, true); return; }
    if (!d.m.height){ toast('Height is needed to build the avatar.', true); return; }
    if (d.kind!=='self' && !d.consent){ toast('Confirm that this person agreed to their measurements being stored.', true); return; }
    const stored = Store.private.profiles[d.id];
    if (stored && JSON.stringify(stored.m)!==JSON.stringify(d.m)){
      d.history = [{at:stored.updatedAt, m:clone(stored.m)}, ...(stored.history||[])].slice(0,6);
      const affected = designs().filter(x=>x.profileId===d.id);
      for (const x of affected){ x.needsRecalc = true; await Store.put('designs', x); }
      if (affected.length) notify('design', `${affected.length} design${affected.length>1?'s':''} may need recalculating`, `Measurements for ${d.name} changed. Saved designs were kept; open them to review fit and materials.`, {r:'designs'});
      if (Object.values(Store.myShares.items||{}).some(s=>Store.private.designs[s.designId]?.profileId===d.id)) notify('design', 'Shared projects use older measurements', 'Open Projects to send updated measurements to your tailor.', {r:'projects'});
    }
    d.updatedAt = nowIso();
    const ok = await Store.put('profiles', clone(d));
    if (ok===false) return;
    if (!S.settings.activeProfileId || !Store.private.profiles[S.settings.activeProfileId] || Store.private.profiles[S.settings.activeProfileId].archived){ S.settings.activeProfileId = d.id; await Store.putSettings(); }
    S.bodyEdit = clone(d);
    toast('Profile saved. Your avatar is updated everywhere.');
    if (S.pendingTryOn && getGarment(S.pendingTryOn)){ const id = S.pendingTryOn; S.pendingTryOn = null; S.gview = null; App.go('garment', {id}); return; }
    App.render();
  },
  revertProfile(){ S.bodyEdit = clone(Store.private.profiles[S.bodyEdit.id]); App.render(); },
  restoreMeasure(el){ const st = Store.private.profiles[S.bodyEdit.id]; const h = st.history[+el.dataset.i]; S.bodyEdit.m = clone(h.m); toast('Earlier measurements loaded. Save to keep them.'); App.render(); },
  async dupProfile(){ const d = clone(Store.private.profiles[S.bodyEdit.id]); d.id = uid('p'); d.name = d.name.replace(/\s*\(sample\)/,'')+' (copy)'; d.sample=false; d.history=[]; d.createdAt=d.updatedAt=nowIso(); await Store.put('profiles', d); S.bodyEdit = clone(d); toast('Profile duplicated'); App.render(); },
  archiveProfile(){ const id = S.bodyEdit.id; App.confirm('Archive this profile?', 'Archived profiles are hidden from fitting but keep their measurements. You can restore them later.', 'Archive', async ()=>{ const p = Store.private.profiles[id]; p.archived = true; await Store.put('profiles', p); if (S.settings.activeProfileId===id){ S.settings.activeProfileId = profiles()[0]?.id||null; await Store.putSettings(); } S.bodyEdit = null; App.render(); }, false); },
  async unarchiveProfile(el){ const p = Store.private.profiles[el.dataset.id]; p.archived = false; await Store.put('profiles', p); App.render(); },
  deleteProfile(){
    const id = S.bodyEdit.id, p = Store.private.profiles[id];
    const n = designs().filter(d=>d.profileId===id).length;
    App.confirm(`Delete ${p.name}?`, `This permanently deletes the measurements, avatar and measurement history. ${n?`${n} design${n>1?'s':''} will be kept but no longer linked to a body.`:''} Measurements already shared with a tailor are removed from those projects.`, 'Delete profile', async ()=>{
      for (const d of designs().filter(d=>d.profileId===id)){ d.profileId = null; await Store.put('designs', d); }
      for (const s of Object.values(Store.myShares.items||{})) if (Store.private.designs[s.designId]?.profileId==null && s.profileName===p.name){ s.measurements = {}; await Store.putShare(s); }
      await Store.del('profiles', id);
      if (S.settings.activeProfileId===id){ S.settings.activeProfileId = profiles()[0]?.id||null; await Store.putSettings(); }
      S.bodyEdit = null; toast('Profile deleted'); App.render();
    });
  },
  setUnits(el){ S.settings.units = el.dataset.u; Store.putSettings(); App.render(); },
  clearScanPhotos(){ S.scanPhotos.forEach(p=>URL.revokeObjectURL(p.url)); S.scanPhotos = []; App.render(); },
  /* scan wizard */
  openScan(){ S.scanStep = 0; App.modal(scanModal()); },
  async scanNext(el){
    if (el.dataset.need==='consent'){ if (!$('#scan-consent')?.checked){ toast('Tick the box to continue.', true); return; } S.settings.consentScan = true; Store.putSettings(); }
    S.scanStep = Math.min(3, S.scanStep+1); App.modal(scanModal());
  },
  scanBack(){ S.scanStep = Math.max(0, S.scanStep-1); App.modal(scanModal()); },
  scanToEditor(){ S.scanStep = null; App.closeModal(); if (!S.bodyEdit && !activeProfile()) ACT.newProfile(); else { S.route='body'; App.render(); } },
  scanEstimate(){ S.scanStep = null; App.closeModal(); if (!S.bodyEdit && !activeProfile()) ACT.newProfile(); else { S.route='body'; App.render(); } toast('Enter your height, then choose “Fill gaps from height”.'); },
  /* home / library */
  openGarment(el, e){
    if (e.target.closest('[data-a="toggleFav"]')) return;
    const id = el.dataset.id; S.settings.recent = [id, ...(S.settings.recent||[]).filter(x=>x!==id)].slice(0,12); Store.putSettings();
    S.gview = null; App.go('garment', {id});
  },
  toggleFav(el, e){ e.stopPropagation(); const id = el.dataset.id; const f = S.settings.favourites||[]; S.settings.favourites = f.includes(id) ? f.filter(x=>x!==id) : [...f, id]; Store.putSettings(); App.render(); },
  openDesign(el){ const d = Store.private.designs[el.dataset.id]; if (!d){ toast('That design was deleted.', true); return; } openDesignInStudio(d); },
  openNotif(el){ const n = (S.settings.notifications||[]).find(x=>x.id===el.dataset.id); if (!n) return; n.read = true; Store.putSettings(); if (n.link?.r==='garment') App.go('garment', {id:n.link.id}); else if (n.link?.r) App.go(n.link.r); else App.render(); },
  readAll(){ (S.settings.notifications||[]).forEach(n=>n.read=true); Store.putSettings(); App.render(); },
  async importStarter(){
    if (!Store.canPublish()){ toast('Only tailors and the owner can add garments.', true); return; }
    const seeds = makeSeedGarments(); let n = 0;
    for (const g of seeds){ if (getGarment(g.id)) continue; g.createdBy = Store.uid || 'local'; if (await Store.putGarment(g)!==false) n++; }
    toast(n ? `${n} starter garments added` : 'The starter collection is already in the library.'); App.render();
  },
  /* studio */
  stTab(el){ S.studio.tab = el.dataset.t; App.render(); },
  spec(el){ const k = el.dataset.k; let v = el.dataset.v; setSpec(k, v); },
  setCategory(el){
    const c = el.dataset.c, st = S.studio; if (st.spec.category===c) return;
    pushUndo();
    const keep = {color:st.spec.color, fabric:st.spec.fabric, print:st.spec.print, printColor:st.spec.printColor, notes:st.spec.notes};
    const fresh = defaultSpec(c);
    const nameWasDefault = !st.spec.name || /^Untitled|design$/.test(st.spec.name);
    st.spec = Object.assign(fresh, st.designId || st.sourceGarmentId ? keep : {}, {name: nameWasDefault ? `Untitled ${CAT[c].label.toLowerCase().replace(/s$/,'')}` : st.spec.name});
    App.render();
  },
  undo(){ if (!S.undo.length) return; S.redo.push(JSON.stringify(S.studio.spec)); S.studio.spec = JSON.parse(S.undo.pop()); App.render(); },
  redo(){ if (!S.redo.length) return; S.undo.push(JSON.stringify(S.studio.spec)); S.studio.spec = JSON.parse(S.redo.pop()); App.render(); },
  newDesign(){
    const go = () => { S.studio = null; ensureStudio(); App.go('create'); };
    if (S.studio && studioDirty() && S.route==='create' && (S.studio.designId || S.undo.length)) App.confirm('Start a new design?', 'Unsaved changes to the current design will be lost.', 'Start new', go, false); else go();
  },
  async saveDesign(){ if (S.studio.designId && !studioDirty()){ toast('Already saved.'); return; } await saveStudioDesign(); App.render(); },
  async interpret(){
    const st = S.studio; const text = st.brief.trim(); if (!text) return;
    st.aiBusy = true; App.render();
    const res = await AI.interpret(text);
    st.aiBusy = false;
    if (!res){ App.render(); return; }
    res.sel = Object.fromEntries(Object.keys(res.fields).map(k=>[k,true]));
    st.proposal = res; App.render();
  },
  aiStop(){ AI.stop(); S.studio.aiBusy = false; App.render(); },
  applyProposal(){
    const st = S.studio, pr = st.proposal; if (!pr) return;
    pushUndo();
    const f = Object.fromEntries(Object.entries(pr.fields).filter(([k])=>pr.sel[k]));
    if (f.category && f.category!==st.spec.category){ const base = defaultSpec(f.category); base.name = st.spec.name; st.spec = base; }
    for (const [k,v] of Object.entries(f)) if (k!=='category') st.spec[k] = v;
    if (f.category) st.spec.category = f.category, st.spec.template = CAT[f.category].t;
    if (pr.notes?.length && !f.notes) st.spec.notes = [st.spec.notes, ...pr.notes].filter(Boolean).join(' ').slice(0,400);
    st.proposal = null; st.tab = 'style';
    toast(`Applied ${Object.keys(f).length} change${Object.keys(f).length===1?'':'s'}. Review them in Style and Fabric.`);
    App.render();
  },
  dismissProposal(){ S.studio.proposal = null; App.render(); },
  refRemove(el){ const r = S.refs.find(x=>x.id===el.dataset.id); if (r) URL.revokeObjectURL(r.url); S.refs = S.refs.filter(x=>x.id!==el.dataset.id); App.render(); },
  async refAnalyze(){
    const st = S.studio; st.aiBusy = true; App.render();
    const res = await AI.analyzeImages(S.refs, st.spec); st.aiBusy = false;
    if (!res){ App.render(); return; }
    if (res.error){ toast(res.error==='images_unavailable' ? 'Image reading is not available in this view.' : res.error==='not_granted' ? 'Claude was not allowed for this page.' : 'Could not read the references. Try fewer or smaller images.', true); App.render(); return; }
    res.sel = Object.fromEntries(Object.keys(res.fields).map(k=>[k,true])); st.proposal = res; st.tab='brief'; App.render();
  },
  compareVersion(el){ const i = +el.dataset.i; S.studio.compareV = (i<0 || S.studio.compareV===i) ? null : i; App.render(); },
  restoreVersion(el){ const d = currentDesignFromStudio(); const v = d.versions[+el.dataset.i]; pushUndo(); S.studio.spec = clone(v.spec); S.studio.compareV = null; S.studio.vnote = `Restored version ${+el.dataset.i+1}`; toast(`Version ${+el.dataset.i+1} loaded. Save to make it the latest.`); App.render(); },
  async dupDesign(el){ const src = Store.private.designs[el.dataset.id]; const d = clone(src); d.id = uid('d'); d.name = src.name.replace(/\s*\(sample\)/,'')+' (copy)'; d.spec.name = d.name; d.sample=false; d.template=false; d.versions = [{v:1, at:nowIso(), spec:clone(d.spec), note:`Duplicated from ${src.name}`}]; d.createdAt=d.updatedAt=nowIso(); await Store.put('designs', d); toast('Design duplicated'); if (S.route==='create') openDesignInStudio(d); else App.render(); },
  async toWorkshop(el){
    const st = S.studio; let d = currentDesignFromStudio();
    if (!d || studioDirty()) d = await saveStudioDesign(true);
    S.workshop.src = {type:'design', id:d.id}; S.workshop.tab = el.dataset.t; const p = studioProfile(); S.workshop.profileId = p.ref ? null : p.id;
    App.go('workshop');
  },
  async shareDesign(){
    if (Store.mode==='cloud' && Store.role.canWrite===false){ toast('Your access level cannot share projects. Ask the owner for Contributor access.', true); return; }
    let d = currentDesignFromStudio(); if (!d || studioDirty()) d = await saveStudioDesign(true);
    if (!d.profileId){ toast('Choose your body profile in the Fit tab first.', true); return; }
    App.modal(shareModal());
  },
  async shareConfirm(){
    const d = currentDesignFromStudio(); const prof = Store.private.profiles[d.profileId];
    const measurements = {}; $$('.sh-m').forEach(c=>{ if (c.checked) measurements[c.dataset.k] = prof.m[c.dataset.k]; });
    const existing = Object.values(Store.myShares.items||{}).find(s=>s.designId===d.id);
    const item = buildShareItem(d, prof, {measurements, includeName:$('#sh-name').checked, message:$('#sh-msg').value.trim()}, existing);
    if (await Store.putShare(item)!==false){ App.closeModal(); toast(existing?'Project updated':'Sent to your tailor'); notify('tailor', `Shared “${d.name}”`, 'Track it in Projects & Orders', {r:'projects'}); App.render(); }
  },
  async saveTemplate(){
    const st = S.studio; const spec = clone(st.spec);
    const d = {id:uid('d'), name:(spec.name||'Template')+' template', profileId:null, spec, template:true, versions:[{v:1, at:nowIso(), spec:clone(spec), note:'Saved as template'}], favourite:false, prices:{}, createdAt:nowIso(), updatedAt:nowIso()};
    d.spec.name = d.name;
    if (await Store.put('designs', d)!==false) toast('Saved to your templates in My Designs');
  },
  /* wardrobe */
  wardTab(el){ S.wardrobe.tab = el.dataset.t; if (S.route!=='wardrobe') App.go('wardrobe'); else App.render(); },
  clearFilters(){ Object.assign(S.wardrobe, {q:'', cat:'', color:'', fabric:'', fit:'', designer:'', maxPrice:''}); App.render(); },
  gColor(el){ S.gview.color = el.dataset.v; if (S.gview.compare===el.dataset.v) S.gview.compare = null; App.render(); },
  gSize(el){ S.gview.size = el.dataset.v; App.render(); },
  gCompare(el){ S.gview.compare = el.dataset.v || null; App.render(); },
  outfitAdd(el){
    const g = getGarment(el.dataset.id); const slots = slotOf(g.spec);
    const removed = [];
    S.outfitDraft = S.outfitDraft.filter(it => { const og = getGarment(it.g); const clash = og && slotOf(og.spec).some(s=>slots.includes(s)); if (clash) removed.push(og.name); return !clash; });
    S.outfitDraft.push({g:g.id, size:S.gview?.id===g.id ? S.gview.size : null, color:S.gview?.id===g.id ? S.gview.color : null});
    toast(removed.length ? `${g.name} replaces ${removed.join(', ')}` : `${g.name} added to the outfit`);
    App.render();
  },
  outfitRemove(el, e){ e.stopPropagation(); S.outfitDraft = S.outfitDraft.filter(it=>it.g!==el.dataset.id); App.render(); },
  outfitClear(){ S.outfitDraft = []; App.render(); },
  openOutfit(el){ App.go('outfit', {id:el.dataset.id}); },
  async outfitSave(){
    if (!S.outfitDraft.length) return;
    const o = {id:uid('o'), name:($('#of-name')?.value||'').trim() || 'My outfit', profileId:activeProfile()?.id||null, items:clone(S.outfitDraft), createdAt:nowIso()};
    if (await Store.put('outfits', o)!==false){ S.outfitDraft = []; toast('Outfit saved'); App.go('outfit', {id:o.id}); }
  },
  async outfitItemRemove(el){ const o = Store.private.outfits[el.dataset.o]; o.items = o.items.filter(i=>i.g!==el.dataset.id); await Store.put('outfits', o); App.render(); },
  outfitDelete(el){ App.confirm('Delete this outfit?', 'The garments stay in the library.', 'Delete outfit', async ()=>{ await Store.del('outfits', el.dataset.id); S.wardrobe.tab='outfits'; App.go('wardrobe'); }); },
  customiseGarment(el){
    const g = getGarment(el.dataset.id);
    const spec = clone(g.spec); spec.name = `${g.name} (custom)`; if (S.gview?.id===g.id) spec.color = S.gview.color;
    S.studio = {designId:null, spec, profileId:activeProfile()?.id||null, sourceGarmentId:g.id, tab:'style', brief:'', proposal:null, aiBusy:false, compareV:null, savedJSON:null};
    S.undo = []; S.redo = [];
    App.go('create');
  },
  garmentWorkshop(el){ S.workshop.src = {type:'garment', id:el.dataset.id}; S.workshop.tab='materials'; App.go('workshop'); },
  /* workshop */
  wsTab(el){ S.workshop.tab = el.dataset.t; App.render(); },
  wsLayoutMat(el){ S.workshop.layoutMat = el.dataset.v; App.render(); },
  toggleTechnical(){ S.settings.technical = !S.settings.technical; Store.putSettings(); App.render(); },
  async exportCSV(){
    const {mat, spec} = S.lastMat;
    const lines = [['Item','Quantity','Unit','Width (cm)','Price per unit','Cost']];
    for (const r of mat.rows){ const q = Units.sys==='in' ? r.m/0.9144 : r.m; lines.push([r.label, q.toFixed(2), Units.sys==='in'?'yd':'m', Math.round(r.width), r.price??'', r.price? (r.price*q).toFixed(0):'' ]); }
    for (const n of mat.notions) lines.push([n.label, n.qty, n.unit, '', '', '']);
    const csv = lines.map(l=>l.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    await offerDownload(`${slug(spec.name)}-materials.csv`, csv);
  },
  async exportPatternSVG(){
    const {mat, spec, prof} = S.lastMat; const sa = mat.sa;
    let y = 4, maxW = 0; const parts = [];
    for (const p of mat.draft.pieces){
      const cut = offsetPoly(p.poly, sa); const b = bbox(cut);
      const dx = 4 - b.x0, dy = y - b.y0;
      parts.push(`<g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)})">${pieceSVG(p, sa, {mm:true}).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`);
      y += b.h + 6; maxW = Math.max(maxW, b.w + 8);
    }
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${maxW.toFixed(1)}cm" height="${(y).toFixed(1)}cm" viewBox="0 0 ${maxW.toFixed(1)} ${y.toFixed(1)}" style="color:#1D1C1A"><title>${esc(spec.name)} pattern for ${esc(prof.name)} — draft, 1:1 scale in cm</title>${parts.join('')}</svg>`;
    await offerDownload(`${slug(spec.name)}-pattern-1to1.svg`, svg);
  },
  async exportJSON(){
    const {mat, spec, prof, src} = S.lastMat;
    const data = {format:'gara-atelier/garment-spec@1', exportedAt:nowIso(), status:'draft-not-validated', design:{name:spec.name, version: src.design? src.design.versions.length : src.garment?.version, spec},
      body:{profile:prof.name, units:'cm', measurements:prof.m, estimated:mat.draft.body.estimated}, finished:{chest:mat.draft.finished.chest, waist:mat.draft.finished.waist, hip:mat.draft.finished.hip, length:mat.draft.finished.length, sleeve:mat.draft.finished.sleeve},
      pieces:mat.draft.pieces.map(p=>({name:p.name, qty:p.qty, fold:p.fold, material:p.mat, interfacing:p.interface, polygonCm:p.poly.map(([x,y])=>[+x.toFixed(2), +y.toFixed(2)])})),
      materials:mat.rows.map(r=>({item:r.label, metres:+r.m.toFixed(2), widthCm:r.width})), notions:mat.notions, assumptions:mat.assumptions};
    await offerDownload(`${slug(spec.name)}.json`, JSON.stringify(data, null, 2));
  },
  async exportSheet(){
    const {mat, spec, prof, src} = S.lastMat;
    const css = `:root{--ink:#1D1C1A;--ink-2:#585349;--ink-3:#857F73;--surface:#fff;--surface-2:#F2EEE6;--line:#D8D0C2;--accent:#2C3A92}body{font-family:"Hanken Grotesk",Helvetica,Arial,sans-serif;color:#1D1C1A;background:#fff;max-width:920px;margin:32px auto;padding:0 20px;line-height:1.5}h2,h3{margin:0}.display{font-family:"Bodoni Moda",Didot,Georgia,serif;font-weight:500}.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#857F73;font-weight:600}.sheet-doc{display:flex;flex-direction:column;gap:20px}.spread{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.two{display:grid;grid-template-columns:1fr 1fr;gap:20px}.flats{display:grid;grid-template-columns:1fr 1fr;gap:16px}.flats div{background:#F2EEE6;border-radius:10px;padding:12px;text-align:center;font-size:12px;color:#857F73}.flats svg{width:100%;max-width:260px;height:auto;color:#1D1C1A}@media print{body{margin:0}}`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(spec.name)} technical sheet</title><style>${css}</style></head><body>${techSheetHTML(mat, prof, spec, src, true)}</body></html>`;
    await offerDownload(`${slug(spec.name)}-technical-sheet.html`, html);
  },
  async exportFlat(){
    const {spec} = S.lastMat;
    const f = flatSVG(spec,'front').replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,''), b = flatSVG(spec,'back').replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 260" width="1680" height="1040" style="color:#1D1C1A"><rect width="420" height="260" fill="#fff"/><g transform="translate(5 5)">${f}</g><g transform="translate(215 5)">${b}</g><text x="105" y="255" font-family="Helvetica" font-size="8" text-anchor="middle">FRONT</text><text x="315" y="255" font-family="Helvetica" font-size="8" text-anchor="middle">BACK</text></svg>`;
    await offerDownload(`${slug(spec.name)}-flats.svg`, svg);
  },
  /* designs */
  async favDesign(el){ const d = Store.private.designs[el.dataset.id]; d.favourite = !d.favourite; await Store.put('designs', d); App.render(); },
  renameDesign(el){ const d = Store.private.designs[el.dataset.id]; App._renameId = d.id; App.modal(`<div class="modal" role="dialog" aria-modal="true" aria-label="Rename design"><h2>Rename design</h2><label class="field">Name<input type="text" id="rn-name" value="${esc(d.name)}"></label><div class="row"><button class="btn primary" data-a="renameConfirm">Rename</button><button class="btn ghost" data-a="closeModal">Cancel</button></div></div>`); },
  async renameConfirm(){ const d = Store.private.designs[App._renameId]; const n = $('#rn-name').value.trim(); if (!n){ toast('Enter a name.', true); return; } d.name = n; d.spec.name = n; await Store.put('designs', d); if (S.studio?.designId===d.id){ S.studio.spec.name = n; S.studio.savedJSON = JSON.stringify(d.spec); } App.closeModal(); App.render(); },
  deleteDesign(el){ const d = Store.private.designs[el.dataset.id]; App.confirm(`Delete “${d.name}”?`, `This removes the design and all ${d.versions.length} version${d.versions.length>1?'s':''}. Projects already shared with a tailor keep their copy until you stop sharing.`, 'Delete design', async ()=>{ await Store.del('designs', d.id); if (S.studio?.designId===d.id) S.studio = null; App.render(); }); },
  designForClient(el){ const spec = defaultSpec('shirt'); spec.name = 'Untitled shirt'; S.studio = {designId:null, spec, profileId:el.dataset.id, tab:'brief', brief:'', proposal:null, aiBusy:false, compareV:null, savedJSON:null}; S.undo=[]; S.redo=[]; App.go('create'); },
  /* projects (customer) */
  async projComment(el){ const it = Store.myShares.items[el.dataset.id]; const inp = $('#pc-'+it.id); const t = inp.value.trim(); if (!t) return; it.comments = [...(it.comments||[]), {by:'customer', text:t, at:nowIso()}]; await Store.putShare(it); App.render(); },
  async projApprove(el){ const it = Store.myShares.items[el.dataset.id]; it.customerApproved = true; it.changesRequested = false; it.comments = [...(it.comments||[]), {by:'customer', text:'Design approved.', at:nowIso()}]; await Store.putShare(it); toast('Design approved'); App.render(); },
  async projRevise(el){ const it = Store.myShares.items[el.dataset.id]; const t = $('#pc-'+it.id)?.value.trim(); it.changesRequested = true; it.customerApproved = false; it.comments = [...(it.comments||[]), {by:'customer', text: t || 'Changes requested. I will update the design.', at:nowIso()}]; await Store.putShare(it); toast('Change request sent'); App.render(); },
  async projResend(el){ const it = Store.myShares.items[el.dataset.id]; const d = Store.private.designs[it.designId]; const p = d && Store.private.profiles[d.profileId]; if (!p){ toast('The design is no longer linked to a profile.', true); return; } for (const k of Object.keys(it.measurements||{})) it.measurements[k] = p.m[k]; for (const k of (REQ[d.spec.template]||[])) if (p.m[k]!=null && it.measurements[k]==null) it.measurements[k] = p.m[k]; it.measurementsUpdatedAt = nowIso(); it.comments = [...(it.comments||[]), {by:'customer', text:'Updated measurements sent.', at:nowIso()}]; await Store.putShare(it); toast('Measurements updated'); App.render(); },
  projWithdraw(el){ const it = Store.myShares.items[el.dataset.id]; App.confirm('Stop sharing this project?', 'The tailor will no longer see the design or your measurements. Your own design is kept.', 'Stop sharing', async ()=>{ await Store.delShare(it.id); App.render(); }); },
  /* tailor */
  tailorTab(el){ S.tailorTab = el.dataset.t; if (el.dataset.t==='projects') App.loadNames(); App.render(); },
  tailorTabGo(el){ S.tailorTab = el.dataset.t; App.go('tailor'); },
  tailorOpenProject(el){ const k = el.dataset.o+'|'+el.dataset.id; S.tailorTab = 'projects'; S.tailorOpen = S.tailorOpen===k ? null : k; App.loadNames(); if (S.route!=='tailor') App.go('tailor'); else App.render(); },
  async tailorComment(el){ const inp = $('#tc-'+el.dataset.id); const t = inp.value.trim(); if (!t) return; const cur = Store.allShares[el.dataset.o]?.items?.[el.dataset.id]; if (!cur) return; await Store.tailorUpdate(el.dataset.o, el.dataset.id, {comments:[...(cur.comments||[]), {by:'tailor', text:t, at:nowIso()}]}); App.render(); },
  tailorWorkshop(el){
    const s = Store.allShares[el.dataset.o]?.items?.[el.dataset.id]; if (!s) return;
    const profile = {id:'shared-'+s.id, name:(s.profileName||'Client')+' (shared)', shape:s.spec.template==='dress'||s.spec.template==='skirt'?'f':'m', skin:2, m:clone(s.measurements||{}), verified:false, updatedAt:s.updatedAt};
    S.workshop.src = {type:'shared', id:s.id, data:{label:s.designName, spec:s.spec, profile}}; S.workshop.tab='pattern'; App.go('workshop');
  },
  libFilter(el){ S.libFilter = el.dataset.v; App.render(); },
  async garmentStatus(el){
    const g = clone(getGarment(el.dataset.id)); const v = el.dataset.v;
    if (v==='published' && !(g.fitModes||[]).length) g.fitModes = ['preview'];
    g.status = v; if (v==='published' && !g.createdAt) g.createdAt = nowIso();
    if (await Store.putGarment(g)!==false){ toast(v==='published'?`${g.name} published`:`${g.name} archived`); if (v==='published' && Store.mode==='local') notify('garment', `New in the library: ${g.name}`, '', {r:'garment', id:g.id}); }
    App.render();
  },
  tailorNewGarment(){
    const spec = defaultSpec('shirt');
    S.gedit = {isNew:true, previewSize:null, pipeline:null, g:{id:uid('g'), name:'', category:'shirt', template:'top', description:'', spec, colors:[{n:'Ivory', h:'#EFE8D8'}], sizes:sizeChartFor(spec), price:null, currency:S.settings.currency, designer:'', tags:[], images:[], fitModes:[], status:'draft', version:1, history:[], processing:null, demo:false, createdAt:nowIso(), updatedAt:nowIso(), createdBy:Store.uid||'local'}};
    spec.color = '#EFE8D8';
    App.go('garmentEdit');
  },
  tailorEditGarment(el){ const g = getGarment(el.dataset.id); S.gedit = {isNew:false, previewSize:null, pipeline:null, g:clone(g)}; App.go('garmentEdit'); },
  gspec(el){ const g = S.gedit.g; g.spec[el.dataset.k] = el.dataset.v; App.render(); },
  gedColor(el){ const g = S.gedit.g; const h = el.dataset.v; const has = (g.colors||[]).some(c=>c.h===h); g.colors = has ? g.colors.filter(c=>c.h!==h) : [...(g.colors||[]), {n:el.dataset.n, h}]; if (g.colors[0]) g.spec.color = g.colors[0].h; App.render(); },
  gedAutoChart(){ const g = S.gedit.g; g.sizes = sizeChartFor(g.spec); toast('Size chart filled from the block for this fit. Adjust to your real garment measurements.'); App.render(); },
  gedPreviewSize(el){ S.gedit.previewSize = el.dataset.v; App.render(); },
  gedImgRemove(el){ S.gedit.g.images.splice(+el.dataset.i, 1); App.render(); },
  async gedSave(el){
    const target = el.dataset.v; const ge = S.gedit; const g = ge.g;
    const ok = await runPipeline(target);
    if (!ok){ toast('Fix the issues marked × before saving.', true); return; }
    const orig = getGarment(g.id);
    if (orig && orig.status==='published' && target==='published' && JSON.stringify({...orig, updatedAt:0, processing:0, fitModes:0}) !== JSON.stringify({...g, updatedAt:0, processing:0, fitModes:0})){
      g.history = [...(orig.history||[]), {version:orig.version, at:orig.updatedAt, name:orig.name}].slice(-20);
      g.version = (orig.version||1) + 1;
    }
    g.status = target==='published' ? 'published' : (orig?.status==='published' ? 'published' : 'draft');
    if (target==='draft' && orig?.status==='published'){ g.status = 'draft'; }
    g.template = g.spec.template;
    if (ge.isNew || !orig?.createdAt) g.createdAt = nowIso();
    const saved = await Store.putGarment(clone(g));
    if (saved===false) return;
    for (const k of [...S.fitCache.keys()]) if (k.includes(':'+g.id+':')) S.fitCache.delete(k);
    ge.isNew = false;
    notify('processing', `${g.name}: ${target==='published'?'published':'saved as draft'}`, (g.processing?.missing||[]).length ? 'Missing: '+g.processing.missing.join(', ') : 'Processing complete', {r:'garment', id:g.id});
    if (target==='published' && Store.mode==='local') notify('garment', `New in the library: ${g.name}`, 'Ready to try on with saved avatars', {r:'garment', id:g.id});
    toast(target==='published' ? `${g.name} is live for every customer (v${g.version})` : 'Draft saved');
    App.render();
  },
  gedDelete(){ const g = S.gedit.g; App.confirm(`Delete ${g.name}?`, 'It disappears from the library for everyone. Customers’ saved designs based on it keep their own copy.', 'Delete garment', async ()=>{ await Store.delGarment(g.id); S.gedit = null; S.tailorTab='library'; App.go('tailor'); }); },
  /* settings */
  setTheme(el){ S.settings.theme = el.dataset.v; applyTheme(); Store.putSettings(); App.render(); Viewer.dirty = true; },
  setDemoRole(el){ S.settings.demoRole = el.dataset.v; S.demoRole = el.dataset.v; Store.putSettings(); App.render(); },
  withdrawConsent(){ S.settings.consentScan = false; Store.putSettings(); ACT.clearScanPhotos(); toast('Scan consent withdrawn. Photos cleared.'); },
  async exportMyData(){ const data = {exportedAt:nowIso(), app:'Gara Atelier', units:'cm', profiles:Store.private.profiles, designs:Store.private.designs, outfits:Store.private.outfits, settings:S.settings, sharedProjects:Store.myShares.items}; await offerDownload('gara-my-data.json', JSON.stringify(data, null, 2)); },
  removeSamples(){ App.confirm('Remove sample data?', 'Deletes the sample people, their designs, outfit and sample project. Your own data is not touched.', 'Remove samples', async ()=>{
    for (const p of allProfiles().filter(p=>p.sample)) await Store.del('profiles', p.id);
    for (const d of designs().filter(d=>d.sample)) await Store.del('designs', d.id);
    for (const o of Object.values(Store.private.outfits).filter(o=>o.sample)) await Store.del('outfits', o.id);
    for (const s of Object.values(Store.myShares.items||{}).filter(s=>s.sample)) await Store.delShare(s.id);
    if (!Store.private.profiles[S.settings.activeProfileId]){ S.settings.activeProfileId = profiles()[0]?.id || null; await Store.putSettings(); }
    S.studio = null; S.bodyEdit = null; toast('Sample data removed'); App.render(); }); },
  deleteBodyData(){ App.confirm('Delete all body data?', 'Deletes every body profile and its measurement history, clears photo references, and removes measurements from projects shared with tailors. Designs and outfits are kept without a body.', 'Delete body data', async ()=>{
    for (const p of allProfiles()) await Store.del('profiles', p.id);
    for (const d of designs()) if (d.profileId){ d.profileId = null; await Store.put('designs', d); }
    for (const s of Object.values(Store.myShares.items||{})){ s.measurements = {}; s.profileName = null; await Store.putShare(s); }
    S.settings.activeProfileId = null; S.settings.consentScan = false; await Store.putSettings(); ACT.clearScanPhotos(); S.bodyEdit = null; toast('All body data deleted'); App.render(); }); },
  deleteEverything(){ App.confirm('Delete everything?', 'Deletes all profiles, designs, outfits, shared projects and settings for your account. Garments in the shared library are not affected.', 'Delete everything', async ()=>{
    for (const p of allProfiles()) await Store.del('profiles', p.id);
    for (const d of designs()) await Store.del('designs', d.id);
    for (const o of Object.keys(Store.private.outfits)) await Store.del('outfits', o);
    for (const s of Object.keys(Store.myShares.items||{})) await Store.delShare(s);
    const keepTheme = S.settings.theme; Object.assign(S.settings, defaultSettings(), {theme:keepTheme}); await Store.putSettings();
    S.studio = null; S.bodyEdit = null; ACT.clearScanPhotos(); toast('Everything deleted'); App.go('studio'); }); },
};

/* ---------- input (live) handlers ---------- */
const IN = {
  pfName(el){ S.bodyEdit.name = el.value; markBodyDirty(); },
  meas(el){
    const k = el.dataset.k; const v = el.value==='' ? null : +el.value;
    if (v==null){ delete S.bodyEdit.m[k]; }
    else S.bodyEdit.m[k] = k==='weight' ? (Units.sys==='in' ? v/2.20462 : v) : Units.toCm(v);
    el.closest('.minput').classList.toggle('missing', v==null);
    el.setAttribute('aria-invalid', v!=null && !validMeasure(k, S.bodyEdit.m[k]));
    if (S.bodyEdit.method==='estimated') S.bodyEdit.method = 'manual';
    clearTimeout(IN._t); IN._t = setTimeout(()=>App.refreshViewer(), 120);
    markBodyDirty();
  },
  stName(el){ S.studio.spec.name = el.value; },
  customCat(el){ S.studio.spec.customCategory = el.value; },
  brief(el){ S.studio.brief = el.value; const b = $('[data-a="interpret"]'); if (b) b.disabled = el.value.trim().length<4; },
  specNum(el){ const st = S.studio; if (!st._pre) st._pre = JSON.stringify(st.spec); st.spec[el.dataset.k] = +el.value; const l = el.closest('.ctl')?.querySelector('.lbl .num'); if (l) l.textContent = el.value; App.refreshViewer(); },
  specText(el){ S.studio.spec[el.dataset.k] = el.value; },
  specColor(el){ const st = S.studio; if (!st._pre) st._pre = JSON.stringify(st.spec); st.spec[el.dataset.k] = el.value.toUpperCase(); App.refreshViewer(); },
  easeNum(el){ const st = S.studio; if (!st._pre) st._pre = JSON.stringify(st.spec); st.spec.customEase[el.dataset.k] = +el.value; const l = el.closest('.ctl')?.querySelector('.lbl .num'); if (l) l.textContent = '+'+Units.show(+el.value); App.refreshViewer(); },
  vnote(el){ S.studio.vnote = el.value; },
  wq(el){ S.wardrobe.q = el.value; clearTimeout(IN._wq); IN._wq = setTimeout(()=>{ const pos = el.selectionStart; App.render(); const n = $('#w-q'); if (n){ n.focus(); n.setSelectionRange(pos,pos); } }, 250); },
  async outfitName(el){ const id = S.params.id; if (id==='draft') return; const o = Store.private.outfits[id]; o.name = el.value; clearTimeout(IN._on); IN._on = setTimeout(()=>Store.put('outfits', o), 600); },
  ged(el){ S.gedit.g[el.dataset.k] = el.value; },
  gedNum(el){ S.gedit.g[el.dataset.k] = el.value==='' ? null : +el.value; },
  gedTags(el){ S.gedit.g.tags = el.value.split(',').map(s=>s.trim()).filter(Boolean).slice(0,10); },
};
function markBodyDirty(){ const b = $('[data-a="saveProfile"]'); if (b) b.disabled = false; const chips = $$('.stage .hud .chip'); if (chips[1]){ chips[1].textContent = 'Unsaved changes'; chips[1].className = 'chip warn'; } }

/* ---------- change handlers ---------- */
const CH = {
  pfKind(el){ S.bodyEdit.kind = el.value; App.render(); },
  pfShape(el){ S.bodyEdit.shape = el.value; App.render(); },
  pfConsent(el){ S.bodyEdit.consent = el.checked; markBodyDirty(); },
  pfVerified(el){ S.bodyEdit.verified = el.checked; markBodyDirty(); },
  scanPhoto(el){
    const f = el.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)){ toast('That file is not an image.', true); return; }
    if (f.size > 25e6){ toast('That photo is larger than 25 MB.', true); return; }
    const v = el.dataset.v; S.scanPhotos = S.scanPhotos.filter(p=>{ if (p.view===v){ URL.revokeObjectURL(p.url); return false; } return true; });
    S.scanPhotos.push({view:v, url:URL.createObjectURL(f)}); App.modal(scanModal());
  },
  customTemplate(el){ pushUndo(); S.studio.spec.template = el.value; App.render(); },
  propSel(el){ S.studio.proposal.sel[el.dataset.k] = el.checked; },
  refRole(el){ const r = S.refs.find(x=>x.id===el.dataset.id); if (r) r.role = el.value; },
  refAdd(el){
    for (const f of [...el.files].slice(0, 8 - S.refs.length)){
      if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)){ toast(`${f.name} is not a supported image.`, true); continue; }
      if (f.size > 20e6){ toast(`${f.name} is over 20 MB.`, true); continue; }
      S.refs.push({id:uid('r'), url:URL.createObjectURL(f), file:f, role:'inspiration'});
    }
    App.render();
  },
  stProfile(el){ S.studio.profileId = el.value==='ref' ? 'ref-none' : el.value; App.render(); },
  wf(el){ S.wardrobe[el.dataset.k] = el.value; App.render(); },
  wsSrc(el){ const [type, id] = el.value.split(':'); if (!id) return; S.workshop.src = {type, id}; const d = type==='design' && Store.private.designs[id]; if (d && d.profileId) S.workshop.profileId = d.profileId; App.render(); },
  wsProf(el){ S.workshop.profileId = el.value==='ref' ? 'ref-none' : el.value; App.render(); },
  wsNum(el){ const v = el.value==='' ? null : Units.toCm(+el.value); S.workshop[el.dataset.k] = v; App.render(); },
  wsPct(el){ S.workshop.waste = clamp((+el.value||0)/100, 0, .5); App.render(); },
  async wsPrice(el){
    const v = el.value==='' ? null : +el.value; const src = workshopSource();
    if (src.design){ src.design.prices = Object.assign({}, src.design.prices, {[el.dataset.k]:v}); await Store.put('designs', src.design); }
    else { S.workshop.prices = Object.assign({}, S.workshop.prices, {[el.dataset.k]:v}); }
    App.render();
  },
  setCurrency(el){ S.settings.currency = el.value; Store.putSettings(); App.render(); },
  async tailorStatus(el){ const cur = Store.allShares[el.dataset.o]?.items?.[el.dataset.id]; await Store.tailorUpdate(el.dataset.o, el.dataset.id, {status:el.value, comments:[...(cur?.comments||[]), {by:'tailor', text:`Status changed to “${el.value}”.`, at:nowIso()}]}); toast('Status updated'); App.render(); },
  async tailorValidate(el){ const cur = Store.allShares[el.dataset.o]?.items?.[el.dataset.id]; await Store.tailorUpdate(el.dataset.o, el.dataset.id, {patternValidated:el.checked, validatedVersion: el.checked ? cur?.designVersion : null}); toast(el.checked?'Pattern marked as validated':'Validation removed'); App.render(); },
  gedCat(el){ const g = S.gedit.g; const keep = {color:g.spec.color, fabric:g.spec.fabric}; g.category = el.value; g.spec = Object.assign(defaultSpec(el.value), {color:keep.color}); g.template = g.spec.template; g.sizes = sizeChartFor(g.spec); App.render(); },
  gedFabric(el){ S.gedit.g.spec.fabric = el.value; App.render(); },
  gedSize(el){ const g = S.gedit.g; const v = el.value==='' ? null : +el.value; if (v==null) delete g.sizes[el.dataset.s][el.dataset.z]; else g.sizes[el.dataset.s][el.dataset.z] = v; App.refreshViewer(); },
  async gedImg(el){
    const f = el.files[0]; if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)){ toast('Use a JPEG, PNG or WebP photo.', true); return; }
    if (f.size > 15e6){ toast('That photo is over 15 MB.', true); return; }
    try { const data = await downscale(f); const g = S.gedit.g; g.images = [...(g.images||[]), {view:['front','back','side'][(g.images||[]).length]||'detail', data}]; App.render(); }
    catch(e){ toast('That image could not be read.', true); }
  },
  async gedAsset(el){
    const f = el.files[0]; if (!f) return; const g = S.gedit.g;
    if (f.size > 50e6){ g.asset = {note:`${f.name} is over 50 MB; optimise it (Draco or meshopt) before uploading.`}; App.render(); return; }
    let valid = false, info = '';
    try {
      if (/\.glb$/i.test(f.name)){ const h = new DataView(await f.slice(0,12).arrayBuffer()); valid = h.getUint32(0,true)===0x46546C67; info = valid ? `glTF binary v${h.getUint32(4,true)}` : 'not a valid GLB header'; }
      else { const j = JSON.parse(await f.text()); valid = !!(j.asset && j.asset.version); info = valid ? `glTF ${j.asset.version}` : 'missing asset.version'; }
    } catch(e){ info = 'could not be parsed'; }
    g.asset = {name:f.name, valid, note: valid ? `${f.name} checked (${info}, ${Math.round(f.size/1024)} KB). Hosting 3D files needs an asset storage service, which is not connected, so the file was not uploaded. Fitting uses the parametric ${TEMPLATE_LABEL[g.spec.template].toLowerCase()}.` : `${f.name} was rejected: ${info}.`};
    App.render();
  },
  gedPattern(el){ const f = el.files[0]; if (!f) return; const ok = /\.(dxf|svg|pdf)$/i.test(f.name); S.gedit.g.patternFile = {name:f.name, note: ok ? `${f.name} recognised. Importing digital patterns needs a pattern engine, which is not connected; the studio drafts its own block pattern for each body instead.` : `${f.name} is not a DXF, SVG or PDF file.`}; App.render(); },
  notifPref(el){ S.settings.notif[el.dataset.k] = el.checked; Store.putSettings(); },
  setTechnical(el){ S.settings.technical = el.checked; Store.putSettings(); App.render(); },
};

/* ---------- events ---------- */
function bindEvents(){
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const fn = ACT[el.dataset.a]; if (!fn) return;
    if (el.tagName==='A') e.preventDefault();
    if (el.dataset.a==='mfocus') { fn(el, e); return; }
    try { const r = fn(el, e); if (r && r.catch) r.catch(err=>{ console.error(err); toast('Something went wrong: '+(err.message||err), true); }); }
    catch(err){ console.error(err); toast('Something went wrong: '+err.message, true); }
  });
  document.addEventListener('keydown', e => {
    if ((e.key==='Enter' || e.key===' ') && e.target.matches('[role="button"][data-a]')){ e.preventDefault(); e.target.click(); }
    if (e.key==='Escape'){ const full = $('.stage.full'); if (full){ full.classList.remove('full'); Viewer.resize(); } else if ($('#overlay').innerHTML) ACT.closeModal(); }
    if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='z' && S.route==='create' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)){ e.preventDefault(); e.shiftKey ? ACT.redo() : ACT.undo(); }
  });
  document.addEventListener('input', e => { const el = e.target.closest('[data-in]'); if (el && IN[el.dataset.in]) IN[el.dataset.in](el, e); });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset && el.dataset.in && (el.type==='range' || el.type==='color') && S.studio && S.studio._pre){ S.undo.push(S.studio._pre); S.redo = []; S.studio._pre = null; App.render(); return; }
    const c = el.closest('[data-ch]'); if (c && CH[c.dataset.ch]) { const r = CH[c.dataset.ch](c, e); if (r && r.catch) r.catch(err=>{ console.error(err); toast('Something went wrong: '+err.message, true); }); }
  });
  document.addEventListener('focusin', e => { const el = e.target; if (el.matches && el.matches('input[data-in="meas"]')) ACT.mfocus({dataset:{k:el.dataset.k}}); });
  document.addEventListener('focusout', () => { setTimeout(()=>{ if (App.pendingRender && !( $('#main').contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) App.render(); }, 50); });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', ()=>{ Viewer.dirty = true; });
}
function applyTheme(){ const t = S.settings?.theme || 'system'; if (t==='system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }

async function boot(){
  $('#root').innerHTML = shellHTML();
  $('#main').innerHTML = `<div class="loading"><div class="spinner"></div><span>Opening your atelier…</span></div>`;
  bindEvents();
  await Store.init();
  S.settings = Object.assign(defaultSettings(), Store.settings || {});
  S.settings.notif = Object.assign(defaultSettings().notif, S.settings.notif||{});
  Store.settings = S.settings;
  S.demoRole = S.settings.demoRole || 'customer';
  applyTheme();
  // new garments since the last visit
  const nw = S.settings.lastSeenGarmentsAt ? newGarments() : [];
  if (nw.length && !(S.settings.notifications||[]).some(n => n.title.startsWith(`${nw.length} new garment`) && n.at > S.settings.lastSeenGarmentsAt)) notify('garment', `${nw.length} new garment${nw.length>1?'s':''} in the library`, 'They fit your saved avatar with no new scan.', {r:'wardrobe'});
  if (!Store.settings.onboarded && !Object.keys(Store.private.profiles).length){ /* first visit: home shows onboarding */ }
  applyBrand();
  const rh = routeFromHash(); if (rh){ S.route = rh[0]; S.params = rh[1]; }
  App.render();
  const lc = document.getElementById('launch');
  if (lc){
    const bg = lc.querySelector('.lbg'); if (bg) bg.style.backgroundImage = `url(${MOCK_IMG.launch})`;
    const close = r => { lc.style.opacity='0'; setTimeout(()=>lc.remove(), 500); if (r) App.go(r); };
    let seen = false; try { seen = !!localStorage.getItem('izelia:splash'); } catch(e){}
    if (seen) setTimeout(()=>close(), 700);
    else {
      const b = lc.querySelector('.lbtns'), bar = lc.querySelector('i'); if (b) b.hidden = false; if (bar) bar.remove();
      const done = r => { try { localStorage.setItem('izelia:splash','1'); } catch(e){} close(r); };
      lc.querySelector('#l-start')?.addEventListener('click', ()=>done('home'));
      lc.querySelector('#l-acct')?.addEventListener('click', ()=>done('account'));
    }
  }
  Caps.init();
  if (Store.canPublish()) App.loadNames();
}

window.addEventListener('hashchange', () => { const rh = routeFromHash(); if (rh && (rh[0]!==S.route || JSON.stringify(rh[1])!==JSON.stringify(S.params))) { S.route = rh[0]; S.params = rh[1]; App.render(); } });
