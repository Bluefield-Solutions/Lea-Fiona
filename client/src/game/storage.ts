const KEY_V1 = 'lea_fiona_v1';
const KEY_V2 = 'lea_fiona_v2';

/**
 * Sandbox-sicherer localStorage-Zugriff.
 *
 * WICHTIG: In abgeschotteten iframes (z. B. der In-App-Vorschau der Claude-App,
 * `sandbox="allow-scripts"` ohne `allow-same-origin`) wirft bereits der ZUGRIFF
 * auf die `localStorage`-Property eine SecurityError — nicht erst getItem/setItem.
 * Deshalb ist `typeof localStorage !== 'undefined'` KEIN sicherer Schutz (auch
 * der typeof-Zugriff wirft). Nur ein vollständiges try/catch um den echten
 * Zugriff ist sicher. Ohne das stürzt die App beim Start ab → weißer Bildschirm.
 */
export function safeLocalGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function safeLocalSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Speicher nicht verfügbar (Sandbox / Private Mode / Quota) */
  }
}

export interface Settings {
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  /** Stadt-Welt: Blitze & Donner (Gewitter-Effekte). Aus = nur ruhiger Regen. */
  stadtGewitter: boolean;
  vibration: boolean;
  muted: boolean;
  /** Blendet ein Debug-Overlay mit FPS/Frame-Zeit/Entity-Zählern ein (AP 0.3). */
  showDebug: boolean;
  /** Grafikstufe (AP 0.5). 'auto' passt die effektive Stufe dynamisch an die
   *  gemessene Framerate an (AP 0.3-Erweiterung); die festen Stufen erzwingen
   *  einen devicePixelRatio-Cap (high≤2, mid≤1.5, low=1) + Effekt-Drosselung. */
  quality: 'auto' | 'low' | 'mid' | 'high';
  /** Touch-Steuerung (AP 1.8): 'stick' = Floating Virtual Stick links,
   *  'buttons' = klassische Pfeiltasten. */
  touchControl: 'stick' | 'buttons';
  /** Experimentell (Gate G2): WebGL-Bloom-Post-Pass. Default aus. */
  webglPost: boolean;
  /** Assist-Modus (AP 1.7): Hilfen für jüngere/ungeübtere Spieler. */
  assistInvincible: boolean;
  /** Spieltempo 0.5–1.0 (1.0 = normal). Verlangsamt die Spielwelt, das
   *  Rendering bleibt flüssig. */
  assistGameSpeed: number;
  /** Phase 3 (experimentell): dynamisches Licht/Dunkelheit in dunklen Welten,
   *  Spielerin & Gefahren als Lichtquellen. Default aus. */
  dynamicLight: boolean;
  /** Test/Debug: alle Welten in der Welt-Auswahl freischalten. Überschreibt
   *  nur die Anzeige, nicht die gespeicherte Progression (unlockedLevels
   *  bleibt erhalten). Default an, damit man frei testen kann. */
  unlockAllWorlds: boolean;
  /** Time-Attack-Geist der Bestzeit während des Spiels anzeigen (Default an). */
  showGhost: boolean;
  /** Grillen-/Nacht-Ambient-Dichte im Waldlevel, 0..1 (0 = still, 1 = dichter
   *  Chor). Wird zusätzlich zur automatischen Geräteklasse angewandt, sodass man
   *  die Dichte von Hand feinregeln kann. Default 0.6. */
  grillenDichte: number;
  /** Stadt-Welt: Regen-Dichte 0..1 (0 = nur Nieseln, 1 = dichter Wolkenbruch).
   *  Skaliert die automatische Intensitätskurve zusätzlich von Hand. Default 0.6. */
  regenDichte: number;
  /** Stadt-Welt: Stärke der dekorativen Zusatz-Effekte 0..1 (Fenster-Twinkle &
   *  Bloom, Neon-Pfützen, Nebel, Boss-Scheinwerfer, Vordergrund-Kabel). 0 = ruhig,
   *  1 = voll. Betrifft NUR Deko — Regen, Blitz und die Müllgruben-Warnung bleiben
   *  unberührt. Default 1.0. */
  stadtEffekte: number;
  /** Mathe-Modus (Lern-Modus): gesperrte Progression ab Level 1; nach jedem Level
   *  müssen 3 Rechenaufgaben (Plus/Minus bis 30) gelöst werden, bevor das nächste
   *  Level freigeschaltet wird. 3 Fehler insgesamt → kompletter Reset auf Level 1.
   *  Eigener, von der normalen Kampagne unabhängiger Fortschritt (`mathUnlocked`).
   *  Default aus. */
  mathMode: boolean;
  /** Höchstes im Mathe-Modus freigespieltes Level (1..N). Startet bei 1; steigt je
   *  bestandenem Quiz; wird bei Nichtbestehen wieder auf 1 gesetzt. */
  mathUnlocked: number;
}

