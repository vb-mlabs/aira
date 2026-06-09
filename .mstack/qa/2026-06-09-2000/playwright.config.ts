import { defineConfig, devices } from "@playwright/test"
import path from "path"

const QA_DIR = path.resolve(__dirname)
const WEB_DIR = path.resolve(__dirname, "../../../apps/web")
const STORAGE_STATE = path.resolve(WEB_DIR, "e2e/.auth/user.json")

const BASE_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:5000"

export default defineConfig({
  testDir: path.resolve(QA_DIR, "specs"),
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "on",
    ignoreHTTPSErrors: true,
  },
  outputDir: path.resolve(QA_DIR, "assets/pw-output"),
  projects: [
    {
      name: "authed",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
    },
  ],
  webServer: {
    command: "SKIP_ENV_VALIDATION=1 pnpm --filter @aira/web dev",
    url: "http://localhost:5000",
    reuseExistingServer: true,
    timeout: 90_000,
    cwd: path.resolve(__dirname, "../../.."),
  },
})
