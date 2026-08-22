// ─────────────────────────────────────────────────────────────────────────────
// LEVEL-REACHABILITY — statischer „Durchspielbar bis Flagge"-Wächter.
//
// Warum: Ein Physik-Bot beißt sich an vertikalen/Plattform-Passagen fest und
// liefert falsche Fehlalarme. Dieser Check arbeitet STATISCH: er misst einmal das
// echte Sprung-Envelope der Figur (max. Höhe/Weite über die Engine-Physik) und
// prüft dann per BFS auf einem Sprung-Graphen, ob von der Startfläche eine Kette
// aus Geh-/Sprung-Kanten bis zur Flagge existiert. Berücksichtigt Boden, Einweg-
// Plattformen (WOOD_PLATFORM) und bewegte Plattformen (movingPlatforms). Hazards
// (Wasser/Lava/Stacheln) sind KEINE Landeflächen. Findet echte Sackgassen wie „Weg
// zu breit", „Flagge auf isoliertem Pfeiler", „unsichtbare Grube" (Welt-19-Bug).
//
// Nutzung:  npm run build:standalone && cp dist-standalone/index.html /tmp/real.html
//           node tools/level-reachability.mjs
// Exit 0 = alle Level bis zur Flagge erreichbar. Exit ≠0 = mindestens ein Level
// nicht erreichbar (Details je Level ausgegeben) → vor Release prüfen.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright';

// Tile-Typen (aus constants.ts). Nicht-solide + Hazards:
const HAZARD = new Set([17, 18, 22, 23, 30, 32]);          // WATER_TOP/WATER/LAVA_TOP/LAVA/DEEP_WATER/SPIKE
const NONSOLID = new Set([0, 15, 16, 17, 18, 22, 23, 30, 31, 40, 41, 32, 33]); // inkl. Deko/Sign, OHNE WOOD_PLATFORM
const ONEWAY = 20;                                          // WOOD_PLATFORM (nur von oben)
// Standfläche: solide Oberkante ODER Einweg-Plattform.
const standTop = (t) => t !== undefined && (!NONSOLID.has(t) || t === ONEWAY) && t !== ONEWAY ? true : t === ONEWAY;
// (Ausgeschrieben: solide, wenn nicht in NONSOLID; ODER genau WOOD_PLATFORM.)
const isStand = (t) => (t !== undefined && !NONSOLID.has(t)) || t === ONEWAY;
const isPassable = (t) => t === undefined || NONSOLID.has(t) || t === ONEWAY; // Figur kann die Zelle betreten

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 554, height: 369 } });
await pg.goto('file:///tmp/real.html'); await pg.waitForFunction(() => window.__game, { timeout: 20000 });

// ── 1) Sprung-Envelope EINMAL empirisch messen (Standsprung-Höhe + Laufsprung-Weite)
const env = await pg.evaluate(() => {
  const g = window.__game; const TS = 32;
  // flaches Bodenlevel wählen (Welt 1) und auf festen Boden setzen
  g.startLevel(0); for (let i = 0; i < 30; i++) g.testStep(1);
  const gr = g.level.groundRow ?? (g.level.height - 2);
  // Standsprung-Höhe
  const place = (col) => { g.player.x = col * TS; g.player.y = (gr - 3) * TS; g.player.velX = 0; g.player.velY = 0; for (let i = 0; i < 20; i++) { g.input.keys.clear(); g.testStep(1); } };
  place(6);
  const y0 = g.player.y;
  const K = g.input.keys;
  let minY = y0;
  for (let f = 0; f < 60; f++) { K.set('ArrowUp', f < 16); g.testStep(1); minY = Math.min(minY, g.player.y); if (f > 6 && g.player.onGround) break; }
  const maxUp = (y0 - minY) / TS;
  // Laufsprung-Weite bei SPRINT (Shift = 7.5 px/Frame): voll anlaufen, springen,
  // erst abheben (onGround=false), dann bis zur Landung; horizontale Distanz messen.
  place(6);
  for (let i = 0; i < 45; i++) { K.set('ArrowRight', true); K.set('Shift', true); g.testStep(1); } // auf Sprint-Tempo
  const x0 = g.player.x; let airborne = false, landX = x0, jumped = false;
  for (let f = 0; f < 90; f++) {
    K.set('ArrowRight', true); K.set('Shift', true); K.set('ArrowUp', f < 16);
    g.testStep(1);
    if (!g.player.onGround) airborne = true;
    if (airborne && g.player.onGround) { landX = g.player.x; jumped = true; break; }
  }
  const maxDX = jumped ? (landX - x0) / TS : 5;
  return { maxUp: +maxUp.toFixed(2), maxDX: +maxDX.toFixed(2) };
});

// ── 2) je Level das Gitter + Anker extrahieren
const levels = await pg.evaluate(() => {
  const out = [];
  for (let idx = 0; idx < 19; idx++) {
    const g = window.__game; g.startLevel(idx); for (let i = 0; i < 6; i++) g.testStep(1);
    const TS = 32, T = g.level.tiles, W = g.level.width, H = g.level.height;
    const gr = g.level.groundRow ?? (H - 2);
    const rows = [];
    for (let r = 0; r < H; r++) { const row = new Array(W); for (let c = 0; c < W; c++) row[c] = T[r]?.[c] ?? 0; rows.push(row); }
    const start = g.level.playerStart ? { c: Math.round(g.level.playerStart.x / TS), r: Math.round(g.level.playerStart.y / TS) } : { c: 2, r: gr - 1 };
    const flag = g.level.flagPosition ? { c: Math.round(g.level.flagPosition.x / TS), r: Math.round(g.level.flagPosition.y / TS) } : { c: W - 3, r: gr - 1 };
    const mp = (g.level.movingPlatforms || []).map(p => ({ col: p.centerCol, row: p.centerRow, w: p.widthTiles, amp: p.amplitudeTiles || 0, path: p.path }));
    out.push({ idx, id: idx + 1, name: g.level.name, theme: g.level.theme, W, H, gr, rows, start, flag, mp });
  }
  return out;
});
await b.close();

