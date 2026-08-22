# Tiefes Grafik-Audit — Welt 18 „Stadt · Über den Dächern"

**Zweck:** Grundlage für deinen Konzeptionscode und die Aufteilung in viele kleine Umsetzungs-Pakete.
**Stand:** Level index 17 (Welt 18), Build vom aktuellen Bundle (2026-08-10f).
**Methode:** Codenahe Analyse aller Stadt-Renderpfade + frische Referenz-Screenshots (Start, Gasse/Müllgrube, Sturm-Peak, Boss-Anmarsch).

---

## 0. Kurzfazit (TL;DR)

Die Stadt ist **inhaltlich reich** (Parallax-Skyline, Monster+Zeppelin-Event, Regen/Gewitter, Neon-Pfützen, Deko, Boss), aber **grafisch flach**. Der Look leidet an drei Kernproblemen, die alle Screenshots teilen:

1. **Kein echtes Nachtlicht.** Die Szene ist als Nacht angelegt, aber nichts leuchtet in die Welt hinein. Fenster, Neon und Mond werfen kein Licht auf Dunst, Boden, Deko oder Figuren. Spielerin und Gegner sind wie am Tag ausgeleuchtet und „schweben" farblich über der Nachtszene.
2. **Der Vordergrund-Boden ist der schwächste Teil.** Die Dachfläche (≈30 % der Bildhöhe) ist eine **einzige, identisch wiederholte graue Ziegelkachel** ohne Variation, Kontaktschatten oder Nässe — direkt unter der aufwändigen Skyline wirkt das billig.
3. **Alles ist „line-art dünn".** Skyline-Häuser sind flache Rechtecke, Deko sind zarte Strichzeichnungen, Regen sind gleichförmige Striche. Es fehlt an Volumen, Staffelung (atmosphärischer Perspektive) und Detaildichte.

Der größte Hebel bei kleinstem Risiko: **Nachtlicht-Grade + Fenster-Leben + Skyline-Tiefe** (Pakete P1–P3). Danach der **Boden/Nässe-Block** (P4–P6). Das hebt den Level von „funktioniert" auf „sieht teuer aus".

---

## 1. Ist-Zustand — codenahe Bestandsaufnahme

| Bereich | Funktion / Datei | Bewertung |
|---|---|---|
| Himmel + Skyline + Monster + Zeppelin | `drawCityBackground`, `drawZeppelin` — `renderer/backgrounds.ts` (~6441) | Solide Struktur, aber flach & live gerendert (kein Cache) |
| Blitz-Silhouette | `silhouette()` + Backlight in `drawCityBackground`; `cityFlash` | Neu, funktioniert gut — bestes Beispiel für „Licht als Stilmittel" |
| Farb-Grade | `WORLD_GRADE.city` — `gfx/grade.ts`; `drawSceneGrade` | Sehr dezent (a≈0.12) — zu schwach für Noir-Wirkung |
| Dach-Tiles | `drawCityRoofTile` — `renderer/tiles.ts` (1406) | **Nur eine Kachel**, minimale Fugen, keine Varianten |
| Müllgrube | `drawCityGarbage` — `renderer/tiles.ts` (1427) | Lava-Reskin, als Gefahr zu unauffällig |
| Dach-Deko + Pfützen + Nässe-Glanz | `drawCityDeco` — `engine_internal/render.ts` (948) | 7 Deko-Sorten, aber winzig & schattenlos |
| Regen | `drawCityRain` / `cityRainIntensity` — `render.ts` (1038+) | Eine Ebene, keine Tiefe, kein Aufschlag |
| Pfützen-Spiegelung Figur | Player-Reflection-Block — `render.ts` (~604) | Stilisierte Bänder, subtil |
| Gegner | `drawRat`, `drawTrashCan`, `drawGeyser`, `drawRatBoss` — `renderer/enemies-core.ts` (1245+) | Sauberes Vektor-Art, aber tagbeleuchtet & ohne Bodenschatten |

### Architektur-Befund (wichtig für Performance UND Qualität)
`drawCityBackground` zeichnet **alle drei Parallax-Ebenen inkl. Fensterraster jeden Frame live** (verschachtelte `pseudoRandom`-Schleifen). Andere Welten cachen ihre Parallax-Streifen in Offscreen-Canvases (`cctx`-Muster). Der Umstieg auf einen **Offscreen-Cache pro Skyline-Streifen** ist doppelt wertvoll: er senkt die Frame-Kosten **und** erlaubt erst die höhere Detaildichte (Dachaufbauten, Fenster-Höfe), ohne das Frame-Budget zu sprengen. → Voraussetzung für P1/P2.

---

## 2. Befunde je Bildzone (aus den Screenshots)

**Skyline (Hintergrund).** Häuser = einfarbige Rechtecke, oben flach abgeschnitten. Fenster = gleich große, gleich warme Kästchen, statisch an/aus. Mittel- und Fernebene fast gleicher Farbton → **kaum atmosphärische Tiefe**. Keine Landmarken (Turm, Brücke, Reklametafel), dadurch beim Scrollen repetitiv.

