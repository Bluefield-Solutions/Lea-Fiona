/**
 * Fügt NUR den Drachen-Musik-Loop (Welt 16) zur bereits komprimierten
 * audio-music.ts hinzu — ohne die vorhandenen 15 Opus-Loops anzufassen.
 * Rendert den Loop über die exportierten Bausteine aus gen-music.mjs, kodiert
 * ihn zu Opus/Ogg und ersetzt/ergänzt den 'dragon:'-Eintrag in MUSIC_LOOPS.
 */
import { makeLoop, encodeWav } from './gen-music.mjs';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = 'client/src/game/audio-music.ts';
const dir = mkdtempSync(join(tmpdir(), 'dragmus-'));

// 1) Loop rendern → WAV.
const { out, loopSec } = makeLoop('dragon');
const wav = encodeWav(out);
const wavPath = join(dir, 'dragon.wav');
const oggPath = join(dir, 'dragon.ogg');
writeFileSync(wavPath, wav);

// 2) Zu Opus/Ogg komprimieren (gleiche Einstellungen wie compress-music.mjs).
execFileSync('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-i', wavPath, '-c:a', 'libopus', '-b:a', '64k', '-vbr', 'on',
  '-application', 'audio', '-ac', '1', '-f', 'ogg', oggPath,
]);
const ogg = readFileSync(oggPath);
const b64 = ogg.toString('base64');
const entry = `  dragon: 'data:audio/ogg;base64,${b64}',`;

// 3) In audio-music.ts einfügen/ersetzen (nur der dragon-Eintrag).
let text = readFileSync(SRC, 'utf8');
if (/\n\s*dragon:\s*'data:audio[^\n]*\n/.test(text)) {
  text = text.replace(/\n\s*dragon:\s*'data:audio[^\n]*\n/, '\n' + entry + '\n');
} else {
  // vor der schließenden Klammer einfügen.
  text = text.replace(/\n\};\s*$/, '\n' + entry + '\n};\n');
}
writeFileSync(SRC, text);
rmSync(dir, { recursive: true, force: true });
console.log(`Drachen-Loop hinzugefügt: ${(wav.length/1024).toFixed(0)}KB WAV → ${(ogg.length/1024).toFixed(0)}KB Opus (${loopSec.toFixed(2)}s).`);
