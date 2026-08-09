import type { Renderer } from '../renderer.ts';
import { pseudoRandom } from '../util/random';

function generateBackgroundLayers(this: Renderer, worldWidth: number) {
  const layerWidth = Math.max(this.viewportW * 2, 1600);

  // Distant layers get a soft-focus blur (depth-of-field) so the eye reads
  // them as far away — a painterly atmospheric-perspective cue. Baked once at
  // generation time, so there is no per-frame filter cost.
  const blur = (src: HTMLCanvasElement, radius: number): HTMLCanvasElement => {
    if (radius <= 0) return src;
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const bctx = c.getContext('2d')!;
    bctx.filter = `blur(${radius}px)`;
    bctx.drawImage(src, 0, 0);
    bctx.filter = 'none';
    return c;
  };

  this.bgLayers.push(blur(this.generateFarMountains(layerWidth), 2.5));
  this.bgLayers.push(blur(this.generateNearMountains(layerWidth), 1.4));
  this.bgLayers.push(blur(this.generateFarTrees(layerWidth), 0.8));
  this.bgLayers.push(this.generateMidTrees(layerWidth));
  this.bgLayers.push(this.generateNearFoliage(layerWidth));
}

function generateFarMountains(this: Renderer, w: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = 220;
  const ctx = c.getContext('2d')!;

  const layers = [
    { freq: [0.002, 0.005, 0.0008], amp: [60, 30, 50], base: 45, offset: 0, colors: ['#7595b2', '#6285a4', '#557a98'] },
    { freq: [0.003, 0.008, 0.0012], amp: [70, 35, 45], base: 35, offset: 0.5, colors: ['#5d8499', '#4f7488', '#456a7e'] },
    { freq: [0.004, 0.01, 0.0015], amp: [85, 40, 55], base: 25, offset: 1.2, colors: ['#507775', '#456a6a', '#3c6160'] },
  ];

  for (let li = 0; li < layers.length; li++) {
    const l = layers[li];
    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, l.colors[0]);
    grad.addColorStop(0.5, l.colors[1]);
    grad.addColorStop(1, l.colors[2]);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, 220);
    const heights: number[] = [];
    for (let x = 0; x <= w; x += 2) {
      let h = l.base;
      for (let f = 0; f < l.freq.length; f++) {
        h += Math.sin(x * l.freq[f] + l.offset + f * 2.1) * l.amp[f];
      }
      h += Math.sin(x * 0.02 + li * 3) * 8;
      const y = 220 - h;
      heights.push(y);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, 220);
    ctx.closePath();
    ctx.fill();

    if (li === 2) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 220);
      for (let x = 0; x <= w; x += 2) {
        const y = heights[x / 2];
        const snowThreshold = 60;
        if (y < snowThreshold) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, 220);
        }
      }
      ctx.lineTo(w, 220);
      ctx.closePath();
      const snowGrad = ctx.createLinearGradient(0, 0, 0, 80);
      snowGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
      snowGrad.addColorStop(0.5, 'rgba(230,230,250,0.3)');
      snowGrad.addColorStop(1, 'rgba(200,200,230,0)');
      ctx.fillStyle = snowGrad;
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = `rgba(255, 160, 100, ${0.04 + li * 0.02})`;
    ctx.beginPath();
    ctx.moveTo(0, 220);
    for (let x = 0; x <= w; x += 2) {
      const y = heights[x / 2];
      ctx.lineTo(x, y + 5);
    }
    ctx.lineTo(w, 220);
    ctx.closePath();
    ctx.fill();
  }

  const haze = ctx.createLinearGradient(0, 120, 0, 220);
  haze.addColorStop(0, 'rgba(150, 185, 175, 0)');
  haze.addColorStop(0.5, 'rgba(160, 195, 180, 0.10)');
  haze.addColorStop(1, 'rgba(175, 205, 185, 0.28)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 120, w, 100);

  return c;
}

