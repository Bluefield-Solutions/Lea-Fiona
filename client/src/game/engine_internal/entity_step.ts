// Per-entity physics + AI step. Pulled out of engine.updatePlaying() so
// the long per-type switch lives in its own file. Also runs the post-
// update bookkeeping (particle tick, shockwave aging, off-screen
// culling, pool recycling, alive filter).
import {
  Entity, Goomba, Koopa, Boss, Bat, Coin, SpinningCoin, PowerUp, PiranhaPlant,
  Spider, Crab, Jellyfish, Kangaroo, Deer, BrownDeer, DeerBoss, Snake, Fireball, Ghost, Fish,
  Wizard, MagicBolt, BombOmb, BombExplosion, PlayerFireball, SpikeBall,
  Hornet, BanzaiBill, CharginChuck, BigBoo,
  Ape, Seagull, LavaSlime, Yeti, Knight, MiniUFO, BabyDragon, DragonEgg,
  Coconut, Snowball, UFOLaser,
  MovingPlatform, Spring, Crate, Switch, Door, FireBarrier,
} from '../entities';
import { Direction } from '../constants';
import { audio } from '../audio';
import { TILE_SIZE, MAGNET_RANGE, MAGNET_PULL_SPEED } from '../constants';
import type { GameEngine } from '../engine';

