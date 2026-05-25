import { defineConfig, devices } from "@playwright/test"

// E2E config — runs against a Next.js dev server spun up by Playwright.
// Uses SKIP_ENV_VALIDATION=1 because most env vars are stubbed until W2-W4 wire them.
//
// Add browsers (firefox, webkit) here once we need them; chromium-only for now to
// keep CI minutes low.

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  // Runs once before any project. Creates the e2e test user and writes a
  // signed BetterAuth cookie to STORAGE_STATE_PATH; the `authed` project
  // loads that storageState. See apps/web/e2e/global-setup.ts.
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      // Default project — unauthed specs (home, signup, login flows that
      // need a signed-out starting state). Explicitly ignores
      // *.authed.spec.ts so the authed-only specs don't run here without
      // storageState.
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: ["**/*.authed.spec.ts"],
    },
    {
      // Authed project — loads the signed cookie minted in globalSetup.
      // Any spec named *.authed.spec.ts starts already logged in.
      name: "authed",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./e2e/.auth/user.json",
      },
      testMatch: "**/*.authed.spec.ts",
    },
  ],
  webServer: {
    command: "SKIP_ENV_VALIDATION=1 pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
