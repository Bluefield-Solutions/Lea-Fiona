import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:false,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); await p.waitForTimeout(200);
const lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click(); await p.waitForTimeout(1500);
const r = await p.evaluate(()=>{
  const g=window.__game; g.levelIntroFramesRemaining=0;
  const koopasBefore = g.entities.filter(e=>e.type==='koopa').length;
  // "shoot" all koopas dead
  g.entities.forEach(e=>{ if(e.type==='koopa') e.alive=false; });
  const koopasAfterKill = g.entities.filter(e=>e.type==='koopa'&&e.alive).length;
  // simulate player death → respawn (lives>0)
  g.player.lives = 3;
  g.player.isDead = true; g.player.deathTimer = 91;
  return {koopasBefore, koopasAfterKill};
});
// let the death→respawn cycle run
await p.waitForTimeout(400);
const after = await p.evaluate(()=>{
  const g=window.__game;
  return {state:g.state, koopasAliveAfterRespawn: g.entities.filter(e=>e.type==='koopa'&&e.alive).length, playerX:Math.round(g.player.x)};
});
console.log('before kill:', r.koopasBefore, '| after kill (alive):', r.koopasAfterKill);
console.log('after death+respawn:', JSON.stringify(after));
await b.close();
