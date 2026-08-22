import type { Renderer } from '../renderer.ts';
import { pseudoRandom } from '../util/random';
import { TILE_SIZE, TileType } from '../constants';
import { getGlowDisc } from '../gfx/glow.ts';

// BG-Aufwertung · Wolkenschatten: langsam über die Szene ziehende, sehr weiche
// Verdunklungen („eine Wolke zieht vor die Sonne"). Nutzt gebackene Discs
// (safari-sicher, kein Per-Frame-Blur), sehr niedrige Deckkraft → schont die
// Lesbarkeit. Nur für helle Außenwelten. Auf 'low' übersprungen.
function drawCloudShadows(this: Renderer, cameraX: number, canvasW: number, canvasH: number) {
  if (this.quality === 'low') return;
  const disc = getGlowDisc(128, 24, 30, 42, 0.5);
  if (!disc) return;
  const t = this.time;
  const ctx = this.ctx;
  const n = 3;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const seed = i * 129.7;
    const span = canvasW * 2.6;
    let bx = (i / n) * span + t * 0.04 + Math.sin(t * 0.0015 + seed) * 55 - (cameraX * 0.05) % span;
    bx = ((bx % span) + span) % span - canvasW * 0.4;
    const by = canvasH * (0.38 + 0.16 * Math.sin(seed));
    const sc = 6.5 + (i % 2) * 2.0;
    // sanftes „Atmen" der Deckkraft — Mittelwert (v393): sichtbar, aber nicht präsent
    ctx.globalAlpha = 0.066 + 0.026 * (0.5 + 0.5 * Math.sin(t * 0.002 + seed));
    ctx.drawImage(disc, bx - disc.width * sc / 2, by - disc.height * sc / 2, disc.width * sc, disc.height * sc);
  }
  ctx.restore();
}

function drawSkyAmbient(this: Renderer, cameraX: number, _cameraY: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  const pseudoRand = pseudoRandom;

  ctx.save();

  // Warmer Sonnenglanz: weiche Sonne mit pulsierender Corona am oberen Himmel.
  // Additiv (screen), geringe Parallaxe (weit entfernt) — markanter Fokuspunkt.
  {
    const sunX = canvasW * 0.78 - cameraX * 0.02;
    const sunY = canvasH * 0.2;
    const pulse = 0.9 + Math.sin(t * 0.015) * 0.1;
    ctx.globalCompositeOperation = 'screen';
    const corona = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 165 * pulse);
    corona.addColorStop(0, `rgba(255,244,200,${(0.5 * pulse).toFixed(3)})`);
    corona.addColorStop(0.25, `rgba(255,226,150,${(0.22 * pulse).toFixed(3)})`);
    corona.addColorStop(0.6, `rgba(255,210,130,${(0.08 * pulse).toFixed(3)})`);
    corona.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = corona;
    ctx.fillRect(sunX - 175, sunY - 175, 350, 350);
    const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 30);
    disc.addColorStop(0, 'rgba(255,255,245,0.95)');
    disc.addColorStop(0.7, `rgba(255,248,220,${(0.7 * pulse).toFixed(3)})`);
    disc.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = disc;
    ctx.fillRect(sunX - 32, sunY - 32, 64, 64);
    ctx.globalCompositeOperation = 'source-over';
  }

  for (let i = 0; i < 8; i++) {
    const seed = i * 3137;
    const baseX = pseudoRand(seed) * canvasW * 2;
    const baseY = canvasH * 0.1 + pseudoRand(seed + 1) * canvasH * 0.7;
    const speed = 0.2 + pseudoRand(seed + 2) * 0.4;
    const phase = pseudoRand(seed + 3) * Math.PI * 2;
    const driftX = Math.sin(t * 0.01 * speed + phase) * 20;
    const driftY = Math.cos(t * 0.008 * speed + phase) * 10;
    const fx = ((baseX + driftX - cameraX * 0.04) % (canvasW + 40)) - 20;
    const fy = baseY + driftY;
    const brightness = (Math.sin(t * 0.025 * speed + phase) + 1) * 0.5;
    const alpha = 0.2 + brightness * 0.5;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(255, 255, 220, 1)`;
    ctx.beginPath();
    ctx.arc(fx, fy, 1 + brightness * 0.5, 0, Math.PI * 2);
    ctx.fill();

    const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, 6 + brightness * 4);
    glow.addColorStop(0, `rgba(255, 255, 200, ${alpha * 0.2})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(fx - 12, fy - 12, 24, 24);
  }

  ctx.globalAlpha = 0.04;
  const windPhase = t * 0.005;
  ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 6; i++) {
    const wy = canvasH * 0.2 + i * canvasH * 0.12;
    const wx = ((pseudoRand(i * 997) * canvasW * 2 - cameraX * 0.1 + Math.sin(windPhase + i) * 30) % (canvasW + 100)) - 50;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 30, wy - 3, wx + 60, wy + 1);
    ctx.quadraticCurveTo(wx + 90, wy + 4, wx + 120, wy - 1);
    ctx.stroke();
  }

  ctx.restore();
}

