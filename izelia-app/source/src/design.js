/* ================= IZELIA PAGE DESIGNS (from the brand mockup) =================
   Layouts follow the supplied mockup page by page. Content is IZELIA's real data.
   Products only ever show IZELIA's own photos; campaign slots fall back to images
   cropped from the owner's mockup (see collImage). */
const ZNAV = [['home','Home'],['shop','Shop'],['about','About'],['contact','Contact']];
const COLL_META = {
  all:{title:'Our collections', sub:'Timeless designs. Authentic fabrics. Unmatched style.'},
  clothing:{title:'Clothing', sub:'Womenswear and menswear cut from Gara, tie-dye and silk.'},
  womenswear:{title:'Womenswear', sub:'Gowns, bubu, kimono jackets and tops in Gara and silk.'},
  menswear:{title:'Menswear', sub:'Two-piece kaftans in hand-dyed Gara.'},
  royalty:{title:'Royalty collection', sub:'The Royalty fabric range, hand-dyed in Sierra Leone.'},
  accessories:{title:'Accessories', sub:'Bold pieces. Cultural roots. Modern expression.'},
  fabrics:{title:'Premium African fabrics', sub:'Rich textures. Vibrant colours. Endless possibilities.'},
  new:{title:'New arrivals', sub:'The most recently added pieces.'},
};
const SHOP_PILLS = [['all','All'],['womenswear','Women'],['menswear','Men'],['royalty','Royalty'],['accessories','Accessories'],['fabrics','Fabrics'],['new','New in']];

/* ---------- imagery ----------
   Order of preference: images the admin uploaded → IZELIA's own photos (izelia.co.uk, in the
   standalone site and app) → imported product photos → campaign images from the owner's mockup. */
const firstPhoto = list => { for (const p of list){ const u = photoOf(p); if (u) return u; } return null; };
const MOCK_HERO = {all:'shop', clothing:'shop', womenswear:'shop', menswear:'t_new', royalty:'banner', accessories:'acc', fabrics:'t_fab', new:'banner'};
const MOCK_TILE = {clothing:'t_cloth', accessories:'t_acc', fabrics:'t_fab', new:'t_new'};
function collImage(k, slot='tile'){
  const c = Store.content || {};
  if (c.tileImages?.[k]) return c.tileImages[k];
  const fb = MOCK_IMG[(slot==='tile' && MOCK_TILE[k]) || MOCK_HERO[k] || 'shop'];
  if (remoteOn() && REMOTE_TILES[k]) return `url(${IZ_UPLOADS + REMOTE_TILES[k]}),url(${fb})`; // the mockup image shows if izelia.co.uk can't be reached
  const ps = productsPub();
  const own0 = k==='clothing' ? firstPhoto(ps.filter(p=>p.type==='garment')) : k==='new' ? firstPhoto(ps.slice(0, 12)) : k==='all' ? (firstPhoto(ps.filter(p=>p.featured)) || firstPhoto(ps)) : firstPhoto(ps.filter(p=>inCollection(p, k)));
  if (own0) return own0.startsWith('http') ? `url(${own0}),url(${fb})` : own0;
  return fb;
}
function heroImage(){ const c = Store.content || {}; return c.heroImage || MOCK_IMG.hero; }
const imgStyle = src => !src ? '' : src.startsWith('url(') ? `background-image:${src}` : `background-image:url(${src})`;
function zimg(src, cls='', label=''){ return src ? `<div class="zimg ${cls}" style="${imgStyle(src)}" role="img" aria-label="${esc(label)}"></div>` : `<div class="zimg ph ${cls}" aria-hidden="true"><span>IZELIA</span></div>`; }

