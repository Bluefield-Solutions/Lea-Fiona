# Komplett-Audit „Lea und Fiona im Abenteuerland" — alle 19 Welten

**Datum:** 2026-08-21 · **Methode:** automatisierter Durchlauf aller Level (Konsolen-/Absturz-Prüfung, Todes-Loop-Erkennung, Boden-/Grubenanalyse, Vollständigkeits-Bot) + visuelle Sichtung eines Frames pro Welt.

## Gesamturteil

**Das Spiel ist in einem sehr guten, stabilen Zustand.** Über alle 19 Welten:

- **0 Konsolen-/Page-Fehler** — kein einziger Laufzeitfehler, kein Absturz.
- **0 unerwartete Todes-Loops** — keine Welt tötet die Figur unkontrolliert (keine „unsichtbaren Fallen").
- **Grafisch sauber & stimmig** — jede Welt hat einen eigenen, konsistenten Look ohne sichtbare Glitches in den geprüften Frames.
- **Welt 19 (Urlaub)** fügt sich nach den letzten Fixes nahtlos ein (durchgehender Boden, keine unsichtbaren Gruben mehr).

Kurz: Es wurden **keine echten Fehler** gefunden. Die Punkte unten sind reine **Optimierungs-/Aufräum-Chancen**, kein Muss.

## Stabilitäts-Matrix (Auszug)

| Welt | Thema | Konsolenfehler | Todes-Loops | Grafik-Frame |
|---|---|---|---|---|
| 1–19 | alle | **0** | **0** | sauber |

(Der Vollständigkeits-Bot erreichte bei 5 Welten die Flagge; bei den plattform-/vertikallastigen Welten scheiterte **der Bot**, nicht das Level — erkennbar an `Todesfälle = 0` überall, d. h. er blieb hängen statt zu sterben. Das ist eine Grenze des simplen Test-Bots, kein Level-Bug.)

## Optimierungs-Chancen (nach Nutzen sortiert)

**1. Ladegröße / Performance (mittlerer Nutzen).**
Der Standalone-Build ist ~6,9 MB. Größter Einzelposten: `assets/vacationBg.ts` mit **1,03 MB** (die 4 Küstenfotos als JPEG). Durch etwas stärkere Kompression/kleinere Auflösung der Urlaubsbilder lassen sich grob **0,3–0,5 MB** sparen → schnellerer Erststart, v. a. als iPhone-PWA. Die Figuren-Sprites sind mit je 0,1–0,35 MB unkritisch.

**2. Automatischer „Durchspielbar bis Flagge"-Wächter (Prozess-Nutzen).**
Aktuell gibt es keinen Bot, der jede Welt **von Start bis Flagge** verlässlich durchspielt. Genau so ein Wächter hätte den früheren Welt-19-Grubenbug (Figur fällt in unsichtbares Loch) automatisch gefangen. Empfehlung: einen plattform-tauglichen Vollständigkeits-Check bauen (One-Way-/Moving-Plattformen und vertikale Sprünge berücksichtigen) und ins QA-Gate aufnehmen.

**3. Interne Level-Namen aufräumen (niedrige Priorität, nicht spielersichtbar).**
Die im Level-Code hinterlegten `name`-Strings sind uneinheitlich und teils falsch nummeriert: doppelte „World 2" (Höhle/Plüsch), doppelte „World 12" (Turnen/Superfly), „World 16: Drachenhöhle" (ist Welt 17), Tippfehler „Hoehle" statt „Höhle", gemischte Formate. **Wichtig:** Der Spieler sieht diese nicht — Intro-Karte und HUD nutzen die saubere Menü-Liste (`LEVELS[].name` + „Welt 1–19"). Es ist reine Code-Hygiene für spätere Wartung.

**4. Kleine visuelle Feinheiten in Welt 19 (optional, Geschmack).**
- Vordergrund-Deko (Muscheln/Gras) wird im Post-Layer gezeichnet und liegt dadurch minimal VOR der Figur, wenn sie exakt darauf steht — unkritisch, ließe sich für korrekte Tiefe in einen Pre-Entity-Pass verschieben.
- Ferne Deko-Möwen am Himmel sind Geschmackssache (per Flag `VAC_DECO_BIRDS` abschaltbar).

## Empfehlung

Substantiell ist eigentlich nur **Punkt 1 (Bildgröße)** und langfristig **Punkt 2 (Vollständigkeits-Wächter)**. Punkte 3–4 sind Kosmetik. Das Spiel selbst braucht keine Fehlerbehebung — es läuft über alle 19 Welten stabil und sieht durchgängig hochwertig aus.
