/* ================= IZELIA CATALOGUE =================
   Source: izelia.co.uk WooCommerce Store API, read 12 Oct 2026.
   Names, prices (GBP), categories and image file names are as published there.
   Descriptions, materials, care, selling units and stock levels were NOT published,
   so they are left empty for the business to supply. */
const CATALOGUE_SOURCE = 'izelia.co.uk product feed, 12 Oct 2026';
// [wcId, name, slug, price, wcCategories, sizes, imageFile, extra]
const RAW_PRODUCTS = [
  [2618,"Diamond from Kono Fabric","fabric-16",85,"Fabrics","","izelia-latest-36.jpg"],
  [2614,"Pink Sara Fabric","fabric-15",85,"Fabrics","","izelia-latest-31.jpg"],
  [2610,"Ellen Peach Fabric","fabric-14",85,"Fabrics","","izelia-latest-29.jpg"],
  [2607,"Gina Orange Fabric","fabric-13",85,"Fabrics","","izelia-latest-27.jpg"],
  [2603,"N'nah Sarah Fented Blue Fabric","fabric-12",85,"Fabrics","","izelia-latest-26.jpg"],
  [2598,"FSK Multi Color Orange Fabric","fabric-11",85,"Fabrics","","izelia-latest-24.jpg"],
  [2594,"FSK Multi Color Green Fabric","fabric-10",85,"Fabrics","","izelia-latest-21.jpg"],
  [2589,"FSK Maroon Fabric","fabric-9",85,"Fabrics","","izelia-latest-17.jpg"],
  [2585,"Hibi Blue&Pink Fabric","fabric-8",65,"Fabrics","","izelia-latest-15.jpg"],
  [2581,"Hibi Brown&Pink Fabric","fabric-7",65,"Fabrics","","izelia-latest-13.jpg"],
  [2575,"Ying Multi-color Fabric","fabric-6",75,"Fabrics","","izelia-latest-11.jpg"],
  [2572,"N'na Fenteh Fabric","fabric-5",55,"Fabrics","","izelia-latest-10.jpg"],
  [2570,"Grafiti Pink&Green Fabric","fabric-4",65,"Fabrics","","izelia-latest-7.jpg"],
  [2561,"Grafiti Blue & Pink","fabric-3",65,"Fabrics","","izelia-latest-6.jpg"],
  [2557,"Grafiti Pink & Green","fabric-2",65,"Fabrics","","izelia-latest-4.jpg"],
  [2551,"Grafiti Multi-color Blue & Pink","fabric-1",65,"Fabrics","","izelia-latest-2.jpg"],
  [2453,"Magbealaye Multi color Fabric","fabric-new-10",35,"Fabrics","","izelia-fabric-29.jpg"],
  [2449,"Genefyne Blue&Maroon Fabric","fabric-new-9",85,"Fabric","","izelia-fabric-28.jpg"],
  [2438,"Makay Multi color","fabric-new-7",35,"Fabric","","izelia-fabric-22.jpg"],
  [2433,"Dugou Multi color fabric","fabric-new-6",35,"Fabric","","izelia-fabric-18.jpg"],
  [2428,"Laba Multi color Fabric","fabric-new-5",85,"Fabric","","izelia-fabric-14.jpg"],
  [2422,"Kori Multi Color Fabric","fabric-new-4",85,"Fabric","","izelia-fabric-13.jpg"],
  [2418,"Keni Multi Color Fabric","fabric-new-3",85,"Fabric","","izelia-fabric-8.jpg"],
  [2414,"Tongo Multi color Fabric","fabric-new-2",35,"Fabric","","izelia-fabric-5.jpg"],
  [2410,"Tokeh Multi Color Fabric","fabric-new-1",35,"Fabric","","izelia-fabric-1.jpg"],
  [2262,"Mading Blue","necklace-6",35,"Accessories, Necklace","","necklaces-5.jpg"],
  [2260,"Fellani","necklace-5",20,"Accessories, Necklace","","necklaces-4.jpg"],
  [2258,"Anabi Willo Green & Candy","necklace-4",20,"Accessories, Necklace","","necklaces-3.jpg"],
  [2239,"Marus","necklace-2",25,"Accessories, Necklace","","necklaces-2.jpg"],
  [2033,"Mading Red Moon","necklace-1",35,"Accessories, Necklace","","necklaces-1.jpg"],
  [2030,"Bintu Shell Bracelet","bracelets-02",10,"Accessories, Bracelets","","bracelets-3.jpg"],
  [2022,"Didi Deep Brown Wooden Bangle","bracelets",10,"Accessories, Bracelets","","bracelets-2.jpg"],
  [2220,"Tilda with String Maxi","gara-women-26",45,"Fabric","One Size","IZELIA-product-68.jpg"],
  [2216,"Prime Rose Yellow Mano Drapped Bubu","gara-women-25",45,"Fabric, Material","One Size","IZELIA-product-65.jpg"],
  [2212,"Sulphur Mano Drapped Bubu","gara-women-24",45,"Fabric, Material","One Size","IZELIA-product-62.jpg"],
  [2207,"Nima Off Shoulder Silk Maxi Dress","gara-women-23",120,"Fabric","One Size","IZELIA-product-61.jpg"],
  [2203,"Nuyea Silk Chiffon","gara-women-22",35,"Fabric, Material","One Size","IZELIA-product-57.jpg"],
  [2199,"Susie Floural Printed Yaya Bubu","gara-women-21",45,"Fabric, Material","One Size","IZELIA-product-55.jpg"],
  [2194,"Sierra Full Blue Moon Gown","gara-women-20",55,"Fabric","One Size","IZELIA-product-53.jpg"],
  [2189,"Fafay Off Shoulder Puff Sleeve Coral Gown","gara-women-19",95,"Fabric","One Size","IZELIA-product-50.jpg"],
  [2183,"M'Adama Pink,Orange&White Bubu","gara-women-18",95,"Fabric","One Size","IZELIA-product-47.jpg"],
  [2177,"Jebs Flared Blue&Yellow Blouse","gara-women-17",24.99,"Fabric","10, 12, 14, 16, 18","IZELIA-product-44.jpg"],
  [2172,"Nia Blue&Pink Kimono Jacket","gara-women-16",85,"Fabric","One Size","IZELIA-product-41.jpg"],
  [2170,"Izzy Pink&Blue Kimono Jacket","gara-women-15",85,"Fabric","One Size","IZELIA-product-39.jpg"],
  [2162,"Mukeh Blue Two Piece Kaftan","gara-women-14",79.99,"Fabric","Large","IZELIA-product-36.jpg",{men:true}],
  [2157,"Janneh Embroidery Two Piece","gara-women-13",85,"Fabric","Large","IZELIA-product-33.jpg",{men:true}],
  [2152,"Lily Kimono Jacket","gara-women-12",85,"Fabric","One Size","IZELIA-product-32.jpg"],
  [2147,"Mukeh Blue Two Piece Gara Kaftan","gara-women-11",95,"Fabric","Large","IZELIA-product-27.jpg",{men:true}],
  [2142,"Ria Orange&Blue Kimono Jacket","gara-women-10",85,"Fabric","One Size","IZELIA-product-24.jpg"],
  [2137,"M'Adama Pink,Gold&Biscay Green Bubu","gara-women-9",95,"Fabric","One Size","IZELIA-product-22.jpg"],
  [2132,"Gina Zodiac Gara Kimono Jacket","gara-women-8",85,"Fabric","One Size","IZELIA-product-20.jpg"],
  [2128,"Izzy Pink, Sky Blue & White Kimono Jackets","gara-women-7",85,"Fabric","One Size","IZELIA-product-17.jpg"],
  [2122,"N'nah Multi Color Gara Pleated Gown","gara-women-6",120,"Fabric","One Size","IZELIA-product-13.jpg"],
  [2117,"Sofia Golden White Silk Mano Gown","gara-women-5",120,"Fabric","One Size","IZELIA-product-11.jpg"],
  [2113,"Jebs Flared Top","gara-women-4",24.99,"Fabric","10, 12, 14, 16, 18","IZELIA-product-8.jpg"],
  [2109,"Mani Blue Silk Butterfly Blouse","gara-women-3",45,"Fabric","10, 12, 14, 16, 18","IZELIA-product-7.jpg"],
  [2105,"Susu Orange&Green Mini Gown","gara-women-2",39.99,"Fabric","12","IZELIA-product-4.jpg"],
  [2100,"Makeba Top","gara-women-1",29.99,"Fabric","10, 12, 14, 16, 18","IZELIA-product-3.jpg"],
  [1456,"Manhattan Cape","70-2",75,"","","1-44.jpg",{desc:true}],
  [1452,"The Elizabeth Cape","69-2",75,"","","1-43.jpg",{desc:true}],
  [1444,"The Elizabeth Orange Cape","67-2",75,"","","1-41.jpg",{desc:true}],
  [1440,"The Elizabeth Yellow Cape","66-2",75,"","","manequin_model-template.jpg",{desc:true}],
  [1432,"Manhattan Navy Cape","65-2",75,"","","1-40.jpg"],
  [1413,"The Elizabeth Navy Cape","62-2",75,"","","1-37.jpg",{desc:true}],
];
const HOMEPAGE_FEATURED = [2575, 2220, 2199, 2117, 2142, 2614]; // as featured on the live homepage