/* ---------- shell ---------- */
function renderNav(){
  const c = Store.content || defaultContent();
  const studio = isStudio(S.route);
  $('#ann').innerHTML = c.announcementOn && c.announcement ? `<div class="ann">${esc(c.announcement)}</div>` : '';
  const un = unreadCount(), wl = (Store.shop.wishlist||[]).length, bc = bagCount();
  const cur = r => (S.route===r || (r==='shop' && ['shop','product'].includes(S.route))) ? 'aria-current="page"' : '';
  $('#hdr').innerHTML = `<div class="hdr-in">
    <button class="icobtn menubtn" data-a="drawer" aria-label="Open menu">${ic('menu')}</button>
    <button class="logo" data-a="go" data-r="home" aria-label="IZELIA home">${logoHTML()}</button>
    <nav class="znav" aria-label="Main">${ZNAV.map(([r,l])=>`<button data-a="${r==='shop'?'goShop':'go'}" data-r="${r}" data-c="all" ${cur(r)}>${l}</button>`).join('')}<button class="zstudio" data-a="go" data-r="studio" ${studio?'aria-current="page"':''}>Design your own</button></nav>
    <div class="icons">
      <button class="icobtn" data-a="go" data-r="search" aria-label="Search">${ic('search')}</button>
      <button class="icobtn hide-m" data-a="go" data-r="account" aria-label="Account">${ic('user')}${un?`<span class="count">${un}</span>`:''}</button>
      <button class="icobtn hide-m" data-a="go" data-r="wishlist" aria-label="Wishlist, ${wl} items">${ic('heart')}${wl?`<span class="count">${wl}</span>`:''}</button>
      <button class="icobtn" data-a="go" data-r="bag" aria-label="Bag, ${bc} items">${ic('bag')}${bc?`<span class="count">${bc}</span>`:''}</button>
    </div></div>
    ${studio ? `<div class="subnav"><div class="subnav-in" role="navigation" aria-label="Tailoring studio"><span class="tag-studio">AI Tailoring Studio</span>${STUDIO_NAV.filter(n=>!n[2] || Store.canPublish()).map(([r,l])=>`<button data-a="go" data-r="${r}" ${S.route===r || (S.route==='garment'&&r==='wardrobe') || (S.route==='outfit'&&r==='wardrobe') || (S.route==='garmentEdit'&&r==='tailor')?'aria-current="page"':''}>${l}${r==='notifications'&&un?`<span class="count">${un}</span>`:''}</button>`).join('')}</div></div>`:''}`;
  const tabs = [['home','Home','home'],['shop','Shop','shop'],['studio','Design','needle'],['wishlist','Wishlist','heart'],['account','Account','user']];
  $('#tabbar').innerHTML = tabs.map(([r,l,i]) => `<button data-a="${r==='shop'?'goShop':'go'}" data-r="${r}" data-c="all" ${(S.route===r || (r==='studio'&&studio) || (r==='shop'&&S.route==='product'))?'aria-current="page"':''}>${ic(i)}<span>${l}</span>${r==='wishlist'&&wl?`<span class="count">${wl}</span>`:''}${r==='account'&&un?`<span class="count">${un}</span>`:''}</button>`).join('');
  $('#main').className = ['home','shop','about','contact'].includes(S.route) ? 'full' : '';
  $('#foot').innerHTML = ['checkout'].includes(S.route) ? '' : footerHTML();
}
function footerHTML(){
  const c = Store.content || defaultContent();
  const col = (h, items) => `<div><h4>${h}</h4>${items.join('')}</div>`;
  return `<div class="foot"><div class="wrap">
    <div class="foot-grid">
      <div class="stack s"><span class="wm">${c.logo?`<img src="${c.logo}" alt="IZELIA" style="height:38px">`:'IZELIA'}</span><p style="font-size:14px;max-width:34ch">Contemporary African fashion, accessories and Gara fabrics from Sierra Leone.</p>
        <div class="zsocial">${Object.entries(c.social).map(([k,u])=>u?`<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${optLabel(k)}">${socialIcon(k)}</a>`:'').join('')}</div></div>
      ${col('Shop', [...SHOP_PILLS.slice(1).map(([k,l])=>`<button class="fl" data-a="goShop" data-r="shop" data-c="${k}">${COLL_META[k].title.replace(/^./,m=>m.toUpperCase())}</button>`), '<button class="fl" data-a="go" data-r="studio">Design your own</button>'])}
      ${col('Customer care', [...[['delivery','Delivery'],['returns','Returns & refunds'],['terms','Terms & conditions'],['privacy','Privacy'],['faq','FAQ']].map(([p,l])=>`<button class="fl" data-a="goPolicy" data-p="${p}">${l}</button>`), '<button class="fl" data-a="go" data-r="contact">Contact</button>', '<button class="fl" data-a="go" data-r="account">My account</button>'])}
      <div class="stack s"><h4>Newsletter</h4><p style="font-size:13.5px">Monthly news on collections and fabrics.</p>
        <form class="stack s" data-form="newsletter" novalidate><label class="visually-hidden" for="nl-email">Email address</label><div class="znl"><input type="email" id="nl-email" placeholder="Your email" autocomplete="email" required><button class="btn lime" type="submit" aria-label="Subscribe">→</button></div>
        <label class="check" style="font-size:12.5px"><input type="checkbox" id="nl-consent"><span>I agree to receive IZELIA emails and can unsubscribe at any time.</span></label></form>
        <p style="font-size:13px">${esc(c.contact.address)}<br>${esc(c.contact.hours)}</p></div>
    </div>
    <div class="tagline"><span class="wm2">${c.logo?`<img src="${c.logo}" alt="IZELIA" style="height:34px">`:'IZELIA'}</span><span>AFRICAN FASHION &nbsp;/&nbsp; TRADITION &nbsp;/&nbsp; CULTURE &nbsp;/&nbsp; STYLE</span><span class="mono" style="letter-spacing:0;font-size:12px">www.izelia.co.uk</span></div>
    <div class="legal"><span>© IZELIA. Prices in GBP.</span><span>${Store.mode==='cloud'?'Test checkout: no payments are taken yet':'Preview: data stays on this device · test checkout only'}</span></div>
  </div></div>`;
}
function socialIcon(k){
  const paths = {facebook:'<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8z"/>', instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>', twitter:'<path d="M4 4l16 16M20 4L4 20"/>'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[k]||''}</svg>`;
}

