import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 520 } });
await p.goto('file:///tmp/real.html');
await p.waitForFunction(() => !!(window).__game, { timeout: 15000 });
await p.evaluate(() => { (window).__game.startLevel(11); });
await p.waitForTimeout(1300);
await p.evaluate(() => {
  const g=(window).__game; const ring=g.level.swingRings[0];
  const px=ring.col*32+16, py=ring.row*32; const ang=0.5*Math.sin(g.levelFrame*0.05);
  g.player.x = px+ring.len*Math.sin(ang)-g.player.width/2; g.player.y = py+ring.len*Math.cos(ang);
  g.player.onGround=false; g.player.isSwinging=true; g.player.swingRingIndex=0; g.player.swingDir=1;
});
const startX = await p.evaluate(()=>Math.round((window).__game.player.x/32));
await p.waitForTimeout(3600); // > 180 Frames → Auto-Loslassen + Flug
const end = await p.evaluate(()=>{ const g=(window).__game; return { col:Math.round(g.player.x/32), swinging:g.player.isSwinging, onGround:g.player.onGround, dead:g.player.isDead }; });
await b.close();
console.log('startCol', startX, '| after auto-release:', JSON.stringify(end));
