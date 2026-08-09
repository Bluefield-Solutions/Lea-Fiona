// Builds the live entities[] for a freshly-loaded level by mapping the
// level's EntitySpawn records onto concrete entity instances. Pulled out
// of engine.startLevel() so the (long) per-type spawn switch lives in
// its own file and reads top-to-bottom.
import { EntityType, TILE_SIZE, Direction } from '../constants';
import {
  Goomba, Koopa, Boss, Bat, Coin, PiranhaPlant, Spider, Crab, Jellyfish,
  Kangaroo, Deer, Snake, Fireball, Ghost, Fish, Wizard, BombOmb, SpikeBall,
  Hornet, BanzaiBill, CharginChuck, BigBoo,
  Ape, Seagull, LavaSlime, Yeti, Knight, MiniUFO, MovingPlatform, Spring, Crate, Switch, Door, FireBarrier,
  PowerUp, BabyDragon, DragonEgg,
} from '../entities';
import type { GameEngine } from '../engine';

export function spawnLevelEntities(engine: GameEngine): void {
  const theme = engine.level.theme;
  // Auf Wunsch entfernte Gegnertypen: Hornissen (Hornet), Quallen (Jellyfish)
  // und Raumschiffe (MiniUFO, u.a. in Welt 10). Werden in JEDEM Level beim
  // Laden übersprungen — die Leveldaten selbst bleiben unangetastet.
  const REMOVED_ENEMY_TYPES = new Set<EntityType>([
    EntityType.HORNET, EntityType.JELLYFISH, EntityType.MINI_UFO,
  ]);
  for (const spawn of engine.level.entities) {
    if (REMOVED_ENEMY_TYPES.has(spawn.type)) continue;
    switch (spawn.type) {
      case EntityType.GOOMBA:
        engine.entities.push(new Goomba(spawn.x, spawn.y));
        break;
      case EntityType.DEER:
        engine.entities.push(new Deer(spawn.x, spawn.y));
        break;
      case EntityType.DRAGON_EGG:
        engine.entities.push(new DragonEgg(spawn.x, spawn.y));
        break;
      case EntityType.BABY_DRAGON:
        engine.entities.push(new BabyDragon(spawn.x, spawn.y));
        break;
      case EntityType.WINGS: {
        // Direkt platzierte, ruhende Flügel-Fähigkeit (Paket 2). Emergiert
        // nicht aus einem Block, sondern schwebt an Ort und Stelle als
        // einsammelbare Belohnung.
        const wings = new PowerUp(spawn.x, spawn.y, 'wings');
        wings.emerging = false;
        wings.emergeTimer = 30;
        wings.startY = spawn.y;
        engine.entities.push(wings);
        break;
      }
      case EntityType.KOOPA:
        engine.entities.push(new Koopa(spawn.x, spawn.y));
        break;
      case EntityType.BOSS: {
        const boss = new Boss(spawn.x, spawn.y);
        if (theme === 'dragon') {
          // Der Drachen-Boss wird als großes Sprite gezeichnet. Damit der
          // Kopfsprung auf den SICHTBAREN Kopf zählt (und nicht nur auf die
          // kleine Standard-Box an den Füßen), bekommt er eine hohe Trefferbox,
          // die die gezeichnete Figur abdeckt. Füße bleiben am Boden.
          const newH = 92, newW = 58;
          boss.y -= (newH - boss.height);
          boss.height = newH;
          boss.width = newW;
        }
        engine.entities.push(boss);
        break;
      }
      case EntityType.BAT: {
        const bat = new Bat(spawn.x, spawn.y);
        if (theme === 'plush') bat.gentle = true;   // sanfter Flatter-Dino fürs Kinderlevel
        engine.entities.push(bat);
        break;
      }
      case EntityType.PIRANHA:
        engine.entities.push(new PiranhaPlant(
          Math.floor(spawn.x / TILE_SIZE),
          Math.floor(spawn.y / TILE_SIZE),
        ));
        break;
      case EntityType.SPIDER:
        engine.entities.push(new Spider(spawn.x, spawn.y));
        break;
      case EntityType.CRAB:
        engine.entities.push(new Crab(spawn.x, spawn.y));
        break;
      case EntityType.JELLYFISH:
        engine.entities.push(new Jellyfish(spawn.x, spawn.y));
        break;
      case EntityType.KANGAROO: {
        const k = new Kangaroo(spawn.x, spawn.y);
        if (theme === 'plush') k.gentle = true;   // sanfter Hüpf-Dino fürs Kinderlevel
        engine.entities.push(k);
        break;
      }
      case EntityType.SNAKE:
        engine.entities.push(new Snake(spawn.x, spawn.y));
        break;
      case EntityType.COIN:
        engine.entities.push(new Coin(spawn.x, spawn.y));
        break;
      case EntityType.FIREBALL: {
        const variant = theme === 'ice' ? 'ice'
          : theme === 'space' ? 'plasma'
          : 'fire';
        engine.entities.push(new Fireball(spawn.x, spawn.y, variant));
        break;
      }
      case EntityType.GHOST: {
        const variant = theme === 'space' ? 'space' : 'castle';
        engine.entities.push(new Ghost(spawn.x, spawn.y, variant));
        break;
      }
      case EntityType.FISH:
        engine.entities.push(new Fish(spawn.x, spawn.y));
        break;
      case EntityType.WIZARD:
        engine.entities.push(new Wizard(spawn.x, spawn.y));
        break;
      case EntityType.BOMB_OMB:
        engine.entities.push(new BombOmb(spawn.x, spawn.y));
        break;
      case EntityType.SPIKE_BALL:
        engine.entities.push(new SpikeBall(spawn.x, spawn.y));
        break;
      case EntityType.HORNET:
        engine.entities.push(new Hornet(spawn.x, spawn.y));
        break;
      case EntityType.BANZAI_BILL: {
        // Spawn-Richtung steckt im optionalen `dir`-Property der
        // Level-Definition. Default: nach links (klassisches SMW).
        const dir = (spawn as { dir?: 'left' | 'right' }).dir === 'right'
          ? Direction.RIGHT : Direction.LEFT;
        engine.entities.push(new BanzaiBill(spawn.x, spawn.y, dir));
        break;
      }
      case EntityType.CHARGIN_CHUCK:
        engine.entities.push(new CharginChuck(spawn.x, spawn.y));
        break;
      case EntityType.BIG_BOO:
        engine.entities.push(new BigBoo(spawn.x, spawn.y));
        break;
      case EntityType.APE:
        engine.entities.push(new Ape(spawn.x, spawn.y));
        break;
      case EntityType.SEAGULL:
        engine.entities.push(new Seagull(spawn.x, spawn.y));
        break;
      case EntityType.LAVA_SLIME:
        engine.entities.push(new LavaSlime(spawn.x, spawn.y));
        break;
      case EntityType.YETI:
        engine.entities.push(new Yeti(spawn.x, spawn.y));
        break;
      case EntityType.KNIGHT:
        engine.entities.push(new Knight(spawn.x, spawn.y));
        break;
      case EntityType.MINI_UFO:
        engine.entities.push(new MiniUFO(spawn.x, spawn.y));
        break;
      case EntityType.SPRING_STONE: {
        // Oberkante bündig auf die angegebene Boden-/Ziel-Kante setzen.
        const sp = new Spring(spawn.x, spawn.y);
        sp.y = spawn.y - sp.height;
        engine.entities.push(sp);
        break;
      }
      case EntityType.CRATE: {
        // Unterkante auf die angegebene Boden-/Ziel-Kante setzen, zentriert.
        const cr = new Crate(spawn.x, spawn.y);
        cr.x = spawn.x + 1;
        cr.y = spawn.y - cr.height;
        engine.entities.push(cr);
        break;
      }
      case EntityType.P_SWITCH: {
        const sw = new Switch(spawn.x, spawn.y, spawn.group ?? 0);
        sw.y = spawn.y - sw.height;   // Oberkante bündig auf den Boden
        engine.entities.push(sw);
        break;
      }
      case EntityType.DOOR: {
        const h = spawn.hTiles ?? 3;
        const dr = new Door(spawn.x, spawn.y - h * TILE_SIZE, h, spawn.group ?? 0);
        engine.entities.push(dr);
        break;
      }
      case EntityType.FIRE_BARRIER: {
        // Unterkante auf spawn.y (Bodenkante), wächst nach oben.
        const h = spawn.hTiles ?? 3;
        const fb = new FireBarrier(spawn.x, spawn.y - h * TILE_SIZE, h);
        engine.entities.push(fb);
        break;
      }
    }
  }

  // Bewegliche Plattformen aus der Level-Spec erzeugen: jede pendelt um
  // ihren Anker (centerCol/centerRow) auf der gewählten Achse. Startpunkt
  // ist ein Pendel-Ende, die volle Strecke ist 2×Amplitude.
  for (const spec of engine.level.movingPlatforms || []) {
    const axis: 'h' | 'v' = spec.path === 'horizontal' ? 'h' : 'v';
    const amp = spec.amplitudeTiles * TILE_SIZE;
    const cx = spec.centerCol * TILE_SIZE;
    const cy = spec.centerRow * TILE_SIZE;
    const startX = axis === 'h' ? cx - amp : cx;
    const startY = axis === 'v' ? cy - amp : cy;
    engine.entities.push(new MovingPlatform(startX, startY, spec.widthTiles, axis, 2 * amp, spec.speed ?? 1));
  }
}
