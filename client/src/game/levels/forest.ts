import { TileType, TILE_SIZE, EntityType } from '../constants';
import { smoothGroundY } from '../terrain';
import { bindHelpers, bindCoinHelpers, clearHillHeadroom, fixPowerBlocksOverHills } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const FL = TileType.DECORATION_FLOWER;
const P = TileType.DECORATION_PROP;

/**
 * Level 3 „Wald der Dämmerung".
 *
 * Ein ruhiger, wunderschöner Waldspaziergang: Man startet am hellen Waldrand
 * im Morgenlicht; je weiter man nach rechts läuft, desto tiefer sinkt die Sonne
 * — Tag → goldene Dämmerung → Nacht mit Sternenhimmel und Glühwürmchen. Der
 * Tag-/Nacht-Verlauf wird im Hintergrund (drawForestBackground) aus dem
 * Level-Fortschritt (camera.x / worldWidth) berechnet — die Levelbreite spannt
 * also den Zeit-Bogen auf. Bewusst zugänglich (Level 3): sanftes Pacing, faire
 * Sprünge (Lücken ≤ 3), Blöcke ≤ ground-4.
 */
export function createForestLevel(): LevelData {
  const width = 216;
  const height = 22;
  const ground = 13;

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addWoodBridge, addVines, addWater, addOneWayRow } =
    bindHelpers({ tiles, width, height, groundRow: ground });

  const powerBlocks: Record<string, string[]> = { super: [], heart: [], fire: [], magnet: [], cape: [], shield: [] };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  // ── BEAT 1 — Waldrand im Morgenlicht (0–30) ──
  fillGround(0, 30, ground);
  set(6, ground - 1, TileType.SIGN);
  addBlock('super', 9, ground - 4);
  addBlock('heart', 15, ground - 4);
  set(4, ground - 1, FL); set(11, ground - 1, P); set(24, ground - 1, FL);

  // ── BEAT 2 — Erster Waldbach (31–56) ──
  addWater(31, 32);
  fillGround(33, 56, ground);
  addWoodBridge(38, 4, ground - 3);
  addBlock('fire', 45, ground - 4);
  addOneWayRow(50, 3, ground - 4);
  set(52, ground - 1, P);

  // ── BEAT 3 — Lichtung / Münz-Garten (57–86) ──
  fillGround(57, 86, ground);
  addOneWayRow(60, 3, ground - 3);
  addOneWayRow(66, 3, ground - 4);
  addBlock('magnet', 64, ground - 4);
  set(72, ground - 1, FL); set(80, ground - 1, P);

  // ── BEAT 4 — Gegner + Checkpoint (87–120) ──
  addWater(87, 88);
  fillGround(89, 120, ground);
  addBricks(96, 3, ground - 4); set(97, ground - 4, Q);
  set(104, ground - 1, TileType.SIGN);
  // Verstecktes Treppchen zur 2. Sonder-Münze (fair in zwei Sprüngen erreichbar,
  // seitlich neben der Checkpoint-Fahne bei Spalte 110).
  addOneWayRow(102, 2, ground - 3);   // Stufe 1 (row 10)
  addOneWayRow(106, 2, ground - 5);   // Stufe 2 (row 8) → Münze 1 Tile darüber

  // ── BEAT 5 — Aufstieg, die Dämmerung beginnt (121–156) ──
  fillGround(121, 156, ground);
  addOneWayRow(124, 3, ground - 4);
  addOneWayRow(130, 3, ground - 5);
  addVines(134, ground - 9, ground - 6);
  addBlock('shield', 140, ground - 4);
  set(147, ground - 1, P);

  // ── BEAT 6 — Kombination, es wird Nacht (157–188) ──
  addWater(157, 158);
  fillGround(159, 188, ground);
  addBricks(164, 3, ground - 4); set(165, ground - 4, Q);
  addOneWayRow(168, 2, ground - 3);   // Stufe (row 10) → macht die hohe Plattform fair erreichbar
  addOneWayRow(172, 4, ground - 5);
  addBlock('heart', 179, ground - 4);
  set(184, ground - 1, P);

  // ── BEAT 7 — Finale unter dem Sternenhimmel (189–215) ──
  fillGround(189, 215, ground);
  set(203, ground - 1, FL); set(210, ground - 1, P);

  // ── Gegner — sparsam & fair ──
  const entities: EntitySpawn[] = [];
  const G = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const K = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Ba = (col: number, row: number) => entities.push({ type: EntityType.BAT, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Sp = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Cr = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const De = (col: number, row = ground - 2) => entities.push({ type: EntityType.DEER, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Bd = (col: number, row = ground - 2) => entities.push({ type: EntityType.DEER_BROWN, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Bo = (col: number, row = ground - 3) => entities.push({ type: EntityType.DEER_BOSS, x: col * TILE_SIZE, y: row * TILE_SIZE });

  G(20); G(41); K(72); G(100); Ba(128, ground - 7); K(150); G(169);
  Sp(61); Cr(58); Cr(81);
  // Rehe — sanfte Wald-Bewohner mit gut vorhersehbaren Sätzen.
  //   Morgenlicht/Lichtung → braune Rehe · Dämmerung/Nacht → Eisrehe.
  Bd(18); Bd(66);       // braune Rehe am Anfang (Tag)
  De(128); De(176);     // Eisrehe später (Dämmerung → Nacht)
  // Finale: großer Eisreh-Boss unter dem Sternenhimmel — drei Kopfsprünge!
  Bo(203);

  // ── Münzen ──
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  // Bodenstampf-Tor (Audit C2): Ziegel über einer Münz-Grube (BEAT 3, Lichtung).
  // Bodenstampfer (↓ in der Luft) bricht durch → Münzen; Drüberlaufen bleibt normal.
  for (const c of [74, 75, 76]) { set(c, ground, TileType.BRICK); set(c, ground + 1, TileType.EMPTY); }
  addCoinRow(74, 3, ground + 1);
  // Feuer-Tunnel (Audit C1 · Rollout): überdachte Bonus-Nische im flachen BEAT 4,
  // Eingang durch eine Feuer-Ranke gesperrt. Die Feuerblume aus BEAT 2 (col 45)
  // brennt sie weg → das Feuer-Power-Up bekommt eine echte Aufgabe. Optionale
  // Sackgasse (Münzen), nie auf dem Flaggen-Pfad; drüber läuft der Weg fair weiter.
  addBricks(113, 4, ground - 3);           // Decke cols 113–116 (drüber laufbar)
  set(116, ground - 1, TileType.BRICK);    // rechte Wand
  set(116, ground - 2, TileType.BRICK);
  addCoinRow(114, 2, ground - 2);          // Belohnung im Tunnel
  addCoinRow(114, 2, ground - 1);
  entities.push({ type: EntityType.FIRE_BARRIER, x: 113 * TILE_SIZE, y: ground * TILE_SIZE, hTiles: 2 });
  addCoinRow(9, 4, ground - 3);
  addCoinArc(31, 3, ground - 2, 2);
  addCoinRow(38, 4, ground - 5);
  addCoinRow(50, 3, ground - 6);
  addCoinArc(57, 4, ground - 2, 2);
  addCoinRow(60, 3, ground - 5);
  addCoinRow(66, 3, ground - 6);
  addCoinArc(87, 3, ground - 2, 2);
  addCoinRow(124, 3, ground - 6);
  addCoinRow(130, 3, ground - 7);
  addCoinArc(157, 3, ground - 2, 2);
  addCoinRow(172, 4, ground - 7);
  addCoinRow(200, 5, ground - 6);

  // ── Boden-Deko (nicht-solid, theme-abhängig) ──
  for (const c of [16, 28, 45, 73, 90, 108, 122, 143, 155, 170, 205]) set(c, ground - 1, TileType.DECORATION_PROP);

  // ── Sanft rollender Waldboden ──
  const terrainHills = [
    { startCol: 10, endCol: 22, peakTiles: 2.0, baseRow: ground, skew: 0.1 },
    { startCol: 57, endCol: 82, peakTiles: 2.6, baseRow: ground, skew: 0.2 },
    { startCol: 121, endCol: 140, peakTiles: 3.2, baseRow: ground, skew: 0.2 },
    { startCol: 189, endCol: 213, peakTiles: 4.2, baseRow: ground, skew: 0.3 },
  ];
  for (const h of terrainHills)
    for (let c = h.startCol; c <= h.endCol; c++) set(c, ground, TileType.GROUND);

  // Boden-Gegner/Objekte auf die Hügelkurve heben.
  const groundEnemies = new Set<EntityType>([EntityType.GOOMBA, EntityType.KOOPA, EntityType.SPIKE_BALL, EntityType.APE, EntityType.DEER, EntityType.DEER_BROWN, EntityType.DEER_BOSS]);
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

  // Deko unter Hügelkurven entfernen.
  for (let c = 0; c < width; c++) {
    const t = tiles[ground - 1][c];
    if (t !== TileType.DECORATION_PROP && t !== TileType.DECORATION_FLOWER) continue;
    const sy = smoothGroundY(terrainHills, c * TILE_SIZE + TILE_SIZE / 2);
    if (sy !== null && sy < (ground - 0.25) * TILE_SIZE) set(c, ground - 1, TileType.EMPTY);
  }

  clearHillHeadroom(tiles, terrainHills, width, height);
  // QS-Fix: über Hügeln von clearHillHeadroom gelöschte Power-Up-Blöcke retten.
  fixPowerBlocksOverHills({ tiles, hills: terrainHills, width, height, groundRow: ground, powerBlocks });

  return {
    name: 'Wald der Dämmerung',
    theme: 'forest',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    terrainHills,
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 212 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 110, row: ground },
    signs: [
      { col: 6, row: ground - 1, lines: ['Willkommen im Wald!', 'Lauf nach rechts — es wird Abend …'] },
      { col: 104, row: ground - 1, lines: ['Die Dämmerung bricht an.', 'Bald leuchten die Sterne.'] },
    ],
    heartBlocks: powerBlocks.heart,
    fireBlocks: powerBlocks.fire,
    magnetBlocks: powerBlocks.magnet,
    capeBlocks: powerBlocks.cape,
    shieldBlocks: powerBlocks.shield,
    superBlocks: powerBlocks.super,
    specialCoins: [
      '52,' + (ground - 5),   // über der Steg-Plattform (Beat 2)
      '107,' + (ground - 6),  // über dem Treppchen neben der Checkpoint-Fahne (Beat 4)
      '175,' + (ground - 7),  // über der hohen Plattform (Beat 6)
    ],
  };
}
