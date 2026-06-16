import { test, expect } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")

// Verify the "Send a notification" card no longer renders on the user
// detail page. We navigate as the seeded admin (who is the only
// guaranteed user on the QA fixtures) to their own detail page.

test("admin/users/[id] — Send a notification card is hidden", async ({ page }) => {
  // QA Urgency Admin's seeded id from global-setup.ts
  await page.goto("/admin/users/00000000-0000-4000-8000-0000000016a1")

  await page.screenshot({
    path: path.join(ASSETS, "06-user-detail-no-notify.png"),
    fullPage: true,
  })

  // Section heading should NOT appear anywhere on the page.
  await expect(
    page.getByRole("heading", { name: "Send a notification" }),
  ).toHaveCount(0)

  // The form's submit button should NOT exist.
  await expect(
    page.getByRole("button", { name: /Send notification|Sending…/i }),
  ).toHaveCount(0)

  // The other sections still render (sanity check the rest of the page
  // didn't get nuked along with notify).
  await expect(
    page.getByRole("heading", { name: "Password reset" }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Audit log" }),
  ).toBeVisible()
})
