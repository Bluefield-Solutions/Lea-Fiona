// Rendert die iPhone-Splash-Screens EINMAL lokal (Playwright) nach brand-splash/.
// Diese PNGs werden committet, damit der CI-Build (GitHub Actions) KEINEN Browser
// braucht — tools/build-webapp.mjs kopiert sie nur noch.
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
import { DEVICES, ORIENTATIONS, splashSvg, splashFileName, splashPixels } from './webapp-devices.mjs';

const OUT = 'brand-splash';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/splash`, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
for (const d of DEVICES) {
  for (const orient of ORIENTATIONS) {
    const [w, h] = splashPixels(d, orient);
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><meta charset=utf8><style>*{margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden}svg{display:block}</style>${splashSvg(w, h)}`);
    await page.screenshot({ path: `${OUT}/${splashFileName(d, orient)}`, clip: { x: 0, y: 0, width: w, height: h } });
    await page.close();
  }
}
await browser.close();
console.log(`Splash-Screens gerendert nach ${OUT}/splash (${DEVICES.length} Geräte × ${ORIENTATIONS.length}).`);
