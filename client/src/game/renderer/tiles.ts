import type { Renderer } from '../renderer.ts';
import { TILE_SIZE, TileType } from '../constants.ts';

// W3.3 · Kanten-Highlight-Farben (rim light) pro Welt — jeweils heller als der
// Boden, damit die Oberkante als beleuchtete Kante liest (Plastizität).
const TOP_RIM: Record<string, string> = {
  jungle: 'rgba(158,230,128,0.42)',
  bluefield: 'rgba(190,216,255,0.42)',
  cave: 'rgba(150,170,205,0.34)',
  sky: 'rgba(255,250,220,0.40)',
  beach: 'rgba(255,240,190,0.44)',
  australia: 'rgba(255,200,150,0.42)',
  volcano: 'rgba(255,180,120,0.42)',
  ice: 'rgba(222,240,255,0.48)',
  castle: 'rgba(222,212,242,0.36)',
  underwater: 'rgba(180,240,255,0.40)',
  space: 'rgba(210,210,255,0.34)',
  school: 'rgba(255,245,225,0.34)',
  gym: 'rgba(255,238,200,0.42)',
  trampoline: 'rgba(255,220,245,0.40)',
  plush: 'rgba(255,244,250,0.5)',
};

// AP 1.5: Kacheln, auf denen sichtbare Wiederholung am störendsten ist und
// die eine dezente, positionsabhängige Textur-Variation bekommen (erdige /
// steinige Flächen — Wasser, Lava, Eis bleiben unberührt, sie haben eigenen
// animierten Look).
const VARIABLE_TILES = new Set<number>([
  TileType.GROUND, TileType.GROUND_TOP, TileType.GROUND_LEFT, TileType.GROUND_RIGHT,
  TileType.GROUND_TOP_LEFT, TileType.GROUND_TOP_RIGHT,
  TileType.BRICK, TileType.STONE, TileType.MOSS_GROUND,
  TileType.CASTLE_STONE, TileType.CASTLE_TOP, TileType.SPACE_METAL, TileType.SPACE_TOP,
]);

function tileVarHash(a: number, b: number): number {
  const n = Math.sin(a * 73.13 + b * 41.79) * 21357.913;
  return n - Math.floor(n);
}

