// F23′ admin renewal follow-up queue — 13 scenarios + regression checks.

import { test, expect, type Page } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ASSETS_DIR = path.resolve(__dirname, "../assets")
const STATE_DIR = path.resolve(__dirname, "../.auth")

const ADMIN_ID = "00000000-0000-4000-8000-0000000000e1"
const FIXTURES = {
  business_id: "00000000-0000-4000-8000-0000000000e2",
  sub_overdue: "00000000-0000-4000-8000-0000000000e3",
  sub_due_3d: "00000000-0000-4000-8000-0000000000e4",
  sub_due_20d: "00000000-0000-4000-8000-0000000000e5",
}

function shot(page: Page, name: string) {
  return page.screenshot({
    path: path.join(ASSETS_DIR, `${name}.png`),
    fullPage: true,
  })
}

async function newAuthedPage(
  browser: import("@playwright/test").Browser,
  persona: string,
) {
  const ctx = await browser.newContext({
    storageState: path.join(STATE_DIR, `${persona}.json`),
    viewport: { width: 1440, height: 900 },
  })
  const page = await ctx.newPage()
  const consoleErrors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  return { ctx, page, consoleErrors }
}

/**
 * Open the first row's modal reliably under dev-mode Turbopack. The cold
 * compile + hydration race in Next.js dev means a single .click() or
 * Enter-press can land before React attaches the onClick handler. Retry
 * pressing Enter up to 5 times waiting for the dialog to appear.
 */
async function openFirstRowModal(page: Page) {
  const row = page
    .locator("table tbody tr")
    .filter({ hasText: /Patel Catering/ })
    .first()
  await expect(row).toBeVisible()
  const dialog = page.getByRole("dialog")
  for (let attempt = 0; attempt < 5; attempt++) {
    await row.focus()
    await page.waitForTimeout(800)
    await page.keyboard.press("Enter")
    try {
      await expect(dialog).toBeVisible({ timeout: 8000 })
      return
    } catch {
      // Retry — bundle/hydration likely still warming.
    }
  }
  // Final attempt with full timeout so the failure carries a real trace.
  await expect(dialog).toBeVisible({ timeout: 30000 })
}

function psql(sql: string): string {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("DATABASE_URL not set")
  return execSync(`psql "${dbUrl}" -t -A`, {
    input: sql,
    encoding: "utf-8",
  }).trim()
}

