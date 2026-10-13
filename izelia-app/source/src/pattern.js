/* ================= PATTERN DRAFTING + WORKSHOP =================
   Simplified block drafting from the body model. Every result is marked as a
   draft until a tailor validates it; nothing here claims production accuracy. */

function qbez(p0, c, p1, n=8){ const out=[]; for (let i=1;i<=n;i++){ const t=i/n; out.push([(1-t)*(1-t)*p0[0]+2*(1-t)*t*c[0]+t*t*p1[0], (1-t)*(1-t)*p0[1]+2*(1-t)*t*c[1]+t*t*p1[1]]); } return out; }
function polyArea(p){ let a=0; for (let i=0;i<p.length;i++){ const [x1,y1]=p[i], [x2,y2]=p[(i+1)%p.length]; a += x1*y2-x2*y1; } return a/2; }
function bbox(p){ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for (const [x,y] of p){ x0=Math.min(x0,x); y0=Math.min(y0,y); x1=Math.max(x1,x); y1=Math.max(y1,y); } return {x0,y0,x1,y1,w:x1-x0,h:y1-y0}; }
function rectPoly(w,h){ return [[0,0],[w,0],[w,h],[0,h]]; }
function offsetPoly(p, d){
  const n = p.length, out = [];
  const sgn = polyArea(p) > 0 ? 1 : -1; // y-down coordinates: positive area = clockwise on screen
  for (let i=0;i<n;i++){
    const a = p[(i-1+n)%n], b = p[i], c = p[(i+1)%n];
    const n1 = norm([ (b[1]-a[1]), -(b[0]-a[0]) ]), n2 = norm([ (c[1]-b[1]), -(c[0]-b[0]) ]);
    let nx = n1[0]+n2[0], ny = n1[1]+n2[1]; const l = Math.hypot(nx,ny) || 1; nx/=l; ny/=l;
    const cos = nx*n1[0]+ny*n1[1]; const k = clamp(1/(cos||1), 1, 2.2);
    out.push([b[0] - sgn*nx*d*k, b[1] - sgn*ny*d*k]);
  }
  return out;
}
function norm(v){ const l = Math.hypot(v[0],v[1])||1; return [v[0]/l, v[1]/l]; }

function finishedMeasurements(prof, spec, B){
  const fit = computeFit(prof, spec, null);
  const m = B.m, L = B.L, H = B.H;
  const sl = {none:0, cap:.12, short:.3, elbow:.5, 'three-quarter':.75, long:1.0, wide:.95}[spec.sleeve] ?? 0;
  const hem = hemY(B, spec.template==='suit' ? 'hip' : spec.length, spec.template==='suit'?'jacket':spec.template);
  return {fit, chest:fit.circ.chest, waist:fit.circ.waist, hip:fit.circ.hip, thigh:fit.circ.thigh,
    length: L.neckY - hem, sleeve: sl*m.armLength, skirtLength: L.waistY - hemY(B, spec.length, 'skirt'),
    outseam: L.waistY - hemY(B, spec.template==='suit'?'floor':spec.length, 'bottom') + (spec.waistband==='high'?.035*H:0)};
}

