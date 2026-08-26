import {
  ACCELERATION, AIR_ACCELERATION, AIR_ACCELERATION_LOCKED, AIR_FRICTION,
  GROUND_POUND_SPEED, SKID_DECEL_MULT,
  APEX_THRESHOLD, BOUNCE_BOOST_MULT, CAPE_GLIDE_GRAVITY, CAPE_GLIDE_MAX_FALL,
  CLIMB_SPEED, SWING_RELEASE_VX, SWING_RELEASE_VY, CLOCK_DURATION_FRAMES, COIN_VALUE, COYOTE_TIME, DUCK_SPEED_MULT,
  VINE_RELEASE_VX_CAP, VINE_JUMP_VY, VINE_JUMP_VX, VINE_GRAB_COOLDOWN,
  Direction, EntityType, FRICTION, GRAVITY, PLAYER_GRAVITY_RISE,
  GRAVITY_APEX, GRAVITY_FALLING, GROUND_POUND_LOCK_FRAMES, GROUND_POUND_MIN_AIRTIME,
  ICE_FRICTION, JUMP_BUFFER_TIME, MAGNET_DURATION_FRAMES, MAX_FALL_SPEED,
  PLAYER_BOUNCE_FORCE, PLAYER_FIREBALL_COOLDOWN, PLAYER_JUMP_FORCE, PLAYER_RUN_SPEED,
  PLAYER_SPEED, POWERED_DUCK_HEIGHT, P_METER_FRAMES, P_METER_JUMP_BOOST,
  RUN_ACCELERATION, SLIDE_FRICTION, STAR_DURATION_FRAMES, VARIABLE_JUMP_FRAMES,
  SUPER_MAX_CHARGES, SUPER_MOVE_FRAMES,
  WALL_JUMP_LOCKOUT_FRAMES, WALL_JUMP_X_FACTOR, WALL_JUMP_Y_FACTOR, WALL_SLIDE_MAX_FALL,
} from '../constants';
import { InputManager } from '../input';
import { Entity } from './base';