export interface Profile {
  id: string;
  name: string;
  unlockedLevels: number;
  bestScores: number[];
  /** Bestzeit pro Level in Sekunden (kleiner = besser; 0 = noch keine). */
  bestTimes: number[];
  totalCoins: number;
  stickers: string[];
  settings: Settings;
  /**
   * Sonder-Münzen (Task #30) — pro Level (Index als String-Key, JSON-
   * tauglich) ein Triple aus drei Booleans (Slot 0..2). Sobald ein Slot
   * `true` ist, spawned die Engine die Münze beim Levelstart nicht mehr.
   */
  specialCoinsCollected: Record<string, [boolean, boolean, boolean]>;
  /**
   * Sterne-Rating pro Level (0..3). Wird beim Levelende aus den drei
   * Kriterien (alle Sonder-Münzen / kein Treffer / Restzeit) berechnet
   * und nur dann überschrieben, wenn der neue Wert höher ist.
   */
  levelStars: Record<string, number>;
  /**
   * Paket 2 — Doppelsprung als freispielbare Fähigkeit. Wird durch das
   * Einsammeln der Flügel (Welt 1) dauerhaft freigeschaltet. Bestehende
   * Spielstände mit Fortschritt (unlockedLevels > 1) bekommen sie beim
   * Laden automatisch, damit niemand mitten im Spiel den Doppelsprung verliert.
   */
  doubleJumpUnlocked: boolean;
}

export interface SaveData {
  version: 2;
  profiles: Profile[];
  activeProfileId: string;
}

const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.45,
  sfxVolume: 0.8,
  screenShake: true,
  stadtGewitter: true,
  vibration: true,
  muted: false,
  showDebug: false,
  quality: 'auto',
  touchControl: 'stick',
  // Grafik-Glow-up: WebGL-Bloom standardmäßig an (leuchtende Münzen/Lava/Kristalle/
  // Neon/Sterne). Graceful Fallback: ohne WebGL2 bleibt die 2D-Pipeline unberührt;
  // im Menü abschaltbar.
  webglPost: true,
  assistInvincible: false,
  assistGameSpeed: 1.0,
  dynamicLight: false,
  // Default: ALLE Level direkt spielbar (Umschalter in der Level-Auswahl).
  // „Kampagne" (nach und nach freischalten) ist die Alternative.
  unlockAllWorlds: true,
  showGhost: true,
  grillenDichte: 0.6,
  regenDichte: 0.6,
  stadtEffekte: 1.0,
  // Mathe-Modus per Default AN (Lern-Modus ist die Standard-Erfahrung).
  mathMode: true,
  mathUnlocked: 1,
};

export const MAX_PROFILES = 4;

function newId(): string {
  return 'p_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

function makeProfile(name: string, overrides?: Partial<Profile>): Profile {
  return {
    id: newId(),
    name,
    unlockedLevels: 1,
    bestScores: [],
    bestTimes: [],
    totalCoins: 0,
    stickers: [],
    settings: { ...DEFAULT_SETTINGS },
    specialCoinsCollected: {},
    levelStars: {},
    doubleJumpUnlocked: false,
    ...overrides,
  };
}

function sanitizeSpecialCoins(v: unknown): Record<string, [boolean, boolean, boolean]> {
  const out: Record<string, [boolean, boolean, boolean]> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!Array.isArray(raw)) continue;
    out[k] = [
      raw[0] === true,
      raw[1] === true,
      raw[2] === true,
    ];
  }
  return out;
}

