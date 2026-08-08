import { TileType, TILE_SIZE, EntityType } from '../constants';
import { smoothGroundY } from '../terrain';
import { bindHelpers, bindCoinHelpers, buildUndergroundRoom, clearHillHeadroom } from '../levelHelpers';
import type { LevelData, EntitySpawn } from '../level';

const _ = TileType.EMPTY;
const Q = TileType.QUESTION_BLOCK;

/**
 * World 13 „Die blaue Wiese" — Bluefield IT Solutions GmbH.
 *
 * Etappe A (Redesign): Das Level ist jetzt eine 4-Sektionen-Reise (~284 Tiles,
 * doppelte Länge) nach dem Vorbild des Schul-Levels. Der Hintergrund wechselt
 * (ab Etappe B) sanft durch vier Abschnitte:
 *   ① LABOR (0–70)        Hypothese + Prototyp, „aus Ideen Produkte"
 *   ② U1-OPTIMIERER (71–141)  das live-Produkt, „Geld zurückholen"
 *   ③ MATCHSUITE (142–212)    „im Aufbau", Berater-Matching
 *   ④ BLUEFIELD-FINALE (213–283)  Markttest-Gefahr → GO-LIVE (Boss + Flagge)
 *
 * Fair für Gelegenheitsspieler: Lücken ≤ 3 Tiles, Checkpoint vor dem Markttest,
 * Blöcke über Hügeln kopf-frei angehoben. Die drei Produkte bleiben als
 * Spezial-Münzen (Proben unter Glas) in ihren jeweiligen Sektionen.
 */

// Sektionsgrenzen (Welt-Spalten) — auch für den Hintergrund-Wechsel in Etappe B.
export const BLUEFIELD_SECTION_BOUNDS = [71, 142, 213];

