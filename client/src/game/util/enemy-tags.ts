// Single source of truth for enemy "trait" predicates that used to live
// as copy-pasted instanceof chains in shockwave.ts, blocks.ts,
// player_collisions.ts, render.ts and entity_step.ts.
//
// When a new enemy type is added, register it in the matching set below
// and every system that asks "is this enemy stompable / star-killable /
// fire-killable / AOE-killable / freezable / fireball-killable" picks it
// up automatically.
import {
  Entity, Goomba, Koopa, Bat, PiranhaPlant, Spider, Crab, Jellyfish,
  Kangaroo, Snake, Fireball, Ghost, Fish, Wizard, MagicBolt,
  BombOmb, SpikeBall, Hornet, BanzaiBill, CharginChuck, BigBoo,
  Ape, Seagull, LavaSlime, Yeti, Knight, MiniUFO,
  Coconut, Snowball, UFOLaser, BabyDragon,
} from '../entities';

type Ctor = new (...args: any[]) => Entity;

// Enemies the ground-pound shockwave + bomb AOE consider "killable".
// Note: BombOmb is intentionally absent here — bombs caught in a blast
// chain-detonate via .light() instead of being insta-killed.
const AOE_KILLABLE: Ctor[] = [
  Goomba, Koopa, Bat, PiranhaPlant, Spider, Crab,
  Jellyfish, Kangaroo, Snake, Fish, Wizard, SpikeBall,
  Hornet, BanzaiBill, CharginChuck, BigBoo, BabyDragon,
];

// Enemies + projectiles the Zeitlupen-Uhr can freeze. Includes
// projectiles (Fireball, MagicBolt, Coconut, Snowball, UFOLaser) so a
// frozen tableau also pauses incoming damage.
const FREEZABLE: Ctor[] = [
  Goomba, Koopa, Bat, PiranhaPlant, Spider, Crab,
  Jellyfish, Kangaroo, Snake, Fireball, Ghost, Fish,
  Wizard, MagicBolt, BombOmb, SpikeBall, Hornet,
  BanzaiBill, CharginChuck, BigBoo,
  Ape, Seagull, LavaSlime, Yeti, Knight, MiniUFO,
  Coconut, Snowball, UFOLaser, BabyDragon,
];

// Enemies + projectiles that Stern-Modus (star) destroys on contact.
// This is the widest list: star kills nearly everything it touches,
// including projectiles (MagicBolt, Fireball, Coconut, Snowball,
// UFOLaser). Ghost is included (star pierces its intangibility).
const STAR_KILLABLE: Ctor[] = [
  Goomba, Koopa, Bat, PiranhaPlant, Spider, Crab,
  Jellyfish, Kangaroo, Snake, Fish, Ghost, Wizard,
  MagicBolt, Fireball, BombOmb, SpikeBall, Hornet,
  BanzaiBill, CharginChuck, BigBoo,
  Ape, Seagull, LavaSlime, Yeti, Knight, MiniUFO,
  Coconut, Snowball, UFOLaser, BabyDragon,
];

// Enemies a kicked Koopa shell mows down. Intentionally NARROWER than
// star/fire: the shell is a ground-skimming projectile, so it only
// clears the classic small/medium walkers + flyers it can physically
// reach. Heavy/boss-like or design-fixed types (PiranhaPlant, Wizard,
// BombOmb, BanzaiBill, CharginChuck, BigBoo, Ape, Seagull, LavaSlime,
// Yeti, Knight, MiniUFO) are deliberately immune to shells.
// NOTE: This asymmetry is preserved from the original behavior — if a
// future redesign wants shells to fell heavy enemies too, extend here.
const SHELL_KILLABLE: Ctor[] = [
  Goomba, Koopa, Bat, Spider, Crab, Kangaroo,
  Snake, Jellyfish, Fish, Ghost, SpikeBall, Hornet, BabyDragon,
];

// Enemies a player fireball destroys. Excludes Ghost (intangible),
// PiranhaPlant and LavaSlime (thematically fire-immune), and BigBoo
// (handled by a dedicated "shatter on contact" branch). BombOmb is in
// the list but is lit rather than killed by the caller.
const FIRE_KILLABLE: Ctor[] = [
  Goomba, Koopa, Bat, Spider, Crab, Jellyfish,
  Kangaroo, Snake, Fish, Wizard, BombOmb, SpikeBall,
  Hornet, BanzaiBill, CharginChuck, Ape, Seagull,
  Yeti, Knight, MiniUFO, BabyDragon,
];

function matchesAny(e: Entity, ctors: Ctor[]): boolean {
  for (const C of ctors) if (e instanceof C) return true;
  return false;
}

/** Killable by ground-pound shockwave / bomb AOE. */
export function isAoeKillable(e: Entity): boolean {
  return matchesAny(e, AOE_KILLABLE);
}

/** Skips per-frame update while the Zeitlupen-Uhr is active. */
export function isFreezable(e: Entity): boolean {
  return matchesAny(e, FREEZABLE);
}

/** Destroyed on contact by Stern-Modus (star power). */
export function isStarKillable(e: Entity): boolean {
  return matchesAny(e, STAR_KILLABLE);
}

/** Mowed down by a kicked Koopa shell. */
export function isShellKillable(e: Entity): boolean {
  return matchesAny(e, SHELL_KILLABLE);
}

/** Destroyed by a player-fired fireball (BombOmb is lit, not killed). */
export function isFireKillable(e: Entity): boolean {
  return matchesAny(e, FIRE_KILLABLE);
}
