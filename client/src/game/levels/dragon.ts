import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const S = TileType.STONE;
const DP = TileType.DECORATION_PROP;

/**
 * Welt 16 „Drachenhöhle" — Boss-Level. Nutzt den Höhlen-Look (grün eingefärbt).
 * Auf dem Weg: Fossilien statt Fragezeichen-Blöcke (geben Superkraft/Bonbon),
 * Dracheneier, die bei Annäherung schlüpfen (kleine, aktive Baby-Drachen),
 * und gesprengte hohe Felsvorsprünge (Einweg-Plattformen) als oberer Weg.
 * Ganz am Ende ein hellgrüner Drachen-Boss (3 Treffer) — per Kopfsprung ODER
 * aktiver Superkraft besiegbar. „Etwas fordernder" abgestimmt.
 */
export function createDragonLevel(): LevelData {
  const width = 168;
  const height = 22;
  const ground = 13;

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addCeiling, addStairs, addWater, addOneWayRow } =
    bindHelpers({ tiles, width, height, groundRow: ground });

  // Höhlen-Decke durchgehend.
  addCeiling(0, width - 1);

  // Fossil-/Bonbon-Blöcke zentral sammeln (Q-Tile + Powerup-Zuordnung).
  const powerBlocks: Record<string, string[]> = { super: [], heart: [], fire: [] };
  const addFossil = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, TileType.QUESTION_BLOCK);
    powerBlocks[kind].push(`${col},${row}`);
  };

  const entities: EntitySpawn[] = [];
  const Egg = (col: number, row = ground - 1) => entities.push({ type: EntityType.DRAGON_EGG, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Baby = (col: number, row = ground - 2) => entities.push({ type: EntityType.BABY_DRAGON, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Bat = (col: number, row: number) => entities.push({ type: EntityType.BAT, x: col * TILE_SIZE, y: row * TILE_SIZE });

  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);

  // ====================================================================
  //  BEAT 1 — Höhlen-Eingang (0–26): Ankommen, erstes Fossil, erstes Ei.
  // ====================================================================
  fillGround(0, 27, ground);
  set(4, ground - 1, TileType.SIGN);
  addFossil('heart', 8, ground - 4);       // Bonbon → groß werden
  set(6, ground - 1, DP);
  addCoinRow(10, 4, ground - 3);
  Egg(16);                                  // erstes Ei (harmlos einführen)
  Bat(20, ground - 6);
  set(24, ground - 1, DP);

  // ====================================================================
  //  BEAT 2 — Gesprengte Vorsprünge (28–58): oberer Weg über eine Lücke.
  // ====================================================================
  addWater(28, 30);                         // kleine Lava-/Wasser-Lücke
  fillGround(31, 58, ground);
  // Hohe „gesprengte" Felsvorsprünge (Einweg) als oberer Kletterweg.
  addOneWayRow(30, 3, ground - 4);
  addOneWayRow(35, 3, ground - 6);
  addOneWayRow(41, 3, ground - 7);
  addCoinArc(35, 5, ground - 8, 2);         // Belohnung oben
  addFossil('super', 43, ground - 8);       // Superkraft-Fossil hoch oben (Doppelsprung)
  Egg(48);
  Baby(52);                                 // erster aktiver Baby-Drache
  set(56, ground - 1, DP);

  // ====================================================================
  //  BEAT 3 — Fels-Treppen & Fledermäuse (59–92): fordernder Mittelteil.
  // ====================================================================
  addWater(59, 61);
  fillGround(62, 92, ground);
  addStairs(64, 1, 3, ground, S);
  Bat(70, ground - 7);
  Bat(78, ground - 6);
  Egg(74);
  Egg(84);
  addFossil('heart', 80, ground - 4);
  addBricks(88, 3, ground - 5);
  addCoinRow(66, 4, ground - 4);

  // ====================================================================
  //  BEAT 4 — Anstieg zum Horst (93–120): Checkpoint, letzte Vorräte.
  // ====================================================================
  addWater(93, 95);
  fillGround(96, 121, ground);
  addOneWayRow(97, 4, ground - 5);
  addCoinArc(98, 5, ground - 8, 2);
  Baby(104);
  Egg(108);
  Baby(112);
  set(116, ground - 1, TileType.SIGN);      // Hinweis: Superkraft-Taste vor dem Boss
  // Checkpoint kurz vor der Arena.
  // (checkpoint-Feld unten gesetzt)

  // ====================================================================
  //  BEAT 5 — Drachen-Arena (122–167): Boss + Bonbon + Superkraft-Fossil.
  // ====================================================================
  fillGround(122, width - 1, ground);
  // Direkt vor der Arena ein Superkraft-Fossil (3 Ladungen für den Boss) + Bonbon.
  addFossil('super', 126, ground - 4);
  addFossil('heart', 130, ground - 4);
  addCoinRow(134, 6, ground - 5);
  // Der hellgrüne Drachen-Boss, mittig in der Arena vor der Flagge.
  entities.push({ type: EntityType.BOSS, x: 150 * TILE_SIZE, y: (ground - 3) * TILE_SIZE });

  // Boss-Tor: Barriere-Säule vor der Flagge; fällt, wenn der Boss besiegt ist.
  const gateCol = 160, gateTop = ground - 5, gateBot = ground - 1;
  for (let r = gateTop; r <= gateBot; r++) set(gateCol, r, TileType.GROUND);

  return {
    name: 'World 16: Drachenhöhle',
    theme: 'dragon',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 164 * TILE_SIZE, y: (ground - 9) * TILE_SIZE },
    checkpoint: { col: 118, row: ground },
    bossGate: { col: gateCol, rowTop: gateTop, rowBottom: gateBot },
    heartBlocks: powerBlocks.heart,
    fireBlocks: powerBlocks.fire,
    superBlocks: powerBlocks.super,
    signs: [
      {
        col: 4,
        row: ground - 1,
        lines: [
          'Drachenhöhle! Fossilien geben Kräfte.',
          'Vorsicht: aus Eiern schlüpfen Drachen!',
        ],
      },
      {
        col: 116,
        row: ground - 1,
        lines: [
          'Boss voraus! Superkraft-Taste bereithalten.',
          'Drache: 3× draufspringen ODER 3× Superkraft!',
        ],
      },
    ],
    specialCoins: [
      '36,' + (ground - 8),
      '82,' + (ground - 6),
      '138,' + (ground - 5),
    ],
  };
}
