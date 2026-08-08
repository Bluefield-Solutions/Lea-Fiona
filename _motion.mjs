import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
await p.waitForTimeout(200);
const lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click();
await p.waitForTimeout(1600);
await p.evaluate(()=>{const g=window.__game; if(g) g.levelIntroFramesRemaining=0;});
// focus canvas
const canvas = await p.$('canvas'); if(canvas) await canvas.click({position:{x:450,y:400}});
await p.waitForTimeout(100);
// RUN right
await p.keyboard.down('Shift');
await p.keyboard.down('ArrowRight');
let n=0;
for (let i=0;i<10;i++){ await p.waitForTimeout(70); await p.screenshot({path:`/tmp/mo/run_${n++}.png`}); }
// JUMP while running
await p.keyboard.down('ArrowUp');
for (let i=0;i<8;i++){ await p.waitForTimeout(70); await p.screenshot({path:`/tmp/mo/jump_${i}.png`}); }
await p.keyboard.up('ArrowUp');
for (let i=0;i<6;i++){ await p.waitForTimeout(70); await p.screenshot({path:`/tmp/mo/land_${i}.png`}); }
await p.keyboard.up('ArrowRight'); await p.keyboard.up('Shift');
const st = await p.evaluate(()=>({x:Math.round(window.__game.player.x), vx:window.__game.player.vx.toFixed(2), onGround:window.__game.player.onGround, state:window.__game.state}));
console.log('player', JSON.stringify(st));
await b.close();
