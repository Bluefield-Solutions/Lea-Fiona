// Two AOE-blast helpers extracted from engine.ts so the engine class
// stays focused on game-loop orchestration:
//   - runGroundPoundShockwave: triggered when the player slams down from
//     a ground-pound. Spawns a visible ring, kills enemies in radius
//     with stomp-combo scoring, breaks BRICKS within reach.
//   - runBombDetonation: a Bomb-Omb's fuse expired. Same ideas, slightly
//     different reach + chain-detonates other bombs caught in the blast.
//   - tryStarKillForcedFromShockwave: the unconditional-kill primitive
//     reused by both.
import {
  GROUND_POUND_RADIUS, BOMB_EXPLOSION_RADIUS, BOMB_EXPLOSION_BRICK_REACH,
  ENEMY_KILL_SCORE, TILE_SIZE, TileType,
} from '../constants';
import { Entity, BombOmb, BombExplosion } from '../entities';
import { isAoeKillable } from '../util/enemy-tags';
import { audio } from '../audio';
import type { GameEngine } from '../engine';

export function runGroundPoundShockwave(engine: GameEngine): void {
  const cx = engine.player.x + engine.player.width / 2;
  const footY = engine.player.y + engine.player.height;
  engine.shockwaves.push({ x: cx, y: footY, age: 0, max: 24, radius: GROUND_POUND_RADIUS });
  audio.playSfx('brickBreak');
  engine.shakeCamera(5, 12);
  // Reset air-combo so a fresh stomp combo can start from this kill.
  engine.player.airComboCount = 0;
  // Dust burst.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI;
    engine.particles.push(engine.acquireParticle(
      cx + (Math.random() - 0.5) * 16,
      footY,
      Math.cos(a) * 4 * (Math.random() < 0.5 ? -1 : 1),
      -Math.random() * 3 - 1,
      '#d8c89a',
      2 + Math.random() * 2,
      25,
    ));
  }
  // AOE enemy kill.
  for (const e of engine.entities) {
    if (!e.alive) continue;
    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    const dx = ex - cx;
    const dy = ey - footY;
    if (dx * dx + dy * dy > GROUND_POUND_RADIUS * GROUND_POUND_RADIUS) continue;
    if (!isAoeKillable(e)) continue;
    tryStarKillForcedFromShockwave(engine, e);
  }
  // Break adjacent BRICK tiles in a small column under the player.
  const reach = BOMB_EXPLOSION_BRICK_REACH;
  const cCol = Math.floor(cx / TILE_SIZE);
  const cRow = Math.floor(footY / TILE_SIZE);
  for (let dr = 0; dr <= reach; dr++) {
    for (let dc = -reach; dc <= reach; dc++) {
      const col = cCol + dc;
      const row = cRow + dr;
      if (col < 0 || row < 0) continue;
      if (engine.physics.getTile(col, row) === TileType.BRICK) {
        engine.physics.setTile(col, row, TileType.EMPTY);
        engine.spawnBrickParticles(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
      }
    }
  }
}

export function runBombDetonation(engine: GameEngine, bomb: BombOmb): void {
  const cx = bomb.x + bomb.width / 2;
  const cy = bomb.y + bomb.height / 2;
  bomb.alive = false;
  engine.entities.push(new BombExplosion(cx, cy));
  audio.playSfx('stomp');
  engine.shakeCamera(8, 14);
  engine.grantAchievementById('bomb_master');
  // AOE enemy kill in BOMB_EXPLOSION_RADIUS — same enemy filter as the
  // ground-pound shockwave; chain-detonates other Bomb-Ombs.
  for (const e of engine.entities) {
    if (!e.alive || e === bomb) continue;
    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    const dx = ex - cx;
    const dy = ey - cy;
    if (dx * dx + dy * dy > BOMB_EXPLOSION_RADIUS * BOMB_EXPLOSION_RADIUS) continue;
    if (e instanceof BombOmb) {
      // Chain: light any other bomb caught in the blast so it goes off
      // on its own fuse a moment later.
      e.light();
      continue;
    }
    if (!isAoeKillable(e)) continue;
    tryStarKillForcedFromShockwave(engine, e);
  }
  // Break adjacent BRICK tiles in a small square around the blast.
  const reach = BOMB_EXPLOSION_BRICK_REACH;
  const cCol = Math.floor(cx / TILE_SIZE);
  const cRow = Math.floor(cy / TILE_SIZE);
  for (let dr = -reach; dr <= reach; dr++) {
    for (let dc = -reach; dc <= reach; dc++) {
      const col = cCol + dc;
      const row = cRow + dr;
      if (col < 0 || row < 0) continue;
      if (engine.physics.getTile(col, row) === TileType.BRICK) {
        engine.physics.setTile(col, row, TileType.EMPTY);
        engine.spawnBrickParticles(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
      }
    }
  }
}

// Same as engine.tryStarKill but unconditional on starTimer. Used by
// both shockwaves so the player gets credit even without star-mode.
export function tryStarKillForcedFromShockwave(engine: GameEngine, entity: Entity): void {
  if ('isDead' in entity && (entity as { isDead?: boolean }).isDead) {
    entity.alive = false;
    return;
  }
  entity.alive = false;
  audio.playSfx('stomp');
  engine.applyStompCombo(ENEMY_KILL_SCORE, entity);
  engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height);
}
