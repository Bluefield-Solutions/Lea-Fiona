import {
  BOMB_OMB_FUSE_FRAMES, Direction, EntityType, FIREBALL_LIFETIME,
  FIREBALL_SPEED, GRAVITY, MAGIC_BOLT_AMP, MAGIC_BOLT_FREQ,
  MAGIC_BOLT_LIFETIME, MAGIC_BOLT_SPEED, MAX_FALL_SPEED, PLAYER_FIREBALL_BOUNCE,
  PLAYER_FIREBALL_GRAVITY, PLAYER_FIREBALL_LIFETIME, PLAYER_FIREBALL_SPEED, WIZARD_CAST_INTERVAL,
  WIZARD_TELEPORT_FADE, WIZARD_TELEPORT_INTERVAL, WIZARD_TELEPORT_RANGE,
  COCONUT_GRAVITY, COCONUT_LIFETIME, COCONUT_SPEED,
  SNOWBALL_GROW_RATE, SNOWBALL_LIFETIME, SNOWBALL_MAX_SIZE, SNOWBALL_SPEED, SNOWBALL_START_SIZE,
  UFO_LASER_LIFETIME, UFO_LASER_SPEED,
} from '../constants';
import { Entity } from './base';

export class Fireball extends Entity {
  lifetime = FIREBALL_LIFETIME;
  variant: 'fire' | 'ice' | 'plasma';

  constructor(x: number, y: number, variant: 'fire' | 'ice' | 'plasma' = 'fire') {
    super(x, y, 18, 18, EntityType.FIREBALL);
    this.velY = FIREBALL_SPEED;
    this.variant = variant;
  }

  update(dt: number) {
    super.update(dt);
    this.velY = Math.min(MAX_FALL_SPEED, this.velY + GRAVITY * 0.5);
    this.lifetime--;
    if (this.lifetime <= 0) this.alive = false;
  }
}

// Magier (Wizard) — stands on the ground, periodically casts a sinusoidal
// MagicBolt aimed at the player, and teleports a short distance from time
// to time. Stompable like a Goomba.

export class Wizard extends Entity {
  homeX: number;
  homeY: number;
  castTimer = 0;
  teleportTimer = 0;
  // 0 = visible. >0 = mid-teleport (fading out / in). Engine reads this
  // for the alpha. We split the window into out → relocate → in.
  teleportPhase = 0;
  isDead = false;
  deadTimer = 0;
  // Set true for ONE frame when the wizard fires a bolt; engine spawns the
  // MagicBolt entity and then resets this flag.
  castedThisFrame = false;
  active = false;
  activateDistance = 360;

  constructor(x: number, y: number) {
    super(x, y, 32, 40, EntityType.WIZARD);
    this.homeX = x;
    this.homeY = y;
    this.castTimer = WIZARD_CAST_INTERVAL * (0.4 + Math.random() * 0.6);
    this.teleportTimer = WIZARD_TELEPORT_INTERVAL * (0.5 + Math.random() * 0.5);
  }

  activate(playerX: number) {
    if (!this.active && Math.abs(playerX - this.x) < this.activateDistance) {
      this.active = true;
    }
  }

  update(dt: number) {
    super.update(dt);
    this.castedThisFrame = false;
    if (this.isDead) {
      this.deadTimer++;
      if (this.deadTimer > 24) this.alive = false;
      return;
    }
    // Gravity is applied by physics.moveEntity (same as Goomba). The wizard
    // doesn't walk — velX stays 0 — but gravity pins him to the ground.
    this.velY = Math.min(MAX_FALL_SPEED, this.velY + GRAVITY);

    if (this.teleportPhase > 0) {
      this.teleportPhase--;
      // Mid-window: relocate. teleportPhase counts down from 2*FADE.
      if (this.teleportPhase === WIZARD_TELEPORT_FADE) {
        const offset = (Math.random() * 2 - 1) * WIZARD_TELEPORT_RANGE;
        this.x = this.homeX + offset;
        this.y = this.homeY;
      }
      return;
    }
    if (!this.active) return;

    this.castTimer--;
    this.teleportTimer--;
    if (this.teleportTimer <= 0) {
      this.teleportPhase = WIZARD_TELEPORT_FADE * 2;
      this.teleportTimer = WIZARD_TELEPORT_INTERVAL;
      return;
    }
    if (this.castTimer <= 0) {
      this.castedThisFrame = true;
      this.castTimer = WIZARD_CAST_INTERVAL;
    }
  }

