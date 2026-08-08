import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:false,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
await p.waitForTimeout(200);
const lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click();
await p.waitForTimeout(1600);
// find first goomba, teleport player ~3 tiles above it, keep camera on it
const info = await p.evaluate(()=>{
  const g=window.__game; g.levelIntroFramesRemaining=0;
  const go=g.entities.find(e=>e.type==='goomba'&&e.alive);
  if(!go) return null;
  g.player.x=go.x-6; g.player.y=go.y-3*32; g.player.velY=0; g.player.velX=0;
  const cx=go.x-450; g.camera.x=cx; g.camera.targetX=cx;
  return {gx:Math.round(go.x), px:Math.round(g.player.x)};
});
console.log('setup', JSON.stringify(info));
for (let i=0;i<12;i++){ await p.waitForTimeout(55); await p.screenshot({path:`/tmp/mo/stomp_${i}.png`}); }
await b.close();
