import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers } from '../levelHelpers';
import { smoothGroundY } from '../terrain';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const PILLOW = TileType.NOTE_BLOCK;    // Sprungkissen (weicher Bounce, leicht hoch)
const BLOCK = TileType.STONE;          // weicher Bauklotz
const DP = TileType.DECORATION_PROP;   // Kuscheltier-Deko
const SIGN = TileType.SIGN;

/**
 * World 2: Plüsch-Traumland — die Kuscheltierwelt.
 * Ein gemütliches Traum-Kinderzimmer voller Kuscheltiere. Sehr sanft (keine
 * Todesgruben, weiche Sprungkissen, breite Stufen). Fiona ist selbst ein
 * Kuscheltier und verwandelt sich mit dem Power-Zustand: klein = Äffchen,
 * groß (Süßigkeit) = Panda, Feuerblume = Elefant. Gegner sind vier knuffige
 * Plüsch-Dinos (alle aus demselben Bild abgeleitet, umgefärbt): oranger Läufer,
 * kleiner grüner Hüpf-Dino, großer blauer Panzer-Dino (rollt sich beim
 * Draufhüpfen ein) und ein rosa Flatter-Dino, der sanft durch die Luft schwebt.
 */
export function createPlushLevel(): LevelData {
  const width = 176;
  const height = 20;
  const ground = 14;

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, addOneWayRow } = bindHelpers({ tiles, width, height, groundRow: ground });
  const entities: EntitySpawn[] = [];
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);

  // Power-Up-Blöcke — großzügig, damit alle drei Fiona-Formen früh erlebbar sind.
  const powerBlocks: Record<string, string[]> = { super: [], heart: [], fire: [], star: [], magnet: [] };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  // Durchgehender weicher Boden — KEINE Todesgruben (kindgerecht).
  for (let c = 0; c < width; c++) {
    set(c, ground, TileType.GROUND_TOP);
    for (let r = ground + 1; r < height; r++) set(c, r, TileType.GROUND);
  }

  // Geräte-/Deko-Helfer.
  const Pillow = (col: number) => set(col, ground - 1, PILLOW);          // Sprungkissen
  const Blocks = (col: number, w: number, h: number) => {               // weiche Bauklotz-Stufe
    for (let dc = 0; dc < w; dc++) for (let r = 0; r < h; r++) set(col + dc, ground - 1 - r, BLOCK);
  };
  const Walk = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });    // oranger Läufer-Dino
  const Shell = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });    // blauer Panzer-Dino
  const Hop = (col: number, row = ground - 2) => entities.push({ type: EntityType.KANGAROO, x: col * TILE_SIZE, y: row * TILE_SIZE });  // grüner Hüpf-Dino
  const Fly = (col: number, row = ground - 4) => entities.push({ type: EntityType.BAT, x: col * TILE_SIZE, y: row * TILE_SIZE });      // rosa Flatter-Dino
  const Mus = (col: number, row = ground - 2) => entities.push({ type: EntityType.MOUSE, x: col * TILE_SIZE, y: row * TILE_SIZE });   // Plüsch-Mäuschen (flieht, schnuppert)
  const Plush = (col: number) => set(col, ground - 1, DP);              // Kuscheltier
  // Kuschel-Mäuschen — über die Welt verteilt, mit eigenem Zuhause (Mauseloch).
  Mus(24); Mus(52); Mus(86); Mus(140);

  // === BEAT 1 — Aufwachen (0–26): ruhiger Start, Verwandlungen früh. ===
  set(5, ground - 1, SIGN);
  Plush(8); Plush(15); Plush(23);
  addCoinRow(9, 4, ground - 3);
  addBlock('heart', 12, ground - 4);   // Süßigkeit (Bonbon) → Panda (gleich zu Beginn!)
  // Paket 2 · Doppelsprung-Belohnung (Welt 2): hoher Münz-Bogen. Enden mit
  // einem Sprung erreichbar, Spitze (Boden-8) NUR mit Doppelsprung.
  addCoinArc(15, 5, ground - 3, 5);
  addBlock('fire', 20, ground - 4);    // Feuerblume → Elefant (gleich zu Beginn)

  // === BEAT 2 — Kissen-Hüpfer (27–58): weiche Sprungkissen, leicht hoch. ===
  Pillow(30); Pillow(39);
  addOneWayRow(33, 5, ground - 4);     // weiches Kissen-Sims (Einweg)
  addCoinArc(30, 4, ground - 3, 2);
  addCoinRow(34, 4, ground - 6);
  Fly(44, ground - 5);                 // rosa Flatter-Dino (sanft schwebend, hoch)
  Plush(45);
  Walk(49);                            // erster Plüsch-Dino (sanft, viel Platz)
  addCoinArc(47, 5, ground - 4, 2);    // Münz-Bogen als Belohnung übern ersten Dino
  addBlock('heart', 53, ground - 4);

  // === BEAT 3 — Weiche Bauklötze (59–92): sanfte Stufen hoch/runter. ===
  Blocks(62, 3, 1); Blocks(69, 3, 2); Blocks(77, 2, 2);
  addCoinArc(63, 3, ground - 4, 2);
  addCoinArc(70, 3, ground - 5, 2);
  Plush(60); Plush(74); Plush(85);
  Shell(82);                           // Stego-Schild
  addBlock('magnet', 89, ground - 5);

  // === GEHEIME WOLKEN-NISCHE (versteckt): vom hohen Bauklotz (77) aus nach
  // oben springen — eine weiche Wolken-Nische mit Münz-Schatz + Kuscheltier. ===
  addOneWayRow(79, 6, ground - 5);     // versteckte weiche Wolken-Nische (Einweg)
  addCoinArc(80, 5, ground - 7, 2);    // Münz-Belohnung über der Nische
  set(81, ground - 6, DP);             // Kuscheltier als „Schatz" auf der Nische

  // === BEAT 4 — Spielzeugregal & Mobile (93–126): Regal-Sims, Roller-Dino. ===
  addOneWayRow(96, 6, ground - 3);     // unteres Regal
  addOneWayRow(101, 5, ground - 6);    // oberes Regal (versetzt)
  addCoinRow(97, 6, ground - 4);
  addCoinRow(102, 4, ground - 7);
  Pillow(111);
  Hop(116);                            // grüner Hüpf-Dino (sanftes Springen, offene Fläche)
  addCoinArc(112, 4, ground - 5, 2);   // Münz-Bogen über der Hüpf-Dino-Fläche
  Plush(107); Plush(122);
  Fly(104, ground - 6);                // zweiter Flatter-Dino (schwebt übers Regal)
  addBlock('fire', 119, ground - 4);   // Elefant nochmal erreichbar

  // === BEAT 5 — Kuschelecke-Finale (127–175): sanfte Treppe zum Ziel. ===
  addBlock('star', 130, ground - 5);   // Highlight-Stern
  addCoinArc(132, 5, ground - 4, 3);
  Walk(141);
  Blocks(147, 2, 1); Blocks(151, 2, 2); Blocks(155, 2, 3);  // sanfte Treppe
  Plush(137); Plush(145); Plush(159); Plush(169);
  addCoinArc(148, 5, ground - 6, 2);   // Münz-Bogen über der Kuschel-Treppe
  addBlock('heart', 162, ground - 4);  // Süßigkeit (Bonbon) → Panda fürs Finale
  addCoinRow(164, 4, ground - 3);

  // Schutz-Logik — Boden-Gegner nie im Boden versenkt.
  const groundEnemies = new Set<EntityType>([EntityType.GOOMBA, EntityType.KOOPA, EntityType.KANGAROO]);
  for (const e of entities) {
    if (!groundEnemies.has(e.type)) continue;
    const sy = smoothGroundY([], e.x + TILE_SIZE / 2);
    if (sy === null) continue;
    const lifted = sy - 2 * TILE_SIZE;
    if (lifted < e.y) e.y = lifted;
  }

  return {
    name: 'Plüsch-Traumland',
    theme: 'plush',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 172 * TILE_SIZE, y: (ground - 4) * TILE_SIZE },
    checkpoint: { col: 93, row: ground },
    superBlocks: powerBlocks.super,
    heartBlocks: powerBlocks.heart,
    fireBlocks: powerBlocks.fire,
    starBlocks: powerBlocks.star,
    magnetBlocks: powerBlocks.magnet,
    specialCoins: [
      '34,' + (ground - 6),   // hoch auf dem Kissen-Sims
      '102,' + (ground - 7),  // ganz oben im Regal
      '130,' + (ground - 6),  // über dem Stern
    ],
    signs: [
      { col: 5, row: ground - 1, lines: ['Plüsch-Traumland!', 'Du bist ein kleines Äffchen.', 'Süßigkeit → Panda, Blume → Elefant!'] },
    ],
  };
}
