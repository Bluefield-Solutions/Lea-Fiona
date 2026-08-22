import React from 'react';
import runSheetFiona from '@assets/run_sheet_fiona.webp';
import runSheetLea from '@assets/run_sheet_lea.webp';
import { audio } from '../../game/audio';

// Mathe-Modus: nach jedem Level 3 Rechenaufgaben (Plus/Minus, keine negativen
// Ergebnisse). Zahlenraum je Figur: Lea → bis 50, Fiona → bis 10.
// Eingabe über einen großen Ziffern-Rechner (0–9) oder echte Tastatur, dann
// „Committen" (Enter). 3 Fehler INSGESAMT → onFail (Reset auf Level 1). Alle 3
// richtig → onPass. Diese Version: freundliches, helles Lern-Design mit
// Maskottchen, taktilen Tasten und weichen Rückmeldungen.
const MAX_WRONG = 3;

type Q = { text: string; answer: number };

function makeQuestion(maxN: number): Q {
  const sub = Math.random() < 0.5;
  if (sub) {
    const a = 1 + Math.floor(Math.random() * maxN);        // 1..maxN
    const b = Math.floor(Math.random() * (a + 1));          // 0..a → Ergebnis ≥ 0
    return { text: `${a} − ${b}`, answer: a - b };
  }
  const a = Math.floor(Math.random() * (maxN + 1));         // 0..maxN
  const b = Math.floor(Math.random() * (maxN - a + 1));     // a+b ≤ maxN
  return { text: `${a} + ${b}`, answer: a + b };
}

const MASCOT: Record<string, { sheet: string; fw: number; fh: number; sheetW: number }> = {
  fiona: { sheet: runSheetFiona, fw: 47, fh: 72, sheetW: 188 },
  lea: { sheet: runSheetLea, fw: 71, fh: 84, sheetW: 284 },
};

