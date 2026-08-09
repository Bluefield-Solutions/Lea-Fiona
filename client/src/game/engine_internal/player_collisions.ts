// Player-vs-everything contact pass. Pulled out of engine.ts so the long
// per-entity-type switch (~390 lines) lives in its own file. Mutates
// engine state (player, particles, carryStats, …) but does NOT change
// engine.state — death/level-end transitions live in their own modules.
import {
  TILE_SIZE, Direction,
  ENEMY_KILL_SCORE, BLOCK_COIN_VALUE, EXTRA_LIFE_COINS,
  STOMP_FORGIVENESS,
  STOMP_COMBO_SCORES, STOMP_COMBO_ONEUP_INDEX,
  PLAYER_SPEED,
  STAR_KILL_SCORE,
  SUPER_KILL_SCORE,
  PLAYER_FIREBALL_KILL_SCORE,
  SHIELD_POP_IFRAMES,
} from '../constants';
import {
  Entity, Goomba, Koopa, Boss, Bat, Coin, SpinningCoin, SpecialCoin, PowerUp, PiranhaPlant,
  Spider, Crab, Jellyfish, Kangaroo, Deer, BrownDeer, DeerBoss, Sheep, Turtle, Mouse, SnakeBoss, Snake, Fireball, Ghost, Fish,
  Wizard, MagicBolt, BombOmb, BombExplosion, PlayerFireball, SpikeBall,
  Hornet, BanzaiBill, CharginChuck, BigBoo,
  Ape, Seagull, LavaSlime, Yeti, Knight, MiniUFO,
  Coconut, Snowball, UFOLaser, BabyDragon,
} from '../entities';
import { audio } from '../audio';
import { isStarKillable, isFireKillable } from '../util/enemy-tags';
import { addLifetimeCoins, markSpecialCoinCollected, getSettings, getStickers, unlockDoubleJump } from '../storage';
import { SPECIAL_COIN_VALUE } from '../constants';
import type { GameEngine } from '../engine';

// Welt-Sammel-Sticker (Album): freigeschaltet, wenn alle 3 Sonder-Münzen
// einer Welt gesammelt sind. Plüsch hat ein eigenes Schema (Kuschel-Sticker).
const WORLD_COIN_STICKER: Record<string, string> = {
  jungle: 'coins_jungle', cave: 'coins_cave', sky: 'coins_sky', beach: 'coins_beach',
  australia: 'coins_australia', volcano: 'coins_volcano', ice: 'coins_ice', castle: 'coins_castle',
  underwater: 'coins_underwater', space: 'coins_space', school: 'coins_school', gym: 'coins_gym',
  trampoline: 'coins_trampoline', bluefield: 'coins_bluefield',
};
// „Super-Sammlerin"-Meilenstein: jede Welt vollständig (14 Welt-Sticker +
// das Plüsch-Kuschelband = alle 15 Welten voll gesammelt).
const ALL_WORLD_STICKERS = [...Object.values(WORLD_COIN_STICKER), 'plush_kuschelband'];
function maybeGrantSuperCollector(engine: GameEngine): void {
  const have = new Set(getStickers());
  if (ALL_WORLD_STICKERS.every(id => have.has(id))) engine.grantAchievementById('super_collector');
}

/**
 * Player took damage from an enemy/hazard. Plays the right SFX based on
 * whether the player was powered-up (gets shrunk → 'hurt') or died ('death').
 */
