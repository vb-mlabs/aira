// Verification for QA feedback #3 — subcategory tier colors under a
// green primary. Loads /listings/restaurants (a level=1 root with one
// child "Test") and captures the sub-tile chrome.

import { test, type Page } from "@playwright/test"

const BASE = "http://localhost:5000"
const SUPER_ADMIN = { email: "qa-super@aira-qa.test", password: "qa-super-2026" }

async function signInSuperAdmin(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.locator("input#email").fill(SUPER_ADMIN.email)
  await page.locator("input#password").fill(SUPER_ADMIN.password)
  await page.getByRole("button", { name: /^sign in$/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 })
}

test("V3 — subcategory tile renders with tier2 (orange) tint", async ({ page }) => {
  await signInSuperAdmin(page)
  await page.goto(`${BASE}/listings/restaurants`)
  await page.waitForLoadState("networkidle")

  // Screenshot the primary-category page — visual confirmation the
  // "Test" sub tile shows an orange icon-ring vs green header.
  await page.screenshot({
    path: "../assets/v3-sub-tier-color.png",
    fullPage: true,
  })
})
