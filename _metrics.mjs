import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
const rows=[];
for (let w=1; w<=13; w++){
  await p.goto('file:///tmp/real.html'); await p.waitForTimeout(900);
  const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
  await p.waitForTimeout(180);
  const lvl = await p.$(`[aria-label^="Level ${w}:"]`); if (lvl) await lvl.click();
  await p.waitForTimeout(1300);
  const m = await p.evaluate(()=>{
    const g=window.__game; const L=g.level;
    const byType={};
    for (const e of g.entities){ const t=e.type||'?'; byType[t]=(byType[t]||0)+1; }
    // enemies = anything that damages; approximate by excluding collectibles/platforms
    const collect=new Set(['coin','coin_spinning','special_coin','powerup','star','fire_flower','coin_magnet','cape','shield','clock','moving_platform','spring_stone','crate','p_switch','door','flag','flag_pole','particle','floating_text']);
    let enemies=0; for (const [t,n] of Object.entries(byType)){ if(!collect.has(t)) enemies+=n; }
    // gaps at ground row: count empty columns where ground tile is empty
    const tiles=L.tiles; const h=tiles.length; const wdt=tiles[0].length;
    // find ground row = the row index used most as solid near bottom; approximate ground=13
    const groundRow = Math.min(h-1, 13);
    let gapCols=0; for(let x=0;x<wdt;x++){ if(!tiles[groundRow][x]) gapCols++; }
    // powerup blocks: count QUESTION_BLOCK tiles (8)
    let qblocks=0, bricks=0, spikes=0; 
    for(let y=0;y<h;y++)for(let x=0;x<wdt;x++){const t=tiles[y][x]; if(t===8)qblocks++; else if(t===10)bricks++; else if(t===32)spikes++;}
    const coins=(byType['coin']||0)+(byType['coin_spinning']||0);
    return {name:L.name, width:wdt, enemies, byTypeKeys:Object.keys(byType).filter(t=>!collect.has(t)), coins, special:(byType['special_coin']||0), qblocks, bricks, spikes, gapCols, signs:(L.signs?L.signs.length:0)};
  });
  m.enemyDensity = +(m.enemies/(m.width/100)).toFixed(2); // enemies per 100 tiles
  rows.push({w, ...m});
  console.log(`w${w} ${m.name.padEnd(28)} width=${m.width} enem=${m.enemies}(${m.enemyDensity}/100) coins=${m.coins} spc=${m.special} qb=${m.qblocks} spikes=${m.spikes} gaps=${m.gapCols} signs=${m.signs} types=${m.byTypeKeys.join(',')}`);
}
import('fs').then(fs=>fs.writeFileSync('/tmp/metrics.json', JSON.stringify(rows,null,1)));
await b.close();
