import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers, buildUndergroundRoom } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const S = TileType.STONE;

/**
 * World 2 „Dunkle Höhle" — Neudesign (Prototyp v2, Beat-Modell).
 *
 * Gleiche Pacing-Philosophie wie Welt 1 (Anspannung → Entspannung →
 * Belohnung in 8 Beats), aber eine Stufe fordernder: Höhlen-Atmosphäre mit
 * durchgehender Decke, Steintreppen und Spinnen, die von der Decke hängen.
 * Kern-Gegner sind Fledermaus + Spinne (höhlentypisch). Die Zeitlupen-Uhr
 * wird hier eingeführt — bewusst direkt VOR der Stachelkugel/Hornissen-
 * Passage, wo sie ein echtes Problem löst. Gegnerzahl gegenüber dem alten
 * Level entzerrt (~30 → ~23) und klar gestaffelt. Alle Sprung-/Lückenmaße
 * in den headless geprüften Grenzen.
 */
export function createCaveLevel(): LevelData {
  const width = 200;
  const height = 24;          // erhöht für unterirdischen Bonus-Raum
  const ground = 13;          // Hauptlevel-Boden bleibt fest (nicht height-2)

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addCeiling, addStairs, addWater, addPipe, addOneWayRow } =
    bindHelpers({ tiles, width, height, groundRow: ground });

  const powerBlocks: Record<string, string[]> = {
    heart: [], fire: [], magnet: [], shield: [], clock: [],
  };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  // Durchgehende Höhlendecke über das ganze Level.
  addCeiling(0, width - 1);

  // ====================================================================
  //  BEAT 1 — Höhlen-Eingang (cols 0–24): Ankunft, sanfte Fledermäuse.
  // ====================================================================
  fillGround(0, 25, ground);
  addBlock('heart', 6, ground - 4);
  set(9, ground - 4, Q);

  // ====================================================================
  //  BEAT 2 — Spinnen-Einführung (cols 25–48): neuer Gegner + erste Lücke.
  // ====================================================================
  addWater(26, 27);
  fillGround(28, 48, ground);
  addBlock('fire', 35, ground - 4);
  addBricks(42, 3, ground - 5);   // Plattform für Spezialmünze #1

  // ====================================================================
  //  BEAT 3 — Atempause (cols 49–64): ruhige Kammer mit Steintreppe.
  // ====================================================================
  fillGround(49, 64, ground);
  addStairs(52, 1, 4, ground, S);
  addBricks(58, 3, ground - 5);

  // ====================================================================
  //  BEAT 4 — Zeitlupen-Uhr (cols 65–88): neue Mechanik + ihr Praxistest.
  //  Uhr-Block VOR der Stachelkugel/Hornissen-Strecke.
  // ====================================================================
  addWater(65, 66);
  fillGround(67, 88, ground);
  addBlock('clock', 72, ground - 4);

  // ====================================================================
  //  BEAT 5 — Pipes & Checkpoint (cols 89–112): enge Röhren-Navigation.
  // ====================================================================
  addWater(89, 90);
  fillGround(91, 112, ground);
  addPipe(94, ground - 4);
  addPipe(104, ground - 4);
  addBlock('heart', 98, ground - 4);
  addBlock('shield', 101, ground - 4);
  addBlock('magnet', 108, ground - 4);
  addBricks(106, 3, ground - 5);  // Plattform für Spezialmünze #2

  // ====================================================================
  //  BEAT 6 — Spinnen-Decke (cols 113–140): Spider-Canopy + Bomb-Ombs.
  // ====================================================================
  fillGround(113, 140, ground);
  // ---- Feuer-Tor (C2): Grube unter einer Einweg-Brücke (cols 120–124). Oben
  // läuft man normal drüber; mit ↓+Sprung fällt man rein, wo eine brennbare
  // Ranke die Münz-Kammer sperrt. Nur ein Feuerball (Feuerblume direkt davor)
  // brennt sie weg; ohne Feuer springt man wieder hoch (kein Softlock).
  addBlock('fire', 117, ground - 4);
  set(117, ground - 1, TileType.SIGN);
  addOneWayRow(120, 5, ground);
  for (const c of [120, 121, 122, 123, 124]) { set(c, ground + 1, TileType.EMPTY); set(c, ground + 2, TileType.EMPTY); }

  // ====================================================================
  //  BEAT 7 — Höhepunkt (cols 141–172): Treppen, Lücke, dichtere Gegner.
  // ====================================================================
  fillGround(141, 172, ground);
  addBlock('heart', 147, ground - 4);
  addStairs(150, 1, 4, ground, S);
  addWater(160, 161);
  fillGround(162, 172, ground);
  addBricks(166, 3, ground - 6);  // hohe Plattform für Spezialmünze #3

  // ====================================================================
  //  BEAT 8 — Cool-down & Finale (cols 173–199): zum Ziel.
  // ====================================================================
  fillGround(173, 199, ground);
  addBlock('heart', 183, ground - 4);
  addWater(188, 189);
  fillGround(190, 199, ground);

  // -------------------------------------------------------------------
  //  Gegner — höhlentypisch (Fledermaus + Spinne als Kern), gestaffelt.
  // -------------------------------------------------------------------
  const entities: EntitySpawn[] = [];
  // Umwelt-Interaktion: Sprungfeder + Kiste (fester Flachboden).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  Spr(50); Box(63);
  const Ba = (col: number, row: number) => entities.push({ type: EntityType.BAT, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Sp = (col: number, row: number) => entities.push({ type: EntityType.SPIDER, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Pi = (col: number, row: number) => entities.push({ type: EntityType.PIRANHA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Bo = (col: number) => entities.push({ type: EntityType.BOMB_OMB, x: col * TILE_SIZE, y: (ground - 2) * TILE_SIZE });
  const SpB = (col: number) => entities.push({ type: EntityType.SPIKE_BALL, x: col * TILE_SIZE, y: (ground - 2) * TILE_SIZE });
  const Ho = (col: number, row: number) => entities.push({ type: EntityType.HORNET, x: col * TILE_SIZE, y: row * TILE_SIZE });

  // Level 2 = leicht, eine Stufe über Level 1: Fledermäuse als neuer Gegner,
  // zwei Piranhas in Röhren. Keine Spinnen, Stachelkugeln, Hornissen oder
  // Bomben — die kommen in späteren Welten.
  // Beat 1: sanfte Fledermäuse.
  Ba(14, ground - 6); Ba(20, ground - 6);
  // Beat 2: eine weitere Fledermaus.
  Ba(45, ground - 6);
  // Beat 3: Atempause — eine Fledermaus.
  Ba(61, ground - 6);
  // Beat 5: Piranhas in den Röhren (neuer Gegner, vorhersehbar).
  Pi(94, ground - 4); Pi(110, ground - 4); // 104->110: aus Checkpoint-Zone 100
  // Beat 6/8: weit gesetzte Fledermäuse.
  Ba(136, ground - 6); Ba(178, ground - 6);
  // Feuer-Ranke des Feuer-Tors (Beat 6, col 122): füllt die Grube und sperrt
  // die Münz-Kammer, bis ein Feuerball sie wegbrennt.
  entities.push({ type: EntityType.FIRE_BARRIER, x: 122 * TILE_SIZE, y: (ground + 3) * TILE_SIZE, hTiles: 2 });

  // -------------------------------------------------------------------
  //  Münzen — Sichtbarkeitsführung über Lücken + Belohnung auf Hochwegen.
  // -------------------------------------------------------------------
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  // Paket 2 · Doppelsprung-Belohnung (Welt 3): hoher Münz-Bogen am Eingang.
  // Enden mit einem Sprung erreichbar, Spitze (Boden-7) NUR mit Doppelsprung.
  addCoinArc(14, 5, ground - 3, 4);
  // Belohnung in der Feuer-Kammer (hinter der Ranke, cols 123–124).
  addCoinRow(123, 2, ground + 1);
  addCoinRow(123, 2, ground + 2);
  // Sprungfeder: drauf springen → Mega-Bounce zur Münz-Reihe hoch oben.
  set(46, ground - 1, TileType.NOTE_BLOCK);
  addCoinRow(45, 3, ground - 7);
  // Zweite Sprungfeder (späterer Abschnitt) mit Münz-Bogen als Belohnung.
  set(114, ground - 1, TileType.NOTE_BLOCK);
  addCoinArc(113, 3, ground - 6, 1);
  // Geheime Bonus-Kammer hoch oben: per Sprungfeder erreichbar,
  // Plattform + dichte Münz-Formation als Belohnung.
  set(124, ground - 1, TileType.NOTE_BLOCK);
  addOneWayRow(123, 4, ground - 6);
  addCoinRow(123, 4, ground - 7);
  addCoinRow(123, 4, ground - 8);
  addCoinRow(11, 4, ground - 3);
  addCoinArc(26, 3, ground - 2, 2);
  addCoinRow(58, 3, ground - 6);
  addCoinArc(65, 3, ground - 2, 2);
  addCoinRow(68, 3, ground - 3);
  addCoinArc(89, 3, ground - 2, 2);
  addCoinRow(114, 5, ground - 3);
  addCoinArc(160, 3, ground - 2, 2);
  addCoinRow(166, 3, ground - 7);
  addCoinArc(188, 3, ground - 2, 2);
  addCoinRow(192, 5, ground - 3);

  // Thematische Boden-Deko (nicht-solide, theme-abhängig).
  set(4, ground - 1, TileType.DECORATION_PROP);
  set(15, ground - 1, TileType.DECORATION_PROP);
  set(28, ground - 1, TileType.DECORATION_PROP);
  set(39, ground - 1, TileType.DECORATION_PROP);
  set(50, ground - 1, TileType.DECORATION_PROP);
  set(62, ground - 1, TileType.DECORATION_PROP);
  set(74, ground - 1, TileType.DECORATION_PROP);
  set(85, ground - 1, TileType.DECORATION_PROP);
  set(96, ground - 1, TileType.DECORATION_PROP);
  set(110, ground - 1, TileType.DECORATION_PROP);
  set(121, ground - 1, TileType.DECORATION_PROP);
  set(132, ground - 1, TileType.DECORATION_PROP);
  set(143, ground - 1, TileType.DECORATION_PROP);
  set(154, ground - 1, TileType.DECORATION_PROP);
  set(170, ground - 1, TileType.DECORATION_PROP);
  set(181, ground - 1, TileType.DECORATION_PROP);
  set(192, ground - 1, TileType.DECORATION_PROP);

  // Geheime Bonus-Kammer (Warp-Röhre) — Kammer überschreibt die Höhlendecke.
  const warpPipes = buildUndergroundRoom({ set, addCoinRow, ground, entryCol: 18, roomL: 14 });

  return {
    name: 'Dunkle Höhle',
    theme: 'cave',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    movingPlatforms: [
      { centerCol: 64, centerRow: ground - 2, widthTiles: 3, amplitudeTiles: 3, path: 'horizontal', speed: 0.8 },
    ],
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 196 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 100, row: ground },
    signs: [
      {
        col: 117,
        row: ground - 1,
        lines: [
          'Feuerblume + F. Auf der Brücke',
          '↓+Sprung: rein, Ranke wegbrennen!',
        ],
      },
    ],
    heartBlocks: powerBlocks.heart,
    fireBlocks: powerBlocks.fire,
    magnetBlocks: powerBlocks.magnet,
    shieldBlocks: powerBlocks.shield,
    clockBlocks: powerBlocks.clock,
    specialCoins: [
      '43,' + (ground - 6),   // Beat 2, auf Brick-Plattform
      '107,' + (ground - 6),  // Beat 5, auf Brick-Plattform
      '167,' + (ground - 7),  // Beat 7, hohe Plattform
    ],
    warpPipes,
    cameraZones: [
      { colStart: 13, colEnd: 28, rowStart: 15, rowEnd: 23, zoom: 1.18 },
    ],
  };
}