function sanitizeLevelStars(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    out[k] = Math.min(3, Math.max(0, Math.floor(raw)));
  }
  return out;
}

function clamp01(n: unknown, dflt: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return dflt;
  return Math.min(1, Math.max(0, n));
}

function sanitizeSettings(s: unknown): Settings {
  const o = (s && typeof s === 'object') ? s as Record<string, unknown> : {};
  return {
    musicVolume: clamp01(o.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clamp01(o.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    screenShake: typeof o.screenShake === 'boolean' ? o.screenShake : DEFAULT_SETTINGS.screenShake,
    stadtGewitter: typeof o.stadtGewitter === 'boolean' ? o.stadtGewitter : DEFAULT_SETTINGS.stadtGewitter,
    vibration: typeof o.vibration === 'boolean' ? o.vibration : DEFAULT_SETTINGS.vibration,
    muted: typeof o.muted === 'boolean' ? o.muted : DEFAULT_SETTINGS.muted,
    showDebug: typeof o.showDebug === 'boolean' ? o.showDebug : DEFAULT_SETTINGS.showDebug,
    quality: (o.quality === 'auto' || o.quality === 'low' || o.quality === 'mid' || o.quality === 'high')
      ? o.quality : DEFAULT_SETTINGS.quality,
    touchControl: (o.touchControl === 'stick' || o.touchControl === 'buttons')
      ? o.touchControl : DEFAULT_SETTINGS.touchControl,
    webglPost: typeof o.webglPost === 'boolean' ? o.webglPost : DEFAULT_SETTINGS.webglPost,
    assistInvincible: typeof o.assistInvincible === 'boolean' ? o.assistInvincible : DEFAULT_SETTINGS.assistInvincible,
    assistGameSpeed: (typeof o.assistGameSpeed === 'number' && o.assistGameSpeed >= 0.5 && o.assistGameSpeed <= 1.0)
      ? o.assistGameSpeed : DEFAULT_SETTINGS.assistGameSpeed,
    dynamicLight: typeof o.dynamicLight === 'boolean' ? o.dynamicLight : DEFAULT_SETTINGS.dynamicLight,
    unlockAllWorlds: typeof o.unlockAllWorlds === 'boolean' ? o.unlockAllWorlds : DEFAULT_SETTINGS.unlockAllWorlds,
    showGhost: typeof o.showGhost === 'boolean' ? o.showGhost : DEFAULT_SETTINGS.showGhost,
    grillenDichte: typeof o.grillenDichte === 'number'
      ? Math.max(0, Math.min(1, o.grillenDichte)) : DEFAULT_SETTINGS.grillenDichte,
    regenDichte: typeof o.regenDichte === 'number'
      ? Math.max(0, Math.min(1, o.regenDichte)) : DEFAULT_SETTINGS.regenDichte,
    stadtEffekte: typeof o.stadtEffekte === 'number'
      ? Math.max(0, Math.min(1, o.stadtEffekte)) : DEFAULT_SETTINGS.stadtEffekte,
    mathMode: typeof o.mathMode === 'boolean' ? o.mathMode : DEFAULT_SETTINGS.mathMode,
    mathUnlocked: typeof o.mathUnlocked === 'number'
      ? Math.max(1, Math.floor(o.mathUnlocked)) : DEFAULT_SETTINGS.mathUnlocked,
  };
}

function sanitizeProfile(p: unknown, fallbackName: string): Profile {
  const o = (p && typeof p === 'object') ? p as Record<string, unknown> : {};
  return {
    id: typeof o.id === 'string' && o.id.length > 0 ? o.id : newId(),
    name: typeof o.name === 'string' && o.name.trim().length > 0 ? o.name.slice(0, 20) : fallbackName,
    unlockedLevels: typeof o.unlockedLevels === 'number' ? Math.max(1, Math.floor(o.unlockedLevels)) : 1,
    bestScores: Array.isArray(o.bestScores)
      ? o.bestScores.map(n => typeof n === 'number' ? Math.max(0, Math.floor(n)) : 0)
      : [],
    bestTimes: Array.isArray(o.bestTimes)
      ? o.bestTimes.map(n => typeof n === 'number' ? Math.max(0, Math.floor(n)) : 0)
      : [],
    totalCoins: typeof o.totalCoins === 'number' ? Math.max(0, Math.floor(o.totalCoins)) : 0,
    stickers: Array.isArray(o.stickers)
      ? Array.from(new Set(o.stickers.filter(s => typeof s === 'string') as string[]))
      : [],
    settings: sanitizeSettings(o.settings),
    specialCoinsCollected: sanitizeSpecialCoins(o.specialCoinsCollected),
    levelStars: sanitizeLevelStars(o.levelStars),
    // Kindness-Default: wer schon über Welt 1 hinaus ist, behält den
    // Doppelsprung automatisch (sonst würde ein laufender Spielstand die
    // Fähigkeit plötzlich verlieren). Frische Stände (nur Welt 1) erspielen sie.
    doubleJumpUnlocked: o.doubleJumpUnlocked === true
      || (typeof o.unlockedLevels === 'number' && Math.floor(o.unlockedLevels) > 1),
  };
}

let cache: SaveData | null = null;
let writeTimer: number | null = null;

function readV1(): { unlockedLevels: number; bestScores: number[]; totalCoins: number; muted: boolean; volume: number } | null {
  try {
    const raw = safeLocalGet(KEY_V1);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      unlockedLevels: typeof p.unlockedLevels === 'number' ? Math.max(1, Math.floor(p.unlockedLevels)) : 1,
      bestScores: Array.isArray(p.bestScores) ? p.bestScores.map((n: unknown) => typeof n === 'number' ? Math.max(0, Math.floor(n)) : 0) : [],
      totalCoins: typeof p.totalCoins === 'number' ? Math.max(0, Math.floor(p.totalCoins)) : 0,
      muted: typeof p.muted === 'boolean' ? p.muted : false,
      volume: typeof p.volume === 'number' ? Math.min(1, Math.max(0, p.volume)) : 0.6,
    };
  } catch {
    return null;
  }
}

function freshSave(): SaveData {
  const v1 = readV1();
  if (v1) {
    // Carry every v1 stat into "Lea" (the legacy slot), and seed an empty
    // "Fiona" alongside her so the title screen always has both default
    // profile cards available.
    const migrated = makeProfile('Lea', {
      unlockedLevels: v1.unlockedLevels,
      bestScores: v1.bestScores,
      totalCoins: v1.totalCoins,
      settings: {
        ...DEFAULT_SETTINGS,
        musicVolume: v1.volume,
        sfxVolume: v1.volume,
        muted: v1.muted,
      },
    });
    const sister = makeProfile('Fiona');
    return {
      version: 2,
      profiles: [migrated, sister],
      activeProfileId: migrated.id,
    };
  }
  // Fresh install: Lea + Fiona side by side, Lea active by default.
  const lea = makeProfile('Lea');
  const fiona = makeProfile('Fiona');
  return { version: 2, profiles: [lea, fiona], activeProfileId: lea.id };
}

function safeRead(): SaveData {
  if (cache) return cache;
  try {
    const raw = safeLocalGet(KEY_V2);
    if (!raw) {
      cache = freshSave();
      scheduleWrite();
      return cache;
    }
    const parsed = JSON.parse(raw);
    const profilesIn: unknown[] = Array.isArray(parsed?.profiles) ? parsed.profiles : [];
    let profiles: Profile[] = profilesIn
      .slice(0, MAX_PROFILES)
      .map((p, i) =>
        sanitizeProfile(p, i === 0 ? 'Lea' : i === 1 ? 'Fiona' : `Profil ${i + 1}`),
      );
    if (profiles.length === 0) profiles = [makeProfile('Lea'), makeProfile('Fiona')];
    const activeId = typeof parsed?.activeProfileId === 'string' ? parsed.activeProfileId : profiles[0].id;
    const active = profiles.find(p => p.id === activeId) ? activeId : profiles[0].id;
    cache = { version: 2, profiles, activeProfileId: active };
    return cache;
  } catch {
    cache = freshSave();
    return cache;
  }
}

function scheduleWrite() {
  if (typeof window === 'undefined') return;
  if (writeTimer !== null) window.clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    writeTimer = null;
    if (!cache) return;
    safeLocalSet(KEY_V2, JSON.stringify(cache));
  }, 200);
}

