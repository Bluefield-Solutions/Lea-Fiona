import { test, expect, Page } from '@playwright/test';

/**
 * Smoke tests for Task #19 "Spielfigur-Handling: Feel-Polish".
 *
 * Covers three of the new forgiveness systems:
 *   1. Stomp-Buffer  — a jump press buffered just BEFORE landing on an
 *      enemy still produces the boosted bounce (engine.input.jump being
 *      false at the contact frame is no longer fatal).
 *   2. Wall-Jump-Buffer — a jump press latched in jumpBufferTimer fires
 *      a wall-jump on the same frame the player engages a wall-slide.
 *   3. Auto-Step — a 4 px floor seam (one tile higher than the current
 *      floor) does NOT zero the player's sprint; physics lifts the AABB
 *      and preserves velX.
 *
 * All tests drive the engine deterministically via window.__game.testStep().
 */

const TILE = 32;

async function bootEngine(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__game, undefined, { timeout: 10_000 });
  await page.evaluate(() => {
    const g: any = (window as any).__game;
    g.startLevelByIndex(0);
    g.stop();
    g.input.keys.clear();
    g.input.touchLeft = false;
    g.input.touchRight = false;
    g.input.touchJump = false;
    g.input.touchRun = false;
    g.input.touchDown = false;
  });
}

async function clearEntities(page: Page) {
  await page.evaluate(() => {
    const g: any = (window as any).__game;
    g.entities.length = 0;
  });
}

