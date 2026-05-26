import { defineConfig, devices } from "@playwright/test"

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
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
