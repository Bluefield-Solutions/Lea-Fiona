// Thematic re-export barrel for the game's entity classes.
  //
  // The implementation now lives under `./entities/`, split into family
  // modules so each file is small enough to navigate quickly:
  //   - base.ts        AABB interface + Entity base class
  //   - player.ts      Player class (movement, power-ups, abilities)
  //   - pickups.ts     Coin, SpinningCoin, PowerUp + PowerUpKind
  //   - enemies.ts     Goombas, Koopas, Bats, Piranhas, Bombs, Hornets, etc.
  //   - projectiles.ts Fireballs, MagicBolts, Wizard, PlayerFireball
  //   - fx.ts          Particle, FloatingText (visual feedback)
  //
  // All public types/classes are re-exported here so existing
  // `import { ... } from './entities'` call sites keep working unchanged.

  export type { AABB } from './entities/base';
  export { Entity } from './entities/base';
  export { Player } from './entities/player';
  export { Coin, SpinningCoin, SpecialCoin, PowerUp } from './entities/pickups';
  export type { PowerUpKind } from './entities/pickups';
  export {
    Goomba, Koopa, Boss, Bat, PiranhaPlant, Spider, Crab, Jellyfish, Kangaroo,
    Deer, BrownDeer, DeerBoss, Sheep, Turtle, Mouse, SnakeBoss,
    Rat, TrashCan, Geyser, RatBoss,
    Snake, Ghost, Fish, BombOmb, BombExplosion, SpikeBall, Hornet,
    BanzaiBill, CharginChuck, BigBoo,
    Ape, Seagull, LavaSlime, Yeti, Knight, MiniUFO,
    BabyDragon, DragonEgg,
  } from './entities/enemies';
  export {
    Fireball, Wizard, MagicBolt, PlayerFireball,
    Coconut, Snowball, UFOLaser,
  } from './entities/projectiles';
  export { Particle, FloatingText, MovingPlatform, Spring, Crate, Switch, Door, FireBarrier } from './entities/fx';
