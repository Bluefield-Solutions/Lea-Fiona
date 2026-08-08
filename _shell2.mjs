import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); await p.waitForTimeout(200);
const lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click(); await p.waitForTimeout(1500);
const setup = await p.evaluate(()=>{
  const g=window.__game; g.levelIntroFramesRemaining=0;
  const k = g.entities.find(e=>e.type==='koopa'&&e.alive);
  k.__tag='WATCH'; g.player.x=57*32; g.player.y=(13-2)*32;
  k.x=60*32; k.y=(13-2)*32; k.isShell=true; k.shellMoving=true; k.height=24; k.direction=1;
  return {startX:Math.round(k.x)};
});
let result=null;
for(let i=0;i<14;i++){
  await p.waitForTimeout(90);
  const s = await p.evaluate(()=>{ const g=window.__game; const k=g.entities.find(e=>e.__tag==='WATCH'); return k?{x:Math.round(k.x),alive:k.alive}:{dead:true}; });
  if(s.dead){ result={vanished:true, atFrame:i}; break; }
  result={lastX:s.x, alive:s.alive};
}
console.log('shell start:', setup.startX, '(pipe wall ~col63=2016) →', JSON.stringify(result));
await b.close();
