import { defineConfig, devices } from "@playwright/test"

// QA-run-scoped Playwright config. Points at the live Replit dev preview
// (the dev server is already running; this config does NOT spin one up).
// Specs live alongside in ./specs; screenshots go to ./assets via the
// individual specs.

const previewUrl = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:5000"

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: previewUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Replit's preview returns HTTPS; let the test ignore cert issues just
    // in case the cluster cert rotates mid-run.
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // No webServer block — we're driving the existing dev server.
})
