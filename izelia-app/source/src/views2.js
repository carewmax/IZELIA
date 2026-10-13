/* ================= VIEW: CREATE YOUR OWN (studio) ================= */
const LENGTHS_FOR = {top:['cropped','waist','hip','thigh'], tee:['cropped','waist','hip','thigh'], hoodie:['cropped','hip','thigh'], jacket:['waist','hip','thigh','knee','midi'],
  bottom:['thigh','knee','ankle','floor'], skirt:['thigh','knee','midi','ankle','floor'], dress:['thigh','knee','midi','ankle','floor'], robe:['knee','midi','ankle','floor'], suit:['hip','thigh']};
const COLLARS_FOR = {top:['point','button-down','mandarin','crew','v-neck','notch-lapel','none'], tee:['crew','v-neck','scoop','boat','hood'], hoodie:['hood','crew'], jacket:['point','mandarin','notch-lapel','peak-lapel','shawl','hood'],
  dress:['v-neck','scoop','boat','crew','mandarin','none'], robe:['none','mandarin','v-neck','crew','boat'], suit:['notch-lapel','peak-lapel','shawl']};

function ensureStudio(){
  if (S.studio) return S.studio;
  const p = activeProfile();
  const spec = defaultSpec('shirt'); spec.name = 'Untitled shirt';
  S.studio = {designId:null, spec, profileId:p?.id || null, sourceGarmentId:null, tab:'brief', brief:'', proposal:null, aiBusy:false, compareV:null, savedJSON:null};
  S.undo = []; S.redo = [];
  return S.studio;
}
function studioProfile(){ const st = ensureStudio(); if (st.profileId==='ref-none') return REF_PROFILE; return (st.profileId && Store.private.profiles[st.profileId]) || activeProfile() || REF_PROFILE; }
function studioDirty(){ const st = S.studio; return !st.designId || JSON.stringify(st.spec) !== st.savedJSON; }

