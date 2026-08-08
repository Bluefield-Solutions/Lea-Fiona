import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
for (const w of [5,10]){
  await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1100);
  const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
  await p.waitForTimeout(220);
  const lvl = await p.$(`[aria-label^="Level ${w}:"]`); if (lvl) await lvl.click();
  await p.waitForTimeout(1500);
  // Teleport player to just left of the checkpoint column, let camera follow.
  await p.evaluate(()=>{const g=window.__game;const cp=g.checkpointDrawPos;g.player.x=cp.x-120;g.player.y=cp.y+cp.poleHeight-g.player.height;g.player.vx=0;g.player.vy=0;});
  for(let i=0;i<30;i++){ await p.waitForTimeout(30); }
  await p.evaluate(()=>{const g=window.__game;g.hitStopFrames=999999;});
  await p.waitForTimeout(120);
  const info = await p.evaluate(()=>{const g=window.__game;return {cp:g.checkpointDrawPos, camx:Math.round(g.camera.x), camy:Math.round(g.camera.y), active:g.checkpointActive};});
  console.log('w'+w, JSON.stringify(info));
  await p.screenshot({ path:`/tmp/p3/fix_w${w}.png` });
}
await b.close();