function draftPattern(prof, spec){
  const B = bodyGeom(prof), m = B.m, L = B.L, H = B.H;
  const F = finishedMeasurements(prof, spec, B);
  const t = spec.template;
  const pieces = [], notes = [];
  const add = (name, poly, o={}) => pieces.push(Object.assign({name, poly, qty:2, fold:false, mat:'main', grain:'length', hem:false, interface:false, crossOK:false}, o));
  const isOpen = ['buttons','double-breasted','zip','wrap'].includes(spec.closure);
  const ext = {buttons:1.8, 'double-breasted':7.5, zip:0, wrap:14}[spec.closure] || 0;

  const bodice = (opts) => {
    const jacket = opts.jacket, GL = opts.length;
    const W = F.chest/4 + (jacket?.8:0), Ww = F.waist/4, Wh = F.hip/4;
    const NW = m.neck/6 + (jacket?1.2:.6), AD = m.chest/8 + (jacket?11.5:t==='tee'||t==='hoodie'?9:10.2);
    const SL = Math.max(m.shoulder/2 - NW + (jacket?1.5:.5), 7), SD = 4.5;
    const wl = m.torsoLength, hl = wl + (L.waistY - L.hipY);
    const shaped = ['slim','regular'].includes(spec.fit) && ['top','dress','jacket','suit'].includes(t);
    const side = (yy) => yy < wl ? lerp(W, shaped?Math.max(Ww,W*.84):W, smooth(clamp((yy-AD)/(wl-AD),0,1))) : yy < hl ? lerp(shaped?Math.max(Ww,W*.84):W, Math.max(Wh,W), smooth((yy-wl)/(hl-wl||1))) : Math.max(Wh,W) + (yy-hl)*(opts.flare||0);
    const sidePts = []; for (let yy=AD+4; yy<GL; yy+=6) sidePts.push([side(yy), yy]); sidePts.push([side(GL), GL]);
    const fnd = {crew:NW+1.5, 'v-neck':.12*H, scoop:.085*H, boat:3, 'notch-lapel':m.torsoLength*.62, 'peak-lapel':m.torsoLength*.6, shawl:m.torsoLength*.6, none:NW+1, hood:NW+1.5, mandarin:NW+.5, point:NW+.5, 'button-down':NW+.5}[spec.collar] ?? NW+1;
    const back = [[0,2], ...qbez([0,2],[NW*.8,2],[NW,0],6), [NW+SL, SD], ...qbez([NW+SL,SD],[W-1.2,AD-6],[W,AD],8), ...sidePts, [0, GL]];
    const fx = isOpen ? -ext : 0;
    const front = [[fx, fnd], [0, fnd], ...qbez([0,fnd],[NW*.9,fnd*.35],[NW,0],8), [NW+SL, SD], ...qbez([NW+SL,SD],[W-2,AD-4],[W,AD],8), ...sidePts, [fx, GL]];
    if (fx===0){ front.shift(); }
    return {back, front, AD, W, NW, GL};
  };
  const sleeve = (AD, jacket) => {
    const ratio = {cap:.12, short:.3, elbow:.5, 'three-quarter':.75, long:1.0, wide:.95}[spec.sleeve] ?? 0;
    if (!ratio) return;
    const CH = AD*(jacket?.66:t==='tee'||t==='hoodie'?.46:.55);
    const SW = m.upperArm + ({slim:5, regular:8, relaxed:12, oversized:18, custom:9}[spec.fit]||8) + (jacket?3:0);
    const len = ratio*m.armLength - (spec.cuffs==='barrel'||spec.cuffs==='french' ? 5 : spec.cuffs==='ribbed'?6:0);
    let WW = spec.sleeve==='wide' ? SW*2.4 : ratio>=.95 ? m.wrist + (spec.cuffs==='barrel'||spec.cuffs==='french'?13:jacket?12:9) : lerp(SW, m.wrist+12, ratio)*.98;
    WW = Math.min(WW, spec.sleeve==='wide'?SW*2.4:SW);
    const poly = [[0,CH], ...qbez([0,CH],[SW*.18,CH*.15],[SW/2,0],8), ...qbez([SW/2,0],[SW*.82,CH*.15],[SW,CH],8), [SW-(SW-WW)/2, CH+len], [(SW-WW)/2, CH+len]];
    add(jacket?'Sleeve (top + under)':'Sleeve', poly, {qty:2, hem:true, notches:[[SW/2,0]]});
    if (jacket && spec.lining!=='none') add('Sleeve lining', poly, {qty:2, mat:'lining'});
  };
  const collars = () => {
    const n = m.neck;
    if (spec.collar==='point'||spec.collar==='button-down'){ add('Collar', rectPoly(n/2+5, 8), {qty:2, fold:true, interface:true}); add('Collar stand', rectPoly(n/2+3.5, 4), {qty:2, fold:true, interface:true}); }
    if (spec.collar==='mandarin') add('Mandarin band', rectPoly(n/2+3.5, 4.5), {qty:2, fold:true, interface:true});
    if (['notch-lapel','peak-lapel','shawl'].includes(spec.collar)){ add('Upper collar', rectPoly(n/2+4, 8), {qty:1, fold:true, interface:true}); add('Under collar', rectPoly(n/2+4, 8), {qty:2, interface:true}); }
    if (spec.collar==='hood'){ const hh = .21*H, hw = .155*H; add('Hood side', [[0,0],[hw*.8,0], ...qbez([hw*.8,0],[hw*1.1,hh*.2],[hw,hh*.55],6), [hw*.7,hh],[0,hh]], {qty:2}); }
  };
  const cuffs = () => {
    if (spec.sleeve!=='long') return;
    if (spec.cuffs==='barrel') add('Cuff', rectPoly(m.wrist+6, 7), {qty:4, interface:true, crossOK:true});
    if (spec.cuffs==='french') add('French cuff', rectPoly(m.wrist+6, 14), {qty:4, interface:true, crossOK:true});
    if (spec.cuffs==='ribbed') add('Rib cuff', rectPoly(m.wrist*.8, 12), {qty:2, mat:'rib'});
  };
  const pockets = (jacket) => {
    if (spec.pockets==='chest') add('Chest pocket', rectPoly(12.5, 15), {qty:1});
    if (spec.pockets==='patch') add('Patch pocket', rectPoly(17, 19), {qty:2});
    if (spec.pockets==='flap'){ add('Pocket flap', rectPoly(16, 6), {qty:jacket?4:2, interface:true}); add('Pocket bag', rectPoly(17, 22), {qty:4, mat:'pocketing'}); }
    if (spec.pockets==='welt'){ add('Welt', rectPoly(16, 5), {qty:2, interface:true}); add('Pocket bag', rectPoly(17, 22), {qty:4, mat:'pocketing'}); }
    if (spec.pockets==='kangaroo') add('Kangaroo pocket', [[4,0],[30,0],[34,22],[0,22]], {qty:1});
  };
  const trousers = () => {
    const rise = Math.max(m.frontRise ? m.frontRise : (L.waistY - L.crotchY) + 1.5, 18) + (spec.waistband==='high'?.035*H:0);
    const OL = F.outseam;
    const Hq = F.hip/4, Wf = F.waist/4 + (spec.pleats==='double'?6:spec.pleats==='single'?3:0), Wb = F.waist/4 + 2;
    const ceF = m.hip/16, ceB = m.hip/10;
    const hipD = (L.waistY - L.hipY) + (spec.waistband==='high'?.035*H:0);
    const kneeY = L.waistY - L.kneeY + (spec.waistband==='high'?.035*H:0);
    const thigh = (F.thigh || m.thigh+7);
    const sh = spec.legShape||'straight';
    const kneeW = {skinny:m.knee+3, straight:thigh*.82, tapered:thigh*.7, wide:thigh*1.02, flare:thigh*.72}[sh];
    const hemW = {skinny:m.ankle+6, straight:thigh*.76, tapered:thigh*.58, wide:thigh*1.12, flare:thigh*1.06}[sh];
    const short = OL < kneeY;
    const mk = (back) => {
      const ce = back?ceB:ceF, Wq = back?Wb:Wf;
      const crease = (Hq+ce)/2 + (back?1:0);
      const kW = (back? kneeW/4+1 : kneeW/4-1), hW = (back? hemW/4+1 : hemW/4-1);
      const topCB = back ? -2.5 : 0;
      const legW = short ? lerp((Hq+ce)/2, kW, OL/kneeY) : hW;
      const pts = [[Hq - Wq, back?.5:0], [Hq-(back?1.5:.5), topCB], [Hq, rise - ce*1.1], ...qbez([Hq, rise-ce*1.1],[Hq+ce*.15, rise],[Hq+ce, rise],6)];
      if (short) pts.push([crease+legW, OL], [crease-legW, OL]);
      else pts.push([crease+kW, kneeY], [crease+hW, OL], [crease-hW, OL], [crease-kW, kneeY]);
      pts.push([0, hipD]);
      return pts;
    };
    add('Trouser front', mk(false), {qty:2, hem:true, notches:[[0,hipD]], nest:ceF*.8});
    add('Trouser back', mk(true), {qty:2, hem:true, notches:[[0,hipD]], nest:ceB*.8});
    if (spec.waistband!=='none') add(spec.waistband==='elastic'?'Elastic casing':'Waistband', rectPoly(8, F.waist + 4), {qty:1, interface:spec.waistband!=='elastic', crossOK:false});
    if (spec.pockets==='five-pocket'){ add('Front pocket facing', rectPoly(16,14), {qty:2}); add('Back patch pocket', [[0,0],[14,0],[14,13],[7,15.5],[0,13]], {qty:2}); add('Coin pocket', rectPoly(8,8), {qty:1}); add('Pocket bag', rectPoly(17,26), {qty:2, mat:'pocketing'}); add('Back yoke', [[0,0],[Hq*.9,2],[Hq*.9,7],[0,4]], {qty:2}); }
    else if (spec.pockets!=='none'){ add('Pocket bag', rectPoly(17,30), {qty:4, mat:'pocketing'}); }
    if (spec.closure==='zip'){ add('Fly facing', rectPoly(5, 20), {qty:1, interface:true}); add('Fly shield', rectPoly(7,20), {qty:1}); }
    if (spec.cuffs==='turn-up') notes.push('Turn-ups add 9 cm to each leg length; already included in the hem allowance.');
  };
  const skirtPanels = (waistDepth=0) => {
    const SKL = F.skirtLength - waistDepth;
    const Wq = F.waist/4 + (spec.skirtShape==='pencil'?2.5:1), Hq = F.hip/4, hipD = L.waistY - L.hipY;
    const fl = {pencil:-.03, 'a-line':.18, flared:.42, gathered:0, wrap:.2}[spec.skirtShape] ?? .18;
    if (spec.skirtShape==='gathered'){ const gw = F.hip*.8; add('Skirt panel (gathered)', rectPoly(gw/2, SKL), {qty:2, fold:true, hem:true}); return; }
    const hemW = Math.max(Hq + (SKL-hipD)*fl, Hq*.9);
    const p = [[0,0],[Wq,.8], ...qbez([Wq,.8],[Hq,hipD*.4],[Hq,hipD],5), [hemW, SKL], ...qbez([hemW,SKL],[hemW/2,SKL+(fl>0?2:0)],[0,SKL],5)];
    add('Skirt front', p, {qty:1, fold:true, hem:true});
    add('Skirt back', p.map(([x,y])=>[x,y]), {qty:1, fold:spec.closure!=='zip', hem:true});
    if (spec.skirtShape==='wrap') add('Wrap overlay', p, {qty:1, fold:true, hem:true});
  };

  if (['top','tee','hoodie'].includes(t)){
    const hem = hemY(B, spec.length, t);
    const b = bodice({length: L.neckY - hem + (t==='top'?3:0)});
    add('Back', b.back, {qty:1, fold:true, hem:true, notches:[[b.W,b.AD]]});
    add('Front', b.front, isOpen ? {qty:2, hem:true, notches:[[b.W,b.AD]]} : {qty:1, fold:true, hem:true, notches:[[b.W,b.AD]]});
    if (spec.closure==='buttons') add('Button band facing', rectPoly(4, b.GL), {qty:2, interface:true});
    sleeve(b.AD, false); collars(); cuffs(); pockets(false);
    if (t==='tee' && ['crew','v-neck','scoop'].includes(spec.collar)) add('Neck binding', rectPoly(m.neck*.9, 4.5), {qty:1, mat:'rib', crossOK:true});
    if (t==='hoodie') add('Hem rib', rectPoly(F.hip*.85, 12), {qty:1, mat:'rib', crossOK:true});
  }
  if (t==='jacket' || t==='suit'){
    const hem = hemY(B, spec.length==='floor'?'knee':spec.length, 'jacket');
    const b = bodice({length: L.neckY - hem, jacket:true, flare:.05});
    add('Back', b.back, {qty:2, hem:true, notches:[[b.W,b.AD]]});
    add('Front', b.front, {qty:2, hem:true, interface:true, notches:[[b.W,b.AD]]});
    add('Front facing', rectPoly(9, b.GL), {qty:2, interface:true});
    add('Back neck facing', rectPoly(b.NW*2+6, 7), {qty:1, fold:true, interface:true});
    sleeve(b.AD, true); collars(); cuffs(); pockets(true);
    if (spec.lining!=='none'){
      const lf = spec.lining==='half' ? .55 : 1;
      add('Back lining', b.back.map(([x,y])=>[x, Math.min(y, b.GL*lf)]), {qty:2, mat:'lining'});
      add('Front lining', b.front.map(([x,y])=>[Math.max(x,9-ext), Math.min(y, b.GL*lf)]), {qty:2, mat:'lining'});
    }
    if (t==='suit') trousers();
  }
  if (t==='bottom') trousers();
  if (t==='skirt'){ skirtPanels(); if (spec.waistband!=='none') add('Waistband', rectPoly(7, F.waist+4), {qty:1, interface:true}); if (spec.lining!=='none') notes.push('Skirt lining: cut front and back again in lining, 3 cm shorter.'); }
  if (t==='dress'){
    if (spec.skirtShape==='pencil'){
      const hem = hemY(B, spec.length, 'dress');
      const b = bodice({length: L.neckY - hem, flare:.03});
      add('Back', b.back, {qty:2, hem:true}); add('Front', b.front, {qty:1, fold:true, hem:true});
      sleeve(b.AD, false);
    } else {
      const b = bodice({length: m.torsoLength + 1.5});
      add('Bodice back', b.back, {qty:spec.closure==='zip'?2:1, fold:spec.closure!=='zip'}); add('Bodice front', b.front, spec.closure==='wrap'?{qty:2}:{qty:1, fold:true});
      sleeve(b.AD, false); skirtPanels();
    }
    collars(); pockets(false);
    if (['v-neck','scoop','boat','crew'].includes(spec.collar)) add('Neck facing', rectPoly(m.neck/2+6, 6), {qty:2, interface:true});
    if (spec.closure==='wrap') add('Wrap tie', rectPoly(6, 120), {qty:2, crossOK:true});
  }
  if (t==='robe'){
    const hem = hemY(B, spec.length, 'robe');
    const GL = L.neckY - hem;
    if (spec.sleeve==='wide'){
      const span = Math.min(2*(m.armLength*.95 + m.shoulder/2), 190);
      const half = span/2, NW = m.neck/6+1.5;
      const poly = [[0,0],[half,0],[half, GL*2],[0,GL*2]];
      add('Agbada body (folded at shoulder)', poly, {qty:1, fold:true, hem:true, notches:[[NW,GL]]});
      add('Neck facing', rectPoly(28, 34), {qty:1, interface:true});
      add('Inner kaftan (estimate)', rectPoly(F.chest/4+6, GL-8), {qty:2, fold:true, hem:true});
      notes.push('The agbada body is one wide piece folded across the shoulders; the neck opening is cut after embroidery is placed.');
      notes.push('A full agbada set also includes an inner kaftan and sokoto trousers. The inner kaftan is estimated; sokoto are not included.');
    } else {
      const b = bodice({length: GL, flare:.12});
      add('Back', b.back, {qty:1, fold:true, hem:true}); add('Front', b.front, {qty:1, fold:true, hem:true});
      sleeve(b.AD, false); collars(); pockets(false);
      add('Side gusset', [[0,0],[6,0],[14,40],[0,40]], {qty:2});
    }
  }
  if (spec.embroidery!=='none') notes.push(`Embroidery (${spec.embroidery}) is placed after cutting and before construction; allow extra stabiliser.`);
  if (spec.seams==='flat-felled') notes.push('Flat-felled seams: use 1.5 cm seam allowance on the felled seams.');
  if (spec.seams==='french') notes.push('French seams: use 1.5 cm seam allowance (0.6 + 0.9 cm).');
  return {pieces, notes, finished:F, body:B};
}

