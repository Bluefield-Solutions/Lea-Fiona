import { chromium } from 'playwright';
// Sweep every level at 2 camera columns for a coherence audit.
const LEVELS = [
  { i: 0,  name: 'jungle',     cols: [30, 90] },
  { i: 1,  name: 'cave',       cols: [30, 90] },
  { i: 2,  name: 'sky',        cols: [30, 90] },
  { i: 3,  name: 'beach',      cols: [30, 90] },
  { i: 4,  name: 'australia',  cols: [20, 70, 120] },
  { i: 5,  name: 'volcano',    cols: [30, 90] },
  { i: 6,  name: 'ice',        cols: [30, 90] },
  { i: 7,  name: 'castle',     cols: [30, 90] },
  { i: 8,  name: 'underwater', cols: [30, 90] },
  { i: 9,  name: 'space',      cols: [30, 90] },
  { i: 10, name: 'school',     cols: [30, 90] },
  { i: 11, name: 'trampoline', cols: [30, 90] },
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
await page.goto('file:///tmp/real.html');
await page.waitForFunction(() => !!(window).__game, { timeout: 15000 });

for (const lv of LEVELS) {
  await page.evaluate((i) => { (window).__game.startLevel(i); }, lv.i);
  await page.waitForTimeout(350);
  for (const col of lv.cols) {
    await page.evaluate((col) => {
      const g = (window).__game;
      g.levelIntroFramesRemaining = 0;
      g.hitStopFrames = 999999;
      if (g.player) g.player.x = col * 32;
      const cx = col * 32 - 450 + 16;
      g.camera.x = cx; g.camera.targetX = cx;
    }, col);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `/tmp/aud_${lv.name}_${col}.png` });
  }
  console.log('done', lv.name);
}
await browser.close();
console.log('ALL DONE');
