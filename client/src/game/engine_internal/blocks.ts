import {
  Entity, Coin, SpinningCoin, PowerUp, PiranhaPlant, Wizard, Switch, Door, FireBarrier,
} from '../entities';
import { isFreezable } from '../util/enemy-tags';

/**
 * Per-level "special block" registries. The level builder records the
 * (col,row) of every question-block that should pop a power-up instead
 * of a coin; the engine consults the matching set on hit.
 */
export interface SpecialBlocks {
  heart: Set<string>;
  star: Set<string>;
  fire: Set<string>;
  magnet: Set<string>;
  cape: Set<string>;
  shield: Set<string>;
  clock: Set<string>;
}

export function createSpecialBlocks(): SpecialBlocks {
  return {
    heart: new Set(),
    star: new Set(),
    fire: new Set(),
    magnet: new Set(),
    cape: new Set(),
    shield: new Set(),
    clock: new Set(),
  };
}

export const blockKey = (col: number, row: number) => `${col},${row}`;

/**
 * Entities that should never be culled by the generic off-screen sweep:
 * coins (the player may come back for them), in-flight power-ups, and
 * stationary enemies whose spawn point is fixed by level design and
 * which would otherwise vanish forever once scrolled past.
 *
 * Mobile enemies — including Ghosts — are intentionally NOT exempt and
 * disappear once they drift sufficiently off-screen, per the task's
 * generic off-screen-cleanup requirement.
 */
export function isCullExempt(e: Entity): boolean {
  return (
    e instanceof Coin ||
    e instanceof SpinningCoin ||
    e instanceof PowerUp ||
    e instanceof PiranhaPlant ||
    e instanceof Wizard ||
    e instanceof Switch ||
    e instanceof Door ||
    e instanceof FireBarrier
  );
}

/**
 * Enemies (and projectiles) that the time-stop clock can freeze in
 * place. Delegates to the central enemy-tag registry so update +
 * renderer agree on which entities skip their per-frame tick.
 */
export function isFreezableEnemy(e: Entity): boolean {
  return isFreezable(e);
}
