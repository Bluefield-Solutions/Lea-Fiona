import { CANVAS_WIDTH, CANVAS_HEIGHT, CAMERA_LOOKAHEAD, CAMERA_LOOK_DIR_SWITCH_FRAMES, CAMERA_LOOKAHEAD_SMOOTH, CAMERA_FOLLOW_SPEED_BOOST, CAMERA_FALL_LOOKAHEAD, CAMERA_FALL_LOOKAHEAD_MAX, CAMERA_RISE_LOOKAHEAD, CAMERA_RISE_LOOKAHEAD_MAX, CAMERA_FALL_LOOK_SMOOTH, CAMERA_FALL_LOOK_SMOOTH_FAST, CAMERA_SMOOTH, CAMERA_VERTICAL_SMOOTH, CAMERA_FALL_FOLLOW_BOOST, CAMERA_VERTICAL_DEADZONE, CAMERA_FALL_DEADZONE, CAMERA_VERTICAL_BIAS, CAMERA_ANCHOR_SNAP, PLAYER_RUN_SPEED, TILE_SIZE } from './constants';

export class Camera {
  x = 0;
  y = 0;
  targetX = 0;
  targetY = 0;
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
  shakeIntensity = 0;
  shakeTimer = 0;
  private lastShakeX = 0;
  private lastShakeY = 0;
  // Platform-snapping anchor: the vertical world position the camera centres
  // on. Tracks the player's standing height; holds steady mid-jump.
  private groundAnchorY = 0;
  private anchorInit = false;
  // Geglätteter horizontaler Vorausblick (px). Wird weich nachgeführt, statt
  // direkt an der momentanen Geschwindigkeit zu hängen.
  private lookAhead = 0;
  // Stabile Blickrichtung des Vorausblicks (-1 links, +1 rechts) und Zähler für
  // die Richtungs-Hysterese: wechselt erst nach konsequenter Bewegung.
  private lookDir = 1;
  private lookDirTimer = 0;
  // Geglätteter vertikaler Vorausblick beim Fallen (px nach unten).
  private vLookAhead = 0;

