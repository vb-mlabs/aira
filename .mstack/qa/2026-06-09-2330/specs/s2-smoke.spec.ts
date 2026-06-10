// S2 smoke spec — City scoping + Category tree + Homepage CMS

import { test, expect, type Page } from "@playwright/test"
import path from "path"

const ASSETS_DIR = path.resolve(__dirname, "../assets")
const TS = Date.now()

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(ASSETS_DIR, `${name}.png`), fullPage: true })
}

// ─── Admin: Categories ────────────────────────────────────────────────────────

test("admin categories — list page loads with seeded tree", async ({ page }) => {
  await page.goto("/admin/categories")
  await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible()
  await expect(page.getByText("Restaurants")).toBeVisible()
  // Seeded as "Health & Wellness" not "Healthcare"
  await expect(page.getByText("Health & Wellness")).toBeVisible()
  await shot(page, "01-admin-categories-list")
})

test("admin categories — create root category", async ({ page }) => {
  const catName = `QA Root ${TS}`

  await page.goto("/admin/categories/new")
  await expect(page.getByRole("heading", { name: "New category" })).toBeVisible()

  await page.fill("#cat-name", catName)
  // Slug auto-populates from name
  await expect(page.locator("#cat-slug")).not.toHaveValue("")

  await page.getByRole("button", { name: "Create category" }).click()
  await page.waitForURL("**/admin/categories")
  await expect(page.getByText(catName)).toBeVisible()
  await shot(page, "02-admin-categories-create-root")
})

test("admin categories — create child category", async ({ page }) => {
  const childName = `QA Child ${TS}`

  await page.goto("/admin/categories/new")
  await page.fill("#cat-name", childName)

  // Select parent (Restaurants always present from seed)
  await page.locator("#cat-parent").selectOption({ label: "Restaurants" })

  await page.getByRole("button", { name: "Create category" }).click()
  await page.waitForURL("**/admin/categories")
  await shot(page, "03-admin-categories-create-child")
})

test("admin categories — edit an existing category name", async ({ page }) => {
  await page.goto("/admin/categories")

  // Use Restaurants (stable seeded category)
  const editLink = page.getByRole("link", { name: "Edit Restaurants" })
  await expect(editLink).toBeVisible()
  const editUrl = await editLink.evaluate((el) => (el as HTMLAnchorElement).href)
  await editLink.click()

  await expect(page.getByRole("heading", { name: /Edit/ })).toBeVisible()
  await shot(page, "04-admin-categories-edit-form")

  const nameInput = page.locator("#cat-name")
  const originalName = await nameInput.inputValue()

  // Append a space to force a change
  await nameInput.fill(originalName + " ")
  await page.getByRole("button", { name: "Save changes" }).click()
  await page.waitForURL("**/admin/categories")
  await shot(page, "04b-admin-categories-edit-saved")

  // Restore by navigating back to same edit URL
  await page.goto(editUrl)
  await expect(page.getByRole("heading", { name: /Edit/ })).toBeVisible()
  await page.locator("#cat-name").fill(originalName)
  await page.getByRole("button", { name: "Save changes" }).click()
  await page.waitForURL("**/admin/categories")
})

test("admin categories — deactivate dialog shows warning", async ({ page }) => {
  const tempName = `QA Deactivate ${TS}`

  // Create throwaway category
  await page.goto("/admin/categories/new")
  await page.fill("#cat-name", tempName)
  await page.getByRole("button", { name: "Create category" }).click()
  await page.waitForURL("**/admin/categories")

  // Navigate to its edit page via aria-label
  const editLink = page.getByRole("link", { name: `Edit ${tempName}` })
  await expect(editLink).toBeVisible({ timeout: 10000 })
  await editLink.click()

  await expect(page.getByRole("heading", { name: /Edit/ })).toBeVisible()

  // Deactivate button visible because category is active
  const deactivateBtn = page.getByRole("button", { name: "Deactivate" })
  await expect(deactivateBtn).toBeVisible()
  await deactivateBtn.click()

  // Dialog opens
  await expect(page.getByText(/Deactivate.*\?/)).toBeVisible()
  await shot(page, "05-admin-categories-deactivate-dialog")

  // Confirm deactivation (throwaway category)
  await page.getByRole("button", { name: "Deactivate" }).last().click()
  await page.waitForURL("**/admin/categories")
  await shot(page, "05b-admin-categories-deactivated")
})

test("admin categories — tree renders drag handles", async ({ page }) => {
  await page.goto("/admin/categories")
  const handles = page.getByRole("button", { name: "Drag to reorder" })
  await expect(handles.first()).toBeVisible()
  const count = await handles.count()
  expect(count).toBeGreaterThanOrEqual(1)
  await shot(page, "06-admin-categories-drag-handles")
})

// ─── Admin: Cities ────────────────────────────────────────────────────────────