export function playerHit(engine: GameEngine, entity?: Entity): void {
  const p = engine.player;
  if (p.invincibleTimer > 0 || p.starTimer > 0 || p.isDead) return;
  // Kinderfreundliche Schaden-Hitbox (v402): etwas kleiner als das Sprite —
  // ein knapper Rand-Graze am Gegner verletzt NICHT. Stomp bleibt großzügig
  // (eigene Toleranz), Tile-Hazards (ohne entity) treffen weiter voll.
  if (entity) {
    const IX = 6, ITOP = 5, IBOT = 2;
    const px = p.x + IX, pr = p.x + p.width - IX;
    const py = p.y + ITOP, pb = p.y + p.height - IBOT;
    if (!(px < entity.x + entity.width && pr > entity.x && py < entity.y + entity.height && pb > entity.y)) return;
  }
  // Assist-Modus (AP 1.7): Unverwundbarkeit — Treffer durch Gegner/Gefahren
  // werden vollständig ignoriert. Kurzer Schutz-Funke als Feedback, damit
  // der Treffer nicht spurlos bleibt, aber kein Power-down/Tod.
  if (getSettings().assistInvincible) {
    p.invincibleTimer = Math.max(p.invincibleTimer, 30);
    engine.spawnHeartParticles(p.x + p.width / 2, p.y + p.height / 2);
    return;
  }
  // Game-Feel: every real hit freezes a few frames for weight.
  engine.triggerHitStop(4);
  // Knockback (v401): kurzer, gerichteter Rückstoß entgegen der Blickrichtung +
  // kleiner Hüpfer. Der vorhandene airControlLockTimer unterdrückt für ~10
  // Frames die Eingabe-Beschleunigung, damit der Rückstoß sichtbar ausklingt und
  // die Kontrolle danach schnell zurückkehrt (kein Kontrollverlust-Frust).
  const applyKnockback = (strength = 5.5) => {
    const dir = p.direction < 0 ? 1 : -1; // weg von der Laufrichtung (meist vom Gegner)
    p.velX = dir * strength;
    p.velY = Math.min(p.velY, -4.5);
    p.onGround = false;
    p.airControlLockTimer = Math.max(p.airControlLockTimer, 10);
  };
  // Schutzschild-Blase absorbs the hit cleanly — no power-down, just a
  // sparkle pop and a short i-frame so the player doesn't die to a
  // double-tap from the same enemy on the next frame.
  if (p.shieldCharges > 0) {
    p.shieldCharges = 0;
    p.invincibleTimer = Math.max(p.invincibleTimer, SHIELD_POP_IFRAMES);
    engine.spawnHeartParticles(p.x + p.width / 2, p.y + p.height / 2);
    audio.playSfx('powerup');
    engine.shakeCamera(2, 6);
    applyKnockback(4);
    engine.tookHitThisLevel = true;
    engine.emitEvent('hud');
    return;
  }
  // Power-down cascade — Fire → Cape → Powered → Small → Dead. Each
  // intermediate step is a "hurt" event (short shake, hurt SFX, brief
  // i-frames) but does NOT kill the player. Only when small/un-powered
  // does the next hit actually call die() and end the run.
  if (p.hasFire) {
    p.hasFire = false;
    p.invincibleTimer = Math.max(p.invincibleTimer, 90);
    audio.playSfx('hurt');
    engine.shakeCamera(3, 6);
    engine.spawnHeartParticles(p.x + p.width / 2, p.y + p.height / 2);
    applyKnockback();
    engine.tookHitThisLevel = true;
    engine.emitEvent('hud');
    return;
  }
  if (p.hasCape) {
    p.hasCape = false;
    p.invincibleTimer = Math.max(p.invincibleTimer, 90);
    audio.playSfx('hurt');
    engine.shakeCamera(3, 6);
    engine.spawnHeartParticles(p.x + p.width / 2, p.y + p.height / 2);
    applyKnockback();
    engine.tookHitThisLevel = true;
    engine.emitEvent('hud');
    return;
  }
  const wasPowered = p.isPoweredUp;
  p.die();
  audio.playSfx(wasPowered ? 'hurt' : 'death');
  if (!wasPowered) audio.stopMusic();
  // Knockback nur beim Überleben (Power-down auf klein); beim echten Tod
  // übernimmt der Todes-Purzelbaum.
  if (wasPowered) applyKnockback();
  engine.shakeCamera(wasPowered ? 3 : 6, wasPowered ? 6 : 12);
  engine.tookHitThisLevel = true;
}

/**
 * Star-mode contact kill. Returns true if the star handled the contact
 * (i.e. star was active and killed `entity`). Caller short-circuits the
 * normal stomp / damage logic when this returns true.
 *
 * Same scoring ramp as a stomp combo so chaining many star-kills feels
 * like a Mario invincibility-rampage.
 */
export function tryStarKill(engine: GameEngine, entity: Entity): boolean {
  if (engine.player.starTimer <= 0) return false;
  if ('isDead' in entity && (entity as { isDead?: boolean }).isDead) return false;
  entity.alive = false;
  audio.playSfx('stomp', engine.panForWorldX(entity.x + entity.width / 2));
  applyStompCombo(engine, STAR_KILL_SCORE, entity);
  engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height);
  engine.grantAchievementById('star_smash');
  return true;
}

/**
 * Super-Kontakt-Kill: Während die Superkraft aktiv ist (superMoveTimer > 0),
 * zerstört jede Berührung mit einem Gegner diesen sofort — über die gesamte
 * Move-Dauer, nicht nur beim Auslösen (der einmalige Wipe deckt nur die im
 * Moment der Auslösung vorhandenen AOE-Gegner ab). Nutzt die breite
 * Stern-Liste, damit auch zähe Typen (Ape, Yeti, Knight …) fallen.
 */
export function trySuperContactKill(engine: GameEngine, entity: Entity): boolean {
  if (engine.player.superMoveTimer <= 0) return false;
  if (!isStarKillable(entity)) return false;
  if ('isDead' in entity && (entity as { isDead?: boolean }).isDead) return false;
  entity.alive = false;
  audio.playSfx('stomp', engine.panForWorldX(entity.x + entity.width / 2));
  applyStompCombo(engine, SUPER_KILL_SCORE, entity);
  engine.spawnStarParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
  return true;
}

/**
 * Ship-it-Dash-Durchbruch: Während der Dash aktiv ist (dashTimer > 0),
 * pflügt die Figur durch berührte Gegner hindurch, statt Schaden zu nehmen.
 * Nutzt dieselbe Stern-Eignung (isStarKillable) — zähe/immune Typen und
 * Bosse bleiben ausgenommen. Kurzer Kamera-Impuls für die Wucht; KEIN
 * Hit-Stop, damit das Durchpflügen mehrerer Gegner flüssig bleibt.
 */