function viewCreate(){
  const st = ensureStudio(), spec = st.spec, prof = studioProfile();
  const t = spec.template;
  const item = fitItemForSpec(prof, spec);
  let B = null;
  const design = st.designId ? Store.private.designs[st.designId] : null;
  if (st.compareV!=null && design && design.versions[st.compareV]) B = [fitItemForSpec(prof, design.versions[st.compareV].spec)];
  S.vcfg = {profile:prof, A:[item], B};
  const lvl = designLevel(design || {id:'tmp', spec, versions:[]}, prof.ref ? null : prof);
  const stepsDone = [!!spec.category, !!(st.brief || design), true, true];
  const tabs = [['brief','Brief'],['style','Style'],['fabric','Fabric'],['fit','Fit'],['versions','Versions'],['make','Make it']];
  const hud = `<span class="chip">${esc(prof.name)}</span>${prof.ref?'<span class="chip warn">Not your body</span>':''}<span class="chip demo">${lvl.levels[Math.min(lvl.cur,2)].label} · parametric</span>${st.compareV!=null?'<span class="chip accent">Comparing versions</span>':''}`;
  return `
  <div class="page-head">
    <div style="min-width:0;flex:1">
      <span class="eyebrow">Create your own${design?.sample?' · sample design':''}</span>
      <input type="text" id="st-name" data-in="stName" value="${esc(spec.name)}" aria-label="Design name" style="font-family:var(--f-display);font-size:clamp(26px,3vw,38px);border:0;background:transparent;padding:0;min-height:0;box-shadow:none;width:100%">
    </div>
    <div class="row">
      <button class="btn icon" data-a="undo" ${S.undo.length?'':'disabled'} aria-label="Undo">${ic('undo')}</button>
      <button class="btn icon" data-a="redo" ${S.redo.length?'':'disabled'} aria-label="Redo">${ic('redo')}</button>
      <button class="btn" data-a="newDesign">New</button>
      <button class="btn primary" data-a="saveDesign">${design ? (studioDirty()?'Save version':'Saved') : 'Save design'}</button>
    </div>
  </div>
  <div class="steps" aria-label="Progress">${['Garment','Describe','Customise','Fit','Make'].map((s,i)=>`<span class="${i<lvl.cur+2 && i<4 ? 'done':''}">${s}</span>`).join('')}</div>
  <div class="studio">
    ${stageHTML({hud, compare: B ? ['Current', `Version ${st.compareV+1}`] : null})}
    <div class="side">
      <div class="panel" style="padding:10px 14px">
        <div class="ctl"><span class="lbl">Output level</span>
          <div class="level">${lvl.levels.map((l,i)=>`<div class="${i===lvl.cur?'cur':l.ok?'on':''}">${l.label}</div>`).join('')}</div>
          ${lvl.levels.find((l,i)=>i===lvl.cur+1) ? `<span class="faint" style="font-size:12.5px">Next: ${esc(lvl.levels[lvl.cur+1].need.join('; ')||'')}</span>`:''}
        </div>
      </div>
      ${design?.needsRecalc ? `<div class="note warn"><b>${esc(prof.name)}'s measurements changed</b> since this design was saved. The fit and materials shown already use the new measurements; save a new version to record them.</div>`:''}
      <div class="panel" style="padding:14px 16px 18px">
        <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${st.tab===k}" data-a="stTab" data-t="${k}">${l}</button>`).join('')}</div>
        ${({brief:studioBrief, style:studioStyle, fabric:studioFabric, fit:studioFit, versions:studioVersions, make:studioMake})[st.tab](st, spec, prof, item, design)}
      </div>
    </div>
  </div>`;
}

function optRow(k, list, cur, label){
  return `<div class="ctl"><span class="lbl">${label}</span><div class="opts">${list.map(v=>`<button class="opt" data-a="spec" data-k="${k}" data-v="${v}" aria-pressed="${cur===v}">${optLabel(v)}</button>`).join('')}</div></div>`;
}

function studioBrief(st, spec){
  const pr = st.proposal;
  const provider = AI.available() ? 'Claude' : 'Local keyword interpreter';
  return `<div class="stack">
    <div class="ctl"><span class="lbl">Garment</span>
      <div class="cat-grid">${CATEGORIES.map(c=>`<button class="cat" data-a="setCategory" data-c="${c.k}" aria-pressed="${spec.category===c.k}">${catIcon(c.k)}<span>${c.label}</span></button>`).join('')}</div>
      ${spec.category==='custom' ? `<div class="form-grid"><label class="field">Custom garment name<input type="text" id="st-custom" data-in="customCat" value="${esc(spec.customCategory||'')}" placeholder="e.g. Kimono jacket"></label><label class="field">Closest block<select id="st-template" data-ch="customTemplate">${TEMPLATES.filter(x=>x!=='suit').map(t=>`<option value="${t}" ${spec.template===t?'selected':''}>${TEMPLATE_LABEL[t]}</option>`).join('')}</select></label></div>`:''}
    </div>
    <label class="field">Describe it in your own words
      <textarea id="st-brief" data-in="brief" placeholder="A modern two-piece suit with a slightly relaxed fit, wide-leg trousers, a double-breasted jacket with six dark buttons and an African-inspired geometric lining.">${esc(st.brief)}</textarea>
    </label>
    <div class="spread">
      <span class="faint" style="font-size:12.5px">Interpreter: <b>${provider}</b>${AI.available()?' · uses your Claude usage; your measurements are not sent':''}</span>
      <div class="row tight">${st.aiBusy ? `<button class="btn sm" data-a="aiStop">Stop</button><span class="chip accent">Thinking…</span>` : `<button class="btn sm accent" data-a="interpret" ${st.brief.trim().length<4?'disabled':''}>${ic('spark')}Interpret brief</button>`}</div>
    </div>
    ${pr ? proposalHTML(pr, spec) : ''}
    <hr class="rule">
    <div class="ctl"><span class="lbl">References</span>
      <p class="faint" style="font-size:13px">Inspiration images guide style. Technical photos (front, back, side) help a tailor reconstruct a garment, but one photo cannot give exact sewing measurements. References stay in this session and are not saved.</p>
      ${S.refs.length ? `<div class="refs">${S.refs.map(r=>`<div class="ref"><img src="${r.url}" alt="Reference"><button data-a="refRemove" data-id="${r.id}" aria-label="Remove reference">×</button><select data-ch="refRole" data-id="${r.id}" aria-label="Reference type">${['inspiration','technical front','technical back','technical side','fabric'].map(x=>`<option ${r.role===x?'selected':''}>${x}</option>`).join('')}</select></div>`).join('')}</div>`:''}
      <label class="drop">${ic('plus','style="width:18px;height:18px;vertical-align:-4px"')} Add images<input type="file" accept="image/*" multiple class="visually-hidden" data-ch="refAdd"></label>
      ${S.refs.length ? `<div class="row tight"><button class="btn sm" data-a="refAnalyze" ${Caps.sampleImages&&!st.aiBusy?'':'disabled'}>${ic('spark')}Read references with Claude</button>${Caps.sampleImages?'':'<span class="faint" style="font-size:12.5px">Image reading needs Claude with image access in this view.</span>'}</div>`:''}
    </div>
  </div>`;
}
function proposalHTML(pr, spec){
  const keys = Object.keys(pr.fields);
  const show = (k,v) => { if (/color/i.test(k)) return `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${v};vertical-align:-2px;border:1px solid var(--line-2)"></span> ${v}`; if (k==='category') return CAT[v]?.label||v; if (k==='fabric') return FABRICS[v]?.name||v; return esc(optLabel(v)); };
  return `<div class="panel flat stack s" style="padding:14px;border:1px solid var(--accent-line)">
    <div class="spread"><b>Interpreted specification</b><span class="chip ${pr.provider==='claude'?'accent':''}">${pr.provider==='claude'?'Claude':'Keyword rules'}</span></div>
    ${pr.fallbackReason ? `<div class="note warn" style="font-size:12.5px">${esc(pr.fallbackReason)}, so the local keyword interpreter was used. Check the result carefully.</div>`:''}
    ${keys.length ? `<p class="faint" style="font-size:12.5px">Untick anything that was misread, then apply.</p><div class="diff">${keys.map(k=>`<label><input type="checkbox" data-ch="propSel" data-k="${k}" ${pr.sel[k]?'checked':''}><span style="flex:1"><span class="faint">${k.replace(/([A-Z])/g,' $1').toLowerCase()}</span></span><b>${show(k, pr.fields[k])}</b>${spec[k]===pr.fields[k]?'<small class="faint">same</small>':''}</label>`).join('')}</div>` : '<p class="muted">Nothing specific could be read from the brief.</p>'}
    ${pr.notes?.length ? `<div class="note" style="font-size:12.5px">${pr.notes.map(esc).join('<br>')}</div>`:''}
    ${pr.questions?.length ? `<div class="note info" style="font-size:12.5px"><b>To confirm:</b><br>${pr.questions.map(esc).join('<br>')}</div>`:''}
    ${pr.rejected?.length ? `<p class="faint" style="font-size:12px">Ignored values that are not supported: ${pr.rejected.map(esc).join(', ')}</p>`:''}
    <div class="row tight"><button class="btn sm primary" data-a="applyProposal" ${keys.length?'':'disabled'}>Apply selected</button><button class="btn sm ghost" data-a="dismissProposal">Dismiss</button></div>
  </div>`;
}
function studioStyle(st, spec){
  const t = spec.template, top = !['bottom','skirt'].includes(t), bottoms = ['bottom','suit'].includes(t);
  let h = `<div class="stack">`;
  h += optRow('length', LENGTHS_FOR[t]||OPTIONS.length, spec.length, t==='suit'?'Jacket length':'Length');
  if (top){
    h += optRow('sleeve', t==='robe'?['short','three-quarter','long','wide']:['none','cap','short','elbow','three-quarter','long'], spec.sleeve, 'Sleeves');
    h += optRow('collar', COLLARS_FOR[t]||OPTIONS.collar, spec.collar, 'Collar and neckline');
    h += optRow('closure', t==='robe'?['pullover','buttons','zip']:['pullover','buttons','double-breasted','zip','wrap'].filter(x=>!(t==='tee'&&x==='double-breasted')), spec.closure, 'Closure');
    if (spec.closure==='buttons'||spec.closure==='double-breasted') h += `<div class="ctl"><span class="lbl">Buttons <span class="num" style="text-transform:none">${spec.buttons}</span></span><input type="range" min="1" max="${spec.closure==='double-breasted'?8:12}" step="${spec.closure==='double-breasted'?2:1}" value="${spec.buttons}" id="st-buttons" data-in="specNum" data-k="buttons" aria-label="Number of buttons"><div class="swatches">${['#151515','#2B2A28','#EFE8D8','#B48A5A','#C9A227','#6A4A33'].map(c=>`<button class="sw" style="background:${c}" data-a="spec" data-k="buttonColor" data-v="${c}" aria-pressed="${spec.buttonColor===c}" aria-label="Button colour ${c}"></button>`).join('')}</div></div>`;
    if (spec.sleeve==='long') h += optRow('cuffs', ['none','barrel','french','ribbed'], spec.cuffs, 'Cuffs');
    h += optRow('pockets', t==='hoodie'?['none','kangaroo']:['none','chest','patch','flap','welt'], spec.pockets, 'Pockets');
  }
  if (t==='dress' || t==='skirt') h += optRow('skirtShape', OPTIONS.skirtShape, spec.skirtShape, 'Skirt shape');
  if (t==='skirt') h += optRow('closure', ['zip','wrap','none'], spec.closure, 'Closure');
  if (bottoms || t==='skirt'){
    if (bottoms) h += optRow('legShape', OPTIONS.legShape, spec.legShape, 'Leg shape');
    h += optRow('waistband', OPTIONS.waistband, spec.waistband, 'Waistband');
    if (bottoms) h += optRow('pleats', OPTIONS.pleats.filter(x=>x!=='box'), spec.pleats, 'Pleats');
    if (t==='bottom') h += optRow('pockets', ['none','side-seam','five-pocket'], spec.pockets, 'Pockets');
    if (t==='bottom') h += optRow('cuffs', ['none','turn-up'], spec.cuffs, 'Hem finish');
  }
  h += `<details ${S.settings.technical?'open':''}><summary style="cursor:pointer;font-weight:600;font-size:14px">Construction details</summary><div class="stack" style="margin-top:12px">`;
  h += optRow('seams', OPTIONS.seams, spec.seams, 'Seams');
  h += optRow('topstitch', OPTIONS.topstitch, spec.topstitch, 'Topstitching');
  h += optRow('embroidery', OPTIONS.embroidery, spec.embroidery, 'Embroidery');
  h += optRow('trims', OPTIONS.trims, spec.trims, 'Trims');
  h += `<label class="field">Notes for the tailor<textarea id="st-notes" data-in="specText" data-k="notes" style="min-height:70px">${esc(spec.notes)}</textarea></label>`;
  h += `</div></details></div>`;
  return h;
}
function studioFabric(st, spec){
  const f = FABRICS[spec.fabric];
  const lined = ['jacket','suit','dress','skirt'].includes(spec.template);
  const fp = spec.fabricProduct;
  return `<div class="stack">
    ${fp ? `<div class="tailor-box" style="flex-direction:row;align-items:center;gap:12px"><div style="width:64px;height:80px;flex:none;background:var(--surface-2);overflow:hidden">${fp.image?`<img src="${fp.image}" alt="" style="width:100%;height:100%;object-fit:cover">`:''}</div><div class="stack s" style="flex:1;min-width:0"><span class="kicker">IZELIA fabric</span><b>${esc(fp.name)}</b><span class="faint" style="font-size:12.5px">${priceFmt(fp.price, fp.currency)} per item as listed${fp.image?' · photo used as preview texture':' · no photo yet'}</span><div class="row tight"><button class="btn sm" data-a="openProduct" data-id="${fp.id}">View in shop</button><button class="btn sm" data-a="goShop" data-r="shop" data-c="fabrics">Change</button><button class="btn sm ghost" data-a="clearFabricProduct">Remove</button></div></div></div>
      <p class="faint" style="font-size:12.5px">IZELIA hasn’t published this fabric’s fibre, weight or width, so drape and estimates use a generic woven cotton profile.</p>` : `<button class="btn sm" style="align-self:flex-start" data-a="goShop" data-r="shop" data-c="fabrics">Choose an IZELIA fabric</button>`}
    <div class="ctl"><span class="lbl">${fp?'Fabric behaviour':'Fabric'}</span><div class="opts">${Object.entries(FABRICS).filter(([k])=>k!=='lining' && (k!=='izelia' || fp)).map(([k,v])=>`<button class="opt" data-a="spec" data-k="fabric" data-v="${k}" aria-pressed="${spec.fabric===k}">${v.name}</button>`).join('')}</div>
      <span class="faint" style="font-size:12.5px">${f.name}: ${f.gsm} g/m², typically ${Units.show(f.w,0)} wide${f.stretch?`, ${f.stretch}% stretch`:''}${f.nap?', has a nap (one-way cutting)':''}${f.piece?`, usually sold as a ${f.piece}`:''}.</span></div>
    <div class="ctl"><span class="lbl">Colour</span><div class="swatches">${PALETTE.map(c=>`<button class="sw" style="background:${c.h}" data-a="spec" data-k="color" data-v="${c.h}" aria-pressed="${spec.color.toUpperCase()===c.h.toUpperCase()}" aria-label="${c.n}" title="${c.n}"></button>`).join('')}<label class="sw" style="background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);position:relative" title="Custom colour"><input type="color" id="st-color" value="${spec.color}" data-in="specColor" data-k="color" style="opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer" aria-label="Custom colour"></label></div></div>
    ${optRow('print', OPTIONS.print, spec.print, 'Print')}
    ${spec.print!=='solid' ? `<div class="ctl"><span class="lbl">Print colour</span><div class="swatches">${PALETTE.map(c=>`<button class="sw" style="background:${c.h}" data-a="spec" data-k="printColor" data-v="${c.h}" aria-pressed="${(spec.printColor||'').toUpperCase()===c.h.toUpperCase()}" aria-label="${c.n}"></button>`).join('')}</div>${DIRECTIONAL_PRINTS.includes(spec.print)?'<span class="faint" style="font-size:12.5px">Directional print: pieces are cut one way and matched, which uses more fabric.</span>':''}</div>`:''}
    ${lined ? optRow('lining', OPTIONS.lining, spec.lining, 'Lining') : ''}
    ${lined && spec.lining!=='none' ? `<div class="ctl"><span class="lbl">Lining colour and print</span><div class="swatches">${PALETTE.slice(0,15).map(c=>`<button class="sw" style="background:${c.h}" data-a="spec" data-k="liningColor" data-v="${c.h}" aria-pressed="${spec.liningColor===c.h}" aria-label="${c.n}"></button>`).join('')}</div><div class="opts">${['solid','geometric','wax','gara','stripe'].map(v=>`<button class="opt" data-a="spec" data-k="liningPrint" data-v="${v}" aria-pressed="${spec.liningPrint===v}">${PRINTS[v]}</button>`).join('')}</div>
      <div style="height:54px;border-radius:8px;border:1px solid var(--line);overflow:hidden">${`<svg viewBox="0 0 200 40" preserveAspectRatio="none" width="100%" height="100%"><defs>${printPattern('lnp', spec.liningPrint, spec.liningColor, '#151515')}</defs><rect width="200" height="40" fill="${spec.liningPrint==='solid'?spec.liningColor:'url(#lnp)'}"/></svg>`}</div></div>` : ''}
  </div>`;
}
function fitTable(fit){
  const st = s => ({ok:'<span class="chip ok">Good</span>', snug:'<span class="chip warn">Snug</span>', tight:'<span class="chip bad">Tight</span>', loose:'<span class="chip accent">Loose</span>', unknown:'<span class="chip">—</span>'})[s];
  return `<div class="scroll-x"><table class="data"><thead><tr><th>Zone</th><th class="num">Body</th><th class="num">Garment</th><th class="num">Ease</th><th></th></tr></thead><tbody>
    ${fit.zones.map(z=>`<tr><td>${optLabel(z.k)}</td><td class="num mono">${Units.show(z.body)}</td><td class="num mono">${Units.show(z.garment)}</td><td class="num mono">${z.ease==null?'—':(z.ease>=0?'+':'')+Units.show(z.ease)}</td><td>${st(z.status)}</td></tr>`).join('')}
    ${fit.lengths.map(l=>`<tr><td>${l.k}</td><td class="num mono">${Units.show(l.body)}</td><td class="num mono">${Units.show(l.garment)}</td><td class="num mono">${(l.diff>=0?'+':'')+Units.show(l.diff)}</td><td>${l.status==='ok'?st('ok'):`<span class="chip warn">${optLabel(l.status)}</span>`}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function studioFit(st, spec, prof, item){
  const fit = item.fit;
  const list = profiles();
  return `<div class="stack">
    <label class="field">Fit to<select id="st-prof" data-ch="stProfile">${list.map(p=>`<option value="${p.id}" ${p.id===prof.id?'selected':''}>${esc(p.name)}</option>`).join('')}<option value="ref" ${prof.ref?'selected':''}>Reference body (size M)</option></select></label>
    ${prof.ref ? `<div class="note warn">This is a standard size M body, not you. <button class="btn sm" data-a="newProfile" style="margin-top:6px">Add your measurements</button></div>`:''}
    ${optRow('fit', OPTIONS.fit, spec.fit, 'Fit')}
    ${spec.fit==='custom' ? ['chest','waist','hip'].map(z=>`<div class="ctl"><span class="lbl">${z} ease <span class="num" style="text-transform:none">+${Units.show(spec.customEase[z])}</span></span><input type="range" min="0" max="60" step="1" value="${spec.customEase[z]}" id="st-ease-${z}" data-in="easeNum" data-k="${z}" aria-label="${z} ease"></div>`).join('') : `<p class="faint" style="font-size:12.5px">Ease is the room between body and garment. ${optLabel(spec.fit)} adds ${targetEase(spec).map(v=>Units.show(v,0)).join(' / ')} at chest / waist / hip.</p>`}
    ${fitTable(fit)}
    ${fit.missing.length ? `<div class="note warn"><b>Estimated:</b> ${fit.missing.map(k=>MBYK[k].label.toLowerCase()).join(', ')} ${fit.missing.length>1?'are':'is'} missing from ${esc(prof.name)}, so ${fit.missing.length>1?'they were':'it was'} estimated from height. <button class="btn sm" data-a="go" data-r="body" style="margin-top:6px">Add measurements</button></div>`:''}
    <div class="spread"><span style="font-weight:600;font-size:14px">Fit map on the avatar</span><button class="btn sm ${S.viewer.fitMap?'primary':''}" data-a="vtool" data-t="fitMap">${S.viewer.fitMap?'On':'Off'}</button></div>
    ${fitLegend()}
    <div class="note">This is a made-to-measure estimate: garment size = your body + ease, drawn on a parametric avatar. It is not a cloth simulation and cannot promise comfort or final fit.</div>
  </div>`;
}
function studioVersions(st, spec, prof, item, design){
  if (!design) return `<div class="empty"><p>Save the design to start its version history.</p><button class="btn sm primary" data-a="saveDesign">Save design</button></div>`;
  return `<div class="stack">
    <label class="field">Note for the next version<input type="text" id="st-vnote" placeholder="e.g. Shorter sleeves" value="${esc(st.vnote||'')}" data-in="vnote"></label>
    <div class="row tight"><button class="btn sm primary" data-a="saveDesign" ${studioDirty()?'':'disabled'}>Save as version ${design.versions.length+1}</button><button class="btn sm" data-a="dupDesign" data-id="${design.id}">Duplicate design</button></div>
    <div class="list">${[...design.versions].map((v,i)=>({v,i})).reverse().map(({v,i})=>`<div class="li"><div class="thumb">${flatSVG(v.spec,'front')}</div><div class="grow"><b>Version ${i+1}${i===design.versions.length-1?' · latest':''}</b><small>${esc(v.note||'')} · ${fmtAgo(v.at)}</small></div><div class="row tight"><button class="btn sm ${st.compareV===i?'primary':''}" data-a="compareVersion" data-i="${i}" aria-pressed="${st.compareV===i}">${st.compareV===i?'Comparing':'Compare'}</button><button class="btn sm" data-a="restoreVersion" data-i="${i}">Restore</button></div></div>`).join('')}</div>
    ${st.compareV!=null?`<button class="btn sm" data-a="compareVersion" data-i="-1">Stop comparing</button>`:''}
    <p class="faint" style="font-size:12.5px">Restoring loads that version into the editor. Nothing is deleted; saving again creates a new version.</p>
  </div>`;
}
function studioMake(st, spec, prof, item, design){
  const F = !prof.ref ? finishedMeasurements(prof, spec, bodyGeom(prof)) : null;
  const shared = design && Object.values(Store.myShares.items||{}).find(s=>s.designId===design.id);
  return `<div class="stack">
    <p class="muted" style="font-size:14px">Turn this design into a cutting and sewing plan for <b>${esc(prof.name)}</b>. ${prof.ref?'Using the reference body gives generic size M results.':''}</p>
    <div class="stack s">
      ${[['materials','Calculate materials','Fabric, lining, interfacing and notions with cost'],['pattern','Sewing pattern','Draft pattern pieces sized to the profile'],['layout','Cutting layout','Pieces placed on your fabric width'],['steps','Sewing instructions','Steps written for this design'],['sheet','Technical sheet','Flats, specs, measurements and materials']].map(([k,l,d])=>`<button class="pitem" data-a="toWorkshop" data-t="${k}"><span class="dot" style="background:var(--surface-2);color:var(--ink)">${ic(k==='materials'?'tape':k==='steps'?'designs':k==='sheet'?'designs':'workshop','style="width:16px;height:16px"')}</span><span style="flex:1"><b>${l}</b><small>${d}</small></span></button>`).join('')}
    </div>
    ${S.settings.technical && F ? `<div class="stack s"><span class="eyebrow">Finished measurements</span><dl class="kv"><dt>Chest</dt><dd class="mono">${Units.show(F.chest)}</dd><dt>Waist</dt><dd class="mono">${Units.show(F.waist)}</dd><dt>Hip</dt><dd class="mono">${Units.show(F.hip)}</dd>${['bottom','skirt'].includes(spec.template)?'':`<dt>Length</dt><dd class="mono">${Units.show(F.length)}</dd>`}${F.sleeve?`<dt>Sleeve</dt><dd class="mono">${Units.show(F.sleeve)}</dd>`:''}</dl></div>`:''}
    <hr class="rule">
    <div class="row">
      <button class="btn primary" data-a="shareDesign" ${prof.ref?'disabled':''}>${shared?'Update project with tailor':'Send to a tailor'}</button>
      <button class="btn" data-a="saveTemplate">Save as template</button>
    </div>
    ${shared ? `<p class="faint" style="font-size:13px">Shared ${fmtAgo(shared.createdAt)} · status: <b>${esc(shared.status)}</b>${shared.patternValidated?' · pattern validated by tailor':''}</p>`:''}
    ${prof.ref ? '<p class="faint" style="font-size:12.5px">Choose your own profile in the Fit tab before sending to a tailor.</p>':''}
  </div>`;
}
