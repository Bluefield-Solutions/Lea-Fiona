import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers, buildUndergroundRoom, clearHillHeadroom } from '../levelHelpers';
import { smoothGroundY } from '../terrain';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const SIGN = TileType.SIGN;
const FL = TileType.DECORATION_FLOWER;

/**
 * World 4 „Strand Paradies" — Neudesign im 8-Beat-Pacing-Modell (analog Welt 1/3).
 *
 * Leitidee: Sonnenstrand mit Meer-Lücken und Holzstegen. Die Krabbe ist der
 * Signature-Gegner; Möwe und der kräftige Chargin-Chuck werden je in einem
 * sicheren Lernraum mit Warnschild eingeführt. Pacing: Anspannung →
 * Entspannung → Belohnung. Wasser-Lücken ≤ 3 Tiles; hohe Plattformen
 * gestaffelt erreichbar.
 */
export function createBeachLevel(): LevelData {
  const width = 220;
  const height = 24;          // erhöht für unterirdischen Bonus-Raum
  const ground = 13;          // Hauptboden fest (nicht height-2)

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addWoodBridge, addWater, addOneWayRow } =
    bindHelpers({ tiles, width, height, groundRow: ground });

  const entities: EntitySpawn[] = [];
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);

  const powerBlocks: Record<string, string[]> = {
    super: [], heart: [], fire: [], magnet: [], cape: [], shield: [],
  };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  const G = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const K = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Cr = (col: number, row = ground - 2) => entities.push({ type: EntityType.CRAB, x: col * TILE_SIZE, y: row * TILE_SIZE });
  // Umwelt-Interaktion: Sprungfeder + Kiste (Y rastet unten auf die Geländekurve).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  // Möwen (Seagull) auf Wunsch komplett entfernt — keine fliegenden Vögel mehr.
  const Chuck = (col: number, row = ground - 2) => entities.push({ type: EntityType.CHARGIN_CHUCK, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Bz = (col: number, row: number) => entities.push({ type: EntityType.BANZAI_BILL, x: col * TILE_SIZE, y: row * TILE_SIZE });

  // BEAT 1 — Ankommen am Strand (0–26): Sand, erste Krabben.
  fillGround(0, 26, ground);
  addBlock('super', 5, ground - 4);
  set(6, ground - 1, SIGN);
  set(9, ground - 4, Q);
  addBlock('heart', 14, ground - 4);
  set(18, ground - 1, FL);
  addCoinRow(10, 4, ground - 6);
  Cr(12); G(24);

  // BEAT 2 — Erste Meer-Lücke (27–48): Steg über Wasser.
  fillGround(30, 48, ground);
  // Sprungfeder: drauf springen → Mega-Bounce zur Münz-Reihe hoch oben.
  set(40, ground - 1, TileType.NOTE_BLOCK);
  addCoinRow(39, 3, ground - 7);
  // Zweite Sprungfeder (späterer Abschnitt) mit Münz-Bogen als Belohnung.
  set(116, ground - 1, TileType.NOTE_BLOCK);
  addCoinArc(115, 3, ground - 6, 1);
  // Geheime Bonus-Kammer hoch oben: per Sprungfeder erreichbar,
  // Plattform + dichte Münz-Formation als Belohnung.
  set(149, ground - 1, TileType.NOTE_BLOCK);
  addOneWayRow(148, 4, ground - 6);
  addCoinRow(148, 4, ground - 7);
  addCoinRow(148, 4, ground - 8);
  addWater(27, 29);
  addWoodBridge(33, 4, ground - 3);
  addBlock('fire', 38, ground - 4);
  addCoinArc(33, 4, ground - 4, 3);
  Cr(43);
  // Umwelt-Interaktion im gegnerfreien Belohnungs-Abschnitt (Beat 3, offener Sand).
  Spr(50); Box(64);

  // BEAT 3 — Atempause & Belohnung (49–66): Sandbank, keine Gegner.
  fillGround(49, 66, ground);
  addOneWayRow(52, 4, ground - 3);
  addOneWayRow(58, 3, ground - 5);
  addBlock('magnet', 55, ground - 4);
  addCoinRow(52, 4, ground - 4);
  addCoinArc(58, 4, ground - 5, 3);
  // Power-Up-gegatete Bonus-Nische (Audit C2): ein überdachter Tunnel (Decke →
  // nicht überspringbar), dessen Eingang eine Feuer-Ranke sperrt. Die Feuerblume
  // aus Beat 2 (col 38) brennt sie weg → das Feuer-Power-Up bekommt eine echte
  // Aufgabe. Rein optional (Sackgasse mit Münzen), nie auf dem Flaggen-Pfad.
  addBricks(60, 4, ground - 3);            // Decke cols 60–63
  set(63, ground - 1, TileType.BRICK);     // rechte Wand
  set(63, ground - 2, TileType.BRICK);
  addCoinRow(61, 2, ground - 2);           // Belohnung im Tunnel
  addCoinRow(61, 2, ground - 1);
  entities.push({ type: EntityType.FIRE_BARRIER, x: 60 * TILE_SIZE, y: ground * TILE_SIZE, hTiles: 2 });

  // BEAT 4 — Klippen & Plattformen (67–92): Lücke + Aufstieg (Möwen entfernt).
  fillGround(70, 92, ground);
  addWater(67, 69);
  addBricks(76, 3, ground - 4);
  set(77, ground - 4, Q);
  addOneWayRow(84, 3, ground - 4);
  addBlock('super', 88, ground - 4);
  G(82);

  // BEAT 5 — Chargin-Chuck-Einführung (93–118): kräftiger Gegner.
  fillGround(96, 118, ground);
  addWater(93, 95);
  set(98, ground - 1, SIGN);
  addWoodBridge(102, 4, ground - 3);
  addBlock('cape', 110, ground - 4);
  addCoinArc(102, 4, ground - 4, 3);
  Chuck(106); Cr(114);

  // BEAT 6 — Kombination (119–150): Meer + Krabben + Chuck (Möwen entfernt).
  fillGround(122, 150, ground);
  addWater(119, 121);
  addBricks(127, 3, ground - 4);
  set(128, ground - 4, Q);
  addWater(135, 137);
  addBlock('shield', 142, ground - 4);
  addOneWayRow(145, 3, ground - 5);
  G(147);

  // BEAT 7 — Höhepunkt (151–190): mehrere Meer-Lücken, viele Gegner.
  fillGround(151, 190, ground);
  addWoodBridge(154, 3, ground - 3);
  addWater(160, 162);
  addBricks(168, 4, ground - 4);
  set(169, ground - 4, Q);
  set(171, ground - 4, Q);
  addWater(178, 180);
  addBlock('heart', 185, ground - 4);
  addCoinArc(154, 6, ground - 4, 4);
  Cr(165);

  // BEAT 8 — Cool-down & Finale (191–219): Strand-Anflug zur Flagge.
  fillGround(191, 219, ground);
  addCoinRow(193, 6, ground - 4);
  set(208, ground - 1, FL);
  G(196);


  // Thematische Boden-Deko (nicht-solide, theme-abhängig).
  set(11, ground - 1, TileType.DECORATION_PROP);
  set(22, ground - 1, TileType.DECORATION_PROP);
  set(33, ground - 1, TileType.DECORATION_PROP);
  set(44, ground - 1, TileType.DECORATION_PROP);
  set(57, ground - 1, TileType.DECORATION_PROP);
  set(70, ground - 1, TileType.DECORATION_PROP);
  set(81, ground - 1, TileType.DECORATION_PROP);
  set(92, ground - 1, TileType.DECORATION_PROP);
  set(103, ground - 1, TileType.DECORATION_PROP);
  set(114, ground - 1, TileType.DECORATION_PROP);
  set(125, ground - 1, TileType.DECORATION_PROP);
  set(136, ground - 1, TileType.DECORATION_PROP);
  set(147, ground - 1, TileType.DECORATION_PROP);
  set(158, ground - 1, TileType.DECORATION_PROP);
  set(173, ground - 1, TileType.DECORATION_PROP);
  set(187, ground - 1, TileType.DECORATION_PROP);
  set(198, ground - 1, TileType.DECORATION_PROP);
  set(210, ground - 1, TileType.DECORATION_PROP);

  // Welliges Profil: 6 Hügel stark variierender Höhe, lange Anstiege, alle
  // Meer-Lücken (27-29, 67-69, 93-95, 119-121, 135-137, 160-162, 178-180) gemieden.
  const terrainHills = [
    { startCol: 8, endCol: 22, peakTiles: 1.5, baseRow: ground, skew: 0.1 },    // sanfter Auftakt
    { startCol: 32, endCol: 64, peakTiles: 2.8, baseRow: ground, skew: 0.2 },   // langer Sandbank-Hügel
    { startCol: 72, endCol: 90, peakTiles: 1.9, baseRow: ground, skew: 0 },     // flacher Möwen-Hügel
    { startCol: 98, endCol: 117, peakTiles: 3.6, baseRow: ground, skew: 0.3 },  // höchster, langer Anstieg
    { startCol: 138, endCol: 158, peakTiles: 2.2, baseRow: ground, skew: 0.1 }, // mittlerer Hügel
    { startCol: 182, endCol: 205, peakTiles: 2.5, baseRow: ground, skew: 0.2 }, // Finale vor der Flagge
  ];
  // Boden-Oberkante in Hügel-Zonen zu reiner Erde (glatte Kurve liefert Gras).
  for (const h of terrainHills)
    for (let c = h.startCol; c <= h.endCol; c++) set(c, ground, TileType.GROUND);

  // Boden-Gegner auf Anstiegen auf die Hügelkurve heben (sonst stecken sie im
  // Hang). Nur anheben, nie absenken; fliegende/röhren-gebundene bleiben.
  const groundEnemies = new Set<EntityType>([EntityType.GOOMBA, EntityType.KOOPA, EntityType.SPIKE_BALL, EntityType.APE, EntityType.CRAB, EntityType.CHARGIN_CHUCK]);
  for (const e of entities) {
    if (e.type === EntityType.SPRING_STONE || e.type === EntityType.CRATE) {
      const sy = smoothGroundY(terrainHills, e.x + TILE_SIZE / 2);
      if (sy !== null) e.y = sy;
      continue;
    }
    if (!groundEnemies.has(e.type)) continue;
    const sy = smoothGroundY(terrainHills, e.x + TILE_SIZE / 2);
    if (sy === null) continue;
    const lifted = sy - 2 * TILE_SIZE;
    if (lifted < e.y) e.y = lifted;
  }

  // Boden-Deko, die unter einer Hügelkurve läge, entfernen (verschwände sonst).
  for (let c = 0; c < width; c++) {
    const t = tiles[ground - 1][c];
    if (t !== TileType.DECORATION_PROP && t !== TileType.DECORATION_FLOWER) continue;
    const sy = smoothGroundY(terrainHills, c * TILE_SIZE + TILE_SIZE / 2);
    if (sy !== null && sy < (ground - 0.25) * TILE_SIZE) set(c, ground - 1, TileType.EMPTY);
  }

  // Kopffreiheit über Anstiegen sichern (zentral, korrekte Groß-Figur-Höhe —
  // siehe clearHillHeadroom).
  clearHillHeadroom(tiles, terrainHills, width, height);

  // Unterirdischer Geheim-Raum (Mario-Stil): Pipe im Boden → Hohlraum mit Münzen.
  const warpPipes = buildUndergroundRoom({ set, addCoinRow, ground, entryCol: 130, roomL: 126 });

  return {
    name: 'Strand Paradies',
    theme: 'beach',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    warpPipes,
    terrainHills,
    movingPlatforms: [
      { centerCol: 68, centerRow: ground - 2, widthTiles: 3, amplitudeTiles: 3, path: 'horizontal', speed: 0.8 },
    ],
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 212 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 96, row: ground },
    signs: [
      {
        col: 6,
        row: ground - 1,
        lines: [
          'Strand Paradies!',
          'Spring über das Wasser.',
          'Krabben laufen seitwärts.',
        ],
      },
      {
        col: 98,
        row: ground - 1,
        lines: [
          'Achtung: Chargin-Chuck!',
          'Stürmt los — drauf springen,',
          'mehrfach treffen.',
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
      '58,' + (ground - 8),
      '102,' + (ground - 8),
      '169,' + (ground - 7),
    ],
  };
}
