/* ================= VIEWS: wardrobe, garment, outfits, workshop ================= */
function slotOf(spec){ return {bottom:['bottom'], skirt:['bottom'], top:['top'], tee:['top'], dress:['top','bottom'], hoodie:['outer'], jacket:['outer'], suit:['outer','bottom'], robe:['robe']}[spec.template] || ['top']; }

function viewWardrobe(){
  S.vcfg = null;
  const w = S.wardrobe;
  const fav = S.settings.favourites || [];
  let list = garmentsPub();
  if (Store.canPublish()) list = garmentsAll().filter(g=>g.status!=='archived');
  const tabs = [['all','All garments'],['new','New arrivals'],['fav','Favourites'],['recent','Recently viewed'],['mine','My designs'],['outfits','Outfits']];
  if (w.tab==='new'){ const t = S.settings.lastSeenGarmentsAt; list = list.filter(g=>!t || g.createdAt > t || (Date.now()-new Date(g.createdAt))<14*864e5); }
  if (w.tab==='fav') list = list.filter(g=>fav.includes(g.id));
  if (w.tab==='recent') list = (S.settings.recent||[]).map(id=>getGarment(id)).filter(Boolean);
  const q = w.q.trim().toLowerCase();
  if (q) list = list.filter(g => (g.name+' '+g.description+' '+(g.tags||[]).join(' ')+' '+(CAT[g.category]?.label||'')+' '+(g.designer||'')).toLowerCase().includes(q));
  if (w.cat) list = list.filter(g=>g.category===w.cat);
  if (w.color) list = list.filter(g=>(g.colors||[]).some(c=>c.n===w.color));
  if (w.fabric) list = list.filter(g=>g.spec.fabric===w.fabric);
  if (w.fit) list = list.filter(g=>g.spec.fit===w.fit);
  if (w.designer) list = list.filter(g=>g.designer===w.designer);
  if (w.maxPrice) list = list.filter(g=>g.price==null || g.price <= +w.maxPrice);
  if (w.sort==='name') list.sort((a,b)=>a.name.localeCompare(b.name));
  if (w.sort==='price') list.sort((a,b)=>(a.price??1e12)-(b.price??1e12));
  if (w.sort==='new') list.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  if (w.sort==='fit'){ const p = activeProfile(); if (p) list.sort((a,b)=>score(a)-score(b)); function score(g){ const f = fitItemForGarment(p,g).fit; return f.verdict==='good'?0:f.verdict==='check'?1:2; } }
  const all = garmentsAll();
  const colors = [...new Set(all.flatMap(g=>(g.colors||[]).map(c=>c.n)))].sort();
  const fabrics = [...new Set(all.map(g=>g.spec.fabric))];
  const designers = [...new Set(all.map(g=>g.designer).filter(Boolean))];
  const p = activeProfile();
  let content;
  if (w.tab==='mine'){
    const ds = designs();
    content = ds.length ? `<div class="cards">${ds.map(d=>`<div class="gcard" role="button" tabindex="0" data-a="openDesign" data-id="${d.id}"><div class="flat">${flatSVG(d.spec,'front')}${d.template?'<span class="chip badge">Template</span>':''}</div><div class="meta"><b>${esc(d.name)}</b><span>${esc(CAT[d.spec.category]?.label||'')} · v${d.versions.length}</span></div></div>`).join('')}</div>` : `<div class="empty"><h3>No designs yet</h3><button class="btn sm" data-a="go" data-r="create">Create one</button></div>`;
  } else if (w.tab==='outfits'){
    const os = Object.values(Store.private.outfits);
    content = os.length ? `<div class="cards">${os.map(o=>outfitCard(o)).join('')}</div>` : `<div class="empty"><h3>No outfits yet</h3><p>Open a garment and choose “Add to outfit”, then combine pieces and save.</p></div>`;
  } else {
    content = list.length ? `<div class="cards">${list.map(g=>garmentCard(g)).join('')}</div>` : `<div class="empty"><h3>No garments match</h3><p>Try clearing a filter.</p><button class="btn sm" data-a="clearFilters">Clear filters</button></div>`;
  }
  return `
  <div class="page-head">
    <div><h1>Virtual Wardrobe</h1><p>${p ? `Every garment opens on <b>${esc(p.name)}</b>'s saved avatar. No new scan needed.` : 'Add a body profile to try garments on your own avatar. Until then garments show on a reference size M body.'}</p></div>
    ${Store.canPublish()?'<button class="btn" data-a="tailorNewGarment">'+ic('plus')+'Add garment</button>':''}
  </div>
  ${outfitTray()}
  <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${w.tab===k}" data-a="wardTab" data-t="${k}">${l}${k==='new'&&newGarments().length&&S.settings.lastSeenGarmentsAt?` <span class="chip tape">${newGarments().length}</span>`:''}</button>`).join('')}</div>
  ${['mine','outfits'].includes(w.tab) ? '' : `<div class="form-grid" style="margin-bottom:16px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
    <label class="field">Search<input type="search" id="w-q" data-in="wq" value="${esc(w.q)}" placeholder="Name, style, tag"></label>
    <label class="field">Category<select id="w-cat" data-ch="wf" data-k="cat"><option value="">All</option>${CATEGORIES.filter(c=>all.some(g=>g.category===c.k)).map(c=>`<option value="${c.k}" ${w.cat===c.k?'selected':''}>${c.label}</option>`).join('')}</select></label>
    <label class="field">Colour<select id="w-color" data-ch="wf" data-k="color"><option value="">All</option>${colors.map(c=>`<option ${w.color===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
    <label class="field">Fabric<select id="w-fabric" data-ch="wf" data-k="fabric"><option value="">All</option>${fabrics.map(f=>`<option value="${f}" ${w.fabric===f?'selected':''}>${FABRICS[f]?.name||f}</option>`).join('')}</select></label>
    <label class="field">Fit<select id="w-fit" data-ch="wf" data-k="fit"><option value="">All</option>${OPTIONS.fit.filter(f=>f!=='custom').map(f=>`<option value="${f}" ${w.fit===f?'selected':''}>${optLabel(f)}</option>`).join('')}</select></label>
    <label class="field">Tailor / designer<select id="w-des" data-ch="wf" data-k="designer"><option value="">All</option>${designers.map(d=>`<option ${w.designer===d?'selected':''}>${esc(d)}</option>`).join('')}</select></label>
    <label class="field">Max price<input type="number" id="w-price" data-ch="wf" data-k="maxPrice" value="${esc(w.maxPrice)}" placeholder="Any"></label>
    <label class="field">Sort<select id="w-sort" data-ch="wf" data-k="sort">${[['new','Newest'],['name','Name'],['price','Price'],['fit','Best fit for me']].map(([k,l])=>`<option value="${k}" ${w.sort===k?'selected':''}>${l}</option>`).join('')}</select></label>
  </div>`}
  ${content}`;
}
function outfitTray(){
  if (!S.outfitDraft.length) return '';
  return `<div class="panel" style="margin-bottom:16px;padding:12px 16px"><div class="spread"><div class="row tight"><b style="font-size:14px">Outfit in progress</b>${S.outfitDraft.map(it=>{ const g = getGarment(it.g); return g?`<span class="chip">${esc(g.name)} <button class="btn sm ghost icon" style="min-height:20px;width:20px" data-a="outfitRemove" data-id="${g.id}" aria-label="Remove ${esc(g.name)}">${ic('x','style="width:12px;height:12px"')}</button></span>`:''; }).join('')}</div><div class="row tight"><button class="btn sm primary" data-a="openOutfit" data-id="draft">Try on together</button><button class="btn sm ghost" data-a="outfitClear">Clear</button></div></div></div>`;
}

/* ---------- garment detail (try-on) ---------- */
function viewGarment(){
  const g = getGarment(S.params.id);
  if (!g){ S.vcfg = null; return `<div class="empty"><h3>This garment is no longer in the library</h3><p>It may have been archived or deleted.</p><button class="btn" data-a="go" data-r="wardrobe">Back to wardrobe</button></div>`; }
  const p = activeProfile() || REF_PROFILE;
  const gv = S.gview && S.gview.id===g.id ? S.gview : (S.gview = {id:g.id, size:null, color:g.colors?.[0]?.h || g.spec.color, compare:null});
  const it = fitItemForGarment(p, g, gv.size, gv.color);
  const fit = it.fit;
  const B = gv.compare ? [fitItemForGarment(p, g, gv.size, gv.compare)] : null;
  S.vcfg = {profile:p, A:[it], B};
  const verdict = {good:['ok','Good fit'], check:['warn','Check the details'], tight:['bad','Too tight in places']}[fit.verdict];
  const fav = (S.settings.favourites||[]).includes(g.id);
  const sizes = Object.keys(g.sizes||{});
  const colorName = (g.colors||[]).find(c=>c.h===gv.color)?.n || '';
  const modeTxt = (g.fitModes||[]).includes('estimated') ? 'Estimated fit: the garment’s size chart is compared zone by zone with your measurements and drawn on your parametric avatar.' : 'Preview only: this garment lacks a complete size chart, so only a visual preview is shown.';
  return `
  <div class="row" style="margin-bottom:10px"><button class="btn sm ghost" data-a="go" data-r="wardrobe">${ic('back')}Wardrobe</button></div>
  ${outfitTray()}
  <div class="studio">
    ${stageHTML({hud:`<span class="chip">${esc(p.name)}</span>${p.ref?'<span class="chip warn">Reference body</span>':''}<span class="chip">Size ${esc(fit.size||'—')}</span>${fit.cached?'<span class="chip demo">Cached fit</span>':''}`, compare: B ? [colorName, (g.colors||[]).find(c=>c.h===gv.compare)?.n || 'Compare'] : null})}
    <div class="side">
      <section class="panel stack">
        <div class="stack s">
          <div class="row tight">${g.demo?'<span class="chip demo">Studio template</span>':''}${g.fromStore?'<span class="chip accent">IZELIA product</span>':''}${g.status!=='published'?`<span class="chip warn">${esc(g.status)}</span>`:''}<span class="chip">v${g.version}</span></div>
          <h1 class="display" style="font-size:32px">${esc(g.name)}</h1>
          <span class="faint" style="font-size:13px">${esc(CAT[g.category]?.label||'')} · ${esc(g.designer||'')} ${g.price?`· ${money(g.price,g.currency)}`:''}</span>
          <p class="muted" style="font-size:14.5px">${esc(g.description)}</p>
        </div>
        ${(g.colors||[]).length ? `<div class="ctl"><span class="lbl">Colour · ${esc(colorName)}</span><div class="swatches">${g.colors.map(c=>`<button class="sw" style="background:${c.h}" data-a="gColor" data-v="${c.h}" aria-pressed="${gv.color===c.h}" aria-label="${esc(c.n)}" title="${esc(c.n)}"></button>`).join('')}</div></div>`:''}
        ${sizes.length ? `<div class="ctl"><span class="lbl">Size</span><div class="opts">${sizes.map(s=>`<button class="opt" data-a="gSize" data-v="${s}" aria-pressed="${fit.size===s}">${s}${fit.recommended===s?' ★':''}</button>`).join('')}</div><span class="faint" style="font-size:12.5px">★ recommended for ${esc(p.name)}</span></div>`:''}
        <div class="row">
          <button class="btn ${fav?'primary':''}" data-a="toggleFav" data-id="${g.id}" aria-pressed="${fav}">${ic('heart', fav?'fill="currentColor"':'')}${fav?'Saved':'Favourite'}</button>
          <button class="btn" data-a="outfitAdd" data-id="${g.id}">Add to outfit</button>
          <button class="btn" data-a="customiseGarment" data-id="${g.id}">${ic('create')}Customise</button>
        </div>
      </section>
      <section class="panel stack">
        <div class="spread"><h2>Fit</h2><span class="chip ${verdict[0]}">${verdict[1]}</span></div>
        ${fitTable(fit)}
        ${fit.missing.length && !p.ref ? `<div class="note warn">${fit.missing.map(k=>MBYK[k].label).join(', ')} ${fit.missing.length>1?'are':'is'} estimated. Add ${fit.missing.length>1?'them':'it'} in My Body for a better check.</div>`:''}
        ${p.ref ? `<div class="note warn">Showing a reference size M body. <button class="btn sm" data-a="newProfile" style="margin-top:6px">Add your measurements</button></div>`:''}
        <div class="spread"><span style="font-weight:600;font-size:14px">Fit map</span><button class="btn sm ${S.viewer.fitMap?'primary':''}" data-a="vtool" data-t="fitMap">${S.viewer.fitMap?'On':'Off'}</button></div>
        ${fitLegend()}
        <p class="faint" style="font-size:12.5px">${modeTxt} Not a cloth simulation; comfort and final fit are not guaranteed.</p>
      </section>
      ${(g.colors||[]).length>1 ? `<section class="panel stack s"><h3>Compare colours</h3><div class="opts">${g.colors.filter(c=>c.h!==gv.color).map(c=>`<button class="opt" data-a="gCompare" data-v="${c.h}" aria-pressed="${gv.compare===c.h}">${esc(c.n)}</button>`).join('')}${gv.compare?'<button class="opt" data-a="gCompare" data-v="">Stop</button>':''}</div></section>`:''}
      <section class="panel stack s">
        <div class="row"><button class="btn sm" data-a="garmentWorkshop" data-id="${g.id}">Materials and pattern</button>${Store.canPublish()? (g.fromStore ? `<button class="btn sm" data-a="productEdit" data-id="${g.productId}">Edit product fitting</button>` : `<button class="btn sm" data-a="tailorEditGarment" data-id="${g.id}">Edit garment</button>`):''}${g.fromStore?`<button class="btn sm" data-a="openProduct" data-id="${g.productId}">Shop this piece</button>`:''}</div>
        ${S.settings.technical && sizes.length ? `<div class="scroll-x"><table class="data"><thead><tr><th>Size</th>${Object.keys(g.sizes[sizes[0]]).map(k=>`<th class="num">${optLabel(k)}</th>`).join('')}</tr></thead><tbody>${sizes.map(s=>`<tr><td>${s}</td>${Object.values(g.sizes[s]).map(v=>`<td class="num mono">${Units.show(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="faint" style="font-size:12px">Garment measurements (finished), not body measurements.</p>`:''}
      </section>
    </div>
  </div>`;
}

/* ---------- outfit view ---------- */
function viewOutfit(){
  const id = S.params.id;
  const o = id==='draft' ? {id:'draft', name:'New outfit', items:S.outfitDraft, profileId:activeProfile()?.id} : Store.private.outfits[id];
  if (!o){ S.vcfg=null; return `<div class="empty"><h3>Outfit not found</h3><button class="btn" data-a="go" data-r="wardrobe">Back</button></div>`; }
  const p = Store.private.profiles[o.profileId] || activeProfile() || REF_PROFILE;
  const items = o.items.map(it=>{ const g = getGarment(it.g); return g ? {g, ...fitItemForGarment(p, g, it.size, it.color)} : null; }).filter(Boolean);
  S.vcfg = {profile:p, A:items};
  const missing = o.items.filter(it=>!getGarment(it.g)).length;
  const order = [...items].sort((a,b)=>layerOf(a.spec)-layerOf(b.spec));
  return `
  <div class="row" style="margin-bottom:10px"><button class="btn sm ghost" data-a="wardTab" data-t="outfits">${ic('back')}Outfits</button></div>
  <div class="studio">
    ${stageHTML({hud:`<span class="chip">${esc(p.name)}</span><span class="chip">${items.length} pieces</span>`})}
    <div class="side">
      <section class="panel stack">
        <label class="field">Outfit name<input type="text" id="of-name" value="${esc(o.name)}" data-in="outfitName"></label>
        <div class="ctl"><span class="lbl">Layers, inside to outside</span><div class="list">${order.map((it,i)=>`<div class="li"><span class="num faint">${i+1}</span><div class="thumb">${flatSVG(it.spec,'front')}</div><div class="grow"><b>${esc(it.g.name)}</b><small>Size ${it.fit.size} · ${it.fit.verdict==='good'?'good fit':it.fit.verdict==='check'?'check fit':'tight'}</small></div><button class="btn sm ghost" data-a="${id==='draft'?'outfitRemove':'outfitItemRemove'}" data-id="${it.g.id}" data-o="${o.id}">Remove</button></div>`).join('')}</div></div>
        ${missing?`<div class="note warn">${missing} piece${missing>1?'s were':' was'} removed from the library and can’t be shown.</div>`:''}
        <p class="faint" style="font-size:12.5px">Layers are ordered automatically (trousers, then tops, then jackets, then robes). Each outer layer is sized to sit outside the one beneath it, which prevents basic intersections.</p>
        <div class="row">${id==='draft' ? `<button class="btn primary" data-a="outfitSave">Save outfit</button><button class="btn" data-a="go" data-r="wardrobe">Add more pieces</button>` : `<button class="btn danger" data-a="outfitDelete" data-id="${o.id}">Delete outfit</button>`}</div>
      </section>
    </div>
  </div>`;
}

/* ---------- WORKSHOP ---------- */
function workshopSource(){
  const w = S.workshop;
  if (!w.src){ const d = designs()[0]; if (d) w.src = {type:'design', id:d.id}; else { const g = garmentsPub()[0]; if (g) w.src = {type:'garment', id:g.id}; } }
  if (!w.src) return null;
  if (w.src.type==='design'){ const d = Store.private.designs[w.src.id]; if (!d){ w.src=null; return workshopSource(); } return {label:d.name, spec:d.spec, design:d, profileId:d.profileId}; }
  if (w.src.type==='shared'){ return w.src.data; }
  const g = getGarment(w.src.id); if (!g){ w.src=null; return null; }
  return {label:g.name, spec:g.spec, garment:g};
}
function viewWorkshop(){
  S.vcfg = null;
  const w = S.workshop; const src = workshopSource();
  if (!src) return `<div class="page-head"><div><h1>Tailoring Workshop</h1></div></div><div class="empty"><h3>Nothing to work on yet</h3><p>Create a design or add garments to the library first.</p><button class="btn" data-a="go" data-r="create">Create a design</button></div>`;
  const prof = (src.profile) || (w.profileId==='ref-none' ? REF_PROFILE : (Store.private.profiles[w.profileId] || Store.private.profiles[src.profileId] || activeProfile() || REF_PROFILE));
  const spec = src.spec;
  const fab = FABRICS[spec.fabric]||FABRICS.poplin;
  const prices = src.design?.prices || w.prices;
  let mat;
  try { mat = calcMaterials(prof, spec, {width:w.width||fab.w, sa:w.sa, ha:w.ha, waste:w.waste, repeat:w.repeat, prices}); }
  catch(e){ console.error(e); return `<div class="note warn">This garment could not be drafted: ${esc(e.message)}</div>`; }
  S.lastMat = {mat, prof, spec, src};
  const tabs = [['materials','Materials'],['pattern','Pattern'],['layout','Cutting layout'],['steps','Sewing steps'],['sheet','Technical sheet']];
  const opts = [...designs().map(d=>`<option value="design:${d.id}" ${w.src.type==='design'&&w.src.id===d.id?'selected':''}>Design · ${esc(d.name)}</option>`), ...garmentsPub().map(g=>`<option value="garment:${g.id}" ${w.src.type==='garment'&&w.src.id===g.id?'selected':''}>Library · ${esc(g.name)}</option>`)];
  if (w.src.type==='shared') opts.unshift(`<option selected>Client project · ${esc(src.label)}</option>`);
  const body = {materials:wsMaterials, pattern:wsPattern, layout:wsLayout, steps:wsSteps, sheet:wsSheet}[w.tab](mat, prof, spec, src);
  return `
  <div class="page-head">
    <div><h1>Tailoring Workshop</h1><p>Materials, pattern pieces, cutting layout and sewing steps, drafted from one design and one body.</p></div>
    <button class="btn sm ${S.settings.technical?'primary':''}" data-a="toggleTechnical" aria-pressed="${S.settings.technical}">Technical mode: ${S.settings.technical?'on':'off'}</button>
  </div>
  <div class="panel" style="margin-bottom:16px"><div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
    <label class="field">Working on<select id="ws-src" data-ch="wsSrc">${opts.join('')}</select></label>
    <label class="field">For body profile<select id="ws-prof" data-ch="wsProf" ${src.profile?'disabled':''}>${src.profile?`<option>${esc(src.profile.name)}</option>`:''}${profiles().map(p=>`<option value="${p.id}" ${p.id===prof.id?'selected':''}>${esc(p.name)}</option>`).join('')}<option value="ref" ${prof.ref?'selected':''}>Reference body (size M)</option></select></label>
    <div class="field"><span>Status</span><div class="row tight" style="min-height:40px"><span class="chip warn">Draft pattern</span>${mat.missing.length?'<span class="chip bad">Estimated measurements</span>':''}${prof.verified?'<span class="chip ok">Verified body</span>':'<span class="chip">Unverified body</span>'}</div></div>
  </div>
  ${src.garment ? '<p class="faint" style="font-size:12.5px;margin-top:10px">Library garments are drafted made-to-measure in the garment’s style for this body, not from its size chart.</p>':''}</div>
  <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${w.tab===k}" data-a="wsTab" data-t="${k}">${l}</button>`).join('')}</div>
  ${body}`;
}
function wsMaterials(mat, prof, spec, src){
  const w = S.workshop; const cur = S.settings.currency;
  const prices = src.design?.prices || w.prices;
  const tech = S.settings.technical;
  return `<div class="two" style="align-items:start">
    <section class="panel stack">
      <h2>Inputs</h2>
      <div class="form-grid">
        <label class="field">Fabric width<span class="inwrap" style="display:flex;gap:6px;align-items:center"><input type="number" id="ws-width" data-ch="wsNum" data-k="width" value="${Units.val(mat.width)}" step="1"><span class="faint mono">${Units.sys}</span></span><small>${esc(FABRICS[spec.fabric]?.name||'')}</small></label>
        <label class="field">Main fabric price / ${Units.sys==='in'?'yd':'m'}<input type="number" id="ws-pmain" data-ch="wsPrice" data-k="main" value="${prices?.main ?? ''}" placeholder="Your price"></label>
        ${mat.rows.some(r=>r.k==='lining')?`<label class="field">Lining price / ${Units.sys==='in'?'yd':'m'}<input type="number" id="ws-plin" data-ch="wsPrice" data-k="lining" value="${prices?.lining ?? ''}" placeholder="Your price"></label>`:''}
        ${mat.rows.some(r=>r.k==='interfacing')?`<label class="field">Interfacing price / ${Units.sys==='in'?'yd':'m'}<input type="number" id="ws-pint" data-ch="wsPrice" data-k="interfacing" value="${prices?.interfacing ?? ''}" placeholder="Your price"></label>`:''}
        <label class="field">Currency<select id="ws-cur" data-ch="setCurrency">${Object.keys(CURRENCIES).map(c=>`<option ${cur===c?'selected':''}>${c}</option>`).join('')}</select></label>
      </div>
      ${tech ? `<div class="form-grid">
        <label class="field">Seam allowance<input type="number" step="0.1" id="ws-sa" data-ch="wsNum" data-k="sa" value="${Units.val(mat.sa)}"></label>
        <label class="field">Hem allowance<input type="number" step="0.1" id="ws-ha" data-ch="wsNum" data-k="ha" value="${Units.val(mat.ha)}"></label>
        <label class="field">Cutting waste %<input type="number" step="1" id="ws-waste" data-ch="wsPct" data-k="waste" value="${Math.round((w.waste??.05)*100)}"></label>
        <label class="field">Print repeat<input type="number" step="0.5" id="ws-rep" data-ch="wsNum" data-k="repeat" value="${Units.val(mat.repeat)}"></label>
      </div>` : '<p class="faint" style="font-size:12.5px">Seam and hem allowances, waste and print repeat can be changed in technical mode.</p>'}
      ${prices===src.design?.prices && src.design?.sample && prices?.main ? '<span class="chip demo">Example prices</span>':''}
    </section>
    <section class="panel stack">
      <div class="spread"><h2>Estimate</h2><span class="chip ${mat.confidence==='Low'?'bad':'warn'}">Confidence: ${mat.confidence}</span></div>
      <div class="qty-grid">
        <div class="qty"><b>${Units.len(mat.mainM)}</b><span>Main fabric${mat.pieces6yd?` · ${mat.pieces6yd} × 6 yd piece${mat.pieces6yd>1?'s':''}`:''}</span></div>
        ${mat.rows.filter(r=>r.k!=='main').map(r=>`<div class="qty"><b>${Units.len(r.m)}</b><span>${esc(r.label)}</span></div>`).join('')}
        <div class="qty"><b>${Math.round(mat.wastePct*100)}%</b><span>Layout waste</span></div>
        <div class="qty"><b>${mat.cost? money(mat.cost) : '—'}</b><span>${mat.cost ? (mat.costComplete?'Material cost':'Partial cost') : 'Add prices for cost'}</span></div>
      </div>
      <div class="scroll-x"><table class="data"><thead><tr><th>Material</th><th class="num">Width</th><th class="num">Quantity</th><th class="num">Cost</th></tr></thead><tbody>
        ${mat.rows.map(r=>`<tr><td>${esc(r.label)}</td><td class="num mono">${Units.show(r.width,0)}</td><td class="num mono">${Units.len(r.m)}</td><td class="num mono">${r.price? money(r.price*(Units.sys==='in'? r.m/0.9144 : r.m)) : '—'}</td></tr>`).join('')}
        ${mat.notions.map(n=>`<tr><td>${esc(n.label)}</td><td></td><td class="num mono">${n.qty} <span class="faint">${esc(n.unit)}</span></td><td class="num">—</td></tr>`).join('')}
      </tbody></table></div>
      ${mat.warnings.length?`<div class="note warn">${mat.warnings.map(esc).join('<br>')}</div>`:''}
      ${mat.missing.length?`<div class="note warn"><b>Missing:</b> ${mat.missing.map(esc).join(', ')}. These were estimated from height.</div>`:''}
      <div class="stack s"><span class="eyebrow">Assumptions</span><ul style="margin:0;padding-left:18px;font-size:13.5px;color:var(--ink-2)">${mat.assumptions.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div>
      <div class="row"><button class="btn sm" data-a="exportCSV">${ic('download')}Shopping list (CSV)</button></div>
    </section>
  </div>`;
}
function wsPattern(mat, prof, spec){
  const d = mat.draft;
  return `<div class="stack">
    <div class="note warn"><b>Draft pattern, not validated for production.</b> These are block drafts generated from the measurements. Darts, ease distribution and curves should be checked by a tailor, and a toile (test garment) is recommended before cutting good fabric.</div>
    <div class="two" style="align-items:start">
      <section class="panel stack"><h2>Pieces</h2>${patternSheetSVG(d.pieces, mat.sa)}<p class="faint" style="font-size:12.5px">Solid line: cutting line with ${Units.show(mat.sa)} seam allowance. Dashed: stitching line. Gold edge: place on fold.</p></section>
      <section class="panel stack">
        <div class="scroll-x"><table class="data"><thead><tr><th>Piece</th><th class="num">Cut</th><th class="num">W × H</th><th>Material</th></tr></thead><tbody>${d.pieces.map((p,i)=>{ const b = bbox(p.poly); return `<tr><td>${esc(p.name)}${p.interface?' <span class="chip">interface</span>':''}</td><td class="num mono">${p.qty}${p.fold?' fold':''}</td><td class="num mono">${Units.show(b.w*(p.fold?2:1),0)} × ${Units.show(b.h,0)}</td><td>${esc(p.mat)}</td></tr>`; }).join('')}</tbody></table></div>
        ${d.notes.length?`<div class="note">${d.notes.map(esc).join('<br>')}</div>`:''}
        <div class="row"><button class="btn sm" data-a="exportPatternSVG">${ic('download')}Full-scale pattern (SVG)</button><button class="btn sm" data-a="exportJSON">${ic('download')}Pattern data (JSON)</button></div>
        <p class="faint" style="font-size:12.5px">The SVG is drawn at 1:1 in centimetres with a 10 cm test square on each piece. Print at 100% scale and check the square before cutting.</p>
      </section>
    </div>
  </div>`;
}
function wsLayout(mat){
  const w = S.workshop;
  const show = w.layoutMat || 'main';
  const lay = show==='main' ? mat.main : mat[show];
  const mats = ['main', ...['lining','pocketing','rib'].filter(k=>mat[k])];
  return `<div class="stack">
    <div class="spread"><div class="opts">${mats.map(k=>`<button class="opt" data-a="wsLayoutMat" data-v="${k}" aria-pressed="${show===k}">${k==='main'?FABRICS[S.lastMat.spec.fabric]?.name||'Main':optLabel(k)}</button>`).join('')}</div><span class="faint" style="font-size:13px">${lay? `${Units.show(lay.length,0)} of fabric used, folded width ${Units.show(lay.half*2+2,0)}`:''}</span></div>
    <div class="two" style="align-items:start">
      <div class="layout-wrap">${lay ? layoutSVG(lay, show==='main'?mat.width:140, show==='main'?'Main fabric':optLabel(show)) : ''}</div>
      <section class="panel stack">
        <h2>How to cut</h2>
        <ol style="margin:0;padding-left:20px;font-size:14px;color:var(--ink-2)" class="stack s">
          <li>Fold the fabric lengthwise, right sides together, selvedges lined up.</li>
          <li>Place pieces with the gold edge on the fold; keep every grainline parallel to the selvedge.</li>
          <li>${mat.directional?'Keep all pieces pointing the same way (one-way layout).':'Pieces may be turned end to end if the fabric has no nap or print direction.'}</li>
          <li>Pieces marked ↻ are turned 90° and cut on the cross-grain.</li>
          <li>Cut on the solid line, mark notches, then transfer darts and pocket positions.</li>
        </ol>
        ${lay?.warnings?.length?`<div class="note warn">${lay.warnings.map(esc).join('<br>')}</div>`:''}
        <p class="faint" style="font-size:12.5px">Layout is a skyline packing estimate. Tailors often save 5–10% by nesting pieces by hand.</p>
      </section>
    </div>
  </div>`;
}
function wsSteps(mat, prof, spec){
  const steps = sewingSteps(prof, spec);
  return `<section class="panel"><div class="spread" style="margin-bottom:8px"><h2>${steps.length} steps for ${esc(spec.name||'this design')}</h2><span class="chip">${optLabel(spec.seams)} seams · ${FABRICS[spec.fabric]?.name}</span></div>
  <ol class="steplist">${steps.map((s,i)=>`<li><span class="n">${i+1}</span><div><h4>${esc(s.title)}</h4><p>${esc(s.body)}</p><div class="meta">${s.pieces.length?s.pieces.map(p=>`<span class="chip">${esc(p)}</span>`).join(''):''}${s.stitch?`<span class="chip accent">${esc(s.stitch)}</span>`:''}${s.measure?`<span class="chip tape">${esc(s.measure)}</span>`:''}</div>${s.check?`<p class="faint" style="font-size:13px;margin-top:6px">Check: ${esc(s.check)}</p>`:''}</div></li>`).join('')}</ol></section>`;
}
function techSheetHTML(mat, prof, spec, src, forExport){
  const d = mat.draft, F = d.finished;
  const design = src.design;
  const ver = design ? design.versions.length : (src.garment ? src.garment.version : 1);
  const lvl = design ? designLevel(design, prof.ref?null:prof) : null;
  const status = lvl ? lvl.levels[lvl.cur].label : 'Library garment';
  const steps = sewingSteps(prof, spec);
  const row = (k,v) => `<tr><td style="color:#857F73;padding:5px 10px 5px 0">${k}</td><td style="padding:5px 0;font-weight:500">${v}</td></tr>`;
  return `
  <div class="sheet-doc">
    <div class="spread"><div><span class="eyebrow">Technical sheet</span><h2 class="display" style="font-size:30px">${esc(spec.name||src.label)}</h2></div>
      <table style="font-size:13px;border-collapse:collapse">${row('Version', 'v'+ver)}${row('Date', fmtDate(nowIso()))}${row('Body', esc(prof.name))}${row('Status', esc(status))}</table></div>
    <div class="flats"><div>${flatSVG(spec,'front')}<br>Front</div><div>${flatSVG(spec,'back')}<br>Back</div></div>
    <div class="two">
      <div><h3 style="margin-bottom:6px">Design</h3><table style="font-size:13.5px;border-collapse:collapse">
        ${row('Garment', esc(CAT[spec.category]?.label||spec.category))}${row('Block', TEMPLATE_LABEL[spec.template])}${row('Fit', optLabel(spec.fit))}${row('Length', optLabel(spec.length))}
        ${!['bottom','skirt'].includes(spec.template)?row('Sleeve', optLabel(spec.sleeve))+row('Collar', optLabel(spec.collar))+row('Closure', optLabel(spec.closure)+(spec.buttons&&['buttons','double-breasted'].includes(spec.closure)?` · ${spec.buttons} buttons`:'')):''}
        ${['bottom','suit'].includes(spec.template)?row('Leg', optLabel(spec.legShape))+row('Waistband', optLabel(spec.waistband))+row('Pleats', optLabel(spec.pleats)):''}
        ${row('Pockets', optLabel(spec.pockets))}${row('Seams', optLabel(spec.seams))}${row('Topstitch', optLabel(spec.topstitch))}${spec.embroidery!=='none'?row('Embroidery', optLabel(spec.embroidery)):''}
        ${row('Fabric', esc(FABRICS[spec.fabric]?.name)+` · <span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${spec.color};vertical-align:-1px;border:1px solid #ccc"></span> ${spec.color} · ${PRINTS[spec.print]}`)}
        ${spec.lining!=='none'?row('Lining', optLabel(spec.lining)+` · ${PRINTS[spec.liningPrint]} ${spec.liningColor}`):''}
        ${spec.notes?row('Notes', esc(spec.notes)):''}
      </table></div>
      <div><h3 style="margin-bottom:6px">Measurements</h3><table style="font-size:13.5px;border-collapse:collapse">
        ${['chest','waist','hip'].map(k=>row(optLabel(k), `${Units.show(d.body.m[k])} body → ${Units.show(F[k])} finished`)).join('')}
        ${!['bottom','skirt'].includes(spec.template)?row('Length (back neck)', Units.show(F.length)):''}${F.sleeve?row('Sleeve', Units.show(F.sleeve)):''}${['bottom','suit'].includes(spec.template)?row('Outseam', Units.show(F.outseam)):''}
      </table>
      ${d.body.estimated.length?`<p style="font-size:12px;color:#A86B12;margin-top:6px">Estimated from height: ${d.body.estimated.map(k=>MBYK[k]?.label).join(', ')}</p>`:''}</div>
    </div>
    <div><h3 style="margin-bottom:6px">Materials</h3><table style="font-size:13.5px;border-collapse:collapse;width:100%">${mat.rows.map(r=>row(esc(r.label), `${Units.len(r.m)} at ${Units.show(r.width,0)} wide`)).join('')}${mat.notions.map(n=>row(esc(n.label), `${n.qty} ${esc(n.unit)}`)).join('')}</table></div>
    <div><h3 style="margin-bottom:6px">Pattern pieces</h3><p style="font-size:13.5px">${d.pieces.map(p=>`${esc(p.name)} ×${p.qty}${p.fold?' (fold)':''}`).join(' · ')}</p></div>
    <div><h3 style="margin-bottom:6px">Construction</h3><ol style="font-size:13.5px;padding-left:20px;margin:0">${steps.map(s=>`<li style="margin-bottom:4px"><b>${esc(s.title)}.</b> ${esc(s.body)}</li>`).join('')}</ol></div>
    <p style="font-size:12px;color:#857F73">Generated by the IZELIA AI Tailoring Studio. Pattern is a block draft and has ${lvl && lvl.levels[3].ok ? 'been validated by a tailor.' : 'not been validated for production.'} Virtual previews do not guarantee physical fit.</p>
  </div>`;
}
function wsSheet(mat, prof, spec, src){
  return `<div class="stack"><div class="row"><button class="btn sm" data-a="exportSheet">${ic('download')}Technical sheet (HTML)</button><button class="btn sm" data-a="exportJSON">${ic('download')}Structured data (JSON)</button><button class="btn sm" data-a="exportFlat">${ic('download')}Flats (SVG)</button></div>${techSheetHTML(mat, prof, spec, src)}</div>`;
}
