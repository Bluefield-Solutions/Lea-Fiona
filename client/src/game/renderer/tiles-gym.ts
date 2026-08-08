import { TILE_SIZE } from '../constants';
import type { Renderer } from '../renderer.ts';

/** Turnhallen-Boden: heller Honig-Parkett (Schwingboden) mit Planken + Maserung. */
function drawGymFloorTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const fill = '#9c6f3c';
  if (top) {
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#cf9e5c');
    g.addColorStop(0.5, '#b0813f');
    g.addColorStop(1, fill);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  } else {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, S, S);
  }
  // Parkett-Planken (vertikale Fugen + Versatzlinie in der Mitte).
  ctx.strokeStyle = 'rgba(88,58,26,0.42)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 8; x < S; x += 10) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, S); }
  ctx.moveTo(0, S * 0.5 + 0.5); ctx.lineTo(S, S * 0.5 + 0.5);
  ctx.stroke();
  // Feine Holzmaserung.
  ctx.strokeStyle = 'rgba(206,166,104,0.22)';
  for (let y = 5; y < S; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= S; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.5 + y) * 0.6);
    ctx.stroke();
  }
  if (top) { ctx.fillStyle = '#e2bd82'; ctx.fillRect(0, 0, S, 2); } // heller Lack-Saum
}

/** Barren/Reck-Holm als Plattform: Holzholm mit Glanzkante + Polster-Segmenten. */
function drawGymBarTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  ctx.fillStyle = '#7c4f28';            // Korpus
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#a8703a';            // Holz-Holm oben
  ctx.fillRect(0, 0, S, 9);
  ctx.fillStyle = '#caa057';            // Glanzkante
  ctx.fillRect(0, 0, S, 3);
  ctx.fillStyle = '#603c1e';            // Polster-/Streben-Segmente
  ctx.strokeStyle = 'rgba(54,34,16,0.6)';
  ctx.lineWidth = 1;
  for (let i = 3; i < S - 2; i += 8) {
    ctx.fillRect(i, 11, 6, S - 14);
    ctx.strokeRect(i + 0.5, 11.5, 6, S - 14);
  }
}

/** Sprungkasten-Schicht (STONE): Leder-Trapezsegment, oben/unten dunkle Fuge. */
function drawGymVaultTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, '#dcac64');
  g.addColorStop(1, '#b8863f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#8a5f2c';            // Segment-Fugen
  ctx.fillRect(0, 0, S, 3);
  ctx.fillRect(0, S - 3, S, 3);
  ctx.fillStyle = 'rgba(255,242,212,0.35)';
  ctx.fillRect(0, 3, S, 1);             // Glanz
  ctx.fillStyle = 'rgba(92,62,28,0.22)'; // seitliche Verjüngungs-Schatten
  ctx.fillRect(0, 3, 2, S - 6);
  ctx.fillRect(S - 2, 3, 2, S - 6);
}

/** Trampolin (NOTE_BLOCK): Wettkampf-Trampolin — blaues Sprungtuch, Federn, rotes Pad. */
function drawGymNote(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  ctx.fillStyle = '#c0392b'; ctx.fillRect(2, S - 9, S - 4, 9);          // rotes Rahmen-Pad
  ctx.fillStyle = '#8f2a20'; ctx.fillRect(4, S - 4, 3, 4); ctx.fillRect(S - 7, S - 4, 3, 4); // Beine
  ctx.strokeStyle = '#b8bcc8'; ctx.lineWidth = 1.4;                     // Federn
  for (let fx = 6; fx < S - 4; fx += 5) { ctx.beginPath(); ctx.moveTo(fx, 13); ctx.lineTo(fx, 7); ctx.stroke(); }
  ctx.fillStyle = '#1f6fd0';                                           // blaues Sprungtuch
  ctx.beginPath(); ctx.ellipse(S / 2, 12, S / 2 - 2, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0f4a95'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(S / 2, 12, S / 2 - 2, 6, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(234,242,255,0.85)'; ctx.lineWidth = 1;        // Zielkreis
  ctx.beginPath(); ctx.ellipse(S / 2, 12, S / 2 - 6, 3.4, 0, 0, Math.PI * 2); ctx.stroke();
}

/** Turnhallen-Deko (col % 4): Turnmatte, Medizinball, Magnesia-Eimer, Pylon. */
function drawGymProp(this: Renderer, ctx: CanvasRenderingContext2D, x: number, y: number, col: number) {
  const v = ((col % 4) + 4) % 4;
  ctx.save();
  ctx.translate(x, y);
  if (v === 0) {
    // Gefaltete Turnmatte (blau).
    ctx.fillStyle = '#2f6fc0'; ctx.fillRect(4, 18, 24, 12);
    ctx.fillStyle = '#245aa0'; ctx.fillRect(4, 18, 24, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(4, 22, 24, 1);
    ctx.strokeStyle = '#1c4884'; ctx.lineWidth = 1; ctx.strokeRect(4.5, 18.5, 23, 11);
  } else if (v === 1) {
    // Medizinball.
    ctx.fillStyle = '#8a4a34'; ctx.beginPath(); ctx.arc(16, 24, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5e3020'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(10, 24); ctx.lineTo(22, 24); ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,190,0.3)'; ctx.beginPath(); ctx.arc(14, 22, 1.6, 0, Math.PI * 2); ctx.fill();
  } else if (v === 2) {
    // Magnesia-/Kreide-Eimer.
    ctx.fillStyle = '#d8d8dc'; ctx.fillRect(11, 16, 12, 14);
    ctx.fillStyle = '#b6b6be'; ctx.fillRect(11, 16, 12, 2);
    ctx.fillStyle = '#f2f2f6'; ctx.beginPath(); ctx.ellipse(17, 16, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    // Markierungs-Pylon.
    ctx.fillStyle = '#f0a028'; ctx.beginPath(); ctx.moveTo(16, 10); ctx.lineTo(22, 28); ctx.lineTo(10, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8861c'; ctx.fillRect(7, 27, 18, 3);
    ctx.fillStyle = '#fafafa'; ctx.fillRect(13, 16, 6, 4);
  }
  ctx.restore();
}

/** Reck (BRICK): festes Hürden-Hindernis — zwei Metallpfosten + gelbe Holm-Stange oben. */
function drawGymReckTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  // Pfosten (fast volle Höhe → die Kollision wirkt fair, ist ein „Gerät").
  ctx.strokeStyle = '#c8ccd6'; ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(6, S); ctx.lineTo(6, 6);
  ctx.moveTo(S - 6, S); ctx.lineTo(S - 6, 6);
  ctx.stroke();
  // Verstrebung.
  ctx.strokeStyle = 'rgba(150,156,168,0.7)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(6, S * 0.5); ctx.lineTo(S - 6, S * 0.7); ctx.stroke();
  // Holm-Stange oben (Reck-typisch gelb-golden).
  ctx.strokeStyle = '#e6a53a'; ctx.lineWidth = 4.2;
  ctx.beginPath(); ctx.moveTo(2, 6); ctx.lineTo(S - 2, 6); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,232,170,0.7)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(3, 4.5); ctx.lineTo(S - 3, 4.5); ctx.stroke();
  // Füße.
  ctx.fillStyle = '#9aa0ac';
  ctx.fillRect(2, S - 3, 10, 3); ctx.fillRect(S - 12, S - 3, 10, 3);
}

export const tilesGymMethods = {
  drawGymFloorTile,
  drawGymBarTile,
  drawGymVaultTile,
  drawGymNote,
  drawGymReckTile,
  drawGymProp,
};
