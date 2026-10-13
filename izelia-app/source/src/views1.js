/* ================= VIEWS: shell, home, body ================= */
const ICON = {
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  body:'<circle cx="12" cy="4.5" r="2.5"/><path d="M8 9h8l-1 6h-2l-.5 7h-1L11 15H9z"/>',
  create:'<path d="M14 4l6 6-11 11H3v-6z"/><path d="M12 6l6 6"/>',
  wardrobe:'<path d="M12 6a2 2 0 1 1 2-2"/><path d="M12 6v2L3 15h18l-9-7"/>',
  workshop:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.2 7.8L20 18M8.2 16.2L20 6"/>',
  designs:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  projects:'<path d="M4 7h16v12H4z"/><path d="M9 7V4h6v3"/><path d="M4 12h16"/>',
  tailor:'<path d="M3 21l7-7"/><path d="M14 3l7 7-4 4-7-7z"/><path d="M10 7l7 7"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  heart:'<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
  tape:'<path d="M3 8h18v8H3z"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  map:'<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/><path d="M12 3v18M3 12h18"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  rotate:'<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  back:'<path d="M15 18l-6-6 6-6"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  download:'<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  zoomin:'<circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M21 21l-5-5"/>',
  zoomout:'<circle cx="11" cy="11" r="7"/><path d="M8 11h6M21 21l-5-5"/>',
};
const ic = (n, extra='') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICON[n]||''}</svg>`;

const NAV = [
  {r:'studio', label:'Studio home', i:'home'},
  {r:'body', label:'My Body', i:'body'},
  {r:'create', label:'Create Your Own', i:'create'},
  {r:'wardrobe', label:'Virtual Wardrobe', i:'wardrobe'},
  {r:'workshop', label:'Tailoring Workshop', i:'workshop'},
  {r:'designs', label:'My Designs', i:'designs'},
  {r:'projects', label:'Projects & Orders', i:'projects'},
  {r:'tailor', label:'Tailor Studio', i:'tailor', pro:true},
  {r:'notifications', label:'Notifications', i:'bell'},
  {r:'settings', label:'Settings', i:'settings'},
];

/* ---------- data accessors ---------- */
const profiles = () => Object.values(Store.private.profiles).filter(p=>!p.archived).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
const allProfiles = () => Object.values(Store.private.profiles);
function activeProfile(){ const p = Store.private.profiles[S.settings?.activeProfileId]; if (p && !p.archived) return p; return profiles()[0] || null; }
const designs = () => Object.values(Store.private.designs).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
const garmentsLib = () => Object.values(Store.garments).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
const garmentsAll = () => [...garmentsLib(), ...productsPub().map(productAsGarment).filter(Boolean)];
const garmentsPub = () => garmentsAll().filter(g=>g.status==='published');
const REF_PROFILE = {id:'ref-m', name:'Reference body (size M)', shape:'m', skin:2, ref:true, m:Object.assign({height:176, torsoLength:45, upperArm:31, wrist:17, calf:37, ankle:23, outseam:105}, BODY_SIZES.M), updatedAt:'ref'};
function newGarments(){ const t = S.settings?.lastSeenGarmentsAt; return garmentsPub().filter(g => !t || g.createdAt > t); }

function completeness(prof, template){
  const keys = template ? (REQ[template]||[]) : MDEF.filter(d=>!d.opt).map(d=>d.k);
  const have = keys.filter(k => prof?.m?.[k]!=null && prof.m[k]!=='');
  return {pct: keys.length ? have.length/keys.length : 1, missing: keys.filter(k=>!have.includes(k))};
}

function fitItemForGarment(prof, g, size, color){
  const key = `${prof.id}:${prof.updatedAt}:${g.id}:v${g.version}:${size||'auto'}`;
  let fit = S.fitCache.get(key);
  if (!fit){ fit = computeFit(prof, g.spec, g.sizes, size); S.fitCache.set(key, fit); fit.cached = false; } else fit.cached = true;
  const spec = Object.assign({}, g.spec, color ? {color} : {});
  return {spec, circ:fit.circ, zones:fit.zones, fit};
}
function fitItemForSpec(prof, spec){ const fit = computeFit(prof, spec, null); return {spec, circ:fit.circ, zones:fit.zones, fit}; }

function stageHTML(o={}){
  const views = [['front','Front'],['three','¾'],['left','Left'],['right','Right'],['back','Back'],['reset','Reset']];
  return `<div class="stage ${o.cls||''}" data-stage style="${o.style||''}">
    <div class="tags" aria-hidden="true"></div>
    ${o.compare ? `<div class="split-line"></div><span class="split-label" style="left:12px">${esc(o.compare[0])}</span><span class="split-label" style="right:12px">${esc(o.compare[1])}</span>` : ''}
    <div class="hud">${o.hud||''}</div>
    ${o.small ? '' : `<div class="tools">
      <button data-a="vtool" data-t="fitMap" aria-pressed="${S.viewer.fitMap}" aria-label="Fit map" title="Fit map">${ic('map')}</button>
      <button data-a="vtool" data-t="tape" aria-pressed="${S.viewer.tape}" aria-label="Tape lines" title="Tape lines">${ic('tape')}</button>
      <button data-a="vtool" data-t="garmentsOn" aria-pressed="${S.viewer.garmentsOn}" aria-label="Show garments" title="Show garments">${ic('eye')}</button>
      <button data-a="vtool" data-t="auto" aria-pressed="${Viewer.auto}" aria-label="Turntable" title="Turntable">${ic('rotate')}</button>
      <button data-a="vzoom" data-f="0.88" aria-label="Zoom in" title="Zoom in">${ic('zoomin')}</button>
      <button data-a="vzoom" data-f="1.14" aria-label="Zoom out" title="Zoom out">${ic('zoomout')}</button>
      <button data-a="vfull" aria-label="Full screen" title="Full screen">${ic('full')}</button>
    </div>
    <div class="views" role="group" aria-label="Camera views">${views.map(([k,l])=>`<button data-a="vview" data-v="${k}">${l}</button>`).join('')}</div>`}
  </div>`;
}
function fitLegend(){ return `<div class="legend"><span><i style="background:${FIT_COLORS.ok}"></i>Comfortable</span><span><i style="background:${FIT_COLORS.snug}"></i>Snug</span><span><i style="background:${FIT_COLORS.tight}"></i>Tight</span><span><i style="background:${FIT_COLORS.loose}"></i>Loose</span></div>`; }

/* ---------- HOME ---------- */
function viewHome(){
  const p = activeProfile();
  const ds = designs().filter(d=>!d.template);
  if (!p){
    S.vcfg = null;
    return `
    <div class="hero" style="grid-template-columns:minmax(0,1fr)">
      <div class="panel welcome" style="padding:28px">
        <div class="stack">
          <span class="eyebrow">IZELIA AI Tailoring Studio</span>
          <h1>Measure once.<br><em>Fit everything.</em></h1>
          <p class="muted" style="max-width:56ch">Save your measurements once and the studio builds a 3D body from them. Every garment in the library, and everything you design, is fitted to that body. No re-measuring for each piece.</p>
        </div>
        <div class="three">
          ${[['1','Measure','Enter measurements with a tape, or start from a quick estimate and refine it.'],['2','Build your avatar','A parametric 3D body is generated from your numbers and saved to your profile.'],['3','Try on and design','Open any garment or design your own; it fits to your saved body automatically.']].map(([n,h,t])=>`<div class="stack s"><span class="display" style="font-size:40px;color:var(--ink-3)">${n}</span><h3>${h}</h3><p class="muted" style="font-size:14px">${t}</p></div>`).join('')}
        </div>
        <div class="tape"></div>
        <div class="row">
          <button class="btn primary" data-a="newProfile">Create my body profile</button>
          <button class="btn" data-a="loadSamples">Explore with sample people</button>
          <button class="btn ghost" data-a="go" data-r="wardrobe">Browse the library first</button>
        </div>
        <p class="faint" style="font-size:12.5px">Sample people are clearly labelled and can be removed in Settings.</p>
      </div>
    </div>
    ${homeLibraryStrip()}`;
  }
  const comp = completeness(p);
  const lastDesign = ds.find(d=>d.profileId===p.id) || ds[0];
  const fav = Object.values(Store.private.outfits).find(o=>o.profileId===p.id);
  let items = [];
  if (fav) items = fav.items.map(it => { const g = getGarment(it.g); return g ? fitItemForGarment(p, g, it.size, it.color) : null; }).filter(Boolean);
  else if (lastDesign) items = [fitItemForSpec(p, lastDesign.spec)];
  S.vcfg = {profile:p, A:items, autoRotate:true, small:false};
  const projects = Object.values(Store.myShares.items||{}).filter(s=>!['Completed','Delivered'].includes(s.status));
  const notes = (S.settings.notifications||[]).slice(0,3);
  const recent = (S.settings.recent||[]).map(id=>getGarment(id)).filter(Boolean).slice(0,8);
  return `
  <div class="hero">
    <div class="panel welcome">
      <div class="stack">
        <span class="eyebrow">${greeting()}</span>
        <h1>${esc(p.name.replace(/\s*\(sample\)/,''))}'s <em>atelier</em></h1>
        <div class="row tight">${p.sample?'<span class="chip demo">Sample profile</span>':''}<span class="chip ${p.verified?'ok':'warn'}">${p.verified?'Measurements verified':'Measurements not verified'}</span><span class="chip">${p.method==='estimated'?'Estimated from height':'Entered by hand'}</span></div>
      </div>
      <div class="stack s">
        <div class="spread"><span style="font-weight:600">Profile completeness</span><span class="num">${Math.round(comp.pct*100)}%</span></div>
        <div class="bar ${comp.pct<.7?'bad':comp.pct<1?'warn':''}"><i style="width:${comp.pct*100}%"></i></div>
        ${comp.missing.length ? `<span class="faint" style="font-size:13px">Missing: ${comp.missing.slice(0,5).map(k=>MBYK[k].label.toLowerCase()).join(', ')}${comp.missing.length>5?'…':''}</span>` : `<span class="faint" style="font-size:13px">Every core measurement is saved.</span>`}
      </div>
      <div class="cta2">
        <button class="cta dark" data-a="go" data-r="create"><b>Create your own</b><span>Describe a garment and fit it to your body</span></button>
        <button class="cta" data-a="go" data-r="wardrobe"><b>Try on clothes</b><span>${garmentsPub().length} garments ready for your avatar</span></button>
      </div>
    </div>
    ${stageHTML({hud:`<span class="chip">${esc(p.name)}</span>${items.length? `<span class="chip">${fav? 'Outfit: '+esc(fav.name) : 'Latest design'}</span>`:''}`})}
  </div>
  <div class="two">
    <section class="panel">
      <div class="section-head"><h2>Recent designs</h2><button class="btn sm ghost" data-a="go" data-r="designs">All designs</button></div>
      ${ds.length ? `<div class="list">${ds.slice(0,4).map(d=>designRow(d)).join('')}</div>` : `<div class="empty"><p>No designs yet.</p><button class="btn sm" data-a="go" data-r="create">Start a design</button></div>`}
    </section>
    <section class="panel">
      <div class="section-head"><h2>Updates</h2><button class="btn sm ghost" data-a="go" data-r="notifications">All</button></div>
      ${notes.length ? `<div class="list">${notes.map(n=>notifRow(n)).join('')}</div>` : `<p class="muted">Nothing new. New garments, tailor messages and design changes appear here.</p>`}
      ${projects.length ? `<hr class="rule" style="margin:12px 0"><h3 style="margin-bottom:8px">Ongoing projects</h3><div class="list">${projects.slice(0,3).map(s=>`<div class="li"><div class="grow"><b>${esc(s.designName)}</b><small>${esc(s.status)} · updated ${fmtAgo(s.updatedAt)}</small></div><button class="btn sm" data-a="go" data-r="projects">Open</button></div>`).join('')}</div>`:''}
    </section>
  </div>
  ${homeLibraryStrip()}
  ${recent.length ? `<section class="section"><div class="section-head"><h2>Recently viewed</h2></div><div class="hscroll">${recent.map(g=>garmentCard(g)).join('')}</div></section>` : ''}
  ${Object.values(Store.private.outfits).length ? `<section class="section"><div class="section-head"><h2>Saved outfits</h2><button class="btn sm ghost" data-a="wardTab" data-t="outfits">Manage</button></div><div class="hscroll">${Object.values(Store.private.outfits).map(o=>outfitCard(o)).join('')}</div></section>`:''}`;
}
function greeting(){ const h = new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; }
function homeLibraryStrip(){
  const nw = S.settings?.lastSeenGarmentsAt ? newGarments() : [];
  const list = (nw.length ? nw : garmentsPub()).slice(0,10);
  return `<section class="section"><div class="section-head"><h2>${nw.length ? `New arrivals <span class="chip tape" style="vertical-align:middle">${nw.length} new</span>` : 'From the library'}</h2><button class="btn sm ghost" data-a="go" data-r="wardrobe">Open wardrobe</button></div>
  ${list.length ? `<div class="hscroll">${list.map(g=>garmentCard(g)).join('')}</div>` : `<div class="empty"><p>The garment library is empty.</p>${Store.canPublish()?'<button class="btn sm" data-a="importStarter">Import the starter collection</button>':'<p class="faint">A tailor or the owner can add garments.</p>'}</div>`}</section>`;
}
function garmentCard(g){
  const fav = (S.settings?.favourites||[]).includes(g.id);
  const isNew = S.settings?.lastSeenGarmentsAt && g.createdAt > S.settings.lastSeenGarmentsAt;
  const img = g.images && g.images[0] ? `<img src="${g.images[0].data}" alt="${esc(g.name)} photo">` : flatSVG(g.spec,'front',{label:g.name});
  return `<div class="gcard" role="button" tabindex="0" data-a="openGarment" data-id="${g.id}" aria-label="${esc(g.name)}">
    <div class="flat">${img}
      ${isNew?'<span class="chip tape badge">New</span>':g.status!=='published'?`<span class="chip warn badge">${esc(g.status)}</span>`:''}
      <button class="fav" data-a="toggleFav" data-id="${g.id}" aria-pressed="${fav}" aria-label="${fav?'Remove from':'Add to'} favourites">${ic('heart', fav?'fill="currentColor"':'')}</button>
    </div>
    <div class="meta"><b>${esc(g.name)}</b><span>${esc(CAT[g.category]?.label || g.category)}${g.price?` · ${money(g.price, g.currency)}`:''}</span></div>
  </div>`;
}
function outfitCard(o){
  const items = o.items.map(i=>getGarment(i.g)).filter(Boolean);
  return `<div class="gcard" role="button" tabindex="0" data-a="openOutfit" data-id="${o.id}"><div class="flat" style="display:flex;gap:2px;padding:10px">${items.slice(0,3).map((g,i)=>`<div style="flex:1;height:100%;display:grid;place-items:center">${flatSVG(Object.assign({},g.spec,{color:o.items[i]?.color||g.spec.color}),'front')}</div>`).join('')}</div><div class="meta"><b>${esc(o.name)}</b><span>${items.length} pieces</span></div></div>`;
}
function designRow(d){
  const p = Store.private.profiles[d.profileId];
  const lvl = designLevel(d, p);
  return `<div class="li"><div class="thumb">${flatSVG(d.spec,'front')}</div><div class="grow"><b>${esc(d.name)}</b><small>${esc(CAT[d.spec.category]?.label||'')} · ${esc(p?.name||'no profile')} · ${lvl.levels[lvl.cur].label}${d.needsRecalc?' · <span style="color:var(--warn)">measurements changed</span>':''}</small></div><button class="btn sm" data-a="openDesign" data-id="${d.id}">Open</button></div>`;
}
function notifRow(n){
  return `<div class="li" ${n.link?`role="button" tabindex="0" data-a="openNotif" data-id="${n.id}" style="cursor:pointer"`:''}>${n.read?'':'<span class="unread" aria-label="unread"></span>'}<div class="grow"><b>${esc(n.title)}</b><small>${esc(n.body)}${n.body?' · ':''}${fmtAgo(n.at)}</small></div></div>`;
}

/* ---------- MY BODY ---------- */
function viewBody(){
  const list = profiles();
  if (!S.bodyEdit){
    const p = activeProfile();
    if (p) S.bodyEdit = clone(p);
  }
  const d = S.bodyEdit;
  if (!d){
    S.vcfg = null;
    return `<div class="page-head"><div><h1>My Body</h1><p>Your measurements and the 3D body built from them. Everything else in the studio reads from here.</p></div></div>
    <div class="empty" style="padding:44px 20px"><h3>No body profile yet</h3><p style="max-width:52ch">Start by measuring with a tape, or begin from a quick estimate based on your height and refine it later.</p>
      <div class="row" style="justify-content:center"><button class="btn primary" data-a="newProfile">Create a profile</button><button class="btn" data-a="openScanImport">Import a 3D scan</button><button class="btn" data-a="openScan">Photo guide</button><button class="btn ghost" data-a="loadSamples">Use sample people</button></div></div>`;
  }
  S.vcfg = {profile:d, A:[], small:false, scan:!!S.scan};
  const stored = Store.private.profiles[d.id];
  const dirty = !stored || JSON.stringify(stored.m)!==JSON.stringify(d.m) || stored.name!==d.name || stored.shape!==d.shape || stored.skin!==d.skin || stored.kind!==d.kind || stored.verified!==d.verified || !!stored.consent!==!!d.consent;
  const B = bodyGeom(d);
  const tmpl = [['top','Shirts'],['bottom','Trousers'],['dress','Dresses'],['jacket','Jackets'],['robe','Agbada & kaftan']];
  const focus = S.bodyFocus || 'chest';
  const units = Units.sys;
  return `
  <div class="page-head">
    <div><h1>My Body</h1><p>Your measurements and the 3D body built from them. Garments everywhere in the studio fit to the active profile.</p></div>
    <div class="row">
      <div class="seg" role="group" aria-label="Units"><button data-a="setUnits" data-u="cm" aria-pressed="${units==='cm'}">cm</button><button data-a="setUnits" data-u="in" aria-pressed="${units==='in'}">in</button></div>
      <button class="btn" data-a="openScanImport">${ic('upload')}Import 3D scan</button>
      <button class="btn" data-a="openScan">${ic('camera')}Photo guide</button>
      <button class="btn" data-a="newProfile">${ic('plus')}New profile</button>
    </div>
  </div>
  <div class="body-layout">
    <div class="stack">
      ${stageHTML({hud:`<span class="chip">${esc(d.name)}</span><span class="chip ${dirty?'warn':'ok'}">${dirty?'Unsaved changes':'Saved'}</span><span class="chip demo">${S.scan && (S.viewer.scanMode||'scan')==='scan' ? '3D scan' : S.scan && S.viewer.scanMode==='compare' ? 'Scan over avatar' : 'Parametric avatar'}</span>`})}
      ${scanPanelHTML()}
      ${d.scanInfo ? `<p class="faint" style="font-size:12.5px">${d.scanInfo.keys.length} measurements came from the scan ${esc(d.scanInfo.file)} on ${fmtDate(d.scanInfo.at)}.</p>`:''}
      <div class="note"><b>What this avatar is.</b> A parametric body generated from your measurements. Garments fit to this body${S.scan?'; the scan is shown for checking only':''}. ${B.estimated.length ? `${B.estimated.length} measurement${B.estimated.length>1?'s are':' is'} estimated from height and shown dashed below until you enter ${B.estimated.length>1?'them':'it'}.` : 'Every proportion comes from a measurement you entered.'}</div>
      ${S.scanPhotos.length ? `<div class="panel stack s"><div class="spread"><span class="eyebrow">Photo reference · this session only</span><button class="btn sm ghost" data-a="clearScanPhotos">Remove photos</button></div><div class="three" style="grid-template-columns:repeat(3,minmax(0,1fr))">${S.scanPhotos.map(p=>`<figure style="margin:0"><img src="${p.url}" alt="${p.view} view" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px"><figcaption class="faint" style="font-size:12px">${p.view}</figcaption></figure>`).join('')}</div><p class="faint" style="font-size:12.5px">Turn the avatar to the same view and compare proportions while you measure.</p></div>`:''}
    </div>
    <div class="stack">
      <section class="panel stack">
        <div class="spread"><h2>Profiles</h2><span class="faint" style="font-size:13px">Active: <b style="color:var(--ink)">${esc(activeProfile()?.name||'—')}</b></span></div>
        <div class="plist">${list.map(p=>`<button class="pitem" data-a="editProfile" data-id="${p.id}" aria-pressed="${p.id===d.id}"><span class="dot">${initials(p.name)}</span><span style="flex:1;min-width:0"><b>${esc(p.name)}</b><small>${p.kind==='client'?'Client · ':p.kind==='household'?'Household · ':''}${Math.round(completeness(p).pct*100)}% complete · updated ${fmtAgo(p.updatedAt)}</small></span>${p.id===activeProfile()?.id?'<span class="chip accent">Active</span>':''}${p.sample?'<span class="chip demo">Sample</span>':''}</button>`).join('')}
        ${!stored ? `<div class="pitem" aria-pressed="true"><span class="dot">${initials(d.name)}</span><span><b>${esc(d.name||'New profile')}</b><small>Not saved yet</small></span></div>`:''}</div>
        ${allProfiles().some(p=>p.archived) ? `<details><summary class="faint" style="cursor:pointer;font-size:13px">Archived profiles</summary><div class="plist" style="margin-top:8px">${allProfiles().filter(p=>p.archived).map(p=>`<div class="pitem"><span class="dot">${initials(p.name)}</span><span style="flex:1"><b>${esc(p.name)}</b></span><button class="btn sm" data-a="unarchiveProfile" data-id="${p.id}">Restore</button></div>`).join('')}</div></details>`:''}
      </section>

      <section class="panel stack">
        <div class="form-grid">
          <label class="field">Profile name<input type="text" id="pf-name" data-in="pfName" value="${esc(d.name)}"></label>
          <label class="field">Whose measurements<select id="pf-kind" data-ch="pfKind"><option value="self" ${d.kind==='self'?'selected':''}>Mine</option><option value="household" ${d.kind==='household'?'selected':''}>Household member</option><option value="client" ${d.kind==='client'?'selected':''}>Tailoring client</option></select></label>
          <label class="field">Avatar base<select id="pf-shape" data-ch="pfShape"><option value="m" ${d.shape==='m'?'selected':''}>Straight torso</option><option value="f" ${d.shape==='f'?'selected':''}>Curved torso with bust</option></select></label>
        </div>
        <div class="ctl"><span class="lbl">Avatar skin tone</span><div class="swatches">${SKIN.map((c,i)=>`<button class="sw" style="background:${c}" data-a="pfSkin" data-i="${i}" aria-pressed="${(d.skin??2)===i}" aria-label="Skin tone ${i+1}"></button>`).join('')}</div></div>
        ${d.kind!=='self' ? `<label class="check"><input type="checkbox" id="pf-consent" data-ch="pfConsent" ${d.consent?'checked':''}><span>This person agreed to me storing their measurements in the IZELIA studio. ${d.kind==='client'?'Clients can ask you to delete them at any time.':''}</span></label>`:''}
      </section>

      <section class="panel stack">
        <div class="spread"><h2>Measurements</h2><div class="row tight"><button class="btn sm" data-a="quickEstimate">Fill gaps from height</button></div></div>
        <div class="tape"></div>
        ${MGROUPS.map(g => `<div class="stack s"><span class="eyebrow">${g}</span><div class="mgroup">${MDEF.filter(m=>m.g===g).map(m => {
          const v = d.m?.[m.k]; const est = v==null && B.estimated.includes(m.k);
          const isW = m.k==='weight';
          const val = isW ? (v==null?'':(units==='in'? +(v*2.20462).toFixed(1) : v)) : Units.val(v);
          return `<label class="minput ${v==null?'missing':''}" data-a="mfocus" data-k="${m.k}"><span>${m.label}${m.opt?' <small class="faint">optional</small>':''}${est?`<em>est. ${isW?'':Units.show(B.m[m.k])}</em>`:''}</span><span class="inwrap"><input type="number" inputmode="decimal" step="0.1" min="0" id="m-${m.k}" data-in="meas" data-k="${m.k}" value="${val}" placeholder="—" aria-label="${m.label} in ${isW?(units==='in'?'pounds':'kilograms'):(units==='in'?'inches':'centimetres')}"><span class="u">${isW?(units==='in'?'lb':'kg'):units}</span></span></label>`;
        }).join('')}</div></div>`).join('')}
        <div class="guide panel flat" style="padding:12px;border:1px solid var(--line)">${measureGuideSVG(focus)}<div class="stack s"><span class="eyebrow">How to measure</span><h3>${MBYK[focus].label}</h3><p class="muted" style="font-size:14px">${MBYK[focus].guide}</p></div></div>
        <label class="check"><input type="checkbox" id="pf-verified" data-ch="pfVerified" ${d.verified?'checked':''}><span><b>I measured these with a tape.</b> Verified profiles are required before a design can be marked production-ready.</span></label>
        <div class="row">
          <button class="btn primary" data-a="saveProfile" ${dirty?'':'disabled'}>Save profile</button>
          ${stored && dirty ? `<button class="btn" data-a="revertProfile">Discard changes</button>`:''}
          ${stored && stored.id!==activeProfile()?.id ? `<button class="btn" data-a="activateProfile" data-id="${d.id}">Make active</button>`:''}
        </div>
      </section>

      <section class="panel stack">
        <h2>Ready for</h2>
        <div class="stack s">${tmpl.map(([t,l]) => { const c = completeness(d, t); return `<div class="spread"><span style="font-weight:600;font-size:14px">${l}</span><span class="row tight">${c.missing.length?`<span class="faint" style="font-size:12.5px">needs ${c.missing.map(k=>MBYK[k].label.toLowerCase()).slice(0,3).join(', ')}</span>`:''}<span class="chip ${c.pct===1?'ok':c.pct>.6?'warn':'bad'}">${Math.round(c.pct*100)}%</span></span></div>`; }).join('')}</div>
      </section>

      ${stored ? `<section class="panel stack">
        <h2>History and data</h2>
        ${(stored.history||[]).length ? `<div class="list">${stored.history.map((h,i)=>`<div class="li"><div class="grow"><b>Saved ${fmtDate(h.at)}</b><small>${Object.keys(h.m||{}).length} measurements · chest ${Units.show(h.m.chest)} · waist ${Units.show(h.m.waist)}</small></div><button class="btn sm" data-a="restoreMeasure" data-i="${i}">Restore</button></div>`).join('')}</div>` : '<p class="muted" style="font-size:14px">Earlier versions appear here each time you save new measurements.</p>'}
        <div class="row"><button class="btn sm" data-a="dupProfile">Duplicate</button><button class="btn sm" data-a="archiveProfile">Archive</button><button class="btn sm danger" data-a="deleteProfile">Delete profile and its data</button></div>
      </section>`:''}
    </div>
  </div>`;
}
function measureGuideSVG(k){
  const lines = {
    height:'M60 6 L60 214', neck:'M50 33 Q60 38 70 33', shoulder:'M36 44 L84 44', chest:'M38 62 Q60 70 82 62', underbust:'M40 74 Q60 80 80 74', waist:'M42 92 Q60 98 78 92',
    hip:'M38 118 Q60 126 82 118', upperArm:'M26 64 L36 66', wrist:'M17 121 L25 121', armLength:'M84 44 L95 120', torsoLength:'M60 30 L60 92', thigh:'M38 140 L56 140',
    knee:'M40 170 L54 170', calf:'M40 184 L54 184', ankle:'M43 206 L53 206', inseam:'M58 134 L50 212', outseam:'M80 92 L76 212', frontRise:'M60 92 L60 132', backRise:'M62 92 Q66 112 62 132', weight:'M30 214 L90 214',
  };
  return `<svg viewBox="0 0 120 220" aria-hidden="true"><path d="M60 8a10 11 0 1 1 0 22a10 11 0 1 1 0-22M54 30h12l2 8 16 6 9 40 4 36-6 2-6-34-4-14v36l5 14-3 46 1 32h-9l-2-30-3-48-3-30-3 30-3 48-2 30h-9l1-32-3-46 5-14V68l-4 14-6 34-6-2 4-36 9-40 16-6z" fill="var(--surface-2)" stroke="var(--ink-3)" stroke-width="1"/><path d="${lines[k]||''}" stroke="var(--tape)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
}

