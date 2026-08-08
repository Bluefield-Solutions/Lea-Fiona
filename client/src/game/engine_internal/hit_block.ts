// `?` block hit handler — extracted so the (long) per-block-type switch
// lives separately from engine.ts. On QUESTION_BLOCK the engine consults
// the per-level "*Block" registries to pick which power-up (or coin) the
// block should pop. BRICK blocks just shatter into particles.
import { TILE_SIZE, TileType, BLOCK_COIN_VALUE, EXTRA_LIFE_COINS } from '../constants';
import { PowerUp, SpinningCoin } from '../entities';
import { audio } from '../audio';
import { addLifetimeCoins } from '../storage';
import type { GameEngine } from '../engine';

export function hitBlockAt(engine: GameEngine, col: number, row: number): void {
  const tile = engine.physics.getTile(col, row);
  // Game-Feel: tiny freeze when bonking a real block.
  if (tile === TileType.QUESTION_BLOCK || tile === TileType.BRICK) {
    engine.triggerHitStop(2);
  }
  if (tile === TileType.QUESTION_BLOCK) {
    engine.physics.setTile(col, row, TileType.QUESTION_BLOCK_USED);
    engine.renderer.clearTile(TileType.QUESTION_BLOCK_USED);
    audio.playSfx('blockHit');

    const blockX = col * TILE_SIZE;
    const blockY = row * TILE_SIZE;

    if (engine.isStarBlock(col, row)) {
      engine.entities.push(new PowerUp(blockX + 4, blockY, 'star'));
      engine.spawnStarParticles(blockX + TILE_SIZE / 2, blockY);
    } else if (engine.isHeartBlock(col, row)) {
      engine.entities.push(new PowerUp(blockX + 4, blockY));
      engine.spawnHeartParticles(blockX + TILE_SIZE / 2, blockY);
    } else if (engine.isFireBlock(col, row)) {
      engine.entities.push(new PowerUp(blockX + 4, blockY, 'fire'));
      engine.spawnHeartParticles(blockX + TILE_SIZE / 2, blockY);
    } else if (engine.isMagnetBlock(col, row)) {
      engine.entities.push(new PowerUp(blockX + 4, blockY, 'magnet'));
      engine.spawnCoinParticles(blockX + TILE_SIZE / 2, blockY);
    } else if (engine.isCapeBlock(col, row)) {
      engine.entities.push(new PowerUp(blockX + 4, blockY, 'cape'));
      engine.spawnHeartParticles(blockX + TILE_SIZE / 2, blockY);
    } else if (engine.isShieldBlock(col, row)) {
      engine.entities.push(new PowerUp(blockX + 4, blockY, 'shield'));
      engine.spawnHeartParticles(blockX + TILE_SIZE / 2, blockY);
    } else if (engine.isClockBlock(col, row)) {
      engine.entities.push(new PowerUp(blockX + 4, blockY, 'clock'));
      engine.spawnHeartParticles(blockX + TILE_SIZE / 2, blockY);
    } else if (engine.isSuperBlock(col, row)) {
      engine.entities.push(new PowerUp(blockX + 4, blockY, 'super'));
      engine.spawnStarParticles(blockX + TILE_SIZE / 2, blockY);
    } else {
      const coinY = blockY - TILE_SIZE;
      engine.entities.push(new SpinningCoin(blockX + 8, coinY));
      engine.player.addCoin();
      engine.player.addScore(BLOCK_COIN_VALUE);
      engine.carryStats.coins = engine.player.coins;
      engine.carryStats.score = engine.player.score;
      engine.particles.push(engine.acquireFloatingText(blockX + TILE_SIZE / 2, coinY, `+${BLOCK_COIN_VALUE}`));
      audio.playSfx('coin');
      engine.coinsThisLevel++;
      addLifetimeCoins(1);
      if (engine.coinsThisLevel >= 30) engine.grantAchievementById('coin_hoard');

      if (engine.player.coins >= EXTRA_LIFE_COINS) {
        engine.player.coins -= EXTRA_LIFE_COINS;
        engine.player.lives++;
        engine.carryStats.lives = engine.player.lives;
        engine.carryStats.coins = engine.player.coins;
        engine.particles.push(engine.acquireFloatingText(engine.player.x, engine.player.y - 20, '1UP!'));
        audio.playSfx('oneUp');
      }
      engine.emitEvent('hud');
    }

    engine.spawnBlockParticles(blockX + TILE_SIZE / 2, blockY);
    engine.shakeCamera(3, 5);
  } else if (tile === TileType.BRICK) {
    engine.physics.setTile(col, row, TileType.EMPTY);
    engine.spawnBrickParticles(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
    engine.shakeCamera(2, 4);
    audio.playSfx('brickBreak');
  }
}
