import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1100);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
await p.waitForTimeout(220);
const lvl = await p.$(`[aria-label^="Level 13:"]`); if (lvl) await lvl.click();
await p.waitForTimeout(1500);
// Move player through the dense GKV cluster (cols ~225-248) and entrance (~col 60)
const spots = [
  {name:'entrance', col:60},
  {name:'gkv_werte', col:225},
  {name:'gkv_mid', col:237},
  {name:'gkv_live', col:248},
];
for (const s of spots){
  await p.evaluate((col)=>{const g=window.__game;g.player.x=col*32;g.player.y=(13-2)*32;g.player.vx=0;g.player.vy=0;},s.col);
  for(let i=0;i<28;i++){ await p.waitForTimeout(28); }
  await p.evaluate(()=>{const g=window.__game;g.hitStopFrames=999999;});
  await p.waitForTimeout(120);
  await p.screenshot({ path:`/tmp/p3/mini_${s.name}.png` });
}
console.log('done');
await b.close();
