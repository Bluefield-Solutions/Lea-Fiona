import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Playwright config for the Mario-feel regression tests in `tests/`.
 *
 * - Headless Chromium via the system Nix binary so we don't depend on
 *   Playwright's downloaded browser bundles (which can't be installed
 *   on Replit's read-only Nix store).
 * - The Vite dev server is started as a `webServer` and reused if already
 *   running.
 * - All tests must be deterministic via `engine.testStep()` so the whole
 *   suite completes well within the 30-second CI budget the task asks for.
 */

/**
 * Resolve a Chromium binary at config-load time (not bake time) so the
 * config survives Nix store rehashing across rebuilds. Order:
 *   1. PLAYWRIGHT_CHROMIUM_PATH env var (explicit override, useful in CI)
 *   2. Stable system locations that don't embed a Nix hash
 *   3. PATH lookup via `which chromium` / `which chromium-browser`
 */
function resolveChromium(): string | undefined {
  const candidates: (string | undefined)[] = [process.env.PLAYWRIGHT_CHROMIUM_PATH];

  // Stable, hash-free system locations on common Nix-based distros.
  candidates.push(
    '/run/current-system/sw/bin/chromium',
    '/nix/var/nix/profiles/default/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  );

  for (const name of ['chromium', 'chromium-browser', 'google-chrome']) {
    try {
      const found = execSync(`command -v ${name}`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      if (found) candidates.push(found);
    } catch {
      // command -v exits non-zero when not found — ignore.
    }
  }

  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return undefined;
}

const chromiumExecutable = resolveChromium();

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5000',
    headless: true,
    launchOptions: {
      // If we found a Chromium on disk use it, otherwise fall back to
      // Playwright's bundled binary (lets the suite still run in any
      // environment that DID install Playwright browsers normally).
      ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
