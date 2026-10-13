/* ================= DATA DEFINITIONS ================= */
const MDEF = [
  {k:'height', label:'Height', g:'Lengths', guide:'Stand straight against a wall, heels together, looking ahead. Measure from the floor to the top of the head.'},
  {k:'weight', label:'Weight', g:'Lengths', opt:true, guide:'Optional. Only used by the quick estimate; never needed for a fitting.'},
  {k:'neck', label:'Neck', g:'Upper body', guide:'Around the base of the neck where a shirt collar sits. Keep one finger under the tape.'},
  {k:'shoulder', label:'Shoulder width', g:'Upper body', guide:'Across the back, from one shoulder point (where the arm meets the shoulder bone) to the other.'},
  {k:'chest', label:'Chest / bust', g:'Upper body', guide:'Around the fullest part of the chest or bust, tape level under the arms. Breathe normally.'},
  {k:'underbust', label:'Underbust', g:'Upper body', opt:true, guide:'Directly under the bust, tape level and snug. Skip it if it is not relevant to you.'},
  {k:'waist', label:'Waist', g:'Upper body', guide:'Around the natural waist: the narrowest point, usually just above the navel.'},
  {k:'upperArm', label:'Upper arm', g:'Upper body', guide:'Around the fullest part of the upper arm, arm relaxed by the side.'},
  {k:'wrist', label:'Wrist', g:'Upper body', guide:'Around the wrist bone.'},
  {k:'armLength', label:'Arm length', g:'Lengths', guide:'From the shoulder point, over a slightly bent elbow, to the wrist bone.'},
  {k:'torsoLength', label:'Back length', g:'Lengths', guide:'From the prominent bone at the back of the neck down to the natural waist.'},
  {k:'hip', label:'Hip / seat', g:'Lower body', guide:'Around the fullest part of the seat, feet together.'},
  {k:'thigh', label:'Thigh', g:'Lower body', guide:'Around the fullest part of one thigh, just below the crotch.'},
  {k:'knee', label:'Knee', g:'Lower body', guide:'Around the knee with the leg straight.'},
  {k:'calf', label:'Calf', g:'Lower body', guide:'Around the fullest part of the calf.'},
  {k:'ankle', label:'Ankle', g:'Lower body', guide:'Around the ankle, just above the bone.'},
  {k:'inseam', label:'Inseam', g:'Lengths', guide:'From the crotch down the inside leg to the floor, barefoot.'},
  {k:'outseam', label:'Outseam', g:'Lengths', guide:'From the natural waist down the outside of the leg to the floor.'},
  {k:'frontRise', label:'Front rise', g:'Lower body', opt:true, guide:'From the crotch point up the front to the waistline.'},
  {k:'backRise', label:'Back rise', g:'Lower body', opt:true, guide:'From the crotch point up the back to the waistline.'},
];
const MBYK = Object.fromEntries(MDEF.map(d=>[d.k,d]));
const MGROUPS = ['Upper body','Lower body','Lengths'];

/* Which measurements a pattern template needs. */
const REQ = {
  top:['height','chest','waist','shoulder','neck','armLength','torsoLength'],
  tee:['height','chest','shoulder','torsoLength','armLength'],
  hoodie:['height','chest','shoulder','torsoLength','armLength','wrist'],
  jacket:['height','chest','waist','hip','shoulder','neck','armLength','torsoLength'],
  bottom:['height','waist','hip','inseam','outseam','thigh','knee'],
  skirt:['height','waist','hip','outseam'],
  dress:['height','chest','waist','hip','shoulder','torsoLength','outseam'],
  robe:['height','chest','shoulder','armLength','neck'],
  suit:['height','chest','waist','hip','shoulder','neck','armLength','torsoLength','inseam','outseam','thigh','knee'],
};

