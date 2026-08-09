import {
  TILE_SIZE, GameState, TileType, Direction,
  LEVEL_TIME, PLAYER_START_LIVES,
  CANVAS_WIDTH, CANVAS_HEIGHT,
  P_METER_FRAMES,
  GRAPPLE_RANGE, GRAPPLE_PULL_SPEED, GRAPPLE_RELEASE_DIST, GRAPPLE_DIR_X, GRAPPLE_DIR_Y,
  LEVEL_INTRO_FRAMES, TIME_BONUS_PER_TIME, TIME_BONUS_DURATION_FRAMES,
  STAR_TIME_THRESHOLD, SPECIAL_COINS_PER_LEVEL,
  SUPER_KILL_SCORE,
  PLAYER_SPEED, PLAYER_RUN_SPEED, CAMERA_SPEED_ZOOM_MAX, CAMERA_SPEED_ZOOM_SMOOTH,
  CAMERA_TOUCH_ZOOM, CAMERA_DESKTOP_ZOOM, SPRING_FORCE, BLOCK_COIN_VALUE,
  SWING_AMP, SWING_DRIVE, ROPE_SWING_AMP, ROPE_SWING_DRIVE,
} from './constants';
import { isAoeKillable } from './util/enemy-tags';
import { InputManager } from './input';
import { Camera } from './camera';
import { Renderer } from './renderer';
import { Physics } from './physics';
import {
  Player, Goomba, Koopa, Boss,
  Entity, Particle, FloatingText, PlayerFireball,
  MagicBolt, BombOmb, SpecialCoin, MovingPlatform, Spring, Crate, SpinningCoin, Switch, Door, FireBarrier,
} from './entities';
import { LEVELS, LevelData, groundRowOf } from './level';
import { audio } from './audio';
import { WORLD_GRADE } from './gfx/grade';
import { beginGlowFrame } from './gfx/glow';
import { getNoisePattern } from './gfx/noise';
import {
  getUnlocked, setUnlocked, recordBestScore, getBestScore, recordBestTime, getBestTime, saveGhost, getGhost,
  getSettings, addLifetimeCoins, unlockSticker, hasSticker,
  getSpecialCoinsCollected, recordLevelStars,
  isDoubleJumpUnlocked,
  safeLocalGet, safeLocalSet,
} from './storage';
import {
    spawnBlockParticles, spawnBrickParticles, spawnCoinParticles,
    spawnStarParticles, spawnHeartParticles, spawnStompParticles,
    spawnDust, spawnRunDust, spawnSparks,
  } from './engine_internal/particles';
import { installAudioBootstrap } from './engine_internal/audio_bootstrap';
import { isCullExempt, isFreezableEnemy } from './engine_internal/blocks';
import { Compositor } from './engine_internal/compositor';
import { runShellCollisions, runFlagCollision } from './engine_internal/collisions';
import { spawnLevelEntities } from './engine_internal/spawn';
import { hitBlockAt } from './engine_internal/hit_block';
import {
  runGroundPoundShockwave, runBombDetonation,
} from './engine_internal/shockwave';
import {
  runEntityCollisions, playerHit as collidePlayerHit,
  tryStarKill as collideTryStarKill,
  isStompHit as collideIsStompHit,
  applyStompCombo as collideApplyStompCombo,
  playerBounceFromStomp as collidePlayerBounceFromStomp,
} from './engine_internal/player_collisions';
import { stepEntities } from './engine_internal/entity_step';
import { runRender } from './engine_internal/render';
import { WebGLPostProcessor } from './engine_internal/webgl_post';

export type EngineEvent =
  | 'state'        // GameState changed
  | 'hud'          // lives/coins/score/time changed
  | 'unlock'       // unlocked levels changed
  | 'profile'      // active profile changed (UI re-reads stats)
  | 'levelStart'   // a fresh level just began (intro card / Checkpoint reset)
  | 'checkpoint';  // mid-level checkpoint just activated

// Re-exports of imports we used to consume privately so other modules
// (and tests via `window.__game`) can keep importing from this file.
export { recordBestScore, setUnlocked, addLifetimeCoins, unlockSticker };

export class GameEngine {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  input: InputManager;
  camera: Camera;
  physics!: Physics;
  player!: Player;
  entities: Entity[] = [];
  particles: Entity[] = [];
  // Render-Kompositor (AP 0.2): orchestriert die Layer-Phasen (WORLD → POST)
  // und ist die Naht für einen späteren WebGL-Post-Pass (Phase 2).
  compositor = new Compositor();
  level!: LevelData;
  state: GameState = GameState.TITLE;
  time = LEVEL_TIME;
  lastTimestamp = 0;
  accumulator = 0;
  /** AP 1.9: zuletzt gesetzte Musik-Intensität (-1 = noch nie). */
  private lastMusicIntensity = -1;
  private lastCricketLevel = -1;
  private lastCricketDensity = -1;
  fixedDt = 1000 / 60;
  running = false;
  // Handle of the in-flight requestAnimationFrame so stop() can cancel it
  // and start() can stay idempotent (no double game-loop on re-mount/HMR).
  private rafId: number | null = null;
  // Hit-Stop (Game-Feel): freezes the simulation for N fixed-update ticks
  // on impact (stomp/hit/block/ground-pound) so the blow reads with weight.
  // Rendering continues; only update() is skipped while > 0.
  hitStopFrames = 0;
  touchJumpTriggered = false;
  currentLevelIndex = 0;
  unlockedLevels = 1;
  // Persisted across level transitions so score/lives/coins survive.
  // Public because engine_internal/collisions.ts updates these on
  // flag-touch (level-complete carries the player's running stats).
  carryStats = { lives: PLAYER_START_LIVES, coins: 0, score: 0 };
  // Gewählte Spielfigur (persistent). Bestimmt das Sprite-Set für klein UND groß.
  selectedCharacter: 'fiona' | 'lea' =
    safeLocalGet('lf_character') === 'lea' ? 'lea' : 'fiona';
  private listeners: Map<EngineEvent, Set<() => void>> = new Map();
  private audioBootstrapTeardown: (() => void) | null = null;
  private fanfareTimer: number | null = null;
  // DPR-aware backing-store scale: applied as ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0)
  // at the start of every render() so the renderer can keep drawing in
  // logical CANVAS_WIDTH × CANVAS_HEIGHT coords regardless of the device's
  // pixel ratio. Public so engine_internal/render.ts can read it.
  renderScaleX = 1;
  renderScaleY = 1;
  // Basis-Renderskalierung/Viewport (ohne dynamischen Zoom). Der Speed-Zoom
  // skaliert diese pro Frame, ohne den Backing-Store neu zu allokieren.
  private baseRenderScaleX = 1;
  private baseRenderScaleY = 1;
  private baseViewportW = 0;
  private baseViewportH = 0;
  private dynamicZoom = 1;
  // Impact-Zoom (E1): kurzer, abklingender Kamera-Punch bei wuchtigen Momenten
  // (Stampfer-Landung, Stomp, Boss-Treffer). 0 = kein Punch; wird multiplikativ
  // auf den Zoom gelegt und klingt pro Frame weich ab. Über die Shake-Einstellung
  // gated (wer Screenshake aus hat, will auch keinen Zoom-Ruck).
  private impactZoom = 0;
  // Slow-Mo (E2): kurze, weich zurueckfedernde Zeitlupe bei grossen Momenten
  // (Stomp-Kette >=3). Skaliert die Sim-Zeit im gameLoop; Rendering bleibt fluessig.
  private slowMoFrames = 0;
  private slowMoTotal = 1;
  private slowMoStrength = 1;   // Zieltempo am Anfang (z. B. 0.4 = 40 %)
  // Per-level achievement tracking. Reset in startLevel(). Public so
  // engine_internal/* can update / read.
  coinsThisLevel = 0;
  /** Game-Feel: Münz-Combo für steigende Tonhöhe (frame-basiert, kein Loop-Eingriff). */
  coinCombo = 0;
  lastCoinFrame = -999;
  // Public so engine_internal/collisions.ts can grant `no_hit_clear`.
  tookHitThisLevel = false;
  // Sonder-Münzen-Tracking pro Run (Task #30). Wird in startLevel() neu
  // initialisiert: bereits aus Vor-Runs persistierte Slots stehen sofort
  // auf true (damit "alle drei eingesammelt" auch dann gilt, wenn die
  // Spielerin diesen Run nur die letzte fehlende Münze holt). Public, weil
  // engine_internal/player_collisions.ts den jeweiligen Slot setzt.
  specialCoinsThisRun: [boolean, boolean, boolean] = [false, false, false];
  // Sterne-Bewertung des zuletzt abgeschlossenen Levels (0..3). Wird in
  // finalizeLevelComplete() berechnet und für die UI über getStats()
  // exponiert, damit der Levelend-Overlay die Sterne anzeigen kann.
  lastLevelStars = 0;
  // Achievement listeners (id-payload). Separate from `EngineEvent` so the
  // payload flows naturally to subscribers without breaking the existing
  // no-arg event API.
  private achievementListeners: Set<(id: string) => void> = new Set();
  // Object pools: dead transient entities are recycled here instead of
  // being garbage-collected. Capped per pool so a runaway level can't
  // bloat memory. New entities prefer pop() over `new`.
  private particlePool: Particle[] = [];
  private floatingTextPool: FloatingText[] = [];
  // Tarzan-Seil-Nachschwingen: levelFrame des letzten Absprungs je Seilindex
  // (rein visuell — der Renderer legt einen abklingenden Twang auf den Winkel).
  vineKickFrame: number[] = [];
  // Publikums-Erregung (Turnhallen-Schlucht): 0..1, klingt ab, springt bei
  // besonderen Momenten hoch → Tribüne jubelt/springt (La-Ola statt nur Wippen).
  crowdExcite = 0;
  // Plüsch-Traumland: vorheriger Power-Zustand (für Verwandlungs-Puff-Erkennung).
  plushPrevBig = false;
  plushPrevFire = false;
  // Zwischenziel „Verwandlungskünstlerin": im Plüsch-Level Panda + Elefant erlebt.
  plushSawPanda = false;
  plushSawElephant = false;
  private playerFireballPool: PlayerFireball[] = [];
  private magicBoltPool: MagicBolt[] = [];
  private static readonly POOL_CAP = 200;

  // Per-level "*Block" registries: which (col,row) QUESTION_BLOCK pops
  // which power-up. Public so engine_internal/hit_block.ts can read.
  heartBlockPositions = new Set<string>();
  starBlockPositions = new Set<string>();
  fireBlockPositions = new Set<string>();
  magnetBlockPositions = new Set<string>();
  capeBlockPositions = new Set<string>();
  shieldBlockPositions = new Set<string>();
  clockBlockPositions = new Set<string>();
  superBlockPositions = new Set<string>();
  // Active ground-pound shockwaves. Decoupled from particles so they can
  // own their own age/radius and render with a dedicated effect. Public
  // so engine_internal/* can mutate.
  shockwaves: Array<{ x: number; y: number; age: number; max: number; radius: number }> = [];
  // Flügelschlag-Puffs beim Doppelsprung (Paket 2). Wie shockwaves entkoppelt,
  // damit sie ihr eigenes Alter/Ausblenden führen.
  wingFlutters: Array<{ x: number; y: number; age: number; max: number; dir: number }> = [];
  // Feinschliff: Coin-Pop-Ringe beim Münzeinsammeln (eigenes Alter/Ausblenden).
  coinPops: Array<{ x: number; y: number; age: number; max: number; combo: number }> = [];
  // Aktive Note-Block-Einsack-Animationen: key `col,row` → verbleibende Frames.
  noteBounceTimers: Map<string, number> = new Map();
  // Warp-Röhren: Cooldown verhindert sofortiges Zurück-Warpen, Flash blendet
  // den Übergang kurz hell auf (Screen-Space, im Post-Layer gerendert).
  warpCooldown = 0;
  warpFlash = 0;

  // --- Spielbarkeit & Fairness (Task #29) ---
  // Mid-Level-Checkpoint: aktive Position (in Welt-Pixeln) und Flag, ob
  // der Spieler ihn schon passiert hat. Wird in startLevel() aus
  // level.checkpoint befüllt; respawnPlayer() benutzt sie statt
  // playerStart, sobald `checkpointActive` true ist.
  checkpointActive = false;
  checkpointSpawn: { x: number; y: number } | null = null;
  // Welt-X, an der der Spieler die Checkpoint-Säule überquert haben muss.
  // null = dieses Level hat keinen Checkpoint definiert.
  private checkpointTriggerX: number | null = null;
  // Render-Position der Checkpoint-Flagge (Top der Säule).
  checkpointDrawPos: { x: number; y: number; poleHeight: number } | null = null;
  // Level-Intro-Karte: zählt von LEVEL_INTRO_FRAMES auf 0 herunter.
  // Die React-Schicht reagiert auf 'levelStart' und blendet die Karte ein;
  // der Wert wird zusätzlich gespiegelt, damit Tests / Debug-UI ihn lesen können.
  levelIntroFramesRemaining = 0;
  // Zeit-Bonus-Animation am Levelende: timeBonusInitial = Restzeit beim
  // Flag-Touch (in ganzen Sekunden); timeBonusRemaining wird im
  // LEVEL_COMPLETE-State pro Frame heruntergezählt, jede gedraintе Einheit
  // gibt TIME_BONUS_PER_TIME Punkte. Wenn 0 → finalizeLevelComplete().
  timeBonusInitial = 0;
  timeBonusRemaining = 0;
  private timeBonusDrainPerFrame = 0;
  private timeBonusTickAccum = 0;
  private levelCompleteFinalized = false;
  private bossGateOpened = false;

  // Dev-only diagnostic strings populated at startLevel() when *Block
  // declarations don't line up with a QUESTION_BLOCK tile. Surfaced by
  // the React layer in DEV builds (import.meta.env.DEV) so designers
  // notice the problem instead of silently shipping ghost items.
  devBlockWarnings: string[] = [];

