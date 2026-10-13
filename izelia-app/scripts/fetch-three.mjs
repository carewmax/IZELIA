// Downloads three.js r128 into www/vendor so the 3D studio works offline in the app.
// If the download fails, the page falls back to the CDN copy when online.
import { writeFile, mkdir } from 'node:fs/promises';
const url = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await mkdir('www/vendor', { recursive: true });
  await writeFile('www/vendor/three.min.js', Buffer.from(await res.arrayBuffer()));
  console.log('three.js saved to www/vendor/three.min.js');
} catch (e) {
  console.warn(`Could not download three.js (${e.message}). The app will load it from the CDN when online.`);
}
