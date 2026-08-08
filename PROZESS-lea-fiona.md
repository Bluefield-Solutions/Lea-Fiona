# Prozess — Lea und Fiona

Fester, bewährter Ablauf pro Änderung. Ziel: minimal-invasiv, sicher, im Browser beurteilbar, jederzeit restlos rollback-fähig.

## Iterations-Schleife
1. **1 Ziel pro Iteration.** Klein, klar, abschließbar. Antworten so paketieren, dass ein Paket in ein Antwort-Tokenbudget passt.
2. **`view-before-edit`.** Vor jeder Änderung die betroffene Stelle ansehen (Zeilennummern verschieben sich nach Edits → neu ansehen).
3. **Additiv & gekapselt.** Geteilte Dateien nur über theme-spezifische Zweige (`currentTheme==='bluefield'`) erweitern. Andere Welten/Themes nie berühren.
4. **`git diff`-Review.** Nur beabsichtigte Zeilen geändert.
5. **Pipeline (zwingend):** `tsc 0` → `build ✓` → `Autarkie 0` → `pipeline-check PASS` → `level-guards 0 WARN`.
6. **Logik-Test nur falls nötig** (Headless-`.mts`, danach löschen). tsx-Tests sind oft falsch-positiv → Einzelfall-Debug vor Bug-Meldung.
7. **HTML bauen + `present_files`** (Name `Lea-und-Fiona.html` gleich, damit Spielstände bleiben) — bei JEDER Iteration, nie nur Code/Diff.
8. **User-Urteil im Browser:** 👍 = `git add -A && git commit && git tag vN` · 👎 = `git checkout -- .` (sofortiger, restloser Rollback).

## Antwortstruktur (Deutsch)
1. Management Summary · 2. Detaildarstellung · 3. Fazit/Empfehlung · 4. Konkrete nächste Schritte (als tappbare `ask_user_input_v0`-Optionen).

## Feste Liefer-Regel (zwingend, jede Anpassung)
- **(a) Immer testbares HTML.** Am Ende JEDER Anpassung ein vollständiges, autarkes `Lea-und-Fiona.html` bauen und per `present_files` bereitstellen — auch wenn schon geliefert. Nie nur Code/Diff. User testet ausschließlich über diese HTML im Browser.
- **(b) Immer genau 4 tappbare nächste Schritte** (`ask_user_input_v0`) mit dem größten Nutzerwert. Claude denkt dabei proaktiv mit, was sich **ausbauen, optimieren, erweitern** lässt — Ziel ist ein **perfektes Jump'n'Run in Optik, Gameplay UND Engine**, nicht nur Detailfragen zur laufenden Aufgabe.

## Grenzen
- Keine Engine-Hacks — Ausnahme: kleine, gekapselte Feel-/Mechanik-Features **mit User-OK** (z. B. Ship-it-Dash).
- Balance-relevante Mechaniken bewusst konservativ (Cooldowns, moderate Werte), damit bestehende Level-Designs sicher bleiben.
- Kein Guard/Check ausliefern, der viele Fehlalarme produziert (z. B. groundRowOf-Falle) — er zerstört das „0 WARN"-Signal.

## Git-Sicherheitsnetz
Baseline v259. Jede akzeptierte Iteration = Commit + Tag. Rückkehr zu jedem Punkt via `git checkout vN`.
