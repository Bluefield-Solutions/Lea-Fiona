import type { Renderer } from '../renderer.ts';
import { TILE_SIZE } from '../constants.ts';

function drawBeachGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const topStart = top ? Math.floor(S * 0.25) : 0;

  // Angleichung an den Hügel-Boden (renderTerrainHills PAL.beach): der Kachel-
  // Körper trifft jetzt den mittleren Erd-Ton des Hügels (#8f6f3e), damit
  // freiliegende Kachel-Wände (Gruben-/Säulenflanken) farblich mit dem
  // geschwungenen Boden verschmelzen statt hell gegen dunkel zu stehen. Der
  // sandige Oberflächenstreifen bleibt (Strand-Look), er sitzt jetzt als dünne
  // Sandauflage über der angeglichenen Erde.
  const fillTone = '#8f6f3e';   // = Hügel-Mittel-Erdton (Strand)
  if (top) {
    const sandGrad = ctx.createLinearGradient(0, topStart, 0, S);
    sandGrad.addColorStop(0, '#bd9a5c');   // Hügel-Erd-Oberkante
    sandGrad.addColorStop(0.5, '#a8854a');
    sandGrad.addColorStop(1, fillTone);    // MUST end on fillTone
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, topStart, S, S - topStart);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, topStart, S, S - topStart);
  }

  if (top) {
    const surfGrad = ctx.createLinearGradient(0, 0, 0, topStart + 2);
    surfGrad.addColorStop(0, '#f0e0c0');
    surfGrad.addColorStop(0.4, '#e8d4a0');
    surfGrad.addColorStop(0.8, '#dcc890');
    surfGrad.addColorStop(1, '#d0bc85');
    ctx.fillStyle = surfGrad;
    ctx.fillRect(0, 0, S, topStart + 2);

    ctx.fillStyle = '#f5e8c8';
    ctx.fillRect(0, 0, S, 2);
  }

  ctx.strokeStyle = 'rgba(160, 130, 80, 0.15)';
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

  const pebbles = [
    { x: 6, y: 0.35, r: 1.3, c: '#c0a870' }, { x: 15, y: 0.55, r: 1.6, c: '#b89860' },
    { x: 24, y: 0.4, r: 1.1, c: '#d0b880' }, { x: 10, y: 0.75, r: 1.4, c: '#c4a870' },
  ];
  for (const p of pebbles) {
    const py = topStart + (S - topStart) * p.y;
    if (py < topStart + 2 || py > S - 2) continue;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.ellipse(p.x, py, p.r, p.r * 0.7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(p.x - 0.3, py - 0.3, p.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (top) {
    ctx.fillStyle = 'rgba(220, 200, 170, 0.4)';
    ctx.beginPath();
    ctx.ellipse(8, topStart + 3, 2, 1.2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 180, 150, 0.35)';
    ctx.beginPath();
    ctx.ellipse(22, topStart + 4, 1.8, 1, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 240, 0.2)';
    ctx.fillRect(12, topStart - 1, 1, 1);
    ctx.fillRect(26, topStart, 1, 1);
  }
}

function drawBeachBrickTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const brickH = S / 4;
  const brickW = S / 2;

  ctx.fillStyle = '#b08050';
  ctx.fillRect(0, 0, S, S);

  const brickTones: [string, string, string][] = [
    ['#d4a373', '#c49060', '#b08050'],
    ['#cc9a68', '#bc8858', '#a87848'],
    ['#d8a878', '#c89465', '#b48455'],
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

      ctx.fillStyle = 'rgba(255,240,220,0.1)';
      ctx.fillRect(bx + 1, by + 1, brickW - 2, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(bx + 1, by + brickH - 2, brickW - 2, 1);
    }
  }

  const topHL = ctx.createLinearGradient(0, 0, 0, 2);
  topHL.addColorStop(0, 'rgba(255,240,210,0.35)');
  topHL.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 2);
}

