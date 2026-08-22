// ─────────────────────────────────────────────────────────────────────────────
// PANO-IMPORT — grün geprüften 6-Kachel-Panorama-Satz in das Spiel übernehmen.
//
// Ablauf:
//   1) Führt zuerst dieselben Abnahme-Kriterien wie tools/pano-seam-check.mjs aus.
//      FAIL → Abbruch (kein Einbau), außer mit --force.
//   2) Re-encodiert jede Kachel als JPEG (Standard q92, „verlustarm") und schreibt
//      client/src/game/assets/vacationBg.ts (VACATION_BG_URLS + VACATION_BG_SIZES).
//   3) Optional (--tune-code): weil ein SAUBERER Satz echt nahtlos ist und einen
//      einheitlichen Horizont hat, wird im Renderer die Naht-Überblendung stark
//      reduziert (seamFrac → ~1 %) und der per-Tile-Crop auf EINEN einheitlichen
//      Wert gesetzt (KEEP → uniform) — so bleiben die neuen Bilder maximal scharf.
//
// Nutzung:
//   node tools/pano-import.mjs <ordner|6 dateien> [--quality 92] [--tune-code]
//        [--force] [--out <pfad zu vacationBg.ts>] [--bg <pfad zu backgrounds.ts>]
//
// Decodiert/encodiert über das vorinstallierte Chromium (kein Extra-Package).
// Danach IMMER selbst prüfen: npm run build:standalone + tools/playerview-qa.mjs.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TILE_W = 1373, TILE_H = 191, SEAM_MAX = 8, HORIZON_SPREAD_MAX = 2;
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const has = (n) => argv.includes(n);
const quality = Number(flag('--quality', 92));
const tuneCode = has('--tune-code');
const force = has('--force');
const assetOut = flag('--out', 'client/src/game/assets/vacationBg.ts');
const bgPath = flag('--bg', 'client/src/game/renderer/backgrounds.ts');
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && argv[i - 1] !== '--tune-code' && argv[i - 1] !== '--force'));

function resolveFiles(list) {
  if (list.length >= 6) return list.slice(0, 6);
  const dir = list[0] && fs.existsSync(list[0]) && fs.statSync(list[0]).isDirectory() ? list[0] : '.';
  const out = [];
  for (let i = 1; i <= 6; i++) {
    const stem = `Level_Hintergrund_${String(i).padStart(2, '0')}`;
    const hit = ['.png', '.jpg', '.jpeg'].map(e => path.join(dir, stem + e)).find(p => fs.existsSync(p));
    if (hit) out.push(hit);
  }
  return out;
}

const files = resolveFiles(positional);
if (files.length !== 6) { console.error(`✗ Erwarte 6 Kacheln, gefunden ${files.length}.`); process.exit(1); }

