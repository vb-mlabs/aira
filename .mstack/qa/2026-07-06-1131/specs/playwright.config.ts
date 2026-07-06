import { defineConfig, devices } from "@playwright/test"

// Stand-alone Playwright config for the 2026-07-06-1131 QA run. Points
// at the already-running dev server on port 5000 (Replit's default in
// this workspace) rather than spinning up its own — Playwright's
// project-wide webServer would collide with the running instance.

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "../results.json" }]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5000",
    screenshot: "only-on-failure",
    video: "off",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