export class Player extends Entity {
  isRunning = false;
  isJumping = false;
  isDucking = false;
  isDead = false;
  invincibleTimer = 0;
  lives: number;
  coins = 0;
  score = 0;
  jumpHeld = false;
  jumpTimer = 0;
  /** Frames, in denen der variable Sprung-Cut ausgesetzt ist (Feder-Launch). */
  noJumpCutTimer = 0;
  coyoteTimer = 0;
  jumpBufferTimer = 0;
  // One-way platform drop-through (Down + Jump). While dropThroughTimer > 0
  // the physics step ignores one-way landings so the player falls through.
  // onOneWayGround is refreshed by the engine each frame before handleInput.
  dropThrough = false;
  dropThroughTimer = 0;
  onOneWayGround = false;
  deathTimer = 0;
  wasOnGround = false;
  isPoweredUp = false;
  // Gewählte Spielfigur: 'fiona' (Standard) oder 'lea'. Bestimmt das Sprite-Set
  // unabhängig von der Power-Größe (isPoweredUp). Wird aus dem Speicher gesetzt.
  character: 'fiona' | 'lea' | 'stephan' = 'fiona';
  // Boutique (E3): angelegte Brille (Slot 'brille') oder null — als Gesichts-
  // Overlay auch im Spiel getragen.
  cosmeticGlasses: string | null = null;
  // Boutique (E3): angelegtes Hals-Accessoire (Slot 'accessoire') oder null.
  cosmeticAccessory: string | null = null;
  // Kuschel-Shop: angelegter Kosmetik-Hut (ID aus cosmetics.ts) oder null.
  // Rein visuell; wird beim Levelstart aus dem Speicher gesetzt.
  cosmetic: string | null = null;
  growTimer = 0;
  canDoubleJump = true;
  hasDoubleJumped = false;
  // Paket 2: Doppelsprung ist eine freispielbare Fähigkeit (Flügel in Welt 1).
  // Von der Engine beim Levelstart aus dem Speicher gesetzt. Standard true,
  // damit Test-/Sonderpfade ohne Engine-Sync nicht versehentlich blockieren;
  // im echten Spiel überschreibt die Engine dies mit dem Freischalt-Status.
  doubleJumpUnlocked = true;
  normalHeight = 68;
  duckHeight = 48;
  // Duck-pose height while powered up — bigger than the small duck so a
  // powered Lea visibly stays "the big version" even when crouched, but
  // still smaller than upright (80) so she can fit under low ceilings.
  poweredDuckHeight = POWERED_DUCK_HEIGHT;
  landingFrame = 0;
  justLanded = false;
  speedAtJump = 0;
  // events the engine reads & resets each frame
  jumpedThisFrame = false;
  doubleJumpedThisFrame = false;
  landedThisFrame = false;
  // Sprungfeder (Note-Block): von der Physik gesetzt, wenn die Spielerin auf
  // einem Note-Block landet; Engine liest Flag für Sound/Partikel/Block-Anim.
  noteBounceThisFrame = false;
  noteBounceCol = -1;
  noteBounceRow = -1;
  // Salto: beim Trampolin-Absprung dreht die Figur einen Salto (rein visuell).
  // flipSpin zählt herunter; die Drehrichtung folgt der Bewegungsrichtung.
  flipSpin = 0;
  flipTotal = 1;
  flipDir = 1;
  // Kletterseil: onRope wird vom Engine-Frame gesetzt (Seil-Tile am Körper),
  // ropeCenterX ist die Seilmitte; isClimbing = eingeklinkt am Seil.
  onRope = false;
  ropeCenterX = 0;
  isClimbing = false;
  // Schwing-Ringe: vom Engine-Frame gesetzt. swingRingX/Y = aktuelle Ringmitte,
  // nearSwingRing/swingGrabIndex = greifbarer Ring, isSwinging = hängt am Ring.
  isSwinging = false;
  swingRingIndex = -1;
  swingRingX = 0;
  swingRingY = 0;
  swingVX = 0;
  swingVY = 0;
  swingDir = 1;        // Absprungrichtung (aus der Blickrichtung beim Greifen)
  swingTimer = 0;      // Sicherheits-Zähler: Auto-Loslassen, nie festhängen
  nearSwingRing = false;
  swingGrabIndex = -1;
  // Tarzan-Schwingseile: vom Engine-Frame gesetzt. vineX/Y = aktuelles Seilende,
  // nearVine/vineGrabIndex = greifbares Seil, isVineSwinging = hängt am Seil.
  isVineSwinging = false;
  vineIndex = -1;
  vineX = 0;
  vineY = 0;
  vineVX = 0;         // Tangential-Geschwindigkeit des Seilendes (für den Impuls)
  vineVY = 0;
  vineTimer = 0;      // Sicherheits-Zähler: Auto-Loslassen, nie festhängen
  nearVine = false;
  vineGrabIndex = -1;
  vineGrabCooldown = 0;   // kurze Sperre nach dem Absprung (nicht sofort neu greifen)
  // Tarzan-Politur: Frame-Events + Zähler für „Wusch"-Effekt, Nachschwingen
  // des losgelassenen Seils und den „Jane!"-Jubel bei sauberem Kettenschwung.
  vineReleasedThisFrame = false;   // Absprung vom Seil (Wusch + Seil-Kick)
  vineReleasedIndex = -1;          // welches Seil wurde losgelassen
  vineReleaseDir = 1;              // Absprungrichtung (für Staub/Streak)
  vineFlingTimer = 0;              // Restframes für die Bewegungs-Spur nach Absprung
  vineChainCount = 0;              // in der Luft nacheinander gegriffene Seile
  vineChainCheerThisFrame = false; // „Jane!"-Jubel bei 2+ Seilen ohne Bodenkontakt
  // Mario-feel frame events: set true for ONE frame on the corresponding
  // transition, then reset by handleInput on the next frame. The engine
  // reads these for SFX and particle spawning.
  skidStartedThisFrame = false;
  slideStartedThisFrame = false;
  wallJumpedThisFrame = false;
  wallSlideStartedThisFrame = false;
  pChargeJustReadyThisFrame = false;
  onIce = false;
  // request to un-duck deferred to engine which has access to physics
  wantsUnduck = false;
  // Frames to wait before honoring an unduck request — small buffer so a
  // quick double-tap of Down doesn't cause a half-frame stand-up flicker.
  unduckBufferTimer = 0;
  // Auto-step opt-in. Read by Physics.moveStep to forgive ≤4 px floor seams.
  autoStep = true;
  // Bumped-head corner-correction opt-in. Read by Physics.moveStep: when
  // rising and only a small sliver of the head clips a block corner, the
  // player is nudged sideways to slip past instead of being stopped.
  cornerCorrect = true;
  // Peak downward velocity tracked while airborne. Sampled the moment the
  // player lands so the renderer can pick a stronger squash for hard falls.
  peakFallVelY = 0;
  // Wall-slide latch: counts down for a few frames after wall-slide ends so
  // a jump pressed *just* after losing wall contact still fires a wall-jump.
  wallSlideLatch = 0;
  wallSlideLatchDir: -1 | 0 | 1 = 0;
  // ---------------------------------------------------------------------
  // Mario-feel state
  // ---------------------------------------------------------------------
  // Currently turning around at a brake (|velX| > walk and pressing the
  // opposite direction). Ground-only.
  isSkidding = false;
  // Ducking-while-fast: preserves momentum with weak SLIDE_FRICTION instead
  // of the normal crawl accel. Auto-exits to crawl when |velX| <= crawl top.
  isSliding = false;
  // Pressing into a wall while airborne and falling. Caps fall speed and
  // enables wall-jump.
  isWallSliding = false;
  // P-meter: filled by sustained sprinting at near-max speed. While charged
  // the next jump is amplified.
  runChargeTimer = 0;
  isPCharged = false;
  // Lockout: frames during which left/right input does NOT influence velX
  // (used right after a wall-jump so the player can't immediately re-grip).
  airControlLockTimer = 0;
  // Set every frame by the engine from the latest physics result.
  // -1 = wall on player's left side, +1 = wall on right, 0 = no contact.
  wallContactDir: -1 | 0 | 1 = 0;
  // Mid-air stomp combo counter — escalates score per consecutive stomp
  // and resets on land or wall-jump. The engine reads & increments it
  // when applying enemy stomp scoring.
  airComboCount = 0;
  // Ground-pound: while true the player dives straight down and ignores
  // horizontal input. Engine clears it on landing and triggers shockwave.
  isGroundPounding = false;
  // Vorheriger „Runter"-Zustand für Flanken-Erkennung (Bodenstampfer nur bei
  // frischem Druck, nicht bei gehaltenem Ducken). Paket 3.
  prevDown = false;
  groundPoundJustStartedThisFrame = false;
  groundPoundLandedThisFrame = false;
  poundLockTimer = 0;
  // Star power-up: while >0 the player is invincible AND any enemy touched
  // dies on contact (no need to stomp). The HUD reads this to draw the
  // shrinking timer ring.
  starTimer = 0;
  starTotal = STAR_DURATION_FRAMES;
  // Superkraft: charges left (0..SUPER_MAX_CHARGES) + active-move countdown.
  // superJustTriggered is a one-shot the engine reads to wipe enemies.
  superCharges = 0;
  superMoveTimer = 0;
  superMoveTotal = SUPER_MOVE_FRAMES;
  superJustTriggered = false;
  // Genau ein Boss-Treffer pro Super-Aktivierung (Drachen-Boss, Welt 16).
  superHitLanded = false;
  // Fire-Flower power state — separate from isPoweredUp so taking a hit
  // can drop fire-mode without immediately shrinking the player. The
  // engine reads `wantsThrowFireball` once per frame to spawn the bullet.
  hasFire = false;
  fireballCooldown = 0;
  // Ship-it-Dash (neue Fähigkeit): aktive Frames + Cooldown + Richtung + Auslöse-Flag.
  dashTimer = 0;
  dashCooldown = 0;
  dashDir = 1;
  dashTriggered = false;
  /** Ship-it-Dash: letzte Positionen für die Nachzieh-Silhouetten. */
  dashTrail: { x: number; y: number }[] = [];
  /** Greifhaken: aktiv, Ankerpunkt (Welt-Pixel), Seil-Ausfahr-Fortschritt 0..1. */
  grappleActive = false;
  grappleX = 0;
  grappleY = 0;
  grappleAnim = 0;
  grappleRopeLen = 0;
  wantsThrowFireball = false;
  // Coin-Magnet gadget: while >0 every Coin within MAGNET_RANGE is pulled
  // toward the player. The HUD shows the remaining-time bar via magnetTotal.
  magnetTimer = 0;
  magnetTotal = MAGNET_DURATION_FRAMES;
  // Schmetterlingsumhang (Cape / Glider): while true, holding jump while
  // falling switches gravity to CAPE_GLIDE_GRAVITY and caps fall speed.
  // Lost on hit AFTER fire-mode is consumed (cascade order: fire → cape
  // → powered → small → dead). Gives a generous traversal tool.
  hasCape = false;
  // Schutzschild-Blase: 0 or 1. Absorbs the next playerHit() and pops.
  shieldCharges = 0;
  // Zeitlupen-Uhr: while >0 every freezable enemy skips their update.
  slowTimer = 0;
  slowTotal = CLOCK_DURATION_FRAMES;

