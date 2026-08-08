import { TILE_SIZE } from '../constants';
import type { Renderer } from '../renderer.ts';

/** Plüsch-Boden: weicher Patchwork-/Strick-Teppich in Pastell mit Steppnaht-Karos. */
function drawPlushFloorTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const base = '#d9a9bc';
  if (top) {
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#f0c9d8');
    g.addColorStop(0.5, '#e3b3c6');
    g.addColorStop(1, base);
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  } else {
    ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
  }
  // Patchwork-Karos in kräftigeren Pastelltönen.
  const quilt = ['#f4a6c8', '#a8dca0', '#f6cf7a', '#a6bdf0'];
  const half = S / 2;
  for (let qy = 0; qy < 2; qy++) for (let qx = 0; qx < 2; qx++) {
    ctx.fillStyle = quilt[(qx + qy * 2) % 4];
    ctx.globalAlpha = 0.6;
    ctx.fillRect(qx * half, qy * half, half, half);
  }
  ctx.globalAlpha = 1;
  // Steppnähte (gestrichelte Kreuze).
  ctx.strokeStyle = 'rgba(180,120,150,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(half + 0.5, 0); ctx.lineTo(half + 0.5, S);
  ctx.moveTo(0, half + 0.5); ctx.lineTo(S, half + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  if (top) { ctx.fillStyle = 'rgba(255,246,250,0.6)'; ctx.fillRect(0, 0, S, 2); } // weicher Flausch-Saum
}

/** Weicher Bauklotz (STONE): Pastell-Filzblock mit Steppnaht-Rand + Glanzlicht. */
function drawPlushBlockTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, '#9fd0ef');
  g.addColorStop(1, '#78b0dc');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, S, 3);           // Glanz oben
  ctx.fillStyle = 'rgba(40,80,120,0.16)'; ctx.fillRect(0, S - 3, S, 3);         // Schatten unten
  // Steppnaht-Rand.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]);
  ctx.strokeRect(3.5, 3.5, S - 7, S - 7);
  ctx.setLineDash([]);
  // kleiner Filz-Stern in der Mitte.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.save(); ctx.translate(S / 2, S / 2);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a2) * 2.2, Math.sin(a2) * 2.2);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

/** Sprungkissen (NOTE_BLOCK): weiches, pralles Kissen mit Ecken-Quasten. */
function drawPlushPillowTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  // pralles Kissen.
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, '#ffd9e6');
  g.addColorStop(1, '#f2a8c4');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(4, 8);
  ctx.quadraticCurveTo(S / 2, 2, S - 4, 8);
  ctx.quadraticCurveTo(S - 1, S / 2, S - 4, S - 4);
  ctx.quadraticCurveTo(S / 2, S - 1, 4, S - 4);
  ctx.quadraticCurveTo(1, S / 2, 4, 8);
  ctx.closePath(); ctx.fill();
  // Naht-Kreuz + Knopf in der Mitte.
  ctx.strokeStyle = 'rgba(210,110,150,0.55)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(S / 2, S / 2); ctx.moveTo(S - 8, 8); ctx.lineTo(S / 2, S / 2); ctx.stroke();
  ctx.fillStyle = '#e57aa2'; ctx.beginPath(); ctx.arc(S / 2, S / 2, 2.4, 0, Math.PI * 2); ctx.fill();
  // Ecken-Quasten.
  ctx.fillStyle = '#f6c6d8';
  for (const [cx, cy] of [[4, 8], [S - 4, 8], [4, S - 4], [S - 4, S - 4]] as [number, number][]) {
    ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(S / 2 - 5, 10, 5, 2.4, -0.3, 0, Math.PI * 2); ctx.fill();
}

