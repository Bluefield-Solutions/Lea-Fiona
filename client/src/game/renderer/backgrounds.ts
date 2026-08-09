import type { Renderer } from '../renderer.ts';
import { Camera } from '../camera.ts';
import { TILE_SIZE } from '../constants';
import { pseudoRandom } from '../util/random';
import { getGlowDisc, getGlowDiscMulti, stampGlow, drawGlowDisc } from '../gfx/glow.ts';

function drawBackground(this: Renderer, camera: Camera, worldWidth: number) {
  if (!this.bgGenerated) {
    this.generateBackgroundLayers(worldWidth);
    this.bgGenerated = true;
  }

  if (this.currentTheme === 'cave' || this.currentTheme === 'dragon') {
    // Drachenhöhle nutzt den Höhlen-Hintergrund; die grüne Stimmung kommt über
    // Grade/Tint/Vignette + Drachen-Deko im Level.
    this.drawCaveBackground(camera);
    return;
  }

  if (this.currentTheme === 'school') {
    this.drawSchoolBackground(camera);
    return;
  }

  if (this.currentTheme === 'gym') {
    this.drawGymBackground(camera);
    return;
  }

  if (this.currentTheme === 'plush') {
    this.drawPlushBackground(camera);
    return;
  }

  if (this.currentTheme === 'trampoline') {
    this.drawTrampolineBackground(camera);
    return;
  }

  if (this.currentTheme === 'sky') {
    this.drawSkyThemeBackground(camera);
    return;
  }

  if (this.currentTheme === 'beach') {
    this.drawBeachBackground(camera);
    return;
  }

  if (this.currentTheme === 'australia') {
    this.drawAustraliaBackground(camera);
    return;
  }

  if (this.currentTheme === 'volcano') {
    this.drawVolcanoBackground(camera);
    return;
  }

  if (this.currentTheme === 'ice') {
    this.drawIceBackground(camera);
    return;
  }

  if (this.currentTheme === 'castle') {
    this.drawCastleBackground(camera);
    return;
  }

  if (this.currentTheme === 'underwater') {
    this.drawUnderwaterBackground(camera);
    return;
  }

  if (this.currentTheme === 'space') {
    this.drawSpaceBackground(camera);
    return;
  }

  if (this.currentTheme === 'bluefield') {
    // „Blaue Wiese" — frischer, optimistischer Tag-Himmel in Markenblau
    // (#1E48D6) oben, hell zum Horizont. Heller als das kräftig blaue Gras,
    // damit die Wiese klar abgesetzt steht. Plus ein weicher Lichtschein
    // oben rechts für Tiefe. Günstig genug, um pro Frame zu zeichnen.
    const ctx = this.ctx;
    const VW = this.viewportW, VH = this.viewportH;
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#1E48D6');
    sky.addColorStop(0.30, '#3a68e0');
    sky.addColorStop(0.55, '#6a98ee');
    sky.addColorStop(0.78, '#a8cdf6');
    sky.addColorStop(1, '#e2f0ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, VH);
    const gx = VW * 0.76, gy = VH * 0.18, gr = VH * 1.0;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    // Warmer Sonnen-Kern (statt rein kühl-weiß): ein dezenter Gold-Ton bricht
    // das monochrome Blau und gibt der Szene Wärme/Tiefe, ohne das Markenblau
    // zu verlassen. Nach außen kühlt der Schein wieder ins Blaue aus.
    glow.addColorStop(0, 'rgba(255,246,222,0.62)');
    glow.addColorStop(0.16, 'rgba(255,240,206,0.34)');
    glow.addColorStop(0.36, 'rgba(226,238,255,0.16)');
    glow.addColorStop(0.68, 'rgba(210,230,255,0.05)');
    glow.addColorStop(1, 'rgba(210,230,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, VW, VH);
    // Etappe B: Sektions-Farbstimmung (Labor → U1 → MatchSuite → Finale),
    // sanfter Cross-Fade nach Kameraposition (Schul-Level-Mechanik).
    drawBluefieldSectionTint.call(this, camera);
    // Parallax-Hügelsilhouetten der „blauen Wiese" in der Ferne, zwei Lagen.
    const drawHills = (yBase: number, amp: number, col: string, speed: number, step: number) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, VH);
      const off = (camera.x * speed) % step;
      for (let x = -off; x <= VW + step; x += step) {
        ctx.quadraticCurveTo(x + step / 2, yBase - amp, x + step, yBase);
      }
      ctx.lineTo(VW, VH);
      ctx.closePath();
      ctx.fill();
    };
    // F6b: weiche Lichtstrahlen (God Rays) aus der Lichtquelle — jetzt über das
    // gecachte God-Ray-System (einmal gebacken, pro Frame nur 1 additiver Blit
    // statt 5 frische Verläufe/Frame). Gebündelt unter der Sonne (gx≈0.76),
    // kühl-weiß, dezent — Optik wie zuvor.
    drawGodRays.call(this, 'bluefield', '205,228,255', 5, 0.05, 0.18, 0.64,
      { spanFrac: 0.5, centerFrac: 0.76, driftAmp: 0.015, driftSpd: 0.006 });
    // F6: weiche Wolken (hinter den Hügeln, sehr langsame Parallaxe).
    const clouds = [
      { wx: 400, y: 0.15, w: 130, a: 0.5 }, { wx: 1300, y: 0.24, w: 100, a: 0.42 },
      { wx: 2200, y: 0.13, w: 155, a: 0.46 }, { wx: 3100, y: 0.27, w: 110, a: 0.4 },
      { wx: 4000, y: 0.17, w: 135, a: 0.44 },
    ];
    for (const c of clouds) {
      const sx = c.wx - camera.x * 0.3;
      if (sx < -170 || sx > VW + 170) continue;
      this.drawPuffyCloud(sx, VH * c.y, c.w, c.w * 0.5, c.a);
    }
    // F7: Parallax-Hügelketten mit klarer HELLIGKEITS-Staffelung (v398): fern
    // hell/hazig & entsättigt → nah tiefes Navy. Kräftigere Deckkraft + eine
    // zusätzliche nächste, dunkle Kette, die die helle Wiese rahmt → echte
    // Tiefe statt monochromem Blau.
    drawHills(VH * 0.62, VH * 0.07, 'rgba(140,178,242,0.34)', 0.03, VW * 0.4); // fernste, hazig-hell
    drawHills(VH * 0.70, VH * 0.10, 'rgba(74,116,220,0.48)', 0.06, VW * 0.5);  // mittel
    drawHills(VH * 0.79, VH * 0.13, 'rgba(34,68,160,0.64)', 0.12, VW * 0.7);   // nah, kräftig
    drawHills(VH * 0.90, VH * 0.16, 'rgba(18,38,104,0.80)', 0.20, VW * 0.92);  // nächste, tiefes Navy (rahmt die Wiese)
    // F6c: weiches Horizont-Leuchten (Bloom) an der Hügellinie.
    const bloom = ctx.createLinearGradient(0, VH * 0.60, 0, VH * 0.80);
    bloom.addColorStop(0, 'rgba(215,235,255,0)');
    bloom.addColorStop(0.5, 'rgba(222,240,255,0.09)');
    bloom.addColorStop(1, 'rgba(215,235,255,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, VH * 0.60, VW, VH * 0.20);
    // Rahmen-Vignette (v430): sanfte Abdunklung an Rändern/unten. Rahmt die
    // helle Wiese, hebt die Spielebene (Figur + Panels) tonal vom Hintergrund
    // ab → weniger „blaue Suppe", mehr gestaffelte Tiefe. Bewusst dezent.
    const vig = ctx.createRadialGradient(VW * 0.5, VH * 0.52, VH * 0.32, VW * 0.5, VH * 0.62, VH * 0.95);
    vig.addColorStop(0, 'rgba(9,20,54,0)');
    vig.addColorStop(0.7, 'rgba(9,20,54,0.10)');
    vig.addColorStop(1, 'rgba(7,16,44,0.30)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VW, VH);
    // Zusätzliches weiches Boden-Dunkel direkt hinter der Spielebene, damit die
    // Figur (Mittelton) klar davor steht statt im Blau zu verschwimmen.
    const floorDark = ctx.createLinearGradient(0, VH * 0.72, 0, VH);
    floorDark.addColorStop(0, 'rgba(8,18,50,0)');
    floorDark.addColorStop(1, 'rgba(8,18,50,0.22)');
    ctx.fillStyle = floorDark;
    ctx.fillRect(0, VH * 0.72, VW, VH * 0.28);
    // Ambiente-Marker: dezente Mono-Typo (Bluefield-Sprache), weltfest mit
    // Parallaxe, niedrige Deckkraft — Atmosphäre ohne Weg-Gedränge.
    const markers: { wx: number; y: number; t: string }[] = [
      { wx: 120, y: 0.13, t: 'probe 00 · blaue wiese' },
      { wx: 950, y: 0.21, t: '// aus ideen echte produkte' },
      { wx: 1750, y: 0.11, t: 'standort unterhaching · de' },
      { wx: 2550, y: 0.22, t: 'server_de · dsgvo · betriebsbereit' },
      { wx: 3350, y: 0.14, t: '100% de · eigenfinanziert' },
      { wx: 4050, y: 0.20, t: 'schleuse entriegelt · zutritt' },
    ];
    ctx.save();
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(150,185,255,0.15)';
    for (const m of markers) {
      const sx = m.wx - camera.x * 0.5;
      if (sx < -280 || sx > VW + 40) continue;
      ctx.fillText(m.t, sx, VH * m.y);
    }
    ctx.restore();
    // Labor-Deko: „Proben unter Glas" (Erlenmeyerkolben), weit hinten & transparent.
    const flasks = [
      { wx: 600, col: '#3fbfff' }, { wx: 1650, col: '#42e0a0' },
      { wx: 2750, col: '#7fd0ff' }, { wx: 3900, col: '#5fd0e0' },
    ];
    const fpar = 0.45, fy = VH * 0.24;
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (const f of flasks) {
      const sx = f.wx - camera.x * fpar;
      if (sx < -60 || sx > VW + 60) continue;
      const neckW = 6, neckH = 8, bodyW = 22, bodyH = 24;
      const yb = fy + neckH;
      // Glas-Kontur (Kolben)
      ctx.strokeStyle = 'rgba(215,238,255,0.75)'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx - neckW / 2, fy);
      ctx.lineTo(sx - neckW / 2, yb);
      ctx.lineTo(sx - bodyW / 2, yb + bodyH);
      ctx.lineTo(sx + bodyW / 2, yb + bodyH);
      ctx.lineTo(sx + neckW / 2, yb);
      ctx.lineTo(sx + neckW / 2, fy);
      ctx.stroke();
      // Flüssigkeit (untere Hälfte)
      const ly = yb + bodyH * 0.45, wL = neckW + (bodyW - neckW) * 0.45;
      ctx.fillStyle = f.col;
      ctx.beginPath();
      ctx.moveTo(sx - wL / 2, ly);
      ctx.lineTo(sx - bodyW / 2, yb + bodyH);
      ctx.lineTo(sx + bodyW / 2, yb + bodyH);
      ctx.lineTo(sx + wL / 2, ly);
      ctx.closePath(); ctx.fill();
      // Bläschen + Korken
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(sx - 3, yb + bodyH * 0.7, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 4, yb + bodyH * 0.55, 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(180,140,90,0.8)';
      ctx.fillRect(sx - neckW / 2 - 1, fy - 3, neckW + 2, 3);
    }
    ctx.restore();
    // Werte-Schilder als dezente Hintergrund-Billboards (Parallax), passend
    // zum Level-Bogen platziert: Prototyp → Markttest → Live.
    const badges: { wx: number; text: string }[] = [
      { wx: 1000, text: '100% DE' },
      { wx: 2400, text: 'DSGVO' },
      { wx: 3800, text: 'eigenfinanziert' },
    ];
    const par = 0.6, by = VH * 0.42;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    for (const b of badges) {
      const sx = b.wx - camera.x * par;
      if (sx < -140 || sx > VW + 140) continue;
      const w = Math.max(58, ctx.measureText(b.text).width + 20), h = 22;
      ctx.fillStyle = 'rgba(28,58,150,0.5)';         // Pfosten
      ctx.fillRect(sx - 1.5, by + h / 2, 3, VH * 0.1);
      ctx.fillStyle = 'rgba(233,241,255,0.92)';       // Panel
      ctx.fillRect(sx - w / 2, by - h / 2, w, h);
      ctx.strokeStyle = 'rgba(30,72,214,0.85)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(sx - w / 2, by - h / 2, w, h);
      ctx.fillStyle = '#1E48D6';                       // Text (Markenblau)
      ctx.fillText(b.text, sx, by + 4);
    }
    ctx.restore();
    // „Proben unter Glas" (Website-Sprache): U1/MatchSuite/GKV als Kulturen
    // unter Glasglocken in verschiedenen Reifegraden (live/build/plan), weltfest
    // hinter den Spezialmünzen.
    const drawProbe = (col: number, coinRow: number, maturity: 'live' | 'build' | 'plan', accent: string, label: string) => {
      const scx = (col + 0.5) * TILE_SIZE - camera.x;
      const scy = (coinRow + 0.5) * TILE_SIZE - camera.y;
      if (scx < -150 || scx > VW + 150) return;
      const hw = 28, hh = 46, baseY = hh - 4;
      const fill = maturity === 'live' ? 0.85 : maturity === 'build' ? 0.5 : 0.25;
      const pulse = 0.6 + Math.sin(this.time * 0.05 + col) * 0.4;
      ctx.save();
      ctx.translate(scx, scy);
      // Kultur-Glow (additiv)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3 * pulse;
      const cy = baseY - hh * fill;
      const cg = ctx.createRadialGradient(0, cy, 2, 0, cy, hw * 1.5);
      cg.addColorStop(0, accent); cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(0, cy, hw * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Kultur-Masse (organischer Blob am Boden)
      ctx.globalAlpha = 0.85; ctx.fillStyle = accent;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const bx = -hw * 0.55 + i * (hw * 0.28);
        const r = 4 + (i % 2) * 3 + fill * 5;
        ctx.moveTo(bx + r, baseY);
        ctx.arc(bx, baseY - (i % 2) * 4 - fill * 6, r, 0, Math.PI * 2);
      }
      ctx.fill();
      if (maturity === 'plan') { // kleiner Sprössling
        ctx.strokeStyle = accent; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, baseY); ctx.lineTo(0, baseY - 13);
        ctx.moveTo(0, baseY - 9); ctx.lineTo(-4, baseY - 13);
        ctx.moveTo(0, baseY - 9); ctx.lineTo(4, baseY - 13); ctx.stroke();
      }
      // Glasglocke
      ctx.beginPath();
      ctx.moveTo(-hw, baseY);
      ctx.lineTo(-hw, -hh + 12);
      ctx.quadraticCurveTo(-hw, -hh, 0, -hh);
      ctx.quadraticCurveTo(hw, -hh, hw, -hh + 12);
      ctx.lineTo(hw, baseY);
      ctx.globalAlpha = 0.09; ctx.fillStyle = '#bcd8ff'; ctx.fill();
      ctx.globalAlpha = 0.75; ctx.strokeStyle = 'rgba(200,225,255,0.75)'; ctx.lineWidth = 1.6; ctx.stroke();
      // Glas-Glanz
      ctx.globalAlpha = 0.45; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-hw * 0.5, -hh + 15); ctx.lineTo(-hw * 0.5, baseY - 10); ctx.stroke();
      // Sockel (Petrischale)
      ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgba(18,36,84,0.92)';
      ctx.fillRect(-hw - 3, baseY, hw * 2 + 6, 6);
      ctx.strokeStyle = 'rgba(160,195,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(-hw - 3, baseY, hw * 2 + 6, 6);
      // Mono-Label (// probe · reifegrad)
      ctx.globalAlpha = 0.92; ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = accent; ctx.fillText(label, 0, baseY + 20);
      ctx.textAlign = 'left';
      ctx.restore();
    };
    drawProbe(100, 9, 'live', '#3fe08a', '// u1 · live');
    drawProbe(175, 6, 'build', '#ffc24a', '// matchsuite · build');
    drawProbe(231, 8, 'plan', '#7fd0ff', '// gkv · plan');
    drawBluefieldU1Scene.call(this, camera);
    drawBluefieldMatchSuiteScene.call(this, camera);
    drawBluefieldGKVScene.call(this, camera);
    drawBluefieldGoLiveReveal.call(this, camera);
    drawBluefieldProductHeroes.call(this, camera);
    drawBluefieldBossArena.call(this, camera);
    drawBluefieldWelcomeScene.call(this, camera);
    drawBluefieldSectionIntros.call(this, camera);
    drawBluefieldDoors.call(this, camera);
    return;
  }

  if (!this.skyCache || this.skyCacheH !== this.viewportH || this.skyCacheW !== this.viewportW) {
    const sc = document.createElement('canvas');
    sc.width = this.viewportW;
    sc.height = this.viewportH;
    const sctx = sc.getContext('2d')!;
    const skyGrad = sctx.createLinearGradient(0, 0, 0, this.viewportH);
    skyGrad.addColorStop(0, '#0f4ea8');
    skyGrad.addColorStop(0.28, '#2f86dd');
    skyGrad.addColorStop(0.52, '#62afe8');
    skyGrad.addColorStop(0.74, '#a6daf0');
    skyGrad.addColorStop(0.9, '#dcf2e2');
    skyGrad.addColorStop(1, '#f0f7d8');
    sctx.fillStyle = skyGrad;
    sctx.fillRect(0, 0, this.viewportW, this.viewportH);
    // Baked warm sun glow in the upper-right — soft volumetric light source
    // that the canopy/light-rays read against.
    const gx = this.viewportW * 0.74;
    const gy = this.viewportH * 0.2;
    const glowR = this.viewportH * 0.95;
    const glow = sctx.createRadialGradient(gx, gy, 0, gx, gy, glowR);
    glow.addColorStop(0, 'rgba(255,250,220,0.55)');
    glow.addColorStop(0.25, 'rgba(255,244,200,0.28)');
    glow.addColorStop(0.6, 'rgba(255,238,190,0.08)');
    glow.addColorStop(1, 'rgba(255,238,190,0)');
    sctx.fillStyle = glow;
    sctx.fillRect(0, 0, this.viewportW, this.viewportH);
    this.skyCache = sc;
    this.skyCacheH = this.viewportH;
    this.skyCacheW = this.viewportW;
  }
  this.ctx.drawImage(this.skyCache, 0, 0);

  this.drawSun(camera);
  this.drawClouds(camera);

  // Ferne, dunstige Bergketten ganz hinten (atmosphärische Tiefe).
  this.drawFarRange(camera.x);

  // God-Rays (Ausrollung, gecacht/additiv): warme Sonnenschäfte fallen aus der
  // Lichtquelle oben rechts durchs Blätterdach — gebündelt unter der Sonne
  // (gx≈0.74), dezent. Kosten: 1 additiver Blit/Frame.
  drawGodRays.call(this, 'jungle', '255,244,205', 6, 0.04, 0.05, 0.72,
    { spanFrac: 0.62, centerFrac: 0.72, driftAmp: 0.02, driftSpd: 0.005 });

  // Jungle signature: distant stepped Mayan pyramid silhouette baked
  // into signatureLayers cache. One drawImage per frame, no allocations.
  {
    const sig = this.getSignatureLayer('jungle');
    this.drawSignatureLayer('jungle', camera.x, this.viewportW * 0.35, this.viewportH * 0.7 - sig.height, 0.04, this.viewportW * 1.4);
  }

  const parallaxFactors = [0.05, 0.1, 0.2, 0.35, 0.55];
  for (let i = 0; i < this.bgLayers.length; i++) {
    const layer = this.bgLayers[i];
    const factor = parallaxFactors[i] || 0.5;
    const offsetX = -(camera.x * factor) % layer.width;
    const y = this.viewportH - layer.height + (i < 2 ? 0 : camera.y * factor * 0.3);

    this.ctx.drawImage(layer, offsetX, y);
    if (offsetX + layer.width < this.viewportW) {
      this.ctx.drawImage(layer, offsetX + layer.width, y);
    }
    if (offsetX > 0) {
      this.ctx.drawImage(layer, offsetX - layer.width, y);
    }
  }

  // BG-Aufwertung · Bodennebel: weiche, leicht grünliche Schwaden am unteren
  // Bildbereich, langsam driftend (gebackene Disc → kein Per-Frame-Gradient).
  this.drawGroundFog(camera, 210, 226, 202);
}

// BG-Aufwertung · wiederverwendbarer Bodennebel (aus Dschungel extrahiert).
// Weiche, langsam driftende Schwaden am unteren Bildrand über gebackene Disc
// (kein Per-Frame-Gradient, safari-sicher). Farbe/Deckkraft/Höhe pro Welt.
function drawGroundFog(
  this: Renderer,
  camera: Camera,
  r: number,
  g: number,
  b: number,
  opts?: { baseAlpha?: number; yFrac?: number; count?: number },
) {
  const disc = getGlowDisc(96, r, g, b, 0.5);
  if (!disc) return;
  const t = this.time;
  const full = opts?.count ?? 7;
  const n = this.quality === 'low' ? Math.max(3, full - 3) : full;
  const VW = this.viewportW, VH = this.viewportH;
  const yBase = opts?.yFrac ?? 0.80;
  this.ctx.save();
  this.ctx.globalAlpha = opts?.baseAlpha ?? 0.15;
  for (let i = 0; i < n; i++) {
    const seed = i * 53.7;
    const span = VW * 1.3;
    let bx = (i / n) * span + Math.sin(t * 0.006 + seed) * 42 - ((camera.x * 0.15) % span);
    if (bx < -160) bx += span;
    const by = VH * (yBase + 0.06 * Math.sin(seed));
    const sc = 1.7 + (i % 3) * 0.6;
    this.ctx.drawImage(disc, bx - disc.width * sc / 2, by - disc.height * sc / 2, disc.width * sc, disc.height * sc);
  }
  this.ctx.restore();
}

function drawCaveBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;

  // Static base gradient → cached as offscreen canvas so we don't allocate
  // a fresh CanvasGradient + run a full-screen fillRect every frame.
  const cache = this.getBgGradCache('cave-base', (cctx, cw, ch) => {
    const g = cctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#0a0a12');
    g.addColorStop(0.3, '#12101a');
    g.addColorStop(0.6, '#1a1520');
    g.addColorStop(1, '#0d0a14');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, cw, ch);
  }, true);
  this.blitBgCache(cache);

  const pseudoRand = pseudoRandom;

  // Mittelgrund-Felsformationen: massive Felsbank unten + hängende Decke oben.
  // Geben der Höhle Tiefe und Masse (Pendant zum Dschungel-Hügel).
  ctx.save();
  const parX = camera.x * 0.06;
  const lowerY = (x: number) => H * 0.78 + Math.sin((x + parX) * 0.006) * 20 + Math.sin((x + parX) * 0.018 + 2) * 11 + Math.sin((x + parX) * 0.045) * 5;
  const rockGrad = ctx.createLinearGradient(0, H * 0.6, 0, H);
  rockGrad.addColorStop(0, '#241c32');
  rockGrad.addColorStop(1, '#130d1c');
  ctx.fillStyle = rockGrad;
  ctx.beginPath();
  ctx.moveTo(0, H);
  // Perf-Paket 4: gröbere Schrittweite (14 statt 8) für die dunkle, weiche
  // Fels-Silhouette — halbiert die lineTo-Last, optisch nicht unterscheidbar.
  for (let x = 0; x <= W; x += 14) ctx.lineTo(x, lowerY(x));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // Leuchtender Fels-Grat (subtiler Kristall-Schimmer auf der Kante).
  ctx.strokeStyle = 'rgba(120,90,170,0.32)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 14) { const y = lowerY(x); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke();
  // Hängende Felsdecke oben.
  const ceilY = (x: number) => H * 0.15 + Math.sin((x + parX * 0.7) * 0.008 + 1) * 18 + Math.sin((x + parX * 0.7) * 0.024) * 9;
  const ceilGrad = ctx.createLinearGradient(0, 0, 0, H * 0.32);
  ceilGrad.addColorStop(0, '#181222');
  ceilGrad.addColorStop(1, '#241c32');
  ctx.fillStyle = ceilGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= W; x += 14) ctx.lineTo(x, ceilY(x));
  ctx.lineTo(W, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 20; i++) {
    const cx = pseudoRand(i * 317) * W * 2;
    const cy = pseudoRand(i * 523) * H;
    const r = 30 + pseudoRand(i * 719) * 80;
    const scrollX = (cx - camera.x * 0.05) % (W + r * 2) - r;
    const alpha = 0.02 + pseudoRand(i * 911) * 0.04;
    // Perf-Paket 2: gebackene Disc statt je Frame neuer Radial-Gradient.
    drawGlowDisc(ctx, getGlowDisc(128, 40, 30, 50, 1), scrollX, cy, r, r, alpha, false);
  }

  for (let i = 0; i < 25; i++) {
    const sx = pseudoRand(i * 1031) * W * 3;
    const scrollX = (sx - camera.x * 0.08) % (W + 80) - 40;
    const stalH = 15 + pseudoRand(i * 1237) * 40;
    const stalW = 3 + pseudoRand(i * 1451) * 8;
    const fromTop = pseudoRand(i * 1667) > 0.3;

    ctx.fillStyle = `rgba(30, 25, 35, ${0.3 + pseudoRand(i * 1873) * 0.3})`;
    ctx.beginPath();
    if (fromTop) {
      ctx.moveTo(scrollX - stalW / 2, 0);
      ctx.lineTo(scrollX + stalW / 2, 0);
      ctx.lineTo(scrollX + stalW * 0.15, stalH);
      ctx.lineTo(scrollX - stalW * 0.15, stalH);
    } else {
      ctx.moveTo(scrollX - stalW / 2, H);
      ctx.lineTo(scrollX + stalW / 2, H);
      ctx.lineTo(scrollX + stalW * 0.15, H - stalH);
      ctx.lineTo(scrollX - stalW * 0.15, H - stalH);
    }
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 8; i++) {
    const cx = pseudoRand(i * 2083) * W * 2;
    const scrollX = (cx - camera.x * 0.03) % (W + 40) - 20;
    const cy = pseudoRand(i * 2287) * H * 0.6 + H * 0.1;
    const pulse = Math.sin(this.time * 0.02 + i * 1.7) * 0.3 + 0.7;
    const hue = pseudoRand(i * 2491) > 0.5 ? 270 : 190;
    const r = 2 + pseudoRand(i * 2693) * 3;

    // Perf-Paket 2: gebackene Disc je Farbton statt je Frame neuer Radial-Gradient.
    const cdisc = hue === 270 ? getGlowDisc(128, 178, 133, 235, 1) : getGlowDisc(128, 112, 214, 230, 1);
    drawGlowDisc(ctx, cdisc, scrollX, cy, r * 6, r * 6, 0.12 * pulse, false);
    ctx.fillStyle = `hsla(${hue}, 90%, 75%, ${0.5 * pulse})`;
    ctx.beginPath();
    ctx.arc(scrollX, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Cave signature: glowing crystal cluster baked into signatureLayers.
  {
    this.drawFarRange(camera.x);
    const sig = this.getSignatureLayer('cave');
    this.drawSignatureLayer('cave', camera.x, W * 0.5, H * 0.78 - sig.height, 0.06, W * 1.4);
  }

  // Höhlen-Wahrzeichen: alte Mine — Holz-Stollenportal, Lore auf Schienen und
  // eine leuchtende Grubenlampe. Eigener Parallax → Tiefe.
  {
    const t = this.time;
    const p = W * 1.5;
    const bx = ((W * 0.34 - camera.x * 0.085) % p + p) % p;
    const by = H * 0.74;
    if (bx > -90 && bx < W + 90) drawCaveMine(ctx, bx, by, t);
  }

  // BG-Aufwertung · Bodennebel Höhle: kühler violett-blauer Kristall-Dunst,
  // etwas subtiler als im Dschungel (dunkle Welt).
  this.drawGroundFog(camera, 138, 122, 178, { baseAlpha: 0.11, yFrac: 0.82 });

  // Welt 16 · Drachenhöhle: zusätzliche Nahfeld-Höhlenkulisse für das Gefühl,
  // wirklich IN der Höhle zu stehen — umschließender Felsrahmen, große
  // Stalaktiten im Vordergrund, aufsteigende Glut und Augen in der Dunkelheit.
  if (this.currentTheme === 'dragon') drawDragonLairOverlay.call(this, camera);
}

// Nahfeld-Kulisse für die Drachenhöhle (Welt 16). Wird ÜBER den normalen
// Höhlen-Hintergrund gelegt und rahmt das Spielfeld ein, damit man sich
// eingeschlossen fühlt. Alles ist billig (wenige Pfade + zeitbasierte Sinus).
// Perf-Paket 4 (2. Runde): gebackener Nahfeld-Streifen (Decke + Stalaktiten) der
// Drachenhöhle im Parallax-Raum. Einmal pro Level/Viewport gebaut, pro Frame nur
// als Ausschnitt geblittet (analog Terrain-Cache/Paket 1).
let _lairCeilCanvas: HTMLCanvasElement | null = null;
let _lairCeilToken = '';

function buildLairCeiling(this: Renderer, worldWidth: number): void {
  const W = this.viewportW, H = this.viewportH;
  const parRange = Math.ceil(Math.max(0, worldWidth) * 0.16);
  const span = W * 1.6;
  const stripW = Math.max(1, W + parRange + Math.ceil(span) + 80);
  const stripH = Math.max(1, Math.ceil(H * 0.45));
  const cv = document.createElement('canvas');
  cv.width = stripW; cv.height = stripH;
  const c = cv.getContext('2d');
  if (!c) return;
  // Parallax-Raum-Koordinate u = Bildschirm-x + camera.x*0.16. In u ist die Decke
  // eine reine Funktion (kein parF-Term mehr) → einmal über die ganze Breite backen.
  const ceilBase = H * 0.14;
  const ceilYu = (u: number) =>
    ceilBase + Math.sin(u * 0.010) * 16 + Math.sin(u * 0.031 + 1.3) * 9 + Math.sin(u * 0.07) * 4;
  // Felsdecke (Füllung bis zur Kurve).
  const cg = c.createLinearGradient(0, 0, 0, ceilBase + 30);
  cg.addColorStop(0, '#060d08');
  cg.addColorStop(1, '#0c160e');
  c.fillStyle = cg;
  c.beginPath();
  c.moveTo(0, 0);
  for (let u = 0; u <= stripW; u += 12) c.lineTo(u, ceilYu(u));
  c.lineTo(stripW, 0);
  c.closePath();
  c.fill();
  // Grüner Glut-Saum.
  c.strokeStyle = 'rgba(120,220,140,0.20)';
  c.lineWidth = 1.4;
  c.beginPath();
  for (let u = 0; u <= stripW; u += 12) { const y = ceilYu(u); if (u === 0) c.moveTo(u, y); else c.lineTo(u, y); }
  c.stroke();
  // Stalaktiten: im Parallax-Raum wiederholen sie sich alle `span` (u = bx − span*0.15 + k*span).
  for (let base = -span; base <= stripW + span; base += span) {
    for (let i = 0; i < 7; i++) {
      const bx = pseudoRandom(i * 131 + 7) * span;
      const u = base + bx - span * 0.15;
      if (u < -70 || u > stripW + 70) continue;
      const topY = ceilYu(u);
      const len = 46 + pseudoRandom(i * 271 + 3) * 74;
      const wdt = 14 + pseudoRandom(i * 419 + 5) * 16;
      const grad = c.createLinearGradient(u, topY, u, topY + len);
      grad.addColorStop(0, '#0a140c');
      grad.addColorStop(1, '#040805');
      c.fillStyle = grad;
      c.beginPath();
      c.moveTo(u - wdt / 2, topY - 4);
      c.lineTo(u + wdt / 2, topY - 4);
      c.lineTo(u + wdt * 0.10, topY + len);
      c.lineTo(u - wdt * 0.10, topY + len);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(120,210,140,0.18)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(u - wdt / 2, topY - 2);
      c.lineTo(u - wdt * 0.10, topY + len);
      c.stroke();
    }
  }
  _lairCeilCanvas = cv;
  _lairCeilToken = `${Math.round(worldWidth)}|${W}x${H}`;
}

function drawLairCeiling(this: Renderer, camX: number, worldWidth: number): void {
  const token = `${Math.round(worldWidth)}|${this.viewportW}x${this.viewportH}`;
  if (!_lairCeilCanvas || _lairCeilToken !== token) buildLairCeiling.call(this, worldWidth);
  const cache = _lairCeilCanvas;
  if (!cache) return;
  const W = this.viewportW;
  const u0 = camX * 0.16;
  const sx = Math.max(0, Math.min(cache.width - 1, Math.floor(u0)));
  const frac = u0 - Math.floor(u0);
  const sw = Math.min(cache.width - sx, W + 2);
  if (sw <= 0) return;
  // Ausschnitt [u0, u0+W] → Bildschirm (sub-pixel per −frac für weiches Scrollen).
  this.ctx.drawImage(cache, sx, 0, sw, cache.height, -frac, 0, sw, cache.height);
}

function drawDragonLairOverlay(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW, H = this.viewportH;
  const t = this.time;
  const rnd = pseudoRandom;
  // Perf-Paket 3: Deko-Dichte (jedes Element = ein radialer Gradient/Frame) an
  // die Grafikstufe koppeln — auf iPad (mid/low) deutlich weniger Gradienten.
  const qf = this.quality === 'high' ? 1 : this.quality === 'mid' ? 0.6 : 0.4;

  // 0) Ferne Lava-Tümpel tief in der Höhle — warmes Glühen am Fels-Grat, gibt
  //    der Dunkelheit Wärme und Tiefe (Drachen-Lava-Lair).
  ctx.save();
  const lavaSpan = W * 1.7;
  for (let i = 0; i < Math.round(4 * qf); i++) {
    const bx = rnd(i * 233 + 9) * lavaSpan;
    const lx = ((bx - camera.x * 0.06) % lavaSpan + lavaSpan) % lavaSpan;
    if (lx < -70 || lx > W + 70) continue;
    const ly = H * 0.70 + rnd(i * 97 + 2) * H * 0.05;
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.03 + i * 1.5);
    const rw = 44 + rnd(i * 181) * 40, rh = 9 + rnd(i * 67) * 6;
    // Perf-Paket 2: gebackene Glow-Disc (elliptisch geblittet) statt je Frame
    // neuer Radial-Gradient. Optik wie zuvor (source-over, flacher Tümpel).
    drawGlowDisc(ctx, getGlowDisc(128, 255, 140, 55, 1), lx, ly, rw, rh, 0.26 * pulse, false);
  }
  ctx.restore();

  // 1) Schwere Felsdecke im Vordergrund (dunkel, nah) — schnellster Parallax,
  //    schließt das Bild nach oben ab. Unregelmäßige Unterkante mit Nubben.
  // Perf-Paket 4 (2. Runde): Nahe Felsdecke + Stalaktiten sind STATISCHE Geometrie,
  // die nur mit dem Parallax (0.16) horizontal scrollt. Einmal in einen Welt-Streifen
  // (Parallax-Raum) backen und pro Frame nur den sichtbaren Ausschnitt blitten —
  // spart die ~200 lineTo + Stalaktiten-Fills/Frame. (Der seltene animierte
  // Spitzen-Tropfen entfällt dabei, praktisch unmerklich.)
  ctx.save();
  drawLairCeiling.call(this, camera.x, camera.worldWidth);
  ctx.restore();

  // 3) Untere Eck-Felsmassen — rahmen das Spielfeld links/rechts unten ein.
  ctx.save();
  const cornerGrad = ctx.createLinearGradient(0, H * 0.7, 0, H);
  cornerGrad.addColorStop(0, 'rgba(6,12,8,0)');
  cornerGrad.addColorStop(1, 'rgba(4,9,6,0.85)');
  ctx.fillStyle = cornerGrad;
  // links
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, H * 0.72);
  ctx.quadraticCurveTo(W * 0.10, H * 0.86, W * 0.16, H);
  ctx.closePath(); ctx.fill();
  // rechts
  ctx.beginPath();
  ctx.moveTo(W, H);
  ctx.lineTo(W, H * 0.72);
  ctx.quadraticCurveTo(W * 0.90, H * 0.86, W * 0.84, H);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // 4) Aufsteigende Glut/Sporen — langsam schwebende Punkte, meist grün, ein
  //    paar warm-orange (Drachenfeuer-Asche). Weltverankert, vertikal umlaufend.
  ctx.save();
  for (let i = 0; i < Math.round(18 * qf); i++) {
    const baseX = rnd(i * 53 + 11) * W * 2;
    const ex = ((baseX - camera.x * 0.12) % (W + 40) + (W + 40)) % (W + 40) - 20;
    const speed = 8 + rnd(i * 97 + 2) * 14;
    const ey = (H - ((t * speed * 0.06 + rnd(i * 61) * H) % (H * 0.9))) - H * 0.05;
    const flick = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.05 + i * 2.1));
    const warm = rnd(i * 143 + 4) > 0.78;
    const r = 1.2 + rnd(i * 199) * 1.8;
    const col = warm ? '255,150,60' : '150,240,160';
    // Perf-Paket 2: gebackene Glow-Disc statt je Frame neuer Radial-Gradient.
    const disc = warm ? getGlowDisc(128, 255, 150, 60, 1) : getGlowDisc(128, 150, 240, 160, 1);
    drawGlowDisc(ctx, disc, ex, ey, r * 5, r * 5, 0.22 * flick, false);
    ctx.fillStyle = `rgba(${col},${0.7 * flick})`;
    ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // 5) Augen in der Dunkelheit — ein paar Paare, die langsam blinzeln. Gibt der
  //    Höhle Leben (kleine Drachen, die zusehen), ohne zu erschrecken.
  ctx.save();
  const eyeSpan = W * 1.8;
  for (let i = 0; i < Math.max(2, Math.round(4 * qf)); i++) {
    const bx = rnd(i * 349 + 21) * eyeSpan;
    const ex = ((bx - camera.x * 0.05) % eyeSpan + eyeSpan) % eyeSpan;
    if (ex < 40 || ex > W - 40) continue;
    const ey = H * 0.30 + rnd(i * 421 + 3) * H * 0.34;
    // Blinzeln: meistens offen, kurz zu.
    const blink = Math.sin(t * 0.03 + i * 1.9);
    const open = blink > -0.9 ? 1 : 0.12;
    if (open < 0.2) continue;
    const gap = 7 + rnd(i * 487) * 5;
    const er = 2.2 + rnd(i * 521) * 1.2;
    for (const sgn of [-1, 1]) {
      const px = ex + sgn * gap;
      // Perf-Paket 2: gebackene Glow-Disc statt je Frame neuer Radial-Gradient.
      drawGlowDisc(ctx, getGlowDisc(128, 160, 255, 170, 1), px, ey, er * 4, er * 4, 0.5 * open, false);
      ctx.fillStyle = `rgba(200,255,205,${0.9 * open})`;
      ctx.beginPath(); ctx.ellipse(px, ey, er, er * open, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(20,50,25,${open})`;
      ctx.beginPath(); ctx.ellipse(px, ey, er * 0.4, er * open, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // 6) Verstärkte Umschließungs-Vignette: dunkle Ränder oben/seitlich, damit die
  //    Höhle sich eng und tief anfühlt (stärker als der normale Grade-Vignette).
  ctx.save();
  // Perf-Paket 2: statische Vignette einmal pro Viewport backen, dann nur blitten.
  const vgCache = this.getBgGradCache(`dragon-vignette-${W}x${H}`, (c, w, h) => {
    const vg = c.createRadialGradient(w * 0.5, h * 0.52, h * 0.30, w * 0.5, h * 0.52, h * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.7, 'rgba(3,8,5,0.18)');
    vg.addColorStop(1, 'rgba(2,6,4,0.55)');
    c.fillStyle = vg;
    c.fillRect(0, 0, w, h);
  });
  ctx.drawImage(vgCache, 0, 0);
  ctx.restore();
}

function drawSkyThemeBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;

  const skyCache = this.getBgGradCache('sky-base', (cctx, cw, ch) => {
    const g = cctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#4a2080');
    g.addColorStop(0.15, '#6a40a8');
    g.addColorStop(0.3, '#8860c0');
    g.addColorStop(0.5, '#a088d0');
    g.addColorStop(0.7, '#c0a8e0');
    g.addColorStop(0.85, '#d8c8f0');
    g.addColorStop(1, '#e8e0f8');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, cw, ch);
  }, true);
  this.blitBgCache(skyCache);

  const sunX = W * 0.75;
  const sunY = H * 0.18;
  // Fix B-08: Sonnen-Bloom gedämpft (vorher überstrahlte er Münzen/Kisten und
  // sogar die HUD-Buttons oben rechts). Kleinerer Radius + geringere Deckkraft.
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.32);
  sunGlow.addColorStop(0, 'rgba(255, 240, 200, 0.24)');
  sunGlow.addColorStop(0.3, 'rgba(255, 220, 180, 0.09)');
  sunGlow.addColorStop(0.6, 'rgba(255, 200, 160, 0.03)');
  sunGlow.addColorStop(1, 'rgba(255, 180, 140, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255, 250, 230, 0.95)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 240, 0.6)';
  ctx.beginPath();
  ctx.arc(sunX - 5, sunY - 5, 12, 0, Math.PI * 2);
  ctx.fill();

  const pseudoRand = pseudoRandom;
  for (let i = 0; i < 60; i++) {
    const sx = pseudoRand(i * 7 + 1) * W;
    const sy = pseudoRand(i * 13 + 3) * H * 0.5;
    const brightness = (Math.sin(this.time * 0.02 + i * 0.5) + 1) * 0.5;
    const alpha = 0.15 + brightness * 0.35;
    ctx.fillStyle = `rgba(255, 255, 240, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.8 + brightness * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // God-Rays (Ausrollung, gecacht/additiv): weiche warme Sonnenschäfte aus der
  // Sonne oben rechts, HINTER den Wolken → Tiefe/Volumen im offenen Himmel.
  // Bewusst sehr dezent, damit der helle Himmel/HUD nicht überstrahlt.
  drawGodRays.call(this, 'sky', '255,240,205', 6, 0.03, 0.16, 0.6,
    { spanFrac: 0.55, centerFrac: 0.73, driftAmp: 0.02, driftSpd: 0.005 });

  const cloudConfigs = [
    { y: 0.15, speed: 0.02, scale: 1.2, alpha: 0.4, count: 4 },
    { y: 0.32, speed: 0.04, scale: 1.1, alpha: 0.55, count: 5 },
    { y: 0.52, speed: 0.06, scale: 1.0, alpha: 0.72, count: 4 },
    { y: 0.68, speed: 0.09, scale: 1.5, alpha: 0.88, count: 5 },
  ];

  for (const layer of cloudConfigs) {
    for (let i = 0; i < layer.count; i++) {
      const seed = i * 2341 + Math.floor(layer.y * 1000);
      const baseX = pseudoRand(seed) * W * 2;
      const scrollX = ((baseX - camera.x * layer.speed) % (W + 240)) - 120;
      const cy = H * layer.y + pseudoRand(seed + 1) * 40 - 20;
      const w = (70 + pseudoRand(seed + 2) * 80) * layer.scale;
      const h = (22 + pseudoRand(seed + 3) * 16) * layer.scale;
      this.drawPuffyCloud(scrollX, cy, w, h, layer.alpha);
    }
  }

  const rainbowY = H * 0.55;
  const rainbowColors = [
    'rgba(255,100,100,0.06)', 'rgba(255,180,80,0.06)', 'rgba(255,255,100,0.06)',
    'rgba(100,255,100,0.06)', 'rgba(100,180,255,0.06)', 'rgba(150,100,255,0.06)',
  ];
  for (let i = 0; i < rainbowColors.length; i++) {
    ctx.strokeStyle = rainbowColors[i];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W * 0.3 - camera.x * 0.03, rainbowY + 80, 200 + i * 5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }

  // Sky signature: drifting hot-air balloon, baked into signatureLayers.
  // Slow horizontal drift via parallax + time, gentle vertical bob.
  {
    this.drawFarRange(camera.x);
    const sig = this.getSignatureLayer('sky');
    const t = this.time;
    const baseX = W * 0.5 + t * 0.12;
    const y = H * 0.22 + Math.sin(t * 0.015) * 8 - 30;
    this.drawSignatureLayer('sky', camera.x, baseX, y, 0.05, W * 1.6);
  }

  // BG-Aufwertung · Wolken-Schleier: weiche, fast weiße Wolkenschwaden am
  // unteren Rand, dezent (schwebt in den Wolken).
  this.drawGroundFog(camera, 240, 244, 252, { baseAlpha: 0.10, yFrac: 0.84, count: 6 });
}

function drawStars(this: Renderer, camera: Camera) {
  const seed = 12345;
  const pseudoRand = pseudoRandom;
  for (let i = 0; i < 100; i++) {
    const x = pseudoRand(seed + i * 3) * this.viewportW;
    const y = pseudoRand(seed + i * 7) * this.viewportH * 0.4;
    const sizeClass = pseudoRand(seed + i * 13);
    const twinkleSpeed = 0.02 + pseudoRand(seed + i * 17) * 0.04;
    const twinkle = Math.sin(this.time * twinkleSpeed + i * 1.7) * 0.5 + 0.5;

    if (sizeClass > 0.92) {
      const brightness = twinkle * 0.9 + 0.1;
      this.ctx.globalAlpha = brightness;
      const armLen = 3 + pseudoRand(seed + i * 19) * 2;
      this.ctx.strokeStyle = '#ffffffee';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x - armLen, y);
      this.ctx.lineTo(x + armLen, y);
      this.ctx.moveTo(x, y - armLen);
      this.ctx.lineTo(x, y + armLen);
      this.ctx.stroke();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
      const glow = this.ctx.createRadialGradient(x, y, 0, x, y, armLen * 1.5);
      glow.addColorStop(0, `rgba(255,255,240,${brightness * 0.3})`);
      glow.addColorStop(1, 'rgba(255,255,240,0)');
      this.ctx.fillStyle = glow;
      this.ctx.fillRect(x - armLen * 2, y - armLen * 2, armLen * 4, armLen * 4);
    } else if (sizeClass > 0.7) {
      this.ctx.globalAlpha = twinkle * 0.8 + 0.2;
      this.ctx.fillStyle = '#fffde8';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 1.5 + pseudoRand(seed + i * 23) * 0.8, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.globalAlpha = twinkle * 0.6 + 0.1;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      const sz = 0.5 + pseudoRand(seed + i * 11) * 1;
      this.ctx.fillRect(x, y, sz, sz);
    }
  }
  this.ctx.globalAlpha = 1;
}

function drawSun(this: Renderer, camera: Camera) {
  const sunX = this.viewportW * 0.75 - camera.x * 0.02;
  const sunY = this.viewportH * 0.25;
  const sunRadius = 45;
  const ctx = this.ctx;

  if (!this.sunCache) {
    const size = sunRadius * 4;
    const sc = document.createElement('canvas');
    sc.width = size * 2;
    sc.height = size * 2;
    const sctx = sc.getContext('2d')!;
    const cx = size;
    const cy = size;

    const outerGlow = sctx.createRadialGradient(cx, cy, sunRadius, cx, cy, sunRadius * 2);
    outerGlow.addColorStop(0, 'rgba(255, 200, 80, 0.2)');
    outerGlow.addColorStop(0.5, 'rgba(255, 150, 50, 0.08)');
    outerGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
    sctx.fillStyle = outerGlow;
    sctx.fillRect(0, 0, sc.width, sc.height);

    const corona = sctx.createRadialGradient(cx, cy, 0, cx, cy, sunRadius * 1.2);
    corona.addColorStop(0, '#fffff0');
    corona.addColorStop(0.3, '#fffbe0');
    corona.addColorStop(0.6, '#ffdd66');
    corona.addColorStop(0.85, '#ffaa22');
    corona.addColorStop(1, 'rgba(255,130,0,0)');
    sctx.fillStyle = corona;
    sctx.beginPath();
    sctx.arc(cx, cy, sunRadius * 1.2, 0, Math.PI * 2);
    sctx.fill();

    const core = sctx.createRadialGradient(cx, cy, 0, cx, cy, sunRadius);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.4, '#fffce8');
    core.addColorStop(0.75, '#ffcc33');
    core.addColorStop(1, '#ff8800');
    sctx.fillStyle = core;
    sctx.beginPath();
    sctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
    sctx.fill();

    this.sunCache = sc;
  }

  const size = sunRadius * 4;
  ctx.drawImage(this.sunCache, sunX - size, sunY - size);
}

function buildCloudCache(this: Renderer, w: number, h: number): HTMLCanvasElement {
  const pad = 10;
  const c = document.createElement('canvas');
  c.width = w + pad * 2;
  c.height = h + pad * 2;
  const ctx = c.getContext('2d')!;
  const cx = c.width / 2;
  const cy = c.height / 2;
  const hw = w / 2;
  const hh = h / 2;

  ctx.globalAlpha = 0.4;
  ctx.fillStyle = 'rgba(255,252,248,1)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, hw, hh, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(cx - hw * 0.3, cy + hh * 0.1, hw * 0.55, hh * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + hw * 0.3, cy + hh * 0.08, hw * 0.5, hh * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(cx, cy - hh * 0.25, hw * 0.4, hh * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

function drawClouds(this: Renderer, camera: Camera) {
  if (this.cloudCaches.length === 0) {
    for (const cd of this.cloudData) {
      this.cloudCaches.push(this.buildCloudCache(cd.w, cd.h));
    }
  }

  for (let i = 0; i < this.cloudData.length; i++) {
    const cloud = this.cloudData[i];
    const cx = ((cloud.x - camera.x * 0.03 + this.time * 0.12) % (this.viewportW + 300)) - 150;
    const cy = cloud.y;
    const cached = this.cloudCaches[i];
    this.ctx.drawImage(cached, cx - cached.width / 2, cy - cached.height / 2);
  }
}

function drawBeachBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;

  const beachCache = this.getBgGradCache('beach-base', (cctx, cw, ch) => {
    const g = cctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#1a8dd8');
    g.addColorStop(0.3, '#4ab0e8');
    g.addColorStop(0.55, '#87ceeb');
    g.addColorStop(0.75, '#c8e8f0');
    g.addColorStop(1, '#f0e4b0');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, cw, ch);
  }, true);
  this.blitBgCache(beachCache);

  this.drawSun(camera);
  this.drawClouds(camera);

  const pseudoRand = pseudoRandom;

  ctx.save();
  for (let i = 0; i < 4; i++) {
    const baseX = pseudoRand(i * 4231) * W * 2;
    const scrollX = ((baseX - camera.x * 0.05) % (W + 240)) - 120;
    const baseY = H * 0.74 + pseudoRand(i * 5347) * H * 0.04;
    const scale = 0.7 + pseudoRand(i * 6451) * 0.5;
    this.drawBeachPalm(scrollX, baseY, scale, i);
  }

  const oceanY = H * 0.78;
  const oceanGrad = ctx.createLinearGradient(0, oceanY, 0, H);
  oceanGrad.addColorStop(0, 'rgba(45, 155, 176, 0.3)');
  oceanGrad.addColorStop(0.3, 'rgba(40, 140, 170, 0.35)');
  oceanGrad.addColorStop(1, 'rgba(30, 120, 160, 0.4)');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, oceanY, W, H - oceanY);

  for (let i = 0; i < 3; i++) {
    const waveY = oceanY + i * 8;
    const wavePhase = camera.x * 0.02 + i * 1.5;
    ctx.strokeStyle = `rgba(100, 200, 220, ${0.2 - i * 0.05})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, waveY);
    for (let wx = 0; wx <= W; wx += 3) {
      ctx.lineTo(wx, waveY + Math.sin(wx * 0.02 + wavePhase) * 3);
    }
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(0, H * 0.85);
  for (let dx = 0; dx <= W; dx += 5) {
    const duneH = Math.sin(dx * 0.005 - camera.x * 0.01) * 15 + Math.sin(dx * 0.012) * 8;
    ctx.lineTo(dx, H * 0.85 + duneH);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = 'rgba(232, 212, 160, 0.2)';
  ctx.fill();
  ctx.restore();

  // Strand-Requisiten: bunte Sonnenschirme, ein Wasserball und Seesterne/Muscheln
  // auf dem Sand — mittlerer Parallax, damit sie klar zur Strand-Szene gehören,
  // aber die Spielfläche nicht verdecken.
  this.drawBeachProps(camera);

  // Beach signature: Leuchtturm auf einer Felsspitze (mit kleinem Segelboot),
  // steht auf der fernen Küstenlinie.
  {
    const sig = this.getSignatureLayer('beach');
    const baseX = W * 0.62;
    const y = oceanY - sig.height + 10;   // Felssockel auf der Küstenlinie
    this.drawFarRange(camera.x);
    this.drawSignatureLayer('beach', camera.x, baseX, y, 0.05, W * 1.7);
  }

  // BG-Aufwertung · Strand-Dunst: warmer, sandig-goldener Meeresschleier am
  // Boden, dezent (heller Tag).
  this.drawGroundFog(camera, 236, 220, 182, { baseAlpha: 0.10, yFrac: 0.82 });
}

function drawAustraliaBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;

  const ausCache = this.getBgGradCache('australia-base', (cctx, cw, ch) => {
    const g = cctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#1a6dd4');
    g.addColorStop(0.2, '#4a90d0');
    g.addColorStop(0.4, '#c89040');
    g.addColorStop(0.6, '#f0a040');
    g.addColorStop(0.8, '#e8c060');
    g.addColorStop(1, '#e8d080');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, cw, ch);
  }, true);
  this.blitBgCache(ausCache);

  const sunX = W * 0.65 - camera.x * 0.015;
  const sunY = H * 0.2;
  const sunR = 60;
  const outerGlow = ctx.createRadialGradient(sunX, sunY, sunR, sunX, sunY, sunR * 3);
  outerGlow.addColorStop(0, 'rgba(255, 180, 60, 0.3)');
  outerGlow.addColorStop(0.5, 'rgba(255, 140, 40, 0.1)');
  outerGlow.addColorStop(1, 'rgba(255, 100, 20, 0)');
  ctx.fillStyle = outerGlow;
  ctx.fillRect(0, 0, W, H);

  const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  core.addColorStop(0, '#fffff0');
  core.addColorStop(0.3, '#ffe880');
  core.addColorStop(0.7, '#ffaa30');
  core.addColorStop(1, 'rgba(255,130,20,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // (Keine zusätzlichen God-Rays im Outback: die Welt hat bereits einen radialen
  // Sonnen-Strahlenkranz — ein zweites Schaft-Bündel würde nur überladen.)

  const pseudoRand = pseudoRandom;

  ctx.save();
  const rockConfigs = [
    { baseX: 300, width: 120, height: 60, parallax: 0.06 },
    { baseX: 800, width: 200, height: 90, parallax: 0.05 },
    { baseX: 1400, width: 80, height: 45, parallax: 0.07 },
  ];
  for (const rock of rockConfigs) {
    const rx = ((rock.baseX - camera.x * rock.parallax) % (W + rock.width * 2)) - rock.width;
    const ry = H * 0.65;
    ctx.fillStyle = 'rgba(160, 60, 30, 0.2)';
    ctx.beginPath();
    ctx.moveTo(rx - rock.width / 2, ry + 10);
    ctx.quadraticCurveTo(rx - rock.width * 0.3, ry - rock.height, rx, ry - rock.height * 0.9);
    ctx.quadraticCurveTo(rx + rock.width * 0.3, ry - rock.height, rx + rock.width / 2, ry + 10);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 4; i++) {
    const baseX = pseudoRand(i * 2741) * W * 2;
    const scrollX = ((baseX - camera.x * 0.04) % (W + 100)) - 50;
    const treeY = H * 0.65 + pseudoRand(i * 3847) * H * 0.08;
    const treeH = 40 + pseudoRand(i * 4951) * 30;

    ctx.strokeStyle = 'rgba(80, 50, 30, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scrollX, treeY);
    ctx.lineTo(scrollX - 2, treeY - treeH);
    ctx.stroke();

    for (let b = 0; b < 3; b++) {
      const branchY = treeY - treeH * (0.4 + b * 0.2);
      const side = b % 2 === 0 ? 1 : -1;
      const branchLen = 10 + pseudoRand(i * 100 + b) * 15;
      ctx.beginPath();
      ctx.moveTo(scrollX, branchY);
      ctx.lineTo(scrollX + side * branchLen, branchY - 5);
      ctx.stroke();
    }
  }

  // Definierte Sand-Dünen im Mittelgrund mit sonnenbeschienener Oberkante —
  // geben dem Outback klarere Tiefe statt nur blasser Fernketten (v459).
  const dunes = [
    { baseY: 0.70, amp: 24, freq: 0.0060, par: 0.05, fill: 'rgba(198,134,66,0.42)', rim: 'rgba(255,216,144,0.5)', phase: 0.0 },
    { baseY: 0.775, amp: 18, freq: 0.0092, par: 0.09, fill: 'rgba(172,106,54,0.55)', rim: 'rgba(255,198,124,0.42)', phase: 2.1 },
  ];
  for (const d of dunes) {
    const yy = (x: number) => {
      const wx = x + camera.x * d.par;
      return H * d.baseY + Math.sin(wx * d.freq + d.phase) * d.amp
        + Math.sin(wx * d.freq * 2.6 + d.phase * 1.5) * d.amp * 0.3;
    };
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, yy(0));
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, yy(x));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = d.fill;
    ctx.fill();
    ctx.strokeStyle = d.rim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) { const y = yy(x); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(232, 208, 128, 0.08)';
  for (let hx = 0; hx < W; hx += 3) {
    const hazeH = 3 + Math.sin(hx * 0.03 + this.time * 0.02) * 2;
    ctx.fillRect(hx, H * 0.9 - hazeH, 3, hazeH * 2);
  }
  ctx.restore();

  // Australia signature: Uluru-style monolith baked into signatureLayers.
  {
    this.drawFarRange(camera.x);
    const sig = this.getSignatureLayer('australia');
    this.drawSignatureLayer('australia', camera.x, W * 0.55 + sig.width, H * 0.66 - sig.height, 0.025, W * 1.6);
  }

  // Outback-Wahrzeichen: Farm-Windrad (Southern-Cross-Wasserpumpe) auf dem
  // Horizont, näherer Parallax als Uluru → räumliche Tiefe. Rad dreht langsam.
  {
    const t = this.time;
    const p = W * 1.7;
    const bx = ((W * 0.28 - camera.x * 0.055) % p + p) % p;
    const by = H * 0.70;
    if (bx > -70 && bx < W + 70) drawOutbackWindmill(ctx, bx, by, t);
  }

  // BG-Aufwertung · Outback-Hitzeflimmern: warmer ockerfarbener Staubschleier
  // am Boden (trockene Hitze).
  this.drawGroundFog(camera, 220, 180, 130, { baseAlpha: 0.12, yFrac: 0.80 });
}

// =====================================================================
//  Volcano background — glowing crimson sky, distant erupting volcanoes,
//  charred parallax silhouettes, drifting smoke clouds.
// =====================================================================
// Perf (Parallax-Cache, abgesichert): Die STATISCHEN Vulkan-Kegel-Körper
// (Verlaufs-Silhouette + beleuchtete Flanke) ändern je Frame nur ihre X-Position
// (Parallax), nicht ihre Form/Farbe. Statt sie pro Frame mit je 1 linearem + 1
// radialem Verlauf + Clip neu zu malen, backen wir jede eindeutige Kegel-Form
// EINMAL in ein Offscreen-Sprite (in Geräte-Auflösung → scharfe Silhouettenkante
// auf Retina) und blitten sie danach nur noch. Es gibt genau 5 eindeutige Formen
// (3 fern + 2 nah), also max. 5 Sprites im Cache. Alle ANIMIERTEN Schichten
// (Krater-Glut/Pulse, Rauchsäule, Lava-Flackern, Funken) bleiben unverändert live
// → keine Naht-/Parallax-Risiken eines getilten Streifens, nur die teuren
// statischen Verläufe fallen weg.
const _volcConeCache = new Map<string, HTMLCanvasElement>();
function getVolcCone(
  coneW: number, coneH: number,
  top: string, mid: string, bot: string, litAlpha: number, scale: number,
): HTMLCanvasElement {
  // `scale` = STABILER Geräte-Skalierungsfaktor (renderer.baseDeviceScale), NICHT
  // der Live-Zoom-abhängige Wert → der Key ändert sich nur bei echtem Resize, nie
  // pro Frame durch Speed-/Impact-Zoom (sonst würde jede Bewegung neu backen).
  const key = `${coneW}x${coneH}|${top}|${mid}|${bot}|${litAlpha}|${scale.toFixed(2)}`;
  const hit = _volcConeCache.get(key);
  if (hit) return hit;
  const pad = 2;
  const lw = Math.ceil(coneW) + pad * 2;
  const lh = Math.ceil(coneH) + pad * 2;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(lw * scale));
  cv.height = Math.max(1, Math.round(lh * scale));
  const c = cv.getContext('2d');
  if (!c) return cv;
  c.scale(scale, scale);
  const cx = coneW / 2 + pad;      // lokale Kegel-Achse
  const baseY = coneH + pad;       // lokale Basis
  const topY = pad;                // lokaler Krater-Rand
  const craterHalf = coneW * 0.11;
  c.beginPath();
  c.moveTo(cx - coneW / 2, baseY);
  c.quadraticCurveTo(cx - coneW * 0.30, baseY - coneH * 0.52, cx - craterHalf, topY);
  c.lineTo(cx + craterHalf, topY);
  c.quadraticCurveTo(cx + coneW * 0.30, baseY - coneH * 0.52, cx + coneW / 2, baseY);
  c.closePath();
  const bg = c.createLinearGradient(0, topY, 0, baseY);
  bg.addColorStop(0, top);
  bg.addColorStop(0.72, mid);
  bg.addColorStop(1, bot);
  c.fillStyle = bg;
  c.fill();
  if (litAlpha > 0) {
    c.save();
    c.clip();
    const P = 0.58; // Basis-Pulse (0.55±0.12); sichtbares Pulsieren liefert die live Krater-Glut
    const lit = c.createRadialGradient(cx, topY + 4, 2, cx, topY + 4, coneH * 0.95);
    lit.addColorStop(0, `rgba(255,140,54,${litAlpha * P})`);
    lit.addColorStop(0.5, `rgba(198,66,20,${litAlpha * 0.38 * P})`);
    lit.addColorStop(1, 'rgba(120,20,10,0)');
    c.fillStyle = lit;
    c.fillRect(cx - coneW / 2, topY, coneW, coneH);
    c.restore();
  }
  _volcConeCache.set(key, cv);
  return cv;
}

// God-Ray-Feinschliff (perf-neutral): weiche volumetrische Lichtschäfte werden
// EINMAL in ein additiv-fertiges Sprite gebacken (transparenter Hintergrund,
// getönte Schäfte mit weichem Abfall nach unten, leicht aufgefächert) und pro
// Frame nur additiv geblittet — mit langsamer Horizontal-Drift + dezentem
// Alpha-Puls. KEIN Verlauf pro Frame, nur 1 drawImage → echtes „mehr Stimmung
// bei null Zusatzkosten". In Geräte-Auflösung gebacken → scharfe weiche Kanten.
const _godRayCache = new Map<string, HTMLCanvasElement>();
function getGodRayStrip(
  key: string, bw: number, bh: number,
  tintRGB: string, shafts: number, maxAlpha: number,
): HTMLCanvasElement {
  // bw/bh sind bereits GERÄTE-Pixel (aus dem Backing-Store abgeleitet) → stabil
  // gegen den Live-Zoom (viewportW ändert sich pro Frame, canvas.width nicht).
  // Schaft-Geometrie in Bruchteilen der Streifenbreite → auflösungsunabhängig.
  const w = Math.max(1, Math.round(bw));
  const h = Math.max(1, Math.round(bh));
  const ck = `${key}|${w}x${h}|${tintRGB}|${shafts}|${maxAlpha}`;
  const hit = _godRayCache.get(ck);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  if (!c) return cv;
  const inset = w * 0.06; // Rand, damit auffächernde Rand-Schäfte nicht hart abgeschnitten werden
  for (let i = 0; i < shafts; i++) {
    const f = (i + 0.5) / shafts;
    const cxk = inset + f * (w - 2 * inset);              // Schaft-Zentrum (eingerückt)
    const topW = w * (0.007 + (i % 3) * 0.004);           // schmal oben (Bruchteil der Breite)
    const botW = topW * 3.6;                              // breit unten (aufgefächert)
    const skew = (f - 0.5) * w * 0.10;                    // leichte Schrägstellung
    const a = maxAlpha * (0.45 + 0.55 * pseudoRandom(i * 53 + 7));
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(${tintRGB},${a.toFixed(3)})`);
    g.addColorStop(0.55, `rgba(${tintRGB},${(a * 0.45).toFixed(3)})`);
    g.addColorStop(1, `rgba(${tintRGB},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(cxk - topW / 2, 0);
    c.lineTo(cxk + topW / 2, 0);
    c.lineTo(cxk + botW / 2 + skew, h);
    c.lineTo(cxk - botW / 2 + skew, h);
    c.closePath();
    c.fill();
  }
  _godRayCache.set(ck, cv);
  return cv;
}

/** Leert die modulweiten Sprite-Caches (Vulkan-Kegel, God-Rays). Aufgerufen von
 *  resetBackground() (Levelstart) und engine.applyBackingStore() (Resize/Quality),
 *  konsistent zu bgGradCaches — verhindert veraltete Auflösungs-Sprites & Wachstum. */
function clearBgSpriteCaches(this: Renderer): void {
  _volcConeCache.clear();
  _godRayCache.clear();
  _spacePlanetCache.clear();
}

// Space-Planeten sind rein deterministisch aus (r, seed) → statisches Aussehen,
// nur die X-Position (Parallaxe) ändert sich. Jede eindeutige Planeten-Form wird
// EINMAL in ein Geräte-Auflösungs-Sprite gebacken (stabiler baseDeviceScale-Anker,
// zoom-fest) und danach nur noch geblittet — spart pro Frame Radial-Verläufe +
// Clip + Detail-Strokes je Planet.
const _spacePlanetCache = new Map<string, HTMLCanvasElement>();
function getPlanetSprite(
  key: string, halfW: number, halfH: number, scale: number,
  draw: (c: CanvasRenderingContext2D, lx: number, ly: number) => void,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const pad = 2;
  const lw = Math.ceil(halfW * 2) + pad * 2;
  const lh = Math.ceil(halfH * 2) + pad * 2;
  const ck = `${key}|${lw}x${lh}|${scale.toFixed(2)}`;
  const hit = _spacePlanetCache.get(ck);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(lw * scale));
  cv.height = Math.max(1, Math.round(lh * scale));
  const c = cv.getContext('2d');
  if (!c) return cv;
  c.scale(scale, scale);
  draw(c, halfW + pad, halfH + pad); // Zeichnen ums lokale Zentrum
  _spacePlanetCache.set(ck, cv);
  return cv;
}

/** Blittet einen gecachten God-Ray-Streifen additiv mit langsamer Drift + Puls.
 *  spanFrac/centerFrac steuern Breite & Mitte des Schaft-Bündels (für gebündelte
 *  Strahlen aus einer Lichtquelle, z. B. Sonne oben rechts) — Default = volle
 *  Breite mittig. */
function drawGodRays(
  this: Renderer, key: string, tintRGB: string, shafts: number, maxAlpha: number,
  topFrac: number, hFrac: number,
  opts: { spanFrac?: number; centerFrac?: number; driftAmp?: number; driftSpd?: number } = {},
): void {
  const { spanFrac = 1.4, centerFrac = 0.5, driftAmp = 0.06, driftSpd = 0.004 } = opts;
  const ctx = this.ctx, W = this.viewportW, H = this.viewportH, t = this.time;
  // Backen in GERÄTE-Pixeln (Backing-Store × Fraktion) → Key/Backing stabil gegen
  // Live-Zoom; Blitt-Ziel = Live-(gezoomter) Viewport, drawImage skaliert 1:1 aufs
  // Backing (device-exakt, retina-scharf).
  const bw = (this.ctx.canvas.width || W) * spanFrac;
  const bh = (this.ctx.canvas.height || H) * hFrac;
  const rw = W * spanFrac, rh = H * hFrac;
  const strip = getGodRayStrip(key, bw, bh, tintRGB, shafts, maxAlpha);
  const drift = Math.sin(t * driftSpd) * (W * driftAmp);
  const pulseA = 0.82 + Math.sin(t * 0.013 + 1.1) * 0.18;
  const x0 = W * centerFrac - rw / 2 + drift;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = pulseA;
  const prevS = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(strip, 0, 0, strip.width, strip.height, x0, H * topFrac, rw, rh);
  ctx.imageSmoothingEnabled = prevS;
  ctx.restore();
}

function drawVolcanoBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;
  const t = this.time;

  // Reicherer Himmel: rauchig-violettes Dunkel oben → heißes Amber am Horizont
  // → dunkler Ascheboden. Deutlich mehr Tonwert-Spanne als das flache Rot.
  const volcCache = this.getBgGradCache('volcano-base', (cctx, cw, ch) => {
    const g = cctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#170a1a');
    g.addColorStop(0.28, '#3a1220');
    g.addColorStop(0.54, '#7c1e14');
    g.addColorStop(0.74, '#d3601c');
    g.addColorStop(0.86, '#ff9038');
    g.addColorStop(1, '#2a0a08');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, cw, ch);
  }, true);
  this.blitBgCache(volcCache);

  const pulse = 0.55 + Math.sin(t * 0.02) * 0.12;
  const horizonY = H * 0.80;

  // Breites Glut-Band am Horizont (Lava-Schein hinter den Bergen).
  const band = ctx.createLinearGradient(0, horizonY - H * 0.24, 0, horizonY + H * 0.06);
  band.addColorStop(0, 'rgba(255,150,50,0)');
  band.addColorStop(0.62, `rgba(255,150,50,${0.20 * pulse})`);
  band.addColorStop(1, `rgba(255,214,128,${0.40 * pulse})`);
  ctx.fillStyle = band;
  ctx.fillRect(0, horizonY - H * 0.24, W, H * 0.30);

  // Ferne Bergketten (atmosphärische Tiefe, gemalt) — vorhandener Helfer.
  this.drawFarRange(camera.x);

  // ── Vulkan-Kegel-Helfer: gekrümmte (leicht konvexe) Flanken statt spitzem
  // Dreieck; Körper-Verlauf dunkel→lava-warm; optional beleuchtete Krater-Flanke.
  // Perf: statische Silhouette wird als Sprite gecacht (getVolcCone) und nur noch
  // an der Parallax-Position geblittet — kein Verlauf/Clip mehr pro Frame/Kegel.
  const coneScale = this.baseDeviceScale || 1;
  const drawCone = (
    sx: number, baseY: number, coneW: number, coneH: number,
    top: string, mid: string, bot: string, litAlpha: number,
  ) => {
    const cone = getVolcCone(coneW, coneH, top, mid, bot, litAlpha, coneScale);
    const pad = 2;
    const lw = Math.ceil(coneW) + pad * 2;
    const lh = Math.ceil(coneH) + pad * 2;
    const prevS = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true; // weiche Silhouette/Verlauf sauber runterskalieren
    ctx.drawImage(cone, 0, 0, cone.width, cone.height, sx - coneW / 2 - pad, baseY - coneH - pad, lw, lh);
    ctx.imageSmoothingEnabled = prevS;
  };

  // Aufsteigende, driftende Rauchsäule aus einem Krater (unten glut-warm,
  // oben aschgrau, nach oben ausblendend).
  const drawPlume = (sx: number, topY: number, height: number, seed: number) => {
    const puffs = Math.max(4, Math.floor(height / 15));
    ctx.save();
    for (let s = 0; s < puffs; s++) {
      const f = s / puffs;
      const rise = (t * 0.32 + seed * 37) % 44;
      const py = topY - s * 13 - rise;
      const drift = Math.sin(f * 3.1 + t * 0.011 + seed) * (16 * f) + f * 20 * (seed % 2 ? 1 : -1);
      const r = 7 + f * 27;
      const warm = Math.max(0, 1 - f * 1.7);
      const cr = Math.round(66 + warm * 168);
      const cg = Math.round(48 + warm * 60);
      const cb = Math.round(54 + warm * 6);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${(0.17 * (1 - f)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx + drift, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Perf: statt pro Aufruf (5×/Frame) einen radialen Verlauf zu allokieren, die
  // Krater-Glut EINMAL als 2-Ton-Disc backen (gelb→orange→transparent, Referenz-
  // Alpha) und nur skaliert/mit a*pulse geblittet. source-over wie zuvor.
  const craterDisc = getGlowDiscMulti('volcCrater', 128, [
    [0, 'rgba(255,236,150,1)'],
    [0.45, 'rgba(255,110,34,0.5)'],
    [1, 'rgba(90,0,0,0)'],
  ]);
  const craterGlow = (sx: number, cy: number, rad: number, a: number) => {
    drawGlowDisc(ctx, craterDisc, sx, cy, rad, rad, a * pulse, false);
  };

  const lavaFlows = (sx: number, topY: number, coneW: number, coneH: number, i: number) => {
    ctx.lineCap = 'round';
    for (let lf = 0; lf < 3; lf++) {
      const dir = lf % 2 === 0 ? 1 : -1;
      const spread = (lf + 1) * 0.09;
      const startX = sx + dir * coneW * 0.03;
      const endX = sx + dir * coneW * (0.16 + spread);
      const midX = sx + dir * coneW * (0.09 + spread * 0.5);
      const flick = 0.6 + Math.sin(t * 0.04 + i + lf) * 0.24;
      ctx.strokeStyle = `rgba(214,60,14,${0.42 * flick})`;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(startX, topY + 4);
      ctx.quadraticCurveTo(midX, topY + coneH * 0.5, endX, topY + coneH - 6);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,214,120,${0.9 * flick})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(startX, topY + 4);
      ctx.quadraticCurveTo(midX, topY + coneH * 0.5, endX, topY + coneH - 6);
      ctx.stroke();
    }
  };

  // ── Ferne Vulkan-Ebene (klein, dunstig, zum Horizont getönt, langsam) ──
  const farBaseY = H * 0.80;
  for (let i = 0; i < 3; i++) {
    const anchor = i * 380 + 140;
    const sx = ((anchor - camera.x * 0.028) % (W + 520) + W + 520) % (W + 520) - 200;
    const coneW = 200 + (i % 2) * 60;
    const coneH = 84 + (i % 3) * 18;
    drawCone(sx, farBaseY, coneW, coneH, '#3a1720', '#4a1a1c', '#2c0e12', 0.20);
    craterGlow(sx, farBaseY - coneH, 20, 0.30);
    drawPlume(sx, farBaseY - coneH, coneH * 0.7, i + 1);
  }

  // ── Nahe Vulkan-Ebene (groß, dunkel, Lavaströme + kräftige Rauchsäule) ──
  const nearBaseY = H * 0.86;
  for (let i = 0; i < 2; i++) {
    const anchor = i * 560 + 300;
    const sx = ((anchor - camera.x * 0.055) % (W + 760) + W + 760) % (W + 760) - 260;
    const coneW = 300 + i * 90;
    const coneH = 150 + i * 26;
    const topY = nearBaseY - coneH;
    drawCone(sx, nearBaseY, coneW, coneH, '#1a0810', '#241016', '#0c0406', 0.5);
    lavaFlows(sx, topY, coneW, coneH, i);
    craterGlow(sx, topY, 34, 0.66);
    drawPlume(sx, topY, coneH * 1.15, i * 2 + 3);
  }

  // God-Rays (Feinschliff, gecacht/additiv): warme Lichtschäfte brechen durch die
  // aschige Höhe — verstärken die glühende Vulkan-Stimmung, kosten pro Frame nur
  // 1 additiven Blit (kein Verlauf). Dezent gehalten, damit Münzen/Kisten nicht
  // überstrahlt werden.
  drawGodRays.call(this, 'volcano', '255,150,64', 7, 0.045, 0.04, 0.74,
    { spanFrac: 1.3, centerFrac: 0.5, driftAmp: 0.025, driftSpd: 0.004 });

  // Vordergrund-Grat mit glühender Oberkante.
  ctx.save();
  ctx.fillStyle = '#0a0204';
  ctx.beginPath();
  ctx.moveTo(0, H);
  // Perf: gröbere Schrittweite (12) für die weiche dunkle Grat-Silhouette.
  for (let x = 0; x <= W + 20; x += 12) {
    const wx = x + camera.x * 0.12;
    const ridgeY = H * 0.88 + Math.sin(wx * 0.012) * 22 + Math.sin(wx * 0.04) * 8;
    ctx.lineTo(x, ridgeY);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(255,130,44,${0.4 * pulse})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let x = 0; x <= W + 20; x += 12) {
    const wx = x + camera.x * 0.12;
    const ridgeY = H * 0.88 + Math.sin(wx * 0.012) * 22 + Math.sin(wx * 0.04) * 8;
    if (x === 0) ctx.moveTo(x, ridgeY); else ctx.lineTo(x, ridgeY);
  }
  ctx.stroke();
  ctx.restore();

  // Aufsteigende glühende Funken/Asche (driften nach OBEN, flackern).
  ctx.save();
  for (let i = 0; i < 34; i++) {
    const seed = i * 91.7;
    const ex = ((i * 149 - camera.x * 0.06) % (W + 40) + W + 40) % (W + 40) - 20;
    const ey = (H * 0.9 - ((t * 0.5 + seed * 3) % (H * 0.85)) + Math.sin(t * 0.03 + i) * 10);
    const flick = 0.4 + Math.sin(t * 0.12 + i) * 0.5;
    const r = 0.8 + (i % 3) * 0.6;
    ctx.fillStyle = `rgba(255,${150 + (i % 4) * 22},60,${0.4 * flick})`;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // (Alte Signatur-Aschekegel entfernt — die neuen gestaffelten Vulkan-Ebenen
  // liefern die Silhouetten/Eruptionen; drawFarRange läuft bereits oben, korrekt
  // hinter den Kegeln.)

  // BG-Aufwertung · Bodennebel Vulkan: warmer, aschig-glühender Rauchschleier
  // am Boden (Ember-Ton), etwas höher liegend als im Dschungel.
  this.drawGroundFog(camera, 208, 128, 92, { baseAlpha: 0.13, yFrac: 0.78 });
}

// =====================================================================
//  Ice background — pale arctic gradient, distant glaciers, icy wind
//  haze, frozen peaks with snow caps and aurora shimmer.
// =====================================================================
function drawIceBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;
  const t = this.time;

  // Basis-Verlauf gecacht (Geräte-Auflösung, retina-scharf) statt pro Frame neu.
  const iceCache = this.getBgGradCache('ice-base', (cctx, cw, ch) => {
    const g = cctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#0a1a3a');
    g.addColorStop(0.25, '#3055a0');
    g.addColorStop(0.55, '#88b8e0');
    g.addColorStop(0.8, '#c8e0f0');
    g.addColorStop(1, '#e8f4fa');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, cw, ch);
  }, true);
  this.blitBgCache(iceCache);

  const sunX = W * 0.78;
  const sunY = H * 0.18;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.5);
  sunGlow.addColorStop(0, 'rgba(220, 240, 255, 0.5)');
  sunGlow.addColorStop(0.5, 'rgba(180, 220, 255, 0.18)');
  sunGlow.addColorStop(1, 'rgba(180, 220, 255, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(250, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
  ctx.fill();

  // W2.4 · ferne Parallax-Bergkette (atmosphärische Perspektive: sehr blass,
  // verschwimmt im Dunst, scrollt langsamer als die vorderen Berge). Billig.
  ctx.fillStyle = 'rgba(202, 224, 242, 0.55)';
  ctx.beginPath();
  ctx.moveTo(-60, H * 0.44);
  for (let sx = -60; sx <= W + 60; sx += 34) {
    const wx = sx + camera.x * 0.025;
    const y = H * 0.44 - Math.abs(Math.sin(wx * 0.004 + 1.3)) * H * 0.14 - Math.abs(Math.sin(wx * 0.011 + 2.1)) * H * 0.05;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(W + 60, H * 0.44);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  for (let band = 0; band < 3; band++) {
    const baseY = H * 0.16 + band * 14;
    const hue = 160 + band * 30;
    ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${0.16 - band * 0.04})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const ny = baseY + Math.sin(x * 0.012 + t * 0.01 + band * 1.7) * 14;
      if (x === 0) ctx.moveTo(x, ny);
      else ctx.lineTo(x, ny);
    }
    ctx.stroke();
  }
  ctx.restore();

  const pseudoRand = pseudoRandom;

  ctx.save();
  for (let i = 0; i < 6; i++) {
    const seed = i * 5347;
    const baseX = pseudoRand(seed) * W * 2;
    const sx = ((baseX - camera.x * 0.05) % (W + 280)) - 140;
    const peakH = 90 + pseudoRand(seed + 1) * 60;
    const baseW = 200 + pseudoRand(seed + 2) * 80;
    const baseY = H * 0.78;

    const grad = ctx.createLinearGradient(0, baseY - peakH, 0, baseY);
    grad.addColorStop(0, '#e8f4fa');
    grad.addColorStop(0.4, '#a8c4e0');
    grad.addColorStop(1, '#5878a8');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx - baseW / 2, baseY);
    ctx.lineTo(sx - baseW * 0.18, baseY - peakH * 0.7);
    ctx.lineTo(sx, baseY - peakH);
    ctx.lineTo(sx + baseW * 0.22, baseY - peakH * 0.65);
    ctx.lineTo(sx + baseW / 2, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.moveTo(sx - baseW * 0.16, baseY - peakH * 0.7 + 4);
    ctx.lineTo(sx, baseY - peakH);
    ctx.lineTo(sx + baseW * 0.18, baseY - peakH * 0.65 + 4);
    ctx.lineTo(sx + baseW * 0.06, baseY - peakH * 0.5);
    ctx.lineTo(sx - baseW * 0.06, baseY - peakH * 0.55);
    ctx.closePath();
    ctx.fill();

    // Blaue Eis-Spalten für kristalline Tiefe.
    ctx.strokeStyle = 'rgba(80, 140, 205, 0.45)';
    ctx.lineWidth = 1.5;
    for (let cr = 0; cr < 2; cr++) {
      const crX = sx + (cr === 0 ? -1 : 1) * baseW * 0.12;
      ctx.beginPath();
      ctx.moveTo(crX, baseY - peakH * 0.55);
      ctx.lineTo(crX + (cr === 0 ? -3 : 4), baseY - peakH * 0.3);
      ctx.lineTo(crX + (cr === 0 ? 1 : -1), baseY - peakH * 0.08);
      ctx.stroke();
    }
    // Glitzer-Funkeln auf dem Eis.
    for (let g = 0; g < 3; g++) {
      const gx = sx + (pseudoRand(seed + g * 31) - 0.5) * baseW * 0.5;
      const gy = baseY - peakH * (0.3 + pseudoRand(seed + g * 37) * 0.5);
      const tw = 0.35 + Math.sin(t * 0.08 + g + i) * 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, tw)})`;
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  }
  ctx.restore();

  // Sanfter Schneefall (driftende Flocken).
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const fx = (pseudoRand(i * 211) * W + Math.sin(t * 0.02 + i) * 12) % W;
    const fy = (pseudoRand(i * 307) * H + t * (0.3 + (i % 4) * 0.15)) % H;
    const r = 0.8 + (i % 3) * 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + (i % 3) * 0.15})`;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(220, 235, 250, 0.95)';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 20; x += 6) {
    const wx = x + camera.x * 0.14;
    const ridgeY = H * 0.83 + Math.sin(wx * 0.014) * 18 + Math.sin(wx * 0.05) * 6;
    ctx.lineTo(x, ridgeY);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(120, 170, 220, 0.35)';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 20; x += 6) {
    const wx = x + camera.x * 0.14;
    const ridgeY = H * 0.83 + Math.sin(wx * 0.014) * 18 + Math.sin(wx * 0.05) * 6;
    ctx.lineTo(x, ridgeY + 4);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Ice signature: Iglu-Dorf mit Pinguinen — steht auf der fernen Schneelinie
  // (nicht hinter der Spielfläche), gebacken in signatureLayers.
  {
    this.drawFarRange(camera.x);
    const sig = this.getSignatureLayer('ice');
    this.drawSignatureLayer('ice', camera.x, W * 0.2 + sig.width, H * 0.60 - sig.height, 0.1, W * 1.3);
  }

  // BG-Aufwertung · Eis-Bodenfrost: kalter, blass-blauer Frostschleier am
  // Boden, dezent.
  this.drawGroundFog(camera, 202, 226, 240, { baseAlpha: 0.11, yFrac: 0.83 });
}

// =====================================================================
//  Castle background — moody purple-black sky, distant gothic spires,
//  crescent moon with creeping clouds, bat silhouettes.
// =====================================================================
function drawCastleBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;
  const t = this.time;

  // Basis-Verlauf gecacht (Geräte-Auflösung, retina-scharf) statt pro Frame neu.
  const castleCache = this.getBgGradCache('castle-base', (cctx, cw, ch) => {
    const g = cctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#08020e');
    g.addColorStop(0.3, '#1a0a2a');
    g.addColorStop(0.6, '#321448');
    g.addColorStop(0.85, '#52205a');
    g.addColorStop(1, '#1a0820');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, cw, ch);
  }, true);
  this.blitBgCache(castleCache);

  const pseudoRand = pseudoRandom;

  ctx.save();
  for (let i = 0; i < 70; i++) {
    const sx = pseudoRand(i * 311) * W;
    const sy = pseudoRand(i * 521) * H * 0.55;
    const tw = 0.45 + Math.sin(t * 0.03 + i * 0.7) * 0.45;
    ctx.fillStyle = `rgba(240, 230, 255, ${0.35 + tw * 0.45})`;
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.restore();

  const moonX = W * 0.72;
  const moonY = H * 0.2;
  // Perf: statischer Mond-Schein als gebackene Disc (Referenz-Alpha 1), pro Frame
  // nur mit 0.4 geblittet statt Radial-Allokation. source-over wie zuvor.
  drawGlowDisc(ctx, getGlowDiscMulti('castleMoon', 128, [
    [0, 'rgba(220,200,240,1)'],
    [1, 'rgba(150,120,200,0)'],
  ]), moonX, moonY, 90, 90, 0.4, false);
  ctx.fillStyle = 'rgba(245, 235, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0a2a';
  ctx.beginPath();
  ctx.arc(moonX + 10, moonY - 4, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 16, 0.9)';
  for (let i = 0; i < 4; i++) {
    const seed = i * 7717;
    const baseX = pseudoRand(seed) * W * 2;
    const sx = ((baseX - camera.x * 0.05) % (W + 280)) - 140;
    const baseY = H * 0.76;
    const wallH = 80 + pseudoRand(seed + 1) * 40;
    const wallW = 120 + pseudoRand(seed + 2) * 60;

    ctx.fillRect(sx - wallW / 2, baseY - wallH, wallW, wallH);
    const crens = 6;
    for (let c = 0; c < crens; c++) {
      if (c % 2 === 0) {
        ctx.fillRect(sx - wallW / 2 + (c * wallW) / crens, baseY - wallH - 6, wallW / crens, 6);
      }
    }
    const towerH = wallH + 30;
    const towerW = 22;
    ctx.fillRect(sx - wallW / 2 - towerW / 2, baseY - towerH, towerW, towerH);
    ctx.fillRect(sx + wallW / 2 - towerW / 2, baseY - towerH, towerW, towerH);
    ctx.beginPath();
    ctx.moveTo(sx - wallW / 2 - towerW, baseY - towerH);
    ctx.lineTo(sx - wallW / 2, baseY - towerH - 16);
    ctx.lineTo(sx - wallW / 2 + towerW, baseY - towerH);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + wallW / 2 - towerW, baseY - towerH);
    ctx.lineTo(sx + wallW / 2, baseY - towerH - 16);
    ctx.lineTo(sx + wallW / 2 + towerW, baseY - towerH);
    ctx.closePath();
    ctx.fill();
    // Mondlicht-Saum auf den mondzugewandten Kanten (Mond rechts oben).
    ctx.strokeStyle = 'rgba(150, 130, 200, 0.32)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + wallW / 2, baseY - wallH);
    ctx.lineTo(sx + wallW / 2, baseY);
    ctx.moveTo(sx + wallW / 2 + towerW / 2, baseY - towerH);
    ctx.lineTo(sx + wallW / 2 + towerW / 2, baseY);
    ctx.stroke();
    // Wehende Fahnen auf den Turmspitzen.
    for (const tx of [sx - wallW / 2, sx + wallW / 2]) {
      ctx.strokeStyle = 'rgba(120, 100, 170, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, baseY - towerH - 16);
      ctx.lineTo(tx, baseY - towerH - 28);
      ctx.stroke();
      const wave = Math.sin(t * 0.1 + tx * 0.1) * 2;
      ctx.fillStyle = 'rgba(150, 60, 95, 0.6)';
      ctx.beginPath();
      ctx.moveTo(tx, baseY - towerH - 28);
      ctx.lineTo(tx + 9, baseY - towerH - 26 + wave);
      ctx.lineTo(tx, baseY - towerH - 23);
      ctx.closePath();
      ctx.fill();
    }
    // Beleuchtete Fenster (kleines Gitter, flackernd).
    for (let wf = 0; wf < 5; wf++) {
      const wfx = sx - wallW / 2 + 14 + (wf % 3) * (wallW / 3.5);
      const wfy = baseY - wallH * (0.4 + Math.floor(wf / 3) * 0.28);
      const flick = 0.4 + Math.sin(t * 0.15 + i * 1.7 + wf) * 0.4;
      ctx.fillStyle = `rgba(255, 185, 90, ${0.55 * flick})`;
      ctx.fillRect(wfx, wfy, 3, 5);
    }
    ctx.fillStyle = 'rgba(8, 4, 16, 0.9)';
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 4; i++) {
    const speed = 0.5 + (i % 3) * 0.3;
    const bx = ((t * speed + i * 200 - camera.x * 0.08) % (W + 80)) - 40;
    const by = H * (0.18 + (i % 4) * 0.06) + Math.sin(t * 0.06 + i) * 8;
    const flap = Math.sin(t * 0.4 + i) * 4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - 5, by - flap, bx - 9, by);
    ctx.quadraticCurveTo(bx - 5, by + 1, bx, by + 1);
    ctx.quadraticCurveTo(bx + 5, by + 1, bx + 9, by);
    ctx.quadraticCurveTo(bx + 5, by - flap, bx, by);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#08020e';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 20; x += 8) {
    const wx = x + camera.x * 0.14;
    const ridgeY = H * 0.88 + Math.sin(wx * 0.013) * 16 + Math.sin(wx * 0.05) * 6;
    ctx.lineTo(x, ridgeY);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  const fog = ctx.createLinearGradient(0, H * 0.7, 0, H);
  fog.addColorStop(0, 'rgba(80, 40, 100, 0)');
  fog.addColorStop(1, 'rgba(80, 40, 100, 0.25)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, H * 0.7, W, H * 0.3);
  ctx.restore();

  // Castle signature: distant gothic cathedral spire silhouette baked
  // into signatureLayers. Drawn before the foreground castle walls so
  // it sits on the deep horizon.
  {
    this.drawFarRange(camera.x);
    const sig = this.getSignatureLayer('castle');
    this.drawSignatureLayer('castle', camera.x, W * 0.45 + sig.width, H * 0.76 - sig.height, 0.03, W * 1.6);
  }

  // Castle atmosphere: occasional lightning flash + bolt silhouette.
  // Triggered every ~6 seconds via a sin-window so it feels stormy
  // without being seizure-inducing. Uses time-only seeding so all worlds
  // see the same flash schedule per camera position.
  {
    const phase = (t * 0.01) % (Math.PI * 2);
    const flash = Math.max(0, Math.sin(phase * 1.0) - 0.92) * 12; // brief spike
    if (flash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(220, 220, 255, ${Math.min(0.35, flash * 0.4)})`;
      ctx.fillRect(0, 0, W, H);
      // Bolt
      const bx = ((W * 0.6 - camera.x * 0.04) % W + W) % W;
      const by = H * 0.05;
      ctx.strokeStyle = `rgba(240, 240, 255, ${Math.min(0.95, flash * 0.9)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - 6, by + 18);
      ctx.lineTo(bx + 4, by + 26);
      ctx.lineTo(bx - 8, by + 50);
      ctx.lineTo(bx + 2, by + 58);
      ctx.lineTo(bx - 10, by + 80);
      ctx.stroke();
      ctx.restore();
    }
  }

  // BG-Aufwertung · Bodennebel Geisterschloss: fahler, kränklich grün-teal
  // Schwaden am Boden — verstärkt die unheimliche Stimmung.
  this.drawGroundFog(camera, 150, 184, 168, { baseAlpha: 0.12, yFrac: 0.81 });
}

// =====================================================================
//  Underwater background — deep blue gradient, sun rays from above,
//  distant rocks/coral silhouettes, drifting kelp, swimming silhouettes.
// =====================================================================
function drawUnderwaterBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;
  const t = this.time;

  // Basis-Verlauf gecacht (Geräte-Auflösung, retina-scharf) statt pro Frame neu.
  const seaCache = this.getBgGradCache('underwater-base', (cctx, cw, ch) => {
    const g = cctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#3088c8');
    g.addColorStop(0.25, '#1c5a98');
    g.addColorStop(0.55, '#0a3868');
    g.addColorStop(0.85, '#062045');
    g.addColorStop(1, '#020e28');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, cw, ch);
  }, true);
  this.blitBgCache(seaCache);

  ctx.save();
  for (let i = 0; i < 7; i++) {
    const rx = (i * (W / 6) + Math.sin(t * 0.01 + i) * 18 - camera.x * 0.04 + W * 2) % (W + 80) - 40;
    const ry0 = 0;
    const ry1 = H * 0.8;
    const grad = ctx.createLinearGradient(rx, ry0, rx + 30, ry1);
    grad.addColorStop(0, 'rgba(180, 220, 255, 0.18)');
    grad.addColorStop(0.5, 'rgba(140, 200, 240, 0.07)');
    grad.addColorStop(1, 'rgba(50, 100, 160, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(rx, ry0);
    ctx.lineTo(rx + 24, ry0);
    ctx.lineTo(rx + 60, ry1);
    ctx.lineTo(rx - 6, ry1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(180, 230, 255, 0.18)';
  for (let x = 0; x < W; x += 4) {
    const sh = 4 + Math.sin(x * 0.06 + t * 0.04) * 3;
    ctx.fillRect(x, 4, 4, sh);
  }
  ctx.restore();

  const pseudoRand = pseudoRandom;

  ctx.save();
  for (let i = 0; i < 5; i++) {
    const seed = i * 6131;
    const baseX = pseudoRand(seed) * W * 2;
    const sx = ((baseX - camera.x * 0.06) % (W + 260)) - 130;
    const baseY = H * 0.82;
    const peakH = 80 + pseudoRand(seed + 1) * 50;
    const baseW = 130 + pseudoRand(seed + 2) * 60;

    const grad = ctx.createLinearGradient(0, baseY - peakH, 0, baseY);
    grad.addColorStop(0, '#0a3050');
    grad.addColorStop(1, '#03152a');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(sx - baseW / 2, baseY);
    const segs = 6;
    for (let s = 1; s < segs; s++) {
      const segX = sx - baseW / 2 + (s / segs) * baseW;
      const segY = baseY - peakH * (0.4 + Math.abs(Math.sin(s * 1.7 + i)) * 0.6);
      ctx.lineTo(segX, segY);
    }
    ctx.lineTo(sx + baseW / 2, baseY);
    ctx.closePath();
    ctx.fill();

    // Bunte Korallen auf der Felsformation (verschiedene Typen, volle Deckkraft).
    const coralN = 4;
    for (let c = 0; c < coralN; c++) {
      const cx = sx + (c - (coralN - 1) / 2) * (baseW * 0.22) + Math.sin(i + c) * 4;
      const cy = baseY - peakH * (0.35 + pseudoRand(seed + c * 13) * 0.32);
      this.drawCoral(cx, cy, 0.8 + pseudoRand(seed + c * 17) * 0.55, seed + c * 23);
    }
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 8; i++) {
    const seed = i * 9311;
    const baseX = pseudoRand(seed) * W * 2;
    const kx = ((baseX - camera.x * 0.12) % (W + 60)) - 30;
    const baseY = H;
    const kelpH = 100 + pseudoRand(seed + 1) * 70;
    const kelpCol = pseudoRand(seed + 5) > 0.5 ? '40,140,90' : '28,108,68';
    const pts: [number, number][] = [[kx, baseY]];
    const segs = 6;
    for (let s = 1; s <= segs; s++) {
      const sy = baseY - (s / segs) * kelpH;
      const sway = Math.sin(t * 0.04 + i + s * 0.4) * (s * 1.6);
      pts.push([kx + sway, sy]);
    }
    ctx.strokeStyle = `rgba(${kelpCol}, 0.82)`;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
    ctx.stroke();
    // Blätter wechselseitig entlang des Stiels.
    ctx.fillStyle = `rgba(${kelpCol}, 0.7)`;
    for (let p = 1; p < pts.length; p++) {
      const side = p % 2 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(pts[p][0] + side * 6, pts[p][1], 7, 3, side * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 6; i++) {
    const speed = 0.3 + (i % 3) * 0.2;
    const fx = ((t * speed + i * 220 - camera.x * 0.05) % (W + 60)) - 30;
    const fy = H * (0.28 + (i % 4) * 0.12) + Math.sin(t * 0.05 + i) * 8;
    ctx.fillStyle = 'rgba(20, 60, 100, 0.6)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.moveTo(fx - 4, fy);
    ctx.lineTo(fx - 7, fy - 2);
    ctx.lineTo(fx - 7, fy + 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Underwater signature: gesunkenes Schiffswrack (Galeone) — ruht auf dem
  // fernen Meeresgrund (kein Schweben/Bob), gebacken in signatureLayers.
  {
    this.drawFarRange(camera.x);
    const sig = this.getSignatureLayer('underwater');
    const baseX = W * 0.5;
    const y = H * 0.74 - sig.height;   // Rumpf-Unterseite auf dem Grund
    this.drawSignatureLayer('underwater', camera.x, baseX, y, 0.06, W * 1.8);
  }

  // BG-Aufwertung · Tiefsee-Schwebeschleier: kühles blaugrünes Schweben am
  // Grund (Sediment/Trübung), mehr Schwaden für dichteres Wasser-Gefühl.
  this.drawGroundFog(camera, 90, 150, 176, { baseAlpha: 0.12, yFrac: 0.84, count: 9 });
}

// =====================================================================
//  Space background — black sky with multi-layer parallax stars,
//  swirling nebula, distant planet, drifting asteroids.
// =====================================================================
function drawSpaceBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW;
  const H = this.viewportH;
  const t = this.time;

  // Basis-Verlauf gecacht (Geräte-Auflösung, retina-scharf) statt pro Frame neu.
  const spaceCache = this.getBgGradCache('space-base', (cctx, cw, ch) => {
    const g = cctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#01010a');
    g.addColorStop(0.4, '#08081a');
    g.addColorStop(0.7, '#10082a');
    g.addColorStop(1, '#04020c');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, cw, ch);
  }, true);
  this.blitBgCache(spaceCache);

  const pseudoRand = pseudoRandom;

  ctx.save();
  const nebulae = [
    { x: 0.25, y: 0.35, r: 220, hue: 280, alpha: 0.18 },
    { x: 0.75, y: 0.55, r: 260, hue: 200, alpha: 0.14 },
    { x: 0.5, y: 0.2, r: 180, hue: 320, alpha: 0.12 },
  ];
  for (const n of nebulae) {
    const cx = (n.x * W * 2 - camera.x * 0.02) % (W + n.r * 2) - n.r;
    const cy = n.y * H;
    // Perf: Nebel-Disc je Farbton EINMAL gebacken (Referenz-Alpha), pro Frame nur
    // skaliert/mit n.alpha geblittet statt Radial-Allokation. source-over wie zuvor.
    const nd = getGlowDiscMulti(`neb${n.hue}`, 128, [
      [0, `hsla(${n.hue}, 80%, 60%, 1)`],
      [0.5, `hsla(${n.hue + 20}, 70%, 40%, 0.5)`],
      [1, 'rgba(0,0,0,0)'],
    ]);
    drawGlowDisc(ctx, nd, cx, cy, n.r, n.r, n.alpha, false);
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 140; i++) {
    const sx = ((pseudoRand(i * 311) * W * 2 - camera.x * 0.03) % W + W) % W;
    const sy = pseudoRand(i * 521) * H;
    ctx.fillStyle = `rgba(220, 220, 240, ${0.25 + pseudoRand(i * 113) * 0.25})`;
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 80; i++) {
    const sx = ((pseudoRand(i * 419) * W * 2 - camera.x * 0.08) % W + W) % W;
    const sy = pseudoRand(i * 631) * H;
    const tw = 0.5 + Math.sin(t * 0.04 + i * 0.7) * 0.5;
    const size = 1 + (i % 3 === 0 ? 1 : 0);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + tw * 0.45})`;
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 25; i++) {
    const sx = ((pseudoRand(i * 727) * W * 2 - camera.x * 0.18) % W + W) % W;
    const sy = pseudoRand(i * 829) * H * 0.7;
    const tw = 0.6 + Math.sin(t * 0.06 + i * 1.3) * 0.4;
    ctx.fillStyle = `rgba(255, 250, 220, ${0.7 * tw})`;
    ctx.fillRect(sx, sy, 2, 2);
    ctx.strokeStyle = `rgba(255, 250, 220, ${0.35 * tw})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy + 1);
    ctx.lineTo(sx + 5, sy + 1);
    ctx.moveTo(sx + 1, sy - 3);
    ctx.lineTo(sx + 1, sy + 5);
    ctx.stroke();
  }
  ctx.restore();

  // Kleinere, farbige Planeten in verschiedenen Tiefen (mehr räumliche Fülle).
  ctx.save();
  const planets = [
    { x: 0.18, y: 0.62, r: 22, par: 0.04, seed: 71 },
    { x: 0.85, y: 0.22, r: 16, par: 0.07, seed: 142 },
    { x: 0.45, y: 0.74, r: 13, par: 0.09, seed: 219 },
  ];
  for (const p of planets) {
    const px = ((p.x * W * 2 - camera.x * p.par) % (W + p.r * 4) + (W + p.r * 4)) % (W + p.r * 4) - p.r * 2;
    this.drawSpacePlanet(px, p.y * H, p.r, p.seed);
  }
  ctx.restore();

  ctx.save();
  const planetX = ((W * 0.7 - camera.x * 0.05) % (W * 1.5) + W * 1.5) % (W * 1.5);
  const planetY = H * 0.28;
  const planetR = 48;
  // Perf: der große Ringplanet ist statisch (nur Parallaxe) → einmal in ein Sprite
  // backen (Ringe reichen bis 1.7·R horizontal, Terminator bis ~1.1·R vertikal)
  // und nur noch blitten. Identischer Zeichencode um das lokale Zentrum.
  const ringScale = this.baseDeviceScale || 1;
  const rhw = planetR * 1.75 + 3, rhh = planetR * 1.15 + 3;
  const ringSprite = getPlanetSprite('ringed|48', rhw, rhh, ringScale, (c, lx, ly) => {
    const pg = c.createRadialGradient(lx - planetR * 0.4, ly - planetR * 0.4, planetR * 0.1, lx, ly, planetR);
    pg.addColorStop(0, '#f0c8a0');
    pg.addColorStop(0.5, '#c87850');
    pg.addColorStop(1, '#5a2010');
    c.fillStyle = pg;
    c.beginPath();
    c.arc(lx, ly, planetR, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(220, 200, 180, 0.45)';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(lx, ly, planetR * 1.5, planetR * 0.35, -0.3, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = 'rgba(180, 160, 140, 0.25)';
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(lx, ly, planetR * 1.7, planetR * 0.4, -0.3, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = 'rgba(0, 0, 0, 0.35)';
    c.beginPath();
    c.arc(lx + planetR * 0.3, ly + planetR * 0.1, planetR, 0, Math.PI * 2);
    c.fill();
  });
  if (ringSprite) {
    const pad = 2;
    const lw = Math.ceil(rhw * 2) + pad * 2;
    const lh = Math.ceil(rhh * 2) + pad * 2;
    const prevS = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(ringSprite, 0, 0, ringSprite.width, ringSprite.height, planetX - rhw - pad, planetY - rhh - pad, lw, lh);
    ctx.imageSmoothingEnabled = prevS;
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 6; i++) {
    const seed = i * 1031;
    const ax = ((pseudoRand(seed) * W * 2 - camera.x * 0.16 + t * 0.2) % (W + 60)) - 30;
    const ay = pseudoRand(seed + 1) * H * 0.6 + 30 + Math.sin(t * 0.02 + i) * 6;
    const ar = 4 + pseudoRand(seed + 2) * 6;
    ctx.fillStyle = '#3a3540';
    ctx.beginPath();
    ctx.arc(ax, ay, ar, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(ax - ar * 0.3, ay - ar * 0.3, ar * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Space signature: distant ringed gas giant baked into signatureLayers.
  // Slow horizontal drift via parallax; a tiny per-frame red beacon is
  // overlaid (the only dynamic element) to keep the scene feeling alive.
  {
    const sig = this.getSignatureLayer('space');
    const baseX = W * 0.6 + t * 0.05;
    const y = H * 0.42 + Math.sin(t * 0.01) * 6 - sig.height / 2;
    this.drawSignatureLayer('space', camera.x, baseX, y, 0.05, W * 1.8);
  }

  // Space-Wahrzeichen: eine Orbital-Raumstation (Solarflügel + Kernmodul +
  // Andockring + Schüssel), eigenes Motiv mit näherem Parallax → mehr Tiefe.
  {
    const p = W * 1.8;
    const sx = ((W * 0.24 - camera.x * 0.1 + t * 0.04) % p + p) % p;
    const sy = H * 0.24 + Math.sin(t * 0.008) * 5;
    if (sx > -140 && sx < W + 140) drawSpaceStation(ctx, sx, sy, t);
  }

  // BG-Aufwertung · Space dezent: sehr zarter violetter Nebel-Schleier am
  // unteren Rand (Nebula-Anmutung), bewusst schwach, wenige Schwaden.
  this.drawGroundFog(camera, 132, 110, 202, { baseAlpha: 0.08, yFrac: 0.86, count: 5 });
}

// Höhlen-Mine als Wahrzeichen: Holz-Stollenportal mit schwarzem Tunnel, eine
// Erz-Lore auf Schienen und eine hängende Grubenlampe mit warmem Schein.
// Dunkle Silhouette mit hellen Holzkanten, damit sie auf dem Höhlen-Grund liest.
function drawCaveMine(ctx: CanvasRenderingContext2D, bx: number, by: number, t: number): void {
  ctx.save();
  const A = 0.82;
  const wood = `rgba(74,54,38,${A})`;
  const woodLite = `rgba(116,88,58,${A})`;
  const iron = `rgba(58,62,74,${A})`;
  const ironLite = `rgba(96,102,118,${A})`;
  const rail = `rgba(92,96,110,${A})`;

  // ── Stollenportal (links): schwarzes Tunnelloch + Holzrahmen ──
  const pL = bx - 60, pR = bx - 20, lintel = by - 54;
  // schwarze Öffnung.
  ctx.fillStyle = 'rgba(3,4,10,0.92)';
  ctx.beginPath();
  ctx.moveTo(pL + 4, by); ctx.lineTo(pL + 4, lintel + 8);
  ctx.quadraticCurveTo((pL + pR) / 2, lintel - 2, pR - 4, lintel + 8);
  ctx.lineTo(pR - 4, by); ctx.closePath(); ctx.fill();
  // Pfosten + Sturz.
  ctx.fillStyle = wood;
  ctx.fillRect(pL, lintel, 7, by - lintel);
  ctx.fillRect(pR - 7, lintel, 7, by - lintel);
  ctx.fillRect(pL - 4, lintel - 7, (pR - pL) + 8, 8);
  ctx.fillStyle = woodLite;                       // Lichtkante oben
  ctx.fillRect(pL - 4, lintel - 7, (pR - pL) + 8, 2);
  ctx.fillRect(pL, lintel, 2, by - lintel);
  // Diagonalstrebe.
  ctx.strokeStyle = wood; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(pL + 6, lintel + 4); ctx.lineTo(pR - 6, by - 4); ctx.stroke();

  // ── Hängende Grubenlampe am Sturz (warmer Schein) ──
  const lx = (pL + pR) / 2, ly = lintel + 12;
  ctx.strokeStyle = iron; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(lx, lintel); ctx.lineTo(lx, ly - 4); ctx.stroke();
  const flick = 0.8 + Math.sin(t * 0.15) * 0.2;
  const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, 34);
  halo.addColorStop(0, `rgba(255,196,110,${0.5 * flick})`);
  halo.addColorStop(1, 'rgba(255,196,110,0)');
  ctx.fillStyle = halo; ctx.fillRect(lx - 34, ly - 34, 68, 68);
  ctx.fillStyle = `rgba(255,214,140,${A})`;
  ctx.fillRect(lx - 2.5, ly - 3, 5, 6);
  ctx.fillStyle = iron;
  ctx.fillRect(lx - 3, ly - 5, 6, 2);

  // ── Schienen über den Boden ──
  const rlx = pR - 6, rrx = bx + 46;
  ctx.strokeStyle = rail; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(rlx, by); ctx.lineTo(rrx, by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rlx, by + 3); ctx.lineTo(rrx, by + 3); ctx.stroke();
  ctx.strokeStyle = wood; ctx.lineWidth = 2;      // Schwellen
  for (let sx = rlx + 3; sx < rrx; sx += 9) { ctx.beginPath(); ctx.moveTo(sx, by - 1); ctx.lineTo(sx, by + 4); ctx.stroke(); }

  // ── Erz-Lore (Mine cart) auf den Schienen ──
  const cxc = bx + 14, wheelY = by - 3, cartTop = by - 22;
  // Wagenkasten (Trapez, oben breiter).
  ctx.fillStyle = iron;
  ctx.beginPath();
  ctx.moveTo(cxc - 20, cartTop); ctx.lineTo(cxc + 20, cartTop);
  ctx.lineTo(cxc + 15, wheelY - 2); ctx.lineTo(cxc - 15, wheelY - 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = ironLite; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';             // Innenschatten
  ctx.fillRect(cxc - 16, cartTop + 2, 32, 5);
  // Erz-Ladung (glitzernde Kristalle).
  for (const [ox, oy, oc] of [[-8, -2, '#9a6cff'], [2, -4, '#c49bff'], [10, -1, '#7a52d8']] as [number, number, string][]) {
    ctx.fillStyle = oc;
    ctx.beginPath();
    ctx.moveTo(cxc + ox, cartTop + oy); ctx.lineTo(cxc + ox + 3, cartTop - 5 + oy); ctx.lineTo(cxc + ox + 6, cartTop + oy);
    ctx.closePath(); ctx.fill();
  }
  // Räder.
  ctx.fillStyle = iron;
  for (const wx of [cxc - 11, cxc + 11]) {
    ctx.beginPath(); ctx.arc(wx, wheelY, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ironLite; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = ironLite; ctx.beginPath(); ctx.arc(wx, wheelY, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = iron;
  }

  // Erz-Haufen neben der Lore.
  ctx.fillStyle = `rgba(52,50,64,${A})`;
  ctx.beginPath(); ctx.moveTo(bx + 34, by); ctx.lineTo(bx + 42, by - 8); ctx.lineTo(bx + 50, by); ctx.closePath(); ctx.fill();

  ctx.restore();
}

// Outback-Farm-Windrad (Southern-Cross-Wasserpumpe): Gitterturm, vielblättriges
// Windrad (dreht langsam), Schwanz-Windfahne, kleiner Wassertank. Warme,
// dunst-getönte Metall-Silhouette gegen den Outback-Himmel.
function drawOutbackWindmill(ctx: CanvasRenderingContext2D, bx: number, by: number, t: number): void {
  ctx.save();
  const A = 0.72;
  const metal = `rgba(64,44,32,${A})`;
  const metalLite = `rgba(120,86,58,${A})`;
  const towerH = 66, baseHalf = 13, topHalf = 4.5;
  const topY = by - towerH;

  // Gitterturm: vier Beine (als zwei sichtbare Kanten) + Querstreben.
  ctx.strokeStyle = metal; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx - baseHalf, by); ctx.lineTo(bx - topHalf, topY);
  ctx.moveTo(bx + baseHalf, by); ctx.lineTo(bx + topHalf, topY);
  ctx.stroke();
  // Querstreben + Kreuzverstrebung (X) in Segmenten.
  ctx.lineWidth = 1;
  const segs = 5;
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const y = by - towerH * f;
    const hw = baseHalf + (topHalf - baseHalf) * f;
    ctx.beginPath(); ctx.moveTo(bx - hw, y); ctx.lineTo(bx + hw, y); ctx.stroke();
    if (i < segs) {
      const f2 = (i + 1) / segs;
      const y2 = by - towerH * f2;
      const hw2 = baseHalf + (topHalf - baseHalf) * f2;
      ctx.beginPath();
      ctx.moveTo(bx - hw, y); ctx.lineTo(bx + hw2, y2);
      ctx.moveTo(bx + hw, y); ctx.lineTo(bx - hw2, y2);
      ctx.stroke();
    }
  }

  // Plattform-Kopf.
  const hubX = bx, hubY = topY - 2;
  ctx.fillStyle = metal;
  ctx.fillRect(bx - topHalf - 2, topY - 1, (topHalf + 2) * 2, 2);

  // Schwanz-Windfahne (hinter dem Rad, zeigt nach rechts).
  ctx.strokeStyle = metal; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(hubX, hubY); ctx.lineTo(hubX + 26, hubY - 4); ctx.stroke();
  ctx.fillStyle = metalLite;
  ctx.beginPath();
  ctx.moveTo(hubX + 20, hubY - 7); ctx.lineTo(hubX + 30, hubY - 8);
  ctx.lineTo(hubX + 30, hubY + 2); ctx.lineTo(hubX + 20, hubY - 1);
  ctx.closePath(); ctx.fill();

  // Vielblättriges Windrad (dreht langsam).
  const spin = t * 0.03;
  const blades = 16, rOut = 15, rIn = 3.5;
  ctx.save();
  ctx.translate(hubX, hubY);
  ctx.rotate(spin);
  ctx.strokeStyle = metalLite; ctx.lineWidth = 1.4;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
    ctx.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
    ctx.stroke();
  }
  // Felgenringe.
  ctx.strokeStyle = metal; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, rOut, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, rOut * 0.6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // Nabe.
  ctx.fillStyle = metal;
  ctx.beginPath(); ctx.arc(hubX, hubY, 2.4, 0, Math.PI * 2); ctx.fill();

  // Kleiner Wassertank am Fuß.
  ctx.fillStyle = metalLite;
  ctx.fillRect(bx + baseHalf + 2, by - 12, 12, 12);
  ctx.fillStyle = metal;
  ctx.fillRect(bx + baseHalf + 2, by - 12, 12, 1.5);

  ctx.restore();
}

// Orbital-Raumstation als Weltraum-Wahrzeichen: zwei Solarflügel an einem
// Querträger, ein Kernmodul mit beleuchteten Fenstern, Andockring und eine
// Antennenschüssel. Metallische Kaltblau-Palette, blinkende Navigationslichter.
function drawSpaceStation(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
  ctx.save();
  const hullDark = '#2b3145';
  const hullMid = '#5a6178';
  const hullLite = '#9aa2b8';

  // Querträger (Truss).
  ctx.fillStyle = hullMid;
  ctx.fillRect(cx - 54, cy - 2.5, 108, 5);
  ctx.fillStyle = hullLite;
  ctx.fillRect(cx - 54, cy - 2.5, 108, 1.2);

  // Solarflügel (beide Seiten): dunkelblaue Panels mit Zellenraster + Glanz.
  const panel = (px: number) => {
    const pw = 40, ph = 30;
    const g = ctx.createLinearGradient(px, cy - ph / 2, px, cy + ph / 2);
    g.addColorStop(0, '#2a4c8e'); g.addColorStop(0.5, '#1e3a72'); g.addColorStop(1, '#152a56');
    ctx.fillStyle = g;
    ctx.fillRect(px, cy - ph / 2, pw, ph);
    // Rahmen
    ctx.strokeStyle = hullMid; ctx.lineWidth = 1.2;
    ctx.strokeRect(px, cy - ph / 2, pw, ph);
    // Zellenraster
    ctx.strokeStyle = 'rgba(90,130,200,0.6)'; ctx.lineWidth = 0.6;
    for (let gx = 1; gx < 4; gx++) { ctx.beginPath(); ctx.moveTo(px + gx * pw / 4, cy - ph / 2); ctx.lineTo(px + gx * pw / 4, cy + ph / 2); ctx.stroke(); }
    for (let gy = 1; gy < 3; gy++) { ctx.beginPath(); ctx.moveTo(px, cy - ph / 2 + gy * ph / 3); ctx.lineTo(px + pw, cy - ph / 2 + gy * ph / 3); ctx.stroke(); }
    // Sonnen-Glanzstreifen
    ctx.strokeStyle = 'rgba(150,190,255,0.4)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(px + 3, cy - ph / 2 + 3); ctx.lineTo(px + pw - 3, cy - ph / 2 + 3); ctx.stroke();
  };
  panel(cx - 94);
  panel(cx + 54);

  // Kernmodul (vertikale Kapsel) mit beleuchteten Fenstern.
  const mw = 20, mh = 44;
  const mg = ctx.createLinearGradient(cx - mw / 2, 0, cx + mw / 2, 0);
  mg.addColorStop(0, hullDark); mg.addColorStop(0.4, hullMid); mg.addColorStop(0.6, hullLite); mg.addColorStop(1, hullMid);
  ctx.fillStyle = mg;
  roundRectPath(ctx, cx - mw / 2, cy - mh / 2, mw, mh, 7);
  ctx.fill();
  ctx.strokeStyle = hullDark; ctx.lineWidth = 1; ctx.stroke();
  // Fenster (warmes Licht).
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(255,224,150,0.85)';
    ctx.beginPath(); ctx.arc(cx, cy - mh / 2 + 10 + i * 11, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  // Andockring unten.
  ctx.strokeStyle = hullLite; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(cx, cy + mh / 2 + 3, 8, 3, 0, 0, Math.PI * 2); ctx.stroke();

  // Antennenschüssel oben, leicht seitlich.
  ctx.strokeStyle = hullMid; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(cx + 4, cy - mh / 2); ctx.lineTo(cx + 16, cy - mh / 2 - 12); ctx.stroke();
  ctx.fillStyle = 'rgba(200,210,230,0.85)';
  ctx.beginPath(); ctx.ellipse(cx + 18, cy - mh / 2 - 14, 6, 4, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hullDark;
  ctx.beginPath(); ctx.ellipse(cx + 18, cy - mh / 2 - 14, 3, 2, -0.6, 0, Math.PI * 2); ctx.fill();

  // Blinkende Navigationslichter (rot oben, grün an den Flügelspitzen).
  const blink = (Math.sin(t * 0.12) + 1) * 0.5;
  ctx.fillStyle = `rgba(255,70,60,${0.35 + blink * 0.6})`;
  ctx.beginPath(); ctx.arc(cx, cy - mh / 2 - 3, 2.2, 0, Math.PI * 2); ctx.fill();
  const blink2 = (Math.sin(t * 0.12 + Math.PI) + 1) * 0.5;
  ctx.fillStyle = `rgba(90,255,120,${0.3 + blink2 * 0.6})`;
  ctx.beginPath(); ctx.arc(cx - 94, cy, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 94, cy, 1.8, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// Aerial Perspective: a soft, theme-tinted haze band laid over the FAR
// elements (sky, distant silhouette, far parallax) after the background
// is drawn but before the near tiles. The gradient peaks around the
// horizon and fades to zero toward the play-field, so distant things sink
// into atmospheric depth while the foreground stays crisp. One fillRect
// per frame, cached gradient stops — negligible cost.
function drawAerialHaze(this: Renderer, W: number, H: number) {
  const theme = this.currentTheme;
  // Tint + strength per theme. Open-air worlds get a brighter, airier haze;
  // enclosed/dark worlds (cave, castle, space) a cooler, dimmer depth veil.
  const HAZE: Record<string, { c: string; peak: number }> = {
    jungle: { c: '188,214,176', peak: 0.11 },
    cave: { c: '46,54,78', peak: 0.12 },
    sky: { c: '214,232,250', peak: 0.11 },
    beach: { c: '226,236,246', peak: 0.10 },
    australia: { c: '232,206,164', peak: 0.10 },
    volcano: { c: '92,58,56', peak: 0.12 },
    ice: { c: '218,236,250', peak: 0.11 },
    castle: { c: '64,54,84', peak: 0.12 },
    underwater: { c: '42,116,146', peak: 0.15 },
    space: { c: '52,46,92', peak: 0.10 },
    // Grafik-Feinschliff: die neuesten Welten hatten keinen Eintrag und bekamen
    // den grau-blauen Default bei fast doppelter Stärke (0.20) — das entsättigte
    // gerade die pastelligen/warmen Paletten. Jetzt paletten-passend & dezent.
    school: { c: '224,214,190', peak: 0.10 },
    gym: { c: '232,214,176', peak: 0.10 },
    trampoline: { c: '198,236,214', peak: 0.10 },
    plush: { c: '245,225,240', peak: 0.09 },
    bluefield: { c: '196,222,240', peak: 0.10 },
    dragon: { c: '40,70,48', peak: 0.11 },
  };
  const h = HAZE[theme] || { c: '200,212,224', peak: 0.12 };
  const ctx = this.ctx;
  // Dunst als Band um den Horizont konzentriert (dort, wo die fernen
  // Elemente an das Spielfeld stoßen), nach oben zum klaren Himmel und nach
  // unten zum scharfen Vordergrund auslaufend. So bleibt der Himmel frei und
  // nur die Distanz versinkt im Schleier.
  const bandTop = H * 0.30;
  const bandBot = H * 0.72;
  const g = ctx.createLinearGradient(0, bandTop, 0, bandBot);
  g.addColorStop(0, `rgba(${h.c},0)`);
  g.addColorStop(0.5, `rgba(${h.c},${h.peak})`);
  g.addColorStop(1, `rgba(${h.c},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, bandTop, W, bandBot - bandTop);
}

