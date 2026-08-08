import type { Renderer } from '../renderer.ts';
import { TILE_SIZE } from '../constants.ts';

function drawCaveGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const topStart = top ? Math.floor(S * 0.2) : 0;

  const fillTone = '#221e28';
  if (top) {
    const rockGrad = ctx.createLinearGradient(0, topStart, 0, S);
    rockGrad.addColorStop(0, '#3a3540');
    rockGrad.addColorStop(0.5, '#2a2530');
    rockGrad.addColorStop(1, fillTone);
    ctx.fillStyle = rockGrad;
    ctx.fillRect(0, topStart, S, S - topStart);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, topStart, S, S - topStart);
  }

  if (top) {
    const surfGrad = ctx.createLinearGradient(0, 0, 0, topStart + 2);
    surfGrad.addColorStop(0, '#5a5060');
    surfGrad.addColorStop(0.5, '#4a4050');
    surfGrad.addColorStop(1, '#3a3540');
    ctx.fillStyle = surfGrad;
    ctx.fillRect(0, 0, S, topStart + 2);

    ctx.fillStyle = '#6a6070';
    ctx.fillRect(0, 0, S, 2);
  }

  // (Horizontale Schichtlinien entfernt — wirkten bei tiefem Untergrund als
  // unschöne „gerade Schichten". Die Risse unten geben weiterhin Fels-Textur.)

  const cracks = [
    { x1: 5, y1: 0.3, x2: 8, y2: 0.5, x3: 4, y3: 0.7 },
    { x1: 20, y1: 0.2, x2: 22, y2: 0.45, x3: 18, y3: 0.6 },
    { x1: 28, y1: 0.5, x2: 30, y2: 0.75, x3: 26, y3: 0.9 },
  ];
  ctx.strokeStyle = 'rgba(15, 10, 20, 0.25)';
  ctx.lineWidth = 0.6;
  for (const c of cracks) {
    const cy1 = topStart + (S - topStart) * c.y1;
    const cy2 = topStart + (S - topStart) * c.y2;
    const cy3 = topStart + (S - topStart) * c.y3;
    ctx.beginPath();
    ctx.moveTo(c.x1, cy1);
    ctx.lineTo(c.x2, cy2);
    ctx.lineTo(c.x3, cy3);
    ctx.stroke();
  }

  const pebbles = [
    { x: 7, y: 0.4, r: 1.5 }, { x: 16, y: 0.6, r: 1.8 },
    { x: 24, y: 0.35, r: 1.3 }, { x: 10, y: 0.8, r: 1.6 },
  ];
  for (const p of pebbles) {
    const py = topStart + (S - topStart) * p.y;
    if (py < topStart + 2 || py > S - 2) continue;
    ctx.fillStyle = 'rgba(70, 60, 80, 0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x, py, p.r, p.r * 0.7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(100, 90, 110, 0.2)';
    ctx.beginPath();
    ctx.arc(p.x - 0.3, py - 0.3, p.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCaveBrickTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  ctx.fillStyle = '#3d3545';
  ctx.fillRect(0, 0, S, S);

  const brickH = Math.floor(S / 4);
  const brickW = Math.floor(S / 2);
  ctx.strokeStyle = 'rgba(20, 15, 25, 0.5)';
  ctx.lineWidth = 1;
  for (let row = 0; row < 4; row++) {
    const offset = (row % 2) * (brickW / 2);
    const y = row * brickH;
    ctx.strokeRect(offset, y, brickW, brickH);
    ctx.strokeRect(offset + brickW, y, brickW, brickH);
    if (offset > 0) ctx.strokeRect(offset - brickW, y, brickW, brickH);

    const grad = ctx.createLinearGradient(0, y, 0, y + brickH);
    grad.addColorStop(0, 'rgba(80, 70, 90, 0.15)');
    grad.addColorStop(1, 'rgba(30, 25, 35, 0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(offset, y, brickW, brickH);
    ctx.fillRect(offset + brickW, y, brickW, brickH);
  }
}

function drawCaveStoneTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#3a3345');
  grad.addColorStop(0.5, '#302a3a');
  grad.addColorStop(1, '#282230');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  ctx.strokeStyle = 'rgba(20, 15, 25, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, S / 2, S / 2);
  ctx.strokeRect(S / 2, 0, S / 2, S / 2);
  ctx.strokeRect(0, S / 2, S / 2, S / 2);
  ctx.strokeRect(S / 2, S / 2, S / 2, S / 2);

  ctx.fillStyle = 'rgba(60, 50, 70, 0.15)';
  ctx.fillRect(1, 1, S / 2 - 2, 2);
  ctx.fillRect(S / 2 + 1, S / 2 + 1, S / 2 - 2, 2);
}

function drawCaveLava(this: Renderer, ctx: CanvasRenderingContext2D, isTop: boolean) {
  const S = TILE_SIZE;

  const lavaGrad = ctx.createLinearGradient(0, 0, 0, S);
  if (isTop) {
    lavaGrad.addColorStop(0, 'rgba(255, 120, 20, 0.8)');
    lavaGrad.addColorStop(0.3, 'rgba(220, 80, 10, 0.85)');
    lavaGrad.addColorStop(0.6, 'rgba(180, 50, 5, 0.9)');
    lavaGrad.addColorStop(1, 'rgba(140, 30, 0, 0.95)');
  } else {
    lavaGrad.addColorStop(0, 'rgba(140, 30, 0, 0.95)');
    lavaGrad.addColorStop(0.5, 'rgba(100, 20, 0, 0.95)');
    lavaGrad.addColorStop(1, 'rgba(80, 10, 0, 0.95)');
  }
  ctx.fillStyle = lavaGrad;
  ctx.fillRect(0, 0, S, S);

  ctx.fillStyle = 'rgba(255, 200, 50, 0.15)';
  for (let i = 0; i < 5; i++) {
    const bx = 3 + i * 6;
    const by = 5 + (i % 3) * 8;
    ctx.beginPath();
    ctx.arc(bx, by, 1 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }

  if (isTop) {
    ctx.fillStyle = 'rgba(255, 220, 100, 0.5)';
    for (let fx = 0; fx < S; fx += 1) {
      const fy = 2 + Math.sin(fx * 0.3) * 2;
      ctx.fillRect(fx, fy, 1, 1);
    }
    const glow = ctx.createLinearGradient(0, 0, 0, 8);
    glow.addColorStop(0, 'rgba(255, 180, 50, 0.4)');
    glow.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, S, 8);
  }
}

function drawCavePipeTile(this: Renderer, ctx: CanvasRenderingContext2D, part: string) {
  const S = TILE_SIZE;
  const isTop = part.includes('top');
  const isLeft = part.includes('left');

  if (isTop) {
    const bodyGrad = ctx.createLinearGradient(0, 0, S, 0);
    if (isLeft) {
      bodyGrad.addColorStop(0, '#2a1535');
      bodyGrad.addColorStop(0.15, '#3d2248');
      bodyGrad.addColorStop(0.35, '#553060');
      bodyGrad.addColorStop(0.5, '#6a3d78');
      bodyGrad.addColorStop(0.7, '#553060');
      bodyGrad.addColorStop(0.9, '#3d2248');
      bodyGrad.addColorStop(1, '#351d40');
    } else {
      bodyGrad.addColorStop(0, '#351d40');
      bodyGrad.addColorStop(0.1, '#3d2248');
      bodyGrad.addColorStop(0.3, '#553060');
      bodyGrad.addColorStop(0.5, '#6a3d78');
      bodyGrad.addColorStop(0.65, '#553060');
      bodyGrad.addColorStop(0.85, '#3d2248');
      bodyGrad.addColorStop(1, '#2a1535');
    }
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(0, 4, S, S - 4);

    const lipGrad = ctx.createLinearGradient(0, 0, 0, 5);
    lipGrad.addColorStop(0, '#8050a0');
    lipGrad.addColorStop(0.3, '#6a3d88');
    lipGrad.addColorStop(0.7, '#553070');
    lipGrad.addColorStop(1, '#402058');
    ctx.fillStyle = lipGrad;
    ctx.fillRect(isLeft ? -2 : 0, 0, S + 2, 5);

    ctx.fillStyle = 'rgba(160,120,200,0.3)';
    ctx.fillRect(isLeft ? -2 : 0, 0, S + 2, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(isLeft ? -2 : 0, 4, S + 2, 1);

    ctx.fillStyle = 'rgba(140,100,180,0.12)';
    ctx.fillRect(S * 0.35, 6, 2, S - 8);
  } else {
    const inset = isLeft ? 4 : 0;
    const w = S - 4;
    const bodyGrad = ctx.createLinearGradient(inset, 0, inset + w, 0);
    if (isLeft) {
      bodyGrad.addColorStop(0, '#2a1535');
      bodyGrad.addColorStop(0.15, '#3d2248');
      bodyGrad.addColorStop(0.3, '#4d2a58');
      bodyGrad.addColorStop(0.45, '#603570');
      bodyGrad.addColorStop(0.65, '#4d2a58');
      bodyGrad.addColorStop(0.85, '#3d2248');
      bodyGrad.addColorStop(1, '#4d2a58');
    } else {
      bodyGrad.addColorStop(0, '#4d2a58');
      bodyGrad.addColorStop(0.15, '#3d2248');
      bodyGrad.addColorStop(0.35, '#4d2a58');
      bodyGrad.addColorStop(0.55, '#603570');
      bodyGrad.addColorStop(0.7, '#4d2a58');
      bodyGrad.addColorStop(0.85, '#3d2248');
      bodyGrad.addColorStop(1, '#2a1535');
    }
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(inset, 0, w, S);

    ctx.fillStyle = 'rgba(140,100,180,0.15)';
    ctx.fillRect(inset + w * 0.3, 0, 1.5, S);
  }
}

function drawCaveWoodPlatform(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const plankW = S / 2;

  for (let p = 0; p < 2; p++) {
    const px = p * plankW;
    const toneShift = p === 0 ? 0 : -8;
    const grad = ctx.createLinearGradient(px, 0, px + plankW, 0);
    grad.addColorStop(0, `rgb(${70 + toneShift}, ${55 + toneShift}, ${45 + toneShift})`);
    grad.addColorStop(0.3, `rgb(${85 + toneShift}, ${68 + toneShift}, ${55 + toneShift})`);
    grad.addColorStop(0.7, `rgb(${80 + toneShift}, ${63 + toneShift}, ${50 + toneShift})`);
    grad.addColorStop(1, `rgb(${65 + toneShift}, ${50 + toneShift}, ${40 + toneShift})`);
    ctx.fillStyle = grad;
    ctx.fillRect(px, 0, plankW, S);

    ctx.strokeStyle = `rgba(${40 + toneShift},${30 + toneShift},${25 + toneShift},0.2)`;
    ctx.lineWidth = 0.7;
    for (let g = 0; g < 5; g++) {
      const baseY = 3 + g * 6 + p * 3;
      ctx.beginPath();
      ctx.moveTo(px + 1, baseY);
      for (let gx = px + 1; gx < px + plankW - 1; gx += 2) {
        ctx.lineTo(gx, baseY + Math.sin(gx * 0.2 + g * 1.5 + p) * 1.5);
      }
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(plankW - 0.5, 0, 1, S);

  const nails = [[2, 2], [plankW - 3, 2], [plankW + 2, 2], [S - 3, 2], [2, S - 3], [S - 3, S - 3]];
  for (const [nx, ny] of nails) {
    ctx.fillStyle = '#2a2225';
    ctx.beginPath();
    ctx.arc(nx, ny, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,100,110,0.3)';
    ctx.beginPath();
    ctx.arc(nx - 0.3, ny - 0.3, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const topHL = ctx.createLinearGradient(0, 0, 0, 2);
  topHL.addColorStop(0, 'rgba(150,130,120,0.25)');
  topHL.addColorStop(1, 'rgba(150,130,120,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 2);
}

export const tilesCaveMethods = {
  drawCaveGroundTile,
  drawCaveBrickTile,
  drawCaveStoneTile,
  drawCaveLava,
  drawCavePipeTile,
  drawCaveWoodPlatform,
};
