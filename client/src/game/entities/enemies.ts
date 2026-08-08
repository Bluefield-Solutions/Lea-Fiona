import {
  BAT_FLY_AMPLITUDE, BAT_FLY_SPEED, BAT_SPEED, BOMB_EXPLOSION_FRAMES,
  BOMB_OMB_SPEED, SPIKE_BALL_SPEED,
  BOSS_SPEED, BOSS_HP, BOSS_W, BOSS_H, BOSS_HIT_STUN, BOSS_JUMP_FORCE, BOSS_JUMP_INTERVAL, BOSS_THROW_INTERVAL,
  BOMB_OMB_FUSE_FRAMES, CRAB_SPEED, Direction, ENEMY_SPEED,
  EntityType, FISH_FLY_AMPLITUDE, FISH_FLY_SPEED, FISH_SPEED,
  GHOST_FLY_AMPLITUDE, GHOST_FLY_SPEED, GHOST_SPEED, GRAVITY,
  HORNET_AGGRO_RANGE, HORNET_AMPLITUDE, HORNET_DIVE_SPEED, HORNET_FLY_SPEED,
  HORNET_SPEED, JELLYFISH_FLY_AMPLITUDE, JELLYFISH_FLY_SPEED, JELLYFISH_SPEED,
  KANGAROO_JUMP_FORCE, KANGAROO_JUMP_INTERVAL, KANGAROO_SPEED, MAX_FALL_SPEED,
  PIRANHA_HIDE_TIME, PIRANHA_SHOW_TIME, SNAKE_SPEED, SPIDER_DROP_SPEED,
  SPIDER_SPEED, SPIKE_BALL_ROLL_RATE, TILE_SIZE,
  BANZAI_BILL_SPEED, BANZAI_BILL_SIZE, BANZAI_BILL_AGGRO_RANGE,
  CHUCK_WALK_SPEED, CHUCK_CHARGE_SPEED, CHUCK_AGGRO_RANGE,
  CHUCK_HITS_TO_KILL, CHUCK_STUN_FRAMES,
  BIG_BOO_SPEED, BIG_BOO_SIZE, BIG_BOO_ACTIVATE_DISTANCE,
  APE_THROW_INTERVAL, APE_AGGRO_RANGE,
  SEAGULL_SPEED, SEAGULL_AMPLITUDE, SEAGULL_FLY_SPEED, SEAGULL_DIVE_SPEED, SEAGULL_AGGRO_RANGE,
  LAVA_SLIME_HOP_INTERVAL, LAVA_SLIME_HOP_FORCE, LAVA_SLIME_SPEED,
  YETI_SPEED, YETI_THROW_INTERVAL, YETI_AGGRO_RANGE, YETI_HITS_TO_KILL, YETI_STUN_FRAMES,
  BABY_DRAGON_SPEED, BABY_DRAGON_JUMP_FORCE, BABY_DRAGON_JUMP_INTERVAL, BABY_DRAGON_AGGRO,
  DRAGON_EGG_HATCH_RANGE, DRAGON_EGG_CRACK_FRAMES,
  KNIGHT_SPEED, KNIGHT_HITS_TO_KILL, KNIGHT_STUN_FRAMES,
  MINI_UFO_SPEED, MINI_UFO_HOVER_HEIGHT, MINI_UFO_LASER_INTERVAL, MINI_UFO_AGGRO_RANGE,
} from '../constants';
import { Entity } from './base';

export class Goomba extends Entity {
  isDead = false;
  deadTimer = 0;
  edgeBehavior = true;

  constructor(x: number, y: number) {
    super(x, y, 28, 28, EntityType.GOOMBA);
    this.direction = Direction.LEFT;
    this.velX = -ENEMY_SPEED;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      if (this.deadTimer > 30) this.alive = false;
      return;
    }

    this.velX = this.direction === Direction.LEFT ? -ENEMY_SPEED : ENEMY_SPEED;
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
  }

  stomp() {
    this.isDead = true;
    this.hitFlash = 7;
    this.velX = 0;
    this.deadTimer = 0;
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = -this.velX;
  }
}


export class Boss extends Entity {
  isDead = false;
  deadTimer = 0;
  edgeBehavior = true;
  hp = BOSS_HP;
  maxHp = BOSS_HP;
  hitStun = 0;
  jumpTimer = BOSS_JUMP_INTERVAL;
  throwTimer = BOSS_THROW_INTERVAL;
  throwThisFrame = false;
  windupTimer = 0;                 // Telegraphing (v404)
  static readonly WINDUP = 18;
  // Landungs-Erkennung für den Sprung-Stampfer (Drachen-Boss, Welt 16).
  prevOnGround = true;

  constructor(x: number, y: number) {
    super(x, y, BOSS_W, BOSS_H, EntityType.BOSS);
    this.direction = Direction.LEFT;
    this.velX = -BOSS_SPEED;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      if (this.deadTimer > 46) this.alive = false;
      return;
    }
    if (this.hitStun > 0) this.hitStun--;
    // Phasen: mit jedem Treffer schneller und aggressiver (0..2).
    const phase = this.maxHp - this.hp;
    const spd = BOSS_SPEED * (1 + phase * 0.45);
    this.velX = this.direction === Direction.LEFT ? -spd : spd;
    // Sprung-Attacke — häufiger in höheren Phasen.
    if (this.jumpTimer > 0) this.jumpTimer--;
    if (this.onGround && this.jumpTimer <= 0) {
      this.velY = -BOSS_JUMP_FORCE;
      this.jumpTimer = Math.max(45, BOSS_JUMP_INTERVAL - phase * 32);
    }
    // Projektil-Wurf („Fehler") — häufiger in höheren Phasen.
    this.throwThisFrame = false;
    if (this.throwTimer > 0) this.throwTimer--;
    // Windup-Fenster kurz vor dem Wurf (throwTimer zählt runter → 0).
    this.windupTimer = (this.throwTimer > 0 && this.throwTimer <= Boss.WINDUP) ? this.throwTimer : 0;
    if (this.throwTimer <= 0) {
      this.throwThisFrame = true;
      this.windupTimer = 0;
      this.throwTimer = Math.max(75, BOSS_THROW_INTERVAL - phase * 42);
    }
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
  }

  /** Treffer von oben. Gibt true zurück, wenn der Boss dadurch besiegt wird.
   *  Während der i-frames (hitStun) zählt kein weiterer Treffer. */
  stomp(): boolean {
    if (this.hitStun > 0) return false;
    this.hp--;
    this.hitFlash = 10;
    this.hitStun = BOSS_HIT_STUN;
    if (this.hp <= 0) {
      this.isDead = true;
      this.velX = 0;
      this.deadTimer = 0;
      return true;
    }
    return false;
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = -this.velX;
  }
}