function drawBeachPipeTile(this: Renderer, ctx: CanvasRenderingContext2D, part: string) {
  const S = TILE_SIZE;
  const isTop = part.includes('top');
  const isLeft = part.includes('left');

  if (isTop) {
    const bodyGrad = ctx.createLinearGradient(0, 0, S, 0);
    if (isLeft) {
      bodyGrad.addColorStop(0, '#1a6880');
      bodyGrad.addColorStop(0.15, '#228898');
      bodyGrad.addColorStop(0.35, '#2d9bb0');
      bodyGrad.addColorStop(0.5, '#38b0c8');
      bodyGrad.addColorStop(0.7, '#2d9bb0');
      bodyGrad.addColorStop(0.9, '#228898');
      bodyGrad.addColorStop(1, '#1e7888');
    } else {
      bodyGrad.addColorStop(0, '#1e7888');
      bodyGrad.addColorStop(0.1, '#228898');
      bodyGrad.addColorStop(0.3, '#2d9bb0');
      bodyGrad.addColorStop(0.5, '#38b0c8');
      bodyGrad.addColorStop(0.65, '#2d9bb0');
      bodyGrad.addColorStop(0.85, '#228898');
      bodyGrad.addColorStop(1, '#1a6880');
    }
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(0, 4, S, S - 4);

    const lipGrad = ctx.createLinearGradient(0, 0, 0, 5);
    lipGrad.addColorStop(0, '#40c8d0');
    lipGrad.addColorStop(0.3, '#38b0c0');
    lipGrad.addColorStop(0.7, '#2d98a8');
    lipGrad.addColorStop(1, '#1e7888');
    ctx.fillStyle = lipGrad;
    ctx.fillRect(isLeft ? -2 : 0, 0, S + 2, 5);

    ctx.fillStyle = 'rgba(120,220,240,0.3)';
    ctx.fillRect(isLeft ? -2 : 0, 0, S + 2, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(isLeft ? -2 : 0, 4, S + 2, 1);

    ctx.fillStyle = 'rgba(100,200,220,0.12)';
    ctx.fillRect(S * 0.35, 6, 2, S - 8);
  } else {
    const inset = isLeft ? 4 : 0;
    const w = S - 4;
    const bodyGrad = ctx.createLinearGradient(inset, 0, inset + w, 0);
    if (isLeft) {
      bodyGrad.addColorStop(0, '#1a6880');
      bodyGrad.addColorStop(0.15, '#228898');
      bodyGrad.addColorStop(0.3, '#2a94a8');
      bodyGrad.addColorStop(0.45, '#35a8c0');
      bodyGrad.addColorStop(0.65, '#2a94a8');
      bodyGrad.addColorStop(0.85, '#228898');
      bodyGrad.addColorStop(1, '#2a94a8');
    } else {
      bodyGrad.addColorStop(0, '#2a94a8');
      bodyGrad.addColorStop(0.15, '#228898');
      bodyGrad.addColorStop(0.35, '#2a94a8');
      bodyGrad.addColorStop(0.55, '#35a8c0');
      bodyGrad.addColorStop(0.7, '#2a94a8');
      bodyGrad.addColorStop(0.85, '#228898');
      bodyGrad.addColorStop(1, '#1a6880');
    }
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(inset, 0, w, S);

    ctx.fillStyle = 'rgba(100,200,220,0.15)';
    ctx.fillRect(inset + w * 0.3, 0, 1.5, S);
  }
}

function drawBeachStoneTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#c4a070');
  grad.addColorStop(0.5, '#b89060');
  grad.addColorStop(1, '#a88050');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  ctx.strokeStyle = 'rgba(140, 110, 70, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, S / 2, S / 2);
  ctx.strokeRect(S / 2, 0, S / 2, S / 2);
  ctx.strokeRect(0, S / 2, S / 2, S / 2);
  ctx.strokeRect(S / 2, S / 2, S / 2, S / 2);

  ctx.fillStyle = 'rgba(255, 240, 210, 0.12)';
  ctx.fillRect(1, 1, S / 2 - 2, 2);
  ctx.fillRect(S / 2 + 1, S / 2 + 1, S / 2 - 2, 2);

  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let x = 0; x < S; x += 2) {
    for (let y = 0; y < S; y += 2) {
      if ((x * 7 + y * 13) % 11 < 3) ctx.fillRect(x, y, 1, 1);
    }
  }

  const topHL = ctx.createLinearGradient(0, 0, 0, 3);
  topHL.addColorStop(0, 'rgba(255,245,220,0.2)');
  topHL.addColorStop(1, 'rgba(255,245,220,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 3);

  const botSH = ctx.createLinearGradient(0, S - 3, 0, S);
  botSH.addColorStop(0, 'rgba(0,0,0,0)');
  botSH.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = botSH;
  ctx.fillRect(0, S - 3, S, 3);
}

