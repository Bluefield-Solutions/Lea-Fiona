// ─────────────────────────────────────────────────────────────────────────────
// MOVEMENT-LAB — automatisierter Regressionstest für den Character Controller.
//
// Baut über den echten Engine-Build (dist-standalone → /tmp/real.html) eine
// KONTROLLIERTE Testumgebung (langer Flachboden bzw. Boden mit Kante), misst die
// Kern-Kennzahlen des Movements deterministisch über g.testStep() und prüft sie
// gegen den MOVEMENT GOLD STANDARD v1.1 (siehe claude/Movement-Physics-Audit…md).
//
// Nutzung:  node tools/movement-tests.mjs            (nutzt /tmp/real.html)
//   Voraussetzung: aktueller Build liegt unter /tmp/real.html
//   (z. B. via `npm run build:standalone && cp dist-standalone/index.html /tmp/real.html`).
// Exit 0 = alle Gold-Standard-Checks bestanden. Exit ≠0 = Regression.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright';

const CHROME = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/opt/pw-browsers/chromium';
const HTML = process.env.MOVEMENT_HTML || 'file:///tmp/real.html';

const b = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const pg = await b.newPage({ viewport: { width: 554, height: 369 } });
await pg.goto(HTML);
await pg.waitForFunction(() => window.__game, { timeout: 20000 });