/* ---------- product card ---------- */
function productImg(p){
  const u = photoOf(p);
  if (u) return `<img src="${u}" alt="${esc(p.name)}" loading="lazy" ${p.thumb?'':'onerror="izImgFail(this)" referrerpolicy="no-referrer"'}>`;
  return `<div class="ph" aria-label="Photo coming soon"><b>IZELIA</b><span>Photo coming soon</span></div>`;
}
function pcard(p, o={}){
  const w = isWished(p.id), st = stockOf(p);
  return `<article class="pcard zc ${o.square?'sq':''}">
    <div class="img" role="button" tabindex="0" data-a="openProduct" data-id="${p.id}" aria-label="${esc(p.name)}">${productImg(p)}
      ${!st.ok?'<span class="badge">Sold out</span>': p.status!=='published' ? '<span class="badge">Draft</span>' : o.badge ? `<span class="badge">${esc(o.badge)}</span>`:''}
      <div class="qv"><button data-a="quickView" data-id="${p.id}">Quick view</button></div>
    </div>
    <div class="acts"><button data-a="wish" data-id="${p.id}" aria-pressed="${w}" aria-label="${w?'Remove from':'Add to'} wishlist">${ic('heart', w?'fill="currentColor"':'')}</button></div>
    <button class="nm" data-a="openProduct" data-id="${p.id}">${esc(p.name)}</button>
    <span class="pr">${priceFmt(p.price, p.currency)}</span>
    ${o.fabricAction ? `<button class="zlink" data-a="designWithFabric" data-id="${p.id}">Design with this fabric →</button>`:''}
  </article>`;
}

/* ---------- shared blocks ---------- */
function zhero({kicker='', title, sub='', cta='', ctaAttrs='', img, tall=false, label=''}){
  return `<section class="zhero ${tall?'tall':''}">
    <div class="zh-img">${zimg(img, '', label)}</div>
    <div class="zh-txt wrap"><div class="stack">${kicker?`<span class="kicker">${kicker}</span>`:''}<h1>${hlLast(title)}</h1>${sub?`<p>${esc(sub)}</p>`:''}${cta?`<div><button class="btn lime" ${ctaAttrs}>${esc(cta)} →</button></div>`:''}</div></div>
  </section>`;
}
function zbanner({title, cta, attrs, img, kicker=''}){
  return `<section class="zbanner"><div class="zb-txt">${kicker?`<span class="kicker">${kicker}</span>`:''}<h2>${hlLast(title)}</h2><div><button class="btn lime" ${attrs}>${esc(cta)} →</button></div></div><div class="zb-img">${zimg(img)}</div></section>`;
}

/* ---------- HOME ---------- */
function viewStoreHome(){
  const hp = activeProfile() || REF_PROFILE;
  const sg = getGarment('g-kaba') || garmentsLib().find(g=>g.status==='published');
  S.vcfg = {profile:hp, A: sg ? [fitItemForGarment(hp, sg)] : [], autoRotate:true, small:true};
  const c = Store.content, ps = productsPub();
  const featured = ps.filter(p=>p.featured).concat(ps.filter(p=>!p.featured && p.type==='garment')).slice(0, 4);
  const cats = [['clothing','Clothing'],['accessories','Accessories'],['fabrics','Fabrics'],['new','New arrivals']];
  return `
  <div class="msearch wrap"><button class="msearch-box" data-a="go" data-r="search">${ic('search')}<span>Search for styles, fabrics, etc…</span></button></div>
  ${zhero({kicker:'IZELIA · Freetown, Sierra Leone', title:c.heroTitle, sub:c.heroText, cta:c.heroCta, ctaAttrs:`data-a="goShop" data-r="shop" data-c="${esc(c.heroTarget)}"`, img:heroImage(), tall:true, label:'IZELIA campaign'})}
  <div class="mcircles wrap">${cats.map(([k,l])=>`<button data-a="goShop" data-r="shop" data-c="${k}"><span class="cir" style="${imgStyle(collImage(k))}">${collImage(k)?'':ic(k==='fabrics'?'drop':k==='accessories'?'heart':k==='new'?'spark':'shop')}</span><span>${l}</span></button>`).join('')}</div>
  <div class="wrap">
    <section class="zsec zpanel dsk">
      <h2 class="zlabel">Our unique collections</h2>
      <div class="zcats">${cats.map(([k,l])=>`<div class="zcat"><button class="zc-img" data-a="goShop" data-r="shop" data-c="${k}" aria-label="${l}">${zimg(collImage(k), '', l)}</button><button class="zc-lb" data-a="goShop" data-r="shop" data-c="${k}"><span>${l}</span><span aria-hidden="true">→</span></button></div>`).join('')}</div>
    </section>
    <section class="zsec mfeat"><div class="spread"><h2 class="zlabel">Featured</h2><button class="zlink" data-a="goShop" data-r="shop" data-c="all">See all →</button></div><div class="zgrid c2">${featured.map(p=>pcard(p)).join('')}</div></section>
    <div class="zsec">${zbanner({title:'Discover the latest fashion trends', cta:'See more', attrs:'data-a="goShop" data-r="shop" data-c="new"', img:Store.content?.tileImages?.new || MOCK_IMG.banner})}</div>
    <div class="zsec"><section class="zbanner studio"><div class="zb-txt"><span class="kicker">AI Tailoring Studio</span><h2>Your vision. Your fit. Your <span class="hl">IZELIA.</span></h2><div class="row"><button class="btn lime" data-a="go" data-r="studio">Design your own →</button><button class="btn ghostd" data-a="go" data-r="create">Create from a description</button></div></div><div class="zb-img" data-mini-stage>${stageHTML({small:true, hud:`<span class="chip">${esc(hp.name)}</span>${sg?`<span class="chip">${esc(sg.name)}</span>`:''}`, style:'position:absolute;inset:0;border:0;border-radius:0;min-height:0'})}</div></section>
      <p class="faint" style="font-size:12.5px;margin-top:8px">Save your measurements once, design in IZELIA fabric and see it on a 3D avatar. Fit previews are estimates; custom pieces are quoted by a tailor.</p></div>
  </div>
  <section class="ztrust"><div class="wrap">${[['drop','Hand-dyed Gara','fabrics'],['spark','Authentic African','designs'],['globe','Worldwide','shipping by DHL'],['store','Free collection','in Freetown']].map(([i,a,b])=>`<div>${ic(i)}<span>${a}<br>${b}</span></div>`).join('')}</div></section>`;
}

