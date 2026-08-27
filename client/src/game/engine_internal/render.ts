// All canvas drawing for the active frame. Pulled out of engine.render()
// so the long per-entity-type switch + theme-ambient dispatch lives in
// its own file. Reads engine state but does NOT mutate gameplay state.
import {
  TILE_SIZE, GameState, TileType, EntityType, CANVAS_WIDTH, CANVAS_HEIGHT, SWING_AMP, SWING_DRIVE,
  ROPE_SWING_AMP, ROPE_SWING_DRIVE, MOUSE_DIVE_FRAMES, MOUSE_POP_FRAMES,
} from '../constants';
import {
  Coin, SpinningCoin, SpecialCoin, Goomba, Koopa, Boss, Bat, PowerUp, SpikeBall, Hornet, MovingPlatform, Spring, Crate, Switch, Door, FireBarrier,
  BombOmb, BombExplosion, PlayerFireball, Spider, Crab, Jellyfish,
  Kangaroo, Deer, BrownDeer, DeerBoss, Sheep, Turtle, Mouse, SnakeBoss, Rat, TrashCan, Geyser, RatBoss, Snake, Fireball, Ghost, Fish, Wizard, MagicBolt, PiranhaPlant,
  BanzaiBill, CharginChuck, BigBoo,
  Particle, FloatingText,
  Ape, Seagull, LavaSlime, Yeti, Knight, MiniUFO, BabyDragon, DragonEgg,
  Coconut, Snowball, UFOLaser,
} from '../entities';
import type { GameEngine } from '../engine';
import { USE_VACATION_PHOTO } from '../renderer/backgrounds';
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
// Faires Telegraphing tödlichen Wassers (Gameplay-Audit „G-Wasser"): ein
// kleiner, schild-freier Gefahren-Marker (Warndreieck mit „!") schwebt an der
// Anlaufkante jeder tödlichen Wasserstelle. Für Nicht-Leser sofort lesbar,
// passt zum cleanen Look (kein Text-Schild) und gilt für ALLE Über-Welten mit
// tödlichem Wasser. Auf false setzen, um die Marker global abzuschalten.
const SHOW_WATER_HAZARD_WARN = true;
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
  const isVacation = engine.level.theme === 'vacation';
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
        // Welt 19 „Urlaub": Lagunen-Kanten — Ufer (links/rechts) weich in Sand,
        // Unterkante abdunkeln. Nachbarn bestimmen die freiliegenden Seiten.
        if (isVacation && (tile === TileType.WATER_TOP || tile === TileType.WATER)) {
          const lT = engine.level.tiles[row]?.[col - 1] ?? TileType.EMPTY;
          const rT = engine.level.tiles[row]?.[col + 1] ?? TileType.EMPTY;
          const bT = engine.level.tiles[row + 1]?.[col] ?? TileType.EMPTY;
          const isW = (t: TileType) => t === TileType.WATER_TOP || t === TileType.WATER;
          const leftShore = !isW(lT), rightShore = !isW(rT), bottomEdge = !isW(bT);
          if (leftShore || rightShore || bottomEdge) {
            engine.renderer.drawVacationShore(screen.x, screen.y + tileDip, leftShore, rightShore, bottomEdge);
          }
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
  // Welt 19: KEINE Boden-Deko-Steine — die grauen Felsen (ROCKPALS.cave, da vacation
  // keinen Palette-Eintrag hat) liegen sonst als Fremdkörper auf dem Foto-Sandweg.
  if (engine.renderer.quality !== 'low' && !isVacation) {
    renderGroundDecor(engine, startCol, endCol, startRow, endRow);
  }

  // Gefahren-Marker vor tödlichem Wasser (schild-frei, siehe Konstante oben).
  if (SHOW_WATER_HAZARD_WARN && engine.physics?.waterHazard) {
    drawWaterHazardWarnings(engine, startCol, endCol);
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

  // Kuscheltierwelt: kleine Mauselöcher als Zuhause an den Maus-Spawns (hinter
  // den Mäusen gezeichnet, damit sie davor herlaufen).
  if (engine.level.theme === 'plush') drawPlushMouseHoles(engine);
  if (engine.level.theme === 'city') { drawCityDeco(engine); drawCityGarbageFx(engine); }

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
    } else if (entity instanceof Deer) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawDeer(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction, entity.velY, entity.onGround);
    } else if (entity instanceof BrownDeer) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawBrownDeer(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction, entity.velY, entity.onGround);
    } else if (entity instanceof DeerBoss) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawDeerBoss(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction, entity.velY, entity.onGround, entity.hp, entity.maxHp);
    } else if (entity instanceof Sheep) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawSheep(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction, entity.velY, entity.onGround);
    } else if (entity instanceof Turtle) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawTurtle(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction, entity.velY, entity.onGround);
    } else if (entity instanceof Mouse) {
      // Fußspuren hinter der Maus (verblassen mit der Lebensdauer).
      if (entity.tracks.length) {
        const tctx = engine.renderer.ctx;
        tctx.save(); tctx.fillStyle = '#6b5346';
        for (const tr of entity.tracks) {
          const tsx = screen.x + (tr.x - entity.x), tsy = screen.y + (tr.y - entity.y);
          tctx.globalAlpha = Math.max(0, tr.life / 34) * 0.5;
          tctx.beginPath(); tctx.ellipse(tsx - 1.4, tsy, 1.3, 0.9, 0, 0, Math.PI * 2); tctx.fill();
          tctx.beginPath(); tctx.ellipse(tsx + 1.4, tsy, 1.3, 0.9, 0, 0, Math.PI * 2); tctx.fill();
        }
        tctx.restore();
      }
      if (entity.burrow !== 2) {   // 2 = versteckt: Maus nicht zeichnen
        let sink = 0;
        if (entity.burrow === 1) sink = 1 - entity.burrowTimer / MOUSE_DIVE_FRAMES;       // einsinken
        else if (entity.burrow === 3) sink = entity.burrowTimer / MOUSE_POP_FRAMES;       // auftauchen
        if (entity.burrow === 0) engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
        engine.renderer.drawMouse(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction, entity.velY, entity.onGround, entity.sniffing, entity.fleeing, sink, entity.nibbling);
      }
    } else if (entity instanceof SnakeBoss) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawSnakeBoss(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction, entity.animState, entity.hp, entity.maxHp);
    } else if (entity instanceof Rat) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawRat(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction);
    } else if (entity instanceof TrashCan) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawTrashCan(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction);
    } else if (entity instanceof Geyser) {
      engine.renderer.drawGeyser(screen.x, screen.y, entity.width, entity.height, entity.phase, entity.blastH, engine.renderer.time);
    } else if (entity instanceof RatBoss) {
      engine.renderer.drawGroundShadow(screen.x + entity.width / 2, screen.y + entity.height, entity.width, entity.isDead ? 0.3 : 1);
      engine.renderer.drawRatBoss(screen.x, screen.y, entity.width, entity.height, entity.frame, entity.isDead, entity.direction, entity.velY, entity.onGround, entity.hp, entity.maxHp, entity.rearing);
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

    // Telegraphing (Audit D1): schnelle Angreifer holen sichtbar aus. Solange
    // windupTimer > 0 läuft, schwebt ein pulsierendes Warn-„!" über dem Gegner
    // — faires Vorwarn-Fenster für Kinder, bevor Sturz/Sprint/Abschuss startet.
    if ((entity instanceof Hornet || entity instanceof Seagull
         || entity instanceof BanzaiBill || entity instanceof CharginChuck)
        && !entity.isDead && entity.windupTimer > 0) {
      drawEnemyTelegraph(engine.renderer.ctx, screen.x + entity.width / 2, screen.y, engine.renderer.time);
    }
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
    const drawPlayerSprite = () => engine.renderer.drawPlayer(
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
      // Charakterwahl: Stephan-Sprite (echte Frames) global statt Lea/Fiona.
      engine.player.character === 'stephan',
    );
    // Stadt: kurze Pfützen-Spiegelung der Figur, wenn sie über einer Pfütze steht
    // (vertikal gespiegelt an der Fußlinie, auf die Pfützen-Ellipse geclippt).
    if (engine.level.theme === 'city' && engine.player.onGround && !engine.player.isDead
        && engine.level.groundRow !== undefined) {
      const gr = engine.level.groundRow;
      const pcol = Math.floor((engine.player.x + engine.player.width / 2) / TILE_SIZE);
      let puddleC = -1;
      for (let c = pcol - 1; c <= pcol + 1; c++) {
        if (engine.level.tiles[gr]?.[c] === TileType.GROUND_TOP
            && engine.level.tiles[gr - 1]?.[c] === TileType.EMPTY
            && cityHash(c * 5.3) < 0.14) { puddleC = c; break; }
      }
      if (puddleC >= 0) {
        const ps = engine.camera.worldToScreenInto(puddleC * TILE_SIZE + TILE_SIZE / 2, gr * TILE_SIZE, _s2);
        const ctx = engine.renderer.ctx;
        const tt = engine.renderer.time;
        const pw = 12 + cityHash(puddleC * 7.7) * 8;
        // Stilisierte, wabernde Spiegelung: gespiegelte Farbbänder der Figur
        // (Schuhe → Shorts → Shirt → Haut), auf die Pfützen-Ellipse geclippt.
        ctx.save();
        ctx.beginPath(); ctx.ellipse(ps.x, ps.y - 1, pw, 3.4, 0, 0, Math.PI * 2); ctx.clip();
        ctx.globalAlpha = 0.32;
        const cx = ps.x + Math.sin(tt * 0.2) * 1.2;
        const bw = pw * 0.7;
        const bands: [string, number][] = [['#3b6fd6', 2], ['#e87ba0', 3], ['#2b2b33', 4], ['#e8b48a', 3]];
        let yy = ps.y - 3;
        for (const [col, hh] of bands) { ctx.fillStyle = col; ctx.fillRect(cx - bw / 2, yy, bw, hh); yy += hh; }
        ctx.restore();
      }
    }
    // Stadt (P3): kühles Mondlicht-Rim an der Oberkante der Figur — dünner,
    // additiver Licht-Saum von der Mond-/Himmel-Seite, damit die Spielerin
    // (wie die jetzt rim-beleuchteten Gegner) in die Nacht eingebettet wirkt
    // statt „taghell". Bewusst schmal an Kopf/Schulter, kein Voll-Halo.
    if (engine.level.theme === 'city' && !engine.player.isDead) {
      const ctx = engine.renderer.ctx;
      const pw = engine.player.width, ph = engine.player.height;
      const cx = playerScreen.x + pw / 2;
      const topY = playerScreen.y + ph * 0.10;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx + 2, topY - 1, 1, cx + 2, topY - 1, pw * 0.46);
      g.addColorStop(0, 'rgba(162,194,246,0.22)');
      g.addColorStop(1, 'rgba(162,194,246,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx + 2, topY, pw * 0.4, ph * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    drawPlayerSprite();

    // Kuschel-Shop: gekaufter Kosmetik-Hut über dem Kopf (rein visuell).
    if (engine.player.cosmetic && !engine.player.isDead) {
      const pw = engine.player.width, ph = engine.player.height;
      const facing = engine.player.direction >= 0 ? 1 : -1;
      // Kopf-Oberkante; beim Ducken sitzt der Kopf tiefer.
      const headTop = playerScreen.y + ph * (engine.player.isDucking ? 0.42 : 0.06);
      const cx = playerScreen.x + pw / 2;
      // Sanfte Idle-Wippe synchron zur Figur.
      const bob = engine.player.onGround && !engine.player.isRunning
        ? Math.sin(engine.renderer.time * 0.08) * 0.6 : 0;
      drawCosmeticHat(engine.renderer.ctx, engine.player.cosmetic, cx, headTop + bob, pw, facing);
    }

    // Boutique (E3): angelegte Brille als Gesichts-Overlay über den Augen.
    if (engine.player.cosmeticGlasses && !engine.player.isDead) {
      const pw = engine.player.width, ph = engine.player.height;
      const facing = engine.player.direction >= 0 ? 1 : -1;
      // Augen-Höhe (beim Ducken sitzt der Kopf tiefer); leichte Idle-Wippe wie beim Hut.
      const eyeY = playerScreen.y + ph * (engine.player.isDucking ? 0.52 : 0.20);
      const cx = playerScreen.x + pw / 2;
      const bob = engine.player.onGround && !engine.player.isRunning
        ? Math.sin(engine.renderer.time * 0.08) * 0.6 : 0;
      drawCosmeticGlasses(engine.renderer.ctx, engine.player.cosmeticGlasses, cx, eyeY + bob, pw, facing);
    }

    // Boutique (E3): angelegtes Hals-Accessoire (Schal/Kette) am Hals.
    if (engine.player.cosmeticAccessory && !engine.player.isDead) {
      const pw = engine.player.width, ph = engine.player.height;
      const facing = engine.player.direction >= 0 ? 1 : -1;
      const neckY = playerScreen.y + ph * (engine.player.isDucking ? 0.62 : 0.34);
      const cx = playerScreen.x + pw / 2;
      const bob = engine.player.onGround && !engine.player.isRunning
        ? Math.sin(engine.renderer.time * 0.08) * 0.6 : 0;
      drawCosmeticAccessory(engine.renderer.ctx, engine.player.cosmeticAccessory, cx, neckY + bob, pw, facing);
    }

    // Stadt: Regenschirm-Figur — bei kräftigem Regen öffnet die Spielerin im
    // Stehen automatisch einen kleinen Schirm (rein visuell). Der Öffnungsgrad
    // wird weich geführt, damit der Schirm sanft auf-/zugeht statt zu poppen.
    if (engine.level.theme === 'city') {
      const rain = cityRainIntensity(engine);
      const standing = engine.player.onGround && !engine.player.isDead
        && !engine.player.isDucking && !engine.player.isJumping
        && Math.abs(engine.player.velX) < 0.4;
      // Ziel: nur bei ordentlichem Regen UND ruhigem Stehen offen. Schwelle so
      // gewählt, dass der Schirm im Sturm-Zentrum (Default-Regen 0.6) voll
      // aufgeht, bei leichtem Niesel/Regler-unten aber geschlossen bleibt.
      const target = (standing && rain > 0.4) ? Math.min(1, (rain - 0.4) / 0.2) : 0;
      const u = engine.renderer.cityUmbrella;
      engine.renderer.cityUmbrella = u + (target - u) * 0.12;
      if (engine.renderer.cityUmbrella > 0.02) {
        drawUmbrella(
          engine,
          playerScreen.x + engine.player.width / 2,
          playerScreen.y,
          engine.renderer.cityUmbrella,
        );
      }
    }

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
// Kuscheltierwelt: Mauseloch-Positionen (Weltkoordinaten) je Level, aus den
// Maus-Spawns abgeleitet und gecacht.
const _mouseHoleCache = new WeakMap<object, number[]>();
function plushMouseHoleXs(level: GameEngine['level']): number[] {
  const cached = _mouseHoleCache.get(level);
  if (cached) return cached;
  const xs: number[] = [];
  for (const e of level.entities) if (e.type === EntityType.MOUSE) xs.push(e.x + 15);
  _mouseHoleCache.set(level, xs);
  return xs;
}
function drawPlushMouseHoles(engine: GameEngine): void {
  const xs = plushMouseHoleXs(engine.level);
  if (!xs.length || engine.level.groundRow === undefined) return;
  const ctx = engine.renderer.ctx;
  const groundY = engine.level.groundRow * TILE_SIZE;
  const t = engine.renderer.time;
  let i = -1;
  for (const wx of xs) {
    i++;
    if (!engine.camera.isVisible(wx - 20, groundY - 22, 40, 26)) continue;
    const s = engine.camera.worldToScreenInto(wx, groundY, _s);
    ctx.save();
    // weiches Erd-/Stoff-Hügelchen um das Loch
    ctx.fillStyle = '#6b4a3a';
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
    // dunkles Loch (Halbkreis-Bogen nach oben)
    ctx.fillStyle = '#241a17';
    ctx.beginPath(); ctx.arc(s.x, s.y, 10, Math.PI, 0, false); ctx.closePath(); ctx.fill();
    // weicher Highlight-Rand
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(s.x, s.y - 1, 10, Math.PI, 0, false); ctx.stroke();
    // kleine Grasbüschel seitlich als Nische-Deko
    ctx.strokeStyle = '#8fbf6a'; ctx.lineWidth = 1.4;
    for (const gx of [s.x - 22, s.x + 22]) {
      ctx.beginPath(); ctx.moveTo(gx, s.y); ctx.lineTo(gx - 1, s.y - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx + 2, s.y); ctx.lineTo(gx + 3, s.y - 5); ctx.stroke();
    }
    // Kuschel-Charme: kleines Wollknäuel links vom Loch …
    const wx0 = s.x - 17, wy0 = s.y - 4;
    ctx.fillStyle = '#e59ab8';
    ctx.beginPath(); ctx.arc(wx0, wy0, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(wx0, wy0, 4.5, 0.4, 3.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(wx0, wy0, 2.6, -0.6, 2.4); ctx.stroke();
    ctx.strokeStyle = '#e59ab8'; ctx.lineWidth = 0.9;   // loser Wollfaden
    ctx.beginPath(); ctx.moveTo(wx0 - 4, wy0 + 2); ctx.quadraticCurveTo(wx0 - 9, wy0 + 5, wx0 - 6, s.y); ctx.stroke();
    // … und ein Käse-Eckchen rechts vom Loch, mit Krümel-Häufchen.
    const cx0 = s.x + 15, cy0 = s.y;
    ctx.fillStyle = '#f6c944';
    ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + 10, cy0); ctx.lineTo(cx0 + 10, cy0 - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9a520';
    ctx.beginPath(); ctx.arc(cx0 + 4, cy0 - 1.5, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx0 + 7.5, cy0 - 3, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8bf5a';   // Krümel vor dem Käse
    for (const [dx, dy, r] of [[-2, 0, 0.9], [1.5, 0.5, 0.7], [3.5, -0.3, 0.8]] as const) {
      ctx.beginPath(); ctx.arc(cx0 + dx, cy0 + dy, r, 0, Math.PI * 2); ctx.fill();
    }
    // Ab und zu lugen Äuglein aus dem Loch — ziehen sich bei Spielernähe zurück.
    const phase = (t + i * 71) % 230;
    const playerNear = Math.abs(engine.player.x - wx) < 66;
    if (phase < 58 && !playerNear) {
      const blink = (phase % 26) < 3;          // gelegentliches Blinzeln
      const eyeH = blink ? 0.4 : 2.1;
      for (const ex of [s.x - 3.2, s.x + 3.2]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(ex, s.y - 5, 1.7, eyeH, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#22282e';
        ctx.beginPath(); ctx.ellipse(ex, s.y - 5, 0.95, Math.min(eyeH, 1.3), 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}

// Stadt: Dachdeko (Antennen, Klimaanlagen, Wassertanks, Wäscheleinen, Neon)
// an den Dachkanten — welt-fest, stabil per Hash platziert, hinter den Figuren.
function cityHash(n: number): number { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
function drawCityDeco(engine: GameEngine): void {
  if (engine.level.groundRow === undefined) return;
  const ctx = engine.renderer.ctx;
  const gr = engine.level.groundRow;
  const tiles = engine.level.tiles;
  const t = engine.renderer.time;
  const rain = cityRainIntensity(engine);           // P5: Nässe skaliert mit Regen
  const fx = getSettings().stadtEffekte;            // Effekt-Regler (0..1)
  const low = engine.renderer.quality === 'low';    // Low-End-Gating
  // Tageszeit (wie die Foto-Kulisse): Nässe/Pfützen-Farbe koppelt an Tag→Dämmerung
  // →Nacht, damit Boden & Foto als Einheit wirken. Warme Spiegelung in der
  // Dämmerung, kühl-blau bei Nacht, neutral-hell am Tag.
  const _span = Math.max(1, (engine.camera.worldWidth || engine.camera.width) - engine.camera.width);
  const cProg = Math.max(0, Math.min(1, engine.camera.x / _span));
  const _ss = (a: number, b: number, v: number) => { const c = Math.max(0, Math.min(1, (v - a) / (b - a))); return c * c * (3 - 2 * c); };
  const dawnW = _ss(0.26, 0.50, cProg);             // → Dämmerung
  const nightW = _ss(0.60, 0.86, cProg);            // → Nacht
  const _lp = (a: number, b: number, f: number) => a + (b - a) * f;
  // Wet-Sheen-Grundton je Tageszeit
  const wetDay = [172, 196, 226], wetDusk = [240, 172, 120], wetNight = [120, 150, 208];
  let wetR = _lp(wetDay[0], wetDusk[0], dawnW), wetG = _lp(wetDay[1], wetDusk[1], dawnW), wetB = _lp(wetDay[2], wetDusk[2], dawnW);
  wetR = _lp(wetR, wetNight[0], nightW); wetG = _lp(wetG, wetNight[1], nightW); wetB = _lp(wetB, wetNight[2], nightW);
  const wetRGB = `${wetR | 0},${wetG | 0},${wetB | 0}`;
  const startCol = Math.max(1, Math.floor(engine.camera.x / TILE_SIZE) - 1);
  const endCol = Math.min(engine.level.width - 2, Math.ceil((engine.camera.x + engine.camera.width) / TILE_SIZE) + 1);
  for (let c = startCol; c <= endCol; c++) {
    // Nur auf offener Dachkante (Boden unten, frei darüber) und gedrosselt.
    if (tiles[gr]?.[c] !== TileType.GROUND_TOP) continue;
    if (tiles[gr - 1]?.[c] !== TileType.EMPTY || tiles[gr - 2]?.[c] !== TileType.EMPTY) continue;
    const s = engine.camera.worldToScreenInto(c * TILE_SIZE + TILE_SIZE / 2, gr * TILE_SIZE, _s);
    const bx = s.x, by = s.y;                        // Fuß auf der Dachfläche
    // P5 · Nässe: kontinuierlicher Wet-Sheen auf der Dachkante (skaliert mit
    // Regen) + bei Blitz kurzer greller Glanz.
    const flash = engine.renderer.cityFlash;
    if (rain > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.16, rain * 0.16);
      ctx.fillStyle = `rgba(${wetRGB},0.9)`;            // Nässe-Ton je Tageszeit
      ctx.fillRect(bx - TILE_SIZE / 2, by - 1, TILE_SIZE, 1.4);
      ctx.restore();
    }
    // #2 · Nacht-Neon-Reflex: der nasse Dachboden spiegelt die hellen Foto-Lichter
    // als weiche vertikale Farbstreifen (unten am hellsten). Nur nachts, additiv,
    // mit Regen/Effekt-Regler skaliert, auf 'low' aus.
    if (nightW > 0.12 && !low && fx > 0.05 && rain > 0.05 && cityHash(c * 4.2) < 0.5) {
      const hue = cityHash(c * 8.9);
      const neon = hue < 0.33 ? '255,90,158' : hue < 0.66 ? '90,208,255' : '255,210,90';
      const rx = bx + (cityHash(c * 2.6) - 0.5) * TILE_SIZE * 0.6 + Math.sin(t * 0.08 + c) * 1.2;
      const rh = 10 + cityHash(c * 6.1) * 9;
      const a = (0.11 + 0.06 * Math.sin(t * 0.12 + c)) * nightW * Math.min(1, rain * 1.4) * fx;
      if (a > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, by - rh, 0, by);
        g.addColorStop(0, `rgba(${neon},0)`);
        g.addColorStop(1, `rgba(${neon},${a.toFixed(3)})`);
        ctx.fillStyle = g;
        ctx.fillRect(rx - 1.3, by - rh, 2.6, rh);
        ctx.restore();
      }
    }
    if (flash > 0.08) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.6, flash * 0.6);
      ctx.fillStyle = 'rgba(205,222,255,0.9)';
      ctx.fillRect(bx - TILE_SIZE / 2, by - 2, TILE_SIZE, 2);
      ctx.restore();
    }
    // P5 · Pfütze mit Mond-/Neon-Spiegelung und Tropfen-Ringen im Regentakt.
    if (cityHash(c * 5.3) < 0.14) {
      const pw = 10 + cityHash(c * 7.7) * 8;
      ctx.save();
      // Becken (dunkel, leicht spiegelnd)
      ctx.fillStyle = 'rgba(28,38,58,0.62)';
      ctx.beginPath(); ctx.ellipse(bx, by - 1, pw, 3, 0, 0, Math.PI * 2); ctx.fill();
      // Auf die Pfützen-Ellipse clippen → Reflexionen bleiben im Becken.
      ctx.beginPath(); ctx.ellipse(bx, by - 1, pw, 3, 0, 0, Math.PI * 2); ctx.clip();
      // Himmel-/Mond-Spiegelung: blasser vertikaler Schimmer, wabernd — Ton je
      // Tageszeit (warm in der Dämmerung, kühl bei Nacht).
      const mgx = bx + Math.sin(t * 0.05 + c) * 1.6;
      const mg = ctx.createLinearGradient(mgx - 3, 0, mgx + 3, 0);
      mg.addColorStop(0, `rgba(${wetRGB},0)`);
      mg.addColorStop(0.5, `rgba(${wetRGB},0.34)`);
      mg.addColorStop(1, `rgba(${wetRGB},0)`);
      ctx.fillStyle = mg; ctx.fillRect(bx - pw, by - 4, pw * 2, 7);
      // Neon-Spiegelung (Farbschimmer) — Deko, skaliert mit Effekt-Regler.
      const hue = cityHash(c * 8.9);
      const neon = hue < 0.33 ? '#ff5a9e' : hue < 0.66 ? '#5ad0ff' : '#ffd24a';
      ctx.globalAlpha = (0.30 + Math.sin(t * 0.1 + c) * 0.12) * fx;
      ctx.fillStyle = neon;
      ctx.beginPath(); ctx.ellipse(bx, by - 1, pw * 0.32, 2.0, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // Tropfen-Ringe: expandierende Ringe im Regentakt, Auftreffpunkt wechselt.
      // Deko → auf 'low' aus und mit Effekt-Regler skaliert.
      if (rain > 0.15 && !low && fx > 0.05) {
        const period = 46;
        for (let k = 0; k < 2; k++) {
          const raw = t + c * 13 + k * 23;
          const ph = (raw % period) / period;                 // 0..1
          const a = (1 - ph) * 0.5 * Math.min(1, rain * 1.6) * fx;
          if (a <= 0.03) continue;
          const cyc = Math.floor(raw / period);
          const rx = bx - pw * 0.45 + cityHash(c * 3.1 + k + cyc * 1.7) * pw * 0.9;
          const rr = ph * pw * 0.9;
          ctx.strokeStyle = `rgba(212,226,246,${a.toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.ellipse(rx, by - 1, rr * 0.6, rr * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
    }
    const r = cityHash(c);
    if (r > 0.34) continue;                         // ~1/3 der Kanten bekommen Deko-Objekte
    const kind = Math.floor(cityHash(c * 3.7) * 9); // 0..8 (P7: mehr Sorten)
    // P4 · Kontaktschatten: weicher, kühler Schatten unter dem Deko-Objekt,
    // damit es am Dach „haftet" statt aufgesetzt zu wirken.
    ctx.save();
    ctx.fillStyle = 'rgba(8,12,24,0.30)';
    ctx.beginPath(); ctx.ellipse(bx, by + 0.5, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx, by + 0.5, 6.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    if (kind === 0) {
      // Antenne mit Blinklicht
      ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 26); ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(bx - 6, by - 20); ctx.lineTo(bx + 6, by - 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 4, by - 14); ctx.lineTo(bx + 4, by - 14); ctx.stroke();
      const blink = (Math.floor(t * 0.06) % 2) === 0;
      ctx.fillStyle = blink ? '#ff5a5a' : 'rgba(255,90,90,0.35)';
      ctx.beginPath(); ctx.arc(bx, by - 27, 2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 1) {
      // Klimaanlage (Kasten mit Lüftungsgitter)
      ctx.fillStyle = '#8a9099'; ctx.fillRect(bx - 9, by - 12, 18, 12);
      ctx.fillStyle = '#6a7079'; ctx.fillRect(bx - 9, by - 12, 18, 3);
      ctx.strokeStyle = '#4a5058'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(bx - 7, by - 8 + i * 3); ctx.lineTo(bx + 7, by - 8 + i * 3); ctx.stroke(); }
    } else if (kind === 2) {
      // Wassertank auf Beinen
      ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx - 7, by); ctx.lineTo(bx - 5, by - 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 7, by); ctx.lineTo(bx + 5, by - 12); ctx.stroke();
      ctx.fillStyle = '#7a6250'; ctx.beginPath(); ctx.ellipse(bx, by - 18, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5c4536'; ctx.beginPath(); ctx.ellipse(bx, by - 25, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 3) {
      // Wäscheleine mit bunten Stücken
      ctx.strokeStyle = 'rgba(230,230,240,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx - 14, by - 20); ctx.quadraticCurveTo(bx, by - 14, bx + 14, by - 20); ctx.stroke();
      const cols = ['#e57ba0', '#7bb0e5', '#e5d27b', '#8fd08a'];
      for (let i = 0; i < 4; i++) {
        const px = bx - 10 + i * 7, py = by - 18 + Math.abs(Math.sin((i + 0.5))) * 2;
        ctx.fillStyle = cols[i]; ctx.fillRect(px - 2, py, 4, 6);
      }
    } else if (kind === 4) {
      // Neon-Schild (leuchtender Kasten auf Mast)
      ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 16); ctx.stroke();
      const hue = cityHash(c * 9.1);
      const neon = hue < 0.33 ? '#ff5a9e' : hue < 0.66 ? '#5ad0ff' : '#ffd24a';
      const pulse = 0.55 + Math.sin(t * 0.12 + c) * 0.35;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = neon;
      rrPathR(ctx, bx - 10, by - 28, 20, 12, 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
      rrPathR(ctx, bx - 10, by - 28, 20, 12, 2); ctx.stroke();
    } else if (kind === 5) {
      // Aufgespannter Regenschirm (bunte Kuppel auf dünnem Stiel, Griff)
      const hue = cityHash(c * 6.1);
      const dome = hue < 0.33 ? '#e0556a' : hue < 0.66 ? '#5a86e0' : '#4aa860';
      ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 15); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx - 2, by - 1, 2, 0, Math.PI, true); ctx.stroke();   // Griff
      ctx.fillStyle = dome;
      ctx.beginPath(); ctx.moveTo(bx - 12, by - 15); ctx.quadraticCurveTo(bx, by - 27, bx + 12, by - 15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(bx - 4, by - 15); ctx.lineTo(bx - 3, by - 23); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 4, by - 15); ctx.lineTo(bx + 3, by - 23); ctx.stroke();
      ctx.fillStyle = dome; ctx.beginPath(); ctx.arc(bx, by - 26, 1.4, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 6) {
      // Dachrinne mit tropfendem Wasser (animiert)
      ctx.fillStyle = '#6a7079';
      ctx.fillRect(bx - 10, by - 6, 20, 3);                 // Rinne
      ctx.fillRect(bx + 7, by - 6, 3, 6);                   // Fallrohr-Ansatz
      ctx.fillStyle = 'rgba(150,190,220,0.75)';
      for (let i = 0; i < 2; i++) {
        const dphase = (t * 3 + i * 40 + c * 7) % 60;       // Tropfen fällt
        const dy = by - 3 + dphase * 0.28;
        if (dy < by + 8) { ctx.beginPath(); ctx.ellipse(bx - 6 + i * 12, dy, 1.1, 1.8, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    } else if (kind === 7) {
      // P7 · Satellitenschüssel auf kleinem Mast
      ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 10); ctx.stroke();
      ctx.save();
      ctx.translate(bx, by - 12); ctx.rotate(-0.5);
      ctx.fillStyle = '#aab0b8';
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a828b';
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a6068'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, -3); ctx.stroke();
      ctx.fillStyle = '#3a3f47'; ctx.beginPath(); ctx.arc(4, -3, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      // P7 · Tauben-Trio auf der Dachkante (leichtes Wippen)
      for (let i = 0; i < 3; i++) {
        const px = bx - 8 + i * 8;
        const py = by - 4 + Math.sin(t * 0.08 + c + i * 1.3) * 0.6;
        ctx.fillStyle = '#7a7e88';
        ctx.beginPath(); ctx.ellipse(px, py, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();       // Körper
        ctx.beginPath(); ctx.arc(px - 2.2, py - 1.6, 1.4, 0, Math.PI * 2); ctx.fill();       // Kopf
        ctx.fillStyle = '#c85a4a'; ctx.fillRect(px - 3.6, py - 1.9, 1.3, 0.9);               // Schnabel
      }
    }
    ctx.restore();
  }
}

// P9 · Müllgruben-Effekte (Live-Overlay über die statischen LAVA_TOP-Tiles):
// pulsierender Giftgrün-Warnsaum, blubbernde Blasen, aufsteigender Gestank/Dampf
// und kreisende Fliegen. Ziel: Kinder erkennen die Todeszone sofort (Fairness).
function drawCityGarbageFx(engine: GameEngine): void {
  const ctx = engine.renderer.ctx;
  const tiles = engine.level.tiles;
  const H = engine.level.height;
  const t = engine.renderer.time;
  const efx = getSettings().stadtEffekte;           // Effekt-Regler (0..1)
  const low = engine.renderer.quality === 'low';    // Low-End-Gating
  const startCol = Math.max(0, Math.floor(engine.camera.x / TILE_SIZE) - 1);
  const endCol = Math.min(engine.level.width - 1, Math.ceil((engine.camera.x + engine.camera.width) / TILE_SIZE) + 1);
  ctx.save();
  for (let c = startCol; c <= endCol; c++) {
    // Oberflächenzeile der Grube finden (erstes LAVA_TOP in der Spalte).
    let sr = -1;
    for (let r = 0; r < H; r++) { if (tiles[r]?.[c] === TileType.LAVA_TOP) { sr = r; break; } }
    if (sr < 0) continue;
    const s = engine.camera.worldToScreenInto(c * TILE_SIZE + TILE_SIZE / 2, sr * TILE_SIZE, _s);
    const cx = s.x, sy = s.y;                          // Mitte / Oberkante der Grube
    // Warnsaum: pulsierender giftgrüner Streifen an der Oberkante (Kontrast!).
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.09 + c * 0.6);
    ctx.fillStyle = `rgba(150,210,60,${(0.28 + pulse * 0.30).toFixed(3)})`;
    ctx.fillRect(cx - TILE_SIZE / 2, sy - 1, TILE_SIZE, 2);
    ctx.fillStyle = `rgba(190,230,110,${(0.20 + pulse * 0.20).toFixed(3)})`;
    ctx.fillRect(cx - TILE_SIZE / 2, sy - 2.5, TILE_SIZE, 1);
    // Blubber-Blasen: steigen, wachsen, platzen (auf 'low' nur eine, mit
    // Effekt-Regler in der Deckkraft skaliert).
    for (let k = 0; k < (low ? 1 : 2); k++) {
      const raw = t + c * 17 + k * 35;
      const period = 70;
      const ph = (raw % period) / period;                  // 0..1
      const bxx = cx - 7 + cityHash(c * 2.1 + k) * 14;
      const byy = sy + 6 - ph * 5;
      if (ph < 0.82) {
        const rad = 1 + ph * 2.4;
        ctx.fillStyle = `rgba(120,150,55,${(0.55 * efx).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(bxx, byy, rad, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(200,225,130,${(0.55 * efx).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(bxx - rad * 0.3, byy - rad * 0.3, Math.max(0.5, rad * 0.35), 0, Math.PI * 2); ctx.fill();
      } else {
        const pr = ((ph - 0.82) / 0.18) * 4.5;
        ctx.strokeStyle = `rgba(170,200,80,${((1 - (ph - 0.82) / 0.18) * 0.5 * efx).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(bxx, byy, pr, pr * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // Gestank/Dampf: grünliche Schwaden (Deko → auf 'low' aus).
    if (!low) for (let i = 0; i < 2; i++) {
      const wph = ((t * 0.6 + c * 13 + i * 45) % 90) / 90;
      const wy = sy - wph * 22;
      const wx = cx - 4 + Math.sin(t * 0.05 + c + i) * 4 + i * 5;
      const a = (1 - wph) * 0.13 * efx;
      if (a <= 0.01) continue;
      ctx.fillStyle = `rgba(150,178,110,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(wx, wy, 2 + wph * 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Fliegen: ein paar winzige dunkle Punkte kreisen über der Grube (auf 'low' aus).
    if (!low && cityHash(c * 4.7) < 0.5) {
      for (let j = 0; j < 2; j++) {
        const fa = t * 0.14 + c + j * 3.1;
        const fx = cx + Math.cos(fa) * (6 + j * 3);
        const fy = sy - 11 - Math.sin(fa * 1.3) * 5 - j * 2;
        ctx.fillStyle = 'rgba(18,18,14,0.8)';
        ctx.fillRect(fx, fy, 1.6, 1.6);
      }
    }
  }
  ctx.restore();
}

// Stadt: Regen-Intensität aus Fortschritts-Kurve × Benutzer-Regler (0..1).
// Zentrale Quelle, damit Regen-Overlay UND Regenschirm-Figur dieselbe Stärke
// verwenden. dichte=0 → komplett trocken (kein Regen, kein Schirm).
function cityRainIntensity(engine: GameEngine): number {
  const span = Math.max(1, (engine.camera.worldWidth || engine.camera.width) - engine.camera.width);
  const prog = Math.max(0, Math.min(1, engine.camera.x / span));
  const peak = Math.exp(-Math.pow((prog - 0.6) / 0.24, 2));   // 0..1
  const base = 0.32 + 0.68 * peak;                             // 0.32..1
  const dichte = getSettings().regenDichte;                    // 0..1 (Default 0.6)
  return base * dichte;                                        // 0..1
}
// Stadt: leichter Regen (screen-space, diagonal, animiert über renderer.time).
function drawCityRain(engine: GameEngine, VW: number, VH: number) {
  const ctx = engine.renderer.ctx;
  const t = engine.renderer.time;
  const fx = getSettings().stadtEffekte;                       // Effekt-Regler
  const low = engine.renderer.quality === 'low';               // Low-End-Gating
  const dropK = low ? 0.55 : 1;                                // weniger Tropfen auf 'low'
  let intensity = cityRainIntensity(engine);                   // 0..1
  if (cityBossActive(engine)) intensity = Math.min(1, intensity + 0.25); // P12: Sturm im Finale
  if (intensity < 0.02) return;                                // Regler ganz unten → trocken
  // P6 · Böe: langsam schwankender Wind kippt Winkel & Tempo des Regens.
  const gust = Math.sin(t * 0.012) * 0.5 + Math.sin(t * 0.031 + 1.3) * 0.25; // -0.75..0.75
  const slant = 0.14 + gust * 0.16;
  ctx.save();
  // FERN-Ebene: viele kleine, blasse, langsame Tropfen (Tiefe).
  const NF = Math.round((20 + intensity * 46) * dropK);
  ctx.strokeStyle = `rgba(190,208,232,${(0.08 + intensity * 0.12).toFixed(3)})`;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < NF; i++) {
    const sx = cityHash(i * 1.7) * (VW + 40) - 20;
    const speed = 4 + cityHash(i * 2.3) * 3;
    const len = 6 + cityHash(i * 3.1) * 5;
    const y = ((cityHash(i * 4.9) * VH) + t * speed) % (VH + len) - len;
    const x = sx + y * slant * 0.7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len); ctx.stroke();
  }
  // NAH-Ebene: wenige große, kräftige, schnelle Tropfen.
  const NN = Math.round((14 + intensity * 40) * dropK);
  ctx.strokeStyle = `rgba(210,226,245,${(0.18 + intensity * 0.26).toFixed(3)})`;
  ctx.lineWidth = 1.3;
  for (let i = 0; i < NN; i++) {
    const sx = cityHash(i * 5.1 + 3) * (VW + 60) - 30;
    const speed = 9 + cityHash(i * 2.9) * 6;
    const len = 12 + cityHash(i * 3.7) * 10;
    const y = ((cityHash(i * 6.3) * VH) + t * speed) % (VH + len) - len;
    const x = sx + y * slant;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len); ctx.stroke();
  }
  ctx.restore();

  // #2 · Regen im Laternen-Lichtkegel: ein paar Tropfen leuchten INNERHALB der
  // Foto-Laternen-Kegel warm auf (sichtbares Volumenlicht) — additiv, auf die
  // Kegel-Trapeze begrenzt, nur nachts, auf 'low' aus.
  if (!low && fx > 0.05) {
    const span = Math.max(1, (engine.camera.worldWidth || engine.camera.width) - engine.camera.width);
    const prog = Math.max(0, Math.min(1, engine.camera.x / span));
    const nw = Math.max(0, Math.min(1, (prog - 0.60) / 0.26)); const nightW = nw * nw * (3 - 2 * nw);
    const img = engine.renderer.cityBgFrames[2];
    if (nightW > 0.06 && img && img.width && engine.level.groundRow !== undefined) {
      const groundY = engine.camera.worldToScreenInto(engine.camera.x, engine.level.groundRow * TILE_SIZE, _s).y;
      const bandH = Math.max(1, Math.min(VH, groundY + 4));
      const scale = bandH / img.height, panoW = img.width * scale;
      const panX = panoW <= VW ? (VW - panoW) / 2 : -(panoW - VW) * prog;
      const CONES: [number, number, number, number][] = [[0.955, 0.44, 5, 34], [0.140, 0.60, 4, 26]];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.15;
      for (const [u, v, th, bw] of CONES) {
        const cx = panX + u * panoW, cyTop = v * bandH;
        if (cx < -bw || cx > VW + bw) continue;
        const denom = Math.max(1, bandH - cyTop);
        const n = Math.round(11 * nightW * fx);
        for (let i = 0; i < n; i++) {
          const speed = 9 + cityHash(i * 2.1 + u) * 6;
          const len = 9 + cityHash(i * 4.3 + u) * 8;
          const yy = ((cityHash(i * 5.9 + u * 7) * denom) + t * speed) % (denom + len) - len;
          const y = cyTop + yy;
          if (y < cyTop) continue;
          const pp = Math.max(0, Math.min(1, (y - cyTop) / denom));  // 0 oben..1 unten
          const halfW = th + (bw - th) * pp;
          const x = cx + (cityHash(i * 3.7 + u * 3) * 2 - 1) * halfW;
          const a = 0.5 * (1 - pp * 0.55) * nightW * fx;
          if (a < 0.02) continue;
          ctx.strokeStyle = `rgba(255,232,180,${a.toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len); ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  // P6 · Aufschlag-Spritzer auf der Dachfläche (kleine V-Ticks). Deko → auf 'low' aus.
  if (engine.level.groundRow !== undefined && intensity > 0.12 && !low) {
    const roofY = engine.camera.worldToScreenInto(engine.camera.x, engine.level.groundRow * TILE_SIZE, _s).y;
    if (roofY > 4 && roofY < VH - 2) {
      ctx.save();
      ctx.lineWidth = 0.8;
      const NS = Math.round(6 + intensity * 16);
      for (let i = 0; i < NS; i++) {
        const period = 26;
        const raw = t * 1.3 + i * 11;
        const ph = (raw % period) / period;
        const a = (1 - ph) * 0.5 * Math.min(1, intensity * 1.4);
        if (a <= 0.02) continue;
        const cyc = Math.floor(raw / period);
        const sx = cityHash(i * 7.7 + cyc * 2.3) * VW;
        const spread = ph * 4;
        ctx.strokeStyle = `rgba(212,228,246,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(sx - spread, roofY - spread * 0.5);
        ctx.lineTo(sx, roofY);
        ctx.lineTo(sx + spread, roofY - spread * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // P6 · Nebelschwaden: langsame, breite, blasse Bänder → Atmosphäre/Tiefe.
  // Deko → auf 'low' aus und mit Effekt-Regler skaliert.
  if (!low && fx > 0.02) {
    ctx.save();
    for (let i = 0; i < 2; i++) {
      const my = VH * (0.48 + i * 0.2);
      const mx = ((t * 0.3 + i * 320) % (VW + 420)) - 210;
      const g = ctx.createLinearGradient(mx, 0, mx + 320, 0);
      g.addColorStop(0, 'rgba(150,165,196,0)');
      g.addColorStop(0.5, `rgba(150,165,196,${((0.05 + intensity * 0.05) * fx).toFixed(3)})`);
      g.addColorStop(1, 'rgba(150,165,196,0)');
      ctx.fillStyle = g;
      ctx.fillRect(mx, my, 320, 32);
    }
    ctx.restore();
  }
}

// P12 · Ist die Monsterratte gesichtet (Boss-Kampf aktiv)?
function cityBossActive(engine: GameEngine): boolean {
  for (const e of engine.entities) {
    if (e.type === EntityType.RAT_BOSS) {
      const b = e as unknown as { sighted?: boolean; isDead?: boolean; dead?: boolean };
      if (b.sighted && !b.isDead && !b.dead) return true;
    }
  }
  return false;
}

// P12 · Boss-Arena-Overlay: roter Vignette-Rand + zwei schwenkende Scheinwerfer.
function drawCityBossArena(engine: GameEngine, VW: number, VH: number): void {
  const ctx = engine.renderer.ctx;
  const t = engine.renderer.time;
  ctx.save();
  const vg = ctx.createRadialGradient(VW / 2, VH * 0.5, VH * 0.28, VW / 2, VH * 0.5, VW * 0.72);
  vg.addColorStop(0, 'rgba(130,12,22,0)');
  vg.addColorStop(1, 'rgba(130,12,22,0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VW, VH);
  // Scheinwerfer: Deko → auf 'low' aus, mit Effekt-Regler skaliert. Der rote
  // Vignette-Rand bleibt immer (trägt die Finale-Stimmung, ist billig).
  const fx = getSettings().stadtEffekte;
  if (engine.renderer.quality !== 'low' && fx > 0.05) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const bx = VW * (0.35 + i * 0.3) + Math.sin(t * 0.03 + i * 2.1) * 42;
      const bg = ctx.createLinearGradient(bx, 0, bx, VH * 0.72);
      bg.addColorStop(0, `rgba(255,238,196,${(0.12 * fx).toFixed(3)})`);
      bg.addColorStop(1, 'rgba(255,238,196,0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(bx - 6, 0); ctx.lineTo(bx - 42, VH * 0.72); ctx.lineTo(bx + 42, VH * 0.72); ctx.lineTo(bx + 6, 0);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

// P11 · Vordergrund-Occluder: dunkle, schnell scrollende Hänge-Kabel am oberen
// Bildrand (Parallax > 1) für räumliche Tiefe, ohne das Spielfeld zu verdecken.
function drawCityForeground(engine: GameEngine, VW: number, _VH: number): void {
  // Reine Deko/Tiefe → auf 'low' aus, mit Effekt-Regler skaliert.
  if (engine.renderer.quality === 'low') return;
  const fx = getSettings().stadtEffekte;
  if (fx < 0.05) return;
  const ctx = engine.renderer.ctx;
  const cam = engine.camera.x;
  ctx.save();
  ctx.strokeStyle = `rgba(6,7,12,${(0.85 * fx).toFixed(3)})`;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const period = 250 + k * 44;
    const shift = ((cam * 1.3 + k * 90) % period + period) % period;
    const y0 = 3 + k * 8;
    const sag = 15 + k * 7;
    ctx.lineWidth = 2 + k * 0.6;
    for (let x = -shift; x < VW + period; x += period) {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.quadraticCurveTo(x + period * 0.5, y0 + sag, x + period, y0);
      ctx.stroke();
    }
    // vereinzelt ein kleiner „Vogel"/Klemmpunkt auf dem obersten Kabel
    if (k === 0) {
      for (let x = -shift; x < VW + period; x += period) {
        ctx.fillStyle = `rgba(6,7,12,${(0.85 * fx).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y0, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}
// Stadt: kleiner Regenschirm über dem Kopf der Figur (rein visuell). `open`
// (0..1) skaliert Höhe/Breite, damit der Schirm weich aufgeht. `cx` = Kopf-
// Mitte (Screen), `topY` = obere Sprite-Kante, `dir` = Blickrichtung.
function drawUmbrella(engine: GameEngine, cx: number, topY: number, open: number) {
  if (!Number.isFinite(cx) || !Number.isFinite(topY)) return;
  const o = Math.max(0, Math.min(1, open));
  const ctx = engine.renderer.ctx;
  const t = engine.renderer.time;
  const rw = 20 * o;                         // halbe Schirm-Breite
  const rh = 11 * o;                          // Kuppel-Höhe
  const sway = Math.sin(t * 0.06) * 1.4 * o;  // leichtes Wippen
  const domeY = topY - 12 - rh;               // Kuppel sitzt über dem Kopf
  const tipX = cx + sway;
  ctx.save();
  // Griff (dünner Stab + kleiner J-Haken) vom Kopf zur Kuppel.
  ctx.strokeStyle = '#6b4a2e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx, topY - 2);
  ctx.lineTo(tipX, domeY + rh);
  ctx.stroke();
  // Schirmkuppel: rot-weiße Segmente als Halbkreis-Fächer.
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const a0 = Math.PI + (i / segs) * Math.PI;
    const a1 = Math.PI + ((i + 1) / segs) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(tipX, domeY + rh);
    ctx.arc(tipX, domeY + rh, rw, a0, a1, false);
    ctx.closePath();
    ctx.fillStyle = (i % 2 === 0) ? '#e5484d' : '#fbe9ea';
    ctx.fill();
  }
  // Randbogen + kleine Spitze oben.
  ctx.strokeStyle = '#b8353a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(tipX, domeY + rh, rw, Math.PI, Math.PI * 2, false);
  ctx.stroke();
  ctx.fillStyle = '#b8353a';
  ctx.beginPath();
  ctx.ellipse(tipX, domeY + rh - 1, 1.4 * o, 2.4 * o, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sanfte Tropfen, die vom Schirmrand abperlen (nur bei fast offenem Schirm).
  if (o > 0.7) {
    ctx.fillStyle = 'rgba(200,220,240,0.5)';
    for (let i = 0; i < 3; i++) {
      const dphase = ((t * 0.9 + i * 40) % 60) / 60;
      const dx = tipX + (i === 1 ? rw : -rw) * (i === 2 ? 0 : 1);
      const dy = domeY + rh + dphase * 14;
      ctx.beginPath(); ctx.ellipse(dx, dy, 0.9, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function rrPathR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

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
  // Boss-Arena (Reh-Boss) freihalten: der Kampf soll nicht von Vordergrundbäumen
  // verdeckt werden.
  for (const e of level.entities) {
    if (e.type === EntityType.DEER_BOSS) { const bc = e.x / TS; zones.push([(bc - 6) * TS, (bc + 7) * TS]); }
  }
  _fgForbiddenCache.set(level, zones);
  return zones;
}

// ---------------------------------------------------------------------------
// Gefahren-Marker vor tödlichem Wasser (Gameplay-Audit „G-Wasser").
// Findet je Wasserstelle die linke ANLAUFKANTE (fester, begehbarer Boden direkt
// links von tödlichem Wasser — genau die Kante, an der ein von links nach rechts
// laufendes Kind ungewarnt hineinfällt) und zeichnet dort ein sanft wippendes
// gelbes Warndreieck mit „!". Kein Text → auch für Nicht-Leser sofort lesbar.
// Die Anlaufkante (nicht jede Wasser-Spalte) bekommt den Marker, damit der Look
// ruhig bleibt. Rein visuell, keine Kollision, kein Gameplay-Effekt.
const _deadlyWater = (t: TileType): boolean =>
  t === TileType.WATER_TOP || t === TileType.WATER;

// Oberste tödliche-Wasser-Reihe einer Spalte (oder -1). Nur „Oberflächen"-Wasser
// nahe der Bodenlinie ist relevant — tiefes Deko-Wasser bleibt außen vor.
function _waterSurfaceRow(level: GameEngine['level'], col: number): number {
  const H = level.height;
  for (let r = 0; r < H; r++) {
    if (_deadlyWater(level.tiles[r]?.[col])) return r;
  }
  return -1;
}

function drawWaterHazardWarnings(engine: GameEngine, startCol: number, endCol: number): void {
  const level = engine.level;
  const ctx = engine.renderer.ctx;
  const TS = TILE_SIZE;
  const t = engine.renderer.time;
  // Etwas über den sichtbaren Rand hinaus prüfen, damit ein Marker am Bildrand
  // nicht plötzlich auftaucht/verschwindet.
  const from = Math.max(1, startCol - 1);
  const to = Math.min(level.width - 1, endCol + 1);
  for (let c = from; c <= to; c++) {
    const wsr = _waterSurfaceRow(level, c);
    if (wsr < 0) continue;                       // Spalte c hat kein tödliches Wasser
    // Linke Anlaufkante: c-1 ist an der Wasseroberfläche fester, begehbarer Boden.
    const lipT = level.tiles[wsr]?.[c - 1] ?? TileType.EMPTY;
    if (!isSolidForCollision(lipT)) continue;    // links ist selbst Wasser/Luft → keine Kante
    if (_deadlyWater(lipT)) continue;
    // Marker über der Bodenkante (Tile c-1), leicht Richtung Wasser gerückt.
    const gx = (c - 1) * TS;
    const gy = wsr * TS;
    const screen = engine.camera.worldToScreenInto(gx, gy, _s);
    const bob = Math.sin(t * 0.12 + c) * 2.2;
    const cx = screen.x + TS * 0.86;             // an die rechte (Wasser-)Kante des Lip-Tiles
    const cy = screen.y - 15 + bob;              // über dem Boden schwebend
    drawCautionTriangle(ctx, cx, cy, 15);
  }
}

// ---------------------------------------------------------------------------
// Telegraphing (Audit D1): pulsierendes Warn-„!" über einem schnellen
// Angreifer, solange er ausholt. (cx, topY) = Kopf-Oberkante-Mitte.
function drawEnemyTelegraph(ctx: CanvasRenderingContext2D, cx: number, topY: number, t: number): void {
  const pulse = 0.55 + 0.45 * Math.sin(t * 0.5);
  const bob = Math.sin(t * 0.5) * 1.6;
  const y = topY - 13 + bob;
  ctx.save();
  // expandierender Warn-Ring
  const ringR = 8 + pulse * 5;
  ctx.strokeStyle = `rgba(255,70,70,${0.5 * (1 - pulse)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, y, ringR, 0, Math.PI * 2); ctx.stroke();
  // roter Kreis mit weißem „!"
  ctx.fillStyle = '#ff3b3b';
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, y, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillRect(cx - 1.1, y - 4, 2.2, 5);
  ctx.beginPath(); ctx.arc(cx, y + 3.4, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Kuschel-Shop: prozedurale Kosmetik-Hüte über dem Kopf der Figur (F1).
// (cx, topY) = Kopf-Oberkante-Mitte; w = Spielerbreite (Skalierung); facing = ±1.
// Alle Hüte zeichnen von topY nach OBEN, sitzen also auf dem Kopf. Keine Assets.
export function drawCosmeticHat(
  ctx: CanvasRenderingContext2D, id: string, cx: number, topY: number, w: number, facing: number,
): void {
  const u = w / 24; // Referenz: Spielerbreite ~24px
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const outline = (lw: number, col: string) => { ctx.lineWidth = lw; ctx.strokeStyle = col; };
  switch (id) {
    case 'blume': {
      // Blümchen seitlich am Kopf (Richtung Blickseite).
      const fx = cx + facing * 6 * u, fy = topY + 2 * u, r = 3.1 * u;
      ctx.fillStyle = '#ff8fc4';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * r, fy + Math.sin(a) * r, 2.2 * u, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(fx, fy, 2.1 * u, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'schleife': {
      // Große Schleife obendrauf.
      const by = topY - 1 * u, wing = 5.2 * u, hh = 3.6 * u;
      ctx.fillStyle = '#ff5fa2'; outline(1.4, '#b33071');
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx, by);
        ctx.lineTo(cx + s * wing, by - hh);
        ctx.lineTo(cx + s * wing, by + hh);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(cx, by, 1.9 * u, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'cap': {
      // Schirmmütze: Kuppel + Schirm in Blickrichtung.
      const baseY = topY + 1.5 * u, r = 6.2 * u;
      ctx.fillStyle = '#2f7bd6'; outline(1.3, '#1c4f8f');
      ctx.beginPath(); ctx.arc(cx, baseY, r, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      // Schirm
      ctx.beginPath();
      ctx.moveTo(cx + facing * 1 * u, baseY);
      ctx.quadraticCurveTo(cx + facing * 9 * u, baseY + 0.5 * u, cx + facing * 10.5 * u, baseY + 2.4 * u);
      ctx.quadraticCurveTo(cx + facing * 8 * u, baseY + 2.2 * u, cx + facing * 1 * u, baseY + 1.6 * u);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#eef4ff';
      ctx.beginPath(); ctx.arc(cx, baseY - r * 0.62, 1.5 * u, 0, Math.PI * 2); ctx.fill(); // Knopf
      break;
    }
    case 'party': {
      // Spitzer Kegel-Hut mit Streifen + Bommel.
      const baseY = topY + 2 * u, apexY = topY - 12 * u, half = 5.4 * u;
      const grd = ctx.createLinearGradient(cx - half, apexY, cx + half, baseY);
      grd.addColorStop(0, '#ff6b6b'); grd.addColorStop(0.5, '#ffd23f'); grd.addColorStop(1, '#4fc3f7');
      ctx.fillStyle = grd; outline(1.3, '#7a3d9c');
      ctx.beginPath();
      ctx.moveTo(cx, apexY); ctx.lineTo(cx + half, baseY); ctx.lineTo(cx - half, baseY);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Bommel
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath(); ctx.arc(cx, apexY, 2 * u, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'zylinder': {
      // Zylinder: Krempe + hoher Zylinder + Band.
      const brimY = topY + 1.5 * u;
      ctx.fillStyle = '#2b2b33'; outline(1.3, '#000');
      ctx.beginPath(); ctx.ellipse(cx, brimY, 8 * u, 2.2 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(cx - 5 * u, topY - 11 * u, 10 * u, 12.5 * u);
      ctx.strokeRect(cx - 5 * u, topY - 11 * u, 10 * u, 12.5 * u);
      ctx.fillStyle = '#e0413f';
      ctx.fillRect(cx - 5 * u, brimY - 3.4 * u, 10 * u, 2.6 * u); // Band
      break;
    }
    case 'krone': {
      // Goldkrone mit Zacken + Edelsteinen.
      const baseY = topY + 1 * u, topZ = topY - 6.5 * u, half = 6.4 * u;
      ctx.fillStyle = '#ffcf33'; outline(1.3, '#b8860b');
      ctx.beginPath();
      ctx.moveTo(cx - half, baseY);
      ctx.lineTo(cx - half, topZ + 2 * u);
      ctx.lineTo(cx - half * 0.5, baseY - 3 * u);
      ctx.lineTo(cx, topZ);
      ctx.lineTo(cx + half * 0.5, baseY - 3 * u);
      ctx.lineTo(cx + half, topZ + 2 * u);
      ctx.lineTo(cx + half, baseY);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      const gems: [number, string][] = [[-half * 0.5, '#ff5fa2'], [0, '#4fc3f7'], [half * 0.5, '#7cf29b']];
      for (const [dx, col] of gems) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(cx + dx, baseY - 1.4 * u, 1.5 * u, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'stern': {
      // Haarreif mit leuchtendem Stern.
      const arcY = topY + 2 * u;
      outline(1.8 * u, '#c9a0ff');
      ctx.beginPath(); ctx.arc(cx, arcY, 6.2 * u, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      const sx = cx, sy = topY - 6 * u;
      // Glühen
      const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, 6 * u);
      gl.addColorStop(0, 'rgba(255,240,150,0.9)'); gl.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy, 6 * u, 0, Math.PI * 2); ctx.fill();
      // Fünfzackiger Stern
      ctx.fillStyle = '#ffe45e'; outline(1.1, '#d9a400');
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? 4 * u : 1.7 * u;
        const px = sx + Math.cos(a) * rr, py = sy + Math.sin(a) * rr;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
    default: break;
  }
  ctx.restore();
}

/**
 * Kosmetik-Brille über den Augen (Gesichts-Overlay). Anker (cx, eyeY) = Augen-
 * mitte, Skalierung `w` = Referenz-Körperbreite (u = w/24), analog drawCosmeticHat.
 */
export function drawCosmeticGlasses(
  ctx: CanvasRenderingContext2D, id: string, cx: number, eyeY: number, w: number, _facing: number,
): void {
  const u = w / 24;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (id) {
    case 'sonnenbrille': {
      const off = 2.6 * u, lw = 2.5 * u, lh = 2.2 * u;
      // Bügel zu den Ohren.
      ctx.strokeStyle = '#20242e'; ctx.lineWidth = 1.1 * u;
      ctx.beginPath(); ctx.moveTo(cx - off - lw * 0.7, eyeY - 0.2 * u); ctx.lineTo(cx - off - lw * 1.5, eyeY - 0.7 * u); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + off + lw * 0.7, eyeY - 0.2 * u); ctx.lineTo(cx + off + lw * 1.5, eyeY - 0.7 * u); ctx.stroke();
      // Steg.
      ctx.beginPath(); ctx.moveTo(cx - 0.9 * u, eyeY); ctx.lineTo(cx + 0.9 * u, eyeY); ctx.stroke();
      for (const s of [-1, 1]) {
        const lx = cx + s * off;
        ctx.fillStyle = '#1b2531';
        ctx.beginPath(); ctx.ellipse(lx, eyeY, lw, lh, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0e1218'; ctx.lineWidth = 1.0 * u; ctx.stroke();
        ctx.fillStyle = 'rgba(160,205,255,0.55)';
        ctx.beginPath(); ctx.ellipse(lx - lw * 0.32, eyeY - lh * 0.34, lw * 0.34, lh * 0.24, -0.5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'herzbrille': {
      const off = 2.7 * u, r = 1.5 * u;
      ctx.strokeStyle = '#e0413f'; ctx.lineWidth = 1.0 * u;
      ctx.beginPath(); ctx.moveTo(cx - 0.9 * u, eyeY); ctx.lineTo(cx + 0.9 * u, eyeY); ctx.stroke();
      for (const s of [-1, 1]) {
        const lx = cx + s * off;
        ctx.fillStyle = '#ff5fa2';
        // Herz aus zwei Bögen + Spitze.
        ctx.beginPath();
        ctx.arc(lx - r * 0.55, eyeY - r * 0.2, r * 0.7, Math.PI, 0);
        ctx.arc(lx + r * 0.55, eyeY - r * 0.2, r * 0.7, Math.PI, 0);
        ctx.lineTo(lx, eyeY + r * 1.3);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'nerdbrille': {
      // Runde schwarze Nerd-Gläser mit dickem Rahmen + hellem Glas.
      const off = 2.5 * u, rr = 1.9 * u;
      // Bügel zu den Ohren.
      ctx.strokeStyle = '#20242e'; ctx.lineWidth = 1.0 * u;
      ctx.beginPath(); ctx.moveTo(cx - off - rr, eyeY - 0.2 * u); ctx.lineTo(cx - off - rr * 1.7, eyeY - 0.7 * u); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + off + rr, eyeY - 0.2 * u); ctx.lineTo(cx + off + rr * 1.7, eyeY - 0.7 * u); ctx.stroke();
      // Steg.
      ctx.beginPath(); ctx.moveTo(cx - 0.7 * u, eyeY - 0.3 * u); ctx.lineTo(cx + 0.7 * u, eyeY - 0.3 * u); ctx.stroke();
      for (const s of [-1, 1]) {
        const lx = cx + s * off;
        ctx.fillStyle = 'rgba(200,230,255,0.6)';
        ctx.beginPath(); ctx.arc(lx, eyeY, rr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1a1d24'; ctx.lineWidth = 1.4 * u;
        ctx.beginPath(); ctx.arc(lx, eyeY, rr, 0, Math.PI * 2); ctx.stroke();
        // Glanzpunkt.
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(lx - rr * 0.35, eyeY - rr * 0.35, rr * 0.28, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'sternbrille': {
      // Verspielte Stern-Gläser (fünfzackig), sonnengelb mit Rahmen.
      const off = 2.7 * u, R = 2.2 * u;
      ctx.strokeStyle = '#f5a623'; ctx.lineWidth = 1.0 * u;
      ctx.beginPath(); ctx.moveTo(cx - 0.9 * u, eyeY); ctx.lineTo(cx + 0.9 * u, eyeY); ctx.stroke();
      for (const s of [-1, 1]) {
        const lx = cx + s * off;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const ang = -Math.PI / 2 + k * Math.PI / 5;
          const rad = k % 2 === 0 ? R : R * 0.45;
          const px = lx + Math.cos(ang) * rad, py = eyeY + Math.sin(ang) * rad;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffd23f'; ctx.fill();
        ctx.strokeStyle = '#c8871a'; ctx.lineWidth = 0.9 * u; ctx.stroke();
      }
      break;
    }
    default: break;
  }
  ctx.restore();
}

/**
 * Kosmetik-Accessoire am Hals (Front-Overlay). Anker (cx, neckY) = Halsmitte,
 * Skalierung `w` = Referenz-Körperbreite (u = w/24).
 */
export function drawCosmeticAccessory(
  ctx: CanvasRenderingContext2D, id: string, cx: number, neckY: number, w: number, facing: number,
): void {
  const u = w / 24;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (id) {
    case 'schal': {
      const band = 4.4 * u, h = 1.9 * u;
      ctx.fillStyle = '#e0413f';
      ctx.fillRect(cx - band, neckY - h / 2, band * 2, h);
      ctx.strokeStyle = '#9e2b28'; ctx.lineWidth = 1 * u;
      ctx.strokeRect(cx - band, neckY - h / 2, band * 2, h);
      const ex = cx + facing * 1.6 * u; // hängendes Ende vorne, Blickrichtung
      ctx.fillStyle = '#e0413f';
      ctx.fillRect(ex - 1.2 * u, neckY + h / 2, 2.4 * u, 5 * u);
      ctx.strokeRect(ex - 1.2 * u, neckY + h / 2, 2.4 * u, 5 * u);
      ctx.fillStyle = '#fff3b0'; // Streifen + Fransen
      ctx.fillRect(cx - band, neckY - 0.3 * u, band * 2, 0.6 * u);
      ctx.fillRect(ex - 1.2 * u, neckY + h / 2 + 3.6 * u, 2.4 * u, 0.7 * u);
      break;
    }
    case 'kette': {
      ctx.strokeStyle = '#ffcf33'; ctx.lineWidth = 1.1 * u; // Goldkette
      ctx.beginPath(); ctx.arc(cx, neckY - 2.5 * u, 4 * u, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      const py = neckY + 2.2 * u, r = 1.6 * u; // Herz-Anhänger
      ctx.fillStyle = '#ff5fa2';
      ctx.beginPath();
      ctx.arc(cx - r * 0.5, py - r * 0.2, r * 0.55, Math.PI, 0);
      ctx.arc(cx + r * 0.5, py - r * 0.2, r * 0.55, Math.PI, 0);
      ctx.lineTo(cx, py + r); ctx.closePath(); ctx.fill();
      break;
    }
    case 'schleife': {
      // Elegante Fliege am Hals: zwei Dreiecks-Flügel + Mittelknoten.
      const wing = 3.0 * u, hh = 1.9 * u;
      ctx.fillStyle = '#7b3ff2'; ctx.strokeStyle = '#5326b0'; ctx.lineWidth = 0.9 * u;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx, neckY);
        ctx.lineTo(cx + s * wing, neckY - hh);
        ctx.lineTo(cx + s * wing, neckY + hh);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      // Mittelknoten.
      ctx.fillStyle = '#4a1f9e';
      ctx.fillRect(cx - 0.9 * u, neckY - 1.3 * u, 1.8 * u, 2.6 * u);
      break;
    }
    case 'blume': {
      // Blüte auf der Brust: fünf Blütenblätter + gelbe Mitte.
      const py = neckY + 1.2 * u, pr = 1.35 * u, ring = 1.9 * u;
      ctx.fillStyle = '#ff7eb6';
      for (let k = 0; k < 5; k++) {
        const ang = -Math.PI / 2 + k * (Math.PI * 2 / 5);
        const bx = cx + Math.cos(ang) * ring, by = py + Math.sin(ang) * ring;
        ctx.beginPath(); ctx.arc(bx, by, pr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(cx, py, 1.35 * u, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e0a800'; ctx.lineWidth = 0.6 * u; ctx.stroke();
      break;
    }
    default: break;
  }
  ctx.restore();
}

// Ein kompaktes Warndreieck (gelb, dunkler Rand, „!") — zentriert auf (cx, cy),
// `s` = Höhe in px. Bewusst simpel & flach, damit es zum Tile-Look passt.
function drawCautionTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  const half = s * 0.62;
  ctx.save();
  // weicher Schlagschatten für Ablösung vom Hintergrund
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.5 + 1.5);
  ctx.lineTo(cx + half + 1.2, cy + s * 0.5 + 1.5);
  ctx.lineTo(cx - half + 1.2, cy + s * 0.5 + 1.5);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();
  // gelbes Dreieck
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.5);
  ctx.lineTo(cx + half, cy + s * 0.5);
  ctx.lineTo(cx - half, cy + s * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#FFD23F';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#8A5A00';
  ctx.stroke();
  // Ausrufezeichen
  ctx.fillStyle = '#5A3A00';
  const bx = cx, top = cy - s * 0.14;
  ctx.fillRect(bx - 1.1, top, 2.2, s * 0.34);
  ctx.beginPath();
  ctx.arc(bx, top + s * 0.46, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ===========================================================================
// POST-Layer (AP 0.2): finaler Color-Grade (per-Welt-Tint + Vignette +
// Tilt-Shift), damit Parallax, Tiles und Sprites unter einer kohärenten
// Atmosphäre sitzen. Phase 2 hängt hier GPU-Post-FX (Bloom, Displacement) an,
// ohne die Layer-Struktur zu verändern.
// ===========================================================================
// Welt 19: ein Palmwedel (gebogener Mittelrippen-Bogen + Fiederblätter).
// Feinschliff (#2): weiche Halo-Unterlage (gefälschte Unschärfe — Safari-sicher,
// KEIN Blur-Filter), Farb-/Breiten-Parameter und per-Fieder-Längen/Winkel-
// Variation über `seed`, damit kein Wedel wie der andere aussieht.
function drawVacationPalmFrond(
  ctx: CanvasRenderingContext2D, ox: number, oy: number, baseAng: number, len: number, curve: number,
  core = 'rgba(16,44,22,0.92)', leaf = 'rgba(22,58,30,0.85)', midW = 2.6, leaflets = 9, seed = 0,
) {
  const ex = ox + Math.cos(baseAng) * len, ey = oy + Math.sin(baseAng) * len;
  const cxp = ox + Math.cos(baseAng - curve) * len * 0.6, cyp = oy + Math.sin(baseAng - curve) * len * 0.6;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // weiche Halo-Unterlage der Mittelrippe (breiter, transluzent → weiche Kante)
  ctx.strokeStyle = 'rgba(18,50,26,0.20)'; ctx.lineWidth = midW * 2.7;
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(cxp, cyp, ex, ey); ctx.stroke();
  // scharfe Mittelrippe
  ctx.strokeStyle = core; ctx.lineWidth = midW;
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(cxp, cyp, ex, ey); ctx.stroke();
  const N = leaflets;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const mx = (1 - t) * (1 - t) * ox + 2 * (1 - t) * t * cxp + t * t * ex;
    const my = (1 - t) * (1 - t) * oy + 2 * (1 - t) * t * cyp + t * t * ey;
    const tang = baseAng - curve * (1 - t);
    const jit = 0.82 + 0.34 * (0.5 + 0.5 * Math.sin(seed * 3.7 + i * 1.9));   // Längen-Variation
    const ll = len * 0.26 * (1 - t * 0.5) * jit;
    const spread = 1.04 + 0.16 * Math.sin(seed + i * 0.8);                     // Winkel-Variation
    const lx1 = mx + Math.cos(tang + spread) * ll, ly1 = my + Math.sin(tang + spread) * ll;
    const lx2 = mx + Math.cos(tang - spread) * ll, ly2 = my + Math.sin(tang - spread) * ll;
    // weiche Unterlage der Fiederblätter
    ctx.strokeStyle = 'rgba(18,50,26,0.16)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(lx1, ly1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(lx2, ly2); ctx.stroke();
    // scharfe Fiederblätter
    ctx.strokeStyle = leaf; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(lx1, ly1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(lx2, ly2); ctx.stroke();
  }
}

// Welt 19: Palmwedel-Cluster in den oberen Ecken als Vordergrund-Occluder
// (Tiefe). Nur ab dem Tropen-Abschnitt, leichtes Wiegen, auf 'low'/Regler-0 aus.
// #2: gemischte Tiefen (dunkle vorne / hellere dahinter), mehr Wedel, zwei
// versetzte Wiege-Phasen → lebendigeres, weicheres Blätterdach.
const _PALM_DEEP = 'rgba(13,38,19,0.94)', _PALM_DEEPL = 'rgba(20,54,28,0.86)';
const _PALM_LITE = 'rgba(30,66,34,0.80)', _PALM_LITEL = 'rgba(48,90,46,0.72)';
// Welt 19 (#3): Etappen-Banner. Beim Betreten einer neuen Etappe (Alpen → Tropen →
// Küste, Grenzen bei col 90/180) blendet oben kurz ein dezentes Banner ein. Modul-
// State merkt sich die aktuelle Etappe; wechselt sie (auch beim Neustart, wenn der
// Spieler zurück auf Etappe 1 springt), startet die Einblendung neu.
let _vacStage = -1;
let _vacBannerT = -1e9;
const VAC_STAGE_NAMES = ['Alpen', 'Tropen-Lagune', 'Küste'];
function drawVacationStageBanner(engine: GameEngine, VW: number): void {
  const t = engine.renderer.time;
  const col = engine.player.x / TILE_SIZE;
  const stage = col < 90 ? 0 : col < 180 ? 1 : 2;
  if (stage !== _vacStage) { _vacStage = stage; _vacBannerT = t; }
  const age = t - _vacBannerT;
  const DUR = 165, FIN = 20, FOUT = 45;
  if (age < 0 || age > DUR) return;
  let a = 1;
  if (age < FIN) a = age / FIN;
  else if (age > DUR - FOUT) a = (DUR - age) / FOUT;
  a = Math.max(0, Math.min(1, a));
  if (a <= 0.02) return;
  const ctx = engine.renderer.ctx;
  const label = `Etappe ${stage + 1}: ${VAC_STAGE_NAMES[stage]}`;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(label).width;
  const padX = 16, h = 24, w = tw + padX * 2 + 14;
  const x = Math.round((VW - w) / 2);
  const y = Math.round(38 + (1 - a) * -6);   // leichter Slide-Down bei Einblendung
  // Pille
  ctx.beginPath();
  const r = 12;
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  ctx.fillStyle = 'rgba(24,20,14,0.74)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,238,198,0.55)'; ctx.lineWidth = 1; ctx.stroke();
  // kleines Kompass-/Reise-Icon (Pfeil im Kreis)
  const ix = x + padX + 1, iy = y + h / 2;
  ctx.strokeStyle = '#ffe6a6'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(ix, iy, 4.5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffe6a6';
  ctx.beginPath(); ctx.moveTo(ix - 2.4, iy + 2.4); ctx.lineTo(ix + 3, iy - 3); ctx.lineTo(ix + 1, iy + 0.4); ctx.closePath(); ctx.fill();
  // Text
  ctx.fillStyle = '#fff3da'; ctx.textAlign = 'left';
  ctx.fillText(label, x + padX + 13, iy + 0.5);
  ctx.restore();
}

function drawVacationForeground(engine: GameEngine, VW: number, _VH: number): void {
  if (USE_VACATION_PHOTO) return;   // Foto-Kulisse hat eigene Palmen → keine Occluder
  if (engine.renderer.quality === 'low') return;
  const fx = getSettings().stadtEffekte;
  if (fx < 0.05) return;
  const colC = (engine.camera.x + engine.camera.width * 0.5) / TILE_SIZE;
  if (colC < 84) return;                              // erst ab Tropen/Lagune
  const t = engine.renderer.time;
  const sway = Math.sin(t * 0.04) * 0.06;             // sanftes Wiegen (rad)
  const sway2 = Math.sin(t * 0.055 + 1.3) * 0.05;     // zweite, versetzte Phase
  const ctx = engine.renderer.ctx;
  ctx.save();
  ctx.globalAlpha = Math.min(1, fx);
  // oben links — Cluster mit gemischten Tiefen
  drawVacationPalmFrond(ctx, -8, -8, 0.30 + sway,  168, 0.52, _PALM_DEEP, _PALM_DEEPL, 2.8, 11, 1.1);
  drawVacationPalmFrond(ctx, -8, -8, 0.64 + sway2, 140, 0.60, _PALM_LITE, _PALM_LITEL, 2.2, 9, 2.4);
  drawVacationPalmFrond(ctx, -8, -8, 1.00 + sway,  120, 0.72, _PALM_DEEP, _PALM_DEEPL, 2.4, 8, 3.7);
  drawVacationPalmFrond(ctx, -8, -8, 1.34 + sway2,  96, 0.80, _PALM_LITE, _PALM_LITEL, 1.9, 7, 4.9);
  // oben rechts (gespiegelt)
  drawVacationPalmFrond(ctx, VW + 8, -8, Math.PI - 0.30 - sway,  168, -0.52, _PALM_DEEP, _PALM_DEEPL, 2.8, 11, 6.1);
  drawVacationPalmFrond(ctx, VW + 8, -8, Math.PI - 0.64 - sway2, 140, -0.60, _PALM_LITE, _PALM_LITEL, 2.2, 9, 7.3);
  drawVacationPalmFrond(ctx, VW + 8, -8, Math.PI - 1.00 - sway,  120, -0.72, _PALM_DEEP, _PALM_DEEPL, 2.4, 8, 8.5);
  drawVacationPalmFrond(ctx, VW + 8, -8, Math.PI - 1.34 - sway2,  96, -0.80, _PALM_LITE, _PALM_LITEL, 1.9, 7, 9.7);
  ctx.restore();
}

// Welt 19 (#3): Glitzern auf der Lagunen-Wasseroberfläche. Zuckende, warme
// Funken je sichtbarer Wasser-Spalte (WATER_TOP), additiv über die Wasser-Tiles
// gelegt. Deterministisch (Math.sin-Pseudorandom), auf 'low'/Regler-0 aus.
function drawVacationWaterGlitter(engine: GameEngine, VW: number): void {
  if (engine.renderer.quality === 'low') return;
  const fx = getSettings().stadtEffekte;
  if (fx < 0.05) return;
  const tiles = engine.level.tiles;
  const W = engine.level.width, H = engine.level.height;
  const startCol = Math.max(0, Math.floor(engine.camera.x / TILE_SIZE) - 1);
  const endCol = Math.min(W - 1, Math.ceil((engine.camera.x + engine.camera.width) / TILE_SIZE) + 1);
  const ctx = engine.renderer.ctx;
  const t = engine.renderer.time;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let col = startCol; col <= endCol; col++) {
    let wr = -1;
    for (let r = 2; r < H; r++) { if (tiles[r]?.[col] === TileType.WATER_TOP) { wr = r; break; } }
    if (wr < 0) continue;
    const s = engine.camera.worldToScreenInto(col * TILE_SIZE, wr * TILE_SIZE, _s);
    if (s.x < -TILE_SIZE || s.x > VW + TILE_SIZE) continue;
    for (let k = 0; k < 2; k++) {
      const ph = col * 1.618 + k * 3.11;
      const tw = Math.pow(0.5 + 0.5 * Math.sin(t * 0.16 + ph), 4);   // scharfes Zucken
      if (tw < 0.14) continue;
      const jx = ((Math.sin(ph * 12.9898) * 43758.5453) % 1 + 1) % 1;  // 0..1 pseudo
      const sx = s.x + jx * TILE_SIZE;
      const sy = s.y + 3 + ((k * 3 + (col % 3)) % 4);
      const a = 0.62 * tw * fx;
      const sz = 1.3 + tw * 1.7;
      ctx.fillStyle = `rgba(255,252,232,${a.toFixed(3)})`;
      ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
      // horizontaler Glanz-Strich
      ctx.fillStyle = `rgba(255,246,206,${(a * 0.45).toFixed(3)})`;
      ctx.fillRect(sx - sz * 1.9, sy - 0.4, sz * 3.8, 0.8);
    }
  }
  ctx.restore();
}

// Welt 19 (#3/#2): kleine Vordergrund-Deko am Sandweg — Grasbüschel (leicht
// wiegend) + Muscheln/Kiesel. An den Lagunen-Ufern dichter (voller Cluster), sonst
// sparsam über den ganzen Weg verteilt → durchgehende Tiefe. Deterministisch.
function drawVacationShoreDeco(engine: GameEngine, VW: number): void {
  if (engine.renderer.quality === 'low') return;
  const fx = getSettings().stadtEffekte;
  if (fx < 0.05) return;
  const tiles = engine.level.tiles;
  const W = engine.level.width, gr = engine.level.groundRow ?? (engine.level.height - 2);
  const isW = (c: number) => { const t = tiles[gr]?.[c]; return t === TileType.WATER_TOP || t === TileType.WATER; };
  const isGround = (c: number) => { const t = tiles[gr]?.[c]; return !!t && !isW(c); };
  const hash = (c: number) => { const v = Math.sin(c * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const startCol = Math.max(0, Math.floor(engine.camera.x / TILE_SIZE) - 1);
  const endCol = Math.min(W - 1, Math.ceil((engine.camera.x + engine.camera.width) / TILE_SIZE) + 1);
  const ctx = engine.renderer.ctx;
  const t = engine.renderer.time;
  ctx.save();
  ctx.globalAlpha = Math.min(1, fx);

  const tuft = (bx: number, by: number, blades: number, scale: number, col: number) => {
    const sway = Math.sin(t * 0.05 + col) * 0.12;
    for (let i = 0; i < blades; i++) {
      const off = (i - (blades - 1) / 2) * 2.4 * scale;
      const bend = sway + (i % 2 ? 0.06 : -0.05);
      const hgt = (8 + (i % 2) * 3) * scale;
      ctx.strokeStyle = i % 2 ? '#86a94e' : '#6f9440';
      ctx.lineWidth = 1.4 * scale; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx + off, by);
      ctx.quadraticCurveTo(bx + off + bend * hgt, by - hgt * 0.6, bx + off + bend * hgt * 2.2, by - hgt);
      ctx.stroke();
    }
  };
  const shell = (sx: number, sy: number) => {
    ctx.fillStyle = '#f2e2c8';
    ctx.beginPath(); ctx.ellipse(sx, sy, 3.2, 2.4, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(196,150,110,0.7)'; ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (const rr of [-1.6, 0, 1.6]) { ctx.moveTo(sx, sy); ctx.lineTo(sx + rr, sy - 2.4); }
    ctx.stroke();
  };
  const pebble = (px: number, py: number, r: number) => {
    ctx.fillStyle = 'rgba(120,120,128,0.55)';
    ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  };

  for (let col = startCol; col <= endCol; col++) {
    if (!isGround(col)) continue;
    const s = engine.camera.worldToScreenInto(col * TILE_SIZE, gr * TILE_SIZE, _s);
    if (s.x < -TILE_SIZE || s.x > VW + TILE_SIZE) continue;
    const baseY = s.y + 3;
    const shoreRight = isW(col + 1), shoreLeft = isW(col - 1);
    if (shoreRight || shoreLeft) {
      // Voller Ufer-Cluster direkt an der Wasserkante.
      const bx = shoreRight ? s.x + TILE_SIZE - 5 : s.x + 5;
      tuft(bx, baseY, 4, 1, col);
      const shX = shoreRight ? s.x + TILE_SIZE - 13 : s.x + 9;
      shell(shX, baseY + 2);
      pebble(shX + (shoreRight ? -6 : 6), baseY + 3, 1.8);
    } else {
      // Sparsam über den restlichen Weg: ~jede 6.–8. Kachel ein kleines Detail.
      const hv = hash(col);
      if (hv > 0.82) tuft(s.x + 6 + hash(col + 7) * 20, baseY, 3, 0.8, col);
      else if (hv > 0.72) shell(s.x + 6 + hash(col + 3) * 20, baseY + 2);
      else if (hv > 0.66) pebble(s.x + 6 + hash(col + 5) * 20, baseY + 3, 1.6);
    }
  }
  ctx.restore();
}

// Welt 19 (#2/#3): größere Akzente für Tiefe & Stimmung.
//  • Ferne, winzige Möwen-Silhouetten HOCH am Himmel (reine Deko, KEIN Gegner) —
//    langsam driftend, sehr blass. `VAC_DECO_BIRDS=false` schaltet sie ganz ab.
//  • Vordergrund-Palmwedel an 1–2 Welt-Ankern (scrollen mit) + gebleichtes
//    Treibholz am Lagunen-Ufer.
const VAC_DECO_BIRDS = true;
function drawVacationDecoAccents(engine: GameEngine, VW: number, VH: number): void {
  if (engine.renderer.quality === 'low') return;
  const fx = getSettings().stadtEffekte;
  if (fx < 0.05) return;
  const ctx = engine.renderer.ctx;
  const t = engine.renderer.time;
  const gr = engine.level.groundRow ?? (engine.level.height - 2);

  // ── ferne Deko-Möwen (Himmel) ──
  if (VAC_DECO_BIRDS) {
    ctx.save();
    ctx.strokeStyle = 'rgba(72,84,100,0.34)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const bx = ((t * (0.18 + i * 0.015) + i * 173) % (VW + 60)) - 30;
      const by = 46 + i * 15 + Math.sin(t * 0.02 + i * 1.7) * 5;
      const flap = 2.2 + Math.sin(t * 0.18 + i) * 1.1;   // Flügelschlag
      const wsp = 4.5;
      ctx.beginPath();
      ctx.moveTo(bx - wsp, by); ctx.quadraticCurveTo(bx - wsp * 0.4, by - flap, bx, by);
      ctx.quadraticCurveTo(bx + wsp * 0.4, by - flap, bx + wsp, by);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── gebleichtes Treibholz als größere Deko-Akzente (Welt-Anker; scrollen mit) ──
  const logAt = (worldCol: number, scale = 1) => {
    const s = engine.camera.worldToScreenInto(worldCol * TILE_SIZE, gr * TILE_SIZE, _s);
    if (s.x < -80 || s.x > VW + 80) return;
    const lx = s.x, ly = s.y + 8, lw = 40 * scale, lh = 8 * scale;
    ctx.save();
    ctx.fillStyle = 'rgba(20,40,44,0.18)'; ctx.beginPath(); ctx.ellipse(lx + lw / 2, ly + lh, lw * 0.55, 3, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createLinearGradient(0, ly, 0, ly + lh);
    g.addColorStop(0, '#cbb89a'); g.addColorStop(1, '#9c8869');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(lx + 3, ly); ctx.lineTo(lx + lw - 3, ly);
    ctx.arcTo(lx + lw, ly, lx + lw, ly + lh, 3); ctx.lineTo(lx + lw, ly + lh - 1);
    ctx.arcTo(lx + lw, ly + lh, lx + lw - 3, ly + lh, 3); ctx.lineTo(lx + 3, ly + lh);
    ctx.arcTo(lx, ly + lh, lx, ly, 3); ctx.arcTo(lx, ly, lx + 3, ly, 3); ctx.closePath(); ctx.fill();
    // Maserung + Endring
    ctx.strokeStyle = 'rgba(90,70,48,0.5)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(lx + 4, ly + lh * 0.5); ctx.lineTo(lx + lw - 4, ly + lh * 0.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,54,36,0.6)';
    ctx.beginPath(); ctx.ellipse(lx + 3.5, ly + lh / 2, 1.6, lh * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,248,228,0.4)'; ctx.fillRect(lx + 3, ly + 1, lw - 6, 1);
    // Angespülte Gruppe: kleines Dünengras-Büschel hinter dem Holz + eine Muschel
    // davor → wirkt wie ein natürlicher Strandfund statt ein einsames Scheit.
    const gsw = Math.sin(t * 0.05 + worldCol) * 0.12;
    for (let i = 0; i < 4; i++) {
      const bx = lx + 4 + i * 3.2;
      const hgt = 9 + (i % 2) * 3;
      ctx.strokeStyle = i % 2 ? '#86a94e' : '#6f9440'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, ly + 1);
      ctx.quadraticCurveTo(bx + gsw * hgt, ly + 1 - hgt * 0.6, bx + gsw * hgt * 2.1, ly + 1 - hgt); ctx.stroke();
    }
    const mx = lx + lw - 6;
    ctx.fillStyle = '#f2e2c8'; ctx.beginPath(); ctx.ellipse(mx, ly + lh - 1, 3, 2.2, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(196,150,110,0.7)'; ctx.lineWidth = 0.7; ctx.beginPath();
    for (const rr of [-1.4, 0, 1.4]) { ctx.moveTo(mx, ly + lh - 1); ctx.lineTo(mx + rr, ly + lh - 3.2); }
    ctx.stroke();
    ctx.restore();
  };
  logAt(142, 1);      // rechtes Lagunen-Ufer
  logAt(36, 1.2);     // Alpen-Abschnitt, größeres Stück
  logAt(246, 1.1);    // Küste

  ctx.globalAlpha = 1;
}

function renderPostLayer(engine: GameEngine): void {
  const theme = engine.level.theme;
  const VW = engine.renderer.viewportW;
  const VH = engine.renderer.viewportH;
  // Final colour grade (per-world tint + vignette + tilt-shift) so the
  // parallax, tiles and sprites all sit under one cohesive atmosphere.
  engine.renderer.drawSceneGrade(theme, VW, VH);

  // Welt 19: erst Wasser-Glitzern über die Lagune (unter den Palmen), dann die
  // Vordergrund-Occluder — dunkle Palmwedel in den oberen Ecken (Tropen/Küste),
  // die leicht wiegen → „durch die Palmen schauen".
  if (theme === 'vacation') {
    drawVacationWaterGlitter(engine, VW);
    drawVacationShoreDeco(engine, VW);
    drawVacationDecoAccents(engine, VW, VH);
    drawVacationForeground(engine, VW, VH);
    drawVacationStageBanner(engine, VW);
  }

  // #2 · Boden-Angleichung ans Foto: der graue Dachboden bekommt einen sanften
  // Tageszeit-Ton (warm in der Dämmerung, kühl-blau bei Nacht, nichts am Tag),
  // damit der Übergang Foto → Spielboden nahtlos wirkt. Nur die Boden-Region
  // (unter der Bodenlinie) → die Figuren stehen darüber und bleiben unberührt.
  // 'soft-light' erhält die Ziegel-Textur und verschiebt nur den Farbton.
  if (theme === 'city') {
    const r = engine.renderer; const ctx = r.ctx;
    const span = Math.max(1, (engine.camera.worldWidth || engine.camera.width) - engine.camera.width);
    const prog = Math.max(0, Math.min(1, engine.camera.x / span));
    const ss = (a: number, b: number, v: number) => { const c = Math.max(0, Math.min(1, (v - a) / (b - a))); return c * c * (3 - 2 * c); };
    const dawnW = ss(0.26, 0.50, prog), nightW = ss(0.60, 0.86, prog);
    const duskW = dawnW * (1 - nightW);
    if (duskW > 0.02 || nightW > 0.02) {
      const gy = engine.camera.worldToScreenInto(engine.camera.x, r.currentGroundRow * TILE_SIZE, _s).y;
      const y0 = Math.max(0, gy - 2);
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      if (duskW > 0.02) { ctx.globalAlpha = Math.min(0.5, 0.36 * duskW); ctx.fillStyle = '#ff9a4c'; ctx.fillRect(0, y0, VW, VH - y0); }
      if (nightW > 0.02) { ctx.globalAlpha = Math.min(0.55, 0.42 * nightW); ctx.fillStyle = '#3a5aa0'; ctx.fillRect(0, y0, VW, VH - y0); }
      ctx.restore();
    }
  }

  // P12 · Boss-Arena: sobald die Monsterratte gesichtet ist, legt sich eine
  // dramatische Bühne über die Szene (roter Vignette-Rand + schwenkende
  // Scheinwerfer). Unter Regen/Vordergrund gezeichnet.
  if (theme === 'city' && cityBossActive(engine)) drawCityBossArena(engine, VW, VH);

  // Stadt: Blitz-Aufhellung (Screen-Space) — dezenter Schein über der ganzen
  // Szene. Bewusst schwach gehalten, damit die Skyline-Silhouette (Backlight im
  // Hintergrund) nicht überstrahlt wird; der Haupt-Effekt sitzt im Himmel.
  if (theme === 'city' && engine.renderer.cityFlash > 0.01) {
    const ctx = engine.renderer.ctx;
    ctx.save();
    ctx.globalAlpha = Math.min(0.22, engine.renderer.cityFlash * 0.22);
    ctx.fillStyle = '#e2ebff';
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
  }
  // Stadt: Nieselregen als Screen-Space-Overlay (über allem, unter HUD).
  if (theme === 'city') drawCityRain(engine, VW, VH);

  // P11 · Vordergrund-Occluder: dunkle, schnell scrollende Kabel am oberen Rand
  // → räumliche Tiefe („durch die Kabel hindurchschauen"), ohne das Spielfeld zu
  // verdecken.
  if (theme === 'city') drawCityForeground(engine, VW, VH);

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