  // Engine calls this when a stomp lands on the wizard (or he's killed by
  // a shockwave / star). Same lifecycle as Goomba — brief death pose then
  // removal.
  stomp() {
    this.isDead = true;
    this.deadTimer = 0;
    this.velY = 0;
  }

  // 0..1 alpha for rendering during the teleport fade.
  get teleportAlpha(): number {
    if (this.teleportPhase === 0) return 1;
    const half = WIZARD_TELEPORT_FADE;
    if (this.teleportPhase > half) {
      // Fading OUT: phase goes 2*half → half.
      return (this.teleportPhase - half) / half;
    }
    // Fading IN: phase goes half → 0, alpha 0 → 1.
    return 1 - this.teleportPhase / half;
  }
}

// Sinusoidal magic projectile cast by Wizards. Hazard on touch.
// Killed by Star-mode contact or by leaving the world.

export class MagicBolt extends Entity {
  startY: number;
  flyTimer = 0;
  lifetime = MAGIC_BOLT_LIFETIME;

  constructor(x: number, y: number, dir: Direction) {
    super(x, y, 18, 18, EntityType.MAGIC_BOLT);
    this.direction = dir;
    this.velX = dir === Direction.LEFT ? -MAGIC_BOLT_SPEED : MAGIC_BOLT_SPEED;
    this.startY = y;
  }

  update(dt: number) {
    super.update(dt);
    this.flyTimer++;
    this.x += this.velX;
    this.y = this.startY + Math.sin(this.flyTimer * MAGIC_BOLT_FREQ) * MAGIC_BOLT_AMP;
    this.lifetime--;
    if (this.lifetime <= 0) this.alive = false;
  }

  // Reset for object pooling.
  reset(x: number, y: number, dir: Direction) {
    this.x = x;
    this.y = y;
    this.width = 18;
    this.height = 18;
    this.direction = dir;
    this.velX = dir === Direction.LEFT ? -MAGIC_BOLT_SPEED : MAGIC_BOLT_SPEED;
    this.velY = 0;
    this.startY = y;
    this.flyTimer = 0;
    this.lifetime = MAGIC_BOLT_LIFETIME;
    this.alive = true;
    this.frame = 0;
  }
}

// ===========================================================================
// PlayerFireball: short-lived projectile thrown by the player while holding
// the Fire-Flower power-up. Bounces along the ground until its lifetime
// runs out or it strikes an enemy. Pooled by the engine.
// ===========================================================================

export class PlayerFireball extends Entity {
  lifetime = PLAYER_FIREBALL_LIFETIME;

  constructor(x: number, y: number, dir: Direction) {
    super(x, y, 16, 16, EntityType.PLAYER_FIREBALL);
    this.direction = dir;
    this.velX = dir === Direction.LEFT ? -PLAYER_FIREBALL_SPEED : PLAYER_FIREBALL_SPEED;
    this.velY = 0;
  }

  update(dt: number) {
    super.update(dt);
    this.velY += PLAYER_FIREBALL_GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
    this.lifetime--;
    if (this.lifetime <= 0) this.alive = false;
  }

  // Engine calls this on solid-ground contact to bounce the ball.
  bounce() {
    this.velY = PLAYER_FIREBALL_BOUNCE;
  }

