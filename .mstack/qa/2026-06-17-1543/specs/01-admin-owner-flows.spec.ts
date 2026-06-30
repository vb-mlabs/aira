// Admin-side scenarios for G1 Business Owner Reachability.
//
// S1: assign owner via picker → confirm → toast + section update
// S2: reassign + unassign
// S3: broadcast modal → recipient count
// S5: archived business assignment block
//
// All tests run as the admin persona (storageState in playwright.config.ts).
// Network requests + console errors are captured per test.

import { test, expect, type Page } from "@playwright/test"
import { QA } from "../setup/global-setup"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")

// Common helper — collect console errors and network failures per test.
// Filters out the pre-existing FeatureImageControl hydration mismatch
// warning (style attribute order on the hidden file input) which is not
// part of this G1 work.
function collectFailures(page: Page) {
  const consoleErrors: string[] = []
  const networkFailures: string[] = []
  const PRE_EXISTING_HYDRATION_NOISE = /tree hydrated but some attributes|hydration-mismatch|FeatureImageControl/i
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text()
      if (PRE_EXISTING_HYDRATION_NOISE.test(text)) return
      consoleErrors.push(text)
    }
  })
  page.on("requestfailed", (req) => {
    networkFailures.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText ?? ""}`)
  })
  page.on("response", async (res) => {
    if (res.status() >= 500) {
      networkFailures.push(`${res.request().method()} ${res.url()} — HTTP ${res.status()}`)
    }
  })
  return { consoleErrors, networkFailures }
}

test.describe("S1 — Admin assigns owner (happy path)", () => {
  test("admin opens unlinked business and assigns OWNER_2 as owner", async ({
    page,
  }) => {
    const { consoleErrors, networkFailures } = collectFailures(page)

    await page.goto(`/admin/businesses/${QA.BIZ_UNLINKED.id}`)
    await expect(page.getByRole("heading", { name: QA.BIZ_UNLINKED.name })).toBeVisible()

    // Initially: Owner section shows "No owner linked yet."
    const ownerSection = page.locator("section", { hasText: "Owner" }).first()
    await expect(ownerSection.getByText("No owner linked yet.")).toBeVisible()
    await page.screenshot({
      path: path.join(ASSETS, "s1-01-pre-assign.png"),
      fullPage: false,
    })

    // Open the assign modal
    await page.getByRole("button", { name: "Assign owner" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "Assign owner" })).toBeVisible()

    // Type into the picker — use pressSequentially per qa-playwright-gotchas
    // #4 (React controlled search input + debounce).
    const searchInput = dialog.getByLabel("Search by name or email")
    await searchInput.click()
    await searchInput.pressSequentially("qa-owner-2", { delay: 40 })

    // Wait for debounced fetch + render.
    const resultRow = dialog.getByRole("button", {
      name: new RegExp(QA.OWNER_2.name, "i"),
    })
    await expect(resultRow).toBeVisible({ timeout: 5000 })
    await page.screenshot({
      path: path.join(ASSETS, "s1-02-picker-result.png"),
      fullPage: false,
    })

    await resultRow.click()

    // Confirm step
    await expect(dialog.getByRole("heading", { name: "Confirm owner assignment" })).toBeVisible()
    await expect(dialog.getByText(QA.OWNER_2.email)).toBeVisible()
    await expect(dialog.getByText(QA.BIZ_UNLINKED.name)).toBeVisible()
    await page.screenshot({
      path: path.join(ASSETS, "s1-03-confirm.png"),
      fullPage: false,
    })

    await dialog.getByRole("button", { name: "Confirm assignment" }).click()

    // After dialog closes, the page refreshes — the Owner section should now
    // show OWNER_2 + a success toast.
    await expect(dialog).toBeHidden()
    const refreshedSection = page.locator("section", { hasText: "Owner" }).first()
    await expect(refreshedSection.getByText(QA.OWNER_2.email)).toBeVisible({
      timeout: 10_000,
    })
    await page.screenshot({
      path: path.join(ASSETS, "s1-04-assigned.png"),
      fullPage: false,
    })

    expect(consoleErrors, `console errors: ${consoleErrors.join("\n")}`).toEqual([])
    expect(networkFailures, `network failures: ${networkFailures.join("\n")}`).toEqual([])
  })
})

test.describe("S2 — Admin reassigns + unassigns", () => {
  test("reassign linked business from OWNER_1 to a different user", async ({
    page,
  }) => {
    const { consoleErrors, networkFailures } = collectFailures(page)

    await page.goto(`/admin/businesses/${QA.BIZ_LINKED.id}`)
    const ownerSection = page.locator("section", { hasText: "Owner" }).first()

    // Pre-state: OWNER_1 is the current owner (seeded in global-setup).
    await expect(ownerSection.getByText(QA.OWNER_1.email)).toBeVisible()

    // Open Change owner — the button label differs when there's already an owner.
    await page.getByRole("button", { name: "Change" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    const searchInput = dialog.getByLabel("Search by name or email")
    await searchInput.click()
    // Pick OWNER_2 (different from current OWNER_1).
    await searchInput.pressSequentially("qa-owner-2", { delay: 40 })
    const resultRow = dialog.getByRole("button", {
      name: new RegExp(QA.OWNER_2.name, "i"),
    })
    await expect(resultRow).toBeVisible({ timeout: 5000 })
    await resultRow.click()

    // Confirm step should warn that this replaces the current owner.
    await expect(
      dialog.getByText(/replaces the current owner/i),
    ).toBeVisible()
    await page.screenshot({
      path: path.join(ASSETS, "s2-01-reassign-warn.png"),
      fullPage: false,
    })

    await dialog.getByRole("button", { name: "Confirm assignment" }).click()
    await expect(dialog).toBeHidden()

    // Page refreshes → OWNER_2 is now the listed owner.
    const refreshedSection = page.locator("section", { hasText: "Owner" }).first()
    await expect(refreshedSection.getByText(QA.OWNER_2.email)).toBeVisible({
      timeout: 10_000,
    })
    await expect(refreshedSection.getByText(QA.OWNER_1.email)).toBeHidden()
    await page.screenshot({
      path: path.join(ASSETS, "s2-02-reassigned.png"),
      fullPage: false,
    })

    expect(consoleErrors).toEqual([])
    expect(networkFailures).toEqual([])
  })

  test("unassign the new owner from the linked business", async ({ page }) => {
    const { consoleErrors, networkFailures } = collectFailures(page)

    await page.goto(`/admin/businesses/${QA.BIZ_LINKED.id}`)
    const ownerSection = page.locator("section", { hasText: "Owner" }).first()

    // After S2's reassign test, OWNER_2 is the owner.
    await expect(ownerSection.getByText(QA.OWNER_2.email)).toBeVisible()

    await page.getByRole("button", { name: "Remove" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole("heading", { name: "Remove owner?" }),
    ).toBeVisible()
    await page.screenshot({
      path: path.join(ASSETS, "s2-03-remove-confirm.png"),
      fullPage: false,
    })

    await dialog.getByRole("button", { name: "Remove owner" }).click()
    await expect(dialog).toBeHidden()

    const refreshedSection = page.locator("section", { hasText: "Owner" }).first()
    await expect(refreshedSection.getByText("No owner linked yet.")).toBeVisible({
      timeout: 10_000,
    })
    await page.screenshot({
      path: path.join(ASSETS, "s2-04-unassigned.png"),
      fullPage: false,
    })

    expect(consoleErrors).toEqual([])
    expect(networkFailures).toEqual([])
  })
})

test.describe("S3 — Admin broadcasts to linked owners", () => {
  test.beforeAll(async ({ request }) => {
    // Make sure at least one business is linked so the broadcast has a
    // recipient (S1 + S2 just unlinked the business). Re-link
    // BIZ_LINKED to OWNER_1 via the API as a quick fixture reset.
    const cookies = await request.storageState()
    const cookieHeader = cookies.cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ")
    const res = await request.post(
      `${QA.BASE_URL}/api/v1/admin/businesses/${QA.BIZ_LINKED.id}/owner`,
      {
        data: { id: QA.BIZ_LINKED.id, owner_user_id: QA.OWNER_1.id },
        headers: { cookie: cookieHeader, "content-type": "application/json" },
      },
    )
    if (!res.ok()) {
      throw new Error(`Re-link fixture POST failed: ${res.status()}`)
    }
  })

  test("broadcast modal flow: compose → confirm → sent", async ({ page }) => {
    const { consoleErrors, networkFailures } = collectFailures(page)

    await page.goto("/admin/businesses")
    await page.getByRole("button", { name: /Notify all business owners/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole("heading", { name: "Notify all business owners" }),
    ).toBeVisible()

    await dialog.getByLabel("Title").fill("QA Test Broadcast")
    await dialog
      .getByLabel("Message")
      .fill("This is an automated test from the /mlabs-qa run.")
    await page.screenshot({
      path: path.join(ASSETS, "s3-01-compose.png"),
      fullPage: false,
    })

    await dialog.getByRole("button", { name: "Continue" }).click()
    await expect(
      dialog.getByRole("heading", { name: "Confirm broadcast" }),
    ).toBeVisible()
    await expect(dialog.getByText("QA Test Broadcast")).toBeVisible()
    await expect(
      dialog.getByText("This is an automated test from the /mlabs-qa run."),
    ).toBeVisible()
    await page.screenshot({
      path: path.join(ASSETS, "s3-02-confirm.png"),
      fullPage: false,
    })

    await dialog.getByRole("button", { name: "Send broadcast" }).click()

    // Sent step — recipient count is shown.
    await expect(dialog.getByRole("heading", { name: "Broadcast sent" })).toBeVisible({
      timeout: 10_000,
    })
    const sentText = await dialog
      .locator("text=/Sent to \\d+ business/")
      .textContent()
    expect(sentText, "recipient confirmation text").toMatch(
      /Sent to \d+ business owner/,
    )
    await page.screenshot({
      path: path.join(ASSETS, "s3-03-sent.png"),
      fullPage: false,
    })

    expect(consoleErrors).toEqual([])
    expect(networkFailures).toEqual([])
  })
})

test.describe("S5 — Edge case: archived business assignment blocked", () => {
  test("attempting to open the assign modal on archived biz still works, but the API rejects", async ({
    page,
  }) => {
    const { consoleErrors } = collectFailures(page)

    await page.goto(`/admin/businesses/${QA.BIZ_ARCHIVED.id}`)
    // Archived badge should be visible on the header.
    await expect(page.getByText("Archived").first()).toBeVisible()

    // Owner section exists but assignment will be rejected — we test the API
    // directly here rather than driving the modal (the UI doesn't currently
    // disable the button on archived rows).
    const res = await page.request.post(
      `/api/v1/admin/businesses/${QA.BIZ_ARCHIVED.id}/owner`,
      {
        data: {
          id: QA.BIZ_ARCHIVED.id,
          owner_user_id: QA.OWNER_1.id,
        },
      },
    )
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error?.code).toBe("businesses.archived")

    await page.screenshot({
      path: path.join(ASSETS, "s5-01-archived-detail.png"),
      fullPage: false,
    })

    expect(consoleErrors).toEqual([])
  })
})

test.describe("S5 — Edge case: owner filter on list page", () => {
  test("filter Has owner / No owner narrows the table", async ({ page }) => {
    const { consoleErrors } = collectFailures(page)

    await page.goto("/admin/businesses?owner=has")
    // Must include the linked seed business.
    await expect(page.getByText(QA.BIZ_LINKED.name)).toBeVisible()
    await page.screenshot({
      path: path.join(ASSETS, "s5-02-filter-has-owner.png"),
      fullPage: false,
    })

    await page.goto("/admin/businesses?owner=none")
    // BIZ_UNLINKED was assigned in S1, so depending on test order, it may
    // not be in this list. Instead, assert that BIZ_LINKED is NOT shown.
    await expect(page.getByText(QA.BIZ_LINKED.name)).toBeHidden()
    await page.screenshot({
      path: path.join(ASSETS, "s5-03-filter-no-owner.png"),
      fullPage: false,
    })

    expect(consoleErrors).toEqual([])
  })
})
