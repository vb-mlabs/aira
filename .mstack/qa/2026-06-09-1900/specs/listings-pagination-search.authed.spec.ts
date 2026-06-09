// QA spec — Listings pagination + scoped search (F7 + F8).
//
// Covers what /mlabs-code shipped in commits d702bfc..1f63a9b:
// - Search input → 300ms debounce → ?q=… URL push → server fetch
// - ?verified=1 toggle → server fetch
// - Numbered pagination → ?page=N URL push → fresh RSC render
// - Browser back/forward navigates URL history
// - Category switcher clears searchParams
// - Regression: /home featured strip still renders
//
// Seeds 12 extra restaurants in beforeAll so pagination is reachable,
// deletes them in afterAll.

import { test, expect, type Page } from "@playwright/test"
import path from "path"

const SEED_PREFIX = "qa-listings-pagination-2026-06-09-"

const ASSETS_DIR = path.resolve(__dirname, "../assets")

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(ASSETS_DIR, `${name}.png`),
    fullPage: true,
  })
}

test.describe("Listings pagination + search", () => {
  test.beforeAll(async () => {
    const { Pool, neonConfig } = await import("@neondatabase/serverless")
    const wsMod = await import("ws")
    neonConfig.webSocketConstructor =
      (wsMod as { default?: unknown }).default ?? wsMod
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error("DATABASE_URL not set")
    const pool = new Pool({ connectionString: databaseUrl })
    try {
      // Idempotent cleanup in case a prior run aborted.
      await pool.query(`DELETE FROM businesses WHERE id LIKE $1`, [
        `${SEED_PREFIX}%`,
      ])
      // Seed 12 — enough for pagination (page size = 12) to render with
      // existing 3 restaurants the total = 15 (2 pages of 12, then 3).
      // All tier3, half verified, distinct names containing "QA".
      const values: string[] = []
      const params: (string | boolean)[] = []
      for (let i = 0; i < 12; i++) {
        const idx = params.length / 5
        values.push(
          `($${idx * 5 + 1}, $${idx * 5 + 2}, $${idx * 5 + 3}, 'restaurants', 'tier3', $${idx * 5 + 4}, $${idx * 5 + 5})`,
        )
        params.push(
          `${SEED_PREFIX}${i.toString().padStart(2, "0")}`,
          `QA Restaurant ${String.fromCharCode(65 + i)}`,
          `qa-restaurant-${i.toString().padStart(2, "0")}-${Date.now()}`,
          i % 2 === 0,
          `${i + 1}00 QA Street, Atlanta GA 303${i.toString().padStart(2, "0")}`,
        )
      }
      await pool.query(
        `INSERT INTO businesses (id, name, slug, category, tier, verified, address)
         VALUES ${values.join(", ")}`,
        params,
      )
    } finally {
      await pool.end()
    }
  })

  test.afterAll(async () => {
    const { Pool, neonConfig } = await import("@neondatabase/serverless")
    const wsMod = await import("ws")
    neonConfig.webSocketConstructor =
      (wsMod as { default?: unknown }).default ?? wsMod
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
    try {
      await pool.query(`DELETE FROM businesses WHERE id LIKE $1`, [
        `${SEED_PREFIX}%`,
      ])
    } finally {
      await pool.end()
    }
  })

  test("S1: default landing renders ≤12 cards + pagination row", async ({
    page,
  }) => {
    await page.goto("/listings/restaurants")
    await expect(
      page.getByRole("heading", { level: 1, name: "Restaurants" }),
    ).toBeVisible()
    // 15 total (3 original + 12 seeded). Page 1 shows 12 cards.
    // BusinessCard renders the name as a link.
    const cards = page.locator('a[href^="/listings/restaurants/"]')
    await expect(cards).toHaveCount(12)
    await expect(
      page.getByRole("navigation", { name: "Pagination" }),
    ).toBeVisible()
    await shot(page, "s1-default")
  })

  test("S2: page 2 navigation", async ({ page }) => {
    await page.goto("/listings/restaurants")
    await page.getByRole("link", { name: "Go to page 2" }).click()
    await expect(page).toHaveURL(/[?&]page=2(&|$)/)
    // 15 - 12 = 3 cards on page 2.
    const cards = page.locator('a[href^="/listings/restaurants/"]')
    await expect(cards).toHaveCount(3)
    await shot(page, "s2-page-2")
  })

  test("S3: search debounces then pushes URL", async ({ page }) => {
    await page.goto("/listings/restaurants")
    await page.getByPlaceholder(/search businesses/i).fill("spice")
    // Wait past the 300ms debounce.
    await page.waitForURL(/[?&]q=spice/, { timeout: 2000 })
    // Spice Garden matches by name; QA Restaurants don't contain "spice".
    await expect(page.getByText("Spice Garden")).toBeVisible()
    await shot(page, "s3-search-spice")
  })

  test("S4: clear button restores landing", async ({ page }) => {
    await page.goto("/listings/restaurants?q=spice")
    await expect(page.getByText("Spice Garden")).toBeVisible()
    await page.getByLabel("Clear search").click()
    await expect(page).toHaveURL(/\/listings\/restaurants$/)
    const cards = page.locator('a[href^="/listings/restaurants/"]')
    await expect(cards).toHaveCount(12)
    await shot(page, "s4-clear")
  })

  test("S5: verified toggle filters server-side", async ({ page }) => {
    await page.goto("/listings/restaurants")
    await page.getByRole("button", { name: "Verified" }).click()
    await page.waitForURL(/[?&]verified=1/, { timeout: 2000 })
    // 8 verified total: Spice Garden + Curry Palace + 6 even-index QA seeds (i=0,2,4,6,8,10)
    const cards = page.locator('a[href^="/listings/restaurants/"]')
    await expect(cards).toHaveCount(8)
    await shot(page, "s5-verified")
  })

  test("S6: search miss shows empty state with query echoed", async ({
    page,
  }) => {
    await page.goto("/listings/restaurants?q=zzznomatch")
    await expect(page.getByText(/No results for "zzznomatch"/i)).toBeVisible()
    await shot(page, "s6-empty-search")
  })

  test("S7: browser back/forward navigates URL history", async ({ page }) => {
    await page.goto("/listings/restaurants")
    await page.getByPlaceholder(/search businesses/i).fill("spice")
    await page.waitForURL(/[?&]q=spice/, { timeout: 2000 })
    await page.goBack()
    await expect(page).toHaveURL(/\/listings\/restaurants$/)
    await page.goForward()
    await expect(page).toHaveURL(/[?&]q=spice/)
    await shot(page, "s7-back-forward")
  })

  test("S8: category switcher clears searchParams", async ({ page }) => {
    await page.goto("/listings/restaurants?q=spice&verified=1")
    // The category select is overlaid with opacity:0 — Playwright's
    // standard interactability checks fail without force.
    await page.selectOption(
      'select[aria-label="Switch category"]',
      "education",
      { force: true },
    )
    await expect(page).toHaveURL(/\/listings\/education$/)
    await shot(page, "s8-category-switch")
  })

  test("S9: regression — /home featured strip", async ({ page }) => {
    await page.goto("/home")
    // Featured-business cards link to /listings/<category>/<id>.
    const featuredCards = page.locator('a[href*="/listings/"][href*="biz-"]')
    // At least 1 featured business should render (Spice Garden is tier1).
    await expect(featuredCards.first()).toBeVisible()
    await shot(page, "s9-home-featured")
  })
})
