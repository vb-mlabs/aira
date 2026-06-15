// User detail page — Role section only renders for super_admin callers.
// changeRoleOp is the security source of truth; this verifies the UI gate.

import { test, expect } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
import { ADMIN, SUPER_ADMIN } from "../setup/global-setup"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")
const AUTH = path.join(__dirname, "..", ".auth")

// Use the plain admin's own user id as the target — both personas can view
// it without depending on existing fixtures, and there's no self-action
// risk since the Role section is the only thing under test.
const TARGET_USER_ID = ADMIN.id

test.describe("S10 — plain admin viewing user detail", () => {
  test.use({ storageState: path.join(AUTH, "admin.json") })

  test("Role section is absent", async ({ page }) => {
    await page.goto(`/admin/users/${TARGET_USER_ID}`, {
      waitUntil: "networkidle",
    })
    // Bring the page into view; the role controls live inside a section
    // with an h2 reading "Role". When the gate works, that section is
    // not rendered at all.
    await expect(
      page.getByRole("heading", { name: "Role", exact: true }),
    ).toHaveCount(0)
    // The "Set as user" / "Set as admin" buttons live in the same gated
    // section — both should be missing.
    await expect(page.getByRole("button", { name: "Set as user" })).toHaveCount(
      0,
    )
    await expect(
      page.getByRole("button", { name: "Set as admin" }),
    ).toHaveCount(0)

    // Ban controls should still be visible — plain admin keeps moderation.
    await expect(
      page.getByRole("heading", { name: "Ban", exact: true }),
    ).toBeVisible()

    await page.screenshot({
      path: path.join(ASSETS, "s10-user-detail-admin.png"),
      fullPage: true,
    })
  })
})

test.describe("S11 — super_admin viewing user detail", () => {
  test.use({ storageState: path.join(AUTH, "super_admin.json") })

  test("Role section is present with both buttons", async ({ page }) => {
    await page.goto(`/admin/users/${TARGET_USER_ID}`, {
      waitUntil: "networkidle",
    })
    await expect(
      page.getByRole("heading", { name: "Role", exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Set as user" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Set as admin" }),
    ).toBeVisible()

    // Sanity: ban controls also visible.
    await expect(
      page.getByRole("heading", { name: "Ban", exact: true }),
    ).toBeVisible()

    await page.screenshot({
      path: path.join(ASSETS, "s11-user-detail-super-admin.png"),
      fullPage: true,
    })
  })
})

// Silences the unused-import lint — SUPER_ADMIN is exported so other specs
// can reference it; keeping the import here documents which personas this
// run uses.
test.skip(SUPER_ADMIN.id === ADMIN.id, "personas are distinct")
