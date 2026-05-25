// Temporary Playwright config for /mlabs-qa run 2026-05-24-1333.
// Points testDir at this run's specs/ and disables the webServer (we
// reuse the user's already-running dev server on :3000).

import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