export class Koopa extends Entity {
  isShell = false;
  shellMoving = false;
  // Anzahl Gegner, die dieser Panzer seit dem letzten Kick abgeräumt hat
  // (für die Combo-/Bonuspunkte-Kette). Wird bei jedem neuen Kick zurückgesetzt.
  shellCombo = 0;
  shellSpeed = 9; // > PLAYER_RUN_SPEED (7.5): der gekickte Panzer entkommt der
                  // rennenden Figur, statt von ihr eingeholt zu werden.
  // Kurze Schonfrist nach einem Kick: in diesen Frames trifft der gerade
  // weggeschubste Panzer die Figur nicht (sonst tötet er sie, während er sich
  // noch aus ihr herausbewegt).
  kickGrace = 0;

  constructor(x: number, y: number) {
    super(x, y, 28, 36, EntityType.KOOPA);
    this.direction = Direction.LEFT;
    this.velX = -ENEMY_SPEED;
  }

  update(dt: number) {
    super.update(dt);
    if (this.kickGrace > 0) this.kickGrace--;
    if (this.isShell) {
      if (this.shellMoving) {
        this.velX = this.direction === Direction.LEFT ? -this.shellSpeed : this.shellSpeed;
      } else {
        this.velX *= 0.95;
        if (Math.abs(this.velX) < 0.1) this.velX = 0;
      }
    } else {
      this.velX = this.direction === Direction.LEFT ? -ENEMY_SPEED : ENEMY_SPEED;
    }
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
  }

  stomp() {
    if (this.isShell && !this.shellMoving) {
      this.shellMoving = true;
      return;
    }
    if (this.isShell && this.shellMoving) {
      this.shellMoving = false;
      this.velX = 0;
      return;
    }
    this.isShell = true;
    this.shellMoving = false;
    this.velX = 0;
    this.height = 24;
    this.y += 12;
  }

  kick(dir: Direction) {
    this.shellMoving = true;
    this.direction = dir;
    this.kickGrace = 16;
    this.shellCombo = 0;   // frische Kette bei jedem neuen Tritt
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = -this.velX;
  }
}


export class Bat extends Entity {
  startY: number;
  flyTimer = 0;
  active = false;
  activateDistance = 250;
  // Sanft-Modus (Plüsch-Flatterdino): langsamer + kleinere Flugwelle, damit
  // der fliegende Gegner für ein kleines Kind gut vorhersehbar bleibt.
  gentle = false;

  constructor(x: number, y: number) {
    super(x, y, 28, 22, EntityType.BAT);
    this.startY = y;
    this.direction = Direction.LEFT;
  }

  update(dt: number) {
    super.update(dt);
    if (!this.active) return;

    this.flyTimer += this.gentle ? BAT_FLY_SPEED * 0.7 : BAT_FLY_SPEED;
    const amp = this.gentle ? BAT_FLY_AMPLITUDE * 0.6 : BAT_FLY_AMPLITUDE;
    this.y = this.startY + Math.sin(this.flyTimer) * amp;
    const speed = this.gentle ? BAT_SPEED * 0.55 : BAT_SPEED;
    this.velX = this.direction === Direction.LEFT ? -speed : speed;
    this.x += this.velX;
  }

  activate(playerX: number) {
    if (!this.active && Math.abs(playerX - this.x) < this.activateDistance) {
      this.active = true;
      this.direction = playerX < this.x ? Direction.LEFT : Direction.RIGHT;
    }
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
  }
}


export class PiranhaPlant extends Entity {
  pipeX: number;
  pipeTopY: number;
  hideTimer = 0;
  showTimer = 0;
  isHiding = true;
  emergeOffset = 0;
  maxEmerge = 28;
  isDead = false;
  deadTimer = 0;
  playerNear = false;

  constructor(pipeCol: number, pipeTopRow: number) {
    const pipeCenter = pipeCol * TILE_SIZE + TILE_SIZE;
    const plantW = 48;
    const x = pipeCenter - plantW / 2;
    const y = pipeTopRow * TILE_SIZE;
    super(x, y, plantW, 40, EntityType.PIRANHA);
    this.pipeX = pipeCol * TILE_SIZE;
    this.pipeTopY = pipeTopRow * TILE_SIZE;
    this.maxEmerge = 38;
    this.hideTimer = PIRANHA_HIDE_TIME * Math.random();
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      this.emergeOffset = Math.max(0, this.emergeOffset - 2);
      this.y = this.pipeTopY - this.emergeOffset;
      if (this.deadTimer > 24) this.alive = false;
      return;
    }
    if (this.isHiding) {
      this.hideTimer++;
      this.emergeOffset = Math.max(0, this.emergeOffset - 0.8);
      if (this.hideTimer >= PIRANHA_HIDE_TIME) {
        this.isHiding = false;
        this.showTimer = 0;
      }
    } else {
      this.showTimer++;
      this.emergeOffset = Math.min(this.maxEmerge, this.emergeOffset + 0.8);
      if (this.showTimer >= PIRANHA_SHOW_TIME) {
        this.isHiding = true;
        this.hideTimer = 0;
      }
    }
    // Player standing on / next to the pipe: retract and wait. Overrides the
    // timed cycle so the plant never spears someone who lands on the pipe rim.
    if (this.playerNear) {
      this.emergeOffset = Math.max(0, this.emergeOffset - 2.5);
      this.isHiding = true;
      this.hideTimer = 0;
      this.showTimer = 0;
    }
    this.y = this.pipeTopY - this.emergeOffset;
  }

  // Called each frame with the player's centre-x so the plant can sense when
  // the player is over the pipe and stay tucked away.
  sensePlayer(playerCenterX: number) {
    const pipeCenter = this.pipeX + TILE_SIZE;
    this.playerNear = Math.abs(playerCenterX - pipeCenter) < TILE_SIZE * 1.6;
  }

  // Player can stomp the plant only if the plant is not fully extended
  // and the player lands cleanly on top.
  stomp() {
    this.isDead = true;
    this.hitFlash = 7;
    this.deadTimer = 0;
  }

  get isExposed(): boolean {
    return !this.isDead && this.emergeOffset > 12;
  }
}