const M = await pg.evaluate(() => {
  const g = window.__game, TS = 32;
  g.startLevel(0);
  for (let i = 0; i < 20; i++) g.testStep(1);
  const L = g.level, H = L.height, W = L.width;
  const gr = L.groundRow ?? (H - 2);
  const A = 4, B = Math.min(W - 3, A + 140);
  const K = g.input.keys;

  // Baut einen sauberen Flachboden [A,B); optional Pit ab edgeCol (Kante).
  const build = (edgeCol = null) => {
    for (let c = A; c < B; c++) {
      const pit = edgeCol !== null && c >= edgeCol;
      for (let r = 0; r < gr; r++) L.tiles[r][c] = 0;          // Decke/Hindernisse frei
      for (let r = gr; r < H; r++) L.tiles[r][c] = pit ? 0 : 1; // Boden bzw. Loch
      if (!pit) L.tiles[gr][c] = 2;                            // GROUND_TOP oben
    }
  };
  // Harter Reset: frisches Lab + alle bewegungsrelevanten Player-Flags null,
  // damit sich Zustände (Skid/Slide/Coyote/Jump) NICHT zwischen Messungen
  // fortpflanzen. yTiles: Starthöhe über groundRow (Default 4 → fällt auf).
  const place = (col, { edgeCol = null, yTiles = 4, settle = 25 } = {}) => {
    // Voller Engine-Reset: garantiert isolierte Messungen (interne Zustände, die
    // sich sonst zwischen Messungen fortpflanzen und z. B. den 2. Lauf verfälschen).
    g.startLevel(0); for (let i = 0; i < 15; i++) g.testStep(1);
    build(edgeCol);
    if (Array.isArray(g.entities)) g.entities.length = 0;  // Gegner/Items raus → keine Kollision beim Messen
    const p = g.player;
    p.x = col * TS; p.y = (gr - yTiles) * TS; p.velX = 0; p.velY = 0;
    p.isSkidding = false; p.isSliding = false; p.isDucking = false;
    p.isJumping = false; p.jumpHeld = false; p.onGround = false;
    p.coyoteTimer = 0; p.jumpBufferTimer = 0; p.jumpTimer = 0;
    p.speedAtJump = 0; p.airControlLockTimer = 0; p.isWallSliding = false;
    p.dashTimer = 0; p.dashCooldown = 0; p.runChargeTimer = 0; p.isPCharged = false;
    // InputManager-Zustand neutralisieren (Doppel-Tap-Dash/stale Edges), sonst
    // wird der 2. Bewegungs-Test durch einen „Doppel-Tap" verfälscht.
    const im = g.input;
    try { im.doubleTapRunDir = null; im.lastTapRight = -999; im.lastTapLeft = -999; im.previousKeys && im.previousKeys.clear && im.previousKeys.clear(); } catch (e) { /* n/a */ }
    K.clear();
    for (let i = 0; i < settle; i++) { K.clear(); g.testStep(1); }
  };
  const set = (obj) => { K.clear(); for (const k in obj) if (obj[k]) K.set(k, true); };

  // Frisches Lab, das g.level NACH startLevel neu abfragt (robust, egal ob
  // startLevel das Level-Objekt ersetzt). edge≠null → Pit ab dieser Spalte.
  const freshLab = (edge = null) => {
    g.startLevel(0); for (let i = 0; i < 15; i++) g.testStep(1);
    const LL = g.level, HH = LL.height, WW = LL.width, ggr = LL.groundRow ?? (HH - 2);
    const BB = Math.min(WW - 3, A + 120);
    for (let c = A; c < BB; c++) {
      const pit = edge !== null && c >= edge;
      for (let r = 0; r < ggr; r++) LL.tiles[r][c] = 0;
      for (let r = ggr; r < HH; r++) LL.tiles[r][c] = pit ? 0 : 1;
      if (!pit) LL.tiles[ggr][c] = 2;
    }
    if (Array.isArray(g.entities)) g.entities.length = 0;  // Gegner/Items raus
    return ggr;
  };

  const out = {};

  // ── Horizontal: Top-Speed + Time-to-Max ────────────────────────────────
  // Feste Frame-Schleifen (kein Early-Break) + velX-Verlauf aufzeichnen → daraus
  // Top-Speed und Time-to-Max ableiten. Robuster als eine abbrechende Schleife.
  const runSpeedSeq = (opts) => {
    place(A + 8);
    const seq = [];
    for (let k = 0; k < 30; k++) { set(opts); g.testStep(1); seq.push(+g.player.velX.toFixed(3)); }
    return seq;
  };
  const walkSeq = runSpeedSeq({ ArrowRight: 1 });
  out.walkTop = +Math.max(...walkSeq).toFixed(2);
  out.ttmWalkF = walkSeq.findIndex((v) => v >= out.walkTop - 0.001) + 1;
  const runSeq = runSpeedSeq({ ArrowRight: 1, Shift: 1 });
  out.runTop = +Math.max(...runSeq).toFixed(2);
  out.ttmRunF = runSeq.findIndex((v) => v >= out.runTop - 0.001) + 1;

  // ── Stopping-Distance (Walk): auf Tempo, dann Loslassen bis Stillstand ──
  place(A + 8);
  for (let i = 0; i < 30; i++) { set({ ArrowRight: 1 }); g.testStep(1); }
  let x0 = g.player.x, sf = 0;
  for (; sf < 40; sf++) { set({}); g.testStep(1); if (Math.abs(g.player.velX) < 0.01) break; }
  out.stopDistWalkT = +((g.player.x - x0) / TS).toFixed(2); out.stopTimeWalkF = sf + 1;

  // ── Full-Speed-Reversal (Run): +Top nach −Top ──────────────────────────
  place(A + 30);
  for (let i = 0; i < 22; i++) { set({ ArrowRight: 1, Shift: 1 }); g.testStep(1); }
  let rf = 0; for (; rf < 90; rf++) { set({ ArrowLeft: 1, Shift: 1 }); g.testStep(1); if (g.player.velX <= -6.75) break; }
  out.reversalRunF = rf + 1;

  // ── Sprung: Höhe / Time-to-Apex / Airtime (16-Frame-Hold) ──────────────
  const jump = (holdF, run = false) => {
    place(A + 12);
    const y0 = g.player.y; let minY = y0, apexF = null, prevVy = 0, landF = null, air = false;
    // Anlauf für Run-Sprung
    if (run) for (let i = 0; i < 40; i++) { set({ ArrowRight: 1, Shift: 1 }); g.testStep(1); }
    const yj = g.player.y; minY = yj;
    for (let k = 0; k < 140; k++) {
      const keys = {}; if (k < holdF) keys.ArrowUp = 1; if (run) { keys.ArrowRight = 1; keys.Shift = 1; }
      set(keys); g.testStep(1);
      minY = Math.min(minY, g.player.y);
      if (!g.player.onGround) air = true;
      if (apexF === null && prevVy < 0 && g.player.velY >= 0) apexF = k;
      prevVy = g.player.velY;
      if (air && g.player.onGround && k > (apexF ?? 0) + 2) { landF = k; break; }
    }
    return { h: +((yj - minY) / TS).toFixed(2), apexF, landF };
  };
  const st = jump(16); out.jumpH = st.h; out.apexF = st.apexF; out.airF = st.landF;
  out.tapH = jump(1).h; out.halfH = jump(8).h; out.runJumpH = jump(16, true).h;

  // ── FPS-Invarianz: identische Höhe bei unterschiedlicher Tick-Chunkung ──
  const jumpChunk = (chunk) => {
    place(A + 12); const y0 = g.player.y; let minY = y0;
    for (let k = 0; k < 140; k += chunk) {
      set(k < 16 ? { ArrowUp: 1 } : {}); g.testStep(chunk);
      minY = Math.min(minY, g.player.y);
      if (k > 20 && g.player.onGround) break;
    }
    return +((y0 - minY) / TS).toFixed(2);
  };
  out.fpsH1 = jumpChunk(1); out.fpsH2 = jumpChunk(2); out.fpsH4 = jumpChunk(4);

  // ── P-Meter / Sprint-Boost: voll laden (≥60F Vollsprint), dann Sprung ─────
  // Prüft, dass der Boost-Sprung (a) lädt, (b) höher ist als der Run-Sprung und
  // (c) trotzdem NICHT floaty ist (Apex bleibt snappy — das Entfloaten gilt auch
  // für den geboosteten Bogen). Braucht eine lange, gegner-freie Flachstrecke.
  (() => {
    const ggr = freshLab(null); const p = g.player;
    p.x = (A + 5) * TS; p.y = (ggr - 4) * TS; p.velX = 0; p.velY = 0;
    K.clear(); for (let i = 0; i < 20; i++) { K.clear(); g.testStep(1); }
    let charged = false, cf = null;
    for (let f = 0; f < 130; f++) { set({ ArrowRight: 1, Shift: 1 }); g.testStep(1); if (!charged && p.isPCharged) { charged = true; cf = f; } if (charged && f > cf + 3) break; }
    out.pCharged = charged; out.pChargeF = cf;
    const yj = p.y; let minY = yj, apexF = null, prevVy = 0, landF = null, air = false;
    for (let k = 0; k < 140; k++) {
      const keys = { ArrowRight: 1, Shift: 1 }; if (k < 16) keys.ArrowUp = 1;
      set(keys); g.testStep(1);
      minY = Math.min(minY, p.y); if (!p.onGround) air = true;
      if (apexF === null && prevVy < 0 && p.velY >= 0) apexF = k; prevVy = p.velY;
      if (air && p.onGround && k > (apexF ?? 0) + 2) { landF = k; break; }
    }
    out.pBoostH = +((yj - minY) / TS).toFixed(2);
    out.pBoostApexF = apexF;
  })();

  // ── Coyote-Time (real gemessen): Fenster ~7 Frames. Figur läuft über eine
  //    Kante; Edge-Press am Airborne-Frame delayF → feuert der Sprung? ───────
  const coyoteFires = (delayF) => {
    const edge = A + 12, ggr = freshLab(edge), p = g.player;
    p.x = (edge - 3) * TS; p.y = (ggr - 4) * TS; p.velX = 0; p.velY = 0;
    K.clear(); for (let i = 0; i < 25; i++) { K.clear(); g.testStep(1); }
    let air = false, ac = 0, fired = false;
    for (let f = 0; f < 80; f++) {
      const keys = { ArrowRight: 1, Shift: 1 };
      if (air) { ac++; if (ac === delayF) keys.ArrowUp = 1; }
      set(keys); g.testStep(1);
      if (!p.onGround) air = true;
      if (air && ac >= delayF && p.velY < -5) { fired = true; break; }
      if (p.y > (ggr + 8) * TS) break;
    }
    return fired;
  };
  out.coyoteAt3 = coyoteFires(3);    // im Fenster → true
  out.coyoteAt6 = coyoteFires(6);    // noch im 7F-Fenster → true
  out.coyoteAt10 = coyoteFires(10);  // klar außerhalb → false

  // ── Jump-Buffer (real gemessen): Vorlauf-Fenster ~6 Frames. Figur fällt aus
  //    Höhe; Edge-Press preLandF Frames VOR Landung → feuert der Sprung? ──────
  const bufferFires = (preLandF) => {
    const drop = (pressAt) => {
      const ggr = freshLab(null), p = g.player;
      p.x = (A + 12) * TS; p.y = (ggr - 9) * TS; p.velX = 0; p.velY = 0; p.onGround = false; K.clear();
      let landed = null, fired = false;
      for (let f = 0; f < 120; f++) {
        const keys = {}; if (f === pressAt) keys.ArrowUp = 1;
        set(keys); g.testStep(1);
        if (landed === null && f > 2 && p.onGround) landed = f;
        if (pressAt >= 0 && f > pressAt && p.velY < -5) { fired = true; break; }
        if (landed !== null && f > landed + 15) break;
      }
      return { landed, fired };
    };
    const ref = drop(-1).landed; if (ref == null) return null;
    return drop(ref - preLandF).fired;
  };
  out.bufferAt2 = bufferFires(2);    // im Fenster → true
  out.bufferAt5 = bufferFires(5);    // im 6F-Fenster → true
  out.bufferAt10 = bufferFires(10);  // außerhalb → false

  return out;
});

