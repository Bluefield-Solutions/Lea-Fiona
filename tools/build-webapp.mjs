/**
 * Baut aus dem Standalone-Build (dist-standalone/index.html) einen HOSTFERTIGEN
 * Ordner `webapp/`, der sich auf dem iPhone wie eine echte App anfühlt:
 *   - echte Icon-Dateien (180 apple-touch, 192, 512) + maskable (Sicherheitsrand)
 *   - Splash-Screens (apple-touch-startup-image) für gängige iPhones (Hoch+Quer)
 *   - poliertes Web-App-Manifest (Vollbild, Querformat, Farben)
 *   - Service Worker (Offline-fähig, App-Dokument network-first → sofort neueste
 *     Version, wenn online; Assets stale-while-revalidate)
 *   - Safe-Area/Notch-freundlich, Home-Bildschirm-Hinweis (nur iOS-Safari, dezent)
 *
 * REIN Node — KEIN Browser, KEIN Python nötig (CI-tauglich für GitHub Actions):
 * Icons kommen fertig aus brand-icons/ (tools/gen-appicon.py, lokal committet),
 * Splash-Screens aus brand-splash/ (tools/gen-splash.mjs, lokal committet).
 * Voraussetzung: vorher `npm run build:standalone` (dist-standalone/index.html).
 */
import { writeFileSync, mkdirSync, readFileSync, rmSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DEVICES, ORIENTATIONS, splashFileName, splashMedia } from './webapp-devices.mjs';

const OUT = 'webapp';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/icons`, { recursive: true });
mkdirSync(`${OUT}/splash`, { recursive: true });

const README_MD = readFileSync('tools/webapp-README.md', 'utf8');

// Icons: fertige Marken-Icons (echte Spielfiguren Lea & Fiona) aus brand-icons/.
for (const f of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
  copyFileSync(`brand-icons/${f}`, `${OUT}/icons/${f}`);
}
console.log('  ✓ Icons (Lea & Fiona · 180/192/512 + maskable)');

// Splash-Screens: fertige PNGs aus brand-splash/ kopieren + <link>s bauen.
const splashLinks = [];
for (const d of DEVICES) {
  for (const orient of ORIENTATIONS) {
    const file = splashFileName(d, orient);
    copyFileSync(`brand-splash/${file}`, `${OUT}/${file}`);
    splashLinks.push(`    <link rel="apple-touch-startup-image" media="${splashMedia(d, orient)}" href="${file}" />`);
  }
}
console.log(`  ✓ Splash-Screens (${DEVICES.length} Geräte × ${ORIENTATIONS.length} Ausrichtungen)`);

// ── Manifest ------------------------------------------------------------
const manifest = {
  name: 'Lea und Fiona im Abenteuerland',
  short_name: 'Lea & Fiona',
  description: 'Ein wunderschönes 2D Jump’n’Run für Kinder.',
  start_url: './index.html',
  scope: './',
  display: 'standalone',
  orientation: 'landscape',
  background_color: '#0b1030',
  theme_color: '#0b1030',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
writeFileSync(`${OUT}/manifest.webmanifest`, JSON.stringify(manifest, null, 2));

// ── Service Worker ------------------------------------------------------
// App-Dokument (Navigation): NETWORK-FIRST → wenn online, immer die neueste
// Version beim Öffnen (per Conditional-Request effizient: unverändert = 304,
// kein Neu-Download der 4,6 MB). Offline: aus dem Cache. Andere Assets:
// stale-while-revalidate (schnell + selbstheilend).
const BUILD_ID = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const sw = `// Lea & Fiona — Service Worker (Build ${BUILD_ID}).
const CACHE = 'lea-fiona-${BUILD_ID}';
const CORE = ['./', './index.html', './manifest.webmanifest',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isDoc) {
    // Network-first: neueste App-Version, wenn online; offline → Cache.
    e.respondWith((async () => {
      try {
        const res = await fetch(new Request(req, { cache: 'no-cache' }));
        const cache = await caches.open(CACHE);
        cache.put('./index.html', res.clone());
        return res;
      } catch (err) {
        const cache = await caches.open(CACHE);
        return (await cache.match(req, { ignoreSearch: true }))
          || (await cache.match('./index.html'))
          || Response.error();
      }
    })());
    return;
  }
  // Assets: stale-while-revalidate.
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
            cache.put(req, res.clone());
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});
`;
writeFileSync(`${OUT}/service-worker.js`, sw);

// ── index.html: PWA-Kopf ersetzen (Icons als Dateien + Splash + SW + Hinweis)
let html = readFileSync('dist-standalone/index.html', 'utf8');
const START = '<!-- PWA-INJECT-START -->';
const END = '<!-- PWA-INJECT-END -->';
html = html.replace(new RegExp(`\\s*${START}[\\s\\S]*?${END}`), '');

const headBlock = `    ${START}
    <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png" />
    <link rel="manifest" href="manifest.webmanifest" />
