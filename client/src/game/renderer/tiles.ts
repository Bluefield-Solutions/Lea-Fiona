import type { Renderer } from '../renderer.ts';
import { TILE_SIZE, TileType } from '../constants.ts';
import { USE_VACATION_PHOTO } from './backgrounds.ts';

// W3.3 · Kanten-Highlight-Farben (rim light) pro Welt — jeweils heller als der
// Boden, damit die Oberkante als beleuchtete Kante liest (Plastizität).
const TOP_RIM: Record<string, string> = {
  jungle: 'rgba(158,230,128,0.42)',
  bluefield: 'rgba(190,216,255,0.42)',
  cave: 'rgba(150,170,205,0.34)',
  sky: 'rgba(255,250,220,0.40)',
  beach: 'rgba(255,240,190,0.44)',
  australia: 'rgba(255,200,150,0.42)',
  volcano: 'rgba(255,180,120,0.42)',
  ice: 'rgba(222,240,255,0.48)',
  castle: 'rgba(222,212,242,0.36)',
  underwater: 'rgba(180,240,255,0.40)',
  space: 'rgba(210,210,255,0.34)',
  school: 'rgba(255,245,225,0.34)',
  gym: 'rgba(255,238,200,0.42)',
  trampoline: 'rgba(255,220,245,0.40)',
  plush: 'rgba(255,244,250,0.5)',
  city: 'rgba(150,170,205,0.30)',   // P4: kühle, dezente Dachkante (Nacht)
  vacation: 'rgba(190,235,160,0.42)', // Urlaub: heller, grasig-warmer Kantenlichtsaum
};

// AP 1.5: Kacheln, auf denen sichtbare Wiederholung am störendsten ist und
// die eine dezente, positionsabhängige Textur-Variation bekommen (erdige /
// steinige Flächen — Wasser, Lava, Eis bleiben unberührt, sie haben eigenen
// animierten Look).
const VARIABLE_TILES = new Set<number>([
  TileType.GROUND, TileType.GROUND_TOP, TileType.GROUND_LEFT, TileType.GROUND_RIGHT,
  TileType.GROUND_TOP_LEFT, TileType.GROUND_TOP_RIGHT,
  TileType.BRICK, TileType.STONE, TileType.MOSS_GROUND,
  TileType.CASTLE_STONE, TileType.CASTLE_TOP, TileType.SPACE_METAL, TileType.SPACE_TOP,
]);

// Welt 19: Boden-Tiles, die abschnittsweise (Fels/Sand/Holz) gezeichnet werden.
const VACATION_GROUND = new Set<number>([
  TileType.GROUND, TileType.GROUND_TOP, TileType.GROUND_LEFT, TileType.GROUND_RIGHT,
  TileType.GROUND_TOP_LEFT, TileType.GROUND_TOP_RIGHT,
]);

// ── Welt 19 „Urlaub": Lagune (Wasser-Passage im Sandweg) ─────────────────────
// Palette an die Foto-See angeglichen (kein Neon-Türkis), damit die Passage nicht
// als Fremdkörper auf dem fotorealistischen Strand liegt. Oberfläche mit feinen
// Glitzer-Reflexen (Tiefe), Grund satt-dunkel; die tiefste Reihe bekommt eine
// abgedunkelte Unterkante, damit die Lagune nicht als heller Kasten „schwebt".
function drawVacationLagoon(ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  if (top) {
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#79c7c6'); g.addColorStop(0.5, '#3d9db8'); g.addColorStop(1, '#2b7fa0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // sandiger Uferschimmer + Schaumkante an der Oberkante (kein harter Schnitt)
    ctx.fillStyle = 'rgba(238,222,168,0.5)'; ctx.fillRect(0, 0, S, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, 2, S, 1.5);
    // zwei kleine Schaum-/Wellenlinien
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 7); for (let x = 0; x <= S; x += 4) ctx.lineTo(x, 7 + Math.sin(x * 0.6) * 1.1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 13); for (let x = 0; x <= S; x += 4) ctx.lineTo(x, 13 + Math.sin(x * 0.6 + 2) * 1.0); ctx.stroke();
    // feine Glitzer-Reflexe auf der Oberfläche (statisch, positions-stabil) → Tiefe
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 5; i++) {
      const gx = ((i * 61 + 13) % (S - 4)) + 2;
      const gy = 5 + ((i * 37 + 7) % (S - 9));
      ctx.fillRect(gx, gy, 2, 1);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#2b7fa0'); g.addColorStop(1, '#1c5f80');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, S * 0.5); for (let x = 0; x <= S; x += 4) ctx.lineTo(x, S * 0.5 + Math.sin(x * 0.5) * 1.2); ctx.stroke();
  }
}