export class Spider extends Entity {
  startY: number;
  dropping = false;
  returning = false;
  activateDistance = 180;
  webLength = 0;
  maxWebLength = 120;
  active = false;

  constructor(x: number, y: number) {
    super(x, y, 20, 20, EntityType.SPIDER);
    this.startY = y;
  }

  update(dt: number) {
    super.update(dt);
    if (!this.active) return;

    if (this.dropping) {
      this.velY = SPIDER_DROP_SPEED;
      this.y += this.velY;
      this.webLength = this.y - this.startY;
      if (this.webLength >= this.maxWebLength) {
        this.dropping = false;
        this.returning = true;
      }
    } else if (this.returning) {
      this.y -= SPIDER_SPEED;
      this.webLength = this.y - this.startY;
      if (this.y <= this.startY) {
        this.y = this.startY;
        this.returning = false;
        this.active = false;
      }
    }
  }

  activate(playerX: number) {
    if (!this.active && !this.dropping && !this.returning && Math.abs(playerX - this.x) < this.activateDistance) {
      this.active = true;
      this.dropping = true;
    }
  }
}


export class Crab extends Entity {
  isDead = false;
  deadTimer = 0;
  edgeBehavior = true;
  isAngry = false;
  hitCount = 0;
  hurtCooldown = 0;

  constructor(x: number, y: number) {
    super(x, y, 30, 22, EntityType.CRAB);
    this.direction = Direction.LEFT;
    this.velX = -CRAB_SPEED;
  }

  update(dt: number) {
    super.update(dt);
    if (this.hurtCooldown > 0) this.hurtCooldown--;
    if (this.isDead) {
      this.deadTimer++;
      if (this.deadTimer > 30) this.alive = false;
      return;
    }
    const speed = this.isAngry ? CRAB_SPEED * 1.8 : CRAB_SPEED;
    this.velX = this.direction === Direction.LEFT ? -speed : speed;
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
  }

  // Returns whether the stomp actually applied (i.e. cooldown allowed it).
  stomp(): boolean {
    if (this.hurtCooldown > 0) return false;
    if (!this.isAngry) {
      this.isAngry = true;
      this.hitCount++;
      this.hurtCooldown = 30;
      return true;
    }
    this.isDead = true;
    this.hitFlash = 7;
    this.velX = 0;
    this.deadTimer = 0;
    return true;
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = -this.velX;
  }
}


export class Jellyfish extends Entity {
  startY: number;
  flyTimer = 0;
  active = false;
  activateDistance = 280;

  constructor(x: number, y: number) {
    super(x, y, 24, 26, EntityType.JELLYFISH);
    this.startY = y;
    this.direction = Direction.LEFT;
  }

  update(dt: number) {
    super.update(dt);
    if (!this.active) return;
    this.flyTimer += JELLYFISH_FLY_SPEED;
    this.y = this.startY + Math.sin(this.flyTimer) * JELLYFISH_FLY_AMPLITUDE;
    this.velX = this.direction === Direction.LEFT ? -JELLYFISH_SPEED : JELLYFISH_SPEED;
    this.x += this.velX;
  }

  activate(playerX: number) {
    if (!this.active && Math.abs(playerX - this.x) < this.activateDistance) {
      this.active = true;
      this.direction = playerX < this.x ? Direction.LEFT : Direction.RIGHT;
    }
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
  }
}


export class Kangaroo extends Entity {
  isDead = false;
  deadTimer = 0;
  jumpTimer = 0;
  edgeBehavior = true;
  // Sanft-Modus (nur Plüsch-Welt): kleinere, seltenere, langsamere Hüpfer,
  // damit der Gegner für ein sehr kleines Kind gut vorhersehbar bleibt. Wird
  // beim Spawnen gesetzt; Australien-Kängurus bleiben unverändert.
  gentle = false;

  constructor(x: number, y: number) {
    super(x, y, 34, 50, EntityType.KANGAROO);
    this.direction = Direction.LEFT;
    this.velX = -KANGAROO_SPEED;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      if (this.deadTimer > 30) this.alive = false;
      return;
    }
    const speed = this.gentle ? KANGAROO_SPEED * 0.6 : KANGAROO_SPEED;
    const jumpForce = this.gentle ? KANGAROO_JUMP_FORCE * 0.7 : KANGAROO_JUMP_FORCE;
    const jumpInterval = this.gentle ? KANGAROO_JUMP_INTERVAL * 1.4 : KANGAROO_JUMP_INTERVAL;
    this.velX = this.direction === Direction.LEFT ? -speed : speed;
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
    if (this.onGround) {
      this.jumpTimer++;
      if (this.jumpTimer >= jumpInterval) {
        this.velY = jumpForce;
        this.jumpTimer = 0;
        this.onGround = false;
      }
    }
  }

  stomp() {
    this.isDead = true;
    this.hitFlash = 7;
    this.velX = 0;
    this.deadTimer = 0;
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = -this.velX;
  }
}


export class Snake extends Entity {
  isDead = false;
  deadTimer = 0;
  edgeBehavior = true;

  constructor(x: number, y: number) {
    super(x, y, 32, 16, EntityType.SNAKE);
    this.direction = Direction.LEFT;
    this.velX = -SNAKE_SPEED;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      if (this.deadTimer > 30) this.alive = false;
      return;
    }
    this.velX = this.direction === Direction.LEFT ? -SNAKE_SPEED : SNAKE_SPEED;
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
  }

  stomp() {
    this.isDead = true;
    this.hitFlash = 7;
    this.velX = 0;
    this.deadTimer = 0;
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = -this.velX;
  }
}

export class Ghost extends Entity {
  startY: number;
  flyTimer = 0;
  active = false;
  activateDistance = 320;
  variant: 'castle' | 'space';

  constructor(x: number, y: number, variant: 'castle' | 'space' = 'castle') {
    super(x, y, 28, 28, EntityType.GHOST);
    this.startY = y;
    this.variant = variant;
    this.direction = Direction.LEFT;
  }

