# Lea und Fiona im Abenteuerland — Projektordner

Browser-Jump'n'Run (React + TypeScript + Vite, eigene HTML5-Canvas-Engine, kein Phaser). 13 Welten; Welt 13 „Die blaue Wiese" = Bluefield-Firmenlevel. Stand: **v324**.

## Dokumente (in dieser Reihenfolge lesen)
1. **HANDOVER.md** — Einstieg für einen neuen Chat: Kontext, Zusammenarbeit, Pipeline, aktueller Stand, nächste Schritte.
2. **SKILL-lea-fiona-development.md** — Entwicklungs-Workflow (Architektur, Pipeline, Konventionen, Sprite-Pipeline).
3. **ARCHITEKTUR-WISSEN.md** — Code-Landkarte, Render-Fluss, teuer gelernte Lektionen.
4. **MEMO-bluefield-level.md** — Welt 13 im Detail (Marke, Geometrie, alle Bluefield-Elemente).
5. **ANFORDERUNGSKATALOG.md** — Feature-Status (✅/🔶/⬜) + Release-Checkliste.
6. **PROZESS-lea-fiona.md** — fester Iterations-Ablauf.
7. **CHANGELOG.md** — Versions-Historie v259–v324.

## Bauen & Ausliefern
```bash
npm install
npm run build:standalone           # → dist-standalone/index.html (autark)
node tools/pipeline-check.mjs      # Qualitäts-Gate
npx tsx tools/level-guards.mts     # Struktur-Guards
```
Auslieferung: `dist-standalone/index.html` → `Lea-und-Fiona.html` (gleicher Name erhält localStorage-Spielstände).

## Schnell-Fakten
- Marke Bluefield: #1E48D6 · bluefield-solutions.de · Unterhaching.
- Vier Stationen: Hypothese → Prototyp → Markttest → Live. Produkte: U1-Optimierer (live), MatchSuite (Aufbau), GKV-Vergleich (Plan).
- Steuerung: Pfeile/WASD, Sprung Leertaste/W, Rennen Shift, Feuer F, Super Q, **Dash E** (Touch: »).
- Vor Release: `settings.unlockAllWorlds` zurücksetzen.
