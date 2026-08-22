import { TileType, TILE_SIZE, EntityType } from '../constants';
import { bindHelpers, bindCoinHelpers } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

/**
 * Level 19 „Stephans Urlaub — Endlich Ferien!" (Roadtrip in drei Abschnitten).
 *
 * Man spielt IMMER Stephan (erzwungener Charakter). Foto-Hintergrund + Boden
 * wechseln abschnittsweise: A (Alpen, Fels) → B (Tropen-Lagune, Sand) →
 * C (Küstenstadt, Holzsteg). In der Lagune (B) liegt eine BREITE Wasser-Passage,
 * die man nur über treibende Luftmatratzen (bobbende Plattformen, „Wellen") quert
 * — reinfallen = verloren. Gegner passend je Abschnitt (bestehende Typen).
 */
export function createVacationLevel(): LevelData {
  const width = 270;
  const height = 20;
  const ground = 15;

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(TileType.EMPTY);

  const { set, fillGround, addOneWayRow, addWater } = bindHelpers({ tiles, width, height, groundRow: ground });
  const entities: EntitySpawn[] = [];
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);
  const E = (type: EntityType, col: number, row = ground - 1) =>
    entities.push({ type, x: col * TILE_SIZE, y: row * TILE_SIZE });
  // Interaktive Requisiten sitzen auf dem Boden (row `ground`).
  const Spr = (col: number) => entities.push({ type: EntityType.SPRING_STONE, x: col * TILE_SIZE, y: ground * TILE_SIZE });
  const Box = (col: number) => entities.push({ type: EntityType.CRATE, x: col * TILE_SIZE, y: ground * TILE_SIZE });

  const powerBlocks: Record<string, string[]> = { super: [], heart: [], fire: [], magnet: [], cape: [], shield: [] };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, TileType.QUESTION_BLOCK); powerBlocks[kind].push(`${col},${row}`);
  };
  const bridge = (col: number, len: number, row: number, coinRow = row - 2) => {
    addOneWayRow(col, len, row); addCoinRow(col, len, coinRow);
  };

  // ── Boden: DURCHGEHENDER Foto-Weg (keine unsichtbaren Gruben!) ──
  // Der Weg ist ins Foto eingearbeitet und durchgehend → der Kollisionsboden MUSS
  // ebenso durchgehend sein, sonst fällt die Figur in eine Grube, die im Bild wie
  // fester Boden aussieht ("versinkt im Boden"). EINZIGE sichtbare Wasserstelle
  // ist die Lagune (Floß-Passage). Frühere kleine Priele/Klüfte entfernt.
  fillGround(0, 269, ground);
  addWater(127, 139);                              // B · Lagune (nur per Floß quert!)

  // ── Schilder an den Abschnitts-Übergängen ──
  set(4, ground - 1, TileType.SIGN);
  set(96, ground - 1, TileType.SIGN);
  set(186, ground - 1, TileType.SIGN);

  // ── Power-Ups (alle auf festem Boden) ──
  addBlock('fire', 8, ground - 4);      // Schwimmflügel (Doppelsprung) gleich am Anfang
  addBlock('heart', 24, ground - 4);
  addBlock('super', 52, ground - 4);
  addBlock('shield', 108, ground - 4);
  addBlock('heart', 146, ground - 4);
  addBlock('super', 200, ground - 4);
  addBlock('shield', 232, ground - 4);

  // ── Dezente Stufen: einzelne Plattformen ÜBER dem durchgehenden Weg für etwas
  //    Höhe/Kletterei; das Level bleibt aber überwiegend am Boden-Weg. Jede Stufe
  //    trägt eine Münzreihe (bridge = Einweg-Sims + Münzen darüber). ──
  bridge(28, 4, ground - 3);                                 // A · kleine Stufe
  bridge(44, 4, ground - 5);                                 // A · höher (Sonder-Münze 45)
  bridge(60, 3, ground - 4);                                 // A · Zwischenstufe
  bridge(74, 3, ground - 6);                                 // A · Gipfel-Sims (kleiner Höhepunkt)
  bridge(108, 3, ground - 3);                                // B · vor der Lagune
  bridge(144, 4, ground - 5);                                // B · nach der Lagune (Sonder-Münze 145)
  bridge(166, 3, ground - 4);                                // B
  bridge(198, 4, ground - 4);                                // C
  bridge(224, 4, ground - 5);                                // C · Sonder-Münz-Steg (224)
  bridge(250, 3, ground - 4);                                // C

  // ── Münz-Bögen + Münz-Spur über die Lagune (führt über die Flöße) ──
  addCoinArc(16, 4, ground - 2, 3);
  addCoinArc(36, 4, ground - 2, 3);
  addCoinArc(72, 5, ground - 2, 3);
  addCoinRow(128, 12, ground - 4);                          // Lagunen-Münzspur
  addCoinArc(166, 5, ground - 2, 3);
  addCoinArc(190, 4, ground - 2, 3);
  addCoinArc(236, 4, ground - 2, 3);
  addCoinArc(252, 5, ground - 2, 3);

  // ── Interaktive Requisiten: Sprungfedern (katapultieren auf die höheren Sims)
  //    und tragbare/stapelbare Kisten (Treppe bauen, werfen). ──
  Spr(66);                                                   // A · Feder hoch zum Gipfel-Sims (74)
  Spr(210);                                                  // C · Feder
  Box(100);                                                  // B · einzelne Kiste (kein Sperr-Riegel vor der Lagune)
  Box(234);                                                  // C · Kiste

  // ── Gegner je Abschnitt (KEINE Vögel — thematisch passende Typen) ──
  E(EntityType.SHEEP, 20); E(EntityType.GOOMBA, 44); E(EntityType.SHEEP, 76);                 // A · Alpen
  E(EntityType.CRAB, 104); E(EntityType.CRAB, 160); E(EntityType.CRAB, 168);                  // B · Tropen (Krabben)
  E(EntityType.CRAB, 192); E(EntityType.TURTLE, 220); E(EntityType.CRAB, 236);                // C · Küste
  E(EntityType.JELLYFISH, 250, ground - 4); E(EntityType.JELLYFISH, 205, ground - 4);         // C · Quallen

  return {
    name: 'Stephans Urlaub — Endlich Ferien!',
    theme: 'vacation',
    width,
    height,
    groundRow: ground,
    tiles,
    entities,
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 266 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 120, row: ground },
    // Treibende Luftmatratzen über der Lagune: bilden eine durchgehende, sanft
    // wippende Ponton-Brücke über das breite Wasser (Lagune col 127-139).
    // Balancing (Auto-Pilot-Testlauf-Befund): Das Schild sagt „Hüpf über die
    // Luftmatratzen" — die vorgesehene Interaktion ist Springen von Matratze zu
    // Matratze (von OBEN auf die Oberkante landen; die Plattformen sind solide
    // Kästen, ein reines Hineinlaufen an der Kante schnippt die Figur weg).
    // Ursprünglicher Fehler: die Matratzen lagen 1-3 Kacheln ÜBER dem Ufer und
    // vertikal DESYNCHRON → schon der erste Sprung setzte daneben/darunter auf
    // (im Auto-Pilot ertrank der erste Schritt, nur Sprint kam ~2/3 der Phasen
    // durch). Fix: vier 3 Kacheln breite Matratzen mit nur 1 Kachel Lücke
    // (128-130 · 132-134 · 136-138 · 139-141), Oberkante KNAPP UNTER Uferhöhe
    // (row 16) → jeder Sprung landet sauber absteigend auf der Oberseite; sie
    // wippen GEMEINSAM (gleiche Phase/Tempo/Amplitude 0.5) → vorhersehbare
    // Landehöhen. Erste Matratze vom Ufer aus mit einem Sprung erreichbar, die
    // letzte reicht bis ans Ufer (col 141 grenzt an fillGround ab 140... liegt
    // bündig), Münz-Spur führt über die Sprungbögen.
    // WICHTIG (Kollisions-Fix, Autopilot-Befund): Die Wasser-Gefahrenzeile ist
    // row `ground` (WATER_TOP). Lagen die Matratzen-OBERKANTEN in/unter dieser
    // Zeile (centerRow ground+1 → Oberkante y≈15.5–16.5), waren die Füße beim
    // Landen IMMER im Wasser → sofortiges Ertrinken, die Passage war unpassierbar.
    // Fix: Oberkante KNAPP ÜBER die Wasserlinie (centerRow ~ground-0.25, kleine
    // Amplitude 0.15) → die Figur landet stets oberhalb row `ground` (Füße nie in
    // der Wasserzeile), der Sprungbogen taucht zwischen den Flößen nie ins Wasser.
    // Hinweis: `centerCol` ist die LINKE Floß-Kante (nicht die Mitte). Lücken je
    // 1 Kachel: Ufer126 | 127 | Floß 128–130 | 131 | Floß 132–134 | 135 | Floß
    // 136–138 | 139 | Ufer140. Vorher startete Floß 1 bei 129 → erste Lücke war
    // faktisch 2 Kacheln (127+128) und darum vom Ufer kaum zu treffen.
    movingPlatforms: [
      { centerCol: 128, centerRow: ground - 0.25, widthTiles: 3, amplitudeTiles: 0.15, path: 'vertical', speed: 0.4 },
      { centerCol: 132, centerRow: ground - 0.25, widthTiles: 3, amplitudeTiles: 0.15, path: 'vertical', speed: 0.4 },
      { centerCol: 136, centerRow: ground - 0.25, widthTiles: 3, amplitudeTiles: 0.15, path: 'vertical', speed: 0.4 },
    ],
    signs: [
      { col: 4, row: ground - 1, lines: ['Endlich Urlaub, Stephan!', 'Los geht die Reise in den Alpen.'] },
      { col: 96, row: ground - 1, lines: ['Angekommen an der Lagune!', 'Hüpf über die Holzflöße.'] },
      { col: 186, row: ground - 1, lines: ['Letzte Etappe: die Küste.', 'Vorsicht: Krabben & Quallen!'] },
    ],
    heartBlocks: powerBlocks.heart,
    fireBlocks: powerBlocks.fire,
    shieldBlocks: powerBlocks.shield,
    superBlocks: powerBlocks.super,
    specialCoins: [
      '45,' + (ground - 7),    // A (hoher Sims)
      '145,' + (ground - 7),   // B (Steg nach der Lagune)
      '224,' + (ground - 7),   // C (hoher Steg)
    ],
  };
}