${splashLinks.join('\n')}
    <style>
      /* Notch/Dynamic-Island-freundlich: HUD nicht unter die Kamera schieben. */
      #root { padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); box-sizing: border-box; }
      /* Home-Bildschirm-Hinweis (nur iOS-Safari, dezent, wegklickbar). */
      #a2hs { position: fixed; left: 50%; bottom: max(12px, env(safe-area-inset-bottom)); transform: translateX(-50%);
        z-index: 99999; display: none; align-items: center; gap: 10px; max-width: 92vw;
        padding: 10px 14px; border-radius: 14px; background: rgba(18,16,32,0.92); color: #fff;
        font: 500 14px/1.35 -apple-system, Segoe UI, Roboto, sans-serif; box-shadow: 0 6px 24px rgba(0,0,0,0.4); }
      #a2hs b { color: #ffd23f; }
      #a2hs .x { margin-left: 4px; font-size: 18px; opacity: 0.8; cursor: pointer; padding: 0 4px; }
    </style>
    <script>
      // Service Worker registrieren (nur in sicherem Kontext: https bzw. localhost;
      // als einzelne file://-Datei bewusst NICHT). Mit Auto-Update: sobald ein
      // neuer Service Worker die Kontrolle übernimmt (neuer Deploy), lädt die
      // Seite EINMAL automatisch neu — so hängt niemand auf einer alten Version
      // fest. Der Guard (hadController + refreshing) verhindert Reload-Schleifen
      // und einen unnötigen Reload bei der allerersten Installation.
      if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        var __lfHadController = !!navigator.serviceWorker.controller;
        var __lfRefreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (__lfRefreshing) return;
          __lfRefreshing = true;
          if (__lfHadController) window.location.reload();
        });
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('service-worker.js').then(function (reg) {
            try { reg.update(); } catch (e) {}
            // Neue Version im Hintergrund gefunden → installieren lassen; der SW
            // ruft skipWaiting()/clients.claim() → controllerchange → Reload.
            reg.addEventListener('updatefound', function () {
              var nw = reg.installing;
              if (nw) nw.addEventListener('statechange', function () {});
            });
            // Regelmäßig auf Updates prüfen, falls die App lange offen bleibt.
            setInterval(function () { try { reg.update(); } catch (e) {} }, 60 * 60 * 1000);
          }).catch(function () {});
        });
      }
      // Home-Bildschirm-Hinweis: nur auf iPhone-Safari und wenn NICHT schon als
      // App gestartet; einmal pro Sitzung, wegklickbar, blendet nach 12s aus.
      window.addEventListener('load', function () {
        try {
          var ua = navigator.userAgent || '';
          var isiOS = /iPhone|iPod/.test(ua) && !window.MSStream;
          var standalone = ('standalone' in navigator) && navigator.standalone;
          if (!isiOS || standalone || sessionStorage.getItem('a2hsSeen')) return;
          var bar = document.createElement('div');
          bar.id = 'a2hs';
          bar.innerHTML = 'Tipp: <span>Teilen ↑</span> → <b>Zum Home-Bildschirm</b> für Vollbild <span class="x">×</span>';
          document.body.appendChild(bar);
          bar.style.display = 'flex';
          bar.querySelector('.x').addEventListener('click', function () { bar.remove(); });
          setTimeout(function () { if (bar) bar.style.display = 'none'; }, 12000);
          sessionStorage.setItem('a2hsSeen', '1');
        } catch (e) {}
      });
    </script>
    ${END}`;
html = html.replace('</head>', `${headBlock}\n  </head>`);
writeFileSync(`${OUT}/index.html`, html);
console.log('  ✓ index.html (Icons/Splash/Manifest/SW/Hinweis injiziert)');

// ── README (Hosting-Anleitung) -----------------------------------------
writeFileSync(`${OUT}/README.md`, README_MD);

// ── version.json (Live-Stand byte-genau prüfbar via /version.json) ------
// WICHTIG: bewusst HIER erzeugt (normales Build-Skript), NICHT im deploy.yml.
// Grund: der GitHub-Standard-Token darf `.github/workflows/*` nicht zurück auf
// main pushen (fehlende workflows-Berechtigung) → eine im YAML ergänzte version.json
// erreicht main nie. build-webapp.mjs deployt dagegen ganz normal übers Bundle und
// wird vom (auch alten) Workflow aufgerufen → version.json entsteht ab dem nächsten
// Deploy zuverlässig. Hashes = git-Blob-SHA1 je Datei unter client/src/game,
// selbst berechnet (blob-Header + Inhalt), unabhängig vom git-Zustand im Runner.
const gitBlob = (buf) => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const GAME_DIR = 'client/src/game';
const vfiles = {};
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = `${d}/${e}`;
    if (statSync(p).isDirectory()) walk(p);
    else vfiles[p.slice(GAME_DIR.length + 1)] = gitBlob(readFileSync(p));
  }
})(GAME_DIR);
const sortedFiles = Object.fromEntries(Object.keys(vfiles).sort().map(k => [k, vfiles[k]]));
writeFileSync(`${OUT}/version.json`, JSON.stringify({ buildId: BUILD_ID, fileCount: Object.keys(sortedFiles).length, files: sortedFiles }));
console.log(`  ✓ version.json (${Object.keys(sortedFiles).length} Dateien, Blob-Hashes)`);

console.log('FERTIG · webapp/ · Build-ID', BUILD_ID);
