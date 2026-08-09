import { TILE_SIZE, TileType, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.ts';
import { Camera } from './camera.ts';
import { BERATER_FRAME_URLS, BERATER_DUCK_URL } from './assets/beraterSprites.ts';
import { AFFE_FRAME_URLS } from './assets/affeSprites.ts';
import { PANDA_FRAME_URLS } from './assets/pandaSprites.ts';
import { ELEFANT_FRAME_URLS } from './assets/elefantSprites.ts';
import { DRACHE_FRAME_URLS } from './assets/dracheSprites.ts';
import { DINO_WALK_URLS } from './assets/dinoWalkSprites.ts';
import { REH_FRAME_URLS } from './assets/rehSprites.ts';
import { REH_BROWN_FRAME_URLS } from './assets/rehBrownSprites.ts';
import fiona01 from '@assets/fiona_01.webp';
import fiona02 from '@assets/fiona_02.webp';
import fiona03 from '@assets/fiona_03.webp';
import fiona04 from '@assets/fiona_04.webp';
import fiona05 from '@assets/fiona_05.webp';
import fiona06 from '@assets/fiona_06.webp';
import fiona07 from '@assets/fiona_07.webp';
import fiona08 from '@assets/fiona_08.webp';
import fiona09 from '@assets/fiona_09.webp';
import fiona10 from '@assets/fiona_10.webp';
import fiona11 from '@assets/fiona_11.webp';
import fiona12 from '@assets/fiona_12.webp';
import fionaDuck from '@assets/fiona_duck.webp';
import leaDuck from '@assets/lea_n_duck.webp';
import leaN00 from '@assets/lea_n00_stand.webp';
import leaN01 from '@assets/lea_n01_runA.webp';
import leaN02 from '@assets/lea_n02_runZwA.webp';
import leaN03 from '@assets/lea_n03_runB.webp';
import leaN04 from '@assets/lea_n04_runZwB.webp';
import leaN05 from '@assets/lea_n05_takeoff.webp';
import leaN06 from '@assets/lea_n06_airborne.webp';
import leaN07 from '@assets/lea_n07_landing.webp';
const FIONA_FRAME_PATHS = [fiona01, fiona02, fiona03, fiona04, fiona05, fiona06, fiona07, fiona08, fiona09, fiona10, fiona11, fiona12];
// Neues Lea-Set (dünne Figur). Reihenfolge = pickPlayerFrame-Lea-Mapping:
// 0=Stand 1=LaufA 2=ZwischenA 3=LaufB 4=ZwischenB 5=Absprung 6=Flugphase 7=Landung
const LEA_FRAME_PATHS = [leaN00, leaN01, leaN02, leaN03, leaN04, leaN05, leaN06, leaN07];

import { backgroundsMethods } from './renderer/backgrounds.ts';
import { bgLayersMethods } from './renderer/bg-layers.ts';
import { tilesMethods } from './renderer/tiles.ts';
import { tilesJungleMethods } from './renderer/tiles-jungle.ts';
import { tilesCaveMethods } from './renderer/tiles-cave.ts';
import { tilesSkyMethods } from './renderer/tiles-sky.ts';
import { tilesBeachMethods } from './renderer/tiles-beach.ts';
import { tilesAustraliaMethods } from './renderer/tiles-australia.ts';
import { tilesSchoolMethods } from './renderer/tiles-school.ts';
import { tilesGymMethods } from './renderer/tiles-gym.ts';
import { tilesPlushMethods } from './renderer/tiles-plush.ts';
import { tilesTrampolineMethods } from './renderer/tiles-trampoline.ts';
import { tilesForestMethods } from './renderer/tiles-forest.ts';
import { playerMethods } from './renderer/player.ts';
import { enemiesCoreMethods } from './renderer/enemies-core.ts';
import { enemiesExtraMethods } from './renderer/enemies-extra.ts';
import { itemsMethods } from './renderer/items.ts';
import { effectsMethods } from './renderer/effects.ts';
import { hudMethods } from './renderer/hud.ts';
import { signsMethods } from './renderer/signs.ts';

export class Renderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  // Logical viewport size — never read canvas.width/height directly here, the
  // engine applies a DPR-aware base transform per frame so the actual backing
  // store may be larger than these logical dimensions. All draw code uses
  // CANVAS_WIDTH × CANVAS_HEIGHT logical coords.
  // Logical viewport size. HEIGHT is fixed (CANVAS_HEIGHT); WIDTH adapts to
  // the container's aspect ratio so wide screens (e.g. iPhone landscape)
  // fill edge-to-edge by showing MORE world horizontally instead of
  // letterboxing. Set by engine.resize(); clamped there to a sane range.
  viewportW = CANVAS_WIDTH;
  // HEIGHT is also dynamic now: the engine shrinks the logical view height
  // below CANVAS_HEIGHT to zoom the camera IN (everything appears larger).
  viewportH = CANVAS_HEIGHT;
  // Stabiler Geräte-Skalierungsfaktor (Backing-Pixel je BASIS-Logikpixel), von
  // engine.applyBackingStore() gesetzt. Bewusst NICHT der Live-Zoom-abhängige
  // Wert (viewportW ändert sich pro Frame durch Speed-/Impact-Zoom) — Sprite-
  // Caches (Vulkan-Kegel, God-Rays) schlüsseln hierauf, damit sie unter Bewegung
  // nicht jeden Frame neu backen. Ändert sich nur bei echtem Resize/Quality-Wechsel.
  baseDeviceScale = 1;
  tileCache: Map<number, HTMLCanvasElement> = new Map();
  // Per-theme background-gradient caches. Built lazily by
  // getBgGradCache; cleared by resetBackground on level start.
  bgGradCaches: Map<string, HTMLCanvasElement> = new Map();
  spriteCache: Map<string, HTMLCanvasElement> = new Map();
  bgLayers: HTMLCanvasElement[] = [];
  bgGenerated = false;
  // Per-theme signature parallax silhouette baked into an offscreen layer
  // (one entry per world). Generated lazily on first draw and reused
  // for the lifetime of the renderer — no per-frame allocations.
  signatureLayers: Map<string, HTMLCanvasElement> = new Map();
  skyCache: HTMLCanvasElement | null = null;
  skyCacheH = 0;
  skyCacheW = 0;
  time = 0;
  playerLean = 0; // geglätteter Bewegungs-Tilt der Spielfigur
  playerFlipAngle = 0; // Salto-Drehwinkel beim Trampolin-Absprung (0 = keiner)
  playerVineFling = 0;     // Tarzan-Absprung-Spur (1 → 0, klingt aus)
  playerVineFlingDir = 1;  // Richtung der Spur (−1 links, +1 rechts)
  crowdExcite = 0;         // Publikums-Erregung der Schlucht-Tribüne (0..1)
  currentTheme = 'jungle';
  /** Klickbares CTA-Panel des Welt-13-Siegscreens (Viewport-Koordinaten) oder null. */
  bluefieldCtaRect: { x: number; y: number; w: number; h: number } | null = null;
  /** Welt-13-Terminal-Boot-Intro: Frame des Levelstarts (-1 = inaktiv). */
  bluefieldBootStart = -1;
  /** Verdiente Sterne (0–3) für den Level-Abschluss-Screen. */
  levelStars = 0;
  /** Welche Sterne-Kriterien erfüllt: [alle Spezial-Ideen, ohne Treffer, Tempo]. */
  levelStarFlags: [boolean, boolean, boolean] = [false, false, false];
  /** Bestwert des Levels + ob gerade ein neuer Rekord aufgestellt wurde. */
  levelBestScore = 0;
  levelNewRecord = false;
  levelTime = 0;
  levelBestTime = 0;
  levelNewTimeRecord = false;
  bossGateActive = false;
  bossGateCol = 0;
  bossGateTop = 0;
  /** Boden-Bezugsreihe des aktuellen Levels; tiefer liegende Erde wird gedämpft. */
  currentGroundRow = 13;
  // Grafikstufe (AP 0.5). Wird von engine.resize() aus den Settings gesetzt.
  // Effekt-Helfer (Faux-Licht, interaktives Gras) drosseln/deaktivieren sich
  // bei 'low'. Default 'high' bis die Engine den echten Wert pusht.
  quality: 'low' | 'mid' | 'high' = 'high';
  // Player animation: 12 frames per character (stand → run A/B → jump →
  // air → landing). Fiona = small/base form, Lea = powered form.
  fionaFrames: (HTMLImageElement | null)[] = new Array(12).fill(null);
  leaFrames: (HTMLImageElement | null)[] = new Array(8).fill(null);
  // Echte Duck-Sprites. Sobald geladen, wird beim Ducken das jeweilige
  // Sprite gezeichnet, statt die Steh-Pose vertikal zu stauchen.
  fionaDuckArr: (HTMLImageElement | null)[] = [null];
  leaDuckArr: (HTMLImageElement | null)[] = [null];
  // Welt-13-Berater: eigenes 12-Frame-Set + Duck (immer in Welt 13 verwendet).
  beraterFrames: (HTMLImageElement | null)[] = new Array(12).fill(null);
  beraterDuckArr: (HTMLImageElement | null)[] = [null];
  // Plüsch-Welt: Äffchen-Sprites (User-Upload). 0 idle · 1-4 laufen · 5 auf ·
  // 6 apex · 7 fallend · 8 ducken.
  affeFrames: (HTMLImageElement | null)[] = new Array(9).fill(null);
  // Plüsch-Welt: Panda-Sprites (große Form, Süßigkeit). Gleiche Index-Belegung.
  pandaFrames: (HTMLImageElement | null)[] = new Array(9).fill(null);
  // Plüsch-Welt: Elefant-Sprites (Feuerblume-Form). Gleiche Index-Belegung.
  elefantFrames: (HTMLImageElement | null)[] = new Array(9).fill(null);
  // Welt 16: Drachen-Boss-Sprites. 0-3 Laufzyklus · 4 Brüllen.
  dracheFrames: (HTMLImageElement | null)[] = new Array(5).fill(null);
  dinoWalkFrames: (HTMLImageElement | null)[] = new Array(6).fill(null);
  // Wald: Eisreh-Gegner. 0 stand · 1-2 walk · 3 run · 4-5 leap · 6 recovery.
  rehFrames: (HTMLImageElement | null)[] = new Array(7).fill(null);
  // Wald: braunes Reh (gleiche Frame-Reihenfolge wie das Eisreh).
  rehBrownFrames: (HTMLImageElement | null)[] = new Array(7).fill(null);
  // Avatar/preview still draws a single standing image (Lea's stand frame).
  playerImage: HTMLImageElement | null = null;
  playerImageLoaded = false;
  playerOffscreen: HTMLCanvasElement | null = null;
  playerOffCtx: CanvasRenderingContext2D | null = null;
  // DPR the offscreen buffer is currently sized for. Tracked so we can
  // re-allocate when the device pixel ratio changes (window moved between
  // displays) and so the player sprite stays crisp on retina screens.
  playerOffDpr = 1;
  // Grafik-Feinschliff: Silhouetten-Puffer für das Spieler-Rim-Light (getönte
  // Umriss-Kopie, leicht vergrößert hinter den Sprite geblittet → Lesbarkeit vor
  // unruhigen Hintergründen). Nur die Figur → eine Extra-Blit-Kette/Frame.
  playerRimOffscreen: HTMLCanvasElement | null = null;
  playerRimCtx: CanvasRenderingContext2D | null = null;
  // Sun rendering cache (originally near drawSun)
  sunCache: HTMLCanvasElement | null = null;
  sunCacheX = 0;
  // Cloud rendering caches (originally near buildCloudCache)
  cloudCaches: HTMLCanvasElement[] = [];
  cloudData = [
    { x: 80, y: 55, w: 140, h: 48 },
    { x: 260, y: 35, w: 100, h: 30 },
    { x: 400, y: 65, w: 170, h: 55 },
    { x: 580, y: 42, w: 80, h: 25 },
    { x: 720, y: 70, w: 130, h: 42 },
    { x: 900, y: 50, w: 160, h: 50 },
    { x: 1050, y: 38, w: 90, h: 28 },
    { x: 1200, y: 60, w: 145, h: 45 },
    { x: 1400, y: 45, w: 110, h: 35 },
    { x: 1600, y: 72, w: 75, h: 22 },
  ];
  // HUD rendering cache (originally near drawHUD)
  hudBgCache: HTMLCanvasElement | null = null;
  hudBgWidth = 0;
  vignetteCache: HTMLCanvasElement | null = null;
  vignetteW = 0;
  vignetteH = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    // Pixel-perfect: disable smoothing globally on the main context.
    this.ctx.imageSmoothingEnabled = false;
    // Load the 12-frame animation sets. Frames are pre-processed (clean
    // alpha, uniform crop), so a plain Image load is enough — no bg-keying.
    FIONA_FRAME_PATHS.forEach((p, i) => this.loadFrame(p, this.fionaFrames, i));
    LEA_FRAME_PATHS.forEach((p, i) => this.loadFrame(p, this.leaFrames, i));
    this.loadFrame(fionaDuck, this.fionaDuckArr, 0);
    this.loadFrame(leaDuck, this.leaDuckArr, 0);
    BERATER_FRAME_URLS.forEach((p, i) => this.loadFrame(p, this.beraterFrames, i));
    AFFE_FRAME_URLS.forEach((p, i) => this.loadFrame(p, this.affeFrames, i));
    PANDA_FRAME_URLS.forEach((p, i) => this.loadFrame(p, this.pandaFrames, i));
    ELEFANT_FRAME_URLS.forEach((p, i) => this.loadFrame(p, this.elefantFrames, i));
    DRACHE_FRAME_URLS.forEach((p, i) => this.loadFrame(p, this.dracheFrames, i));
    DINO_WALK_URLS.forEach((p, i) => this.loadFrame(p, this.dinoWalkFrames, i));
    REH_FRAME_URLS.forEach((p, i) => this.loadFrame(p, this.rehFrames, i));
    REH_BROWN_FRAME_URLS.forEach((p, i) => this.loadFrame(p, this.rehBrownFrames, i));
    this.loadFrame(BERATER_DUCK_URL, this.beraterDuckArr, 0);
  }

  loadFrame(path: string, arr: (HTMLImageElement | null)[], idx: number) {
    const img = new Image();
    img.onload = () => {
      arr[idx] = img;
      // Lea's stand frame doubles as the menu/profile avatar.
      if (arr === this.leaFrames && idx === 0) {
        this.playerImage = img;
        this.playerImageLoaded = true;
      }
    };
    img.src = path;
  }

  loadPlayerSprite(spritePath: string, onLoaded: (img: HTMLImageElement) => void) {
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = w;
      srcCanvas.height = h;
      const srcCtx = srcCanvas.getContext('2d')!;
      srcCtx.drawImage(img, 0, 0);

      const imageData = srcCtx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Pixels with alpha below this are treated as fully transparent.
      const ALPHA_THRESHOLD = 32;

      // ── Step 1: alpha-halo cleanup ─────────────────────────────────────
      // Source PNGs from common image-export pipelines ship with a real
      // alpha channel where almost every pixel has *some* non-zero alpha
      // (anti-aliasing halo). Without clamping, the bbox pass would grab
      // nearly the full image instead of the character. Detect an existing
      // alpha channel and clamp near-transparent pixels to fully
      // transparent.
      let hasRealAlpha = false;
      for (let i = 3; i < data.length; i += 4) {
        const a = data[i];
        if (a > 0 && a < 250) { hasRealAlpha = true; break; }
      }
      if (hasRealAlpha) {
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < ALPHA_THRESHOLD) data[i] = 0;
        }
      }

      // ── Step 2: auto-detect dominant background colors from the border ─
      // Sample every border pixel and bucket its colour into a coarse RGB
      // cube (16 levels per channel). Any bucket that covers ≥5 % of the
      // border is treated as a background colour, so this works for
      // white/blue/green/etc. backgrounds without per-image tuning.
      const bucketCounts = new Map<
        number,
        { r: number; g: number; b: number; count: number }
      >();
      let borderOpaqueCount = 0;
      const sampleEdge = (x: number, y: number) => {
        const i = (y * w + x) * 4;
        const a = data[i + 3];
        if (a < ALPHA_THRESHOLD) return;
        borderOpaqueCount++;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const entry = bucketCounts.get(key);
        if (entry) {
          entry.r += r; entry.g += g; entry.b += b; entry.count++;
        } else {
          bucketCounts.set(key, { r, g, b, count: 1 });
        }
      };
      for (let x = 0; x < w; x++) { sampleEdge(x, 0); sampleEdge(x, h - 1); }
      for (let y = 0; y < h; y++) { sampleEdge(0, y); sampleEdge(w - 1, y); }

      const bgColors: { r: number; g: number; b: number }[] = [];
      if (borderOpaqueCount > 0) {
        for (const e of bucketCounts.values()) {
          if (e.count / borderOpaqueCount >= 0.05) {
            bgColors.push({
              r: e.r / e.count,
              g: e.g / e.count,
              b: e.b / e.count,
            });
          }
        }
      }

      // Tolerance in squared-RGB distance for "same as background".
      const COLOR_DIST_SQ = 45 * 45;
      const isBackground = (i: number) => {
        const a = data[i + 3];
        // Already-transparent pixels count as background so the flood-fill
        // can travel through alpha gaps to reach interior pockets.
        if (a < ALPHA_THRESHOLD) return true;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        for (const c of bgColors) {
          const dr = r - c.r, dg = g - c.g, db = b - c.b;
          if (dr * dr + dg * dg + db * db < COLOR_DIST_SQ) return true;
        }
        // Safety-net heuristics for typical export backgrounds even when
        // they aren't the *dominant* border colour (e.g. a thin frame).
        if (r < 25 && g < 25 && b < 25) return true;            // near-black
        if (r > 220 && g > 220 && b > 220) return true;          // near-white
        if (r > 200 && g < 60 && b < 60) return true;            // pure red
        if (r > 200 && g > 200 && b < 60) return true;           // pure yellow
        if (r < 60 && g > 180 && b < 80) return true;            // chroma green
        return false;
      };

      // ── Step 3: flood-fill background from all four borders ────────────
      const visited = new Uint8Array(w * h);
      const queue: number[] = [];
      const enqueueIfBg = (idx: number) => {
        if (!visited[idx] && isBackground(idx * 4)) {
          visited[idx] = 1;
          queue.push(idx);
        }
      };
      for (let x = 0; x < w; x++) {
        enqueueIfBg(x);
        enqueueIfBg((h - 1) * w + x);
      }
      for (let y = 0; y < h; y++) {
        enqueueIfBg(y * w);
        enqueueIfBg(y * w + (w - 1));
      }

      let qi = 0;
      while (qi < queue.length) {
        const idx = queue[qi++];
        const px = idx % w;
        const py = Math.floor(idx / w);
        data[idx * 4 + 3] = 0;

        const neighbors = [
          px > 0 ? idx - 1 : -1,
          px < w - 1 ? idx + 1 : -1,
          py > 0 ? idx - w : -1,
          py < h - 1 ? idx + w : -1,
        ];
        for (const ni of neighbors) {
          if (ni >= 0 && !visited[ni] && isBackground(ni * 4)) {
            visited[ni] = 1;
            queue.push(ni);
          }
        }
      }

      srcCtx.putImageData(imageData, 0, 0);

      // ── Step 4: compute tight crop bbox ────────────────────────────────
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] >= ALPHA_THRESHOLD) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      // Safety net: degenerate bbox (e.g. fully-transparent input) → fall
      // back to the full image instead of dividing by zero or cropping
      // nothing.
      if (minX > maxX || minY > maxY) {
        minX = 0; minY = 0; maxX = w - 1; maxY = h - 1;
      }

      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;

      // Dev-mode warning when the bbox stays suspiciously close to the
      // full source image — almost always a sign that background detection
      // failed and the sprite will appear to "float" above the ground.
      if (import.meta.env.DEV) {
        const areaRatio = (cropW * cropH) / (w * h);
        if (areaRatio > 0.9) {
          console.warn(
            `[loadPlayerSprite] Suspicious crop for "${spritePath}": ` +
            `bbox ${cropW}×${cropH} of ${w}×${h} ` +
            `(${(areaRatio * 100).toFixed(1)}% area). ` +
            `Background detection may have failed — check that the source ` +
            `PNG has a uniform background colour or a real alpha channel. ` +
            `See docs/player-sprite-guidelines.md for requirements.`
          );
        }
      }

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d')!;
      cropCtx.drawImage(srcCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

      const cleanImg = new Image();
      cleanImg.onload = () => {
        onLoaded(cleanImg);
      };
      cleanImg.src = cropCanvas.toDataURL();
    };
    img.src = spritePath;
  }

  clear() {
    // Bewusst KEIN this.time++ mehr: clear() läuft pro Render-Frame (mit der
    // Bildwiederholrate, z.B. 120 Hz). Die Animations-Zeit wird ausschließlich
    // im Fixed-Step getaktet (updatePlaying / Menü-States, 60 Hz), damit
    // zeit-basierte Animationen (Wolken, Effekte) auf jedem Display gleich
    // schnell laufen — unabhängig von der FPS.
  }

  setTheme(theme: string) {
    this.currentTheme = theme;
    this.tileCache.clear();
    this.spriteCache.clear();
    this.skyCache = null;
  }

  /**
   * Lazily build & cache a per-theme background-gradient layer (just the
   * static linear-gradient sky/ground fill, no animated parts). Caller
   * blits with a single drawImage instead of re-creating the gradient
   * every frame. Cleared by resetBackground() on level start.
   */
  getBgGradCache(
    theme: string,
    builder: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    hires = false,
  ): HTMLCanvasElement {
    const cached = this.bgGradCaches.get(theme);
    if (cached) return cached;
    const c = document.createElement('canvas');
    if (hires) {
      // Retina-Schärfe: den (glatten) Vollbild-Verlauf in GERÄTE-Auflösung backen
      // statt in logischer — sonst bläst der Haupt-ctx (imageSmoothing=false +
      // DPR-Transform) den Cache nearest-neighbor auf → verdoppeltes Banding und
      // weiche/klobige Kanten. Größe = Backing-Store (bereits budget-gedeckelt),
      // also KEIN Supersample-Overhead; der Verlauf wird beim Blitten 1:1 gemappt.
      const dw = this.ctx.canvas.width || this.viewportW;
      const dh = this.ctx.canvas.height || this.viewportH;
      c.width = Math.max(1, dw);
      c.height = Math.max(1, dh);
      const cx = c.getContext('2d')!;
      cx.scale(dw / this.viewportW, dh / this.viewportH);
      builder(cx, this.viewportW, this.viewportH);
    } else {
      c.width = this.viewportW;
      c.height = this.viewportH;
      builder(c.getContext('2d')!, this.viewportW, this.viewportH);
    }
    this.bgGradCaches.set(theme, c);
    return c;
  }

  /** Blittet einen (ggf. in Geräte-Auflösung gebauten) Vollbild-BG-Cache scharf:
   *  explizite Ziel-Größe = logischer Viewport, Smoothing an → 1:1 auf Retina,
   *  hochwertiger Downsample sonst. Für `hires`-Caches aus getBgGradCache. */
  blitBgCache(cache: HTMLCanvasElement): void {
    const ctx = this.ctx;
    const prev = ctx.imageSmoothingEnabled;
    const prevQ = ctx.imageSmoothingQuality;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cache, 0, 0, cache.width, cache.height, 0, 0, this.viewportW, this.viewportH);
    ctx.imageSmoothingEnabled = prev;
    ctx.imageSmoothingQuality = prevQ;
  }

  /**
   * Per-world enemy accent palette used by enemy sprites for soft rim
   * lighting, ground-shadow tinting and eye glint highlights so that the
   * same goomba reads as belonging to its world without changing its
   * silhouette.
   */
  getThemeAccent(): { rim: string; shadow: string; glint: string } {
    switch (this.currentTheme) {
      case 'jungle':     return { rim: 'rgba(140,230,140,0.35)', shadow: 'rgba(20,55,20,0.32)',  glint: 'rgba(225,255,210,0.95)' };
      case 'forest':     return { rim: 'rgba(150,220,150,0.36)', shadow: 'rgba(16,40,18,0.36)',  glint: 'rgba(220,250,205,0.95)' };
      case 'cave':       return { rim: 'rgba(170,150,210,0.35)', shadow: 'rgba(15,10,35,0.40)',  glint: 'rgba(220,210,255,0.95)' };
      case 'dragon':     return { rim: 'rgba(120,235,150,0.40)', shadow: 'rgba(8,26,14,0.44)',   glint: 'rgba(210,255,220,0.95)' };
      case 'sky':        return { rim: 'rgba(190,225,255,0.40)', shadow: 'rgba(60,90,140,0.28)', glint: 'rgba(255,255,255,1)'    };
      case 'beach':      return { rim: 'rgba(255,225,160,0.40)', shadow: 'rgba(125,90,40,0.32)', glint: 'rgba(255,250,215,1)'    };
      case 'australia':  return { rim: 'rgba(245,175,95,0.40)',  shadow: 'rgba(120,55,20,0.32)', glint: 'rgba(255,235,180,1)'    };
      case 'volcano':    return { rim: 'rgba(255,130,70,0.45)',  shadow: 'rgba(80,15,5,0.40)',   glint: 'rgba(255,225,180,1)'    };
      case 'ice':        return { rim: 'rgba(190,235,255,0.45)', shadow: 'rgba(40,80,120,0.32)', glint: 'rgba(240,250,255,1)'    };
      case 'castle':     return { rim: 'rgba(190,130,225,0.35)', shadow: 'rgba(25,10,40,0.45)',  glint: 'rgba(225,200,255,1)'    };
      case 'underwater': return { rim: 'rgba(130,205,235,0.40)', shadow: 'rgba(10,40,80,0.38)',  glint: 'rgba(220,250,255,1)'    };
      case 'space':      return { rim: 'rgba(195,150,255,0.50)', shadow: 'rgba(20,5,40,0.48)',   glint: 'rgba(255,240,255,1)'    };
      case 'school':     return { rim: 'rgba(255,215,150,0.36)', shadow: 'rgba(90,65,35,0.30)', glint: 'rgba(255,248,225,1)'    };
      case 'gym':        return { rim: 'rgba(255,200,120,0.40)', shadow: 'rgba(90,55,25,0.30)', glint: 'rgba(255,240,205,1)'    };
      case 'trampoline': return { rim: 'rgba(180,255,220,0.42)', shadow: 'rgba(25,70,60,0.30)', glint: 'rgba(235,255,245,1)'    };
      case 'plush':      return { rim: 'rgba(255,200,230,0.42)', shadow: 'rgba(120,80,110,0.28)', glint: 'rgba(255,250,255,1)'   };
      case 'bluefield':  return { rim: 'rgba(180,235,255,0.38)', shadow: 'rgba(40,80,110,0.28)', glint: 'rgba(245,252,255,1)'    };
      default:           return { rim: 'rgba(255,255,255,0.25)', shadow: 'rgba(0,0,0,0.30)',     glint: 'rgba(255,255,255,0.95)' };
    }
  }

  clearTileCache() {
    this.tileCache.clear();
    this.skyCache = null;
  }

  /** Invalidate cached canvas for a single tile type (used when blocks change). */
  clearTile(tileType: TileType) {
    this.tileCache.delete(tileType);
  }

  resetBackground() {
    this.bgGenerated = false;
    this.bgLayers = [];
    this.signatureLayers.clear();
    this.skyCache = null;
    this.bgGradCaches.clear();
    this.clearBgSpriteCaches();
  }
}

