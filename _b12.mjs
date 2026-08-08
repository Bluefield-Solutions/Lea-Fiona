import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:false,assistInvincible:false,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(1100);
// open settings from title
const gear = await p.$('[data-testid="button-settings"]') || await p.$('[aria-label*="instellung"]');
if(gear) await gear.click(); await p.waitForTimeout(400);
const hasToggle = await p.evaluate(()=>!!document.querySelector('[data-testid="toggle-unlock-all-worlds"]'));
const settingsVisible = await p.evaluate(()=>!!document.querySelector('[data-testid="settings-panel"],[data-testid="settings-overlay"]'));
console.log('B-12 (production standalone): settings open =', settingsVisible, '| test-toggle present =', hasToggle, hasToggle?'❌ still visible':'✅ hidden');
await b.close();
