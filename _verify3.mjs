import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });

// --- B-01: pause resume (desktop) ---
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
let c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); await p.waitForTimeout(200);
let lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click(); await p.waitForTimeout(1600);
const cv = await p.$('canvas'); if(cv) await cv.click({position:{x:450,y:400}}); await p.waitForTimeout(100);
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
const paused = await p.evaluate(()=>window.__game.state);
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
const resumed = await p.evaluate(()=>window.__game.state);
console.log('B-01: after 1x Esc =', paused, '| after 2x Esc =', resumed, resumed==='playing'?'✅ RESUME':'❌');
await p.close();

// --- B-02: sign text adapts on mobile emulation ---
const ctx = await b.newContext({ viewport:{width:844,height:390}, isMobile:true, hasTouch:true, userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
const m = await ctx.newPage();
await m.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await m.goto('file:///tmp/real.html'); await m.waitForTimeout(1200);
c = await m.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); await m.waitForTimeout(250);
lvl = await m.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click(); await m.waitForTimeout(1600);
const isMob = await m.evaluate(()=>({isMobile:window.__game?.input?.isMobile, sign0:window.__game?.level?.signs?.[0]?.lines}));
// render adaptation happens at draw; test the helper result by checking isMobile flag
console.log('B-02: input.isMobile =', isMob.isMobile, '| raw sign0 =', JSON.stringify(isMob.sign0));
await m.screenshot({path:'/tmp/jg/mobile_sign.png'});
await ctx.close();
await b.close();
