// /admin/settings tabbed hub — super_admin lands on Categories tab via
// redirect; clicking each tab navigates to the right route; App tab
// inlines both Homepage CMS and Renewal schedule forms.

import { test, expect } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")
const AUTH = path.join(__dirname, "..", ".auth")

test.use({ storageState: path.join(AUTH, "super_admin.json") })

test("S3 — /admin/settings redirects to /admin/settings/categories", async ({
  page,
}) => {
  await page.goto("/admin/settings", { waitUntil: "networkidle" })
  await expect(page).toHaveURL(/\/admin\/settings\/categories$/)
})

test("S4 — Settings tabs render all 5 tabs in order", async ({ page }) => {
  await page.goto("/admin/settings/categories")
  const tabs = page.getByRole("navigation", { name: "Settings" })
  await expect(tabs).toBeVisible()

  // All 5 tabs visible
  await expect(tabs.getByRole("link", { name: "Categories" })).toBeVisible()
  await expect(tabs.getByRole("link", { name: "Cities" })).toBeVisible()
  await expect(tabs.getByRole("link", { name: "Membership plans" })).toBeVisible()
  await expect(tabs.getByRole("link", { name: "Sponsorship tiers" })).toBeVisible()
  await expect(tabs.getByRole("link", { name: "App" })).toBeVisible()

  // Active tab is Categories (aria-current="page")
  await expect(
    tabs.getByRole("link", { name: "Categories" }),
  ).toHaveAttribute("aria-current", "page")

  await page.screenshot({
    path: path.join(ASSETS, "s4-tabs-categories.png"),
    fullPage: true,
  })
})

test("S4b — Tabs are navigable and update active state", async ({ page }) => {
  await page.goto("/admin/settings/categories")
  const tabs = page.getByRole("navigation", { name: "Settings" })

  await tabs.getByRole("link", { name: "Cities" }).click()
  await expect(page).toHaveURL(/\/admin\/settings\/cities$/)
  await expect(tabs.getByRole("link", { name: "Cities" })).toHaveAttribute(
    "aria-current",
    "page",
  )

  await tabs.getByRole("link", { name: "Membership plans" }).click()
  await expect(page).toHaveURL(/\/admin\/settings\/membership-plans$/)

  await tabs.getByRole("link", { name: "Sponsorship tiers" }).click()
  await expect(page).toHaveURL(/\/admin\/settings\/sponsorship-tiers$/)

  await tabs.getByRole("link", { name: "App" }).click()
  await expect(page).toHaveURL(/\/admin\/settings\/app$/)
})

test("S5 — App tab inlines Homepage CMS + Renewal schedule", async ({ page }) => {
  await page.goto("/admin/settings/app")

  // Section headers visible
  await expect(
    page.getByRole("heading", { name: "Homepage", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Renewal schedule", exact: true }),
  ).toBeVisible()

  // Homepage CMS form fields (controlled inputs from HomepageCmsForm)
  // Field id="homepage_about_title" etc. — checking presence by name
  // attribute via input lookups inside the Homepage section.
  const main = page.locator("main")
  await expect(main.getByLabel("About title")).toBeVisible()
  await expect(main.getByLabel("About body")).toBeVisible()

  // Renewal schedule form: the input + Save button live inside the
  // Renewal schedule card. Scope by section heading.
  const scheduleSection = main
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Renewal schedule", exact: true }) })
  // The form renders a Save button — distinct from the Homepage Save.
  await expect(
    scheduleSection.getByRole("button", { name: /save/i }),
  ).toBeVisible()

  await page.screenshot({
    path: path.join(ASSETS, "s5-app-tab.png"),
    fullPage: true,
  })
})
