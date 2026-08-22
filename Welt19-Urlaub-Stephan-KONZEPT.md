# Konzept — Welt 19: Urlaubswelt mit „Stephan" (Vorschlag zur Freigabe)

**Status:** Konzept-Entwurf zur Abstimmung. Noch KEIN Code gebaut.
**Ziel:** Eine ganz neue, **extrem hochwertige** Welt, die **ganz hinten** angehängt wird (id 19, nach „Stadt"). Fester Bild-Hintergrund (dein Urlaubsfoto, kommt noch), neue Spielfigur **Stephan**, die man in dieser Welt **ausschließlich** spielt (wie die erzwungene Figur in der Plüschwelt).

---

## 0. Das Besondere an dieser Welt (Kurzfazit)

Zwei Dinge machen sie anders als alle bisherigen 18 Welten:

1. **Echter Foto-Hintergrund statt prozeduraler Kulisse.** Bislang zeichnet die Engine jede Kulisse mit Canvas-Code (Verläufe, Formen). Diese Welt nutzt **dein reales Urlaubsbild** als gemalten Hintergrund. Das ist technisch „ein bisschen anders" und der Kern der Welt — deshalb bekommt die Bild-Integration ein eigenes, sauberes Paket.
2. **Fester Charakter „Stephan".** Beim Betreten wird die normale Lea/Fiona-Auswahl **überschrieben** — man ist immer Stephan. Genau das Prinzip, das die Plüschwelt schon nutzt (dort wird die Spielfigur theme-abhängig als Kuscheltier gezeichnet, unabhängig von der Charakterwahl).

Der Rest der Welt (Gegner, Hindernisse, Sammelobjekte, Level-Aufbau, Musik, Farbstimmung) wird **passend zum Bild** gestaltet — hochwertig und stimmig, nicht „Standard-Level mit Foto dahinter".

---

## 1. Was ich von dir brauche (Voraussetzungen)

Damit die Welt wirklich hochwertig wird, brauche ich von dir:

1. **Das Urlaubs-Hintergrundbild** — am besten in guter Auflösung (mind. ~1600 px breit; Querformat). Ideal: eine Version **ohne** Menschen/Text im Vordergrund, damit die Spielfläche frei bleibt. Wenn es ein Panorama ist (sehr breit), umso besser — dann kann der Hintergrund über das ganze Level scrollen.
2. **Was zeigt das Bild?** Strand & Meer? Berge? Stadt/Städtereise? Pool/Hotel? See? Das bestimmt die Mechaniken und Gegner (siehe §5). *Ich plane unten eine konkrete Strand-/Meer-Variante als Arbeitsannahme — passe ich sofort an, sobald ich das echte Bild sehe.*
3. **Stephan-Figur:** Zwei Wege (§4) — entweder du lieferst ein Foto/Bild von „Stephan" (dann baue ich daraus einen Sprite), oder ich zeichne einen stilisierten Stephan (Urlauber-Look: Sonnenhut, Hemd, Kamera) prozedural im Spielstil. Sag mir, was dir lieber ist.

Sobald das Bild da ist, verankere ich es **pixelgenau** als Kulisse — du sollst genau dein Bild sehen.

---

## 2. Thema & Setting (Arbeitsannahme: „Ferien am Meer")

**Arbeitstitel:** „Stephans Urlaub" · Untertitel: „Endlich Ferien!" (beides frei anpassbar).

Die Welt ist die **Belohnungs-/Bonuswelt am Ende** — hell, sonnig, entspannt, aber mit genug Herausforderung, dass sie das hochwertige Finale der Reise ist. Ton: heiter, sommerlich, ein Augenzwinkern (Stephan macht Urlaub, nachdem er die ganze Stadt-Welt überstanden hat).

Die Dramaturgie nutzt den Foto-Hintergrund als **ruhige, schöne Bühne**, vor der sich eine liebevoll gebaute, spielbare Vordergrund-Ebene erhebt (Strandpromenade, Steg, Sandbank, Felsen, Hotelterrasse — je nach Bild).

---

## 3. Warum das grafisch anspruchsvoll ist (und wie wir es lösen)

Ein Foto als Spielhintergrund sieht schnell „billig" aus, wenn die gezeichnete Spielfläche und das Foto nicht zusammenpassen. Deshalb drei Qualitäts-Regeln, die ich fest einbaue:

- **Ein gemeinsamer Farb-Grade** legt sich über Foto UND Spielfläche, damit beide wie aus einem Guss wirken (warmes Sommerlicht). Genau der Mechanismus, den wir gerade in der Stadt für den Noir-Look genutzt haben (`WORLD_GRADE`, `drawSceneGrade`).
- **Tiefen-Staffelung:** Das Foto liegt ganz hinten (leichter, langsamer Parallax), davor kommen 1–2 gezeichnete Zwischenebenen (z. B. Palmen, Wellen, Steg-Pfähle), die schneller scrollen → echte Tiefe statt „Bild + Figur davor".
- **Vordergrund-Elemente** (Sonnenschirme, Strandkörbe, Möwen) schieben sich teils vor die Figur — das verankert das Foto als Teil einer 3D-Bühne (dasselbe Occluder-Prinzip wie die Vordergrund-Kabel der Stadt).

---

## 4. Die Figur „Stephan" (fest erzwungen)

**Verhalten:** Beim Betreten von Welt 19 wird immer Stephan gespielt — egal, ob im Profil Lea oder Fiona gewählt ist. Beim Verlassen ist alles wieder normal. Technisch ist das eine **theme-abhängige Sprite-Überschreibung** im Player-Renderpfad (dort, wo heute schon zwischen Lea/Fiona und den Plüsch-Formen entschieden wird). Kein Eingriff in die Speicher-/Profillogik → risikoarm.

**Zwei Wege für das Aussehen (deine Wahl):**

- **A) Foto-Sprite (wie Lea/Fiona/Panda/Elefant/Berater):** Du lieferst ein Bild von „Stephan"; ich schneide es frei, baue eine kleine Frame-Serie (Idle/Laufen/Springen/Ducken) und lege sie als `assets/stephanSprites.ts` (base64) an — exakt die Pipeline der bestehenden Figuren. Ergebnis: „echter" Stephan im Spiel. *Für flüssiges Laufen bräuchte es mehrere Pose-Frames — ich kann aus einem Einzelbild eine brauchbare Animation ableiten, mehrere Fotos sind aber besser.*
- **B) Stilisierter Stephan (gezeichnet):** Ich zeichne Stephan prozedural im Spielstil als sommerlichen Urlauber (Sonnenhut, Hemd, kurze Hose, Kamera um den Hals, Sonnenbrille). Voll animiert, keine Assets nötig, sofort verfügbar.

