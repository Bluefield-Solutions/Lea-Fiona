import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers, buildUndergroundRoom } from '../levelHelpers';
import { smoothGroundY } from '../terrain';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const SIGN = TileType.SIGN;
const NOTE = TileType.NOTE_BLOCK;

/**
 * World 11: Schule — "Abenteuer nach Schulschluss".
 * STUFE 5 (Layout): acht Beats vom Klassenzimmer bis zum Glockenturm.
 * Gegner schul-typisch umgedeutet: Goomba = Radiergummi-Krabbler,
 * Spider = Klassenzimmer-Spinne, Spike-Ball = rollender Ball. Note-Block = Trampolin,
 * Bücherregale (Wood-Platform) für Treppen/Bibliothek.
 */
export function createSchoolLevel(): LevelData {
  const width = 212;
  const height = 24;          // erhöht für unterirdischen Bonus-Raum (Kamera scrollt mit)
  const ground = 13;          // Hauptlevel-Boden bleibt fest (nicht height-2)

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, addOneWayRow } = bindHelpers({ tiles, width, height, groundRow: ground });
  const entities: EntitySpawn[] = [];
  // Umwelt-Interaktion: Sprungfeder + Kiste (fester Flachboden).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  Spr(85); Box(108);
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);

  // Power-Up-Blöcke (Balance-Fix: Welt 11 hatte bisher keine Power-Ups).
  // P2: Katalog breiter ausspielen — Umhang (Papierflieger-Gleiter, thematisch)
  // + Münz-Magnet ergänzt; Welt 11 hatte nur 5 ?-Blöcke.
  const powerBlocks: Record<string, string[]> = { super: [], heart: [], shield: [], cape: [], magnet: [] };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  // Durchgehender Boden; eine Sprung-Lücke im Pausenhof.
  const gaps = new Set<number>([176, 177]);
  for (let c = 0; c < width; c++) {
    if (gaps.has(c)) continue;
    set(c, ground, TileType.GROUND_TOP);
    for (let r = ground + 1; r < height; r++) set(c, r, TileType.GROUND);
  }
  // Bodenstampf-Tor (Audit C2): Ziegel über einer Münz-Grube (Klassenzimmer,
  // flach). Bodenstampfer (↓ in der Luft) bricht durch → Münzen; Drüberlaufen
  // bleibt normal (kein Softlock).
  for (const c of [22, 23, 24]) { set(c, ground, TileType.BRICK); set(c, ground + 1, TileType.EMPTY); }
  addCoinRow(22, 3, ground + 1);

  const Rad = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Ball = (col: number, row = ground - 2) => entities.push({ type: EntityType.SPIKE_BALL, x: col * TILE_SIZE, y: row * TILE_SIZE });
  // Papierflieger (Seagull) entfernt (keine Vögel). Als dritte Gegner-Art
  // stattdessen die Klassenzimmer-Spinne: hängt an der Decke und lässt sich am
  // Faden herab, wenn die Figur nah ist — telegrafierter, fairer Fall-Gegner
  // (kein Vogel, keine Schildkröte). Hängt erhöht (ground-5), fällt in den Weg.
  const Spinne = (col: number, row = ground - 5) => entities.push({ type: EntityType.SPIDER, x: col * TILE_SIZE, y: row * TILE_SIZE });

  // BEAT 1 — Klassenzimmer (0-26): ruhiger Einstieg.
  set(6, ground - 1, SIGN);
  addOneWayRow(16, 3, ground - 3);
  addBlock('super', 20, ground - 4);
  set(10, ground - 4, Q); // Münz-Block früh — Frage-Blöcke belohnen Neugier
  Rad(12); Rad(24);
  addCoinRow(16, 3, ground - 4);

  // BEAT 2 — Flur 1 (27-54): Radiergummi-Krabbler + erste Decken-Spinne.
  Rad(38); Rad(44); Rad(50);
  Spinne(46);
  set(44, ground - 4, Q); // Münz-Block über dem Krabbler-Flur
  addCoinRow(34, 4, ground - 2);

  // BEAT 3 — Treppenhaus (55-82): aufsteigende Bücherregal-Stufen.
  set(55, ground - 4, Q); // Münz-Block am Fuß der Treppe
  addOneWayRow(58, 4, ground - 2);
  addOneWayRow(64, 4, ground - 3);
  addOneWayRow(70, 4, ground - 5);
  addOneWayRow(76, 4, ground - 6);
  addCoinArc(59, 5, ground - 3, 3);

  // BEAT 4 — Bibliothek (83-110): Bücherregale + Sternchen, Atempause.
  addOneWayRow(86, 4, ground - 3);
  addOneWayRow(94, 4, ground - 5);
  addOneWayRow(102, 4, ground - 3);
  addCoinRow(86, 4, ground - 4);
  addCoinRow(94, 4, ground - 6);
  addCoinRow(102, 4, ground - 4);
  addBlock('heart', 98, ground - 7);
  Spinne(90); // Spinne über der Bibliothek
  // Vertikaler Aufzug (Audit C1 · Rollout): Hebebühne vom Boden hoch zu einer
  // Belohnungs-Terrasse (cols 110–113, siehe movingPlatforms). Optionaler
  // Hochweg mit Münzen — nie auf dem Flaggen-Pfad (Flagge bleibt am Boden erreichbar).
  addOneWayRow(110, 4, ground - 10);
  addCoinRow(110, 4, ground - 11);

  // BEAT 5 — Turnhalle (111-142): Trampoline + rollende Bälle.
  set(118, ground - 1, SIGN);
  set(116, ground - 1, NOTE);
  set(132, ground - 1, NOTE);
  Rad(120); Ball(128); Ball(136);
  addBlock('cape', 124, ground - 4); // Papierflieger-Gleiter über dem Trampolin
  set(140, ground - 5, Q); // Münz-Block hoch über der Turnhalle (Trampolin-Belohnung)
  addCoinArc(118, 6, ground - 7, 4);
  addCoinArc(126, 5, ground - 6, 4); // Belohnungsbogen beim Trampolin-Schwung

  // BEAT 6 — Kunstraum (143-168): Kombination.
  addOneWayRow(146, 3, ground - 4);
  addBlock('shield', 150, ground - 4);
  Rad(154); Rad(162); Ball(166);
  Spinne(158); // Spinne im Kunstraum
  set(160, ground - 4, Q); // Münz-Block im Kunstraum
  addBlock('heart', 168, ground - 4); // Heilung am Kunstraum-Ausgang (spätes Drittel großzügiger)
  addCoinRow(146, 3, ground - 5);

  // BEAT 7 — Pausenhof (169-192): mehrere Gegner + Sprung-Lücke.
  set(172, ground - 1, SIGN);
  Rad(170); Rad(186); Ball(182);
  Spinne(190); // Spinne kurz vor dem Finalaufstieg
  addBlock('magnet', 180, ground - 4); // Münz-Magnet für den Pausenhof
  addCoinArc(175, 4, ground - 3, 2); // Belohnungsbogen über der Lücke

  // BEAT 8 — Glockenturm (193-211): Aufstieg zur Schulglocke.
  addBlock('heart', 190, ground - 4); // Extra-Herz vor dem Finalaufstieg
  addBlock('super', 200, ground - 4); // Groß-Power fürs Finale — wer klein ankommt, erholt sich
  addOneWayRow(196, 3, ground - 3);
  addOneWayRow(201, 3, ground - 5);
  addOneWayRow(206, 3, ground - 7);
  addCoinArc(196, 4, ground - 4, 2);

  // Schul-Deko an der Bodenlinie (col % 4 → Variante: 0 Pult, 1 Bücher, 2 Pflanze, 3 Eimer).
  const DP = TileType.DECORATION_PROP;
  [8, 24,            // Klassenzimmer: Pulte (v0)
   31, 51, 167,      // Flur/Kunstraum: Mülleimer (v3)
   89, 105,          // Bibliothek: Bücherstapel (v1)
   54, 142, 170,     // verteilt: Pflanzen (v2)
  ].forEach((c) => set(c, ground - 1, DP));

  // Geheime Bonus-Kammer (Warp-Röhre) — Stelle ohne Power-Blöcke darunter.
  const warpPipes = buildUndergroundRoom({ set, addCoinRow, ground, entryCol: 36, roomL: 32 });

  // Schutz-Logik (für künftige Hügel; aktuell flacher Boden) — Gegner nie im Boden.
  const groundEnemies = new Set<EntityType>([EntityType.GOOMBA, EntityType.SPIKE_BALL]);
  for (const e of entities) {
    if (!groundEnemies.has(e.type)) continue;
    const sy = smoothGroundY([], e.x + TILE_SIZE / 2);
    if (sy === null) continue;
    const lifted = sy - 2 * TILE_SIZE;
    if (lifted < e.y) e.y = lifted;
  }

  return {
    name: 'Schule',
    theme: 'school',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    movingPlatforms: [
      // Vertikaler Aufzug (Audit C1): Boden hoch zur Belohnungs-Terrasse (row 3).
      { centerCol: 110, centerRow: ground - 5, widthTiles: 3, amplitudeTiles: 4, path: 'vertical', speed: 0.7 },
    ],
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 209 * TILE_SIZE, y: (ground - 9) * TILE_SIZE },
    checkpoint: { col: 106, row: ground },
    superBlocks: powerBlocks.super,
    heartBlocks: powerBlocks.heart,
    shieldBlocks: powerBlocks.shield,
    capeBlocks: powerBlocks.cape,
    magnetBlocks: powerBlocks.magnet,
    specialCoins: [
      '25,' + (ground - 5),
      '105,' + (ground - 6),
      '165,' + (ground - 5),
    ],
    warpPipes,
    cameraZones: [
      { colStart: 31, colEnd: 46, rowStart: 15, rowEnd: 23, zoom: 1.18 },
    ],
    signs: [
      { col: 6, row: ground - 1, lines: ['Schule nach Schulschluss!', 'Lea und Fiona erkunden alles.', 'Ziel: die große Schulglocke.'] },
      { col: 40, row: ground - 1, lines: ['Geheimer Schacht!', 'Stell dich drauf und drück ↓'] },
      { col: 118, row: ground - 1, lines: ['Turnhalle!', 'Trampoline schleudern dich hoch.', 'Vorsicht vor rollenden Bällen.'] },
      { col: 172, row: ground - 1, lines: ['Pausenhof!', 'Fast am Ziel — die Glocke wartet.'] },
    ],
  };
}
