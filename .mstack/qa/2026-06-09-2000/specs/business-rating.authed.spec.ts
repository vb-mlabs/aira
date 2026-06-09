// QA spec — Admin star rating (F11).
//
// Covers commits 418e796..37509cf:
// - Admin can pick a rating from the half-step <select>, save, refresh,
//   see it persisted
// - Card + Detail surfaces render ★ {value} when rating is set
// - Hide rule fires for null AND 0 (PRD)
// - 5.0 renders as "★ 5.0" (always 1 decimal)
// - Regression: /home featured strip + /admin/businesses list still
//   work when most rows are unrated
//
// The e2e test user is temporarily promoted to admin in beforeAll so
// the spec can drive the admin form; demoted in afterAll. biz-001's
// rating is reset to null in afterAll regardless of test outcome.

import { test, expect, type Page } from "@playwright/test"
import path from "path"

const E2E_USER_ID = "00000000-0000-4000-8000-000000000001"
const TARGET_ID = "biz-001"
const ASSETS_DIR = path.resolve(__dirname, "../assets")

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(ASSETS_DIR, `${name}.png`),
    fullPage: true,
  })
}

async function withPool<T>(fn: (pool: import("@neondatabase/serverless").Pool) => Promise<T>): Promise<T> {
  const { Pool, neonConfig } = await import("@neondatabase/serverless")
  const wsMod = await import("ws")
  neonConfig.webSocketConstructor =
    (wsMod as { default?: unknown }).default ?? wsMod
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL not set")
  const pool = new Pool({ connectionString: databaseUrl })
  try {
    return await fn(pool)
  } finally {
    await pool.end()
  }
}

async function saveRatingSection(page: Page) {
  // Pin the Save click to the Rating section so we don't fire another
  // section's save.
  const section = page.locator("section", { hasText: "Star rating" })
  await section.getByRole("button", { name: /^Save/ }).click()
  await expect(section.getByText("Saved.")).toBeVisible()
}

test.describe("Business rating (F11)", () => {
  test.beforeAll(async () => {
    await withPool(async (pool) => {
      await pool.query(`UPDATE "user" SET role = 'admin' WHERE id = $1`, [
        E2E_USER_ID,
      ])
      // Reset target to null in case a prior run left it set.
      await pool.query(`UPDATE businesses SET rating = NULL WHERE id = $1`, [
        TARGET_ID,
      ])
    })
  })

  test.afterAll(async () => {
    await withPool(async (pool) => {
      await pool.query(`UPDATE "user" SET role = 'end_user' WHERE id = $1`, [
        E2E_USER_ID,
      ])
      await pool.query(`UPDATE businesses SET rating = NULL WHERE id = $1`, [
        TARGET_ID,
      ])
    })
  })

  test("S1: default admin form shows 'No rating' selected", async ({ page }) => {
    await page.goto(`/admin/businesses/${TARGET_ID}`)
    const select = page.getByLabel("Star rating")
    await expect(select).toHaveValue("")
    await shot(page, "s1-admin-default")
  })

  test("S2: admin sets 4.5 and reload preserves the value", async ({ page }) => {
    await page.goto(`/admin/businesses/${TARGET_ID}`)
    const select = page.getByLabel("Star rating")
    await select.selectOption("4.5")
    await saveRatingSection(page)
    // Hard reload to confirm RSC fetch returns the new value.
    await page.reload()
    await expect(page.getByLabel("Star rating")).toHaveValue("4.5")
    await shot(page, "s2-admin-saved-4-5")
  })

  test("S3: listings card renders ★ 4.5 next to verified badge", async ({
    page,
  }) => {
    // Precondition: leave biz-001 at 4.5 from S2 — set explicitly so test
    // ordering doesn't matter.
    await withPool(async (pool) => {
      await pool.query(`UPDATE businesses SET rating = 4.5 WHERE id = $1`, [
        TARGET_ID,
      ])
    })
    await page.goto("/listings/restaurants")
    // The RatingPill exposes aria-label "Rated 4.5 out of 5"
    const pill = page.getByLabel("Rated 4.5 out of 5")
    await expect(pill).toBeVisible()
    await shot(page, "s3-card-4-5")
  })

  test("S4: detail page header renders ★ 4.5", async ({ page }) => {
    await withPool(async (pool) => {
      await pool.query(`UPDATE businesses SET rating = 4.5 WHERE id = $1`, [
        TARGET_ID,
      ])
    })
    await page.goto(`/listings/restaurants/${TARGET_ID}`)
    const pill = page.getByLabel("Rated 4.5 out of 5")
    await expect(pill).toBeVisible()
    await shot(page, "s4-detail-4-5")
  })

  test("S5: admin clears rating to 'No rating' and reload persists", async ({
    page,
  }) => {
    await withPool(async (pool) => {
      await pool.query(`UPDATE businesses SET rating = 4.5 WHERE id = $1`, [
        TARGET_ID,
      ])
    })
    await page.goto(`/admin/businesses/${TARGET_ID}`)
    await page.getByLabel("Star rating").selectOption("")
    await saveRatingSection(page)
    await page.reload()
    await expect(page.getByLabel("Star rating")).toHaveValue("")
    await shot(page, "s5-admin-cleared")
  })

  test("S6: cleared rating → card has no rating pill", async ({ page }) => {
    await withPool(async (pool) => {
      await pool.query(`UPDATE businesses SET rating = NULL WHERE id = $1`, [
        TARGET_ID,
      ])
    })
    await page.goto("/listings/restaurants")
    await expect(page.getByLabel(/^Rated /)).toHaveCount(0)
    await shot(page, "s6-card-cleared")
  })

  test("S7: rating=0 also hides the pill (PRD)", async ({ page }) => {
    await withPool(async (pool) => {
      await pool.query(`UPDATE businesses SET rating = 0 WHERE id = $1`, [
        TARGET_ID,
      ])
    })
    await page.goto("/listings/restaurants")
    await expect(page.getByLabel(/^Rated /)).toHaveCount(0)
    await shot(page, "s7-zero-hidden")
  })

  test("S8: rating=5 renders as ★ 5.0 (always 1 decimal)", async ({ page }) => {
    await withPool(async (pool) => {
      await pool.query(`UPDATE businesses SET rating = 5 WHERE id = $1`, [
        TARGET_ID,
      ])
    })
    await page.goto("/listings/restaurants")
    await expect(page.getByLabel("Rated 5.0 out of 5")).toBeVisible()
    await shot(page, "s8-card-5-0")
  })

  test("S9: regression — /home featured + /admin/businesses list", async ({
    page,
  }) => {
    await withPool(async (pool) => {
      await pool.query(`UPDATE businesses SET rating = NULL WHERE id = $1`, [
        TARGET_ID,
      ])
    })

    await page.goto("/home")
    // At least one featured card with the Spice Garden name should render
    await expect(
      page.getByRole("link", { name: "Spice Garden", exact: true }),
    ).toBeVisible()

    await page.goto("/admin/businesses")
    await expect(
      page.getByRole("link", { name: "Spice Garden", exact: true }),
    ).toBeVisible()
    await shot(page, "s9-regression")
  })
})
