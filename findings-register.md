# Findings-Register — „Lea und Fiona" Code-Review

Stand: Stabilisierungs-Sprint abgeschlossen. Verifikation: `tsc` ✓,
`npm run build` ✓, Level-Validator ✓ (10/10 sauber), Block-Validator ✓
(54/54 Spezialblöcke korrekt), Kill-Prädikat-Verifikation ✓ (87/87
Checks), Runtime-Smoke-Test ✓. Playwright steht noch aus (kein Chromium
in der Sandbox) — bitte einmal `npx playwright test` im Replit.

Legende: ✅ behoben · ⬜ offen · 🔎 Design-Entscheidung nötig

---

## HOCH

### H1 ✅ Totes Power-up in Level 3 (sky)
`heartBlocks "188,8"` lag auf einem leeren Tile ohne QUESTION_BLOCK in
Reichweite → Herz-Power-up erschien nie. Ursache: fehlender
`set(188, ground-5, Q)`-Aufruf (vier Geschwister-Herzen hatten ihn, der
fünfte nicht).
- **Fix:** Q-Block in `levels/sky.ts` ergänzt.
- **Verifiziert:** Block-Validator 53→54 korrekt, 0 tote Blöcke.

### H2 ✅ Kill-Eligibility-Duplikation
Drei handgepflegte instanceof-Listen (Star-/Shell-/Fireball-Kill) lagen
verstreut in `player_collisions.ts` und `collisions.ts` und konnten beim
Hinzufügen neuer Gegner auseinanderdriften.
- **Fix:** `isStarKillable` / `isShellKillable` / `isFireKillable` als
  zentrale Trait-Prädikate in `util/enemy-tags.ts` (neben den schon
  vorhandenen `isAoeKillable` / `isFreezable`). Alle drei Aufrufstellen
  umgebaut; `runShellCollisions` datengetrieben (Tabelle SHELL_TARGETS)
  statt langer if/else-Kette — verhaltenserhaltend.
- **Verifiziert:** 87/87 Membership-Checks identisch zum Originalverhalten.
- **🔎 Offene Design-Entscheidung (für Umbau):** Dokumentierte Asymmetrien
  bewusst beibehalten: Shell tötet KEINE schweren/Boss-Typen (Ape, Yeti,
  Knight, LavaSlime, MiniUFO, PiranhaPlant, Wizard, BanzaiBill,
  CharginChuck, BigBoo, Seagull, BombOmb); Fireball tötet KEINE
  PiranhaPlant/LavaSlime (Feuer-immun) und keinen Ghost (intangibel). Beim
  Ausbau entscheiden, ob diese Asymmetrien so bleiben sollen.

---

## MITTEL

### M1 ✅ `engine.start()` nicht idempotent / kein cancelAnimationFrame
Zweiter `start()`-Aufruf hätte eine zweite parallele Game-Loop erzeugt
(doppelte Sim-Geschwindigkeit). Latent (aktuell nur 1 Aufruf), aber
Footgun bei StrictMode/HMR/Resume.
- **Fix:** `start()` mit `if (this.running) return;` abgesichert; `rafId`
  gespeichert und in `stop()` via `cancelAnimationFrame` abgeräumt.

### M2 ✅ `runFlagCollision`: flagHeight kann negativ werden
Tief platzierte Flagge → `(height-2)*TILE - flagY` negativ → Trefferbox
kollabiert, Flagge unberührbar. Latent (heute alle Flaggen ok).
- **Fix:** `Math.max(TILE_SIZE, …)` als Untergrenze.

### M3 ⬜ physics.moveStep: Mehrfach-Tile-Kollision wählt falsche Spalte
Bei gleichzeitiger Kollision mit mehreren soliden Tiles gewinnt im Loop
die zuletzt iterierte (entfernteste) Spalte/Reihe statt der
nächstgelegenen. In schmalen Hitboxen unkritisch; in mehrkacheligen
Engstellen mögliches leichtes Einbetten/Durchrutschen.
- **Empfohlener Fix:** bei dx>0 kleinste, bei dx<0 größte Kollisionsspalte
  nehmen (analog vertikal), oder nach erstem Treffer brechen.

### M4 ⬜ Engine-Lifecycle an `handleResize`-Identität gekoppelt
`useEffect(…, [handleResize])`. Aktuell stabil via `useCallback([])`, aber
wer `handleResize` später um eine wechselnde Dependency erweitert, lässt
bei jedem Render eine neue Engine entstehen und verliert den Spielstand.
- **Empfohlener Fix:** Engine-Erzeugung in einen `[]`-Effect, Resize separat
  verdrahten.

---

## NIEDRIG / Kosmetik

- **N1 ⬜** `Physics.getTile` greift auf `this.tiles[0].length` zu — Crash
  bei leerem Grid (kein Guard). Edge-Case.
- **N2 ⬜** Test-Hook `window.__storage` wird im Effect-Cleanup nicht
  entfernt (winziger Leak; `__game` wird entfernt).
- **N3 ✅** `runShellCollisions`: redundante `entity !== shell`-Prüfung —
  beim H2-Refactor mit entfernt.
- **N4 ⬜** Magic Numbers (Knight-Recoil `5`, i-Frame `90`/`12`) statt
  benannter Konstanten.
- **N5 ⬜** `intersectsHazard`-Sweep nutzt bereits genullte velX/velY
  (reihenfolgeabhängig); praktisch ungefährlich.

---

## Positiv-Befunde (keine Aktion nötig)

- Alle 10 Level datentechnisch sauber (Grid, Spawn, Flagge, Checkpoints,
  je genau 3 valide Sonder-Münzen).
- AABB-Kollision lehrbuchkorrekt.
- Alle `localStorage`-Parsings try/catch-gekapselt.
- React-Effect: vollständiger Cleanup (Listener, Interval, Timer, Engine,
  __game).
- Null TODO/FIXME/HACK-Marker im Engine-Code.
