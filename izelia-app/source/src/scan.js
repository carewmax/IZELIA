/* ================= 3D BODY SCAN IMPORT =================
   Reads a body scan exported from a phone app or scanner (.glb, .gltf, .obj, .ply, .stl),
   stands it upright, scales it to centimetres and measures it by slicing the mesh with
   horizontal planes. Each slice is grouped into separate outlines (torso, arms, legs) and
   circumferences are taken from the convex hull of an outline: what a tape measure does.
   Everything runs in this browser. The mesh is held for this session only and never uploaded;
   only the measurements the person accepts are saved to their profile. */

const SCAN_EXT = ['glb','gltf','obj','ply','stl'];

/* ---------- parsers: all return {pos:Float32Array (xyz), idx:Uint32Array|null} ---------- */
function parseOBJ(text){
  const v = [], f = [];
  const lines = text.split(/\r?\n/);
  for (let i=0;i<lines.length;i++){
    const l = lines[i];
    if (l.charCodeAt(0)===118 && l.charCodeAt(1)===32){ const p = l.trim().split(/\s+/); v.push(+p[1], +p[2], +p[3]); }
    else if (l.charCodeAt(0)===102 && l.charCodeAt(1)===32){
      const p = l.trim().split(/\s+/).slice(1).map(s=>{ const n = parseInt(s, 10); return n<0 ? v.length/3 + n : n-1; });
      for (let k=1;k<p.length-1;k++) f.push(p[0], p[k], p[k+1]);
    }
  }
  if (!v.length) throw new Error('No vertices found in this OBJ file.');
  return {pos:new Float32Array(v), idx:f.length ? new Uint32Array(f) : null};
}

function parseSTL(buf){
  const dv = new DataView(buf);
  const n = buf.byteLength>=84 ? dv.getUint32(80, true) : 0;
  if (buf.byteLength === 84 + n*50 && n>0){
    const pos = new Float32Array(n*9);
    for (let i=0;i<n;i++){ const o = 84 + i*50 + 12; for (let j=0;j<9;j++) pos[i*9+j] = dv.getFloat32(o+j*4, true); }
    return {pos, idx:null};
  }
  const text = new TextDecoder().decode(buf), v = [];
  const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g; let m;
  while ((m = re.exec(text))) v.push(+m[1], +m[2], +m[3]);
  if (!v.length) throw new Error('No triangles found in this STL file.');
  return {pos:new Float32Array(v), idx:null};
}