**Dachfläche (Vordergrund-Boden).** Eine graue Kachel, identisch gekachelt. Keine Kies-/Bitumen-/Ziegel-Variation, keine Kabel, Lüfter, Moosfugen, Wasserränder. Deko und Gegner stehen **ohne Kontaktschatten** auf — sie „kleben" nicht am Boden, wirken aufgesetzt.

**Nässe.** Es gibt Neon-Pfützen und eine Figur-Spiegelung, beides sehr subtil und **lokal**. Der Boden liest sich trocken, obwohl es dauerregnet. Keine durchgehende Nässe-Schicht, keine Skyline-Spiegelung im nassen Dach, keine Tropfen-Ringe.

**Regen.** Dünne, gleichförmige Diagonalen über den ganzen Screen, eine Tiefe. Kein Nah/Fern, kein Aufprall-Spritzer auf dem Dach (nur unterm Schirm), kein Dunst/Sprühnebel, keine Böen.

**Deko.** Antenne/Klima/Tank/Wäsche/Neon/Schirm/Gully sind hübsch, aber **winzige Striche** auf der Dachkante, ~⅓ der Spalten, einzeln verteilt. Wirken wie Doodles, nicht wie Requisiten. Keine Gruppierung zu „Szenen" (z. B. Dachterrasse).

**Gegner.** Ratte mittelgrau → **verschwimmt gegen den grauen Boden** (Lesbarkeit!). Mülltonne, Geysir, Boss sauber, aber flach schattiert und ohne Nachtlicht/Rim-Light.

**Müllgrube.** Grün-brauner Lava-Reskin. Als **Todesgefahr für kleine Kinder zu leise** — keine blubbernde Oberfläche, keine Fliegen/Dampf, zu wenig Warnkontrast.

**Monster/Zeppelin.** Nette Inszenierung, aber Monster = flacher dunkler Klecks. Beim Blitz wäre eine **beleuchtete Silhouettenkante + Rauch** enorm wirksam (das Silhouetten-Prinzip ist im Blitz schon da — nur aufs Monster erweitern).

---

## 3. Optimierungspakete (priorisiert)

Jedes Paket ist so geschnitten, dass es **einzeln** als Bundle umsetzbar und testbar ist. Angaben: **Ziel · Ist-Schwäche · Technik · Dateien · Aufwand (S/M/L) · Risiko**.

### Priorität A — Licht & Tiefe (größter Wow-Effekt)

**P1 · Skyline-Tiefe & Vielfalt + Offscreen-Cache**
*Ziel:* Skyline wirkt tief, gebaut, nie repetitiv.
*Technik:* Pro Parallax-Streifen Offscreen-Canvas cachen (wie andere Welten). Dachsilhouetten variieren (Setbacks, Staffelgeschosse, Wassertürme, Antennenmasten, Kuppeln). Atmosphärische Staffelung: je ferner, desto stärker in Richtung Himmel-Dunst entsättigt/aufgehellt (Luftperspektive). 1–2 Landmarken (Fernsehturm/Reklametafel), die selten vorbeiscrollen.
*Dateien:* `renderer/backgrounds.ts` (`drawCityBackground`).
*Aufwand:* L · *Risiko:* mittel (Cache-Invalidierung bei Resize/Quality beachten).

**P2 · Fenster-Leben & warme Lichthöfe**
*Ziel:* Die Stadt „atmet".
*Technik:* Fenster in mehreren Farbtemperaturen (warmweiß/kalt/vereinzelt TV-Blau), unterschiedliche Helligkeit, seltenes Twinkle/Umschalten. Um Fensterballungen weiche warme Bloom-Höfe in den Dunst (additiv, nur nahe Ebene). Nutzt den vorhandenen Bloom-Pass (`webglPost`) bzw. gecachte Glow-Sprites.
*Dateien:* `renderer/backgrounds.ts`; ggf. `gfx/glow.ts`.
*Aufwand:* M · *Risiko:* gering (rein additiv).

**P3 · Noir-Nachtlicht-Grade + Figuren einbetten**
*Ziel:* Ein kohärenter Nacht-Look; Figuren gehören in die Szene.
*Technik:* `WORLD_GRADE.city` kräftiger und gerichteter (kühle Schatten, warme Lichtpools, leichte Magenta/Cyan-Neon-Fassung). Spielerin & Gegner bekommen einen dezenten Nacht-Tint + optionales Rim-Light (Mond/Neon) über einen Post-Multiply/Overlay, damit sie nicht „taghell" wirken.
*Dateien:* `gfx/grade.ts`, `engine_internal/render.ts` (Post-Layer + Sprite-Tint-Hook).
*Aufwand:* M · *Risiko:* mittel (Tint darf Lesbarkeit der Figur nicht kosten → Assist/Qualität testen).

### Priorität B — Boden & Nässe (der repetitivste Bereich)

**P4 · Dachflächen-Redesign + Kontaktschatten**
*Ziel:* Der Boden trägt die aufwändige Skyline.
*Technik:* 3–4 Tile-Varianten (Bitumen/Kies/Ziegel/Blech) deterministisch je Spalte gemischt; Kantenhighlight & Parapet variieren; feine Details (Kabel, Dachpappen-Naht, Moos, Wasserrand). Deko UND Gegner bekommen einen weichen Kontaktschatten (elliptischer Multiply-Fleck), damit alles am Boden „haftet".
*Dateien:* `renderer/tiles.ts` (`drawCityRoofTile`), `engine_internal/render.ts` (Deko/Gegner-Schatten).
*Aufwand:* M · *Risiko:* gering.

