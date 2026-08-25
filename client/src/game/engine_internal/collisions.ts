import {
  Entity, Koopa, Goomba, Boss, Bat, Spider, Crab, Kangaroo, Snake,
  Jellyfish, Fish, Ghost, SpikeBall, Hornet,
} from '../entities';
import { ENEMY_KILL_SCORE, GameState, TILE_SIZE } from '../constants';
import { LEVELS, groundRowOf } from '../level';
import { audio } from '../audio';
import { setUnlocked, getStickers, getSettings } from '../storage';
import type { GameEngine } from '../engine';

type Ctor = new (...args: any[]) => Entity;

// Shell-kill mechanics table. Membership here mirrors SHELL_KILLABLE in
// util/enemy-tags (isShellKillable) — that predicate is the trait query
// for the rest of the codebase; this table additionally carries the
// per-type vulnerability guard and whether a stomp-particle burst plays.
// Behavior is preserved 1:1 from the original instanceof chain.
const SHELL_TARGETS: Array<{ ctor: Ctor; vulnerable: (e: any) => boolean; particles: boolean }> = [
  { ctor: Goomba,    vulnerable: e => !e.isDead, particles: true },
  { ctor: Koopa,     vulnerable: () => true,     particles: true },
  { ctor: Bat,       vulnerable: e => e.active,  particles: false },
  { ctor: Spider,    vulnerable: e => e.active,  particles: false },
  { ctor: Crab,      vulnerable: e => !e.isDead, particles: true },
  { ctor: Kangaroo,  vulnerable: e => !e.isDead, particles: true },
  { ctor: Snake,     vulnerable: e => !e.isDead, particles: false },
  { ctor: Jellyfish, vulnerable: e => e.active,  particles: false },
  { ctor: Fish,      vulnerable: e => e.active,  particles: false },
  { ctor: Ghost,     vulnerable: e => e.active,  particles: false },
  { ctor: SpikeBall, vulnerable: e => !e.isDead, particles: true },
  { ctor: Hornet,    vulnerable: e => !e.isDead, particles: false },
];

/**
 * One Koopa shell vs every other entity. A live shell kills any enemy it
 * intersects (no stomp arbitration: the shell is the kill weapon). The
 * shell instance itself is excluded so it doesn't kill itself.
 */
export function runShellCollisions(engine: GameEngine, shell: Koopa): void {
  // Punkte-Leiter für die Panzer-Kette (Mario-Stil, kindgerecht klar):
  // 1. Treffer = 100, dann 200, 400, gedeckelt bei 800. Zusätzlich zum
  // regulären Kill-Score, damit sich das Abräumen mehrerer Gegner mit einem
  // Panzer als kleiner Bonus-Trick lohnt.
  const COMBO_POINTS = [ENEMY_KILL_SCORE, ENEMY_KILL_SCORE * 2, ENEMY_KILL_SCORE * 4, ENEMY_KILL_SCORE * 8];
  const CHAIN_1UP_AT = 4;   // ab dem 4. Kettentreffer gibt es ein Extra-Leben
  for (const entity of engine.entities) {
    if (entity === shell || !entity.alive) continue;
    if (!shell.intersects(entity)) continue;

    const cfg = SHELL_TARGETS.find(t => entity instanceof t.ctor);
    if (!cfg || !cfg.vulnerable(entity)) continue;

    entity.hitFlash = 7;
    entity.alive = false;

    // Combo hochzählen und gestaffelte Bonuspunkte vergeben.
    const pts = COMBO_POINTS[Math.min(shell.shellCombo, COMBO_POINTS.length - 1)];
    shell.shellCombo++;
    engine.player.addScore(pts);
    const cx = entity.x + entity.width / 2;
    const label = shell.shellCombo >= 2 ? `Combo ×${shell.shellCombo}!  +${pts}` : `+${pts}`;
    engine.particles.push(engine.acquireFloatingText(cx, entity.y - 6, label, shell.shellCombo >= 2 ? 1.15 : 1));
    // Fröhlicher, mit jedem Kettentreffer höher werdender Ton.
    audio.playSfx('coin', 0, Math.min(1 + (shell.shellCombo - 1) * 0.12, 1.7));

    // Krönung: eine besonders lange Panzer-Kette (4 Gegner) schenkt ein
    // Extra-Leben mit 1-UP-Fanfare. Feuert genau einmal pro Kette, weil der
    // Zähler die Schwelle nur einmal überschreitet.
    if (shell.shellCombo === CHAIN_1UP_AT) {
      engine.player.lives++;
      engine.carryStats.lives = engine.player.lives;
      engine.particles.push(engine.acquireFloatingText(cx, entity.y - 34, '1-UP!', 1.35));
      audio.playSfx('oneUp');
    }

    if (cfg.particles) {
      engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height);
    }
  }
}