  constructor(x: number, y: number, lives: number) {
    super(x, y, 44, 68, EntityType.PLAYER);
    this.lives = lives;
  }

  powerUp() {
    if (this.isPoweredUp) return;
    this.isPoweredUp = true;
    this.growTimer = 30;
    if (this.isDucking) {
      // Stay ducked but grow into the powered-duck silhouette so we don't
      // force-unduck the player into a ceiling.
      const newH = this.poweredDuckHeight;
      this.y -= newH - this.height;
      this.height = newH;
    } else {
      this.y -= 24;
      this.height = 80;
    }
    this.width = 52;
    this.invincibleTimer = 60;
  }

  shrink() {
    if (!this.isPoweredUp) return;
    this.isPoweredUp = false;
    this.growTimer = 0;
    const oldHeight = this.height;
    if (this.isDucking) {
      this.height = this.duckHeight;
    } else {
      this.height = this.normalHeight;
    }
    this.width = 44;
    this.y += oldHeight - this.height;
    this.invincibleTimer = 120;
  }

  update(dt: number) {
    super.update(dt);
    if (this.invincibleTimer > 0) this.invincibleTimer--;
    if (this.landingFrame > 0) this.landingFrame--;
    if (this.starTimer > 0) this.starTimer--;
    if (this.superMoveTimer > 0) this.superMoveTimer--;
    if (this.poundLockTimer > 0) this.poundLockTimer--;
    if (this.fireballCooldown > 0) this.fireballCooldown--;
    if (this.magnetTimer > 0) this.magnetTimer--;
    if (this.slowTimer > 0) this.slowTimer--;
    if (this.dropThroughTimer > 0) { this.dropThroughTimer--; if (this.dropThroughTimer === 0) this.dropThrough = false; }
    if (this.isDead) {
      this.deathTimer++;
      this.velY += GRAVITY * 0.5;
      this.y += this.velY;
      return;
    }
  }

  // Activate star-mode invincibility. Resets timer to full when collected
  // again so back-to-back stars stack to a fresh 8s window each.
  applyStar() {
    this.starTimer = STAR_DURATION_FRAMES;
    this.starTotal = STAR_DURATION_FRAMES;
  }

  // Grant the super ability: a fresh set of charges. Each press fires a
  // cartwheel (Lea) / one-leg hop (Fiona) that clears the screen of enemies.
  applySuper() {
    this.superCharges = SUPER_MAX_CHARGES;
  }

  // Activate fire-mode. If not already powered, also grow (one shrink
  // step is consumed by hits before fire is dropped — Mario rules).
  applyFire() {
    const prevTimer = this.invincibleTimer;
    this.hasFire = true;
    if (!this.isPoweredUp) this.powerUp();
    // Brief invincibility flash so the upgrade is visible — but never
    // SHORTEN an existing window (e.g. just-after-shrink at ~120 frames).
    this.invincibleTimer = Math.max(prevTimer, this.invincibleTimer, 30);
  }

  // Activate coin-magnet. Resets to full duration on re-pickup.
  applyMagnet() {
    this.magnetTimer = MAGNET_DURATION_FRAMES;
    this.magnetTotal = MAGNET_DURATION_FRAMES;
  }

  // Equip the Schmetterlingsumhang (cape). Persists until a hit drops it.
  applyCape() {
    const prevTimer = this.invincibleTimer;
    this.hasCape = true;
    if (!this.isPoweredUp) this.powerUp();
    this.invincibleTimer = Math.max(prevTimer, this.invincibleTimer, 30);
  }

  // Equip a Schutzschild-Blase. Caps at one charge so a fresh shield
  // can't stack into a multi-hit aegis.
  applyShield() {
    const prevTimer = this.invincibleTimer;
    this.shieldCharges = 1;
    this.invincibleTimer = Math.max(prevTimer, this.invincibleTimer, 30);
  }

  // Activate Zeitlupen-Uhr. Resets to full duration on re-pickup.
  applyClock() {
    this.slowTimer = CLOCK_DURATION_FRAMES;
    this.slowTotal = CLOCK_DURATION_FRAMES;
  }

  // Engine-friendly check: are we actively gliding right now? True only
  // when the cape is equipped, the player is falling, and jump is held.
  // Falling = velY > 0 AND not on ground. The actual gravity swap happens
  // in applyGravity() — this getter exists for renderer / FX cues.
  get isGliding(): boolean {
    return this.hasCape && this.jumpHeld && this.velY > 0 && !this.onGround && !this.isGroundPounding;
  }

  // Engine performs the actual unduck after collision check.
  performUnduck() {
    if (!this.isDucking) return;
    this.isDucking = false;
    const newH = this.isPoweredUp ? 80 : this.normalHeight;
    this.y -= newH - this.height;
    this.height = newH;
    this.wantsUnduck = false;
  }

