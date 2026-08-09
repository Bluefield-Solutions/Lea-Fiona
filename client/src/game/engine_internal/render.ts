// All canvas drawing for the active frame. Pulled out of engine.render()
// so the long per-entity-type switch + theme-ambient dispatch lives in
// its own file. Reads engine state but does NOT mutate gameplay state.
import {
  TILE_SIZE, GameState, TileType, CANVAS_WIDTH, CANVAS_HEIGHT, SWING_AMP, SWING_DRIVE,
  ROPE_SWING_AMP, ROPE_SWING_DRIVE,
} from '../constants';
import {
  Coin, SpinningCoin, SpecialCoin, Goomba, Koopa, Boss, Bat, PowerUp, SpikeBall, Hornet, MovingPlatform, Spring, Crate, Switch, Door, FireBarrier,
  BombOmb, BombExplosion, PlayerFireball, Spider, Crab, Jellyfish,
  Kangaroo, Snake, Fireball, Ghost, Fish, Wizard, MagicBolt, PiranhaPlant,
  BanzaiBill, CharginChuck, BigBoo,
  Particle, FloatingText,
  Ape, Seagull, LavaSlime, Yeti, Knight, MiniUFO, BabyDragon, DragonEgg,
  Coconut, Snowball, UFOLaser,
} from '../entities';
import type { GameEngine } from '../engine';
import { isSolidForCollision, groundRowOf } from '../level';
import { smoothGroundY, isInHill } from '../terrain';
import { getSettings } from '../storage';
import { getGlowDisc, stampGlow } from '../gfx/glow';

// Module-scope scratch buffers for camera.worldToScreenInto. Reused by
// every runRender call so the per-frame projection no longer allocates
// a fresh {x,y} object for every entity / tile / particle.
const _s = { x: 0, y: 0 };
const _s2 = { x: 0, y: 0 };

// Owner-Wunsch (v460): Alle Tutorial-Schilder (Text-Tafeln UND Pfosten) global
// ausgeblendet — sauberer Look. Ein Schalter statt Dutzender Level-Edits; die
// SIGN-Tiles bleiben in den Daten (nicht-solide, kein Gameplay-Effekt), werden
// aber nicht mehr gezeichnet. Auf true setzen, um Schilder zurückzuholen.
const SHOW_TUTORIAL_SIGNS = false;
// Fix B-02: Tutorial-Schilder nennen fest Tastatur-Tasten (Shift/F). Auf
// Touch-/Mobilgeräten existieren diese nicht → übersetze die Hinweise auf die
// Touch-Bedienung. Nur bei isMobile aktiv; am Desktop bleiben die Tastentexte.
const _signCache = new Map<string, string[]>();
function adaptSignLines(lines: string[], isMobile: boolean): string[] {
  if (!isMobile) return lines;
  const key = lines.join('');
  const hit = _signCache.get(key);
  if (hit) return hit;
  const out = lines.map((l) =>
    l
      .replace(/Shift\s*=\s*Sprint/gi, '2× tippen = Rennen')
      .replace(/\bShift\b/g, '2× tippen')
      .replace(/\+\s*F\.?(?=\s|$)/g, '+ F-Knopf')
      .replace(/\bF-Taste\b/gi, 'F-Knopf'),
  );
  _signCache.set(key, out);
  return out;
}

export function runRender(engine: GameEngine): void {
  // Apply the DPR-aware base transform once per frame. All renderer
  // code continues to draw in CANVAS_WIDTH × CANVAS_HEIGHT logical
  // coordinates; this transform maps logical pixels onto the
  // (potentially high-DPR) backing store. Set every frame so any
  // ad-hoc setTransform during the previous frame's draws can't leak
  // into this one.
  engine.renderer.ctx.setTransform(engine.renderScaleX, 0, 0, engine.renderScaleY, 0, 0);
  engine.renderer.ctx.imageSmoothingEnabled = false;

  engine.renderer.clear();

  if (engine.state === GameState.TITLE) {
    engine.renderer.drawTitleScreen(engine.unlockedLevels);
    return;
  }

  engine.compositor.composite(engine, { world: renderWorldLayer, post: renderPostLayer });
}

