/* ================= BODY MODEL + FITTING SERVICE =================
   A parametric body built from the saved measurements. The same model drives
   the 3D avatar, the garment shells, the fit checks and the pattern drafts,
   so every part of the app reads one body. */

function estimateFromHeight(H, shape, weight){
  const f = shape==='f';
  const exp = 22*Math.pow(H/100,2);
  const k = weight ? clamp(Math.sqrt(weight/exp), .82, 1.4) : 1;
  const c = v => r1(v*k), l = v => r1(v);
  const chest = c(H*(f?.55:.56));
  return {height:H, chest, waist:c(H*(f?.43:.47)), hip:c(H*(f?.6:.565)), neck:c(H*(f?.2:.222)), shoulder:l(H*(f?.233:.255)),
    upperArm:c(H*(f?.165:.175)), wrist:c(H*(f?.09:.096)), armLength:l(H*(f?.35:.356)), torsoLength:l(H*(f?.245:.256)),
    thigh:c(H*(f?.345:.325)), knee:c(H*.218), calf:c(H*.207), ankle:c(H*.128), inseam:l(H*.455), outseam:l(H*.598),
    underbust: f? c(H*.455) : null, frontRise:l(H*.155), backRise:l(H*.215)};
}

function filledMeasurements(prof){
  const m = Object.assign({}, prof.m||{});
  const H = m.height || (prof.shape==='f'?165:177);
  const est = estimateFromHeight(H, prof.shape, m.weight);
  const estimated = [];
  for (const k of Object.keys(est)){ if (m[k]==null || m[k]==='' || isNaN(m[k])){ if (est[k]!=null){ m[k]=est[k]; estimated.push(k);} } }
  if (!m.underbust) m.underbust = m.chest*(prof.shape==='f'?.83:.9);
  return {m, estimated};
}

const K_TORSO = 0.70;
const CF = 2*Math.PI*Math.sqrt((1+K_TORSO*K_TORSO)/2);

function bodyGeom(prof){
  const {m, estimated} = filledMeasurements(prof);
  const H = m.height;
  const L = {H};
  L.ankleY = .045*H; L.kneeY = .285*H;
  L.crotchY = clamp(m.inseam, .38*H, .52*H);
  L.waistY = clamp(m.outseam, L.crotchY+.09*H, .68*H);
  L.hipY = lerp(L.crotchY, L.waistY, .4);
  L.neckY = clamp(L.waistY + m.torsoLength, L.waistY+.19*H, .875*H);
  L.shoulderY = L.neckY - .03*H;
  L.chestY = Math.max(L.shoulderY - .095*H, L.waistY + .1*H);
  L.ubY = lerp(L.waistY, L.chestY, .62);
  L.armpitY = L.shoulderY - .05*H;
  L.headC = H - .066*H;
  const R = c => c/CF;
  const rHip = R(m.hip), rWaist = R(m.waist), rChest = R(m.chest), rUb = R(m.underbust);
  const rNeck = m.neck/(2*Math.PI);
  const rShoulder = Math.max(m.shoulder/2 - .012*H, rChest*.95);
  const torsoPts = [
    [L.crotchY - .012*H, rHip*.86],
    [L.hipY, rHip],
    [lerp(L.hipY, L.waistY, .55), lerp(rHip, rWaist, .62)],
    [L.waistY, rWaist],
    [L.ubY, Math.max(rUb, rWaist)],
    [L.chestY, rChest],
    [L.armpitY, rChest*.98],
    [L.shoulderY - .01*H, rShoulder*.9],
    [L.shoulderY + .008*H, rNeck*1.75],
    [L.neckY, rNeck*1.12],
  ];
  const bust = prof.shape==='f' ? Math.max(0, (m.chest - m.underbust)/ (2*Math.PI) * 0.9) : 0;
  const rThigh = m.thigh/(2*Math.PI), rKnee = m.knee/(2*Math.PI), rCalf = m.calf/(2*Math.PI), rAnkle = m.ankle/(2*Math.PI);
  const legX = Math.max(rHip - rThigh*.92, rThigh*.78);
  const legPts = [
    [L.crotchY + .03*H, rThigh*1.04],
    [L.crotchY - .02*H, rThigh],
    [lerp(L.crotchY, L.kneeY, .55), lerp(rThigh, rKnee, .6)],
    [L.kneeY + .02*H, rKnee*1.02],
    [L.kneeY - .02*H, rKnee*.98],
    [L.kneeY - .09*H, rCalf],
    [lerp(L.kneeY, L.ankleY, .7), lerp(rCalf, rAnkle, .75)],
    [L.ankleY, rAnkle],
    [.012*H, rAnkle*1.05],
  ].sort((a,b)=>a[0]-b[0]);
  const rUpper = m.upperArm/(2*Math.PI), rWrist = m.wrist/(2*Math.PI);
  const armLen = m.armLength;
  const armPts = [ [0, rUpper*1.15], [.22*armLen, rUpper], [.46*armLen, rUpper*.8], [.62*armLen, lerp(rUpper, rWrist, .45)], [armLen, rWrist] ];
  const shoulderJoint = {x: rShoulder - rUpper*.55, y: L.shoulderY - .02*H};
  return {m, estimated, L, H, torsoPts, legPts, armPts, legX, armLen, shoulderJoint, armAngle:.2, bust, rNeck, rChest, rWaist, rHip,
    torsoRx(y){ return interp(torsoPts, y); },
    kAt(y){ return y > L.shoulderY ? lerp(K_TORSO, .95, clamp((y-L.shoulderY)/(L.neckY-L.shoulderY),0,1)) : K_TORSO; },
    bustAt(y, a){ if (!bust) return 0; const g = Math.exp(-Math.pow((y-L.chestY)/(.045*H),2)); const c = Math.max(0, Math.cos(a)); return bust*g*c*c; },
    legR(y){ return interp(legPts, y); },
    armR(t){ return interp(armPts, t); },
  };
}
function interp(pts, y){
  if (y <= pts[0][0]) return pts[0][1];
  for (let i=1;i<pts.length;i++){ if (y <= pts[i][0]){ const [y0,r0]=pts[i-1],[y1,rr]=pts[i]; return lerp(r0, rr, smooth((y-y0)/(y1-y0||1))); } }
  return pts[pts.length-1][1];
}

