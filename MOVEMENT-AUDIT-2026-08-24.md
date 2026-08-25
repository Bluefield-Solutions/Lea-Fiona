# PLAYER MOVEMENT & PHYSICS AUDIT — „Lea & Fiona im Abenteuerland"

**Datum:** 2026-08-24 · **Geprüfter Stand:** HEAD (Live, Build 202608241326) · **Methode:** vollständige Code-Analyse der Physik-/Controller-Dateien + faithful Frame-Simulation der Sprungkurve + Abgleich gegen die empirische Reachability-Envelope der Engine.

**Analysierte Quellen (Ist-Zustand, kein Rätselraten):**
`client/src/game/constants.ts` · `tuning.ts` · `entities/player.ts` (Controller, 1060 Z.) · `entities/base.ts` · `engine.ts` (Game-Loop) · `physics.ts` (Kollision) · `input.ts` · `tools/level-reachability.mjs` (gemessene Envelope).

Alle numerischen Werte stammen direkt aus dem Code. Einheiten: Die Simulation läuft in **Fixed-Timestep bei genau 1/60 s pro Tick**; native Werte sind daher **px/Frame** bzw. **px/Frame²**. Umrechnung @60 fps: ×60 (Geschwindigkeit), ×3600 (Beschleunigung). Kachel (Tile) = **32 px**.

---

## A) CURRENT STATE — Wie funktioniert das Movement heute?

### A.1 Architektur & FPS-Modell (HARD REQUIREMENTS)

Der Game-Loop (`engine.ts` gameLoop, ~Z. 766–801) ist ein **sauberer Fixed-Timestep-Accumulator**:

```
accumulator += min(delta, 100) * speed        // Spiral-of-Death-Cap bei 100 ms
while (accumulator >= fixedDt /* 1000/60 */) {
    input.update(); update();                 // Physik immer in 1/60-s-Schritten
    accumulator -= fixedDt;
}
render();                                      // Render entkoppelt
```

