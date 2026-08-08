import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const SIGN = TileType.SIGN;
const SEAWEED = TileType.SEAWEED;

/**
 * World 9 „Tiefsee" — Neudesign im 8-Beat-Pacing-Modell.
 *
 * Leitidee: Meeresboden mit Spalten und Seetang. Der frei schwimmende Fisch ist
 * der Signature-Gegner; Krabbe und Meeresschildkröte (Koopa) bevölkern den
 * Grund. Fisch-Schwarm und Schildkröten-Riff werden je mit Warnschild
 * eingeführt. Hinweis: Es gibt keine Schwimm-Physik — gelaufen und gesprungen
 * wird normal; die Wasser-Optik liefert das Theme. Spalten ≤ 3 Tiles.
 */
export function createUnterwasserLevel(): LevelData {
  const width = 220;
  const height = 15;
  const ground = height - 2; // 13

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addWoodBridge, addOneWayRow, addStairs } =
    bindHelpers({ tiles, width, height });

  const weed = (col: number) => set(col, ground - 1, SEAWEED);

  const entities: EntitySpawn[] = [];
  // Umwelt-Interaktion: Sprungfeder + Kiste (fester Flachboden).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  Spr(54); Box(67);
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  // Sprungfeder: drauf springen → Mega-Bounce zur Münz-Reihe hoch oben.
  set(41, ground - 1, TileType.NOTE_BLOCK);
  addCoinRow(40, 3, ground - 7);
  // Zweite Sprungfeder (späterer Abschnitt) mit Münz-Bogen als Belohnung.
  set(141, ground - 1, TileType.NOTE_BLOCK);
  addCoinArc(140, 3, ground - 6, 1);
  // Geheime Bonus-Kammer hoch oben: per Sprungfeder erreichbar,
  // Plattform + dichte Münz-Formation als Belohnung.
  set(160, ground - 1, TileType.NOTE_BLOCK);
  addOneWayRow(159, 4, ground - 6);
  addCoinRow(159, 4, ground - 7);
  addCoinRow(159, 4, ground - 8);

  const powerBlocks: Record<string, string[]> = {
    super: [], heart: [], fire: [], magnet: [], cape: [], shield: [],
  };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  const K = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Cr = (col: number, row = ground - 2) => entities.push({ type: EntityType.CRAB, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Fi = (col: number, row: number) => entities.push({ type: EntityType.FISH, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Je = (col: number, row: number) => entities.push({ type: EntityType.JELLYFISH, x: col * TILE_SIZE, y: row * TILE_SIZE });

  // BEAT 1 — Ankommen am Meeresboden (0–28): Sand, erste Krabben.
  fillGround(0, 28, ground);
  addBlock('super', 5, ground - 4);
  set(6, ground - 1, SIGN);
  set(9, ground - 4, Q);
  addBlock('heart', 14, ground - 4);
  weed(18); weed(25);
  addCoinRow(10, 4, ground - 6);
  Cr(12); Cr(22);

  // BEAT 2 — Erste Meeresspalte (29–52): Abgrund + Riff-Plattform.
  fillGround(32, 52, ground);
  addOneWayRow(29, 3, ground - 3);
  addBricks(38, 3, ground - 5);
  addBlock('fire', 39, ground - 5);
  addCoinArc(29, 3, ground - 4, 3);
  Fi(43, ground - 6); Cr(48);

  // BEAT 3 — Atempause & Belohnung (53–68): Riff-Plateau, gegnerfrei.
  fillGround(53, 68, ground);
  addOneWayRow(56, 4, ground - 3);
  addOneWayRow(62, 3, ground - 5);
  addBlock('magnet', 59, ground - 4);
  weed(54); weed(67);
  addCoinRow(56, 4, ground - 4);
  addCoinArc(62, 4, ground - 5, 3);

  // BEAT 4 — Fisch-Einführung (69–96): Schwimmer-Schwarm + Warnschild.
  fillGround(69, 96, ground);
  set(71, ground - 1, SIGN);
  addBricks(84, 3, ground - 4);
  set(85, ground - 4, Q);
  addOneWayRow(89, 3, ground - 4);
  addBlock('super', 92, ground - 4);
  weed(78);
  Fi(78, ground - 7); Cr(74); // Balance v389: Fi(86) entfernt — Dichte gesenkt

  // BEAT 5 — Schildkröten-Riff (97–122): Meeresschildkröten + Warnschild.
  fillGround(100, 122, ground);
  addOneWayRow(97, 3, ground - 3);
  set(101, ground - 1, SIGN);
  addBricks(108, 3, ground - 4);
  set(109, ground - 4, Q);
  addBlock('cape', 116, ground - 4);
  weed(104); weed(120);
  addCoinArc(104, 4, ground - 6, 3);
  addCoinRow(97, 3, ground - 4); // Münz-Trail über der Riff-Plattform (P2)
  K(106); K(114);

  // BEAT 6 — Kombination (123–154): Fisch + Krabbe + Schildkröte + Spalten.
  fillGround(126, 136, ground);
  fillGround(140, 154, ground);
  addOneWayRow(137, 3, ground - 3);
  addBricks(130, 3, ground - 4);
  set(131, ground - 4, Q);
  addBlock('shield', 144, ground - 4);
  addOneWayRow(147, 3, ground - 5);
  weed(128); weed(152);
  Je(133, ground - 6); Cr(141); K(149); // Balance v389: Fi(133)→Qualle (4. Typ), Fi(145) entfernt

  // BEAT 7 — Höhepunkt (155–192): mehrere Spalten, Fisch-Schwarm.
  fillGround(158, 167, ground);
  fillGround(171, 179, ground);
  fillGround(183, 192, ground);
  addOneWayRow(155, 3, ground - 3);
  addOneWayRow(168, 3, ground - 3);
  addOneWayRow(180, 3, ground - 3);
  addBricks(173, 3, ground - 4);
  set(174, ground - 4, Q);
  addBlock('heart', 186, ground - 5);
  addCoinArc(160, 6, ground - 5, 4);
  addCoinRow(180, 3, ground - 4); // Münz-Trail über der Höhepunkt-Plattform (P2)
  Fi(162, ground - 7); K(176); Cr(194); // Balance v389: Fi(187) entfernt — Dichte gesenkt

  // BEAT 8 — Cool-down & Finale (193–219): Anflug zur Flagge.
  fillGround(193, 219, ground);
  weed(200); weed(206);
  addCoinRow(195, 6, ground - 4);
  // Balance v389: Krabbe (198) im Cool-down entfernt — ruhigerer Anflug zur Flagge

  // P2b (v456) — Mittelspiel-Belohnung angehoben: Münz-Bögen als Belohnung
  // über den Meeres-Spalten + zwei Trails in Fisch-/Riff-Passagen. Alle in der
  // Luft über Spalten/Plattformen, keine Kollision mit Blöcken/Gegnern.
  addCoinRow(84, 3, ground - 6);      // Trail in Beat 4 (Luft)
  addCoinRow(115, 3, ground - 6);     // Trail über dem Riff (Beat 5)
  addCoinArc(123, 3, ground - 4, 2);  // über Spalte 123–125
  addCoinArc(137, 3, ground - 4, 2);  // über Spalte 137–139
  addCoinArc(168, 3, ground - 4, 2);  // über Spalte 168–170


  // Thematische Boden-Deko (nicht-solide, theme-abhängig).
  set(11, ground - 1, TileType.DECORATION_PROP);
  set(22, ground - 1, TileType.DECORATION_PROP);
  set(33, ground - 1, TileType.DECORATION_PROP);
  set(44, ground - 1, TileType.DECORATION_PROP);
  set(56, ground - 1, TileType.DECORATION_PROP);
  set(69, ground - 1, TileType.DECORATION_PROP);
  set(80, ground - 1, TileType.DECORATION_PROP);
  set(94, ground - 1, TileType.DECORATION_PROP);
  set(106, ground - 1, TileType.DECORATION_PROP);
  set(118, ground - 1, TileType.DECORATION_PROP);
  set(134, ground - 1, TileType.DECORATION_PROP);
  set(146, ground - 1, TileType.DECORATION_PROP);
  set(158, ground - 1, TileType.DECORATION_PROP);
  set(171, ground - 1, TileType.DECORATION_PROP);
  set(183, ground - 1, TileType.DECORATION_PROP);
  set(194, ground - 1, TileType.DECORATION_PROP);
  set(208, ground - 1, TileType.DECORATION_PROP);

  return {
    name: 'World 9: Tiefsee',
    theme: 'underwater',
    width,
    height,
    tiles,
    entities,
    movingPlatforms: [
      { centerCol: 96, centerRow: ground - 2, widthTiles: 3, amplitudeTiles: 3, path: 'horizontal', speed: 0.8 },
    ],
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 212 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 100, row: ground },
    signs: [
      {
        col: 6,
        row: ground - 1,
        lines: [
          'Tiefsee!',
          'Spring über die Spalten',
          'im Meeresboden.',
        ],
      },
      {
        col: 71,
        row: ground - 1,
        lines: [
          'Achtung: Fische!',
          'Sie schwimmen kreuz und quer.',
          'Spring auf ihren Rücken.',
        ],
      },
      {
        col: 101,
        row: ground - 1,
        lines: [
          'Meeresschildkröten!',
          'Wie Koopas — drauf springen,',
          'der Panzer rutscht.',
        ],
      },
    ],
    heartBlocks: powerBlocks.heart,
    fireBlocks: powerBlocks.fire,
    magnetBlocks: powerBlocks.magnet,
    capeBlocks: powerBlocks.cape,
    shieldBlocks: powerBlocks.shield,
    superBlocks: powerBlocks.super,
    specialCoins: [
      '62,' + (ground - 8),
      '104,' + (ground - 9),
      '174,' + (ground - 7),
    ],
  };
}
