# UX-Audit & Verbesserungskonzept — „Lea und Fiona im Abenteuerland"

**Datum:** 2026-08-23 · **Geprüfter Stand:** Live-Build `202608230122` (= aktueller HEAD) · **Methode:** automatisierte Klick-/Tap-Messung (Größe, Sichtbarkeit, Überdeckung via `elementFromPoint`) + Screenshots über 5 Geräteformate (Desktop 1280×800, Tablet quer 1024×768, Tablet hoch 768×1024, Handy quer 844×390, Handy hoch 390×844).

---

## 1. Ampel-Zusammenfassung

| Bereich | Status | Kernaussage |
|---|---|---|
| Figurenauswahl klickbar | 🟢 gut | Große Pillen (≈150×84 px), sauber tappbar (quer/Desktop). |
| Levelauswahl | 🟡 ok, verbesserbar | Karten groß & klar; aber „Alle Level" trotz Sperre verwirrend; wenig Scroll-Hinweis. |
| Buttons / Tap-Größen | 🔴 Handlungsbedarf | HUD-Icons nur 38 px, „Mathe"-Schalter 23 px, „Figur ändern" 28 px — für Kinderfinger zu klein. |
| Platzierung / Überlagerung | 🔴 Bug | HUD-Leiste verdeckt das Quick-Settings-Zahnrad; doppelte Profil-/Einstellungen-Einstiege. |
| Responsive | 🟡 ok, ein Punkt | Titel/Quiz/Level sauber; aber Tablet-Hochformat wird unnötig gesperrt („Bitte drehen"). |
| Kind-Tauglichkeit / Potenzial | 🟢 Basis stark, ausbaubar | Klare Ideen für mehr Rückmeldung, Belohnung und ggf. eine Jungen-Figur. |

Kurz: Das Spiel ist grafisch und strukturell auf einem sehr guten Stand. Die wichtigsten offenen Punkte sind **zu kleine Tap-Ziele** und eine **überlappende/redundante obere Leiste** — beides gut behebbar.

---

## 2. Befunde im Detail

### 2.1 Platzierung & Überlagerung (🔴 echter Bug)
- Der **immer sichtbare HUD-Cluster** oben rechts (👤 Profil · 🏅 Album · ⚙ Einstellungen · 🔊 Ton · ⛶ Vollbild, `z-index 30`) wird **auch auf Titel- und Levelauswahl** gezeigt, obwohl er eigentlich fürs laufende Spiel gedacht ist.
- Er liegt **über** der titel-eigenen Kopfleiste und **verdeckt das Quick-Settings-Zahnrad** → dieses ist praktisch nicht klickbar (Messung: „VERDECKT"; im Zoom sieht man das Zahnrad hinter dem 👤-Button hervorlugen).
- **Doppelte Einstiege:** Profil öffnet sich über die Titel-Pille „Lea" **und** über HUD-👤; Einstellungen über HUD-⚙ **und** über das (verdeckte) Quick-Settings-Zahnrad. Das ist redundant und verwirrend.

### 2.2 Tap-Größen (🔴 wichtig für Kinder)
Empfehlung für Kinderhände: **mind. 44 px, besser 48 px** in beiden Achsen. Gemessen:

| Element | Größe | Bewertung |
|---|---|---|
| HUD-Icons (Profil/Album/Einstellungen/Ton/Vollbild) | 38 × 38 px | zu klein |
| „🧮 Mathe"-Schalter (Levelauswahl) | 87 × 23 px | deutlich zu niedrig |
| „Figur ändern" | 113 × 28 px | zu niedrig |
| Modus „Alle Level / Kampagne" | ≈125 × 31 px | grenzwertig |
| Level-Karten | 91 × 92 px | 🟢 gut |
| Figuren-Pillen (Fiona/Lea) | ≈150 × 84 px | 🟢 gut |
| Quiz-Ziffern & „Committen" | ausreichend | 🟢 gut (früher gefixt) |

### 2.3 Responsive (🟡)
- **Titel, Quiz (zweispaltig im Querformat) und Levelauswahl** sind über alle geprüften Formate sauber — keine abgeschnittenen oder überlaufenden Inhalte.
- **Tablet im Hochformat (768×1024):** Es erscheint die **„Bitte drehen"-Sperre**, die das ganze Bild blockiert. Auf Tablets ist Hochformat aber gut spielbar — die Sperre sollte nur für **kleine Handys** greifen.
- **Handy quer:** Das Level-Grid zeigt ~1 Reihe, der Rest ist per Scrollen erreichbar (funktioniert), aber es fehlt ein sichtbarer **Scroll-Hinweis**.

### 2.4 Levelauswahl (🟡)
- Positiv: große Karten, klarer „Gesperrt"-Zustand mit Schloss, Sterne und Best-Score/Münzen sichtbar, aktuelle Welt farbig hervorgehoben.
- **Widerspruch:** Im Modus **„Alle Level"** sind bei aktivem **Mathe-Modus** trotzdem alle Level außer 1 **„Gesperrt"** (weil der Mathe-Modus die Freischaltung steuert). Das Label „Alle Level" verspricht etwas, das der Mathe-Modus nicht zulässt → verwirrend.
- Deko-Lauffiguren am unteren Rand **überlappen** leicht das Grid bzw. den Hinweis „Tippe ein Level zum Starten".

### 2.5 Figurenauswahl (🟢)
- Gut klickbar und klar. (Im Hochformat blockiert die Dreh-Sperre die Auswahl — siehe 2.3.)

---

## 3. Umsetzungskonzept (priorisiert)

### P1 — Schnell & wirkungsvoll (empfohlen zuerst)

**P1.1 Obere Leiste entwirren (behebt den Überlappungs-Bug)**
- Auf **Titel & Levelauswahl** den spielinternen HUD-Cluster **nicht** zeigen (nur im Spiel/Pause). Stattdessen genau **eine** klare Kopfleiste:
  - links: Profil-Pille „Lea" (öffnet Profile)
  - rechts: **ein** Zahnrad = Einstellungen (öffnet ein Panel, das Ton/Vollbild/Album/Optionen bündelt)
- Ergebnis: kein verdecktes Zahnrad mehr, keine doppelten Einstiege, ruhigeres Bild.

**P1.2 Tap-Ziele vergrößern (kindgerecht)**
- HUD-/Icon-Buttons **38 → 48 px**.
- „Mathe"-Schalter, „Figur ändern", Modus-Umschalter auf **mind. 44 px Höhe** (mehr Padding), Schriften minimal größer.
- Reines CSS/Style — geringer Aufwand, großer Effekt für Kinder.

**P1.3 Dreh-Sperre nur für kleine Handys**
- Bedingung ändern: „Bitte drehen" nur, wenn **die kürzere Kante < ~480 px** ist (echte Handys). Tablets im Hochformat dürfen spielen.

### P2 — Klarheit & Feedback

**P2.1 „Alle Level"-Widerspruch auflösen (Mathe-Modus)**
- Variante A: Bei aktivem Mathe-Modus den Modus-Umschalter „Alle Level/Kampagne" **ausblenden** und einen kurzen Hinweis zeigen („Im Mathe-Modus schaltest du Level nacheinander frei").
- Variante B: „Alle Level" im Mathe-Modus **deaktiviert** darstellen mit Tooltip.
- Empfehlung: **A** (weniger Elemente, klarer).

**P2.2 Tipp-/Klick-Feedback**
- Kurzer, dezenter Klick-Sound + kleiner Druck-Effekt bei **allen** Menü-Buttons (nicht nur Quiz), sobald der Ton aktiv ist. Gibt Kindern klare Rückmeldung.

**P2.3 Scroll-Hinweis im Level-Grid (Handy quer)**
- Weicher Verlauf am unteren Rand + kleiner Pfeil „mehr Level ↓", damit klar ist, dass es weitergeht.

### P3 — Potenzial / Ausbau

**P3.1 Fortschritt sichtbarer machen**
- Gesamt-Sterne + „nächstes Ziel" prominenter (kleine Fortschrittsleiste), damit Kinder ein greifbares Ziel haben.

**P3.2 Deko-Lauffiguren im Level-Grid zähmen**
- Auf der Levelauswahl die bodennahen Lauffiguren ausblenden oder hinter das Grid legen, damit sie den Hinweis/Karten nicht überlappen.

**P3.3 Optionale Jungen-Figur (bitte kurz bestätigen)**
- Falls mit „ob dem Jungen Potenzial gibt" gemeint ist, dass auch ein **Junge** spielbar sein soll: Das Figur-System ist bereits datengetrieben (Sprite-Sheet + Zahlenraum je Figur) — eine dritte, männliche Figur ließe sich sauber ergänzen (eigene Lauf-Grafik nötig). Das würde die Zielgruppe verbreitern.
- *Hinweis: Diese Interpretation ist unsicher — bitte bestätige, ob eine Jungen-Figur gewünscht ist; dann plane ich Grafik + Einbau konkret.*

---

## 4. Empfohlene Reihenfolge

1. **P1.1 + P1.2 + P1.3** (obere Leiste, Tap-Größen, Dreh-Sperre) — ein kompaktes Paket, hoher Nutzen, geringes Risiko.
2. **P2.1 + P2.2** (Mathe-Modus-Klarheit, Klick-Feedback).
3. **P2.3 / P3.1 / P3.2** (Politur).
4. **P3.3** nach Rückfrage (Jungen-Figur).

Alle Punkte sind reine Frontend-Änderungen an bestehenden Komponenten (kein Umbau der Spiel-Engine) und über die etablierte QA-Kette (tsc, Pipeline, Reachability, Soak, Screenshot-Gegencheck) absicherbar.
