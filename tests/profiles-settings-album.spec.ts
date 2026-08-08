import { test, expect, Page } from '@playwright/test';

/**
 * E2E coverage for the multi-profile system, the settings modal, and the
 * sticker album. These flows are otherwise only manually-verified, so the
 * suite below catches regressions in:
 *
 *   - Profile create / switch / delete and persistence across reload
 *   - Per-profile unlocked-level swap when switching profiles
 *   - Settings modal: music/SFX sliders + screen-shake/vibration toggles
 *     persist into storage and survive a page reload
 *   - Completing level 1 grants the `first_steps` sticker, which then
 *     shows as unlocked in the album modal
 *
 * All tests pre-seed `localStorage` (key `lea_fiona_v2`) before the page
 * loads so each test starts from a known, isolated state and never
 * depends on previous tests. Each one runs only a handful of frames via
 * the engine's `testStep()` hook so the suite stays well within the
 * existing 30s wall-clock budget.
 */

const STORAGE_KEY = 'lea_fiona_v2';

interface SeedSettings {
  musicVolume?: number;
  sfxVolume?: number;
  screenShake?: boolean;
  vibration?: boolean;
  muted?: boolean;
}
interface SeedProfile {
  id: string;
  name: string;
  unlockedLevels?: number;
  bestScores?: number[];
  totalCoins?: number;
  stickers?: string[];
  settings?: SeedSettings;
}
interface SeedSave {
  profiles: SeedProfile[];
  activeId: string;
}

/**
 * Pre-seed `localStorage` BEFORE the page script runs so the `safeRead()`
 * cache in storage.ts is populated from our fixture instead of the
 * default Lea+Fiona pair. Use `addInitScript` so the seed survives any
 * navigation in the test (including reload()).
 */
async function seedStorage(page: Page, save: SeedSave | null) {
  // Only seed when localStorage is empty so a reload during the test
  // does NOT overwrite the user-mutated state we're trying to verify.
  await page.addInitScript(({ key, save }) => {
    try {
      if (!save) {
        return;
      }
      if (localStorage.getItem(key)) return;
      const DEFAULTS = {
        musicVolume: 0.45,
        sfxVolume: 0.8,
        screenShake: true,
        vibration: true,
        muted: false,
      };
      localStorage.setItem(key, JSON.stringify({
        version: 2,
        activeProfileId: save.activeId,
        profiles: save.profiles.map(p => ({
          id: p.id,
          name: p.name,
          unlockedLevels: p.unlockedLevels ?? 1,
          bestScores: p.bestScores ?? [],
          totalCoins: p.totalCoins ?? 0,
          stickers: p.stickers ?? [],
          settings: { ...DEFAULTS, ...(p.settings ?? {}) },
        })),
      }));
    } catch { /* ignore quota / private mode */ }
  }, { key: STORAGE_KEY, save });
}

/**
 * Boot the page, wait for the engine hook, and stop the rAF loop. We
 * also set up a generic dialog auto-accept so window.confirm() (used
 * for the delete-profile guard) never blocks the test.
 */
async function bootPage(page: Page) {
  page.on('dialog', d => { d.accept().catch(() => { /* ignore */ }); });
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__game, undefined, { timeout: 10_000 });
  await page.evaluate(() => {
    const g: any = (window as any).__game;
    g.stop();
  });
}

/**
 * Read settings for the active profile by invoking the live
 * storage.getSettings() (exposed on window via the test hook in
 * game.tsx). This goes through the same sanitiser/defaulting code
 * the engine uses at runtime, so the assertion catches regressions
 * in getSettings() too — not just localStorage shape.
 */
async function readSettingsViaStorage(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__storage;
    return s?.getSettings ? s.getSettings() : null;
  });
}

