# Auftrag: Neues Urlaubs-Panorama für Welt 19 „Stephans Urlaub" (fotorealistisch, aber perfekt)

Du erzeugst den **scrollenden Hintergrund** für ein Jump-’n’-Run-Kinderspiel. Die Kulisse
läuft horizontal HINTER der Spielfläche durch; der Spieler und der gezeichnete Weg liegen
davor. Der aktuelle Hintergrund wird **ersetzt**, weil er drei Probleme hat, die du zwingend
vermeiden musst:

1. **Sichtbare Nähte** zwischen den Teilbildern (weil sie einzeln erzeugt wurden).
2. **Zu überladen/unruhig** — zu viele Details, lenkt vom Spiel ab.
3. **Beißt sich mit dem Spiel-Look** — zu harte, kontrastreiche Foto-Optik im Vordergrund.

Ziel: EIN durchgehendes, **nahtloses**, ruhiges, fotorealistisch-weiches Panorama mit
**einheitlichem Horizont** und **konstanter Bodenkante**.

---

## 1. Wichtigste Regel (Ursache der alten Nähte — nicht verhandelbar)
Erzeuge **EIN einziges, durchgehendes Panorama** und schneide es ERST DANACH in 6 gleiche
Teile. **Erzeuge die 6 Kacheln NICHT einzeln.** Nur so passt die rechte Kante jeder Kachel
pixelgenau auf die linke Kante der nächsten. Praktisch: als eine sehr breite Leinwand
(Outpainting/Panorama in einem Stück) generieren → dann in 6 exakt gleich breite Streifen
schneiden.

## 2. Harte technische Vorgaben
- **Gesamtbild:** ein durchgehendes Panorama, Seitenverhältnis **43,13 : 1** (sehr breit,
  niedrig). Zielauflösung des Gesamtbildes: **8238 × 191 px** (bei höherer Render-Auflösung
  bitte ein Vielfaches, z. B. 32952 × 764, danach sauber auf 8238 × 191 herunterskalieren).
- **6 Teilbilder:** exakt **1373 × 191 px** je Kachel, in Reihenfolge 1–6 von links nach
  rechts. Alle exakt gleich groß.
- **Format:** **PNG, verlustfrei, sRGB.** KEIN JPEG (JPEG-Artefakte zerstören die Nähte).
- **Ein einziges Licht/Tageszeit über die GESAMTE Breite:** warmes, weiches Spätvormittags-
  Sommerlicht, Sonne konstant aus derselben Richtung, gleicher Weißabgleich und gleiche
  Helligkeit von ganz links bis ganz rechts (keine Helligkeits-/Farbsprünge).
- **Horizontlinie auf konstanter Höhe** über die gesamte Breite (±2 px), ungefähr bei
  55–60 % der Höhe von oben.
- **Untere ~18 % = ruhige, gleichmäßige Bodenzone** (Wiese/Sand/Ufer) auf **konstanter Höhe**
  über die ganze Breite, sehr detailarm und flach — das Spiel legt hier seinen eigenen Weg
  darüber und schneidet diese Zone teils ab. KEINE wichtigen Motive, KEINE Menschen, KEINE
  Straße, KEINE Objekte im vordersten Bodenstreifen.

## 3. Bildstil (behebt „unruhig" + „beißt sich mit dem Look")
- Fotorealistisch, aber **ruhig, weich und leicht matt** — wie ein sanft unscharfer,
  atmosphärischer Hintergrund, der ZURÜCKTRITT (Tiefenschärfe: Ferne leicht diesig/soft).
- **Reduzierte Detaildichte**, viel ruhige Fläche. **Obere ~40 % = offener Himmel** mit
  wenigen weichen Schönwetter-Wölkchen (Negativraum, damit HUD/Spiel darüber lesbar bleibt).
- Warme, **leicht entsättigte, harmonische Sommerpalette** (kein grelles Kontrast-Feuerwerk).
- Sanfte Luftperspektive für Tiefe; Mittelgrund ruhig halten.

## 4. Bildinhalt — eine zusammenhängende Sommer-Reise (links → rechts)
Ein durchgehender „Roadtrip"-Verlauf, der **weich und stufenlos** ineinander übergeht
(keine harten Szenenschnitte!). Jede Region **schlicht und ikonisch**, nicht vollgestopft:
1. **Alpen:** ruhige, verschneite Berggipfel hinter einem stillen Bergsee, sanfte grüne
   Wiesen. (KEIN Auto, KEine Straße.)
2. **Alpen-Vorland:** sanftere grüne Hügel, vereinzelte Nadelbäume, ein kleiner See.
3. **Grüne Hügel mit Wasserfall:** ein dezenter Wasserfall in der Ferne, bewaldete Hänge —
   sparsam, nicht felsüberladen.
4. **Tropische Lagune:** türkisfarbenes flaches Meer, ein paar Palmen-Silhouetten, heller
   Sandstrand — luftig, wenig Objekte.
5. **Küste/Hafen in der Ferne:** ein ruhiger Küstenort als sanfte Silhouette am Horizont,
   ein paar Segelboote auf dem Wasser — schlicht, KEINE dichte Häuserfront, KEINE Ruinen.

Übergänge zwischen den Regionen fließend über Farbe/Vegetation, sodass man beim Scrollen
keine Grenze bemerkt. Ganz links und ganz rechts müssen NICHT zusammenpassen (es ist kein
Loop), aber die **inneren Kanten der 6 Streifen müssen nahtlos** sein.

## 5. Strikt verboten
Kein Text, keine Logos/Wasserzeichen, keine Figuren/Menschen/Tiere im Vordergrund, keine
UI-Elemente, keine Rahmen/Ränder, keine Vignette, keine sichtbaren Bildkanten, keine großen
Objekte im vordersten Bodenstreifen.

## 6. Abnahme-Checkliste — VOR der Auslieferung selbst prüfen (nur liefern, wenn ALLES ✓)
1. **Nahtlosigkeit:** Die 6 Streifen wieder zu 8238 × 191 zusammensetzen und jede der
   **5 inneren Nähte** prüfen — mittlere Pixel-Differenz der aneinandergrenzenden
   Randspalten **< 8 / 255**, visuell unsichtbar. (Der alte Satz lag bei 34–73 — das ist
   ausdrücklich der Fehler, der behoben werden muss.)
2. **Horizont** liegt über die gesamte Breite auf gleicher Höhe (±2 px), keine „Treppe".
3. **Belichtung/Farbe** durchgehend konstant — kein Helligkeits- oder Weißabgleich-Sprung an
   den Schnittstellen.
4. **Bodenzone** unten auf konstanter Höhe, ruhig, ohne Vordergrund-Objekte/Menschen/Text.
5. **Maße exakt:** je Kachel 1373 × 191 px, PNG, sRGB.
6. **Komposition ruhig:** obere ~40 % überwiegend offener Himmel; keine überladenen Bereiche.
7. Wenn ein Punkt nicht erfüllt ist: **neu erzeugen**, nicht ausliefern.

## 7. Lieferung
Die 6 PNG-Streifen in korrekter Reihenfolge (1–6) benennen, z. B.
`Level_Hintergrund_01.png` … `Level_Hintergrund_06.png`, jeweils exakt 1373 × 191 px.
Zusätzlich einmal das zusammengesetzte Gesamtbild (8238 × 191 PNG) als Nahtnachweis beilegen.