/* ---------- garment length keywords → heights on this body ---------- */
function hemY(B, length, template){
  const L = B.L, H = B.H;
  const map = {cropped:L.waistY+.04*H, waist:L.waistY-.01*H, hip:L.hipY-.03*H, thigh:L.crotchY-.08*H, knee:L.kneeY-.01*H, midi:L.kneeY-.1*H, ankle:L.ankleY+.03*H, floor:.015*H};
  let y = map[length] ?? map.hip;
  if (['bottom','skirt','suit'].includes(template) && length==='hip') y = map.floor;
  return y;
}

/* ---------- fitting service ----------
   Inputs: a body profile, a garment spec, an optional size chart (library garments).
   Output: per-zone ease, status, recommended size, missing data and confidence. */
function zoneWindow(t, zone, fabric, body){
  const st = (FABRICS[fabric]||{}).stretch || 0;
  const neg = -body*st/100*.5;
  const W = {
    bottom:{waist:[0,6], hip:[1,14], thigh:[2,30]}, skirt:{waist:[0,6], hip:[1,24]},
    dress:{chest:[3,30], waist:[2,30], hip:[3,40]}, robe:{chest:[10,90], waist:[10,120], hip:[10,140]},
  }[t];
  const base = (W && W[zone]) || (EASE_OK[t]||[4,30]);
  return [base[0] + neg, base[1]];
}
function targetEase(spec){
  const t = spec.template==='suit' ? 'jacket' : spec.template;
  if (spec.fit==='custom') return [spec.customEase.chest, spec.customEase.waist, spec.customEase.hip];
  return ((EASE[t]||EASE.top)[spec.fit]) || EASE.top.regular;
}
function computeFit(prof, spec, sizes, forcedSize){
  const B = bodyGeom(prof);
  const m = B.m;
  const t = spec.template;
  const req = REQ[t] || REQ.top;
  const provided = prof.m || {};
  const missing = req.filter(k => provided[k]==null || provided[k]==='' || isNaN(provided[k]));
  const zonesFor = {top:['chest','waist','hip'], tee:['chest','waist','hip'], hoodie:['chest','waist','hip'], jacket:['chest','waist','hip'], dress:['chest','waist','hip'], robe:['chest','hip'],
                    bottom:['waist','hip','thigh'], skirt:['waist','hip'], suit:['chest','waist','hip','thigh']}[t] || ['chest','waist','hip'];
  const te = targetEase(spec);
  const tgt = {chest:te[0], waist:te[1], hip:te[2], thigh: spec.legShape==='skinny'?2: spec.legShape==='wide'?14:7};
  if (['bottom','skirt'].includes(t)){ const eb = (EASE[t][spec.fit]||EASE[t].regular); tgt.waist = eb[1]; tgt.hip = eb[2]; }
  const evalSize = (chart) => {
    const zones = zonesFor.map(z => {
      const body = m[z];
      const g = chart ? chart[z] : body + (tgt[z] ?? 8);
      const ease = g==null ? null : g - body;
      const tz = (t==='suit' && z!=='chest' && z!=='thigh') ? 'jacket' : t;
      const [mn, mx] = zoneWindow(tz==='suit'?'jacket':tz, z, spec.fabric, body);
      let status = 'ok';
      if (ease==null) status='unknown'; else if (ease < mn) status = ease < 0 ? 'tight' : 'snug'; else if (ease > mx) status='loose';
      return {k:z, body, garment:g, ease, status, min:mn, max:mx};
    });
    let score = 0;
    for (const z of zones){ if (z.ease==null) continue; if (z.ease < z.min) score += (z.min-z.ease)*4; else if (z.ease > z.max) score += (z.ease-z.max); score += Math.abs(z.ease - (tgt[z.k]??8))*0.08; }
    return {zones, score};
  };
  let size = null, res;
  if (sizes && Object.keys(sizes).length){
    const ranked = Object.entries(sizes).map(([s,chart])=>({s, ...evalSize(chart)})).sort((a,b)=>a.score-b.score);
    const pick = forcedSize && sizes[forcedSize] ? ranked.find(r=>r.s===forcedSize) : ranked[0];
    size = pick.s; res = pick; res.recommended = ranked[0].s;
  } else {
    res = evalSize(null); res.recommended = null;
  }
  const lengths = [];
  if (sizes && size && sizes[size].sleeve && provided.armLength){ const d = sizes[size].sleeve - m.armLength; lengths.push({k:'Sleeve', body:m.armLength, garment:sizes[size].sleeve, diff:d, status: d<-2?'short': d>4?'long':'ok'}); }
  if (sizes && size && sizes[size].inseam && provided.inseam){ const d = sizes[size].inseam - m.inseam; lengths.push({k:'Inseam', body:m.inseam, garment:sizes[size].inseam, diff:d, status: d<-2?'short': d>4?'long':'ok'}); }
  const bad = res.zones.filter(z=>z.status==='tight').length;
  const warn = res.zones.filter(z=>z.status==='snug'||z.status==='loose').length + lengths.filter(l=>l.status!=='ok').length;
  const confidence = missing.length ? 'low' : (prof.verified ? 'high' : 'medium');
  const circ = {}; for (const z of res.zones) circ[z.k] = Math.max(z.garment ?? z.body, z.body + .6);
  return {size, recommended:res.recommended, zones:res.zones, lengths, missing, estimated:B.estimated, confidence,
    verdict: bad ? 'tight' : warn ? 'check' : 'good', circ, mode: sizes ? 'size-chart' : 'made-to-measure'};
}

