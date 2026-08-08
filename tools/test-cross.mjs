import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 520 } });
await p.goto('file:///tmp/real.html');
await p.waitForFunction(() => !!(window).__game, { timeout: 15000 });
await p.evaluate(() => { (window).__game.startLevel(11); });
await p.waitForTimeout(1400);

// A) Überquerung: laufen + springen (+ hoch/rechts halten) von col 146.
await p.evaluate(() => {
  const g = (window).__game;
  g.player.x = 146 * 32; g.player.y = (13 - 2) * 32; g.player.velX = 0; g.player.velY = 0;
});
async function hold(keys, ms) {
  await p.evaluate((keys) => { const g=(window).__game; for (const k of keys) g.input.keys.set(k, true); }, keys);
  await p.waitForTimeout(ms);
}
async function release(keys){ await p.evaluate((keys)=>{const g=(window).__game; for(const k of keys) g.input.keys.set(k,false);}, keys); }
// laufen nach rechts, springen pulsen
for (let i = 0; i < 6; i++) {
  await hold(['ArrowRight','Shift','ArrowUp'], 260);
  await release(['ArrowUp']);
  await p.waitForTimeout(120);
}
const cross = await p.evaluate(() => { const g=(window).__game; return { x: Math.round(g.player.x/32), lives: g.player.lives, dead: g.player.isDead }; });

// B) In die Grube fallen → am Seil hochklettern.
await release(['ArrowRight','Shift']);
await p.evaluate(() => { const g=(window).__game; g.player.x = 151*32 - g.player.width/2; g.player.y = (13)*32; g.player.velX=0; g.player.velY=0; });
await p.waitForTimeout(400); // fällt auf Grubenboden
const fell = await p.evaluate(() => { const g=(window).__game; return { row: Math.round(g.player.y/32), dead: g.player.isDead, onRope: g.player.onRope }; });
await hold(['ArrowUp'], 700); // hochklettern
const outY = await p.evaluate(() => { const g=(window).__game; return { row: Math.round(g.player.y/32), climbing: g.player.isClimbing }; });
await b.close();
console.log('CROSS:', JSON.stringify(cross), '| FELL:', JSON.stringify(fell), '| CLIMB-OUT:', JSON.stringify(outY));