// Lagunen-Kanten (positions-/nachbarabhängig, daher NACH dem Kachel-Blit):
//  • senkrechte Ufer (Wasser trifft Sandweg) → weich in nassen Sand + Brandung
//    auslaufen lassen (echtes Ufer statt hartem Türkis-Block).
//  • Unterkante (kein Wasser darunter) → abdunkeln, damit die Lagune satt im
//    Boden sitzt und nicht als heller Kasten „schwebt".
function drawVacationShore(
  this: Renderer, screenX: number, screenY: number,
  leftShore: boolean, rightShore: boolean, bottomEdge: boolean,
) {
  const S = TILE_SIZE;
  const ctx = this.ctx;
  const W = 13;
  const drawSide = (x0: number, dir: 1 | -1) => {
    const g = ctx.createLinearGradient(x0, 0, x0 + dir * W, 0);
    g.addColorStop(0, 'rgba(226,204,150,0.95)');
    g.addColorStop(0.45, 'rgba(214,190,140,0.55)');
    g.addColorStop(1, 'rgba(214,190,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(dir === 1 ? x0 : x0 - W, screenY, W, S);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    const wx = x0 + dir * (W - 2);
    ctx.moveTo(wx, screenY + 1);
    for (let y = 0; y <= S; y += 4) ctx.lineTo(wx + Math.sin(y * 0.5 + x0) * 1.4, screenY + y);
    ctx.stroke();
  };
  if (leftShore) drawSide(screenX, 1);
  if (rightShore) drawSide(screenX + S, -1);
  if (bottomEdge) {
    const d = ctx.createLinearGradient(0, screenY + S - 8, 0, screenY + S);
    d.addColorStop(0, 'rgba(6,26,40,0)'); d.addColorStop(1, 'rgba(6,26,40,0.5)');
    ctx.fillStyle = d; ctx.fillRect(screenX, screenY + S - 8, S, 8);
  }
}

// Zeichnet EINE Urlaubs-Boden-Kachel je Abschnitt: 0 Alpen (Fels + Grasnarbe),
// 1 Tropen (heller Sand), 2 Küste (Holzsteg-Planken). Abschnitt aus der Spalte.
function drawVacationGroundColumn(
  ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number, isTop: boolean, groundRow: number,
) {
  // Abschnitts-Grenzen an das durchgehende Panorama ausgerichtet (Fels/Weg bis
  // zum Wasserfall-Ende ~126, Sand an der Lagune, Holz zur Küstenstadt ~216).
  const B1 = 126, B2 = 216, WBLEND = 3;
  const sec = col < B1 ? 0 : col < B2 ? 1 : 2;
  const h = tileVarHash(col + 3, row + 5);
  const depth = Math.max(0, row - groundRow);   // 0 = begehbare Weg-Oberfläche, >0 = Erdreich darunter
  drawVacSectionMaterial(ctx, x, y, col, row, isTop, sec, h, depth);
  // Weiche Verzahnung an den Materialgrenzen: Nachbar-Material einblenden (mit
  // Hash-Jitter → organisch verzahnte Kante statt schnurgerade).
  for (const [B, left, right] of [[B1, 0, 1], [B2, 1, 2]] as const) {
    if (col >= B - WBLEND && col < B + WBLEND) {
      const f = smoothstep01((col - (B - WBLEND)) / (2 * WBLEND));
      const over = col < B ? right : left;
      let a = col < B ? f : 1 - f;
      a += (tileVarHash(col * 3.1, row * 2.7) - 0.5) * 0.28;
      a = Math.max(0, Math.min(1, a));
      if (a > 0.02) {
        ctx.save(); ctx.globalAlpha = a;
        drawVacSectionMaterial(ctx, x, y, col, row, isTop, over, h, depth);
        ctx.restore();
      }
    }
  }
}

function smoothstep01(v: number): number { const c = Math.max(0, Math.min(1, v)); return c * c * (3 - 2 * c); }

// Welt 19 · Einweg-Plattform (Steg/Sims) als DÜNNE, bewusst gebaute Leiste statt
// vollflächiger Holzklotz — so liest sie als schwebende Plattform (mit
// Schlagschatten darunter), nicht als „Boden in der Luft". Material je Abschnitt:
// Alpen = graue Stein-/Holzbohle, Tropen = helle Bambus-Planke, Küste = warmes Holz.
function drawVacationPlatform(ctx: CanvasRenderingContext2D, col = -1) {
  const S = TILE_SIZE;
  const H = 12;                          // Dicke der Leiste (Rest der Kachel bleibt frei)
  // Schlagschatten unter der Leiste → hebt sie sichtbar von der Kulisse ab.
  const sh = ctx.createLinearGradient(0, H, 0, H + 12);
  sh.addColorStop(0, 'rgba(0,0,0,0.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.fillRect(0, H, S, 12);
  // Material je Roadtrip-Abschnitt: Alpen = kühle Stein-Holz-Bohle, Tropen = heller
  // Bambus, Küste = warmes Holz. (col<0 = HUD/Fallback → warmes Holz.)
  const sec = col < 0 ? 2 : col < 91 ? 0 : col < 182 ? 1 : 2;
  // Deutlich unterschiedliche Materialien je Abschnitt (nicht mehr drei Braun-Töne):
  // Alpen = kühler GRAUER STEIN, Tropen = grünlicher BAMBUS, Küste = warmes TREIBHOLZ.
  const pal = sec === 0
    ? { a: '#9aa3ab', b: '#626a74', rim: 'rgba(232,238,244,0.7)', seam: 'rgba(38,44,52,0.55)' }
    : sec === 1
      ? { a: '#cfd07a', b: '#93a544', rim: 'rgba(246,255,196,0.7)', seam: 'rgba(64,80,28,0.5)' }
      : { a: '#c58540', b: '#87501f', rim: 'rgba(255,232,190,0.65)', seam: 'rgba(46,26,10,0.55)' };
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, pal.a); g.addColorStop(1, pal.b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, H);
  // beleuchtete Oberkante
  ctx.fillStyle = pal.rim; ctx.fillRect(0, 0, S, 2);
  if (sec === 0) {
    // ── Alpen: STEINPLATTE — unregelmäßige Risse + Sprenkel, kein Holz ──
    ctx.strokeStyle = pal.seam; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(S * 0.34, 2); ctx.lineTo(S * 0.4, H * 0.5); ctx.lineTo(S * 0.3, H - 2);
    ctx.moveTo(S * 0.68, 2); ctx.lineTo(S * 0.62, H * 0.55); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(S * 0.12, H * 0.3, 3, 1.4); ctx.fillRect(S * 0.8, H * 0.6, 3, 1.4);
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(S * 0.5, H * 0.4, 2, 1.4);
  } else if (sec === 1) {
    // ── Tropen: BAMBUS — gebündelte horizontale Rohre + Knoten-Ringe ──
    ctx.strokeStyle = pal.seam; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(0, H * 0.36); ctx.lineTo(S, H * 0.36);
    ctx.moveTo(0, H * 0.68); ctx.lineTo(S, H * 0.68); ctx.stroke();
    for (const nx of [S * 0.28, S * 0.72]) {
      ctx.strokeStyle = pal.seam; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(nx, 1); ctx.lineTo(nx, H - 1); ctx.stroke();
      ctx.strokeStyle = 'rgba(245,255,206,0.55)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(nx + 1.1, 1.5); ctx.lineTo(nx + 1.1, H - 1.5); ctx.stroke();
    }
  } else {
    // ── Küste: TREIBHOLZ — Maserung, Planken-Quernaht + zwei Nägel ──
    ctx.strokeStyle = pal.seam; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(S, H * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(S * 0.5, 1); ctx.lineTo(S * 0.5, H - 1); ctx.stroke();
    ctx.fillStyle = pal.seam;
    ctx.beginPath(); ctx.arc(4, 4, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(S - 4, 4, 0.9, 0, Math.PI * 2); ctx.fill();
  }
  // Unterkante-Schattenlinie (Dicke der Bohle lesbar)
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, H - 1.5, S, 1.5);
}

// Welt 19 · Weg-Kurven & Breite: pro Spalte ein glattes, deterministisches Profil,
// wie dick der begrünte/angewehte Saum oben und der erdige Rand-Schulter unten in
// die begehbare Kachel hineinragen. Beide laufen mit unterschiedlicher Frequenz →
// der freie Weg dazwischen wandert (mäandert) und wird enger/breiter, statt
// schnurgerade zu sein. (Nur Natur-Wege Alpen/Tropen; der Holzsteg bleibt gerade.)
function vacPathEdges(col: number): { top: number; bot: number } {
  const p = col * 0.19;
  const top = 2 + (Math.sin(p) * 0.5 + Math.sin(p * 2.3 + 1.1) * 0.25 + 0.375) * 5;        // ~2..7 px
  const bot = 1.5 + (Math.sin(p * 0.83 + 2.2) * 0.5 + Math.sin(p * 1.7 + 0.4) * 0.2 + 0.35) * 5.5; // ~1.5..7 px
  return { top, bot };
}

// Zeichnet EINE Urlaubs-Boden-Kachel als echter WEG: `depth`===0 ist die begehbare
// Oberfläche (Kiesweg / Sandweg / Holzsteg mit Grasrand oben), depth>0 ist das
// Erdreich/Unterbau darunter, das mit der Tiefe dunkler wird und zurücktritt.
function drawVacSectionMaterial(
  ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number, isTop: boolean, sec: number, h: number, depth: number,
) {
  const S = TILE_SIZE;
  const dark = Math.min(0.5, depth * 0.14);        // Tiefen-Abdunklung fürs Erdreich
  if (sec === 0) {
    // ── Alpen · Bergpfad (Kies/Erde) ──
    if (depth === 0) {
      const g = ctx.createLinearGradient(x, y, x, y + S);
      g.addColorStop(0, '#a48f68'); g.addColorStop(1, '#87714f');
      ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
      // #1 Ausgetretener Pfad: dezente Mittel-Aufhellung (heller getretene Spur)
      ctx.fillStyle = 'rgba(200,184,150,0.11)'; ctx.fillRect(x, y + S * 0.30, S, S * 0.42);
      // Kiesel/Steinchen (hell & dunkel), Hash-platziert
      for (let i = 0; i < 5; i++) {
        const gx = x + 3 + tileVarHash(col * 2 + i, row + 1) * (S - 6);
        const gy = y + 6 + tileVarHash(col + 7, row * 2 + i) * (S - 8);
        const r = 1 + tileVarHash(col + i, row) * 1.4;
        ctx.fillStyle = i % 2 ? 'rgba(210,196,160,0.5)' : 'rgba(70,58,40,0.45)';
        ctx.beginPath(); ctx.ellipse(gx, gy, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      }
      // #1 Rand-Trittsteine: vereinzelt ein größerer Stein am Wegrand
      if (h > 0.63) {
        const sx = x + (h > 0.82 ? S - 5 : 5);
        ctx.fillStyle = 'rgba(120,104,74,0.42)'; ctx.beginPath(); ctx.ellipse(sx, y + S * 0.66, 2.6, 1.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(214,200,164,0.4)'; ctx.beginPath(); ctx.ellipse(sx - 0.6, y + S * 0.62, 1.2, 0.8, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (isTop) { // Grasrand mit ein paar Halmen an der Oberkante
        // #1 Weg-Kurven & Breite: begrünter Saum oben mit spaltenweise variabler Dicke
        const e = vacPathEdges(col);
        ctx.fillStyle = '#3d7a33'; ctx.fillRect(x, y, S, e.top);
        ctx.fillStyle = '#57993f'; ctx.fillRect(x, y, S, Math.max(1.5, e.top * 0.5));
        // #1 erdige Rand-Schulter unten (gegenläufig) → freier Weg wandert/verengt sich
        ctx.fillStyle = 'rgba(106,86,64,0.55)'; ctx.fillRect(x, y + S - e.bot, S, e.bot);
        ctx.strokeStyle = '#57993f'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) { const bx = x + 4 + i * 9 + tileVarHash(col + i, row) * 4; ctx.beginPath(); ctx.moveTo(bx, y + e.top - 1); ctx.lineTo(bx + (tileVarHash(col, i) - 0.5) * 3, y - 3); ctx.stroke(); }
        // #2 Vordergrund-Büschel: vereinzelt ein Grasbüschel (Alpen-Wiese) am Wegsaum
        if (tileVarHash(col * 1.9 + 4, row + 2) > 0.72) {
          const bx = x + 6 + tileVarHash(col + 3, row) * (S - 12);
          ctx.strokeStyle = '#4c8a3a'; ctx.lineWidth = 1;
          for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(bx, y + 2); ctx.lineTo(bx + k * 2, y - 6 - Math.abs(k)); ctx.stroke(); }
          if (tileVarHash(col + 8, row + 5) > 0.6) { ctx.fillStyle = '#f0d84a'; ctx.beginPath(); ctx.arc(bx, y - 7, 1.4, 0, Math.PI * 2); ctx.fill(); }
        }
        // #2 Boden-Requisiten: ganz selten ein größerer Findling oder ein Enzian-Tuff
        const pr = tileVarHash(col * 2.7 + 11, row + 9);
        if (pr > 0.93) {   // Findling (Felsbrocken am Wegrand)
          const bx = x + (tileVarHash(col + 2, row) > 0.5 ? S - 8 : 8);
          const g2 = ctx.createLinearGradient(bx - 5, y - 8, bx + 5, y);
          g2.addColorStop(0, '#9a9488'); g2.addColorStop(1, '#6d6659');
          ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(bx, y - 1, 5.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(230,226,214,0.35)'; ctx.beginPath(); ctx.ellipse(bx - 1.6, y - 3, 2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(70,110,60,0.5)'; ctx.beginPath(); ctx.ellipse(bx + 1.5, y + 1, 3, 1.2, 0, 0, Math.PI); ctx.fill();   // Moosansatz
        } else if (pr < 0.05) {   // Enzian-Tuff (kleine blaue Blüten)
          const bx = x + 5 + tileVarHash(col + 6, row) * (S - 10);
          ctx.strokeStyle = '#3f7a34'; ctx.lineWidth = 1;
          for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(bx + k * 2, y + 1); ctx.lineTo(bx + k * 3, y - 5); ctx.stroke(); }
          for (let k = -1; k <= 1; k++) { ctx.fillStyle = '#3b6fd6'; ctx.beginPath(); ctx.arc(bx + k * 3, y - 6, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(180,210,255,0.8)'; ctx.beginPath(); ctx.arc(bx + k * 3 - 0.4, y - 6.4, 0.6, 0, Math.PI * 2); ctx.fill(); }
        }
      }
    } else {
      const g = ctx.createLinearGradient(x, y, x, y + S);
      g.addColorStop(0, '#6a5640'); g.addColorStop(1, '#54432f');
      ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
      if (h > 0.55) { ctx.fillStyle = 'rgba(60,50,38,0.6)'; ctx.beginPath(); ctx.ellipse(x + S * 0.5, y + S * 0.5, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  } else if (sec === 1) {
    // ── Tropen · Sandweg ──
    if (depth === 0) {
      const g = ctx.createLinearGradient(x, y, x, y + S);
      g.addColorStop(0, '#ecdcac'); g.addColorStop(1, '#d8c286');
      ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
      // #1 Ausgetretener Sandweg: leichte Mittel-Aufhellung (getretene Spur)
      ctx.fillStyle = 'rgba(255,246,214,0.12)'; ctx.fillRect(x, y + S * 0.30, S, S * 0.42);
      for (let i = 0; i < 4; i++) {
        const gx = x + 4 + tileVarHash(col * 2 + i, row + 1) * (S - 8);
        const gy = y + 4 + tileVarHash(col + 7, row * 2 + i) * (S - 8);
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.20)' : 'rgba(150,120,70,0.20)';
        ctx.fillRect(gx, gy, 1.5, 1.5);
      }
      // #1 Fußspur-Mulde im Sand: vereinzelt eine flache dunklere Delle am Wegrand
      if (h > 0.66) {
        const fx = x + (h > 0.84 ? S - 5 : 5);
        ctx.fillStyle = 'rgba(188,160,108,0.32)'; ctx.beginPath(); ctx.ellipse(fx, y + S * 0.64, 2.4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (isTop) {
        // #1 Weg-Kurven & Breite: angewehter Sandkamm oben mit variabler Dicke + feuchter Sandrand unten
        const e = vacPathEdges(col);
        ctx.fillStyle = '#f6ecc2'; ctx.fillRect(x, y, S, Math.max(2, e.top * 0.6));
        ctx.fillStyle = 'rgba(194,168,110,0.5)'; ctx.fillRect(x, y + S - e.bot, S, e.bot);   // feuchter/dunklerer Sandrand → Weg mäandert
        // #2 Vordergrund-Büschel: Strandgras oder vereinzelt eine kleine Muschel am Saum
        const th = tileVarHash(col * 1.7 + 6, row + 3);
        if (th > 0.78) {
          const bx = x + 6 + tileVarHash(col + 2, row) * (S - 12);
          ctx.strokeStyle = '#7fae5c'; ctx.lineWidth = 1;
          for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(bx, y + 2); ctx.lineTo(bx + k * 2.4, y - 6 - Math.abs(k)); ctx.stroke(); }
        } else if (th < 0.10) {
          const sx = x + 6 + tileVarHash(col + 5, row) * (S - 12);
          ctx.fillStyle = 'rgba(242,222,226,0.92)'; ctx.beginPath(); ctx.ellipse(sx, y - 1, 2.2, 1.6, 0, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = 'rgba(200,170,180,0.7)'; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(sx - 1.5, y - 1); ctx.lineTo(sx, y - 2.5); ctx.lineTo(sx + 1.5, y - 1); ctx.stroke();
        }
        // #2 Boden-Requisiten: ganz selten eine Kokosnuss oder ein Seestern
        const pr = tileVarHash(col * 2.7 + 11, row + 9);
        if (pr > 0.93) {   // Kokosnuss
          const bx = x + (tileVarHash(col + 2, row) > 0.5 ? S - 7 : 7);
          const g2 = ctx.createLinearGradient(bx - 4, y - 6, bx + 4, y);
          g2.addColorStop(0, '#6e4a28'); g2.addColorStop(1, '#3f2914');
          ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(bx, y - 1, 4, 3.6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(30,18,8,0.6)'; ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(bx, y - 4.4); ctx.lineTo(bx, y + 2); ctx.moveTo(bx - 3.4, y - 1); ctx.lineTo(bx + 3.4, y - 1); ctx.stroke();
          ctx.fillStyle = 'rgba(240,220,180,0.4)'; ctx.beginPath(); ctx.ellipse(bx - 1.4, y - 2.6, 1.2, 0.9, 0, 0, Math.PI * 2); ctx.fill();
        } else if (pr < 0.05) {   // Seestern
          const bx = x + 6 + tileVarHash(col + 6, row) * (S - 12), byy = y - 1.5;
          ctx.fillStyle = '#e8823a';
          ctx.beginPath();
          for (let a = 0; a < 5; a++) {
            const ang = -Math.PI / 2 + a * (Math.PI * 2 / 5);
            const ox = bx + Math.cos(ang) * 4.4, oy = byy + Math.sin(ang) * 4.4;
            const iang = ang + Math.PI / 5;
            const ix = bx + Math.cos(iang) * 1.9, iy = byy + Math.sin(iang) * 1.9;
            if (a === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
            ctx.lineTo(ix, iy);
          }
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,210,150,0.6)'; ctx.beginPath(); ctx.arc(bx, byy, 1.1, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else {
      const g = ctx.createLinearGradient(x, y, x, y + S);
      g.addColorStop(0, '#c2a86e'); g.addColorStop(1, '#a68a54');
      ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
      if (h > 0.7) { ctx.fillStyle = 'rgba(120,96,58,0.4)'; ctx.beginPath(); ctx.ellipse(x + S * 0.4, y + S * 0.45, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  } else {
    // ── Küste · Holzsteg ──
    if (depth === 0) {
      const g = ctx.createLinearGradient(x, y, x, y + S);
      g.addColorStop(0, '#bd8746'); g.addColorStop(1, '#996b34');
      ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
      // #1 Ausgetretener Steg: dezent heller getretene Planken-Mitte
      ctx.fillStyle = 'rgba(255,234,186,0.10)'; ctx.fillRect(x, y + S * 0.30, S, S * 0.42);
      // Maserung
      ctx.strokeStyle = 'rgba(255,232,184,0.10)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y + S * 0.5); ctx.lineTo(x + S, y + S * 0.5 + (h - 0.5) * 3); ctx.stroke();
      // Planken-Quernaht + versetzte Längsnaht + Nägel
      ctx.strokeStyle = 'rgba(40,26,12,0.5)';
      const seam = x + ((row % 2) ? S * 0.5 : 0);
      ctx.beginPath(); ctx.moveTo(seam, y); ctx.lineTo(seam, y + S); ctx.stroke();
      ctx.fillStyle = 'rgba(40,26,12,0.55)';
      ctx.beginPath(); ctx.arc(x + 4, y + 4, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + S - 4, y + 4, 1, 0, Math.PI * 2); ctx.fill();
      if (isTop) {
        ctx.fillStyle = 'rgba(255,238,198,0.32)'; ctx.fillRect(x, y, S, 2);
        // #2 Vordergrund-Büschel: vereinzelt Dünengras/Strandhafer zwischen den Planken
        if (tileVarHash(col * 2.1 + 3, row + 4) > 0.82) {
          const bx = x + 6 + tileVarHash(col + 4, row) * (S - 12);
          ctx.strokeStyle = '#8fa25a'; ctx.lineWidth = 1;
          for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(bx, y + 2); ctx.lineTo(bx + k * 2, y - 5 - Math.abs(k)); ctx.stroke(); }
        }
        // #2 Boden-Requisiten: ganz selten ein Poller mit Tau-Rolle am Steg-Rand
        const pr = tileVarHash(col * 2.7 + 11, row + 9);
        if (pr > 0.94) {   // Vertäu-Poller
          const bx = x + (tileVarHash(col + 2, row) > 0.5 ? S - 8 : 8);
          const g2 = ctx.createLinearGradient(bx - 3, y - 9, bx + 3, y);
          g2.addColorStop(0, '#4a4640'); g2.addColorStop(1, '#26231e');
          ctx.fillStyle = g2; ctx.fillRect(bx - 2.6, y - 8, 5.2, 8);
          ctx.beginPath(); ctx.ellipse(bx, y - 8, 3.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();   // pilzförmiger Kopf
          ctx.strokeStyle = '#b79862'; ctx.lineWidth = 1.4;   // Tau
          ctx.beginPath(); ctx.ellipse(bx, y - 3.5, 3.6, 1.6, 0, 0, Math.PI * 2); ctx.stroke();
        } else if (pr < 0.04) {   // liegende Tau-Rolle
          const bx = x + 6 + tileVarHash(col + 6, row) * (S - 12);
          ctx.strokeStyle = '#c1a066'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.ellipse(bx, y - 1.5, 4.4, 2.2, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(bx, y - 1.5, 2.4, 1.2, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
    } else {
      // Unterbau: dunkles Holz/Schatten unter dem Steg
      const g = ctx.createLinearGradient(x, y, x, y + S);
      g.addColorStop(0, '#5a3f1e'); g.addColorStop(1, '#3f2c14');
      ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
      ctx.fillStyle = 'rgba(20,12,4,0.35)'; ctx.fillRect(x + (row % 2 ? 2 : S - 6), y, 4, S);   // Pfosten-Schatten
    }
  }
  if (depth > 0 && dark > 0.01) { ctx.fillStyle = `rgba(0,0,0,${dark.toFixed(3)})`; ctx.fillRect(x, y, S, S); }
}

function tileVarHash(a: number, b: number): number {
  const n = Math.sin(a * 73.13 + b * 41.79) * 21357.913;
  return n - Math.floor(n);
}

// Dezente neutrale Sprenkel (dunkle Steinchen / helle Aufhellungen), die das
// regelmäßige Kachelmuster aufbrechen, ohne harte Tile-Grenzen zu betonen.
function applyTileVariation(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
  // W3.3 · Makro-Variation: ganze Kachel dezent heller/dunkler tönen
  // (deterministisch aus Position) → bricht Wiederholung großflächig, ergänzend
  // zu den feinen Sprenkeln unten.
  const tone = tileVarHash(col + 3, row + 5);
  const shade = (tone - 0.5) * 0.07;
  ctx.fillStyle = shade >= 0 ? `rgba(255,255,255,${shade.toFixed(3)})` : `rgba(0,0,0,${(-shade).toFixed(3)})`;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  const h = tileVarHash(col + 19, row + 7);
  if (h < 0.5) return; // nur ~Hälfte der Kacheln bekommt überhaupt Dekor
  const count = h > 0.86 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const hx = tileVarHash(col * 2 + i, row + 3);
    const hy = tileVarHash(col + 11, row * 2 + i);
    const dx = x + 5 + hx * (TILE_SIZE - 10);
    const dy = y + 5 + hy * (TILE_SIZE - 10);
    const r = 1.3 + hx * 1.5;
    ctx.fillStyle = hy > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// P4 · Stadt-Dachflächen: statt der erdigen Sprenkel eine dach-typische
// Material-Variation (Bitumen / Kies / Beton-Panel), Fugen, Kabel, Moos und
// feuchte Ränder — bricht die eine graue Einheitskachel auf. Deterministisch
// aus (col,row) → stabil beim Scrollen, kein Flimmern.
function applyCityRoofVariation(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number, isTop: boolean) {
  const S = TILE_SIZE;
  // Makro-Tönung je Kachel (Material-Helligkeit, kühl)
  const tone = tileVarHash(col + 3, row + 5);
  const shade = (tone - 0.5) * 0.10;
  ctx.fillStyle = shade >= 0 ? `rgba(150,162,188,${shade.toFixed(3)})` : `rgba(0,0,0,${(-shade).toFixed(3)})`;
  ctx.fillRect(x, y, S, S);
  const mat = Math.floor(tileVarHash(col * 1.7 + 2, row * 1.3 + 9) * 3); // 0 Bitumen, 1 Kies, 2 Beton
  if (mat === 0) {
    ctx.fillStyle = 'rgba(20,22,28,0.18)';
    const bx = x + tileVarHash(col + 4, row + 2) * S * 0.5;
    ctx.fillRect(bx, y + S * 0.3, S * 0.42, S * 0.14);
  } else if (mat === 1) {
    for (let i = 0; i < 4; i++) {
      const gx = x + 4 + tileVarHash(col * 2 + i, row + 1) * (S - 8);
      const gy = y + 4 + tileVarHash(col + 7, row * 2 + i) * (S - 8);
      ctx.fillStyle = i % 2 ? 'rgba(210,214,224,0.16)' : 'rgba(28,30,36,0.20)';
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  } else {
    ctx.strokeStyle = 'rgba(24,26,32,0.30)'; ctx.lineWidth = 1;
    const sy = y + S * (0.35 + tileVarHash(col + 5, row + 6) * 0.3);
    ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + S, sy); ctx.stroke();
  }
  if (isTop) {
    const d = tileVarHash(col + 13, row + 17);
    if (d < 0.15) {
      // Moos an einer Ecke
      ctx.fillStyle = 'rgba(90,120,70,0.35)';
      const mx = x + (d < 0.075 ? 3 : S - 6);
      ctx.beginPath(); ctx.ellipse(mx, y + 3, 4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    } else if (d < 0.27) {
      // Kabel quer über die Dachkante
      ctx.strokeStyle = 'rgba(16,16,20,0.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - 2, y + 6); ctx.quadraticCurveTo(x + S * 0.5, y + 11, x + S + 2, y + 6); ctx.stroke();
    } else if (d < 0.41) {
      // feuchter Fleck/Rand
      ctx.fillStyle = 'rgba(30,40,55,0.20)';
      const wx = x + tileVarHash(col + 9, row + 4) * S * 0.4;
      ctx.beginPath(); ctx.ellipse(wx + S * 0.3, y + S * 0.5, S * 0.26, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawTile(this: Renderer, tileType: TileType, screenX: number, screenY: number, col = -1, row = -1) {
  // Schul-Deko: positions-abhängige Variante (Pult/Bücher/Pflanze/Eimer),
  // daher nicht über den per-TileType-Cache, sondern direkt gezeichnet.
  if (tileType === TileType.DECORATION_PROP && this.currentTheme === 'school' && col >= 0) {
    this.drawSchoolProp(this.ctx, screenX, screenY, col);
    return;
  }
  if (tileType === TileType.DECORATION_PROP && this.currentTheme === 'trampoline' && col >= 0) {
    this.drawTrampolineProp(this.ctx, screenX, screenY, col);
    return;
  }
  if (tileType === TileType.DECORATION_PROP && this.currentTheme === 'gym' && col >= 0) {
    this.drawGymProp(this.ctx, screenX, screenY, col);
    return;
  }
  if (tileType === TileType.DECORATION_PROP && this.currentTheme === 'plush' && col >= 0) {
    this.drawPlushProp(this.ctx, screenX, screenY, col);
    return;
  }
  if (tileType === TileType.DECORATION_PROP && this.currentTheme === 'forest' && col >= 0) {
    this.drawForestProp(this.ctx, screenX, screenY, col);
    return;
  }
  // Welt 19 „Urlaub": Boden je Roadtrip-Abschnitt (Alpen-Fels · Tropen-Sand ·
  // Küsten-Holzsteg) — spaltenabhängig, daher direkt gezeichnet (nicht über den
  // per-TileType-Cache).
  if (this.currentTheme === 'vacation' && col >= 0 && VACATION_GROUND.has(tileType)) {
    // Foto-Modus: der Weg ist in der Kulisse eingearbeitet → Boden-Tiles NICHT
    // zeichnen (Kollision bleibt über die Level-Daten erhalten), das Bild ist der Weg.
    // (Ein per-Abschnitt-Tint an der Gehlinie wurde getestet und verworfen: über dem
    // Foto-Sandweg entweder unsichtbar oder als Fleck störend. Abschnitts-Charakter
    // kommt aus der Foto-Kulisse + den themenfarbenen Stufen.)
    if (USE_VACATION_PHOTO) return;
    const isTop = tileType === TileType.GROUND_TOP
      || tileType === TileType.GROUND_TOP_LEFT || tileType === TileType.GROUND_TOP_RIGHT;
    drawVacationGroundColumn(this.ctx, screenX, screenY, col, row, isTop, this.currentGroundRow);
    return;
  }
  // Welt 19: Einweg-Plattformen (Stege/Sims) spaltenabhängig je Abschnitt gefärbt
  // (Alpen Stein-Holz · Tropen Bambus · Küste Holz) — daher direkt, nicht gecacht.
  if (this.currentTheme === 'vacation' && col >= 0 && tileType === TileType.WOOD_PLATFORM) {
    this.ctx.save(); this.ctx.translate(screenX, screenY);
    drawVacationPlatform(this.ctx, col);
    this.ctx.restore();
    return;
  }
  // Theme switches call tileCache.clear(), so the bare TileType enum value
  // is sufficient as a key. Avoids per-frame string allocation.
  let cached = this.tileCache.get(tileType);
  if (!cached) {
    cached = this.renderTileToCache(tileType);
    this.tileCache.set(tileType, cached);
  }
  this.ctx.drawImage(cached, screenX, screenY);
  // AP 1.5: positionsabhängige Variation gegen sichtbares Kacheln. Nur im
  // Spiel-Tile-Pass (col/row gesetzt), ab Qualitätsstufe 'mid', auf erdigen
  // Flächen. HUD-Deko ruft ohne col/row → keine Variation.
  if (col >= 0 && this.quality !== 'low' && VARIABLE_TILES.has(tileType)) {
    if (this.currentTheme === 'city') {
      const isTop = tileType === TileType.GROUND_TOP
        || tileType === TileType.GROUND_TOP_LEFT || tileType === TileType.GROUND_TOP_RIGHT;
      applyCityRoofVariation(this.ctx, screenX, screenY, col, row, isTop);
    } else {
      applyTileVariation(this.ctx, screenX, screenY, col, row);
    }
  }
  // Tiefe Erdschichten (deutlich unter dem Hauptboden) abdunkeln, damit der
  // unnötig sichtbare Untergrund optisch zurücktritt ("fast weg"). Greift nur
  // bei Levels mit unterirdischen Räumen, wo die Spielfläche tiefer reicht.
  if (col >= 0 && row > this.currentGroundRow + 2 && VARIABLE_TILES.has(tileType)) {
    const depth = row - (this.currentGroundRow + 2);
    const a = Math.min(0.5, depth * 0.1);
    this.ctx.fillStyle = `rgba(8, 5, 3, ${a})`;
    this.ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
  }
}

function renderTileToCache(this: Renderer, type: TileType): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext('2d')!;

  const theme = this.currentTheme;
  // Drachenhöhle nutzt das Höhlen-Tileset (dunkler Fels, Kristalle); die grüne
  // Drachen-Stimmung kommt über Grade/Accent/Tint + Fossil-Blöcke + Deko.
  const isDragon = theme === 'dragon';
  const isCave = theme === 'cave' || isDragon;
  const isSky = theme === 'sky';
  const isBeach = theme === 'beach';
  const isAustralia = theme === 'australia';
  const isVolcano = theme === 'volcano';
  const isUnderwater = theme === 'underwater';
  const isSchool = theme === 'school';
  const isGym = theme === 'gym';
  const isTrampoline = theme === 'trampoline';
  const isPlush = theme === 'plush';
  const isCity = theme === 'city';
  const isVacation = theme === 'vacation';
  switch (type) {
    case TileType.GROUND:
      if (isCave) this.drawCaveGroundTile(ctx, false);
      else if (isSky) this.drawSkyGroundTile(ctx, false);
      else if (isBeach) this.drawBeachGroundTile(ctx, false);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, false);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, false);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, false);
      else if (isSchool) this.drawSchoolGroundTile(ctx, false);
      else if (isGym) this.drawGymFloorTile(ctx, false);
      else if (isPlush) this.drawPlushFloorTile(ctx, false);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, false);
      else if (isCity) this.drawCityRoofTile(ctx, false);
      else this.drawGroundTile(ctx, false, false, false, false);
      break;
    case TileType.GROUND_TOP:
      if (isCave) this.drawCaveGroundTile(ctx, true);
      else if (isSky) this.drawSkyGroundTile(ctx, true);
      else if (isBeach) this.drawBeachGroundTile(ctx, true);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, true);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, true);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, true);
      else if (isSchool) this.drawSchoolGroundTile(ctx, true);
      else if (isGym) this.drawGymFloorTile(ctx, true);
      else if (isPlush) this.drawPlushFloorTile(ctx, true);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, true);
      else if (isCity) this.drawCityRoofTile(ctx, true);
      else this.drawGroundTile(ctx, true, false, false, false);
      // W3.3 · Kanten-Highlight (rim light) an der Oberkante, theme-abhängig.
      ctx.fillStyle = TOP_RIM[theme] ?? 'rgba(255,255,255,0.30)';
      ctx.fillRect(0, 0, TILE_SIZE, 1.5);
      break;
    case TileType.GROUND_LEFT:
      if (isCave) this.drawCaveGroundTile(ctx, false);
      else if (isSky) this.drawSkyGroundTile(ctx, false);
      else if (isBeach) this.drawBeachGroundTile(ctx, false);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, false);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, false);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, false);
      else if (isSchool) this.drawSchoolGroundTile(ctx, false);
      else if (isGym) this.drawGymFloorTile(ctx, false);
      else if (isPlush) this.drawPlushFloorTile(ctx, false);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, false);
      else if (isCity) this.drawCityRoofTile(ctx, false);
      else this.drawGroundTile(ctx, false, true, false, false);
      break;
    case TileType.GROUND_RIGHT:
      if (isCave) this.drawCaveGroundTile(ctx, false);
      else if (isSky) this.drawSkyGroundTile(ctx, false);
      else if (isBeach) this.drawBeachGroundTile(ctx, false);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, false);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, false);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, false);
      else if (isSchool) this.drawSchoolGroundTile(ctx, false);
      else if (isGym) this.drawGymFloorTile(ctx, false);
      else if (isPlush) this.drawPlushFloorTile(ctx, false);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, false);
      else if (isCity) this.drawCityRoofTile(ctx, false);
      else this.drawGroundTile(ctx, false, false, true, false);
      break;
    case TileType.GROUND_TOP_LEFT:
      if (isCave) this.drawCaveGroundTile(ctx, true);
      else if (isSky) this.drawSkyGroundTile(ctx, true);
      else if (isBeach) this.drawBeachGroundTile(ctx, true);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, true);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, true);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, true);
      else if (isSchool) this.drawSchoolGroundTile(ctx, true);
      else if (isGym) this.drawGymFloorTile(ctx, true);
      else if (isPlush) this.drawPlushFloorTile(ctx, true);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, true);
      else this.drawGroundTile(ctx, true, true, false, false);
      break;
    case TileType.GROUND_TOP_RIGHT:
      if (isCave) this.drawCaveGroundTile(ctx, true);
      else if (isSky) this.drawSkyGroundTile(ctx, true);
      else if (isBeach) this.drawBeachGroundTile(ctx, true);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, true);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, true);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, true);
      else if (isSchool) this.drawSchoolGroundTile(ctx, true);
      else if (isGym) this.drawGymFloorTile(ctx, true);
      else if (isPlush) this.drawPlushFloorTile(ctx, true);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, true);
      else this.drawGroundTile(ctx, true, false, true, false);
      break;
    case TileType.PLATFORM:
      if (isGym) this.drawGymReckTile(ctx);
      else this.drawPlatformTile(ctx);
      break;
    case TileType.QUESTION_BLOCK:
      this.drawQuestionBlock(ctx, false);
      break;
    case TileType.QUESTION_BLOCK_USED:
      this.drawQuestionBlock(ctx, true);
      break;
    case TileType.NOTE_BLOCK:
      if (isTrampoline) this.drawTrampolineNote(ctx);
      else if (isGym) this.drawGymNote(ctx);
      else if (isPlush) this.drawPlushPillowTile(ctx);
      else this.drawNoteBlock(ctx);
      break;
    case TileType.BRICK:
      if (isCave) this.drawCaveBrickTile(ctx);
      else if (isSky) this.drawSkyBrickTile(ctx);
      else if (isBeach) this.drawBeachBrickTile(ctx);
      else if (isAustralia) this.drawAustraliaBrickTile(ctx);
      else if (isVolcano) this.drawVolcanoBrickTile(ctx);
      else if (isUnderwater) this.drawUnderwaterBrickTile(ctx);
      else this.drawBrickTile(ctx);
      break;
    case TileType.PIPE_TOP_LEFT:
      if (isCave) this.drawCavePipeTile(ctx, 'top-left');
      else if (isBeach) this.drawBeachPipeTile(ctx, 'top-left');
      else if (isAustralia) this.drawAustraliaPipeTile(ctx, 'top-left');
      else if (isSchool || isGym || isTrampoline) this.drawSchoolPipeTile(ctx, 'top-left');
      else this.drawPipeTile(ctx, 'top-left');
      break;
    case TileType.PIPE_TOP_RIGHT:
      if (isCave) this.drawCavePipeTile(ctx, 'top-right');
      else if (isBeach) this.drawBeachPipeTile(ctx, 'top-right');
      else if (isAustralia) this.drawAustraliaPipeTile(ctx, 'top-right');
      else if (isSchool || isGym || isTrampoline) this.drawSchoolPipeTile(ctx, 'top-right');
      else this.drawPipeTile(ctx, 'top-right');
      break;
    case TileType.PIPE_BODY_LEFT:
      if (isCave) this.drawCavePipeTile(ctx, 'body-left');
      else if (isBeach) this.drawBeachPipeTile(ctx, 'body-left');
      else if (isAustralia) this.drawAustraliaPipeTile(ctx, 'body-left');
      else if (isSchool || isGym || isTrampoline) this.drawSchoolPipeTile(ctx, 'body-left');
      else this.drawPipeTile(ctx, 'body-left');
      break;
    case TileType.PIPE_BODY_RIGHT:
      if (isCave) this.drawCavePipeTile(ctx, 'body-right');
      else if (isBeach) this.drawBeachPipeTile(ctx, 'body-right');
      else if (isAustralia) this.drawAustraliaPipeTile(ctx, 'body-right');
      else if (isSchool || isGym || isTrampoline) this.drawSchoolPipeTile(ctx, 'body-right');
      else this.drawPipeTile(ctx, 'body-right');
      break;
    case TileType.STONE:
      if (isCave) this.drawCaveStoneTile(ctx);
      else if (isSky) this.drawSkyStoneTile(ctx);
      else if (isBeach) this.drawBeachStoneTile(ctx);
      else if (isAustralia) this.drawAustraliaStoneTile(ctx);
      else if (isVolcano) this.drawVolcanoStoneTile(ctx);
      else if (isUnderwater) this.drawUnderwaterStoneTile(ctx);
      else if (isGym) this.drawGymVaultTile(ctx);
      else if (isPlush) this.drawPlushBlockTile(ctx);
      else this.drawStoneTile(ctx);
      break;
    case TileType.WOOD_PLATFORM:
      if (isCave) this.drawCaveWoodPlatform(ctx);
      else if (isSky) this.drawSkyCloudPlatform(ctx);
      else if (isBeach) this.drawBeachWoodPlatform(ctx);
      else if (isAustralia) this.drawAustraliaWoodPlatform(ctx);
      else if (isSchool) this.drawSchoolPlatformTile(ctx);
      else if (isGym) this.drawGymBarTile(ctx);
      else if (isPlush) this.drawPlushLedge(ctx);
      else if (isTrampoline) this.drawTrampolinePlatformTile(ctx);
      else if (isVacation) drawVacationPlatform(ctx);
      else this.drawWoodPlatform(ctx);
      break;
    case TileType.SLOPE_RIGHT_45:
      this.drawSlopeTile(ctx, 1);
      break;
    case TileType.SLOPE_LEFT_45:
      this.drawSlopeTile(ctx, -1);
      break;
    case TileType.MOSS_GROUND:
      if (isSky) this.drawSkyGroundTile(ctx, true);
      else if (isBeach) this.drawBeachGroundTile(ctx, true);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, true);
      else this.drawMossGround(ctx);
      break;
    case TileType.DECORATION_VINE:
      this.drawVine(ctx);
      break;
    case TileType.ROPE:
      this.drawRopeTile(ctx);
      break;
    case TileType.DECORATION_FLOWER:
      this.drawFlower(ctx);
      break;
    case TileType.DECORATION_PROP:
      this.drawThemedProp(ctx);
      break;
    case TileType.WATER_TOP:
      if (isCave) this.drawCaveLava(ctx, true);
      else if (isVacation) drawVacationLagoon(ctx, true);
      else if (isBeach) this.drawBeachWater(ctx, true, !isUnderwater);
      else this.drawWater(ctx, true, !isUnderwater);
      break;
    case TileType.WATER:
      if (isCave) this.drawCaveLava(ctx, false);
      else if (isVacation) drawVacationLagoon(ctx, false);
      else if (isBeach) this.drawBeachWater(ctx, false, !isUnderwater);
      else this.drawWater(ctx, false, !isUnderwater);
      break;
    // --- New themed tile fallbacks (volcano / ice / castle / underwater / space) ---
    case TileType.LAVA_TOP:
      if (isCity) this.drawCityGarbage(ctx, true);
      else this.drawCaveLava(ctx, true);
      break;
    case TileType.LAVA:
      if (isCity) this.drawCityGarbage(ctx, false);
      else this.drawCaveLava(ctx, false);
      break;
    case TileType.ICE_TOP:
      this.drawIceTile(ctx, true);
      break;
    case TileType.ICE:
      this.drawIceTile(ctx, false);
      break;
    case TileType.CASTLE_TOP:
      this.drawCastleStoneTile(ctx, true);
      break;
    case TileType.CASTLE_STONE:
      this.drawCastleStoneTile(ctx, false);
      break;
    case TileType.SPACE_TOP:
      this.drawSpaceMetalTile(ctx, true);
      break;
    case TileType.SPACE_METAL:
      this.drawSpaceMetalTile(ctx, false);
      break;
    case TileType.DEEP_WATER:
      this.drawWater(ctx, false);
      break;
    case TileType.SEAWEED:
      this.drawVine(ctx);
      break;
    case TileType.SPIKE:
      this.drawSpikeTile(ctx);
      break;
    case TileType.SIGN:
      this.drawSign(ctx);
      break;
  }

  // Per-theme tile detail overlay — baked into the tile cache so it has
  // zero per-frame cost. Adds tiny world-specific micro-details to the
  // GROUND/GROUND_TOP tiles so each world reads visually distinct even
  // before backgrounds and enemies render. Skipped for non-ground tiles
  // and for the cave theme (already heavily decorated by drawCaveGroundTile).
  const isGround = type === TileType.GROUND || type === TileType.GROUND_TOP
    || type === TileType.GROUND_LEFT || type === TileType.GROUND_RIGHT
    || type === TileType.GROUND_TOP_LEFT || type === TileType.GROUND_TOP_RIGHT;
  if (isGround) {
    const isTop = type === TileType.GROUND_TOP || type === TileType.GROUND_TOP_LEFT || type === TileType.GROUND_TOP_RIGHT;
    applyThemeDetailOverlay(ctx, theme, isTop, type);
  }

  return c;
}