  update(dt: number) {
    super.update(dt);
    if (!this.active) return;
    this.flyTimer += GHOST_FLY_SPEED;
    this.y = this.startY + Math.sin(this.flyTimer) * GHOST_FLY_AMPLITUDE;
    this.velX = this.direction === Direction.LEFT ? -GHOST_SPEED : GHOST_SPEED;
    this.x += this.velX;
  }

  activate(playerX: number) {
    if (!this.active && Math.abs(playerX - this.x) < this.activateDistance) {
      this.active = true;
      this.direction = playerX < this.x ? Direction.LEFT : Direction.RIGHT;
    }
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
  }
}

// Sinusoidal swimmer used in underwater levels.

export class Fish extends Entity {
  startY: number;
  flyTimer = 0;
  active = false;
  activateDistance = 280;

  constructor(x: number, y: number) {
    super(x, y, 28, 18, EntityType.FISH);
    this.startY = y;
    this.direction = Direction.LEFT;
  }

  update(dt: number) {
    super.update(dt);
    if (!this.active) return;
    this.flyTimer += FISH_FLY_SPEED;
    this.y = this.startY + Math.sin(this.flyTimer) * FISH_FLY_AMPLITUDE;
    this.velX = this.direction === Direction.LEFT ? -FISH_SPEED : FISH_SPEED;
    this.x += this.velX;
  }

  activate(playerX: number) {
    if (!this.active && Math.abs(playerX - this.x) < this.activateDistance) {
      this.active = true;
      this.direction = playerX < this.x ? Direction.LEFT : Direction.RIGHT;
    }
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
  }
}

// Bomb-Omb: walks like a Goomba. Stomp does NOT kill — it lights the fuse.
// After BOMB_OMB_FUSE_FRAMES the engine spawns a BombExplosion at the
// Bomb-Omb's centre. Touching an unlit Bomb-Omb hurts the player.

export class BombOmb extends Entity {
  isDead = false;
  deadTimer = 0;
  isLit = false;
  fuseTimer = 0;
  edgeBehavior = true;

  constructor(x: number, y: number) {
    super(x, y, 30, 30, EntityType.BOMB_OMB);
    this.direction = Direction.LEFT;
    this.velX = -BOMB_OMB_SPEED;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      if (this.deadTimer > 24) this.alive = false;
      return;
    }
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
    if (this.isLit) {
      // Once lit the bomb stops walking and just shudders in place while
      // the fuse burns down. Engine watches `shouldExplode` to detonate.
      this.velX = 0;
      this.fuseTimer++;
    }
  }

  // Player stomped this bomb — light the fuse instead of dying.
  light() {
    if (this.isLit || this.isDead) return;
    this.isLit = true;
    this.fuseTimer = 0;
  }

  // Engine reads this once per frame; when true it spawns the explosion
  // and removes the bomb. Doesn't fire on already-dead bombs.
  get shouldExplode(): boolean {
    return this.isLit && this.fuseTimer >= BOMB_OMB_FUSE_FRAMES && !this.isDead;
  }

  reverseDirection() {
    if (this.isLit) return;
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = this.direction === Direction.LEFT ? -BOMB_OMB_SPEED : BOMB_OMB_SPEED;
  }

  // Fraction 0..1 of fuse burned. Renderer uses this to flash faster
  // as the timer runs out.
  get fuseFraction(): number {
    return this.isLit ? Math.min(1, this.fuseTimer / BOMB_OMB_FUSE_FRAMES) : 0;
  }
}

// Short-lived explosion sphere created by a Bomb-Omb detonation. Pure
// hazard for the player but kills enemies in radius (engine handles).

export class BombExplosion extends Entity {
  age = 0;
  maxAge = BOMB_EXPLOSION_FRAMES;

  constructor(x: number, y: number) {
    // Sized so the AABB covers the visual blast radius. Position is
    // centre-anchored — engine passes the bomb's centre.
    const size = 96;
    super(x - size / 2, y - size / 2, size, size, EntityType.BOMB_EXPLOSION);
  }

  update(dt: number) {
    super.update(dt);
    this.age++;
    if (this.age >= this.maxAge) this.alive = false;
  }

  // 0..1 progress for renderer easing.
  get progress(): number {
    return Math.min(1, this.age / this.maxAge);
  }
}

// Stachelkugel (Spike Ball) — heavy rolling enemy. Cannot be stomped: top
// contact damages the player like a side hit. Falls off ledges (no edge
// behaviour). Killed only by PlayerFireball, BombExplosion, star-mode
// contact, or shells. `roll` is a renderer-only spin angle accumulated
// from horizontal motion so the spikes visibly rotate.

export class SpikeBall extends Entity {
  isDead = false;
  deadTimer = 0;
  edgeBehavior = false;
  roll = 0;

  constructor(x: number, y: number) {
    super(x, y, 32, 32, EntityType.SPIKE_BALL);
    this.direction = Direction.LEFT;
    this.velX = -SPIKE_BALL_SPEED;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      this.velY += GRAVITY * 0.5;
      this.y += this.velY;
      if (this.deadTimer > 40) this.alive = false;
      return;
    }
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
    // Spin proportional to forward movement (visual flair only).
    this.roll += (this.velX / SPIKE_BALL_SPEED) * SPIKE_BALL_ROLL_RATE;
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = this.direction === Direction.LEFT ? -SPIKE_BALL_SPEED : SPIKE_BALL_SPEED;
  }
}

// ===========================================================================
// Hornisse (Hornet)
// Sine-wave flier. Picks an idle drift direction at spawn. When the player
// enters HORNET_AGGRO_RANGE the hornet abandons its sine path and dives
// toward the player — at HORNET_DIVE_SPEED on the X axis and a strong
// downward push. Stompable from above; contact damages otherwise.
// ===========================================================================

export class Hornet extends Entity {
  isDead = false;
  deadTimer = 0;
  startY: number;
  flyTimer = 0;
  diving = false;
  // Re-evaluated each frame against the player position by the engine
  // before update() is called. Stored on the entity so the engine can
  // pass the player ref through `chase(playerCenterX, playerCenterY)`.
  private targetX = 0;
  private targetY = 0;
  private targetingValid = false;

  constructor(x: number, y: number) {
    super(x, y, 32, 28, EntityType.HORNET);
    this.startY = y;
    this.direction = Direction.LEFT;
    this.velX = -HORNET_SPEED;
    this.velY = 0;
  }

