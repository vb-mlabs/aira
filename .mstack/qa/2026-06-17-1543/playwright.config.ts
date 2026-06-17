// Temporary QA-run Playwright config — points at the dev server already
// listening on :5000. Tests in specs/ run as admin by default; owner-side
// specs override storageState explicitly.

import path from "path"
import { fileURLToPath } from "url"
import { defineConfig, devices } from "@playwright/test"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  testDir: path.join(__dirname, "specs"),
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  reporter: "list",
  globalSetup: path.join(__dirname, "setup/global-setup.ts"),
  outputDir: path.join(__dirname, "test-results"),
  use: {
    baseURL: "http://localhost:5000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    storageState: path.join(__dirname, ".auth/admin.json"),
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})