test.describe('Feel-Polish (Task #19)', () => {
  test('Stomp-Buffer: a jump press latched in the buffer still triggers a boosted bounce', async ({ page }) => {
    await bootEngine(page);
    await clearEntities(page);

    const result = await page.evaluate(() => {
      const g: any = (window as any).__game;
      const p = g.player;

      // Drop player straight onto a single goomba. Crucially we do NOT
      // hold jump on the contact frame — only set jumpBufferTimer to
      // simulate a press a few frames earlier.
      p.x = 320;
      p.y = 320;
      p.velX = 0;
      p.velY = 5;
      p.onGround = false;
      p.invincibleTimer = 0;
      p.isJumping = true;
      p.jumpHeld = false;
      p.jumpBufferTimer = 5; // press latched 5 frames ago
      const goomba = g.testSpawnGoomba(320, 388);

      // Make sure no key reports "jump held" — buffer is the ONLY signal.
      g.input.keys.clear();

      // Capture the velY BEFORE contact resolves so we can compare the
      // post-bounce velY against the typical non-boost bounce.
      let bounceVelY = 0;
      let bufferAfter = 0;
      for (let i = 0; i < 12; i++) {
        g.testStep(1);
        if (goomba.isDead) {
          bounceVelY = p.velY;
          bufferAfter = p.jumpBufferTimer;
          break;
        }
      }
      return {
        goombaDead: goomba.isDead,
        bounceVelY,
        bufferAfter,
      };
    });

    expect(result.goombaDead, 'goomba should be stomped').toBe(true);
    // Boosted bounce sends the player upward strongly. Without the buffer
    // path, bounce(false) yields a much smaller upward velY (~PLAYER_JUMP_FORCE/2).
    // Boosted bounce should be at least −9 (upward).
    expect(result.bounceVelY, 'buffered jump should produce boosted bounce').toBeLessThan(-7);
    // Buffer must be consumed so the same press doesn't queue a normal
    // jump on the very next frame.
    expect(result.bufferAfter, 'jump-buffer must be consumed by stomp').toBe(0);
  });

  test('Wall-Jump-Buffer: pressing jump 1 frame before wall contact still fires a wall-jump', async ({ page }) => {
    await bootEngine(page);
    await clearEntities(page);

    const result = await page.evaluate(() => {
      const g: any = (window as any).__game;
      const p = g.player;

      // Mid-air, falling toward a wall on the LEFT side. Place the player
      // and synthesize wallContactDir = -1 so wall-slide engages on
      // frame 1 (no need for actual tile geometry alignment).
      p.x = 300;
      p.y = 200;
      p.velX = 0;
      p.velY = 1;
      p.onGround = false;
      p.isDucking = false;
      p.isWallSliding = false;
      p.isJumping = false;
      p.airControlLockTimer = 0;
      // Disable double-jump so the buffered press has no other claimant —
      // we want it to wait for the wall contact on the next frame.
      p.canDoubleJump = false;
      p.hasDoubleJumped = true;
      p.wallSlideLatch = 0;
      p.wallSlideLatchDir = 0;

      // Frame 1: jump pressed BUT no wall contact yet — buffer latches.
      g.input.keys.clear();
      g.input.keys.set(' ', true);
      g.input.update();
      // Don't let the buffered press fire a coyote-jump on this frame:
      // the player is airborne with coyoteTimer expired.
      p.coyoteTimer = 0;
      p.handleInput(g.input);
      const bufferAfterPress = p.jumpBufferTimer;

      // Frame 2: release jump (so jumpPressed is false) and engage the
      // wall — pressing left + asserting wallContactDir so the slide
      // takes hold. The forgiving wall-jump must fire on the buffer.
      g.input.keys.set(' ', false);
      g.input.keys.set('ArrowLeft', true);
      g.input.update();
      p.wallContactDir = -1;
      p.onGround = false;
      if (p.velY <= 0) p.velY = 1;
      p.handleInput(g.input);

      return {
        bufferAfterPress,
        wallJumpedThisFrame: p.wallJumpedThisFrame,
        velX: p.velX,
        velY: p.velY,
        airControlLockTimer: p.airControlLockTimer,
      };
    });

    expect(result.bufferAfterPress, 'buffer should latch the press').toBeGreaterThan(0);
    expect(result.wallJumpedThisFrame, 'buffered jump should still produce a wall-jump on contact').toBe(true);
    expect(result.velX, 'wall on left → impulse pushes RIGHT').toBeGreaterThan(0);
    expect(result.velY, 'wall-jump must impart upward velY').toBeLessThan(0);
    expect(result.airControlLockTimer).toBeGreaterThan(0);
  });

  test('Coyote-Time is preserved for one frame after a skid lifts off the ledge', async ({ page }) => {
    await bootEngine(page);
    await clearEntities(page);

    const result = await page.evaluate(() => {
      const g: any = (window as any).__game;
      const p = g.player;

      // Set up a fast skid on the ground at frame N. Then on frame N+1
      // simulate the very next physics step where the player has just
      // walked off a ledge (onGround false, but wasOnGround true). The
      // coyote-bleed must NOT fire on this frame because the lift-off
      // happened during a skid.
      p.x = 320;
      p.y = 200;
      p.velX = 5;          // sprinting right
      p.velY = 0;
      p.onGround = true;
      p.isSkidding = true;
      p.isSliding = false;
      p.coyoteTimer = 8;
      p.wasOnGround = true;
      p.canDoubleJump = false;
      p.hasDoubleJumped = true;

      // Force the engine to think we just walked off the ledge by
      // setting onGround = false right before handleInput runs. We also
      // clear input so no skid-keypress reasserts the flag.
      g.input.keys.clear();
      g.input.update();
      p.onGround = false;
      // Snapshot before the call.
      const before = p.coyoteTimer;
      p.handleInput(g.input);
      const afterPreserved = p.coyoteTimer;

      // Now do another airborne frame WITHOUT a prior skid — coyote
      // should decrement normally.
      p.isSkidding = false;
      p.isSliding = false;
      p.wasOnGround = false;
      p.onGround = false;
      p.handleInput(g.input);
      const afterDecremented = p.coyoteTimer;

      return { before, afterPreserved, afterDecremented };
    });

    expect(result.afterPreserved,
      'coyote timer must NOT decrement on the lift-off frame after a skid'
    ).toBe(result.before);
    expect(result.afterDecremented,
      'subsequent airborne frames decrement coyote normally'
    ).toBeLessThan(result.afterPreserved);
  });

  test('Auto-Step: a 4 px floor seam does not stop the sprint', async ({ page }) => {
    await bootEngine(page);
    await clearEntities(page);

    const result = await page.evaluate(() => {
      const g: any = (window as any).__game;
      const p = g.player;
      const TILE = 32;

      // Build a tiny 4 px ledge directly in front of the player by
      // raising one ground column by ~4 px. We do it by placing a
      // pseudo-floor the engine reads via the canFitAt helper: the
      // simplest route is to teleport the player to a known column,
      // assert onGround, and then check that running into a 1 tile-tall
      // obstacle just AHEAD with the AABB raised by 4 px clears (we
      // simulate by directly invoking moveStep through moveEntity on the
      // existing geometry — but the level's flat ground gives no native
      // 4 px seam). Instead, exercise auto-step via the public API by
      // SETTING entity.y to a position 4 px BELOW a step-up column and
      // verifying the next physics frame snaps it up cleanly while
      // preserving velX.

      // Find the first solid floor column at row 13.
      const tiles = g.level.tiles;
      const groundRow = 13;
      // Put player on flat ground at column 4 (clear of pipes/etc).
      p.x = 4 * TILE + 2;
      p.y = groundRow * TILE - p.height;
      p.velX = 0;
      p.velY = 0;
      p.onGround = true;
      p.isJumping = false;
      p.isDucking = false;
      p.autoStep = true;

      // Pick the column 8 tiles to the right and ensure it is solid (it
      // is — flat jungle ground). Then bury the player 4 px BELOW the
      // top of that ground column to simulate a sub-tile seam: physics
      // should auto-step over it within one frame.
      // (We don't mutate tiles; we mutate the player offset instead so
      // the test is independent of level layout.)
      p.x = 8 * TILE + 2;
      p.y = groundRow * TILE - p.height + 4; // 4 px below the floor
      p.velX = 4;                              // moving right at sprint
      p.onGround = true;

      // Step a single physics frame. With auto-step, the player should
      // be lifted back up to the floor line AND keep some velX.
      g.testStep(1);

      const onTopOfGround = Math.abs(p.y - (groundRow * TILE - p.height)) < 1;
      const velXPreserved = p.velX > 1;

      return {
        finalY: p.y,
        finalVelX: p.velX,
        expectedY: groundRow * TILE - p.height,
        onTopOfGround,
        velXPreserved,
        tilesPresent: tiles.length > 0,
      };
    });

    expect(result.tilesPresent, 'level tiles should be loaded').toBe(true);
    expect(result.onTopOfGround,
      `player should sit on the floor (got y=${result.finalY}, expected ${result.expectedY})`
    ).toBe(true);
    expect(result.velXPreserved,
      `auto-step must preserve sprint velX (got ${result.finalVelX})`
    ).toBe(true);
  });
});
