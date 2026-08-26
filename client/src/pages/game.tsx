import React, { useEffect, useRef, useState, useCallback } from 'react';

// Build-Kennung, zur Bauzeit von Vite injiziert (define). Sichtbar im Titelbild.
declare const __BUILD_ID__: string;

import { GameEngine } from '../game/engine';
import { GameState } from '../game/constants';
import { LEVELS } from '../game/level';
import { audio } from '../game/audio';
import {
  getBestScore,
  getLevelStars,
  getSpecialCoinsCollected,
  listProfiles, getActiveProfile, switchProfile, createProfile,
  deleteProfile, renameProfile,
  getSettings, updateSettings, type Settings, type Profile,
  getStickers, unlockSticker,
  safeLocalGet, safeLocalSet,
} from '../game/storage';
import { getAchievement } from '../game/achievements';
import type { HudStats, LevelInfo, ModalKind } from '../components/game/types';
import { formatTime, isTouchDevice, vibrate } from '../components/game/ui-helpers';
import { HudButton, PrimaryButton, PadButton } from '../components/game/Buttons';
import { ModalOverlay } from '../components/game/ModalOverlay';
import { MathQuiz } from '../components/game/MathQuiz';
import { ProfilesPanel } from '../components/game/ProfilesPanel';
import { SettingsPanel } from '../components/game/SettingsPanel';
import runSheetFiona from '@assets/run_sheet_fiona.webp';
import runSheetLea from '@assets/run_sheet_lea.webp';
import { STEPHAN_FRAME_URLS, STEPHAN_FRAME_W, STEPHAN_FRAME_H } from '../game/assets/stephanSprites';
import heroSky from '@assets/lyr_sky.webp';
import heroHillsFar from '@assets/lyr_hillsfar.webp';
import heroHillsNear from '@assets/lyr_hillsnear.webp';
import heroGround from '@assets/lyr_ground.webp';
import heroForeground from '@assets/lyr_foreground.webp';
import { AlbumPanel } from '../components/game/AlbumPanel';
import { BoutiquePanel } from '../components/game/BoutiquePanel';

// Height (CSS px) reserved at the bottom of the screen for the touch
// controls while playing, so they sit below the playfield, not on top of it.
const CONTROL_STRIP_H = 48;

// ── Quick-Settings-Bausteine für die Startseite ───────────────────────
function QuickToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
      }}
    >
      <span>{label}</span>
      <span style={{
        width: 42, height: 24, borderRadius: 999, flexShrink: 0,
        background: value ? 'linear-gradient(90deg,#ffd54a,#ff9f5a)' : 'rgba(255,255,255,0.18)',
        position: 'relative', transition: 'background 200ms ease',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: value ? 21 : 3, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', transition: 'left 200ms cubic-bezier(.2,.8,.2,1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }} />
      </span>
    </button>
  );
}

function QuickSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#fff', fontSize: 14, fontWeight: 600 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ opacity: 0.7, fontWeight: 500 }}>{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range" min={0} max={1} step={0.05} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        style={{ width: '100%', accentColor: '#ffd54a', cursor: 'pointer' }}
      />
    </label>
  );
}

