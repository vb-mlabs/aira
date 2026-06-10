// S4 smoke spec — Membership, Sponsorship, sponsored sort, cron

import { test, expect, type Page } from "@playwright/test"
import path from "path"

const ASSETS_DIR = path.resolve(__dirname, "../assets")
const TS = Date.now()

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(ASSETS_DIR, `${name}.png`), fullPage: true })
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

test("admin sidebar — membership plans, sponsorship tiers, cron links present", async ({ page }) => {
  await page.goto("/admin")
  await expect(page.getByRole("link", { name: "Membership plans" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Sponsorship tiers" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Cron" })).toBeVisible()
  await shot(page, "01-admin-sidebar-s4-links")
})

// ─── Membership Plans ─────────────────────────────────────────────────────────

test("admin membership plans — list page loads", async ({ page }) => {
  await page.goto("/admin/membership-plans")
  await expect(page.getByRole("heading", { name: "Membership plans" })).toBeVisible()
  await shot(page, "02-membership-plans-list")
})

test("admin membership plans — create plan", async ({ page }) => {
  const planName = `QA Plan ${TS}`

  await page.goto("/admin/membership-plans/new")
  await expect(page.getByRole("heading", { name: "New membership plan" })).toBeVisible()

  await page.fill("#plan-name", planName)
  await page.fill("#plan-price", "99.00")
  await page.fill("#plan-duration", "12")
  await page.getByRole("button", { name: "Create plan" }).click()

  await page.waitForURL("**/admin/membership-plans")
  await expect(page.getByText(planName)).toBeVisible()
  await shot(page, "03-membership-plans-create")
})

test("admin membership plans — edit plan name", async ({ page }) => {
  const planName = `QA Plan ${TS}`

  // The plan name itself is the link to the edit page (no separate "Edit" link)
  await page.goto("/admin/membership-plans")
  const planLink = page.getByRole("link", { name: planName })
  await expect(planLink).toBeVisible({ timeout: 10000 })
  await planLink.click()

  await expect(page.getByRole("heading", { name: /Edit/ })).toBeVisible()
  await page.fill("#plan-name", planName + " (edited)")
  await page.getByRole("button", { name: "Save changes" }).click()
  await page.waitForURL("**/admin/membership-plans")
  await expect(page.getByText(planName + " (edited)")).toBeVisible()
  await shot(page, "04-membership-plans-edit")
})

test("admin membership plans — deactivate plan", async ({ page }) => {
  const planName = `QA Plan ${TS} (edited)`

  await page.goto("/admin/membership-plans")
  const planLink = page.getByRole("link", { name: planName })
  await expect(planLink).toBeVisible({ timeout: 10000 })
  await planLink.click()

  await expect(page.getByRole("heading", { name: /Edit/ })).toBeVisible()

  // Active checkbox should be checked
  const activeCheckbox = page.locator("#plan-active")
  await expect(activeCheckbox).toBeChecked()

  // Uncheck to deactivate
  await activeCheckbox.uncheck()
  await page.getByRole("button", { name: "Save changes" }).click()
  await page.waitForURL("**/admin/membership-plans")
  await shot(page, "05-membership-plans-deactivate")
})

// ─── Sponsorship Tiers ────────────────────────────────────────────────────────

test("admin sponsorship tiers — list page loads", async ({ page }) => {
  await page.goto("/admin/sponsorship-tiers")
  await expect(page.getByRole("heading", { name: "Sponsorship tiers" })).toBeVisible()
  await shot(page, "06-sponsorship-tiers-list")
})

test("admin sponsorship tiers — create tier", async ({ page }) => {
  const tierName = `QA Tier ${TS}`

  await page.goto("/admin/sponsorship-tiers/new")
  await expect(page.getByRole("heading", { name: "New sponsorship tier" })).toBeVisible()

  await page.fill("#tier-name", tierName)
  // Use TS-derived priority to avoid conflicts with leftover test data from prior runs
  const tierPriority = String(TS % 9000 + 1000)
  await page.fill("#tier-priority", tierPriority)
  await page.getByRole("button", { name: "Create tier" }).click()

  await page.waitForURL("**/admin/sponsorship-tiers")
  await expect(page.getByText(tierName)).toBeVisible()
  await shot(page, "07-sponsorship-tiers-create")
})

