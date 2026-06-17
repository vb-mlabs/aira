// Owner-side: /account/listings shows the businesses you're linked to.
//
// Uses .auth/owner-1.json (OWNER_1's cookie) — overrides the admin default.

import { test, expect } from "@playwright/test"
import { QA } from "../setup/global-setup"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")

test.use({
  storageState: path.join(__dirname, "..", ".auth", "owner-1.json"),
})

test("S4 — owner sees BIZ_LINKED on /account/listings", async ({ page }) => {
  await page.goto("/account")
  // The /account hub doesn't have an h1 — it renders the user's name/email
  // at the top. Assert on the owner-1 email instead, scoped to <main> so
  // the sidebar headers don't cause strict-mode violations
  // (qa-playwright-gotchas #3 — three <header>s).
  await expect(page.locator("main").getByText(QA.OWNER_1.email)).toBeVisible()

  // The "My listings" menu link is the new entry — confirm it's present and
  // routes to /account/listings.
  const listingsLink = page.getByRole("link", { name: /My listings/i })
  await expect(listingsLink).toBeVisible()
  await page.screenshot({
    path: path.join(ASSETS, "s4-01-account-menu.png"),
    fullPage: false,
  })

  await listingsLink.click()
  await expect(page).toHaveURL(/\/account\/listings$/)
  await expect(page.getByRole("heading", { name: "My listings" })).toBeVisible()

  // OWNER_1 is linked to BIZ_LINKED only (BIZ_ARCHIVED is unlinked in the seed).
  await expect(page.getByText(QA.BIZ_LINKED.name)).toBeVisible()
  await page.screenshot({
    path: path.join(ASSETS, "s4-02-my-listings.png"),
    fullPage: true,
  })

  // Confirm the active row links to its public detail page. We assert on
  // the href attribute rather than navigating + waiting for hydration to
  // avoid the FeatureImageControl hydration-mismatch warning racing the
  // URL assertion. The link itself is the contract that matters.
  const card = page
    .locator("main")
    .getByRole("link")
    .filter({ hasText: QA.BIZ_LINKED.name })
  await expect(card).toHaveAttribute(
    "href",
    "/listings/restaurants/qa-biz-linked",
  )
})