function drawBeachPalm(this: Renderer, x: number, baseY: number, scale: number, seed: number): void {
  const ctx = this.ctx;
  const trunkH = 64 * scale;
  const lean = (pseudoRandom(seed * 13 + 1) - 0.5) * 26 * scale;
  const topX = x + lean;
  const topY = baseY - trunkH;
  ctx.save();
  ctx.lineCap = 'round';
  // Stamm (gebogen) mit hellerer Lichtkante.
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 6.5 * scale;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * 0.4, baseY - trunkH * 0.55, topX, topY);
  ctx.stroke();
  ctx.strokeStyle = '#aa8b5c';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(x - 1.5 * scale, baseY);
  ctx.quadraticCurveTo(x + lean * 0.4 - 1.5 * scale, baseY - trunkH * 0.55, topX - 1.5 * scale, topY);
  ctx.stroke();
  // Segment-Ringe.
  ctx.strokeStyle = 'rgba(70,48,22,0.5)';
  ctx.lineWidth = 1;
  for (let s = 0.15; s < 0.95; s += 0.13) {
    const sx = x + lean * s * s;
    const sy = baseY - trunkH * s;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4 * scale, 1.4 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Krone: gefüllte, hängende Palmwedel.
  const fronds = 7;
  for (let f = 0; f < fronds; f++) {
    const ang = -Math.PI * 0.5 + (f - (fronds - 1) / 2) * 0.46;
    const len = (36 + (f % 2) * 8) * scale;
    const ex = topX + Math.cos(ang) * len;
    const ey = topY + Math.sin(ang) * len + 8 * scale;
    const midX = topX + Math.cos(ang) * len * 0.5;
    const midY = topY + Math.sin(ang) * len * 0.5 - 6 * scale;
    ctx.fillStyle = f % 2 === 0 ? '#2a9d3a' : '#238a32';
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, ex, ey);
    ctx.quadraticCurveTo(midX + 3, midY + 5, topX, topY + 3);
    ctx.closePath();
    ctx.fill();
  }
  // Heller Wedel-Mittelrippen-Glanz.
  for (let f = 0; f < fronds; f++) {
    const ang = -Math.PI * 0.5 + (f - (fronds - 1) / 2) * 0.46;
    const len = (36 + (f % 2) * 8) * scale * 0.72;
    ctx.strokeStyle = 'rgba(130,225,130,0.5)';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(topX + Math.cos(ang) * len, topY + Math.sin(ang) * len);
    ctx.stroke();
  }
  // Kokosnüsse.
  ctx.fillStyle = '#6a4a28';
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.arc(topX + k * 4 * scale, topY + 4 * scale, 2.6 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Strand-Requisiten: Sonnenschirme, ein Wasserball, Seesterne & Muscheln auf dem Sand. */
function drawBeachProps(this: Renderer, camera: Camera): void {
  const ctx = this.ctx;
  const W = this.viewportW, H = this.viewportH;
  const sandY = H * 0.9;
  ctx.save();

  // Zwei bunte Sonnenschirme (mittlerer Parallax).
  const paraCols: [string, string][] = [['#ff5e6c', '#fff2f2'], ['#3fb6e6', '#fff']];
  for (let i = 0; i < 3; i++) {
    const baseX = pseudoRandom(i * 977 + 5) * W * 2;
    const px = ((baseX - camera.x * 0.15) % (W + 320)) - 160;
    const py = sandY - 6 - pseudoRandom(i * 311) * H * 0.03;
    const scale = 0.9 + pseudoRandom(i * 733) * 0.35;
    const [ca, cb] = paraCols[i % paraCols.length];
    // Sand-Schatten.
    ctx.fillStyle = 'rgba(150,120,70,0.18)';
    ctx.beginPath(); ctx.ellipse(px, py + 2, 26 * scale, 4 * scale, 0, 0, Math.PI * 2); ctx.fill();
    // Mast.
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 2.4 * scale; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 60 * scale); ctx.stroke();
    // Schirmdach: abwechselnde Segmente.
    const topY = py - 60 * scale, r = 34 * scale;
    const segs = 8;
    for (let s = 0; s < segs; s++) {
      const a0 = Math.PI + (s / segs) * Math.PI;
      const a1 = Math.PI + ((s + 1) / segs) * Math.PI;
      ctx.fillStyle = s % 2 === 0 ? ca : cb;
      ctx.beginPath();
      ctx.moveTo(px, topY);
      ctx.arc(px, topY, r, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    // Dach-Rand + Knauf.
    ctx.strokeStyle = 'rgba(120,90,60,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, topY, r, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ca; ctx.beginPath(); ctx.arc(px, topY - 2 * scale, 2.4 * scale, 0, Math.PI * 2); ctx.fill();
  }

  // Ein bunter Wasserball, der auf dem Sand liegt.
  {
    const baseX = W * 1.15;
    const bx = ((baseX - camera.x * 0.15) % (W + 400)) - 100;
    const by = sandY - 2;
    const br = 13;
    ctx.fillStyle = 'rgba(150,120,70,0.18)';
    ctx.beginPath(); ctx.ellipse(bx, by + br * 0.9, br * 1.1, br * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    const ballCols = ['#ff5e6c', '#ffd23f', '#3fb6e6', '#fff'];
    for (let s = 0; s < 4; s++) {
      ctx.fillStyle = ballCols[s];
      ctx.beginPath();
      ctx.moveTo(bx, by - br);
      ctx.arc(bx, by - br + br, br, -Math.PI / 2 + s * (Math.PI / 2), -Math.PI / 2 + (s + 1) * (Math.PI / 2));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(80,80,90,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(bx - br * 0.35, by - br * 0.4, br * 0.22, 0, Math.PI * 2); ctx.fill();
  }

  // Seesterne und kleine Muscheln, verstreut auf dem Sand.
  for (let i = 0; i < 4; i++) {
    const baseX = pseudoRandom(i * 617 + 3) * W * 2;
    const sx = ((baseX - camera.x * 0.15) % (W + 300)) - 150;
    const sy = sandY + 4 + pseudoRandom(i * 421) * H * 0.04;
    if (i % 2 === 0) {
      // Seestern.
      ctx.fillStyle = i % 4 === 0 ? '#ff8a4a' : '#ff6f91';
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(pseudoRandom(i * 53) * Math.PI);
      ctx.beginPath();
      for (let p = 0; p < 5; p++) {
        const a = -Math.PI / 2 + p * (Math.PI * 2 / 5);
        const a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
        ctx.lineTo(Math.cos(a2) * 3, Math.sin(a2) * 3);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      // Muschel.
      ctx.fillStyle = '#ffd9c0';
      ctx.beginPath(); ctx.arc(sx, sy, 5, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(200,140,110,0.6)'; ctx.lineWidth = 0.8;
      for (let r = 0; r < 4; r++) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 4 + r * 2.6, sy - 4.5);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawCoral(this: Renderer, cx: number, cy: number, scale: number, seed: number): void {
  const ctx = this.ctx;
  const colors = ['#ff7a5c', '#ff5e9a', '#c77dff', '#4ad6c4', '#ffc14a'];
  const col = colors[Math.floor(pseudoRandom(seed * 7) * colors.length) % colors.length];
  const type = Math.floor(pseudoRandom(seed * 3) * 3);
  ctx.save();
  ctx.lineCap = 'round';
  if (type === 0) {
    // Geweih-Koralle: verzweigte Äste.
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.6 * scale;
    const branches = 4;
    for (let b = 0; b < branches; b++) {
      const ang = -Math.PI / 2 + (b - (branches - 1) / 2) * 0.42;
      const len = 14 * scale;
      const ex = cx + Math.cos(ang) * len;
      const ey = cy + Math.sin(ang) * len;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + Math.cos(ang) * len * 0.5, cy + Math.sin(ang) * len * 0.5, ex, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((cx + ex) / 2, (cy + ey) / 2);
      ctx.lineTo((cx + ex) / 2 + 4 * scale, (cy + ey) / 2 - 5 * scale);
      ctx.stroke();
    }
  } else if (type === 1) {
    // Fächer-Koralle: Halbfächer mit Rippen.
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 12 * scale, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 5; r++) {
      const a = -Math.PI * 0.85 + (r / 4) * Math.PI * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 12 * scale, cy + Math.sin(a) * 12 * scale);
      ctx.stroke();
    }
  } else {
    // Knollen-Koralle: Kugel-Cluster.
    ctx.fillStyle = col;
    const lumps: [number, number, number][] = [[0, 0, 5], [-5, 2, 4], [5, 1, 4], [0, -4, 3.5]];
    for (const [dx, dy, r] of lumps) {
      ctx.beginPath();
      ctx.arc(cx + dx * scale, cy + dy * scale, r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(cx - 1.5 * scale, cy - 1.5 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPuffyCloud(this: Renderer, cx: number, cy: number, w: number, h: number, alpha: number): void {
  const ctx = this.ctx;
  const puffs: [number, number, number][] = [
    [0, 0, 0.5], [-0.32, 0.1, 0.32], [0.32, 0.08, 0.34],
    [-0.15, -0.12, 0.36], [0.16, -0.1, 0.34], [0.5, 0.16, 0.24], [-0.5, 0.17, 0.22],
  ];
  // Schattierte Unterseite.
  ctx.fillStyle = `rgba(206, 196, 226, ${alpha * 0.7})`;
  for (const [dx, dy, r] of puffs) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * w, cy + dy * h + h * 0.2, r * w, r * h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Weißer Hauptkörper.
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  for (const [dx, dy, r] of puffs) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * w, cy + dy * h, r * w, r * h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Helles Oberlicht.
  ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 0.55)})`;
  for (const [dx, dy, r] of puffs.slice(0, 3)) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * w, cy + dy * h - h * 0.22, r * w * 0.7, r * h * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSpacePlanet(this: Renderer, cx: number, cy: number, r: number, seed: number): void {
  const ctx = this.ctx;
  const scale = this.baseDeviceScale || 1;
  // Statisches Planeten-Aussehen (Verlauf + geclippte Bänder/Krater + Terminator)
  // einmal gebacken; identischer Zeichencode, nur um das lokale Zentrum (lx,ly).
  const sprite = getPlanetSprite(`p|${seed}|${r}`, r, r, scale, (c, lx, ly) => {
    const palettes = [
      ['#a0c0f0', '#5070c0', '#203060'],
      ['#f0a070', '#c05030', '#601810'],
      ['#a0e0a0', '#50a060', '#205030'],
      ['#e0c0f0', '#9060c0', '#402060'],
    ];
    const pal = palettes[Math.floor(pseudoRandom(seed * 7) * palettes.length) % palettes.length];
    const pg = c.createRadialGradient(lx - r * 0.4, ly - r * 0.4, r * 0.1, lx, ly, r);
    pg.addColorStop(0, pal[0]);
    pg.addColorStop(0.5, pal[1]);
    pg.addColorStop(1, pal[2]);
    c.fillStyle = pg;
    c.beginPath();
    c.arc(lx, ly, r, 0, Math.PI * 2);
    c.fill();
    // Oberflächen-Details (Bänder oder Krater), auf die Kugel geclippt.
    c.save();
    c.beginPath();
    c.arc(lx, ly, r, 0, Math.PI * 2);
    c.clip();
    if (pseudoRandom(seed * 3) > 0.5) {
      c.strokeStyle = pal[2];
      c.globalAlpha = 0.4;
      c.lineWidth = r * 0.16;
      for (let b = -2; b <= 2; b++) {
        c.beginPath();
        c.ellipse(lx, ly + b * r * 0.34, r, r * 0.16, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.globalAlpha = 1;
    } else {
      c.fillStyle = pal[2];
      c.globalAlpha = 0.4;
      for (let cc = 0; cc < 4; cc++) {
        const crx = lx + (pseudoRandom(seed + cc * 13) - 0.5) * r * 1.2;
        const cry = ly + (pseudoRandom(seed + cc * 17) - 0.5) * r * 1.2;
        c.beginPath();
        c.arc(crx, cry, r * (0.1 + pseudoRandom(seed + cc * 19) * 0.14), 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    // Schatten-Terminator.
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.beginPath();
    c.arc(lx + r * 0.55, ly + r * 0.18, r, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });
  if (!sprite) return;
  const pad = 2;
  const lw = Math.ceil(r * 2) + pad * 2;
  const lh = Math.ceil(r * 2) + pad * 2;
  const prevS = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, cx - r - pad, cy - r - pad, lw, lh);
  ctx.imageSmoothingEnabled = prevS;
}

function drawSchoolHallway(this: Renderer, camera: Camera, alpha: number) {
  const ctx = this.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  const W = this.viewportW;
  const H = this.viewportH;
  const sock = Math.round(H * 0.74);
  const ceil = Math.round(H * 0.15);

  // Wand + Decke.
  const wall = ctx.createLinearGradient(0, ceil, 0, sock);
  wall.addColorStop(0, '#f6efd4');
  wall.addColorStop(1, '#ebe0c0');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, sock);
  const ceilG = ctx.createLinearGradient(0, 0, 0, ceil);
  ceilG.addColorStop(0, '#d6ceb2');
  ceilG.addColorStop(1, '#e6dcc0');
  ctx.fillStyle = ceilG;
  ctx.fillRect(0, 0, W, ceil);
  ctx.fillStyle = 'rgba(150,130,90,0.4)';
  ctx.fillRect(0, ceil, W, 1);

  // FERNE EBENE (Parallaxe 0.1): dezente Perspektiv-Linien zum Fluchtpunkt + ferne Türen.
  const pxFar = camera.x * 0.1;
  ctx.strokeStyle = 'rgba(150,134,98,0.18)';
  ctx.lineWidth = 1;
  const vpy = H * 0.42;
  const farSp = W * 0.5;
  for (let i = Math.floor(pxFar / farSp) - 1; i <= Math.floor((pxFar + W) / farSp) + 1; i++) {
    const vpx = i * farSp - pxFar;
    ctx.beginPath();
    ctx.moveTo(vpx, ceil); ctx.lineTo(vpx - 90, ceil - 4);
    ctx.moveTo(vpx, sock); ctx.lineTo(vpx - 110, sock + 14);
    ctx.stroke();
    // ferne Tür am Fluchtpunkt
    ctx.fillStyle = '#c9bfa0';
    ctx.fillRect(vpx - 14, vpy - 12, 28, 44);
    ctx.fillStyle = '#a8865a';
    ctx.fillRect(vpx - 9, vpy - 7, 18, 39);
  }

  // Holzsockel.
  const wood = ctx.createLinearGradient(0, sock, 0, H);
  wood.addColorStop(0, '#9a6e4a');
  wood.addColorStop(1, '#7a5436');
  ctx.fillStyle = wood;
  ctx.fillRect(0, sock, W, H - sock);
  ctx.fillStyle = '#6e4c32';
  ctx.fillRect(0, sock, W, 4);

  // DECKE-EBENE (0.2): Hängelampen mit weichem Lichtkegel.
  const pxLamp = camera.x * 0.2;
  const lampSp = 300;
  for (let i = Math.floor(pxLamp / lampSp) - 1; i <= Math.floor((pxLamp + W) / lampSp) + 1; i++) {
    const lx = i * lampSp + 150 - pxLamp;
    ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, ceil + 6); ctx.stroke();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.ellipse(lx, ceil + 9, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
    const cone = ctx.createLinearGradient(0, ceil + 9, 0, sock);
    cone.addColorStop(0, 'rgba(255,248,214,0.28)');
    cone.addColorStop(1, 'rgba(255,248,214,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(lx - 13, ceil + 9); ctx.lineTo(lx + 13, ceil + 9);
    ctx.lineTo(lx + 40, sock); ctx.lineTo(lx - 40, sock); ctx.closePath(); ctx.fill();
  }

  // MITTLERE EBENE (0.25): Türen, Fenster, Uhr, Pinnwand.
  const pxMid = camera.x * 0.25;
  // Klassenzimmer-Türen (alle 540).
  const doorSp = 540;
  for (let i = Math.floor(pxMid / doorSp) - 1; i <= Math.floor((pxMid + W) / doorSp) + 1; i++) {
    const dx = i * doorSp + 40 - pxMid;
    const dTop = Math.round(H * 0.30), dH = sock - dTop;
    ctx.fillStyle = 'rgba(40,28,16,0.12)';
    ctx.fillRect(dx + 4, dTop + 4, 92, dH);
    ctx.fillStyle = '#8c5e36';
    ctx.fillRect(dx, dTop, 92, dH);
    ctx.fillStyle = '#a5764a';
    ctx.fillRect(dx + 6, dTop + 6, 80, dH - 12);
    ctx.fillStyle = '#bfe0f2';
    ctx.fillRect(dx + 22, dTop + 18, 48, 42);
    ctx.strokeStyle = '#7a5436'; ctx.lineWidth = 2; ctx.strokeRect(dx + 22, dTop + 18, 48, 42);
    ctx.fillStyle = '#f2f2ea';
    ctx.fillRect(dx + 30, dTop - 10, 34, 12); // Schild
    ctx.fillStyle = '#d8b84a';
    ctx.beginPath(); ctx.arc(dx + 80, dTop + dH * 0.55, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Tageslicht-Fenster (alle 540, versetzt).
  const winSp = 540, winW = 130, winH = 96, winTop = Math.round(H * 0.20);
  for (let i = Math.floor(pxMid / winSp) - 1; i <= Math.floor((pxMid + W) / winSp) + 1; i++) {
    const fx = i * winSp + 300 - pxMid;
    ctx.fillStyle = 'rgba(255,250,224,0.4)';
    ctx.beginPath();
    ctx.moveTo(fx + 6, winTop + winH); ctx.lineTo(fx + winW - 6, winTop + winH);
    ctx.lineTo(fx + winW + 30, sock); ctx.lineTo(fx - 30, sock); ctx.closePath(); ctx.fill();
    const glass = ctx.createLinearGradient(fx, winTop, fx, winTop + winH);
    glass.addColorStop(0, '#c2e2f4'); glass.addColorStop(1, '#9cc8e4');
    ctx.fillStyle = glass; ctx.fillRect(fx, winTop, winW, winH);
    ctx.strokeStyle = '#8a8a98'; ctx.lineWidth = 4; ctx.strokeRect(fx, winTop, winW, winH);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx + winW / 2, winTop); ctx.lineTo(fx + winW / 2, winTop + winH);
    ctx.moveTo(fx, winTop + winH / 2); ctx.lineTo(fx + winW, winTop + winH / 2); ctx.stroke();
  }
  // Wanduhr (alle 760).
  const clockSp = 760;
  for (let i = Math.floor(pxMid / clockSp) - 1; i <= Math.floor((pxMid + W) / clockSp) + 1; i++) {
    const cx = i * clockSp + 200 - pxMid, cy = Math.round(H * 0.22);
    ctx.fillStyle = '#fafafa';
    ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
    const a = this.time * 0.02;
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a * 12) * 10, cy + Math.sin(a * 12) * 10); ctx.stroke();
  }
  // Pinnwand mit Zetteln (alle 760, versetzt).
  for (let i = Math.floor(pxMid / clockSp) - 1; i <= Math.floor((pxMid + W) / clockSp) + 1; i++) {
    const px = i * clockSp + 520 - pxMid, py = Math.round(H * 0.27);
    ctx.fillStyle = '#a8763e'; ctx.fillRect(px - 3, py - 3, 92, 58);
    ctx.fillStyle = '#c89a5a'; ctx.fillRect(px, py, 86, 52);
    const notes: [number, number, string][] = [[8, 8, '#f0d878'], [40, 6, '#b8dcf0'], [62, 12, '#f0b0b0'], [18, 30, '#bce6c0'], [50, 32, '#f0d878'], [72, 34, '#d8c0ec']];
    for (const [nx, ny, nc] of notes) { ctx.fillStyle = nc; ctx.fillRect(px + nx, py + ny, 14, 12); }
  }

  // NAHE EBENE (0.4): nummerierte Spinde + Pflanzen.
  const pxNear = camera.x * 0.4;
  const lkSp = 46, lkW = 38, lkH = 92, lkTop = sock - lkH;
  for (let i = Math.floor(pxNear / lkSp) - 1; i <= Math.floor((pxNear + W) / lkSp) + 1; i++) {
    const lx = i * lkSp - pxNear;
    const even = (((i % 2) + 2) % 2 === 0);
    ctx.fillStyle = 'rgba(30,40,48,0.18)';
    ctx.fillRect(lx + 3, lkTop + 3, lkW, lkH);
    ctx.fillStyle = even ? '#46789a' : '#5a8c6e';
    ctx.fillRect(lx, lkTop, lkW, lkH);
    ctx.fillStyle = even ? '#3a647f' : '#4c785c';
    ctx.fillRect(lx, lkTop, lkW, 4);
    ctx.strokeStyle = '#2a3c48'; ctx.lineWidth = 2; ctx.strokeRect(lx, lkTop, lkW, lkH);
    ctx.strokeStyle = '#2a3c48'; ctx.lineWidth = 1;
    for (let v = 0; v < 4; v++) { ctx.beginPath(); ctx.moveTo(lx + 7, lkTop + 10 + v * 3); ctx.lineTo(lx + lkW - 7, lkTop + 10 + v * 3); ctx.stroke(); }
    ctx.fillStyle = '#dcdcb4';
    ctx.beginPath(); ctx.arc(lx + lkW - 9, lkTop + lkH * 0.55, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(245,245,225,0.85)';
    ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(String(101 + (((i % 30) + 30) % 30)), lx + lkW / 2, lkTop + 34);
  }
  ctx.textAlign = 'left';
  // Große Pflanzen (alle 360).
  const plSp = 360;
  for (let i = Math.floor(pxNear / plSp) - 1; i <= Math.floor((pxNear + W) / plSp) + 1; i++) {
    const plx = i * plSp + 230 - pxNear;
    ctx.fillStyle = 'rgba(30,40,48,0.15)';
    ctx.beginPath(); ctx.ellipse(plx + 10, sock - 2, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b46e46';
    ctx.beginPath(); ctx.moveTo(plx, sock - 22); ctx.lineTo(plx + 22, sock - 22); ctx.lineTo(plx + 18, sock); ctx.lineTo(plx + 4, sock); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#caa074'; ctx.fillRect(plx - 2, sock - 25, 26, 4);
    ctx.fillStyle = '#4a9850';
    for (const [dx, dy] of [[-6, -16], [4, -22], [12, -14], [0, -12], [18, -6]] as [number, number][]) {
      ctx.beginPath(); ctx.ellipse(plx + 11 + dx, sock - 22 + dy, 6, 9, dx * 0.05, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#3a7e42';
    for (const [dx, dy] of [[2, -18], [10, -10]] as [number, number][]) {
      ctx.beginPath(); ctx.ellipse(plx + 11 + dx, sock - 22 + dy, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Klassenzimmer-Zone: grüne Tafel, Poster, Pultreihen. */
function drawSchoolClassroom(this: Renderer, camera: Camera, alpha: number) {
  const ctx = this.ctx;
  ctx.save(); ctx.globalAlpha = alpha;
  const W = this.viewportW, H = this.viewportH;
  const sock = Math.round(H * 0.74), ceil = Math.round(H * 0.15);
  const wall = ctx.createLinearGradient(0, ceil, 0, sock);
  wall.addColorStop(0, '#f6efd4'); wall.addColorStop(1, '#ece1c2');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, sock);
  ctx.fillStyle = '#dcd2b6'; ctx.fillRect(0, 0, W, ceil);
  const wood = ctx.createLinearGradient(0, sock, 0, H);
  wood.addColorStop(0, '#9a6e4a'); wood.addColorStop(1, '#7a5436');
  ctx.fillStyle = wood; ctx.fillRect(0, sock, W, H - sock);
  ctx.fillStyle = '#6e4c32'; ctx.fillRect(0, sock, W, 4);
  const px = camera.x * 0.25, tbSp = 460;
  for (let i = Math.floor(px / tbSp) - 1; i <= Math.floor((px + W) / tbSp) + 1; i++) {
    const tx = i * tbSp + 60 - px, ty = Math.round(H * 0.24), tw = 200, th = Math.round(H * 0.32);
    ctx.fillStyle = '#7a5436'; ctx.fillRect(tx - 6, ty - 6, tw + 12, th + 12);
    const board = ctx.createLinearGradient(0, ty, 0, ty + th);
    board.addColorStop(0, '#3e6650'); board.addColorStop(1, '#345a46');
    ctx.fillStyle = board; ctx.fillRect(tx, ty, tw, th);
    ctx.strokeStyle = 'rgba(220,230,220,0.5)'; ctx.lineWidth = 1;
    for (let l = 0; l < 4; l++) { ctx.beginPath(); ctx.moveTo(tx + 16, ty + 18 + l * 16); ctx.lineTo(tx + 16 + (140 - l * 24), ty + 18 + l * 16); ctx.stroke(); }
    ctx.fillStyle = '#8a6038'; ctx.fillRect(tx - 4, ty + th, tw + 8, 5);
  }
  for (let i = Math.floor(px / tbSp) - 1; i <= Math.floor((px + W) / tbSp) + 1; i++) {
    const sx = i * tbSp + 320 - px, sy = Math.round(H * 0.26);
    ctx.fillStyle = '#e8c850'; ctx.fillRect(sx, sy, 60, 76);
    ctx.fillStyle = '#c8a838'; ctx.fillRect(sx, sy, 60, 4);
    ctx.fillStyle = 'rgba(120,90,40,0.4)';
    for (let l = 0; l < 4; l++) ctx.fillRect(sx + 8, sy + 16 + l * 14, 44, 2);
  }
  const pxN = camera.x * 0.4, deskSp = 150;
  for (let row = 0; row < 2; row++) {
    const dy = sock - 8 + row * 22, dw = 46 + row * 14;
    for (let i = Math.floor(pxN / deskSp) - 1; i <= Math.floor((pxN + W) / deskSp) + 1; i++) {
      const dx = i * deskSp + (row * 40) - pxN;
      ctx.fillStyle = 'rgba(40,28,16,0.15)'; ctx.fillRect(dx + 3, dy + 3, dw, 8);
      ctx.fillStyle = '#b88a54'; ctx.fillRect(dx, dy, dw, 8);
      ctx.fillStyle = '#caa070'; ctx.fillRect(dx, dy, dw, 2);
      ctx.fillStyle = '#7a5436'; ctx.fillRect(dx + 5, dy + 8, 4, 16); ctx.fillRect(dx + dw - 9, dy + 8, 4, 16);
    }
  }
  // Bunte Lernposter an der Wand — bringen Farbe in die beige Fläche.
  const pxP = camera.x * 0.25, poSp = 460;
  const posters: [string, string][] = [['#ff7a8a', '#ffe0e6'], ['#5cc0e6', '#e0f4ff'], ['#8ad06a', '#eafbe0'], ['#ffcf4a', '#fff4d0']];
  for (let i = Math.floor(pxP / poSp) - 1; i <= Math.floor((pxP + W) / poSp) + 1; i++) {
    const qx = i * poSp + 250 - pxP, qy = Math.round(H * 0.20);
    const [frame, paper] = posters[((i % posters.length) + posters.length) % posters.length];
    ctx.fillStyle = 'rgba(40,28,16,0.12)'; ctx.fillRect(qx + 2, qy + 3, 46, 58);
    ctx.fillStyle = frame; ctx.fillRect(qx, qy, 46, 58);
    ctx.fillStyle = paper; ctx.fillRect(qx + 3, qy + 3, 40, 52);
    // Ein einfaches Motiv je nach Poster: Sonne / Buchstabe / Zahlen-Reihe.
    const kind = ((i % 3) + 3) % 3;
    if (kind === 0) { ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(qx + 23, qy + 24, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#f0a800'; ctx.lineWidth = 1.4; for (let r = 0; r < 8; r++) { const a = r * Math.PI / 4; ctx.beginPath(); ctx.moveTo(qx + 23 + Math.cos(a) * 12, qy + 24 + Math.sin(a) * 12); ctx.lineTo(qx + 23 + Math.cos(a) * 16, qy + 24 + Math.sin(a) * 16); ctx.stroke(); } }
    else if (kind === 1) { ctx.fillStyle = frame; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('A', qx + 23, qy + 26); }
    else { ctx.strokeStyle = '#7a8ab0'; ctx.lineWidth = 1.4; for (let l = 0; l < 4; l++) { ctx.beginPath(); ctx.moveTo(qx + 8, qy + 14 + l * 10); ctx.lineTo(qx + 38, qy + 14 + l * 10); ctx.stroke(); } }
    // Kleiner Klebestreifen oben.
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(qx + 17, qy - 2, 12, 5);
  }
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/** Turnhalle-Zone: Sprossenwand, Basketballkorb, Matten, heller Hallenboden. */
function drawSchoolGym(this: Renderer, camera: Camera, alpha: number) {
  const ctx = this.ctx;
  ctx.save(); ctx.globalAlpha = alpha;
  const W = this.viewportW, H = this.viewportH;
  const sock = Math.round(H * 0.80), ceil = Math.round(H * 0.12);
  const wall = ctx.createLinearGradient(0, ceil, 0, sock);
  wall.addColorStop(0, '#e8e0cc'); wall.addColorStop(1, '#dcd0b4');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, sock);
  ctx.fillStyle = '#cabf9e'; ctx.fillRect(0, 0, W, ceil);
  const floor = ctx.createLinearGradient(0, sock, 0, H);
  floor.addColorStop(0, '#d2a464'); floor.addColorStop(1, '#b8884e');
  ctx.fillStyle = floor; ctx.fillRect(0, sock, W, H - sock);
  ctx.fillStyle = '#8a6038'; ctx.fillRect(0, sock, W, 3);
  ctx.fillStyle = 'rgba(200,80,60,0.7)'; ctx.fillRect(0, sock + Math.round((H - sock) * 0.45), W, 2);
  const px = camera.x * 0.25, swSp = 520;
  for (let i = Math.floor(px / swSp) - 1; i <= Math.floor((px + W) / swSp) + 1; i++) {
    const sx = i * swSp + 40 - px, sTop = Math.round(H * 0.24), sBot = sock;
    ctx.strokeStyle = '#9a703e'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx, sTop); ctx.lineTo(sx, sBot); ctx.moveTo(sx + 52, sTop); ctx.lineTo(sx + 52, sBot); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#b88a54';
    for (let y = sTop + 8; y < sBot; y += 14) { ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 52, y); ctx.stroke(); }
  }
  for (let i = Math.floor(px / swSp) - 1; i <= Math.floor((px + W) / swSp) + 1; i++) {
    const bx = i * swSp + 360 - px, by = Math.round(H * 0.22);
    ctx.fillStyle = '#f2f2f4'; ctx.fillRect(bx, by, 46, 36);
    ctx.strokeStyle = '#a0a0aa'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 46, 36);
    ctx.fillStyle = '#c84830'; ctx.fillRect(bx + 14, by + 24, 18, 4);
    ctx.strokeStyle = '#e8e8ec'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx + 16, by + 28); ctx.lineTo(bx + 18, by + 40); ctx.moveTo(bx + 30, by + 28); ctx.lineTo(bx + 28, by + 40); ctx.stroke();
  }
  const pxN = camera.x * 0.4, matSp = 300;
  for (let i = Math.floor(pxN / matSp) - 1; i <= Math.floor((pxN + W) / matSp) + 1; i++) {
    const mx = i * matSp + 120 - pxN;
    ctx.fillStyle = '#4a82b4'; ctx.fillRect(mx, sock - 12, 60, 12);
    ctx.fillStyle = '#c85868'; ctx.fillRect(mx + 40, sock - 9, 60, 9);
  }
  ctx.restore();
}

/** Schulhof-Zone: Himmel, Wiese, Schulgebäude, Bäume, Klettergerüst. */
function drawSchoolYard(this: Renderer, camera: Camera, alpha: number) {
  const ctx = this.ctx;
  ctx.save(); ctx.globalAlpha = alpha;
  const W = this.viewportW, H = this.viewportH;
  const grass = Math.round(H * 0.72);
  const sky = ctx.createLinearGradient(0, 0, 0, grass);
  sky.addColorStop(0, '#7ab8e4'); sky.addColorStop(1, '#bfe0f2');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, grass);
  const gr = ctx.createLinearGradient(0, grass, 0, H);
  gr.addColorStop(0, '#7ab86a'); gr.addColorStop(1, '#5e9a50');
  ctx.fillStyle = gr; ctx.fillRect(0, grass, W, H - grass);
  ctx.fillStyle = '#4e8a44'; ctx.fillRect(0, grass, W, 3);
  const pxF = camera.x * 0.08, clSp = 360;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = Math.floor(pxF / clSp) - 1; i <= Math.floor((pxF + W) / clSp) + 1; i++) {
    const cx = i * clSp + 80 - pxF, cy = Math.round(H * 0.18);
    for (const [dx, dy, rr] of [[0, 0, 16], [18, 4, 13], [-16, 4, 12], [6, -8, 11]] as [number, number, number][]) {
      ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy, rr, rr * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  const pxM = camera.x * 0.2, bSp = 600;
  for (let i = Math.floor(pxM / bSp) - 1; i <= Math.floor((pxM + W) / bSp) + 1; i++) {
    const bx = i * bSp + 40 - pxM, bTop = Math.round(H * 0.30), bH = grass - bTop;
    ctx.fillStyle = '#d2a47e'; ctx.fillRect(bx, bTop, 150, bH);
    ctx.fillStyle = '#a8603e';
    ctx.beginPath(); ctx.moveTo(bx - 10, bTop); ctx.lineTo(bx + 160, bTop); ctx.lineTo(bx + 140, bTop - 26); ctx.lineTo(bx + 10, bTop - 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8d4ec';
    for (let wy = 0; wy < 3; wy++) for (let wx = 0; wx < 5; wx++) ctx.fillRect(bx + 12 + wx * 28, bTop + 16 + wy * 34, 18, 22);
    ctx.fillStyle = '#7a5436'; ctx.fillRect(bx + 64, grass - 40, 24, 40);
  }
  const pxT = camera.x * 0.3, trSp = 340;
  for (let i = Math.floor(pxT / trSp) - 1; i <= Math.floor((pxT + W) / trSp) + 1; i++) {
    const tx = i * trSp + 240 - pxT;
    ctx.fillStyle = '#7a5436'; ctx.fillRect(tx, grass - 44, 12, 44);
    ctx.fillStyle = '#4e9850';
    for (const [dx, dy, rr] of [[6, -50, 24], [-10, -40, 18], [22, -40, 18], [6, -62, 18]] as [number, number, number][]) {
      ctx.beginPath(); ctx.ellipse(tx + dx, grass + dy, rr, rr, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Klettergerüst: echtes Sprossen-Raster + Bogendach statt leerem Draht-
  // Rechteck mit Kreuz (las sich vorher wie ein verirrter oranger Rahmen).
  const pxN = camera.x * 0.4, kgSp = 480;
  for (let i = Math.floor(pxN / kgSp) - 1; i <= Math.floor((pxN + W) / kgSp) + 1; i++) {
    const kx = i * kgSp + 380 - pxN, kw = 78, kh = 62, kTop = grass - kh;
    ctx.strokeStyle = '#c85c34'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    // Bogendach — macht es klar zum Spielgerät.
    ctx.beginPath(); ctx.moveTo(kx, kTop); ctx.quadraticCurveTo(kx + kw / 2, kTop - 16, kx + kw, kTop); ctx.stroke();
    ctx.strokeRect(kx, kTop, kw, kh);
    // Senkrechte Streben (Beine bis in die Wiese).
    for (let v = 1; v < 4; v++) { const vx = kx + (v * kw) / 4; ctx.beginPath(); ctx.moveTo(vx, kTop); ctx.lineTo(vx, grass); ctx.stroke(); }
    // Waagerechte Sprossen zum Klettern.
    for (let hcnt = 1; hcnt < 4; hcnt++) { const hy = kTop + (hcnt * kh) / 4; ctx.beginPath(); ctx.moveTo(kx, hy); ctx.lineTo(kx + kw, hy); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  // Bunte Blümchen in der Wiese (Vordergrund-Parallax).
  const pxFl = camera.x * 0.5, flSp = 90;
  const flCols = ['#ff6f91', '#ffd23f', '#ffffff', '#c77dff'];
  for (let i = Math.floor(pxFl / flSp) - 1; i <= Math.floor((pxFl + W) / flSp) + 1; i++) {
    const fx = i * flSp + 30 - pxFl;
    const fy = grass + 10 + pseudoRandom(i * 271) * (H - grass) * 0.5;
    const col = flCols[((i % flCols.length) + flCols.length) % flCols.length];
    // Stiel.
    ctx.strokeStyle = '#4e8a44'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy + 7); ctx.stroke();
    // Blüte: 5 Punkte um ein gelbes Zentrum.
    ctx.fillStyle = col;
    for (let p = 0; p < 5; p++) { const a = p * (Math.PI * 2 / 5); ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  // Ein paar Vögel am Himmel (sanftes Schweben).
  const pxB = camera.x * 0.06;
  ctx.strokeStyle = 'rgba(70,90,110,0.55)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const baseX = pseudoRandom(i * 811 + 2) * W * 2;
    const bx = ((baseX - pxB) % (W + 200)) - 100;
    const by = H * (0.12 + pseudoRandom(i * 97) * 0.08) + Math.sin(this.time * 0.02 + i) * 3;
    const s = 5;
    ctx.beginPath();
    ctx.moveTo(bx - s, by); ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.7, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.7, bx + s, by);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.restore();
}

/** Zonen-Dispatcher: wählt Raum je nach Kameraposition, mit Crossfade an den Grenzen. */
function drawSchoolBackground(this: Renderer, camera: Camera) {
  const T = TILE_SIZE;
  const bounds = [30 * T, 96 * T, 146 * T];
  const rooms = [drawSchoolClassroom, drawSchoolHallway, drawSchoolGym, drawSchoolYard];
  const W = this.viewportW;
  const camMid = camera.x + W * 0.5;
  const fade = 14 * T;
  let lo = rooms.length - 1, hi = rooms.length - 1, t = 0;
  for (let k = 0; k < bounds.length; k++) {
    if (camMid < bounds[k] - fade) { lo = k; hi = k; t = 0; break; }
    if (camMid < bounds[k] + fade) {
      lo = k; hi = k + 1;
      const tt = (camMid - (bounds[k] - fade)) / (2 * fade);
      t = tt * tt * (3 - 2 * tt); // smoothstep für sanftes Ein-/Auslaufen
      break;
    }
  }
  rooms[lo].call(this, camera, 1);
  if (hi !== lo) rooms[hi].call(this, camera, t);
}

/**
 * Große, helle Turnhalle (Turnen): Tageslicht durch hohe Sprossenfenster,
 * Sprossenwand an der Rückwand, hängende Ringe + Kletterseile von der Decke,
 * Wimpelkette, Anzeigetafel. Warme, lichtdurchflutete Halle — bewusst hell und
 * anders als Superflys dunkle Neon-Halle.
 */
function drawGymBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW, H = this.viewportH;
  const t = this.time;
  const sock = Math.round(H * 0.80), ceil = Math.round(H * 0.12);

  // Wand: warmes Creme, oben etwas heller (Tageslicht von den Fenstern).
  const wall = ctx.createLinearGradient(0, 0, 0, sock);
  wall.addColorStop(0, '#f2ead6');
  wall.addColorStop(0.55, '#e6dcc0');
  wall.addColorStop(1, '#d6c8a4');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, sock);

  // EBENE 0 (0.05): hohe Sprossenfenster mit Tageslicht-Schein.
  const px0 = camera.x * 0.05, winSp = 250, winW = 120, winTop = ceil + 8, winH = Math.round(H * 0.30);
  for (let i = Math.floor(px0 / winSp) - 1; i <= Math.floor((px0 + W) / winSp) + 1; i++) {
    const wx = i * winSp + 40 - px0;
    // Lichthof.
    const gl = ctx.createLinearGradient(0, winTop, 0, winTop + winH + 60);
    gl.addColorStop(0, 'rgba(255,250,225,0.55)');
    gl.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = gl; ctx.fillRect(wx - 14, winTop, winW + 28, winH + 60);
    // Fensterrahmen + Himmel.
    ctx.fillStyle = '#bcd2e0'; ctx.fillRect(wx, winTop, winW, winH);
    const sky = ctx.createLinearGradient(0, winTop, 0, winTop + winH);
    sky.addColorStop(0, '#d6ecff'); sky.addColorStop(1, '#a7cdec');
    ctx.fillStyle = sky; ctx.fillRect(wx + 3, winTop + 3, winW - 6, winH - 6);
    // Sprossen.
    ctx.strokeStyle = 'rgba(240,244,250,0.9)'; ctx.lineWidth = 2;
    for (let gx = 1; gx < 4; gx++) { ctx.beginPath(); ctx.moveTo(wx + gx * winW / 4, winTop + 3); ctx.lineTo(wx + gx * winW / 4, winTop + winH - 3); ctx.stroke(); }
    for (let gy = 1; gy < 3; gy++) { ctx.beginPath(); ctx.moveTo(wx + 3, winTop + gy * winH / 3); ctx.lineTo(wx + winW - 3, winTop + gy * winH / 3); ctx.stroke(); }
    ctx.strokeStyle = '#9a8a64'; ctx.lineWidth = 3; ctx.strokeRect(wx, winTop, winW, winH);
  }

  // Decke + Deckenträger.
  ctx.fillStyle = '#cbba9a'; ctx.fillRect(0, 0, W, ceil);
  ctx.fillStyle = '#b6a67e';
  const pxC = camera.x * 0.1, beamSp = 90;
  for (let i = Math.floor(pxC / beamSp) - 1; i <= Math.floor((pxC + W) / beamSp) + 1; i++) {
    const ox = i * beamSp - pxC; ctx.fillRect(ox, 0, 6, ceil);
  }
  ctx.fillStyle = '#8a7a54'; ctx.fillRect(0, ceil - 3, W, 3);

  // EBENE 1 (0.12): Sprossenwand (Wall Bars) an der Rückwand.
  const pxWB = camera.x * 0.12, wbSp = 340, wbW = 116, wbY0 = Math.round(H * 0.30), wbY1 = sock - 6;
  for (let i = Math.floor(pxWB / wbSp) - 1; i <= Math.floor((pxWB + W) / wbSp) + 1; i++) {
    const bx = i * wbSp + 150 - pxWB;
    ctx.fillStyle = '#c79a5a';                        // Holz-Pfosten
    ctx.fillRect(bx, wbY0, 7, wbY1 - wbY0);
    ctx.fillRect(bx + wbW - 7, wbY0, 7, wbY1 - wbY0);
    ctx.fillStyle = '#b0813f';                        // Sprossen
    for (let ry = wbY0 + 10; ry < wbY1; ry += 14) ctx.fillRect(bx + 6, ry, wbW - 12, 4);
    ctx.fillStyle = 'rgba(255,244,214,0.4)'; ctx.fillRect(bx, wbY0, 7, 3);
  }

  // Anzeigetafel (Wahrzeichen) — zentral im Hintergrund, sanft schwebend.
  {
    const p = W * 1.9;
    const bx = ((W * 0.5 - camera.x * 0.08) % p + p) % p;
    if (bx > -120 && bx < W + 120) {
      const by = Math.round(H * 0.20);
      ctx.fillStyle = '#20242e'; roundRectPath(ctx, bx - 66, by, 132, 46, 6); ctx.fill();
      ctx.strokeStyle = '#6a7284'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#e8b23a'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
      ctx.fillText('TURNHALLE', bx, by + 16);
      // Wett-LEDs.
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = (k + Math.floor(t * 0.06)) % 2 ? '#5ade7a' : '#2a5a38';
        ctx.fillRect(bx - 40 + k * 18, by + 26, 12, 8);
      }
      ctx.textAlign = 'left';
    }
  }

  // EBENE 2 (0.16): hängende Ringe + Kletterseile von der Decke.
  const pxR = camera.x * 0.16, rSp = 300;
  for (let i = Math.floor(pxR / rSp) - 1; i <= Math.floor((pxR + W) / rSp) + 1; i++) {
    const rx = i * rSp + 90 - pxR;
    const sway = Math.sin(t * 0.02 + i) * 3;
    // Kletterseil.
    ctx.strokeStyle = '#b89a5e'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(rx, ceil); ctx.quadraticCurveTo(rx + sway, H * 0.4, rx + sway * 1.5, H * 0.56); ctx.stroke();
    // Ringe-Paar daneben.
    const gx = rx + 120;
    ctx.strokeStyle = 'rgba(70,60,40,0.7)'; ctx.lineWidth = 1.4;
    for (const dx of [-9, 9]) {
      ctx.beginPath(); ctx.moveTo(gx + dx, ceil); ctx.lineTo(gx + dx + sway * 0.5, H * 0.42); ctx.stroke();
      ctx.strokeStyle = '#5a4028'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(gx + dx + sway * 0.5, H * 0.44, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(70,60,40,0.7)'; ctx.lineWidth = 1.4;
    }
  }

  // Wimpelkette quer unter der Decke.
  {
    const pxP = camera.x * 0.14, penSp = 26;
    const cols = ['#e0563c', '#3c86e0', '#f0b83a', '#4aae5a'];
    const yTop = ceil + 6;
    ctx.strokeStyle = 'rgba(120,104,70,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = Math.floor(pxP / penSp) - 1; i <= Math.floor((pxP + W) / penSp) + 1; i++) {
      const x = i * penSp - pxP; const dip = Math.sin(i * 0.6) * 3;
      if (i === Math.floor(pxP / penSp) - 1) ctx.moveTo(x, yTop + dip); else ctx.lineTo(x, yTop + dip);
    }
    ctx.stroke();
    for (let i = Math.floor(pxP / penSp) - 1; i <= Math.floor((pxP + W) / penSp) + 1; i++) {
      const x = i * penSp - pxP; const dip = Math.sin(i * 0.6) * 3;
      ctx.fillStyle = cols[((i % 4) + 4) % 4];
      ctx.beginPath(); ctx.moveTo(x, yTop + dip); ctx.lineTo(x + penSp, yTop + dip); ctx.lineTo(x + penSp / 2, yTop + dip + 12); ctx.closePath(); ctx.fill();
    }
  }

  // Pauschenpferd-Silhouette auf der Bodenlinie (Deko-Apparat, dezent hinten).
  {
    const p = W * 1.5;
    const hx = ((W * 0.34 - camera.x * 0.13) % p + p) % p;
    if (hx > -60 && hx < W + 60) {
      const hy = sock - 4;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 22, hy); ctx.lineTo(hx - 17, hy - 22);
      ctx.moveTo(hx + 22, hy); ctx.lineTo(hx + 17, hy - 22);
      ctx.stroke();
      ctx.fillStyle = '#c89a5a'; roundRectPath(ctx, hx - 26, hy - 32, 52, 13, 5); ctx.fill();
      ctx.fillStyle = '#a87c3e'; ctx.fillRect(hx - 26, hy - 22, 52, 3);
      ctx.fillStyle = '#e0e2e8';
      ctx.beginPath(); ctx.arc(hx - 8, hy - 34, 3, 0, Math.PI * 2); ctx.arc(hx + 8, hy - 34, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e0e2e8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx - 8, hy - 34); ctx.lineTo(hx - 8, hy - 30); ctx.moveTo(hx + 8, hy - 34); ctx.lineTo(hx + 8, hy - 30); ctx.stroke();
      ctx.restore();
    }
  }

  // Schwingende Turnerin an den Ringen (belebt die Halle, animiert).
  {
    const p = W * 2.2;
    const gx = ((W * 0.66 - camera.x * 0.16) % p + p) % p;
    if (gx > -40 && gx < W + 40) {
      const ringY = Math.round(H * 0.30);
      const sw = Math.sin(t * 0.045) * 0.5;   // Schwingwinkel (Pendel)
      // Ring-Gurte von der Decke.
      ctx.strokeStyle = 'rgba(70,60,40,0.7)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(gx - 9, ceil); ctx.lineTo(gx - 9, ringY); ctx.moveTo(gx + 9, ceil); ctx.lineTo(gx + 9, ringY); ctx.stroke();
      ctx.strokeStyle = '#5a4028'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(gx - 9, ringY + 4, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(gx + 9, ringY + 4, 5, 0, Math.PI * 2); ctx.stroke();
      // Turnerin-Silhouette, pendelt um die Ring-Aufhängung.
      ctx.save();
      ctx.translate(gx, ringY + 4);
      ctx.rotate(sw);
      const sil = 'rgba(44,58,82,0.85)';
      ctx.strokeStyle = sil; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-2, 15); ctx.moveTo(9, 0); ctx.lineTo(2, 15); ctx.stroke(); // Arme zu den Ringen
      ctx.beginPath(); ctx.moveTo(0, 13); ctx.lineTo(0, 34); ctx.stroke();                                     // Rumpf
      ctx.fillStyle = sil; ctx.beginPath(); ctx.arc(0, 9, 4, 0, Math.PI * 2); ctx.fill();                        // Kopf
      ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(-3, 49); ctx.moveTo(0, 34); ctx.lineTo(3, 49); ctx.stroke(); // Beine, gestreckt
      ctx.restore();
    }
  }

  // Bodensockel: Parkett-Anschluss + blaue Mattenkante an der Bodenlinie.
  const floor = ctx.createLinearGradient(0, sock, 0, H);
  floor.addColorStop(0, '#c69a5a'); floor.addColorStop(1, '#a5813f');
  ctx.fillStyle = floor; ctx.fillRect(0, sock, W, H - sock);
  ctx.fillStyle = 'rgba(255,244,214,0.35)'; ctx.fillRect(0, sock, W, 2);
  ctx.fillStyle = 'rgba(47,111,192,0.5)'; ctx.fillRect(0, sock + 4, W, 3); // Matten-Streifen

  // Sieger-Zeremonie am Ziel (weltverankert bei col ~223.5): Podest (Gold/
  // Silber/Bronze) + Pokal + Konfetti-Regen + „10.0"-Wertungstafel.
  {
    const T = TILE_SIZE;
    const px = 223.5 * T - camera.x;
    if (px > -140 && px < W + 140) {
      const baseY = sock + 2;

      // Jubelndes Publikum auf einer Tribüne links neben dem Podest (wippt/winkt).
      {
        const stX = px - 168, stW = 108, stTop = sock - 66;
        const skin = ['#e8b888', '#d29a68', '#f0c8a0'];
        const shirt = ['#e0563c', '#3c86e0', '#4aae5a', '#f0b83a', '#c266ff'];
        for (let r = 0; r < 3; r++) {
          const ry = stTop + r * 15;
          ctx.fillStyle = r % 2 ? 'rgba(150,124,84,0.85)' : 'rgba(172,144,100,0.85)';
          ctx.fillRect(stX, ry + 8, stW, 8);
          for (let hx = stX + 7; hx < stX + stW - 4; hx += 14) {
            const bob = Math.sin(t * 0.14 + hx * 0.5 + r) * 2.2;
            const wave = Math.sin(t * 0.2 + hx) > 0.5; // hebt manchmal die Arme
            ctx.fillStyle = shirt[((hx * 3 + r) % 5 + 5) % 5];
            ctx.fillRect(hx, ry - 1 + bob, 8, 9);
            ctx.fillStyle = skin[((hx + r) % 3 + 3) % 3];
            ctx.beginPath(); ctx.arc(hx + 4, ry - 4 + bob, 3, 0, Math.PI * 2); ctx.fill();
            if (wave) { // winkendes Ärmchen
              ctx.strokeStyle = skin[((hx + r) % 3 + 3) % 3]; ctx.lineWidth = 1.6;
              ctx.beginPath(); ctx.moveTo(hx + 7, ry + 2 + bob); ctx.lineTo(hx + 11, ry - 5 + bob); ctx.stroke();
            }
          }
        }
      }

      // Konfetti-Regen über der Zeremonie (animiert, fällt und driftet).
      const cCols = ['#e0563c', '#3c86e0', '#f0b83a', '#4aae5a', '#c266ff'];
      for (let i = 0; i < 26; i++) {
        const seed = i * 37.3;
        const span = 220;
        const cxk = px - 90 + ((i * 61) % 180) + Math.sin(t * 0.03 + seed) * 6;
        const fall = ((t * (1.1 + (i % 3) * 0.4) + seed * 7) % (span + 60));
        const cyk = ceil + fall - 30;
        if (cyk < ceil || cyk > sock) continue;
        ctx.save();
        ctx.translate(cxk, cyk);
        ctx.rotate(t * 0.08 + seed);
        ctx.fillStyle = cCols[i % cCols.length];
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-2, -3.5, 4, 7);
        ctx.restore();
      }

      // Podest.
      const blocks: { dx: number; w: number; h: number; top: string; side: string; n: string; nc: string }[] = [
        { dx: -38, w: 32, h: 42, top: '#d6dae2', side: '#a6acb8', n: '2', nc: '#5a6070' }, // Silber
        { dx: 0, w: 34, h: 62, top: '#f4cf4c', side: '#d0a221', n: '1', nc: '#7a5a10' },   // Gold
        { dx: 38, w: 32, h: 32, top: '#d98f45', side: '#a9682c', n: '3', nc: '#6a3d18' },  // Bronze
      ];
      for (const b of blocks) {
        const bx = px + b.dx - b.w / 2, by = baseY - b.h;
        ctx.fillStyle = b.side; ctx.fillRect(bx, by, b.w, b.h);
        ctx.fillStyle = b.top; ctx.fillRect(bx, by, b.w, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(bx, by, b.w, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(bx, by + b.h - 3, b.w, 3);
        ctx.fillStyle = b.nc; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(b.n, px + b.dx, by + b.h / 2 + 7);
      }

      // Goldener Pokal auf dem „1"-Block.
      {
        const tx = px, topY = baseY - 62; // Oberkante Gold-Block
        const cupY = topY - 20;
        const shine = 0.6 + Math.sin(t * 0.08) * 0.4;
        // Glanz-Halo.
        const halo = ctx.createRadialGradient(tx, cupY, 1, tx, cupY, 26);
        halo.addColorStop(0, `rgba(255,230,120,${0.35 * shine})`); halo.addColorStop(1, 'rgba(255,230,120,0)');
        ctx.fillStyle = halo; ctx.fillRect(tx - 26, cupY - 26, 52, 52);
        ctx.fillStyle = '#f4d152';
        // Schale.
        ctx.beginPath(); ctx.moveTo(tx - 9, cupY - 8); ctx.lineTo(tx + 9, cupY - 8);
        ctx.quadraticCurveTo(tx + 8, cupY + 6, tx, cupY + 8); ctx.quadraticCurveTo(tx - 8, cupY + 6, tx - 9, cupY - 8); ctx.closePath(); ctx.fill();
        // Henkel.
        ctx.strokeStyle = '#e0b93a'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(tx - 10, cupY - 4, 4, Math.PI * 0.5, Math.PI * 1.6); ctx.stroke();
        ctx.beginPath(); ctx.arc(tx + 10, cupY - 4, 4, Math.PI * 1.4, Math.PI * 0.5); ctx.stroke();
        // Stiel + Fuß.
        ctx.fillStyle = '#e6c24a'; ctx.fillRect(tx - 2, cupY + 8, 4, 6);
        ctx.fillRect(tx - 7, cupY + 14, 14, 3);
        // Glanzpunkt.
        ctx.fillStyle = `rgba(255,255,255,${0.6 * shine})`;
        ctx.beginPath(); ctx.arc(tx - 3, cupY - 3, 1.6, 0, Math.PI * 2); ctx.fill();
      }

      // „10.0"-Wertungstafel (Kampfrichter-Karte) rechts neben dem Podest.
      {
        const cardX = px + 74, cardY = baseY - 74;
        ctx.save();
        ctx.rotate(0); // aufrecht
        ctx.fillStyle = '#fbfbf6'; roundRectPath(ctx, cardX - 22, cardY, 44, 30, 5); ctx.fill();
        ctx.strokeStyle = '#2f6fc0'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#2f6fc0'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('10.0', cardX, cardY + 21);
        // Halte-Stab.
        ctx.strokeStyle = '#9a8a64'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cardX, cardY + 30); ctx.lineTo(cardX, cardY + 46); ctx.stroke();
      }
      ctx.textAlign = 'left';
    }
  }

  // Bühnen-Atmosphäre über der großen Liana-Schlucht (Beat 8, Mitte ~col 208):
  // eine breite Publikums-Tribüne HINTER der Schlucht, Scheinwerfer-Strahlen auf
  // die Seile, ein Festbanner und ein großes pulsierendes Apex-Highlight.
  {
    const T = TILE_SIZE;
    const cx = 208 * T - camera.x;          // Schlucht-Mitte (Screen-X)
    if (cx > -360 && cx < W + 360) {
      const X = (col: number) => col * T - camera.x;
      const gL = X(198), gR = X(219);        // Schlucht-Ränder (Screen-X)

      // (1) Breite Grandstand-Tribüne hinter der Schlucht (füllt die Fensterzone),
      // vier Reihen jubelnder Zuschauer über die ganze Schluchtbreite. Reagiert
      // auf Spiel-Momente: `ex` (0..1) treibt La-Ola-Welle, Aufspringen & Arme.
      {
        const ex = this.crowdExcite;
        const skin = ['#e8b888', '#d29a68', '#f0c8a0', '#c98a5a'];
        const shirt = ['#e0563c', '#3c86e0', '#4aae5a', '#f0b83a', '#c266ff', '#ff8f3c'];
        const standTop = Math.round(H * 0.30), rowH = 15;
        const sL = Math.max(gL - 6, -20), sR = Math.min(gR + 6, W + 20);
        // dezente Tribünen-Stufen (Schatten hinter der Menge).
        ctx.fillStyle = 'rgba(120,98,64,0.18)';
        ctx.fillRect(sL, standTop - 6, sR - sL, rowH * 4 + 12);
        for (let r = 0; r < 4; r++) {
          const ry = standTop + r * rowH;
          ctx.fillStyle = r % 2 ? 'rgba(150,124,84,0.55)' : 'rgba(172,144,100,0.55)';
          ctx.fillRect(sL, ry + 9, sR - sL, 6);
          for (let hx = sL + 8; hx < sR - 4; hx += 15) {
            const bob = Math.sin(t * 0.15 + hx * 0.5 + r) * (2.6 + ex * 3);
            // La-Ola: eine Hebe-Welle wandert über x; bei Erregung springen die
            // Zuschauer hoch (jump) und heben die Arme.
            const laola = Math.max(0, Math.sin(t * 0.16 - (hx - sL) * 0.045 + r * 0.3));
            const jump = laola * ex * 11;
            const yy = ry - jump;
            const wave = ex > 0.15 ? laola > 0.35 : Math.sin(t * 0.22 + hx + r) > 0.4;
            ctx.fillStyle = shirt[((hx * 3 + r) % 6 + 6) % 6];
            ctx.fillRect(hx, yy - 1 + bob, 8, 9);
            ctx.fillStyle = skin[((hx + r) % 4 + 4) % 4];
            ctx.beginPath(); ctx.arc(hx + 4, yy - 4 + bob, 3, 0, Math.PI * 2); ctx.fill();
            if (wave) {
              // Arme hoch (bei La-Ola beide Arme = Jubel).
              ctx.strokeStyle = skin[((hx + r) % 4 + 4) % 4]; ctx.lineWidth = 1.6;
              ctx.beginPath(); ctx.moveTo(hx + 7, yy + 2 + bob); ctx.lineTo(hx + 11, yy - 6 + bob); ctx.stroke();
              if (ex > 0.4) { ctx.beginPath(); ctx.moveTo(hx + 1, yy + 2 + bob); ctx.lineTo(hx - 3, yy - 6 + bob); ctx.stroke(); }
            }
          }
        }
      }

      // (2) Festbanner über der Schlucht.
      {
        const bY = ceil + 6, bL = gL + 8, bR = gR - 8;
        ctx.fillStyle = '#d24b57';
        roundRectPath(ctx, bL, bY, bR - bL, 20, 5); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bL, bY, bR - bL, 3);
        ctx.fillStyle = '#fff4d8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('★  G R O S S E   S C H L U C H T  ★', (bL + bR) / 2, bY + 15);
        ctx.textAlign = 'left';
      }

      // (3) Scheinwerfer-Strahlen von der Decke auf die vier Schwingseil-Anker.
      const ropeCols = [201, 206, 211, 216];
      for (let i = 0; i < ropeCols.length; i++) {
        const sxTop = X(ropeCols[i] + 0.5);
        const sway = Math.sin(t * 0.05 + i * 1.4) * 16;
        const beamY = Math.round(H * 0.66);
        const flick = 0.28 + Math.sin(t * 0.11 + i) * 0.06;
        const cone = ctx.createLinearGradient(sxTop, ceil + 26, sxTop, beamY);
        cone.addColorStop(0, `rgba(255,236,150,${flick})`);
        cone.addColorStop(1, 'rgba(255,236,150,0)');
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(sxTop - 6, ceil + 26);
        ctx.lineTo(sxTop + 6, ceil + 26);
        ctx.lineTo(sxTop + 40 + sway, beamY);
        ctx.lineTo(sxTop - 40 + sway, beamY);
        ctx.closePath(); ctx.fill();
        // Scheinwerfer-Gehäuse (auf dem Banner).
        ctx.fillStyle = 'rgba(52,56,66,0.95)';
        ctx.fillRect(sxTop - 6, ceil + 22, 12, 8);
        ctx.fillStyle = `rgba(255,246,196,${0.75 + Math.sin(t * 0.11 + i) * 0.25})`;
        ctx.beginPath(); ctx.arc(sxTop, ceil + 27, 3.2, 0, Math.PI * 2); ctx.fill();
      }

      // (4) Großes pulsierendes Apex-Highlight (~col 207.5, hoch in der Mitte).
      {
        const ax = X(207.5), ay = Math.round(H * 0.34);
        const pulse = 0.6 + Math.sin(t * 0.12) * 0.4;
        const halo = ctx.createRadialGradient(ax, ay, 2, ax, ay, 46);
        halo.addColorStop(0, `rgba(255,226,120,${0.55 * pulse})`);
        halo.addColorStop(1, 'rgba(255,226,120,0)');
        ctx.fillStyle = halo; ctx.fillRect(ax - 46, ay - 46, 92, 92);
        // rotierender Funken-Kranz.
        for (let k = 0; k < 6; k++) {
          const a = t * 0.06 + k * Math.PI / 3;
          const rr = 20 + Math.sin(t * 0.1 + k) * 4;
          ctx.fillStyle = `rgba(255,248,200,${0.55 * pulse})`;
          ctx.beginPath(); ctx.arc(ax + Math.cos(a) * rr, ay + Math.sin(a) * rr, 1.9, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
}

/** Plüsch-Traumland: gemütliches Kinderzimmer in der Abenddämmerung — Pastell-
 *  Wand mit Herzchen-Tapete, Fenster mit Mond & Sternen, Wimpelkette, Regal mit
 *  Kuscheltieren, Kuschelbett, sich drehendes Baby-Mobile, Nachtlicht-Glühen. */
function drawPlushBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW, H = this.viewportH;
  const t = this.time;
  const sock = Math.round(H * 0.82), ceil = Math.round(H * 0.10);
  const T = TILE_SIZE;
  const X = (col: number) => col * T - camera.x;

  // Wand: kräftiger Pastell-Verlauf (sattes Lila → Pink → warmes Pfirsich).
  const wall = ctx.createLinearGradient(0, 0, 0, sock);
  wall.addColorStop(0, '#b9a7ee');
  wall.addColorStop(0.42, '#e2acdf');
  wall.addColorStop(0.74, '#f7b6bf');
  wall.addColorStop(1, '#ffcf9c');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, sock);

  // Weicher Traum-Lichtschein oben (subtiler warmer Radialglow, gibt Tiefe).
  {
    const gx = W * 0.5, gy = ceil - 12;
    const glow = ctx.createRadialGradient(gx, gy, 12, gx, gy, W * 0.62);
    glow.addColorStop(0, 'rgba(255,247,228,0.4)');
    glow.addColorStop(1, 'rgba(255,247,228,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, sock);
  }

  // Sanfte vertikale Tapeten-Streifen (kaum sichtbar → dezente Wandtextur).
  {
    const px = camera.x * 0.12, sp = 48;
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    for (let i = Math.floor(px / sp) - 1; i <= Math.floor((px + W) / sp) + 1; i++) {
      if (((i % 2) + 2) % 2) continue;
      ctx.fillRect(i * sp - px, 0, sp, sock);
    }
  }

  // Herzchen-&-Punkt-Tapete (zwei Töne, versetzt) — verspielter Wandprint.
  {
    const px = camera.x * 0.15, sp = 64;
    for (let i = Math.floor(px / sp) - 1; i <= Math.floor((px + W) / sp) + 1; i++) {
      for (let r = 0; r < 9; r++) {
        const wx = i * sp + 18 - px + (r % 2) * (sp / 2);
        const wy = ceil + 14 + r * 56;
        if (wy > sock - 8) continue;
        if (((i + r) % 2 + 2) % 2 === 0) {
          ctx.fillStyle = 'rgba(235,110,175,0.32)';
          ctx.beginPath();
          ctx.moveTo(wx, wy + 3);
          ctx.bezierCurveTo(wx - 5, wy - 3, wx - 9, wy + 3, wx, wy + 9);
          ctx.bezierCurveTo(wx + 9, wy + 3, wx + 5, wy - 3, wx, wy + 3);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(120,150,240,0.28)';
          ctx.beginPath(); ctx.arc(wx, wy + 3, 2.6, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  // Weicher Regenbogen-Bogen an der Wand (weltverankert ~col 15), mit Wölkchen.
  {
    const cxb = X(15), cyb = ceil + Math.round(H * 0.30);
    if (cxb > -280 && cxb < W + 140) {
      const bands = ['#ff6b8e', '#ff9e4a', '#ffde59', '#5fc770', '#4aa8e6', '#a86be0'];
      ctx.save();
      ctx.globalAlpha = 0.72; ctx.lineWidth = 8; ctx.lineCap = 'round';
      for (let k = 0; k < bands.length; k++) {
        ctx.strokeStyle = bands[k];
        ctx.beginPath(); ctx.arc(cxb, cyb, 58 + k * 7, Math.PI, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const ex of [cxb - 100, cxb + 100]) {
        ctx.beginPath();
        ctx.arc(ex, cyb + 2, 12, 0, Math.PI * 2); ctx.arc(ex + 12, cyb, 10, 0, Math.PI * 2); ctx.arc(ex - 12, cyb, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Große Fenster mit Sternenhimmel, glühendem Mond, Wolken & Lichtstrahlen.
  {
    const px = camera.x * 0.28, sp = 560, wW = 172, wTop = ceil + 22, wH = Math.round(H * 0.40);
    for (let i = Math.floor(px / sp) - 1; i <= Math.floor((px + W) / sp) + 1; i++) {
      const wx = i * sp + 150 - px;
      if (wx < -wW - 70 || wx > W + 70) continue;
      // Rahmen (Creme-Außen + Lavendel-Kante) mit weichem Schatten.
      ctx.fillStyle = 'rgba(120,100,140,0.14)'; roundRectPath(ctx, wx - 10, wTop - 8, wW + 20, wH + 24, 16); ctx.fill();
      ctx.fillStyle = '#fdf7ff'; roundRectPath(ctx, wx - 8, wTop - 8, wW + 16, wH + 16, 14); ctx.fill();
      ctx.fillStyle = '#cdb6de'; roundRectPath(ctx, wx - 4, wTop - 4, wW + 8, wH + 8, 10); ctx.fill();
      // Nachthimmel-Verlauf (tief indigo → violett → dämmerrosa).
      const sky = ctx.createLinearGradient(0, wTop, 0, wTop + wH);
      sky.addColorStop(0, '#26264f'); sky.addColorStop(0.6, '#4a3f7a'); sky.addColorStop(1, '#835f92');
      ctx.save(); roundRectPath(ctx, wx, wTop, wW, wH, 8); ctx.clip();
      ctx.fillStyle = sky; ctx.fillRect(wx, wTop, wW, wH);
      // Sterne (funkeln) + gelegentliche Vierstrahler.
      for (let s = 0; s < 24; s++) {
        const sx = wx + 10 + ((s * 47) % (wW - 16));
        const sy = wTop + 8 + ((s * 71) % (wH - 14));
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.05 + s));
        ctx.fillStyle = `rgba(255,250,225,${tw})`;
        ctx.beginPath(); ctx.arc(sx, sy, s % 7 === 0 ? 1.9 : 1.1, 0, Math.PI * 2); ctx.fill();
        if (s % 7 === 0) {
          ctx.strokeStyle = `rgba(255,250,225,${tw * 0.6})`; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(sx - 3, sy); ctx.lineTo(sx + 3, sy); ctx.moveTo(sx, sy - 3); ctx.lineTo(sx, sy + 3); ctx.stroke();
        }
      }
      // Sanft driftende Wölkchen.
      for (let c = 0; c < 2; c++) {
        const cxp = wx + ((t * (0.14 + c * 0.1) + c * 95) % (wW + 60)) - 30;
        const cyp = wTop + wH * (0.55 + c * 0.22);
        ctx.fillStyle = `rgba(214,204,232,${0.5 - c * 0.16})`;
        ctx.beginPath(); ctx.arc(cxp, cyp, 12, 0, Math.PI * 2); ctx.arc(cxp + 13, cyp + 2, 9, 0, Math.PI * 2); ctx.arc(cxp - 12, cyp + 2, 8, 0, Math.PI * 2); ctx.fill();
      }
      // Glühender Sichelmond mit Halo.
      const mx = wx + wW - 40, my = wTop + 34;
      const halo = ctx.createRadialGradient(mx, my, 4, mx, my, 34);
      halo.addColorStop(0, 'rgba(255,244,200,0.55)'); halo.addColorStop(1, 'rgba(255,244,200,0)');
      ctx.fillStyle = halo; ctx.fillRect(mx - 34, my - 34, 68, 68);
      ctx.fillStyle = '#fdf1c2'; ctx.beginPath(); ctx.arc(mx, my, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#463c76'; ctx.beginPath(); ctx.arc(mx + 7, my - 5, 15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Sprossenkreuz.
      ctx.strokeStyle = 'rgba(205,182,222,0.95)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(wx + wW / 2, wTop); ctx.lineTo(wx + wW / 2, wTop + wH); ctx.moveTo(wx, wTop + wH / 2); ctx.lineTo(wx + wW, wTop + wH / 2); ctx.stroke();
      // Fensterbank + kleine Topfpflanze.
      ctx.fillStyle = '#e7d3c2'; roundRectPath(ctx, wx - 10, wTop + wH + 6, wW + 20, 8, 3); ctx.fill();
      const potx = wx + 18, poty = wTop + wH + 6;
      ctx.fillStyle = '#e08a6a'; roundRectPath(ctx, potx - 7, poty - 10, 14, 12, 2); ctx.fill();
      ctx.fillStyle = '#7fb98a'; ctx.beginPath(); ctx.arc(potx, poty - 15, 6, 0, Math.PI * 2); ctx.arc(potx - 5, poty - 12, 4, 0, Math.PI * 2); ctx.arc(potx + 5, poty - 12, 4, 0, Math.PI * 2); ctx.fill();
      // Warme Lichtstrahlen ins Zimmer (unter dem Fenster).
      const beam = ctx.createLinearGradient(wx, wTop + wH, wx + 40, wTop + wH + 150);
      beam.addColorStop(0, 'rgba(255,240,205,0.15)'); beam.addColorStop(1, 'rgba(255,240,205,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(wx + 24, wTop + wH); ctx.lineTo(wx + wW - 24, wTop + wH);
      ctx.lineTo(wx + wW + 44, wTop + wH + 150); ctx.lineTo(wx - 24, wTop + wH + 150);
      ctx.closePath(); ctx.fill();
    }
  }

  // Gerahmte Wandbilder (weltverankert): Herz-Bild & Sternchen-Bild.
  {
    const drawFrame = (col: number, hf: number, mat: string, motif: (x: number, y: number) => void) => {
      const fx = X(col), fy = ceil + Math.round(H * hf);
      if (fx < -60 || fx > W + 60) return;
      ctx.strokeStyle = 'rgba(150,120,150,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(fx - 14, fy - 20); ctx.lineTo(fx, fy - 30); ctx.lineTo(fx + 14, fy - 20); ctx.stroke();
      ctx.fillStyle = '#b58a6a'; roundRectPath(ctx, fx - 22, fy - 20, 44, 40, 4); ctx.fill();
      ctx.fillStyle = mat; roundRectPath(ctx, fx - 17, fy - 15, 34, 30, 3); ctx.fill();
      motif(fx, fy - 1);
    };
    drawFrame(31, 0.22, '#f4c6d8', (x, y) => {
      ctx.fillStyle = '#e0567a'; ctx.beginPath();
      ctx.moveTo(x, y + 4); ctx.bezierCurveTo(x - 8, y - 5, x - 14, y + 4, x, y + 14); ctx.bezierCurveTo(x + 14, y + 4, x + 8, y - 5, x, y + 4); ctx.fill();
    });
    drawFrame(64, 0.20, '#cbe0f4', (x, y) => {
      ctx.fillStyle = '#f0b83a'; ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + k * (Math.PI * 2 / 5);
        ctx.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11);
        const a2 = a + Math.PI / 5;
        ctx.lineTo(x + Math.cos(a2) * 5, y + Math.sin(a2) * 5);
      }
      ctx.closePath(); ctx.fill();
    });
    // Regenbogen-Bild + Mond-Bild weiter hinten im Level.
    drawFrame(108, 0.22, '#fde8c6', (x, y) => {
      const rb = ['#ff6b8e', '#ffb04a', '#5fc770', '#4a92f0'];
      ctx.lineWidth = 2.4;
      for (let k = 0; k < 4; k++) { ctx.strokeStyle = rb[k]; ctx.beginPath(); ctx.arc(x, y + 8, 4 + k * 3, Math.PI, Math.PI * 2); ctx.stroke(); }
    });
    drawFrame(146, 0.20, '#d6cbf4', (x, y) => {
      ctx.fillStyle = '#fdf1c2'; ctx.beginPath(); ctx.arc(x + 2, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d6cbf4'; ctx.beginPath(); ctx.arc(x + 7, y - 3, 8, 0, Math.PI * 2); ctx.fill();
    });
  }

  // ── Extra-Deko: bunte Luftballons, Sterngirlande, Wolke, Bauklötze ──
  {
    // Bunte Luftballons, schweben & wippen sanft (weltverankert).
    const balloons: [number, number, string][] = [
      [42, 0.30, '#ff5e7e'], [80, 0.26, '#4a92f0'], [126, 0.32, '#ffc23a'], [156, 0.27, '#5fc770'],
    ];
    for (const [col, hf, colr] of balloons) {
      const bx = X(col) + Math.sin(t * 0.03 + col) * 6;
      const by = ceil + Math.round(H * hf) + Math.sin(t * 0.05 + col) * 5;
      if (bx < -40 || bx > W + 40) continue;
      // Schnur.
      ctx.strokeStyle = 'rgba(120,100,130,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by + 20); ctx.quadraticCurveTo(bx + 5, by + 34, bx, by + 46); ctx.stroke();
      // Ballon.
      ctx.fillStyle = colr;
      ctx.beginPath(); ctx.ellipse(bx, by, 15, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(bx - 5, by - 6, 4, 6, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colr; ctx.beginPath(); ctx.moveTo(bx - 3, by + 17); ctx.lineTo(bx + 3, by + 17); ctx.lineTo(bx, by + 22); ctx.closePath(); ctx.fill();
    }

    // Sterngirlande an der Decke (bunte hängende Sterne & Herzen, parallaxe).
    {
      const px = camera.x * 0.45, sp = 58, gy = ceil + 44;
      const gc = ['#ffc23a', '#ff6ea0', '#5fd77a', '#5aa8ff', '#c06bff'];
      const glo = Math.floor(px / sp) - 1, ghi = Math.floor((px + W) / sp) + 1;
      for (let i = glo; i <= ghi; i++) {
        const gx = i * sp - px;
        const drop = 10 + ((i % 3) * 8);
        ctx.strokeStyle = 'rgba(130,110,130,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx, gy + drop - 6); ctx.stroke();
        const col = gc[((i % 5) + 5) % 5];
        const yy = gy + drop + Math.sin(t * 0.06 + i) * 2;
        ctx.fillStyle = col;
        if (i % 2 === 0) {
          // Stern.
          ctx.beginPath();
          for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * (Math.PI * 2 / 5); ctx.lineTo(gx + Math.cos(a) * 7, yy + Math.sin(a) * 7); const a2 = a + Math.PI / 5; ctx.lineTo(gx + Math.cos(a2) * 3, yy + Math.sin(a2) * 3); }
          ctx.closePath(); ctx.fill();
        } else {
          // Herz.
          ctx.beginPath(); ctx.moveTo(gx, yy + 2); ctx.bezierCurveTo(gx - 5, yy - 4, gx - 9, yy + 2, gx, yy + 8); ctx.bezierCurveTo(gx + 9, yy + 2, gx + 5, yy - 4, gx, yy + 2); ctx.fill();
        }
      }
    }

    // Große freundliche Wolke mit Gesicht (weltverankert ~col 100).
    {
      const cx = X(100), cy = ceil + Math.round(H * 0.16);
      if (cx > -90 && cx < W + 90) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(cx - 20, cy + 4, 16, 0, Math.PI * 2); ctx.arc(cx, cy - 4, 20, 0, Math.PI * 2);
        ctx.arc(cx + 22, cy + 2, 15, 0, Math.PI * 2); ctx.arc(cx + 4, cy + 12, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a5570'; ctx.beginPath(); ctx.arc(cx - 6, cy, 2.2, 0, Math.PI * 2); ctx.arc(cx + 8, cy, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5a5570'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx + 1, cy + 3, 4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
        ctx.fillStyle = 'rgba(255,150,180,0.5)'; ctx.beginPath(); ctx.arc(cx - 9, cy + 5, 3, 0, Math.PI * 2); ctx.arc(cx + 11, cy + 5, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Wandregal mit Stapel bunter ABC-Bauklötze (~col 112, im sichtbaren
    // Wandbereich, damit die Bodenkacheln es nicht verdecken).
    {
      const bx = X(112), by = ceil + Math.round(H * 0.44);
      if (bx > -90 && bx < W + 70) {
        // Regalbrett + Halter.
        ctx.fillStyle = '#c99a70'; roundRectPath(ctx, bx - 8, by, 60, 6, 2); ctx.fill();
        ctx.fillStyle = 'rgba(120,90,60,0.5)'; ctx.fillRect(bx - 6, by + 6, 3, 5); ctx.fillRect(bx + 47, by + 6, 3, 5);
        const blocks: [number, number, string, string][] = [
          [0, 0, '#ff6b6b', 'A'], [26, 0, '#4a92f0', 'B'], [13, -26, '#5fc770', 'C'],
        ];
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const [dx, dy, colr, ch] of blocks) {
          const x = bx + dx, y = by + dy;
          ctx.fillStyle = colr; roundRectPath(ctx, x, y - 24, 24, 24, 4); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 2, y - 22, 20, 3);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.fillText(ch, x + 12, y - 11);
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
    }
  }

  // Wimpelkette + glühende Lichterkette quer über die Decke (leichte Parallaxe).
  {
    const px = camera.x * 0.4, sp = 34, y0 = ceil + 4;
    const cols = ['#ff5e8a', '#ffc23a', '#5fc770', '#4a92f0', '#b45ee0'];
    const lo = Math.floor(px / sp) - 1, hi = Math.floor((px + W) / sp) + 1;
    // Schnur (leicht durchhängend).
    ctx.strokeStyle = 'rgba(150,120,150,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = lo; i <= hi; i++) {
      const fx = i * sp - px; const dip = Math.sin(i * 0.9) * 3;
      if (i === lo) ctx.moveTo(fx, y0 + 4 + dip); else ctx.lineTo(fx, y0 + 4 + dip);
    }
    ctx.stroke();
    // Wimpel.
    for (let i = lo; i <= hi; i++) {
      const fx = i * sp - px; const dip = Math.sin(i * 0.9) * 3;
      ctx.fillStyle = cols[((i % 5) + 5) % 5];
      ctx.beginPath(); ctx.moveTo(fx - 7, y0 + 5 + dip); ctx.lineTo(fx + 7, y0 + 5 + dip); ctx.lineTo(fx, y0 + 18 + dip); ctx.closePath(); ctx.fill();
    }
    // Glühende Lichterkette knapp darunter (warme, funkelnde Lämpchen).
    const y1 = y0 + 26;
    const lampCols = ['#ffc23a', '#ff6ea0', '#5fd77a', '#5aa8ff', '#c06bff'];
    ctx.strokeStyle = 'rgba(120,100,120,0.45)'; ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = lo; i <= hi; i++) {
      const fx = i * sp + sp / 2 - px; const dip = Math.sin(i * 0.7 + 1) * 4 + 3;
      if (i === lo) ctx.moveTo(fx, y1 + dip); else ctx.lineTo(fx, y1 + dip);
    }
    ctx.stroke();
    for (let i = lo; i <= hi; i++) {
      const fx = i * sp + sp / 2 - px; const dip = Math.sin(i * 0.7 + 1) * 4 + 3;
      const col = lampCols[((i % 5) + 5) % 5];
      const tw = 0.6 + 0.4 * Math.sin(t * 0.08 + i);
      ctx.save(); ctx.globalAlpha = 0.55 * tw;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(fx, y1 + dip + 8, 10, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(fx, y1 + dip + 8, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(fx - 1, y1 + dip + 7, 1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Möbel-Ebene (Parallaxe ~0.55): Kuschelbett + Spielzeugregal, weltverankert.
  {
    const parX = (col: number) => col * T - camera.x * 0.85;
    const baseY = sock - 4;
    // Kuschelbett (bei ~col 24).
    {
      const bx = parX(24);
      if (bx > -220 && bx < W + 60) {
        ctx.fillStyle = '#c98fb0'; roundRectPath(ctx, bx, baseY - 40, 150, 40, 8); ctx.fill();        // Bettgestell
        ctx.fillStyle = '#f6e4ee'; roundRectPath(ctx, bx + 6, baseY - 58, 138, 24, 12); ctx.fill();    // Decke
        ctx.fillStyle = '#fff6fb'; roundRectPath(ctx, bx + 10, baseY - 70, 44, 22, 10); ctx.fill();     // Kissen
        ctx.fillStyle = '#e9c6dc'; roundRectPath(ctx, bx + 58, baseY - 66, 40, 18, 9); ctx.fill();      // Kissen 2
        // schlafendes Kuscheltier auf dem Bett (blinzelt „Z").
        ctx.fillStyle = '#caa87e'; ctx.beginPath(); ctx.arc(bx + 110, baseY - 56, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8a6a48'; ctx.beginPath(); ctx.arc(bx + 103, baseY - 63, 4, 0, Math.PI * 2); ctx.arc(bx + 117, baseY - 63, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(120,110,140,0.6)'; ctx.font = 'bold 12px sans-serif';
        const zf = Math.floor(t * 0.05) % 3;
        ctx.fillText('z', bx + 124, baseY - 66 - zf * 5);
      }
    }
    // Spielzeugregal mit Kuscheltier-Silhouetten (bei ~col 70).
    {
      const rx = parX(70);
      if (rx > -260 && rx < W + 60) {
        ctx.fillStyle = '#d8b48a';
        for (let s = 0; s < 2; s++) { ctx.fillRect(rx, baseY - 30 - s * 34, 190, 6); }
        const pal = ['#e07a94', '#7fb98a', '#e6c15a', '#8fa8e0', '#c58fd8'];
        for (let s = 0; s < 2; s++) {
          for (let k = 0; k < 5; k++) {
            const tx = rx + 16 + k * 36, ty = baseY - 30 - s * 34;
            ctx.fillStyle = pal[(k + s) % 5];
            ctx.beginPath(); ctx.arc(tx, ty - 10, 9, 0, Math.PI * 2); ctx.fill();      // Körper
            ctx.beginPath(); ctx.arc(tx - 6, ty - 19, 4, 0, Math.PI * 2); ctx.arc(tx + 6, ty - 19, 4, 0, Math.PI * 2); ctx.fill(); // Ohren
          }
        }
      }
    }
  }

  // Baby-Mobile an der Decke, dreht sich langsam (bei ~col 46).
  {
    const mx = X(46), my = ceil + 20;
    if (mx > -80 && mx < W + 80) {
      ctx.strokeStyle = 'rgba(150,120,150,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, ceil); ctx.lineTo(mx, my); ctx.stroke();
      const rot = t * 0.02;
      const arms: [number, string][] = [[0, '#f4a6c0'], [Math.PI * 0.5, '#f6d06a'], [Math.PI, '#a6d8a0'], [Math.PI * 1.5, '#8fb8f0']];
      ctx.strokeStyle = 'rgba(180,150,180,0.8)'; ctx.lineWidth = 1.5;
      for (const [a0, col] of arms) {
        const a = a0 + rot;
        const ex = mx + Math.cos(a) * 26, ey = my + 4 + Math.sin(a) * 8;
        ctx.beginPath(); ctx.moveTo(mx, my + 2); ctx.lineTo(ex, ey); ctx.stroke();
        const dY = ey + 12 + Math.sin(t * 0.06 + a0) * 2;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ex, dY, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // Kuschel-Schaukel an der Decke, schwingt sanft hin und her (bei ~col 58).
  {
    const ax = X(58), ay = ceil + 8;
    if (ax > -120 && ax < W + 120) {
      const ang = Math.sin(t * 0.04) * 0.28;
      const len = Math.round(H * 0.40);
      const seatY = ay + Math.cos(ang) * len;
      const dx = Math.sin(ang) * len;
      ctx.strokeStyle = 'rgba(150,120,150,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax - 12, ay); ctx.lineTo(ax + dx - 12, seatY); ctx.moveTo(ax + 12, ay); ctx.lineTo(ax + dx + 12, seatY); ctx.stroke();
      // Holz-Sitz.
      ctx.fillStyle = '#d8a86a'; roundRectPath(ctx, ax + dx - 16, seatY, 32, 7, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,0.4)'; ctx.fillRect(ax + dx - 16, seatY, 32, 2);
      // kleines Plüschtier auf der Schaukel.
      ctx.fillStyle = '#e79ab8';
      ctx.beginPath(); ctx.arc(ax + dx, seatY - 8, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ax + dx - 5, seatY - 14, 3, 0, Math.PI * 2); ctx.arc(ax + dx + 5, seatY - 14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a30'; ctx.beginPath(); ctx.arc(ax + dx - 2.4, seatY - 9, 1.1, 0, Math.PI * 2); ctx.arc(ax + dx + 2.4, seatY - 9, 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Kleine Spielzeug-Rutsche im Hintergrund, ein Plüschtier rutscht herunter
  // (bei ~col 90). Rein dekorativ, hinter der Spielebene.
  {
    const rx = X(90), baseY = sock - 2;
    if (rx > -120 && rx < W + 120) {
      const topY = baseY - 62;
      // Leiter links.
      ctx.strokeStyle = 'rgba(150,120,150,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(rx, baseY); ctx.lineTo(rx, topY); ctx.moveTo(rx + 12, baseY); ctx.lineTo(rx + 12, topY); ctx.stroke();
      ctx.lineWidth = 2;
      for (let r = 0; r < 5; r++) { const ry = topY + 8 + r * 11; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 12, ry); ctx.stroke(); }
      // Rutschbahn (Kurve nach rechts unten), pastellblau.
      ctx.strokeStyle = '#9fd0ef'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rx + 12, topY + 2);
      ctx.quadraticCurveTo(rx + 44, topY + 20, rx + 58, baseY);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx + 12, topY - 1);
      ctx.quadraticCurveTo(rx + 44, topY + 17, rx + 58, baseY - 3);
      ctx.stroke();
      // Plattform oben + Geländer.
      ctx.fillStyle = '#e6b3cf'; roundRectPath(ctx, rx - 3, topY - 4, 20, 6, 2); ctx.fill();
      // rutschendes Plüschtier (Position läuft die Kurve entlang, loopt).
      const s = (t * 0.012) % 1;
      const px = rx + 12 + (rx + 58 - (rx + 12)) * s;
      const qy = topY + 2 + (baseY - (topY + 2)) * (s * s);   // beschleunigt nach unten
      ctx.fillStyle = '#f6d36a';
      ctx.beginPath(); ctx.arc(px, qy - 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px - 4, qy - 11, 2.4, 0, Math.PI * 2); ctx.arc(px + 4, qy - 11, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(px - 2, qy - 6, 1, 0, Math.PI * 2); ctx.arc(px + 2, qy - 6, 1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Winkendes Kuscheltier am Boden — winkt in Wellen (bei ~col 36).
  {
    const wx = X(36), wy = sock - 6;
    if (wx > -60 && wx < W + 60) {
      const wave = Math.max(0, Math.sin(t * 0.12));           // Wink-Phase
      ctx.fillStyle = '#b6752f';
      ctx.beginPath(); ctx.ellipse(wx, wy - 10, 11, 9, 0, 0, Math.PI * 2); ctx.fill();   // Körper
      ctx.beginPath(); ctx.arc(wx, wy - 22, 8, 0, Math.PI * 2); ctx.fill();              // Kopf
      ctx.beginPath(); ctx.arc(wx - 6, wy - 29, 3.4, 0, Math.PI * 2); ctx.arc(wx + 6, wy - 29, 3.4, 0, Math.PI * 2); ctx.fill(); // Ohren
      ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(wx - 3, wy - 23, 1.4, 0, Math.PI * 2); ctx.arc(wx + 3, wy - 23, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(wx, wy - 20, 2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      // winkender Arm (hebt sich mit der Wink-Phase).
      ctx.strokeStyle = '#b6752f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const ax2 = wx + 10, ay2 = wy - 14;
      const hx = ax2 + 6, hy = ay2 - 8 - wave * 8 + Math.sin(t * 0.4) * wave * 3;
      ctx.beginPath(); ctx.moveTo(ax2, ay2); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#caa06a'; ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Nachtlicht-Glühen an der Wand (langsam pulsierend), bei ~col 12.
  {
    const nx = X(12), ny = sock - 40;
    if (nx > -120 && nx < W + 120) {
      const pulse = 0.5 + Math.sin(t * 0.05) * 0.5;
      const glow = ctx.createRadialGradient(nx, ny, 4, nx, ny, 90);
      glow.addColorStop(0, `rgba(255,224,150,${0.28 * pulse + 0.08})`);
      glow.addColorStop(1, 'rgba(255,224,150,0)');
      ctx.fillStyle = glow; ctx.fillRect(nx - 90, ny - 90, 180, 180);
    }
  }

  // Sockelleiste + weicher Teppichboden-Ansatz unten.
  const floor = ctx.createLinearGradient(0, sock, 0, H);
  floor.addColorStop(0, '#e8cdb6'); floor.addColorStop(1, '#d8b79c');
  ctx.fillStyle = floor; ctx.fillRect(0, sock, W, H - sock);
  ctx.fillStyle = 'rgba(255,246,236,0.5)'; ctx.fillRect(0, sock, W, 3);
  ctx.fillStyle = 'rgba(200,140,175,0.35)'; ctx.fillRect(0, sock + 5, W, 2);
}

/** Indoor-Trampolinhalle (Superfly): 5 Tiefenebenen, Tribünen, Geräte, Springer, Neon. */
function drawTrampolineBackground(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const W = this.viewportW, H = this.viewportH;
  const sock = Math.round(H * 0.80), ceil = Math.round(H * 0.12);
  const t = this.time;
  const wall = ctx.createLinearGradient(0, 0, 0, sock);
  wall.addColorStop(0, '#222842'); wall.addColorStop(1, '#3a4262');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, sock);

  // EBENE 0 (0.06): Perspektiv-Rückwand + Fluchtpunkt-Logo.
  const px0 = camera.x * 0.06, vpSp = W * 1.2, vpy = H * 0.46;
  ctx.strokeStyle = 'rgba(60,68,100,0.5)'; ctx.lineWidth = 1;
  for (let k = Math.floor(px0 / vpSp) - 1; k <= Math.floor((px0 + W) / vpSp) + 1; k++) {
    const vpx = k * vpSp + W * 0.5 - px0;
    for (const fx of [vpx - W * 0.5, vpx - W * 0.2, vpx + W * 0.2, vpx + W * 0.5]) {
      ctx.beginPath(); ctx.moveTo(fx, ceil); ctx.lineTo(vpx, vpy); ctx.moveTo(fx, sock); ctx.lineTo(vpx, vpy); ctx.stroke();
    }
    ctx.fillStyle = '#1e2238'; ctx.fillRect(vpx - 70, vpy - 34, 140, 64);
    // Fernes Rückwand-Branding bewusst dezent: halbtransparent + dünner,
    // damit es als Hintergrund liest und nicht mit dem Gameplay konkurriert.
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = '#e6285a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(vpx, vpy - 2, 44, 21, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e6608c'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SUPERFLY', vpx, vpy + 2); ctx.textAlign = 'left';
    ctx.restore();
    ctx.strokeStyle = 'rgba(60,68,100,0.5)';
  }

  // Decke + Oberlichter (0.1).
  ctx.fillStyle = '#181c30'; ctx.fillRect(0, 0, W, ceil);
  const pxC = camera.x * 0.1, olSp = 150;
  for (let i = Math.floor(pxC / olSp) - 1; i <= Math.floor((pxC + W) / olSp) + 1; i++) {
    const ox = i * olSp + 30 - pxC;
    ctx.fillStyle = '#46587e'; ctx.fillRect(ox, 4, 60, ceil - 8);
    ctx.fillStyle = 'rgba(150,180,220,0.4)'; ctx.fillRect(ox, 4, 60, 3);
  }

  // EBENE 1 (0.12): Tribünen + Netze.
  const pxF = camera.x * 0.12, trSp = 560;
  for (let i = Math.floor(pxF / trSp) - 1; i <= Math.floor((pxF + W) / trSp) + 1; i++) {
    for (const seg of [i * trSp + 0, i * trSp + 360]) {
      const x0 = seg - pxF;
      for (let r = 0; r < 4; r++) {
        const ry = Math.round(H * 0.28) + r * 10;
        ctx.fillStyle = r % 2 ? '#3a4260' : '#46506e';
        ctx.fillRect(x0, ry, 180, 7);
        for (let sx = x0 + 6; sx < x0 + 174; sx += 16) {
          ctx.fillStyle = ['#c8b0a0', '#a0b8c8', '#c8a0b0', '#b0c8a0'][((sx + r) % 4 + 4) % 4];
          ctx.beginPath(); ctx.ellipse(sx + 3, ry - 1, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
  ctx.strokeStyle = 'rgba(64,74,104,0.4)'; ctx.lineWidth = 1;
  const nSp = 20; ctx.beginPath();
  for (let i = Math.floor(pxF / nSp) - 1; i <= Math.floor((pxF + W) / nSp) + 1; i++) {
    const nx = i * nSp - pxF; ctx.moveTo(nx, ceil); ctx.lineTo(nx, sock);
  }
  for (let ny = ceil; ny < sock; ny += nSp) { ctx.moveTo(0, ny); ctx.lineTo(W, ny); }
  ctx.stroke();

  // Mehrfarbiges Neon (pulsierend).
  const pulse = 0.6 + Math.sin(t * 0.04) * 0.2;
  ctx.fillStyle = `rgba(255,60,170,${pulse})`; ctx.fillRect(0, ceil + 3, W, 4);
  ctx.fillStyle = `rgba(120,220,90,${pulse})`; ctx.fillRect(0, Math.round(H * 0.5), W, 3);
  ctx.fillStyle = `rgba(60,220,230,${pulse})`; ctx.fillRect(0, sock - 7, W, 4);

  // EBENE 2 (0.2): Geräte + Banner.
  const pxM = camera.x * 0.2, swSp = 640;
  for (let i = Math.floor(pxM / swSp) - 1; i <= Math.floor((pxM + W) / swSp) + 1; i++) {
    const sx = i * swSp + 60 - pxM, sTop = Math.round(H * 0.40);
    ctx.strokeStyle = '#8a96b8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, sTop); ctx.lineTo(sx, sock); ctx.moveTo(sx + 50, sTop); ctx.lineTo(sx + 50, sock); ctx.stroke();
    ctx.lineWidth = 2;
    for (let y = sTop; y < sock; y += 12) { ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 50, y); ctx.stroke(); }
  }
  for (let i = Math.floor(pxM / swSp) - 1; i <= Math.floor((pxM + W) / swSp) + 1; i++) {
    const bx = i * swSp + 460 - pxM, by = Math.round(H * 0.34);
    ctx.fillStyle = '#e2e6ee'; ctx.fillRect(bx, by, 46, 34);
    ctx.strokeStyle = '#9098aa'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 46, 34);
    ctx.fillStyle = '#e6602e'; ctx.fillRect(bx + 14, by + 30, 18, 3);
  }
  for (let i = Math.floor(pxM / swSp) - 1; i <= Math.floor((pxM + W) / swSp) + 1; i++) {
    const fx = i * swSp + 280 - pxM;
    const cubes: [number, number][] = [[0, 0], [16, -12], [32, 0], [8, -26], [24, -26]];
    const cc = ['#e6505a', '#508cdc', '#f0be46', '#5ac878'];
    cubes.forEach(([dx, dy], k) => { ctx.fillStyle = cc[k % 4]; ctx.fillRect(fx + dx, sock - 18 + dy, 16, 16); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(fx + dx, sock - 18 + dy, 16, 3); });
  }
  // Banner seltener (1500 statt 900) und als Hintergrund-Signage dezent:
  // halbtransparent + gedämpftes Blau, damit es nicht über die Vordergrund-
  // Schilder/Gameplay schreit.
  const bSp = 1500;
  for (let i = Math.floor(pxM / bSp) - 1; i <= Math.floor((pxM + W) / bSp) + 1; i++) {
    const bx = i * bSp + 600 - pxM, by = Math.round(H * 0.20);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#1c4e9c'; ctx.fillRect(bx, by, 190, 32);
    ctx.fillStyle = 'rgba(214,228,250,0.92)'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('GO FLY OR GO HOME', bx + 95, by + 22); ctx.textAlign = 'left';
    ctx.restore();
  }

  // EBENE 2.5 (0.25): springende Silhouetten (animiert).
  const pxS = camera.x * 0.25, spSp = 280;
  for (let i = Math.floor(pxS / spSp) - 1; i <= Math.floor((pxS + W) / spSp) + 1; i++) {
    const sx = i * spSp + 100 - pxS;
    const jump = Math.abs(Math.sin(t * 0.03 + i * 1.7)) * 50;
    const sy = sock - 24 - jump;
    ctx.fillStyle = 'rgba(18,22,38,0.85)';
    ctx.beginPath(); ctx.arc(sx + 6, sy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(18,22,38,0.85)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx + 6, sy + 6); ctx.lineTo(sx + 6, sy + 22); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx + 6, sy + 11); ctx.lineTo(sx - 2, sy + 2); ctx.moveTo(sx + 6, sy + 11); ctx.lineTo(sx + 14, sy + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 6, sy + 22); ctx.lineTo(sx, sy + 32); ctx.moveTo(sx + 6, sy + 22); ctx.lineTo(sx + 12, sy + 32); ctx.stroke();
  }

  // Strahler-Lichtkegel (0.2).
  const pxL = camera.x * 0.2, lSp = 260;
  for (let i = Math.floor(pxL / lSp) - 1; i <= Math.floor((pxL + W) / lSp) + 1; i++) {
    const lx = i * lSp + 130 - pxL;
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.ellipse(lx, ceil + 2, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    const cone = ctx.createLinearGradient(0, ceil, 0, sock);
    cone.addColorStop(0, 'rgba(255,248,214,0.1)'); cone.addColorStop(1, 'rgba(255,248,214,0)');
    ctx.fillStyle = cone;
    ctx.beginPath(); ctx.moveTo(lx - 7, ceil + 2); ctx.lineTo(lx + 7, ceil + 2); ctx.lineTo(lx + 30, sock); ctx.lineTo(lx - 30, sock); ctx.closePath(); ctx.fill();
  }

  // EBENE 3 (nah, 0.4): Polster-Sockel.
  const pxN = camera.x * 0.4;
  ctx.fillStyle = '#2a2e48'; ctx.fillRect(0, sock, W, H - sock);
  const padCols = ['#e63c50', '#3c78dc', '#f0b432', '#50be6e'], padSp = 56;
  for (let i = Math.floor(pxN / padSp) - 1; i <= Math.floor((pxN + W) / padSp) + 1; i++) {
    const px = i * padSp - pxN;
    ctx.fillStyle = padCols[((i % 4) + 4) % 4];
    ctx.fillRect(px, sock, 54, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(px, sock, 54, 3);
  }

  // Bodenreflexion: Neonlicht spiegelt sich auf dem glänzenden Hallenboden.
  const refl = ctx.createLinearGradient(0, sock + 14, 0, H);
  refl.addColorStop(0, `rgba(255,60,170,${pulse * 0.16})`);
  refl.addColorStop(0.5, `rgba(60,220,230,${pulse * 0.1})`);
  refl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = refl;
  ctx.fillRect(0, sock + 14, W, H - sock - 14);

  // Hängende Gymnastik-Ringe von der Decke (mittlere Tiefe).
  const pxD = camera.x * 0.18, dSp = 320;
  for (let i = Math.floor(pxD / dSp) - 1; i <= Math.floor((pxD + W) / dSp) + 1; i++) {
    const dx = i * dSp + 180 - pxD;
    const swing = Math.sin(t * 0.025 + i) * 4;
    ctx.strokeStyle = 'rgba(120,130,160,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(dx, ceil); ctx.lineTo(dx + swing, ceil + 32); ctx.stroke();
    ctx.strokeStyle = '#d8a050'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(dx + swing, ceil + 40, 8, 0, Math.PI * 2); ctx.stroke();
  }

  // Schwebende Konfetti-Lichtpartikel (Party-Atmosphäre).
  const pxP = camera.x * 0.15, partSp = 70, partCols = ['255,120,180', '120,220,140', '120,180,255', '255,220,120'];
  for (let i = Math.floor(pxP / partSp) - 1; i <= Math.floor((pxP + W) / partSp) + 1; i++) {
    const baseX = i * partSp - pxP;
    const seed = ((i % 28) + 28) % 28;
    const py = ceil + 20 + ((seed * 37) % (sock - ceil - 50)) + Math.sin(t * 0.02 + seed) * 12;
    const a = 0.3 + Math.sin(t * 0.03 + seed * 2) * 0.2;
    ctx.fillStyle = `rgba(${partCols[seed % 4]},${Math.max(0.1, a)})`;
    ctx.fillRect(baseX, py, 3, 3);
  }
}


// Bluefield F4: Vordergrund-Grasbüschel (Parallax > 1) — rahmt die Szene, weht.
function drawBluefieldForeground(this: Renderer, camX: number, VW: number, VH: number) {
  const ctx = this.ctx;
  const t = this.time;
  const par = 1.35, spacing = 210, pxP = camX * par, baseY = VH + 6;
  const cols = ['#1b3a86', '#254aa8', '#3a63cc'];
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = Math.floor(pxP / spacing) - 1; i <= Math.floor((pxP + VW) / spacing) + 1; i++) {
    const sx = i * spacing - pxP;
    if (sx < -60 || sx > VW + 60) continue;
    const seed = (((i * 37) % 100) + 100) % 100;
    const h = 46 + (seed % 22);
    const sway = Math.sin(t * 0.03 + seed) * 5;
    ctx.globalAlpha = 0.9;
    const blades = 9;
    for (let b = 0; b < blades; b++) {
      const tt = b / (blades - 1) - 0.5;
      const bx = sx + tt * 34;
      const len = h * (0.7 + 0.3 * (1 - Math.abs(tt)));
      const tipX = bx + tt * 16 + sway * (0.5 + Math.abs(tt));
      ctx.strokeStyle = cols[b % 3];
      ctx.lineWidth = 3.2 - Math.abs(tt) * 1.4;
      ctx.beginPath();
      ctx.moveTo(bx, baseY);
      ctx.quadraticCurveTo((bx + tipX) / 2, baseY - len * 0.6, tipX, baseY - len);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,220,255,0.9)';
    ctx.beginPath(); ctx.arc(sx + sway, baseY - h + 4, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe680';
    ctx.beginPath(); ctx.arc(sx + sway, baseY - h + 4, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawBfButterfly(ctx: CanvasRenderingContext2D, x: number, y: number, flap: number, col: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col; ctx.globalAlpha = 0.85;
  const w = 4 * flap;
  ctx.beginPath(); ctx.ellipse(-w, -2, w, 3.2, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w, -2, w, 3.2, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-w * 0.8, 2, w * 0.7, 2.4, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w * 0.8, 2, w * 0.7, 2.4, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0e1c44'; ctx.globalAlpha = 0.9;
  ctx.fillRect(-0.7, -3, 1.4, 6);
  ctx.restore();
}

// Bluefield Reise · Tür-VORDERGRUND: ein transluzenter Schleusen-Schleier über
// jeder Türöffnung, im Vordergrund (nach dem Spieler gezeichnet). Läuft die
// Figur durch die Tür, verschwindet sie kurz dahinter — der „durch-die-Tür"-Effekt.
function drawBluefieldDoorFronts(this: Renderer, camX: number, camY: number, W: number, H: number) {
  const T = TILE_SIZE;
  const groundY = 13 * T - camY;
  if (groundY <= 0) return;
  const ctx = this.ctx;
  const doorW = 74, frameW = 12;
  const doorH = Math.min(groundY, 5.4 * T);
  for (const col of [71, 142, 213]) {
    const dx = col * T - camX;
    if (dx < -70 || dx > W + 70) continue;
    const topY = groundY - doorH, leftX = dx - doorW / 2;
    ctx.save();
    // transluzenter Schleusen-Schleier über der Öffnung
    const veil = ctx.createLinearGradient(leftX, 0, leftX + doorW, 0);
    veil.addColorStop(0, 'rgba(120,160,235,0.5)');
    veil.addColorStop(0.5, 'rgba(150,185,245,0.34)');
    veil.addColorStop(1, 'rgba(120,160,235,0.5)');
    ctx.fillStyle = veil;
    ctx.fillRect(leftX, topY, doorW, doorH);
    // vertikale Lamellen (Schleusen-Membran)
    ctx.strokeStyle = 'rgba(222,236,255,0.28)'; ctx.lineWidth = 1;
    for (let lx = leftX + 8; lx < leftX + doorW; lx += 10) {
      ctx.beginPath(); ctx.moveTo(lx, topY); ctx.lineTo(lx, groundY); ctx.stroke();
    }
    // vordere Rahmenkanten (opak, gibt Tiefe)
    ctx.fillStyle = 'rgba(18,40,116,0.95)';
    ctx.fillRect(leftX - frameW, topY, 4, doorH);
    ctx.fillRect(leftX + doorW + frameW - 4, topY, 4, doorH);
    ctx.restore();
  }
}

// Bluefield Reise · Boss-Arena-Kulisse (um col 277, Endkampf gegen das
// „Legacy-System"). Dramatische Kampfzone: alte Server-Racks mit roten
// Fehler-LEDs, rote Warn-Spotlights, Boden-Warnstreifen, Boss-Namensschild.
// Rein dekorativ (keine Kollision).
function drawBluefieldBossArena(this: Renderer, camera: Camera) {
  const T = TILE_SIZE;
  const W = this.viewportW, H = this.viewportH;
  const groundY = 13 * T - camera.y;
  if (groundY <= 0) return;
  const cx = 277.5 * T - camera.x;
  if (cx < -210 || cx > W + 210) return;
  const ctx = this.ctx;
  const t = this.time;
  ctx.save();

  // Legacy-System-Server-Racks (hinter dem Boss)
  for (const [ox, ht] of [[-96, 0.34], [-54, 0.42], [72, 0.38], [112, 0.30]] as [number, number][]) {
    const rx = cx + ox, rh = H * ht, ry = groundY - rh, rw = 34;
    const g = ctx.createLinearGradient(0, ry, 0, groundY);
    g.addColorStop(0, '#3a4048'); g.addColorStop(1, '#20242a');
    ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#4a525c'; ctx.lineWidth = 1.5; ctx.strokeRect(rx, ry, rw, rh);
    const slots = Math.floor(rh / 12);
    for (let s = 0; s < slots; s++) {
      const sy = ry + 4 + s * 12;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(rx + 3, sy, rw - 6, 8);
      const on = (s + Math.floor(t * 0.08)) % 3 === 0;
      ctx.fillStyle = on ? '#ff4d4d' : '#5a2a2a';
      ctx.fillRect(rx + rw - 7, sy + 2, 3, 3);
    }
  }

  // rote Warn-Spotlights (Gefahr)
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.1);
  const spot = ctx.createRadialGradient(cx, groundY - 20, 10, cx, groundY - 20, 170);
  spot.addColorStop(0, `rgba(255,60,50,${0.13 * pulse})`);
  spot.addColorStop(1, 'rgba(255,60,50,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(cx - 170, groundY - 190, 340, 190);

  // Boden-Warnstreifen-Zone (Kampfzone)
  const arenaL = cx - 104, arenaR = cx + 92, ay = groundY - 5;
  ctx.fillStyle = 'rgba(20,10,10,0.28)'; ctx.fillRect(arenaL, ay, arenaR - arenaL, 5);
  for (const ex of [arenaL, arenaR - 24]) {
    for (let s = 0; s < 4; s++) {
      ctx.fillStyle = s % 2 ? '#1a1a1a' : '#ffcc33';
      ctx.fillRect(ex + s * 6, ay - 3, 6, 4);
    }
  }

  // Boss-Namensschild oben
  const sy2 = H * 0.15;
  ctx.textAlign = 'center';
  ctx.font = 'bold 8px monospace'; ctx.fillStyle = `rgba(255,90,70,${0.7 + pulse * 0.3})`;
  ctx.fillText('! KAMPFZONE', cx, sy2 - 14);
  ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255,50,40,0.6)'; ctx.shadowBlur = 8;
  ctx.fillText('LEGACY-SYSTEM', cx, sy2);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Bluefield Reise · ferne Parallax-Silhouetten-Ebene: eine Reihe ferner
// „Türme", die langsamer scrollen als der Vordergrund (parallax<1) und so
// räumliche Tiefe in die vollflächigen Produktwelten bringen. Sektionsfarben
// werden vom Aufrufer gesetzt; optionales Fenster-Raster (win).
function drawBluefieldFarLayer(
  this: Renderer, x0: number, x1: number, groundY: number, camX: number,
  fill: string, parallax: number, minH: number, maxH: number, stepCols: number, seed: number, win?: string,
) {
  if (groundY <= 0) return;
  const ctx = this.ctx;
  const T = TILE_SIZE;
  for (let col = 0; col < 290; col += stepCols) {
    const screenX = col * T - camX * parallax;
    if (screenX < x0 - 160 || screenX > x1 + 20) continue;
    const rnd = Math.abs(Math.sin(col * 0.7 + seed));
    const h = minH + rnd * (maxH - minH);
    const w = stepCols * T * (0.55 + 0.3 * Math.abs(Math.sin(col * 1.9 + seed)));
    const topY = groundY - h;
    ctx.fillStyle = fill;
    ctx.fillRect(screenX, topY, w, h);
    if (win) {
      ctx.fillStyle = win;
      for (let wy = topY + 10; wy < groundY - 8; wy += 12) {
        for (let wx = screenX + 5; wx < screenX + w - 5; wx += 9) {
          if ((Math.floor(wy / 12) + Math.floor(wx / 9)) % 3 === 0) ctx.fillRect(wx, wy, 3, 5);
        }
      }
    }
  }
}

// Bluefield Reise · Szene ④ GKV-Vergleich (Sektion ④, cols 213–283). Das
// Produkt existiert noch nicht — es liegt im NEBEL/in Planung. Gedämpfte
// Nebelstimmung, driftende Schwaden, eine schemenhafte Vergleichstabelle, die
// aus dem Nebel auftaucht, und der Claim „GKV-Vergleich · in Planung".
function drawBluefieldGKVScene(this: Renderer, camera: Camera) {
  const T = TILE_SIZE;
  const x0 = 213 * T - camera.x, x1 = 283 * T - camera.x;
  const W = this.viewportW, H = this.viewportH;
  if (x1 < 0 || x0 > W) return;
  const ctx = this.ctx;
  const t = this.time;
  const low = this.quality === 'low';
  const groundY = 13 * T - camera.y;
  const sx = (col: number) => col * T - camera.x;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, Math.max(0, groundY)); ctx.clip();

  // Neblige Grundstimmung (gedämpftes Grau-Blau statt hellem Himmel)
  const fog = ctx.createLinearGradient(0, 0, 0, groundY);
  fog.addColorStop(0, '#6d7c96'); fog.addColorStop(0.6, '#8c99af'); fog.addColorStop(1, '#aeb8c9');
  ctx.fillStyle = fog; ctx.fillRect(x0, 0, x1 - x0, groundY);
  // Ferne Parallax-Ebene: schemenhafte Silhouetten, die im Nebel verschwimmen.
  drawBluefieldFarLayer.call(this, x0, x1, groundY, camera.x, 'rgba(150,163,186,0.5)', 0.45, H * 0.12, H * 0.34, 6, 3.1);
  // Mittlere Parallax-Ebene: größere Silhouetten, etwas klarer (näher).
  drawBluefieldFarLayer.call(this, x0, x1, groundY, camera.x, 'rgba(120,134,160,0.55)', 0.6, H * 0.16, H * 0.42, 7, 7.2);

  // Produktclaim weit hinten (blass, im Nebel)
  {
    const camMid = camera.x + W * 0.5;
    const ca = Math.max(0, Math.min(1, (camMid - 213 * T) / (12 * T), (283 * T - camMid) / (12 * T)));
    if (ca > 0.01) {
      const drift = ((camMid - 213 * T) / (70 * T)) * -40;
      const pcx = W * 0.5 + drift;
      ctx.save(); ctx.globalAlpha = ca; ctx.textAlign = 'center';
      // Großes Wasserzeichen entfernt (v437): doppelte den Karten-Titel und
      // trug zur „Text-Suppe" bei. Nur der Nebel-Claim bleibt, klein & tief.
      void pcx;
      ctx.font = '14px sans-serif'; ctx.fillStyle = 'rgba(55,72,102,0.24)';
      ctx.fillText('in Planung · noch im Nebel', pcx, H * 0.52);
      ctx.restore();
    }
  }

  // Schemenhafte GKV-Vergleichstabelle (taucht aus dem Nebel auf)
  const tbx = sx(248), tby = H * 0.40, tbw = 156, tbh = 92;
  if (tbx + tbw > x0 && tbx < x1) {
    ctx.save(); ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(242,246,252,0.75)';
    ctx.beginPath(); ctx.roundRect(tbx, tby, tbw, tbh, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(90,110,140,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(tbx, tby, tbw, tbh, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(90,110,150,0.6)'; ctx.fillRect(tbx, tby, tbw, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
    ctx.fillText('kasse      beitrag   zusatz', tbx + 6, tby + 11);
    ctx.fillStyle = 'rgba(70,90,120,0.55)'; ctx.font = '8px monospace';
    const rows = [['Kasse A', '14,6%', '1,7%'], ['Kasse B', '14,6%', '1,2%'], ['Kasse C', '14,6%', '2,2%'], ['? ? ?', '—', '—']];
    for (let r = 0; r < rows.length; r++) {
      ctx.fillText(rows[r][0].padEnd(10) + rows[r][1].padEnd(9) + rows[r][2], tbx + 6, tby + 30 + r * 15);
      ctx.strokeStyle = 'rgba(90,110,140,0.18)';
      ctx.beginPath(); ctx.moveTo(tbx + 4, tby + 34 + r * 15); ctx.lineTo(tbx + tbw - 4, tby + 34 + r * 15); ctx.stroke();
    }
    ctx.restore();
  }

  // „in Planung"-Badge (gestrichelt, kühl)
  const pbX = sx(248), pbY = H * 0.32;
  if (pbX > x0 - 60 && pbX < x1 + 60) {
    const bw = 74, bx = pbX - bw / 2;
    ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(120,150,190,0.9)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(bx, pbY, bw, 16, 8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(90,115,150,0.95)'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('IN PLANUNG', pbX, pbY + 11);
  }

  // ── Schwebende Kassen-Vergleichskarten (schemenhaft, aus dem Nebel) ──
  const kassen: [string, string, number][] = [['Kasse A', '14,6%', 2], ['Kasse B', '14,6%', 1], ['? ? ?', '—', 0]];
  for (let i = 0; i < kassen.length; i++) {
    const kc = 220 + i * 12;
    const kx = kc * T - camera.x;
    if (kx < x0 - 40 || kx > x1) continue;
    const isPlan = i === 2;
    const ky = H * 0.50 + Math.sin(t * 0.015 + i) * 6;
    ctx.save(); ctx.globalAlpha = 0.55;
    ctx.fillStyle = isPlan ? 'rgba(206,214,228,0.5)' : 'rgba(242,246,252,0.78)';
    ctx.beginPath(); ctx.roundRect(kx, ky, 54, 42, 5); ctx.fill();
    if (isPlan) ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(90,110,140,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(kx, ky, 54, 42, 5); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(70,90,120,0.75)'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(kassen[i][0], kx + 5, ky + 13);
    ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = 'rgba(90,110,150,0.85)';
    ctx.fillText(kassen[i][1], kx + 5, ky + 28);
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = s < kassen[i][2] ? 'rgba(255,200,60,0.75)' : 'rgba(120,130,150,0.4)';
      ctx.fillRect(kx + 5 + s * 8, ky + 33, 6, 6);
    }
    ctx.restore();
  }

  // ── Schwebende Fragezeichen (noch in Planung, unklar) ──
  for (let i = 0; i < 4; i++) {
    const qx = (214 + (i * 17) % 66) * T - camera.x;
    if (qx < x0 || qx > x1) continue;
    const qy = H * 0.34 - Math.sin(t * 0.02 + i) * 18;
    const a = 0.14 + 0.1 * Math.sin(t * 0.05 + i * 1.5);
    ctx.fillStyle = `rgba(110,130,165,${a})`;
    ctx.font = `bold ${18 + (i % 3) * 8}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('?', qx, qy);
  }

  // ── Vordergrund: „in Bau"-Vergleichsportal-Terminal (gestrichelt/offline) ──
  const ptx = 246 * T - camera.x, pth = 72, pty = groundY - pth;
  if (ptx + 44 > x0 && ptx < x1 && groundY > 0) {
    ctx.save(); ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(58,66,80,0.92)';
    ctx.beginPath(); ctx.roundRect(ptx, pty, 44, pth, 4); ctx.fill();
    ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(150,165,190,0.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(ptx, pty, 44, pth, 4); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(40,48,62,0.9)'; ctx.fillRect(ptx + 5, pty + 6, 34, 24);
    ctx.fillStyle = 'rgba(160,175,200,0.75)'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('vergleich', ptx + 22, pty + 17);
    ctx.fillText('geplant', ptx + 22, pty + 26);
    ctx.setLineDash([2, 2]); ctx.strokeStyle = 'rgba(150,165,190,0.5)';
    for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo(ptx + 6, pty + 40 + r * 8); ctx.lineTo(ptx + 38, pty + 40 + r * 8); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Driftende Nebelschwaden (weich) — legen den Dunst über die Szene
  const swN = low ? 5 : 10;
  for (let i = 0; i < swN; i++) {
    const seed = i * 61.3;
    const baseX = x0 + (i / swN) * (x1 - x0);
    const cxp = baseX + Math.sin(t * 0.01 + seed) * 45;
    const cyp = H * (0.18 + 0.62 * (Math.sin(seed) * 0.5 + 0.5));
    const rr = 60 + (i % 4) * 28;
    const a = 0.1 + 0.1 * (Math.sin(t * 0.02 + seed) * 0.5 + 0.5);
    const g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, rr);
    g.addColorStop(0, `rgba(232,238,247,${a})`);
    g.addColorStop(1, 'rgba(232,238,247,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cxp, cyp, rr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Bluefield Reise · Szene ③ MatchSuite (Sektion ③, cols 142–212). „Im Aufbau",
// semantisches Berater-Matching: Blueprint-Look (Navy + weißes Raster) mit
// Profil-↔-Projekt-Karten, pulsierenden Match-Verbindungen und Score. Amber =
// im Aufbau. Produktclaim „MatchSuite · Berater trifft Projekt" weit hinten.
function drawBluefieldMatchSuiteScene(this: Renderer, camera: Camera) {
  const T = TILE_SIZE;
  const x0 = 142 * T - camera.x, x1 = 212 * T - camera.x;
  const W = this.viewportW, H = this.viewportH;
  if (x1 < 0 || x0 > W) return;
  const ctx = this.ctx;
  const t = this.time;
  const groundY = 13 * T - camera.y;
  const sx = (col: number) => col * T - camera.x;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, Math.max(0, groundY)); ctx.clip();

  // Blueprint-Wand + feines weißes Raster
  const wall = ctx.createLinearGradient(0, 0, 0, groundY);
  wall.addColorStop(0, '#0e2568'); wall.addColorStop(1, '#1a3a92');
  ctx.fillStyle = wall; ctx.fillRect(x0, 0, x1 - x0, groundY);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  const gp = (camera.x * 0.5) % 32;
  for (let gx = x0 - gp; gx < x1; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, groundY); ctx.stroke(); }
  for (let gy = 0; gy < groundY; gy += 32) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke(); }
  // Ferne Parallax-Ebene: navy Struktur-Türme mit Cyan-Fenstern (Tiefe).
  drawBluefieldFarLayer.call(this, x0, x1, groundY, camera.x, '#0e2560', 0.4, H * 0.16, H * 0.44, 5, 2.2, 'rgba(90,180,255,0.4)');
  // Mittlere Parallax-Ebene: größere, klarere Struktur-Türme (näher, schneller).
  drawBluefieldFarLayer.call(this, x0, x1, groundY, camera.x, '#123472', 0.62, H * 0.22, H * 0.52, 7, 6.4, 'rgba(90,180,255,0.5)');

  // Produktclaim weit hinten
  {
    const camMid = camera.x + W * 0.5;
    const ca = Math.max(0, Math.min(1, (camMid - 142 * T) / (12 * T), (212 * T - camMid) / (12 * T)));
    if (ca > 0.01) {
      const drift = ((camMid - 142 * T) / (70 * T)) * -50;
      const pcx = W * 0.5 + drift;
      ctx.save(); ctx.globalAlpha = ca; ctx.textAlign = 'center';
      // Großes Wasserzeichen entfernt (v437) — nur der Subclaim bleibt, klein & tief.
      ctx.font = '14px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillText('Berater trifft Projekt · semantisch', pcx, H * 0.52);
      ctx.restore();
    }
  }

  // „im Aufbau"-Gerüststreben (Amber)
  ctx.strokeStyle = 'rgba(255,190,70,0.35)'; ctx.lineWidth = 3;
  for (const gc of [150, 168, 190, 206]) {
    const gx = sx(gc);
    if (gx < x0 - 10 || gx > x1 + 10) continue;
    ctx.beginPath(); ctx.moveTo(gx, groundY); ctx.lineTo(gx, H * 0.20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx - 14, H * 0.34); ctx.lineTo(gx + 14, H * 0.30); ctx.stroke();
  }

  // Matching-Kern: Profil-Karten (links) ↔ Projekt-Karten (rechts) — groß & deutlich
  const gcx = sx(177), baseY = H * 0.36;
  if (gcx > x0 - 220 && gcx < x1 + 220) {
    const cw = 82, ch = 50, vgap = 60;
    const profX = gcx - 132, projX = gcx + 50;
    const profNames = ['Berater A', 'Berater B'], projNames = ['Projekt X', 'Projekt Y'];
    // Verbindungen zuerst (hinter den Karten), mit Match-Prozent an der Linie
    const links: [number, number, number][] = [[0, 0, 0], [1, 1, 1], [0, 1, 2]];
    for (const [pi, pj, k] of links) {
      const y1 = baseY + pi * vgap + ch / 2, y2 = baseY + pj * vgap + ch / 2;
      const pulse = 0.4 + 0.45 * Math.sin(t * 0.08 + k);
      ctx.strokeStyle = `rgba(90,222,150,${pulse})`; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(profX + cw, y1); ctx.bezierCurveTo(gcx, y1, gcx, y2, projX, y2); ctx.stroke();
      ctx.fillStyle = `rgba(190,255,215,${0.5 + pulse * 0.4})`; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(['94%', '88%', '71%'][k], gcx, (y1 + y2) / 2 - 4);
    }
    // Karten
    const card = (cx: number, cy: number, accent: string, name: string, isProf: boolean) => {
      ctx.fillStyle = 'rgba(12,26,70,0.96)';
      ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 6); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 6); ctx.stroke();
      if (isProf) { ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx + 16, cy + 17, 9, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = accent; ctx.fillRect(cx + 8, cy + 9, 15, 15); }
      ctx.fillStyle = '#eaf1ff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(name, cx + 30, cy + 17);
      ctx.fillStyle = 'rgba(150,190,255,0.65)';
      for (let s = 0; s < 3; s++) ctx.fillRect(cx + 30 + s * 15, cy + 30, 11, 6);
    };
    for (let i = 0; i < 2; i++) card(profX, baseY + i * vgap, '#5aa0ff', profNames[i], true);
    for (let i = 0; i < 2; i++) card(projX, baseY + i * vgap, '#5ade96', projNames[i], false);
    // großer Match-Score
    ctx.textAlign = 'center'; ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#5ade96';
    ctx.shadowColor = 'rgba(90,222,150,0.5)'; ctx.shadowBlur = 8;
    ctx.fillText('MATCH 94%', gcx, baseY - 22);
    ctx.shadowBlur = 0;
    // im-Aufbau-Badge
    const bw = 84, bx = gcx - bw / 2, by = baseY - 52;
    ctx.fillStyle = 'rgba(255,190,70,0.95)';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, 18, 9); ctx.fill();
    ctx.fillStyle = '#3a2600'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('IM AUFBAU', gcx, by + 12);
  }

  // ── Briefing-Panel oben (das Projekt-Briefing, gegen das gematcht wird) ──
  const brX = sx(192), brY = H * 0.12;
  if (brX + 96 > x0 && brX < x1) {
    ctx.fillStyle = 'rgba(8,20,54,0.92)';
    ctx.beginPath(); ctx.roundRect(brX, brY, 100, 42, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,70,0.6)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(brX, brY, 100, 42, 5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,190,70,0.92)'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
    ctx.fillText('// briefing', brX + 7, brY + 13);
    ctx.fillStyle = 'rgba(200,220,255,0.7)'; ctx.font = '7px monospace';
    ctx.fillText('skills · domaene · rate', brX + 7, brY + 26);
    ctx.fillText('→ bester match', brX + 7, brY + 36);
  }

  // ── Schwebende Skill-Wolke (semantisches Matching) ──
  const skills = ['React', 'AWS', 'SAP', 'Data', 'Cloud', 'Node', 'ML', 'DevOps'];
  ctx.font = 'bold 8px monospace';
  for (let i = 0; i < skills.length; i++) {
    const scol = 148 + ((i * 9) % 62);
    const skx = scol * T - camera.x;
    if (skx < x0 - 40 || skx > x1 + 10) continue;
    const drift = Math.sin(t * 0.02 + i * 1.3) * 12;
    const sky = H * (0.2 + 0.42 * ((i * 0.37) % 1)) + drift;
    const pulse = 0.45 + 0.3 * Math.sin(t * 0.06 + i);
    const tw = ctx.measureText(skills[i]).width + 12;
    ctx.fillStyle = `rgba(70,120,220,${pulse * 0.5})`;
    ctx.beginPath(); ctx.roundRect(skx, sky, tw, 13, 6); ctx.fill();
    ctx.fillStyle = `rgba(224,238,255,${Math.min(1, pulse + 0.35)})`;
    ctx.textAlign = 'left'; ctx.fillText(skills[i], skx + 6, sky + 9);
  }

  // ── Vordergrund: Kandidaten-Datenbank-Terminals am Boden ──
  for (const tc of [152, 182, 205]) {
    const tx = sx(tc), th = 74, ty = groundY - th;
    if (tx + 42 < x0 || tx > x1) continue;
    ctx.fillStyle = 'rgba(8,20,54,0.96)';
    ctx.beginPath(); ctx.roundRect(tx, ty, 42, th, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(90,160,255,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(tx, ty, 42, th, 4); ctx.stroke();
    ctx.fillStyle = 'rgba(18,44,120,0.9)'; ctx.fillRect(tx + 4, ty + 5, 34, 27);
    for (let r = 0; r < 4; r++) {
      const my = ty + 8 + r * 6;
      ctx.fillStyle = 'rgba(150,190,255,0.55)'; ctx.fillRect(tx + 6, my, 7, 3);
      const mw = 6 + ((r * 5 + Math.floor(t * 0.05)) % 16);
      ctx.fillStyle = '#5ade96'; ctx.fillRect(tx + 15, my, mw, 3);
    }
    ctx.fillStyle = 'rgba(150,190,255,0.6)'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('kandidaten', tx + 21, ty + 44);
    for (let r = 0; r < 3; r++) {
      ctx.fillStyle = (r + Math.floor(t * 0.1)) % 2 ? 'rgba(90,222,150,0.85)' : 'rgba(90,160,255,0.5)';
      ctx.fillRect(tx + 6, ty + 50 + r * 7, 30, 3);
    }
  }
  ctx.restore();
}

// Bluefield Reise · Schleusentüren an den Sektionsgrenzen (cols 71/142/213).
// Man läuft durch sie in die nächste Produktwelt — der echte Szenen-Cut.
// Terminal-/Schleusen-Ästhetik mit Ziel-Label über dem Portal.
function drawBluefieldDoors(this: Renderer, camera: Camera) {
  const T = TILE_SIZE;
  const W = this.viewportW;
  const groundY = 13 * T - camera.y;
  const ctx = this.ctx;
  const t = this.time;
  // v461: echte beschriftete SCHLEUSEN-Portale. Die Öffnung zeigt den Schein
  // der NÄCHSTEN Produktwelt (Akzentfarbe), ein heller Licht-Sweep läuft durch,
  // und über dem Tor steht das Ziel (die Schilder sind global aus → kein Doppel).
  const doors = [
    { col: 71, label: '→ U1-OPTIMIERER', glow: '90,235,160' },   // next: U1 (grün)
    { col: 142, label: '→ MATCHSUITE', glow: '255,190,90' },      // next: MatchSuite (amber)
    { col: 213, label: '→ GO-LIVE', glow: '130,195,255' },        // next: Finale (blau)
  ];
  const doorW = 82, frameW = 13;
  const doorH = Math.min(Math.max(0, groundY), 6.0 * T);
  for (const d of doors) {
    const dx = d.col * T - camera.x;
    if (dx < -110 || dx > W + 110) continue;
    const topY = groundY - doorH, leftX = dx - doorW / 2;
    ctx.save();
    // 1) Öffnung: Schein der nächsten Welt (Akzentfarbe), von unten aufsteigend.
    const pg = ctx.createLinearGradient(0, groundY, 0, topY);
    pg.addColorStop(0, `rgba(${d.glow},0.10)`);
    pg.addColorStop(0.55, `rgba(${d.glow},0.34)`);
    pg.addColorStop(1, 'rgba(245,250,255,0.62)');
    ctx.fillStyle = pg;
    ctx.fillRect(leftX, topY, doorW, doorH);
    // 2) Durchlaufender Licht-Sweep (vertikales helles Band, wandert hoch).
    const sweepY = groundY - ((t * 1.6) % (doorH + 30));
    const sw = ctx.createLinearGradient(0, sweepY - 26, 0, sweepY + 26);
    sw.addColorStop(0, 'rgba(255,255,255,0)');
    sw.addColorStop(0.5, `rgba(${d.glow},0.5)`);
    sw.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sw;
    ctx.fillRect(leftX, Math.max(topY, sweepY - 26), doorW, 52);
    // 3) Metall-Rahmen (Terminal-Blau) — Pfosten + oberer Balken, plastisch.
    const fg = ctx.createLinearGradient(leftX - frameW, 0, leftX + doorW + frameW, 0);
    fg.addColorStop(0, '#3355c0'); fg.addColorStop(0.5, '#1e48d6'); fg.addColorStop(1, '#132a86');
    ctx.fillStyle = fg;
    ctx.fillRect(leftX - frameW, topY, frameW, doorH);
    ctx.fillRect(leftX + doorW, topY, frameW, doorH);
    ctx.fillRect(leftX - frameW, topY - frameW, doorW + frameW * 2, frameW);
    // Pfosten-Glanzkante
    ctx.fillStyle = 'rgba(150,185,255,0.7)';
    ctx.fillRect(leftX - frameW, topY, 2, doorH);
    ctx.fillRect(leftX + doorW + frameW - 2, topY, 2, doorH);
    // 4) Warnstreifen unten (Schleuse) + LED-Leiste am Balken.
    ctx.fillStyle = 'rgba(255,200,60,0.9)';
    for (let s = 0; s < 3; s++) {
      ctx.fillRect(leftX - frameW, groundY - 6 - s * 10, frameW, 4);
      ctx.fillRect(leftX + doorW, groundY - 6 - s * 10, frameW, 4);
    }
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = (i + Math.floor(t * 0.1)) % 2 ? `rgb(${d.glow})` : 'rgba(180,210,255,0.55)';
      ctx.fillRect(leftX + 6 + i * 11, topY - frameW + 4, 6, 5);
    }
    // 5) Ziel-Beschriftung über dem Tor (Airlock-Wegweiser).
    ctx.textAlign = 'center';
    const plateW = Math.max(96, d.label.length * 7 + 20);
    ctx.fillStyle = 'rgba(12,26,72,0.86)';
    ctx.fillRect(dx - plateW / 2, topY - frameW - 26, plateW, 18);
    ctx.strokeStyle = `rgba(${d.glow},0.8)`; ctx.lineWidth = 1;
    ctx.strokeRect(dx - plateW / 2, topY - frameW - 26, plateW, 18);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = `rgb(${d.glow})`;
    ctx.fillText(d.label, dx, topY - frameW - 13);
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(190,215,250,0.6)';
    ctx.fillText('// schleuse', dx, topY - frameW - 30);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}

// Bluefield Reise · Szene ① Willkommen: ein Marken-PORTAL am Start
// („Bluefield · Produktlabor") und ein IDEEN-BAUM als Hero-Motiv (aus dem
// Ideen-Glühbirnen wachsen und Funken aufsteigen — „aus Ideen werden
// Produkte"). Davor der screen-fixierte Onboarding-Schriftzug.
// Bluefield Willkommen · ferne/mittlere Hügel-Silhouetten mit Parallax (die
// Wiese braucht runde Hügel statt Türme): eine wellige gefüllte Kurve, die
// langsamer scrollt als der Vordergrund.
function drawBluefieldFarHills(
  this: Renderer, x0: number, x1: number, groundY: number, camX: number,
  fill: string, parallax: number, baseH: number, amp: number, seed: number,
) {
  if (groundY <= 0) return;
  const ctx = this.ctx;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x0 - 60, groundY + 4);
  for (let sx = x0 - 60; sx <= x1 + 60; sx += 24) {
    const wx = sx + camX * parallax;
    const y = groundY - baseH - Math.sin(wx * 0.007 + seed) * amp - Math.sin(wx * 0.019 + seed * 2) * amp * 0.4;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(x1 + 60, groundY + 4);
  ctx.closePath();
  ctx.fill();
}

function drawBluefieldWelcomeScene(this: Renderer, camera: Camera) {
  const T = TILE_SIZE;
  const W = this.viewportW, H = this.viewportH;
  const secEndX = 70 * T - camera.x;
  if (secEndX < 0) return;
  const ctx = this.ctx;
  const t = this.time;
  const groundY = 13 * T - camera.y;
  const low = this.quality === 'low';

  // Hinweis: Die früher hier gezeichnete, auf col 0–70 geclippte Extra-
  // Hügelkette entfiel (v440) — sie doppelte die vier durchgehenden Hügel-
  // Lagen des Haupt-Hintergrunds nur im Willkommens-Abschnitt und erzeugte an
  // der Clip-Kante (col 70) einen harten Helligkeitssprung. Die globalen Hügel
  // laufen ohnehin durch die ganze Wiese.

  // ── A) Willkommens-Portal am Start (col 6) ──
  const portX = 6 * T - camera.x;
  if (portX > -170 && portX < W + 170 && groundY > 0) {
    const pw = 116, ph = Math.min(groundY, 6.2 * T), fw = 16;
    const topY = groundY - ph, leftX = portX - pw / 2;
    ctx.save();
    // Durchgangs-Schein
    const gl = ctx.createLinearGradient(0, topY, 0, groundY);
    gl.addColorStop(0, 'rgba(235,244,255,0.4)'); gl.addColorStop(1, 'rgba(205,228,255,0.12)');
    ctx.fillStyle = gl; ctx.fillRect(leftX, topY, pw, ph);
    // Pfosten + Bogen
    const fg = ctx.createLinearGradient(0, topY, 0, groundY);
    fg.addColorStop(0, '#2a4bb0'); fg.addColorStop(1, '#16308a');
    ctx.fillStyle = fg;
    ctx.fillRect(leftX - fw, topY, fw, ph);
    ctx.fillRect(leftX + pw, topY, fw, ph);
    ctx.fillRect(leftX - fw, topY - 24, pw + 2 * fw, 24);
    // Marken-Punkt-Akzent
    ctx.fillStyle = '#5ade96';
    ctx.beginPath(); ctx.arc(leftX + pw + fw / 2 - 4, topY - 12, 4, 0, Math.PI * 2); ctx.fill();
    // Beschriftung
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px sans-serif'; ctx.fillStyle = '#ffffff';
    ctx.fillText('BLUEFIELD', portX, topY - 7);
    ctx.font = 'bold 8px monospace'; ctx.fillStyle = 'rgba(210,230,255,0.9)';
    ctx.fillText('// produktlabor · willkommen', portX, topY + 14);
    ctx.restore();
  }

  // ── B) Ideen-Baum als Hero (col 46) ──
  const treeX = 46 * T - camera.x;
  if (treeX > -150 && treeX < W + 150 && groundY > 0) {
    const trunkTop = groundY - H * 0.30, cy = trunkTop - 6;
    ctx.save();
    // Stamm
    ctx.strokeStyle = '#3a5a9a'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(treeX, groundY);
    ctx.quadraticCurveTo(treeX - 7, (groundY + trunkTop) / 2, treeX, trunkTop); ctx.stroke();
    // Äste
    ctx.lineWidth = 5;
    for (const [dir, frac] of [[-1, 0.45], [1, 0.62], [-1, 0.78]] as [number, number][]) {
      const ay = groundY - (groundY - trunkTop) * frac;
      ctx.beginPath(); ctx.moveTo(treeX, ay); ctx.quadraticCurveTo(treeX + dir * 18, ay - 6, treeX + dir * 30, ay - 16); ctx.stroke();
    }
    // Krone (blaue Blätter-Cluster)
    const clusters: [number, number, number][] = [[0, 0, 36], [-30, -6, 26], [30, -8, 26], [-16, -26, 24], [18, -24, 24]];
    for (const [ox, oy, r] of clusters) {
      const lx = treeX + ox, ly = cy + oy;
      const g = ctx.createRadialGradient(lx - r * 0.3, ly - r * 0.3, 1, lx, ly, r);
      g.addColorStop(0, 'rgba(120,168,248,0.96)'); g.addColorStop(1, 'rgba(56,98,208,0.85)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI * 2); ctx.fill();
    }
    // Ideen-Glühbirnen + 3 reifende Produkt-Früchte an der Krone
    const bulbs: [number, number][] = [[-26, -12], [24, -18], [0, -32], [32, 4], [-32, 6], [10, 12]];
    const products = ['u1', 'match', 'gkv'];
    let pIdx = 0;
    for (let i = 0; i < bulbs.length; i++) {
      const bx = treeX + bulbs[i][0], by = cy + bulbs[i][1];
      if (i % 2 === 0 && pIdx < 3) {
        // reifende Produkt-Frucht: Idee (Glühbirne) → reifes Produkt-Symbol
        const prod = products[pIdx++];
        const ripe = Math.sin(t * 0.035 + i * 1.5) * 0.5 + 0.5;
        const ga = 1 - ripe;
        if (ga > 0.02) {
          stampGlow(ctx, getGlowDisc(48, 255, 224, 130, 0.42), bx, by, ga * 1.3);
          ctx.fillStyle = `rgba(255,235,150,${ga * 0.4})`;
          ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(255,220,120,${ga})`;
          ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
        }
        if (ripe > 0.02) {
          stampGlow(ctx, getGlowDisc(48, 90, 222, 150, 0.36), bx, by, ripe * 1.2);
          ctx.save(); ctx.globalAlpha = ripe;
          ctx.fillStyle = 'rgba(90,222,150,0.35)';
          ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0e2a5a';
          ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#5ade96'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (prod === 'u1') { ctx.fillStyle = '#eafff2'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('€', bx, by + 1); }
          else if (prod === 'match') {
            ctx.fillStyle = '#5aa0ff'; ctx.beginPath(); ctx.arc(bx - 4, by, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#5ade96'; ctx.beginPath(); ctx.arc(bx + 4, by, 2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#eafff2'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.lineTo(bx + 4, by); ctx.stroke();
          } else { ctx.fillStyle = '#eafff2'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('?', bx, by + 1); }
          ctx.textBaseline = 'alphabetic';
          ctx.restore();
        }
      } else {
        // reine Ideen-Glühbirne
        const pulse = 0.55 + 0.45 * Math.sin(t * 0.1 + i * 1.3);
        ctx.fillStyle = `rgba(255,235,150,${pulse * 0.45})`;
        ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffdc78';
        ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b8bcc8'; ctx.fillRect(bx - 2, by + 4, 4, 3);
      }
    }
    // aufsteigende Ideen-Funken vom Baum
    if (!low) {
      for (let i = 0; i < 6; i++) {
        const rise = (t * 0.5 + i * 40) % 160;
        const fx = treeX + Math.sin(t * 0.03 + i * 2) * 40;
        const fy = cy - 20 - rise;
        const a = Math.max(0, 1 - rise / 160) * 0.6;
        ctx.fillStyle = `rgba(255,235,150,${a})`;
        ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Marken-Claim unter dem Baum
    ctx.textAlign = 'center';
    ctx.font = '13px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('aus Ideen echte Produkte', treeX, groundY - 6);
    ctx.restore();
  }

  // ── Screen-fixierter Onboarding-Schriftzug (mit Ausfaden) ──
  const camMid = camera.x + W * 0.5;
  const fadeStart = 44 * T, secEnd = 64 * T;
  let alpha = 1;
  if (camMid > fadeStart) alpha = Math.max(0, 1 - (camMid - fadeStart) / (secEnd - fadeStart));
  if (alpha <= 0.01) return;
  // Kompakter Banner hoch im freien Himmel — separiert vom Sign-Panel/Portal/
  // Berater in der Bildmitte (Anti-Überlagerung am Spawn).
  const cx = W * 0.5, titleY = H * 0.15;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px sans-serif';
  ctx.shadowColor = 'rgba(12,30,110,0.6)'; ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.fillText('WILLKOMMEN BEI BLUEFIELD', cx, titleY);
  ctx.shadowBlur = 0;
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(240,247,255,0.85)';
  ctx.fillText('Lauf los und erkunde unsere Produktwelt', cx, titleY + 22);
  const bob = Math.sin(t * 0.08) * 3;
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = 'rgba(200,225,255,0.78)';
  ctx.fillText("→ los geht's", cx, titleY + 42 + bob);
  ctx.restore();
}

// Begehbare Erklärungen (v400): Beim Betreten jeder Produkt-Sektion blendet
// eine klare, laienverständliche Karte „was + warum" ein (kamera-gesteuert,
// wie der Willkommens-Titel; keine Engine-State nötig). Ziel: ein Website-
// Besucher versteht sofort, was U1/MatchSuite/GKV sind. Screen-verankert oben,
// hoher Kontrast, sanftes Ein-/Ausblenden.
function drawBluefieldSectionIntros(this: Renderer, camera: Camera) {
  const ctx = this.ctx;
  const VW = this.viewportW, VH = this.viewportH, T = TILE_SIZE;
  const camMidCol = (camera.x + VW * 0.5) / T;
  const SECTIONS: { s: number; accent: string; header: string; lines: string[] }[] = [
    { s: 71, accent: '#3fe08a', header: '① U1-OPTIMIERER · LIVE',
      lines: ['Holt Firmen zu viel gezahlte Lohn-Umlage',
        '(U1) automatisch zurück.',
        '→ Pay-on-success: zahlt nur bei Erfolg.'] },
    { s: 142, accent: '#ffc24a', header: '② MATCHSUITE · IM AUFBAU',
      lines: ['Bringt Berater und Projekte automatisch',
        'zusammen — passendes Match statt langer Suche.',
        '→ Weniger suchen, schneller besetzen.'] },
    { s: 213, accent: '#7fd0ff', header: '③ GKV-VERGLEICH · IN PLANUNG',
      lines: ['Vergleicht gesetzliche Krankenkassen',
        'fair und transparent.',
        '→ Danach: Markttest bestehen → GO-LIVE!'] },
  ];
  const rampAlpha = (d: number): number => {
    if (d < -3 || d > 18) return 0;
    if (d < 1) return (d + 3) / 4;              // −3..1 → 0..1
    if (d > 10) return Math.max(0, (18 - d) / 8); // 10..18 → 1..0
    return 1;
  };
  for (const sec of SECTIONS) {
    const a = rampAlpha(camMidCol - sec.s);
    if (a <= 0.01) continue;
    // Kartengröße aus dem breitesten Text.
    ctx.font = 'bold 13px monospace';
    let maxW = ctx.measureText(sec.header).width;
    ctx.font = '12px sans-serif';
    for (const l of sec.lines) maxW = Math.max(maxW, ctx.measureText(l).width);
    const pad = 12, lineH = 17;
    const w = Math.ceil(maxW) + pad * 2;
    const h = 22 + sec.lines.length * lineH + pad;
    const x = Math.round(VW * 0.5 - w / 2);
    const y = Math.round(VH * 0.11);
    ctx.save();
    ctx.globalAlpha = a;
    // Karte.
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(8,15,38,0.97)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = sec.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.stroke();
    // Akzent-Balken links.
    ctx.fillStyle = sec.accent;
    ctx.fillRect(x, y + 6, 4, h - 12);
    // Header.
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = sec.accent;
    ctx.fillText(sec.header, x + pad + 6, y + pad + 10);
    // Zeilen.
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(236,244,255,0.97)';
    for (let i = 0; i < sec.lines.length; i++) {
      ctx.fillText(sec.lines[i], x + pad + 6, y + 22 + pad + 4 + i * lineH);
    }
    ctx.restore();
  }
}

// Bluefield v462-Umbau · GO-LIVE-REVEAL (Wonder-Moment): der kalte, neblige
// Finale-Abschnitt hellt sich zum Ziel hin auf — der Nebel hebt sich, eine helle
// Marken-Sonne steigt auf, „GO LIVE" leuchtet. Fortschritt an der Kamera-Position
// im Finale (col 234 → 283). Nur auf die Finale-Sektion (ab 213) geclippt.
function drawBluefieldGoLiveReveal(this: Renderer, camera: Camera) {
  const T = TILE_SIZE;
  const W = this.viewportW, H = this.viewportH;
  const ctx = this.ctx;
  const t = this.time;
  const camMidCol = (camera.x + W * 0.5) / T;
  const p = Math.max(0, Math.min(1, (camMidCol - 234) / (283 - 234)));
  if (p <= 0.01) return;
  const groundY = 13 * T - camera.y;
  const x0 = Math.max(0, 213 * T - camera.x);
  if (x0 > W) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, 0, W - x0, H); ctx.clip();
  // 1) Nebel hebt sich / Marken-Morgenröte steigt vom Horizont.
  const dawn = ctx.createLinearGradient(0, groundY, 0, 0);
  dawn.addColorStop(0, `rgba(120,180,255,${(0.34 * p).toFixed(3)})`);
  dawn.addColorStop(0.5, `rgba(90,150,255,${(0.16 * p).toFixed(3)})`);
  dawn.addColorStop(1, 'rgba(120,180,255,0)');
  ctx.fillStyle = dawn; ctx.fillRect(x0, 0, W - x0, H);
  ctx.fillStyle = `rgba(214,232,255,${(0.13 * p).toFixed(3)})`; ctx.fillRect(x0, 0, W - x0, H);
  // 2) aufsteigende GO-LIVE-Marken-Sonne nahe der Flagge (col ~274).
  const sunx = 274 * T - camera.x;
  const suny = groundY - H * (0.26 + 0.18 * p);
  if (sunx > x0 - 240 && sunx < W + 240) {
    const r = H * 0.24;
    const orb = ctx.createRadialGradient(sunx, suny, 0, sunx, suny, r);
    orb.addColorStop(0, `rgba(238,246,255,${(0.92 * p).toFixed(3)})`);
    orb.addColorStop(0.4, `rgba(110,170,255,${(0.5 * p).toFixed(3)})`);
    orb.addColorStop(1, 'rgba(90,150,255,0)');
    ctx.fillStyle = orb; ctx.fillRect(sunx - r, suny - r, r * 2, r * 2);
    // Strahlenkranz
    ctx.save(); ctx.globalAlpha = 0.4 * p; ctx.strokeStyle = 'rgba(200,225,255,0.7)'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + t * 0.004;
      ctx.beginPath(); ctx.moveTo(sunx + Math.cos(a) * r * 0.7, suny + Math.sin(a) * r * 0.7);
      ctx.lineTo(sunx + Math.cos(a) * r * 1.25, suny + Math.sin(a) * r * 1.25); ctx.stroke();
    }
    ctx.restore();
    // 3) „GO LIVE" leuchtet auf (späte Phase).
    if (p > 0.45) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (p - 0.45) * 2.5);
      ctx.textAlign = 'center'; ctx.font = 'bold 24px sans-serif';
      ctx.shadowColor = 'rgba(30,79,216,0.8)'; ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.fillText('GO LIVE', sunx, suny - r * 0.15);
      ctx.shadowBlur = 0; ctx.font = 'bold 10px monospace'; ctx.fillStyle = 'rgba(200,225,255,0.9)';
      ctx.fillText('// wird eigene marke · 100% de', sunx, suny + 6);
      ctx.restore();
    }
  }
  // 4) City-Fenster gehen an (warme Glanzpunkte, mit p zunehmend).
  for (let i = 0; i < 26; i++) {
    const wc = 216 + (i * 2.4) % 66;
    const wx = wc * T - camera.x;
    if (wx < x0 || wx > W) continue;
    const wy = groundY - (30 + (i * 37) % 130);
    const tw = 0.5 + 0.5 * Math.sin(t * 0.05 + i * 1.3);
    ctx.fillStyle = `rgba(180,215,255,${(0.7 * p * tw).toFixed(3)})`;
    ctx.fillRect(wx, wy, 3, 3);
  }
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word; yy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

// Bluefield v461-Umbau · PRODUKT-SCHAUFENSTER: pro Produkt EIN kräftiges,
// animiertes Hologramm im OBEREN Band (über dem Laufkorridor), auf dunklem Glas
// mit Akzentrahmen — endlich klar sichtbare, „arbeitende" Produkte. Welt-
// verankert (leichte Parallaxe), zeigt Name + ein Nutzen-Satz + eine lebende
// Mini-Visualisierung (U1 zählt €, MatchSuite verbindet, GKV vergleicht).
function drawBluefieldProductHeroes(this: Renderer, camera: Camera) {
  const T = TILE_SIZE;
  const W = this.viewportW, H = this.viewportH;
  const ctx = this.ctx;
  const t = this.time;
  const cardW = 250, cardH = 138;
  const bandY = Math.max(8, H * 0.11 - camera.y * 0.15);
  const camMid = (camera.x + W * 0.5) / T; // Bildmitte in Spalten

  // Sektions-klebrig: das Schaufenster schwebt oben im Himmel, solange man in
  // der Produkt-Sektion ist (gut lesbar über die ganze Zone), und blendet an den
  // Rändern weich aus. Screen-x leicht rechts, damit es die Figur nicht deckt.
  const card = (
    c0: number, c1: number, accent: string, badge: string, badgeCol: string,
    title: string, benefit: string, draw: (bx: number, by: number) => void,
  ) => {
    // Vor der nächsten Schleusen-Tür (steht bei c1+1) sauber ausblenden, damit
    // die ausklingende Produktkarte nicht mit dem Tür-Label kollidiert.
    const cEnd = c1 - 4;
    if (camMid < c0 - 2 || camMid > cEnd + 1) return;
    const alpha = Math.max(0, Math.min(1, (camMid - c0) / 7 + 0.15, (cEnd - camMid) / 5 + 0.05));
    if (alpha <= 0.02) return;
    const x = W - cardW - 20, y = bandY;
    const cx = x + cardW / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Halo
    const halo = ctx.createRadialGradient(cx, y + cardH * 0.5, 10, cx, y + cardH * 0.5, cardW * 0.75);
    halo.addColorStop(0, `rgba(${accent},0.16)`); halo.addColorStop(1, `rgba(${accent},0)`);
    ctx.fillStyle = halo; ctx.fillRect(x - 40, y - 30, cardW + 80, cardH + 60);
    // Glas-Panel
    roundRectPath(ctx, x, y, cardW, cardH, 12);
    ctx.fillStyle = 'rgba(9,20,52,0.9)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(${accent},0.9)`; ctx.stroke();
    // oberer Glanz
    ctx.save(); roundRectPath(ctx, x, y, cardW, cardH, 12); ctx.clip();
    const gl = ctx.createLinearGradient(0, y, 0, y + 30); gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(x, y, cardW, 30); ctx.restore();
    // Header + Badge
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = `rgb(${accent})`;
    ctx.fillText(title, x + 14, y + 26);
    const bw = badge.length * 6.4 + 14;
    roundRectPath(ctx, x + cardW - bw - 12, y + 12, bw, 17, 8);
    ctx.fillStyle = `rgba(${badgeCol},0.22)`; ctx.fill();
    ctx.strokeStyle = `rgba(${badgeCol},0.9)`; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = `rgb(${badgeCol})`; ctx.textAlign = 'center';
    ctx.fillText(badge, x + cardW - bw / 2 - 12, y + 24);
    ctx.textAlign = 'left';
    // Nutzen-Satz
    ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(226,238,255,0.9)';
    wrapText(ctx, benefit, x + 14, y + 46, cardW - 28, 14);
    // Mini-Visualisierung
    draw(x + 14, y + 62);
    ctx.restore();
  };

  // ── U1-Optimierer: € zählt hoch (0 → 3.540) + steigende Balken ──
  card(71, 141, '52,224,138', 'LIVE', '90,235,160', 'U1-Optimierer',
    'Lohnfortzahlung automatisch zurückholen · pay-on-success',
    (bx, by) => {
      const cyc = t % 520; const amt = cyc < 320 ? Math.floor(cyc / 320 * 3540) : 3540;
      ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = '#eafff4'; ctx.textAlign = 'left';
      ctx.fillText('Ø ' + amt.toLocaleString('de-DE') + ' €', bx, by + 20);
      ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(150,235,190,0.85)';
      ctx.fillText('zurückgeholt / jahr', bx, by + 34);
      for (let i = 0; i < 7; i++) {
        const bh = 6 + Math.abs(Math.sin(i * 0.9 + t * 0.05)) * 20 * (Math.min(1, cyc / 320));
        ctx.fillStyle = 'rgba(52,224,138,0.85)';
        ctx.fillRect(bx + 150 + i * 12, by + 32 - bh, 8, bh);
      }
    });

  // ── MatchSuite: Berater ● ── verbindet ── ■ Projekt, „94%" tickt ──
  card(142, 212, '255,184,74', 'IM AUFBAU', '255,190,90', 'MatchSuite',
    'Berater trifft Projekt — passendes Match statt langer Suche',
    (bx, by) => {
      const prog = Math.min(1, (t % 300) / 190);
      const ax = bx + 12, ay = by + 22, ex = bx + cardW - 40, ey = by + 22;
      ctx.strokeStyle = 'rgba(255,184,74,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (ex - ax) * prog, ay); ctx.stroke();
      ctx.fillStyle = '#5aa0ff'; ctx.beginPath(); ctx.arc(ax, ay, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5ade96'; ctx.fillRect(ex - 8, ey - 8, 16, 16);
      ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#ffe7bd'; ctx.textAlign = 'center';
      ctx.fillText(Math.floor(prog * 94) + '%', (ax + ex) / 2, ay - 12);
      ctx.textAlign = 'left'; ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(255,205,140,0.8)';
      ctx.fillText('berater', ax - 6, ay + 24); ctx.fillText('projekt', ex - 18, ey + 24);
    });

  // ── GKV-Vergleich: zwei Kassen-Balken füllen sich + Häkchen ──
  // Ende bei 262 (statt 283): vor der Legacy-Boss-/Kampfzone (~col 265+) sauber
  // ausblenden, damit das GO-LIVE-Finale (Reveal + Boss-Namenstafel) das obere
  // Band allein bespielt und keine drei Textebenen kollidieren.
  card(213, 262, '127,208,255', 'IN PLANUNG', '150,215,255', 'GKV-Vergleich',
    'Gesetzliche Kassen fair & transparent vergleichen',
    (bx, by) => {
      const f = Math.min(1, (t % 320) / 200);
      const rows: [string, number][] = [['Kasse A', 0.82], ['Kasse B', 0.58]];
      for (let i = 0; i < rows.length; i++) {
        const ry = by + 6 + i * 22;
        ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(210,236,255,0.9)'; ctx.textAlign = 'left';
        ctx.fillText(rows[i][0], bx, ry + 8);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(bx + 56, ry, 150, 10);
        ctx.fillStyle = 'rgba(127,208,255,0.9)'; ctx.fillRect(bx + 56, ry, 150 * rows[i][1] * f, 10);
      }
      ctx.fillStyle = '#7fd0ff'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText('✓ fair & transparent', bx, by + 58);
    });
}

// Bluefield Etappe C: U1-Optimierer-SEKTION als vollflächige, immersive Welt
// (Sektion ②, cols 71–141) — man bewegt sich sichtbar „im U1-Optimierer".
// Harter Cut: die Kulisse ist auf die Sektion geclippt und ersetzt dort den
// Himmel komplett. Inhalte nach u1-optimierer.de: U1-Rechner/Erstattung mit
// Slidern und Balken, Krankenkassen-Kacheln, dichter Euro-Strom („Geld zurück").
// U1-CI: Blau #1e4fd8 + Ersparnis-Grün. Der begehbare Boden (Wiese) bleibt.
function drawBluefieldU1Scene(this: Renderer, camera: Camera) {
  const T = TILE_SIZE;
  const x0 = 71 * T - camera.x, x1 = 141 * T - camera.x;
  const W = this.viewportW, H = this.viewportH;
  if (x1 < 0 || x0 > W) return;
  const ctx = this.ctx;
  const t = this.time;
  const low = this.quality === 'low';
  const groundY = 13 * T - camera.y;
  const sx = (col: number) => col * T - camera.x;
  ctx.save();
  // Harter Cut: alles Folgende nur innerhalb der U1-Sektion, oberhalb des Bodens.
  ctx.beginPath();
  ctx.rect(x0, 0, x1 - x0, Math.max(0, groundY));
  ctx.clip();

  // ── Rückwand: hell/weiß (u1-optimierer.de-Look), sauber & professionell ──
  const wall = ctx.createLinearGradient(0, 0, 0, groundY);
  wall.addColorStop(0, '#ffffff');
  wall.addColorStop(0.5, '#f1f6ff');
  wall.addColorStop(1, '#e4eefb');
  ctx.fillStyle = wall;
  ctx.fillRect(x0, 0, x1 - x0, groundY);
  // Ferne Parallax-Ebene: helle Bürotürme am Horizont (Tiefe).
  drawBluefieldFarLayer.call(this, x0, x1, groundY, camera.x, '#d3ddef', 0.4, H * 0.16, H * 0.42, 5, 1.3, 'rgba(255,255,255,0.6)');
  // Mittlere Parallax-Ebene: größere, klarere Türme (näher, schneller).
  drawBluefieldFarLayer.call(this, x0, x1, groundY, camera.x, '#bcccea', 0.62, H * 0.22, H * 0.5, 7, 5.7, 'rgba(255,255,255,0.5)');
  // „Unser Produkt, der U1-Optimierer." weit im Hintergrund — blass, groß,
  // über die ganze Sektion sichtbar (sanftes Ein-/Ausfaden, leichte Tiefe-Drift).
  {
    const camMid = camera.x + W * 0.5;
    const dIn = (camMid - 71 * T) / (12 * T), dOut = (141 * T - camMid) / (12 * T);
    const ca = Math.max(0, Math.min(1, dIn, dOut));
    if (ca > 0.01) {
      const drift = ((camMid - 71 * T) / (70 * T)) * -50;
      const pcx = W * 0.5 + drift, pcy = H * 0.54;     // v437: klein & tief, kein Riesen-Wasserzeichen
      ctx.save(); ctx.globalAlpha = ca; ctx.textAlign = 'center';
      // Großes Wasserzeichen entfernt (v437) — nur ein dezenter Claim bleibt.
      ctx.font = '14px sans-serif'; ctx.fillStyle = 'rgba(120,150,220,0.28)';
      ctx.fillText('Unser Produkt · der U1-Optimierer', pcx, pcy);
      ctx.restore();
    }
  }
  ctx.strokeStyle = 'rgba(30,79,216,0.07)'; ctx.lineWidth = 1;
  const gp = (camera.x * 0.5) % 40;
  for (let gx = x0 - gp; gx < x1; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, groundY); ctx.stroke(); }
  for (let gy = 0; gy < groundY; gy += 40) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke(); }

  // ── Große U1-Dashboards (Rechner / Erstattung / Umlage) ──
  const dashboards = [
    { col: 80,  title: '// u1-rechner',    big: 'Ø 3.540 €' },
    { col: 106, title: '// erstattung',    big: 'bis 100%' },
    { col: 128, title: '// u1-umlage',     big: '2.500–8.000 €' },
  ];
  for (const d of dashboards) {
    const dx = sx(d.col), dy = H * 0.15, dw = 138, dh = 96;
    if (dx + dw < x0 || dx > x1) continue;
    ctx.fillStyle = 'rgba(8,18,50,0.92)';
    ctx.beginPath(); ctx.roundRect(dx, dy, dw, dh, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(dx, dy, dw, dh, 8); ctx.stroke();
    ctx.fillStyle = 'rgba(30,79,216,0.92)'; ctx.fillRect(dx + 1, dy + 1, dw - 2, 16);
    ctx.fillStyle = '#dfeaff'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(d.title, dx + 7, dy + 12);
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.15 + d.col);
    ctx.fillStyle = `rgba(90,240,150,${pulse})`;
    ctx.beginPath(); ctx.arc(dx + dw - 10, dy + 9, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eafff2'; ctx.font = 'bold 18px sans-serif';
    ctx.fillText(d.big, dx + 10, dy + 42);
    // Slider
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(dx + 10, dy + 54, dw - 62, 5);
    const kn = (0.5 + 0.4 * Math.sin(t * 0.03 + d.col)) * (dw - 62);
    ctx.fillStyle = '#5ade96'; ctx.fillRect(dx + 10, dy + 54, kn, 5);
    ctx.beginPath(); ctx.arc(dx + 10 + kn, dy + 56, 5, 0, Math.PI * 2); ctx.fill();
    // Balken
    const bB = dy + dh - 9;
    for (let i = 0; i < 5; i++) {
      const bh = (9 + i * 4) * (0.8 + 0.2 * Math.sin(t * 0.05 + i));
      const g = ctx.createLinearGradient(0, bB - bh, 0, bB);
      g.addColorStop(0, '#5ade96'); g.addColorStop(1, '#1e7d48');
      ctx.fillStyle = g; ctx.fillRect(dx + dw - 66 + i * 11, bB - bh, 8, bh);
    }
  }

  // ── Krankenkassen-Kacheln (generisch) ──
  const kkCols = [92, 100, 118, 134];
  for (const kc of kkCols) {
    const kx = sx(kc), ky = H * 0.46;
    if (kx + 60 < x0 || kx > x1) continue;
    ctx.fillStyle = 'rgba(248,251,255,0.98)';
    ctx.beginPath(); ctx.roundRect(kx, ky, 60, 36, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(30,79,216,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#1e4fd8'; ctx.fillRect(kx, ky, 60, 9);
    ctx.fillStyle = 'rgba(30,79,216,0.9)'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('KRANKENKASSE', kx + 5, ky + 22);
    ctx.fillStyle = 'rgba(30,79,216,0.55)'; ctx.font = '7px monospace';
    ctx.fillText('u1-satz · beitrag', kx + 5, ky + 31);
  }

  // ── Dichter Euro-Strom („Geld zurück") ──
  const euN = low ? 10 : 22;
  for (let i = 0; i < euN; i++) {
    const seed = i * 41.7;
    const ecol = 72 + ((i * 3.1) % 68);
    const ex = sx(ecol);
    if (ex < x0 - 20 || ex > x1 + 20) continue;
    const span = Math.max(60, groundY * 0.8);
    const rise = (t * 0.6 + i * 33) % span;
    const a = Math.max(0, 1 - rise / span) * 0.6;
    ctx.fillStyle = `rgba(24,150,88,${a})`;
    ctx.font = `bold ${11 + (i % 3) * 3}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('€', ex + Math.sin(t * 0.03 + seed) * 10, groundY * 0.92 - rise);
  }

  // ── Excel-/Umlage-Tabellenblätter an der Wand ──
  for (const scv of [76, 122]) {
    const shx = sx(scv), shy = H * 0.31;
    if (shx + 52 < x0 || shx > x1) continue;
    ctx.fillStyle = 'rgba(250,252,255,0.98)';
    ctx.beginPath(); ctx.roundRect(shx, shy, 52, 66, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(30,79,216,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#1e7d48'; ctx.fillRect(shx, shy, 52, 7);
    ctx.strokeStyle = 'rgba(30,79,216,0.22)'; ctx.lineWidth = 1;
    for (let r = 0; r < 7; r++) { ctx.beginPath(); ctx.moveTo(shx + 3, shy + 12 + r * 7.4); ctx.lineTo(shx + 49, shy + 12 + r * 7.4); ctx.stroke(); }
    for (let c = 1; c < 3; c++) { ctx.beginPath(); ctx.moveTo(shx + 4 + c * 15, shy + 9); ctx.lineTo(shx + 4 + c * 15, shy + 63); ctx.stroke(); }
    ctx.fillStyle = 'rgba(30,79,216,0.6)'; ctx.font = '5px monospace'; ctx.textAlign = 'left';
    const cells = ['842', '1.203', '560', '935', '+u1', '∑'];
    for (let r = 0; r < 6; r++) ctx.fillText(cells[r], shx + 5, shy + 18 + r * 7.4);
  }

  // ── Erstattungs-Donut ──
  const dox = sx(114), doy = H * 0.32, dor = 24;
  if (dox > x0 - 40 && dox < x1 + 40) {
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(30,79,216,0.12)';
    ctx.beginPath(); ctx.arc(dox, doy, dor, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#5ade96'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(dox, doy, dor, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.72); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#1e4fd8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('72%', dox, doy + 4);
    ctx.fillStyle = 'rgba(30,79,216,0.65)'; ctx.font = '7px monospace';
    ctx.fillText('erstattet', dox, doy + dor + 12);
  }

  // ── Vordergrund: große Server-/Rechner-Terminals am Boden ──
  for (const tc of [84, 112, 132]) {
    const tx = sx(tc), th = 80, ty = groundY - th;
    if (tx + 44 < x0 || tx > x1) continue;
    ctx.fillStyle = 'rgba(6,14,38,0.96)';
    ctx.beginPath(); ctx.roundRect(tx, ty, 44, th, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(90,160,255,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(tx, ty, 44, th, 4); ctx.stroke();
    // Bildschirm mit U1-Sparkurve
    ctx.fillStyle = 'rgba(18,44,120,0.95)'; ctx.fillRect(tx + 5, ty + 6, 34, 24);
    ctx.strokeStyle = '#5ade96'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const lx = tx + 6 + k * 5.3;
      const ly = ty + 26 - (Math.sin(k * 0.8 + t * 0.05) * 0.5 + 0.5) * 15;
      if (k === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
    }
    ctx.stroke();
    // LED-Reihen
    for (let r = 0; r < 4; r++) {
      ctx.fillStyle = (r + Math.floor(t * 0.1)) % 2 ? 'rgba(90,222,150,0.9)' : 'rgba(90,160,255,0.55)';
      ctx.fillRect(tx + 6, ty + 38 + r * 8, 32, 4);
    }
  }

  ctx.restore();
}

// Bluefield Etappe B: Sektions-Farbstimmung. Vier Abschnitte (Labor, U1,
// MatchSuite, Finale) mit sanftem Cross-Fade nach Kameraposition — dieselbe
// Mechanik wie das Schul-Level. Ein Overlay-Gradient tönt den oberen Himmel;
// unten bleibt die blaue Wiese frei. Dazu ein dezentes Mono-Sektions-Label.
function drawBluefieldSectionTint(this: Renderer, camera: Camera) {
  const T = TILE_SIZE;
  // v461: Farbstimmung SCHNEIDET an der Türkante — links noch alte Welt, rechts
  // schon die neue. Statt weichem Cross-Fade wird jede Sektion auf ihren Spalten-
  // bereich in Bildschirm-x geclippt gemalt; die Türgrafik verdeckt die Naht.
  const W = this.viewportW, H = this.viewportH;
  const camMid = camera.x + W * 0.5;
  // Pro Sektion: Spalten-Grenzen + kräftigere, eigenständige Stimmung (weg von
  // der blauen Suppe): Labor kühl-hell, U1 grün (Erfolg), MatchSuite amber
  // (Aufbau), Finale kühles Blau.
  const sections = [
    { c0: -1e9, c1: 71, tint: '170,205,255', a: 0.05, label: '// blaue wiese · willkommen' },
    { c0: 71, c1: 142, tint: '30,165,115', a: 0.20, label: '// u1-optimierer · live' },
    { c0: 142, c1: 213, tint: '170,120,34', a: 0.22, label: '// matchsuite · im aufbau' },
    { c0: 213, c1: 1e9, tint: '80,145,235', a: 0.18, label: '// gkv-vergleich · finale' },
  ];
  const ctx = this.ctx;
  for (const s of sections) {
    const x0 = Math.max(0, s.c0 * T - camera.x);
    const x1 = Math.min(W, s.c1 * T - camera.x);
    if (x1 <= x0) continue;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(${s.tint},${s.a.toFixed(3)})`);
    g.addColorStop(0.6, `rgba(${s.tint},${(s.a * 0.35).toFixed(3)})`);
    g.addColorStop(1, `rgba(${s.tint},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, x1 - x0, H);
  }
  // aktuelles Sektions-Label (nach Bildmitte)
  let cur = sections[0];
  const midCol = camMid / T;
  for (const s of sections) if (midCol >= s.c0 && midCol < s.c1) { cur = s; break; }
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(240,248,255,0.92)';
  ctx.textAlign = 'left';
  ctx.fillText(cur.label, 12, 20);
  ctx.restore();
}

// Bluefield: Markttest-Abgründe optisch zuspitzen — „was durchfällt, fällt// durch". Weltfeste Behandlung der drei Lücken (cols 76–78, 87–89, 99–101):
// dunkler Tiefensog, pulsierende rote Warnkanten, versinkende durchgefallene
// Ideen (durchgestrichene Glühbirne) und aufsteigender Gefahren-Dunst.
function drawBluefieldMarkttest(this: Renderer, camX: number, camY: number, VW: number, VH: number) {
  const ctx = this.ctx;
  const t = this.time;
  const low = this.quality === 'low';
  const T = TILE_SIZE;
  const groundY = 13 * T - camY;            // Bodenkante (ground=13)
  const gaps: [number, number][] = [[220, 223], [231, 234], [242, 245]];
  ctx.save();
  for (let gi = 0; gi < gaps.length; gi++) {
    const x0 = gaps[gi][0] * T - camX;
    const x1 = gaps[gi][1] * T - camX;
    if (x1 < -20 || x0 > VW + 20) continue;
    const gw = x1 - x0;
    // 1. dunkler Tiefensog in der Lücke
    const g = ctx.createLinearGradient(0, groundY, 0, groundY + 220);
    g.addColorStop(0, 'rgba(30,12,32,0)');
    g.addColorStop(0.35, 'rgba(70,20,44,0.55)');
    g.addColorStop(1, 'rgba(12,6,18,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, groundY, gw, Math.max(0, VH - groundY));
    // 2. pulsierende rote Warnkanten
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.15 + gi);
    ctx.fillStyle = `rgba(255,90,70,${0.4 + pulse * 0.3})`;
    ctx.fillRect(x0 - 2, groundY, 3, 12);
    ctx.fillRect(x1 - 1, groundY, 3, 12);
    // 3. versinkende „durchgefallene Idee": durchgestrichene Glühbirne
    const fall = (t * 0.6 + gi * 80) % 170;
    const bx = x0 + gw * (0.4 + 0.25 * Math.sin(gi * 2));
    const by = groundY + 12 + fall * 0.55;
    const a = Math.max(0, 1 - fall / 170) * 0.85;
    if (a > 0.03) {
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffcf5a';
      ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9aa3b5';
      ctx.fillRect(bx - 2, by + 3.5, 4, 3);
      ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(bx - 5.5, by - 5.5); ctx.lineTo(bx + 5.5, by + 5.5); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 4. aufsteigender Gefahren-Dunst
    if (!low) {
      for (let i = 0; i < 3; i++) {
        const rise = (t * 0.5 + i * 55 + gi * 30) % 120;
        const py = groundY + 44 - rise * 0.3;
        const px = x0 + gw * (0.2 + 0.3 * i) + Math.sin(t * 0.03 + i) * 6;
        const da = Math.max(0, 1 - rise / 120) * 0.22;
        ctx.fillStyle = `rgba(255,80,60,${da})`;
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

// Bluefield F5: Ambient — aufsteigende Ideen-Pollen + driftende Schmetterlinge.
function drawBluefieldAmbient(this: Renderer, camX: number, camY: number, VW: number, VH: number) {
  const ctx = this.ctx;
  const t = this.time;
  const low = this.quality === 'low';
  drawBluefieldMarkttest.call(this, camX, camY, VW, VH);
  drawBluefieldDoorFronts.call(this, camX, camY, VW, VH);
  // Boss-Tor-Energiewand (solange der Boss lebt) — überdeckt die Barriere-Säule.
  if (this.bossGateActive) {
    const T = TILE_SIZE;
    const gx = (this.bossGateCol + 0.5) * T - camX;
    if (gx > -30 && gx < VW + 30) {
      const gY = 13 * T - camY, top = this.bossGateTop * T - camY, wallW = 34;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.15);
      ctx.save();
      const g = ctx.createLinearGradient(gx - wallW / 2, 0, gx + wallW / 2, 0);
      g.addColorStop(0, `rgba(110,170,255,${0.25 + pulse * 0.2})`);
      g.addColorStop(0.5, `rgba(180,220,255,${0.55 + pulse * 0.3})`);
      g.addColorStop(1, `rgba(110,170,255,${0.25 + pulse * 0.2})`);
      ctx.fillStyle = g;
      ctx.fillRect(gx - wallW / 2, top, wallW, gY - top);
      ctx.fillStyle = 'rgba(60,110,220,0.9)';
      ctx.fillRect(gx - wallW / 2 - 3, top, 3, gY - top);
      ctx.fillRect(gx + wallW / 2, top, 3, gY - top);
      ctx.strokeStyle = `rgba(225,240,255,${0.4 + pulse * 0.3})`; ctx.lineWidth = 1;
      for (let ly = top + ((t * 2) % 12); ly < gY; ly += 12) {
        ctx.beginPath(); ctx.moveTo(gx - wallW / 2, ly); ctx.lineTo(gx + wallW / 2, ly); ctx.stroke();
      }
      const my = (top + gY) / 2;
      ctx.strokeStyle = '#eaf1ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gx, my - 4, 5, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#eaf1ff'; ctx.fillRect(gx - 6, my, 12, 10);
      ctx.restore();
    }
  }
  ctx.save();
  const pollenN = low ? 6 : 14;
  for (let i = 0; i < pollenN; i++) {
    const seed = i * 53.13;
    const px = (Math.sin(seed) * 0.5 + 0.5) * VW;
    const rise = (t * 0.4 + i * 40) % (VH + 40);
    const py = VH - rise;
    const drift = Math.sin(t * 0.02 + i) * 10;
    const a = 0.15 + 0.25 * (1 - rise / (VH + 40));
    ctx.fillStyle = `rgba(180,220,255,${a})`;
    ctx.beginPath(); ctx.arc(px + drift, py, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  const flutter = low ? 2 : 3;
  for (let i = 0; i < flutter; i++) {
    const seed = i * 97.3;
    const bx = (Math.sin(t * 0.006 + seed) * 0.5 + 0.5) * VW;
    const by = VH * (0.25 + 0.4 * (Math.cos(t * 0.008 + seed) * 0.5 + 0.5));
    const flap = Math.sin(t * 0.4 + i) * 0.6 + 0.7;
    drawBfButterfly(ctx, bx, by, flap, ['#6b9bf5', '#c9d8ff', '#ffe680'][i % 3]);
  }
  ctx.restore();
}

// Vordergrund-Wärme für die Drachenhöhle (Welt 16). Läuft NACH Tiles/Figur —
// warmes Lava-Auflicht am Boden, glühende Lava-Nähte und flackernde Wandfackeln.
// Verwandelt die kühl-grüne Höhle in ein warmes „Drachen-Lava-Lair".
function drawDragonLairForeground(this: Renderer, camX: number, VW: number, VH: number) {
  const ctx = this.ctx;
  const W = VW, H = VH, t = this.time;

  // A) Warmes Lava-Auflicht vom Boden (additive Glut, beleuchtet unteres Bild).
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.85 + 0.15 * Math.sin(t * 0.04);
  const up = ctx.createLinearGradient(0, H, 0, H * 0.52);
  up.addColorStop(0, `rgba(255,110,40,${0.20 * pulse})`);
  up.addColorStop(0.45, `rgba(255,90,30,${0.07 * pulse})`);
  up.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = up;
  ctx.fillRect(0, H * 0.5, W, H * 0.5);

  // B) Glühende Lava-Nähte am Boden — helle warme Flecken, Boden-Parallax.
  // Perf-Paket 3: Anzahl (je ein radialer Gradient/Frame) an Grafikstufe koppeln.
  const seamN = this.quality === 'high' ? 9 : this.quality === 'mid' ? 5 : 3;
  const seamSpan = W * 1.4;
  for (let i = 0; i < seamN; i++) {
    const bx = pseudoRandom(i * 71 + 5) * seamSpan;
    const sx = ((bx - camX * 0.95) % seamSpan + seamSpan) % seamSpan;
    if (sx < -40 || sx > W + 40) continue;
    const sy = H * (0.9 + pseudoRandom(i * 53) * 0.06);
    const fl = 0.5 + 0.5 * Math.sin(t * 0.08 + i * 1.7);
    const r = 16 + pseudoRandom(i * 149) * 22;
    // Perf-Paket 2: gebackene Glow-Disc statt je Frame neuer Gradient.
    // Perf-Paket 4: additive=false — der Kontext ist bereits 'lighter' (Abschnitt A),
    // spart den redundanten Composite-Zustandswechsel pro Naht.
    drawGlowDisc(ctx, getGlowDisc(128, 255, 185, 75, 1), sx, sy, r, r, 0.32 * fl, false);
  }
  ctx.restore();

  // C) Wandfackeln — welt-verankert, an dunklen Fels-Konsolen montiert, mit
  //    flackernder dreischichtiger Flamme und warmem Lichtkegel.
  const torchGap = 520;
  const first = Math.floor((camX - 140) / torchGap) * torchGap;
  for (let wx = first; wx < camX + W + 140; wx += torchGap) {
    const idx = Math.round(wx / torchGap);
    const sx = wx - camX;
    if (sx < -30 || sx > W + 30) continue;
    const ty = H * (0.30 + (idx % 2) * 0.07);
    const flick = 0.75 + 0.25 * Math.sin(t * 0.3 + idx * 2.3) + 0.08 * Math.sin(t * 0.9 + idx);

    // warmer Lichtkegel (additive)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = 72 + 12 * flick;
    // Perf-Paket 2: gebackene Glow-Disc statt je Frame neuer Gradient.
    // Perf-Paket 4: additive=false — Kontext ist bereits 'lighter' (Fackel-save),
    // spart den redundanten Composite-Zustandswechsel pro Fackel.
    drawGlowDisc(ctx, getGlowDisc(128, 255, 165, 65, 1), sx, ty, gr, gr, 0.28 * flick, false);
    ctx.restore();

    ctx.save();
    // Fels-Konsole (dunkel) hinter der Fackel, damit sie „montiert" wirkt.
    ctx.fillStyle = 'rgba(7,13,9,0.92)';
    ctx.beginPath(); ctx.ellipse(sx, ty + 4, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
    // Stiel + Schale.
    ctx.fillStyle = '#2a1c12'; ctx.fillRect(sx - 2, ty, 4, 17);
    ctx.fillStyle = '#3a281a';
    ctx.beginPath(); ctx.ellipse(sx, ty, 6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    // Flamme (drei Schichten, flackernde Höhe).
    const fh = 17 + 6 * flick;
    const drawFlame = (col: string, s: number) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(sx - 4 * s, ty - 2);
      ctx.quadraticCurveTo(sx - 3 * s, ty - fh * 0.5 * s, sx, ty - fh * s);
      ctx.quadraticCurveTo(sx + 3 * s, ty - fh * 0.5 * s, sx + 4 * s, ty - 2);
      ctx.quadraticCurveTo(sx, ty + 1, sx - 4 * s, ty - 2);
      ctx.closePath(); ctx.fill();
    };
    drawFlame('rgba(255,90,30,0.9)', 1.0);
    drawFlame('rgba(255,165,55,0.95)', 0.68);
    drawFlame('rgba(255,232,150,0.95)', 0.38);
    ctx.restore();
  }
}

export const backgroundsMethods
 = {
  clearBgSpriteCaches,
  drawDragonLairForeground,
  drawBluefieldForeground,
  drawBluefieldAmbient,
  drawBackground,
  drawGroundFog,
  drawTrampolineBackground,
  drawSchoolBackground,
  drawGymBackground,
  drawPlushBackground,
  drawBeachPalm,
  drawBeachProps,
  drawCoral,
  drawPuffyCloud,
  drawSpacePlanet,
  drawAerialHaze,
  drawCaveBackground,
  drawSkyThemeBackground,
  drawStars,
  drawSun,
  buildCloudCache,
  drawClouds,
  drawBeachBackground,
  drawAustraliaBackground,
  drawVolcanoBackground,
  drawIceBackground,
  drawCastleBackground,
  drawUnderwaterBackground,
  drawSpaceBackground,
};