/** Set a range input's value and fire React's onChange. */
async function setSliderValue(page: Page, testId: string, value: number) {
  await page.evaluate(({ testId, value }) => {
    const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | null;
    if (!el) throw new Error(`slider ${testId} not found`);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { testId, value });
}

test.describe('Profiles, settings, and sticker album', () => {
  // No beforeEach seed: each test calls seedStorage() with the exact
  // fixture it needs. addInitScript order matters (first wins via the
  // "already populated" guard), so we only register one per test.

  test('creates a 2nd profile, switches to it, and the unlocked-level grid swaps', async ({ page }) => {
    // Seed: profile A has 5 levels unlocked so the post-switch state is
    // visibly different (B has only level 1 unlocked).
    await seedStorage(page, {
      activeId: 'pA',
      profiles: [{ id: 'pA', name: 'Lea', unlockedLevels: 5 }],
    });
    await bootPage(page);

    // Sanity: A is active → level 4 is unlocked, level 5 is locked.
    await expect(page.locator('[data-testid="button-level-4"]')).toHaveAttribute('aria-disabled', 'false');
    await expect(page.locator('[data-testid="button-level-5"]')).toHaveAttribute('aria-disabled', 'true');

    // Open Profiles modal and create a second profile "Fiona".
    await page.locator('[data-testid="button-profile"]').click();
    await expect(page.locator('[data-testid="profiles-overlay"]')).toBeVisible();
    await page.locator('[data-testid="input-new-profile"]').fill('Fiona');
    await page.locator('[data-testid="button-create-profile"]').click();
    // storage writes are debounced 200ms — wait for the flush.
    await page.waitForTimeout(300);

    // createProfile() makes the new profile active. Storage should now
    // hold two profiles and the new one (B) is active.
    const afterCreate = await page.evaluate((key) => {
      const data = JSON.parse(localStorage.getItem(key)!);
      return { count: data.profiles.length, activeName: data.profiles.find((p: any) => p.id === data.activeProfileId)?.name };
    }, STORAGE_KEY);
    expect(afterCreate.count).toBe(2);
    expect(afterCreate.activeName).toBe('Fiona');

    // Switch back to Lea via the modal: grid must swap to 5 unlocked
    // (the engine reloads its cached unlocked-level count on switch).
    await page.locator('[data-testid="button-switch-pA"]').click();
    await expect(page.locator('[data-testid="profiles-overlay"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="button-level-4"]')).toHaveAttribute('aria-disabled', 'false');
    await expect(page.locator('[data-testid="button-level-5"]')).toHaveAttribute('aria-disabled', 'true');

    // Switch to Fiona: only level 1 unlocked (default for new profiles).
    await page.locator('[data-testid="button-profile"]').click();
    // The new profile's id is generated by createProfile; grab it from storage.
    const fionaId = await page.evaluate((key) => {
      const data = JSON.parse(localStorage.getItem(key)!);
      return data.profiles.find((p: any) => p.name === 'Fiona').id;
    }, STORAGE_KEY);
    await page.locator(`[data-testid="button-switch-${fionaId}"]`).click();
    await expect(page.locator('[data-testid="button-level-0"]')).toHaveAttribute('aria-disabled', 'false');
    await expect(page.locator('[data-testid="button-level-4"]')).toHaveAttribute('aria-disabled', 'true');
  });

  test('deletes a profile and the deletion persists across a page reload', async ({ page }) => {
    await seedStorage(page, {
      activeId: 'pA',
      profiles: [
        { id: 'pA', name: 'Lea', unlockedLevels: 3 },
        { id: 'pB', name: 'Fiona', unlockedLevels: 1 },
      ],
    });
    await bootPage(page);

    // Delete Fiona via the modal (window.confirm is auto-accepted in bootPage).
    await page.locator('[data-testid="button-profile"]').click();
    await page.locator('[data-testid="button-delete-pB"]').click();
    await expect(page.locator('[data-testid="profile-row-pB"]')).toHaveCount(0);
    await page.waitForTimeout(300);

    // Storage reflects single remaining profile, still Lea.
    const afterDelete = await page.evaluate((key) => {
      const data = JSON.parse(localStorage.getItem(key)!);
      return { ids: data.profiles.map((p: any) => p.id), active: data.activeProfileId };
    }, STORAGE_KEY);
    expect(afterDelete.ids).toEqual(['pA']);
    expect(afterDelete.active).toBe('pA');

    // Reload — deletion must persist.
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__game);
    const afterReload = await page.evaluate((key) => {
      const data = JSON.parse(localStorage.getItem(key)!);
      return data.profiles.map((p: any) => p.id);
    }, STORAGE_KEY);
    expect(afterReload).toEqual(['pA']);
  });

  test('settings sliders + toggles persist via getSettings() across a page reload', async ({ page }) => {
    await bootPage(page);

    // Open Settings modal, change every control:
    //   - music volume  → 0.10
    //   - SFX volume    → 0.25
    //   - screen-shake  → off
    //   - vibration     → off
    await page.locator('[data-testid="button-settings"]').click();
    await expect(page.locator('[data-testid="settings-overlay"]')).toBeVisible();
    await setSliderValue(page, 'slider-music-volume', 0.10);
    await setSliderValue(page, 'slider-sfx-volume', 0.25);
    await page.locator('[data-testid="toggle-screen-shake"]').uncheck();
    await page.locator('[data-testid="toggle-vibration"]').uncheck();
    await page.locator('[data-testid="button-settings-close"]').click();

    // The storage write is debounced 200ms — wait briefly then read raw.
    await page.waitForTimeout(300);
    const persisted = await readSettingsViaStorage(page);
    expect(persisted).toMatchObject({
      // Range input snaps to step=0.05 so values land near (not exactly) the request.
      screenShake: false,
      vibration: false,
    });
    expect(persisted!.musicVolume).toBeCloseTo(0.10, 2);
    expect(persisted!.sfxVolume).toBeCloseTo(0.25, 2);

    // Reload + verify storage.getSettings() (read indirectly via the
    // engine's per-frame access — easier than re-importing the module
    // into the page). We just re-read raw storage which IS what
    // getSettings() returns.
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__game);
    const afterReload = await readSettingsViaStorage(page);
    expect(afterReload).toMatchObject({
      screenShake: false,
      vibration: false,
    });
    expect(afterReload!.musicVolume).toBeCloseTo(0.10, 2);
    expect(afterReload!.sfxVolume).toBeCloseTo(0.25, 2);

    // And the Settings UI should reflect the persisted values when re-opened.
    await page.locator('[data-testid="button-settings"]').click();
    await expect(page.locator('[data-testid="toggle-screen-shake"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="toggle-vibration"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="slider-music-volume"]')).toHaveValue(/0\.1/);
    await expect(page.locator('[data-testid="slider-sfx-volume"]')).toHaveValue(/0\.25/);
  });

  test('completing level 1 unlocks the `first_steps` sticker in the album', async ({ page }) => {
    await bootPage(page);

    // Album opens empty (default profile has no stickers).
    await page.locator('[data-testid="button-album"]').click();
    await expect(page.locator('[data-testid="text-album-progress"]')).toContainText('0 /');
    // first_steps sticker is rendered locked (?-glyph, opacity reduced).
    await expect(page.locator('[data-testid="sticker-first_steps"]')).toHaveAttribute(
      'aria-label',
      /noch gesperrt/,
    );
    await page.locator('[data-testid="button-album-close"]').click();

    // Complete level 1 by teleporting the player onto the flag rect and
    // running a single physics step. The rAF loop is already stopped by
    // bootPage, so testStep() is the sole driver.
    await page.locator('[data-testid="button-level-0"]').click();
    await page.evaluate(() => {
      const g: any = (window as any).__game;
      // Re-stop after startLevel re-enters the engine state machine.
      g.stop();
      const p = g.player;
      // Jungle level: flagPosition = { x: 235*32, y: (13-10)*32 }.
      p.x = 235 * 32 + 1;       // overlap the 8-px-wide flag pole
      p.y = 250;                // anywhere within the 320-px tall flag rect
      p.velX = 0;
      p.velY = 0;
      // One frame is enough: runFlagCollision() fires, grants the sticker,
      // and transitions to LEVEL_COMPLETE.
      g.testStep(1);
    });
    // Flush the debounced storage write before reading raw localStorage.
    await page.waitForTimeout(300);

    // Engine state moved to LEVEL_COMPLETE and the first_steps sticker
    // toast is in the DOM (single-toast head visible).
    await expect(page.locator('[data-testid="levelcomplete-overlay"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-achievement-first_steps"]')).toBeVisible();

    // Storage now has first_steps recorded.
    const stickers = await page.evaluate((key) => {
      const data = JSON.parse(localStorage.getItem(key)!);
      const active = data.profiles.find((p: any) => p.id === data.activeProfileId);
      return active.stickers;
    }, STORAGE_KEY);
    expect(stickers).toContain('first_steps');

    // Return to the title and open the album: first_steps should now
    // render as unlocked (icon + "freigeschaltet" aria-label).
    await page.locator('[data-testid="button-complete-title"]').click();
    await page.locator('[data-testid="button-album"]').click();
    // Reaching the flag in the jungle level (no damage taken) grants three
    // stickers: first_steps, jungle_clear, no_hit_clear.
    await expect(page.locator('[data-testid="text-album-progress"]')).toContainText('3 /');
    await expect(page.locator('[data-testid="sticker-first_steps"]')).toHaveAttribute(
      'aria-label',
      /freigeschaltet/,
    );
  });
});
