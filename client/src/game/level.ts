import { TileType, EntityType, ThemeName, TILE_SIZE } from './constants';
import type { HillSpec } from './terrain';

  import { createJungleLevel } from './levels/jungle';
  import { createPlushLevel } from './levels/plush';
  import { createCaveLevel } from './levels/cave';
  import { createSkyLevel } from './levels/sky';
  import { createBeachLevel } from './levels/beach';
  import { createAustraliaLevel } from './levels/australia';
  import { createVulkanLevel } from './levels/volcano';
  import { createEisLevel } from './levels/ice';
  import { createSchlossLevel } from './levels/castle';
  import { createUnterwasserLevel } from './levels/underwater';
  import { createWeltraumLevel } from './levels/space';
  import { createSchoolLevel } from './levels/school';
  import { createTurnenLevel } from './levels/turnen';
  import { createTrampolineLevel } from './levels/trampoline';
  import { createBluefieldLevel } from './levels/bluefield';
  import { createDragonLevel } from './levels/dragon';

  export {
    createJungleLevel, createPlushLevel, createCaveLevel, createSkyLevel, createBeachLevel,
    createAustraliaLevel, createVulkanLevel, createEisLevel, createSchlossLevel,
    createUnterwasserLevel, createWeltraumLevel, createSchoolLevel, createTurnenLevel, createTrampolineLevel,
    createBluefieldLevel,
  };

  export interface EntitySpawn {
    type: EntityType;
    x: number;
    y: number;
    /** Nur DOOR: Höhe in Tiles. Nur DOOR/P_SWITCH: `group` verknüpft Schalter↔Tür. */
    hTiles?: number;
    group?: number;
  }

  /**
   * Task #31 — Spec für eine MovingPlatform. `centerCol`/`centerRow` ist
   * der Anker (Tile-Koords) um den die Plattform sinusförmig pendelt.
   * `widthTiles` = Plattformbreite in Tiles, `amplitudeTiles` = halbe
   * Pendelstrecke in Tiles, `path` = Achse, `speed` optional in px/frame.
   */
  export interface MovingPlatformSpec {
    centerCol: number;
    centerRow: number;
    widthTiles: number;
    amplitudeTiles: number;
    path: 'horizontal' | 'vertical';
    speed?: number;
  }

  /**
   * Task #31 — Warp-Pipe (Intra-Level-Teleport). `from` = Tile-Koord der
   * Pipe-Mündung (Spielerin steht auf diesem Row, Mitte zwischen `col`
   * und `col+1`), `to` = Welt-Pixel des Ziels (typischerweise eine
   * versteckte Bonus-Kammer im selben Level).
   */
  export interface WarpPipeSpec {
    from: { col: number; row: number };
    to: { x: number; y: number };
  }

  /**
   * Kamera-Zone: in einem Spalten- (und optional Reihen-)Bereich wird der
   * Zoom abweichend gesetzt. zoom > 1 = näher heran (enge Passagen, Geheim-
   * räume), zoom < 1 = weiter weg (Übersicht). Übergänge werden weich
   * interpoliert. rowStart/rowEnd optional, um z. B. nur den unterirdischen
   * Raum (gleiche Spalten, andere Reihen) abzudecken.
   */
  export interface CameraZone {
    colStart: number;
    colEnd: number;
    rowStart?: number;
    rowEnd?: number;
    zoom: number;
  }

  export interface LevelSign {
    /** Tile column where the SIGN tile sits. */
    col: number;
    /** Tile row where the SIGN tile sits (the post). */
    row: number;
    /** Lines of text shown on the wooden board above the sign. */
    lines: string[];
  }

  export interface LevelData {
    name: string;
    theme: ThemeName;
    width: number;
    height: number;
    /**
     * Reihe des begehbaren Hauptbodens. Normalerweise height-2; bei Levels mit
     * unterirdischen Räumen ist die Spielfläche höher als der Boden, daher wird
     * groundRow explizit gesetzt. Engine/Renderer nutzen groundRowOf(level).
     */
    groundRow?: number;
    tiles: TileType[][];
    entities: EntitySpawn[];
    playerStart: { x: number; y: number };
    flagPosition: { x: number; y: number };
    backgroundColor?: string;
    heartBlocks?: string[];
    starBlocks?: string[];
    fireBlocks?: string[];
    magnetBlocks?: string[];
    capeBlocks?: string[];
    shieldBlocks?: string[];
    superBlocks?: string[];
    clockBlocks?: string[];
    signs?: LevelSign[];
    /**
     * Mid-Level-Checkpoint (Task #29). Position der Checkpoint-Flagge.
     * `col`/`row` beschreiben die Tile-Position des Flaggenfußes; der
     * Spieler aktiviert die Flagge, sobald er ihre Säule passiert,
     * und respawnt nach dem Tod an dieser Stelle (statt am
     * Levelanfang). Wird pro laufenden Run gehalten — Game-Over bzw.
     * Levelwechsel setzen den Aktivierungs-Status zurück.
     */
    checkpoint?: { col: number; row: number };
    /** Boss-Tor: solide Barriere-Spalte, die verschwindet, sobald kein Boss
     *  mehr lebt (Boss-Arena). Tiles rowTop..rowBottom in Spalte col. */
    bossGate?: { col: number; rowTop: number; rowBottom: number };    /**
     * Sonder-Münzen (Task #30). Genau drei versteckte Sammelmünzen pro
     * Level — jede Koordinate ist `"col,row"` (Tile-Position der Münze).
     * Die Reihenfolge im Array entspricht dem persistierten Slot-Index
     * (0..2), sodass die HUD/Album-Anzeige stabil bleibt.
     */
    specialCoins?: string[];
    /** Bewegliche Plattformen (pendeln horizontal/vertikal, tragen die Spielerin). */
    movingPlatforms?: MovingPlatformSpec[];
    /** Warp-Röhren (Intra-Level-Teleport in Bonus-Kammern, s. WarpPipeSpec). */
    warpPipes?: WarpPipeSpec[];
    /** Kamera-Zonen mit abweichendem Zoom (s. CameraZone). */
    cameraZones?: CameraZone[];
    /** Glatte, begehbare Hügel (gekrümmte Höhenkurve statt 45°-Rampen). */
    terrainHills?: HillSpec[];
    /** Schwing-Ringe: Pendel-Anker (col/row = Deckenpunkt) + Seillänge (px).
     *  Die Spielerin greift den Ring in der Luft, schwingt mit und lässt per
     *  Sprung wieder los (Tangential-Schwung trägt über die Grube). */
    swingRings?: { col: number; row: number; len: number }[];
    /** Tarzan-Schwingseile: langes Seil, das als Pendel von der Decke schwingt.
     *  col/row = Deckenanker, len = Seillänge (px), phase = Startphase (rad) für
     *  versetztes Schwingen mehrerer Seile. Die Spielerin greift das untere
     *  Seilende in der Luft, schwingt mit und lässt sich wie Tarzan hinüber-
     *  schleudern (Impuls folgt dem Schwung). */
    swingRopes?: { col: number; row: number; len: number; phase?: number }[];
  }

  export interface LevelInfo {
    id: number;
    name: string;
    subtitle: string;
    theme: ThemeName;
    create: () => LevelData;
  }

  export const LEVELS: LevelInfo[] = [
    { id: 1, name: 'Dschungel Abenteuer', subtitle: 'Der Anfang', theme: 'jungle', create: createJungleLevel },
    { id: 2, name: 'Plüsch-Traumland', subtitle: 'Bei den Kuscheltieren', theme: 'plush', create: createPlushLevel },
    { id: 3, name: 'Dunkle Höhle', subtitle: 'Unterirdisch', theme: 'cave', create: createCaveLevel },
    { id: 4, name: 'Wolken Welt', subtitle: 'Hoch hinaus', theme: 'sky', create: createSkyLevel },
    { id: 5, name: 'Strand Paradies', subtitle: 'Am Meer', theme: 'beach', create: createBeachLevel },
    { id: 6, name: 'Australien Outback', subtitle: 'Down Under', theme: 'australia', create: createAustraliaLevel },
    { id: 7, name: 'Vulkan Insel', subtitle: 'Heißes Pflaster', theme: 'volcano', create: createVulkanLevel },
    { id: 8, name: 'Eis Königreich', subtitle: 'Glatteis', theme: 'ice', create: createEisLevel },
    { id: 9, name: 'Geister Schloss', subtitle: 'Spukige Hallen', theme: 'castle', create: createSchlossLevel },
    { id: 10, name: 'Tiefsee', subtitle: 'Unter Wasser', theme: 'underwater', create: createUnterwasserLevel },
    { id: 11, name: 'Sterne Mission', subtitle: 'Im Weltraum', theme: 'space', create: createWeltraumLevel },
    { id: 12, name: 'Schule', subtitle: 'Nach Schulschluss', theme: 'school', create: createSchoolLevel },
    { id: 13, name: 'Turnen', subtitle: 'In der Turnhalle', theme: 'gym', create: createTurnenLevel },
    { id: 14, name: 'Superfly', subtitle: 'Trampolinpark', theme: 'trampoline', create: createTrampolineLevel },
    { id: 15, name: 'Die blaue Wiese', subtitle: 'Bluefield Labor', theme: 'bluefield', create: createBluefieldLevel },
    { id: 16, name: 'Drachenhöhle', subtitle: 'Der grüne Drache', theme: 'dragon', create: createDragonLevel },
  ];

  export function isSolidTile(type: TileType): boolean {
    return isSolidForCollision(type);
  }

  export function isSolidForCollision(type: TileType): boolean {
    switch (type) {
      case TileType.EMPTY:
      case TileType.DECORATION_VINE:
      case TileType.DECORATION_FLOWER:
      case TileType.WATER_TOP:
      case TileType.WATER:
      case TileType.LAVA_TOP:
      case TileType.LAVA:
      case TileType.DEEP_WATER:
      case TileType.SEAWEED:
      case TileType.DECORATION_PROP:
      case TileType.ROPE:
      case TileType.SPIKE:
      case TileType.SIGN:
      // One-way platform: not solid for the generic AABB pass; handled
      // specially in Physics.moveStep (land on top only, pass through below).
      case TileType.WOOD_PLATFORM:
      // Slopes: non-solid for AABB; resolved by a height-map post-step.
      case TileType.SLOPE_RIGHT_45:
      case TileType.SLOPE_LEFT_45:
        return false;
      default:
        return true;
    }
  }

  // Semisolid / one-way platforms: solid only from above (stand on top,
  // jump up through, drop through with Down). Currently the wooden plank.
  export function isOneWayPlatform(type: TileType): boolean {
    return type === TileType.WOOD_PLATFORM;
  }

  // 45° slope tiles, resolved via a height map in the physics post-step.
  export function isSlopeTile(type: TileType): boolean {
    return type === TileType.SLOPE_RIGHT_45 || type === TileType.SLOPE_LEFT_45;
  }

  // World Y of the walkable surface of a 45° slope tile (col,row) at a local
  // X offset (0..TILE_SIZE from the tile's left edge). RIGHT rises toward the
  // right (left edge = tile bottom, right edge = tile top); LEFT mirrors it.
  export function slopeSurfaceY(type: TileType, col: number, row: number, localX: number): number {
    const lx = Math.max(0, Math.min(TILE_SIZE, localX));
    void col;
    if (type === TileType.SLOPE_RIGHT_45) {
      return (row + 1) * TILE_SIZE - lx;
    }
    // SLOPE_LEFT_45
    return row * TILE_SIZE + lx;
  }
  
/** Reihe des begehbaren Hauptbodens (groundRow, sonst height-2 als Default). */
export function groundRowOf(level: { height: number; groundRow?: number }): number {
  return level.groundRow ?? level.height - 2;
}
