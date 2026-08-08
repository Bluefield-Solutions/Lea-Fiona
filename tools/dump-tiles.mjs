import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 520 } });
await p.goto('file:///tmp/real.html');
await p.waitForFunction(() => !!(window).__game, { timeout: 15000 });
await p.evaluate(() => { (window).__game.startLevel(11); });
await p.waitForTimeout(400);
const grid = await p.evaluate(() => {
  const g = (window).__game; const t = g.level.tiles; const out = [];
  for (let r = 7; r <= 13; r++) { let line = 'r'+r+': '; for (let c = 40; c <= 52; c++) line += String(t[r][c]).padStart(3,' '); out.push(line); }
  return out.join('\n');
});
console.log('cols 40..52:\n' + grid);
await b.close();
