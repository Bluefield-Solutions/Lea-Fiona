import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
for (const w of [11,12]){
  await p.goto('file:///tmp/real.html'); await p.waitForTimeout(900);
  const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
  await p.waitForTimeout(180);
  const lvl = await p.$(`[aria-label^="Level ${w}:"]`); if (lvl) await lvl.click();
  await p.waitForTimeout(1200);
  const info = await p.evaluate(()=>{const L=window.__game.level; return {cape:L.capeBlocks, magnet:L.magnetBlocks, clock:L.clockBlocks, shield:L.shieldBlocks, super:L.superBlocks, heart:L.heartBlocks};});
  console.log('w'+w, JSON.stringify(info));
}
await b.close();
