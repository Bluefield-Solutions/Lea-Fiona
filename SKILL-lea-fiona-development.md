---
name: lea-fiona-development
description: Entwicklungs-Workflow für das Browser-Jump'n'Run "Lea und Fiona im Abenteuerland" (React/TS/Vite, eigene Canvas-Engine). Diesen Skill bei JEDER Arbeit am Spiel-Code aktivieren — neue Welten/Level, Physik, Renderer, Gegner, Power-Ups, Optik, Startbildschirm. Kapselt Architektur, Liefer-Pipeline, Test-Methodik, Konventionen.
---

# Lea und Fiona — Entwicklungs-Skill

## Projekt
Privates Browser-Jump'n'Run. Stack: **React 18 + TypeScript + Vite 7 + eigene HTML5-Canvas-Engine (KEIN Phaser)**. Zielplattform: **iPhone (Querformat)** + Browser. 13 Welten (12 regulär + **Welt 13 „Die blaue Wiese" = Bluefield-Firmenlevel**). Arbeitsverzeichnis `/home/claude/lea-fiona`, Outputs `/mnt/user-data/outputs`. Stand: **v324**.

## Kommunikations-Konventionen (zwingend)
- **Sprache: Deutsch**, knapp/direkt. User schreibt oft per Voice-to-Text (Tippfehler tolerieren).
- **Feste Antwortstruktur:** 1. Management Summary · 2. Detaildarstellung · 3. Fazit/Empfehlung · 4. Konkrete nächste Schritte.
- **„Konkrete nächste Schritte" IMMER als tappbare Optionen** via `ask_user_input_v0` (2–4, nur größter Nutzerwert).
- **Antworten so paketieren, dass jedes Paket in einem Antwort-Tokenbudget vollständig lieferbar ist.**
- **Optik/Feel einzeln liefern**, User beurteilt im Browser (👍/👎). Bei 👎 sofort vollständiger Rollback (`git checkout -- .`), keine Kompromisse.

## Liefer-Pipeline (zwingend, pro Iteration)
```bash
cd /home/claude/lea-fiona
# 1. Typecheck (Soll 0)
npx tsc 2>&1 | grep -vE "baseUrl|ignoreDeprecations|Visit https|migration information|Cannot find type definition" | grep -ciE "error"
# 2. Build
npm run build:standalone 2>&1 | tail -1
# 3. Autarkie-Check (MUSS 0 — keine externen Referenzen)
grep -cE 'src="https?://|href="https?://|@import|fetch\("http' dist-standalone/index.html
# 4. Pipeline-Check (Soll PASS)
node tools/pipeline-check.mjs 2>&1 | grep ERGEBNIS
# 5. Level-Guards (Soll: 0 WARN, 4 INFO)
npx tsx tools/level-guards.mts 2>&1 | grep SUMME
# 6. Ausliefern (GLEICHER Name → localStorage-Spielstände bleiben)
cp dist-standalone/index.html /mnt/user-data/outputs/Lea-und-Fiona.html
rm -f /mnt/user-data/outputs/lea-und-fiona-v*-src.zip
zip -qr /mnt/user-data/outputs/lea-und-fiona-vNNN-src.zip . -x "node_modules/*" "dist/*" "dist-standalone/*" ".git/*"
```
Danach `present_files` (HTML + ZIP). **Achtung:** `grep -c` gibt Exit 1 bei 0 Treffern → Befehle mit `;` statt `&&` trennen.

## Git-Sicherheitsnetz
Baseline-Tag v259; **jede akzeptierte Iteration = Commit + Tag `vN`**. 👎 = `git checkout -- .` (restloser Rollback).

## Architektur (Kern-Dateien)
- **Konstanten:** `game/constants.ts` — Physik, `TileType`, `EntityType` (String-Enum, klein), `ThemeName`-Union + `THEME_NAMES`, `Direction` (RIGHT/LEFT; Default-Sprite-Orientierung = RIGHT).
- **Physik:** `game/physics.ts` — `class Physics(tiles, W, H)` (erwartet TILE-Anzahl). moveEntity: moveStep → resolveSlopeCollision → resolveSmoothHills → CORNER_FALL_KICK → edge-detection.
- **Level:** `game/level.ts` — `LEVELS`-Array (id 1–13), `groundRowOf()`, `isSolidForCollision()`, `isOneWayPlatform()`. Einzel-Level in `game/levels/<name>.ts`.
- **Level-Helper:** `game/levelHelpers.ts` — `bindHelpers(...)`, `bindCoinHelpers(...)`, `buildUndergroundRoom(...)`.
- **Terrain:** `game/terrain.ts` — `smoothGroundY(hills, worldX)→y` (Pixel, kleiner=höher), `HillSpec{startCol,endCol,peakTiles,baseRow,skew?}`.
- **Renderer:** `game/renderer.ts` + `game/renderer/*` (tiles*.ts, backgrounds.ts, player.ts, hud.ts, effects.ts, items.ts, signs.ts, enemies-core.ts, enemies-extra.ts) + `game/engine_internal/render.ts` (Theme-Paletten/Ambient/Bodenband).
- **Engine:** `game/engine.ts` — Hauptloop. `renderer.time` = Frame-Zähler. `spawnDust(x,y,dir)`, `shakeCamera(mag,dur)`, `acquireFloatingText(x,y,text)`, `trackFunnel(...)`, `finalizeLevelComplete()`.
- **Gegner:** `game/entities/enemies.ts` (Klassen). Stomp in `engine_internal/player_collisions.ts` (`runEntityCollisions` + Power-Up-Aufnahme).
- **Spieler:** `game/entities/player.ts` — `handleInput(input)` (Bewegung, ~Z.282–725), `applyFire/Cape/Shield/Super/...`, Dash-Zustand.
- **Input:** `game/input.ts` — `InputManager` mit Gettern (left/right/jump/down/run/firePressed/superPressed/**dashPressed**) + Touch-Flags.
- **Audio:** `game/audio.ts` — `THEMES: Record<ThemeName, ThemeSong>` (jedes Theme braucht Eintrag, sonst tsc-Fehler). `playSfx(name, pan?, pitchMul?)`.
- **Assets:** `game/assets/beraterSprites.ts` — Base64-Sprites der Welt-13-Figur (autark).
- **UI (React):** `pages/game.tsx` — Startbildschirm (Zwei-Schritt-Flow), Touch-Controls, Modals, CSS-`<style>`-Block.

## Player-Sprite-Pipeline (WICHTIG)
Der In-Game-Spieler wird aus **12 Artwork-Frames** gerendert (nicht rein prozedural): `renderer.ts` hält `fionaFrames`/`leaFrames`/`beraterFrames` (+ `*DuckArr`), geladen via `loadFrame(url, arr, idx)` (DATA-URLs funktionieren als `img.src`). Auswahl in `renderer/player.ts` `drawPlayerSprite`: `useBerater = currentTheme==='bluefield'` → Berater; sonst `useLeaSprite`. `pickPlayerFrame(...)` + `walkBlend(...)` liefern Frame-Auswahl + weiche Überblendung. **Pro-Bild-Aspect** wird respektiert (Z.509 `aspectRatio = img.width/img.height`), feet-anchored (dx=-drawW/2, dy=-drawH). Direction-Flip in `drawPlayer` (`if (direction < 0) ctx.scale(-1,1)`). 12-Frame-Schema: 0 stand · 2 runA · 4 runB · 6 absprung · 8 luft · 10 landung (+ Zwischen-Blends).

## Test-Methodik
Claude kann NICHT live rendern → Optik nur via Code-Review + tsc + build; **User beurteilt im Browser**. Logik via Headless-`.mts` im Root (Imports `./client/src/game/...`), danach `rm -f *.mts`. **Lektion (wiederholt): tsx-Tests sind oft FALSCH-POSITIV** — bei roten Tests IMMER Einzelfall-Debug, bevor ein echter Bug gemeldet wird. Häufige Artefakte: Spawn-`y` ragt in Boden (korrekt `y=groundRow*TILE-height`), falsche Test-Ebene, unvollständiger Mock. Kern-Mechanik gilt als durchgehend solide (umfassende QS bestanden).

## Geteilte Renderer NUR additiv erweitern
`render.ts`, `constants.ts`, `audio.ts`, `tiles-jungle.ts`, `backgrounds.ts`, `signs.ts`, `items.ts`, `enemies-*.ts` **ausschließlich über theme-spezifische Zweige** (`currentTheme==='bluefield'`) erweitern — bestehende Zweige nie umschreiben, andere Welten nie berühren.

## Neue Welt/Theme (Checkliste)
1. `constants.ts` ThemeName + THEME_NAMES. 2. `audio.ts` THEMES-Eintrag. 3. `engine_internal/render.ts` Grass-Checks + Paletten. 4. `tiles-jungle.ts drawGroundTile` (falls Gras). 5. `backgrounds.ts` Himmel-Block. 6. `levels/<name>.ts` `create<Name>Level()`. 7. `level.ts` Import+Re-Export+LEVELS-Eintrag. 8. tsc → Guards → build → liefern.

## Physik-Konstanten (Auszug)
`PLAYER_RUN_SPEED=7.5`, `PLAYER_SPEED=3.5`, `PLAYER_JUMP_FORCE=-10.5`, `GRAVITY=0.48`, `GRAVITY_FALLING=0.72`, `MAX_FALL_SPEED=12`, `TILE_SIZE=32`. Hitbox: normalHeight=68, Power=80, Breite 44/52. Sprung ≈ 3,4 Tiles. **Faire Lücken ≤ 3 Tiles**. Ship-it-Dash: velX=±13, 9 Frames, Cooldown 45.

## Vor Release
DEV-Freischaltung `settings.unlockAllWorlds` zurücksetzen (dann greift die release-sichere `unlocked`-Initialisierung im Startbildschirm von selbst).
