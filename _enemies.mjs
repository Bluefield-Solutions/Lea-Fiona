import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : [1,2,3,4,5,6,7,8,9,10,11,12,13];
for (const w of only){
  await p.goto('file:///tmp/real.html'); await p.waitForTimeout(950);
  const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
  await p.waitForTimeout(180);
  const lvl = await p.$(`[aria-label^="Level ${w}:"]`); if (lvl) await lvl.click();
  await p.waitForTimeout(1500);
  const meta = await p.evaluate(()=>{
    const g=window.__game; g.levelIntroFramesRemaining=0;
    const collect=new Set(['coin','coin_spinning','special_coin','powerup','star','fire_flower','coin_magnet','cape','shield','clock','moving_platform','spring_stone','crate','p_switch','door','flag','flag_pole','particle','floating_text','player_fireball']);
    const foes=g.entities.filter(e=>e.alive&&!collect.has(e.type));
    if(!foes.length) return {none:true};
    // pick a foe around the middle of the pack
    const foe=foes[Math.min(2,foes.length-1)];
    g.player.x=foe.x-140; g.player.y=foe.y-32; g.player.velX=0; g.player.velY=0;
    const cx=foe.x-450; g.camera.x=cx; g.camera.targetX=cx;
    const types=[...new Set(foes.map(e=>e.type))];
    return {foeX:Math.round(foe.x), foeType:foe.type, types};
  });
  if (meta.none){ console.log('w'+w,'no foes'); continue; }
  for (let i=0;i<7;i++){ await p.waitForTimeout(85); await p.screenshot({path:`/tmp/mo/en_w${w}_${i}.png`}); }
  console.log('w'+w, meta.foeType, 'types:', meta.types.join(','));
}
await b.close();
