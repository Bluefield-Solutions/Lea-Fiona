import { chromium } from 'playwright';

const TILE = 32;
const shots = [
  { name: 'labor',      col: 40 },
  { name: 'door1_u1',   col: 71 },
  { name: 'u1_hero',    col: 106 },
  { name: 'door2_ms',   col: 142 },
  { name: 'matchsuite', col: 177 },
  { name: 'door3_go',   col: 213 },
  { name: 'golive1',    col: 250 },
  { name: 'golive2',    col: 274 },
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE-ERR', m.text()); });

await page.goto('file:///tmp/real.html');
await page.waitForFunction(() => !!(window).__game, { timeout: 15000 });
// Start Bluefield (index 12), bypassing unlock gate.
await page.evaluate(() => { (window).__game.startLevel(12); });
await page.waitForTimeout(400);

for (const s of shots) {
  await page.evaluate((col) => {
    const g = (window).__game;
    g.levelIntroFramesRemaining = 0;
    g.hitStopFrames = 999999;
    const cx = col * 32 - 450 + 16;
    g.camera.x = cx; g.camera.targetX = cx;
  }, s.col);
  await page.waitForTimeout(260);
  await page.screenshot({ path: `/tmp/bf_${s.name}.png` });
  console.log('shot', s.name, '@col', s.col);
}
await browser.close();
console.log('DONE');