// ===========================================================================
// WORLD-Layer (AP 0.2): Kamera-Shake, Parallax-Hintergrund, Tiles + Under-
// shadows, Tutorial-Signs, alle Entities, Shockwaves, Flagge/Checkpoint,
// Spieler (+ Bodenschatten), Partikel und das Theme-Ambient — alles bis vor
// dem finalen Color-Grade. Vom Compositor ausgeführt; Reihenfolge unverändert.
// ===========================================================================
function renderWorldLayer(engine: GameEngine): void {
  engine.camera.tickShake();
  // Publikums-Erregung (Turnhalle) an den Renderer geben, BEVOR der Hintergrund
  // (mit der jubelnden Tribüne) gezeichnet wird.
  engine.renderer.crowdExcite = engine.crowdExcite;
  engine.renderer.drawBackground(engine.camera, engine.level.width);
  if (engine.level.theme === 'jungle') {
    engine.renderer.drawJungleHaze(engine.camera.x, engine.renderer.viewportW, engine.renderer.viewportH);
  } else {
    // Aerial-Perspective-Dunst für alle übrigen Welten (Jungle hat seinen
    // eigenen, bereits abgestimmten Haze oben).
    engine.renderer.drawAerialHaze(engine.renderer.viewportW, engine.renderer.viewportH);
  }

  const startCol = Math.max(0, Math.floor(engine.camera.x / TILE_SIZE) - 1);
  const endCol = Math.min(engine.level.width - 1, Math.ceil((engine.camera.x + engine.camera.width) / TILE_SIZE) + 1);
  const startRow = Math.max(0, Math.floor(engine.camera.y / TILE_SIZE) - 1);
  const endRow = Math.min(engine.level.height - 1, Math.ceil((engine.camera.y + engine.camera.height) / TILE_SIZE) + 1);

  // Bodenband (Etappe 1): In Gras-Welten liefert die durchgehende Kurve die
  // Oberfläche; die oberste Boden-Reihe wird daher als reine Erde gezeichnet.
  const groundBaseRow = groundRowOf(engine.level);
  const grassBand = engine.level.theme === 'jungle' || engine.level.theme === 'beach' || engine.level.theme === 'australia' || engine.level.theme === 'bluefield' || engine.level.theme === 'forest';

  // Waldbach-Schimmer: Tageslicht-Anteil aus dem Level-Fortschritt (wie im
  // Wald-Hintergrund), damit die Reflexe tags hell und nachts kühl-silbrig sind.
  const isForest = engine.level.theme === 'forest';
  let forestDayF = 0;
  if (isForest) {
    const span = Math.max(1, (engine.camera.worldWidth || engine.camera.width) - engine.camera.width);
    const fp = Math.max(0, Math.min(1, engine.camera.x / span));
    const k = Math.max(0, Math.min(1, (fp - 0.30) / (0.56 - 0.30)));
    forestDayF = 1 - k * k * (3 - 2 * k);
  }

  // Nahe Vegetation (Büsche) hinter dem Spielfeld, an die Bodenlinie gekoppelt.
  if (engine.renderer.quality !== 'low') {
    renderNearBushes(engine, startCol, endCol);
  }

  for (const entity of engine.entities) {
    if (!entity.alive) continue;
    if (!(entity instanceof PiranhaPlant)) continue;
    if (!engine.camera.isVisible(entity.x, entity.y, entity.width, entity.height)) continue;
    const screen = engine.camera.worldToScreenInto(entity.x, entity.y, _s);
    const pipeScreen = engine.camera.worldToScreenInto(entity.pipeX, entity.pipeTopY, _s2);
    engine.renderer.drawPiranhaPlant(screen.x, screen.y, entity.width, entity.height, entity.emergeOffset, entity.frame, pipeScreen.y);
  }

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = engine.level.tiles[row][col];
      // Schilder-Pfosten global ausgeblendet (Owner-Wunsch v460).
      if (tile === TileType.SIGN && !SHOW_TUTORIAL_SIGNS) continue;
      if (tile !== TileType.EMPTY) {
        const screen = engine.camera.worldToScreenInto(col * TILE_SIZE, row * TILE_SIZE, _s);
        // Contact shadow under platform/overhang undersides (solid tile with
        // empty space below) so platforms lift off the background.
        const below = engine.level.tiles[row + 1]?.[col] ?? TileType.EMPTY;
        if (isSolidForCollision(tile) && below === TileType.EMPTY) {
          engine.renderer.drawTileUndershadow(screen.x, screen.y, tile);
        }
        // Note-Block-Einsack-Animation: kurz nach dem Absprung wippt der Block
        // nach unten und federt zurück (Sinus-Halbwelle über die Restdauer).
        let tileDip = 0;
        if (tile === TileType.NOTE_BLOCK && engine.noteBounceTimers.size > 0) {
          const tmr = engine.noteBounceTimers.get(`${col},${row}`) ?? 0;
          if (tmr > 0) tileDip = Math.sin((tmr / 10) * Math.PI) * 6;
        }
        // In Gras-Welten liefert das Bodenband Gras/Narbe — oberste Boden-Reihe
        // daher als reine Erde, sonst doppelte Oberfläche / Naht.
        let drawTileType = tile;
        if (grassBand && tile === TileType.GROUND_TOP && row === groundBaseRow) {
          drawTileType = TileType.GROUND;
        }
        engine.renderer.drawTile(drawTileType, screen.x, screen.y + tileDip, col, row);
        // Waldbach: lebendige Lichtreflexe auf der Wasseroberfläche (live, mit time).
        if (isForest && tile === TileType.WATER_TOP) {
          engine.renderer.drawForestWaterShimmer(engine.renderer.ctx, screen.x, screen.y + tileDip, engine.renderer.time, col, forestDayF, engine.renderer.viewportW);
        }
        // Element-Tint (Audit P1): geteilte Bau-Elemente (Ziegel, Holz-/Plattform,
        // Röhre) nehmen den Welt-Farbton an — kein braunes/grünes Fremdkörper mehr
        // in kühlen/dunklen Welten. No-op in Welten ohne Theme-Tint.
        if (tile === TileType.BRICK || tile === TileType.WOOD_PLATFORM || tile === TileType.PLATFORM
          || tile === TileType.PIPE_TOP_LEFT || tile === TileType.PIPE_TOP_RIGHT
          || tile === TileType.PIPE_BODY_LEFT || tile === TileType.PIPE_BODY_RIGHT) {
          engine.renderer.tintThemeRect(screen.x, screen.y + tileDip, TILE_SIZE, TILE_SIZE);
        }
        // Kanten-bewusste Plastik-Schattierung freiliegender Erd-/Steinkanten
        // (Seitenwände + Unterseite) — aus den Nachbarn abgeleitet, alle Welten.
        if (engine.renderer.quality !== 'low' && isSolidForCollision(tile)) {
          const leftT = engine.level.tiles[row]?.[col - 1] ?? TileType.EMPTY;
          const rightT = engine.level.tiles[row]?.[col + 1] ?? TileType.EMPTY;
          const exL = !isSolidForCollision(leftT);
          const exR = !isSolidForCollision(rightT);
          const exB = !isSolidForCollision(below);
          if (exL || exR || exB) {
            // Gras-Überhang für erhöhte Gras-Top-Blöcke UND für Ufer-/Kanten-
            // Tiles der Grundzeile (freiliegende Seite an Wasser/Grube) — dort
            // hängt Gras über die Kante statt einer harten Erdwand ("schwebender
            // Wasserkasten"). Die Oberseite der Grundzeile liefert weiter das
            // Hügel-Band; der Überhang wirkt nur an freiliegenden Seitenkanten.
            const grassTopTile = tile === TileType.MOSS_GROUND || tile === TileType.GROUND_TOP || tile === TileType.GROUND;
            const grassOverhang = grassBand && grassTopTile
              && (tile === TileType.MOSS_GROUND
                || (row !== groundBaseRow && tile === TileType.GROUND_TOP)
                || (row === groundBaseRow && (exL || exR)));
            engine.renderer.drawTileEdgeShading(screen.x, screen.y + tileDip, tile, exL, exR, exB, grassOverhang);
          }
        }
        // Super-Blöcke (verleihen die Super-Kraft) deutlich hervorheben.
        if (tile === TileType.QUESTION_BLOCK && engine.isSuperBlock(col, row)) {
          engine.renderer.drawSuperBlockHighlight(screen.x, screen.y);
        }
        // Punkt 3: emissives Lava-Glühen über der Oberkante (quality-gated).
        if (tile === TileType.LAVA_TOP && engine.renderer.quality !== 'low') {
          engine.renderer.drawLavaGlow(screen.x, screen.y);
        }
      }
    }
  }

  // Glatte begehbare Hügel: gekrümmte Erd-Kurve über die flachen Boden-Tiles.
  // Perf-Paket 1: aus einem einmalig gerenderten Weltstreifen geblittet.
  drawTerrainBand(engine, startCol, endCol);
  tintBluefieldGround(engine);

  // Gras-Überhang der Grundlinie liefert jetzt das Bodenband (renderTerrainHills,
  // oben aufgerufen). Boden-Deko (Blumen etc.) bleibt für alle Welten.
  if (engine.renderer.quality !== 'low') {
    renderGroundDecor(engine, startCol, endCol, startRow, endRow);
  }

  // Tutorial signs — drawn after the tile pass so the wooden text-board
  // floats above any tiles around the post. Purely visual, no collision.
  if (SHOW_TUTORIAL_SIGNS && engine.level.signs) {
    const signs = engine.level.signs;
    const playerCol = (engine.player.x + engine.player.width / 2) / TILE_SIZE;
    // v440: Schilder distanz-abhängig ein-/ausblenden und in dichten Clustern
    // (z.B. Bluefield-Marketing) nur das dem Spieler NÄCHSTE zeigen. Verhindert
    // überlappende Panels (die durch die Rand-Klemmung entstehen konnten) und
    // wirkt in weit gesetzten Welten praktisch unverändert (Schild fast voll
    // sichtbar, sobald es im Bild ist).
    const NEAR = 13, FAR = 26, MERGE = 16;
    for (const sign of signs) {
      if (sign.col < startCol - 6 || sign.col > endCol + 6) continue;
      const dist = Math.abs(sign.col - playerCol);
      // Von einem näheren Schild im selben Cluster verdeckt? → weglassen.
      let dominated = false;
      for (const other of signs) {
        if (other === sign) continue;
        if (Math.abs(other.col - sign.col) < MERGE && Math.abs(other.col - playerCol) < dist) { dominated = true; break; }
      }
      if (dominated) continue;
      let a = (FAR - dist) / (FAR - NEAR);
      a = Math.max(0, Math.min(1, a));
      if (a <= 0.01) continue;
      const screen = engine.camera.worldToScreenInto(sign.col * TILE_SIZE, sign.row * TILE_SIZE, _s);
      const prevA = engine.renderer.ctx.globalAlpha;
      engine.renderer.ctx.globalAlpha = prevA * a;
      // Fix B-02: Auf Touch-/Mobilgeräten gibt es keine Shift-/F-Taste — die
      // Schild-Hinweise werden auf die Touch-Bedienung übersetzt (2× tippen,
      // Feuer-Knopf). ↓ bleibt (entspricht dem ▼-Knopf des Steuerkreuzes).
      const lines = adaptSignLines(sign.lines, engine.input.isMobile);
      engine.renderer.drawSignText(screen.x, screen.y, lines);
      engine.renderer.ctx.globalAlpha = prevA;
    }
  }

  for (const entity of engine.entities) {
    if (!entity.alive) continue;
    if (entity instanceof PiranhaPlant) continue;
    if (!engine.camera.isVisible(entity.x, entity.y, entity.width, entity.height)) continue;

    const screen = engine.camera.worldToScreenInto(entity.x, entity.y, _s);

    // Treffer-Aufblitzen: getroffene (aber überlebende) Gegner kurz weiß tinten.
    // W2.1 · Glow um Leuchtelemente: gebackene additive Discs (safari-sicher,
    // Ersatz für den Vollbild-Bloom). Vor der Element-Zeichnung, damit der
    // Schein dahinter liegt.
    {
      const gc = engine.renderer.ctx;
      const gcx = screen.x + entity.width / 2, gcy = screen.y + entity.height / 2;
      if (entity instanceof Coin || entity instanceof SpinningCoin) {
        stampGlow(gc, getGlowDisc(48, 255, 224, 130, 0.33), gcx, gcy, entity.width / 22);
      } else if (entity instanceof SpecialCoin) {
        stampGlow(gc, getGlowDisc(48, 150, 210, 255, 0.4), gcx, gcy, entity.width / 20);
      } else if (entity instanceof PowerUp) {
        stampGlow(gc, getGlowDisc(48, 255, 214, 150, 0.31), gcx, gcy, entity.width / 20);
      } else if (entity instanceof PlayerFireball || entity instanceof Fireball) {
        stampGlow(gc, getGlowDisc(48, 255, 170, 80, 0.4), gcx, gcy, entity.width / 15);
      } else if (entity instanceof MagicBolt) {
        stampGlow(gc, getGlowDisc(48, 255, 90, 70, 0.42), gcx, gcy, entity.width / 15);
      }
    }
    if (entity.hitFlash > 0) engine.renderer.ctx.filter = 'brightness(0) invert(1)';

    if (entity instanceof Coin) {
      engine.renderer.drawCoin(screen.x, screen.y, entity.width, engine.renderer.time);
    } else if (entity instanceof MovingPlatform) {
      engine.renderer.drawMovingPlatform(screen.x, screen.y, entity.width, entity.height);
      engine.renderer.tintThemeRect(screen.x, screen.y, entity.width, entity.height);
    } else if (entity instanceof Spring) {
      engine.renderer.drawSpring(screen.x, screen.y, entity.width, entity.height, entity.compress);
      engine.renderer.tintThemeRect(screen.x, screen.y, entity.width, entity.height);
    } else if (entity instanceof Crate) {
      engine.renderer.drawCrate(screen.x, screen.y, entity.width, entity.height);
      engine.renderer.tintThemeRect(screen.x, screen.y, entity.width, entity.height);
    } else if (entity instanceof Switch) {
      engine.renderer.drawSwitch(screen.x, screen.y, entity.width, entity.height, entity.pressed);
    } else if (entity instanceof Door) {
      engine.renderer.drawDoor(screen.x, screen.y, entity.width, entity.height, entity.open, entity.openTimer);
    } else if (entity instanceof FireBarrier) {
      engine.renderer.drawFireBarrier(screen.x, screen.y, entity.width, entity.height, entity.burn, engine.renderer.time, entity.swayPhase);
      engine.renderer.tintThemeRect(screen.x, screen.y, entity.width, entity.height);
    } else if (entity instanceof SpinningCoin) {
      engine.renderer.drawSpinningCoin(screen.x, screen.y, entity.width, engine.renderer.time);
    } else if (entity instanceof SpecialCoin) {
      engine.renderer.drawSpecialCoin(screen.x, screen.y, entity.width, entity.height, engine.renderer.time, entity.slotIndex);
    } else if (entity instanceof Goomba) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawGoomba(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction);
    } else if (entity instanceof Boss) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawBoss(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.frame, entity.hp, entity.maxHp, entity.isDead, entity.windupTimer);
    } else if (entity instanceof Koopa) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width);
      engine.renderer.drawKoopa(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.frame, entity.isShell);
    } else if (entity instanceof Bat) {
      engine.renderer.drawBat(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.direction);
    } else if (entity instanceof PowerUp) {
      if (entity.kind === 'star') {
        engine.renderer.drawStar(screen.x, screen.y, entity.width, entity.height, engine.renderer.time);
      } else if (entity.kind === 'fire') {
        engine.renderer.drawFireFlower(screen.x, screen.y, entity.width, entity.height, engine.renderer.time);
      } else if (entity.kind === 'magnet') {
        engine.renderer.drawCoinMagnet(screen.x, screen.y, entity.width, entity.height, engine.renderer.time);
      } else if (entity.kind === 'cape') {
        engine.renderer.drawCape(screen.x, screen.y, entity.width, entity.height, engine.renderer.time);
      } else if (entity.kind === 'wings') {
        engine.renderer.drawWings(screen.x, screen.y, entity.width, entity.height, engine.renderer.time);
      } else if (entity.kind === 'shield') {
        engine.renderer.drawShield(screen.x, screen.y, entity.width, entity.height, engine.renderer.time);
      } else if (entity.kind === 'clock') {
        engine.renderer.drawClock(screen.x, screen.y, entity.width, entity.height, engine.renderer.time);
      } else if (entity.kind === 'super') {
        engine.renderer.drawSuperStar(screen.x, screen.y, entity.width, entity.height, engine.renderer.time);
      } else {
        engine.renderer.drawCandy(screen.x, screen.y, entity.width, entity.height, engine.renderer.time, entity.emerging);
      }
    } else if (entity instanceof SpikeBall) {
      engine.renderer.drawSpikeBall(screen.x, screen.y, entity.width, entity.height, entity.roll, entity.isDead);
    } else if (entity instanceof Hornet) {
      engine.renderer.drawHornet(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.diving, engine.renderer.time, entity.isDead);
    } else if (entity instanceof BanzaiBill) {
      engine.renderer.drawBanzaiBill(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.isDead, engine.renderer.time);
    } else if (entity instanceof CharginChuck) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawCharginChuck(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.charging, entity.hitsTaken, entity.stunTimer > 0, entity.isDead, engine.renderer.time);
    } else if (entity instanceof BigBoo) {
      engine.renderer.drawBigBoo(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.hidden, engine.renderer.time);
    } else if (entity instanceof BombOmb) {
      engine.renderer.drawBombOmb(
        screen.x, screen.y, entity.width, entity.height,
        entity.direction, entity.isLit, entity.fuseFraction, engine.renderer.time,
      );
    } else if (entity instanceof BombExplosion) {
      engine.renderer.drawBombExplosion(
        screen.x, screen.y, entity.width, entity.height, entity.progress,
      );
    } else if (entity instanceof PlayerFireball) {
      engine.renderer.drawPlayerFireball(
        screen.x, screen.y, entity.width, entity.height, entity.direction, engine.renderer.time,
      );
    } else if (entity instanceof Spider) {
      engine.renderer.drawSpider(screen.x, screen.y, entity.width, entity.height, entity.startY, entity.webLength, entity.frame);
    } else if (entity instanceof Crab) {
      engine.renderer.drawCrab(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.isAngry);
    } else if (entity instanceof Jellyfish) {
      engine.renderer.drawJellyfish(screen.x, screen.y, entity.width, entity.height, entity.frame);
    } else if (entity instanceof Kangaroo) {
      engine.renderer.drawKangaroo(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction);
    } else if (entity instanceof Snake) {
      engine.renderer.drawSnake(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction);
    } else if (entity instanceof Fireball) {
      engine.renderer.drawFireball(screen.x, screen.y, entity.width, entity.height, entity.variant, engine.renderer.time);
    } else if (entity instanceof Ghost) {
      engine.renderer.drawGhost(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.variant, engine.renderer.time);
    } else if (entity instanceof Fish) {
      engine.renderer.drawFish(screen.x, screen.y, entity.width, entity.height, entity.direction, engine.renderer.time);
    } else if (entity instanceof Wizard) {
      engine.renderer.drawWizard(
        screen.x, screen.y, entity.width, entity.height,
        entity.direction, entity.frame,
        entity.castTimer < 30 && entity.active && !entity.isDead,
        entity.isDead, entity.teleportAlpha,
      );
    } else if (entity instanceof MagicBolt) {
      engine.renderer.drawMagicBolt(screen.x, screen.y, entity.width, entity.height, entity.frame);
    } else if (entity instanceof Ape) {
      engine.renderer.drawApe(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.isDead, engine.renderer.time, entity.windupTimer);
    } else if (entity instanceof Seagull) {
      engine.renderer.drawSeagull(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.diving, entity.isDead, engine.renderer.time);
    } else if (entity instanceof LavaSlime) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawLavaSlime(screen.x, screen.y, entity.width, entity.height, entity.squish, entity.isDead, engine.renderer.time);
    } else if (entity instanceof Yeti) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawYeti(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.hitsTaken, entity.stunTimer > 0, entity.isDead, engine.renderer.time, entity.windupTimer);
    } else if (entity instanceof Knight) {
      engine.renderer.drawKnight(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.hitsTaken, entity.stunTimer > 0, entity.blockFlash > 0, entity.isDead, engine.renderer.time);
    } else if (entity instanceof DragonEgg) {
      engine.renderer.drawDragonEgg(screen.x, screen.y, entity.width, entity.height, entity.cracking, entity.crackTimer, engine.renderer.time);
    } else if (entity instanceof BabyDragon) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawBabyDragon(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.isDead, entity.hatchPop, engine.renderer.time);
    } else if (entity instanceof MiniUFO) {
      engine.renderer.drawMiniUFO(screen.x, screen.y, entity.width, entity.height, entity.direction, entity.isDead, engine.renderer.time);
    } else if (entity instanceof Coconut) {
      engine.renderer.drawCoconut(screen.x, screen.y, entity.width, entity.height, entity.spin);
    } else if (entity instanceof Snowball) {
      engine.renderer.drawSnowball(screen.x, screen.y, entity.width, entity.height, entity.spin);
    } else if (entity instanceof UFOLaser) {
      engine.renderer.drawUFOLaser(screen.x, screen.y, entity.width, entity.height, engine.renderer.time);
    }
    if (entity.hitFlash > 0) engine.renderer.ctx.filter = 'none';
  }

  // Ground-pound shockwaves: drawn AFTER entities so they overlay them.
  for (const s of engine.shockwaves) {
    const sw = engine.camera.worldToScreenInto(s.x, s.y, _s);
    engine.renderer.drawShockwave(sw.x, sw.y, s.age, s.max, s.radius);
  }

  // Flügelschlag-Puffs (Doppelsprung) — über den Entities.
  for (const f of engine.wingFlutters) {
    const fs = engine.camera.worldToScreenInto(f.x, f.y, _s);
    engine.renderer.drawWingFlutter(fs.x, fs.y, f.age, f.max, f.dir);
  }

  // Feinschliff: Coin-Pop-Ringe — über den Entities, am Sammelpunkt.
  for (const c of engine.coinPops) {
    const cs = engine.camera.worldToScreenInto(c.x, c.y, _s);
    engine.renderer.drawCoinPop(cs.x, cs.y, c.age, c.max, c.combo);
  }

  {
    const flagScreen = engine.camera.worldToScreenInto(engine.level.flagPosition.x, engine.level.flagPosition.y, _s);
    const poleHeight = groundRowOf(engine.level) * TILE_SIZE - engine.level.flagPosition.y;
    engine.renderer.drawFlag(flagScreen.x, flagScreen.y, poleHeight, engine.renderer.time);
  }

  // Mid-Level-Checkpoint-Flagge (Task #29). Säule + Wimpel; Farbe
  // wechselt von Stahlblau (inaktiv) auf Goldgelb (aktiviert).
  if (engine.checkpointDrawPos) {
    const cp = engine.checkpointDrawPos;
    const cpScreen = engine.camera.worldToScreenInto(cp.x, cp.y, _s);
    engine.renderer.drawCheckpoint(
      cpScreen.x, cpScreen.y, cp.poleHeight,
      engine.checkpointActive, engine.renderer.time,
    );
  }

  if (!engine.player.isDead || engine.player.deathTimer < 90) {
    const playerScreen = engine.camera.worldToScreenInto(engine.player.x, engine.player.y, _s);
    engine.renderer.drawGroundShadow(
      playerScreen.x + engine.player.width / 2,
      playerScreen.y + engine.player.height,
      engine.player.width,
      engine.player.onGround ? 1 : 0.5,
    );
    // Time-Attack-Geist: interpolierte, durchsichtige Figur der Bestzeit-Spur.
    if (engine.ghostPlay && getSettings().showGhost) {
      const gp = engine.ghostPlay;
      const sf = engine.levelFrame / 2;      // float Sample-Position
      const k0 = Math.floor(sf);
      const t = sf - k0;                     // Interpolationsfaktor
      const i0 = k0 * 2, i1 = (k0 + 1) * 2;
      if (i1 + 1 < gp.length) {
        const gx = gp[i0] + (gp[i1] - gp[i0]) * t;
        const gy = gp[i0 + 1] + (gp[i1 + 1] - gp[i0 + 1]) * t;
        const pw = engine.player.width, ph = engine.player.height;
        const gsc = { x: 0, y: 0 };
        const gs = engine.camera.worldToScreenInto(gx + pw / 2, gy + ph / 2, gsc);
        const gctx = engine.renderer.ctx;
        gctx.save();
        gctx.globalAlpha = 0.3;
        gctx.fillStyle = '#7fbcff';
        gctx.beginPath();
        gctx.ellipse(gs.x, gs.y + ph * 0.12, pw * 0.3, ph * 0.32, 0, 0, Math.PI * 2);
        gctx.fill();
        gctx.beginPath();
        gctx.arc(gs.x, gs.y - ph * 0.26, pw * 0.24, 0, Math.PI * 2);
        gctx.fill();
        gctx.globalAlpha = 0.6;
        gctx.fillStyle = 'rgba(255,255,255,0.78)';
        gctx.font = 'bold 9px sans-serif';
        gctx.textAlign = 'center';
        gctx.fillText('BEST', gs.x, gs.y - ph * 0.52);
        gctx.restore();
      }
    }
    // Greifhaken: Seil + Haken-Spitze vom Spieler zum Anker (fährt schnell aus).
    if (engine.player.grappleActive) {
      const gctx = engine.renderer.ctx;
      const pw = engine.player.width, ph = engine.player.height;
      const gpx = playerScreen.x + pw / 2, gpy = playerScreen.y + ph * 0.4;
      const gScratch = { x: 0, y: 0 };
      const gs = engine.camera.worldToScreenInto(engine.player.grappleX, engine.player.grappleY, gScratch);
      const prog = Math.min(1, engine.player.grappleAnim / 3);
      const ex = gpx + (gs.x - gpx) * prog, ey = gpy + (gs.y - gpy) * prog;
      gctx.save();
      gctx.strokeStyle = 'rgba(70,78,92,0.95)';
      gctx.lineWidth = 2.5; gctx.lineCap = 'round';
      gctx.beginPath(); gctx.moveTo(gpx, gpy); gctx.lineTo(ex, ey); gctx.stroke();
      gctx.fillStyle = '#aab0bc';
      gctx.beginPath(); gctx.arc(ex, ey, 4.5, 0, Math.PI * 2); gctx.fill();
      gctx.restore();
    }
    // Ship-it-Dash: faint Nachzieh-Silhouetten (Afterimage) hinter der Figur.
    if (engine.player.dashTrail.length > 0) {
      const dctx = engine.renderer.ctx;
      const pw = engine.player.width, ph = engine.player.height;
      const scratch = { x: 0, y: 0 };
      dctx.save();
      const n = engine.player.dashTrail.length;
      for (let i = n - 1; i >= 0; i--) {
        const tp = engine.player.dashTrail[i];
        const s = engine.camera.worldToScreenInto(tp.x, tp.y, scratch);
        dctx.globalAlpha = 0.26 * (1 - i / n);
        dctx.fillStyle = '#8fb8ff';
        dctx.beginPath();
        dctx.roundRect(s.x + pw * 0.2, s.y + ph * 0.08, pw * 0.6, ph * 0.9, 6);
        dctx.fill();
      }
      dctx.restore();
    }
    // Salto-Drehwinkel (rein visuell) für den Trampolin-Absprung.
    engine.renderer.playerFlipAngle = engine.player.flipSpin > 0
      ? (1 - engine.player.flipSpin / engine.player.flipTotal) * Math.PI * 2 * engine.player.flipDir
      : 0;
    // Tarzan-Absprung-„Wusch": goldene Bewegungs-Spur (0..1) + Richtung.
    engine.renderer.playerVineFling = engine.player.vineFlingTimer / 16;
    engine.renderer.playerVineFlingDir = engine.player.vineReleaseDir;
    engine.renderer.drawPlayer(
      playerScreen.x, playerScreen.y,
      engine.player.width, engine.player.height,
      engine.player.direction, engine.player.frame,
      engine.player.isJumping, engine.player.isRunning,
      engine.player.velY, engine.player.isDead,
      engine.player.invincibleTimer,
      engine.player.isDucking, engine.player.velX,
      // Mario-feel poses + P-meter shimmer
      engine.player.isSkidding, engine.player.isSliding,
      engine.player.isWallSliding, engine.player.isPCharged,
      // Star + ground-pound flags
      engine.player.starTimer, engine.player.starTotal,
      engine.player.isGroundPounding,
      // Landing-squash window — non-zero just after touchdown, larger
      // value (12) on hard falls, smaller (6) on regular hops.
      engine.player.landingFrame,
      // Form: Fiona (small) vs Lea (powered).
      engine.player.isPoweredUp,
      // Superkraft-Move (Radschlag / Einbein-Hüpfer) Fortschritt.
      engine.player.superMoveTimer, engine.player.superMoveTotal,
      // Charakterwahl: Lea-Sprite statt Fiona-Sprite.
      engine.player.character === 'lea',
      // Feuerblume-Zustand (Plüsch-Welt: Elefant-Form + Wasserspritzer).
      engine.player.hasFire,
    );

    // „Super-Sammlerin"-Krone: sichtbare Belohnung über dem Kopf, sobald in
    // JEDER Welt alle Sonder-Münzen gesammelt sind. Sanftes Schweben + Glanz.
    if (engine.showCrown && !engine.player.isDead) {
      const ctx = engine.renderer.ctx;
      const t = engine.renderer.time;
      const cx = playerScreen.x + engine.player.width / 2;
      const cw = Math.max(18, engine.player.width * 0.5);
      const ch = cw * 0.62;
      const baseY = playerScreen.y - 5 + Math.sin(t * 0.12) * 1.8;
      const bx = cx - cw / 2, by = baseY, bw = cw, bh = ch;
      ctx.save();
      // weicher Glanz-Halo
      const glow = ctx.createRadialGradient(cx, by - bh * 0.4, 1, cx, by - bh * 0.4, cw);
      glow.addColorStop(0, 'rgba(255,236,150,0.5)');
      glow.addColorStop(1, 'rgba(255,236,150,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, by - bh * 0.4, cw, 0, Math.PI * 2); ctx.fill();
      // Kronen-Körper (Gold-Verlauf)
      const grad = ctx.createLinearGradient(0, by - bh, 0, by + 2);
      grad.addColorStop(0, '#fff2ab'); grad.addColorStop(0.5, '#ffd23f'); grad.addColorStop(1, '#e0961a');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#a9740c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by - bh * 0.4);
      ctx.lineTo(bx + bw * 0.2, by - bh * 1.0);      // Zacke links
      ctx.lineTo(bx + bw * 0.35, by - bh * 0.4);
      ctx.lineTo(bx + bw * 0.5, by - bh * 1.12);     // Zacke Mitte (höher)
      ctx.lineTo(bx + bw * 0.65, by - bh * 0.4);
      ctx.lineTo(bx + bw * 0.8, by - bh * 1.0);      // Zacke rechts
      ctx.lineTo(bx + bw, by - bh * 0.4);
      ctx.lineTo(bx + bw, by);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Edelsteine auf den Zacken
      const gems = ['#ff5d7a', '#5db6ff', '#7be08a'];
      const tips = [bx + bw * 0.2, bx + bw * 0.5, bx + bw * 0.8];
      const tipY = [by - bh * 1.0, by - bh * 1.12, by - bh * 1.0];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = gems[i];
        ctx.beginPath(); ctx.arc(tips[i], tipY[i] + bh * 0.14, Math.max(1.6, cw * 0.09), 0, Math.PI * 2); ctx.fill();
      }
      // Funkeln
      const spk = 0.5 + 0.5 * Math.sin(t * 0.2);
      ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * spk})`;
      ctx.beginPath(); ctx.arc(bx + bw * 0.32, by - bh * 0.5, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  for (const p of engine.particles) {
    if (!p.alive) continue;
    const screen = engine.camera.worldToScreenInto(p.x, p.y, _s);

    if (p instanceof Particle) {
      engine.renderer.drawParticle(screen.x, screen.y, p.size, p.color, p.alpha);
    } else if (p instanceof FloatingText) {
      // Fix B-04: Punkte-Popups nicht in die obere HUD-Leiste steigen lassen
      // (dort wurden sie abgeschnitten). Untere Grenze knapp unter dem HUD.
      const py = Math.max(engine.renderer.viewportH * 0.12, screen.y);
      engine.renderer.drawFloatingText(screen.x, py, p.text, p.alpha, p.scale);
    }
  }

  const theme = engine.level.theme;
  // Always pass logical viewport dims (CANVAS_WIDTH/HEIGHT) — never the
  // raw canvas backing store size, which is now DPR-scaled and would
  // make ambient effects spill beyond the visible viewport.
  const VW = engine.renderer.viewportW;
  const VH = engine.renderer.viewportH;
  if (theme === 'jungle') {
    engine.renderer.drawCloudShadows(engine.camera.x, VW, VH);
    engine.renderer.drawAtmosphericFog(engine.camera.x, VW, VH);
    engine.renderer.drawLightRays(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') {
      engine.renderer.drawLightPools(engine.camera.x, VW, VH, 255, 238, 180);
    }
    engine.renderer.drawFallingLeaves(engine.camera.x, VW, VH);
    // Grüne Glühwürmchen auf Wunsch entfernt (beide Leucht-Punkt-Effekte):
    // engine.renderer.drawJungleFireflies(engine.camera.x, VW, VH);
    // engine.renderer.drawAmbientEffects(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawJungleForeground(engine.camera.x, VW, VH);
  } else if (theme === 'cave') {
    engine.renderer.drawCaveAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawThemedRays(engine.camera.x, VW, VH);
    engine.renderer.drawThemedForeground(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 150, 180, 230, 0.85);
  } else if (theme === 'dragon') {
    // Drachenhöhle: kühl-grüne Höhlen-Ambient + warmes Lava-Auflicht/Fackeln
    // im Vordergrund → „Drachen-Lava-Lair".
    engine.renderer.drawCaveAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawThemedRays(engine.camera.x, VW, VH);
    // Dynamische Fackel-Dunkelheit ZUERST: die Figur trägt ihr eigenes Licht,
    // die Fackeln erhellen die Wände, der Boss bleibt sichtbar — der Rest der
    // Höhle versinkt im warmen Dunkel. Lava/Fackeln leuchten danach obendrauf.
    // Immer an (unabhängig von der globalen Dynamik-Licht-Einstellung).
    if (engine.renderer.quality !== 'low') {
      const p = engine.player;
      const ps = engine.camera.worldToScreenInto(p.x + p.width / 2, p.y + p.height / 2, { x: 0, y: 0 });
      const lights: Array<{ x: number; y: number; r: number }> = [{ x: ps.x, y: ps.y, r: 180 }];
      // Fackeln als Lichtquellen (gleiches 520er-Raster wie drawDragonLairForeground).
      const torchGap = 520;
      const camX = engine.camera.x;
      const first = Math.floor((camX - 140) / torchGap) * torchGap;
      for (let wx = first; wx < camX + VW + 140; wx += torchGap) {
        const idx = Math.round(wx / torchGap);
        const sx = wx - camX;
        if (sx < -30 || sx > VW + 30) continue;
        const ty = VH * (0.30 + (idx % 2) * 0.07);
        lights.push({ x: sx, y: ty, r: 130 });
      }
      // Boss sichtbar halten: eigene Lichtquelle, solange er lebt und im Bild ist.
      for (const e of engine.entities) {
        if (e instanceof Boss && !e.isDead) {
          const bs = engine.camera.worldToScreenInto(e.x + e.width / 2, e.y + e.height / 2, { x: 0, y: 0 });
          if (bs.x > -120 && bs.x < VW + 120) lights.push({ x: bs.x, y: bs.y, r: 210 });
        }
      }
      engine.renderer.drawDynamicLighting(lights, 0.5, '5,12,8');
    }
    engine.renderer.drawDragonLairForeground(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 255, 150, 70, 1.0);
  } else if (theme === 'sky') {
    engine.renderer.drawCloudShadows(engine.camera.x, VW, VH);
    engine.renderer.drawSkyAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawThemedRays(engine.camera.x, VW, VH);
    engine.renderer.drawThemedForeground(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 235, 245, 255, 0.7);
  } else if (theme === 'beach') {
    engine.renderer.drawCloudShadows(engine.camera.x, VW, VH);
    engine.renderer.drawBeachAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawThemedRays(engine.camera.x, VW, VH);
    engine.renderer.drawBeachForeground(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 255, 244, 200);
  } else if (theme === 'australia') {
    engine.renderer.drawCloudShadows(engine.camera.x, VW, VH);
    engine.renderer.drawAustraliaAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawThemedRays(engine.camera.x, VW, VH);
    engine.renderer.drawThemedForeground(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 255, 225, 165);
  } else if (theme === 'volcano') {
    engine.renderer.drawVolcanoAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawThemedForeground(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 255, 140, 70, 1.1);
  } else if (theme === 'ice') {
    engine.renderer.drawIceAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawThemedRays(engine.camera.x, VW, VH);
    engine.renderer.drawThemedForeground(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 200, 225, 255, 0.85);
  } else if (theme === 'castle') {
    engine.renderer.drawCastleAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawThemedRays(engine.camera.x, VW, VH);
    engine.renderer.drawThemedForeground(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 255, 175, 110, 0.9);
  } else if (theme === 'underwater') {
    engine.renderer.drawUnderwaterAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawThemedRays(engine.camera.x, VW, VH);
    engine.renderer.drawThemedForeground(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 150, 215, 230, 0.95);
  } else if (theme === 'space') {
    engine.renderer.drawSpaceAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawThemedForeground(engine.camera.x, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 205, 210, 255, 0.8);
  } else if (theme === 'school') {
    engine.renderer.drawSchoolAmbient(engine.camera.x, engine.camera.y, VW, VH);
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 255, 244, 210, 0.8);
    engine.renderer.drawSchoolForeground(engine.camera.x, VW, VH);
  } else if (theme === 'gym') {
    // Turnhalle: warmes Tageslicht durch die Hallenfenster (helle Lichtpools).
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 255, 246, 214, 0.85);
    // Turn-Reifen im Vordergrund (Figur springt sichtbar hindurch → Bonus).
    drawGymHoops(engine, VW, VH);
    // Schwing-Ringe an ihrer aktuellen Pendelposition (über der Figur).
    drawGymSwingRings(engine, VW, VH);
    // Tarzan-Schwingseile: lange Seile, die als Pendel von der Decke schwingen.
    drawGymSwingRopes(engine, VW, VH);
  } else if (theme === 'plush') {
    // Plüsch-Traumland: sanftes warmes Nachtlicht + verträumte Ambient-Schicht
    // (schwebende Herzchen & Funkeln).
    if (engine.renderer.quality !== 'low') engine.renderer.drawLightPools(engine.camera.x, VW, VH, 255, 232, 244, 0.7);
    drawPlushDreamAmbient(engine, VW, VH);
  } else if (theme === 'trampoline') {
    engine.renderer.drawTrampolineAmbient(engine.camera.x, engine.camera.y, VW, VH);
    engine.renderer.drawTrampolineForeground(engine.camera.x, VW, VH);
  } else if (theme === 'bluefield') {
    engine.renderer.drawBluefieldAmbient(engine.camera.x, engine.camera.y, VW, VH);
  } else if (theme === 'forest') {
    // Wald: einzelne große Vordergrund-Bäume ÜBER der Spielfigur — sie läuft
    // kurz dahinter und verschwindet dabei teilweise. Kritische Zonen (Wasser-
    // gräben, Checkpoint, Zielfahne) werden ausgespart, damit nie eine Landung
    // oder wichtige Sicht verdeckt wird.
    engine.renderer.drawForestForeground(engine.camera, forestFgForbidden(engine.level));
  }

  // Phase 3: dynamisches Licht/Dunkelheit in dunklen Welten (experimentell,
  // abschaltbar, ab 'mid'). Die Spielerin trägt eine wandernde Lichtquelle;
  // die Szene wird ringsum gedämpft abgedunkelt.
  const DARK: Partial<Record<string, number>> = { cave: 0.6, castle: 0.5, space: 0.66, underwater: 0.46 };
  const darkness = DARK[theme];
  if (darkness !== undefined && engine.renderer.quality !== 'low' && getSettings().dynamicLight) {
    const p = engine.player;
    const ps = engine.camera.worldToScreenInto(p.x + p.width / 2, p.y + p.height / 2, { x: 0, y: 0 });
    engine.renderer.drawDynamicLighting([{ x: ps.x, y: ps.y, r: 150 }], darkness);
  }

}

// Verbotszonen für Wald-Vordergrundbäume: Welt-x-Intervalle (px), in denen KEIN
// Baum stehen darf — Wassergräben/Sprünge, Checkpoint, Zielfahne. Pro Level
// einmal berechnet (gecacht), da statisch.
const _fgForbiddenCache = new WeakMap<object, number[][]>();
function forestFgForbidden(level: GameEngine['level']): number[][] {
  const cached = _fgForbiddenCache.get(level);
  if (cached) return cached;
  const TS = TILE_SIZE;
  const zones: number[][] = [];
  const W = level.width, H = level.height;
  for (let c = 0; c < W; c++) {
    let hazard = false;
    for (let r = 0; r < H; r++) {
      const t = level.tiles[r][c];
      if (t === TileType.WATER_TOP || t === TileType.WATER || t === TileType.DEEP_WATER) { hazard = true; break; }
    }
    if (hazard) zones.push([(c - 4) * TS, (c + 5) * TS]);   // Graben + Kronen-Rand
  }
  if (level.checkpoint) zones.push([(level.checkpoint.col - 3) * TS, (level.checkpoint.col + 4) * TS]);
  if (level.flagPosition) { const fc = level.flagPosition.x / TS; zones.push([(fc - 3) * TS, (fc + 4) * TS]); }
  _fgForbiddenCache.set(level, zones);
  return zones;
}

// ===========================================================================
// POST-Layer (AP 0.2): finaler Color-Grade (per-Welt-Tint + Vignette +
// Tilt-Shift), damit Parallax, Tiles und Sprites unter einer kohärenten
// Atmosphäre sitzen. Phase 2 hängt hier GPU-Post-FX (Bloom, Displacement) an,
// ohne die Layer-Struktur zu verändern.
// ===========================================================================
function renderPostLayer(engine: GameEngine): void {
  const theme = engine.level.theme;
  const VW = engine.renderer.viewportW;
  const VH = engine.renderer.viewportH;
  // Final colour grade (per-world tint + vignette + tilt-shift) so the
  // parallax, tiles and sprites all sit under one cohesive atmosphere.
  engine.renderer.drawSceneGrade(theme, VW, VH);

  // Warp-Flash: kurzes helles Aufblenden beim Röhren-Teleport (Screen-Space).
  if (engine.warpFlash > 0) {
    const ctx = engine.renderer.ctx;
    ctx.save();
    ctx.globalAlpha = (engine.warpFlash / 14) * 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
  }

  // HUD (lives/coins/score/time) and the pause/game-over/level-complete
  // dialogs are now owned exclusively by the React DOM overlay in
  // pages/game.tsx. The canvas only draws gameplay so we don't get a
  // double-rendered UI on top of the DOM overlay.
}

// ===========================================================================
// AP 1.4: Interaktives Gras. Zeichnet an freien Boden-Oberkanten (solides
// Tile mit leerem Raum darüber) ein paar Halme, die sich im Wind wiegen und
// sich vom Spieler-Fußpunkt wegbiegen, wenn er nah vorbeiläuft. Deterministisch
// über einen Positions-Hash, damit das Gras zwischen Frames stabil steht.
// ===========================================================================
function grassHash(a: number, b: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function renderJungleGrass(
  engine: GameEngine,
  startCol: number, endCol: number, startRow: number, endRow: number,
): void {
  const ctx = engine.renderer.ctx;
  const t = engine.renderer.time;
  const pScreen = engine.camera.worldToScreenInto(engine.player.x, engine.player.y, _s2);
  const pCx = pScreen.x + engine.player.width / 2;
  const pFy = pScreen.y + engine.player.height;

  // Üppige, satte Gras-Paletten je Gras-Welt.
  const PALS: Record<string, { deep: string; base: string; mid: string; hi: string }> = {
    jungle:    { deep: '#2c6a22', base: '#3d8a30', mid: '#54b441', hi: '#83db66' },
    beach:     { deep: '#357a28', base: '#4aa238', mid: '#63c84d', hi: '#92e070' },
    australia: { deep: '#5a7a26', base: '#7a9a34', mid: '#9aba48', hi: '#c6dc72' },
    bluefield: { deep: '#1e3a8a', base: '#2d52c4', mid: '#3f6fe0', hi: '#6b9bf5' },
  };
  const P = PALS[engine.level.theme] || PALS.jungle;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = engine.level.tiles[row][col];
      if (tile === TileType.EMPTY || !isSolidForCollision(tile)) continue;
      const above = engine.level.tiles[row - 1]?.[col] ?? TileType.EMPTY;
      if (above !== TileType.EMPTY) continue;          // nur freie Oberkanten
      if (isInHill(engine.level.terrainHills, col * TILE_SIZE + TILE_SIZE / 2)) continue; // Hügel haben eigenes Gras

      const screen = engine.camera.worldToScreenInto(col * TILE_SIZE, row * TILE_SIZE, _s);
      const x0 = screen.x;
      const baseY = screen.y;

      // 1) Durchgehender, überhängender Gras-Wulst: gefüllte organische Form
      //    mit welliger Oberkante (Büschel) und leichter Überlippe nach unten.
      const segs = 8;
      const tops: { x: number; y: number }[] = [];
      for (let s = 0; s <= segs; s++) {
        const sx = x0 + (s / segs) * TILE_SIZE;
        const lump = 5 + grassHash(col * 5 + s, row * 3) * 7; // Büschelhöhe 5–12
        tops.push({ x: sx, y: baseY - lump });
      }
      // dunkle Basis (Tiefe)
      ctx.fillStyle = P.deep;
      ctx.beginPath();
      ctx.moveTo(x0, baseY + 5);
      for (const pt of tops) ctx.lineTo(pt.x, pt.y + 1.5);
      ctx.lineTo(x0 + TILE_SIZE, baseY + 5);
      ctx.closePath();
      ctx.fill();
      // Hauptfarbe
      ctx.fillStyle = P.base;
      ctx.beginPath();
      ctx.moveTo(x0, baseY + 4);
      for (const pt of tops) ctx.lineTo(pt.x, pt.y);
      ctx.lineTo(x0 + TILE_SIZE, baseY + 4);
      ctx.closePath();
      ctx.fill();
      // helle Spitzen-Tupfer (Sonnenlicht auf den Büscheln)
      for (let s = 1; s < tops.length; s += 2) {
        const pt = tops[s];
        ctx.fillStyle = P.hi;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + 1.5, 2.2, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2) Einzelne überstehende Halme mit Wind + Spieler-Interaktion.
      const blades = 4 + Math.floor(grassHash(col + 7, row) * 3); // 4–6 Halme
      for (let b = 0; b < blades; b++) {
        const bh = grassHash(col * 3 + b, row * 5 + b);
        const bx = x0 + 3 + bh * (TILE_SIZE - 6);
        const len = 9 + bh * 8;
        let bend = Math.sin(t * 0.05 + bx * 0.05) * 2.4;
        const dx = bx - pCx;
        if (Math.abs(baseY - pFy) < 18 && Math.abs(dx) < 42) {
          const dist = Math.max(6, Math.abs(dx));
          bend += Math.sign(dx) * (42 - dist) * 0.5;
        }
        const tipX = bx + bend;
        const tipY = baseY - len;
        ctx.strokeStyle = bh > 0.55 ? P.mid : P.base;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(bx, baseY + 1);
        ctx.quadraticCurveTo((bx + tipX) / 2, baseY - len * 0.6, tipX, tipY);
        ctx.stroke();
        // heller Halm-Glanz
        ctx.strokeStyle = P.hi;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(bx, baseY - 1);
        ctx.quadraticCurveTo((bx + tipX) / 2, baseY - len * 0.6, tipX, tipY);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// Boden-Deko: streut an ~20% der freien Boden-Oberkanten ein größeres,
// abwechslungsreiches Objekt (Farn, Busch oder Blume) — deterministisch per
// Hash, damit es beim Scrollen stabil bleibt. Ergänzt den Gras-Überhang.
// Turn-Reifen (Turnhalle) im Vordergrund: farbige Ringe auf dünnen Ständern,
// die die Figur beim Durchspringen umrahmen (im Zentrum liegt eine Bonus-Münze).
// Positionen sind fest auf das Turnen-Level abgestimmt.
function drawGymHoops(engine: GameEngine, VW: number, _VH: number): void {
  const ctx = engine.renderer.ctx;
  const t = engine.renderer.time;
  const HOOPS: [number, number, string][] = [[82, 10, '#e0563c'], [112, 10, '#3c86e0']];
  for (const [col, row, ringCol] of HOOPS) {
    const p = engine.camera.worldToScreenInto(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, _s);
    if (!Number.isFinite(p.x) || p.x < -70 || p.x > VW + 70) continue;
    const R = 27;
    const pulse = 0.85 + Math.sin(t * 0.08 + col) * 0.15;
    const foot = engine.camera.worldToScreenInto(col * TILE_SIZE + TILE_SIZE / 2, 13 * TILE_SIZE, _s2);
    ctx.save();
    // Ständer vom Boden zum Reifen.
    ctx.strokeStyle = 'rgba(150,124,84,0.75)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y + R); ctx.lineTo(foot.x, foot.y); ctx.stroke();
    ctx.fillStyle = 'rgba(120,98,64,0.8)'; ctx.fillRect(foot.x - 6, foot.y - 3, 12, 3);
    // Reifen-Band + plastische Kanten.
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 5; ctx.strokeStyle = ringCol;
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(p.x, p.y, R - 2.6, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(p.x, p.y, R + 2.6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

// Schwing-Ringe (Turnhalle): Pendel-Ringe an Riemen von der Decke, gezeichnet an
// ihrer aktuellen Schwingposition (gleiche Formel wie die Physik in engine.ts).
function drawGymSwingRings(engine: GameEngine, VW: number, _VH: number): void {
  const rings = engine.level.swingRings;
  if (!rings || !rings.length) return;
  const ctx = engine.renderer.ctx;
  const clock = engine.levelFrame;
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    const pivotWX = ring.col * TILE_SIZE + TILE_SIZE / 2;
    const pivotWY = ring.row * TILE_SIZE;
    const ang = SWING_AMP * Math.sin(clock * SWING_DRIVE + i * 1.3);
    const rwx = pivotWX + ring.len * Math.sin(ang);
    const rwy = pivotWY + ring.len * Math.cos(ang);
    const piv = engine.camera.worldToScreenInto(pivotWX, pivotWY, _s);
    const rp = engine.camera.worldToScreenInto(rwx, rwy, _s2);
    if (!Number.isFinite(rp.x) || rp.x < -60 || rp.x > VW + 60) continue;
    ctx.save();
    // Riemen von der Decke zum Ring.
    ctx.strokeStyle = 'rgba(90,70,44,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(piv.x, piv.y); ctx.lineTo(rp.x, rp.y); ctx.stroke();
    ctx.fillStyle = 'rgba(60,66,74,0.9)'; ctx.beginPath(); ctx.arc(piv.x, piv.y, 3, 0, Math.PI * 2); ctx.fill();
    // Ring (Holz/Metall) mit plastischer Kante.
    ctx.lineWidth = 5.5; ctx.strokeStyle = '#5a3f22';
    ctx.beginPath(); ctx.arc(rp.x, rp.y + 9, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,236,190,0.55)';
    ctx.beginPath(); ctx.arc(rp.x, rp.y + 9, 6.6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

// Tarzan-Schwingseile (Turnhalle): lange, geflochtene Kletterseile, die als
// Pendel von der Decke schwingen (gleiche Formel wie die Physik in engine.ts).
// Gezeichnet als leicht gebogenes, geflochtenes Seil mit Griff-Knoten am Ende.
function drawGymSwingRopes(engine: GameEngine, VW: number, _VH: number): void {
  const ropes = engine.level.swingRopes;
  if (!ropes || !ropes.length) return;
  const ctx = engine.renderer.ctx;
  const clock = engine.levelFrame;
  for (let i = 0; i < ropes.length; i++) {
    const v = ropes[i];
    const pivotWX = v.col * TILE_SIZE + TILE_SIZE / 2;
    const pivotWY = v.row * TILE_SIZE;
    let ang = ROPE_SWING_AMP * Math.sin(clock * ROPE_SWING_DRIVE + (v.phase ?? i * 1.1));
    // Nachschwingen nach einem Absprung: abklingender „Twang" auf den Winkel.
    const kf = engine.vineKickFrame[i];
    if (kf !== undefined) {
      const el = clock - kf;
      if (el >= 0 && el < 48) ang += 0.3 * Math.exp(-el * 0.07) * Math.sin(el * 0.42);
    }
    const endWX = pivotWX + v.len * Math.sin(ang);
    const endWY = pivotWY + v.len * Math.cos(ang);
    const piv = engine.camera.worldToScreenInto(pivotWX, pivotWY, _s);
    const end = engine.camera.worldToScreenInto(endWX, endWY, _s2);
    if (!Number.isFinite(end.x) || (end.x < -60 && piv.x < -60) || (end.x > VW + 60 && piv.x > VW + 60)) continue;
    ctx.save();
    // Deckenhalterung (kleiner Balken + Öse).
    ctx.fillStyle = 'rgba(70,60,44,0.95)';
    ctx.fillRect(piv.x - 9, piv.y - 4, 18, 5);
    ctx.strokeStyle = 'rgba(40,44,52,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(piv.x, piv.y + 2, 3, 0, Math.PI * 2); ctx.stroke();
    // Seil als leicht gebogene Kurve (Bauch in Schwungrichtung) zeichnen.
    const midX = (piv.x + end.x) / 2 + Math.sin(ang) * 10;
    const midY = (piv.y + end.y) / 2;
    // dunkler Kern.
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.moveTo(piv.x, piv.y + 1); ctx.quadraticCurveTo(midX, midY, end.x, end.y); ctx.stroke();
    // hellere Flecht-Highlights (Zopfmuster).
    ctx.strokeStyle = 'rgba(210,168,104,0.75)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(piv.x, piv.y + 1); ctx.quadraticCurveTo(midX, midY, end.x, end.y); ctx.stroke();
    // Griff-Knoten am Seilende (dort hängt sich die Figur ein).
    ctx.fillStyle = '#7a5530';
    ctx.beginPath(); ctx.arc(end.x, end.y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,236,190,0.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(end.x, end.y, 5.5, 0, Math.PI * 2); ctx.stroke();
    // kleiner Quast unter dem Knoten.
    ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 1.6;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath(); ctx.moveTo(end.x, end.y + 4); ctx.lineTo(end.x + k * 2, end.y + 11); ctx.stroke();
    }
    ctx.restore();
  }
}

// Plüsch-Traumland: verträumte Ambient-Schicht — sanft aufsteigende Herzchen und
// funkelnde Sternchen (Screen-Koordinaten, langsam driftend). Rein visuell.
function drawPlushDreamAmbient(engine: GameEngine, VW: number, VH: number): void {
  if (engine.renderer.quality === 'low') return;
  const ctx = engine.renderer.ctx;
  const t = engine.renderer.time;
  ctx.save();
  // Schwebende Herzchen (steigen langsam, driften seitlich, blenden aus).
  for (let i = 0; i < 14; i++) {
    const seed = i * 47.3;
    const span = VH + 60;
    const rise = ((t * (0.5 + (i % 3) * 0.22) + seed * 9) % span);
    const y = VH + 20 - rise;
    const x = ((i * 137.5) % VW) + Math.sin(t * 0.03 + seed) * 18;
    const life = rise / span;                 // 0 unten → 1 oben
    const al = Math.sin(life * Math.PI) * 0.5; // in der Mitte am hellsten
    if (al <= 0.02) continue;
    const s = 4 + (i % 3);
    const cols = ['rgba(244,150,190,', 'rgba(255,190,150,', 'rgba(200,170,240,'];
    ctx.fillStyle = cols[i % 3] + al.toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.4);
    ctx.bezierCurveTo(x - s, y - s * 0.5, x - s * 1.4, y + s * 0.5, x, y + s * 1.3);
    ctx.bezierCurveTo(x + s * 1.4, y + s * 0.5, x + s, y - s * 0.5, x, y + s * 0.4);
    ctx.fill();
  }
  // Funkelnde Sternchen (blinken an Ort und Stelle).
  for (let i = 0; i < 18; i++) {
    const seed = i * 91.7;
    const x = (i * 211.3) % VW;
    const y = ((i * 83.1) % (VH * 0.7)) + 20;
    const tw = Math.abs(Math.sin(t * 0.06 + seed));
    if (tw < 0.6) continue;
    const al = (tw - 0.6) / 0.4 * 0.65;
    const r = 1.2 + tw * 1.4;
    ctx.fillStyle = `rgba(255,248,214,${al.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // kleines Kreuz-Glitzern.
    ctx.strokeStyle = `rgba(255,252,230,${(al * 0.8).toFixed(3)})`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x - r * 2, y); ctx.lineTo(x + r * 2, y); ctx.moveTo(x, y - r * 2); ctx.lineTo(x, y + r * 2); ctx.stroke();
  }
  ctx.restore();
}

