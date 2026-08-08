import type { Renderer } from '../renderer.ts';
import { Camera } from '../camera.ts';
import { TILE_SIZE, TileType } from '../constants.ts';
import { pseudoRandom } from '../util/random';

// ── HUD-Icon-Helfer (kompakt, gut lesbar) ───────────────────────────────────
function hudHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.32);
  ctx.bezierCurveTo(cx, cy - s * 0.2, cx - s, cy - s * 0.3, cx - s, cy + s * 0.05);
  ctx.bezierCurveTo(cx - s, cy + s * 0.5, cx - s * 0.4, cy + s * 0.8, cx, cy + s);
  ctx.bezierCurveTo(cx + s * 0.4, cy + s * 0.8, cx + s, cy + s * 0.5, cx + s, cy + s * 0.05);
  ctx.bezierCurveTo(cx + s, cy - s * 0.3, cx, cy - s * 0.2, cx, cy + s * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.35, cy - s * 0.02, s * 0.22, s * 0.16, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function hudStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? s : s * 0.45;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(cx - s * 0.2, cy - s * 0.2, s * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function hudClock(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - s * 0.6);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + s * 0.5, cy + s * 0.15);
  ctx.stroke();
  ctx.restore();
}

function drawHUD(this: Renderer, lives: number, coins: number, score: number, time: number) {
  const ctx = this.ctx;
  const W = this.viewportW;

  // Dezenter, moderner Verlauf-Hintergrund (gecacht).
  if (!this.hudBgCache || this.hudBgWidth !== W) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = 54;
    const hctx = c.getContext('2d')!;
    const g = hctx.createLinearGradient(0, 0, 0, 54);
    g.addColorStop(0, 'rgba(8,10,20,0.55)');
    g.addColorStop(0.7, 'rgba(8,10,20,0.16)');
    g.addColorStop(1, 'rgba(8,10,20,0)');
    hctx.fillStyle = g;
    hctx.fillRect(0, 0, W, 54);
    this.hudBgCache = c;
    this.hudBgWidth = W;
  }
  ctx.drawImage(this.hudBgCache, 0, 0);

  const PH = 26;
  const PY = 9;
  const midY = PY + PH / 2;
  const lowTime = time <= 60;

  // Einheitliche Glasmorphismus-Pill.
  const pill = (px: number, pw: number, accent: string) => {
    const g = ctx.createLinearGradient(px, PY, px, PY + PH);
    g.addColorStop(0, 'rgba(36,38,58,0.84)');
    g.addColorStop(1, 'rgba(16,17,28,0.76)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(px, PY, pw, PH, PH / 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(px + 0.6, PY + 0.6, pw - 1.2, PH - 1.2, (PH - 1.2) / 2);
    ctx.stroke();
    // oberer Glanzbogen (Glasmorphismus)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + PH * 0.5, PY + 1.6);
    ctx.lineTo(px + pw - PH * 0.5, PY + 1.6);
    ctx.stroke();
  };

  ctx.textBaseline = 'middle';

  // ── Leben ──
  pill(12, 54, 'rgba(255,90,110,0.42)');
  hudHeart(ctx, 28, midY, 7.5, '#ff3b54');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = '700 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`×${lives}`, 40, midY + 0.5);

  // ── Münzen ──
  const coinsPX = 76;
  pill(coinsPX, 68, 'rgba(255,210,40,0.42)');
  this.drawCoin(coinsPX + 4, PY + 3, 20, this.time);
  ctx.fillStyle = '#ffd866';
  ctx.font = '700 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`×${coins}`, coinsPX + 28, midY + 0.5);

  // ── Score (zentriert) ──
  const scorePW = 128;
  const scorePX = Math.round(W / 2 - scorePW / 2);
  pill(scorePX, scorePW, 'rgba(180,200,255,0.32)');
  hudStar(ctx, scorePX + 18, midY, 8, '#ffe066');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = "700 15px ui-monospace, 'SF Mono', monospace";
  ctx.fillText(score.toString().padStart(6, '0'), scorePX + 34, midY + 0.5);

  // ── Zeit (rechts) ──
  const timePW = 84;
  const timePX = W - timePW - 12;
  pill(timePX, timePW, lowTime ? 'rgba(255,70,70,0.6)' : 'rgba(150,210,255,0.36)');
  hudClock(ctx, timePX + 18, midY, 8, lowTime ? '#ff6a6a' : '#bfe3ff');
  ctx.textAlign = 'left';
  ctx.font = "700 15px ui-monospace, 'SF Mono', monospace";
  if (lowTime) {
    const pulse = Math.sin(this.time * 0.1) * 0.3 + 0.7;
    ctx.save();
    ctx.shadowColor = `rgba(255,50,50,${pulse * 0.8})`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgb(${Math.floor(220 + pulse * 35)},${Math.floor(70 + pulse * 20)},${Math.floor(70 + pulse * 20)})`;
    ctx.fillText(`${Math.ceil(time)}`, timePX + 34, midY + 0.5);
    ctx.restore();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.ceil(time)}`, timePX + 34, midY + 0.5);
  }

  ctx.textBaseline = 'alphabetic';

  // Welt 13: Terminal-Boot-Intro beim Levelstart (kurz, dann Ausblendung).
  if (this.currentTheme === 'bluefield' && this.bluefieldBootStart >= 0) {
    const el = this.time - this.bluefieldBootStart;
    const DUR = 145;
    if (el >= 0 && el < DUR) drawBluefieldBoot.call(this, el, DUR);
    else if (el >= DUR) this.bluefieldBootStart = -1;
  }
}

