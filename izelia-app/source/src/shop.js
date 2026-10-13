/* ================= IZELIA STOREFRONT ================= */
const STUDIO_ROUTES = ['studio','body','create','wardrobe','garment','outfit','workshop','designs','projects','tailor','garmentEdit','notifications','settings'];
const isStudio = r => STUDIO_ROUTES.includes(r);
const STUDIO_NAV = [['studio','Overview'],['body','My Body'],['create','Create Your Own'],['wardrobe','Virtual Wardrobe'],['workshop','Workshop'],['designs','My Designs'],['projects','Projects'],['tailor','Tailor Studio',true],['notifications','Updates'],['settings','Settings']];
Object.assign(ICON, {
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  bag:'<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  shop:'<path d="M4 9l2-5h12l2 5"/><path d="M4 9h16v11H4z"/><path d="M9 13h6"/>',
  needle:'<path d="M4 20L18 6"/><circle cx="19.5" cy="4.5" r="1.8"/><path d="M14 4c3 0 6 3 6 6"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  store:'<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6"/><path d="M9 20v-6h6v6"/>',
  drop:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  pin:'<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  hands:'<path d="M7 11V6a2 2 0 0 1 4 0v5"/><path d="M11 9V5a2 2 0 0 1 4 0v6"/><path d="M15 10a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2-4a2 2 0 0 1 3-2l2 2"/>',
});

/* ---------- decorative Gara textures (brand motif, never shown as a product) ---------- */
/* ---------- shell ---------- */
function shellHTML(){
  return `<div id="ann"></div><header class="hdr" id="hdr"></header><main id="main" tabindex="-1"></main><footer id="foot"></footer><nav class="tabbar" id="tabbar" aria-label="Main navigation"></nav><div id="overlay"></div><div class="toasts" id="toasts" aria-live="polite"></div>`;
}
function logoHTML(){ const l = Store.content?.logo; return l ? `<img src="${l}" alt="IZELIA">` : `<span class="wm">IZELIA</span>`; }
function hlLast(t){ const w = String(t||'').trim().split(/\s+/); if (w.length<2) return esc(t); const last = w.pop(); return esc(w.join(' '))+' <span class="hl">'+esc(last)+'</span>'; }
/* ---------- product card + imagery ---------- */
/* ---------- HOME ---------- */
/* ---------- SHOP / COLLECTIONS ---------- */
/* ---------- PRODUCT ---------- */
function quickViewModal(p){
  const v = S.qv || {}; const st = stockOf(p);
  return `<div class="modal wide" role="dialog" aria-modal="true" aria-label="${esc(p.name)} quick view">
    <div class="two" style="align-items:start">
      <div class="pcard"><div class="img" style="cursor:default">${productImg(p)}</div></div>
      <div class="stack"><span class="kicker">${esc(p.subtype)}</span><h2 class="dsp" style="font-size:34px">${esc(p.name)}</h2><span style="font-size:20px">${priceFmt(p.price)}</span>
        ${p.sizes.length>1?`<div class="ctl"><span class="lbl">Size</span><div class="sizes">${p.sizes.map(s=>`<button data-a="qvSize" data-v="${esc(s)}" aria-pressed="${v.size===s}">${esc(s)}</button>`).join('')}</div></div>`:p.sizes.length?`<span class="faint">Size: ${esc(p.sizes[0])}</span>`:''}
        <div class="row"><div class="qtybox"><button data-a="qvQty" data-d="-1" aria-label="Decrease">−</button><input type="number" id="qvq" value="${v.qty||1}" min="1" max="20" aria-label="Quantity" readonly><button data-a="qvQty" data-d="1" aria-label="Increase">+</button></div><button class="btn lime" style="flex:1" data-a="qvAdd" data-id="${p.id}" ${st.ok?'':'disabled'}>Add to bag</button></div>
        <span class="faint" style="font-size:13px">${esc(st.label)}</span>
        <div class="row"><button class="btn sm" data-a="wish" data-id="${p.id}" aria-pressed="${isWished(p.id)}">${isWished(p.id)?'Saved to wishlist':'Add to wishlist'}</button><button class="btn sm ghost" data-a="openProduct" data-id="${p.id}">Full details</button></div>
      </div>
    </div><button class="btn ghost sm" data-a="closeModal" style="align-self:flex-end">Close</button></div>`;
}