const inUrls = files.map(f => {
  const ext = path.extname(f).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(f).toString('base64')}`;
});

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage();
await pg.setContent('<canvas id="c"></canvas>');

const res = await pg.evaluate(async ({ urls, q }) => {
  const cv = document.getElementById('c'); const ctx = cv.getContext('2d', { willReadFrequently: true });
  const tiles = [];
  for (const url of urls) {
    const img = await new Promise((r, j) => { const im = new Image(); im.onload = () => r(im); im.onerror = j; im.src = url; });
    cv.width = img.width; cv.height = img.height; ctx.clearRect(0, 0, img.width, img.height); ctx.drawImage(img, 0, 0);
    const W = img.width, H = img.height;
    const left = Array.from(ctx.getImageData(0, 0, 1, H).data);
    const right = Array.from(ctx.getImageData(W - 1, 0, 1, H).data);
    const rowB = []; for (let y = 0; y < H; y++) { const d = ctx.getImageData(0, y, W, 1).data; let s = 0; for (let x = 0; x < d.length; x += 4) s += (d[x] + d[x + 1] + d[x + 2]) / 3; rowB.push(s / (d.length / 4)); }
    let horizon = -1, maxDrop = 0; for (let y = 1; y < H; y++) { const drop = rowB[y - 1] - rowB[y]; if (drop > maxDrop) { maxDrop = drop; horizon = y; } }
    const jpeg = cv.toDataURL('image/jpeg', q / 100);   // re-encode „verlustarm"
    tiles.push({ W, H, left, right, horizon, jpeg });
  }
  return tiles;
}, { urls: inUrls, q: quality });
await b.close();

// ── Abnahme prüfen ──
function edgeDiff(r, l) { const n = Math.min(r.length, l.length) / 4; let s = 0; for (let k = 0; k < n; k++) s += Math.abs(r[k * 4] - l[k * 4]) + Math.abs(r[k * 4 + 1] - l[k * 4 + 1]) + Math.abs(r[k * 4 + 2] - l[k * 4 + 2]); return s / (n * 3); }
let fail = 0;
const sizeOk = res.every(t => t.W === TILE_W && t.H === TILE_H); if (!sizeOk) fail++;
const seams = res.slice(0, 5).map((_, i) => edgeDiff(res[i].right, res[i + 1].left));
seams.forEach((d, i) => { const ok = d < SEAM_MAX; if (!ok) fail++; console.log(`Naht ${i + 1}→${i + 2}: ${d.toFixed(1)} ${ok ? '✓' : '✗'}`); });
const hz = res.map(t => t.horizon); const spread = Math.max(...hz) - Math.min(...hz); const hzOk = spread <= HORIZON_SPREAD_MAX; if (!hzOk) fail++;
console.log(`Maße ${sizeOk ? '✓' : '✗'} · Horizont-Spread ${spread}px ${hzOk ? '✓' : '✗'}`);

if (fail > 0 && !force) { console.error(`✗ ${fail} Kriterium/-en verfehlt → kein Einbau. (Mit --force überschreiben, oder Bilder neu erzeugen.)`); process.exit(1); }
if (fail > 0) console.warn(`⚠ ${fail} Kriterium/-en verfehlt, aber --force gesetzt — baue trotzdem ein.`);

// ── vacationBg.ts schreiben ──
const sizes = res.map(t => `[${t.W},${t.H}]`).join(', ');
const urlsBlock = res.map(t => `  "${t.jpeg}",`).join('\n');
const ts = `// Urlaubs-Panorama (Welt 19) — 6 nahtlos aneinander anschließende Kacheln, die
// ZUSAMMEN EIN durchgehendes Bild ergeben. Automatisch importiert via
// tools/pano-import.mjs (JPEG q${quality}). Alle exakt gleich groß (${TILE_W}x${TILE_H}).
export const VACATION_BG_SIZES: [number, number][] = [${sizes}];
export const VACATION_BG_URLS: string[] = [
${urlsBlock}
];
`;
fs.writeFileSync(assetOut, ts);
console.log(`✓ geschrieben: ${assetOut}  (${(ts.length / 1024).toFixed(0)} KB, JPEG q${quality})`);

// ── optional: Renderer-Naht/Crop entschärfen (nur bei sauberem Satz sinnvoll) ──
if (tuneCode) {
  if (fail > 0) { console.warn('⚠ --tune-code bei nicht-sauberem Satz übersprungen (Naht bleibt aktiv).'); }
  else if (!fs.existsSync(bgPath)) { console.warn(`⚠ ${bgPath} nicht gefunden — Code-Tuning übersprungen.`); }
  else {
    let bg = fs.readFileSync(bgPath, 'utf8');
    const before = bg;
    // Naht-Überblendung auf ~1 % je Naht (echte Nahtlosigkeit → kaum Blend nötig)
    bg = bg.replace(/const seamFrac = \[[^\]]*\];/, 'const seamFrac = [0.012, 0.012, 0.012, 0.012, 0.012];   // Auto: sauberer Satz → minimale Naht');
    // per-Tile-Crop einheitlich (neuer Satz hat konstanten Horizont/Bodenkante)
    bg = bg.replace(/const KEEP = \[[^\]]*\];/, 'const KEEP = [0.94, 0.94, 0.94, 0.94, 0.94, 0.94];   // Auto: einheitlicher Crop (Horizont schon konstant)');
    if (bg !== before) { fs.writeFileSync(bgPath, bg); console.log('✓ Renderer entschärft: seamFrac ~1 %, KEEP uniform (0.94).'); }
    else console.warn('⚠ seamFrac/KEEP nicht gefunden (Muster geändert?) — Code unverändert.');
  }
}

console.log('→ Jetzt: npm run build:standalone && node tools/playerview-qa.mjs 18  (selbst ansehen!)');
