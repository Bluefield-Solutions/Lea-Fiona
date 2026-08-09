import type { Renderer } from '../renderer.ts';

// Grafik-Feinschliff: weicher, weltgetönter Gegner-Schatten. Zwei überlagerte
// Ellipsen derselben (bereits alpha-behafteten) Theme-Schattenfarbe — der Kern
// wird dichter, der Rand bleibt zart → ein Falloff-Eindruck ohne teuren Gradient
// und ohne die Grundfläche zu vergrößern. Ersetzt den flachen Einzel-Ellipsen-
// Schatten, der „aufgeklebt" wirkte.
export function softShadowEllipse(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: string,
) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, Math.max(1, ry), 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.62, Math.max(1, ry * 0.62), 0, 0, Math.PI * 2); ctx.fill();
}

// Kleiner Helfer: abgerundeter Rechteck-Pfad (ohne Abhängigkeit von ctx.roundRect).
function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function getCachedGoomba(this: Renderer, w: number, h: number, isDead: boolean): HTMLCanvasElement {
  const accent = this.getThemeAccent();
  const key = `goomba_${this.currentTheme}_${w}_${h}_${isDead}`;
  let cached = this.spriteCache.get(key);
  if (cached) return cached;

  const pad = 8;
  const c = document.createElement('canvas');
  c.width = w + pad * 2;
  c.height = h + pad * 2;
  const ctx = c.getContext('2d')!;
  const ox = pad;
  const oy = pad;
  const cx = ox + w / 2;

  // Per-world soft rim halo baked behind the body silhouette.
  ctx.save();
  ctx.shadowColor = accent.rim;
  ctx.shadowBlur = 7;
  ctx.fillStyle = accent.rim;
  ctx.beginPath();
  ctx.ellipse(cx, oy + h * 0.42, w * 0.5, h * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Unterer Körper / Stiel (heller, weicher Beige-Verlauf) ──────────────
  const bodyGrad = ctx.createRadialGradient(cx - w * 0.1, oy + h * 0.55, 2, cx, oy + h * 0.6, w * 0.5);
  bodyGrad.addColorStop(0, '#eccea0');
  bodyGrad.addColorStop(0.5, '#c89e64');
  bodyGrad.addColorStop(1, '#946c36');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(cx, oy + h * 0.62, w * 0.4, h * 0.33, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Pilzkappe (oben, dunkler, deutlich gewölbt) ─────────────────────────
  const capGrad = ctx.createRadialGradient(cx - w * 0.15, oy + h * 0.12, 2, cx, oy + h * 0.3, w * 0.6);
  capGrad.addColorStop(0, '#b67e46');
  capGrad.addColorStop(0.4, '#8c5a2a');
  capGrad.addColorStop(0.75, '#5e3a14');
  capGrad.addColorStop(1, '#3c250b');
  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.ellipse(cx, oy + h * 0.4, w * 0.5, h * 0.4, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + w * 0.5, oy + h * 0.44);
  ctx.quadraticCurveTo(cx, oy + h * 0.56, cx - w * 0.5, oy + h * 0.44);
  ctx.closePath();
  ctx.fill();

  // Kappenrand-Schattenkante (Übergang Kappe → Gesicht)
  ctx.fillStyle = 'rgba(58,36,12,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, oy + h * 0.49, w * 0.47, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Helle Pilz-Sprenkel auf der Kappe
  ctx.fillStyle = 'rgba(232,204,156,0.55)';
  const spots: Array<[number, number, number]> = [
    [-0.26, 0.16, 0.085], [0.2, 0.12, 0.07], [0.0, 0.04, 0.06],
    [-0.08, 0.3, 0.05], [0.3, 0.28, 0.05], [-0.34, 0.32, 0.04],
  ];
  for (const [sx, sy, sr] of spots) {
    ctx.beginPath();
    ctx.ellipse(cx + sx * w, oy + sy * h, sr * w, sr * w * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Glanzbogen oben
  ctx.fillStyle = 'rgba(255,242,214,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.16, oy + h * 0.1, w * 0.2, h * 0.07, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── Gesicht ─────────────────────────────────────────────────────────────
  const eyeLX = ox + w * 0.33;
  const eyeRX = ox + w * 0.67;
  const eyeY = oy + h * 0.52;

  if (isDead) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    for (let side = 0; side < 2; side++) {
      const ex = side === 0 ? eyeLX : eyeRX;
      ctx.beginPath();
      ctx.moveTo(ex - 3, eyeY - 3);
      ctx.lineTo(ex + 3, eyeY + 3);
      ctx.moveTo(ex + 3, eyeY - 3);
      ctx.lineTo(ex - 3, eyeY + 3);
      ctx.stroke();
    }
  } else {
    // Große, lebendige Augen
    for (let side = 0; side < 2; side++) {
      const ex = side === 0 ? eyeLX : eyeRX;
      ctx.fillStyle = '#FFFFF2';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 6, 7.2, side === 0 ? -0.08 : 0.08, 0, Math.PI * 2);
      ctx.fill();
      // Iris
      ctx.fillStyle = '#7a3d14';
      ctx.beginPath();
      ctx.arc(ex + (side === 0 ? 1.2 : -1.2), eyeY + 1.2, 3.4, 0, Math.PI * 2);
      ctx.fill();
      // Pupille
      ctx.fillStyle = '#140800';
      ctx.beginPath();
      ctx.arc(ex + (side === 0 ? 1.6 : -1.6), eyeY + 1.2, 2.1, 0, Math.PI * 2);
      ctx.fill();
      // Glanzpunkte
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(ex + (side === 0 ? 3 : -0.6), eyeY - 1.6, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent.glint;
      ctx.beginPath();
      ctx.arc(ex + (side === 0 ? 2.2 : -1.3), eyeY - 3, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Markante, zusammengezogene Augenbrauen (entschlossener Blick)
    ctx.strokeStyle = '#241300';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(eyeLX - 5.5, eyeY - 7);
    ctx.lineTo(eyeLX + 2, eyeY - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eyeRX + 5.5, eyeY - 7);
    ctx.lineTo(eyeRX - 2, eyeY - 4);
    ctx.stroke();

    // Mund mit Reißzähnen
    ctx.fillStyle = '#3a1d08';
    ctx.beginPath();
    ctx.ellipse(cx, oy + h * 0.66, w * 0.16, h * 0.05, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#FFFFF2';
    const teethY = oy + h * 0.64;
    for (let i = 0; i < 2; i++) {
      const tx = cx + (i === 0 ? -w * 0.09 : w * 0.09);
      ctx.beginPath();
      ctx.moveTo(tx - 2.2, teethY);
      ctx.lineTo(tx, teethY + 4);
      ctx.lineTo(tx + 2.2, teethY);
      ctx.closePath();
      ctx.fill();
    }
  }

  this.spriteCache.set(key, c);
  return c;
}

/**
 * Blittet den orangen Lauf-Dino (aus User-Bild) fuess-zentriert. Über hue-rotate
 * werden aus dem EINEN Bild mehrere Plüsch-Dino-Arten abgeleitet (orange Läufer,
 * grüner Hüpfer, blauer Panzer). Sprite ist nach LINKS gebacken -> bei
 * direction===1 (nach rechts) spiegeln. Gibt false zurück, wenn Sprites noch
 * nicht geladen sind (Aufrufer zeichnet dann einen Platzhalter).
 */
export function drawDinoSprite(
  r: Renderer, x: number, y: number, w: number, h: number,
  frame: number, direction: number,
  opts: { scale?: number; hue?: number; sat?: number; isDead?: boolean; stretch?: number } = {},
): boolean {
  const frames = r.dinoWalkFrames;
  const ref = frames && frames[0];
  if (!ref) return false;
  const ctx = r.ctx;
  const { scale = 1.4, hue = 0, sat = 1, isDead = false, stretch = 0 } = opts;
  ctx.save();
  const cx = x + w / 2;
  let drawH = h * scale * (isDead ? 0.72 : 1);
  let drawW = drawH * (ref.width / ref.height);
  if (stretch) { drawH *= 1 + stretch; drawW *= 1 - stretch * 0.5; }
  const idx = isDead ? 0 : Math.floor(frame * 0.28) % 6;
  const f = frames[idx] || ref;
  ctx.translate(cx, y + h);
  if (direction === 1) ctx.scale(-1, 1);
  if (hue) ctx.filter = `hue-rotate(${hue}deg) saturate(${sat})`;
  if (isDead) { ctx.translate(0, drawH * 0.3); ctx.scale(1, -1); ctx.translate(0, -drawH); }
  ctx.drawImage(f, -drawW / 2, -drawH, drawW, drawH);
  ctx.restore();
  return true;
}

function drawGoomba(this: Renderer, x: number, y: number, w: number, h: number, frame: number, isDead: boolean, direction: number = -1) {
  const ctx = this.ctx;
  if (this.currentTheme === 'plush') {
    // Oranger Lauf-Dino (aus User-Bild), jetzt deutlich grösser.
    if (drawDinoSprite(this, x, y, w, h, frame, direction, { scale: 1.62, isDead })) return;
    // Fallback (Sprites noch nicht geladen): schlichter Platzhalter.
    ctx.save();
    ctx.fillStyle = '#e8863a';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.6, w * 0.36, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  if (this.currentTheme === 'school') {
    // Radiergummi: rosa Körper mit blauer Oberkante, Augen, laufende Füße.
    ctx.save();
    const bx = x + 4, bw = w - 8;
    let by = y + 4, bh = h - 8;
    if (isDead) { by = y + h * 0.6; bh = h * 0.34; }
    const acc = this.getThemeAccent();
    // Weicher Grund-Schatten für Volumen.
    if (!isDead) {
      softShadowEllipse(ctx, bx + bw / 2, by + bh + 2, bw * 0.5, 3, acc.shadow);
    }
    const rr = Math.min(6, bh * 0.28);
    // Gummikörper mit senkrechtem Verlauf (hell oben → satt unten) statt platter Fläche.
    const bodyGrad = ctx.createLinearGradient(0, by, 0, by + bh);
    bodyGrad.addColorStop(0, '#ffc2d2');
    bodyGrad.addColorStop(0.5, '#ee96aa');
    bodyGrad.addColorStop(1, '#d97a92');
    ctx.fillStyle = bodyGrad;
    rrPath(ctx, bx, by, bw, bh, rr);
    ctx.fill();
    // Blaues Kopf-Band mit eigenem Verlauf.
    const bandH = Math.max(3, bh * 0.32);
    const bandGrad = ctx.createLinearGradient(0, by, 0, by + bandH);
    bandGrad.addColorStop(0, '#9cc4ee');
    bandGrad.addColorStop(1, '#5f92cc');
    ctx.fillStyle = bandGrad;
    ctx.save();
    rrPath(ctx, bx, by, bw, bh, rr);
    ctx.clip();
    ctx.fillRect(bx, by, bw, bandH);
    ctx.restore();
    // Glanzlicht oben links + weiche Kontur.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.16, by + 2.5);
    ctx.lineTo(bx + bw * 0.5, by + 2.5);
    ctx.stroke();
    ctx.strokeStyle = '#b46478'; ctx.lineWidth = 1.6;
    rrPath(ctx, bx + 0.8, by + 0.8, bw - 1.6, bh - 1.6, rr - 0.6);
    ctx.stroke();
    if (!isDead) {
      const eyeY = by + bh * 0.58;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(bx + bw * 0.34, eyeY, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + bw * 0.66, eyeY, 3.2, 0, Math.PI * 2); ctx.fill();
      const look = Math.sin(frame * 0.1) * 1;
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(bx + bw * 0.34 + look, eyeY, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + bw * 0.66 + look, eyeY, 1.5, 0, Math.PI * 2); ctx.fill();
      const step = Math.sin(frame * 0.25) * 3;
      ctx.fillStyle = '#6a4a52';
      ctx.beginPath(); ctx.ellipse(bx + bw * 0.28 + step, by + bh + 1, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx + bw * 0.72 - step, by + bh + 1, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (this.currentTheme === 'bluefield') {
    // „Bug" (Software-Fehler / schlechte Idee): rot-oranger Käfer zum Zertreten.
    ctx.save();
    const bx = x + 4, bw = w - 8;
    let by = y + 5, bh = h - 9;
    if (isDead) { by = y + h * 0.62; bh = h * 0.30; }
    ctx.fillStyle = '#e5533a';
    ctx.beginPath();
    ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a32e1c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx + bw / 2, by + 2); ctx.lineTo(bx + bw / 2, by + bh - 2); ctx.stroke();
    ctx.fillStyle = '#7a2114';
    ctx.beginPath(); ctx.arc(bx + bw * 0.32, by + bh * 0.42, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + bw * 0.68, by + bh * 0.42, 2, 0, Math.PI * 2); ctx.fill();
    if (!isDead) {
      const wob = Math.sin(frame * 0.2) * 1.5;
      ctx.strokeStyle = '#7a2114'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx + bw * 0.4, by + 2); ctx.lineTo(bx + bw * 0.32 + wob, by - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + bw * 0.6, by + 2); ctx.lineTo(bx + bw * 0.68 + wob, by - 5); ctx.stroke();
      ctx.fillStyle = '#ffd34a';
      ctx.beginPath(); ctx.arc(bx + bw * 0.32 + wob, by - 5, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + bw * 0.68 + wob, by - 5, 1.6, 0, Math.PI * 2); ctx.fill();
      const eyeY = by + bh * 0.52;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(bx + bw * 0.36, eyeY, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + bw * 0.64, eyeY, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(bx + bw * 0.36, eyeY, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + bw * 0.64, eyeY, 1.4, 0, Math.PI * 2); ctx.fill();
      const step = Math.sin(frame * 0.3) * 2.5;
      ctx.strokeStyle = '#a32e1c'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const lx = bx + bw * (0.3 + i * 0.2);
        ctx.beginPath(); ctx.moveTo(lx, by + bh - 2); ctx.lineTo(lx - 3 + step, by + bh + 4); ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
  const pad = 8;
  const cached = this.getCachedGoomba(w, h, isDead);
  const accent = this.getThemeAccent();

  ctx.save();
  if (isDead) {
    ctx.translate(x, y + h * 0.7);
    ctx.scale(1, 0.3);
    ctx.translate(0, -h * 0.7);
  }

  if (!isDead) {
    softShadowEllipse(ctx, x + w / 2, y + h + 1, w * 0.4, 3, accent.shadow);

    const walkOffset = Math.sin(frame * 0.3) * 2.5;
    const footW = w * 0.22;
    const footH = h * 0.14;
    ctx.fillStyle = '#3a2208';
    for (let side = 0; side < 2; side++) {
      const fx = side === 0 ? x + w * 0.22 : x + w * 0.78;
      const fy = y + h - footH * 0.5 + (side === 0 ? walkOffset : -walkOffset);
      ctx.beginPath();
      ctx.ellipse(fx, fy, footW, footH, side === 0 ? -0.2 : 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.drawImage(cached, x - pad, y - pad);
  ctx.restore();
}

function getCachedKoopa(this: Renderer, w: number, h: number, isShell: boolean): HTMLCanvasElement {
  const accent = this.getThemeAccent();
  const key = `koopa_${this.currentTheme}_${w}_${h}_${isShell}`;
  let cached = this.spriteCache.get(key);
  if (cached) return cached;

  const pad = 14;
  const c = document.createElement('canvas');
  c.width = w + pad * 2;
  c.height = h + pad * 2;
  const ctx = c.getContext('2d')!;
  const cx = pad + w / 2;

  // ── Wiederverwendbarer Panzer (Carapax) im Cartoon-Stil ──────────────────
  // Grüne Kuppel mit hellem Saum, Segment-Naht und Glanz.
  const paintShell = (scx: number, scy: number, rw: number, rh: number, full: boolean) => {
    // Heller Saum/Rand (gelblicher Wulst)
    ctx.fillStyle = '#e9d77a';
    ctx.beginPath();
    ctx.ellipse(scx, scy, rw, rh, 0, full ? 0 : Math.PI, full ? Math.PI * 2 : Math.PI * 2);
    if (!full) { ctx.lineTo(scx - rw, scy + rh * 0.18); ctx.lineTo(scx + rw, scy + rh * 0.18); ctx.closePath(); }
    ctx.fill();
    // Grüne Kuppel (etwas kleiner, sitzt im Saum)
    const g = ctx.createRadialGradient(scx - rw * 0.32, scy - rh * 0.5, 2, scx, scy, rw * 1.1);
    g.addColorStop(0, '#7ee084');
    g.addColorStop(0.35, '#46c25a');
    g.addColorStop(0.7, '#2a9440');
    g.addColorStop(1, '#176e2a');
    ctx.fillStyle = g;
    ctx.beginPath();
    const irw = rw * 0.82, irh = rh * (full ? 0.82 : 0.86);
    ctx.ellipse(scx, scy - (full ? 0 : rh * 0.04), irw, irh, 0, full ? 0 : Math.PI, full ? Math.PI * 2 : Math.PI * 2);
    if (!full) { ctx.lineTo(scx - irw, scy + rh * 0.12); ctx.lineTo(scx + irw, scy + rh * 0.12); ctx.closePath(); }
    ctx.fill();
    // Segment-Nähte (Carapax-Platten)
    ctx.strokeStyle = 'rgba(18,70,28,0.55)';
    ctx.lineWidth = 1.3;
    for (let s = -1; s <= 1; s++) {
      ctx.beginPath();
      ctx.moveTo(scx + s * irw * 0.55, scy - irh * 0.7);
      ctx.quadraticCurveTo(scx + s * irw * 0.75, scy, scx + s * irw * 0.55, scy + irh * 0.5);
      ctx.stroke();
    }
    // zentrale Plattenkontur
    ctx.beginPath();
    ctx.ellipse(scx, scy - irh * 0.08, irw * 0.42, irh * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Glanz
    ctx.fillStyle = 'rgba(255,255,220,0.22)';
    ctx.beginPath();
    ctx.ellipse(scx - rw * 0.34, scy - rh * 0.42, rw * 0.24, rh * 0.16, -0.3, 0, Math.PI * 2);
    ctx.fill();
  };

  if (isShell) {
    // Eingezogener Panzer: kompakte Kuppel + Plastron-Streifen darunter.
    paintShell(cx, pad + h * 0.46, w * 0.52, h * 0.46, true);
    ctx.fillStyle = '#f0e2ad';
    ctx.beginPath();
    ctx.ellipse(cx, pad + h * 0.74, w * 0.4, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,130,70,0.5)';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * w * 0.14, pad + h * 0.64);
      ctx.lineTo(cx + i * w * 0.14, pad + h * 0.84);
      ctx.stroke();
    }
    this.spriteCache.set(key, c);
    return c;
  }

  // ── Aufrechte Cartoon-Schildkröte (Seitenansicht, schaut nach rechts) ──
  const skin = '#d8c24e';
  const skinLt = '#ead86a';
  const skinDk = '#a98f30';

  // Schwanz (hinten links)
  ctx.fillStyle = skinDk;
  ctx.beginPath();
  ctx.moveTo(pad + w * 0.2, pad + h * 0.68);
  ctx.quadraticCurveTo(pad + w * 0.02, pad + h * 0.74, pad + w * 0.08, pad + h * 0.86);
  ctx.quadraticCurveTo(pad + w * 0.2, pad + h * 0.8, pad + w * 0.28, pad + h * 0.74);
  ctx.closePath();
  ctx.fill();

  // Hinteres Bein (dunkler, hinter dem Körper)
  ctx.fillStyle = skinDk;
  ctx.beginPath();
  ctx.ellipse(pad + w * 0.34, pad + h * 0.86, w * 0.13, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bauch / Plastron (vorne, cremig, mit Segmenten)
  const bellyGrad = ctx.createLinearGradient(cx, pad + h * 0.45, cx + w * 0.4, pad + h * 0.8);
  bellyGrad.addColorStop(0, '#f4e8b8');
  bellyGrad.addColorStop(1, '#d8c488');
  ctx.fillStyle = bellyGrad;
  ctx.beginPath();
  ctx.ellipse(pad + w * 0.62, pad + h * 0.62, w * 0.3, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,130,70,0.4)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(pad + w * 0.44, pad + h * (0.52 + i * 0.12));
    ctx.lineTo(pad + w * 0.8, pad + h * (0.52 + i * 0.12));
    ctx.stroke();
  }

  // Vorderes Ärmchen
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(pad + w * 0.78, pad + h * 0.56, w * 0.1, h * 0.08, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Panzer (Rücken, gewölbt – sitzt hinten/oben über dem Rumpf)
  paintShell(pad + w * 0.42, pad + h * 0.52, w * 0.4, h * 0.32, true);

  // Hals
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(pad + w * 0.55, pad + h * 0.34);
  ctx.lineTo(pad + w * 0.74, pad + h * 0.28);
  ctx.lineTo(pad + w * 0.76, pad + h * 0.46);
  ctx.lineTo(pad + w * 0.58, pad + h * 0.5);
  ctx.closePath();
  ctx.fill();

  // Kopf (groß, cartoonhaft)
  const headX = pad + w * 0.72;
  const headY = pad + h * 0.22;
  const headGrad = ctx.createRadialGradient(headX - 3, headY - 3, 1, headX, headY, w * 0.4);
  headGrad.addColorStop(0, skinLt);
  headGrad.addColorStop(0.65, skin);
  headGrad.addColorStop(1, skinDk);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(headX, headY, w * 0.34, h * 0.21, 0, 0, Math.PI * 2);
  ctx.fill();

  // Schnabelartige Schnauze (vorne)
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(headX + w * 0.26, headY + h * 0.04, w * 0.16, h * 0.1, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Nasenlöcher
  ctx.fillStyle = skinDk;
  ctx.beginPath();
  ctx.arc(headX + w * 0.38, headY + h * 0.02, 1, 0, Math.PI * 2);
  ctx.fill();
  // Mund (freches Lächeln)
  ctx.strokeStyle = '#6a5418';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(headX + w * 0.24, headY + h * 0.1, w * 0.12, 0.1, 1.1);
  ctx.stroke();

  // Großes Auge mit Lid (frech)
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(headX + w * 0.06, headY - h * 0.04, w * 0.15, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  // oberes Lid (gibt entschlossenen Blick)
  ctx.fillStyle = skinDk;
  ctx.beginPath();
  ctx.ellipse(headX + w * 0.06, headY - h * 0.12, w * 0.16, h * 0.07, 0, 0, Math.PI);
  ctx.fill();
  // Pupille
  ctx.fillStyle = '#100c00';
  ctx.beginPath();
  ctx.arc(headX + w * 0.11, headY - h * 0.02, w * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(headX + w * 0.13, headY - h * 0.05, w * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent.glint;
  ctx.beginPath();
  ctx.arc(headX + w * 0.09, headY - h * 0.06, w * 0.018, 0, Math.PI * 2);
  ctx.fill();

  this.spriteCache.set(key, c);
  return c;
}

function drawKoopa(this: Renderer, x: number, y: number, w: number, h: number, direction: number, frame: number, isShell: boolean) {
  const ctx = this.ctx;
  if (this.currentTheme === 'plush') {
    // Panzer-Dino: grosser blau-violetter Plüsch-Dino (aus dem User-Bild
    // abgeleitet). Beim Draufhüpfen rollt er sich zu einem schlafenden
    // Panzer-Ei ein und lässt sich wegschubsen.
    const cx = x + w / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(cx, y + h + 1, w * 0.42, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (isShell) {
      // Eingerollt: knuffiges blaues Panzer-Ei mit goldenem Platten-Kranz.
      ctx.save();
      const r = Math.min(w, h) * 0.5;
      const cyS = y + h - r;
      ctx.fillStyle = '#f2c05a';
      for (let k = 0; k < 6; k++) {
        const a = k * (Math.PI / 3) + frame * 0.1;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cyS + Math.sin(a) * r);
        ctx.lineTo(cx + Math.cos(a) * (r + 5), cyS + Math.sin(a) * (r + 5));
        ctx.lineTo(cx + Math.cos(a + 0.25) * r, cyS + Math.sin(a + 0.25) * r); ctx.closePath(); ctx.fill();
      }
      const g = ctx.createRadialGradient(cx - r * 0.3, cyS - r * 0.25, 1, cx, cyS, r * 1.2);
      g.addColorStop(0, '#b9a7ee'); g.addColorStop(1, '#8b6fd0');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cyS, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(cx - r * 0.35, cyS - r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill();
      // schlafende Augen.
      ctx.strokeStyle = '#3a2f5a'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      for (const ex of [cx - r * 0.34, cx + r * 0.34]) { ctx.beginPath(); ctx.arc(ex, cyS - r * 0.02, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
      ctx.restore();
      return;
    }
    // Laufender Panzer-Dino: gross, blau-violett (hue-rotate aus Orange).
    if (drawDinoSprite(this, x, y, w, h, frame, direction, { scale: 1.78, hue: 205, sat: 1.12 })) return;
    ctx.save(); ctx.fillStyle = '#8b6fd0';
    ctx.beginPath(); ctx.ellipse(cx, y + h * 0.6, w * 0.36, h * 0.36, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    return;
  }
  if (this.currentTheme === 'bluefield') {
    // „Legacy-System": Panzer als altes Server-Gehäuse mit blinkenden LEDs.
    ctx.save();
    const bx = x + 3, bw = w - 6;
    const shellTop = y + (isShell ? h * 0.30 : h * 0.20);
    const shellH = isShell ? h * 0.60 : h * 0.56;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 1, w * 0.36, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (!isShell) {
      const walk = Math.sin(frame * 0.25) * 2.2;
      ctx.fillStyle = '#3a64c8';
      for (let s = 0; s < 2; s++) {
        const fx = bx + bw * (s === 0 ? 0.32 : 0.68);
        const fy = y + h - 3 + (s === 0 ? walk : -walk);
        ctx.beginPath(); ctx.ellipse(fx, fy, w * 0.1, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#4a7be0';
      ctx.beginPath(); ctx.ellipse(bx + bw * (direction < 0 ? 0.22 : 0.78), shellTop + 2, bw * 0.16, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#33415e';
    ctx.beginPath(); ctx.roundRect(bx, shellTop, bw, shellH, 5); ctx.fill();
    ctx.strokeStyle = '#1b2740'; ctx.lineWidth = 2; ctx.stroke();
    const leds = ['#3fe08a', '#ffc24a', '#7fd0ff'];
    for (let i = 0; i < 3; i++) {
      const on = (Math.floor(frame * 0.1) + i) % 2 === 0;
      ctx.fillStyle = on ? leds[i] : 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.arc(bx + 7 + i * 7, shellTop + 7, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(120,150,220,0.45)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ly = shellTop + shellH * 0.5 + i * 4;
      ctx.beginPath(); ctx.moveTo(bx + bw * 0.5, ly); ctx.lineTo(bx + bw * 0.85, ly); ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const pad = 14;
  const cached = this.getCachedKoopa(w, h, isShell);

  ctx.save();
  ctx.translate(x + w / 2, y);
  if (direction < 0) ctx.scale(-1, 1);
  ctx.translate(-w / 2, 0);

  softShadowEllipse(ctx, w / 2, h + 1, w * 0.38, 3, this.getThemeAccent().shadow);

  if (!isShell) {
    // Zwei aufrechte Stummelbeine mit Füßchen, im Gegentakt animiert.
    const walkOffset = Math.sin(frame * 0.25) * 2.2;
    for (let side = 0; side < 2; side++) {
      const fx = side === 0 ? w * 0.4 : w * 0.6;
      const fy = h - 3 + (side === 0 ? walkOffset : -walkOffset);
      const grad = ctx.createRadialGradient(fx, fy - 2, 1, fx, fy, 7);
      grad.addColorStop(0, '#ead86a');
      grad.addColorStop(1, '#a98f30');
      ctx.fillStyle = grad;
      // Bein
      ctx.beginPath();
      ctx.ellipse(fx, fy - 2, w * 0.11, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fuß (vorne breiter)
      ctx.fillStyle = '#8a7026';
      ctx.beginPath();
      ctx.ellipse(fx + w * 0.04, fy + 1, w * 0.13, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.drawImage(cached, -pad, -pad);
  ctx.restore();
}

function getCachedBatBody(this: Renderer, w: number, h: number): HTMLCanvasElement {
  const accent = this.getThemeAccent();
  const key = `bat_body_${this.currentTheme}_${w}_${h}`;
  let cached = this.spriteCache.get(key);
  if (cached) return cached;

  const pad = 10;
  const c = document.createElement('canvas');
  c.width = w + pad * 2;
  c.height = h + pad * 2;
  const ctx = c.getContext('2d')!;
  const bodyCX = pad + w / 2;
  const bodyCY = pad + h * 0.5;

  // Per-world rim halo behind the body silhouette.
  ctx.save();
  ctx.shadowColor = accent.rim;
  ctx.shadowBlur = 6;
  ctx.fillStyle = accent.rim;
  ctx.beginPath();
  ctx.ellipse(bodyCX, bodyCY, w * 0.22, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bodyGrad = ctx.createRadialGradient(bodyCX - 2, bodyCY - 3, 1, bodyCX, bodyCY, w * 0.22);
  bodyGrad.addColorStop(0, '#6a4580');
  bodyGrad.addColorStop(0.4, '#4a3060');
  bodyGrad.addColorStop(0.8, '#3a2248');
  bodyGrad.addColorStop(1, '#2a1535');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(bodyCX, bodyCY, w * 0.2, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(80,50,100,0.4)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const fr = w * 0.19 + Math.sin(i * 3.7) * 1.5;
    const bx = bodyCX + Math.cos(angle) * fr;
    const by = bodyCY + Math.sin(angle) * (h * 0.29);
    const outX = bx + Math.cos(angle) * (2 + Math.sin(i * 2.3) * 1);
    const outY = by + Math.sin(angle) * 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(outX, outY);
    ctx.stroke();
  }

  for (let side = -1; side <= 1; side += 2) {
    const earX = bodyCX + side * w * 0.1;
    const earBaseY = bodyCY - h * 0.25;
    const earTipY = pad + h * 0.05;
    ctx.fillStyle = '#3a2248';
    ctx.beginPath();
    ctx.moveTo(earX - side * 2, earBaseY);
    ctx.lineTo(earX + side * 5, earTipY);
    ctx.lineTo(earX + side * 8, earBaseY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cc7799';
    ctx.beginPath();
    ctx.moveTo(earX, earBaseY + 2);
    ctx.lineTo(earX + side * 4, earTipY + 5);
    ctx.lineTo(earX + side * 6, earBaseY + 3);
    ctx.closePath();
    ctx.fill();
  }

  this.spriteCache.set(key, c);
  return c;
}

function drawBat(this: Renderer, x: number, y: number, w: number, h: number, frame: number, direction: number = -1) {
  const ctx = this.ctx;
  if (this.currentTheme === 'plush') {
    // Flatter-Dino: kleiner rosa Plüsch-Dino (aus dem Bild) mit weichen,
    // flatternden Herz-Flügeln, sanft schwebend.
    const cx = x + w / 2, cy = y + h / 2;
    const flap = Math.sin(frame * 0.2) * 0.5;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(cx, y + h + 6, w * 0.3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    // weiche Flügel (flatternd)
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + side * w * 0.28, cy - h * 0.05);
      ctx.rotate(side * (0.35 - flap));
      ctx.fillStyle = 'rgba(255,178,220,0.92)';
      ctx.beginPath(); ctx.ellipse(side * w * 0.42, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,224,240,0.8)';
      ctx.beginPath(); ctx.ellipse(side * w * 0.42, 0, w * 0.28, h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // Körper: rosa umgefärbter Dino-Sprite (fuss-zentriert im Flug-Kasten)
    if (!drawDinoSprite(this, x, y, w, h, frame, direction, { scale: 1.16, hue: 300, sat: 1.2 })) {
      ctx.save(); ctx.fillStyle = '#f4a4cf';
      ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.32, h * 0.42, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    return;
  }
  const wingAngle = Math.sin(frame * 0.15) * 0.6;
  const wingAngle2 = Math.sin(frame * 0.15 + 0.3) * 0.4;

  const accent = this.getThemeAccent();
  softShadowEllipse(ctx, x + w / 2, y + h + 2, w * 0.25, 2.5, accent.shadow);

  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    const wingX = x + w * (side === -1 ? 0.32 : 0.68);
    ctx.translate(wingX, y + h * 0.38);
    ctx.rotate(side === -1 ? -wingAngle : wingAngle);

    ctx.fillStyle = 'rgba(90,45,120,0.75)';

    const jointX1 = side * w * 0.2;
    const jointY1 = -h * 0.15 + wingAngle2 * side * 3;
    const tipX = side * w * 0.45;
    const tipY = h * 0.05 + wingAngle2 * side * 5;
    const scallop1X = side * w * 0.35;
    const scallop1Y = h * 0.2;
    const scallop2X = side * w * 0.2;
    const scallop2Y = h * 0.18;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(jointX1 * 0.5, jointY1 - h * 0.08, jointX1, jointY1);
    ctx.quadraticCurveTo((jointX1 + tipX) * 0.5, (jointY1 + tipY) * 0.5 - h * 0.1, tipX, tipY);
    ctx.quadraticCurveTo(tipX - side * 3, tipY + h * 0.12, scallop1X, scallop1Y);
    ctx.quadraticCurveTo(scallop1X - side * 5, scallop1Y + 3, scallop2X, scallop2Y);
    ctx.quadraticCurveTo(scallop2X - side * 3, scallop2Y + 2, 0, h * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(60,25,80,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(jointX1 * 0.5, jointY1 - h * 0.05, jointX1, jointY1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(jointX1, jointY1);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(jointX1 * 0.3, jointY1 * 0.3);
    ctx.lineTo(scallop2X, scallop2Y - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(jointX1 * 0.7, jointY1 * 0.7);
    ctx.lineTo(scallop1X, scallop1Y - 2);
    ctx.stroke();

    ctx.restore();
  }

  const batBody = this.getCachedBatBody(w, h);
  ctx.drawImage(batBody, x - 10, y - 10);

  const bodyCX = x + w / 2;
  const bodyCY = y + h * 0.5;

  for (let side = -1; side <= 1; side += 2) {
    const eyeX = bodyCX + side * w * 0.07;
    const eyeY = bodyCY - h * 0.05;

    ctx.save();
    ctx.shadowColor = 'rgba(255,50,50,0.6)';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ff6644';
    ctx.beginPath();
    ctx.arc(eyeX - 0.5, eyeY - 0.8, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(eyeX + 1, eyeY - 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent.glint;
    ctx.beginPath();
    ctx.arc(eyeX + 1.6, eyeY - 1.7, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#EEEEEE';
  const fangY = bodyCY + h * 0.12;
  ctx.beginPath();
  ctx.moveTo(bodyCX - 3, fangY);
  ctx.lineTo(bodyCX - 2, fangY + 4);
  ctx.lineTo(bodyCX - 1, fangY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bodyCX + 1, fangY);
  ctx.lineTo(bodyCX + 2, fangY + 4);
  ctx.lineTo(bodyCX + 3, fangY);
  ctx.closePath();
  ctx.fill();
}

// Stampf-Boss: großer, bedrohlicher Gegner mit HP-Pips über dem Kopf.
// Braucht drei Treffer von oben. hitFlash (weiß tinten) kommt global aus
// der Render-Orchestrierung, hier nicht nötig.
// Hellgrüner Drachen-Boss (Welt 16). Großer sitzender Drache mit Flügeln,
// langem Hals, Hörnern und leuchtenden Augen. Mit jedem Treffer (phase) wird
// der Atem/Blick aggressiver rot. Blickrichtung folgt `direction`.
function drawDragonBoss(this: Renderer, x: number, y: number, w: number, h: number, direction: number, frame: number, hp: number, maxHp: number, isDead: boolean, windupTimer: number, t: number) {
  const ctx = this.ctx;
  const cx = x + w / 2, cyBase = y + h;
  const phase = maxHp - hp;
  const frames = this.dracheFrames;
  const roaring = !isDead && windupTimer > 0;
  // Posen-Index: 4 = Brüllen (Telegraph, kein Feuer), sonst Laufzyklus 0-3.
  let idx = 0;
  if (isDead) idx = 4;
  else if (roaring) idx = 4;
  else idx = Math.floor(t * 0.16) % 4;
  const img = frames[idx] || frames[0];

  ctx.save();
  // Wut-Aura ab dem ersten Treffer — grüner Puls, verstärkt beim Brüllen.
  if (!isDead && (phase >= 1 || roaring)) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.2);
    const boost = roaring ? 0.10 : 0;
    const ar = w * (0.62 + phase * 0.12);
    const aura = ctx.createRadialGradient(cx, y + h * 0.4, w * 0.25, cx, y + h * 0.4, ar);
    aura.addColorStop(0, `rgba(140,255,150,${(0.08 + phase * 0.05 + boost) * pulse})`);
    aura.addColorStop(1, 'rgba(140,255,150,0)');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, y + h * 0.4, ar, 0, Math.PI * 2); ctx.fill();
  }

  if (img && img.width) {
    // Das Sprite füllt (leicht überragend) die HOHE Drachen-Trefferbox: der Kopf
    // sitzt nahe der Box-Oberkante, damit der Kopfsprung sauber zählt.
    // Beim Brüllen ein kurzes „Aufbäumen", sonst leichtes Atem-Wippen.
    const SCALE = 1.08;
    const rearUp = roaring ? 0.05 * (0.5 + 0.5 * Math.sin(t * 0.5)) : 0;
    const breathe = isDead ? 0 : Math.sin(t * 0.08) * 0.012;
    const drawH = h * SCALE * (1 + rearUp + breathe);
    const drawW = drawH * (img.width / img.height);
    ctx.translate(cx, cyBase);
    const dir = direction === 1 ? -1 : 1;   // Sprite blickt nach links; spiegeln je Richtung
    ctx.scale(dir, 1);
    if (isDead) { ctx.scale(1, -1); ctx.globalAlpha = 0.9; }   // besiegt: kippt auf den Rücken
    // Treffer-Blitz: kurz nach einem Stomp weiß aufleuchten (hitStun-Fenster).
    ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
    ctx.restore();
  } else {
    ctx.restore();
  }

  // HP-Perlen ÜBER dem Kopf des Drachen (kleine Kristalle, verbraucht = dunkel).
  // y ist die Box-Oberkante ≈ Kopfhöhe → Perlen klar darüber platzieren.
  if (!isDead) {
    const beadY = y - 16;
    for (let i = 0; i < maxHp; i++) {
      const px = cx - (maxHp - 1) * 7 + i * 14;
      ctx.fillStyle = i < hp ? '#7dff8a' : 'rgba(60,90,60,0.55)';
      ctx.beginPath();
      ctx.moveTo(px, beadY - 6); ctx.lineTo(px + 5, beadY); ctx.lineTo(px, beadY + 6); ctx.lineTo(px - 5, beadY);
      ctx.closePath(); ctx.fill();
    }
  }
}

function drawBoss(this: Renderer, x: number, y: number, w: number, h: number, direction: number, frame: number, hp: number, maxHp: number, isDead: boolean, windupTimer = 0) {
  // Welt 16: der Boss ist ein hellgrüner Drache (Sprite-Grafik, kein
  // Feuer-Telegraph mehr — der Drache brüllt nur, wirft aber nichts).
  if (this.currentTheme === 'dragon') {
    drawDragonBoss.call(this, x, y, w, h, direction, frame, hp, maxHp, isDead, windupTimer, this.time);
    return;
  }
  if (!isDead) this.drawWindupSignal(x, y, w, h, windupTimer, this.time);
  const ctx = this.ctx;
  ctx.save();
  const cx = x + w / 2;
  // Phasen-Aura: mit jedem Treffer aggressiver (röter, pulsierend).
  const phase = maxHp - hp;
  if (!isDead && phase >= 1) {
    const cyA = y + h / 2, ar = w * (0.7 + phase * 0.15);
    const pulseA = 0.5 + 0.5 * Math.sin(this.time * 0.2);
    const aura = ctx.createRadialGradient(cx, cyA, w * 0.3, cx, cyA, ar);
    aura.addColorStop(0, `rgba(255,60,50,${(0.1 + phase * 0.07) * pulseA})`);
    aura.addColorStop(1, 'rgba(255,60,50,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(cx, cyA, ar, 0, Math.PI * 2); ctx.fill();
  }
  const bx = x + 3, bw = w - 6;
  let by = y + 4, bh = h - 6;
  if (isDead) { by = y + h * 0.55; bh = h * 0.4; }
  // Körper mit Verlauf
  const g = ctx.createLinearGradient(0, by, 0, by + bh);
  g.addColorStop(0, '#4a3466'); g.addColorStop(1, '#2a1c3e');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 7); ctx.fill();
  ctx.strokeStyle = '#6b4e8f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx + 1, by + 1, bw - 2, bh - 2, 6); ctx.stroke();
  if (!isDead) {
    // stachelige Zacken oben
    ctx.fillStyle = '#7a5aa8';
    const spikes = 4;
    for (let i = 0; i < spikes; i++) {
      const sx = bx + bw * (0.18 + 0.64 * (i / (spikes - 1)));
      ctx.beginPath();
      ctx.moveTo(sx - 4, by + 2); ctx.lineTo(sx, by - 6); ctx.lineTo(sx + 4, by + 2);
      ctx.closePath(); ctx.fill();
    }
    // Augen mit Blickrichtung
    const dir = direction < 0 ? -1 : 1;
    const eyeY = by + bh * 0.4;
    const off = dir * 1.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - bw * 0.2, eyeY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + bw * 0.2, eyeY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0202a';
    ctx.beginPath(); ctx.arc(cx - bw * 0.2 + off, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + bw * 0.2 + off, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
    // grimmige Brauen
    ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.32, eyeY - 6); ctx.lineTo(cx - bw * 0.06, eyeY - 3);
    ctx.moveTo(cx + bw * 0.32, eyeY - 6); ctx.lineTo(cx + bw * 0.06, eyeY - 3);
    ctx.stroke();
    // zähnefletschender Mund
    ctx.fillStyle = '#1a1020';
    ctx.beginPath(); ctx.roundRect(cx - bw * 0.22, by + bh * 0.66, bw * 0.44, bh * 0.16, 2); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - bw * 0.2 + i * (bw * 0.12), by + bh * 0.66, 2.5, bh * 0.16);
    // laufende Füße
    const step = Math.sin(frame * 0.2) * 3;
    ctx.fillStyle = '#2a1c3e';
    ctx.fillRect(bx + bw * 0.2 - 4, by + bh - 1, 10, 5 + step);
    ctx.fillRect(bx + bw * 0.8 - 6, by + bh - 1, 10, 5 - step);
    // HP-Pips über dem Kopf
    const gap = 9, totalW = (maxHp - 1) * gap;
    for (let i = 0; i < maxHp; i++) {
      const px = cx - totalW / 2 + i * gap, py = y - 7;
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = i < hp ? '#4ade80' : 'rgba(255,255,255,0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    }
  } else {
    // besiegt: X-Augen
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const eyeY = by + bh * 0.4;
    [cx - bw * 0.2, cx + bw * 0.2].forEach(ex => {
      ctx.beginPath();
      ctx.moveTo(ex - 3, eyeY - 3); ctx.lineTo(ex + 3, eyeY + 3);
      ctx.moveTo(ex + 3, eyeY - 3); ctx.lineTo(ex - 3, eyeY + 3);
      ctx.stroke();
    });
  }
  ctx.restore();
}

// Eisreh (Wald-Gegner): blittet einen der 7 base64-Frames, an den Füßen
// verankert, gespiegelt je Blickrichtung (Sprite blickt LINKS). Gibt false
// zurück, solange die Bilder noch nicht geladen sind → Aufrufer malt Platzhalter.
/** Gemeinsamer Reh-Blitter (Eisreh & braunes Reh & Boss). Zeichnet den Frame
 *  aus dem übergebenen Frame-Array, Füße unten-mittig, Spiegelung bei Richtung
 *  rechts, im Todesfall gekippt. */
function blitReh(
  r: Renderer, frames: (HTMLImageElement | null)[] | null,
  x: number, y: number, w: number, h: number,
  frameIdx: number, direction: number, isDead: boolean, scale: number,
): boolean {
  const ref = frames && frames[0];
  if (!ref) return false;
  const ctx = r.ctx;
  ctx.save();
  const cx = x + w / 2;
  const drawH = h * scale * (isDead ? 0.72 : 1);
  const drawW = drawH * (ref.width / ref.height);
  const f = frames[frameIdx] || ref;
  ctx.translate(cx, y + h);
  if (direction === 1) ctx.scale(-1, 1);   // Sprite blickt links → bei Richtung rechts spiegeln
  if (isDead) { ctx.translate(0, drawH * 0.3); ctx.scale(1, -1); ctx.translate(0, -drawH); }
  ctx.drawImage(f, -drawW / 2, -drawH, drawW, drawH);
  ctx.restore();
  return true;
}

export function drawRehSprite(
  r: Renderer, x: number, y: number, w: number, h: number,
  frameIdx: number, direction: number, isDead: boolean, scale = 1.55,
): boolean {
  return blitReh(r, r.rehFrames, x, y, w, h, frameIdx, direction, isDead, scale);
}

/** Posenwahl aus dem Bewegungszustand (für alle Reh-Varianten identisch). */
function rehPose(frame: number, isDead: boolean, onGround: boolean, velY: number): number {
  if (isDead) return 6;                                 // Recovery-Pose als „getroffen"
  if (!onGround) return velY < 0 ? 4 : 5;               // LEAP_A (steigend) / LEAP_B (fallend)
  return 1 + (Math.floor(frame * 0.18) % 2);            // WALK_A / WALK_B im Trab
}

function drawDeer(
  this: Renderer, x: number, y: number, w: number, h: number,
  frame: number, isDead: boolean, direction: number, velY = 0, onGround = true,
) {
  const idx = rehPose(frame, isDead, onGround, velY);
  if (blitReh(this, this.rehFrames, x, y, w, h, idx, direction, isDead, 1.55)) return;
  // Fallback (Sprites noch nicht geladen): hellblauer Platzhalter.
  const ctx = this.ctx;
  ctx.save();
  ctx.fillStyle = '#bfe3ff';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.4, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBrownDeer(
  this: Renderer, x: number, y: number, w: number, h: number,
  frame: number, isDead: boolean, direction: number, velY = 0, onGround = true,
) {
  const idx = rehPose(frame, isDead, onGround, velY);
  if (blitReh(this, this.rehBrownFrames, x, y, w, h, idx, direction, isDead, 1.55)) return;
  // Fallback: brauner Platzhalter.
  const ctx = this.ctx;
  ctx.save();
  ctx.fillStyle = '#a9743f';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.4, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawDeerBoss(
  this: Renderer, x: number, y: number, w: number, h: number,
  frame: number, isDead: boolean, direction: number, velY = 0, onGround = true,
  hp = 3, maxHp = 3,
) {
  const idx = rehPose(frame, isDead, onGround, velY);
  const ctx = this.ctx;
  // Kalter Boss-Schein hinter dem großen Eisreh (nur solange es lebt).
  if (!isDead) {
    ctx.save();
    const cx = x + w / 2, cy = y + h * 0.5;
    const g = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 0.95);
    g.addColorStop(0, 'rgba(150,224,255,0.30)');
    g.addColorStop(1, 'rgba(150,224,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, w * 0.95, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Boss = großes Eisreh (etwas größerer Scale für Präsenz).
  if (!blitReh(this, this.rehFrames, x, y, w, h, idx, direction, isDead, 1.7)) {
    ctx.save();
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.45, h * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // HP-Anzeige (3 Herzen/Pips) über dem Boss, solange er lebt.
  if (!isDead) {
    ctx.save();
    const pipR = 3.4, gap = 4, drawH = h * 1.7;
    const totalW = maxHp * (pipR * 2) + (maxHp - 1) * gap;
    const startX = x + w / 2 - totalW / 2 + pipR;
    const py = y + h - drawH - 8;
    for (let i = 0; i < maxHp; i++) {
      const px = startX + i * (pipR * 2 + gap);
      ctx.beginPath(); ctx.arc(px, py, pipR, 0, Math.PI * 2);
      ctx.fillStyle = i < hp ? '#ff5a7a' : 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
    }
    ctx.restore();
  }
}

// --- Schaf (Wolkenwelt) · 10 Frames: 0 idle · 1-4 walk · 5 run · 6-8 jump · 9 land ---
function drawSheep(
  this: Renderer, x: number, y: number, w: number, h: number,
  frame: number, isDead: boolean, direction: number, velY = 0, onGround = true,
) {
  let idx: number;
  if (isDead) idx = 9;                                  // Landing-Recovery als „getroffen"
  else if (!onGround) idx = velY < 0 ? 6 : 8;           // Takeoff (steigend) / Flight-B (fallend)
  else idx = 1 + (Math.floor(frame * 0.18) % 2) * 2;    // Contact A / Contact B im Trab
  if (blitReh(this, this.schafFrames, x, y, w, h, idx, direction, isDead, 1.55)) return;
  const ctx = this.ctx;
  ctx.save(); ctx.fillStyle = '#f6f3ec';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.5, w * 0.45, h * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// --- Schildkröte (Tiefsee) · 10 Frames: 0 stand · 1-5 walk · 6 crouch · 7 crawl · 8 jump · 9 land ---
function drawTurtle(
  this: Renderer, x: number, y: number, w: number, h: number,
  frame: number, isDead: boolean, direction: number, velY = 0, onGround = true,
) {
  let idx: number;
  if (isDead) idx = 6;                                  // Crouch = in den Panzer zurückgezogen
  else if (!onGround) idx = 8;                          // Jump
  else idx = 1 + (Math.floor(frame * 0.16) % 5);        // Walk-Zyklus 1..5 (weiches Kriechen)
  if (blitReh(this, this.turtleFrames, x, y, w, h, idx, direction, isDead, 1.5)) return;
  const ctx = this.ctx;
  ctx.save(); ctx.fillStyle = '#5fbfae';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.45, h * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// --- Maus (Wiese) · 10 Frames: 0 idle · 1-4 walk · 5 takeoff · 6 flight · 7 run · 8 fall · 9 land ---
function drawMouse(
  this: Renderer, x: number, y: number, w: number, h: number,
  frame: number, isDead: boolean, direction: number, velY = 0, onGround = true,
  sniffing = false, fleeing = false,
) {
  let idx: number;
  let yOff = 0;
  if (isDead) idx = 9;                                  // Landing-Crouch als „getroffen"
  else if (!onGround) idx = velY < 0 ? 5 : 8;           // Takeoff (steigend) / Falling (fallend)
  else if (fleeing) idx = 7;                            // Renn-Pose beim Flüchten
  else if (sniffing) {
    idx = 0;                                            // Idle-Pose beim Schnuppern
    yOff = Math.abs(Math.sin(frame * 0.45)) * 1.6;      // sanftes Nasen-/Kopf-Wippen
  } else idx = 1 + (Math.floor(frame * 0.22) % 2) * 2;  // Contact A / Contact B, flink
  // Feines Schnurrhaar-/Nasen-Zucken beim Schnuppern (leichte horizontale Stauchung).
  const wig = sniffing ? 1 + Math.sin(frame * 0.9) * 0.03 : 1;
  const drawW = w * wig, drawX = x + (w - drawW) / 2;
  if (blitReh(this, this.mausFrames, drawX, y + yOff, drawW, h, idx, direction, isDead, 1.45)) return;
  const ctx = this.ctx;
  ctx.save(); ctx.fillStyle = '#b9b2ad';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.4, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// --- Schlangen-Boss (Australien) · 10 Frames: 0 idle-coil · 1/3 creep · 2 raised ·
//     4 low-coil · 5 turn · 6-7 stretch · 8 jump/strike · 9 landing.
//     animState: 0 kriechen · 1 aufrichten (Telegraph) · 2 zuschnappen (Lunge). ---
function drawSnakeBoss(
  this: Renderer, x: number, y: number, w: number, h: number,
  frame: number, isDead: boolean, direction: number, animState = 0,
  hp = 3, maxHp = 3,
) {
  const ctx = this.ctx;
  let idx: number;
  if (isDead) idx = 4;                                  // Low-Coil = besiegt zusammengesackt
  else if (animState === 1) idx = 2;                    // aufgerichtet (Telegraph)
  else if (animState === 2) idx = 8;                    // zuschnappen (gestreckt)
  else if (animState === 3) idx = 9;                    // erholen (abgesackt, verwundbar)
  else idx = 1 + (Math.floor(frame * 0.14) % 2) * 2;    // Creep A / Creep B
  // Gefahren-Aura nur beim Aufrichten/Zuschnappen (warmes Rot-Orange) — im
  // Erholungs-Fenster (3) bewusst AUS, damit „jetzt draufspringen" klar ist.
  if (!isDead && (animState === 1 || animState === 2)) {
    ctx.save();
    const cx = x + w / 2, cy = y + h * 0.45;
    const g = ctx.createRadialGradient(cx, cy, w * 0.15, cx, cy, w * 1.0);
    g.addColorStop(0, 'rgba(255,120,60,0.28)');
    g.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, w * 1.0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Boss = große Schlange (etwas größerer Scale für Präsenz).
  if (!blitReh(this, this.schlangeFrames, x, y, w, h, idx, direction, isDead, 1.7)) {
    ctx.save(); ctx.fillStyle = '#e58bb0';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.5, w * 0.4, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // HP-Anzeige (3 Pips) über dem Boss, solange er lebt.
  if (!isDead) {
    ctx.save();
    const pipR = 3.4, gap = 4, drawH = h * 1.7;
    const totalW = maxHp * (pipR * 2) + (maxHp - 1) * gap;
    const startX = x + w / 2 - totalW / 2 + pipR;
    const py = y + h - drawH - 8;
    for (let i = 0; i < maxHp; i++) {
      const px = startX + i * (pipR * 2 + gap);
      ctx.beginPath(); ctx.arc(px, py, pipR, 0, Math.PI * 2);
      ctx.fillStyle = i < hp ? '#ff5a7a' : 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
    }
    ctx.restore();
  }
}

export const enemiesCoreMethods = {
  getCachedGoomba,
  drawGoomba,
  drawBoss,
  getCachedKoopa,
  drawKoopa,
  getCachedBatBody,
  drawBat,
  drawDeer,
  drawBrownDeer,
  drawDeerBoss,
  drawSheep,
  drawTurtle,
  drawMouse,
  drawSnakeBoss,
};
