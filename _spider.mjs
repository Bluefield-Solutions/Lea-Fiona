import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); await p.waitForTimeout(200);
const lvl = await p.$(`[aria-label^="Level 11:"]`); if (lvl) await lvl.click(); await p.waitForTimeout(1500);
// place player near the beat-6 spider (col 158) so it activates/drops; let it run a bit
await p.evaluate(()=>{const g=window.__game;g.levelIntroFramesRemaining=0;g.player.x=152*32;g.player.y=(13-2)*32;const cx=152*32-430;g.camera.x=cx;g.camera.targetX=cx;});
for(let i=0;i<8;i++){ await p.waitForTimeout(70); }
const info = await p.evaluate(()=>{const g=window.__game; const sp=g.entities.filter(e=>e.type==='spider').map(e=>({col:Math.round(e.x/32),active:e.active,dropping:e.dropping,web:Math.round(e.webLength||0)})); return {spiders:sp};});
await p.evaluate(()=>{const g=window.__game;g.hitStopFrames=999999;});
await p.waitForTimeout(100);
await p.screenshot({path:'/tmp/jg/spider.png'});
console.log(JSON.stringify(info));
await b.close();
