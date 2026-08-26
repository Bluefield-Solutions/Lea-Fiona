import { TileType, TILE_SIZE, EntityType } from './constants';
import { smoothGroundY, type HillSpec } from './terrain';

export interface EntitySpawn {
  type: EntityType;
  x: number;
  y: number;
}

// Tile shorthands so the level layouts read like a literal map.
export const T = {
  EMPTY: TileType.EMPTY,
  GROUND: TileType.GROUND,
  GROUND_TOP: TileType.GROUND_TOP,
  PLATFORM: TileType.PLATFORM,
  Q: TileType.QUESTION_BLOCK,
  BRICK: TileType.BRICK,
  PIPE_TOP_LEFT: TileType.PIPE_TOP_LEFT,
  PIPE_TOP_RIGHT: TileType.PIPE_TOP_RIGHT,
  PIPE_BODY_LEFT: TileType.PIPE_BODY_LEFT,
  PIPE_BODY_RIGHT: TileType.PIPE_BODY_RIGHT,
  STONE: TileType.STONE,
  WOOD: TileType.WOOD_PLATFORM,
  MOSS: TileType.MOSS_GROUND,
  VINE: TileType.DECORATION_VINE,
  FLOWER: TileType.DECORATION_FLOWER,
  WATER_TOP: TileType.WATER_TOP,
  WATER: TileType.WATER,
  LAVA_TOP: TileType.LAVA_TOP,
  LAVA: TileType.LAVA,
  ICE: TileType.ICE,
  ICE_TOP: TileType.ICE_TOP,
  CASTLE: TileType.CASTLE_STONE,
  CASTLE_TOP: TileType.CASTLE_TOP,
  SPACE_METAL: TileType.SPACE_METAL,
  SPACE_TOP: TileType.SPACE_TOP,
  DEEP_WATER: TileType.DEEP_WATER,
  SEAWEED: TileType.SEAWEED,
  SPIKE: TileType.SPIKE,
  DECO: TileType.DECORATION_PROP,
};


// ---------------------------------------------------------------------------
// Free-function helpers used by the `create*Level` factories. Centralizing them
// here removes the per-level duplication of `set/fillGround/addBricks/...`. Each
// level just calls `bindHelpers(g)` once and destructures the helpers it needs.
// ---------------------------------------------------------------------------
export interface TileGrid {
  tiles: TileType[][];
  width: number;
  height: number;
  /** Boden-Bezugsreihe (Default height-2); bei unterirdischen Levels explizit. */
  groundRow?: number;
}

export function bindHelpers(g: TileGrid) {
  const set = (col: number, row: number, tile: TileType) => {
    if (row >= 0 && row < g.height && col >= 0 && col < g.width) {
      g.tiles[row][col] = tile;
    }
  };
  const fillGround = (
    startCol: number,
    endCol: number,
    topRow: number,
    top: TileType = TileType.GROUND_TOP,
    body: TileType = TileType.GROUND,
  ) => {
    for (let col = startCol; col <= endCol; col++) {
      set(col, topRow, top);
      for (let row = topRow + 1; row < g.height; row++) set(col, row, body);
    }
  };
  return {
    set,
    fillGround,
    fillMossGround: (startCol: number, endCol: number, topRow: number) =>
      fillGround(startCol, endCol, topRow, TileType.MOSS_GROUND, TileType.GROUND),
    addBricks: (startCol: number, length: number, row: number) => {
      for (let col = startCol; col < startCol + length; col++) set(col, row, TileType.BRICK);
    },
    addPipe: (col: number, topRow: number) => {
      set(col, topRow, TileType.PIPE_TOP_LEFT);
      set(col + 1, topRow, TileType.PIPE_TOP_RIGHT);
      for (let row = topRow + 1; row < g.height; row++) {
        set(col, row, TileType.PIPE_BODY_LEFT);
        set(col + 1, row, TileType.PIPE_BODY_RIGHT);
      }
    },
    addStairs: (
      startCol: number,
      dir: number,
      maxH: number,
      baseRow: number,
      tile: TileType = TileType.STONE,
    ) => {
      for (let step = 0; step < maxH; step++) {
        const col = dir > 0 ? startCol + step : startCol - step;
        for (let row = baseRow - step - 1; row < baseRow; row++) set(col, row, tile);
      }
    },
    addWoodBridge: (startCol: number, length: number, row: number) => {
      for (let col = startCol; col < startCol + length; col++) set(col, row, TileType.WOOD_PLATFORM);
    },
    // Semisolid one-way platform run (jump through from below, land on top).
    addOneWayRow: (startCol: number, length: number, row: number) => {
      for (let col = startCol; col < startCol + length; col++) set(col, row, TileType.WOOD_PLATFORM);
    },
    addVines: (col: number, fromRow: number, toRow: number) => {
      for (let row = fromRow; row <= toRow; row++) set(col, row, TileType.DECORATION_VINE);
    },
    addWater: (startCol: number, endCol: number) => {
      const gr = g.groundRow ?? g.height - 2;
      for (let col = startCol; col <= endCol; col++) {
        set(col, gr, TileType.WATER_TOP);
        set(col, gr + 1, TileType.WATER);
        // Soliden Beckenboden unter dem Wasser (sonst Loch bei height > gr+2).
        for (let row = gr + 2; row < g.height; row++) set(col, row, TileType.GROUND);
      }
    },
    addCeiling: (startCol: number, endCol: number) => {
      for (let col = startCol; col <= endCol; col++) {
        set(col, 0, TileType.STONE);
        set(col, 1, TileType.STONE);
      }
    },
    addRockFormation: (startCol: number, w: number, h: number, baseRow: number) => {
      for (let col = startCol; col < startCol + w; col++) {
        for (let row = baseRow - h; row < baseRow; row++) set(col, row, TileType.STONE);
      }
    },
    // Sprungfeder: federnder Note-Block, der die Spielerin beim Landen hoch
    // katapultiert. Ideal über Lücken oder als Zugang zu Bonus-Bereichen.
    addNoteBlock: (col: number, row: number) => set(col, row, TileType.NOTE_BLOCK),
  };
}