  // Reset for object pooling: re-use a dead instance instead of allocating.
  reset(x: number, y: number, dir: Direction) {
    this.x = x;
    this.y = y;
    this.width = 16;
    this.height = 16;
    this.direction = dir;
    this.velX = dir === Direction.LEFT ? -PLAYER_FIREBALL_SPEED : PLAYER_FIREBALL_SPEED;
    this.velY = 0;
    this.lifetime = PLAYER_FIREBALL_LIFETIME;
    this.alive = true;
    this.frame = 0;
    this.onGround = false;
  }
}


// ===========================================================================
// Theme-Projektile (Task #18): Coconut, Snowball, UFO-Laser
// ===========================================================================

// Vom Affen geworfene Kokosnuss — ballistische Bahn, Schaden bei Kontakt.
// Bewegung erfolgt extern über physics.moveEntity (entity_step.ts), so
// dass Wände und Decken die Frucht stoppen statt sie passieren zu lassen.
export class Coconut extends Entity {
  lifetime = COCONUT_LIFETIME;
  spin = 0;

  constructor(x: number, y: number, dir: Direction) {
    super(x, y, 16, 16, EntityType.COCONUT);
    this.direction = dir;
    this.velX = (dir === Direction.LEFT ? -1 : 1) * COCONUT_SPEED;
    this.velY = -3.8;
  }

  update(_dt: number) {
    this.velY = Math.min(MAX_FALL_SPEED, this.velY + COCONUT_GRAVITY);
    this.spin += 0.3;
    this.lifetime--;
    if (this.lifetime <= 0) this.alive = false;
  }
}

// Vom Yeti gerollter Schneeball — fällt zum Boden, rollt dann horizontal
// weiter und wächst dabei. Echte Tile-Kollisionen via physics.moveEntity.
export class Snowball extends Entity {
  lifetime = SNOWBALL_LIFETIME;
  size = SNOWBALL_START_SIZE;
  spin = 0;
  rolling = false;

  constructor(x: number, y: number, dir: Direction) {
    super(x, y, SNOWBALL_START_SIZE, SNOWBALL_START_SIZE, EntityType.SNOWBALL);
    this.direction = dir;
    this.velX = (dir === Direction.LEFT ? -1 : 1) * SNOWBALL_SPEED;
  }

  update(_dt: number) {
    // Schwerkraft solange wir noch in der Luft sind. Sobald der Boden
    // erreicht ist (rolling=true, gesetzt im entity_step nach hitFloor),
    // fällt der Schneeball nicht mehr — er rollt nur noch.
    if (!this.rolling) {
      this.velY = Math.min(MAX_FALL_SPEED, this.velY + GRAVITY * 0.4);
    } else {
      this.velY = 1; // sanftes Andrücken an den Boden, falls eine Stufe fällt
      // Wachstum nur während des Rollens — typisches Schneeball-Verhalten.
      if (this.size < SNOWBALL_MAX_SIZE) {
        this.size = Math.min(SNOWBALL_MAX_SIZE, this.size + SNOWBALL_GROW_RATE);
        const newSize = Math.round(this.size);
        // Von unten wachsen lassen, damit der Ball auf dem Boden bleibt.
        this.y -= newSize - this.height;
        this.width = newSize;
        this.height = newSize;
      }
    }
    // Spin-Geschwindigkeit hängt von der horizontalen Bewegung ab.
    this.spin += this.velX * 0.05;
    this.lifetime--;
    if (this.lifetime <= 0) this.alive = false;
  }
}

// Vom Mini-UFO abgefeuerter Laser — fällt senkrecht herab. Stirbt beim
// Auftreffen auf Boden (siehe entity_step.ts).
export class UFOLaser extends Entity {
  lifetime = UFO_LASER_LIFETIME;

  constructor(x: number, y: number) {
    super(x, y, 6, 22, EntityType.UFO_LASER);
    this.velY = UFO_LASER_SPEED;
  }

  update(_dt: number) {
    this.lifetime--;
    if (this.lifetime <= 0) this.alive = false;
  }
}