const CATEGORIES = [
  {k:'shirt', label:'Shirts', t:'top'},
  {k:'tshirt', label:'T-shirts', t:'tee'},
  {k:'trousers', label:'Trousers', t:'bottom'},
  {k:'jeans', label:'Jeans', t:'bottom'},
  {k:'shorts', label:'Shorts', t:'bottom'},
  {k:'dress', label:'Dresses', t:'dress'},
  {k:'skirt', label:'Skirts', t:'skirt'},
  {k:'jacket', label:'Jackets', t:'jacket'},
  {k:'coat', label:'Coats', t:'jacket'},
  {k:'hoodie', label:'Hoodies', t:'hoodie'},
  {k:'suit', label:'Suits', t:'suit'},
  {k:'blazer', label:'Blazers', t:'jacket'},
  {k:'traditional', label:'Traditional African', t:'robe'},
  {k:'uniform', label:'Tailored uniforms', t:'top'},
  {k:'sportswear', label:'Sportswear', t:'tee'},
  {k:'workwear', label:'Workwear', t:'jacket'},
  {k:'children', label:"Children's", t:'tee'},
  {k:'custom', label:'Custom', t:'top'},
];
const CAT = Object.fromEntries(CATEGORIES.map(c=>[c.k,c]));
const TEMPLATES = ['top','tee','hoodie','jacket','bottom','skirt','dress','robe','suit'];
const TEMPLATE_LABEL = {top:'Shirt block',tee:'Knit top block',hoodie:'Hoodie block',jacket:'Jacket block',bottom:'Trouser block',skirt:'Skirt block',dress:'Dress block',robe:'Robe block',suit:'Suit (jacket + trouser)'};

/* Fabric library. Widths are typical bolt widths; price is left to the user. */
const FABRICS = {
  'poplin':     {name:'Cotton poplin', w:150, gsm:115, stretch:0, drape:.45, rough:.75, nap:false, sheen:.05},
  'oxford':     {name:'Oxford cotton', w:150, gsm:140, stretch:0, drape:.35, rough:.85, nap:false, sheen:.03},
  'linen':      {name:'Linen', w:140, gsm:170, stretch:0, drape:.5, rough:.9, nap:false, sheen:.02},
  'denim':      {name:'Denim 13oz', w:150, gsm:440, stretch:0, drape:.15, rough:.95, nap:false, sheen:0},
  'stretch-denim':{name:'Stretch denim', w:140, gsm:330, stretch:12, drape:.25, rough:.9, nap:false, sheen:0},
  'chino':      {name:'Cotton twill', w:150, gsm:260, stretch:2, drape:.25, rough:.85, nap:false, sheen:.02},
  'suiting':    {name:'Wool suiting', w:150, gsm:260, stretch:0, drape:.4, rough:.6, nap:false, sheen:.12},
  'coating':    {name:'Wool coating', w:150, gsm:520, stretch:0, drape:.2, rough:.8, nap:true, sheen:.02},
  'jersey':     {name:'Cotton jersey', w:160, gsm:180, stretch:30, drape:.6, rough:.85, nap:false, sheen:.02},
  'fleece':     {name:'Brushed fleece', w:170, gsm:320, stretch:20, drape:.35, rough:1, nap:true, sheen:0},
  'silk':       {name:'Silk crepe', w:140, gsm:90, stretch:0, drape:.9, rough:.35, nap:false, sheen:.35},
  'chiffon':    {name:'Chiffon', w:150, gsm:60, stretch:0, drape:.95, rough:.5, nap:false, sheen:.15},
  'ankara':     {name:'Ankara wax print', w:115, gsm:125, stretch:0, drape:.4, rough:.7, nap:false, sheen:.12, piece:'6 yd piece'},
  'gara':       {name:'Gara (hand-dyed cotton)', w:110, gsm:120, stretch:0, drape:.45, rough:.8, nap:false, sheen:.03},
  'damask':     {name:'Damask / bazin', w:150, gsm:200, stretch:0, drape:.55, rough:.4, nap:true, sheen:.4},
  'sport':      {name:'Performance poly', w:160, gsm:150, stretch:25, drape:.5, rough:.6, nap:false, sheen:.15},
  'canvas':     {name:'Cotton canvas', w:150, gsm:380, stretch:0, drape:.1, rough:.95, nap:false, sheen:0},
  'izelia':     {name:'IZELIA fabric (material not published)', w:110, gsm:130, stretch:0, drape:.45, rough:.8, nap:false, sheen:.05, assumed:true},
  'lining':     {name:'Viscose lining', w:140, gsm:75, stretch:0, drape:.8, rough:.3, nap:false, sheen:.4},
};
const PRINTS = {solid:'Solid', stripe:'Stripe', check:'Check', herringbone:'Herringbone', gara:'Gara tie-dye', geometric:'Geometric (adinkra-style)', wax:'Wax-print circles', polka:'Polka dot'};
const DIRECTIONAL_PRINTS = ['stripe','check','geometric','wax'];

