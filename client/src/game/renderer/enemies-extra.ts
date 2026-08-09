import type { Renderer } from '../renderer.ts';
import { CHUCK_HITS_TO_KILL } from '../constants';
import { drawDinoSprite, softShadowEllipse } from './enemies-core.ts';

function drawPiranhaPlant(this: Renderer, x: number, y: number, w: number, h: number, emergeOffset: number, frame: number, pipeTopY: number) {
  if (emergeOffset <= 0) return;
  const ctx = this.ctx;
  ctx.save();

  ctx.beginPath();
  ctx.rect(x - 4, y - emergeOffset - 10, w + 8, emergeOffset + 10);
  ctx.clip();

  const stemH = emergeOffset;
  const stemW = 12;
  const stemX = x + w / 2;
  const stemTop = y + h - stemH;

  ctx.fillStyle = '#2d9a2d';
  ctx.fillRect(stemX - stemW / 2, stemTop, stemW, stemH);

  ctx.fillStyle = 'rgba(15,80,15,0.4)';
  for (let sy = stemTop + 5; sy < y + h; sy += 7) {
    ctx.fillRect(stemX - stemW / 2 - 0.5, sy, stemW + 1, 2);
  }

  ctx.fillStyle = 'rgba(60,160,60,0.15)';
  ctx.fillRect(stemX - stemW / 2 + 1, stemTop, 3, stemH);

  const headW = w * 0.85;
  const headH = Math.min(22, emergeOffset);
  const headY = y + h - emergeOffset;
  const headCX = x + w / 2;
  const headCY = headY + headH / 2;

  if (headH > 8) {
    for (let side = -1; side <= 1; side += 2) {
      const leafX = stemX + side * (stemW / 2 + 3);
      const leafY = headY + headH + 3;
      ctx.fillStyle = '#2a8a2a';
      ctx.beginPath();
      ctx.moveTo(stemX + side * 3, leafY);
      ctx.quadraticCurveTo(leafX + side * 8, leafY - 4, leafX + side * 10, leafY + 3);
      ctx.quadraticCurveTo(leafX + side * 7, leafY + 5, stemX + side * 3, leafY + 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  const hrx = Math.max(1, headW / 2 - 2);
  const hry = Math.max(1, headH / 2 - 2);
  const hrySmall = Math.max(1, headH / 2 - 1);

  ctx.fillStyle = 'rgba(30,0,0,0.85)';
  ctx.beginPath();
  ctx.ellipse(headCX, headCY, hrx, hry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#cc2211';
  ctx.beginPath();
  ctx.ellipse(headCX, headCY - 1, Math.max(1, headW / 2), hrySmall, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#228822';
  ctx.beginPath();
  ctx.ellipse(headCX, headCY + 1, Math.max(1, headW / 2 + 2), hrySmall, 0, 0, Math.PI);
  ctx.fill();

  if (headH < 5) { ctx.restore(); return; }

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const teethCount = 6;
  for (let i = 0; i < teethCount; i++) {
    const angle = Math.PI + (i / (teethCount - 1)) * Math.PI * 0.7 - Math.PI * 0.35;
    const tx = headCX + Math.cos(angle) * Math.max(1, headW / 2 - 4);
    const ty = headCY + Math.sin(angle) * Math.max(1, headH / 2 - 3);
    ctx.beginPath();
    ctx.moveTo(tx - 2, ty);
    ctx.lineTo(tx, ty + 5);
    ctx.lineTo(tx + 2, ty);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < teethCount; i++) {
    const angle = (i / (teethCount - 1)) * Math.PI * 0.7 - Math.PI * 0.35;
    const tx = headCX + Math.cos(angle) * Math.max(1, headW / 2 - 4);
    const ty = headCY - Math.sin(angle) * Math.max(1, headH / 2 - 4) + 2;
    ctx.beginPath();
    ctx.moveTo(tx - 2, ty);
    ctx.lineTo(tx, ty - 4.5);
    ctx.lineTo(tx + 2, ty);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const spotPhase = frame * 0.03;
  for (let i = 0; i < 6; i++) {
    const angle = spotPhase + (i / 6) * Math.PI * 2;
    const sr = headW * 0.32;
    const sx = headCX + Math.cos(angle) * sr;
    const sy = headCY - 2 + Math.sin(angle) * (headH * 0.22);
    if (sy < headCY) {
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2 + (i % 2) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (headH > 12) {
    ctx.fillStyle = 'rgba(100,220,100,0.25)';
    const droolX1 = headCX - headW * 0.2;
    const droolX2 = headCX + headW * 0.15;
    const droolY = headCY + headH / 2 + 1;
    const droolLen = 3 + Math.sin(frame * 0.08) * 2;
    ctx.beginPath();
    ctx.ellipse(droolX1, droolY + droolLen, 2, Math.max(1, droolLen), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(droolX2, droolY + droolLen * 0.7, 1.5, Math.max(1, droolLen * 0.7), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function getCachedSpiderBody(this: Renderer, w: number, h: number): HTMLCanvasElement {
  const accent = this.getThemeAccent();
  const key = `spider_body_${this.currentTheme}_${w}_${h}`;
  let cached = this.spriteCache.get(key);
  if (cached) return cached;

  const pad = 10;
  const c = document.createElement('canvas');
  c.width = w + pad * 2;
  c.height = h + pad * 2;
  const sctx = c.getContext('2d')!;
  const cx = pad + w / 2;
  const abdomenCY = pad + h * 0.6;
  const cephCY = pad + h * 0.28;

  // Per-world rim halo behind both body segments.
  sctx.save();
  sctx.shadowColor = accent.rim;
  sctx.shadowBlur = 7;
  sctx.fillStyle = accent.rim;
  sctx.beginPath();
  sctx.ellipse(cx, abdomenCY, w * 0.4, h * 0.37, 0, 0, Math.PI * 2);
  sctx.fill();
  sctx.beginPath();
  sctx.ellipse(cx, cephCY, w * 0.3, h * 0.24, 0, 0, Math.PI * 2);
  sctx.fill();
  sctx.restore();

  const abdGrad = sctx.createRadialGradient(cx - 2, abdomenCY - 3, 2, cx, abdomenCY, w * 0.4);
  abdGrad.addColorStop(0, '#5a4030');
  abdGrad.addColorStop(0.3, '#3a2515');
  abdGrad.addColorStop(0.7, '#2a1a0a');
  abdGrad.addColorStop(1, '#1a0f05');
  sctx.fillStyle = abdGrad;
  sctx.beginPath();
  sctx.ellipse(cx, abdomenCY, w * 0.38, h * 0.35, 0, 0, Math.PI * 2);
  sctx.fill();

  sctx.fillStyle = 'rgba(90,70,45,0.4)';
  for (let i = 0; i < 4; i++) {
    const sy = abdomenCY - h * 0.15 + i * h * 0.1;
    const sw = w * (0.2 + Math.sin(i * 1.2) * 0.08);
    sctx.beginPath();
    sctx.ellipse(cx, sy, sw, 2, 0, 0, Math.PI * 2);
    sctx.fill();
  }
  sctx.fillStyle = 'rgba(80,60,40,0.3)';
  sctx.beginPath();
  sctx.moveTo(cx, abdomenCY - h * 0.2);
  sctx.lineTo(cx - w * 0.12, abdomenCY);
  sctx.lineTo(cx, abdomenCY + h * 0.15);
  sctx.lineTo(cx + w * 0.12, abdomenCY);
  sctx.closePath();
  sctx.fill();

  sctx.strokeStyle = 'rgba(60,40,20,0.3)';
  sctx.lineWidth = 0.4;
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const br = w * 0.36 + Math.sin(i * 2.7) * 1.5;
    const bx = cx + Math.cos(angle) * br;
    const by = abdomenCY + Math.sin(angle) * (h * 0.33);
    sctx.beginPath();
    sctx.moveTo(bx, by);
    sctx.lineTo(bx + Math.cos(angle) * 2, by + Math.sin(angle) * 2);
    sctx.stroke();
  }

  const cephGrad = sctx.createRadialGradient(cx - 1, cephCY - 2, 1, cx, cephCY, w * 0.28);
  cephGrad.addColorStop(0, '#5a4030');
  cephGrad.addColorStop(0.5, '#3a2515');
  cephGrad.addColorStop(1, '#2a1a0a');
  sctx.fillStyle = cephGrad;
  sctx.beginPath();
  sctx.ellipse(cx, cephCY, w * 0.28, h * 0.22, 0, 0, Math.PI * 2);
  sctx.fill();

  // Augen: zwei größere Hauptaugen (rot leuchtend) + vier kleine Nebenaugen.
  const eyeY = cephCY - h * 0.04;
  sctx.fillStyle = '#ff3b2e';
  for (const ex of [-w * 0.1, w * 0.1]) {
    sctx.beginPath();
    sctx.arc(cx + ex, eyeY, 2.6, 0, Math.PI * 2);
    sctx.fill();
  }
  // Glühender Schein um die Hauptaugen
  sctx.save();
  sctx.globalCompositeOperation = 'screen';
  for (const ex of [-w * 0.1, w * 0.1]) {
    const eg = sctx.createRadialGradient(cx + ex, eyeY, 0.5, cx + ex, eyeY, 5);
    eg.addColorStop(0, 'rgba(255,80,60,0.7)');
    eg.addColorStop(1, 'rgba(255,60,40,0)');
    sctx.fillStyle = eg;
    sctx.beginPath();
    sctx.arc(cx + ex, eyeY, 5, 0, Math.PI * 2);
    sctx.fill();
  }
  sctx.restore();
  // Glanzpunkte
  sctx.fillStyle = 'rgba(255,230,220,0.95)';
  for (const ex of [-w * 0.1, w * 0.1]) {
    sctx.beginPath();
    sctx.arc(cx + ex - 0.8, eyeY - 0.8, 0.8, 0, Math.PI * 2);
    sctx.fill();
  }
  // Kleine Nebenaugen
  sctx.fillStyle = '#7a1810';
  for (const ex of [-w * 0.17, -w * 0.03, w * 0.03, w * 0.17]) {
    sctx.beginPath();
    sctx.arc(cx + ex, eyeY + h * 0.06, 1, 0, Math.PI * 2);
    sctx.fill();
  }

  sctx.strokeStyle = 'rgba(60,40,20,0.3)';
  sctx.lineWidth = 0.4;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const br = w * 0.26;
    const bx = cx + Math.cos(angle) * br;
    const by = cephCY + Math.sin(angle) * (h * 0.2);
    sctx.beginPath();
    sctx.moveTo(bx, by);
    sctx.lineTo(bx + Math.cos(angle) * 2, by + Math.sin(angle) * 1.5);
    sctx.stroke();
  }

  const eyePositions = [
    { ox: -5, oy: -4, r: 2 },
    { ox: 5, oy: -4, r: 2 },
    { ox: -3, oy: -1, r: 1.8 },
    { ox: 3, oy: -1, r: 1.8 },
    { ox: -6, oy: -1, r: 1.3 },
    { ox: 6, oy: -1, r: 1.3 },
    { ox: -4, oy: 2, r: 1 },
    { ox: 4, oy: 2, r: 1 },
  ];
  for (const ep of eyePositions) {
    const ex = cx + ep.ox;
    const ey = cephCY + ep.oy;
    sctx.fillStyle = '#cc2222';
    sctx.beginPath();
    sctx.arc(ex, ey, ep.r, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = '#ff4444';
    sctx.beginPath();
    sctx.arc(ex - ep.r * 0.2, ey - ep.r * 0.2, ep.r * 0.5, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = 'rgba(255,255,255,0.5)';
    sctx.beginPath();
    sctx.arc(ex + ep.r * 0.3, ey - ep.r * 0.3, ep.r * 0.3, 0, Math.PI * 2);
    sctx.fill();
  }

  sctx.fillStyle = '#1a0f05';
  const fangBaseY = cephCY + h * 0.12;
  for (let side = -1; side <= 1; side += 2) {
    sctx.beginPath();
    sctx.moveTo(cx + side * 2, fangBaseY);
    sctx.quadraticCurveTo(cx + side * 4, fangBaseY + 2, cx + side * 3, fangBaseY + 5);
    sctx.quadraticCurveTo(cx + side * 1, fangBaseY + 3, cx + side * 2, fangBaseY);
    sctx.closePath();
    sctx.fill();
  }
  sctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (let side = -1; side <= 1; side += 2) {
    sctx.beginPath();
    sctx.arc(cx + side * 3, fangBaseY + 3.5, 0.6, 0, Math.PI * 2);
    sctx.fill();
  }

  this.spriteCache.set(key, c);
  return c;
}

function drawSpider(this: Renderer, x: number, y: number, w: number, h: number, startY: number, webLength: number, frame: number) {
  const ctx = this.ctx;
  ctx.save();

  if (webLength > 0) {
    const webX = x + w / 2;
    const webTop = y - webLength;
    ctx.strokeStyle = 'rgba(220, 220, 230, 0.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(webX, webTop);
    ctx.lineTo(webX, y + 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let wy = webTop + 8; wy < y; wy += 10) {
      const shimmer = Math.sin(frame * 0.1 + wy * 0.3) * 0.3 + 0.5;
      ctx.globalAlpha = shimmer;
      ctx.beginPath();
      ctx.arc(webX, wy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  softShadowEllipse(ctx, x + w / 2, y + h + 2, w * 0.35, 2.5, this.getThemeAccent().shadow);

  const legPhase = frame * 0.15;
  const cx = x + w / 2;
  const abdomenCY = y + h * 0.6;
  const cephCY = y + h * 0.28;

  ctx.strokeStyle = '#2a1a0a';
  const legPairs = [
    { baseY: 0.22, angle: -0.6, len: 1.0 },
    { baseY: 0.30, angle: -0.3, len: 1.1 },
    { baseY: 0.38, angle: 0.05, len: 1.05 },
    { baseY: 0.46, angle: 0.35, len: 0.9 },
  ];

  for (const lp of legPairs) {
    for (let side = -1; side <= 1; side += 2) {
      const legIdx = legPairs.indexOf(lp) * 2 + (side === 1 ? 1 : 0);
      const phase = legPhase + legIdx * 0.8;
      const anim = Math.sin(phase) * 0.12;

      const baseX = cx + side * w * 0.15;
      const baseY = y + h * lp.baseY;

      const seg1Len = 7 * lp.len;
      const seg2Len = 8 * lp.len;
      const seg3Len = 6 * lp.len;

      const a1 = lp.angle + side * 0.3 + anim;
      const j1x = baseX + side * Math.cos(a1) * seg1Len;
      const j1y = baseY + Math.sin(a1) * seg1Len - 4;

      const a2 = lp.angle + side * 0.1 + anim * 0.7;
      const j2x = j1x + side * Math.cos(a2) * seg2Len;
      const j2y = j1y + Math.abs(Math.sin(a2)) * seg2Len + 3;

      const a3 = 0.8 + anim * 0.3;
      const tipX = j2x + side * Math.cos(a3) * seg3Len;
      const tipY = j2y + Math.sin(a3) * seg3Len;

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3a2510';
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(j1x, j1y);
      ctx.stroke();

      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#2a1a0a';
      ctx.beginPath();
      ctx.moveTo(j1x, j1y);
      ctx.lineTo(j2x, j2y);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1a0f05';
      ctx.beginPath();
      ctx.moveTo(j2x, j2y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      ctx.fillStyle = '#4a3520';
      ctx.beginPath();
      ctx.arc(j1x, j1y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(j2x, j2y, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(60,40,20,0.3)';
      ctx.lineWidth = 0.4;
      for (let b = 0; b < 3; b++) {
        const t = (b + 1) / 4;
        const bx = baseX + (j1x - baseX) * t;
        const by = baseY + (j1y - baseY) * t;
        const bAngle = a1 + Math.PI / 2 + (b * 0.3);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(bAngle) * 2.5, by + Math.sin(bAngle) * 2.5);
        ctx.stroke();
      }
    }
  }

  const spiderBody = this.getCachedSpiderBody(w, h);
  ctx.drawImage(spiderBody, x - 10, y - 10);

  ctx.restore();
}

function drawCrab(this: Renderer, x: number, y: number, w: number, h: number, frame: number, isDead: boolean, isAngry: boolean) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;

  const accent = this.getThemeAccent();
  softShadowEllipse(ctx, cx, y + h + 2, w * 0.3, 2.5, accent.shadow);

  ctx.save();
  if (isDead) {
    ctx.translate(cx, cy);
    ctx.scale(1, -1);
    ctx.translate(-cx, -cy);
  }

  const bodyColor = isAngry ? '#a02020' : '#e06030';
  const bodyDark = isAngry ? '#801818' : '#c04820';
  const legColor = isAngry ? '#902020' : '#d05828';

  const legSwing = Math.sin(frame * 0.12) * 0.3;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const legBaseX = cx + side * w * (0.15 + i * 0.12);
      const legBaseY = cy + h * 0.1;
      const angle = side * (0.4 + i * 0.25) + legSwing * (i % 2 === 0 ? 1 : -1);
      const legLen = h * 0.45;

      ctx.strokeStyle = legColor;
      ctx.lineWidth = Math.max(1.5, w * 0.04);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(legBaseX, legBaseY);
      const kneeX = legBaseX + Math.cos(angle) * legLen * 0.5;
      const kneeY = legBaseY + Math.abs(Math.sin(angle)) * legLen * 0.3 + legLen * 0.3;
      ctx.lineTo(kneeX, kneeY);
      const footX = kneeX + Math.cos(angle) * legLen * 0.5;
      const footY = kneeY + legLen * 0.25;
      ctx.lineTo(footX, footY);
      ctx.stroke();
    }
  }

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.38, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 1;
  ctx.stroke();

  const grad = ctx.createRadialGradient(cx - w * 0.05, cy - h * 0.05, 0, cx, cy, w * 0.35);
  grad.addColorStop(0, 'rgba(255,255,255,0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.38, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const clawOpen = isAngry ? 0.7 : 0.4;
  for (let side = -1; side <= 1; side += 2) {
    const clawBaseX = cx + side * w * 0.35;
    const clawBaseY = cy - h * 0.15;

    ctx.strokeStyle = legColor;
    ctx.lineWidth = Math.max(2, w * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(clawBaseX, clawBaseY);
    const armEndX = clawBaseX + side * w * 0.15;
    const armEndY = clawBaseY - h * 0.2;
    ctx.lineTo(armEndX, armEndY);
    ctx.stroke();

    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = bodyDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(armEndX, armEndY);
    ctx.lineTo(armEndX + side * w * 0.1, armEndY - h * 0.08 * clawOpen);
    ctx.lineTo(armEndX + side * w * 0.06, armEndY + h * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(armEndX, armEndY);
    ctx.lineTo(armEndX + side * w * 0.1, armEndY + h * 0.08 * clawOpen);
    ctx.lineTo(armEndX + side * w * 0.06, armEndY + h * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  for (let side = -1; side <= 1; side += 2) {
    const eyeStalkX = cx + side * w * 0.12;
    const eyeStalkTopY = cy - h * 0.32;
    ctx.strokeStyle = bodyDark;
    ctx.lineWidth = Math.max(1.5, w * 0.03);
    ctx.beginPath();
    ctx.moveTo(eyeStalkX, cy - h * 0.2);
    ctx.lineTo(eyeStalkX, eyeStalkTopY);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeStalkX, eyeStalkTopY, w * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(eyeStalkX + side * w * 0.01, eyeStalkTopY, w * 0.025, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent.glint;
    ctx.beginPath();
    ctx.arc(eyeStalkX + side * w * 0.018, eyeStalkTopY - w * 0.012, w * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawJellyfish(this: Renderer, x: number, y: number, w: number, h: number, frame: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const pulse = Math.sin(frame * 0.06) * 0.12;
  const bellW = w * (0.4 + pulse * 0.5);
  const bellH = h * (0.32 - pulse * 0.3);
  const bellTop = y + h * 0.1;
  const bellBottom = bellTop + bellH;

  const accent = this.getThemeAccent();
  softShadowEllipse(ctx, cx, y + h + 2, w * 0.2, 2, accent.shadow);

  ctx.save();
  ctx.shadowColor = 'rgba(120,100,255,0.4)';
  ctx.shadowBlur = 12;

  const bodyGrad = ctx.createRadialGradient(cx, bellTop + bellH * 0.3, 0, cx, bellTop + bellH * 0.5, bellW);
  bodyGrad.addColorStop(0, 'rgba(180,160,255,0.6)');
  bodyGrad.addColorStop(0.5, 'rgba(120,100,220,0.45)');
  bodyGrad.addColorStop(1, 'rgba(80,60,180,0.25)');
  ctx.fillStyle = bodyGrad;

  ctx.beginPath();
  ctx.moveTo(cx - bellW, bellBottom);
  ctx.quadraticCurveTo(cx - bellW, bellTop - bellH * 0.2, cx, bellTop - bellH * 0.1);
  ctx.quadraticCurveTo(cx + bellW, bellTop - bellH * 0.2, cx + bellW, bellBottom);
  ctx.quadraticCurveTo(cx + bellW * 0.5, bellBottom + bellH * 0.15, cx, bellBottom + bellH * 0.05);
  ctx.quadraticCurveTo(cx - bellW * 0.5, bellBottom + bellH * 0.15, cx - bellW, bellBottom);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(220,210,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx - bellW * 0.2, bellTop + bellH * 0.25, bellW * 0.25, bellH * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  const tentacleCount = 7;
  const tentacleStartY = bellBottom + bellH * 0.05;
  for (let i = 0; i < tentacleCount; i++) {
    const t = (i / (tentacleCount - 1)) - 0.5;
    const tx = cx + t * bellW * 1.6;
    const waveOff = Math.sin(frame * 0.08 + i * 1.2) * w * 0.06;
    const tentLen = h * (0.45 + Math.sin(frame * 0.05 + i * 0.8) * 0.08);

    const alpha = 0.2 + Math.abs(t) * 0.15;
    ctx.strokeStyle = `rgba(140,120,220,${alpha})`;
    ctx.lineWidth = 1 + (1 - Math.abs(t)) * 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, tentacleStartY);
    const cp1x = tx + waveOff;
    const cp1y = tentacleStartY + tentLen * 0.33;
    const cp2x = tx - waveOff * 0.8;
    const cp2y = tentacleStartY + tentLen * 0.66;
    const endX = tx + waveOff * 0.5;
    const endY = tentacleStartY + tentLen;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();
  }

  for (let i = 0; i < 3; i++) {
    const t = (i / 2) - 0.5;
    const tx = cx + t * bellW * 0.8;
    const waveOff = Math.sin(frame * 0.06 + i * 2) * w * 0.04;
    const tentLen = h * (0.35 + Math.sin(frame * 0.04 + i) * 0.06);

    ctx.strokeStyle = 'rgba(160,140,240,0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tx, tentacleStartY);
    ctx.bezierCurveTo(
      tx + waveOff, tentacleStartY + tentLen * 0.4,
      tx - waveOff, tentacleStartY + tentLen * 0.7,
      tx + waveOff * 0.3, tentacleStartY + tentLen
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawKangaroo(this: Renderer, x: number, y: number, w: number, h: number, frame: number, isDead: boolean, direction: number) {
  const ctx = this.ctx;
  if (this.currentTheme === 'plush') {
    // Kleiner grüner Hüpf-Dino (aus dem User-Bild abgeleitet, hue-rotate).
    if (drawDinoSprite(this, x, y, w, h, frame, direction, { scale: 1.18, hue: 96, sat: 1.18, isDead })) return;
    ctx.save(); ctx.fillStyle = '#79c34a';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.6, w * 0.34, h * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    return;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;

  const accent = this.getThemeAccent();
  softShadowEllipse(ctx, cx, y + h + 2, w * 0.25, 2.5, accent.shadow);

  ctx.save();
  ctx.translate(cx, cy);

  if (isDead) {
    ctx.rotate(Math.PI / 2 * direction);
  } else if (direction === -1) {
    ctx.scale(-1, 1);
  }

  ctx.translate(-cx, -cy);

  const hopPhase = Math.sin(frame * 0.1);
  const bodyBounce = isDead ? 0 : hopPhase * h * 0.03;

  const bodyColor = '#b08050';
  const bodyLight = '#c8a070';
  const bodyDark = '#906838';
  const bellyColor = '#dcc8a8';

  const tailBaseX = cx - w * 0.25;
  const tailBaseY = cy + h * 0.2 + bodyBounce;
  const tailWave = isDead ? 0 : Math.sin(frame * 0.08) * 0.15;
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = Math.max(3, w * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tailBaseX, tailBaseY);
  ctx.quadraticCurveTo(
    tailBaseX - w * 0.3, tailBaseY + h * 0.15 + tailWave * h,
    tailBaseX - w * 0.4, tailBaseY + h * 0.05 + tailWave * h * 0.5
  );
  ctx.stroke();
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = Math.max(1.5, w * 0.04);
  ctx.beginPath();
  ctx.moveTo(tailBaseX, tailBaseY);
  ctx.quadraticCurveTo(
    tailBaseX - w * 0.3, tailBaseY + h * 0.15 + tailWave * h,
    tailBaseX - w * 0.4, tailBaseY + h * 0.05 + tailWave * h * 0.5
  );
  ctx.stroke();

  const legCompress = isDead ? 0 : hopPhase * h * 0.06;
  const hindLegX = cx - w * 0.05;
  const hindLegTopY = cy + h * 0.15 + bodyBounce;
  const hindFootY = y + h - 2;

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(hindLegX, hindLegTopY + (hindFootY - hindLegTopY) * 0.5 + legCompress * 0.5,
    w * 0.1, (hindFootY - hindLegTopY) * 0.5 - legCompress * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.fillStyle = bodyDark;
  ctx.beginPath();
  ctx.ellipse(hindLegX + w * 0.08, hindFootY, w * 0.12, h * 0.04, 0.1, 0, Math.PI * 2);
  ctx.fill();

  const koBodyGrad = ctx.createRadialGradient(cx - w * 0.06, cy - h * 0.08 + bodyBounce, 1, cx, cy + bodyBounce, w * 0.28);
  koBodyGrad.addColorStop(0, bodyLight);
  koBodyGrad.addColorStop(0.7, bodyColor);
  koBodyGrad.addColorStop(1, bodyDark);
  ctx.fillStyle = koBodyGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + bodyBounce, w * 0.2, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.fillStyle = bellyColor;
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.03, cy + h * 0.06 + bodyBounce, w * 0.12, h * 0.16, 0.1, 0, Math.PI * 2);
  ctx.fill();

  const headX = cx + w * 0.08;
  const headY = cy - h * 0.28 + bodyBounce;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(headX, headY, w * 0.11, h * 0.1, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.fillStyle = bodyLight;
  ctx.beginPath();
  ctx.ellipse(headX + w * 0.04, headY + h * 0.02, w * 0.06, h * 0.05, 0.2, 0, Math.PI * 2);
  ctx.fill();

  for (let i = -1; i <= 1; i += 2) {
    const earX = headX + w * 0.02 + i * w * 0.06;
    const earY = headY - h * 0.12;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(earX, earY, w * 0.03, h * 0.07, i * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4a888';
    ctx.beginPath();
    ctx.ellipse(earX, earY + h * 0.01, w * 0.015, h * 0.04, i * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(headX + w * 0.05, headY - h * 0.01, w * 0.02, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.ellipse(headX + w * 0.09, headY + h * 0.03, w * 0.02, w * 0.015, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent.glint;
  ctx.beginPath();
  ctx.arc(headX + w * 0.06, headY - h * 0.02, w * 0.008, 0, Math.PI * 2);
  ctx.fill();

  const armX = cx + w * 0.12;
  const armY = cy - h * 0.05 + bodyBounce;
  const armSwing = isDead ? 0 : Math.sin(frame * 0.1 + 1) * 0.2;
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = Math.max(2, w * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(armX, armY);
  ctx.lineTo(armX + w * 0.08, armY + h * 0.12 + armSwing * h * 0.1);
  ctx.stroke();

  ctx.restore();
}

function drawSnake(this: Renderer, x: number, y: number, w: number, h: number, frame: number, isDead: boolean, direction: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const groundY = y + h * 0.75;

  const accent = this.getThemeAccent();
  softShadowEllipse(ctx, cx, y + h + 2, w * 0.35, 2, accent.shadow);

  ctx.save();
  ctx.translate(cx, groundY);
  if (direction === -1) {
    ctx.scale(-1, 1);
  }
  ctx.translate(-cx, -groundY);

  const bodyColor = '#5a7a30';
  const bodyDark = '#3d5a1e';
  const bellyColor = '#8aaa50';
  const headColor = '#4a6a28';

  const segments = 20;
  const segLen = w * 0.8 / segments;
  const bodyThickness = h * 0.12;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const sx = cx - w * 0.35 + t * w * 0.8;
    let sy: number;
    if (isDead) {
      sy = groundY;
    } else {
      const wave = Math.sin(t * Math.PI * 2.5 - frame * 0.12) * h * 0.12;
      sy = groundY + wave;
    }
    points.push({ x: sx, y: sy });
  }

  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = bodyThickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();

  ctx.strokeStyle = bellyColor;
  ctx.lineWidth = bodyThickness * 0.5;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y + bodyThickness * 0.15);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y + bodyThickness * 0.15, midX, midY + bodyThickness * 0.15);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y + bodyThickness * 0.15);
  ctx.stroke();

  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = bodyThickness * 0.2;
  for (let i = 2; i < points.length - 2; i += 3) {
    const p = points[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y - bodyThickness * 0.2, bodyThickness * 0.3, 0, Math.PI, true);
    ctx.stroke();
  }

  const headPt = points[points.length - 1];
  const prevPt = points[points.length - 2];
  const headAngle = Math.atan2(headPt.y - prevPt.y, headPt.x - prevPt.x);

  ctx.save();
  ctx.translate(headPt.x, headPt.y);
  ctx.rotate(headAngle);

  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, 0);
  ctx.lineTo(-w * 0.03, -bodyThickness * 0.6);
  ctx.lineTo(-w * 0.03, bodyThickness * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.arc(w * 0.02, -bodyThickness * 0.25, bodyThickness * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(w * 0.025, -bodyThickness * 0.25, bodyThickness * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent.glint;
  ctx.beginPath();
  ctx.arc(w * 0.035, -bodyThickness * 0.32, bodyThickness * 0.05, 0, Math.PI * 2);
  ctx.fill();

  if (!isDead) {
    const tongueFlick = Math.sin(frame * 0.2);
    if (tongueFlick > 0) {
      ctx.strokeStyle = '#cc3333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, 0);
      const tongueLen = w * 0.06 * tongueFlick;
      ctx.lineTo(w * 0.08 + tongueLen, 0);
      ctx.lineTo(w * 0.08 + tongueLen + w * 0.02, -bodyThickness * 0.2);
      ctx.moveTo(w * 0.08 + tongueLen, 0);
      ctx.lineTo(w * 0.08 + tongueLen + w * 0.02, bodyThickness * 0.2);
      ctx.stroke();
    }
  }

  ctx.restore();
  ctx.restore();
}

function drawWizard(
  this: Renderer,
  x: number, y: number, w: number, h: number,
  direction: number, frame: number, isCharging: boolean,
  isDead: boolean, alpha: number,
) {
  const ctx = this.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (isDead) {
    // Squash + fade out (mirror Goomba-death).
    const cx = x + w / 2;
    const cy = y + h - 6;
    ctx.fillStyle = '#3a1f6e';
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.45, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // Sparkle ring while teleporting (alpha < 1).
  if (alpha < 0.99) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + frame * 0.05;
      const rr = w * 0.6 * (1 - alpha);
      ctx.fillStyle = `hsla(${(frame * 6 + i * 40) % 360}, 90%, 70%, ${0.55 * (1 - alpha)})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const flip = direction < 0 ? -1 : 1;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(flip, 1);
  ctx.translate(-w / 2, -h / 2);
  // Robe (wide trapezoid)
  const robeGrad = ctx.createLinearGradient(0, h * 0.35, 0, h);
  robeGrad.addColorStop(0, '#4a2a8a');
  robeGrad.addColorStop(1, '#23104a');
  ctx.fillStyle = robeGrad;
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.45);
  ctx.lineTo(w * 0.82, h * 0.45);
  ctx.lineTo(w * 0.95, h);
  ctx.lineTo(w * 0.05, h);
  ctx.closePath();
  ctx.fill();
  // Sash trim
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h - 1);
  ctx.lineTo(w * 0.95, h - 1);
  ctx.stroke();
  // Head + face
  ctx.fillStyle = '#f4d3a8';
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.42, w * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Beard
  ctx.fillStyle = '#dadada';
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.45);
  ctx.quadraticCurveTo(w / 2, h * 0.7, w * 0.68, h * 0.45);
  ctx.quadraticCurveTo(w / 2, h * 0.55, w * 0.32, h * 0.45);
  ctx.closePath();
  ctx.fill();
  // Hat (cone)
  ctx.fillStyle = '#2a1560';
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.3);
  ctx.lineTo(w * 0.72, h * 0.3);
  ctx.lineTo(w * 0.6, h * 0.0);
  ctx.closePath();
  ctx.fill();
  // Hat brim
  ctx.fillStyle = '#3a1f7a';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.3, w * 0.28, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hat star
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.18, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Eyes (glowing)
  const eyeGlow = isCharging ? 1 : 0.7;
  ctx.fillStyle = `rgba(180, 220, 255, ${eyeGlow})`;
  ctx.beginPath();
  ctx.arc(w * 0.43, h * 0.4, 1.5, 0, Math.PI * 2);
  ctx.arc(w * 0.57, h * 0.4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Staff (right hand, in front of robe)
  const staffX = w * 0.78;
  const staffTopY = h * 0.05;
  const staffBotY = h * 0.95;
  ctx.strokeStyle = '#7a4a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(staffX, staffTopY);
  ctx.lineTo(staffX, staffBotY);
  ctx.stroke();
  // Orb on staff (pulses while charging)
  const orbPulse = isCharging ? 0.6 + 0.4 * Math.sin(frame * 0.4) : 0.5 + 0.2 * Math.sin(frame * 0.1);
  const orbHue = (frame * 5) % 360;
  ctx.shadowColor = `hsla(${orbHue}, 100%, 65%, ${orbPulse})`;
  ctx.shadowBlur = 8;
  ctx.fillStyle = `hsla(${orbHue}, 100%, 70%, 1)`;
  ctx.beginPath();
  ctx.arc(staffX, staffTopY - 2, 3.5 + orbPulse * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawMagicBolt(this: Renderer, x: number, y: number, w: number, h: number, frame: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  // Welt 13: das Boss-Projektil ist ein „Fehler"/Glitch (kein Magie-Orb).
  if (this.currentTheme === 'bluefield') {
    const t = this.time;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = 'rgba(255,60,50,0.8)'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#e5342c';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(80,220,255,0.6)';
    ctx.fillRect(-r - 2 + Math.sin(t * 0.5) * 2, -r * 0.4, r * 2, 2);
    ctx.fillStyle = 'rgba(255,80,200,0.6)';
    ctx.fillRect(-r + 2, r * 0.25, r * 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(r * 1.5)}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, 1);
    ctx.restore();
    return;
  }
  // Welt 16: Boss-Projektil ist ein Feuerball (Drachen-Atem).
  if (this.currentTheme === 'dragon') {
    const t = this.time;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = 'rgba(255,140,30,0.9)'; ctx.shadowBlur = 12;
    // Flacker-Schweif hinter dem Ball.
    const flick = 1 + Math.sin(t * 0.8) * 0.15;
    const tail = ctx.createLinearGradient(r * 1.4, 0, -r * 0.6, 0);
    tail.addColorStop(0, 'rgba(255,220,120,0)');
    tail.addColorStop(0.5, 'rgba(255,150,40,0.55)');
    tail.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = tail;
    ctx.beginPath(); ctx.ellipse(r * 0.2, 0, r * 1.5, r * 0.7 * flick, 0, 0, Math.PI * 2); ctx.fill();
    // Kern (heiß nach außen).
    const core = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
    core.addColorStop(0, '#fff6d0'); core.addColorStop(0.4, '#ffd23a'); core.addColorStop(0.75, '#ff7a1e'); core.addColorStop(1, '#e0400f');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, r * flick, 0, Math.PI * 2); ctx.fill();
    // Kleine Flammenzacken oben.
    ctx.fillStyle = 'rgba(255,180,60,0.8)';
    for (let k = -1; k <= 1; k++) {
      const fx = k * r * 0.5;
      ctx.beginPath();
      ctx.moveTo(fx - 1.6, -r * 0.4);
      ctx.quadraticCurveTo(fx, -r * (1.0 + Math.sin(t * 0.6 + k) * 0.2), fx + 1.6, -r * 0.4);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    return;
  }
  const hue = (frame * 8) % 360;
  ctx.save();
  // Glow halo
  ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.9)`;
  ctx.shadowBlur = 10;
  // Outer orb
  const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, r * 1.4);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.4, `hsl(${hue}, 100%, 70%)`);
  grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 80%, 35%)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Inner spark cross
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1;
  const spike = r * 0.9;
  ctx.beginPath();
  ctx.moveTo(cx - spike, cy);
  ctx.lineTo(cx + spike, cy);
  ctx.moveTo(cx, cy - spike);
  ctx.lineTo(cx, cy + spike);
  ctx.stroke();
  ctx.restore();
}

// ===========================================================================
// Bomb-Omb: round black sphere with two yellow eyes, little red feet that
// shuffle when walking, and a fuse on top that flashes faster as the
// fuse runs out. Lit bombs flash white at the peak of each blink.
// ===========================================================================
function drawBombOmb(
  this: Renderer,
  x: number, y: number, w: number, h: number,
  direction: number, isLit: boolean, fuseFraction: number, t: number,
) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  // While lit the bomb pulses (faster as fuse runs out) and flashes white.
  const blinkRate = 0.15 + fuseFraction * 0.5;
  const blink = isLit ? (Math.sin(t * blinkRate) > 0.4 ? 1 : 0) : 0;
  ctx.save();
  // Body shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, y + h - 1, r * 0.85, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = blink ? '#ff5a3a' : '#1c1c22';
  ctx.beginPath();
  ctx.arc(cx, cy + 1, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  // Subtle highlight.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.2, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Two yellow eyes — direction shifts the pupils slightly.
  const eyeOff = direction === 1 ? 1 : -1;
  ctx.fillStyle = '#ffd84d';
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.05, r * 0.15, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.3, cy - r * 0.05, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1c22';
  ctx.beginPath();
  ctx.arc(cx - r * 0.3 + eyeOff, cy - r * 0.05, r * 0.07, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.3 + eyeOff, cy - r * 0.05, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  // Red feet that shuffle when walking.
  const step = Math.sin(t * 0.4) * 1.5;
  ctx.fillStyle = '#c43a2a';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.45, y + h - 1 + step, r * 0.22, r * 0.12, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + r * 0.45, y + h - 1 - step, r * 0.22, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fuse on top.
  const fuseY = cy - r * 0.85;
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx, fuseY);
  ctx.quadraticCurveTo(cx + 4, fuseY - 6, cx + 2, fuseY - 10);
  ctx.stroke();
  // Spark at the fuse tip when lit.
  if (isLit) {
    const sparkR = 2 + Math.sin(t * 0.7) * 1;
    const grad = ctx.createRadialGradient(cx + 2, fuseY - 10, 0.5, cx + 2, fuseY - 10, sparkR + 2);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.4, '#ffd84d');
    grad.addColorStop(1, 'rgba(255, 80, 30, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx + 2, fuseY - 10, sparkR + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (this.currentTheme === 'bluefield') {
    // „schlechte Idee": kleine durchgestrichene Glühbirne über der Bombe.
    const ix = x + w / 2, iy = y - 4;
    ctx.save();
    ctx.fillStyle = '#ffd34a';
    ctx.beginPath(); ctx.arc(ix, iy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#caa233';
    ctx.fillRect(ix - 2, iy + 3, 4, 2);
    ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ix - 6, iy + 5); ctx.lineTo(ix + 6, iy - 5); ctx.stroke();
    ctx.restore();
  }
}

// ===========================================================================
// BombExplosion: expanding orange/yellow disc with a shockwave ring.
// `progress` (0..1) drives the ease-out scale and the alpha fade.
// ===========================================================================
function drawBombExplosion(this: Renderer, x: number, y: number, w: number, h: number, progress: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const maxR = Math.min(w, h) / 2;
  const eased = 1 - Math.pow(1 - progress, 2);
  const r = maxR * (0.4 + eased * 0.6);
  const alpha = 1 - progress;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Outer shockwave ring.
  ctx.strokeStyle = 'rgba(255, 220, 120, 0.8)';
  ctx.lineWidth = 3 - progress * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
  ctx.stroke();
  // Hot core.
  const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
  grad.addColorStop(0, '#fff7d0');
  grad.addColorStop(0.4, '#ffb13a');
  grad.addColorStop(0.85, '#c12d10');
  grad.addColorStop(1, 'rgba(80, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Embers radiating outward.
  ctx.fillStyle = 'rgba(255, 200, 80, 0.9)';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const er = r * (0.6 + eased * 0.5);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * er, cy + Math.sin(a) * er, 2 * (1 - progress), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ===========================================================================
// Stachelkugel (Spike Ball): dark metal sphere with eight outward spikes
// + a rotating highlight to sell motion. `roll` is the entity's spin
// angle so the spikes appear to rotate as the ball rolls.
// ===========================================================================
function drawSpikeBall(this: Renderer, x: number, y: number, w: number, h: number, roll: number, isDead: boolean) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2 - 2;
  if (this.currentTheme === 'plush') {
    // Kullerdino: eingerollter Plüsch-Dino mit weichen Filz-Stacheln, rollt.
    ctx.save();
    ctx.translate(cx, cy);
    if (isDead) ctx.scale(1, 0.4);
    ctx.rotate(roll);
    // weiche Filz-Stacheln rundum.
    ctx.fillStyle = '#c48fd8';
    for (let k = 0; k < 8; k++) {
      const a = k * (Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.22) * r, Math.sin(a - 0.22) * r);
      ctx.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5));
      ctx.lineTo(Math.cos(a + 0.22) * r, Math.sin(a + 0.22) * r);
      ctx.closePath(); ctx.fill();
    }
    // Körper (lila-rosa Plüschball).
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    g.addColorStop(0, '#e3a6ee'); g.addColorStop(1, '#b473c8');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // eingerollte Kontur (Schwanz-Naht) + Glanz.
    ctx.strokeStyle = 'rgba(140,80,160,0.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0.3, Math.PI * 1.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.2, 0, Math.PI * 2); ctx.fill();
    if (!isDead) {
      // schläfriges Auge in der Rolle.
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.1, r * 0.11, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (this.currentTheme === 'trampoline') {
    // Dodgeball: bunter Gummiball mit gelbem Band, rollt mit roll.
    ctx.save();
    ctx.translate(cx, cy);
    if (isDead) ctx.scale(1, 0.4);
    ctx.rotate(roll);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    g.addColorStop(0, '#ff7a5a');
    g.addColorStop(1, '#e63c50');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f0d048'; ctx.lineWidth = Math.max(2, r * 0.28);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0.35, Math.PI - 0.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.6, Math.PI + 0.35, Math.PI * 2 - 0.35); ctx.stroke();
    ctx.fillStyle = 'rgba(255,232,222,0.5)';
    ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  if (this.currentTheme === 'school') {
    // Turnball: roter Gymnastikball mit weißen Linien, rollt mit roll.
    ctx.save();
    ctx.translate(cx, cy);
    if (isDead) ctx.scale(1, 0.4);
    ctx.rotate(roll);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    g.addColorStop(0, '#f06a5a');
    g.addColorStop(1, '#c83a2c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,222,212,0.5)';
    ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  ctx.save();
  if (isDead) {
    ctx.translate(cx, cy);
    ctx.scale(1, -1);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = 0.7;
  }
  // Soft contact shadow.
  softShadowEllipse(ctx, cx, y + h + 2, r * 0.7, 2.5, this.getThemeAccent().shadow);
  // Punkt 3: emissiver, pulsierender Gefahren-Glow (additiv) — signalisiert
  // die Bedrohung und hebt die Stachelkugel vom Hintergrund ab. Ab 'mid'.
  if (!isDead && this.quality !== 'low') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const pulse = 0.5 + Math.sin(this.time * 0.08) * 0.3;
    const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.7);
    glow.addColorStop(0, `rgba(255,60,40,${0.30 * pulse})`);
    glow.addColorStop(1, 'rgba(255,40,30,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r * 1.7, cy - r * 1.7, r * 3.4, r * 3.4);
    ctx.restore();
  }
  // Spikes (8 of them, rotating with `roll`).
  ctx.translate(cx, cy);
  ctx.rotate(roll);
  ctx.fillStyle = '#3a3a4a';
  ctx.strokeStyle = '#1a1a22';
  ctx.lineWidth = 0.8;
  const spikeCount = 8;
  for (let i = 0; i < spikeCount; i++) {
    const a = (i / spikeCount) * Math.PI * 2;
    const tipR = r * 1.45;
    const baseR = r * 0.95;
    const baseHalf = 0.18;
    const tx = Math.cos(a) * tipR;
    const ty = Math.sin(a) * tipR;
    const b1x = Math.cos(a - baseHalf) * baseR;
    const b1y = Math.sin(a - baseHalf) * baseR;
    const b2x = Math.cos(a + baseHalf) * baseR;
    const b2y = Math.sin(a + baseHalf) * baseR;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(b1x, b1y);
    ctx.lineTo(b2x, b2y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Main metal sphere.
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
  grad.addColorStop(0, '#9aa0b0');
  grad.addColorStop(0.5, '#4a4a58');
  grad.addColorStop(1, '#1a1a22');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0a0a14';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Bright highlight pip — rotates with the ball.
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ===========================================================================
// Hornisse (Hornet): yellow-and-black striped abdomen, transparent
// flapping wings, big eyes. Diving state tints red and tucks the body
// forward so the player can read the aggro at a glance.
// ===========================================================================
function drawHornet(this: Renderer, x: number, y: number, w: number, h: number, direction: number, diving: boolean, t: number, isDead: boolean) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const flip = direction === -1 ? -1 : 1;
  ctx.save();
  if (isDead) {
    ctx.translate(cx, cy);
    ctx.scale(1, -1);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = 0.7;
  }
  ctx.translate(cx, cy);
  ctx.scale(flip, 1);
  // Wings — fast flap.
  const flap = Math.sin(t * 0.6) * 0.4 + 0.7;
  ctx.fillStyle = `rgba(220, 230, 255, ${0.35 + flap * 0.15})`;
  ctx.beginPath();
  ctx.ellipse(-w * 0.05, -h * 0.4, w * 0.35, h * 0.25 * flap, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.1, -h * 0.4, w * 0.32, h * 0.22 * flap, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Subtle wing veins.
  ctx.strokeStyle = 'rgba(120, 140, 200, 0.3)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-w * 0.2, -h * 0.45);
  ctx.lineTo(0, -h * 0.35);
  ctx.moveTo(w * 0.3, -h * 0.45);
  ctx.lineTo(w * 0.05, -h * 0.35);
  ctx.stroke();
  // Body: ellipse with yellow + black stripes.
  const bodyTilt = diving ? 0.35 : 0;
  ctx.rotate(bodyTilt);
  const bodyW = w * 0.55;
  const bodyH = h * 0.42;
  // Outline.
  ctx.fillStyle = '#1a1a14';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.05, bodyW + 1, bodyH + 1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Yellow base.
  ctx.fillStyle = diving ? '#ff7a2a' : '#f4c038';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.05, bodyW, bodyH, 0, 0, Math.PI * 2);
  ctx.fill();
  // Black stripes.
  ctx.fillStyle = '#1a1a14';
  for (let i = 0; i < 3; i++) {
    const sx = -bodyW * 0.5 + i * bodyW * 0.45;
    ctx.beginPath();
    ctx.ellipse(sx, h * 0.05, bodyW * 0.12, bodyH, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Head circle in front (right side).
  ctx.fillStyle = '#1a1a14';
  ctx.beginPath();
  ctx.arc(bodyW * 0.95, h * 0.02, h * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Eyes.
  ctx.fillStyle = diving ? '#ff4444' : '#fff';
  ctx.beginPath();
  ctx.arc(bodyW * 1.05, h * 0.0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a14';
  ctx.beginPath();
  ctx.arc(bodyW * 1.08, h * 0.0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = this.getThemeAccent().glint;
  ctx.beginPath();
  ctx.arc(bodyW * 1.03, -h * 0.02, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Stinger.
  ctx.fillStyle = '#1a1a14';
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.95, h * 0.05);
  ctx.lineTo(-bodyW * 1.35, h * 0.0);
  ctx.lineTo(-bodyW * 1.35, h * 0.1);
  ctx.closePath();
  ctx.fill();
  // Antennae.
  ctx.strokeStyle = '#1a1a14';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bodyW * 1.05, -h * 0.15);
  ctx.quadraticCurveTo(bodyW * 1.3, -h * 0.35, bodyW * 1.4, -h * 0.45);
  ctx.moveTo(bodyW * 1.0, -h * 0.18);
  ctx.quadraticCurveTo(bodyW * 1.2, -h * 0.4, bodyW * 1.25, -h * 0.5);
  ctx.stroke();
  ctx.restore();
}

// ===========================================================================
// Banzai Bill — riesiges schwarzes Geschoss mit weißem Smiley-Mund.
// Direction-flipped, leichte Stahl-Highlights damit es gefährlich wirkt.
// ===========================================================================
function drawBanzaiBill(this: Renderer, x: number, y: number, w: number, h: number, direction: number, isDead: boolean, t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const flip = direction === -1 ? -1 : 1;
  ctx.save();
  if (isDead) {
    ctx.translate(cx, cy);
    ctx.scale(1, -1);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = 0.7;
  }
  ctx.translate(cx, cy);
  ctx.scale(flip, 1);
  // Trail-Wölkchen hinten dran (rechts in lokalen Koordinaten = hinten).
  ctx.fillStyle = 'rgba(220,220,230,0.5)';
  for (let i = 0; i < 3; i++) {
    const off = w * 0.55 + i * 10 + Math.sin(t * 0.2 + i) * 2;
    ctx.beginPath();
    ctx.arc(off, (i % 2 === 0 ? -4 : 4), 6 - i * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hauptkörper: schwarze Kapsel mit halbrundem Vorderteil.
  const r = h * 0.48;
  const grad = ctx.createLinearGradient(0, -r, 0, r);
  grad.addColorStop(0, '#3a3a40');
  grad.addColorStop(0.5, '#1a1a20');
  grad.addColorStop(1, '#0a0a0e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, -r);
  ctx.lineTo(w * 0.25, -r);
  ctx.quadraticCurveTo(w * 0.55, -r, w * 0.55, 0);
  ctx.quadraticCurveTo(w * 0.55, r, w * 0.25, r);
  ctx.lineTo(-w * 0.5, r);
  ctx.quadraticCurveTo(-w * 0.55, 0, -w * 0.5, -r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Metallischer Glanzstreifen oben (gibt der Kapsel Volumen).
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const sheen = ctx.createLinearGradient(0, -r, 0, 0);
  sheen.addColorStop(0, 'rgba(180,190,210,0.55)');
  sheen.addColorStop(1, 'rgba(180,190,210,0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.ellipse(-w * 0.08, -r * 0.5, w * 0.34, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Augen: weißes Feld, dunkle Pupille, Glanz.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(w * 0.18, -h * 0.18, 4, 0, Math.PI * 2);
  ctx.arc(w * 0.18, h * 0.18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(w * 0.2, -h * 0.18, 2, 0, Math.PI * 2);
  ctx.arc(w * 0.2, h * 0.18, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = this.getThemeAccent().glint;
  ctx.beginPath();
  ctx.arc(w * 0.16, -h * 0.20, 0.9, 0, Math.PI * 2);
  ctx.arc(w * 0.16, h * 0.16, 0.9, 0, Math.PI * 2);
  ctx.fill();
  // Großer fieser Smiley-Mund.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(w * 0.25, 0, w * 0.18, -Math.PI * 0.45, Math.PI * 0.45);
  ctx.lineTo(w * 0.4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Zähne (drei kurze Striche).
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.28 + i * 4, -w * 0.05);
    ctx.lineTo(w * 0.28 + i * 4, w * 0.05);
    ctx.stroke();
  }
  // „Stub-Arme" hinten dran als Silhouette.
  ctx.fillStyle = '#1a1a20';
  ctx.fillRect(-w * 0.2, -h * 0.35, 6, 8);
  ctx.fillRect(-w * 0.2, h * 0.27, 6, 8);
  ctx.restore();
}

// ===========================================================================
// Chargin' Chuck — Football-Spieler mit gelbem Helm + braunem Trikot.
// Im Charge-Modus blitzt der Helm rot, beim Stun-Stomp drückt sich der
// Helm visuell herunter.
// ===========================================================================
function drawCharginChuck(this: Renderer, x: number, y: number, w: number, h: number, direction: number, charging: boolean, hitsTaken: number, stunned: boolean, isDead: boolean, t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const flip = direction === -1 ? -1 : 1;
  ctx.save();
  if (isDead) {
    ctx.translate(cx, cy);
    ctx.scale(1, -1);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = 0.7;
  }
  ctx.translate(cx, cy);
  ctx.scale(flip, 1);
  // Speed-Lines wenn er rennt.
  if (charging && !stunned) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const off = (t * 0.6 + i * 8) % 30;
      ctx.beginPath();
      ctx.moveTo(w * 0.4 - off, -h * 0.2 + i * 6);
      ctx.lineTo(w * 0.55 - off, -h * 0.2 + i * 6);
      ctx.stroke();
    }
  }
  // Beine (rund, mit Verlauf, jiggeln im Lauf).
  const legPhase = Math.sin(t * (charging ? 0.6 : 0.3));
  for (const [lx, ph] of [[-5, legPhase], [5, -legPhase]] as const) {
    const legGrad = ctx.createLinearGradient(lx, h * 0.25, lx, h * 0.42);
    legGrad.addColorStop(0, '#6e4a28');
    legGrad.addColorStop(1, '#3e2814');
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.ellipse(lx, h * 0.33 + ph, 4, 9 + Math.abs(ph), 0, 0, Math.PI * 2);
    ctx.fill();
    // Schuh
    ctx.fillStyle = '#15151a';
    ctx.beginPath();
    ctx.ellipse(lx - 2, h * 0.42 + ph, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(lx - 3, h * 0.41 + ph, 2, 1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Trikot (braun).
  ctx.fillStyle = stunned ? '#7a5a3a' : '#8b4a20';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.05, w * 0.42, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a1a08';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Trikot-Nummer.
  ctx.fillStyle = '#f4d038';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.max(0, CHUCK_HITS_TO_KILL - hitsTaken)), 0, h * 0.1);
  // Arme.
  ctx.fillStyle = '#8b4a20';
  ctx.beginPath();
  ctx.ellipse(-w * 0.3, h * 0.05, 6, 12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.3, h * 0.05, 6, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Football in der vorderen Hand.
  ctx.fillStyle = '#6b3a1a';
  ctx.beginPath();
  ctx.ellipse(w * 0.4, h * 0.1, 6, 4, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.08);
  ctx.lineTo(w * 0.44, h * 0.12);
  ctx.stroke();
  // Kopf (hautfarbig).
  ctx.fillStyle = '#f0c89a';
  ctx.beginPath();
  ctx.arc(0, -h * 0.25, h * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a1a08';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Auge.
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(h * 0.05, -h * 0.27, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = this.getThemeAccent().glint;
  ctx.beginPath();
  ctx.arc(h * 0.06, -h * 0.29, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Helm (gelb, im Charge rot blinkend, beim Stun gedrückt).
  const helmDip = stunned ? 3 : 0;
  const helmColor = charging && !stunned && Math.floor(t * 0.3) % 2 === 0 ? '#ff4040' : '#f4d038';
  ctx.fillStyle = helmColor;
  ctx.beginPath();
  ctx.arc(0, -h * 0.3 + helmDip, h * 0.2, Math.PI, 0);
  ctx.lineTo(h * 0.2, -h * 0.25 + helmDip);
  ctx.lineTo(-h * 0.2, -h * 0.25 + helmDip);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a5a08';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Helm-Streifen (braun).
  ctx.strokeStyle = '#5a2a08';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.5 + helmDip);
  ctx.lineTo(0, -h * 0.25 + helmDip);
  ctx.stroke();
  // Helm-Schaden anzeigen (Kratzer).
  if (hitsTaken > 0) {
    ctx.strokeStyle = '#3a1a08';
    ctx.lineWidth = 1;
    for (let i = 0; i < hitsTaken; i++) {
      ctx.beginPath();
      ctx.moveTo(-h * 0.1 + i * 5, -h * 0.4 + helmDip);
      ctx.lineTo(-h * 0.05 + i * 5, -h * 0.32 + helmDip);
      ctx.stroke();
    }
  }
  ctx.restore();
}
// ===========================================================================
// Big Boo — riesiger weißer Geist mit pinker Zunge. Wenn `hidden`,
// hält er sich die Hände vors Gesicht und wird leicht transparent.
// Sonst grinst er fies und schwebt.
// ===========================================================================
function drawBigBoo(this: Renderer, x: number, y: number, w: number, h: number, direction: number, hidden: boolean, t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const flip = direction === -1 ? -1 : 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(flip, 1);
  ctx.globalAlpha = hidden ? 0.55 : 0.95;
  // Wabernder Schatten.
  const wob = Math.sin(t * 0.05) * 1.5;
  // Körper: weiße Wolke.
  const r = w * 0.42;
  const grad = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.7, '#f0f0f8');
  grad.addColorStop(1, '#c0c0d0');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  // unten gewellt wie ein Bettlaken
  for (let i = 0; i <= 6; i++) {
    const xx = r - (i / 6) * 2 * r;
    const yy = r * 0.9 + Math.sin(i * 1.4 + t * 0.1) * 4 + wob;
    ctx.lineTo(xx, yy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a7a90';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Wangenrouge.
  ctx.fillStyle = 'rgba(255, 150, 180, 0.4)';
  ctx.beginPath();
  ctx.arc(-r * 0.45, r * 0.05, 6, 0, Math.PI * 2);
  ctx.arc(r * 0.45, r * 0.05, 6, 0, Math.PI * 2);
  ctx.fill();
  if (hidden) {
    // Hände vors Gesicht — zwei Halbkreise.
    ctx.fillStyle = '#f0f0f8';
    ctx.strokeStyle = '#7a7a90';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.15, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.25, -r * 0.15, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Verschämtes geschlossenes Auge zwischen den Händen.
    ctx.strokeStyle = '#3a3a50';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, 3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else {
    // Augen — fies grinsend, etwas zur Spielerseite gerichtet.
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.25, 4.5, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.25, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Glanzlicht.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.27, 1.3, 0, Math.PI * 2);
    ctx.arc(r * 0.32, -r * 0.27, 1.3, 0, Math.PI * 2);
    ctx.fill();
    // Mund mit Zähnen + Zunge.
    ctx.fillStyle = '#3a1a30';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05, r * 0.3, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6090';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.12, r * 0.18, r * 0.08, 0, 0, Math.PI);
    ctx.fill();
    // Zwei Zähne oben.
    ctx.fillStyle = '#fff';
    ctx.fillRect(-r * 0.12, r * 0.0, 4, 5);
    ctx.fillRect(r * 0.08, r * 0.0, 4, 5);
  }
  ctx.restore();
}

export const enemiesExtraMethods = {
  drawPiranhaPlant,
  getCachedSpiderBody,
  drawSpider,
  drawCrab,
  drawJellyfish,
  drawKangaroo,
  drawSnake,
  drawWizard,
  drawMagicBolt,
  drawBombOmb,
  drawBombExplosion,
  drawSpikeBall,
  drawHornet,
  drawBanzaiBill,
  drawCharginChuck,
  drawBigBoo,
  drawApe,
  drawWindupSignal,
  drawSeagull,
  drawLavaSlime,
  drawYeti,
  drawKnight,
  drawMiniUFO,
  drawCoconut,
  drawSnowball,
  drawUFOLaser,
  drawDragonEgg,
  drawBabyDragon,
};

// --- Drachen-Ei (Welt 16): geflecktes Ei, wackelt, bekommt kurz vor dem
// Schlüpfen Risse und ein grünes Glühen. ---------------------------------
function drawDragonEgg(this: Renderer, x: number, y: number, w: number, h: number, cracking: boolean, crackTimer: number, t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const wob = cracking ? Math.sin(t * 0.6) * 2.2 : Math.sin(t * 0.06) * 0.8;
  ctx.save();
  ctx.translate(cx + wob, 0);
  // Bodenschatten.
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(0, y + h, w * 0.4, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Ei-Körper (Verlauf grün-creme).
  const g = ctx.createRadialGradient(-w * 0.15, y + h * 0.35, 2, 0, y + h * 0.55, w * 0.6);
  g.addColorStop(0, '#eaf7e0'); g.addColorStop(0.6, '#b9e0a0'); g.addColorStop(1, '#7bb85e');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, y + h * 0.55, w * 0.42, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  // Sprenkel.
  ctx.fillStyle = 'rgba(60,110,40,0.55)';
  for (const [sx, sy, r] of [[-4,0.4,2],[3,0.55,2.4],[-2,0.72,1.6],[5,0.32,1.4]] as [number,number,number][]) {
    ctx.beginPath(); ctx.arc(sx, y + h * sy, r, 0, Math.PI * 2); ctx.fill();
  }
  // Glanz.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.ellipse(-w * 0.16, y + h * 0.34, 2.4, 4, -0.4, 0, Math.PI * 2); ctx.fill();
  if (cracking) {
    // Risse + warm-grünes Glühen, das mit dem Timer wächst.
    const p = Math.min(1, crackTimer / 26);
    ctx.strokeStyle = 'rgba(40,30,10,0.75)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, y + h * 0.35);
    ctx.lineTo(-2, y + h * 0.5); ctx.lineTo(-w * 0.12, y + h * 0.62);
    ctx.lineTo(3, y + h * 0.72);
    ctx.stroke();
    ctx.fillStyle = `rgba(150,255,150,${0.25 * p})`;
    ctx.beginPath(); ctx.ellipse(0, y + h * 0.55, w * 0.5, h * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// --- Baby-Drache (Welt 16): kleiner grüner Drache mit Flügelchen. ---------
function drawBabyDragon(this: Renderer, x: number, y: number, w: number, h: number, direction: number, isDead: boolean, hatchPop: number, t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2, cy = y + h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (direction === 1) ctx.scale(-1, 1);   // Sprite blickt standardmäßig nach links
  if (isDead) ctx.scale(1, -1);
  const pop = hatchPop > 0 ? 1 + hatchPop * 0.03 : 1;
  ctx.scale(pop, pop);
  const flap = Math.sin(t * 0.4) * 0.5;
  // Flügel (hinter dem Körper).
  ctx.fillStyle = '#5aa84a';
  for (const s of [-1, 1]) {
    ctx.save(); ctx.scale(s, 1);
    ctx.beginPath();
    ctx.moveTo(w * 0.1, -2);
    ctx.quadraticCurveTo(w * 0.42, -h * (0.32 + flap * 0.2), w * 0.38, h * 0.05);
    ctx.quadraticCurveTo(w * 0.24, h * 0.02, w * 0.1, h * 0.04);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Körper (hellgrüner Verlauf).
  const body = ctx.createRadialGradient(-w * 0.1, -2, 2, 0, 0, w * 0.5);
  body.addColorStop(0, '#c8f39a'); body.addColorStop(0.6, '#8fd66a'); body.addColorStop(1, '#5fae44');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, h * 0.06, w * 0.36, h * 0.34, 0, 0, Math.PI * 2); ctx.fill();
  // Bauch.
  ctx.fillStyle = '#eaf7c8';
  ctx.beginPath(); ctx.ellipse(-w * 0.02, h * 0.14, w * 0.2, h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  // Kopf.
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(-w * 0.18, -h * 0.16, w * 0.26, 0, Math.PI * 2); ctx.fill();
  // Rückenzacken.
  ctx.fillStyle = '#3f8a30';
  for (const dx of [0.02, 0.16, 0.3]) {
    ctx.beginPath();
    ctx.moveTo(w * dx, -h * 0.2); ctx.lineTo(w * (dx + 0.08), -h * 0.36); ctx.lineTo(w * (dx + 0.12), -h * 0.16);
    ctx.closePath(); ctx.fill();
  }
  // Auge.
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-w * 0.26, -h * 0.2, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.arc(-w * 0.27, -h * 0.19, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-w * 0.28, -h * 0.22, 0.7, 0, Math.PI * 2); ctx.fill();
  // Kleine Schnauze + Nasenloch.
  ctx.fillStyle = '#6fbb50';
  ctx.beginPath(); ctx.ellipse(-w * 0.36, -h * 0.12, w * 0.1, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2f6a24';
  ctx.beginPath(); ctx.arc(-w * 0.42, -h * 0.13, 1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ===========================================================================
// Theme-Gegner Sprites (Task #18) — Affe, Möwe, Lava-Slime, Yeti, Ritter,
// Mini-UFO + ihre Projektile (Kokosnuss, Schneeball, Laser).
// ===========================================================================

// Wiederverwendbares Telegraphing-Signal (v404): pulsierendes rotes Glühen +
// „!" über dem Kopf während der Windup-Phase eines angreifenden Gegners.
function drawWindupSignal(this: Renderer, x: number, y: number, w: number, h: number, windupTimer: number, t: number) {
  if (windupTimer <= 0) return;
  const ctx = this.ctx;
  const prog = Math.min(1, 1 - windupTimer / 18);   // 0 → 1 (lädt auf)
  const cx = x + w / 2, cy = y + h / 2;
  const blink = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.5));
  ctx.save();
  const R = w * (0.6 + prog * 0.55);
  const gr = ctx.createRadialGradient(cx, cy, w * 0.18, cx, cy, R);
  gr.addColorStop(0, 'rgba(255,140,90,0)');
  gr.addColorStop(0.6, `rgba(255,140,90,${(0.10 + 0.16 * prog) * blink})`);
  gr.addColorStop(1, 'rgba(255,140,90,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.font = `bold ${Math.round(14 + prog * 7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(255,80,55,${blink})`;
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 3;
  ctx.fillText('!', cx, y - 5 - prog * 3);
  ctx.restore();
}

function drawApe(this: Renderer, x: number, y: number, w: number, h: number, direction: number, isDead: boolean, t: number, windupTimer = 0) {
  this.drawWindupSignal(x, y, w, h, windupTimer, t);
  const ctx = this.ctx;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (direction === 1) ctx.scale(-1, 1);
  if (isDead) ctx.rotate(Math.PI);

  const furD = '#4a2e14';
  const furM = '#6e4421';
  const skin = '#d9aa78';
  const skinDk = '#b9854f';

  // Bodenschatten
  if (!isDead) {
    softShadowEllipse(ctx, 0, h * 0.46, w * 0.36, 3, this.getThemeAccent().shadow);
  }

  // ── Hinterer (ruhender) Arm ──
  ctx.fillStyle = furD;
  ctx.beginPath();
  ctx.ellipse(-w * 0.32, h * 0.06, w * 0.1, h * 0.2, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-w * 0.34, h * 0.26, w * 0.08, 0, Math.PI * 2); // Hand
  ctx.fill();

  // ── Beine ──
  ctx.fillStyle = furM;
  for (const lx of [-w * 0.18, w * 0.12]) {
    ctx.beginPath();
    ctx.ellipse(lx, h * 0.34, w * 0.12, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = furD;
    ctx.beginPath();
    ctx.ellipse(lx + w * 0.04, h * 0.42, w * 0.1, h * 0.05, 0, 0, Math.PI * 2); // Fuß
    ctx.fill();
    ctx.fillStyle = furM;
  }

  // ── Körper (Fell-Verlauf) ──
  const bodyGrad = ctx.createRadialGradient(-w * 0.1, -h * 0.05, 2, 0, h * 0.06, w * 0.5);
  bodyGrad.addColorStop(0, '#7e5028');
  bodyGrad.addColorStop(0.6, furM);
  bodyGrad.addColorStop(1, furD);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.08, w * 0.42, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  // Heller Bauch
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.14, w * 0.24, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Kopf ──
  const headX = -w * 0.04;
  const headY = -h * 0.2;
  const headGrad = ctx.createRadialGradient(headX - 3, headY - 3, 1, headX, headY, w * 0.36);
  headGrad.addColorStop(0, '#7e5028');
  headGrad.addColorStop(0.7, furM);
  headGrad.addColorStop(1, furD);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(headX, headY, w * 0.32, 0, Math.PI * 2);
  ctx.fill();
  // Ohren
  ctx.fillStyle = furM;
  for (const ex of [-w * 0.3, w * 0.22]) {
    ctx.beginPath();
    ctx.arc(headX + ex, headY, w * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skinDk;
    ctx.beginPath();
    ctx.arc(headX + ex, headY, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = furM;
  }
  // Helles Gesicht (Maske)
  const faceGrad = ctx.createRadialGradient(headX, headY + h * 0.02, 1, headX, headY + h * 0.04, w * 0.24);
  faceGrad.addColorStop(0, '#e8bd8c');
  faceGrad.addColorStop(1, skinDk);
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(headX, headY + h * 0.05, w * 0.2, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Brauenwulst
  ctx.fillStyle = skinDk;
  ctx.beginPath();
  ctx.ellipse(headX, headY - h * 0.04, w * 0.18, h * 0.06, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  if (isDead) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.6;
    for (const ex of [-w * 0.09, w * 0.05]) {
      ctx.beginPath();
      ctx.moveTo(headX + ex - 2.5, headY - 2.5);
      ctx.lineTo(headX + ex + 2.5, headY + 2.5);
      ctx.moveTo(headX + ex + 2.5, headY - 2.5);
      ctx.lineTo(headX + ex - 2.5, headY + 2.5);
      ctx.stroke();
    }
  } else {
    // Augen
    for (const ex of [-w * 0.09, w * 0.05]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(headX + ex, headY - h * 0.01, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a0e00';
      ctx.beginPath();
      ctx.arc(headX + ex + w * 0.015, headY, w * 0.032, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(headX + ex + w * 0.03, headY - h * 0.02, w * 0.013, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wütende Brauen
    ctx.strokeStyle = '#2a1808';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headX - w * 0.16, headY - h * 0.07);
    ctx.lineTo(headX - w * 0.03, headY - h * 0.03);
    ctx.moveTo(headX + w * 0.13, headY - h * 0.07);
    ctx.lineTo(headX + w * 0.02, headY - h * 0.03);
    ctx.stroke();
    // Nasenlöcher
    ctx.fillStyle = skinDk;
    ctx.beginPath();
    ctx.arc(headX - w * 0.03, headY + h * 0.07, 1, 0, Math.PI * 2);
    ctx.arc(headX + w * 0.03, headY + h * 0.07, 1, 0, Math.PI * 2);
    ctx.fill();
    // Mund (Zähne fletschend)
    ctx.fillStyle = '#3a1d0c';
    ctx.beginPath();
    ctx.ellipse(headX, headY + h * 0.12, w * 0.1, h * 0.04, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(headX - w * 0.06, headY + h * 0.1, w * 0.04, h * 0.025);
    ctx.fillRect(headX + w * 0.02, headY + h * 0.1, w * 0.04, h * 0.025);
  }

  // ── Vorderer Wurfarm (animiert) ──
  const armUp = Math.sin(t * 0.15) > 0.6;
  ctx.fillStyle = furM;
  ctx.beginPath();
  if (armUp) {
    ctx.ellipse(w * 0.3, -h * 0.22, w * 0.1, h * 0.2, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = furD;
    ctx.beginPath();
    ctx.arc(w * 0.36, -h * 0.36, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.ellipse(w * 0.32, h * 0.04, w * 0.1, h * 0.2, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = furD;
    ctx.beginPath();
    ctx.arc(w * 0.34, h * 0.22, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSeagull(this: Renderer, x: number, y: number, w: number, h: number, direction: number, diving: boolean, isDead: boolean, t: number) {
  const ctx = this.ctx;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (direction === 1) ctx.scale(-1, 1);
  if (isDead) ctx.rotate(Math.PI);
  if (diving) ctx.rotate(-0.4);

  if (this.currentTheme === 'school') {
    // Papierflieger: weißes Delta mit gegabeltem Heck und Faltkante.
    const hw = w * 0.5, hh = h * 0.4;
    const bob = Math.sin(t * 0.08) * hh * 0.12;
    ctx.translate(0, bob);
    ctx.fillStyle = '#f4f4fa';
    ctx.beginPath();
    ctx.moveTo(hw, 0);
    ctx.lineTo(-hw, -hh);
    ctx.lineTo(-hw * 0.3, 0);
    ctx.lineTo(-hw, hh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d6dce8';
    ctx.beginPath();
    ctx.moveTo(hw, 0);
    ctx.lineTo(-hw, -hh);
    ctx.lineTo(-hw * 0.3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#aab2c6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hw, 0); ctx.lineTo(-hw * 0.3, 0); ctx.stroke();
    ctx.restore();
    return;
  }

  const wing = Math.sin(t * (diving ? 0.4 : 0.2)) * 0.6;
  const wingGrey = '#c6ccd6';
  const wingTip = '#2c2f3a';

  // Ein Flügel (wiederverwendbar) — grau mit schwarzer Spitze + Federkante.
  const paintWing = (lift: number, back: boolean) => {
    ctx.save();
    ctx.fillStyle = back ? '#aab0bc' : wingGrey;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.02);
    ctx.quadraticCurveTo(-w * 0.26, -h * 0.34 - lift * 6, -w * 0.5, -h * 0.06 - lift * 2);
    ctx.quadraticCurveTo(-w * 0.3, -h * 0.02, -w * 0.04, h * 0.12);
    ctx.closePath();
    ctx.fill();
    // schwarze Flügelspitze
    ctx.fillStyle = wingTip;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h * 0.06 - lift * 2);
    ctx.quadraticCurveTo(-w * 0.4, -h * 0.02, -w * 0.32, h * 0.04);
    ctx.quadraticCurveTo(-w * 0.42, -h * 0.02, -w * 0.5, -h * 0.06 - lift * 2);
    ctx.fill();
    // Federkante
    ctx.strokeStyle = 'rgba(90,96,110,0.5)';
    ctx.lineWidth = 0.7;
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-w * 0.1 * k, -h * 0.04 - lift * k);
      ctx.lineTo(-w * 0.1 * k - w * 0.05, h * 0.06);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Schwanz (hinten)
  ctx.fillStyle = '#e8e8ee';
  ctx.beginPath();
  ctx.moveTo(w * 0.26, -h * 0.04);
  ctx.lineTo(w * 0.5, -h * 0.12);
  ctx.lineTo(w * 0.52, h * 0.04);
  ctx.lineTo(w * 0.26, h * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = wingTip;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, -h * 0.12);
  ctx.lineTo(w * 0.52, h * 0.04);
  ctx.lineTo(w * 0.44, h * 0.0);
  ctx.closePath();
  ctx.fill();

  // Hinterer Flügel (hinter dem Körper)
  paintWing(wing * 0.7, true);

  // Körper (weiß, sanfter Verlauf)
  const bodyGrad = ctx.createLinearGradient(0, -h * 0.4, 0, h * 0.42);
  bodyGrad.addColorStop(0, '#ffffff');
  bodyGrad.addColorStop(1, '#d6d8e0');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.36, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Vorderer Flügel (über dem Körper, aber UNTER dem Kopf)
  paintWing(wing, false);

  // Kopf (vorne, liegt über dem Flügel)
  const headGrad = ctx.createRadialGradient(-w * 0.32, -h * 0.16, 1, -w * 0.3, -h * 0.12, h * 0.28);
  headGrad.addColorStop(0, '#ffffff');
  headGrad.addColorStop(1, '#e2e4ec');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(-w * 0.3, -h * 0.12, h * 0.24, 0, Math.PI * 2);
  ctx.fill();

  // Schnabel (gelb, zweiteilig, roter Punkt)
  ctx.fillStyle = '#ffc233';
  ctx.beginPath();
  ctx.moveTo(-w * 0.44, -h * 0.16);
  ctx.lineTo(-w * 0.62, -h * 0.08);
  ctx.lineTo(-w * 0.44, -h * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c8901a';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-w * 0.44, -h * 0.1);
  ctx.lineTo(-w * 0.6, -h * 0.08);
  ctx.stroke();
  // roter Punkt (Möwen-Merkmal)
  ctx.fillStyle = '#e8401e';
  ctx.beginPath();
  ctx.arc(-w * 0.54, -h * 0.06, 1.4, 0, Math.PI * 2);
  ctx.fill();

  if (isDead) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.4;
    const ex = -w * 0.34, ey = -h * 0.17;
    ctx.beginPath();
    ctx.moveTo(ex - 2.5, ey - 2.5); ctx.lineTo(ex + 2.5, ey + 2.5);
    ctx.moveTo(ex + 2.5, ey - 2.5); ctx.lineTo(ex - 2.5, ey + 2.5);
    ctx.stroke();
  } else {
    // Auge (ausdrucksstark)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-w * 0.34, -h * 0.17, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#100c10';
    ctx.beginPath();
    ctx.arc(-w * 0.345, -h * 0.165, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(-w * 0.33, -h * 0.2, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawLavaSlime(this: Renderer, x: number, y: number, w: number, h: number, squish: number, isDead: boolean, t: number) {
  const ctx = this.ctx;
  ctx.save();
  ctx.translate(x + w / 2, y + h);
  const sq = squish / 8;
  const sx = 1 + sq * 0.3;
  const sy = isDead ? 0.4 : 1 - sq * 0.3;
  ctx.scale(sx, sy);
  // Lava-Slime: orange-rot mit Glüh-Pulse.
  const pulse = 0.7 + Math.sin(t * 0.15) * 0.3;
  const grad = ctx.createRadialGradient(0, -h * 0.4, 2, 0, -h * 0.4, w * 0.5);
  grad.addColorStop(0, `rgba(255, 240, 100, ${0.95 * pulse})`);
  grad.addColorStop(0.6, `rgba(255, 120, 30, 0.95)`);
  grad.addColorStop(1, `rgba(180, 30, 10, 1)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, 0);
  ctx.quadraticCurveTo(-w * 0.55, -h * 0.85, 0, -h * 0.95);
  ctx.quadraticCurveTo(w * 0.55, -h * 0.85, w * 0.5, 0);
  ctx.closePath();
  ctx.fill();
  // Highlight tropfen oben.
  ctx.fillStyle = `rgba(255, 250, 200, ${0.6 * pulse})`;
  ctx.beginPath();
  ctx.ellipse(-w * 0.10, -h * 0.7, 4, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Augen — rund mit Glanzpunkt (statt Pixel-Quadrate).
  for (const ex of [-w * 0.18, w * 0.12]) {
    ctx.fillStyle = 'rgba(26,5,0,0.95)';
    ctx.beginPath(); ctx.arc(ex, -h * 0.55, 3.0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex - 0.9, -h * 0.57, 1.0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawYeti(this: Renderer, x: number, y: number, w: number, h: number, direction: number, hitsTaken: number, stunned: boolean, isDead: boolean, t: number, windupTimer = 0) {
  const ctx = this.ctx;
  if (!isDead) this.drawWindupSignal(x, y, w, h, windupTimer, t);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (direction === 1) ctx.scale(-1, 1);
  if (isDead) ctx.rotate(Math.PI);
  const acc = this.getThemeAccent();
  // Körper: weiß-fluffig mit weichem Volumen-Verlauf (statt Flachfüllung).
  const base = stunned ? '#ffe0e0' : '#f8fbff';
  const shade = stunned ? '#e9b8c0' : '#c9dcf0';
  const bodyGrad = ctx.createRadialGradient(-w * 0.12, -h * 0.24, 2, 0, 0, w * 0.64);
  bodyGrad.addColorStop(0, '#ffffff');
  bodyGrad.addColorStop(0.55, base);
  bodyGrad.addColorStop(1, shade);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 4, w * 0.46, h * 0.40, 0, 0, Math.PI * 2);   // Körper
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -h * 0.22, w * 0.36, 0, Math.PI * 2);            // Kopf
  ctx.fill();
  // Rim-Light entlang der oberen Kontur (Welt-Akzent).
  ctx.strokeStyle = acc.rim; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -h * 0.22, w * 0.36, Math.PI * 1.06, Math.PI * 1.9); ctx.stroke();
  // Bauch — leicht bläulich, mit weichem Verlauf.
  const bellyGrad = ctx.createRadialGradient(0, h * 0.04, 1, 0, h * 0.10, w * 0.28);
  bellyGrad.addColorStop(0, '#eef6ff'); bellyGrad.addColorStop(1, '#cfe2f4');
  ctx.fillStyle = bellyGrad;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.10, w * 0.24, h * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Augen — rund, mit dunkler Pupille + Glanzpunkt.
  for (const ex of [-w * 0.16, w * 0.12]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex, -h * 0.26, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1040';
    ctx.beginPath(); ctx.arc(ex + 0.6, -h * 0.26, 2.0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = acc.glint;
    ctx.beginPath(); ctx.arc(ex - 0.8, -h * 0.28, 0.9, 0, Math.PI * 2); ctx.fill();
  }
  // Hörner — schwarz.
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.moveTo(-w * 0.22, -h * 0.42);
  ctx.lineTo(-w * 0.28, -h * 0.58);
  ctx.lineTo(-w * 0.16, -h * 0.46);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.22, -h * 0.42);
  ctx.lineTo(w * 0.28, -h * 0.58);
  ctx.lineTo(w * 0.16, -h * 0.46);
  ctx.fill();
  // Mund.
  ctx.fillStyle = '#3a1020';
  ctx.fillRect(-4, -h * 0.14, 8, 4);
  // Zähne weiß.
  ctx.fillStyle = '#fff';
  ctx.fillRect(-3, -h * 0.14, 2, 3);
  ctx.fillRect(2, -h * 0.14, 2, 3);
  // Schadensanzeige: Riss bei 1 Treffer.
  if (hitsTaken >= 1 && !isDead) {
    ctx.strokeStyle = '#a00';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(w * 0.10, -h * 0.10);
    ctx.lineTo(w * 0.20, h * 0.05);
    ctx.lineTo(w * 0.05, h * 0.20);
    ctx.stroke();
  }
  // Wurfarm hochgezogen periodisch.
  const armUp = Math.sin(t * 0.12) > 0.5 && !stunned;
  ctx.fillStyle = stunned ? '#ffe0e0' : '#f8fbff';
  ctx.beginPath();
  if (armUp) {
    ctx.ellipse(w * 0.36, -h * 0.30, w * 0.10, h * 0.18, 0.5, 0, Math.PI * 2);
  } else {
    ctx.ellipse(w * 0.40, h * 0.05, w * 0.10, h * 0.18, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function drawKnight(this: Renderer, x: number, y: number, w: number, h: number, direction: number, hitsTaken: number, stunned: boolean, blocking: boolean, isDead: boolean, t: number) {
  const ctx = this.ctx;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (direction === 1) ctx.scale(-1, 1);
  if (isDead) ctx.rotate(Math.PI);

  // Metall-Tönung je nach Zustand.
  const tint = stunned ? 30 : (hitsTaken >= 1 ? -14 : 0);
  const steel = (l: number) => {
    const v = Math.max(0, Math.min(255, l + tint));
    const r = stunned ? v + 18 : v;
    return `rgb(${Math.min(255, r)},${v},${Math.min(255, v + 12)})`;
  };
  const metalGrad = (x0: number, y0: number, x1: number, y1: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, steel(210));
    g.addColorStop(0.45, steel(150));
    g.addColorStop(0.75, steel(96));
    g.addColorStop(1, steel(60));
    return g;
  };

  // Bodenschatten
  if (!isDead) {
    softShadowEllipse(ctx, 0, h * 0.46, w * 0.34, 3, this.getThemeAccent().shadow);
  }

  // Schwert (Rückhand, hinten)
  ctx.save();
  ctx.translate(-w * 0.34, -h * 0.02);
  ctx.rotate(-0.25);
  const blade = ctx.createLinearGradient(-2, -h * 0.4, 2, h * 0.1);
  blade.addColorStop(0, '#f2f4ff'); blade.addColorStop(0.5, '#c4c8dc'); blade.addColorStop(1, '#888ca4');
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.42); ctx.lineTo(2.5, -h * 0.36); ctx.lineTo(2.5, h * 0.06); ctx.lineTo(-2.5, h * 0.06); ctx.lineTo(-2.5, -h * 0.36);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c8a032'; ctx.fillRect(-6, h * 0.06, 12, 3);          // Parierstange (gold)
  ctx.fillStyle = '#6a4420'; ctx.fillRect(-2, h * 0.09, 4, h * 0.12);     // Griff
  ctx.fillStyle = '#c8a032'; ctx.beginPath(); ctx.arc(0, h * 0.21, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Beine (Panzerschienen + Stiefel)
  for (const lx of [-w * 0.16, w * 0.08]) {
    ctx.fillStyle = metalGrad(lx, h * 0.3, lx, h * 0.48);
    ctx.beginPath();
    ctx.moveTo(lx - w * 0.07, h * 0.3); ctx.lineTo(lx + w * 0.07, h * 0.3);
    ctx.lineTo(lx + w * 0.06, h * 0.44); ctx.lineTo(lx - w * 0.06, h * 0.44); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#33343c';
    ctx.beginPath(); ctx.ellipse(lx + w * 0.02, h * 0.46, w * 0.09, h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Brustpanzer (geformt, mit Mittelgrat)
  ctx.fillStyle = metalGrad(-w * 0.3, -h * 0.12, w * 0.3, h * 0.4);
  ctx.beginPath();
  ctx.moveTo(-w * 0.26, -h * 0.08);
  ctx.quadraticCurveTo(-w * 0.34, h * 0.16, -w * 0.18, h * 0.36);
  ctx.lineTo(w * 0.18, h * 0.36);
  ctx.quadraticCurveTo(w * 0.34, h * 0.16, w * 0.26, -h * 0.08);
  ctx.quadraticCurveTo(0, -h * 0.02, -w * 0.26, -h * 0.08);
  ctx.closePath();
  ctx.fill();
  // Mittelgrat + Bauchplatten
  ctx.strokeStyle = 'rgba(40,42,55,0.55)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, -h * 0.02); ctx.lineTo(0, h * 0.34); ctx.stroke();
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, h * (0.04 + i * 0.1));
    ctx.quadraticCurveTo(0, h * (0.1 + i * 0.1), w * 0.2, h * (0.04 + i * 0.1));
    ctx.stroke();
  }
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(-w * 0.12, h * 0.04, w * 0.07, h * 0.12, 0.2, 0, Math.PI * 2); ctx.fill();

  // Schulterplatten
  for (const sx of [-w * 0.28, w * 0.28]) {
    ctx.fillStyle = metalGrad(sx, -h * 0.14, sx, h * 0.02);
    ctx.beginPath(); ctx.ellipse(sx, -h * 0.06, w * 0.13, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,42,55,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // Helm
  ctx.fillStyle = metalGrad(0, -h * 0.42, 0, -h * 0.04);
  ctx.beginPath(); ctx.ellipse(0, -h * 0.2, w * 0.28, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  // Visier-Spalt mit glühenden Augen
  ctx.fillStyle = '#0e0a14';
  ctx.beginPath(); ctx.ellipse(0, -h * 0.2, w * 0.2, h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  if (!isDead && !stunned) {
    ctx.fillStyle = '#ff5a3a';
    ctx.beginPath(); ctx.arc(-w * 0.08, -h * 0.2, 1.6, 0, Math.PI * 2); ctx.arc(w * 0.06, -h * 0.2, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  // Helm-Nietreihe
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * w * 0.1, -h * 0.31, 1, 0, Math.PI * 2); ctx.fill(); }
  // Plume (rot, geschwungen)
  ctx.fillStyle = stunned ? '#d88' : '#cc2030';
  ctx.beginPath();
  ctx.moveTo(-w * 0.04, -h * 0.4);
  ctx.quadraticCurveTo(-w * 0.16, -h * 0.62, -w * 0.02, -h * 0.66);
  ctx.quadraticCurveTo(w * 0.08, -h * 0.56, w * 0.04, -h * 0.4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.ellipse(-w * 0.04, -h * 0.52, w * 0.03, h * 0.06, -0.3, 0, Math.PI * 2); ctx.fill();

  // SCHILD (Vorderseite) — leuchtet beim Block
  const shieldGlow = blocking ? Math.sin(t * 0.6) * 0.4 + 0.7 : 0;
  const shg = ctx.createLinearGradient(w * 0.3, -h * 0.06, w * 0.48, h * 0.3);
  shg.addColorStop(0, `rgb(${170 + shieldGlow * 80},${175 + shieldGlow * 80},${210 + shieldGlow * 45})`);
  shg.addColorStop(1, '#5a6080');
  ctx.fillStyle = shg;
  ctx.strokeStyle = '#33384f'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(w * 0.28, -h * 0.1); ctx.lineTo(w * 0.5, -h * 0.06);
  ctx.lineTo(w * 0.48, h * 0.2); ctx.lineTo(w * 0.38, h * 0.34); ctx.lineTo(w * 0.28, h * 0.2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Wappen (rotes Kreuz)
  ctx.fillStyle = '#cc2030';
  ctx.fillRect(w * 0.37, -h * 0.02, 3, h * 0.22);
  ctx.fillRect(w * 0.31, h * 0.06, w * 0.15, 3);

  if (hitsTaken >= 1 && !isDead) {
    ctx.strokeStyle = '#2a0a0a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-w * 0.08, h * 0.02); ctx.lineTo(-w * 0.03, h * 0.18); ctx.lineTo(-w * 0.14, h * 0.28); ctx.stroke();
  }

  ctx.restore();
}

function drawMiniUFO(this: Renderer, x: number, y: number, w: number, h: number, direction: number, isDead: boolean, t: number) {
  const ctx = this.ctx;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (isDead) ctx.rotate(Math.PI);
  // Untertasse: silber-grau.
  const body = ctx.createLinearGradient(0, -h * 0.2, 0, h * 0.2);
  body.addColorStop(0, '#e0e0f0');
  body.addColorStop(0.5, '#b0b0c8');
  body.addColorStop(1, '#606078');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.48, h * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();
  // Kuppel oben — cyan-glühend.
  const dome = ctx.createRadialGradient(0, -h * 0.1, 1, 0, -h * 0.1, w * 0.20);
  dome.addColorStop(0, 'rgba(180, 240, 255, 1)');
  dome.addColorStop(1, 'rgba(40, 120, 200, 0.85)');
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(0, -h * 0.05, w * 0.20, Math.PI, Math.PI * 2);
  ctx.fill();
  // Außerirdischer im Inneren — kleiner grüner Kopf.
  ctx.fillStyle = '#60c060';
  ctx.beginPath();
  ctx.arc(direction === 1 ? 3 : -3, -h * 0.10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.fillRect(direction === 1 ? 2 : -4, -h * 0.12, 4, 1);
  // Pulsierende Lichter unten.
  for (let i = -2; i <= 2; i++) {
    const phase = t * 0.2 + i * 0.5;
    const bright = (Math.sin(phase) + 1) / 2;
    ctx.fillStyle = `rgba(255, ${100 + bright * 155}, ${50 + bright * 100}, ${0.6 + bright * 0.4})`;
    ctx.fillRect(i * w * 0.12 - 2, h * 0.18, 3, 3);
  }
  ctx.restore();
}

function drawCoconut(this: Renderer, x: number, y: number, w: number, h: number, spin: number) {
  const ctx = this.ctx;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(spin);
  // Kokosnuss: braun mit Faserstruktur.
  ctx.fillStyle = '#5a3a18';
  ctx.beginPath();
  ctx.arc(0, 0, w / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  // Faserdetails.
  ctx.strokeStyle = '#3a2010';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2);
    ctx.lineTo(Math.cos(a) * (w / 2 - 2), Math.sin(a) * (w / 2 - 2));
    ctx.stroke();
  }
  // 3 Augen — typische Kokos-Punkte.
  ctx.fillStyle = '#1a0500';
  ctx.fillRect(-3, -3, 2, 2);
  ctx.fillRect(2, -3, 2, 2);
  ctx.fillRect(-1, 2, 2, 2);
  ctx.restore();
}

function drawSnowball(this: Renderer, x: number, y: number, w: number, h: number, spin: number) {
  const ctx = this.ctx;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(spin);
  // Schneeball weiß mit hellblauem Schatten.
  const grad = ctx.createRadialGradient(-w * 0.15, -h * 0.15, 1, 0, 0, w / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.7, '#e8f0ff');
  grad.addColorStop(1, '#a8c0e0');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, w / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  // Eis-Funkeln.
  ctx.fillStyle = '#fff';
  ctx.fillRect(-w * 0.20, -w * 0.10, 2, 2);
  ctx.fillRect(w * 0.10, w * 0.05, 1, 1);
  ctx.restore();
}

function drawUFOLaser(this: Renderer, x: number, y: number, w: number, h: number, t: number) {
  const ctx = this.ctx;
  ctx.save();
  // Vertikaler Laserstrahl: helles Pink mit Glow.
  const flicker = 0.7 + Math.sin(t * 0.6) * 0.3;
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, `rgba(255, 80, 180, ${0.2 * flicker})`);
  grad.addColorStop(0.5, `rgba(255, 200, 240, ${flicker})`);
  grad.addColorStop(1, `rgba(255, 80, 180, ${0.2 * flicker})`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  // Glühender Kern.
  ctx.fillStyle = `rgba(255, 255, 255, ${flicker})`;
  ctx.fillRect(x + w / 2 - 1, y, 2, h);
  ctx.restore();
}
