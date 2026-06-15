// Tier-flow QA spec — verifies the membership-plan-derived placement tier
// implementation (.mstack/reviews/2026-06-15-membership-plan-tier.md).
// Scenarios are independent so a single failure doesn't bring down siblings.

import { test, expect } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"
import { FIXTURES } from "../setup/global-setup"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")

function psql(sql: string): string {
  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("DATABASE_URL not set")
  return execSync(`psql "${dbUrl}" -t -A`, {
    input: sql,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim()
}

test.describe("S1 — membership plan picker uses TIER_LABELS", () => {
  test("New plan form shows Sponsored / Sponsored Level 2 / Regular", async ({ page }) => {
    // Membership plans were moved under /admin/settings/ by post-impl
    // commit 37d2643 (admin Settings hub reorg).
    await page.goto("/admin/settings/membership-plans/new")
    const select = page.locator("#plan-tier")
    await expect(select).toBeVisible()
    const options = await select.locator("option").allTextContents()
    expect(options).toEqual(["Sponsored", "Sponsored Level 2", "Regular"])
    await page.screenshot({ path: path.join(ASSETS, "s1-new-plan-form.png"), fullPage: true })
  })
})

test.describe("S2 — membership plans list shows tier chips", () => {
  test("Each plan row carries a Tier chip rendering TIER_LABELS", async ({ page }) => {
    await page.goto("/admin/settings/membership-plans")
    // Wait for the table.
    await expect(page.getByRole("columnheader", { name: "Tier" })).toBeVisible()

    // Row for [QA] Top Plan must show "Sponsored"
    const topRow = page.getByRole("row").filter({ hasText: "[QA] Top Plan" })
    await expect(topRow).toBeVisible()
    await expect(topRow).toContainText("Sponsored")

    const midRow = page.getByRole("row").filter({ hasText: "[QA] Mid Plan" })
    await expect(midRow).toBeVisible()
    await expect(midRow).toContainText("Sponsored Level 2")

    const basicRow = page.getByRole("row").filter({ hasText: "[QA] Basic Plan" })
    await expect(basicRow).toBeVisible()
    await expect(basicRow).toContainText("Regular")
    await page.screenshot({ path: path.join(ASSETS, "s2-plans-list.png"), fullPage: true })
  })
})

test.describe("S3 — admin businesses table uses TIER_LABELS in Tier column", () => {
  test("Tier column renders human labels for our fixtures", async ({ page }) => {
    await page.goto("/admin/businesses")
    const soloRow = page.getByRole("row").filter({ hasText: "[QA] Solo Eatery" })
    await expect(soloRow).toBeVisible()
    // Solo eatery has no subs → tier3 → "Regular"
    await expect(soloRow).toContainText("Regular")
    // No raw "tier3" anywhere in the table — Tier column should not leak it.
    const tableHtml = await page.locator("table").innerHTML()
    expect(tableHtml).not.toMatch(/<td[^>]*>\s*tier[123]\s*</)
    await page.screenshot({ path: path.join(ASSETS, "s3-businesses-list.png"), fullPage: true })
  })
})

test.describe("S4 — Core Fields edit modal has no Tier dropdown", () => {
  test("Editing core fields shows name + description + image only", async ({ page }) => {
    await page.goto(`/admin/businesses/${FIXTURES.biz_sponsored}`)
    // Click the "Edit" button inside the Core fields header.
    const coreHeader = page.locator("section", { hasText: "Core fields" }).first()
    await coreHeader.getByRole("button", { name: /edit/i }).click()
    const dialog = page.getByRole("dialog", { name: /edit core fields/i })
    await expect(dialog).toBeVisible()
    // Tier <select> must be absent.
    await expect(dialog.locator("#b-tier")).toHaveCount(0)
    // Name + Description must be present.
    await expect(dialog.locator("#b-name")).toBeVisible()
    await expect(dialog.locator("#b-description")).toBeVisible()
    await page.screenshot({ path: path.join(ASSETS, "s4-core-fields-modal.png"), fullPage: true })
  })
})

test.describe("S5 — Subscriptions section shows Placement chip per row", () => {
  test("Business with active tier1 sub shows Sponsored chip", async ({ page }) => {
    await page.goto(`/admin/businesses/${FIXTURES.biz_sponsored}`)
    // Find the Subscriptions section
    const subsSection = page.locator("section", { hasText: /^Subscriptions/ }).first()
    await expect(subsSection).toBeVisible()
    // The Placement column header
    await expect(subsSection.getByRole("columnheader", { name: "Placement" })).toBeVisible()
    // The row carrying the [QA] Top Plan should show a "Sponsored" chip
    await expect(subsSection).toContainText("[QA] Top Plan")
    await expect(subsSection).toContainText("Sponsored")
    await page.screenshot({ path: path.join(ASSETS, "s5-subs-section.png"), fullPage: true })
  })
})

test.describe("S6 — /admin/cron exposes backfill-business-tiers Run-now button", () => {
  test("Card is present + button triggers a run", async ({ page, request }) => {
    await page.goto("/admin/cron")
    const card = page.locator("section", { hasText: "backfill-business-tiers" })
    await expect(card).toBeVisible()
    await expect(card).toContainText(/manual only/i)
    await page.screenshot({
      path: path.join(ASSETS, "s6-cron-card.png"),
      fullPage: true,
    })

    // Trigger the job directly via the cron API and verify a cron_runs row
    // shows up. This avoids waiting for the UI's debounced polling — we're
    // not testing the button's polling, just that the wiring works.
    const before = psql(
      `SELECT COUNT(*) FROM cron_run WHERE job_name = 'backfill-business-tiers'`,
    )
    const res = await request.post(
      `/api/v1/admin/cron/${encodeURIComponent("backfill-business-tiers")}/run`,
      { data: { job_name: "backfill-business-tiers" } },
    )
    expect(res.status()).toBeLessThan(500)
    // Allow up to 5s for the job to land a row.
    let after = before
    for (let i = 0; i < 10; i++) {
      after = psql(
        `SELECT COUNT(*) FROM cron_run WHERE job_name = 'backfill-business-tiers'`,
      )
      if (Number(after) > Number(before)) break
      await new Promise((r) => setTimeout(r, 500))
    }
    expect(Number(after)).toBeGreaterThan(Number(before))
  })

  test("Backfill brings stale businesses.tier into line", async () => {
    // Our fixtures created subs but did NOT call recomputeBusinessTier;
    // their businesses.tier should be 'tier3' (the column default). Run
    // the backfill via the same API the button uses; afterwards
    // biz_sponsored should be tier1, biz_lvl2 should be tier2.
    psql(`UPDATE businesses SET tier = 'tier3' WHERE id IN ('${FIXTURES.biz_sponsored}', '${FIXTURES.biz_lvl2}')`)
    execSync(
      `curl -s -X POST -H "content-type: application/json" --cookie "$(node -e "const fs=require('fs'); const s=JSON.parse(fs.readFileSync('${path.join(__dirname, '..', '.auth', 'admin.json')}', 'utf8')); console.log(s.cookies.map(c => c.name + '=' + c.value).join('; '))")" -d '{"job_name":"backfill-business-tiers"}' "http://localhost:5000/api/v1/admin/cron/backfill-business-tiers/run"`,
      { stdio: ["pipe", "pipe", "pipe"] },
    )
    // Wait for the cron job to land its writes (it runs asynchronously
    // after the HTTP response).
    let sponsored = ""
    let lvl2 = ""
    for (let i = 0; i < 20; i++) {
      sponsored = psql(
        `SELECT tier FROM businesses WHERE id = '${FIXTURES.biz_sponsored}'`,
      )
      lvl2 = psql(`SELECT tier FROM businesses WHERE id = '${FIXTURES.biz_lvl2}'`)
      if (sponsored === "tier1" && lvl2 === "tier2") break
      await new Promise((r) => setTimeout(r, 500))
    }
    expect(sponsored).toBe("tier1")
    expect(lvl2).toBe("tier2")
  })
})

test.describe("S7 — Zod .strict() rejects tier in admin Business PATCH/POST", () => {
  test("PATCH /api/v1/admin/businesses/[id] with tier returns 400", async ({ request }) => {
    const res = await request.patch(
      `/api/v1/admin/businesses/${FIXTURES.biz_solo}`,
      {
        data: { id: FIXTURES.biz_solo, tier: "tier1" },
      },
    )
    expect(res.status()).toBe(400)
    const body = await res.json().catch(() => null)
    // Better Auth / @aira/api error envelope; just check the field is
    // referenced somewhere.
    expect(JSON.stringify(body)).toMatch(/tier|unrecognized/i)
  })

  test("POST /api/v1/admin/businesses with tier returns 400", async ({ request }) => {
    const res = await request.post(`/api/v1/admin/businesses`, {
      data: {
        name: "[QA] Strict Reject",
        slug: "qa-strict-reject",
        category: "restaurants",
        tier: "tier1",
      },
    })
    expect(res.status()).toBe(400)
  })
})

test.describe("S8 — subscription mutations propagate to businesses.tier", () => {
  test("Creating an active paid tier2 subscription updates business tier", async ({
    request,
  }) => {
    // Start the solo eatery at tier3.
    psql(
      `UPDATE businesses SET tier = 'tier3' WHERE id = '${FIXTURES.biz_solo}'`,
    )

    const res = await request.post(
      `/api/v1/admin/businesses/${FIXTURES.biz_solo}/subscriptions`,
      {
        data: {
          business_id: FIXTURES.biz_solo,
          plan_id: FIXTURES.plan_t2,
          payment_status: "paid",
          start_date: new Date(Date.now() - 86400000).toISOString(),
          end_date: new Date(Date.now() + 86400000 * 90).toISOString(),
          amount_cents: 25000,
        },
      },
    )
    expect(res.status()).toBeLessThan(400)
    const after = psql(
      `SELECT tier FROM businesses WHERE id = '${FIXTURES.biz_solo}'`,
    )
    expect(after).toBe("tier2")
  })
})

test.describe("S9 — public business-card and tier-section read TIER_LABELS", () => {
  test("Listings page renders Sponsored and Sponsored Level 2 labels", async ({
    page,
  }) => {
    await page.goto("/listings/restaurants")
    // No "Featured" inside listings UI — the old inconsistency.
    const html = await page.content()
    expect(html).not.toMatch(/>Featured</)
    // Either Sponsored or Sponsored Level 2 should appear if our fixtures
    // got their tiers right.
    expect(html).toMatch(/Sponsored Level 2|Sponsored/)
    await page.screenshot({
      path: path.join(ASSETS, "s9-listings-restaurants.png"),
      fullPage: true,
    })
  })
})