const PALETTE = [
  {n:'Ink navy',h:'#1F2A44'},{n:'Charcoal',h:'#33312E'},{n:'Black',h:'#151515'},{n:'Ivory',h:'#EFE8D8'},{n:'White',h:'#F7F7F4'},
  {n:'Stone',h:'#B8AE9C'},{n:'Camel',h:'#B48A5A'},{n:'Olive',h:'#5E6236'},{n:'Forest',h:'#2E4B3C'},{n:'Indigo',h:'#2C3A92'},
  {n:'Gara blue',h:'#3B5BA9'},{n:'Sky',h:'#8FB3D9'},{n:'Burgundy',h:'#6B2233'},{n:'Rust',h:'#A2482A'},{n:'Saffron',h:'#E0A526'},
  {n:'Emerald',h:'#1E7A55'},{n:'Blush',h:'#E2B4A6'},{n:'Lilac',h:'#A89BC9'},{n:'Denim',h:'#3E5674'},{n:'Sand',h:'#D9C7A2'},
];

const OPTIONS = {
  fit:['slim','regular','relaxed','oversized','custom'],
  length:['cropped','waist','hip','thigh','knee','midi','ankle','floor'],
  sleeve:['none','cap','short','elbow','three-quarter','long','wide'],
  collar:['none','crew','v-neck','scoop','boat','point','button-down','mandarin','notch-lapel','peak-lapel','shawl','hood'],
  closure:['none','pullover','buttons','double-breasted','zip','wrap'],
  pockets:['none','chest','patch','welt','flap','side-seam','five-pocket','kangaroo'],
  cuffs:['none','barrel','french','ribbed','turn-up'],
  waistband:['standard','elastic','drawstring','high','none'],
  legShape:['skinny','straight','tapered','wide','flare'],
  skirtShape:['pencil','a-line','flared','gathered','wrap'],
  pleats:['none','single','double','box'],
  seams:['plain','flat-felled','french','overlocked'],
  topstitch:['none','tonal','contrast'],
  lining:['none','half','full'],
  embroidery:['none','neckline','cuffs','hem','all-over'],
  trims:['none','piping','braid'],
  print: Object.keys(PRINTS),
};
const OPT_LABEL = {
  'v-neck':'V-neck','notch-lapel':'Notch lapel','peak-lapel':'Peak lapel','button-down':'Button-down','three-quarter':'¾',
  'double-breasted':'Double-breasted','side-seam':'Side-seam','five-pocket':'Five-pocket','a-line':'A-line','flat-felled':'Flat-felled','all-over':'All-over',
};
const optLabel = v => OPT_LABEL[v] || (String(v).charAt(0).toUpperCase()+String(v).slice(1));

/* Ease (cm, total circumference) added over the body by fit, per zone. */
const EASE = {
  top:    {slim:[6,6,6],  regular:[10,12,10], relaxed:[16,18,14], oversized:[26,28,22]},
  tee:    {slim:[2,2,2],  regular:[8,10,8],   relaxed:[14,16,12], oversized:[24,26,22]},
  hoodie: {slim:[6,6,6],  regular:[12,14,12], relaxed:[18,20,16], oversized:[28,30,26]},
  jacket: {slim:[8,8,8],  regular:[12,12,10], relaxed:[16,18,14], oversized:[26,28,24]},
  bottom: {slim:[0,1,3],  regular:[0,2,6],    relaxed:[0,3,10],   oversized:[0,4,16]},
  skirt:  {slim:[0,1,3],  regular:[0,2,5],    relaxed:[0,3,10],   oversized:[0,4,16]},
  dress:  {slim:[5,3,4],  regular:[8,6,8],    relaxed:[14,14,14], oversized:[24,28,28]},
  robe:   {slim:[14,20,20],regular:[22,30,30],relaxed:[32,44,44], oversized:[50,64,64]},
};
/* Acceptable ease window per zone (min, max) used for fit status. */
const EASE_OK = {top:[4,30], tee:[0,30], hoodie:[4,34], jacket:[6,32], bottom:[0,14], skirt:[0,16], dress:[3,30], robe:[10,80]};

