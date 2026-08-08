import type { Renderer } from '../renderer.ts';
import { TILE_SIZE } from '../constants.ts';

function drawAustraliaGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const topStart = top ? Math.floor(S * 0.25) : 0;

  const fillTone = '#8b3a1a';
  if (top) {
    const earthGrad = ctx.createLinearGradient(0, topStart, 0, S);
    earthGrad.addColorStop(0, '#b85a35');
    earthGrad.addColorStop(0.5, '#9a4222');
    earthGrad.addColorStop(1, fillTone);
    ctx.fillStyle = earthGrad;
    ctx.fillRect(0, topStart, S, S - topStart);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, topStart, S, S - topStart);
  }

  if (top) {
    const surfGrad = ctx.createLinearGradient(0, 0, 0, topStart + 2);
    surfGrad.addColorStop(0, '#d4845a');
    surfGrad.addColorStop(0.4, '#c4733a');
    surfGrad.addColorStop(0.8, '#b86330');
    surfGrad.addColorStop(1, '#a85525');
    ctx.fillStyle = surfGrad;
    ctx.fillRect(0, 0, S, topStart + 2);

    ctx.fillStyle = '#d89060';
    ctx.fillRect(0, 0, S, 2);
  }

  ctx.strokeStyle = 'rgba(100, 50, 20, 0.2)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 3; i++) {
    const ly = topStart + 4 + i * 8;
    if (ly >= S) break;
    ctx.beginPath();
    ctx.moveTo(0, ly);
    for (let lx = 0; lx <= S; lx += 3) {
      ctx.lineTo(lx, ly + Math.sin(lx * 0.5 + i * 1.7) * 1);
    }
    ctx.stroke();
  }

  const cracks = [
    { x1: 5, y1: 0.3, x2: 8, y2: 0.5, x3: 4, y3: 0.7 },
    { x1: 20, y1: 0.2, x2: 22, y2: 0.45, x3: 18, y3: 0.6 },
    { x1: 28, y1: 0.5, x2: 30, y2: 0.75, x3: 26, y3: 0.9 },
  ];
  ctx.strokeStyle = 'rgba(60, 25, 10, 0.2)';
  ctx.lineWidth = 0.5;
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
    ctx.fillStyle = 'rgba(140, 70, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, py, p.r, p.r * 0.7, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (top) {
    for (let i = 0; i < 8; i++) {
      const gx = (i * 4 + 2) % S;
      const gh = 2 + ((i * 5 + 3) % 4);
      const bend = ((i * 11 + 3) % 5 - 2) * 0.3;
      ctx.strokeStyle = `rgba(180, 160, 80, ${0.15 + (i % 3) * 0.05})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(gx, topStart);
      ctx.quadraticCurveTo(gx + bend * 0.5, topStart - gh * 0.5, gx + bend, topStart - gh);
      ctx.stroke();
    }
  }
}

function drawAustraliaBrickTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const brickH = S / 4;
  const brickW = S / 2;

  ctx.fillStyle = '#7a3018';
  ctx.fillRect(0, 0, S, S);

  const brickTones: [string, string, string][] = [
    ['#b84a2a', '#a84020', '#983818'],
    ['#b04428', '#a03a1e', '#903215'],
    ['#c05030', '#b04825', '#a0401d'],
  ];

  for (let row = 0; row < 4; row++) {
    const offset = (row % 2 === 0) ? 0 : brickW / 2;
    for (let col = -1; col < 3; col++) {
      const bx = col * brickW + offset;
      if (bx + brickW <= 0 || bx >= S) continue;
      const toneIdx = (row + col + 3) % 3;
      const [top, mid, bot] = brickTones[toneIdx];
      const by = row * brickH;

      const bGrad = ctx.createLinearGradient(0, by + 1, 0, by + brickH - 1);
      bGrad.addColorStop(0, top);
      bGrad.addColorStop(0.4, mid);
      bGrad.addColorStop(1, bot);
      ctx.fillStyle = bGrad;
      ctx.fillRect(bx + 1, by + 1, brickW - 2, brickH - 2);

      ctx.fillStyle = 'rgba(255,200,160,0.1)';
      ctx.fillRect(bx + 1, by + 1, brickW - 2, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(bx + 1, by + brickH - 2, brickW - 2, 1);
    }
  }

  const topHL = ctx.createLinearGradient(0, 0, 0, 2);
  topHL.addColorStop(0, 'rgba(255,200,150,0.25)');
  topHL.addColorStop(1, 'rgba(255,200,150,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 2);

  const botSH = ctx.createLinearGradient(0, S - 2, 0, S);
  botSH.addColorStop(0, 'rgba(0,0,0,0)');
  botSH.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = botSH;
  ctx.fillRect(0, S - 2, S, 2);
}

function drawAustraliaPipeTile(this: Renderer, ctx: CanvasRenderingContext2D, part: string) {
  const S = TILE_SIZE;
  const isTop = part.includes('top');
  const isLeft = part.includes('left');

  if (isTop) {
    const bodyGrad = ctx.createLinearGradient(0, 0, S, 0);
    if (isLeft) {
      bodyGrad.addColorStop(0, '#5a3820');
      bodyGrad.addColorStop(0.15, '#6b4830');
      bodyGrad.addColorStop(0.35, '#8b6040');
      bodyGrad.addColorStop(0.5, '#9a7050');
      bodyGrad.addColorStop(0.7, '#8b6040');
      bodyGrad.addColorStop(0.9, '#6b4830');
      bodyGrad.addColorStop(1, '#604028');
    } else {
      bodyGrad.addColorStop(0, '#604028');
      bodyGrad.addColorStop(0.1, '#6b4830');
      bodyGrad.addColorStop(0.3, '#8b6040');
      bodyGrad.addColorStop(0.5, '#9a7050');
      bodyGrad.addColorStop(0.65, '#8b6040');
      bodyGrad.addColorStop(0.85, '#6b4830');
      bodyGrad.addColorStop(1, '#5a3820');
    }
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(0, 4, S, S - 4);

    const lipGrad = ctx.createLinearGradient(0, 0, 0, 5);
    lipGrad.addColorStop(0, '#a88060');
    lipGrad.addColorStop(0.3, '#987050');
    lipGrad.addColorStop(0.7, '#886040');
    lipGrad.addColorStop(1, '#705030');
    ctx.fillStyle = lipGrad;
    ctx.fillRect(isLeft ? -2 : 0, 0, S + 2, 5);

    ctx.fillStyle = 'rgba(180,140,100,0.3)';
    ctx.fillRect(isLeft ? -2 : 0, 0, S + 2, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(isLeft ? -2 : 0, 4, S + 2, 1);

    ctx.fillStyle = 'rgba(160,120,80,0.12)';
    ctx.fillRect(S * 0.35, 6, 2, S - 8);

    ctx.fillStyle = 'rgba(180, 80, 30, 0.15)';
    for (let ry = 8; ry < S; ry += 7) {
      ctx.beginPath();
      ctx.ellipse(isLeft ? 5 : S - 5, ry, 3, 1.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const inset = isLeft ? 4 : 0;
    const w = S - 4;
    const bodyGrad = ctx.createLinearGradient(inset, 0, inset + w, 0);
    if (isLeft) {
      bodyGrad.addColorStop(0, '#5a3820');
      bodyGrad.addColorStop(0.15, '#6b4830');
      bodyGrad.addColorStop(0.3, '#7a5438');
      bodyGrad.addColorStop(0.45, '#8b6048');
      bodyGrad.addColorStop(0.65, '#7a5438');
      bodyGrad.addColorStop(0.85, '#6b4830');
      bodyGrad.addColorStop(1, '#7a5438');
    } else {
      bodyGrad.addColorStop(0, '#7a5438');
      bodyGrad.addColorStop(0.15, '#6b4830');
      bodyGrad.addColorStop(0.35, '#7a5438');
      bodyGrad.addColorStop(0.55, '#8b6048');
      bodyGrad.addColorStop(0.7, '#7a5438');
      bodyGrad.addColorStop(0.85, '#6b4830');
      bodyGrad.addColorStop(1, '#5a3820');
    }
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(inset, 0, w, S);

    ctx.fillStyle = 'rgba(160,120,80,0.15)';
    ctx.fillRect(inset + w * 0.3, 0, 1.5, S);

    ctx.fillStyle = 'rgba(180, 80, 30, 0.12)';
    ctx.beginPath();
    ctx.ellipse(inset + w * 0.6, S * 0.3, 3, 2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(inset + w * 0.3, S * 0.7, 2.5, 1.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAustraliaStoneTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#a04020');
  grad.addColorStop(0.5, '#8a3518');
  grad.addColorStop(1, '#752a12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  ctx.strokeStyle = 'rgba(60, 20, 8, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, S / 2, S / 2);
  ctx.strokeRect(S / 2, 0, S / 2, S / 2);
  ctx.strokeRect(0, S / 2, S / 2, S / 2);
  ctx.strokeRect(S / 2, S / 2, S / 2, S / 2);

  ctx.fillStyle = 'rgba(180, 80, 40, 0.15)';
  ctx.fillRect(1, 1, S / 2 - 2, 2);
  ctx.fillRect(S / 2 + 1, S / 2 + 1, S / 2 - 2, 2);

  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let x = 0; x < S; x += 2) {
    for (let y = 0; y < S; y += 2) {
      if ((x * 7 + y * 13) % 11 < 3) ctx.fillRect(x, y, 1, 1);
    }
  }

  const topHL = ctx.createLinearGradient(0, 0, 0, 3);
  topHL.addColorStop(0, 'rgba(220,140,80,0.2)');
  topHL.addColorStop(1, 'rgba(220,140,80,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 3);

  const botSH = ctx.createLinearGradient(0, S - 3, 0, S);
  botSH.addColorStop(0, 'rgba(0,0,0,0)');
  botSH.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = botSH;
  ctx.fillRect(0, S - 3, S, 3);
}

function drawAustraliaWoodPlatform(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const plankW = S / 2;

  for (let p = 0; p < 2; p++) {
    const px = p * plankW;
    const toneShift = p === 0 ? 0 : -8;
    const grad = ctx.createLinearGradient(px, 0, px + plankW, 0);
    grad.addColorStop(0, `rgb(${144 + toneShift}, ${102 + toneShift}, ${70 + toneShift})`);
    grad.addColorStop(0.3, `rgb(${154 + toneShift}, ${112 + toneShift}, ${80 + toneShift})`);
    grad.addColorStop(0.7, `rgb(${150 + toneShift}, ${108 + toneShift}, ${76 + toneShift})`);
    grad.addColorStop(1, `rgb(${138 + toneShift}, ${96 + toneShift}, ${65 + toneShift})`);
    ctx.fillStyle = grad;
    ctx.fillRect(px, 0, plankW, S);

    ctx.strokeStyle = `rgba(${90 + toneShift},${60 + toneShift},${35 + toneShift},0.18)`;
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

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(plankW - 0.5, 0, 1, S);

  const nails = [[2, 2], [plankW - 3, 2], [plankW + 2, 2], [S - 3, 2], [2, S - 3], [S - 3, S - 3]];
  for (const [nx, ny] of nails) {
    ctx.fillStyle = '#4a3020';
    ctx.beginPath();
    ctx.arc(nx, ny, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,120,70,0.3)';
    ctx.beginPath();
    ctx.arc(nx - 0.3, ny - 0.3, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const topHL = ctx.createLinearGradient(0, 0, 0, 2);
  topHL.addColorStop(0, 'rgba(220,170,110,0.3)');
  topHL.addColorStop(1, 'rgba(220,170,110,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 2);
}

export const tilesAustraliaMethods = {
  drawAustraliaGroundTile,
  drawAustraliaBrickTile,
  drawAustraliaPipeTile,
  drawAustraliaStoneTile,
  drawAustraliaWoodPlatform,
};