function parsePLY(buf){
  const bytes = new Uint8Array(buf);
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 65536)));
  const end = head.indexOf('end_header');
  if (!head.startsWith('ply') || end<0) throw new Error('This does not look like a PLY file.');
  let bodyStart = end + 'end_header'.length; while (bytes[bodyStart]===13 || bytes[bodyStart]===10) { bodyStart++; if (bytes[bodyStart-1]===10) break; }
  const lines = head.slice(0, end).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const fmt = (lines.find(l=>l.startsWith('format '))||'').split(/\s+/)[1];
  const elems = []; let cur = null;
  for (const l of lines){
    const p = l.split(/\s+/);
    if (p[0]==='element'){ cur = {name:p[1], count:+p[2], props:[]}; elems.push(cur); }
    else if (p[0]==='property' && cur){ if (p[1]==='list') cur.props.push({name:p[4], list:true, ct:p[2], it:p[3]}); else cur.props.push({name:p[2], t:p[1]}); }
  }
  const SZ = {char:1,uchar:1,int8:1,uint8:1,short:2,ushort:2,int16:2,uint16:2,int:4,uint:4,int32:4,uint32:4,float:4,float32:4,double:8,float64:8};
  const pos = [], idx = [];
  if (fmt==='ascii'){
    const toks = new TextDecoder().decode(bytes.subarray(bodyStart)).split(/\s+/).filter(Boolean); let t = 0;
    for (const e of elems) for (let i=0;i<e.count;i++){
      const rec = {};
      for (const p of e.props){ if (p.list){ const n = +toks[t++]; rec[p.name] = toks.slice(t, t+n).map(Number); t += n; } else rec[p.name] = +toks[t++]; }
      if (e.name==='vertex') pos.push(rec.x, rec.y, rec.z);
      else if (e.name==='face'){ const l = rec.vertex_indices || rec.vertex_index || []; for (let k=1;k<l.length-1;k++) idx.push(l[0], l[k], l[k+1]); }
    }
  } else {
    const le = fmt==='binary_little_endian'; if (!le && fmt!=='binary_big_endian') throw new Error('Unsupported PLY format.');
    const dv = new DataView(buf); let o = bodyStart;
    const rd = t => { let v; switch(t){
      case 'char': case 'int8': v = dv.getInt8(o); break; case 'uchar': case 'uint8': v = dv.getUint8(o); break;
      case 'short': case 'int16': v = dv.getInt16(o, le); break; case 'ushort': case 'uint16': v = dv.getUint16(o, le); break;
      case 'int': case 'int32': v = dv.getInt32(o, le); break; case 'uint': case 'uint32': v = dv.getUint32(o, le); break;
      case 'float': case 'float32': v = dv.getFloat32(o, le); break; case 'double': case 'float64': v = dv.getFloat64(o, le); break;
      default: throw new Error('Unknown PLY type '+t); } o += SZ[t]; return v; };
    for (const e of elems){
      const isV = e.name==='vertex', isF = e.name==='face';
      const xi = e.props.findIndex(p=>p.name==='x'), yi = e.props.findIndex(p=>p.name==='y'), zi = e.props.findIndex(p=>p.name==='z');
      for (let i=0;i<e.count;i++){
        let x=0,y=0,z=0;
        for (let pi=0; pi<e.props.length; pi++){
          const p = e.props[pi];
          if (p.list){ const n = rd(p.ct); const l = []; for (let k=0;k<n;k++) l.push(rd(p.it)); if (isF && /^vertex_ind/.test(p.name)) for (let k=1;k<n-1;k++) idx.push(l[0], l[k], l[k+1]); }
          else { const v = rd(p.t); if (isV){ if (pi===xi) x=v; else if (pi===yi) y=v; else if (pi===zi) z=v; } }
        }
        if (isV) pos.push(x, y, z);
      }
    }
  }
  if (!pos.length) throw new Error('No vertices found in this PLY file.');
  return {pos:new Float32Array(pos), idx:idx.length ? new Uint32Array(idx) : null};
}