/* ---------- cutting layout on folded fabric (double layer) ----------
   Fabric is folded selvedge to selvedge. Fold pieces sit on the fold; every
   other piece is cut through both layers, giving a mirrored pair. */
function layoutPieces(pieces, mat, width, opts){
  const sa = opts.sa, ha = opts.ha;
  const half = width/2 - 1; // selvedge trim
  const rects = [], warnings = [];
  for (const p of pieces.filter(p=>p.mat===mat)){
    const bb = bbox(p.poly);
    const w = bb.w + (p.fold ? sa : sa*2) - (p.nest||0), h = bb.h + sa*2 + (p.hem ? ha - sa : 0);
    const n = p.fold ? p.qty : Math.ceil(p.qty/2);
    for (let i=0;i<n;i++) rects.push({p, w, h, bb, fold:p.fold});
  }
function packOnce(rects){
    const warnings = [];
    let sky = [{x:0, y:0, w:half}];
    const placed = [];
    const fitsAt = (i, w) => { let x = sky[i].x, y = 0, need = w, j = i; if (x + w > half + .01) return null; while (need > .01 && j < sky.length){ y = Math.max(y, sky[j].y); need -= (sky[j].x + sky[j].w) - Math.max(x, sky[j].x); j++; } return need > .01 ? null : y; };
    for (const r of rects){
      let w = r.w, h = r.h, rot = false;
      const tryPlace = (ww) => { let best = null; for (let i=0;i<sky.length;i++){ if (r.fold && sky[i].x !== 0) continue; const y = fitsAt(i, ww); if (y==null) continue; if (!best || y < best.y - .01 || (Math.abs(y-best.y)<.01 && sky[i].x < best.x)) best = {x:sky[i].x, y}; } return best; };
      let pos = tryPlace(w);
      if (!pos && r.p.crossOK && h <= half){ [w,h] = [h,w]; rot = true; pos = tryPlace(w); }
      if (!pos){
        const maxY = Math.max(...sky.map(s=>s.y));
        pos = {x:0, y:maxY};
        warnings.push(`${r.p.name} is ${r1(r.fold? w*2 : w)} cm wide, wider than this fabric allows${r.fold?' on the fold':''}. Use fabric at least ${Math.ceil((r.fold?w*2:w*2)+2)} cm wide or add a seam.`);
      }
      placed.push({x:pos.x, y:pos.y, w, h, rot, p:r.p, bb:r.bb, fold:r.fold});
      // update skyline
      const nx = pos.x, nw = Math.min(w, half - pos.x), ny = pos.y + h;
      const next = [];
      for (const s of sky){
        const s0 = s.x, s1 = s.x + s.w;
        if (s1 <= nx || s0 >= nx + nw){ next.push(s); continue; }
        if (s0 < nx) next.push({x:s0, y:s.y, w:nx - s0});
        if (s1 > nx + nw) next.push({x:nx+nw, y:s.y, w:s1-(nx+nw)});
      }
      next.push({x:nx, y:ny, w:nw});
      next.sort((a,b)=>a.x-b.x);
      sky = [];
      for (const s of next){ const l = sky[sky.length-1]; if (l && Math.abs(l.y - s.y) < .01 && Math.abs(l.x + l.w - s.x) < .01) l.w += s.w; else if (s.w > .01) sky.push({...s}); }
    }
    return {placed, warnings, length: placed.length ? Math.max(...placed.map(p=>p.y+p.h)) : 0};
  }
  const orders = [
    (a,b)=> (b.h - a.h) || (b.w - a.w),
    (a,b)=> (b.h*b.w - a.h*a.w),
    (a,b)=> (b.fold - a.fold) || (b.h - a.h),
    (a,b)=> (b.w - a.w) || (b.h - a.h),
  ];
  let best = null;
  for (const ord of orders){
    const res = packOnce([...rects].sort(ord));
    if (!best || res.length < best.length - .01) best = res;
  }
  const {placed} = best; warnings.push(...best.warnings);
  const length = placed.length ? Math.max(...placed.map(p=>p.y+p.h)) : 0;
  const used = placed.reduce((a,r)=> a + Math.abs(polyArea(r.p.poly)) * (r.fold?2:2), 0);
  return {placed, length, half, warnings: [...new Set(warnings)], usedArea: used, fabricArea: length*width};
}