  constructor(worldWidth: number, worldHeight: number) {
    this.width = CANVAS_WIDTH;
    this.height = CANVAS_HEIGHT;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  follow(playerX: number, playerY: number, playerVelX: number, playerVelY = 0, playerOnGround = false) {
    // ── Horizontal: geglätteter, tempoabhängiger Vorausblick ────────
    // Die Roh-Vorausschau folgt der Geschwindigkeit (mehr beim Sprinten),
    // wird aber über `lookAhead` weich nachgeführt, damit Stops und
    // Richtungswechsel die Sicht nicht ruckartig verschieben.
    // Richtungs-Hysterese: die Blickrichtung wechselt erst, wenn die Figur
    // CAMERA_LOOK_DIR_SWITCH_FRAMES lang konsequent in die neue Richtung läuft.
    // So bewegen kurze Korrekturen oder schnelles Hin-und-Her die Kamera nicht;
    // der Vorausblick-Betrag folgt weiterhin dem Tempo.
    const moveDir = playerVelX > 0.5 ? 1 : (playerVelX < -0.5 ? -1 : 0);
    if (moveDir !== 0 && moveDir !== this.lookDir) {
      this.lookDirTimer++;
      if (this.lookDirTimer >= CAMERA_LOOK_DIR_SWITCH_FRAMES) {
        this.lookDir = moveDir;
        this.lookDirTimer = 0;
      }
    } else {
      this.lookDirTimer = 0;
    }
    const rawLook = this.lookDir * Math.abs(playerVelX) * CAMERA_LOOKAHEAD;
    this.lookAhead += (rawLook - this.lookAhead) * CAMERA_LOOKAHEAD_SMOOTH;
    this.targetX = playerX - this.width / 2 + this.lookAhead;

    // ── Vertical: platform snapping ─────────────────────────────────
    // The camera centres on `groundAnchorY` (the height of the platform the
    // player stands on) rather than the player's live Y. So small/medium
    // jumps don't bob the view. On the ground the anchor eases to the
    // player; mid-air it holds, unless the player leaves a deadzone (big
    // falls/rises) — then it's pulled along so they stay on screen.
    if (!this.anchorInit) { this.groundAnchorY = playerY; this.anchorInit = true; }
    if (playerOnGround) {
      this.groundAnchorY += (playerY - this.groundAnchorY) * CAMERA_ANCHOR_SNAP;
    } else {
      if (playerY < this.groundAnchorY - CAMERA_VERTICAL_DEADZONE) {
        this.groundAnchorY = playerY + CAMERA_VERTICAL_DEADZONE;
      } else if (playerY > this.groundAnchorY + CAMERA_FALL_DEADZONE) {
        this.groundAnchorY = playerY - CAMERA_FALL_DEADZONE;
      }
    }

    // ── Vertikaler Vorausblick beim Fallen ──────────────────────────
    // Fällt die Figur spürbar (velY über Schwelle, in der Luft), schiebt
    // sich die Sicht weich nach unten, damit man früher sieht, wo man landet.
    // Steigt sie anhaltend (velY unter -Schwelle), schiebt sich die Sicht
    // weich nach oben (Celeste-Drittel-Regel). Beim Stehen/kleinen Sprüngen
    // bleibt der Vorausblick dank langsamer Glättung praktisch auf 0.
    let vLook = 0;
    if (!playerOnGround) {
      if (playerVelY > 3) {
        vLook = Math.min((playerVelY - 3) * CAMERA_FALL_LOOKAHEAD, CAMERA_FALL_LOOKAHEAD_MAX);
      } else if (playerVelY < -3) {
        vLook = Math.max((playerVelY + 3) * CAMERA_RISE_LOOKAHEAD, -CAMERA_RISE_LOOKAHEAD_MAX);
      }
    }
    // Aufbau nach unten (Fallen) schneller als Abbau/Steigen, damit man beim
    // Sturz früh sieht, wohin es geht.
    const lookSmooth = (vLook > this.vLookAhead) ? CAMERA_FALL_LOOK_SMOOTH_FAST : CAMERA_FALL_LOOK_SMOOTH;
    this.vLookAhead += (vLook - this.vLookAhead) * lookSmooth;
    // Grundposition: Figur ins untere Drittel (mehr Sicht/Vorausschau oben).
    const vBias = this.height * CAMERA_VERTICAL_BIAS;
    this.targetY = this.groundAnchorY - this.height / 2 - vBias + this.vLookAhead;

    // ── Dynamisches Aufholen: bei hohem Tempo folgt die Kamera spürbar
    // schneller, damit die Figur beim Sprinten nicht zum Rand davonläuft. ──
    const speedFrac = Math.min(Math.abs(playerVelX) / PLAYER_RUN_SPEED, 1);
    const followSmooth = CAMERA_SMOOTH * (1 + speedFrac * CAMERA_FOLLOW_SPEED_BOOST);
    this.x += (this.targetX - this.x) * followSmooth;
    // Vertikal beim Fallen dynamisch schneller nachführen (sonst sieht man die
    // Landung zu spät). fallFrac skaliert mit der Fallgeschwindigkeit.
    const fallFrac = (!playerOnGround && playerVelY > 0) ? Math.min(playerVelY / 9, 1) : 0;
    const vSmooth = CAMERA_VERTICAL_SMOOTH * (1 + fallFrac * CAMERA_FALL_FOLLOW_BOOST);
    this.y += (this.targetY - this.y) * vSmooth;

    this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.width));
    this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.height));
  }

  shake(intensity: number, duration: number) {
    if (intensity > this.shakeIntensity || this.shakeTimer <= 0) {
      this.shakeIntensity = intensity;
      this.shakeTimer = duration;
    }
  }

  tickShake() {
    if (this.shakeTimer > 0) {
      this.shakeTimer--;
      this.lastShakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.lastShakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
    } else {
      this.lastShakeX = 0;
      this.lastShakeY = 0;
      this.shakeIntensity = 0;
    }
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: Math.round(wx - this.x + this.lastShakeX),
      y: Math.round(wy - this.y + this.lastShakeY),
    };
  }

  /**
   * Allocation-free variant of `worldToScreen`: writes into `out` so
   * callers can reuse a single scratch buffer for an entire render-loop
   * pass. Returns `out` for chaining.
   */
  worldToScreenInto(wx: number, wy: number, out: { x: number; y: number }): { x: number; y: number } {
    out.x = Math.round(wx - this.x + this.lastShakeX);
    out.y = Math.round(wy - this.y + this.lastShakeY);
    return out;
  }

  isVisible(wx: number, wy: number, w: number, h: number): boolean {
    return (
      wx + w > this.x - TILE_SIZE &&
      wx < this.x + this.width + TILE_SIZE &&
      wy + h > this.y - TILE_SIZE &&
      wy < this.y + this.height + TILE_SIZE
    );
  }
}
