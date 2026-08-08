import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1000);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
await p.waitForTimeout(300);
// on level select now. Check for [1] style labels in level card text.
const labels = await p.evaluate(()=>{
  const cards=[...document.querySelectorAll('[data-testid^="button-level-"]')];
  return cards.slice(0,3).map(c=>c.textContent.replace(/\s+/g,' ').trim().slice(0,40));
});
const before = await p.evaluate(()=>!!window.__game);
await p.keyboard.press('1'); await p.waitForTimeout(500);
const afterKey1 = await p.evaluate(()=>({gameStarted:!!window.__game, state:window.__game?.state}));
console.log('level card labels:', JSON.stringify(labels));
console.log('game before "1":', before, '| after "1":', JSON.stringify(afterKey1));
await b.close();