/* glTF 2.0: binary .glb, or .gltf with embedded (data:) buffers. Node transforms are applied. */
function parseGLTF(buf, isText){
  let json, bin = null;
  if (isText){ json = JSON.parse(new TextDecoder().decode(buf)); }
  else {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('This does not look like a .glb file.');
    let o = 12;
    while (o < buf.byteLength){
      const len = dv.getUint32(o, true), type = dv.getUint32(o+4, true);
      if (type===0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, o+8, len)));
      else if (type===0x004E4942) bin = buf.slice(o+8, o+8+len);
      o += 8 + len;
    }
  }
  if (!json) throw new Error('This glTF file has no scene data.');
  const used = [...(json.extensionsUsed||[])];
  if (used.includes('KHR_draco_mesh_compression') || used.includes('EXT_meshopt_compression')) throw new Error('This file uses mesh compression (Draco or Meshopt). Export it again with compression turned off.');
  const buffers = (json.buffers||[]).map((b,i) => {
    if (b.uri==null) return bin;
    const m = /^data:.*?;base64,(.*)$/.exec(b.uri);
    if (!m) throw new Error('This .gltf file points to a separate .bin file. Export as a single .glb instead.');
    const s = atob(m[1]); const a = new Uint8Array(s.length); for (let k=0;k<s.length;k++) a[k] = s.charCodeAt(k); return a.buffer;
  });
  const NC = {SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT4:16};
  const CT = {5120:[Int8Array,1],5121:[Uint8Array,1],5122:[Int16Array,2],5123:[Uint16Array,2],5125:[Uint32Array,4],5126:[Float32Array,4]};
  const readAcc = i => {
    const a = json.accessors[i], bv = json.bufferViews[a.bufferView], [T, sz] = CT[a.componentType], n = NC[a.type];
    const base = (bv.byteOffset||0) + (a.byteOffset||0), stride = bv.byteStride || sz*n, src = buffers[bv.buffer];
    const out = new Float64Array(a.count*n), dv = new DataView(src);
    const get = {5120:(o)=>dv.getInt8(o),5121:(o)=>dv.getUint8(o),5122:(o)=>dv.getInt16(o,true),5123:(o)=>dv.getUint16(o,true),5125:(o)=>dv.getUint32(o,true),5126:(o)=>dv.getFloat32(o,true)}[a.componentType];
    for (let k=0;k<a.count;k++) for (let c=0;c<n;c++) out[k*n+c] = get(base + k*stride + c*sz);
    return out;
  };
  const mul = (a,b) => { const r = new Array(16).fill(0); for (let i=0;i<4;i++) for (let j=0;j<4;j++) for (let k=0;k<4;k++) r[j*4+i] += a[k*4+i]*b[j*4+k]; return r; };
  const local = nd => {
    if (nd.matrix) return nd.matrix.slice();
    const [x,y,z,w] = nd.rotation||[0,0,0,1], [sx,sy,sz] = nd.scale||[1,1,1], [tx,ty,tz] = nd.translation||[0,0,0];
    return [(1-2*(y*y+z*z))*sx, 2*(x*y+z*w)*sx, 2*(x*z-y*w)*sx, 0,
            2*(x*y-z*w)*sy, (1-2*(x*x+z*z))*sy, 2*(y*z+x*w)*sy, 0,
            2*(x*z+y*w)*sz, 2*(y*z-x*w)*sz, (1-2*(x*x+y*y))*sz, 0, tx, ty, tz, 1];
  };
  const pos = [], idx = [];
  const addMesh = (mi, M) => {
    for (const pr of json.meshes[mi].primitives){
      if (pr.mode!=null && pr.mode!==4) continue;
      if (pr.attributes.POSITION==null) continue;
      const P = readAcc(pr.attributes.POSITION), off = pos.length/3;
      for (let k=0;k<P.length;k+=3){ const x=P[k], y=P[k+1], z=P[k+2]; pos.push(M[0]*x+M[4]*y+M[8]*z+M[12], M[1]*x+M[5]*y+M[9]*z+M[13], M[2]*x+M[6]*y+M[10]*z+M[14]); }
      if (pr.indices!=null){ const I = readAcc(pr.indices); for (let k=0;k<I.length;k++) idx.push(I[k]+off); }
      else for (let k=0;k<P.length/3;k++) idx.push(off+k);
    }
  };
  const walk = (ni, parent) => { const nd = json.nodes[ni]; const M = mul(parent, local(nd)); if (nd.mesh!=null) addMesh(nd.mesh, M); (nd.children||[]).forEach(c=>walk(c, M)); };
  const I4 = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  const scene = json.scenes?.[json.scene||0];
  if (scene && json.nodes) scene.nodes.forEach(n=>walk(n, I4));
  else (json.meshes||[]).forEach((_,i)=>addMesh(i, I4));
  if (!pos.length) throw new Error('No triangle meshes found in this glTF file.');
  return {pos:new Float32Array(pos), idx:new Uint32Array(idx)};
}

function parseScanFile(name, buf){
  const ext = (name.split('.').pop()||'').toLowerCase();
  if (ext==='obj') return parseOBJ(new TextDecoder().decode(buf));
  if (ext==='stl') return parseSTL(buf);
  if (ext==='ply') return parsePLY(buf);
  if (ext==='glb') return parseGLTF(buf, false);
  if (ext==='gltf') return parseGLTF(buf, true);
  throw new Error('Use a .glb, .gltf, .obj, .ply or .stl file.');
}