const SKIN = ['#E9C8A8','#D6A57C','#B27A51','#8C5634','#6A3F25','#4A2A18'];

const ORDER_STATUSES = ['Draft','Awaiting customer approval','Awaiting measurements','Materials to be sourced','Ready for cutting','In production','Fitting required','Alterations required','Completed','Delivered'];

const CURRENCIES = {SLE:'Le',USD:'$',GBP:'£',EUR:'€',NGN:'₦',GHS:'GH₵'};

/* ---------- default spec per category ---------- */
function defaultSpec(category='shirt'){
  const c = CAT[category] || CAT.custom;
  const base = {category, template:c.t, name:'', fit:'regular', customEase:{chest:10,waist:10,hip:10},
    length:'hip', sleeve:'long', collar:'point', closure:'buttons', buttons:7, buttonColor:'#2B2A28',
    pockets:'none', cuffs:'barrel', waistband:'standard', legShape:'straight', skirtShape:'a-line',
    pleats:'none', seams:'plain', topstitch:'none', lining:'none', liningColor:'#6B2233', liningPrint:'solid',
    embroidery:'none', trims:'none', fabric:'poplin', color:'#EFE8D8', print:'solid', printColor:'#1F2A44', notes:''};
  const set = (o)=>Object.assign(base,o);
  switch(category){
    case 'tshirt': set({fabric:'jersey',collar:'crew',closure:'pullover',sleeve:'short',cuffs:'none',length:'hip',color:'#F7F7F4',buttons:0}); break;
    case 'sportswear': set({fabric:'sport',collar:'crew',closure:'pullover',sleeve:'short',cuffs:'none',color:'#1E7A55',buttons:0,fit:'slim'}); break;
    case 'children': set({fabric:'jersey',collar:'crew',closure:'pullover',sleeve:'short',cuffs:'none',color:'#E0A526',buttons:0}); break;
    case 'hoodie': set({fabric:'fleece',collar:'hood',closure:'pullover',sleeve:'long',cuffs:'ribbed',pockets:'kangaroo',color:'#33312E',buttons:0}); break;
    case 'trousers': set({fabric:'suiting',length:'floor',legShape:'straight',pockets:'side-seam',pleats:'single',color:'#33312E',closure:'zip',buttons:1,cuffs:'none',collar:'none',sleeve:'none'}); break;
    case 'jeans': set({fabric:'denim',length:'floor',legShape:'straight',pockets:'five-pocket',color:'#3E5674',topstitch:'contrast',seams:'flat-felled',closure:'zip',buttons:1,cuffs:'none',collar:'none',sleeve:'none'}); break;
    case 'shorts': set({fabric:'chino',length:'thigh',legShape:'straight',pockets:'side-seam',color:'#B8AE9C',closure:'zip',buttons:1,cuffs:'turn-up',collar:'none',sleeve:'none'}); break;
    case 'dress': set({fabric:'silk',length:'midi',collar:'v-neck',closure:'wrap',sleeve:'short',skirtShape:'wrap',cuffs:'none',color:'#6B2233',buttons:0}); break;
    case 'skirt': set({fabric:'poplin',length:'knee',skirtShape:'a-line',closure:'zip',color:'#1F2A44',collar:'none',sleeve:'none',cuffs:'none',buttons:0}); break;
    case 'jacket': case 'workwear': set({fabric:'canvas',length:'hip',collar:'point',closure:'zip',pockets:'flap',color:'#5E6236',cuffs:'barrel',buttons:4,lining:'none'}); break;
    case 'coat': set({fabric:'coating',length:'knee',collar:'notch-lapel',closure:'double-breasted',pockets:'flap',color:'#B48A5A',buttons:6,lining:'full',cuffs:'none'}); break;
    case 'blazer': set({fabric:'suiting',length:'hip',collar:'notch-lapel',closure:'buttons',buttons:2,pockets:'flap',color:'#1F2A44',lining:'full',cuffs:'none'}); break;
    case 'suit': set({fabric:'suiting',length:'hip',collar:'notch-lapel',closure:'buttons',buttons:2,pockets:'flap',color:'#33312E',lining:'full',cuffs:'none',legShape:'straight',pleats:'none'}); break;
    case 'traditional': set({fabric:'damask',length:'floor',collar:'none',closure:'pullover',sleeve:'wide',pockets:'chest',color:'#EFE8D8',embroidery:'neckline',buttons:0,cuffs:'none',fit:'relaxed'}); break;
    case 'uniform': set({fabric:'poplin',color:'#8FB3D9',pockets:'chest',collar:'point',sleeve:'short',cuffs:'none'}); break;
  }
  return base;
}