function calcMaterials(prof, spec, opts){
  const d = draftPattern(prof, spec);
  const f = FABRICS[spec.fabric] || FABRICS.poplin;
  const width = opts.width || f.w;
  const sa = opts.sa ?? 1.5, ha = opts.ha ?? (['jacket','suit'].includes(spec.template)?4:3);
  const directional = f.nap || DIRECTIONAL_PRINTS.includes(spec.print);
  const repeat = opts.repeat || (DIRECTIONAL_PRINTS.includes(spec.print) ? ({stripe:4, check:8, geometric:12, wax:16}[spec.print]||0) : 0);
  const main = layoutPieces(d.pieces, 'main', width, {sa, ha});
  const majorPieces = d.pieces.filter(p=>p.mat==='main' && bbox(p.poly).h > 40).length;
  const napExtra = directional ? main.length*.04 : 0;
  const repeatExtra = repeat ? repeat * Math.max(1, Math.ceil(majorPieces/2)) : 0;
  const shrink = ['linen','poplin','oxford','gara','ankara','denim','chino','canvas','jersey'].includes(spec.fabric) ? .04 : .02;
  const waste = opts.waste ?? .05;
  const mainM = (main.length + napExtra + repeatExtra) * (1 + shrink + waste) / 100;
  const out = {draft:d, width, sa, ha, directional, repeat, main, mainM, rows:[], notions:[], assumptions:[], missing:[], warnings:[...main.warnings]};
  out.rows.push({k:'main', label:f.name, m:mainM, width, price:opts.prices?.main});
  const sub = (mat, label, w, priceKey) => { if (!d.pieces.some(p=>p.mat===mat)) return null; const l = layoutPieces(d.pieces, mat, w, {sa, ha:sa}); const mm = l.length*(1+waste)/100; out.rows.push({k:mat, label, m:mm, width:w, price:opts.prices?.[priceKey]}); out[mat]=l; out.warnings.push(...l.warnings); return mm; };
  sub('lining', 'Lining', 140, 'lining');
  sub('pocketing', 'Pocketing', 140, null);
  sub('rib', 'Rib knit', 100, null);
  const intArea = d.pieces.filter(p=>p.interface).reduce((a,p)=>{ const bb = bbox(p.poly); return a + (bb.w+2*sa)*(bb.h+2*sa)*p.qty; }, 0);
  if (intArea){ const im = Math.max(.25, intArea/90/100*1.25); out.rows.push({k:'interfacing', label:'Fusible interfacing', m:im, width:90, price:opts.prices?.interfacing}); }
  // notions
  const N = (label, qty, unit) => out.notions.push({label, qty, unit});
  let btn = 0;
  if (spec.closure==='buttons') btn += spec.buttons||0;
  if (spec.closure==='double-breasted') btn += (spec.buttons||6) + 1;
  if (spec.sleeve==='long' && spec.cuffs==='barrel') btn += 2;
  if (spec.collar==='button-down') btn += 2;
  if (['jacket','suit'].includes(spec.template) && spec.sleeve==='long') btn += 6;
  if (['bottom','suit'].includes(spec.template) && spec.waistband!=='elastic') btn += 1;
  if (btn) N('Buttons', btn + 2, `incl. 2 spare`);
  if (spec.closure==='zip' && ['top','tee','hoodie','jacket'].includes(spec.template)) N('Open-ended zip', 1, `${Math.round(finishedMeasurements(prof,spec,d.body).length/2.54)*2.54|0} cm`);
  if (['bottom','suit'].includes(spec.template) && spec.waistband!=='elastic') N('Fly zip', 1, spec.waistband==='high'?'20 cm':'18 cm');
  if (spec.template==='skirt' || (spec.template==='dress' && spec.closure==='zip')) N('Invisible zip', 1, spec.template==='dress'?'55 cm':'20 cm');
  if (spec.waistband==='elastic') N('Elastic 3 cm', 1, `${Math.round(d.body.m.waist*.9)} cm`);
  if (spec.waistband==='drawstring') N('Drawcord', 1, `${Math.round(d.body.m.waist+60)} cm`);
  if (['bottom','suit','skirt'].includes(spec.template) && spec.waistband!=='elastic') N('Hook and bar', 1, 'set');
  if (spec.pockets==='five-pocket') N('Rivets', 6, 'pcs');
  const seamLen = d.pieces.reduce((a,p)=>{ let per=0; for (let i=0;i<p.poly.length;i++){ const [x1,y1]=p.poly[i],[x2,y2]=p.poly[(i+1)%p.poly.length]; per += Math.hypot(x2-x1,y2-y1);} return a + per*p.qty; }, 0)/2/100;
  const spools = Math.max(1, Math.ceil(seamLen*4/500*1.5 + (spec.seams==='overlocked'?0:0)));
  N('All-purpose thread', spools, '500 m spool');
  if (spec.seams==='overlocked') N('Overlocker thread', 3, 'cones');
  if (spec.topstitch!=='none') N(spec.topstitch==='contrast'?'Contrast topstitch thread':'Topstitch thread', 1, 'spool');
  if (spec.embroidery!=='none') N('Embroidery thread', spec.embroidery==='all-over'?6:2, 'spools');
  if (spec.embroidery!=='none') N('Tear-away stabiliser', 1, '0.5 m');
  if (['jacket','suit'].includes(spec.template)) N('Shoulder pads', 1, 'pair');
  if (spec.trims==='piping') N('Piping cord', 1, `${Math.round(seamLen*25)} cm`);
  if (spec.trims==='braid') N('Braid trim', 1, `${Math.round(seamLen*30)} cm`);
  // assumptions
  if (spec.fabricProduct){ out.assumptions.push(`Main fabric: IZELIA ${spec.fabricProduct.name}, listed at ${priceFmt(spec.fabricProduct.price)} per item. Its selling unit and width aren’t published, so its cost isn’t calculated and ${Units.show(width,0)} width is an assumption; set the real width above.`); out.rows[0].label = 'IZELIA ' + spec.fabricProduct.name; out.rows[0].price = null; }
  out.assumptions.push(`Fabric folded selvedge to selvedge; ${f.name} at ${Units.show(width,0)} wide.`);
  out.assumptions.push(`Seam allowance ${Units.show(sa)}, hem allowance ${Units.show(ha)}.`);
  out.assumptions.push(`${Math.round(shrink*100)}% allowance for shrinkage${shrink>.03?' (pre-wash before cutting)':''} and ${Math.round(waste*100)}% for cutting waste.`);
  if (directional) out.assumptions.push(`One-way layout for ${f.nap?'napped fabric':'a directional print'}: +4% length.`);
  if (repeat) out.assumptions.push(`Pattern matching with a ${Units.show(repeat,0)} repeat: +${Units.show(repeatExtra,0)}.`);
  out.assumptions.push('Pieces are block drafts from your measurements. Darts, pleat depths and curves need a tailor\'s check before cutting.');
  out.missing = (REQ[spec.template]||[]).filter(k=>prof.m?.[k]==null).map(k=>MBYK[k].label);
  if (out.missing.length) out.assumptions.push('Missing measurements were estimated from height, so quantities may change once you add them.');
  out.yards = mainM/0.9144;
  if (f.piece) out.pieces6yd = Math.ceil(out.yards/6);
  out.cost = out.rows.reduce((a,r)=> r.price ? a + r.price*(Units.sys==='in' ? r.m/0.9144 : r.m) : a, 0);
  out.costComplete = out.rows.every(r => r.k==='pocketing'||r.k==='rib' || r.price);
  out.wastePct = main.fabricArea ? clamp(1 - main.usedArea/main.fabricArea, 0, .9) : 0;
  out.confidence = out.missing.length ? 'Low' : prof.verified ? 'Medium' : 'Medium–low';
  return out;
}

