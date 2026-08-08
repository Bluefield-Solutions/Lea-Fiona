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
    const boss = g.entities.find((e) => e && e.constructor && /Boss/.test(e.constructor.name));
    if (boss) {
      if (opts.roar) boss.windupTimer = 12;
      if (opts.hp != null) boss.hp = opts.hp;
    }
    if (opts.px != null && g.player) g.player.x = opts.px;
  }, { camX, opts });
  await page.waitForTimeout(200);
  if (opts.hitbox) {
    // Trefferbox des Bosses als rotes Rechteck über das gerenderte Bild zeichnen.
    await page.evaluate(({ camX }) => {
      const g = (window).__game;
      const boss = g.entities.find((e) => e && e.constructor && /Boss/.test(e.constructor.name));
      if (!boss) return;
      const ctx = g.renderer.ctx;
      ctx.save();
      ctx.strokeStyle = 'red'; ctx.lineWidth = 2;
      ctx.strokeRect(boss.x - g.camera.x, boss.y - g.camera.y, boss.width, boss.height);
      ctx.restore();
    }, { camX });
  }
  await page.screenshot({ path: `/tmp/dh_${name}.png` });
  console.log('shot', name);
}

await shot('roar', 150 * 32 - 450, { roar: true, px: 140 * 32 });
await shot('walk_box', 150 * 32 - 450, { px: 140 * 32, hitbox: true });
await browser.close();
console.log('DONE');
