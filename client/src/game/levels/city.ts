import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;

/**
 * Level 18 „Stadt — Über den Dächern".
 *
 * Man springt von Hausdach zu Hausdach. Zwischen den Häusern klaffen
 * Müllgruben (statt Wasser/Lava): reinfallen = verloren. In einigen Lücken
 * gibt es eine tiefergelegene Gasse (Einweg-Sims) mit Münzen zum optionalen
 * Hinunterspringen. Gegner: flinke Kanalratten und schwerfällige Wander-
 * Mülltonnen (ein Kopfsprung). Sprengbrunnen (Geysire) brechen periodisch nach
 * oben aus — man springt drüber. Ab der Level-Mitte taucht im Hintergrund ein
 * schwarzes Monster über der Skyline auf und ein Zeppelin driftet vorbei.
 * Finale: ein riesiger Ratten-Boss (drei Kopfsprünge) — ABER optional: man kann
 * ihn auch einfach umlaufen und die Zielfahne erreichen (fair für beide Kinder).
 */
export function createCityLevel(): LevelData {
  const width = 208;
  const height = 22;
  const ground = 13;

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addOneWayRow } = bindHelpers({ tiles, width, height, groundRow: ground });
  const entities: EntitySpawn[] = [];
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);

  const powerBlocks: Record<string, string[]> = { super: [], heart: [], fire: [], magnet: [], cape: [], shield: [] };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q); powerBlocks[kind].push(`${col},${row}`);
  };

  // Müllgrube in einer Lücke [c0,c1]: trübe Brühe (Lava-Tiles → im City-Theme als
  // Müll gezeichnet) ab `topRow` bis zum Boden. Reinfallen = Treffer.
  const addGarbage = (c0: number, c1: number, topRow = 17) => {
    for (let c = c0; c <= c1; c++) {
      set(c, topRow, TileType.LAVA_TOP);
      for (let r = topRow + 1; r < height; r++) set(c, r, TileType.LAVA);
    }
  };

  // ── Häuserzeile (Dächer) — solide Blöcke bis zum Boden ──
  const buildings: [number, number][] = [
    [0, 22], [26, 48], [52, 76], [80, 104], [108, 132], [136, 162], [166, 207],
  ];
  for (const [c0, c1] of buildings) fillGround(c0, c1, ground);

  // ── Müllgruben in den Lücken ──
  const gaps: [number, number][] = [
    [23, 25], [49, 51], [77, 79], [105, 107], [133, 135], [163, 165],
  ];
  for (const [c0, c1] of gaps) addGarbage(c0, c1);

  // ── Tiefergelegene Gassen (optional, mit Münzen) in zwei Lücken ──
  addOneWayRow(49, 3, ground + 3); addCoinRow(49, 3, ground + 1);   // Gasse 1 (col 49-51)
  addOneWayRow(133, 3, ground + 3); addCoinRow(133, 3, ground + 1); // Gasse 2 (col 133-135)

  // ── Aufbauten & Belohnungen auf den Dächern ──
  set(6, ground - 1, TileType.SIGN);
  addBlock('super', 10, ground - 4);
  addBlock('heart', 18, ground - 4);
  addCoinRow(30, 4, ground - 5);
  addOneWayRow(58, 4, ground - 4); addCoinRow(59, 3, ground - 6);   // Dach-Sims
  addBlock('fire', 66, ground - 4);
  set(90, ground - 1, TileType.SIGN);
  addBlock('shield', 96, ground - 4);
  addCoinArc(116, 4, ground - 2, 3);
  addOneWayRow(146, 4, ground - 4); addCoinRow(147, 3, ground - 6);
  addBlock('heart', 156, ground - 4);
  addCoinArc(176, 5, ground - 2, 3);

  // ── Gegner: Ratten (flink) & Mülltonnen (schwerfällig) ──
  const R = (col: number, row = ground - 1) => entities.push({ type: EntityType.RAT, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const T = (col: number, row = ground - 2) => entities.push({ type: EntityType.TRASH_CAN, x: col * TILE_SIZE, y: row * TILE_SIZE });
  // Auf Dach-Mitten platziert (fair: ≥2 Kacheln Abstand zu Grubenrändern).
  R(14); T(34); R(44); R(60); T(70); R(86); R(100); T(120); R(128); T(150); R(158); R(172);

  // ── Sprengbrunnen (Geysire) — auf den Dächern, zum Drüberspringen ──
  const Gy = (col: number) => entities.push({ type: EntityType.GEYSER, x: col * TILE_SIZE, y: ground * TILE_SIZE - 12 });
  Gy(38); Gy(64); Gy(112); Gy(154);

  // ── Finale: Riesenratten-Boss (optional) + Zielfahne ──
  // Ohne bossGate → man kann am Boss vorbei direkt ins Ziel laufen.
  entities.push({ type: EntityType.RAT_BOSS, x: 186 * TILE_SIZE, y: (ground - 3) * TILE_SIZE });

  return {
    name: 'Stadt — Über den Dächern',
    theme: 'city',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 200 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 92, row: ground },
    signs: [
      { col: 6, row: ground - 1, lines: ['Willkommen in der Stadt!', 'Spring von Dach zu Dach.'] },
      { col: 90, row: ground - 1, lines: ['Vorsicht: Müllgruben & Geysire!', 'Der Boss ist optional.'] },
    ],
    heartBlocks: powerBlocks.heart,
    fireBlocks: powerBlocks.fire,
    magnetBlocks: powerBlocks.magnet,
    capeBlocks: powerBlocks.cape,
    shieldBlocks: powerBlocks.shield,
    superBlocks: powerBlocks.super,
    specialCoins: [
      '59,' + (ground - 7),    // über dem ersten Dach-Sims
      '116,' + (ground - 5),   // über dem Münz-Bogen (Beat Mitte)
      '178,' + (ground - 6),   // kurz vor dem Finale
    ],
  };
}