/* ---------- SVG renderers ---------- */
function pieceSVG(p, sa, opts={}){
  const bb = bbox(p.poly), pad = sa + 3;
  const cut = offsetPoly(p.poly, sa);
  const cb = bbox(cut);
  const vx = Math.min(bb.x0, cb.x0) - 3, vy = Math.min(bb.y0, cb.y0) - 3, vw = Math.max(bb.x1,cb.x1) - vx + 3, vh = Math.max(bb.y1,cb.y1) - vy + 3;
  const P = pts => pts.map(([x,y])=>`${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const gx = bb.x0 + bb.w*.5, g0 = bb.y0 + bb.h*.18, g1 = bb.y0 + bb.h*.82;
  const fs = Math.max(1.6, Math.min(bb.w, bb.h)/10);
  let s = `<svg viewBox="${vx} ${vy} ${vw} ${vh}" ${opts.mm ? `width="${vw*10}mm" height="${vh*10}mm"` : ''} xmlns="http://www.w3.org/2000/svg" style="color:inherit">`;
  s += `<polygon points="${P(cut)}" fill="none" stroke="currentColor" stroke-width="${opts.mm?.06:.25}"/>`;
  s += `<polygon points="${P(p.poly)}" fill="${opts.fill||'none'}" stroke="currentColor" stroke-width="${opts.mm?.04:.18}" stroke-dasharray="1 .7" opacity=".8"/>`;
  s += `<line x1="${gx}" y1="${g0}" x2="${gx}" y2="${g1}" stroke="currentColor" stroke-width="${opts.mm?.05:.2}"/><path d="M${gx-1} ${g0+2} L${gx} ${g0} L${gx+1} ${g0+2} M${gx-1} ${g1-2} L${gx} ${g1} L${gx+1} ${g1-2}" fill="none" stroke="currentColor" stroke-width="${opts.mm?.05:.2}"/>`;
  if (p.fold) s += `<line x1="${bb.x0}" y1="${bb.y0}" x2="${bb.x0}" y2="${bb.y1}" stroke="#D9A520" stroke-width="${opts.mm?.12:.6}"/><text x="${bb.x0+1}" y="${bb.y0 + bb.h/2}" font-size="${fs*.6}" fill="currentColor" font-family="IBM Plex Mono, monospace" transform="rotate(90 ${bb.x0+1} ${bb.y0+bb.h/2})">PLACE ON FOLD</text>`;
  for (const [nx,ny] of (p.notches||[])) s += `<line x1="${nx}" y1="${ny}" x2="${nx + (nx>bb.x0+bb.w/2?sa:-sa)*.8}" y2="${ny}" stroke="currentColor" stroke-width="${opts.mm?.06:.3}"/>`;
  s += `<text x="${gx+1.2}" y="${bb.y0+bb.h*.45}" font-size="${fs}" fill="currentColor" font-family="Hanken Grotesk, sans-serif" font-weight="600">${esc(p.name)}</text>`;
  s += `<text x="${gx+1.2}" y="${bb.y0+bb.h*.45 + fs*1.3}" font-size="${fs*.75}" fill="currentColor" font-family="IBM Plex Mono, monospace">Cut ${p.qty}${p.fold?' on fold':''}${p.mat!=='main'?' · '+p.mat:''}${p.interface?' · interface':''}</text>`;
  if (opts.mm){ s += `<g transform="translate(${bb.x0} ${bb.y1 - 12})"><rect width="10" height="1.2" fill="currentColor"/><text y="-.6" font-size="1.4" font-family="IBM Plex Mono, monospace" fill="currentColor">10 cm test square</text><rect y="2" width="10" height="10" fill="none" stroke="currentColor" stroke-width=".05"/></g>`; }
  return s + '</svg>';
}
function patternSheetSVG(pieces, sa){
  // arrange all pieces in a contact sheet (scale-free preview)
  const cols = []; let x = 0, y = 0, rowH = 0; const W = 260, gap = 8;
  const items = pieces.map(p => { const c = offsetPoly(p.poly, sa); const b = bbox(c); return {p, b}; });
  const placed = [];
  for (const it of items){ if (x + it.b.w > W && x>0){ x = 0; y += rowH + gap; rowH = 0; } placed.push({...it, x, y}); x += it.b.w + gap; rowH = Math.max(rowH, it.b.h + 10); }
  const H = y + rowH;
  let s = `<svg viewBox="-4 -4 ${W+8} ${H+8}" xmlns="http://www.w3.org/2000/svg" class="pattern-svg" role="img" aria-label="Pattern pieces overview">`;
  for (const it of placed){
    const P = pts => pts.map(([px,py])=>`${(px - it.b.x0 + it.x).toFixed(1)},${(py - it.b.y0 + it.y).toFixed(1)}`).join(' ');
    const cut = offsetPoly(it.p.poly, sa);
    s += `<polygon points="${P(cut)}" fill="var(--accent-soft)" stroke="var(--ink)" stroke-width=".35"/>`;
    s += `<polygon points="${P(it.p.poly)}" fill="none" stroke="var(--ink-2)" stroke-width=".25" stroke-dasharray="1.2 .8"/>`;
    const bb = bbox(it.p.poly), gx = bb.x0 - it.b.x0 + it.x + bb.w/2;
    s += `<line x1="${gx}" y1="${bb.y0-it.b.y0+it.y+bb.h*.2}" x2="${gx}" y2="${bb.y0-it.b.y0+it.y+bb.h*.8}" stroke="var(--ink)" stroke-width=".3"/>`;
    if (it.p.fold) s += `<line x1="${bb.x0-it.b.x0+it.x}" y1="${bb.y0-it.b.y0+it.y}" x2="${bb.x0-it.b.x0+it.x}" y2="${bb.y1-it.b.y0+it.y}" stroke="var(--tape)" stroke-width="1.1"/>`;
    s += `<text x="${it.x+1}" y="${it.y + it.b.h + 6}" font-size="3.6" fill="var(--ink)" font-family="Hanken Grotesk, sans-serif" font-weight="600">${esc(it.p.name)} ×${it.p.qty}</text>`;
  }
  return s + '</svg>';
}
function layoutSVG(lay, width, label){
  const W = lay.half, L = Math.max(lay.length, 20);
  const pad = 8;
  let s = `<svg viewBox="${-pad-4} -10 ${W+pad*2+8} ${L+16}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)} cutting layout" style="display:block;min-width:260px">`;
  s += `<rect x="0" y="0" width="${W}" height="${L}" fill="var(--surface)" stroke="var(--ink-3)" stroke-width=".4"/>`;
  s += `<line x1="0" y1="0" x2="0" y2="${L}" stroke="var(--tape)" stroke-width="1.2"/>`;
  s += `<text x="-3" y="${L/2}" font-size="3.2" fill="var(--ink-2)" font-family="IBM Plex Mono, monospace" transform="rotate(-90 -3 ${L/2})" text-anchor="middle">FOLD</text>`;
  s += `<text x="${W+3}" y="${L/2}" font-size="3.2" fill="var(--ink-2)" font-family="IBM Plex Mono, monospace" transform="rotate(90 ${W+3} ${L/2})" text-anchor="middle">SELVEDGES</text>`;
  for (let y=0; y<=L; y+=10) s += `<line x1="${W}" y1="${y}" x2="${W+(y%50===0?4:2)}" y2="${y}" stroke="var(--ink-3)" stroke-width=".3"/>` + (y%50===0 && y ? `<text x="${W+5}" y="${y+1}" font-size="2.6" fill="var(--ink-3)" font-family="IBM Plex Mono, monospace">${y}</text>` : '');
  const cols = ['var(--accent-soft)','var(--tape-soft)','var(--ok-soft)','var(--warn-soft)'];
  lay.placed.forEach((r, i) => {
    const bb = r.bb; const sa = (r.w - bb.w - (r.fold?0:0))/2;
    const tx = (px,py) => r.rot ? [r.x + (py - bb.y0) + (r.w - bb.h)/2, r.y + (px - bb.x0) + (r.h - bb.w)/2] : [r.x + (px - bb.x0) + (r.fold?0:(r.w-bb.w)/2), r.y + (py - bb.y0) + (r.h - bb.h)/2];
    const P = r.p.poly.map(([x,y])=>tx(x,y)).map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    s += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="var(--line-2)" stroke-width=".25" stroke-dasharray="1 1"/>`;
    s += `<polygon points="${P}" fill="${cols[i%cols.length]}" stroke="var(--ink)" stroke-width=".35"/>`;
    s += `<text x="${r.x+r.w/2}" y="${r.y+r.h/2}" font-size="${clamp(Math.min(r.w,r.h)/6,1.8,4)}" text-anchor="middle" fill="var(--ink)" font-family="Hanken Grotesk, sans-serif" font-weight="600">${esc(r.p.name)}${r.rot?' ↻':''}</text>`;
  });
  s += `<text x="0" y="-4" font-size="3.2" fill="var(--ink-2)" font-family="IBM Plex Mono, monospace">${esc(label)} · ${r1(width)} cm wide · ${r1(lay.length)} cm used</text>`;
  return s + '</svg>';
}

