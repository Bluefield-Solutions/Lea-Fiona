import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = 'webapp';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!existsSync(file)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://localhost:${port}/`;
console.log('Server:', base);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(base, { waitUntil: 'load' });
// Auf SW-Aktivierung warten.
await page.waitForFunction(async () => {
  if (!navigator.serviceWorker) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(reg && (reg.active));
}, { timeout: 15000 });
const swActive = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const keys = await caches.keys();
  let n = 0;
  for (const k of keys) { const c = await caches.open(k); n += (await c.keys()).length; }
  return { scope: reg && reg.scope, caches: keys, cachedEntries: n };
});
console.log('SW aktiv:', JSON.stringify(swActive));

// Warten, bis index.html im Cache liegt (SWR speichert beim ersten fetch).
await page.waitForFunction(async () => {
  const keys = await caches.keys();
  for (const k of keys) {
    const c = await caches.open(k);
    const m = await c.match('./index.html', { ignoreSearch: true }) || await c.match('index.html', { ignoreSearch: true });
    if (m) return true;
  }
  return false;
}, { timeout: 10000 }).catch(() => console.log('WARN: index.html noch nicht im Cache-Match (evtl. anderer Key)'));

// OFFLINE gehen und neu laden — Spiel muss trotzdem starten.
await ctx.setOffline(true);
let offlineOk = false, gameOk = false;
try {
  const resp = await page.goto(base, { waitUntil: 'load', timeout: 15000 });
  offlineOk = !!resp;
  gameOk = await page.evaluate(() => !!(window).__game || !!document.querySelector('canvas'));
} catch (e) {
  console.log('Offline-Reload Fehler:', e.message);
}
console.log('Offline-Reload geladen:', offlineOk, '| Spiel/Canvas da:', gameOk);
console.log(offlineOk && gameOk ? 'ERGEBNIS: Offline-Start ✓' : 'ERGEBNIS: Offline-Start ✗');

await browser.close();
server.close();
console.log('DONE');