// Dezente neutrale Sprenkel (dunkle Steinchen / helle Aufhellungen), die das
// regelmäßige Kachelmuster aufbrechen, ohne harte Tile-Grenzen zu betonen.
function applyTileVariation(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
  // W3.3 · Makro-Variation: ganze Kachel dezent heller/dunkler tönen
  // (deterministisch aus Position) → bricht Wiederholung großflächig, ergänzend
  // zu den feinen Sprenkeln unten.
  const tone = tileVarHash(col + 3, row + 5);
  const shade = (tone - 0.5) * 0.07;
  ctx.fillStyle = shade >= 0 ? `rgba(255,255,255,${shade.toFixed(3)})` : `rgba(0,0,0,${(-shade).toFixed(3)})`;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  const h = tileVarHash(col + 19, row + 7);
  if (h < 0.5) return; // nur ~Hälfte der Kacheln bekommt überhaupt Dekor
  const count = h > 0.86 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const hx = tileVarHash(col * 2 + i, row + 3);
    const hy = tileVarHash(col + 11, row * 2 + i);
    const dx = x + 5 + hx * (TILE_SIZE - 10);
    const dy = y + 5 + hy * (TILE_SIZE - 10);
    const r = 1.3 + hx * 1.5;
    ctx.fillStyle = hy > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTile(this: Renderer, tileType: TileType, screenX: number, screenY: number, col = -1, row = -1) {
  // Schul-Deko: positions-abhängige Variante (Pult/Bücher/Pflanze/Eimer),
  // daher nicht über den per-TileType-Cache, sondern direkt gezeichnet.
  if (tileType === TileType.DECORATION_PROP && this.currentTheme === 'school' && col >= 0) {
    this.drawSchoolProp(this.ctx, screenX, screenY, col);
    return;
  }
  if (tileType === TileType.DECORATION_PROP && this.currentTheme === 'trampoline' && col >= 0) {
    this.drawTrampolineProp(this.ctx, screenX, screenY, col);
    return;
  }
  if (tileType === TileType.DECORATION_PROP && this.currentTheme === 'gym' && col >= 0) {
    this.drawGymProp(this.ctx, screenX, screenY, col);
    return;
  }
  if (tileType === TileType.DECORATION_PROP && this.currentTheme === 'plush' && col >= 0) {
    this.drawPlushProp(this.ctx, screenX, screenY, col);
    return;
  }
  if (tileType === TileType.DECORATION_PROP && this.currentTheme === 'forest' && col >= 0) {
    this.drawForestProp(this.ctx, screenX, screenY, col);
    return;
  }
  // Theme switches call tileCache.clear(), so the bare TileType enum value
  // is sufficient as a key. Avoids per-frame string allocation.
  let cached = this.tileCache.get(tileType);
  if (!cached) {
    cached = this.renderTileToCache(tileType);
    this.tileCache.set(tileType, cached);
  }
  this.ctx.drawImage(cached, screenX, screenY);
  // AP 1.5: positionsabhängige Variation gegen sichtbares Kacheln. Nur im
  // Spiel-Tile-Pass (col/row gesetzt), ab Qualitätsstufe 'mid', auf erdigen
  // Flächen. HUD-Deko ruft ohne col/row → keine Variation.
  if (col >= 0 && this.quality !== 'low' && VARIABLE_TILES.has(tileType)) {
    applyTileVariation(this.ctx, screenX, screenY, col, row);
  }
  // Tiefe Erdschichten (deutlich unter dem Hauptboden) abdunkeln, damit der
  // unnötig sichtbare Untergrund optisch zurücktritt ("fast weg"). Greift nur
  // bei Levels mit unterirdischen Räumen, wo die Spielfläche tiefer reicht.
  if (col >= 0 && row > this.currentGroundRow + 2 && VARIABLE_TILES.has(tileType)) {
    const depth = row - (this.currentGroundRow + 2);
    const a = Math.min(0.5, depth * 0.1);
    this.ctx.fillStyle = `rgba(8, 5, 3, ${a})`;
    this.ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
  }
}

function renderTileToCache(this: Renderer, type: TileType): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext('2d')!;

  const theme = this.currentTheme;
  // Drachenhöhle nutzt das Höhlen-Tileset (dunkler Fels, Kristalle); die grüne
  // Drachen-Stimmung kommt über Grade/Accent/Tint + Fossil-Blöcke + Deko.
  const isDragon = theme === 'dragon';
  const isCave = theme === 'cave' || isDragon;
  const isSky = theme === 'sky';
  const isBeach = theme === 'beach';
  const isAustralia = theme === 'australia';
  const isVolcano = theme === 'volcano';
  const isUnderwater = theme === 'underwater';
  const isSchool = theme === 'school';
  const isGym = theme === 'gym';
  const isTrampoline = theme === 'trampoline';
  const isPlush = theme === 'plush';
  switch (type) {
    case TileType.GROUND:
      if (isCave) this.drawCaveGroundTile(ctx, false);
      else if (isSky) this.drawSkyGroundTile(ctx, false);
      else if (isBeach) this.drawBeachGroundTile(ctx, false);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, false);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, false);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, false);
      else if (isSchool) this.drawSchoolGroundTile(ctx, false);
      else if (isGym) this.drawGymFloorTile(ctx, false);
      else if (isPlush) this.drawPlushFloorTile(ctx, false);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, false);
      else this.drawGroundTile(ctx, false, false, false, false);
      break;
    case TileType.GROUND_TOP:
      if (isCave) this.drawCaveGroundTile(ctx, true);
      else if (isSky) this.drawSkyGroundTile(ctx, true);
      else if (isBeach) this.drawBeachGroundTile(ctx, true);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, true);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, true);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, true);
      else if (isSchool) this.drawSchoolGroundTile(ctx, true);
      else if (isGym) this.drawGymFloorTile(ctx, true);
      else if (isPlush) this.drawPlushFloorTile(ctx, true);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, true);
      else this.drawGroundTile(ctx, true, false, false, false);
      // W3.3 · Kanten-Highlight (rim light) an der Oberkante, theme-abhängig.
      ctx.fillStyle = TOP_RIM[theme] ?? 'rgba(255,255,255,0.30)';
      ctx.fillRect(0, 0, TILE_SIZE, 1.5);
      break;
    case TileType.GROUND_LEFT:
      if (isCave) this.drawCaveGroundTile(ctx, false);
      else if (isSky) this.drawSkyGroundTile(ctx, false);
      else if (isBeach) this.drawBeachGroundTile(ctx, false);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, false);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, false);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, false);
      else if (isSchool) this.drawSchoolGroundTile(ctx, false);
      else if (isGym) this.drawGymFloorTile(ctx, false);
      else if (isPlush) this.drawPlushFloorTile(ctx, false);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, false);
      else this.drawGroundTile(ctx, false, true, false, false);
      break;
    case TileType.GROUND_RIGHT:
      if (isCave) this.drawCaveGroundTile(ctx, false);
      else if (isSky) this.drawSkyGroundTile(ctx, false);
      else if (isBeach) this.drawBeachGroundTile(ctx, false);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, false);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, false);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, false);
      else if (isSchool) this.drawSchoolGroundTile(ctx, false);
      else if (isGym) this.drawGymFloorTile(ctx, false);
      else if (isPlush) this.drawPlushFloorTile(ctx, false);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, false);
      else this.drawGroundTile(ctx, false, false, true, false);
      break;
    case TileType.GROUND_TOP_LEFT:
      if (isCave) this.drawCaveGroundTile(ctx, true);
      else if (isSky) this.drawSkyGroundTile(ctx, true);
      else if (isBeach) this.drawBeachGroundTile(ctx, true);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, true);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, true);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, true);
      else if (isSchool) this.drawSchoolGroundTile(ctx, true);
      else if (isGym) this.drawGymFloorTile(ctx, true);
      else if (isPlush) this.drawPlushFloorTile(ctx, true);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, true);
      else this.drawGroundTile(ctx, true, true, false, false);
      break;
    case TileType.GROUND_TOP_RIGHT:
      if (isCave) this.drawCaveGroundTile(ctx, true);
      else if (isSky) this.drawSkyGroundTile(ctx, true);
      else if (isBeach) this.drawBeachGroundTile(ctx, true);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, true);
      else if (isVolcano) this.drawVolcanoGroundTile(ctx, true);
      else if (isUnderwater) this.drawUnderwaterGroundTile(ctx, true);
      else if (isSchool) this.drawSchoolGroundTile(ctx, true);
      else if (isGym) this.drawGymFloorTile(ctx, true);
      else if (isPlush) this.drawPlushFloorTile(ctx, true);
      else if (isTrampoline) this.drawTrampolineGroundTile(ctx, true);
      else this.drawGroundTile(ctx, true, false, true, false);
      break;
    case TileType.PLATFORM:
      if (isGym) this.drawGymReckTile(ctx);
      else this.drawPlatformTile(ctx);
      break;
    case TileType.QUESTION_BLOCK:
      this.drawQuestionBlock(ctx, false);
      break;
    case TileType.QUESTION_BLOCK_USED:
      this.drawQuestionBlock(ctx, true);
      break;
    case TileType.NOTE_BLOCK:
      if (isTrampoline) this.drawTrampolineNote(ctx);
      else if (isGym) this.drawGymNote(ctx);
      else if (isPlush) this.drawPlushPillowTile(ctx);
      else this.drawNoteBlock(ctx);
      break;
    case TileType.BRICK:
      if (isCave) this.drawCaveBrickTile(ctx);
      else if (isSky) this.drawSkyBrickTile(ctx);
      else if (isBeach) this.drawBeachBrickTile(ctx);
      else if (isAustralia) this.drawAustraliaBrickTile(ctx);
      else if (isVolcano) this.drawVolcanoBrickTile(ctx);
      else if (isUnderwater) this.drawUnderwaterBrickTile(ctx);
      else this.drawBrickTile(ctx);
      break;
    case TileType.PIPE_TOP_LEFT:
      if (isCave) this.drawCavePipeTile(ctx, 'top-left');
      else if (isBeach) this.drawBeachPipeTile(ctx, 'top-left');
      else if (isAustralia) this.drawAustraliaPipeTile(ctx, 'top-left');
      else if (isSchool || isGym || isTrampoline) this.drawSchoolPipeTile(ctx, 'top-left');
      else this.drawPipeTile(ctx, 'top-left');
      break;
    case TileType.PIPE_TOP_RIGHT:
      if (isCave) this.drawCavePipeTile(ctx, 'top-right');
      else if (isBeach) this.drawBeachPipeTile(ctx, 'top-right');
      else if (isAustralia) this.drawAustraliaPipeTile(ctx, 'top-right');
      else if (isSchool || isGym || isTrampoline) this.drawSchoolPipeTile(ctx, 'top-right');
      else this.drawPipeTile(ctx, 'top-right');
      break;
    case TileType.PIPE_BODY_LEFT:
      if (isCave) this.drawCavePipeTile(ctx, 'body-left');
      else if (isBeach) this.drawBeachPipeTile(ctx, 'body-left');
      else if (isAustralia) this.drawAustraliaPipeTile(ctx, 'body-left');
      else if (isSchool || isGym || isTrampoline) this.drawSchoolPipeTile(ctx, 'body-left');
      else this.drawPipeTile(ctx, 'body-left');
      break;
    case TileType.PIPE_BODY_RIGHT:
      if (isCave) this.drawCavePipeTile(ctx, 'body-right');
      else if (isBeach) this.drawBeachPipeTile(ctx, 'body-right');
      else if (isAustralia) this.drawAustraliaPipeTile(ctx, 'body-right');
      else if (isSchool || isGym || isTrampoline) this.drawSchoolPipeTile(ctx, 'body-right');
      else this.drawPipeTile(ctx, 'body-right');
      break;
    case TileType.STONE:
      if (isCave) this.drawCaveStoneTile(ctx);
      else if (isSky) this.drawSkyStoneTile(ctx);
      else if (isBeach) this.drawBeachStoneTile(ctx);
      else if (isAustralia) this.drawAustraliaStoneTile(ctx);
      else if (isVolcano) this.drawVolcanoStoneTile(ctx);
      else if (isUnderwater) this.drawUnderwaterStoneTile(ctx);
      else if (isGym) this.drawGymVaultTile(ctx);
      else if (isPlush) this.drawPlushBlockTile(ctx);
      else this.drawStoneTile(ctx);
      break;
    case TileType.WOOD_PLATFORM:
      if (isCave) this.drawCaveWoodPlatform(ctx);
      else if (isSky) this.drawSkyCloudPlatform(ctx);
      else if (isBeach) this.drawBeachWoodPlatform(ctx);
      else if (isAustralia) this.drawAustraliaWoodPlatform(ctx);
      else if (isSchool) this.drawSchoolPlatformTile(ctx);
      else if (isGym) this.drawGymBarTile(ctx);
      else if (isPlush) this.drawPlushLedge(ctx);
      else if (isTrampoline) this.drawTrampolinePlatformTile(ctx);
      else this.drawWoodPlatform(ctx);
      break;
    case TileType.SLOPE_RIGHT_45:
      this.drawSlopeTile(ctx, 1);
      break;
    case TileType.SLOPE_LEFT_45:
      this.drawSlopeTile(ctx, -1);
      break;
    case TileType.MOSS_GROUND:
      if (isSky) this.drawSkyGroundTile(ctx, true);
      else if (isBeach) this.drawBeachGroundTile(ctx, true);
      else if (isAustralia) this.drawAustraliaGroundTile(ctx, true);
      else this.drawMossGround(ctx);
      break;
    case TileType.DECORATION_VINE:
      this.drawVine(ctx);
      break;
    case TileType.ROPE:
      this.drawRopeTile(ctx);
      break;
    case TileType.DECORATION_FLOWER:
      this.drawFlower(ctx);
      break;
    case TileType.DECORATION_PROP:
      this.drawThemedProp(ctx);
      break;
    case TileType.WATER_TOP:
      if (isCave) this.drawCaveLava(ctx, true);
      else if (isBeach) this.drawBeachWater(ctx, true, !isUnderwater);
      else this.drawWater(ctx, true, !isUnderwater);
      break;
    case TileType.WATER:
      if (isCave) this.drawCaveLava(ctx, false);
      else if (isBeach) this.drawBeachWater(ctx, false, !isUnderwater);
      else this.drawWater(ctx, false, !isUnderwater);
      break;
    // --- New themed tile fallbacks (volcano / ice / castle / underwater / space) ---
    case TileType.LAVA_TOP:
      this.drawCaveLava(ctx, true);
      break;
    case TileType.LAVA:
      this.drawCaveLava(ctx, false);
      break;
    case TileType.ICE_TOP:
      this.drawIceTile(ctx, true);
      break;
    case TileType.ICE:
      this.drawIceTile(ctx, false);
      break;
    case TileType.CASTLE_TOP:
      this.drawCastleStoneTile(ctx, true);
      break;
    case TileType.CASTLE_STONE:
      this.drawCastleStoneTile(ctx, false);
      break;
    case TileType.SPACE_TOP:
      this.drawSpaceMetalTile(ctx, true);
      break;
    case TileType.SPACE_METAL:
      this.drawSpaceMetalTile(ctx, false);
      break;
    case TileType.DEEP_WATER:
      this.drawWater(ctx, false);
      break;
    case TileType.SEAWEED:
      this.drawVine(ctx);
      break;
    case TileType.SPIKE:
      this.drawSpikeTile(ctx);
      break;
    case TileType.SIGN:
      this.drawSign(ctx);
      break;
  }

  // Per-theme tile detail overlay — baked into the tile cache so it has
  // zero per-frame cost. Adds tiny world-specific micro-details to the
  // GROUND/GROUND_TOP tiles so each world reads visually distinct even
  // before backgrounds and enemies render. Skipped for non-ground tiles
  // and for the cave theme (already heavily decorated by drawCaveGroundTile).
  const isGround = type === TileType.GROUND || type === TileType.GROUND_TOP
    || type === TileType.GROUND_LEFT || type === TileType.GROUND_RIGHT
    || type === TileType.GROUND_TOP_LEFT || type === TileType.GROUND_TOP_RIGHT;
  if (isGround) {
    const isTop = type === TileType.GROUND_TOP || type === TileType.GROUND_TOP_LEFT || type === TileType.GROUND_TOP_RIGHT;
    applyThemeDetailOverlay(ctx, theme, isTop, type);
  }

  return c;
}