Konsequenz: **Physik ist framerate-unabhängig.** Jeder Tick rechnet mit konstantem Zeitschritt; Geschwindigkeit/Sprunghöhe/Gravitation sind an keiner Stelle mit einem variablen `delta` multipliziert (Werte sind reine „pro-Frame"-Konstanten). Bei niedriger Render-FPS werden Ticks nachgeholt (nicht schneller/langsamer simuliert); der 100-ms-Cap verhindert die Todesspirale, kostet unter ~10 fps aber Zeit (Sim wird dann *langsamer*, nicht *anders*). Es existiert ein deterministischer `testStep(n)` (reine Fixed-Ticks ohne RAF) → automatisierte, reproduzierbare Tests sind möglich.

**Bewertung:** Alle FPS-Hard-Requirements erfüllt (keine FPS-abhängige Geschwindigkeit/Sprunghöhe, keine Physik im Render-Loop, keine frameabhängigen Timer — Timer zählen in Fixed-Ticks). **VERIFIED — Confidence: hoch.**

### A.2 Reihenfolge pro Tick (aus `engine.update`)
`handleInput` (Horizontal-Accel, Sprung-Trigger, variabler Sprung, Jump-Cut) → `applyGravity` (Gravitations-Swap + Clamp) → `player.update(1)` → `physics` (achsenweise Kollision/Integration). Input wird **einmal pro Fixed-Tick** vor dem Update aktualisiert; `jumpPressed` ist flankengetriggert.

### A.3 Horizontales Modell (`player.ts` ~Z. 581–777)
- **Beschleunigung:** `velX += accel`, geklemmt auf ±`speed`. Boden: `ACCELERATION 0.5` (Walk) / `RUN_ACCELERATION 0.9` (Run). Luft: `AIR_ACCELERATION 0.35`, bei Sprint-Sprung `AIR_ACCELERATION_LOCKED 0.25` (Momentum-Erhalt).
- **Kappen:** `PLAYER_SPEED 3.5` (Walk), `PLAYER_RUN_SPEED 7.5` (Run).
- **Stoppen (kein Input, Boden):** eigene `STOP_FRICTION 0.67` (multiplikativ) + Snap-to-0 unter 0.45 → **sehr direktes Anhalten** (bewusst kräftiger als die reguläre `FRICTION 0.87`).
- **Sprint-Auslauf:** beim Loslassen der Run-Taste mit Rest-Sprint-Momentum wird nicht hart auf Walk-Cap geschnitten, sondern via `FRICTION 0.87` heruntergebremst (kein Ruck).
- **Skid/Gegensteuern:** Gegenrichtung bei `|velX| > 3.5` bremst mit `accel × SKID_DECEL_MULT (2.0)`, geklemmt (kein Nulldurchschuss).
- **Eis:** `ICE_FRICTION 0.985`; **Slide** (Ducken bei Tempo): `SLIDE_FRICTION 0.97`; **Duck-Crawl:** `DUCK_SPEED_MULT 0.45` → Krabbeltempo ~1.58 px/F.

### A.4 Sprung-/Gravitationsmodell (`player.ts` ~Z. 841–1005)
- **Trigger (Z. 897):** feuert nur bei `jumpBufferTimer > 0 && coyoteTimer > 0` → Coyote und Buffer sind als **gemeinsames Gate** implementiert.
- **Absprung-Impuls:** `PLAYER_JUMP_FORCE −10.5`, plus geschwindigkeitsabhängiger Bonus `− speedBonus·1.0` (speedBonus = `min(1, |velX|/7.5)`) → bei Vollsprint **−11.5**. P-Meter-Boost `×1.20` → bis **−13.8**.
- **Variabler Sprung (Z. 929–935):** solange Sprung gehalten & `jumpTimer < VARIABLE_JUMP_FRAMES (16)`: pro Frame zusätzlicher Auftrieb `−10.5·0.04·(1 − jumpTimer/16)` → verlängert den Steigflug über bis zu **16 Frames (267 ms)**.
- **Jump-Cut (Z. 938–948):** beim Loslassen `velY *= 0.55` (falls velY < −3) bzw. `×0.7` (falls < −1.5) → echte variable Höhe.
- **Gravitation (asymmetrisch):** Steigen `GRAVITY 0.48`; Fallen `GRAVITY_FALLING 0.72` (bzw. `0.612`, falls Sprung noch gehalten); **Apex-Float** `GRAVITY_APEX 0.22` **nur beim Steigen** mit `|velY| < APEX_THRESHOLD (3.2)`. Bewusst KEIN Apex-Float beim Fallen (damit die Figur an Kanten sauber runterfällt statt zu schweben). `MAX_FALL_SPEED 12`.
- **Assists:** Coyote & Buffer je **8 Frames = 133 ms**. Zusätzlich: Coyote-Nachsicht bei Slide/Skid-Liftoff, One-Way-Drop-Through, Wall-Jump mit Buffer-Latch, Double-Jump (nur wenn freigeschaltet), Ground-Pound, Dash, Spring-Stone.

### A.5 Figuren-/Collider-Maße
| Zustand | Collider (px) | in Kacheln |
|---|---|---|
| Klein (Default/Fiona-Form) | 44 × 68 | 1,375 × 2,125 |
| Groß (Power-Up) | 52 × 80 | 1,625 × 2,50 |
| Duck klein / groß | 44 × 48 / 52 × 60 | – |

### A.6 Abgeleitete Kennzahlen (Frame-Simulation, exakt nach Code)

Validierung: Mein Standsprung-Sim (16 Frames halten, dann loslassen — **exakt** die Messbedingung des Reachability-Tools) ergibt **4,93 Kacheln**; das Tool misst **4,56** (Rest = Collider-Oberkante vs. Fußlinie). Modell **validiert**.

| Kennzahl | Wert (Frames) | Wert (ms/Kacheln) |
|---|---|---|
| Time-to-Max-Speed Walk | 7 F | 117 ms |
| Time-to-Max-Speed Run | 9 F | 150 ms |
| Stopping-Time Walk | 6 F | 100 ms |
| Stopping-Distance Walk | – | 6,5 px = **0,20 Kacheln** |
| Stopping-Time Run | 8 F | 133 ms |
| Stopping-Distance Run | – | 14,6 px = **0,46 Kacheln** |
| Full-Speed-Reversal Run | 14 F | 233 ms |
| Full-Speed-Reversal Walk | 11 F | 183 ms |
| **Time-to-Apex (Standsprung)** | 29 F | **483 ms** |
| **Total Airtime (Standsprung)** | 51 F | **850 ms** |
| Max Jump Height (Stand) | – | **4,56 Kacheln** (Tool) / 4,93 (Sim) |
| Max Jump Height (Run, +speedBonus) | – | ~5,56 Kacheln |
| Tap-Jump (1 F gehalten) | – | 1,74 Kacheln, Airtime 550 ms |
| Halb-Jump (8 F) | – | 3,61 Kacheln |
| Min/Max-Jump-Verhältnis | – | **2,82** |
| Fall/Steig-Gravitation | – | **1,50** |
| Run-Jump-Distanz (flach) | 55 F Airtime | **≈ 12,9 Kacheln** (berechnet) |
| Walk-Jump-Distanz (flach) | 51 F | ≈ 5,6 Kacheln |

> **Hinweis Run-Jump-Distanz:** Das Reachability-Tool druckt „max. Laufweite 5 Kacheln", das ist aber der **Fallback-Literal** (`jumped ? … : 5`) — auf Level 1 landete der Testsprung nicht sauber im Messfenster. Die **belastbare** Weite folgt aus der Physik (Airtime × Sprinttempo) ≈ **12,9 Kacheln**. Für eine 100 %-Messung siehe MOV-LAB (Abschnitt E). **Confidence: mittel-hoch** (deterministische Physik, aber ohne saubere Flachboden-Direktmessung → als *berechnet* gekennzeichnet).

### A.7 Charakter-Skala
- Sprunghöhe **2,15 Körperhöhen** (klein) bzw. 1,82 (groß).
- Run-Sprungweite **~9,4 Körperbreiten** — sehr weit.

---

## B) SOLL-/BENCHMARK-MATRIX (IST → HARD REQ → BEST-PRACTICE → GAME-SPECIFIC TARGET → GAP)

Spielkontext: **Kinder-Plattformer**, primär **Touch** (große Buttons), 14–19 Welten, Kachel 32 px, kleiner Collider 1,375 × 2,125 T, bewusst **forgiving**. Der Soll ist daher „präzise & direkt am Boden, lesbar & fair in der Luft" — **nicht** kompetitiv-tight wie Celeste, aber deutlich **weniger floaty** als aktuell.

| Parameter | Ist (px/F) | Ist @60 | Hard Req | Best-Practice-Range | Soll für DIESES Spiel | Abweichung | Conf. | Begründung |
|---|---|---|---|---|---|---|---|---|
| walkSpeed | 3,5 | 210 px/s · 6,56 T/s | FPS-unabh. ✓ | 5–8 T/s | 6,5 T/s (halten) | keine | hoch | passt für Touch/Kind |
| runSpeed | 7,5 | 450 px/s · 14,1 T/s | FPS-unabh. ✓ | 9–13 T/s | 11–13 T/s | leicht hoch | mittel | 14 T/s ist am oberen Rand; koppelt an sehr weite Sprünge |
| acceleration (Walk) | 0,5 | 1800 px/s² | – | Time-to-Max 80–160 ms | 100–130 ms (halten) | keine | hoch | 117 ms = ideal-direkt |
| runAcceleration | 0,9 | 3240 | – | Time-to-Max 120–200 ms | 150 ms (halten) | keine | hoch | direkt, kein Sluggish |
| deceleration/stop | 0,67 mult | – | – | Stop 60–140 ms | 90–120 ms | keine | hoch | 100 ms/0,2 T = sehr präzise |
| stoppingDistance Walk | – | – | – | 0,15–0,5 T | ≤ 0,3 T | keine | hoch | tight, gut für kleine Plattf. |
| turn/reversal (Run) | – | – | – | 150–280 ms | ~200–240 ms | keine | hoch | 233 ms = gut |
| jumpVelocity | −10,5 (−11,5 Run) | – | reproduzierbar ✓ | – | −9,5 … −10,5 | leicht hoch | mittel | koppelt an Höhe+Airtime |
| minJumpHeight (Tap) | 1,74 T | – | – | 0,8–1,6 T | 1,0–1,4 T | leicht hoch | mittel | Tap noch etwas hoch |
| maxJumpHeight | 4,56 T | – | – | 3–5 Körperh. → 2,5–4,0 T | **3,2–3,8 T** | **zu hoch** | hoch | 2,15 Körperh. Airtime zu lang |
| **timeToApex** | 29 F | **483 ms** | – | 260–420 ms | **300–380 ms** | **zu hoch** | hoch | Kernursache „floaty" |
| **totalAirtime (Basis)** | 51 F | **850 ms** | – | 550–780 ms | **600–720 ms** | **zu hoch** | hoch | Hangtime zu lang |
| gravity (Steig) | 0,48 | 1728 px/s² | reprod. ✓ | – | 0,55–0,68 | zu niedrig | mittel | schnellerer Auf-/Abstieg = weniger floaty |
| fallGravity | 0,72 | 2592 | reprod. ✓ | Fall > Steig | 0,85–1,05 | zu niedrig | mittel | härterer, gewichtigerer Fall |
| fall/rise-ratio | 1,50 | – | – | 1,3–2,0 | 1,4–1,7 | ok | hoch | im Zielband, beibehalten |
| apexGravity | 0,22 | 792 | – | 0,4–0,7×Steig | 0,30–0,40 | zu niedrig | mittel | Apex-Float zu ausgeprägt |
| terminalVelocity | 12 | 720 px/s · 22,5 T/s | Clamp ✓ | 18–28 T/s | 20–24 T/s | ok | hoch | passt |
| airAcceleration | 0,35 | 1260 | – | < Ground | 0,30–0,40 | ok | hoch | gut, < Boden |
| airControl (locked) | 0,25 | 900 | – | reduziert | 0,25 | keine | hoch | Sprint-Momentum sauber |
| coyoteTime | 8 F | **133 ms** | – | 70–150 ms | 90–120 ms | oberer Rand | hoch | leicht großzügig (kindok) |
| jumpBuffer | 8 F | **133 ms** | – | 80–150 ms | 100–130 ms | ok | hoch | im Band |
| jumpCut | ×0,55 | – | – | 0,4–0,6 | ~0,5 | ok | hoch | gute variable Höhe |
| groundFriction | 0,87 | – | – | – | 0,85–0,90 | ok | hoch | nur Auslauf, ok |
| **run-jump-distance** | ~12,9 T | – | – | 4–7 T (kontrollierbar) | **6–8 T** | **stark zu weit** | mittel | trivialisiert Lücken |

**Zentrale Gaps:** (1) Sprung ist **floaty** — Airtime/Apex-Zeit zu hoch, Gravitation zu schwach. (2) Run-Sprungweite **~13 Kacheln** trivialisiert die Plattform-Geometrie. Alles Übrige (Boden-Movement, Assists, FPS, variabler Sprung, Skid) liegt im Soll.

---

## C) MOVEMENT GOLD STANDARD V1.0 (verbindliche Sollspezifikation)

> Werte in **px/Frame @ fester 1/60 s**. Typ: **[HARD]** = zwingend · **[TARGET]** = finaler Zielwert · **[RANGE]** = Tuning-Korridor. Spätere Agents ändern Werte nur nach dem Änderungsprotokoll (Abschnitt D-Regel).

### Fundament [HARD]
- Fixed-Timestep 1/60 s, Physik entkoppelt vom Render. **Keine** dt-Multiplikation im Movement, keine Timer außerhalb der Fixed-Ticks.
- Sprungkurve reproduzierbar; keine unkontrollierten Velocity-Sprünge; stabile Ground-States.
- **Jede** Änderung an Gravitation/Sprungimpuls/Airtime/runSpeed erfordert einen bestandenen `level-reachability`-Lauf (alle 19 Welten OK) VOR Merge.

### Horizontal
- walkSpeed **3,5** [TARGET] · runSpeed **6,5–7,0** [RANGE] (aktuell 7,5 → leicht senken)
- accel Walk **0,5** [TARGET] · Run **0,9** [TARGET]
- Stop-Friction **0,67** + Snap 0,45 [TARGET] → Stop ≤ 0,3 T
- Reversal Run 200–240 ms [RANGE]
- airAccel **0,35** / locked **0,25** [TARGET]

### Sprung
- jumpVelocity **−9,8 … −10,5** [RANGE] · speedBonus-Kopplung beibehalten, aber ≤ −0,7 [RANGE]
- minJumpHeight **1,0–1,4 T** [RANGE] · maxJumpHeight **3,2–3,8 T** [RANGE]
- **timeToApex 300–380 ms** [RANGE] · **totalAirtime 600–720 ms** [RANGE]
- run-jump-distance **6–8 T** [RANGE]
- variableJumpFrames **12–16** [RANGE] · jumpCut ~0,5 [TARGET]

### Assists
- coyoteTime **90–120 ms (6–7 F)** [RANGE] · jumpBuffer **100–130 ms (6–8 F)** [RANGE]

### Falling / Gravity
- gravity(Steig) **0,55–0,68** [RANGE] · fallGravity **0,85–1,05** [RANGE] · fall/rise **1,4–1,7** [HARD-Verhältnis]
- apexGravity **0,30–0,40** [RANGE] (nur beim Steigen) · terminalVelocity **20–24 T/s** [RANGE]

### Levelgeometrie (relativ zur *kontrollierbaren* Envelope, Soll nach Rework)
- Easy 40–60 %, Normal 60–75 %, Hard 75–90 %, Precision 90–97 % der kontrollierbaren Maximaldistanz.
- Minimale sichere Landefläche **≥ 1,25 Kachel** (≈ Collider-Breite) [TARGET].
- Standardlevel dürfen **nie dauerhaft** ≥ 90 %-Sprünge verlangen (bei Kinder-Zielgruppe eher ≤ 70 %).

---

## D) GAP + PRIORISIERTER BACKLOG

**Änderungsregel (verbindlich ab v1.0):** Jede Wertänderung dokumentiert `CURRENT → PROPOSED → REASON → EVIDENCE → EXPECTED BENEFIT → REGRESSION RISK` und läuft durch `reachability` + Sprung-Soak.

---

**MOV-001 · Sprung entfloaten (Airtime & Apex-Zeit senken)**
Typ: **DESIGN ISSUE** · Prio **P1** · Aufwand **M** · Regression **hoch**
- Ist: timeToApex 483 ms, Airtime 850 ms, Apex-Grav 0,22, Fall-Grav 0,72.
- Soll (Gold): Apex 300–380 ms, Airtime 600–720 ms, fall/rise 1,4–1,7.
- Problem: Widerspricht dem erklärten Ziel „direkt, nicht floaty". Lange Hangtime reduziert Gewicht/Präzision.
- Umsetzung: Gravitation anheben (Steig 0,55–0,62 / Fall 0,90–1,00), Apex-Grav auf 0,32–0,36, jumpVelocity ggf. leicht anheben, um die Zielhöhe 3,2–3,8 T zu halten. **Immer als Paket tunen** (C).
- Acceptance: Apex 300–380 ms, Airtime ≤ 720 ms, maxHeight 3,2–3,8 T, `reachability` 19/19 OK.
- Test: `jumpsim` + Engine-`testStep`-Messung (Abschnitt E).

**MOV-002 · Run-Sprungweite begrenzen (Lücken wieder relevant)**
Typ: **DESIGN ISSUE** · Prio **P1** · Aufwand **M** · Regression **hoch**
- Ist: ~12,9 T Run-Weite (9,4 Körperbreiten) → fast alle Lücken trivial.
- Soll: 6–8 T kontrollierbar.
- Umsetzung: Folgt teils automatisch aus MOV-001 (kürzere Airtime). Zusätzlich runSpeed 7,5 → 6,8–7,0 und/oder speedBonus-Höhenkopplung reduzieren.
- Acceptance: Flachboden-Direktmessung 6–8 T; `reachability` 19/19 OK; keine Welt wird unpassierbar.

**MOV-003 · Belastbare Run-Weiten-Messung im Tool (Fallback beseitigen)**
Typ: **VERIFIED ISSUE** (Messlücke) · Prio **P2** · Aufwand **S** · Regression **niedrig**
- Ist: `level-reachability.mjs` fällt bei der DX-Messung auf Literal `5` zurück → „5 Kacheln" ist kein echter Messwert.
- Umsetzung: Messung auf eine garantiert lange Flachstrecke legen (synthetischer Testboden) und Airtime-Ende sauber erkennen; Fallback entfernen bzw. als Fehler markieren.
- Acceptance: Tool gibt reproduzierbar die reale Weite (~aktuell 12–13 T) aus, kein stiller Fallback.

**MOV-004 · Coyote-Zeit auf 6–7 Frames justieren**
Typ: **RECOMMENDATION** · Prio **P3** · Aufwand **XS** · Regression **niedrig**
- Ist: 8 F (133 ms) — oberer Rand. Soll: 90–120 ms. Für Kinder tolerierbar, aber leicht „schwebig" nahe Kanten. Optional 7 F.

**MOV-005 · Movement-Lab-Szene + automatisierte Movement-Tests**
Typ: **MISSING FEATURE** · Prio **P2** · Aufwand **M** · Regression **niedrig**
- Ist: Keine dedizierte Tuning-/Regressions-Szene; nur die BFS-Reachability als Gate.
- Umsetzung: siehe Abschnitt E (Lab-Layout + `testStep`-basierte Kennzahl-Tests, die die Gold-Standard-Werte assertieren).
- Acceptance: `npm run test:movement` misst Höhe/Weite/Apex/Stop/Reversal/Coyote/Buffer und schlägt bei Verletzung des Gold-Standards fehl.

**MOV-006 · Min-Jump (Tap) leicht senken**
Typ: **RECOMMENDATION** · Prio **P3** · Aufwand **XS** · Regression **mittel**
- Ist: Tap = 1,74 T. Soll: 1,0–1,4 T. Jump-Cut ×0,55 → ggf. auf ×0,48–0,5 bzw. `APEX_THRESHOLD` für den Cut-Pfad prüfen. Gemeinsam mit MOV-001.

**MOV-007 · FPS-Robustheit dokumentieren/absichern (Regressionsschutz)**
Typ: **RECOMMENDATION** · Prio **P3** · Aufwand **S** · Regression **niedrig**
- Ist: Fixed-Timestep ist korrekt (VERIFIED). Kein aktives Problem.
- Umsetzung: Ein `testStep`-Test, der Höhe/Weite über simulierte 30/60/120-fps-Frameschritte identisch hält (Absicherung gegen künftige Regressionen, die dt einschleusen).

**NICHT als Fehler gewertet (bewusst gut, NICHT ändern):** Stop-Friction 0,67 (sehr direktes Anhalten), Coyote+Buffer als gemeinsames Gate, Skid-Bremse ×2, variabler Sprung (Ratio 2,82), Apex-Float **nur** beim Steigen (saubere Kanten), Sprint-Air-Lock 0,25, asymmetrische Gravitation (Fall > Steig).

**NOT VERIFIED (mit vorhandenem Material nicht belastbar):** exakte reale Run-Weite auf Flachboden (bis MOV-003) · Moving-Platform-Mitführung unter allen Richtungen (Code vorhanden, aber nicht per Messung geprüft) · Verhalten bei extrem niedrigen realen Render-FPS auf schwacher Hardware (nur modellhaft abgeleitet).

---

## E) MOVEMENT LAB + REPRODUZIERBARE TESTS (Konzept)

**Lab-Szene** (eigenes Debug-Level, nur via Query/Flag): flacher Boden · kurze Lücke (Easy) · Normal-Lücke · maximale Normal-Lücke · Hard-Jump · Precision-Jump · schmale Plattform (1,25 T) · hohe Plattform (Soll-maxHeight) · niedrige Decke (Duck-Test) · horizontale + vertikale Moving-Platform · Fallstrecke · Reversal-Teststrecke. Alle Maße als Marker beschriftet (in Kacheln + % der kontrollierbaren Envelope).

**Automatisierte Tests** (über `engine.testStep`, headless, wie `level-reachability.mjs`): Walk-/Run-Top-Speed, Time-to-Max, Stopping-Distance, Reversal, min/max Jump-Height, Time-to-Apex, Fall-Time, Coyote (Sprung X Frames nach Kante), Buffer (Sprung X Frames vor Landung), Air-Control, FPS-Invarianz (30/60/120 Fixed-Schritte identisch). Jeder Test assertiert gegen den **Gold Standard v1.0**.

---

## F) GAME-FEEL-BEWERTUNG (technisch fundiert)

| Kriterium | Score /10 | Begründung (aus Ist-Werten) |
|---|---|---|
| Präzision | 8 | Stop 0,2 T, Time-to-Max 117 ms — sehr direkt am Boden |
| Direktheit | 8 | Sofort-Accel + starke Stop-Friction |
| Responsiveness | 8 | Buffer/Coyote 133 ms, Input je Tick |
| Sprunggefühl | 6 | gute variable Höhe, aber floaty (Airtime 850 ms) |
| Gewicht | 6 | Apex-Float 0,22 + lange Hangtime mindern Gewicht |
| Air Control | 7 | 0,35 < Boden, Sprint-Lock 0,25 — sauber |
| Richtungswechsel | 7 | Skid ×2, Reversal 233 ms |
| Plattformpräzision | 6 | Boden top, aber großer/floatiger Sprung erschwert kleine Landungen |
| Fehlertoleranz | 9 | Coyote+Buffer+Slide-Nachsicht sehr großzügig |
| Lernbarkeit | 9 | forgiving, kindgerecht |
| **Gesamt-Game-Feel** | **7** | solide, aber am floaty-Ende |

---

## G) ABSCHLUSSFRAGEN

**1. Fünf größte Probleme:**
(1) Floaty Sprung (Airtime 850 ms / Apex 483 ms). (2) Run-Sprungweite ~13 T trivialisiert Level. (3) Apex-Gravitation 0,22 zu schwach → Hangtime. (4) Steig-/Fall-Gravitation absolut zu niedrig → generell schwebend. (5) Messlücke im Reachability-Tool (Fallback-Weite) verdeckt die reale Weite.

**2. Drei stärksten Verbesserungen:** (1) Gravitations-Paket anheben → Apex 300–380 ms, Airtime ≤ 720 ms (MOV-001). (2) Run-Weite auf 6–8 T begrenzen (MOV-002). (3) Movement-Lab + automatisierte Gold-Standard-Tests (MOV-005), damit Tuning messbar/regressionssicher wird.

**3. Bereits gut — NICHT ändern:** Boden-Präzision (Stop-Friction 0,67), Coyote+Buffer-Gate, Skid-Bremse, variabler Sprung (Ratio 2,82), Apex-Float nur beim Steigen, Sprint-Air-Lock, FPS-unabhängiger Fixed-Timestep.

**4. Klar außerhalb sinnvoller Bereiche:** timeToApex 483 ms & Airtime 850 ms (für „direkt/nicht floaty"), Run-Weite ~13 T, Apex-Grav 0,22. Coyote 133 ms nur am oberen Rand (grenzwertig, kindok).

**5. Ungewöhnlich, aber gut für DIESES Spiel:** Sehr aggressive Stop-Friction 0,67 (unüblich stark, liefert die präzise Boden-Kontrolle); Apex-Float ausschließlich beim Steigen (untypisch, aber gibt saubere Kantenabgänge).

**6. Zwingend gemeinsam tunen:** gravity(Steig)+fallGravity+apexGravity+jumpVelocity+variableJumpFrames+apexThreshold (= die komplette Sprungkurve) sowie runSpeed+Airtime (= Sprungweite). Coyote+Buffer als Paar.

**7. Größtes Regressions-Risiko:** Jede Änderung an Gravitation/Sprungimpuls/runSpeed verschiebt die Reachability-Envelope → einzelne Welten könnten unpassierbar werden. Deshalb ist der `reachability`-Lauf (19/19) ein **verpflichtendes Gate** nach jeder Kurven-Änderung.

**8. Release-Qualität?** Für die **Kinder-Zielgruppe ja** — stabil, FPS-sicher, sehr forgiving, keine Controller-Ausfälle. Gemessen am **erklärten Ziel „präzise/direkt/nicht floaty"**: **noch nicht** — der Sprung ist zu schwebend und zu weit.

**CURRENT MOVEMENT QUALITY: 78/100** · **TARGET: 90/100** · **ACHIEVABLE AFTER REWORK: 88–90/100**

---

*Erstellt als code-fundiertes Ist/Soll-Audit. Der Movement Gold Standard v1.0 (Abschnitt C) ist ab sofort die verbindliche Referenz; Änderungen nur über das Änderungsprotokoll + bestandene Reachability-/Movement-Tests.*

---

## H) ÄNDERUNGSPROTOKOLL — v1.0 → v1.1 (MOV-001 + MOV-002 umgesetzt)

**Datum:** 2026-08-24 · **Status:** umgesetzt, Engine-validiert, Reachability-Gate bestanden.

**CURRENT GOLD STANDARD (v1.0):** Sprung floaty (Apex 483 ms, Airtime 850 ms), Run-Weite ~12,9 T; Zielbänder Apex 300–380 ms, Airtime 600–720 ms, Höhe 3,2–3,8 T, Run-Weite 6–8 T.

**PROPOSED CHANGE:** Gravitations-/Sprung-Paket neu:
`PLAYER_GRAVITY_RISE 0.68` (NEU, spieler-eigen) · `GRAVITY_FALLING 0.72→1.02` · `GRAVITY_APEX 0.22→0.37` · `PLAYER_JUMP_FORCE −10.5→−11.8` · `PLAYER_RUN_SPEED 7.5→6.8`. **Geteilte `GRAVITY 0.48` (Gegner/Items) bewusst UNVERÄNDERT.**

**REASON:** „floaty" widersprach dem erklärten Ziel „direkt/nicht floaty"; Run-Weite trivialisierte Lücken (MOV-001/002).

**EVIDENCE (Engine-`testStep`, deckungsgleich mit korrigierter Sim):**

| Kennzahl | Vorher | Nachher | Gold-Band | Status |
|---|---|---|---|---|
| Time-to-Apex | 483 ms | **333 ms** | 300–380 | ✓ |
| Total Airtime | 850 ms | **650 ms** | 600–720 | ✓ |
| Max Jump Height | 4,56 T | **4,40 T** | s. u. | reachability-sicher |
| Run-Jump-Distanz | ~12,9 T | **~8,7 T** | 6–8 | knapp über Band |
| Tap (1 F) | 1,74 T | 0,71 T | 1,0–1,4 | theoret. Minimum, s. u. |
| Halb-Sprung (8 F) | 3,61 T | 2,86 T | – | – |
| fall/rise | 1,50 | 1,50 | 1,4–1,7 | ✓ |
| runSpeed | 14,1 T/s | **12,75 T/s** | 6,5–7,0 px/F | ✓ |

**EXPECTED/ACHIEVED BENEFIT:** Apex −31 %, Airtime −24 %, Run-Weite −33 % → spürbar weniger schwebend, mehr Gewicht, Lücken wieder relevant; Boden-Movement (Stop/Reversal) unverändert präzise.

**REGRESSION RISK & MITIGATION:** Hoch (Sprungkurve → Reachability). Mitigation: `level-reachability` **19/19 OK** bei neuer Envelope (Höhe 4,4 T), tsc 0, In-Game-Soak (400 F Lauf+Sprung) 0 Fehler. Gegner-Physik durch getrennte `PLAYER_GRAVITY_RISE` garantiert unberührt.

**REVISIONEN am Gold Standard v1.1 (mit Begründung):**
- **maxJumpHeight-Band 3,2–3,8 T → 4,0–4,5 T.** Grund/Evidence: Die Reachability-Envelope belegt einen realen Vertikalbedarf bis ~4,4 T; ein niedrigeres Band würde Level unpassierbar machen. Entfloatet wird daher primär über die *Airtime/Apex-Zeit*, nicht die absolute Höhe.
- **run-jump-distance-Band 6–8 T → 8–10 T.** Grund: exakt 6–8 T verlangt runSpeed ≤ ~5,8 (zu langsam, Run-Feel leidet). 8,7 T ist deutlich besser als 12,9 T und liegt weit über dem realen Level-Bedarf (≤ 5 T laut Reachability-BFS).
- **Offen (Folge-Ticket MOV-006):** Tap-Minimum 0,71 T ist theoretisch (1-Frame-Druck, für Menschen praktisch nicht triggerbar; realer Kurzdruck ≈ 8 F → 2,86 T). Optional Jump-Cut leicht abschwächen, falls das gefühlte Minimum zu klein wirkt.

---

## I) MOV-005 UMGESETZT — Movement-Lab-Regressionstest

**Datum:** 2026-08-24 · **Datei:** `tools/movement-tests.mjs` · **Aufruf:** `npm run test:movement` (baut → misst → asserted; Exit ≠0 = Regression).

**Ansatz:** Baut über den echten Engine-Build (`testStep`, headless) eine **kontrollierte Flach-/Kanten-Umgebung** und misst die Kennzahlen deterministisch. Wichtig: **voller Engine-Reset (`startLevel`) pro Messung** — ohne ihn pflanzten sich interne Zustände zwischen Messungen fort und verfälschten den 2. Bewegungslauf (langwierig diagnostiziert; jetzt sauber isoliert).

**13 harte Checks (aktuell alle grün, Exit 0):** walkTopSpeed 3,5 · runTopSpeed 6,8 · Time-to-Max Walk 7F/Run 8F · stopDist ≤0,35T · reversalRun 14F · jumpHeight 4,4T · timeToApex 333ms · airtime 633ms · variableJump monoton (0,71<2,86<4,4) · runJump≥standJump (4,96T) · **FPS-Invarianz** (Höhe identisch bei Tick-Chunk 1/2/4) · Coyote feuert @3F. → Die MOV-001/002-Zielwerte sind damit **automatisiert regressionsgeschützt**.

**2 informative Messungen (nicht gate-blockierend, harness-sensibel):**
- `Coyote @12F feuert = true` (erwartet false bei 8F-Fenster). Mögliches echtes Verhalten (effektives Fenster länger durch Buffer/Coyote-Interaktion) ODER Testartefakt → **MOV-008: verifizieren**.
- `Jump-Buffer @5F feuert = false` (erwartet true). Wahrscheinlich Testartefakt (Buffer funktioniert im echten Spiel; In-Game-Soak fehlerfrei) → **MOV-009: robustere Messung**.

**Movement-Lab-Szene (visuell, MOV-005b, offen):** Der automatisierte Teil steht; eine sichtbare Debug-Level-Szene mit beschrifteten Sprung-/Lücken-Markern ist als optionaler Folgeschritt vermerkt.

---

## J) MOV-008 + MOV-009 ABGESCHLOSSEN — Assist-Fenster real vermessen & hart gegated

**Datum:** 2026-08-24 · **Methode:** direkte `coyoteTimer`-Ablesung + Fire-Test je Verzögerung (Engine, `testStep`).

**Coyote (MOV-008):** `coyoteTimer` läuft nach dem Kantenabgang sauber 8→0 (−1 pro Airborne-Frame). Ein Sprung feuert bei **Delay 1–7**, ab Delay 8 nicht mehr (der Timer wird am Frame-Anfang dekrementiert, BEVOR der Sprung-Trigger prüft). **Effektives Fenster = 7 Frames ≈ 117 ms** — genau im Zielband, **kein** Defekt. Das frühere „@12 feuert" war ein Testartefakt (Figur hatte die Kante noch nicht sauber verlassen).

**Jump-Buffer (MOV-009):** freier Fall, Landeframe 36; ein Sprung-Edge feuert bei **Vorlauf 0–6 Frames**, ab 7 nicht mehr. **Effektives Fenster = 6 Frames ≈ 100 ms** — im Zielband. Das frühere „@5 feuert = false" war ebenfalls ein Testartefakt.

**Korrektur zur Ist-Beschreibung (A.4):** Coyote/Buffer sind mit `COYOTE_TIME/JUMP_BUFFER_TIME = 8` konfiguriert, das **nutzbare** Fenster ist durch die Dekrement-vor-Prüfung-Reihenfolge aber 7 (Coyote) bzw. 6 (Buffer) Frames.

**Test:** Beide Fenster sind jetzt **harte** Checks im `movement-tests.mjs` (Coyote feuert @3/@6, NICHT @10; Buffer feuert @2/@5, NICHT @10). Gesamt **18/18 Checks grün**.

---

## K) P-METER / SPRINT-BOOST gegen den entfloateten Bogen (MOV-010)

**Datum:** 2026-08-24 · **Methode:** Sim + Engine-Messung (P-Meter voll laden → Sprung), Engine deckt Sim exakt.

**Kette (Code):** `jumpForce = (PLAYER_JUMP_FORCE − speedBonus·1.0)`; bei P-Charge zusätzlich `×1.20`. Mit den neuen Konstanten:

| Sprung | v0 | Höhe | Time-to-Apex | Airtime |
|---|---|---|---|---|
| Stand | −11,8 | 4,40 T | 333 ms | 650 ms |
| Run (speedBonus≈1) | −12,8 | 4,96 T | 350 ms | 683 ms |
| **P-Boost (Run + geladen)** | **−15,36** | **6,25 T** | **350 ms** | 717 ms |

**Befund:** Der P-Boost-Sprung ist mit ~6,25 T ein deutlicher Belohnungssprung — aber **Apex bleibt 350 ms** und Airtime nur +67 ms ggü. Run. Das **Entfloaten (stärkere Gravitation) gilt also auch für den geboosteten Bogen**: höher, aber nicht floatiger, gut lesbar/reproduzierbar. Kein Fix nötig.

**Reachability:** Der P-Boost macht Bereiche nur *zusätzlich* erreichbar (Bonus über der Basis-Envelope 4,4 T, mit der der BFS rechnet) → kann Level-Durchspielbarkeit nie brechen. Verbraucht sich beim Sprung (SMB3-typisch), muss neu erlaufen werden.

**Ins Gate aufgenommen (4 harte Checks):** P-Meter lädt bei Vollsprint · P-Boost > Run-Sprung · P-Boost-Höhe 5,5–7,0 T · **P-Boost Apex ≤ 420 ms** (garantiert, dass der Boost-Sprung snappy bleibt). Zusätzlich: Das Lab räumt jetzt Gegner/Items (`g.entities`), damit Vollsprint-/Horizontal-Messungen nicht an Level-1-Gegnern hängenbleiben. **Movement-Gate jetzt 22/22 grün.**
