# Memo: Welt 13 „Die blaue Wiese" (Bluefield-Firmenlevel)

## Auftrag & Zielgruppe
Marketing-/Firmen-Level für **Bluefield IT Solutions GmbH** (bluefield-solutions.de, Marke #1E48D6, Unterhaching b. München). **Zielgruppe: B2B-Entscheider/Partner/Webseiten-Besucher** → muss schnell Spaß machen, was hermachen, fair für Gelegenheitsspieler sein und die Marke erklären. Gründer: **Stephan Domke** (= der User).

## Marken-Fundament (von der Website)
- Leitmetapher **„blaue Wiese"** — aus Ideen werden Produkte. Labor-Ästhetik: Schleuse, Terminal-Boot, „Proben unter Glas", Server in DE, DSGVO, schlanker Tech-Stack, eigenfinanziert, pay-on-success.
- **Vier-Stationen-Verfahren** = der Level-Bogen: 01 Hypothese → 02 Prototyp → 03 Markttest („was durchfällt, fällt durch") → 04 Live & Skalierung.
- **3 Produkte** (= 3 Spezial-Ideen/Münzen): **U1-Optimierer** (live, ~3.540 €/Jahr, pay-on-success), **MatchSuite** (im Aufbau), **GKV-Vergleich** (in Planung).
- Dramaturgie: Ruhe → Aufbau → Gefahr (Markttest = wörtliche Abgründe) → Triumph (GO LIVE). 💡 Ideen sammeln, 💣 schlechte Ideen meiden.

## STAND: Welt 13 weitgehend fertig (v324)
Spielbar, durchgehend Bluefield-thematisch, tsc/build/pipeline/guard grün.

### Umgesetzt
**Wiese/Optik**
- Durchgehende **blaue Wiese OHNE sichtbare Erde** (Halme aus EINER Quelle: Bodenband `renderTerrainHills` in `engine_internal/render.ts`, Ebene==Hügel identisch), Erd-Palette angeglichen, warmer Hügel-Volumen-Verlauf + AO/Licht auf Blau, Shimmer behoben (festes Welt-Raster).
- Himmel: Wolken (`drawPuffyCloud`), fernste Parallax-Hügelkette, dezente God-Rays + Horizont-Bloom.
- Hügel: 8–22, 40–58, 108–134 (peak 3.6). Lücken (Markttest): 76–78, 87–89, 99–101. Checkpoint 73, Flagge 137, MovingPlatform über mittlerer Lücke, Geheimraum „Serverhalle DE" (`buildUndergroundRoom`, height 16→24).

**Bluefield-Marke**
- „Proben unter Glas" (`drawProbe`, backgrounds.ts): U1/MatchSuite/GKV als Kulturen unter Glasglocken je Reifegrad (cols 24/52/88), Mono-Labels.
- Terminal-Schilder im `//`-Stil (`drawTerminalSign`, signs.ts).
- Terminal-Boot-Intro beim Levelstart (`drawBluefieldBoot`, hud.ts; `bluefieldBootStart` in engine.ts).
- Erklär-Panels (signs in bluefield.ts): Intro (col 4), U1 (26), Prototyp (34), MatchSuite (62), Markttest (69), **Werte** (82: server_de·dsgvo·pay-on-success / eigenfinanziert·keine us-systeme), GKV (92), Live (104).
- Ambiente-Mono-Marker im Himmel (backgrounds.ts): probe 00·blaue wiese / standort unterhaching / server_de·dsgvo / 100% de / schleuse — dezent, Parallax 0.5.

**Gegner (Theming)** — Welt-13-Zweige in `renderer/enemies-core.ts` / `enemies-extra.ts`:
- GOOMBA → **„Bug"** (rot-oranger Käfer, Antennen/Beinchen). Cols 18/27/60/87/93/116.
- KOOPA → **„Legacy-System"** (Server-Box + LEDs + Vents). Col 44.
- BOMB_OMB → „schlechte Idee" (durchgestrichene Glühbirne). Col 82.

**Power-Ups (Theming)**
- Namen beim Einsammeln (`player_collisions.ts`, bluefield): fire→PROTOTYP! · cape→SKALIERUNG! · shield→DSGVO-SCHILD! · super→GO-LIVE!
- Schild-Item optisch = **DSGVO-Schild** (Schildform + Vorhängeschloss, Markenblau) — `items.ts drawShield` bluefield-Zweig.
- Q-Blöcke: heart@6, fire@14 (ground-6), cape@50 (ground-6), shield@74, shield@106, super@124 (ground-8). **Über Hügeln angehoben, damit der Laufkopf frei ist.**

**Moves**
- **Ship-it-Dash** (neue Fähigkeit, ALLE Welten, Label nur Welt 13): Taste E / Touch-Button „»" → Horizontal-Boost (velX ±13, 9 Frames, Cooldown 45), Staub/Whoosh/Shake + Afterimage-Silhouetten. Input `dashPressed`, Player `dashTimer/dashCooldown/dashDir/dashTriggered/dashTrail`.

**Spielfigur**
- In Welt 13 ist **immer die Berater-Figur** die Spielfigur (unabhängig von Fiona/Lea-Wahl). 12-Frame-Set (Base64, `game/assets/beraterSprites.ts`), uniform 73×133, feet-aligned, rechts-gerichtet. Auswahl in `drawPlayerSprite` via `currentTheme==='bluefield'`.

**B2B-Conversion**
- Premium-Siegscreen mit klickbarem CTA → bluefield-solutions.de/labor. Autarker Funnel (`bluefield_start`/`golive`/`cta_click` via dataLayer/Callback/CustomEvent).

## Offen / optionale Vertiefung
- Weitere Power-Up-Items optisch reskinnen (Prototyp/Skalierung/GO-LIVE-Optik).
- Markttest optisch weiter zuspitzen; Instrumente/Server-Rack-Deko.
- Berater-Feinschliff: Größe/vertikaler Offset/Lauf-Frame-Auswahl nach Browser-Urteil.
- „passende Moves" ist mit dem Dash begonnen — weitere Fähigkeiten optional.

## Wichtige Lektionen (Welt 13)
- **Hügel-Awareness:** Blöcke auf fester Höhe können über Hügeln auf Kopfhöhe geraten → per `smoothGroundY` prüfen und anheben. Permanenter Guard dafür verworfen (groundRowOf-Falle → viele Fehlalarme); stattdessen Ad-hoc-Audit.
- **Blade-Rendering:** eine einzige Quelle (Bodenband, flat==hill) verhindert Artefakte/Shimmer.
- Sichere flache Schild-Spalten (keine Lücke/kein Hügel): 26, 62, 82, 92 (+ Stationen 4/34/69/104).

## UPDATE (v335–v347): Welt 13 = Bluefield-Produktreise

Welt 13 wurde von einem durchgehenden Level zu einer geführten **4-Sektionen-Reise** umgebaut (~284 Spalten, Vorbild: Schul-Level mit Cross-Fade). Grenzen: `BLUEFIELD_SECTION_BOUNDS = [71, 142, 213]` (in `levels/bluefield.ts`).

### Die vier Sektionen (Looks in `renderer/backgrounds.ts`, alle geclippt & additiv)
- **① Willkommen (0–70)** — helle blaue Wiese. `drawBluefieldWelcomeScene`: Marken-**Portal** am Start (col 6), **Ideen-Baum** (col 46, Glühbirnen reifen im Wechsel zu €/↔/? = U1/MatchSuite/GKV), screen-fixierter Onboarding-Text „WILLKOMMEN BEI BLUEFIELD …".
- **② U1-Optimierer (71–141)** — `drawBluefieldU1Scene`: **weiße** vollflächige Kulisse, Claim „Unser Produkt, der U1-Optimierer" weit hinten, Dashboards (Ø 3.540 €, Erstattung, Umlage) mit Slidern/Balken, Krankenkassen-Kacheln, Excel-Blätter, Donut, dichter Euro-Strom, Server-Terminals.
- **③ MatchSuite (142–212)** — `drawBluefieldMatchSuiteScene`: Blueprint-Look (Navy + Raster), Berater↔Projekt-Karten mit pulsierenden Match-Linien + „MATCH 94%", „IM AUFBAU"-Badge, Gerüststreben.
- **④ GKV-Vergleich (213–283)** — `drawBluefieldGKVScene`: neblige Grau-Blau-Stimmung, driftende Nebelschwaden, schemenhafte Vergleichstabelle, „IN PLANUNG"-Badge, Claim „GKV-Vergleich · in Planung".

### Übergänge & Endkampf
- **Schleusentüren** (`drawBluefieldDoors`) an cols 71/142/213 mit Ziel-Label; **Vordergrund-Schleier** (`drawBluefieldDoorFronts`, in `drawBluefieldAmbient`) — Figur verschwindet beim Durchlaufen kurz dahinter.
- **Sektions-Farbstimmung** (`drawBluefieldSectionTint`) mit Cross-Fade + Mono-Label (nur in der Willkommens-Sektion sichtbar, da die anderen vollflächig überdecken).
- **Endkampf** im Finale (④): Stampf-Boss (col 277), **Arena-Kulisse** (`drawBluefieldBossArena`: Legacy-System-Server-Racks, Warn-Spotlights, Kampfzone). **Flagge (col 279) erst nach Boss-Sieg frei** (Sperre in `engine_internal/collisions.ts runFlagCollision`, Hinweis-Floating-Text). **Sieg-Sequenz** im Boss-Kill (`player_collisions.ts`): Hit-Stop, Shake, Explosion, „SYSTEM DOWN!" / „→ GO LIVE frei!".

### Geometrie (bluefield.ts, ground=13, width=284)
- Boden: fillGround(0,219) · Inseln 223–230, 234–241 · fillGround(245,283). Markttest-Lücken: **220–222, 231–233, 242–244**.
- Hügel: 8–22, 40–58, 85–100, 116–130, 155–170, 186–200, 250–276 (peak 3.6, Finale-Anstieg).
- Checkpoint 217 (vor Markttest). Flagge 279. Boss 277. Geheimraum entryCol 258.
- Proben/specialCoins: U1@100, MatchSuite@175, GKV@231. Q-Blöcke: heart@6, fire@14, cape@50, shield@95/150/218, magnet@110, super@263.

### WICHTIG: Deko↔Geometrie-Kopplung
Deko-Positionen in `backgrounds.ts` sind an die Geometrie gebunden: `drawProbe` (100/175/231), Markttest-`gaps` ([220,223]/[231,234]/[242,245]), Türen (71/142/213), Boss-Arena (277). Bei Geometrie-Änderungen in `bluefield.ts` diese Werte mitziehen.

## UPDATE (v348–v351): Feinschliff & echte Boss-Barriere

- **MatchSuite** (`drawBluefieldMatchSuiteScene`) erweitert: Briefing-Panel, schwebende Skill-Wolke (React/AWS/SAP/…), Kandidaten-Datenbank-Terminals am Boden.
- **GKV** (`drawBluefieldGKVScene`) erweitert: schemenhafte Kassen-Vergleichskarten (mit Sternen), schwebende Fragezeichen, gestricheltes „in Bau"-Vergleichsportal.
- **Boss-Barriere** (`bossGate` im LevelData, `checkBossGate()` in engine.ts): solide Barriere-Säule bei **col 280** (rows ground-5..ground-1), Flagge auf **col 282** verschoben. Renderer-Flags `bossGateActive/bossGateCol/bossGateTop` steuern die Vordergrund-**Energiewand** (in `drawBluefieldAmbient`). Bei Boss-Sieg: Tiles → EMPTY, Shake/Partikel/„ZUGANG FREI!". `bossGateOpened` wird in `startLevel` zurückgesetzt (Level wird via `create()` frisch gebaut → robust bei Respawn).
- **Boden pro Sektion** (`tintBluefieldGround` in render.ts, nach `renderTerrainHills`): deckt das blaue Gras-Bodenband pro Sektion mit passendem Belag (U1 `#e9f1fb`, MatchSuite `#15306e`, GKV `#99a6b9`; Willkommen bleibt Wiese). Folgt `smoothGroundY`, überspringt Lücken.

## UPDATE (v352–v357): Boss-Fight & weicher Gesamt-Look
- **Boss** (entities/enemies.ts): Phasen (Tempo×(1+phase*0.45)), Sprung-Attacke (jumpTimer), **Projektile** (throwThisFrame → MagicBolt Richtung Spieler, in Welt 13 als roter „Fehler"-Glitch gerendert via drawMagicBolt-bluefield-Zweig). Boss-Bewegung/Wurf in `entity_step.ts` (eigener Boss-Zweig, linke Arena-Grenze col 273). Rote Phasen-Aura in drawBoss.
- **Parallax-Tiefe** (`drawBluefieldFarLayer` in backgrounds.ts): ferne Silhouetten-Ebene je vollflächiger Welt (U1 `#d3ddef`+Fenster, MatchSuite `#0e2560`+Cyan-Fenster, GKV `rgba(150,163,186,0.5)` transluzent), scrollt mit ~0.4× → räumliche Tiefe. Aufruf jeweils direkt nach der Wand, vor den Elementen.
- **Globaler Look** (engine.ts `render()`, nach `runRender`): weiche **Vignette** (radial, rgba(12,18,36) bis 0.15) + weicher **Glow/Bloom** (ctx.filter='blur(4px)' + globalCompositeOperation='lighter', alpha 0.26, self-draw). Gilt für ALLE Welten, nicht im Titelbild.
- **Performance-Erkenntnis:** Desktop läuft mit 56–60 FPS (FPS-Overlay oben rechts, immer sichtbar via getDebugInfo). Kein Backing-Cap nötig; „langsamer als Handy" war der geringere Kamera-Zoom (mehr Sichtfeld), kein Leistungsproblem.