// Per-theme micro-detail overlay. Uses a deterministic pseudo-random so
// every cached tile of the same type+theme renders identically. All
// drawing is restricted to a few primitives (rect/arc) for speed.
function applyThemeDetailOverlay(ctx: CanvasRenderingContext2D, theme: string, isTop: boolean, typeSeed: number) {
  const S = TILE_SIZE;
  const rand = (n: number) => ((n * 1103515245 + 12345 + typeSeed * 17) & 0x7fffffff) / 0x7fffffff;
  ctx.save();

  switch (theme) {
    case 'jungle': {
      // Mossy fuzz + tiny twigs on the top edge; small leaf chips on body.
      if (isTop) {
        for (let i = 0; i < 6; i++) {
          const mx = Math.floor(rand(i + 1) * S);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(80, 180, 60, 0.7)' : 'rgba(120, 200, 80, 0.55)';
          ctx.fillRect(mx, -1, 2, 2);
        }
        ctx.fillStyle = 'rgba(255, 220, 90, 0.55)';
        ctx.fillRect(Math.floor(rand(99) * (S - 4)), 1, 1, 1);
      }
      ctx.fillStyle = 'rgba(50, 120, 40, 0.35)';
      ctx.fillRect(3, S - 7, 2, 1);
      ctx.fillRect(S - 9, S - 5, 3, 1);
      ctx.fillRect(11, S - 4, 2, 1);
      break;
    }
    case 'sky': {
      // Wispy cloud bits along bottom + a faint shimmer pip on top.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let i = 0; i < 4; i++) {
        const cx = Math.floor(rand(i + 11) * S);
        ctx.fillRect(cx, S - 3, 3, 1);
      }
      if (isTop) {
        ctx.fillStyle = 'rgba(200, 240, 255, 0.7)';
        ctx.fillRect(Math.floor(rand(7) * S), 1, 1, 1);
      }
      break;
    }
    case 'beach': {
      // Tiny shells + pale sand sparkles.
      ctx.strokeStyle = 'rgba(255, 200, 150, 0.55)';
      ctx.lineWidth = 0.8;
      const shellX = 4 + Math.floor(rand(3) * (S - 8));
      const shellY = isTop ? 6 : Math.floor(rand(5) * (S - 6)) + 2;
      ctx.beginPath();
      ctx.arc(shellX, shellY, 2, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 250, 220, 0.85)';
      ctx.fillRect(Math.floor(rand(15) * S), Math.floor(rand(17) * S), 1, 1);
      ctx.fillRect(Math.floor(rand(21) * S), Math.floor(rand(23) * S), 1, 1);
      break;
    }
    case 'australia': {
      // Red dust grain + a tiny acacia leaf spec.
      ctx.fillStyle = 'rgba(160, 70, 30, 0.5)';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(Math.floor(rand(i + 31) * S), Math.floor(rand(i + 41) * S), 1, 1);
      }
      if (isTop) {
        ctx.fillStyle = 'rgba(120, 160, 60, 0.65)';
        ctx.beginPath();
        ctx.ellipse(Math.floor(rand(51) * (S - 4)) + 2, 2, 2, 1, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'volcano': {
      // Faint ember pips glowing in the cracks.
      for (let i = 0; i < 3; i++) {
        const ex = Math.floor(rand(i + 61) * S);
        const ey = Math.floor(rand(i + 71) * S);
        ctx.fillStyle = `rgba(255, ${120 + i * 30}, 30, 0.85)`;
        ctx.fillRect(ex, ey, 1, 1);
      }
      if (isTop) {
        ctx.fillStyle = 'rgba(255, 180, 60, 0.6)';
        ctx.fillRect(Math.floor(rand(81) * (S - 3)) + 1, 0, 2, 1);
      }
      break;
    }
    case 'ice': {
      // Sparkling frost crystals.
      for (let i = 0; i < 4; i++) {
        const fx = Math.floor(rand(i + 91) * S);
        const fy = Math.floor(rand(i + 101) * S);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(fx, fy, 1, 1);
        ctx.fillStyle = 'rgba(180, 230, 255, 0.55)';
        ctx.fillRect(fx - 1, fy, 1, 1);
        ctx.fillRect(fx + 1, fy, 1, 1);
      }
      break;
    }
    case 'castle': {
      // Faint rune scratches + extra crack.
      ctx.strokeStyle = 'rgba(220, 200, 120, 0.35)';
      ctx.lineWidth = 0.8;
      const rx = 6 + Math.floor(rand(111) * (S - 12));
      const ry = 6 + Math.floor(rand(121) * (S - 12));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 3, ry - 2);
      ctx.lineTo(rx + 6, ry);
      ctx.stroke();
      break;
    }
    case 'underwater': {
      // Tiny barnacles and bubble bumps.
      ctx.fillStyle = 'rgba(220, 240, 255, 0.55)';
      for (let i = 0; i < 3; i++) {
        const bx = Math.floor(rand(i + 131) * (S - 4)) + 2;
        const by = isTop ? 4 + i : Math.floor(rand(i + 141) * (S - 4)) + 2;
        ctx.beginPath();
        ctx.arc(bx, by, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255, 200, 120, 0.45)';
      ctx.fillRect(S - 6, S - 5, 2, 2);
      break;
    }
    case 'space': {
      // Faint hex circuit dots + a single LED pip.
      ctx.fillStyle = 'rgba(140, 200, 255, 0.55)';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(Math.floor(rand(i + 151) * S), Math.floor(rand(i + 161) * S), 1, 1);
      }
      if (isTop) {
        ctx.fillStyle = 'rgba(120, 240, 200, 0.95)';
        ctx.fillRect(Math.floor(rand(171) * (S - 3)) + 1, 1, 2, 1);
      }
      break;
    }
    case 'plush': {
      // Weiche Stoff-Naht (Steppstiche) am oberen Rand + kleiner Filz-Fussel.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      if (isTop) {
        ctx.beginPath();
        ctx.moveTo(2, 4);
        ctx.lineTo(S - 2, 4);
        ctx.stroke();
      }
      // Ein diagonaler Stich quer über den Körper.
      ctx.beginPath();
      ctx.moveTo(4, S - 6);
      ctx.lineTo(S - 5, S - 9);
      ctx.stroke();
      ctx.setLineDash([]);
      // Zwei pastellige Filz-Punkte.
      ctx.fillStyle = 'rgba(255, 190, 225, 0.45)';
      ctx.beginPath(); ctx.arc(Math.floor(rand(181) * S), Math.floor(rand(191) * (S - 6)) + 4, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(190, 225, 255, 0.4)';
      ctx.beginPath(); ctx.arc(Math.floor(rand(201) * S), Math.floor(rand(211) * (S - 6)) + 4, 1.2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'gym': {
      // Holzboden-Maserung (senkrechte Fugen) + eine dünne Markierungslinie.
      ctx.strokeStyle = 'rgba(120, 75, 30, 0.28)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const gx = 8 + Math.floor(rand(i + 221) * (S - 12));
        ctx.beginPath();
        ctx.moveTo(gx, 2);
        ctx.lineTo(gx, S - 2);
        ctx.stroke();
      }
      if (isTop) {
        // Aufgemalte Sportfeld-Linie (weiss).
        ctx.strokeStyle = 'rgba(255, 250, 230, 0.6)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(S, 5);
        ctx.stroke();
      }
      break;
    }
    case 'school': {
      // Linoleum-Fliesenfugen (Kreuzraster) + kleiner Kreide-Fussel.
      ctx.strokeStyle = 'rgba(120, 95, 60, 0.22)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S);
      ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(Math.floor(rand(231) * S), Math.floor(rand(241) * S), 1, 1);
      break;
    }
    case 'trampoline': {
      // Federndes Netz-Gewebe (Punktraster) + Naht.
      ctx.fillStyle = 'rgba(180, 255, 225, 0.4)';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(Math.floor(rand(i + 251) * S), Math.floor(rand(i + 261) * S), 1, 1);
      }
      if (isTop) {
        ctx.strokeStyle = 'rgba(120, 255, 200, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 4); ctx.lineTo(S, 4);
        ctx.stroke();
      }
      break;
    }
    case 'bluefield': {
      // Blaugrüne Grashalme am oberen Rand + ein kleiner Blütenpunkt.
      if (isTop) {
        ctx.strokeStyle = 'rgba(120, 220, 180, 0.65)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const bx = Math.floor(rand(i + 271) * S);
          ctx.beginPath();
          ctx.moveTo(bx, 3);
          ctx.lineTo(bx + (i % 2 === 0 ? 1.5 : -1.5), -3);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 240, 150, 0.8)';
        ctx.beginPath(); ctx.arc(Math.floor(rand(281) * (S - 4)) + 2, 1, 1.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(90, 180, 210, 0.3)';
      ctx.fillRect(Math.floor(rand(291) * S), Math.floor(rand(301) * (S - 6)) + 4, 1, 1);
      break;
    }
    default: break;
  }

  // Tiefen-Kanten für die zuvor vernachlässigten Böden: heller Licht-Saum
  // ganz oben (Sonnenkante) + weicher Schatten am unteren Rand (Kontakt-AO).
  // Die bereits reich texturierten Welten bleiben unangetastet.
  if (theme === 'plush' || theme === 'gym' || theme === 'school'
    || theme === 'trampoline' || theme === 'bluefield') {
    if (isTop) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(0, 0, S, 1);
    }
    const ao = ctx.createLinearGradient(0, S - 5, 0, S);
    ao.addColorStop(0, 'rgba(0,0,0,0)');
    ao.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = ao;
    ctx.fillRect(0, S - 5, S, 5);
  }
  ctx.restore();
}

function drawIceTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#eaf8ff');
  grad.addColorStop(0.5, '#a8d8ee');
  grad.addColorStop(1, '#5d96b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Crystal facet highlights — diagonal sheen.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(S * 0.6, 0);
  ctx.lineTo(0, S * 0.6);
  ctx.closePath();
  ctx.fill();

  // Cracks / fissures.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const x0 = 4 + i * 9;
    ctx.beginPath();
    ctx.moveTo(x0, 4);
    ctx.lineTo(x0 + 3, 12);
    ctx.lineTo(x0 + 1, S - 4);
    ctx.stroke();
  }

  // Snow crust on top with little rounded blobs + tiny icicle.
  if (top) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(S * 0.15, 0, S * 0.3, 3);
    ctx.quadraticCurveTo(S * 0.5, 6, S * 0.7, 2);
    ctx.quadraticCurveTo(S * 0.85, 0, S, 4);
    ctx.lineTo(S, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(180, 220, 240, 0.7)';
    ctx.beginPath();
    ctx.moveTo(S * 0.7, 4);
    ctx.lineTo(S * 0.74, 10);
    ctx.lineTo(S * 0.66, 4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(40, 80, 110, 0.6)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawCastleStoneTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#807c70');
  grad.addColorStop(0.5, '#5d5a4e');
  grad.addColorStop(1, '#36322a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Block faces — staggered brickwork.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
  ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S / 2);
  ctx.moveTo(S / 4, S / 2); ctx.lineTo(S / 4, S);
  ctx.moveTo((3 * S) / 4, S / 2); ctx.lineTo((3 * S) / 4, S);
  ctx.stroke();

  // Highlight on top of each brick (light from above).
  ctx.strokeStyle = 'rgba(255, 240, 220, 0.18)';
  ctx.beginPath();
  ctx.moveTo(0, 1); ctx.lineTo(S, 1);
  ctx.moveTo(0, S / 2 + 1); ctx.lineTo(S / 4, S / 2 + 1);
  ctx.moveTo(S / 4, S / 2 + 1); ctx.lineTo((3 * S) / 4, S / 2 + 1);
  ctx.stroke();

  // Wear/cracks — tiny dark specks.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(6, 4, 2, 1);
  ctx.fillRect(20, 8, 1, 2);
  ctx.fillRect(10, 20, 1, 1);
  ctx.fillRect(24, 22, 2, 1);

  // Mossy patches.
  ctx.fillStyle = 'rgba(60, 110, 50, 0.4)';
  ctx.fillRect(2, S - 6, 4, 3);
  ctx.fillRect(S - 8, S - 4, 5, 2);
  ctx.fillStyle = 'rgba(80, 140, 60, 0.3)';
  ctx.fillRect(14, S - 5, 3, 2);

  if (top) {
    ctx.fillStyle = 'rgba(255, 250, 230, 0.18)';
    ctx.fillRect(0, 0, S, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(4 + i * 10, 0, 4, 2);
    }
  }

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawSpaceMetalTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#525c70');
  grad.addColorStop(0.5, '#2c3344');
  grad.addColorStop(1, '#10141e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Diagonal brushed-metal sheen.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (let d = -S; d < S; d += 4) {
    ctx.fillRect(d, 0, 1, S);
  }

  // Panel seam line.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
  ctx.stroke();

  // Recessed center rectangle (panel inset).
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.strokeRect(S * 0.18, S * 0.18, S * 0.64, S * 0.32);
  ctx.strokeStyle = 'rgba(140, 160, 200, 0.25)';
  ctx.strokeRect(S * 0.18 + 1, S * 0.18 + 1, S * 0.64 - 2, S * 0.32 - 2);

  // Rivets at corners with highlight.
  [3, S - 4].forEach(rx => [3, S - 4].forEach(ry => {
    ctx.fillStyle = '#8893a8';
    ctx.beginPath();
    ctx.arc(rx, ry, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(rx - 0.5, ry - 0.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }));

  if (top) {
    const stripGrad = ctx.createLinearGradient(0, 0, 0, 4);
    stripGrad.addColorStop(0, '#bce8ff');
    stripGrad.addColorStop(1, '#3a8fcc');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(0, 0, S, 3);
    ctx.fillStyle = 'rgba(120, 200, 255, 0.45)';
    ctx.fillRect(0, 3, S, 1);
  }

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

// Volcano theme — dark charred soil with glowing cracks.
function drawVolcanoGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const soilStart = top ? Math.floor(S * 0.28) : 0;

  const fillTone = '#190d0a';
  if (top) {
    const grad = ctx.createLinearGradient(0, soilStart, 0, S);
    grad.addColorStop(0, '#3a2018');
    grad.addColorStop(0.5, '#241410');
    grad.addColorStop(1, fillTone);
    ctx.fillStyle = grad;
    ctx.fillRect(0, soilStart, S, S - soilStart);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, soilStart, S, S - soilStart);
  }

  if (top) {
    const crustGrad = ctx.createLinearGradient(0, 0, 0, soilStart);
    crustGrad.addColorStop(0, '#1a0a08');
    crustGrad.addColorStop(1, '#2a1410');
    ctx.fillStyle = crustGrad;
    ctx.fillRect(0, 0, S, soilStart);
    ctx.strokeStyle = 'rgba(255, 120, 30, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, soilStart - 1);
    ctx.lineTo(8, soilStart - 4);
    ctx.lineTo(14, soilStart - 1);
    ctx.lineTo(20, soilStart - 5);
    ctx.lineTo(26, soilStart - 2);
    ctx.lineTo(S - 1, soilStart - 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 100, 30, 0.25)';
    ctx.fillRect(0, soilStart - 1, S, 3);
  }

  ctx.fillStyle = 'rgba(80, 40, 30, 0.35)';
  ctx.fillRect(4, soilStart + 4, 2, 2);
  ctx.fillRect(14, soilStart + 8, 3, 2);
  ctx.fillRect(22, soilStart + 5, 2, 2);
  ctx.fillRect(8, S - 6, 2, 2);
  ctx.fillRect(20, S - 8, 3, 2);

  ctx.fillStyle = 'rgba(255, 140, 50, 0.55)';
  ctx.fillRect(10, S - 10, 1, 1);
  ctx.fillRect(24, S - 14, 1, 1);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawVolcanoBrickTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#5a2818');
  grad.addColorStop(0.5, '#3a160c');
  grad.addColorStop(1, '#1a0804');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
  ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S / 2);
  ctx.moveTo(S / 4, S / 2); ctx.lineTo(S / 4, S);
  ctx.moveTo((3 * S) / 4, S / 2); ctx.lineTo((3 * S) / 4, S);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 100, 30, 0.45)';
  ctx.beginPath();
  ctx.moveTo(0, S / 2 + 0.5); ctx.lineTo(S * 0.45, S / 2 + 0.5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 140, 80, 0.12)';
  ctx.fillRect(2, 2, S / 2 - 4, 1);
  ctx.fillRect(S / 2 + 2, 2, S / 2 - 4, 1);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawVolcanoStoneTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#2a2018');
  grad.addColorStop(0.5, '#1a1008');
  grad.addColorStop(1, '#080404');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(255, 90, 20, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, 6); ctx.lineTo(8, 12); ctx.lineTo(14, 8); ctx.lineTo(22, 18); ctx.lineTo(S - 2, 14);
  ctx.moveTo(4, S - 6); ctx.lineTo(12, S - 10); ctx.lineTo(20, S - 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 140, 40, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(2, 6); ctx.lineTo(8, 12); ctx.lineTo(14, 8); ctx.lineTo(22, 18); ctx.lineTo(S - 2, 14);
  ctx.stroke();
  ctx.fillStyle = 'rgba(80, 50, 40, 0.5)';
  ctx.fillRect(6, 18, 2, 2);
  ctx.fillRect(18, 6, 2, 2);
  ctx.fillRect(26, 24, 2, 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

// Underwater theme — sandy/coral seafloor.
function drawUnderwaterGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const soilStart = top ? Math.floor(S * 0.22) : 0;

  const fillTone = '#725a3c';
  if (top) {
    const grad = ctx.createLinearGradient(0, soilStart, 0, S);
    grad.addColorStop(0, '#a89060');
    grad.addColorStop(0.5, '#8a7048');
    grad.addColorStop(1, fillTone);
    ctx.fillStyle = grad;
    ctx.fillRect(0, soilStart, S, S - soilStart);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, soilStart, S, S - soilStart);
  }

  if (top) {
    const crestGrad = ctx.createLinearGradient(0, 0, 0, soilStart);
    crestGrad.addColorStop(0, '#d8c490');
    crestGrad.addColorStop(1, '#b89860');
    ctx.fillStyle = crestGrad;
    ctx.fillRect(0, 0, S, soilStart);
    ctx.fillStyle = 'rgba(255, 245, 200, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, soilStart - 2);
    ctx.quadraticCurveTo(S * 0.25, soilStart - 5, S * 0.5, soilStart - 2);
    ctx.quadraticCurveTo(S * 0.75, soilStart + 1, S, soilStart - 2);
    ctx.lineTo(S, soilStart);
    ctx.lineTo(0, soilStart);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(220, 100, 130, 0.85)';
    ctx.fillRect(S * 0.55, 1, 2, 4);
    ctx.fillRect(S * 0.6, 3, 2, 3);
  }

  ctx.fillStyle = 'rgba(255, 240, 200, 0.3)';
  for (let i = 0; i < 8; i++) {
    const gx = (i * 7 + 3) % S;
    const gy = soilStart + 4 + ((i * 5) % (S - soilStart - 6));
    ctx.fillRect(gx, gy, 1, 1);
  }
  ctx.fillStyle = 'rgba(200, 170, 140, 0.5)';
  ctx.fillRect(6, S - 8, 2, 2);
  ctx.fillRect(20, S - 5, 2, 1);
  ctx.fillStyle = 'rgba(140, 80, 100, 0.4)';
  ctx.fillRect(14, S - 12, 1, 1);

  ctx.strokeStyle = 'rgba(40, 60, 80, 0.4)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawUnderwaterBrickTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#5a8a98');
  grad.addColorStop(0.5, '#3d6c7c');
  grad.addColorStop(1, '#1f4458');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(20, 40, 60, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
  ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S / 2);
  ctx.moveTo(S / 4, S / 2); ctx.lineTo(S / 4, S);
  ctx.moveTo((3 * S) / 4, S / 2); ctx.lineTo((3 * S) / 4, S);
  ctx.stroke();
  ctx.fillStyle = 'rgba(60, 130, 90, 0.55)';
  ctx.fillRect(2, S - 6, 5, 3);
  ctx.fillRect(S - 8, 2, 4, 2);
  ctx.fillStyle = 'rgba(180, 200, 160, 0.4)';
  ctx.fillRect(14, 4, 2, 2);
  ctx.fillRect(20, 18, 2, 2);
  ctx.fillStyle = 'rgba(180, 220, 230, 0.18)';
  ctx.fillRect(2, 2, S / 2 - 4, 1);
  ctx.fillRect(S / 2 + 2, 2, S / 2 - 4, 1);
  ctx.strokeStyle = 'rgba(20, 40, 60, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawUnderwaterStoneTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#506878');
  grad.addColorStop(0.5, '#324858');
  grad.addColorStop(1, '#16242e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(0, 10, 20, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, 8); ctx.lineTo(10, 14); ctx.lineTo(18, 8); ctx.lineTo(28, 16);
  ctx.moveTo(4, S - 6); ctx.lineTo(14, S - 10); ctx.lineTo(24, S - 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(50, 110, 90, 0.6)';
  ctx.fillRect(0, 0, S, 3);
  ctx.fillRect(0, 3, 3, 2);
  ctx.fillRect(S - 4, 3, 4, 2);
  ctx.fillStyle = 'rgba(140, 160, 180, 0.5)';
  ctx.fillRect(6, 18, 2, 2);
  ctx.fillRect(18, 24, 2, 2);
  ctx.fillRect(26, 8, 2, 2);
  ctx.strokeStyle = 'rgba(10, 20, 30, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawSpikeTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#cccfd6';
  ctx.strokeStyle = '#3a3d44';
  ctx.lineWidth = 1;
  const spikes = 4;
  for (let i = 0; i < spikes; i++) {
    const x = (i + 0.5) * (S / spikes);
    ctx.beginPath();
    ctx.moveTo(x - S / (spikes * 2), S);
    ctx.lineTo(x, 4);
    ctx.lineTo(x + S / (spikes * 2), S);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawThemedProp(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const theme = this.currentTheme;
  const t = this.time;
  ctx.save();
  if (theme === 'cave' || theme === 'space') {
    // Kristall-Cluster — Höhle jetzt kühl-teal statt Lila (Stephan-Wunsch),
    // Weltraum bleibt cyan.
    const base = theme === 'space' ? ['#7fd0ff', '#4f9fe0'] : ['#5fc7c0', '#3a9a95'];
    for (let i = 0; i < 3; i++) {
      const bx = S * 0.28 + i * S * 0.22;
      const h = S * (0.36 + (i === 1 ? 0.24 : 0.08));
      ctx.fillStyle = base[i % 2];
      ctx.beginPath();
      ctx.moveTo(bx - 3.5, S);
      ctx.lineTo(bx - 2, S - h * 0.55);
      ctx.lineTo(bx, S - h);
      ctx.lineTo(bx + 2, S - h * 0.55);
      ctx.lineTo(bx + 3.5, S);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(bx - 0.5, S - h * 0.78, 1.2, h * 0.46);
    }
  } else if (theme === 'volcano') {
    // Felsbrocken mit pulsierender Glut.
    ctx.fillStyle = '#3a2622';
    ctx.beginPath(); ctx.ellipse(S / 2, S * 0.82, S * 0.34, S * 0.2, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#241512';
    ctx.beginPath(); ctx.ellipse(S * 0.4, S * 0.8, S * 0.1, S * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    const glow = 0.55 + Math.sin(t * 0.05) * 0.3;
    ctx.fillStyle = `rgba(255,120,40,${glow})`;
    ctx.beginPath(); ctx.arc(S * 0.58, S * 0.84, 2.2, 0, Math.PI * 2); ctx.fill();
  } else if (theme === 'ice') {
    // Schneehaufen mit Eiskristall.
    ctx.fillStyle = 'rgba(235,248,255,0.92)';
    ctx.beginPath(); ctx.ellipse(S / 2, S * 0.88, S * 0.34, S * 0.15, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 1.6;
    for (let a = 0; a < 3; a++) {
      const ang = (a / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(S / 2 - Math.cos(ang) * 6, S * 0.56 - Math.sin(ang) * 6);
      ctx.lineTo(S / 2 + Math.cos(ang) * 6, S * 0.56 + Math.sin(ang) * 6);
      ctx.stroke();
    }
  } else if (theme === 'castle') {
    // Kerze mit flackernder Flamme.
    ctx.fillStyle = '#e8e0c8';
    ctx.fillRect(S * 0.42, S * 0.5, S * 0.16, S * 0.5);
    ctx.fillStyle = '#c8b890';
    ctx.fillRect(S * 0.42, S * 0.5, S * 0.05, S * 0.5);
    const fl = Math.sin(t * 0.12) * 1.1;
    ctx.fillStyle = 'rgba(255,170,55,0.95)';
    ctx.beginPath(); ctx.ellipse(S * 0.5 + fl * 0.3, S * 0.42, 2.4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,180,0.9)';
    ctx.beginPath(); ctx.ellipse(S * 0.5 + fl * 0.3, S * 0.44, 1.1, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  } else if (theme === 'underwater') {
    // Verzweigte Koralle.
    ctx.strokeStyle = '#ff8a5c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const branch = (x: number, y: number, ang: number, len: number, depth: number) => {
      if (depth === 0) return;
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      branch(ex, ey, ang - 0.5, len * 0.68, depth - 1);
      branch(ex, ey, ang + 0.5, len * 0.68, depth - 1);
    };
    branch(S / 2, S, -Math.PI / 2, S * 0.3, 3);
  } else if (theme === 'beach') {
    // Muschel mit Rippen.
    ctx.fillStyle = '#ffd9e0';
    ctx.beginPath(); ctx.moveTo(S / 2, S * 0.96);
    ctx.arc(S / 2, S * 0.96, S * 0.3, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e89aa8'; ctx.lineWidth = 1;
    for (let r = 1; r < 5; r++) {
      const ang = Math.PI + r / 5 * Math.PI;
      ctx.beginPath(); ctx.moveTo(S / 2, S * 0.96);
      ctx.lineTo(S / 2 + Math.cos(ang) * S * 0.28, S * 0.96 + Math.sin(ang) * S * 0.28); ctx.stroke();
    }
  } else if (theme === 'australia') {
    // Spinifex-Grasbüschel, leicht wiegend.
    ctx.strokeStyle = '#c8a850'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const bx = S * 0.5 + (i - 3) * 2.5;
      const sway = Math.sin(t * 0.02 + i) * 1.5;
      ctx.beginPath(); ctx.moveTo(bx, S);
      ctx.quadraticCurveTo(bx + sway, S * 0.5, bx + (i - 3) * 1.2 + sway, S * 0.2); ctx.stroke();
    }
  } else if (theme === 'sky') {
    // Kleiner glitzernder Stern über der Wolke.
    const tw = 0.6 + Math.sin(t * 0.08) * 0.4;
    ctx.fillStyle = `rgba(255,245,180,${0.7 + tw * 0.3})`;
    ctx.strokeStyle = `rgba(255,255,220,${tw})`;
    ctx.lineWidth = 1;
    const cx = S / 2, cy = S * 0.55, rO = S * 0.22, rI = S * 0.09;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? rO : rI;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // jungle: kleiner Farn.
    ctx.strokeStyle = '#2f7a30'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + (i - 2) * 0.34;
      const ex = S / 2 + Math.cos(ang) * S * 0.4, ey = S + Math.sin(ang) * S * 0.4;
      ctx.beginPath(); ctx.moveTo(S / 2, S); ctx.lineTo(ex, ey); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawNoteBlock(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  // Federnder Sprungblock: kräftiges Indigo/Violett mit hellem Rahmen, Eck-
  // Nieten und einem weißen Aufwärts-Pfeil — signalisiert „hier abspringen".
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, '#7c6cf0');
  g.addColorStop(0.5, '#5a48d8');
  g.addColorStop(1, '#4636b0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(2, 2, S - 4, S - 4);
  ctx.strokeStyle = '#9d8dff';
  ctx.lineWidth = 2;
  ctx.strokeRect(1.5, 1.5, S - 3, S - 3);
  ctx.fillStyle = '#c8bdff';
  for (const [nx, ny] of [[4, 4], [S - 4, 4], [4, S - 4], [S - 4, S - 4]] as [number, number][]) {
    ctx.beginPath();
    ctx.arc(nx, ny, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Weißer Aufwärts-Pfeil als Sprung-Hinweis.
  const cx = S / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, S * 0.26);
  ctx.lineTo(cx + S * 0.18, S * 0.5);
  ctx.lineTo(cx + S * 0.07, S * 0.5);
  ctx.lineTo(cx + S * 0.07, S * 0.72);
  ctx.lineTo(cx - S * 0.07, S * 0.72);
  ctx.lineTo(cx - S * 0.07, S * 0.5);
  ctx.lineTo(cx - S * 0.18, S * 0.5);
  ctx.closePath();
  ctx.fill();
  // Oberkanten-Glanz.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(2, 2, S - 4, 3);
}

function drawMovingPlatform(this: Renderer, x: number, y: number, w: number, h: number) {
  const ctx = this.ctx;
  const theme = this.currentTheme;
  // Welt 19: natürliches Holzfloß (passt zur illustrierten Foto-Kulisse).
  if (theme === 'vacation') { drawWoodenRaft(ctx, x, y, w, h, this.time); return; }
  const PAL: Record<string, { top: string; body: string; edge: string }> = {
    jungle: { top: '#b07c44', body: '#7d4f29', edge: '#52331b' },
    beach: { top: '#cb9d64', body: '#9a6f3e', edge: '#6c4c2a' },
    australia: { top: '#bb7a40', body: '#8a5126', edge: '#5e3618' },
    sky: { top: '#d2dbe6', body: '#9fb0c2', edge: '#6f8194' },
    cave: { top: '#828b99', body: '#525a68', edge: '#333a46' },
    volcano: { top: '#62463c', body: '#3c2823', edge: '#21130f' },
    ice: { top: '#dcf0fc', body: '#a9d4ec', edge: '#79accf' },
    castle: { top: '#9085a8', body: '#5c5276', edge: '#39314c' },
    underwater: { top: '#45959a', body: '#2a5f63', edge: '#193b3f' },
    space: { top: '#a0a6c8', body: '#646a92', edge: '#3f4366' },
    gym: { top: '#c89250', body: '#8a5a2e', edge: '#5e3c1e' },
    plush: { top: '#f0c9d8', body: '#d79bb4', edge: '#b06e8e' },
  };
  const p = PAL[theme] || PAL.jungle;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 2, y + h, w - 2, 4);                              // Schatten
  ctx.fillStyle = p.body;
  ctx.fillRect(x, y, w, h);                                         // Körper
  ctx.fillStyle = p.top;
  ctx.fillRect(x, y, w, Math.max(3, Math.round(h * 0.4)));          // helle Oberkante
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x, y, w, 1.5);                                       // Glanzlinie
  ctx.fillStyle = p.edge;
  ctx.fillRect(x, y + h - 2, w, 2);                                 // dunkle Unterkante
  for (let i = 0; i < 3; i++) {                                     // Nieten (mechanischer Look)
    const bx = Math.round(x + w * (0.22 + i * 0.28));
    ctx.fillRect(bx - 1, y + Math.round(h * 0.55), 2, 2);
  }
  ctx.restore();
}

// Welt 19: natürliches Holzfloß — gebündelte Rundhölzer (Seitenansicht), mit
// zwei Seil-Verzurrungen, sonnenbeschienener Oberkante und feuchter Wasserlinie.
// Warme Braun-/Sandtöne, damit es sich in die illustrierte Foto-Kulisse einfügt.
function drawWoodenRaft(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time = 0) {
  ctx.save();
  // Lebendige, nasse Wasserlinie direkt unter dem Floß: leicht wandernde
  // Schaum-/Reflex-Tupfer (mit der Zeit versetzt) → das Floß „liegt" im Wasser.
  const ph = time * 0.06;
  ctx.fillStyle = 'rgba(20,55,65,0.24)';
  ctx.fillRect(x + 2, y + h - 1, w - 4, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < Math.max(3, Math.round(w / 14)); i++) {
    const bx = x + 5 + i * 14 + Math.sin(ph + i * 1.7) * 3;
    const bw = 4 + Math.sin(ph * 1.3 + i) * 2;
    ctx.globalAlpha = 0.28 + 0.22 * (0.5 + 0.5 * Math.sin(ph * 1.6 + i * 2.1));
    ctx.fillRect(bx, y + h + 1.5, Math.max(2, bw), 1);
  }
  ctx.globalAlpha = 1;
  // Grundkörper: Holz-Verlauf (sonnig oben → feucht/dunkel unten)
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#c79a5f'); g.addColorStop(0.55, '#a97338'); g.addColorStop(1, '#7c5228');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Einzelne Rundhölzer: senkrechte Fugen + je ein Glanz/Schatten-Paar → Wölbung
  const n = Math.max(3, Math.round(w / 12));
  const lw = w / n;
  for (let i = 0; i < n; i++) {
    const lx = x + i * lw;
    // Wölbungs-Glanz links, Schattenfuge rechts
    ctx.fillStyle = 'rgba(255,238,200,0.28)';
    ctx.fillRect(Math.round(lx + 1), y + 1, Math.max(1, lw * 0.28), h - 2);
    ctx.fillStyle = 'rgba(60,36,16,0.5)';
    ctx.fillRect(Math.round(lx + lw - 1.2), y + 1, 1.2, h - 2);
  }
  // Sonnenbeschienene Oberkante (nasses Holz glänzt)
  ctx.fillStyle = 'rgba(255,244,214,0.5)';
  ctx.fillRect(x, y, w, 1.5);
  // Zwei Seil-Verzurrungen quer über die Hölzer (Bast/Tau)
  ctx.fillStyle = '#6b5334';
  for (const fx of [0.24, 0.76]) {
    const rx = Math.round(x + w * fx) - 1;
    ctx.fillRect(rx, y + 1, 3, h - 2);
    // kleine Kreuz-Wicklung (heller Faden)
    ctx.strokeStyle = 'rgba(214,188,140,0.7)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(rx - 1, y + h * 0.3); ctx.lineTo(rx + 4, y + h * 0.55);
    ctx.moveTo(rx + 4, y + h * 0.3); ctx.lineTo(rx - 1, y + h * 0.55);
    ctx.stroke();
  }
  // feuchte, leicht abgedunkelte Unterkante
  ctx.fillStyle = 'rgba(40,26,14,0.45)';
  ctx.fillRect(x, y + h - 1.5, w, 1.5);
  // Nasser Glanz-Streif, der sanft über das Holz wandert (nasses, im Wasser
  // liegendes Floß glänzt) — schmale, weiche Lichtsäule, Position mit der Zeit.
  const gx = x + ((ph * 9) % (w + 24)) - 12;
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();     // Glanz bleibt auf dem Holz
  const sheen = ctx.createLinearGradient(gx - 7, 0, gx + 7, 0);
  sheen.addColorStop(0, 'rgba(255,252,235,0)');
  sheen.addColorStop(0.5, 'rgba(255,252,235,0.32)');
  sheen.addColorStop(1, 'rgba(255,252,235,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(gx - 7, y + 1, 14, h - 3);
  ctx.restore();
}

// Sprungfeder: rote Kopfplatte auf einer metallischen Spirale mit Grundplatte.
// `compress` (0..1) staucht die Spirale und senkt die Kopfplatte (Auslöse-Feedback).
function drawSpring(this: Renderer, x: number, y: number, w: number, h: number, compress = 0) {
  const ctx = this.ctx;
  const padH = 5, baseH = 3;
  const coilArea = h - padH - baseH;
  const coilH = Math.max(2, coilArea * (1 - 0.5 * compress));
  const baseTop = y + h - baseH;
  const padBottom = baseTop - coilH;
  const padTop = padBottom - padH;
  ctx.save();
  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 2, y + h, w - 4, 3);
  // Grundplatte
  ctx.fillStyle = '#5a5f6b';
  ctx.fillRect(x + 1, baseTop, w - 2, baseH);
  ctx.fillStyle = '#3c404a';
  ctx.fillRect(x + 1, baseTop + baseH - 1, w - 2, 1);
  // Spirale (Zick-Zack)
  ctx.strokeStyle = '#c9ced6';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const segs = 4;
  const left = x + 5, right = x + w - 5;
  for (let i = 0; i <= segs; i++) {
    const yy = baseTop - (coilH * i) / segs;
    const xx = i % 2 === 0 ? left : right;
    if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
  }
  ctx.stroke();
  // Kopfplatte (rot) mit Glanz
  ctx.fillStyle = '#e0362f';
  ctx.fillRect(x, padTop, w, padH);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x, padTop, w, 1.5);
  ctx.fillStyle = '#a8221d';
  ctx.fillRect(x, padTop + padH - 1.5, w, 1.5);
  ctx.restore();
}

// Holzkiste: Korpus mit Rahmen, Diagonalstreben und Nieten — schiebbar/zerstörbar.
function drawCrate(this: Renderer, x: number, y: number, w: number, h: number) {
  const ctx = this.ctx;
  ctx.save();
  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 2, y + h, w - 3, 3);
  // Korpus
  ctx.fillStyle = '#9a6a38';
  ctx.fillRect(x, y, w, h);
  // Innenfläche (leicht dunkler)
  ctx.fillStyle = '#875c30';
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  // Rahmen
  ctx.strokeStyle = '#5e3d1e';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  // Diagonalstreben (X)
  ctx.strokeStyle = '#6f4a25';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + w - 3, y + h - 3);
  ctx.moveTo(x + w - 3, y + 3); ctx.lineTo(x + 3, y + h - 3);
  ctx.stroke();
  // obere Glanzkante
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  // Nieten
  ctx.fillStyle = '#4a300f';
  const d = 3;
  ctx.fillRect(x + 3, y + 3, d, d);
  ctx.fillRect(x + w - 3 - d, y + 3, d, d);
  ctx.fillRect(x + 3, y + h - 3 - d, d, d);
  ctx.fillRect(x + w - 3 - d, y + h - 3 - d, d, d);
  ctx.restore();
}

// Schalter (P_SWITCH): Boden-Button. Rot = offen, grün + eingedrückt = aktiviert.
function drawSwitch(this: Renderer, x: number, y: number, w: number, h: number, pressed: boolean) {
  const ctx = this.ctx;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 2, y + h, w - 4, 3);
  // Sockel
  ctx.fillStyle = '#3a4358';
  ctx.fillRect(x, y + h - 4, w, 4);
  // Knopf
  const top = pressed ? y + h - 6 : y;
  const bh = pressed ? 6 : h - 2;
  ctx.fillStyle = pressed ? '#28c76f' : '#e0362f';
  ctx.fillRect(x + 3, top, w - 6, bh);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x + 3, top, w - 6, 2);
  // kleines „Match"-Symbol (zwei verbundene Punkte) auf dem Knopf
  if (!pressed) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 8, y + 4, 3, 3);
    ctx.fillRect(x + w - 11, y + 4, 3, 3);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 10, y + 5.5); ctx.lineTo(x + w - 9, y + 5.5); ctx.stroke();
  }
  ctx.restore();
}