export function createBluefieldLevel(): LevelData {
  const width = 284;
  const height = 24;          // erhöht für unterirdischen Geheimraum „Serverhalle DE"
  const ground = 13;

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) tiles[y] = new Array(width).fill(_);

  const entities: EntitySpawn[] = [];
  const { set, fillGround, addOneWayRow } =
    bindHelpers({ tiles, width, height, groundRow: ground });
  const { addCoinRow, addCoinArc } = bindCoinHelpers(entities);

  const pushEnemy = (type: EntityType, col: number, rowFromGround = 1) => {
    entities.push({ type, x: col * TILE_SIZE, y: (ground - rowFromGround) * TILE_SIZE });
  };

  const powerBlocks: Record<string, string[]> = {
    super: [], heart: [], fire: [], magnet: [], cape: [], shield: [],
  };
  const addBlock = (kind: keyof typeof powerBlocks, col: number, row: number) => {
    set(col, row, Q);
    powerBlocks[kind].push(`${col},${row}`);
  };

  // ── Bodenverlauf ────────────────────────────────────────────────────
  // Durchgehend bis zum Markttest im Finale; dort drei faire Lücken
  // („was durchfällt, fällt durch"); danach fester Grund bis zum Ziel.
  fillGround(0, 219, ground);          // Labor + U1 + MatchSuite + Finale-Anlauf
  fillGround(223, 230, ground);        // Insel nach Markttest-Lücke 1
  fillGround(234, 241, ground);        // Insel nach Markttest-Lücke 2
  fillGround(245, width - 1, ground);  // Live-Finale bis Ziel
  // Markttest-Lücken: 220–222, 231–233, 242–244 (je 3 Tiles, sicher überspringbar)

  // ── ① LABOR (0–70): Hypothese säen, Prototyp bauen ──────────────────
  addBlock('heart', 6, ground - 4);
  addBlock('fire', 14, ground - 6);    // über Hügel 8–22, Laufkopf frei
  addCoinArc(9, 4, ground - 2, 2);
  addCoinRow(22, 4, ground - 5);
  pushEnemy(EntityType.GOOMBA, 18);
  pushEnemy(EntityType.GOOMBA, 27);
  // Prototyp-Baugerüst (Einweg-Plattformen: sauber von unten durchspringen).
  addOneWayRow(38, 3, ground - 4);
  addOneWayRow(46, 3, ground - 5);
  addBlock('cape', 50, ground - 6);    // über Hügel 40–58
  addOneWayRow(56, 3, ground - 4);
  addCoinArc(40, 5, ground - 6, 3);
  addCoinRow(56, 3, ground - 6);
  pushEnemy(EntityType.KOOPA, 44);
  pushEnemy(EntityType.GOOMBA, 60);

  // ── ② U1-OPTIMIERER (71–141): das live-Produkt, „Geld zurückholen" ──
  addBlock('shield', 95, ground - 6);  // über Hügel 85–100
  addBlock('magnet', 110, ground - 4); // flach zwischen den U1-Hügeln
  addCoinArc(88, 5, ground - 4, 3);
  addCoinRow(112, 6, ground - 5);
  pushEnemy(EntityType.GOOMBA, 80);
  pushEnemy(EntityType.GOOMBA, 108);
  pushEnemy(EntityType.KOOPA, 125);
  // U1 als spielbare Botschaft „Geld zurückholen": Sprungfeder katapultiert hoch
  // zu einem Münz-Schatz (die zurückgeholten Beiträge, erfolgsbasiert).
  entities.push({ type: EntityType.SPRING_STONE, x: 106 * TILE_SIZE, y: ground * TILE_SIZE });
  addCoinArc(104, 3, ground - 6, 2);   // „Ø 3.540 €" — per Feder erreichbar

  // ── ③ MATCHSUITE (142–212): „im Aufbau", Berater-Matching ───────────
  addBlock('shield', 150, ground - 4);
  // Aufbau-Gerüst unter der MatchSuite-Probe (erreichbar machen).
  addOneWayRow(172, 3, ground - 4);
  addOneWayRow(178, 3, ground - 6);
  addCoinArc(158, 5, ground - 5, 3);
  addCoinRow(190, 5, ground - 5);
  pushEnemy(EntityType.GOOMBA, 150);
  pushEnemy(EntityType.BOMB_OMB, 178);
  pushEnemy(EntityType.GOOMBA, 200);
  // MatchSuite als spielbare Produkt-Botschaft: „Profil trifft Projekt".
  // Der Schalter (Match) öffnet die Tür → begehbare Kausalität. Zwei Schalter-
  // Kacheln = unvermeidbar im Laufweg; hinter der Tür wartet die Belohnung.
  entities.push({ type: EntityType.P_SWITCH, x: 202 * TILE_SIZE, y: ground * TILE_SIZE, group: 1 });
  entities.push({ type: EntityType.P_SWITCH, x: 203 * TILE_SIZE, y: ground * TILE_SIZE, group: 1 });
  entities.push({ type: EntityType.DOOR, x: 206 * TILE_SIZE, y: ground * TILE_SIZE, hTiles: 3, group: 1 });
  addCoinRow(208, 4, ground - 2);   // Belohnung hinter der geöffneten Tür

  // ── ④ BLUEFIELD-FINALE (213–283): Markttest → GO-LIVE ───────────────
  // Puffer-Schild direkt hinter dem Checkpoint (217), vor der ersten Lücke.
  addBlock('shield', 218, ground - 4);
  // Münz-Belohnungen über den Lücken (Risk-Reward).
  addCoinArc(220, 3, ground - 3, 3);   // über Lücke 1
  addCoinArc(231, 3, ground - 3, 3);   // über Lücke 2
  addCoinArc(242, 3, ground - 3, 3);   // über Lücke 3
  pushEnemy(EntityType.BOMB_OMB, 226);
  // GKV-Vergleich (geplant) als spielbare Botschaft: Kiste aufbrechen →
  // „Vergleich zeigt das Ergebnis" (Belohnung). Auf der Insel bei der GKV-Tafel.
  entities.push({ type: EntityType.CRATE, x: 239 * TILE_SIZE, y: ground * TILE_SIZE });
  pushEnemy(EntityType.GOOMBA, 236);
  addBlock('super', 263, ground - 8);  // über hohem Finale-Hügel (peak 3.6)
  addCoinRow(248, 6, ground - 5);
  pushEnemy(EntityType.GOOMBA, 255);
  // Stampf-Boss als Endgegner: hinter dem finalen Hügel (Ende 276),
  // direkt vor der Flagge (279).
  pushEnemy(EntityType.BOSS, 277);

  // ── Sanfte blaue Wiesen-Hügel (nur über festem Boden, nie über Lücken) ──
  const terrainHills = [
    { startCol: 8,   endCol: 22,  peakTiles: 1.8, baseRow: ground, skew: 0.1 },  // Labor
    { startCol: 40,  endCol: 58,  peakTiles: 2.2, baseRow: ground, skew: 0.2 },  // Labor/Prototyp
    { startCol: 85,  endCol: 100, peakTiles: 2.0, baseRow: ground, skew: 0.15 }, // U1
    { startCol: 116, endCol: 130, peakTiles: 2.4, baseRow: ground, skew: 0.2 },  // U1
    { startCol: 155, endCol: 170, peakTiles: 2.2, baseRow: ground, skew: 0.15 }, // MatchSuite
    { startCol: 186, endCol: 200, peakTiles: 2.0, baseRow: ground, skew: 0.2 },  // MatchSuite
    { startCol: 250, endCol: 276, peakTiles: 3.6, baseRow: ground, skew: 0.3 },  // Finale-Anstieg zum Ziel
  ];
  for (const h of terrainHills)
    for (let c = h.startCol; c <= h.endCol; c++) set(c, ground, TileType.GROUND);

  // Boss-Tor: solide Barriere-Säule vor der Flagge (col 280). Verschwindet,
  // sobald der Boss besiegt ist (Engine entfernt die Tiles → Weg zur Flagge frei).
  const gateCol = 280, gateTop = ground - 5, gateBot = ground - 1;
  for (let r = gateTop; r <= gateBot; r++) set(gateCol, r, TileType.GROUND);

  // Boden-Gegner auf Hügelkurve heben (sonst stecken sie im Hang).
  const groundEnemies = new Set<EntityType>([EntityType.GOOMBA, EntityType.KOOPA, EntityType.BOMB_OMB]);
  for (const e of entities) {
    if (e.type === EntityType.SPRING_STONE || e.type === EntityType.CRATE) {
      const sy = smoothGroundY(terrainHills, e.x + TILE_SIZE / 2);
      if (sy !== null) e.y = sy;
      continue;
    }
    if (!groundEnemies.has(e.type)) continue;
    const sy = smoothGroundY(terrainHills, e.x + TILE_SIZE / 2);
    if (sy !== null && sy < e.y + 28) e.y = sy - 28;
  }

  // Kopffreiheit über Anstiegen GARANTIEREN (fehlte bisher in bluefield — die
  // Figur konnte am Finale-Hügel 250–276 an Blöcken hängenbleiben).
  clearHillHeadroom(tiles, terrainHills, width, height);

  // Geheimraum „Serverhalle DE" im Live-Finale: Eingangs-Röhre auf FLACHEN Grund
  // vor den Finale-Hügel (col 249) verlegt — bei col 258 steckte sie halb im
  // ansteigenden Hügel und blockierte den sauberen Lauf (Röhre lugte nur ~1 Kachel
  // heraus). Raum weiter im soliden Untergrund 245–258 (lückenfrei).
  const warpRoom = buildUndergroundRoom({ set, addCoinRow, ground, entryCol: 248, roomL: 245 });

  return {
    name: 'World 13: Die blaue Wiese',
    theme: 'bluefield',
    width,
    height,
    groundRow: ground,
    tiles,
    entities: entities,
    movingPlatforms: [
      // Forschungs-Plattform über der mittleren Markttest-Lücke.
      { centerCol: 232, centerRow: ground - 2, widthTiles: 3, amplitudeTiles: 2, path: 'horizontal', speed: 0.5 },
    ],
    terrainHills,
    playerStart: { x: 3 * TILE_SIZE, y: (ground - 2) * TILE_SIZE },
    flagPosition: { x: 282 * TILE_SIZE, y: (ground - 10) * TILE_SIZE },
    checkpoint: { col: 217, row: ground },
    bossGate: { col: gateCol, rowTop: gateTop, rowBottom: gateBot },
    warpPipes: warpRoom,
    cameraZones: [
      { colStart: 252, colEnd: 269, rowStart: 15, rowEnd: 23, zoom: 1.18 },
    ],
    signs: [
      // ① Labor
      { col: 4, row: ground - 1, lines: ['// bluefield · 01 hypothese', 'aus ideen echte produkte', 'these formuliert'] },
      { col: 34, row: ground - 1, lines: ['// 02 prototyp', 'build laeuft'] },
      // ② U1-Optimierer
      { col: 72, row: ground - 1, lines: ['// u1-optimierer · live', 'beitraege senken, erfolgsbasiert'] },
      { col: 108, row: ground - 1, lines: ['// u1 · rueckholung', 'Ø 3.540 € pro jahr'] },
      { col: 103, row: ground - 1, lines: ['// u1 · geld zurueck', 'feder hoch → erfolgsbasiert'] },
      // ③ MatchSuite
      { col: 144, row: ground - 1, lines: ['// matchsuite · im aufbau', 'berater-matching, semantisch'] },
      { col: 188, row: ground - 1, lines: ['// matchsuite', 'profil ↔ projekt'] },
      { col: 199, row: ground - 1, lines: ['// matchsuite · match', 'schalter = profil trifft projekt', '→ die tuer oeffnet sich'] },
      // ④ Bluefield-Finale
      { col: 214, row: ground - 1, lines: ['// 03 markttest', 'was durchfaellt, faellt durch'] },
      { col: 225, row: ground - 1, lines: ['// werte', 'server_de · dsgvo · pay-on-success', 'eigenfinanziert · keine us-systeme'] },
      { col: 237, row: ground - 1, lines: ['// gkv-vergleich · geplant', 'vergleichsportal', 'kiste auf → ergebnis'] },
      { col: 248, row: ground - 1, lines: ['// 04 live · go-live', 'wird eigene marke · 100% de'] },
    ],
    heartBlocks: powerBlocks.heart,
    fireBlocks: powerBlocks.fire,
    magnetBlocks: powerBlocks.magnet,
    capeBlocks: powerBlocks.cape,
    shieldBlocks: powerBlocks.shield,
    superBlocks: powerBlocks.super,
    // Die drei Produkte als Sammelziel, je in ihrer Sektion:
    specialCoins: [
      '100,' + (ground - 4),  // U1-Optimierer (live) — in der U1-Sektion
      '175,' + (ground - 7),  // MatchSuite (im Aufbau) — über dem Aufbau-Gerüst
      '231,' + (ground - 5),  // GKV-Vergleich (geplant) — Risk-Reward über Lücke 2
    ],
  };
}