function active(): Profile {
  const s = safeRead();
  let p = s.profiles.find(pr => pr.id === s.activeProfileId);
  if (!p) {
    p = s.profiles[0];
    s.activeProfileId = p.id;
  }
  return p;
}

function cloneProfile(p: Profile): Profile {
  // Deep-copy the special-coins triples so mutations on the returned
  // Profile (e.g. UI snapshots) don't leak back into the cached copy.
  const sc: Record<string, [boolean, boolean, boolean]> = {};
  for (const [k, v] of Object.entries(p.specialCoinsCollected)) {
    sc[k] = [v[0], v[1], v[2]];
  }
  return {
    ...p,
    bestScores: [...p.bestScores],
    bestTimes: [...p.bestTimes],
    stickers: [...p.stickers],
    settings: { ...p.settings },
    specialCoinsCollected: sc,
    levelStars: { ...p.levelStars },
  };
}

// ---- Profile management ----
export function listProfiles(): Profile[] {
  return safeRead().profiles.map(cloneProfile);
}

export function getActiveProfile(): Profile {
  return cloneProfile(active());
}

export function getActiveProfileId(): string {
  return safeRead().activeProfileId;
}

export function switchProfile(id: string): boolean {
  const s = safeRead();
  if (!s.profiles.find(p => p.id === id)) return false;
  s.activeProfileId = id;
  scheduleWrite();
  return true;
}

