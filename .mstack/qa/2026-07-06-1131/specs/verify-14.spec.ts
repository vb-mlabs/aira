// One-off verification for QA feedback #14 — hover-open on the sidebar
// primary category group. Runs against the same dev server as the main
// qa.spec.ts; reuses the same super-admin login.

import { test, expect, type Page } from "@playwright/test"

const BASE = "http://localhost:5000"
const SUPER_ADMIN = { email: "qa-super@aira-qa.test", password: "qa-super-2026" }

async function signInSuperAdmin(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.locator("input#email").fill(SUPER_ADMIN.email)
  await page.locator("input#password").fill(SUPER_ADMIN.password)
  await page.getByRole("button", { name: /^sign in$/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 })
}

test("V14 — hover on primary category opens subs; leave closes them", async ({ page }) => {
  await signInSuperAdmin(page)
  // Navigate to /education so the "Restaurants" group is NOT route-active
  // (its subs would stay open otherwise and the test can't distinguish).
  await page.goto(`${BASE}/listings/education`)
  await page.waitForLoadState("networkidle")

  // The parent row we test: "Restaurants to Food" (has 1 sub "Test").
  // Find the toggle button on the group so we can assert its aria-expanded.
  const toggle = page.getByRole("button", {
    name: /(show|hide) restaurants to food subcategories/i,
  })
  await expect(toggle).toBeVisible()
  // Before hover: closed.
  await expect(toggle).toHaveAttribute("aria-expanded", "false")

  // Hover the parent link.
  const parentLink = page.getByRole("link", { name: /^restaurants to food$/i })
  await parentLink.hover()
  // After hover: open.
  await expect(toggle).toHaveAttribute("aria-expanded", "true")

  // Move mouse away → closes.
  await page.mouse.move(0, 0)
  await expect(toggle).toHaveAttribute("aria-expanded", "false")

  // Screenshot after hover for the fix report.
  await parentLink.hover()
  await page.screenshot({
    path: "../assets/v14-hover-open.png",
    fullPage: false,
  })
})