/**
 * Kopffreiheit über Hügel-Anstiegen GARANTIEREN (zentral für alle Hügel-Welten).
 *
 * Auf einem ansteigenden Hügel rückt die begehbare Oberfläche nach oben und kommt
 * einem fest platzierten Block (z.B. Ziegel auf ground-4) immer näher. Sobald die
 * Kopfhöhe der GROSSEN Spielfigur (80px = 2,5 Kacheln) in die Blockzeile ragt,
 * bleibt die Figur beim Durchrennen hängen. Diese Funktion baut solche
 * blockierenden Tiles im Lauf-Korridor über der Kurve aus.
 *
 * Frühere per-Level-Kopien nutzten `Math.ceil(surfRow - 3.2)`; das RUNDETE einen
 * Block, der exakt an der Korridor-Grenze liegt (Bruch bei surfRow≈12,2, Block
 * auf Zeile 9), WEG aus dem Fenster → Figur blieb hängen. Korrekt ist
 * `Math.floor(surfRow - 2,6)` (2,5 Kacheln große Figur + kleine Marge): fängt den
 * Grenzfall sauber, ohne höher gelegene, absichtlich erreichbare Plattformen zu
 * entfernen. Das ±1-Spalten-Fenster deckt die Figurbreite an der Flanke ab.
 */
export function clearHillHeadroom(
  tiles: TileType[][], hills: HillSpec[] | undefined, width: number, height: number,
): void {
  if (!hills || hills.length === 0) return;
  const CLEAR = 2.6; // große Figur (2,5 Kacheln) + kleine Marge
  const blockTypes = new Set<TileType>([
    TileType.QUESTION_BLOCK, TileType.QUESTION_BLOCK_USED, TileType.NOTE_BLOCK,
    TileType.BRICK, TileType.DONUT_BLOCK, TileType.WOOD_PLATFORM, TileType.PLATFORM, TileType.STONE,
  ]);
  for (let c = 0; c < width; c++) {
    let hi: number | null = null, lo: number | null = null; // hi = kleinstes y (höchste Kurve)
    for (const dc of [-1, 0, 1]) {
      const s = smoothGroundY(hills, (c + dc) * TILE_SIZE + TILE_SIZE / 2);
      if (s === null) continue;
      if (hi === null || s < hi) hi = s;
      if (lo === null || s > lo) lo = s;
    }
    if (hi === null || lo === null) continue;
    const topRow = Math.floor(hi / TILE_SIZE - CLEAR);
    const botRow = Math.ceil(lo / TILE_SIZE); // bis knapp unter die tiefste Kurve
    for (let r = topRow; r < botRow; r++) {
      if (r < 0 || r >= height) continue;
      if (blockTypes.has(tiles[r][c])) tiles[r][c] = TileType.EMPTY;
    }
  }
}

