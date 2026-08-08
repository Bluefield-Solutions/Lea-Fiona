import { TileType, TILE_SIZE, EntityType } from '../constants';
import { smoothGroundY } from '../terrain';
import { bindHelpers, bindCoinHelpers, buildUndergroundRoom, clearHillHeadroom } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;
const FL = TileType.DECORATION_FLOWER;

/**
 * World 1-1 „Dschungel Abenteuer" — Neudesign (Prototyp v2).
 *
 * Leitidee: eine sehr zugängliche erste Welt mit klarer Pacing-Kurve aus
 * abwechselnden Beats — Anspannung → Entspannung → Belohnung —, statt
 * durchgehender Gegnerdichte. Mechaniken werden EINZELN und in sicheren
 * Räumen eingeführt; jeder neue Gegner/jede neue Hürde bekommt zuerst einen
 * gefahrlosen Lernraum. Exotische Gegner (Spinne, Bomb-Omb, Hornisse,
 * Chargin' Chuck) sind hier bewusst NICHT vertreten — Welt 1-1 lehrt nur
 * Goomba, Koopa, Piranha, Fledermaus und (gegen Ende, mit Schild davor) die
 * Stachelkugel. Alle Sprungweiten/-höhen liegen in den headless geprüften
 * Grenzen (Lücken ≤ 3 Tiles, Blöcke ≤ ground-4 ohne Stufe darunter).
 */
