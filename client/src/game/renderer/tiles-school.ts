import { TILE_SIZE } from '../constants';
import type { Renderer } from '../renderer.ts';

/** Warmes Holzparkett als Schul-Boden (Klassenzimmer/Flur). */
function drawSchoolGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const fillTone = '#c99a5b';
  if (top) {
    const grad = ctx.createLinearGradient(0, 0, 0, S);
    grad.addColorStop(0, '#e2b87c');
    grad.addColorStop(0.5, '#d2a464');
    grad.addColorStop(1, fillTone);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, 0, S, S);
  }

  const rowH = S / 3;
  // Feine Holzmaserung pro Diele (deterministisch, drei Linien je Reihe).
  const grain = [0.18, 0.42, 0.7, 0.28, 0.55, 0.82, 0.15, 0.48, 0.75];
  ctx.strokeStyle = 'rgba(190,146,98,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let r = 0; r < 3; r++) {
    for (let g = 0; g < 3; g++) {
      const my = Math.round(r * rowH + rowH * grain[r * 3 + g]) + 0.5;
      ctx.moveTo(1, my); ctx.lineTo(S - 1, my);
    }
  }
  ctx.stroke();

  // Dielenfugen: warmer Schatten + heller Übergang darunter (Tiefe).
  for (let r = 0; r <= 3; r++) {
    const y = Math.round(r * rowH);
    ctx.fillStyle = 'rgba(120,84,50,0.6)';
    ctx.fillRect(0, y - 1, S, 1.5);
    ctx.fillStyle = 'rgba(232,194,140,0.55)';
    ctx.fillRect(0, y + 0.5, S, 1);
  }
  // Versetzte Stoßfugen mit Highlight-Kante.
  for (let r = 0; r < 3; r++) {
    const y0 = Math.round(r * rowH), y1 = Math.round((r + 1) * rowH);
    const xx = (r % 2 === 0) ? Math.round(S * 0.35) : Math.round(S * 0.7);
    ctx.fillStyle = 'rgba(120,84,50,0.55)';
    ctx.fillRect(xx, y0, 1.5, y1 - y0);
    ctx.fillStyle = 'rgba(236,200,148,0.5)';
    ctx.fillRect(xx + 1.5, y0, 1, y1 - y0);
  }

  if (top) {
    // Mehrstufige gewienerte Glanzkante.
    const sheen = ctx.createLinearGradient(0, 0, 0, 8);
    sheen.addColorStop(0, 'rgba(255,248,224,0.65)');
    sheen.addColorStop(1, 'rgba(255,248,224,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, S, 8);
    ctx.fillStyle = '#a87a4a';
    ctx.fillRect(0, 0, S, 1);
  }
}

/** Bücherregal als Einweg-/Plattform-Tile. */
function drawSchoolPlatformTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  // Holzkorpus mit Maserung.
  const wood = ctx.createLinearGradient(0, 0, 0, S);
  wood.addColorStop(0, '#96683e');
  wood.addColorStop(1, '#724c2c');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(122,84,50,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const my of [6, 14, 22, 28]) { ctx.moveTo(0, my + 0.5); ctx.lineTo(S, my + 0.5); }
  ctx.stroke();
  // Bretter oben/unten mit Schatten + Highlight-Kante.
  ctx.fillStyle = '#5e3e24';
  ctx.fillRect(0, 0, S, 4);
  ctx.fillRect(0, S - 4, S, 4);
  ctx.fillStyle = 'rgba(180,140,96,0.7)';
  ctx.fillRect(0, 4, S, 1);
  // Bücher: Glanzkante links, Schattenfuge rechts, Titel-Strich.
  const cols = ['#ce4c4c', '#4a7cc4', '#d6a63c', '#5eaa64', '#a662ae', '#e6b450'];
  let bx = 3;
  let i = 0;
  while (bx < S - 3) {
    const bw = 4 + (i % 3);
    const bt = 6, bb = S - 5;
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(bx, bt, bw - 1, bb - bt);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(bx, bt, 1, bb - bt);
    ctx.fillStyle = 'rgba(40,26,16,0.5)';
    ctx.fillRect(bx + bw - 2, bt, 1, bb - bt);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(bx + 1, bt + 3, Math.max(1, bw - 3), 1);
    bx += bw;
    i++;
  }
}

/** Schul-Deko an der Bodenlinie — vier Varianten je nach Spalte (col % 4). */
function drawSchoolProp(this: Renderer, ctx: CanvasRenderingContext2D, x: number, y: number, col: number) {
  const v = ((col % 4) + 4) % 4;
  ctx.save();
  ctx.translate(x, y);
  if (v === 0) {
    // Pult + Stuhl.
    ctx.fillStyle = '#b48250'; ctx.fillRect(5, 14, 20, 4);
    ctx.fillStyle = '#d2a070'; ctx.fillRect(5, 14, 20, 1.5);
    ctx.fillStyle = '#7a5436'; ctx.fillRect(7, 18, 2, 12); ctx.fillRect(21, 18, 2, 12);
    ctx.fillStyle = '#8a5e38'; ctx.fillRect(24, 20, 6, 1.5); ctx.fillRect(28, 14, 1.5, 16);
  } else if (v === 1) {
    // Bücherstapel.
    const cols = ['#c84848', '#4878c0', '#d0a038', '#5aa860'];
    let yy = 30;
    for (let i = 0; i < 4; i++) {
      const h = 4 + (i % 2);
      const w = 20 - i * 1.5;
      ctx.fillStyle = cols[i]; ctx.fillRect(7, yy - h, w, h - 0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(7, yy - h, w, 1);
      yy -= h;
    }
  } else if (v === 2) {
    // Pflanze im Topf.
    ctx.fillStyle = '#b46e46';
    ctx.beginPath(); ctx.moveTo(11, 22); ctx.lineTo(21, 22); ctx.lineTo(19, 30); ctx.lineTo(13, 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#caa074'; ctx.fillRect(10, 20, 12, 3);
    ctx.fillStyle = '#4a9850';
    for (const [dx, dy] of [[-3, -6], [0, -9], [3, -6], [0, -4]] as [number, number][]) {
      ctx.beginPath(); ctx.ellipse(16 + dx, 18 + dy, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Recycling-Mülleimer.
    ctx.fillStyle = '#7a9eb4';
    ctx.beginPath(); ctx.moveTo(11, 18); ctx.lineTo(21, 18); ctx.lineTo(19, 30); ctx.lineTo(13, 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5e84a0'; ctx.fillRect(10, 16, 12, 3);
    ctx.fillStyle = '#cfe2ec'; ctx.fillRect(14, 22, 4, 4);
  }
  ctx.restore();
}

export const tilesSchoolMethods = {
  drawSchoolGroundTile,
  drawSchoolPlatformTile,
  drawSchoolProp,
};
