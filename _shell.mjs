import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); await p.waitForTimeout(200);
const lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click(); await p.waitForTimeout(1500);
await p.evaluate(()=>{
  const g=window.__game; g.levelIntroFramesRemaining=0;
  const k = g.entities.find(e=>e.type==='koopa'&&e.alive);
  // player next to the shell so it stays on-screen
  g.player.x = 57*32; g.player.y=(13-2)*32; g.player.velX=0; g.player.velY=0;
  k.x = 60*32; k.y = (13-2)*32; k.isShell=true; k.shellMoving=true; k.height=24; k.direction = 1;
});
// sample shell x + alive over time
let log=[];
for(let i=0;i<10;i++){
  await p.waitForTimeout(120);
  const s = await p.evaluate(()=>{ const g=window.__game; const k=g.entities.find(e=>e.type==='koopa'); return k? {x:Math.round(k.x), alive:k.alive, shell:k.isShell, moving:k.shellMoving} : {gone:true}; });
  log.push(s);
}
console.log(JSON.stringify(log));
await b.close();
