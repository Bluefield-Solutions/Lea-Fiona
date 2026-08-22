// ─────────────────────────────────────────────────────────────────────────────
// PLAYER-VIEW QA — "Schau selbst als Spieler drauf"
//
// Warum: Ausschnitt-Screenshots des Boden-Bands verstecken genau die Fehler, die
// beim echten Spielen auffallen — schwebender „Boden in der Luft" beim HOCHSPRINGEN,
// nicht bündig ausgerichtete Kanten, chaotische Kulissen-Übergänge. Dieser Check
// spielt jedes Level wie ein Spieler an: springt an mehreren Stellen (inkl. der
// Abschnitts-Übergänge) hoch und macht VOLLE Frames am Sprung-Scheitel.
//
// Prozess-Regel (fix): Vor JEDEM Grafik-Bundle diesen Check laufen lassen und die
// erzeugten /tmp/pvqa_*.png selbst ansehen — Oberkante des Bildschirms auf
// schwebende Tiles prüfen, Kanten auf Bündigkeit, Übergänge auf harte Schnitte.
// Erst wenn das sauber ist, wird gebaut/gebündelt.
//
// Nutzung:
//   npm run build:standalone && cp dist-standalone/index.html /tmp/real.html
//   node tools/playerview-qa.mjs [levelIndex] [col,col,col...]
//   (Default: Level 18 „Stephans Urlaub", Sprünge an Alpen/Übergängen/Küste)
//
// Lernpunkte, die hier fest verdrahtet sind (sonst verfälschen sie die Sicht):
//  • Die React-Intro-Karte (data-testid="level-intro-card") wird per CSS versteckt
//    — sie stammt vom Initial-Mount (Level 0) und verdeckt sonst die Bildmitte.
//  • Ein echter Sprung: player.velY = -13, dann ~6 Frames testStep → Scheitelpunkt.
//  • Konsolen-/Page-Errors werden gesammelt und am Ende gemeldet (muss 0 sein).
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright';

const levelIndex = Number(process.argv[2] ?? 18);
// cols: entweder explizit ("45,90,150"), oder leer → automatisch aus der Level-
// Breite ableiten (6 Positionen gleichmäßig verteilt, Ränder ausgespart). So
// funktioniert der Check auf ALLEN Welten, egal wie breit.
const colsArg = process.argv[3];
const cols = colsArg ? colsArg.split(',').map(Number) : null;

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const pg = await b.newPage({ viewport: { width: 554, height: 369 }, deviceScaleFactor: 2 });
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push(String(e)));

await pg.goto('file:///tmp/real.html');
await pg.waitForFunction(() => window.__game, { timeout: 15000 });
const width = await pg.evaluate((idx) => { window.__game.startLevel(idx); for (let i = 0; i < 60; i++) window.__game.testStep(1); return window.__game.level?.width ?? 0; }, levelIndex);
// Intro-Karte (Test-Artefakt vom Initial-Mount) ausblenden
await pg.addStyleTag({ content: '[data-testid="level-intro-card"]{display:none!important;}' });
// Spalten automatisch aus der Level-Breite ableiten, falls nicht angegeben
const useCols = cols || Array.from({ length: 6 }, (_, k) => Math.round(width * (0.08 + 0.84 * k / 5)));

const shots = [];
for (const c of useCols) {
  await pg.evaluate((col) => {
    const g = window.__game;
    g.player.x = col * 32; g.player.velX = 0; g.player.velY = 0; g.player.invincibleTimer = 600;
    for (let i = 0; i < 18; i++) g.testStep(1);
  }, c);
  // echter Sprung → Scheitelpunkt (hier fällt „Boden in der Luft" auf)
  await pg.evaluate(() => { const g = window.__game; g.player.velY = -13; for (let i = 0; i < 6; i++) g.testStep(1); });
  await pg.waitForTimeout(60);
  const path = `/tmp/pvqa_L${levelIndex}_col${c}.png`;
  await pg.screenshot({ path });
  shots.push(path);
}

console.log(`PLAYER-VIEW QA · Level ${levelIndex}`);
console.log('Shots:', shots.join('  '));
console.log('Console/Page errors:', errs.length, errs.slice(0, 5).join(' | '));
console.log(errs.length === 0 ? '→ 0 Fehler. Jetzt die PNGs SELBST ansehen (Oberkante/Kanten/Übergänge).'
                              : '→ FEHLER vorhanden, bitte prüfen.');
await b.close();
