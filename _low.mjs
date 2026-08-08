import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
// desktop: char-select + level-select
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1100);
await p.screenshot({path:'/tmp/jg/low_charselect.png'});
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); await p.waitForTimeout(400);
await p.screenshot({path:'/tmp/jg/low_levelselect.png'});
const lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click(); await p.waitForTimeout(1500);
await p.evaluate(()=>{const g=window.__game;g.hitStopFrames=999999;g.levelIntroFramesRemaining=0;const cx=Math.round((g.level.width*32-g.camera.width)*0.28);g.camera.x=cx;g.camera.targetX=cx;});
await p.waitForTimeout(150); await p.screenshot({path:'/tmp/jg/low_sun.png'});
await p.close();
// mobile: stick hint
const ctx = await b.newContext({ viewport:{width:844,height:390}, isMobile:true, hasTouch:true });
const m = await ctx.newPage();
await m.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true,touchControl:'stick'}}],activeProfileId:'p_t'})); });
await m.goto('file:///tmp/real.html'); await m.waitForTimeout(1200);
let cc = await m.$('[aria-label="Figur Fiona"]'); if (cc) await cc.click(); await m.waitForTimeout(300);
let ll = await m.$(`[aria-label^="Level 1:"]`); if (ll) await ll.click(); await m.waitForTimeout(1600);
await m.screenshot({path:'/tmp/jg/low_stick.png'});
await ctx.close();
await b.close(); console.log('done');
