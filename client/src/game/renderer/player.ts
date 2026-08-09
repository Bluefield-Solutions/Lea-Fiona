import type { Renderer } from '../renderer.ts';

// Maps the current player state to one of the 12 artwork frames.
// Frame indices (0-based): 0 stand · 1 stand→runA · 2 runA · 3 runA→runB ·
// 4 runB · 5 runB→jump · 6 absprung · 7 absprung→luft · 8 in der luft ·
// 9 luft→landung · 10 landung · 11 landung→stand.
type FramePick = { img: HTMLImageElement | null; next: HTMLImageElement | null; blend: number };

// Weiche Schritt-Überblendung: blendet das aktuelle Lauf-Frame über die letzte
// Zone des Intervalls sanft ins nächste, damit die Beine runder ineinander
// übergehen statt hart umzuspringen. Außerhalb der Zone ist blend=0 (klares Bild).
function walkBlend(frames: (HTMLImageElement | null)[], cycle: number[], velX: number, frame: number): FramePick {
  const speed = 0.031 * Math.abs(velX);
  const pos = frame * speed;
  const base = Math.floor(pos);
  const i0 = base % cycle.length;
  const i1 = (base + 1) % cycle.length;
  const frac = pos - base;
  const BZ = 0.4; // Überblend-Zone am Ende des Intervalls
  let blend = 0;
  if (frac > 1 - BZ) { const t = (frac - (1 - BZ)) / BZ; blend = t * t * (3 - 2 * t); }
  return { img: frames[cycle[i0]] ?? frames[0], next: frames[cycle[i1]] ?? null, blend };
}

function pickPlayerFrame(
  frames: (HTMLImageElement | null)[],
  s: { isJumping: boolean; isRunning: boolean; velY: number; isDucking: boolean; velX: number; landingFrame: number; frame: number },
  isLea = false,
): FramePick {
  const solid = (i: number): FramePick => ({ img: frames[i] ?? frames[0], next: null, blend: 0 });
  let idx: number;
  if (isLea) {
    // Neues Lea-Set (8 Posen): 0=Stand 1=LaufA 2=ZwischenA 3=LaufB
    // 4=ZwischenB 5=Absprung 6=Flugphase 7=Landung. Ducken läuft über das
    // eigene Duck-Sprite (realDuckSprite) und erreicht diese Funktion nicht.
    if (s.isJumping) {
      if (s.velY < -1.5) idx = 5;             // Absprung (steigend)
      else if (s.velY < 3.5) idx = 6;         // Flugphase (Scheitel + früher Sinkflug)
      else idx = 7;                           // schneller Sinkflug → Landungs-Pose vorbereiten
    } else if (s.landingFrame > 0) {
      idx = 7;                                // Landung (Touchdown)
    } else if (Math.abs(s.velX) > 0.6) {
      // Voller 4-Phasen-Laufzyklus, Schritt-Takt proportional zum Tempo, mit
      // weicher Überblendung zwischen den Phasen.
      return walkBlend(frames, [1, 2, 3, 4], s.velX, s.frame);
    } else {
      idx = 0;                                // Stand
    }
    return solid(idx);
  }

  // ── Fiona (klein): 12-Frame-Mapping, gleiches langsameres Lauf-Tempo
  //     und dieselbe Sprung-Staffelung wie Lea ──────────────────────────
  if (s.isDucking) {
    idx = 0; // stand pose — the crouch comes from a vertical squash, not a smaller sprite
  } else if (s.isJumping) {
    if (s.velY < -1.5) idx = 6;            // Absprung (steigend)
    else if (s.velY < 3.5) idx = 8;        // Flugphase (Scheitel + früher Sinkflug)
    else idx = 10;                         // schneller Sinkflug → Landungs-Pose vorbereiten
  } else if (s.landingFrame > 0) {
    idx = 10;                              // Landung (Touchdown)
  } else if (Math.abs(s.velX) > 0.6) {
    // Run cycle ping-pong runA ↔ between ↔ runB ↔ between mit weicher Überblendung.
    return walkBlend(frames, [2, 3, 4, 3], s.velX, s.frame);
  } else {
    idx = 0;                               // idle stand
  }
  return solid(idx);
}

