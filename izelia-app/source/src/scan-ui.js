/* ================= 3D SCAN IMPORT: screens + actions ================= */
Object.assign(ICON, {upload:'<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'});
const CONF_LABEL = {good:['ok','Good'], check:['warn','Check'], rough:['bad','Rough']};

function scanImportModal(){
  const I = S.scanImp || (S.scanImp = {stage:'pick'});
  const units = Units.sys;
  const hField = (id) => `<label class="field">The person’s real height <small class="faint">recommended</small><span class="inwrap" style="display:flex;gap:6px;align-items:center"><input type="number" inputmode="decimal" step="0.1" min="0" id="${id}" value="${I.height?Units.val(I.height):''}" placeholder="${units==='in'?'e.g. 69':'e.g. 175'}" style="flex:1"><span class="faint">${units}</span></span></label>`;
  let body = '';
  if (I.stage==='pick') body = `
    <h2>Import a 3D body scan</h2>
    <p class="muted">Upload a scan exported from a phone app or a body scanner. IZELIA stands it up, scales it and measures it, then you choose which numbers to use.</p>
    <div class="note"><b>Your scan stays on this device.</b> The 3D file is read in this browser tab only. It is never uploaded or saved and disappears when you reload. Only the measurements you accept are saved to ${Store.mode==='cloud'?'your private profile':'this browser'}.</div>
    <div class="two" style="gap:18px">
      <div class="stack s">
        ${hField('si-h')}
        <p class="faint" style="font-size:12.5px">Phone scans are often slightly the wrong size. With the real height, every measurement is scaled correctly.</p>
        <label class="check"><input type="checkbox" id="si-consent" ${S.settings.consentScan?'checked':''}><span>I agree to this scan being read on this device to take measurements${S.bodyEdit && S.bodyEdit.kind!=='self'?', and the person scanned agreed too':''}.</span></label>
        <label class="btn primary" style="position:relative;overflow:hidden">${ic('upload')}Choose scan file<input type="file" accept=".glb,.gltf,.obj,.ply,.stl" data-ch="scanFile" style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-label="Choose a 3D scan file"></label>
        <span class="faint" style="font-size:12.5px">.glb, .gltf, .obj, .ply or .stl · up to 200 MB</span>
      </div>
      <div class="stack s" style="font-size:13.5px">
        <b>For a good scan</b>
        <ul style="margin:0;padding-left:18px" class="muted">
          <li>Fitted clothes or underwear, hair tied back, no shoes.</li>
          <li>Stand still, feet hip-width apart, arms held a little away from your sides.</li>
          <li>Phone apps: Polycam, Scaniverse or similar; a helper walks slowly around you.</li>
          <li>Export the full body as one mesh. Turn off Draco/mesh compression.</li>
        </ul>
      </div>
    </div>
    <div class="row"><button class="btn ghost" data-a="closeModal">Cancel</button></div>`;
  if (I.stage==='busy') body = `
    <h2>Measuring your scan</h2>
    <ul class="pipeline"><li class="ok"><i>✓</i><span>${esc(I.file||'File')} loaded on this device.</span></li><li><i>…</i><span>Standing the body up, scaling it and slicing it into hundreds of cross-sections. Large scans can take several seconds.</span></li></ul>`;
  if (I.stage==='error') body = `
    <h2>Couldn’t measure this scan</h2>
    <div class="note warn">${esc(I.err)}</div>
    ${I.needHeight ? hField('si-h2') : ''}
    <div class="row">${S.scanBuf && I.needHeight ? '<button class="btn primary" data-a="scanRetry">Try again</button>':''}<label class="btn" style="position:relative;overflow:hidden">Choose another file<input type="file" accept=".glb,.gltf,.obj,.ply,.stl" data-ch="scanFile" style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-label="Choose a 3D scan file"></label><button class="btn ghost" data-a="closeModal">Close</button></div>`;
  if (I.stage==='result' && S.scan){
    const r = S.scan, d = S.bodyEdit, sel = I.sel || {};
    const keys = MDEF.map(m=>m.k).filter(k=>r.m[k]);
    body = `
    <h2>Measurements from your scan</h2>
    <p class="muted" style="font-size:14px">${esc(r.name)} · ${Units.show(r.H)} tall (${esc(r.unitGuess)}) · ${Math.round(r.tris/1000)}k triangles · measured in ${(r.ms/1000).toFixed(1)} s</p>
    ${r.notes.length ? `<div class="note warn">${r.notes.map(esc).join('<br>')}</div>`:''}
    <div class="scroll-x"><table class="data"><thead><tr><th style="width:36px"><span class="visually-hidden">Use</span></th><th>Measurement</th><th class="num">From scan</th><th>Confidence</th><th class="num">${d?'In profile now':'Current'}</th></tr></thead><tbody>
      ${keys.map(k=>{ const v = r.m[k], cur = d?.m?.[k]; const [cls, lab] = CONF_LABEL[v.conf]; return `<tr><td><input type="checkbox" data-ch="scanSel" data-k="${k}" ${sel[k]?'checked':''} aria-label="Use ${MBYK[k].label}"></td><td><b style="font-weight:500">${MBYK[k].label}</b><br><small class="faint">${esc(v.why)}</small></td><td class="num mono">${Units.show(v.v)}</td><td><span class="chip ${cls}">${lab}</span></td><td class="num mono">${cur!=null?Units.show(cur):'<span class="faint">—</span>'}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="faint" style="font-size:12.5px">Scan measurements are estimates. <b>Good</b> ones are usually within a centimetre or two on a clean scan; <b>Check</b> ones depend on landmarks a scan can’t see, like the shoulder bone; <b>Rough</b> ones were affected by pose. A tailor should still confirm before cutting.</p>
    <div class="row"><button class="btn primary" data-a="scanApply">Use ${Object.values(sel).filter(Boolean).length} selected in ${d?esc(d.name):'a new profile'}</button><button class="btn" data-a="scanView">Just view the scan</button>${hField('si-h3').replace('<label class="field">','<label class="field" style="max-width:260px">')}<button class="btn sm" data-a="scanRetry" data-src="si-h3">Rescale</button></div>`;
  }
  return `<div class="modal wide" role="dialog" aria-modal="true" aria-label="Import a 3D body scan">${body}</div>`;
}

/* Panel under the 3D stage on My Body while a scan is loaded. */
function scanPanelHTML(){
  if (!S.scan) return '';
  const r = S.scan, mode = S.viewer.scanMode || 'scan';
  return `<div class="panel stack s">
    <div class="spread"><span class="eyebrow">3D scan · this session only</span><button class="btn sm ghost" data-a="scanRemove">Remove scan</button></div>
    <div class="spread" style="flex-wrap:wrap;gap:10px"><b style="font-weight:500">${esc(r.name)} <span class="faint" style="font-weight:400">· ${Units.show(r.H)}</span></b>
      <div class="seg" role="group" aria-label="Show">${[['scan','Scan'],['compare','Compare'],['avatar','Avatar']].map(([v,l])=>`<button data-a="scanMode" data-v="${v}" aria-pressed="${mode===v}">${l}</button>`).join('')}</div></div>
    <p class="faint" style="font-size:12.5px">Green rings show where each circumference was measured. <b>Compare</b> lays the scan over your avatar so you can see if the measurements match the body.</p>
    <div class="row tight"><button class="btn sm" data-a="scanReview">Review measurements</button><button class="btn sm" data-a="scanTurn">Turn to face front</button><button class="btn sm" data-a="scanFlip">Flip upside down</button></div>
  </div>`;
}

function runScanImport(){
  const I = S.scanImp; const {name, buf} = S.scanBuf;
  I.stage = 'busy'; I.file = name; App.modal(scanImportModal());
  setTimeout(()=>{
    try {
      const r = processScan(name, buf, {height:I.height||null, flip:!!I.flip, turn:!!I.turn});
      S.scan = r; I.stage = 'result'; I.needHeight = false;
      const d = S.bodyEdit; I.sel = {};
      for (const [k,v] of Object.entries(r.m)) I.sel[k] = v.conf==='good' || (v.conf==='check' && d?.m?.[k]==null);
      if (I.height) I.sel.height = false; // height came from the person, not the scan
      if (!S.viewer.scanMode) S.viewer.scanMode = 'scan';
    } catch(e){ I.stage = 'error'; I.err = e.message || String(e); I.needHeight = !!e.needHeight || /size|tall|height/i.test(I.err); }
    if (S.route==='body'){ App.render(); }
    App.modal(scanImportModal());
  }, 40);
}

Object.assign(ACT, {
  openScanImport(){ S.scanImp = {stage: S.scan ? 'result' : 'pick', sel:S.scanImp?.sel, height:S.scanImp?.height, flip:S.scanImp?.flip, turn:S.scanImp?.turn}; App.modal(scanImportModal()); },
  scanReview(){ ACT.openScanImport(); },
  scanRetry(el){
    const id = el?.dataset?.src || (document.getElementById('si-h2') ? 'si-h2' : 'si-h');
    const v = Units.toCm(document.getElementById(id)?.value);
    if (!v || v<90 || v>240){ toast('Enter the person’s real height, between 90 and 240 cm.', true); return; }
    S.scanImp.height = v; if (!S.scanBuf){ S.scanImp.stage = 'pick'; App.modal(scanImportModal()); return; }
    runScanImport();
  },
  scanApply(){
    const r = S.scan, I = S.scanImp; if (!r) return;
    if (!S.bodyEdit){ ACT.newProfile(); }
    const d = S.bodyEdit, used = [];
    for (const [k, on] of Object.entries(I.sel||{})) if (on && r.m[k] && validMeasure(k, r.m[k].v)){ d.m[k] = r.m[k].v; used.push(k); }
    if (I.height && !d.m.height){ d.m.height = Math.round(I.height*2)/2; used.push('height'); }
    if (!used.length){ toast('Select at least one measurement to use.', true); return; }
    d.method = 'scan'; d.verified = false;
    d.scanInfo = {file:r.name, at:nowIso(), keys:used};
    S.viewer.scanMode = 'compare';
    App.closeModal(); S.route = 'body'; App.render();
    toast(`${used.length} measurement${used.length>1?'s':''} filled from the scan. Check them, then save the profile.`);
  },
  scanView(){ App.closeModal(); S.viewer.scanMode = 'scan'; if (S.route!=='body') App.go('body'); else App.render(); },
  scanMode(el){ S.viewer.scanMode = el.dataset.v; App.render(); },
  scanTurn(){ S.scanImp.turn = !S.scanImp.turn; runScanImport(); },
  scanFlip(){ S.scanImp.flip = !S.scanImp.flip; runScanImport(); },
  scanRemove(){ S.scan = null; S.scanBuf = null; S.scanImp = null; App.render(); toast('Scan removed from this device.'); },
});
Object.assign(CH, {
  async scanFile(el){
    const f = el.files[0]; if (!f) return;
    const consent = document.getElementById('si-consent');
    if (consent && !consent.checked){ toast('Tick the consent box first.', true); el.value = ''; return; }
    S.settings.consentScan = true;
    const ext = (f.name.split('.').pop()||'').toLowerCase();
    if (!SCAN_EXT.includes(ext)){ toast('Use a .glb, .gltf, .obj, .ply or .stl file.', true); return; }
    if (f.size > 200e6){ toast('That file is larger than 200 MB. Export a lighter version of the scan.', true); return; }
    const hIn = document.getElementById('si-h') || document.getElementById('si-h2');
    const h = hIn ? Units.toCm(hIn.value) : null;
    S.scanImp = Object.assign(S.scanImp || {}, {height: h && h>=90 && h<=240 ? h : (S.scanImp?.height||null), flip:false, turn:false});
    S.scanBuf = {name:f.name, buf:await f.arrayBuffer()};
    runScanImport();
  },
  scanSel(el){ S.scanImp.sel[el.dataset.k] = el.checked; const b = document.querySelector('[data-a="scanApply"]'); if (b) b.textContent = `Use ${Object.values(S.scanImp.sel).filter(Boolean).length} selected in ${S.bodyEdit?S.bodyEdit.name:'a new profile'}`; },
});
