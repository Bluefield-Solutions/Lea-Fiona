# Anforderungskatalog — Lea und Fiona

Status: ✅ fertig · 🔶 teilweise/offen · ⬜ geplant/Idee. Stand v324.

## 1. Spielkern (Engine)
- ✅ Eigene Canvas-Engine (kein Phaser), 60 fps, iPhone-Querformat + Browser.
- ✅ Physik: Lauf/Sprint, Sprung, Coyote-Time, Slopes/Smooth-Hills, Wall-Slide, Ground-Pound.
- ✅ 13 Welten mit Struktur-QS, Gegner-KI/Stomp, Schadensmodell.
- ✅ Power-Ups: Feuer, Cape, Schild, Super, Stern, Magnet, Uhr, Herz/1UP.
- ✅ **Ship-it-Dash** (neue Fähigkeit, E/Touch-», Cooldown, Afterimage).
- ⬜ Boss-Gegner, Zeit-Challenge/Bestzeiten, weiteres Power-Up.

## 2. Startbildschirm
- ✅ Level **sofort klickbar** (kein Lock-Flash/keine Verzögerung).
- ✅ **Zwei-Schritt-Flow:** Figur wählen (ohne Vorauswahl, ein Klick) → Level-Auswahl; „Figur ändern".
- ✅ Zentrale, prominente Figuren-Auswahl (Bühne/Podest/Namensschild, animierte Sprites).
- ✅ Coole Figuren-Moves (laufen+hüpfen / Idle-Wippen), hüpfende Lauf-Figuren unten.
- ✅ Professionelleres Design: Tagline-Badge, Hintergrund-Tiefe (Spotlight/Vignette), interaktive Level-Karten (Hover-Lift), aufgewertete Top-Bar (Avatar-Initiale).
- ✅ Kompaktes iPhone-quer-Layout (kein großer fixer Titel; Level-Screen ohne Titel).

## 3. Retention / Feedback
- ✅ Abschluss-Screen: **3 Wertungs-Sterne** (Ideen / Ohne Treffer / Tempo), pro Kriterium, alle Welten.
- ✅ **Bestwert** + pulsierendes **„Neuer Rekord!"** (vs. vorheriger Bestwert), alle Welten.
- ⬜ Optional: echte **Bestzeit** pro Level (neu zu tracken).

## 4. Welt 13 „Blaue Wiese" (Bluefield-Firmenlevel)
### Optik
- ✅ Durchgehende blaue Wiese ohne sichtbare Erde (Ebene==Hügel), warmer Hügel-Verlauf, Shimmer-frei.
- ✅ Himmel mit Tiefe (Wolken, Parallax-Hügel, God-Rays/Bloom).
### Marke & Erklärung
- ✅ Vier-Stationen-Bogen (Hypothese→Prototyp→Markttest→Live).
- ✅ „Proben unter Glas" (U1/MatchSuite/GKV je Reifegrad).
- ✅ Terminal-Schilder (`//`-Stil) + Terminal-Boot-Intro.
- ✅ Erklär-Panels: Intro, 3 Produkte, Werte, Prozess-Stationen.
- ✅ Ambiente-Mono-Marker im Himmel (probe 00, standort, server_de/dsgvo, 100% de, schleuse).
### Gegner (Theming)
- ✅ „Bug" (Goomba), „Legacy-System" (Koopa), „schlechte Idee" (Bombe).
### Power-Ups (Theming)
- ✅ Namen (PROTOTYP/SKALIERUNG/DSGVO-SCHILD/GO-LIVE), DSGVO-Schild-Item optisch.
- 🔶 Weitere Power-Up-Items optisch (Prototyp/Skalierung/GO-LIVE) — optional.
### Spielfigur
- ✅ **Berater-Figur** immer in Welt 13 (statt Lea/Fiona), 12-Frame-animiert.
- 🔶 Feinschliff (Größe/Offset/Lauf-Frame-Auswahl) nach Browser-Urteil.
### B2B-Conversion
- ✅ Premium-Siegscreen mit klickbarem CTA → /labor.
- ✅ Autarker Funnel (bluefield_start/golive/cta_click).
- ✅ Geheimraum „Serverhalle DE".

## 5. Technische Nicht-Funktionale Anforderungen
- ✅ **Autarkie**: Standalone-HTML ohne externe Referenzen (alle Assets inline/Base64).
- ✅ Spielstände via localStorage (gleicher HTML-Name bei Auslieferung).
- ✅ Guards/Pipeline-Check als Qualitäts-Gate (0 WARN).
- ✅ Reduced-Motion respektiert (Startbildschirm-Runner).

## 6. Release-Checkliste
- ⬜ DEV-Freischaltung `settings.unlockAllWorlds` zurücksetzen.
- ⬜ Finaler Balance-/Difficulty-Pass nach echtem Spieltest.
- ⬜ Optional: Bestzeit, Boss, weitere Welt-13-Vertiefung.

## UPDATE v347 — neue/erweiterte Features
- ✅ **Ship-it-Dash bricht Gegner durch** (alle Welten, immun: Bosse/zähe Typen).
- ✅ **Bestzeit pro Level** (Profil-`bestTimes`, Abschluss-Anzeige + „NEUE BESTZEIT"-Badge).
- ✅ **Stampf-Boss** (3× von oben, HP-Pips, Patrouille) als Welt-13-Endgegner.
- ✅ **Boss verpflichtend**: Flagge erst nach Boss-Sieg; Arena-Kulisse; Sieg-Sequenz.
- ✅ **Welt 13 = Bluefield-Produktreise**: 4 Sektionen (Willkommen/U1/MatchSuite/GKV) mit eigenem Look, Schleusentüren + Durchgangseffekt, Portal + Ideen-Baum, Onboarding, weiße U1-Welt mit Produktclaim, Blueprint-MatchSuite, neblige GKV-Welt.
- ✅ Power-Up-Reskins Welt 13: Prototyp-Kolben, Skalierungs-Chart, GO-LIVE-Deploy.
- 🔶 Optional: Boden pro Welt einfärben; sichtbare Barriere-Wand; Türdurchgangs-Sound; Boss-Angriffe/Phasen.
