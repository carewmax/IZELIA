/* ================= DESIGN INTERPRETER =================
   Two providers behind one interface:
   - Claude (the artifact's sample capability), when the viewer allows it
   - a local keyword interpreter, always available and labelled as such
   Both return a proposal that is validated before it touches a design. */

const COLOR_WORDS = {
  'navy':'#1F2A44','midnight':'#1F2A44','charcoal':'#33312E','grey':'#6E6A63','gray':'#6E6A63','black':'#151515','white':'#F7F7F4','ivory':'#EFE8D8','cream':'#EFE8D8','off-white':'#EFE8D8',
  'stone':'#B8AE9C','beige':'#D9C7A2','sand':'#D9C7A2','camel':'#B48A5A','tan':'#B48A5A','brown':'#6A4A33','chocolate':'#4A3122','olive':'#5E6236','khaki':'#8C8456','forest':'#2E4B3C','green':'#2E6B4C','emerald':'#1E7A55',
  'indigo':'#2C3A92','blue':'#2F55A4','royal blue':'#2348A8','sky':'#8FB3D9','light blue':'#8FB3D9','burgundy':'#6B2233','wine':'#6B2233','maroon':'#5A1E28','red':'#B32D2E','rust':'#A2482A','orange':'#D2692A',
  'saffron':'#E0A526','mustard':'#C99A2A','gold':'#C9A227','yellow':'#E6C33A','pink':'#E29AAE','blush':'#E2B4A6','purple':'#5E3B7A','lilac':'#A89BC9','teal':'#1F6E6E','denim':'#3E5674',
};
const NUM_WORDS = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};

