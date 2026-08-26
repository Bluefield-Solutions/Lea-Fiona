import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const SIGN = TileType.SIGN;
const CASTLE_TOP = TileType.CASTLE_TOP;
const CASTLE_STONE = TileType.CASTLE_STONE;
const LAVA_TOP = TileType.LAVA_TOP;
const LAVA = TileType.LAVA;

/**
 * World 8 „Geister Schloss" — Neudesign im 8-Beat-Pacing-Modell.
 *
 * Leitidee: Düstere Schlosshallen mit Lava-Gräben. Der fliegende Geist ist der
 * Signature-Gegner; der mehrstufige Ritter bewacht zwei Hallen (zeigt das
 * Treffer-Aufblitzen). Geister und Ritter werden je mit Warnschild eingeführt.
 * Pacing: Anspannung → Entspannung → Belohnung. Lava-Gräben ≤ 3 Tiles.
 */
export function createSchlossLevel(): LevelData {
  const width = 220;
  const height = 15;
  const ground = height - 2; // 13

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addWoodBridge, addOneWayRow, addStairs } =
    bindHelpers({ tiles, width, height });

  const fillCastle = (a: number, b: number) => fillGround(a, b, ground, CASTLE_TOP, CASTLE_STONE);
  const addLava = (a: number, b: number) => {
    for (let c = a; c <= b; c++) { set(c, ground, LAVA_TOP); set(c, ground + 1, LAVA); }
  };

  const entities: EntitySpawn[] = [];
  // Umwelt-Interaktion: Sprungfeder + Kiste (fester Flachboden).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  Spr(54); Box(67);
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  // Sprungfeder: drauf springen → Mega-Bounce zur Münz-Reihe hoch oben.
  set(35, ground - 1, TileType.NOTE_BLOCK);
  addCoinRow(34, 3, ground - 7);
  // Zweite Sprungfeder (späterer Abschnitt) mit Münz-Bogen als Belohnung.
  set(118, ground - 1, TileType.NOTE_BLOCK);
  addCoinArc(117, 3, ground - 6, 1);
  // Geheime Bonus-Kammer hoch oben: per Sprungfeder erreichbar,
  // Plattform + dichte Münz-Formation als Belohnung.
  set(190, ground - 1, TileType.NOTE_BLOCK);
  addOneWayRow(189, 4, ground - 6);
  addCoinRow(189, 4, ground - 7);
  addCoinRow(189, 4, ground - 8);

  const powerBlocks: Record<string, string[]> = {
    super: [], heart: [], fire: [], magnet: [], cape: [], shield: [],
  };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  const G = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const K = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Kn = (col: number, row = ground - 2) => entities.push({ type: EntityType.KNIGHT, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Wz = (col: number, row = ground - 2) => entities.push({ type: EntityType.WIZARD, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Gh = (col: number, row: number) => entities.push({ type: EntityType.GHOST, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Bo = (col: number, row: number) => entities.push({ type: EntityType.BIG_BOO, x: col * TILE_SIZE, y: row * TILE_SIZE });

  // BEAT 1 — Eingangshalle (0–28): Stein, sanfter Start.
  fillCastle(0, 28);
  addBlock('super', 5, ground - 4);
  set(6, ground - 1, SIGN);
  set(9, ground - 4, Q);
  addBlock('heart', 14, ground - 4);
  addCoinRow(10, 4, ground - 6);
  G(12); K(22);

  // BEAT 2 — Erster Lava-Graben (29–52): Lava + Stein-Plattform.
  fillCastle(32, 52);
  addLava(29, 31);
  addOneWayRow(29, 3, ground - 3);
  addBricks(38, 3, ground - 5);
  addBlock('fire', 39, ground - 5);
  addCoinArc(29, 3, ground - 4, 3);
  K(46);

  // BEAT 3 — Atempause & Belohnung (53–68): sichere Halle, gegnerfrei.
  fillCastle(53, 68);
  addOneWayRow(56, 4, ground - 3);
  addOneWayRow(62, 3, ground - 5);
  addBlock('magnet', 59, ground - 4);
  addCoinRow(56, 4, ground - 4);
  addCoinArc(62, 4, ground - 5, 3);
  // Power-Up-gegatete Bonus-Nische (Audit C2): überdachter Feuer-Tunnel, Eingang
  // durch Feuer-Ranke gesperrt (Feuerblume aus BEAT 2, col 39). Optionale
  // Sackgasse mit Münzen → nie auf dem Flaggen-Pfad.
  addBricks(63, 4, ground - 3);            // Decke cols 63–66
  set(66, ground - 1, TileType.BRICK);     // rechte Wand
  set(66, ground - 2, TileType.BRICK);
  addCoinRow(64, 2, ground - 2);
  addCoinRow(64, 2, ground - 1);
  entities.push({ type: EntityType.FIRE_BARRIER, x: 63 * TILE_SIZE, y: ground * TILE_SIZE, hTiles: 2 });

  // BEAT 4 — Geister-Einführung (69–96): fliegende Geister + Warnschild.
  fillCastle(69, 96);
  set(71, ground - 1, SIGN);
  addBricks(84, 3, ground - 4);
  set(85, ground - 4, Q);
  addOneWayRow(89, 3, ground - 4);
  addBlock('super', 92, ground - 4);
  Gh(80, ground - 5); Gh(88, ground - 6); G(75);

  // BEAT 5 — Ritter-Halle (97–122): mehrstufiger Wächter + Warnschild.
  fillCastle(100, 122);
  addLava(97, 99);
  addOneWayRow(97, 3, ground - 3);
  set(101, ground - 1, SIGN);
  addBricks(108, 3, ground - 4);
  set(109, ground - 4, Q);
  addBlock('cape', 116, ground - 4);
  addCoinArc(104, 4, ground - 6, 3);
  Kn(112); K(106);

  // BEAT 6 — Kombination (123–154): Geister + Big-Boo + Lava + Zauberer.
  fillCastle(126, 136);
  fillCastle(140, 154);
  addLava(123, 125);
  addLava(137, 139);
  addOneWayRow(137, 3, ground - 3);
  addBricks(130, 3, ground - 4);
  set(131, ground - 4, Q);
  addBlock('shield', 144, ground - 4);
  addOneWayRow(147, 3, ground - 5);
  Gh(133, ground - 5); Bo(141, ground - 5); Wz(150);

  // BEAT 7 — Höhepunkt (155–192): große Lava-Gräben, Big-Boo, Ritter.
  fillCastle(158, 167);
  fillCastle(171, 179);
  fillCastle(183, 192);
  addLava(155, 157);
  addLava(168, 170);
  addLava(180, 182);
  addOneWayRow(168, 3, ground - 3);
  addOneWayRow(180, 3, ground - 3);
  addBricks(173, 3, ground - 4);
  set(174, ground - 4, Q);
  addBlock('heart', 186, ground - 5);
  addCoinArc(160, 6, ground - 5, 4);
  Kn(165); Bo(177, ground - 5); Gh(187, ground - 6);

  // BEAT 8 — Thronsaal & Finale (193–219): Anflug zur Flagge.
  fillCastle(193, 219);
  addCoinRow(195, 6, ground - 4);
  G(198);

  // P2b (v456) — Mittelspiel-Belohnung angehoben: Münz-Bögen als Risiko-
  // Belohnung über den Lava-Gräben + Trail in der Geister-Passage. Alle in
  // der Luft über Lava/Plattformen, keine Kollision mit Blöcken/Gegnern.
  addCoinRow(84, 3, ground - 6);      // Trail in Beat 4 (Luft)
  addCoinArc(123, 3, ground - 4, 2);  // über Lava 123–125
  addCoinArc(137, 3, ground - 4, 2);  // über Lava 137–139
  addCoinArc(155, 3, ground - 4, 2);  // über Lava 155–157
  addCoinArc(168, 3, ground - 4, 2);  // über Lava 168–170
  addCoinArc(180, 3, ground - 4, 2);  // über Lava 180–182


  // Thematische Boden-Deko (nicht-solide, theme-abhängig).
  set(11, ground - 1, TileType.DECORATION_PROP);
  set(22, ground - 1, TileType.DECORATION_PROP);
  set(33, ground - 1, TileType.DECORATION_PROP);
  set(44, ground - 1, TileType.DECORATION_PROP);
  set(55, ground - 1, TileType.DECORATION_PROP);
  set(66, ground - 1, TileType.DECORATION_PROP);
  set(77, ground - 1, TileType.DECORATION_PROP);
  set(88, ground - 1, TileType.DECORATION_PROP);
  set(103, ground - 1, TileType.DECORATION_PROP);
  set(114, ground - 1, TileType.DECORATION_PROP);
  set(126, ground - 1, TileType.DECORATION_PROP);
  set(140, ground - 1, TileType.DECORATION_PROP);
  set(151, ground - 1, TileType.DECORATION_PROP);
  set(162, ground - 1, TileType.DECORATION_PROP);
  set(177, ground - 1, TileType.DECORATION_PROP);
  set(188, ground - 1, TileType.DECORATION_PROP);
  set(199, ground - 1, TileType.DECORATION_PROP);
  set(210, ground - 1, TileType.DECORATION_PROP);

  return {
    name: 'Geister Schloss',
    theme: 'castle',
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
          'Geister Schloss!',
          'Lava-Gräben überspringen.',
          'Es wird gespenstisch.',
        ],
      },
      {
        col: 71,
        row: ground - 1,
        lines: [
          'Achtung: Geister!',
          'Sie schweben durch die Luft.',
          'Tauche darunter durch.',
        ],
      },
      {
        col: 101,
        row: ground - 1,
        lines: [
          'Achtung: Ritter!',
          'Gepanzert — mehrmals auf',
          'den Helm springen.',
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
