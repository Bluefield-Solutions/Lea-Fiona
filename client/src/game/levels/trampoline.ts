import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers, buildUndergroundRoom } from '../levelHelpers';
import { smoothGroundY } from '../terrain';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const SIGN = TileType.SIGN;
const NOTE = TileType.NOTE_BLOCK;

/**
 * World 12: Superfly — Indoor-Trampolinpark.
 * STUFE 1 (Gerüst): acht Beats entlang der echten Superfly-Attraktionen.
 * Kern-Mechanik: Note-Block = Trampolin (Sprungfeder). Gegner = Dodgebälle
 * (Spike-Ball umgedeutet). Wood-Platform = Stege/Parcours.
 */
export function createTrampolineLevel(): LevelData {
  const width = 200;
  const height = 24;          // erhöht für unterirdischen Bonus-Raum
  const ground = 13;          // Hauptlevel-Boden bleibt fest (nicht height-2)

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, addOneWayRow } = bindHelpers({ tiles, width, height, groundRow: ground });
  const entities: EntitySpawn[] = [];
  // Umwelt-Interaktion: Sprungfeder + Kiste (fester Flachboden).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  Spr(50); Box(100);
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);

  // Power-Up-Blöcke (Balance-Fix: Welt 12 hatte bisher keine Power-Ups).
  // P2: Katalog breiter ausspielen — Umhang (Wingsuit, thematisch für den
  // Flugpark) + Zeitlupen-Uhr ergänzt; Welt 12 hatte nur 5 ?-Blöcke.
  const powerBlocks: Record<string, string[]> = { super: [], heart: [], shield: [], cape: [], clock: [] };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  // Durchgehender Polster-Boden; eine Foam-Pit-Lücke im Beat 2.
  const gaps = new Set<number>([46, 47]);
  for (let c = 0; c < width; c++) {
    if (gaps.has(c)) continue;
    set(c, ground, TileType.GROUND_TOP);
    for (let r = ground + 1; r < height; r++) set(c, r, TileType.GROUND);
  }

  const Dodge = (col: number, row = ground - 2) => entities.push({ type: EntityType.SPIKE_BALL, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Run = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  // Helm-Kid (Koopa): laufender Panzer-Gegner — dritte Gegner-Art (Balance P1:
  // hinteres Drittel eskalieren, Welt 12 nutzte nur 2 Typen). Gestompt rutscht
  // der Panzer und räumt mit, bringt eine neue Mechanik in den Park.
  const Shell = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Tramp = (col: number, row = ground - 1) => set(col, row, NOTE);

  // === Beat 1: MainCourt — großes Trampolinfeld ===
  for (const c of [7, 11, 15, 19, 23]) Tramp(c);
  set(13, ground - 4, Q); // Münz-Block zwischen den ersten Trampolinen
  set(21, ground - 4, Q); // Münz-Block — Frage-Blöcke belohnen die Sprünge
  addCoinArc(9, 4, ground - 5, 4);
  addCoinArc(17, 4, ground - 5, 4);

  // === Beat 2: Foam Pit — Sprung über die Schaumstoffgrube ===
  Tramp(42); Run(15); Run(38);
  addBlock('super', 32, ground - 4);
  // Bodenstampf-Tor (Audit C2): Ziegel über einer Münz-Grube — Bodenstampfer
  // (↓ in der Luft) bricht durch → Münzen; Drüberlaufen bleibt normal.
  for (const c of [34, 35, 36]) { set(c, ground, TileType.BRICK); set(c, ground + 1, TileType.EMPTY); }
  addCoinRow(34, 3, ground + 1);
  addCoinRow(43, 4, ground - 6);

  // === Beat 3: Flying Dunk — hoher Sprung zum Korb ===
  Tramp(60);
  addCoinArc(61, 6, ground - 8, 5);
  addBlock('cape', 58, ground - 5); // Wingsuit-Gleiter für den hohen Dunk
  addBlock('heart', 68, ground - 4); // Heilung vor der Dodgeball-Zone
  Tramp(73); Run(66); Dodge(70); Shell(56);

  // === Beat 4: Ninja Parcours — Kletterplattformen ===
  addOneWayRow(82, 3, ground - 3);
  addOneWayRow(88, 3, ground - 5);
  addOneWayRow(94, 3, ground - 4);
  addCoinRow(83, 3, ground - 4);
  addCoinRow(89, 3, ground - 6);
  set(98, ground - 4, Q); // Münz-Block am Ende des Ninja-Parcours
  Tramp(103); Run(92); Run(120); // Tramp 101->103: raus aus Checkpoint-Respawn-Box (100-101)

  // === Beat 5: Balance Court — schmale Stege ===
  addBlock('shield', 108, ground - 4); // Schild nach dem Checkpoint (col 100)
  addOneWayRow(110, 2, ground - 3);
  addOneWayRow(116, 2, ground - 4);
  addOneWayRow(122, 2, ground - 3);
  addOneWayRow(128, 2, ground - 4);
  addCoinRow(110, 2, ground - 5);
  addCoinRow(122, 2, ground - 5);
  Shell(114); Shell(126); // Helm-Kids patrouillieren den Balance-Boden
  // Vertikaler Aufzug (Audit C1 · Rollout): Hebebühne vom Boden hoch zu einer
  // Belohnungs-Terrasse (cols 130–133, siehe movingPlatforms). Optionaler
  // Hochweg mit Münzen — nie auf dem Flaggen-Pfad.
  addOneWayRow(130, 4, ground - 10);
  addCoinRow(130, 4, ground - 11);

  // === Beat 6: Dodgeball — fliegende Bälle + Trampoline ===
  Tramp(138);
  Dodge(142); Dodge(150); Run(146); Dodge(160); Run(168);
  Tramp(154); Shell(156);
  addBlock('clock', 140, ground - 4); // Zeitlupe hilft im Dodgeball-Getümmel
  addBlock('super', 150, ground - 6); // Groß-Power hoch im Getümmel (spätes Drittel großzügiger)
  addCoinArc(144, 4, ground - 5, 3);
  addCoinRow(162, 4, ground - 3); // Münz-Trail nach der Dodgeball-Zone

  // === Beat 7: X-Arena — Neon-Trampolinreihe ===
  for (const c of [162, 167, 172, 177]) Tramp(c);
  Dodge(174); // rollender Ball zwischen den Trampolinen
  set(168, ground - 4, Q); // Münz-Block zwischen den Neon-Trampolinen
  addCoinRow(163, 10, ground - 6);

  // === Beat 8: Friday Night Jump — Ziel-Bühne ===
  addBlock('heart', 184, ground - 4); // Extra-Herz vor dem Finale
  addBlock('heart', 180, ground - 4); // zweites Herz — Finale-Anlauf großzügig gepolstert
  addBlock('super', 194, ground - 4); // Groß-Power direkt vor der Ziel-Bühne
  Tramp(188);
  addCoinArc(190, 3, ground - 6, 3);

  // Schilder.
  set(4, ground - 1, SIGN);
  set(80, ground - 1, SIGN);
  set(136, ground - 1, SIGN);

  // Trampolinpark-Deko (col % 4 → 0 Foam-Würfel, 1 Ball-Korb, 2 Pylon, 3 Spender).
  const DP = TileType.DECORATION_PROP;
  [40, 52,            // Foam Pit: Würfelhaufen (v0)
   137, 153,          // Dodgeball: Ball-Korb (v1)
   86, 122,           // Parcours/Balance: Pylonen (v2)
   27, 175,           // verteilt: Wasserspender (v3)
  ].forEach((c) => set(c, ground - 1, DP));

  // === Geheimer unterirdischer Bonus-Raum (Warp-Röhre, Mario-Stil) ===
  const warpPipes = buildUndergroundRoom({ set, addCoinRow, ground, entryCol: 30, roomL: 28 });

  // Schutz-Logik — Gegner nie im Boden.
  const groundEnemies = new Set<EntityType>([EntityType.SPIKE_BALL, EntityType.GOOMBA, EntityType.KOOPA]);
  for (const e of entities) {
    if (!groundEnemies.has(e.type)) continue;
    const sy = smoothGroundY([], e.x + TILE_SIZE / 2);
    if (sy === null) continue;
    const lifted = sy - 2 * TILE_SIZE;
    if (lifted < e.y) e.y = lifted;
  }

  return {
    name: 'Superfly',
    theme: 'trampoline',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    movingPlatforms: [
      // Vertikaler Aufzug (Audit C1): Boden hoch zur Belohnungs-Terrasse (row 3).
      { centerCol: 130, centerRow: ground - 5, widthTiles: 3, amplitudeTiles: 4, path: 'vertical', speed: 0.7 },
    ],
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 197 * TILE_SIZE, y: (ground - 9) * TILE_SIZE },
    checkpoint: { col: 100, row: ground },
    superBlocks: powerBlocks.super,
    heartBlocks: powerBlocks.heart,
    shieldBlocks: powerBlocks.shield,
    capeBlocks: powerBlocks.cape,
    clockBlocks: powerBlocks.clock,
    specialCoins: [
      '18,' + (ground - 7),
      '62,' + (ground - 9),
      '170,' + (ground - 7),
    ],
    warpPipes,
    // Test (Stufe 5): im unterirdischen Geheimraum näher heranzoomen für eine
    // intimere Atmosphäre. Greift nur unterhalb des Hauptbodens (row >= 15).
    cameraZones: [
      { colStart: 27, colEnd: 42, rowStart: 15, rowEnd: 23, zoom: 1.18 },
    ],
    signs: [
      { col: 4, row: ground - 1, lines: ['Superfly Trampolinpark!', 'Spring von Trampolin zu Trampolin.', 'Ziel: die Friday-Night-Jump-Bühne.'] },
      { col: 34, row: ground - 1, lines: ['Geheimer Schacht!', 'Stell dich drauf und drück ↓'] },
      { col: 80, row: ground - 1, lines: ['Ninja Parcours!', 'Klettere über die Hindernisse.'] },
      { col: 136, row: ground - 1, lines: ['Dodgeball-Feld!', 'Weiche den fliegenden Bällen aus.'] },
    ],
  };
}