export function tryDashContactKill(engine: GameEngine, entity: Entity): boolean {
  if (engine.player.dashTimer <= 0) return false;
  if (!isStarKillable(entity)) return false;
  if ('isDead' in entity && (entity as { isDead?: boolean }).isDead) return false;
  entity.alive = false;
  audio.playSfx('stomp', engine.panForWorldX(entity.x + entity.width / 2));
  applyStompCombo(engine, STAR_KILL_SCORE, entity);
  engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height);
  engine.shakeCamera(4, 5);
  return true;
}

// Centralized stomp-bounce: if the player is HOLDING jump at impact,
// give a boosted trampoline-bounce. Returns `true` when the boost was
// applied so the caller can pick the right SFX. Note: SFX is intentionally
// NOT played here — callers must play it themselves so cooldown/i-frame
// branches (e.g. Crab) can perform a *silent* harmless bounce.
export function playerBounceFromStomp(engine: GameEngine): boolean {
  // Stomp-Buffer: a jump press buffered just BEFORE landing on the enemy
  // also counts as "holding jump" for the boosted bounce. This forgives
  // the classic mistake of releasing a fraction of a frame too early on
  // a chain-stomp.
  const buffered = engine.player.jumpBufferTimer > 0;
  const boost = engine.input.jump || buffered;
  if (boost && buffered) {
    // Consume the buffer so the same press doesn't ALSO trigger a normal
    // jump on the very next frame.
    engine.player.jumpBufferTimer = 0;
  }
  engine.player.bounce(boost);
  // Game-Feel: short freeze on the stomp impact.
  engine.triggerHitStop(2);
  return boost;
}

// Centralized stomp scoring with mid-air combo escalation. Returns the
// points actually awarded so the floating-text uses the boosted value.
// The base score is the floor (e.g. ENEMY_KILL_SCORE for goombas, *2 for
// bats) — combo only ever ADDS on top.
export function applyStompCombo(engine: GameEngine, baseScore: number, entity: Entity): number {
  const p = engine.player;
  entity.hitFlash = 7; // Treffer-Aufblitzen für jeden besiegten Gegner
  p.airComboCount++;
  const idx = Math.min(p.airComboCount - 1, STOMP_COMBO_SCORES.length - 1);
  const points = Math.max(baseScore, STOMP_COMBO_SCORES[idx]);
  p.addScore(points);
  engine.carryStats.score = p.score;
  // Game-Feel: combo numbers grow with the chain (1.0 → ~1.6 at 6+).
  const comboScale = 1 + Math.min(p.airComboCount - 1, 5) * 0.12;
  engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, `+${points}`, comboScale));
  // Game-Feel: ab dem 2. Stomp ein wachsendes "COMBO xN!"-Label, damit die
  // Kette sichtbar belohnt wird (nicht nur über die Punktzahl).
  if (p.airComboCount >= 2) {
    const lblScale = 1 + Math.min(p.airComboCount - 1, 5) * 0.14;
    engine.particles.push(engine.acquireFloatingText(entity.x - 6, entity.y - 28, `COMBO x${p.airComboCount}!`, lblScale));
  }
  // Stomp-combo milestones: 3 and 5 in-air kills earn their own stickers,
  // chasing the existing 6-kill 1UP feel one rung lower so younger
  // players still see badge progress without nailing the full chain.
  if (p.airComboCount === 3) engine.grantAchievementById('combo_3');
  if (p.airComboCount === 5) engine.grantAchievementById('combo_5');
  // Game-Feel (E2): ab der 3er-Kette eine kurze Zeitlupe pro weiterem Treffer —
  // der große Moment „dehnt sich", eskaliert mit jeder weiteren Stomp-Combo.
  if (p.airComboCount >= 3) engine.triggerSlowMo(9, 0.45);
  if (p.airComboCount === STOMP_COMBO_ONEUP_INDEX + 1) {
    p.lives++;
    engine.carryStats.lives = p.lives;
    engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 46, '1UP!'));
    audio.playSfx('oneUp');
    engine.emitEvent('hud');
  }
  engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height);
  // Game-Feel: kleiner, schnell verblassender Pop-Ring im Treffer-Moment —
  // deutlich kompakter und kürzer als der Ground-Pound-Ring.
  engine.shockwaves.push({
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height,
    age: 0,
    max: 15,
    radius: 44,
  });
  // Game-Feel: kurzer, dezenter Impact-Shake beim Besiegen (Setting-gated;
  // wächst leicht mit der Combo-Kette für mehr Wucht bei langen Ketten).
  engine.shakeCamera(2 + Math.min(p.airComboCount - 1, 4) * 0.5, 5);
  return points;
}

// Returns true if the player is currently making a stomp-style hit on
// this entity — either falling onto it (Mario-classic above-stomp) OR
// ploughing into it horizontally during a Run-Slide.
export function isStompHit(engine: GameEngine, entity: Entity): boolean {
  const p = engine.player;
  const fromAbove =
    p.velY > 0 &&
    p.y + p.height - STOMP_FORGIVENESS < entity.y + entity.height / 2;
  const fromSlide = p.isSliding && Math.abs(p.velX) > 1;
  return fromAbove || fromSlide;
}