/* ---------- SEARCH ---------- */
function viewSearch(){
  S.vcfg = null;
  const q = (S.searchQ||'').trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const hit = s => words.every(w => s.includes(w));
  const prods = q ? productsPub().filter(p => hit((p.name+' '+p.subtype+' '+p.type+' '+p.collections.map(c=>COLLECTIONS[c]?.label).join(' ')).toLowerCase())) : [];
  const styles = q ? garmentsLib().filter(g=>g.status==='published' && hit((g.name+' '+g.description+' '+(CAT[g.category]?.label||'')).toLowerCase())) : [];
  const sugg = ['Kimono jacket','Bubu','Gown','Fabric','Necklace','Kaftan','Cape','Blouse'];
  return `<div class="stack" style="gap:24px">
    <label class="visually-hidden" for="search-q">Search IZELIA</label>
    <input type="search" class="search-big" id="search-q" data-in="searchQ" value="${esc(S.searchQ||'')}" placeholder="Search IZELIA" autocomplete="off">
    ${!q ? `<div class="subchips">${sugg.map(s=>`<button data-a="searchSet" data-v="${s}">${s}</button>`).join('')}</div>` : ''}
    ${q ? `<p class="faint">${prods.length} product${prods.length===1?'':'s'}${styles.length?` and ${styles.length} studio style${styles.length===1?'':'s'}`:''} for “${esc(S.searchQ)}”</p>` : ''}
    ${prods.length ? `<div class="pgrid" style="--cols:4">${prods.map(p=>pcard(p)).join('')}</div>` : q ? `<div class="empty"><h3>No products found</h3><p>Try a garment type such as “gown” or “kimono”, or a colour in the name.</p></div>` : ''}
    ${styles.length ? `<section><div class="sec-h"><h2 class="dsp" style="font-size:30px">In the AI Tailoring Studio</h2></div><div class="cards">${styles.map(g=>garmentCard(g)).join('')}</div></section>`:''}
  </div>`;
}

/* ---------- WISHLIST ---------- */
function viewWishlist(){
  S.vcfg = null;
  const items = (Store.shop.wishlist||[]).map(id=>Store.products[id]).filter(Boolean);
  const favDesigns = designs().filter(d=>d.favourite);
  const favStyles = (S.settings?.favourites||[]).map(id=>getGarment(id)).filter(Boolean);
  return `<div class="page-head"><div><h1>Wishlist</h1><p>Ready-to-buy pieces you’ve saved. Custom designs and studio styles are listed separately below.</p></div></div>
  ${items.length ? `<div class="pgrid" style="--cols:4">${items.map(p=>`<div class="stack s">${pcard(p)}<div class="row tight"><button class="btn sm lime" style="min-height:34px;padding:6px 12px" data-a="wishToBag" data-id="${p.id}">Move to bag</button><button class="btn sm ghost" data-a="wish" data-id="${p.id}">Remove</button></div></div>`).join('')}</div>`
    : `<div class="empty"><h3>Your wishlist is empty</h3><p>Tap the heart on any piece to save it here.</p><button class="btn lime" data-a="goShop" data-r="shop" data-c="all">Browse the shop</button></div>`}
  ${favDesigns.length || favStyles.length ? `<section class="sec"><div class="sec-h"><h2 class="dsp" style="font-size:32px">Saved in the studio</h2><button class="linkbtn" data-a="go" data-r="designs">My designs</button></div>
    <div class="list">${favDesigns.map(d=>`<div class="li"><div class="thumb">${flatSVG(d.spec,'front')}</div><div class="grow"><b>${esc(d.name)}</b><small>Custom design · not a shop product</small></div><button class="btn sm" data-a="openDesign" data-id="${d.id}">Open</button></div>`).join('')}${favStyles.map(g=>`<div class="li"><div class="thumb">${flatSVG(g.spec,'front')}</div><div class="grow"><b>${esc(g.name)}</b><small>Studio style · try on with your avatar</small></div><button class="btn sm" data-a="openGarment" data-id="${g.id}">Try on</button></div>`).join('')}</div></section>`:''}`;
}

