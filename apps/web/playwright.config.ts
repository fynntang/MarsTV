import { defineConfig, devices } from '@playwright/test';

// Dedicated port so we don't collide with a long-running `next dev` on 3000.
const PORT = 3100;
// Use `localhost` — Next 16 dev blocks cross-origin client-bundle requests
// from non-configured hosts (127.0.0.1 triggers the block), which silently
// stops React hydration. See `allowedDevOrigins` in next.config.
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Single worker: our webServer is a single dev process and most specs
  // mutate localStorage + intercept routes — serial keeps traces readable.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Next 16 dev compiles each route on first visit; expect's 5s default is too
  // tight when the first test to hit a page pays the full compile cost.
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Per-action timeout; keeps hung selectors from eating the 30s test budget.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // Next 16 cold start can take 30–60s on Windows; give it headroom.
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // Empty CMS list → pages exercise their empty / fallback branches
      // deterministically without touching real upstream CMS.
      CMS_SOURCES_JSON: '[]',
      // Required by /api/proxy/m3u8 auth; value doesn't matter for specs
      // that don't exercise the proxy signing path.
      PROXY_SECRET: 'e2e-secret',
    },
  },
});
