import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";

// Build-Kennung (Bauzeit, UTC) — pro Deploy eindeutig. Wird als sichtbarer
// Versions-Stempel im Titelbildschirm angezeigt („ist die neue Version live?").
const BUILD_ID = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

// Standalone build: produces ONE self-contained index.html with all JS,
// CSS and image assets inlined (base64). No server, no external requests
// — double-click to play offline in any modern browser.
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-standalone"),
    emptyOutDir: true,
    // Force every asset inline regardless of size (the 3 PNGs are ~0.5 MB each).
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100_000,
    // EXAKT wie v381 (das in der App-Vorschau lief): Vite-Default-Ausgabe
    // (ES-Modul), keine Sonder-Optionen. v381 nutzte type="module" und lief —
    // Modul-Scripts sind also nicht das Problem. Einzige echte Bug-Fixes ggü.
    // v381: storage.ts (sandbox-sicherer localStorage) + kleinere WebP-Bilder.
    target: ["safari13", "chrome80", "firefox78"],
  },
});
