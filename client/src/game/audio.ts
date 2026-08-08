import { ThemeName } from './constants';
import { getSettings, isMuted, setMuted, updateSettings } from './storage';
import { AUDIO_SAMPLES } from './audio-samples';
import { MUSIC_LOOPS } from './audio-music';

type Sfx =
  | 'jump'
  | 'doubleJump'
  | 'land'
  | 'coin'
  | 'stomp'
  | 'kick'
  | 'hurt'
  | 'death'
  | 'powerup'
  | 'blockHit'
  | 'brickBreak'
  | 'fanfare'
  | 'gameOver'
  | 'oneUp'
  | 'flag'
  | 'select'
  | 'pause'
  // Mario-feel additions
  | 'skid'
  | 'slide'
  | 'wallSlide'
  | 'pCharge'
  | 'bounceBoost'
  // Theme-Gegner SFX (Task #18)
  | 'monkeyThrow'
  | 'seagullDive'
  | 'slimeJump'
  | 'snowballRoll'
  | 'shieldBlock'
  | 'laserShoot'
  // Plüsch-Traumland
  | 'plushTransform'
  | 'plushSplash'
  // Plüsch-Dino-Geräusche
  | 'dinoStep'
  | 'dinoBoing'
  | 'dinoSnore'
  | 'dinoFlutter'
  // Sticker-Album
  | 'albumOpen'
  | 'stickerGet';

interface ThemeSong {
  bpm: number;
  bassNotes: number[];
  leadNotes: number[];
  chord: number[];
  waveLead: OscillatorType;
  waveBass: OscillatorType;
}

