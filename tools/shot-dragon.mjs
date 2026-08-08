import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
await page.goto('file:///tmp/real.html');
await page.waitForFunction(() => !!(window).__game, { timeout: 15000 });
await page.evaluate(() => (window).__game.startLevel(15));
await page.waitForTimeout(1600);

async function shot(name, camX, opts = {}) {
  await page.evaluate(({ camX, opts }) => {
    const g = (window).__game;
    g.levelIntroFramesRemaining = 0;
    g.hitStopFrames = 999999;
    g.camera.x = camX; g.camera.targetX = camX;
    // Boss finden
    const boss = g.entities.find((e) => e && e.constructor && /Boss/.test(e.constructor.name)
      || (e && e.type === 'boss'));
    if (boss) {
      if (opts.roar) boss.windupTimer = 12;
      if (opts.hp != null) boss.hp = opts.hp;
      if (opts.dir != null) boss.direction = opts.dir;
    }
    if (opts.px != null && g.player) g.player.x = opts.px;
  }, { camX, opts });
  await page.waitForTimeout(220);
  await page.screenshot({ path: `/tmp/dragon_${name}.png` });
  console.log('shot', name);
}

await shot('cave_mid', 55 * 32 - 450, { px: 55 * 32 });      // Höhlen-Atmosphäre mittig
await shot('boss_walk', 150 * 32 - 450, { px: 140 * 32 });     // Boss läuft
await shot('boss_roar', 150 * 32 - 450, { roar: true, px: 140 * 32 });  // Boss brüllt
await shot('boss_phase', 150 * 32 - 450, { hp: 1, roar: true, px: 140 * 32 }); // Wut-Phase
await browser.close();
console.log('DONE');
