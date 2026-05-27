// Temporary QA-run Playwright config — points at the running dev server on
// port 5000 and routes tests from .mstack/qa/2026-05-27-1328/specs/.
// Not for CI; delete after this QA run is resolved.

import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "../../.mstack/qa/2026-05-27-1328/specs",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  globalSetup: "./e2e/qa-global-setup.ts",
  use: {
    baseURL: "http://localhost:5000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: ["**/*.authed.spec.ts"],
    },
    {
      name: "authed",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "../../.mstack/qa/2026-05-27-1328/.auth/qa-user.json",
      },
      testMatch: "**/*.authed.spec.ts",
    },
  ],
  webServer: {
    command: "SKIP_ENV_VALIDATION=1 pnpm dev",
    url: "http://localhost:5000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
