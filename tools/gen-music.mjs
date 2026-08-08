/**
 * Offline-Musik-Renderer v2 — erzeugt nahtlos loopbare, deutlich reichhaltigere
 * Hintergrund-Musik als WAV (16 kHz, 16-bit mono), base64-kodiert, autark
 * eingebettet.  Statt kurzer 2-Takt-Motive baut dieser Generator pro Welt eine
 * 4-Takt-Loop mit echter Akkordfolge, chord-tone-verankerter Melodie, Pad,
 * Arpeggio und stimmungsgerechten Instrumenten/Drums.
 *
 * Musikalisch „narrensicher": die Melodie bewegt sich in einer Tonleiter,
 * landet auf betonten Zählzeiten auf Akkordtönen und löst am Loop-Ende zur
 * Tonika auf.  Viele Welten nutzen Pentatonik (klingt praktisch nie „falsch").
 *
 * Nahtlosigkeit: alle Stimmen + Hall werden mit Modulo-Indexing (WRAP-ADD)
 * geschrieben, sodass Ausklänge über das Loop-Ende an den Anfang gefaltet
 * werden — kein Klick/Sprung am Loop-Punkt.
 */
import { writeFileSync } from 'node:fs';

const SR = 16000;                        // reicht für weiche Spiel-Musik, hält die Datei klein
const clamp = (v) => Math.max(-1, Math.min(1, v));
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Deterministischer PRNG (mulberry32) — pro Welt geseedet, damit die Melodie
// reproduzierbar ist (kein Math.random, jeder Build klingt identisch).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- WAV-Encoder (PCM16 mono) ----
function encodeWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(clamp(samples[i]) * 32767), 44 + i * 2);
  return buf;
}

// ---- Ton-Erzeuger: Obertöne + ADSR + optional Vibrato, WRAP-ADD ----
function voice(out, startT, dur, freq, {
  harmonics = [1, 0.5, 0.25], type = 'sine', gain = 0.5,
  attack = 0.008, release = 0.12, decay = 3.0, vibrato = 0, vibHz = 5.5,
} = {}) {
  const L = out.length;
  const s0 = Math.floor(startT * SR);
  const totalDur = dur + release;
  const s1 = s0 + Math.floor(totalDur * SR);
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    let env;
    if (t < attack) env = t / attack;
    else if (t < dur) env = Math.exp(-(t - attack) * decay);
    else env = Math.exp(-(dur - attack) * decay) * (1 - (t - dur) / release);
    if (env <= 0) continue;
    const vib = vibrato ? (1 + vibrato * Math.sin(2 * Math.PI * vibHz * t)) : 1;
    let v = 0;
    for (let h = 0; h < harmonics.length; h++) {
      const f = freq * (h + 1) * vib;
      const ph = 2 * Math.PI * f * t;
      let w;
      if (type === 'square') w = Math.sign(Math.sin(ph));
      else if (type === 'triangle') w = Math.asin(Math.sin(ph)) * (2 / Math.PI);
      else if (type === 'saw') w = 2 * (f * t - Math.floor(0.5 + f * t));
      else w = Math.sin(ph);
      v += harmonics[h] * w;
    }
    out[((i % L) + L) % L] += v * env * gain;
  }
}

// ---- Drums (WRAP-ADD) ----
function kick(out, startT, gain = 0.9) {
  const L = out.length, s0 = Math.floor(startT * SR), dur = 0.14;
  const s1 = s0 + Math.floor(dur * SR);
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    const f = 120 * Math.exp(-t * 24) + 45;
    const env = Math.exp(-t * 22);
    out[((i % L) + L) % L] += Math.sin(2 * Math.PI * f * t) * env * gain;
  }
}
function snare(out, startT, gain = 0.5, seed = 1) {
  const L = out.length, s0 = Math.floor(startT * SR), dur = 0.16;
  const s1 = s0 + Math.floor(dur * SR);
  const r = rng(seed * 12345 + 7);
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    const env = Math.exp(-t * 20);
    const tone = Math.sin(2 * Math.PI * 180 * t) * 0.4;
    out[((i % L) + L) % L] += ((r() * 2 - 1) * 0.8 + tone) * env * gain;
  }
}
function hat(out, startT, gain = 0.22, seed = 7) {
  const L = out.length, s0 = Math.floor(startT * SR), dur = 0.04;
  const s1 = s0 + Math.floor(dur * SR);
  const r = rng(seed * 6789 + 3);
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    const env = Math.exp(-t * 90);
    out[((i % L) + L) % L] += (r() * 2 - 1) * env * gain;
  }
}
// weicher „Herzschlag" für trommellose Wiegenlied-Welten
function softPulse(out, startT, gain = 0.3) {
  const L = out.length, s0 = Math.floor(startT * SR), dur = 0.2;
  const s1 = s0 + Math.floor(dur * SR);
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    const f = 90 * Math.exp(-t * 14) + 55;
    const env = Math.exp(-t * 12);
    out[((i % L) + L) % L] += Math.sin(2 * Math.PI * f * t) * env * gain;
  }
}

