// ─────────────────────────────────────────────────────────────────────────────
// PANO-SEAM-CHECK — objektive Abnahme für gelieferte Urlaubs-Panorama-Sätze.
//
// Prüft einen 6-Kachel-Panorama-Satz (Welt 19) gegen die harten Kriterien aus dem
// Bild-Prompt, BEVOR er eingebaut wird:
//   1) Maße je Kachel exakt 1373×191 px
//   2) Nahtlosigkeit: mittlere Pixel-Differenz der aneinandergrenzenden Randspalten
//      an jeder der 5 inneren Nähte  (Schwelle < 8/255 = unsichtbar; der alte Satz
//      lag bei 34–73 → FAIL)
//   3) Horizont-Konstanz: geschätzte Horizontzeile je Kachel, Spread ≤ 2 px
//   4) Helligkeits-Konstanz an den Nähten (kein Belichtungssprung)
//
// Nutzung:
//   node tools/pano-seam-check.mjs [ordnerODERdatei1 datei2 …]
//   • ohne Argument: sucht im aktuellen Ordner Level_Hintergrund_01..06.(png|jpg)
//   • mit Ordner:    sucht dort dieselben Namen
//   • mit 6 Dateien: nutzt genau diese (in gegebener Reihenfolge)
//
// Exit-Code 0 = alle Kriterien erfüllt, 1 = mindestens ein FAIL (CI-tauglich).
// Decodiert die Bilder über das vorinstallierte Chromium (kein Extra-Package).
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TILE_W = 1373, TILE_H = 191;
const SEAM_MAX = 8;        // mittlere RGB-Differenz je Naht (0..255) — darunter unsichtbar
const HORIZON_SPREAD_MAX = 2;
const BRIGHT_JUMP_MAX = 10;

function resolveFiles(args) {
  if (args.length >= 6) return args.slice(0, 6);
  const dir = args[0] && fs.existsSync(args[0]) && fs.statSync(args[0]).isDirectory() ? args[0] : '.';
  const found = [];
  for (let i = 1; i <= 6; i++) {
    const stem = `Level_Hintergrund_${String(i).padStart(2, '0')}`;
    const hit = ['.png', '.jpg', '.jpeg'].map(e => path.join(dir, stem + e)).find(p => fs.existsSync(p));
    if (hit) found.push(hit);
  }
  return found;
}

const files = resolveFiles(process.argv.slice(2));
if (files.length !== 6) {
  console.error(`✗ Erwarte 6 Kacheln, gefunden: ${files.length}. Erst 6 Level_Hintergrund_01..06 bereitstellen.`);
  process.exit(1);
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage();
await pg.setContent('<canvas id="c"></canvas>');

// Lade jede Datei als DataURL und ziehe Randspalten + Zeilen-Helligkeiten
const dataUrls = files.map(f => {
  const ext = path.extname(f).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(f).toString('base64')}`;
});

const tiles = await pg.evaluate(async (urls) => {
  const cv = document.getElementById('c'); const ctx = cv.getContext('2d', { willReadFrequently: true });
  const out = [];
  for (const url of urls) {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    cv.width = img.width; cv.height = img.height; ctx.clearRect(0, 0, img.width, img.height); ctx.drawImage(img, 0, 0);
    const W = img.width, H = img.height;
    const left = Array.from(ctx.getImageData(0, 0, 1, H).data);
    const right = Array.from(ctx.getImageData(W - 1, 0, 1, H).data);
    // Zeilen-Mittelhelligkeit → grobe Horizont-Schätzung (steilster Hell→Dunkel-Abfall)
    const rowBright = [];
    for (let y = 0; y < H; y++) { const d = ctx.getImageData(0, y, W, 1).data; let s = 0; for (let x = 0; x < d.length; x += 4) s += (d[x] + d[x + 1] + d[x + 2]) / 3; rowBright.push(s / (d.length / 4)); }
    let horizon = -1, maxDrop = 0;
    for (let y = 1; y < H; y++) { const drop = rowBright[y - 1] - rowBright[y]; if (drop > maxDrop) { maxDrop = drop; horizon = y; } }
    const meanBright = rowBright.reduce((a, c) => a + c, 0) / H;
    out.push({ W, H, left, right, horizon, meanBright });
  }
  return out;
}, dataUrls);

await b.close();

// Auswertung
function edgeDiff(rightCol, leftCol) {
  const n = Math.min(rightCol.length, leftCol.length) / 4;
  let s = 0;
  for (let k = 0; k < n; k++) s += Math.abs(rightCol[k * 4] - leftCol[k * 4]) + Math.abs(rightCol[k * 4 + 1] - leftCol[k * 4 + 1]) + Math.abs(rightCol[k * 4 + 2] - leftCol[k * 4 + 2]);
  return s / (n * 3);
}

let fails = 0;
const line = '─'.repeat(64);
console.log(line);
console.log('PANO-SEAM-CHECK · Welt 19 Urlaubs-Panorama');
console.log(line);

// 1) Maße
console.log('1) Maße je Kachel (Soll 1373×191):');
tiles.forEach((t, i) => {
  const ok = t.W === TILE_W && t.H === TILE_H;
  if (!ok) fails++;
  console.log(`   Kachel ${i + 1}: ${t.W}×${t.H}  ${ok ? '✓' : '✗ (falsche Maße)'}`);
});

// 2) Nähte
console.log('2) Nähte (mittlere RGB-Differenz, Soll < ' + SEAM_MAX + '/255):');
for (let i = 0; i < tiles.length - 1; i++) {
  const d = edgeDiff(tiles[i].right, tiles[i + 1].left);
  const ok = d < SEAM_MAX;
  if (!ok) fails++;
  console.log(`   Naht ${i + 1}→${i + 2}: ${d.toFixed(1)}  ${ok ? '✓' : '✗ (Naht sichtbar → neu erzeugen)'}`);
}

// 3) Horizont-Konstanz
const hz = tiles.map(t => t.horizon);
const spread = Math.max(...hz) - Math.min(...hz);
const hzOk = spread <= HORIZON_SPREAD_MAX;
if (!hzOk) fails++;
console.log(`3) Horizont (geschätzt) je Kachel: [${hz.join(', ')}]  Spread ${spread}px  ${hzOk ? '✓' : '✗ (> ' + HORIZON_SPREAD_MAX + 'px → uneinheitlich)'}`);

// 4) Helligkeits-Konstanz an den Nähten
console.log('4) Helligkeits-Sprünge an den Nähten (Soll < ' + BRIGHT_JUMP_MAX + '):');
for (let i = 0; i < tiles.length - 1; i++) {
  const j = Math.abs(tiles[i].meanBright - tiles[i + 1].meanBright);
  const ok = j < BRIGHT_JUMP_MAX;
  if (!ok) fails++;
  console.log(`   ${i + 1}→${i + 2}: Δ${j.toFixed(1)}  ${ok ? '✓' : '✗ (Belichtungssprung)'}`);
}

console.log(line);
if (fails === 0) { console.log('ERGEBNIS: ✓ PASS — Satz erfüllt alle Kriterien, kann eingebaut werden.'); process.exit(0); }
else { console.log(`ERGEBNIS: ✗ FAIL — ${fails} Kriterium/-en verfehlt. NICHT einbauen, neu erzeugen lassen.`); process.exit(1); }
