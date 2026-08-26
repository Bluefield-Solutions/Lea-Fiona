import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const SIGN = TileType.SIGN;
const SPACE_TOP = TileType.SPACE_TOP;
const SPACE_METAL = TileType.SPACE_METAL;

/**
 * World 10 „Sterne Mission" — Neudesign im 8-Beat-Pacing-Modell (großes Finale).
 *
 * Leitidee: Raumstation-Plattformen über dem All. Der Alien-Geist (space-Variante)
 * ist der Signature-Gegner; Weltraum-Minen (Stachelbälle) und Raketen (Banzai-Bill)
 * steigern die Intensität. Als letzte Welt am dichtesten und fordernd. Aliens und
 * Minen werden je mit Warnschild eingeführt. Abgründe ins All ≤ 3 Tiles.
 */
export function createWeltraumLevel(): LevelData {
  const width = 240;
  const height = 15;
  const ground = height - 2; // 13

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addWoodBridge, addOneWayRow, addStairs } =
    bindHelpers({ tiles, width, height });

  const fillSpace = (a: number, b: number) => fillGround(a, b, ground, SPACE_TOP, SPACE_METAL);

  const entities: EntitySpawn[] = [];
  // Umwelt-Interaktion: Sprungfeder + Kiste (fester Flachboden).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  Spr(64); Box(81);
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  // Sprungfeder: drauf springen → Mega-Bounce zur Münz-Reihe hoch oben.
  set(37, ground - 1, TileType.NOTE_BLOCK);
  addCoinRow(36, 3, ground - 7);
  // Zweite Sprungfeder (späterer Abschnitt) mit Münz-Bogen als Belohnung.
  set(121, ground - 1, TileType.NOTE_BLOCK);
  addCoinArc(120, 3, ground - 6, 1);
  // Geheime Bonus-Kammer hoch oben: per Sprungfeder erreichbar,
  // Plattform + dichte Münz-Formation als Belohnung.
  set(144, ground - 1, TileType.NOTE_BLOCK);
  addOneWayRow(143, 4, ground - 6);
  addCoinRow(143, 4, ground - 7);
  addCoinRow(143, 4, ground - 8);

  const powerBlocks: Record<string, string[]> = {
    super: [], heart: [], fire: [], magnet: [], cape: [], shield: [],
  };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  const G = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const K = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Sb = (col: number, row = ground - 2) => entities.push({ type: EntityType.SPIKE_BALL, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Bz = (col: number, row: number) => entities.push({ type: EntityType.BANZAI_BILL, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Gh = (col: number, row: number) => entities.push({ type: EntityType.GHOST, x: col * TILE_SIZE, y: row * TILE_SIZE });

  // BEAT 1 — Start an der Raumstation (0–30): Metall-Boden, sanfter Start.
  fillSpace(0, 30);
  addBlock('super', 5, ground - 4);
  set(6, ground - 1, SIGN);
  set(9, ground - 4, Q);
  addBlock('heart', 14, ground - 4);
  addCoinRow(10, 4, ground - 6);
  G(12); K(22);

  // BEAT 2 — Erste Weltraum-Lücke (31–62): Abgrund ins All + Plattform.
  fillSpace(34, 62);
  addOneWayRow(31, 3, ground - 3);
  addBricks(40, 3, ground - 5);
  addBlock('fire', 41, ground - 5);
  addCoinArc(31, 3, ground - 4, 3);
  K(50);

  // BEAT 3 — Atempause & Belohnung (63–82): sichere Plattform, gegnerfrei.
  fillSpace(63, 82);
  addOneWayRow(66, 4, ground - 3);
  addOneWayRow(72, 3, ground - 5);
  addBlock('magnet', 69, ground - 4);
  addCoinRow(66, 4, ground - 4);
  addCoinArc(72, 4, ground - 5, 3);
  // Power-Up-gegatete Bonus-Nische (Audit C2): überdachter Feuer-Tunnel, Eingang
  // durch Feuer-Ranke gesperrt (Feuerblume aus BEAT 2, col 41). Optionale
  // Sackgasse mit Münzen → nie auf dem Flaggen-Pfad.
  addBricks(76, 4, ground - 3);            // Decke cols 76–79
  set(79, ground - 1, TileType.BRICK);     // rechte Wand
  set(79, ground - 2, TileType.BRICK);
  addCoinRow(77, 2, ground - 2);
  addCoinRow(77, 2, ground - 1);
  entities.push({ type: EntityType.FIRE_BARRIER, x: 76 * TILE_SIZE, y: ground * TILE_SIZE, hTiles: 2 });

  // BEAT 4 — Alien-Einführung (83–112): schwebende Aliens + Warnschild.
  fillSpace(83, 112);
  set(85, ground - 1, SIGN);
  addBricks(98, 3, ground - 4);
  set(99, ground - 4, Q);
  addOneWayRow(103, 3, ground - 4);
  addBlock('super', 106, ground - 4);
  addCoinRow(103, 3, ground - 5); // Münz-Trail über der Alien-Plattform (P2)
  Gh(94, ground - 5); Gh(102, ground - 6); G(90);

  // BEAT 5 — Weltraum-Minen (113–148): rollende Stachelbälle + Warnschild.
  fillSpace(116, 148);
  addOneWayRow(113, 3, ground - 3);
  set(117, ground - 1, SIGN);
  addBricks(124, 3, ground - 4);
  set(125, ground - 4, Q);
  addBlock('cape', 134, ground - 4);
  addCoinArc(120, 4, ground - 6, 3);
  Sb(122); Sb(140);

  // BEAT 6 — Kombination (149–182): Aliens + Minen + Raketen + Lücken.
  fillSpace(152, 162);
  fillSpace(166, 182);
  addOneWayRow(149, 3, ground - 3);
  addOneWayRow(163, 3, ground - 3);
  addBricks(156, 3, ground - 4);
  set(157, ground - 4, Q);
  addBlock('shield', 172, ground - 4);
  addOneWayRow(175, 3, ground - 5);
  addCoinRow(175, 3, ground - 6); // Münz-Trail über der Kombi-Plattform (P2)
  Gh(158, ground - 5); Bz(168, ground - 6); Sb(178);

  // BEAT 7 — Höhepunkt (183–222): mehrere Lücken, Raketen, Aliens.
  fillSpace(186, 195);
  fillSpace(199, 210);
  fillSpace(214, 222);
  addOneWayRow(183, 3, ground - 3);
  addOneWayRow(196, 3, ground - 3);
  addOneWayRow(211, 3, ground - 3);
  addBricks(202, 3, ground - 4);
  set(203, ground - 4, Q);
  addBlock('heart', 216, ground - 5);
  addCoinArc(188, 6, ground - 5, 4);
  Bz(190, ground - 7); Sb(205); Gh(212, ground - 6); Sb(220); // Geist entzerrt

  // BEAT 8 — Finale & Ziel (223–239): Anflug zur Flagge.
  fillSpace(223, 239);
  addCoinRow(225, 6, ground - 4);
  G(216);  // aus Zielzone verschoben + von Spike-Ball entzerrt

  // P2b (v456) — Mittelspiel-Belohnung angehoben: Münz-Bögen als Belohnung
  // über den Weltraum-Lücken + ein Trail in der Alien-Passage. Alle in der Luft
  // über Lücken/Plattformen, keine Kollision mit Blöcken/Gegnern.
  addCoinRow(90, 3, ground - 6);      // Trail in Beat 4 (Luft)
  addCoinArc(149, 3, ground - 4, 2);  // über Lücke 149–151
  addCoinArc(163, 3, ground - 4, 2);  // über Lücke 163–165
  addCoinArc(196, 3, ground - 4, 2);  // über Lücke 196–198
  addCoinArc(211, 3, ground - 4, 2);  // über Lücke 211–213


  // Thematische Boden-Deko (nicht-solide, theme-abhängig).
  set(11, ground - 1, TileType.DECORATION_PROP);
  set(22, ground - 1, TileType.DECORATION_PROP);
  set(34, ground - 1, TileType.DECORATION_PROP);
  set(45, ground - 1, TileType.DECORATION_PROP);
  set(56, ground - 1, TileType.DECORATION_PROP);
  set(67, ground - 1, TileType.DECORATION_PROP);
  set(78, ground - 1, TileType.DECORATION_PROP);
  set(89, ground - 1, TileType.DECORATION_PROP);
  set(102, ground - 1, TileType.DECORATION_PROP);
  set(119, ground - 1, TileType.DECORATION_PROP);
  set(130, ground - 1, TileType.DECORATION_PROP);
  set(141, ground - 1, TileType.DECORATION_PROP);
  set(152, ground - 1, TileType.DECORATION_PROP);
  set(166, ground - 1, TileType.DECORATION_PROP);
  set(177, ground - 1, TileType.DECORATION_PROP);
  set(188, ground - 1, TileType.DECORATION_PROP);
  set(199, ground - 1, TileType.DECORATION_PROP);
  set(210, ground - 1, TileType.DECORATION_PROP);
  set(221, ground - 1, TileType.DECORATION_PROP);
  set(232, ground - 1, TileType.DECORATION_PROP);

  return {
    name: 'Sterne Mission',
    theme: 'space',
    width,
    height,
    tiles,
    entities,
    movingPlatforms: [
      { centerCol: 112, centerRow: ground - 2, widthTiles: 3, amplitudeTiles: 3, path: 'horizontal', speed: 0.8 },
    ],
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 233 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 116, row: ground },
    signs: [
      {
        col: 6,
        row: ground - 1,
        lines: [
          'Sterne Mission!',
          'Die letzte Welt — spring',
          'über die Abgründe ins All.',
        ],
      },
      {
        col: 85,
        row: ground - 1,
        lines: [
          'Achtung: Aliens!',
          'Sie schweben heran.',
          'Drauf springen oder ducken.',
        ],
      },
      {
        col: 117,
        row: ground - 1,
        lines: [
          'Weltraum-Minen!',
          'Stachelbälle rollen — nicht',
          'berühren, ausweichen!',
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
      '72,' + (ground - 8),
      '120,' + (ground - 9),
      '203,' + (ground - 7),
    ],
  };
}