  // Engine pushes the latest player centre each frame so the hornet can
  // decide whether to dive. Cheap call — no state outside chasing flag.
  chase(playerCenterX: number, playerCenterY: number) {
    this.targetX = playerCenterX;
    this.targetY = playerCenterY;
    this.targetingValid = true;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      this.velY += GRAVITY * 0.5;
      this.y += this.velY;
      if (this.deadTimer > 40) this.alive = false;
      return;
    }
    this.flyTimer += dt;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dx = this.targetingValid ? this.targetX - cx : 0;
    const dy = this.targetingValid ? this.targetY - cy : 0;
    const dist = this.targetingValid ? Math.hypot(dx, dy) : Number.POSITIVE_INFINITY;
    this.diving = this.targetingValid && dist < HORNET_AGGRO_RANGE;

    if (this.diving) {
      // Dive: aim at player. Normalise so X and Y feel proportional.
      // Clamp each component to HORNET_DIVE_SPEED so a tiny dist (player
      // half-overlapping the hornet) can't blow up the per-axis velocity
      // — a normalised vector still scales linearly until clamped.
      const inv = 1 / Math.max(1, dist);
      const rawVx = dx * inv * HORNET_DIVE_SPEED;
      const rawVy = dy * inv * HORNET_DIVE_SPEED;
      this.velX = Math.max(-HORNET_DIVE_SPEED, Math.min(HORNET_DIVE_SPEED, rawVx));
      this.velY = Math.max(0.5, Math.min(HORNET_DIVE_SPEED, rawVy));
      this.direction = this.velX < 0 ? Direction.LEFT : Direction.RIGHT;
      this.x += this.velX * dt;
      this.y += this.velY * dt;
    } else {
      // Idle drift: gentle horizontal pace + sine bobbing on Y.
      this.x += this.velX * dt;
      const yOff = Math.sin(this.flyTimer * HORNET_FLY_SPEED) * HORNET_AMPLITUDE;
      this.y = this.startY + yOff;
    }
  }

  reverseDirection() {
    if (this.diving) return;
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = this.direction === Direction.LEFT ? -HORNET_SPEED : HORNET_SPEED;
  }
}

// ===========================================================================
// Banzai Bill — riesiges horizontales Geschoss aus Super Mario World.
// Driftet schwerelos in seine Spawn-Richtung, ignoriert Gravitation und
// Wände. Stompbar von oben, sonst Schaden bei Berührung. Wird erst aktiv,
// wenn der Spieler in BANZAI_BILL_AGGRO_RANGE kommt — vorher dümpelt er an
// seiner Spawn-Position und gibt sich als Kulisse aus.
// ===========================================================================

export class BanzaiBill extends Entity {
  isDead = false;
  deadTimer = 0;
  active = false;
  spawnX: number;
  flyTimer = 0;

  constructor(x: number, y: number, dir: Direction = Direction.LEFT) {
    super(x, y, BANZAI_BILL_SIZE, BANZAI_BILL_SIZE, EntityType.BANZAI_BILL);
    this.direction = dir;
    this.spawnX = x;
    this.velX = dir === Direction.LEFT ? -BANZAI_BILL_SPEED : BANZAI_BILL_SPEED;
    this.velY = 0;
  }

  activate(playerX: number, playerY: number) {
    if (this.active) return;
    const dx = playerX - (this.x + this.width / 2);
    const dy = playerY - (this.y + this.height / 2);
    if (Math.hypot(dx, dy) < BANZAI_BILL_AGGRO_RANGE) this.active = true;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      this.velY += GRAVITY * 0.5;
      this.y += this.velY;
      if (this.deadTimer > 40) this.alive = false;
      return;
    }
    if (!this.active) return;
    this.flyTimer += dt;
    this.x += this.velX * dt;
  }
}

// ===========================================================================
// Chargin' Chuck — gepanzerter Football-Spieler aus SMW.
// Schlendert ruhig in seine Richtung, dreht an Wänden um. Sieht er den
// Spieler in CHUCK_AGGRO_RANGE, fängt er an zu sprinten ("charge"). Beim
// Stomp verliert er ein HP-Segment (CHUCK_HITS_TO_KILL = 3, simuliert den
// SMW-Helm) und ist für CHUCK_STUN_FRAMES kurz harmlos. Erst der dritte
// Treffer killt ihn endgültig.
// ===========================================================================

export class CharginChuck extends Entity {
  isDead = false;
  deadTimer = 0;
  hitsTaken = 0;
  stunTimer = 0;
  charging = false;
  edgeBehavior = false; // läuft über Klippen wie ein Goomba ohne Angst
  private targetX = 0;
  private targetingValid = false;

  constructor(x: number, y: number) {
    super(x, y, 36, 44, EntityType.CHARGIN_CHUCK);
    this.direction = Direction.LEFT;
    this.velX = -CHUCK_WALK_SPEED;
  }

  chase(playerX: number) {
    this.targetX = playerX;
    this.targetingValid = true;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      this.velY += GRAVITY * 0.5;
      this.y += this.velY;
      if (this.deadTimer > 40) this.alive = false;
      return;
    }
    if (this.stunTimer > 0) {
      this.stunTimer--;
      this.velX = 0;
      this.velY += GRAVITY;
      if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
      return;
    }
    // Aggro-Check: wenn Spieler näher als CHUCK_AGGRO_RANGE und in
    // Sichtlinie (auf gleicher Höhe ungefähr), Vollgas in seine Richtung.
    if (this.targetingValid) {
      const dx = this.targetX - (this.x + this.width / 2);
      if (Math.abs(dx) < CHUCK_AGGRO_RANGE) {
        this.charging = true;
        this.direction = dx < 0 ? Direction.LEFT : Direction.RIGHT;
      } else {
        this.charging = false;
      }
    }
    const speed = this.charging ? CHUCK_CHARGE_SPEED : CHUCK_WALK_SPEED;
    this.velX = this.direction === Direction.LEFT ? -speed : speed;
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
  }

  /** Returns true if this stomp killed him. */
  takeStomp(): boolean {
    this.hitsTaken++;
    this.hitFlash = 7;
    this.stunTimer = CHUCK_STUN_FRAMES;
    this.charging = false;
    if (this.hitsTaken >= CHUCK_HITS_TO_KILL) {
      this.isDead = true;
    this.hitFlash = 7;
      this.velY = -4;
      return true;
    }
    return false;
  }

  reverseDirection() {
    if (this.stunTimer > 0) return;
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
  }
}