test.describe.serial("F23′ renewal follow-up queue", () => {
  test("S1 — Queue lists 3 fixture subscriptions, overdue first", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals", { waitUntil: "domcontentloaded" })

    // Header subtitle: "1 overdue · 2 due in 30 days"
    await expect(
      page.locator("p").filter({ hasText: /overdue/i }),
    ).toBeVisible()

    // Table rows — three for the fixture business.
    const rows = page.locator("table tbody tr").filter({
      hasText: /Patel Catering/,
    })
    await expect(rows).toHaveCount(3)

    // Overdue row appears first (top of table). Expiry cell carries
    // "OVERDUE 2d" exactly.
    const firstRow = rows.first()
    await expect(firstRow).toContainText(/OVERDUE\s*2d/i)

    // Second row is the 3-day one ("in 3 days") and third is the 20-day
    // (will render as a MM/DD/YYYY date past 7d).
    await expect(rows.nth(1)).toContainText(/in 3 days/i)
    await shot(page, "s1-queue-default-30d")
  })

  test("S2 — Window chip 7d hides 20d row", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals?withinDays=7", {
      waitUntil: "domcontentloaded",
    })
    const rows = page.locator("table tbody tr").filter({
      hasText: /Patel Catering/,
    })
    // Overdue + 3-day = 2 rows; 20-day hidden.
    await expect(rows).toHaveCount(2)

    // The 7-day chip carries aria-current=page.
    const chip = page
      .locator("nav[aria-label='Window'] a")
      .filter({ hasText: "7 days" })
    await expect(chip).toHaveAttribute("aria-current", "page")
    await shot(page, "s2-chip-7d")
  })

  test("S3 — Row click opens modal (base-ui Dialog)", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals", { waitUntil: "domcontentloaded" })

    // Click the first (overdue) row.
    const rows = page.locator("table tbody tr").filter({
      hasText: /Patel Catering/,
    })
    await rows.first().click()

    // Modal heading is the business name. Dev-mode compile of the modal
    // bundle on first hit can take 10-20s; bump the wait window.
    await expect(
      page.getByRole("dialog").locator("h2", { hasText: /Patel Catering/ }),
    ).toBeVisible({ timeout: 30000 })

    // OVERDUE label in the dialog header description.
    await expect(page.getByRole("dialog")).toContainText(/OVERDUE/i)
    await shot(page, "s3-modal-open")
  })

  test("S4 — Modal lazy-loads history; shows 'No attempts yet' initially", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals", { waitUntil: "domcontentloaded" })
    await openFirstRowModal(page)
    // The history section header.
    await expect(
      page.getByRole("dialog").getByText(/Recent attempts/i),
    ).toBeVisible({ timeout: 30000 })
    // After the lazy fetch lands, "No attempts yet" appears.
    await expect(
      page.getByRole("dialog").getByText(/No attempts yet/i),
    ).toBeVisible({ timeout: 30000 })
    await shot(page, "s4-history-empty")
  })

  test("S5 — Outcome=called without a note is blocked", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals", { waitUntil: "domcontentloaded" })
    await openFirstRowModal(page)
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 30000 })
    await dialog.getByLabel(/^Called/).check()
    // Note still empty — Save should be disabled.
    const save = dialog.getByRole("button", { name: /Save outcome/ })
    await expect(save).toBeDisabled()
    await shot(page, "s5-called-no-note-disabled")
  })

  test("S6 — Save voicemail annotates row but keeps it in queue (shipped behaviour)", async ({
    browser,
  }) => {
    // Note: the plan's prose says only paid + future-scheduled_next drop
    // from queue; the plan's outcome-table says all outcomes drop. Shipped
    // matches the prose. Flagged as Issue 1 in the report.
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals", { waitUntil: "domcontentloaded" })
    await openFirstRowModal(page)
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 30000 })
    await dialog.getByLabel(/^Voicemail/).check()
    await dialog.getByRole("button", { name: /Save outcome/ }).click()
    await expect(dialog).toBeHidden({ timeout: 30000 })
    const rows = page.locator("table tbody tr").filter({
      hasText: /Patel Catering/,
    })
    // Still 3 rows; first row now shows "Voicemail · just now" in Last attempt.
    await expect(rows).toHaveCount(3, { timeout: 15000 })
    await expect(rows.first()).toContainText(/Voicemail/i, { timeout: 15000 })
    await shot(page, "s6-voicemail-annotated-row-stays")
  })

  test("S7 — Reschedule with scheduleDays=1 drops the overdue row", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals", { waitUntil: "domcontentloaded" })
    // After S6 (voicemail on overdue, still in queue) — open it again and
    // reschedule for 1 day. Reschedule sets scheduled_next > now so the
    // queue filter excludes the row.
    await openFirstRowModal(page)
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 30000 })
    await dialog.getByLabel(/^Reschedule/).check()
    const scheduleInput = dialog.locator("input#followup-schedule-days")
    await expect(scheduleInput).toBeVisible()
    await scheduleInput.fill("1")
    await dialog.getByRole("button", { name: /Save outcome/ }).click()
    await expect(dialog).toBeHidden({ timeout: 30000 })
    // Overdue row dropped; 3d + 20d remain.
    const rows = page.locator("table tbody tr").filter({
      hasText: /Patel Catering/,
    })
    await expect(rows).toHaveCount(2, { timeout: 15000 })
    await shot(page, "s7-reschedule-saved")
  })

  test("S8 — Paid outcome holds modal open with 'Record payment' link", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals?withinDays=30", {
      waitUntil: "domcontentloaded",
    })
    await openFirstRowModal(page)
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 30000 })
    await dialog.getByLabel(/Marked paid/).check()
    await dialog.getByRole("button", { name: /Save outcome/ }).click()
    // Modal stays open with the deep-link.
    const link = dialog.getByRole("link", { name: /Record payment/ })
    await expect(link).toBeVisible({ timeout: 5000 })
    await expect(link).toHaveAttribute(
      "href",
      `/admin/businesses/${FIXTURES.business_id}`,
    )
    await shot(page, "s8-paid-recordpayment-link")
  })

  test("S9 — Tap-to-call + WhatsApp icons present with correct hrefs", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals?withinDays=90", {
      waitUntil: "domcontentloaded",
    })
    const rows = page.locator("table tbody tr").filter({
      hasText: /Patel Catering/,
    })
    if ((await rows.count()) === 0) {
      // After S6+S7+S8 the queue may be empty; reseed before checking.
      psql(`DELETE FROM subscription_followup WHERE actor_id = '${ADMIN_ID}'`)
      await page.reload({ waitUntil: "domcontentloaded" })
    }
    const firstRow = rows.first()
    await expect(
      firstRow.locator("a[href^='tel:']").first(),
    ).toHaveAttribute("href", /tel:/)
    await expect(
      firstRow.locator("a[href^='https://wa.me/']").first(),
    ).toHaveAttribute("href", /wa\.me/)
    await shot(page, "s9-contact-icons")
  })

  test("S10 — /admin/audit shows business.subscription_followup rows", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" })
    // The action column is mono-font text containing the exact action kind.
    const actionCells = page
      .locator("td")
      .filter({ hasText: /^business\.subscription_followup$/ })
    // We've saved at least 3 outcomes in S6/S7/S8 — assert ≥3.
    expect(await actionCells.count()).toBeGreaterThanOrEqual(3)
    await shot(page, "s10-audit-rows")
  })

  test("S11 — Sidebar 'Renewals' is item 2 and highlighted on /admin/renewals", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals", { waitUntil: "domcontentloaded" })
    const navLinks = page.locator("aside nav[aria-label='Admin'] a")
    // First nav row should be Dashboard, second Businesses, third Renewals.
    await expect(navLinks.nth(0)).toContainText(/Dashboard/i)
    await expect(navLinks.nth(1)).toContainText(/Businesses/i)
    await expect(navLinks.nth(2)).toContainText(/Renewals/i)
    await expect(navLinks.nth(3)).toContainText(/Categories/i)
    // Active state on Renewals.
    await expect(navLinks.nth(2)).toHaveAttribute("aria-current", "page")
    await shot(page, "s11-sidebar-renewals-active")
  })

  test("S12 — No hydration warnings on /admin/renewals", async ({
    browser,
  }) => {
    const { page, consoleErrors } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals", { waitUntil: "domcontentloaded" })
    // Settle the page a beat for late-arriving warnings.
    await page.waitForTimeout(300)
    const hydration = consoleErrors.filter((m) =>
      /Hydration|hydrated|did not match|server.*client/i.test(m),
    )
    expect(hydration).toEqual([])
  })

  test("S13a — Regression: /admin/businesses?renewing=14 still renders + CSV link", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/businesses?renewing=14", {
      waitUntil: "domcontentloaded",
    })
    // The renewing chip is highlighted. RenewingFilter renders buttons, not links.
    const chip = page.getByRole("button", { name: /^14 days$/ })
    await expect(chip).toBeVisible()
    // Download CSV link present.
    const csv = page.getByRole("link", { name: /Download CSV/ })
    await expect(csv).toBeVisible()
    await expect(csv).toHaveAttribute(
      "href",
      /\/api\/v1\/admin\/businesses\/renewals\.csv/,
    )
    await shot(page, "s13a-businesses-renewing-page")
  })

  test("S13b — CSV download returns a valid CSV with our fixture", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    const res = await page.request.get(
      "/api/v1/admin/businesses/renewals.csv?renewing=30",
    )
    expect(res.ok()).toBeTruthy()
    expect(res.headers()["content-type"]).toContain("text/csv")
    const body = await res.text()
    // Header line.
    expect(body.split("\n")[0]).toMatch(/business_id,business_name/)
    // Our fixture business name should appear.
    expect(body).toContain("Patel Catering")
  })

  test("S14 — Refused outcome drops the row permanently (hybrid fix)", async ({
    browser,
  }) => {
    // Wipe followups so the queue starts with all 3 fixture rows.
    psql(`DELETE FROM subscription_followup WHERE actor_id = '${ADMIN_ID}'`)
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals?withinDays=30", {
      waitUntil: "domcontentloaded",
    })
    await openFirstRowModal(page)
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 30000 })
    await dialog.getByLabel(/^Refused/).check()
    await dialog.getByRole("button", { name: /Save outcome/ }).click()
    await expect(dialog).toBeHidden({ timeout: 30000 })
    const rows = page.locator("table tbody tr").filter({
      hasText: /Patel Catering/,
    })
    // Overdue dropped permanently; 3d + 20d remain.
    await expect(rows).toHaveCount(2, { timeout: 15000 })
    await shot(page, "s14-refused-drops")
  })

  test("S15 — Called (with note) auto-reschedules 7d and drops (hybrid fix)", async ({
    browser,
  }) => {
    psql(`DELETE FROM subscription_followup WHERE actor_id = '${ADMIN_ID}'`)
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/renewals?withinDays=30", {
      waitUntil: "domcontentloaded",
    })
    await openFirstRowModal(page)
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 30000 })
    await dialog.getByLabel(/^Called/).check()
    await dialog
      .locator("textarea#followup-note")
      .fill("Spoke to Asha — renewing next week, will pay then.")
    await dialog.getByRole("button", { name: /Save outcome/ }).click()
    await expect(dialog).toBeHidden({ timeout: 30000 })
    const rows = page.locator("table tbody tr").filter({
      hasText: /Patel Catering/,
    })
    // Overdue drops because called auto-sets scheduled_next = now+7d.
    await expect(rows).toHaveCount(2, { timeout: 15000 })

    // Spot-check the DB: latest followup for the overdue subscription has
    // scheduled_next ~7 days from now.
    const days = psql(`
      SELECT EXTRACT(EPOCH FROM (scheduled_next - now())) / 86400.0
      FROM subscription_followup
      WHERE subscription_id = '${FIXTURES.sub_overdue}'
      ORDER BY created_at DESC LIMIT 1
    `)
    const parsed = parseFloat(days)
    expect(parsed).toBeGreaterThan(6.9)
    expect(parsed).toBeLessThan(7.1)
    await shot(page, "s15-called-auto-7d-drops")
  })

  test("S13c — Regression: F20 community moderation still works", async ({
    browser,
  }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/community", { waitUntil: "domcontentloaded" })
    // Status filter nav present and table renders without error.
    await expect(
      page.getByRole("navigation", { name: /Filter by status/i }),
    ).toBeVisible()
    await shot(page, "s13c-community-still-works")
  })
})