function renderGroundDecor(
  engine: GameEngine,
  startCol: number, endCol: number, startRow: number, endRow: number,
): void {
  const ctx = engine.renderer.ctx;
  const theme = engine.level.theme;
  const isGrass = theme === 'jungle' || theme === 'beach' || theme === 'australia' || theme === 'bluefield';
  const isDry = theme === 'australia' || theme === 'beach';
  const BUSHPALS: Record<string, string[]> = {
    jungle:    ['#1d6a26', '#2a8f34', '#54c45e'],
    // Strand/Outback: trockene Dünen-/Steppengras-Töne statt lush Grün, damit die
    // Deko-Büschel zum sandigen Boden passen (v473).
    beach:     ['#86924a', '#a4ac64', '#c6c98a'],
    australia: ['#8a6f30', '#a88f42', '#c9b25e'],
    bluefield: ['#1e3a8a', '#2d52c4', '#4a7be0'],
  };
  // Stein-/Akzent-Paletten je Nicht-Gras-Welt.
  const ROCKPALS: Record<string, string[]> = {
    cave:       ['#4a4a5a', '#6a6a7e', '#8c8ca0'],
    volcano:    ['#3a241e', '#56362c', '#74493a'],
    ice:        ['#bcd8ee', '#d8ecf8', '#ffffff'],
    castle:     ['#5e5870', '#7e7890', '#9c96ac'],
    space:      ['#44445e', '#62627e', '#82829e'],
    underwater: ['#2a6470', '#3a8490', '#52a2ae'],
    sky:        ['#cfd6e4', '#e2e8f2', '#ffffff'],
    // Innen-Böden (v455): school/trampoline hatten keinen Eintrag und fielen auf
    // die dunkelgraue Höhlen-Palette zurück → dunkle "Stein"-Flecken auf hellem
    // Schulboden. Warm-helle bzw. bühnenfarbene Töne fügen die Boden-Deko ein.
    school:     ['#c4a878', '#d8c298', '#efe0bc'],
    trampoline: ['#3a3552', '#4e4874', '#6a6298'],
    // Turnhalle: warme Parkett-/Matten-Töne für die Bodendeko (statt Höhlengrau).
    gym:        ['#c69a5e', '#dcb87e', '#f0dca8'],
    // Plüsch-Traumland: weiche Pastell-Töne (Teppich/Patchwork) statt Höhlengrau.
    plush:      ['#e8b7c8', '#f3cfa0', '#cfe0c0'],
  };
  const pal = isGrass ? BUSHPALS[theme] : (ROCKPALS[theme] || ROCKPALS.cave);
  const FLOWERS = theme === 'bluefield'
    ? ['#9fc0ff', '#ffffff', '#ffe680', '#c9d8ff', '#bcd0ff']   // Wiesen-Töne: Kornblume, Gänseblümchen, sanftes Gelb
    : ['#ff6b9d', '#ffd24a', '#ff8c42', '#c77dff', '#ffffff', '#ff5e5e'];
  const density = theme === 'bluefield' ? 0.66 : 0.82;          // bluefield dichter (~34% statt ~18%)
  ctx.save();
  ctx.lineCap = 'round';
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = engine.level.tiles[row][col];
      if (tile === TileType.EMPTY || !isSolidForCollision(tile)) continue;
      const above = engine.level.tiles[row - 1]?.[col] ?? TileType.EMPTY;
      if (above !== TileType.EMPTY) continue;
      // Unter Hügeln kein Ebenen-Gras — sonst steht eine Gras-Linie auf
      // Ebenen-Höhe unter dem Hügel (das Bodenband liefert dort das Gras).
      if (isInHill(engine.level.terrainHills, col * TILE_SIZE + TILE_SIZE / 2)) continue;
      if (theme !== 'bluefield' && grassHash(col * 2 + 1, row * 3 + 2) <= density) continue;
      const screen = engine.camera.worldToScreenInto(col * TILE_SIZE, row * TILE_SIZE, _s);
      const bx = screen.x + TILE_SIZE / 2;
      const by = screen.y + 1;
      const pick = grassHash(col * 7, row * 5);
      if (isGrass) {
        if (theme === 'bluefield') {
          // Halme kommen jetzt aus EINER Quelle (Bodenband) → Ebene = Hügel.
          if (grassHash(col * 5, row * 9) > 0.9) decorFlower(ctx, bx, by, FLOWERS, col, row);
        } else if (isDry) {
          // Trockene Welten: überwiegend Grasbüschel + Trockenstrauch, nur
          // vereinzelt eine Blume (gedämpfter Stiel statt saftigem Grün).
          if (pick < 0.55) decorFern(ctx, bx, by, pal);
          else if (pick < 0.86) decorBush(ctx, bx, by, pal);
          else decorFlower(ctx, bx, by, FLOWERS, col, row, '#9a8340', '#b09a4e');
        } else if (pick < 0.4) decorFern(ctx, bx, by, pal);
        else if (pick < 0.72) decorBush(ctx, bx, by, pal);
        else decorFlower(ctx, bx, by, FLOWERS, col, row);
      } else if (theme === 'underwater') {
        if (pick < 0.55) decorSeaweed(ctx, bx, by, pal);
        else decorRock(ctx, bx, by, pal);
      } else if (theme === 'cave' || theme === 'space' || theme === 'ice') {
        if (pick < 0.6) decorRock(ctx, bx, by, pal);
        else decorCrystal(ctx, bx, by, pal, theme);
      } else {
        decorRock(ctx, bx, by, pal); // volcano, castle, sky
      }
    }
  }
  ctx.restore();
}