// ── 3) Reachability-BFS je Level
function analyse(L, env) {
  const { W, H, rows } = L;
  const tile = (r, c) => (r >= 0 && r < H && c >= 0 && c < W) ? rows[r][c] : 0;
  // Standzellen: standTop(r,c) UND Kopf-/Körperraum frei (r-1 passierbar)
  const stand = new Set();
  const key = (r, c) => r * W + c;
  for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) {
    if (isStand(tile(r, c)) && isPassable(tile(r - 1, c))) stand.add(key(r, c));
  }
  // bewegte Plattformen als Standzellen über ihren Bereich ergänzen
  for (const p of L.mp) {
    if (p.path === 'horizontal') { const r = Math.round(p.row); for (let c = Math.round(p.col - p.amp); c <= Math.round(p.col + p.amp) + p.w - 1; c++) if (c >= 0 && c < W) stand.add(key(r, c)); }
    else { for (let rr = Math.round(p.row - p.amp); rr <= Math.round(p.row + p.amp); rr++) for (let c = p.col; c < p.col + p.w; c++) if (c >= 0 && c < W && rr >= 0 && rr < H) stand.add(key(rr, c)); }
  }
  // Startzelle: erste Standzelle unter/at start
  const findGround = (c, r) => { for (let rr = Math.max(0, r); rr < H; rr++) if (stand.has(key(rr, c))) return rr; return -1; };
  let sc = L.start.c, sr = findGround(L.start.c, L.start.r - 1); if (sr < 0) { for (let d = 1; d < 6 && sr < 0; d++) { sr = findGround(L.start.c + d, 0); if (sr >= 0) sc = L.start.c + d; else { sr = findGround(L.start.c - d, 0); if (sr >= 0) sc = L.start.c - d; } } }
  if (sr < 0) return { reachable: false, reason: 'kein Startboden', reachMaxCol: 0, flagCol: L.flag.c };
  // Envelope (mit kleiner Sicherheitsmarge, um Fehlalarme zu vermeiden)
  const UP = env.maxUp + 0.6, DX = env.maxDX + 0.8;
  const reach = (r1, c1, r2, c2) => {
    const dx = Math.abs(c2 - c1), up = r1 - r2; // up>0 = höher
    if (up > 0) { if (up > UP + 0.01) return false; return (up / UP) + (dx / DX) <= 1.18 && dx <= DX + 0.5; }
    // gleich hoch oder fallend: Fall erlaubt zusätzliche Weite
    const drop = -up; return dx <= DX + Math.min(6, drop) * 0.5 + 0.5;
  };
  // BFS
  const seen = new Set([key(sr, sc)]); const q = [[sr, sc]]; let reachMaxCol = sc;
  // Nachbar-Standzellen im Sprung-/Fenster suchen (nur begrenztes Fenster fürs Tempo)
  const winC = Math.ceil(DX) + 2, winR = Math.ceil(Math.max(UP, 8)) + 2;
  while (q.length) {
    const [r, c] = q.shift(); reachMaxCol = Math.max(reachMaxCol, c);
    for (let c2 = c - winC; c2 <= c + winC; c2++) {
      if (c2 < 0 || c2 >= W) continue;
      for (let r2 = r - winR; r2 <= r + winR; r2++) {
        if (r2 < 0 || r2 >= H) continue;
        const k = key(r2, c2); if (seen.has(k) || !stand.has(k)) continue;
        if (r2 === r && c2 === c) continue;
        if (reach(r, c, r2, c2)) { seen.add(k); q.push([r2, c2]); }
      }
    }
  }
  // Ziel: Standzelle nahe der Flaggenspalte erreicht?
  let ok = false;
  for (let c = L.flag.c - 1; c <= L.flag.c + 1; c++) for (let r = 0; r < H; r++) if (seen.has(key(r, c))) { ok = true; }
  return { reachable: ok, reachMaxCol, flagCol: L.flag.c, standCount: stand.size };
}

console.log(`Sprung-Envelope (gemessen): max. Höhe ${env.maxUp} Kacheln · max. Laufweite ${env.maxDX} Kacheln`);
console.log('id  theme        flag  reachMax  bis-Flagge?');
let fails = 0;
for (const L of levels) {
  const a = analyse(L, env);
  const status = a.reachable ? 'OK' : `✗ NUR bis Spalte ${a.reachMaxCol}/${a.flagCol}`;
  if (!a.reachable) fails++;
  console.log(String(L.id).padStart(2), (L.theme || '').padEnd(11), String(a.flagCol).padStart(4), String(a.reachMaxCol).padStart(8), '  ', status, a.reachable ? '' : '  ' + L.name);
}
console.log('-------------------------------------------------------');
if (fails === 0) { console.log(`✓ ERREICHBARKEIT: alle 19 Welten bis zur Flagge durchspielbar.`); process.exit(0); }
else { console.log(`✗ ERREICHBARKEIT: ${fails} Welt(en) NICHT bis zur Flagge erreichbar (siehe oben).`); process.exit(3); }