function drawPlayer(
  this: Renderer,
  x: number, y: number, width: number, height: number,
  direction: number, frame: number,
  isJumping: boolean, isRunning: boolean, velY: number,
  isDead: boolean, invincibleTimer: number,
  isDucking = false, velX = 0,
  // Mario-feel pose flags. Each is rendered as an additive transform on
  // top of the existing walk/run/duck logic — none of them swap sprites,
  // they just modify squash/tilt + an optional shimmer overlay.
  isSkidding = false, isSliding = false, isWallSliding = false,
  isPCharged = false,
  // New ability/power-up flags.
  starTimer = 0, starTotal = 1, isGroundPounding = false,
  // Landing-squash window — non-zero just after touching down. Engine sets
  // 12 for hard falls, 6 for normal hops. Renderer interprets >6 as hard.
  landingFrame = 0,
  // Power-Größe: false → klein (Grundform), true → groß (Power-Up).
  isPoweredUp = false,
  // Superkraft-Move: aktiver Countdown + Gesamtdauer (0 = inaktiv).
  superMoveTimer = 0, superMoveTotal = 1,
  // Charakterwahl: true → Lea-Sprite, false → Fiona-Sprite. Unabhängig von der
  // Power-Größe (isPoweredUp) — die gewählte Figur bleibt klein wie groß dieselbe.
  useLeaSprite = false,
  // Feuerblume-Zustand (Plüsch-Welt: entscheidet Elefant-Form + Wasserspritzer).
  hasFire = false,
) {
  const ctx = this.ctx;

  // Soft ground shadow — drawn FIRST in world coords so it is unaffected
  // by sprite mirroring and never flickers along with invincibility
  // alpha. Skipped while dead so the death tumble doesn't drag a shadow
  // around the screen.
  if (!isDead) {
    // Grafik-Feinschliff: Spieler-Schatten in der Weltfarbe tönen (wie die
    // Gegner-Schatten) statt neutral-schwarz — erdet die Figur in der Szene.
    const accShadow = this.getThemeAccent().shadow;
    const mm = accShadow.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    const shadowRGB = mm ? `${mm[1]},${mm[2]},${mm[3]}` : '0,0,0';
    drawGroundShadow(ctx, x + width / 2, y + height, width, isJumping, velY, shadowRGB);
  }

  // Star aura — drawn UNDER the sprite so it reads as a halo.
  // Last STAR_FADE_FRAMES (90) it flickers fast to telegraph wear-off.
  if (starTimer > 0 && !isDead) {
    const fading = starTimer < 90;
    const alpha = fading ? (Math.floor(this.time / 3) % 2 === 0 ? 0.85 : 0.35) : 0.85;
    this.drawStarAura(x, y, width, height, this.time, alpha);
  }

  // Salto-„Wusch": goldene Funken-Spur, die der Drehung nachläuft (rein visuell,
  // in Screen-Koordinaten, damit sie nicht mitrotiert). Nur während des Saltos.
  if (this.playerFlipAngle && !isDead) {
    const cx0 = x + width / 2, cy0 = y + height / 2;
    const r = height * 0.74;
    const a = this.playerFlipAngle;
    const dir = a >= 0 ? 1 : -1;
    ctx.save();
    // Weicher goldener Schweif-Bogen hinter der Drehung.
    ctx.strokeStyle = 'rgba(255,232,150,0.4)';
    ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx0, cy0, r, dir > 0 ? a - 1.5 : a - 0.1, dir > 0 ? a - 0.1 : a + 1.5, dir < 0);
    ctx.stroke();
    // Funken-Sternchen entlang des Schweifs, nach hinten ausblendend.
    for (let k = 1; k <= 5; k++) {
      const ta = a - dir * k * 0.3;
      const px = cx0 + Math.cos(ta) * r, py = cy0 + Math.sin(ta) * r;
      const al = 0.8 * (1 - k / 6);
      const rr = 3.8 - k * 0.5;
      ctx.fillStyle = `rgba(255,236,150,${al})`;
      ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${al * 0.85})`;
      ctx.beginPath(); ctx.arc(px, py, rr * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Tarzan-Absprung-„Wusch": goldene Bewegungs-Spur hinter der Figur, die kurz
  // nach dem Loslassen eines Schwingseils aufblitzt und ausklingt (Screen-Koord).
  if (this.playerVineFling > 0 && !isDead) {
    const f = this.playerVineFling;               // 1 → 0
    const dir = this.playerVineFlingDir < 0 ? -1 : 1;
    const cx0 = x + width / 2, cy0 = y + height / 2;
    ctx.save();
    ctx.lineCap = 'round';
    // Drei nachlaufende Speed-Bögen, nach hinten schwächer.
    for (let k = 1; k <= 3; k++) {
      const back = -dir * (10 + k * 9);
      const al = 0.42 * f * (1 - (k - 1) / 3);
      ctx.strokeStyle = `rgba(255,228,138,${al})`;
      ctx.lineWidth = 4.5 - k;
      ctx.beginPath();
      ctx.moveTo(cx0 + back, cy0 - height * 0.28);
      ctx.quadraticCurveTo(cx0 + back - dir * 6, cy0, cx0 + back, cy0 + height * 0.28);
      ctx.stroke();
    }
    // Ein paar goldene Funken im Schweif.
    for (let k = 1; k <= 4; k++) {
      const sx = cx0 - dir * (8 + k * 7);
      const sy = cy0 + (k % 2 === 0 ? -1 : 1) * (height * 0.12);
      const al = 0.7 * f * (1 - k / 5);
      ctx.fillStyle = `rgba(255,240,170,${al})`;
      ctx.beginPath(); ctx.arc(sx, sy, 2.6 - k * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();

  // Star-mode strobes the sprite tint per-frame for a fast rainbow flash.
  if (starTimer > 0 && !isDead) {
    const hue = (this.time * 24) % 360;
    ctx.shadowColor = `hsla(${hue}, 100%, 65%, 0.95)`;
    ctx.shadowBlur = 6;
  }

  if (invincibleTimer > 0 && Math.floor(this.time / 3) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  if (isDead) {
    if (this.currentTheme === 'plush') {
      drawPlushDead(ctx, x, y, width, height, this.time);
    } else {
      this.drawDeadPlayer(ctx, x, y, width, height, useLeaSprite);
    }
    ctx.restore();
    return;
  }

  ctx.translate(x + width / 2, y + height / 2);
  // Salto (Trampolin): volle Drehung um den Mittelpunkt, VOR der Spiegelung,
  // damit die Drehrichtung der Bewegung folgt (rein visuell, keine Kollision).
  if (this.playerFlipAngle) ctx.rotate(this.playerFlipAngle);
  if (direction < 0) ctx.scale(-1, 1);
  ctx.translate(-width / 2, -height / 2);

  if (this.currentTheme === 'plush') {
    // Plüsch-Traumland: Fiona ist ein Kuscheltier und wechselt die Form je nach
    // Power-Zustand — klein=Äffchen, groß=Panda, Feuerblume=Elefant.
    const form: PlushForm = hasFire ? 'elephant' : (isPoweredUp ? 'panda' : 'monkey');
    drawPlushCharacter(ctx, width, height, form, {
      frame, isJumping, isRunning, velY, velX, isDucking, time: this.time,
      landingFrame,
      monkeyFrames: this.affeFrames,
      pandaFrames: this.pandaFrames,
      elefantFrames: this.elefantFrames,
    });
  } else {
    this.drawPlayerSprite(
      ctx, 0, 0, width, height, frame, isJumping, isRunning, velY, isDucking, velX,
      isSkidding, isSliding, isWallSliding,
      landingFrame,
      isPoweredUp,
      superMoveTimer, superMoveTotal,
      useLeaSprite,
    );
  }

  ctx.restore();

  // P-meter shimmer: drawn AFTER the sprite, in world coords, so it isn't
  // affected by the local mirror/tilt of the body. A soft yellow ring
  // pulse around the feet that hints "next jump is boosted!".
  if (isPCharged && !isDead) {
    drawPMeterShimmer(ctx, x + width / 2, y + height, width, this.time);
  }
  // Ground-pound trail: thin streaky lines above the player while diving.
  if (isGroundPounding && !isDead) {
    drawPoundTrail(ctx, x + width / 2, y, width, this.time);
  }
  // Suppress unused-var noise (starTotal reserved for future fade ramping).
  void starTotal;
}

function drawPoundTrail(ctx: CanvasRenderingContext2D, cx: number, topY: number, w: number, time: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.85)';
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 4; i++) {
    const off = ((time + i * 4) % 16) - 4;
    const ax = cx - w * 0.4 + (i % 2 === 0 ? 0 : w * 0.8);
    ctx.beginPath();
    ctx.moveTo(ax, topY - 22 - off);
    ctx.lineTo(ax + (i % 2 === 0 ? -2 : 2), topY - 4 - off);
    ctx.stroke();
  }
  // Center burst arrow
  ctx.fillStyle = 'rgba(255, 240, 140, 0.95)';
  ctx.beginPath();
  ctx.moveTo(cx - 4, topY - 8);
  ctx.lineTo(cx + 4, topY - 8);
  ctx.lineTo(cx, topY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPMeterShimmer(ctx: CanvasRenderingContext2D, cx: number, footY: number, w: number, time: number) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.25);
  const rx = (w / 2) * (0.95 + pulse * 0.25);
  const ry = Math.max(2, rx * 0.32);
  ctx.save();
  ctx.translate(cx, footY - 1);
  ctx.scale(1, ry / rx);
  const grad = ctx.createRadialGradient(0, 0, rx * 0.3, 0, 0, rx);
  const a = (0.30 + 0.30 * pulse).toFixed(3);
  grad.addColorStop(0, `rgba(255, 220, 70, ${a})`);
  grad.addColorStop(0.6, `rgba(255, 200, 40, ${(parseFloat(a) * 0.4).toFixed(3)})`);
  grad.addColorStop(1, 'rgba(255, 200, 40, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGroundShadow(ctx: CanvasRenderingContext2D, cx: number, footY: number, w: number, isJumping: boolean, velY: number, rgb = '0,0,0') {
  // Airborne → smaller and fainter; grounded → full size for solid anchor.
  let scale = 1;
  let alpha = 0.32;
  if (isJumping) {
    const air = Math.min(1, Math.abs(velY) * 0.05);
    scale = 1 - air * 0.45;
    alpha = 0.32 - air * 0.20;
  }
  if (alpha <= 0.02) return;

  const rx = (w / 2) * 0.9 * scale;
  const ry = Math.max(2, rx * 0.30);

  ctx.save();
  ctx.translate(cx, footY - 1);
  ctx.scale(1, ry / rx);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0, `rgba(${rgb}, ${alpha.toFixed(3)})`);
  grad.addColorStop(0.55, `rgba(${rgb}, ${(alpha * 0.45).toFixed(3)})`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ensure3DCanvas(this: Renderer, w: number, h: number) {
  // DPR-aware buffer. We render the player into a backing canvas sized
  // at native pixel density so the high-quality bilinear downsample of
  // the source PNG happens at full retina resolution; otherwise the
  // figure looks soft on hi-DPI displays. Clamped at 2× to keep memory
  // sensible on 3× phones.
  const dpr = Math.min(
    2,
    Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1),
  );
  const pad = 4;
  const neededW = Math.ceil((w + pad * 2) * dpr);
  const neededH = Math.ceil((h + pad * 2) * dpr);
  if (
    !this.playerOffscreen ||
    this.playerOffscreen.width < neededW ||
    this.playerOffscreen.height < neededH ||
    this.playerOffDpr !== dpr
  ) {
    this.playerOffscreen = document.createElement('canvas');
    this.playerOffscreen.width = neededW;
    this.playerOffscreen.height = neededH;
    this.playerOffCtx = this.playerOffscreen.getContext('2d')!;
    this.playerOffDpr = dpr;
  }
}

function drawPlayerSprite(
  this: Renderer,
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  frame: number, isJumping: boolean, isRunning: boolean, velY: number,
  isDucking = false, velX = 0,
  // Mario-feel pose flags — see drawPlayer header for details.
  isSkidding = false, isSliding = false, isWallSliding = false,
  landingFrame = 0,
  isPoweredUp = false,
  superMoveTimer = 0, superMoveTotal = 1,
  useLeaSprite = false,
) {
  const useBerater = this.currentTheme === 'bluefield';
  const animFrames = useBerater ? this.beraterFrames : (useLeaSprite ? this.leaFrames : this.fionaFrames);
  // Der Berater hat wie Fiona 12 Frames. Das Lea-Mapping (8 Frames) darf
  // NICHT auf ihn angewendet werden, sonst greifen bei Lauf/Sprung/Landung
  // falsche Posen — auch wenn der Spieler Lea gewählt hatte. Für das
  // Frame-*Mapping* zählt daher das Sprite-Set, nicht die Figurenwahl.
  const spriteIsLea = useBerater ? false : useLeaSprite;
  // Echtes Duck-Sprite je Figur. Beim Ducken wird es gezeichnet statt die
  // Steh-Pose zu stauchen.
  const realDuckSprite = isDucking
    ? (useBerater ? this.beraterDuckArr[0] : (useLeaSprite ? this.leaDuckArr[0] : this.fionaDuckArr[0]))
    : null;
  const usingRealDuck = realDuckSprite != null;
  // Fionas Superkraft (one-leg hop): eine Pose mit deutlich angewinkeltem
  // Bein (f06) liest sich beim Hüpfen viel natürlicher als die steife
  // Steh-Pose. Lea (Rad) behält ihre normale Frame-Auswahl.
  const fionaSuperHop = !spriteIsLea && superMoveTimer > 0;
  let currentImg: HTMLImageElement | null;
  let crossFadeNext: HTMLImageElement | null = null;
  let crossFadeBlend = 0;
  if (usingRealDuck) {
    currentImg = realDuckSprite;
  } else if (fionaSuperHop) {
    currentImg = animFrames[5] ?? animFrames[0];
  } else {
    const pf = pickPlayerFrame(animFrames, { isJumping, isRunning, velY, isDucking, velX, landingFrame, frame }, spriteIsLea);
    currentImg = pf.img;
    crossFadeNext = pf.next;
    crossFadeBlend = pf.blend;
  }
  if (currentImg) {
    ctx.save();

    const isMoving = Math.abs(velX) > 0.6;
    // The 12-frame artwork already carries the run/jump/air/landing poses,
    // so the heavy procedural pose squash/tilt is disabled — only the
    // lighter landing-squash overlay further below still applies.
    const useProceduralPose = false;

    // -----------------------------------------------------------------
    // Liveliness pass: subtle squash + tilt only. We deliberately do
    // NOT translate the whole sprite vertically — feet are anchored at
    // the bbox bottom and the squash/scale happens around that anchor,
    // so the head bobs naturally while the feet stay glued to the
    // ground line. (Earlier versions added a bobY offset which made
    // the player visibly float while running — removed.)
    // -----------------------------------------------------------------
    let squashX = 1;
    let squashY = 1;
    let tilt = 0;
    // Vertical step-hop: lifts the whole sprite up briefly on each
    // foot-strike so walking/running reads as "real stepping" instead of
    // a static body sliding across the floor. Always negative (canvas y
    // goes down → negative = up) and clamped at 0 so the feet never go
    // BELOW the ground line — they only leave it briefly. Used by the
    // walk/run branch only.
    let legHopY = 0;

    // ── Duck: squash, don't shrink ──────────────────────────────────
    // Ducking lowers the hitbox, but rendering the sprite at that smaller
    // height made the whole figure look miniaturised. Instead we keep the
    // full standing height (set on drawH below) and SQUASH it vertically
    // (and widen it a touch) around the foot anchor, so she crouches while
    // keeping her full mass/presence.
    if (isDucking && !usingRealDuck) {
      const fullH = isPoweredUp ? 80 : 68;
      const squeeze = Math.max(0.5, Math.min(1, h / fullH));
      squashY *= squeeze;
      squashX *= 1 + (1 - squeeze) * 0.6;
    }

    // ── Idle: gentle breathing ──────────────────────────────────────
    // A slow rise/fall around the foot anchor so a standing figure feels
    // alive instead of frozen. Deliberately tiny.
    const isIdleStand = !isJumping && !isDucking && !isSliding
      && Math.abs(velX) <= 0.6 && landingFrame <= 0;
    if (isIdleStand) {
      const breathe = Math.sin(frame * 0.06);
      squashX *= 1 + breathe * 0.012;
      squashY *= 1 + breathe * 0.016;
      // Gelegentliche Gewichtsverlagerung: sehr langsames, organisches Wippen
      // um den Fuß-Anker, damit die Figur beim Stehen das Gewicht verlagert
      // statt einzufrieren. Zwei niedrige, nicht-harmonische Frequenzen geben
      // einen unregelmäßigen, lebendigen Rhythmus (Perioden ~8 s und ~22 s).
      const sway = Math.sin(frame * 0.02) * 0.6 + Math.sin(frame * 0.008) * 0.4;
      tilt += sway * 0.05; // max ~2.9° Kippen
    }

    // ── Bewegungs-Neigung (Lean) ────────────────────────────────────
    // Ergänzt die aufrechten Artwork-Frames um Dynamik: Vorwärts beim
    // Laufen/Sprinten, deutlich zurück beim Bremsen. Der Pivot ist der
    // Fuß-Anker; der Mirror in drawPlayer spiegelt den Tilt automatisch
    // für Links-Lauf, sodass die Neigung immer in Bewegungsrichtung zeigt.
    // Das Ziel wird über this.playerLean geglättet, damit An-/Auslaufen
    // weich statt ruckartig wirkt.
    let targetLean = 0;
    if (isSkidding && !isJumping && !isDucking) {
      targetLean = -0.12;                  // Bremsen: Oberkörper lehnt sich zurück
    } else if (!isJumping && !isDucking && !isSliding && isMoving) {
      targetLean = isRunning ? 0.12 : 0.035; // Sprint deutlich stärker, Gehen dezent vorwärts
    }
    this.playerLean += (targetLean - this.playerLean) * 0.18;
    if (Math.abs(this.playerLean) > 0.002) tilt = this.playerLean;

    // ── Sprung: Squash & Stretch + Apex-Float ───────────────────────
    // Beim schnellen Steigen/Fallen streckt sich der Körper vertikal (schlanker)
    // und betont den Bogen; am Scheitel (velY ~ 0) staucht er sich kurz breiter
    // und flacher, sodass die Figur einen Moment in der Luft „hängt" — der
    // klassische Cartoon-Apex, der Sprünge rund und lebendig macht.
    if (isJumping && !usingRealDuck && superMoveTimer <= 0) {
      const av = Math.abs(velY);
      if (av > 1.5) {
        const vstretch = Math.min(0.20, av * 0.016);
        squashY *= 1 + vstretch;
        squashX *= 1 - vstretch * 0.55;
      } else {
        const floatAmt = (1 - av / 1.5) * 0.04;
        squashY *= 1 - floatAmt;
        squashX *= 1 + floatAmt * 0.7;
      }
    }

    if (useProceduralPose) {
    if (isSliding) {
      // Run-Slide pose: very flat, pushed forward — reads as "sliding on
      // her side". No tilt because the body is essentially horizontal.
      squashX = 1.40;
      squashY = 0.55;
    } else if (isDucking) {
      // Crawling read: while creeping forward the head sways more than
      // when fully still, which sells the "stalking under the ceiling"
      // feel. Also a faint vertical bob synced to forward motion so the
      // body subtly hops with each crawled step.
      const moving = Math.abs(velX) > 0.2;
      if (moving) {
        const crawlSpeed = 0.18;
        const crawlPhase = frame * crawlSpeed;
        squashX = 1 + Math.sin(crawlPhase) * 0.05;
        squashY = 1 - Math.abs(Math.sin(crawlPhase)) * 0.03;
      } else {
        const wig = Math.sin(frame * 0.07);
        squashX = 1 + wig * 0.02;
        squashY = 1 - wig * 0.015;
      }
    } else if (isWallSliding) {
      // Pressed against the wall — slight forward tilt INTO the wall and
      // a slim vertical stretch so the silhouette reads as "gripping".
      // (The mirror is already applied in drawPlayer, so positive tilt
      // points the head forward in the local facing direction.)
      tilt = 0.15;
      squashX = 0.86;
      squashY = 1.10;
    } else if (isSkidding) {
      // Brake-pose: lean back AGAINST the motion (negative tilt in the
      // local frame because we just flipped to face the new direction
      // in handleInput) + a small upward squash so the head pops back.
      tilt = -0.16;
      squashX = 1.05;
      squashY = 0.94;
    } else if (isJumping) {
      // Lean back going up, lean forward falling.
      if (velY < -2) {
        squashX = 0.93;
        squashY = 1.08;
        tilt = -0.07;
      } else if (velY > 2) {
        squashX = 1.07;
        squashY = 0.93;
        tilt = 0.07;
      } else {
        squashX = 0.98;
        squashY = 1.02;
      }
    } else if (isMoving) {
      // Walk/run: Mario-style stepping. Two distinct phases combine:
      //   1) Squash around the foot anchor on each foot-strike (legs
      //      absorb impact then extend). Power-curved sin so the
      //      compression peaks read as actual strikes, not a smooth wave.
      //   2) A small vertical HOP per step that lifts the whole body
      //      briefly off the ground — exactly what makes Super Mario's
      //      run read as "running" instead of "sliding". The hop never
      //      pushes the feet below the ground line (clamped at 0).
      // Schritt-Tempo UND -Höhe an die Geschwindigkeit koppeln: beim Ausrollen
      // wird der Hüpfer kleiner und langsamer und verschwindet, sobald die Figur
      // steht — sonst hüpft sie mit vollem Tempo auf der Stelle (Zittern).
      const tempo = Math.min(1, Math.abs(velX) / 7.5);
      const cycleSpeed = isRunning ? 0.65 : 0.42;
      const phase = frame * cycleSpeed * tempo;
      const stepPulse = Math.pow(Math.abs(Math.sin(phase)), 0.6);
      const bobAmp = (isRunning ? 0.10 : 0.05) * tempo;
      squashY = 1 - stepPulse * bobAmp;
      squashX = 1 + stepPulse * bobAmp * 0.55;
      // Two hops per cycle — one per leg. Sprint hops higher and faster
      // than a walk, giving the SMB-style "bouncy run" silhouette.
      const hopAmp = (isRunning ? 5.5 : 2.4) * tempo;
      legHopY = -Math.max(0, Math.sin(phase * 2)) * hopAmp;
      if (isRunning) {
        // Forward lean while sprinting — small enough that the foot
        // anchor stays pinned (rotation pivot IS the foot). The mirror
        // applied by drawPlayer auto-flips this for left-facing.
        tilt = 0.06;
        // Body slightly stretched taller-than-wide for a runner's pose.
        squashY += 0.02;
      }
    } else {
      // Idle: slow breathing + occasional blink, all via squash around
      // the foot anchor so the head visibly rises/falls without lifting
      // the body off the ground.
      const breathe = Math.sin(frame * 0.07);
      squashX = 1 + breathe * 0.022;
      squashY = 1 + breathe * 0.018;
      const blinkPhase = frame % 220;
      if (blinkPhase < 4) {
        // brief eye-blink reads as a tiny vertical squish
        squashY *= 0.95;
      }
    }
    } // end if (useProceduralPose)

    // Landing squash overlay: applied AFTER the per-pose squash so it
    // reads as an extra impact on top of whatever pose Lea is in. The
    // engine sets landingFrame to 12 for hard falls (|velY|>8) and to 6
    // for normal hops; we ramp the strength accordingly and decay it
    // over the lifetime of the window so the final frames return cleanly
    // to the pose's natural shape.
    if (landingFrame > 0 && !isJumping && !isDucking && !isSliding) {
      const hard = landingFrame > 6;
      const peak = hard ? 12 : 6;
      const tRaw = Math.min(1, landingFrame / peak);
      // Smoothstep für einen weichen Aus-Federung statt linearem Abfall.
      const t = tRaw * tRaw * (3 - 2 * tRaw);
      const compressY = hard ? 0.30 : 0.16;
      const stretchX = hard ? 0.24 : 0.13;
      squashY *= 1 - compressY * t;
      squashX *= 1 + stretchX * t;
    }

    // ------------------------------------------------------------------
    // Sprite is already tight-cropped at load time (bbox crop in
    // loadPlayerSprite), so no further srcCrop is needed. Cropping more
    // here would chop off the head and feet, which is exactly the
    // "floating above the ground" bug we used to ship.
    // ------------------------------------------------------------------
    const aspectRatio = currentImg.width / currentImg.height;

    // Visual size: anchor height to bbox so the character fills its
    // collision box.
    // While ducking we draw at the FULL standing height and let the duck
    // squash (above) press it down — keeps her full size, just crouched.
    // Sprite is drawn slightly LARGER than the collision box so the figure
    // reads a touch bigger on screen (purely visual — hitbox/physics
    // unchanged). Anchored at the feet, so the extra height adds at the top.
    const SPRITE_SCALE = 1.08;
    // Welt-13-Berater bewusst 20% größer als Fiona/Lea (rein visuell,
    // feet-anchored → wächst nach oben; Hitbox/Physik unverändert).
    const beraterScale = useBerater ? 1.2 : 1;
    // Echtes Duck-Sprite nutzt die volle Steh-Höhe wie der Stauch-Pfad: die
    // geduckte Pose + der Maßstab stecken bereits in der Sprite-Canvas
    // (Figur unten verankert auf ~72% Höhe), daher kein Sonderfaktor nötig.
    let drawH = (isDucking ? (isPoweredUp ? 80 : 68) : h) * SPRITE_SCALE * beraterScale;
    let drawW = drawH * aspectRatio;
    const maxW = w * 1.35;
    if (drawW > maxW) drawW = maxW;
    drawH = Math.round(drawH);
    drawW = Math.round(drawW);

    // Anchor at feet (bbox bottom-center). All bob/breath comes from
    // squash around this anchor, so the bottom of the rendered sprite
    // is always exactly at the ground line.
    const tx = Math.round(x + w / 2);
    const ty = Math.round(y + h);
    ctx.translate(tx, ty);
    // ── Superkraft-Move ────────────────────────────────────────────────
    // Lea (powered) schlägt ein Rad (zwei volle Drehungen um die Körper-
    // mitte), Fiona (klein) hüpft auf einem Bein (schnelles Balance-Wackeln).
    // Beide mit einem Sprungbogen, damit der Move Schwung hat.
    if (superMoveTimer > 0) {
      const p = 1 - superMoveTimer / Math.max(1, superMoveTotal); // 0 → 1
      // Sanfte ease-in-out-Kurve für geschmeidiges Anlaufen und Auslaufen.
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      if (isPoweredUp) {
        // Lea: Radschlag auf GLEICHER Ebene — zwei geeaste Umdrehungen um
        // die Körpermitte, ohne Hochspringen (bleibt auf Bodenhöhe).
        const ang = ease(p) * Math.PI * 2 * 2;
        ctx.translate(0, -drawH / 2);
        ctx.rotate(ang);
        ctx.translate(0, drawH / 2);
      } else {
        // Fiona: drei klare, weiche Hüpfer auf EINEM Standbein. Der Dreh-
        // pivot sitzt seitlich über einem Fuß, die Neigung bleibt zur
        // gleichen Seite (Standbein-Eindruck) und Squash/Stretch geben den
        // Hüpfern Federung.
        const hops = 3;
        const hp = (p * hops) % 1;                // 0..1 innerhalb eines Hüpfers
        const air = Math.sin(hp * Math.PI);       // 0 am Boden, 1 im Scheitel
        ctx.translate(0, -air * drawH * 0.27);    // etwas höherer Hüpfer = mehr Schwung
        const footPivotX = drawW * 0.18;          // Pivot über dem Standbein
        // Sanftere Neigung, da der Frame (angewinkeltes Bein) schon Dynamik
        // mitbringt — zu viel Schräglage würde die Pose verzerren.
        const lean = 0.07 + air * 0.06;
        ctx.translate(footPivotX, 0);
        ctx.rotate(lean);
        ctx.translate(-footPivotX, 0);
        // Dezentes Squash/Stretch: in der Luft leicht gestreckt, beim
        // Aufkommen kurz gestaucht → federnd, aber ohne die Pose zu quetschen.
        const land = Math.max(0, 1 - hp * 4) + Math.max(0, (hp - 0.75) * 4);
        const stretchY = 1 + air * 0.09 - land * 0.08;
        ctx.scale(1 + land * 0.06 - air * 0.04, stretchY);
      }
    }
    // Step-hop: applied at the foot anchor BEFORE squash/tilt so the
    // entire body lifts as one rigid unit (no smear from compounding
    // with the squash matrix). Walk/run only — every other branch
    // leaves legHopY at 0.
    if (legHopY !== 0) ctx.translate(0, legHopY);
    if (tilt !== 0) ctx.rotate(tilt);
    if (squashX !== 1 || squashY !== 1) ctx.scale(squashX, squashY);

    const dx = -Math.round(drawW / 2);
    const dy = -drawH;

    this.ensure3DCanvas(drawW, drawH);
    const oc = this.playerOffscreen!;
    const octx = this.playerOffCtx!;
    const dpr = this.playerOffDpr || 1;
    const pad = 4;

    // Render the source PNG into the offscreen at NATIVE pixel density
    // so the bilinear downsample stays crisp on retina screens. The
    // offscreen buffer was already allocated at (drawW+pad*2)*dpr ×
    // (drawH+pad*2)*dpr — we apply the matching CTM here.
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, oc.width / dpr, oc.height / dpr);
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(
      currentImg,
      0, 0, currentImg.width, currentImg.height,
      pad, pad,
      drawW, drawH
    );
    // Weiche Schritt-Überblendung: das nächste Lauf-Frame mit Teil-Deckkraft
    // darüberlegen, sodass die Beinphasen ineinander übergehen statt hart zu
    // springen. Liegt vor der Schattierung, damit der Verlauf auf das gemischte
    // Bild wirkt.
    if (crossFadeNext && crossFadeBlend > 0.01) {
      octx.globalAlpha = crossFadeBlend;
      octx.drawImage(
        crossFadeNext,
        0, 0, crossFadeNext.width, crossFadeNext.height,
        pad, pad,
        drawW, drawH
      );
      octx.globalAlpha = 1;
    }
    // Ein vertikaler Verlauf NUR auf den Sprite-Pixeln (source-atop): hellt die
    // Oberseite leicht auf und dunkelt die Unterseite ab. Dadurch wirkt die flache
    // Figur gewölbt/voluminös statt papierflach. Bewusst dezent gehalten.
    octx.globalCompositeOperation = 'source-atop';
    const volGrad = octx.createLinearGradient(0, pad, 0, pad + drawH);
    volGrad.addColorStop(0, 'rgba(255,255,255,0.24)');
    volGrad.addColorStop(0.34, 'rgba(255,255,255,0)');
    volGrad.addColorStop(0.66, 'rgba(0,0,0,0)');
    volGrad.addColorStop(1, 'rgba(0,0,0,0.38)');
    octx.fillStyle = volGrad;
    octx.fillRect(pad, pad, drawW, drawH);
    // Seitliche Wölbung: beide Ränder leicht abdunkeln → der Körper rundet sich
    // zur Mitte (zylindrisches Volumen). Symmetrisch, daher unabhängig von der
    // Blickrichtung — beim Spiegeln springt das Licht nicht.
    const sideGrad = octx.createLinearGradient(pad, 0, pad + drawW, 0);
    sideGrad.addColorStop(0, 'rgba(0,0,0,0.20)');
    sideGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
    sideGrad.addColorStop(1, 'rgba(0,0,0,0.20)');
    octx.fillStyle = sideGrad;
    octx.fillRect(pad, pad, drawW, drawH);
    // Glanzlicht: konzentrierter heller Reflex an der Oberkante (oberste ~22%),
    // simuliert einfallendes Licht und verstärkt die plastische Wölbung am Kopf/
    // Oberkörper. Klingt nach unten schnell aus.
    const glossGrad = octx.createLinearGradient(0, pad, 0, pad + drawH * 0.22);
    glossGrad.addColorStop(0, 'rgba(255,255,255,0.30)');
    glossGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
    octx.fillStyle = glossGrad;
    octx.fillRect(pad, pad, drawW, drawH * 0.22);
    octx.globalCompositeOperation = 'source-over';
    octx.setTransform(1, 0, 0, 1, 0, 0);

    // Copy the offscreen back to the main context. Source is in DPR
    // pixels, dest is in logical pixels — temporarily flip on bilinear
    // smoothing so the player stays sharp instead of inheriting the
    // global nearest-neighbor setting used for tile art.
    const srcW = drawW + pad * 2;
    const srcH2 = drawH + pad * 2;
    const prevSmoothing = ctx.imageSmoothingEnabled;
    const prevQuality = ctx.imageSmoothingQuality;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ── Rim-Light / Umriss (Grafik-Feinschliff) ─────────────────────────────
    // Die Figur bekommt eine dezente, getönte Silhouette knapp HINTER dem Sprite
    // (leicht vergrößert), damit sie sich vor unruhigen Hintergründen (Dschungel-
    // Blätterdach, dunkler Fels) klar abhebt — so wie die Gegner ihr Rim schon
    // haben. Umriss = alpha-eingefärbte Kopie des fertigen Sprites; nur EINE
    // Figur pro Frame, also praktisch kostenlos.
    if (!this.playerRimOffscreen || this.playerRimOffscreen.width < oc.width || this.playerRimOffscreen.height < oc.height) {
      this.playerRimOffscreen = document.createElement('canvas');
      this.playerRimOffscreen.width = oc.width;
      this.playerRimOffscreen.height = oc.height;
      this.playerRimCtx = this.playerRimOffscreen.getContext('2d');
    }
    const rc = this.playerRimCtx;
    if (rc) {
      rc.setTransform(1, 0, 0, 1, 0, 0);
      rc.globalCompositeOperation = 'source-over';
      rc.clearRect(0, 0, this.playerRimOffscreen.width, this.playerRimOffscreen.height);
      rc.drawImage(oc, 0, 0);                       // fertige Sprite-Silhouette (Alpha)
      rc.globalCompositeOperation = 'source-in';     // Alpha einfärben → Umriss-Ton
      rc.fillStyle = 'rgba(18,22,30,1)';             // weiches Dunkel (universell trennend)
      rc.fillRect(0, 0, this.playerRimOffscreen.width, this.playerRimOffscreen.height);
      rc.globalCompositeOperation = 'source-over';
      const grow = 3;                                // px Umriss-Breite (logisch)
      const prevA = ctx.globalAlpha;
      ctx.globalAlpha = 0.30;
      ctx.drawImage(this.playerRimOffscreen, 0, 0, srcW * dpr, srcH2 * dpr,
        dx - pad - grow / 2, dy - pad - grow / 2, srcW + grow, srcH2 + grow);
      ctx.globalAlpha = prevA;
    }

    ctx.drawImage(oc, 0, 0, srcW * dpr, srcH2 * dpr, dx - pad, dy - pad, srcW, srcH2);
    ctx.imageSmoothingEnabled = prevSmoothing;
    ctx.imageSmoothingQuality = prevQuality;

    ctx.restore();
    return;
  }

  this.drawFallbackPlayer(ctx, x, y, w, h, frame, isJumping, isRunning);
}

function drawFallbackPlayer(this: Renderer, ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, isJumping: boolean, isRunning: boolean) {
  const sweaterColor = '#4a9ad4';
  const sweaterDark = '#3a7ab0';
  const skinColor = '#ffcc99';
  const hairColor = '#6b3a1f';
  const pantsColor = '#2a3a5c';
  const shoeColor = '#cc3333';

  const headH = h * 0.38;
  const bodyH = h * 0.32;
  const legH = h * 0.3;

  let legOffset = 0;
  let armOffset = 0;
  if (isJumping) {
    legOffset = -2;
    armOffset = -3;
  } else if (isRunning) {
    legOffset = Math.sin(frame * 0.6) * 4;
    armOffset = Math.sin(frame * 0.6 + Math.PI) * 3;
  } else if (frame > 0) {
    legOffset = Math.sin(frame * 0.4) * 3;
    armOffset = Math.sin(frame * 0.4 + Math.PI) * 2;
  }

  ctx.fillStyle = sweaterColor;
  ctx.fillRect(x + w * 0.18, y + headH, w * 0.64, bodyH);
  ctx.fillStyle = sweaterDark;
  ctx.fillRect(x + w * 0.18, y + headH + bodyH - 3, w * 0.64, 3);

  ctx.fillStyle = pantsColor;
  const legY = y + headH + bodyH;
  ctx.fillRect(x + w * 0.2, legY, w * 0.25, legH + legOffset);
  ctx.fillRect(x + w * 0.55, legY, w * 0.25, legH - legOffset);

  ctx.fillStyle = shoeColor;
  ctx.fillRect(x + w * 0.15, y + h - 5 + legOffset, w * 0.3, 5);
  ctx.fillRect(x + w * 0.55, y + h - 5 - legOffset, w * 0.3, 5);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + w * 0.17, y + h - 4 + legOffset, w * 0.08, 2);
  ctx.fillRect(x + w * 0.72, y + h - 4 - legOffset, w * 0.08, 2);

  ctx.fillStyle = sweaterColor;
  const armY = y + headH + 3;
  ctx.fillRect(x + w * 0.0, armY + armOffset, w * 0.2, bodyH * 0.6);
  ctx.fillRect(x + w * 0.8, armY - armOffset, w * 0.2, bodyH * 0.6);
  ctx.fillStyle = skinColor;
  ctx.fillRect(x + w * 0.0, armY + bodyH * 0.5 + armOffset, w * 0.18, 5);
  ctx.fillRect(x + w * 0.82, armY + bodyH * 0.5 - armOffset, w * 0.18, 5);

  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + headH * 0.55, w * 0.3, headH * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + headH * 0.35, w * 0.38, headH * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + w * 0.55, y + headH * 0.3, w * 0.35, headH * 0.8);
  ctx.beginPath();
  ctx.ellipse(x + w * 0.85, y + headH * 0.9, w * 0.12, headH * 0.2, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.42, y + headH * 0.52, 3.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3366aa';
  ctx.beginPath();
  ctx.arc(x + w * 0.43, y + headH * 0.54, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x + w * 0.44, y + headH * 0.54, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + w * 0.45, y + headH * 0.52, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.48, y + headH * 0.65, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#cc6666';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x + w * 0.45, y + headH * 0.7, 2.5, 0.1, Math.PI - 0.1);
  ctx.stroke();
}

function drawDeadPlayer(this: Renderer, ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, useLeaSprite = false) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(Math.PI);
  ctx.translate(-w / 2, -h / 2);

  // Todes-Purzelbaum mit der AKTUELLEN Figur (Bugfix v396): vorher immer Lea
  // (playerImage = Leas Stand-Frame). Berater in Welt 13, sonst Lea/Fiona.
  const useBerater = this.currentTheme === 'bluefield';
  const standFrame = useBerater ? this.beraterFrames[0]
    : (useLeaSprite ? this.leaFrames[0] : this.fionaFrames[0]);
  const img = standFrame ?? this.playerImage;

  if (img) {
    const drawH = Math.round(h * 1.15);
    const aspectRatio = img.width / img.height;
    const drawW = Math.round(drawH * aspectRatio);

    // Route through the same DPR-aware offscreen buffer as the live
    // player so the upside-down death tumble downsamples at native
    // pixel density and stays retina-sharp instead of inheriting the
    // global nearest-neighbor smoothing used for tile art.
    this.ensure3DCanvas(drawW, drawH);
    const oc = this.playerOffscreen!;
    const octx = this.playerOffCtx!;
    const dpr = this.playerOffDpr || 1;
    const pad = 4;

    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, oc.width / dpr, oc.height / dpr);
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(
      img,
      0, 0, img.width, img.height,
      pad, pad,
      drawW, drawH
    );
    octx.setTransform(1, 0, 0, 1, 0, 0);

    const srcW = drawW + pad * 2;
    const srcH2 = drawH + pad * 2;
    const dx = w / 2 - drawW / 2;
    const dy = h - drawH;
    const prevSmoothing = ctx.imageSmoothingEnabled;
    const prevQuality = ctx.imageSmoothingQuality;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.7;
    ctx.drawImage(oc, 0, 0, srcW * dpr, srcH2 * dpr, dx - pad, dy - pad, srcW, srcH2);
    ctx.imageSmoothingEnabled = prevSmoothing;
    ctx.imageSmoothingQuality = prevQuality;
  } else {
    ctx.fillStyle = '#4a9ad4';
    ctx.fillRect(w * 0.15, h * 0.2, w * 0.7, h * 0.5);
    ctx.fillStyle = '#ffcc99';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.2, w * 0.3, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ===========================================================================
// Plüsch-Traumland: Fiona als Kuscheltier. Prozedurale Tierfiguren, deren Form
// vom Power-Zustand abhängt: klein = Äffchen, groß = Panda, Feuerblume = Elefant.
// Gezeichnet in lokalem Koordinatenraum (0,0 .. W,H), nach rechts blickend
// (die Spiegelung nach Blickrichtung macht der Aufrufer).
// ===========================================================================
type PlushForm = 'monkey' | 'panda' | 'elephant';
interface PlushOpts {
  frame: number; isJumping: boolean; isRunning: boolean;
  velY: number; velX: number; isDucking: boolean; time: number;
  landingFrame?: number;
  monkeyFrames?: (HTMLImageElement | null)[];
  pandaFrames?: (HTMLImageElement | null)[];
  elefantFrames?: (HTMLImageElement | null)[];
}

// Squash/Stretch-Juice für die Plüsch-Figur: dieselbe „Gummiband"-Idee wie beim
// Fiona-Sprite (drawPlayerSprite), verankert an den Füßen (Boden = H), damit die
// Figur beim Steigen leicht streckt, beim Fallen minimal zieht und bei der
// Landung sichtbar staucht. Gibt {sx, sy} zurück (1,1 = keine Verformung).
function plushSquash(o: PlushOpts): { sx: number; sy: number } {
  let sx = 1, sy = 1;
  // Landung: kurzes, kräftiges Stauchen. Engine setzt 12 (harter Fall) / 6 (Hopser).
  const lf = o.landingFrame ?? 0;
  if (lf > 0) {
    const hard = lf > 6;
    const amt = (hard ? 0.22 : 0.12) * Math.min(1, lf / (hard ? 12 : 6));
    sy *= 1 - amt;
    sx *= 1 + amt * 0.8;
  } else if (o.isJumping) {
    if (o.velY < 0) {
      // Aufstieg: nach oben strecken (je schneller, desto mehr, gedeckelt).
      const st = Math.min(0.18, -o.velY * 0.014);
      sy *= 1 + st;
      sx *= 1 - st * 0.55;
    } else if (o.velY > 3) {
      // Schneller Fall: leichte Streckung nach unten für „Fallgefühl".
      const st = Math.min(0.12, (o.velY - 3) * 0.01);
      sy *= 1 + st;
      sx *= 1 - st * 0.5;
    }
  }
  return { sx, sy };
}

// Blittet ein Plüsch-Tier-Sprite-Set (Affe/Panda): Größe an der vollen Stand-Höhe
// ausgerichtet (wie Fiona), Füße unten am Boden (H). Duck staucht statt schrumpft.
function blitPlushSprite(ctx: CanvasRenderingContext2D, W: number, H: number,
                         frames: (HTMLImageElement | null)[], fullH: number, o: PlushOpts,
                         walkCycle?: number[]): boolean {
  const img = frames[pickMonkeyFrame(o, walkCycle)] || frames[0];
  if (!img || !img.width) return false;
  const SPRITE_SCALE = 1.12;
  const drawH = fullH * SPRITE_SCALE;
  const drawW = drawH * (img.width / img.height);
  // Squash/Stretch um den Fußpunkt (W/2, H) herum — gibt der Figur Gummi-Leben.
  const { sx, sy } = plushSquash(o);
  if (sx !== 1 || sy !== 1) {
    ctx.save();
    ctx.translate(W / 2, H);
    ctx.scale(sx, sy);
    ctx.translate(-W / 2, -H);
    ctx.drawImage(img, W / 2 - drawW / 2, H - drawH, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(img, W / 2 - drawW / 2, H - drawH, drawW, drawH);
  }
  return true;
}

// Zustand → Äffchen-Sprite-Index (0 idle · 1-4 laufen · 5 auf · 6 apex · 7 fall · 8 duck).
// `walkCycle` erlaubt figurspezifische Lauf-Sequenzen: manche Sprite-Sets haben
// ihre echten Schritt-Posen an anderen Indizes (z. B. der Elefant), sodass die
// Standard-Folge [1,2,3,4] Idle-Frames einmischen würde und die Beine nicht
// sauber vorne/hinten wechseln.
function pickMonkeyFrame(o: PlushOpts, walkCycle: number[] = [1, 2, 3, 4]): number {
  if (o.isDucking) return 8;
  if (o.isJumping) {
    if (o.velY < -1.5) return 5;
    if (o.velY > 3) return 7;
    return 6;
  }
  // Laufzyklus IMMER wenn die Figur sich am Boden bewegt (Gehen ODER Rennen),
  // nicht nur bei gedrücktem Sprint — sonst „rennen die Beine nicht".
  if (Math.abs(o.velX) > 0.5) {
    const spd = o.isRunning ? 0.26 : 0.17;         // rennen: schnellere Schrittfolge
    return walkCycle[Math.floor(o.time * spd) % walkCycle.length];
  }
  return 0;
}

const PLUSH_PAL: Record<PlushForm, { body: string; belly: string; dark: string; inner: string }> = {
  monkey:   { body: '#a9743f', belly: '#ecceA0', dark: '#7a5326', inner: '#f0d8b0' },
  panda:    { body: '#f6f5f1', belly: '#ffffff', dark: '#2c2c30', inner: '#ffd9e2' },
  elephant: { body: '#b9bece', belly: '#d2d7e1', dark: '#8890a2', inner: '#f2c6d6' },
};

function plushBlob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

function drawPlushCharacter(ctx: CanvasRenderingContext2D, W: number, H: number, form: PlushForm, o: PlushOpts) {
  // Echte Sprite-Sets (User-Upload), falls geladen: Äffchen (klein, 68) und
  // Panda (groß, 80). Füße unten-mittig, rechts-gerichtet (Spiegelung = Aufrufer).
  if (form === 'monkey' && o.monkeyFrames && blitPlushSprite(ctx, W, H, o.monkeyFrames, 68, o)) return;
  if (form === 'panda' && o.pandaFrames && blitPlushSprite(ctx, W, H, o.pandaFrames, 80, o)) return;
  // Elefant: echte Schritt-Posen liegen auf f3–f5 (f0–f2 sind ~Idle). Eigene
  // Lauf-Sequenz [3,4,5,4] — f3 hebt das hintere, f4 das vordere Bein → die
  // Beine wechseln sichtbar vorne/hinten, es sieht nach echtem Rennen aus.
  if (form === 'elephant' && o.elefantFrames && blitPlushSprite(ctx, W, H, o.elefantFrames, 80, o, [3, 4, 5, 4])) return;
  const P = PLUSH_PAL[form];
  const t = o.time;
  const cx = W / 2;
  const running = o.isRunning && !o.isJumping;
  const walk = running ? t * 0.35 : 0;
  const idleBob = running ? 0 : Math.sin(t * 0.08) * 1.3;
  const duck = o.isDucking ? 0.72 : 1;

  // Grundmaße (Füße am Boden H).
  const footY = H - 1;
  const legLen = H * 0.15;
  const bodyH = H * 0.46 * duck;
  const bodyW = W * (form === 'panda' ? 0.9 : form === 'elephant' ? 0.94 : 0.8);
  const bodyCY = footY - legLen - bodyH * 0.5 + idleBob;
  const headR = W * (form === 'elephant' ? 0.46 : 0.42);
  const headCY = bodyCY - bodyH * 0.5 - headR * 0.55 + idleBob;
  const legSwing = running ? Math.sin(walk) * (W * 0.14) : 0;
  const jTuck = o.isJumping ? legLen * 0.45 : 0;

  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // Squash/Stretch um den Fußpunkt (auch für die gezeichnete Fallback-Figur).
  const sq = plushSquash(o);
  if (sq.sx !== 1 || sq.sy !== 1) {
    ctx.translate(cx, footY);
    ctx.scale(sq.sx, sq.sy);
    ctx.translate(-cx, -footY);
  }

  // --- Schwanz (Affe) hinter dem Körper ---
  if (form === 'monkey') {
    const sway = Math.sin(t * 0.1) * 3;
    ctx.strokeStyle = P.dark; ctx.lineWidth = W * 0.09;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.32, bodyCY + bodyH * 0.2);
    ctx.quadraticCurveTo(cx - bodyW * 0.8, bodyCY + bodyH * 0.3 + sway, cx - bodyW * 0.62, bodyCY - bodyH * 0.5 + sway);
    ctx.stroke();
    ctx.fillStyle = P.inner; plushBlob(ctx, cx - bodyW * 0.62, bodyCY - bodyH * 0.5 + sway, W * 0.05, W * 0.05);
  }

  // --- Beine ---
  const legY = footY - legLen + jTuck;
  ctx.fillStyle = P.dark;
  plushBlob(ctx, cx - bodyW * 0.24 - legSwing, legY, W * 0.13, legLen * 0.7);
  plushBlob(ctx, cx + bodyW * 0.24 + legSwing, legY, W * 0.13, legLen * 0.7);
  // Elefanten-Füße mit Zehen-Punkten.
  if (form === 'elephant') {
    ctx.fillStyle = P.belly;
    plushBlob(ctx, cx - bodyW * 0.24 - legSwing, legY + legLen * 0.4, W * 0.10, W * 0.05);
    plushBlob(ctx, cx + bodyW * 0.24 + legSwing, legY + legLen * 0.4, W * 0.10, W * 0.05);
  }

  // --- Hinterer Arm ---
  const armSwing = running ? Math.sin(walk + Math.PI) * (W * 0.12) : Math.sin(t * 0.08 + 1) * 1.6;
  ctx.fillStyle = (form === 'panda') ? P.dark : P.body;
  plushBlob(ctx, cx - bodyW * 0.42, bodyCY - armSwing * 0.5, W * 0.11, bodyH * 0.26);

  // --- Körper + Bauch ---
  ctx.fillStyle = P.body;
  plushBlob(ctx, cx, bodyCY, bodyW * 0.5, bodyH * 0.5);
  ctx.fillStyle = P.belly;
  plushBlob(ctx, cx, bodyCY + bodyH * 0.06, bodyW * 0.28, bodyH * 0.34);
  if (form === 'panda') {
    // schwarze Schulter-/Beinflecken.
    ctx.fillStyle = P.dark;
    plushBlob(ctx, cx - bodyW * 0.32, bodyCY + bodyH * 0.02, bodyW * 0.13, bodyH * 0.3);
    plushBlob(ctx, cx + bodyW * 0.32, bodyCY + bodyH * 0.02, bodyW * 0.13, bodyH * 0.3);
  }

  // --- Vorderer Arm ---
  ctx.fillStyle = (form === 'panda') ? P.dark : P.body;
  plushBlob(ctx, cx + bodyW * 0.42, bodyCY + armSwing * 0.5, W * 0.11, bodyH * 0.26);

  // --- Kopf ---
  ctx.fillStyle = P.body;
  ctx.beginPath(); ctx.arc(cx, headCY, headR, 0, Math.PI * 2); ctx.fill();

  // Ohren je Form.
  if (form === 'monkey') {
    ctx.fillStyle = P.body;
    plushBlob(ctx, cx - headR * 0.92, headCY, headR * 0.34, headR * 0.4);
    plushBlob(ctx, cx + headR * 0.92, headCY, headR * 0.34, headR * 0.4);
    ctx.fillStyle = P.inner;
    plushBlob(ctx, cx - headR * 0.92, headCY, headR * 0.18, headR * 0.22);
    plushBlob(ctx, cx + headR * 0.92, headCY, headR * 0.18, headR * 0.22);
  } else if (form === 'panda') {
    ctx.fillStyle = P.dark;
    plushBlob(ctx, cx - headR * 0.72, headCY - headR * 0.7, headR * 0.34, headR * 0.34);
    plushBlob(ctx, cx + headR * 0.72, headCY - headR * 0.7, headR * 0.34, headR * 0.34);
  } else {
    // Elefant: große flatternde Ohren.
    const flap = Math.sin(t * 0.12) * 2;
    ctx.fillStyle = P.body;
    plushBlob(ctx, cx - headR * 0.95, headCY + flap, headR * 0.55, headR * 0.7);
    plushBlob(ctx, cx + headR * 0.95, headCY - flap, headR * 0.55, headR * 0.7);
    ctx.fillStyle = P.inner;
    plushBlob(ctx, cx - headR * 0.95, headCY + flap, headR * 0.3, headR * 0.4);
    plushBlob(ctx, cx + headR * 0.95, headCY - flap, headR * 0.3, headR * 0.4);
  }

  // Gesicht.
  const eyeY = headCY - headR * 0.06;
  const eyeDX = headR * 0.36;
  if (form === 'panda') {
    // Augenflecken.
    ctx.fillStyle = P.dark;
    ctx.save(); ctx.translate(cx - eyeDX, eyeY); ctx.rotate(-0.35); plushBlob(ctx, 0, 0, headR * 0.28, headR * 0.36); ctx.restore();
    ctx.save(); ctx.translate(cx + eyeDX, eyeY); ctx.rotate(0.35); plushBlob(ctx, 0, 0, headR * 0.28, headR * 0.36); ctx.restore();
  }
  // Schnauze / Rüssel.
  if (form === 'elephant') {
    // Rüssel: hängt nach unten-vorn, schwingt leicht.
    const ts = Math.sin(t * 0.09) * 2;
    ctx.strokeStyle = P.body; ctx.lineWidth = headR * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx + headR * 0.1, headCY + headR * 0.25);
    ctx.quadraticCurveTo(cx + headR * 0.75, headCY + headR * 0.7 + ts, cx + headR * 0.55 + ts, headCY + headR * 1.25);
    ctx.stroke();
    ctx.fillStyle = P.inner; plushBlob(ctx, cx + headR * 0.55 + ts, headCY + headR * 1.28, headR * 0.16, headR * 0.12);
  } else {
    ctx.fillStyle = P.inner;
    plushBlob(ctx, cx, headCY + headR * 0.32, headR * (form === 'monkey' ? 0.44 : 0.3), headR * 0.3);
    ctx.fillStyle = P.dark;
    plushBlob(ctx, cx, headCY + headR * 0.28, headR * 0.1, headR * 0.08);       // Nase
  }
  // Augen (glänzend, freundlich).
  ctx.fillStyle = P.dark;
  const er = headR * 0.14;
  ctx.beginPath(); ctx.arc(cx - eyeDX, eyeY, er, 0, Math.PI * 2); ctx.arc(cx + eyeDX, eyeY, er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(cx - eyeDX + er * 0.4, eyeY - er * 0.4, er * 0.4, 0, Math.PI * 2); ctx.arc(cx + eyeDX + er * 0.4, eyeY - er * 0.4, er * 0.4, 0, Math.PI * 2); ctx.fill();
  // rosa Wangen.
  ctx.fillStyle = 'rgba(240,140,170,0.5)';
  plushBlob(ctx, cx - headR * 0.6, headCY + headR * 0.28, headR * 0.16, headR * 0.1);
  plushBlob(ctx, cx + headR * 0.6, headCY + headR * 0.28, headR * 0.16, headR * 0.1);

  ctx.restore();
}

// Plüsch-„Ohnmacht" (Tod): ein umgefallenes Kuscheltier mit Kringel-Augen.
function drawPlushDead(ctx: CanvasRenderingContext2D, x: number, y: number, W: number, H: number, time: number) {
  const cx = x + W / 2, cy = y + H * 0.6;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI); // Kopf nach unten (umgekippt)
  ctx.fillStyle = '#a9743f';
  ctx.beginPath(); ctx.arc(0, 0, W * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5326';
  ctx.beginPath(); ctx.arc(-W * 0.4, 0, W * 0.16, 0, Math.PI * 2); ctx.arc(W * 0.4, 0, W * 0.16, 0, Math.PI * 2); ctx.fill();
  // Kringel-Augen (X).
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const ex of [-W * 0.16, W * 0.16]) {
    ctx.beginPath();
    ctx.moveTo(ex - 3, -3); ctx.lineTo(ex + 3, 3); ctx.moveTo(ex + 3, -3); ctx.lineTo(ex - 3, 3);
    ctx.stroke();
  }
  ctx.restore();
  // kleine aufsteigende Herzchen.
  for (let i = 0; i < 3; i++) {
    const a = (time * 0.05 + i * 2) % 6;
    const hy = cy - a * 8, hx = cx + Math.sin(time * 0.1 + i) * 8;
    const al = Math.max(0, 1 - a / 6) * 0.7;
    ctx.fillStyle = `rgba(240,150,190,${al})`;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.bezierCurveTo(hx - 3, hy - 3, hx - 5, hy + 1, hx, hy + 4);
    ctx.bezierCurveTo(hx + 5, hy + 1, hx + 3, hy - 3, hx, hy);
    ctx.fill();
  }
}

export const playerMethods = {
  drawPlayer,
  ensure3DCanvas,
  drawPlayerSprite,
  drawFallbackPlayer,
  drawDeadPlayer,
};
