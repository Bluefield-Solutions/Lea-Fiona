import { chromium } from 'playwright';
const T = 32;
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
await page.goto('file:///tmp/real.html');
await page.waitForFunction(() => !!(window).__game, { timeout: 15000 });
await page.evaluate(() => { (window).__game.startLevel(12); });
await page.waitForTimeout(400);

for (const col of [177, 206, 210, 213, 216, 250]) {
  const info = await page.evaluate((col) => {
    const g = (window).__game;
    g.levelIntroFramesRemaining = 0;
    g.hitStopFrames = 999999;
    const cx = col * 32 - 450 + 16;
    if (g.player) g.player.x = col * 32;
    g.camera.x = cx; g.camera.targetX = cx;
    return { setCx: cx };
  }, col);
  await page.waitForTimeout(240);
  const back = await page.evaluate((W) => {
    const g = (window).__game;
    const camMid = (g.camera.x + W * 0.5) / 32;
    return { camX: Math.round(g.camera.x), camMid: +camMid.toFixed(2) };
  }, 900);
  await page.screenshot({ path: `/tmp/dg_${col}.png` });
  console.log('col', col, 'setCx', info.setCx, '-> camX', back.camX, 'camMid', back.camMid);
}
await browser.close();
console.log('DONE');
