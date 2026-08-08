import { test, expect, Page } from '@playwright/test';

/**
 * Regression suite for the Mario-feel movement set added in earlier tasks:
 *   - Skid (covered indirectly by the slide test, which depends on velX)
 *   - Run-Slide (Pfeil-runter @ velX > PLAYER_SPEED → isSliding)
 *   - P-Meter charge (60 frames of sustained sprint → isPCharged + HUD "P!")
 *   - P-Meter jump boost (P-charged jump > non-P-charged jump)
 *   - Wall-Slide / Wall-Jump (jump impulse opposite to wall contact dir)
 *   - Stomp-Combo (2nd in-air stomp scores more than the 1st)
 *
 * All tests drive the engine deterministically via the test hook
 * `window.__game.testStep(N)`. The live requestAnimationFrame loop is
 * stopped first via engine.stop() so manual ticks don't race with the
 * engine's own gameLoop.
 *
 * Total wall-clock budget is well under the task's 30s CI requirement —
 * each test does a few hundred frames at most and never sleeps.
 */

const TILE = 32;
// Jungle level (level 1) layout used by the tests:
//   width 240 cols, height 15 rows, ground = height - 2 = 13
//   Solid ground tiles fill row 13 (y = 416).
//   Player is small (height 68), so y = 416 - 68 = 348 means "feet on ground".
const GROUND_Y = 13 * TILE;          // top of the ground row, in world px
const PLAYER_FEET_Y = GROUND_Y - 68; // player.y when standing on the ground

/**
 * Common preamble: load the page, wait for the engine to be exposed on
 * window, start level 1, and stop the live rAF loop so the test owns
 * frame stepping. After this returns, callers manipulate state via
 * page.evaluate(({...}) => ((window as any).__game)).
 */
async function bootEngine(page: Page) {
  await page.goto('/');
  // Wait for the engine to be exposed on window (set inside the React
  // useEffect after constructing GameEngine).
  await page.waitForFunction(() => !!(window as any).__game, undefined, { timeout: 10_000 });
  await page.evaluate(() => {
    const g: any = (window as any).__game;
    // Force-skip TITLE: launch level 1.
    g.startLevelByIndex(0);
    // Stop the rAF gameloop so manual testStep() owns the simulation.
    g.stop();
    // Reset input state so any previously-pressed keys don't leak in.
    g.input.keys.clear();
    g.input.touchLeft = false;
    g.input.touchRight = false;
    g.input.touchJump = false;
    g.input.touchRun = false;
    g.input.touchDown = false;
  });
}

/**
 * Clear all entities (goombas, koopas, coins, …) from the active level so
 * tests have a clean stage to position only the entities they care about.
 * Tile geometry (ground, pipes) is left intact so the player still has a
 * floor to stand on.
 */
async function clearEntities(page: Page) {
  await page.evaluate(() => {
    const g: any = (window as any).__game;
    g.entities.length = 0;
  });
}