// Loop-sicherer Feedback-Hall.
function reverbLoop(samples, { delay = 0.055, feedback = 0.3, mix = 0.2, passes = 140 } = {}) {
  const L = samples.length, d = Math.floor(delay * SR);
  const wet = new Float32Array(L);
  for (let i = 0; i < L; i++) wet[i] = samples[i];
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < L; i++) {
      const j = ((i - d) % L + L) % L;
      wet[i] = samples[i] + wet[j] * feedback;
    }
  }
  for (let i = 0; i < L; i++) samples[i] = clamp(samples[i] * (1 - mix) + wet[i] * mix);
}

function normalize(samples, peak = 0.86) {
  let m = 0; for (const v of samples) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < samples.length; i++) samples[i] = samples[i] / m * peak;
}

// ---- Musiktheorie ----
const SCALES = {
  majorPenta: [0, 2, 4, 7, 9],
  minorPenta: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};
// Skalen-Ton -> Halbton relativ zur Tonika (mit Oktav-Übertrag).
function scaleTone(scale, deg) {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  const idx = ((deg % n) + n) % n;
  return scale[idx] + 12 * oct;
}
// Dreiklang (Terzschichtung in der Skala) auf einer Skalenstufe.
function triad(scale, deg) {
  return [scaleTone(scale, deg), scaleTone(scale, deg + 2), scaleTone(scale, deg + 4)];
}

// ---- Instrument-Profile (voice-Parameter je Charakter) ----
const INST = {
  bell:   { harmonics: [1, 0.6, 0.35, 0.18, 0.08], type: 'sine',     attack: 0.002, release: 0.5,  decay: 2.2, vibrato: 0,     gain: 0.13 },
  glass:  { harmonics: [1, 0.5, 0.28, 0.5, 0.2],   type: 'sine',     attack: 0.003, release: 0.45, decay: 2.6, vibrato: 0.004, gain: 0.11 },
  soft:   { harmonics: [1, 0.3, 0.12],             type: 'triangle', attack: 0.02,  release: 0.22, decay: 2.4, vibrato: 0.006, gain: 0.12 },
  flute:  { harmonics: [1, 0.25, 0.08],            type: 'sine',     attack: 0.03,  release: 0.2,  decay: 1.8, vibrato: 0.01,  gain: 0.13 },
  square: { harmonics: [1, 0.5, 0.25, 0.1],        type: 'square',   attack: 0.006, release: 0.09, decay: 3.2, vibrato: 0.003, gain: 0.09 },
  saw:    { harmonics: [1, 0.5, 0.2],              type: 'saw',      attack: 0.006, release: 0.08, decay: 3.4, vibrato: 0.004, gain: 0.085 },
};