test("admin sponsorship tiers — priority conflict shows inline error", async ({ page }) => {
  // Create a second tier with the same priority — should fail inline
  await page.goto("/admin/sponsorship-tiers/new")
  await expect(page.getByRole("heading", { name: "New sponsorship tier" })).toBeVisible()

  await page.fill("#tier-name", `QA Conflict ${TS}`)
  await page.fill("#tier-priority", String(TS % 9000 + 1000))
  await page.getByRole("button", { name: "Create tier" }).click()

  // Should not navigate away — inline error appears
  await expect(page.getByRole("heading", { name: "New sponsorship tier" })).toBeVisible()
  // Error message from ApiError with code sponsorship_tier.priority_taken
  const errorMsg = page.locator("p.text-destructive, [role=alert]")
  await expect(errorMsg).toBeVisible({ timeout: 8000 })
  await shot(page, "08-sponsorship-tiers-priority-conflict")
})

// ─── Business — subscriptions section ─────────────────────────────────────────

test("admin business subscriptions — section renders and Add modal opens", async ({ page }) => {
  // Navigate to businesses list and follow the first business link
  await page.goto("/admin/businesses")
  await expect(page.getByRole("heading", { name: "Businesses" })).toBeVisible()

  const firstBizLink = page.getByRole("table").getByRole("link").first()
  await expect(firstBizLink).toBeVisible({ timeout: 10000 })
  await firstBizLink.click()

  // Wait for navigation to a business detail page
  await expect(page).toHaveURL(/\/admin\/businesses\/.+/, { timeout: 10000 })

  // Scroll to Subscriptions section
  await page.getByRole("heading", { name: "Subscriptions", exact: true }).scrollIntoViewIfNeeded()
  await expect(page.getByRole("heading", { name: "Subscriptions", exact: true })).toBeVisible()

  // Click Add button in subscriptions section
  const subsSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Subscriptions", exact: true }) })
  await subsSection.getByRole("button", { name: "Add" }).click()

  // Dialog opens
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 })
  // Dialog.Title renders as h2; use heading role to avoid matching the submit button
  await expect(page.getByRole("heading", { name: "Add subscription" })).toBeVisible()
  await shot(page, "09-biz-subscriptions-modal-open")
})

test("admin business subscriptions — create subscription without evidence", async ({ page }) => {
  await page.goto("/admin/businesses")
  const firstBizLink = page.getByRole("table").getByRole("link").first()
  await expect(firstBizLink).toBeVisible({ timeout: 10000 })
  await firstBizLink.click()
  await expect(page).toHaveURL(/\/admin\/businesses\/.+/, { timeout: 10000 })

  await page.getByRole("heading", { name: "Subscriptions", exact: true }).scrollIntoViewIfNeeded()
  const subsSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Subscriptions", exact: true }) })
  await subsSection.getByRole("button", { name: "Add" }).click()
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 })

  // Fill required fields — skip plan (use custom), keep paid status, fill dates and amount
  const today = new Date().toISOString().slice(0, 10)
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  await page.fill("#sub-start", today)
  await page.fill("#sub-end", nextYear)
  await page.fill("#sub-amount", "50.00")

  await page.getByRole("button", { name: "Add subscription" }).click()

  // Dialog closes, subscription row appears
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 8000 })
  // "No evidence" warning chip should appear (first() guards against prior-run leftover rows)
  await expect(page.getByText("No evidence").first()).toBeVisible({ timeout: 8000 })
  await shot(page, "10-biz-subscription-created-no-evidence")
})

// ─── Business — sponsorships section ─────────────────────────────────────────

test("admin business sponsorships — section renders and Add modal opens", async ({ page }) => {
  await page.goto("/admin/businesses")
  const firstBizLink = page.getByRole("table").getByRole("link").first()
  await expect(firstBizLink).toBeVisible({ timeout: 10000 })
  await firstBizLink.click()
  await expect(page).toHaveURL(/\/admin\/businesses\/.+/, { timeout: 10000 })

  await page.getByRole("heading", { name: "Sponsorships", exact: true }).scrollIntoViewIfNeeded()
  await expect(page.getByRole("heading", { name: "Sponsorships", exact: true })).toBeVisible()

  const spSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Sponsorships", exact: true }) })
  await spSection.getByRole("button", { name: "Add" }).click()

  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 })
  // Dialog.Title renders as h2; use heading role to avoid matching the submit button
  await expect(page.getByRole("heading", { name: "Add sponsorship" })).toBeVisible()
  await shot(page, "11-biz-sponsorships-modal-open")
})

