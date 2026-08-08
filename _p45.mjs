import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
// school: capture the yard zone (right side, camMid > 146*32=4672). trampoline. sky.
const jobs=[
  {w:3, fracs:[0.2,0.5,0.8]},
  {w:11, fracs:[0.5,0.75,0.95]},  // yard is far right
  {w:12, fracs:[0.15,0.45,0.75]},
];
for (const j of jobs){
  await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1100);
  const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
  await p.waitForTimeout(220);
  const lvl = await p.$(`[aria-label^="Level ${j.w}:"]`); if (lvl) await lvl.click();
  await p.waitForTimeout(1500);
  const info = await p.evaluate(()=>({wpx: window.__game.level.width*32, camW: window.__game.camera.width}));
  const maxX=Math.max(0, info.wpx-info.camW);
  for (let i=0;i<j.fracs.length;i++){
    const cx=Math.round(maxX*j.fracs[i]);
    await p.evaluate((cx)=>{const g=window.__game;g.hitStopFrames=999999;g.camera.x=cx;g.camera.targetX=cx;},cx);
    await p.waitForTimeout(140);
    await p.evaluate((cx)=>{const g=window.__game;g.hitStopFrames=999999;g.camera.x=cx;g.camera.targetX=cx;},cx);
    await p.waitForTimeout(90);
    await p.screenshot({ path:`/tmp/p3/n_w${j.w}_${i}.png` });
  }
  console.log('w'+j.w,'done maxX='+maxX);
}
await b.close();