// ---- WELT-KONFIGURATION ----
// root = MIDI der Tonika im Bass-Register.  prog = Skalenstufen je Takt (Länge=bars).
const THEMES = {
  // Abenteuer-Dschungel: dorisch, treibend, klare Chiptune-Leadstimme.
  jungle:     { root: 45, scale: 'dorian',     bpm: 130, bars: 4, prog: [0, 3, 4, 0], lead: 'square', drums: 'rock',   pad: true,  arp: 'up',     seed: 11 },
  // Höhle: moll, langsam, geheimnisvoll, viel Pad.
  cave:       { root: 41, scale: 'minor',      bpm: 92,  bars: 4, prog: [0, 5, 3, 4], lead: 'soft',   drums: 'gentle', pad: true,  arp: 'none',   seed: 22 },
  // Himmel: hell, luftig, Glöckchen.
  sky:        { root: 48, scale: 'lydian',     bpm: 140, bars: 4, prog: [0, 4, 5, 3], lead: 'bell',   drums: 'soft',   pad: true,  arp: 'up',     seed: 33 },
  // Strand: entspannt, pentatonisch, weich.
  beach:      { root: 45, scale: 'majorPenta', bpm: 116, bars: 4, prog: [0, 3, 4, 3], lead: 'flute',  drums: 'soft',   pad: true,  arp: 'bounce', seed: 44 },
  // Australien: mixolydisch, hüpfig.
  australia:  { root: 43, scale: 'mixolydian', bpm: 112, bars: 4, prog: [0, 4, 0, 4], lead: 'square', drums: 'rock',   pad: true,  arp: 'up',     seed: 55 },
  // Vulkan: moll, schnell, aggressiver Saw.
  volcano:    { root: 40, scale: 'minor',      bpm: 152, bars: 4, prog: [0, 1, 5, 4], lead: 'saw',    drums: 'rock',   pad: false, arp: 'down',   seed: 66 },
  // Eis: kristallklar, Glas-Glöckchen, langsam.
  ice:        { root: 48, scale: 'majorPenta', bpm: 104, bars: 4, prog: [0, 5, 3, 4], lead: 'glass',  drums: 'soft',   pad: true,  arp: 'up',     seed: 77 },
  // Schloss: moll, getragen, würdevoll.
  castle:     { root: 41, scale: 'minor',      bpm: 100, bars: 4, prog: [0, 5, 4, 0], lead: 'square', drums: 'rock',   pad: true,  arp: 'none',   seed: 88 },
  // Unterwasser: verträumt, keine Drums, viel Arp+Pad.
  underwater: { root: 46, scale: 'majorPenta', bpm: 88,  bars: 4, prog: [0, 3, 4, 3], lead: 'glass',  drums: 'none',   pad: true,  arp: 'bounce', seed: 99 },
  // Weltraum: schwebend-moll, Saw-Pad, weite Räume.
  space:      { root: 40, scale: 'minor',      bpm: 118, bars: 4, prog: [0, 3, 4, 5], lead: 'saw',    drums: 'soft',   pad: true,  arp: 'up',     seed: 111 },
  // Schule: verspielt-dur, flott.
  school:     { root: 48, scale: 'major',      bpm: 138, bars: 4, prog: [0, 4, 5, 4], lead: 'square', drums: 'rock',   pad: true,  arp: 'up',     seed: 122 },
  // Turnhalle: energiegeladen-dur.
  gym:        { root: 48, scale: 'major',      bpm: 134, bars: 4, prog: [0, 4, 0, 5], lead: 'square', drums: 'rock',   pad: true,  arp: 'bounce', seed: 133 },
  // Trampolin: hüpfig, hell, pentatonisch.
  trampoline: { root: 50, scale: 'majorPenta', bpm: 150, bars: 4, prog: [0, 3, 4, 0], lead: 'bell',   drums: 'rock',   pad: true,  arp: 'up',     seed: 144 },
  // Blaue Wiese (Overworld): fröhlich-dur, weich.
  bluefield:  { root: 50, scale: 'major',      bpm: 128, bars: 4, prog: [0, 4, 5, 3], lead: 'bell',   drums: 'soft',   pad: true,  arp: 'up',     seed: 155 },
  // Plüsch-Traumland: Spieluhr-Wiegenlied, sehr langsam, keine Drums.
  plush:      { root: 48, scale: 'majorPenta', bpm: 82,  bars: 4, prog: [0, 3, 4, 0], lead: 'bell',   drums: 'lullaby',pad: true,  arp: 'bounce', seed: 166 },
  // Drachenhöhle (Boss): moll, treibend-episch, tiefer Bass, klare Lead —
  // spannend & abenteuerlich, aber nicht gruselig.
  dragon:     { root: 38, scale: 'minor',      bpm: 112, bars: 4, prog: [0, 1, 5, 4], lead: 'square', drums: 'rock',   pad: true,  arp: 'down',   seed: 177 },
};

