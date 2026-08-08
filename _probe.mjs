import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); await p.waitForTimeout(200);
const lvl = await p.$(`[aria-label^="Level 5:"]`); if (lvl) await lvl.click(); await p.waitForTimeout(1400);
const r = await p.evaluate(()=>{
  const g=window.__game; const t=g.level.tiles; const gr=13; const out=[];
  for(let c=44;c<=82;c++){ out.push(c+':'+ (t[gr][c]||0)); }
  return out.join(' ');
});
console.log('baseRow(13) tiles cols44-82 (1=GROUND,2=GROUND_TOP,0=empty):');
console.log(r);
await b.close();
