import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
let c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); await p.waitForTimeout(200);
let lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click(); await p.waitForTimeout(1500);
// B-04: spawn several +100 popups near the top of the screen via engine, unfrozen, screenshot
await p.evaluate(()=>{ const g=window.__game; g.levelIntroFramesRemaining=0;
  // place popups high on screen (small world y) near camera
  const camx=g.camera.x;
  for(let i=0;i<4;i++){ g.particles.push(g.acquireFloatingText(camx+300+i*4, g.camera.y+20, '+100')); }
});
await p.waitForTimeout(120);
await p.screenshot({path:'/tmp/jg/b04_popups.png'});
await b.close();