// Tür/Tor (DOOR): blaue Bluefield-Barriere mit Schloss; öffnet sich (sinkt).
function drawDoor(this: Renderer, x: number, y: number, w: number, h: number, open: boolean, openTimer: number) {
  const ctx = this.ctx;
  ctx.save();
  const alpha = open ? Math.max(0, 1 - openTimer / 24) : 1;
  ctx.globalAlpha = alpha;
  // Torkörper (Bluefield-Blau, metallisch)
  ctx.fillStyle = '#2f6bd6';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#245bb8';
  for (let ry = y + 4; ry < y + h - 2; ry += 8) ctx.fillRect(x + 2, ry, w - 4, 3); // Lamellen
  ctx.strokeStyle = '#183f80'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  // Schloss/Match-Icon in der Mitte
  const cy = y + h / 2;
  ctx.fillStyle = open ? '#28c76f' : '#ffd23f';
  ctx.beginPath(); ctx.arc(x + w / 2, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#183f80';
  ctx.fillRect(x + w / 2 - 1.5, cy - 1, 3, 5);
  ctx.restore();
}

// Feuer-Barriere: eine brennbare Ranken-/Dornenwand. Telegrafiert klar „Feuer
// hilft hier": warme Glut-Punkte + ausgetrocknetes Geflecht. Nur ein Feuerball
// brennt sie weg (Logik in der Engine).
function drawFireBarrier(this: Renderer, x: number, y: number, w: number, h: number, burn: number, time: number, sway: number) {
  const ctx = this.ctx;
  ctx.save();
  const s = Math.sin(time * 0.05 + sway) * 1.2;
  // Körper: dunkles, trockenes Ranken-Geflecht (leicht rötlich → „entflammbar").
  const body = ctx.createLinearGradient(x, 0, x + w, 0);
  body.addColorStop(0, '#4a3a1e');
  body.addColorStop(0.5, '#6b5326');
  body.addColorStop(1, '#4a3a1e');
  ctx.fillStyle = body;
  ctx.fillRect(x + 2, y, w - 4, h);
  // Vertikale Ranken-Stränge.
  ctx.strokeStyle = '#3a6b2a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const bx = x + 6 + i * ((w - 12) / 2);
    ctx.beginPath();
    ctx.moveTo(bx, y + 2);
    for (let yy = y + 2; yy <= y + h - 2; yy += 10) {
      ctx.lineTo(bx + Math.sin(yy * 0.25 + i + sway) * 2.5 + s, yy);
    }
    ctx.stroke();
  }
  // Quer-Geflecht + Dornen.
  ctx.strokeStyle = '#2c5220'; ctx.lineWidth = 2;
  for (let yy = y + 8; yy < y + h - 4; yy += 14) {
    ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + w - 3, yy + 3); ctx.stroke();
    ctx.fillStyle = '#8fae63';
    ctx.beginPath(); ctx.moveTo(x + w - 4, yy); ctx.lineTo(x + w - 1, yy + 1.5); ctx.lineTo(x + w - 4, yy + 3); ctx.fill();
  }
  // Glut-Telegraf: warme, pulsierende Funken am Fuß („hier hilft Feuer").
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.12 + sway);
  for (let i = 0; i < 4; i++) {
    const ex = x + 5 + (i * (w - 10)) / 3;
    const ey = y + h - 4 - (i % 2) * 3;
    ctx.fillStyle = `rgba(255,${150 + Math.floor(pulse * 80)},60,${0.5 + pulse * 0.4})`;
    ctx.beginPath(); ctx.arc(ex, ey, 1.8 + pulse, 0, Math.PI * 2); ctx.fill();
  }
  // Verbrenn-Flammen (falls die Engine burn>0 setzt).
  if (burn > 0) {
    const p = Math.min(1, burn / 18);
    ctx.globalAlpha = 1 - p;
    for (let i = 0; i < 6; i++) {
      const fx = x + 4 + Math.random() * (w - 8);
      const fy = y + h - Math.random() * h * (0.3 + p);
      ctx.fillStyle = i % 2 ? 'rgba(255,140,40,0.9)' : 'rgba(255,220,90,0.9)';
      ctx.beginPath(); ctx.arc(fx, fy, 2 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// Stadt: Beton-/Dach-Kachel (Hausdach). `top` = Dachkante mit heller Leiste.
function drawCityRoofTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, top ? '#6b6f78' : '#565a63');
  g.addColorStop(1, '#3f434b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  // Panel-/Ziegel-Fugen
  ctx.strokeStyle = 'rgba(28,30,35,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, S * 0.5); ctx.lineTo(S, S * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(S * 0.5, S * 0.5); ctx.lineTo(S * 0.5, S); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(S * 0.25, 0); ctx.lineTo(S * 0.25, S * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(S * 0.75, 0); ctx.lineTo(S * 0.75, S * 0.5); ctx.stroke();
  if (top) {
    // helle Dachleiste + Parapet-Schatten
    ctx.fillStyle = 'rgba(190,196,205,0.6)'; ctx.fillRect(0, 0, S, 2);
    ctx.fillStyle = 'rgba(20,22,26,0.35)'; ctx.fillRect(0, 3, S, 2);
  }
}

// Stadt: Müllgrube (statt Lava/Wasser) — trübe grün-braune Brühe mit Müll.
function drawCityGarbage(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const g = ctx.createLinearGradient(0, 0, 0, S);
  if (top) { g.addColorStop(0, '#5a6b34'); g.addColorStop(1, '#3c4826'); }
  else { g.addColorStop(0, '#3c4826'); g.addColorStop(1, '#2b331d'); }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  if (top) {
    // Schaum-/Schleimlinie (kräftigeres Giftgrün = Warnkontrast) + Müllstückchen
    ctx.fillStyle = 'rgba(170,205,80,0.65)'; ctx.fillRect(0, 0, S, 2.5);
    ctx.fillStyle = 'rgba(120,150,55,0.5)'; ctx.fillRect(0, 2.5, S, 2);
    ctx.fillStyle = '#8a6b3a'; ctx.fillRect(S * 0.2, 5, 5, 3);          // Karton
    ctx.fillStyle = '#b7c0c8'; ctx.fillRect(S * 0.6, 6, 4, 4);          // Dose
    ctx.fillStyle = 'rgba(230,245,150,0.35)'; ctx.fillRect(S * 0.45, 4, 3, 2); // giftiger Glanz
  } else {
    ctx.fillStyle = 'rgba(20,26,14,0.5)';
    ctx.fillRect(S * 0.3, S * 0.4, 6, 4);
    ctx.fillRect(S * 0.65, S * 0.7, 5, 3);
  }
}

export const tilesMethods = {
  drawCityRoofTile,
  drawCityGarbage,
  drawTile,
  drawMovingPlatform,
  drawSpring,
  drawCrate,
  drawSwitch,
  drawDoor,
  drawFireBarrier,
  drawThemedProp,
  drawNoteBlock,
  renderTileToCache,
  drawIceTile,
  drawCastleStoneTile,
  drawSpaceMetalTile,
  drawVolcanoGroundTile,
  drawVolcanoBrickTile,
  drawVolcanoStoneTile,
  drawUnderwaterGroundTile,
  drawUnderwaterBrickTile,
  drawUnderwaterStoneTile,
  drawSpikeTile,
  drawVacationShore,
};
