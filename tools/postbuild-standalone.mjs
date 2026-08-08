/**
 * Post-Build für den Standalone-Build.
 *
 * ROOT CAUSE (per Isolationstest bewiesen): Die Mobile-In-App-Vorschau führt in
 * einem Dokument, das IRGENDEIN <script type="module"> enthält, GAR KEIN Script
 * aus (im Test blieben alle vier Zeilen rot — auch klassische). Klassische
 * Scripts im <body> laufen dagegen (die funktionierenden Testdateien hatten kein
 * Modul-Script). Kopf-Scripts (<head>) sind unzuverlässig.
 *
 * Fix daher:
 *   - Vite liefert das Bundle als IIFE (klassisch lauffähig, kein import.meta).
 *   - Hier wird JEDES type="module" entfernt und das Bundle als KLASSISCHES
 *     <script> ans ENDE des <body> gesetzt (dort ist #root bereits geparst →
 *     kein DOMContentLoaded nötig).
 *   - Storage-Schutzschild + winziger Build-Stempel ebenfalls als klassische
 *     Scripts im <body>. KEIN überdeckendes Overlay.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'dist-standalone/index.html';
let html = readFileSync(FILE, 'utf8');

const BUILD_TAG = 'v416 ' + new Date().toISOString().replace('T', ' ').slice(0, 16);

// ── App-Bundle aus dem (von Vite getaggten) module-Script extrahieren ────────
const re = /<script\s+type="module"\s+crossorigin\s*>([\s\S]*?)<\/script>/;
const m = html.match(re);
let appCode = '';
if (m) {
  appCode = m[1];
  html = html.replace(re, () => '');
  console.log('postbuild-standalone: App-Bundle extrahiert.');
} else {
  console.warn('postbuild-standalone: kein module-App-Script gefunden!');
}

// Sicherheitsnetz: alle evtl. übrigen module-Referenzen entfernen.
html = html.replace(/<script[^>]*type=["']module["'][^>]*><\/script>/gi, '');
html = html.replace(/<link[^>]*rel=["']modulepreload["'][^>]*>/gi, '');

// ── Klassische Body-Scripts: Schutzschild → App → Stempel ────────────────────
const shield =
  '<script>(function(){function mk(){var m={};var s={getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null;},' +
  'setItem:function(k,v){m[k]=String(v);},removeItem:function(k){delete m[k];},clear:function(){m={};},' +
  'key:function(i){return Object.keys(m)[i]||null;}};try{Object.defineProperty(s,"length",{get:function(){return Object.keys(m).length;}});}catch(_){}return s;}' +
  'function guard(name){var broken=false;try{var t=window[name];if(!t){broken=true;}else{t.getItem("__probe__");}}catch(e){broken=true;}' +
  'if(broken){try{Object.defineProperty(window,name,{value:mk(),configurable:true,writable:true});}catch(_){}}}' +
  'guard("localStorage");guard("sessionStorage");})();</script>';

// Fehler sichtbar machen (klassisch, Body) + winziger Build-Stempel.
const errAndStamp =
  '<script>(function(){var TAG=' + JSON.stringify(BUILD_TAG) + ';' +
  'function banner(msg){try{var d=document.getElementById("__lfban");if(!d){d=document.createElement("div");d.id="__lfban";' +
  'd.style.cssText="position:fixed;left:0;right:0;top:0;z-index:2147483647;background:#7f1d1d;color:#fff;' +
  'font:600 12px/1.45 -apple-system,system-ui,sans-serif;padding:9px 12px;white-space:pre-wrap;word-break:break-word;max-height:60vh;overflow:auto";' +
  '(document.body||document.documentElement).appendChild(d);}d.textContent="\\u26A0 "+String(msg).slice(0,600)+"  ["+TAG+"]";}catch(_){}}' +
  'window.__leaFionaError=banner;' +
  'window.addEventListener("error",function(e){banner((e&&e.message||"Error")+(e&&e.filename?(" @"+String(e.filename).split("/").pop()+":"+e.lineno):""));});' +
  'window.addEventListener("unhandledrejection",function(e){var r=e&&e.reason;banner("Promise: "+(r&&(r.stack||r.message)||String(r)));});' +
  'try{var t=document.createElement("div");t.textContent=TAG;t.style.cssText="position:fixed;left:4px;bottom:3px;z-index:2147483646;color:rgba(255,255,255,.5);font:10px/1 -apple-system,system-ui,sans-serif;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,.7)";(document.body||document.documentElement).appendChild(t);}catch(_){}' +
  '})();</script>';

// App als klassisches Script, sofort ausgeführt (mit Fehler-Weiterleitung).
const appTag = appCode
  ? '<script>(function(){try{\n' + appCode + '\n}catch(e){window.__leaFionaError&&window.__leaFionaError(e&&e.stack||e&&e.message||String(e));throw e;}})();</script>'
  : '';

// Reihenfolge am Body-Ende: Fehlerhandler+Stempel → Schutzschild → App.
const inject = errAndStamp + shield + appTag;
if (/<\/body>/.test(html)) {
  html = html.replace('</body>', inject + '</body>');
} else {
  html += inject;
}

writeFileSync(FILE, html);

const remaining = (html.match(/type=["']module["']/gi) || []).length;
if (remaining > 0) {
  console.error(`postbuild-standalone: FEHLER — noch ${remaining}× type="module" vorhanden!`);
  process.exit(1);
}
console.log('postbuild-standalone: klassische Body-Scripts gesetzt, 0× type="module" (' + BUILD_TAG + ').');
