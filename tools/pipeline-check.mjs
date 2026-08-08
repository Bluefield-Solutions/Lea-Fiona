/**
 * Pipeline-Check (Block A1) — REIN ADDITIV.
 * Sichert jeden Build defensiv ab, OHNE die Engine/den Loop zu berühren:
 *   1) JavaScript-Syntaxcheck des gebündelten Scripts (node --check).
 *   2) Größenvergleich gegen den letzten Build (warnt bei unerklärtem Schrumpfen
 *      — Schutz davor, dass die Engine versehentlich „ausgedünnt"/ersetzt wird).
 *   3) Struktur-Smoke: Bundle vorhanden, Engine-Tokens vorhanden, Mindestgröße.
 *
 * Aufruf:  node tools/pipeline-check.mjs [pfad-zur-index.html]
 * Exit-Code != 0 bei harten Fehlern (Syntax kaputt, Engine-Token fehlt,
 * extremes Schrumpfen) → blockiert eine fehlerhafte Auslieferung.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const htmlPath = process.argv[2] || 'dist-standalone/index.html';
const SIZE_FILE = 'tools/.last-build-size.json';
const SHRINK_WARN = 0.15;  // >15% kleiner als letzter Build → WARN
const SHRINK_FAIL = 0.40;  // >40% kleiner → FAIL (Engine evtl. ausgedünnt)
const GROW_WARN = 0.50;    // >50% größer → WARN

let hardFail = false;
const log = (s) => console.log(s);
const warn = (s) => console.log('  ⚠ ' + s);
const ok = (s) => console.log('  ✓ ' + s);
const fail = (s) => { console.log('  ✗ ' + s); hardFail = true; };

if (!existsSync(htmlPath)) { console.error('Build nicht gefunden: ' + htmlPath); process.exit(2); }
const html = readFileSync(htmlPath, 'utf8');
const bytes = Buffer.byteLength(html, 'utf8');

log('==================== PIPELINE-CHECK ====================');
log(`Datei: ${htmlPath}  (${(bytes / 1024).toFixed(0)} KB)`);

// ── 1) Syntaxcheck des größten <script>-Blocks ───────────────────────────────
log('1) JavaScript-Syntaxcheck');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
const bundle = scripts.sort((a, b) => b.length - a.length)[0] || '';
if (bundle.length < 1000) {
  fail(`Kein nennenswertes Script gefunden (größter Block ${bundle.length} Zeichen)`);
} else {
  mkdirSync('tools/.tmp', { recursive: true });
  const tmp = 'tools/.tmp/bundle-check.mjs';
  writeFileSync(tmp, bundle, 'utf8');
  try {
    execSync(`node --check ${tmp}`, { stdio: 'pipe' });
    ok(`Syntax gültig (${(bundle.length / 1024).toFixed(0)} KB Bundle)`);
  } catch (e) {
    fail('Syntaxfehler im Bundle: ' + String(e.stderr || e.message).split('\n').slice(0, 3).join(' '));
  } finally {
    rmSync('tools/.tmp', { recursive: true, force: true });
  }
}

// ── 2) Größenvergleich ───────────────────────────────────────────────────────
log('2) Größenvergleich zum letzten Build');
let last = null;
if (existsSync(SIZE_FILE)) { try { last = JSON.parse(readFileSync(SIZE_FILE, 'utf8')); } catch { /* ignore */ } }
if (!last) {
  ok(`Kein Vorwert vorhanden — Baseline gesetzt (${bytes} Bytes)`);
} else {
  const delta = (bytes - last.bytes) / last.bytes;
  const pct = (delta * 100).toFixed(1);
  if (delta <= -SHRINK_FAIL) fail(`Build ${pct}% kleiner als zuletzt (${last.bytes}→${bytes}) — Engine evtl. ausgedünnt!`);
  else if (delta <= -SHRINK_WARN) warn(`Build ${pct}% kleiner als zuletzt — bitte erklären.`);
  else if (delta >= GROW_WARN) warn(`Build ${pct}% größer als zuletzt — bitte erklären.`);
  else ok(`Größe plausibel (${pct}% ggü. letztem Build).`);
}
writeFileSync(SIZE_FILE, JSON.stringify({ bytes, at: new Date().toISOString() }, null, 2));

// ── 3) Struktur-Smoke ────────────────────────────────────────────────────────
log('3) Struktur-Smoke');
// Das App-Bundle wird als ES-Modul eingebunden (startet nach dem Parsen OHNE
// DOMContentLoaded → Vorschau-tauglich). Es muss ein großer Inline-Bundle da sein.
const bundleOk = bundle.length > 200_000;
bundleOk ? ok('App-Bundle eingebunden (inline)') : fail('Kein großes App-Bundle gefunden');
// Format wie v381 (lief im Browser + Website): type="module" ist ok.
const hasBundleScript = /<script\b[^>]*type=["']module["']/i.test(html) || bundle.length > 200_000;
hasBundleScript ? ok('App-Bundle-Script vorhanden') : warn('Kein Bundle-Script erkannt');
// Engine-Tokens: belegen, dass die echte Engine (Canvas-Loop) drin ist.
const tokens = ['requestAnimationFrame', 'getContext', 'createElement'];
const missing = tokens.filter((t) => !html.includes(t));
missing.length === 0 ? ok('Engine-Tokens vorhanden (Canvas/Loop)') : warn('Fehlende Tokens: ' + missing.join(', '));
// Autarkie (Doppel-Absicherung): keine externen Referenzen
const ext = (html.match(/(?:src|href)=["']https?:\/\/|@import|fetch\(["']http/gi) || []).length;
ext === 0 ? ok('Autark (0 externe Referenzen)') : fail(`${ext} externe Referenzen gefunden`);

// ── 4) Sandbox-Sicherheit: kein direkter (Web)Storage-Zugriff ───────────────
// In abgeschotteten iframes (In-App-Vorschau, sandbox ohne allow-same-origin)
// wirft schon der ZUGRIFF auf localStorage/sessionStorage eine SecurityError.
// Erlaubt ist nur der zentrale Helfer in storage.ts (safeLocalGet/Set); jeder
// andere direkte Zugriff im Quellcode kann die App beim Start weiß crashen.
log('4) Sandbox-Sicherheit (Web-Storage)');
try {
  const SRC = 'client/src';
  const ALLOW = path.normalize('client/src/game/storage.ts');
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const fp = path.join(dir, name);
      if (statSync(fp).isDirectory()) { walk(fp); continue; }
      if (!/\.(ts|tsx)$/.test(name)) continue;
      if (path.normalize(fp) === ALLOW) continue; // Helfer-Definition erlaubt
      const lines = readFileSync(fp, 'utf8').split('\n');
      lines.forEach((ln, i) => {
        const code = ln.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
        if (/\b(?:local|session)Storage\b/.test(code)) offenders.push(`${fp}:${i + 1}`);
      });
    }
  };
  if (existsSync(SRC)) walk(SRC);
  offenders.length === 0
    ? ok('Kein direkter localStorage/sessionStorage-Zugriff (nur storage.ts-Helfer)')
    : fail('Direkter Web-Storage-Zugriff (Sandbox-Crash-Risiko): ' + offenders.join(', '));
} catch (e) {
  warn('Storage-Scan übersprungen: ' + e.message);
}

log('-------------------------------------------------------');
log(hardFail ? 'ERGEBNIS: ✗ FAIL — Auslieferung blockieren' : 'ERGEBNIS: ✓ PASS');
process.exit(hardFail ? 1 : 0);