export function MathQuiz(
  { onPass, onFail, character }: { onPass: () => void; onFail: () => void; character: string },
) {
  const maxN = character === 'fiona' ? 10 : 50;
  const [questions] = React.useState<Q[]>(() => [makeQuestion(maxN), makeQuestion(maxN), makeQuestion(maxN)]);
  const [qi, setQi] = React.useState(0);
  const [wrong, setWrong] = React.useState(0);
  const [input, setInput] = React.useState('');
  const [flash, setFlash] = React.useState<null | 'ok' | 'bad'>(null);
  const [locked, setLocked] = React.useState(false);
  const [celebrate, setCelebrate] = React.useState(false);
  const done = React.useRef(false);
  const q = questions[qi];
  const mascot = MASCOT[character] ?? MASCOT.lea;

  const press = (d: string) => {
    if (locked || done.current) return;
    setInput((s) => (s.length >= 2 ? s : (s === '0' ? d : s + d)));  // max 2 Ziffern (0..99)
  };
  const backspace = () => { if (!locked) setInput((s) => s.slice(0, -1)); };

  // useRef auf die aktuellen Werte, damit der Tastatur-Listener nicht bei jedem
  // Tastendruck neu gebunden werden muss.
  const stateRef = React.useRef({ locked, input, qi, wrong });
  stateRef.current = { locked, input, qi, wrong };

  const commit = React.useCallback(() => {
    const s = stateRef.current;
    if (s.locked || done.current || s.input === '') return;
    const val = parseInt(s.input, 10);
    if (val === questions[s.qi].answer) {
      setFlash('ok'); setLocked(true);
      const last = s.qi + 1 >= questions.length;
      // Fröhlicher Ton: heller Coin-Klang, mit jeder richtigen Aufgabe höher;
      // beim Bestehen der letzten Aufgabe die Sieg-Fanfare.
      try {
        if (last) audio.playSfx('fanfare');
        else audio.playSfx('quizCorrect', 0, 1 + s.qi * 0.09);
      } catch { /* Audio evtl. noch nicht initialisiert – egal */ }
      if (last) setCelebrate(true);
      window.setTimeout(() => {
        setFlash(null); setLocked(false); setInput('');
        if (last) { done.current = true; onPass(); }
        else setQi(s.qi + 1);
      }, last ? 1550 : 550);
    } else {
      const w = s.wrong + 1; setWrong(w);
      setFlash('bad'); setLocked(true);
      // Dezenter, nicht strafender Fehlton.
      try { audio.playSfx('blockHit', 0, 0.85); } catch { /* s.o. */ }
      window.setTimeout(() => {
        setFlash(null); setLocked(false); setInput('');
        if (w >= MAX_WRONG) { done.current = true; onFail(); }
      }, 700);
    }
  }, [questions, onPass, onFail]);

  // Echte Tastatur (Laptop): 0–9 tippen, Backspace löschen, Enter = Committen.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (s.locked || done.current) return;
      if (e.key >= '0' && e.key <= '9') { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { backspace(); e.preventDefault(); }
      else if (e.key === 'Enter') { commit(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit]);

  const hearts = MAX_WRONG - wrong;
  const dispBg = flash === 'ok' ? 'linear-gradient(180deg,#e7ffef,#c8f7d6)' : flash === 'bad' ? 'linear-gradient(180deg,#ffe6e2,#ffd0c8)' : '#ffffff';
  const dispBd = flash === 'ok' ? '#3fbf6a' : flash === 'bad' ? '#e8654e' : '#e9dcf0';
  const dispColor = flash === 'ok' ? '#177a3b' : flash === 'bad' ? '#b23a26' : '#3a2b57';

  // Taktile Ziffern-Taste (heller „3D"-Look mit Druck-Effekt via CSS-Klasse).
  const keyBtn = (label: React.ReactNode, onClick: () => void, kind: 'num' | 'del' | 'ok' = 'num') => {
    const base: React.CSSProperties = {
      fontSize: 25, fontWeight: 800, padding: '13px 0', borderRadius: 15,
      fontVariantNumeric: 'tabular-nums', touchAction: 'manipulation', userSelect: 'none',
      cursor: locked ? 'default' : 'pointer', border: 'none',
      transition: 'transform 80ms ease, box-shadow 80ms ease, filter 120ms ease',
    };
    const skin: React.CSSProperties =
      kind === 'ok'
        ? { background: 'linear-gradient(180deg,#68e69a,#2fae5a)', color: '#06351d', boxShadow: '0 4px 0 #1f8f49' }
        : kind === 'del'
        ? { background: 'linear-gradient(180deg,#fdeef4,#f6dce8)', color: '#b0577f', boxShadow: '0 4px 0 #e6c2d5' }
        : { background: 'linear-gradient(180deg,#ffffff,#f2e9f7)', color: '#3a2b57', boxShadow: '0 4px 0 #ddcbe8' };
    // Robuste Eingabe: onPointerDown feuert sofort bei Touch/Maus/Stift und ist
    // immun gegen die iOS-Click-Emulation (die manchmal „nichts passiert" auslöst).
    // preventDefault unterdrückt den daraus folgenden Klick; das zusätzliche
    // onClick greift daher NUR bei Tastatur-Aktivierung (e.detail === 0).
    const fire = () => { if (!locked && !done.current) onClick(); };
    return (
      <button
        type="button"
        data-testid={typeof label === 'string' || typeof label === 'number' ? `calc-key-${label}` : undefined}
        onPointerDown={(e) => { e.preventDefault(); fire(); }}
        onClick={(e) => { if (e.detail === 0) fire(); }}
        disabled={locked}
        className="lf-calc-key"
        style={{ ...base, ...skin, opacity: locked ? 0.75 : 1, WebkitTapHighlightColor: 'transparent' }}
      >{label}</button>
    );
  };

  return (
    <div
      data-testid="mathquiz-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Rechenaufgaben"
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12,
        background: 'radial-gradient(120% 90% at 50% 30%, rgba(60,40,110,0.55), rgba(8,6,22,0.72))',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <style>{`
        @keyframes lf-quiz-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(3px)} }
        @keyframes lf-quiz-pop { 0%{transform:scale(1)} 45%{transform:scale(1.12)} 100%{transform:scale(1)} }
        @keyframes lf-confetti { to { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)); opacity: 0; } }
        @keyframes lf-quiz-in { 0%{transform:translateY(14px) scale(.96); opacity:0} 100%{transform:translateY(0) scale(1); opacity:1} }
        @keyframes lf-mascot-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes lf-win-hop { 0%,100%{transform:translateY(0) rotate(-2deg)} 30%{transform:translateY(-20px) rotate(2deg)} 55%{transform:translateY(0) rotate(-1deg)} 70%{transform:translateY(-8px)} }
        @keyframes lf-win-in { 0%{transform:scale(.8); opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1); opacity:1} }
        .lf-calc-key:not(:disabled):active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(0,0,0,0.15) !important; filter: brightness(1.03); }
        .lf-calc-key:focus-visible { outline: 3px solid rgba(122,86,220,0.55); outline-offset: 2px; }
        /* Flaches Querformat (z.B. iPhone quer): zweispaltiges Layout, damit
           Aufgabe/Anzeige links und der komplette Ziffernblock rechts ins Bild
           passen — vorher lag der Rechner unter dem Bildschirmrand. */
        @media (orientation: landscape) and (max-height: 560px) {
          .lf-mq-card { width: min(96vw, 640px) !important; max-height: 96vh !important; }
          .lf-mq-header { padding: 8px 16px !important; }
          .lf-mq-title { font-size: 17px !important; }
          .lf-mq-sub { display: none !important; }
          .lf-mq-mascot { width: 44px !important; height: 44px !important; background-size: auto 44px !important; margin-bottom: -8px !important; }
          .lf-mq-body { flex-direction: row !important; align-items: center !important; gap: 16px !important; padding: 8px 16px 12px !important; }
          .lf-mq-info { flex: 1 1 0 !important; min-width: 0 !important; display: flex; flex-direction: column; justify-content: center; }
          .lf-mq-pad { flex: 0 0 auto !important; width: 252px !important; }
          .lf-mq-question { font-size: 26px !important; padding: 8px 6px !important; margin-bottom: 6px !important; }
          .lf-mq-display { width: 100% !important; max-width: 280px !important; font-size: 24px !important; padding: 7px 0 !important; min-height: 24px !important; line-height: 24px !important; margin: 0 auto 4px !important; }
          .lf-mq-feedback { height: 18px !important; margin-bottom: 4px !important; font-size: 14px !important; }
          .lf-mq-keys { gap: 6px !important; }
          .lf-mq-keys button { padding: 8px 0 !important; font-size: 20px !important; }
          .lf-mq-commit { margin-top: 8px !important; padding: 9px 0 !important; font-size: 16px !important; }
          .lf-mq-progress-row { margin-bottom: 6px !important; }
        }
      `}</style>

      <div
        className="lf-mq-card"
        style={{
          position: 'relative', width: 'min(94vw, 384px)', maxHeight: '92vh', overflow: 'hidden',
          borderRadius: 28, background: 'linear-gradient(180deg,#fffaf3 0%,#fdeef7 100%)',
          boxShadow: '0 26px 70px rgba(20,10,50,0.6), 0 0 0 1px rgba(255,255,255,0.4) inset',
          animation: 'lf-quiz-in 260ms cubic-bezier(.2,.8,.3,1) both',
          textAlign: 'center',
        }}
      >
        {/* Konfetti bei Bestehen */}
        {celebrate && (
          <div data-testid="mathquiz-confetti" aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 6 }}>
            {Array.from({ length: 30 }).map((_, i) => {
              const ang = (i / 30) * Math.PI * 2 + (i % 3);
              const dist = 130 + (i % 5) * 34;
              const colors = ['#ffd54a', '#ff7ab0', '#5be08a', '#5ab0ff', '#ff9f5a', '#c58bff'];
              return (
                <span key={i} style={{
                  position: 'absolute', left: '50%', top: '40%', width: 10, height: 10, borderRadius: i % 2 ? 2 : '50%',
                  background: colors[i % colors.length],
                  ['--tx' as string]: `${Math.cos(ang) * dist}px`,
                  ['--ty' as string]: `${Math.sin(ang) * dist + 60}px`,
                  ['--rot' as string]: `${(i % 2 ? 1 : -1) * (360 + i * 20)}deg`,
                  animation: `lf-confetti ${900 + (i % 4) * 120}ms cubic-bezier(.2,.7,.3,1) ${i * 8}ms both`,
                }} />
              );
            })}
          </div>
        )}

        {/* Sieg-Ansicht: jubelndes Maskottchen + „Weiter geht's!"-Karte. */}
        {celebrate && (
          <div
            data-testid="mathquiz-win"
            style={{
              position: 'absolute', inset: 0, zIndex: 5, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: 20,
              background: 'linear-gradient(180deg,#fffaf3 0%,#fdeef7 100%)',
              animation: 'lf-win-in 360ms cubic-bezier(.2,.8,.3,1) both',
            }}
          >
            <div style={{
              fontSize: 26, fontWeight: 900, letterSpacing: '0.01em',
              background: 'linear-gradient(90deg,#2fae5a,#22a556,#5be08a)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
            }}>Geschafft! 🎉</div>
            {/* Jubelndes Maskottchen */}
            <div aria-hidden style={{
              width: mascot.fw * 1.7, height: mascot.fh * 1.7, margin: '6px 0 2px',
              backgroundImage: `url(${mascot.sheet})`, backgroundSize: `${mascot.sheetW * 1.7}px ${mascot.fh * 1.7}px`,
              backgroundRepeat: 'no-repeat',
              filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.28))',
              animation: 'lf-win-hop 0.66s ease-in-out infinite',
            }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#7a5a2a' }}>
              Alle 3 Aufgaben richtig!
            </div>
            <div style={{
              marginTop: 6, padding: '9px 22px', borderRadius: 999,
              background: 'linear-gradient(180deg,#ffd166,#ff9f5a)', color: '#5a3a12',
              fontWeight: 900, fontSize: 17, boxShadow: '0 4px 0 #e08a3d',
            }}>Weiter geht's! →</div>
          </div>
        )}

        {/* Farbiger Kopf mit Titel + Maskottchen (Flex-Reihe, damit der Text
            nie unter die Figur läuft). */}
        <div className="lf-mq-header" style={{
          position: 'relative', padding: '15px 18px 13px',
          background: 'linear-gradient(120deg,#ff9f5a 0%,#ff77b0 52%,#b486ff 100%)',
          boxShadow: 'inset 0 -2px 6px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'flex-end', gap: 10, textAlign: 'left',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lf-mq-title" style={{ fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '0.01em', textShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
              🧮 Rechen-Zeit!
            </div>
            <div className="lf-mq-sub" style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.94)', marginTop: 3, lineHeight: 1.25 }}>
              Löse 3 Aufgaben — dann geht's ins nächste Level.
            </div>
          </div>
          {/* Maskottchen — die gewählte Figur feuert an. */}
          <div aria-hidden className="lf-mq-mascot" style={{
            flex: '0 0 auto', width: mascot.fw * 0.9, height: mascot.fh * 0.9, marginBottom: -13,
            backgroundImage: `url(${mascot.sheet})`, backgroundSize: `${mascot.sheetW * 0.9}px ${mascot.fh * 0.9}px`,
            backgroundRepeat: 'no-repeat',
            filter: 'drop-shadow(0 4px 5px rgba(0,0,0,0.35))',
            animation: 'lf-mascot-bob 1.6s ease-in-out infinite',
          }} />
        </div>

        {/* Karten-Körper — im flachen Querformat zweispaltig (Info links, Rechner rechts) */}
        <div className="lf-mq-body" style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column' }}>
         <div className="lf-mq-info">
          {/* Fortschritt (3 Segmente) + Versuche (Herzen) */}
          <div className="lf-mq-progress-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div data-testid="mathquiz-progress" style={{ display: 'flex', gap: 5 }} aria-label={`Aufgabe ${qi + 1} von ${questions.length}`}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 26, height: 8, borderRadius: 999,
                  background: i < qi ? 'linear-gradient(90deg,#5be08a,#2fae5a)' : i === qi ? 'linear-gradient(90deg,#ffce54,#ff9f5a)' : '#e7dbef',
                  boxShadow: i === qi ? '0 0 0 2px rgba(255,159,90,0.28)' : 'none',
                  transition: 'background 200ms',
                }} />
              ))}
            </div>
            <div data-testid="mathquiz-hearts" aria-label={`Versuche übrig: ${hearts}`} style={{ fontSize: 17, letterSpacing: 2 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ color: i < hearts ? '#ff5a7a' : '#e6ccd4' }}>{i < hearts ? '♥' : '♡'}</span>
              ))}
            </div>
          </div>

          {/* Aufgaben-Blase */}
          <div
            data-testid="mathquiz-question"
            className="lf-mq-question"
            style={{
              fontSize: 40, fontWeight: 900, color: '#3a2b57', letterSpacing: '0.01em',
              padding: '12px 10px', borderRadius: 18, marginBottom: 10,
              background: 'linear-gradient(180deg,#ffffff,#fff4fb)',
              border: '2px solid #ffe0b3', boxShadow: '0 6px 16px rgba(120,80,160,0.12)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {q.text} = <span style={{ color: '#ff8a3d' }}>?</span>
          </div>

          {/* Anzeige der getippten Zahl */}
          <div
            key={qi + '-' + flash}
            data-testid="mathquiz-display"
            className="lf-mq-display"
            style={{
              fontSize: 32, fontWeight: 900, minHeight: 30, lineHeight: '30px', padding: '11px 0',
              margin: '0 auto 8px', maxWidth: 300, borderRadius: 14, background: dispBg,
              border: `2px solid ${dispBd}`, color: dispColor, fontVariantNumeric: 'tabular-nums',
              transition: 'background 120ms, border-color 120ms, color 120ms',
              animation: flash === 'bad' ? 'lf-quiz-shake 380ms both' : flash === 'ok' ? 'lf-quiz-pop 380ms both' : undefined,
            }}
          >
            {input === '' ? <span style={{ opacity: 0.4, fontSize: 18, fontWeight: 700 }}>tippe deine Zahl</span> : input}
          </div>

          {/* Feedback-Zeile (feste Höhe, damit nichts springt) */}
          <div
            data-testid="mathquiz-feedback"
            className="lf-mq-feedback"
            style={{
              height: 24, marginBottom: 10, fontSize: 18, fontWeight: 900,
              color: flash === 'ok' ? '#22a556' : flash === 'bad' ? '#e0533b' : 'transparent',
            }}
          >
            {flash === 'ok' ? (celebrate ? 'Super — geschafft! 🎉' : 'Richtig! ✅') : flash === 'bad' ? 'Nochmal! ❌' : ' '}
          </div>
         </div>{/* /lf-mq-info */}

         <div className="lf-mq-pad">
          {/* Ziffern-Rechner */}
          <div className="lf-mq-keys" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9, maxWidth: 300, margin: '0 auto' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => keyBtn(n, () => press(String(n)), 'num'))}
            {keyBtn('⌫', backspace, 'del')}
            {keyBtn(0, () => press('0'), 'num')}
            {keyBtn('✓', commit, 'ok')}
          </div>

          {/* Committen-Knopf (wie Enter) */}
          <button
            type="button"
            data-testid="mathquiz-commit"
            onPointerDown={(e) => { e.preventDefault(); if (!locked && input !== '') commit(); }}
            onClick={(e) => { if (e.detail === 0 && !locked && input !== '') commit(); }}
            disabled={locked || input === ''}
            className="lf-calc-key lf-mq-commit"
            style={{
              marginTop: 14, width: '100%', maxWidth: 300, fontSize: 19, fontWeight: 900,
              padding: '13px 0', borderRadius: 16, border: 'none',
              cursor: (locked || input === '') ? 'default' : 'pointer',
              background: (locked || input === '') ? '#efe3ec' : 'linear-gradient(180deg,#ffd166,#ff9f5a)',
              color: (locked || input === '') ? '#b7a7bd' : '#5a3a12',
              boxShadow: (locked || input === '') ? 'none' : '0 4px 0 #e08a3d',
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              transition: 'transform 80ms ease, box-shadow 80ms ease, filter 120ms',
            }}
          >
            Committen ⏎
          </button>
         </div>{/* /lf-mq-pad */}
        </div>
      </div>
    </div>
  );
}
