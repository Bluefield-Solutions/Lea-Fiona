# Changelog — Lea und Fiona im Abenteuerland

Jede Zeile = ein akzeptierter, im Browser beurteilter Stand (Git-Tag `vN`).
Baseline dieser Arbeitsphase: **v259**. Aktueller Stand: **v389**.

## Fundament & Balancing (v260–v276)
- **v260** Hügel-Auflage am Mittelpunkt (kein Schweben) + Kollisionsbreite = 1 Tile (sauberer Block-Abgang).
- **v263** Gegner aus Checkpoint-/Zielzonen; Fundament: Level-Guards + Pipeline-Check.
- **v264** Gegner-Cluster entzerrt (Welt 9/10, Mindestabstand ≥ 4).
- **v265** Welt-13 Moving Platform breiter (3) + langsamer (0.5).
- **v266** Welt-12 Trampolin aus Checkpoint-Box; Guard kennt Smooth-Hills.
- **v267/268** Puffer-Schilder vor harten Lücken (W3/W6/W13).
- **v270** Welt-13 Kopf-Hänger v1 behoben (Stations-Plattformen → Einweg); Bluefield-Münzen als Glühbirnen.
- **v271–v276** Welt-13 Paket E: GO-LIVE-Zielschild, Werte-Billboards, Produkt-Chips, Stations-Kulissen, Geheimraum „Serverhalle DE", Labor-Deko.

## Game-Feel & B2B (v277–v281)
- **v277** kräftigere Landung (Squash/Stretch).
- **v278** Collect mit steigender Combo-Tonhöhe.
- **v279/280** Welt-13-Siegscreen mit Premium-CTA, klickbar → bluefield-solutions.de/labor.
- **v281** autarker Funnel-Hook (`bluefield_start`/`golive`/`cta_click` via dataLayer/Callback/CustomEvent).

## Welt-13-Wiese & Himmel (v282–v297)
- **v282/283** Wiese: wehende Grasbüschel, dichtere Deko, blaue Kiesel, Wiesen-Blumen; Ambient (Schmetterlinge/Pollen).
- **v294** **Wiese komplett überarbeitet** — durchgehende blaue Wiese OHNE sichtbare Erde: Halme aus EINER Quelle (Bodenband, Ebene==Hügel), Erd-Palette angeglichen, warmer Hügel-Volumen-Verlauf + AO/Licht auf Blau, Shimmer behoben (Welt-Raster), Hügel-Strich behoben.
- **v295** Wolken + fernste Parallax-Hügelkette.
- **v297** dezente God-Rays + Horizont-Bloom (abgeschwächt).

## Bluefield-Marke (v298–v301)
- **v298** „Proben unter Glas" (U1/MatchSuite/GKV als Kulturen unter Glasglocken je Reifegrad).
- **v299** Terminal-Schilder im `//`-Stil.
- **v300** Kopf-Hänger über Hügeln behoben (fire@14/cape@50/super@124 angehoben).
- **v301** Terminal-Boot-Intro beim Levelstart.

## Startbildschirm-Umbau (v302–v312)
- **v302** Level sofort klickbar (kein Lock-Flash, `unlockAllWorlds`-Lazy-Init).
- **v303** zentrale Figuren-Auswahl (Hero, animierte Sprites).
- **v304** coole Figuren-Moves (laufen+hüpfen / Idle-Wippen).
- **v305** Tagline-Badge + Hintergrund-Tiefe (Spotlight + Vignette).
- **v306** Level-Karten (Hover-Lift, Press-Feedback, Fokus-Ring).
- **v307** Top-Bar aufgewertet (Hover/Fokus, Avatar-Initiale).
- **v308** untere Lauf-Figuren hüpfen (versetzter Rhythmus).
- **v312** **Zwei-Schritt-Flow** (Figur → Level), Schritt-1-Design (Bühne/Podest/Namensschild), größere Figuren, kompaktes iPhone-quer-Layout (kein großer fixer Titel).

## Retention: Abschluss-Screen (v313–v314)
- **v313** 3 Wertungs-Sterne mit Labels (Ideen / Ohne Treffer / Tempo), pro Kriterium, alle Welten.
- **v314** Bestwert-Anzeige + pulsierendes „Neuer Rekord!"-Badge (vs. vorheriger Bestwert), alle Welten.