// ---- Melodie-Generator: chord-tone-verankert, schrittweise, mit Auflösung ----
function makeMelody(cfg, scale, steps) {
  const r = rng(cfg.seed);
  const stepsPerBar = steps / cfg.bars;
  const notes = [];               // {step, deg}
  let cur = 7;                    // Startgrad (etwa eine Quinte über der Tonika)
  const LO = 4, HI = 16;          // Melodie-Ambitus in Skalengraden
  for (let st = 0; st < steps; st++) {
    const bar = Math.floor(st / stepsPerBar);
    const posInBar = st % stepsPerBar;
    const strong = posInBar % 2 === 0;     // Achtel-Grid: jede zweite = Viertel
    const downbeat = posInBar === 0;
    const chordDeg = cfg.prog[bar % cfg.prog.length];
    const chordTones = [chordDeg, chordDeg + 2, chordDeg + 4];  // Grade des Dreiklangs
    // Am Loop-Ende zur Tonika auflösen (nahtloser Übergang).
    if (st >= steps - 2) { if (st === steps - 2) { notes.push({ step: st, deg: 0 }); } continue; }
    // Pausen: nie auf Downbeat; auf schwachen Achteln häufiger (Luft/Phrasierung).
    const restProb = downbeat ? 0 : (strong ? 0.12 : 0.32);
    if (r() < restProb) continue;
    let next;
    if (strong) {
      // Auf betonter Zeit: nächstgelegenen Akkordton wählen.
      let best = cur, bestD = 99;
      for (const ctBase of chordTones) {
        for (let oct = -1; oct <= 2; oct++) {
          const cand = ctBase + oct * scale.length;
          const d = Math.abs(cand - cur);
          if (d < bestD && cand >= LO && cand <= HI) { bestD = d; best = cand; }
        }
      }
      next = best;
    } else {
      // Auf schwacher Zeit: Schritt (±1) oder gelegentlich kleiner Sprung.
      const move = r() < 0.75 ? (r() < 0.5 ? 1 : -1) : (r() < 0.5 ? 2 : -2);
      next = cur + move;
      if (next < LO || next > HI) next = cur - move;
    }
    // Gelegentlicher Oktav-Glanzakzent auf betonter Zeit.
    let deg = next;
    if (strong && r() < 0.08 && deg + scale.length <= HI + 2) deg += scale.length;
    notes.push({ step: st, deg });
    cur = next;
  }
  return notes;
}