// Sammel-Objekte für das Hero-Titelbild: einzelne Münzen/Sterne fliegen von
// rechts nach links und werden auf Figuren-Höhe „eingesammelt" — kurzes
// Aufblitzen an der Stelle + Pling (sobald der Ton aktiv ist; playSfx ist ein
// No-Op, solange Audio noch nicht durch eine Nutzer-Geste initialisiert wurde).
function HeroCollectibles() {
  const COLLECT_X = 49;                 // % (Mitte zwischen den Figuren)
  const FRACTION = (104 - COLLECT_X) / (104 + 12);  // Anteil der Strecke bis zum Einsammeln
  const items = React.useMemo(() => ([
    { kind: 'coin', top: 34, dur: 6.4, delay: 0.0 },
    { kind: 'star', top: 52, dur: 8.1, delay: 1.7 },
    { kind: 'coin', top: 44, dur: 7.2, delay: 3.2 },
    { kind: 'star', top: 61, dur: 9.0, delay: 4.6 },
    { kind: 'coin', top: 38, dur: 7.7, delay: 5.9 },
  ] as const), []);
  const layerRef = useRef<HTMLDivElement>(null);
  const coinRefs = useRef<(HTMLDivElement | null)[]>([]);
  const topsRef = useRef<number[]>(items.map(i => i.top));
  const timers = useRef<number[]>([]);

  const spawnBurst = (topPct: number) => {
    const layer = layerRef.current;
    if (!layer) return;
    const b = document.createElement('div');
    b.className = 'lf-hero-burst';
    b.style.left = COLLECT_X + '%';
    b.style.top = topPct + '%';
    layer.appendChild(b);
    window.setTimeout(() => b.remove(), 650);
  };

  const collect = (idx: number) => {
    const el = coinRefs.current[idx];
    if (el) el.classList.add('lf-collected');
    spawnBurst(topsRef.current[idx]);
    try { audio.playSfx('coin', 0, 1.04 + (idx % 3) * 0.05); } catch { /* Audio noch nicht bereit */ }
  };

  useEffect(() => {
    const osReduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (osReduce || getSettings().reducedMotion) {
      return; // Bei „Bewegung reduzieren" (OS ODER Einstellung) keine fliegenden Objekte.
    }
    const t = timers.current;
    // Erster Einsammel-Zeitpunkt je Objekt = Startverzögerung + Anteil bis Mitte.
    items.forEach((it, idx) => {
      t.push(window.setTimeout(() => collect(idx), (it.delay + FRACTION * it.dur) * 1000));
    });
    return () => { t.forEach(clearTimeout); t.length = 0; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bei jedem Animations-Neustart: wieder sichtbar machen, neue Höhe würfeln und
  // den nächsten Einsammel-Zeitpunkt dieses Zyklus planen (synchron zur Animation).
  const onIter = (idx: number, dur: number) => {
    const el = coinRefs.current[idx];
    if (!el) return;
    el.classList.remove('lf-collected');
    const ny = 30 + Math.floor(Math.random() * 38);   // 30..67 %
    topsRef.current[idx] = ny;
    el.style.top = ny + '%';
    timers.current.push(window.setTimeout(() => collect(idx), FRACTION * dur * 1000));
  };

  return (
    <div ref={layerRef} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {items.map((it, idx) => (
        <div
          key={idx}
          ref={(el) => { coinRefs.current[idx] = el; }}
          className={`lf-hero-collectible ${it.kind === 'star' ? 'lf-hero-star' : 'lf-hero-coin'}`}
          style={{ top: it.top + '%', animationDuration: it.dur + 's', animationDelay: it.delay + 's' }}
          onAnimationIteration={() => onIter(idx, it.dur)}
        />
      ))}
    </div>
  );
}

// Wählbare Spielfiguren. Stephan (echter KI-Sprite, früher nur Welt 19) ist
// jetzt überall spielbar — daher als dritte Option ergänzt.
type Character = 'fiona' | 'lea' | 'stephan';

function CharacterChooser({ value, onChange, variant = 'compact', noSelection = false }: { value: Character; onChange: (c: Character) => void; variant?: 'compact' | 'hero'; noSelection?: boolean }) {
  // Figur-Optionen. Lea/Fiona nutzen einen horizontalen Lauf-Streifen (steps-
  // Animation); Stephan (der echte KI-Sprite aus Welt 19, jetzt überall wählbar)
  // hat 15 Einzel-Frames — im Menü zeigen wir sein Ruhe-Bild mit sanftem Hüpfer.
  const opts: { id: Character; label: string; emoji: string; sheet?: string; fw: number; fh: number; sheetW?: number; color: string; anim?: string; img?: string }[] = [
    { id: 'fiona', label: 'Fiona', emoji: '🌸', sheet: runSheetFiona, fw: 47, fh: 72, sheetW: 188, color: '#ff86c8', anim: 'lf-run-fiona 0.5s steps(4) infinite' },
    { id: 'lea', label: 'Lea', emoji: '💛', sheet: runSheetLea, fw: 71, fh: 84, sheetW: 284, color: '#ffcf4a', anim: 'lf-run-lea 0.55s steps(4) infinite' },
    { id: 'stephan', label: 'Stephan', emoji: '🧢', img: STEPHAN_FRAME_URLS[0], fw: STEPHAN_FRAME_W, fh: STEPHAN_FRAME_H, color: '#5ab0ff' },
  ];
  if (variant === 'hero') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#fff', fontSize: 'clamp(14px,2.4vw,19px)', fontWeight: 900, letterSpacing: '0.12em', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>WÄHLE DEINE FIGUR</span>
        <div style={{ display: 'flex', gap: 'clamp(12px,2.6vw,20px)' }}>
          {opts.map((o) => {
            const sel = !noSelection && value === o.id;
            // Kompakte, elegante Auswahl-Pille: gerahmtes Mini-Porträt + Name.
            // Das große Hero-Bild oben trägt die Show; hier reicht ein klarer,
            // platzsparender Wähler, der auf jedem Bildschirm passt.
            return (
              <button
                key={o.id} type="button" className="lf-hero-card" aria-pressed={sel} aria-label={`Figur ${o.label}`}
                onClick={() => onChange(o.id)}
                style={{
                  padding: '9px 16px 9px 9px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
                  background: sel ? `linear-gradient(165deg, ${o.color}42, rgba(16,12,34,0.82))` : 'linear-gradient(165deg, rgba(255,255,255,0.12), rgba(16,12,34,0.55))',
                  border: `2px solid ${sel ? o.color : 'rgba(255,255,255,0.18)'}`,
                  boxShadow: sel ? `0 12px 30px ${o.color}55, inset 0 1px 0 rgba(255,255,255,0.25)` : '0 8px 22px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                  transition: 'all 160ms cubic-bezier(.2,.8,.3,1)',
                }}
              >
                <div aria-hidden style={{
                  position: 'relative', width: 62, height: 62, borderRadius: 18, overflow: 'hidden', flex: '0 0 auto',
                  background: `radial-gradient(120% 120% at 50% 20%, ${o.color}33 0%, rgba(10,8,26,0.55) 75%)`,
                  border: `2px solid ${sel ? o.color : 'rgba(255,255,255,0.22)'}`,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                }}>
                  {o.img ? (
                    // Bild-basierte Figur (Stephan): Einzel-Frame, an Höhe skaliert,
                    // nur sanfter Hüpfer/Idle — kein steps-Laufzyklus nötig.
                    <div style={{
                      width: 54, height: 54, marginTop: 4,
                      backgroundImage: `url(${o.img})`, backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'center bottom',
                      animation: sel ? 'lf-hero-hop 1.05s ease-in-out infinite' : 'lf-hero-idle 2.6s ease-in-out infinite',
                      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.45))',
                    }} />
                  ) : (
                  <div style={{
                    width: o.fw * 1.28, height: o.fh * 1.28, marginTop: -3,
                    backgroundImage: `url(${o.sheet})`, backgroundSize: `${(o.sheetW ?? o.fw) * 1.28}px ${o.fh * 1.28}px`, backgroundRepeat: 'no-repeat',
                    animation: sel ? `${o.anim}, lf-hero-hop 1.05s ease-in-out infinite` : 'lf-hero-idle 2.6s ease-in-out infinite',
                    filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.45))',
                  }} />
                  )}
                </div>
                <span style={{
                  color: sel ? '#fff' : 'rgba(255,255,255,0.92)', fontWeight: 800,
                  fontSize: 'clamp(16px,2.4vw,20px)', letterSpacing: '0.01em',
                }}>{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>👧 Spielfigur</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {opts.map((o) => (
          <button
            key={o.id} type="button" aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              color: value === o.id ? '#1a1230' : '#fff',
              background: value === o.id ? 'linear-gradient(90deg,#ffd54a,#ff9f5a)' : 'rgba(255,255,255,0.12)',
              border: value === o.id ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.18)',
              transition: 'all 150ms ease',
            }}
          >
            {o.emoji} {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // WebGL-Overlay-Canvas (Spike, Gate G2) — liegt deckungsgleich über dem
  // 2D-Canvas, sichtbar nur bei aktivem Post-Pass.
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, forceTick] = useState(0);

  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [hud, setHud] = useState<HudStats>({ lives: 3, coins: 0, score: 0, time: 0, isPCharged: false, runChargePct: 0, specialCoins: [false, false, false], lastLevelStars: 0 });
  // Sofort korrekt initialisieren, damit im ersten Render keine höheren Level
  // fälschlich gesperrt erscheinen (sonst „einige Sekunden" bis klickbar, bis
  // der Mount-Effekt greift). DEV/unlockAllWorlds → alle frei.
  const [unlocked, setUnlocked] = useState<number>(() => {
    try { return getSettings().unlockAllWorlds ? LEVELS.length : 1; } catch { return 1; }
  });
  // Zwei-Schritt-Startflow: erst Figur wählen, dann Level-Auswahl.
  const [charPicked, setCharPicked] = useState(false);
  // P2.3: Scroll-Hinweis im Level-Grid — true, wenn nach unten noch mehr Level
  // scrollbar sind (z. B. Handy quer, wo nur ~1 Reihe sichtbar ist).
  const levelGridRef = useRef<HTMLDivElement>(null);
  const [gridMore, setGridMore] = useState(false);
  const updateGridMore = useCallback(() => {
    const el = levelGridRef.current;
    if (!el) { setGridMore(false); return; }
    setGridMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  }, []);
  // Neu messen, sobald die Level-Auswahl sichtbar wird oder sich die Größe/der
  // Inhalt ändert (Drehen/Resize/Layout settelt async). ResizeObserver auf dem
  // Grid ist robust gegen spätes Layout (SVG/Fonts) — plus rAF + kurzer Timeout
  // als Sicherheitsnetz, falls der Observer noch nicht feuert.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = levelGridRef.current;
    const r = requestAnimationFrame(updateGridMore);
    const t = window.setTimeout(updateGridMore, 350);
    const t2 = window.setTimeout(updateGridMore, 800);
    window.addEventListener('resize', updateGridMore);
    let ro: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateGridMore);
      ro.observe(el);
    }
    return () => {
      cancelAnimationFrame(r); window.clearTimeout(t); window.clearTimeout(t2);
      window.removeEventListener('resize', updateGridMore);
      ro?.disconnect();
    };
  }, [charPicked, gameState, updateGridMore]);
  // Meilenstein-Belohnung: kleine Feier (Konfetti + Banner), wenn erstmalig
  // 5 / 10 / alle Welten geschafft sind. Bereits gefeierte Meilensteine werden
  // pro Profil im Speicher gemerkt, damit die Feier nur EINMAL erscheint.
  const MILESTONES = React.useMemo(() => Array.from(new Set([5, 10, LEVELS.length])).filter((m) => m > 0 && m <= LEVELS.length).sort((a, b) => a - b), []);
  const [celebrateMilestone, setCelebrateMilestone] = useState<number | null>(null);
  useEffect(() => {
    if (gameState !== GameState.TITLE || !charPicked) return;
    const done = LEVELS.reduce((n, _l, i) => n + (getLevelStars(i) > 0 ? 1 : 0), 0);
    let stored: number[] = [];
    try { stored = (safeLocalGet('lf_milestones_v1') || '').split(',').filter(Boolean).map(Number); } catch { /* egal */ }
    // Meilenstein-Sammel-Sticker (Tier 2): für JEDEN erreichten Meilenstein
    // den dauerhaften Album-Sticker sichern — auch rückwirkend für Stände, die
    // 5/10 schon vor diesem Update gefeiert haben (unlockSticker ist idempotent).
    let gained = false;
    for (const m of MILESTONES) {
      if (done < m) continue;
      const id = m >= LEVELS.length ? 'all_levels' : `milestone_${m}`;
      if (unlockSticker(id)) gained = true;
    }
    if (gained) setStickers(getStickers());

    const newly = MILESTONES.filter((m) => done >= m && !stored.includes(m));
    if (newly.length) {
      const top = Math.max(...newly);
      setCelebrateMilestone(top);
      try { safeLocalSet('lf_milestones_v1', Array.from(new Set([...stored, ...newly])).sort((a, b) => a - b).join(',')); } catch { /* egal */ }
      // Großes Finale (alle Welten) klingt voller & länger als 5/10.
      try { audio.playSfx(top >= LEVELS.length ? 'milestoneBig' : 'milestone'); } catch { /* Audio evtl. nicht bereit */ }
    }
  }, [gameState, charPicked, unlocked, MILESTONES]);
  // Feier nach kurzer Zeit automatisch ausblenden — das große Finale bleibt
  // etwas länger stehen als ein Zwischen-Meilenstein.
  useEffect(() => {
    if (celebrateMilestone == null) return;
    const dur = celebrateMilestone >= LEVELS.length ? 6200 : 4000;
    const t = window.setTimeout(() => setCelebrateMilestone(null), dur);
    return () => window.clearTimeout(t);
  }, [celebrateMilestone]);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [character, setCharacterState] = useState<Character>(() => {
    const c = safeLocalGet('lf_character');
    return c === 'lea' || c === 'stephan' ? c : 'fiona';
  });
  const handleCharacterChange = (c: Character) => {
    setCharacterState(c);
    safeLocalSet('lf_character', c);
    engineRef.current?.setCharacter(c);
  };
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  // Nur echte Handys sperren wir im Hochformat (kürzere Kante < 480px).
  // Tablets im Hochformat sind gut spielbar und werden NICHT gesperrt.
  const [smallPhone, setSmallPhone] = useState<boolean>(false);

  // Profile/settings/album modal state.
  const [modal, setModal] = useState<ModalKind>(null);
  const [profiles, setProfiles] = useState<Profile[]>(() => listProfiles());
  const [activeProfile, setActiveProfile] = useState<Profile>(() => getActiveProfile());
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [showQuickSettings, setShowQuickSettings] = useState<boolean>(false);
  // Mathe-Modus: Quiz-Overlay nach Levelende + kurze Ergebnis-Meldung.
  const [showQuiz, setShowQuiz] = useState<boolean>(false);
  const [mathMsg, setMathMsg] = useState<string | null>(null);
  // Debug-Overlay-Telemetrie (AP 0.3) — alle 80 ms aus der Engine gepollt.
  const [debugInfo, setDebugInfo] = useState<ReturnType<GameEngine['getDebugInfo']> | null>(null);
  // Floating Virtual Stick (AP 1.8): Sicht-State + Ref auf den aktiven Finger.
  const [stickView, setStickView] = useState<{ baseX: number; baseY: number; knobX: number; knobY: number } | null>(null);
  const stickRef = useRef<{ id: number; baseX: number; baseY: number } | null>(null);
  const [stickers, setStickers] = useState<string[]>(() => getStickers());
  // Toast queue for achievement unlocks. We pop the head every ~3s so
  // multiple unlocks chain instead of overlapping.
  const [toasts, setToasts] = useState<{ id: string; key: number }[]>([]);

  // Level-Intro-Karte (Task #29): wird beim 'levelStart'-Event für
  // ~1.2s eingeblendet. `key` dient nur dazu, dass die CSS-Animation
  // bei aufeinanderfolgenden Intros (Restart) sauber neu startet.
  const [intro, setIntro] = useState<
    { index: number; name: string; lives: number; key: number } | null
  >(null);

  // Zeit-Bonus-Animation (Task #29): wir spiegeln die Engine-Felder
  // alle ~80ms in React, damit der Levelend-Overlay die abklingende
  // Restzeit live zeigt. Wird zu null, sobald wir den LEVEL_COMPLETE-
  // State verlassen.
  const [bonus, setBonus] = useState<{ initial: number; remaining: number } | null>(null);

  const touch = isTouchDevice();

  const refreshProfileState = useCallback(() => {
    setProfiles(listProfiles());
    setActiveProfile(getActiveProfile());
    setSettings(getSettings());
    setStickers(getStickers());
  }, []);

  // Double-tap-to-run state for the touch D-pad (persists across renders).
  const dpadRunRef = useRef<{ lastRelease: { left: number; right: number }; running: 'left' | 'right' | null }>(
    { lastRelease: { left: 0, right: 0 }, running: null },
  );

  // Mirrors gameState so the (stable) resize callback can read it without
  // being re-created. Updated every render below.
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const handleResize = useCallback(() => {
    if (engineRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Das Spielfeld füllt die volle Höhe; die Touch-Steuerung liegt als
      // Overlay (absolute, bottom:0) darüber — kein reservierter schwarzer
      // Streifen mehr unter dem Spielfeld.
      engineRef.current.resize(rect.width, rect.height);
    }
  }, []);

  // WebGL-Bloom (Gate G2) an-/ausschalten + Overlay-Sichtbarkeit. setPostEnabled
  // gibt zurück, ob WebGL2 tatsächlich verfügbar war.
  const applyPost = useCallback((on: boolean) => {
    const e = engineRef.current;
    const gl = glCanvasRef.current;
    if (!e) return;
    if (on && gl) e.attachPostCanvas(gl); // Lazy-Init beim ersten Einschalten.
    const active = e.setPostEnabled(on);
    if (gl) gl.style.display = active ? 'block' : 'none';
  }, []);

  // Re-apply sizing when entering/leaving PLAYING so the bottom control
  // strip is reserved (or released) and the canvas is re-anchored.
  useEffect(() => { handleResize(); }, [gameState, handleResize]);

  // Engine lifecycle.
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;
    engine.start();
    // WebGL-Overlay nur initialisieren, wenn der Effekt eingeschaltet ist
    // (Lazy-Init → bei Default 'aus' bleibt die 2D-Pipeline völlig unberührt).
    handleResize();
    // P0 (Touch-Profil): WebGL-Bloom-Post-Pass auf Touch-Geräten (iPad) NICHT
    // automatisch einschalten — der Per-Frame-Full-Canvas-Upload ist dort der
    // teuerste Einzelposten. Auf dem Desktop bleibt der Default (an).
    if (getSettings().webglPost && !touch && glCanvasRef.current) {
      engine.attachPostCanvas(glCanvasRef.current);
      const active = engine.setPostEnabled(true);
      glCanvasRef.current.style.display = active ? 'block' : 'none';
    }

    // Test hook: expose engine on window so Playwright/headless E2E tests
    // can drive the engine deterministically (stop the rAF loop, set
    // input.keys directly, call testStep() to advance N frames, read
    // player/HUD state). Harmless in production: just an inert reference.
    (window as unknown as { __game?: GameEngine }).__game = engine;
    // Test hook: expose the storage getters E2E specs need to assert on
    // (settings/profile state) without re-implementing the validation
    // logic in the test. Harmless inert reference in production.
    (window as unknown as { __storage?: unknown }).__storage = {
      getSettings,
      updateSettings,     // E2E: Settings deterministisch umschalten (QA-Matrix)
      getStickers,
      getActiveProfile,
      listProfiles,
    };

    setGameState(engine.state);
    setUnlocked(engine.getUnlockedLevels());
    setHud(engine.getStats());
    setLevelInfo(engine.getCurrentLevelInfo());
    setMuted(engine.isAudioMuted());

    const offState = engine.on('state', () => {
      setGameState(engine.state);
      setLevelInfo(engine.getCurrentLevelInfo());
      setHud(engine.getStats());
    });
    const offHud = engine.on('hud', () => {
      // 'hud' fires on lives/coins/score changes AND on mute changes (engine
      // routes keyboard 'M' through this event so the icon stays in sync).
      setHud(engine.getStats());
      setMuted(engine.isAudioMuted());
    });
    const offUnlock = engine.on('unlock', () => {
      setUnlocked(engine.getUnlockedLevels());
    });
    // Spielbarkeit (Task #29): Level-Intro-Karte einblenden, sobald
    // ein neues Level startet. Auto-Hide nach 1.2s; cleanup unten
    // räumt einen evtl. noch laufenden Timer ab.
    let introTimer: number | null = null;
    const offLevelStart = engine.on('levelStart', () => {
      const info = engine.getCurrentLevelInfo();
      if (!info) return;
      setIntro({
        index: info.index,
        name: info.name,
        lives: engine.getStats().lives,
        key: Date.now(),
      });
      if (introTimer !== null) window.clearTimeout(introTimer);
      introTimer = window.setTimeout(() => setIntro(null), 1200);
    });
    // Achievement bus: each unlock pushes a toast keyed by Date.now() so
    // identical IDs (defensive) still render distinct entries. Sticker
    // list is also refreshed so the album shows the new badge.
    const offAch = engine.onAchievement((id) => {
      setToasts(prev => [...prev, { id, key: Date.now() + Math.random() }]);
      setStickers(getStickers());
    });

    handleResize();
    window.addEventListener('resize', handleResize);

    // Light HUD poll for time/score during PLAYING (engine doesn't emit per-frame).
    // Während LEVEL_COMPLETE pollen wir zusätzlich die Zeit-Bonus-Felder,
    // damit die Score-Animation flüssig in den Overlay schimmert. Wir
    // tracken den letzten gepushten Bonus-Status in einer lokalen
    // Variable (nicht im React-State!), damit die Closure nicht den
    // stale `bonus`-Wert vom Effect-Mount sieht und der "raus aus
    // LEVEL_COMPLETE → bonus=null"-Branch zuverlässig feuert.
    let lastBonusState: 'idle' | 'active' = 'idle';
    const pollId = window.setInterval(() => {
      const e = engineRef.current;
      if (!e) return;
      if (e.state === GameState.PLAYING) {
        setHud(e.getStats());
        // P0: getDebugInfo() nur pollen, wenn das Debug-Overlay tatsächlich an
        // ist — sonst löst es 6–12×/s unnötig einen Ganzbaum-Re-Render aus.
        if (getSettings().showDebug) setDebugInfo(e.getDebugInfo());
        if (lastBonusState === 'active') {
          setBonus(null);
          lastBonusState = 'idle';
        }
      } else if (e.state === GameState.LEVEL_COMPLETE) {
        setBonus({ initial: e.timeBonusInitial, remaining: e.timeBonusRemaining });
        setHud(e.getStats());
        lastBonusState = 'active';
      } else if (lastBonusState === 'active') {
        setBonus(null);
        lastBonusState = 'idle';
      }
    }, 150);   // P0: 80→150 ms — ~7×/s statt 12,5×/s HUD-Re-Renders

    return () => {
      offState();
      offHud();
      offUnlock();
      offAch();
      offLevelStart();
      if (introTimer !== null) window.clearTimeout(introTimer);
      engine.stop();
      window.removeEventListener('resize', handleResize);
      window.clearInterval(pollId);
      try { delete (window as unknown as { __game?: GameEngine }).__game; } catch { /* ignore */ }
    };
  }, [handleResize]);

  // P0 (Touch-Profil): Wenn ein Menü/Modal offen ist, die Engine anhalten
  // (kein Update/Render/Post → Main-Thread frei für reaktive Knöpfe) und alle
  // Keyframe-Animationen pausieren (Compositor-Entlastung genau beim Bedienen).
  // Zusätzlich: „Bewegung reduzieren" (In-App) blendet CSS-Animationen ganz aus.
  useEffect(() => {
    const open = modal !== null || showQuickSettings;
    engineRef.current?.setUiPaused?.(open);
    document.documentElement.classList.toggle('lf-reduce-motion', !!settings.reducedMotion);
  }, [modal, showQuickSettings, settings.reducedMotion]);

  // Auto-dismiss the head toast after 3s. Chain via length-dep effect so
  // backed-up toasts each get their own 3s window.
  useEffect(() => {
    if (toasts.length === 0) return;
    const t = window.setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 3000);
    return () => window.clearTimeout(t);
  }, [toasts]);

  // Vibration cues bound to engine HUD changes (life lost) and state transitions.
  const prevLivesRef = useRef<number>(hud.lives);
  useEffect(() => {
    if (hud.lives < prevLivesRef.current) vibrate(40);
    prevLivesRef.current = hud.lives;
  }, [hud.lives]);

  // --- Action handlers (also bind for touch via pointerdown) ---
  // Effektiver Freischalt-Stand: im Mathe-Modus die eigene, quiz-gesteuerte
  // Progression (settings.mathUnlocked), sonst die normale Kampagne.
  const effUnlocked = settings.mathMode ? settings.mathUnlocked : unlocked;
  const startLevel = (i: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (i >= effUnlocked) return;
    engine.startLevelByIndex(i);
    forceTick(n => n + 1);
  };
  const togglePause = () => engineRef.current?.togglePause();
  // P2.2: Dezentes Klick-Feedback für Menü-Buttons. Nutzt den kurzen „select"-Ton
  // etwas tiefer & leiser (via Pitch) — respektiert Ton-Aus/SFX-Lautstärke von
  // selbst (playSfx läuft über sfxGain). Fehler ignorieren (Audio evtl. nicht bereit).
  const uiClick = () => { try { audio.playSfx('select', 0, 0.72); } catch { /* Audio noch nicht bereit */ } };
  const toggleMute = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const m = engine.toggleMute();
    setMuted(m);
  };
  const goTitle = () => engineRef.current?.returnToTitle();
  const restart = () => engineRef.current?.restartCurrentLevel();
  const nextLevel = () => engineRef.current?.continueToNextLevel();
  // Mathe-Modus: Quiz nach dem Level bestanden → nächstes Level freischalten und
  // hineingehen. Nicht bestanden → kompletter Reset auf Level 1.
  const onQuizPass = () => {
    const idx = engineRef.current?.currentLevelIndex ?? 0;
    const next = Math.min(LEVELS.length, idx + 2);
    applySettingsPatch({ mathUnlocked: Math.max(settings.mathUnlocked, next) });
    setShowQuiz(false);
    if (idx + 1 < LEVELS.length) nextLevel();
    else {
      // Letztes Level des Spiels geschafft → kurzer Extra-Tusch obendrauf.
      try { audio.playSfx('oneUp'); } catch { /* Audio evtl. nicht init – egal */ }
      setMathMsg('Fantastisch — du hast ALLE Level geschafft! 🎉'); goTitle();
    }
  };
  const onQuizFail = () => {
    applySettingsPatch({ mathUnlocked: 1 });
    setShowQuiz(false);
    setMathMsg('Leider nicht geschafft — wir fangen wieder bei Level 1 an. Du schaffst das! 💪');
    goTitle();
  };
  // Pause→Levelauswahl: same as Quit-to-Title for engine semantics, but
  // worded "Levelauswahl" so kids understand they go back to the picker.
  const goLevelSelect = () => engineRef.current?.returnToTitle();
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        el.requestFullscreen?.().catch(() => { /* user-gesture / not allowed */ });
      } else {
        document.exitFullscreen?.().catch(() => { /* ignore */ });
      }
    } catch { /* ignore */ }
  }, []);

  // Track fullscreen + viewport orientation so we can show the rotate-device
  // overlay on touch portrait, and keep the fullscreen button icon in sync.
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    const onOrient = () => {
      if (typeof window === 'undefined') return;
      setIsPortrait(window.innerHeight > window.innerWidth);
      setSmallPhone(Math.min(window.innerWidth, window.innerHeight) < 480);
    };
    onFs();
    onOrient();
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('resize', onOrient);
    window.addEventListener('orientationchange', onOrient);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('resize', onOrient);
      window.removeEventListener('orientationchange', onOrient);
    };
  }, []);

  // Modal Esc-to-close + body scroll lock not strictly needed (game is
  // already fixed full-screen) but Esc support matters for keyboard users.
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setModal(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [modal]);

  // --- Touch gamepad pointer handlers ---
  // We use pointer events so multitouch works (left+jump together).
  // Touch D-Pad binding. We deliberately do NOT call setPointerCapture
  // here: capturing would route ALL further pointer events to the
  // originating button, so a finger sliding off Left → Right (a common
  // "shimmy" while platforming) would never release Left and never
  // engage Right. Without capture, pointerLeave/pointerEnter on each
  // button do the right thing, and a single rolling finger seamlessly
  // hands off between siblings.
  const bindHold = (setter: (v: boolean) => void) => ({ onActivate: setter });
  // Double-tap-to-run: tap a direction, then press it again within the
  // window and HOLD → sprint while held. Replaces the dedicated RUN button.
  const dpadRun = dpadRunRef.current;
  const DOUBLE_TAP_MS = 280;
  const handleDir = (dir: 'left' | 'right', v: boolean) => {
    const e = engineRef.current; if (!e) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (v) {
      const wasActive = dir === 'left' ? e.input.touchLeft : e.input.touchRight;
      if (dir === 'left') e.input.touchLeft = true; else e.input.touchRight = true;
      if (!wasActive) vibrate(10);
      // Second tap of the SAME direction within the window → start running.
      if (now - dpadRun.lastRelease[dir] < DOUBLE_TAP_MS) {
        dpadRun.running = dir;
        e.input.touchRun = true;
        vibrate(20);
      }
    } else {
      if (dir === 'left') e.input.touchLeft = false; else e.input.touchRight = false;
      dpadRun.lastRelease[dir] = now;
      // Releasing the running direction ends the sprint.
      if (dpadRun.running === dir) {
        dpadRun.running = null;
        e.input.touchRun = false;
      }
    }
  };
  const setLeft = (v: boolean) => handleDir('left', v);
  const setRight = (v: boolean) => handleDir('right', v);
  const setJump = (v: boolean) => {
    const e = engineRef.current; if (!e) return;
    e.input.touchJump = v;
    if (v) vibrate(15);
  };
  const setRun = (v: boolean) => { const e = engineRef.current; if (e) e.input.touchRun = v; };
  const setDown = (v: boolean) => { const e = engineRef.current; if (e) e.input.touchDown = v; };
  // --- Floating Virtual Stick (AP 1.8) -----------------------------------
  // Erscheint dort, wo der Daumen die linke Zone zuerst berührt; die Auslenkung
  // steuert links/rechts (+ Rennen bei voller Auslenkung) und Ducken (nach
  // unten). Setzt die touch-Felder direkt (eigene Renn-Logik, kein Doppeltipp).
  const setStickInput = (left: boolean, right: boolean, down: boolean, run: boolean) => {
    const e = engineRef.current; if (!e) return;
    e.input.touchLeft = left;
    e.input.touchRight = right;
    e.input.touchDown = down;
    e.input.touchRun = run;
  };
  const onStickStart = (ev: React.TouchEvent) => {
    const t = ev.changedTouches[0];
    stickRef.current = { id: t.identifier, baseX: t.clientX, baseY: t.clientY };
    setStickView({ baseX: t.clientX, baseY: t.clientY, knobX: t.clientX, knobY: t.clientY });
    vibrate(10);
  };
  const onStickMove = (ev: React.TouchEvent) => {
    const s = stickRef.current; if (!s) return;
    let t: React.Touch | null = null;
    for (let i = 0; i < ev.changedTouches.length; i++) {
      if (ev.changedTouches[i].identifier === s.id) { t = ev.changedTouches[i]; break; }
    }
    if (!t) return;
    const dx = t.clientX - s.baseX;
    const dy = t.clientY - s.baseY;
    const maxR = 56;
    const dist = Math.hypot(dx, dy) || 1;
    const clamp = dist > maxR ? maxR / dist : 1;
    setStickView({ baseX: s.baseX, baseY: s.baseY, knobX: s.baseX + dx * clamp, knobY: s.baseY + dy * clamp });
    // Hysterese: eine bereits aktive Richtung wird erst gelöst, wenn der Finger
    // DEUTLICH zurückgeht (OFF), während das Einschalten erst ab ON greift. So
    // lässt ein an der Schwelle wackelnder Daumen links/rechts/Ducken nicht
    // flattern (sonst pendelt die Geschwindigkeit → Zittern beim Wechsel/Loslassen).
    const e = engineRef.current;
    const ON = 14, OFF = 7, RUN = 38, DOWN_ON = 24, DOWN_OFF = 14;
    const curLeft = e?.input.touchLeft ?? false;
    const curRight = e?.input.touchRight ?? false;
    const curDown = e?.input.touchDown ?? false;
    const left = dx < -(curLeft ? OFF : ON);
    const right = dx > (curRight ? OFF : ON);
    const down = dy > (curDown ? DOWN_OFF : DOWN_ON);
    setStickInput(left, right, down, Math.abs(dx) > RUN);
  };
  const onStickEnd = (ev: React.TouchEvent) => {
    const s = stickRef.current; if (!s) return;
    for (let i = 0; i < ev.changedTouches.length; i++) {
      if (ev.changedTouches[i].identifier === s.id) {
        stickRef.current = null;
        setStickView(null);
        setStickInput(false, false, false, false);
        return;
      }
    }
  };
  // Touch-Feuer: spiegelt die F-Taste auf Mobile. Just-pressed-Flag wird in
  // input.ts beim flachen Klick gesetzt, damit nur ein Feuerball pro Tap entsteht.
  const setFire = (v: boolean) => {
    const e = engineRef.current; if (!e) return;
    e.input.touchFire = v;
    if (v) vibrate(10);
  };

  // Touch-Superkraft: spiegelt die Q-Taste. Löst den Radschlag / Einbein-
  // Hüpfer aus, der alle Gegner auf dem Bildschirm besiegt.
  const setSuper = (v: boolean) => {
    const e = engineRef.current; if (!e) return;
    e.input.touchSuper = v;
    if (v) vibrate(18);
  };

  // Touch-Dash („Ship it!"): spiegelt die E-Taste. Kurzer Horizontal-Boost.
  const setDash = (v: boolean) => {
    const e = engineRef.current; if (!e) return;
    e.input.touchDash = v;
    if (v) vibrate(12);
  };

  // Touch-Greifhaken: spiegelt die G-Taste. Haken schräg-oben in Blickrichtung.
  const setGrapple = (v: boolean) => {
    const e = engineRef.current; if (!e) return;
    e.input.touchGrapple = v;
    if (v) vibrate(12);
  };

  const showHud = gameState === GameState.PLAYING || gameState === GameState.PAUSED;
  const themeBadge: Record<string, string> = {
    jungle: '#3ab54a', cave: '#cc9944', sky: '#88ccff', beach: '#40c8d0', australia: '#d4a050',
    volcano: '#ffaa55', ice: '#dff6ff', castle: '#cccccc', underwater: '#aae0ff', space: '#c266ff',
    // v464: die drei neuen Welten bekommen eigene Akzente (vorher grauer Fallback).
    school: '#e0b45a', gym: '#4aa3e0', trampoline: '#b45ad8', bluefield: '#5a86f0',
    plush: '#f0a6c8', forest: '#5aa860', city: '#8a93a6', vacation: '#37b6c2',
  };
  // Mini-Vorschau je Welt: charakteristischer Verlauf + Symbol fürs Level-Grid.
  const themePreview: Record<string, { grad: string; icon: string }> = {
    jungle:     { grad: 'linear-gradient(160deg,#46c45a,#176e2a)', icon: '🌴' },
    cave:       { grad: 'linear-gradient(160deg,#7a5630,#241608)', icon: '🦇' },
    sky:        { grad: 'linear-gradient(160deg,#9ad6ff,#5a9ad8)', icon: '☁️' },
    beach:      { grad: 'linear-gradient(160deg,#54d0d8,#ecdc9a)', icon: '🏖️' },
    australia:  { grad: 'linear-gradient(160deg,#e2b262,#9c5e26)', icon: '🦘' },
    volcano:    { grad: 'linear-gradient(160deg,#e8632e,#641608)', icon: '🌋' },
    ice:        { grad: 'linear-gradient(160deg,#c2ecff,#74b6e2)', icon: '❄️' },
    castle:     { grad: 'linear-gradient(160deg,#6c4c84,#281838)', icon: '👻' },
    underwater: { grad: 'linear-gradient(160deg,#2a78bc,#082f5c)', icon: '🐠' },
    space:      { grad: 'linear-gradient(160deg,#3c2266,#0a0a1e)', icon: '🚀' },
    // v464: die drei neuen Welten mit eigenem, thematisch passendem Icon +
    // Verlauf (vorher grauer Controller-Fallback „🎮"). Jetzt einheitlich.
    school:     { grad: 'linear-gradient(160deg,#e6d3a4,#7a5a34)', icon: '🏫' },
    gym:        { grad: 'linear-gradient(160deg,#e8c074,#2f6fc0)', icon: '🤸' },
    trampoline: { grad: 'linear-gradient(160deg,#8a4fd8,#241848)', icon: '🎪' },
    bluefield:  { grad: 'linear-gradient(160deg,#5a86f0,#152a72)', icon: '💡' },
    plush:      { grad: 'linear-gradient(160deg,#f6c6dc,#b98fd0)', icon: '🧸' },
    forest:     { grad: 'linear-gradient(160deg,#3e8e4e,#12351f)', icon: '🌲' },
    city:       { grad: 'linear-gradient(160deg,#3d3357,#1a1626)', icon: '🏙️' },
    vacation:   { grad: 'linear-gradient(160deg,#7ec8f2,#2f8f5a)', icon: '🏔️' },
  };

  // Keyboard navigation for the 5×2 level-select grid.
  //
  // - Enter / Space starts the focused level (existing behavior).
  // - ArrowLeft / ArrowRight / ArrowUp / ArrowDown move focus between
  //   level cards (roving tabindex pattern). Up/Down move by one full
  //   row (5 columns), Left/Right by one column. Wrapping is clamped at
  //   the grid edges so focus never leaves the group.
  // - Home / End jump to the first / last card.
  //
  // Tab still moves focus into and out of the group naturally because
  // every card carries `tabIndex=0`. Disabled cards still receive focus
  // so kids can arrow over the locked levels and see what's coming.
  const onLevelKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Locked cards stay focusable (so kids can arrow-scan ahead) but
      // pressing Enter/Space on a locked card must NOT start the level.
      if (i < unlocked) startLevel(i);
      return;
    }
    const cols = 5;
    const last = LEVELS.length - 1;
    let next = -1;
    switch (e.key) {
      case 'ArrowRight': next = Math.min(last, i + 1); break;
      case 'ArrowLeft':  next = Math.max(0, i - 1); break;
      case 'ArrowDown':  next = Math.min(last, i + cols); break;
      case 'ArrowUp':    next = Math.max(0, i - cols); break;
      case 'Home':       next = 0; break;
      case 'End':        next = last; break;
      default: return;
    }
    e.preventDefault();
    const target = e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
      `[data-testid="button-level-${next}"]`,
    );
    target?.focus();
  };

  // Wendet einen Settings-Patch an und schiebt die Änderung sofort in
  // Audio/Engine/Canvas. Von Quick-Settings (Startseite) und dem
  // Settings-Modal gemeinsam genutzt.
  const applySettingsPatch = (patch: Partial<Settings>) => {
    updateSettings(patch);
    setSettings(getSettings());
    audio.applyVolume();
    handleResize();
    if (patch.webglPost !== undefined) applyPost(patch.webglPost);
    if (patch.unlockAllWorlds !== undefined) {
      setUnlocked(engineRef.current?.getUnlockedLevels() ?? 1);
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="game-container"
      style={{
        width: '100vw',
        height: '100dvh',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: (touch && gameState === GameState.PLAYING) ? 'flex-start' : 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        fontFamily: 'monospace',
      }}
    >
      {debugInfo && settings.showDebug && gameState === GameState.PLAYING && (
        <div
          data-testid="debug-overlay"
          style={{
            position: 'absolute', top: 52, right: 10, zIndex: 25,
            font: '10px/1.4 ui-monospace, Menlo, Consolas, monospace',
            color: debugInfo.fps >= 55 ? 'rgba(150,240,170,0.82)'
                 : debugInfo.fps >= 45 ? 'rgba(255,214,123,0.9)'
                 : 'rgba(255,120,120,0.95)',
            background: 'rgba(0,0,0,0.32)', padding: '2px 6px', borderRadius: 5,
            pointerEvents: 'none', whiteSpace: 'pre', letterSpacing: '0.2px',
            textAlign: 'right',
          }}
        >
          {`${debugInfo.fps} FPS · ${debugInfo.frameMs} ms\n${debugInfo.auto ? 'auto·' : ''}${debugInfo.quality}${debugInfo.lowFx ? ' ⚠' : ''}`}
        </div>
      )}
      {/* Global focus-ring style for keyboard users. Pointer interactions
          stay clean; only :focus-visible (keyboard) shows the gold outline. */}
      <style>{`
        button:focus-visible, [role="button"]:focus-visible, input:focus-visible {
          outline: 3px solid #ffd54a !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.6) !important;
        }
        [data-testid^="button-level-"]:not([aria-disabled="true"]) {
          transition: transform 140ms cubic-bezier(.2,.8,.2,1), box-shadow 200ms ease-out, border-color 200ms ease-out;
        }
        [data-testid^="button-level-"]:not([aria-disabled="true"]):hover {
          transform: translateY(-5px) scale(1.04);
        }
        [data-testid^="button-level-"]:not([aria-disabled="true"]):active {
          transform: translateY(-1px) scale(0.99);
        }
        /* ── Startscreen-Animationen ──────────────────────────────── */
        @keyframes lf-float-up {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: var(--lf-op, 0.5); }
          90%  { opacity: var(--lf-op, 0.5); }
          100% { transform: translateY(-120vh) rotate(var(--lf-rot, 180deg)); opacity: 0; }
        }
        @keyframes lf-title-float {
          0%,100% { transform: translateY(0) rotate(-1deg); }
          50%     { transform: translateY(-8px) rotate(1deg); }
        }
        /* Hero-Bühne: Figuren laufen echt (4 Frames), dazu feiner Lauf-Hüpfer,
           Wolken driften. */
        @keyframes lf-hero-legcycle {
          from { background-position-x: 0%; }
          to   { background-position-x: 100%; }
        }
        @keyframes lf-hero-hopC {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%     { transform: translateX(-50%) translateY(-3%); }
        }
        @keyframes lf-hero-cloud {
          from { transform: translateX(-130%); }
          to   { transform: translateX(520%); }
        }
        /* Parallax-Spur: 200% breit (zwei nahtlose Kacheln), eine Kachelbreite
           nach links = nahtlose Endlosschleife. */
        @keyframes lf-parscroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        /* Sammel-Objekte: fliegen nach links und werden auf Figuren-Höhe
           „eingesammelt" (kurz aufblitzen + verschwinden), dann respawnen. */
        .lf-hero-collectible {
          position: absolute; left: 104%; width: 3%; aspect-ratio: 1 / 1;
          animation-name: lf-hero-fly; animation-timing-function: linear; animation-iteration-count: infinite;
          will-change: left; transition: opacity .22s ease, transform .22s ease;
        }
        .lf-hero-collectible.lf-collected { opacity: 0; transform: scale(1.9); }
        .lf-hero-coin {
          border-radius: 50%;
          background: radial-gradient(circle at 36% 30%, #fff4b8, #ffd166 55%, #d99a2a 100%);
          box-shadow: 0 0 7px rgba(255,209,102,0.75), inset 0 -2px 3px rgba(150,100,20,0.5), inset 0 2px 2px rgba(255,255,255,0.65);
        }
        .lf-hero-star {
          background: #ffe27a; box-shadow: 0 0 8px rgba(255,226,122,0.85);
          clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        }
        @keyframes lf-hero-fly { from { left: 104%; } to { left: -12%; } }
        .lf-hero-burst {
          position: absolute; width: 7%; aspect-ratio: 1 / 1; transform: translate(-50%, -50%);
          border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, rgba(255,247,205,0.95), rgba(255,209,102,0.5) 45%, rgba(255,209,102,0) 70%);
          animation: lf-hero-burst .6s ease-out both;
        }
        @keyframes lf-hero-burst {
          0%   { transform: translate(-50%,-50%) scale(0.3); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
        }
        @keyframes lf-sheen {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .lf-hero-card { transition: transform 180ms cubic-bezier(.2,.8,.3,1), filter 180ms ease, border-color 180ms ease; }
        .lf-hero-card:hover { transform: translateY(-6px) scale(1.03); filter: brightness(1.07); }
        .lf-hero-card:active { transform: translateY(-2px) scale(1.0); }
        .lf-hero-card:focus-visible { outline: 2px solid rgba(255,255,255,0.8); outline-offset: 3px; }
        .lf-topbtn { transition: filter 160ms ease, background 200ms ease; }
        .lf-topbtn:hover { filter: brightness(1.13); }
        .lf-topbtn:active { filter: brightness(0.94); }
        .lf-topbtn:focus-visible { outline: 2px solid rgba(255,255,255,0.75); outline-offset: 2px; }
        .lf-level-card { transition: transform 160ms cubic-bezier(.2,.8,.3,1), filter 160ms ease; }
        .lf-level-card:not([aria-disabled="true"]):hover { transform: translateY(-5px) scale(1.02); filter: brightness(1.08); }
        .lf-level-card:not([aria-disabled="true"]):active { transform: translateY(-1px) scale(0.99); }
        .lf-level-card:focus-visible { outline: 2px solid rgba(255,255,255,0.75); outline-offset: 2px; }
        @keyframes lf-hero-hop {
          0%, 100% { transform: translateY(0); }
          42% { transform: translateY(-9px); }
          58% { transform: translateY(-9px); }
        }
        @keyframes lf-hero-idle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(-1.5deg); }
        }
        @keyframes lf-pop-in {
          0%   { transform: translateY(16px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes lf-panel-slide {
          0%   { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        /* P2.3: sanft auf-und-ab hüpfender „mehr Level ↓"-Pfeil. */
        @keyframes lf-bounce-down { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
        .lf-bounce-down { display: inline-block; animation: lf-bounce-down 1.1s ease-in-out infinite; }
        /* Meilenstein-Feier: Banner „poppt" auf, Konfetti fällt herab. */
        @keyframes lf-celebrate-pop {
          0% { transform: scale(0.6); opacity: 0; }
          55% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes lf-confetti-fall {
          0% { transform: translateY(-40px) rotate(0deg); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translateY(88vh) rotate(var(--lf-cspin, 360deg)); opacity: 0; }
        }
        .lf-confetti { position: absolute; top: 0; animation: lf-confetti-fall linear forwards; will-change: transform, opacity; }
        @media (prefers-reduced-motion: reduce) {
          .lf-confetti { display: none; }
        }
        /* Laufende Figuren am unteren Rand. Frame-Wechsel via steps() +
           Bewegung quer über den Bildschirm. */
        @keyframes lf-run-fiona { from { background-position-x: 0; } to { background-position-x: -188px; } }
        @keyframes lf-run-lea   { from { background-position-x: 0; } to { background-position-x: -284px; } }
        @keyframes lf-walk-rl   { from { transform: translateX(-140px); } to { transform: translateX(calc(100vw + 140px)); } }
        @keyframes lf-runhop { 0%, 100% { transform: translateY(0); } 45% { transform: translateY(-9px); } }
        .lf-runwrap { position: absolute; will-change: transform; pointer-events: none; }
        .lf-runner { position: absolute; will-change: transform, background-position; pointer-events: none; background-repeat: no-repeat; }
        @media (prefers-reduced-motion: reduce) { .lf-runner, .lf-runwrap { display: none; } }
        .lf-floaty { position: absolute; will-change: transform, opacity; animation: lf-float-up linear infinite; pointer-events: none; }
        @keyframes lf-continue-pulse {
          0%, 100% { box-shadow: 0 8px 22px rgba(255,110,90,0.42), inset 0 1px 0 rgba(255,255,255,0.55); transform: translateY(0) scale(1); }
          50%      { box-shadow: 0 12px 30px rgba(255,110,90,0.62), inset 0 1px 0 rgba(255,255,255,0.55); transform: translateY(-1px) scale(1.025); }
        }
        .lf-continue-btn { animation: lf-continue-pulse 2.4s ease-in-out infinite; transition: transform 0.12s ease, filter 0.12s ease; }
        .lf-continue-btn:hover { filter: brightness(1.06); }
        .lf-continue-btn:active { transform: scale(0.96); animation: none; }
        @media (prefers-reduced-motion: reduce) { .lf-continue-btn { animation: none !important; } }
        @media (prefers-reduced-motion: reduce) {
          .lf-floaty, .lf-title, .lf-hero-stage, .lf-hero-cloud, .lf-hero-stage img, .lf-par-track { animation: none !important; }
          .lf-hero-collectible, .lf-hero-burst { display: none !important; }
        }
        /* Querformat auf niedrigen Geräten (z.B. iPhone quer): kompakteres
           Layout, damit Titel, Button und Levelraster ohne Abschneiden in die
           geringe Höhe passen und sauber von oben ausgerichtet sind. */
        @media (orientation: landscape) and (max-height: 560px) {
          .lf-title-overlay { justify-content: flex-start !important; padding: 6px 14px 10px !important; gap: 4px; }
          .lf-title { font-size: clamp(20px, 5vh, 32px) !important; }
          .lf-title-sub { font-size: 11px !important; letter-spacing: 0.12em !important; margin-top: 3px !important; }
          .lf-continue-btn { margin-bottom: 8px !important; padding: 9px 24px !important; }
          .lf-level-grid { max-height: 72vh !important; gap: 8px !important; grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)) !important; }
          .lf-level-card { min-height: 92px !important; padding: 7px 8px !important; }
          .lf-card-preview { height: 24px !important; margin-bottom: 5px !important; font-size: 16px !important; }
          /* Figurenwahl: Hero kleiner + beschreibenden Tag ausblenden, damit die
             Auswahl-Pillen sicher im Bild bleiben und gut tappbar sind. */
          .lf-hero-stage { width: min(40vw, 200px) !important; margin-top: 0 !important; }
          .lf-title-tag { display: none !important; }
        }
        /* Sehr flaches Querformat (iPhone quer): Hero noch kompakter. */
        @media (orientation: landscape) and (max-height: 430px) {
          .lf-hero-stage { width: min(30vw, 150px) !important; }
          .lf-title { font-size: clamp(16px, 4.4vh, 24px) !important; }
        }
      `}</style>

      <div style={{ position: 'relative', display: 'block' }}>
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          aria-label="Spielfeld"
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
        {/* WebGL-Bloom-Overlay (Gate G2). Deckungsgleich, display per JS
            umgeschaltet; verschluckt keine Pointer-Events. */}
        <canvas
          ref={glCanvasRef}
          data-testid="game-canvas-gl"
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, left: 0, imageRendering: 'pixelated', display: 'none', pointerEvents: 'none' }}
        />
      </div>

      {/* Top-right HUD button cluster — NUR im Spiel/Ende, NICHT im Titel/Level-
          Auswahl. Dort gibt es die eigene Kopfleiste (Profil-Pille + Quick-
          Settings), sonst überlappen sich die beiden Leisten. */}
      {gameState !== GameState.TITLE && (
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          gap: 8,
          zIndex: 30,
        }}
        role="group"
        aria-label="Schnellaktionen"
      >
        <HudButton
          testId="button-profile"
          onClick={() => { refreshProfileState(); setModal('profiles'); }}
          title={`Profil: ${activeProfile.name}`}
          ariaLabel={`Profil wechseln (aktuell: ${activeProfile.name})`}
        >
          👤
        </HudButton>
        <HudButton
          testId="button-album"
          onClick={() => { audio.playSfx('albumOpen'); refreshProfileState(); setModal('album'); }}
          title="Sticker-Album"
          ariaLabel="Sticker-Album öffnen"
        >
          🏅
        </HudButton>
        <HudButton
          testId="button-shop"
          onClick={() => { audio.playSfx('albumOpen'); refreshProfileState(); setModal('shop'); }}
          title="Kuschel-Shop"
          ariaLabel="Kuschel-Shop öffnen"
        >
          🛍️
        </HudButton>
        <HudButton
          testId="button-settings"
          onClick={() => { refreshProfileState(); setModal('settings'); }}
          title="Einstellungen"
          ariaLabel="Einstellungen öffnen"
        >
          ⚙
        </HudButton>
        <HudButton testId="button-mute" onClick={toggleMute} title={muted ? 'Ton an' : 'Ton aus'} ariaLabel={muted ? 'Ton einschalten' : 'Ton ausschalten'}>
          {muted ? '🔇' : '🔊'}
        </HudButton>
        <HudButton testId="button-fullscreen" onClick={toggleFullscreen} title={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'} ariaLabel={isFullscreen ? 'Vollbild verlassen' : 'Vollbild aktivieren'}>
          {isFullscreen ? '⤢' : '⛶'}
        </HudButton>
        {showHud && (
          <HudButton testId="button-pause" onClick={togglePause} title="Pause" ariaLabel={gameState === GameState.PAUSED ? 'Spiel fortsetzen' : 'Spiel pausieren'}>
            {gameState === GameState.PAUSED ? '▶' : '⏸'}
          </HudButton>
        )}
      </div>
      )}

      {/* Portrait-rotation hint: only on touch devices in portrait orientation.
          Pointer-events stay enabled so the user can dismiss / interact. */}
      {touch && isPortrait && smallPhone && (
        <div
          data-testid="portrait-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            textAlign: 'center',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 14 }}>📱➡️</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 6 }}>Bitte drehen</div>
          <div style={{ fontSize: 13, opacity: 0.8, maxWidth: 320 }}>
            Lea und Fiona spielt sich im Querformat am besten — bitte dreh dein Gerät.
          </div>
        </div>
      )}

      {/* Title overlay: clickable level grid. */}
      {gameState === GameState.TITLE && (
        <div
          data-testid="title-overlay"
          className="lf-title-overlay"
          // P2.2: Ein dezentes Klick-Feedback für ALLE Menü-Buttons im Titel-
          // /Levelauswahl-Overlay — zentral in der Capture-Phase, damit kein
          // Button einzeln verkabelt werden muss. Level-Karten sind ausgenommen
          // (die haben ihren eigenen Start-Sound), damit sich nichts überlagert.
          onClickCapture={(e) => {
            const btn = (e.target as HTMLElement)?.closest?.('button');
            if (!btn) return;
            const tid = btn.getAttribute('data-testid') || '';
            if (tid.startsWith('button-level-')) return;
            uiClick();
          }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'clamp(6px, 1.5vh, 12px) 16px clamp(12px, 3vh, 24px)',
            pointerEvents: 'none',
            zIndex: 20,
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            background: 'radial-gradient(80% 55% at 50% 24%, rgba(130,160,255,0.10) 0%, rgba(130,160,255,0) 60%), radial-gradient(120% 90% at 50% 6%, rgba(12,9,40,0.04) 0%, rgba(10,8,34,0.22) 55%, rgba(7,5,26,0.30) 100%), radial-gradient(150% 120% at 50% 42%, rgba(0,0,0,0) 58%, rgba(6,4,20,0.26) 100%)',
          }}
        >
          {/* P4: Meilenstein-Feier — Konfetti + Banner, wenn erstmals 5/10/alle
              Welten geschafft sind. Rein visuell, blendet sich selbst aus. */}
          {celebrateMilestone != null && (() => {
            // Großes Finale (alle Welten) fällt spürbar größer aus als ein
            // Zwischen-Meilenstein: mehr Konfetti, größeres Banner, goldener Rahmen.
            const isFinal = celebrateMilestone >= LEVELS.length;
            // Barrierefreiheit (E3): „Bewegung reduzieren" → kein Konfetti-Regen
            // (das Banner bleibt, damit der Meilenstein trotzdem gefeiert wird).
            const pieces = settings.reducedMotion ? 0 : (isFinal ? 60 : 26);
            const emojis = isFinal ? ['🎉','🏆','⭐','🎈','💛','🌈','✨','🍬','🎊','👑'] : ['🎉','⭐','🎈','💛','🌈','✨','🍬'];
            return (
            <div data-testid="milestone-celebration" data-final={isFinal ? 'true' : 'false'} aria-live="polite" style={{
              position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {Array.from({ length: pieces }).map((_, i) => {
                const em = emojis[i % emojis.length];
                const left = (i * 37 + 7) % 100;
                const dur = (isFinal ? 2.8 : 2.4) + (i % 5) * 0.5;
                const delay = (i % (isFinal ? 9 : 6)) * 0.12;
                const size = (isFinal ? 16 : 14) + (i % 4) * (isFinal ? 8 : 6);
                const spin = (i % 2 ? 1 : -1) * (360 + (i % 3) * 180);
                return (
                  <span key={i} className="lf-confetti" style={{
                    left: `${left}%`, fontSize: size,
                    animationDuration: `${dur}s`, animationDelay: `${delay}s`,
                    ['--lf-cspin' as string]: `${spin}deg`,
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
                  }}>{em}</span>
                );
              })}
              <div style={{
                animation: `lf-celebrate-pop ${isFinal ? 520 : 420}ms cubic-bezier(.2,.9,.3,1.2) both`,
                textAlign: 'center', padding: isFinal ? '26px 40px' : '18px 26px', borderRadius: isFinal ? 26 : 22,
                background: isFinal
                  ? 'linear-gradient(160deg, rgba(58,40,96,0.96), rgba(26,18,52,0.96))'
                  : 'linear-gradient(160deg, rgba(40,28,72,0.94), rgba(20,14,40,0.94))',
                border: isFinal ? '2px solid rgba(255,214,120,0.85)' : '1px solid rgba(255,214,120,0.5)',
                boxShadow: isFinal
                  ? '0 26px 80px rgba(0,0,0,0.6), 0 0 46px rgba(255,205,90,0.55)'
                  : '0 20px 60px rgba(0,0,0,0.55), 0 0 26px rgba(255,200,90,0.35)',
                color: '#fff',
              }}>
                <div style={{ fontSize: isFinal ? 64 : 44, lineHeight: 1, marginBottom: isFinal ? 8 : 6 }}>{isFinal ? '🏆' : '🎉'}</div>
                <div style={{
                  fontSize: isFinal ? 26 : 20, fontWeight: 900, letterSpacing: '0.01em',
                  ...(isFinal ? { background: 'linear-gradient(90deg,#ffe27a,#ff9f5a,#ff77b0)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' } : {}),
                }}>
                  {isFinal ? `Alle ${LEVELS.length} Welten geschafft!` : `${celebrateMilestone} Welten geschafft!`}
                </div>
                <div style={{ marginTop: isFinal ? 6 : 4, fontSize: isFinal ? 15 : 13, fontWeight: 600, color: '#ffe6a6' }}>
                  {isFinal ? '🌟 Du hast das ganze Abenteuerland gemeistert! 🌟' : 'Weiter so — das nächste Ziel wartet!'}
                </div>
              </div>
            </div>
            );
          })()}
          {/* Sichtbarer Build-/Versions-Stempel (Bauzeit) — unten rechts, dezent.
              So ist auf einen Blick prüfbar, ob die neueste Version live ist. */}
          <div style={{
            position: 'absolute', right: 8, bottom: 6, zIndex: 30, pointerEvents: 'none',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
            color: 'rgba(255,255,255,0.42)', fontFamily: 'ui-monospace, Menlo, monospace',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}>
            v{typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'}
          </div>
          {/* Schwebende Deko — steigt langsam auf (rein dekorativ). */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {['🪙','🌈','🍬','🦋','💛','🎈','🌸','🪙','🍭','💫','🍬','🎈','🦋','💛'].map((em, i) => {
              const left = (i * 67 + 9) % 100;
              const dur = 13 + (i % 5) * 2.4;
              const delay = -((i * 1.9) % dur);
              const size = 16 + (i % 4) * 7;
              const op = 0.32 + (i % 3) * 0.12;
              const rot = (i % 2 ? 1 : -1) * (120 + (i % 3) * 90);
              return (
                <span key={i} className="lf-floaty" style={{
                  left: `${left}%`, bottom: '-8vh', fontSize: size,
                  animationDuration: `${dur}s`, animationDelay: `${delay}s`,
                  ['--lf-op' as string]: op, ['--lf-rot' as string]: `${rot}deg`,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                }}>{em}</span>
              );
            })}
          </div>

          {/* Laufende Figuren am unteren Rand (dekorativ). Auf der Figurenwahl
              ausgeblendet, da das große Hero-Bild die Figuren bereits zeigt. */}
          {charPicked && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0, opacity: 0.5 }}>
            <div className="lf-runwrap" style={{
              left: 0, bottom: 'clamp(4px, 1.5vh, 16px)', width: 47, height: 72,
              animation: 'lf-walk-rl 18s linear infinite',
            }}>
              <div style={{
                width: 47, height: 72,
                backgroundImage: `url(${runSheetFiona})`, backgroundSize: '188px 72px', backgroundRepeat: 'no-repeat',
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))',
                animation: 'lf-run-fiona 0.5s steps(4) infinite, lf-runhop 0.9s ease-in-out infinite',
              }} />
            </div>
            <div className="lf-runwrap" style={{
              left: 0, bottom: 'clamp(4px, 1.5vh, 16px)', width: 71, height: 84,
              animation: 'lf-walk-rl 18s linear infinite', animationDelay: '-6.5s',
            }}>
              <div style={{
                width: 71, height: 84,
                backgroundImage: `url(${runSheetLea})`, backgroundSize: '284px 84px', backgroundRepeat: 'no-repeat',
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))',
                animation: 'lf-run-lea 0.55s steps(4) infinite, lf-runhop 1.02s ease-in-out infinite',
              }} />
            </div>
          </div>
          )}

          {/* Top-Bar: Profil (links) + Einstellungen (rechts). */}
          <div style={{
            width: '100%', maxWidth: 880, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            pointerEvents: 'none', position: 'relative', zIndex: 2,
          }}>
            <button
              type="button"
              data-testid="button-profile-pill"
              className="lf-topbtn"
              onClick={() => { refreshProfileState(); setModal('profiles'); }}
              style={{
                pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', minHeight: 44,
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)', touchAction: 'manipulation',
              }}
              aria-label={`Profil wechseln, aktuell ${activeProfile.name}`}
            >
              <span aria-hidden style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(135deg,#ffd54a,#ff77b0)', color: '#1a1230',
                fontWeight: 800, fontSize: 12, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
              }}>{(activeProfile.name || '?').charAt(0).toUpperCase()}</span> {activeProfile.name}{stickers.includes('super_collector') ? ' 👑' : ''}
            </button>

            <button
              type="button"
              data-testid="button-quick-settings"
              className="lf-topbtn"
              onClick={() => setShowQuickSettings((v) => !v)}
              aria-label="Schnell-Einstellungen"
              aria-expanded={showQuickSettings}
              style={{
                pointerEvents: 'auto', width: 44, height: 44, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                background: showQuickSettings ? 'rgba(255,213,74,0.22)' : 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 14, fontSize: 20, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                transition: 'transform 200ms ease, background 200ms ease',
                transform: showQuickSettings ? 'rotate(60deg)' : 'none',
              }}
            >⚙️</button>
          </div>

          {/* Quick-Settings-Panel (ausklappbar, gemerkt). */}
          {showQuickSettings && (
            <div
              data-testid="quick-settings-panel"
              style={{
                position: 'absolute', top: 'clamp(58px, 9vh, 80px)', right: 'clamp(16px, 4vw, 40px)',
                width: 'min(86vw, 300px)', zIndex: 30, pointerEvents: 'auto',
                padding: 16, borderRadius: 18,
                background: 'rgba(18,14,38,0.78)',
                backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(255,255,255,0.16)',
                boxShadow: '0 18px 48px rgba(0,0,0,0.5)',
                color: '#fff', animation: 'lf-panel-slide 200ms ease-out',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, letterSpacing: 0.3 }}>
                Schnell-Einstellungen
              </div>
              {/* Spielfigur Lea/Fiona */}
              <CharacterChooser value={character} onChange={handleCharacterChange} />
              {/* Ton an/aus */}
              <QuickToggle
                label="🔊 Ton" value={!settings.muted}
                onChange={(on) => applySettingsPatch({ muted: !on })}
              />
              {/* Musik */}
              <QuickSlider
                label="🎵 Musik" value={settings.musicVolume}
                onChange={(v) => applySettingsPatch({ musicVolume: v })}
              />
              {/* Sound */}
              <QuickSlider
                label="🔔 Effekte" value={settings.sfxVolume}
                onChange={(v) => applySettingsPatch({ sfxVolume: v })}
              />
              {/* Grillen-Dichte (Nacht-Ambient im Wald) */}
              <QuickSlider
                label="🦗 Grillen (Wald-Nacht)" value={settings.grillenDichte}
                onChange={(v) => applySettingsPatch({ grillenDichte: v })}
              />
              {/* Bildschirmwackeln */}
              <QuickToggle
                label="📳 Wackeln" value={settings.screenShake}
                onChange={(on) => applySettingsPatch({ screenShake: on })}
              />
              {/* Barrierefreiheit (E3): Bewegung reduzieren — kein Wackeln,
                  kein Impact-Zoom, keine kosmetischen Partikel/Konfetti. */}
              <QuickToggle
                label="🧘 Bewegung reduzieren" value={settings.reducedMotion}
                onChange={(on) => applySettingsPatch({ reducedMotion: on })}
              />
              {/* Alle Welten */}
              <QuickToggle
                label="🗺️ Alle Welten" value={settings.unlockAllWorlds}
                onChange={(on) => applySettingsPatch({ unlockAllWorlds: on })}
              />
              {/* Time-Attack-Geist der Bestzeit */}
              <QuickToggle
                label="👻 Bestzeit-Geist" value={settings.showGhost}
                onChange={(on) => applySettingsPatch({ showGhost: on })}
              />
              {/* Performance-Overlay (FPS/Frame-Zeit) — Default aus, nur zum Testen */}
              <QuickToggle
                label="📊 Performance" value={settings.showDebug}
                onChange={(on) => applySettingsPatch({ showDebug: on })}
              />
              {/* Direkt-Zugriffe (früher im separaten HUD oben rechts, das im
                  Titel entfernt wurde, um die Doppel-Leiste zu vermeiden). */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" data-testid="quick-album"
                  onClick={() => { audio.playSfx('albumOpen'); refreshProfileState(); setModal('album'); setShowQuickSettings(false); }}
                  style={{ flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}
                >🏅 Album</button>
                <button type="button" data-testid="quick-shop"
                  onClick={() => { audio.playSfx('albumOpen'); refreshProfileState(); setModal('shop'); setShowQuickSettings(false); }}
                  style={{ flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}
                >🛍️ Shop</button>
                <button type="button" data-testid="quick-settings-full"
                  onClick={() => { refreshProfileState(); setModal('settings'); setShowQuickSettings(false); }}
                  style={{ flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}
                >⚙ Mehr</button>
                <button type="button" data-testid="quick-fullscreen"
                  onClick={toggleFullscreen}
                  style={{ flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 16, cursor: 'pointer', touchAction: 'manipulation' }}
                  aria-label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
                >{isFullscreen ? '⤢' : '⛶'}</button>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickSettings(false)}
                style={{
                  marginTop: 2, padding: '10px 0', borderRadius: 10, border: 'none',
                  background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation',
                }}
              >Schließen</button>
            </div>
          )}

          {/* Hero-Titel — nur auf der Figurenwahl. Macht klar, worum es geht:
              „Lea & Fiona im Abenteuerland", ein Hüpf-Abenteuer durch 14 Welten. */}
          {!charPicked && (
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginTop: 2, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <h1 className="lf-title" style={{
                margin: 0, fontSize: 'clamp(22px, 4.6vw, 42px)', fontWeight: 900,
                letterSpacing: '-0.02em', lineHeight: 1,
                background: 'linear-gradient(100deg, #ffe27a 0%, #ff9f5a 38%, #ff77b0 70%, #b486ff 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                WebkitTextFillColor: 'transparent', color: 'transparent',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.45))',
              }}>
                Lea&nbsp;&amp;&nbsp;Fiona
              </h1>
              <div style={{
                margin: 0, fontSize: 'clamp(13px, 2.6vw, 22px)', fontWeight: 800,
                letterSpacing: '0.14em', lineHeight: 1, textTransform: 'uppercase',
                color: '#ffe6a6', textShadow: '0 2px 10px rgba(0,0,0,0.55)',
              }}>
                im Abenteuerland
              </div>
              <div className="lf-title-tag" style={{
                marginTop: 4, fontSize: 'clamp(10px, 2vw, 13px)', fontWeight: 600,
                color: 'rgba(255,255,255,0.78)', letterSpacing: '0.02em',
                background: 'rgba(16,12,34,0.5)', padding: '3px 14px', borderRadius: 999,
              }}>
                🏃 Renne, hüpfe &amp; sammle durch {LEVELS.length} bunte Welten
              </div>
            </div>
          )}

          {/* Hero-Key-Art: professionelles Titelbild beider Figuren (löst die
              alte Stern-/Emoji-Deko als Blickfang ab). Nur auf der Figurenwahl.
              Animiert: die Figuren „laufen" mit sanftem Lauf-Bob, Wolken driften,
              das Bild schwebt leicht (Parallaxe). Alle Ebenen skalieren über die
              feste Seitenverhältnis-Bühne responsiv mit. */}
          {!charPicked && (
            <div style={{
              position: 'relative', zIndex: 1, width: '100%', display: 'flex',
              justifyContent: 'center', pointerEvents: 'none',
              marginTop: 'clamp(2px, 1.2vh, 10px)',
            }}>
              <div
                className="lf-hero-stage"
                role="img"
                aria-label="Lea und Fiona rennen zusammen ins Abenteuer"
                style={{
                  position: 'relative', width: 'min(86vw, 620px, 72vh)', aspectRatio: '1600 / 820',
                  borderRadius: 24, overflow: 'hidden',
                  boxShadow: '0 18px 40px rgba(20,10,50,0.55), 0 0 0 1px rgba(255,255,255,0.10) inset',
                  animation: 'lf-title-float 6s ease-in-out infinite',
                }}
              >
                {/* Ebene 0 — Himmel (statisch) */}
                <img src={heroSky} alt="" aria-hidden draggable={false}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                {/* Driftende Wolken (eigene Geschwindigkeit) */}
                <div aria-hidden className="lf-hero-cloud" style={{
                  position: 'absolute', top: '13%', width: '26%', height: '11%', borderRadius: '50%',
                  background: 'radial-gradient(closest-side, rgba(255,255,255,0.72), rgba(255,255,255,0))',
                  filter: 'blur(2px)', animation: 'lf-hero-cloud 46s linear infinite',
                }} />
                <div aria-hidden className="lf-hero-cloud" style={{
                  position: 'absolute', top: '24%', width: '20%', height: '9%', borderRadius: '50%',
                  background: 'radial-gradient(closest-side, rgba(255,255,255,0.6), rgba(255,255,255,0))',
                  filter: 'blur(2px)', animation: 'lf-hero-cloud 63s linear infinite', animationDelay: '-24s',
                }} />
                {/* Parallax-Ebenen: je zwei nahtlose Kacheln in einer 200%-Spur,
                    die nach links läuft. Tiefe = Tempo: ferne Hügel langsam,
                    nahe schneller, Boden schnell (Vorwärts-Illusion). Alle
                    „Welt"-Ebenen teilen ein kohärentes, lebhaftes Tempo, damit
                    die Schritte passen (kein Rutschen). Die Sammel-Objekte sind
                    jetzt echte Einzel-Elemente (siehe HeroCollectibles). */}
                {[
                  { src: heroHillsFar, dur: '38s' },
                  { src: heroHillsNear, dur: '20s' },
                  { src: heroGround, dur: '8s' },
                ].map((L, i) => (
                  <div key={i} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                    <div className="lf-par-track" style={{ display: 'flex', width: '200%', height: '100%', animation: `lf-parscroll ${L.dur} linear infinite` }}>
                      <img src={L.src} alt="" draggable={false} style={{ width: '50%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <img src={L.src} alt="" draggable={false} style={{ width: '50%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  </div>
                ))}
                {/* Warme Halos hinter den Figuren (statisch) */}
                <div aria-hidden style={{ position: 'absolute', left: '40%', bottom: '11%', width: '26%', height: '56%', transform: 'translateX(-50%)',
                  background: 'radial-gradient(50% 55% at 50% 46%, rgba(255,236,180,0.42), rgba(255,236,180,0))', filter: 'blur(4px)' }} />
                <div aria-hidden style={{ position: 'absolute', left: '58.5%', bottom: '11%', width: '22%', height: '50%', transform: 'translateX(-50%)',
                  background: 'radial-gradient(50% 55% at 50% 46%, rgba(255,224,190,0.42), rgba(255,224,190,0))', filter: 'blur(4px)' }} />
                {/* Kontaktschatten unter den Figuren (statisch, bleiben am Platz) */}
                <div aria-hidden style={{ position: 'absolute', left: '40%', bottom: '10.2%', width: '13%', height: '4%', transform: 'translateX(-50%)',
                  background: 'radial-gradient(50% 50% at 50% 50%, rgba(15,25,20,0.4), rgba(15,25,20,0))', filter: 'blur(2px)' }} />
                <div aria-hidden style={{ position: 'absolute', left: '58.5%', bottom: '10.4%', width: '11%', height: '3.6%', transform: 'translateX(-50%)',
                  background: 'radial-gradient(50% 50% at 50% 50%, rgba(15,25,20,0.4), rgba(15,25,20,0))', filter: 'blur(2px)' }} />
                {/* Figuren: echter 4-Frame-Laufzyklus (responsiv), fester Standort.
                    Bein-Takt auf das lebhafte Welt-Tempo abgestimmt (flotter Jog). */}
                <div aria-hidden style={{
                  position: 'absolute', left: '40%', bottom: '10.2%', height: '64%', aspectRatio: '153 / 180',
                  backgroundImage: `url(${runSheetLea})`, backgroundSize: '400% 100%', backgroundRepeat: 'no-repeat',
                  transformOrigin: 'center bottom', willChange: 'background-position, transform',
                  animation: 'lf-hero-legcycle 0.44s steps(4, jump-none) infinite, lf-hero-hopC 0.44s ease-in-out infinite',
                }} />
                <div aria-hidden style={{
                  position: 'absolute', left: '58.5%', bottom: '10.4%', height: '69%', aspectRatio: '118 / 180',
                  backgroundImage: `url(${runSheetFiona})`, backgroundSize: '400% 100%', backgroundRepeat: 'no-repeat',
                  transformOrigin: 'center bottom', willChange: 'background-position, transform',
                  animation: 'lf-hero-legcycle 0.4s steps(4, jump-none) infinite, lf-hero-hopC 0.4s ease-in-out infinite',
                }} />
                {/* Sammel-Objekte: einzelne Münzen/Sterne fliegen nach links und
                    werden auf Figuren-Höhe „eingesammelt" (Aufblitzen + Pling). */}
                <HeroCollectibles />
                {/* Vordergrund-Deko (Büsche/Blumen): ganz vorne, am schnellsten —
                    zieht vor den Figuren vorbei und verstärkt die Tiefe. */}
                <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                  <div className="lf-par-track" style={{ display: 'flex', width: '200%', height: '100%', animation: 'lf-parscroll 5.5s linear infinite' }}>
                    <img src={heroForeground} alt="" draggable={false} style={{ width: '50%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <img src={heroForeground} alt="" draggable={false} style={{ width: '50%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weiter-Button entfernt — Levelauswahl direkt über das Raster. */}

          {/* Schritt 1: Figur wählen (ohne Vorauswahl) — ein Klick startet Schritt 2. */}
          {!charPicked ? (
            // Fix B-06: Vordergrund (Auswahl + Hinweis) über die dekorativen
            // Lauffiguren (zIndex 0) heben, damit die Figur den Hinweistext
            // „Tippe eine Figur…" nicht mehr verdeckt.
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, width: '100%', pointerEvents: 'auto', position: 'relative', zIndex: 1 }}>
              <CharacterChooser value={character} variant="hero" noSelection onChange={(c) => { handleCharacterChange(c); setCharPicked(true); }} />
              <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'clamp(11px,2vw,13px)', letterSpacing: '0.04em', background: 'rgba(16,12,34,0.55)', padding: '3px 12px', borderRadius: 999 }}>Tippe eine Figur, um zu starten</span>
            </div>
          ) : (
          <>
          {/* Abenteuer-Kopf der Level-Auswahl: klare Überschrift + Fortschritt.
              Auf smallPhone (flaches Handy-Querformat) enger stapeln, damit unten
              mehr Level-Reihen sichtbar bleiben. */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: smallPhone ? 3 : 6, margin: smallPhone ? '0 0 3px' : '0 0 12px', pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: 'clamp(15px,3vw,22px)', fontWeight: 900, color: '#fff', letterSpacing: '0.05em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>🗺️ Wähle deine Welt</span>
              {(() => {
                const done = LEVELS.reduce((n, _l, i) => n + (getLevelStars(i) > 0 ? 1 : 0), 0);
                const st = LEVELS.reduce((n, _l, i) => n + getLevelStars(i), 0);
                return (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#ffe6a6', background: 'rgba(16,12,34,0.55)', border: '1px solid rgba(255,214,120,0.4)', padding: '4px 12px', borderRadius: 999 }}>
                    ★ {st} · {done}/{LEVELS.length} Welten
                  </span>
                );
              })()}
            </div>
            {/* P3.1: Fortschritt sichtbarer — kleine Fortschrittsleiste über die
                geschafften Welten, gibt Kindern ein greifbares Ziel. Im flachen
                Handy-Querformat (smallPhone) ausgeblendet, um dem Level-Grid +
                Scroll-Hinweis vertikalen Platz zu geben. */}
            {!smallPhone && (() => {
              const done = LEVELS.reduce((n, _l, i) => n + (getLevelStars(i) > 0 ? 1 : 0), 0);
              const pct = Math.round((done / LEVELS.length) * 100);
              const complete = done >= LEVELS.length;
              return (
                <div
                  data-testid="progress-bar"
                  role="progressbar"
                  aria-valuemin={0} aria-valuemax={LEVELS.length} aria-valuenow={done}
                  aria-label={`Fortschritt: ${done} von ${LEVELS.length} Welten geschafft`}
                  style={{ width: 'min(84vw, 340px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pointerEvents: 'none' }}
                >
                  <div style={{ position: 'relative', width: '100%', height: 10, borderRadius: 999, background: 'rgba(16,12,34,0.55)', border: '1px solid rgba(255,255,255,0.16)' }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`,
                      background: complete ? 'linear-gradient(90deg,#8affc1,#48e08a)' : 'linear-gradient(90deg,#ffe27a,#ff9f5a)',
                      borderRadius: 999, transition: 'width 400ms ease',
                      boxShadow: '0 0 8px rgba(255,159,90,0.5)',
                    }} />
                    {/* P4: Meilenstein-Marken (5/10/alle) als greifbare Ziele —
                        erreichte leuchten, offene sind gedämpft. */}
                    {MILESTONES.map((m) => {
                      const reached = done >= m;
                      const last = m === LEVELS.length;
                      return (
                        <span key={m} aria-hidden title={last ? 'Alle Welten' : `${m} Welten`} style={{
                          position: 'absolute', top: '50%', left: `${(m / LEVELS.length) * 100}%`,
                          transform: 'translate(-50%,-50%)', fontSize: reached ? 13 : 11, lineHeight: 1,
                          filter: reached ? 'drop-shadow(0 0 4px rgba(255,214,120,0.95))' : 'grayscale(0.6) opacity(0.5)',
                          transition: 'font-size 200ms ease, filter 200ms ease',
                        }}>{last ? '🏆' : '⭐'}</span>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.72)', letterSpacing: '0.02em' }}>
                    {complete ? '🎉 Alle Welten geschafft!' : `Nächstes Ziel: Welt ${done + 1}`}
                  </span>
                </div>
              );
            })()}
            {/* Modus-Umschalter: „Alle Level" (Default, nichts gesperrt) vs.
                „Kampagne" (nach und nach freispielen). Gebunden an unlockAllWorlds. */}
            {/* Der Modus-Umschalter ist im Mathe-Modus wirkungslos (dort steuert
                die Rechen-Progression die Freischaltung) → dann ausblenden und
                stattdessen einen kurzen Hinweis zeigen (kein Widerspruch mehr). */}
            {!settings.mathMode ? (
            <div
              role="radiogroup"
              aria-label="Spielmodus"
              style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(16,12,34,0.55)', border: '1px solid rgba(255,255,255,0.18)', pointerEvents: 'auto' }}
            >
              {([['all', '🎮 Alle Level'], ['campaign', '🏰 Kampagne']] as const).map(([mode, label]) => {
                const active = (mode === 'all') === settings.unlockAllWorlds;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`mode-${mode}`}
                    onClick={() => applySettingsPatch({ unlockAllWorlds: mode === 'all' })}
                    style={{
                      padding: '10px 18px', minHeight: 44, borderRadius: 999, border: 'none', cursor: 'pointer',
                      fontSize: 14, fontWeight: 800, letterSpacing: '0.02em', touchAction: 'manipulation',
                      background: active ? 'linear-gradient(90deg,#ffe27a,#ff9f5a)' : 'transparent',
                      color: active ? '#5a3a12' : 'rgba(255,255,255,0.82)',
                      boxShadow: active ? '0 2px 10px rgba(255,159,90,0.45)' : 'none',
                      transition: 'background 120ms, color 120ms',
                    }}
                  >{label}</button>
                );
              })}
            </div>
            ) : smallPhone ? null : (
              <div style={{ pointerEvents: 'none', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.72)', background: 'rgba(16,12,34,0.5)', padding: '6px 14px', borderRadius: 999 }}>
                🧮 Mathe-Modus: Level werden nacheinander freigespielt
              </div>
            )}
            {/* Sehr dezenter Mathe-Modus-Umschalter: klein, gedämpft. Gesperrte
                Progression ab Level 1 + Rechen-Quiz nach jedem Level. Default AN. */}
            <button
              type="button"
              role="switch"
              aria-checked={settings.mathMode}
              aria-label={`Mathe-Modus ${settings.mathMode ? 'an' : 'aus'}`}
              data-testid="toggle-math-mode"
              title="Mathe-Modus: nach jedem Level 3 Rechenaufgaben (Lea bis 50, Fiona bis 10). Start ab Level 1."
              onClick={() => applySettingsPatch(settings.mathMode ? { mathMode: false } : { mathMode: true, mathUnlocked: 1 })}
              style={{
                pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '11px 16px', minHeight: 44, borderRadius: 999, cursor: 'pointer', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)', touchAction: 'manipulation',
                color: settings.mathMode ? 'rgba(150,225,175,0.85)' : 'rgba(255,255,255,0.5)',
                fontSize: 12.5, fontWeight: 600, letterSpacing: '0.01em', opacity: 0.85,
                transition: 'color 120ms, opacity 120ms',
              }}
            >
              <span aria-hidden style={{ fontSize: 13 }}>🧮</span>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: settings.mathMode ? '#7fe0a2' : 'rgba(255,255,255,0.25)',
                boxShadow: settings.mathMode ? '0 0 5px rgba(127,224,162,0.8)' : 'none',
              }} />
              Mathe
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 }}>Du spielst als <b style={{ color: '#fff' }}>{character === 'fiona' ? 'Fiona' : character === 'stephan' ? 'Stephan' : 'Lea'}</b></span>
              <button className="lf-topbtn" type="button" onClick={() => setCharPicked(false)} style={{ pointerEvents: 'auto', padding: '11px 18px', minHeight: 44, borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>Figur ändern</button>
              {stickers.includes('super_collector') && (
                <span
                  data-testid="badge-super-collector"
                  title="Du hast in jeder Welt alle Sonder-Münzen gesammelt!"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 11px', borderRadius: 999,
                    background: 'linear-gradient(90deg,#fff2ab,#ffd23f)',
                    color: '#6a4a1a', fontSize: 12, fontWeight: 800,
                    border: '1px solid #e0a41d', boxShadow: '0 0 10px rgba(255,210,63,0.6)',
                  }}
                >👑 Super-Sammlerin</span>
              )}
            </div>
          </div>

          <div style={{
            position: 'relative', width: 'min(94vw, 880px)', maxWidth: 880, zIndex: 1,
            // Das Grid darf schrumpfen, damit es (samt „mehr Level ↓") auch im
            // flachen Handy-Querformat im sichtbaren Bereich bleibt und intern
            // scrollt, statt unter den Bildschirmrand zu rutschen.
            flex: '0 1 auto', minHeight: 0, maxHeight: 'min(60vh, 460px)',
            display: 'flex', flexDirection: 'column',
          }}>
          <div
            ref={levelGridRef}
            onScroll={updateGridMore}
            role="group"
            aria-label="Levelauswahl"
            className="lf-level-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))',
              gap: 12,
              width: '100%',
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              padding: 6,
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {LEVELS.map((lv, i) => {
              const isUnlocked = i < effUnlocked;
              const best = getBestScore(i);
              const stars = getLevelStars(i);
              const sc = getSpecialCoinsCollected(i);
              const scCount = (sc[0] ? 1 : 0) + (sc[1] ? 1 : 0) + (sc[2] ? 1 : 0);
              const accent = themeBadge[lv.theme] || '#aaa';
              const aria = isUnlocked
                ? `Level ${i + 1}: ${lv.name}${best > 0 ? `, Bestpunkte ${best}` : ''}`
                : `Level ${i + 1} gesperrt`;
              return (
                <button
                  key={i}
                  type="button"
                  // Use aria-disabled (not the HTML `disabled` attr) so
                  // locked cards stay focusable for arrow-key navigation
                  // through the grid; we just gate the click behaviour.
                  aria-disabled={!isUnlocked}
                  tabIndex={0}
                  data-testid={`button-level-${i}`}
                  aria-label={aria}
                  className="lf-level-card"
                  onClick={() => { if (isUnlocked) startLevel(i); }}
                  onKeyDown={(e) => onLevelKey(e, i)}
                  style={{
                    padding: '12px 11px',
                    background: isUnlocked
                      ? `linear-gradient(155deg, ${accent}2e 0%, rgba(18,14,38,0.66) 62%)`
                      : 'rgba(12,9,26,0.5)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    color: isUnlocked ? '#fff' : 'rgba(255,255,255,0.32)',
                    border: `1.5px solid ${isUnlocked ? accent + 'cc' : 'rgba(255,255,255,0.10)'}`,
                    borderRadius: 16,
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    minHeight: 132,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isUnlocked ? '0 6px 18px rgba(0,0,0,0.32)' : 'none',
                  }}
                >
                  {/* Thematische Mini-Vorschau */}
                  <div aria-hidden className="lf-card-preview" style={{
                    height: 40,
                    borderRadius: 10,
                    marginBottom: 8,
                    background: isUnlocked ? (themePreview[lv.theme]?.grad || accent) : 'rgba(20,16,40,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 23,
                    overflow: 'hidden',
                    boxShadow: 'inset 0 -10px 18px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.25)',
                    filter: isUnlocked ? 'none' : 'grayscale(1) brightness(0.55)',
                  }}>
                    {isUnlocked && lv.theme === 'plush' ? (
                      // Plüsch-Traumland-Mini-Szene: Kuscheltier + Sternenfenster.
                      <svg viewBox="0 0 120 40" width="100%" height="40"
                        preserveAspectRatio="xMidYMid slice"
                        style={{ display: 'block', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}>
                        {/* Wimpel */}
                        <g>
                          {[8, 24, 40, 80, 96, 112].map((wx, i) => (
                            <path key={i} d={`M${wx - 6} 2 L${wx + 6} 2 L${wx} 10 Z`}
                              fill={['#f4a6c0', '#f6d06a', '#a6d8a0', '#8fb8f0', '#c9a6ec', '#f4a6c0'][i]} />
                          ))}
                        </g>
                        {/* Fenster mit Mond */}
                        <rect x="46" y="6" width="28" height="22" rx="4" fill="#4a4278" />
                        <circle cx="66" cy="14" r="5" fill="#fdf1c2" />
                        <circle cx="68" cy="12" r="4" fill="#4a4278" />
                        <circle cx="52" cy="20" r="0.8" fill="#fff" />
                        <circle cx="58" cy="24" r="0.8" fill="#fff" />
                        {/* kleiner Teddy */}
                        <g transform="translate(20 20)">
                          <ellipse cx="0" cy="10" rx="8" ry="7" fill="#c79a63" />
                          <circle cx="0" cy="0" r="6" fill="#c79a63" />
                          <circle cx="-4.5" cy="-4.5" r="2.5" fill="#c79a63" />
                          <circle cx="4.5" cy="-4.5" r="2.5" fill="#c79a63" />
                          <circle cx="-2" cy="-1" r="1" fill="#3a2a1a" />
                          <circle cx="2" cy="-1" r="1" fill="#3a2a1a" />
                          <ellipse cx="0" cy="2" rx="2.4" ry="1.8" fill="#e8cba0" />
                        </g>
                        {/* kleiner grüner Dino */}
                        <g transform="translate(98 22)">
                          <ellipse cx="0" cy="9" rx="8" ry="6" fill="#7cc24f" />
                          <path d="M-4 4 L-2 -1 L0 4 Z M0 4 L2 -1 L4 4 Z" fill="#9ad86a" />
                          <circle cx="-2.5" cy="7" r="1" fill="#2a2a2a" />
                          <circle cx="2.5" cy="7" r="1" fill="#2a2a2a" />
                        </g>
                      </svg>
                    ) : isUnlocked && lv.theme === 'gym' ? (
                      // Turnhallen-Mini-Szene: schwingende Seile über einer Schlucht
                      // mit kleiner Tarzan-Figur (statt bloßem Emoji).
                      <svg viewBox="0 0 120 40" width="100%" height="40"
                        preserveAspectRatio="xMidYMid slice"
                        style={{ display: 'block', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }}>
                        <rect x="0" y="0" width="120" height="3.5" fill="rgba(70,52,34,0.6)" />
                        <g stroke="#6b4a26" strokeWidth="2.2" strokeLinecap="round">
                          <line x1="30" y1="3" x2="26" y2="23" />
                          <line x1="60" y1="3" x2="66" y2="26" />
                          <line x1="94" y1="3" x2="90" y2="22" />
                        </g>
                        <circle cx="26" cy="23" r="2.4" fill="#7a5530" />
                        <circle cx="90" cy="22" r="2.4" fill="#7a5530" />
                        {/* Tarzan-Figur am mittleren Seil */}
                        <g>
                          <line x1="66" y1="26" x2="63" y2="21" stroke="#e8b888" strokeWidth="1.6" strokeLinecap="round" />
                          <circle cx="66" cy="27.5" r="3.1" fill="#3a2a1e" />
                          <rect x="64.4" y="29.5" width="3.2" height="6" rx="1.4" fill="#d24b57" />
                        </g>
                        {/* Boden mit Schlucht-Lücke + Schwung-Bogen */}
                        <rect x="0" y="34" width="42" height="6" fill="rgba(120,90,55,0.92)" />
                        <rect x="78" y="34" width="42" height="6" fill="rgba(120,90,55,0.92)" />
                        <path d="M42 33 Q60 19 78 33" stroke="rgba(255,246,200,0.7)" strokeWidth="1.4"
                          fill="none" strokeDasharray="2.5 2.5" />
                      </svg>
                    ) : (
                      <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' }}>
                        {isUnlocked ? (themePreview[lv.theme]?.icon || '🎮') : '🔒'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span aria-hidden style={{
                      background: accent,
                      color: '#000',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: 12,
                    }}>{i + 1}</span>
                    {/* Fix B-11: Das "[N]"-Kürzel-Label entfernt — es suggerierte
                        einen Tastatur-Shortcut, den es nicht gibt (v.a. 11–13 als
                        Einzeltaste unmöglich). Die Nummer im Kreis bleibt. */}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', lineHeight: 1.1 }}>
                    {isUnlocked ? lv.name : '🔒 Gesperrt'}
                  </div>
                  <div style={{ fontSize: 10, color: best > 0 ? '#FFD700' : 'rgba(255,255,255,0.5)' }}>
                    {isUnlocked ? (best > 0 ? `★ ${best}` : 'noch offen') : ''}
                  </div>
                  {isUnlocked && (
                    <div
                      data-testid={`text-level-stars-${i}`}
                      aria-label={`Sterne: ${stars} von 3, Sonder-Münzen: ${scCount} von 3`}
                      style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', marginTop: 2 }}
                    >
                      <span style={{ color: stars > 0 ? '#ffd54a' : 'rgba(255,255,255,0.35)' }}>
                        {stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆'}
                      </span>
                      <span style={{ color: scCount > 0 ? '#ffd54a' : 'rgba(255,255,255,0.4)' }}>
                        🪙 {scCount}/3
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
            {/* P2.3: weicher Verlauf + „mehr Level ↓" — nur wenn nach unten noch
                Karten scrollbar sind (v. a. Handy quer). Klick scrollt weiter. */}
            <div
              data-testid="level-scroll-hint"
              aria-hidden={!gridMore}
              onClick={() => { const el = levelGridRef.current; if (el) el.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' }); }}
              style={{
                position: 'absolute', left: 6, right: 6, bottom: 0, height: 46,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: 6, borderRadius: '0 0 12px 12px',
                background: 'linear-gradient(180deg, rgba(16,12,34,0) 0%, rgba(16,12,34,0.55) 78%)',
                pointerEvents: gridMore ? 'auto' : 'none',
                opacity: gridMore ? 1 : 0, transition: 'opacity 200ms ease',
                cursor: 'pointer', zIndex: 3,
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 12px', borderRadius: 999,
                background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)',
                color: '#fff', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.02em',
                boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
              }}>mehr Level <span className="lf-bounce-down" aria-hidden>↓</span></span>
            </div>
          </div>
          <div
            data-testid="text-title-hint"
            style={{
              marginTop: 4,
              padding: '8px 18px',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.82)',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              textAlign: 'center',
              maxWidth: '92vw',
              position: 'relative',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            {touch
              ? 'Tippe ein Level zum Starten'
              : 'Pfeile/WASD bewegen · Leertaste/W springen · Shift rennen · F Feuerball · M Ton · Esc Pause'}
          </div>
          </>
          )}
        </div>
      )}

      {/* HUD bar (top-left) during PLAYING/PAUSED. */}
      {showHud && (
        <div
          data-testid="hud-bar"
          role="group"
          aria-label="Spielstatus"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            display: 'flex',
            gap: 14,
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            borderRadius: 8,
            fontSize: 13,
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          <span data-testid="text-lives" aria-label={`Leben: ${hud.lives}`}>❤ {hud.lives}</span>
          <span data-testid="text-coins" aria-label={`Münzen: ${hud.coins}`}>🪙 {hud.coins}</span>
          <span data-testid="text-score" aria-label={`Punkte: ${hud.score}`}>⭐ {hud.score}</span>
          <span data-testid="text-time" aria-label={`Zeit: ${formatTime(hud.time)}`}>⏱ {formatTime(hud.time)}</span>
          {/* P-meter pill: empty grey, fills gold while sprinting, glows
              brighter once fully charged ("P!"). Pure visual cue — engine
              owns the actual P-meter state. */}
          <span
            data-testid="text-pmeter"
            aria-label={hud.isPCharged ? 'Sprint voll geladen' : `Sprint ${Math.round(hud.runChargePct * 100)} Prozent`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 6px',
              border: `1px solid ${hud.isPCharged ? '#ffd54a' : 'rgba(255,255,255,0.3)'}`,
              borderRadius: 999,
              color: hud.isPCharged ? '#ffd54a' : 'rgba(255,255,255,0.7)',
              fontWeight: hud.isPCharged ? 'bold' : 'normal',
              boxShadow: hud.isPCharged ? '0 0 8px rgba(255,213,74,0.6)' : 'none',
            }}
          >
            <span style={{ fontSize: 11 }}>{hud.isPCharged ? 'P!' : 'P'}</span>
            <span
              aria-hidden
              style={{
                width: 32, height: 5, background: 'rgba(255,255,255,0.15)',
                borderRadius: 3, overflow: 'hidden',
              }}
            >
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${Math.round((hud.isPCharged ? 1 : hud.runChargePct) * 100)}%`,
                  background: hud.isPCharged ? '#ffd54a' : '#ffaa22',
                  transition: 'width 80ms linear',
                }}
              />
            </span>
          </span>
          {/* Sonder-Münzen-Pille (Task #30): zeigt 0..3 von drei
              Slots; gefüllter Stern = im aktuellen Run eingesammelt
              (oder bereits in einem früheren Run im Profil persistiert). */}
          {(() => {
            const sc = hud.specialCoins ?? [false, false, false];
            const got = (sc[0] ? 1 : 0) + (sc[1] ? 1 : 0) + (sc[2] ? 1 : 0);
            return (
              <span
                data-testid="text-special-coins"
                aria-label={`Sonder-Münzen: ${got} von 3`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0 6px',
                  border: `1px solid ${got > 0 ? 'rgba(255,213,74,0.45)' : 'rgba(255,255,255,0.18)'}`,
                  borderRadius: 999,
                  color: got > 0 ? 'rgba(255,213,74,0.75)' : 'rgba(255,255,255,0.5)',
                  fontWeight: 'normal',
                  opacity: 0.7,
                }}
              >
                <span style={{ fontSize: 12 }}>★</span>
                <span style={{ fontSize: 11 }}>{got}/3</span>
              </span>
            );
          })()}
          {levelInfo && <span data-testid="text-level-name" style={{ opacity: 0.8 }}>· {levelInfo.name}</span>}
        </div>
      )}

      {/* Pause overlay. */}
      {gameState === GameState.PAUSED && (
        <ModalOverlay testId="pause-overlay" title="Pause" onClose={togglePause}>
          <div style={{ width: '100%', marginBottom: 6 }}>
            <CharacterChooser value={character} onChange={handleCharacterChange} />
          </div>
          <PrimaryButton testId="button-resume" onClick={togglePause}>Weiterspielen</PrimaryButton>
          <PrimaryButton testId="button-pause-levelselect" onClick={goLevelSelect}>Levelauswahl</PrimaryButton>
          <PrimaryButton testId="button-mute-pause" onClick={toggleMute}>{muted ? 'Ton an' : 'Ton aus'}</PrimaryButton>
          <PrimaryButton testId="button-quit-to-title" onClick={goTitle}>Zum Titel</PrimaryButton>
        </ModalOverlay>
      )}

      {/* Game-over overlay. */}
      {gameState === GameState.GAME_OVER && (
        <ModalOverlay testId="gameover-overlay" title="Game Over">
          <p data-testid="text-final-score" style={{ color: 'rgba(255,255,255,0.85)', margin: '4px 0 14px' }}>
            Punkte: <strong>{hud.score}</strong>
          </p>
          <PrimaryButton testId="button-retry" onClick={restart}>Erneut versuchen</PrimaryButton>
          <PrimaryButton testId="button-gameover-title" onClick={goTitle}>Zum Titel</PrimaryButton>
        </ModalOverlay>
      )}

      {/* Level-complete overlay. */}
      {gameState === GameState.LEVEL_COMPLETE && (
        <ModalOverlay testId="levelcomplete-overlay" title="Geschafft! 🎉">
          <p data-testid="text-level-stats" style={{ color: 'rgba(255,255,255,0.85)', margin: '4px 0 14px' }}>
            Punkte: <strong>{hud.score}</strong> · Münzen: <strong>{hud.coins}</strong>
          </p>
          {bonus && bonus.initial > 0 && (
            <p
              data-testid="text-time-bonus"
              style={{
                color: 'rgba(255, 220, 100, 0.95)',
                margin: '0 0 14px',
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 0 6px rgba(255,180,40,0.55)',
              }}
            >
              Zeit-Bonus: <strong data-testid="text-time-bonus-remaining">{bonus.remaining}</strong>
              {' × 50 = '}
              <strong>{bonus.remaining * 50}</strong>
            </p>
          )}
          {/* Sterne-Bewertung (Task #30): drei Slots, gefüllt nach
              `hud.lastLevelStars` (0..3). Pop-Animation via @keyframes
              `starPop` in index.css. */}
          {(() => {
            const stars = hud.lastLevelStars ?? 0;
            return (
              <div
                data-testid="row-level-stars"
                aria-label={`Sterne: ${stars} von 3`}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 12,
                  margin: '6px 0 14px',
                  fontSize: 36,
                }}
              >
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    data-testid={`star-slot-${i}`}
                    style={{
                      color: i < stars ? '#ffd54a' : 'rgba(255,255,255,0.2)',
                      textShadow: i < stars ? '0 0 10px rgba(255,213,74,0.7)' : 'none',
                      animation: i < stars ? `starPop 360ms ${120 + i * 180}ms both` : 'none',
                      display: 'inline-block',
                    }}
                  >
                    {i < stars ? '★' : '☆'}
                  </span>
                ))}
              </div>
            );
          })()}
          {settings.mathMode ? (
            <PrimaryButton testId="button-math-quiz" onClick={() => setShowQuiz(true)}>
              🧮 Rechenaufgaben lösen
            </PrimaryButton>
          ) : levelInfo?.hasNext ? (
            <PrimaryButton testId="button-next-level" onClick={nextLevel}>
              Weiter: {levelInfo.nextName}
            </PrimaryButton>
          ) : (
            <PrimaryButton testId="button-back-to-title-win" onClick={goTitle}>Du hast alle Welten geschafft!</PrimaryButton>
          )}
          {!settings.mathMode && (
            <PrimaryButton testId="button-complete-title" onClick={goTitle}>Zum Titel</PrimaryButton>
          )}
        </ModalOverlay>
      )}

      {/* Mathe-Quiz nach dem Levelende (nur im Mathe-Modus). */}
      {showQuiz && settings.mathMode && (
        <MathQuiz onPass={onQuizPass} onFail={onQuizFail} character={character} />
      )}

      {/* Kurze Ergebnis-Meldung des Mathe-Modus (bestanden zum Schluss / Reset). */}
      {mathMsg && (
        <ModalOverlay testId="mathresult-overlay" title="Mathe-Modus" onClose={() => setMathMsg(null)}>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: '6px 0 16px', fontSize: 16, lineHeight: 1.4 }}>{mathMsg}</p>
          <PrimaryButton testId="button-mathresult-ok" onClick={() => setMathMsg(null)}>OK</PrimaryButton>
        </ModalOverlay>
      )}

      {/* Profiles modal. */}
      {modal === 'profiles' && (
        <ModalOverlay testId="profiles-overlay" title="Profile" onClose={() => setModal(null)}>
          <ProfilesPanel
            profiles={profiles}
            activeId={activeProfile.id}
            onSwitch={(id) => {
              if (switchProfile(id)) {
                // Engine first: refresh its cached unlockedLevels and push
                // the new profile's audio gains into the live graph. Then
                // the UI re-reads the freshly-updated engine value.
                engineRef.current?.reloadFromActiveProfile();
                refreshProfileState();
                setUnlocked(engineRef.current?.getUnlockedLevels() ?? 1);
                setSettings(getSettings());
                engineRef.current?.returnToTitle();
                setModal(null);
              }
            }}
            onCreate={(name) => {
              const created = createProfile(name);
              if (created) refreshProfileState();
              return created !== null;
            }}
            onDelete={(id) => {
              if (deleteProfile(id)) {
                // Deleting the active profile auto-switches the active
                // pointer in storage, so we must reload engine state
                // and re-apply the new profile's audio settings too.
                engineRef.current?.reloadFromActiveProfile();
                refreshProfileState();
                setUnlocked(engineRef.current?.getUnlockedLevels() ?? 1);
                setSettings(getSettings());
              }
            }}
            onRename={(id, name) => {
              if (renameProfile(id, name)) refreshProfileState();
            }}
          />
          <PrimaryButton testId="button-profiles-close" onClick={() => setModal(null)}>Schließen</PrimaryButton>
        </ModalOverlay>
      )}

      {/* Settings modal. */}
      {modal === 'settings' && (
        <ModalOverlay testId="settings-overlay" title="Einstellungen" onClose={() => setModal(null)}>
          <SettingsPanel
            settings={settings}
            onChange={(patch) => applySettingsPatch(patch)}
          />
          <PrimaryButton testId="button-settings-close" onClick={() => setModal(null)}>Schließen</PrimaryButton>
        </ModalOverlay>
      )}

      {/* Sticker album modal. */}
      {modal === 'album' && (
        <ModalOverlay testId="album-overlay" title="Sticker-Album" onClose={() => setModal(null)}>
          <AlbumPanel unlocked={stickers} />
          <PrimaryButton testId="button-album-close" onClick={() => setModal(null)}>Schließen</PrimaryButton>
        </ModalOverlay>
      )}

      {/* Boutique-Shop modal (Shop & Ankleide, E2). */}
      {modal === 'shop' && (
        <ModalOverlay testId="shop-overlay" title="🛍️ Boutique" onClose={() => { refreshProfileState(); setModal(null); }}>
          <BoutiquePanel character={character} />
          <PrimaryButton testId="button-shop-close" onClick={() => { refreshProfileState(); setModal(null); }}>Schließen</PrimaryButton>
        </ModalOverlay>
      )}

      {/* Level-Intro-Karte (Task #29): kurzer Einblender mit Welt-
          nummer, Levelname und verbleibenden Leben — fades sich nach
          1.2 s automatisch aus. Pointer-events sind off, damit der
          Spieler weiterspielen kann. */}
      {intro && gameState === GameState.PLAYING && (() => {
        // v467: Welt-Icon + Akzentfarbe wie auf den Level-Karten → einheitlicher
        // Einstieg in jede Welt.
        const introTheme = LEVELS[intro.index]?.theme ?? '';
        const introAccent = themeBadge[introTheme] || '#ffd54a';
        const introIcon = themePreview[introTheme]?.icon || '🗺️';
        const introGrad = themePreview[introTheme]?.grad || 'linear-gradient(160deg,#556,#223)';
        return (
        <div
          key={intro.key}
          data-testid="level-intro-card"
          style={{
            position: 'absolute',
            top: '38%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '16px 30px 18px',
            background: 'rgba(15, 18, 32, 0.88)',
            border: `2px solid ${introAccent}`,
            borderRadius: 16,
            boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 26px ${introAccent}44`,
            color: '#fff',
            textAlign: 'center',
            pointerEvents: 'none',
            animation: 'levelIntroFade 1.2s ease-out forwards',
            zIndex: 50,
          }}
        >
          <div aria-hidden style={{
            width: 52, height: 52, margin: '0 auto 8px', borderRadius: 12,
            background: introGrad, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: 'inset 0 -8px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}>
            <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' }}>{introIcon}</span>
          </div>
          <div
            data-testid="text-intro-world"
            style={{ fontSize: 13, letterSpacing: 2, opacity: 0.75, textTransform: 'uppercase' }}
          >
            Welt {intro.index + 1}
          </div>
          <div
            data-testid="text-intro-name"
            style={{ fontSize: 26, fontWeight: 800, margin: '3px 0 8px', color: introAccent }}
          >
            {intro.name}
          </div>
          <div
            data-testid="text-intro-lives"
            style={{ fontSize: 16, color: 'rgba(255, 220, 120, 0.95)' }}
          >
            ♥ × {intro.lives}
          </div>
        </div>
        );
      })()}

      {/* Achievement toasts. Stack from top-center; only the head is
          visible at a time but they queue smoothly. Während das Mathe-Quiz
          offen ist, ausgeblendet, damit der „Sticker freigeschaltet"-Toast
          nicht den Committen-Knopf überlappt. */}
      {toasts.length > 0 && !showQuiz && (
        <div
          data-testid="achievement-toast-stack"
          style={{
            position: 'absolute',
            // Fix B-05: Auf dem „Geschafft!"-/Game-Over-Panel steht der Titel
            // oben-zentriert — der Toast würde ihn verdecken. Dort wandert er
            // deshalb an den unteren Rand; im Spiel bleibt er oben unter dem HUD.
            ...(gameState === GameState.LEVEL_COMPLETE || gameState === GameState.GAME_OVER
              ? { bottom: 18, top: 'auto' as const }
              : { top: 70 }),
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 80,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
          }}
          aria-live="polite"
        >
          {toasts.slice(0, 1).map(t => {
            const def = getAchievement(t.id);
            if (!def) return null;
            return (
              <div
                key={t.key}
                data-testid={`toast-achievement-${def.id}`}
                style={{
                  background: 'rgba(15, 15, 22, 0.72)',
                  border: '1px solid rgba(255,213,74,0.32)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  boxShadow: 'none',
                  opacity: 0.9,
                  maxWidth: '78vw',
                }}
              >
                <span style={{ fontSize: 18 }}>{def.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,213,74,0.7)', fontWeight: 600, letterSpacing: 0.3 }}>Sticker freigeschaltet</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{def.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.65 }}>{def.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dev-only banner: lists *Block declarations that didn't sit on a
          QUESTION_BLOCK tile. Engine attempts to auto-correct (search ±2
          tiles); whatever it can't fix is also listed. */}
      {import.meta.env.DEV && gameState === GameState.PLAYING &&
        (engineRef.current?.devBlockWarnings?.length ?? 0) > 0 && (
        <div
          data-testid="dev-block-warning"
          style={{
            position: 'absolute',
            top: 56,
            left: 8,
            right: 8,
            zIndex: 35,
            background: 'rgba(180, 30, 30, 0.92)',
            color: '#fff',
            border: '1px solid #ffd54a',
            borderRadius: 6,
            padding: '6px 10px',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.35,
            maxHeight: 120,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#ffd54a' }}>
            ⚠ Level-QS: Spezialblöcke sitzen nicht auf QUESTION_BLOCK
          </div>
          {engineRef.current?.devBlockWarnings?.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}

      {/* Mobile gamepad — only on touch devices, only while PLAYING. */}
      {touch && gameState === GameState.PLAYING && (
        <>
          {settings.touchControl === 'stick' ? (
            <>
              <div
                data-testid="touch-stick-zone"
                onTouchStart={onStickStart}
                onTouchMove={onStickMove}
                onTouchEnd={onStickEnd}
                onTouchCancel={onStickEnd}
                style={{ position: 'absolute', left: 0, bottom: 0, width: '45%', height: '80%', zIndex: 24, touchAction: 'none' }}
              />
              {/* Fix B-10: Ruhe-Hinweis für die Joystick-Zone. Vorher war die
                  linke Hälfte eine unsichtbare Stick-Fläche — Kinder sahen nicht,
                  wo sie tippen müssen. Ein dezenter Ring + Knauf zeigt die Zone;
                  beim Berühren übernimmt der schwebende Stick (stickView). */}
              {!stickView && (
                <div aria-hidden style={{ position: 'absolute', left: 34, bottom: 46, width: 86, height: 86, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.30)', background: 'rgba(0,0,0,0.14)', zIndex: 25, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.20)', border: '2px solid rgba(255,255,255,0.38)' }} />
                </div>
              )}
              {stickView && (
                <>
                  <div style={{ position: 'absolute', left: stickView.baseX - 46, top: stickView.baseY - 46, width: 92, height: 92, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', background: 'rgba(0,0,0,0.18)', zIndex: 26, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: stickView.knobX - 28, top: stickView.knobY - 28, width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', border: '2px solid rgba(255,255,255,0.65)', zIndex: 27, pointerEvents: 'none' }} />
                </>
              )}
            </>
          ) : (
            <div
              data-testid="gamepad-left-cluster"
              style={{
                position: 'absolute',
                left: 12,
                bottom: 2,
                display: 'flex',
                gap: 10,
                zIndex: 25,
                touchAction: 'none',
                opacity: 0.4,
              }}
            >
              <PadButton testId="button-touch-left" small {...bindHold(setLeft)}>◀</PadButton>
              <PadButton testId="button-touch-right" small {...bindHold(setRight)}>▶</PadButton>
              {/* Down button — needed for ducking, crawling and the new Run-Slide. */}
              <PadButton testId="button-touch-down" small {...bindHold(setDown)}>▼</PadButton>
            </div>
          )}
          <div
            data-testid="gamepad-right-cluster"
            style={{
              position: 'absolute',
              right: 12,
              bottom: 2,
              display: 'flex',
              gap: 12,
              zIndex: 25,
              alignItems: 'flex-end',
              touchAction: 'none',
              opacity: 0.45,
            }}
          >
            {/* Superkraft — nur sichtbar, wenn Ladungen vorhanden. Jeder
                Tap = Radschlag (Lea) / Einbein-Hüpfer (Fiona), besiegt alle
                Gegner. Zeigt die verbleibenden Ladungen. */}
            {(hud.superCharges ?? 0) > 0 && (
              <PadButton
                testId="button-touch-super"
                {...bindHold(setSuper)}
                small
              >✷{hud.superCharges}</PadButton>
            )}
            {/* Sprint+Sprung-Combo: erleichtert das Auslösen des P-Meter-Sprungs
                auf Touch-Geräten. Hält RUN und JUMP gleichzeitig gedrückt,
                solange der Daumen am Knopf bleibt. */}
            <PadButton
              testId="button-touch-sprintjump"
              small
              {...bindHold((v: boolean) => { setRun(v); setJump(v); })}
            >P!</PadButton>
            {/* Ship-it-Dash: kurzer Horizontal-Boost (spiegelt Taste E). */}
            <PadButton testId="button-touch-dash" {...bindHold(setDash)} small>»</PadButton>
            {/* Greifhaken: Haken schräg-oben (spiegelt Taste G). */}
            <PadButton testId="button-touch-grapple" {...bindHold(setGrapple)} small>↗</PadButton>
            {/* Feuerball werfen — nur wenn Spielerin die Feuerblume eingesammelt hat. */}
            {/* Runter-/Duck-Knopf an gut erreichbarer Stelle (vormals F) —
                für Ducken, Run-Slide und die Warp-Röhren. */}
            <PadButton testId="button-touch-down" {...bindHold(setDown)} small>▼</PadButton>
            <PadButton testId="button-touch-jump" {...bindHold(setJump)}>⤴</PadButton>
          </div>
          {/* Feuerball-Knopf nach oben rechts versetzt (selten gebraucht, stört
              so den Daumen an Sprung/Ducken nicht). */}
          <div style={{ position: 'absolute', right: 18, bottom: 104, zIndex: 25, touchAction: 'none', opacity: 0.45 }}>
            <PadButton testId="button-touch-fire" {...bindHold(setFire)} small>F</PadButton>
          </div>
        </>
      )}
    </div>
  );
}