/** Kuscheltier-Deko (col % 4): Teddy, Hase, Plüsch-Stern, Plüsch-Kätzchen. */
function drawPlushProp(this: Renderer, ctx: CanvasRenderingContext2D, x: number, y: number, col: number) {
  const v = ((col % 4) + 4) % 4;
  ctx.save();
  ctx.translate(x, y);
  if (v === 0) {
    // Teddybär (sitzend).
    ctx.fillStyle = '#c79a63';
    ctx.beginPath(); ctx.ellipse(16, 24, 9, 7, 0, 0, Math.PI * 2); ctx.fill();       // Bauch
    ctx.beginPath(); ctx.arc(16, 13, 7, 0, Math.PI * 2); ctx.fill();                 // Kopf
    ctx.beginPath(); ctx.arc(11, 8, 3, 0, Math.PI * 2); ctx.arc(21, 8, 3, 0, Math.PI * 2); ctx.fill(); // Ohren
    ctx.fillStyle = '#e8cba0'; ctx.beginPath(); ctx.ellipse(16, 15, 3.4, 2.6, 0, 0, Math.PI * 2); ctx.fill(); // Schnauze
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(13, 12, 1.3, 0, Math.PI * 2); ctx.arc(19, 12, 1.3, 0, Math.PI * 2); ctx.arc(16, 15, 1, 0, Math.PI * 2); ctx.fill();
  } else if (v === 1) {
    // Häschen.
    ctx.fillStyle = '#f2e8ea';
    ctx.beginPath(); ctx.ellipse(16, 24, 8, 6, 0, 0, Math.PI * 2); ctx.fill();       // Körper
    ctx.beginPath(); ctx.arc(16, 15, 6, 0, Math.PI * 2); ctx.fill();                 // Kopf
    ctx.beginPath(); ctx.ellipse(12, 6, 2.6, 7, -0.2, 0, Math.PI * 2); ctx.ellipse(20, 6, 2.6, 7, 0.2, 0, Math.PI * 2); ctx.fill(); // Ohren
    ctx.fillStyle = '#f4b8cc'; ctx.beginPath(); ctx.ellipse(12, 6, 1.1, 3.6, -0.2, 0, Math.PI * 2); ctx.ellipse(20, 6, 1.1, 3.6, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3a3a'; ctx.beginPath(); ctx.arc(13.5, 14, 1.2, 0, Math.PI * 2); ctx.arc(18.5, 14, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f28ba6'; ctx.beginPath(); ctx.arc(16, 17, 1.2, 0, Math.PI * 2); ctx.fill();
  } else if (v === 2) {
    // Plüsch-Stern.
    ctx.fillStyle = '#f6d36a';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      ctx.lineTo(16 + Math.cos(a) * 12, 20 + Math.sin(a) * 12);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(16 + Math.cos(a2) * 5.4, 20 + Math.sin(a2) * 5.4);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(210,160,40,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#4a3a1a'; ctx.beginPath(); ctx.arc(13, 19, 1.2, 0, Math.PI * 2); ctx.arc(19, 19, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a3a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(16, 22, 2.4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  } else {
    // Plüsch-Kätzchen (grau).
    ctx.fillStyle = '#b8bcc6';
    ctx.beginPath(); ctx.ellipse(16, 24, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, 14, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(9, 3); ctx.lineTo(15, 8); ctx.closePath(); ctx.moveTo(22, 10); ctx.lineTo(23, 3); ctx.lineTo(17, 8); ctx.closePath(); ctx.fill(); // Ohren
    ctx.strokeStyle = '#8a8e98'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(16, 24); ctx.quadraticCurveTo(26, 22, 25, 15); ctx.stroke(); // Schwanz
    ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.arc(13.5, 13, 1.3, 0, Math.PI * 2); ctx.arc(18.5, 13, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0a0b4'; ctx.beginPath(); ctx.arc(16, 16, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Plüsch-Sims (WOOD_PLATFORM, Einweg): weiches gestepptes Kissen-Sims statt Holz. */
function drawPlushLedge(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const topH = Math.round(S * 0.42);
  // pralles Kissen-Sims (oben begehbar).
  const g = ctx.createLinearGradient(0, 0, 0, topH);
  g.addColorStop(0, '#ffd9e6');
  g.addColorStop(1, '#eaa6c2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(1, 4);
  ctx.quadraticCurveTo(S / 2, -1, S - 1, 4);
  ctx.quadraticCurveTo(S - 1, topH, S / 2, topH);
  ctx.quadraticCurveTo(1, topH, 1, 4);
  ctx.closePath(); ctx.fill();
  // Steppnaht + Knöpfe.
  ctx.strokeStyle = 'rgba(200,110,150,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.moveTo(3, topH - 2); ctx.lineTo(S - 3, topH - 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#e57aa2';
  ctx.beginPath(); ctx.arc(S * 0.3, topH * 0.5, 1.6, 0, Math.PI * 2); ctx.arc(S * 0.7, topH * 0.5, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(S / 2 - 4, 5, 6, 2.4, -0.2, 0, Math.PI * 2); ctx.fill();
  // dünne hängende Fransen unter dem Sims (Deko).
  ctx.strokeStyle = 'rgba(200,140,175,0.55)'; ctx.lineWidth = 1.4;
  for (let fx = 4; fx < S - 2; fx += 6) {
    ctx.beginPath(); ctx.moveTo(fx, topH - 1); ctx.lineTo(fx, topH + 4); ctx.stroke();
  }
}

export const tilesPlushMethods = {
  drawPlushFloorTile,
  drawPlushBlockTile,
  drawPlushPillowTile,
  drawPlushLedge,
  drawPlushProp,
};
