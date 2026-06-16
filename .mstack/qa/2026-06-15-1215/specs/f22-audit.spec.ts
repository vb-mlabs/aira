// F22 admin audit log UI — 9 scenarios.
// Covers: English rendering of all 24 action kinds, actor typeahead,
// target-type filter, action filter (optgroups), combined AND filters,
// empty state, hydration safety, target-id links.

import { test, expect, type Page } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ASSETS_DIR = path.resolve(__dirname, "../assets")
const STATE_DIR = path.resolve(__dirname, "../.auth")

const ADMIN_ID = "00000000-0000-4000-8000-0000000000e1"
const ACTOR2_ID = "00000000-0000-4000-8000-0000000000f1"
const ACTOR2_EMAIL = "f22-actor2@mlabs.test"
const BUSINESS_ID = "00000000-0000-4000-8000-0000000000e2"
const SUB_ID = "00000000-0000-4000-8000-0000000000e3"

function shot(page: Page, name: string) {
  return page.screenshot({
    path: path.join(ASSETS_DIR, `${name}.png`),
    fullPage: true,
  })
}

async function newAuthedPage(browser: import("@playwright/test").Browser) {
  const ctx = await browser.newContext({
    storageState: path.join(STATE_DIR, "admin.json"),
    viewport: { width: 1440, height: 900 },
  })
  const page = await ctx.newPage()
  const consoleErrors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  return { ctx, page, consoleErrors }
}