  handleInput(input: InputManager) {
    // Reset all per-frame event flags first.
    this.jumpedThisFrame = false;
    this.doubleJumpedThisFrame = false;
    this.landedThisFrame = false;
    this.skidStartedThisFrame = false;
    this.slideStartedThisFrame = false;
    this.wallJumpedThisFrame = false;
    this.wallSlideStartedThisFrame = false;
    this.pChargeJustReadyThisFrame = false;
    this.groundPoundJustStartedThisFrame = false;
    this.groundPoundLandedThisFrame = false;
    this.wantsThrowFireball = false;
    if (this.vineFlingTimer > 0) this.vineFlingTimer--;
    if (this.vineGrabCooldown > 0) this.vineGrabCooldown--;
    // Bodenkontakt beendet eine Schwing-Kette (nächstes Seil zählt wieder frisch).
    if (this.onGround) this.vineChainCount = 0;
    // Paket 3 · Bodenstampfer bewusster machen: nur ein FRISCHER Runter-Druck
    // in der Luft löst den Stampfer aus, kein bloßes Gedrückt-Halten (Ducken).
    // So kann ein Kind nicht mehr versehentlich stampfen, wenn es geduckt
    // vom Rand springt oder Runter hält.
    const downEdge = input.down && !this.prevDown;
    this.prevDown = input.down;
    if (this.isDead) return;

    // Snapshot the slide/skid state at the START of the frame so the
    // coyote-time decrement check can detect a "lift-off via slide or
    // skid". Both flags are cleared partway through this method (when
    // input changes), so reading them at the bottom would always show
    // false and the coyote forgiveness would never trigger.
    const prevWasSliding = this.isSliding;
    const prevWasSkidding = this.isSkidding;

    // Fire-throw: pressing F while in fire-mode (and off cooldown) signals
    // the engine to spawn a PlayerFireball this frame. Allowed in any
    // pose except while ground-pounding (already returned above).
    if (this.hasFire && input.firePressed && this.fireballCooldown === 0) {
      this.wantsThrowFireball = true;
      this.fireballCooldown = PLAYER_FIREBALL_COOLDOWN;
    }

    // Superkraft: a charge press launches the screen-clearing cartwheel /
    // one-leg hop. One-shot flag picked up by the engine to wipe enemies;
    // brief i-frames keep the move itself safe.
    if (input.superPressed && this.superCharges > 0 && this.superMoveTimer === 0) {
      this.superCharges--;
      this.superMoveTimer = SUPER_MOVE_FRAMES;
      this.superJustTriggered = true;
      this.superHitLanded = false;   // neue Aktivierung → wieder ein Boss-Treffer möglich
      if (this.invincibleTimer < SUPER_MOVE_FRAMES) this.invincibleTimer = SUPER_MOVE_FRAMES;
    }

    // -------------------------------------------------------------------
    // Schwing-Ringe (Pendel): Ring greifen, mitschwingen, per Sprung loslassen.
    // Position/Ringmitte werden vom Engine-Frame gesetzt (swingRingX/Y).
    // -------------------------------------------------------------------
    if (this.isSwinging) {
      this.swingTimer++;
      if (input.jumpPressed || this.swingTimer > 180) {
        // Loslassen: fester Vorwärts-Absprung (garantiert über die Grube) +
        // etwas Schwung-Bonus aus der aktuellen Bewegungsrichtung.
        this.isSwinging = false; this.swingTimer = 0;
        const bonus = this.swingVX * this.swingDir > 0 ? this.swingVX * 0.6 : 0;
        this.velX = this.swingDir * SWING_RELEASE_VX + bonus;
        this.velY = SWING_RELEASE_VY;
        this.isJumping = true;
        this.direction = this.swingDir < 0 ? Direction.LEFT : Direction.RIGHT;
        return;
      }
      if (input.down) {
        // Nach unten loslassen (in die Grube fallen → am Seil wieder hoch).
        this.isSwinging = false; this.swingTimer = 0;
        return;
      }
      // Am Ring hängen: Position folgt der Ringmitte (Engine berechnet Pendel).
      const nx = this.swingRingX - this.width / 2;
      const ny = this.swingRingY;
      this.swingVX = nx - this.x;
      this.swingVY = ny - this.y;
      this.x = nx; this.y = ny;
      this.velX = 0; this.velY = 0;
      this.onGround = false; this.isJumping = true; this.isDucking = false;
      return;
    } else if (this.nearSwingRing && input.jump) {
      // Greifen: Ring in der Luft berührt und Sprung/Hoch gedrückt.
      this.isSwinging = true;
      this.swingRingIndex = this.swingGrabIndex;
      this.swingDir = this.direction === Direction.LEFT ? -1 : 1;
      this.swingVX = 0; this.swingVY = 0; this.swingTimer = 0;
      return;
    }

    // -------------------------------------------------------------------
    // Tarzan-Schwingseile: langes Pendel-Seil in der Luft greifen, mit-
    // schwingen und im richtigen Moment loslassen. Das Seilende (vineX/Y)
    // wird vom Engine-Frame gesetzt; der Absprung folgt dem Schwung-Impuls.
    // -------------------------------------------------------------------
    if (this.isVineSwinging) {
      this.vineTimer++;
      // Absprung: Sprungtaste tippen (mit kurzer Greif-Schonzeit) ODER gedrückt
      // halten (nach kurzer Zeit lässt es automatisch los → per Halten schwingt
      // man Seil zu Seil). Der Absprung ist ein echter Sprung MIT Bogen.
      const wantRelease = (input.jumpPressed && this.vineTimer > 3)
        || (input.jump && this.vineTimer > 18)
        || this.vineTimer > 200;
      if (wantRelease) {
        const releasedIdx = this.vineIndex;
        this.isVineSwinging = false; this.vineTimer = 0; this.vineIndex = -1;
        // Richtung: dem Schwung folgen, sonst Blickrichtung.
        const dir = Math.abs(this.vineVX) > 0.6
          ? (this.vineVX < 0 ? -1 : 1)
          : (this.direction === Direction.LEFT ? -1 : 1);
        // Fester Vorwärts-Schub + etwas Schwung-Bonus (gedeckelt).
        let vx = dir * VINE_JUMP_VX + this.vineVX * 0.5;
        vx = Math.max(-VINE_RELEASE_VX_CAP, Math.min(VINE_RELEASE_VX_CAP, vx));
        this.velX = vx;
        // Kräftiger Aufwärts-Bogen (echter Sprung) + etwas Schwung-Aufwind.
        this.velY = VINE_JUMP_VY + Math.min(0, this.vineVY * 0.4);
        this.isJumping = true;
        // Voller Bogen bleibt auch beim kurzen Antippen erhalten (kein Sprung-Cut).
        this.noJumpCutTimer = 14;
        this.vineGrabCooldown = VINE_GRAB_COOLDOWN;   // nicht sofort dasselbe Seil neu greifen
        this.direction = vx < 0 ? Direction.LEFT : Direction.RIGHT;
        // „Wusch": Effekt-Flags für Engine (Funken, Seil-Kick, Streak).
        this.vineReleasedThisFrame = true;
        this.vineReleasedIndex = releasedIdx;
        this.vineReleaseDir = vx < 0 ? -1 : 1;
        this.vineFlingTimer = 16;
        return;
      }
      if (input.down && this.vineTimer > 3) {
        // Nach unten loslassen (kontrolliert fallen).
        this.isVineSwinging = false; this.vineTimer = 0; this.vineIndex = -1;
        this.vineGrabCooldown = 8;
        return;
      }
      // Am Seilende hängen: Position folgt dem schwingenden Seilende. Die
      // Tangential-Geschwindigkeit merken wir uns fürs Loslassen (Schwung-Impuls).
      const nx = this.vineX - this.width / 2;
      const ny = this.vineY;
      this.vineVX = nx - this.x;
      this.vineVY = ny - this.y;
      this.x = nx; this.y = ny;
      this.velX = 0; this.velY = 0;
      this.onGround = false; this.isJumping = true; this.isDucking = false;
      this.isClimbing = false;
      return;
    } else if (this.nearVine && this.vineGrabCooldown === 0) {
      // Greifen: Seilende in der Luft berührt (automatisch — kein Tastendruck
      // nötig), solange die kurze Absprung-Sperre vorbei ist. So schwingt man
      // flüssig von Seil zu Seil, indem man einfach hin springt.
      this.isVineSwinging = true;
      this.vineIndex = this.vineGrabIndex;
      this.vineVX = 0; this.vineVY = 0; this.vineTimer = 0;
      // Kettenschwung zählen: zweites+ Seil ohne Bodenkontakt → „Jane!"-Jubel.
      this.vineChainCount++;
      if (this.vineChainCount >= 2) this.vineChainCheerThisFrame = true;
      return;
    }

    // -------------------------------------------------------------------
    // Kletterseil (neue Mechanik): am Seil einklinken und vertikal klettern.
    // Jump/Hoch = hoch, Down = runter, Links/Rechts = loslassen.
    // -------------------------------------------------------------------
    if (this.isClimbing) {
      if (!this.onRope) {
        this.isClimbing = false;            // oben/unten vom Seil → normal weiter
      } else if (input.left || input.right) {
        // Zur Seite abspringen (Absprung mit Schwung → über Gruben schwingen).
        this.isClimbing = false;
        this.direction = input.left ? Direction.LEFT : Direction.RIGHT;
        this.velX = input.left ? -PLAYER_SPEED : PLAYER_SPEED;
        this.velY = -5;
        this.isJumping = true;
        return;
      } else {
        // An der Seilmitte ausrichten und vertikal klettern.
        this.x += (this.ropeCenterX - (this.x + this.width / 2)) * 0.5;
        this.velX = 0;
        this.velY = input.jump ? -CLIMB_SPEED : (input.down ? CLIMB_SPEED : 0);
        this.isJumping = false;
        this.onGround = false;
        this.isDucking = false;
        this.isSliding = false;
        this.isSkidding = false;
        return;
      }
    } else if (this.onRope && (input.jump || input.down)) {
      // Einklinken: Seil berühren und Hoch/Runter drücken.
      this.isClimbing = true;
      this.velX = 0; this.velY = 0;
      this.x += (this.ropeCenterX - (this.x + this.width / 2)) * 0.5;
      return;
    }

    // -------------------------------------------------------------------
    // Ground-pound: Down + airborne after a brief minimum air-time.
    // While active we force a fast vertical dive, kill horizontal input,
    // and disable wall-slide/jump until landing. The engine watches
    // `groundPoundLandedThisFrame` to spawn the shockwave on impact.
    // -------------------------------------------------------------------
    if (this.isGroundPounding) {
      if (this.onGround) {
        this.isGroundPounding = false;
        this.groundPoundLandedThisFrame = true;
        this.poundLockTimer = GROUND_POUND_LOCK_FRAMES;
        this.velX = 0;
      } else {
        this.velY = GROUND_POUND_SPEED;
        this.velX = 0;
        this.isWallSliding = false;
        this.jumpHeld = false;
        this.airComboCount = 0;
        return;
      }
    }
    if (
      downEdge && !this.onGround && !this.isGroundPounding &&
      this.poundLockTimer === 0 && !this.isWallSliding &&
      this.jumpTimer >= GROUND_POUND_MIN_AIRTIME
    ) {
      this.isGroundPounding = true;
      this.groundPoundJustStartedThisFrame = true;
      this.velY = GROUND_POUND_SPEED;
      this.velX = 0;
      this.jumpHeld = false;
      this.canDoubleJump = false;
      this.airComboCount = 0;
      return;
    }

    const speed = input.run ? PLAYER_RUN_SPEED : PLAYER_SPEED;
    // Ground accel = run-vs-walk; air accel is reduced when the jump was
    // launched at sprint speed (Mario-typical "stay committed" feel) so
    // mid-air direction changes can't fully cancel high horizontal momentum.
    const reducedAir = this.speedAtJump > PLAYER_SPEED;
    const baseAir = reducedAir ? AIR_ACCELERATION_LOCKED : AIR_ACCELERATION;
    const accel = this.onGround
      ? (input.run ? RUN_ACCELERATION : ACCELERATION)
      : baseAir;
    this.isRunning = input.run;

    // Decrement the wall-jump air-control lockout. While > 0, all left/right
    // input is suppressed so the player can't immediately re-grip the wall.
    if (this.airControlLockTimer > 0) this.airControlLockTimer--;
    const canAirControl = this.airControlLockTimer === 0;

    // -------------------------------------------------------------------
    // Wall-slide detection (BEFORE the duck/run branches so wall-jump
    // can override the regular jump path below).
    // -------------------------------------------------------------------
    const prevWallSliding = this.isWallSliding;
    this.isWallSliding = false;
    if (
      !this.onGround &&
      this.velY > 0 &&
      this.wallContactDir !== 0 &&
      !this.isDucking
    ) {
      const pressingTowardsWall =
        (this.wallContactDir === -1 && input.left) ||
        (this.wallContactDir === 1 && input.right);
      if (pressingTowardsWall) {
        this.isWallSliding = true;
        if (this.velY > WALL_SLIDE_MAX_FALL) this.velY = WALL_SLIDE_MAX_FALL;
        if (!prevWallSliding) this.wallSlideStartedThisFrame = true;
      }
    }
    // Wall-slide latch: while sliding, keep the latch refreshed and remember
    // the contact side. After contact ends, the latch decays for a few
    // frames so a jump pressed *just* after slipping off still triggers a
    // wall-jump in the previous direction.
    if (this.isWallSliding) {
      this.wallSlideLatch = 6;
      this.wallSlideLatchDir = this.wallContactDir;
    } else if (this.wallSlideLatch > 0) {
      this.wallSlideLatch--;
      if (this.wallSlideLatch === 0) this.wallSlideLatchDir = 0;
    }

    if (input.down && (this.onGround || this.isDucking)) {
      // Holding Down resets any pending unduck-buffer so a rapid double-tap
      // never sneaks through a half-frame stand-up.
      this.unduckBufferTimer = 0;
      this.wantsUnduck = false;
      if (!this.isDucking) {
        this.isDucking = true;
        // Pick the duck height that matches the current power state so the
        // powered Lea stays clearly larger than the small Lea while crouched.
        const targetH = this.isPoweredUp ? this.poweredDuckHeight : this.duckHeight;
        this.y += this.height - targetH;
        this.height = targetH;
        // SLIDE entry: if we were running fast when ducking started, switch
        // into the momentum-preserving slide instead of the slow crawl.
        if (Math.abs(this.velX) > PLAYER_SPEED) {
          this.isSliding = true;
          this.slideStartedThisFrame = true;
        }
      }
      const crawlTop = PLAYER_SPEED * DUCK_SPEED_MULT;
      // SLIDE auto-exit: once momentum bleeds below crawl-top — OR the
      // player slid off a ledge and is now airborne — hand off to the
      // regular crawl branch on subsequent frames. Exiting on liftoff
      // also stops the engine's per-frame dust trail in mid-air.
      if (this.isSliding && (!this.onGround || Math.abs(this.velX) <= crawlTop)) {
        this.isSliding = false;
      }
      if (this.isSliding) {
        // Weak friction; no input-driven accel — just preserve momentum.
        // Gated on onGround above so we never apply slide-friction in air.
        this.velX *= SLIDE_FRICTION;
        // Facing follows current motion so the slide pose looks right.
        if (this.velX > 0) this.direction = Direction.RIGHT;
        else if (this.velX < 0) this.direction = Direction.LEFT;
      } else {
        // Existing crawl: slow horizontal movement scaled by DUCK_SPEED_MULT.
        const crawlAccel = ACCELERATION * DUCK_SPEED_MULT;
        if (input.left) {
          this.velX -= crawlAccel;
          if (this.velX < -crawlTop) this.velX = -crawlTop;
          this.direction = Direction.LEFT;
        } else if (input.right) {
          this.velX += crawlAccel;
          if (this.velX > crawlTop) this.velX = crawlTop;
          this.direction = Direction.RIGHT;
        } else {
          this.velX *= 0.78;
          if (Math.abs(this.velX) < 0.05) this.velX = 0;
        }
      }
    } else {
      if (this.isDucking) {
        // Unduck-buffer: defer the actual stand-up by a few frames so a
        // rapid Down-tap doesn't cause a half-frame stand-up flicker. The
        // engine still verifies head-room before performUnduck() runs.
        if (this.unduckBufferTimer === 0) this.unduckBufferTimer = 3;
        else this.unduckBufferTimer--;
        if (this.unduckBufferTimer <= 0) {
          this.wantsUnduck = true;
        }
        // Leaving duck also leaves slide.
        this.isSliding = false;
      }

      // -----------------------------------------------------------------
      // SKID detection: pressing the opposite direction at fast ground
      // speed brakes harder than normal accel, set a short pose, and play
      // a SFX once on entry.
      // -----------------------------------------------------------------
      const prevSkidding = this.isSkidding;
      this.isSkidding = false;
      let skidApplied = false;
      if (this.onGround && canAirControl && (input.left || input.right)) {
        const wantDir = input.left ? -1 : 1;
        const movingDir = this.velX > 0 ? 1 : (this.velX < 0 ? -1 : 0);
        const opposing =
          movingDir !== 0 &&
          wantDir !== movingDir &&
          Math.abs(this.velX) > PLAYER_SPEED;
        if (opposing) {
          this.isSkidding = true;
          // Brake by SKID_DECEL_MULT × current accel (clamped to not flip
          // velX past zero in a single frame).
          const brake = accel * SKID_DECEL_MULT;
          const before = this.velX;
          this.velX += wantDir * brake;
          // Don't shoot past zero.
          if (Math.sign(this.velX) === wantDir && Math.sign(before) !== wantDir) {
            this.velX = 0;
          }
          // Face the new direction only AFTER the brake has visibly bitten —
          // either we've been skidding for at least a frame or velX has
          // already shrunk below the original sprint speed. This kills the
          // 1-frame facing flicker on a quick reverse-tap.
          const brakeBit = prevSkidding || Math.abs(this.velX) < Math.abs(before);
          if (brakeBit) {
            this.direction = wantDir < 0 ? Direction.LEFT : Direction.RIGHT;
          }
          skidApplied = true;
          if (!prevSkidding) this.skidStartedThisFrame = true;
        }
      }

      if (!skidApplied && canAirControl && input.left) {
        // Sprint-Auslauf: when the player has just released the run key but
        // still carries sprint-momentum, do NOT hard-cap velX to walk-top
        // (that produces a perceptible jolt). Instead let ground friction
        // bleed it down to the walk-cap. Air-cap stays strict so a floaty
        // sprint-jump still locks horizontal speed.
        if (this.onGround && this.velX < -speed) {
          const fric = this.onIce ? ICE_FRICTION : FRICTION;
          this.velX *= fric;
          if (this.velX > -speed) this.velX = -speed;
        } else {
          this.velX -= accel;
          if (this.velX < -speed) this.velX = -speed;
        }
        this.direction = Direction.LEFT;
      } else if (!skidApplied && canAirControl && input.right) {
        if (this.onGround && this.velX > speed) {
          const fric = this.onIce ? ICE_FRICTION : FRICTION;
          this.velX *= fric;
          if (this.velX < speed) this.velX = speed;
        } else {
          this.velX += accel;
          if (this.velX > speed) this.velX = speed;
        }
        this.direction = Direction.RIGHT;
      } else if (!skidApplied && !input.left && !input.right && canAirControl) {
        // Friction only applies when there is no directional input AND
        // the wall-jump air-control lockout has expired. Without the
        // canAirControl guard, a player who momentarily lets go during
        // the ~8-frame lockout would bleed off the wall-jump impulse —
        // even though gameplay-wise the wall-jump should remain
        // committed. The other two branches already check canAirControl,
        // so this third branch closes the loop and makes the lockout
        // truly impulse-preserving for the entire window.
        // Beim Loslassen am Boden KRÄFTIG abbremsen, damit die Figur fast sofort
        // stehenbleibt statt 2-3 Nachlaufschritte zu machen. Deutlich stärker als
        // die normale Lauf-Reibung; in der Luft und auf Eis bleibt der weiche
        // Auslauf (Eis = rutschig, Luft = Sprung-Momentum).
        const STOP_FRICTION = 0.67;
        const baseFric = this.onGround ? (this.onIce ? ICE_FRICTION : STOP_FRICTION) : AIR_FRICTION;
        this.velX *= baseFric;
        const stopCut = this.onGround && !this.onIce ? 0.45 : 0.05;
        if (Math.abs(this.velX) < stopCut) this.velX = 0;
      }
    }

    // -------------------------------------------------------------------
    // P-meter: charges while the player sprints at near-max ground speed,
    // bleeds slowly otherwise, and snaps back to zero if velocity drops
    // below walk-speed (so a tap of skid kills the charge).
    // -------------------------------------------------------------------
    const sprintingFast =
      input.run && this.onGround &&
      Math.abs(this.velX) >= PLAYER_RUN_SPEED * 0.95 &&
      !this.isDucking;
    if (sprintingFast) {
      if (this.runChargeTimer < P_METER_FRAMES) this.runChargeTimer++;
      if (this.runChargeTimer >= P_METER_FRAMES && !this.isPCharged) {
        this.isPCharged = true;
        this.pChargeJustReadyThisFrame = true;
      }
    } else if (Math.abs(this.velX) < PLAYER_SPEED) {
      this.runChargeTimer = Math.max(0, this.runChargeTimer - 4);
      if (this.runChargeTimer === 0) this.isPCharged = false;
    } else {
      this.runChargeTimer = Math.max(0, this.runChargeTimer - 1);
      if (this.runChargeTimer === 0) this.isPCharged = false;
    }

    // Track peak downward speed while airborne so a hard-fall landing can
    // amplify the squash. Cleared on landing below.
    if (!this.onGround && this.velY > this.peakFallVelY) {
      this.peakFallVelY = this.velY;
    }

    if (this.onGround) {
      this.coyoteTimer = COYOTE_TIME;
      this.isJumping = false;
      this.canDoubleJump = true;
      this.hasDoubleJumped = false;
      if (!this.wasOnGround) {
        this.justLanded = true;
        // Hard-fall (cape-glide drop, ground-pound, long fall) gets a longer
        // and visibly deeper squash; regular hops keep the original 6-frame
        // window so nothing changes for normal jumps.
        const hardLand = this.peakFallVelY > 8;
        this.landingFrame = hardLand ? 12 : 6;
        this.landedThisFrame = true;
        // Landing always resets sprint-jump air-control state and stomp combo.
        this.speedAtJump = 0;
        this.airComboCount = 0;
        this.peakFallVelY = 0;
      }
    } else {
      // Coyote bleed: only step the timer down when the player has been
      // airborne for at least one full frame *without* being in a slide or
      // skid that just lifted off. This makes ledge-drops after a slide or
      // hard-skid a touch more forgiving without changing normal coyote.
      if (this.coyoteTimer > 0) {
        // Use the START-of-frame snapshots: both flags are cleared
        // mid-frame when input changes, so reading the live values here
        // would always be false and the forgiveness would never apply.
        const justLeftViaSlideOrSkid = this.wasOnGround && (prevWasSliding || prevWasSkidding);
        if (!justLeftViaSlideOrSkid) this.coyoteTimer--;
      }
      this.justLanded = false;
    }

    if (input.jumpPressed) {
      this.jumpBufferTimer = JUMP_BUFFER_TIME;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer--;
    }

    // -------------------------------------------------------------------
    // Wall-jump (overrides the normal jump branches when a wall-slide is
    // active OR was active in the last few frames). Forgiveness window:
    // a buffered jump press during a fresh wall-slide also fires, so the
    // player doesn't need frame-perfect timing against the wall.
    // One-way platform drop-through: Down + Jump while standing on a
    // semisolid platform falls through instead of jumping. Setting these
    // to non-jumping values makes the whole jump cascade below no-op.
    if (input.down && input.jumpPressed && this.onGround && this.onOneWayGround) {
      this.dropThrough = true;
      this.dropThroughTimer = 12;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.canDoubleJump = false;
      this.y += 2; // nudge below the platform top so the fall starts cleanly
    }

    // -------------------------------------------------------------------
    // Wall-jump triggers on a *buffered* jump press (JUMP_BUFFER_TIME) so
    // a tap during the lockout still fires the moment the player re-grips
    // the wall — avoids the "input verschluckt" feel. Task #19 extends
    // this further: a 6-frame wallSlideLatch lets a jump pressed just
    // AFTER losing wall contact still fire as a wall-jump in the
    // previous direction. !onGround guards against grounded wall-jumps.
    const wallJumpRequested = input.jumpPressed || this.jumpBufferTimer > 0;
    const activeWallDir: -1 | 0 | 1 =
      (this.isWallSliding && this.wallContactDir !== 0) ? this.wallContactDir
      : (this.wallSlideLatch > 0 && this.wallSlideLatchDir !== 0) ? this.wallSlideLatchDir
      : 0;
    if (wallJumpRequested && activeWallDir !== 0 && !this.onGround) {
      this.velY = PLAYER_JUMP_FORCE * WALL_JUMP_Y_FACTOR;
      this.velX = -activeWallDir * PLAYER_RUN_SPEED * WALL_JUMP_X_FACTOR;
      this.direction = activeWallDir === -1 ? Direction.RIGHT : Direction.LEFT;
      this.isJumping = true;
      this.jumpHeld = true;
      this.jumpTimer = 0;
      this.airControlLockTimer = WALL_JUMP_LOCKOUT_FRAMES;
      this.canDoubleJump = true;
      this.hasDoubleJumped = false;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.speedAtJump = Math.abs(this.velX);
      this.wallJumpedThisFrame = true;
      // Wall-jump resets the stomp combo just like a landing does — the
      // chain only counts within a single airborne arc.
      this.airComboCount = 0;
      this.isWallSliding = false;
      this.wallSlideLatch = 0;
      this.wallSlideLatchDir = 0;
    } else if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      const speedBonus = Math.min(1, Math.abs(this.velX) / PLAYER_RUN_SPEED);
      let jumpForce = PLAYER_JUMP_FORCE - speedBonus * 1.0;
      // P-meter boost: amplify the jump while charged. Force is negative
      // (upward) so we multiply magnitude.
      if (this.isPCharged) {
        jumpForce *= P_METER_JUMP_BOOST;
        // Authentic SMB3 behavior: the boost-jump consumes the P-charge.
        // Without this, a quick land + re-jump would keep granting the
        // boost for free. The player must re-charge by sprinting again.
        this.runChargeTimer = 0;
        this.isPCharged = false;
      }
      this.velY = jumpForce;
      this.isJumping = true;
      this.jumpHeld = true;
      this.jumpTimer = 0;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.speedAtJump = Math.abs(this.velX);
      this.jumpedThisFrame = true;
    } else if (input.jumpPressed && this.doubleJumpUnlocked && !this.onGround && this.canDoubleJump && !this.hasDoubleJumped && this.coyoteTimer <= 0) {
      this.velY = PLAYER_JUMP_FORCE * 0.82;
      this.isJumping = true;
      this.jumpHeld = true;
      this.jumpTimer = 0;
      this.hasDoubleJumped = true;
      this.canDoubleJump = false;
      this.jumpBufferTimer = 0;
      this.doubleJumpedThisFrame = true;
    }

