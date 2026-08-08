# HANDOVER — Lea und Fiona (Stand v357)

> Einstiegs-Dokument für einen neuen Chat. Lies zusätzlich: `SKILL-lea-fiona-development.md` (Workflow), `MEMO-bluefield-level.md` (Welt 13), `ARCHITEKTUR-WISSEN.md` (Code-Landkarte + Lektionen), `ANFORDERUNGSKATALOG.md` (Feature-Status), `PROZESS-lea-fiona.md`, `CHANGELOG.md`.

## Wer & Was
**Stephan Domke** (GF Bluefield IT Solutions GmbH, Marke #1E48D6, Unterhaching) entwickelt privat das Browser-Jump'n'Run **„Lea und Fiona im Abenteuerland"** (React + TS + Vite, **eigene Canvas-Engine, KEIN Phaser**). 13 Welten; **Welt 13 „Die blaue Wiese"** ist ein Bluefield-Firmenlevel (B2B-Marketing/Lead-Instrument). Zielplattform: **iPhone Querformat** + Browser.

- Projekt: `/home/claude/lea-fiona` · Outputs: `/mnt/user-data/outputs`
- Git: sauber, **HEAD = v357**, 80 Tags (v259–v357). Jede akzeptierte Iteration = Commit + Tag.

## Zusammenarbeit (zwingend)
- **Deutsch**, knapp. Struktur je Antwort: 1. Management Summary · 2. Detaildarstellung · 3. Fazit · 4. tappbare `ask_user_input_v0`-Optionen.
- **Pakete so schneiden, dass jedes in ein Antwort-Tokenbudget passt** und vollständig lieferbar ist.
- Optik/Feel **einzeln** liefern → User urteilt im Browser (👍 commit+Tag · 👎 `git checkout -- .`).
- Geteilte Renderer nur **additiv** über `currentTheme==='bluefield'`-Zweige; andere Welten nie berühren.

## Liefer-Pipeline (pro Iteration)
```bash
cd /home/claude/lea-fiona
npx tsc 2>&1 | grep -vE "baseUrl|ignoreDeprecations|Visit https|migration information|Cannot find type definition" | grep -ciE "error"   # 0
npm run build:standalone 2>&1 | tail -1                                    # ✓ built
grep -cE 'src="https?://|href="https?://|@import|fetch\("http' dist-standalone/index.html   # 0 (Autarkie)
node tools/pipeline-check.mjs 2>&1 | grep ERGEBNIS                          # PASS
npx tsx tools/level-guards.mts 2>&1 | grep SUMME                           # 0 WARN, 4 INFO
cp dist-standalone/index.html /mnt/user-data/outputs/Lea-und-Fiona.html
rm -f /mnt/user-data/outputs/lea-und-fiona-v*-src.zip
zip -qr /mnt/user-data/outputs/lea-und-fiona-vNNN-src.zip . -x "node_modules/*" "dist/*" "dist-standalone/*" ".git/*"
# dann present_files (HTML + ZIP). Achtung: grep -c → Exit 1 bei 0 Treffern; Befehle mit ; statt && trennen.
```

## Aktueller Stand (v357) — kurz
Große Blöcke:
1. **Welt 13 = Bluefield-Produktreise** (v335–v347). Komplett umgebaut zu einer **4-Sektionen-Reise** (~284 Spalten, Vorbild Schul-Level, `BLUEFIELD_SECTION_BOUNDS=[71,142,213]`): ① **Willkommen** (blaue Wiese, Portal + Ideen-Baum mit reifenden Produkt-Symbolen, Onboarding-Text) → 🚪 → ② **U1-Optimierer** (WEISSE, vollflächige Kulisse: Rückhol-Terminal/Dashboards/Euro-Strom, Claim „Unser Produkt, der U1-Optimierer") → 🚪 → ③ **MatchSuite** (Blueprint-Look, Berater↔Projekt-Matching) → 🚪 → ④ **GKV-Vergleich** (neblig, „in Planung"). **Schleusentüren** an den Grenzen mit Vordergrund-Durchgangseffekt. **Endkampf**: Stampf-Boss (3× von oben), Flagge erst nach Boss-Sieg frei, Arena-Kulisse (Legacy-System-Server-Racks) + Sieg-Sequenz. Alle Sektions-Kulissen in `renderer/backgrounds.ts` (geclippt, additiv).
2. **Frühere Basis** (bis v324): Startbildschirm (Zwei-Schritt-Flow), Abschluss-Sterne/Bestwert, Bluefield-Grundsprache. **v325–v334**: Berater-Figur (Größe + 12-Frame-Fix), Ship-it-Dash bricht Gegner durch, Power-Up-Reskins (Prototyp-Kolben/Skalierungs-Chart/GO-LIVE), **Bestzeit pro Level**, Stampf-Boss.

## Offene / nächste Schritte
- **Welt-13-Reise-Feinschliff (optional):** Boden pro Sektion einfärben (Spielfläche passt zur Welt); sichtbare Barriere-Wand vor der Flagge (statt nur Flag-Sperre); Türdurchgangs-Sound; weitere Kulissen-Politur (MatchSuite/GKV-Dichte).
- **Gameplay:** Boss-Arena weiter (Wände/Phasen/Angriffe); echte Bestzeit-Anzeige auch in der Level-Auswahl.
- **Kopplung beachten:** Deko-Positionen in `backgrounds.ts` (drawProbe cols 100/175/231, Markttest-gaps 220/231/242, Sektions-Szenen, Türen 71/142/213, Boss-Arena col 277) sind an die Welt-13-Geometrie in `levels/bluefield.ts` gebunden — bei Geometrie-Änderungen mitziehen.
- **Vor Release:** DEV-Freischaltung `settings.unlockAllWorlds` zurücksetzen.

## Wichtigste Lektionen (Details in ARCHITEKTUR-WISSEN.md)
- **groundRowOf-Falle** (Untergrund-Räume) → für Hügel/Kopf-Checks `smoothGroundY` je Spalte; keine verrauschten Guards ausliefern.
- **Kopf-Hänger über Hügeln** → Blöcke relativ zur Hügel-Oberfläche anheben.
- **Autarkie**: Assets als Base64 inline (nie externe Dateien).
- **Player = 12-Frame-Artwork-Pipeline** (fiona/lea/berater), pro-Bild-Aspect, feet-anchored; Default rechts-gerichtet (`direction<0` spiegelt).

## Kopf-Hänger-Audit (Vorlage, hügel-bewusst, bei Bedarf)
Ad-hoc-`.mts`: je Spalte echte Oberfläche via `smoothGroundY`, dann solide Nicht-Einweg/Nicht-Röhre-Blöcke im Band `[surfRow-2.5, surfRow)` melden. Danach `rm -f *.mts`. (Kein permanenter Guard — zu verrauscht.)