await b.close();

// ── Gold Standard v1.1 Assertions ───────────────────────────────────────────
const checks = [];
const chk = (name, cond, got, want) => checks.push({ name, pass: !!cond, got, want });

chk('walkTopSpeed', M.walkTop >= 3.4 && M.walkTop <= 3.6, M.walkTop, '3.4–3.6');
chk('runTopSpeed', M.runTop >= 6.6 && M.runTop <= 7.0, M.runTop, '6.6–7.0 (v1.1)');
chk('timeToMaxWalk ≤10F', M.ttmWalkF <= 10, M.ttmWalkF + 'F', '≤10F');
chk('timeToMaxRun ≤12F', M.ttmRunF <= 12, M.ttmRunF + 'F', '≤12F');
chk('stopDistWalk ≤0.35T', Math.abs(M.stopDistWalkT) <= 0.35, M.stopDistWalkT + 'T', '≤0.35T');
chk('reversalRun ≤16F', M.reversalRunF <= 16, M.reversalRunF + 'F', '≤16F (~233ms)');
chk('jumpHeight 4.0–4.6T', M.jumpH >= 4.0 && M.jumpH <= 4.6, M.jumpH + 'T', '4.0–4.6T');
chk('timeToApex 300–400ms', M.apexF !== null && M.apexF * 1000 / 60 >= 300 && M.apexF * 1000 / 60 <= 400, M.apexF !== null ? Math.round(M.apexF * 1000 / 60) + 'ms' : 'n/a', '300–400ms');
chk('airtime 600–740ms', M.airF !== null && M.airF * 1000 / 60 >= 600 && M.airF * 1000 / 60 <= 740, M.airF !== null ? Math.round(M.airF * 1000 / 60) + 'ms' : 'n/a', '600–740ms');
chk('variableJump monoton', M.tapH < M.halfH && M.halfH < M.jumpH, `${M.tapH}<${M.halfH}<${M.jumpH}`, 'tap<half<max');
chk('runJump ≥ standJump', M.runJumpH >= M.jumpH, M.runJumpH + 'T', `≥ ${M.jumpH}T`);
chk('FPS-Invarianz (Tick-Chunk)', Math.abs(M.fpsH1 - M.fpsH2) <= 0.06 && Math.abs(M.fpsH1 - M.fpsH4) <= 0.06, `${M.fpsH1}/${M.fpsH2}/${M.fpsH4}`, 'gleich ±0.06T');
chk('Coyote feuert @3F', M.coyoteAt3 === true, String(M.coyoteAt3), 'true');
chk('Coyote feuert @6F', M.coyoteAt6 === true, String(M.coyoteAt6), 'true (Fenster ~7F)');
chk('Coyote NICHT @10F', M.coyoteAt10 === false, String(M.coyoteAt10), 'false');
chk('Jump-Buffer feuert @2F', M.bufferAt2 === true, String(M.bufferAt2), 'true');
chk('Jump-Buffer feuert @5F', M.bufferAt5 === true, String(M.bufferAt5), 'true (Fenster ~6F)');
chk('Jump-Buffer NICHT @10F', M.bufferAt10 === false, String(M.bufferAt10), 'false');
chk('P-Meter lädt (Vollsprint)', M.pCharged === true, String(M.pCharged), 'true');
chk('P-Boost > Run-Sprung', M.pBoostH > M.runJumpH, `${M.pBoostH}T`, `> ${M.runJumpH}T`);
chk('P-Boost Höhe 5.5–7.0T', M.pBoostH >= 5.5 && M.pBoostH <= 7.0, `${M.pBoostH}T`, '5.5–7.0T');
chk('P-Boost NICHT floaty (Apex ≤420ms)', M.pBoostApexF !== null && M.pBoostApexF * 1000 / 60 <= 420, M.pBoostApexF !== null ? Math.round(M.pBoostApexF * 1000 / 60) + 'ms' : 'n/a', '≤420ms');

console.log("MOVEMENT-LAB — Gold Standard v1.1");
console.log('─'.repeat(64));
for (const c of checks) {
  console.log(`${c.pass ? '✓' : '✗'} ${c.name.padEnd(28)} ist=${String(c.got).padEnd(16)} soll=${c.want}`);
}
const failed = checks.filter((c) => !c.pass);
console.log('─'.repeat(64));
if (failed.length === 0) {
  console.log(`✓ ALLE ${checks.length} MOVEMENT-CHECKS BESTANDEN.`);
  process.exit(0);
} else {
  console.log(`✗ ${failed.length}/${checks.length} CHECKS FEHLGESCHLAGEN: ${failed.map((c) => c.name).join(', ')}`);
  process.exit(1);
}
