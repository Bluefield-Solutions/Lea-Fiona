import { test, expect, Page } from '@playwright/test';

/**
 * Regressions for Task #20 (audit bug-fixes):
 *  - Power-down cascade Fire → Cape → Powered → Small → Dead
 *  - Frozen-Enemy intangibility under the Zeitlupen-Uhr
 *  - MagicBolt fizzles on solid tiles
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

test.describe('Audit bug-fixes (task #20)', () => {
  test('Power-down cascade: Fire → Cape → Powered → Small → Dead', async ({ page }) => {
    await bootEngine(page);
    await clearEntities(page);

    // Equip both fire AND cape on top of the grown player. invincibleTimer
    // is cleared between hits so each playerHit() takes effect cleanly.
    const start = await page.evaluate(() => {
      const g: any = (window as any).__game;
      const p = g.player;
      p.applyFire();   // hasFire=true, isPoweredUp=true, iframes ~30
      p.applyCape();   // hasCape=true (still powered), iframes max
      p.invincibleTimer = 0;
      return { hasFire: p.hasFire, hasCape: p.hasCape, isPoweredUp: p.isPoweredUp, isDead: p.isDead, lives: p.lives };
    });
    expect(start.hasFire).toBe(true);
    expect(start.hasCape).toBe(true);
    expect(start.isPoweredUp).toBe(true);
    expect(start.isDead).toBe(false);

    // Hit 1: should drop FIRE only.
    const afterHit1 = await page.evaluate(() => {
      const g: any = (window as any).__game;
      g.playerHit();
      const p = g.player;
      p.invincibleTimer = 0;
      return { hasFire: p.hasFire, hasCape: p.hasCape, isPoweredUp: p.isPoweredUp, isDead: p.isDead };
    });
    expect(afterHit1.hasFire).toBe(false);
    expect(afterHit1.hasCape).toBe(true);
    expect(afterHit1.isPoweredUp).toBe(true);
    expect(afterHit1.isDead).toBe(false);

    // Hit 2: should drop CAPE only.
    const afterHit2 = await page.evaluate(() => {
      const g: any = (window as any).__game;
      g.playerHit();
      const p = g.player;
      p.invincibleTimer = 0;
      return { hasFire: p.hasFire, hasCape: p.hasCape, isPoweredUp: p.isPoweredUp, isDead: p.isDead };
    });
    expect(afterHit2.hasCape).toBe(false);
    expect(afterHit2.isPoweredUp).toBe(true);
    expect(afterHit2.isDead).toBe(false);

    // Hit 3: should SHRINK (lose powered, still alive).
    const afterHit3 = await page.evaluate(() => {
      const g: any = (window as any).__game;
      g.playerHit();
      const p = g.player;
      p.invincibleTimer = 0;
      return { isPoweredUp: p.isPoweredUp, isDead: p.isDead };
    });
    expect(afterHit3.isPoweredUp).toBe(false);
    expect(afterHit3.isDead).toBe(false);

    // Hit 4: should DIE.
    const afterHit4 = await page.evaluate(() => {
      const g: any = (window as any).__game;
      g.playerHit();
      return { isDead: g.player.isDead };
    });
    expect(afterHit4.isDead).toBe(true);
  });

  test('Frozen enemies are intangible to player contact', async ({ page }) => {
    await bootEngine(page);
    await clearEntities(page);

    // Position the (small) player on the ground with a Goomba spawned
    // exactly on top of the player's hitbox, then freeze the world.
    const result = await page.evaluate(() => {
      const g: any = (window as any).__game;
      const p = g.player;
      p.x = 100;
      p.y = 13 * 32 - p.height;
      p.velX = 0;
      p.velY = 0;
      p.invincibleTimer = 0;
      p.starTimer = 0;
      // Drop a goomba directly overlapping the player.
      g.testSpawnGoomba(p.x + 4, p.y);
      // Activate the clock — engine.clockFrozen reads from player.slowTimer.
      p.applyClock();
      const livesBefore = p.lives;
      const isDeadBefore = p.isDead;
      // Step a few frames; without the fix, the goomba would tick the
      // player into a hurt/death.
      g.testStep(5);
      return { livesBefore, livesAfter: p.lives, isDead: p.isDead, isDeadBefore, frozen: g.clockFrozen };
    });
    expect(result.frozen).toBe(true);
    expect(result.isDead).toBe(false);
    expect(result.livesAfter).toBe(result.livesBefore);
  });

  test('MagicBolt fizzles when crossing into a solid tile', async ({ page }) => {
    await bootEngine(page);
    await clearEntities(page);

    // Place a bolt one tile to the LEFT of the ground row's solid tile
    // (col 5, row 13 is solid ground in jungle level), aimed RIGHT, then
    // step. The bolt's center will enter the solid tile and must die.
    const dead = await page.evaluate(() => {
      const g: any = (window as any).__game;
      // Sanity-check: there's solid ground on row 13.
      const isSolid = g.physics.isSolid(5, 13);
      // Spawn a bolt INSIDE the ground tile so the next tile-check kills it.
      const dirRight = 1; // Direction.RIGHT
      const bolt = g.acquireMagicBolt(5 * 32 + 8, 13 * 32 + 8, dirRight);
      g.entities.push(bolt);
      g.testStep(2);
      return { isSolid, alive: bolt.alive };
    });
    expect(dead.isSolid).toBe(true);
    expect(dead.alive).toBe(false);
  });
});