function generateNearMountains(this: Renderer, w: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = 260;
  const ctx = c.getContext('2d')!;

  const hillConfigs = [
    { freq: [0.004, 0.009, 0.0018], amp: [55, 28, 40], base: 50, offset: 0.7, color: '#2a4a3d' },
    { freq: [0.005, 0.012, 0.002], amp: [65, 32, 48], base: 40, offset: 1.5, color: '#1f3d2e' },
  ];

  for (const hill of hillConfigs) {
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, hill.color);
    grad.addColorStop(0.6, '#1a3328');
    grad.addColorStop(1, '#0f2218');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, 260);
    const yVals: number[] = [];
    for (let x = 0; x <= w; x += 2) {
      let h = hill.base;
      for (let f = 0; f < hill.freq.length; f++) {
        h += Math.sin(x * hill.freq[f] + hill.offset + f * 1.8) * hill.amp[f];
      }
      const y = 260 - h;
      yVals.push(y);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, 260);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0d2218';
    for (let x = 0; x < w; x += 8 + Math.sin(x * 0.13) * 4) {
      const idx = Math.min(Math.floor(x / 2), yVals.length - 1);
      const baseY = yVals[idx];
      const treeH = 5 + Math.sin(x * 0.17) * 3;
      ctx.beginPath();
      ctx.moveTo(x - 3, baseY);
      ctx.lineTo(x, baseY - treeH);
      ctx.lineTo(x + 3, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }

  const mist = ctx.createLinearGradient(0, 180, 0, 260);
  mist.addColorStop(0, 'rgba(180, 200, 220, 0)');
  mist.addColorStop(0.6, 'rgba(180, 200, 220, 0.06)');
  mist.addColorStop(1, 'rgba(180, 200, 220, 0.15)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 180, w, 80);

  return c;
}

function generateFarTrees(this: Renderer, w: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = 280;
  const ctx = c.getContext('2d')!;

  const groundGrad = ctx.createLinearGradient(0, 220, 0, 280);
  groundGrad.addColorStop(0, '#1a4a2a');
  groundGrad.addColorStop(0.5, '#154022');
  groundGrad.addColorStop(1, '#0f351a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, 220, w, 60);

  const treeColors = ['#0d3318', '#104020', '#0a2d14'];
  const highlightColors = ['#1a5a2e', '#1d6633', '#166028'];
  const pseudoRand = pseudoRandom;

  for (let x = 0; x < w; x += 12 + pseudoRand(x * 7) * 8) {
    const treeY = 225 + pseudoRand(x * 3) * 8;
    const type = pseudoRand(x * 11);
    const colorIdx = Math.floor(pseudoRand(x * 13) * 3);

    if (type > 0.65) {
      const trunkH = 50 + pseudoRand(x * 5) * 40;
      const curve = (pseudoRand(x * 17) - 0.5) * 15;
      ctx.strokeStyle = '#2a1a0a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, treeY);
      ctx.quadraticCurveTo(x + curve, treeY - trunkH * 0.6, x + curve * 0.8, treeY - trunkH);
      ctx.stroke();

      const topX = x + curve * 0.8;
      const topY = treeY - trunkH;
      ctx.fillStyle = treeColors[colorIdx];
      const fronds = 5 + Math.floor(pseudoRand(x * 19) * 3);
      for (let f = 0; f < fronds; f++) {
        const angle = (f / fronds) * Math.PI * 2 + pseudoRand(x * 23 + f) * 0.5;
        const fLen = 15 + pseudoRand(x * 29 + f) * 12;
        const droop = 8 + pseudoRand(x * 31 + f) * 5;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(
          topX + Math.cos(angle) * fLen * 0.7, topY + Math.sin(angle) * fLen * 0.3 - 3,
          topX + Math.cos(angle) * fLen, topY + droop
        );
        ctx.lineTo(topX + Math.cos(angle) * fLen * 0.9, topY + droop + 2);
        ctx.quadraticCurveTo(
          topX + Math.cos(angle) * fLen * 0.4, topY + Math.sin(angle) * fLen * 0.2,
          topX, topY + 2
        );
        ctx.closePath();
        ctx.fill();
      }
    } else {
      const h = 45 + pseudoRand(x * 5) * 35;
      const rw = 14 + pseudoRand(x * 9) * 10;

      ctx.fillStyle = '#1a0e05';
      ctx.fillRect(x - 1, treeY - h * 0.4, 3, h * 0.4);

      ctx.fillStyle = treeColors[colorIdx];
      ctx.beginPath();
      ctx.ellipse(x, treeY - h * 0.5, rw, h * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = highlightColors[colorIdx];
      ctx.beginPath();
      ctx.ellipse(x - rw * 0.15, treeY - h * 0.55, rw * 0.7, h * 0.35, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#0d2d15';
  for (let x = 0; x < w; x += 6 + pseudoRand(x * 41) * 5) {
    const bh = 4 + pseudoRand(x * 43) * 6;
    const bw = 5 + pseudoRand(x * 47) * 4;
    ctx.beginPath();
    ctx.ellipse(x, 228 + pseudoRand(x * 49) * 5, bw, bh, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  return c;
}

function generateMidTrees(this: Renderer, w: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = 320;
  const ctx = c.getContext('2d')!;

  // Hügeliges Erd-Profil (organische Wellen) statt flachem Streifen → gibt dem
  // Mittelgrund Höhen-Variation und Masse.
  const hillY = (x: number) => 264 + Math.sin(x * 0.011) * 17 + Math.sin(x * 0.029 + 1.5) * 8;
  const groundGrad = ctx.createLinearGradient(0, 240, 0, 320);
  groundGrad.addColorStop(0, '#1a5c2a');
  groundGrad.addColorStop(0.35, '#155020');
  groundGrad.addColorStop(1, '#0d3a15');
  ctx.fillStyle = groundGrad;
  ctx.beginPath();
  ctx.moveTo(0, 320);
  for (let x = 0; x <= w; x += 6) ctx.lineTo(x, hillY(x));
  ctx.lineTo(w, 320);
  ctx.closePath();
  ctx.fill();
  // Gras-Oberkante entlang des Hügelprofils (dunkler Wulst + heller Saum).
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a8f34';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 6) { const y = hillY(x); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke();
  ctx.strokeStyle = '#46b04e';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 6) { const y = hillY(x) - 1.8; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke();

  for (let x = 0; x < w; x += 35 + Math.sin(x * 0.5) * 12) {
    this.drawJungleTree(ctx, x, hillY(x + 18) + 3, 0.75 + Math.sin(x * 0.2) * 0.3, pseudoRandom(x * 1.7 + 3));
  }

  return c;
}

function generateNearFoliage(this: Renderer, w: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = 170;
  const ctx = c.getContext('2d')!;
  const pseudoRand = pseudoRandom;

  for (let x = 0; x < w; x += 35 + pseudoRand(x * 7) * 20) {
    const type = pseudoRand(x * 11);
    if (type > 0.6) {
      const leafH = 50 + pseudoRand(x * 13) * 30;
      const leafW = 18 + pseudoRand(x * 17) * 12;
      const baseY = 165;
      const lean = (pseudoRand(x * 19) - 0.5) * 0.4;
      const hue = 100 + pseudoRand(x * 23) * 40;
      const sat = 45 + pseudoRand(x * 29) * 25;
      const lit = 16 + pseudoRand(x * 31) * 10;

      ctx.save();
      ctx.globalAlpha = 0.7 + pseudoRand(x * 37) * 0.3;

      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + lean * leafW * 0.5 - leafW * 0.6, baseY - leafH * 0.6, x + lean * leafW - leafW * 0.3, baseY - leafH);
      ctx.quadraticCurveTo(x + lean * leafW, baseY - leafH - 5, x + lean * leafW + leafW * 0.3, baseY - leafH);
      ctx.quadraticCurveTo(x + lean * leafW * 0.5 + leafW * 0.6, baseY - leafH * 0.6, x, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `hsl(${hue}, ${sat - 10}%, ${lit - 5}%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + lean * leafW * 0.5, baseY - leafH * 0.5, x + lean * leafW, baseY - leafH);
      ctx.stroke();

      for (let v = 0.2; v < 0.9; v += 0.15) {
        const vx = x + lean * leafW * v;
        const vy = baseY - leafH * v;
        const vLen = leafW * 0.3 * (1 - Math.abs(v - 0.5));
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.lineTo(vx - vLen, vy + vLen * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.lineTo(vx + vLen, vy + vLen * 0.4);
        ctx.stroke();
      }
      ctx.restore();
    } else if (type > 0.25) {
      this.drawFern(ctx, x, 162, 0.5 + pseudoRand(x * 41) * 0.4);
    } else {
      const leafH = 40 + pseudoRand(x * 43) * 25;
      const baseY = 165;
      const numLeaves = 4 + Math.floor(pseudoRand(x * 47) * 4);
      for (let i = 0; i < numLeaves; i++) {
        const angle = -Math.PI * 0.5 + (i / (numLeaves - 1) - 0.5) * Math.PI * 0.7;
        const len = leafH * (0.6 + pseudoRand(x * 53 + i) * 0.4);
        const hue = pseudoRand(x * 59 + i) > 0.85 ? 35 : (110 + pseudoRand(x * 61 + i) * 30);
        const sat = pseudoRand(x * 59 + i) > 0.85 ? 40 : (50 + pseudoRand(x * 67 + i) * 20);
        const lit = 15 + pseudoRand(x * 71 + i) * 12;

        ctx.save();
        ctx.globalAlpha = 0.6 + pseudoRand(x * 73 + i) * 0.4;
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        const tipX = x + Math.cos(angle) * len;
        const tipY = baseY + Math.sin(angle) * len;
        const cpOff = len * 0.3;
        ctx.quadraticCurveTo(x + Math.cos(angle + 0.3) * cpOff, baseY + Math.sin(angle + 0.3) * cpOff, tipX, tipY);
        ctx.quadraticCurveTo(x + Math.cos(angle - 0.3) * cpOff, baseY + Math.sin(angle - 0.3) * cpOff, x, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  return c;
}

function drawJungleTree(this: Renderer, ctx: CanvasRenderingContext2D, x: number, groundY: number, scale: number, variant = 0) {
  // variant (0..1) sorgt für Abwechslung: Neigung, Kronenfarbe, Cluster-Form.
  const trunkW = 10 * scale;
  const trunkH = (78 + variant * 20) * scale;
  const centerX = x + 18;
  const lean = (variant - 0.5) * 0.16; // leichte organische Neigung
  ctx.save();
  ctx.translate(centerX, groundY);
  ctx.transform(1, 0, lean, 1, 0, 0);
  ctx.translate(-centerX, -groundY);

  const buttressH = 18 * scale;
  ctx.fillStyle = '#2d1808';
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    ctx.moveTo(centerX + side * trunkW * 0.5, groundY);
    ctx.quadraticCurveTo(
      centerX + side * trunkW * 1.2, groundY - buttressH * 0.3,
      centerX + side * trunkW * 0.5, groundY - buttressH
    );
    ctx.lineTo(centerX + side * trunkW * 0.5, groundY);
    ctx.closePath();
    ctx.fill();
  }

  const trunkGrad = ctx.createLinearGradient(centerX - trunkW / 2, 0, centerX + trunkW / 2, 0);
  trunkGrad.addColorStop(0, '#2a1508');
  trunkGrad.addColorStop(0.3, '#3d2211');
  trunkGrad.addColorStop(0.5, '#4a2d16');
  trunkGrad.addColorStop(0.7, '#3d2211');
  trunkGrad.addColorStop(1, '#2a1508');
  ctx.fillStyle = trunkGrad;
  ctx.fillRect(centerX - trunkW / 2, groundY - trunkH, trunkW, trunkH);

  ctx.strokeStyle = '#1a0e05';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 8; i++) {
    const ly = groundY - trunkH + i * (trunkH / 8);
    ctx.beginPath();
    ctx.moveTo(centerX - trunkW / 2, ly);
    ctx.lineTo(centerX + trunkW / 2, ly + 1);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(60,40,20,0.15)';
  for (let i = 0; i < 12; i++) {
    const kx = centerX - trunkW * 0.3 + Math.sin(i * 3.7) * trunkW * 0.3;
    const ky = groundY - trunkH * 0.1 - i * (trunkH * 0.08);
    ctx.beginPath();
    ctx.ellipse(kx, ky, 2 * scale, 1.5 * scale, Math.sin(i) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  const vinePositions = [
    { ox: -trunkW * 0.8, startFrac: 0.7, len: 40, amp: 5 },
    { ox: trunkW * 1.2, startFrac: 0.8, len: 55, amp: 7 },
  ];
  ctx.strokeStyle = '#1a5a22';
  ctx.lineWidth = 1;
  for (const vine of vinePositions) {
    const vx = centerX + vine.ox;
    const vy = groundY - trunkH * vine.startFrac;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    for (let t = 0; t < vine.len * scale; t += 2) {
      ctx.lineTo(vx + Math.sin(t * 0.15) * vine.amp * scale, vy + t);
    }
    ctx.stroke();
  }

  // Kronenfarbe variiert je Baum: drei Grün-Stimmungen (frisch, tief, gelblich).
  const canopyPalettes = [
    ['#0a4a15', '#0d5a1a', '#1a7a2a', '#259a28'],
    ['#0c421a', '#10551f', '#1c6e2c', '#2a8f34'],
    ['#13501a', '#1d6a22', '#2e842c', '#43a038'],
  ];
  const pal = canopyPalettes[Math.floor(variant * 2.99) % 3];
  const canopyLayers = [
    { color: pal[0], yOff: 5, rScale: 1.1 },
    { color: pal[1], yOff: 0, rScale: 1.0 },
    { color: pal[2], yOff: -5, rScale: 0.85 },
    { color: pal[3], yOff: -10, rScale: 0.65 },
  ];
  // Cluster-Anordnung mit variant leicht verschoben → keine zwei Kronen gleich.
  const vsh = (variant - 0.5) * 10;
  for (const layer of canopyLayers) {
    const clusters = [
      { dx: 0 + vsh * 0.2, dy: 0, r: 22 }, { dx: -14 + vsh, dy: 3, r: 18 }, { dx: 14 + vsh * 0.6, dy: 2, r: 17 },
      { dx: -8 - vsh * 0.4, dy: -6, r: 15 + variant * 3 }, { dx: 10 + vsh * 0.3, dy: -5, r: 16 }, { dx: -18 + vsh, dy: 8, r: 13 },
    ];
    for (const cl of clusters) {
      const clx = centerX + cl.dx * scale;
      const cly = groundY - trunkH - 8 + (cl.dy + layer.yOff) * scale;
      const r = cl.r * scale * layer.rScale;
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.ellipse(clx, cly, r, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.ellipse(centerX - 5 * scale, groundY - trunkH - 15 * scale, 15 * scale, 10 * scale, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFern(this: Renderer, ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const numFronds = 3 + Math.floor(Math.abs(Math.sin(x * 0.3)) * 3);

  for (let f = 0; f < numFronds; f++) {
    const spreadAngle = (f / (numFronds - 1) - 0.5) * 1.4;
    const frondLen = 35 * scale + Math.sin(f * 2.3) * 8 * scale;
    const segments = 12;

    const stemHue = 120 + Math.sin(f * 1.5) * 15;
    const tipHue = 75 + Math.sin(f * 2.1) * 15;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spreadAngle);

    const stemPoints: { px: number; py: number }[] = [];
    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const sx = Math.sin(t * 2.5 + f) * 4 * scale * t;
      const sy = -t * frondLen;
      stemPoints.push({ px: sx, py: sy });
    }

    ctx.strokeStyle = `hsl(${stemHue}, 55%, 22%)`;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(stemPoints[0].px, stemPoints[0].py);
    for (let s = 1; s < stemPoints.length; s++) {
      ctx.lineTo(stemPoints[s].px, stemPoints[s].py);
    }
    ctx.stroke();

    for (let s = 1; s < stemPoints.length - 1; s++) {
      const t = s / segments;
      const leafLen = (8 + (1 - t) * 10) * scale;
      const hue = stemHue + (tipHue - stemHue) * t;
      const lit = 20 + t * 15;

      for (let side = -1; side <= 1; side += 2) {
        ctx.fillStyle = `hsl(${hue}, ${55 + t * 10}%, ${lit}%)`;
        const base = stemPoints[s];
        const angle = side * (0.5 + t * 0.3);
        const tipPx = base.px + Math.cos(angle - Math.PI / 2) * leafLen;
        const tipPy = base.py + Math.sin(angle - Math.PI / 2) * leafLen;

        ctx.beginPath();
        ctx.moveTo(base.px, base.py);
        ctx.quadraticCurveTo(
          base.px + (tipPx - base.px) * 0.5 + side * 2 * scale,
          base.py + (tipPy - base.py) * 0.5 - 1,
          tipPx, tipPy
        );
        ctx.quadraticCurveTo(
          base.px + (tipPx - base.px) * 0.5 - side * 1 * scale,
          base.py + (tipPy - base.py) * 0.5 + 1,
          base.px, base.py + 2
        );
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

// =====================================================================
//  Per-world signature parallax silhouettes
//
//  Each of the 10 worlds has one signature mid-distance silhouette
//  baked once into an offscreen canvas and stored in
//  `renderer.signatureLayers`. The world's draw function then performs a
//  single drawImage with a parallax offset — no per-frame allocations.
//
//  Layers are sized to the silhouette content (not full layerWidth) so
//  memory cost is bounded and tiling is handled by the per-world draw
//  via modulo on the parallax period.
// =====================================================================
function getSignatureLayer(this: Renderer, theme: string): HTMLCanvasElement {
  const cached = this.signatureLayers.get(theme);
  if (cached) return cached;
  const c = buildSignatureLayer(theme);
  this.signatureLayers.set(theme, c);
  return c;
}

function buildSignatureLayer(theme: string): HTMLCanvasElement {
  switch (theme) {
    case 'cave': return buildCaveSignature();
    case 'sky': return buildSkySignature();
    case 'beach': return buildBeachSignature();
    case 'australia': return buildAustraliaSignature();
    case 'volcano': return buildVolcanoSignature();
    case 'ice': return buildIceSignature();
    case 'castle': return buildCastleSignature();
    case 'underwater': return buildUnderwaterSignature();
    case 'space': return buildSpaceSignature();
    default: return buildJungleSignature();
  }
}

// Jungle: distant stepped Maya temple pyramid (El-Castillo-Stil) mit
// 3D-Stufenschattierung, Mitteltreppe, Tempelschrein auf der Spitze und Moos.
// Warmer, dunst-getönter Kalkstein, damit er als ferne Ruine im Dschungel liest.
function buildJungleSignature(): HTMLCanvasElement {
  const w = 210; const h = 140;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;

  // Kalkstein, durch Dschungel-Dunst leicht grün-grau gebrochen.
  const A = 0.66;                                  // Grund-Deckkraft (fern)
  const light = `rgba(164,168,132,${A + 0.12})`;   // sonnenbeschienene Ledges
  const mid = `rgba(122,128,98,${A})`;             // Frontflächen
  const dark = `rgba(86,94,70,${A})`;              // Schatten/Seitenflächen
  const deep = `rgba(60,68,50,${A})`;              // tiefe Fugen
  const moss = `rgba(96,140,74,${A - 0.06})`;

  const cx = w / 2;
  const baseY = h - 4;
  const tiers = 6;
  const stepH = 17;
  const baseW = w * 0.88;

  // Weicher Dunst-Halo hinter dem Tempel (atmosphärische Tiefe).
  const halo = ctx.createRadialGradient(cx, baseY - 70, 10, cx, baseY - 70, 130);
  halo.addColorStop(0, 'rgba(150,170,140,0.18)');
  halo.addColorStop(1, 'rgba(150,170,140,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Stufen von unten nach oben (breit → schmal), jede mit 3D-Schattierung.
  for (let t = 0; t < tiers; t++) {
    const tw = baseW * (1 - t * 0.132);
    const yTop = baseY - (t + 1) * stepH;
    const xL = cx - tw / 2;
    // Frontfläche
    ctx.fillStyle = mid;
    ctx.fillRect(xL, yTop, tw, stepH);
    // linke Seitenfläche (im Schatten) → Volumen
    ctx.fillStyle = dark;
    ctx.fillRect(xL, yTop, tw * 0.13, stepH);
    // rechte Kante etwas heller (Sonne von rechts)
    ctx.fillStyle = light;
    ctx.fillRect(xL + tw - tw * 0.05, yTop, tw * 0.05, stepH);
    // sonnenbeschienene Deckplatte (die „Stufe", auf der man stünde)
    ctx.fillStyle = light;
    ctx.fillRect(xL, yTop, tw, 3.5);
    // dunkle Fuge an der Stufen-Unterkante
    ctx.fillStyle = deep;
    ctx.fillRect(xL, yTop + stepH - 2, tw, 2);
  }

  // Mitteltreppe von der Basis bis zum Schrein, mit einzelnen Trittstufen.
  const apexY = baseY - tiers * stepH;
  const sw = 30;
  const sxL = cx - sw / 2;
  ctx.fillStyle = `rgba(150,156,120,${A + 0.06})`;
  ctx.fillRect(sxL, apexY, sw, baseY - apexY);
  // Treppen-Seitenwangen (Schatten)
  ctx.fillStyle = deep;
  ctx.fillRect(sxL - 2, apexY, 2.5, baseY - apexY);
  ctx.fillRect(sxL + sw - 0.5, apexY, 2.5, baseY - apexY);
  // Trittstufen (dunkle Rillen)
  ctx.fillStyle = `rgba(70,78,56,${A})`;
  for (let sy = apexY + 5; sy < baseY; sy += 6) {
    ctx.fillRect(sxL + 1, sy, sw - 2, 1.6);
  }

  // Tempelschrein auf der Spitze.
  const templeW = 48, templeH = 24;
  const txL = cx - templeW / 2, tyT = apexY - templeH;
  ctx.fillStyle = mid;
  ctx.fillRect(txL, tyT, templeW, templeH);
  ctx.fillStyle = dark;                            // linke Schattenwand
  ctx.fillRect(txL, tyT, templeW * 0.16, templeH);
  ctx.fillStyle = light;                           // Dachsims (Sonne)
  ctx.fillRect(txL - 3, tyT - 4, templeW + 6, 5);
  ctx.fillStyle = `rgba(38,46,34,${A + 0.14})`;    // dunkler Tür-Eingang
  ctx.fillRect(cx - 7, apexY - 15, 14, 15);
  // Krönchen/Dachkamm
  ctx.fillStyle = light;
  ctx.fillRect(cx - 4, tyT - 9, 8, 6);

  // Moos-Akzente auf einigen Ledges + Dach (lebendige Ruine).
  ctx.fillStyle = moss;
  const mossSpots: [number, number, number][] = [
    [cx - baseW * 0.42, baseY - stepH + 1, 12],
    [cx + baseW * 0.30, baseY - 2 * stepH + 1, 10],
    [cx - baseW * 0.18, baseY - 4 * stepH + 1, 8],
    [cx + templeW * 0.2, tyT - 4, 9],
  ];
  for (const [mx, my, mw] of mossSpots) {
    ctx.beginPath();
    ctx.ellipse(mx, my, mw, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Basis sanft in den Bodendunst absinken lassen.
  const fade = ctx.createLinearGradient(0, baseY - 20, 0, baseY);
  fade.addColorStop(0, 'rgba(150,170,140,0)');
  fade.addColorStop(1, 'rgba(150,170,140,0.16)');
  ctx.fillStyle = fade;
  ctx.fillRect(cx - baseW / 2, baseY - 20, baseW, 20);

  return c;
}

// Cave: glowing crystal cluster on the horizon.
function buildCaveSignature(): HTMLCanvasElement {
  // Auf Wunsch (Stephan) KOMPLETT entfernt: die großen lila-fliederfarbigen
  // Kristall-Spitzen als Höhlen-Wahrzeichen gefielen nicht. Die Signatur bleibt
  // als leere (transparente) Ebene bestehen — Höhle & Drachenhöhle behalten ihre
  // übrige Atmosphäre (alte Mine, Stalaktiten, Dunst). Kein Neuzeichnen nötig.
  const w = 120; const h = 140;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  // absichtlich leer lassen (nur transparente Fläche)
  return c;
}

// Sky: drifting hot-air balloon (envelope, basket, ropes).
function buildSkySignature(): HTMLCanvasElement {
  const w = 60; const h = 80;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const cx = w / 2; const by = 30; const r = 22;
  const eg = ctx.createRadialGradient(cx - r * 0.3, by - r * 0.4, 2, cx, by, r);
  eg.addColorStop(0, '#ff8aa0');
  eg.addColorStop(0.6, '#d8405c');
  eg.addColorStop(1, '#7a1830');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.ellipse(cx, by, r, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 235, 120, 0.85)';
  for (let s = 0; s < 4; s++) {
    if (s % 2 !== 0) continue;
    const sa = -Math.PI / 2 + (s - 1.5) * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, by);
    ctx.arc(cx, by, r, sa - 0.18, sa + 0.18);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(60, 30, 20, 0.7)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.6, by + r * 0.95); ctx.lineTo(cx - 4, by + r * 1.6);
  ctx.moveTo(cx + r * 0.6, by + r * 0.95); ctx.lineTo(cx + 4, by + r * 1.6);
  ctx.stroke();
  ctx.fillStyle = '#7a4a20';
  ctx.fillRect(cx - 6, by + r * 1.6, 12, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(cx - 6, by + r * 1.6 + 5, 12, 2);
  return c;
}

// Beach: distant sailboat with two sails and hull.
// Beach: Leuchtturm auf einer Felsspitze (rot-weiß gestreift, leuchtende
// Laterne, rotes Dach) mit einem kleinen Segelboot davor als Szenen-Detail.
function buildBeachSignature(): HTMLCanvasElement {
  const w = 96; const h = 116;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const A = 0.9;
  const cx = 34;                     // Leuchtturm-Mitte (links, Boot rechts)
  const baseY = h - 6;

  // Felssockel.
  ctx.fillStyle = `rgba(96,108,116,${A})`;
  ctx.beginPath();
  ctx.moveTo(cx - 22, baseY);
  ctx.quadraticCurveTo(cx - 18, baseY - 12, cx - 8, baseY - 13);
  ctx.lineTo(cx + 10, baseY - 13);
  ctx.quadraticCurveTo(cx + 20, baseY - 11, cx + 24, baseY);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(70,82,90,${A})`;
  ctx.fillRect(cx - 22, baseY - 3, 46, 3);

  // Turm (leicht konisch), rot-weiß gebändert.
  const towerTop = 30, towerBot = baseY - 12;
  const topHalf = 8, botHalf = 13;
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const y0 = towerTop + (towerBot - towerTop) * (i / bands);
    const y1 = towerTop + (towerBot - towerTop) * ((i + 1) / bands);
    const hw0 = topHalf + (botHalf - topHalf) * (i / bands);
    const hw1 = topHalf + (botHalf - topHalf) * ((i + 1) / bands);
    ctx.fillStyle = i % 2 === 0 ? `rgba(242,239,230,${A})` : `rgba(206,66,58,${A})`;
    ctx.beginPath();
    ctx.moveTo(cx - hw0, y0); ctx.lineTo(cx + hw0, y0);
    ctx.lineTo(cx + hw1, y1); ctx.lineTo(cx - hw1, y1);
    ctx.closePath(); ctx.fill();
  }
  // Schatten rechts (Volumen).
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath();
  ctx.moveTo(cx + topHalf * 0.4, towerTop); ctx.lineTo(cx + topHalf, towerTop);
  ctx.lineTo(cx + botHalf, towerBot); ctx.lineTo(cx + botHalf * 0.4, towerBot);
  ctx.closePath(); ctx.fill();

  // Galerie (Plattform) unter der Laterne.
  ctx.fillStyle = `rgba(60,66,74,${A})`;
  ctx.fillRect(cx - topHalf - 3, towerTop - 3, (topHalf + 3) * 2, 4);

  // Laternenraum (Glas mit warmem Licht) + Leucht-Halo.
  const lampY = towerTop - 13;
  const halo = ctx.createRadialGradient(cx, lampY + 4, 2, cx, lampY + 4, 26);
  halo.addColorStop(0, 'rgba(255,236,160,0.6)');
  halo.addColorStop(1, 'rgba(255,236,160,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 26, lampY - 22, 52, 52);
  ctx.fillStyle = `rgba(255,232,150,${A})`;
  ctx.fillRect(cx - 6, lampY, 12, 10);
  ctx.fillStyle = `rgba(70,78,86,${A})`;      // Sprossen
  ctx.fillRect(cx - 1, lampY, 2, 10);
  // Rotes Dach (Kegel) + Kugel.
  ctx.fillStyle = `rgba(150,52,46,${A})`;
  ctx.beginPath();
  ctx.moveTo(cx - 8, lampY); ctx.lineTo(cx + 8, lampY); ctx.lineTo(cx, lampY - 10);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(70,78,86,${A})`;
  ctx.beginPath(); ctx.arc(cx, lampY - 11, 1.6, 0, Math.PI * 2); ctx.fill();
  // Tür am Fuß.
  ctx.fillStyle = `rgba(70,50,36,${A})`;
  ctx.fillRect(cx - 3, towerBot - 9, 6, 9);

  // Kleines Segelboot rechts (Szenen-Detail).
  const bx = 78, by = baseY - 4;
  ctx.fillStyle = `rgba(58,40,26,${A})`;
  ctx.beginPath();
  ctx.moveTo(bx - 9, by); ctx.lineTo(bx + 9, by);
  ctx.lineTo(bx + 6, by + 4); ctx.lineTo(bx - 6, by + 4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(242,239,230,${A})`;
  ctx.beginPath(); ctx.moveTo(bx, by - 15); ctx.lineTo(bx + 8, by - 1); ctx.lineTo(bx, by - 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(210,214,222,${A})`;
  ctx.beginPath(); ctx.moveTo(bx - 1, by - 15); ctx.lineTo(bx - 1, by - 1); ctx.lineTo(bx - 7, by - 1); ctx.closePath(); ctx.fill();
  return c;
}

// Australia: Uluru-style monolith with sunlit ridge highlight.
function buildAustraliaSignature(): HTMLCanvasElement {
  const w = 240; const h = 36;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(120, 50, 30, 0.55)');
  g.addColorStop(1, 'rgba(80, 30, 20, 0.6)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.quadraticCurveTo(w * 0.15, h * 0.05, w * 0.5, 0);
  ctx.quadraticCurveTo(w * 0.85, h * 0.2, w, h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255, 180, 110, 0.18)';
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.4);
  ctx.quadraticCurveTo(w * 0.5, h * 0.05, w * 0.9, h * 0.5);
  ctx.lineTo(w * 0.85, h * 0.55);
  ctx.quadraticCurveTo(w * 0.5, h * 0.15, w * 0.15, h * 0.5);
  ctx.closePath(); ctx.fill();
  return c;
}

// Volcano: distant ash-spewing cinder cone silhouette with smoke plume.
function buildVolcanoSignature(): HTMLCanvasElement {
  const w = 160; const h = 130;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const cx = w / 2;
  // Cone
  const grad = ctx.createLinearGradient(0, h * 0.2, 0, h);
  grad.addColorStop(0, 'rgba(40, 12, 14, 0.9)');
  grad.addColorStop(1, 'rgba(10, 4, 6, 0.95)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(cx - 14, h * 0.32);
  ctx.lineTo(cx + 14, h * 0.32);
  ctx.lineTo(w, h);
  ctx.closePath(); ctx.fill();
  // Lava lip glow
  const lip = ctx.createRadialGradient(cx, h * 0.32, 2, cx, h * 0.32, 26);
  lip.addColorStop(0, 'rgba(255, 220, 120, 0.85)');
  lip.addColorStop(0.6, 'rgba(255, 100, 30, 0.45)');
  lip.addColorStop(1, 'rgba(80, 0, 0, 0)');
  ctx.fillStyle = lip;
  ctx.fillRect(cx - 26, h * 0.32 - 26, 52, 52);
  // Lava streaks down the side
  ctx.strokeStyle = 'rgba(255, 130, 50, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx + 6, h * 0.34);
  ctx.quadraticCurveTo(cx + 18, h * 0.55, cx + 30, h * 0.95);
  ctx.stroke();
  // Ash plume
  for (let s = 0; s < 5; s++) {
    const py = h * 0.32 - 14 - s * 16;
    const pr = 14 + s * 5;
    ctx.fillStyle = `rgba(60, 40, 50, ${0.22 - s * 0.035})`;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(s) * 5, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

// Ice: Iglu-Dorf — ein großes Schneeblock-Iglu mit Eingangs-Tunnel, ein
// kleineres daneben, plus zwei Pinguine als Bewohner. Kühle, glasige Weißtöne.
function buildIceSignature(): HTMLCanvasElement {
  const w = 150; const h = 78;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const A = 0.94;
  const snow = `rgba(244,250,255,${A})`;
  const snowShade = `rgba(150,182,210,${A})`;      // kräftigere Schattenseite
  const block = `rgba(120,156,190,${A * 0.85})`;    // deutlichere Blockfugen
  const rim = `rgba(96,132,170,${A})`;              // kühle Kontur zur Abhebung
  const dark = `rgba(30,46,66,${A})`;

  const igloo = (cx: number, baseY: number, r: number) => {
    // Weicher Schlagschatten auf dem Schnee → hebt das Iglu ab.
    ctx.fillStyle = 'rgba(70,104,140,0.28)';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.28, baseY + 2.5, r * 1.02, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    // Kuppel.
    const g = ctx.createLinearGradient(cx - r, baseY - r, cx + r, baseY);
    g.addColorStop(0, snow); g.addColorStop(0.65, snow); g.addColorStop(1, snowShade);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, baseY, r, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - r, baseY - 1, r * 2, 2);
    // Kühle Kontur entlang der Kuppel → Abhebung vom hellen Himmel.
    ctx.strokeStyle = rim; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, baseY, r, Math.PI, Math.PI * 2); ctx.stroke();
    // Schneeblock-Fugen (bögenförmig).
    ctx.strokeStyle = block; ctx.lineWidth = 1;
    for (let ring = 1; ring <= 3; ring++) {
      const rr = r * (1 - ring * 0.24);
      ctx.beginPath(); ctx.arc(cx, baseY, rr, Math.PI, Math.PI * 2); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx, baseY - r); ctx.lineTo(cx, baseY); ctx.stroke();
    for (const a of [Math.PI * 1.3, Math.PI * 1.7]) {
      ctx.beginPath(); ctx.moveTo(cx, baseY); ctx.lineTo(cx + Math.cos(a) * r, baseY + Math.sin(a) * r); ctx.stroke();
    }
    // Eingangs-Tunnel.
    const tw = r * 0.5;
    ctx.fillStyle = snowShade;
    ctx.beginPath(); ctx.arc(cx, baseY, tw, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - tw, baseY - tw * 0.6, tw * 2, tw * 0.6);
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(cx, baseY, tw * 0.6, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - tw * 0.6, baseY - tw * 0.4, tw * 1.2, tw * 0.4);
  };

  const baseY = h - 8;
  // Schnee-Schelf.
  ctx.fillStyle = snowShade;
  ctx.beginPath();
  ctx.moveTo(0, baseY + 6);
  ctx.quadraticCurveTo(w * 0.5, baseY - 2, w, baseY + 4);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

  igloo(48, baseY, 34);       // großes Iglu
  igloo(112, baseY, 22);      // kleineres Iglu

  // Zwei Pinguine davor.
  for (const [px, s] of [[86, 1], [128, 0.85]] as [number, number][]) {
    const ph = 15 * s;
    ctx.fillStyle = '#20222e';
    ctx.beginPath(); ctx.ellipse(px, baseY, 5 * s, ph * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.ellipse(px, baseY + 1, 3 * s, ph * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb040';
    ctx.fillRect(px - 1, baseY - ph * 0.42, 2 * s, 1.4);
  }
  return c;
}

// Castle: distant gothic cathedral spire silhouette with faint window glow.
function buildCastleSignature(): HTMLCanvasElement {
  const w = 90; const h = 130;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const cx = w / 2;
  ctx.fillStyle = 'rgba(8, 4, 16, 0.92)';
  // Main tower body
  ctx.fillRect(cx - 14, h * 0.32, 28, h * 0.68);
  // Side buttresses
  ctx.fillRect(cx - 26, h * 0.55, 10, h * 0.45);
  ctx.fillRect(cx + 16, h * 0.55, 10, h * 0.45);
  // Spire roofs
  ctx.beginPath();
  ctx.moveTo(cx - 14, h * 0.32);
  ctx.lineTo(cx, h * 0.05);
  ctx.lineTo(cx + 14, h * 0.32);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 26, h * 0.55);
  ctx.lineTo(cx - 21, h * 0.42);
  ctx.lineTo(cx - 16, h * 0.55);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 16, h * 0.55);
  ctx.lineTo(cx + 21, h * 0.42);
  ctx.lineTo(cx + 26, h * 0.55);
  ctx.closePath(); ctx.fill();
  // Cross at peak
  ctx.fillRect(cx - 0.5, 0, 1, 8);
  ctx.fillRect(cx - 3, 3, 6, 1);
  // Stained-glass window glow
  ctx.fillStyle = 'rgba(255, 180, 80, 0.55)';
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.55, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tiny side windows
  ctx.fillStyle = 'rgba(255, 180, 80, 0.35)';
  ctx.fillRect(cx - 22, h * 0.7, 2, 3);
  ctx.fillRect(cx + 20, h * 0.7, 2, 3);
  return c;
}

// Underwater: large baleen whale silhouette.
// Underwater: gesunkene Galeone (Schiffswrack) auf dem fernen Meeresgrund.
// Leicht auf die Seite gekippt, gebrochener Mast mit zerfetztem Segel,
// Bullaugen mit schwachem Glimmen, Algen/Korallen am Rumpf. Kühle,
// dunstige Tiefsee-Silhouette als Wahrzeichen — nicht schwebend, es ruht.
function buildUnderwaterSignature(): HTMLCanvasElement {
  const w = 210; const h = 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;

  const A = 0.74;
  const hullDark = `rgba(14,38,60,${A})`;
  const hullMid = `rgba(24,54,82,${A})`;
  const plank = `rgba(46,80,110,${A})`;
  const mastCol = `rgba(20,46,68,${A})`;
  const sailCol = `rgba(120,150,176,${A * 0.42})`;
  const weed = `rgba(56,150,128,${A - 0.02})`;
  const glow = 'rgba(150,200,214,0.5)';

  // Listing-Kippung: alles leicht gedreht → liegt schief am Grund.
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.10);
  ctx.translate(-w / 2, -h / 2);

  // ── Rumpf (Galeonen-Form): hohe Bug- und Heckkastelle, geschwungener Kiel ──
  ctx.fillStyle = hullMid;
  ctx.beginPath();
  ctx.moveTo(30, 60);                       // Bugkante oben
  ctx.lineTo(44, 48);
  ctx.bezierCurveTo(64, 46, 150, 46, 168, 52); // Deckslinie zum Heck
  ctx.lineTo(182, 44);                      // Heckkastell oben
  ctx.lineTo(184, 66);
  ctx.bezierCurveTo(178, 96, 150, 108, 108, 108); // Rumpf-Unterseite (Kiel)
  ctx.bezierCurveTo(74, 108, 44, 96, 30, 74);
  ctx.closePath();
  ctx.fill();

  // Unterer Rumpf abgedunkelt (im Sediment/Schatten).
  ctx.fillStyle = hullDark;
  ctx.beginPath();
  ctx.moveTo(34, 78);
  ctx.bezierCurveTo(60, 104, 150, 104, 178, 74);
  ctx.bezierCurveTo(150, 100, 60, 100, 34, 78);
  ctx.closePath();
  ctx.fill();

  // Planken-Linien (heller) folgen der Rumpfkrümmung.
  ctx.strokeStyle = plank;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const yy = 60 + i * 10;
    ctx.beginPath();
    ctx.moveTo(36, yy);
    ctx.bezierCurveTo(80, yy + 10, 140, yy + 10, 176, yy - 2);
    ctx.stroke();
  }
  // Deck-/Reling-Linie oben.
  ctx.strokeStyle = plank;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(44, 48);
  ctx.bezierCurveTo(80, 45, 150, 45, 168, 52);
  ctx.stroke();

  // Bullaugen mit schwachem Glimmen (Leben im Wrack?).
  for (const [bx, by] of [[70, 70], [92, 71], [114, 71], [136, 70]] as [number, number][]) {
    ctx.fillStyle = 'rgba(8,20,32,0.9)';
    ctx.beginPath(); ctx.arc(bx, by, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(bx, by, 1.6, 0, Math.PI * 2); ctx.fill();
  }

  // Bugspriet (schräger Spar am Bug).
  ctx.strokeStyle = mastCol; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(40, 52); ctx.lineTo(14, 36); ctx.stroke();

  // ── Gebrochener Hauptmast + zerfetztes Segel + Rah ──
  ctx.strokeStyle = mastCol; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(96, 50); ctx.lineTo(84, 8); ctx.stroke();  // Mast, geneigt
  // Rah (Querbalken) nahe der Spitze.
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(60, 20); ctx.lineTo(112, 16); ctx.stroke();
  // Zerfetztes Segel (unregelmäßiges, durchhängendes Tuch).
  ctx.fillStyle = sailCol;
  ctx.beginPath();
  ctx.moveTo(66, 20);
  ctx.lineTo(106, 17);
  ctx.lineTo(102, 40);
  ctx.lineTo(92, 32);
  ctx.lineTo(82, 44);
  ctx.lineTo(74, 33);
  ctx.closePath();
  ctx.fill();
  // Kurzer, abgebrochener Heckmast.
  ctx.strokeStyle = mastCol; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(156, 50); ctx.lineTo(160, 26); ctx.stroke();

  // ── Algen/Korallen am Rumpf (lange versunken) ──
  ctx.strokeStyle = weed; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (const [gx, gy, dir] of [[52, 62, -1], [128, 60, 1], [170, 58, 1]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + dir * 6, gy - 12, gx + dir * 2, gy - 22);
    ctx.stroke();
  }
  // Korallen-Knollen am Kiel.
  ctx.fillStyle = weed;
  for (const [cx2, cy2] of [[80, 104], [120, 105]] as [number, number][]) {
    ctx.beginPath(); ctx.ellipse(cx2, cy2, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();

  // Aufsteigende Blasen neben dem Wrack (leicht, nicht gedreht).
  ctx.fillStyle = 'rgba(170,210,224,0.35)';
  for (const [bx, by, r] of [[188, 40, 2.2], [194, 24, 1.6], [190, 10, 1.2]] as [number, number, number][]) {
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
  }

  return c;
}

// Space: distant ringed gas giant with shadowed terminator.
function buildSpaceSignature(): HTMLCanvasElement {
  const w = 160; const h = 70;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const cx = w / 2; const cy = h / 2; const r = 24;
  // Outer ring far edge
  ctx.strokeStyle = 'rgba(180, 160, 140, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 2.6, r * 0.55, -0.25, 0, Math.PI * 2);
  ctx.stroke();
  // Planet body
  const pg = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
  pg.addColorStop(0, '#dab070');
  pg.addColorStop(0.5, '#a86840');
  pg.addColorStop(1, '#3a1408');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // Atmospheric bands
  ctx.fillStyle = 'rgba(120, 60, 30, 0.4)';
  ctx.fillRect(cx - r, cy - 4, r * 2, 2);
  ctx.fillRect(cx - r, cy + 6, r * 2, 1);
  // Shadow side
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath(); ctx.arc(cx + r * 0.35, cy + r * 0.1, r, 0, Math.PI * 2); ctx.fill();
  // Front ring
  ctx.strokeStyle = 'rgba(220, 200, 180, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 2.2, r * 0.45, -0.25, 0.1, Math.PI - 0.1);
  ctx.stroke();
  return c;
}

// Convenience helper: draw the cached per-theme signature layer with
// horizontal parallax tiling. Centralises the modulo math so each
// world's draw function reduces to a one-line call.
function drawSignatureLayer(
  this: Renderer,
  theme: string,
  cameraX: number,
  baseX: number,
  y: number,
  parallax: number,
  period?: number,
): void {
  const sprite = this.getSignatureLayer(theme);
  const W = this.viewportW;
  const p = period ?? W * 1.5;
  const x = ((baseX - cameraX * parallax) % p + p) % p - sprite.width;
  this.ctx.drawImage(sprite, x, y);
}

// Zusätzliche, sehr ferne Landschafts-Ebene: zwei prozedural gestaffelte
// Bergketten in dunst-getönter Theme-Farbe. Sie liegen HINTER der
// Signature-Silhouette und ziehen mit winzigem Parallax-Faktor, wodurch
// eine weitere Tiefenstaffelung zwischen Himmel und Mittelgrund entsteht.
// Kostengünstig: zwei gefüllte Pfade mit je ~20 Stützpunkten, kein Cache.
function drawFarRange(this: Renderer, cameraX: number): void {
  const theme = this.currentTheme;
  const CFG: Record<string, { c: string; baseY: number }> = {
    jungle: { c: '118,150,122', baseY: 0.50 },
    cave: { c: '34,40,60', baseY: 0.54 },
    sky: { c: '176,201,229', baseY: 0.48 },
    beach: { c: '150,182,208', baseY: 0.52 },
    australia: { c: '182,146,104', baseY: 0.54 },
    volcano: { c: '82,56,60', baseY: 0.52 },
    ice: { c: '188,212,236', baseY: 0.54 },
    castle: { c: '50,44,72', baseY: 0.52 },
    underwater: { c: '32,90,116', baseY: 0.56 },
  };
  const cfg = CFG[theme];
  if (!cfg) return; // Weltraum: keine Landmasse
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;
  // Drei gestaffelte Ketten für gemalte Tiefe: je ferner (kleinerer Index),
  // desto höher, heller und dunstiger (atmosphärische Perspektive). Ein heller
  // Saum auf jedem Rücken liest sich als gestreutes Licht über den Hügeln.
  const LAYERS = 3;
  for (let layer = 0; layer < LAYERS; layer++) {
    const parallax = 0.012 + layer * 0.011;
    const baseY = H * (cfg.baseY + layer * 0.05);
    const amp = H * (0.09 - layer * 0.018);
    const freq = 0.0072 + layer * 0.003;
    const phase = layer * 2.6;
    const alpha = 0.30 + layer * 0.17; // hintere Ketten transparenter (Dunst)
    const ridge: { x: number; y: number }[] = [];
    for (let x = -12; x <= W + 12; x += 10) {
      const wx = x + cameraX * parallax;
      const y = baseY
        + Math.sin(wx * freq + phase) * amp
        + Math.sin(wx * freq * 2.3 + phase * 1.7) * amp * 0.3
        + Math.sin(wx * freq * 4.1 + phase) * amp * 0.12;
      ridge.push({ x, y });
    }
    ctx.fillStyle = `rgba(${cfg.c},${alpha})`;
    ctx.beginPath();
    ctx.moveTo(-12, H);
    for (const p of ridge) ctx.lineTo(p.x, p.y);
    ctx.lineTo(W + 12, H);
    ctx.closePath();
    ctx.fill();
    // heller, dunstiger Saum entlang des Bergrückens (gestreutes Licht)
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + (LAYERS - 1 - layer) * 0.04})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < ridge.length; i++) {
      const p = ridge[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}

export const bgLayersMethods = {
  generateBackgroundLayers,
  generateFarMountains,
  generateNearMountains,
  generateFarTrees,
  generateMidTrees,
  generateNearFoliage,
  drawJungleTree,
  drawFern,
  getSignatureLayer,
  drawSignatureLayer,
  drawFarRange,
};