type Methods<T> = {
  [K in keyof T]: T[K] extends (this: Renderer, ...args: infer A) => infer R
    ? (...args: A) => R
    : never;
};

export interface Renderer
  extends Methods<typeof backgroundsMethods>,
    Methods<typeof bgLayersMethods>,
    Methods<typeof tilesMethods>,
    Methods<typeof tilesJungleMethods>,
    Methods<typeof tilesCaveMethods>,
    Methods<typeof tilesSkyMethods>,
    Methods<typeof tilesBeachMethods>,
    Methods<typeof tilesAustraliaMethods>,
    Methods<typeof tilesSchoolMethods>,
    Methods<typeof tilesGymMethods>,
    Methods<typeof tilesPlushMethods>,
    Methods<typeof tilesTrampolineMethods>,
    Methods<typeof tilesForestMethods>,
    Methods<typeof playerMethods>,
    Methods<typeof enemiesCoreMethods>,
    Methods<typeof enemiesExtraMethods>,
    Methods<typeof itemsMethods>,
    Methods<typeof effectsMethods>,
    Methods<typeof hudMethods>,
    Methods<typeof signsMethods> {}

Object.assign(
  Renderer.prototype,
  backgroundsMethods,
  bgLayersMethods,
  tilesMethods,
  tilesJungleMethods,
  tilesCaveMethods,
  tilesSkyMethods,
  tilesBeachMethods,
  tilesAustraliaMethods,
  tilesSchoolMethods,
  tilesGymMethods,
  tilesPlushMethods,
  tilesTrampolineMethods,
  tilesForestMethods,
  playerMethods,
  enemiesCoreMethods,
  enemiesExtraMethods,
  itemsMethods,
  effectsMethods,
  hudMethods,
  signsMethods,
);
