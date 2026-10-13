/* ================= VIEWS: designs, projects, tailor studio, notifications, settings ================= */
function viewDesigns(){
  S.vcfg = null;
  const ds = designs();
  const mine = ds.filter(d=>!d.template), tpl = ds.filter(d=>d.template);
  const card = d => { const p = Store.private.profiles[d.profileId]; const lvl = designLevel(d, p); return `
    <div class="panel stack s" style="padding:14px">
      <div style="aspect-ratio:1/1;background:var(--surface-2);border-radius:10px;display:grid;place-items:center;max-width:100%">${flatSVG(d.spec,'front')}</div>
      <div class="spread"><b style="font-size:15px">${esc(d.name)}</b>${d.favourite?`<span style="color:var(--bad)">${ic('heart','fill="currentColor" style="width:16px;height:16px"')}</span>`:''}</div>
      <span class="faint" style="font-size:12.5px">${esc(CAT[d.spec.category]?.label||'')} · ${esc(p?.name||'no profile')} · v${d.versions.length} · ${fmtAgo(d.updatedAt)}</span>
      <div class="row tight">${d.sample?'<span class="chip demo">Sample</span>':''}<span class="chip ${lvl.cur>=2?'ok':''}">${lvl.levels[lvl.cur].label}</span>${d.needsRecalc?'<span class="chip warn">Measurements changed</span>':''}</div>
      <div class="row tight"><button class="btn sm primary" data-a="openDesign" data-id="${d.id}">Open</button><button class="btn sm" data-a="favDesign" data-id="${d.id}">${d.favourite?'Unfavourite':'Favourite'}</button><button class="btn sm" data-a="renameDesign" data-id="${d.id}">Rename</button><button class="btn sm" data-a="dupDesign" data-id="${d.id}">Duplicate</button><button class="btn sm danger" data-a="deleteDesign" data-id="${d.id}">Delete</button></div>
    </div>`; };
  return `<div class="page-head"><div><h1>My Designs</h1><p>Drafts, saved versions, favourites and reusable templates. Each design remembers which body it was fitted to.</p></div><button class="btn primary" data-a="newDesign">${ic('plus')}New design</button></div>
  ${mine.length ? `<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${mine.map(card).join('')}</div>` : `<div class="empty"><h3>No designs yet</h3><p>Describe a garment in your own words and the studio turns it into a structured design fitted to your body.</p><button class="btn" data-a="newDesign">Start designing</button></div>`}
  ${tpl.length ? `<section class="section"><div class="section-head"><h2>Templates</h2></div><div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${tpl.map(card).join('')}</div></section>`:''}`;
}

