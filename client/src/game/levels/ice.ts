import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers, buildUndergroundRoom, clearHillHeadroom } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';
import { smoothGroundY } from '../terrain';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const SIGN = TileType.SIGN;
const ICE_TOP = TileType.ICE_TOP;
const ICE = TileType.ICE;

/**
 * World 7 „Eis Königreich" — Neudesign im 8-Beat-Pacing-Modell.
 *
 * Leitidee: Rutschiges Eis (ICE_FRICTION) mit Gletscherspalten und fallenden
 * Eiszapfen. Der schneeball-werfende Yeti ist der Signature-Gegner (2 Treffer);
 * er wird mit Warnschild eingeführt, ebenso die Eiszapfen-Zone. Pacing:
 * Anspannung → Entspannung → Belohnung. Spalten ≤ 3 Tiles; auf Eis ist das
 * Sprung-Timing durch das Rutschen anspruchsvoller — daher konservativ gesetzt.
 */
export function createEisLevel(): LevelData {
  const width = 220;
  const height = 24;          // erhöht für unterirdischen Bonus-Raum
  const ground = 13;          // Hauptboden fest (nicht height-2)

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addWoodBridge, addOneWayRow, addStairs } =
    bindHelpers({ tiles, width, height, groundRow: ground });

  const fillIce = (a: number, b: number) => fillGround(a, b, ground, ICE_TOP, ICE);

  const entities: EntitySpawn[] = [];
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  // Sprungfeder: drauf springen → Mega-Bounce zur Münz-Reihe hoch oben.
  set(36, ground - 1, TileType.NOTE_BLOCK);
  addCoinRow(35, 3, ground - 7);
  // Zweite Sprungfeder (späterer Abschnitt) mit Münz-Bogen als Belohnung.
  set(116, ground - 1, TileType.NOTE_BLOCK);
  addCoinArc(115, 3, ground - 6, 1);
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
  const Ye = (col: number, row = ground - 2) => entities.push({ type: EntityType.YETI, x: col * TILE_SIZE, y: row * TILE_SIZE });
  // Umwelt-Interaktion: Sprungfeder + Kiste (Y rastet unten auf die Geländekurve).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  Spr(54); Box(66);   // im gegnerfreien Belohnungs-Abschnitt (Beat 3)
  const Ic = (col: number) => entities.push({ type: EntityType.FIREBALL, x: col * TILE_SIZE, y: 2 * TILE_SIZE });
  const Bz = (col: number, row: number) => entities.push({ type: EntityType.BANZAI_BILL, x: col * TILE_SIZE, y: row * TILE_SIZE });

  // BEAT 1 — Ankommen im Eis (0–28): rutschiger Grund, sanfter Start.
  fillIce(0, 28);
  addBlock('super', 5, ground - 4);
  set(6, ground - 1, SIGN);
  set(9, ground - 4, Q);
  addBlock('heart', 14, ground - 4);
  addCoinRow(10, 4, ground - 6);
  G(12); K(22);

  // BEAT 2 — Erste Gletscherspalte (29–52): Abgrund + Eis-Plattform.
  fillIce(32, 52);
  addOneWayRow(29, 3, ground - 3);
  addBricks(38, 3, ground - 5);
  addBlock('fire', 39, ground - 5);
  addCoinArc(29, 3, ground - 4, 3);
  K(46); G(54);

  // BEAT 3 — Atempause & Belohnung (53–68): Eis-Plateau, gegnerfrei.
  fillIce(53, 68);
  addOneWayRow(56, 4, ground - 3);
  addOneWayRow(62, 3, ground - 5);
  addBlock('magnet', 59, ground - 4);
  addCoinRow(56, 4, ground - 4);
  addCoinArc(62, 4, ground - 5, 3);

  // BEAT 4 — Yeti-Einführung (69–96): Schneeball-Werfer + Warnschild.
  fillIce(69, 96);
  set(71, ground - 1, SIGN);
  // Vormals harte 1-Tile-Eistreppe (col 74–76) → durch glatte Eis-Rampe
  // ersetzt (terrainHill unten), damit auf rutschigem Eis kein Lauf-Hänger.
  addBricks(84, 3, ground - 4);
  set(85, ground - 4, Q);
  addOneWayRow(89, 3, ground - 4);
  addBlock('super', 92, ground - 4);
  Ye(80); G(76);

  // BEAT 5 — Eiszapfen-Zone (97–122): fallende Eiszapfen + Spalten.
  fillIce(100, 122);
  addOneWayRow(97, 3, ground - 3);
  set(101, ground - 1, SIGN);
  addOneWayRow(112, 3, ground - 3);
  addBlock('cape', 118, ground - 4);
  addCoinArc(112, 3, ground - 4, 3);
  Ic(104); Ic(109); Ic(116); K(107);

  // BEAT 6 — Kombination (123–154): Yeti + Spalten + Koopas.
  fillIce(126, 136);
  fillIce(140, 154);
  addOneWayRow(123, 3, ground - 3);
  addBricks(130, 3, ground - 4);
  set(131, ground - 4, Q);
  addOneWayRow(137, 3, ground - 3);
  addBlock('shield', 144, ground - 4);
  addOneWayRow(147, 3, ground - 5);
  Ye(134); K(142); K(150);

  // BEAT 7 — Höhepunkt (155–192): mehrere Spalten, zweiter Yeti.
  fillIce(158, 179);
  fillIce(183, 192);
  addOneWayRow(155, 3, ground - 3);
  // Vormals harte 1-Tile-Eistreppe (col 162–164) → durch glatte Eis-Rampe
  // ersetzt (terrainHill unten), damit auf rutschigem Eis kein Lauf-Hänger.
  addBricks(170, 4, ground - 4);
  set(171, ground - 4, Q);
  set(173, ground - 4, Q);
  addOneWayRow(180, 3, ground - 3);
  addBlock('heart', 186, ground - 5);
  addCoinArc(160, 6, ground - 5, 4);
  Bz(157, ground - 7); Ye(166); Ic(176); K(184);

  // BEAT 8 — Cool-down & Finale (193–219): ruhiger Anflug zur Flagge.
  fillIce(193, 219);
  addCoinRow(195, 6, ground - 4);
  G(198);


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
  set(175, ground - 1, TileType.DECORATION_PROP);
  set(188, ground - 1, TileType.DECORATION_PROP);
  set(199, ground - 1, TileType.DECORATION_PROP);
  set(210, ground - 1, TileType.DECORATION_PROP);

  // ── Eis-Hügel: glatte, glänzende Erhebungen, blau gerendert (renderTerrainHills).
  // Boden bleibt ICE_TOP (rutschig). Platziert mit ≥2 Kacheln Puffer zu Lücken
  // (29-31, 97-99, 123-125, 137-139, 155-157, 180-182), Sprungfedern (36, 116,
  // 190), Treppen (74, 162), Bricks (38, 84, 130, 170) und Plattformen.
  const terrainHills = [
    { startCol: 14,  endCol: 26,  peakTiles: 1.6, baseRow: ground, skew: 0 },   // Segment 0-28, vor Lücke 29
    { startCol: 42,  endCol: 51,  peakTiles: 1.8, baseRow: ground, skew: 0 },   // Segment 32-52, nach Bricks 38, vor Lücke 53
    { startCol: 103, endCol: 110, peakTiles: 1.6, baseRow: ground, skew: 0 },   // Segment 100-122, zwischen Plattformen 101/112
    { startCol: 141, endCol: 145, peakTiles: 1.5, baseRow: ground, skew: 0 },   // Segment 140-154, vor Plattform 147
    { startCol: 73,  endCol: 78,  peakTiles: 2.0, baseRow: ground, skew: 0 },   // ERSETZT harte Treppe col74-76 (BEAT 4) → glatte Eis-Rampe
    { startCol: 161, endCol: 166, peakTiles: 2.0, baseRow: ground, skew: 0 },   // ERSETZT harte Treppe col162-164 (BEAT 7) → glatte Eis-Rampe
    { startCol: 172, endCol: 178, peakTiles: 2.0, baseRow: ground, skew: 0 },   // Segment 158-179, nach Bricks 170
    { startCol: 196, endCol: 210, peakTiles: 2.4, baseRow: ground, skew: 0 },   // Segment 193-219, Finale-Hügel
  ];
  // 2) Boden-Gegner auf die Hügelkurve heben (fliegende/Eiszapfen bleiben).
  const hillGroundEnemies = new Set<EntityType>([EntityType.GOOMBA, EntityType.KOOPA, EntityType.YETI]);
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
  const warpPipes = buildUndergroundRoom({ set, addCoinRow, ground, entryCol: 67, roomL: 63 });

  return {
    name: 'Eis Königreich',
    theme: 'ice',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    warpPipes,
    terrainHills,
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
          'Eis Königreich!',
          'Vorsicht: Der Boden ist',
          'glatt — du rutschst!',
        ],
      },
      {
        col: 71,
        row: ground - 1,
        lines: [
          'Achtung: Yeti!',
          'Wirft Schneebälle. Zweimal',
          'auf den Kopf springen.',
        ],
      },
      {
        col: 101,
        row: ground - 1,
        lines: [
          'Eiszapfen fallen!',
          'Sie stürzen von der Decke.',
          'In Bewegung bleiben.',
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
      '92,' + (ground - 7),
      '171,' + (ground - 7),
    ],
  };
}