/* ---------- BAG ---------- */
function viewBag(){
  S.vcfg = null;
  const lines = bagLines();
  const sub = bagSubtotal();
  const custom = Object.values(Store.myShares.items||{});
  return `<div class="page-head"><div><h1>Shopping bag</h1></div></div>
  ${lines.length ? `<div class="co"><div>
    ${lines.map((l,i)=>{ const st = stockOf(l.p); return `<div class="bagline"><div class="im">${productImg(l.p)}</div>
      <div class="stack s"><button class="nm linkbtn" style="border:0;text-transform:none;letter-spacing:0;font-size:15px;text-align:left" data-a="openProduct" data-id="${l.p.id}">${esc(l.p.name)}</button><span class="faint" style="font-size:13px">${esc(l.p.subtype)}${l.size?` · Size ${esc(l.size)}`:''} · ${priceFmt(l.p.price)} each</span>
        <div class="row tight"><div class="qtybox" style="height:38px"><button data-a="bagQty" data-i="${i}" data-d="-1" aria-label="Decrease">−</button><input type="number" readonly value="${l.qty}" aria-label="Quantity"><button data-a="bagQty" data-i="${i}" data-d="1" aria-label="Increase">+</button></div><button class="btn sm ghost" data-a="bagRemove" data-i="${i}">Remove</button></div>
        ${!st.ok?'<span class="chip bad">No longer available</span>':''}</div>
      <span class="mono">${priceFmt(l.p.price*l.qty)}</span></div>`; }).join('')}
    <div class="note" style="margin-top:16px"><b>Custom tailoring is separate.</b> Designs from the AI Tailoring Studio are quoted by a tailor and never added to this bag. ${custom.length?`You have ${custom.length} tailoring project${custom.length>1?'s':''}. <button class="linkbtn" style="font-size:11px" data-a="go" data-r="projects">View projects</button>`:''}</div>
  </div>
  <aside class="summary"><h2 class="dsp" style="font-size:28px">Summary</h2>
    <div class="rowx"><span>Subtotal</span><span>${priceFmt(sub)}</span></div>
    <div class="rowx faint"><span>Delivery</span><span>Chosen at checkout</span></div>
    <div class="rowx tot"><span>Total so far</span><span>${priceFmt(sub)}</span></div>
    <button class="btn lime" data-a="go" data-r="checkout">Checkout</button>
    <button class="btn line" data-a="goShop" data-r="shop" data-c="all">Continue shopping</button>
    <p class="faint" style="font-size:12.5px">Delivery from £0 (store collection) to £30 (DHL Express).</p></aside></div>`
  : `<div class="empty"><h3>Your bag is empty</h3><p>Pieces you add appear here.</p><button class="btn lime" data-a="goShop" data-r="shop" data-c="all">Start shopping</button></div>`}`;
}