function garmentSubtype(n){
  const s = n.toLowerCase();
  if (s.includes('kimono')) return 'Kimono jackets';
  if (s.includes('cape')) return 'Capes & wraps';
  if (s.includes('bubu')) return 'Bubu';
  if (s.includes('kaftan') || s.includes('two piece')) return 'Two-piece sets';
  if (s.includes('gown')) return 'Gowns';
  if (s.includes('dress') || s.includes('maxi')) return 'Dresses';
  if (s.includes('blouse') || s.includes('top')) return 'Tops & blouses';
  return 'Other';
}
/* Closest tailoring block for "Customise a similar design". Starts a NEW design; never a copy of the product. */
function blockForSubtype(sub, name){
  const n = name.toLowerCase();
  if (sub==='Kimono jackets') return {category:'jacket', o:{collar:'shawl', closure:'wrap', sleeve:'three-quarter', fit:'relaxed', length:'thigh', pockets:'none', lining:'none', cuffs:'none'}};
  if (sub==='Capes & wraps') return {category:'coat', o:{collar:'none', closure:'pullover', sleeve:'wide', fit:'oversized', length:'hip', pockets:'none', lining:'full'}};
  if (sub==='Bubu') return {category:'traditional', o:{sleeve:'wide', collar:'boat', length:'floor', fit:'relaxed', embroidery:'none'}};
  if (sub==='Two-piece sets') return {category:'traditional', o:{sleeve:'long', collar:'mandarin', length:'knee', fit:'regular', embroidery: n.includes('embroider')?'neckline':'none'}};
  if (sub==='Gowns' || sub==='Dresses') return {category:'dress', o:{length: n.includes('mini')?'thigh': 'floor', collar: n.includes('off shoulder')?'boat':'scoop', sleeve: n.includes('puff')?'short': n.includes('off shoulder')?'none':'short', skirtShape: n.includes('pleated')?'gathered':'a-line', closure:'zip'}};
  if (sub==='Tops & blouses') return {category:'shirt', o:{collar: 'scoop', closure:'pullover', sleeve: n.includes('butterfly')?'wide':'short', length:'hip', fit:'relaxed', cuffs:'none', template:'top'}};
  return {category:'dress', o:{}};
}
function makeCatalogue(){
  const t0 = Date.parse('2023-06-01T00:00:00Z');
  return RAW_PRODUCTS.map(([wc, name, slug, price, cats, sizes, img, extra={}]) => {
    const c = cats.toLowerCase();
    const isFabric = /fabric/.test(name.toLowerCase()) && !/bubu|gown|maxi/.test(name.toLowerCase()) || (cats==='Fabrics') || ['Makay Multi color'].includes(name);
    const isAcc = c.includes('accessories');
    const type = isAcc ? 'accessory' : isFabric ? 'fabric' : 'garment';
    const collections = [];
    if (type==='fabric') collections.push('fabrics');
    if (cats==='Fabrics') collections.push('royalty');
    if (type==='accessory') collections.push('accessories');
    if (type==='garment'){ if (extra.men) collections.push('menswear'); collections.push('womenswear'); }
    const sub = type==='accessory' ? (c.includes('necklace') ? 'Necklaces' : 'Bracelets & bangles') : type==='fabric' ? 'Fabrics' : garmentSubtype(name);
    return {
      id:'p'+wc, wcId:wc, name, slug, sourceUrl:`https://izelia.co.uk/product/${slug}/`,
      price, currency:'GBP', type, subtype:sub, collections, wcCategories:cats ? cats.split(', ') : [],
      sizes: sizes ? sizes.split(', ') : [],
      description: extra.desc ? 'Stay stylish and warm this season in this cape. A great gift for her.' : '',
      material:'', care:'', dimensions:'', sellingUnit: type==='fabric' ? '' : '',
      stock:{tracked:false, qty:null, inStock:true},
      imageFile:img, thumb:null, hasMedia:false,
      status:'published', featured: HOMEPAGE_FEATURED.includes(wc),
      tailoring:{status:'none'},
      source:CATALOGUE_SOURCE, createdAt:new Date(t0 + wc*60000).toISOString(), updatedAt:new Date(t0 + wc*60000).toISOString(),
    };
  });
}
const COLLECTIONS = {
  womenswear:{label:'Womenswear', path:'womenswear', blurb:'Gowns, bubu, kimono jackets and tops cut from Gara and silk.', image:'product-2.jpg'},
  menswear:{label:'Menswear', path:'menswear', blurb:'Two-piece kaftans in hand-dyed Gara.', image:'Untitled-mens-fashion.jpg'},
  royalty:{label:'Royalty Collection', path:'royalty', blurb:'The Royalty fabric collection.', image:'royalty-collection-1.jpg'},
  accessories:{label:'Accessories', path:'accessories', blurb:'Necklaces, bracelets and bangles.', image:'accesories.jpg'},
  fabrics:{label:'Fabrics', path:'fabrics', blurb:'Gara and tie-dye textiles, made in Sierra Leone.', image:'fabrics.jpg'},
};
/* Site content the business edits in Admin → Content. Seeded from the live site; flagged where unverified. */
function defaultContent(){
  return {
    announcement:'', announcementOn:false,
    heroTitle:'African tradition meets modern style', heroText:'Authentic African clothing, accessories and fabrics, made in Sierra Leone.', heroCta:'Shop now', heroTarget:'all',
    accent:'#9CC42B', logo:null, heroImage:null, tileImages:{}, aboutImages:[],
    testimonials:[{name:'Aminata Kamara', text:'Izelia rekindled my passion for authentic, creative, and stylish fashion', verified:true, source:'izelia.co.uk homepage'}],
    contact:{address:'11 Bolling Street, Kingtom, Freetown, Sierra Leone', addressNote:'The live site lists this as both “Freetown” and “Kingtom”. Confirm the preferred form.', email:'info@izelia.co.uk', phone:'', hours:'Monday to Friday 9:30am–6:00pm · Saturday 10:00am–4:00pm'},
    social:{facebook:'https://www.facebook.com/IzeliaFashion', instagram:'https://www.instagram.com/izeliafashion/', twitter:'https://twitter.com/IzeliaFashion'},
    delivery:[
      {id:'dhl', label:'DHL Express', price:30, eta:'5–7 working days from Sierra Leone', enabled:true},
      {id:'salpost', label:'SalPost Standard', price:20, eta:'10–15 working days', enabled:true},
      {id:'collect', label:'Next day collection, IZELIA flagship store', price:0, eta:'Order by midnight; collect from 12 noon, Monday–Saturday, at 11 Bolling Street, Kingtom, Freetown', enabled:true},
      {id:'home', label:'Next day to home (Freetown)', price:null, eta:'Order by 4pm. Price not confirmed: the live page shows “Nle55”.', enabled:false},
    ],
    updatedAt:null,
  };
}
const CONTENT_IMAGE_FILES = {'logo.png':'logo', 'product-2.jpg':'tile:womenswear', 'Untitled-mens-fashion.jpg':'tile:menswear', 'royalty-collection-1.jpg':'tile:royalty', 'accesories.jpg':'tile:accessories', 'fabrics.jpg':'tile:fabrics',
  'about-page-1.jpg':'about:0', 'about-page-2.jpg':'about:1', 'about-page-3.jpg':'about:2', 'about-page-4.jpg':'about:3', 'about-page-5.jpg':'about:4', 'slider-6.jpg':'hero'};