// Reusable spatial bucket for the PlayerFireball-vs-enemy broadphase.
// Built lazily on the first fireball seen during a runEntityCollisions
// pass so frames without fireballs pay nothing. Keys are integer cell
// hashes (cellX + cellY * 100000).
const FIREBALL_BUCKET_CELL = 64;
const _fireballBucket: Map<number, Entity[]> = new Map();
// Recycle inner arrays via a free-list so frequent rebuilds don't churn
// the GC. Map itself is .clear()'d each build to bound key-space growth
// over a long session.
const _bucketArrayPool: Entity[][] = [];
function _resetFireballBucket(): void {
  _fireballBucket.forEach(arr => { arr.length = 0; _bucketArrayPool.push(arr); });
  _fireballBucket.clear();
}
function _buildFireballBucket(entities: Entity[]): void {
  for (const e of entities) {
    if (!e.alive || e instanceof PlayerFireball) continue;
    // Index into EVERY cell the entity's AABB overlaps, not just the
    // center cell — otherwise a fireball whose AABB grazes the enemy
    // but lies in the neighbouring cell would miss a true intersection.
    const minCx = Math.floor(e.x / FIREBALL_BUCKET_CELL);
    const maxCx = Math.floor((e.x + e.width) / FIREBALL_BUCKET_CELL);
    const minCy = Math.floor(e.y / FIREBALL_BUCKET_CELL);
    const maxCy = Math.floor((e.y + e.height) / FIREBALL_BUCKET_CELL);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = cx + cy * 100000;
        let arr = _fireballBucket.get(key);
        if (!arr) {
          arr = _bucketArrayPool.pop() ?? [];
          _fireballBucket.set(key, arr);
        }
        arr.push(e);
      }
    }
  }
}

