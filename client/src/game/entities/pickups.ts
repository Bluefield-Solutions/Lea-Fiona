import { Direction, ENEMY_SPEED, EntityType, GRAVITY, MAX_FALL_SPEED, TILE_SIZE } from '../constants';
import { Entity } from './base';

export class Coin extends Entity {
  collected = false;
  bobTimer: number;

  constructor(x: number, y: number) {
    super(x, y, 20, 20, EntityType.COIN);
    this.bobTimer = Math.random() * Math.PI * 2;
  }

  update(dt: number) {
    super.update(dt);
    this.bobTimer += 0.04;
    this.y += Math.sin(this.bobTimer) * 0.3;
  }

  collect() {
    this.collected = true;
    this.alive = false;
  }
}


// Sonder-Münze (Task #30). Drei pro Level, persistiert pro Profil/Level.
// Größer als die normale Coin (28×28), bobt + rotiert sichtbar, gibt
// SPECIAL_COIN_VALUE Score (NICHT in coinsThisLevel zählen!).
export class SpecialCoin extends Entity {
  collected = false;
  bobTimer: number;
  /** Slot 0..2 — Position im level.specialCoins-Array. */
  slotIndex: number;
  /** Anker-Y, damit der sin-Bob keine kumulative Drift erzeugt. */
  baseY: number;

  constructor(x: number, y: number, slotIndex: number) {
    super(x, y, 28, 28, EntityType.SPECIAL_COIN);
    this.bobTimer = Math.random() * Math.PI * 2;
    this.slotIndex = slotIndex;
    this.baseY = y;
  }

  update(dt: number) {
    super.update(dt);
    this.bobTimer += 0.05;
    // Absolute Position aus baseY + sin — kein += pro Frame, sonst
    // driftet die Münze über die Zeit aus dem Tile heraus.
    this.y = this.baseY + Math.sin(this.bobTimer) * 4;
  }

  collect() {
    this.collected = true;
    this.alive = false;
  }
}


export class SpinningCoin extends Entity {
  lifetime = 30;

  constructor(x: number, y: number) {
    super(x, y, 16, 16, EntityType.COIN_SPINNING);
    this.velY = -8;
  }

  update(dt: number) {
    super.update(dt);
    this.velY += 0.3;
    this.y += this.velY;
    this.lifetime--;
    if (this.lifetime <= 0) this.alive = false;
  }
}


export type PowerUpKind = 'mushroom' | 'star' | 'fire' | 'magnet' | 'cape' | 'wings' | 'shield' | 'clock' | 'super';

// Map a power-up kind to its visual entity-type (so the renderer dispatch
// in engine.ts can pick the right draw method).
function powerUpEntityType(kind: PowerUpKind): EntityType {
  switch (kind) {
    case 'star': return EntityType.STAR;
    case 'fire': return EntityType.FIRE_FLOWER;
    case 'magnet': return EntityType.COIN_MAGNET;
    case 'cape': return EntityType.CAPE;
    case 'wings': return EntityType.WINGS;
    case 'shield': return EntityType.SHIELD;
    case 'clock': return EntityType.CLOCK;
    case 'super': return EntityType.STAR;
    default: return EntityType.POWERUP;
  }
}

// Stationary power-ups that hover on top of the block they emerged from
// (they don't walk like a mushroom). Centralised so the PowerUp class
// and the engine renderer agree on which kinds float in place.
function isStationaryPowerUp(kind: PowerUpKind): boolean {
  return kind === 'fire' || kind === 'magnet' || kind === 'cape' || kind === 'super' ||
         kind === 'shield' || kind === 'clock' || kind === 'wings';
}


export class PowerUp extends Entity {
  collected = false;
  emergeTimer = 0;
  emerging = true;
  startY: number;
  kind: PowerUpKind;

  constructor(x: number, y: number, kind: PowerUpKind = 'mushroom') {
    super(x, y, 24, 24, powerUpEntityType(kind));
    this.startY = y;
    this.velY = 0;
    this.velX = 0;
    this.emergeTimer = 0;
    this.emerging = true;
    this.kind = kind;
  }

  update(dt: number) {
    super.update(dt);
    if (this.emerging) {
      this.emergeTimer++;
      this.y = this.startY - (this.emergeTimer / 30) * TILE_SIZE;
      if (this.emergeTimer >= 30) {
        this.emerging = false;
        // Stars bounce around energetically; mushrooms walk; fire & magnet
        // sit still (fire pulses on its block, magnet hovers).
        if (this.kind === 'star') {
          this.velX = ENEMY_SPEED * 1.6;
          this.velY = -6;
        } else if (this.kind === 'mushroom') {
          this.velX = ENEMY_SPEED * 0.8;
        } else {
          this.velX = 0;
        }
        this.direction = Direction.RIGHT;
      }
      return;
    }
    // Fire/magnet/cape/shield/clock are stationary collectibles — they
    // hover on top of the block they emerged from. Mushroom & star use
    // real gravity-driven physics.
    if (isStationaryPowerUp(this.kind)) {
      this.velY = 0;
      this.velX = 0;
      return;
    }
    this.velY += GRAVITY;
    if (this.velY > MAX_FALL_SPEED) this.velY = MAX_FALL_SPEED;
    // Star bounces on landing (Mario-style invincibility-star).
    if (this.kind === 'star' && this.onGround && this.velY > 0) {
      this.velY = -7;
    }
  }

  collect() {
    this.collected = true;
    this.alive = false;
  }

  reverseDirection() {
    this.direction = this.direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    this.velX = -this.velX;
  }
}

