/* ================= TECHNICAL FLATS (SVG) =================
   Flat sketches in the style of a tech pack, drawn from the garment spec. */
let FLAT_N = 0;
function flatSVG(spec, view='front', opts={}){
  const id = 'fp'+(++FLAT_N);
  const mono = !!opts.mono;
  const fill = mono ? 'none' : ((spec.fabricProduct?.image || (spec.print && spec.print!=='solid')) ? `url(#${id})` : spec.color);
  const st = `stroke="currentColor" stroke-width="${mono?2.2:1.5}" stroke-linejoin="round" stroke-linecap="round"`;
  const det = `stroke="currentColor" stroke-width="1" fill="none" opacity=".55"`;
  const t = spec.template;
  const hemMap = {cropped:118, waist:138, hip:160, thigh:180, knee:205, midi:222, ankle:232, floor:236};
  const fitW = {slim:0, regular:4, relaxed:9, oversized:16, custom:5}[spec.fit] ?? 4;
  let defs = '', body = '';
  if (!mono && spec.fabricProduct?.image) defs = `<defs><pattern id="${id}" width="90" height="110" patternUnits="userSpaceOnUse"><image href="${spec.fabricProduct.image}" width="90" height="110" preserveAspectRatio="xMidYMid slice"/></pattern></defs>`;
  else if (!mono && spec.print && spec.print!=='solid') defs = `<defs>${printPattern(id, spec.print, spec.color, spec.printColor||'#222')}</defs>`;
  const front = view==='front';

  const top = (hem, opt={}) => {
    const sw = 34 + fitW + (opt.wide||0), cx = 100;
    const sh = 40, nk = 13;
    const flare = opt.flare || 0;
    const sl = {none:0, cap:.12, short:.32, elbow:.5, 'three-quarter':.74, long:1, wide:1}[spec.sleeve] ?? 0;
    let s = '';
    if (sl>0){
      for (const d of [-1,1]){
        const x0 = cx + d*(sw+4), y0 = sh+2, ax = cx + d*(sw+2), ay = 82;
        const len = 118*sl;
        const ang = spec.sleeve==='wide' ? 1.05 : .32;
        const ex = x0 + d*Math.sin(ang)*len, ey = y0 + Math.cos(ang)*len;
        const wid = spec.sleeve==='wide' ? 62 : 24 + fitW*.6;
        const ix = ex - d*Math.cos(ang)*wid*.9, iy = ey + Math.sin(ang)*wid*.25 - (spec.sleeve==='wide'?-20:0);
        s += `<path d="M${x0} ${y0} L${ex} ${ey} L${ix} ${iy} L${ax} ${ay} Z" fill="${fill}" ${st}/>`;
        if (spec.sleeve==='long' && ['barrel','french','ribbed'].includes(spec.cuffs)){
          const k = .15; s += `<path d="M${lerp(ex,x0,k)} ${lerp(ey,y0,k)} L${lerp(ix,ax,k*1.1)} ${lerp(iy,ay,k*1.1)}" ${det}/>`;
        }
      }
    }
    const hl = hem + (t==='top' && spec.category!=='uniform' ? 6 : 0);
    s += `<path d="M${cx-nk} ${sh-8} L${cx-sw-4} ${sh+2} L${cx-sw-2} 82 L${cx-sw-flare} ${hem} Q${cx} ${hl+4} ${cx+sw+flare} ${hem} L${cx+sw+2} 82 L${cx+sw+4} ${sh+2} L${cx+nk} ${sh-8} Q${cx} ${front?sh+2:sh-4} ${cx-nk} ${sh-8} Z" fill="${fill}" ${st}/>`;
    return s;
  };
  const neckline = (hem) => {
    const cx=100, sh=32; let s='';
    if (!front){ if (spec.collar==='hood') s += `<path d="M78 34 Q100 -6 122 34 Q120 58 100 62 Q80 58 78 34 Z" fill="${fill}" ${st}/>`; else if (['point','button-down','mandarin','notch-lapel','peak-lapel','shawl'].includes(spec.collar)) s+=`<path d="M86 32 Q100 26 114 32 L114 37 Q100 33 86 37 Z" fill="${fill}" ${st}/>`; return s; }
    switch(spec.collar){
      case 'crew': s += `<path d="M87 32 Q100 46 113 32" ${det} opacity=".9"/>`; break;
      case 'v-neck': s += `<path d="M87 32 L100 64 L113 32" ${det} opacity=".9"/>`; break;
      case 'scoop': s += `<path d="M86 33 Q100 62 114 33" ${det} opacity=".9"/>`; break;
      case 'boat': s += `<path d="M80 34 Q100 40 120 34" ${det} opacity=".9"/>`; break;
      case 'mandarin': s += `<path d="M87 26 L113 26 L114 36 Q100 40 86 36 Z" fill="${fill}" ${st}/>`; break;
      case 'point': case 'button-down': s += `<path d="M87 30 L100 40 L92 52 L82 36 Z M113 30 L100 40 L108 52 L118 36 Z" fill="${fill}" ${st}/>`; if (spec.collar==='button-down') s+=`<circle cx="91" cy="49" r="1.4" fill="currentColor"/><circle cx="109" cy="49" r="1.4" fill="currentColor"/>`; break;
      case 'notch-lapel': case 'peak-lapel': case 'shawl': {
        const by = Math.min(hem-30, 112);
        if (spec.collar==='shawl') s += `<path d="M88 30 Q74 70 100 ${by} L100 ${by} Q86 70 100 34 Q114 70 100 ${by} Q126 70 112 30" fill="${fill}" ${st}/>`;
        else { const peak = spec.collar==='peak-lapel'; s += `<path d="M88 30 L80 ${peak?52:58} L${peak?70:76} ${peak?50:62} L100 ${by} Z M112 30 L120 ${peak?52:58} L${peak?130:124} ${peak?50:62} L100 ${by} Z" fill="${fill}" ${st}/>`; }
        break;
      }
      case 'hood': s += `<path d="M84 34 Q100 52 116 34" ${det} opacity=".9"/><path d="M80 34 Q76 18 90 14 M120 34 Q124 18 110 14" ${det}/><path d="M95 40 L94 56 M105 40 L106 56" ${det}/>`; break;
    }
    return s;
  };
  const closure = (hem) => {
    if (!front) return '';
    let s=''; const cx=100;
    if (spec.closure==='buttons' && spec.buttons>0){
      const lap = ['notch-lapel','peak-lapel','shawl'].includes(spec.collar);
      const y0 = lap ? Math.min(hem-30,112) : 44, y1 = lap ? y0+12*(spec.buttons-1) : hem-12;
      s += `<path d="M${cx} ${lap?y0:36} L${cx} ${hem}" ${det}/>`;
      for (let i=0;i<spec.buttons;i++){ const y = spec.buttons===1?y0:lerp(y0,y1,i/(spec.buttons-1)); s += `<circle cx="${cx+ (lap?0:0)}" cy="${y}" r="2.3" fill="${spec.buttonColor||'currentColor'}" stroke="currentColor" stroke-width=".7"/>`; }
    }
    if (spec.closure==='double-breasted'){ const n = Math.max(1,Math.round((spec.buttons||6)/2)); for (let i=0;i<n;i++){ const y = 104+i*13; s += `<circle cx="88" cy="${y}" r="2.4" fill="${spec.buttonColor||'currentColor'}" stroke="currentColor" stroke-width=".7"/><circle cx="112" cy="${y}" r="2.4" fill="${spec.buttonColor||'currentColor'}" stroke="currentColor" stroke-width=".7"/>`; } s+=`<path d="M106 ${Math.min(hem-30,112)} L106 ${hem}" ${det}/>`; }
    if (spec.closure==='zip') s += `<path d="M${cx} 36 L${cx} ${hem}" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 1.5" fill="none"/>`;
    if (spec.closure==='wrap') s += `<path d="M86 34 L124 ${Math.min(hem,140)}" ${det} opacity=".9"/>`;
    return s;
  };
  const pockets = (hem) => {
    if (!front) return ''; let s='';
    const r = (x,y,w,h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="none" stroke="currentColor" stroke-width="1" opacity=".7"/>`;
    if (spec.pockets==='chest') s += r(108,58,13,15);
    if (spec.pockets==='patch'){ s += r(68,hem-38,20,22)+r(112,hem-38,20,22); }
    if (spec.pockets==='flap'||spec.pockets==='welt'){ const h = spec.pockets==='flap'?7:2; s += r(66,hem-30,22,h)+r(112,hem-30,22,h); }
    if (spec.pockets==='kangaroo') s += `<path d="M76 ${hem-40} L124 ${hem-40} L130 ${hem-12} L70 ${hem-12} Z" fill="none" stroke="currentColor" stroke-width="1" opacity=".7"/>`;
    return s;
  };
  const trousers = (yTop, hem, opt={}) => {
    const shape = spec.legShape || 'straight';
    const w = 36 + fitW*.6;
    const hemHalf = {skinny:11, straight:16, tapered:12, wide:24, flare:23}[shape] + fitW*.3;
    const kneeHalf = {skinny:12, straight:16, tapered:15, wide:22, flare:13}[shape] + fitW*.3;
    const cx = 100, crotch = yTop + 58, knee = lerp(crotch, hem, .45);
    let s = '';
    const lx = cx - w/2 - 2, rx = cx + w/2 + 2;
    s += `<path d="M${cx-w} ${yTop} L${cx+w} ${yTop} L${cx+w+3} ${crotch-10} L${rx+kneeHalf} ${knee} L${rx+hemHalf} ${hem} L${rx-hemHalf} ${hem} L${rx-kneeHalf} ${knee} L${cx+1} ${crotch} L${cx-1} ${crotch} L${lx+kneeHalf} ${knee} L${lx+hemHalf} ${hem} L${lx-hemHalf} ${hem} L${lx-kneeHalf} ${knee} L${cx-w-3} ${crotch-10} Z" fill="${fill}" ${st}/>`;
    if (spec.waistband!=='none') s += `<path d="M${cx-w} ${yTop+9} L${cx+w} ${yTop+9}" ${det} opacity=".9"/>`;
    if (front){
      s += `<path d="M${cx} ${yTop+9} L${cx} ${yTop+38}" ${det}/>`;
      if (spec.pockets==='five-pocket') s += `<path d="M${cx-w+4} ${yTop+11} Q${cx-w+16} ${yTop+14} ${cx-w+20} ${yTop+28} M${cx+w-4} ${yTop+11} Q${cx+w-16} ${yTop+14} ${cx+w-20} ${yTop+28}" ${det}/>`;
      else if (spec.pockets!=='none') s += `<path d="M${cx-w+2} ${yTop+12} L${cx-w+9} ${yTop+32} M${cx+w-2} ${yTop+12} L${cx+w-9} ${yTop+32}" ${det}/>`;
      if (spec.pleats==='single'||spec.pleats==='double'){ s += `<path d="M${cx-18} ${yTop+9} L${cx-17} ${yTop+24} M${cx+18} ${yTop+9} L${cx+17} ${yTop+24}" ${det}/>`; if (spec.pleats==='double') s += `<path d="M${cx-26} ${yTop+9} L${cx-25} ${yTop+20} M${cx+26} ${yTop+9} L${cx+25} ${yTop+20}" ${det}/>`; }
      s += `<path d="M${lx} ${crotch+4} L${lx} ${hem-2} M${rx} ${crotch+4} L${rx} ${hem-2}" ${det} opacity=".3"/>`;
    } else s += `<path d="M${cx-w+6} ${yTop+20} L${cx-8} ${yTop+20} M${cx+8} ${yTop+20} L${cx+w-6} ${yTop+20}" ${det}/>`;
    if (spec.topstitch==='contrast') s += `<path d="M${cx-w+2} ${yTop+3} L${cx+w-2} ${yTop+3}" stroke="#D9A520" stroke-width="1" stroke-dasharray="2 2" fill="none"/>`;
    if (spec.cuffs==='turn-up') s += `<path d="M${lx-hemHalf} ${hem-6} L${lx+hemHalf} ${hem-6} M${rx-hemHalf} ${hem-6} L${rx+hemHalf} ${hem-6}" ${det} opacity=".9"/>`;
    return s;
  };
  const skirt = (yTop, hem, extraW=0) => {
    const fl = {pencil:-2, 'a-line':22, flared:44, gathered:36, wrap:24}[spec.skirtShape] ?? 22;
    const w = 32 + fitW*.4 + extraW;
    let s = `<path d="M${100-w} ${yTop} L${100+w} ${yTop} L${100+w+6+fl} ${hem} Q100 ${hem+5} ${100-w-6-fl} ${hem} Z" fill="${fill}" ${st}/>`;
    if (spec.skirtShape==='gathered'||spec.skirtShape==='flared') for (let i=-3;i<=3;i++) s += `<path d="M${100+i*w/4} ${yTop+6} L${100+i*(w+fl)/3.6} ${hem-2}" ${det} opacity=".35"/>`;
    if (spec.skirtShape==='wrap' && front) s += `<path d="M${100+w*.6} ${yTop} Q${100+w*.2} ${(yTop+hem)/2} ${100-w*.3} ${hem}" ${det}/>`;
    return s;
  };

  if (t==='bottom'){ const hem = spec.length==='thigh' ? 120 : spec.length==='knee' ? 160 : 232; body = trousers(14, hem); }
  else if (t==='skirt'){ body = skirt(40, hemMap[spec.length]||205) + `<path d="M68 40 L132 40 L132 48 L68 48 Z" fill="${fill}" ${st}/>`; }
  else if (t==='dress'){ const hem = hemMap[spec.length]||222; body = skirt(118, hem, 0) + top(122) + neckline(122) + (front && spec.closure==='zip' ? '' : closure(122)); }
  else if (t==='robe'){ const hem = hemMap[spec.length]||236; body = top(hem, {wide: spec.sleeve==='wide'?14:6, flare:18}) + neckline(hem) + pockets(hem); if (spec.embroidery==='neckline' && front) body += `<path d="M88 34 Q100 60 112 34 M92 44 Q100 90 108 44 M100 60 L100 98" stroke="#C9A227" stroke-width="1.6" fill="none"/>`; }
  else if (t==='suit'){ body = trousers(118, 236) + top(162, {flare:4}) + neckline(162) + closure(162) + pockets(162); }
  else { const hem = hemMap[spec.length]||160; body = top(hem, {flare: t==='jacket'?3:0}) + neckline(hem) + closure(hem) + pockets(hem); if (spec.cuffs==='ribbed'||t==='hoodie') body += `<path d="M${100-38-fitW} ${hem-8} L${100+38+fitW} ${hem-8}" ${det}/>`; }
  if (!front && !['bottom','skirt'].includes(t)) body += `<path d="M100 40 L100 ${t==='jacket'||t==='suit'?150:44}" ${det} opacity=".3"/>`;
  const label = opts.label ? `<title>${esc(opts.label)}</title>` : '';
  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(opts.label || (spec.name||'Garment')+' '+view+' flat')}">${label}${defs}${body}</svg>`;
}
function printPattern(id, print, base, ink){
  const P = (w, h, inner) => `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><rect width="${w}" height="${h}" fill="${base}"/>${inner}</pattern>`;
  switch(print){
    case 'stripe': return P(8,8,`<rect width="1.2" height="8" fill="${ink}"/>`);
    case 'check': return P(16,16,`<rect width="6" height="16" fill="${ink}" opacity=".35"/><rect width="16" height="6" fill="${ink}" opacity=".35"/>`);
    case 'herringbone': return P(8,8,`<path d="M0 0 L4 4 L8 0" stroke="${ink}" stroke-width=".8" fill="none" opacity=".4"/>`);
    case 'polka': return P(10,10,`<circle cx="5" cy="5" r="1.6" fill="${ink}"/>`);
    case 'wax': return P(18,18,`<circle cx="9" cy="9" r="7" fill="none" stroke="${ink}" stroke-width="1.6"/><circle cx="9" cy="9" r="2.2" fill="${ink}"/>`);
    case 'geometric': return P(16,16,`<rect x="2" y="2" width="12" height="12" fill="none" stroke="${ink}" stroke-width="1.2"/><path d="M2 8 L8 2 L14 8 L8 14 Z" fill="none" stroke="${ink}" stroke-width="1.2"/>`);
    case 'gara': return P(26,26,`<circle cx="7" cy="8" r="6" fill="none" stroke="${ink}" stroke-width="2" opacity=".7"/><circle cx="19" cy="19" r="5" fill="none" stroke="${ink}" stroke-width="2.4" opacity=".6"/><circle cx="20" cy="5" r="2.5" fill="${ink}" opacity=".45"/>`);
  }
  return P(4,4,'');
}
function catIcon(k){ const s = defaultSpec(k); return flatSVG(s,'front',{mono:true, label:CAT[k].label}); }
