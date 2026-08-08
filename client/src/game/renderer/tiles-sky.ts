import type { Renderer } from '../renderer.ts';
import { TILE_SIZE } from '../constants.ts';

function drawSkyGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const topStart = top ? Math.floor(S * 0.25) : 0;

  const fillTone = '#c5bed8';
  if (top) {
    const cloudGrad = ctx.createLinearGradient(0, topStart, 0, S);
    cloudGrad.addColorStop(0, '#e8e4f0');
    cloudGrad.addColorStop(0.5, '#d0cae0');
    cloudGrad.addColorStop(1, fillTone);
    ctx.fillStyle = cloudGrad;
    ctx.fillRect(0, topStart, S, S - topStart);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, topStart, S, S - topStart);
  }

  if (top) {
    const surfGrad = ctx.createLinearGradient(0, 0, 0, topStart + 2);
    surfGrad.addColorStop(0, '#f8f4ff');
    surfGrad.addColorStop(0.3, '#f0ecf8');
    surfGrad.addColorStop(0.7, '#e8e4f0');
    surfGrad.addColorStop(1, '#e0dce8');
    ctx.fillStyle = surfGrad;
    ctx.fillRect(0, 0, S, topStart + 2);

    ctx.fillStyle = '#fff8ff';
    ctx.fillRect(0, 0, S, 2);

    for (let i = 0; i < 12; i++) {
      const gx = (i * 2.8 + 0.5) % S;
      const gh = 2 + ((i * 7 + 3) % 4);
      const bend = ((i * 13 + 5) % 5 - 2) * 0.4;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + (i % 3) * 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, topStart);
      ctx.quadraticCurveTo(gx + bend * 0.5, topStart - gh * 0.5, gx + bend, topStart - gh);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(180, 170, 200, 0.15)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 3; i++) {
    const ly = topStart + 4 + i * 8;
    if (ly >= S) break;
    ctx.beginPath();
    ctx.moveTo(0, ly);
    for (let lx = 0; lx <= S; lx += 3) {
      ctx.lineTo(lx, ly + Math.sin(lx * 0.4 + i * 2.1) * 0.8);
    }
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let i = 0; i < 6; i++) {
    const px = 3 + ((i * 17 + 5) % (S - 6));
    const py = topStart + 3 + ((i * 11 + 3) % (S - topStart - 6));
    ctx.beginPath();
    ctx.arc(px, py, 1.5 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }

  const sparkles = [
    { x: 8, y: 0.3 }, { x: 20, y: 0.5 }, { x: 28, y: 0.7 },
  ];
  for (const s of sparkles) {
    const sy = topStart + (S - topStart) * s.y;
    if (sy < topStart + 2) continue;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(s.x, sy, 1, 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(s.x - 1, sy, 1, 1);
    ctx.fillRect(s.x + 1, sy, 1, 1);
    ctx.fillRect(s.x, sy - 1, 1, 1);
    ctx.fillRect(s.x, sy + 1, 1, 1);
  }
}

function drawSkyBrickTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const brickH = S / 4;
  const brickW = S / 2;

  ctx.fillStyle = '#c8c0d8';
  ctx.fillRect(0, 0, S, S);

  const brickTones = [
    ['#e8e0f0', '#ddd5e8', '#d0c8e0'],
    ['#e0d8e8', '#d5cde0', '#c8c0d8'],
    ['#ece4f4', '#e2daea', '#d8d0e2'],
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

      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(bx + 1, by + 1, brickW - 2, 1);
      ctx.fillStyle = 'rgba(150,140,170,0.1)';
      ctx.fillRect(bx + 1, by + brickH - 2, brickW - 2, 1);
    }
  }

  const topHL = ctx.createLinearGradient(0, 0, 0, 2);
  topHL.addColorStop(0, 'rgba(255,255,255,0.4)');
  topHL.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 2);
}

function drawSkyStoneTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#ddd5e8');
  grad.addColorStop(0.5, '#d0c8e0');
  grad.addColorStop(1, '#c5bdd8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  ctx.strokeStyle = 'rgba(180, 170, 200, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, S / 2, S / 2);
  ctx.strokeRect(S / 2, 0, S / 2, S / 2);
  ctx.strokeRect(0, S / 2, S / 2, S / 2);
  ctx.strokeRect(S / 2, S / 2, S / 2, S / 2);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(1, 1, S / 2 - 2, 2);
  ctx.fillRect(S / 2 + 1, S / 2 + 1, S / 2 - 2, 2);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(S * 0.3, S * 0.3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(S * 0.7, S * 0.7, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSkyCloudPlatform(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;

  const cloudGrad = ctx.createLinearGradient(0, 0, 0, S);
  cloudGrad.addColorStop(0, '#f5f0ff');
  cloudGrad.addColorStop(0.2, '#ede8f8');
  cloudGrad.addColorStop(0.5, '#e5e0f2');
  cloudGrad.addColorStop(0.8, '#ddd8ec');
  cloudGrad.addColorStop(1, '#d5d0e6');
  ctx.fillStyle = cloudGrad;
  ctx.fillRect(0, 0, S, S);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.ellipse(S * 0.3, S * 0.35, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(S * 0.7, S * 0.55, 5, 3.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(S * 0.5, S * 0.7, 7, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();

  const topHL = ctx.createLinearGradient(0, 0, 0, 3);
  topHL.addColorStop(0, 'rgba(255,255,255,0.5)');
  topHL.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 3);

  const botSH = ctx.createLinearGradient(0, S - 3, 0, S);
  botSH.addColorStop(0, 'rgba(180,170,200,0)');
  botSH.addColorStop(1, 'rgba(180,170,200,0.15)');
  ctx.fillStyle = botSH;
  ctx.fillRect(0, S - 3, S, 3);

  for (let i = 0; i < 4; i++) {
    const sx = 5 + i * 7;
    const sy = 3 + (i * 5) % (S - 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(sx, sy, 1, 1);
  }
}

export const tilesSkyMethods = {
  drawSkyGroundTile,
  drawSkyBrickTile,
  drawSkyStoneTile,
  drawSkyCloudPlatform,
};
