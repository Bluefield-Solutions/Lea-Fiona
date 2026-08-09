import { TileType, TILE_SIZE, EntityType } from '../constants';
import { smoothGroundY } from '../terrain';
import { bindHelpers, bindCoinHelpers, buildUndergroundRoom, clearHillHeadroom } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const SIGN = TileType.SIGN;
const FL = TileType.DECORATION_FLOWER;

/**
 * World 5 „Australien Outback" — Neudesign im 8-Beat-Pacing-Modell.
 *
 * Leitidee: Trockenes Outback mit Felsformationen und Billabongs (Wasserlöchern).
 * Das Känguru ist der Signature-Gegner; die Schlange wird in einem sicheren
 * Lernraum mit Warnschild eingeführt. Pacing: Anspannung → Entspannung →
 * Belohnung. Abgründe und Wasser-Lücken ≤ 3 Tiles; hohe Plattformen gestaffelt.
 */
export function createAustraliaLevel(): LevelData {
  const width = 200;
  const height = 24;          // erhöht für unterirdischen Bonus-Raum
  const ground = 13;          // Hauptboden fest (nicht height-2)

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addWoodBridge, addWater, addOneWayRow, addRockFormation } =
    bindHelpers({ tiles, width, height, groundRow: ground });

  const entities: EntitySpawn[] = [];
  // Umwelt-Interaktion: Sprungfeder + Kiste (Y rastet unten auf die Geländekurve).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  Spr(48); Box(61);   // gegnerfreier Belohnungs-Abschnitt (Beat 3)
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  // Sprungfeder: drauf springen → Mega-Bounce zur Münz-Reihe hoch oben.
  set(42, ground - 1, TileType.NOTE_BLOCK);
  addCoinRow(41, 3, ground - 7);
  // Zweite Sprungfeder (späterer Abschnitt) mit Münz-Bogen als Belohnung.
  set(124, ground - 1, TileType.NOTE_BLOCK);
  addCoinArc(123, 3, ground - 6, 1);
  // Geheime Bonus-Kammer hoch oben: per Sprungfeder erreichbar,
  // Plattform + dichte Münz-Formation als Belohnung.
  set(156, ground - 1, TileType.NOTE_BLOCK);
  addOneWayRow(155, 4, ground - 6);
  addCoinRow(155, 4, ground - 7);
  addCoinRow(155, 4, ground - 8);

  const powerBlocks: Record<string, string[]> = {
    super: [], heart: [], fire: [], magnet: [], cape: [], shield: [],
  };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  const G = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const K = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Ka = (col: number, row = ground - 2) => entities.push({ type: EntityType.KANGAROO, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Sn = (col: number, row = ground - 2) => entities.push({ type: EntityType.SNAKE, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Bz = (col: number, row: number) => entities.push({ type: EntityType.BANZAI_BILL, x: col * TILE_SIZE, y: row * TILE_SIZE });
  // Schlangen-Boss im Finale (flacher Streifen 179–191 vor der Flagge): kriecht,
  // richtet sich auf und schnellt vor — drei Kopfsprünge besiegen ihn.
  const SnBoss = (col: number, row = ground - 3) => entities.push({ type: EntityType.SNAKE_BOSS, x: col * TILE_SIZE, y: row * TILE_SIZE });
  SnBoss(185);

  // BEAT 1 — Ankommen im Outback (0–24): trocken, erste Kängurus.
  fillGround(0, 24, ground);
  addBlock('super', 5, ground - 4);
  set(6, ground - 1, SIGN);
  set(9, ground - 4, Q);
  addBlock('heart', 14, ground - 4);
  addRockFormation(18, 2, 2, ground);
  set(23, ground - 1, FL);
  addCoinRow(10, 4, ground - 6);
  Ka(12);

  // BEAT 2 — Erste Lücke & Billabong (25–46): Abgrund + Wasserloch.
  fillGround(28, 46, ground);
  addRockFormation(32, 3, 2, ground);
  addWater(38, 40);
  addBlock('fire', 35, ground - 4);
  addCoinArc(28, 4, ground - 4, 3);
  Sn(44);

  // BEAT 3 — Atempause & Belohnung (47–62): Plateau, keine Gegner.
  fillGround(47, 62, ground);
  addOneWayRow(50, 4, ground - 3);
  addOneWayRow(56, 3, ground - 5);
  addBlock('magnet', 53, ground - 4);
  addCoinRow(50, 4, ground - 4);
  addCoinArc(56, 4, ground - 5, 3);

  // BEAT 4 — Schlangen-Fokus (63–88): Schlangen + Warnschild.
  fillGround(63, 88, ground);
  set(65, ground - 1, SIGN);
  addRockFormation(70, 2, 3, ground);
  addBricks(76, 3, ground - 4);
  set(77, ground - 4, Q);
  addOneWayRow(82, 3, ground - 4);
  addBlock('super', 85, ground - 4);
  // Schlange bei col 68 entfernt: sie stand direkt vor der 3 Tiles hohen
  // Felswand (70–71) — man musste eine schnelle Schlange UND die hohe Wand in
  // einem Sprung nehmen (unfair). Sn(80) steht auf offenem Flachgrund und ist
  // sauber überspringbar; nur dort, wo man wirklich drüberkommt.
  Sn(80);

  // BEAT 5 — Känguru-Herausforderung (89–112): Hüpfer über Lücken.
  fillGround(92, 112, ground);
  set(94, ground - 1, SIGN);
  addRockFormation(98, 2, 2, ground);
  addBlock('cape', 104, ground - 4);
  addCoinArc(95, 4, ground - 4, 3);
  Ka(100); Ka(109); // 96->100: aus Checkpoint-Zone 92

  // BEAT 6 — Kombination (113–144): Kängurus + Schlangen + Koopas.
  fillGround(116, 144, ground);
  addRockFormation(120, 3, 2, ground);
  addBricks(126, 3, ground - 4);
  set(127, ground - 4, Q);
  addWater(133, 135);
  addBlock('shield', 139, ground - 4);
  addOneWayRow(141, 3, ground - 5);
  Ka(118); Ka(138); // Balance v388: Koopa (130) entfernt — Dichte gesenkt

  // BEAT 7 — Höhepunkt (145–180): Felsen, mehrere Lücken, viele Gegner.
  fillGround(148, 180, ground);
  addRockFormation(152, 3, 3, ground);
  // Balance v388: Wasserloch 160-162 geschlossen (Höhepunkt hat weiter Wasser 176-178).
  addBricks(167, 4, ground - 4);
  set(168, ground - 4, Q);
  set(170, ground - 4, Q);
  addBlock('heart', 173, ground - 5);
  addWater(176, 178);
  addCoinArc(152, 6, ground - 5, 4);
  Bz(150, ground - 7); Ka(157); K(172);

  // BEAT 8 — Cool-down & Finale (181–199): Anflug zur Flagge.
  fillGround(181, 199, ground);
  addCoinRow(183, 6, ground - 4);
  set(196, ground - 1, FL);
  Ka(182);  // aus Zielzone (Flagge 192) verschoben


  // Thematische Boden-Deko (nicht-solide, theme-abhängig).
  set(11, ground - 1, TileType.DECORATION_PROP);
  set(28, ground - 1, TileType.DECORATION_PROP);
  set(39, ground - 1, TileType.DECORATION_PROP);
  set(50, ground - 1, TileType.DECORATION_PROP);
  set(61, ground - 1, TileType.DECORATION_PROP);
  set(72, ground - 1, TileType.DECORATION_PROP);
  set(83, ground - 1, TileType.DECORATION_PROP);
  set(96, ground - 1, TileType.DECORATION_PROP);
  set(107, ground - 1, TileType.DECORATION_PROP);
  set(118, ground - 1, TileType.DECORATION_PROP);
  set(130, ground - 1, TileType.DECORATION_PROP);
  set(141, ground - 1, TileType.DECORATION_PROP);
  set(152, ground - 1, TileType.DECORATION_PROP);
  set(163, ground - 1, TileType.DECORATION_PROP);
  set(175, ground - 1, TileType.DECORATION_PROP);
  set(186, ground - 1, TileType.DECORATION_PROP);

  // ── Hügel-Zonen: glatte Kurve, grafisch mit dem Boden verschmolzen ──
  // Abgestimmt auf das Layout: kein Hügel liegt über Wasser (38-40, 133-135,
  // 160-162, 176-178) oder über einer Plattform (50, 56, 82, 141, 155, 88).
  // Alle Hügel liegen vollständig auf durchgehendem Boden und halten ≥2 Kacheln
  // Abstand zu Lücken (25-27, 113-115, 145-147), Wasser (38-40, 133-135,
  // 160-162, 176-178) und Plattformen (50, 56, 82, 88, 141, 155) — sonst fällt
  // die Figur beim Bergab-Momentum direkt in die Lücke statt bewusst zu springen.
  const terrainHills = [
    { startCol: 6,   endCol: 20,  peakTiles: 1.4, baseRow: ground, skew: 0 },   // Segment 0-24, Puffer vor Lücke 25
    { startCol: 65,  endCol: 78,  peakTiles: 2.0, baseRow: ground, skew: 0 },   // Segment 63-88, Puffer vor Plattform 82
    { startCol: 94,  endCol: 108, peakTiles: 2.4, baseRow: ground, skew: 0 },   // Segment 92-112, Puffer vor Lücke 113
    { startCol: 119, endCol: 130, peakTiles: 1.8, baseRow: ground, skew: 0 },   // Segment 116-144, Puffer nach Lücke + vor Wasser 133
    { startCol: 165, endCol: 173, peakTiles: 1.5, baseRow: ground, skew: 0 },   // Segment 148-180, Puffer zwischen Wasser 162 und 176
  ];
  // 1) Boden-Oberkante in Hügel-Zonen zu reiner Erde (Kurve liefert Oberfläche).
  for (const h of terrainHills)
    for (let c = h.startCol; c <= h.endCol; c++) set(c, ground, TileType.GROUND);
  // 2) Boden-Gegner auf die Hügelkurve heben (sonst stecken sie im Hang).
  const hillGroundEnemies = new Set<EntityType>([EntityType.GOOMBA, EntityType.KOOPA, EntityType.KANGAROO, EntityType.SNAKE, EntityType.SNAKE_BOSS]);
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
  // 3) Boden-Deko, die unter einer Hügelkurve läge, entfernen.
  for (let c = 0; c < width; c++) {
    const t = tiles[ground - 1][c];
    if (t !== TileType.DECORATION_PROP && t !== TileType.DECORATION_FLOWER) continue;
    const sy = smoothGroundY(terrainHills, c * TILE_SIZE + TILE_SIZE / 2);
    if (sy !== null && sy < (ground - 0.25) * TILE_SIZE) set(c, ground - 1, TileType.EMPTY);
  }
  // 4) Hang freiräumen: blockierende Tiles im Hügel-Korridor ausbauen (zentral,
  // korrekte Groß-Figur-Kopffreiheit — siehe clearHillHeadroom).
  clearHillHeadroom(tiles, terrainHills, width, height);

  // Unterirdischer Geheim-Raum (Mario-Stil): Pipe im Boden → Hohlraum mit Münzen.
  const warpPipes = buildUndergroundRoom({ set, addCoinRow, ground, entryCol: 55, roomL: 51 });

  return {
    name: 'World 5: Australien Outback',
    theme: 'australia',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    warpPipes,
    terrainHills,
    movingPlatforms: [
      { centerCol: 88, centerRow: ground - 2, widthTiles: 3, amplitudeTiles: 3, path: 'horizontal', speed: 0.8 },
    ],
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 192 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 92, row: ground },
    signs: [
      {
        col: 6,
        row: ground - 1,
        lines: [
          'Australien Outback!',
          'Kängurus hüpfen hoch.',
          'Spring auf ihren Kopf.',
        ],
      },
      {
        col: 65,
        row: ground - 1,
        lines: [
          'Achtung: Schlangen!',
          'Sie kriechen flach am Boden.',
        ],
      },
      {
        col: 94,
        row: ground - 1,
        lines: [
          'Känguru-Sprünge!',
          'Timing beachten beim Drauf-',
          'springen.',
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
      '56,' + (ground - 8),
      '85,' + (ground - 7),
      '173,' + (ground - 8),
    ],
  };
}
