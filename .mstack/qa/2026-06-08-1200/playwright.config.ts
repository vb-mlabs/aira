import { defineConfig, devices } from "@playwright/test"
import path from "path"

// Minimal QA-run config — no globalSetup, no auth, marketing page only.
// API calls are mocked via page.route() inside specs.
export default defineConfig({
  testDir: path.resolve(__dirname, "specs"),
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5000",
    trace: "on-first-retry",
    screenshot: "on",
    video: "off",
  },
  outputDir: path.resolve(__dirname, "assets/pw-output"),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "SKIP_ENV_VALIDATION=1 pnpm --filter @aira/web dev",
    url: "http://127.0.0.1:5000",
    reuseExistingServer: true,
    timeout: 90_000,
    cwd: path.resolve(__dirname, "../../.."),
  },
})