/* Output level a design has reached, and what is missing for the next. */
function designLevel(design, prof){
  const spec = design.spec;
  const levels = [
    {k:'concept', label:'Concept', ok:true},
    {k:'preview', label:'3D preview', ok: TEMPLATES.includes(spec.template)},
    {k:'fit', label:'Estimated fit', ok:false, need:[]},
    {k:'production', label:'Production-ready', ok:false, need:[]},
  ];
  if (!prof){ levels[2].need.push('Choose a body profile'); }
  else {
    const req = REQ[spec.template]||[]; const miss = req.filter(k => prof.m?.[k]==null);
    if (miss.length) levels[2].need.push('Add '+miss.map(k=>MBYK[k]?.label.toLowerCase()).join(', '));
    else levels[2].ok = levels[1].ok;
  }
  const share = Object.values(Store.myShares.items||{}).find(s => s.designId===design.id);
  if (!levels[2].ok) levels[3].need.push('Reach estimated fit first');
  if (prof && !prof.verified) levels[3].need.push('Confirm measurements were taken with a tape (My Body → Verify)');
  if (!share) levels[3].need.push('Send to a tailor for pattern review');
  else if (!share.patternValidated) levels[3].need.push('Tailor has not validated the pattern yet');
  if (share && share.designVersion && share.designVersion !== (design.versions||[]).length) levels[3].need.push('Design changed since the tailor validated it');
  levels[3].ok = levels[2].ok && levels[3].need.length===0;
  let cur = 0; levels.forEach((l,i)=>{ if (l.ok) cur=i; });
  return {levels, cur};
}
