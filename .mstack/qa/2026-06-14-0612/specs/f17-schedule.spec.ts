// F17 — Configurable renewal schedule — end-to-end admin flow.

import { test, expect, type Page } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ASSETS_DIR = path.resolve(__dirname, "../assets")
const STATE_DIR = path.resolve(__dirname, "../.auth")

function shot(page: Page, name: string) {
  return page.screenshot({ path: path.join(ASSETS_DIR, `${name}.png`), fullPage: true })
}

async function newAuthedPage(browser: import("@playwright/test").Browser, persona: string) {
  const ctx = await browser.newContext({
    storageState: path.join(STATE_DIR, `${persona}.json`),
    viewport: { width: 1440, height: 900 },
  })
  const page = await ctx.newPage()
  return { ctx, page }
}

function psql(sql: string): string {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("DATABASE_URL not set")
  return execSync(`psql "${dbUrl}" -t -A`, { input: sql, encoding: "utf-8" }).trim()
}

test.describe.serial("F17 renewal schedule — admin end-to-end", () => {
  test("S1 — Sidebar Settings entry points at the hub", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin", { waitUntil: "networkidle" })
    const sidebar = page.locator("aside").first()
    const settingsLink = sidebar.getByRole("link", { name: /Settings/i }).first()
    await expect(settingsLink).toBeVisible()
    await expect(settingsLink).toHaveAttribute("href", "/admin/settings")
    await shot(page, "s1-sidebar-settings")
  })

  test("S2 — Hub renders both cards and links navigate", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/settings", { waitUntil: "networkidle" })
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
    await expect(page.getByRole("link", { name: /Homepage/i })).toBeVisible()
    const renewalLink = page.getByRole("link", { name: /Renewal schedule/i })
    await expect(renewalLink).toBeVisible()
    await shot(page, "s2-hub")
    await Promise.all([
      page.waitForURL(/\/admin\/settings\/renewal-schedule/, { timeout: 20_000 }),
      renewalLink.click(),
    ])
  })

  test("S3 — Renewal page prefills '7'", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/settings/renewal-schedule", { waitUntil: "networkidle" })
    const input = page.getByLabel(/Reminder windows/i)
    await expect(input).toHaveValue("7")
    await expect(page.getByText(/Reminders will fire once/i)).toBeVisible()
    await expect(page.getByText(/7 days? before/i)).toBeVisible()
    await shot(page, "s3-prefilled")
  })

  test("S4 — Inline validation rejects bad inputs", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/settings/renewal-schedule", { waitUntil: "networkidle" })
    const input = page.getByLabel(/Reminder windows/i)
    const save = page.getByRole("button", { name: /Save schedule/i })
    // Scope to inside the form to avoid Next.js's hidden route-announcer
    // <div role="alert">. The form's inline error is also role="alert".
    const formAlert = page.locator("form").locator('[role="alert"]')

    await input.fill("0")
    await expect(formAlert).toContainText(/between 1 and 365/i)
    await expect(save).toBeDisabled()
    await shot(page, "s4a-zero")

    await input.fill("30,30,7")
    await expect(formAlert).toContainText(/duplicate/i)
    await expect(save).toBeDisabled()
    await shot(page, "s4b-dupes")

    await input.fill("abc")
    await expect(formAlert).toContainText(/not a positive integer/i)
    await expect(save).toBeDisabled()

    await input.fill("366")
    await expect(formAlert).toContainText(/between 1 and 365/i)
    await expect(save).toBeDisabled()

    await input.fill("1,2,3,4,5,6,7,8,9,10,11")
    await expect(formAlert).toContainText(/Maximum 10/i)
    await expect(save).toBeDisabled()
    await shot(page, "s4c-too-many")
  })

  test("S5 — Save '30, 14, 7' succeeds", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/settings/renewal-schedule", { waitUntil: "networkidle" })
    const input = page.getByLabel(/Reminder windows/i)
    await input.fill("30, 14, 7")
    // Preview reflects parsed windows.
    await expect(page.getByText(/Reminders will fire 3 times/i)).toBeVisible()
    await shot(page, "s5a-typed")

    const save = page.getByRole("button", { name: /Save schedule/i })
    await expect(save).toBeEnabled()
    await save.click()
    // Scope to inside the form to avoid Next.js's hidden announcer.
    const formStatus = page.locator("form").locator('[role="status"]')
    await expect(formStatus).toContainText(/Schedule saved/i, { timeout: 10_000 })
    await shot(page, "s5b-saved")
  })

  test("S6 — DB + audit row written", async () => {
    const value = psql(`SELECT value FROM app_setting WHERE key='reminder_schedule'`)
    expect(value).toBe("30, 14, 7")

    const auditAction = psql(
      `SELECT action FROM audit_log
       WHERE actor_id = '00000000-0000-4000-8000-0000000000b1'
         AND target_id = 'reminder_schedule'
       ORDER BY at DESC LIMIT 1`,
    )
    expect(auditAction).toBe("app_setting.updated")

    const auditMeta = psql(
      `SELECT metadata::text FROM audit_log
       WHERE actor_id = '00000000-0000-4000-8000-0000000000b1'
         AND target_id = 'reminder_schedule'
       ORDER BY at DESC LIMIT 1`,
    )
    // Postgres jsonb is serialized with spaces after colons — assert against
    // the JSON-parsed value so formatting can't trip us up.
    const meta = JSON.parse(auditMeta) as { old: string; new: string; key: string }
    expect(meta.key).toBe("reminder_schedule")
    expect(meta.old).toBe("7")
    expect(meta.new).toBe("30, 14, 7")
  })

  test("S7 — Server rejects bad PATCH even if client bypassed", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin", { waitUntil: "networkidle" })
    // Send the PATCH from inside the authed browser context so cookies + CSRF
    // (if any) match the same auth chain the UI uses.
    const result = await page.evaluate(async () => {
      const r = await fetch("/api/v1/admin/app-settings/reminder-schedule", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: "0" }),
      })
      const body = await r.text()
      return { status: r.status, body }
    })
    expect(result.status).toBe(400)
    expect(result.body).toContain("validation.input")
  })

  test("S8 — Cron Run-now loops windows and reports them in cron_run.summary", async ({ browser }) => {
    // Set up: schedule = "30" (single window), seed a paid subscription
    // expiring in exactly 30 days. The cron should pick it up and write a
    // matching summary line to cron_run.
    const setupSql = `
      DELETE FROM business_subscription WHERE id = 'f17-qa-sub';
      DELETE FROM businesses WHERE id = 'f17-qa-biz';
      INSERT INTO businesses (id, name, slug, category, tier, verified, deleted_at, created_at, updated_at)
        VALUES ('f17-qa-biz', 'F17 QA Biz', 'f17-qa-biz', 'restaurants', 'tier3', false, NULL, now(), now());
      INSERT INTO business_subscription (id, business_id, plan_id, payment_status, start_date, end_date, amount_cents, created_at, updated_at)
        VALUES ('f17-qa-sub', 'f17-qa-biz', NULL, 'paid', now(), now() + interval '30 days', 0, now(), now());
      UPDATE app_setting SET value = '30' WHERE key = 'reminder_schedule';
      DELETE FROM cron_run WHERE job_name = 'renewal-reminder';
    `
    psql(setupSql)

    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/cron", { waitUntil: "networkidle" })

    // Locate the renewal-reminder section and click its Run now button.
    const section = page.locator("section", { hasText: "renewal-reminder" })
    await expect(section).toBeVisible()
    await section.getByRole("button", { name: /Run now/i }).click()

    // Wait for the run to land in cron_run with a non-running status.
    await expect.poll(
      () => psql(`SELECT status FROM cron_run WHERE job_name='renewal-reminder' ORDER BY started_at DESC LIMIT 1`),
      { timeout: 10_000, intervals: [500] },
    ).toBe("succeeded")

    const summary = psql(
      `SELECT summary FROM cron_run WHERE job_name='renewal-reminder' ORDER BY started_at DESC LIMIT 1`,
    )
    expect(summary).toContain("Sent 1 email")
    expect(summary).toContain("30")

    const rowsAffected = psql(
      `SELECT rows_affected FROM cron_run WHERE job_name='renewal-reminder' ORDER BY started_at DESC LIMIT 1`,
    )
    expect(rowsAffected).toBe("1")

    await shot(page, "s8-cron-run")

    // Cleanup so re-runs are clean.
    psql(`
      DELETE FROM business_subscription WHERE id = 'f17-qa-sub';
      DELETE FROM businesses WHERE id = 'f17-qa-biz';
    `)
  })
})