// ---- Loop-Renderer ----
function makeLoop(name) {
  const cfg = THEMES[name];
  const scale = SCALES[cfg.scale];
  const stepDur = (60 / cfg.bpm) / 2;                 // ein Achtel
  const steps = 8 * cfg.bars;
  const loopSec = steps * stepDur;
  const out = new Float32Array(Math.round(loopSec * SR));
  const stepsPerBar = steps / cfg.bars;
  const inst = INST[cfg.lead];

  // Melodie vorab bauen; Notenlänge = Abstand bis zur nächsten Note (Legato).
  const mel = makeMelody(cfg, scale, steps);
  for (let k = 0; k < mel.length; k++) {
    const { step, deg } = mel[k];
    const nextStep = k + 1 < mel.length ? mel[k + 1].step : steps;
    const holdSteps = Math.min(Math.max(nextStep - step, 1), 4);
    const t = step * stepDur;
    const midi = cfg.root + 24 + scaleTone(scale, deg);   // Lead ~2 Oktaven über Bass
    voice(out, t + 0.004, stepDur * holdSteps * 0.9, mtof(midi), {
      ...inst, gain: inst.gain,
    });
  }

  // Bass, Pad, Arp, Drums je Achtel-Schritt.
  const arpDir = cfg.arp;
  for (let st = 0; st < steps; st++) {
    const t = st * stepDur;
    const bar = Math.floor(st / stepsPerBar);
    const posInBar = st % stepsPerBar;
    const beat = posInBar % 2 === 0;
    const chordDeg = cfg.prog[bar % cfg.prog.length];
    const ch = triad(scale, chordDeg);

    // Bass: Grundton (+ gelegentlich Quinte) im tiefen Register, warm.
    const bassDeg = (posInBar === 4) ? chordDeg + 4 : chordDeg;   // Wechselnote auf Zählzeit 3
    const bassMidi = cfg.root + scaleTone(scale, bassDeg);
    voice(out, t, stepDur * 0.95, mtof(bassMidi), {
      harmonics: [1, 0.4, 0.15], type: 'triangle', gain: 0.32, attack: 0.006, release: 0.07, decay: 2.6,
    });
    voice(out, t, stepDur * 0.95, mtof(bassMidi - 12), {
      harmonics: [1], type: 'sine', gain: 0.16, attack: 0.01, release: 0.09, decay: 2.0,
    });

    // Pad/Akkord: auf jedem Viertel, weich, füllt den Raum.
    if (cfg.pad && beat) {
      for (const cd of ch) {
        voice(out, t, stepDur * 1.9, mtof(cfg.root + 12 + cd), {
          harmonics: [1, 0.3, 0.1], type: 'sine', gain: 0.05, attack: 0.04, release: 0.3, decay: 1.4,
        });
      }
    }

    // Arpeggio: Akkordtöne im mittleren Register (dezent).
    if (arpDir !== 'none') {
      const seq = arpDir === 'down' ? [2, 1, 0] : arpDir === 'bounce' ? [0, 1, 2, 1] : [0, 1, 2];
      const cd = ch[seq[st % seq.length]];
      voice(out, t, stepDur * 0.7, mtof(cfg.root + 12 + cd), {
        harmonics: [1, 0.4, 0.15], type: 'triangle', gain: 0.045, attack: 0.004, release: 0.12, decay: 3.0,
      });
    }

    // Drums je nach Profil.
    if (cfg.drums === 'rock') {
      if (posInBar === 0 || posInBar === 4) kick(out, t, 0.8);
      if (posInBar === 2 || posInBar === 6) snare(out, t, 0.4, st + 1);
      hat(out, t, posInBar % 2 === 0 ? 0.16 : 0.1, st + 3);
      if (bar === cfg.bars - 1 && posInBar >= 6) { snare(out, t + stepDur * 0.5, 0.28, st + 9); }
    } else if (cfg.drums === 'soft') {
      if (posInBar === 0 || posInBar === 4) kick(out, t, 0.55);
      if (posInBar === 4) snare(out, t, 0.22, st + 1);
      if (posInBar % 2 === 0) hat(out, t, 0.09, st + 3);
    } else if (cfg.drums === 'gentle') {
      if (posInBar === 0) kick(out, t, 0.5);
      if (posInBar === 4) hat(out, t, 0.08, st + 3);
    } else if (cfg.drums === 'lullaby') {
      // Wiegenlied: nur ein sehr weicher Puls auf Zählzeit 1 jedes Takts.
      if (posInBar === 0) softPulse(out, t, 0.22);
    }
  }

  const dreamy = cfg.drums === 'none' || cfg.drums === 'lullaby';
  reverbLoop(out, { delay: 0.06, feedback: dreamy ? 0.36 : 0.28, mix: dreamy ? 0.28 : 0.18, passes: 130 });
  normalize(out, 0.86);
  return { out, loopSec };
}

// Importierbar machen: Synthese-Bausteine exportieren, damit z. B.
// tools/add-dragon-music.mjs NUR einen einzelnen Loop rendern kann, ohne die
// bereits komprimierten 15 Loops zu überschreiben.
export { makeLoop, encodeWav, THEMES, SR };

// Datei-Schreiben NUR beim Direktaufruf (node tools/gen-music.mjs), nicht beim
// Import. ACHTUNG: überschreibt audio-music.ts mit UNKOMPRIMIERTEM WAV für ALLE
// Loops — danach zwingend `node tools/compress-music.mjs` ausführen.
const runDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/gen-music.mjs');
if (runDirectly) {
  const lines = [];
  let total = 0;
  for (const theme of Object.keys(THEMES)) {
    const { out, loopSec } = makeLoop(theme);
    const b64 = encodeWav(out).toString('base64');
    total += b64.length;
    lines.push(`  ${theme}: 'data:audio/wav;base64,${b64}',`);
    console.log(`${theme}: ${(b64.length / 1024).toFixed(1)} KB base64  (${loopSec.toFixed(2)}s @ ${SR}Hz)`);
  }
  const ts = `// AUTO-GENERIERT von tools/gen-music.mjs — nicht von Hand editieren.\n// Offline-gerenderte, nahtlos loopbare Hintergrund-Musik (base64 WAV, ${SR}Hz).\nexport const MUSIC_LOOPS: Record<string, string> = {\n${lines.join('\n')}\n};\n`;
  writeFileSync('client/src/game/audio-music.ts', ts);
  console.log(`GESAMT base64: ${(total / 1024).toFixed(1)} KB → client/src/game/audio-music.ts`);
  console.log('WICHTIG (Paket 4.1): danach `node tools/compress-music.mjs` ausführen,');
  console.log('  sonst bleibt die Musik als unkomprimiertes WAV (~4× größerer Build).');
}