/* ---------- BODY SCAN WIZARD ---------- */
function scanModal(){
  const st = S.scanStep || 0;
  const steps = ['Consent','Set up','Capture','Process'];
  const head = `<div class="steps">${steps.map((s,i)=>`<span class="${i<st?'done':i===st?'cur':''}">${i+1}. ${s}</span>`).join('')}</div>`;
  let body = '';
  if (st===0) body = `
    <h2>Body scan</h2>
    <p class="muted">Body photos and measurements are sensitive. Here is exactly what happens to them.</p>
    <div class="note"><b>Photos stay on this device.</b> They are held in this browser tab only, never uploaded or saved, and are cleared when you leave the scan or reload the page.<br><br><b>Measurements</b> you save go to ${Store.mode==='cloud'?'your private space in this artifact. Nobody else, including the owner, can read them unless you share a project with a tailor.':'this browser only.'}<br><br><b>No model training.</b> IZELIA never sends your photos or measurements anywhere for training.</div>
    <label class="check"><input type="checkbox" id="scan-consent" ${S.settings.consentScan?'checked':''}><span>I understand and want to continue.</span></label>
    <div class="row"><button class="btn primary" data-a="scanNext" data-need="consent">Continue</button><button class="btn ghost" data-a="closeModal">Cancel</button></div>`;
  if (st===1) body = `
    <h2>Set up for good photos</h2>
    <div class="two">
      <ul class="stack s" style="margin:0;padding-left:18px;font-size:14px">
        <li><b>Clothing:</b> fitted clothes or underwear, hair tied back, no shoes.</li>
        <li><b>Pose:</b> feet hip-width apart, arms held slightly away from the body.</li>
        <li><b>Camera:</b> 2 to 3 metres away at waist height, phone upright.</li>
        <li><b>Light and background:</b> even light, plain wall, nothing behind you.</li>
        <li><b>Views:</b> front, left side and back.</li>
      </ul>
      <div style="display:grid;place-items:center">${measureGuideSVG('height')}</div>
    </div>
    <div class="row"><button class="btn primary" data-a="scanNext">I'm ready</button><button class="btn ghost" data-a="scanBack">Back</button></div>`;
  if (st===2) body = `
    <h2>Capture front, side and back</h2>
    <div class="note warn">Live camera capture is not available inside this view. Take the three photos with your phone camera, then add them here.</div>
    <div class="three">${['front','side','back'].map(v=>{ const ph = S.scanPhotos.find(p=>p.view===v); return `<label class="drop" style="aspect-ratio:3/4;display:grid;place-items:center;padding:0;overflow:hidden;position:relative">${ph?`<img src="${ph.url}" alt="${v} photo" style="width:100%;height:100%;object-fit:cover">`:`<span>${ic('camera','style="width:26px;height:26px"')}<br>${v[0].toUpperCase()+v.slice(1)} view</span>`}<input type="file" accept="image/*" class="visually-hidden" data-ch="scanPhoto" data-v="${v}"></label>`; }).join('')}</div>
    <div class="spread"><span class="faint" style="font-size:13px">${S.scanPhotos.length}/3 views added</span><div class="row"><button class="btn ghost" data-a="scanBack">Back</button><button class="btn primary" data-a="scanNext" ${S.scanPhotos.length? '':'disabled'}>Process</button></div></div>`;
  if (st===3) body = `
    <h2>Processing</h2>
    <ul class="pipeline">
      <li class="ok"><i>✓</i><span>Photos checked: ${S.scanPhotos.length} view${S.scanPhotos.length>1?'s':''} received on this device.</span></li>
      <li class="warn"><i>!</i><span><b>3D reconstruction: no scanning service is connected.</b> Turning photos into a body mesh and measurements needs a body-scanning service. The studio has a slot for one, but none is set up, so no measurements were extracted from your photos.</span></li>
      <li><i>→</i><span>Your photos can still help: they appear beside the measurement form so you can compare your avatar against them while you enter numbers taken with a tape.</span></li>
    </ul>
    <div class="row"><button class="btn primary" data-a="scanToEditor">Measure with photo reference</button><button class="btn" data-a="scanEstimate">Start from a height estimate</button><button class="btn ghost" data-a="closeModal">Close</button></div>`;
  return `<div class="modal" role="dialog" aria-modal="true" aria-label="Body scan">${head}${body}</div>`;
}