**P5 · Durchgehendes Nässe-System**
*Ziel:* Nasse Stadt statt trockener Boden bei Dauerregen.
*Technik:* Halbtransparente Wet-Sheen-Schicht auf Dachflächen (gekachelt), die im Blitz kurz aufblitzt (bestehender `cityFlash`-Hook). Pfützen spiegeln nicht nur Neon, sondern eine gestauchte Skyline-/Mond-Reflexion. Tropfen-Ringe (expandierende Kreise) auf Pfützen im Regentakt, skaliert mit `cityRainIntensity`.
*Dateien:* `engine_internal/render.ts` (`drawCityDeco`, Pfützen-Block, `renderPostLayer`).
*Aufwand:* M · *Risiko:* gering (bereits an Regen-Regler gekoppelt).

**P6 · Regen-Tiefe & Wetter-Atmosphäre**
*Ziel:* Regen mit Volumen statt Striche.
*Technik:* Zwei Regenebenen (fern klein/langsam/blass, nah groß/schnell). Aufprall-Spritzer auf Dachhöhe (kurze Tick-Partikel). Sich bewegende Dunst-/Nebelschwaden (großflächige, langsame Alpha-Wolken). Optionale Böen, die Regenwinkel kurz kippen. Alles über `cityRainIntensity` gedimmt (Regler & Sturm-Kurve).
*Dateien:* `engine_internal/render.ts` (`drawCityRain`), evtl. `engine_internal/particles.ts`.
*Aufwand:* M · *Risiko:* gering–mittel (Partikelzahl an Qualitätsstufe gaten).

### Priorität C — Requisiten & Gegner-Politur

**P7 · Dach-Deko aufwerten & gruppieren**
*Ziel:* Requisiten statt Doodles.
*Technik:* Vorhandene 7 Sorten mit Fläche/Volumen füllen (Schatten, 2-Ton-Schattierung, kleine Lichter). Neue Sorten (Dachterrasse mit Stühlen, Satellitenschüssel, Taubenschwarm, Leuchtreklame quer). „Szenen"-Gruppen statt Einzelobjekte (deterministisch je Segment). Alle mit Kontaktschatten (aus P4).
*Dateien:* `engine_internal/render.ts` (`drawCityDeco`).
*Aufwand:* M · *Risiko:* gering.

**P8 · Gegner-Nachtlicht, Rim-Light & Lesbarkeit**
*Ziel:* Gegner klar lesbar und in die Nacht integriert.
*Technik:* Ratte kühler/dunkler tönen + heller Rim-Light-Rand (Mond/Neon) und Kontaktschatten → Kontrast gegen grauen Boden. Gleiche Behandlung für Tonne/Boss. Geysir-Strahl mit additivem Glow + leichtem Bloom.
*Dateien:* `renderer/enemies-core.ts` (`drawRat`, `drawTrashCan`, `drawGeyser`, `drawRatBoss`).
*Aufwand:* S–M · *Risiko:* gering.

**P9 · Müllgruben-Redesign (klare Gefahr)**
*Ziel:* Kinder erkennen die Todeszone sofort — „fair für beide Kinder".
*Technik:* Blubbernde Schleimoberfläche (animierte Blasen), aufsteigender Dampf/Geruchswellen, kreisende Fliegen, kräftigerer Warnkontrast am Rand (giftgrüner Saum). Optional eigener `TileType` statt Lava-Reskin für saubere Physik-Trennung (größeres Paket, separat).
*Dateien:* `renderer/tiles.ts` (`drawCityGarbage`); optional `constants.ts`/Physik für eigenen TileType.
*Aufwand:* S (Reskin) / L (eigener TileType) · *Risiko:* gering / mittel.

### Priorität D — Event & Feinschliff

**P10 · Monster & Zeppelin inszenieren**
*Ziel:* Der „schwarze-Monster"-Moment wird zum Höhepunkt.
*Technik:* Beim Blitz Monster-Silhouette mit heller Konturkante (Backlight-Prinzip aus P-Blitz auf Monster erweitern). Aufsteigender Rauch/Dunst um das Monster. Zeppelin mit Suchscheinwerfer-Kegel (rotierend) + blinkenden Positionslichtern + eigener Parallax-Drift.
*Dateien:* `renderer/backgrounds.ts` (Monster-Block, `drawZeppelin`).
*Aufwand:* M · *Risiko:* gering.

**P11 · Vordergrund-Parallax-Occluder**
*Ziel:* Räumliche Tiefe durch Vordergrund.
*Technik:* Sehr dunkle, unscharfe Vordergrund-Elemente, die schneller scrollen und kurz vor der Kamera vorbeiziehen (Gebäudekante, Rohre, hängende Kabel, eine Antenne). Optional leichte Tilt/Blur-Anmutung.
*Dateien:* `renderer/backgrounds.ts` oder eigener Post-Vordergrund-Pass in `render.ts`.
*Aufwand:* M · *Risiko:* mittel (darf Spielfeld nicht verdecken → nur Randzonen/oben).

