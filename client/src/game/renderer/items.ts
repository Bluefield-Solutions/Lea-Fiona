import type { Renderer } from '../renderer.ts';

function drawFireball(this: Renderer, x: number, y: number, w: number, h: number, variant: 'fire' | 'ice' | 'plasma', t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  const flicker = 0.85 + Math.sin(t * 0.4) * 0.15;
  const palette: Record<string, [string, string, string]> = {
    fire: ['#fff4b3', '#ff9a2e', '#c12d10'],
    ice: ['#eaf6ff', '#7ec5ee', '#2a5b88'],
    plasma: ['#f3d4ff', '#c266ff', '#5a1f86'],
  };
  const [hot, mid, cold] = palette[variant];
  const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, r * 1.4);
  grad.addColorStop(0, hot);
  grad.addColorStop(0.5, mid);
  grad.addColorStop(1, cold);
  ctx.save();
  ctx.globalAlpha = flicker;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGhost(this: Renderer, x: number, y: number, w: number, h: number, direction: number, variant: 'castle' | 'space', t: number) {
  const ctx = this.ctx;
  const wobble = Math.sin(t * 0.08) * 1.5;
  const body = variant === 'space' ? 'rgba(180, 220, 255, 0.85)' : 'rgba(245, 245, 250, 0.85)';
  const eye = '#1a1a2a';
  ctx.save();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.35, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y + h - 2 + wobble);
  // Wavy bottom.
  const segs = 4;
  for (let i = 0; i < segs; i++) {
    const sx = x + w - (i + 1) * (w / segs);
    const sy = y + h - 2 + (i % 2 === 0 ? -3 : 3) + wobble;
    ctx.lineTo(sx, sy);
  }
  ctx.lineTo(x, y + h * 0.35);
  ctx.closePath();
  ctx.fill();
  // Eyes — face the direction of travel.
  const eyeOffset = direction === -1 ? -2 : 2;
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.arc(x + w / 2 - 5 + eyeOffset, y + h * 0.4, 2.5, 0, Math.PI * 2);
  ctx.arc(x + w / 2 + 5 + eyeOffset, y + h * 0.4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFish(this: Renderer, x: number, y: number, w: number, h: number, direction: number, t: number) {
  const ctx = this.ctx;
  const flap = Math.sin(t * 0.25) * 2;
  const flip = direction === -1 ? -1 : 1;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(flip, 1);
  // Body.
  const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  grad.addColorStop(0, '#ffb84d');
  grad.addColorStop(1, '#cc6a00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2 - 3, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail.
  ctx.fillStyle = '#cc6a00';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, 0);
  ctx.lineTo(-w / 2 - 4, -h / 2 + flap);
  ctx.lineTo(-w / 2 - 4, h / 2 - flap);
  ctx.closePath();
  ctx.fill();
  // Eye.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(w / 2 - 8, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(w / 2 - 7, -2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStar(this: Renderer, x: number, y: number, w: number, h: number, frame: number) {
  const ctx = this.ctx;
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pulse = 1 + Math.sin(frame * 0.18) * 0.08;
  const r = Math.min(w, h) * 0.45 * pulse;
  const inner = r * 0.45;
  const rot = frame * 0.04;
  // Rainbow shimmer: hue cycles, two layered gradients for sparkle.
  const hue = (frame * 4) % 360;
  // Outer rainbow halo (cheap radial gradient, blends behind the star).
  const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.1);
  halo.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.55)`);
  halo.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 100%, 65%, 0.22)`);
  halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.shadowColor = `hsla(${hue}, 100%, 65%, 0.85)`;
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffe24a';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : inner;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // Rainbow sheen overlay
  const sheen = ctx.createLinearGradient(-r, -r, r, r);
  sheen.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.55)`);
  sheen.addColorStop(0.5, `hsla(${(hue + 120) % 360}, 100%, 70%, 0.35)`);
  sheen.addColorStop(1, `hsla(${(hue + 240) % 360}, 100%, 70%, 0.55)`);
  ctx.fillStyle = sheen;
  ctx.fill();
  // Center highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(-r * 0.18, -r * 0.18, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Eyes (Mario-star style — gives it a face)
  ctx.fillStyle = '#1a1a2a';
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.05, r * 0.08, 0, Math.PI * 2);
  ctx.arc(r * 0.2, -r * 0.05, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHeart(this: Renderer, x: number, y: number, w: number, h: number, frame: number, emerging: boolean) {
  const ctx = this.ctx;
  ctx.save();

  const pulse = 1 + Math.sin(frame * 0.1) * 0.08;
  const glow = Math.sin(frame * 0.08) * 0.3 + 0.7;

  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(pulse, pulse);

  ctx.shadowColor = 'rgba(255, 50, 80, 0.6)';
  ctx.shadowBlur = 8 + glow * 4;

  const s = Math.min(w, h) * 0.45;

  ctx.beginPath();
  ctx.moveTo(0, s * 0.4);
  ctx.bezierCurveTo(-s * 0.1, -s * 0.1, -s * 0.8, -s * 0.1, -s * 0.8, -s * 0.45);
  ctx.bezierCurveTo(-s * 0.8, -s * 0.9, 0, -s * 0.9, 0, -s * 0.35);
  ctx.bezierCurveTo(0, -s * 0.9, s * 0.8, -s * 0.9, s * 0.8, -s * 0.45);
  ctx.bezierCurveTo(s * 0.8, -s * 0.1, s * 0.1, -s * 0.1, 0, s * 0.4);
  ctx.closePath();

  ctx.fillStyle = '#ff2255';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-s * 0.35, -s * 0.55);
  ctx.bezierCurveTo(-s * 0.5, -s * 0.7, -s * 0.15, -s * 0.75, -s * 0.2, -s * 0.5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Eingewickeltes Bonbon — die "Süßigkeit", die Fiona zu Lea macht
// (ersetzt optisch das frühere Herz; Funktion bleibt das Power-up).
function drawCandy(this: Renderer, x: number, y: number, w: number, h: number, frame: number, _emerging: boolean) {
  const ctx = this.ctx;
  ctx.save();

  const pulse = 1 + Math.sin(frame * 0.1) * 0.08;
  const glow = Math.sin(frame * 0.08) * 0.3 + 0.7;

  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(pulse, pulse);
  ctx.rotate(Math.sin(frame * 0.05) * 0.12); // sanftes Wackeln

  ctx.shadowColor = 'rgba(255, 120, 180, 0.6)';
  ctx.shadowBlur = 6 + glow * 4;

  const s = Math.min(w, h) * 0.40;   // Körperradius
  const wrap = s * 0.9;              // Wrapper-Länge seitlich

  // Wrapper-Enden links & rechts (gezackt)
  ctx.fillStyle = '#ff8ec2';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * s * 0.5, -s * 0.15);
    ctx.lineTo(dir * (s * 0.5 + wrap), -s * 0.55);
    ctx.lineTo(dir * (s * 0.5 + wrap * 0.65), 0);
    ctx.lineTo(dir * (s * 0.5 + wrap), s * 0.55);
    ctx.lineTo(dir * s * 0.5, s * 0.15);
    ctx.closePath();
    ctx.fill();
  }

  // Bonbon-Körper mit Verlauf
  const grad = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s);
  grad.addColorStop(0, '#ffd6ec');
  grad.addColorStop(0.55, '#ff5fa2');
  grad.addColorStop(1, '#dd2f7c');
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Diagonale Streifen (klassischer Bonbon-Look)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = s * 0.16;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-s + i * s * 0.55, -s);
    ctx.lineTo(s + i * s * 0.55, s);
    ctx.stroke();
  }
  ctx.restore();

  // Glanz-Highlight
  ctx.beginPath();
  ctx.ellipse(-s * 0.32, -s * 0.34, s * 0.26, s * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Welt 19: Münze als Jakobsmuschel (Fächer mit Rippen), dreht sich wie eine Münze.
function drawVacationShell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, frame: number) {
  const sx = Math.max(0.14, Math.abs(Math.cos(frame * 0.08)));
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.scale(sx, 1);
  const R = size * 0.46;
  const hy = R * 0.62;                                   // Scharnier unten
  const a0 = Math.PI * 1.15, a1 = Math.PI * 1.85;        // oberer Fächerbogen
  const fan = () => { ctx.beginPath(); ctx.moveTo(0, hy); ctx.arc(0, hy, R, a0, a1, false); ctx.closePath(); };
  ctx.fillStyle = '#f4d9b0'; fan(); ctx.fill();
  ctx.strokeStyle = 'rgba(200,150,110,0.6)'; ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI / 2 + i * 0.27;
    ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(Math.cos(a) * R * 0.92, hy + Math.sin(a) * R * 0.92); ctx.stroke();
  }
  ctx.fillStyle = '#e8c090'; ctx.beginPath(); ctx.arc(0, hy, R * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c99a68'; ctx.lineWidth = 1.2; fan(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(-R * 0.22, hy - R * 0.5, R * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Welt 19: die drei Sonder-Sammelobjekte (Slot 0 Postkarte · 1 Sonnenhut · 2 Cocktail),
// sanft schwebend mit Glanz-Halo.
function drawVacationSpecial(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, slot: number) {
  const gy = cy + Math.sin(t * 0.08 + slot) * 2;
  ctx.save();
  const glow = ctx.createRadialGradient(cx, gy, 1, cx, gy, r * 2.1);
  glow.addColorStop(0, 'rgba(255,236,170,0.5)'); glow.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, gy, r * 2.1, 0, Math.PI * 2); ctx.fill();
  const round = (rx: number, ry: number, rw: number, rh: number, rr: number) => {
    const q = Math.max(0, Math.min(rr, rw / 2, rh / 2));
    ctx.beginPath(); ctx.moveTo(rx + q, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, q); ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, q);
    ctx.arcTo(rx, ry + rh, rx, ry, q); ctx.arcTo(rx, ry, rx + rw, ry, q); ctx.closePath();
  };
  if (slot === 0) {
    // Postkarte: cremeweiße Karte mit Briefmarke + Palme + Sonne.
    ctx.save(); ctx.translate(cx, gy); ctx.rotate(-0.08);
    ctx.fillStyle = '#fff8ec'; round(-r * 0.95, -r * 0.68, r * 1.9, r * 1.36, 2); ctx.fill();
    ctx.strokeStyle = '#cab488'; ctx.lineWidth = 1; round(-r * 0.95, -r * 0.68, r * 1.9, r * 1.36, 2); ctx.stroke();
    ctx.fillStyle = '#e85a86'; ctx.fillRect(r * 0.42, -r * 0.58, r * 0.42, r * 0.42);         // Briefmarke
    ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(-r * 0.5, -r * 0.28, r * 0.2, 0, Math.PI * 2); ctx.fill(); // Sonne
    ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-r * 0.05, r * 0.5); ctx.lineTo(r * 0.05, -r * 0.1); ctx.stroke(); // Palmstamm
    ctx.fillStyle = '#3f9a4a';
    for (const dx of [-1, 0, 1]) { ctx.beginPath(); ctx.ellipse(r * 0.05 + dx * r * 0.28, -r * 0.18, r * 0.28, r * 0.12, dx * 0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  } else if (slot === 1) {
    // Sonnenhut: Strohhut mit Band.
    ctx.fillStyle = '#e7c98a'; ctx.beginPath(); ctx.ellipse(cx, gy + r * 0.45, r * 1.15, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0d79a'; ctx.beginPath(); ctx.ellipse(cx, gy + r * 0.25, r * 0.66, r * 0.62, 0, Math.PI, 0, true); ctx.fill();
    ctx.fillStyle = '#e06a86'; ctx.beginPath(); ctx.ellipse(cx, gy + r * 0.3, r * 0.66, r * 0.16, 0, 0, Math.PI * 2); ctx.fill(); // Band
    ctx.strokeStyle = 'rgba(150,110,50,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, gy + r * 0.45, r * 1.15, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    // Cocktail: Glas mit Getränk, Strohhalm & Kirsche.
    ctx.strokeStyle = '#dfeaf0'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.7, gy - r * 0.55); ctx.lineTo(cx + r * 0.7, gy - r * 0.55); ctx.lineTo(cx, gy + r * 0.35); ctx.closePath();
    ctx.fillStyle = 'rgba(220,240,250,0.35)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.moveTo(cx - r * 0.56, gy - r * 0.42); ctx.lineTo(cx + r * 0.56, gy - r * 0.42); ctx.lineTo(cx, gy + r * 0.18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#dfeaf0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx, gy + r * 0.35); ctx.lineTo(cx, gy + r * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, gy + r * 0.9, r * 0.45, r * 0.14, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#e85a86'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx + r * 0.2, gy - r * 0.55); ctx.lineTo(cx + r * 0.5, gy - r * 1.0); ctx.stroke(); // Strohhalm
    ctx.fillStyle = '#e23b4a'; ctx.beginPath(); ctx.arc(cx - r * 0.3, gy - r * 0.5, r * 0.16, 0, Math.PI * 2); ctx.fill(); // Kirsche
  }
  ctx.restore();
}

function drawCoin(this: Renderer, x: number, y: number, size: number, frame: number) {
  const ctx = this.ctx;
  // Welt 19: Münzen sind Muscheln (drehen sich wie eine Münze).
  if (this.currentTheme === 'vacation') { drawVacationShell(ctx, x, y, size, frame); return; }
  const scaleX = Math.cos(frame * 0.08);
  const absScale = Math.abs(scaleX);

  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.scale(absScale, 1);

  // Perf (W2.1): shadowBlur UND Live-Halo-Gradient entfernt — den Schein
  // liefert jetzt die gebackene Glow-Disc (safari-sicher, kein Per-Münze-
  // shadowBlur/createRadialGradient mehr).
  const r = size * 0.42;
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.38, r, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8a6600';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.38, r, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(180,140,0,0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.28, r * 0.75, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (absScale > 0.3) {
    ctx.fillStyle = '#aa7700';
    ctx.font = `bold ${size * 0.5}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 1, 1);
    ctx.fillStyle = '#fff8a0';
    ctx.fillText('$', 0, 0);
  }

  ctx.globalAlpha = 0.3;
  const shine = ctx.createLinearGradient(-size * 0.3, -r, size * 0.3, 0);
  shine.addColorStop(0, 'rgba(255,255,255,0.5)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.1, size * 0.3, r * 0.5, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Bluefield-Theme: Münzen werden zu „Ideen" — eine leuchtende Glühbirne.
// Rein visuell (gleiche Coin-Entity, kein neues Collectible-System).
function drawIdeaBulb(this: Renderer, x: number, y: number, size: number, frame: number) {
  const ctx = this.ctx;
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);

  const pulse = 0.82 + 0.18 * Math.sin(frame * 0.12);
  const rg = size * 0.32;       // Glaskolben-Radius
  const gy = -size * 0.06;      // Glas-Mittelpunkt leicht nach oben

  // Warmer, pulsierender Ideen-Glow
  const halo = ctx.createRadialGradient(0, gy, rg * 0.3, 0, gy, rg * 2.2 * pulse);
  halo.addColorStop(0, 'rgba(255, 240, 170, 0.65)');
  halo.addColorStop(1, 'rgba(255, 215, 90, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, gy, rg * 2.2 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Sockel (Schraubgewinde), Markenblau-getönt
  const bw = rg * 0.95, bh = rg * 0.72, by = gy + rg * 0.74;
  ctx.fillStyle = '#8b93a3';
  ctx.beginPath();
  ctx.moveTo(-bw / 2, by);
  ctx.lineTo(bw / 2, by);
  ctx.lineTo(bw * 0.38, by + bh);
  ctx.lineTo(-bw * 0.38, by + bh);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 72, 214, 0.55)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    const ty = by + (bh * i) / 3;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.46 + i, ty);
    ctx.lineTo(bw * 0.46 - i, ty);
    ctx.stroke();
  }

  // Glaskolben
  ctx.shadowColor = 'rgba(255, 220, 120, 0.7)';
  ctx.shadowBlur = 8 * pulse;
  const glass = ctx.createRadialGradient(-rg * 0.25, gy - rg * 0.25, rg * 0.15, 0, gy, rg);
  glass.addColorStop(0, '#fffef2');
  glass.addColorStop(0.55, '#ffe27a');
  glass.addColorStop(1, '#ffd24d');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.arc(0, gy, rg, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Glühfaden (Idee)
  ctx.shadowColor = 'rgba(255, 150, 40, 0.9)';
  ctx.shadowBlur = 5;
  ctx.strokeStyle = '#ff8a2c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-rg * 0.32, gy + rg * 0.12);
  ctx.lineTo(-rg * 0.12, gy - rg * 0.20);
  ctx.lineTo(rg * 0.12, gy + rg * 0.12);
  ctx.lineTo(rg * 0.32, gy - rg * 0.20);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Glanzlicht
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-rg * 0.3, gy - rg * 0.3, rg * 0.22, rg * 0.34, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawSpinningCoin(this: Renderer, x: number, y: number, size: number, frame: number) {
  if (this.currentTheme === 'bluefield') { this.drawIdeaBulb(x, y, size, frame); return; }
  this.drawCoin(x, y, size, frame * 3);
}

function drawFlag(this: Renderer, x: number, y: number, poleHeight: number, frame: number) {
  const ctx = this.ctx;
  ctx.save();

  ctx.fillStyle = '#bbb';
  ctx.fillRect(x + 1, y, 6, poleHeight);

  for (let py = y; py < y + poleHeight; py += 12) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(x + 1, py, 6, 1);
  }

  ctx.save();
  ctx.shadowColor = 'rgba(255, 200, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x + 4, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (this.currentTheme === 'bluefield') {
    // Leuchtendes Neon-"GO LIVE"-Zielschild: markenblauer Rahmen, grün
    // pulsierender Text + Live-Punkt (grünes Licht = „live geschaltet").
    const pulse = 0.6 + Math.sin(frame * 0.08) * 0.4;
    ctx.save();
    ctx.translate(x + 4, y + 14);
    ctx.shadowColor = `rgba(30,72,214,${pulse})`;
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#0b1430';
    ctx.fillRect(-40, -16, 80, 32);
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `rgba(70,130,255,${pulse})`; ctx.lineWidth = 2.5;
    ctx.strokeRect(-40, -16, 80, 32);
    // Live-Punkt (grün, pulsierend)
    ctx.shadowColor = `rgba(40,230,120,${pulse})`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(70,240,150,${0.7 + pulse * 0.3})`;
    ctx.beginPath(); ctx.arc(-31, -7, 2.6, 0, Math.PI * 2); ctx.fill();
    // Text
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(130,255,190,${0.75 + pulse * 0.25})`;
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('GO LIVE', 5, 5);
    ctx.textAlign = 'left';
    ctx.restore();
    ctx.restore();
    return;
  }
  if (this.currentTheme === 'trampoline') {
    // Leuchtendes Neon-"FLY"-Schild als Ziel (pulsierend, Disco-Glow).
    const pulse = 0.6 + Math.sin(frame * 0.06) * 0.4;
    ctx.save();
    ctx.translate(x + 4, y + 14);
    ctx.shadowColor = `rgba(255,60,170,${pulse})`;
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#1e2034';
    ctx.fillRect(-26, -16, 52, 32);
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `rgba(60,220,230,${pulse})`; ctx.lineWidth = 2.5;
    ctx.strokeRect(-26, -16, 52, 32);
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(255,90,185,${0.7 + pulse * 0.3})`;
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('FLY', 0, 6);
    ctx.textAlign = 'left';
    ctx.restore();
    ctx.restore();
    return;
  }
  if (this.currentTheme === 'school') {
    // Schulglocke schwingt am Mast — Bronze mit Klöppel (statt Fahne).
    const swing = Math.sin(frame * 0.045) * 0.16;
    ctx.save();
    ctx.translate(x + 4, y + 4);
    ctx.rotate(swing);
    ctx.strokeStyle = '#7a5a22'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 3.5, Math.PI, 0); ctx.stroke();
    const bell = ctx.createLinearGradient(0, 2, 0, 26);
    bell.addColorStop(0, '#eccb74');
    bell.addColorStop(0.5, '#caa03e');
    bell.addColorStop(1, '#a47c26');
    ctx.fillStyle = bell;
    ctx.beginPath();
    ctx.moveTo(-3, 2);
    ctx.lineTo(3, 2);
    ctx.bezierCurveTo(6, 10, 10, 17, 13, 23);
    ctx.lineTo(-13, 23);
    ctx.bezierCurveTo(-10, 17, -6, 10, -3, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a6a1e';
    ctx.fillRect(-13, 22, 26, 3);
    ctx.fillStyle = 'rgba(255,246,206,0.45)';
    ctx.beginPath(); ctx.ellipse(-4, 12, 1.8, 7, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5e4418';
    ctx.beginPath(); ctx.arc(0, 26, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
    return;
  }

  const wave1 = Math.sin(frame * 0.05) * 4;
  const wave2 = Math.sin(frame * 0.05 + 1) * 3;
  const wave3 = Math.sin(frame * 0.05 + 2) * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(200, 0, 0, 0.3)';
  ctx.shadowBlur = 4;

  ctx.fillStyle = '#ee1111';
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 4);
  ctx.bezierCurveTo(x + 15 + wave1, y + 8, x + 22 + wave2, y + 12, x + 30 + wave3, y + 17);
  ctx.bezierCurveTo(x + 22 + wave2, y + 22, x + 15 + wave1, y + 26, x + 7, y + 32);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(255, 180, 180, 0.25)';
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 6);
  ctx.bezierCurveTo(x + 12 + wave1 * 0.5, y + 10, x + 18 + wave2 * 0.5, y + 14, x + 24 + wave3 * 0.5, y + 17);
  ctx.bezierCurveTo(x + 18, y + 15, x + 12, y + 12, x + 7, y + 10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 200, 0.4)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 14 + wave1 * 0.3);
  ctx.lineTo(x + 15, y + 12 + wave2 * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 20 + wave1 * 0.3);
  ctx.lineTo(x + 20, y + 18 + wave2 * 0.3);
  ctx.stroke();

  ctx.restore();
}

// ===========================================================================
// Fire-Flower power-up: red petals around a yellow centre with a green
// stem. Pulses with the renderer time so it reads as "alive" on the block.
// ===========================================================================
function drawFireFlower(this: Renderer, x: number, y: number, w: number, h: number, t: number) {
  const ctx = this.ctx;
  if (this.currentTheme === 'bluefield') {
    // Prototyp: Laborkolben (Erlenmeyer) mit blau blubbernder Kultur —
    // "Probe unter Glas", klar unterscheidbar von den Glühbirnen-Coins.
    const cx = x + w / 2, cy = y + h / 2;
    const pulse = 1 + Math.sin(t * 0.12) * 0.05;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
    const fh = h * 0.78;
    const topY = cy - fh / 2, botY = cy + fh / 2;
    const neckW = w * 0.22, baseW = w * 0.60;
    const bodyTop = topY + fh * 0.34;
    ctx.beginPath();
    ctx.moveTo(cx - neckW / 2, topY);
    ctx.lineTo(cx - neckW / 2, bodyTop);
    ctx.lineTo(cx - baseW / 2, botY - 3);
    ctx.quadraticCurveTo(cx - baseW / 2, botY, cx - baseW / 2 + 3, botY);
    ctx.lineTo(cx + baseW / 2 - 3, botY);
    ctx.quadraticCurveTo(cx + baseW / 2, botY, cx + baseW / 2, botY - 3);
    ctx.lineTo(cx + neckW / 2, bodyTop);
    ctx.lineTo(cx + neckW / 2, topY);
    ctx.closePath();
    ctx.shadowColor = 'rgba(70,130,255,0.7)'; ctx.shadowBlur = 9;
    ctx.fillStyle = 'rgba(220,235,255,0.16)'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(210,230,255,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.clip();
    const liqTop = bodyTop + (botY - bodyTop) * 0.34;
    const lg = ctx.createLinearGradient(0, liqTop, 0, botY);
    lg.addColorStop(0, '#4a7be0'); lg.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = lg; ctx.fillRect(cx - baseW / 2, liqTop, baseW, botY - liqTop);
    ctx.fillStyle = 'rgba(205,228,255,0.85)';
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.04) + i * 0.4) % 1;
      const bx = cx + Math.sin(t * 0.05 + i * 2) * baseW * 0.17;
      const by = botY - ph * (botY - liqTop);
      ctx.beginPath(); ctx.arc(bx, by, 1.6 - ph * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#c9d6ee';
    ctx.fillRect(cx - neckW / 2 - 1, topY - 2, neckW + 2, 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx - baseW * 0.20, bodyTop + 2); ctx.lineTo(cx - baseW * 0.28, botY - 4); ctx.stroke();
    ctx.restore();
    return;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pulse = 1 + Math.sin(t * 0.12) * 0.06;
  const petalR = (Math.min(w, h) / 2) * 0.55 * pulse;
  ctx.save();
  // Stem.
  ctx.fillStyle = '#2a8a2c';
  ctx.fillRect(cx - 2, cy + petalR * 0.4, 4, h / 2 - petalR * 0.4 - 1);
  // Two leaves on the stem.
  ctx.beginPath();
  ctx.ellipse(cx - 5, cy + petalR + 3, 4, 2, -0.5, 0, Math.PI * 2);
  ctx.ellipse(cx + 5, cy + petalR + 5, 4, 2, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Six red petals.
  ctx.fillStyle = '#e23e2e';
  ctx.strokeStyle = '#7a1810';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.sin(t * 0.05) * 0.05;
    const px = cx + Math.cos(a) * petalR * 0.6;
    const py = cy - 2 + Math.sin(a) * petalR * 0.6;
    ctx.beginPath();
    ctx.arc(px, py, petalR * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Yellow centre with white pip — Mario's classic look.
  ctx.fillStyle = '#ffd24c';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, petalR * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx - petalR * 0.18, cy - 4, petalR * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ===========================================================================
// Coin-Magnet gadget: a U-shaped horseshoe magnet (red body + silver tips)
// with a faint orbital sparkle ring so it reads as "active gadget".
// ===========================================================================
function drawCoinMagnet(this: Renderer, x: number, y: number, w: number, h: number, t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  ctx.save();
  // Sparkle halo so the gadget feels electric.
  ctx.strokeStyle = 'rgba(255, 220, 80, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.05 + Math.sin(t * 0.18) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  // Magnet body: thick red horseshoe drawn as an arc with stroke width.
  ctx.strokeStyle = '#d22f2f';
  ctx.lineWidth = r * 0.55;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  // Open at the bottom (poles point down).
  ctx.arc(cx, cy + 2, r * 0.55, Math.PI, 0, false);
  ctx.stroke();
  // Silver pole tips.
  ctx.strokeStyle = '#dcdcdc';
  ctx.lineWidth = r * 0.55;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy + 2);
  ctx.lineTo(cx - r * 0.55, cy + r * 0.55);
  ctx.moveTo(cx + r * 0.55, cy + 2);
  ctx.lineTo(cx + r * 0.55, cy + r * 0.55);
  ctx.stroke();
  // N / S labels.
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(r * 0.4)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx - r * 0.55, cy + r * 0.32);
  ctx.fillText('S', cx + r * 0.55, cy + r * 0.32);
  ctx.restore();
}

// ===========================================================================
// Player fireball: bright orange/yellow ball with a flickering tail. Uses
// the renderer time to swirl the highlight so it reads as in-motion.
// ===========================================================================
function drawPlayerFireball(this: Renderer, x: number, y: number, w: number, h: number, direction: number, t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;

  // Plüsch-Traumland: der Elefant spritzt statt Feuer einen freundlichen
  // Wasser-/Seifenblasen-Klecks (kindgerecht).
  if (this.currentTheme === 'plush') {
    const trailDir = direction === 1 ? -1 : 1;
    ctx.save();
    // Spritz-Schweif.
    ctx.fillStyle = 'rgba(140,200,240,0.3)';
    ctx.beginPath(); ctx.arc(cx + trailDir * r * 0.7, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    // Wassertropfen (glänzende Blase).
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0.5, cx, cy, r * 1.15);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#bfe6fb');
    grad.addColorStop(1, '#5bb0e6');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Glanzpunkt + Rand.
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r - 0.6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(cx - r * 0.34, cy - r * 0.34, r * 0.24, 0, Math.PI * 2); ctx.fill();
    // kleine Spritzer.
    for (let k = 0; k < 3; k++) {
      const a = t * 0.3 + k * 2.1;
      ctx.fillStyle = 'rgba(150,205,240,0.7)';
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 1.2, cy + Math.sin(a) * r * 1.2, 1.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return;
  }

  const flicker = 0.9 + Math.sin(t * 0.6) * 0.1;
  ctx.save();
  // Trailing halo behind the ball so the throw direction is clear.
  const trailDir = direction === 1 ? -1 : 1;
  ctx.fillStyle = 'rgba(255, 170, 60, 0.35)';
  ctx.beginPath();
  ctx.arc(cx + trailDir * r * 0.6, cy, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  // Main fireball gradient.
  const grad = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, r * 1.2);
  grad.addColorStop(0, '#fff7c4');
  grad.addColorStop(0.45, '#ffb13a');
  grad.addColorStop(1, '#b3260d');
  ctx.globalAlpha = flicker;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Inner highlight pip — rotates around the centre with t.
  const hAng = t * 0.25;
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(cx + Math.cos(hAng) * r * 0.3, cy + Math.sin(hAng) * r * 0.3, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ===========================================================================
// Schmetterlingsumhang (Cape / Glider): a stylised butterfly on a small
// shoulder-clasp. Two large pulsing wings + a slim body. Soft hue cycle
// so the icon reads as "magical".
// ===========================================================================
function drawCape(this: Renderer, x: number, y: number, w: number, h: number, t: number) {
  const ctx = this.ctx;
  if (this.currentTheme === 'bluefield') {
    // Skalierung: aufsteigendes Wachstums-Chart (Balken + Aufwärts-Trend).
    const cx = x + w / 2, cy = y + h / 2;
    const pulse = 1 + Math.sin(t * 0.12) * 0.05;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
    const bw = w * 0.72, bh = h * 0.62;
    const left = cx - bw / 2, base = cy + bh / 2;
    const heights = [0.35, 0.6, 0.92];
    const slot = bw / heights.length;
    const colW = slot * 0.52;
    ctx.shadowColor = 'rgba(70,130,255,0.7)'; ctx.shadowBlur = 8;
    for (let i = 0; i < heights.length; i++) {
      const bx = left + i * slot + (slot - colW) / 2;
      const hgt = bh * heights[i];
      const g = ctx.createLinearGradient(0, base - hgt, 0, base);
      g.addColorStop(0, '#6aa0ff'); g.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(bx, base - hgt, colW, hgt, 1.5); ctx.fill();
    }
    ctx.shadowBlur = 0;
    // Aufwärts-Trendlinie mit Pfeilspitze oben rechts
    ctx.strokeStyle = '#eaf1ff'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const ax = cx + bw * 0.40, ay = cy - bh * 0.40;
    ctx.beginPath();
    ctx.moveTo(left + slot * 0.3, base - bh * 0.18);
    ctx.lineTo(cx - bw * 0.04, cy - bh * 0.02);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(ax - w * 0.15, ay + h * 0.02);
    ctx.moveTo(ax, ay); ctx.lineTo(ax - w * 0.02, ay + h * 0.15);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  const flap = Math.sin(t * 0.2);
  const wingW = r * (0.95 + flap * 0.15);
  const wingH = r * 0.95;
  const hue = (t * 1.5) % 360;
  ctx.save();
  // Subtle halo so the gadget pops on dark themes.
  ctx.shadowColor = `hsla(${hue}, 90%, 70%, 0.7)`;
  ctx.shadowBlur = 10;
  // Left wing.
  const grad1 = ctx.createRadialGradient(cx - wingW * 0.4, cy, 1, cx - wingW * 0.4, cy, wingW);
  grad1.addColorStop(0, `hsla(${hue}, 95%, 75%, 0.95)`);
  grad1.addColorStop(0.6, `hsla(${(hue + 40) % 360}, 90%, 60%, 0.85)`);
  grad1.addColorStop(1, `hsla(${(hue + 80) % 360}, 80%, 45%, 0.8)`);
  ctx.fillStyle = grad1;
  ctx.beginPath();
  ctx.ellipse(cx - wingW * 0.45, cy - 2, wingW * 0.7, wingH * 0.6, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - wingW * 0.4, cy + wingH * 0.35, wingW * 0.5, wingH * 0.45, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Right wing (mirror).
  const grad2 = ctx.createRadialGradient(cx + wingW * 0.4, cy, 1, cx + wingW * 0.4, cy, wingW);
  grad2.addColorStop(0, `hsla(${hue}, 95%, 75%, 0.95)`);
  grad2.addColorStop(0.6, `hsla(${(hue + 40) % 360}, 90%, 60%, 0.85)`);
  grad2.addColorStop(1, `hsla(${(hue + 80) % 360}, 80%, 45%, 0.8)`);
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.ellipse(cx + wingW * 0.45, cy - 2, wingW * 0.7, wingH * 0.6, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + wingW * 0.4, cy + wingH * 0.35, wingW * 0.5, wingH * 0.45, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Wing eye-spots — make it read as a butterfly cape.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(cx - wingW * 0.5, cy - 4, 2.2, 0, Math.PI * 2);
  ctx.arc(cx + wingW * 0.5, cy - 4, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a2a';
  ctx.beginPath();
  ctx.arc(cx - wingW * 0.5, cy - 4, 1, 0, Math.PI * 2);
  ctx.arc(cx + wingW * 0.5, cy - 4, 1, 0, Math.PI * 2);
  ctx.fill();
  // Body + antennae.
  ctx.fillStyle = '#2a1a3a';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 2.2, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a1a3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 1.5, cy - r * 0.5);
  ctx.quadraticCurveTo(cx - 6, cy - r * 0.85, cx - 8, cy - r * 0.95);
  ctx.moveTo(cx + 1.5, cy - r * 0.5);
  ctx.quadraticCurveTo(cx + 6, cy - r * 0.85, cx + 8, cy - r * 0.95);
  ctx.stroke();
  ctx.restore();
}

// ===========================================================================
// Flügel (Paket 2): freispielbare Doppelsprung-Fähigkeit. Ein Paar weiß-
// goldene Feder-Flügel mit sanftem Flügelschlag und Glanz — klar als
// „Flug"-Symbol lesbar, deutlich anders als der bunte Schmetterlings-Umhang.
// ===========================================================================
function drawWings(this: Renderer, x: number, y: number, w: number, h: number, t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  const flap = Math.sin(t * 0.18);
  const spread = 1 + flap * 0.12;
  const lift = flap * 2;
  ctx.save();
  // Weicher goldener Schimmer.
  ctx.shadowColor = 'rgba(255, 240, 190, 0.85)';
  ctx.shadowBlur = 10;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + side * r * 0.14, cy - lift);
    ctx.scale(side * spread, 1);
    // Drei gefiederte Segmente (unten am längsten) als Feder-Fächer.
    const feathers = [
      { len: r * 1.05, wid: r * 0.34, ang: -0.15, y: r * 0.30 },
      { len: r * 0.95, wid: r * 0.30, ang: -0.05, y: r * 0.02 },
      { len: r * 0.72, wid: r * 0.26, ang: 0.10, y: -r * 0.24 },
    ];
    for (let i = 0; i < feathers.length; i++) {
      const f = feathers[i];
      const g = ctx.createLinearGradient(0, f.y, f.len, f.y);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.7, '#fff3d0');
      g.addColorStop(1, '#f2cf7a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(f.len * 0.5, f.y, f.len * 0.5, f.wid, f.ang, 0, Math.PI * 2);
      ctx.fill();
      // Feder-Mittelrippe.
      ctx.strokeStyle = 'rgba(210,170,90,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, f.y);
      ctx.lineTo(f.len - 2, f.y - Math.sin(f.ang) * f.len * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.shadowBlur = 0;
  // Kleiner goldener Kern zwischen den Flügeln.
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.32);
  core.addColorStop(0, '#fffef2');
  core.addColorStop(1, '#f2c14a');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.24, 0, Math.PI * 2);
  ctx.fill();
  // Aufsteigende Glitzer-Punkte (leichtes „Auftrieb"-Gefühl).
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.05 + i * 0.4) % 1;
    ctx.fillStyle = `rgba(255,245,200,${(1 - ph) * 0.8})`;
    ctx.beginPath();
    ctx.arc(cx + (i - 1) * r * 0.3, cy - r * 0.6 - ph * r * 0.8, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ===========================================================================
// Schutzschild-Blase (Shield Bubble): translucent sphere with a moving
// rim highlight + tiny bubbles drifting around it.
// ===========================================================================
function drawShield(this: Renderer, x: number, y: number, w: number, h: number, t: number) {
  const ctx = this.ctx;
  if (this.currentTheme === 'bluefield') {
    // DSGVO-Schild: heraldisches Schild mit Vorhängeschloss (Datenschutz).
    const cx = x + w / 2, cy = y + h / 2;
    const sw = w * 0.72, sh = h * 0.82;
    const pulse = 1 + Math.sin(t * 0.12) * 0.05;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
    const top = cy - sh / 2, bot = cy + sh / 2, left = cx - sw / 2, right = cx + sw / 2;
    ctx.shadowColor = 'rgba(70,130,255,0.7)'; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(right, top + sh * 0.18);
    ctx.lineTo(right, cy + sh * 0.08);
    ctx.quadraticCurveTo(right, bot - sh * 0.1, cx, bot);
    ctx.quadraticCurveTo(left, bot - sh * 0.1, left, cy + sh * 0.08);
    ctx.lineTo(left, top + sh * 0.18);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#4a7be0'); g.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(200,225,255,0.85)'; ctx.lineWidth = 1.6; ctx.stroke();
    // Vorhängeschloss
    const lw = sw * 0.36, lh = sh * 0.26, lx = cx - lw / 2, ly = cy - lh * 0.05;
    ctx.strokeStyle = '#eaf1ff'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(cx, ly, lw * 0.32, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#eaf1ff';
    ctx.beginPath(); ctx.roundRect(lx, ly, lw, lh, 2); ctx.fill();
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath(); ctx.arc(cx, ly + lh * 0.42, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - 0.8, ly + lh * 0.42, 1.6, lh * 0.4);
    ctx.restore();
    return;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2 - 1;
  const pulse = 1 + Math.sin(t * 0.12) * 0.06;
  ctx.save();
  // Outer halo.
  ctx.shadowColor = 'rgba(120, 200, 255, 0.7)';
  ctx.shadowBlur = 12;
  // Bubble fill.
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r * pulse);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(0.5, 'rgba(140, 220, 255, 0.45)');
  grad.addColorStop(1, 'rgba(40, 120, 220, 0.55)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Rim shimmer that rotates.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.4;
  const a0 = (t * 0.05) % (Math.PI * 2);
  ctx.beginPath();
  ctx.arc(cx, cy, r * pulse, a0, a0 + Math.PI * 0.6);
  ctx.stroke();
  // Top-left highlight pip.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.18, r * 0.1, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Drifting micro-bubbles around the rim.
  for (let i = 0; i < 3; i++) {
    const a = (t * 0.04 + i * 2.1) % (Math.PI * 2);
    const br = r + 2;
    ctx.fillStyle = 'rgba(200, 240, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * br, cy + Math.sin(a) * br, 1.2 + (i % 2) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ===========================================================================
// Zeitlupen-Uhr (Slow-Time Clock): pocket-watch face with two hands. The
// second-hand sweeps slowly so the icon reads as "time gadget".
// ===========================================================================
function drawClock(this: Renderer, x: number, y: number, w: number, h: number, t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2 - 2;
  ctx.save();
  // Soft purple aura.
  ctx.shadowColor = 'rgba(170, 130, 255, 0.7)';
  ctx.shadowBlur = 10;
  // Brass case ring.
  ctx.fillStyle = '#c8a64a';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // White face.
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff8e8';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.fill();
  // Tick marks at 12/3/6/9.
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r1 = r * 0.65;
    const r2 = i % 3 === 0 ? r * 0.78 : r * 0.74;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  // Hour hand (slow).
  const hourA = (t * 0.005) % (Math.PI * 2) - Math.PI / 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1a1a2a';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hourA) * r * 0.4, cy + Math.sin(hourA) * r * 0.4);
  ctx.stroke();
  // Minute hand (faster).
  const minA = (t * 0.025) % (Math.PI * 2) - Math.PI / 2;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(minA) * r * 0.6, cy + Math.sin(minA) * r * 0.6);
  ctx.stroke();
  // Second hand in red.
  const secA = (t * 0.12) % (Math.PI * 2) - Math.PI / 2;
  ctx.strokeStyle = '#d22f2f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(secA) * r * 0.7, cy + Math.sin(secA) * r * 0.7);
  ctx.stroke();
  // Centre pin.
  ctx.fillStyle = '#1a1a2a';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Crown on top of the case.
  ctx.fillStyle = '#c8a64a';
  ctx.fillRect(cx - 2, cy - r - 3, 4, 3);
  ctx.fillRect(cx - 1, cy - r - 5, 2, 2);
  ctx.restore();
}

/**
 * Mid-Level-Checkpoint-Flagge (Task #29). Schmalere Säule + Wimpel
 * statt der grossen Ziel-Flagge, damit Spielerinnen sofort sehen, dass
 * dies KEINE Levelende-Flagge ist. `active` flippt das Wimpel von
 * Stahlblau (noch nicht passiert) auf leuchtend Goldgelb mit Glow.
 */
function drawCheckpoint(
  this: Renderer,
  x: number, y: number, poleHeight: number,
  active: boolean, frame: number,
) {
  const ctx = this.ctx;
  const poleX = x + 3;      // linke Kante des Mastes
  const poleW = 4;          // etwas breiter -> liest sich als Mast, nicht als Strich
  const baseY = y + poleHeight; // Fuß steht auf dem Boden
  ctx.save();

  // Weicher Bodenschatten: verankert die Fahne sichtbar am Boden.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(poleX + poleW / 2, baseY, 11, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Fuß-Sockel (kleine Platte) am Boden.
  ctx.fillStyle = active ? '#b98f38' : '#6c6c7a';
  ctx.fillRect(poleX - 4, baseY - 3, poleW + 8, 3);

  // Mast mit rundlichem 3-Stop-Verlauf (Metall-Look statt flacher Strich).
  const g = ctx.createLinearGradient(poleX, 0, poleX + poleW, 0);
  if (active) {
    g.addColorStop(0, '#a8802e'); g.addColorStop(0.45, '#f0c860'); g.addColorStop(1, '#8f6a22');
  } else {
    g.addColorStop(0, '#63636f'); g.addColorStop(0.45, '#a6a6b6'); g.addColorStop(1, '#54545e');
  }
  ctx.fillStyle = g;
  ctx.fillRect(poleX, y, poleW, poleHeight);

  // Knauf oben.
  ctx.save();
  if (active) {
    ctx.shadowColor = 'rgba(255, 215, 80, 0.85)';
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = active ? '#ffd24a' : '#c2c2d2';
  ctx.beginPath();
  ctx.arc(poleX + poleW / 2, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Wimpel — größeres Dreieck direkt unter dem Knauf, aktiv sanft wehend.
  const wave = active ? Math.sin(frame * 0.06) * 2.5 : 0;
  const fy = y + 5;
  ctx.save();
  if (active) {
    ctx.shadowColor = 'rgba(255, 200, 60, 0.5)';
    ctx.shadowBlur = 6;
  }
  ctx.fillStyle = active ? '#ffcc33' : '#5b78a4';
  ctx.beginPath();
  ctx.moveTo(poleX + poleW, fy);
  ctx.lineTo(poleX + poleW + 20 + wave, fy + 7);
  ctx.lineTo(poleX + poleW, fy + 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Highlight-Streifen am Wimpel.
  ctx.fillStyle = active ? 'rgba(255,255,190,0.6)' : 'rgba(255,255,255,0.28)';
  ctx.fillRect(poleX + poleW + 1, fy + 3, 8, 1.5);
  ctx.restore();
}

// Sonder-Münze (Task #30): glitzernder, größerer Stern auf rotierender
// Goldscheibe. Optisch deutlich wertvoller als die normale Coin, damit
// die Spielerin sofort erkennt: das ist ein Sammlerstück.
function drawSpecialCoin(this: Renderer, x: number, y: number, w: number, h: number, t: number, slot = 0) {
  const ctx = this.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2 - 1;

  // Welt 19: drei Urlaubs-Andenken — Postkarte / Sonnenhut / Cocktail.
  if (this.currentTheme === 'vacation') { drawVacationSpecial(ctx, cx, cy, r, t, slot); return; }

  if (this.currentTheme === 'plush') {
    // Lieblings-Kuscheltier zum Sammeln: goldener Teddy / rosa Hase / Plüsch-Stern
    // (je Slot), sanft schwebend mit funkelndem Glanz-Halo.
    const bob = Math.sin(t * 0.08 + slot) * 2;
    const gy = cy + bob;
    ctx.save();
    // Glanz-Halo.
    const glow = ctx.createRadialGradient(cx, gy, 1, cx, gy, r * 2.1);
    glow.addColorStop(0, 'rgba(255,236,170,0.55)');
    glow.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, gy, r * 2.1, 0, Math.PI * 2); ctx.fill();
    // funkelnde Sternchen rundum.
    for (let k = 0; k < 4; k++) {
      const a = t * 0.06 + k * (Math.PI / 2);
      const sx = cx + Math.cos(a) * r * 1.6, sy = gy + Math.sin(a) * r * 1.6;
      ctx.fillStyle = `rgba(255,248,210,${0.4 + 0.4 * Math.abs(Math.sin(t * 0.1 + k))})`;
      ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI * 2); ctx.fill();
    }
    if (slot === 1) {
      // rosa Hase.
      ctx.fillStyle = '#f6d9e6';
      ctx.beginPath(); ctx.ellipse(cx, gy + r * 0.4, r * 0.8, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, gy - r * 0.2, r * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - r * 0.35, gy - r * 1.1, r * 0.24, r * 0.7, -0.2, 0, Math.PI * 2); ctx.ellipse(cx + r * 0.35, gy - r * 1.1, r * 0.24, r * 0.7, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a30'; ctx.beginPath(); ctx.arc(cx - r * 0.24, gy - r * 0.24, r * 0.12, 0, Math.PI * 2); ctx.arc(cx + r * 0.24, gy - r * 0.24, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f28ba6'; ctx.beginPath(); ctx.arc(cx, gy, r * 0.12, 0, Math.PI * 2); ctx.fill();
    } else if (slot === 2) {
      // Plüsch-Stern.
      ctx.fillStyle = '#f6d36a';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        ctx.lineTo(cx + Math.cos(a) * r * 1.2, gy + Math.sin(a) * r * 1.2);
        const a2 = a + Math.PI / 5;
        ctx.lineTo(cx + Math.cos(a2) * r * 0.55, gy + Math.sin(a2) * r * 0.55);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4a3a1a'; ctx.beginPath(); ctx.arc(cx - r * 0.3, gy - r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.arc(cx + r * 0.3, gy - r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
    } else {
      // goldener Teddy.
      ctx.fillStyle = '#eccb7a';
      ctx.beginPath(); ctx.ellipse(cx, gy + r * 0.45, r * 0.85, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, gy - r * 0.25, r * 0.66, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - r * 0.5, gy - r * 0.75, r * 0.28, 0, Math.PI * 2); ctx.arc(cx + r * 0.5, gy - r * 0.75, r * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4e2b4'; ctx.beginPath(); ctx.ellipse(cx, gy - r * 0.05, r * 0.3, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(cx - r * 0.26, gy - r * 0.34, r * 0.12, 0, Math.PI * 2); ctx.arc(cx + r * 0.26, gy - r * 0.34, r * 0.12, 0, Math.PI * 2); ctx.arc(cx, gy - r * 0.05, r * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (this.currentTheme === 'bluefield') {
    // Produkt-Chips statt Stern: U1 (live/grün), MatchSuite (build/amber),
    // GKV (geplant/hellblau). Slot 0..2 = Reihenfolge im specialCoins-Array.
    const products = [
      { label: 'U1', dot: '#3fe08a' },
      { label: 'MS', dot: '#ffc24a' },
      { label: 'GKV', dot: '#7fd0ff' },
    ];
    const p = products[slot] ?? products[0];
    const pulse = 0.7 + 0.3 * Math.sin(t * 0.1);
    const pw = w * 0.98, ph = h * 0.74;
    ctx.save();
    ctx.shadowColor = `rgba(30,72,214,${pulse})`;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#0e1c44';
    ctx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
    ctx.shadowBlur = 6;
    ctx.strokeStyle = `rgba(70,130,255,${0.7 + pulse * 0.3})`; ctx.lineWidth = 1.6;
    ctx.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);
    // Status-Punkt (Ecke)
    ctx.shadowColor = p.dot; ctx.shadowBlur = 6;
    ctx.fillStyle = p.dot;
    ctx.beginPath(); ctx.arc(cx + pw / 2 - 4, cy - ph / 2 + 4, 2.2, 0, Math.PI * 2); ctx.fill();
    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#eaf1ff';
    ctx.font = `bold ${Math.round(h * 0.4)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.label, cx, cy + 0.5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
    return;
  }

  const spin = Math.sin(t * 0.06);
  const rx = Math.max(2, Math.abs(spin) * r);
  ctx.save();
  // Glanz-Aura.
  ctx.shadowColor = 'rgba(255, 220, 80, 0.9)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Inneres Highlight.
  ctx.fillStyle = '#fff3a8';
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(1, rx * 0.55), r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stern in der Mitte (5-zackig). Nur zeichnen wenn die Münze grob
  // frontal steht — sonst sieht der Stern durch das schmale Oval verzerrt aus.
  if (Math.abs(spin) > 0.55) {
    const sr = r * 0.7;
    const sr2 = sr * 0.45;
    ctx.fillStyle = '#c98a08';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 === 0 ? sr : sr2;
      const px = cx + Math.cos(ang) * rr;
      const py = cy + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Funken / Sparkles um die Münze.
  const sparkleAlpha = 0.5 + Math.sin(t * 0.15) * 0.3;
  ctx.fillStyle = `rgba(255, 255, 200, ${sparkleAlpha.toFixed(2)})`;
  for (let i = 0; i < 4; i++) {
    const ang = t * 0.04 + i * Math.PI / 2;
    const dx = Math.cos(ang) * (r + 4);
    const dy = Math.sin(ang) * (r + 4);
    ctx.fillRect(cx + dx - 1, cy + dy - 1, 2, 2);
  }
  ctx.restore();
}

function drawSuperStar(this: Renderer, x: number, y: number, w: number, h: number, t: number) {
  const ctx = this.ctx;
  if (this.currentTheme === 'bluefield') {
    // GO-LIVE: strahlender Deploy-Kern (Play-Symbol) mit pulsierenden
    // Live-Broadcast-Ringen und rotierenden Funkeln — der Triumph-Moment.
    const cx = x + w / 2, cy = y + h / 2;
    const r = Math.min(w, h) / 2 - 1;
    const spin = t * 0.06;
    ctx.save();
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.8);
    halo.addColorStop(0, 'rgba(120,255,180,0.75)');
    halo.addColorStop(0.5, 'rgba(70,130,255,0.35)');
    halo.addColorStop(1, 'rgba(70,130,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.03) + i / 3) % 1;
      const rr = r * (0.5 + ph * 1.1);
      ctx.strokeStyle = `rgba(120,255,180,${(1 - ph) * 0.7})`;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(230,245,255,0.85)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = spin + (i / 8) * Math.PI * 2;
      const inner = r * 0.55, outer = r * (i % 2 === 0 ? 1.05 : 0.8);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.stroke();
    }
    const coreR = r * 0.5;
    const cg = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, 1, cx, cy, coreR);
    cg.addColorStop(0, '#eafff2'); cg.addColorStop(0.6, '#34d17a'); cg.addColorStop(1, '#1e7d48');
    ctx.fillStyle = cg;
    ctx.shadowColor = 'rgba(80,255,160,0.8)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - coreR * 0.26, cy - coreR * 0.42);
    ctx.lineTo(cx - coreR * 0.26, cy + coreR * 0.42);
    ctx.lineTo(cx + coreR * 0.44, cy);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    return;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2 - 1;
  const spin = t * 0.06;
  ctx.save();
  // Rainbow glow halo.
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.7);
  halo.addColorStop(0, 'rgba(255,240,150,0.8)');
  halo.addColorStop(0.5, 'rgba(255,140,220,0.4)');
  halo.addColorStop(1, 'rgba(120,180,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2);
  ctx.fill();
  // Spinning pinwheel of colored blades.
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  const colors = ['#ff5e7e', '#ffd24a', '#5ed8a0', '#5ea8ff', '#c77dff', '#ff9a4a'];
  const blades = 6;
  for (let i = 0; i < blades; i++) {
    ctx.rotate((Math.PI * 2) / blades);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.95, -r * 0.28);
    ctx.lineTo(r * 0.55, 0);
    ctx.lineTo(r * 0.95, r * 0.28);
    ctx.closePath();
    ctx.fill();
  }
  // White centre hub.
  ctx.rotate(-spin);
  ctx.fillStyle = '#fffefb';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const itemsMethods = {
  drawFireball,
  drawGhost,
  drawFish,
  drawHeart,
  drawCandy,
  drawStar,
  drawCoin,
  drawIdeaBulb,
  drawSpinningCoin,
  drawSpecialCoin,
  drawFlag,
  drawCheckpoint,
  drawFireFlower,
  drawCoinMagnet,
  drawPlayerFireball,
  drawCape,
  drawWings,
  drawShield,
  drawClock,
  drawSuperStar,
};
