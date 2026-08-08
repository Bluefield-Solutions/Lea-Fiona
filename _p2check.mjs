import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
const jobs=[{w:11,col:124},{w:12,col:58},{w:10,col:103},{w:9,col:97}];
for (const j of jobs){
  await p.goto('file:///tmp/real.html'); await p.waitForTimeout(900);
  const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
  await p.waitForTimeout(180);
  const lvl = await p.$(`[aria-label^="Level ${j.w}:"]`); if (lvl) await lvl.click();
  await p.waitForTimeout(1200);
  const cx=j.col*32-430;
  await p.evaluate((cx)=>{const g=window.__game;g.hitStopFrames=999999;g.camera.x=cx;g.camera.targetX=cx;},cx);
  await p.waitForTimeout(140);
  await p.evaluate((cx)=>{const g=window.__game;g.hitStopFrames=999999;g.camera.x=cx;g.camera.targetX=cx;},cx);
  await p.waitForTimeout(90);
  await p.screenshot({ path:`/tmp/p3/p2_w${j.w}.png` });
}
console.log('done');
await b.close();