**P12 · Boss-Arena-Grafik (Finale-Bühne)**
*Ziel:* Das optionale Boss-Finale bekommt eine Bühne.
*Technik:* Bei Boss-Sicht Arena-Grade (dunkler, roter Rand-Vignette), Suchscheinwerfer/Neon-Reklame im Rücken, Rauch am Boden, verstärkter Regen. Nutzt `rearing`/`sighted`-Flags des Bosses.
*Dateien:* `renderer/backgrounds.ts`, `engine_internal/render.ts`, `engine.ts` (Trigger).
*Aufwand:* M · *Risiko:* mittel.

### Querschnitt — Performance & Qualitätsstufen
Alle additiven Effekte (Bloom-Höfe, Partikel, Reflexionen) an `settings.quality` (`low/mid/high/auto`) gaten und Partikelzahlen deckeln. Offscreen-Cache (P1) ist die Grundlage, damit P2/P7 „gratis" werden. `level-guards`/`pipeline-check` bleiben Pflicht-Gate pro Paket.

---

## 4. Empfohlene Reihenfolge (für deine Pakete)

1. **P1 → P2 → P3** (Licht & Tiefe): sofort sichtbarer Sprung, gemeinsame Basis.
2. **P4 → P5 → P6** (Boden & Nässe): beseitigt die schwächste Zone.
3. **P8 → P7 → P9** (Gegner/Deko/Gefahr): Politur mit hohem Lesbarkeitsnutzen.
4. **P10 → P12 → P11** (Event/Finale/Vordergrund): Dramatik & Feinschliff.

**Schnelle Gewinne zuerst** (kleiner Aufwand, große Wirkung): P3 (Grade stärker), P4 (Kontaktschatten + Tile-Varianten), P8 (Gegner-Rim-Light), P5 (Wet-Sheen). Diese vier heben den Gesamteindruck schon deutlich, bevor die großen Pakete (P1/P6) landen.

---

## 5. Test- & Abnahme-Checkliste je Paket
- `npx tsc --noEmit` = 0, `node tools/pipeline-check.mjs` = PASS, `npx tsx tools/level-guards.mts` = 0 WARN.
- Reiner RAF-Soak über das ganze Stadt-Level = 0 Render-Fehler (keine `g.step()`-Doppel-Updates in Tests!).
- Screenshots an 4 Referenzpunkten (Start, Gasse/Müllgrube, Sturm-Peak, Boss) vor/nach.
- Gegen `settings.quality = low` prüfen (Partikel/Bloom gedeckelt) und Regen-Regler 0 → trocken.

---

