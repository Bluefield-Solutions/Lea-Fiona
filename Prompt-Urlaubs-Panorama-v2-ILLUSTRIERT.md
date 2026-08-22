# Auftrag: Urlaubs-Panorama für Welt 19 — ILLUSTRIERTE Variante (Kinderbuch-Stil)

Alternative zum fotorealistischen Prompt: gleiche Reise, gleiche Technik, aber als
**handgemalte, kinderbuchartige Illustration**, die zum gezeichneten Look des Spiels passt.
Der Hintergrund scrollt horizontal HINTER der Spielfläche; Figur und gezeichneter Weg liegen
davor. Er muss **nahtlos**, **ruhig** und **stilistisch stimmig** sein.

---

## 1. Wichtigste Regel (Nahtlosigkeit — nicht verhandelbar)
Erzeuge **EIN einziges, durchgehendes Panorama** und schneide es ERST DANACH in 6 gleiche
Teile. **Erzeuge die 6 Kacheln NICHT einzeln** — nur so passen die Kanten pixelgenau
aneinander. Als eine sehr breite Leinwand generieren → dann in 6 exakt gleich breite
Streifen schneiden.

## 2. Harte technische Vorgaben
- **Gesamtbild:** ein durchgehendes Panorama, Seitenverhältnis **43,13 : 1**. Ziel des
  Gesamtbildes: **8238 × 191 px** (höher rendern und sauber auf 8238 × 191 herunterskalieren
  ist ok).
- **6 Teilbilder:** exakt **1373 × 191 px** je Kachel, Reihenfolge 1–6 von links nach rechts,
  alle exakt gleich groß.
- **Format:** **PNG, verlustfrei, sRGB** (kein JPEG).
- **Ein einziges Licht/Tageszeit** über die gesamte Breite: freundliches, warmes Sommer-
  Tageslicht, konstant, keine Helligkeits-/Farbsprünge.
- **Horizontlinie auf konstanter Höhe** über die ganze Breite (±2 px), ca. 55–60 % von oben.
- **Untere ~18 % = ruhige, gleichmäßige Bodenzone** auf **konstanter Höhe**, sehr flach und
  detailarm (das Spiel legt seinen eigenen Weg darüber und schneidet die Zone teils ab).
  KEINE wichtigen Motive, KEINE Figuren, KEINE Objekte im vordersten Bodenstreifen.

## 3. Bildstil (Kinderbuch / Vektor-Illustration)
- **Handgemalte, kinderbuchartige 2D-Illustration** — weiche, saubere Formen, sanfte
  Farbverläufe, freundliche, warme Stimmung. Wie ein hochwertiges Bilderbuch / ein weicher
  Vektor-Look. **Keine** Fotorealistik, **keine** Fototextur, **kein** Bildrauschen.
- **Klare, einfache Silhouetten**, abgerundete Formen, gemütlich und heiter.
- **Reduzierte, harmonische Sommerpalette** (wenige, gut abgestimmte Farben pro Region).
- **Ruhig statt überladen:** obere ~40 % offener, weicher Himmel mit wenigen stilisierten
  Wölkchen (Negativraum für HUD/Spiel). Wenige, große, ruhige Formen statt vieler Kleinteile.
- Tiefe durch **gestaffelte, überlappende Ebenen** (fern heller/blasser, nah kräftiger) —
  wie gemalte Kulissen-Schichten, nicht durch fotografische Schärfentiefe.
- Stil und Kantensauberkeit über die gesamte Breite **einheitlich** (kein Stilwechsel).

## 4. Bildinhalt — eine zusammenhängende Sommer-Reise (links → rechts)
Durchgehender Verlauf, der **weich und stufenlos** ineinander übergeht (keine harten
Schnitte). Jede Region **schlicht und ikonisch**:
1. **Alpen:** freundliche, schneebedeckte Berggipfel hinter einem ruhigen Bergsee, grüne
   Wiesen. (Kein Auto, keine Straße.)
2. **Alpen-Vorland:** sanfte grüne Hügel, ein paar stilisierte Nadelbäume, kleiner See.
3. **Grüne Hügel mit kleinem Wasserfall** in der Ferne, bewaldete Hänge — sparsam.
4. **Tropische Lagune:** türkisfarbenes flaches Meer, ein paar Palmen-Silhouetten, heller
   Sandstrand — luftig.
5. **Küste in der Ferne:** ein ruhiger Küstenort als sanfte, freundliche Silhouette am
   Horizont, ein paar kleine Segelboote — schlicht, keine dichte Häuserfront.

Übergänge fließend über Farbe/Vegetation. Ganz links und rechts müssen NICHT zusammenpassen
(kein Loop), aber die **inneren Kanten der 6 Streifen müssen nahtlos** sein.

## 5. Strikt verboten
Kein Text, keine Logos/Wasserzeichen, keine Figuren/Menschen/Tiere im Vordergrund, keine
UI, keine Rahmen/Ränder/Vignette, keine sichtbaren Bildkanten, keine großen Objekte im
vordersten Bodenstreifen, keine Fototextur/kein Rauschen.

## 6. Abnahme-Checkliste — VOR der Auslieferung selbst prüfen (nur liefern, wenn ALLES ✓)
1. **Nahtlosigkeit:** 6 Streifen zu 8238 × 191 zusammensetzen, jede der **5 inneren Nähte**
   prüfen — mittlere Pixel-Differenz der Randspalten **< 8 / 255**, visuell unsichtbar.
2. **Horizont** über die gesamte Breite auf gleicher Höhe (±2 px).
3. **Farbe/Helligkeit** durchgehend konstant, kein Sprung an den Schnittstellen.
4. **Bodenzone** unten auf konstanter Höhe, ruhig, ohne Vordergrund-Objekte/Figuren/Text.
5. **Stil einheitlich** über die ganze Breite (Kinderbuch-Look, keine Fototextur).
6. **Maße exakt:** je Kachel 1373 × 191 px, PNG, sRGB.
7. Wenn ein Punkt nicht erfüllt ist: **neu erzeugen**, nicht ausliefern.

## 7. Lieferung
6 PNG-Streifen in Reihenfolge (`Level_Hintergrund_01.png` … `_06.png`), je exakt
1373 × 191 px, plus einmal das zusammengesetzte Gesamtbild (8238 × 191 PNG) als Nahtnachweis.
