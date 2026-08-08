import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:520} });
await p.addInitScript(()=>{ localStorage.setItem('lea_fiona_v2', JSON.stringify({version:2,profiles:[{id:'p_t',name:'Fiona',unlockedLevels:13,bestScores:[],bestTimes:[],totalCoins:0,stickers:[],settings:{unlockAllWorlds:true,assistInvincible:true,musicVolume:0,sfxVolume:0,quality:'high',screenShake:true}}],activeProfileId:'p_t'})); });
await p.goto('file:///tmp/real.html'); await p.waitForTimeout(900);
const c = await p.$('[aria-label="Figur Fiona"]'); if (c) await c.click();
await p.waitForTimeout(180);
const lvl = await p.$(`[aria-label^="Level 2:"]`); if (lvl) await lvl.click();
await p.waitForTimeout(1200);
const info = await p.evaluate(()=>({wpx: window.__game.level.width*32, camW: window.__game.camera.width}));
const maxX=Math.max(0, info.wpx-info.camW);
const cx=Math.round(maxX*0.88);
await p.evaluate((cx)=>{const g=window.__game;g.hitStopFrames=999999;g.camera.x=cx;g.camera.targetX=cx;},cx);
await p.waitForTimeout(140);
const r = await p.evaluate(()=>{
  const g=window.__game; const cam=g.camera;
  // screen x ~115 (block center), y ~410 -> world
  const zoom = cam.zoom||1;
  // worldToScreen inverse: approximate world = cam.x + screenX/zoom ; but use API
  // sample a few world cols around cam
  const startCol = Math.floor(cam.x/32);
  const out=[];
  for (let col=startCol; col<startCol+10; col++){
    const s = cam.worldToScreenInto(col*32, 12*32, {x:0,y:0});
    out.push({col, sx:Math.round(s.x)});
  }
  // entities near the visible-left ground
  const ents=[];
  for (const e of g.entities){ const s=cam.worldToScreenInto(e.x,e.y,{x:0,y:0}); if(s.x>-40&&s.x<300&&s.y>250) ents.push({type:e.type, col:Math.round(e.x/32), sx:Math.round(s.x), sy:Math.round(s.y)}); }
  // tiles at ground rows for visible-left cols
  const tinfo=[];
  for(let col=startCol; col<startCol+8; col++){ for(let row=10;row<=14;row++){ const t=g.level.tiles[row]&&g.level.tiles[row][col]; if(t) tinfo.push(`${col},${row}=${t}`);} }
  return {camx:Math.round(cam.x), zoom, colMap:out, ents, tinfo};
});
console.log(JSON.stringify(r,null,1));
await b.close();