// Welt 13: kurzes Terminal-Boot-Intro (Navy-Overlay, Mono, //-Zeilen).
function drawBluefieldBoot(this: Renderer, el: number, dur: number) {
  const ctx = this.ctx;
  const W = this.viewportW, H = this.viewportH;
  let a = 1;
  if (el < 8) a = el / 8;
  else if (el > dur - 35) a = Math.max(0, (dur - el) / 35);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(8,15,36,0.93)';
  ctx.fillRect(0, 0, W, H);
  const lines: [string, string][] = [
    ['bluefield_lab', '#6b9bf5'],
    ['// initialisiere ... ok', 'rgba(200,220,255,0.85)'],
    ['// lade blaue_wiese ... geladen', 'rgba(200,220,255,0.85)'],
    ['// pruefe: server_de · dsgvo ... bereit', 'rgba(200,220,255,0.85)'],
    ['> betriebsbereit', '#3fe08a'],
  ];
  const lh = 22, startY = H * 0.4;
  ctx.textAlign = 'left';
  ctx.font = '14px monospace';
  let bw = 0; for (const [t] of lines) bw = Math.max(bw, ctx.measureText(t).width);
  const x0 = W / 2 - bw / 2;
  const shown = Math.min(lines.length, Math.max(0, Math.floor((el - 8) / 20) + 1));
  for (let i = 0; i < shown; i++) {
    ctx.font = (i === 0 ? 'bold ' : '') + '14px monospace';
    ctx.fillStyle = lines[i][1];
    ctx.fillText(lines[i][0], x0, startY + i * lh);
  }
  if (shown > 0 && Math.floor(el / 15) % 2 === 0) {
    const li = shown - 1;
    ctx.font = (li === 0 ? 'bold ' : '') + '14px monospace';
    const tw = ctx.measureText(lines[li][0]).width;
    ctx.fillStyle = 'rgba(200,220,255,0.7)';
    ctx.fillRect(x0 + tw + 3, startY + li * lh - 11, 7, 13);
  }
  ctx.restore();
}