function decorFern(ctx: CanvasRenderingContext2D, bx: number, by: number, pal: string[]): void {
  const fronds = 6;
  for (let f = 0; f < fronds; f++) {
    const ang = -Math.PI / 2 + (f - (fronds - 1) / 2) * 0.34;
    const len = 13 + (f % 2) * 5;
    const ex = bx + Math.cos(ang) * len;
    const ey = by + Math.sin(ang) * len;
    ctx.strokeStyle = pal[1];
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + Math.cos(ang) * len * 0.5, by + Math.sin(ang) * len * 0.5 - 3, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = pal[2];
    ctx.lineWidth = 0.9;
    for (let s = 0.35; s < 0.95; s += 0.28) {
      const sx = bx + Math.cos(ang) * len * s;
      const sy = by + Math.sin(ang) * len * s - 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(sx - 3, sy - 2.5);
      ctx.moveTo(sx, sy); ctx.lineTo(sx + 3, sy - 2.5);
      ctx.stroke();
    }
  }
}

function decorBush(ctx: CanvasRenderingContext2D, bx: number, by: number, pal: string[]): void {
  const lumps: [number, number, number][] = [[0, 0, 9], [-7, 2, 7], [7, 1, 7], [-3, -4, 6], [4, -3, 6]];
  for (const [dx, dy, r] of lumps) {
    ctx.fillStyle = pal[0];
    ctx.beginPath(); ctx.ellipse(bx + dx, by - r * 0.6 + dy, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const [dx, dy, r] of lumps) {
    ctx.fillStyle = pal[1];
    ctx.beginPath(); ctx.ellipse(bx + dx, by - r * 0.6 + dy - 1, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = pal[2];
  ctx.beginPath(); ctx.ellipse(bx - 2, by - 9, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
}

function decorFlower(ctx: CanvasRenderingContext2D, bx: number, by: number, colors: string[], col: number, row: number, stemCol = '#2e7d32', leafCol = '#3a9d42'): void {
  ctx.strokeStyle = stemCol;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 12); ctx.stroke();
  ctx.fillStyle = leafCol;
  ctx.beginPath(); ctx.ellipse(bx + 3, by - 6, 3, 1.5, 0.5, 0, Math.PI * 2); ctx.fill();
  const fy = by - 13;
  const color = colors[Math.floor(grassHash(col * 3, row * 9) * colors.length) % colors.length];
  ctx.fillStyle = color;
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    ctx.beginPath(); ctx.ellipse(bx + Math.cos(a) * 3, fy + Math.sin(a) * 3, 2.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffd54a';
  ctx.beginPath(); ctx.arc(bx, fy, 1.8, 0, Math.PI * 2); ctx.fill();
}

function decorRock(ctx: CanvasRenderingContext2D, bx: number, by: number, pal: string[]): void {
  const rocks: [number, number, number, number][] = [[0, 0, 8, 7], [-6, 1, 5, 4]];
  for (const [dx, dy, rw, rh] of rocks) {
    ctx.fillStyle = pal[0];
    ctx.beginPath();
    ctx.moveTo(bx + dx - rw, by + dy);
    ctx.lineTo(bx + dx - rw * 0.5, by + dy - rh);
    ctx.lineTo(bx + dx + rw * 0.3, by + dy - rh * 0.9);
    ctx.lineTo(bx + dx + rw, by + dy);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal[2];
    ctx.beginPath();
    ctx.moveTo(bx + dx - rw * 0.5, by + dy - rh);
    ctx.lineTo(bx + dx + rw * 0.3, by + dy - rh * 0.9);
    ctx.lineTo(bx + dx, by + dy - rh * 0.4);
    ctx.closePath(); ctx.fill();
  }
}

function decorCrystal(ctx: CanvasRenderingContext2D, bx: number, by: number, _pal: string[], theme: string): void {
  const glow = theme === 'space' ? '#5be0ff' : theme === 'ice' ? '#bfeeff' : '#4fc7c0';
  const spikes: [number, number, number][] = [[0, 14, 3], [-5, 9, 2.5], [5, 10, 2.5]];
  for (const [dx, h, w] of spikes) {
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(bx + dx - w, by);
    ctx.lineTo(bx + dx, by - h);
    ctx.lineTo(bx + dx + w, by);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(bx + dx, by - h);
    ctx.lineTo(bx + dx - w * 0.4, by - h * 0.4);
    ctx.lineTo(bx + dx + w * 0.4, by - h * 0.4);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function decorSeaweed(ctx: CanvasRenderingContext2D, bx: number, by: number, pal: string[]): void {
  for (let b = 0; b < 4; b++) {
    const off = (b - 1.5) * 4;
    const h = 15 + (b % 2) * 6;
    ctx.strokeStyle = b % 2 === 0 ? pal[1] : pal[2];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bx + off, by);
    ctx.quadraticCurveTo(bx + off + 6, by - h * 0.5, bx + off - 2, by - h);
    ctx.stroke();
  }
}

// Zeichnet glatte begehbare Hügel als gekrümmte Erd-Kurve mit Gras-Oberkante,
// über die flachen Boden-Tiles gelegt. Theme-Farben für die Gras-Welten.
// Bluefield-Reise: Boden-Belag pro Sektion (folgt der Hügelkurve). Willkommen
// bleibt blaue Wiese; U1 = heller Office-Boden, MatchSuite = Blueprint-Navy,
// GKV = nebliger Grau-Boden. Deckend über das Gras-Bodenband gelegt.
function tintBluefieldGround(engine: GameEngine): void {
  if (engine.level.theme !== 'bluefield') return;
  const ctx = engine.renderer.ctx;
  const hills = engine.level.terrainHills ?? [];
  const cam = engine.camera;
  const T = TILE_SIZE;
  const VW = engine.renderer.viewportW, VH = engine.renderer.viewportH;
  const baseRow = groundRowOf(engine.level);
  const tiles = engine.level.tiles;
  const isGroundCol = (c: number): boolean => {
    if (c < 0 || c >= engine.level.width) return false;
    const t = tiles[baseRow][c];
    return t === TileType.GROUND || t === TileType.GROUND_TOP;
  };
  const belag = (col: number): string | null => {
    if (col < 71) return null;          // Willkommen: blaue Wiese bleibt
    if (col < 142) return '#e9f1fb';    // U1: heller Office-Boden
    if (col < 213) return '#15306e';    // MatchSuite: Blueprint-Navy
    return '#99a6b9';                   // GKV: nebliger Grau-Boden
  };
  const step = 4;
  for (let sxp = 0; sxp <= VW; sxp += step) {
    const worldX = sxp + cam.x;
    const col = Math.floor(worldX / T);
    if (!isGroundCol(col)) continue;
    const fill = belag(col);
    if (!fill) continue;
    const surfY = (smoothGroundY(hills, worldX) ?? baseRow * T) + 2.5;
    const screenY = surfY - cam.y;
    if (screenY >= VH) continue;
    ctx.fillStyle = fill;
    ctx.fillRect(sxp, screenY, step + 1, VH - screenY);
  }
}

// ── Terrain-Band-Cache (Perf-Paket 1) ─────────────────────────────────────
// renderTerrainHills zeichnet das begehbare Boden-/Grasband pro Frame als feine
// Kurve (step=5) + Grastextur → auf Gras-/Wolken-/Eiswelten ~11.000 lineTo/Frame
// (der größte CPU-Posten auf iPad). Das Band ist STATISCH (keine Zeit-Animation)
// und scrollt mit Weltgeschwindigkeit — also rendern wir es EINMAL pro Level in
// einen Offscreen-Streifen (Weltkoordinaten) und blitten pro Frame nur den
// sichtbaren Ausschnitt (1× drawImage statt Tausender Pfad-Operationen).
let _terrainCache: HTMLCanvasElement | null = null;
let _terrainToken = '';
let _terrainTopY = 0;
const TERRAIN_CACHE_THEMES = new Set(['jungle', 'beach', 'australia', 'bluefield', 'sky', 'ice', 'forest']);

function terrainCacheToken(engine: GameEngine): string {
  const l = engine.level;
  return `${l.theme}|${l.width}|${l.name}`;
}

function buildTerrainCache(engine: GameEngine): void {
  const l = engine.level;
  const S = TILE_SIZE;
  const worldW = l.width * S;
  const baseRow = groundRowOf(l);
  const hills = l.terrainHills ?? [];
  // Band-Oberkante = höchste Oberfläche (kleinstes y) minus Rand; Unterkante ein
  // paar Kacheln unter der Grundlinie (dort übernehmen wieder die Tiles).
  let minSurf = baseRow * S;
  for (let wx = 0; wx <= worldW; wx += 8) {
    const y = smoothGroundY(hills, wx) ?? baseRow * S;
    if (y < minSurf) minSurf = y;
  }
  const topY = Math.max(0, Math.floor(minSurf - 56));
  const botY = (baseRow + 3) * S + 6;
  const bandH = Math.max(1, Math.ceil(botY - topY));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, worldW);
  cv.height = bandH;
  const offctx = cv.getContext('2d');
  if (!offctx) return;
  // Kontext + Kamera temporär auf den Offscreen (Weltkoordinaten) umbiegen und
  // das GESAMTE Band einmal zeichnen. Fake-Kamera ohne Shake → Cache ist neutral;
  // der Shake kommt pro Frame beim Blitten dazu.
  const realCtx = engine.renderer.ctx;
  const realCam = engine.camera;
  const fakeCam = {
    x: 0, y: topY, width: worldW, height: bandH,
    worldWidth: worldW, worldHeight: (baseRow + 8) * S,
    lastShakeX: 0, lastShakeY: 0,
    worldToScreenInto(wx: number, wy: number, out: { x: number; y: number }) { out.x = wx; out.y = wy - topY; return out; },
  };
  engine.renderer.ctx = offctx;
  engine.camera = fakeCam as unknown as typeof realCam;
  try { renderTerrainHills(engine, 0, l.width - 1); }
  finally { engine.renderer.ctx = realCtx; engine.camera = realCam; }
  _terrainCache = cv;
  _terrainTopY = topY;
  _terrainToken = terrainCacheToken(engine);
}

/** Ersetzt den pro-Frame-Aufruf von renderTerrainHills: baut den Cache bei Bedarf
 *  einmalig und blittet dann nur den sichtbaren Ausschnitt. */
function drawTerrainBand(engine: GameEngine, startCol: number, endCol: number): void {
  if (!TERRAIN_CACHE_THEMES.has(engine.level.theme)) {
    renderTerrainHills(engine, startCol, endCol); // Nicht-Graswelten: unverändert
    return;
  }
  if (!_terrainCache || _terrainToken !== terrainCacheToken(engine)) buildTerrainCache(engine);
  const cache = _terrainCache;
  if (!cache) return;
  const cam = engine.camera;
  const vw = engine.renderer.viewportW;
  const sx = Math.max(0, Math.min(cache.width - 1, Math.floor(cam.x)));
  const sw = Math.min(cache.width - sx, vw + 2);
  if (sw <= 0) return;
  // Zielposition über die echte Kamera bestimmen (inkl. Shake + Rundung), damit
  // das Band exakt wie zuvor sitzt.
  const p = cam.worldToScreenInto(sx, _terrainTopY, _s);
  engine.renderer.ctx.drawImage(cache, sx, 0, sw, cache.height, p.x, p.y, sw, cache.height);
}

function renderTerrainHills(
  engine: GameEngine, startCol: number, endCol: number,
): void {
  const ctx = engine.renderer.ctx;
  const theme = engine.level.theme;
  const isGrassWorld = theme === 'jungle' || theme === 'beach' || theme === 'australia' || theme === 'bluefield' || theme === 'forest';
  const isDry = theme === 'australia' || theme === 'beach'; // Sandkruste statt Gras (Outback/Strand)
  const isCloud = theme === 'sky';
  const isIce = theme === 'ice';
  if (!isGrassWorld && !isCloud && !isIce) return; // Gras-Welten + Wolken + Eis
  const hills = engine.level.terrainHills ?? [];
  // Erd- und Gras-Töne exakt wie drawGroundTile / renderJungleGrass, damit der
  // Hügel in Farbe UND Textur (Kiesel, struppiges Gras) mit dem Boden verschmilzt.
  const PAL: Record<string, { soilBot: string; soil: string[]; narbe: string[]; pebble: string[]; grass: { deep: string; base: string; mid: string; hi: string } }> = {
    jungle: {
      soilBot: '#331a0c',
      soil: ['#7a5033', '#6b4226', '#5e3822', '#52301c', '#4a2818', '#3d1f10', '#331a0c'],
      narbe: ['#5cb848', '#4a9e3a', '#3d8a30', '#357a28', '#7a5033'],
      pebble: ['#8a7a6a', '#7a6a5a', '#6a5a4a', '#9a8a7a'],
      grass: { deep: '#2c6a22', base: '#3d8a30', mid: '#54b441', hi: '#83db66' },
    },
    beach: {
      // Strand: goldener Sand statt grüner Wiese. Sandkruste obenauf, passend
      // zum sandigen Kachelboden (drawBeachGroundTile).
      soilBot: '#684e26',
      soil: ['#caa86a', '#bd9a5c', '#a8854a', '#967340', '#806030', '#745628', '#684e26'],
      narbe: ['#eaddb0', '#dcc78c', '#c8ac6c', '#b0904e', '#caa86a'],
      pebble: ['#e0c890', '#cab078', '#f0dca8'],
      grass: { deep: '#a8844a', base: '#c2a062', mid: '#dcc088', hi: '#f0e0b8' },
    },
    australia: {
      // Outback: KEINE grüne Wiese. Rot-sandige Erde mit einer trockenen
      // Sandkruste obenauf (narbe/grass in Sand-/Ocker-Tönen statt Grün).
      soilBot: '#4e2c14',
      soil: ['#b5723a', '#a5642f', '#8e5226', '#7a441e', '#653819', '#582f16', '#4e2c14'],
      narbe: ['#d68a54', '#c2763f', '#a85f30', '#8e4e26', '#b0793f'],
      pebble: ['#d8ac72', '#c2925a', '#ecc38a'],
      grass: { deep: '#7a4a24', base: '#9c6030', mid: '#c08a4e', hi: '#e0b477' },
    },
    bluefield: {
      soilBot: '#1b3472',
      soil: ['#2d52c4', '#2a4cb6', '#2646a6', '#234096', '#213c8a', '#1e387e', '#1b3472'],
      narbe: ['#4a7be0', '#3a64c8', '#2d52b0', '#264596', '#2a3a5a'],
      pebble: ['#5a6a8a', '#4a5a7a', '#3a4a6a', '#6a7a9a'],
      grass: { deep: '#1e3a8a', base: '#2d52c4', mid: '#3f6fe0', hi: '#6b9bf5' },
    },
    forest: {
      // Waldboden: warme, dunkle Erde + sattes Moosgrün (etwas tiefer als Dschungel).
      soilBot: '#2e1b0e',
      soil: ['#6f4a2e', '#623f26', '#573620', '#4c2e1a', '#432814', '#382010', '#2e1b0e'],
      narbe: ['#4e9e3e', '#3f8a32', '#347a2a', '#2c6a24', '#6f4a2e'],
      pebble: ['#8a7a6a', '#7a6a5a', '#6a5a4a', '#9a8a7a'],
      grass: { deep: '#25601e', base: '#367e2a', mid: '#4aa23a', hi: '#74c85a' },
    },
  };
  const pal = PAL[theme] ?? PAL.jungle;
  const hexToRGB = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // Erd-Stops (7): Boden-Vereinheitlichung (v395) — GENAU dieselbe front-lastige
  // Verteilung wie drawGroundTile (Ebene), damit die Erde am Hügel gleich schnell
  // abdunkelt (dünner heller Streifen) statt einen breiten hellen Verlauf zu
  // zeigen. Bluefield nutzt (wie sein Ebenen-Tile) gleichmäßige Stops.
  const SOIL_FR = theme === 'bluefield'
    ? [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1]
    : [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1];
  const soilRGB: [number, [number, number, number]][] = pal.soil.map((h, i) => [SOIL_FR[i] ?? i / (pal.soil.length - 1), hexToRGB(h)]);
  const narbeRGB: [number, [number, number, number]][] = pal.narbe.map((h, i) => [i / (pal.narbe.length - 1), hexToRGB(h)]);
  const step = 5;
  const baseRow = groundRowOf(engine.level);
  const tiles = engine.level.tiles;
  const RENDER_DROP = 2.5;
  // Begehbarer Grundboden: baseRow ist Naturboden (GROUND/GROUND_TOP). Was
  // darauf steht (Blöcke, Pipes), unterbricht die Linie nicht.
  const isGroundCol = (c: number): boolean => {
    if (c < 0 || c >= engine.level.width) return false;
    const t = tiles[baseRow][c];
    return t === TileType.GROUND || t === TileType.GROUND_TOP || t === TileType.ICE || t === TileType.ICE_TOP;
  };
  // Zusammenhängende Boden-Segmente im erweiterten Sichtbereich (echte Grenzen
  // an Wasser/Abgründen). Eine durchgehende Kurve pro Segment, Hügel inklusive.
  const scanA = Math.max(0, startCol - 40);
  const scanB = Math.min(engine.level.width - 1, endCol + 40);
  const segments: { a: number; b: number }[] = [];
  {
    let s = -1;
    for (let c = scanA; c <= scanB; c++) {
      if (isGroundCol(c)) { if (s < 0) s = c; }
      else if (s >= 0) { segments.push({ a: s, b: c - 1 }); s = -1; }
    }
    if (s >= 0) segments.push({ a: s, b: scanB });
  }

  ctx.save(); // Gesamtes Bodenband kapseln, damit kein Clip/Alpha-State leakt.
  for (const seg of segments) {
    if (seg.b < startCol - 2 || seg.a > endCol + 2) continue;
    const x0 = seg.a * TILE_SIZE;
    const x1 = (seg.b + 1) * TILE_SIZE;
    const bottomWorldY = (baseRow + 3) * TILE_SIZE;
    const EDGE = 0; // Segmente enden an echten Grenzen; kein Überlapp über Lücken
    const x0e = x0 - EDGE;
    const x1e = x1 + EDGE;
    const surfY = (wx: number) => (smoothGroundY(hills, wx) ?? baseRow * TILE_SIZE) + RENDER_DROP;

    // Hilfsfunktion: gefülltes Band entlang der Kurve (top/bot = px-Abstand
    // unter der Oberfläche; bot < 0 ⇒ bis zum unteren Rand).
    const curveBandPath = (top: number, bot: number) => {
      ctx.beginPath();
      let f = true;
      for (let wx = x0e; wx <= x1e; wx += step) {
        const p = engine.camera.worldToScreenInto(wx, surfY(wx) + top, _s);
        if (f) { ctx.moveTo(p.x, p.y); f = false; } else ctx.lineTo(p.x, p.y);
      }
      for (let wx = x1e; wx >= x0e; wx -= step) {
        const yy = bot < 0 ? bottomWorldY : surfY(wx) + bot;
        const p = engine.camera.worldToScreenInto(wx, yy, _s);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
    };

    // Wolken-Hügel (Sky): weiche weiße Masse mit hellblauen Unterschatten und
    // fluffiger Bogen-Oberkante statt Erde/Gras.
    if (isCloud) {
      // a) Hellblauer Unterschatten über die ganze Hügelform (Volumen).
      curveBandPath(0, -1);
      ctx.fillStyle = '#b9cde6';
      ctx.fill();
      // b) Weiche weiße Wolkenmasse (oberer Bereich).
      curveBandPath(0, 46);
      ctx.fillStyle = '#eef4fc';
      ctx.fill();
      // c) Reines Weiß im Sonnenlicht ganz oben.
      curveBandPath(0, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      // d) Fluffige Wölkchen-Bögen entlang der Oberkante.
      const lobe = 24;
      for (let wx = x0e; wx <= x1e; wx += lobe) {
        const sy = surfY(wx);
        const r = 11 + grassHash(Math.round(wx * 0.5), baseRow) * 7;
        const p = engine.camera.worldToScreenInto(wx + lobe / 2, sy + 3, _s);
        if (!Number.isFinite(p.x)) continue;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(150,178,214,0.22)';
        ctx.beginPath();
        ctx.arc(p.x, p.y + 3, r, Math.PI * 1.08, Math.PI * 1.92);
        ctx.fill();
      }
      // e) Weiße Glanz-Tupfer auf der Kuppe.
      for (let wx = x0 + 12; wx <= x1 - 12; wx += 32) {
        const sy = surfY(wx);
        const p = engine.camera.worldToScreenInto(wx, sy - 3, _s);
        if (!Number.isFinite(p.x)) continue;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 6, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      continue; // Gras-Logik überspringen
    }

    // Eis-Hügel (Ice): glatte, glänzende blaue Form mit weißer Eiskante statt
    // Erde/Gras.
    if (isIce) {
      // a) Tiefes Eisblau über die ganze Form (Volumen/Schatten).
      curveBandPath(0, -1);
      ctx.fillStyle = '#5e9ccc';
      ctx.fill();
      // b) Mittleres Eisblau (oberer Bereich).
      curveBandPath(0, 44);
      ctx.fillStyle = '#9ccbe8';
      ctx.fill();
      // c) Heller Glanz auf der Kuppe.
      curveBandPath(0, 14);
      ctx.fillStyle = '#d6edfa';
      ctx.fill();
      // d) Diagonale Eis-Schlieren (glänzende Bänder), auf die Form geclippt.
      ctx.save();
      curveBandPath(0, -1);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      for (let wx = x0e - 60; wx <= x1e; wx += 26) {
        const a = engine.camera.worldToScreenInto(wx, surfY(wx) + 4, _s);
        const b = engine.camera.worldToScreenInto(wx + 40, surfY(wx + 40) + 44, _s2);
        if (!Number.isFinite(a.x) || !Number.isFinite(b.x)) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
      // e) Weiße Eiskante als glatte Oberkanten-Linie.
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      let fIce = true;
      for (let wx = x0e; wx <= x1e; wx += step) {
        const p = engine.camera.worldToScreenInto(wx, surfY(wx), _s);
        if (fIce) { ctx.moveTo(p.x, p.y); fIce = false; } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      // f) Funkelnde Glanzpunkte.
      for (let wx = x0 + 14; wx <= x1 - 14; wx += 30) {
        const p = engine.camera.worldToScreenInto(wx, surfY(wx) + 10 + grassHash(wx, baseRow) * 14, _s);
        if (!Number.isFinite(p.x)) continue;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }

    // 1) Untere Erdschicht: ganze Hügel-Form in der dunklen Ebenen-Erdfarbe.
    curveBandPath(0, -1);
    ctx.fillStyle = pal.soilBot;
    ctx.fill();

    // Ab hier auf die Hügel-Form geclippt.
    ctx.save();
    ctx.clip();

    // 2) Schichtung exakt wie der Ebenen-Boden:
    //    - grüne Grasnarbe (oberste ~10 px, wie drawGroundTile)
    //    - darunter Erd-Gradient, der erst ab der Narbentiefe (soilStart) startet
    //    - feine Bänder für einen glatten, der Hügelform folgenden Verlauf
    const soilStart = Math.floor(TILE_SIZE * 0.28); // = 8, identisch zur Ebene
    const LAYER = TILE_SIZE - soilStart;            // = 24, Erd-Höhe eines Tiles
    const NB = 14;
    for (let i = 0; i < NB; i++) {
      const frac = i / NB;
      let c: [number, number, number] = soilRGB[0][1];
      for (let s = 0; s < soilRGB.length - 1; s++) {
        const [f0, c0] = soilRGB[s];
        const [f1, c1] = soilRGB[s + 1];
        if (frac >= f0 && frac <= f1) {
          const t = (frac - f0) / (f1 - f0);
          c = [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
          break;
        }
      }
      curveBandPath(soilStart + frac * LAYER, soilStart + LAYER);
      ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      ctx.fill();
    }

    // Grüne Grasnarbe über der obersten Erde (überdeckt sie wie in der Ebene).
    const NN = 6;
    for (let i = 0; i < NN; i++) {
      const frac = i / NN;
      let c: [number, number, number] = narbeRGB[0][1];
      for (let s = 0; s < narbeRGB.length - 1; s++) {
        const [f0, c0] = narbeRGB[s];
        const [f1, c1] = narbeRGB[s + 1];
        if (frac >= f0 && frac <= f1) {
          const t = (frac - f0) / (f1 - f0);
          c = [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
          break;
        }
      }
      curveBandPath(frac * (soilStart + 2), soilStart + 2);
      ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      ctx.fill();
    }

    // === Plastizität (schlank & performant): wenige Fills statt Pro-Pixel-Loop. ===
    // a) Hügel-Volumen: pro Hügel EIN gerichteter Gradient (Sonne von links →
    //    linke Flanke heller, rechte dunkler). Auf die Hügelbreite geclippt.
    for (const h of (theme === 'bluefield' ? [] : hills)) {
      const hStartX = h.startCol * TILE_SIZE;
      const hEndX = (h.endCol + 1) * TILE_SIZE;
      if (hEndX < x0e || hStartX > x1e) continue;
      const lx = engine.camera.worldToScreenInto(hStartX, baseRow * TILE_SIZE, _s).x;
      const rx = engine.camera.worldToScreenInto(hEndX, baseRow * TILE_SIZE, _s2).x;
      if (!Number.isFinite(lx) || !Number.isFinite(rx) || rx - lx < 2) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx, 0, rx - lx, engine.renderer.viewportH);
      ctx.clip();
      // Neutrale Hell/Dunkel-Schattierung (kein warmer Creme-Ton), damit die
      // Hügel-Erde DIESELBE Farbe hat wie die Ebene (nur Volumen-Licht) —
      // sonst entsteht an der Hügelkante eine Farb-Naht (v395). Sanft an den
      // Rändern eingeblendet, damit keine harte Kante bei hStartX/hEndX steht.
      const grad = ctx.createLinearGradient(lx, 0, rx, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0.0)');
      grad.addColorStop(0.12, 'rgba(255,255,255,0.09)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.0)');
      grad.addColorStop(0.88, 'rgba(0,0,0,0.11)');
      grad.addColorStop(1, 'rgba(0,0,0,0.0)');
      curveBandPath(0, soilStart + LAYER);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
    // b) Tiefenschatten unter der Grasnarbe (AO): ein Band, hebt das Gras ab.
    curveBandPath(soilStart + 1, soilStart + 9);
    ctx.fillStyle = theme === 'bluefield' ? 'rgba(10,18,44,0.13)' : 'rgba(14,8,4,0.13)';
    ctx.fill();
    // c) Licht von oben: feiner Schimmer auf der Erd-Oberkante.
    curveBandPath(0, 3);
    ctx.fillStyle = theme === 'bluefield' ? 'rgba(150,190,255,0.10)' : 'rgba(255,250,224,0.10)';
    ctx.fill();

    // 3) Erd-Schichtlinien — exakt die vier Ebenen-Farben, über die sichtbare
    //    Erdhöhe wiederholt (gleiche Dichte wie der Tile-Boden).
    const layerColors = theme === 'bluefield'
      ? ['rgba(30,50,120,0.16)', 'rgba(20,36,88,0.13)', 'rgba(45,72,180,0.11)', 'rgba(30,52,130,0.09)']
      : ['rgba(90,55,25,0.15)', 'rgba(60,35,15,0.12)', 'rgba(110,70,35,0.1)', 'rgba(80,45,20,0.08)'];
    let li = 0;
    if (theme !== 'bluefield') for (let off = soilStart + 3; off <= soilStart + 2 * TILE_SIZE; off += 6, li++) {
      ctx.strokeStyle = layerColors[li % 4];
      ctx.lineWidth = 1;
      ctx.beginPath();
      let f2 = true;
      for (let wx = x0e; wx <= x1e; wx += step) {
        const wob = Math.sin(wx * 0.4 + li * 2.1) * 1.2 + Math.sin(wx * 0.9 + li) * 0.5;
        const p = engine.camera.worldToScreenInto(wx, surfY(wx) + off + wob, _s);
        if (f2) { ctx.moveTo(p.x, p.y); f2 = false; } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // 3b) Wurzel-Striche („Haar" im Boden), wie im Ebenen-Boden, verteilt.
    //     Bluefield: blau + dichter → die Erde wird selbst zur blauen Wiese.
    ctx.strokeStyle = theme === 'bluefield' ? 'rgba(42, 74, 176, 0.22)' : 'rgba(50, 30, 10, 0.18)';
    ctx.lineWidth = 0.8;
    const rootStep = theme === 'bluefield' ? 9 : 19;
    for (let wx = Math.ceil((x0 + 6) / rootStep) * rootStep; wx <= x1 - 6; wx += rootStep) {
      const sy = surfY(wx);
      const h0 = grassHash(wx, baseRow * 5);
      const rx = wx + (h0 - 0.5) * 8;
      const p0 = engine.camera.worldToScreenInto(rx, sy + soilStart + 4, _s);
      const p1 = engine.camera.worldToScreenInto(rx + (h0 - 0.5) * 4, sy + soilStart + 12, _s);
      const p2 = engine.camera.worldToScreenInto(rx + (h0 - 0.5) * 7, sy + soilStart + 22, _s);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p0.x + (h0 - 0.5) * 4, (p0.y + p1.y) / 2, p1.x, p1.y);
      ctx.quadraticCurveTo(p1.x + (h0 - 0.5) * 3, (p1.y + p2.y) / 2, p2.x, p2.y);
      ctx.stroke();
    }

    // 4) Kiesel (helle Punkte) verteilt über die Hügel-Fläche.
    if (theme !== 'bluefield') for (let wx = x0 + 4; wx <= x1 - 4; wx += 11) {
      const sy = surfY(wx);
      const depth = baseRow * TILE_SIZE + 2 * TILE_SIZE - sy; // verfügbare Erdhöhe
      const n = 2 + Math.floor(grassHash(wx, baseRow) * 3);
      for (let k = 0; k < n; k++) {
        const hsh = grassHash(wx * 3 + k * 7, 26 + k);
        const py = sy + 12 + hsh * Math.max(10, depth - 14);
        const px = wx + (grassHash(wx + k, k * 5) - 0.5) * 9;
        const r = 1.2 + grassHash(wx + k * 2, 9) * 1.3;
        const p = engine.camera.worldToScreenInto(px, py, _s);
        ctx.fillStyle = pal.pebble[k % pal.pebble.length];
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r, r * 0.7, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(p.x - 0.3, p.y - 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // 5) Gras-Wulst entlang der Kurve (v130-Optik): Büschel-Oberkante in drei
    //    Grünschichten, zu den Rändern hin ausgedünnt.
    const g = pal.grass;
    const rawPts: { x: number; y: number; wx: number }[] = [];
    for (let wx = Math.ceil(x0e / 6) * 6; wx <= x1e; wx += 6) {
      const p = engine.camera.worldToScreenInto(wx, surfY(wx), _s);
      rawPts.push({ x: p.x, y: p.y, wx });
    }
    // Die begehbare Oberfläche (surfY) taucht an Gruben/Abgründen senkrecht ab.
    // Wird das Gras-Band als EINE durchgehende Linie gezeichnet, „tropft" es die
    // Kante hinunter → senkrechte grüne Linie an jeder Tile/Hügel-Grenze. Daher:
    // die Oberfläche an senkrechten Sprüngen (Δy groß) in Läufe trennen und jeden
    // Lauf für sich begrasen. So endet das Gras sauber an der Kante.
    const CLIFF = 40;
    const runs: { x: number; y: number; wx: number }[][] = [];
    {
      let cur: { x: number; y: number; wx: number }[] = [];
      for (let i = 0; i < rawPts.length; i++) {
        if (i > 0 && Math.abs(rawPts[i].y - rawPts[i - 1].y) > CLIFF) {
          if (cur.length) runs.push(cur);
          cur = [];
        }
        cur.push(rawPts[i]);
      }
      if (cur.length) runs.push(cur);
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const pts of runs) {
      if (pts.length < 2) continue;
      const tops = pts.map((p, i) => {
        const edgeFade = Math.min(1, Math.min(i, pts.length - 1 - i) / 6);
        const lump = (4 + grassHash(Math.round(p.wx * 0.7), baseRow) * 7) * edgeFade;
        return { x: p.x, y: p.y - lump };
      });
      const fillBand = (color: string, lift: number, overlap: number) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + overlap);
        for (let i = 0; i < tops.length; i++) ctx.lineTo(tops[i].x, tops[i].y + lift);
        for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + overlap);
        ctx.closePath();
        ctx.fill();
      };
      fillBand(g.deep, 2.5, 5);   // dunkle Tiefe
      fillBand(g.base, 0.5, 3);   // Hauptfarbe
      fillBand(g.mid, -1.5, 1);   // Mittelton
      if (isDry) {
        // Outback: trockene Sandkruste. Helle Sand-Oberkante + nur SPARSE,
        // kurze Spinifex-Büschel in Ocker/Stroh statt dichter grüner Halm-Kamm.
        ctx.strokeStyle = g.hi;                 // heller Sandsaum (Ocker)
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < tops.length; i++) {
          if (i === 0) ctx.moveTo(tops[i].x, tops[i].y); else ctx.lineTo(tops[i].x, tops[i].y);
        }
        ctx.stroke();
        // Vereinzelte Trockengras-Büschel (jeder ~4. Punkt), strohig, kurz.
        const dryStep = engine.renderer.quality === 'low' ? 6 : 4;
        for (let i = 0; i < tops.length; i += dryStep) {
          const hsh = grassHash(Math.round(pts[i].wx) * 3, baseRow);
          if (hsh < 0.35) continue;             // nicht überall — karge Vegetation
          const blades = 3;
          for (let k = 0; k < blades; k++) {
            const h2 = grassHash(Math.round(pts[i].wx) + k * 5, baseRow + k);
            const gh = 3 + h2 * 5;              // 3..8 px, kurz
            const bx = tops[i].x + (k - 1) * 2.2;
            const bend = (h2 - 0.5) * 3.5;
            // Ocker/Stroh-Töne (hue ~42°), gedämpft — trockenes Spinifex.
            const lit = 44 + Math.floor(h2 * 16);
            ctx.strokeStyle = `hsl(${40 + Math.floor(h2 * 12)}, 46%, ${lit}%)`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(bx, tops[i].y);
            ctx.quadraticCurveTo(bx + bend * 0.5, tops[i].y - gh * 0.6, bx + bend, tops[i].y - gh);
            ctx.stroke();
          }
        }
      } else if (theme !== 'bluefield') {
        // Boden-Vereinheitlichung (v395): Hügel-Gras bekommt dieselbe helle
        // Oberkante + dichte feine Halm-Textur wie der Ebenen-Boden
        // (drawGroundTile), statt sparse Highlight-Striche.
        ctx.strokeStyle = '#8aef75';           // wie drawGroundTile-Topline
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < tops.length; i++) {
          if (i === 0) ctx.moveTo(tops[i].x, tops[i].y); else ctx.lineTo(tops[i].x, tops[i].y);
        }
        ctx.stroke();
        // Dichte feine Halme entlang der Kuppe (Kamm-Textur wie die Ebene).
        const sub = engine.renderer.quality === 'low' ? [0] : [0, 2, 4];
        for (let i = 0; i < tops.length; i++) {
          for (const dx of sub) {
            const hsh = grassHash(Math.round(pts[i].wx) * 3 + dx, baseRow);
            const gh = 3 + hsh * 6;                 // 3..9 px wie Ebene
            const bend = (hsh - 0.5) * 3.0;
            const hue = 105 + Math.floor(hsh * 30);
            const sat = 52 + Math.floor(hsh * 22);
            const lit = 30 + Math.floor(hsh * 18);
            ctx.strokeStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
            ctx.lineWidth = 1.0;
            const bx = tops[i].x + dx, by = tops[i].y;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.quadraticCurveTo(bx + bend * 0.5, by - gh * 0.5, bx + bend, by - gh);
            ctx.stroke();
          }
        }
      } else {
        ctx.strokeStyle = g.hi;
        ctx.lineWidth = 1.4;
        for (let i = 0; i < tops.length; i += 2) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(tops[i].x, tops[i].y - 1);
          ctx.stroke();
        }
        // Bluefield: einzelne dünne Halme über die ganze Oberfläche.
        const sway = Math.sin(engine.renderer.time * 0.03) * 1.0;
        for (let i = 0; i < pts.length; i++) {
          const hh = grassHash(Math.round(pts[i].wx), baseRow);
          const len = 16 + hh * 10;                  // 16..26 (Ebene + Hügel identisch)
          const lean = (hh - 0.5) * 4 + sway * (0.5 + hh);
          const w = 1.5;
          const px = pts[i].x, py = pts[i].y;
          ctx.fillStyle = hh > 0.55 ? g.hi : (hh > 0.28 ? g.mid : g.base);
          ctx.beginPath();
          ctx.moveTo(px - w, py);
          ctx.quadraticCurveTo(px - w * 0.3 + lean * 0.5, py - len * 0.6, px + lean, py - len);
          ctx.quadraticCurveTo(px + w * 0.3 + lean * 0.5, py - len * 0.6, px + w, py);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore(); // Hügel-Block sauber abschließen.
}

// Detaillierter Busch im Stil der Baumkronen: vier geschichtete Cluster-Lagen
// (dunkel/groß unten → hell/klein oben), helle Blattspitzen, Blüten, einzelne
// Randblätter und Bodengräser. Variante C aus dem Design-Audit.
function drawDetailBush(ctx: CanvasRenderingContext2D, cx: number, baseY: number, sc: number, seed: number): void {
  const pal = ['#0c421a', '#10551f', '#1c6e2c', '#2a8f34'];
  const hh = (a: number, b: number) => grassHash(seed * 7 + a, b);
  const vsh = (hh(1, 1) - 0.5) * 8;
  const layers = [
    { color: pal[0], yOff: 6, rScale: 1.1 },
    { color: pal[1], yOff: 2, rScale: 1.0 },
    { color: pal[2], yOff: -3, rScale: 0.82 },
    { color: pal[3], yOff: -7, rScale: 0.6 },
  ];
  for (const layer of layers) {
    const clusters = [
      { dx: 0 + vsh * 0.2, dy: 0, r: 22 }, { dx: -15 + vsh, dy: 3, r: 17 }, { dx: 15 + vsh * 0.6, dy: 2, r: 16 },
      { dx: -8 - vsh * 0.4, dy: -5, r: 14 }, { dx: 9 + vsh * 0.3, dy: -4, r: 15 }, { dx: -18 + vsh, dy: 7, r: 12 }, { dx: 18 + vsh, dy: 6, r: 12 },
    ];
    ctx.fillStyle = layer.color;
    for (const cl of clusters) {
      const clx = cx + cl.dx * sc;
      const cly = baseY - 16 * sc + (cl.dy + layer.yOff) * sc;
      const r = cl.r * sc * layer.rScale;
      ctx.beginPath();
      ctx.ellipse(clx, cly, r, r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Bodenanschluss (volle Basis)
  ctx.fillStyle = pal[0];
  ctx.fillRect(cx - 38 * sc, baseY - 10 * sc, 76 * sc, 12 * sc);
  // helle Blattspitzen (Sonnenlicht)
  ctx.fillStyle = '#43a038';
  for (let k = 0; k < 14; k++) {
    const x = cx + (hh(k, 2) - 0.5) * 70 * sc;
    const y = baseY - 30 * sc - hh(k, 5) * 22 * sc;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 * sc, 4 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#62c850';
  for (let k = 0; k < 7; k++) {
    const x = cx + (hh(k + 20, 2) - 0.5) * 60 * sc;
    const y = baseY - 26 * sc - hh(k + 20, 5) * 22 * sc;
    ctx.beginPath();
    ctx.ellipse(x, y, 2 * sc, 2.5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // vereinzelte Blüten
  ctx.fillStyle = '#f0c850';
  for (let k = 0; k < 4; k++) {
    const x = cx + (hh(k + 40, 2) - 0.5) * 55 * sc;
    const y = baseY - 22 * sc - hh(k + 40, 5) * 20 * sc;
    ctx.beginPath();
    ctx.arc(x, y, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  // einzelne herausstehende Randblätter (spitze Dreiecke)
  ctx.fillStyle = pal[2];
  for (let k = 0; k < 10; k++) {
    const ang = hh(k + 60, 3) * Math.PI - Math.PI;
    const rad = 40 * sc;
    const x = cx + Math.cos(ang) * rad;
    const y = baseY - 22 * sc + Math.sin(ang) * 20 * sc;
    const bx = cx + Math.cos(ang) * rad * 0.72;
    const by = baseY - 22 * sc + Math.sin(ang) * 20 * sc * 0.72;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(x - 2, y - 3);
    ctx.lineTo(x + 2, y + 3);
    ctx.closePath();
    ctx.fill();
  }
  // Bodengräser davor
  ctx.strokeStyle = pal[3];
  ctx.lineWidth = 1.6 * sc;
  ctx.lineCap = 'round';
  for (let k = 0; k < 8; k++) {
    const x = cx - 38 * sc + k * 10 * sc;
    ctx.beginPath();
    ctx.moveTo(x, baseY + 2);
    ctx.lineTo(x + 2, baseY - 9 * sc);
    ctx.stroke();
  }
}

// Nahe Vegetation: detaillierte Büsche an deterministischen Boden-Positionen,
// an die Bodenkurve gekoppelt (folgt Hügeln), hinter dem Spielfeld gezeichnet.
function renderNearBushes(engine: GameEngine, startCol: number, endCol: number): void {
  if (engine.level.theme !== 'jungle') return; // erstmal nur jungle
  const ctx = engine.renderer.ctx;
  const baseRow = groundRowOf(engine.level);
  const tiles = engine.level.tiles;
  const hills = engine.level.terrainHills ?? [];
  const isGround = (c: number): boolean => {
    if (c < 0 || c >= engine.level.width) return false;
    const t = tiles[baseRow][c];
    return t === TileType.GROUND || t === TileType.GROUND_TOP;
  };
  ctx.save();
  for (let col = startCol - 4; col <= endCol + 4; col++) {
    if (grassHash(col * 13, 7) > 0.14) continue;           // ~14% der Spalten
    if (!isGround(col) || !isGround(col - 1) || !isGround(col + 1)) continue;
    const wx = col * TILE_SIZE + TILE_SIZE / 2;
    if (isInHill(hills, wx) || isInHill(hills, wx - 1.5 * TILE_SIZE) || isInHill(hills, wx + 1.5 * TILE_SIZE)) continue; // nicht auf/an Hügeln
    const wy = smoothGroundY(hills, wx) ?? baseRow * TILE_SIZE;
    const p = engine.camera.worldToScreenInto(wx, wy, _s);
    const sc = 0.8 + grassHash(col, 3) * 0.45;
    drawDetailBush(ctx, p.x, p.y, sc, col);
  }
  ctx.restore();
}
