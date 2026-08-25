import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const SIGN = TileType.SIGN;
const SPIKE = TileType.SPIKE;
const LAVA_TOP = TileType.LAVA_TOP;
const LAVA = TileType.LAVA;

/**
 * World 6 „Vulkan Insel" — Neudesign im 8-Beat-Pacing-Modell.
 *
 * Leitidee: Vulkanlandschaft mit tödlichen Lava-Lakes, Bodenstacheln und
 * fallenden Feuerbällen. Der Stachelball ist der Signature-Gegner; er wird
 * mit Warnschild eingeführt, ebenso die Feuerball-Zone. Pacing: Anspannung →
 * Entspannung → Belohnung. Lava-Lücken ≤ 3 Tiles (überspringbar); Plattformen
 * über Lava liefern optionale Münz-Routen.
 */
export function createVulkanLevel(): LevelData {
  const width = 220;
  const height = 15;
  const ground = height - 2; // 13

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, addBricks, addWoodBridge, addOneWayRow, addStairs } =
    bindHelpers({ tiles, width, height });

  // Vulkan-spezifische lokale Helfer.
  const addLava = (a: number, b: number) => {
    for (let c = a; c <= b; c++) { set(c, ground, LAVA_TOP); set(c, ground + 1, LAVA); }
  };
  const addSpikes = (a: number, b: number) => {
    for (let c = a; c <= b; c++) set(c, ground - 1, SPIKE);
  };

  const entities: EntitySpawn[] = [];
  // Umwelt-Interaktion: Sprungfeder + Kiste (fester Flachboden).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  Spr(52); Box(65);
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  // Sprungfeder: drauf springen → Mega-Bounce zur Münz-Reihe hoch oben.
  set(40, ground - 1, TileType.NOTE_BLOCK);
  addCoinRow(39, 3, ground - 7);
  // Zweite Sprungfeder (späterer Abschnitt) mit Münz-Bogen als Belohnung.
  set(114, ground - 1, TileType.NOTE_BLOCK);
  addCoinArc(113, 3, ground - 6, 1);
  // Geheime Bonus-Kammer hoch oben: per Sprungfeder erreichbar,
  // Plattform + dichte Münz-Formation als Belohnung.
  set(159, ground - 1, TileType.NOTE_BLOCK);
  addOneWayRow(158, 4, ground - 6);
  addCoinRow(158, 4, ground - 7);
  addCoinRow(158, 4, ground - 8);

  const powerBlocks: Record<string, string[]> = {
    super: [], heart: [], fire: [], magnet: [], cape: [], shield: [],
  };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  const G = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const K = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Sb = (col: number, row = ground - 2) => entities.push({ type: EntityType.SPIKE_BALL, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Ls = (col: number, row = ground - 2) => entities.push({ type: EntityType.LAVA_SLIME, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Fb = (col: number) => entities.push({ type: EntityType.FIREBALL, x: col * TILE_SIZE, y: 1 * TILE_SIZE });
  const Bz = (col: number, row: number) => entities.push({ type: EntityType.BANZAI_BILL, x: col * TILE_SIZE, y: row * TILE_SIZE });

  // BEAT 1 — Ankommen am Vulkan (0–26): fester Grund, sanfter Start.
  fillGround(0, 26, ground);
  addBlock('super', 5, ground - 4);
  set(6, ground - 1, SIGN);
  set(9, ground - 4, Q);
  addBlock('heart', 14, ground - 4);
  addCoinRow(10, 4, ground - 6);
  G(12); K(20);

  // BEAT 2 — Erste Lava-Lake (27–50): Lava + Plattform-Route.
  fillGround(30, 50, ground);
  addLava(27, 29);
  addOneWayRow(27, 3, ground - 3);
  addBricks(36, 3, ground - 5);
  addBlock('fire', 37, ground - 5);
  addCoinArc(27, 3, ground - 4, 3);
  Ls(44);

  // BEAT 3 — Atempause & Belohnung (51–66): sicheres Plateau, gegnerfrei.
  fillGround(51, 66, ground);
  addOneWayRow(54, 4, ground - 3);
  addOneWayRow(60, 3, ground - 5);
  addBlock('magnet', 57, ground - 4);
  addCoinRow(54, 4, ground - 4);
  addCoinArc(60, 4, ground - 5, 3);
  // Power-Up-gegatete Bonus-Nische (Audit C2): überdachter Feuer-Tunnel, dessen
  // Eingang eine Feuer-Ranke sperrt. Die Feuerblume aus Beat 2 (col 37) brennt
  // sie weg → das Feuer-Power-Up bekommt hier (thematisch im Vulkan) eine echte
  // Aufgabe. Optional (Sackgasse mit Münzen), nie auf dem Flaggen-Pfad.
  addBricks(61, 4, ground - 3);            // Decke cols 61–64 (nicht überspringbar)
  set(64, ground - 1, TileType.BRICK);     // rechte Wand
  set(64, ground - 2, TileType.BRICK);
  addCoinRow(62, 2, ground - 2);           // Belohnung im Tunnel
  addCoinRow(62, 2, ground - 1);
  entities.push({ type: EntityType.FIRE_BARRIER, x: 61 * TILE_SIZE, y: ground * TILE_SIZE, hTiles: 2 });

  // BEAT 4 — Stachelball-Einführung (67–94): Signature + Bodenstacheln.
  fillGround(67, 94, ground);
  set(69, ground - 1, SIGN);
  addSpikes(76, 78);
  addBricks(83, 3, ground - 4);
  set(84, ground - 4, Q);
  addOneWayRow(88, 3, ground - 4);
  addBlock('super', 91, ground - 4);
  addBlock('shield', 102, ground - 4); // Puffer vor der Lücke 110-112 (Abstand zu PU@91 war 19)
  Sb(80); G(73);

  // BEAT 5 — Feuerball-Zone (95–120): fallende Feuerbälle + Lava.
  fillGround(98, 120, ground);
  addLava(95, 97);
  set(99, ground - 1, SIGN);
  addLava(110, 112);
  addOneWayRow(110, 3, ground - 3);
  addBlock('cape', 116, ground - 4);
  addCoinArc(110, 3, ground - 4, 3);
  Ls(105); Fb(102); Fb(108); Fb(115);

  // BEAT 6 — Kombination (121–152): Lava + Stachelball + Lava-Slime.
  fillGround(124, 152, ground);
  addLava(121, 123);
  addBricks(128, 3, ground - 4);
  set(129, ground - 4, Q);
  // Bodenstampf-Tor (C2): Ziegel-Brücke über einer Münz-Grube (cols 131–133).
  // Drüberlaufen normal; in der Luft ↓ (Stampfer) zerschlägt die Ziegel → Münzen.
  for (const c of [131, 132, 133]) { set(c, ground, TileType.BRICK); set(c, ground + 1, TileType.EMPTY); }
  set(130, ground - 1, SIGN);
  addCoinRow(131, 3, ground + 1);
  addLava(135, 137);
  addOneWayRow(135, 3, ground - 3);
  addBlock('shield', 142, ground - 4);
  addOneWayRow(145, 3, ground - 5);
  Sb(127); Ls(140); K(148);

  // BEAT 7 — Höhepunkt (153–192): Lava-Strecken, Feuerbälle, Banzai-Bill.
  fillGround(156, 192, ground);
  addLava(153, 155);
  addOneWayRow(153, 3, ground - 3);
  addSpikes(163, 164);
  addBricks(169, 4, ground - 4);
  set(170, ground - 4, Q);
  set(172, ground - 4, Q);
  addLava(178, 180);
  addOneWayRow(178, 3, ground - 3);
  addBlock('heart', 185, ground - 5);
  addCoinArc(157, 6, ground - 5, 4);
  Bz(158, ground - 7); Sb(167); Fb(165); Fb(176); Ls(188);

  // BEAT 8 — Cool-down & Finale (193–219): fester Grund zur Flagge.
  fillGround(193, 219, ground);
  addCoinRow(195, 6, ground - 4);
  G(198);

  // P2b (v456) — Mittelspiel-Belohnung angehoben: Münz-Bögen als Risiko-
  // Belohnung über den Lava-Sprüngen + ein Trail in der Stachelball-Passage.
  // Alle über Lava/Luft, keine Kollision mit Blöcken/Gegnern.
  addCoinArc(95, 3, ground - 4, 2);   // über Lava 95–97
  addCoinRow(70, 3, ground - 6);      // Trail in Beat 4 (Luft)
  addCoinArc(135, 3, ground - 4, 2);  // über Lava 135–137
  addCoinArc(153, 3, ground - 4, 2);  // über Lava 153–155
  addCoinArc(178, 3, ground - 4, 2);  // über Lava 178–180


  // Thematische Boden-Deko (nicht-solide, theme-abhängig).
  set(11, ground - 1, TileType.DECORATION_PROP);
  set(22, ground - 1, TileType.DECORATION_PROP);
  set(33, ground - 1, TileType.DECORATION_PROP);
  set(44, ground - 1, TileType.DECORATION_PROP);
  set(55, ground - 1, TileType.DECORATION_PROP);
  set(66, ground - 1, TileType.DECORATION_PROP);
  set(77, ground - 1, TileType.DECORATION_PROP);
  set(88, ground - 1, TileType.DECORATION_PROP);
  set(101, ground - 1, TileType.DECORATION_PROP);
  set(112, ground - 1, TileType.DECORATION_PROP);
  set(124, ground - 1, TileType.DECORATION_PROP);
  set(135, ground - 1, TileType.DECORATION_PROP);
  set(146, ground - 1, TileType.DECORATION_PROP);
  set(157, ground - 1, TileType.DECORATION_PROP);
  set(174, ground - 1, TileType.DECORATION_PROP);
  set(187, ground - 1, TileType.DECORATION_PROP);
  set(198, ground - 1, TileType.DECORATION_PROP);
  set(209, ground - 1, TileType.DECORATION_PROP);

  return {
    name: 'Vulkan Insel',
    theme: 'volcano',
    width,
    height,
    tiles,
    entities,
    movingPlatforms: [
      { centerCol: 94, centerRow: ground - 2, widthTiles: 3, amplitudeTiles: 3, path: 'horizontal', speed: 0.8 },
    ],
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 212 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 98, row: ground },
    signs: [
      {
        col: 6,
        row: ground - 1,
        lines: [
          'Vulkan Insel!',
          'Lava ist tödlich — spring',
          'über die glühenden Seen.',
        ],
      },
      {
        col: 69,
        row: ground - 1,
        lines: [
          'Achtung: Stachelball!',
          'Rollt heran — nicht drauf-',
          'springen, ausweichen!',
        ],
      },
      {
        col: 99,
        row: ground - 1,
        lines: [
          'Feuerbälle von oben!',
          'Sie fallen aus dem Vulkan.',
          'Weiterlaufen, nicht stehen.',
        ],
      },
      {
        col: 130,
        row: ground - 1,
        lines: [
          'Ziegel-Brücke: in der Luft ↓',
          '= Stampfer → Münzen drunter!',
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
      '60,' + (ground - 8),
      '91,' + (ground - 7),
      '170,' + (ground - 7),
    ],
  };
}