/* ---------- seed garment library (also used for "Import starter collection") ---------- */
const BODY_SIZES = {
  S:{chest:92,waist:78,hip:94,neck:38,shoulder:43,armLength:61,inseam:78,thigh:56,knee:38},
  M:{chest:100,waist:86,hip:102,neck:40,shoulder:45,armLength:63,inseam:80,thigh:59,knee:40},
  L:{chest:108,waist:94,hip:110,neck:42,shoulder:47,armLength:65,inseam:81,thigh:63,knee:42},
  XL:{chest:116,waist:102,hip:118,neck:44,shoulder:49,armLength:66,inseam:82,thigh:67,knee:44},
};
function sizeChartFor(spec){
  const t = spec.template==='suit' ? 'jacket' : spec.template;
  const e = (EASE[t]||EASE.top)[spec.fit==='custom'?'regular':spec.fit] || EASE.top.regular;
  const out = {};
  for (const [s,b] of Object.entries(BODY_SIZES)){
    const g = {};
    if (['top','tee','hoodie','jacket','dress','robe','suit'].includes(spec.template)){
      g.chest = b.chest+e[0]; g.waist = b.waist+e[1]; g.hip = b.hip+e[2]; g.shoulder = b.shoulder+(spec.template==='jacket'||spec.template==='suit'?1.5:0.5);
      if (spec.sleeve && !['none'].includes(spec.sleeve)) g.sleeve = b.armLength + (spec.sleeve==='long'?1:0);
      if (spec.collar==='point'||spec.collar==='button-down'||spec.collar==='mandarin') g.neck = b.neck+1.5;
    }
    if (['bottom','skirt'].includes(spec.template) || spec.template==='suit'){
      const eb = (EASE[spec.template==='suit'?'bottom':spec.template]||EASE.bottom)[spec.fit==='custom'?'regular':spec.fit]||EASE.bottom.regular;
      g.waist = b.waist+eb[1]; g.hip = b.hip+eb[2];
      if (spec.template!=='skirt'){ g.inseam = b.inseam; g.thigh = b.thigh + (spec.legShape==='skinny'?2:spec.legShape==='wide'?14:7); }
    }
    out[s] = g;
  }
  return out;
}
function makeSeedGarments(){
  const T = '2026-09-01T09:00:00.000Z';
  const G = (id, name, category, desc, o, extra={}) => {
    const spec = Object.assign(defaultSpec(category), o, {name});
    const colors = extra.colors || [{n:'Default',h:spec.color}];
    return Object.assign({
      id, name, category, template:spec.template, description:desc, spec,
      colors, sizes:sizeChartFor(spec), price:extra.price ?? null, currency:'SLE',
      designer:'Studio template', tags:extra.tags||[], images:[],
      fitModes:['preview','estimated'], status:'published', version:1, history:[],
      processing:{ok:true, missing:[], at:T}, demo:true, createdAt:extra.at||T, updatedAt:extra.at||T, createdBy:'seed'
    });
  };
  return [
    G('g-oxford','Oxford shirt','shirt','A clean, everyday button-front shirt in breathable oxford cotton with a button-down collar and a chest pocket.',{fabric:'oxford',collar:'button-down',pockets:'chest',color:'#8FB3D9'},{colors:[{n:'Sky',h:'#8FB3D9'},{n:'White',h:'#F7F7F4'},{n:'Ivory',h:'#EFE8D8'}],tags:['office','classic'],price:null}),
    G('g-camp','Linen camp shirt','shirt','Relaxed short-sleeve shirt with an open camp collar, cut from washed linen for hot afternoons.',{fabric:'linen',collar:'notch-lapel',sleeve:'short',cuffs:'none',fit:'relaxed',length:'hip',color:'#D9C7A2',buttons:5},{colors:[{n:'Sand',h:'#D9C7A2'},{n:'Olive',h:'#5E6236'},{n:'Rust',h:'#A2482A'}],tags:['summer']}),
    G('g-tee','Heavy crew tee','tshirt','Heavyweight cotton jersey tee with a ribbed crew neck. A wardrobe base layer.',{color:'#F7F7F4'},{colors:[{n:'White',h:'#F7F7F4'},{n:'Black',h:'#151515'},{n:'Stone',h:'#B8AE9C'}],tags:['basics']}),
    G('g-jeans','Selvedge straight jeans','jeans','Five-pocket straight-leg jeans in rigid 13oz denim with contrast topstitching.',{},{colors:[{n:'Denim',h:'#3E5674'},{n:'Ink navy',h:'#1F2A44'},{n:'Black',h:'#151515'}],tags:['denim']}),
    G('g-pleat','Pleated wide trousers','trousers','High-waisted wide-leg trousers with double forward pleats and side-seam pockets.',{legShape:'wide',pleats:'double',waistband:'high',color:'#33312E'},{colors:[{n:'Charcoal',h:'#33312E'},{n:'Camel',h:'#B48A5A'},{n:'Ivory',h:'#EFE8D8'}],tags:['tailoring']}),
    G('g-shorts','Chino shorts','shorts','Mid-thigh twill shorts with a turn-up and a flat front.',{},{colors:[{n:'Stone',h:'#B8AE9C'},{n:'Olive',h:'#5E6236'},{n:'Ink navy',h:'#1F2A44'}],tags:['summer']}),
    G('g-wrap','Silk wrap dress','dress','Midi wrap dress in fluid silk crepe with a V-neck and short sleeves.',{},{colors:[{n:'Burgundy',h:'#6B2233'},{n:'Emerald',h:'#1E7A55'},{n:'Black',h:'#151515'}],tags:['evening']}),
    G('g-gshift','Gara shift dress','dress','Knee-length shift dress in hand-dyed gara cotton from Sierra Leone, with a boat neck.',{fabric:'gara',print:'gara',color:'#3B5BA9',printColor:'#EFE8D8',collar:'boat',closure:'zip',skirtShape:'pencil',length:'knee',sleeve:'cap'},{colors:[{n:'Gara blue',h:'#3B5BA9'},{n:'Indigo',h:'#2C3A92'},{n:'Rust',h:'#A2482A'}],tags:['gara','traditional']}),
    G('g-aline','A-line midi skirt','skirt','A-line skirt that sits on the natural waist and ends below the knee.',{length:'midi',color:'#1F2A44'},{colors:[{n:'Ink navy',h:'#1F2A44'},{n:'Saffron',h:'#E0A526'},{n:'Forest',h:'#2E4B3C'}]}),
    G('g-dbsuit','Double-breasted suit','suit','Six-button double-breasted jacket with peak lapels and full lining, paired with straight trousers.',{closure:'double-breasted',buttons:6,collar:'peak-lapel',color:'#1F2A44',print:'stripe',printColor:'#6A7590'},{colors:[{n:'Ink navy',h:'#1F2A44'},{n:'Charcoal',h:'#33312E'}],tags:['tailoring','formal']}),
    G('g-blazer','Single-breasted blazer','blazer','Two-button blazer with notch lapels and flap pockets in wool suiting.',{},{colors:[{n:'Ink navy',h:'#1F2A44'},{n:'Camel',h:'#B48A5A'},{n:'Forest',h:'#2E4B3C'}],tags:['tailoring']}),
    G('g-field','Canvas field jacket','jacket','Hip-length zip jacket in waxed-look canvas with four flap pockets.',{},{colors:[{n:'Olive',h:'#5E6236'},{n:'Camel',h:'#B48A5A'}],tags:['outerwear','workwear']}),
    G('g-coat','Wool overcoat','coat','Knee-length double-breasted overcoat in brushed wool, fully lined.',{},{colors:[{n:'Camel',h:'#B48A5A'},{n:'Charcoal',h:'#33312E'}],tags:['outerwear']}),
    G('g-hoodie','Fleece hoodie','hoodie','Brushed-back fleece pullover hoodie with a kangaroo pocket and ribbed cuffs.',{},{colors:[{n:'Charcoal',h:'#33312E'},{n:'Sky',h:'#8FB3D9'},{n:'Ivory',h:'#EFE8D8'}],tags:['casual']}),
    G('g-agbada','Damask agbada','traditional','Floor-length agbada in ivory damask with wide flowing sleeves and embroidered neckline.',{embroidery:'neckline',color:'#EFE8D8'},{colors:[{n:'Ivory',h:'#EFE8D8'},{n:'Sky',h:'#8FB3D9'},{n:'Burgundy',h:'#6B2233'}],tags:['agbada','ceremony']}),
    G('g-kaftan','Ankara kaftan','traditional','Ankle-length kaftan in wax print with a mandarin neck and long sleeves.',{fabric:'ankara',print:'wax',color:'#E0A526',printColor:'#2C3A92',collar:'mandarin',sleeve:'long',fit:'regular',length:'ankle',embroidery:'none'},{colors:[{n:'Saffron',h:'#E0A526'},{n:'Emerald',h:'#1E7A55'}],tags:['ankara','kaftan']}),
    G('g-kaba','Kaba gown','dress','Fitted kaba top and flared floor-length skirt in geometric wax print.',{fabric:'ankara',print:'geometric',color:'#A2482A',printColor:'#151515',skirtShape:'flared',length:'floor',collar:'scoop',sleeve:'elbow',closure:'zip'},{colors:[{n:'Rust',h:'#A2482A'},{n:'Indigo',h:'#2C3A92'}],tags:['kaba','ankara','traditional']}),
  ];
}