const THEMES: Record<ThemeName, ThemeSong> = {
  jungle: {
    bpm: 130,
    bassNotes: [110, 110, 165, 110, 138, 110, 165, 138],
    leadNotes: [330, 392, 440, 523, 440, 392, 330, 294],
    chord: [220, 277, 329],
    waveLead: 'square',
    waveBass: 'triangle',
  },
  cave: {
    bpm: 95,
    bassNotes: [82, 82, 73, 82, 110, 82, 73, 65],
    leadNotes: [196, 246, 220, 196, 165, 196, 220, 246],
    chord: [165, 196, 247],
    waveLead: 'triangle',
    waveBass: 'sine',
  },
  sky: {
    bpm: 145,
    bassNotes: [146, 146, 220, 146, 196, 220, 246, 220],
    leadNotes: [523, 587, 659, 698, 659, 587, 523, 440],
    chord: [261, 329, 392],
    waveLead: 'triangle',
    waveBass: 'sine',
  },
  beach: {
    bpm: 120,
    bassNotes: [110, 165, 110, 165, 138, 165, 110, 138],
    leadNotes: [440, 494, 523, 587, 523, 494, 440, 392],
    chord: [220, 277, 330],
    waveLead: 'sine',
    waveBass: 'triangle',
  },
  australia: {
    bpm: 110,
    bassNotes: [98, 98, 73, 98, 130, 98, 73, 110],
    leadNotes: [294, 330, 392, 440, 392, 330, 294, 247],
    chord: [196, 247, 294],
    waveLead: 'square',
    waveBass: 'sawtooth',
  },
  volcano: {
    bpm: 150,
    bassNotes: [73, 73, 65, 87, 65, 73, 87, 98],
    leadNotes: [220, 247, 261, 311, 261, 247, 220, 196],
    chord: [147, 175, 220],
    waveLead: 'sawtooth',
    waveBass: 'sawtooth',
  },
  ice: {
    bpm: 105,
    bassNotes: [123, 123, 165, 123, 147, 123, 165, 147],
    leadNotes: [392, 494, 587, 698, 587, 494, 392, 330],
    chord: [247, 311, 392],
    waveLead: 'triangle',
    waveBass: 'sine',
  },
  castle: {
    bpm: 100,
    bassNotes: [73, 73, 65, 73, 98, 73, 65, 87],
    leadNotes: [196, 220, 247, 294, 247, 220, 196, 175],
    chord: [147, 175, 220],
    waveLead: 'square',
    waveBass: 'triangle',
  },
  underwater: {
    bpm: 90,
    bassNotes: [98, 98, 130, 98, 110, 130, 147, 130],
    leadNotes: [330, 392, 440, 523, 440, 392, 330, 294],
    chord: [196, 247, 294],
    waveLead: 'sine',
    waveBass: 'sine',
  },
  space: {
    bpm: 120,
    bassNotes: [55, 55, 73, 55, 65, 73, 87, 73],
    leadNotes: [220, 261, 329, 392, 329, 261, 220, 174],
    chord: [110, 138, 165],
    waveLead: 'sawtooth',
    waveBass: 'square',
  },
  school: {
    bpm: 138,
    bassNotes: [131, 131, 196, 131, 175, 196, 220, 196],
    leadNotes: [392, 440, 523, 587, 523, 494, 440, 392],
    chord: [262, 330, 392],
    waveLead: 'square',
    waveBass: 'triangle',
  },
  // Turnhalle „Turnen" — sportlich-treibender Dur-Marsch, hell und rhythmisch
  // (Wettkampf-/Aufwärm-Stimmung), etwas ruhiger als Superfly.
  gym: {
    bpm: 134,
    bassNotes: [131, 131, 175, 131, 196, 175, 147, 196],
    leadNotes: [392, 494, 587, 523, 587, 494, 440, 392],
    chord: [262, 330, 392],
    waveLead: 'square',
    waveBass: 'triangle',
  },
  trampoline: {
    bpm: 150,
    bassNotes: [147, 147, 220, 196, 147, 175, 220, 247],
    leadNotes: [440, 523, 587, 659, 587, 523, 494, 440],
    chord: [294, 370, 440],
    waveLead: 'square',
    waveBass: 'sawtooth',
  },
  // Bluefield „blaue Wiese" — heller, optimistischer Dur-Lauf mit cleanem
  // sine/triangle-Klang: modern, ruhig-aufbauend, passt zum Labor-Thema.
  bluefield: {
    bpm: 128,
    bassNotes: [147, 147, 196, 147, 165, 196, 220, 196],
    leadNotes: [440, 554, 659, 587, 659, 554, 494, 440],
    chord: [294, 370, 440],
    waveLead: 'triangle',
    waveBass: 'sine',
  },
  // Plüsch-Traumland „Kuschelwelt" — sanftes, langsames Spieluhr-/Wiegenlied:
  // warmer Dur-Lauf, weiche sine/triangle-Töne, verträumt und beruhigend.
  plush: {
    bpm: 96,
    bassNotes: [131, 131, 165, 147, 175, 165, 147, 131],
    leadNotes: [523, 494, 440, 392, 440, 494, 587, 523],
    chord: [262, 330, 392],
    waveLead: 'sine',
    waveBass: 'sine',
  },
  // Drachenhöhle — dunkel-spannend in Moll: tiefe, langsame Bässe + eine
  // vorsichtig kletternde Melodie. Abenteuerlich-mystisch, aber nicht gruselig.
  dragon: {
    bpm: 104,
    bassNotes: [73, 73, 98, 73, 87, 73, 98, 110],
    leadNotes: [220, 261, 293, 261, 349, 293, 261, 220],
    chord: [147, 175, 220],
    waveLead: 'triangle',
    waveBass: 'sawtooth',
  },
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  /** AP 1.9: Gain des zweiten (Intensitäts-)Musik-Stems, 0..1 gefadet. */
  private layerGain: GainNode | null = null;
  /** AP 1.9: Pan (-1..1) für die SFX des aktuellen playSfx-Aufrufs. */
  private sfxPan = 0;
  /** Tonhöhen-Faktor (1 = normal) für die SFX des aktuellen playSfx-Aufrufs. */
  private sfxPitch = 1;
  private musicTimer: number | null = null;
  private musicStep = 0;
  // Startbildschirm-Musik (eigener, sanfter Loop, unabhängig vom Theme-Song).
  private titleTimer: number | null = null;
  private titleStep = 0;
  private currentTheme: ThemeName | null = null;
  private inited = false;
  /** Eingebettete, offline-gerenderte SFX-Samples (base64 WAV → AudioBuffer). */
  private sampleBuffers: Record<string, AudioBuffer> = {};
  /** Eingebettete, nahtlos loopbare Hintergrund-Musik (base64 WAV → AudioBuffer). */
  private musicLoopBuffers: Record<string, AudioBuffer> = {};
  /** Laufende Musik-Loop-Quelle (falls für das Theme eine Loop existiert). */
  private musicLoopSource: AudioBufferSourceNode | null = null;

  init() {
    if (this.inited) return;
    try {
      const Ctor: typeof AudioContext | undefined =
        (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      // AP 1.9: Intensitäts-Stem hängt am Musik-Bus (erbt musicVolume + Mute),
      // startet stumm und wird situativ eingefadet.
      this.layerGain = this.ctx.createGain();
      this.layerGain.gain.value = 0;
      this.layerGain.connect(this.musicGain);
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolume();
      this.inited = true;
      this.decodeSamples();
      this.decodeMusicLoops();
    } catch {
      this.ctx = null;
    }
  }

  /** Base64-WAV-SFX asynchron zu AudioBuffers dekodieren (einmalig, fehlertolerant). */
  private decodeSamples() {
    if (!this.ctx) return;
    for (const [name, dataUrl] of Object.entries(AUDIO_SAMPLES)) {
      try {
        const b64 = dataUrl.split(',')[1];
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        this.ctx.decodeAudioData(bytes.buffer, (buf) => { this.sampleBuffers[name] = buf; }, () => {});
      } catch { /* Fallback bleibt der Synth */ }
    }
  }

  /** Base64-WAV-Musikloops asynchron dekodieren; nach Fertigstellung ggf. auf die
   *  Loop des laufenden Themes umschalten. Fehlertolerant → Fallback ist der Synth. */
  private decodeMusicLoops() {
    if (!this.ctx) return;
    for (const [name, dataUrl] of Object.entries(MUSIC_LOOPS)) {
      try {
        const b64 = dataUrl.split(',')[1];
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        this.ctx.decodeAudioData(bytes.buffer, (buf) => {
          this.musicLoopBuffers[name] = buf;
          // Wenn dieses Theme gerade (noch über den Synth-Fallback) läuft, sauber
          // auf die dekodierte Loop umschalten. Direkt startMusicLoop statt
          // startMusic, da startMusic bei laufendem Synth früh zurückkehrt.
          if (this.currentTheme === name && this.musicLoopSource === null) {
            if (this.musicTimer !== null) { clearInterval(this.musicTimer); this.musicTimer = null; }
            this.startMusicLoop(name as ThemeName);
          }
        }, () => {});
      } catch { /* Fallback bleibt der Synth */ }
    }
  }

  /** Spielt ein eingebettetes SFX-Sample (falls dekodiert). false → Synth-Fallback. */
  private playSample(name: string, pan = 0, pitchMul = 1): boolean {
    if (!this.ctx || !this.sfxGain) return false;
    const buf = this.sampleBuffers[name];
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    if (pitchMul > 0 && pitchMul !== 1) src.playbackRate.value = pitchMul;
    let node: AudioNode = src;
    if (pan !== 0 && typeof this.ctx.createStereoPanner === 'function') {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      src.connect(p); node = p;
    }
    node.connect(this.sfxGain);
    src.start();
    return true;
  }

  /** Startet die eingebettete Loop für ein Theme (falls dekodiert). false → Synth-Loop. */
  private startMusicLoop(theme: ThemeName): boolean {
    if (!this.ctx || !this.musicGain) return false;
    const buf = this.musicLoopBuffers[theme];
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.musicGain);
    src.start();
    this.musicLoopSource = src;
    return true;
  }

  private stopMusicLoop() {
    if (this.musicLoopSource) {
      try { this.musicLoopSource.stop(); } catch { /* egal */ }
      try { this.musicLoopSource.disconnect(); } catch { /* egal */ }
      this.musicLoopSource = null;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  setMuted(muted: boolean) {
    setMuted(muted);
    this.applyVolume();
  }

  toggleMuted(): boolean {
    const newMuted = !isMuted();
    this.setMuted(newMuted);
    return newMuted;
  }

  isMuted(): boolean {
    return isMuted();
  }

  setMusicVolume(v: number) {
    updateSettings({ musicVolume: Math.min(1, Math.max(0, v)) });
    this.applyVolume();
  }

  setSfxVolume(v: number) {
    updateSettings({ sfxVolume: Math.min(1, Math.max(0, v)) });
    this.applyVolume();
  }

  applyVolume() {
    if (!this.master) return;
    const s = getSettings();
    const muted = s.muted;
    this.master.gain.setValueAtTime(1.0, this.ctx!.currentTime);
    if (this.musicGain) this.musicGain.gain.setValueAtTime(muted ? 0 : s.musicVolume, this.ctx!.currentTime);
    if (this.sfxGain) this.sfxGain.gain.setValueAtTime(muted ? 0 : s.sfxVolume, this.ctx!.currentTime);
  }

  playSfx(name: Sfx, pan = 0, pitchMul = 1) {
    if (!this.inited || !this.ctx || !this.sfxGain) return;
    this.sfxPan = Math.max(-1, Math.min(1, pan));
    this.sfxPitch = pitchMul > 0 ? pitchMul : 1;
    // Bevorzugt eingebettete, hochwertige Samples; sonst Synth-Fallback.
    if ((name === 'coin' || name === 'powerup' || name === 'fanfare') &&
        this.playSample(name, this.sfxPan, this.sfxPitch)) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    switch (name) {
      // Sprung: weicher, warmer „Hop" (Dreieck statt hartem Rechteck) + Sinus-Glanz.
      case 'jump': this.tone(600, 0.07, 'triangle', 0.2, now, 0.002, 0.035); this.tone(900, 0.05, 'sine', 0.1, now + 0.02, 0.002, 0.03); break;
      // Flügelschlag: zwei luftige „fwp-fwp"-Puffs (Rausch) + heller Aufschwung-
      // Akkord — signalisiert die Flügel-Fähigkeit deutlich hörbar.
      case 'doubleJump': this.noise(0.06, now, 0.09); this.noise(0.05, now + 0.09, 0.07); this.tone(880, 0.05, 'triangle', 0.13, now, 0.002, 0.03); this.tone(1320, 0.06, 'sine', 0.11, now + 0.05, 0.002, 0.05); this.tone(1760, 0.05, 'sine', 0.06, now + 0.10, 0.002, 0.05); break;
      case 'land': this.tone(180, 0.05, 'sine', 0.1, now); this.tone(110, 0.06, 'sine', 0.08, now, 0.002, 0.04); break;
      case 'coin': this.tone(988, 0.05, 'square', 0.18, now); this.tone(1318, 0.10, 'square', 0.18, now + 0.05); break;
      // Gegner besiegen: runder „Boop"-Squish mit Körper + Sub-Bass-Punch.
      case 'stomp': this.tone(300, 0.06, 'triangle', 0.17, now, 0.002, 0.03); this.tone(160, 0.10, 'sine', 0.2, now, 0.002, 0.05); this.bassPunch(now, 0.28); break;
      case 'kick': this.tone(170, 0.09, 'triangle', 0.2, now, 0.002, 0.04); this.tone(85, 0.10, 'sine', 0.2, now, 0.002, 0.05); this.bassPunch(now, 0.26); break;
      // Schaden: weiches, abfallendes „Oh-oh" (Dreieck statt kratzigem Sägezahn).
      case 'hurt': this.tone(392, 0.09, 'triangle', 0.2, now, 0.004, 0.05); this.tone(294, 0.16, 'triangle', 0.18, now + 0.08, 0.004, 0.09); break;
      // Tod: sanft-komischer Abwärts-Fall (kindgerecht) mit weichem Schluss-Ton.
      case 'death': this.descend(700, 180, 0.55, 'triangle', 0.2, now); this.tone(175, 0.22, 'sine', 0.13, now + 0.5, 0.01, 0.16); break;
      case 'powerup': this.ascend(440, 880, 0.45, 'square', 0.20, now); break;
      case 'blockHit': this.tone(240, 0.05, 'triangle', 0.18, now, 0.002, 0.03); this.tone(360, 0.05, 'sine', 0.12, now + 0.04, 0.002, 0.03); break;
      case 'brickBreak': this.noise(0.18, now, 0.25); break;
      case 'fanfare':
        this.tone(523, 0.18, 'square', 0.22, now);
        this.tone(659, 0.18, 'square', 0.22, now + 0.18);
        this.tone(784, 0.18, 'square', 0.22, now + 0.36);
        this.tone(1046, 0.36, 'square', 0.25, now + 0.54);
        break;
      case 'gameOver':
        this.tone(330, 0.25, 'sawtooth', 0.22, now);
        this.tone(220, 0.30, 'sawtooth', 0.22, now + 0.30);
        this.tone(165, 0.50, 'sawtooth', 0.22, now + 0.55);
        break;
      case 'oneUp': {
        // Fröhliches, ansteigendes 1-UP-Motiv + weicher Glöckchen-Schluss-Akkord.
        const seq = [659, 784, 1047, 880, 988, 1319];
        seq.forEach((f, i) => {
          this.tone(f, 0.11, 'triangle', 0.18, now + i * 0.085, 0.004, 0.05);
          this.tone(f * 2, 0.07, 'sine', 0.05, now + i * 0.085, 0.003, 0.05);   // Glanz-Oktave
        });
        const e = now + 6 * 0.085;
        this.tone(1047, 0.5, 'sine', 0.12, e, 0.005, 0.35);
        this.tone(1319, 0.5, 'sine', 0.10, e, 0.005, 0.35);
        this.tone(1568, 0.5, 'sine', 0.08, e, 0.005, 0.35);
        break;
      }
      case 'flag': {
        // Sieg beim Fahnen-Griff: aufsteigender Lauf, löst zu einem hellen
        // Dur-Akkord auf (C-Dur) mit Glöckchen-Glanz.
        this.tone(523, 0.12, 'triangle', 0.18, now, 0.005, 0.05);
        this.tone(659, 0.12, 'triangle', 0.18, now + 0.12, 0.005, 0.05);
        this.tone(784, 0.12, 'triangle', 0.18, now + 0.24, 0.005, 0.05);
        const c = now + 0.36;
        this.tone(1047, 0.45, 'sine', 0.16, c, 0.006, 0.3);
        this.tone(659, 0.45, 'sine', 0.10, c, 0.006, 0.3);
        this.tone(784, 0.45, 'sine', 0.10, c, 0.006, 0.3);
        this.tone(262, 0.45, 'triangle', 0.12, c, 0.01, 0.25);   // Bass-Fundament
        break;
      }
      case 'select': this.tone(880, 0.05, 'square', 0.16, now); break;
      case 'pause': this.tone(440, 0.06, 'triangle', 0.18, now); this.tone(660, 0.06, 'triangle', 0.18, now + 0.06); break;
      // Skid: very short tire-screech-style noise burst.
      case 'skid': this.noise(0.10, now, 0.14); break;
      // Slide: slightly longer noise burst — more "swooshy" than skid.
      case 'slide': this.noise(0.28, now, 0.18); break;
      // Wall-slide: ultra-short scrape, played once on grip.
      case 'wallSlide': this.noise(0.06, now, 0.12); break;
      // P-meter ready: ascending two-step chime, distinct from powerup.
      case 'pCharge':
        this.tone(660, 0.06, 'square', 0.18, now);
        this.tone(880, 0.06, 'square', 0.18, now + 0.06);
        this.tone(1320, 0.10, 'square', 0.20, now + 0.12);
        break;
      // Bounce boost: stomp + a higher-pitched ping on top, so the high
      // trampoline-bounce feels rewarding.
      case 'bounceBoost':
        this.tone(220, 0.08, 'sine', 0.20, now);
        this.tone(120, 0.08, 'sine', 0.18, now + 0.02);
        this.tone(990, 0.10, 'square', 0.16, now + 0.02);
        this.tone(1320, 0.10, 'square', 0.14, now + 0.08);
        break;
      // Plüsch-Verwandlung: weiches, aufsteigendes „Pling" (Spieluhr-Glöckchen).
      case 'plushTransform': {
        // Verwandlung im Plüsch-Traumland: funkelndes Spieluhr-Arpeggio
        // (Pentatonik) das weich in einen Akkord ausklingt.
        const seq = [523, 659, 784, 988, 1047, 1319];
        seq.forEach((f, i) => {
          this.tone(f, 0.5, 'sine', 0.13, now + i * 0.05, 0.002, 0.4);
          this.tone(f * 2, 0.3, 'sine', 0.045, now + i * 0.05, 0.002, 0.3);   // Glöckchen-Glanz
        });
        const e = now + 6 * 0.05;
        this.tone(523, 0.6, 'sine', 0.09, e, 0.02, 0.45);
        this.tone(784, 0.6, 'sine', 0.07, e, 0.02, 0.45);
        this.tone(1047, 0.6, 'sine', 0.06, e, 0.02, 0.45);
        break;
      }
      // Elefanten-Wasserspritzer: kurzes „Platsch" (abfallender Ton + weiches Rauschen).
      case 'plushSplash':
        this.descend(920, 320, 0.16, 'sine', 0.16, now);
        this.noise(0.12, now + 0.02, 0.10);
        break;
      // Affe wirft Kokosnuss — kurzer hohlerer Holzklang.
      case 'monkeyThrow':
        this.tone(330, 0.06, 'square', 0.14, now);
        this.tone(220, 0.08, 'triangle', 0.16, now + 0.04);
        break;
      // Möwen-Sturzflug — schreiender Abwärts-Sweep.
      case 'seagullDive':
        this.descend(1320, 660, 0.20, 'sawtooth', 0.16, now);
        break;
      // Lava-Slime hüpft — feuchter, kurzer Plopp.
      case 'slimeJump':
        this.tone(180, 0.05, 'sine', 0.18, now);
        this.tone(260, 0.06, 'triangle', 0.14, now + 0.03);
        break;
      // Schneeball rollt — Rauschen mit leichtem Tonfall.
      case 'snowballRoll':
        this.noise(0.16, now, 0.14);
        this.tone(220, 0.10, 'triangle', 0.10, now);
        break;
      // Schild blockt — metallischer Klick + tiefer Klang.
      case 'shieldBlock':
        this.tone(880, 0.04, 'square', 0.20, now);
        this.tone(220, 0.10, 'sine', 0.18, now + 0.02);
        break;
      // UFO-Laser — schnell absteigender hochfrequenter Sweep.
      case 'laserShoot':
        this.descend(1760, 440, 0.12, 'sawtooth', 0.14, now);
        break;
      // Läufer-Dino tapst — sehr leiser, weicher Watschel-Schritt.
      case 'dinoStep':
        this.tone(160, 0.045, 'sine', 0.06, now);
        this.tone(240, 0.04, 'triangle', 0.04, now + 0.02);
        break;
      // Hüpf-Dino — knuffiges „Boing" (rauf und wieder runter).
      case 'dinoBoing':
        this.ascend(240, 560, 0.09, 'triangle', 0.14, now);
        this.descend(560, 300, 0.12, 'triangle', 0.11, now + 0.09);
        break;
      // Panzer-Dino schnarcht — tiefes, weiches, langsam abfallendes Brummen.
      case 'dinoSnore':
        this.descend(150, 82, 0.5, 'sawtooth', 0.07, now);
        this.tone(70, 0.5, 'sine', 0.05, now + 0.04);
        break;
      // Flatter-Dino — sehr leises, luftiges Doppel-„Flatter" (Flügelschlag).
      case 'dinoFlutter':
        this.noise(0.05, now, 0.05);
        this.tone(700, 0.05, 'sine', 0.05, now, 0.004, 0.04);
        this.noise(0.04, now + 0.09, 0.04);
        this.tone(620, 0.04, 'sine', 0.04, now + 0.09, 0.004, 0.03);
        break;
      // Album öffnen — weiches „Blättern" (zwei leise Papier-Rauscher + tiefer Ton).
      case 'albumOpen':
        this.noise(0.09, now, 0.10);
        this.tone(320, 0.10, 'sine', 0.08, now + 0.01, 0.01, 0.08);
        this.noise(0.07, now + 0.12, 0.08);
        break;
      // Neuer Sticker gefunden — fröhliches, aufsteigendes Glöckchen-„Pling".
      case 'stickerGet':
        this.tone(1047, 0.12, 'sine', 0.16, now, 0.003, 0.1);
        this.tone(1568, 0.30, 'sine', 0.14, now + 0.07, 0.003, 0.25);
        this.tone(2093, 0.22, 'sine', 0.06, now + 0.11, 0.003, 0.2);
        break;
    }
    this.sfxPan = 0;
  }

  /** AP 1.9: kurzer, wuchtiger Sub-Bass-Impuls (Sweep 150→45 Hz) für Gewicht
   *  bei Stomps/Kicks/Landungen. Mittig (kein Pan), an den SFX-Bus. */
  bassPunch(when?: number, gain = 0.32) {
    if (!this.inited || !this.ctx || !this.sfxGain) return;
    const now = when ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.18);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** AP 1.9: blendet den Intensitäts-Stem (0..1) weich ein/aus. */
  setMusicIntensity(level: number) {
    if (!this.ctx || !this.layerGain) return;
    const target = Math.max(0, Math.min(1, level)) * 0.07;
    const now = this.ctx.currentTime;
    this.layerGain.gain.cancelScheduledValues(now);
    this.layerGain.gain.setValueAtTime(this.layerGain.gain.value, now);
    this.layerGain.gain.linearRampToValueAtTime(target, now + 0.4);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, when: number, attack = 0.005, release = 0.04) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq * this.sfxPitch, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + attack);
    g.gain.linearRampToValueAtTime(0, when + dur + release);
    osc.connect(g);
    // AP 1.9: positionsabhängiges Stereo-Panning. Nur einfügen, wenn nötig
    // (spart Nodes bei mittigen SFX) und vom Browser unterstützt.
    if (this.sfxPan !== 0 && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.setValueAtTime(Math.max(-1, Math.min(1, this.sfxPan)), when);
      g.connect(p);
      p.connect(this.sfxGain);
    } else {
      g.connect(this.sfxGain);
    }
    osc.start(when);
    osc.stop(when + dur + release + 0.05);
  }

  private ascend(f1: number, f2: number, dur: number, type: OscillatorType, gain: number, when: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, when);
    osc.frequency.exponentialRampToValueAtTime(f2, when + dur);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.01);
    g.gain.linearRampToValueAtTime(0, when + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  private descend(f1: number, f2: number, dur: number, type: OscillatorType, gain: number, when: number) {
    this.ascend(f1, f2, dur, type, gain, when);
  }

  private noise(dur: number, when: number, gain: number) {
    if (!this.ctx || !this.sfxGain) return;
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * dur));
    const buffer = this.ctx.createBuffer(1, len, sr);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    src.connect(g);
    g.connect(this.sfxGain);
    src.start(when);
  }

  startMusic(theme: ThemeName) {
    if (!this.inited) return;
    if (this.currentTheme === theme && (this.musicLoopSource !== null || this.musicTimer !== null)) return;
    this.stopMusic();
    this.currentTheme = theme;
    this.musicStep = 0;
    // Bevorzugt die nahtlose, eingebettete Audio-Loop; sonst prozeduraler Synth.
    if (this.startMusicLoop(theme)) return;
    const song = THEMES[theme] ?? THEMES.jungle;
    const interval = (60 / song.bpm) * 1000 / 2;
    const tick = () => {
      this.playMusicStep(song);
      this.musicStep = (this.musicStep + 1) % song.bassNotes.length;
    };
    tick();
    this.musicTimer = window.setInterval(tick, interval);
  }

  private playMusicStep(song: ThemeSong) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const stepDur = (60 / song.bpm) / 2;
    // bass
    {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = song.waveBass;
      osc.frequency.setValueAtTime(song.bassNotes[this.musicStep], now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.18, now + 0.005);
      g.gain.linearRampToValueAtTime(0, now + stepDur * 0.95);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + stepDur);
    }
    // lead on every beat
    {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = song.waveLead;
      osc.frequency.setValueAtTime(song.leadNotes[this.musicStep], now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.10, now + 0.01);
      g.gain.linearRampToValueAtTime(0, now + stepDur * 0.85);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + stepDur);
    }
    // AP 1.9: Intensitäts-Stem — eine Oktave über dem Lead, dreieckig und
    // leiser, läuft über layerGain (situativ ein-/ausgefadet via
    // setMusicIntensity). Bei layerGain≈0 unhörbar.
    if (this.layerGain) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(song.leadNotes[this.musicStep] * 2, now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.5, now + 0.02);
      g.gain.linearRampToValueAtTime(0, now + stepDur * 0.7);
      osc.connect(g);
      g.connect(this.layerGain);
      osc.start(now);
      osc.stop(now + stepDur);
    }
  }

  // ── Startbildschirm-Musik ────────────────────────────────────────────
  // Sanfter, ruhiger Ambient-Loop für den Titelscreen: weiche Sinus-Bässe
  // mit einem zarten Arpeggio darüber, deutlich leiser und langsamer als
  // die lebhafte In-Game-Musik. Läuft über musicGain (erbt musicVolume +
  // Mute). Beruhigende Akkordfolge C–a–F–G.
  startTitleMusic() {
    if (!this.inited || !this.ctx) return;
    if (this.titleTimer !== null) return; // läuft bereits
    // Bass je Akkord (zwei Schritte pro Akkord), tiefe, weiche Grundtöne.
    const bass = [131, 131, 110, 110, 87, 87, 98, 98];        // C3 a2 F2 G2
    // Zartes Arpeggio darüber (pentatonisch, schwebend).
    const lead = [523, 659, 587, 784, 440, 523, 494, 587];    // C5 E5 D5 G5 …
    const bpm = 60;                                            // ruhig
    const interval = (60 / bpm) * 1000;
    const tick = () => {
      if (!this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const dur = 60 / bpm;
      const i = this.titleStep % bass.length;
      // Weicher, langer Bass-Pad-Ton.
      this.softVoice(bass[i], dur * 1.9, 'sine', 0.085, now, 0.12, 0.6);
      // Zarte Quinte für Fülle (sehr leise).
      this.softVoice(bass[i] * 1.5, dur * 1.9, 'sine', 0.035, now, 0.12, 0.6);
      // Arpeggio-Ton (weich, kurz nachklingend).
      this.softVoice(lead[i], dur * 1.1, 'triangle', 0.05, now + 0.04, 0.06, 0.4);
      // Sanfte Oktav-Glocke auf jedem zweiten Schritt für etwas Glanz.
      if (i % 2 === 0) this.softVoice(lead[i] * 2, dur * 0.8, 'sine', 0.022, now + 0.08, 0.04, 0.4);
      this.titleStep++;
    };
    tick();
    this.titleTimer = window.setInterval(tick, interval);
  }

  stopTitleMusic() {
    if (this.titleTimer !== null) {
      clearInterval(this.titleTimer);
      this.titleTimer = null;
    }
    this.titleStep = 0;
  }

  // Weiche Einzelstimme über den Musik-Bus, mit sanfter Attack/Release-
  // Hüllkurve (für den Title-Ambient-Loop).
  private softVoice(freq: number, dur: number, type: OscillatorType, gain: number, when: number, attack: number, release: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + attack);
    g.gain.linearRampToValueAtTime(0, when + dur + release);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(when);
    osc.stop(when + dur + release + 0.05);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.stopMusicLoop();
    this.currentTheme = null;
  }

  pauseMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.stopMusicLoop();
  }

  resumeMusic(theme: ThemeName) {
    if (this.musicTimer === null && this.musicLoopSource === null && this.inited) {
      this.startMusic(theme);
    }
  }
}

export const audio = new AudioEngine();
