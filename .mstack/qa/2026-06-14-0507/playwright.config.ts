// Temporary QA-run Playwright config for F20 Community Requests Board.
// Routes tests from this run's specs/, uses per-persona storageStates
// from .auth/, and points at the running dev server on port 5000.
// Three authed projects so a single spec can switch personas by project.

import path from "path"
import { fileURLToPath } from "url"
import { defineConfig, devices } from "@playwright/test"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  testDir: path.join(__dirname, "specs"),
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  globalSetup: path.join(__dirname, "setup/global-setup.ts"),
  outputDir: path.join(__dirname, "test-results"),
  use: {
    baseURL: "http://localhost:5000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // Default — used by specs that drive multiple browsers from one
      // test (admin + poster + helper). Each spec creates its own
      // contexts and loads the relevant .auth state explicitly.
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: "SKIP_ENV_VALIDATION=1 pnpm dev",
    url: "http://localhost:5000",
    reuseExistingServer: true,
    timeout: 60_000,
    cwd: path.join(__dirname, "../../../"),
  },
})