/* Photos as published on izelia.co.uk (WooCommerce Store API, 12 Oct 2026): wcId → upload path.
   Shown directly from izelia.co.uk in the standalone website and the app. The Claude artifact
   can't load images from other sites, so there the admin imports photos instead. */
const IZ_UPLOADS = 'https://izelia.co.uk/wp-content/uploads/';
const REMOTE_IMG = {"2618": "2023/06/izelia-latest-36.jpg", "2614": "2023/06/izelia-latest-31.jpg", "2610": "2023/06/izelia-latest-29.jpg", "2607": "2023/06/izelia-latest-27.jpg", "2603": "2023/06/izelia-latest-26.jpg", "2598": "2023/06/izelia-latest-24.jpg", "2594": "2023/06/izelia-latest-21.jpg", "2589": "2023/06/izelia-latest-17.jpg", "2585": "2023/06/izelia-latest-15.jpg", "2581": "2023/06/izelia-latest-13.jpg", "2575": "2023/06/izelia-latest-11.jpg", "2572": "2023/06/izelia-latest-10.jpg", "2570": "2023/06/izelia-latest-7.jpg", "2561": "2023/06/izelia-latest-6.jpg", "2557": "2023/06/izelia-latest-4.jpg", "2551": "2023/06/izelia-latest-2.jpg", "2453": "2023/06/izelia-fabric-29.jpg", "2449": "2023/06/izelia-fabric-28.jpg", "2438": "2023/06/izelia-fabric-22.jpg", "2433": "2023/06/izelia-fabric-18.jpg", "2428": "2023/06/izelia-fabric-14.jpg", "2422": "2023/06/izelia-fabric-13.jpg", "2418": "2023/06/izelia-fabric-8.jpg", "2414": "2023/06/izelia-fabric-5.jpg", "2410": "2023/06/izelia-fabric-1.jpg", "2262": "2023/06/necklaces-5.jpg", "2260": "2023/06/necklaces-4.jpg", "2258": "2023/06/necklaces-3.jpg", "2239": "2023/06/necklaces-2.jpg", "2220": "2023/06/IZELIA-product-68.jpg", "2216": "2023/06/IZELIA-product-65.jpg", "2212": "2023/06/IZELIA-product-62.jpg", "2207": "2023/06/IZELIA-product-61.jpg", "2203": "2023/06/IZELIA-product-57.jpg", "2199": "2023/06/IZELIA-product-55.jpg", "2194": "2023/06/IZELIA-product-53.jpg", "2189": "2023/06/IZELIA-product-50.jpg", "2183": "2023/06/IZELIA-product-47.jpg", "2177": "2023/06/IZELIA-product-44.jpg", "2172": "2023/06/IZELIA-product-41.jpg", "2170": "2023/06/IZELIA-product-39.jpg", "2162": "2023/06/IZELIA-product-36.jpg", "2157": "2023/06/IZELIA-product-33.jpg", "2152": "2023/06/IZELIA-product-32.jpg", "2147": "2023/06/IZELIA-product-27.jpg", "2142": "2023/06/IZELIA-product-24.jpg", "2137": "2023/06/IZELIA-product-22.jpg", "2132": "2023/06/IZELIA-product-20.jpg", "2128": "2023/06/IZELIA-product-17.jpg", "2122": "2023/06/IZELIA-product-13.jpg", "2117": "2023/06/IZELIA-product-11.jpg", "2113": "2023/06/IZELIA-product-8.jpg", "2109": "2023/06/IZELIA-product-7.jpg", "2105": "2023/06/IZELIA-product-4.jpg", "2100": "2023/06/IZELIA-product-3.jpg", "2033": "2023/05/necklaces-1.jpg", "2030": "2023/05/bracelets-3.jpg", "2022": "2023/05/bracelets-2.jpg", "1456": "2017/12/1-44.jpg", "1452": "2017/12/1-43.jpg", "1444": "2017/12/1-41.jpg", "1440": "2017/12/manequin_model-template.jpg", "1432": "2017/12/1-40.jpg", "1413": "2017/12/1-37.jpg"};
const REMOTE_TILES = {womenswear:'2023/05/product-2.jpg', clothing:'2023/05/product-2.jpg', menswear:'2023/05/Untitled-mens-fashion.jpg', royalty:'2023/06/royalty-collection-1.jpg', accessories:'2023/05/accesories.jpg', fabrics:'2023/05/fabrics.jpg'};
const remoteOn = () => !!window.IZELIA_REMOTE_IMAGES;
const photoOf = p => p.thumb || (remoteOn() && REMOTE_IMG[p.wcId] ? IZ_UPLOADS + REMOTE_IMG[p.wcId] : null);
function izImgFail(img){ img.onerror = null; const d = document.createElement('div'); d.className = 'ph'; d.setAttribute('aria-label','Photo coming soon'); d.innerHTML = '<b>IZELIA</b><span>Photo coming soon</span>'; img.replaceWith(d); }