/**
 * Player vs the level-end flag. Awards the time bonus, persists progress
 * (best-score + next-level unlock), kicks off the fanfare timer and
 * transitions the engine into LEVEL_COMPLETE. Returns true if the player
 * actually touched the flag this frame (so the caller can stop further
 * collision processing).
 */
export function runFlagCollision(engine: GameEngine): boolean {
  if (engine.player.isDead) return false;
  const level = engine.level;
  const flagX = level.flagPosition.x;
  const flagY = level.flagPosition.y;
  const flagWidth = 8;
  // Clamp: a flag placed low in the level could make (height-2)*TILE - flagY
  // negative, collapsing the hit box so the flag becomes untouchable.
  // Floor it at one tile so the flag is always reachable.
  const flagHeight = Math.max(TILE_SIZE, groundRowOf(level) * TILE_SIZE - flagY);

  const p = engine.player;
  if (
    p.x + p.width > flagX &&
    p.x < flagX + flagWidth &&
    p.y + p.height > flagY &&
    p.y < flagY + flagHeight
  ) {
    // Boss-Arena: Solange noch ein Boss lebt, ist die Flagge gesperrt — erst
    // den Endgegner besiegen. Dezenter, gedrosselter Hinweis; kein Level-Ende.
    const bossAlive = engine.entities.some(
      e => e instanceof Boss && !e.isDead && e.alive,
    );
    if (bossAlive) {
      if (engine.renderer.time % 48 === 0) {
        engine.acquireFloatingText(flagX - 24, flagY + 24, 'Erst das Legacy-System besiegen!');
      }
      return false;
    }
    // Spielbarkeit & Fairness (Task #29): Zeit-Bonus nicht mehr sofort
    // gutschreiben — die Engine drained ihn im LEVEL_COMPLETE-Tick mit
    // Coin-SFX und sichtbarer Score-Animation. Beste Score und
    // carryStats werden in engine.finalizeLevelComplete() geschrieben,
    // sobald der Drain durch ist (oder der Spieler "Weiter" drückt).
    engine.setTimeBonus(Math.ceil(engine.time));
    const nextUnlock = Math.min(LEVELS.length, engine.currentLevelIndex + 2);
    // Mathe-Modus: NICHT automatisch freischalten — das Rechen-Quiz nach dem Level
    // ist das Tor (eigene Progression über settings.mathUnlocked in der UI).
    if (!getSettings().mathMode && nextUnlock > engine.unlockedLevels) {
      engine.unlockedLevels = nextUnlock;
      setUnlocked(engine.unlockedLevels);
      engine.emitEvent('unlock');
    }
    engine.grantAchievementById('first_steps');
    // Per-theme clear stickers: each of the 19 worlds has its own badge so
    // kids can chase a complete album by finishing every theme at least
    // once. Mapping is keyed off the level's theme name (see level.ts).
    const themeStickers: Record<string, string> = {
      jungle: 'jungle_clear',
      plush: 'plush_clear',
      forest: 'forest_clear',
      cave: 'cave_clear',
      sky: 'sky_clear',
      beach: 'beach_clear',
      australia: 'australia_clear',
      volcano: 'volcano_clear',
      ice: 'ice_clear',
      castle: 'castle_clear',
      underwater: 'underwater_clear',
      space: 'space_clear',
      school: 'school_clear',
      gym: 'gym_clear',
      trampoline: 'trampoline_clear',
      bluefield: 'bluefield_clear',
      dragon: 'dragon_clear',
      city: 'city_clear',
      vacation: 'vacation_clear',
    };
    const themeSticker = themeStickers[level.theme];
    if (themeSticker) engine.grantAchievementById(themeSticker);
    // Zwischenziel „Halbzeit-Heldin": 8 verschiedene Welten geschafft (gezählt
    // über die vorhandenen Welt-Durchgespielt-Sticker).
    const clearIds = Object.values(themeStickers);
    const clears = getStickers().filter(id => clearIds.includes(id)).length;
    if (clears >= 8) engine.grantAchievementById('half_worlds');
    if (!engine.tookHitThisLevel) engine.grantAchievementById('no_hit_clear');
    // Time-trial: finish with > 250s left on the clock (out of LEVEL_TIME=300).
    if (Math.ceil(engine.time) > 250) engine.grantAchievementById('speedrun_clear');
    if (engine.unlockedLevels >= LEVELS.length && nextUnlock >= LEVELS.length) {
      engine.grantAchievementById('all_levels');
    }
    audio.stopMusic();
    audio.playSfx('flag');
    engine.scheduleFanfare();
    engine.setEngineState(GameState.LEVEL_COMPLETE);
    if (engine.renderer.currentTheme === 'bluefield') {
      engine.trackFunnel('golive', { score: engine.player.score, specials: engine.specialCoinsThisRun.filter(Boolean).length });
    }
    return true;
  }
  return false;
}