test.describe.serial("F22 audit log UI", () => {
  // ─── S1: Page loads, English detail, target links ──────────────────────
  test("S1 — Page loads with no filters; English detail + target links visible", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser)
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" })

    // Table header renders.
    await expect(page.locator("th").filter({ hasText: "What happened" })).toBeVisible({
      timeout: 30000,
    })
    await expect(page.locator("th").filter({ hasText: "Target" })).toBeVisible()
    await expect(page.locator("th").filter({ hasText: "Actor" })).toBeVisible()
    await expect(page.locator("th").filter({ hasText: "When" })).toBeVisible()

    // At least one row with English text (not raw JSON).
    // "Archived business" is a simple deterministic render we seeded.
    await expect(
      page.locator("td").filter({ hasText: /Archived business/i }).first(),
    ).toBeVisible({ timeout: 15000 })

    // At least one target-link to /admin/businesses/<id>.
    const bizLink = page.locator(`a[href="/admin/businesses/${BUSINESS_ID}"]`).first()
    await expect(bizLink).toBeVisible()

    // At least one target-link to /admin/users/<id>.
    const userLink = page.locator(`a[href="/admin/users/${ACTOR2_ID}"]`).first()
    await expect(userLink).toBeVisible()

    // "app_setting" target renders full key text (not a link).
    await expect(
      page.locator("code").filter({ hasText: /reminder_schedule/ }).first(),
    ).toBeVisible()

    // "session" target renders muted "session" text (not a UUID link).
    await expect(
      page.locator("td span.text-muted-foreground").filter({ hasText: /^session$/ }).first(),
    ).toBeVisible()

    await shot(page, "s1-page-loaded")
  })

  // ─── S2: All 24 action kinds render English ──────────────────────────────
  test("S2 — All 24 action kinds render an English sentence (no raw JSON)", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser)
    // Use a large page size via URL to get all seeded rows.
    // Our 24 seeded rows + anything from F23 followups should all fit on p1
    // since the default page size is 50 and we only seeded 24.
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" })
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 })

    // For each known kind, filter to that action and verify the "What happened"
    // cell does NOT contain raw JSON (no leading `{`).
    const kindToExpected: Array<[string, RegExp]> = [
      ["user.role_changed", /Changed role from/i],
      ["user.banned", /Banned/i],
      ["user.unbanned", /Unbanned/i],
      ["user.password_reset_sent", /Sent password.reset email/i],
      ["user.email_changed", /Changed email address/i],
      ["user.deleted_anonymized", /Account deleted/i],
      ["session.revoked", /Session revoked by admin/i],
      ["user.avatar_changed", /Changed avatar/i],
      ["user.avatar_removed", /Removed avatar/i],
      ["user.name_changed", /Changed display name/i],
      ["user.admin_notified", /Notified:/i],
      ["user.signed_in", /Signed in/i],
      ["user.signed_in_failed", /Sign.in failed/i],
      ["user.signed_up", /Signed up/i],
      ["business.archived", /Archived business/i],
      ["business.restored", /Restored business/i],
      ["business.subscription_recorded", /Recorded subscription as/i],
      ["business.subscription_voided", /Voided subscription/i],
      ["business.sponsorship_assigned", /Assigned sponsorship/i],
      ["business.sponsorship_cancelled", /Cancelled sponsorship/i],
      ["business.subscription_followup", /Logged.*follow.up/i],
      ["app_setting.updated", /Updated/i],
      ["community.post_deleted", /Deleted post/i],
      ["community.post_edited", /Edited post fields/i],
    ]

    for (const [action, expectedText] of kindToExpected) {
      await page.goto(`/admin/audit?action=${encodeURIComponent(action)}`, {
        waitUntil: "domcontentloaded",
      })
      await expect(page.locator("table")).toBeVisible({ timeout: 30000 })

      // The "What happened" cell must contain English text matching expectedText.
      const detailCells = page.locator("td").filter({ hasText: expectedText })
      const count = await detailCells.count()

      // Also verify no cell contains raw JSON (starts with `{`).
      const allDetailCells = page.locator("table tbody tr td:nth-child(4)")
      const firstCellText = await allDetailCells.first().textContent()
      expect(firstCellText?.trim().startsWith("{")).toBe(false)

      expect(count).toBeGreaterThanOrEqual(1)
    }

    await shot(page, "s2-all-kinds-render")
  })

  // ─── S3: Actor typeahead ─────────────────────────────────────────────────
  test("S3 — Actor typeahead: search → select locks ?actor_id → clear drops → pagination resets", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser)
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" })
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 })

    // The filter bar renders with the Actor input.
    const actorInput = page.getByPlaceholder("Name or email…")
    await expect(actorInput).toBeVisible()

    // Wait for client hydration — input should be enabled before typing.
    await expect(actorInput).toBeEnabled({ timeout: 10000 })

    // Type character-by-character so React's onChange fires on each keystroke.
    await actorInput.click()
    await page.waitForTimeout(300)
    await actorInput.pressSequentially("f22-actor2", { delay: 50 })

    // Wait for dropdown to appear (300ms debounce + network).
    const dropdown = page.locator("ul[role='listbox']")
    await expect(dropdown).toBeVisible({ timeout: 10000 })

    // Dropdown shows actor2's name.
    await expect(dropdown).toContainText(/F22 Actor Two/i)

    // Click the result.
    await dropdown.locator("button").first().click()

    // URL should now have ?actor_id= set.
    await page.waitForURL(/actor_id=/, { timeout: 10000 })
    expect(page.url()).toContain(`actor_id=${ACTOR2_ID}`)

    // Pagination param should NOT be present (resets to page 1).
    expect(page.url()).not.toContain("page=")

    // The input now shows the locked actor label.
    await expect(actorInput).toHaveValue(/F22 Actor Two/i)

    await shot(page, "s3a-typeahead-selected")

    // Clear the actor filter via the X button.
    const clearBtn = page.getByRole("button", { name: /Clear actor filter/i })
    await expect(clearBtn).toBeVisible()
    await clearBtn.click()

    // URL should drop actor_id.
    await page.waitForURL((url) => !url.toString().includes("actor_id"), {
      timeout: 10000,
    })
    expect(page.url()).not.toContain("actor_id")

    // Input is empty again.
    await expect(actorInput).toHaveValue("")

    await shot(page, "s3b-typeahead-cleared")
  })

  // ─── S4: Target-type filter ───────────────────────────────────────────────
  test("S4 — Target-type filter: select 'business' → only business rows → clear", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser)
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" })
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 })

    const targetTypeSelect = page.locator("select").filter({
      has: page.locator("option", { hasText: /All/ }),
    }).first()

    // Select "business" target type.
    await targetTypeSelect.selectOption("business")

    // URL updates with target_type=business.
    await page.waitForURL(/target_type=business/, { timeout: 10000 })

    // All visible rows should have "BUSINESS" type label in the Target column.
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 })
    const targetLabels = page.locator("td span.uppercase")
    const count = await targetLabels.count()
    for (let i = 0; i < count; i++) {
      const text = await targetLabels.nth(i).textContent()
      expect(text?.toLowerCase()).toBe("business")
    }

    await shot(page, "s4a-target-type-business")

    // Clear via "Clear all" button.
    const clearAll = page.getByRole("button", { name: /Clear all/i })
    await expect(clearAll).toBeVisible()
    await clearAll.click()

    await page.waitForURL((url) => !url.toString().includes("target_type"), {
      timeout: 10000,
    })
    expect(page.url()).not.toContain("target_type")
    // Clear all button disappears.
    await expect(clearAll).toBeHidden()

    await shot(page, "s4b-target-type-cleared")
  })

  // ─── S5: Action filter with optgroups ────────────────────────────────────
  test("S5 — Action filter: optgroups present; select 'business.archived' → filtered; clear", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser)
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" })
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 })

    // Verify the <select> for action has <optgroup> elements.
    const actionSelect = page.locator("select").nth(1)
    const optgroupCount = await actionSelect.locator("optgroup").count()
    expect(optgroupCount).toBeGreaterThanOrEqual(4) // user, business, community, app_setting, session

    // Verify specific optgroup labels.
    await expect(actionSelect.locator("optgroup[label='User events']")).toBeAttached()
    await expect(actionSelect.locator("optgroup[label='Business events']")).toBeAttached()
    await expect(actionSelect.locator("optgroup[label='Community events']")).toBeAttached()

    // Select "business.archived".
    await actionSelect.selectOption("business.archived")
    await page.waitForURL(/action=business\.archived/, { timeout: 10000 })

    // Only "Archived business" rows appear.
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 })
    await expect(
      page.locator("td").filter({ hasText: /Archived business/i }).first(),
    ).toBeVisible()

    await shot(page, "s5a-action-filter-archived")

    // Clear.
    const clearAll = page.getByRole("button", { name: /Clear all/i })
    await clearAll.click()
    await page.waitForURL((url) => !url.toString().includes("action="), {
      timeout: 10000,
    })
    expect(page.url()).not.toContain("action=")

    await shot(page, "s5b-action-filter-cleared")
  })

  // ─── S6: Combined filters AND semantics ──────────────────────────────────
  test("S6 — Combined filters compose with AND semantics", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser)

    // Filter: actor = admin + action = business.archived
    // Our seed has actor=ADMIN_ID + action=business.archived → should return 1 row.
    await page.goto(
      `/admin/audit?actor_id=${ADMIN_ID}&action=business.archived`,
      { waitUntil: "domcontentloaded" },
    )
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 })

    // Should show exactly 1 "Archived business" row (seeded for ADMIN_ID).
    const rows = page.locator("table tbody tr")
    await expect(rows).toHaveCount(1, { timeout: 15000 })
    await expect(rows.first()).toContainText(/Archived business/i)

    // Subtitle says "match these filters".
    await expect(
      page.locator("p").filter({ hasText: /match these filters/i }),
    ).toBeVisible()

    await shot(page, "s6-combined-filters")
  })

  // ─── S7: Empty state ──────────────────────────────────────────────────────
  test("S7 — Empty state message when no rows match active filters", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser)

    // Use a future date range that guarantees zero rows.
    await page.goto("/admin/audit?since=2099-01-01&until=2099-01-02", {
      waitUntil: "domcontentloaded",
    })

    // Empty state component renders with filter-specific message.
    await expect(
      page.locator("*").filter({
        hasText: /No audit entries match these filters/i,
      }).first(),
    ).toBeVisible({ timeout: 30000 })

    // Table is absent.
    await expect(page.locator("table")).toBeHidden()

    // Subtitle says "0 entries match these filters".
    await expect(
      page.locator("p").filter({ hasText: /0 entries.*match these filters/i }),
    ).toBeVisible()

    await shot(page, "s7-empty-state")
  })

  // ─── S8: No hydration warnings ────────────────────────────────────────────
  test("S8 — No hydration warnings on /admin/audit", async ({ browser }) => {
    const { page, consoleErrors } = await newAuthedPage(browser)
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" })
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 })
    // Settle for late-arriving warnings.
    await page.waitForTimeout(500)
    const hydration = consoleErrors.filter((m) =>
      /Hydration|hydrated|did not match|server.*client/i.test(m),
    )
    expect(hydration).toEqual([])
    await shot(page, "s8-no-hydration-warnings")
  })

  // ─── S9: Target-id links navigate correctly ──────────────────────────────
  test("S9 — Target-id links: user → /admin/users/[id]; business_subscription → /admin/businesses/[business_id]", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser)

    // Check user target link.
    await page.goto(`/admin/audit?action=user.role_changed`, {
      waitUntil: "domcontentloaded",
    })
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 })
    const userLink = page.locator(`a[href="/admin/users/${ACTOR2_ID}"]`).first()
    await expect(userLink).toBeVisible()
    await expect(userLink).toHaveAttribute("href", `/admin/users/${ACTOR2_ID}`)

    await shot(page, "s9a-user-link")

    // Check business_subscription target link → resolves to business via LEFT JOIN.
    await page.goto(`/admin/audit?action=business.subscription_recorded`, {
      waitUntil: "domcontentloaded",
    })
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 })

    // The business_subscription row should link to /admin/businesses/<business_id>
    // (resolved from target_business_id via LEFT JOIN in listAudit).
    const subLink = page
      .locator(`a[href="/admin/businesses/${BUSINESS_ID}"]`)
      .first()
    await expect(subLink).toBeVisible({ timeout: 15000 })
    await expect(subLink).toHaveAttribute(
      "href",
      `/admin/businesses/${BUSINESS_ID}`,
    )

    await shot(page, "s9b-business-subscription-link")

    // Check that community_post target links to /admin/community.
    await page.goto(`/admin/audit?action=community.post_deleted`, {
      waitUntil: "domcontentloaded",
    })
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 })
    const communityLink = page.locator('a[href="/admin/community"]').first()
    await expect(communityLink).toBeVisible({ timeout: 15000 })

    await shot(page, "s9c-community-link")
  })
})