export function bindCoinHelpers(entities: EntitySpawn[]) {
  const addCoin = (col: number, row: number) => {
    entities.push({ type: EntityType.COIN, x: col * TILE_SIZE + 6, y: row * TILE_SIZE + 6 });
  };
  return {
    addCoin,
    addCoinRow: (startCol: number, count: number, row: number) => {
      for (let i = 0; i < count; i++) addCoin(startCol + i, row);
    },
    addCoinArc: (startCol: number, count: number, baseRow: number, arcHeight: number) => {
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const rowOffset = Math.round(-arcHeight * Math.sin(t * Math.PI));
        addCoin(startCol + i, baseRow + rowOffset);
      }
    },
  };
}

/** Warp-Spezifikation (inline, um zirkulären Import aus level.ts zu vermeiden). */
type WarpSpec = { from: { col: number; row: number }; to: { x: number; y: number } };


/**
 * Baut einen geheimen UNTERIRDISCHEN Bonus-Raum (Mario-Stil) plus Eingangs-
 * und Rück-Röhre und gibt die zwei Warp-Spezifikationen zurück. Setzt voraus,
 * dass das Level genug Höhe hat (height >= ground + 11) und der Untergrund mit
 * Erde gefüllt ist — der Raum wird in den Untergrund hineingehöhlt, getrennt
 * durch zwei Erdreihen unter dem Boden. So gibt es keinen Kammerboden über dem
 * Spielfeld, der Sprünge oder Power-Blöcke stören könnte.
 */
export function buildUndergroundRoom(o: {
  set: (col: number, row: number, t: TileType) => void;
  addCoinRow: (startCol: number, count: number, row: number) => void;
  ground: number;
  entryCol: number;   // Eingangs-Röhre (col, col+1), Mündung auf ground-2
  roomL: number;      // linke Raumkante; Raum = roomL .. roomL+13
}): WarpSpec[] {
  const { set, addCoinRow, ground, entryCol, roomL } = o;
  const roomTop = ground + 3;       // erste Hohlraum-Reihe (Erde ground+1..+2 trennt)
  const roomBot = roomTop + 5;      // letzte Hohlraum-Reihe
  const roomR = roomL + 13;
  // Eingangs-Röhre: ragt zwei Tiles aus dem Boden (Mündung row ground-2).
  set(entryCol, ground - 2, TileType.PIPE_TOP_LEFT);
  set(entryCol + 1, ground - 2, TileType.PIPE_TOP_RIGHT);
  for (let r = ground - 1; r <= ground + 1; r++) {
    set(entryCol, r, TileType.PIPE_BODY_LEFT);
    set(entryCol + 1, r, TileType.PIPE_BODY_RIGHT);
  }
  // Hohlraum in den Untergrund höhlen (row roomTop..roomBot leeren).
  for (let c = roomL; c <= roomR; c++) {
    for (let r = roomTop; r <= roomBot; r++) set(c, r, TileType.EMPTY);
  }
  // Münzbelohnung.
  addCoinRow(roomL + 2, 10, roomTop + 1);
  addCoinRow(roomL + 2, 10, roomTop + 2);
  // Rück-Röhre auf dem Raum-Boden (Mündung row roomBot).
  set(roomR - 3, roomBot, TileType.PIPE_TOP_LEFT);
  set(roomR - 2, roomBot, TileType.PIPE_TOP_RIGHT);
  return [
    { from: { col: entryCol, row: ground - 2 }, to: { x: (roomL + 2) * TILE_SIZE, y: roomTop * TILE_SIZE } },
    { from: { col: roomR - 3, row: roomBot }, to: { x: (entryCol + 3) * TILE_SIZE, y: (ground - 2) * TILE_SIZE } },
  ];
}

/**
 * QS-Fix (2026-08-25): rettet Power-Up-Blöcke, die über Hügeln von
 * `clearHillHeadroom` gelöscht wurden (Item erschien nie). MUSS NACH der
 * Hügel-/Terrain-Bearbeitung aufgerufen werden.
 *
 * Für jeden registrierten Power-Block (in `powerBlocks`), dessen Kachel kein
 * QUESTION_BLOCK (mehr) ist: erst die Engine-Toleranz (±2) prüfen und ggf. auf
 * einen nahen ?-Block umbiegen; sonst einen frischen ?-Block sicher ÜBER der
 * geglätteten Hügel-Oberfläche der Spalte platzieren (erreichbar, außerhalb des
 * Kopffreiheits-Bandes) und den Array-Eintrag entsprechend korrigieren. Mutiert
 * `tiles` und die Arrays in `powerBlocks` in-place. Gibt die Änderungen zurück.
 */
