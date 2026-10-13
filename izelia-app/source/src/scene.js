/* ================= 3D VIEWER =================
   One WebGL renderer, moved between views. Avatar and garments are parametric
   shells generated from the body model in fit.js (units: centimetres). */
const Viewer = {
  ok:false, failed:false, renderer:null, scene:null, camera:null,
  host:null, canvas:null, tagsEl:null,
  avatar:null, groupA:null, groupB:null, tape:null, deco:null,
  cfg:null, keyAvatar:'', keyA:'', keyB:'',
  cam:{az:.45, el:.06, dist:300, taz:.45, tel:.06, tdist:300, ty:95, target:null},
  auto:false, dirty:true, ptrs:new Map(), lastPinch:0, raf:0, ro:null, tagData:[],

  init(){
    if (this.ok || this.failed) return this.ok;
    if (!window.THREE){ this.failed = true; return false; }
    try {
      const r = new THREE.WebGLRenderer({antialias:true, alpha:true});
      r.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
      r.outputEncoding = THREE.sRGBEncoding;
      r.setClearColor(0x000000, 0);
      this.renderer = r; this.canvas = r.domElement;
      this.canvas.setAttribute('aria-label','3D fitting view. Drag to rotate, scroll or pinch to zoom, double-click to recentre.');
      this.canvas.setAttribute('role','img');
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(28, 1, 5, 4000);
      this.cam.target = new THREE.Vector3(0,95,0);
      const hemi = new THREE.HemisphereLight(0xfff6ea, 0x5a5248, .85); this.scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffffff, .95); key.position.set(160,260,240); this.scene.add(key);
      const rim = new THREE.DirectionalLight(0xdfe6ff, .55); rim.position.set(-220,180,-200); this.scene.add(rim);
      const fill = new THREE.DirectionalLight(0xfff0dd, .25); fill.position.set(-200,80,200); this.scene.add(fill);
      this.deco = this.makeTurntable(); this.scene.add(this.deco);
      this.groupA = new THREE.Group(); this.groupB = new THREE.Group(); this.scene.add(this.groupA, this.groupB);
      this.bindControls();
      this.ok = true;
      const loop = () => { this.raf = requestAnimationFrame(loop); this.tick(); };
      loop();
      return true;
    } catch(e){ console.warn('WebGL unavailable', e); this.failed = true; return false; }
  },
  lin(hex){ return new THREE.Color(hex).convertSRGBToLinear(); },

  makeTurntable(){
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(48, 64), new THREE.MeshStandardMaterial({color:this.lin('#8a8070'), roughness:1, transparent:true, opacity:.16}));
    disc.rotation.x = -Math.PI/2; disc.position.y = .2; g.add(disc);
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const grd = x.createRadialGradient(64,64,4,64,64,64); grd.addColorStop(0,'rgba(0,0,0,.42)'); grd.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle = grd; x.fillRect(0,0,128,128);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(70,46), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false}));
    sh.rotation.x = -Math.PI/2; sh.position.y = .4; g.add(sh);
    const pts = [];
    for (let i=0;i<72;i++){ const a = i/72*Math.PI*2, long = i%9===0, r0 = long?43:45.5; pts.push(new THREE.Vector3(Math.sin(a)*r0,.5,Math.cos(a)*r0), new THREE.Vector3(Math.sin(a)*48,.5,Math.cos(a)*48)); }
    const ticks = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:this.lin('#D9A520'), transparent:true, opacity:.75}));
    g.add(ticks);
    return g;
  },

  /* ---------- mounting ---------- */
  attach(host){
    if (!host){ this.host = null; return; }
    if (!this.init()){
      if (!host.querySelector('.fallback')) host.insertAdjacentHTML('afterbegin', `<div class="fallback"><div class="stack s" style="align-items:center"><b>3D view unavailable</b><span>This device or browser could not start WebGL. Measurements, fit checks, patterns and materials all still work.</span></div></div>`);
      return;
    }
    this.host = host;
    host.prepend(this.canvas);
    this.tagsEl = host.querySelector('.tags');
    if (this.ro) this.ro.disconnect();
    this.ro = new ResizeObserver(()=>this.resize()); this.ro.observe(host);
    this.resize(); this.dirty = true;
  },
  resize(){
    if (!this.host) return;
    const w = this.host.clientWidth, h = this.host.clientHeight; if (!w||!h) return;
    this.renderer.setSize(w, h, false); this.dirty = true;
  },

  /* cfg: {profile, A:[items], B:[items]|null, small, autoRotate}
     item: {spec, circ, key} — garment spec plus fitted circumferences */
  setConfig(cfg){
    if (!this.init()) return;
    this.cfg = cfg;
    const prof = cfg.profile;
    const kAv = prof ? prof.id+'|'+prof.updatedAt+'|'+(prof.skin??2)+'|'+JSON.stringify(prof.m)+prof.shape : 'none';
    let B = null;
    if (prof){
      B = bodyGeom(prof);
      if (kAv !== this.keyAvatar){
        this.keyAvatar = kAv;
        if (this.avatar){ this.scene.remove(this.avatar); this.dispose(this.avatar); }
        this.avatar = this.buildAvatar(B, prof); this.scene.add(this.avatar);
        if (this.tape){ this.scene.remove(this.tape); this.dispose(this.tape); }
        this.tape = this.buildTape(B); this.scene.add(this.tape);
        const ty = B.H*.53; this.cam.ty = ty; this.cam.tdist = B.H*2.2; this.cam.target.y = ty; if (!this.camInit){ this.cam.dist = this.cam.tdist; this.camInit=true; }
      }
    } else if (this.avatar){ this.scene.remove(this.avatar); this.dispose(this.avatar); this.avatar=null; this.keyAvatar=''; }
    // imported body scan (session only): shown instead of, or over, the parametric avatar
    const sc = cfg.scan && S.scan ? S.scan : null;
    const kS = sc ? sc.id : '';
    if (kS !== this.keyScan){
      this.keyScan = kS;
      if (this.scanObj){ this.scene.remove(this.scanObj); this.dispose(this.scanObj); this.scanObj = null; }
      if (sc){ try { this.scanObj = this.buildScan(sc, prof); this.scene.add(this.scanObj); } catch(e){ console.warn('scan display failed', e); } }
    }
    const mode = sc ? (S.viewer.scanMode || 'scan') : 'avatar';
    if (this.scanObj){
      this.scanObj.visible = mode !== 'avatar';
      const m = this.scanObj.userData.mat; m.transparent = mode==='compare'; m.opacity = mode==='compare' ? .42 : 1; m.depthWrite = mode!=='compare'; m.needsUpdate = true;
      this.scanObj.userData.rings.visible = mode !== 'avatar';
      if (sc && !B){ const ty = sc.H*.53; this.cam.ty = ty; this.cam.tdist = sc.H*2.2; this.cam.target.y = ty; }
    }
    if (this.avatar) this.avatar.visible = mode !== 'scan';
    const kA = kAv + JSON.stringify((cfg.A||[]).map(i=>[i.spec,i.circ])) + this.fitMapKey();
    if (kA !== this.keyA){ this.keyA = kA; this.fill(this.groupA, B, cfg.A||[]); }
    const kB = kAv + JSON.stringify((cfg.B||[]).map(i=>[i.spec,i.circ])) + this.fitMapKey();
    if (kB !== this.keyB){ this.keyB = kB; this.fill(this.groupB, B, cfg.B||[]); }
    this.auto = !!cfg.autoRotate;
    if (this.tape) this.tape.visible = S.viewer.tape;
    this.groupA.visible = S.viewer.garmentsOn; this.groupB.visible = S.viewer.garmentsOn;
    this.B = B;
    this.dirty = true;
  },
  fitMapKey(){ return S.viewer.fitMap ? '|fm' : ''; },
  fill(group, B, items){
    for (const c of [...group.children]){ group.remove(c); this.dispose(c); }
    if (!B) return;
    const env = makeEnvelope();
    const ordered = [...items].sort((a,b)=>layerOf(a.spec)-layerOf(b.spec));
    for (const it of ordered){
      try { group.add(buildGarment(B, it, env)); } catch(e){ console.warn('garment build failed', e); }
    }
  },
  dispose(obj){
    obj.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m => m.dispose()); }
    });
  },

  /* ---------- avatar ---------- */
  buildAvatar(B, prof){
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({color:this.lin(SKIN[prof.skin??2]||SKIN[2]), roughness:.78, metalness:0});
    const L = B.L, H = B.H;
    // torso
    g.add(new THREE.Mesh(shellGeo(40, 48, (v,u)=>{
      const y = lerp(L.neckY, L.crotchY - .015*H, v);
      const a = Math.PI + u*Math.PI*2, rx = B.torsoRx(y), rz = rx*B.kAt(y) + B.bustAt(y, a);
      return [Math.sin(a)*rx, y, Math.cos(a)*rz];
    }), mat));
    // neck + head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(B.rNeck*.95, B.rNeck*1.05, (L.headC-.04*H)-(L.neckY-.02*H), 24), mat);
    neck.position.y = ((L.headC-.04*H)+(L.neckY-.02*H))/2; g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat);
    head.scale.set(.052*H, .066*H, .06*H); head.position.set(0, L.headC, .004*H); g.add(head);
    // legs + feet
    for (const s of [-1,1]){
      g.add(new THREE.Mesh(shellGeo(36, 28, (v,u)=>{
        const y = lerp(L.crotchY + .03*H, .012*H, v); const a = Math.PI + u*Math.PI*2, r = B.legR(y);
        return [s*B.legX + Math.sin(a)*r, y, Math.cos(a)*r*.94];
      }), mat));
      const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mat);
      foot.scale.set(.028*H, .02*H, .075*H); foot.position.set(s*B.legX*1.04, .018*H, .035*H); g.add(foot);
    }
    // arms
    for (const s of [-1,1]){
      const arm = new THREE.Group();
      arm.add(new THREE.Mesh(shellGeo(30, 24, (v,u)=>{
        const t = v*B.armLen; const a = u*Math.PI*2, r = B.armR(t);
        return [Math.sin(a)*r, -t, Math.cos(a)*r*.92];
      }), mat));
      const cap = new THREE.Mesh(new THREE.SphereGeometry(B.armR(0)*1.02, 20, 14), mat); arm.add(cap);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat);
      hand.scale.set(.026*H, .055*H, .013*H*1.6); hand.position.set(0, -B.armLen - .045*H, 0); arm.add(hand);
      arm.position.set(s*B.shoulderJoint.x, B.shoulderJoint.y, 0); arm.rotation.z = s*B.armAngle;
      g.add(arm);
    }
    return g;
  },
  buildScan(sc, prof){
    const g = new THREE.Group();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(sc.pos, 3));
    if (sc.idx) geo.setIndex(new THREE.BufferAttribute(sc.idx, 1));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({color:this.lin(SKIN[prof?.skin??2]||SKIN[2]), roughness:.85, metalness:0, side:THREE.DoubleSide});
    g.add(new THREE.Mesh(geo, mat));
    const rings = new THREE.Group(), lm = new THREE.LineBasicMaterial({color:this.lin('#9CC42B')});
    for (const r of sc.rings||[]){ if (!r.hull || r.hull.length<3) continue; rings.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(r.hull.map(([x,z])=>new THREE.Vector3(x, r.y+.05, z))), lm)); }
    g.add(rings);
    g.userData = {mat, rings};
    return g;
  },
  buildTape(B){
    const g = new THREE.Group(); const L = B.L;
    const mat = new THREE.LineBasicMaterial({color:this.lin('#D9A520')});
    this.tagData = [];
    const ring = (y, key, label, dx=0, rf=null) => {
      const pts=[]; for (let i=0;i<=64;i++){ const a=i/64*Math.PI*2; const rx = rf? rf(y): B.torsoRx(y)+.35, rz = rf? rf(y)*.94 : rx*B.kAt(y)+B.bustAt(y,a)+.35; pts.push(new THREE.Vector3(dx+Math.sin(a)*rx, y, Math.cos(a)*rz)); }
      g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat));
      const rx0 = rf? rf(y) : B.torsoRx(y);
      this.tagData.push({p:new THREE.Vector3(dx+rx0+1, y, 0), key, label});
    };
    ring(L.chestY,'chest','Chest'); ring(L.waistY,'waist','Waist'); ring(L.hipY,'hip','Hip');
    ring(L.crotchY-.06*B.H,'thigh','Thigh', B.legX, y=>B.legR(y)+.35);
    return g;
  },

  /* ---------- camera + controls ---------- */
  view(name){
    const map = {front:0, back:Math.PI, left:Math.PI/2, right:-Math.PI/2, three:.62};
    if (name==='reset'){ this.cam.taz=.45; this.cam.tel=.06; this.cam.tdist = this.B? this.B.H*2.2 : 340; this.cam.target.y = this.cam.ty; }
    else { let t = map[name]; const cur = this.cam.az; while (t - cur > Math.PI) t -= Math.PI*2; while (cur - t > Math.PI) t += Math.PI*2; this.cam.taz = t; this.cam.tel = .05; }
    this.dirty = true;
  },
  zoom(f){ this.cam.tdist = clamp(this.cam.tdist*f, 80, 700); this.dirty = true; },
  bindControls(){
    const c = this.canvas;
    c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); this.ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); this.auto = false; });
    c.addEventListener('pointermove', e => {
      if (!this.ptrs.has(e.pointerId)) return;
      const prev = this.ptrs.get(e.pointerId);
      if (this.ptrs.size === 1){
        const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        this.cam.taz -= dx*.009; this.cam.tel = clamp(this.cam.tel + dy*.006, -.35, .9);
      } else if (this.ptrs.size === 2){
        const [a,b] = [...this.ptrs.values()];
        const d0 = Math.hypot(a.x-b.x, a.y-b.y);
        this.ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
        const [a2,b2] = [...this.ptrs.values()];
        const d1 = Math.hypot(a2.x-b2.x, a2.y-b2.y);
        if (d0>0) this.cam.tdist = clamp(this.cam.tdist * d0/d1, 80, 700);
        const my = ((a2.y+b2.y)-(a.y+b.y))/2; this.cam.target.y = clamp(this.cam.target.y + my*.25, 10, 190);
      }
      this.ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
      this.dirty = true;
    });
    const up = e => { this.ptrs.delete(e.pointerId); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY>0 ? 1.08 : 1/1.08); }, {passive:false});
    c.addEventListener('dblclick', () => this.view('reset'));
    c.tabIndex = 0;
    c.addEventListener('keydown', e => {
      const k = e.key; let used = true;
      if (k==='ArrowLeft') this.cam.taz += .2; else if (k==='ArrowRight') this.cam.taz -= .2;
      else if (k==='ArrowUp') this.cam.tel = clamp(this.cam.tel+.1,-.35,.9); else if (k==='ArrowDown') this.cam.tel = clamp(this.cam.tel-.1,-.35,.9);
      else if (k==='+'||k==='=') this.zoom(1/1.12); else if (k==='-') this.zoom(1.12); else if (k==='0') this.view('reset'); else used = false;
      if (used){ e.preventDefault(); this.dirty = true; }
    });
  },
  tick(){
    if (!this.host || !this.host.isConnected) return;
    const c = this.cam; let moving = false;
    if (this.auto){ c.taz += .006; moving = true; }
    for (const [k,t] of [['az','taz'],['el','tel'],['dist','tdist']]){ const d = c[t]-c[k]; if (Math.abs(d) > 1e-4){ c[k] += d*.16; moving = true; } else c[k]=c[t]; }
    const dy = c.ty - c.target.y; if (this.ptrs.size<2 && Math.abs(dy) > .01 && !this.userPanned){ /* keep user pan */ }
    if (!moving && !this.dirty) return;
    this.dirty = false;
    const cam = this.camera, T = c.target;
    cam.position.set(T.x + Math.sin(c.az)*Math.cos(c.el)*c.dist, T.y + Math.sin(c.el)*c.dist, T.z + Math.cos(c.az)*Math.cos(c.el)*c.dist);
    cam.lookAt(T);
    const r = this.renderer; const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    if (this.cfg && this.cfg.B){
      cam.aspect = (w/2)/h; cam.updateProjectionMatrix();
      r.setScissorTest(true);
      this.groupA.visible = S.viewer.garmentsOn; this.groupB.visible = false;
      r.setViewport(0,0,w/2,h); r.setScissor(0,0,w/2,h); r.render(this.scene, cam);
      this.groupA.visible = false; this.groupB.visible = S.viewer.garmentsOn;
      r.setViewport(w/2,0,w/2,h); r.setScissor(w/2,0,w/2,h); r.render(this.scene, cam);
      r.setScissorTest(false); this.groupA.visible = S.viewer.garmentsOn;
    } else {
      cam.aspect = w/h; cam.updateProjectionMatrix();
      r.setViewport(0,0,w,h); r.render(this.scene, cam);
    }
    this.drawTags(w, h);
  },
  drawTags(w, h){
    const el = this.tagsEl; if (!el) return;
    if (!S.viewer.tape || !this.tape || (this.cfg && this.cfg.B)){ if (el.childElementCount) el.innerHTML=''; return; }
    const m = this.B ? this.B.m : {};
    const html = this.tagData.map(t => {
      const p = t.p.clone().project(this.camera);
      if (p.z > 1) return '';
      const x = (p.x*.5+.5)*w, y = (-p.y*.5+.5)*h;
      return `<span class="tag" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px">${t.label} ${Units.show(m[t.key],1)}</span>`;
    }).join('');
    if (el.innerHTML !== html) el.innerHTML = html;
  },
};

