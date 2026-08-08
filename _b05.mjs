import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
let c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click(); await p.waitForTimeout(200);
let lvl = await p.$(`[aria-label^="Level 1:"]`); if (lvl) await lvl.click(); await p.waitForTimeout(1500);
// Trigger level complete + push an achievement toast, then screenshot
await p.evaluate(()=>{ const g=window.__game; g.levelIntroFramesRemaining=0;
  // fire an achievement toast via the bus if available
  try { window.dispatchEvent(new CustomEvent('achievement',{detail:{id:'coin_collector'}})); } catch(e){}
});
// force level complete
await p.evaluate(()=>{ const g=window.__game; if(g.completeLevel) g.completeLevel(); else { g.setState && g.setState('level_complete'); } });
await p.waitForTimeout(400);
// also inject a toast directly into React state is hard; instead check the panel + any toast
await p.screenshot({path:'/tmp/jg/b05_complete.png'});
const info = await p.evaluate(()=>({state:window.__game?.state, title:document.querySelector('[data-testid="levelcomplete-overlay"]')?.textContent?.slice(0,30), toast:!!document.querySelector('[data-testid="achievement-toast-stack"]')}));
console.log(JSON.stringify(info));
await b.close();
