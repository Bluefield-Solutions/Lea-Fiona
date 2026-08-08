# Roadmap: „Lea und Fiona" auf echtes Super-Mario-Gefühl bringen

Konzeptioneller Plan. Recherchebasiert (kanonische Platformer-/Mario-
Quellen) und gegen den aktuellen Code gespiegelt. Noch keine
Implementierung — das ist die Entscheidungsgrundlage.

---

## 0. Was das Spiel HEUTE schon richtig macht

Damit klar ist, worauf wir aufbauen (nicht neu erfinden):

- **Sub-Step-Kollision** gegen Tunneling (`physics.ts`, X-dann-Y getrennt —
  exakt der von Maddy Thorson / „Guide to 2D Platformers" empfohlene Ansatz).
- **Coyote-Time** (8 Frames) und **Jump-Buffer** (8 Frames).
- **Variable Jump** (16 Frames) mit **drei Gravitationsstufen**
  (Aufstieg 0.48 / Fall 0.72 / Apex 0.22) — d. h. „Apex-Hangtime" ist da.
- **Skid-Deceleration** (`SKID_DECEL_MULT = 2.0`) — das schnellere
  Abbremsen/Drehen, das SMB sein knackiges Gefühl gibt.
- Getrennte **Geh- (3.5) / Renn-Geschwindigkeit (7.5)** mit eigener
  Renn-Beschleunigung; **P-Meter-Sprungboost** (Momentum→Sprunghöhe, 1.20×).
- **Wall-Slide/-Jump**, **Ground-Pound**, **Run-Slide**, **Eis-Friction**.
- **Note-/Donut-/Invisible-Blocks** und **P-Switch** (Brick↔Coin) sind
  bereits als Tile-Typen vorhanden.

Fazit: Die Bewegungsphysik ist näher an SMB3/SMW als an einem Hobby-Klon.
Die spürbare Lücke liegt weniger in der Physik als in **Kollisions-
Forgiveness, Kamera und „Juice"**.

---

## Phasen-Übersicht (nach Effekt/Aufwand sortiert)

| Phase | Thema | Effekt | Aufwand | Risiko |
|------|-------|--------|---------|--------|
| 1 | Game-Feel-Juice | sehr hoch | klein–mittel | niedrig |
| 2 | Kollisions-Fairness | hoch | klein–mittel | niedrig |
| 3 | Kamera wie Mario | hoch | mittel | mittel |
| 4 | Terrain & Level-Tools | mittel–hoch | mittel–hoch | mittel |
| 5 | Mechanik-Tiefe | mittel | mittel | mittel |

Empfehlung: in dieser Reihenfolge. Phase 1+2 verändern das Gefühl sofort
und am stärksten pro investierter Stunde.

---

## Phase 1 — Game-Feel-Juice (höchster Effekt pro Aufwand)

Keine neuen Mechaniken, nur „Wucht". Quellen sind sich einig: das ist der
größte Hebel.

**1.1 Hit-Stop / Freeze-Frames.** Bei Stomp, Schaden, Block-Hit das
Spiel für 2–4 Frames einfrieren. Gibt dem Gehirn Zeit, den Treffer zu
registrieren — „der Schlag trifft Knochen statt Luft". Winziger Eingriff
(globaler Frame-Skip-Zähler in der Game-Loop), riesige Wirkung. **Der
einzelne lohnendste Punkt der ganzen Roadmap.**

**1.2 Squash & Stretch.** Spieler-Sprite beim Absprung vertikal strecken,
bei der Landung stauchen. Kommuniziert Schwerkraft und Elastizität.
Erfordert Sprite-Skalierung im Renderer (kein neues Art-Asset).

**1.3 Landungs-Staub & Impact-Partikel.** Kleine Staubwolke bei jeder
nennenswerten Landung, dickerer Burst bei Ground-Pound. Partikelsystem
existiert bereits — nur neue Trigger.

**1.4 Coin-/Score-Politur.** Münzen mit kleinem Bogen-„Pop" beim
Einsammeln; Combo-Zahlen größer/farbiger eskalieren. Floating-Text-System
ist da.

---

## Phase 2 — Kollisions-Fairness (Mario-Forgiveness)

Die unsichtbaren Korrekturen, die Mario „fair" machen. Spieler merken sie
nie — sie fühlen sich nur „gut" an.

**2.1 Bumped-Head-Correction.** Springt der Spieler nach oben und klippt
nur 1–2 px an einer Deckenecke, statt abzubremsen seitlich wegschubsen,
damit er die Lücke schafft. (Heute gibt es nur `autoStep` für Boden-Nähte.)

**2.2 Corner-Correction beim Landen.** Triff der Spieler die Kante einer
Plattform knapp, nicht abstürzen lassen — minimal auf die Oberfläche
nudgen. Standard-Mario-„Ledge-Magnetism".

**2.3 Hitbox schmaler als Sprite.** Kanonischer Trick: Kollisions-Box
etwas kleiner als die Grafik → fairer („lieber nicht getroffen werden,
wenn man hätte, als umgekehrt"). Reines Tuning.

**2.4 Fix M3 (aus dem Review).** Mehrfach-Tile-Kollision soll die
nächstgelegene Spalte wählen, nicht die entfernteste.

---

## Phase 3 — Kamera wie Mario

Aktuell: einfaches Smooth-Follow mit Lookahead, ohne Dead-Zone, vertikal
immer mitziehend. Das ist der größte einzelne „liest sich nicht wie Mario"-
Faktor.

**3.1 Vertikales Platform-Snapping.** Kernregel aus SMW/Yoshi's Island:
Die Kamera folgt der Spieler-Höhe — **außer während eines Sprungs**, da
bewegt sie sich NICHT nach oben mit; beim Landen auf einer Plattform
snappt sie auf deren Höhe. Verhindert, dass man bei hohen Sprüngen den
Boden (und Gruben/Stacheln) aus dem Blick verliert. Hoher Effekt.

**3.2 Horizontales Kamera-Fenster (Dead-Zone) + Vorausblick.** Kleine
Links/Rechts-Bewegungen bewegen die Kamera nicht (ruhiges Bild für
Mikro-Justierung an Kanten). Beim Vorwärtslaufen Spieler leicht
außermittig nach hinten halten → mehr Sicht nach vorn. SMW nutzt zwei
Anker mit Schwelle, bevor die Richtung umschlägt.

**3.3 Optional: Rückwärts-Scroll-Lock** (SMB1-Stil) pro Level
konfigurierbar — für Vorwärtsdruck/Tempo-Level.

---

## Phase 4 — Terrain & Level-Tools

Erweitert, was Leveldesign überhaupt ausdrücken kann.

**4.1 One-Way-/Semisolid-Plattformen (Durchsprung).** Von unten
durchspringbar, von oben begehbar; per „Runter+Sprung" hindurchfallen.
Kern-Mario-Tool, das dem Leveldesign sofort Tiefe gibt. Neuer Tile-Typ +
Sonderfall in der Y-Kollision.

**4.2 Slopes (Schrägen).** Der größte Terrain-Gewinn — aber der
aufwändigste Punkt. Kanonischer Ansatz: Slopes als „nicht-solide"
Sondertiles, die in einem Post-Processing-Schritt nach der X/Y-Auflösung
behandelt werden (Höhenkarte pro Tile, Spieler auf die Schräge setzen
statt hinein). Erst 45°, später flachere Varianten. Eigene Phase wert.

**4.3 Autoscroll-Level (optional).** Kamera-getriebenes Tempo (à la SMW
„Butter Bridge") als Level-Modus — nutzt das vorhandene Moving-Platform-
System.

---

## Phase 5 — Mechanik-Tiefe (später / optional)

**5.1 Tragen & Werfen von Panzern/Items.** Koopa-Panzer aufheben, tragen,
werfen (heute nur kicken). Klassische SMB-Tiefe; auch Basis für
Werf-Power-ups.

**5.2 Unterwasser-Schwimmphysik.** Prüfen, ob das Unterwasser-Level echte
Schwimmmechanik hat (Auftrieb, Schwimmstoß, gedämpfte Gravitation) oder
nur optisch ist — echtes Mario hat hier eigene Physik.

**5.3 Power-up-Reserve (SMW-Box).** Ein Reserve-Power-up speichern und auf
Tastendruck abrufen.

---

## Empfohlener Startpunkt

**Phase 1 (Juice) zuerst, dann Phase 2 (Fairness).** Begründung: maximaler
spürbarer Sprung im „Gefühl" bei kleinem, risikoarmem Eingriff, ohne neue
Mechaniken oder Level-Datenänderungen. Danach Kamera (Phase 3), weil sie
die Wahrnehmung am stärksten „mario-isiert". Terrain/Slopes (Phase 4) als
größerer, eigenständiger Block, wenn das Fundament sitzt.

## Quellen (Auswahl)

- „The Guide to Implementing 2D Platformers" (higherorderfun.com) —
  Hitbox/Kollision/Slopes/One-Way.
- SMB-Sub-Pixel-/Beschleunigungsmodell (TASVideos, SDA Knowledge Base).
- SMW-Kamera-Analysen (kurovadis; gamedesignskills; nesdev-Forum zu
  Platform-Snapping).
- Game-Feel/Juice: Hit-Stop, Squash & Stretch, Corner-Correction
  (diverse Game-Feel-Artikel).
- Kollisions-Forgiveness: Kyle Pulver (Ledge Forgiveness / Nudging),
  Maddy Thorson (Celeste/TowerFall-Physik).
