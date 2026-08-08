/**
 * Musik-Kompression (Paket 4.1): ersetzt die eingebetteten WAV-Loops in
 * client/src/game/audio-music.ts durch Opus/Ogg (verlustbehaftet, ~4× kleiner)
 * — OHNE die Musik selbst neu zu erzeugen (die exakt gleichen Töne bleiben,
 * nur komprimiert). Der Runtime-Dekoder (audio.ts) ist formatunabhängig
 * (decodeAudioData snifft den Container), also ist keine Code-Änderung nötig;
 * Browser ohne Opus-Unterstützung fallen automatisch auf den Synth zurück.
 *
 * Aufruf: node tools/compress-music.mjs [bitrate_k]   (Standard 64)
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = 'client/src/game/audio-music.ts';
const BITRATE = (process.argv[2] || '64') + 'k';

const text = readFileSync(SRC, 'utf8');
const re = /(\w+):\s*'data:audio\/wav;base64,([A-Za-z0-9+/=]+)'/g;
const dir = mkdtempSync(join(tmpdir(), 'mus-'));
let out = text;
let n = 0, wavBytes = 0, opusBytes = 0;

let m;
const jobs = [];
while ((m = re.exec(text)) !== null) jobs.push({ name: m[1], b64: m[2], full: m[0] });

for (const j of jobs) {
  const wav = Buffer.from(j.b64, 'base64');
  const wavPath = join(dir, j.name + '.wav');
  const oggPath = join(dir, j.name + '.ogg');
  writeFileSync(wavPath, wav);
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', wavPath,
    '-c:a', 'libopus', '-b:a', BITRATE, '-vbr', 'on',
    '-application', 'audio', '-ac', '1',
    '-f', 'ogg', oggPath,
  ]);
  const ogg = readFileSync(oggPath);
  const newB64 = ogg.toString('base64');
  const replacement = `${j.name}: 'data:audio/ogg;base64,${newB64}'`;
  out = out.replace(j.full, replacement);
  wavBytes += wav.length; opusBytes += ogg.length; n++;
  console.log(`  ${j.name.padEnd(12)} ${(wav.length/1024).toFixed(0).padStart(5)}KB → ${(ogg.length/1024).toFixed(0).padStart(4)}KB`);
}

// Header-Kommentar aktualisieren.
out = out.replace(
  /\/\/ Offline-gerenderte,[^\n]*\n/,
  '// Offline-gerenderte, nahtlos loopbare Hintergrund-Musik (base64 Opus/Ogg,\n// aus 16kHz-WAV komprimiert via tools/compress-music.mjs).\n',
);

writeFileSync(SRC, out);
rmSync(dir, { recursive: true, force: true });
console.log(`\n${n} Loops komprimiert: ${(wavBytes/1024/1024).toFixed(2)}MB WAV → ${(opusBytes/1024/1024).toFixed(2)}MB Opus (${BITRATE}), Faktor ${(wavBytes/opusBytes).toFixed(1)}×`);