export function stepEntities(engine: GameEngine): void {
  const player = engine.player;
  const physics = engine.physics;
  // Plüsch-Dino-Geräusche nur in der Kuschelwelt. Nah am Spieler + gedrosselt,
  // damit es nicht nervt. Stereo-Pan nach relativer Position.
  const plush = engine.level.theme === 'plush';
  const dinoPan = (e: Entity) => Math.max(-1, Math.min(1, (e.x - player.x) / 400));
  const dinoNear = (e: Entity) => Math.abs(e.x - player.x) < 380;

  for (const entity of engine.entities) {
    if (!entity.alive) continue;

    // Zeitlupen-Uhr: while active, every freezable enemy + their
    // projectiles skip update + physics entirely. Visuals stay frozen
    // mid-animation; player wades through the tableau.
    if (engine.clockFrozen && engine.isFreezableEnemy(entity)) continue;

    if (entity instanceof MovingPlatform) {
      entity.update(1); // pendelt nur; Carry der Spielerin macht die Engine
    } else if (entity instanceof Spring) {
      entity.update(1); // nur Animations-/Cooldown-Tick; Launch macht die Engine
    } else if (entity instanceof Crate) {
      entity.update(1);              // Schwerkraft + Push-Ausklang
      physics.moveEntity(entity);    // fällt, ruht auf Boden, blockt an Wänden
    } else if (entity instanceof Switch || entity instanceof Door || entity instanceof FireBarrier) {
      entity.update(1);              // Animation; Logik macht die Engine (Player-/Fireball-Pass)
    } else if (entity instanceof Goomba) {
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
        // Läufer-Dino tapst leise beim Watscheln.
        if (plush && dinoNear(entity)) {
          const a = entity as unknown as { _stepCd?: number };
          a._stepCd = (a._stepCd ?? 0) - 1;
          if (a._stepCd <= 0) { audio.playSfx('dinoStep', dinoPan(entity)); a._stepCd = 32; }
        }
      }
    } else if (entity instanceof Boss) {
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
        // In der Arena halten (nicht aus der Kampfzone wandern). Linke Grenze
        // theme-abhängig: Welt 16 (Drache) hat ihre eigene, engere Arena.
        const isDragon = engine.level.theme === 'dragon';
        const leftBound = (isDragon ? 140 : 273) * TILE_SIZE;
        if (entity.x < leftBound && entity.direction === Direction.LEFT) {
          entity.reverseDirection();
        }
        // Sprung-Stampfer (Welt 16): beim Landen nach einem Sprung eine
        // Boden-Schockwelle erzeugen. Trifft sie die Spielerin am Boden, wird
        // sie kräftig weggestoßen (kein Schaden — telegrafiert durch den Sprung,
        // fair zum Ausweichen: einfach im richtigen Moment springen).
        const landed = entity.onGround && !entity.prevOnGround;
        entity.prevOnGround = entity.onGround;
        if (isDragon && landed) {
          const bcx = entity.x + entity.width / 2;
          const by = entity.y + entity.height;
          engine.shockwaves.push({ x: bcx, y: by, age: 0, max: 26, radius: 300 });
          engine.shakeCamera(6, 12);
          audio.playSfx('stomp', engine.panForWorldX(bcx));
          // Nur wenn die Spielerin am Boden und in Reichweite steht → Wegstoß.
          const pcx = player.x + player.width / 2;
          const dxg = pcx - bcx;
          if (player.onGround && Math.abs(dxg) < 230 && Math.abs((player.y + player.height) - by) < 60) {
            player.velX = (dxg < 0 ? -1 : 1) * 7;
            player.velY = -5;
            player.onGround = false;
            player.airControlLockTimer = Math.max(player.airControlLockTimer, 12);
          }
        }
        // Angriff: Boss speit/wirft Richtung Spielerin.
        if (entity.throwThisFrame) {
          const cx = entity.x + entity.width / 2;
          const dir = (player.x + player.width / 2) < cx ? Direction.LEFT : Direction.RIGHT;
          const by = entity.y + entity.height * 0.4;
          const bx = cx - 9;
          if (isDragon) {
            // User-Wunsch: KEINE Feuerbälle mehr. Der Drache brüllt nur noch
            // bedrohlich (Fauch) — die eigentliche Gefahr ist sein Sprung-Stampfer.
            audio.playSfx('kick', engine.panForWorldX(cx));
          } else {
            engine.entities.push(engine.acquireMagicBolt(bx, by, dir));
          }
        }
      }
    } else if (entity instanceof Koopa) {
      entity.update(1);
      const result = physics.moveEntity(entity);
      if (entity.isShell && entity.shellMoving) {
        // User-Wunsch: ein weggetretener Panzer prallt NICHT von der Wand zurück
        // und rutscht zur Spielerin zurück — er zerschellt an der Wand (kleine
        // Staubwolke) und ist weg. Ohne Wand-Treffer räumt er wie gehabt Gegner ab.
        if (result.hitWall) {
          engine.spawnDust(entity.x + entity.width / 2, entity.y + entity.height / 2, entity.direction);
          entity.alive = false;
        } else {
          engine.checkShellCollisions(entity);
        }
      } else {
        if (result.hitWall) entity.reverseDirection();
        if (!entity.isShell && result.edgeDetected) entity.reverseDirection();
        // Panzer-Dino schnarcht gemütlich vor sich hin (nur laufend, nicht als Panzer).
        if (plush && !entity.isShell && dinoNear(entity)) {
          const a = entity as unknown as { _snoreCd?: number };
          a._snoreCd = (a._snoreCd ?? 40) - 1;
          if (a._snoreCd <= 0) { audio.playSfx('dinoSnore', dinoPan(entity)); a._snoreCd = 170; }
        }
      }
    } else if (entity instanceof Bat) {
      entity.activate(player.x);
      entity.update(1);
      // Flatter-Dino macht ein leises Flügel-„Flatter" (nur plush, nah, gedrosselt).
      if (plush && entity.active && dinoNear(entity)) {
        const a = entity as unknown as { _flutterCd?: number };
        a._flutterCd = (a._flutterCd ?? 0) - 1;
        if (a._flutterCd <= 0) { audio.playSfx('dinoFlutter', dinoPan(entity)); a._flutterCd = 46; }
      }
    } else if (entity instanceof PowerUp) {
      entity.update(1);
      if (!entity.emerging) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
      }
    } else if (entity instanceof PiranhaPlant) {
      entity.sensePlayer(player.x + player.width / 2);
      entity.update(1);
    } else if (entity instanceof Spider) {
      entity.activate(player.x);
      entity.update(1);
    } else if (entity instanceof Crab) {
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
      }
    } else if (entity instanceof Jellyfish) {
      entity.activate(player.x);
      entity.update(1);
    } else if (entity instanceof Kangaroo) {
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
        // Hüpf-Dino macht „Boing" genau im Moment des Absprungs.
        if (plush) {
          const a = entity as unknown as { _wasGround?: boolean };
          const wasGround = a._wasGround ?? true;
          if (wasGround && !entity.onGround && entity.velY < 0 && dinoNear(entity)) {
            audio.playSfx('dinoBoing', dinoPan(entity));
          }
          a._wasGround = entity.onGround;
        }
      }
    } else if (entity instanceof Deer || entity instanceof BrownDeer || entity instanceof DeerBoss) {
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
      }
    } else if (entity instanceof Snake) {
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
      }
    } else if (entity instanceof Fireball) {
      // Fireball is a falling projectile: ignore tile collision so it can
      // fall through floors/ceilings and just dies on lifetime expiry.
      entity.update(1);
    } else if (entity instanceof Ghost) {
      entity.activate(player.x);
      entity.update(1);
      // Ghost passes through walls; only despawns if it drifts way off the map.
      if (entity.x < -200 || entity.x > engine.level.width * TILE_SIZE + 200) {
        entity.alive = false;
      }
    } else if (entity instanceof Fish) {
      entity.activate(player.x);
      entity.update(1);
      // Underwater swimmer ignores tiles; flips at level edges.
      if (entity.x < 0 || entity.x > (engine.level.width - 1) * TILE_SIZE) {
        entity.reverseDirection();
      }
    } else if (entity instanceof Wizard) {
      entity.activate(player.x);
      entity.update(1);
      if (!entity.isDead && entity.teleportPhase === 0) {
        // Same tile-snap as a Goomba — gravity pulls him onto the
        // ground and reverseDirection on a wall is a no-op since he
        // doesn't walk.
        physics.moveEntity(entity);
      }
    } else if (entity instanceof MagicBolt) {
      entity.update(1);
      // World-edge despawn so bolts never accumulate forever.
      if (entity.x < -50 || entity.x > engine.level.width * TILE_SIZE + 50) {
        entity.alive = false;
      }
      // Tile collision: bolts now fizzle on solid walls/ceilings/floors
      // so a Wizard tucked behind cover can't snipe through stone.
      // Sample the bolt's centre-tile — cheap and accurate enough at the
      // bolt's 18 px hitbox.
      if (entity.alive) {
        const cx = entity.x + entity.width / 2;
        const cy = entity.y + entity.height / 2;
        const col = Math.floor(cx / TILE_SIZE);
        const row = Math.floor(cy / TILE_SIZE);
        if (physics.isSolid(col, row)) {
          entity.alive = false;
          engine.spawnStompParticles(cx, cy);
          audio.playSfx('blockHit');
        }
      }
    } else if (entity instanceof Coin) {
      entity.update(1);
      // Münz-Magnet: while the gadget is active, pull every coin in
      // MAGNET_RANGE toward the player's centre. Done here so the
      // pickup check on the next pass collects it naturally.
      if (player.magnetTimer > 0 && !entity.collected) {
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const ex = entity.x + entity.width / 2;
        const ey = entity.y + entity.height / 2;
        const dx = px - ex;
        const dy = py - ey;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.5 && dist < MAGNET_RANGE) {
          entity.x += (dx / dist) * MAGNET_PULL_SPEED;
          entity.y += (dy / dist) * MAGNET_PULL_SPEED;
        }
      }
    } else if (entity instanceof SpinningCoin) {
      entity.update(1);
    } else if (entity instanceof BombOmb) {
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
      }
      // Lit bomb has reached fuse end: detonate. Removes the bomb and
      // spawns a BombExplosion that handles AOE on the next pass.
      if (entity.shouldExplode) {
        engine.detonateBomb(entity);
      }
    } else if (entity instanceof SpikeBall) {
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        // edgeBehavior=false on purpose — SpikeBall rolls off ledges.
      }
    } else if (entity instanceof Hornet) {
      // Engine-driven aggro check: feed the player centre into the
      // hornet so it can decide whether to dive on the next update().
      entity.chase(
        player.x + player.width / 2,
        player.y + player.height / 2,
      );
      entity.update(1);
    } else if (entity instanceof BanzaiBill) {
      // Schwerelos. Aktiviert bei Sichtkontakt, dann konstantes Driften.
      entity.activate(
        player.x + player.width / 2,
        player.y + player.height / 2,
      );
      entity.update(1);
    } else if (entity instanceof CharginChuck) {
      entity.chase(player.x + player.width / 2);
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
      }
    } else if (entity instanceof BigBoo) {
      entity.activate(player.x);
      entity.watch(
        player.x + player.width / 2,
        player.y + player.height / 2,
        player.direction,
      );
      entity.update(1);
    } else if (entity instanceof BombExplosion) {
      entity.update(1);
    } else if (entity instanceof Ape) {
      entity.chase(player.x + player.width / 2);
      entity.update(1);
      if (!entity.isDead) physics.moveEntity(entity);
      if (entity.throwThisFrame) {
        const dir = entity.direction;
        const cx = entity.x + (dir === Direction.LEFT ? -8 : entity.width - 4);
        const cy = entity.y + 4;
        engine.entities.push(new Coconut(cx, cy, dir));
        audio.playSfx('monkeyThrow');
      }
    } else if (entity instanceof Seagull) {
      entity.chase(
        player.x + player.width / 2,
        player.y + player.height / 2,
      );
      entity.update(1);
    } else if (entity instanceof LavaSlime) {
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
      }
    } else if (entity instanceof Yeti) {
      entity.chase(player.x + player.width / 2);
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
      }
      if (entity.throwThisFrame) {
        const dir = entity.direction;
        const sx = entity.x + (dir === Direction.LEFT ? -10 : entity.width - 4);
        const sy = entity.y + entity.height * 0.6;
        engine.entities.push(new Snowball(sx, sy, dir));
        audio.playSfx('snowballRoll');
      }
    } else if (entity instanceof Knight) {
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
      }
    } else if (entity instanceof DragonEgg) {
      // Ei schlüpft bei Annäherung; danach spawnt ein Baby-Drache an seiner Stelle.
      entity.proximity(player.x + player.width / 2, player.y + player.height / 2);
      entity.update(1);
      if (entity.hatched) {
        const bx = entity.x + entity.width / 2 - 13;
        const by = entity.y + entity.height - 24;
        engine.entities.push(new BabyDragon(bx, by));
        engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height * 0.4);
        audio.playSfx('powerup');
      }
    } else if (entity instanceof BabyDragon) {
      entity.chase(player.x + player.width / 2);
      entity.update(1);
      if (!entity.isDead) {
        const result = physics.moveEntity(entity);
        if (result.hitWall) entity.reverseDirection();
        if (result.edgeDetected && entity.edgeBehavior) entity.reverseDirection();
      } else {
        entity.y += entity.velY;
      }
    } else if (entity instanceof MiniUFO) {
      entity.chase(
        player.x + player.width / 2,
        player.y + player.height / 2,
      );
      entity.update(1);
      if (entity.fireThisFrame) {
        const lx = entity.x + entity.width / 2 - 3;
        const ly = entity.y + entity.height;
        engine.entities.push(new UFOLaser(lx, ly));
        audio.playSfx('laserShoot');
      }
    } else if (entity instanceof Coconut) {
      entity.update(1);
      const r = physics.moveEntity(entity);
      // An Wand oder Decke aufprallen → zerschellt (kleines Stomp-Funkeln).
      if (r.hitWall || r.hitCeiling || r.hitFloor) {
        entity.alive = false;
        engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
      }
      if (entity.x < -50 || entity.x > engine.level.width * TILE_SIZE + 50) {
        entity.alive = false;
      }
    } else if (entity instanceof Snowball) {
      entity.update(1);
      const r = physics.moveEntity(entity);
      // Sobald der Schneeball den Boden trifft, beginnt er zu rollen statt
      // weiter zu fallen — dann wächst er auch.
      if (r.hitFloor) entity.rolling = true;
      // An einer Wand zerschellen (klassische Schneeball-Mechanik).
      if (r.hitWall) {
        entity.alive = false;
        engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
      }
      if (entity.x < -50 || entity.x > engine.level.width * TILE_SIZE + 50) {
        entity.alive = false;
      }
    } else if (entity instanceof UFOLaser) {
      entity.update(1);
      const r = physics.moveEntity(entity);
      if (r.hitFloor || r.hitWall || r.hitCeiling) {
        entity.alive = false;
        engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
      }
    } else if (entity instanceof PlayerFireball) {
      entity.update(1);
      const result = physics.moveEntity(entity);
      if (result.hitWall || result.hitCeiling) {
        entity.alive = false;
        engine.spawnStompParticles(entity.x + entity.width / 2, entity.y + entity.height / 2);
      } else if (entity.onGround && entity.velY >= 0) {
        // Solid-ground hit: bounce instead of dying.
        entity.bounce();
      }
    }
  }

  for (const p of engine.particles) {
    p.update(1);
  }

  // Tick shockwaves and drop expired ones. Cheap O(n) — in-place
  // two-pointer compaction so we don't allocate a fresh array each frame.
  {
    let w = 0;
    for (let r = 0; r < engine.shockwaves.length; r++) {
      const s = engine.shockwaves[r];
      s.age++;
      if (s.age < s.max) engine.shockwaves[w++] = s;
    }
    engine.shockwaves.length = w;
  }

  // Tick Flügelschlag-Puffs (Doppelsprung) analog zu den Shockwaves.
  {
    let w = 0;
    for (let r = 0; r < engine.wingFlutters.length; r++) {
      const f = engine.wingFlutters[r];
      f.age++;
      if (f.age < f.max) engine.wingFlutters[w++] = f;
    }
    engine.wingFlutters.length = w;
  }

  // Tick Coin-Pop-Ringe (Feinschliff) analog zu den Shockwaves.
  {
    let w = 0;
    for (let r = 0; r < engine.coinPops.length; r++) {
      const c = engine.coinPops[r];
      c.age++;
      if (c.age < c.max) engine.coinPops[w++] = c;
    }
    engine.coinPops.length = w;
  }

  // Off-screen entity cleanup (D1): cull enemies that fell into a pit
  // OR are far behind the camera (player has already moved past them
  // and they're not coming back). Conservative thresholds so we never
  // kill an enemy the player can still encounter going right. Persistent
  // pickups + active power-up drops are exempt — they wait for the
  // player even after the camera scrolls.
  if (engine.level) {
    const worldFloor = engine.level.height * TILE_SIZE + 200;
    const cullLeftOf = engine.camera.x - 600;
    for (const e of engine.entities) {
      if (!e.alive) continue;
      if (engine.isCullExempt(e)) continue;
      if (e.y > worldFloor) e.alive = false;
      else if ((e.x + e.width) < cullLeftOf) e.alive = false;
    }
  }

  // Recycle pooled dead entities into the appropriate pool BEFORE the
  // filter drops them. Cheap O(n); skip-fast for non-pooled types.
  for (const e of engine.entities) if (!e.alive) engine.recycleEntity(e);
  for (const p of engine.particles) if (!p.alive) engine.recycleParticle(p);

  // In-place two-pointer compaction. Avoids the per-frame array
  // re-allocation that .filter() does.
  {
    const arr = engine.entities;
    let w = 0;
    for (let r = 0; r < arr.length; r++) if (arr[r].alive) arr[w++] = arr[r];
    arr.length = w;
  }
  {
    const arr = engine.particles;
    let w = 0;
    for (let r = 0; r < arr.length; r++) if (arr[r].alive) arr[w++] = arr[r];
    arr.length = w;
  }
}