## 6. Umsetzungs-Status
- **P1 — Skyline Offscreen-Cache + Tiefe/Vielfalt: ✅ umgesetzt** (Bundle `2026-08-10g`). Drei Parallax-Ebenen als gecachte, gekachelte Streifen (normal + Silhouette); variierte Dachformen (Wasserturm, Antenne+Blinklicht, Setback/Penthouse, Parapet, Spitzdach), Luftperspektive/Dunst je Ebene, Fenster in warm/kühl/TV-blau, Landmarken (Fernsehturm fern, Neon-Reklame mittel). Blitz-Silhouette über den gecachten Silhouetten-Strip erhalten. QA: tsc 0, pipeline PASS, guards 0 WARN, RAF-Soak 0 Fehler. Dateien: `renderer/backgrounds.ts`, `renderer.ts` (Feld `citySkyCache`).
- **P2 — Fenster-Leben & Bloom-Höfe: ✅ umgesetzt** (Bundle `2026-08-10h`). Sparsamer Live-Overlay über den gecachten Streifen: warme Bloom-Höfe („atmend"), die in den Dunst bluten, + einzelne Twinkle-Fenster, die weich an-/ausgehen. Beim Blitz ausgeblendet; Bloom auf `quality='low'` deaktiviert (Twinkle bleibt). Geometrie dafür im `citySkyCache` mitgeführt. QA: tsc 0, pipeline PASS, guards 0 WARN, RAF-Soak 0 Fehler. Datei: `renderer/backgrounds.ts`.
- **P3 — Noir-Nachtlicht-Grade + Figuren einbetten: ✅ umgesetzt** (Bundle `2026-08-10i`). Kräftigerer, kühlerer City-Grade (`WORLD_GRADE.city`) + kühl-blaue, gerichtete Vignette (`VIG.city` in `drawSceneGrade`). Neuer `city`-Fall in `getThemeAccent()` → alle Stadt-Gegner (Ratte, Tonne, Boss) bekommen über den bestehenden Rim/Glint/Schatten-Pfad ein kühles Mondlicht-Rim (löst auch die Ratten-Lesbarkeit gg. grauen Boden); Spielerin-Schatten kühl getönt. Zusätzlich schmaler Mondlicht-Rim an der Oberkante der Spielerin (city-only, additiv). Blitz-Silhouette unverändert intakt. QA: tsc 0, pipeline PASS, guards 0 WARN, RAF-Soak 0 Fehler. Dateien: `gfx/grade.ts`, `renderer/effects.ts`, `renderer.ts`, `engine_internal/render.ts`.
- **P4 — Dachflächen-Redesign + Kontaktschatten: ✅ umgesetzt** (Bundle `2026-08-10j`). Neue `applyCityRoofVariation` (statt der generischen erdigen Sprenkel): deterministische Material-Variation je Kachel (Bitumen/Kies/Beton-Panel), Fugen, Kabel über der Dachkante, Moos-Ecken, feuchte Flecken; kühle Dachkante (`TOP_RIM.city`). Kontaktschatten für alle Deko-Objekte (`drawCityDeco`) und für die Stadt-Gegner (Ratte, Tonne, Geysir, Boss — Boss nur am Boden) über `softShadowEllipse` mit City-Accent-Schatten. Auf `quality='low'` fällt die Kachel-Variation weg (Basis-Tile bleibt). QA: tsc 0, pipeline PASS, guards 0 WARN, RAF-Soak 0 Fehler. Dateien: `renderer/tiles.ts`, `renderer/enemies-core.ts`, `engine_internal/render.ts`.
- **P5 — Nässe-System: ✅ umgesetzt** (Bundle `2026-08-10k`). Kontinuierlicher Wet-Sheen auf der Dachkante (skaliert mit `cityRainIntensity`), Pfützen mit blasser Mond-/Himmel-Spiegelung (wabernder Schimmer, auf die Pfütze geclippt) + Neon-Reflex, und Tropfen-Ringe im Regentakt (expandierende Ringe, Auftreffpunkt wechselt pro Zyklus, ab rain>0.15). Blitz-Glanz bleibt zusätzlich. QA: tsc 0, pipeline PASS, guards 0 WARN, RAF-Soak 0 Fehler. Datei: `engine_internal/render.ts` (`drawCityDeco`).
- **P9 — Müllgruben-Redesign: ✅ umgesetzt** (Bundle `2026-08-10l`). Live-Overlay `drawCityGarbageFx` über die statischen LAVA_TOP-Gruben: pulsierender Giftgrün-Warnsaum (starker Kontrast → Kinder erkennen die Todeszone sofort), blubbernde Blasen (steigen/wachsen/platzen als Ring), aufsteigender grünlicher Gestank/Dampf und kreisende Fliegen. Statische Kachel (`drawCityGarbage`) mit kräftigerer giftgrüner Schleimlinie. QA: tsc 0, pipeline PASS, guards 0 WARN, RAF-Soak 0 Fehler. Dateien: `engine_internal/render.ts`, `renderer/tiles.ts`.
- **P6 — Regen-Tiefe: ✅ umgesetzt** (Bundle `2026-08-10m`). Zwei Regenebenen (fern klein/blass/langsam, nah groß/kräftig/schnell), Wind-Böen kippen Winkel & Tempo, Aufschlag-Spritzer (V-Ticks) auf der Dachlinie, driftende Nebelschwaden. Alles an `cityRainIntensity` gekoppelt. Datei: `engine_internal/render.ts` (`drawCityRain`).
- **P10 — Monster & Zeppelin inszeniert: ✅ umgesetzt** (Bundle `2026-08-10m`). Monster: aufsteigender Rauch/Dunst + bei Blitz helle Backlight-Kontur (Silhouetten-Rand leuchtet auf). Zeppelin: schwenkender Suchscheinwerfer-Kegel aus der Gondel + blinkende Positionslichter (Bug rot / Heck grün). Datei: `renderer/backgrounds.ts`. QA (beide): tsc 0, pipeline PASS, guards 0 WARN, RAF-Soak 0 Fehler.
- **P7 — Dach-Deko aufgewertet: ✅** (Bundle `2026-08-10n`). Kind-Anzahl 7→9; neue Sorten Satellitenschüssel & wippendes Tauben-Trio. Datei: `render.ts` (`drawCityDeco`).
- **P8 — Gegner-Politur: ✅** (`2026-08-10n`). Mondlicht-Rim + Augen-Glint (über City-Accent) für Ratte, Mülltonne und Boss; additiver Glow um den aktiven Geysir-Strahl. Datei: `renderer/enemies-core.ts`.
- **P11 — Vordergrund-Occluder: ✅** (`2026-08-10n`). Dunkle, schnell scrollende Hänge-Kabel (Parallax 1.3×) am oberen Rand → Tiefe, ohne das Spielfeld zu verdecken. Datei: `render.ts` (`drawCityForeground`).
- **P12 — Boss-Arena: ✅** (`2026-08-10n`). Sobald die Monsterratte gesichtet ist: roter Vignette-Rand + zwei schwenkende Scheinwerfer + verstärkter Regen. Dateien: `render.ts` (`cityBossActive`, `drawCityBossArena`, Regen-Boost).
- **STATUS: Alle 12 Pakete (P1–P12) umgesetzt.** QA je Paket: tsc 0, pipeline PASS, guards 0 WARN, RAF-Soak 0 Fehler (inkl. Boss & quality=low).

## 7. Folge-Politur (nach P1–P12)
- **Effekt-Regler „Stadt: Effekt-Stärke" (`stadtEffekte` 0..1, Default 1.0): ✅** (Bundle `2026-08-10o`). Neuer Slider in den Optionen skaliert NUR die dekorativen Zusatz-Effekte (Fenster-Twinkle & Bloom, Neon-Pfützen, Tropfen-Ringe, Nebel, Boss-Scheinwerfer, Vordergrund-Kabel, Müllgruben-Blasen/Dampf/Fliegen). Bewusst UNBERÜHRT: Regen (eigener Regler), Blitz, und der Müllgruben-Warnsaum (Kinder-Fairness). Storage-Feld + `SliderRow`; verifiziert: `stadtEffekte=0` → ruhige Stadt, Kernszene/Regen/Warnung bleiben.
- **Low-End-Gating (`quality='low'`): ✅** (`2026-08-10o`). Auf 'low' entfallen Vordergrund-Kabel, Boss-Scheinwerfer (roter Vignette-Rand bleibt), Nebel, Regen-Spritzer, Müllgruben-Dampf/Fliegen; Regentropfen-Anzahl −45 %, Blasen auf 1 reduziert. Headless-Messung (SwiftShader): ~34 % kürzere Frame-Zeit low ggü. high — bestätigt spürbare Entlastung.
- **Offen (bewusst als eigener Schritt):** dieselben Bausteine (Offscreen-Skyline-Cache, Nachtlicht-Accent via `getThemeAccent`, Nässe/Wet-Sheen) auf eine ältere Welt übertragen — Zielwelt wird mit dem User abgestimmt.

- **Echtes Foto als Stadt-Kulisse (Tag→Dämmerung→Nacht): ✅ umgesetzt** (Bundle `2026-08-10ac`). Drei professionelle User-Panoramen (Dachterrassen-Perspektive, 2172×241 → JPEG q82 auf 1600 Breite, ~215 KB gesamt in `assets/cityBg.ts`) ersetzen die prozedurale Neon-Skyline. Neu in `drawCityBackground`: an der Bodenlinie verankerte Foto-Kulisse (dieselbe Blit-Routine wie die Urlaubswelt), die über den Level-Fortschritt Tag(0) → Dämmerung(0.5) → Nacht(1) weich überblendet, mit langsamem Parallax-Schwenk; Tageszeit-abhängiger Fallback-Himmel bis das Bild geladen ist; dunkle Tiefe unter der Bodenlinie für Lücken. ENTFERNT: prozedurale Skyline-Cache-Streifen + Fenster-Bloom/Twinkle + Smog-Band (das Foto trägt jetzt beleuchtete Fenster/Neon). ERHALTEN & weiter aktiv oben drauf: Blitz-Backlight (erhellt jetzt die ganze Foto-Kulisse), Monster-Silhouette (liest sich als dunkle Silhouette gegen Foto/Blitz — inkl. Blitz-Kontur), Zeppelin mit Suchscheinwerfer, Regen (skaliert bereits über `cityRainIntensity` mit dem Fortschritt: leicht bei Tag → Sturm bei Dämmerung/Nacht), Boss-Arena, Vordergrund-Kabel, Nässe/Pfützen/Deko. QA: tsc 0, pipeline PASS, guards „Welt 18 sauber", RAF-Soak 0 Fehler, Screenshots je Tageszeit geprüft (alle drei stimmig & professionell), Deploy-Sim aus Baseline 618bb0b baut sauber (6394 KB). Dateien: `assets/cityBg.ts` (neu), `renderer.ts`, `renderer/backgrounds.ts`.

- **Feinschliff Foto-Übergänge: ✅ umgesetzt** (Bundle `2026-08-10ad`). Die Tag→Dämmerung→Nacht-Überblendung ist jetzt weich gestaffelt (statt hartem Knick bei 0.5): jede Tageszeit „hält" und geht dann über ein eigenes smoothstep-Band über — Tag hält bis ~0.26, Übergang zur Dämmerung 0.26-0.50, Dämmerung-Halt bis ~0.60, Übergang zur Nacht 0.60-0.86, danach volle Nacht. Umgesetzt als 3-Schicht-Blit: Tag als Basis, Dämmerung mit alpha=dawnW, Nacht mit alpha=nightW (beide smoothstep). NEU: dezente Nacht-Fenster-Glühakzente — wenige weiche, warm „atmende" additive Glühpunkte über der Foto-Skyline, NUR nachts (skaliert mit nightW), mit Effekt-Regler, auf 'low' aus; das Foto trägt die Fenster selbst, die Akzente geben nur nachts etwas Flimmern obendrauf. QA: tsc 0, pipeline PASS, guards „Welt 18 sauber", RAF-Soak 0 Fehler, Screenshots (Tag-Halt/Übergang/Nacht) geprüft, Deploy-Sim baut sauber (6395 KB). Datei: `renderer/backgrounds.ts`.

- **Regen-Nässe an Tageszeit gekoppelt + Nacht-Neon-Reflexe: ✅ umgesetzt** (Bundle `2026-08-10ae`). **#1:** Der Wet-Sheen auf den Dachkanten und die Pfützen-Himmel-Spiegelung nehmen jetzt einen Tageszeit-Ton an (dieselben smoothstep-Faktoren dawnW/nightW wie die Foto-Kulisse): neutral-hell am Tag → warm in der Dämmerung → kühl-blau bei Nacht → Boden & Foto wirken als Einheit. **#2:** Nachts spiegelt der nasse Dachboden die hellen Foto-Lichter als weiche vertikale Neon-Farbstreifen (unten am hellsten, nach oben ausblendend, additiv, leicht wabernd), Hash-platziert auf ~50 % der offenen Dachkanten, skaliert mit nightW · Regen · Effekt-Regler, auf 'low' aus. QA: tsc 0, pipeline PASS, guards „Welt 18 sauber", RAF-Soak 0 Fehler, Screenshots Dämmerung (warme Nässe) & Nacht (kühle Nässe + Neon-Reflex) geprüft, Deploy-Sim baut sauber (6396 KB). Datei: `engine_internal/render.ts` (drawCityDeco).

- **Signatur-Bloom auf Foto-Lichter + Boden-Angleichung ans Foto: ✅ umgesetzt** (Bundle `2026-08-10af`). **#1:** Die hellsten Lichter des Nacht-Panoramas wurden per Bildanalyse lokalisiert (String-Lights, Laterne, Neon, Wasser-Reflexe → u/v-Bruchteile) und bekommen nachts weiche, warm „atmende" Bloom-Höfe, die EXAKT am pannenden Panorama verankert sind (panX/panoW aus dem Nacht-Frame), additiv, skaliert mit nightW · Effekt-Regler, auf 'low' aus → die Skyline leuchtet nachts spürbar mehr. **#2:** Der graue Dachboden bekommt im Post-Layer einen sanften Tageszeit-Ton per 'soft-light' (nichts am Tag → warm/amber in der Dämmerung → kühl-blau bei Nacht), begrenzt auf die Boden-Region unter der Bodenlinie (Figuren stehen darüber und bleiben unberührt), Textur bleibt erhalten → nahtloser Übergang Foto → Spielboden. QA: tsc 0, pipeline PASS, guards „Welt 18 sauber", RAF-Soak 0 Fehler, Screenshots Dämmerung (warmer Boden) & Nacht (Bloom + kühler Boden) geprüft, Deploy-Sim baut sauber (6397 KB). Dateien: `renderer/backgrounds.ts` (Bloom), `engine_internal/render.ts` (Boden-Tönung).

- **Laternen-Lichtkegel + Tag-Wolken-Parallax + Blitz-Finale: ✅ umgesetzt** (Bundle `2026-08-10ag`). **#1 Lichtkegel:** Nachts fällt von zwei Foto-Laternen (verankert am pannenden Panorama) ein weicher, volumetrischer Lichtkegel in den Regen bis auf den Dachboden — additiv, mit sanftem Flackern, skaliert mit nightW · Effekt-Regler, auf 'low' aus. **#2 Tag-Wolken:** Eine sehr dezente zweite Wolkenebene (5 weiche additive Puffs) driftet am Tag langsam mit leichtem Parallax über den Foto-Himmel — nur am Tag (kein Nacht-Anteil), sehr geringe Deckkraft, auf 'low' aus. **#4 Blitz-Finale:** Gewitter-Frequenz jetzt zusätzlich zum Sturm-Peak (Level-Mitte) auch zum FINALE hin verdichtet (smoothstep-Nacht-Rampe kürzt das Blitz-Intervall, hart auf min. 80 Frames begrenzt → kein Stroboskop) und Blitze etwas greller; der Donner-Sound-Hook (thunder-SFX mit Verzögerung nach dem Blitz) war bereits vorhanden und bleibt aktiv. QA: tsc 0, pipeline PASS, guards „Welt 18 sauber", RAF-Soak 0 Fehler, Screenshots Tag (Wolken/neutraler Boden) & Nacht (Lichtkegel) geprüft, Deploy-Sim baut sauber (6398 KB). Dateien: `renderer/backgrounds.ts` (#1/#2), `engine.ts` (#4).

- **Regen-im-Kegel + Fenster-Flimmern + Performance-Check: ✅ umgesetzt** (Bundle `2026-08-10ah`). **#2 Regen im Lichtkegel:** Innerhalb der Laternen-Kegel leuchten nachts einige warme Tropfen additiv auf und sind exakt auf die Kegel-Trapeze begrenzt (fading nach unten) → sichtbares Volumenlicht, der Regen funkelt im Licht. Nur nachts, auf 'low' aus. **#3 Fenster-Flimmern:** 11 einzelne Foto-Fenster gehen nachts diskret an/aus (Rechteckwelle mit individueller Phase, ~75 % warm / 25 % kühl), am pannenden Panorama verankert, zusätzlich zu den Bloom-Höfen → mehr Leben in der Skyline. Nur nachts, mit Effekt-Regler, auf 'low' aus. **#1 Performance-Check:** Render-Zeit headless gemessen (getrimmter Mittelwert, Software-Renderer swiftshader → absolute Werte inflationär, nur relativ aussagekräftig): Tag high ~27.5 ms, Nacht high ~34.5 ms, Nacht low ~32.0 ms (Median Nacht high 29.2 vs low 24.8 → Low-Gating spart real). Low-Gate-Audit: ALLE neuen Nacht-Effekte (Tag-Wolken, Bloom, Fenster-Flimmern, Laternen-Kegel, Nacht-Akzente, Neon-Boden-Reflex, Regen-im-Kegel) sind hinter `quality!=='low'`/`!low`; die Boden-Tönung (2 fillRects) läuft überall (vernachlässigbar). Struktur: das Foto (wenige drawImage) ersetzt die alte prozedurale Skyline (3 gekachelte Parallax-Ebenen + Per-Fenster-Bloom/Twinkle-Schleifen über Dutzende Häuser JEDEN Frame) → strukturell deutlich günstiger, v. a. am Tag (keinerlei Per-Fenster-Arbeit mehr). Auf echter GPU sind die Gradient-Fills um ein Vielfaches billiger als im Software-Test. QA: tsc 0, pipeline PASS, guards „Welt 18 sauber", RAF-Soak 0 Fehler, Deploy-Sim baut sauber (6400 KB). Dateien: `renderer/backgrounds.ts` (#3), `engine_internal/render.ts` (#2).

- **Gesamt-QA Welt 18 (Abschluss-Absicherung): ✅ bestanden** (Bundle `2026-08-10ai`). Automatisierte Test-Matrix über 6 Settings-Kombinationen, je kompletter Level-Durchlauf col 6→205 (Tag→Dämmerung→Nacht), Boss-Finale (nahe Ende gehalten) und wiederholte Blitz-Auslösung: A Voll (high/fx1/gew1/rain0.6), B Regler AUS (fx0), C Gewitter AUS, D Low-Modus, E Minimal (low/fx0/gew0/trocken), F Trocken (rain0). Ergebnis: **0 Konsolen-/Page-Fehler in ALLEN 6 Konfigurationen** (Settings jeweils per getSettings-Readback bestätigt). Kontroll-Screenshots: Low-Nacht (Deko korrekt ausgegated, Foto/Monster/Zeppelin/Regen intakt) und trockene Dämmerung (kein Regen, sonst stimmig). Für die deterministische Settings-Umschaltung wurde der bestehende `window.__storage`-E2E-Hook um `updateSettings` erweitert (inerter Test-Hook wie `__game`/`getSettings`). QA-Gate: tsc 0, pipeline PASS, guards 0 WARN über alle 19 Welten, Deploy-Sim baut sauber (6400 KB). Datei: `pages/game.tsx` (Test-Hook).

- **Dämmerungs-Akzente + Nacht-Sternen-Funkeln: ✅ umgesetzt** (Bundle `2026-08-10aj`). **#1 Dämmerungs-Akzente:** Warme Lampen-/Fenster-Glühpunkte (5 Bloom-Höfe an den hellsten Lichtern des DÄMMERUNGS-Fotos + 7 Fenster-Flimmer) erscheinen jetzt auch in der Dämmerung (Faktor duskF = dawnW·(1−nightW)), dezenter als nachts (Dämmerung ist heller) → der Übergang lebt durchgehend, nicht erst nachts. Verankert am Dämmerungs-Panorama (Bild 1), auf 'low' aus. **#2 Sternen-Funkeln:** 22 winzige, twinkelnde Sterne im oberen Nacht-Himmel (über der Skyline), additiv, minimaler Parallax, sehr geringe Deckkraft → Tiefe ohne Aufdringlichkeit; nur nachts (nightW), mit Effekt-Regler, auf 'low' aus. QA: tsc 0, pipeline PASS, guards „Welt 18 sauber", RAF-Soak 0 Fehler, Screenshots Dämmerung (warme Akzente) & Nacht (Sterne) geprüft, Deploy-Sim baut sauber (6401 KB). Datei: `renderer/backgrounds.ts`.

- **Dämmerungs-Wolkenfärbung + Nacht-Mond-Glow: ✅ umgesetzt** (Bundle `2026-08-10ak`). **#1 Wolken-Färbung:** Die driftende Zusatz-Wolkenebene ist jetzt auch in der Dämmerung aktiv (Sichtbarkeit = max(Tag-Anteil, Dämmerungs-Anteil), aus erst bei Nacht) und wird warm eingefärbt (Tag weiß → Dämmerung orange/rosa über duskAmt = dawnW·(1−nightW)), in der Dämmerung minimal kräftiger → der Himmel lebt auch dort. **#2 Mond-Glow (mit Befund):** Auto-Probe ergab, dass der Foto-Mond LINKS im Nacht-Bild (u≈0.16) durch den Rechts-Schwenk der Kulisse nur ganz am Anfang (Tag, prog<0.17) im Bild ist — zur Nacht (prog≳0.6) längst rausgeschwenkt (moonX≈−1900), ein am Foto-Mond verankerter Nacht-Halo wäre also nie sichtbar. Deshalb Pivot auf einen ATMOSPHÄRISCHEN Mond im oberen Nacht-Himmel (feste Bildschirmposition VW·0.30 / bandH·0.27 unter der HUD, minimaler Parallax): weiche Mondscheibe + Halo (additiv, sanft pulsierend) + feine dunkle Wolken-Silhouetten, die davor ziehen (Alpha fällt mit Abstand zum Mond ab). Nur nachts, mit Effekt-Regler, auf 'low' aus. QA: tsc 0, pipeline PASS, guards „Welt 18 sauber", RAF-Soak 0 Fehler, Screenshots geprüft (Mond im Himmelsstreifen sichtbar), Deploy-Sim baut sauber (6402 KB). Datei: `renderer/backgrounds.ts`.
