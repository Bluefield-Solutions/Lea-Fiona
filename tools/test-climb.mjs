import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 520 } });
await p.goto('file:///tmp/real.html');
await p.waitForFunction(() => !!(window).__game, { timeout: 15000 });
await p.evaluate(() => { (window).__game.startLevel(11); });
await p.waitForTimeout(1400);

// Spieler an den Seilfuß (col 170) setzen.
const start = await p.evaluate(() => {
  const g = (window).__game;
  g.player.x = 170 * 32 - g.player.width / 2;
  g.player.y = (13 - 2) * 32; g.player.velX = 0; g.player.velY = 0;
  const cx = 170 * 32 - 450 + 16; g.camera.x = cx; g.camera.targetX = cx; g.camera.y = 0;
  return { y: g.player.y };
});
// Hoch drücken (klettern).
await p.evaluate(() => { (window).__game.input.keys.set('ArrowUp', true); });
await p.waitForTimeout(650);
const mid = await p.evaluate(() => {
  const g = (window).__game;
  return { y: Math.round(g.player.y), climbing: g.player.isClimbing, onRope: g.player.onRope };
});
await p.evaluate(() => { const g=(window).__game; g.camera.x = 170*32-450+16; g.camera.targetX=170*32-450+16; g.camera.y=0; });
await p.waitForTimeout(60);
await p.screenshot({ path: '/tmp/climb_up.png' });
// Loslassen nach unten.
await p.evaluate(() => { const g=(window).__game; g.input.keys.set('ArrowUp', false); g.input.keys.set('ArrowDown', true); });
await p.waitForTimeout(500);
const down = await p.evaluate(() => { const g=(window).__game; return { y: Math.round(g.player.y), climbing: g.player.isClimbing }; });
await b.close();
console.log('start.y', start.y, '| after UP:', JSON.stringify(mid), '| after DOWN:', JSON.stringify(down));
