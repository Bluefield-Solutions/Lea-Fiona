import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers, buildUndergroundRoom } from '../levelHelpers';
import { smoothGroundY } from '../terrain';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const NOTE = TileType.NOTE_BLOCK;   // Trampolin
const STONE = TileType.STONE;       // Sprungkasten-Schicht
const RECK = TileType.PLATFORM;     // Reck (festes Hürden-Gerät, drüberspringen)
const ROPE = TileType.ROPE;         // Kletterseil
const SIGN = TileType.SIGN;

/**
 * World 12: Turnen — die große Turnhalle.
 * Vier Kern-Geräte: Reck (drüberspringen), Barren (Einweg-Holme), Sprungkasten
 * (Stein-Stapel), Trampolin (Note-Block). Acht Beats vom Einturnen bis zum
 * Siegertreppchen. Gegner geräte-thematisch: rollender Medizinball (SpikeBall)
 * + laufendes Maskottchen (Goomba).
 */
export function createTurnenLevel(): LevelData {
  const width = 232;          // erweitert für die große Liana-Schlucht vor dem Finale
  const height = 24;          // Platz für geheimen Bonus-Raum unter dem Boden
  const ground = 13;

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, addOneWayRow } = bindHelpers({ tiles, width, height, groundRow: ground });
  const entities: EntitySpawn[] = [];
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);

  // Power-Up-Blöcke (Peer-Niveau ~13 Blöcke, großzügig im letzten Drittel).
  const powerBlocks: Record<string, string[]> = { super: [], heart: [], shield: [], cape: [], clock: [], magnet: [], star: [] };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  // Durchgehender Hallenboden. Zwei weiche Gruben (kein Absturz-Tod):
  // - Schaumstoffgrube (128–129): flach (2 Tiles), rausspringbar.
  // - Tarzan-Schwingseil-Grube (150–156): flach (2 Tiles), weich. Man schwingt
  //   sich an den Seilen wie Tarzan hinüber; wer hineinfällt, springt heraus.
  const softGap = new Set<number>([128, 129]);                       // flache Foam-Grube
  const pit = new Set<number>();                                     // weiche Gruben (2 Tiles)
  for (const c of [150, 151, 152, 153, 154, 155, 156]) pit.add(c);   // Tarzan-Schwing-Grube (Beat 6)
  for (let c = 198; c <= 218; c++) pit.add(c);                       // große Liana-Schlucht (Beat 8)
  for (let c = 0; c < width; c++) {
    if (softGap.has(c) || pit.has(c)) {
      set(c, ground + 2, TileType.GROUND_TOP);
      for (let r = ground + 3; r < height; r++) set(c, r, TileType.GROUND);
      continue;
    }
    set(c, ground, TileType.GROUND_TOP);
    for (let r = ground + 1; r < height; r++) set(c, r, TileType.GROUND);
  }

  // Geräte-Helfer.
  const Reck = (col: number) => set(col, ground - 1, RECK);          // festes Reck (drüber)
  const HochReck = (col: number) => { set(col, ground - 1, RECK); set(col, ground - 2, RECK); }; // höheres Reck
  const Tramp = (col: number) => set(col, ground - 1, NOTE);         // Trampolin
  const Kasten = (col: number, w: number, h: number) => {           // Sprungkasten (Stapel)
    for (let dc = 0; dc < w; dc++) for (let r = 0; r < h; r++) set(col + dc, ground - 1 - r, STONE);
  };
  const Ball = (col: number, row = ground - 2) => entities.push({ type: EntityType.SPIKE_BALL, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Run = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const DP = TileType.DECORATION_PROP;

  // === BEAT 1 — Einturnen (0–24): ruhiger Start, Matten, erste Münzen. ===
  set(6, ground - 1, SIGN);
  set(9, ground - 1, DP);
  addCoinRow(12, 3, ground - 3);
  set(16, ground - 4, Q); // Münz-Block
  // Übungs-Seil (gefahrlos, über festem Boden): Greifen & Loslassen lernen,
  // BEVOR es über die erste echte Grube geht. Belohnungs-Bogen im Schwung.
  set(19, ground - 1, SIGN);           // Hinweis direkt am Übungs-Seil
  addCoinArc(22, 4, ground - 6, 3);    // Münzen im Schwungbogen (Belohnung fürs Üben)

  // === BEAT 2 — Reck-Reihe (25–52): über die Recks springen. ===
  Reck(30); Reck(38); HochReck(46);
  set(28, ground - 1, DP); set(42, ground - 1, DP); // Geräte-Deko (Matten/Kegel)
  addBlock('super', 34, ground - 4);
  addCoinArc(30, 3, ground - 3, 2);
  addCoinArc(38, 3, ground - 3, 2);
  Run(50);

  // === BEAT 3 — Barren (53–82): parallele Holme traversieren. ===
  addOneWayRow(56, 8, ground - 3);   // unterer Holm
  addOneWayRow(58, 6, ground - 6);   // oberer Holm (versetzt)
  addCoinRow(57, 6, ground - 4);
  addCoinRow(59, 4, ground - 7);
  addBlock('heart', 68, ground - 4);
  addOneWayRow(72, 8, ground - 4);
  set(70, ground - 1, DP);
  Ball(78);
  addCoinRow(82, 1, ground - 3); // Münze im Reifen (Reifen wird im Vordergrund gezeichnet)

  // === BEAT 4 — Sprungkasten-Parcours (83–112): drauf/drüber hüpfen. ===
  Kasten(86, 3, 2);   // niedriger Kasten
  Kasten(95, 3, 3);   // mittlerer Kasten
  Kasten(104, 2, 3);  // hoher Kasten (max. 3 Tiles → fair überspringbar)
  addBlock('shield', 91, ground - 5);
  addBlock('cape', 100, ground - 6);
  addCoinArc(88, 3, ground - 5, 2);
  addCoinArc(97, 3, ground - 6, 2);
  addCoinRow(112, 1, ground - 3); // Münze im zweiten Reifen
  set(83, ground - 1, DP); set(108, ground - 1, DP); // Geräte-Deko
  Run(110);

  // === BEAT 5 — Trampolin-Bahn (113–142): SALTO-SHOW zu hohen Belohnungen. ===
  Tramp(116); Tramp(124); Tramp(136);
  addCoinArc(118, 5, ground - 7, 4);
  addCoinArc(131, 5, ground - 7, 4); // Belohnungsbogen über der Gruben-Lücke (128/129)
  // Stern-Belohnung über der Trampolin-Bahn: hochspringen (Salto!) und von unten
  // anspringen → Unverwundbarkeits-Stern. Highlight-Moment (fair erreichbar).
  addBlock('star', 130, ground - 6);
  addCoinRow(133, 3, ground - 5); // Münz-Leiter Richtung Stern
  addBlock('clock', 140, ground - 4);
  set(122, ground - 1, DP);

  // === BEAT 6 — Kombination + Tarzan-Schwingseile (143–168). ===
  addBlock('magnet', 145, ground - 4);
  Reck(148);
  set(149, ground - 1, SIGN);          // Hinweis: erste Schwing-Überquerung
  // Tarzan-Schwingseil-Überquerung über der weichen Grube (150–156): vom linken
  // Rand abspringen, ein schwingendes Seil in der Luft greifen, mitschwingen und
  // im tiefsten Punkt loslassen → wie Tarzan zum nächsten Seil / ans andere Ufer.
  // Zwei versetzt schwingende Seile (Anker in swingRopes). Wer hineinfällt,
  // springt aus der flachen Grube wieder heraus (kein Tod).
  addCoinArc(150, 5, ground - 6, 3);   // Belohnungsbogen über der Schwing-Grube
  addCoinRow(153, 1, ground + 1);      // Münze in der Grube (Mut-Belohnung)
  Kasten(158, 2, 2); Tramp(163);
  Run(160); Ball(166);
  set(168, ground - 4, Q); // Münz-Block
  addCoinArc(163, 3, ground - 6, 3);

  // === BEAT 7 — Kletterseil, Schwebebalken & Ringe (169–192). ===
  // Kletterseil-Highlight (neue Mechanik): Hoch/Runter klettern, Links/Rechts
  // loslassen. Oben wartet eine Sondermünze; unterwegs Münzen.
  for (let r = ground - 8; r <= ground - 1; r++) set(170, r, ROPE);
  addCoinRow(170, 1, ground - 3); // Münze am Seil (unten)
  addCoinRow(170, 1, ground - 6); // Münze am Seil (oben)
  addOneWayRow(174, 8, ground - 3); // Schwebebalken (schmaler, langer Holm)
  addCoinRow(175, 7, ground - 4);
  HochReck(184);
  addBlock('heart', 178, ground - 4);
  set(166, ground - 1, DP); set(188, ground - 1, DP);
  Run(186);

  // === BEAT 8 — Große Liana-Schlucht (193–218): der große Schwing-Auftritt. ===
  // Vier versetzt schwingende Seile über einer weiten, weichen Schlucht. Von Seil
  // zu Seil schwingen (Kettenschwung → „Jane!"-Jubel); in der Mitte ein hoch
  // hängender Belohnungsbogen, nur im Schwung-Apex erreichbar.
  set(194, ground - 1, SIGN);          // Hinweis vor der Schlucht
  addBlock('heart', 196, ground - 4);  // letzte Auffrischung vor dem Sprung
  addCoinArc(199, 5, ground - 6, 3);   // Bogen über dem ersten Seil
  addCoinArc(211, 5, ground - 6, 3);   // Bogen über dem letzten Seil
  addCoinArc(205, 5, ground - 10, 3);  // hoher Apex-Bogen (Belohnung fürs weite Schwingen)
  addCoinRow(204, 1, ground + 1); addCoinRow(213, 1, ground + 1); // Mut-Münzen in der Schlucht
  addBlock('magnet', 221, ground - 4); // Belohnung auf dem sicheren Ufer
  set(220, ground - 1, DP); // Deko am Landeufer

  // === BEAT 9 — Siegertreppchen-Finale (219–231). ===
  addBlock('super', 226, ground - 4); // Groß-Power fürs Finale
  set(223, ground - 1, DP);           // Deko auf dem Weg zum Podest
  set(228, ground - 1, STONE);        // Podest Stufe 1
  set(229, ground - 1, STONE); set(229, ground - 2, STONE); // Stufe 2 (höher)
  addCoinArc(225, 3, ground - 3, 2);

  // Geheimer unterirdischer Bonus-Raum (Warp-Röhre).
  const warpPipes = buildUndergroundRoom({ set, addCoinRow, ground, entryCol: 42, roomL: 38 });

  // Schutz-Logik — Boden-Gegner nie im Boden versenkt.
  const groundEnemies = new Set<EntityType>([EntityType.SPIKE_BALL, EntityType.GOOMBA]);
  for (const e of entities) {
    if (!groundEnemies.has(e.type)) continue;
    const sy = smoothGroundY([], e.x + TILE_SIZE / 2);
    if (sy === null) continue;
    const lifted = sy - 2 * TILE_SIZE;
    if (lifted < e.y) e.y = lifted;
  }

  return {
    name: 'World 12: Turnen',
    theme: 'gym',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 230 * TILE_SIZE, y: (ground - 4) * TILE_SIZE },
    // Checkpoint an der Schwelle zum Schwing-Parcours (Beat 6): teilt das jetzt
    // längere Level fair in „Geräte-Hälfte" (0–141) und „Schwing-Gauntlet"
    // (141–231), wo die meisten Wiederholungen passieren (Ringe, Seile, Gegner).
    checkpoint: { col: 141, row: ground },
    superBlocks: powerBlocks.super,
    heartBlocks: powerBlocks.heart,
    shieldBlocks: powerBlocks.shield,
    capeBlocks: powerBlocks.cape,
    clockBlocks: powerBlocks.clock,
    magnetBlocks: powerBlocks.magnet,
    starBlocks: powerBlocks.star,
    specialCoins: [
      '48,' + (ground - 4),
      '124,' + (ground - 7),
      '170,' + (ground - 8), // oben am Kletterseil — nur per Klettern erreichbar
    ],
    warpPipes,
    // Schwing-Ringe über der flachen Foam-Grube (Beat 5): anspringen,
    // mitschwingen, per Sprung hinüber loslassen. Bogen über festem Boden,
    // Grube weich → robust, kein Soft-Lock.
    swingRings: [
      { col: 128, row: 2, len: 150 },
    ],
    // Tarzan-Schwingseile über der weichen Grube (Beat 6): zwei versetzt
    // schwingende Seile von der Hallendecke. Anspringen, festhalten, mit-
    // schwingen und im richtigen Moment loslassen → hinüberschwingen.
    swingRopes: [
      // Übungs-Seil in Beat 1 über festem Boden — gefahrloser Lernmoment.
      { col: 21, row: 2, len: 205, phase: 0 },
      { col: 152, row: 2, len: 220, phase: 0 },
      { col: 155, row: 2, len: 220, phase: Math.PI },
      // Große Liana-Schlucht (Beat 8): vier versetzt schwingende Seile, ~5 Spalten
      // auseinander → von Seil zu Seil schwingen (Kettenschwung). Phasen gestaffelt.
      { col: 201, row: 2, len: 225, phase: 0 },
      { col: 206, row: 2, len: 225, phase: Math.PI * 0.5 },
      { col: 211, row: 2, len: 225, phase: Math.PI },
      { col: 216, row: 2, len: 225, phase: Math.PI * 1.5 },
    ],
    cameraZones: [
      { colStart: 39, colEnd: 54, rowStart: 15, rowEnd: 23, zoom: 1.18 },
    ],
    signs: [
      { col: 6, row: ground - 1, lines: ['Turnhalle!', 'Spring über Reck & Kasten,', 'turne über Barren & Trampolin.'] },
      { col: 19, row: ground - 1, lines: ['Übungs-Seil!', 'Hochspringen, festhalten (↑),', 'im Schwung loslassen. Ganz sicher!'] },
      { col: 149, row: ground - 1, lines: ['Schwing-Seil!', 'In der Luft festhalten (↑),', 'im Schwung loslassen → hinüber.'] },
      { col: 194, row: ground - 1, lines: ['Große Liana-Schlucht!', 'Von Seil zu Seil schwingen —', 'im Schwung loslassen wie Tarzan!'] },
    ],
  };
}