// ===========================================================================
// Big Boo — riesiger SMW-Geist. Bewegt sich nur, wenn der Spieler NICHT
// in seine Richtung schaut (player.direction zeigt vom Boo weg). Schaut
// der Spieler hin, hält Big Boo die Hände vors Gesicht und wird intangibel.
// Stompbar von oben, sonst Schaden. Bewegt sich frei durch die Luft, sinkt
// langsam in einer Sinus-Bewegung wie ein Geist.
// ===========================================================================

export class BigBoo extends Entity {
  startY: number;
  flyTimer = 0;
  active = false;
  hidden = false; // true = Spieler schaut den Boo an
  activateDistance = BIG_BOO_ACTIVATE_DISTANCE;
  private targetX = 0;
  private targetY = 0;
  private playerFacing: Direction = Direction.RIGHT;
  private targetingValid = false;

  constructor(x: number, y: number) {
    super(x, y, BIG_BOO_SIZE, BIG_BOO_SIZE, EntityType.BIG_BOO);
    this.startY = y;
    this.direction = Direction.LEFT;
  }

  activate(playerX: number) {
    if (!this.active && Math.abs(playerX - this.x) < this.activateDistance) {
      this.active = true;
    }
  }

  /** Engine speist die Spielerposition + Blickrichtung pro Frame. */
  watch(playerX: number, playerY: number, playerFacing: Direction) {
    this.targetX = playerX;
    this.targetY = playerY;
    this.playerFacing = playerFacing;
    this.targetingValid = true;
    if (this.targetingValid && this.active) {
      // Versteckt sich, wenn der Spieler in Boos Richtung schaut.
      const playerToBoo = (this.x + this.width / 2) - playerX;
      const facingTowardBoo =
        (playerToBoo > 0 && playerFacing === Direction.RIGHT) ||
        (playerToBoo < 0 && playerFacing === Direction.LEFT);
      this.hidden = facingTowardBoo;
    }
  }

  update(dt: number) {
    super.update(dt);
    if (!this.active) return;
    this.flyTimer += GHOST_FLY_SPEED;
    this.y = this.startY + Math.sin(this.flyTimer) * GHOST_FLY_AMPLITUDE;
    if (this.hidden) {
      this.velX = 0;
      return;
    }
    // Floats toward the player horizontally, slowly.
    if (this.targetingValid) {
      this.direction = this.targetX < this.x ? Direction.LEFT : Direction.RIGHT;
    }
    this.velX = this.direction === Direction.LEFT ? -BIG_BOO_SPEED : BIG_BOO_SPEED;
    this.x += this.velX * dt;
    // Vertikales Driften: leicht zur Spielerhöhe ziehen, damit er nicht
    // an einer Linie kleben bleibt.
    if (this.targetingValid) {
      const dy = this.targetY - (this.y + this.height / 2);
      this.startY += Math.sign(dy) * Math.min(0.3, Math.abs(dy) * 0.01);
    }
  }
}


// ===========================================================================
// Theme-Gegner (Task #18) — Affe, Möwe, Lava-Slime, Yeti, Ritter, Mini-UFO
// ===========================================================================

// --- Affe (Jungle): sitzt erhöht, wirft Kokosnüsse im Bogen --------------
export class Ape extends Entity {
  isDead = false;
  deadTimer = 0;
  throwTimer = Math.floor(Math.random() * APE_THROW_INTERVAL);
  throwThisFrame = false;
  windupTimer = 0;                 // Telegraphing (v404)
  static readonly WINDUP = 18;
  private targetX = 0;
  private targetingValid = false;

  constructor(x: number, y: number) {
    super(x, y, 32, 36, EntityType.APE);
  }

  chase(playerX: number) {
    this.targetX = playerX;
    this.targetingValid = true;
  }

  update(dt: number) {
    super.update(dt);
    this.throwThisFrame = false;
    if (this.isDead) {
      this.deadTimer++;
      this.velY += GRAVITY * 0.5;
      this.y += this.velY;
      if (this.deadTimer > 40) this.alive = false;
      return;
    }
    this.velY = Math.min(MAX_FALL_SPEED, this.velY + GRAVITY);
    this.windupTimer = 0;
    if (!this.targetingValid) return;
    const dx = this.targetX - (this.x + this.width / 2);
    if (Math.abs(dx) > APE_AGGRO_RANGE) return;
    this.direction = dx < 0 ? Direction.LEFT : Direction.RIGHT;
    this.throwTimer++;
    if (this.throwTimer >= APE_THROW_INTERVAL - Ape.WINDUP) {
      this.windupTimer = APE_THROW_INTERVAL - this.throwTimer; // zählt runter
    }
    if (this.throwTimer >= APE_THROW_INTERVAL) {
      this.throwTimer = 0;
      this.windupTimer = 0;
      this.throwThisFrame = true;
    }
  }

  stomp() { this.isDead = true;
    this.hitFlash = 7; this.velY = -4; }
}

// --- Möwe (Beach): kreist und stürzt herab -------------------------------
export class Seagull extends Entity {
  startY: number;
  flyTimer = 0;
  diving = false;
  diveCooldown = 0;
  isDead = false;
  deadTimer = 0;
  private targetX = 0;
  private targetY = 0;
  private targetingValid = false;

  constructor(x: number, y: number) {
    super(x, y, 36, 22, EntityType.SEAGULL);
    this.startY = y;
    this.direction = Direction.LEFT;
  }