export function runEntityCollisions(engine: GameEngine): void {
  const player = engine.player;
  // Lazy-build broadphase only when at least one fireball is active.
  let bucketBuilt = false;
  for (const entity of engine.entities) {
    if (!entity.alive) continue;

    if (entity instanceof PowerUp && !entity.collected && !entity.emerging) {
      if (player.intersects(entity)) {
        entity.collect();
        if (entity.kind === 'fire') {
          player.applyFire();
          player.addScore(1000);
          engine.carryStats.score = player.score;
          engine.spawnHeartParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
          engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, '+1000'));
          if (engine.level.theme === 'bluefield') engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 30, 'PROTOTYP!'));
          engine.shakeCamera(3, 6);
          audio.playSfx('powerup');
          engine.emitEvent('hud');
          continue;
        }
        if (entity.kind === 'magnet') {
          player.applyMagnet();
          player.addScore(500);
          engine.carryStats.score = player.score;
          engine.spawnCoinParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
          engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, '+500'));
          audio.playSfx('powerup');
          engine.emitEvent('hud');
          continue;
        }
        if (entity.kind === 'cape') {
          player.applyCape();
          player.addScore(1000);
          engine.carryStats.score = player.score;
          engine.spawnHeartParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
          engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, '+1000'));
          if (engine.level.theme === 'bluefield') engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 30, 'SKALIERUNG!'));
          engine.shakeCamera(3, 6);
          audio.playSfx('powerup');
          engine.emitEvent('hud');
          continue;
        }
        if (entity.kind === 'wings') {
          // Freispielbare Doppelsprung-Fähigkeit — dauerhaft freigeschaltet.
          player.doubleJumpUnlocked = true;
          unlockDoubleJump();
          engine.grantAchievementById('double_jump');
          player.addScore(1000);
          engine.carryStats.score = player.score;
          engine.spawnStarParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
          engine.spawnHeartParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
          engine.particles.push(engine.acquireFloatingText(entity.x - 6, entity.y - 10, 'DOPPELSPRUNG!'));
          engine.particles.push(engine.acquireFloatingText(entity.x + 2, entity.y - 30, '2× springen: Sprung in der Luft nochmal!'));
          engine.shakeCamera(4, 8);
          audio.playSfx('powerup');
          engine.emitEvent('hud');
          continue;
        }
        if (entity.kind === 'shield') {
          player.applyShield();
          player.addScore(500);
          engine.carryStats.score = player.score;
          engine.spawnHeartParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
          engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, '+500'));
          if (engine.level.theme === 'bluefield') engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 30, 'DSGVO-SCHILD!'));
          audio.playSfx('powerup');
          engine.emitEvent('hud');
          continue;
        }
        if (entity.kind === 'clock') {
          player.applyClock();
          player.addScore(500);
          engine.carryStats.score = player.score;
          engine.spawnStarParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
          engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, '+500'));
          audio.playSfx('powerup');
          engine.emitEvent('hud');
          continue;
        }
        if (entity.kind === 'super') {
          player.applySuper();
          player.addScore(1000);
          engine.carryStats.score = player.score;
          engine.spawnStarParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
          engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, engine.level.theme === 'bluefield' ? 'GO-LIVE!' : 'SUPER!'));
          engine.shakeCamera(4, 8);
          audio.playSfx('powerup');
          engine.emitEvent('hud');
          continue;
        }
        if (entity.kind === 'star') {
          player.applyStar();
          player.addScore(1000);
          engine.carryStats.score = player.score;
          engine.spawnStarParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
          engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, '+1000'));
          engine.shakeCamera(5, 10);
          audio.playSfx('powerup');
        } else {
          player.powerUp();
          player.addScore(1000);
          engine.carryStats.score = player.score;
          engine.spawnHeartParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
          engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, '+1000'));
          engine.shakeCamera(4, 8);
          audio.playSfx('powerup');
        }
        engine.emitEvent('hud');
      }
      continue;
    }

    if (entity instanceof Coin && !entity.collected) {
      if (player.intersects(entity)) {
        entity.collect();
        player.addCoin();
        engine.carryStats.coins = player.coins;
        engine.carryStats.score = player.score;
        engine.spawnCoinParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
        // Feinschliff: goldener Pop-Ring am Sammelpunkt (skaliert kurz auf).
        // Gedeckelt, damit dichte Münzreihen die Ringe nicht überladen.
        if (engine.coinPops.length < 24) {
          // combo mitgeben: der Pop-Ring wächst/leuchtet mit der Sammel-Serie
          // (visuelles Pendant zur steigenden Tonhöhe). combo wird direkt darunter
          // aktualisiert; hier bewusst der Stand VOR dem Inkrement der aktuellen Münze.
          engine.coinPops.push({ x: entity.x + entity.width / 2, y: entity.y + entity.height / 2, age: 0, max: 12, combo: engine.coinCombo });
        }
        engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, '+100'));
        // Game-Feel: schnelles Aufsammeln (Münzreihe) → steigende Tonhöhe.
        const nowF = engine.renderer.time;
        engine.coinCombo = (nowF - engine.lastCoinFrame <= 22)
          ? Math.min(engine.coinCombo + 1, 14) : 0;
        engine.lastCoinFrame = nowF;
        audio.playSfx('coin', 0, 1 + engine.coinCombo * 0.05);
        engine.coinsThisLevel++;
        addLifetimeCoins(1);
        if (engine.coinsThisLevel >= 30) engine.grantAchievementById('coin_hoard');

        if (player.coins >= EXTRA_LIFE_COINS) {
          player.coins -= EXTRA_LIFE_COINS;
          player.lives++;
          engine.carryStats.lives = player.lives;
          engine.carryStats.coins = player.coins;
          engine.particles.push(engine.acquireFloatingText(player.x, player.y - 20, '1UP!'));
          audio.playSfx('oneUp');
        }
        engine.emitEvent('hud');
      }
      continue;
    }

    if (entity instanceof SpinningCoin) continue;

    if (entity instanceof SpecialCoin && !entity.collected) {
      if (player.intersects(entity)) {
        entity.collect();
        // Sonder-Münzen geben Score, fließen aber bewusst NICHT in
        // coinsThisLevel/lifetimeCoins/EXTRA_LIFE-Tally — sie sind ein
        // separates Sammelziel mit eigener Album-Anzeige.
        player.score += SPECIAL_COIN_VALUE;
        engine.carryStats.score = player.score;
        engine.specialCoinsThisRun[entity.slotIndex] = true;
        markSpecialCoinCollected(engine.currentLevelIndex, entity.slotIndex);
        // Zwischenziel: allererste eingesammelte Sonder-Münze (früher Anreiz).
        engine.grantAchievementById('first_special');
        engine.spawnStarParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
        engine.particles.push(engine.acquireFloatingText(entity.x, entity.y - 10, '+' + SPECIAL_COIN_VALUE));
        // Plüsch-Traumland: die drei Sonder-Sammelstücke sind Kuschel-Sticker
        // (Teddy/Hase/Stern) und schalten je einen Album-Sticker frei.
        if (engine.level.theme === 'plush') {
          const stickerId = ['plush_teddy', 'plush_hase', 'plush_stern'][entity.slotIndex];
          if (stickerId) engine.grantAchievementById(stickerId);
          engine.particles.push(engine.acquireFloatingText(
            entity.x, entity.y - 26,
            ['Teddy-Sticker!', 'Hasen-Sticker!', 'Stern-Sticker!'][entity.slotIndex] ?? 'Sticker!', 1.15,
          ));
        }
        // AP 1.11: Vollständigkeits-Belohnung — sind alle drei Spezialmünzen
        // eines Levels beisammen (Risk-Reward-Sammelziel erfüllt), gibt es ein
        // deutlich fühlbareres Feedback als beim einzelnen Aufsammeln.
        const allSpecial = engine.specialCoinsThisRun[0] && engine.specialCoinsThisRun[1] && engine.specialCoinsThisRun[2];
        if (allSpecial) {
          const allMsg = engine.level.theme === 'plush' ? 'Alle Kuschel-Sticker!' : 'Alle Spezialmünzen!';
          engine.particles.push(engine.acquireFloatingText(entity.x - 6, entity.y - 30, allMsg));
          engine.spawnStarParticles(entity.x + entity.width / 2, entity.y);
          // Album-Sticker fürs vollständige Sammeln einer Welt.
          if (engine.level.theme === 'plush') {
            engine.grantAchievementById('plush_kuschelband');
          } else {
            const worldSticker = WORLD_COIN_STICKER[engine.level.theme];
            if (worldSticker) engine.grantAchievementById(worldSticker);
          }
          maybeGrantSuperCollector(engine);
          audio.playSfx('fanfare');
          engine.shakeCamera(3, 10);
        } else {
          audio.playSfx('powerup');
          engine.shakeCamera(2, 6);
        }
        engine.emitEvent('hud');
      }
      continue;
    }

    // Zeitlupen-Uhr: every freezable enemy + projectile becomes
    // *intangible* while frozen. Without this skip the player can
    // still die by walking into a Goomba that's frozen mid-stride,
    // which contradicts the "frozen tableau" promise of the gadget.
    if (engine.clockFrozen && engine.isFreezableEnemy(entity)) continue;

    // Big Boo while hidden is intangible to ALL contact, including
    // star-mode kills. Skipping the star-kill branch matches the
    // generic-contact branch below (line ~550).
    if (entity instanceof BigBoo && entity.hidden) continue;

    // Superkraft aktiv: jeder berührte Gegner stirbt sofort, über die ganze
    // Move-Dauer (ergänzt den einmaligen Wipe beim Auslösen).
    if (player.superMoveTimer > 0 && player.intersects(entity)) {
      if (trySuperContactKill(engine, entity)) continue;
    }

    // Star-mode short-circuit: any enemy/projectile we touch dies on
    // contact. We still fall through for non-enemy entities so the
    // normal collision logic stays intact. Eligibility is centralized
    // in util/enemy-tags (isStarKillable).
    if (player.starTimer > 0 && player.intersects(entity)) {
      if (isStarKillable(entity) && tryStarKill(engine, entity)) continue;
    }

    // Ship-it-Dash aktiv: durchbricht berührte Gegner (statt Schaden). Fällt
    // für Nicht-Gegner durch, damit die normale Kollision unangetastet bleibt.
    if (player.dashTimer > 0 && player.intersects(entity)) {
      if (tryDashContactKill(engine, entity)) continue;
    }

    if (entity instanceof Goomba) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.stomp();
          // Slide-kills don't bounce — momentum carries through.
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof BabyDragon) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Boss) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        // „Beides möglich": Kopfsprung ODER aktive Superkraft trifft den Drachen.
        // Pro Super-Aktivierung genau EIN Boss-Treffer (superHitLanded-Gate),
        // damit „drei Superkräfte = drei Treffer" sauber aufgeht.
        const superHit = player.superMoveTimer > 0 && !player.superHitLanded && entity.hitStun <= 0;
        if (isStompHit(engine, entity) || superHit) {
          if (superHit) player.superHitLanded = true;
          const defeated = entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          if (defeated) {
            applyStompCombo(engine, ENEMY_KILL_SCORE * 6, entity);
            engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height);
            engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height * 0.4);
            engine.shakeCamera(9, 22);
            engine.hitStopFrames = Math.max(engine.hitStopFrames, 6);
            engine.acquireFloatingText(entity.x + entity.width / 2 - 34, entity.y - 12, 'SYSTEM DOWN!', 1.4);
            engine.acquireFloatingText(entity.x + entity.width / 2 - 30, entity.y - 38, '→ GO LIVE frei!', 1.0);
          } else {
            engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height * 0.4);
            engine.shakeCamera(3, 6);
          }
        } else if (entity.hitStun <= 0) {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Koopa) {
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          const prevShell = entity.isShell;
          entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          // Only score if this stomp was the kill (turning a koopa into a
          // shell). Re-stomping an already-shell koopa just kicks it.
          if (!prevShell) {
            applyStompCombo(engine, ENEMY_KILL_SCORE, entity);
          }
          if (entity.isShell && entity.shellMoving) {
            entity.direction = player.x < entity.x ? Direction.RIGHT : Direction.LEFT;
          }
        } else if (entity.isShell && !entity.shellMoving) {
          entity.kick(player.x < entity.x ? Direction.RIGHT : Direction.LEFT);
          audio.playSfx('kick', engine.panForWorldX(entity.x + entity.width / 2));
          player.addScore(ENEMY_KILL_SCORE);
          engine.carryStats.score = player.score;
        } else if (!entity.isShell) {
          // Lebender Koopa von der Seite: nicht getroffen werden, sondern
          // wegschubsen — erst in einen Panzer verwandeln, dann von der Figur
          // weg kicken. Ein bereits GLEITENDER Panzer (else) trifft weiterhin.
          entity.stomp();
          entity.kick(player.x < entity.x ? Direction.RIGHT : Direction.LEFT);
          audio.playSfx('kick', engine.panForWorldX(entity.x + entity.width / 2));
          player.addScore(ENEMY_KILL_SCORE);
          engine.carryStats.score = player.score;
        } else if (entity.kickGrace <= 0) {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Bat) {
      if (!entity.active) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.alive = false;
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof PiranhaPlant) {
      if (!entity.isExposed || entity.playerNear) continue;
      if (player.intersects(entity)) {
        // Stomp the plant from clearly above OR plough through it via
        // run-slide. The fromAbove threshold is stricter (height/3) than
        // the generic isStompHit, so check both branches explicitly.
        // Slide-kill demands real residual sprint speed, not just any
        // crawl-speed graze (PiranhaPlant has a small/elevated hitbox).
        const fromAbove =
          player.velY > 0 &&
          player.y + player.height - STOMP_FORGIVENESS < entity.y + entity.height / 3;
        const fromSlide = player.isSliding && Math.abs(player.velX) > PLAYER_SPEED * 0.6;
        if (fromAbove || fromSlide) {
          entity.stomp();
          const boosted = fromAbove ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Spider) {
      if (entity.active && player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.alive = false;
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Crab) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          // Honor the i-frame cooldown: stomp() returns false while the crab
          // is in its hurt-cooldown window. In that case the player still
          // bounces off harmlessly, but SILENTLY — no SFX, no score, no
          // combo increment. This preserves the original "free re-stomp
          // attempt" feel without spamming stomp SFX.
          const applied = entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          if (applied) {
            audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
            const base = entity.isDead ? ENEMY_KILL_SCORE * 2 : ENEMY_KILL_SCORE;
            applyStompCombo(engine, base, entity);
          }
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Jellyfish) {
      if (!entity.active) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.alive = false;
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Kangaroo) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Deer || entity instanceof BrownDeer
               || entity instanceof Sheep || entity instanceof Turtle || entity instanceof Mouse) {
      if (entity.isDead) continue;
      if (entity instanceof Mouse && entity.hiding) continue;   // im Loch: nicht treffbar
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof DeerBoss || entity instanceof SnakeBoss) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        // Boss (Reh/Schlange): drei Kopfsprünge. Während der i-frames (hitStun)
        // zählt der Treffer nicht, die Figur federt aber trotzdem ab (kein Schaden).
        if (isStompHit(engine, entity)) {
          const hpBefore = entity.hp;
          const defeated = entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          const landed = entity.hp < hpBefore;   // echter Treffer (nicht durch i-frames geblockt)
          if (landed) {
            // Wuchtiges Feedback: Boss-Treffer-Sound + kurzer Screen-Shake + Impact-Zoom
            // + Musik-Ducking + Staub-/Funken-Wolke am Aufprallpunkt (Boss-Kopf).
            audio.playSfx('bossHit', engine.panForWorldX(entity.x + entity.width / 2));
            audio.duckMusic();
            engine.shakeCamera(defeated ? 9 : 6, defeated ? 22 : 12);
            engine.addImpactZoom(defeated ? 0.07 : 0.05);
            engine.spawnStompParticles(player.x + player.width / 2, entity.y);
            engine.spawnSparks(player.x + player.width / 2, entity.y);
          } else {
            audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          }
          if (defeated) {
            applyStompCombo(engine, ENEMY_KILL_SCORE * 3, entity);
            // Sieges-Sequenz: Funken-Explosion + „Besiegt!"-Text + Sieges-Jingle und
            // ein kleiner Freuden-Hüpfer der Figur.
            const bx = entity.x + entity.width / 2, by = entity.y + entity.height * 0.4;
            engine.spawnStarParticles(bx, by);
            engine.spawnSparks(bx, by);
            engine.particles.push(engine.acquireFloatingText(bx, entity.y - 10, 'Besiegt!', 1.2));
            audio.playSfx('oneUp');
            if (!player.isSwinging) { player.velY = Math.min(player.velY, -6); player.onGround = false; }
          }
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Snake) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Fireball) {
      // Falling projectile: pure hazard, cannot be stomped.
      if (player.intersects(entity)) {
        playerHit(engine, entity);
      }
    } else if (entity instanceof Ghost) {
      // Ghost is intangible — neither stomp nor slide kills it.
      if (entity.active && player.intersects(entity)) {
        playerHit(engine, entity);
      }
    } else if (entity instanceof Fish) {
      if (!entity.active) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.alive = false;
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Wizard) {
      // Wake him up only when the player gets close, then run his
      // teleport/cast cycle. Stompable like a Goomba; mid-teleport
      // (alpha < 1) he is intangible — both damage AND stomp pass through.
      entity.activate(player.x);
      if (entity.isDead) continue;
      if (entity.teleportPhase > 0) continue;
      // Spawn a magic bolt the frame the wizard chooses to cast, aimed
      // toward the player so it always feels deliberate.
      if (entity.castedThisFrame) {
        const dir = player.x < entity.x ? Direction.LEFT : Direction.RIGHT;
        entity.direction = dir;
        const bx = entity.x + (dir === Direction.LEFT ? -8 : entity.width - 4);
        const by = entity.y + entity.height * 0.3;
        engine.entities.push(engine.acquireMagicBolt(bx, by, dir));
        audio.playSfx('blockHit');
      }
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof MagicBolt) {
      // Pure hazard. Star already short-circuited above; nothing else
      // can stomp it.
      if (player.intersects(entity)) {
        playerHit(engine, entity);
      }
    } else if (entity instanceof BombOmb) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          // Stomping the bomb LIGHTS the fuse instead of killing it —
          // the player still bounces off and earns a small score.
          entity.light();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof SpikeBall) {
      // Stachelkugel: top contact STILL damages — no stomp branch.
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        playerHit(engine, entity);
      }
    } else if (entity instanceof Hornet) {
      // Hornisse: stompable from above, contact otherwise.
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.alive = false;
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof BanzaiBill) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.isDead = true;
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof CharginChuck) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          const killed = entity.takeStomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          if (killed) {
            applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
          } else {
            player.addScore(ENEMY_KILL_SCORE / 2);
            engine.carryStats.score = player.score;
          }
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof BigBoo) {
      // Während er sich versteckt (Spieler schaut hin) ist er
      // intangibel — weder Schaden noch Stomp gehen durch.
      if (entity.hidden) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.alive = false;
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Ape) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Seagull) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof LavaSlime) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Yeti) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          const killed = entity.takeStomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          if (killed) {
            applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
          } else {
            player.addScore(ENEMY_KILL_SCORE / 2);
            engine.carryStats.score = player.score;
          }
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Knight) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        const playerCenterX = player.x + player.width / 2;
        if (isStompHit(engine, entity)) {
          const killed = entity.takeStomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          if (killed) {
            applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
          } else {
            player.addScore(ENEMY_KILL_SCORE / 2);
            engine.carryStats.score = player.score;
          }
        } else if (entity.isShieldedFrom(playerCenterX)) {
          // Shield deflects: no damage, recoil player + audio cue.
          entity.triggerBlockFlash();
          const recoilDir = playerCenterX < entity.x + entity.width / 2 ? -1 : 1;
          player.velX = recoilDir * 5;
          player.invincibleTimer = Math.max(player.invincibleTimer, 12);
          audio.playSfx('shieldBlock');
          engine.shakeCamera(2, 6);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof MiniUFO) {
      if (entity.isDead) continue;
      if (player.intersects(entity)) {
        if (isStompHit(engine, entity)) {
          entity.stomp();
          const boosted = player.velY > 0 ? playerBounceFromStomp(engine) : false;
          audio.playSfx(boosted ? 'bounceBoost' : 'stomp');
          applyStompCombo(engine, ENEMY_KILL_SCORE * 2, entity);
        } else {
          playerHit(engine, entity);
        }
      }
    } else if (entity instanceof Coconut || entity instanceof Snowball || entity instanceof UFOLaser) {
      if (player.intersects(entity)) {
        playerHit(engine, entity);
      }
    } else if (entity instanceof BombExplosion) {
      // Pure AOE hazard for the player; AOE enemy-kill is processed in
      // detonateBomb() at the moment of explosion. Touching the blast
      // hurts the player like any other contact damage.
      if (player.intersects(entity)) {
        playerHit(engine, entity);
      }
    } else if (entity instanceof PlayerFireball) {
      // Player-fired projectile. Use the spatial bucket so each fireball
      // only checks enemies in adjacent cells instead of the whole level.
      if (!bucketBuilt) {
        _resetFireballBucket();
        _buildFireballBucket(engine.entities);
        bucketBuilt = true;
      }
      const minCx = Math.floor(entity.x / FIREBALL_BUCKET_CELL);
      const maxCx = Math.floor((entity.x + entity.width) / FIREBALL_BUCKET_CELL);
      const minCy = Math.floor(entity.y / FIREBALL_BUCKET_CELL);
      const maxCy = Math.floor((entity.y + entity.height) / FIREBALL_BUCKET_CELL);
      let killedThisFireball = false;
      for (let ccy = minCy; ccy <= maxCy && !killedThisFireball; ccy++) {
        for (let ccx = minCx; ccx <= maxCx && !killedThisFireball; ccx++) {
          const arr = _fireballBucket.get(ccx + ccy * 100000);
          if (!arr) continue;
          for (const target of arr) {
        if (target === entity || !target.alive) continue;
        if (!entity.intersects(target)) continue;
        // Big Boo ist intangibel: Feuerball kann ihn nicht töten,
        // soll aber an ihm zerschellen statt geistermäßig durch ihn
        // hindurchzufliegen.
            if (target instanceof BigBoo) {
              entity.alive = false;
              engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
              audio.playSfx('blockHit');
              killedThisFireball = true;
              break;
            }
            const isFireKill = isFireKillable(target);
            if (!isFireKill) continue;
            if ('isDead' in target && (target as { isDead?: boolean }).isDead) continue;
            if (target instanceof BombOmb) {
              target.light();
            } else {
              target.alive = false;
            }
            entity.alive = false;
            audio.playSfx('stomp', engine.panForWorldX(target.x + target.width / 2));
            applyStompCombo(engine, PLAYER_FIREBALL_KILL_SCORE, target);
            engine.spawnStompParticles(target.x + target.width / 2, target.y + target.height);
            engine.grantAchievementById('fire_kill');
            killedThisFireball = true;
            break;
          }
        }
      }
    }
  }
}