export function createProfile(name: string): Profile | null {
  const s = safeRead();
  if (s.profiles.length >= MAX_PROFILES) return null;
  const trimmed = (name || '').trim().slice(0, 20) || `Profil ${s.profiles.length + 1}`;
  const p = makeProfile(trimmed);
  s.profiles.push(p);
  s.activeProfileId = p.id;
  scheduleWrite();
  return { ...p };
}

export function deleteProfile(id: string): boolean {
  const s = safeRead();
  if (s.profiles.length <= 1) return false;
  const idx = s.profiles.findIndex(p => p.id === id);
  if (idx === -1) return false;
  s.profiles.splice(idx, 1);
  if (s.activeProfileId === id) s.activeProfileId = s.profiles[0].id;
  scheduleWrite();
  return true;
}

export function renameProfile(id: string, name: string): boolean {
  const s = safeRead();
  const p = s.profiles.find(pr => pr.id === id);
  if (!p) return false;
  const trimmed = (name || '').trim().slice(0, 20);
  if (!trimmed) return false;
  p.name = trimmed;
  scheduleWrite();
  return true;
}

// ---- Per-profile gameplay state ----
export function getSave(): SaveData {
  return safeRead();
}

export function setUnlocked(levelCount: number) {
  const p = active();
  p.unlockedLevels = Math.max(p.unlockedLevels, levelCount);
  scheduleWrite();
}

export function getUnlocked(): number {
  return active().unlockedLevels;
}

export function recordBestScore(levelIndex: number, score: number) {
  const p = active();
  while (p.bestScores.length <= levelIndex) p.bestScores.push(0);
  if (score > p.bestScores[levelIndex]) p.bestScores[levelIndex] = score;
  scheduleWrite();
}

export function getBestScore(levelIndex: number): number {
  return active().bestScores[levelIndex] || 0;
}

/** Bestzeit in Sekunden (kleiner = besser). Speichert nur, wenn schneller
 *  als der bisherige Bestwert oder wenn noch keine Zeit existiert (0). */
export function recordBestTime(levelIndex: number, seconds: number) {
  if (!(seconds > 0)) return;
  const p = active();
  while (p.bestTimes.length <= levelIndex) p.bestTimes.push(0);
  const cur = p.bestTimes[levelIndex];
  if (cur === 0 || seconds < cur) p.bestTimes[levelIndex] = Math.floor(seconds);
  scheduleWrite();
}