test("admin cities — list page shows Atlanta", async ({ page }) => {
  await page.goto("/admin/cities")
  await expect(page.getByRole("heading", { name: "Cities" })).toBeVisible()
  // Use role-based locator to avoid matching both "Atlanta" and "atlanta"
  await expect(page.getByRole("link", { name: "Atlanta" })).toBeVisible()
  await shot(page, "07-admin-cities-list")
})

test("admin cities — create then edit a city", async ({ page }) => {
  const cityName = `QA City ${TS}`

  // Create
  await page.goto("/admin/cities/new")
  await expect(page.getByRole("heading", { name: "New city" })).toBeVisible()
  await page.fill("#city-name", cityName)
  await expect(page.locator("#city-slug")).not.toHaveValue("")
  await page.getByRole("button", { name: "Create city" }).click()
  await page.waitForURL("**/admin/cities")
  await expect(page.getByRole("link", { name: cityName })).toBeVisible()
  await shot(page, "08-admin-cities-create")

  // Edit: click its name link
  await page.getByRole("link", { name: cityName }).click()
  // Heading is "Edit {city.name}"
  await expect(page.getByRole("heading", { name: /^Edit / })).toBeVisible()
  await page.locator("#city-name").fill(cityName + " (edited)")
  await page.getByRole("button", { name: "Save changes" }).click()
  await page.waitForURL("**/admin/cities")
  await expect(page.getByRole("link", { name: cityName + " (edited)" })).toBeVisible()
  await shot(page, "08b-admin-cities-edit")
})

// ─── Admin: Homepage CMS ──────────────────────────────────────────────────────

test("admin homepage CMS — form loads with seed values", async ({ page }) => {
  await page.goto("/admin/settings/homepage")
  await expect(page.getByRole("heading", { name: "Homepage settings" })).toBeVisible()
  await expect(page.locator("#cms-title")).toBeVisible()
  await expect(page.locator("#cms-body")).toBeVisible()
  await expect(page.locator("#cms-biz-count")).toBeVisible()
  await expect(page.locator("#cms-user-count")).toBeVisible()
  await shot(page, "09-admin-homepage-cms-form")
})

test("admin homepage CMS — save stat override and verify on /home", async ({ page }) => {
  const testCount = "999"

  await page.goto("/admin/settings/homepage")
  await page.locator("#cms-user-count").fill(testCount)
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Settings saved.")).toBeVisible()
  await shot(page, "10-admin-homepage-cms-saved")

  // Verify on /home
  await page.goto("/home")
  await expect(page.getByText("999")).toBeVisible()
  await shot(page, "10b-home-stat-override")

  // Restore
  await page.goto("/admin/settings/homepage")
  await page.locator("#cms-user-count").fill("auto")
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Settings saved.")).toBeVisible()
})

test("admin homepage CMS — about title update reflects on /home", async ({ page }) => {
  const newTitle = `About AIRA QA ${TS}`

  await page.goto("/admin/settings/homepage")
  await page.locator("#cms-title").fill(newTitle)
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Settings saved.")).toBeVisible()

  await page.goto("/home")
  await expect(page.getByRole("heading", { name: newTitle })).toBeVisible()
  await shot(page, "11-home-about-title-override")

  // Restore
  await page.goto("/admin/settings/homepage")
  await page.locator("#cms-title").fill("")
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Settings saved.")).toBeVisible()
})

// ─── Public: Sidebar ──────────────────────────────────────────────────────────

test("public sidebar — renders DB categories", async ({ page }) => {
  await page.goto("/home")
  await expect(page.getByRole("link", { name: "Restaurants" })).toBeVisible()
  // "Health & Wellness" is the seeded name (not "Healthcare")
  await expect(page.getByRole("link", { name: "Health & Wellness" })).toBeVisible()
  await shot(page, "12-public-sidebar-db-categories")
})

// ─── Public: Listings ─────────────────────────────────────────────────────────

test("public listings — valid slug loads listings page", async ({ page }) => {
  await page.goto("/listings/restaurants")
  await expect(page).not.toHaveURL(/404/)
  await expect(page.locator("body")).not.toContainText("This page could not be found")
  await expect(page.locator("body")).not.toContainText("That's on us")
  await shot(page, "13-public-listing-valid-slug")
})

test("public listings — unknown slug returns 404", async ({ page }) => {
  const response = await page.goto("/listings/xyz-does-not-exist-qa")
  const is404Status = response?.status() === 404
  const is404Page = await page.getByText("This page could not be found").isVisible()
  expect(is404Status || is404Page).toBe(true)
  await shot(page, "14-public-listing-unknown-slug-404")
})

// ─── Public: Home ─────────────────────────────────────────────────────────────

test("public /home — renders about section and stat cards", async ({ page }) => {
  await page.goto("/home")
  await expect(page.getByText("Businesses Listed")).toBeVisible()
  await expect(page.getByText("Community Members")).toBeVisible()
  await shot(page, "15-public-home")
})