// Per-theme micro-detail overlay. Uses a deterministic pseudo-random so
// every cached tile of the same type+theme renders identically. All
// drawing is restricted to a few primitives (rect/arc) for speed.
function applyThemeDetailOverlay(ctx: CanvasRenderingContext2D, theme: string, isTop: boolean, typeSeed: number) {
  const S = TILE_SIZE;
  const rand = (n: number) => ((n * 1103515245 + 12345 + typeSeed * 17) & 0x7fffffff) / 0x7fffffff;
  ctx.save();

  switch (theme) {
    case 'jungle': {
      // Mossy fuzz + tiny twigs on the top edge; small leaf chips on body.
      if (isTop) {
        for (let i = 0; i < 6; i++) {
          const mx = Math.floor(rand(i + 1) * S);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(80, 180, 60, 0.7)' : 'rgba(120, 200, 80, 0.55)';
          ctx.fillRect(mx, -1, 2, 2);
        }
        ctx.fillStyle = 'rgba(255, 220, 90, 0.55)';
        ctx.fillRect(Math.floor(rand(99) * (S - 4)), 1, 1, 1);
      }
      ctx.fillStyle = 'rgba(50, 120, 40, 0.35)';
      ctx.fillRect(3, S - 7, 2, 1);
      ctx.fillRect(S - 9, S - 5, 3, 1);
      ctx.fillRect(11, S - 4, 2, 1);
      break;
    }
    case 'sky': {
      // Wispy cloud bits along bottom + a faint shimmer pip on top.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let i = 0; i < 4; i++) {
        const cx = Math.floor(rand(i + 11) * S);
        ctx.fillRect(cx, S - 3, 3, 1);
      }
      if (isTop) {
        ctx.fillStyle = 'rgba(200, 240, 255, 0.7)';
        ctx.fillRect(Math.floor(rand(7) * S), 1, 1, 1);
      }
      break;
    }
    case 'beach': {
      // Tiny shells + pale sand sparkles.
      ctx.strokeStyle = 'rgba(255, 200, 150, 0.55)';
      ctx.lineWidth = 0.8;
      const shellX = 4 + Math.floor(rand(3) * (S - 8));
      const shellY = isTop ? 6 : Math.floor(rand(5) * (S - 6)) + 2;
      ctx.beginPath();
      ctx.arc(shellX, shellY, 2, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 250, 220, 0.85)';
      ctx.fillRect(Math.floor(rand(15) * S), Math.floor(rand(17) * S), 1, 1);
      ctx.fillRect(Math.floor(rand(21) * S), Math.floor(rand(23) * S), 1, 1);
      break;
    }
    case 'australia': {
      // Red dust grain + a tiny acacia leaf spec.
      ctx.fillStyle = 'rgba(160, 70, 30, 0.5)';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(Math.floor(rand(i + 31) * S), Math.floor(rand(i + 41) * S), 1, 1);
      }
      if (isTop) {
        ctx.fillStyle = 'rgba(120, 160, 60, 0.65)';
        ctx.beginPath();
        ctx.ellipse(Math.floor(rand(51) * (S - 4)) + 2, 2, 2, 1, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'volcano': {
      // Faint ember pips glowing in the cracks.
      for (let i = 0; i < 3; i++) {
        const ex = Math.floor(rand(i + 61) * S);
        const ey = Math.floor(rand(i + 71) * S);
        ctx.fillStyle = `rgba(255, ${120 + i * 30}, 30, 0.85)`;
        ctx.fillRect(ex, ey, 1, 1);
      }
      if (isTop) {
        ctx.fillStyle = 'rgba(255, 180, 60, 0.6)';
        ctx.fillRect(Math.floor(rand(81) * (S - 3)) + 1, 0, 2, 1);
      }
      break;
    }
    case 'ice': {
      // Sparkling frost crystals.
      for (let i = 0; i < 4; i++) {
        const fx = Math.floor(rand(i + 91) * S);
        const fy = Math.floor(rand(i + 101) * S);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(fx, fy, 1, 1);
        ctx.fillStyle = 'rgba(180, 230, 255, 0.55)';
        ctx.fillRect(fx - 1, fy, 1, 1);
        ctx.fillRect(fx + 1, fy, 1, 1);
      }
      break;
    }
    case 'castle': {
      // Faint rune scratches + extra crack.
      ctx.strokeStyle = 'rgba(220, 200, 120, 0.35)';
      ctx.lineWidth = 0.8;
      const rx = 6 + Math.floor(rand(111) * (S - 12));
      const ry = 6 + Math.floor(rand(121) * (S - 12));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 3, ry - 2);
      ctx.lineTo(rx + 6, ry);
      ctx.stroke();
      break;
    }
    case 'underwater': {
      // Tiny barnacles and bubble bumps.
      ctx.fillStyle = 'rgba(220, 240, 255, 0.55)';
      for (let i = 0; i < 3; i++) {
        const bx = Math.floor(rand(i + 131) * (S - 4)) + 2;
        const by = isTop ? 4 + i : Math.floor(rand(i + 141) * (S - 4)) + 2;
        ctx.beginPath();
        ctx.arc(bx, by, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255, 200, 120, 0.45)';
      ctx.fillRect(S - 6, S - 5, 2, 2);
      break;
    }
    case 'space': {
      // Faint hex circuit dots + a single LED pip.
      ctx.fillStyle = 'rgba(140, 200, 255, 0.55)';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(Math.floor(rand(i + 151) * S), Math.floor(rand(i + 161) * S), 1, 1);
      }
      if (isTop) {
        ctx.fillStyle = 'rgba(120, 240, 200, 0.95)';
        ctx.fillRect(Math.floor(rand(171) * (S - 3)) + 1, 1, 2, 1);
      }
      break;
    }
    case 'plush': {
      // Weiche Stoff-Naht (Steppstiche) am oberen Rand + kleiner Filz-Fussel.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      if (isTop) {
        ctx.beginPath();
        ctx.moveTo(2, 4);
        ctx.lineTo(S - 2, 4);
        ctx.stroke();
      }
      // Ein diagonaler Stich quer über den Körper.
      ctx.beginPath();
      ctx.moveTo(4, S - 6);
      ctx.lineTo(S - 5, S - 9);
      ctx.stroke();
      ctx.setLineDash([]);
      // Zwei pastellige Filz-Punkte.
      ctx.fillStyle = 'rgba(255, 190, 225, 0.45)';
      ctx.beginPath(); ctx.arc(Math.floor(rand(181) * S), Math.floor(rand(191) * (S - 6)) + 4, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(190, 225, 255, 0.4)';
      ctx.beginPath(); ctx.arc(Math.floor(rand(201) * S), Math.floor(rand(211) * (S - 6)) + 4, 1.2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'gym': {
      // Holzboden-Maserung (senkrechte Fugen) + eine dünne Markierungslinie.
      ctx.strokeStyle = 'rgba(120, 75, 30, 0.28)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const gx = 8 + Math.floor(rand(i + 221) * (S - 12));
        ctx.beginPath();
        ctx.moveTo(gx, 2);
        ctx.lineTo(gx, S - 2);
        ctx.stroke();
      }
      if (isTop) {
        // Aufgemalte Sportfeld-Linie (weiss).
        ctx.strokeStyle = 'rgba(255, 250, 230, 0.6)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(S, 5);
        ctx.stroke();
      }
      break;
    }
    case 'school': {
      // Linoleum-Fliesenfugen (Kreuzraster) + kleiner Kreide-Fussel.
      ctx.strokeStyle = 'rgba(120, 95, 60, 0.22)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S);
      ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(Math.floor(rand(231) * S), Math.floor(rand(241) * S), 1, 1);
      break;
    }
    case 'trampoline': {
      // Federndes Netz-Gewebe (Punktraster) + Naht.
      ctx.fillStyle = 'rgba(180, 255, 225, 0.4)';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(Math.floor(rand(i + 251) * S), Math.floor(rand(i + 261) * S), 1, 1);
      }
      if (isTop) {
        ctx.strokeStyle = 'rgba(120, 255, 200, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 4); ctx.lineTo(S, 4);
        ctx.stroke();
      }
      break;
    }
    case 'bluefield': {
      // Blaugrüne Grashalme am oberen Rand + ein kleiner Blütenpunkt.
      if (isTop) {
        ctx.strokeStyle = 'rgba(120, 220, 180, 0.65)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const bx = Math.floor(rand(i + 271) * S);
          ctx.beginPath();
          ctx.moveTo(bx, 3);
          ctx.lineTo(bx + (i % 2 === 0 ? 1.5 : -1.5), -3);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 240, 150, 0.8)';
        ctx.beginPath(); ctx.arc(Math.floor(rand(281) * (S - 4)) + 2, 1, 1.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(90, 180, 210, 0.3)';
      ctx.fillRect(Math.floor(rand(291) * S), Math.floor(rand(301) * (S - 6)) + 4, 1, 1);
      break;
    }
    default: break;
  }

  // Tiefen-Kanten für die zuvor vernachlässigten Böden: heller Licht-Saum
  // ganz oben (Sonnenkante) + weicher Schatten am unteren Rand (Kontakt-AO).
  // Die bereits reich texturierten Welten bleiben unangetastet.
  if (theme === 'plush' || theme === 'gym' || theme === 'school'
    || theme === 'trampoline' || theme === 'bluefield') {
    if (isTop) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(0, 0, S, 1);
    }
    const ao = ctx.createLinearGradient(0, S - 5, 0, S);
    ao.addColorStop(0, 'rgba(0,0,0,0)');
    ao.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = ao;
    ctx.fillRect(0, S - 5, S, 5);
  }
  ctx.restore();
}

function drawIceTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#eaf8ff');
  grad.addColorStop(0.5, '#a8d8ee');
  grad.addColorStop(1, '#5d96b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Crystal facet highlights — diagonal sheen.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(S * 0.6, 0);
  ctx.lineTo(0, S * 0.6);
  ctx.closePath();
  ctx.fill();

  // Cracks / fissures.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const x0 = 4 + i * 9;
    ctx.beginPath();
    ctx.moveTo(x0, 4);
    ctx.lineTo(x0 + 3, 12);
    ctx.lineTo(x0 + 1, S - 4);
    ctx.stroke();
  }

  // Snow crust on top with little rounded blobs + tiny icicle.
  if (top) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(S * 0.15, 0, S * 0.3, 3);
    ctx.quadraticCurveTo(S * 0.5, 6, S * 0.7, 2);
    ctx.quadraticCurveTo(S * 0.85, 0, S, 4);
    ctx.lineTo(S, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(180, 220, 240, 0.7)';
    ctx.beginPath();
    ctx.moveTo(S * 0.7, 4);
    ctx.lineTo(S * 0.74, 10);
    ctx.lineTo(S * 0.66, 4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(40, 80, 110, 0.6)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawCastleStoneTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#807c70');
  grad.addColorStop(0.5, '#5d5a4e');
  grad.addColorStop(1, '#36322a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Block faces — staggered brickwork.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
  ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S / 2);
  ctx.moveTo(S / 4, S / 2); ctx.lineTo(S / 4, S);
  ctx.moveTo((3 * S) / 4, S / 2); ctx.lineTo((3 * S) / 4, S);
  ctx.stroke();

  // Highlight on top of each brick (light from above).
  ctx.strokeStyle = 'rgba(255, 240, 220, 0.18)';
  ctx.beginPath();
  ctx.moveTo(0, 1); ctx.lineTo(S, 1);
  ctx.moveTo(0, S / 2 + 1); ctx.lineTo(S / 4, S / 2 + 1);
  ctx.moveTo(S / 4, S / 2 + 1); ctx.lineTo((3 * S) / 4, S / 2 + 1);
  ctx.stroke();

  // Wear/cracks — tiny dark specks.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(6, 4, 2, 1);
  ctx.fillRect(20, 8, 1, 2);
  ctx.fillRect(10, 20, 1, 1);
  ctx.fillRect(24, 22, 2, 1);

  // Mossy patches.
  ctx.fillStyle = 'rgba(60, 110, 50, 0.4)';
  ctx.fillRect(2, S - 6, 4, 3);
  ctx.fillRect(S - 8, S - 4, 5, 2);
  ctx.fillStyle = 'rgba(80, 140, 60, 0.3)';
  ctx.fillRect(14, S - 5, 3, 2);

  if (top) {
    ctx.fillStyle = 'rgba(255, 250, 230, 0.18)';
    ctx.fillRect(0, 0, S, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(4 + i * 10, 0, 4, 2);
    }
  }

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawSpaceMetalTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#525c70');
  grad.addColorStop(0.5, '#2c3344');
  grad.addColorStop(1, '#10141e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Diagonal brushed-metal sheen.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (let d = -S; d < S; d += 4) {
    ctx.fillRect(d, 0, 1, S);
  }

  // Panel seam line.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
  ctx.stroke();

  // Recessed center rectangle (panel inset).
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.strokeRect(S * 0.18, S * 0.18, S * 0.64, S * 0.32);
  ctx.strokeStyle = 'rgba(140, 160, 200, 0.25)';
  ctx.strokeRect(S * 0.18 + 1, S * 0.18 + 1, S * 0.64 - 2, S * 0.32 - 2);

  // Rivets at corners with highlight.
  [3, S - 4].forEach(rx => [3, S - 4].forEach(ry => {
    ctx.fillStyle = '#8893a8';
    ctx.beginPath();
    ctx.arc(rx, ry, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(rx - 0.5, ry - 0.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }));

  if (top) {
    const stripGrad = ctx.createLinearGradient(0, 0, 0, 4);
    stripGrad.addColorStop(0, '#bce8ff');
    stripGrad.addColorStop(1, '#3a8fcc');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(0, 0, S, 3);
    ctx.fillStyle = 'rgba(120, 200, 255, 0.45)';
    ctx.fillRect(0, 3, S, 1);
  }

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

// Volcano theme — dark charred soil with glowing cracks.
function drawVolcanoGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const soilStart = top ? Math.floor(S * 0.28) : 0;

  const fillTone = '#190d0a';
  if (top) {
    const grad = ctx.createLinearGradient(0, soilStart, 0, S);
    grad.addColorStop(0, '#3a2018');
    grad.addColorStop(0.5, '#241410');
    grad.addColorStop(1, fillTone);
    ctx.fillStyle = grad;
    ctx.fillRect(0, soilStart, S, S - soilStart);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, soilStart, S, S - soilStart);
  }

  if (top) {
    const crustGrad = ctx.createLinearGradient(0, 0, 0, soilStart);
    crustGrad.addColorStop(0, '#1a0a08');
    crustGrad.addColorStop(1, '#2a1410');
    ctx.fillStyle = crustGrad;
    ctx.fillRect(0, 0, S, soilStart);
    ctx.strokeStyle = 'rgba(255, 120, 30, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, soilStart - 1);
    ctx.lineTo(8, soilStart - 4);
    ctx.lineTo(14, soilStart - 1);
    ctx.lineTo(20, soilStart - 5);
    ctx.lineTo(26, soilStart - 2);
    ctx.lineTo(S - 1, soilStart - 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 100, 30, 0.25)';
    ctx.fillRect(0, soilStart - 1, S, 3);
  }

  ctx.fillStyle = 'rgba(80, 40, 30, 0.35)';
  ctx.fillRect(4, soilStart + 4, 2, 2);
  ctx.fillRect(14, soilStart + 8, 3, 2);
  ctx.fillRect(22, soilStart + 5, 2, 2);
  ctx.fillRect(8, S - 6, 2, 2);
  ctx.fillRect(20, S - 8, 3, 2);

  ctx.fillStyle = 'rgba(255, 140, 50, 0.55)';
  ctx.fillRect(10, S - 10, 1, 1);
  ctx.fillRect(24, S - 14, 1, 1);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawVolcanoBrickTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#5a2818');
  grad.addColorStop(0.5, '#3a160c');
  grad.addColorStop(1, '#1a0804');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
  ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S / 2);
  ctx.moveTo(S / 4, S / 2); ctx.lineTo(S / 4, S);
  ctx.moveTo((3 * S) / 4, S / 2); ctx.lineTo((3 * S) / 4, S);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 100, 30, 0.45)';
  ctx.beginPath();
  ctx.moveTo(0, S / 2 + 0.5); ctx.lineTo(S * 0.45, S / 2 + 0.5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 140, 80, 0.12)';
  ctx.fillRect(2, 2, S / 2 - 4, 1);
  ctx.fillRect(S / 2 + 2, 2, S / 2 - 4, 1);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawVolcanoStoneTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#2a2018');
  grad.addColorStop(0.5, '#1a1008');
  grad.addColorStop(1, '#080404');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(255, 90, 20, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, 6); ctx.lineTo(8, 12); ctx.lineTo(14, 8); ctx.lineTo(22, 18); ctx.lineTo(S - 2, 14);
  ctx.moveTo(4, S - 6); ctx.lineTo(12, S - 10); ctx.lineTo(20, S - 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 140, 40, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(2, 6); ctx.lineTo(8, 12); ctx.lineTo(14, 8); ctx.lineTo(22, 18); ctx.lineTo(S - 2, 14);
  ctx.stroke();
  ctx.fillStyle = 'rgba(80, 50, 40, 0.5)';
  ctx.fillRect(6, 18, 2, 2);
  ctx.fillRect(18, 6, 2, 2);
  ctx.fillRect(26, 24, 2, 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

// Underwater theme — sandy/coral seafloor.
function drawUnderwaterGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean) {
  const S = TILE_SIZE;
  const soilStart = top ? Math.floor(S * 0.22) : 0;

  const fillTone = '#725a3c';
  if (top) {
    const grad = ctx.createLinearGradient(0, soilStart, 0, S);
    grad.addColorStop(0, '#a89060');
    grad.addColorStop(0.5, '#8a7048');
    grad.addColorStop(1, fillTone);
    ctx.fillStyle = grad;
    ctx.fillRect(0, soilStart, S, S - soilStart);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, soilStart, S, S - soilStart);
  }

  if (top) {
    const crestGrad = ctx.createLinearGradient(0, 0, 0, soilStart);
    crestGrad.addColorStop(0, '#d8c490');
    crestGrad.addColorStop(1, '#b89860');
    ctx.fillStyle = crestGrad;
    ctx.fillRect(0, 0, S, soilStart);
    ctx.fillStyle = 'rgba(255, 245, 200, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, soilStart - 2);
    ctx.quadraticCurveTo(S * 0.25, soilStart - 5, S * 0.5, soilStart - 2);
    ctx.quadraticCurveTo(S * 0.75, soilStart + 1, S, soilStart - 2);
    ctx.lineTo(S, soilStart);
    ctx.lineTo(0, soilStart);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(220, 100, 130, 0.85)';
    ctx.fillRect(S * 0.55, 1, 2, 4);
    ctx.fillRect(S * 0.6, 3, 2, 3);
  }

  ctx.fillStyle = 'rgba(255, 240, 200, 0.3)';
  for (let i = 0; i < 8; i++) {
    const gx = (i * 7 + 3) % S;
    const gy = soilStart + 4 + ((i * 5) % (S - soilStart - 6));
    ctx.fillRect(gx, gy, 1, 1);
  }
  ctx.fillStyle = 'rgba(200, 170, 140, 0.5)';
  ctx.fillRect(6, S - 8, 2, 2);
  ctx.fillRect(20, S - 5, 2, 1);
  ctx.fillStyle = 'rgba(140, 80, 100, 0.4)';
  ctx.fillRect(14, S - 12, 1, 1);

  ctx.strokeStyle = 'rgba(40, 60, 80, 0.4)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawUnderwaterBrickTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#5a8a98');
  grad.addColorStop(0.5, '#3d6c7c');
  grad.addColorStop(1, '#1f4458');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(20, 40, 60, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
  ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S / 2);
  ctx.moveTo(S / 4, S / 2); ctx.lineTo(S / 4, S);
  ctx.moveTo((3 * S) / 4, S / 2); ctx.lineTo((3 * S) / 4, S);
  ctx.stroke();
  ctx.fillStyle = 'rgba(60, 130, 90, 0.55)';
  ctx.fillRect(2, S - 6, 5, 3);
  ctx.fillRect(S - 8, 2, 4, 2);
  ctx.fillStyle = 'rgba(180, 200, 160, 0.4)';
  ctx.fillRect(14, 4, 2, 2);
  ctx.fillRect(20, 18, 2, 2);
  ctx.fillStyle = 'rgba(180, 220, 230, 0.18)';
  ctx.fillRect(2, 2, S / 2 - 4, 1);
  ctx.fillRect(S / 2 + 2, 2, S / 2 - 4, 1);
  ctx.strokeStyle = 'rgba(20, 40, 60, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawUnderwaterStoneTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#506878');
  grad.addColorStop(0.5, '#324858');
  grad.addColorStop(1, '#16242e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(0, 10, 20, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, 8); ctx.lineTo(10, 14); ctx.lineTo(18, 8); ctx.lineTo(28, 16);
  ctx.moveTo(4, S - 6); ctx.lineTo(14, S - 10); ctx.lineTo(24, S - 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(50, 110, 90, 0.6)';
  ctx.fillRect(0, 0, S, 3);
  ctx.fillRect(0, 3, 3, 2);
  ctx.fillRect(S - 4, 3, 4, 2);
  ctx.fillStyle = 'rgba(140, 160, 180, 0.5)';
  ctx.fillRect(6, 18, 2, 2);
  ctx.fillRect(18, 24, 2, 2);
  ctx.fillRect(26, 8, 2, 2);
  ctx.strokeStyle = 'rgba(10, 20, 30, 0.7)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function drawSpikeTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#cccfd6';
  ctx.strokeStyle = '#3a3d44';
  ctx.lineWidth = 1;
  const spikes = 4;
  for (let i = 0; i < spikes; i++) {
    const x = (i + 0.5) * (S / spikes);
    ctx.beginPath();
    ctx.moveTo(x - S / (spikes * 2), S);
    ctx.lineTo(x, 4);
    ctx.lineTo(x + S / (spikes * 2), S);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawThemedProp(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const theme = this.currentTheme;
  const t = this.time;
  ctx.save();
  if (theme === 'cave' || theme === 'space') {
    // Kristall-Cluster — Höhle jetzt kühl-teal statt Lila (Stephan-Wunsch),
    // Weltraum bleibt cyan.
    const base = theme === 'space' ? ['#7fd0ff', '#4f9fe0'] : ['#5fc7c0', '#3a9a95'];
    for (let i = 0; i < 3; i++) {
      const bx = S * 0.28 + i * S * 0.22;
      const h = S * (0.36 + (i === 1 ? 0.24 : 0.08));
      ctx.fillStyle = base[i % 2];
      ctx.beginPath();
      ctx.moveTo(bx - 3.5, S);
      ctx.lineTo(bx - 2, S - h * 0.55);
      ctx.lineTo(bx, S - h);
      ctx.lineTo(bx + 2, S - h * 0.55);
      ctx.lineTo(bx + 3.5, S);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(bx - 0.5, S - h * 0.78, 1.2, h * 0.46);
    }
  } else if (theme === 'volcano') {
    // Felsbrocken mit pulsierender Glut.
    ctx.fillStyle = '#3a2622';
    ctx.beginPath(); ctx.ellipse(S / 2, S * 0.82, S * 0.34, S * 0.2, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#241512';
    ctx.beginPath(); ctx.ellipse(S * 0.4, S * 0.8, S * 0.1, S * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    const glow = 0.55 + Math.sin(t * 0.05) * 0.3;
    ctx.fillStyle = `rgba(255,120,40,${glow})`;
    ctx.beginPath(); ctx.arc(S * 0.58, S * 0.84, 2.2, 0, Math.PI * 2); ctx.fill();
  } else if (theme === 'ice') {
    // Schneehaufen mit Eiskristall.
    ctx.fillStyle = 'rgba(235,248,255,0.92)';
    ctx.beginPath(); ctx.ellipse(S / 2, S * 0.88, S * 0.34, S * 0.15, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 1.6;
    for (let a = 0; a < 3; a++) {
      const ang = (a / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(S / 2 - Math.cos(ang) * 6, S * 0.56 - Math.sin(ang) * 6);
      ctx.lineTo(S / 2 + Math.cos(ang) * 6, S * 0.56 + Math.sin(ang) * 6);
      ctx.stroke();
    }
  } else if (theme === 'castle') {
    // Kerze mit flackernder Flamme.
    ctx.fillStyle = '#e8e0c8';
    ctx.fillRect(S * 0.42, S * 0.5, S * 0.16, S * 0.5);
    ctx.fillStyle = '#c8b890';
    ctx.fillRect(S * 0.42, S * 0.5, S * 0.05, S * 0.5);
    const fl = Math.sin(t * 0.12) * 1.1;
    ctx.fillStyle = 'rgba(255,170,55,0.95)';
    ctx.beginPath(); ctx.ellipse(S * 0.5 + fl * 0.3, S * 0.42, 2.4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,180,0.9)';
    ctx.beginPath(); ctx.ellipse(S * 0.5 + fl * 0.3, S * 0.44, 1.1, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  } else if (theme === 'underwater') {
    // Verzweigte Koralle.
    ctx.strokeStyle = '#ff8a5c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const branch = (x: number, y: number, ang: number, len: number, depth: number) => {
      if (depth === 0) return;
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      branch(ex, ey, ang - 0.5, len * 0.68, depth - 1);
      branch(ex, ey, ang + 0.5, len * 0.68, depth - 1);
    };
    branch(S / 2, S, -Math.PI / 2, S * 0.3, 3);
  } else if (theme === 'beach') {
    // Muschel mit Rippen.
    ctx.fillStyle = '#ffd9e0';
    ctx.beginPath(); ctx.moveTo(S / 2, S * 0.96);
    ctx.arc(S / 2, S * 0.96, S * 0.3, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e89aa8'; ctx.lineWidth = 1;
    for (let r = 1; r < 5; r++) {
      const ang = Math.PI + r / 5 * Math.PI;
      ctx.beginPath(); ctx.moveTo(S / 2, S * 0.96);
      ctx.lineTo(S / 2 + Math.cos(ang) * S * 0.28, S * 0.96 + Math.sin(ang) * S * 0.28); ctx.stroke();
    }
  } else if (theme === 'australia') {
    // Spinifex-Grasbüschel, leicht wiegend.
    ctx.strokeStyle = '#c8a850'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const bx = S * 0.5 + (i - 3) * 2.5;
      const sway = Math.sin(t * 0.02 + i) * 1.5;
      ctx.beginPath(); ctx.moveTo(bx, S);
      ctx.quadraticCurveTo(bx + sway, S * 0.5, bx + (i - 3) * 1.2 + sway, S * 0.2); ctx.stroke();
    }
  } else if (theme === 'sky') {
    // Kleiner glitzernder Stern über der Wolke.
    const tw = 0.6 + Math.sin(t * 0.08) * 0.4;
    ctx.fillStyle = `rgba(255,245,180,${0.7 + tw * 0.3})`;
    ctx.strokeStyle = `rgba(255,255,220,${tw})`;
    ctx.lineWidth = 1;
    const cx = S / 2, cy = S * 0.55, rO = S * 0.22, rI = S * 0.09;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? rO : rI;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // jungle: kleiner Farn.
    ctx.strokeStyle = '#2f7a30'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + (i - 2) * 0.34;
      const ex = S / 2 + Math.cos(ang) * S * 0.4, ey = S + Math.sin(ang) * S * 0.4;
      ctx.beginPath(); ctx.moveTo(S / 2, S); ctx.lineTo(ex, ey); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawNoteBlock(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  // Federnder Sprungblock: kräftiges Indigo/Violett mit hellem Rahmen, Eck-
  // Nieten und einem weißen Aufwärts-Pfeil — signalisiert „hier abspringen".
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, '#7c6cf0');
  g.addColorStop(0.5, '#5a48d8');
  g.addColorStop(1, '#4636b0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(2, 2, S - 4, S - 4);
  ctx.strokeStyle = '#9d8dff';
  ctx.lineWidth = 2;
  ctx.strokeRect(1.5, 1.5, S - 3, S - 3);
  ctx.fillStyle = '#c8bdff';
  for (const [nx, ny] of [[4, 4], [S - 4, 4], [4, S - 4], [S - 4, S - 4]] as [number, number][]) {
    ctx.beginPath();
    ctx.arc(nx, ny, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Weißer Aufwärts-Pfeil als Sprung-Hinweis.
  const cx = S / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, S * 0.26);
  ctx.lineTo(cx + S * 0.18, S * 0.5);
  ctx.lineTo(cx + S * 0.07, S * 0.5);
  ctx.lineTo(cx + S * 0.07, S * 0.72);
  ctx.lineTo(cx - S * 0.07, S * 0.72);
  ctx.lineTo(cx - S * 0.07, S * 0.5);
  ctx.lineTo(cx - S * 0.18, S * 0.5);
  ctx.closePath();
  ctx.fill();
  // Oberkanten-Glanz.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(2, 2, S - 4, 3);
}

function drawMovingPlatform(this: Renderer, x: number, y: number, w: number, h: number) {
  const ctx = this.ctx;
  const theme = this.currentTheme;
  const PAL: Record<string, { top: string; body: string; edge: string }> = {
    jungle: { top: '#b07c44', body: '#7d4f29', edge: '#52331b' },
    beach: { top: '#cb9d64', body: '#9a6f3e', edge: '#6c4c2a' },
    australia: { top: '#bb7a40', body: '#8a5126', edge: '#5e3618' },
    sky: { top: '#d2dbe6', body: '#9fb0c2', edge: '#6f8194' },
    cave: { top: '#828b99', body: '#525a68', edge: '#333a46' },
    volcano: { top: '#62463c', body: '#3c2823', edge: '#21130f' },
    ice: { top: '#dcf0fc', body: '#a9d4ec', edge: '#79accf' },
    castle: { top: '#9085a8', body: '#5c5276', edge: '#39314c' },
    underwater: { top: '#45959a', body: '#2a5f63', edge: '#193b3f' },
    space: { top: '#a0a6c8', body: '#646a92', edge: '#3f4366' },
    gym: { top: '#c89250', body: '#8a5a2e', edge: '#5e3c1e' },
    plush: { top: '#f0c9d8', body: '#d79bb4', edge: '#b06e8e' },
  };
  const p = PAL[theme] || PAL.jungle;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 2, y + h, w - 2, 4);                              // Schatten
  ctx.fillStyle = p.body;
  ctx.fillRect(x, y, w, h);                                         // Körper
  ctx.fillStyle = p.top;
  ctx.fillRect(x, y, w, Math.max(3, Math.round(h * 0.4)));          // helle Oberkante
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x, y, w, 1.5);                                       // Glanzlinie
  ctx.fillStyle = p.edge;
  ctx.fillRect(x, y + h - 2, w, 2);                                 // dunkle Unterkante
  for (let i = 0; i < 3; i++) {                                     // Nieten (mechanischer Look)
    const bx = Math.round(x + w * (0.22 + i * 0.28));
    ctx.fillRect(bx - 1, y + Math.round(h * 0.55), 2, 2);
  }
  ctx.restore();
}

// Sprungfeder: rote Kopfplatte auf einer metallischen Spirale mit Grundplatte.
// `compress` (0..1) staucht die Spirale und senkt die Kopfplatte (Auslöse-Feedback).
function drawSpring(this: Renderer, x: number, y: number, w: number, h: number, compress = 0) {
  const ctx = this.ctx;
  const padH = 5, baseH = 3;
  const coilArea = h - padH - baseH;
  const coilH = Math.max(2, coilArea * (1 - 0.5 * compress));
  const baseTop = y + h - baseH;
  const padBottom = baseTop - coilH;
  const padTop = padBottom - padH;
  ctx.save();
  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 2, y + h, w - 4, 3);
  // Grundplatte
  ctx.fillStyle = '#5a5f6b';
  ctx.fillRect(x + 1, baseTop, w - 2, baseH);
  ctx.fillStyle = '#3c404a';
  ctx.fillRect(x + 1, baseTop + baseH - 1, w - 2, 1);
  // Spirale (Zick-Zack)
  ctx.strokeStyle = '#c9ced6';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const segs = 4;
  const left = x + 5, right = x + w - 5;
  for (let i = 0; i <= segs; i++) {
    const yy = baseTop - (coilH * i) / segs;
    const xx = i % 2 === 0 ? left : right;
    if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
  }
  ctx.stroke();
  // Kopfplatte (rot) mit Glanz
  ctx.fillStyle = '#e0362f';
  ctx.fillRect(x, padTop, w, padH);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x, padTop, w, 1.5);
  ctx.fillStyle = '#a8221d';
  ctx.fillRect(x, padTop + padH - 1.5, w, 1.5);
  ctx.restore();
}

// Holzkiste: Korpus mit Rahmen, Diagonalstreben und Nieten — schiebbar/zerstörbar.
function drawCrate(this: Renderer, x: number, y: number, w: number, h: number) {
  const ctx = this.ctx;
  ctx.save();
  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 2, y + h, w - 3, 3);
  // Korpus
  ctx.fillStyle = '#9a6a38';
  ctx.fillRect(x, y, w, h);
  // Innenfläche (leicht dunkler)
  ctx.fillStyle = '#875c30';
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  // Rahmen
  ctx.strokeStyle = '#5e3d1e';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  // Diagonalstreben (X)
  ctx.strokeStyle = '#6f4a25';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + w - 3, y + h - 3);
  ctx.moveTo(x + w - 3, y + 3); ctx.lineTo(x + 3, y + h - 3);
  ctx.stroke();
  // obere Glanzkante
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  // Nieten
  ctx.fillStyle = '#4a300f';
  const d = 3;
  ctx.fillRect(x + 3, y + 3, d, d);
  ctx.fillRect(x + w - 3 - d, y + 3, d, d);
  ctx.fillRect(x + 3, y + h - 3 - d, d, d);
  ctx.fillRect(x + w - 3 - d, y + h - 3 - d, d, d);
  ctx.restore();
}

// Schalter (P_SWITCH): Boden-Button. Rot = offen, grün + eingedrückt = aktiviert.
function drawSwitch(this: Renderer, x: number, y: number, w: number, h: number, pressed: boolean) {
  const ctx = this.ctx;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 2, y + h, w - 4, 3);
  // Sockel
  ctx.fillStyle = '#3a4358';
  ctx.fillRect(x, y + h - 4, w, 4);
  // Knopf
  const top = pressed ? y + h - 6 : y;
  const bh = pressed ? 6 : h - 2;
  ctx.fillStyle = pressed ? '#28c76f' : '#e0362f';
  ctx.fillRect(x + 3, top, w - 6, bh);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x + 3, top, w - 6, 2);
  // kleines „Match"-Symbol (zwei verbundene Punkte) auf dem Knopf
  if (!pressed) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 8, y + 4, 3, 3);
    ctx.fillRect(x + w - 11, y + 4, 3, 3);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 10, y + 5.5); ctx.lineTo(x + w - 9, y + 5.5); ctx.stroke();
  }
  ctx.restore();
}