/* ---------- projects & orders (customer side) ---------- */
function statusTimeline(status){
  const i = ORDER_STATUSES.indexOf(status);
  return `<div class="timeline" aria-label="Status ${esc(status)}">${ORDER_STATUSES.map((s,j)=>`<span class="${j<i?'on':j===i?'now':''}" title="${esc(s)}"></span>`).join('')}</div>`;
}
function commentsHTML(items, me){
  return `<div class="comments">${(items||[]).map(c=>`<div class="cmt ${c.by===me?'mine':''}"><small>${c.by==='tailor'?'Tailor':'Customer'} · ${fmtAgo(c.at)}</small>${esc(c.text)}</div>`).join('') || '<p class="faint" style="font-size:13px">No messages yet.</p>'}</div>`;
}
function viewProjects(){
  S.vcfg = null;
  const items = Object.values(Store.myShares.items||{}).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  return `<div class="page-head"><div><h1>Projects & Orders</h1><p>Designs you shared with a tailor, with their production status and messages.</p></div></div>
  <div class="note info" style="margin-bottom:16px">${Store.mode==='cloud' ? 'Shared projects are visible to you and to the tailors who manage this IZELIA site (its Editors). Only what you chose to include is shared.' : 'Device-only mode: projects are kept in this browser. Sharing with a tailor needs the online version.'}</div>
  ${items.length ? `<div class="stack">${items.map(s=>`
    <section class="panel stack">
      <div class="spread"><div class="row"><div class="thumb" style="width:64px;height:64px;background:var(--surface-2);border-radius:8px;display:grid;place-items:center">${flatSVG(s.spec,'front')}</div><div><h3 style="font-size:17px">${esc(s.designName)}</h3><span class="faint" style="font-size:12.5px">Version ${s.designVersion} · shared ${fmtDate(s.createdAt)} · ${Object.keys(s.measurements||{}).length} measurements shared</span></div></div>
        <div class="row tight">${s.sample?'<span class="chip demo">Sample</span>':''}<span class="chip accent">${esc(s.status)}</span>${s.patternValidated?'<span class="chip ok">Pattern validated</span>':''}</div></div>
      ${statusTimeline(s.status)}
      ${commentsHTML(s.comments, 'customer')}
      <div class="row"><input type="text" id="pc-${s.id}" placeholder="Message the tailor" style="flex:1;min-width:180px"><button class="btn sm" data-a="projComment" data-id="${s.id}">Send</button></div>
      <div class="row tight">
        ${s.status==='Awaiting customer approval' ? `<button class="btn sm primary" data-a="projApprove" data-id="${s.id}">Approve design</button><button class="btn sm" data-a="projRevise" data-id="${s.id}">Request changes</button>`:''}
        ${s.status==='Awaiting measurements' ? `<button class="btn sm" data-a="projResend" data-id="${s.id}">Send updated measurements</button>`:''}
        <button class="btn sm" data-a="openDesign" data-id="${s.designId}">Open design</button>
        <button class="btn sm danger" data-a="projWithdraw" data-id="${s.id}">Stop sharing</button>
      </div>
    </section>`).join('')}</div>` : `<div class="empty"><h3>No projects yet</h3><p>Open a design, go to “Make it” and choose “Send to a tailor”.</p><button class="btn" data-a="go" data-r="designs">My designs</button></div>`}`;
}
function shareModal(){
  const st = S.studio, d = Store.private.designs[st.designId], p = Store.private.profiles[d.profileId] || studioProfile();
  const req = REQ[d.spec.template]||[];
  const avail = req.filter(k=>p.m?.[k]!=null);
  const existing = Object.values(Store.myShares.items||{}).find(s=>s.designId===d.id);
  return `<div class="modal" role="dialog" aria-modal="true" aria-label="Send to a tailor">
    <h2>${existing?'Update project':'Send to a tailor'}</h2>
    <p class="muted">Choose exactly what the tailor can see. The design itself is always included.</p>
    <div class="stack s">
      <label class="check"><input type="checkbox" checked disabled><span><b>Design “${esc(d.name)}”</b>, version ${d.versions.length}: style, fabric and construction choices.</span></label>
      <label class="check"><input type="checkbox" id="sh-name" checked><span>Profile name (“${esc(p.name)}”)</span></label>
      <span class="eyebrow" style="margin-top:6px">Measurements this garment needs</span>
      <div class="form-grid">${avail.map(k=>`<label class="check"><input type="checkbox" class="sh-m" data-k="${k}" checked><span>${MBYK[k].label} <span class="faint mono">${Units.show(p.m[k])}</span></span></label>`).join('')}</div>
      ${req.length>avail.length?`<p class="faint" style="font-size:12.5px">Not saved, so not shared: ${req.filter(k=>!avail.includes(k)).map(k=>MBYK[k].label.toLowerCase()).join(', ')}.</p>`:''}
      <label class="field">Message<textarea id="sh-msg" placeholder="Event date, fabric you already have, budget…">${esc(existing?.message||'')}</textarea></label>
    </div>
    <div class="note">${Store.mode==='cloud'?'Visible to you and to this page’s tailors (its Editors). You can stop sharing at any time.':'Device-only mode: the project stays in this browser.'} Your other measurements, profiles and designs are not shared.</div>
    <div class="row"><button class="btn primary" data-a="shareConfirm">${existing?'Update project':'Share with tailor'}</button><button class="btn ghost" data-a="closeModal">Cancel</button></div>
  </div>`;
}

