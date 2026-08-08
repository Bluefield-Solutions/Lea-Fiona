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

// Boss-Startzustand
const start = await page.evaluate(() => {
  const g = window.__game;
  g.levelIntroFramesRemaining = 0;
  g.hitStopFrames = 0;
  const b = g.entities.find(e => e && e.type === 'boss');
  return b ? { hp: b.hp, maxHp: b.maxHp, y: b.y, h: b.height, w: b.width } : null;
});
console.log('Boss Start:', JSON.stringify(start));

const hpLog = [];
for (let attempt = 0; attempt < 12; attempt++) {
  // Wenn der Boss treffbar ist (kein hitStun), die Figur als "fallenden Hammer"
  // mittig über den Kopf setzen und nach unten fallen lassen.
  await page.evaluate(() => {
    const g = window.__game;
    const b = g.entities.find(e => e && e.type === 'boss');
    if (!b || b.isDead) return;
    if (b.hitStun > 0) return;
    const p = g.player;
    p.invincibleTimer = 9999;         // Seiten-Treffer sollen den Test nicht stören
    p.x = b.x + b.width / 2 - p.width / 2;
    p.y = b.y - p.height - 2;         // knapp über dem Kopf
    p.velY = 7; p.velX = 0;
    p.onGround = false; p.isJumping = true;
  });
  await page.waitForTimeout(220);     // ~13 Frames fallen/abprallen lassen
  const st = await page.evaluate(() => {
    const g = window.__game;
    const b = g.entities.find(e => e && e.type === 'boss');
    return b ? { hp: b.hp, dead: b.isDead } : { gone: true };
  });
  hpLog.push(st);
  if (st.dead || st.gone) break;
}
console.log('Verlauf:', JSON.stringify(hpLog));
const final = hpLog[hpLog.length - 1];
console.log(final.dead || final.gone ? 'ERGEBNIS: Boss besiegt ✓' : 'ERGEBNIS: Boss NICHT besiegt ✗');
await browser.close();
console.log('DONE');