  chase(playerX: number, playerY: number) {
    this.targetX = playerX;
    this.targetY = playerY;
    this.targetingValid = true;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      this.velY += GRAVITY * 0.5;
      this.y += this.velY;
      if (this.deadTimer > 40) this.alive = false;
      return;
    }
    if (this.diveCooldown > 0) this.diveCooldown--;
    this.flyTimer += SEAGULL_FLY_SPEED;
    if (this.diving) {
      this.velY = SEAGULL_DIVE_SPEED;
      this.y += this.velY;
      const horizDir = this.targetX < this.x + this.width / 2 ? -1 : 1;
      this.velX = horizDir * SEAGULL_SPEED * 1.6;
      this.x += this.velX;
      if (this.y > this.startY + 110) {
        this.diving = false;
        this.diveCooldown = 80;
        this.y = this.startY;
        this.velY = 0;
      }
    } else {
      this.velX = this.direction === Direction.LEFT ? -SEAGULL_SPEED : SEAGULL_SPEED;
      this.x += this.velX;
      this.y = this.startY + Math.sin(this.flyTimer) * SEAGULL_AMPLITUDE;
      if (this.targetingValid && this.diveCooldown === 0) {
        const dx = this.targetX - (this.x + this.width / 2);
        if (Math.abs(dx) < SEAGULL_AGGRO_RANGE) {
          this.direction = dx < 0 ? Direction.LEFT : Direction.RIGHT;
        }
        if (Math.abs(dx) < 70 && this.targetY > this.y + 30) {
          this.diving = true;
        }
      }
    }
  }

  stomp() { this.isDead = true;
    this.hitFlash = 7; this.velY = -4; this.diving = false; }
}

// --- Lava-Slime (Volcano): hüpft langsam vorwärts -------------------------
export class LavaSlime extends Entity {
  isDead = false;
  deadTimer = 0;
  hopTimer = Math.floor(Math.random() * LAVA_SLIME_HOP_INTERVAL);
  squish = 0;
  edgeBehavior = true;

  constructor(x: number, y: number) {
    super(x, y, 30, 22, EntityType.LAVA_SLIME);
    this.direction = Direction.LEFT;
  }

  update(dt: number) {
    super.update(dt);
    if (this.isDead) {
      this.deadTimer++;
      if (this.deadTimer > 24) this.alive = false;
      return;
    }
    this.velY = Math.min(MAX_FALL_SPEED, this.velY + GRAVITY);
    if (this.squish > 0) this.squish--;
    if (this.onGround) {
      this.hopTimer++;
      this.velX = this.direction === Direction.LEFT ? -LAVA_SLIME_SPEED : LAVA_SLIME_SPEED;
      if (this.hopTimer >= LAVA_SLIME_HOP_INTERVAL) {
        this.hopTimer = 0;
        this.velY = LAVA_SLIME_HOP_FORCE;
        this.squish = 8;
      }
    } else {
      this.velX = this.direction === Direction.LEFT ? -LAVA_SLIME_SPEED * 1.6 : LAVA_SLIME_SPEED * 1.6;
    }
  }

  reverseDirection() {
    if (this.isDead) return;
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
  }
  stomp() { this.isDead = true;
    this.hitFlash = 7; this.velY = -3; }
}

// --- Schneeball-Yeti (Ice): rollt Schneebälle -----------------------------
export class Yeti extends Entity {
  isDead = false;
  deadTimer = 0;
  hitsTaken = 0;
  stunTimer = 0;
  throwTimer = 0;
  throwThisFrame = false;
  // Telegraphing (v403): Frames bis zum Wurf, solange > 0 lädt der Yeti sichtbar
  // auf und bleibt stehen (fairer Windup → Spieler kann reagieren). 0 = kein Windup.
  windupTimer = 0;
  static readonly WINDUP = 18;
  edgeBehavior = true;
  private targetX = 0;
  private targetingValid = false;

  constructor(x: number, y: number) {
    super(x, y, 36, 44, EntityType.YETI);
    this.direction = Direction.LEFT;
    this.velX = -YETI_SPEED;
  }

  chase(playerX: number) {
    this.targetX = playerX;
    this.targetingValid = true;
  }

  update(dt: number) {
    super.update(dt);
    this.throwThisFrame = false;
    if (this.isDead) {
      this.deadTimer++;
      this.velY += GRAVITY * 0.5;
      this.y += this.velY;
      if (this.deadTimer > 40) this.alive = false;
      return;
    }
    this.velY = Math.min(MAX_FALL_SPEED, this.velY + GRAVITY);
    if (this.stunTimer > 0) { this.stunTimer--; this.velX = 0; return; }
    this.velX = this.direction === Direction.LEFT ? -YETI_SPEED : YETI_SPEED;
    this.windupTimer = 0;
    if (this.targetingValid) {
      const dx = this.targetX - (this.x + this.width / 2);
      if (Math.abs(dx) < YETI_AGGRO_RANGE) {
        this.direction = dx < 0 ? Direction.LEFT : Direction.RIGHT;
        this.throwTimer++;
        // Windup-Fenster: kurz vor dem Wurf anhalten & sichtbar aufladen.
        if (this.throwTimer >= YETI_THROW_INTERVAL - Yeti.WINDUP) {
          this.windupTimer = YETI_THROW_INTERVAL - this.throwTimer; // zählt runter
          this.velX = 0;
        }
        if (this.throwTimer >= YETI_THROW_INTERVAL) {
          this.throwTimer = 0;
          this.windupTimer = 0;
          this.throwThisFrame = true;
        }
      }
    }
  }

  reverseDirection() {
    if (this.isDead || this.stunTimer > 0) return;
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
  }

  takeStomp(): boolean {
    this.hitsTaken++;
    this.hitFlash = 7;
    this.stunTimer = YETI_STUN_FRAMES;
    if (this.hitsTaken >= YETI_HITS_TO_KILL) {
      this.isDead = true;
    this.hitFlash = 7;
      this.velY = -4;
      return true;
    }
    return false;
  }
}

// --- Baby-Drache (Welt 16): hüpft aktiv Richtung Spielerin, stampfbar ------
export class BabyDragon extends Entity {
  isDead = false;
  deadTimer = 0;
  jumpTimer = 0;
  edgeBehavior = true;
  hatchPop = 8;                 // kurzer Aufploppen-Impuls direkt nach dem Schlüpfen
  private targetX = 0;
  private targeting = false;

  constructor(x: number, y: number) {
    super(x, y, 26, 24, EntityType.BABY_DRAGON);
    this.direction = Direction.LEFT;
    this.velX = -BABY_DRAGON_SPEED;
  }

  chase(playerX: number) { this.targetX = playerX; this.targeting = true; }