// Tür/Tor (DOOR): blaue Bluefield-Barriere mit Schloss; öffnet sich (sinkt).
function drawDoor(this: Renderer, x: number, y: number, w: number, h: number, open: boolean, openTimer: number) {
  const ctx = this.ctx;
  ctx.save();
  const alpha = open ? Math.max(0, 1 - openTimer / 24) : 1;
  ctx.globalAlpha = alpha;
  // Torkörper (Bluefield-Blau, metallisch)
  ctx.fillStyle = '#2f6bd6';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#245bb8';
  for (let ry = y + 4; ry < y + h - 2; ry += 8) ctx.fillRect(x + 2, ry, w - 4, 3); // Lamellen
  ctx.strokeStyle = '#183f80'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  // Schloss/Match-Icon in der Mitte
  const cy = y + h / 2;
  ctx.fillStyle = open ? '#28c76f' : '#ffd23f';
  ctx.beginPath(); ctx.arc(x + w / 2, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#183f80';
  ctx.fillRect(x + w / 2 - 1.5, cy - 1, 3, 5);
  ctx.restore();
}

// Feuer-Barriere: eine brennbare Ranken-/Dornenwand. Telegrafiert klar „Feuer
// hilft hier": warme Glut-Punkte + ausgetrocknetes Geflecht. Nur ein Feuerball
// brennt sie weg (Logik in der Engine).
function drawFireBarrier(this: Renderer, x: number, y: number, w: number, h: number, burn: number, time: number, sway: number) {
  const ctx = this.ctx;
  ctx.save();
  const s = Math.sin(time * 0.05 + sway) * 1.2;
  // Körper: dunkles, trockenes Ranken-Geflecht (leicht rötlich → „entflammbar").
  const body = ctx.createLinearGradient(x, 0, x + w, 0);
  body.addColorStop(0, '#4a3a1e');
  body.addColorStop(0.5, '#6b5326');
  body.addColorStop(1, '#4a3a1e');
  ctx.fillStyle = body;
  ctx.fillRect(x + 2, y, w - 4, h);
  // Vertikale Ranken-Stränge.
  ctx.strokeStyle = '#3a6b2a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const bx = x + 6 + i * ((w - 12) / 2);
    ctx.beginPath();
    ctx.moveTo(bx, y + 2);
    for (let yy = y + 2; yy <= y + h - 2; yy += 10) {
      ctx.lineTo(bx + Math.sin(yy * 0.25 + i + sway) * 2.5 + s, yy);
    }
    ctx.stroke();
  }
  // Quer-Geflecht + Dornen.
  ctx.strokeStyle = '#2c5220'; ctx.lineWidth = 2;
  for (let yy = y + 8; yy < y + h - 4; yy += 14) {
    ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + w - 3, yy + 3); ctx.stroke();
    ctx.fillStyle = '#8fae63';
    ctx.beginPath(); ctx.moveTo(x + w - 4, yy); ctx.lineTo(x + w - 1, yy + 1.5); ctx.lineTo(x + w - 4, yy + 3); ctx.fill();
  }
  // Glut-Telegraf: warme, pulsierende Funken am Fuß („hier hilft Feuer").
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.12 + sway);
  for (let i = 0; i < 4; i++) {
    const ex = x + 5 + (i * (w - 10)) / 3;
    const ey = y + h - 4 - (i % 2) * 3;
    ctx.fillStyle = `rgba(255,${150 + Math.floor(pulse * 80)},60,${0.5 + pulse * 0.4})`;
    ctx.beginPath(); ctx.arc(ex, ey, 1.8 + pulse, 0, Math.PI * 2); ctx.fill();
  }
  // Verbrenn-Flammen (falls die Engine burn>0 setzt).
  if (burn > 0) {
    const p = Math.min(1, burn / 18);
    ctx.globalAlpha = 1 - p;
    for (let i = 0; i < 6; i++) {
      const fx = x + 4 + Math.random() * (w - 8);
      const fy = y + h - Math.random() * h * (0.3 + p);
      ctx.fillStyle = i % 2 ? 'rgba(255,140,40,0.9)' : 'rgba(255,220,90,0.9)';
      ctx.beginPath(); ctx.arc(fx, fy, 2 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

export const tilesMethods = {
  drawTile,
  drawMovingPlatform,
  drawSpring,
  drawCrate,
  drawSwitch,
  drawDoor,
  drawFireBarrier,
  drawThemedProp,
  drawNoteBlock,
  renderTileToCache,
  drawIceTile,
  drawCastleStoneTile,
  drawSpaceMetalTile,
  drawVolcanoGroundTile,
  drawVolcanoBrickTile,
  drawVolcanoStoneTile,
  drawUnderwaterGroundTile,
  drawUnderwaterBrickTile,
  drawUnderwaterStoneTile,
  drawSpikeTile,
};