/* ---------- CHECKOUT ---------- */
function viewCheckout(){
  S.vcfg = null;
  const lines = bagLines();
  if (!lines.length) return `<div class="empty"><h3>Nothing to check out</h3><button class="btn lime" data-a="goShop" data-r="shop" data-c="all">Browse the shop</button></div>`;
  const co = S.co || (S.co = Object.assign({name:Store.me?.name||'', email:'', phone:'', line1:'', line2:'', city:'', region:'', postcode:'', country:'Sierra Leone', delivery:'collect', notes:''}, Store.shop.addresses?.[0]||{}));
  const del = Store.content.delivery;
  const d = del.find(x=>x.id===co.delivery && x.enabled) || del.find(x=>x.enabled);
  const sub = bagSubtotal(), ship = d?.price || 0;
  const needAddr = co.delivery!=='collect';
  const f = (id, label, k, type='text', o={}) => `<label class="field">${label}${o.opt?' <small>optional</small>':''}<input type="${type}" id="co-${id}" data-in="co" data-k="${k}" value="${esc(co[k]||'')}" autocomplete="${o.ac||'on'}" ${o.opt?'':'required'}></label>`;
  return `<div class="page-head"><div><h1>Checkout</h1></div><button class="btn sm ghost" data-a="go" data-r="bag">${ic('back')}Back to bag</button></div>
  <div class="testbanner" style="margin-bottom:18px"><b>Test checkout.</b> No payment provider is connected to this preview, so placing an order records it for IZELIA but takes no payment.</div>
  <form class="co" data-form="checkout" novalidate><div>
    <fieldset><legend>Contact</legend><div class="form-grid">${f('name','Full name','name','text',{ac:'name'})}${f('email','Email','email','email',{ac:'email'})}${f('phone','Phone','phone','tel',{opt:true, ac:'tel'})}</div></fieldset>
    <fieldset><legend>Delivery method</legend>${del.map(x=>`<label class="radio ${x.enabled?'':'disabled'}"><input type="radio" name="del" value="${x.id}" data-ch="coDel" ${co.delivery===x.id?'checked':''} ${x.enabled?'':'disabled'}><span style="flex:1"><b>${esc(x.label)}</b><br><span class="faint" style="font-size:13px">${esc(x.eta)}</span></span><span class="mono">${x.price==null?'—':x.price===0?'Free':priceFmt(x.price)}</span></label>`).join('')}
      <p class="faint" style="font-size:12.5px">Orders after 4pm GMT are processed the next working day.</p></fieldset>
    ${needAddr ? `<fieldset><legend>Delivery address</legend><div class="form-grid">${f('l1','Address line 1','line1','text',{ac:'address-line1'})}${f('l2','Address line 2','line2','text',{opt:true, ac:'address-line2'})}${f('city','Town or city','city','text',{ac:'address-level2'})}${f('region','Region / county','region','text',{opt:true})}${f('pc','Postcode','postcode','text',{opt:true, ac:'postal-code'})}${f('country','Country','country','text',{ac:'country-name'})}</div>
      <label class="check"><input type="checkbox" id="co-save" checked><span>Save this address to my account</span></label></fieldset>` : ''}
    <fieldset><legend>Payment</legend><p class="muted" style="font-size:14px">Card and mobile-money payments need a payment provider (for example Stripe for GBP, or Monime for Sierra Leone). None is connected, so this order will be recorded as <b>unpaid</b> and IZELIA will contact you to arrange payment.</p>
      <label class="field">Order notes <small>optional</small><textarea id="co-notes" data-in="co" data-k="notes" style="min-height:60px">${esc(co.notes)}</textarea></label></fieldset>
  </div>
  <aside class="summary"><h2 class="dsp" style="font-size:28px">Your order</h2>
    ${lines.map(l=>`<div class="rowx"><span>${esc(l.p.name)}${l.size?` (${esc(l.size)})`:''} × ${l.qty}</span><span>${priceFmt(l.p.price*l.qty)}</span></div>`).join('')}
    <div class="rowx" style="border-top:1px solid var(--line);padding-top:10px"><span>Subtotal</span><span>${priceFmt(sub)}</span></div>
    <div class="rowx"><span>${esc(d?.label||'Delivery')}</span><span>${ship?priceFmt(ship):'Free'}</span></div>
    <div class="rowx faint"><span>Taxes and duties</span><span>Not calculated</span></div>
    <div class="rowx tot"><span>Total</span><span>${priceFmt(sub+ship)}</span></div>
    <button class="btn lime" type="submit">Place test order</button>
    <p class="faint" style="font-size:12px">By placing an order you accept IZELIA’s <button type="button" class="linkbtn" style="font-size:10.5px" data-a="goPolicy" data-p="terms">terms</button> and <button type="button" class="linkbtn" style="font-size:10.5px" data-a="goPolicy" data-p="returns">returns policy</button>.</p>
  </aside></form>`;
}
function viewOrder(){
  S.vcfg = null;
  const o = Store.myOrders.orders?.[S.params.id];
  if (!o) return `<div class="empty"><h3>Order not found</h3><button class="btn" data-a="go" data-r="account">My account</button></div>`;
  return `<div class="stack" style="max-width:760px;margin:0 auto;gap:20px">
    <div style="text-align:center" class="stack s"><span class="kicker">Thank you${o.contact.name?', '+esc(o.contact.name.split(' ')[0]):''}</span><h1 class="dsp" style="font-size:52px">Order ${esc(o.ref)}</h1>
      <p class="muted">Recorded ${fmtDate(o.createdAt)}. ${Store.mode==='cloud'?'IZELIA can now see this order.':'Saved on this device only.'}</p></div>
    <div class="testbanner"><b>Payment status: not paid.</b> This was a test checkout; no money was taken. IZELIA will contact you at ${esc(o.contact.email)} to arrange payment.</div>
    ${orderDetail(o)}
    <div class="row" style="justify-content:center"><button class="btn lime" data-a="goShop" data-r="shop" data-c="all">Continue shopping</button><button class="btn line" data-a="go" data-r="account">My orders</button></div></div>`;
}
function orderDetail(o){
  return `<div class="summary" style="position:static">
    ${o.items.map(l=>`<div class="rowx"><span>${esc(l.name)}${l.size?` (${esc(l.size)})`:''} × ${l.qty}</span><span>${priceFmt(l.price*l.qty)}</span></div>`).join('')}
    <div class="rowx" style="border-top:1px solid var(--line);padding-top:10px"><span>${esc(o.delivery.label)}</span><span>${o.delivery.price?priceFmt(o.delivery.price):'Free'}</span></div>
    <div class="rowx tot"><span>Total</span><span>${priceFmt(o.total)}</span></div>
    <dl class="kv" style="margin-top:8px"><dt>Payment</dt><dd>${esc(o.payment)}</dd><dt>Fulfilment</dt><dd>${esc(o.fulfilment)}</dd><dt>Delivery</dt><dd>${esc(o.deliveryStatus)}</dd>${o.address?`<dt>Address</dt><dd>${esc([o.address.line1,o.address.line2,o.address.city,o.address.region,o.address.postcode,o.address.country].filter(Boolean).join(', '))}</dd>`:''}</dl>
  </div>`;
}