function validateProposal(raw){
  const out = {}, rejected = [];
  if (!raw || typeof raw !== 'object') return {fields:out, rejected:['Response was not an object']};
  const f = raw.fields || raw;
  const enumField = (k, list) => { if (f[k]==null) return; const v = String(f[k]).toLowerCase().trim(); if (list.includes(v)) out[k]=v; else rejected.push(`${k}: "${f[k]}"`); };
  if (f.category!=null){ const v = String(f.category).toLowerCase(); if (CAT[v]) out.category = v; else rejected.push(`category: "${f.category}"`); }
  for (const k of ['fit','length','sleeve','collar','closure','pockets','cuffs','waistband','legShape','skirtShape','pleats','seams','topstitch','lining','embroidery','trims','print']) enumField(k, OPTIONS[k]);
  if (f.liningPrint!=null){ const v=String(f.liningPrint).toLowerCase(); if (OPTIONS.print.includes(v)) out.liningPrint=v; }
  if (f.fabric!=null){ const v = String(f.fabric).toLowerCase(); if (FABRICS[v]) out.fabric = v; else rejected.push(`fabric: "${f.fabric}"`); }
  for (const k of ['color','printColor','liningColor','buttonColor']){ if (f[k]==null) continue; const v = String(f[k]).trim(); if (/^#[0-9a-f]{6}$/i.test(v)) out[k]=v.toUpperCase(); else if (COLOR_WORDS[v.toLowerCase()]) out[k]=COLOR_WORDS[v.toLowerCase()]; else rejected.push(`${k}: "${v}"`); }
  if (f.buttons!=null){ const n = parseInt(f.buttons,10); if (n>=0 && n<=14) out.buttons = n; else rejected.push(`buttons: "${f.buttons}"`); }
  if (f.name!=null) out.name = String(f.name).slice(0,60);
  if (f.notes!=null && typeof f.notes==='string') out.notes = f.notes.slice(0,400);
  const notes = Array.isArray(raw.notes) ? raw.notes.map(String).slice(0,6) : [];
  const questions = Array.isArray(raw.questions) ? raw.questions.map(String).slice(0,4) : [];
  return {fields:out, rejected, notes, questions};
}

function localInterpret(text){
  const s = ' '+text.toLowerCase().replace(/[^a-z0-9\-\s]/g,' ')+' ';
  const has = (...w) => w.some(x => s.includes(' '+x+' ') || s.includes(' '+x+'s ') || s.includes(x));
  const f = {}; const notes = [];
  const cats = [['suit','suit'],['blazer','blazer'],['overcoat','coat'],['coat','coat'],['hoodie','hoodie'],['jeans','jeans'],['trouser','trousers'],['pants','trousers'],['shorts','shorts'],['dress','dress'],['gown','dress'],['skirt','skirt'],['t-shirt','tshirt'],['tee','tshirt'],['agbada','traditional'],['kaftan','traditional'],['caftan','traditional'],['boubou','traditional'],['dashiki','traditional'],['jacket','jacket'],['uniform','uniform'],['shirt','shirt']];
  for (const [w,c] of cats){ if (s.includes(w)){ f.category = c; break; } }
  if (has('slim','fitted','tailored fit')) f.fit='slim'; if (has('relaxed','loose','slightly relaxed')) f.fit='relaxed'; if (has('oversized','boxy')) f.fit='oversized';
  if (has('double-breasted','double breasted')) f.closure='double-breasted'; else if (has('zip','zipper')) f.closure='zip'; else if (has('wrap')) f.closure='wrap'; else if (has('button')) f.closure='buttons'; else if (has('pullover')) f.closure='pullover';
  const bm = s.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:\w+\s+)?buttons?/); if (bm) f.buttons = NUM_WORDS[bm[1]] || parseInt(bm[1],10);
  const bc = s.match(/(\w+)\s+buttons?/); if (bc && COLOR_WORDS[bc[1]]) f.buttonColor = COLOR_WORDS[bc[1]]; if (/dark buttons?/.test(s)) f.buttonColor = '#151515';
  if (has('wide-leg','wide leg','palazzo')) f.legShape='wide'; else if (has('skinny')) f.legShape='skinny'; else if (has('tapered')) f.legShape='tapered'; else if (has('flare','bootcut')) f.legShape='flare';
  if (has('peak lapel','peaked')) f.collar='peak-lapel'; else if (has('shawl')) f.collar='shawl'; else if (has('lapel')) f.collar='notch-lapel'; else if (has('mandarin','band collar','nehru')) f.collar='mandarin'; else if (has('button-down','button down collar')) f.collar='button-down'; else if (has('v-neck','v neck')) f.collar='v-neck'; else if (has('scoop')) f.collar='scoop'; else if (has('crew')) f.collar='crew'; else if (has('boat neck')) f.collar='boat'; else if (has('hood')) f.collar='hood';
  if (has('sleeveless')) f.sleeve='none'; else if (has('short sleeve','short-sleeve')) f.sleeve='short'; else if (has('three-quarter','3 4 sleeve')) f.sleeve='three-quarter'; else if (has('wide sleeve','flowing sleeve','bell sleeve')) f.sleeve='wide'; else if (has('long sleeve','long-sleeve')) f.sleeve='long';
  if (has('floor-length','floor length','maxi')) f.length='floor'; else if (has('ankle')) f.length='ankle'; else if (has('midi')) f.length='midi'; else if (has('knee')) f.length='knee'; else if (has('cropped','crop')) f.length='cropped';
  if (has('a-line')) f.skirtShape='a-line'; else if (has('pencil')) f.skirtShape='pencil'; else if (has('flared','circle skirt')) f.skirtShape='flared'; else if (has('gathered')) f.skirtShape='gathered';
  if (has('full lining','fully lined','lining')) f.lining='full'; if (has('half lining','half-lined')) f.lining='half'; if (has('unlined')) f.lining='none';
  if (has('double pleat')) f.pleats='double'; else if (has('pleat')) f.pleats='single';
  if (has('patch pocket')) f.pockets='patch'; else if (has('chest pocket')) f.pockets='chest'; else if (has('flap pocket')) f.pockets='flap'; else if (has('kangaroo')) f.pockets='kangaroo'; else if (has('five-pocket','5-pocket')) f.pockets='five-pocket';
  if (has('embroider')) f.embroidery = has('cuff')?'cuffs':'neckline';
  if (has('contrast stitch','contrast topstitch')) f.topstitch='contrast';
  if (has('flat-felled','flat felled')) f.seams='flat-felled'; if (has('french seam')) f.seams='french';
  const fab = [['linen','linen'],['denim','denim'],['silk','silk'],['chiffon','chiffon'],['wool','suiting'],['tweed','coating'],['jersey','jersey'],['fleece','fleece'],['ankara','ankara'],['wax print','ankara'],['gara','gara'],['tie-dye','gara'],['damask','damask'],['bazin','damask'],['canvas','canvas'],['twill','chino'],['chino','chino'],['oxford','oxford'],['poplin','poplin'],['cotton','poplin']];
  for (const [w,k] of fab){ if (s.includes(w)){ f.fabric = k; break; } }
  if (has('pinstripe','stripe')) f.print='stripe'; else if (has('check','plaid','tartan')) f.print='check'; else if (has('polka')) f.print='polka'; else if (has('herringbone')) f.print='herringbone'; else if (has('gara','tie-dye')) f.print='gara'; else if (has('ankara','wax print')) f.print='wax';
  // geometric / African-inspired accents usually apply to lining when "lining" is mentioned next to it
  if (has('geometric','adinkra','kente','african-inspired','african inspired')){ if (/lining/.test(s)) { f.liningPrint='geometric'; f.lining = f.lining || 'full'; notes.push('Geometric print applied to the lining, as the brief mentions it with the lining.'); } else f.print='geometric'; }
  // colours: first colour word that is not a button colour
  const words = Object.keys(COLOR_WORDS).sort((a,b)=>b.length-a.length);
  for (const w of words){ const re = new RegExp('\\b'+w+'\\b(?!\\s+buttons?)'); if (re.test(s)){ f.color = COLOR_WORDS[w]; break; } }
  if (has('structured shoulder','strong shoulder')) notes.push('Structured shoulder: add shoulder pads and a firm canvas front.');
  if (f.category) f.name = CAT[f.category].label.replace(/s$/,'') + ' design';
  const questions = [];
  if (!f.category) questions.push('Which garment type is this? Choose a category above.');
  if (!f.fabric) questions.push('Which fabric should it use?');
  return validateProposal({fields:f, notes, questions});
}

