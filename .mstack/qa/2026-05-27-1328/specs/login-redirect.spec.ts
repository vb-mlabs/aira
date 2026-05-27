// QA spec: login flow — verifies post-login redirect lands on /home, not /messages.
// Runs in the non-authed Playwright project (no storageState loaded).

import { test, expect } from "@playwright/test"

// QA global setup creates this user in qa-global-setup.ts.
const E2E_EMAIL = "qa-tester@mlabs.test"
const E2E_PASSWORD = "qa-test-password-2026"

test("unauthenticated request to /home redirects to /login", async ({ page }) => {
  await page.goto("/home", { waitUntil: "domcontentloaded" })
  await expect(page).toHaveURL(/\/login/)
})

test("successful login redirects to /home", async ({ page }) => {
  // Wait for networkidle so React finishes hydrating the controlled inputs
  // before filling — avoids the fill being reset by the hydration rerender.
  await page.goto("/login", { waitUntil: "networkidle" })
  await page.locator("#email").fill(E2E_EMAIL)
  await page.locator("#password").fill(E2E_PASSWORD)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL(/\/home/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/home$/)
})

test.skip("after login, /messages is accessible — tested in authed suite", () => {})
