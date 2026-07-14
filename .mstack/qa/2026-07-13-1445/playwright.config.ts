import { defineConfig, devices } from "@playwright/test"

// QA-run-specific config. Points at the running :5000 dev server, skips
// global-setup (specs mint their own auth via the admin login POST).

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false, // sequential — admin surface tests share auth state
  workers: 1,
  reporter: "list",
  use: {
    // The Replit workspace HTTPS URL — required because Better Auth's
    // session cookies land with the Secure flag (baseUrl is the HTTPS
    // Replit domain), which the browser refuses to store on plain http.
    baseURL: `https://${process.env.REPLIT_DEV_DOMAIN}`,
    trace: "off",
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