  update(dt: number) {
    super.update(dt);
    if (this.hatchPop > 0) this.hatchPop--;
    if (this.isDead) {
      this.deadTimer++;
      this.velY += GRAVITY * 0.5; this.y += this.velY;
      if (this.deadTimer > 32) this.alive = false;
      return;
    }
    // Richtung zur Spielerin, wenn in Reichweite (aktiver als ein Goomba).
    if (this.targeting) {
      const dx = this.targetX - (this.x + this.width / 2);
      if (Math.abs(dx) < BABY_DRAGON_AGGRO) this.direction = dx < 0 ? Direction.LEFT : Direction.RIGHT;
    }
    this.velX = this.direction === Direction.LEFT ? -BABY_DRAGON_SPEED : BABY_DRAGON_SPEED;
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
    if (this.onGround) {
      this.jumpTimer++;
      if (this.jumpTimer >= BABY_DRAGON_JUMP_INTERVAL) {
        this.velY = BABY_DRAGON_JUMP_FORCE;
        this.jumpTimer = 0;
        this.onGround = false;
      }
    }
  }

  stomp() {
    this.isDead = true; this.hitFlash = 7; this.velX = 0; this.velY = -3; this.deadTimer = 0;
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = -this.velX;
  }
}

// --- Drachen-Ei (Welt 16): steht still; schlüpft bei Annäherung → Baby-Drache
export class DragonEgg extends Entity {
  cracking = false;
  crackTimer = 0;
  hatched = false;              // von der Engine gelesen: dann Baby-Drache spawnen
  wobble = 0;

  constructor(x: number, y: number) {
    // etwas kleiner als ein Tile, sitzt auf dem Boden.
    super(x, y, 26, 30, EntityType.DRAGON_EGG);
  }

  /** Von der Engine je Frame mit der Spieler-Mitte gefüttert. */
  proximity(playerX: number, playerY: number) {
    if (this.hatched) return;
    const dx = playerX - (this.x + this.width / 2);
    const dy = playerY - (this.y + this.height / 2);
    const near = Math.abs(dx) < DRAGON_EGG_HATCH_RANGE && Math.abs(dy) < DRAGON_EGG_HATCH_RANGE * 1.4;
    if (near && !this.cracking) this.cracking = true;
  }

  update(dt: number) {
    super.update(dt);
    this.wobble += 1;
    if (this.cracking && !this.hatched) {
      this.crackTimer++;
      if (this.crackTimer >= DRAGON_EGG_CRACK_FRAMES) {
        this.hatched = true;
        this.alive = false;      // Ei verschwindet, Engine spawnt den Baby-Drachen
      }
    }
  }
}

// --- Rüstungs-Ritter (Castle): 2 Stomps + Schild blockt seitlich ---------
export class Knight extends Entity {
  isDead = false;
  deadTimer = 0;
  hitsTaken = 0;
  stunTimer = 0;
  edgeBehavior = true;
  blockFlash = 0;

  constructor(x: number, y: number) {
    super(x, y, 32, 40, EntityType.KNIGHT);
    this.direction = Direction.LEFT;
    this.velX = -KNIGHT_SPEED;
  }

  update(dt: number) {
    super.update(dt);
    if (this.blockFlash > 0) this.blockFlash--;
    if (this.isDead) {
      this.deadTimer++;
      this.velY += GRAVITY * 0.5;
      this.y += this.velY;
      if (this.deadTimer > 40) this.alive = false;
      return;
    }
    this.velY = Math.min(MAX_FALL_SPEED, this.velY + GRAVITY);
    if (this.stunTimer > 0) { this.stunTimer--; this.velX = 0; return; }
    this.velX = this.direction === Direction.LEFT ? -KNIGHT_SPEED : KNIGHT_SPEED;
  }

  reverseDirection() {
    if (this.isDead || this.stunTimer > 0) return;
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
  }

  takeStomp(): boolean {
    this.hitsTaken++;
    this.hitFlash = 7;
    this.stunTimer = KNIGHT_STUN_FRAMES;
    if (this.hitsTaken >= KNIGHT_HITS_TO_KILL) {
      this.isDead = true;
    this.hitFlash = 7;
      this.velY = -4;
      return true;
    }
    return false;
  }

  /** True if player approaching from knight's facing side hits the shield. */
  isShieldedFrom(playerCenterX: number): boolean {
    if (this.isDead || this.stunTimer > 0) return false;
    const knightCenter = this.x + this.width / 2;
    const fromRight = playerCenterX > knightCenter;
    return (fromRight && this.direction === Direction.RIGHT) || (!fromRight && this.direction === Direction.LEFT);
  }

  triggerBlockFlash() { this.blockFlash = 12; }
}

// --- Mini-UFO (Space): jagt in Luft, schießt Laser nach unten ------------
export class MiniUFO extends Entity {
  isDead = false;
  deadTimer = 0;
  laserTimer = 0;
  fireThisFrame = false;
  active = false;
  bobTimer = 0;
  private targetX = 0;
  private targetY = 0;

  constructor(x: number, y: number) {
    super(x, y, 36, 18, EntityType.MINI_UFO);
  }

  chase(playerX: number, playerY: number) {
    this.targetX = playerX;
    this.targetY = playerY;
    if (!this.active && Math.abs(playerX - (this.x + this.width / 2)) < MINI_UFO_AGGRO_RANGE) {
      this.active = true;
    }
  }

  update(dt: number) {
    super.update(dt);
    this.fireThisFrame = false;
    this.bobTimer += 0.08;
    if (this.isDead) {
      this.deadTimer++;
      this.velY += GRAVITY * 0.5;
      this.y += this.velY;
      if (this.deadTimer > 40) this.alive = false;
      return;
    }
    if (!this.active) return;
    const cx = this.x + this.width / 2;
    const dx = this.targetX - cx;
    this.direction = dx < 0 ? Direction.LEFT : Direction.RIGHT;
    this.velX = Math.sign(dx) * MINI_UFO_SPEED;
    if (Math.abs(dx) < 8) this.velX *= 0.3;
    this.x += this.velX;
    const desiredY = this.targetY - MINI_UFO_HOVER_HEIGHT;
    const dy = desiredY - this.y;
    this.velY = Math.max(-2, Math.min(2, dy * 0.06));
    this.y += this.velY + Math.sin(this.bobTimer) * 0.3;
    this.laserTimer++;
    if (this.laserTimer >= MINI_UFO_LASER_INTERVAL && Math.abs(dx) < 50) {
      this.laserTimer = 0;
      this.fireThisFrame = true;
    }
  }

  stomp() { this.isDead = true;
    this.hitFlash = 7; this.velY = -4; this.active = false; }
}
