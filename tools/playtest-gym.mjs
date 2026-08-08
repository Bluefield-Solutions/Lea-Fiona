import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 520 } });
await p.goto('file:///tmp/real.html');
await p.mouse.click(450, 300);
await p.waitForFunction(() => !!(window).__game, { timeout: 15000 });
await p.evaluate(() => { (window).__game.startLevel(11); });
await p.waitForTimeout(1300);
let maxCol = 0, deaths = 0, lastCol = 3, stalls = 0;
await p.keyboard.down('ArrowRight'); await p.keyboard.down('Shift');
for (let i=0;i<90;i++){
  // Sprung pulsen
  if (i%3===0){ await p.keyboard.down('Space'); }
  await p.waitForTimeout(90);
  if (i%3===0){ await p.keyboard.up('Space'); }
  const st = await p.evaluate(()=>{ const g=(window).__game; return { col: Math.round(g.player.x/32), lives: g.player.lives, dead: g.player.isDead, y: Math.round(g.player.y/32) }; });
  if (st.col > maxCol) maxCol = st.col;
  if (Math.abs(st.col - lastCol) < 1 && st.col < 148) stalls++;
  lastCol = st.col;
  if (st.dead || st.y > 20) { deaths++; }
}
const fin = await p.evaluate(()=>{ const g=(window).__game; return { lives:g.player.lives, col:Math.round(g.player.x/32) }; });
await b.close();
console.log('maxCol', maxCol, '| final', JSON.stringify(fin), '| stall-ticks', stalls);
