import { test, expect } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")

// Combined spec — covers both the earlier "Send a notification" removal
// and the subsequent collapse of Role/Ban/Reset into one Account-actions
// card with confirmation modals.

test("admin/users/[id] — Account actions layout + confirm modals", async ({ page }) => {
  // QA Urgency Admin's seeded id from global-setup.ts. Plain admin
  // viewing their own profile — Role row is hidden (super_admin only)
  // and Ban is self-disabled, but Reset is always available.
  await page.goto("/admin/users/00000000-0000-4000-8000-0000000016a1")

  await page.screenshot({
    path: path.join(ASSETS, "06-user-detail-account-actions.png"),
    fullPage: true,
  })

  // Notify removal still holds.
  await expect(
    page.getByRole("heading", { name: "Send a notification" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: /Send notification|Sending…/i }),
  ).toHaveCount(0)

  // The 3 old dedicated cards are gone — replaced by one Account-actions
  // section. The Audit-log card stays as a separate section.
  await expect(
    page.getByRole("heading", { name: "Role" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: /^Ban$|^Banned$/ }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "Password reset" }),
  ).toHaveCount(0)

  await expect(
    page.getByRole("heading", { name: "Account actions" }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Audit log" }),
  ).toBeVisible()

  // Status row (with "Ban user" button disabled because self) and
  // Password row (with "Send reset" button enabled) are visible. The
  // Role row is absent because the viewing admin is not super_admin.
  await expect(page.getByText("Status", { exact: true })).toBeVisible()
  await expect(page.getByText("Password", { exact: true })).toBeVisible()
  await expect(page.getByText("Role", { exact: true })).toHaveCount(0)

  // Click "Send reset" → confirm dialog opens with the reset-email copy.
  await page.getByRole("button", { name: "Send reset" }).click()
  await expect(
    page.getByRole("alertdialog").getByText(
      "Send password reset email?",
    ),
  ).toBeVisible()
  await expect(
    page.getByRole("alertdialog").getByText(
      /A password reset link will be sent to/,
    ),
  ).toBeVisible()

  await page.screenshot({
    path: path.join(ASSETS, "07-user-detail-reset-confirm-modal.png"),
    fullPage: false,
  })

  // Cancel closes the dialog without firing the action.
  await page.getByRole("button", { name: "Cancel" }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
})