/* ---------- sewing instructions, written from the spec ---------- */
function sewingSteps(prof, spec){
  const d = draftPattern(prof, spec), F = d.finished, t = spec.template;
  const steps = [];
  const seam = {plain:'plain seam, edges neatened with zigzag', 'flat-felled':'flat-felled seam', french:'French seam', overlocked:'plain seam, edges overlocked'}[spec.seams];
  const S_ = (title, body, o={}) => steps.push({title, body, pieces:o.pieces||[], stitch:o.stitch||'', measure:o.measure||'', check:o.check||''});
  const names = d.pieces.map(p=>p.name);
  const has = n => names.some(x=>x.toLowerCase().includes(n));
  const ints = d.pieces.filter(p=>p.interface).map(p=>p.name);
  S_('Prepare fabric and cut', `Pre-wash ${FABRICS[spec.fabric]?.name || 'the fabric'} the way the finished garment will be washed. Fold selvedge to selvedge, follow the cutting layout and transfer notches and grainlines.`, {pieces:names.slice(0,6), check:'Every piece has its grainline parallel to the selvedge.'});
  if (ints.length) S_('Fuse interfacing', `Fuse interfacing to ${ints.join(', ').toLowerCase()}. Press with a dry iron and a press cloth; let pieces cool flat before handling.`, {pieces:ints});
  if (spec.embroidery!=='none') S_('Embroider', `Mark and stitch the ${spec.embroidery} embroidery on the flat pieces before assembly, with stabiliser behind.`, {check:'Embroidery sits symmetrically about the centre front.'});
  if (['top','tee','hoodie','jacket','suit','dress','robe'].includes(t)){
    if (spec.pockets==='chest'||spec.pockets==='patch') S_('Attach pockets', `Press pocket edges under ${Units.show(1)}, topstitch the hem and edge-stitch the ${spec.pockets} pocket${spec.pockets==='patch'?'s':''} in place.`, {pieces:['Front', spec.pockets==='chest'?'Chest pocket':'Patch pocket'], stitch: spec.topstitch!=='none'?`${spec.topstitch} topstitch, 3 mm`:'edge-stitch 2 mm'});
    if (spec.pockets==='flap'||spec.pockets==='welt') S_(`Make ${spec.pockets} pockets`, `Sew the ${spec.pockets}s, cut the pocket mouth, turn the bags through and stitch them closed.`, {pieces:['Front','Pocket bag', spec.pockets==='flap'?'Pocket flap':'Welt'], check:'Pocket mouths are level on both sides.'});
    if (spec.pockets==='kangaroo') S_('Attach kangaroo pocket', 'Hem the hand openings, press the outer edges under and topstitch the pocket to the front.', {pieces:['Front','Kangaroo pocket']});
    if (t==='robe' && spec.sleeve==='wide') S_('Cut the neck opening', `With the agbada body folded at the shoulder line, cut the neck opening (about ${Units.show(F.fit ? d.body.m.neck/3.1 : 18)} across) and attach the neck facing.`, {pieces:['Agbada body (folded at shoulder)','Neck facing']});
    else S_('Join shoulders', `Sew front to back at the shoulders with a ${seam}. Press toward the back.${['jacket','suit'].includes(t)?' Ease the back shoulder 0.5 cm onto the front.':''}`, {pieces:['Front','Back'], stitch:'2.5 mm straight stitch'});
    if (['point','button-down'].includes(spec.collar)) S_('Construct collar', `Sew upper to under collar, trim, turn and press. ${spec.collar==='button-down'?'Mark collar-point buttonholes. ':''}Sandwich the collar between the stands and stitch.`, {pieces:['Collar','Collar stand'], measure:`Collar fits neck ${Units.show(d.body.m.neck)} + 1.5 cm ease`});
    if (spec.collar==='mandarin') S_('Make mandarin band', 'Sew the two band pieces together along the top curve, trim, turn and press.', {pieces:['Mandarin band']});
    if (['notch-lapel','peak-lapel','shawl'].includes(spec.collar)) S_('Build the lapels and collar', `Attach the facing to the front edges, then join the under collar to the neckline and the upper collar to the facing. Match at the gorge line and shape the ${spec.collar.replace('-',' ')} by hand-pressing.`, {pieces:['Front','Front facing','Upper collar','Under collar'], check:'Lapels roll evenly and the break sits at the top button.'});
    if (spec.collar==='hood') S_('Assemble hood', 'Sew the two hood sides along the centre seam, neaten, and baste to the neckline matching the centre back.', {pieces:['Hood side']});
    if (['crew','v-neck','scoop','boat'].includes(spec.collar)) S_(t==='tee'?'Bind the neckline':'Face the neckline', t==='tee' ? `Join the rib binding into a loop, stretch it evenly onto the neckline and stitch with a stretch stitch.${spec.collar==='v-neck'?' Mitre the binding at the V point.':''}` : `Stitch the neck facing to the neckline, clip curves, understitch and press to the inside.`, {pieces:[t==='tee'?'Neck binding':'Neck facing'], stitch: t==='tee'?'narrow zigzag or coverstitch':'2.5 mm straight stitch'});
    if (['point','button-down','mandarin','hood'].includes(spec.collar)) S_('Attach collar to neckline', 'Pin at centre back and shoulder seams, stitch, then close the inner stand by edge-stitching.', {pieces:['Front','Back']});
    if (spec.sleeve!=='none' && !(t==='robe' && spec.sleeve==='wide')){
      S_(['jacket','suit'].includes(t)?'Set in sleeves':'Attach sleeves', ['jacket','suit'].includes(t) ? 'Run two rows of ease stitching across the sleeve cap, match the cap notch to the shoulder seam and set the sleeve in the round. Add sleeve heads and shoulder pads.' : 'Attach sleeves flat, matching the cap notch to the shoulder seam.', {pieces:['Sleeve'], measure:`Sleeve length ${Units.show(F.sleeve)} from shoulder point`, check:'Sleeves hang forward slightly with no diagonal drag lines.'});
    }
    S_('Close side seams', `Sew side seams${spec.sleeve!=='none'?' and underarm seams in one pass':''} with a ${seam}.`, {pieces:['Front','Back'], measure:`Finished chest ${Units.show(F.chest)}, waist ${Units.show(F.waist)}`, check:'Measure the finished chest flat ×2 and compare.'});
    if (spec.sleeve==='long' && ['barrel','french'].includes(spec.cuffs)) S_(`Make and attach ${spec.cuffs} cuffs`, `Make the sleeve placket, pleat the sleeve hem to the cuff length (${Units.show(d.body.m.wrist+6)}), attach the cuff and edge-stitch.`, {pieces:['Cuff','Sleeve']});
    if (spec.cuffs==='ribbed') S_('Attach rib cuffs and hem band', 'Fold rib pieces in half, stretch evenly to the sleeve and hem openings and stitch.', {pieces:['Rib cuff','Hem rib'], stitch:'stretch stitch or overlock'});
    if (spec.lining!=='none' && ['jacket','suit'].includes(t)) S_('Make and bag the lining', `Assemble the ${spec.lining} lining the same way as the shell, leaving an opening in one sleeve seam. Bag it to the facings, turn through and close the opening.`, {pieces:['Front lining','Back lining','Sleeve lining']});
  }
  if (t==='dress' && spec.skirtShape!=='pencil') S_('Join bodice to skirt', `Sew the skirt panels together, ${spec.skirtShape==='gathered'?'gather the top edge, ':''}then attach to the bodice at the waist (${Units.show(F.waist)}).`, {pieces:['Bodice front','Skirt front','Skirt back']});
  if (['bottom','suit'].includes(t)){
    if (spec.pockets!=='none') S_(spec.pockets==='five-pocket'?'Make five-pocket details':'Make side-seam pockets', spec.pockets==='five-pocket' ? 'Attach the coin pocket to the right facing, sew front pocket bags, attach the back yoke and topstitch the back patch pockets.' : 'Attach pocket bags to the front and back side seams between the notches.', {pieces:['Trouser front','Pocket bag'], stitch: spec.topstitch==='contrast'?'contrast topstitch, 3.5 mm':''});
    if (spec.pleats!=='none') S_('Fold pleats', `Fold ${spec.pleats} pleat${spec.pleats==='double'?'s':''} toward the side seam and baste across the waist.`, {pieces:['Trouser front']});
    if (spec.closure==='zip' && spec.waistband!=='elastic') S_('Insert fly zip', 'Attach the fly facing to the left front, insert the zip, then attach the fly shield to the right front and sew the J-stitch.', {pieces:['Fly facing','Fly shield'], check:'Zip lies flat and the fly covers the teeth.'});
    S_('Join trouser legs', `Sew outseams and inseams with a ${seam}, then sew the crotch seam from front to back in one pass.`, {pieces:['Trouser front','Trouser back'], measure:`Outseam ${Units.show(F.outseam)}`, check:'Inseams match at the crotch point.'});
    if (spec.waistband!=='none') S_(spec.waistband==='elastic'?'Make elastic casing':'Attach waistband', spec.waistband==='elastic' ? `Sew the casing, thread ${Units.show(d.body.m.waist*.9)} of elastic, overlap and secure.` : `Stitch the waistband to the waist (${Units.show(F.waist)} finished), fold, and stitch in the ditch from the right side. Add hook and bar.`, {pieces:['Waistband']});
    S_('Hem legs', spec.cuffs==='turn-up' ? 'Fold the turn-up, press, and slip-stitch the hem; tack the turn-up at the side seams.' : 'Press the hem allowance up and blind-hem.', {measure:`Finished outseam ${Units.show(F.outseam)}`});
  }
  if (t==='skirt'){
    S_('Darts and seams', `Sew darts, then side seams with a ${seam}.`, {pieces:['Skirt front','Skirt back']});
    if (spec.closure==='zip') S_('Insert invisible zip', 'Insert the zip in the centre back seam before closing the seam below it.', {pieces:['Skirt back']});
    S_('Attach waistband', `Attach the waistband (${Units.show(F.waist)} finished) and finish with a hook and bar.`, {pieces:['Waistband']});
  }
  if (['top','tee','hoodie','jacket','suit','dress','robe'].includes(t)){
    S_('Hem', t==='top' ? `Narrow-hem the curved shirt-tail hem with a 6 mm double fold.` : t==='tee' ? 'Turn up 2.5 cm and twin-needle stitch.' : 'Press up the hem allowance and blind-hem by hand or machine.', {measure:`Finished length ${Units.show(F.length)} from back neck`});
    if (spec.closure==='buttons' || spec.closure==='double-breasted'){
      const n = spec.closure==='double-breasted' ? Math.round((spec.buttons||6)/2) : spec.buttons;
      const span = t==='top' ? Math.max(F.length - 12, 20) : 20;
      S_('Buttonholes and buttons', `Mark ${n} buttonhole${n>1?'s':''}${t==='top'&&n>1 ? ` about ${Units.show(span/(n-1))} apart, the first just below the collar` : ''}. Stitch holes, cut open and sew buttons with a thread shank.`, {measure:`Button size 1.1–1.5 cm`});
    }
    if (spec.closure==='zip' && ['top','tee','hoodie','jacket'].includes(t)) S_('Insert front zip', 'Stitch the open-ended zip to both front edges, then finish with the facing.', {});
  }
  S_('Final press and quality check', `Press every seam from the wrong side. Try on the garment and compare against the ${prof.name} profile.`, {check:'Check the chest, waist and length against the finished measurements listed on the technical sheet.'});
  return steps;
}
