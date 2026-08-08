/**
 * App-Icon-Generator (iPhone-Paket): rendert ein kindgerechtes Home-Screen-Icon
 * für „Lea und Fiona im Abenteuerland" via Chromium (Playwright) in mehreren
 * Größen (180 apple-touch, 192, 512) und legt die base64-Inline-Fassung ab.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const OUT = 'iphone-app';
mkdirSync(OUT, { recursive: true });

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8ec9ff"/><stop offset="0.55" stop-color="#c9a7ff"/><stop offset="1" stop-color="#ffc2dd"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.36" r="0.6">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff3b0"/><stop offset="0.5" stop-color="#ffd23f"/><stop offset="1" stop-color="#f39c12"/>
    </linearGradient>
    <linearGradient id="heart" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff8fae"/><stop offset="1" stop-color="#ff466e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#sky)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  <path d="M0 430 Q140 380 270 420 T512 408 V512 H0 Z" fill="#8ad06a"/>
  <path d="M0 462 Q160 420 300 452 T512 448 V512 H0 Z" fill="#6bbd52"/>
  <g fill="#ffffff" opacity="0.9">
    <circle cx="96" cy="120" r="7"/><circle cx="420" cy="96" r="9"/><circle cx="150" cy="70" r="5"/><circle cx="380" cy="180" r="5"/>
  </g>
  <g transform="translate(256 244)">
    <path transform="scale(1.02)" d="M0,-118 L34,-38 L120,-38 L50,14 L78,98 L0,48 L-78,98 L-50,14 L-120,-38 L-34,-38 Z"
          fill="url(#gold)" stroke="#e08a10" stroke-width="7" stroke-linejoin="round"/>
    <path d="M-14,-70 L-2,-70 L-30,4 L-46,-8 Z" fill="#ffffff" opacity="0.65"/>
    <circle cx="-30" cy="-12" r="10" fill="#fff" opacity="0.55"/>
  </g>
  <g transform="translate(372 330)">
    <path d="M0,10 C-14,-8 -44,-2 -44,20 C-44,42 0,64 0,64 C0,64 44,42 44,20 C44,-2 14,-8 0,10 Z"
          fill="url(#heart)" stroke="#e23b60" stroke-width="4" stroke-linejoin="round" transform="scale(0.9)"/>
  </g>
</svg>`;
writeFileSync(`${OUT}/icon.svg`, svg);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const sizes = [ ['apple-touch-icon.png',180], ['icon-192.png',192], ['icon-512.png',512] ];
for (const [name, size] of sizes) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset=utf8><style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px;overflow:hidden}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: `${OUT}/${name}`, clip: { x:0, y:0, width:size, height:size } });
  await page.close();
  console.log('  ✓', name, size);
}
await browser.close();
const b180 = readFileSync(`${OUT}/apple-touch-icon.png`);
writeFileSync(`${OUT}/apple-touch-icon-180.b64`, b180.toString('base64'));
console.log('180er base64 =', (b180.length/1024).toFixed(1), 'KB');