/* ---------- ACCOUNT ---------- */
/* ---------- ABOUT / CONTACT / POLICIES ---------- */
function viewPolicy(){
  S.vcfg = null;
  const p = S.params.p || 'delivery';
  const c = Store.content;
  const tabs = [['delivery','Delivery'],['returns','Returns & refunds'],['terms','Terms'],['privacy','Privacy'],['faq','FAQ']];
  const body = {
    delivery:`<h2>Delivery</h2><p>Orders ship in one delivery to the address given at checkout, using the method you choose. Delivery times are in working days and start when you receive a shipping confirmation. Orders after 4pm GMT, or at weekends and on bank holidays, are processed the next working day. Admin hours are 9am–5pm, Monday to Friday.</p>
      <div class="scroll-x"><table class="data"><thead><tr><th>Option</th><th>Time</th><th class="num">Price</th></tr></thead><tbody>${c.delivery.map(d=>`<tr><td>${esc(d.label)}${d.enabled?'':' <span class="chip warn">to confirm</span>'}</td><td>${esc(d.eta)}</td><td class="num mono">${d.price==null?'—':d.price===0?'Free':priceFmt(d.price)}</td></tr>`).join('')}</tbody></table></div><p>Sale items are non-refundable and non-returnable.</p>`,
    returns:`<h2>Returns and refunds</h2><ul><li>Customers in Sierra Leone can return items within <b>14 days</b> of purchase; international customers within <b>30 days</b>.</li><li>Items must be unworn and unwashed, in original condition and packaging, with tags attached.</li><li>Returns are compensated with a <b>refund voucher</b>, not cash, for purchases from the flagship store, outlets and official online shops.</li><li>Online purchases can be returned by SalPost or at the flagship store. Keep proof of postage and pack items securely; if sending yourself, use a reliable courier.</li><li>Items that don’t meet these conditions are sent back at the customer’s cost, with no voucher.</li><li>You’ll hear about your return within 48–72 working hours of it arriving.</li><li>Sale items are non-refundable and non-returnable.</li></ul><p>Questions: <span class="mono">${esc(c.contact.email)}</span></p>`,
    terms:`<h2>Terms and conditions</h2><p>IZELIA’s current terms and conditions are published on its existing website. They have not been copied into this preview so they can be reviewed before they move.</p><p><a href="https://izelia.co.uk/terms-and-conditions/" target="_blank" rel="noopener">Read the current terms on izelia.co.uk</a></p>`,
    privacy:`<h2>Privacy</h2><p>No privacy policy was found on the current IZELIA site. IZELIA should publish one before launch. Until then, this is how this site handles data:</p><ul><li>Orders, addresses, wishlist and bag are stored ${Store.mode==='cloud'?'in this site’s database, visible to you and to IZELIA staff for orders':'in this browser only'}.</li><li>Body measurements and avatars in the AI Tailoring Studio are private to you. Staff see them only when you share a specific tailoring project, and only the measurements you tick.</li><li>The design assistant receives the text you ask it to interpret (and reference photos if you choose to send them), never your measurements.</li><li>Nothing is used for AI model training. You can export or delete your data in studio settings.</li></ul>`,
    faq:`<h2>Frequently asked questions</h2><h3>Where is IZELIA based?</h3><p>${esc(c.contact.address)}. Open ${esc(c.contact.hours)}.</p><h3>Do you deliver internationally?</h3><p>Yes: DHL Express (5–7 working days, £30) or SalPost Standard (10–15 working days, £20) from Sierra Leone.</p><h3>Can I collect in store?</h3><p>Yes, free next-day collection from the Freetown flagship store, from 12 noon, Monday to Saturday.</p><h3>How is fabric sold?</h3><p>Fabrics are priced per item as listed. Ask IZELIA for lengths and quantities.</p><h3>What is the AI Tailoring Studio?</h3><p>A place to save your measurements, see garments on a 3D avatar built from them, and design your own piece in IZELIA fabric before sending it to a tailor for a quote. Previews are estimates, not a guaranteed fit.</p>`,
  }[p];
  return `<div class="page-head"><div><h1>Customer information</h1></div></div>
  <div class="subchips">${tabs.map(([k,l])=>`<button data-a="goPolicy" data-p="${k}" aria-pressed="${p===k}">${l}</button>`).join('')}</div>
  <article class="prose">${body}${['delivery','returns'].includes(p)?'<p class="faint" style="font-size:12.5px">Summarised from IZELIA’s current published policy.</p>':''}</article>`;
}