## Welt-13-Optimierung: Erklärungen · Gegner · Power-Ups · Moves · Figur (v315–v324)
- **v315** Erklär-Panels (Intro/Werte + Produkt-Panels U1/MatchSuite/GKV).
- **v316** Werte-Panel (server_de/dsgvo/pay-on-success/eigenfinanziert/keine us-systeme) an col 82.
- **v317** Ambiente-Mono-Marker im Himmel (probe 00, standort, server_de/dsgvo, 100% de, schleuse).
- **v318** Goomba → bluefield-„Bug" (rot-oranger Käfer).
- **v319** Koopa → „Legacy-System" (Server-Box + LEDs); Bombe mit „schlechte Idee"-Glühbirne.
- **v320** Power-Up-Namen (PROTOTYP / SKALIERUNG / DSGVO-SCHILD / GO-LIVE).
- **v321** Schild-Item optisch als DSGVO-Schild (Schildform + Vorhängeschloss).
- **v322** **Ship-it-Dash** (neue Fähigkeit: E / Touch-» → Horizontal-Boost mit Cooldown, Staub/Whoosh/Shake, SHIP-IT-Label).
- **v323** Ship-it-Dash Afterimage (faint blaue Nachzieh-Silhouetten).
- **v324** **Berater-Figur** als Spielfigur in Welt 13 (12-Frame-Set aus Uploads, uniform/feet-aligned/rechts-gerichtet, immer statt Lea/Fiona).