/* ---------- tailor studio ---------- */
function viewTailor(){
  S.vcfg = null;
  if (!Store.canPublish()) return `<div class="empty"><h3>Tailor Studio is for tailors and designers</h3><p>${Store.mode==='cloud'?'Ask the owner of this IZELIA site for Editor access.':'Switch the demo role to Tailor in Settings to explore it on this device.'}</p></div>`;
  const tab = S.tailorTab || 'overview';
  const shares = tailorShares();
  const tabs = [['overview','Overview'],['projects',`Client projects (${shares.length})`],['library','Garment library'],['clients','Clients'],['admin','Administration']];
  const body = {overview:tailorOverview, projects:tailorProjects, library:tailorLibrary, clients:tailorClients, admin:tailorAdmin}[tab](shares);
  return `<div class="page-head"><div><h1>Tailor Studio</h1><p>Manage the shared garment library and the projects customers send you.</p></div>${Store.mode==='local'?`<span class="chip demo">Demo role: ${esc(S.settings.demoRole)}</span>`:''}</div>
  <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" data-a="tailorTab" data-t="${k}">${l}</button>`).join('')}</div>${body}`;
}
function tailorShares(){
  const out = [];
  for (const [owner, doc] of Object.entries(Store.allShares||{})) for (const it of Object.values(doc?.items||{})) out.push({owner, ...it});
  return out.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
}
function tailorOverview(shares){
  const gs = garmentsLib();
  const by = s => shares.filter(x=>x.status===s).length;
  const issues = gs.filter(g=>g.processing && g.processing.missing && g.processing.missing.length);
  return `<div class="stats" style="margin-bottom:16px">
    <div class="stat"><b>${shares.length}</b><span>Client projects</span></div>
    <div class="stat"><b>${shares.filter(s=>!['Completed','Delivered'].includes(s.status)).length}</b><span>Open projects</span></div>
    <div class="stat"><b>${gs.filter(g=>g.status==='published').length}</b><span>Published garments</span></div>
    <div class="stat"><b>${gs.filter(g=>g.status==='draft').length}</b><span>Drafts</span></div>
    <div class="stat"><b>${issues.length}</b><span>Garments with missing data</span></div>
  </div>
  <div class="two">
    <section class="panel"><div class="section-head"><h2>Recent activity</h2></div>${shares.length?`<div class="list">${shares.slice(0,6).map(s=>`<div class="li"><div class="thumb">${flatSVG(s.spec,'front')}</div><div class="grow"><b>${esc(s.designName)}</b><small>${esc(s.status)} · ${fmtAgo(s.updatedAt)}</small></div><button class="btn sm" data-a="tailorOpenProject" data-o="${s.owner}" data-id="${s.id}">Open</button></div>`).join('')}</div>`:'<p class="muted">No customer has shared a project yet.</p>'}</section>
    <section class="panel"><div class="section-head"><h2>Pipeline</h2></div><div class="stack s">${ORDER_STATUSES.map(s=>`<div class="spread"><span style="font-size:14px">${s}</span><span class="num">${by(s)}</span></div>`).join('')}</div></section>
  </div>`;
}
function tailorProjects(shares){
  if (!shares.length) return `<div class="empty"><h3>No client projects</h3><p>When a customer sends a design to a tailor it appears here with the measurements they chose to share.</p></div>`;
  const openKey = S.tailorOpen;
  return `<div class="stack">${shares.map(s=>{ const key = s.owner+'|'+s.id; const open = key===openKey; const nm = S.names?.[s.owner]?.name || (s.profileName ? s.profileName : 'Customer');
    return `<section class="panel stack">
      <div class="spread"><div class="row"><div class="thumb" style="width:56px;height:56px;background:var(--surface-2);border-radius:8px;display:grid;place-items:center">${flatSVG(s.spec,'front')}</div><div><h3>${esc(s.designName)}</h3><span class="faint" style="font-size:12.5px">${esc(nm)} · v${s.designVersion} · ${fmtAgo(s.updatedAt)}</span></div></div>
      <div class="row tight">${s.sample?'<span class="chip demo">Sample</span>':''}${s.customerApproved?'<span class="chip ok">Customer approved</span>':''}${s.changesRequested?'<span class="chip warn">Changes requested</span>':''}<span class="chip accent">${esc(s.status)}</span><button class="btn sm" data-a="tailorOpenProject" data-o="${s.owner}" data-id="${s.id}">${open?'Close':'Open'}</button></div></div>
      ${open ? `
        <div class="two">
          <div class="stack s"><div class="flats" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${['front','back'].map(v=>`<div style="background:var(--surface-2);border-radius:8px;padding:8px">${flatSVG(s.spec,v)}</div>`).join('')}</div>
            <dl class="spec-list">${['fit','length','sleeve','collar','closure','pockets','fabric','print','lining'].map(k=>`<dt>${optLabel(k)}</dt><dd>${k==='fabric'?esc(FABRICS[s.spec.fabric]?.name):esc(optLabel(s.spec[k]))}</dd>`).join('')}</dl>
            ${s.spec.notes?`<p class="note">${esc(s.spec.notes)}</p>`:''}${s.message?`<p class="note info"><b>Customer note:</b> ${esc(s.message)}</p>`:''}</div>
          <div class="stack s"><span class="eyebrow">Shared measurements</span>
            ${Object.keys(s.measurements||{}).length ? `<table class="data"><tbody>${Object.entries(s.measurements).map(([k,v])=>`<tr><td>${MBYK[k]?.label||k}</td><td class="num mono">${Units.show(v)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No measurements shared.</p>'}
            <label class="field">Status<select id="tp-status" data-ch="tailorStatus" data-o="${s.owner}" data-id="${s.id}">${ORDER_STATUSES.map(x=>`<option ${x===s.status?'selected':''}>${x}</option>`).join('')}</select></label>
            <div class="row tight"><button class="btn sm" data-a="tailorWorkshop" data-o="${s.owner}" data-id="${s.id}">Open in workshop</button></div>
            <label class="check"><input type="checkbox" id="tp-val" ${s.patternValidated?'checked':''} data-ch="tailorValidate" data-o="${s.owner}" data-id="${s.id}"><span><b>Pattern validated for version ${s.designVersion}.</b> I checked the measurements, pattern geometry and construction for production.</span></label>
          </div>
        </div>
        ${commentsHTML(s.comments,'tailor')}
        <div class="row"><input type="text" id="tc-${s.id}" placeholder="Reply to the customer" style="flex:1;min-width:180px"><button class="btn sm" data-a="tailorComment" data-o="${s.owner}" data-id="${s.id}">Send</button></div>` : ''}
    </section>`; }).join('')}</div>`;
}
function tailorLibrary(){
  const f = S.libFilter || 'all';
  const gs = garmentsLib().filter(g => f==='all' || g.status===f);
  return `<div class="spread" style="margin-bottom:12px"><div class="seg">${['all','published','draft','archived'].map(x=>`<button data-a="libFilter" data-v="${x}" aria-pressed="${f===x}">${optLabel(x)}</button>`).join('')}</div><button class="btn primary" data-a="tailorNewGarment">${ic('plus')}New garment</button></div>
  <div class="panel scroll-x" style="padding:0"><table class="data"><thead><tr><th>Garment</th><th>Category</th><th>Status</th><th class="num">Version</th><th>Fit modes</th><th>Updated</th><th></th></tr></thead><tbody>
  ${gs.map(g=>`<tr><td><div class="row tight" style="flex-wrap:nowrap"><div style="width:38px;height:38px;flex:none">${flatSVG(g.spec,'front')}</div><b>${esc(g.name)}</b>${g.demo?'<span class="chip demo">Starter</span>':''}</div></td><td>${esc(CAT[g.category]?.label||g.category)}</td><td><span class="chip ${g.status==='published'?'ok':g.status==='draft'?'warn':''}">${esc(g.status)}</span></td><td class="num mono">${g.version}</td><td>${(g.fitModes||[]).map(m=>`<span class="chip">${m}</span>`).join(' ')}${g.processing?.missing?.length?` <span class="chip warn" title="${esc(g.processing.missing.join(', '))}">${g.processing.missing.length} missing</span>`:''}</td><td>${fmtAgo(g.updatedAt)}</td><td><div class="row tight" style="flex-wrap:nowrap"><button class="btn sm" data-a="tailorEditGarment" data-id="${g.id}">Edit</button>${g.status==='published'?`<button class="btn sm" data-a="garmentStatus" data-id="${g.id}" data-v="archived">Archive</button>`:`<button class="btn sm" data-a="garmentStatus" data-id="${g.id}" data-v="published">Publish</button>`}</div></td></tr>`).join('')}
  </tbody></table>${gs.length?'':'<div class="empty" style="margin:16px">Nothing here.</div>'}</div>`;
}
function tailorClients(){
  const cs = profiles().filter(p=>p.kind==='client');
  return `<div class="spread" style="margin-bottom:12px"><p class="muted" style="max-width:60ch">Client profiles you record yourself, with the client’s consent. They are stored in your private space. Customers who use the studio themselves share measurements through projects instead.</p><button class="btn primary" data-a="newClient">${ic('plus')}New client profile</button></div>
  ${cs.length?`<div class="plist">${cs.map(p=>`<div class="pitem"><span class="dot">${initials(p.name)}</span><span style="flex:1"><b>${esc(p.name)}</b><small>${Math.round(completeness(p).pct*100)}% complete · ${p.consent?'consent recorded':'<span style="color:var(--bad)">no consent recorded</span>'} · updated ${fmtAgo(p.updatedAt)}</small></span><button class="btn sm" data-a="editProfileGo" data-id="${p.id}">Measurements</button><button class="btn sm" data-a="designForClient" data-id="${p.id}">New design</button></div>`).join('')}</div>`:'<div class="empty"><p>No client profiles yet.</p></div>'}`;
}
function tailorAdmin(){
  const gs = garmentsLib();
  const fails = gs.filter(g=>g.processing && (g.processing.missing||[]).length);
  return `<div class="two" style="align-items:start">
    <section class="panel stack"><h2>Access and roles</h2>
      ${Store.mode==='cloud' ? `<p class="muted" style="font-size:14px">Roles come from this page’s share settings in Claude, and the database enforces them. <b>Editors</b> act as tailors: they publish garments and see shared client projects. <b>Contributors</b> are customers: they keep private profiles and designs and can share projects. Viewers can browse only.</p><p class="faint" style="font-size:13px">You are ${Store.role.owner?'the owner':Store.role.editor?'an Editor':'a customer'} of this page.</p>`
        : `<p class="muted" style="font-size:14px">Device-only demo. Roles are simulated with the demo role switch in Settings and are not enforced by a server.</p>`}
    </section>
    <section class="panel stack"><h2>Library tools</h2>
      <p class="muted" style="font-size:14px">The starter collection adds ${makeSeedGarments().length} garments marked as starter items. Existing garments with the same id are not overwritten.</p>
      <div class="row"><button class="btn" data-a="importStarter">Import starter collection</button></div>
    </section>
    <section class="panel stack"><h2>Processing issues</h2>${fails.length?`<div class="list">${fails.map(g=>`<div class="li"><div class="grow"><b>${esc(g.name)}</b><small>${esc(g.processing.missing.join('; '))}</small></div><button class="btn sm" data-a="tailorEditGarment" data-id="${g.id}">Fix</button></div>`).join('')}</div>`:'<p class="muted">No garments are missing data.</p>'}</section>
  </div>`;
}

/* ---------- garment editor (tailor) ---------- */
function viewGarmentEdit(){
  const ge = S.gedit;
  if (!ge){ S.vcfg=null; return `<div class="empty"><h3>No garment open</h3><button class="btn" data-a="go" data-r="tailor">Tailor Studio</button></div>`; }
  const g = ge.g, spec = g.spec;
  const p = activeProfile() || REF_PROFILE;
  const sizes = g.sizes || {};
  const sizeKeys = Object.keys(sizes);
  const zoneKeys = [...new Set(sizeKeys.flatMap(s=>Object.keys(sizes[s])))];
  const it = sizeKeys.length ? (()=>{ const fit = computeFit(p, spec, sizes, ge.previewSize); return {spec, circ:fit.circ, zones:fit.zones}; })() : fitItemForSpec(p, spec);
  S.vcfg = {profile:p, A:[it]};
  const t = spec.template;
  const pipe = ge.pipeline;
  return `
  <div class="row" style="margin-bottom:10px"><button class="btn sm ghost" data-a="tailorTabGo" data-t="library">${ic('back')}Garment library</button></div>
  <div class="page-head"><div><span class="eyebrow">${ge.isNew?'New garment':'Editing · version '+g.version}</span><h1>${esc(g.name||'Untitled garment')}</h1></div>
    <div class="row"><button class="btn" data-a="gedSave" data-v="draft">Save draft</button><button class="btn primary" data-a="gedSave" data-v="published">${g.status==='published'&&!ge.isNew?'Save new version':'Check and publish'}</button></div></div>
  <div class="studio">
    ${stageHTML({hud:`<span class="chip">Preview on ${esc(p.name)}</span>`})}
    <div class="side">
      ${pipe ? `<section class="panel stack s"><h2>Processing</h2><ul class="pipeline">${pipe.map(s=>`<li class="${s.state}"><i>${s.state==='ok'?'✓':s.state==='warn'?'!':s.state==='bad'?'×':s.state==='run'?'':'·'}</i><span><b>${esc(s.label)}</b>${s.detail?`<br><span class="faint">${esc(s.detail)}</span>`:''}</span></li>`).join('')}</ul></section>`:''}
      <section class="panel stack">
        <label class="field">Name<input type="text" id="ge-name" data-in="ged" data-k="name" value="${esc(g.name)}"></label>
        <label class="field">Category<select id="ge-cat" data-ch="gedCat">${CATEGORIES.map(c=>`<option value="${c.k}" ${g.category===c.k?'selected':''}>${c.label}</option>`).join('')}</select></label>
        <label class="field">Description<textarea id="ge-desc" data-in="ged" data-k="description">${esc(g.description)}</textarea></label>
        <div class="form-grid">
          <label class="field">Tailor / designer<input type="text" id="ge-des" data-in="ged" data-k="designer" value="${esc(g.designer||'')}"></label>
          <label class="field">Price (${S.settings.currency})<input type="number" id="ge-price" data-in="gedNum" data-k="price" value="${g.price??''}"></label>
          <label class="field">Tags<input type="text" id="ge-tags" data-in="gedTags" value="${esc((g.tags||[]).join(', '))}" placeholder="comma separated"></label>
        </div>
      </section>
      <section class="panel stack">
        <h3>Shape</h3>
        ${optRow('fit', OPTIONS.fit.filter(x=>x!=='custom'), spec.fit, 'Fit').replace(/data-a="spec"/g,'data-a="gspec"')}
        ${optRow('length', LENGTHS_FOR[t]||OPTIONS.length, spec.length, 'Length').replace(/data-a="spec"/g,'data-a="gspec"')}
        ${!['bottom','skirt'].includes(t) ? optRow('sleeve', OPTIONS.sleeve, spec.sleeve, 'Sleeves').replace(/data-a="spec"/g,'data-a="gspec"') + optRow('collar', COLLARS_FOR[t]||OPTIONS.collar, spec.collar, 'Collar').replace(/data-a="spec"/g,'data-a="gspec"') + optRow('closure', OPTIONS.closure, spec.closure, 'Closure').replace(/data-a="spec"/g,'data-a="gspec"') : ''}
        ${['bottom','suit'].includes(t) ? optRow('legShape', OPTIONS.legShape, spec.legShape, 'Leg').replace(/data-a="spec"/g,'data-a="gspec"') : ''}
        ${['dress','skirt'].includes(t) ? optRow('skirtShape', OPTIONS.skirtShape, spec.skirtShape, 'Skirt').replace(/data-a="spec"/g,'data-a="gspec"') : ''}
        <label class="field">Fabric<select id="ge-fab" data-ch="gedFabric">${Object.entries(FABRICS).map(([k,v])=>`<option value="${k}" ${spec.fabric===k?'selected':''}>${v.name}</option>`).join('')}</select></label>
        ${optRow('print', OPTIONS.print, spec.print, 'Print').replace(/data-a="spec"/g,'data-a="gspec"')}
      </section>
      <section class="panel stack">
        <h3>Colour options</h3>
        <div class="swatches">${PALETTE.map(c=>`<button class="sw" style="background:${c.h}" data-a="gedColor" data-v="${c.h}" data-n="${c.n}" aria-pressed="${(g.colors||[]).some(x=>x.h===c.h)}" aria-label="${c.n}" title="${c.n}"></button>`).join('')}</div>
        <span class="faint" style="font-size:12.5px">${(g.colors||[]).map(c=>c.n).join(', ') || 'Pick at least one colour.'}</span>
      </section>
      <section class="panel stack">
        <div class="spread"><h3>Size chart (finished garment, cm)</h3><button class="btn sm" data-a="gedAutoChart">Fill from block</button></div>
        ${sizeKeys.length ? `<div class="scroll-x"><table class="data"><thead><tr><th>Size</th>${zoneKeys.map(z=>`<th class="num">${optLabel(z)}</th>`).join('')}</tr></thead><tbody>${sizeKeys.map(s=>`<tr><td>${s}</td>${zoneKeys.map(z=>`<td><input type="number" step="0.5" id="sz-${s}-${z}" value="${sizes[s][z]??''}" data-ch="gedSize" data-s="${s}" data-z="${z}" style="min-height:32px;padding:4px 6px;width:72px;text-align:right" class="mono" aria-label="Size ${s} ${z}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="font-size:13.5px">No size chart. Without one, the garment can only be shown as a preview, not fit-checked.</p>'}
        ${sizeKeys.length ? `<div class="opts">${sizeKeys.map(s=>`<button class="opt" data-a="gedPreviewSize" data-v="${s}" aria-pressed="${ge.previewSize===s}">Preview ${s}</button>`).join('')}</div>`:''}
      </section>
      <section class="panel stack">
        <h3>Photos and assets</h3>
        <div class="refs">${(g.images||[]).map((im,i)=>`<div class="ref"><img src="${im.data}" alt="${esc(im.view)} photo"><button data-a="gedImgRemove" data-i="${i}" aria-label="Remove photo">×</button></div>`).join('')}</div>
        ${(g.images||[]).length<3?`<label class="drop">Add front, back or side photo (JPEG/PNG, resized to 480 px)<input type="file" accept="image/jpeg,image/png,image/webp" class="visually-hidden" data-ch="gedImg"></label>`:''}
        <label class="drop">Attach 3D garment (.glb / .gltf)<input type="file" accept=".glb,.gltf,model/gltf-binary" class="visually-hidden" data-ch="gedAsset"></label>
        ${g.asset ? `<p class="note">${esc(g.asset.note)}</p>`:''}
        <label class="drop">Attach digital pattern (.dxf / .svg / .pdf)<input type="file" accept=".dxf,.svg,.pdf" class="visually-hidden" data-ch="gedPattern"></label>
        ${g.patternFile ? `<p class="note">${esc(g.patternFile.note)}</p>`:''}
      </section>
      ${!ge.isNew ? `<section class="panel stack s"><h3>Version history</h3>${(g.history||[]).length?`<div class="list">${g.history.slice().reverse().map(h=>`<div class="li"><div class="grow"><b>Version ${h.version}</b><small>${fmtDate(h.at)} · ${esc(h.name)}</small></div></div>`).join('')}</div>`:'<p class="faint" style="font-size:13px">No earlier versions.</p>'}<p class="faint" style="font-size:12.5px">Saving a published garment creates a new version. Customers’ saved designs keep their own copy, and only fit results for this garment are recalculated.</p>
        <div class="row"><button class="btn sm danger" data-a="gedDelete">Delete garment</button></div></section>`:''}
    </div>
  </div>`;
}

/* ---------- notifications ---------- */
function viewNotifications(){
  S.vcfg = null;
  const ns = S.settings.notifications||[];
  const pref = S.settings.notif;
  return `<div class="page-head"><div><h1>Notifications</h1><p>New garments, design changes, tailor messages and processing results.</p></div>${ns.length?'<button class="btn" data-a="readAll">Mark all read</button>':''}</div>
  <div class="two" style="align-items:start">
    <section class="panel">${ns.length?`<div class="list">${ns.map(n=>notifRow(n)).join('')}</div>`:'<p class="muted">You’re all caught up.</p>'}</section>
    <section class="panel stack"><h2>Notify me about</h2>
      ${[['newGarments','New garments in the library'],['designs','Changes that affect my saved designs'],['tailor','Messages and status updates from tailors'],['processing','Garment processing results']].map(([k,l])=>`<label class="check"><input type="checkbox" id="np-${k}" data-ch="notifPref" data-k="${k}" ${pref[k]!==false?'checked':''}><span>${l}</span></label>`).join('')}
      <p class="faint" style="font-size:12.5px">Updates appear here while you use it; they are not sent by email or push.</p>
    </section>
  </div>`;
}

/* ---------- settings ---------- */
function viewSettings(){
  S.vcfg = null;
  const s = S.settings;
  const counts = {profiles:allProfiles().length, designs:designs().length, outfits:Object.keys(Store.private.outfits).length};
  return `<div class="page-head"><div><h1>Settings</h1><p>Units, appearance, privacy and your data.</p></div></div>
  <div class="two" style="align-items:start">
    <div class="stack">
      <section class="panel stack"><h2>Preferences</h2>
        <div class="ctl"><span class="lbl">Measurement units</span><div class="seg"><button data-a="setUnits" data-u="cm" aria-pressed="${s.units==='cm'}">Centimetres and metres</button><button data-a="setUnits" data-u="in" aria-pressed="${s.units==='in'}">Inches and yards</button></div><span class="faint" style="font-size:12.5px">Values are stored in centimetres, so switching never changes your measurements.</span></div>
        <label class="field">Currency<select id="set-cur" data-ch="setCurrency">${Object.entries(CURRENCIES).map(([c,sym])=>`<option value="${c}" ${s.currency===c?'selected':''}>${c} (${sym})</option>`).join('')}</select></label>
        <div class="ctl"><span class="lbl">Appearance</span><div class="seg">${['system','light','dark'].map(t=>`<button data-a="setTheme" data-v="${t}" aria-pressed="${(s.theme||'system')===t}">${optLabel(t)}</button>`).join('')}</div></div>
        <label class="check"><input type="checkbox" id="set-tech" data-ch="setTechnical" ${s.technical?'checked':''}><span><b>Technical production mode.</b> Shows seam and hem allowances, finished measurements, size charts and construction details everywhere.</span></label>
      </section>
      ${Store.mode==='local' ? `<section class="panel stack"><h2>Demo role</h2><p class="muted" style="font-size:14px">Device-only mode has no server to enforce roles, so you can switch roles to explore each workspace.</p><div class="seg">${['customer','tailor','admin'].map(r=>`<button data-a="setDemoRole" data-v="${r}" aria-pressed="${s.demoRole===r}">${optLabel(r)}</button>`).join('')}</div></section>` : `<section class="panel stack"><h2>Your role</h2><p class="muted" style="font-size:14px">${Store.role.owner?'You own this page: you can publish garments and see client projects.':Store.role.editor?'You are an Editor (tailor) of this page.':'You are a customer of this page. Tailor tools are hidden and the database refuses library changes from your account.'}</p></section>`}
    </div>
    <div class="stack">
      <section class="panel stack"><h2>Privacy and body data</h2>
        <div class="note"><b>Where your data lives:</b> ${Store.mode==='cloud' ? 'in your private space in this page’s database. Nobody else can read it, including the page owner, unless you share a specific project with a tailor.' : 'in this browser only. Clearing site data removes it.'}<br><br><b>Photos</b> from the body scan are never saved or uploaded. <b>Claude</b> receives only the design text you ask it to interpret (and reference images if you choose to send them), never your measurements. <b>Nothing</b> is used for model training.</div>
        <dl class="kv"><dt>Body profiles</dt><dd>${counts.profiles}</dd><dt>Designs</dt><dd>${counts.designs}</dd><dt>Outfits</dt><dd>${counts.outfits}</dd><dt>Shared projects</dt><dd>${Object.keys(Store.myShares.items||{}).length}</dd><dt>Scan consent</dt><dd>${s.consentScan?'Given':'Not given'} ${s.consentScan?'<button class="btn sm ghost" data-a="withdrawConsent">Withdraw</button>':''}</dd></dl>
        <div class="row"><button class="btn" data-a="exportMyData">${ic('download')}Export my data (JSON)</button></div>
        <div class="row">${allProfiles().some(p=>p.sample)||designs().some(d=>d.sample)?'<button class="btn" data-a="removeSamples">Remove sample data</button>':''}<button class="btn danger" data-a="deleteBodyData">Delete all body data</button><button class="btn danger" data-a="deleteEverything">Delete everything</button></div>
      </section>
      <section class="panel stack"><h2>Integrations</h2>
        <table class="data"><tbody>
          <tr><td>Design interpretation</td><td>${Caps.sample?'<span class="chip ok">Claude</span>':'<span class="chip">Keyword rules</span>'}</td></tr>
          <tr><td>Reference image reading</td><td>${Caps.sampleImages?'<span class="chip ok">Claude</span>':'<span class="chip">Not available</span>'}</td></tr>
          <tr><td>Body scan reconstruction</td><td><span class="chip warn">Not connected</span></td></tr>
          <tr><td>Image-to-3D garments</td><td><span class="chip warn">Not connected</span></td></tr>
          <tr><td>Cloth simulation</td><td><span class="chip warn">Not connected</span></td></tr>
          <tr><td>Asset storage (photos, GLB)</td><td>${Store.mode==='cloud'?'<span class="chip">Small photos in database</span>':'<span class="chip">This device</span>'}</td></tr>
          <tr><td>Data sync</td><td>${Store.mode==='cloud'?'<span class="chip ok">Connected</span>':'<span class="chip warn">Device only</span>'}</td></tr>
          <tr><td>File export</td><td>${Caps.downloads?'<span class="chip ok">Available</span>':'<span class="chip">Not available here</span>'}</td></tr>
        </tbody></table>
      </section>
    </div>
  </div>`;
}