/* ---------- geometry helpers ---------- */
function hull2(pts){ // pts: [[x,z],...] → convex hull (monotone chain)
  const p = pts.slice().sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  if (p.length<3) return p;
  const cr = (o,a,b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const lo = [], up = [];
  for (const q of p){ while (lo.length>=2 && cr(lo[lo.length-2], lo[lo.length-1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i=p.length-1;i>=0;i--){ const q = p[i]; while (up.length>=2 && cr(up[up.length-2], up[up.length-1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0,-1).concat(up.slice(0,-1));
}
const perim = h => { let s = 0; for (let i=0;i<h.length;i++){ const a = h[i], b = h[(i+1)%h.length]; s += Math.hypot(b[0]-a[0], b[1]-a[1]); } return s; };

/* Orient (up axis, lateral axis), scale to cm, put feet on y=0 and centre the body on the y axis. */
function normaliseScan(raw, opts={}){
  const P = raw.pos, n = P.length/3;
  const mn = [Infinity,Infinity,Infinity], mx = [-Infinity,-Infinity,-Infinity];
  for (let i=0;i<n;i++) for (let c=0;c<3;c++){ const v = P[i*3+c]; if (v<mn[c]) mn[c]=v; if (v>mx[c]) mx[c]=v; }
  const ext = [0,1,2].map(c=>mx[c]-mn[c]);
  if (!(ext[0]>0 && ext[1]>0 && ext[2]>0)) throw new Error('The scan has no volume. Is it a full body?');
  const up = opts.up!=null ? opts.up : ext.indexOf(Math.max(...ext));
  const h1 = (up+1)%3, h2 = (up+2)%3;
  const out = new Float32Array(P.length);
  for (let i=0;i<n;i++){ out[i*3] = P[i*3+h1]; out[i*3+1] = P[i*3+up] - mn[up]; out[i*3+2] = P[i*3+h2]; }
  const rawH = ext[up];
  // units
  let scale, unitGuess;
  if (opts.height) { scale = opts.height / rawH; unitGuess = 'set from the height you entered'; }
  else if (rawH>1.1 && rawH<2.4){ scale = 100; unitGuess = 'metres'; }
  else if (rawH>110 && rawH<240){ scale = 1; unitGuess = 'centimetres'; }
  else if (rawH>1100 && rawH<2400){ scale = .1; unitGuess = 'millimetres'; }
  else if (rawH>43 && rawH<95){ scale = 2.54; unitGuess = 'inches'; }
  else throw Object.assign(new Error('The scan size doesn’t match a standing person in metres, centimetres, millimetres or inches. Enter the person’s real height and try again.'), {needHeight:true});
  for (let i=0;i<out.length;i++) out[i] *= scale;
  const H = rawH*scale;
  // which end is the head? Near the feet a slice shows two separate outlines (legs); near the head, one.
  const flipAuto = countOutlinesAt(out, raw.idx, H*0.12, H) < countOutlinesAt(out, raw.idx, H*0.88, H);
  const doFlip = opts.flip ? !flipAuto : flipAuto;
  if (doFlip) for (let i=0;i<n;i++){ out[i*3+1] = H - out[i*3+1]; out[i*3] = -out[i*3]; }
  // centre and lateral axis from the trunk region (vertices between 55% and 80% of height)
  let sx=0, sz=0, c=0;
  for (let i=0;i<n;i++){ const y = out[i*3+1]; if (y>H*.55 && y<H*.8){ sx+=out[i*3]; sz+=out[i*3+2]; c++; } }
  if (!c) throw new Error('Couldn’t find a torso in this scan.');
  sx/=c; sz/=c;
  let xx=0, zz=0, xz=0;
  for (let i=0;i<n;i++){ const y = out[i*3+1]; if (y>H*.55 && y<H*.8){ const dx = out[i*3]-sx, dz = out[i*3+2]-sz; xx+=dx*dx; zz+=dz*dz; xz+=dx*dz; } }
  const ang = 0.5*Math.atan2(2*xz, xx-zz) + (opts.turn ? Math.PI : 0); // principal (shoulder-to-shoulder) direction → x
  const ca = Math.cos(-ang), sa = Math.sin(-ang);
  for (let i=0;i<n;i++){ const dx = out[i*3]-sx, dz = out[i*3+2]-sz; out[i*3] = dx*ca - dz*sa; out[i*3+2] = dx*sa + dz*ca; }
  return {pos:out, idx:raw.idx, H, rawH, unitGuess, flipped:doFlip, flipAuto, up};
}

/* Triangle index buckets by height for fast slicing. */
function scanBuckets(pos, idx, H){
  const nb = Math.max(1, Math.ceil(H)), buckets = Array.from({length:nb+1}, ()=>[]);
  const tri = idx ? idx.length/3 : pos.length/9;
  for (let t=0;t<tri;t++){
    const a = idx ? idx[t*3] : t*3, b = idx ? idx[t*3+1] : t*3+1, c = idx ? idx[t*3+2] : t*3+2;
    const ya = pos[a*3+1], yb = pos[b*3+1], yc = pos[c*3+1];
    const lo = Math.max(0, Math.floor(Math.min(ya,yb,yc))), hi = Math.min(nb, Math.floor(Math.max(ya,yb,yc)));
    for (let k=lo;k<=hi;k++) buckets[k].push(t);
  }
  return buckets;
}

/* Slice at height y → outlines [{hull, per, cx, cz, minx, maxx, minz, maxz, w, d}]
   Points are grouped by proximity (gap cm). Scan holes leave open fragments of an outline;
   those are re-joined through their open ends, while separate closed outlines (an arm next
   to the torso) stay apart however close they are. */
function sliceAt(pos, idx, buckets, y, gap=0.5){
  y += 0.0137; // avoid slicing exactly through a ring of vertices
  const list = buckets[Math.floor(y)] || [], segs = [];
  const q = v => Math.round(v*1e4);
  for (const t of list){
    const vi = [0,1,2].map(k=>idx ? idx[t*3+k] : t*3+k), hits = [];
    for (let k=0;k<3;k++){
      const i = vi[k], j = vi[(k+1)%3];
      const ay = pos[i*3+1], by = pos[j*3+1];
      if ((ay-y)*(by-y) < 0){
        const f = (y-ay)/(by-ay), ax = pos[i*3], az = pos[i*3+2], bx = pos[j*3], bz = pos[j*3+2];
        const ki = idx ? i : q(ax)+':'+q(ay)+':'+q(az), kj = idx ? j : q(bx)+':'+q(by)+':'+q(bz);
        hits.push({p:[ax+(bx-ax)*f, az+(bz-az)*f], k: ki<kj ? ki+'_'+kj : kj+'_'+ki});
      }
    }
    if (hits.length===2) segs.push(hits);
  }
  if (!segs.length) return [];
  const pts = [], pseg = [];
  segs.forEach(([A,B], si) => { const a = A.p, b = B.p, L = Math.hypot(b[0]-a[0], b[1]-a[1]), k = Math.max(1, Math.ceil(L/(gap*0.9))); for (let i=0;i<=k;i++){ pts.push([a[0]+(b[0]-a[0])*i/k, a[1]+(b[1]-a[1])*i/k]); pseg.push(si); } });
  const cell = gap, grid = new Map(), key = (i,j) => i+','+j;
  pts.forEach((p,n)=>{ const k = key(Math.floor(p[0]/cell), Math.floor(p[1]/cell)); (grid.get(k)||grid.set(k,[]).get(k)).push(n); });
  const seen = new Set(), comp = new Int32Array(pts.length); let nc = 0;
  for (const [k0] of grid){
    if (seen.has(k0)) continue;
    const stack = [k0]; seen.add(k0);
    while (stack.length){
      const k = stack.pop(); for (const n of grid.get(k)) comp[n] = nc;
      const [i,j] = k.split(',').map(Number);
      for (let di=-1;di<=1;di++) for (let dj=-1;dj<=1;dj++){ const kk = key(i+di, j+dj); if (!seen.has(kk) && grid.has(kk)){ seen.add(kk); stack.push(kk); } }
    }
    nc++;
  }
  // open ends per component: edge keys used by only one segment
  const segComp = new Int32Array(segs.length); pseg.forEach((si,n)=>{ segComp[si] = comp[n]; });
  const deg = new Map();
  segs.forEach((h, si) => h.forEach((e, ei) => { const d = deg.get(e.k); if (d) d.n++; else { const o = h[1-ei].p, L = Math.hypot(e.p[0]-o[0], e.p[1]-o[1]) || 1; deg.set(e.k, {n:1, p:e.p, c:segComp[si], dx:(e.p[0]-o[0])/L, dz:(e.p[1]-o[1])/L}); } }));
  const ends = [...deg.values()].filter(d=>d.n===1);
  const par = Array.from({length:nc}, (_,i)=>i), find = i => par[i]===i ? i : (par[i] = find(par[i]));
  const maxJoin = 4;
  const nearest = i => { const a = ends[i]; let best = -1, bd = maxJoin; for (let j=0;j<ends.length;j++){ if (j===i) continue; const b = ends[j], vx = b.p[0]-a.p[0], vz = b.p[1]-a.p[1], d = Math.hypot(vx, vz); if (d>=bd) continue; if (d>0.05 && ((a.dx*vx + a.dz*vz)/d < 0.7 || -(b.dx*vx + b.dz*vz)/d < 0.7)) continue; bd = d; best = j; } return best; };
  const nn = ends.map((_,i)=>nearest(i));
  ends.forEach((e,i)=>{ const j = nn[i]; if (j>=0 && nn[j]===i && ends[j].c!==e.c) par[find(e.c)] = find(ends[j].c); });
  const groups = new Map();
  pts.forEach((p,n)=>{ const r = find(comp[n]); (groups.get(r)||groups.set(r,[]).get(r)).push(p); });
  const outlines = [];
  for (const mp of groups.values()){
    const h = hull2(mp);
    let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity,cx=0,cz=0;
    for (const p of mp){ minx=Math.min(minx,p[0]); maxx=Math.max(maxx,p[0]); minz=Math.min(minz,p[1]); maxz=Math.max(maxz,p[1]); cx+=p[0]; cz+=p[1]; }
    outlines.push({hull:h, per:perim(h), cx:cx/mp.length, cz:cz/mp.length, minx, maxx, minz, maxz, w:maxx-minx, d:maxz-minz});
  }
  return outlines.filter(o=>o.per>3).sort((a,b)=>b.per-a.per);
}
function countOutlinesAt(pos, idx, y, H){
  const b = scanBuckets(pos, idx, Math.ceil(H)+1);
  return sliceAt(pos, idx, b, y).filter(o=>o.per > H*0.04).length;
}

/* ---------- measuring ---------- */
function measureScan(N){
  const {pos, idx, H} = N;
  const buckets = scanBuckets(pos, idx, H);
  const step = (idx ? idx.length/3 : pos.length/9) > 400000 ? 1 : 0.5, levels = [];
  for (let y=H*0.02; y<=H*0.93; y+=step){
    const outs = sliceAt(pos, idx, buckets, y);
    const torso = outs.length ? outs.reduce((best,o)=> Math.abs(o.cx)+Math.abs(o.cz) < Math.abs(best.cx)+Math.abs(best.cz) && o.per>H*.1 ? o : best, outs[0]) : null;
    levels.push({y, outs, torso});
  }
  // a stray bad slice (a hole bridged the wrong way) must not become the measurement: use the median of 5 neighbouring slices
  const med = arr => { const v = arr.filter(x=>x!=null).sort((a,b)=>a-b); return v.length>=3 ? v[v.length>>1] : null; };
  const smooth = fn => { const raw = levels.map(fn); levels.forEach((l,i)=>{ l._s = med(raw.slice(Math.max(0,i-2), i+3)); }); return levels.map(l=>l._s); };
  const tS = smooth(l=>l.torso ? l.torso.per : null); levels.forEach((l,i)=>{ l.tper = tS[i]; });
  const at = f => levels.reduce((b,l)=>Math.abs(l.y-f*H)<Math.abs(b.y-f*H)?l:b, levels[0]);
  const range = (a,b) => levels.filter(l=>l.y>=a*H && l.y<=b*H);
  const res = {}, rings = [], notes = [];
  const put = (k, v, conf, y, hull, why) => { if (v==null || !isFinite(v)) return; res[k] = {v:Math.round(v*2)/2, conf, why}; if (hull) rings.push({k, y, hull}); };

  // crotch: highest level (below 56%) where two leg outlines sit either side of the centre line
  const legsAt = l => { const legs = l.outs.filter(o=>o.per>H*.12 && Math.abs(o.cx) < H*.11 && o.d < H*.2); const L = legs.filter(o=>o.cx<0), R = legs.filter(o=>o.cx>0); return L.length && R.length ? [L[0], R[0]] : null; };
  let crotch = null;
  for (const l of range(.3,.56).reverse()){ if (legsAt(l)){ crotch = l; break; } }
  if (crotch) put('inseam', crotch.y, 'good', crotch.y, null, 'Floor to crotch.');
  else notes.push('Couldn’t find where the legs separate, so inseam, thigh, knee, calf and ankle were skipped. Stand with feet hip-width apart.');

  // armpit: highest level (55–82%) where separate arm outlines exist beside the torso
  const armsAt = l => l.torso ? l.outs.filter(o=>o!==l.torso && o.per>H*.06 && o.per<H*.3 && Math.abs(o.cx) > (l.torso.w/2)*0.8) : [];
  let armpit = null;
  for (const l of range(.6,.82).reverse()){ const a = armsAt(l); if (a.some(o=>o.cx<0) && a.some(o=>o.cx>0)){ armpit = l; break; } }
  if (!armpit) notes.push('Your arms seem to touch your sides, so chest, shoulder and arm measurements are rough. Hold your arms slightly away from your body when scanning.');

  const torsoMax = (a,b) => { let best = null; for (const l of range(a,b)) if (l.torso && l.tper!=null && (!best || l.tper>best.tper)) best = l; return best; };
  const torsoMin = (a,b) => { let best = null; for (const l of range(a,b)) if (l.torso && l.tper!=null && (!best || l.tper<best.tper)) best = l; return best; };

  // chest: fullest torso just below the armpit
  const ap = armpit ? armpit.y/H : .745;
  // in the chest band, ignore slices where an arm has fused with the torso (only possible to check once the arms were seen separately)
  const twoArms = l => { const a = armsAt(l); return a.some(o=>o.cx<0) && a.some(o=>o.cx>0); };
  if (armpit){ const ok = l => l.torso && twoArms(l); const cS = smooth(l=>ok(l) ? l.torso.per : null); levels.forEach((l,i)=>{ if (l.y < armpit.y && l.y > armpit.y - H*.07) l.tper = ok(l) ? cS[i] : null; }); }
  const ch = torsoMax(ap-.06, ap-.005);
  if (ch){ const merged = ch.torso.w/ch.torso.d > 1.95; put('chest', ch.tper, armpit && !merged ? 'good' : 'rough', ch.y, ch.torso.hull, 'Fullest point of the torso below the armpit.'); }
  // waist: narrowest torso between hip and chest
  const crY = crotch ? crotch.y/H : .47;
  const wa = torsoMin(Math.max(crY+.06, .55), Math.min(ap-.06, .68));
  if (wa) put('waist', wa.tper, 'good', wa.y, wa.torso.hull, 'Narrowest point of the torso.');
  // hip: fullest torso between crotch and waist (exclude levels where hands touch the hips)
  const hp = torsoMax(crY+.005, wa ? wa.y/H - .03 : .56);
  if (hp){ const handsMerged = hp.torso.w/hp.torso.d > 1.9; put('hip', hp.tper, handsMerged ? 'rough' : 'good', hp.y, hp.torso.hull, 'Fullest point of the seat.'); if (handsMerged) notes.push('Hands may be touching your hips; check the hip measurement.'); }
  // neck: narrowest torso outline above the shoulders
  const nk = torsoMin(Math.max(ap+.04, .8), .89);
  if (nk) put('neck', nk.tper*1.04, 'check', nk.y, nk.torso.hull, 'Narrowest point of the neck plus a little for the collar line.');
  // shoulder width: torso width a little above the armpit, trimmed for the deltoid muscle
  if (armpit){ const sl = at(ap + .045); if (sl.torso) put('shoulder', sl.torso.w*0.9, 'check', sl.y, null, 'Width across the shoulders; scans can’t see the shoulder bone, so check this one.'); }
  // back length: nape to waist
  if (nk && wa) put('torsoLength', (nk.y - wa.y)*1.02, 'check', null, null, 'Neck base to waist, straight line.');
  if (wa) put('outseam', wa.y, 'good', null, null, 'Waist to floor.');

  // arms
  if (armpit){
    const aS = smooth(l=>{ const a = armsAt(l); return a.length ? Math.max(...a.map(o=>o.per)) : null; }); levels.forEach((l,i)=>{ l.aper = aS[i]; });
    let ua = null;
    for (const l of range(ap-.08, ap-.01)) for (const o of armsAt(l)) if (l.aper!=null && (!ua || l.aper>ua.v)) ua = {l, o, v:l.aper};
    if (ua) put('upperArm', ua.v, 'good', ua.l.y, ua.o.hull, 'Fullest point of the upper arm.');
    let wr = null;
    for (const l of range(.47,.53)) { const arms = l.outs.filter(o=>o!==l.torso && Math.abs(o.cx) > H*.11 && o.per > H*.05 && o.per < H*.16); for (const o of arms) if (!wr || o.per<wr.o.per) wr = {l, o}; }
    if (wr){
      put('wrist', wr.o.per, 'check', wr.l.y, wr.o.hull, 'Narrowest point above the hand.');
      const shoulderY = ap*H + H*.045;
      put('armLength', (shoulderY - wr.l.y)*1.03, 'check', null, null, 'Shoulder point to wrist with arms hanging.');
    }
  }
  // legs
  if (crotch){
    const lS = smooth(l=>{ const lg = legsAt(l); return lg ? (lg[0].per+lg[1].per)/2 : null; }); levels.forEach((l,i)=>{ l.lper = lS[i]; });
    const legMax = (a,b) => { let best = null; for (const l of range(a,b)){ const lg = legsAt(l); if (!lg || l.lper==null) continue; const per = l.lper; if (!best || per>best.per) best = {l, per, o:lg[0]}; } return best; };
    const legMin = (a,b) => { let best = null; for (const l of range(a,b)){ const lg = legsAt(l); if (!lg || l.lper==null) continue; const per = l.lper; if (!best || per<best.per) best = {l, per, o:lg[0]}; } return best; };
    const cy = crotch.y/H;
    const th = legMax(cy-.06, cy-.005); if (th) put('thigh', th.per, 'good', th.l.y, th.o.hull, 'Fullest point of the thigh, average of both legs.');
    const kn = legMin(.26, .31); if (kn) put('knee', kn.per, 'check', kn.l.y, kn.o.hull, 'Around the knee.');
    const ca = legMax(.17, .25); if (ca) put('calf', ca.per, 'good', ca.l.y, ca.o.hull, 'Fullest point of the calf.');
    const an = legMin(.035, .09); if (an) put('ankle', an.per, 'check', an.l.y, an.o.hull, 'Narrowest point above the ankle bone.');
  }
  put('height', H, 'good', null, null, 'Floor to top of head.');
  return {m:res, rings, notes, armpit:!!armpit, crotch:!!crotch};
}

/* Full pipeline. opts: {height (cm), flip, turn} */
function processScan(name, buf, opts={}){
  const t0 = performance.now();
  const raw = parseScanFile(name, buf);
  const tris = raw.idx ? raw.idx.length/3 : raw.pos.length/9;
  if (tris < 500) throw new Error('This mesh is too simple to be a body scan.');
  const N = normaliseScan(raw, opts);
  if (N.H < 90 || N.H > 240) throw Object.assign(new Error(`The scan comes out at ${Math.round(N.H)} cm tall, which isn’t a standing adult. Enter the person’s real height and try again.`), {needHeight:true});
  const M = measureScan(N);
  return {id:uid(), name, size:buf.byteLength, at:nowIso(), tris, verts:raw.pos.length/3, ...N, ...M, ms:Math.round(performance.now()-t0), opts};
}