## Game-Feel · Bestzeit · Boss (v325–v334)
- **v325** Berater-Figur Welt 13 20 % größer (gekapselt, Fiona/Lea unberührt).
- **v326** Ship-it-Dash durchbricht Gegner (alle Welten, `tryDashContactKill`).
- **v327** Berater nutzt eigenes 12-Frame-Mapping (Fix falsche Posen bei Lea-Wahl).
- **v328** Feuerblume Welt 13 → **Prototyp-Laborkolben** (bluefield-Zweig).
- **v329** Cape Welt 13 → **Skalierungs-Wachstumschart**.
- **v330** Super-Stern Welt 13 → **GO-LIVE-Deploy-Symbol**.
- **v331** Markttest-Abgründe optisch zugespitzt (Tiefensog, Warnkanten, durchgefallene Ideen).
- **v332** **Bestzeit pro Level** (`bestTimes` im Profil, Anzeige + „NEUE BESTZEIT"-Badge, alle Welten).
- **v333** **Stampf-Boss** Stufe 1 (3 HP von oben, Patrouille, HP-Pips, immun gegen Dash/Stern).
- **v334** Boss als Endgegner vor die Flagge.

## Welt-13-Redesign: Bluefield-Produktreise (v335–v347)
Welt 13 ist jetzt eine 4-Sektionen-Reise (~284 Spalten) nach Schul-Level-Vorbild.
- **v335** Etappe A — 4 Sektionen, doppelte Länge, Elemente/Boss/Proben neu verteilt. `BLUEFIELD_SECTION_BOUNDS = [71,142,213]`.
- **v336** Etappe B — Sektions-Farbstimmung mit Cross-Fade + Mono-Label.
- **v337** Immersive U1-Sektion (vollflächig, geclippt) + Bluefield-Willkommens-Text (screen-fix).
- **v338** U1-Sektion auf **weißen** Hintergrund + Produktclaim „Unser Produkt, der U1-Optimierer".
- **v339** **Schleusentüren** an den Grenzen (→ U1-OPTIMIERER / MATCHSUITE / GKV-VERGLEICH).
- **v340** **MatchSuite-Welt** (Blueprint-Look, Berater↔Projekt-Matching, Match-Score).
- **v341** **Neblige GKV-Welt** (Nebelschwaden, schemenhafte Vergleichstabelle, „in Planung").
- **v342** Tür-Durchgangseffekt (Vordergrund-Schleusenschleier — Figur verschwindet kurz dahinter).
- **v343** Politur: Willkommens-Sektion hell/freundlich, Labels an die Reise angepasst.
- **v344** Willkommens-Welt mit **Portal** + **Ideen-Baum** (Glühbirnen reifen zu €/↔/? Produkt-Symbolen).
- **v345** Boss-Arena Kern: **Flagge erst nach Boss-Sieg** frei (Boss verpflichtend, Hinweis „Erst das Legacy-System besiegen!").
- **v346** **Boss-Arena-Kulisse** (Legacy-System-Server-Racks, rote Warn-Spotlights, Kampfzone, Namensschild).
- **v347** **Boss-Sieg-Sequenz** (Hit-Stop, Shake, Explosion, „SYSTEM DOWN!" / „→ GO LIVE frei!").

## Welt-13-Reise: Feinschliff & Endkampf (v348–v351)
- **v348** MatchSuite-Welt aufgewertet (Briefing-Panel, schwebende Skill-Wolke, Kandidaten-Terminals).
- **v349** GKV-Welt aufgewertet (Kassen-Vergleichskarten, schwebende Fragezeichen, „in Bau"-Vergleichsportal).
- **v350** **Sichtbare Energiewand-Barriere** vor der Flagge (`bossGate`): kollidierende Barriere-Säule + Vordergrund-Energiewand, verschwindet bei Boss-Sieg mit „ZUGANG FREI!".
- **v351** **Boden pro Sektion** (`tintBluefieldGround`): U1 heller Office-Boden, MatchSuite Blueprint-Navy, GKV neblig-grau, Willkommen blaue Wiese — folgt der Hügelkurve.

## Boss-Fight & globaler Look (v352–v357)
- **v352** Boss mit **Phasen** (schneller/aggressiver pro Treffer) + **Sprung-Attacke** + roter Phasen-Aura.
- **v353** **Boss-Projektile**: der Boss wirft „Fehler"-Glitches Richtung Spieler (rote `!`-Blöcke). Dabei den fehlenden Boss-Update-Pfad in `entity_step.ts` ergänzt — der Boss bewegt sich jetzt korrekt (Patrouille in der Arena, Sprung, Wurf).
- **v354** Performance-Analyse Desktop: Backing-Store-Cap getestet — Messung via FPS-Overlay zeigte **56–60 FPS** (kein echtes Problem, „langsamer"-Eindruck = Kamera-Zoom). Cap wieder entfernt → volle Bildschärfe.
- **v355** **Parallax-Tiefe** in Welt 13: ferne, langsamer scrollende Silhouetten-Ebenen (U1 helle Bürotürme, MatchSuite navy Struktur-Türme, GKV Nebel-Silhouetten). `drawBluefieldFarLayer`.
- **v356** **Globale weiche Vignette** über das fertige Bild (cinematischer Look, alle Welten).
- **v357** **Globaler weicher Glow/Bloom** (blur + additiv über das Bild) — helle Bereiche glühen sanft, premium-Look.

## Grafik-Umbau & Time-Attack (v358–v381)
*(aus Handover verdichtet; Detailtags v358–v361 nicht einzeln dokumentiert.)*
- **Safari-Falle gebannt:** Vollbild-Bloom via self-referencing Canvas-Draw (`ctx.drawImage(this.canvas)` mit blur/`lighter`) verursachte schwarzen iPhone-Bildschirm → ersetzt. Glow ausschließlich über **gebackene Discs** (`gfx/glow.ts`, `getGlowDisc`/`stampGlow`, Frame-Budget 18). Kein `ctx.filter`/`shadowBlur` im Frame-Loop.
- **Welten-Farb-Grading** (`gfx/grade.ts`, `WORLD_GRADE` je Welt): multiply-Tint + optionales Kontrast-Overlay, angewendet nach Vignette/Lichtstimmung, vor Grain.
- **Grain/Dither** (`gfx/noise.ts`), statische Lichtstimmung (gecachter Gradient), **Kanten-Highlight** aller Welten (`TOP_RIM` in tiles.ts), Makro-Tile-Variation, zweite Ferne-Ebene Eis.
- **Performance-Fix:** `shadowBlur` + Live-Halo aus `drawCoin` entfernt.
- **Time-Attack-Geist** komplett: Aufzeichnung in `engine.update`, `saveGhost`/`getGhost` (storage.ts), Ein/Aus über `settings.showGhost`, interpolierte Kopf+Körper-Silhouette in render.ts.
- **Welt-1-Bug** behoben (Note-Block-Sprungfeder col 18 blockierte Laufweg → entfernt, Münzreihe gesenkt).
- **Bodennebel Dschungel** (gebackene, driftende Disc).

## Hintergrund-Aufwertung, Balance & Release-Prep (v382–v389)
- **v382** Bodennebel-Helfer aus dem Dschungel extrahiert (`drawGroundFog`, wiederverwendbar) + Rollout auf **Höhle/Vulkan/Schloss** (welt-passende Farben).
- **v383** Bodennebel-Rollout **Tiefsee** (dichterer Schwebeschleier) + **Space** (sehr dezent, Nebula-Anmutung).
- **v384** Bodennebel-Rollout **Strand/Outback/Wolken/Eis** — Rollout abgeschlossen (10 von 13 Welten; Schule/Superfly/Bluefield bewusst ausgelassen).
- **v385** **Wolkenschatten** (`drawCloudShadows`, gebackene Disc, ~5 % Deckkraft, langsam driftend) für die hellen Außenwelten (Dschungel/Strand/Wolken/Outback) — „eine Wolke zieht vor die Sonne".
- **v386** **Welt 7 (Eis):** zwei harte 1-Tile-Eistreppen (col 74–76, 162–164) → glatte kollidierbare **Eis-Rampen** (`terrainHills`), kein Lauf-Hänger mehr. **Release-Blocker:** `unlockAllWorlds` auf `false` (Test-Zugriff via Einstellung „🗺️ Alle Welten").
- **v387** **Balance-Fix:** Welt 11 (Schule) & 12 (Superfly) hatten **null Power-Ups** → je 4 Blöcke ergänzt (Super/Schild + 2 Herzen, fair verteilt vor harten Abschnitten/nach Checkpoint).
- **v388** **Balance:** Welt 5 (Outback) entschärft — Gegner-Dichte 7.0 → 6.0 (2 Gegner entfernt), 1 Wasserloch (160–162) geschlossen → Kurve passt zu W4/W6.
- **v389** **Balance:** Welt 9 (Tiefsee) geglättet — 18 → 14 Gegner (Dichte 8.2 → 6.4), ein Fisch → **Qualle** als 4. Gegner-Art (weniger „spammy").
