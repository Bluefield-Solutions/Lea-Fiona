/**
 * Offline-Audio-Renderer: erzeugt hochwertigere SFX als WAV (44.1 kHz, 16-bit
 * mono), base64-kodiert, und schreibt sie als TS-Modul (autark, keine externen
 * Dateien). Reichere Synthese (Obertöne, ADSR, kurzer Feedback-Hall) → deutlich
 * "runder" als die nackten Live-Oszillatoren.
 */
import { writeFileSync } from 'node:fs';

const SR = 44100;
const clamp = (v) => Math.max(-1, Math.min(1, v));

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

// ---- Bausteine ----
// Ton mit Obertönen + exponentiellem Decay.
function voice(out, startT, dur, freq, { harmonics = [1, 0.5, 0.25], type = 'sine', gain = 0.5, attack = 0.005, decay = 0.9 } = {}) {
  const s0 = Math.floor(startT * SR), s1 = Math.floor((startT + dur) * SR);
  for (let i = s0; i < s1 && i < out.length; i++) {
    const t = (i - s0) / SR;
    const env = (t < attack ? t / attack : Math.pow(1 - (t - attack) / (dur - attack), 2)) * Math.exp(-t * (1 / (dur * decay)));
    let v = 0;
    harmonics.forEach((amp, h) => {
      const f = freq * (h + 1);
      const ph = 2 * Math.PI * f * t;
      let w;
      if (type === 'square') w = Math.sign(Math.sin(ph));
      else if (type === 'triangle') w = Math.asin(Math.sin(ph)) * (2 / Math.PI);
      else if (type === 'saw') w = 2 * (f * t - Math.floor(0.5 + f * t));
      else w = Math.sin(ph);
      v += amp * w;
    });
    out[i] += v * env * gain;
  }
}

// Kurzer Feedback-Hall (Schweif) über das ganze Signal.
function reverb(samples, { delay = 0.045, feedback = 0.35, mix = 0.28 } = {}) {
  const d = Math.floor(delay * SR);
  const wet = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const echo = i >= d ? wet[i - d] * feedback : 0;
    wet[i] = samples[i] + echo;
  }
  for (let i = 0; i < samples.length; i++) samples[i] = clamp(samples[i] * (1 - mix) + wet[i] * mix);
}

function normalize(samples, peak = 0.85) {
  let m = 0; for (const v of samples) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < samples.length; i++) samples[i] = samples[i] / m * peak;
}

// Noten-Frequenzen (equal temperament, A4=440).
const N = (semisFromA4) => 440 * Math.pow(2, semisFromA4 / 12);

// ---- SFX-Definitionen ----
function makeCoin() {
  const out = new Float32Array(Math.floor(0.34 * SR));
  // Warme Zwei-Ton-Münze E6 → H6 mit Obertönen + Glanz.
  voice(out, 0.0, 0.10, N(19), { harmonics: [1, 0.4, 0.18, 0.08], type: 'triangle', gain: 0.5, decay: 0.7 });
  voice(out, 0.06, 0.24, N(26), { harmonics: [1, 0.45, 0.2, 0.1, 0.05], type: 'triangle', gain: 0.55, decay: 0.9 });
  reverb(out, { delay: 0.035, feedback: 0.3, mix: 0.22 });
  normalize(out, 0.8);
  return out;
}
function makePowerup() {
  const out = new Float32Array(Math.floor(0.72 * SR));
  // Aufsteigendes Arpeggio C-E-G-C, dann ein Glanz-Akkord (Verwandlungs-Gefühl).
  const notes = [N(3), N(7), N(10), N(15)];
  notes.forEach((f, k) => voice(out, k * 0.07, 0.4, f, { harmonics: [1, 0.5, 0.28, 0.14], type: 'triangle', gain: 0.5, decay: 0.9 }));
  const e = notes.length * 0.07;
  voice(out, e, 0.5, N(15), { harmonics: [1, 0.6, 0.3, 0.14], type: 'sine', gain: 0.3, decay: 1.0 }); // C6
  voice(out, e, 0.5, N(19), { harmonics: [1, 0.5, 0.2], type: 'sine', gain: 0.2, decay: 1.0 });        // E6 Glanz
  reverb(out, { delay: 0.05, feedback: 0.4, mix: 0.3 });
  normalize(out, 0.82);
  return out;
}
function makeFanfare() {
  const out = new Float32Array(Math.floor(1.9 * SR));
  const lead = (f, t, d, g = 0.4) => voice(out, t, d, f, { harmonics: [1, 0.5, 0.3, 0.16, 0.08], type: 'triangle', gain: g, decay: 0.9 });
  const bell = (f, t, d, g = 0.18) => voice(out, t, d, f, { harmonics: [1, 0.6, 0.35, 0.2, 0.1], type: 'sine', gain: g, decay: 1.15 });
  // Triumphaler Auftakt-Lauf G4-C5-E5-G5.
  lead(N(-2), 0.00, 0.14);
  lead(N(3),  0.14, 0.14);
  lead(N(7),  0.28, 0.14);
  lead(N(10), 0.42, 0.20);
  // Breiter Schluss-Akkord C-Dur (C5-E5-G5-C6) + Glöckchen-Glanz.
  const c = 0.60;
  lead(N(3),  c, 1.05, 0.32);
  lead(N(7),  c, 1.05, 0.24);
  lead(N(10), c, 1.05, 0.24);
  lead(N(15), c, 1.05, 0.22);
  bell(N(19), c + 0.05, 0.9, 0.13);   // E6
  bell(N(22), c + 0.18, 0.8, 0.10);   // G6
  bell(N(27), c + 0.34, 0.7, 0.07);   // C7 Funkeln
  // Bass-Fundament C3 + C4.
  voice(out, c, 1.1, N(-21), { harmonics: [1, 0.4, 0.15], type: 'triangle', gain: 0.3, decay: 1.0 });
  voice(out, c, 1.1, N(-9),  { harmonics: [1, 0.3], type: 'sine', gain: 0.2, decay: 1.0 });
  reverb(out, { delay: 0.06, feedback: 0.42, mix: 0.32 });
  normalize(out, 0.85);
  return out;
}

const ASSETS = { coin: makeCoin(), powerup: makePowerup(), fanfare: makeFanfare() };
const lines = [];
let total = 0;
for (const [name, samples] of Object.entries(ASSETS)) {
  const b64 = encodeWav(samples).toString('base64');
  total += b64.length;
  lines.push(`  ${name}: 'data:audio/wav;base64,${b64}',`);
  console.log(`${name}: ${(b64.length / 1024).toFixed(1)} KB base64  (${(samples.length / SR).toFixed(2)}s)`);
}
const ts = `// AUTO-GENERIERT von tools/gen-audio.mjs — nicht von Hand editieren.\n// Offline-gerenderte, autark eingebettete Audio-Samples (base64 WAV).\nexport const AUDIO_SAMPLES: Record<string, string> = {\n${lines.join('\n')}\n};\n`;
writeFileSync('client/src/game/audio-samples.ts', ts);
console.log(`GESAMT base64: ${(total / 1024).toFixed(1)} KB → client/src/game/audio-samples.ts`);