export function createJungleLevel(): LevelData {
  const width = 240;
  const height = 24;          // erhöht für unterirdischen Bonus-Raum
  const ground = 13;          // Hauptlevel-Boden bleibt fest (nicht height-2)

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const { set, fillGround, fillMossGround, addBricks, addPipe, addWoodBridge, addVines, addWater, addOneWayRow, addNoteBlock } =
    bindHelpers({ tiles, width, height, groundRow: ground });

  // Power-up-/Herz-Blöcke zentral sammeln: für JEDEN wird garantiert ein
  // Q-Tile gesetzt, sonst feuert hitBlock() nie. Das verhindert die häufigste
  // Verdrahtungs-Falle.
  const powerBlocks: Record<string, string[]> = {
    super: [], heart: [], fire: [], magnet: [], cape: [], shield: [],
  };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  // Prototyp: sanfter 1-Tile-Hügel. Aufstiegsrampe (45°) → flaches Plateau →
  // Abstiegsrampe (45°). Nutzt die vorhandene Slope-Physik. Der Boden darunter
  // muss bereits via fillGround gesetzt sein.
  const addGentleHill = (startCol: number, plateauLen: number) => {
    const top = ground - 1;
    set(startCol, top, TileType.SLOPE_RIGHT_45);
    for (let r = top + 1; r < height; r++) set(startCol, r, TileType.GROUND);
    for (let c = startCol + 1; c <= startCol + plateauLen; c++) {
      set(c, top, TileType.GROUND_TOP);
      for (let r = top + 1; r < height; r++) set(c, r, TileType.GROUND);
    }
    const downCol = startCol + plateauLen + 1;
    set(downCol, top, TileType.SLOPE_LEFT_45);
    for (let r = top + 1; r < height; r++) set(downCol, r, TileType.GROUND);
  };

  // ====================================================================
  //  BEAT 1 — Ankommen (cols 0–24): Bewegung & erster Stomp.
  // ====================================================================
  fillGround(0, 25, ground);
  addBlock('super', 5, ground - 4);
  set(6, ground - 1, TileType.SIGN);
  set(8, ground - 4, Q);
  set(9, ground - 1, TileType.SIGN);   // Hinweis zu den Flügeln bei col 10
  addBlock('heart', 12, ground - 4);
  set(3, ground - 1, FL);
  set(21, ground - 1, FL);
  // Sprungfeder entfernt: der 1-Tile-Note-Block blockierte den geraden Laufweg
  // (Figur lief frontal dagegen und blieb stehen). Münz-Belohnung darunter wird
  // auf normale Sprunghöhe abgesenkt (siehe addCoinRow weiter unten).

  // ====================================================================
  //  BEAT 2 — Erste Lücke (cols 25–44): Springen lernen.
  // ====================================================================
  addWater(26, 27);
  fillGround(28, 44, ground);
  addBlock('fire', 32, ground - 4);
  addWoodBridge(38, 4, ground - 3);
  set(30, ground - 1, FL);

  // ====================================================================
  //  BEAT 3 — Atempause & Belohnung (cols 45–58): Münz-Garten (keine Gegner).
  // ====================================================================
  fillGround(45, 58, ground);
  // (Frühere 45°-Hügel entfernt — zu kantig. Glattes Hügel-System folgt.)
  addOneWayRow(48, 3, ground - 3);
  addOneWayRow(53, 3, ground - 4);
  addBlock('magnet', 51, ground - 4);
  set(56, ground - 1, FL);

  // ====================================================================
  //  BEAT 4 — Koopa-Einführung (cols 59–84): neuer Gegner, sicher.
  // ====================================================================
  addWater(59, 60);
  fillGround(61, 84, ground);
  // Röhre von col 70 → 63 verschoben: bei 70 überlappte ihr rechter Fuß (col 71)
  // die Ziegel-Brücke des Stampf-Tors (cols 71–73) → Ziegel stak in der Röhre.
  // Jetzt steht sie frei links vom Tor, klar getrennt.
  addPipe(63, ground - 4);
  // ---- Bodenstampf-Tor (C2): Ziegel-Brücke über einer flachen Münz-Grube
  // (cols 71–73). Drüberlaufen geht normal (kein Softlock); wer in der Luft ↓
  // drückt (Bodenstampfer), zerschlägt die Ziegel und fällt auf die Münzen
  // darunter → der Stampf-Move bekommt eine echte Aufgabe.
  for (const c of [71, 72, 73]) { set(c, ground, TileType.BRICK); set(c, ground + 1, TileType.EMPTY); }
  set(68, ground - 1, TileType.SIGN);
  addBricks(74, 3, ground - 4);
  set(75, ground - 4, Q);
  addOneWayRow(80, 3, ground - 4);
  set(78, ground - 1, FL);

  // ====================================================================
  //  BEAT 5 — Höhe & Fledermäuse (cols 85–108): nach oben klettern.
  // ====================================================================
  fillMossGround(85, 108, ground);
  fillMossGround(88, 90, ground - 4);
  fillMossGround(94, 96, ground - 5);
  fillMossGround(100, 102, ground - 4);
  addVines(87, ground - 9, ground - 6);
  addBlock('cape', 105, ground - 4);
  set(92, ground - 1, FL);

  // ====================================================================
  //  BEAT 6 — Kombination (cols 109–140): alles zusammen, fair.
  // ====================================================================
  addWater(109, 110);
  fillGround(111, 140, ground);
  addPipe(116, ground - 4);
  addBricks(120, 3, ground - 4);
  set(121, ground - 4, Q);
  addWater(126, 127);
  fillGround(128, 140, ground);
  addBlock('shield', 132, ground - 4);
  set(136, ground - 1, FL);

  // ====================================================================
  //  BEAT 7 — Höhepunkt (cols 141–180): Herausforderung.
  // ====================================================================
  fillGround(141, 180, ground);
  // ---- Feuer-Tor (C2): Grube unter einer Einweg-Brücke (cols 145–149). Oben
  // läuft man normal drüber (kein Softlock); mit ↓+Sprung fällt man in die
  // Grube, wo eine brennbare Ranke die Münz-Kammer sperrt. Die Ranke füllt die
  // Grube ganz aus (kein Drüberspringen) — nur ein Feuerball (Feuerblume) brennt
  // sie weg. Ohne Feuer springt man einfach wieder hoch durch die Brücke.
  addBlock('fire', 143, ground - 4);                          // Feuerblume direkt davor
  set(143, ground - 1, TileType.SIGN);
  addOneWayRow(145, 5, ground);                               // Einweg-Brücke über der Grube
  for (const c of [145, 146, 147, 148, 149]) { set(c, ground + 1, TileType.EMPTY); set(c, ground + 2, TileType.EMPTY); } // Grube
  addBricks(150, 4, ground - 4);
  set(151, ground - 4, Q);
  set(153, ground - 4, Q);
  addWater(160, 161);
  fillGround(162, 180, ground);
  addOneWayRow(164, 3, ground - 4);
  addOneWayRow(169, 3, ground - 5);
  addBlock('heart', 173, ground - 4);
  set(176, ground - 1, FL);

  // ====================================================================
  //  BEAT 8 — Cool-down & Finale (cols 181–239): zum Ziel.
  // ====================================================================
  fillGround(181, 239, ground);
  addWater(196, 197);
  fillGround(198, 239, ground);
  // Ziegel+Q von cols 205–207 (auf dem steilen Finale-Hügel 199–236, wo die
  // ansteigende Kurve der großen Figur die Kopffreiheit nahm) auf den FLACHEN
  // Abschnitt davor (185–187) verlegt — dort erreichbar UND ohne Lauf-Blockade.
  addBricks(185, 3, ground - 4);
  set(186, ground - 4, Q);
  set(232, ground - 1, FL);

  // -------------------------------------------------------------------
  //  Gegner — bewusst sparsam und gestaffelt.
  // -------------------------------------------------------------------
  const entities: EntitySpawn[] = [];
  const G = (col: number, row = ground - 2) => entities.push({ type: EntityType.GOOMBA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const K = (col: number, row = ground - 2) => entities.push({ type: EntityType.KOOPA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Pi = (col: number, row: number) => entities.push({ type: EntityType.PIRANHA, x: col * TILE_SIZE, y: row * TILE_SIZE });
  const Ba = (col: number, row: number) => entities.push({ type: EntityType.BAT, x: col * TILE_SIZE, y: row * TILE_SIZE });
  // Sprungfeder (Umwelt-Interaktion): Y wird unten auf die Geländekurve gesnappt.
  const Sp = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  // Schiebbare/zerstörbare Kiste: Y wird unten auf die Geländekurve gesnappt.
  const Cr = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });

  // Paket 2: Flügel = freispielbare Doppelsprung-Fähigkeit. Ganz früh in Welt 1
  // auf dem flachen Ankunfts-Weg platziert (col 10, Kopfhöhe), damit sie mit
  // einem einzelnen Sprung sicher erreichbar ist und der frühe Teil auch ohne
  // Doppelsprung passierbar bleibt. Ab hier ist der Doppelsprung dauerhaft frei.
  entities.push({ type: EntityType.WINGS, x: 10 * TILE_SIZE, y: (ground - 3) * TILE_SIZE });

  // Level 1 = sehr leicht: nur wenige Goombas, ein Koopa zur Einführung.
  // Keine Piranhas, Fledermäuse, Stachelbälle oder Affen — die kommen später.
  G(17);   // BEAT 1: erster Stomp
  G(36);   // BEAT 2: nach der ersten Lücke
  K(66);   // BEAT 4: Koopa-Einführung
  G(122);  // BEAT 6: Kombination (aus Checkpoint-Zone 113 verschoben)
  K(157);  // BEAT 7: Höhepunkt (statt Stachelball/Affe)

  // Sprungfedern: neue Umwelt-Interaktion — hoch katapultieren, Münzen/Höhen
  // erreichen. Auf freiem Flachgrund platziert (rasten auf die Kurve ein).
  Sp(48);
  Sp(113);   // (war 110 = über Wasser) → auf festen Boden verschoben

  // Schiebbare/zerstörbare Kisten (Umwelt-Interaktion): schieben, als Stufe
  // nutzen, per Bodenstampfer zerbrechen. Im gegnerfreien Münz-Garten (Beat 3),
  // offener Flachgrund ohne Brücken/Lücken → sauberer Spiel-Showcase.
  Cr(46);
  Cr(56);
  G(202);  // BEAT 8: letzter Gegner vor dem Ziel

  // Feuer-Ranke des Feuer-Tors (Beat 7, col 147): füllt die Grube (rows 14–15)
  // und sperrt die Münz-Kammer, bis ein Feuerball sie wegbrennt.
  entities.push({ type: EntityType.FIRE_BARRIER, x: 147 * TILE_SIZE, y: (ground + 3) * TILE_SIZE, hTiles: 2 });

  // -------------------------------------------------------------------
  //  Münzen — Sichtbarkeitsführung über Lücken + Belohnung auf Hochwegen.
  // -------------------------------------------------------------------
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  // Zweite Sprungfeder (späterer Abschnitt) mit Münz-Bogen als Belohnung.
  set(124, ground - 1, TileType.NOTE_BLOCK);
  addCoinArc(123, 3, ground - 6, 1);
  // Geheime Bonus-Kammer hoch oben: per Sprungfeder erreichbar,
  // Plattform + dichte Münz-Formation als Belohnung.
  set(144, ground - 1, TileType.NOTE_BLOCK);
  addOneWayRow(143, 4, ground - 6);
  addCoinRow(143, 4, ground - 7);
  addCoinRow(143, 4, ground - 8);
  addCoinRow(17, 3, ground - 4); // Belohnung (Sprungfeder entfernt → auf Sprunghöhe)
  addCoinRow(9, 4, ground - 3);
  // Paket 2 · Doppelsprung-Belohnung: hoher Münz-Bogen direkt nach den Flügeln.
  // Die Enden (Boden-3) sind mit einem Sprung erreichbar, die Spitze (Boden-8)
  // NUR mit Doppelsprung → belohnt die neue Fähigkeit, ohne je zu blockieren.
  addCoinArc(13, 5, ground - 3, 5);
  addCoinArc(26, 3, ground - 2, 2);
  addCoinRow(38, 4, ground - 5);
  addCoinRow(48, 3, ground - 5);
  addCoinRow(53, 3, ground - 6);
  addCoinArc(59, 3, ground - 2, 2);
  addCoinRow(80, 3, ground - 6);
  addCoinRow(88, 3, ground - 6);
  addCoinRow(94, 3, ground - 7);
  addCoinRow(100, 3, ground - 6);
  addCoinArc(109, 3, ground - 2, 2);
  addCoinArc(126, 3, ground - 2, 2);
  addCoinArc(160, 3, ground - 2, 2);
  addCoinRow(164, 3, ground - 6);
  addCoinRow(169, 3, ground - 7);
  addCoinArc(196, 3, ground - 2, 2);
  addCoinRow(220, 5, ground - 6);
  // Belohnung unter der Ziegel-Brücke (Bodenstampf-Tor, Grube bei cols 71–73).
  addCoinRow(71, 3, ground + 1);
  // Belohnung in der Feuer-Kammer (hinter der Ranke, cols 148–149).
  addCoinRow(148, 2, ground + 1);
  addCoinRow(148, 2, ground + 2);

  // Thematische Boden-Deko (nicht-solide, theme-abhängig).
  set(10, ground - 1, TileType.DECORATION_PROP);
  set(23, ground - 1, TileType.DECORATION_PROP);
  set(34, ground - 1, TileType.DECORATION_PROP);
  set(45, ground - 1, TileType.DECORATION_PROP);
  set(58, ground - 1, TileType.DECORATION_PROP);
  set(69, ground - 1, TileType.DECORATION_PROP);
  set(80, ground - 1, TileType.DECORATION_PROP);
  set(94, ground - 1, TileType.DECORATION_PROP);
  set(107, ground - 1, TileType.DECORATION_PROP);
  set(118, ground - 1, TileType.DECORATION_PROP);
  set(129, ground - 1, TileType.DECORATION_PROP);
  set(140, ground - 1, TileType.DECORATION_PROP);
  set(155, ground - 1, TileType.DECORATION_PROP);
  set(166, ground - 1, TileType.DECORATION_PROP);
  set(178, ground - 1, TileType.DECORATION_PROP);
  set(189, ground - 1, TileType.DECORATION_PROP);
  // (Deko bei 200/211/222 entfernt — liegen im breiten Anstieg 199–236.)

  // Hügel-Zonen: Boden-Oberkante zu reiner Erde — die glatte Hügelkurve liefert
  // Gras und Oberfläche, das Tile-Gras würde sonst an den Rändern durchscheinen.
  const terrainHills = [
    // Welliges Profil: lang gezogene Anstiege stark variierender Höhe.
    { startCol: 9,  endCol: 15, peakTiles: 1.5, baseRow: ground, skew: 0 },     // kleiner Start-Hügel, 3 Kacheln vor Sprungfeder (18)
    { startCol: 31, endCol: 55, peakTiles: 2.5, baseRow: ground, skew: 0.2 },    // niedrig, lang gezogen
    { startCol: 128, endCol: 141, peakTiles: 3.5, baseRow: ground, skew: 0.2 },  // mittel-hoch, endet vor Sprungfeder-Sektion (144)
    { startCol: 164, endCol: 192, peakTiles: 1.8, baseRow: ground, skew: 0.1 },  // ganz flach, sehr lang
    { startCol: 199, endCol: 236, peakTiles: 4.8, baseRow: ground, skew: 0.3 },  // höchster, Finale-Anstieg
  ];
  // Boden-Oberkante in Hügel-Zonen zu reiner Erde (glatte Kurve liefert Gras).
  for (const h of terrainHills)
    for (let c = h.startCol; c <= h.endCol; c++) set(c, ground, TileType.GROUND);

  // Boden-Gegner auf Anstiegen auf die Hügelkurve heben (sonst stecken sie im
  // Hang). Nur anheben, nie absenken; fliegende/röhren-gebundene bleiben.
  const groundEnemies = new Set<EntityType>([EntityType.GOOMBA, EntityType.KOOPA, EntityType.SPIKE_BALL, EntityType.APE]);
  for (const e of entities) {
    // Sprungfedern / Kisten mit der Unterkante bündig auf die Geländekurve.
    if (e.type === EntityType.SPRING_STONE || e.type === EntityType.CRATE) {
      const sy = smoothGroundY(terrainHills, e.x + TILE_SIZE / 2);
      if (sy !== null) e.y = sy;
      continue;
    }
    if (!groundEnemies.has(e.type)) continue;
    const sy = smoothGroundY(terrainHills, e.x + TILE_SIZE / 2);
    if (sy === null) continue;
    const lifted = sy - 2 * TILE_SIZE; // 2 Tiles über Kurve, wie (ground-2) über flachem Grund
    if (lifted < e.y) e.y = lifted;
  }

  // Boden-Deko, die unter einer Hügelkurve läge, entfernen (verschwände sonst).
  for (let c = 0; c < width; c++) {
    const t = tiles[ground - 1][c];
    if (t !== TileType.DECORATION_PROP && t !== TileType.DECORATION_FLOWER) continue;
    const sy = smoothGroundY(terrainHills, c * TILE_SIZE + TILE_SIZE / 2);
    if (sy !== null && sy < (ground - 0.25) * TILE_SIZE) set(c, ground - 1, TileType.EMPTY);
  }

  // Kopffreiheit über Anstiegen GARANTIEREN (zentral, korrekte Groß-Figur-Höhe).
  clearHillHeadroom(tiles, terrainHills, width, height);

  // Geheime Bonus-Kammer (Warp-Röhre) an flachem Abschnitt OHNE Power-Blöcke
  // in der Nähe (sonst verdeckt der Kammerboden die Feuerblume u. a.).
  const warpPipes = buildUndergroundRoom({ set, addCoinRow, ground, entryCol: 83, roomL: 79 });

  return {
    name: 'World 1-1: Dschungel Abenteuer',
    theme: 'jungle',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    movingPlatforms: [
      { centerCol: 108, centerRow: ground - 2, widthTiles: 3, amplitudeTiles: 3, path: 'horizontal', speed: 0.8 },
    ],
    terrainHills,
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 235 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 113, row: ground },
    warpPipes,
    cameraZones: [
      { colStart: 78, colEnd: 93, rowStart: 15, rowEnd: 23, zoom: 1.18 },
    ],
    signs: [
      {
        col: 6,
        row: ground - 1,
        lines: [
          'Shift = Sprint',
          'Gelber Ring = Mega-Sprung',
        ],
      },
      {
        col: 9,
        row: ground - 1,
        lines: [
          'Flügel schnappen! →',
          'Dann: Sprung + nochmal Sprung = 2× hoch!',
        ],
      },
      {
        col: 87,
        row: ground - 1,
        lines: [
          'Geheime Röhre!',
          'Stell dich drauf und drück ↓',
        ],
      },
      {
        col: 68,
        row: ground - 1,
        lines: [
          'Ziegel-Brücke: in der Luft ↓',
          '= Stampfer → Münzen drunter!',
        ],
      },
      {
        col: 143,
        row: ground - 1,
        lines: [
          'Feuerblume + F. Auf der Brücke',
          '↓+Sprung: rein, Ranke wegbrennen!',
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
      '56,' + (ground - 5),
      '102,' + (ground - 6),
      '170,' + (ground - 7),
    ],
  };
}