const AI = {
  ctl:null,
  available(){ return !!Caps.sample; },
  prompt(text){
    const enums = Object.entries(OPTIONS).map(([k,v])=>`${k}: ${v.join(' | ')}`).join('\n');
    return `You turn a clothing design brief into a structured specification for a tailoring app.
Reply with only JSON in this shape: {"fields": {...}, "notes": ["..."], "questions": ["..."]}

Allowed fields (use exactly these values):
category: ${CATEGORIES.map(c=>c.k).join(' | ')}
${enums}
liningPrint: ${OPTIONS.print.join(' | ')}
fabric: ${Object.keys(FABRICS).join(' | ')}
color, printColor, liningColor, buttonColor: "#RRGGBB" approximating the colour described
buttons: integer 0-14
name: a short garment name, at most 6 words
notes: one sentence of construction details that do not fit a field

Rules:
- Include only fields the brief states or clearly implies. Leave everything else out.
- Never output body measurements or garment dimensions.
- "notes" (top level) lists how you read ambiguous parts. "questions" lists what the designer should confirm.

Brief:
"""${text.slice(0,2000)}"""`;
  },
  async interpret(text, onStatus){
    if (!this.available()) return {provider:'local', ...localInterpret(text)};
    this.ctl = new AbortController();
    onStatus && onStatus('Thinking…');
    try {
      const raw = await Caps.sample.json(this.prompt(text), {signal:this.ctl.signal, modelTier:'default'});
      return {provider:'claude', ...validateProposal(raw)};
    } catch(e){
      if (e && e.code==='cancelled') return null;
      const local = localInterpret(text);
      const why = {not_granted:'Claude was not allowed for this page', rate_limited:'Claude is busy right now', invalid_json:'Claude returned an unreadable answer', sampling_disabled:'Claude is not available on this account'}[e?.code] || 'Claude could not be reached';
      if (e && ['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(e.code)) Caps.sample = null;
      return {provider:'local', fallbackReason:why, ...local};
    }
  },
  async analyzeImages(files, spec){
    if (!this.available() || !Caps.sampleImages) return null;
    this.ctl = new AbortController();
    const prompt = `These are reference images for a garment design (role tags: ${files.map(f=>f.role).join(', ')}). The current design is a ${CAT[spec.category]?.label || spec.category}.
Describe only garment features you can actually see, using the same JSON shape and allowed values as this list:
${Object.entries(OPTIONS).map(([k,v])=>`${k}: ${v.join(' | ')}`).join('\n')}
fabric: ${Object.keys(FABRICS).join(' | ')}
color, printColor: "#RRGGBB"
Reply with only JSON: {"fields": {...}, "notes": ["what you saw, one item per feature"], "questions": ["what a photo cannot tell, e.g. back details or exact lengths"]}
Never estimate measurements or sizes from a photo.`;
    try {
      const raw = await Caps.sample.json(prompt, {images: files.map(f=>f.file), signal:this.ctl.signal});
      return {provider:'claude', ...validateProposal(raw)};
    } catch(e){
      if (e && e.code==='cancelled') return null;
      if (e && e.code==='images_unavailable') Caps.sampleImages = false;
      return {error: e?.code || 'error'};
    }
  },
  stop(){ if (this.ctl) this.ctl.abort(); },
};