function drawTitleScreen(this: Renderer, _unlockedLevels: number) {
  // Moderner, ruhiger Startbildschirm-Hintergrund. Der klickbare Inhalt
  // (Titel, Levelraster, laufende Figuren, Hinweis) liegt im DOM-Overlay
  // (pages/game.tsx) — der Canvas liefert nur noch die Atmosphäre:
  // ein dunkler Mesh-Verlauf mit weich driftenden Farb-Orbs, Sternen und
  // einer sanften Vignette.
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;
  const t = this.time;

  // Magischer Abenteuerland-Dämmerungshimmel: Nachtblau oben → violett →
  // warmes Magenta → goldene Horizontglut unten (v466: aus „Weltraum" wird eine
  // weite Landschaft bei Zauber-Dämmerung).
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0c1038');
  grad.addColorStop(0.38, '#241452');
  grad.addColorStop(0.62, '#4a1e5e');
  grad.addColorStop(0.8, '#8a3a5e');
  grad.addColorStop(1, '#d87a4e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Warme Sonnen-/Horizontglut hinter den Hügeln (Dämmerung über dem Land).
  const horizonY = H * 0.86;
  const sun = ctx.createRadialGradient(W * 0.5, horizonY, 0, W * 0.5, horizonY, Math.max(W, H) * 0.55);
  sun.addColorStop(0, 'rgba(255,214,130,0.45)');
  sun.addColorStop(0.4, 'rgba(255,150,90,0.18)');
  sun.addColorStop(1, 'rgba(255,150,90,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  // Weiche, driftende Farb-Orbs (Welten-Farben) im oberen Himmel.
  const orbs = [
    { hue: 265, x: 0.22, y: 0.20, r: 0.50, a: 0.34, sx: 0.6, sy: 0.4 },
    { hue: 190, x: 0.82, y: 0.16, r: 0.46, a: 0.28, sx: -0.5, sy: 0.5 },
    { hue: 330, x: 0.70, y: 0.40, r: 0.42, a: 0.24, sx: 0.4, sy: -0.3 },
    { hue: 45, x: 0.16, y: 0.44, r: 0.38, a: 0.20, sx: 0.5, sy: -0.4 },
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const o of orbs) {
    const cx = (o.x + Math.sin(t * 0.005 * o.sx) * 0.045) * W;
    const cy = (o.y + Math.cos(t * 0.005 * o.sy) * 0.045) * H;
    const rad = o.r * Math.max(W, H);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, `hsla(${o.hue}, 85%, 62%, ${o.a})`);
    g.addColorStop(1, `hsla(${o.hue}, 85%, 62%, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // Sterne (nur im oberen, dunklen Himmel).
  this.drawStars({ x: 0 } as Camera);

  // Gestaffelte Abenteuerland-Hügel am unteren Rand → macht aus dem Himmel eine
  // WELT (Landschaft), auf der die Lauf-Figuren des Overlays stehen.
  const hills: { y: number; amp: number; col: string; freq: number; ph: number; rim?: string }[] = [
    { y: 0.74, amp: 0.045, col: 'rgba(74,48,104,0.6)', freq: 0.5, ph: 0.4 },
    { y: 0.82, amp: 0.055, col: 'rgba(48,28,74,0.82)', freq: 0.8, ph: 2.1 },
    { y: 0.9, amp: 0.05, col: 'rgba(26,14,44,0.96)', freq: 1.15, ph: 4.0, rim: 'rgba(255,170,110,0.4)' },
  ];
  for (const hl of hills) {
    const baseY = H * hl.y;
    const a = H * hl.amp;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, baseY);
    for (let x = 0; x <= W; x += 8) {
      const u = x / W * Math.PI * 2;
      const y = baseY - Math.sin(u * hl.freq + hl.ph) * a - Math.sin(u * hl.freq * 2.3 + hl.ph * 1.6) * a * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = hl.col;
    ctx.fill();
    if (hl.rim) {
      ctx.strokeStyle = hl.rim;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const u = x / W * Math.PI * 2;
        const y = baseY - Math.sin(u * hl.freq + hl.ph) * a - Math.sin(u * hl.freq * 2.3 + hl.ph * 1.6) * a * 0.3;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // Sanfte Vignette für Fokus und Tiefe (oben stärker, unten offen für die Glut).
  const vig = ctx.createRadialGradient(W / 2, H * 0.4, Math.min(W, H) * 0.2, W / 2, H * 0.46, Math.max(W, H) * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function drawLevelIcon(this: Renderer, ctx: CanvasRenderingContext2D, x: number, y: number, theme: string, color: string) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  if (theme === 'jungle') {
    ctx.strokeStyle = '#553311';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 15);
    ctx.lineTo(x, y - 5);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.quadraticCurveTo(x - 10, y - 5, x - 8, y + 2);
    ctx.quadraticCurveTo(x - 2, y - 2, x, y - 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.quadraticCurveTo(x + 10, y - 5, x + 8, y + 2);
    ctx.quadraticCurveTo(x + 2, y - 2, x, y - 10);
    ctx.fill();
  } else if (theme === 'cave') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 10);
    ctx.lineTo(x - 5, y - 8);
    ctx.lineTo(x, y - 2);
    ctx.lineTo(x + 5, y - 10);
    ctx.lineTo(x + 10, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(x, y + 4, 4, Math.PI, 0);
    ctx.fill();
  } else if (theme === 'sky') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 3, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 4, y - 4, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (theme === 'beach') {
    ctx.fillStyle = '#e8d4a0';
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d9bb0';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 2);
    for (let wx = -10; wx <= 10; wx += 2) {
      ctx.lineTo(x + wx, y + 2 + Math.sin(wx * 0.4) * 2);
    }
    ctx.stroke();
    ctx.strokeStyle = '#553311';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 5);
    ctx.lineTo(x + 6, y - 8);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 8);
    ctx.quadraticCurveTo(x + 14, y - 5, x + 12, y - 2);
    ctx.quadraticCurveTo(x + 8, y - 4, x + 6, y - 8);
    ctx.fill();
  } else if (theme === 'australia') {
    ctx.fillStyle = '#c4633a';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 8);
    ctx.quadraticCurveTo(x - 5, y - 8, x, y - 6);
    ctx.quadraticCurveTo(x + 5, y - 8, x + 10, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d4845a';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 8);
    ctx.lineTo(x - 3, y);
    ctx.lineTo(x, y + 2);
    ctx.lineTo(x + 3, y - 1);
    ctx.lineTo(x + 6, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y - 10, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGameOver(this: Renderer) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;
  const cx = W / 2;
  const cy = H / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, W, H);

  const vig = ctx.createRadialGradient(cx, cy, H * 0.15, cx, cy, H * 0.7);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  vig.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  const xSize = 18;
  const xY = cy - 55;
  for (let side = -1; side <= 1; side += 2) {
    const xx = cx + side * 130;
    ctx.strokeStyle = '#881111';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(xx - xSize, xY - xSize);
    ctx.lineTo(xx + xSize, xY + xSize);
    ctx.moveTo(xx + xSize, xY - xSize);
    ctx.lineTo(xx - xSize, xY + xSize);
    ctx.stroke();
    ctx.strokeStyle = '#cc2222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xx - xSize, xY - xSize);
    ctx.lineTo(xx + xSize, xY + xSize);
    ctx.moveTo(xx + xSize, xY - xSize);
    ctx.lineTo(xx - xSize, xY + xSize);
    ctx.stroke();
  }

  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText('GAME OVER', cx + 4, cy - 16);

  ctx.strokeStyle = '#440000';
  ctx.lineWidth = 8;
  ctx.strokeText('GAME OVER', cx, cy - 20);

  ctx.fillStyle = 'rgba(80,0,0,0.5)';
  ctx.fillText('GAME OVER', cx + 2, cy - 18);

  const goGrad = ctx.createLinearGradient(0, cy - 50, 0, cy);
  goGrad.addColorStop(0, '#ff2222');
  goGrad.addColorStop(0.5, '#cc0000');
  goGrad.addColorStop(1, '#880000');
  ctx.fillStyle = goGrad;
  ctx.fillText('GAME OVER', cx, cy - 20);

  const pulse = Math.sin(this.time * 0.08) * 0.4 + 0.6;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.shadowColor = 'rgba(255,255,255,0.5)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('PRESS ENTER TO RETRY', cx, cy + 35);
  ctx.restore();
}

function drawLevelComplete(this: Renderer, score: number, coins: number, timeBonus: number, nextLevelName: string | null = null) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;
  const cx = W / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, W, H);

  const pseudoRand = pseudoRandom;
  for (let i = 0; i < 20; i++) {
    const sx = pseudoRand(i * 7 + 100) * W;
    const sy = pseudoRand(i * 11 + 200) * H * 0.6;
    const sparklePhase = (this.time * 0.05 + i * 1.3) % (Math.PI * 2);
    const sparkleAlpha = Math.max(0, Math.sin(sparklePhase)) * 0.8;
    if (sparkleAlpha > 0.1) {
      ctx.save();
      ctx.globalAlpha = sparkleAlpha;
      const sparkleSize = 3 + pseudoRand(i * 13 + 300) * 4;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(sx, sy - sparkleSize);
      ctx.lineTo(sx + sparkleSize * 0.3, sy - sparkleSize * 0.3);
      ctx.lineTo(sx + sparkleSize, sy);
      ctx.lineTo(sx + sparkleSize * 0.3, sy + sparkleSize * 0.3);
      ctx.lineTo(sx, sy + sparkleSize);
      ctx.lineTo(sx - sparkleSize * 0.3, sy + sparkleSize * 0.3);
      ctx.lineTo(sx - sparkleSize, sy);
      ctx.lineTo(sx - sparkleSize * 0.3, sy - sparkleSize * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Wertungs-Sterne: verdient = gold + Glow, sonst Umriss; mit Labels.
  {
    const flags = this.levelStarFlags;
    const labels = ['Ideen', 'Ohne Treffer', 'Tempo'];
    const gap = 82, sy = H * 0.2, base = cx - gap;
    for (let i = 0; i < 3; i++) {
      const earned = !!flags[i];
      const sx = base + i * gap;
      const size = 18 * (earned ? 1 + Math.sin(this.time * 0.08 + i) * 0.07 : 1);
      ctx.save();
      if (earned) { ctx.shadowColor = 'rgba(255,215,0,0.85)'; ctx.shadowBlur = 16; }
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2 - Math.PI / 2;
        const r = p % 2 === 0 ? size : size * 0.42;
        const px = sx + Math.cos(a) * r, py = sy + Math.sin(a) * r;
        p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = earned ? '#FFD34A' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = earned ? '#B8860B' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = earned ? 'rgba(255,235,150,0.95)' : 'rgba(255,255,255,0.45)';
      ctx.fillText(labels[i], sx, sy + size + 16);
      ctx.restore();
    }
  }

  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText('LEVEL COMPLETE!', cx + 3, H * 0.31 + 3);

  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 6;
  ctx.strokeText('LEVEL COMPLETE!', cx, H * 0.31);

  const lcGrad = ctx.createLinearGradient(0, H * 0.28, 0, H * 0.35);
  lcGrad.addColorStop(0, '#FFE566');
  lcGrad.addColorStop(0.4, '#FFD700');
  lcGrad.addColorStop(0.7, '#FFAA00');
  lcGrad.addColorStop(1, '#CC8800');
  ctx.fillStyle = lcGrad;
  ctx.fillText('LEVEL COMPLETE!', cx, H * 0.31);

  // Bestwert bzw. „Neuer Rekord!" zwischen Titel und Statistik-Box.
  {
    const by2 = H * 0.365;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (this.levelNewRecord) {
      ctx.font = 'bold 13px sans-serif';
      const txt = '★ NEUER REKORD!';
      const pill = ctx.measureText(txt).width + 28;
      const pulse = 0.85 + Math.sin(this.time * 0.12) * 0.15;
      ctx.shadowColor = `rgba(255,211,74,${pulse})`; ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(255,211,74,0.96)';
      ctx.beginPath(); ctx.roundRect(cx - pill / 2, by2 - 14, pill, 23, 11); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a1230'; ctx.fillText(txt, cx, by2 + 2);
    } else if (this.levelBestScore > 0) {
      ctx.font = '13px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillText(`Bestwert: ${this.levelBestScore}`, cx, by2 + 2);
    }
    ctx.restore();
  }

  // Bestzeit-Zeile direkt unter dem Bestwert (Retention).
  if (this.levelTime > 0) {
    const ty = H * 0.365 + 20;
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (this.levelNewTimeRecord) {
      ctx.font = 'bold 12px sans-serif';
      const txt = `NEUE BESTZEIT  ${fmt(this.levelTime)}`;
      const pill = ctx.measureText(txt).width + 26;
      const pulse = 0.85 + Math.sin(this.time * 0.12 + 1) * 0.15;
      ctx.shadowColor = `rgba(120,220,255,${pulse})`; ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(120,220,255,0.95)';
      ctx.beginPath(); ctx.roundRect(cx - pill / 2, ty - 13, pill, 21, 10); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0e1c3a'; ctx.fillText(txt, cx, ty + 1);
    } else {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      const best = this.levelBestTime > 0 ? `   ·   Best ${fmt(this.levelBestTime)}` : '';
      ctx.fillText(`Zeit ${fmt(this.levelTime)}${best}`, cx, ty + 1);
    }
    ctx.restore();
  }
  const boxW = 220;
  const boxH = 130;
  const boxX = cx - boxW / 2;
  const boxY = H * 0.4;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 8);
  ctx.stroke();

  ctx.font = '16px monospace';
  ctx.textAlign = 'center';

  const rows = [
    { label: 'SCORE:', value: `${score}`, color: '#ffffff' },
    { label: 'COINS:', value: `${coins}`, color: '#ffd700' },
    { label: 'TIME BONUS:', value: `${timeBonus}`, color: '#88ccff' },
  ];
  for (let i = 0; i < rows.length; i++) {
    const ry = boxY + 28 + i * 28;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'left';
    ctx.fillText(rows[i].label, boxX + 15, ry);
    ctx.fillStyle = rows[i].color;
    ctx.textAlign = 'right';
    ctx.fillText(rows[i].value, boxX + boxW - 15, ry);
  }

  ctx.fillStyle = 'rgba(255,215,0,0.15)';
  ctx.fillRect(boxX + 10, boxY + boxH - 32, boxW - 20, 1);
  ctx.fillStyle = '#4dcc65';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`TOTAL: ${score + timeBonus}`, cx, boxY + boxH - 10);

  // Welt 13 (Bluefield): premium Siegscreen-CTA — „aus Ideen echte Produkte".
  this.bluefieldCtaRect = null;
  if (this.currentTheme === 'bluefield') {
    const pw = 300, ph = 74, px = cx - pw / 2, py = H * 0.60;
    this.bluefieldCtaRect = { x: px, y: py, w: pw, h: ph };
    const pulse = 0.6 + Math.sin(this.time * 0.07) * 0.4;
    ctx.save();
    ctx.shadowColor = `rgba(30,72,214,${pulse})`;
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(11,20,48,0.92)';
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.fill();
    ctx.shadowBlur = 6;
    ctx.strokeStyle = `rgba(70,130,255,${0.7 + pulse * 0.3})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#eaf1ff';
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Aus Ideen werden echte Produkte.', cx, py + 22);
    ctx.font = '12px sans-serif'; ctx.fillStyle = 'rgba(200,220,255,0.85)';
    ctx.fillText('U1 · live    MatchSuite · im Aufbau    GKV · geplant', cx, py + 41);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = `rgba(120,255,180,${0.7 + pulse * 0.3})`;
    ctx.fillText('→ bluefield-solutions.de/labor', cx, py + 61);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(200,220,255,0.6)';
    ctx.fillText('(tippen zum Öffnen)', cx, py + ph + 15);
    ctx.restore();
  }

  if (nextLevelName) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`NAECHSTES LEVEL: ${nextLevelName}`, cx, H * 0.78);
  }

  const bPulse = Math.sin(this.time * 0.06) * 0.4 + 0.6;
  ctx.save();
  ctx.globalAlpha = bPulse;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(255,215,0,0.4)';
  ctx.shadowBlur = 8;
  if (nextLevelName) {
    ctx.fillText('ENTER: NAECHSTES LEVEL', cx, H * 0.85);
  } else {
    ctx.fillText('ALLE LEVEL GESCHAFFT!', cx, H * 0.82);
    ctx.fillText('ENTER: ZURUECK ZUM START', cx, H * 0.88);
  }
  ctx.restore();
}

function drawPauseScreen(this: Renderer) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;
  const cx = W / 2;
  const cy = H / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, W, H);

  const vig = ctx.createRadialGradient(cx, cy, H * 0.1, cx, cy, H * 0.6);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  const panelW = 280;
  const panelH = 110;
  const panelX = cx - panelW / 2;
  const panelY = cy - panelH / 2;
  ctx.fillStyle = 'rgba(20, 20, 40, 0.6)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 10);
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = 'rgba(200,200,255,0.3)';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', cx, cy - 10);
  ctx.restore();

  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('ESC / P = BACK TO START', cx, cy + 25);
}

export const hudMethods = {
  drawHUD,
  drawTitleScreen,
  drawLevelIcon,
  drawGameOver,
  drawLevelComplete,
  drawPauseScreen,
};