function drawVolcanoAmbient(this: Renderer, cameraX: number, _cameraY: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  ctx.save();
  // Glut-Schein von unten: warmes, leicht pulsierendes Aufglühen über der Lava
  // (additiv/screen), das die untere Bildhälfte erwärmt — die markante Hitze.
  const gp = 0.88 + Math.sin(t * 0.05) * 0.12;
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createLinearGradient(0, canvasH, 0, canvasH * 0.44);
  glow.addColorStop(0, `rgba(255,92,30,${0.34 * gp})`);
  glow.addColorStop(0.45, `rgba(255,122,46,${0.15 * gp})`);
  glow.addColorStop(1, 'rgba(255,140,50,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, canvasH * 0.44, canvasW, canvasH * 0.56);
  ctx.globalCompositeOperation = 'source-over';
  // Heat haze shimmer near ground.
  ctx.globalAlpha = 0.08;
  for (let hx = 0; hx < canvasW; hx += 4) {
    const shimmer = Math.sin(hx * 0.05 + t * 0.06) * 3;
    ctx.fillStyle = 'rgba(255, 140, 60, 1)';
    ctx.fillRect(hx, canvasH * 0.78 + shimmer, 4, 2);
  }
  ctx.globalAlpha = 1;

  // Hot reddish vignette pulsing slightly.
  const pulse = 0.85 + Math.sin(t * 0.04) * 0.15;
  const grad = ctx.createRadialGradient(canvasW / 2, canvasH * 0.6, canvasW * 0.2, canvasW / 2, canvasH * 0.6, canvasW * 0.8);
  grad.addColorStop(0, 'rgba(255,80,0,0)');
  grad.addColorStop(1, `rgba(120,0,0,${0.32 * pulse})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Rising sparks/embers — drift up with slight wobble.
  for (let i = 0; i < 35; i++) {
    const seed = i * 137;
    const baseX = (seed * 17) % canvasW;
    const phase = i * 0.7;
    const lifetime = 220 + (i % 5) * 40;
    const localT = (t * (1 + (i % 4) * 0.3) + i * 90) % lifetime;
    const sy = canvasH - localT * (canvasH / lifetime);
    const wobble = Math.sin(localT * 0.05 + phase) * 12;
    const sx = ((baseX + wobble - cameraX * 0.08) % canvasW + canvasW) % canvasW;
    const fade = 1 - localT / lifetime;
    const heat = 140 + (i % 5) * 25;
    const size = 1 + (i % 3);
    ctx.fillStyle = `rgba(255, ${heat}, 30, ${0.25 * fade})`;
    ctx.fillRect(sx - size, sy - size, size * 3, size * 3);
    ctx.fillStyle = `rgba(255, ${heat + 60}, 80, ${0.85 * fade})`;
    ctx.fillRect(sx, sy, size, size);
  }

  // Falling ash specks.
  for (let i = 0; i < 18; i++) {
    const ax = ((i * 211 - cameraX * 0.04 + t * 0.2) % canvasW + canvasW) % canvasW;
    const ay = ((i * 73 + t * (0.6 + (i % 3) * 0.2)) % (canvasH + 40)) - 20;
    ctx.fillStyle = `rgba(60, 50, 50, ${0.3 + (i % 3) * 0.15})`;
    ctx.fillRect(ax, ay, 1, 1);
  }
  // Ambient #1: pulsierende Lava-Blasen am Boden.
  for (let i = 0; i < 6; i++) {
    const seed = i * 311;
    const bx = ((seed - cameraX * 0.3) % canvasW + canvasW) % canvasW;
    const phase = i * 1.3;
    const cycle = (t * 0.04 + phase) % (Math.PI * 2);
    const grow = Math.sin(cycle) * 0.5 + 0.5;
    const by = canvasH * 0.86 - grow * 6;
    const r = 3 + grow * 4;
    ctx.fillStyle = `rgba(255, ${120 + grow * 100}, 40, ${0.6 * grow})`;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawIceAmbient(this: Renderer, cameraX: number, _cameraY: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  const pseudoRand = pseudoRandom;
  ctx.save();

  // Cool blue tint.
  ctx.fillStyle = 'rgba(170, 210, 255, 0.07)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Snowflakes — multiple sizes with drift.
  for (let i = 0; i < 80; i++) {
    const seed = i * 311;
    const speed = 0.4 + pseudoRand(seed) * 0.6;
    const drift = Math.sin(t * 0.02 + i) * 14;
    const baseX = pseudoRand(seed + 1) * canvasW * 1.5;
    const px = ((baseX + drift - cameraX * 0.04) % (canvasW + 40) + canvasW + 40) % (canvasW + 40) - 20;
    const py = ((i * 53 + t * speed) % (canvasH + 40)) - 20;
    const size = 1 + (i % 4);
    const alpha = 0.45 + (i % 4) * 0.12;
    if (size >= 3) {
      ctx.fillStyle = `rgba(220, 235, 255, ${alpha * 0.25})`;
      ctx.fillRect(px - 1, py - 1, size + 2, size + 2);
    }
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(px, py, size, size);
  }

  // Wind streaks.
  for (let i = 0; i < 6; i++) {
    const sy = (i * 71 + t * 1.2) % canvasH;
    const sx = ((i * 213 + t * 4) % (canvasW + 80)) - 80;
    ctx.strokeStyle = `rgba(220, 235, 255, ${0.18 + (i % 3) * 0.08})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 30, sy + 1);
    ctx.stroke();
  }

  // Frosty edge vignette.
  const grad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasW * 0.4, canvasW / 2, canvasH / 2, canvasW * 0.85);
  grad.addColorStop(0, 'rgba(180, 220, 255, 0)');
  grad.addColorStop(1, 'rgba(180, 220, 255, 0.18)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);
  // Ambient #1: hängende Eiszapfen-Glitzer von der Decke.
  for (let i = 0; i < 8; i++) {
    const seed = i * 167;
    const ix = ((seed - cameraX * 0.5) % canvasW + canvasW) % canvasW;
    const len = 6 + (i % 4) * 4;
    ctx.fillStyle = 'rgba(200, 230, 255, 0.7)';
    ctx.beginPath();
    ctx.moveTo(ix - 3, 0);
    ctx.lineTo(ix + 3, 0);
    ctx.lineTo(ix, len);
    ctx.fill();
    const sparkle = (Math.sin(t * 0.1 + i * 0.7) + 1) * 0.5;
    if (sparkle > 0.7) {
      ctx.fillStyle = `rgba(255,255,255,${sparkle})`;
      ctx.fillRect(ix - 1, len - 2, 2, 2);
    }
  }

  // Eis-Glitzern: vereinzelte Glanzpunkte blitzen sternförmig auf, wie
  // reflektierende Eiskristalle am Boden. Additiv (screen), quality-gated.
  if (this.quality !== 'low') {
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 30; i++) {
      const seed = i * 421.3;
      const gx = ((pseudoRand(seed) * canvasW * 1.3 - cameraX * 0.08) % (canvasW + 20) + canvasW + 20) % (canvasW + 20) - 10;
      const gy = canvasH * (0.46 + pseudoRand(seed + 1) * 0.48);
      const cycle = (t * 0.03 + pseudoRand(seed + 2) * 10) % 6;
      const spark = cycle < 1 ? Math.sin(cycle * Math.PI) : 0;
      if (spark > 0.05) {
        const s = 1 + spark * 2.4;
        ctx.fillStyle = `rgba(255,255,255,${(spark * 0.9).toFixed(3)})`;
        ctx.fillRect(gx - s, gy - 0.5, s * 2, 1);
        ctx.fillRect(gx - 0.5, gy - s, 1, s * 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.restore();
}

function drawCastleAmbient(this: Renderer, cameraX: number, _cameraY: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  ctx.save();
  // Strong dark vignette for spooky feel.
  const grad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasW * 0.18, canvasW / 2, canvasH / 2, canvasW * 0.8);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Flickering torches mounted on walls — render bracket + flame + glow.
  for (let i = 0; i < 5; i++) {
    const tx = (((i * 200 - cameraX * 0.4) % (canvasW + 100)) + canvasW + 100) % (canvasW + 100) - 50;
    const ty = canvasH * 0.5 + (i % 2) * 30;
    const flick = 0.7 + Math.sin(t * 0.25 + i * 1.7) * 0.15 + Math.sin(t * 0.6 + i * 0.4) * 0.1;

    const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 82);
    tg.addColorStop(0, `rgba(255,175,85,${0.6 * flick})`);
    tg.addColorStop(0.5, `rgba(255,125,45,${0.24 * flick})`);
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(tx - 82, ty - 82, 164, 164);

    ctx.fillStyle = '#2a1a08';
    ctx.fillRect(tx - 1, ty + 4, 2, 10);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(tx - 4, ty + 12, 8, 3);

    ctx.fillStyle = `rgba(255, 200, 80, ${0.95 * flick})`;
    ctx.beginPath();
    ctx.moveTo(tx, ty - 12 - flick * 4);
    ctx.quadraticCurveTo(tx + 5, ty - 4, tx + 3, ty + 3);
    ctx.quadraticCurveTo(tx, ty + 5, tx - 3, ty + 3);
    ctx.quadraticCurveTo(tx - 5, ty - 4, tx, ty - 12 - flick * 4);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 240, 180, ${0.9 * flick})`;
    ctx.beginPath();
    ctx.moveTo(tx, ty - 7);
    ctx.quadraticCurveTo(tx + 2, ty - 2, tx + 1, ty + 1);
    ctx.quadraticCurveTo(tx, ty + 2, tx - 1, ty + 1);
    ctx.quadraticCurveTo(tx - 2, ty - 2, tx, ty - 7);
    ctx.fill();

    // Aufsteigende Glutfunken: kleine Partikel treiben von der Flamme hoch
    // und verglühen — macht die Fackeln lebendig. Additiv (screen).
    if (this.quality !== 'low') {
      ctx.globalCompositeOperation = 'screen';
      for (let s = 0; s < 4; s++) {
        const sp = ((t * 0.04 + s * 1.7 + i * 0.9) % 1 + 1) % 1;
        const sxx = tx + Math.sin(t * 0.1 + s * 2.3 + i) * 5;
        const syy = ty - 12 - sp * 28;
        const sa = (1 - sp) * flick * 0.7;
        ctx.fillStyle = `rgba(255,${150 + s * 22},60,${sa.toFixed(3)})`;
        ctx.fillRect(sxx, syy, 1.5, 1.5);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // Floating cobweb dust motes.
  for (let i = 0; i < 22; i++) {
    const dx = ((i * 137 + t * 0.3) % (canvasW + 30)) - 15;
    const dy = (i * 73 + Math.sin(t * 0.03 + i) * 6) % canvasH;
    ctx.fillStyle = `rgba(220, 200, 240, ${0.18 + (i % 3) * 0.08})`;
    ctx.fillRect(dx, dy, 1, 1);
  }
  // Ambient #1: tropfender Wasser-Tropfen von der Decke.
  for (let i = 0; i < 4; i++) {
    const seed = i * 263;
    const dx = ((seed - cameraX * 0.4) % canvasW + canvasW) % canvasW;
    const period = 180 + i * 30;
    const local = (t + i * 60) % period;
    const dy = (local / period) * canvasH * 0.7;
    ctx.fillStyle = 'rgba(150, 180, 220, 0.7)';
    ctx.fillRect(dx, dy, 2, 4);
    if (local < 8) {
      ctx.fillStyle = 'rgba(180, 210, 240, 0.5)';
      ctx.beginPath();
      ctx.arc(dx + 1, canvasH * 0.7, 4, 0, Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawUnderwaterAmbient(this: Renderer, cameraX: number, _cameraY: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  ctx.save();
  // Blue/teal tint overlay.
  ctx.fillStyle = 'rgba(40, 110, 170, 0.16)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Pressure vignette darker around edges.
  const grad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasW * 0.35, canvasW / 2, canvasH / 2, canvasW * 0.85);
  grad.addColorStop(0, 'rgba(0,20,40,0)');
  grad.addColorStop(1, 'rgba(0,10,30,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Wandernde Kaustik über die Szene: gebrochenes Oberflächenlicht als driftendes
  // Lichtnetz aus Wellen-Interferenz. Additiv (screen), nach unten ausfadend
  // (Tiefe), quality-gated für flüssige Performance.
  if (this.quality !== 'low') {
    // Weiche, organische Lichtflecken statt harter Raster-Quadrate (v459): das
    // gebrochene Oberflächenlicht wird als überlappende, jitternde Weichzeichen-
    // Scheiben gestempelt (screen), sodass kein Schachbrett-Artefakt mehr entsteht.
    ctx.globalCompositeOperation = 'screen';
    const disc = getGlowDisc(48, 200, 236, 255, 0.5);
    const cell = 34;
    const maxY = canvasH * 0.9;
    const drift = cameraX * 0.04;
    for (let cx = 0; cx < canvasW + cell; cx += cell) {
      const wx = cx + drift;
      for (let cy = 0; cy < maxY; cy += cell) {
        const w1 = Math.sin(wx * 0.028 + cy * 0.018 + t * 0.04);
        const w2 = Math.cos(wx * 0.017 - cy * 0.026 + t * 0.028);
        const inten = w1 * w2;
        if (inten > 0.42) {
          const depthFade = 1 - (cy / canvasH) * 0.55;
          const a = ((inten - 0.42) / 0.58) * 0.22 * depthFade;
          const jx = Math.sin(cy * 0.5 + cx * 0.3) * 9;
          const jy = Math.cos(cx * 0.4 + cy * 0.2) * 9;
          if (disc && a > 0) {
            ctx.globalAlpha = Math.min(0.5, a);
            ctx.drawImage(disc, cx + jx - 24, cy + jy - 24, 48, 48);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Bubbles rising — varied sizes, sway, with highlight.
  for (let i = 0; i < 40; i++) {
    const phase = i * 1.7;
    const speed = 0.4 + (i % 5) * 0.18;
    const lifetime = canvasH + 60;
    const localY = (t * speed + i * 70) % lifetime;
    const by = canvasH - localY + Math.sin(t * 0.05 + phase) * 6;
    const baseX = (i * 113) % canvasW;
    const sway = Math.sin(t * 0.04 + phase) * 14;
    const bx = ((baseX + sway - cameraX * 0.05) % (canvasW + 30) + canvasW + 30) % (canvasW + 30) - 10;
    const size = 2 + (i % 4);
    const fade = 1 - localY / lifetime;
    ctx.strokeStyle = `rgba(220, 240, 255, ${(0.45 + (i % 3) * 0.18) * fade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx, by, size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * fade})`;
    ctx.fillRect(bx - size * 0.4, by - size * 0.5, 1, 1);
  }
  ctx.restore();
}

function drawSpaceAmbient(this: Renderer, cameraX: number, _cameraY: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  ctx.save();

  // Subtle cool wash.
  ctx.fillStyle = 'rgba(5, 0, 30, 0.18)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Nebula: weiche, farbige Gaswolken, die langsam treiben und leuchten —
  // gibt der Leere Tiefe und Farbe. Additiv (screen), hinter Sternen/Planet.
  {
    ctx.globalCompositeOperation = 'screen';
    const nebColors: [number, number, number][] = [[120, 60, 185], [60, 95, 205], [185, 60, 150]];
    for (let i = 0; i < 4; i++) {
      const seed = i * 311.7;
      const nx = ((pseudoRandom(seed) * canvasW * 1.5 - cameraX * 0.04 + t * 0.01) % (canvasW + 320) + canvasW + 320) % (canvasW + 320) - 160;
      const ny = canvasH * (0.12 + pseudoRandom(seed + 1) * 0.62);
      const rad = 95 + pseudoRandom(seed + 2) * 130;
      const col = nebColors[i % nebColors.length];
      const pulse = 0.6 + Math.sin(t * 0.01 + i * 1.3) * 0.22;
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
      g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${(0.11 * pulse).toFixed(3)})`);
      g.addColorStop(0.6, `rgba(${col[0]},${col[1]},${col[2]},${(0.04 * pulse).toFixed(3)})`);
      g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(nx - rad, ny - rad, rad * 2, rad * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Ambient #1: ferner Planet treibt langsam vorbei.
  {
    const planetX = ((t * 0.05 - cameraX * 0.03) % (canvasW + 200) + canvasW + 200) % (canvasW + 200) - 100;
    const planetY = canvasH * 0.18;
    const grad = ctx.createRadialGradient(planetX - 8, planetY - 8, 2, planetX, planetY, 30);
    grad.addColorStop(0, '#c8a060');
    grad.addColorStop(0.7, '#704020');
    grad.addColorStop(1, '#2a1010');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(planetX, planetY, 24, 0, Math.PI * 2);
    ctx.fill();
    // Ring um den Planeten.
    ctx.strokeStyle = 'rgba(220, 180, 120, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(planetX, planetY, 36, 8, -0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Twinkling foreground star layer (parallax 0.22).
  for (let i = 0; i < 50; i++) {
    const baseX = (i * 73) % canvasW;
    const sx = ((baseX - cameraX * 0.22) % canvasW + canvasW) % canvasW;
    const sy = (i * 41) % canvasH;
    const tw = 0.5 + Math.sin(t * 0.05 + i * 0.8) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.5})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Occasional shooting star streaking across.
  const streakPeriod = 240;
  const streakT = t % streakPeriod;
  if (streakT < 60) {
    const progress = streakT / 60;
    const startX = -40;
    const startY = canvasH * 0.15 + ((Math.floor(t / streakPeriod) * 71) % 100);
    const endX = canvasW + 40;
    const endY = startY + canvasH * 0.3;
    const tipX = startX + (endX - startX) * progress;
    const tipY = startY + (endY - startY) * progress;
    const tailX = startX + (endX - startX) * Math.max(0, progress - 0.2);
    const tailY = startY + (endY - startY) * Math.max(0, progress - 0.2);
    const grad = ctx.createLinearGradient(tailX, tailY, tipX, tipY);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(255, 240, 200, 0.95)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 250, 220, 0.9)';
    ctx.fillRect(tipX - 1, tipY - 1, 3, 3);
  }

  // Floating space dust particles.
  for (let i = 0; i < 24; i++) {
    const dx = ((i * 211 - cameraX * 0.12 + t * 0.3) % canvasW + canvasW) % canvasW;
    const dy = ((i * 73 + Math.sin(t * 0.04 + i) * 12) % canvasH + canvasH) % canvasH;
    ctx.fillStyle = `rgba(180, 200, 240, ${0.2 + (i % 3) * 0.08})`;
    ctx.fillRect(dx, dy, 1, 1);
  }
  ctx.restore();
}

