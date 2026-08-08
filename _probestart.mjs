import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(950);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
await p.waitForTimeout(180);
const lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click();
await p.waitForTimeout(1400);
const r = await p.evaluate(()=>{
  const t=window.__game.level.tiles; const out=[];
  for(let col=8; col<=24; col++){ for(let row=8;row<=15;row++){ const v=t[row][col]; if(v) out.push(`${col},${row}=${v}`);} }
  return out;
});
console.log(JSON.stringify(r));
await b.close();
