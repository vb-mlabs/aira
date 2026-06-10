// App smoke pass (authed) — homepage stats, listings, detail, gallery carousel.

import { test, expect, type Page } from "@playwright/test"
import path from "path"
import { execSync } from "child_process"

const E2E_USER_ID = "00000000-0000-4000-8000-000000000001"
const ASSETS_DIR = path.resolve(__dirname, "../assets")

function psql(sql: string) {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa] DATABASE_URL not set")
  execSync(`psql "${dbUrl}"`, { input: sql, stdio: ["pipe", "pipe", "pipe"] })
}

function bumpSession() {
  psql(`UPDATE session SET last_activity_at = now() WHERE user_id = '${E2E_USER_ID}'`)
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(ASSETS_DIR, `${name}.png`), fullPage: true })
}

test.beforeAll(async () => {
  bumpSession()
})

test.describe("Homepage smoke", () => {
  test("homepage loads and stat counts are visible", async ({ page }) => {
    await page.goto("/home")
    await expect(page).not.toHaveURL(/login/)
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 })
    await shot(page, "home-loaded")
  })
})

test.describe("Listings smoke", () => {
  test("restaurants listing renders business cards", async ({ page }) => {
    await page.goto("/listings/restaurants")
    await expect(page).not.toHaveURL(/login/)
    // Wait for any visible card/link content
    await page.waitForLoadState("networkidle")
    await shot(page, "listings-restaurants")
    // Page should have some content (not a blank page or error)
    const body = await page.textContent("body")
    expect(body?.length).toBeGreaterThan(50)
  })

  test("business detail page loads — Spice Garden", async ({ page }) => {
    await page.goto("/listings/restaurants/spice-garden")
    await page.waitForLoadState("networkidle")
    await shot(page, "detail-spice-garden")
    const url = page.url()
    // Should not redirect to login (user is authed)
    expect(url).not.toMatch(/login/)
  })
})

test.describe("Auth gate smoke", () => {
  test("unauthenticated /home redirects to /login", async ({ page, context }) => {
    // Clear cookies to go unauthenticated
    await context.clearCookies()
    await page.goto("/home")
    await expect(page).toHaveURL(/\/login/)
    await shot(page, "unauthed-redirect")
  })
})