function drawCaveAmbient(this: Renderer, cameraX: number, _cameraY: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  const pseudoRand = pseudoRandom;

  ctx.save();
  const vignette = ctx.createRadialGradient(
    canvasW / 2, canvasH / 2, canvasW * 0.25,
    canvasW / 2, canvasH / 2, canvasW * 0.7
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvasW, canvasH);

  for (let i = 0; i < 5; i++) {
    const seed = i * 4519;
    const baseX = pseudoRand(seed) * canvasW * 2;
    const baseY = canvasH * 0.2 + pseudoRand(seed + 1) * canvasH * 0.4;
    const speed = 0.15 + pseudoRand(seed + 2) * 0.3;
    const phase = pseudoRand(seed + 3) * Math.PI * 2;
    const driftX = Math.sin(t * 0.015 * speed + phase) * 15;
    const fx = ((baseX + driftX - cameraX * 0.06) % (canvasW + 40)) - 20;
    const brightness = (Math.sin(t * 0.03 * speed + phase) + 1) * 0.5;
    const alpha = 0.1 + brightness * 0.4;
    const hue = pseudoRand(seed + 4) > 0.5 ? 270 : 190;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsla(${hue}, 70%, 60%, 1)`;
    ctx.beginPath();
    ctx.arc(fx, baseY, 1.5 + brightness, 0, Math.PI * 2);
    ctx.fill();

    const glow = ctx.createRadialGradient(fx, baseY, 0, fx, baseY, 8 + brightness * 5);
    glow.addColorStop(0, `hsla(${hue}, 70%, 60%, ${alpha * 0.3})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(fx - 15, baseY - 15, 30, 30);
  }

  // Tanzender Staub: feine helle Partikel, die langsam schweben und im
  // einfallenden Licht aufblitzen — macht die Lichtschächte volumetrisch.
  if (this.quality !== 'low') {
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 36; i++) {
      const seed = i * 197.3;
      const bx = pseudoRand(seed) * canvasW * 1.4;
      const drift = Math.sin(t * 0.008 + seed) * 18;
      const fx = ((bx + drift - cameraX * 0.1) % (canvasW + 30) + canvasW + 30) % (canvasW + 30) - 15;
      const by = canvasH * 0.1 + pseudoRand(seed + 1) * canvasH * 0.75 + Math.sin(t * 0.01 + seed * 1.3) * 12;
      const flick = 0.35 + 0.65 * (Math.sin(t * 0.02 + seed * 4) * 0.5 + 0.5);
      const r = 0.6 + pseudoRand(seed + 2) * 1.2;
      ctx.fillStyle = `rgba(210,224,255,${(0.5 * flick).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(fx, by, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.globalAlpha = 0.03;
  ctx.fillStyle = 'rgba(100, 80, 120, 1)';
  ctx.fillRect(0, canvasH * 0.8, canvasW, canvasH * 0.2);

  ctx.restore();
}

function drawParticle(this: Renderer, x: number, y: number, size: number, color: string, alpha: number) {
  const ctx = this.ctx;
  const cx = x + size / 2, cy = y + size / 2;
  ctx.save();
  // Perf: `shadowBlur` war der teuerste Teil (erzwingt einen Blur-Pass PRO
  // Partikel, bricht das Batching) — bei Bursts summieren sich hunderte davon.
  // Ersatz: ein weicher Halo aus zwei blassen, größeren Scheiben derselben Farbe
  // hinter dem Kern → glühender Eindruck zum Nulltarif, gleiches Batching.
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * 0.18;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.30;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.72, 0, Math.PI * 2);
  ctx.fill();
  // Kern
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();
  // Glanzpunkt
  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + size * 0.35, y + size * 0.35, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFloatingText(this: Renderer, x: number, y: number, text: string, alpha: number, scale = 1) {
  const ctx = this.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  const size = Math.round(15 * scale);
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(text, x + 1.5, y + 1.5);

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText(text, x + 1, y + 1);

  ctx.shadowColor = 'rgba(255, 255, 200, 0.5)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y);

  ctx.restore();
}

function drawAmbientEffects(this: Renderer, cameraX: number, cameraY: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  const pseudoRand = pseudoRandom;

  ctx.save();
  for (let i = 0; i < 10; i++) {
    const seed = i * 7919;
    const baseX = pseudoRand(seed) * canvasW * 1.5;
    const baseY = pseudoRand(seed + 1) * canvasH * 0.7 + canvasH * 0.1;
    const speed = 0.3 + pseudoRand(seed + 2) * 0.5;
    const phase = pseudoRand(seed + 3) * Math.PI * 2;
    const driftX = Math.sin(t * 0.02 * speed + phase) * 20;
    const driftY = Math.cos(t * 0.015 * speed + phase * 1.3) * 12;
    const fx = ((baseX + driftX - cameraX * 0.1) % (canvasW + 40)) - 20;
    const fy = baseY + driftY;

    const brightness = (Math.sin(t * 0.04 * speed + phase) + 1) * 0.5;
    const alpha = 0.15 + brightness * 0.65;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#c8ff82';
    ctx.beginPath();
    ctx.arc(fx, fy, 2 + brightness, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAtmosphericFog(this: Renderer, _cameraX: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  ctx.save();
  // Soft horizon fog band — same as before so jungle still reads "humid".
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = 'rgba(160, 200, 180, 1)';
  ctx.fillRect(0, canvasH * 0.75, canvasW, canvasH * 0.25);
  // Subtle global vignette: darkens screen corners ~12% so the focal area
  // reads as 3D no matter which world is loaded. Cached gradient is cheap.
  ctx.globalAlpha = 1;
  if (!this.vignetteCache || this.vignetteW !== canvasW || this.vignetteH !== canvasH) {
    const c = document.createElement('canvas');
    c.width = canvasW;
    c.height = canvasH;
    const vctx = c.getContext('2d')!;
    const g = vctx.createRadialGradient(
      canvasW / 2, canvasH * 0.55, Math.min(canvasW, canvasH) * 0.35,
      canvasW / 2, canvasH * 0.55, Math.max(canvasW, canvasH) * 0.75,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    vctx.fillStyle = g;
    vctx.fillRect(0, 0, canvasW, canvasH);
    this.vignetteCache = c;
    this.vignetteW = canvasW;
    this.vignetteH = canvasH;
  }
  ctx.drawImage(this.vignetteCache, 0, 0);
  ctx.restore();
}

function drawLightRays(this: Renderer, cameraX: number, canvasW: number, canvasH: number) {
  if (this.quality === 'low') return;   // Perf-Paket 3: God-Rays auf 'low' aus.
  const ctx = this.ctx;
  const t = this.time;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const rayBottom = canvasH * 0.78;

  for (let i = 0; i < 5; i++) {
    const pseudoRand = pseudoRandom;
    const seed = i * 4231;
    const baseX = pseudoRand(seed) * canvasW * 1.5;
    const x = ((baseX - cameraX * 0.15) % (canvasW + 160)) - 80;
    const sway = Math.sin(t * 0.01 + i * 2.1) * 16;
    const slant = 26; // rays slant down-left from the upper-right sun
    const topX = x + sway;
    const botX = x + sway * 0.5 - slant;
    const rayW = 26 + pseudoRand(seed + 1) * 44;

    const grad = ctx.createLinearGradient(0, 0, 0, rayBottom);
    grad.addColorStop(0, 'rgba(255,244,196,0.15)');
    grad.addColorStop(0.5, 'rgba(255,240,186,0.07)');
    grad.addColorStop(1, 'rgba(255,236,180,0)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(topX - rayW * 0.3, 0);
    ctx.lineTo(topX + rayW * 0.3, 0);
    ctx.lineTo(botX + rayW, rayBottom);
    ctx.lineTo(botX - rayW, rayBottom);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawThemedRays(this: Renderer, cameraX: number, W: number, H: number) {
  if (this.quality === 'low') return;   // Perf-Paket 3: God-Rays auf 'low' aus.
  // God Rays je Welt: warme Sonnenstrahlen in offenen Welten, kühle
  // Lichtschächte in Höhle/Schloss, hellblaue Kaustik unter Wasser. Vulkan
  // (zu rauchig) und Weltraum (kein Medium) erhalten bewusst keine Strahlen.
  const theme = this.currentTheme;
  const CFG: Record<string, { col: string; peak: number; count: number; slant: number }> = {
    sky: { col: '255,248,210', peak: 0.13, count: 5, slant: 24 },
    beach: { col: '255,244,200', peak: 0.14, count: 5, slant: 26 },
    australia: { col: '255,236,180', peak: 0.12, count: 4, slant: 30 },
    cave: { col: '198,216,255', peak: 0.16, count: 5, slant: 16 },
    dragon: { col: '150,255,180', peak: 0.16, count: 5, slant: 16 },
    ice: { col: '212,236,255', peak: 0.12, count: 4, slant: 18 },
    castle: { col: '216,206,255', peak: 0.10, count: 3, slant: 12 },
    underwater: { col: '150,230,235', peak: 0.14, count: 6, slant: 8 },
  };
  const cfg = CFG[theme];
  if (!cfg) return;
  const ctx = this.ctx;
  const t = this.time;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const rayBottom = H * 0.82;
  for (let i = 0; i < cfg.count; i++) {
    const seed = i * 4231;
    const baseX = pseudoRandom(seed) * W * 1.5;
    const x = ((baseX - cameraX * 0.15) % (W + 160)) - 80;
    const sway = Math.sin(t * 0.01 + i * 2.1) * 14;
    const topX = x + sway;
    const botX = x + sway * 0.5 - cfg.slant;
    const rayW = 24 + pseudoRandom(seed + 1) * 42;
    const grad = ctx.createLinearGradient(0, 0, 0, rayBottom);
    grad.addColorStop(0, `rgba(${cfg.col},${cfg.peak})`);
    grad.addColorStop(0.5, `rgba(${cfg.col},${cfg.peak * 0.45})`);
    grad.addColorStop(1, `rgba(${cfg.col},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(topX - rayW * 0.3, 0);
    ctx.lineTo(topX + rayW * 0.3, 0);
    ctx.lineTo(botX + rayW, rayBottom);
    ctx.lineTo(botX - rayW, rayBottom);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawJungleFireflies(this: Renderer, cameraX: number, canvasW: number, canvasH: number) {
  // Ambient #1 für Jungle: leuchtende Glühwürmchen schweben in der Luft.
  const ctx = this.ctx;
  const t = this.time;
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const seed = i * 197;
    const baseX = (seed * 11) % canvasW;
    const drift = Math.sin(t * 0.02 + i * 1.3) * 25;
    const fx = ((baseX + drift - cameraX * 0.15) % (canvasW + 40) + canvasW + 40) % (canvasW + 40) - 20;
    const fy = canvasH * 0.35 + Math.cos(t * 0.015 + i * 0.7) * canvasH * 0.25;
    const blink = (Math.sin(t * 0.12 + i * 1.7) + 1) * 0.5;
    const a = 0.3 + blink * 0.7;
    const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, 8);
    glow.addColorStop(0, `rgba(220, 255, 100, ${a * 0.7})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(fx - 8, fy - 8, 16, 16);
    ctx.fillStyle = `rgba(255, 255, 180, ${a})`;
    ctx.fillRect(fx, fy, 1.5, 1.5);
  }
  ctx.restore();
}

function drawFallingLeaves(this: Renderer, cameraX: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  const pseudoRand = pseudoRandom;
  const colors = ['#2d8a35', '#4a9a3a', '#8B7355', '#C4A35A'];

  ctx.save();
  for (let i = 0; i < 6; i++) {
    const seed = i * 6133;
    const speed = 0.3 + pseudoRand(seed) * 0.7;
    const fallSpeed = 0.5 + pseudoRand(seed + 1) * 0.5;
    const size = 3 + pseudoRand(seed + 2) * 4;
    const phase = pseudoRand(seed + 3) * Math.PI * 2;

    const baseX = pseudoRand(seed + 4) * canvasW * 1.5;
    const x = ((baseX + Math.sin(t * 0.02 * speed + phase) * 40 - cameraX * 0.08) % (canvasW + 60)) - 30;
    const y = ((t * fallSpeed + pseudoRand(seed + 5) * canvasH * 2) % (canvasH + 40)) - 20;
    const rot = t * 0.03 * speed + phase;

    ctx.globalAlpha = 0.5 + pseudoRand(seed + 7) * 0.3;
    ctx.fillStyle = colors[Math.floor(pseudoRand(seed + 6) * 4)];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBeachAmbient(this: Renderer, cameraX: number, _cameraY: number, canvasW: number, canvasH: number) {
  // Ambient-Erweiterung: schimmernde Muschel-Sterne entlang der Sandlinie.
  {
    const ctx0 = this.ctx;
    const t0 = this.time;
    ctx0.save();
    for (let i = 0; i < 10; i++) {
      const seed = i * 211;
      const sx = ((seed - cameraX * 0.6) % canvasW + canvasW) % canvasW;
      const sy = canvasH * 0.82 + (i % 3) * 4;
      const tw = (Math.sin(t0 * 0.15 + i * 1.1) + 1) * 0.5;
      if (tw > 0.6) {
        ctx0.fillStyle = `rgba(255, 240, 200, ${tw})`;
        ctx0.fillRect(sx, sy, 2, 2);
        ctx0.fillStyle = `rgba(255, 255, 255, ${tw * 0.6})`;
        ctx0.fillRect(sx - 1, sy + 0.5, 1, 1);
        ctx0.fillRect(sx + 2, sy + 0.5, 1, 1);
      }
    }
    ctx0.restore();
  }
  const ctx = this.ctx;
  const t = this.time;
  const pseudoRand = pseudoRandom;

  ctx.save();

  for (let i = 0; i < 4; i++) {
    const seed = i * 5231;
    const baseX = pseudoRand(seed) * canvasW * 2;
    const baseY = canvasH * 0.05 + pseudoRand(seed + 1) * canvasH * 0.25;
    const speed = 0.3 + pseudoRand(seed + 2) * 0.3;
    const phase = pseudoRand(seed + 3) * Math.PI * 2;
    const driftX = Math.sin(t * 0.008 * speed + phase) * 30;
    const driftY = Math.cos(t * 0.006 * speed + phase) * 8;
    const fx = ((baseX + driftX - cameraX * 0.03) % (canvasW + 60)) - 30;
    const fy = baseY + driftY;

    ctx.strokeStyle = 'rgba(60, 60, 60, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx - 4, fy + 2);
    ctx.lineTo(fx, fy - 2);
    ctx.lineTo(fx + 4, fy + 2);
    ctx.stroke();
  }

  for (let i = 0; i < 10; i++) {
    const seed = i * 7331;
    const sx = pseudoRand(seed) * canvasW;
    const sy = canvasH * 0.7 + pseudoRand(seed + 1) * canvasH * 0.25;
    const sparkle = (Math.sin(t * 0.05 + i * 2.3) + 1) * 0.5;
    if (sparkle > 0.7) {
      ctx.globalAlpha = (sparkle - 0.7) * 3;
      ctx.fillStyle = 'rgba(255, 255, 240, 1)';
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 6; i++) {
    const seed = i * 8431;
    const px = pseudoRand(seed) * canvasW;
    const py = canvasH * 0.6 + pseudoRand(seed + 1) * canvasH * 0.1;
    const drift = Math.sin(t * 0.02 + i) * 5;
    ctx.fillStyle = 'rgba(200, 230, 255, 1)';
    ctx.beginPath();
    ctx.arc(px + drift, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawAustraliaAmbient(this: Renderer, cameraX: number, _cameraY: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  const pseudoRand = pseudoRandom;

  ctx.save();

  for (let i = 0; i < 12; i++) {
    const seed = i * 6137;
    const baseX = pseudoRand(seed) * canvasW;
    const baseY = pseudoRand(seed + 1) * canvasH * 0.8;
    const speed = 0.1 + pseudoRand(seed + 2) * 0.2;
    const phase = pseudoRand(seed + 3) * Math.PI * 2;
    const driftX = Math.sin(t * 0.01 * speed + phase) * 15;
    const driftY = Math.cos(t * 0.008 * speed + phase) * 10 - t * 0.02 * speed;
    const fx = ((baseX + driftX) % canvasW);
    const fy = ((baseY + driftY) % canvasH + canvasH) % canvasH;
    const alpha = 0.08 + pseudoRand(seed + 4) * 0.12;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(180, 140, 80, 1)';
    ctx.beginPath();
    ctx.arc(fx, fy, 1 + pseudoRand(seed + 5) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.03;
  for (let hx = 0; hx < canvasW; hx += 4) {
    const shimmer = Math.sin(hx * 0.05 + t * 0.03) * 3;
    ctx.fillStyle = 'rgba(255, 200, 100, 1)';
    ctx.fillRect(hx, canvasH * 0.85 + shimmer, 4, 2);
  }

  for (let i = 0; i < 2; i++) {
    const seed = i * 9241;
    const cycleLen = 800;
    const tumbX = ((t * (0.8 + pseudoRand(seed) * 0.4) + pseudoRand(seed + 1) * cycleLen) % cycleLen) / cycleLen * (canvasW + 40) - 20;
    const tumbY = canvasH * 0.7 + pseudoRand(seed + 2) * canvasH * 0.15;
    const bounce = Math.abs(Math.sin(tumbX * 0.05)) * 8;
    const rot = tumbX * 0.05;

    ctx.globalAlpha = 0.1;
    ctx.save();
    ctx.translate(tumbX, tumbY - bounce);
    ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(140, 100, 50, 1)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3, -1);
    ctx.lineTo(3, 1);
    ctx.moveTo(-2, 2);
    ctx.lineTo(2, -2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawShockwave(this: Renderer, x: number, y: number, age: number, maxAge: number, radius: number) {
  const ctx = this.ctx;
  const t = Math.min(1, age / maxAge);
  const r = radius * (0.2 + t * 1.0);
  const alpha = (1 - t) * 0.85;
  ctx.save();
  // Outer ring (bright)
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ffe48a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Inner ring (orange)
  ctx.globalAlpha = alpha * 0.7;
  ctx.strokeStyle = '#ff8a3a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.7, r * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Center flash (only first half)
  if (t < 0.5) {
    ctx.globalAlpha = (1 - t * 2) * 0.6;
    ctx.fillStyle = '#fff8d0';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.4, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Feinschliff: Coin-Pop — ein kleiner, symmetrischer goldener Ring, der beim
// Einsammeln kurz aufploppt (skaliert nach außen + blendet schnell aus), plus
// ein winziger Kern-Blitz am Anfang. Additiv ('lighter'), damit er auf jedem
// Untergrund glänzt. Bewusst klein/kurz, ergänzt die vorhandenen Funken.
function drawCoinPop(this: Renderer, x: number, y: number, age: number, maxAge: number, combo = 0) {
  const ctx = this.ctx;
  const t = Math.min(1, age / maxAge);
  const ease = 1 - (1 - t) * (1 - t);       // ease-out: schnell auf, dann sanft
  // Combo-Eskalation (0..1): der Pop-Ring wächst, leuchtet heller und verschiebt
  // sich von Gold nach Weiß-heiß — dezentes visuelles Pendant zur steigenden
  // Tonhöhe der Münzreihe. combo 0 ⇒ exakt wie zuvor (kein Regressions-Risiko).
  const cf = Math.min(1, combo / 8);
  const r = (4 + ease * 15) * (1 + cf * 0.55);
  const alpha = (1 - t) * (1 - t) * (0.9 + cf * 0.25);
  const g = Math.round(232 + 23 * cf);
  const bl = Math.round(154 + 81 * cf);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(255,${g},${bl})`;
  ctx.lineWidth = (2.2 + cf * 1.4) * (1 - t) + 0.6;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = '#fffbe0';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.stroke();
  // Zweiter, weiterer Ring nur bei hoher Serie (dezent) — „Streak"-Gefühl.
  if (cf > 0.45) {
    ctx.globalAlpha = alpha * 0.35 * cf;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.stroke();
  }
  if (t < 0.35) {
    ctx.globalAlpha = (1 - t / 0.35) * (0.7 + cf * 0.3);
    ctx.fillStyle = '#fffdf2';
    ctx.beginPath(); ctx.arc(x, y, (3.5 + cf * 2) * (1 - t / 0.35) + 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Flügelschlag-Puff beim Doppelsprung (Paket 2): ein Paar weiß-goldene
// Flügel-Bögen, die seitlich nach oben ausschlagen und ausblenden, plus ein
// weicher Auftriebs-Ring — signalisiert die Flügel-Fähigkeit im Moment des
// zweiten Sprungs.
function drawWingFlutter(this: Renderer, x: number, y: number, age: number, maxAge: number, dir: number) {
  const ctx = this.ctx;
  const t = Math.min(1, age / maxAge);
  const alpha = (1 - t);
  // Größer + klarer als zuvor, damit die zwei Flügel trotz Bloom als Flügel
  // lesbar bleiben: gedämpfte Füllung (kein reines Blendweiß) + klare Kontur +
  // sichtbare Feder-Trennungen.
  const spread = 12 + t * 26;     // Flügel schlagen weiter auf
  const rise = t * 12;            // leichter Auftrieb
  ctx.save();
  ctx.translate(x, y - rise);
  // Weicher Auftriebs-Ring (dezent, blooms kaum).
  ctx.globalAlpha = alpha * 0.4;
  ctx.strokeStyle = '#f6d98a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 5, spread * 0.85, spread * 0.34, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Zwei klar geformte Flügel (links/rechts) mit drei Federspitzen.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    // Füllung: warmes Creme→Gold (nicht reinweiß) → hält die Form gegen Bloom.
    const g = ctx.createLinearGradient(0, 0, spread, -spread * 0.7);
    g.addColorStop(0, 'rgba(255,250,232,0.92)');
    g.addColorStop(0.6, 'rgba(255,231,170,0.8)');
    g.addColorStop(1, 'rgba(240,196,110,0.35)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    // Gefiederte Flügel-Silhouette: Wurzel → drei Federspitzen → zurück.
    ctx.beginPath();
    ctx.moveTo(1, 3);
    ctx.quadraticCurveTo(spread * 0.35, -spread * 0.30, spread * 0.52, -spread * 0.72);   // Spitze 1 (oben)
    ctx.quadraticCurveTo(spread * 0.52, -spread * 0.34, spread * 0.72, -spread * 0.46);   // Kerbe
    ctx.quadraticCurveTo(spread * 0.80, -spread * 0.12, spread * 0.98, -spread * 0.18);   // Spitze 2 (mitte)
    ctx.quadraticCurveTo(spread * 0.78, spread * 0.06, spread * 0.88, spread * 0.22);     // Kerbe
    ctx.quadraticCurveTo(spread * 0.55, spread * 0.20, spread * 0.42, spread * 0.40);     // Spitze 3 (unten)
    ctx.quadraticCurveTo(spread * 0.22, spread * 0.30, 1, 4);
    ctx.closePath();
    ctx.fill();
    // Klare Kontur, damit die Form auch im Glühen erkennbar bleibt.
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = 'rgba(214,158,70,0.9)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Zwei Feder-Trennlinien.
    ctx.globalAlpha = alpha * 0.6;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(3, 3); ctx.quadraticCurveTo(spread * 0.42, -spread * 0.20, spread * 0.52, -spread * 0.60);
    ctx.moveTo(3, 4); ctx.quadraticCurveTo(spread * 0.55, -spread * 0.02, spread * 0.9, -spread * 0.14);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  void dir;
}

function drawStarAura(this: Renderer, x: number, y: number, w: number, h: number, frame: number, alpha: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Rainbow rotating ring
  for (let i = 0; i < 6; i++) {
    const hue = ((frame * 8) + i * 60) % 360;
    ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.55)`;
    ctx.lineWidth = 2;
    const r = Math.max(w, h) * (0.55 + 0.04 * Math.sin(frame * 0.15 + i));
    const startA = (frame * 0.04 + i * Math.PI / 3) % (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, startA + Math.PI / 2.5);
    ctx.stroke();
  }
  // Sparkles
  for (let i = 0; i < 5; i++) {
    const a = (frame * 0.08 + i * Math.PI * 0.4) % (Math.PI * 2);
    const r = Math.max(w, h) * 0.6;
    const sx = cx + Math.cos(a) * r;
    const sy = cy + Math.sin(a) * r * 0.85;
    ctx.fillStyle = `hsla(${(frame * 12 + i * 70) % 360}, 100%, 75%, 0.9)`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.6 + Math.sin(frame * 0.3 + i) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Embedding / depth helpers ────────────────────────────────────────────
// Per-world colour grade applied as a final overlay so every layer sits under
// one light. Kept subtle on purpose.
const SCENE_TINTS: Record<string, { c: string; a: number }> = {
  jungle:     { c: '#3fa54a', a: 0.17 },
  cave:       { c: '#2a3550', a: 0.26 },
  sky:        { c: '#9fd8ff', a: 0.17 },
  beach:      { c: '#ffcb72', a: 0.21 },
  australia:  { c: '#ff9a3c', a: 0.22 },
  volcano:    { c: '#ff5a2a', a: 0.22 },
  ice:        { c: '#bfe8ff', a: 0.21 },
  castle:     { c: '#5a4a78', a: 0.24 },
  underwater: { c: '#2aa0c8', a: 0.26 },
  space:      { c: '#6a5ad0', a: 0.24 },
  school:     { c: '#ffce86', a: 0.18 },
  trampoline: { c: '#8a5ad8', a: 0.16 },
  gym:        { c: '#ffb24a', a: 0.17 },
  plush:      { c: '#ffb3d9', a: 0.14 },
  bluefield:  { c: '#7fc8ff', a: 0.15 },
  dragon:     { c: '#3fc86a', a: 0.22 },
  forest:     { c: '#9aa878', a: 0.05 },
  vacation:   { c: '#ffc866', a: 0.14 },  // #3 wärmer: Foto + Spielfläche unter einem goldenen Sommerlicht
};

// Element-Tint (Grafik-Audit P1): geteilte Elemente (Ziegel, bewegliche
// Plattform, Kiste, Feuer-Ranke) sind fest braun/rot/grün und knallen in kühlen/
// dunklen Welten als Fremdkörper heraus. Ein 'color'-Blend legt den Welt-Farbton
// darüber und BEHÄLT die Luminanz (Textur/Schattierung bleibt) → aus braunem
// Ziegel wird ein eis-blauer/höhlen-violetter Ziegel, nicht ein flacher Klotz.
// Warme/bereits stimmige Welten (jungle/beach/australia/volcano/school) = kein Tint.
const ELEMENT_TINT: Record<string, { c: string; a: number }> = {
  sky:        { c: '#8fbcec', a: 0.82 },
  cave:       { c: '#5566a0', a: 0.72 },
  dragon:     { c: '#4c9e5e', a: 0.68 },
  ice:        { c: '#a9d6f2', a: 0.78 },
  castle:     { c: '#7a6bb0', a: 0.66 },
  underwater: { c: '#4aa6c8', a: 0.55 },
  space:      { c: '#5a6ad0', a: 0.70 },
  trampoline: { c: '#a05ad8', a: 0.60 },
  bluefield:  { c: '#3f6fe0', a: 0.78 },
};

// Aufhell-Pass (Grafik-Audit P5): Der 'color'-Blend verschiebt nur Farbton +
// Sättigung, die (mittelgraue) Luminanz der Stein-Ziegel bleibt — in der
// Wolken-Welt lasen sie dadurch als graue Steinquader statt als helle Wolken-
// blöcke. Ein dezenter 'lighten'-Wash hebt sie Richtung Wolkenweiß, ohne die
// Struktur/Schattierung zu verlieren.
const ELEMENT_LIFT: Record<string, { c: string; a: number }> = {
  sky: { c: '#eef5ff', a: 0.34 },
};

/**
 * Legt den Welt-Farbton auf ein geteiltes Element (Bounds x,y,w,h). 'color'-Blend
 * überträgt Farbton+Sättigung des Tints, lässt die Helligkeit des Elements intakt
 * → Ziegel/Plattform/Kiste behalten ihre Struktur, nehmen aber die Welt-Farbe an.
 * Optionaler 'lighten'-Pass (ELEMENT_LIFT) hellt zusätzlich auf (z.B. sky).
 * No-op in Welten ohne Tint/Lift. Bounds sollten das Element eng umschließen.
 */
function tintThemeRect(this: Renderer, x: number, y: number, w: number, h: number) {
  const t = ELEMENT_TINT[this.currentTheme];
  const lift = ELEMENT_LIFT[this.currentTheme];
  if (!t && !lift) return;
  const ctx = this.ctx;
  ctx.save();
  if (t) {
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = t.a;
    ctx.fillStyle = t.c;
    ctx.fillRect(x, y, w, h);
  }
  if (lift) {
    ctx.globalCompositeOperation = 'lighten';
    ctx.globalAlpha = lift.a;
    ctx.fillStyle = lift.c;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

// Soft elliptical contact shadow under a character so it reads as standing in
// the world instead of being pasted on top of it.
function drawGroundShadow(this: Renderer, cx: number, feetY: number, width: number, strength = 1) {
  const ctx = this.ctx;
  const rx = Math.max(8, width * 0.62);
  const ry = Math.max(3, width * 0.16);
  ctx.save();
  ctx.translate(cx, feetY - 1);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(0,0,0,${0.32 * strength})`);
  g.addColorStop(0.6, `rgba(0,0,0,${0.16 * strength})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Soft shadow cast below a platform/overhang edge onto whatever is behind it.
// Only drawn where a solid tile has empty space beneath (the tile loop checks).
function drawTileUndershadow(this: Renderer, screenX: number, screenY: number, tile: number) {
  void tile;
  const ctx = this.ctx;
  const S = 32;
  const g = ctx.createLinearGradient(0, screenY + S, 0, screenY + S + 14);
  g.addColorStop(0, 'rgba(0,0,0,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(screenX - 1, screenY + S, S + 2, 14);
}

// Erd-/Stein-Kacheln, die eine plastische Kanten-Schattierung erhalten (Boden,
// Stein, Moos, Schloss-, Space-, Eis-Tiles). Blöcke/Röhren/Wasser bleiben außen vor.
const EDGE_TERRAIN = new Set<number>([
  TileType.GROUND, TileType.GROUND_TOP, TileType.GROUND_LEFT, TileType.GROUND_RIGHT,
  TileType.GROUND_TOP_LEFT, TileType.GROUND_TOP_RIGHT, TileType.STONE, TileType.MOSS_GROUND,
  TileType.CASTLE_STONE, TileType.CASTLE_TOP, TileType.SPACE_METAL, TileType.SPACE_TOP,
  TileType.ICE, TileType.ICE_TOP,
]);

/**
 * Kanten-bewusste Plastik-Schattierung für freiliegende Erd-/Stein-Kanten.
 * Aus den Nachbarn (im Tile-Pass) wird bestimmt, welche Seite frei liegt:
 *  - Seitenwände (l/r): dunkler Verlauf nach innen + klare Kantenlinie + feine
 *    senkrechte Riefen → die Wand liest sich als senkrechte Fläche, nicht als
 *    „von-oben"-Textur.
 *  - Unterseite (b): kräftiger dunkler Verlauf + harte Schattenlinie → der Klotz
 *    „schwebt" nicht mehr, sondern hat eine definierte, im Schatten liegende Unterkante.
 * Wirkt automatisch in ALLEN Welten (rein renderer-seitig, keine Level-Daten nötig).
 */
// Gras-Überhang je Gras-Welt (Grafik-Audit: erhöhte Blöcke wirkten als harte
// Erd-Türme mit flachem Gras oben). Ein weicher Grasrand, der über die
// freiliegenden Oberkanten hängt, lässt sie als organische Erd-Reiter lesen —
// so wie die geschwungenen Hügel, statt als rechteckige Klötze.
const GRASS_OVERHANG: Record<string, { mid: string; hi: string }> = {
  jungle:    { mid: '#4a9e3a', hi: '#6cc850' },
  beach:     { mid: '#d4b06e', hi: '#ecd7a2' },
  australia: { mid: '#7a9a34', hi: '#aac850' },
  bluefield: { mid: '#2d52c4', hi: '#4a7be0' },
};

// Perf: die fuenf fixen Kanten-Verlaeufe EINMAL im lokalen (0,0)-Raum backen und
// pro Tile nur per translate positionieren — statt je Rand-Tile bis zu fuenf
// createLinearGradient-Allokationen (GC-Druck skaliert sonst mit Bildinhalt).
let EDGE_G: { L: CanvasGradient; hlL: CanvasGradient; R: CanvasGradient; hlR: CanvasGradient; B: CanvasGradient } | null = null;
function edgeGrads(ctx: CanvasRenderingContext2D) {
  if (EDGE_G) return EDGE_G;
  const S = 32;
  const mk = (x0: number, y0: number, x1: number, y1: number, a0: string, a1: string) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, a0); g.addColorStop(1, a1); return g;
  };
  EDGE_G = {
    L: mk(0, 0, 13, 0, 'rgba(0,0,0,0.36)', 'rgba(0,0,0,0)'),
    hlL: mk(0, 0, 0, 7, 'rgba(255,246,214,0.34)', 'rgba(255,246,214,0)'),
    R: mk(S, 0, S - 13, 0, 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0)'),
    hlR: mk(0, 0, 0, 7, 'rgba(255,246,214,0.26)', 'rgba(255,246,214,0)'),
    B: mk(0, S, 0, S - 17, 'rgba(0,0,0,0.52)', 'rgba(0,0,0,0)'),
  };
  return EDGE_G;
}

function drawTileEdgeShading(
  this: Renderer, screenX: number, screenY: number, tile: number,
  exL: boolean, exR: boolean, exB: boolean, grassOverhang = false,
) {
  if (!EDGE_TERRAIN.has(tile)) return;
  const ctx = this.ctx;
  const S = 32;
  const G = edgeGrads(ctx);
  ctx.save();
  ctx.translate(screenX, screenY);
  if (exL) {
    ctx.fillStyle = G.L;
    ctx.fillRect(0, 0, 13, S);
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(0, 0, 1.5, S);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(3.5, 3, 1, S - 6);
    ctx.fillRect(7, 6, 1, S - 10);
    ctx.fillStyle = G.hlL;
    ctx.fillRect(1.5, 0, 2.5, 7);
  }
  if (exR) {
    ctx.fillStyle = G.R;
    ctx.fillRect(S - 13, 0, 13, S);
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.fillRect(S - 1.5, 0, 1.5, S);
    ctx.fillStyle = 'rgba(0,0,0,0.09)';
    ctx.fillRect(S - 4.5, 4, 1, S - 7);
    ctx.fillRect(S - 8, 7, 1, S - 11);
    ctx.fillStyle = G.hlR;
    ctx.fillRect(S - 4, 0, 2.5, 7);
  }
  if (exB) {
    ctx.fillStyle = G.B;
    ctx.fillRect(0, S - 17, S, 17);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, S - 2, S, 2);
  }
  const go = grassOverhang ? GRASS_OVERHANG[this.currentTheme] : undefined;
  if (go) {
    const droop = (dir: number) => {
      const ex = dir > 0 ? 0 : S;
      const s = dir;
      ctx.fillStyle = go.mid;
      ctx.beginPath();
      ctx.moveTo(ex, -1);
      ctx.lineTo(ex + s * 11, -1);
      ctx.lineTo(ex + s * 10, 4);
      ctx.quadraticCurveTo(ex + s * 6, 9, ex + s * 3, 5.5);
      ctx.quadraticCurveTo(ex + s * 1.5, 3, ex, 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = go.hi;
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(ex + s * 3.5, 2); ctx.lineTo(ex + s * 2.5, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex + s * 7, 0.5); ctx.lineTo(ex + s * 6.5, 5); ctx.stroke();
    };
    if (exL) droop(1);
    if (exR) droop(-1);
  }
  ctx.restore();
}

// Fill-Kacheln, deren Erd-Verlauf pro Kachel von HELL (oben) nach DUNKEL (unten)
// zurückspringt. Gestapelt entsteht dadurch an JEDER Kachelgrenze eine harte
// Hell/Dunkel-Naht (die vom Nutzer bemängelten „Streifen"). Nur die Nicht-Top-
// Varianten betroffen (Top-Kachel = Oberfläche, keine Stapelung darüber).
const SEAM_FILL = new Set<number>([
  TileType.GROUND, TileType.GROUND_LEFT, TileType.GROUND_RIGHT,
  TileType.STONE, TileType.MOSS_GROUND, TileType.CASTLE_STONE,
  TileType.SPACE_METAL, TileType.ICE,
]);

/**
 * Naht-Kaschierung für gestapelte Füll-Kacheln: Liegt eine feste Kachel DIREKT
 * über dieser (also eine Innen-/Stapelkachel), wird der zu helle „Neustart" am
 * oberen Kachelrand abgedunkelt, sodass er nahtlos an die dunkle Unterkante der
 * Kachel darüber anschließt. Wirkt theme-neutral (reines Abdunkeln) und damit
 * automatisch in ALLEN Welten — keine Änderung an den einzelnen Tile-Zeichnern.
 */
function drawTileSeamConceal(
  this: Renderer, screenX: number, screenY: number, tile: number,
) {
  if (!SEAM_FILL.has(tile)) return;
  const ctx = this.ctx;
  const S = 32;
  const g = ctx.createLinearGradient(0, screenY - 1, 0, screenY + 11);
  g.addColorStop(0, 'rgba(0,0,0,0.40)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(screenX, screenY - 1, S, 12);
  ctx.restore();
}

// Final colour grade: per-world tint + vignette + gentle tilt-shift bands.
// Ties the parallax, tiles and sprites together under one atmosphere.
function drawSceneGrade(this: Renderer, theme: string, W: number, H: number) {
  const ctx = this.ctx;
  // Live per-world tint (overlay blend depends on the scene → not cacheable).
  const tint = SCENE_TINTS[theme];
  if (tint) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = tint.a;
    ctx.fillStyle = tint.c;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // Punkt 2: dezenter Highlight-Lift („Bloom-Fake") — hebt die oberen Bild-
  // highlights minimal an (screen-Blend), nur auf höchster Stufe. Echtes
  // selektives Vollbild-Bloom ist bewusst dem WebGL-Post-Pass (Gate G2)
  // vorbehalten — in reinem Canvas-2D wäre es zu teuer.
  // Grafik-Feinschliff (#10): der Highlight-Lift lief nur auf 'high' — dadurch
  // wirkten iPad/Handys auf 'mid' flacher. Jetzt auch auf 'mid' (schwächer),
  // damit der „belichtete", cinematische Eindruck auf der Mehrheit der Geräte da
  // ist. Ein 'screen'-Gradient + fillRect (wie bisher) → vernachlässigbar.
  if (this.quality !== 'low') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = this.quality === 'high' ? 0.06 : 0.038;
    const hg = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    hg.addColorStop(0, 'rgba(255,250,230,1)');
    hg.addColorStop(1, 'rgba(255,250,230,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H * 0.5);
    ctx.restore();
  }
  // Vignette + tilt-shift bands are static → bake once per viewport size AND
  // theme and blit each frame (no per-frame gradient allocations). Die
  // Vignette wird theme-getönt (warm/kühl) statt neutral-schwarz, was der
  // Szene eine geschlossene Stimmung gibt (Goldstunde am Strand, Tiefe unter
  // Wasser). Die Tilt-Shift-Bänder bleiben neutral (reine Tiefenschärfe-Optik).
  const VIG: Record<string, string> = {
    jungle: '10,26,8', cave: '4,4,12', sky: '36,66,104', beach: '70,40,8',
    australia: '54,28,6', volcano: '34,6,2', ice: '28,52,88', castle: '14,6,24',
    underwater: '2,22,42', space: '8,4,22',
    school: '52,36,14',
    trampoline: '16,8,30',
    gym: '48,30,10',
    plush: '40,20,40',
    bluefield: '20,44,70',
    dragon: '6,20,10',
    forest: '10,14,24',
    city: '12,16,42',
    vacation: '60,44,14',
  };
  const vigC = VIG[theme] || '0,0,0';
  const overlay = this.getBgGradCache(`grade-${theme}-${W}x${H}`, (c, w, h) => {
    const vg = c.createRadialGradient(w / 2, h * 0.48, h * 0.34, w / 2, h * 0.5, w * 0.62);
    vg.addColorStop(0, `rgba(${vigC},0)`);
    vg.addColorStop(0.72, `rgba(${vigC},0)`);
    vg.addColorStop(1, `rgba(${vigC},0.26)`);
    c.fillStyle = vg; c.fillRect(0, 0, w, h);
    const tb = c.createLinearGradient(0, 0, 0, h * 0.15);
    tb.addColorStop(0, 'rgba(0,0,0,0.16)'); tb.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = tb; c.fillRect(0, 0, w, h * 0.15);
    const bb = c.createLinearGradient(0, h * 0.84, 0, h);
    bb.addColorStop(0, 'rgba(0,0,0,0)'); bb.addColorStop(1, 'rgba(0,0,0,0.20)');
    c.fillStyle = bb; c.fillRect(0, h * 0.84, w, h * 0.16);
  });
  ctx.drawImage(overlay, 0, 0);
}

// Jungle depth extras: a distance-haze band behind the canopy (atmospheric
// perspective) and a few blurred foreground fronds at the top corners that
// scroll faster than the world (occlusion → "looking through" depth).
function drawJungleHaze(this: Renderer, _cameraX: number, W: number, H: number) {
  const ctx = this.ctx;
  // Distance haze where the far layers meet the play area (atmospheric depth).
  const bandY = H * 0.46;
  const g = ctx.createLinearGradient(0, bandY - H * 0.16, 0, bandY + H * 0.16);
  g.addColorStop(0, 'rgba(212,233,215,0)');
  g.addColorStop(0.5, 'rgba(216,235,218,0.26)');
  g.addColorStop(1, 'rgba(216,235,218,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, bandY - H * 0.16, W, H * 0.32);
  // Warm canopy light pooling from the top — sun filtering through leaves.
  const top = ctx.createLinearGradient(0, 0, 0, H * 0.42);
  top.addColorStop(0, 'rgba(255,242,186,0.18)');
  top.addColorStop(1, 'rgba(255,242,186,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H * 0.42);
}

function drawJungleForeground(this: Renderer, cameraX: number, W: number, H: number) {
  const ctx = this.ctx;
  const drift = (cameraX * 0.35) % 240;
  ctx.save();
  // Out-of-focus canopy fringe hanging from the top edge — frames the view
  // and adds "looking through leaves" depth without covering the play area.
  const blobs = 6;
  for (let i = 0; i < blobs; i++) {
    const px = (i / (blobs - 1)) * (W + 260) - 130 - drift * 0.12;
    const r = H * (0.26 + ((i * 37) % 14) / 44);
    const cyTop = -r * 0.5 + Math.sin(i * 1.7) * 12;
    const shade = i % 2 === 0 ? '20,60,28' : '15,48,23';
    const g = ctx.createRadialGradient(px, cyTop, 0, px, cyTop, r);
    g.addColorStop(0, `rgba(${shade},0.42)`);
    g.addColorStop(0.6, `rgba(${shade},0.22)`);
    g.addColorStop(1, `rgba(${shade},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(px - r, cyTop - r, r * 2, r * 2);
  }
  // Denser corner anchors.
  const corners: [number, number, number][] = [
    [-30, -20, H * 0.58],
    [W + 30, -15, H * 0.5],
  ];
  for (const [cxC, cyC, r] of corners) {
    const g = ctx.createRadialGradient(cxC, cyC, 0, cxC, cyC, r);
    g.addColorStop(0, 'rgba(14,46,22,0.52)');
    g.addColorStop(0.55, 'rgba(18,54,26,0.26)');
    g.addColorStop(1, 'rgba(18,54,26,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cxC - r, cyC - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawBeachForeground(this: Renderer, cameraX: number, W: number, H: number) {
  const ctx = this.ctx;
  const drift = (cameraX * 0.35) % 320;
  ctx.save();
  // Unscharfe Palmwedel, die aus den oberen Ecken herabhängen — rahmen die
  // Szene und geben "durch Palmen blicken"-Tiefe, ohne das Spielfeld zu decken.
  const fronds: [number, number, number][] = [
    [-24, -12, 0.55],
    [44, -34, 0.95],
    [W * 0.52 - drift * 0.1, -46, 1.35],
    [W - 44, -34, Math.PI - 0.95],
    [W + 24, -12, Math.PI - 0.55],
  ];
  ctx.lineCap = 'round';
  for (let f = 0; f < fronds.length; f++) {
    const [ax, ay, baseAng] = fronds[f];
    // Frischeres, tropisches Grün (weniger dunkel-teal) und deutlich dezenter
    // (v459): die Wedel rahmten vorher schwer & fremdfarben ins Bild.
    const shade = f % 2 === 0 ? '46,116,58' : '34,92,46';
    const leaves = 5;
    const len = H * (0.36 + (f % 3) * 0.05);
    for (let l = 0; l < leaves; l++) {
      const ang = baseAng + (l - (leaves - 1) / 2) * 0.3;
      const ex = ax + Math.cos(ang) * len;
      const ey = ay + Math.sin(ang) * len;
      const mx = ax + Math.cos(ang) * len * 0.5 + Math.cos(ang + 1.5) * 16;
      const my = ay + Math.sin(ang) * len * 0.5 + Math.sin(ang + 1.5) * 16;
      ctx.strokeStyle = `rgba(${shade},0.17)`;
      ctx.lineWidth = H * 0.038;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
    }
  }
  // Dezente Ecken-Anker rahmen das Bild (leichter als zuvor).
  const corners: [number, number, number][] = [
    [-20, -10, H * 0.5],
    [W + 20, -10, H * 0.46],
  ];
  for (const [cxC, cyC, r] of corners) {
    const g = ctx.createRadialGradient(cxC, cyC, 0, cxC, cyC, r);
    g.addColorStop(0, 'rgba(30,84,42,0.22)');
    g.addColorStop(0.55, 'rgba(34,90,46,0.10)');
    g.addColorStop(1, 'rgba(34,90,46,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cxC - r, cyC - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawThemedForeground(this: Renderer, cameraX: number, W: number, H: number) {
  const ctx = this.ctx;
  const theme = this.currentTheme;
  const t = this.time;
  const drift = (cameraX * 0.3) % 360;
  ctx.save();

  if (theme === 'cave' || theme === 'ice' || theme === 'castle') {
    // Hängende Zacken: Stalaktiten / Eiszapfen / Gewölbe-Zähne vom oberen Rand.
    const col = theme === 'ice' ? '188,226,248' : theme === 'castle' ? '34,24,46' : '42,32,26';
    const alpha = theme === 'ice' ? 0.34 : 0.5;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const px = (i / (count - 1)) * (W + 220) - 110 - drift * 0.1;
      const w = 28 + ((i * 53) % 28);
      const h = H * (0.14 + ((i * 29) % 20) / 58);
      ctx.fillStyle = `rgba(${col},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(px - w / 2, -2);
      ctx.lineTo(px + w / 2, -2);
      ctx.lineTo(px, h);
      ctx.closePath();
      ctx.fill();
      if (theme === 'ice') {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(px - 1, 0, 1.5, h * 0.6);
      }
    }
  } else if (theme === 'sky' || theme === 'volcano' || theme === 'space') {
    // Weiche Schwaden: Wolken / Rauch / Nebel vom oberen Rand.
    const col = theme === 'sky' ? '255,255,255' : theme === 'volcano' ? '64,46,42' : '58,40,88';
    const peak = theme === 'sky' ? 0.5 : 0.42;
    const blobs = 6;
    for (let i = 0; i < blobs; i++) {
      const px = (i / (blobs - 1)) * (W + 260) - 130 - drift * 0.12;
      const r = H * (0.22 + ((i * 37) % 14) / 44);
      const cy = -r * 0.4 + Math.sin(i * 1.7 + t * 0.005) * 10;
      const g = ctx.createRadialGradient(px, cy, 0, px, cy, r);
      g.addColorStop(0, `rgba(${col},${peak})`);
      g.addColorStop(0.6, `rgba(${col},0.18)`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(px - r, cy - r, r * 2, r * 2);
    }
  } else if (theme === 'australia') {
    // Olivgrüne Eukalyptus-Zweige, die von oben hereinhängen.
    ctx.lineCap = 'round';
    const anchors: [number, number, number][] = [
      [-20, -10, 0.6], [W * 0.5 - drift * 0.08, -34, 1.35], [W + 20, -10, Math.PI - 0.6],
    ];
    for (let a = 0; a < anchors.length; a++) {
      const [ax, ay, baseAng] = anchors[a];
      for (let l = 0; l < 5; l++) {
        const ang = baseAng + (l - 2) * 0.26;
        const len = H * 0.4;
        const ex = ax + Math.cos(ang) * len, ey = ay + Math.sin(ang) * len;
        // Dezenter (v459): vorher schwere olivgrüne Balken oben im Bild.
        ctx.strokeStyle = a % 2 === 0 ? 'rgba(104,116,66,0.18)' : 'rgba(88,100,56,0.15)';
        ctx.lineWidth = H * 0.034;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(ax + Math.cos(ang) * len * 0.5 + 12, ay + Math.sin(ang) * len * 0.5, ex, ey);
        ctx.stroke();
      }
    }
  } else if (theme === 'underwater') {
    // Dunkle Seetang-Silhouetten, die vom unteren Rand aufragen.
    ctx.strokeStyle = 'rgba(18,60,58,0.34)';
    ctx.lineCap = 'round';
    const blades = 9;
    for (let i = 0; i < blades; i++) {
      const px = (i / (blades - 1)) * (W + 160) - 80 - drift * 0.14;
      const h = H * (0.3 + ((i * 31) % 16) / 40);
      const sway = Math.sin(t * 0.012 + i) * 16;
      ctx.lineWidth = 7 + (i % 3) * 2;
      ctx.beginPath();
      ctx.moveTo(px, H + 4);
      ctx.quadraticCurveTo(px + sway, H - h * 0.5, px + sway * 1.4, H - h);
      ctx.stroke();
    }
  }

  // Theme-gefärbte Ecken-Vignette rahmt das Bild und lenkt den Blick.
  const vig: Record<string, string> = {
    cave: '8,6,14', ice: '120,160,200', castle: '20,12,30', sky: '120,160,210',
    volcano: '30,10,8', space: '10,8,24', australia: '60,44,20', underwater: '6,30,40',
    dragon: '8,22,12',
  };
  const vc = vig[theme] || '20,30,20';
  for (const [cxC, cyC, r] of [[-20, -10, H * 0.5], [W + 20, -10, H * 0.46], [-20, H + 10, H * 0.4], [W + 20, H + 10, H * 0.4]] as [number, number, number][]) {
    const g = ctx.createRadialGradient(cxC, cyC, 0, cxC, cyC, r);
    g.addColorStop(0, `rgba(${vc},0.32)`);
    g.addColorStop(0.55, `rgba(${vc},0.12)`);
    g.addColorStop(1, `rgba(${vc},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(cxC - r, cyC - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawLightPools(
  this: Renderer, cameraX: number, canvasW: number, canvasH: number,
  r: number, g: number, b: number, intensity = 1,
) {
  // AP 1.3 / Punkt 1: Weiche, farbige Lichtflecken auf dem Boden — gefiltertes
  // AP 1.3 / Punkt 1: Weiche, farbige Lichtflecken auf dem Boden — gefiltertes
  // Licht (Blätterdach, Höhlenöffnung, Lavaschein …). Additiv (screen), langsam
  // driftend, mit leichter Parallaxe. Farbe pro Welt.
  // Perf-Paket 3: nur auf 'high'. Diese 5 großflächigen Additiv-Füllungen sind
  // auf großen Bildschirmen (iPad läuft meist auf 'mid'/'low') Füllraten-teuer —
  // Wegfall bringt spürbar FPS, kostet nur einen dezenten Boden-Lichtschein.
  if (this.quality !== 'high') return;
  const ctx = this.ctx;
  const t = this.time;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const groundY = canvasH * 0.72;
  for (let i = 0; i < 5; i++) {
    const seed = i * 9173;
    const baseX = pseudoRandom(seed) * canvasW * 1.6;
    const drift = Math.sin(t * 0.008 + i * 1.9) * 22;
    const span = canvasW + 240;
    const x = ((baseX + drift - cameraX * 0.2) % span + span) % span - 120;
    const y = groundY + Math.sin(t * 0.01 + i * 2.3) * canvasH * 0.05
      + pseudoRandom(seed + 2) * canvasH * 0.10;
    const rw = 60 + pseudoRandom(seed + 1) * 90;
    const rh = rw * 0.32;
    const pulse = 0.5 + (Math.sin(t * 0.02 + i * 1.1) + 1) * 0.25;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rw);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.10 * pulse * intensity})`);
    grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${0.04 * pulse * intensity})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, rh / rw);
    ctx.beginPath();
    ctx.arc(0, 0, rw, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawLavaGlow(this: Renderer, screenX: number, screenY: number) {
  // Punkt 3: emissives, pulsierendes Glühen über der Lava-Oberkante. Additiv
  // (screen). Verbindet Optik mit Gefahren-Lesbarkeit. Nur ab 'mid'.
  const ctx = this.ctx;
  const t = this.time;
  const pulse = 0.6 + Math.sin(t * 0.06 + screenX * 0.1) * 0.4;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const grad = ctx.createLinearGradient(0, screenY - 14, 0, screenY + 8);
  grad.addColorStop(0, 'rgba(255,90,20,0)');
  grad.addColorStop(1, `rgba(255,140,40,${0.5 * pulse})`);
  ctx.fillStyle = grad;
  ctx.fillRect(screenX - 2, screenY - 14, TILE_SIZE + 4, 22);
  ctx.restore();
}

function drawSuperBlockHighlight(this: Renderer, screenX: number, screenY: number) {
  // Hebt Super-Blöcke (verleihen die Super-Kraft) deutlich von normalen
  // Frage-Blöcken ab: goldener Glow + pulsierender Rahmen + kreisende Funken.
  // Rein additiv (screen), überlagert das gecachte ?-Tile, ohne es zu ersetzen.
  const ctx = this.ctx;
  const t = this.time;
  const cx = screenX + TILE_SIZE / 2;
  const cy = screenY + TILE_SIZE / 2;
  const pulse = 0.5 + Math.sin(t * 0.1) * 0.5;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Goldener Glow-Halo
  const glow = ctx.createRadialGradient(cx, cy, TILE_SIZE * 0.15, cx, cy, TILE_SIZE * 0.95);
  glow.addColorStop(0, `rgba(255,225,110,${0.22 + 0.2 * pulse})`);
  glow.addColorStop(0.55, `rgba(255,180,50,${0.14 * pulse})`);
  glow.addColorStop(1, 'rgba(255,160,30,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(screenX - TILE_SIZE * 0.5, screenY - TILE_SIZE * 0.5, TILE_SIZE * 2, TILE_SIZE * 2);

  // Pulsierender Leuchtrahmen
  ctx.strokeStyle = `rgba(255,235,150,${0.3 + 0.4 * pulse})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(screenX + 1.5, screenY + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
  ctx.restore();

  // Kreisende Funken (Glitzer) — ab 'mid'.
  if (this.quality !== 'low') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const ang = t * 0.03 + (i / 4) * Math.PI * 2;
      const sx = cx + Math.cos(ang) * TILE_SIZE * 0.52;
      const sy = cy + Math.sin(ang) * TILE_SIZE * 0.52;
      const sp = 0.3 + Math.sin(t * 0.12 + i * 1.7) * 0.7;
      if (sp < 0.12) continue;
      const r = 3 * sp;
      ctx.strokeStyle = `rgba(255,245,200,${sp})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy);
      ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,245,${sp})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

let _lightCanvas: HTMLCanvasElement | null = null;
function drawDynamicLighting(
  this: Renderer,
  lights: Array<{ x: number; y: number; r: number }>,
  darkness: number,
  tint = '6,8,26',
) {
  // Phase 3: dynamisches 2D-Licht. Eine Dunkelheits-Ebene über die Szene, in
  // die an jeder Lichtquelle ein weicher Kreis „gestanzt" wird (destination-out)
  // — die Originalszene scheint dort durch. Kein Normal-Map-Asset nötig.
  // `tint` erlaubt eine wärmere/dunklere Färbung (z. B. Drachenhöhle).
  const W = this.viewportW, H = this.viewportH;
  if (!_lightCanvas) _lightCanvas = document.createElement('canvas');
  const lc = _lightCanvas;
  if (lc.width !== W || lc.height !== H) { lc.width = W; lc.height = H; }
  const lctx = lc.getContext('2d');
  if (!lctx) return;
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, W, H);
  lctx.fillStyle = `rgba(${tint},${darkness})`;
  lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const g = lctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0, 'rgba(0,0,0,0.95)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g;
    lctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  lctx.globalCompositeOperation = 'source-over';
  this.ctx.drawImage(lc, 0, 0);
}

function drawSchoolAmbient(this: Renderer, cameraX: number, _cameraY: number, canvasW: number, canvasH: number) {
  const ctx = this.ctx;
  const t = this.time;
  if (this.quality === 'low') return;
  ctx.save();
  // Warmer Schwebstaub im Tageslicht — feine Partikel treiben langsam und
  // blitzen sanft auf, wie Staub in einfallendem Fensterlicht. Additiv.
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 34; i++) {
    const seed = i * 167.7;
    const bx = pseudoRandom(seed) * canvasW * 1.4;
    const drift = Math.sin(t * 0.006 + seed) * 16;
    const fx = ((bx + drift - cameraX * 0.08) % (canvasW + 30) + canvasW + 30) % (canvasW + 30) - 15;
    const by = canvasH * 0.12 + pseudoRandom(seed + 1) * canvasH * 0.7 + Math.sin(t * 0.009 + seed * 1.2) * 10;
    const flick = 0.4 + 0.6 * (Math.sin(t * 0.018 + seed * 3.5) * 0.5 + 0.5);
    const r = 0.6 + pseudoRandom(seed + 2) * 1.1;
    ctx.fillStyle = `rgba(255,244,210,${(0.45 * flick).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(fx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawSchoolForeground(this: Renderer, cameraX: number, W: number, H: number) {
  if (this.quality === 'low') return;
  const ctx = this.ctx;
  ctx.save();
  const px = cameraX * 1.25; // schnelle nahe Parallaxe → starke Tiefe
  // Große dunkle Pflanzen am unteren Rand (alle 520px).
  const plSp = 520;
  for (let i = Math.floor(px / plSp) - 1; i <= Math.floor((px + W) / plSp) + 1; i++) {
    const plx = i * plSp - px;
    ctx.fillStyle = 'rgba(22,50,28,0.5)';
    for (const [dx, dy, rr] of [[12, -10, 28], [34, -30, 24], [52, -16, 21], [4, -20, 18], [44, -2, 20]] as [number, number, number][]) {
      ctx.beginPath(); ctx.ellipse(plx + dx, H + dy, rr, rr, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(48,32,18,0.55)';
    ctx.beginPath();
    ctx.moveTo(plx + 16, H - 26); ctx.lineTo(plx + 40, H - 26);
    ctx.lineTo(plx + 36, H); ctx.lineTo(plx + 20, H); ctx.closePath(); ctx.fill();
  }
  // Pfeiler (alle 720px, versetzt) — vertikale Tiefenanker. Dezent gehalten
  // (v455): vorher als deutlich sichtbare, halbtransparente Streifen über den
  // hellen Klassenräumen wahrgenommen; jetzt nur noch ein feiner Tiefen-Hauch.
  const pfSp = 720;
  for (let i = Math.floor(px / pfSp) - 1; i <= Math.floor((px + W) / pfSp) + 1; i++) {
    const pfx = i * pfSp + 360 - px;
    ctx.fillStyle = 'rgba(38,28,18,0.15)';
    ctx.fillRect(pfx, 0, 54, H);
    ctx.fillStyle = 'rgba(74,56,38,0.12)';
    ctx.fillRect(pfx, 0, 9, H);
    ctx.fillRect(pfx + 45, 0, 9, H);
  }
  ctx.restore();
}

/** Trampolinpark-Vordergrund: nahe Trampolin-Rahmen + Neon-Pfeiler (Parallaxe 1.25). */
function drawTrampolineForeground(this: Renderer, cameraX: number, W: number, H: number) {
  if (this.quality === 'low') return;
  const ctx = this.ctx;
  ctx.save();
  const px = cameraX * 1.25;
  const trSp = 540;
  for (let i = Math.floor(px / trSp) - 1; i <= Math.floor((px + W) / trSp) + 1; i++) {
    const tx = i * trSp - px;
    ctx.fillStyle = 'rgba(20,22,38,0.5)';
    ctx.beginPath(); ctx.ellipse(tx + 50, H - 6, 56, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(44,48,72,0.6)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(tx + 50, H - 12, 54, 12, 0, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(50,56,82,0.4)'; ctx.lineWidth = 1;
    for (let f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(tx + 50 + f * 30, H - 12); ctx.lineTo(tx + 50 + f * 36, H); ctx.stroke(); }
  }
  const pfSp = 760;
  for (let i = Math.floor(px / pfSp) - 1; i <= Math.floor((px + W) / pfSp) + 1; i++) {
    const pfx = i * pfSp + 380 - px;
    ctx.fillStyle = 'rgba(16,18,32,0.42)';
    ctx.fillRect(pfx, 0, 48, H);
    ctx.fillStyle = 'rgba(255,60,170,0.12)';
    ctx.fillRect(pfx, 0, 4, H);
    ctx.fillStyle = 'rgba(60,220,230,0.1)';
    ctx.fillRect(pfx + 44, 0, 4, H);
  }
  ctx.restore();
}

/** Trampolinpark-Ambient: wandernde Disco-Spotlights (Friday-Night-Stimmung). */
function drawTrampolineAmbient(this: Renderer, cameraX: number, cameraY: number, W: number, H: number) {
  if (this.quality === 'low') return;
  const ctx = this.ctx;
  const t = this.time;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const spots: [string, number][] = [['255,60,170', 0], ['60,220,230', 2.1], ['120,220,90', 4.2]];
  for (const [col, phase] of spots) {
    const topX = W * (0.5 + 0.32 * Math.sin(t * 0.01 + phase));
    const botX = W * (0.5 + 0.46 * Math.sin(t * 0.01 + phase + 0.8));
    const pulse = 0.09 + Math.abs(Math.sin(t * 0.02 + phase)) * 0.08;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgba(${col},${pulse})`);
    grad.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(topX - 14, 0); ctx.lineTo(topX + 14, 0);
    ctx.lineTo(botX + 70, H); ctx.lineTo(botX - 70, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export const effectsMethods = {
  tintThemeRect,
  drawSchoolForeground,
  drawTrampolineForeground,
  drawTrampolineAmbient,
  drawSchoolAmbient,
  drawSkyAmbient,
  drawVolcanoAmbient,
  drawIceAmbient,
  drawCastleAmbient,
  drawUnderwaterAmbient,
  drawSpaceAmbient,
  drawCaveAmbient,
  drawParticle,
  drawFloatingText,
  drawAmbientEffects,
  drawCloudShadows,
  drawAtmosphericFog,
  drawLightRays,
  drawThemedRays,
  drawFallingLeaves,
  drawBeachAmbient,
  drawJungleFireflies,
  drawAustraliaAmbient,
  drawShockwave,
  drawCoinPop,
  drawWingFlutter,
  drawStarAura,
  drawGroundShadow,
  drawTileUndershadow,
  drawTileEdgeShading,
  drawTileSeamConceal,
  drawSceneGrade,
  drawJungleHaze,
  drawJungleForeground,
  drawBeachForeground,
  drawThemedForeground,
  drawLightPools,
  drawLavaGlow,
  drawSuperBlockHighlight,
  drawDynamicLighting,
};
