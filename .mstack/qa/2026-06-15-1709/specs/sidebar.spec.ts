// Sidebar role-aware filtering — plain admin sees only Operate rows;
// super_admin sees all three groups with the thin separator + extra
// padding between Operate / Setup / System.

import { test, expect } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")
const AUTH = path.join(__dirname, "..", ".auth")

test.describe("S1 — plain admin sidebar", () => {
  test.use({ storageState: path.join(AUTH, "admin.json") })

  test("shows only Operate group; no Setup/Audit log/Cron", async ({ page }) => {
    await page.goto("/admin")
    // Sidebar nav has aria-label="Admin". Scope all assertions to it so we
    // don't pick up tab strips or other navs on the page.
    const nav = page.getByRole("navigation", { name: "Admin" })
    await expect(nav).toBeVisible()

    // Expected visible rows for plain admin
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Businesses" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Renewals" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Community" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Users" })).toBeVisible()

    // Expected hidden rows
    await expect(nav.getByRole("link", { name: "Setup" })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Audit log" })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Cron" })).toHaveCount(0)

    await page.screenshot({
      path: path.join(ASSETS, "s1-sidebar-admin.png"),
      fullPage: false,
    })
  })
})

test.describe("S2 — super_admin sidebar", () => {
  test.use({ storageState: path.join(AUTH, "super_admin.json") })

  test("shows all 8 rows including Setup, Audit log, Cron", async ({ page }) => {
    await page.goto("/admin")
    const nav = page.getByRole("navigation", { name: "Admin" })
    await expect(nav).toBeVisible()

    // All operate rows
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Businesses" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Renewals" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Community" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Users" })).toBeVisible()

    // Setup + System rows
    await expect(nav.getByRole("link", { name: "Setup" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Audit log" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Cron" })).toBeVisible()

    await page.screenshot({
      path: path.join(ASSETS, "s2-sidebar-super-admin.png"),
      fullPage: false,
    })
  })

  test("Setup and Audit log rows carry the group-start separator class", async ({
    page,
  }) => {
    await page.goto("/admin")
    const nav = page.getByRole("navigation", { name: "Admin" })

    // The implementation adds `border-t` + `mt-2 pt-4` on the first row of
    // each group after Operate. Setup is /admin/settings; Audit log opens
    // the System group.
    const setupRow = nav.getByRole("link", { name: "Setup" })
    const auditRow = nav.getByRole("link", { name: "Audit log" })

    await expect(setupRow).toHaveClass(/border-t/)
    await expect(setupRow).toHaveClass(/mt-2/)
    await expect(setupRow).toHaveClass(/pt-4/)
    await expect(auditRow).toHaveClass(/border-t/)
    await expect(auditRow).toHaveClass(/mt-2/)
    await expect(auditRow).toHaveClass(/pt-4/)

    // Dashboard (the very first row) must NOT have the separator.
    const dashRow = nav.getByRole("link", { name: "Dashboard" })
    await expect(dashRow).not.toHaveClass(/border-t/)
  })
})
