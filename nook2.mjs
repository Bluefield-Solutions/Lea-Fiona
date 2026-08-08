import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=swiftshader'] });
const pg = await b.newPage({ viewport:{width:900,height:520} });
await pg.goto('file://'+process.cwd()+'/dist-standalone/index.html');
await pg.waitForTimeout(900); await pg.mouse.click(450,300);
await pg.evaluate(()=>window.__game.startLevel(1));
await pg.waitForTimeout(400);
// stand under the ledge (col 122) on the ground and settle
await pg.evaluate(()=>{ const e=window.__game; e.player.x=122*32; e.player.y=12*32; e.player.velX=0; e.player.velY=0; if(e.camera)e.camera.x=116*32; });
await pg.waitForTimeout(400); // land on ground
const g = await pg.evaluate(()=>({onGround:window.__game.player.onGround, row:Math.round(window.__game.player.y/32*10)/10}));
// tap jump (hold ~250ms for full height)
await pg.keyboard.down('Space'); await pg.waitForTimeout(260); await pg.keyboard.up('Space');
let minRow=99, landed=false;
for(let i=0;i<50;i++){ await pg.waitForTimeout(28); const s=await pg.evaluate(()=>{const e=window.__game;return{row:Math.round(e.player.y/32*10)/10,onG:e.player.onGround,col:Math.round(e.player.x/32)};}); if(s.row<minRow)minRow=s.row; if(s.onG && s.row<10 && s.col>=119&&s.col<=127) landed=true; }
console.log('startOnGround',g,'jump apex row',minRow,'landedOnLedge',landed,'(ledge row 9)');
await pg.screenshot({path:'/home/claude/nook_final.png'});
await b.close();
