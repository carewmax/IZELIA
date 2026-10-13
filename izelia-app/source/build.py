import pathlib
src = pathlib.Path(__file__).parent/'src'
order = ['core.js','data.js','catalogue.js','mockimg.js','fit.js','scene.js','scan.js','flats.js','pattern.js','ai.js','commerce.js','views1.js','views2.js','views3.js','views4.js','shop.js','admin.js','main.js','actions-shop.js','design.js','scan-ui.js']
js = "\n".join((src/f).read_text() for f in order) + "\nboot();\n"
head = (src/'head.html').read_text()
three = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
html = f"{head}\n<div id=\"root\"></div>\n{three}\n<script>\n'use strict';\n{js}\n</script>\n"
(src.parent/'dist').mkdir(exist_ok=True)
(src.parent/'dist'/'izelia.html').write_text(html)
(src.parent/'dist'/'app.js').write_text("'use strict';\n"+js)
# standalone website (full HTML document) and app build (local three.js with CDN fallback)
meta = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#F6F3EC"><meta name="description" content="IZELIA: contemporary African fashion, accessories and Gara fabrics from Sierra Leone, with an AI Tailoring Studio.">'
reset = '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
std = f'<!doctype html><html lang="en"><head>{meta}{reset}{head}</head><body><script>window.IZELIA_REMOTE_IMAGES=true</script><div id="root"></div>{three}<script>\n\'use strict\';\n{js}\n</script></body></html>\n'
(src.parent/'dist'/'izelia-standalone.html').write_text(std)
app_three = '<script src="vendor/three.min.js"></script><script>if(!window.THREE)document.write(\'<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\\/script>\')</script>'
app = std.replace(three, app_three).replace('<div id="root"></div>', '<div id="launch"><div class="lbg"></div><div class="lin"><span class="wm">IZELIA</span><span class="tag">African fashion<br>at your fingertips</span><i></i></div><div class="lbtns" hidden><button type="button" class="btn lime" id="l-start">Get started</button><button type="button" class="btn ghostd" id="l-acct">My account</button></div></div><div id="root"></div><script>window.IZELIA_APP=true;window.IZELIA_REMOTE_IMAGES=true</script>', 1)
(src.parent/'dist'/'izelia-app.html').write_text(app)
print(len(html), len(std))
