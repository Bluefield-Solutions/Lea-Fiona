import { TILE_SIZE } from '../constants';
import type { Renderer } from '../renderer.ts';

/** Trampolin-Sprungtuch als Boden — dunkle Matte, Gitter-Maschen, Neon-Rand oben. */
function drawTrampolineGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const fillTone = '#343954';
  if (top) {
    const grad = ctx.createLinearGradient(0, 0, 0, S);
    grad.addColorStop(0, '#2c3048');
    grad.addColorStop(0.5, '#313650');
    grad.addColorStop(1, fillTone);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, 0, S, S);
  }
  ctx.strokeStyle = 'rgba(74,82,116,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let g = 5; g < S; g += 6) { ctx.moveTo(g + 0.5, 0); ctx.lineTo(g + 0.5, S); ctx.moveTo(0, g + 0.5); ctx.lineTo(S, g + 0.5); }
  ctx.stroke();
  if (top) {
    ctx.fillStyle = '#ff3caa'; ctx.fillRect(0, 0, S, 3);
    ctx.fillStyle = '#3cdce6'; ctx.fillRect(0, 3, S, 2);
  }
}

/** Gepolsterter Steg als Plattform — Neon-Oberkante, Polster-Segmente. */
function drawTrampolinePlatformTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  ctx.fillStyle = '#2e3248';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#3c4260';
  ctx.fillRect(0, 0, S, 10);
  ctx.fillStyle = '#50c878';
  ctx.fillRect(0, 0, S, 3);
  ctx.fillStyle = '#363a54';
  ctx.strokeStyle = 'rgba(70,76,104,0.7)';
  ctx.lineWidth = 1;
  for (let i = 2; i < S - 2; i += 8) {
    ctx.fillRect(i, 12, 6, S - 16);
    ctx.strokeRect(i + 0.5, 12.5, 6, S - 16);
  }
}

/** Trampolin (NOTE_BLOCK) — Sprungtuch-Oval, Federn, Neon-Rand, Polster-Abdeckung. */
function drawTrampolineNote(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  ctx.fillStyle = '#464c6c'; ctx.fillRect(3, S - 8, S - 6, 8);
  ctx.fillStyle = '#363c58'; ctx.fillRect(5, S - 4, 3, 4); ctx.fillRect(S - 8, S - 4, 3, 4);
  ctx.strokeStyle = '#96a0be'; ctx.lineWidth = 1.5;
  for (let fx = 6; fx < S - 4; fx += 5) { ctx.beginPath(); ctx.moveTo(fx, 12); ctx.lineTo(fx, 6); ctx.stroke(); }
  ctx.fillStyle = '#1e2034';
  ctx.beginPath(); ctx.ellipse(S / 2, 12, S / 2 - 2, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ff3caa'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(S / 2, 12, S / 2 - 2, 6, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#f0b432'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(S / 2, 12, S / 2 - 2, 6, 0, 0.2, Math.PI - 0.2); ctx.stroke();
}

/** Trampolinpark-Deko — vier Varianten je nach Spalte (col % 4). */
function drawTrampolineProp(this: Renderer, ctx: CanvasRenderingContext2D, x: number, y: number, col: number) {
  const v = ((col % 4) + 4) % 4;
  ctx.save();
  ctx.translate(x, y);
  if (v === 0) {
    // Foam-Pit-Würfelhaufen.
    const cols = ['#e6505a', '#508cdc', '#f0be46', '#5ac878'];
    const cubes: [number, number][] = [[6, 20], [16, 12], [26, 20], [11, 4], [21, 4]];
    cubes.forEach(([cx, cy], k) => {
      ctx.fillStyle = cols[k % 4]; ctx.fillRect(cx, cy, 9, 9);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(cx, cy, 9, 2);
    });
  } else if (v === 1) {
    // Dodgeball-Korb.
    ctx.fillStyle = '#5a6078'; ctx.fillRect(8, 18, 18, 12);
    ctx.strokeStyle = '#3c4258'; ctx.lineWidth = 1;
    for (let gx = 10; gx < 26; gx += 3) { ctx.beginPath(); ctx.moveTo(gx, 18); ctx.lineTo(gx, 30); ctx.stroke(); }
    const balls: [number, number, string][] = [[13, 16, '#e6505a'], [20, 15, '#508cdc'], [17, 20, '#f0be46']];
    for (const [bx, by, bc] of balls) { ctx.fillStyle = bc; ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2); ctx.fill(); }
  } else if (v === 2) {
    // Markierungs-Pylon.
    ctx.fillStyle = '#f07828';
    ctx.beginPath(); ctx.moveTo(16, 8); ctx.lineTo(22, 28); ctx.lineTo(10, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dc6420'; ctx.fillRect(7, 27, 18, 3);
    ctx.fillStyle = '#fafafa'; ctx.fillRect(13, 15, 6, 5);
  } else {
    // Wasserspender.
    ctx.fillStyle = '#5a96c8'; ctx.fillRect(11, 12, 12, 18);
    ctx.fillStyle = '#a0d2f0'; ctx.fillRect(13, 6, 8, 7);
    ctx.fillStyle = '#28465e'; ctx.fillRect(15, 20, 4, 3);
  }
  ctx.restore();
}

export const tilesTrampolineMethods = {
  drawTrampolineGroundTile,
  drawTrampolinePlatformTile,
  drawTrampolineNote,
  drawTrampolineProp,
};