  // Adaptive quality: rolling average of the last frame deltas. When the
  // game can't keep up with ~50 FPS we flip `lowFx` so particle helpers
  // can spawn fewer / shorter-lived effects. Public so engine_internal
  // particle helpers can early-return on heavy bursts.
  private fpsAccum = 0;
  private fpsSamples = 0;
  lowFx = false;
  // Live-Telemetrie fürs Debug-Overlay (AP 0.3). Werden im selben ~60-Frame-
  // Takt wie die lowFx-Auswertung aktualisiert — vernachlässigbarer Aufwand.
  currentFps = 60;
  frameMs = 16.7;
  // AP 0.5/0.3: Tatsächlich angewandte Grafikstufe (kann bei Settings='auto'
  // dynamisch von der Engine gesetzt werden). renderer.quality spiegelt sie.
  effectiveQuality: 'low' | 'mid' | 'high' = 'high';
  // Auto-Qualität: aktuelle Stufe + Hysterese-Zähler. Optimistischer Start
  // bei 'high'; bei dauerhaft niedriger FPS wird heruntergestuft.
  private autoTier: 'low' | 'mid' | 'high' = 'high';
  private autoBadEvals = 0;
  private autoGoodEvals = 0;
  // Auto-Startstufe einmalig anhand der Bildschirmgröße wählen (großer iPad →
  // gleich niedriger starten statt sich erst sekundenlang herunterzuruckeln).
  private autoStarted = false;
  // Gecachte Maße der letzten resize() — erlauben das erneute Anwenden des
  // Backing-Stores (dpr-Cap) bei einer Auto-Stufen-Änderung ohne volle resize.
  private lastDisplayW = 0;
  private lastDisplayH = 0;
  private lastLogicalW = 0;
  private lastLogicalH = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager();
    this.camera = new Camera(0, 0);
    // Echte Progression aus dem aktiven Profil (Release). Zum Testen bleibt der
    // Settings-Schalter `unlockAllWorlds` (siehe getUnlockedLevels) — der schaltet
    // alle Welten frei, OHNE die gespeicherte Progression zu verändern.
    this.unlockedLevels = Math.min(Math.max(1, getUnlocked()), LEVELS.length);
    // Touch input is owned by the React DOM overlay (pages/game.tsx) which
    // writes directly into this.input.touchLeft/Right/Jump/Run.
    this.installAudioBootstrap();
    this.installCtaClickHandler();
  }

  /** Welt-13-Siegscreen: Tap/Klick auf das CTA-Panel öffnet die Bluefield-Seite.
   *  Nur aktiv im LEVEL_COMPLETE des bluefield-Levels; sonst No-op. */
  private installCtaClickHandler() {
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.state !== GameState.LEVEL_COMPLETE) return;
      const rect = this.renderer.bluefieldCtaRect;
      if (!rect || this.renderer.currentTheme !== 'bluefield') return;
      const cr = this.canvas.getBoundingClientRect();
      if (cr.width === 0 || cr.height === 0) return;
      const vx = (e.clientX - cr.left) / cr.width * this.renderer.viewportW;
      const vy = (e.clientY - cr.top) / cr.height * this.renderer.viewportH;
      if (vx >= rect.x && vx <= rect.x + rect.w && vy >= rect.y && vy <= rect.y + rect.h) {
        window.open('https://bluefield-solutions.de/labor', '_blank', 'noopener');
        this.trackFunnel('cta_click');
      }
    });
  }

  /** Autarker Funnel-Hook fürs Bluefield-Level. Meldet Ereignisse an dataLayer
   *  (GTM/GA4), einen optionalen window.bluefieldTrack-Callback UND ein
   *  CustomEvent ('bluefield:funnel'). Die Host-Seite erfasst sie — aus dem
   *  Spiel selbst geht KEIN externer Request raus (Autarkie bleibt). */
  trackFunnel(event: string, detail: Record<string, unknown> = {}) {
    try {
      const w = window as unknown as {
        dataLayer?: unknown[];
        bluefieldTrack?: (e: string, d: Record<string, unknown>) => void;
      };
      if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: 'bluefield_' + event, ...detail });
      if (typeof w.bluefieldTrack === 'function') w.bluefieldTrack(event, detail);
      window.dispatchEvent(new CustomEvent('bluefield:funnel', { detail: { event, ...detail } }));
    } catch { /* Funnel darf nie das Spiel stören */ }
  }

  /** Public read-only getters used by the React DOM overlay. */
  /** Live-Telemetrie fürs Debug-Overlay (AP 0.3): FPS, Frame-Zeit (ms),
   *  aktive Entities/Partikel und den adaptiven lowFx-Status. */
  getDebugInfo() {
    return {
      fps: Math.round(this.currentFps),
      frameMs: Math.round(this.frameMs * 10) / 10,
      entities: this.entities.length,
      particles: this.particles.length,
      lowFx: this.lowFx,
      quality: this.effectiveQuality,
      auto: getSettings().quality === 'auto',
    };
  }
  getStats() {
    if (!this.player) {
      return {
        lives: this.carryStats.lives, coins: this.carryStats.coins, score: this.carryStats.score, time: 0,
        isPCharged: false, runChargePct: 0, superCharges: 0,
        specialCoins: [false, false, false] as [boolean, boolean, boolean],
        lastLevelStars: this.lastLevelStars,
      };
    }
    // Mario-feel: surface the P-meter state so the React HUD can render the
    // gold "P!" indicator and the charging progress bar.
    return {
      lives: this.player.lives,
      coins: this.player.coins,
      score: this.player.score,
      time: Math.max(0, Math.ceil(this.time)),
      isPCharged: this.player.isPCharged,
      runChargePct: Math.max(0, Math.min(1, this.player.runChargeTimer / P_METER_FRAMES)),
      // Sonder-Münzen / Sterne (Task #30). HUD zeigt eingesammelte Anzahl
      // im aktuellen Run, der Levelend-Overlay nutzt lastLevelStars.
      specialCoins: [
        this.specialCoinsThisRun[0],
        this.specialCoinsThisRun[1],
        this.specialCoinsThisRun[2],
      ] as [boolean, boolean, boolean],
      superCharges: this.player.superCharges,
      lastLevelStars: this.lastLevelStars,
    };
  }
  getCurrentLevelInfo() {
    if (this.currentLevelIndex < 0 || this.currentLevelIndex >= LEVELS.length) return null;
    return {
      index: this.currentLevelIndex,
      name: LEVELS[this.currentLevelIndex].name,
      hasNext: this.currentLevelIndex + 1 < LEVELS.length,
      nextName: this.currentLevelIndex + 1 < LEVELS.length ? LEVELS[this.currentLevelIndex + 1].name : null,
    };
  }
  getUnlockedLevels(): number {
    // Test-Schalter: alle Welten anspielbar, ohne die gespeicherte
    // Progression (this.unlockedLevels) zu verändern.
    if (getSettings().unlockAllWorlds) return LEVELS.length;
    return this.unlockedLevels;
  }
  isAudioMuted(): boolean { return audio.isMuted(); }

  /** Spielfigur wählen (Lea/Fiona). Persistiert + wirkt sofort. */
  setCharacter(c: 'fiona' | 'lea') {
    this.selectedCharacter = c;
    if (this.player) this.player.character = c;
    safeLocalSet('lf_character', c);
  }

  // Re-pull profile-scoped state out of storage. Called by the UI after
  // the active profile changes so the engine's cached unlockedLevels
  // matches the new profile's progress, and the audio graph picks up
  // the new profile's music/SFX volumes immediately.
  reloadFromActiveProfile() {
    this.unlockedLevels = Math.min(Math.max(1, getUnlocked()), LEVELS.length); // echte Progression des aktiven Profils
    this.carryStats = { lives: PLAYER_START_LIVES, coins: 0, score: 0 };
    audio.applyVolume();
    this.emit('unlock');
    this.emit('hud');
    this.emit('profile');
  }

  /** Public actions for the React DOM overlay. */
  returnToTitle() {
    this.input.resetTouchState();
    this.touchJumpTriggered = false;
    this.goToTitle();
  }
  restartCurrentLevel() {
    // "Erneut versuchen" after GAME_OVER: we always restart with fresh full
    // lives/coins/score (matches the user expectation of a real "retry").
    this.input.resetTouchState();
    this.touchJumpTriggered = false;
    this.carryStats = { lives: PLAYER_START_LIVES, coins: 0, score: 0 };
    this.startLevel(this.currentLevelIndex);
  }
  continueToNextLevel() {
    this.input.resetTouchState();
    this.touchJumpTriggered = false;
    this.advanceFromLevelComplete();
  }

  on(event: EngineEvent, fn: () => void): () => void {
    let set = this.listeners.get(event);
    if (!set) { set = new Set(); this.listeners.set(event, set); }
    set.add(fn);
    return () => set!.delete(fn);
  }

  private emit(event: EngineEvent) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach(fn => { try { fn(); } catch { /* swallow */ } });
  }

  /**
   * Subscribe to achievement unlocks. Listener receives the achievement id;
   * payload-bearing variant of `on(...)` kept separate so the typed
   * signature stays clean. Returns an unsubscribe function.
   */
  onAchievement(fn: (id: string) => void): () => void {
    this.achievementListeners.add(fn);
    return () => this.achievementListeners.delete(fn);
  }

  /**
   * Persist + announce a sticker unlock. Idempotent — repeated calls with
   * the same id after the first one are no-ops (storage rejects dupes).
   */
  // Sichtbare Belohnung: goldene Krone über der Figur, sobald in JEDER Welt
  // alle Sonder-Münzen gesammelt sind (Sticker 'super_collector'). Wird beim
  // Levelstart aus dem Profil geladen und live gesetzt, wenn er freigeschaltet wird.
  showCrown = false;

  private grantAchievement(id: string) {
    if (!unlockSticker(id)) return;
    // Fröhliches „Pling" für jeden NEU gefundenen Sticker.
    audio.playSfx('stickerGet');
    if (id === 'super_collector') this.showCrown = true;
    this.achievementListeners.forEach(fn => { try { fn(id); } catch { /* swallow */ } });
  }

  /**
   * Camera shake gated by the per-profile `screenShake` setting. Wraps
   * every camera.shake call so the user can disable the effect globally
   * without per-call hand-checks scattered through the engine. Public so
   * engine_internal/* can use it.
   */
  shakeCamera(intensity: number, duration: number) {
    if (!getSettings().screenShake) return;
    this.camera.shake(intensity, duration);
  }

  // ---- Object pools ---------------------------------------------------
  // Acquire helpers re-use a dead instance from the pool when available;
  // otherwise allocate. Reset to fresh state via the entity's reset(...).
  // Public so engine_internal/* can use them.
  acquireParticle(x: number, y: number, velX: number, velY: number, color: string, size = 3, lifetime = 30): Particle {
    const p = this.particlePool.pop();
    if (p) { p.reset(x, y, velX, velY, color, size, lifetime); return p; }
    return new Particle(x, y, velX, velY, color, size, lifetime);
  }
  acquireFloatingText(x: number, y: number, text: string, scale = 1): FloatingText {
    // Fix B-04: mehrere gleichzeitige Popups (schnelles Münz-Sammeln) an fast
    // derselben Stelle horizontal entzerren, damit sich "+100"-Zahlen nicht zu
    // "+10G+100" überlagern. Horizontal (nicht vertikal), damit die Entzerrung
    // auch unter der oberen HUD-Klemmung lesbar bleibt. Richtung alterniert.
    let near = 0;
    for (const p of this.particles) {
      if (p instanceof FloatingText && p.alive
        && Math.abs(p.x - x) < 46 && Math.abs(p.y - y) < 26) {
        near++;
      }
    }
    if (near > 0) x += (near % 2 === 1 ? 1 : -1) * Math.ceil(near / 2) * 42;
    const t = this.floatingTextPool.pop();
    if (t) { t.reset(x, y, text, scale); return t; }
    return new FloatingText(x, y, text, scale);
  }
  acquirePlayerFireball(x: number, y: number, dir: Direction): PlayerFireball {
    const f = this.playerFireballPool.pop();
    if (f) { f.reset(x, y, dir); return f; }
    return new PlayerFireball(x, y, dir);
  }
  acquireMagicBolt(x: number, y: number, dir: Direction): MagicBolt {
    const b = this.magicBoltPool.pop();
    if (b) { b.reset(x, y, dir); return b; }
    return new MagicBolt(x, y, dir);
  }
  // Push back into pool unless cap reached. Caller guarantees alive=false.
  recycleEntity(e: Entity) {
    if (e instanceof PlayerFireball && this.playerFireballPool.length < GameEngine.POOL_CAP) {
      this.playerFireballPool.push(e);
    } else if (e instanceof MagicBolt && this.magicBoltPool.length < GameEngine.POOL_CAP) {
      this.magicBoltPool.push(e);
    }
  }
  recycleParticle(p: Entity) {
    if (p instanceof Particle && this.particlePool.length < GameEngine.POOL_CAP) {
      this.particlePool.push(p);
    } else if (p instanceof FloatingText && this.floatingTextPool.length < GameEngine.POOL_CAP) {
      this.floatingTextPool.push(p);
    }
  }

  private setState(next: GameState) {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    // Whenever we leave PLAYING (overlay appears, level ends, level changes, etc.)
    // force-clear touch booleans so a held finger doesn't leak into the next run.
    if (prev === GameState.PLAYING && next !== GameState.PLAYING) {
      this.input.resetTouchState();
      this.touchJumpTriggered = false;
    }
    this.emit('state');
  }

  // Wire WebAudio bootstrap (browsers require user-gesture init). Saved
  // teardown is called on stop() so React hot-reloads don't leak.
  private installAudioBootstrap() {
    this.audioBootstrapTeardown = installAudioBootstrap(() => {
      this.audioBootstrapTeardown = null;
      // Erste Geste → AudioContext läuft. Sind wir noch auf dem Start-
      // bildschirm, jetzt die sanfte Titelmusik starten (vorher von der
      // Browser-Policy blockiert).
      if (this.state === GameState.TITLE) audio.startTitleMusic();
    });
  }

  /** Public bridge so engine_internal modules can emit engine events. */
  emitEvent(event: EngineEvent) { this.emit(event); }
  /** Public bridge so engine_internal modules can grant achievements. */
  grantAchievementById(id: string) { this.grantAchievement(id); }
  /** Public bridge so engine_internal modules can change game state. */
  setEngineState(state: GameState) { this.setState(state); }
  /** Public bridge so engine_internal modules can defer the fanfare. */
  scheduleFanfare() {
    this.cancelFanfare();
    this.fanfareTimer = window.setTimeout(() => {
      this.fanfareTimer = null;
      audio.playSfx('fanfare');
    }, 600);
  }

  // ---- Particle-spawn shims -------------------------------------------
  // Thin wrappers over engine_internal/particles helpers so call-sites
  // (engine + engine_internal/*) all use the same engine method names.
  spawnStompParticles(x: number, y: number) {
    spawnStompParticles(this.particles, this.acquireParticle.bind(this), x, y);
    this.addImpactZoom(0.032);           // kleiner, befriedigender Stomp-Punch
    // Plüsch-Traumland: besiegte Dinos pusten eine weiche Füllung aus Herzchen
    // (kindgerechter „Puff" statt harter Treffer).
    if (this.level.theme === 'plush') {
      spawnHeartParticles(this.particles, this.acquireParticle.bind(this), x, y - 8);
    }
  }
  // Cosmetic bursts honor the adaptive `lowFx` flag: when frame-times slip
  // below ~50 FPS we skip half of these flourish bursts so the game can
  // catch up. Game-critical effects (stomp dust, sparks) stay full-rate.
  spawnBlockParticles(x: number, y: number) {
    if (this.lowFx && Math.random() < 0.5) return;
    spawnBlockParticles(this.particles, this.acquireParticle.bind(this), x, y);
  }
  spawnBrickParticles(x: number, y: number) {
    spawnBrickParticles(this.particles, this.acquireParticle.bind(this), x, y);
  }
  spawnCoinParticles(x: number, y: number) {
    if (this.lowFx && Math.random() < 0.5) return;
    spawnCoinParticles(this.particles, this.acquireParticle.bind(this), x, y);
  }
  spawnStarParticles(x: number, y: number) {
    if (this.lowFx && Math.random() < 0.5) return;
    spawnStarParticles(this.particles, this.acquireParticle.bind(this), x, y);
  }
  spawnHeartParticles(x: number, y: number) {
    if (this.lowFx && Math.random() < 0.5) return;
    spawnHeartParticles(this.particles, this.acquireParticle.bind(this), x, y);
  }
  // Mario-feel: small puff of greyish dust kicked horizontally in `dir`.
  // Used for skid/slide/wall-jump push-offs.
  spawnDust(x: number, y: number, dir: number) {
    spawnDust(this.particles, this.acquireParticle.bind(this), x, y, dir, this.dustColors());
  }
  // Feinschliff: leichter Sprint-Staub-Trail hinter den Füßen.
  spawnRunDust(x: number, y: number, dir: number) {
    spawnRunDust(this.particles, this.acquireParticle.bind(this), x, y, dir, this.dustColors());
  }
  // Feinschliff: welt­getönte Staubfarben, damit aufgewirbelter Staub zum
  // Untergrund passt (Sand am Strand, Schnee im Eis, Erde im Dschungel, dunkler
  // Fels in der Höhle …) statt überall gleich grau zu sein.
  dustColors(): string[] {
    switch (this.level?.theme) {
      case 'beach':
      case 'australia':  return ['#e8d6a9', '#dcc596', '#efe1bd', '#cbb488'];
      case 'ice':        return ['#e2edf5', '#f0f7fc', '#cfe0ee', '#dbe8f2'];
      case 'cave':
      case 'dragon':     return ['#8f8a84', '#9c958c', '#7a746c', '#a49d94'];
      case 'volcano':    return ['#8f817a', '#a1938b', '#766a63', '#b4a49a'];
      case 'sky':        return ['#eef2f7', '#ffffff', '#dfe7f0', '#e7edf4'];
      case 'plush':      return ['#ecdfea', '#f4ecf2', '#ddd0db', '#f0e3ec'];
      case 'space':      return ['#b7add0', '#cabfe0', '#9a8fbe', '#d6ccea'];
      case 'underwater': return ['#bcd6df', '#d2e6ec', '#a6c4cf', '#c8dee5'];
      case 'forest':     return ['#8a7a5c', '#9c8a68', '#6e5f45', '#b0a07e']; // Waldboden: Erde + Laub
      case 'jungle':
      case 'bluefield':
      case 'school':
      case 'gym':
      case 'trampoline': return ['#bcae92', '#cbbfa5', '#a89a7e', '#d0c4ab'];
      default:           return ['#ddd', '#ccc', '#bbb', '#e8e0d0'];
    }
  }

  // Hit-Stop trigger. Uses max() so overlapping impacts in the same frame
  // don't shorten an already-longer freeze.
  triggerHitStop(frames: number) {
    if (frames > this.hitStopFrames) this.hitStopFrames = frames;
  }
  // Mario-feel: gold sparks under the feet while the P-meter is charged.
  spawnSparks(x: number, y: number) {
    spawnSparks(this.particles, this.acquireParticle.bind(this), x, y);
  }

  private cancelFanfare() {
    if (this.fanfareTimer !== null) {
      clearTimeout(this.fanfareTimer);
      this.fanfareTimer = null;
    }
  }

  /** Start a level by index. Used by both keyboard and external (DOM) UI. */
  startLevelByIndex(levelIndex: number) {
    if (levelIndex < 0 || levelIndex >= LEVELS.length) return;
    if (levelIndex >= this.getUnlockedLevels()) return;
    this.currentLevelIndex = levelIndex;
    // From the title screen: reset run-stats. From level transitions startLevel keeps them.
    if (this.state === GameState.TITLE || this.state === GameState.GAME_OVER) {
      this.carryStats = { lives: PLAYER_START_LIVES, coins: 0, score: 0 };
    }
    this.startLevel(levelIndex);
  }

  /** External UI hooks. */
  togglePause() {
    if (this.state === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
      audio.pauseMusic();
      audio.playSfx('pause');
    } else if (this.state === GameState.PAUSED) {
      this.setState(GameState.PLAYING);
      if (this.level) audio.resumeMusic(this.level.theme);
    }
  }

  goToTitle() {
    this.cancelFanfare();
    audio.stopMusic();
    this.touchJumpTriggered = false;
    this.input.resetTouchState();
    this.carryStats = { lives: PLAYER_START_LIVES, coins: 0, score: 0 };
    this.setState(GameState.TITLE);
    audio.startTitleMusic();
  }

  toggleMute(): boolean {
    audio.init();
    const m = audio.toggleMuted();
    this.emit('hud');
    return m;
  }

  start() {
    // Idempotent: a second start() while already running would spawn a
    // parallel rAF loop (→ doubled simulation speed). Guard against it.
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.gameLoop(this.lastTimestamp);
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.cancelFanfare();
    audio.stopMusic();
    audio.stopTitleMusic();
    if (this.audioBootstrapTeardown) {
      this.audioBootstrapTeardown();
      this.audioBootstrapTeardown = null;
    }
    // Detach global keyboard / blur listeners so a remounted React tree
    // (HMR, navigation) doesn't accumulate orphaned input handlers.
    this.input.dispose();
  }

  /**
   * Test-only: deterministic frame stepping. Runs N fixed-dt update ticks
   * (input → update) without involving requestAnimationFrame or render.
   * Intended for E2E tests that need precise control over per-frame
   * physics (P-meter charging, wall-jump impulse, stomp combos, …).
   * Callers are expected to have stopped the live rAF loop first via
   * stop() so manual ticks don't race with the engine's own gameLoop.
   */
  testStep(frames: number = 1) {
    for (let i = 0; i < frames; i++) {
      this.input.update();
      this.update();
    }
  }

  /**
   * Test-only: spawn a fresh Goomba at world coords and return it so the
   * test can keep a live reference (entities[] may be filtered each frame).
   * Used by the stomp-combo regression test which needs two close-spaced
   * enemies that the player can hit during a single airborne arc.
   */
  testSpawnGoomba(x: number, y: number): Goomba {
    const g = new Goomba(x, y);
    this.entities.push(g);
    return g;
  }

  private gameLoop = (timestamp: number) => {
    if (!this.running) return;

    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    // Assist-Modus (AP 1.7): Spieltempo skaliert die akkumulierte Spielzeit
    // nur im laufenden Spiel. <1 → die Welt aktualisiert seltener (Zeitlupe),
    // das Rendering läuft per RAF mit voller Rate weiter und bleibt flüssig.
    let speed = this.state === GameState.PLAYING ? getSettings().assistGameSpeed : 1;
    // Slow-Mo (E2): startet langsam (slowMoStrength) und federt weich auf 1
    // zurück. Nur im laufenden Spiel; verlangsamt die Sim, nicht das Rendering.
    if (this.slowMoFrames > 0 && this.state === GameState.PLAYING) {
      const t = this.slowMoFrames / this.slowMoTotal;          // 1 → 0
      speed *= this.slowMoStrength + (1 - this.slowMoStrength) * (1 - t);
      this.slowMoFrames--;
    }
    this.accumulator += Math.min(delta, 100) * speed;

    // Adaptive quality: average frame delta over ~60 frames; if it
    // exceeds 20 ms (~50 FPS) we mark the engine as lowFx so heavy
    // particle bursts can self-throttle. Hysteresis: clear the flag
    // once deltas drop back below 17 ms (~58 FPS).
    this.fpsAccum += delta;
    this.fpsSamples++;
    if (this.fpsSamples >= 60) {
      const avg = this.fpsAccum / this.fpsSamples;
      this.frameMs = avg;
      this.currentFps = avg > 0 ? Math.min(120, 1000 / avg) : 60;
      if (!this.lowFx && avg > 20) this.lowFx = true;
      else if (this.lowFx && avg < 17) this.lowFx = false;
      // AP 0.3-Erweiterung: bei 'auto' die effektive Grafikstufe nachführen.
      if (getSettings().quality === 'auto') this.tickAutoQuality(avg);
      this.fpsAccum = 0;
      this.fpsSamples = 0;
    }

    while (this.accumulator >= this.fixedDt) {
      // Hit-Stop: consume the tick's time but skip the world update so the
      // frame visibly freezes on impact. Input is also frozen for these
      // 2–4 frames (imperceptible; buffered presses still register after).
      if (this.hitStopFrames > 0) {
        this.hitStopFrames--;
        this.accumulator -= this.fixedDt;
        continue;
      }
      this.input.update();
      this.update();
      this.accumulator -= this.fixedDt;
    }

    this.render();
    this.rafId = requestAnimationFrame(this.gameLoop);
  };

  private update() {
    if (this.input.muteToggle) {
      // Single source of truth: route through toggleMute so the 'hud' event
      // fires and React's mute icon stays in sync with the keyboard 'M' key.
      this.toggleMute();
    }
    switch (this.state) {
      case GameState.TITLE:
        this.renderer.time++;
        // Keys "1".."9" -> levels 1..9, key "0" -> level 10
        for (let i = 0; i < LEVELS.length; i++) {
          const keyForIndex = i === 9 ? '0' : String(i + 1);
          if (this.input.justPressed(keyForIndex) && i < this.getUnlockedLevels()) {
            audio.playSfx('select');
            this.startLevelByIndex(i);
            break;
          }
        }
        if (this.touchJumpTriggered) {
          this.touchJumpTriggered = false;
        }
        break;
      case GameState.PLAYING:
        this.updatePlaying();
        // AP 1.9: vertikales Musik-Layering — der Intensitäts-Stem blendet ein,
        // wenn die Spielerin rennt (Tempo/Drive), und wieder aus beim Gehen.
        {
          const intensity = Math.abs(this.player.velX) > 5.5 ? 1 : 0;
          if (intensity !== this.lastMusicIntensity) {
            audio.setMusicIntensity(intensity);
            this.lastMusicIntensity = intensity;
          }
        }
        // Wald-Nacht: Grillenzirpen folgt dem Fortschritt (Nacht-Anteil). Nur im
        // Wald aktiv; sonst auf 0 (setForestCrickets stoppt den Timer selbst).
        {
          let crickets = 0;
          if (this.level.theme === 'forest') {
            const span = Math.max(1, (this.camera.worldWidth || this.camera.width) - this.camera.width);
            const p = Math.max(0, Math.min(1, this.camera.x / span));
            // gleiche Kurve wie nightF im Hintergrund (voll ab ~0.80)
            const k = Math.max(0, Math.min(1, (p - 0.52) / (0.80 - 0.52)));
            crickets = k * k * (3 - 2 * k);
          }
          // Handregler (Optionsmenü, 0..1). Ganz links = Nacht-Ambient komplett
          // aus (auch Eule/Wind, da an cricketLevel gekoppelt).
          const grillen = getSettings().grillenDichte;
          if (grillen < 0.04) crickets = 0;
          // Dichte = Regler (0..1 → 0..1.5), gedeckelt durch die Geräteklasse,
          // damit schwache Geräte trotz hoher Einstellung nicht gebremst werden.
          const cap = this.effectiveQuality === 'low' ? 0.6 : this.effectiveQuality === 'mid' ? 1.0 : 1.5;
          const density = Math.min(grillen * 1.5, cap);
          if (density !== this.lastCricketDensity) { audio.setCricketDensity(density); this.lastCricketDensity = density; }
          if (Math.abs(crickets - this.lastCricketLevel) > 0.05 || (crickets === 0 && this.lastCricketLevel !== 0)) {
            audio.setForestCrickets(crickets);
            this.lastCricketLevel = crickets;
          }
        }
        break;
      case GameState.PAUSED:
        this.renderer.time++;
        if (this.input.pause) {
          // ESC/„P" in PAUSED = Weiterspielen (Pause an/aus-Toggle, wie von
          // Tastatur-Nutzern erwartet). Fix B-01: vorher sprang derselbe
          // Tastendruck zur Levelauswahl und verwarf die Level-Position; die
          // Levelauswahl ist bewusst nur noch über den expliziten Button.
          this.togglePause();
        }
        break;
      case GameState.GAME_OVER:
        this.renderer.time++;
        if (this.input.enter || this.touchJumpTriggered) {
          this.touchJumpTriggered = false;
          this.goToTitle();
        }
        break;
      case GameState.LEVEL_COMPLETE:
        this.renderer.time++;
        // Tick die Zeit-Bonus-Animation: jede Frame drainen wir
        // `timeBonusDrainPerFrame` Einheiten Restzeit, jede gedraintе
        // Einheit gibt TIME_BONUS_PER_TIME Punkte und alle paar Ticks
        // einen Coin-SFX. Wenn fertig → finalize.
        if (this.timeBonusRemaining > 0) {
          const drain = Math.min(this.timeBonusRemaining, this.timeBonusDrainPerFrame);
          this.timeBonusRemaining -= drain;
          this.player.score += drain * TIME_BONUS_PER_TIME;
          this.timeBonusTickAccum += drain;
          if (this.timeBonusTickAccum >= 3 || this.timeBonusRemaining === 0) {
            audio.playSfx('coin');
            this.timeBonusTickAccum = 0;
          }
          this.emit('hud');
          if (this.timeBonusRemaining === 0) this.finalizeLevelComplete();
        }
        if (this.input.enter || this.touchJumpTriggered) {
          this.touchJumpTriggered = false;
          // Enter überspringt eine noch laufende Bonus-Animation: drain
          // den Rest in einem Rutsch und springe sofort weiter, damit
          // ein einziger Tastendruck wirklich "Bonus + Weiter" auslöst.
          if (this.timeBonusRemaining > 0) {
            this.player.score += this.timeBonusRemaining * TIME_BONUS_PER_TIME;
            this.timeBonusRemaining = 0;
            audio.playSfx('coin');
            this.emit('hud');
          }
          this.advanceFromLevelComplete();
        }
        break;
    }
  }

  private advanceFromLevelComplete() {
    // Sicherheitsnetz: falls der Spieler "Weiter" drückt bevor die
    // Bonus-Animation gedraint hat, bekommen wir hier sicher die
    // finalen Stats geschrieben.
    this.finalizeLevelComplete();
    this.cancelFanfare();
    if (this.currentLevelIndex + 1 < LEVELS.length) {
      this.currentLevelIndex++;
      this.startLevel(this.currentLevelIndex);
    } else {
      this.goToTitle();
    }
  }

  /**
   * Schreibt die finalen Run-Stats nach Ende der Zeit-Bonus-Animation.
   * Idempotent — wiederholte Aufrufe (Bonus-Drain abgeschlossen + danach
   * "Weiter" gedrückt) sind no-ops.
   */
  private finalizeLevelComplete() {
    if (this.levelCompleteFinalized) return;
    this.levelCompleteFinalized = true;
    this.carryStats.lives = this.player.lives;
    this.carryStats.coins = this.player.coins;
    this.carryStats.score = this.player.score;
    const prevBest = getBestScore(this.currentLevelIndex);
    recordBestScore(this.currentLevelIndex, this.player.score);
    this.renderer.levelBestScore = Math.max(prevBest, this.player.score);
    this.renderer.levelNewRecord = prevBest > 0 && this.player.score > prevBest;
    // Bestzeit (Retention): verbrauchte Sekunden = LEVEL_TIME − Restzeit beim
    // Flag-Touch. Kleiner ist besser. „Neue Bestzeit" nur, wenn es schon eine
    // frühere Zeit gab und die neue schneller ist.
    const elapsed = Math.max(1, LEVEL_TIME - this.timeBonusInitial);
    const prevBestTime = getBestTime(this.currentLevelIndex);
    recordBestTime(this.currentLevelIndex, elapsed);
    this.renderer.levelTime = elapsed;
    this.renderer.levelBestTime = prevBestTime > 0 ? Math.min(prevBestTime, elapsed) : elapsed;
    this.renderer.levelNewTimeRecord = prevBestTime > 0 && elapsed < prevBestTime;
    // Time-Attack-Geist: bei neuer Bestzeit (oder erstem Lauf) die Spur sichern.
    if (prevBestTime === 0 || elapsed < prevBestTime) {
      saveGhost(this.currentLevelIndex, this.ghostRec);
    }
    // Sterne-Bewertung (Task #30):
    //   1 Stern — alle drei Sonder-Münzen eingesammelt (im Run oder
    //             aus früheren Runs persistiert);
    //   2 Stern — Level ohne Treffer abgeschlossen;
    //   3 Stern — beim Flag-Touch waren ≥ STAR_TIME_THRESHOLD Sekunden übrig.
    // Maximum mit dem bestehenden Wert ist Sache von recordLevelStars().
    const fSpec = this.specialCoinsThisRun[0] && this.specialCoinsThisRun[1] && this.specialCoinsThisRun[2];
    const fNoHit = !this.tookHitThisLevel;
    const fFast = this.timeBonusInitial >= STAR_TIME_THRESHOLD;
    const stars = (fSpec ? 1 : 0) + (fNoHit ? 1 : 0) + (fFast ? 1 : 0);
    this.lastLevelStars = stars;
    this.renderer.levelStars = stars;
    this.renderer.levelStarFlags = [fSpec, fNoHit, fFast];
    recordLevelStars(this.currentLevelIndex, stars);
    this.emit('hud');
  }

  /** Public bridge für engine_internal/collisions.ts: setzt die
   *  Zeit-Bonus-Animation auf. Aufgerufen wenn der Spieler die Flagge
   *  berührt. `timeUnits` = volle verbleibende Sekunden. */
  setTimeBonus(timeUnits: number) {
    this.timeBonusInitial = Math.max(0, timeUnits);
    this.timeBonusRemaining = this.timeBonusInitial;
    this.timeBonusDrainPerFrame = Math.max(
      1,
      Math.ceil(this.timeBonusInitial / TIME_BONUS_DURATION_FRAMES),
    );
    this.timeBonusTickAccum = 0;
    this.levelCompleteFinalized = false;
  }

  private startLevel(levelIndex: number) {
    // Krone-Belohnung aus dem Profil laden (bleibt sichtbar, solange der
    // 'super_collector'-Sticker vorhanden ist).
    this.showCrown = hasSticker('super_collector');
    // A flag fanfare scheduled by the previous level must not fire over
    // the new level's music. Safe no-op if no timer is pending.
    this.cancelFanfare();
    this.hitStopFrames = 0;
    this.bossGateOpened = false;
    // Time-Attack-Geist: Aufzeichnung zurücksetzen, gespeicherten Geist laden.
    this.levelFrame = 0;
    this.ghostRec = [];
    this.ghostPlay = getGhost(levelIndex);
    const levelInfo = LEVELS[levelIndex];
    this.level = levelInfo.create();
    this.renderer.resetBackground();
    this.renderer.setTheme(this.level.theme);
    this.renderer.currentGroundRow = groundRowOf(this.level);
    if (this.level.theme === 'bluefield') {
      this.trackFunnel('start', { level: levelIndex + 1 });
      this.renderer.bluefieldBootStart = this.renderer.time;
    }
    this.physics = new Physics(this.level.tiles, this.level.width, this.level.height);
    this.physics.terrainHills = this.level.terrainHills ?? [];
    // Oberflächen-Wasser ist überall eine Gefahr — außer im Schwimm-Level.
    this.physics.waterHazard = this.level.theme !== 'underwater';
    this.camera = new Camera(this.level.width * TILE_SIZE, this.level.height * TILE_SIZE);
    // Adopt the current (possibly widened/zoomed) viewport so a level
    // loaded after a resize keeps the right framing instead of reverting.
    this.camera.width = this.renderer.viewportW;
    this.camera.height = this.renderer.viewportH;
    this.player = new Player(this.level.playerStart.x, this.level.playerStart.y, this.carryStats.lives);
    this.player.character = this.selectedCharacter;
    // Doppelsprung (Paket 2): nur wenn die Flügel-Fähigkeit freigeschaltet ist.
    this.player.doubleJumpUnlocked = isDoubleJumpUnlocked();
    this.player.coins = this.carryStats.coins;
    this.player.score = this.carryStats.score;
    this.entities = [];
    this.particles = [];
    this.time = LEVEL_TIME;
    audio.stopTitleMusic();
    audio.startMusic(this.level.theme);
    this.emit('hud');

    spawnLevelEntities(this);

    // Sonder-Münzen (Task #30): bereits eingesammelte Slots (per Profil
    // pro Level persistiert) werden NICHT mehr ge-spawned — die Spielerin
    // kann sie nicht doppelt holen. specialCoinsThisRun startet vorbelegt
    // mit dem persistierten Stand, damit "alle drei eingesammelt" auch in
    // einem Run gilt, in dem nur die letzte fehlende Münze geholt wird.
    const persistedSpecial = getSpecialCoinsCollected(levelIndex);
    this.specialCoinsThisRun = [
      persistedSpecial[0],
      persistedSpecial[1],
      persistedSpecial[2],
    ];
    if (this.level.specialCoins) {
      this.level.specialCoins.slice(0, SPECIAL_COINS_PER_LEVEL).forEach((coord, slot) => {
        if (persistedSpecial[slot]) return;
        const [c, r] = coord.split(',').map(Number);
        if (Number.isNaN(c) || Number.isNaN(r)) return;
        // Tile (32×32) → Sonder-Münze (28×28) zentriert in das Tile setzen.
        const x = c * TILE_SIZE + (TILE_SIZE - 28) / 2;
        const y = r * TILE_SIZE + (TILE_SIZE - 28) / 2;
        this.entities.push(new SpecialCoin(x, y, slot));
      });
    }

    // Spielbarkeit & Fairness (Task #29):
    //   - Mid-Level-Checkpoint zurücksetzen und neu aus Leveldaten lesen.
    //   - Level-Intro-Karte einblenden (React reagiert auf 'levelStart').
    //   - Zeit-Bonus-State für das frische Level neutralisieren.
    this.checkpointActive = false;
    this.checkpointSpawn = null;
    this.checkpointTriggerX = null;
    this.checkpointDrawPos = null;
    // Plüsch-Verwandlungs-Tracking auf die Startform (klein) zurücksetzen.
    this.plushPrevBig = false;
    this.plushPrevFire = false;
    this.plushSawPanda = false;
    this.plushSawElephant = false;
    if (this.level.checkpoint) {
      const { col, row } = this.level.checkpoint;
      // Spawn-Punkt: zwei Tiles über dem Flaggenfuß (entspricht
      // playerStart-Konvention in jedem Level), so steht der Spieler
      // nach dem Tod direkt auf festem Grund.
      this.checkpointSpawn = {
        x: col * TILE_SIZE,
        y: (row - 2) * TILE_SIZE,
      };
      // Trigger-X: Mitte der Säule. Sobald Spielerin diesen Wert
      // mit dem Body-Center kreuzt, gilt der Checkpoint als aktiviert.
      this.checkpointTriggerX = col * TILE_SIZE + TILE_SIZE / 2;
      // Render-Position: Säule reicht von row-5 bis row (5 Tiles hoch,
      // bewusst kürzer als die Ziel-Flagge so dass beide visuell
      // unterscheidbar sind). Vorher 9 Tiles -> ragte fast bis zum HUD und
      // las sich wie ein senkrechter Balken/Artefakt statt einer Fahne.
      // poleHeight ist die Höhe in Welt-Pixeln.
      const poleTopRow = Math.max(0, row - 5);
      this.checkpointDrawPos = {
        x: col * TILE_SIZE,
        y: poleTopRow * TILE_SIZE,
        poleHeight: (row - poleTopRow) * TILE_SIZE,
      };
    }
    this.timeBonusInitial = 0;
    this.timeBonusRemaining = 0;
    this.timeBonusDrainPerFrame = 0;
    this.timeBonusTickAccum = 0;
    this.levelCompleteFinalized = false;
    this.levelIntroFramesRemaining = LEVEL_INTRO_FRAMES;

    this.coinsThisLevel = 0;
    this.tookHitThisLevel = false;
    // Wunsch: mindestens 2 Super-Kraft-Blöcke pro Level. Fehlende ergänzen,
    // BEVOR die Block-Positions-Sets daraus aufgebaut werden.
    // Ausnahme Plüsch-Traumland (Kinderwelt): keine Super-Sterne — dort machen
    // nur Bonbon (→ Panda) und Feuerblume (→ Elefant) groß, sonst verwirrt es.
    if (this.level.theme !== 'plush') this.ensureMinSuperBlocks(2);
    this.heartBlockPositions = new Set(this.level.heartBlocks || []);
    this.starBlockPositions = new Set(this.level.starBlocks || []);
    this.fireBlockPositions = new Set(this.level.fireBlocks || []);
    this.magnetBlockPositions = new Set(this.level.magnetBlocks || []);
    this.capeBlockPositions = new Set(this.level.capeBlocks || []);
    this.shieldBlockPositions = new Set(this.level.shieldBlocks || []);
    this.clockBlockPositions = new Set(this.level.clockBlocks || []);
    this.superBlockPositions = new Set(this.level.superBlocks || []);
    this.shockwaves = [];
    this.wingFlutters = [];
    this.coinPops = [];

    // QS sanity check: any "*Blocks" declaration that does NOT sit on an
    // actual QUESTION_BLOCK tile is a no-op (the gadget will never spawn).
    // We try a soft auto-correct first (search ±2 tiles for the nearest
    // QUESTION_BLOCK) so the item still appears in production. Whenever
    // we have to remap (or fail), we log AND surface the warning via
    // engine.devBlockWarnings so the React UI can show it in DEV builds.
    this.devBlockWarnings = [];
    const tileLookup = (c: number, r: number): TileType | undefined =>
      this.level.tiles[r]?.[c];
    const findNearestQuestionBlock = (col: number, row: number): string | null => {
      for (let radius = 1; radius <= 2; radius++) {
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
            if (tileLookup(col + dc, row + dr) === TileType.QUESTION_BLOCK) {
              return `${col + dc},${row + dr}`;
            }
          }
        }
      }
      return null;
    };
    const groups: Array<[string, Set<string>]> = [
      ['heartBlocks', this.heartBlockPositions],
      ['starBlocks', this.starBlockPositions],
      ['fireBlocks', this.fireBlockPositions],
      ['magnetBlocks', this.magnetBlockPositions],
      ['capeBlocks', this.capeBlockPositions],
      ['shieldBlocks', this.shieldBlockPositions],
      ['clockBlocks', this.clockBlockPositions],
      ['superBlocks', this.superBlockPositions],
    ];
    for (const [name, set] of groups) {
      const fixes: Array<[string, string]> = [];
      const drops: string[] = [];
      for (const k of set) {
        const [c, r] = k.split(',').map(Number);
        const t = tileLookup(c, r);
        if (t === TileType.QUESTION_BLOCK) continue;
        const fixed = findNearestQuestionBlock(c, r);
        if (fixed) {
          fixes.push([k, fixed]);
          this.devBlockWarnings.push(
            `${name} "${k}" → auto-korrigiert auf "${fixed}" (war Tile ${t}).`,
          );
        } else {
          drops.push(k);
          this.devBlockWarnings.push(
            `${name} "${k}" → KEIN QUESTION_BLOCK in der Nähe (Tile ${t}). Item wird nicht erscheinen.`,
          );
        }
      }
      for (const [from, to] of fixes) { set.delete(from); set.add(to); }
      for (const k of drops) set.delete(k);
    }

    this.setState(GameState.PLAYING);
    // Nach dem State-Event feuern, damit die React-Schicht in einem
    // einzigen Tick beide Updates verarbeitet (PLAYING + neuer Level).
    this.emit('levelStart');
  }

  /**
   * Player-vs-Checkpoint-Test: einmaliger Trigger pro Level. Sobald
   * die Spielfigur die Säule passiert, swap auf "aktiv" inkl. SFX,
   * Partikeln und Floating-Text. Idempotent.
   */
  private checkCheckpointActivation() {
    if (this.checkpointActive) return;
    if (this.checkpointTriggerX === null || !this.checkpointSpawn) return;
    if (this.player.isDead) return;
    const playerCenterX = this.player.x + this.player.width / 2;
    if (playerCenterX < this.checkpointTriggerX) return;
    this.checkpointActive = true;
    audio.playSfx('powerup');
    // Goldsterne rund um die Säule.
    if (this.checkpointDrawPos) {
      const cx = this.checkpointDrawPos.x + 4;
      const cy = this.checkpointDrawPos.y + 8;
      this.spawnStarParticles(cx, cy);
      this.particles.push(
        this.acquireFloatingText(cx, cy - 8, 'Checkpoint!'),
      );
    }
    this.emit('checkpoint');
  }

  private updatePlaying() {
    this.renderer.time++;
    if (this.levelIntroFramesRemaining > 0) this.levelIntroFramesRemaining--;

    if (this.input.pause) {
      this.togglePause();
      return;
    }

    this.time -= 1 / 60;
    if (this.time <= 0) {
      this.playerHit();
      this.time = 0;
    }

    // Tell the player whether it's standing on a one-way platform (and not
    // also on solid ground), so Down+Jump can drop through it.
    {
      const p = this.player;
      const footRow = Math.floor((p.y + p.height + 1) / TILE_SIZE);
      const lc = Math.floor((p.x + 2) / TILE_SIZE);
      const rc = Math.floor((p.x + p.width - 2) / TILE_SIZE);
      let oneWay = false, solid = false;
      for (let c = lc; c <= rc; c++) {
        if (this.physics.isOneWay(c, footRow)) oneWay = true;
        if (this.physics.isSolid(c, footRow)) solid = true;
      }
      p.onOneWayGround = oneWay && !solid;
    }

    // Kletterseil: prüfen, ob ein ROPE-Tile den Körper überlappt (Center-Spalte).
    {
      const p = this.player;
      const col = Math.floor((p.x + p.width / 2) / TILE_SIZE);
      const topRow = Math.floor((p.y + 4) / TILE_SIZE);
      const botRow = Math.floor((p.y + p.height - 4) / TILE_SIZE);
      let onRope = false;
      for (let r = topRow; r <= botRow; r++) {
        if (this.physics.getTile(col, r) === TileType.ROPE) { onRope = true; break; }
      }
      p.onRope = onRope;
      p.ropeCenterX = col * TILE_SIZE + TILE_SIZE / 2;
      if (!onRope) p.isClimbing = false;
    }

    // Schwing-Ringe: aktuelle Ring-Pendelposition + Greif-Erkennung (Luft).
    if (this.level.swingRings && this.level.swingRings.length) {
      const p = this.player;
      const clock = this.levelFrame;
      const ringPos = (i: number) => {
        const ring = this.level.swingRings![i];
        const pivotX = ring.col * TILE_SIZE + TILE_SIZE / 2;
        const pivotY = ring.row * TILE_SIZE;
        const ang = SWING_AMP * Math.sin(clock * SWING_DRIVE + i * 1.3);
        return { x: pivotX + ring.len * Math.sin(ang), y: pivotY + ring.len * Math.cos(ang) };
      };
      p.nearSwingRing = false; p.swingGrabIndex = -1;
      if (p.isSwinging && p.swingRingIndex >= 0) {
        const rp = ringPos(p.swingRingIndex);
        p.swingRingX = rp.x; p.swingRingY = rp.y;
      } else if (!p.onGround && !p.isClimbing) {
        const px = p.x + p.width / 2, py = p.y + 8;
        for (let i = 0; i < this.level.swingRings.length; i++) {
          const rp = ringPos(i);
          if (Math.abs(px - rp.x) < 34 && Math.abs(py - rp.y) < 40) {
            p.nearSwingRing = true; p.swingGrabIndex = i; break;
          }
        }
      }
    }

    // Tarzan-Schwingseile: Seilende-Pendelposition + Greif-Erkennung (Luft).
    if (this.level.swingRopes && this.level.swingRopes.length) {
      const p = this.player;
      const clock = this.levelFrame;
      const ropeEnd = (i: number) => {
        const v = this.level.swingRopes![i];
        const pivotX = v.col * TILE_SIZE + TILE_SIZE / 2;
        const pivotY = v.row * TILE_SIZE;
        const ang = ROPE_SWING_AMP * Math.sin(clock * ROPE_SWING_DRIVE + (v.phase ?? i * 1.1));
        return { x: pivotX + v.len * Math.sin(ang), y: pivotY + v.len * Math.cos(ang) };
      };
      p.nearVine = false; p.vineGrabIndex = -1;
      if (p.isVineSwinging && p.vineIndex >= 0) {
        const rp = ropeEnd(p.vineIndex);
        p.vineX = rp.x; p.vineY = rp.y;
      } else if (!p.onGround && !p.isClimbing) {
        // Greifbar entlang des unteren Seilstücks (großzügige Handgriff-Zone),
        // damit man das schwingende Seil leicht erwischt — Ziel: das nächste
        // Seil im Sprung fangen. Weiter Radius + hohes Fenster (auch im Steigen).
        const px = p.x + p.width / 2, py = p.y + 8;
        for (let i = 0; i < this.level.swingRopes.length; i++) {
          const rp = ropeEnd(i);
          if (Math.abs(px - rp.x) < 55 && py > rp.y - 105 && py < rp.y + 48) {
            p.nearVine = true; p.vineGrabIndex = i; break;
          }
        }
      }
    }

    this.player.handleInput(this.input);
    this.updateGrapple();
    // Time-Attack-Geist: Lauf aufzeichnen (alle 2 Frames → kompakt).
    this.levelFrame++;
    if ((this.levelFrame & 1) === 0) this.ghostRec.push(this.player.x, this.player.y);
    // Ship-it-Dash: Effekt (Staub, heller Whoosh, dezenter Shake) + Label in Welt 13.
    if (this.player.dashTriggered) {
      this.player.dashTriggered = false;
      const px = this.player.x + this.player.width / 2;
      const footY = this.player.y + this.player.height;
      this.spawnDust(px, footY, -this.player.dashDir);
      audio.playSfx('powerup', 0, 1.5);
      this.shakeCamera(2, 5);
      if (this.level.theme === 'bluefield') {
        this.particles.push(this.acquireFloatingText(px, this.player.y - 8, 'SHIP IT!'));
      }
    }
    // Fire-throw: spawn a PlayerFireball if the player just signalled
    // one. Bullet origin is the player's mouth-height in front of them.
    if (this.player.wantsThrowFireball) {
      const dir = this.player.direction;
      const muzzleX = dir === Direction.LEFT
        ? this.player.x - 4
        : this.player.x + this.player.width - 12;
      const muzzleY = this.player.y + this.player.height * 0.45;
      this.entities.push(this.acquirePlayerFireball(muzzleX, muzzleY, dir));
      // Plüsch-Welt: Elefanten-„Platsch" statt normalem Wurf-Ton.
      audio.playSfx(this.level.theme === 'plush' ? 'plushSplash' : 'jump', this.panForWorldX(muzzleX));
    }
    // Superkraft: wipe every killable enemy currently in play, with a big
    // radial shockwave + shake. Triggered one-shot by Player.handleInput.
    if (this.player.superJustTriggered) {
      this.player.superJustTriggered = false;
      const px = this.player.x + this.player.width / 2;
      const footY = this.player.y + this.player.height;
      this.shockwaves.push({ x: px, y: footY, age: 0, max: 30, radius: 340 });
      this.shakeCamera(6, 12);
      audio.playSfx('stomp');
      let killed = 0;
      for (const e of this.entities) {
        if (!e.alive) continue;
        if (isAoeKillable(e)) {
          this.spawnStarParticles(e.x + e.width / 2, e.y + e.height / 2);
          e.alive = false;
          this.player.addScore(SUPER_KILL_SCORE);
          killed++;
        }
      }
      if (killed > 0) {
        this.carryStats.score = this.player.score;
      }
      this.emitEvent('hud');
    }
    this.player.applyGravity();
    this.player.update(1);
    // Warp-Röhren-Teleport: auf einer Pipe-Mündung stehen + "down" drücken
    // teleportiert in die Bonus-Kammer (oder über eine Rück-Röhre zurück).
    // Der Cooldown verhindert sofortiges Re-Warpen direkt am Zielort.
    if (this.warpCooldown > 0) this.warpCooldown--;
    if (this.warpFlash > 0) this.warpFlash--;
    if (this.level?.warpPipes && this.player.onGround && this.input.down && this.warpCooldown <= 0 && Math.abs(this.player.velY) < 1) {
      const footRow = Math.round((this.player.y + this.player.height) / TILE_SIZE);
      const pcol = Math.floor((this.player.x + this.player.width / 2) / TILE_SIZE);
      for (const wp of this.level.warpPipes) {
        if ((pcol === wp.from.col || pcol === wp.from.col + 1) && footRow === wp.from.row) {
          this.player.x = wp.to.x;
          this.player.y = wp.to.y;
          this.player.velX = 0;
          this.player.velY = 0;
          this.warpCooldown = 35;
          this.warpFlash = 14;
          audio.playSfx('powerup');
          this.shakeCamera(2.5, 5);
          // Kamera sofort auf den Zielort schnappen (kein langsames Nachziehen).
          this.camera.follow(this.player.x, this.player.y, 0, 0, true);
          this.camera.x = this.camera.targetX;
          this.camera.y = this.camera.targetY;
          break;
        }
      }
    }
    if (this.player.jumpedThisFrame) {
      audio.playSfx('jump');
      // Game-Feel: kleiner Staub-Puff beim Abdruck vom Boden.
      const fx = this.player.x + this.player.width / 2;
      const fy = this.player.y + this.player.height;
      this.spawnDust(fx, fy, -1);
      this.spawnDust(fx, fy, 1);
    }
    if (this.player.doubleJumpedThisFrame) {
      audio.playSfx('doubleJump');
      const fx = this.player.x + this.player.width / 2;
      const fyMid = this.player.y + this.player.height / 2;
      const fyFoot = this.player.y + this.player.height;
      // Sichtbarer Flügelschlag: Puff-Effekt an den Füßen + Funken + Staub,
      // damit sich der zweite Sprung wie ein echter „Flatter"-Move anfühlt.
      this.wingFlutters.push({ x: fx, y: fyFoot - 6, age: 0, max: 16, dir: this.player.direction >= 0 ? 1 : -1 });
      this.spawnSparks(fx, fyMid);
      this.spawnDust(fx, fyFoot, -1);
      this.spawnDust(fx, fyFoot, 1);
    }
    // Sprungfeder (Note-Block): Sound, Staub-Puff, Pop-Ring und Block-Einsack-
    // Animation im Moment des Absprungs. Das Flag setzt die Physik beim Landen
    // auf einem Note-Block.
    if (this.player.noteBounceThisFrame) {
      audio.playSfx('jump');
      const fx = this.player.x + this.player.width / 2;
      const fy = this.player.y + this.player.height;
      this.spawnDust(fx, fy, -1);
      this.spawnDust(fx, fy, 1);
      this.spawnSparks(fx, fy);
      this.shockwaves.push({ x: fx, y: fy, age: 0, max: 14, radius: 40 });
      this.shakeCamera(3, 6);
      if (this.player.noteBounceCol >= 0) {
        this.noteBounceTimers.set(`${this.player.noteBounceCol},${this.player.noteBounceRow}`, 10);
      }
      // Salto auslösen: eine volle Drehung während der Steigphase.
      this.player.flipSpin = 30;
      this.player.flipTotal = 30;
      this.player.flipDir = this.player.direction >= 0 ? 1 : -1;
      this.player.noteBounceThisFrame = false;
    }
    // Tarzan-Seil-Absprung: „Wusch"-Funken, Staub, dezenter Shake + Seil-Kick.
    if (this.player.vineReleasedThisFrame) {
      audio.playSfx('jump');
      const px = this.player.x + this.player.width / 2;
      const pyC = this.player.y + this.player.height / 2;
      this.spawnSparks(px, pyC);
      this.spawnDust(px, this.player.y + this.player.height, -this.player.vineReleaseDir);
      this.shakeCamera(1.6, 4);
      if (this.player.vineReleasedIndex >= 0) {
        this.vineKickFrame[this.player.vineReleasedIndex] = this.levelFrame;
      }
      this.player.vineReleasedThisFrame = false;
    }
    // Sauberer Kettenschwung (2+ Seile ohne Bodenkontakt): „Jane!"-Jubel.
    if (this.player.vineChainCheerThisFrame) {
      this.particles.push(this.acquireFloatingText(
        this.player.x + this.player.width / 2, this.player.y - 10, 'Jane!', 1.15));
      this.spawnSparks(this.player.x + this.player.width / 2, this.player.y);
      this.crowdExcite = 1;                 // Publikum springt auf (La-Ola)
      this.player.vineChainCheerThisFrame = false;
    }
    // Publikums-Erregung (Turnhallen-Schlucht): klingt ab, springt bei besonderen
    // Momenten hoch — Schwingen in der Schlucht (mild) + Apex-Bonus greifen (stark).
    if (this.crowdExcite > 0) this.crowdExcite = Math.max(0, this.crowdExcite - 0.012);
    {
      const pcol = (this.player.x + this.player.width / 2) / TILE_SIZE;
      const prow = this.player.y / TILE_SIZE;
      if (this.player.isVineSwinging && pcol > 198 && pcol < 219) {
        this.crowdExcite = Math.max(this.crowdExcite, 0.5);
      }
      if (pcol > 203 && pcol < 212 && prow < 5) {   // hoher Apex-Bereich der Schlucht
        this.crowdExcite = Math.max(this.crowdExcite, 0.9);
      }
    }
    // Plüsch-Traumland: Fiona-Verwandlung. Wenn sich der Power-Zustand ändert,
    // ein Verwandlungs-Puff mit Herzchen/Funken + Formname (Affe/Panda/Elefant).
    if (this.level.theme === 'plush') {
      const big = this.player.isPoweredUp, fire = this.player.hasFire;
      if (big !== this.plushPrevBig || fire !== this.plushPrevFire) {
        const px = this.player.x + this.player.width / 2;
        const py = this.player.y + this.player.height / 2;
        const name = fire ? 'Elefant!' : (big ? 'Panda!' : 'Äffchen!');
        this.spawnSparks(px, py);
        this.spawnDust(px, this.player.y + this.player.height, -1);
        this.spawnDust(px, this.player.y + this.player.height, 1);
        this.particles.push(this.acquireFloatingText(px, this.player.y - 6, name, 1.15));
        this.shockwaves.push({ x: px, y: py, age: 0, max: 16, radius: 46 });
        this.shakeCamera(1.4, 4);
        audio.playSfx('plushTransform', this.panForWorldX(px));
      }
      // Zwischenziel: alle drei Formen erlebt (Affe ist die Startform).
      if (big) this.plushSawPanda = true;
      if (fire) this.plushSawElephant = true;
      if (this.plushSawPanda && this.plushSawElephant) this.grantAchievementById('plush_all_forms');
      this.plushPrevBig = big; this.plushPrevFire = fire;
    }
    // Salto herunterzählen; beim Aufsetzen sofort in die Normal-Pose zurück.
    if (this.player.flipSpin > 0) {
      if (this.player.onGround && this.player.flipSpin < this.player.flipTotal) this.player.flipSpin = 0;
      else this.player.flipSpin--;
    }
    // Note-Block-Einsack-Animationen herunterzählen.
    if (this.noteBounceTimers.size > 0) {
      for (const [k, v] of this.noteBounceTimers) {
        if (v <= 1) this.noteBounceTimers.delete(k);
        else this.noteBounceTimers.set(k, v - 1);
      }
    }
    if (this.player.landedThisFrame) {
      audio.playSfx('land');
      // Game-Feel: kick up a dust puff on landing, scaled by impact speed.
      // Tiny hops (peakFallVelY <= 4) stay clean; hard falls puff to both
      // sides for a heavier "thud".
      const impact = this.player.peakFallVelY;
      if (impact > 4) {
        const fx = this.player.x + this.player.width / 2;
        const fy = this.player.y + this.player.height;
        this.spawnDust(fx, fy, -1);
        this.spawnDust(fx, fy, 1);
        if (impact > 8) {
          this.spawnDust(fx, fy, -Math.sign(this.player.velX) || 1);
          this.shakeCamera(1.8, 4);
          this.addImpactZoom(0.028);       // dezenter Punch nur bei harter Landung
        }
      }
    }
    // Mario-feel frame-event SFX + particles. Each event flag is set for
    // exactly one frame by Player.handleInput, then auto-reset next frame.
    if (this.player.skidStartedThisFrame) {
      audio.playSfx('skid');
      // Dust kicks BEHIND the moving direction.
      this.spawnDust(this.player.x + this.player.width / 2, this.player.y + this.player.height, -Math.sign(this.player.velX) || 1);
    }
    if (this.player.slideStartedThisFrame) {
      audio.playSfx('slide');
      this.spawnDust(this.player.x + this.player.width / 2, this.player.y + this.player.height, -Math.sign(this.player.velX) || 1);
    }
    if (this.player.wallSlideStartedThisFrame) {
      audio.playSfx('wallSlide');
    }
    if (this.player.wallJumpedThisFrame) {
      // Push-off pop: reuse the base jump SFX so the wall-jump still feels
      // like a jump, but layer some dust on the wall for visual feedback.
      audio.playSfx('jump');
      this.spawnDust(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, this.player.velX > 0 ? 1 : -1);
      this.grantAchievement('wall_jumper');
    }
    if (this.player.pChargeJustReadyThisFrame) {
      audio.playSfx('pCharge');
      this.grantAchievement('p_runner');
    }
    if (this.player.groundPoundJustStartedThisFrame) {
      audio.playSfx('skid');
    }
    if (this.player.groundPoundLandedThisFrame) {
      this.triggerHitStop(3);
      this.addImpactZoom(0.06);          // wuchtiger Stampfer-Punch
      this.triggerGroundPoundShockwave();
    }
    // While the slide is active, drip a continuous trail (every 4 frames).
    if (this.player.isSliding && this.renderer.time % 4 === 0) {
      this.spawnDust(this.player.x + this.player.width / 2, this.player.y + this.player.height, -Math.sign(this.player.velX) || 1);
    }
    // While wall-sliding, drip occasional sparks at the wall contact line.
    if (this.player.isWallSliding && this.renderer.time % 6 === 0) {
      const sx = this.player.wallContactDir === 1
        ? this.player.x + this.player.width
        : this.player.x;
      this.spawnDust(sx, this.player.y + this.player.height * 0.6, this.player.wallContactDir === 1 ? 1 : -1);
    }
    // While the P-meter is charged AND the player is on the ground, emit
    // periodic gold sparks under the feet so the buff is visible.
    if (this.player.isPCharged && this.player.onGround && this.renderer.time % 4 === 0) {
      this.spawnSparks(this.player.x + this.player.width / 2, this.player.y + this.player.height);
    }
    // Feinschliff: kontinuierlicher Sprint-Staub-Trail hinter den Füßen — nur
    // beim echten Rennen (nicht Gehen/Bremsen/Rutschen/Ducken) und deutlich über
    // Gehtempo. Kleine, flache Wölkchen alle 6 Frames erden den schnellen Lauf.
    if (this.player.isRunning && this.player.onGround
        && !this.player.isSkidding && !this.player.isSliding && !this.player.isDucking
        && Math.abs(this.player.velX) > PLAYER_SPEED + 1
        && this.renderer.time % 6 === 0) {
      this.spawnRunDust(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height,
        -Math.sign(this.player.velX) || 1,
      );
    }

    // Game-Feel: Beim Sprinten am Boden alle paar Frames eine kleine Staubwolke
    // hinter den Füßen aufwirbeln (entgegen der Laufrichtung), damit Tempo
    // sichtbar wird. Schwelle deutlich über Gehgeschwindigkeit (3.5), damit
    // normales Gehen sauber bleibt.
    if (this.player.onGround && Math.abs(this.player.velX) > 6 && this.renderer.time % 6 === 0) {
      const fx = this.player.x + this.player.width / 2;
      const fy = this.player.y + this.player.height;
      this.spawnDust(fx, fy, -Math.sign(this.player.velX) || 1);
    }

    if (!this.player.isDead) {
      // If player wants to un-duck, only allow it if there's headroom.
      if (this.player.wantsUnduck && this.player.isDucking) {
        const newH = this.player.isPoweredUp ? 80 : this.player.normalHeight;
        const newY = this.player.y - (newH - this.player.height);
        if (this.physics.canFitAt(this.player.x, newY, this.player.width, newH)) {
          this.player.performUnduck();
        }
      }

      const playerResult = this.physics.moveEntity(this.player);
      this.player.onIce = playerResult.onIce;
      // Wall-slide / wall-jump need to know which side the player is in
      // contact with on THIS frame. Physics returns -1/0/+1; we hand it
      // straight to the player so handleInput on the next tick can decide
      // whether to grip the wall.
      this.player.wallContactDir = playerResult.wallDir;

      if (playerResult.hitCeiling) {
        const headRow = Math.floor((this.player.y - 1) / TILE_SIZE);
        const centerCol = Math.floor((this.player.x + this.player.width / 2) / TILE_SIZE);
        // Mehr Toleranz beim Block-Anstoß: die Figur muss nicht mehr exakt
        // mittig unter dem Block stehen. Zuerst die Mittelspalte prüfen (wie
        // bisher); trifft die keinen anstoßbaren Block, den nächstgelegenen
        // ?-/Ziegel-Block im vom Kopf überdeckten Bereich anstoßen.
        const isHittable = (c: number) => {
          const t = this.physics.getTile(c, headRow);
          return t === TileType.QUESTION_BLOCK || t === TileType.BRICK;
        };
        let hitCol = centerCol;
        if (!isHittable(centerCol)) {
          const leftCol = Math.floor((this.player.x + 3) / TILE_SIZE);
          const rightCol = Math.floor((this.player.x + this.player.width - 3) / TILE_SIZE);
          let best = -1, bestDist = 99;
          for (let c = leftCol; c <= rightCol; c++) {
            if (c === centerCol || !isHittable(c)) continue;
            const d = Math.abs(c - centerCol);
            if (d < bestDist) { bestDist = d; best = c; }
          }
          if (best >= 0) hitCol = best;
        }
        this.hitBlock(hitCol, headRow);
      }

      if (this.physics.intersectsHazard(this.player)) {
        this.playerHit();
      }

      if (this.player.y > this.level.height * TILE_SIZE + 100 && !this.player.isDead) {
        this.player.isPoweredUp = false;
        if (getSettings().assistInvincible) {
          // Paket 3 · Fairness: Im Assist-Modus ist ein Aus-der-Welt-Sturz
          // kein Sofort-Tod mehr, sondern eine sanfte Rettung zurück zum
          // Checkpoint — ohne Leben-Verlust. (Ohne diese Sonderbehandlung
          // würde der Unverwundbar-Treffer den Sturz ignorieren und die
          // Figur endlos weiterfallen.)
          this.softRescue();
        } else {
          // Falling out of the world is unconditional death (no powerup-shrink rescue).
          this.playerHit();
        }
      }

      // Speed-Zoom vor dem Kamera-Follow aktualisieren (passt Viewport an).
      this.updateSpeedZoom();
      this.camera.follow(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        this.player.velX,
        this.player.velY,
        this.player.onGround,
      );

      this.checkEntityCollisions();
      this.checkCheckpointActivation();
      this.checkFlagCollision();
      this.checkBossGate();
    }

    if (this.player.isDead && this.player.deathTimer > 90) {
      this.player.lives--;
      this.carryStats.lives = this.player.lives;
      if (this.player.lives <= 0) {
        audio.stopMusic();
        // Defensive: a pending fanfare from a recent flag-touch must not
        // fire on top of the game-over jingle. cancelFanfare is a no-op
        // when nothing is scheduled.
        this.cancelFanfare();
        audio.playSfx('gameOver');
        this.setState(GameState.GAME_OVER);
      } else {
        this.respawnPlayer();
      }
    }

    stepEntities(this);

    // Bewegliche Plattformen: Carry. Die Spielerin wird nur dann von einer
    // Plattform getragen, wenn sie von oben auf deren Oberkante trifft UND
    // direkt darunter KEIN fester Boden liegt (also über einer echten Lücke).
    // Steht fester Boden darunter (Pendel-Enden über Land), trägt der Tile-
    // Boden — so kann die Figur nie über festem Grund in der Luft hängen.
    for (const e of this.entities) {
      if (!(e instanceof MovingPlatform)) continue;
      const p = this.player;
      const pFeet = p.y + p.height;
      const overlapX = p.x + p.width > e.x + 3 && p.x < e.x + e.width - 3;
      const nearTop = pFeet >= e.y - 6 && pFeet <= e.y + e.height + Math.max(2, p.velY);
      if (!overlapX || !nearTop || p.velY < -0.5) continue;
      // Fester Boden am Boden-Niveau unter den Füßen? Dann normal stehen,
      // kein Carry (verhindert Schweben über festem Land an den Pendel-Enden).
      const groundRow = groundRowOf(this.level);
      const cMid = Math.floor((p.x + p.width / 2) / TILE_SIZE);
      const solidBelow = this.physics.isSolid(cMid, groundRow);
      if (solidBelow) continue;
      p.y = e.y - p.height;
      p.velY = 0;
      p.onGround = true;
      p.x += e.deltaX;
      p.y += e.deltaY;
    }

    // Sprungfeder: landet die Spielerin von oben auf der Feder (fallend), wird
    // sie hoch katapultiert. Umwelt-Interaktion — erreicht sonst unerreichbare
    // Bereiche. Kurzes noJumpCut-Fenster erhält die volle Höhe auch ohne Halten.
    for (const e of this.entities) {
      if (!(e instanceof Spring) || e.cooldown > 0) continue;
      const p = this.player;
      const pFeet = p.y + p.height;
      const overlapX = p.x + p.width > e.x + 2 && p.x < e.x + e.width - 2;
      const nearTop = pFeet >= e.y - 4 && pFeet <= e.y + e.height + Math.max(3, p.velY);
      if (!overlapX || !nearTop || p.velY < -0.5) continue;
      p.y = e.y - p.height;
      p.velY = SPRING_FORCE;
      p.onGround = false;
      p.isGroundPounding = false;
      p.isJumping = true;
      p.canDoubleJump = true;
      p.hasDoubleJumped = false;
      p.noJumpCutTimer = 10;
      e.trigger();
      const pan = Math.max(-1, Math.min(1, (e.x + e.width / 2 - (this.camera.x + CANVAS_WIDTH / 2)) / (CANVAS_WIDTH / 2)));
      audio.playSfx('bounceBoost', pan);
      this.spawnSpringParticles(e);
    }

    // Kisten: Draufstehen (oben) · Kopfstoß (unten) · Schieben/Blockieren
    // (seitlich) · Zerstören per Bodenstampfer. Position-basiert und robust.
    for (const e of this.entities) {
      if (!(e instanceof Crate) || !e.alive) continue;
      const p = this.player;
      if (!p.intersects(e)) continue;
      const overlapX = Math.min(p.x + p.width, e.x + e.width) - Math.max(p.x, e.x);
      const overlapY = Math.min(p.y + p.height, e.y + e.height) - Math.max(p.y, e.y);
      const pcy = p.y + p.height / 2, ccy = e.y + e.height / 2;
      const pcx = p.x + p.width / 2, ccx = e.x + e.width / 2;
      if (overlapY <= overlapX) {
        if (pcy < ccy) {
          // Spielerin über der Kiste: Bodenstampfer zerstört, sonst draufstehen.
          if (p.isGroundPounding) { this.destroyCrate(e); continue; }
          p.y = e.y - p.height;
          if (p.velY > 0) p.velY = 0;
          p.onGround = true;
        } else {
          // Kopfstoß von unten.
          p.y = e.y + e.height;
          if (p.velY < 0) p.velY = 0;
        }
      } else {
        // Seitlich: Kiste wegschieben, falls Platz; sonst Spielerin blockieren.
        const pushDir = ccx >= pcx ? 1 : -1;
        const newX = e.x + pushDir * overlapX;
        if (this.crateCanOccupy(e, newX, e.y)) {
          e.x = newX;
          e.velX = 0;
        }
        p.x = pushDir > 0 ? e.x - p.width : e.x + e.width;
        if ((pushDir > 0 && p.velX > 0) || (pushDir < 0 && p.velX < 0)) p.velX = 0;
      }
    }

    // Schalter → Tür (Welt 13, MatchSuite): betritt die Spielerin den Schalter,
    // öffnen sich alle Türen derselben Gruppe (begehbare Produkt-Botschaft:
    // „Profil trifft Projekt → der Weg öffnet sich").
    for (const e of this.entities) {
      if (!(e instanceof Switch) || e.pressed || !e.alive) continue;
      if (!this.player.intersects(e)) continue;
      e.pressed = true;
      const pan = Math.max(-1, Math.min(1, (e.x + e.width / 2 - (this.camera.x + CANVAS_WIDTH / 2)) / (CANVAS_WIDTH / 2)));
      audio.playSfx('powerup', pan);
      this.particles.push(this.acquireFloatingText(e.x + e.width / 2, e.y - 6, 'Match!'));
      for (const d of this.entities) {
        if (d instanceof Door && d.group === e.group && !d.open) {
          d.open = true;
          for (let i = 0; i < 12; i++) {
            const ang = (Math.PI * 2 * i) / 12;
            this.particles.push(this.acquireParticle(
              d.x + d.width / 2, d.y + d.height / 2,
              Math.cos(ang) * 2.5, Math.sin(ang) * 2.5, '#7cc0ff', 3, 24,
            ));
          }
        }
      }
    }

    // Türen: solide Wand, solange geschlossen (Draufstehen/Seiten-Block/Kopfstoß).
    for (const e of this.entities) {
      if (!(e instanceof Door) || !e.doorSolid) continue;
      const p = this.player;
      if (!p.intersects(e)) continue;
      const overlapX = Math.min(p.x + p.width, e.x + e.width) - Math.max(p.x, e.x);
      const overlapY = Math.min(p.y + p.height, e.y + e.height) - Math.max(p.y, e.y);
      const pcy = p.y + p.height / 2, ccy = e.y + e.height / 2;
      const pcx = p.x + p.width / 2, ccx = e.x + e.width / 2;
      if (overlapY <= overlapX) {
        if (pcy < ccy) { p.y = e.y - p.height; if (p.velY > 0) p.velY = 0; p.onGround = true; }
        else { p.y = e.y + e.height; if (p.velY < 0) p.velY = 0; }
      } else {
        if (pcx < ccx) { p.x = e.x - p.width; if (p.velX > 0) p.velX = 0; }
        else { p.x = e.x + e.width; if (p.velX < 0) p.velX = 0; }
      }
    }

    // Feuer-Barrieren: reine solide WAND (horizontaler Block), solange nicht
    // verbrannt. Nur ein Feuerball der Spielerin brennt sie weg (Power-Up
    // „Feuerblume" wird zur Voraussetzung). Bewusst rein horizontal aufgelöst:
    // die Barriere sitzt auf einer Plattform mit Dach darüber, die Figur nähert
    // sich immer seitlich — so kann sie nicht fälschlich obendrauf „klettern".
    for (const e of this.entities) {
      if (!(e instanceof FireBarrier) || !e.solid) continue;
      const p = this.player;
      if (!p.intersects(e)) continue;
      const pcx = p.x + p.width / 2, ccx = e.x + e.width / 2;
      if (pcx < ccx) { p.x = e.x - p.width; if (p.velX > 0) p.velX = 0; }
      else { p.x = e.x + e.width; if (p.velX < 0) p.velX = 0; }
    }

    // Feuerball ↔ Feuer-Barriere: der Ball entzündet die Ranke und zerschellt.
    for (const fbAny of this.entities) {
      if (!(fbAny instanceof PlayerFireball) || !fbAny.alive) continue;
      for (const bAny of this.entities) {
        if (!(bAny instanceof FireBarrier) || !bAny.solid) continue;
        if (!fbAny.intersects(bAny)) continue;
        fbAny.alive = false;
        this.burnFireBarrier(bAny);
        break;
      }
    }
  }

  /** Verbrennt eine Feuer-Barriere: Flammen-/Funken-Partikel, Sound, Münz-Belohnung. */
  private burnFireBarrier(e: FireBarrier) {
    e.alive = false;
    const cx = e.x + e.width / 2, cy = e.y + e.height / 2;
    for (let i = 0; i < 18; i++) {
      const ang = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.5;
      const spd = 1.5 + Math.random() * 3;
      this.particles.push(this.acquireParticle(
        cx, cy + (Math.random() - 0.5) * e.height, Math.cos(ang) * spd, Math.sin(ang) * spd - 1.2,
        i % 2 === 0 ? '#ff8c28' : '#ffd85a', 3 + Math.round(Math.random() * 2), 24,
      ));
    }
    audio.playSfx('blockHit');
    this.emit('hud');
  }

  /** Prüft, ob die Kiste an (x,y) frei steht (keine soliden Tiles, keine andere Kiste). */
  private crateCanOccupy(crate: Crate, x: number, y: number): boolean {
    const c0 = Math.floor(x / TILE_SIZE), c1 = Math.floor((x + crate.width - 1) / TILE_SIZE);
    const r0 = Math.floor(y / TILE_SIZE), r1 = Math.floor((y + crate.height - 1) / TILE_SIZE);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
      if (this.physics.isSolid(c, r)) return false;
    }
    for (const o of this.entities) {
      if (o === crate || !(o instanceof Crate) || !o.alive) continue;
      if (x < o.x + o.width && x + crate.width > o.x && y < o.y + o.height && y + crate.height > o.y) return false;
    }
    return true;
  }

  /** Zerstört eine Kiste (Bodenstampfer): Holz-Splitter, Sound, kleiner Rückprall. */
  private destroyCrate(e: Crate) {
    e.alive = false;
    const cx = e.x + e.width / 2, cy = e.y + e.height / 2;
    for (let i = 0; i < 12; i++) {
      const ang = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.4;
      const spd = 2 + Math.random() * 2.5;
      this.particles.push(this.acquireParticle(
        cx, cy, Math.cos(ang) * spd, Math.sin(ang) * spd - 1.5,
        i % 2 === 0 ? '#a9713b' : '#7d4f29', 3 + Math.round(Math.random() * 2), 26,
      ));
    }
    const pan = Math.max(-1, Math.min(1, (cx - (this.camera.x + CANVAS_WIDTH / 2)) / (CANVAS_WIDTH / 2)));
    audio.playSfx('brickBreak', pan);
    // Belohnung: eine Münze (wie beim Frage-Block) — mehr Anreiz zum Zerstören.
    this.entities.push(new SpinningCoin(cx - 8, e.y - TILE_SIZE));
    this.player.addCoin();
    this.player.addScore(BLOCK_COIN_VALUE);
    this.carryStats.coins = this.player.coins;
    this.carryStats.score = this.player.score;
    this.particles.push(this.acquireFloatingText(cx, e.y - TILE_SIZE, `+${BLOCK_COIN_VALUE}`));
    audio.playSfx('coin', pan);
    // Kleiner Rückprall nach dem Stampfer (belohnend, wie beim Block).
    this.player.isGroundPounding = false;
    this.player.velY = -6;
  }

  /** Kleine Staub-/Funken-Wolke beim Auslösen der Sprungfeder. */
  private spawnSpringParticles(e: Spring) {
    for (let i = 0; i < 8; i++) {
      const ang = Math.PI + (Math.random() - 0.5) * 1.6;
      const spd = 1.5 + Math.random() * 2;
      this.particles.push(this.acquireParticle(
        e.x + e.width / 2, e.y,
        Math.cos(ang) * spd, Math.sin(ang) * spd - 1,
        i % 2 === 0 ? '#ffe08a' : '#fff4c2', 3, 22,
      ));
    }
  }

  /**
   * Generic exemption list for the off-screen cleanup pass. Persistent
   * collectibles + active power-up drops + stationary enemies (Piranha,
   * Wizard) must survive going off-camera so the player can still
   * encounter them on the way back. Mobile enemies (including Ghosts)
   * are NOT exempt and disappear once they drift sufficiently far off-
   * screen, per the generic off-screen-cleanup requirement.
   */
  isCullExempt(e: Entity): boolean { return isCullExempt(e); }

  isHeartBlock(col: number, row: number): boolean {
    return this.heartBlockPositions.has(`${col},${row}`);
  }
  isStarBlock(col: number, row: number): boolean {
    return this.starBlockPositions.has(`${col},${row}`);
  }
  isFireBlock(col: number, row: number) {
    return this.fireBlockPositions.has(`${col},${row}`);
  }
  isMagnetBlock(col: number, row: number) {
    return this.magnetBlockPositions.has(`${col},${row}`);
  }
  isCapeBlock(col: number, row: number) {
    return this.capeBlockPositions.has(`${col},${row}`);
  }
  isShieldBlock(col: number, row: number) {
    return this.shieldBlockPositions.has(`${col},${row}`);
  }
  isClockBlock(col: number, row: number) {
    return this.clockBlockPositions.has(`${col},${row}`);
  }

  isSuperBlock(col: number, row: number) {
    return this.superBlockPositions.has(`${col},${row}`);
  }

  // True if the time-stop clock is currently freezing every freezable
  // enemy (and their projectiles). Centralised so update + render can
  // both branch on it consistently. Public so engine_internal/* can read.
  get clockFrozen(): boolean {
    return this.player.slowTimer > 0;
  }

  isFreezableEnemy(e: Entity): boolean { return isFreezableEnemy(e); }

  hitBlock(col: number, row: number) { hitBlockAt(this, col, row); }

  playerHit() { collidePlayerHit(this); }

  tryStarKill(entity: Entity): boolean { return collideTryStarKill(this, entity); }

  checkEntityCollisions() { runEntityCollisions(this); }

  checkShellCollisions(shell: Koopa) { runShellCollisions(this, shell); }

  checkFlagCollision() { runFlagCollision(this); }

  /** Greifhaken (Stufe 2 — Schwung): einhaken an einem festen Block; solange
   *  die Taste gehalten wird, schwingt der Spieler am steifen Seil (Gravitation
   *  aus handleInput bleibt, nur die radiale Komponente wird entfernt + Länge
   *  gehalten; Links/Rechts pumpt tangential). Loslassen behält den Schwung
   *  (tangentiales Wegfliegen). Auto-Release nach Timeout. */
  private updateGrapple() {
    const p = this.player;
    if (!p || p.isDead) { if (p) p.grappleActive = false; return; }
    if (this.input.grapplePressed && !p.grappleActive && p.dashTimer <= 0) {
      const cx = p.x + p.width / 2, cy = p.y + p.height / 2;
      const dir = p.direction < 0 ? -1 : 1;
      const dx = dir * GRAPPLE_DIR_X, dy = GRAPPLE_DIR_Y;
      const len = Math.hypot(dx, dy), nx = dx / len, ny = dy / len;
      const maxDist = GRAPPLE_RANGE * TILE_SIZE;
      let hit = false, hx = cx, hy = cy;
      for (let d = TILE_SIZE * 0.5; d <= maxDist; d += 5) {
        const px = cx + nx * d, py = cy + ny * d;
        if (this.physics.isSolid(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE))) {
          hit = true; hx = px; hy = py; break;
        }
      }
      if (hit) {
        p.grappleActive = true;
        p.grappleX = hx; p.grappleY = hy; p.grappleAnim = 0;
        p.grappleRopeLen = Math.max(TILE_SIZE, Math.hypot(cx - hx, cy - hy));
        this.shakeCamera(2, 6);
        audio.playSfx('jump', this.panForWorldX(cx), 1.4);
      }
    }
    if (p.grappleActive) {
      p.grappleAnim++;
      // Loslassen (Taste los) oder Auto-Release → Schwung behalten.
      if (!this.input.grappleHeld || p.grappleAnim > 260) {
        p.grappleActive = false;
        return;
      }
      const cx = p.x + p.width / 2, cy = p.y + p.height / 2;
      const dx = cx - p.grappleX, dy = cy - p.grappleY;
      const dist = Math.hypot(dx, dy) || 1;
      const rvx = dx / dist, rvy = dy / dist; // radial: Anker → Spieler
      // Steifes Seil: radiale (vom Anker weg gerichtete) Geschwindigkeit kappen.
      const radialVel = p.velX * rvx + p.velY * rvy;
      if (radialVel > 0) { p.velX -= radialVel * rvx; p.velY -= radialVel * rvy; }
      // Längen-Constraint: über Seil-Länge → sanft auf den Kreis zurückziehen.
      if (dist > p.grappleRopeLen) {
        const corr = (dist - p.grappleRopeLen) * 0.25;
        p.velX -= rvx * corr; p.velY -= rvy * corr;
      }
      p.velX *= 0.996; p.velY *= 0.996; // minimale Dämpfung
    }
  }

  /** Boss-Arena: Sobald kein Boss mehr lebt, verschwindet die Barriere-Säule
   *  vor der Flagge (Tiles → EMPTY) mit Shake/Partikeln/„ZUGANG FREI!". */
  private checkBossGate() {
    const gate = this.level.bossGate;
    if (!gate) { this.renderer.bossGateActive = false; return; }
    this.renderer.bossGateCol = gate.col;
    this.renderer.bossGateTop = gate.rowTop;
    if (this.bossGateOpened) { this.renderer.bossGateActive = false; return; }
    const bossAlive = this.entities.some(e => e instanceof Boss && !e.isDead && e.alive);
    if (bossAlive) { this.renderer.bossGateActive = true; return; }
    // Boss besiegt → Barriere entfernen
    this.bossGateOpened = true;
    this.renderer.bossGateActive = false;
    for (let r = gate.rowTop; r <= gate.rowBottom; r++) {
      if (this.level.tiles[r]) this.level.tiles[r][gate.col] = TileType.EMPTY;
    }
    const gx = (gate.col + 0.5) * TILE_SIZE;
    const gy = (gate.rowBottom + 0.5) * TILE_SIZE;
    this.shakeCamera(6, 16);
    this.spawnStompParticles(gx, gy);
    this.acquireFloatingText(gx - 24, gy - 44, 'ZUGANG FREI!', 1.2);
  }

  /**
   * Paket 3 · Sanfte Rettung (nur Assist-Modus): setzt die Figur ohne Tod
   * und ohne Leben-Verlust an den letzten Checkpoint (bzw. Levelstart)
   * zurück. Für Aus-der-Welt-Stürze, damit ein sehr kleines Kind nicht durch
   * einen Fehltritt einen ganzen Versuch verliert.
   */
  private softRescue() {
    const spawn = this.checkpointActive && this.checkpointSpawn
      ? this.checkpointSpawn
      : this.level.playerStart;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.velX = 0;
    this.player.velY = 0;
    this.player.isJumping = false;
    this.player.invincibleTimer = Math.max(this.player.invincibleTimer, 60);
    this.spawnHeartParticles(spawn.x + this.player.width / 2, spawn.y + this.player.height / 2);
    audio.playSfx('powerup');
    this.emitEvent('hud');
  }

  private respawnPlayer() {
    // Spielbarkeit: wenn der Spieler den Mid-Level-Checkpoint passiert
    // hat, respawnen wir dort statt ganz am Anfang. Das gilt nur
    // innerhalb des laufenden Versuchs (Game-Over / Restart resetten
    // den Checkpoint via startLevel()).
    const spawn = this.checkpointActive && this.checkpointSpawn
      ? this.checkpointSpawn
      : this.level.playerStart;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.velX = 0;
    this.player.velY = 0;
    this.player.isDead = false;
    this.player.invincibleTimer = 120;
    this.player.isJumping = false;
    this.player.deathTimer = 0;
    // Bugfix: Beim Tod (klein) wird die Musik gestoppt und das Todes-Jingle
    // gespielt. Beim Wiedereinstieg (noch Leben übrig) muss die Level-Musik
    // wieder anlaufen — sonst bleibt der Rest des Versuchs stumm.
    audio.startMusic(this.level.theme);
  }

  /**
   * Ground-pound landing impact: spawn a visible ring shockwave, kill
   * any stompable enemy in radius (with stomp-combo scoring), break any
   * BRICK tile within reach, and shake the camera.
   */
  triggerGroundPoundShockwave() { runGroundPoundShockwave(this); }

  // Detonate a Bomb-Omb: removes the bomb, spawns a BombExplosion sphere
  // (drawn + ticked as a regular entity), kills nearby enemies, breaks
  // adjacent BRICKS and shakes the camera. The explosion entity itself
  // handles per-frame contact damage to the player.
  detonateBomb(bomb: BombOmb) { runBombDetonation(this, bomb); }

  playerBounceFromStomp(): boolean { return collidePlayerBounceFromStomp(this); }

  applyStompCombo(baseScore: number, entity: Entity): number {
    return collideApplyStompCombo(this, baseScore, entity);
  }

  isStompHit(entity: Entity): boolean { return collideIsStompHit(this, entity); }

  private render() {
    beginGlowFrame(18); // W2.1-Perf: max. 18 Glow-Stempel pro Bild
    runRender(this);
    // Globaler weicher Bildabschluss: eine dezente Vignette rahmt die Ränder
    // sanft und gibt dem ganzen Spiel einen weicheren, cinematischen Look.
    // Nicht im Titelbild (dort hat runRender bereits früh zurückgegeben).
    if (this.state !== GameState.TITLE) {
      const ctx = this.renderer.ctx;
      const W = this.renderer.viewportW, H = this.renderer.viewportH;
      ctx.setTransform(this.renderScaleX, 0, 0, this.renderScaleY, 0, 0);
      // W1.6 · statische Lichtstimmung: gecachter gerichteter Verlauf (oben
      // weich heller, unten dezentes Volumen) → Tiefe. Kein Per-Frame-Gradient.
      const lkey = `${W}x${H}`;
      if (!this.lightGrad || this.lightGradKey !== lkey) {
        const lg = ctx.createLinearGradient(0, 0, 0, H);
        lg.addColorStop(0, 'rgba(255,250,235,0.06)');
        lg.addColorStop(0.5, 'rgba(255,255,255,0)');
        lg.addColorStop(1, 'rgba(10,14,30,0.09)');
        this.lightGrad = lg;
        this.lightGradKey = lkey;
      }
      ctx.fillStyle = this.lightGrad;
      ctx.fillRect(0, 0, W, H);
      // (W2.3 globaler Dunst entfernt — das Spiel hat bereits drawAerialHaze,
      // eine bessere theme-spezifische atmosphärische Perspektive pro Welt.)
      // Grafik-Feinschliff: die zweite, neutrale Per-Frame-Vignette wurde
      // entfernt — drawSceneGrade backt bereits eine theme-getönte Vignette pro
      // Viewport. Zwei gestapelte Vignetten drückten die Ecken zu dunkel und
      // kosteten eine Gradient-Allokation/Frame. Jetzt saubere Ecken + kein Alloc.
      // W1.4 · Welten-Farb-Grading: dezenter Farbstich pro Welt (multiply mit
      // hellem Tint → verschiebt die Farbtemperatur, verdunkelt kaum). Ein
      // einfaches Overlay, KEIN Self-Draw (Safari-sicher).
      const grade = WORLD_GRADE[this.renderer.currentTheme as keyof typeof WORLD_GRADE];
      if (grade) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(${grade.r},${grade.g},${grade.b},${grade.a})`;
        ctx.fillRect(0, 0, W, H);
        if (grade.ov) {
          // Kontrast-/Sättigungs-Pass (overlay): verstärkt Mitteltöne & Tiefe.
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = `rgba(${grade.ov.r},${grade.ov.g},${grade.ov.b},${grade.ov.a})`;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
      }
      // W1.5 · Grain/Dither: dezentes Filmkorn gegen Banding (nicht auf 'low').
      if (this.effectiveQuality !== 'low') {
        const pat = getNoisePattern(ctx);
        if (pat) {
          ctx.save();
          ctx.globalCompositeOperation = 'overlay';
          ctx.globalAlpha = 0.035;
          ctx.fillStyle = pat;
          // Grafik-Feinschliff: das Korn pro Frame um einen zufälligen Betrag
          // (< Kachelgröße 128) verschieben. Statisches Korn dithert Banding in
          // Bewegung NICHT (Muster bewegt sich nicht relativ zum Verlauf) und
          // wirkt wie Schmutz auf der Scheibe; bewegtes Korn ist echtes Filmkorn
          // und unterdrückt Himmel-/Vignetten-Banding sichtbar. Overfill per
          // Versatz, damit keine Kante frei bleibt.
          const jx = Math.floor(Math.random() * 128);
          const jy = Math.floor(Math.random() * 128);
          ctx.translate(-jx, -jy);
          ctx.fillRect(jx, jy, W, H);
          ctx.restore();
        }
      }
    }
    // Spike / Gate G2: optionaler WebGL-Bloom-Post-Pass über das fertige
    // 2D-Bild. Nur aktiv, wenn eingeschaltet UND WebGL2 verfügbar.
    if (this.postEnabled && this.post && this.post.available) {
      this.post.render(this.canvas);
    }
  }

  // --- WebGL-Post-Pass (Spike, Roadmap Punkt 4) ----------------------------
  post: WebGLPostProcessor | null = null;
  /** W-TimeAttack: Positions-Aufzeichnung des aktuellen Laufs (flach x,y je
   *  GHOST_STEP Frames), geladener Geist der Bestzeit, Frame-Zähler seit Start. */
  levelFrame = 0;
  private ghostRec: number[] = [];
  ghostPlay: number[] | null = null;
  private postEnabled = false;
  /** W1.6: gecachter gerichteter Licht-Gradient (nur bei Viewport-Änderung neu). */
  private lightGrad: CanvasGradient | null = null;
  private lightGradKey = '';

  private currentDpr(displayW = this.lastDisplayW, displayH = this.lastDisplayH): number {
    const dprCap = this.effectiveQuality === 'low' ? 1 : this.effectiveQuality === 'mid' ? 1.5 : 2;
    const rawDpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    let dpr = Math.min(rawDpr, dprCap);
    // Füllraten-Deckel: das Backing-Canvas nie über ein Pixel-Budget wachsen
    // lassen. Auf großen, hochauflösenden Bildschirmen (iPad: Display × DPR =
    // 3–5 Megapixel) killt die reine Füllrate die FPS — obwohl das iPhone mit
    // ~1,3 MP flüssig läuft. Der Deckel bindet die Kosten an ein festes Budget
    // je Grafikstufe (Canvas wird per CSS auf Displaygröße hochskaliert).
    const budget = this.effectiveQuality === 'low' ? 1.05e6 : this.effectiveQuality === 'mid' ? 1.6e6 : 2.2e6;
    if (displayW && displayH) {
      const maxDpr = Math.sqrt(budget / (displayW * displayH));
      if (maxDpr < dpr) dpr = maxDpr;
    }
    return dpr;
  }

  /** Bindet das WebGL-Overlay-Canvas (einmalig, lazy). Schlägt der WebGL2-
   *  Kontext fehl, bleibt `post.available=false` und alles läuft 2D weiter. */
  attachPostCanvas(glCanvas: HTMLCanvasElement) {
    if (this.post) return;
    this.post = new WebGLPostProcessor(glCanvas);
    if (this.post.available && this.lastDisplayW && this.lastDisplayH) {
      this.post.resize(this.lastDisplayW, this.lastDisplayH, this.currentDpr());
    }
  }

  /** Schaltet den Post-Pass an/aus. Gibt zurück, ob er tatsächlich aktiv ist
   *  (false, wenn WebGL2 fehlt → der Aufrufer kann das UI darauf einstellen). */
  setPostEnabled(on: boolean): boolean {
    this.postEnabled = on && !!this.post && this.post.available;
    if (this.postEnabled && this.post && this.lastDisplayW && this.lastDisplayH) {
      this.post.resize(this.lastDisplayW, this.lastDisplayH, this.currentDpr());
    }
    return this.postEnabled;
  }

  isPostActive(): boolean { return this.postEnabled; }

  /** AP 1.9: Stereo-Pan (-0.7..0.7) für ein Ereignis an Welt-X-Position,
   *  abgeleitet aus der Bildschirmposition relativ zur Kamera. Sanft
   *  ausgesteuert (Faktor 0.7), damit nichts hart nach außen springt. */
  panForWorldX(worldX: number): number {
    const vw = this.renderer.viewportW || 1;
    const rel = (worldX - this.camera.x) / vw;
    return Math.max(-1, Math.min(1, (rel - 0.5) * 2)) * 0.7;
  }

  resize(containerWidth: number, containerHeight: number) {
    // Fill-width strategy with zoom: we shrink the logical view height
    // BELOW CANVAS_HEIGHT (ZOOM > 1 → camera shows fewer world pixels →
    // everything looks larger / "closer"), then derive a logical WIDTH from
    // the container aspect so wide screens still fill edge-to-edge.
    // Zoom in more on touch devices — small phone screens need the closer
    // view; desktop keeps a slightly wider overview.
    const isTouch = typeof window !== 'undefined'
      && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const ZOOM = isTouch ? CAMERA_TOUCH_ZOOM : CAMERA_DESKTOP_ZOOM; // >1 = zoom in
    const MAX_W = 1400;           // cap horizontal reveal (raised so the
                                  // view still fills the width even when a
                                  // bottom control strip shortens the canvas)
    const logicalH = Math.round(CANVAS_HEIGHT / ZOOM);
    // Mindest-Breite an die (zoom-abhängige) Sichthöhe koppeln. Ein fester
    // MIN_W=800 würde bei starkem Touch-Zoom (kleine logicalH) den Canvas
    // breiter machen als das Display-Seitenverhältnis → schwarze Letterbox-
    // Balken oben/unten. Mit logicalH×1.5 folgt die Breite dem Container und
    // füllt das Display voll aus (kein Streifen).
    const MIN_W = Math.round(logicalH * 1.5);
    const containerAspect = containerWidth / containerHeight;
    const logicalW = Math.max(MIN_W, Math.min(MAX_W, Math.round(logicalH * containerAspect)));
    this.renderer.viewportW = logicalW;
    this.renderer.viewportH = logicalH;
    if (this.camera) { this.camera.width = logicalW; this.camera.height = logicalH; }

    const aspectRatio = logicalW / logicalH;
    let displayWidth = containerWidth;
    let displayHeight = containerWidth / aspectRatio;
    if (displayHeight > containerHeight) {
      displayHeight = containerHeight;
      displayWidth = containerHeight * aspectRatio;
    }

    // DPR-aware backing store: the canvas internal pixel buffer is sized at
    // (CSS px × devicePixelRatio) so high-DPI screens get crisp output. The
    // game keeps drawing in logicalW × logicalH logical coordinates —
    // render() applies a base ctx.setTransform(scaleX, scaleY) every frame
    // so the renderer is unaware of the backing-store size. The renderer
    // reads logical viewport size via its own viewportW/H, never canvas.width.
    //
    // AP 0.5: Grafikstufe deckelt den DPR. Auf Retina-Phones ist
    // devicePixelRatio = 3 → ohne Cap wird das Backing-Canvas 9× so groß
    // (massive Füllrate/Akku). 'high' kappt auf 2 (visuell kaum Unterschied,
    // großer Performance-Gewinn), 'mid' auf 1.5, 'low' auf 1.
    // Maße cachen, effektive Grafikstufe bestimmen (feste Wahl oder Auto)
    // und den Backing-Store anwenden. applyBackingStore() kann auch von der
    // Auto-Logik (tickAutoQuality) ohne erneute resize() gerufen werden.
    this.lastLogicalW = logicalW;
    this.lastLogicalH = logicalH;
    this.lastDisplayW = displayWidth;
    this.lastDisplayH = displayHeight;
    // Auto-Startstufe an die Bildschirmgröße koppeln (einmalig): auf großen
    // Displays (iPad) gleich mit 'mid'/'low' starten, damit es von der ersten
    // Sekunde flüssig ist — die Auto-Logik stuft bei Headroom wieder hoch.
    if (getSettings().quality === 'auto' && !this.autoStarted) {
      this.autoStarted = true;
      const projMP = (displayWidth * displayHeight * 4) / 1e6; // 'high' ≈ DPR 2
      this.autoTier = projMP > 4 ? 'low' : projMP > 2.5 ? 'mid' : 'high';
    }
    this.refreshEffectiveQuality();
    this.applyBackingStore();
  }

  /** Effektive Stufe: bei Settings='auto' die dynamische autoTier, sonst fest. */
  private refreshEffectiveQuality() {
    const q = getSettings().quality;
    this.effectiveQuality = q === 'auto' ? this.autoTier : q;
  }

  /** Wendet effectiveQuality auf Renderer + Backing-Store (dpr-Cap) an. */
  private applyBackingStore() {
    const logicalW = this.lastLogicalW;
    const logicalH = this.lastLogicalH;
    const displayWidth = this.lastDisplayW;
    const displayHeight = this.lastDisplayH;
    if (!logicalW || !logicalH || !displayWidth || !displayHeight) return;
    this.renderer.quality = this.effectiveQuality;
    const dpr = this.currentDpr();
    const backingW = Math.max(1, Math.round(displayWidth * dpr));
    const backingH = Math.max(1, Math.round(displayHeight * dpr));
    this.canvas.width = backingW;
    this.canvas.height = backingH;
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    this.baseRenderScaleX = backingW / logicalW;
    this.baseRenderScaleY = backingH / logicalH;
    this.baseViewportW = logicalW;
    this.baseViewportH = logicalH;
    // Stabilen Geräte-Skalierungsfaktor an den Renderer geben (Backing/Basis-
    // Logik) und die Sprite-Caches (Kegel/God-Rays) leeren, da die alte Auflösung
    // nach einem Backing-Wechsel nicht mehr passt. Läuft nur bei Resize/Quality,
    // NICHT im Per-Frame-Zoom → kein Cache-Thrash.
    this.renderer.baseDeviceScale = this.baseRenderScaleX;
    this.renderer.clearBgSpriteCaches();
    // Aktuellen Speed-Zoom sofort anwenden (kein 1-Frame-Sprung nach resize).
    this.applyDynamicZoom();
    // WebGL-Overlay an dieselbe Anzeigegröße koppeln (Spike, Gate G2).
    if (this.post && this.post.available) {
      this.post.resize(displayWidth, displayHeight, dpr);
    }
  }

  /**
   * Wendet den geglätteten Speed-Zoom (Vorschlag 2) auf Renderskalierung und
   * Viewport an. dynamicZoom < 1 → herausgezoomt: mehr Welt sichtbar
   * (viewport / zoom), kleiner gerendert (renderScale × zoom). Backing-Store
   * bleibt unangetastet, daher kein Flackern/keine Neuallokation.
   */
  /** Kurzer Kamera-Punch (Zoom-In, klingt weich ab). `amount` ~0.03–0.09. Über
   *  die Screenshake-Einstellung gated; überlagernde Punches stapeln nicht. */
  addImpactZoom(amount: number) {
    if (!getSettings().screenShake) return;
    this.impactZoom = Math.min(0.09, Math.max(this.impactZoom, amount));
  }

  /** Kurze Zeitlupe (E2) fuer grosse Momente. `frames` Dauer, `strength` = Start-
   *  tempo (0..1, kleiner = langsamer). Ueberlagernde Trigger nehmen das Maximum. */
  triggerSlowMo(frames: number, strength: number) {
    const active = this.slowMoFrames > 0;
    this.slowMoStrength = active ? Math.min(this.slowMoStrength, strength) : strength;
    if (frames > this.slowMoFrames) { this.slowMoFrames = frames; this.slowMoTotal = frames; }
  }

  private applyDynamicZoom() {
    if (!this.baseViewportW || !this.baseViewportH) return;
    const z = this.dynamicZoom * (1 + this.impactZoom);
    this.renderScaleX = this.baseRenderScaleX * z;
    this.renderScaleY = this.baseRenderScaleY * z;
    const vw = Math.round(this.baseViewportW / z);
    const vh = Math.round(this.baseViewportH / z);
    this.renderer.viewportW = vw;
    this.renderer.viewportH = vh;
    if (this.camera) { this.camera.width = vw; this.camera.height = vh; }
  }

  /** Ermittelt den Zoom-Faktor der Kamera-Zone, in der die Figur gerade steht
   *  (1 = keine Zone / Standard). Erste passende Zone gewinnt. */
  private activeCameraZoneZoom(): number {
    const zones = this.level.cameraZones;
    if (!zones || !zones.length) return 1;
    const col = Math.floor((this.player.x + this.player.width / 2) / TILE_SIZE);
    const row = Math.floor((this.player.y + this.player.height / 2) / TILE_SIZE);
    for (const z of zones) {
      if (col < z.colStart || col > z.colEnd) continue;
      if (z.rowStart !== undefined && (row < z.rowStart || row > (z.rowEnd ?? z.rowStart))) continue;
      return z.zoom;
    }
    return 1;
  }

  /** Aktualisiert den Zoom-Zielwert (Speed-Zoom kombiniert mit Zonen-Zoom) und
   *  führt ihn weich nach (pro Frame, vor camera.follow aufgerufen). */
  private updateSpeedZoom() {
    if (!this.baseViewportW) return;
    const speedFrac = Math.min(Math.abs(this.player.velX) / PLAYER_RUN_SPEED, 1);
    const speedZoom = 1 - speedFrac * CAMERA_SPEED_ZOOM_MAX;
    const targetZoom = speedZoom * this.activeCameraZoneZoom();
    this.dynamicZoom += (targetZoom - this.dynamicZoom) * CAMERA_SPEED_ZOOM_SMOOTH;
    // Impact-Zoom klingt schnell ab (~6–8 Frames) → snappy Punch, kein Wabbern.
    this.impactZoom = this.impactZoom > 0.0008 ? this.impactZoom * 0.80 : 0;
    this.applyDynamicZoom();
  }

  /**
   * Garantiert mindestens `min` Super-Kraft-Blöcke pro Level. Fehlende werden
   * an erreichbaren Stellen über festem Boden ergänzt — gut über die Breite
   * verteilt (Seeds bei ~25/70/45 %), mit Mindestabstand zueinander und je
   * auf einem frisch gesetzten Q-Tile (sonst löst der Block nie aus). Läuft
   * beim Level-Laden vor dem Aufbau der Block-Positions-Sets. Idempotent:
   * sind bereits genug vorhanden, passiert nichts.
   */
  private ensureMinSuperBlocks(min = 2) {
    const lv = this.level;
    if ((lv.superBlocks?.length || 0) >= min) return;
    const W = lv.width;
    const ground = groundRowOf(lv);
    const blockRow = ground - 4; // per Sprung vom Boden erreichbar
    if (blockRow < 1) return;
    const NONSOLID = new Set<number>([
      TileType.EMPTY, TileType.DECORATION_VINE, TileType.DECORATION_FLOWER,
      TileType.WATER_TOP, TileType.WATER, TileType.DEEP_WATER, TileType.SIGN,
    ]);
    const solid = (c: number, r: number) =>
      r >= 0 && r < lv.height && c >= 0 && c < W && !NONSOLID.has(lv.tiles[r][c]);
    const empty = (c: number, r: number) =>
      r >= 0 && r < lv.height && c >= 0 && c < W && lv.tiles[r][c] === TileType.EMPTY;

    // Bereits belegte Block-Coords (keine überschreiben).
    const occupied = new Set<string>();
    for (const list of [lv.heartBlocks, lv.fireBlocks, lv.magnetBlocks, lv.capeBlocks,
      lv.shieldBlocks, lv.clockBlocks, lv.starBlocks, lv.superBlocks]) {
      for (const c of (list || [])) occupied.add(c);
    }

    const chosen: number[] = [];
    const spotOk = (col: number) =>
      solid(col, ground) &&                                  // fester Boden zum Hinkommen
      empty(col, blockRow) && empty(col, blockRow - 1) && empty(col, blockRow + 1) &&
      empty(col - 1, blockRow) && empty(col + 1, blockRow) && // seitlich frei
      !occupied.has(`${col},${blockRow}`) &&
      chosen.every((c) => Math.abs(c - col) >= 14);          // Mindestabstand

    const want = min - (lv.superBlocks?.length || 0);
    const seeds = [Math.floor(W * 0.25), Math.floor(W * 0.70), Math.floor(W * 0.45)];
    for (const seed of seeds) {
      if (chosen.length >= want) break;
      for (let off = 0; off <= W; off++) {
        const a = seed + off, b = seed - off;
        if (a > 6 && a < W - 6 && spotOk(a)) { chosen.push(a); break; }
        if (b > 6 && b < W - 6 && spotOk(b)) { chosen.push(b); break; }
      }
    }
    // Fallback: voller Scan, falls die Seeds nicht genügend Plätze fanden.
    for (let col = 8; col < W - 8 && chosen.length < want; col++) {
      if (spotOk(col)) chosen.push(col);
    }

    if (chosen.length === 0) return;
    const added = chosen.map((col) => {
      this.level.tiles[blockRow][col] = TileType.QUESTION_BLOCK;
      return `${col},${blockRow}`;
    });
    this.level.superBlocks = [...(lv.superBlocks || []), ...added];
  }

  /** Auto-Qualität (AP 0.3-Erweiterung): stuft effectiveQuality anhand der
   *  durchschnittlichen Frame-Zeit. Schnell runter (2 schlechte Sekunden),
   *  langsam hoch (5 gute Sekunden) → keine Oszillation. Nur bei 'auto'. */
  private tickAutoQuality(avgMs: number) {
    const order: ('low' | 'mid' | 'high')[] = ['low', 'mid', 'high'];
    const idx = order.indexOf(this.autoTier);
    if (avgMs > 18) {            // < ~55 FPS → herunterstufen
      this.autoBadEvals++;
      this.autoGoodEvals = 0;
      if (this.autoBadEvals >= 2 && idx > 0) {
        this.autoTier = order[idx - 1];
        this.autoBadEvals = 0;
        this.effectiveQuality = this.autoTier;
        this.applyBackingStore();
      }
    } else if (avgMs < 14.5) {   // > ~69 FPS Headroom → vorsichtig hochstufen
      this.autoGoodEvals++;
      this.autoBadEvals = 0;
      if (this.autoGoodEvals >= 5 && idx < 2) {
        this.autoTier = order[idx + 1];
        this.autoGoodEvals = 0;
        this.effectiveQuality = this.autoTier;
        this.applyBackingStore();
      }
    } else {                     // stabiler Mittelbereich → Zähler abbauen
      this.autoBadEvals = Math.max(0, this.autoBadEvals - 1);
      this.autoGoodEvals = Math.max(0, this.autoGoodEvals - 1);
    }
  }
}