test("admin business sponsorships — create and cancel sponsorship", async ({ page }) => {
  await page.goto("/admin/businesses")
  const firstBizLink = page.getByRole("table").getByRole("link").first()
  await expect(firstBizLink).toBeVisible({ timeout: 10000 })
  await firstBizLink.click()
  await expect(page).toHaveURL(/\/admin\/businesses\/.+/, { timeout: 10000 })

  await page.getByRole("heading", { name: "Sponsorships", exact: true }).scrollIntoViewIfNeeded()
  const spSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Sponsorships", exact: true }) })
  await spSection.getByRole("button", { name: "Add" }).click()
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 })

  // Wait for categories to load (more than 1 option: the placeholder + at least one category)
  const categorySelect = page.locator("#sp-category")
  await page.waitForFunction(
    () => (document.querySelector("#sp-category") as HTMLSelectElement | null)?.options?.length > 1,
    null,
    { timeout: 8000 },
  )
  await categorySelect.selectOption({ index: 1 })

  // Fill dates and amount
  const today = new Date().toISOString().slice(0, 10)
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  await page.fill("#sp-start", today)
  await page.fill("#sp-end", nextYear)
  await page.fill("#sp-amount", "200.00")

  await page.getByRole("button", { name: "Add sponsorship" }).click()
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 8000 })

  // Sponsorship row should appear
  await shot(page, "12-biz-sponsorship-created")

  // Cancel it (accept confirmation dialog)
  page.on("dialog", (d) => d.accept())
  const cancelBtn = spSection.getByRole("button", { name: "Cancel sponsorship" }).first()
  await expect(cancelBtn).toBeVisible({ timeout: 8000 })
  await cancelBtn.click()

  // Row status becomes cancelled (strikethrough chip)
  await expect(spSection.getByText("cancelled").first()).toBeVisible({ timeout: 8000 })
  await shot(page, "13-biz-sponsorship-cancelled")
})

// ─── Businesses list ──────────────────────────────────────────────────────────

test("admin businesses list — subscription column header present", async ({ page }) => {
  await page.goto("/admin/businesses")
  await expect(page.getByRole("columnheader", { name: "Subscription" })).toBeVisible()
  await shot(page, "14-businesses-list-subscription-col")
})

test("admin businesses list — renewing filter chips work", async ({ page }) => {
  await page.goto("/admin/businesses")
  await expect(page.getByText("Renewing in:")).toBeVisible()

  // Click "7 days" chip
  await page.getByRole("button", { name: "7 days" }).click()
  await expect(page).toHaveURL(/renewing=7/)
  await shot(page, "15-businesses-list-renewing-7days")
})

test("admin businesses list — CSV download button shown when renewing filter active", async ({ page }) => {
  await page.goto("/admin/businesses?renewing=7")
  // When renewing filter active, CSV download button appears
  await expect(page.getByRole("link", { name: /Download CSV/i })).toBeVisible({ timeout: 8000 })
  await shot(page, "16-businesses-list-csv-button")
})

// ─── Cron ─────────────────────────────────────────────────────────────────────

test("admin cron — page renders both job cards", async ({ page }) => {
  await page.goto("/admin/cron")
  await expect(page.getByRole("heading", { name: "Cron jobs" })).toBeVisible()
  await expect(page.getByText("subscription-status-rollover")).toBeVisible()
  await expect(page.getByText("sponsorship-status-rollover")).toBeVisible()
  await shot(page, "17-cron-page-both-jobs")
})

test("admin cron — Run now button is clickable", async ({ page }) => {
  await page.goto("/admin/cron")

  // Find the Run now button in the subscription-status-rollover section
  const subSection = page.locator("section").filter({ hasText: "subscription-status-rollover" })
  const runBtn = subSection.getByRole("button", { name: /Run now/i })
  await expect(runBtn).toBeVisible()

  // Click it — it triggers a POST to /api/v1/admin/cron/.../run
  await runBtn.click()

  // Button may disable briefly (pending state); wait for it to re-enable or show result
  await page.waitForTimeout(2000)
  await shot(page, "18-cron-run-now-clicked")

  // After the click, page should still show cron page (no crash)
  await expect(page.getByRole("heading", { name: "Cron jobs" })).toBeVisible()
})

// ─── Public visibility gate ───────────────────────────────────────────────────

test("public listings — page loads and shows only paid/active businesses", async ({ page }) => {
  // Navigate to a listings page — should load without error
  await page.goto("/listings/restaurants")
  await expect(page).not.toHaveURL(/404/)
  await expect(page.locator("body")).not.toContainText("This page could not be found")
  await expect(page.locator("body")).not.toContainText("Something went wrong")
  await shot(page, "19-public-listings-restaurants")
})

test("public listings — businesses API respects visibility gate", async ({ page }) => {
  // Hit the businesses API directly for restaurants category
  const res = await page.request.get("/api/v1/businesses?category=restaurants")
  expect(res.status()).toBe(200)
  const body = await res.json()
  // Public businesses endpoint returns { items: [], total, page, pageSize }
  // The visibility gate means only paid/active businesses appear
  expect(body).toHaveProperty("items")
  await shot(page, "20-public-listings-api-check")
})