/* ---------- SHOP / COLLECTIONS / ACCESSORIES / FABRICS ---------- */
function shopState(){ return S.shopF || (S.shopF = {sub:'', q:'', min:'', max:'', size:'', avail:false, sort:'featured', cols:3, page:1, filters:false}); }
function viewShop(){
  S.vcfg = null;
  const c = S.params.c || 'all', f = shopState();
  let list = productsPub();
  if (c==='new') list = list.slice(0, 16);
  else if (c==='clothing') list = list.filter(p=>p.type==='garment');
  else list = list.filter(p=>inCollection(p, c));
  const subs = [...new Set(list.map(p=>p.subtype))];
  const sizes = [...new Set(list.flatMap(p=>p.sizes))];
  if (f.sub && subs.includes(f.sub)) list = list.filter(p=>p.subtype===f.sub);
  const q = f.q.trim().toLowerCase(); if (q) list = list.filter(p=>(p.name+' '+p.subtype+' '+p.collections.join(' ')).toLowerCase().includes(q));
  if (f.min!=='') list = list.filter(p=>p.price >= +f.min);
  if (f.max!=='') list = list.filter(p=>p.price <= +f.max);
  if (f.size) list = list.filter(p=>p.sizes.includes(f.size));
  if (f.avail) list = list.filter(p=>stockOf(p).ok);
  const sorts = {featured:(a,b)=>(b.featured-a.featured)||((b.createdAt||'').localeCompare(a.createdAt||'')), newest:(a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''), asc:(a,b)=>a.price-b.price, desc:(a,b)=>b.price-a.price, az:(a,b)=>a.name.localeCompare(b.name)};
  list.sort(sorts[f.sort]||sorts.newest);
  const meta = COLL_META[c] || COLL_META.all;
  const active = !!(f.q || f.sub || f.min!=='' || f.max!=='' || f.size || f.avail);
  const fabric = c==='fabrics' || c==='royalty';
  const per = fabric ? 16 : 12, pages = Math.max(1, Math.ceil(list.length/per)); f.page = clamp(f.page||1, 1, pages);
  const shown = list.slice((f.page-1)*per, f.page*per);
  const pills = ['all','womenswear','menswear','new'].includes(c) || c==='clothing'
    ? SHOP_PILLS.map(([k,l])=>`<button data-a="shopColl" data-v="${k}" aria-pressed="${c===k}">${l}</button>`).join('')
    : `<button data-a="shopSub" data-v="" aria-pressed="${!f.sub}">All</button>${subs.map(s=>`<button data-a="shopSub" data-v="${esc(s)}" aria-pressed="${f.sub===s}">${esc(s)}</button>`).join('')}`;
  const subRow = (['all','womenswear','menswear','new','clothing'].includes(c) && subs.length>1) ? `<div class="zpills sm">${`<button data-a="shopSub" data-v="" aria-pressed="${!f.sub}">All types</button>`+subs.map(s=>`<button data-a="shopSub" data-v="${esc(s)}" aria-pressed="${f.sub===s}">${esc(s)}</button>`).join('')}</div>` : '';
  return `
  ${zhero({kicker: c==='royalty'?'IZELIA · Royalty':'IZELIA', title:meta.title, sub:meta.sub, img:collImage(c,'hero'), cta: c==='fabrics'?'Shop fabrics':'', ctaAttrs:'data-a="scrollTo" data-v="zgrid"', label:meta.title})}
  <div class="wrap">
    <div class="zbar">
      <div class="zpills" role="group" aria-label="Browse">${pills}</div>
      <div class="zbar-r">
        <label class="zsearch"><span class="visually-hidden">Search this page</span>${ic('search')}<input type="search" id="sf-q" data-in="shopQ" value="${esc(f.q)}" placeholder="${fabric?'Search fabrics…':'Search styles…'}"></label>
        <label class="zsort"><span>Sort by:</span><select id="sf-sort" data-ch="shopF" data-k="sort">${[['newest','Newest'],['featured','Featured'],['asc','Price: low to high'],['desc','Price: high to low'],['az','A–Z']].map(([k,l])=>`<option value="${k}" ${f.sort===k?'selected':''}>${l}</option>`).join('')}</select></label>
        <button class="btn sm line" data-a="shopFilters" aria-expanded="${!!f.filters}">Filters</button>
      </div>
    </div>
    ${subRow}
    ${f.filters ? `<div class="filters zfilters">
      <label class="field">Min £<input type="number" id="sf-min" min="0" data-ch="shopF" data-k="min" value="${esc(f.min)}"></label>
      <label class="field">Max £<input type="number" id="sf-max" min="0" data-ch="shopF" data-k="max" value="${esc(f.max)}"></label>
      ${sizes.length?`<label class="field">Size<select id="sf-size" data-ch="shopF" data-k="size"><option value="">Any</option>${sizes.map(s=>`<option ${f.size===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label>`:''}
      <label class="check" style="flex:0 0 auto;padding-bottom:10px"><input type="checkbox" id="sf-avail" data-ch="shopAvail" ${f.avail?'checked':''}><span>Available now</span></label>
      <button class="zlink" data-a="shopClear" data-k="all">Reset</button></div>` : ''}
    ${fabric ? `<h2 class="zlabel" style="margin:6px 0 16px">${c==='fabrics'?'Popular fabrics':'The collection'} <span class="faint" style="letter-spacing:0;text-transform:none;font-weight:400">· ${list.length}</span>${active?' <button class="zlink" data-a="shopClear" data-k="all" style="font-family:var(--f-body);text-transform:none;letter-spacing:0">Clear filters</button>':''}</h2>` : `<p class="faint" style="font-size:13px;margin-bottom:14px">${list.length} piece${list.length===1?'':'s'}${active?' · <button class="zlink" data-a="shopClear" data-k="all">Clear filters</button>':''}</p>`}
    <div id="zgrid">${list.length ? `<div class="zgrid ${fabric?'c4':'c3'}">${shown.map(p=>pcard(p,{square:fabric, fabricAction:p.type==='fabric'})).join('')}</div>` : `<div class="empty"><h3>Nothing matches</h3><p>Try another filter.</p><button class="btn" data-a="shopClear" data-k="all">Reset filters</button></div>`}</div>
    ${pages>1?`<nav class="pager" aria-label="Pages">${f.page>1?`<button data-a="shopPage" data-v="${f.page-1}" aria-label="Previous page">←</button>`:''}${Array.from({length:pages},(_,i)=>`<button data-a="shopPage" data-v="${i+1}" ${f.page===i+1?'aria-current="page"':''}>${i+1}</button>`).join('')}${f.page<pages?`<button data-a="shopPage" data-v="${f.page+1}" aria-label="Next page">→</button>`:''}</nav>`:''}
    ${fabric?'<p class="faint" style="font-size:12.5px;margin-top:18px">Prices are per item as listed by IZELIA. Ask about lengths and quantities before ordering several.</p>':''}
  </div>`;
}

/* ---------- PRODUCT ---------- */
function viewProduct(){
  S.vcfg = null;
  const p = Store.products[S.params.id];
  if (!p || (p.status!=='published' && !Store.canPublish())) return `<div class="empty"><h3>This piece is not available</h3><p>It may have sold out or been removed.</p><button class="btn" data-a="goShop" data-r="shop" data-c="all">Back to the shop</button></div>`;
  const v = S.pview && S.pview.id===p.id ? S.pview : (S.pview = {id:p.id, size:p.sizes.length===1?p.sizes[0]:null, qty:1, img:0, media:undefined, zoom:false});
  if (v.media===undefined){ v.media = null; Store.getMedia(p.id).then(m => { if (S.pview?.id===p.id){ v.media = m || {images:[]}; if (S.route==='product') App.softRender(); } }); }
  const imgs = (v.media?.images?.length ? v.media.images.map(i=>i.data) : (photoOf(p) ? [photoOf(p)] : []));
  const st = stockOf(p);
  const related = productsPub().filter(x=>x.id!==p.id && x.subtype===p.subtype).concat(productsPub().filter(x=>x.id!==p.id && x.type===p.type && x.subtype!==p.subtype)).slice(0,4);
  const c = Store.content, g = productAsGarment(p);
  const coll = p.collections.find(x=>x!=='royalty') || p.collections[0];
  const short = p.description || ({garment:'Made by IZELIA in Sierra Leone.', fabric:'Hand-dyed fabric from IZELIA’s Sierra Leone workshop.', accessory:'An IZELIA accessory.'})[p.type];
  return `
  <nav class="zcrumb" aria-label="Breadcrumb"><button data-a="go" data-r="home">Home</button><span>/</span><button data-a="goShop" data-r="shop" data-c="${coll}">${esc(COLL_META[coll]?.title || 'Shop')}</button><span>/</span><span>${esc(p.name)}</span></nav>
  <div class="zpd">
    <div class="zthumbs">${imgs.map((src,i)=>`<button data-a="pImg" data-i="${i}" aria-pressed="${v.img===i}" aria-label="Image ${i+1}"><img src="${src}" alt=""></button>`).join('')}</div>
    <div class="zmain ${v.zoom?'zoom':''}" ${imgs.length?'data-a="pZoom" role="button" tabindex="0" aria-label="Zoom image"':''}>${imgs.length ? `<img src="${imgs[Math.min(v.img, imgs.length-1)]}" alt="${esc(p.name)}" ${p.thumb||v.media?.images?.length?'':'onerror="izImgFail(this)" referrerpolicy="no-referrer"'}>` : `<div class="zimg ph" style="position:absolute;inset:0"><span>IZELIA</span><small>Photo coming soon</small></div>`}
      <button class="zheart" data-a="wish" data-id="${p.id}" aria-pressed="${isWished(p.id)}" aria-label="Wishlist">${ic('heart', isWished(p.id)?'fill="currentColor"':'')}</button></div>
    <div class="zinfo">
      <h1>${esc(p.name)}</h1>
      <span class="zprice">${priceFmt(p.price, p.currency)}${p.type==='fabric'?' <small>per item as listed</small>':''}</span>
      ${p.status!=='published'?'<span class="chip warn">Draft: only staff can see this</span>':''}
      <p class="zdesc">${esc(short)}</p>
      ${p.sizes.length ? `<div class="zopt"><span>Size${p.sizes.length>1?':':': '+esc(p.sizes[0])}</span>${p.sizes.length>1?`<div class="sizes">${p.sizes.map(s=>`<button data-a="pSize" data-v="${esc(s)}" aria-pressed="${v.size===s}">${esc(s)}</button>`).join('')}</div>`:''}</div>`:''}
      <div class="zopt"><span>Quantity:</span><div class="qtybox"><button data-a="pQty" data-d="-1" aria-label="Decrease quantity">−</button><input type="number" id="pq" min="1" max="20" value="${v.qty}" data-ch="pQtyIn" aria-label="Quantity"><button data-a="pQty" data-d="1" aria-label="Increase quantity">+</button></div></div>
      <button class="btn lime zadd" data-a="addBag" data-id="${p.id}" ${st.ok?'':'disabled'}>${st.ok?'Add to cart →':'Out of stock'}</button>
      <button class="zwish" data-a="wish" data-id="${p.id}">${ic('heart', isWished(p.id)?'fill="currentColor"':'')} ${isWished(p.id)?'Saved to wishlist':'Add to wishlist'}</button>
      <span class="faint" style="font-size:12.5px">${esc(st.label)}${p.stock?.tracked?'':' · stock not tracked online'}</span>
      <div class="acc">
        <details open><summary>Product details</summary><div class="body">${p.description ? esc(p.description) : 'IZELIA hasn’t added a full description yet.'}<div style="margin-top:8px">${[['Material',p.material],['Care',p.care],p.type==='accessory'?['Dimensions',p.dimensions]:null,p.type==='fabric'?['Selling unit',p.sellingUnit||'Not stated yet']:null].filter(Boolean).map(([k,val])=>`<div class="spread" style="padding:3px 0"><span class="faint">${k}</span><span>${val?esc(val):'<span class="faint">Not provided yet</span>'}</span></div>`).join('')}</div></div></details>
        ${p.type!=='accessory'?`<details><summary>Size guide</summary><div class="body">${p.type==='garment' ? `Garment measurements for this piece haven’t been published yet. Contact IZELIA for exact measurements${g?', or try it on your saved avatar':', or design a made-to-measure version in the studio'}.` : 'Fabrics are sold per item as listed; ask IZELIA about the length of each piece.'}</div></details>`:''}
        <details><summary>Shipping & returns</summary><div class="body"><ul style="margin:0;padding-left:18px">${c.delivery.filter(d=>d.enabled).map(d=>`<li>${esc(d.label)}: ${d.price===0?'free':priceFmt(d.price)} · ${esc(d.eta)}</li>`).join('')}</ul><p style="margin-top:8px">Returns within 14 days in Sierra Leone or 30 days internationally, unworn with tags, refunded as a voucher. Sale items can’t be returned. <button class="zlink" data-a="goPolicy" data-p="returns">Full policy</button></p></div></details>
        ${p.type==='garment' ? `<details open><summary>Design your own</summary><div class="body stack s">${g ? `<span>This piece has fitting data: see it on your saved avatar, no new measurements needed.</span><div class="row"><button class="btn sm primary" data-a="tryOnProduct" data-id="${p.id}">Try on with my avatar</button><button class="btn sm" data-a="customiseProduct" data-id="${p.id}">Customise this design</button></div>` : `<span>Virtual try-on isn’t available for this piece yet (no size chart). Start a made-to-measure design in a similar style instead.</span><div><button class="btn sm primary" data-a="customiseProduct" data-id="${p.id}">Customise a similar design</button></div>`}</div></details>` : ''}
        ${p.type==='fabric' ? `<details open><summary>Design with this fabric</summary><div class="body stack s"><span>Use ${esc(p.name)} as the material for your own design in the AI Tailoring Studio.</span><div><button class="btn sm primary" data-a="designWithFabric" data-id="${p.id}">Design with this fabric</button></div></div></details>` : ''}
      </div>
    </div>
  </div>
  ${related.length ? `<section class="zsec"><h2 class="zlabel">You may also like</h2><div class="zgrid c4">${related.map(x=>pcard(x)).join('')}</div></section>`:''}`;
}

/* ---------- ABOUT ---------- */
function viewAbout(){
  S.vcfg = null;
  const c = Store.content, a = c.aboutImages || [];
  const img1 = a[0] || MOCK_IMG.story, img2 = a[1] || a[2] || MOCK_IMG.mission;
  return `<div class="wrap">
    <section class="zsec zpanel zabout">
      <div class="za-img">${zimg(img1, '', 'IZELIA')}</div>
      <div class="stack"><h1 class="zh">Our story</h1>
        <p>IZELIA is more than a fashion brand: it’s a celebration of Sierra Leone’s culture, craftsmanship and heritage. Founded in 2015, with a speciality in Gara and tie-dye fabrics, IZELIA first sold its pieces at London’s Spitalfields Market in January 2016.</p>
        <p>Today its factory provides work for, and supports, many families in local communities, bringing contemporary African design to the world.</p>
        <div class="values3">${[['heart','Passion','For Africa, fashion and our customers'],['drop','Uniqueness','Small-batch pieces made with care'],['hands','Opportunity','For women, youth and small businesses']].map(([i,h,t])=>`<div><i>${ic(i)}</i><b>${h}</b><span>${t}</span></div>`).join('')}</div>
      </div>
    </section>
    <section class="zsec zpanel zabout rev">
      <div class="stack"><h2 class="zh">Our mission</h2>
        <p>To be an inclusive showcase for the creativity of contemporary Africa. The IZELIA academy trains women and young people and creates opportunities for them, and the H.O.P.E Initiative aims to inspire a new generation of women to pursue their dreams.</p>
        <div class="row"><button class="btn lime" data-a="goShop" data-r="shop" data-c="all">Shop the collection →</button><button class="btn line" data-a="go" data-r="studio">Design your own</button></div>
      </div>
      <div class="za-img">${zimg(img2, '', 'IZELIA community')}</div>
    </section>
    ${Store.canPublish()?'<p class="faint" style="font-size:12.5px;margin-top:12px">Staff note: add the About photos (about-page-1…5.jpg) through Admin → Photo import.</p>':''}
  </div>`;
}

/* ---------- CONTACT ---------- */
function viewContact(){
  S.vcfg = null;
  const c = Store.content.contact, so = Store.content.social, sent = S.contactSent;
  return `
  ${zhero({title:'Get in touch', sub:'We’d love to hear from you.', img:MOCK_IMG.contact, label:'IZELIA'})}
  <div class="wrap"><section class="zsec zpanel zcontact">
    <div class="stack">
      <div class="clist">
        <div class="ci"><i>${ic('mail')}</i><span><b>Email</b><span>${esc(c.email)}</span> <button class="zlink" data-a="copy" data-v="${esc(c.email)}">Copy</button></span></div>
        ${c.phone?`<div class="ci"><i>${ic('user')}</i><span><b>Phone</b>${esc(c.phone)}</span></div>`:''}
        <div class="ci"><i>${ic('pin')}</i><span><b>Address</b>${esc(c.address)}</span></div>
        <div class="ci"><i>${ic('clock')}</i><span><b>Opening hours</b>${esc(c.hours)}</span></div>
      </div>
      <div><b class="zlabel" style="font-size:12px">Follow us</b><div class="zsocial dark">${Object.entries(so).map(([k,u])=>u?`<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${optLabel(k)}">${socialIcon(k)}</a>`:'').join('')}</div></div>
      ${Store.canPublish() && c.addressNote ? `<p class="note warn" style="font-size:12.5px">${esc(c.addressNote)}</p>`:''}
    </div>
    <div class="stack">${sent ? `<h2 class="zh" style="font-size:26px">Message received</h2><p class="muted">${Store.mode==='cloud'?'Your message is saved for the IZELIA team, who will reply by email.':'Saved on this device (preview).'} No email is sent from this site yet.</p><div><button class="btn" data-a="contactAgain">Send another</button></div>` : `
      <form class="stack s" data-form="contact" novalidate>
        <label class="visually-hidden" for="ct-name">Name</label><input type="text" id="ct-name" required autocomplete="name" placeholder="Name" value="${esc(Store.me?.name||'')}">
        <label class="visually-hidden" for="ct-email">Email</label><input type="email" id="ct-email" required autocomplete="email" placeholder="Email">
        <div class="form-grid"><label class="visually-hidden" for="ct-topic">Topic</label><select id="ct-topic">${['Product enquiry','Fabric enquiry','Orders','Delivery','Returns','Tailoring','General'].map(t=>`<option>${t}</option>`).join('')}</select><label class="visually-hidden" for="ct-subject">Subject</label><input type="text" id="ct-subject" required placeholder="Subject"></div>
        <label class="visually-hidden" for="ct-msg">Message</label><textarea id="ct-msg" required placeholder="Message" style="min-height:140px"></textarea>
        <button class="btn lime" type="submit">Send message →</button>
      </form>`}
      <div class="zvisit"><div><b>Visit our store</b><span>${esc(c.address)}</span><span class="faint">${esc(c.hours)}</span></div><a class="btn sm line" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}" target="_blank" rel="noopener">Get directions →</a></div>
    </div>
  </section></div>`;
}

/* ---------- ACCOUNT (app-style menu) ---------- */
function viewAccount(){
  S.vcfg = null;
  const orders = Object.values(Store.myOrders.orders||{}).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  const p = activeProfile();
  const name = Store.me?.name || (Store.mode==='cloud' ? 'Fashion lover' : 'Guest');
  const item = (i, l, a, extra='') => `<button ${a}><span class="l">${ic(i)}${l}</span><span>${extra} ›</span></button>`;
  return `<div class="zacct">
    <div class="zhello"><span class="av">${Store.me?.avatarUrl?`<img src="${esc(Store.me.avatarUrl)}" alt="">`:esc(initials(name))}</span><div><h1 class="zh" style="font-size:26px">Hello, ${esc(name.split(' ')[0])}</h1><span class="faint" style="font-size:13px">${Store.mode==='cloud'?'Signed in with Claude':'Saved on this device'}</span></div>${Store.canPublish()?'<button class="btn sm" data-a="go" data-r="admin" style="margin-left:auto">Store admin</button>':''}</div>
    <nav class="acctmenu" aria-label="Account">
      ${item('box','My orders','data-a="scrollTo" data-v="acct-orders"', orders.length?`<span class="faint">${orders.length}</span>`:'')}
      ${item('heart','Wishlist','data-a="go" data-r="wishlist"', (Store.shop.wishlist||[]).length?`<span class="faint">${Store.shop.wishlist.length}</span>`:'')}
      ${item('pin','Saved addresses','data-a="scrollTo" data-v="acct-addr"')}
      ${item('body','My body profile','data-a="go" data-r="body"', p?`<span class="faint">${Math.round(completeness(p).pct*100)}%</span>`:'')}
      ${item('designs','My designs','data-a="go" data-r="designs"')}
      ${item('projects','Tailoring projects','data-a="go" data-r="projects"')}
      ${item('bell','Updates','data-a="go" data-r="notifications"', unreadCount()?`<span class="count-dot">${unreadCount()}</span>`:'')}
      ${item('settings','Settings & privacy','data-a="go" data-r="settings"')}
      ${item('mail','Help & support','data-a="go" data-r="contact"')}
    </nav>
    <section class="panel stack" id="acct-orders"><h2>My orders</h2>${orders.length ? `<div class="list">${orders.map(o=>`<div class="li"><div class="grow"><b>${esc(o.ref)} · ${priceFmt(o.total)}</b><small>${fmtDate(o.createdAt)} · ${o.items.length} item${o.items.length>1?'s':''} · ${esc(o.payment)} · ${esc(o.fulfilment)}</small></div><button class="btn sm" data-a="openOrder" data-id="${o.id}">View</button></div>`).join('')}</div>` : '<p class="muted">No orders yet.</p>'}</section>
    <section class="panel stack" id="acct-addr"><h2>Saved addresses</h2>${(Store.shop.addresses||[]).length ? `<div class="list">${Store.shop.addresses.map((a,i)=>`<div class="li"><div class="grow"><b>${esc(a.name||'Address')}</b><small>${esc([a.line1,a.city,a.country].filter(Boolean).join(', '))}</small></div><button class="btn sm ghost" data-a="addrRemove" data-i="${i}">Remove</button></div>`).join('')}</div>` : '<p class="muted">Addresses you save at checkout appear here.</p>'}</section>
    <section class="panel stack"><h2>Communication</h2>
      <label class="check"><input type="checkbox" id="pref-news" data-ch="shopPref" data-k="newsletter" ${Store.shop.prefs?.newsletter?'checked':''}><span>Monthly newsletter</span></label>
      <label class="check"><input type="checkbox" id="pref-orders" data-ch="shopPref" data-k="orderUpdates" ${Store.shop.prefs?.orderUpdates!==false?'checked':''}><span>Order updates on this site</span></label></section>
  </div>`;
}

/* ---------- actions for the new layouts ---------- */
Object.assign(ACT, {
  shopColl(el){ S.shopF = Object.assign(shopState(), {sub:'', page:1}); App.go('shop', {c:el.dataset.v}); },
  shopFilters(){ const f = shopState(); f.filters = !f.filters; App.render(); },
  drawer(){
    const c = Store.content;
    $('#overlay').innerHTML = `<div class="drawer" role="dialog" aria-modal="true" aria-label="Menu"><div class="panel-d">
      <div class="spread"><span class="logo">${logoHTML()}</span><button class="icobtn" data-a="closeModal" aria-label="Close menu">${ic('x')}</button></div>
      ${[['home','Home','go',null,'home'],['shop','Shop','goShop','all','shop'],['shop','Collections','goShop','clothing','box'],['shop','Accessories','goShop','accessories','heart'],['shop','Fabrics','goShop','fabrics','drop'],['shop','Royalty collection','goShop','royalty','spark'],['shop','New arrivals','goShop','new','spark'],['about','About','go',null,'user'],['contact','Contact','go',null,'mail']].map(([r,l,a,cc,i])=>`<button class="dlink ico" data-a="${a}" data-r="${r}" ${cc?`data-c="${cc}"`:''}><span class="l">${ic(i)}${l}</span><span>›</span></button>`).join('')}
      <button class="dlink studio" data-a="go" data-r="studio">Design your own <span>→</span></button>
      <h4>AI Tailoring Studio</h4>${STUDIO_NAV.filter(n=>!n[2] || Store.canPublish()).map(([r,l])=>`<button class="dlink" data-a="go" data-r="${r}">${l}<span>›</span></button>`).join('')}
      <h4>Account</h4>${[['account','My account'],['wishlist','Wishlist'],['bag','Bag']].map(([r,l])=>`<button class="dlink" data-a="go" data-r="${r}">${l}<span>›</span></button>`).join('')}${Store.canPublish()?'<button class="dlink" data-a="go" data-r="admin">Store admin<span>›</span></button>':''}
      <div class="zpromo" style="${imgStyle(MOCK_IMG.launch)}"><b>African fashion<br>at your fingertips</b><button class="btn lime sm" data-a="goShop" data-r="shop" data-c="all">Shop now →</button></div>
    </div><div class="shade" data-a="closeModal"></div></div>`;
  },
});