function drawBeachWoodPlatform(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const plankW = S / 2;

  for (let p = 0; p < 2; p++) {
    const px = p * plankW;
    const toneShift = p === 0 ? 0 : -5;
    const grad = ctx.createLinearGradient(px, 0, px + plankW, 0);
    grad.addColorStop(0, `rgb(${168 + toneShift}, ${155 + toneShift}, ${128 + toneShift})`);
    grad.addColorStop(0.3, `rgb(${184 + toneShift}, ${168 + toneShift}, ${138 + toneShift})`);
    grad.addColorStop(0.7, `rgb(${180 + toneShift}, ${164 + toneShift}, ${134 + toneShift})`);
    grad.addColorStop(1, `rgb(${162 + toneShift}, ${148 + toneShift}, ${122 + toneShift})`);
    ctx.fillStyle = grad;
    ctx.fillRect(px, 0, plankW, S);

    ctx.strokeStyle = `rgba(${130 + toneShift},${115 + toneShift},${90 + toneShift},0.12)`;
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

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(plankW - 0.5, 0, 1, S);

  const nails = [[2, 2], [plankW - 3, 2], [plankW + 2, 2], [S - 3, 2], [2, S - 3], [S - 3, S - 3]];
  for (const [nx, ny] of nails) {
    ctx.fillStyle = '#8a8a8a';
    ctx.beginPath();
    ctx.arc(nx, ny, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(nx - 0.3, ny - 0.3, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const topHL = ctx.createLinearGradient(0, 0, 0, 2);
  topHL.addColorStop(0, 'rgba(255,248,230,0.35)');
  topHL.addColorStop(1, 'rgba(255,248,230,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 2);
}

function drawBeachWater(this: Renderer, ctx: CanvasRenderingContext2D, isTop: boolean, hazard = false) {
  const S = TILE_SIZE;

  const depthGrad = ctx.createLinearGradient(0, 0, 0, S);
  if (hazard) {
    // Tiefes Gefahren-Wasser: türkis an der Oberfläche, aber schnell in ein
    // dunkles Tiefblau abtauchend — signalisiert Tiefe/Gefahr statt Badespaß.
    if (isTop) {
      depthGrad.addColorStop(0, 'rgba(40, 160, 178, 0.8)');
      depthGrad.addColorStop(0.35, 'rgba(26, 118, 152, 0.9)');
      depthGrad.addColorStop(0.7, 'rgba(16, 82, 120, 0.95)');
      depthGrad.addColorStop(1, 'rgba(10, 56, 92, 0.98)');
    } else {
      depthGrad.addColorStop(0, 'rgba(11, 58, 96, 0.97)');
      depthGrad.addColorStop(0.4, 'rgba(8, 44, 78, 0.98)');
      depthGrad.addColorStop(0.75, 'rgba(6, 32, 60, 0.99)');
      depthGrad.addColorStop(1, 'rgba(4, 20, 42, 1)');
    }
  } else if (isTop) {
    depthGrad.addColorStop(0, 'rgba(64, 200, 208, 0.5)');
    depthGrad.addColorStop(0.3, 'rgba(50, 180, 200, 0.6)');
    depthGrad.addColorStop(0.6, 'rgba(40, 160, 190, 0.7)');
    depthGrad.addColorStop(1, 'rgba(30, 140, 175, 0.8)');
  } else {
    depthGrad.addColorStop(0, 'rgba(30, 140, 175, 0.8)');
    depthGrad.addColorStop(0.3, 'rgba(25, 120, 160, 0.85)');
    depthGrad.addColorStop(0.7, 'rgba(20, 100, 145, 0.88)');
    depthGrad.addColorStop(1, 'rgba(15, 85, 130, 0.9)');
  }
  ctx.fillStyle = depthGrad;
  ctx.fillRect(0, 0, S, S);

  ctx.strokeStyle = 'rgba(120,220,230,0.15)';
  ctx.lineWidth = 0.6;
  for (let ry = 4; ry < S; ry += 5) {
    ctx.beginPath();
    ctx.moveTo(0, ry);
    for (let rx = 0; rx <= S; rx += 3) {
      ctx.lineTo(rx, ry + Math.sin(rx * 0.3 + ry * 0.5) * 1.2);
    }
    ctx.stroke();
  }

  if (isTop) {
    const waveColors = [
      { color: 'rgba(80,210,230,0.5)', amp: 3, freq: 0.2, phase: 0, yOff: 4 },
      { color: 'rgba(60,190,215,0.4)', amp: 2.5, freq: 0.25, phase: 1.5, yOff: 3 },
      { color: 'rgba(100,220,240,0.35)', amp: 2, freq: 0.3, phase: 3, yOff: 5 },
    ];
    for (const wave of waveColors) {
      ctx.fillStyle = wave.color;
      ctx.beginPath();
      ctx.moveTo(0, S);
      for (let wx = 0; wx <= S; wx += 1) {
        const wy = wave.yOff + Math.sin(wx * wave.freq + wave.phase) * wave.amp;
        ctx.lineTo(wx, wy);
      }
      ctx.lineTo(S, S);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let fx = 0; fx < S; fx += 1) {
      const fy = 3 + Math.sin(fx * 0.25) * 2.5;
      const foamH = Math.max(0, 1.5 - Math.abs(Math.sin(fx * 0.4)) * 1.5);
      if (foamH > 0.3) {
        ctx.fillRect(fx, fy - foamH, 1, foamH);
      }
    }
  }
}

export const tilesBeachMethods = {
  drawBeachGroundTile,
  drawBeachBrickTile,
  drawBeachPipeTile,
  drawBeachStoneTile,
  drawBeachWoodPlatform,
  drawBeachWater,
};