export function fixPowerBlocksOverHills(opts: {
  tiles: TileType[][];
  hills: HillSpec[] | undefined;
  width: number;
  height: number;
  groundRow: number;
  powerBlocks: Record<string, string[]>;
}): string[] {
  const { tiles, hills, height, groundRow, powerBlocks } = opts;
  const isQ = (c: number, r: number) => tiles[r]?.[c] === TileType.QUESTION_BLOCK;
  const isEmpty = (c: number, r: number) => r >= 0 && r < height && (tiles[r]?.[c] ?? TileType.EMPTY) === TileType.EMPTY;
  const moved: string[] = [];
  for (const kind of Object.keys(powerBlocks)) {
    const arr = powerBlocks[kind];
    for (let i = 0; i < arr.length; i++) {
      const [c, r] = arr[i].split(',').map(Number);
      if (isQ(c, r)) continue; // bereits gültig
      // 1) Engine-Toleranz: nahen ?-Block (±2) suchen und darauf umbiegen.
      let remap: [number, number] | null = null;
      for (let rad = 1; rad <= 2 && !remap; rad++)
        for (let dr = -rad; dr <= rad && !remap; dr++)
          for (let dc = -rad; dc <= rad && !remap; dc++)
            if (Math.max(Math.abs(dr), Math.abs(dc)) === rad && isQ(c + dc, r + dr)) remap = [c + dc, r + dr];
      if (remap) { arr[i] = `${remap[0]},${remap[1]}`; moved.push(`${kind} ${c},${r}→${arr[i]} (umgebogen)`); continue; }
      // 2) Frischen ?-Block über der Oberfläche platzieren.
      const sy = smoothGroundY(hills, c * TILE_SIZE + TILE_SIZE / 2);
      const surfR = sy !== null ? Math.round(sy / TILE_SIZE) : groundRow;
      let tr = surfR - 4; // 4 über der Oberfläche: bewusster Sprung, außerhalb des Clear-Bandes
      if (!isEmpty(c, tr)) { // ausweichen, falls belegt
        let alt = -1;
        for (const cand of [surfR - 3, surfR - 5, surfR - 2, surfR - 6]) { if (isEmpty(c, cand)) { alt = cand; break; } }
        if (alt >= 0) tr = alt;
      }
      if (tr < 0) tr = 0;
      tiles[tr][c] = TileType.QUESTION_BLOCK;
      arr[i] = `${c},${tr}`;
      moved.push(`${kind} ${c},${r}→${c},${tr} (neu gesetzt)`);
    }
  }
  return moved;
}

/**
 * QS-Invariante (2026-08-26): keine Münze darf in einer Solid-Kachel stecken
 * (sonst optisch „im Block" und schwer/nicht einsammelbar). Hebt betroffene
 * Münz-Entities (COIN/COIN_SPINNING/SPECIAL_COIN) bis zu 4 Kacheln nach oben in
 * die erste freie Zelle derselben Spalte. Rein additive Korrektur, idempotent.
 * Hazards (Wasser/Lava/Stachel), Einweg-Plattformen & Deko gelten NICHT als
 * solid — Münzen dürfen bewusst darüber/darauf liegen. Gibt die Anzahl der
 * gehobenen Münzen zurück.
 */
export function liftCoinsOffSolids(level: {
  tiles: TileType[][]; entities: EntitySpawn[]; width: number; height: number;
}): number {
  const SOLID = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 19, 21, 24, 25, 26, 27, 28, 29, 34, 35]);
  const { tiles, entities, width, height } = level;
  const solidAt = (c: number, r: number) =>
    r >= 0 && r < height && c >= 0 && c < width && SOLID.has(tiles[r]?.[c] as number);
  let lifted = 0;
  for (const e of entities) {
    if (e.type !== EntityType.COIN && e.type !== EntityType.COIN_SPINNING && e.type !== EntityType.SPECIAL_COIN) continue;
    const c = Math.round(e.x / TILE_SIZE);
    const r = Math.round(e.y / TILE_SIZE);
    if (!solidAt(c, r)) continue;
    let nr = r, guard = 0;
    while (solidAt(c, nr) && guard < 4) { nr--; guard++; }
    if (nr !== r && !solidAt(c, nr)) { e.y += (nr - r) * TILE_SIZE; lifted++; }
  }
  return lifted;
}