*Empfehlung:* Mit **B) starten** (sofort spielbar), optional später auf **A)** upgraden, wenn du ein gutes Stephan-Foto hast. So blockiert die Figur den Baustart nicht.

---

## 5. Was inhaltlich reinpasst (Mechaniken, Gegner, Objekte)

Passend zu „Ferien am Meer" — hochwertig und thematisch stimmig (bei anderem Bild tausche ich die Sets entsprechend):

**Gelände & Bewegungs-Elemente**
- Sandbänke & Holzstege (begehbar), **Sonnenliegen als wippende Plattformen**, **Sprungtuch/Trampolin** (nutzt die vorhandene Trampolin-Mechanik), **Luftmatratzen** treiben als bewegliche Plattformen auf dem Wasser.
- **Wasser als Gefahr/Element:** tiefes Meer = nicht reinfallen (nutzt die Wasser-Hazard-Mechanik), Wellen, die rhythmisch an den Strand schwappen (Timing-Passagen).
- **Strandball** als Schwung-/Hüpf-Objekt, **Palmen** zum Dahinter-Verschwinden (Tiefe).

**Gegner (knuffig, kindgerecht)**
- **Krabben** (laufen seitlich wie Goombas), **Möwen** (fliegen Bögen, klauen Pommes — wie die Stadt-Ratten/Eulen), **Quallen** (schweben, blockieren), **Sandflöhe** (kleine Hüpfer), optional ein **Sonnenschirm, der wütend wird** (Augenzwinkern).
- **Optionaler Boss (skippbar, fair wie in der Stadt):** eine **Riesen-Krabbe** oder **Sandburg-Golem** am Ende. Erreichbar ohne Kampf, für Mutige ein Extra.