/* ---------- geometry helpers ---------- */
function shellGeo(rows, segs, fn){
  const pos = [], uv = [], idx = [];
  for (let i=0;i<=rows;i++){
    for (let j=0;j<=segs;j++){
      const p = fn(i/rows, j/segs);
      pos.push(p[0], p[1], p[2]);
      uv.push(p[3] ?? j/segs, p[4] ?? i/rows);
    }
  }
  const W = segs+1;
  for (let i=0;i<rows;i++) for (let j=0;j<segs;j++){
    const a = i*W+j, b = a+1, c = a+W, d = c+1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function layerOf(spec){ return {bottom:0, skirt:0, tee:1, top:1, dress:1, hoodie:2, jacket:3, suit:3, robe:4}[spec.template] ?? 1; }
/* Envelope: the outer surface of garments already placed, so the next layer sits outside it. */
function makeEnvelope(){
  const rows = []; // {y0,y1,f(y)->[rx,rz]}
  const atRows = (rs, y) => { let rx=0, rz=0; for (const r of rs){ if (y<=r.y0 && y>=r.y1){ const v = r.f(y); rx=Math.max(rx,v[0]); rz=Math.max(rz,v[1]); } } return [rx,rz]; };
  return {
    at(y){ return atRows(rows, y); },
    add(y0, y1, f){ rows.push({y0, y1, f}); },
    /* a snapshot of the layers placed so far, so a garment never measures against itself */
    frozen(){ const snap = rows.slice(); return {at:y=>atRows(snap, y)}; },
  };
}

/* ---------- print textures (scaled in real centimetres) ---------- */
const TEX = new Map();
function printTexture(print, base, ink){
  const key = print+base+ink;
  if (TEX.has(key)) return TEX.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0,0,256,256); x.fillStyle = ink; x.strokeStyle = ink;
  if (print==='stripe'){ for (let i=0;i<256;i+=32){ x.fillRect(i,0,3,256); } }
  else if (print==='check'){ x.globalAlpha=.35; for (let i=0;i<256;i+=64){ x.fillRect(i,0,22,256); x.fillRect(0,i,256,22); } x.globalAlpha=1; for (let i=0;i<256;i+=64){ x.fillRect(i+30,0,2,256); x.fillRect(0,i+30,256,2);} }
  else if (print==='herringbone'){ x.globalAlpha=.28; x.lineWidth=3; for (let r=0;r<256;r+=16){ for (let cc=0;cc<256;cc+=32){ x.beginPath(); x.moveTo(cc,r); x.lineTo(cc+16,r+16); x.moveTo(cc+32,r); x.lineTo(cc+16,r+16); x.stroke(); } } x.globalAlpha=1; }
  else if (print==='polka'){ for (let r=0;r<256;r+=32) for (let cc=0;cc<256;cc+=32){ x.beginPath(); x.arc(cc+((r/32)%2?16:0), r+16, 5, 0, 7); x.fill(); } }
  else if (print==='wax'){ x.lineWidth=5; for (let r=0;r<256;r+=64) for (let cc=0;cc<256;cc+=64){ const ox=cc+((r/64)%2?32:0)+32, oy=r+32; for (const rr of [26,16,6]){ x.beginPath(); x.arc(ox%256, oy, rr, 0, 7); rr===6? x.fill(): x.stroke(); } } }
  else if (print==='geometric'){ x.lineWidth=4; for (let r=0;r<256;r+=64) for (let cc=0;cc<256;cc+=64){ x.save(); x.translate(cc+32,r+32); x.strokeRect(-22,-22,44,44); x.beginPath(); x.moveTo(-22,0); x.lineTo(0,-22); x.lineTo(22,0); x.lineTo(0,22); x.closePath(); x.stroke(); x.beginPath(); x.arc(0,0,5,0,7); x.fill(); x.restore(); } }
  else if (print==='gara'){ // resist-dye blooms: soft concentric rings with irregular edges
    let s = 7; const rnd = () => (s = (s*16807)%2147483647)/2147483647;
    for (let k=0;k<14;k++){ const cx=rnd()*256, cy=rnd()*256, R=18+rnd()*30;
      for (let dx=-256;dx<=256;dx+=256) for (let dy=-256;dy<=256;dy+=256){ const gr = x.createRadialGradient(cx+dx,cy+dy,R*.2,cx+dx,cy+dy,R); gr.addColorStop(0, ink+'00'); gr.addColorStop(.55, ink+'cc'); gr.addColorStop(.7, ink+'22'); gr.addColorStop(1, ink+'00'); x.fillStyle=gr; x.beginPath(); x.arc(cx+dx,cy+dy,R,0,7); x.fill(); } }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  TEX.set(key, t); return t;
}
function fabricMat(spec, opts={}){
  const f = FABRICS[spec.fabric] || FABRICS.poplin;
  const p = {roughness: f.rough, metalness: 0, side: THREE.DoubleSide};
  const color = opts.color || spec.color;
  if (S.viewer.fitMap && !opts.trim){ p.vertexColors = true; p.color = new THREE.Color(0xffffff); }
  else if (spec.fabricProduct?.image && !opts.trim){ p.map = photoTexture(spec.fabricProduct.image); }
  else if (spec.print && spec.print!=='solid' && !opts.trim){ p.map = printTexture(spec.print, color, spec.printColor||'#222222'); }
  else p.color = Viewer.lin(color);
  if (f.sheen > .2){ p.roughness = Math.max(.3, f.rough-.1); p.metalness = .05; }
  return new THREE.MeshStandardMaterial(p);
}
const FIT_COLORS = {ok:'#3E9B6E', snug:'#D99A2B', tight:'#C9452F', loose:'#4A7FC4', unknown:'#9a9a9a'};

/* ---------- garment builder ---------- */
function buildGarment(B, it, envAll){
  const env = envAll.frozen();
  const spec = it.spec, L = B.L, H = B.H, t = spec.template, circ = it.circ || {};
  const g = new THREE.Group();
  const m = B.m, gap = .7;
  const eC = (circ.chest ?? m.chest+10) - m.chest, eW = (circ.waist ?? m.waist+10) - m.waist, eH = (circ.hip ?? m.hip+10) - m.hip;
  const zStatus = it.zones ? Object.fromEntries(it.zones.map(z=>[z.k, z.status])) : {};
  const easeR = y => interp([[L.crotchY, eH],[L.hipY, eH],[L.waistY, eW],[L.chestY, eC],[L.armpitY, eC*.7],[L.shoulderY, 1.2],[L.neckY, 1.2]], y) / CF;
  const zoneAt = y => y > (L.chestY+L.waistY)/2 ? 'chest' : y > (L.waistY+L.hipY)/2 ? 'waist' : 'hip';
  const colorFor = (y, legs) => new THREE.Color(FIT_COLORS[zStatus[legs ? 'thigh' : zoneAt(y)] || 'ok']).convertSRGBToLinear();
  const isTop = ['top','tee','hoodie','jacket','dress','robe','suit'].includes(t);
  const isBottom = ['bottom','suit'].includes(t);
  const mat = fabricMat(spec);
  const solidMat = zone => S.viewer.fitMap ? new THREE.MeshStandardMaterial({color:Viewer.lin(FIT_COLORS[zStatus[zone]||'ok']), roughness:.8, side:THREE.DoubleSide}) : mat;
  const tileCm = 26;

  // ----- torso shell (tops, dresses, robes, jackets) -----
  if (isTop){
    const hem = t==='suit' ? hemY(B, spec.length==='hip'?'hip':spec.length, 'jacket') : hemY(B, spec.length, t);
    const flare = t==='robe' ? .16 : 0;
    const skirtFlare = {pencil:.02, 'a-line':.2, flared:.42, gathered:.32, wrap:.22}[spec.skirtShape] ?? .2;
    const isDress = t==='dress';
    const neckDrop = a => {
      const aw = Math.atan2(Math.sin(a), Math.cos(a)); const c = Math.max(0, Math.cos(aw));
      switch(spec.collar){
        case 'v-neck': return .12*H*Math.max(0, 1-Math.abs(aw)/.75);
        case 'scoop': return .085*H*Math.pow(c,3);
        case 'boat': return .025*H*Math.pow(c,.5);
        case 'notch-lapel': case 'peak-lapel': case 'shawl': return Math.max(0, (L.neckY-(L.waistY+.03*H)))*Math.max(0,1-Math.abs(aw)/.5);
        case 'none': return t==='robe' ? .03*H*c*c : .035*H*c*c;
        default: return (spec.closure==='wrap') ? .14*H*Math.max(0,1-Math.abs(aw)/.8) : .028*H*c*c;
      }
    };
    const shirtTail = (t==='top' && spec.category!=='uniform') ? .03*H : 0;
    const hemAt = a => hem - shirtTail*Math.pow(Math.cos(a),2);
    const topY = a => L.neckY + .004*H - neckDrop(a);
    const R = (y, a) => {
      let rx, rz;
      if (y >= L.crotchY || !(isDress || t==='robe' || t==='jacket' || t==='suit')){
        const yy = Math.max(y, L.crotchY);
        rx = B.torsoRx(yy) + Math.max(easeR(yy), .35);
        rz = (B.torsoRx(yy) + Math.max(easeR(yy), .35))*B.kAt(yy) + B.bustAt(yy, a)*.9;
      } else {
        const lr = B.legR(y), ex = Math.max(eH/CF, 1.2);
        rx = Math.max(B.legX + lr + ex, B.torsoRx(L.crotchY)+ex); rz = Math.max(lr + ex, (B.torsoRx(L.crotchY)+ex)*K_TORSO);
      }
      if (isDress && y < L.waistY){ const d = (L.waistY - y); const f = spec.skirtShape==='pencil' ? Math.max(0,(y<L.hipY? -0.04:0)) : skirtFlare; rx += d*f; rz += d*f*.9; }
      if (flare && y < L.hipY){ const d = L.hipY - y; rx += d*flare; rz += d*flare*.85; }
      if ((t==='jacket'||t==='suit') && y < L.hipY && spec.length!=='waist'){ const d = L.hipY - y; rx += d*.06; rz += d*.06; }
      const e = env.at(y); rx = Math.max(rx, e[0] ? e[0]+gap : 0); rz = Math.max(rz, e[1] ? e[1]+gap : 0);
      // soft drape folds below the waist for fluid fabrics
      const dr = (FABRICS[spec.fabric]||{}).drape || .4;
      if (y < L.hipY && (isDress || t==='robe' || t==='skirt')){ const amp = (L.hipY-y)*.02*dr*(spec.skirtShape==='gathered'?2.2:1); rx += Math.sin(a*14)*amp; rz += Math.sin(a*14)*amp; }
      return [rx, rz];
    };
    const rows = 70, segs = 64;
    const colors = [];
    const avgC = 2*Math.PI*B.torsoRx(L.waistY)*1.1;
    const geo = shellGeo(rows, segs, (v,u) => {
      const a = Math.PI + u*Math.PI*2;
      const y = lerp(topY(a), hemAt(a), v);
      const [rx, rz] = R(y, a);
      colors.push(colorFor(y));
      return [Math.sin(a)*rx, y, Math.cos(a)*rz, u*avgC/tileCm, y/tileCm];
    });
    if (S.viewer.fitMap){ const arr = []; colors.forEach(c=>arr.push(c.r,c.g,c.b)); geo.setAttribute('color', new THREE.Float32BufferAttribute(arr,3)); }
    g.add(new THREE.Mesh(geo, mat));
    envAll.add(L.neckY+5, hem-1, y => R(y, 0));

    // sleeves
    const sl = {none:0, cap:.1, short:.3, elbow:.5, 'three-quarter':.74, long:1.01, wide:.96}[spec.sleeve] ?? 0;
    if (sl > 0){
      const sEase = {slim:1.1, regular:1.8, relaxed:2.6, oversized:3.6, custom:2}[spec.fit] ?? 1.8;
      const len = sl*B.armLen;
      for (const s of [-1,1]){
        const arm = new THREE.Group();
        const sg = shellGeo(26, 28, (v,u) => {
          const tt = -2 + v*(len+2); const a = u*Math.PI*2;
          let r = B.armR(Math.max(tt,0)) + sEase + (t==='jacket'||t==='suit'?1:0) + (layerOf(spec)>=3?1.2:0);
          if (spec.sleeve==='wide') r = B.armR(0)+3 + Math.pow(v,1.3)*.17*H;
          if (t==='robe' && spec.sleeve!=='wide') r += v*2.5;
          return [Math.sin(a)*r, -tt, Math.cos(a)*r*.94, u*2*Math.PI*r/tileCm, tt/tileCm];
        });
        if (S.viewer.fitMap){ const n = sg.attributes.position.count, arr=[]; const cc = new THREE.Color(FIT_COLORS[zStatus.chest||'ok']).convertSRGBToLinear(); for(let i=0;i<n;i++) arr.push(cc.r,cc.g,cc.b); sg.setAttribute('color', new THREE.Float32BufferAttribute(arr,3)); }
        arm.add(new THREE.Mesh(sg, mat));
        const capR = B.armR(0) + sEase + .6;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(capR, 22, 14, 0, Math.PI*2, 0, Math.PI*.55), solidMat('chest')); arm.add(cap);
        if (['barrel','french','ribbed'].includes(spec.cuffs) && spec.sleeve==='long'){
          const cr = B.armR(len) + sEase + .5;
          const cuff = new THREE.Mesh(new THREE.CylinderGeometry(cr, cr, spec.cuffs==='ribbed'?5:6.5, 28, 1, true), fabricMat(spec,{trim:true, color:shade(spec.color, spec.cuffs==='ribbed'?-.12:-.04)}));
          cuff.position.y = -len + 3; arm.add(cuff);
        }
        arm.position.set(s*B.shoulderJoint.x, B.shoulderJoint.y, 0); arm.rotation.z = s*B.armAngle;
        g.add(arm);
      }
    }
    // collars
    const trimMat = fabricMat(spec, {trim:true, color:shade(spec.color, -.06)});
    const neckR = B.rNeck + 1.4 + (layerOf(spec)>=3 ? 1.2 : 0);
    if (['point','button-down','mandarin'].includes(spec.collar)){
      const band = new THREE.Mesh(new THREE.CylinderGeometry(neckR, neckR*1.06, spec.collar==='mandarin'?4:3.6, 32, 1, true), trimMat);
      band.position.y = L.neckY + .012*H; g.add(band);
      if (spec.collar!=='mandarin'){
        for (const s of [-1,1]){
          const pts = [new THREE.Vector3(s*.6, L.neckY+.01*H, neckR*.98), new THREE.Vector3(s*neckR*.95, L.neckY+.02*H, neckR*.3), new THREE.Vector3(s*(neckR*.45+2.2), L.neckY-.028*H, neckR+1.6)];
          g.add(triMesh(pts, trimMat));
        }
      }
    }
    if (['notch-lapel','peak-lapel','shawl'].includes(spec.collar)){
      const yBreak = L.waistY + .035*H, yTop = L.neckY;
      for (const s of [-1,1]){
        const rTop = R(yTop-2, s*.6), rB = R(yBreak, 0);
        const p0 = new THREE.Vector3(s*(neckR*.95), yTop+.004*H, rTop[1]*.25);
        const p1 = new THREE.Vector3(s*(B.rChest*.62), L.chestY+.035*H, R(L.chestY+.035*H, s*.7)[1]*.92+.8);
        const tip = spec.collar==='peak-lapel' ? new THREE.Vector3(s*(B.rChest*.72), L.chestY+.075*H, R(L.chestY,s*.7)[1]*.85+.9) : null;
        const p2 = new THREE.Vector3(s*.4, yBreak, rB[1]+.8);
        g.add(triMesh(tip?[p0,tip,p1,p2]:[p0,p1,p2], fabricMat(spec,{trim:true, color:shade(spec.color, .06)})));
      }
    }
    if (spec.collar==='hood'){
      const hood = new THREE.Mesh(new THREE.SphereGeometry(.08*H, 26, 16, Math.PI, Math.PI, .25*Math.PI, .55*Math.PI), solidMat('chest'));
      hood.scale.set(1, .9, .75); hood.position.set(0, L.neckY+.04*H, -B.rNeck*.9); g.add(hood);
    }
    if (spec.embroidery==='neckline' || spec.trims==='braid' || spec.trims==='piping'){
      const ec = spec.embroidery==='neckline' ? '#C9A227' : shade(spec.color,-.3);
      const pts=[]; for (let i=0;i<=48;i++){ const a = Math.PI + i/48*Math.PI*2; const y = topY(a)-1.2; const [rx,rz] = R(y,a); pts.push(new THREE.Vector3(Math.sin(a)*(rx+.25), y, Math.cos(a)*(rz+.25))); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false), 80, spec.embroidery==='neckline'?.9:.4, 6), new THREE.MeshStandardMaterial({color:Viewer.lin(ec), roughness:.4, metalness:.3})));
      if (spec.embroidery==='neckline' && t==='robe'){ // chest panel embroidery typical of agbada
        const pts2=[]; for (let i=0;i<=24;i++){ const y = lerp(topY(0)-1, L.chestY-.04*H, i/24); const a = Math.sin(i*1.3)*.18; const [rx,rz] = R(y,a); pts2.push(new THREE.Vector3(Math.sin(a)*(rx+.3), y, Math.cos(a)*(rz+.3))); }
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 60, .7, 6), new THREE.MeshStandardMaterial({color:Viewer.lin(ec), roughness:.4, metalness:.3})));
      }
    }
    // closures: buttons and zips on the centre front
    const btnMat = new THREE.MeshStandardMaterial({color:Viewer.lin(spec.buttonColor||'#222'), roughness:.35, metalness:.1});
    const placeOn = (y, a, extra=.5) => { const [rx,rz] = R(y,a); return new THREE.Vector3(Math.sin(a)*(rx+extra), y, Math.cos(a)*(rz+extra)); };
    if (spec.closure==='buttons' && spec.buttons>0){
      const lapel = ['notch-lapel','peak-lapel','shawl'].includes(spec.collar);
      const y0 = lapel ? L.waistY + .03*H : topY(0) - 2.2, y1 = lapel ? L.waistY - .03*H*(spec.buttons-1) : hemAt(0) + .05*H;
      for (let i=0;i<spec.buttons;i++){ const y = spec.buttons===1 ? y0 : lerp(y0, y1, i/(spec.buttons-1)); const b = new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.35,14), btnMat); b.position.copy(placeOn(y,0)); b.rotation.x = Math.PI/2; g.add(b); }
    }
    if (spec.closure==='double-breasted'){
      const rows2 = Math.max(1, Math.round((spec.buttons||6)/2));
      for (let i=0;i<rows2;i++) for (const s of [-1,1]){ const y = L.waistY + .05*H - i*.045*H; const b = new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.4,14), btnMat); b.position.copy(placeOn(y, s*.24)); b.lookAt(b.position.clone().multiplyScalar(2).setY(y)); b.rotateX(Math.PI/2); g.add(b); }
    }
    if (spec.closure==='zip'){
      const pts=[]; for (let i=0;i<=20;i++){ const y = lerp(topY(0)-.5, hemAt(0)+1, i/20); pts.push(placeOn(y,0,.3)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .35, 5), new THREE.MeshStandardMaterial({color:Viewer.lin('#9a958c'), roughness:.3, metalness:.6})));
    }
    // pockets
    const pocketMat = fabricMat(spec,{trim:true, color:shade(spec.color,-.05)});
    const pocket = (y, a, w, h) => { const p = placeOn(y, a, .35); const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, .5), pocketMat); box.position.copy(p); box.lookAt(new THREE.Vector3(p.x*2, y, p.z*2)); g.add(box); };
    if (spec.pockets==='chest') pocket(L.chestY+.01*H, .38, 11, 12.5);
    if (spec.pockets==='patch'){ pocket(L.hipY+.01*H, .55, 16, 17); pocket(L.hipY+.01*H, -.55, 16, 17); }
    if (spec.pockets==='flap'||spec.pockets==='welt'){ const hh = spec.pockets==='flap'?5.5:1.6; pocket(L.hipY+.025*H, .62, 15, hh); pocket(L.hipY+.025*H, -.62, 15, hh); if (t==='jacket'&&spec.category!=='coat') { pocket(L.chestY+.02*H, .42, 12, hh); pocket(L.chestY+.02*H, -.42, 12, hh); } }
    if (spec.pockets==='kangaroo') pocket(L.hipY+.035*H, 0, 30, 18);
  }

  // ----- trousers / shorts -----
  if (isBottom){
    const hem = hemY(B, t==='suit' ? 'floor' : spec.length, 'bottom');
    const top = L.waistY + (spec.waistband==='high' ? .035*H : 0);
    const rT = Math.max((circ.thigh ?? m.thigh+7)/(2*Math.PI), B.legR(L.crotchY-.02*H)+.4);
    const shape = spec.legShape || 'straight';
    const rKnee = {skinny:B.legR(L.kneeY)+.7, straight:rT*.8, tapered:rT*.7, wide:rT*1.02, flare:rT*.72}[shape];
    const rHem = {skinny:B.legR(L.ankleY)+.9, straight:rT*.76, tapered:rT*.58, wide:rT*1.12, flare:rT*1.05}[shape];
    const eWB = Math.max(((circ.waist ?? m.waist+2) - m.waist)/CF, .3), eHB = Math.max(((circ.hip ?? m.hip+6) - m.hip)/CF, .4);
    // pelvis
    const pel = shellGeo(18, 56, (v,u) => {
      const a = Math.PI + u*Math.PI*2; const y = lerp(top, L.crotchY - .02*H, v);
      const yy = Math.max(y, L.crotchY);
      const e = interp([[L.crotchY, eHB],[L.hipY, eHB],[L.waistY, eWB],[top, eWB]], yy);
      const rx = B.torsoRx(Math.min(yy, L.waistY)) + e;
      return [Math.sin(a)*rx, y, Math.cos(a)*rx*K_TORSO*1.02, u*2*Math.PI*rx/tileCm, y/tileCm];
    });
    const legCol = colorFor(0,true);
    if (S.viewer.fitMap){ const n = pel.attributes.position.count, arr=[]; const cc = new THREE.Color(FIT_COLORS[zStatus.hip||'ok']).convertSRGBToLinear(); for(let i=0;i<n;i++) arr.push(cc.r,cc.g,cc.b); pel.setAttribute('color', new THREE.Float32BufferAttribute(arr,3)); }
    g.add(new THREE.Mesh(pel, mat));
    for (const s of [-1,1]){
      const lg = shellGeo(46, 32, (v,u) => {
        const a = Math.PI + u*Math.PI*2; const y = lerp(L.crotchY + .015*H, hem, v);
        let r = interp([[hem, rHem],[L.kneeY, rKnee],[L.crotchY, rT]], y);
        r = Math.max(r, B.legR(y) + .5);
        return [s*B.legX + Math.sin(a)*r, y, Math.cos(a)*r*.96, u*2*Math.PI*r/tileCm, y/tileCm];
      });
      if (S.viewer.fitMap){ const n = lg.attributes.position.count, arr=[]; for(let i=0;i<n;i++) arr.push(legCol.r,legCol.g,legCol.b); lg.setAttribute('color', new THREE.Float32BufferAttribute(arr,3)); }
      g.add(new THREE.Mesh(lg, mat));
      if (spec.cuffs==='turn-up'){ const r = interp([[hem, rHem],[L.kneeY, rKnee],[L.crotchY, rT]], hem+2)+.35; const tu = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 4, 28, 1, true), fabricMat(spec,{trim:true,color:shade(spec.color,-.05)})); tu.position.set(s*B.legX, hem+2, 0); g.add(tu); }
    }
    if (spec.waistband!=='none'){
      const wr = B.torsoRx(L.waistY) + eWB + .45;
      const wb = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr*1.01, 4, 48, 1, true), fabricMat(spec,{trim:true, color:shade(spec.color,-.04)}));
      wb.scale.z = K_TORSO*1.02; wb.position.y = top - 2; g.add(wb);
    }
    if (spec.topstitch==='contrast'){
      for (const s of [-1,1]){ const pts=[]; for (let i=0;i<=24;i++){ const y = lerp(L.crotchY, hem+1, i/24); const r = Math.max(interp([[hem, rHem],[L.kneeY, rKnee],[L.crotchY, rT]], y), B.legR(y)+.5); pts.push(new THREE.Vector3(s*(B.legX + r + .1), y, 0)); } g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .18, 4), new THREE.MeshBasicMaterial({color:Viewer.lin('#D9A520')}))); }
    }
    envAll.add(top+1, hem, y => { const yy = Math.max(y, L.crotchY); const rx = B.torsoRx(yy)+eHB+.5; return [rx, rx*K_TORSO]; });
  }

  // ----- skirt -----
  if (t==='skirt'){
    const hem = hemY(B, spec.length, 'skirt');
    const top = L.waistY + (spec.waistband==='high'?.03*H:0);
    const fl = {pencil:-.02, 'a-line':.2, flared:.45, gathered:.3, wrap:.22}[spec.skirtShape] ?? .2;
    const eHB = Math.max(((circ.hip ?? m.hip+5) - m.hip)/CF, .6), eWB = Math.max(((circ.waist ?? m.waist+1) - m.waist)/CF, .3);
    const dr = (FABRICS[spec.fabric]||{}).drape || .4;
    const R = (y,a) => {
      let rx, rz;
      if (y >= L.crotchY){ const e = interp([[L.hipY,eHB],[L.waistY,eWB]], y); rx = B.torsoRx(y)+e; rz = rx*K_TORSO; }
      else { const lr = B.legR(y); rx = Math.max(B.legX + lr + 1, B.torsoRx(L.crotchY)+eHB); rz = Math.max(lr+1.2, (B.torsoRx(L.crotchY)+eHB)*K_TORSO); }
      if (y < L.hipY){ const d = L.hipY-y; rx += d*fl; rz += d*fl*.9; const amp = d*.025*dr*(spec.skirtShape==='gathered'?2:1); rx += Math.sin(a*12)*amp; rz += Math.sin(a*12)*amp; }
      if (spec.skirtShape==='pencil' && y < L.hipY){ const lr = B.legR(y); rx = Math.max(rx, B.legX + lr + .8); rz = Math.max(rz, lr+1); }
      return [rx, rz];
    };
    const avgC = 2*Math.PI*B.torsoRx(L.hipY);
    const geo = shellGeo(40, 64, (v,u) => { const a = Math.PI+u*Math.PI*2, y = lerp(top, hem, v); const [rx,rz]=R(y,a); return [Math.sin(a)*rx, y, Math.cos(a)*rz, u*avgC/tileCm, y/tileCm]; });
    if (S.viewer.fitMap){ const n = geo.attributes.position.count, arr=[]; const cc = new THREE.Color(FIT_COLORS[zStatus.hip||'ok']).convertSRGBToLinear(); for(let i=0;i<n;i++) arr.push(cc.r,cc.g,cc.b); geo.setAttribute('color', new THREE.Float32BufferAttribute(arr,3)); }
    g.add(new THREE.Mesh(geo, mat));
    const wr = B.torsoRx(L.waistY)+eWB+.4; const wb = new THREE.Mesh(new THREE.CylinderGeometry(wr,wr,3.5,48,1,true), fabricMat(spec,{trim:true,color:shade(spec.color,-.05)})); wb.scale.z = K_TORSO; wb.position.y = top-1.8; g.add(wb);
    envAll.add(top+1, hem, y => R(y,0));
  }
  return g;
}
function triMesh(pts, mat){
  const pos = []; for (let i=1;i<pts.length-1;i++){ pos.push(...pts[0].toArray(), ...pts[i].toArray(), ...pts[i+1].toArray()); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
function shade(hex, amt){
  const n = parseInt(String(hex).replace('#',''),16); if (isNaN(n)) return hex;
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  const f = v => clamp(Math.round(amt<0 ? v*(1+amt) : v + (255-v)*amt), 0, 255);
  return '#'+[f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
}

const PHOTO_TEX = new Map();
function photoTexture(url){
  if (PHOTO_TEX.has(url)) return PHOTO_TEX.get(url);
  const t = new THREE.Texture(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.repeat.set(.55, .55);
  const img = new Image(); img.onload = () => { t.image = img; t.needsUpdate = true; Viewer.dirty = true; }; img.src = url;
  PHOTO_TEX.set(url, t); return t;
}
