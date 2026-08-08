/**
 * Injiziert die iPhone-/PWA-Kopf-Tags in client/index.html (idempotent):
 * Inline-Apple-Touch-Icon (data-URI, damit auch die Standalone-Einzeldatei ein
 * Home-Screen-Icon hat), Favicon und Manifest-Verweis. Icon-base64 kommt aus
 * iphone-app/apple-touch-icon-180.b64 (via tools/gen-icon.mjs).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'client/index.html';
const b64 = readFileSync('iphone-app/apple-touch-icon-180.b64', 'utf8').trim();
let html = readFileSync(FILE, 'utf8');

const START = '<!-- PWA-INJECT-START -->';
const END = '<!-- PWA-INJECT-END -->';
// evtl. vorhandenen Block entfernen (idempotent)
html = html.replace(new RegExp(`\\s*${START}[\\s\\S]*?${END}`), '');

const block = `    ${START}
    <link rel="apple-touch-icon" href="data:image/png;base64,${b64}" />
    <link rel="icon" type="image/png" href="data:image/png;base64,${b64}" />
    <link rel="manifest" href="manifest.webmanifest" />
    ${END}`;

html = html.replace('</head>', `${block}\n  </head>`);
writeFileSync(FILE, html);
console.log('PWA-Tags in', FILE, 'injiziert (', (b64.length/1024).toFixed(1), 'KB Icon inline ).');
