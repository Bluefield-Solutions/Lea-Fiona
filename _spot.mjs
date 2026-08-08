import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(950);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
await p.waitForTimeout(180);
const lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click();
await p.waitForTimeout(1500);
const label=process.argv[2]||'x';
for (const [nm,col] of [['pipe',70],['moss',95]]){
  const cx=col*32-430;
  await p.evaluate((cx)=>{const g=window.__game;g.hitStopFrames=999999;g.levelIntroFramesRemaining=0;g.camera.x=cx;g.camera.targetX=cx;},cx);
  await p.waitForTimeout(130);
  await p.evaluate((cx)=>{const g=window.__game;g.hitStopFrames=999999;g.camera.x=cx;g.camera.targetX=cx;},cx);
  await p.waitForTimeout(80);
  await p.screenshot({ path:`/tmp/jg/${label}_${nm}.png` });
}
console.log('done '+label);
await b.close();