**Sammel- & Belohnungsobjekte (Urlaubs-Flair)**
- Standard-Münzen als **Muscheln/Eiscreme-Kugeln**, die 3 Sonder-Sammelobjekte (wie in jeder Welt) als **Postkarte / Sonnenhut / Cocktail**.
- Power-Ups aus dem Bestand thematisch umlackiert (Herz, Stern, Magnet, Umhang, Schild) — z. B. **Schwimmflügel = Doppelsprung**, **Schnorchel = kurzzeitig tauchen**.

**Wetter/Atmosphäre (aus dem Stadt-Werkzeugkasten wiederverwendet)**
- Sonnen-Glitzern auf dem Wasser, ziehende Wölkchen, Möwen am Himmel, flimmernde Hitze — dieselben Bausteine wie Regen/Twinkle/Nebel, nur sommerlich. Optional ein **Effekt-Regler** wie in der Stadt.

---

## 6. Level-Aufbau (dramaturgischer Bogen)

Vorschlag für einen runden, hochwertigen Ablauf (Breite ~200+ Tiles, wie die großen Welten):

1. **Ankunft** (Promenade/Steg): sanfter Einstieg, Stephan wird vorgestellt („Endlich Urlaub!"-Schild), erste Münzen/Muscheln, eine harmlose Krabbe.
2. **Strandabschnitt:** Wellen-Timing, Sonnenliegen-Plattformen, erste Möwe, erstes Sonder-Sammelobjekt.
3. **Wasser-Passage:** Luftmatratzen über tiefem Meer, Quallen, Schnorchel-Power-Up, Checkpoint.
4. **Felsen/Steg-Kletterei:** vertikaler Abschnitt mit Schwingseilen (Tarzan-Mechanik vorhanden), zweites Sonder-Sammelobjekt.
5. **Finale (Hotelterrasse/Leuchtturm):** optionaler Boss + Ziel-Flagge, drittes Sonder-Sammelobjekt, Sonnenuntergangs-Stimmung.

Checkpoint in der Mitte, 3 Sonder-Sammelobjekte, faire Sprünge — alles wie im etablierten Standard, damit Progression/Sterne/Album automatisch funktionieren.

---

## 7. Technische Registrierungs-Checkliste (damit die Welt „einfach da" ist)

Die Engine ist voll datengetrieben — eine neue Welt braucht saubere Einträge an genau diesen Stellen (aus der Stadt-Arbeit bekannt):

- `constants.ts`: neues Theme `vacation` in die `ThemeName`-Union + `THEME_NAMES`.
- `levels/vacation.ts` (NEU): `createVacationLevel()` (Tiles, Gegner, Objekte, Schilder, Checkpoint, Sonder-Münzen).
- `level.ts`: Import + `{ id: 19, name: '…', subtitle: '…', theme: 'vacation', create: createVacationLevel }` **ans Ende** von `LEVELS`.
- `gfx/grade.ts`: `WORLD_GRADE.vacation` (warmes Sommerlicht).
- `renderer/effects.ts`: `SCENE_TINTS.vacation` + `VIG.vacation` (Vignette).
- `renderer.ts` `getThemeAccent()`: `vacation`-Fall (Rim/Schatten/Glint in warmem Sonnenlicht).
- `renderer/tiles.ts`: `TOP_RIM.vacation` + Strand-/Steg-Tiles (Sand/Holz).
- `renderer/backgrounds.ts`: `drawVacationBackground` (Foto-Blit + Parallax-Ebenen) + Registrierung.
- `audio.ts`: `THEMES.vacation` (sommerliche Melodie) + evtl. neue SFX (Möwe, Welle).
- `game.tsx`: `themeBadge.vacation` + `themePreview.vacation` (Icon/Farbe in der Welt-Auswahl).
- Player-Renderpfad: `vacation` → immer Stephan-Sprite (Charakter-Override).
- `assets/vacationBg.ts` (NEU): dein Bild als base64-`data:`-URL (komprimiert).
- optional `assets/stephanSprites.ts` (NEU, Weg A).
- `tools/level-guards.mts`: neue Gegner in die Walker-Listen, damit die QA-Guards sauber bleiben.

Das **Freischalt-/Sterne-/Album-System ist komplett datengetrieben** (`LEVELS.length`), d. h. Welt 19 erscheint und schaltet automatisch frei — kein Sonder-Code nötig (haben wir bei der Stadt so bestätigt).

---

## 8. Paket-Aufteilung (viele, saubere Pakete — Vorschlag)

Jedes Paket ist einzeln baubar, testbar (tsc/pipeline/level-guards + RAF-Soak + Screenshots) und wird als eigenes Bundle ausgeliefert — wie gewohnt.

| # | Paket | Inhalt | Abhängig von | Aufwand |
|---|---|---|---|---|
| **W1** | **Gerüst & Registrierung** | Theme `vacation`, leeres spielbares Level, alle Registrierungs-Stellen, Platzhalter-Hintergrund | — | M |
| **W2** | **Stephan-Figur (erzwungen)** | Charakter-Override im Player-Renderpfad, Stephan-Sprite (Weg B gezeichnet, oder A aus Foto) | W1 | M |
| **W3** | **Foto-Hintergrund einbinden** | Dein Bild als Asset (komprimiert), `drawVacationBackground` mit korrektem Zuschnitt/Scroll | W1 + **dein Bild** | M |
| **W4** | **Tiefen-Parallax & Grade** | 1–2 gezeichnete Zwischenebenen + Vordergrund-Occluder, gemeinsamer Sommer-Grade/Accent/Vignette | W3 | M |
| **W5** | **Gelände & Boden-Tiles** | Sand-/Holz-/Fels-Tiles, Kontaktschatten, begehbare Hügel, Steg | W1 | M |
| **W6** | **Wasser & Bewegungs-Elemente** | Wasser-Hazard, Wellen-Timing, Luftmatratzen/Sonnenliegen als Plattformen, Trampolin-Sprungtuch | W5 | M |
| **W7** | **Gegner-Set** | Krabbe, Möwe, Qualle, Sandfloh (je voller Pipeline: Klasse→Spawn→Step→Kollision→Render), Nachtlicht/Rim wie Stadt-Gegner | W1 | L |
| **W8** | **Sammelobjekte & Power-Up-Skins** | Muscheln/Eis als Münzen, 3 Sonder-Objekte (Postkarte/Hut/Cocktail), Schnorchel/Schwimmflügel-Skins | W1 | M |
| **W9** | **Atmosphäre-Effekte** | Wasser-Glitzern, Möwen, Wölkchen, Hitzeflimmern (+ optional Effekt-Regler), Low-End-Gating | W4 | M |
| **W10** | **Level-Design & Dramaturgie** | Der komplette Level-Bogen aus §6, Checkpoint, Schilder, Balancing | W5–W8 | L |
| **W11** | **Optionaler Boss (skippbar)** | Riesen-Krabbe/Sandburg-Golem, faire Arena, erreichbares Ziel ohne Kampf | W7, W10 | L |
| **W12** | **Audio** | Sommer-Melodie (`THEMES.vacation`) + SFX (Möwe, Welle, Sammel-Jingle) | W1 | M |
| **W13** | **QA-Feinschliff & Politur** | level-guards grün, Perf-Messung, Screenshot-Runde, Balancing nach Testlauf | alle | M |

**Empfohlene Reihenfolge:** W1 → W2 → (sobald Bild da: W3 → W4) → W5 → W6 → W7 → W8 → W9 → W10 → W11 → W12 → W13.
So ist nach W1/W2 sofort ein spielbarer Stephan da; sobald dein Bild eintrifft, kommt die echte Kulisse; danach wächst die Welt Paket für Paket zur hochwertigen Finale-Welt.

---

## 9. Offene Fragen / Entscheidungen (bitte kurz bestätigen)

1. **Setting:** Passt „Ferien am Meer/Strand" — oder zeigt dein Bild etwas anderes (Berge, Städtereise, Pool, See)? Dann richte ich Gegner/Mechaniken danach aus.
2. **Stephan:** Weg **A** (aus deinem Foto) oder Weg **B** (gezeichneter Urlauber-Stephan zum Sofort-Start)?
3. **Name/Untertitel:** „Stephans Urlaub — Endlich Ferien!" ok, oder anderer Titel?
4. **Boss:** optionalen Boss ja/nein (wie in der Stadt skippbar & fair)?
5. **Baustart:** Soll ich schon **W1 + W2** (Gerüst + spielbarer Stephan mit Platzhalter-Kulisse) bauen, während du das Bild schickst — oder erst nach deiner Freigabe des Konzepts komplett loslegen?

*Sobald du 1–5 beantwortest und das Bild schickst, setze ich die Pakete der Reihe nach um — jeweils getestet und als eigenes Bundle.*

---

## 10. Umsetzungs-Status
- **Assets erhalten & verarbeitet:** 15 Stephan-Frames (Fremd-Teile via Connected-Components entfernt, union-bbox-normalisiert, 157×176, pngquant → `assets/stephanSprites.ts`) + 3 nahtlose Panoramen (JPEG-komprimiert → `assets/vacationBg.ts`): 0 Alpen, 1 Tropen-Lagune, 2 Küstenstadt.
- **W1 Gerüst + W2 Stephan + W3 (erste Kulisse): ✅ umgesetzt** (Bundle `2026-08-10p`). Neues Theme `vacation`, spielbares Level 19 „Stephans Urlaub" ganz am Ende, **Stephan als erzwungener Charakter** (echter Sprite, überschreibt Lea/Fiona im Player-Renderpfad — wie Plüsch), **Alpen-Panorama** als nahtlos gekachelte Parallax-Kulisse. Voll registriert (constants/level/grade/audio/effects/accent/tiles/tiles-rim/game.tsx). QA: tsc 0, pipeline PASS, level-guards „Welt 19 sauber", RAF-Soak 0 Fehler (inkl. low). Bundle-Größe +450 KB.
- **Roadtrip-Idee bestätigt durch die Bilder:** Alpen → Tropen-Lagune → Küstenstadt. Nächste Pakete: Abschnitts-Wechsel der Kulisse (`vacationBgIndex`), Gegner-Set (Krabbe/Möwe/Qualle), Wasser-Passagen, Sammel-Skins, Boss, Audio-Feinschliff, Level-Design-Ausbau.

- **Roadtrip-Abschnitte: ✅ umgesetzt** (Bundle `2026-08-10t`). Level auf 270 Tiles verlängert, drei Abschnitte (A Alpen · B Tropen · C Küste) mit eigenem Gelände, Schildern, Power-Ups, Sammel-Beats, Checkpoint und je einer Sonder-Münze. Kulisse wechselt fortschritts-basiert und blendet an den Übergängen weich über; da die Panoramen keine Endlos-Kacheln sind, wird jede Szene über ihren Abschnitt geschwenkt (ganze Szene sichtbar, KEINE Naht). Lücken zeigen jetzt eine dunkle Erd-Tiefe statt hellem Himmel. QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", Soak 0 Fehler.

- **Gegner-Set + Wasser + Atmosphäre: ✅ umgesetzt** (Bundle `2026-08-10u`). Gegner je Abschnitt (bestehende Typen, keine neuen Pipelines): A Schafe/Goomba, B Krabbe/Möwe, C Krabbe/Schildkröte/Qualle. Wasser-Hazard in den Tropen-/Küsten-Lücken (waterHazard ist für vacation automatisch an), überquert per Steg; eine treibende Luftmatratze (bewegliche Plattform) als Bonus-Ritt über der Lagune. Atmosphäre-Overlay: Sonnen-Glitzern (additive Funken) + langsam gleitende Möwen im Himmel-Band, mit Effekt-Regler skalierbar und auf 'low' aus. QA: tsc 0, pipeline PASS, guards „Welt 19 sauber" (auch mit Wasser), Soak 0 Fehler.

- **Themen-Boden + breite Lagune: ✅ umgesetzt** (Bundle `2026-08-10v`). Boden je Abschnitt spaltenabhängig direkt gezeichnet (nicht gecacht): A Alpen-Fels + Grasnarbe, B Tropen-Sand, C Küsten-Holzsteg (Planken) — passt jeweils zum Panorama. Neue BREITE Lagune in B (Wasser [127,139]), die man nur über drei treibende, bobbende Luftmatratzen (vertikale Plattformen, „Wellen") quert, geführt von einer Münz-Spur; schmale Priele weiter per Steg. Gegner/Power-Ups auf festem Boden gehalten. QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", Soak 0 Fehler.

- **Übergänge inszeniert + Luftmatratzen-Look: ✅ umgesetzt** (Bundle `2026-08-10w`). Kulissen-Überblendung liegt jetzt EXAKT an den Level-Übergängen (Boden-Lücken col 90 & 180, nahe den Schildern) statt an gleichmäßigen Dritteln; jede Szene wird über ihre echten Abschnitts-Spalten geschwenkt. „Reise"-Effekt: während des Wechsels flitzt der Sportwagen mit Speed-Lines über die Straße. Die beweglichen Plattformen werden im vacation-Theme als bunte aufblasbare Luftmatratzen (gelb/pink/blau, abgerundet, mit Tuben & Glanz) gezeichnet statt als Holzfloß. QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", Soak 0 Fehler.

- **Sammel-Skins + Tiefen-Ebene: ✅ umgesetzt** (Bundle `2026-08-10x`). Münzen werden im vacation-Theme als Jakobsmuscheln gezeichnet (drehen wie eine Münze); die drei Sonder-Sammelobjekte als Postkarte (Slot 0) / Sonnenhut (1) / Cocktail (2) mit Glanz-Halo. Tiefe: dunkle Palmwedel-Cluster als Vordergrund-Occluder in den oberen Ecken (nur ab Tropen/Küste, colC≥84), leichtes Wiegen, auf 'low'/Regler-0 aus. QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", Soak 0 Fehler. Dateien: `renderer/items.ts`, `engine_internal/render.ts`.

- **Palmwedel-Feinschliff + Sonnenschirme, Sommer-Grade & Wasser-Glitzern: ✅ umgesetzt** (Bundle `2026-08-10z`). **#2 Grafik:** Palmwedel bekommen eine weiche Halo-Unterlage (gefälschte Unschärfe — Safari-sicher, kein Blur-Filter), Farb-/Breiten-Parameter und per-Fieder-Längen/Winkel-Variation über `seed`; der Cluster mischt jetzt dunkle (vorne) und hellere (dahinter) Wedel mit zwei versetzten Wiege-Phasen → lebendigeres, weicheres Blätterdach. Neu: **Strandschirme** als Mittelgrund-Deko am Sandstrand (nur Tropen/Küste), leicht parallax-versetzt (P=0.6) HINTER der Spielfläche, an der Bodenlinie verankert, gestaffelte Größen/Farben (gestreiftes Kuppel-Dach mit sackendem Zacken-Saum, Mast, Bodenschatten). **#3 Grafik:** wärmeres Sommer-Grade (`WORLD_GRADE.vacation` a 0.06→0.11 + Overlay 0.08→0.15, `SCENE_TINTS.vacation` a 0.10→0.14 / kräftigeres Gold) — Foto + Spielfläche sitzen unter EINEM goldenen Licht; **Glitzern auf der Lagunen-Wasseroberfläche** (zuckende, warme Funken je sichtbarer WATER_TOP-Spalte, additiv über die Wasser-Tiles, deterministisch, auf 'low'/Regler-0 aus). QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", RAF-Soak 0 Fehler, **Deploy-Simulation aus Baseline 618bb0b + Bundle baut sauber (6100 KB)**. Dateien: `gfx/grade.ts`, `renderer/effects.ts`, `renderer/backgrounds.ts`, `engine_internal/render.ts`.

- **Sonnenschirm-Belebung: ✅ umgesetzt** (Bundle `2026-08-10aa`). Die Strandschirm-Plätze wirken jetzt belebt: vor einigen Schirmen ein **gestreifter Liegestuhl** (Holzrahmen + zurückgelehnte Bespannung), vor anderen ein **flach liegendes Strandhandtuch** (gestreiftes Parallelogramm in Aufsicht). Ganz vereinzelt sitzt eine **Möwe auf dem Schirm-Knauf** (weißer Körper, grauer Rücken, gelber Schnabel) mit dezentem Idle — sanftes Kopf-Wippen und seltenes Flügel-Lüften, rein zeit-basiert/deterministisch. Deko-Zuordnung je Schirm über `d` (0/1/2) und `b` (Vogel) in `VACATION_UMBRELLAS`; alles Mittelgrund hinter der Spielfläche, an der Bodenlinie verankert, auf 'low'/Regler-0 aus. QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", RAF-Soak 0 Fehler, **Deploy-Sim aus Baseline 618bb0b baut sauber (6103 KB)**. Datei: `renderer/backgrounds.ts`.

- **Lagune-Balancing-Testlauf + Fix: ✅ umgesetzt** (Bundle `2026-08-10ab`). Automatischer Auto-Pilot-Durchlauf (deterministisches `testStep`, echte Physik) über viele Matratzen-Phasen deckte auf, dass die ALTE Lagune mistuned war: die drei Matratzen lagen 1-3 Kacheln ÜBER dem Ufer, 4 Kacheln auseinander und vertikal DESYNCHRON — ein einfach nach rechts laufender Spieler ertrank schon am ersten Schritt, nur Sprinten kam ~2/3 der Phasen durch. Analyse der Mechanik: Matratzen sind solide Kästen, die Carry greift nur beim Landen von OBEN (Schild sagt „Hüpf über die Luftmatratzen"). **Fix:** drei 3 Kacheln breite Matratzen mit nur je 1 Kachel Lücke (128-130 · 132-134 · 136-138; Ufer-Lücken col 127 & 139 ebenfalls 1 Kachel), Oberkante KNAPP UNTER Uferhöhe (row ~16.5) statt darüber → jeder Sprung landet sauber absteigend auf der Oberseite; sie wippen GEMEINSAM (gleiche Phase/Tempo/Amplitude 0.5) → vorhersehbare, stets gleiche Landehöhen. Alle Lücken = 1 Kachel, tief im Sprung-Envelope (Sprunghöhe ~3.5 Kacheln, Weite ~4-9). Verifikation: Screenshots bei mehreren Wippen-Phasen zeigen eine saubere, gleich hohe Steinchen-Reihe knapp unter dem Ufer; Plattform-Höhen messtechnisch koplanar (alle row 16.46 im selben Frame). QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", RAF-Soak 0 Fehler, Deploy-Sim baut sauber (6103 KB). Hinweis: die naiven Fixed-Timing-Auto-Piloten sind KEIN verlässliches Bestehen-Orakel für Feinsprünge (menschliches Timing schlägt sie) — die Fairness folgt aus Geometrie + Envelope, nicht aus Bot-Erfolg. Datei: `levels/vacation.ts`.

- **Durchgehendes 6-Kachel-Panorama (nahtlos) statt 3-Szenen-Crossfade: ✅ umgesetzt** (Bundle `bundle-zzzzz-welt19-panorama-final`). Der User hat neue, bewusst nahtlos gebaute Hintergründe geliefert: 6 Kacheln `Level_Hintergrund_01..06`, ALLE exakt 1373×191 (Nr. 3 war 190 → auf 191 normalisiert), die ZUSAMMEN EIN durchgehendes Bild ergeben (Alpen → grüne Hügel/Wasserfall → Tropen-Lagune → Küstenstadt). Pixel-Check: Horizont/Himmel laufen durch, keine echten Brüche (hohe Roh-Kanten-Diffs 34-72 kommen nur von Bäumen/Bergen genau an den Schnittstellen, nicht von Farb-/Horizont-Sprüngen — visuell bestätigt). NEU `assets/vacationBg.ts`: 6 JPEG-Kacheln (q88, ~560 KB gesamt), gleiche Größe. Renderer: `vacationBgFrames` von 3 auf 6, `drawVacationBackground` komplett umgebaut — statt 3-Abschnitt-Crossfade (b1/b2/lf0-2 + „Reise"-Sportwagen, alles entfernt) werden die 6 Kacheln jetzt KANTE-AN-KANTE nebeneinandergelegt und als EINE Einheit über den Level-Fortschritt (prog = camera.x/span) durchgescrollt (panX = -(panoW-VW)·prog, +1 px Überlappung gegen Haarlinien). Keine Überblendung, keine sichtbare Naht mehr. Umbrellas/Atmosphäre/Palmen-Vordergrund/Wasser-Glitzern bleiben. QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", RAF-Soak 0 Fehler, Screenshots über den ganzen Level (Start Alpen / Mitte Lagune / Ende Küstenstadt) — durchgehend & scharf. Deploy-Sim byte-identisch (Bundle komplett, 53 Dateien). `vacationBg.ts`-Blob = c9f5d1ee96056edbf25b1e1ad048c5c060224393. Dateien: `assets/vacationBg.ts`, `renderer.ts`, `renderer/backgrounds.ts`.

- **Boden an durchgehendes Panorama angeglichen: ✅ umgesetzt** (Bundle `bundle-zzzzz-welt19-boden-final`). Nach dem Panorama-Umbau lag der Sand-Boden noch ab col 91 unter dem grauen Wasserfall (Fehlpass). Fix in `drawVacationGroundColumn`: Abschnitts-Grenzen an die Panorama-Übergänge ausgerichtet — Alpen-Fels bis ~col 126 (unter Bergen/Wasserfall), Tropen-Sand ~126-215 (unter Lagune/Tropen), Küsten-Holz ab ~col 216 (unter der Terrakotta-Stadt). Farben zusätzlich angeglichen: Alpen sattere Grasnarbe (#3d7a33/#57993f), Tropen hellerer sonniger Sand (#eed9a2→#d4b476, Top #f6e9ba), Küste wärmeres Ambra-Holz (#b47c3e→#7d5320, wärmerer Glanz/Top). Ergebnis (Screenshots): Fels+Grasnarbe unter Wasserfall, heller Sand unter Tropen-Lagune, warmes Holz unter Küstenstadt — Boden liest sich überall als natürliche Fortsetzung der Kulisse. QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", RAF-Soak 0 Fehler, Deploy-Sim byte-identisch. `tiles.ts`-Blob = 62bca1c3e9065a9eef16d047e8c9b54d03cde5ef. Datei: `renderer/tiles.ts`.

- **Weiche Boden-Übergänge (#2) + Parallax-Messbefund (#1): teils umgesetzt** (Bundle `bundle-zzzzz-welt19-bodenblend-final`). #2: `drawVacationGroundColumn` in `drawVacSectionMaterial` ausgelagert; an beiden Materialgrenzen (col 126 Fels→Sand, col 216 Sand→Holz) wird über ±3 Spalten das Nachbar-Material per smoothstep-Alpha überblendet, plus Hash-Jitter für eine organisch „verzahnte" statt schnurgeraden Kante. Screenshot bestätigt weichen Fels→Sand-Verlauf. #1 Parallax: GEMESSEN — Panorama scrollt aktuell mit Faktor 1,9 (fast doppelt so schnell wie der Boden = umgekehrter Parallax), weil das 43:1-Durchgehend-Panorama bei voller Bildhöhe über den ganzen Level von Alpen bis Küste schwenken muss. Echtes „langsamer als Boden" ist nur durch Verkleinern des Panoramas (Himmelstreifen oben) erreichbar: Vorschau mit Höhenanteil 0.58 → Faktor 1,07 (ruhig, ~mit dem Boden), aber Kulisse in der unteren Hälfte. Optik-Entscheidung an den User delegiert (Vollbild vs. Tiefe+Himmel). Full-bleed bleibt vorerst Auslieferungsstand. QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", Deploy-Sim byte-identisch. Datei: `renderer/tiles.ts` (#2).

- **Boden als echter WEG (statt abstrakter Kachelfläche): ✅ umgesetzt** (Bundle `bundle-zzzzz-welt19-weg-final`). User-Feedback: Vollbild-Panorama bleibt (bevorzugt), aber der alte Boden „passt überhaupt nicht / komplett schrecklich". Ursache: die ganze hohe Bodenwand bekam überall dieselbe Material-Textur + wiederholte Alpen-Risse → wirkte wie ein abstraktes Band. Fix: `drawVacSectionMaterial` ist jetzt TIEFEN-abhängig (`depth = row - groundRow`). depth 0 = begehbare Weg-Oberfläche, depth>0 = Erdreich/Unterbau, das mit der Tiefe dunkler wird und zurücktritt. Pro Abschnitt: Alpen = Kies-/Erd-Bergpfad (warmer Kies, Grasrand + Halme oben, Kiesel), Tropen = heller Sandweg (Körnung + angewehter Kamm), Küste = Holzsteg (Planken-Maserung, Quernaht, versetzte Längsnaht, Nägel) über dunklem Pfosten-Unterbau. Grenzen-Verzahnung (#2) bleibt aktiv. Screenshots: alle drei lesen sich jetzt als richtiger Weg vor der Kulisse. Vollbild-Parallax (Faktor 1,9) bewusst beibehalten (User mag den Vollbild-Look; Tiefen-Variante mit Himmelstreifen wurde verworfen). QA: tsc 0, pipeline PASS, guards „Welt 19 sauber", Deploy-Sim byte-identisch. `tiles.ts`-Blob = a579cf5df8b91253182807328d00e379d3630b40. Datei: `renderer/tiles.ts`.
