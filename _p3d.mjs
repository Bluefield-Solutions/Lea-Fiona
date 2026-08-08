import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1100);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
await p.waitForTimeout(220);
const lvl = await p.$(`[aria-label^="Level 5:"]`); if (lvl) await lvl.click();
await p.waitForTimeout(1500);
await p.evaluate(()=>{const g=window.__game;const cp=g.checkpointDrawPos;g.player.x=cp.x-120;g.player.y=cp.y+cp.poleHeight-g.player.height;g.checkpointActive=true;});
for(let i=0;i<25;i++){ await p.waitForTimeout(30); }
await p.evaluate(()=>{const g=window.__game;g.hitStopFrames=999999;});
await p.waitForTimeout(120);
await p.screenshot({ path:`/tmp/p3/fix_w5_active.png` });
await b.close();
