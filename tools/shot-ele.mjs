import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
await page.goto('file:///tmp/real.html');
await page.waitForFunction(() => !!(window).__game, { timeout: 15000 });
await page.evaluate(() => (window).__game.startLevel(1));
await page.waitForTimeout(1500);

const poses = [
  { name: '0_idle',  velY: 0,  isJumping: false, isDucking: false, velX: 0,   isRunning: false },
  { name: '1_walk',  velY: 0,  isJumping: false, isDucking: false, velX: 2,   isRunning: false },
  { name: '5_up',    velY: -6, isJumping: true,  isDucking: false, velX: 1,   isRunning: false },
  { name: '6_apex',  velY: 0,  isJumping: true,  isDucking: false, velX: 1,   isRunning: false },
  { name: '7_fall',  velY: 6,  isJumping: true,  isDucking: false, velX: 1,   isRunning: false },
  { name: '8_duck',  velY: 0,  isJumping: false, isDucking: true,  velX: 0,   isRunning: false },
];
for (const p of poses) {
  await page.evaluate((p) => {
    const g = (window).__game;
    g.levelIntroFramesRemaining = 0;
    g.hitStopFrames = 999999;      // Physik einfrieren
    const pl = g.player;
    pl.hasFire = true;             // Elefant-Form erzwingen
    pl.velY = p.velY; pl.velX = p.velX;
    pl.isJumping = p.isJumping; pl.isDucking = p.isDucking; pl.isRunning = p.isRunning;
    pl.landingFrame = 0;
    // Kamera auf Spieler zentrieren
    const cx = pl.x - 450 + pl.width / 2;
    g.camera.x = cx; g.camera.targetX = cx;
  }, p);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `/tmp/ele_${p.name}.png` });
  console.log('shot', p.name);
}
await browser.close();
console.log('DONE');