    if (this.isJumping && input.jump && this.jumpHeld) {
      this.jumpTimer++;
      if (this.jumpTimer < VARIABLE_JUMP_FRAMES) {
        const holdForce = PLAYER_JUMP_FORCE * 0.04 * (1 - this.jumpTimer / VARIABLE_JUMP_FRAMES);
        this.velY += holdForce;
      }
    }

    if (this.noJumpCutTimer > 0) this.noJumpCutTimer--;
    if (!input.jump) {
      this.jumpHeld = false;
      // Feder-/Erzwungener-Launch: kurzes Fenster ohne variablen Sprung-Cut,
      // damit die volle Katapult-Höhe erhalten bleibt (auch ohne Sprung halten).
      if (this.noJumpCutTimer <= 0) {
        if (this.velY < -3) {
          this.velY *= 0.55;
        } else if (this.velY < -1.5) {
          this.velY *= 0.7;
        }
      }
    }

    // Ship-it-Dash: kurzer Horizontal-Boost mit Cooldown (überschreibt velX
    // erst NACH der normalen Beschleunigung, damit der Boost hält).
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.dashTimer > 0) this.dashTimer--;
    if (input.dashPressed && this.dashCooldown === 0 && this.dashTimer === 0 && !this.isDucking) {
      this.dashTimer = 9;
      this.dashCooldown = 45;
      this.dashDir = input.right ? 1 : input.left ? -1 : (this.direction === Direction.RIGHT ? 1 : -1);
      this.dashTriggered = true;
    }
    if (this.dashTimer > 0) {
      this.velX = this.dashDir * 13;
      if (!this.onGround && this.velY > 1) this.velY = 1; // kurzer Gleit-Effekt im Flug
      this.dashTrail.unshift({ x: this.x, y: this.y });
      if (this.dashTrail.length > 5) this.dashTrail.pop();
    } else if (this.dashTrail.length > 0) {
      this.dashTrail.pop();
    }

    this.wasOnGround = this.onGround;
  }

  applyGravity() {
    if (this.isDead) return;
    if (this.isClimbing || this.isSwinging || this.isVineSwinging) return; // am Seil/Ring keine Schwerkraft

    // Cape glide: while falling and holding jump with the cape equipped,
    // we replace normal gravity with the much weaker glide gravity AND
    // clamp fall speed to a slow drift. Ground-pound short-circuits the
    // glide so Down-in-air still dives at full speed.
    if (this.isGliding) {
      this.velY += CAPE_GLIDE_GRAVITY;
      if (this.velY > CAPE_GLIDE_MAX_FALL) this.velY = CAPE_GLIDE_MAX_FALL;
      return;
    }

    const absVelY = Math.abs(this.velY);
    let grav: number;

    if (absVelY < APEX_THRESHOLD && this.velY < 0) {
      // Floaty apex NUR beim Aufsteigen/am Sprung-Scheitel (velY < 0) — gibt dem
      // Sprung sein weiches Gefühl. Beim beginnenden FALLEN gilt bewusst die
      // volle Fallgravitation, damit die Figur beim Verlassen einer Block-/
      // Plattform-Kante sofort sauber runterfällt, statt über die Kante zu
      // schweben. (Nutzer-Wunsch: „muss sich anfühlen, als ob sie auf dem Block steht".)
      grav = GRAVITY_APEX;
    } else if (this.velY > 0) {
      grav = this.jumpHeld ? GRAVITY_FALLING * 0.85 : GRAVITY_FALLING;
    } else {
      // MOV-001: spieler-eigene Steig-Gravitation (nicht die geteilte Gegner-
      // GRAVITY), damit „Entfloaten" die Gegner-Physik nicht mitverändert.
      grav = PLAYER_GRAVITY_RISE;
    }

    this.velY += grav;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
  }

  // boost=true means the player was holding jump at the moment of the
  // stomp — Mario's "trampoline" bounce. The boosted bounce is taller and
  // re-arms the variable-jump hold window so the player can prolong the
  // ascent by keeping jump held.
  bounce(boost = false) {
    this.velY = boost ? PLAYER_BOUNCE_FORCE * BOUNCE_BOOST_MULT : PLAYER_BOUNCE_FORCE;
    this.isJumping = true;
    this.canDoubleJump = true;
    this.hasDoubleJumped = false;
    if (boost) {
      this.jumpHeld = true;
      this.jumpTimer = 0;
    }
  }

  die() {
    if (this.invincibleTimer > 0 || this.starTimer > 0) return;
    // Cascade order: Fire → Cape → Powered → Small → Dead. Each tier
    // absorbs one hit before the next is consumed, with a brief i-frame
    // window so the player can recover.
    if (this.hasFire) {
      this.hasFire = false;
      this.invincibleTimer = 90;
      return;
    }
    if (this.hasCape) {
      this.hasCape = false;
      this.invincibleTimer = 90;
      return;
    }
    if (this.isPoweredUp) {
      this.shrink();
      return;
    }
    this.isDead = true;
    this.velY = PLAYER_JUMP_FORCE * 0.8;
    this.velX = 0;
    this.deathTimer = 0;
    // Lose any active gadgets on death.
    this.magnetTimer = 0;
    this.slowTimer = 0;
    this.shieldCharges = 0;
    this.starTimer = 0;
  }

  addScore(points: number) {
    this.score += points;
  }

  addCoin() {
    this.coins++;
    this.score += COIN_VALUE;
  }
}
