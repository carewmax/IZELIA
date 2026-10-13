/* ================= IZELIA STORE ADMIN ================= */
function viewAdmin(){
  S.vcfg = null;
  if (!Store.canPublish()) return `<div class="empty"><h3>Staff only</h3><p>${Store.mode==='cloud'?'Store admin is for IZELIA staff with Editor access to this page.':'Switch the demo role to Admin in Settings to explore store admin on this device.'}</p></div>`;
  const tab = S.params.tab || S.adminTab || 'products';
  S.adminTab = tab;
  const orders = adminOrders();
  const msgs = adminMessages();
  const tabs = [['products',`Products (${Object.keys(Store.products).length})`],['images','Photo import'],['content','Content'],['orders',`Orders (${orders.length})`],['messages',`Messages (${msgs.length})`],['data','Data notes']];
  const body = {products:adminProducts, images:adminImages, content:adminContent, orders:()=>adminOrdersView(orders), messages:()=>adminMessagesView(msgs), data:adminData}[tab]();
  return `<div class="page-head"><div><span class="kicker">IZELIA staff</span><h1>Store admin</h1><p>Products, photos, site content and orders. Changes go live for every shopper without a redeploy.</p></div><button class="btn" data-a="go" data-r="tailor">Tailoring library</button></div>
  <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" data-a="adminTab" data-t="${k}">${l}</button>`).join('')}</div>${body}`;
}
function adminOrders(){ const out=[]; for (const [owner, d] of Object.entries(Store.allOrders||{})) for (const o of Object.values(d?.orders||{})) out.push({owner, ...o}); return out.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')); }
function adminMessages(){ const out=[]; for (const [owner, d] of Object.entries(Store.allInbox||{})){ for (const m of (d?.messages||[])) out.push({owner, kind:'message', ...m}); if (d?.newsletter) out.push({owner, kind:'newsletter', ...d.newsletter}); } return out.sort((a,b)=>(b.at||'').localeCompare(a.at||'')); }

function adminProducts(){
  if (S.pedit) return productEditor();
  const q = (S.adminQ||'').toLowerCase();
  const list = productsAll().filter(p => !q || (p.name+' '+p.subtype).toLowerCase().includes(q));
  const noPhoto = productsAll().filter(p=>!p.thumb).length;
  return `<div class="spread" style="margin-bottom:12px"><label class="field" style="flex:1;max-width:340px">Search products<input type="search" id="ad-q" data-in="adminQ" value="${esc(S.adminQ||'')}"></label><div class="row"><button class="btn primary" data-a="productNew">${ic('plus')}New product</button></div></div>
  ${noPhoto ? `<div class="note warn" style="margin-bottom:12px">${noPhoto} product${noPhoto>1?'s have':' has'} no photo yet. <button class="btn sm" data-a="adminTab" data-t="images">Import photos</button></div>`:''}
  <div class="panel scroll-x" style="padding:0"><table class="data"><thead><tr><th></th><th>Product</th><th>Type</th><th>Collections</th><th class="num">Price</th><th>Stock</th><th>Status</th><th>Try-on</th><th></th></tr></thead><tbody>
  ${list.map(p=>`<tr><td>${p.thumb?`<img class="admin-thumb" src="${p.thumb}" alt="">`:'<div class="ph-mini">no photo</div>'}</td><td><b>${esc(p.name)}</b><br><span class="faint" style="font-size:12px">${p.wcId?`WooCommerce #${p.wcId}`:'Added here'}</span></td><td>${esc(p.subtype)}</td><td>${p.collections.map(c=>COLLECTIONS[c]?.label||c).join(', ')}</td><td class="num mono">${priceFmt(p.price)}</td><td>${p.stock?.tracked?`<span class="mono">${p.stock.qty??0}</span>`:'<span class="faint">untracked</span>'}</td><td><span class="chip ${p.status==='published'?'ok':'warn'}">${p.status}</span>${p.featured?' <span class="chip tape">featured</span>':''}</td><td>${p.tailoring?.status==='fit-ready'?'<span class="chip ok">ready</span>':'<span class="faint">—</span>'}</td><td><div class="row tight" style="flex-wrap:nowrap"><button class="btn sm" data-a="productEdit" data-id="${p.id}">Edit</button><button class="btn sm ghost" data-a="openProduct" data-id="${p.id}">View</button></div></td></tr>`).join('')}
  </tbody></table></div>`;
}
function productEditor(){
  const p = S.pedit.p, isNew = S.pedit.isNew;
  const t = p.tailoring || {status:'none'};
  const sizes = t.sizes || {};
  const sk = Object.keys(sizes), zk = [...new Set(sk.flatMap(s=>Object.keys(sizes[s])))];
  const media = S.pedit.media;
  return `<div class="row" style="margin-bottom:12px"><button class="btn sm ghost" data-a="productBack">${ic('back')}All products</button></div>
  <div class="two" style="align-items:start">
    <div class="stack">
      <section class="panel stack"><h2>${isNew?'New product':'Edit product'}</h2>
        <label class="field">Name<input type="text" id="pe-name" data-in="pe" data-k="name" value="${esc(p.name)}"></label>
        <div class="form-grid"><label class="field">Price (GBP)<input type="number" step="0.01" min="0" id="pe-price" data-in="peNum" data-k="price" value="${p.price??''}"></label>
          <label class="field">Type<select id="pe-type" data-ch="peType">${[['garment','Clothing'],['fabric','Fabric'],['accessory','Accessory']].map(([k,l])=>`<option value="${k}" ${p.type===k?'selected':''}>${l}</option>`).join('')}</select></label>
          <label class="field">Sub-category<input type="text" id="pe-sub" data-in="pe" data-k="subtype" value="${esc(p.subtype)}"></label></div>
        <div class="ctl"><span class="lbl">Collections</span><div class="opts">${Object.entries(COLLECTIONS).map(([k,c])=>`<button class="opt" data-a="peColl" data-v="${k}" aria-pressed="${p.collections.includes(k)}">${c.label}</button>`).join('')}</div></div>
        <label class="field">Sizes <small>comma separated, e.g. 10, 12, 14 or One Size</small><input type="text" id="pe-sizes" data-in="peSizes" value="${esc(p.sizes.join(', '))}"></label>
        <label class="field">Description<textarea id="pe-desc" data-in="pe" data-k="description">${esc(p.description)}</textarea></label>
        <div class="form-grid"><label class="field">Material<input type="text" id="pe-mat" data-in="pe" data-k="material" value="${esc(p.material)}"></label><label class="field">Care<input type="text" id="pe-care" data-in="pe" data-k="care" value="${esc(p.care)}"></label>
          ${p.type==='fabric'?`<label class="field">Selling unit<input type="text" id="pe-unit" data-in="pe" data-k="sellingUnit" value="${esc(p.sellingUnit)}" placeholder="e.g. per yard, 6-yard piece"></label>`:''}${p.type==='accessory'?`<label class="field">Dimensions<input type="text" id="pe-dim" data-in="pe" data-k="dimensions" value="${esc(p.dimensions)}"></label>`:''}</div>
        <label class="check"><input type="checkbox" id="pe-track" data-ch="peTrack" ${p.stock?.tracked?'checked':''}><span>Track stock for this product</span></label>
        ${p.stock?.tracked ? `<label class="field">Quantity in stock<input type="number" min="0" id="pe-qty" data-in="peQty" value="${p.stock.qty??0}"></label>` : `<label class="check"><input type="checkbox" id="pe-instock" data-ch="peInStock" ${p.stock?.inStock!==false?'checked':''}><span>Available to buy</span></label>`}
        <div class="row"><label class="check"><input type="checkbox" id="pe-pub" data-ch="pePub" ${p.status==='published'?'checked':''}><span>Published</span></label><label class="check"><input type="checkbox" id="pe-feat" data-ch="peFeat" ${p.featured?'checked':''}><span>Featured on the homepage</span></label></div>
      </section>
      <section class="panel stack"><h2>Photos</h2>
        <div class="refs">${(media?.images||[]).map((m,i)=>`<div class="ref"><img src="${m.data}" alt="Photo ${i+1}"><button data-a="peImgRemove" data-i="${i}" aria-label="Remove photo">×</button></div>`).join('')}</div>
        ${media===undefined?'<p class="faint">Loading photos…</p>':''}
        <label class="drop">Add photos (JPEG, PNG or WebP; resized for the web)<input type="file" accept="image/jpeg,image/png,image/webp" multiple class="visually-hidden" data-ch="peImg"></label>
        <p class="faint" style="font-size:12.5px">The first photo is the product card image. Up to 4 photos per product.</p>
      </section>
    </div>
    <div class="stack">
      <section class="panel stack"><h2>Tailoring and try-on</h2>
        <p class="muted" style="font-size:14px">Turn on virtual try-on only when you have this garment’s real size chart. A retail photo alone isn’t enough to fit a garment to someone’s body.</p>
        ${p.type!=='garment' ? '<p class="faint">Try-on applies to clothing only.</p>' : `
        <label class="check"><input type="checkbox" id="pe-fit" data-ch="peFit" ${t.status==='fit-ready'?'checked':''}><span><b>Enable try-on with saved avatars</b></span></label>
        ${t.status==='fit-ready' ? `
          <label class="field">Closest pattern block<select id="pe-block" data-ch="peBlock">${CATEGORIES.filter(c=>c.k!=='custom').map(c=>`<option value="${c.k}" ${t.spec?.category===c.k?'selected':''}>${c.label}</option>`).join('')}</select></label>
          <div class="ctl"><span class="lbl">Garment colour on the avatar</span><div class="swatches">${PALETTE.map(c=>`<button class="sw" style="background:${c.h}" data-a="peColor" data-v="${c.h}" aria-pressed="${t.spec?.color===c.h}" aria-label="${c.n}"></button>`).join('')}</div></div>
          <div class="spread"><span class="lbl" style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)">Size chart · finished garment, cm</span><button class="btn sm" data-a="peChart">Fill with block estimate</button></div>
          ${sk.length ? `<div class="scroll-x"><table class="data"><thead><tr><th>Size</th>${zk.map(z=>`<th class="num">${optLabel(z)}</th>`).join('')}</tr></thead><tbody>${sk.map(s=>`<tr><td>${esc(s)}</td>${zk.map(z=>`<td><input type="number" step="0.5" id="pc-${s}-${z}" value="${sizes[s][z]??''}" data-ch="peSize" data-s="${esc(s)}" data-z="${z}" class="mono" style="min-height:32px;padding:4px 6px;width:70px;text-align:right" aria-label="${esc(s)} ${z}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="faint">No chart yet.</p>'}
          <label class="check"><input type="checkbox" id="pe-verified" data-ch="peVerified" ${t.chartVerified?'checked':''}><span>These are measured from the real garment. Without this, shoppers see a visual preview only, not a fit check.</span></label>` : ''}`}
      </section>
      <section class="panel stack s"><h2>Source</h2><dl class="kv"><dt>Imported from</dt><dd>${esc(p.source||'Added in admin')}</dd>${p.sourceUrl?`<dt>Original page</dt><dd><a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">${esc(p.sourceUrl)}</a></dd>`:''}${p.imageFile?`<dt>Photo file name</dt><dd class="mono">${esc(p.imageFile)}</dd>`:''}</dl></section>
      <div class="row"><button class="btn primary" data-a="productSave">Save product</button>${isNew?'':'<button class="btn danger" data-a="productDelete">Delete</button>'}</div>
    </div>
  </div>`;
}
function adminImages(){
  const r = S.imp;
  const missing = productsAll().filter(p=>!p.thumb && p.imageFile);
  return `<div class="two" style="align-items:start">
    <section class="panel stack"><h2>Import photos from the current site</h2>
      <p class="muted" style="font-size:14px">This preview can’t download images from izelia.co.uk, so add them once from your WordPress media library: download the photos (or the uploads folder), then select them all here. Each file is matched to its product by file name, resized and saved.</p>
      <label class="drop" style="padding:28px">${ic('plus','style="width:20px;height:20px;vertical-align:-4px"')} Select photos (you can pick many at once)<input type="file" accept="image/jpeg,image/png,image/webp" multiple class="visually-hidden" data-ch="bulkImg"></label>
      ${r ? `<div class="stack s"><div class="spread"><b>${r.done} of ${r.total} processed</b><span class="faint">${r.matched} matched · ${r.unmatched.length} not matched</span></div><div class="bar"><i style="width:${r.total?r.done/r.total*100:0}%"></i></div>${r.unmatched.length?`<details><summary class="faint" style="cursor:pointer;font-size:13px">Files with no matching product</summary><p class="mono" style="font-size:12px">${r.unmatched.map(esc).join(', ')}</p></details>`:''}</div>`:''}
      <p class="faint" style="font-size:12.5px">Also matched: logo.png (site logo), product-2.jpg, Untitled-mens-fashion.jpg, royalty-collection-1.jpg, accesories.jpg, fabrics.jpg (collection tiles), slider-6.jpg (homepage campaign), about-page-1…5.jpg (About page).</p>
    </section>
    <section class="panel stack"><h2>Still missing (${missing.length})</h2>${missing.length?`<div class="scroll-x" style="max-height:480px;overflow:auto"><table class="data"><tbody>${missing.map(p=>`<tr><td>${esc(p.name)}</td><td class="mono" style="font-size:12px">${esc(p.imageFile)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Every imported product has a photo.</p>'}</section>
  </div>`;
}
function adminContent(){
  const c = Store.content;
  return `<div class="two" style="align-items:start">
    <section class="panel stack"><h2>Homepage</h2>
      <label class="check"><input type="checkbox" id="ac-annon" data-ch="acBool" data-k="announcementOn" ${c.announcementOn?'checked':''}><span>Show announcement bar</span></label>
      <label class="field">Announcement<input type="text" id="ac-ann" data-in="ac" data-k="announcement" value="${esc(c.announcement)}" placeholder="e.g. New Royalty fabrics now in store"></label>
      <label class="field">Campaign headline<input type="text" id="ac-ht" data-in="ac" data-k="heroTitle" value="${esc(c.heroTitle)}"></label>
      <label class="field">Campaign text<input type="text" id="ac-hx" data-in="ac" data-k="heroText" value="${esc(c.heroText)}"></label>
      <div class="form-grid"><label class="field">Button label<input type="text" id="ac-hc" data-in="ac" data-k="heroCta" value="${esc(c.heroCta)}"></label><label class="field">Button goes to<select id="ac-tg" data-ch="acSel" data-k="heroTarget">${[['all','Shop all'],...Object.entries(COLLECTIONS).map(([k,v])=>[k,v.label])].map(([k,l])=>`<option value="${k}" ${c.heroTarget===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
      <div class="ctl"><span class="lbl">Campaign photo</span>${c.heroImage?`<img src="${c.heroImage}" alt="" style="max-height:140px;object-fit:cover">`:'<span class="faint">None: a Gara-dye pattern is shown instead.</span>'}<label class="drop">Upload campaign photo<input type="file" accept="image/jpeg,image/png,image/webp" class="visually-hidden" data-ch="acImg" data-k="hero"></label></div>
    </section>
    <section class="panel stack"><h2>Brand</h2>
      <div class="ctl"><span class="lbl">Logo</span>${c.logo?`<img src="${c.logo}" alt="IZELIA logo" style="max-height:60px;width:auto;align-self:flex-start">`:'<span class="faint">Not uploaded: the name is shown as text. Upload the original logo.png.</span>'}<label class="drop">Upload logo (PNG)<input type="file" accept="image/png,image/jpeg,image/webp" class="visually-hidden" data-ch="acImg" data-k="logo"></label></div>
      <label class="field">Accent colour <small>match the lime green in the logo</small><span class="row tight"><input type="color" id="ac-accent" value="${esc(c.accent)}" data-ch="acAccent" style="width:56px;padding:2px"><span class="mono">${esc(c.accent)}</span></span></label>
      <div class="ctl"><span class="lbl">Collection tiles</span><div class="form-grid">${Object.entries(COLLECTIONS).map(([k,v])=>`<label class="drop" style="padding:8px;font-size:12px">${c.tileImages?.[k]?`<img src="${c.tileImages[k]}" alt="" style="height:60px;width:100%;object-fit:cover">`:''}${v.label}<input type="file" accept="image/*" class="visually-hidden" data-ch="acImg" data-k="tile:${k}"></label>`).join('')}</div></div>
    </section>
    <section class="panel stack"><h2>Contact and delivery</h2>
      <label class="field">Address<input type="text" id="ac-addr" data-in="acContact" data-k="address" value="${esc(c.contact.address)}"></label>
      <div class="form-grid"><label class="field">Email<input type="email" id="ac-email" data-in="acContact" data-k="email" value="${esc(c.contact.email)}"></label><label class="field">Phone<input type="tel" id="ac-phone" data-in="acContact" data-k="phone" value="${esc(c.contact.phone)}"></label></div>
      <label class="field">Hours<input type="text" id="ac-hours" data-in="acContact" data-k="hours" value="${esc(c.contact.hours)}"></label>
      <div class="scroll-x"><table class="data"><thead><tr><th>Delivery option</th><th class="num">£</th><th>On</th></tr></thead><tbody>${c.delivery.map((d,i)=>`<tr><td>${esc(d.label)}</td><td><input type="number" step="0.01" id="dl-${i}" value="${d.price??''}" data-ch="acDelPrice" data-i="${i}" style="width:80px;min-height:32px;padding:4px 6px" class="mono" aria-label="${esc(d.label)} price"></td><td><input type="checkbox" id="dlon-${i}" data-ch="acDelOn" data-i="${i}" ${d.enabled?'checked':''} aria-label="${esc(d.label)} enabled"></td></tr>`).join('')}</tbody></table></div>
    </section>
    <section class="panel stack"><h2>Testimonials</h2><p class="faint" style="font-size:13px">Only genuine reviews, with the customer’s permission. Unverified ones are never shown.</p>
      ${c.testimonials.map((t,i)=>`<div class="li"><div class="grow"><b>${esc(t.name)}</b><small>“${esc(t.text)}”</small></div><label class="check"><input type="checkbox" data-ch="acTestimonial" data-i="${i}" ${t.verified?'checked':''}><span>Show</span></label><button class="btn sm ghost" data-a="acTestimonialDel" data-i="${i}">Remove</button></div>`).join('')}
      <div class="form-grid"><label class="field">Customer name<input type="text" id="tm-name"></label><label class="field">Review<input type="text" id="tm-text"></label></div><div><button class="btn sm" data-a="acTestimonialAdd">Add verified review</button></div>
    </section>
    <div class="row"><button class="btn primary" data-a="contentSave">Save content</button><span class="faint" style="font-size:13px">${c.updatedAt?`Last saved ${fmtAgo(c.updatedAt)}`:'Not saved yet'}</span></div>
  </div>`;
}
const PAY = ['Not paid (test checkout)','Payment requested','Paid','Refunded'];
const FUL = ['New','Preparing','Ready for collection','Dispatched','Completed','Cancelled'];
const DEL = ['Not dispatched','In transit','Delivered','Collected'];
function adminOrdersView(list){
  if (!list.length) return `<div class="empty"><h3>No orders yet</h3><p>Orders placed through checkout appear here, with payment, fulfilment and delivery tracked separately.</p></div>`;
  return `<div class="stack">${list.map(o=>`<section class="panel stack">
    <div class="spread"><div><h3 style="font-size:17px">${esc(o.ref)} · ${priceFmt(o.total)}</h3><span class="faint" style="font-size:13px">${fmtDate(o.createdAt)} · ${esc(o.contact.name)} · <span class="mono">${esc(o.contact.email)}</span>${o.contact.phone?' · '+esc(o.contact.phone):''}</span></div><span class="row tight">${(()=>{ const e = expectedTotal(o); return e!=null && Math.abs(e-o.total)>0.009 ? `<span class="chip bad" title="Catalogue total ${priceFmt(e)}">Total differs from catalogue (${priceFmt(e)})</span>` : ''; })()}<span class="chip">${esc(o.delivery.label)}</span></span></div>
    <p style="font-size:14px">${o.items.map(l=>`${esc(l.name)}${l.size?` (${esc(l.size)})`:''} × ${l.qty}`).join(' · ')}</p>
    ${o.notes?`<p class="note">${esc(o.notes)}</p>`:''}
    <div class="form-grid">${[['payment','Payment',PAY],['fulfilment','Fulfilment',FUL],['deliveryStatus','Delivery',DEL]].map(([k,l,opts])=>`<label class="field">${l}<select data-ch="orderStatus" data-o="${o.owner}" data-id="${o.id}" data-k="${k}">${opts.map(x=>`<option ${o[k]===x?'selected':''}>${x}</option>`).join('')}</select></label>`).join('')}</div>
  </section>`).join('')}</div>`;
}
function adminMessagesView(list){
  if (!list.length) return `<div class="empty"><h3>No messages</h3><p>Contact-form messages and newsletter sign-ups appear here.</p></div>`;
  return `<div class="panel"><div class="list">${list.map(m=>`<div class="li"><div class="grow"><b>${m.kind==='newsletter'?'Newsletter sign-up':esc(m.topic)+': '+esc(m.subject)}</b><small>${esc(m.name||'')} <span class="mono">${esc(m.email)}</span> · ${fmtAgo(m.at)}</small>${m.text?`<p style="font-size:14px;margin-top:4px">${esc(m.text)}</p>`:''}</div></div>`).join('')}</div></div>`;
}
function adminData(){
  return `<section class="panel stack"><h2>What was imported, and what needs IZELIA’s input</h2>
  <ul class="stack s" style="margin:0;padding-left:18px;font-size:14.5px">
    <li><b>Imported:</b> ${RAW_PRODUCTS.length} products with names, prices (GBP), sizes and categories from the live WooCommerce shop (${esc(CATALOGUE_SOURCE)}).</li>
    <li><b>Photos and logo:</b> not imported, because this preview can’t reach izelia.co.uk. Use Photo import.</li>
    <li><b>Descriptions, materials, care and fabric selling units:</b> not published on the live site, so left blank.</li>
    <li><b>Stock levels:</b> the live shop shows everything as in stock without quantities. Turn on tracking per product to enforce limits.</li>
    <li><b>Menswear:</b> the live Menswear page shows three two-piece kaftans (listed in WooCommerce under women’s product URLs), at higher prices (£106.97–£127.04) than their product records (£79.99–£95). The product-record prices are used; confirm which is right.</li>
    <li><b>Categories:</b> most clothing is filed under “Fabric” in WooCommerce. Here it’s grouped as Womenswear by product type. “Nuyea Silk Chiffon” is unclear (clothing or fabric) and is listed as clothing.</li>
    <li><b>Royalty Collection:</b> matches the live page, which lists the 17 products in the “Fabrics” category.</li>
    <li><b>Delivery:</b> “Next day to home” shows “Nle55” on the live page, so it’s switched off until the price is confirmed.</li>
    <li><b>Address:</b> the live site uses both “Freetown” and “Kingtom” for 11 Bolling Street.</li>
    <li><b>Currency:</b> the live shop also offers USD and EUR. No exchange rates are configured here, so prices are GBP only.</li>
    <li><b>Policies:</b> delivery and returns are summarised from the live site. Terms link to the existing page. No privacy policy exists yet.</li>
    <li><b>Payments, email and push notifications:</b> not connected. Checkout records unpaid test orders.</li>
  </ul></section>`;
}
