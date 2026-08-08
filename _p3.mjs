import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
for (const w of [5,10]){
  await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1100);
  try { const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); } catch(e){}
  await p.waitForTimeout(220);
  const lvl = await p.$(`[aria-label^="Level ${w}:"]`); if (lvl) await lvl.click();
  await p.waitForTimeout(1500);
  const ok = await p.evaluate(()=>!!window.__game); if(!ok){ console.log('w'+w+' NOGAME'); continue; }
  const info = await p.evaluate(()=>({wpx: window.__game.level.width*32, camW: window.__game.camera.width, name: window.__game.level.name}));
  const maxX=Math.max(0, info.wpx-info.camW);
  const fracs=[0.1,0.3,0.5,0.7,0.9];
  for (let i=0;i<fracs.length;i++){
    const cx=Math.round(maxX*fracs[i]);
    await p.evaluate((cx)=>{const g=window.__game;g.hitStopFrames=999999;g.camera.x=cx;g.camera.targetX=cx;},cx);
    await p.waitForTimeout(140);
    await p.evaluate((cx)=>{const g=window.__game;g.hitStopFrames=999999;g.camera.x=cx;g.camera.targetX=cx;},cx);
    await p.waitForTimeout(90);
    await p.screenshot({ path:`/tmp/p3/w${w}_${i}.png` });
  }
  console.log('w'+w, info.name, 'done', 'maxX='+maxX);
}
await b.close();
