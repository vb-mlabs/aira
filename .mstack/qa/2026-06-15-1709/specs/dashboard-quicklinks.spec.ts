// QA regression — dashboard QuickLinks should be role-aware (issue 1 from
// .mstack/qa/2026-06-15-1709/report.md). Plain admin must not see a card
// pointing into /admin/audit because that route is super_admin-only.

import { test, expect } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")
const AUTH = path.join(__dirname, "..", ".auth")

test.describe("Issue 1 — dashboard QuickLinks gated by role", () => {
  test("plain admin: Audit log card hidden; Businesses + Users present", async ({
    page,
  }) => {
    await page.context().addCookies([]) // no-op; keeps test self-contained
    const ctx = await page.context().browser()!.newContext({
      storageState: path.join(AUTH, "admin.json"),
    })
    const p = await ctx.newPage()
    await p.goto("/admin")
    const manageSection = p
      .locator("section")
      .filter({ has: p.getByRole("heading", { name: "Manage", exact: true }) })
    await expect(
      manageSection.getByRole("link", { name: /Businesses/ }),
    ).toBeVisible()
    await expect(
      manageSection.getByRole("link", { name: /Users/ }),
    ).toBeVisible()
    await expect(
      manageSection.getByRole("link", { name: /Audit log/ }),
    ).toHaveCount(0)
    await p.screenshot({
      path: path.join(ASSETS, "fix-1-dashboard-admin.png"),
      fullPage: true,
    })
    await ctx.close()
  })

  test("super_admin: all three cards visible", async ({ page }) => {
    const ctx = await page.context().browser()!.newContext({
      storageState: path.join(AUTH, "super_admin.json"),
    })
    const p = await ctx.newPage()
    await p.goto("/admin")
    const manageSection = p
      .locator("section")
      .filter({ has: p.getByRole("heading", { name: "Manage", exact: true }) })
    await expect(
      manageSection.getByRole("link", { name: /Businesses/ }),
    ).toBeVisible()
    await expect(
      manageSection.getByRole("link", { name: /Users/ }),
    ).toBeVisible()
    await expect(
      manageSection.getByRole("link", { name: /Audit log/ }),
    ).toBeVisible()
    await p.screenshot({
      path: path.join(ASSETS, "fix-1-dashboard-super-admin.png"),
      fullPage: true,
    })
    await ctx.close()
  })
})
