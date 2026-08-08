import { chromium } from 'playwright';
const targets = JSON.parse(process.argv[2]); // [{i,name,cols:[...]}]
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
await page.goto('file:///tmp/real.html');
await page.waitForFunction(() => !!(window).__game, { timeout: 15000 });
for (const lv of targets) {
  await page.evaluate((i) => { (window).__game.startLevel(i); }, lv.i);
  await page.waitForTimeout(1500); // let the React intro card auto-dismiss (1200ms)
  for (const col of lv.cols) {
    await page.evaluate((col) => {
      const g = (window).__game;
      g.levelIntroFramesRemaining = 0;
      g.hitStopFrames = 999999;
      if (g.player) g.player.x = col * 32;
      const cx = col * 32 - 450 + 16;
      g.camera.x = cx; g.camera.targetX = cx;
    }, col);
    await page.waitForTimeout(220);
    await page.screenshot({ path: `/tmp/fx_${lv.name}_${col}.png` });
    console.log('shot', lv.name, col);
  }
}
await browser.close();
console.log('DONE');