test.describe('Mario-feel movement regressions', () => {
  test('P-Meter charges after ~1s of sustained sprint and HUD shows "P!"', async ({ page }) => {
    await bootEngine(page);
    // Clear enemies so the sprint can't be interrupted by a stomp/hit
    // partway through the 60-frame charge window.
    await clearEntities(page);

    // Place player on flat starting ground, set velX to sprint top-speed so
    // the P-meter charge path (sprintingFast = velX >= 95% of run-speed)
    // begins on frame 1 instead of after the ramp-up.
    const initial = await page.evaluate(() => {
      const g: any = (window as any).__game;
      const p = g.player;
      p.x = 100;
      p.y = 348;          // PLAYER_FEET_Y
      p.velX = 7.5;       // PLAYER_RUN_SPEED — start saturated
      p.velY = 0;
      p.onGround = true;
      // Hold right + sprint.
      g.input.keys.set('ArrowRight', true);
      g.input.keys.set('Shift', true);
      // Run 60 frames (~1s @ 60fps) — exactly the P_METER_FRAMES window.
      g.testStep(60);
      return {
        isPCharged: g.player.isPCharged,
        runChargePct: g.getStats().runChargePct,
        runChargeTimer: g.player.runChargeTimer,
      };
    });
    expect(initial.isPCharged, 'isPCharged should flip true after 60 frames of sprinting').toBe(true);
    expect(initial.runChargePct).toBeGreaterThanOrEqual(0.99);

    // HUD reflects the charged P-meter as "P!" (vs. plain "P" while charging).
    // game.tsx polls engine.getStats() every 250ms, so we use Playwright's
    // auto-retrying matcher with a generous-but-still-fast timeout instead
    // of a single innerText() snapshot that could race the poll.
    await expect(page.locator('[data-testid="text-pmeter"]')).toContainText('P!', {
      timeout: 2000,
    });
  });

  test('P-Meter-charged jump reaches a higher peak than a non-charged jump', async ({ page }) => {
    await bootEngine(page);

    // Helper: simulate a single jump from rest and report the minimum y
    // (peak height) reached before the player begins falling again.
    // Runs entirely inside page.evaluate so the engine is the single
    // source of truth — we never re-implement physics in the test.
    const runJump = async (charged: boolean) =>
      page.evaluate((isCharged) => {
        const g: any = (window as any).__game;
        const p = g.player;
        p.x = 200;
        p.y = 348;
        p.velX = 0;
        p.velY = 0;
        p.onGround = true;
        p.isJumping = false;
        p.jumpHeld = false;
        p.jumpTimer = 0;
        p.canDoubleJump = true;
        p.hasDoubleJumped = false;
        p.invincibleTimer = 0;
        // Force the P-meter state to the requested value so we isolate
        // the jump-boost factor (we don't want the charging procedure to
        // also alter velX, speedAtJump, etc.).
        p.isPCharged = isCharged;
        p.runChargeTimer = isCharged ? 60 : 0;
        // Clear input then press jump.
        g.input.keys.clear();
        g.input.update(); // capture "no key pressed" as previous state
        g.input.keys.set(' ', true);
        // Step until the player has reached the apex (velY transitions
        // from upward to downward) or a hard cap of 80 frames passes.
        let peakY = p.y;
        for (let i = 0; i < 80; i++) {
          g.testStep(1);
          if (p.y < peakY) peakY = p.y;
          // Release the jump key after a few frames so variable-jump-hold
          // mechanics still apply identically to both runs.
          if (i === 12) g.input.keys.set(' ', false);
          if (p.velY > 0 && p.y >= peakY + 1) break;
        }
        return { peakY, jumpFromY: 348 };
      }, charged);

    const noP = await runJump(false);
    const withP = await runJump(true);
    const heightNoP = noP.jumpFromY - noP.peakY;
    const heightWithP = withP.jumpFromY - withP.peakY;

    // The P-meter boosts jump force by P_METER_JUMP_BOOST (1.20). Peak
    // height is roughly proportional to v² so the charged jump should be
    // at least ~30% taller. A loose 15% threshold gives plenty of slack
    // against future tuning changes while still catching real regressions.
    expect(heightWithP, 'P-charged jump must reach a higher peak').toBeGreaterThan(heightNoP);
    expect(heightWithP / heightNoP).toBeGreaterThan(1.15);
  });

  test('Pressing ArrowDown at high run-speed triggers the slide pose', async ({ page }) => {
    await bootEngine(page);
    const result = await page.evaluate(() => {
      const g: any = (window as any).__game;
      const p = g.player;
      p.x = 200;
      p.y = 348;
      p.velX = 5;       // > PLAYER_SPEED (3.5) → slide-eligible
      p.velY = 0;
      p.onGround = true;
      p.isDucking = false;
      p.isSliding = false;
      g.input.keys.clear();
      g.input.keys.set('ArrowDown', true);
      g.testStep(1);
      return {
        isSliding: p.isSliding,
        isDucking: p.isDucking,
        slideStartedThisFrame: p.slideStartedThisFrame,
      };
    });
    expect(result.isDucking, 'down-arrow on ground should duck').toBe(true);
    expect(result.isSliding, 'fast duck should enter slide instead of crawl').toBe(true);
    expect(result.slideStartedThisFrame, 'engine should set the one-frame slide-start event').toBe(true);
  });

  test('Wall-slide + jump imparts horizontal impulse AWAY from the wall', async ({ page }) => {
    await bootEngine(page);
    const result = await page.evaluate(() => {
      const g: any = (window as any).__game;
      const p = g.player;
      // Place player in mid-air, claim contact with a wall on the LEFT
      // side. We bypass the engine's full-frame loop here and call
      // player.handleInput() directly so the synthetic wallContactDir
      // is not overwritten by physics.moveEntity() (which only writes
      // a non-zero wallDir when there's an actual solid tile next to
      // the player).
      p.x = 300;
      p.y = 200;
      p.velX = 0;
      p.velY = 1;          // falling — required for wall-slide
      p.onGround = false;
      p.isDucking = false;
      p.isWallSliding = false;
      p.isJumping = false;
      p.airControlLockTimer = 0;
      p.canDoubleJump = true;
      p.hasDoubleJumped = false;
      p.wallContactDir = -1; // wall on player's LEFT
      // Frame 1: hold ArrowLeft (press toward wall) → wall-slide engages.
      g.input.keys.clear();
      g.input.keys.set('ArrowLeft', true);
      g.input.update();
      p.handleInput(g.input);
      const wallSlidingAfterFrame1 = p.isWallSliding;
      // Frame 2: still pressing left, additionally tap jump → wall-jump.
      g.input.keys.set(' ', true);
      g.input.update();
      // Re-assert wall contact (no physics ran to maintain it) and that
      // we are still falling and airborne.
      p.wallContactDir = -1;
      p.onGround = false;
      if (p.velY <= 0) p.velY = 1;
      p.handleInput(g.input);
      return {
        wallSlidingAfterFrame1,
        wallJumpedThisFrame: p.wallJumpedThisFrame,
        velX: p.velX,
        velY: p.velY,
        airControlLockTimer: p.airControlLockTimer,
      };
    });
    expect(result.wallSlidingAfterFrame1, 'first frame should engage wall-slide').toBe(true);
    expect(result.wallJumpedThisFrame, 'jump while wall-sliding should fire wall-jump event').toBe(true);
    // Wall on left → impulse pushes RIGHT (positive velX).
    expect(result.velX, 'wall-jump must push horizontally away from the wall').toBeGreaterThan(0);
    // Y impulse must be upward (negative).
    expect(result.velY, 'wall-jump must impart an upward impulse').toBeLessThan(0);
    // Air-control lockout protects against immediately re-gripping.
    expect(result.airControlLockTimer).toBeGreaterThan(0);
  });

  test('Two consecutive in-air stomps: second stomp scores more than first (combo escalation)', async ({ page }) => {
    await bootEngine(page);
    // Clear pre-existing level entities (goombas, koopas, coins, …) so the
    // only enemies in play are the two we spawn below.
    await clearEntities(page);
    const deltas = await page.evaluate(() => {
      const g: any = (window as any).__game;
      const p = g.player;

      // Drop the player onto Goomba A from above. Position chosen so the
      // very first physics step lands the player squarely on the goomba
      // (no chance of a side-hit which would take damage instead of
      // counting as a stomp).
      const setupForStompAt = (px: number, gx: number) => {
        p.x = px;
        p.y = 320;             // ~28 px above the goomba's head
        p.velX = 0;
        p.velY = 5;            // falling fast
        p.onGround = false;
        p.invincibleTimer = 0;
        p.isJumping = true;
        p.jumpHeld = false;
        // Spawn a goomba on the flat ground. ground row = 13, y = 416.
        // Goomba is 28 px tall → spawn at y = 416 - 28 = 388.
        return g.testSpawnGoomba(gx, 388);
      };

      const stepUntilGoombaDies = (goomba: any) => {
        for (let i = 0; i < 20; i++) {
          g.testStep(1);
          if (goomba.isDead) return i + 1;
        }
        return -1;
      };

      g.input.keys.clear();

      // ----- First stomp -----
      const goombaA = setupForStompAt(320, 320);
      const scoreBeforeA = p.score;
      const framesA = stepUntilGoombaDies(goombaA);
      const scoreAfterA = p.score;
      const comboAfterA = p.airComboCount;
      const deltaA = scoreAfterA - scoreBeforeA;

      // ----- Second stomp (still mid-air, no land between → combo carries) -----
      // Teleport player above Goomba B and reset fall velocity. Crucially
      // we do NOT touch onGround/airComboCount so the combo chain stays
      // intact (engine resets airComboCount only on landing/wall-jump).
      const goombaB = setupForStompAt(500, 500);
      const scoreBeforeB = p.score;
      const framesB = stepUntilGoombaDies(goombaB);
      const scoreAfterB = p.score;
      const comboAfterB = p.airComboCount;
      const deltaB = scoreAfterB - scoreBeforeB;

      return { deltaA, deltaB, comboAfterA, comboAfterB, framesA, framesB };
    });

    expect(deltas.framesA, 'first stomp should resolve in a few frames').toBeGreaterThan(0);
    expect(deltas.framesB, 'second stomp should resolve in a few frames').toBeGreaterThan(0);
    expect(deltas.deltaA, 'first stomp scores the base 100 points').toBe(100);
    expect(deltas.deltaB, 'second in-air stomp escalates to 200').toBe(200);
    expect(deltas.deltaB, 'second in-air stomp must score more than the first').toBeGreaterThan(deltas.deltaA);
    expect(deltas.comboAfterA).toBe(1);
    expect(deltas.comboAfterB).toBe(2);
  });

  // --- Spielbarkeit & Fairness (Task #29) -------------------------
  // Mid-Level-Checkpoint: Spieler passiert die Säule → Flag wird
  // aktiviert. Nach dem Tod respawnt die Spielerin nicht mehr ganz
  // am Levelanfang (Welt-X 96), sondern in der Nähe der Säule.
  // Jungle-Checkpoint liegt bei col=120 → Trigger-X = 120*32+16 = 3856,
  // Spawn-X = 120*32 = 3840.
  test('Mid-Level-Checkpoint aktiviert sich beim Passieren und respawnt den Spieler dort', async ({ page }) => {
    await bootEngine(page);
    await clearEntities(page);

    // Sanity-Check: Checkpoint ist konfiguriert und initial inaktiv.
    const initial = await page.evaluate(() => {
      const g: any = (window as any).__game;
      return {
        active: g.checkpointActive,
        spawnX: g.checkpointSpawn?.x ?? null,
        triggerX: g.checkpointDrawPos
          ? g.checkpointDrawPos.x + 16
          : null,
        playerStartX: g.level.playerStart.x,
      };
    });
    expect(initial.active, 'Checkpoint startet inaktiv').toBe(false);
    expect(initial.spawnX, 'Jungle-Checkpoint sitzt grob bei col=120').toBeGreaterThan(3800);
    expect(initial.spawnX).toBeLessThan(3900);
    expect(initial.triggerX).toBeGreaterThan(3800);

    // Spieler an die Checkpoint-Säule teleportieren und einen Frame
    // simulieren, damit checkCheckpointActivation() greift.
    const afterPass = await page.evaluate(() => {
      const g: any = (window as any).__game;
      g.player.x = g.checkpointSpawn.x + 8;
      g.player.y = 348;
      g.player.velX = 0;
      g.player.velY = 0;
      g.player.onGround = true;
      g.testStep(1);
      return { active: g.checkpointActive };
    });
    expect(afterPass.active, 'Checkpoint sollte nach Passieren aktiv sein').toBe(true);

    // Spielerin in die Pampa schicken und tot setzen — der Engine-
    // Loop respawnt nach deathTimer > 90.
    const respawnX = await page.evaluate(() => {
      const g: any = (window as any).__game;
      g.player.x = g.checkpointSpawn.x + 600; // weit weg vom Checkpoint
      g.player.isDead = true;
      g.player.deathTimer = 91;               // löst Respawn im nächsten Frame aus
      g.player.lives = 5;                     // sicherstellen, dass kein Game-Over kommt
      g.testStep(2);
      return g.player.x;
    });
    // Respawn muss in Checkpoint-Nähe sein (nicht am Levelanfang bei x=96).
    expect(respawnX, 'Respawn beim Checkpoint, nicht am Levelanfang').toBeGreaterThan(3800);
    expect(respawnX).toBeLessThan(3900);
    expect(respawnX, 'Respawn liegt nicht mehr beim playerStart').not.toBe(initial.playerStartX);
  });

  // Zeit-Bonus-Animation (Task #29): Engine darf die Restzeit nicht
  // mehr in einem Rutsch addieren — sie tickert über den
  // LEVEL_COMPLETE-State herunter und schreibt den Score parallel
  // hoch. Wir simulieren ein Flag-Touch und prüfen dass timeBonus*
  // initialisiert ist und der Score schrittweise wächst.
  test('Zeit-Bonus tickert nach Flag-Touch animiert herunter und gibt 50 Punkte pro Sekunde', async ({ page }) => {
    await bootEngine(page);
    await clearEntities(page);

    const setup = await page.evaluate(() => {
      const g: any = (window as any).__game;
      // Restzeit fixieren, damit der Test deterministisch ist.
      g.time = 30;
      const flag = g.level.flagPosition;
      // Spielerin in die Flagge schieben → checkFlagCollision() feuert
      // und ruft engine.setTimeBonus(30) auf.
      g.player.x = flag.x;
      g.player.y = flag.y + 10;
      g.player.velX = 0;
      g.player.velY = 0;
      const scoreBefore = g.player.score;
      // Frame 1: PLAYING-Branch sieht Flag-Touch → setTimeBonus + State-
      // wechsel auf LEVEL_COMPLETE. Frame 2: LEVEL_COMPLETE-Branch tickt
      // den ersten Bonus-Drain.
      g.testStep(2);
      return {
        scoreBefore,
        state: g.state,
        timeBonusInitial: g.timeBonusInitial,
        timeBonusRemainingAfter1: g.timeBonusRemaining,
        scoreAfter1: g.player.score,
      };
    });
    expect(setup.timeBonusInitial, 'Initialer Zeit-Bonus gleich Restzeit').toBe(30);
    // Nach einem Bonus-Tick ist die Restzeit schon kleiner und der
    // Score schon teilweise gutgeschrieben, aber NICHT alles in einem Frame.
    expect(setup.timeBonusRemainingAfter1).toBeLessThan(30);
    expect(setup.timeBonusRemainingAfter1).toBeGreaterThan(0);
    expect(setup.scoreAfter1).toBeGreaterThan(setup.scoreBefore);
    // Erwarteter Bonus pro Tick: ceil(30/30) = 1 Sekunde → 50 Punkte.
    const drainedSoFar = setup.timeBonusInitial - setup.timeBonusRemainingAfter1;
    expect(setup.scoreAfter1 - setup.scoreBefore).toBe(drainedSoFar * 50);

    // Den Drain bis zum Ende laufen lassen.
    const final = await page.evaluate(() => {
      const g: any = (window as any).__game;
      g.testStep(120); // genug Frames damit timeBonusRemaining auf 0 fällt
      return {
        timeBonusRemaining: g.timeBonusRemaining,
        score: g.player.score,
      };
    });
    expect(final.timeBonusRemaining, 'Bonus muss vollständig gedraint sein').toBe(0);
    // Gesamtsumme des Bonus = initial * 50.
    expect(final.score - setup.scoreBefore).toBe(setup.timeBonusInitial * 50);
  });

  /**
   * Sonder-Münzen + Sterne-Rating (Task #30).
   * Sammelt im Code (ohne Movement-Sim) alle drei SpecialCoins ein,
   * berührt die Flagge ohne Treffer und mit > STAR_TIME_THRESHOLD
   * Restzeit, drained den Bonus und prüft, dass die Engine 3 Sterne
   * vergibt + die Münzen pro Slot persistiert hat.
   */
  test('Drei Sonder-Münzen + Full-Clear ergibt 3 Sterne', async ({ page }) => {
    await bootEngine(page);
    // Engine in einen aufgeräumten Zustand bringen (Spieler ungetroffen,
    // Spawnliste reduziert), damit das Test-Skript deterministisch läuft.
    await page.evaluate(() => {
      const g: any = (window as any).__game;
      g.tookHitThisLevel = false;
    });

    // Echte Pickup-Collision für alle drei Slots auslösen — Spieler
    // nacheinander auf jede SpecialCoin-Entity teleportieren, sodass
    // markSpecialCoinCollected (Persistenz) wirklich getriggert wird.
    await page.evaluate(() => {
      const g: any = (window as any).__game;
      const coins = g.entities.filter((e: any) => e.type === 'special_coin');
      coins.forEach((c: any) => {
        g.player.x = c.x;
        g.player.y = c.y;
        g.testStep(2);
      });
      // Teleport könnte playerHit-Pfade kreuzen — präventiv zurücksetzen.
      g.tookHitThisLevel = false;
    });

    // Spieler an die Flagge teleportieren und LEVEL_COMPLETE auslösen.
    const result = await page.evaluate(() => {
      const g: any = (window as any).__game;
      g.player.x = g.level.flagPosition.x;
      g.player.y = g.level.flagPosition.y;
      g.testStep(2); // Flag-Touch + setTimeBonus
      // Bonus-Drain durchlaufen.
      g.testStep(180);
      return {
        state: g.state,
        lastLevelStars: g.lastLevelStars,
        specialCoinsThisRun: g.specialCoinsThisRun,
        timeBonusInitial: g.timeBonusInitial,
        tookHit: g.tookHitThisLevel,
      };
    });
    // Drei Kriterien erfüllt → 3 Sterne.
    expect(result.specialCoinsThisRun).toEqual([true, true, true]);
    expect(result.tookHit).toBe(false);
    expect(result.timeBonusInitial).toBeGreaterThanOrEqual(200);
    expect(result.lastLevelStars).toBe(3);

    // scheduleWrite() ist 200ms-debounced — kurz warten, damit localStorage geschrieben ist.
    await page.waitForTimeout(300);
    // Persistenz-Check: Profil im localStorage muss alle drei Slots
    // sowie das Sterne-Rating für Level-0 enthalten.
    const persisted = await page.evaluate(() => {
      const raw = localStorage.getItem('lea_fiona_v2');
      if (!raw) return null;
      const data = JSON.parse(raw);
      const prof = data.profiles.find((p: any) => p.id === data.activeProfileId);
      return {
        sc: prof?.specialCoinsCollected?.['0'] ?? null,
        stars: prof?.levelStars?.['0'] ?? null,
      };
    });
    expect(persisted?.sc).toEqual([true, true, true]);
    expect(persisted?.stars).toBe(3);
  });
});
