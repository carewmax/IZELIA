# IZELIA — store + AI Tailoring Studio

One codebase for the IZELIA website and its Android app: the full store (Womenswear, Menswear, Royalty Collection, Accessories, Fabrics, bag, checkout, account, admin) with the AI Tailoring Studio built in.

| What | Where |
|---|---|
| Website / app page | `www/index.html` |
| Single-file version (open in any browser or host anywhere) | `izelia.html` |
| Android app config | `capacitor.config.json` (app id `uk.co.izelia.app`) |
| Automatic APK build | `.github/workflows/android.yml` |
| Editable source files | `source/src/` (rebuild with `python3 source/build.py`; output lands in `source/dist/`, then copy `izelia-app.html` to `www/index.html`) |

## Get the APK (no Android Studio needed)

1. Create a new repository on GitHub and upload **everything in this folder** (including the hidden `.github` folder; drag-and-drop the unzipped folder, or use `git push`).
2. Open the repository's **Actions** tab. The **Build Android APK** workflow starts automatically (or press **Run workflow**).
3. After about 5–8 minutes, open the finished run and download **IZELIA-debug-apk** from *Artifacts*. Unzip it to get `app-debug.apk`.
4. Copy it to an Android phone and open it. Allow "install unknown apps" when asked.

This is a **debug** APK for testing and sharing directly. Publishing on Google Play needs a signed release build (`./gradlew bundleRelease` with your own keystore) and a Play Console account.

## Put the website online (Netlify)

Connect the repository in Netlify. `netlify.toml` already sets the publish folder to `www`. Or drag `izelia.html` onto Netlify Drop.

## How data works in this version

- **Everything is saved on the visitor's own device** (browser storage): bag, wishlist, orders, body profiles, designs. The 64-product catalogue from izelia.co.uk is built in.
- There is **no shared server** in this package: admin edits, orders and tailor projects stay on the device where they were made. The version hosted in Claude uses a shared database for that. To go live for real customers, connect a backend (for example Supabase or Firebase) behind the `Store` object in `source/core.js` and `source/commerce.js`; every read and write already goes through it.
- **Staff tools** (Store admin, Tailor Studio) are opened in this version via *Studio → Settings → Demo role*. Protect them with real sign-in before launch.
- **Photos:** use *Store admin → Photo import* with the images from IZELIA's WordPress media library. Device storage holds roughly 5 MB, so a full photo set needs the online backend.
- **Payments** are not connected: checkout records unpaid test orders. Add Stripe (GBP) or Monime (Sierra Leone) before taking money.
- The AI design assistant only works inside Claude. Elsewhere the built-in keyword interpreter is used, and the page says so.

## 3D body scans

Studio → My Body → **Import 3D scan** reads a full-body scan exported from a phone app (Polycam, Scaniverse and similar) or a body scanner.

- Formats: `.glb`, `.gltf` (embedded), `.obj`, `.ply`, `.stl`. Turn off Draco/Meshopt compression when exporting.
- The scan is stood upright, scaled (enter the person's real height for best accuracy) and sliced into cross-sections. Circumferences come from the convex hull of each slice, the way a tape measure sits on the body.
- Each measurement gets a confidence label (Good / Check / Rough). The person picks which ones to copy into their profile, then saves it.
- The scan is shown on the 3D stage (Scan / Compare / Avatar) with green rings where it was measured. Garments still fit to the parametric avatar, which now matches the scanned measurements.
- Privacy: the scan file never leaves the device and is dropped on reload. Only accepted measurements are saved.
- `samples/test-body.glb` is a synthetic test shape (not a real person) for trying the import. Expected: height 175, chest ≈ 95, waist ≈ 77, hip ≈ 101 cm.

## Changing the app name or icon

Edit `appName` / `appId` in `capacitor.config.json`. For a custom icon, add `@capacitor/assets`, put a 1024×1024 `icon.png` in `assets/`, and run `npx @capacitor/assets generate --android` before building.