/* Sample people, labelled as samples everywhere they appear. */
function makeSampleProfiles(){
  const t = new Date().toISOString();
  return [
    {id:'p-sample-kofi', name:'Kofi (sample)', kind:'self', shape:'m', skin:3, sample:true, method:'manual', verified:false, archived:false,
      m:{height:180,weight:78,neck:40,shoulder:46,chest:100,waist:84,hip:100,upperArm:32,wrist:17,armLength:64,torsoLength:46,thigh:58,knee:39,calf:37,ankle:23,inseam:82,outseam:106,frontRise:27,backRise:37},
      history:[], createdAt:t, updatedAt:t},
    {id:'p-sample-amara', name:'Amara (sample)', kind:'self', shape:'f', skin:2, sample:true, method:'manual', verified:false, archived:false,
      m:{height:168,neck:34,shoulder:39,chest:92,underbust:76,waist:72,hip:102,upperArm:28,wrist:15,armLength:58,torsoLength:41,thigh:58,knee:37,calf:35,ankle:21,inseam:76,outseam:102,frontRise:26,backRise:36},
      history:[], createdAt:t, updatedAt:t},
  ];
}
function makeSampleDesigns(profileId){
  const t = new Date().toISOString();
  const suit = Object.assign(defaultSpec('suit'), {name:'Relaxed double-breasted suit', fit:'relaxed', closure:'double-breasted', buttons:6, buttonColor:'#151515', collar:'peak-lapel', legShape:'wide', lining:'full', liningPrint:'geometric', liningColor:'#A2482A', color:'#33312E',
    notes:'Structured shoulder, subtle African-inspired geometric lining.'});
  const dress = Object.assign(defaultSpec('dress'), {name:'Gara wrap dress', fabric:'gara', print:'gara', color:'#3B5BA9', printColor:'#EFE8D8', length:'midi'});
  const mk = (id,spec,note)=>({id, name:spec.name, profileId, sourceGarmentId:null, spec, versions:[{v:1, at:t, spec:clone(spec), note}], favourite:false, needsRecalc:false, prices:{main:null,lining:null,interfacing:null,currency:'SLE'}, fabricWidth:null, sample:true, createdAt:t, updatedAt:t});
  return [mk('d-sample-suit',suit,'Interpreted from brief'), mk('d-sample-wrap',dress,'Started from Silk wrap dress')];
}
