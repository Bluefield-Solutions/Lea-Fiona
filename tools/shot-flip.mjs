import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 520 } });
await p.goto('file:///tmp/real.html');
await p.waitForFunction(() => !!(window).__game, { timeout: 15000 });
await p.evaluate(() => { (window).__game.startLevel(11); });
await p.waitForTimeout(1400);
// Position player centered at col 116 (a trampoline beat), freeze, force airborne.
for (const spin of [30, 22, 15, 8]) {
  await p.evaluate((spin) => {
    const g = (window).__game;
    g.levelIntroFramesRemaining = 0; g.hitStopFrames = 999999;
    const col = 116;
    g.player.x = col * 32; g.player.y = (13 - 6) * 32;   // in der Luft
    g.player.isJumping = true; g.player.velY = -4;
    g.player.flipSpin = spin; g.player.flipTotal = 30; g.player.flipDir = 1;
    const cx = col * 32 - 450 + 16; g.camera.x = cx; g.camera.targetX = cx; g.camera.y = 0;
  }, spin);
  await p.waitForTimeout(180);
  await p.screenshot({ path: `/tmp/flip_${spin}.png` });
  console.log('shot spin', spin);
}
await b.close();
console.log('DONE');
