import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers, buildUndergroundRoom, clearHillHeadroom } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';
import { smoothGroundY } from '../terrain';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const SIGN = TileType.SIGN;

/**
 * World 3 „Wolken Welt" — Neudesign im 8-Beat-Pacing-Modell (analog Welt 1).
 *
 * Leitidee: Die Himmelswelt lebt von Vertikalität, schwebenden Plattformen
 * und Abgründen statt durchgehendem Boden. Der Banzai-Bill ist der
 * Signature-Gegner und wird — wie jede neue Hürde — zuerst in einem sicheren
 * Lernraum mit Warnschild eingeführt. Pacing: Anspannung → Entspannung →
 * Belohnung. Sprungweiten ≤ 3 Tiles; höhere Plattformen sind stets gestaffelt
 * (über Zwischenstufen) erreichbar.
 */
export function createSkyLevel(): LevelData {
  const width = 200;
  const height = 24;          // erhöht für unterirdischen Bonus-Raum
  const ground = 13;          // Hauptboden fest (nicht height-2)

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addWoodBridge, addOneWayRow } =
    bindHelpers({ tiles, width, height, groundRow: ground });

  const entities: EntitySpawn[] = [];
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  // Sprungfeder: drauf springen → Mega-Bounce zur Münz-Reihe hoch oben.
  set(39, ground - 1, TileType.NOTE_BLOCK);
  addCoinRow(38, 3, ground - 7);
  // Zweite Sprungfeder (späterer Abschnitt) mit Münz-Bogen als Belohnung.
  set(134, ground - 1, TileType.NOTE_BLOCK);
  addCoinArc(133, 3, ground - 6, 1);
  // Geheime Bonus-Kammer hoch oben: per Sprungfeder erreichbar,
  // Plattform + dichte Münz-Formation als Belohnung.
  set(180, ground - 1, TileType.NOTE_BLOCK);
  addOneWayRow(179, 4, ground - 6);
  addCoinRow(179, 4, ground - 7);
  addCoinRow(179, 4, ground - 8);

  // Power-up-/Herz-Blöcke zentral sammeln (garantiert je ein Q-Tile).
  const powerBlocks: Record<string, string[]> = {
    super: [], heart: [], fire: [], magnet: [], cape: [], shield: [],
  };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  // Gegner-Kürzel.
  const G = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const K = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Ba = (col: number, row: number) => entities.push({ type: EntityType.BAT, x: col * TILE_SIZE, y: row * TILE_SIZE });
  // Umwelt-Interaktion: Sprungfeder + Kiste (Y rastet unten auf die Geländekurve).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  Spr(48); Box(61);   // im gegnerfreien Belohnungs-Abschnitt (Beat 3)
  // Möwen (Seagull) auf Wunsch entfernt — keine Vögel mehr in dieser Welt.
  const Bz = (col: number, row: number) => entities.push({ type: EntityType.BANZAI_BILL, x: col * TILE_SIZE, y: row * TILE_SIZE });
  // Wolken-Schafe — weiche Hüpfer auf dem Wolkenboden (Anfang & Hügel).
  const Sh = (col: number, row = ground - 2) => entities.push({ type: EntityType.SHEEP, x: col * TILE_SIZE, y: row * TILE_SIZE });
  Sh(52); Sh(150); Sh(185);

  // ====================================================================
  //  BEAT 1 — Ankommen (cols 0–24): Wolkenboden, erste Münzen, sanft.
  // ====================================================================
  fillGround(0, 24, ground);
  addBlock('super', 5, ground - 4);
  set(6, ground - 1, SIGN);
  set(9, ground - 4, Q);
  addBlock('heart', 14, ground - 4);
  addCoinRow(10, 4, ground - 6);
  G(18);

  // ====================================================================
  //  BEAT 2 — Erste Wolkenlücke (cols 25–46): Springen über Abgründe.
  // ====================================================================
  // Lücke 25–27 (3 Tiles)
  fillGround(28, 46, ground);
  addWoodBridge(31, 4, ground - 3);
  addBlock('fire', 36, ground - 4);
  addCoinArc(31, 4, ground - 4, 3);
  K(41);

  // ====================================================================
  //  BEAT 3 — Atempause & Belohnung (cols 47–62): Münz-Wolke, keine Gegner.
  // ====================================================================
  fillGround(47, 62, ground);
  addOneWayRow(50, 4, ground - 3);
  addOneWayRow(56, 3, ground - 5);
  addBlock('magnet', 53, ground - 4);
  addCoinRow(50, 4, ground - 4);
  addCoinArc(55, 4, ground - 5, 3);

  // ====================================================================
  //  BEAT 4 — Banzai-Bill-Einführung (cols 63–88): neuer Gegner + Warnung.
  // ====================================================================
  // Lücke 63–64 (2 Tiles)
  fillGround(65, 88, ground);
  set(67, ground - 1, SIGN);
  addBricks(72, 3, ground - 4);
  set(73, ground - 4, Q);
  addOneWayRow(80, 3, ground - 4);
  addBlock('super', 85, ground - 4);
  G(78);

  // ====================================================================
  //  BEAT 5 — Höhe & Fledermäuse (cols 89–112): Aufstieg (Möwen entfernt).
  // ====================================================================
  fillGround(89, 112, ground);
  fillGround(92, 94, ground - 2); // Stufe 1
  fillGround(95, 97, ground - 4); // Stufe 2 (von Stufe 1 erreichbar)
  addOneWayRow(101, 3, ground - 5);
  addOneWayRow(106, 3, ground - 4);
  addBlock('cape', 109, ground - 4);
  addBlock('shield', 122, ground - 4); // Puffer vor der Lücke 130-132 (Abstand zu PU@109 war 21)
  addCoinArc(101, 3, ground - 6, 3);
  Ba(103, ground - 7); // Fledermaus (kein Vogel) bleibt

  // ====================================================================
  //  BEAT 6 — Kombination (cols 113–144): Abgründe + Banzai + Plattformen.
  // ====================================================================
  // Lücke 113–115 (3 Tiles)
  fillGround(116, 129, ground);
  addWoodBridge(119, 4, ground - 3);
  addBricks(124, 3, ground - 4);
  set(125, ground - 4, Q);
  // Lücke 130–132 (3 Tiles)
  fillGround(133, 144, ground);
  addBlock('shield', 137, ground - 4);
  addOneWayRow(140, 3, ground - 5);
  K(127);
  G(138);

  // ====================================================================
  //  BEAT 7 — Höhepunkt (cols 145–180): schmale Plattformen, mehr Gegner.
  // ====================================================================
  fillGround(145, 159, ground);
  addOneWayRow(148, 2, ground - 3);
  addOneWayRow(152, 2, ground - 5);
  addOneWayRow(156, 2, ground - 4);
  // Lücke 160–162 (3 Tiles)
  fillGround(163, 180, ground);
  addBricks(168, 4, ground - 4);
  set(169, ground - 4, Q);
  set(171, ground - 4, Q);
  addBlock('heart', 175, ground - 4);
  addCoinArc(148, 8, ground - 4, 4);
  Ba(157, ground - 6);
  K(172);

  // ====================================================================
  //  BEAT 8 — Cool-down & Finale (cols 181–199): Anflug zur Flagge.
  // ====================================================================
  fillGround(181, 199, ground);
  addCoinRow(183, 6, ground - 4);
  G(182);  // aus Zielzone (Flagge 192) verschoben

  // Thematische Boden-Deko (nicht-solide, theme-abhängig).
  set(11, ground - 1, TileType.DECORATION_PROP);
  set(22, ground - 1, TileType.DECORATION_PROP);
  set(33, ground - 1, TileType.DECORATION_PROP);
  set(44, ground - 1, TileType.DECORATION_PROP);
  set(55, ground - 1, TileType.DECORATION_PROP);
  set(69, ground - 1, TileType.DECORATION_PROP);
  set(80, ground - 1, TileType.DECORATION_PROP);
  set(91, ground - 1, TileType.DECORATION_PROP);
  set(102, ground - 1, TileType.DECORATION_PROP);
  set(116, ground - 1, TileType.DECORATION_PROP);
  set(128, ground - 1, TileType.DECORATION_PROP);
  set(139, ground - 1, TileType.DECORATION_PROP);
  set(150, ground - 1, TileType.DECORATION_PROP);
  set(163, ground - 1, TileType.DECORATION_PROP);
  set(177, ground - 1, TileType.DECORATION_PROP);
  set(188, ground - 1, TileType.DECORATION_PROP);

  // ── Wolken-Hügel: sanfte Erhebungen, weiß-fluffig gerendert (renderTerrainHills).
  // Platziert auf durchgehendem Boden mit ≥2 Kacheln Puffer zu Lücken (25-27,
  // 63-64, 113-115, 130-132, 160-162), Sprungfedern (39, 134, 180), Plattformen
  // (50, 56, 80, 101, 106, 140, 179, MovingPlatform 62) und Treppen (92-97).
  const terrainHills = [
    { startCol: 16,  endCol: 23,  peakTiles: 1.4, baseRow: ground, skew: 0 },   // Segment 0-24, Puffer vor Lücke 25
    { startCol: 65,  endCol: 70,  peakTiles: 1.6, baseRow: ground, skew: 0 },   // Segment 65-88, vor Bricks 72
    { startCol: 117, endCol: 122, peakTiles: 1.6, baseRow: ground, skew: 0 },   // Segment 116-129, vor Bricks 124
    { startCol: 147, endCol: 158, peakTiles: 2.2, baseRow: ground, skew: 0 },   // Segment 145-159, frei
    { startCol: 165, endCol: 176, peakTiles: 2.4, baseRow: ground, skew: 0 },   // Segment 163-180, vor Sprungfeder 180
    { startCol: 182, endCol: 189, peakTiles: 1.6, baseRow: ground, skew: 0 },   // Segment 181-199, vor Flagge 192
  ];
  // 1) Boden-Oberkante in Hügel-Zonen zu reiner Erde (Kurve liefert Oberfläche).
  for (const h of terrainHills)
    for (let c = h.startCol; c <= h.endCol; c++) set(c, ground, TileType.GROUND);
  // 2) Boden-Gegner auf die Hügelkurve heben (fliegende bleiben).
  const hillGroundEnemies = new Set<EntityType>([EntityType.GOOMBA, EntityType.KOOPA, EntityType.SHEEP]);
  for (const e of entities) {
    if (e.type === EntityType.SPRING_STONE || e.type === EntityType.CRATE) {
      const sy = smoothGroundY(terrainHills, e.x + TILE_SIZE / 2);
      if (sy !== null) e.y = sy;
      continue;
    }
    if (!hillGroundEnemies.has(e.type)) continue;
    const sy = smoothGroundY(terrainHills, e.x + TILE_SIZE / 2);
    if (sy === null) continue;
    const lifted = sy - 2 * TILE_SIZE;
    if (lifted < e.y) e.y = lifted;
  }
  // 3) Boden-Deko unter einer Hügelkurve entfernen.
  for (let c = 0; c < width; c++) {
    const t = tiles[ground - 1][c];
    if (t !== TileType.DECORATION_PROP && t !== TileType.DECORATION_FLOWER) continue;
    const sy = smoothGroundY(terrainHills, c * TILE_SIZE + TILE_SIZE / 2);
    if (sy !== null && sy < (ground - 0.25) * TILE_SIZE) set(c, ground - 1, TileType.EMPTY);
  }
  // 4) Hang freiräumen: blockierende Tiles im Hügelkorridor ausbauen (zentral,
  // korrekte Groß-Figur-Kopffreiheit — siehe clearHillHeadroom).
  clearHillHeadroom(tiles, terrainHills, width, height);

  // Unterirdischer Geheim-Raum (Mario-Stil): Pipe im Boden → Hohlraum mit Münzen.
  const warpPipes = buildUndergroundRoom({ set, addCoinRow, ground, entryCol: 87, roomL: 83 });

  return {
    name: 'World 3: Wolken Welt',
    theme: 'sky',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    warpPipes,
    terrainHills,
    movingPlatforms: [
      { centerCol: 62, centerRow: ground - 2, widthTiles: 3, amplitudeTiles: 3, path: 'horizontal', speed: 0.8 },
    ],
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 192 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 89, row: ground },
    signs: [
      {
        col: 6,
        row: ground - 1,
        lines: [
          'Wolken Welt!',
          'Springe über die Lücken.',
          'Gelb leuchtend = Super-Kraft',
        ],
      },
      {
        col: 67,
        row: ground - 1,
        lines: [
          'Achtung: Banzai-Bill!',
          'Großes Geschoss von rechts —',
          'ducken oder ausweichen.',
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
      '55,' + (ground - 8),
      '101,' + (ground - 8),
      '169,' + (ground - 7),
    ],
  };
}
