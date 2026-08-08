import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1100);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
await p.waitForTimeout(220);
const lvl = await p.$(`[aria-label^="Level 13:"]`); if (lvl) await lvl.click();
await p.waitForTimeout(1500);
for (const [name,col] of [['gkv_a',227],['gkv_b',238],['entrance',66]]){
  await p.evaluate((col)=>{const g=window.__game;g.hitStopFrames=999999;g.player.x=col*32;g.player.y=(13-2)*32;g.player.vx=0;g.player.vy=0;const cx=col*32-450;g.camera.x=cx;g.camera.targetX=cx;},col);
  await p.waitForTimeout(120);
  await p.evaluate((col)=>{const g=window.__game;g.hitStopFrames=999999;g.player.x=col*32;g.player.y=(13-2)*32;const cx=col*32-450;g.camera.x=cx;g.camera.targetX=cx;},col);
  await p.waitForTimeout(90);
  await p.screenshot({ path:`/tmp/p3/m2_${name}.png` });
}
console.log('done');
await b.close();
