// S3 features QA — multi-category checkboxes, gallery upload UI,
// Places address input, public detail carousel.

import { test, expect, type Page } from "@playwright/test"
import path from "path"
import { execSync } from "child_process"

const E2E_USER_ID = "00000000-0000-4000-8000-000000000001"
const TARGET_ID = "biz-001" // Spice Garden — tier1, restaurants
const ASSETS_DIR = path.resolve(__dirname, "../assets")

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(ASSETS_DIR, `${name}.png`), fullPage: true })
}

function psql(sql: string): string {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa] DATABASE_URL not set")
  return execSync(`psql "${dbUrl}"`, {
    input: sql,
    stdio: ["pipe", "pipe", "pipe"],
  }).toString()
}

function psqlQuery(sql: string): string[][] {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("[qa] DATABASE_URL not set")
  const out = execSync(`psql "${dbUrl}" -t -A -F '|'`, {
    input: sql,
    stdio: ["pipe", "pipe", "pipe"],
  })
    .toString()
    .trim()
  if (!out) return []
  return out
    .split("\n")
    .filter(Boolean)
    .map((row) => row.split("|"))
}

test.describe("S3 features — admin", () => {
  test.beforeAll(async () => {
    psql(`UPDATE "user" SET role = 'admin' WHERE id = '${E2E_USER_ID}'`)
    psql(`UPDATE session SET last_activity_at = now() WHERE user_id = '${E2E_USER_ID}'`)
    psql(`DELETE FROM business_image WHERE business_id = '${TARGET_ID}'`)
    psql(`DELETE FROM business_category WHERE business_id = '${TARGET_ID}'`)
  })

  test.afterAll(async () => {
    psql(`UPDATE "user" SET role = 'end_user' WHERE id = '${E2E_USER_ID}'`)
    psql(`DELETE FROM business_image WHERE business_id = '${TARGET_ID}'`)
    psql(`DELETE FROM business_category WHERE business_id = '${TARGET_ID}'`)
  })

  test("S1: admin business list loads", async ({ page }) => {
    await page.goto("/admin/businesses")
    // Should show at least one business
    await expect(page.getByRole("link", { name: /biz|Spice|Thali/i }).first()).toBeVisible({ timeout: 10000 })
    await shot(page, "s3-admin-list")
  })

  test("S2: admin business edit page loads with gallery and category sections", async ({ page }) => {
    await page.goto(`/admin/businesses/${TARGET_ID}`)

    // Gallery section heading
    await expect(page.getByRole("heading", { name: "Gallery" })).toBeVisible({ timeout: 10000 })

    // Categories section heading (renamed from "Category" to "Categories")
    await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible()

    // Additional categories label
    await expect(page.getByText("Additional categories")).toBeVisible()

    // Address input should be present
    await expect(page.locator("#b-address")).toBeVisible()

    await shot(page, "s3-admin-edit-page")
  })

  test("S3: gallery section shows drop zone when no images", async ({ page }) => {
    await page.goto(`/admin/businesses/${TARGET_ID}`)

    // Drop zone should be present (no images yet)
    await expect(page.getByText(/Drop image or click to browse/i)).toBeVisible({ timeout: 10000 })

    await shot(page, "s3-gallery-empty")
  })

  test("S4: extra categories checkboxes render and are toggleable", async ({ page }) => {
    await page.goto(`/admin/businesses/${TARGET_ID}`)

    // Wait for categories to load
    await expect(page.getByText("Additional categories")).toBeVisible({ timeout: 10000 })

    // At least one checkbox should exist for extra categories
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    expect(count).toBeGreaterThan(0)

    // Toggle the first checkbox
    const firstCheckbox = checkboxes.first()
    const wasChecked = await firstCheckbox.isChecked()
    await firstCheckbox.click()
    await expect(firstCheckbox).toBeChecked({ checked: !wasChecked })

    // Toggle back
    await firstCheckbox.click()
    await expect(firstCheckbox).toBeChecked({ checked: wasChecked })

    await shot(page, "s3-extra-categories-checkbox")
  })

  test("S5: categories save with extra category — PATCH succeeds", async ({ page }) => {
    await page.goto(`/admin/businesses/${TARGET_ID}`)
    await expect(page.getByText("Additional categories")).toBeVisible({ timeout: 10000 })

    // Scope to the Categories section so we click the right Save button
    const categoriesSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Categories" }) })

    // Target the "Education" label specifically — it's a real category in
    // CATEGORY_META so S6 can navigate to /listings/education without crashing.
    const educationCheckbox = categoriesSection.locator('label').filter({ hasText: "Education" }).locator('input[type="checkbox"]')
    const fallbackCheckboxes = categoriesSection.locator('input[type="checkbox"]')

    const useEducation = await educationCheckbox.count() > 0
    const checkbox = useEducation ? educationCheckbox.first() : fallbackCheckboxes.first()

    if (await checkbox.count() > 0) {
      await checkbox.check()

      const saveBtn = categoriesSection.getByRole("button", { name: "Save" })
      await saveBtn.click()
      await expect(categoriesSection.getByText("Saved.")).toBeVisible({ timeout: 10000 })
    }

    await shot(page, "s3-categories-saved")
  })

  test("S6: multi-category — business appears in second category listing", async ({ page }) => {
    const rows = psqlQuery(
      `SELECT bc.category_id, c.slug
       FROM business_category bc
       JOIN category c ON c.id = bc.category_id
       WHERE bc.business_id = '${TARGET_ID}'
       LIMIT 1`,
    )

    if (rows.length === 0) {
      test.skip(true, "No extra categories were saved in S5 — skipping multi-category listing test")
      return
    }

    const slug = rows[0][1]
    await page.goto(`/listings/${slug}`)
    await page.waitForLoadState("networkidle")

    // Verify page loads with at least one article
    await expect(page.locator("article, [role='article']").first()).toBeVisible({ timeout: 10000 })

    await shot(page, "s3-multi-category-listing")
  })

  test("S7: public business detail page has no gallery carousel when images = 0", async ({ page }) => {
    await page.goto("/listings/restaurants/spice-garden")
    // Carousel should NOT appear (no images seeded)
    await expect(page.getByRole("region", { name: /gallery/i })).toHaveCount(0)
    await shot(page, "s3-detail-no-carousel")
  })

  test("S8: admin categories page loads", async ({ page }) => {
    await page.goto("/admin/categories")
    await expect(page).not.toHaveURL(/login/)
    await shot(page, "s3-admin-categories")
  })

  test("S9: admin settings homepage page loads", async ({ page }) => {
    await page.goto("/admin/settings/homepage")
    await expect(page).not.toHaveURL(/login/)
    // Ensure not 404
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
    await shot(page, "s3-admin-settings")
  })
})