/** Bestzeit in Sekunden, 0 = noch keine. */
export function getBestTime(levelIndex: number): number {
  return active().bestTimes[levelIndex] || 0;
}

/** Time-Attack-Geist: kompakte Positions-Spur der Bestzeit (gerundete Ints als
 *  kommaseparierter String, eigener localStorage-Key wegen Größe). */
export function saveGhost(levelIndex: number, data: number[]) {
  safeLocalSet(`lf_ghost_${levelIndex}`, data.map((v) => Math.round(v)).join(','));
}

export function getGhost(levelIndex: number): number[] | null {
  const s = safeLocalGet(`lf_ghost_${levelIndex}`);
  if (!s) return null;
  const arr = s.split(',').map(Number);
  return arr.length >= 4 ? arr : null;
}

export function addLifetimeCoins(n: number) {
  active().totalCoins += n;
  scheduleWrite();
}

// ---- Settings ----
export function getSettings(): Settings {
  return { ...active().settings };
}

export function updateSettings(patch: Partial<Settings>) {
  const p = active();
  p.settings = sanitizeSettings({ ...p.settings, ...patch });
  scheduleWrite();
}

export function setMuted(muted: boolean) {
  updateSettings({ muted });
}

export function isMuted(): boolean {
  return active().settings.muted;
}

// Legacy single-volume API kept so external callers (tests, older code)
// keep compiling. Reads = average of music/sfx; writes = both at the
// same value so the user-visible behaviour mirrors the old single slider.
export function setVolume(v: number) {
  const value = Math.min(1, Math.max(0, v));
  updateSettings({ musicVolume: value, sfxVolume: value });
}

export function getVolume(): number {
  const s = active().settings;
  return (s.musicVolume + s.sfxVolume) / 2;
}

// ---- Stickers / Achievements ----
export function getStickers(): string[] {
  return [...active().stickers];
}

export function hasSticker(id: string): boolean {
  return active().stickers.includes(id);
}

// Returns true when the sticker was newly unlocked (caller can fire toast).
export function unlockSticker(id: string): boolean {
  const p = active();
  if (p.stickers.includes(id)) return false;
  p.stickers.push(id);
  scheduleWrite();
  return true;
}

// ---- Doppelsprung-Freischaltung (Paket 2) ----
export function isDoubleJumpUnlocked(): boolean {
  return active().doubleJumpUnlocked === true;
}

/** Schaltet den Doppelsprung dauerhaft frei. Gibt true zurück, wenn neu. */
export function unlockDoubleJump(): boolean {
  const p = active();
  if (p.doubleJumpUnlocked) return false;
  p.doubleJumpUnlocked = true;
  scheduleWrite();
  return true;
}

// ---- Sonder-Münzen + Sterne (Task #30) ----
export function getSpecialCoinsCollected(levelIndex: number): [boolean, boolean, boolean] {
  const v = active().specialCoinsCollected[String(levelIndex)];
  return v ? [v[0], v[1], v[2]] : [false, false, false];
}

/** Persistiert "Slot S in Level L wurde eingesammelt". Idempotent. */
export function markSpecialCoinCollected(levelIndex: number, slot: number): void {
  if (slot < 0 || slot > 2) return;
  const p = active();
  const key = String(levelIndex);
  const cur = p.specialCoinsCollected[key] || [false, false, false] as [boolean, boolean, boolean];
  if (cur[slot]) return;
  cur[slot] = true;
  p.specialCoinsCollected[key] = cur;
  scheduleWrite();
}

export function getLevelStars(levelIndex: number): number {
  return active().levelStars[String(levelIndex)] || 0;
}

/** Schreibt nur, wenn `stars` höher ist als der bisherige Bestwert. */
export function recordLevelStars(levelIndex: number, stars: number): void {
  if (stars <= 0) return;
  const clamped = Math.min(3, Math.max(0, Math.floor(stars)));
  const p = active();
  const key = String(levelIndex);
  const prev = p.levelStars[key] || 0;
  if (clamped > prev) {
    p.levelStars[key] = clamped;
    scheduleWrite();
  }
}

export function resetSave() {
  cache = freshSave();
  scheduleWrite();
}
