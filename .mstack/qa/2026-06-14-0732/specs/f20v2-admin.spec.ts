// F20 v2 admin queue — end-to-end coverage of the all-chip default, status
// filters, respondent expansion, edit, delete, and the admin-only
// interests endpoint.

import { test, expect, type Page } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ASSETS_DIR = path.resolve(__dirname, "../assets")
const STATE_DIR = path.resolve(__dirname, "../.auth")

const ADMIN_ID = "00000000-0000-4000-8000-0000000000c1"
const POSTS = {
  pending: "00000000-0000-4000-8000-0000000000d1",
  approved: "00000000-0000-4000-8000-0000000000d2",
  expired: "00000000-0000-4000-8000-0000000000d3",
  rejected: "00000000-0000-4000-8000-0000000000d4",
}

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

test.describe.serial("F20 v2 admin queue", () => {
  test("S1 — Default is All; 5 chips render with correct counts", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/community", { waitUntil: "networkidle" })
    const nav = page.getByRole("navigation", { name: /Filter by status/i })

    // Locate each chip by label-text containment, then assert it carries the
    // count digit. The chip's accessible name concatenates "<label> <count>"
    // but whitespace varies between renderers — pin the assertion to the
    // text instead of the role name.
    for (const [label, expected] of [
      ["All", "4"],
      ["Pending", "1"],
      ["Approved", "1"],
      ["Expired", "1"],
      ["Rejected", "1"],
    ] as const) {
      const chip = nav.locator("a", { hasText: new RegExp(`^${label}`) })
      await expect(chip).toBeVisible()
      await expect(chip).toContainText(expected)
    }

    const allChip = nav.locator("a", { hasText: /^All/ })
    await expect(allChip).toHaveAttribute("aria-current", "page")

    await expect(
      page.locator("ul > li").filter({ hasText: /\[F20v2-QA\]/ }),
    ).toHaveCount(4)
    await shot(page, "s1-default-all")
  })

  test("S2 — Pending chip shows Approve + Reject + Edit + Delete", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/community?status=pending", { waitUntil: "networkidle" })
    const cards = page.locator("ul > li").filter({ hasText: /\[F20v2-QA\]/ })
    await expect(cards).toHaveCount(1)
    const card = cards.first()
    await expect(card.getByRole("button", { name: /^Approve$/ })).toBeVisible()
    await expect(card.getByRole("button", { name: /^Reject$/ })).toBeVisible()
    await expect(card.getByRole("button", { name: /^Edit$/ })).toBeVisible()
    await expect(card.getByRole("button", { name: /^Delete$/ })).toBeVisible()
    await shot(page, "s2-pending-actions")
  })

  test("S3 — Approved chip hides Approve + Reject", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/community?status=approved", { waitUntil: "networkidle" })
    const cards = page.locator("ul > li").filter({ hasText: /\[F20v2-QA\]/ })
    await expect(cards).toHaveCount(1)
    const card = cards.first()
    await expect(card.getByRole("button", { name: /^Approve$/ })).toHaveCount(0)
    await expect(card.getByRole("button", { name: /^Reject$/ })).toHaveCount(0)
    await expect(card.getByRole("button", { name: /^Edit$/ })).toBeVisible()
    await expect(card.getByRole("button", { name: /^Delete$/ })).toBeVisible()
    await shot(page, "s3-approved-actions")
  })

  test("S4 — Rejected card surfaces rejected_reason", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/community?status=rejected", { waitUntil: "networkidle" })
    const card = page.locator("ul > li").filter({ hasText: /\[F20v2-QA\] rejected request/ })
    await expect(card).toBeVisible()
    await expect(card).toContainText(/Tone is too commercial/i)
    await shot(page, "s4-rejected-reason")
  })

  test("S5 — Respondent expander lazy-loads then caches", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    let interestGetCount = 0
    page.on("request", (r) => {
      if (
        r.method() === "GET" &&
        r.url().includes(`/api/v1/admin/community/posts/${POSTS.approved}/interests`)
      ) {
        interestGetCount += 1
      }
    })

    await page.goto("/admin/community?status=approved", { waitUntil: "networkidle" })
    // Wait for the approved-status header subtitle to confirm the page has
    // settled on the right filter before clicking the expander.
    await expect(page.getByText(/1 approved/)).toBeVisible({ timeout: 15_000 })
    const card = page.locator("ul > li").filter({ hasText: /\[F20v2-QA\] approved request/ })

    const toggle = card.getByRole("button", { name: /offered to help/i })
    await expect(toggle).toBeVisible({ timeout: 10_000 })
    // First expand → exactly 1 fetch.
    await toggle.click()
    await expect(card.getByText(/Helper Person/)).toBeVisible({ timeout: 5_000 })
    await expect(card.getByText(/Dr\. Mehta/)).toBeVisible()
    expect(interestGetCount).toBe(1)

    // Collapse + re-expand → still 1 fetch (cache hit).
    await toggle.click()
    await expect(card.getByText(/Helper Person/)).toHaveCount(0)
    await toggle.click()
    await expect(card.getByText(/Helper Person/)).toBeVisible()
    expect(interestGetCount).toBe(1)
    await shot(page, "s5-respondents-expanded")
  })

  test("S6 — Edit modal updates the card + writes audit row", async ({ browser }) => {
    const newTitle = `[F20v2-QA] pending request (edited ${Date.now()})`
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/community?status=pending", { waitUntil: "networkidle" })
    const card = page.locator("ul > li").filter({ hasText: /\[F20v2-QA\] pending request/ })
    await card.getByRole("button", { name: /^Edit$/ }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: /Edit request/i })).toBeVisible()
    const titleInput = dialog.getByLabel("Title")
    await expect(titleInput).toHaveValue("[F20v2-QA] pending request")
    await titleInput.fill(newTitle)
    await dialog.getByRole("button", { name: /Save changes/i }).click()

    // Card text updates in place once the save round-trip completes.
    // (We check the card visibility rather than dialog count — base-ui's
    // portal can leave a hidden artefact behind that role-matches "dialog"
    // but isn't actually shown.)
    await expect(
      page.locator("ul > li").filter({ hasText: newTitle }),
    ).toBeVisible({ timeout: 10_000 })

    // Audit row landed with the right shape.
    const auditAction = psql(
      `SELECT action FROM audit_log
       WHERE actor_id = '${ADMIN_ID}' AND target_id = '${POSTS.pending}'
       ORDER BY at DESC LIMIT 1`,
    )
    expect(auditAction).toBe("community.post_edited")
    const meta = JSON.parse(
      psql(
        `SELECT metadata::text FROM audit_log
         WHERE actor_id = '${ADMIN_ID}' AND target_id = '${POSTS.pending}'
         ORDER BY at DESC LIMIT 1`,
      ),
    ) as {
      kind: string
      fields: string[]
      title?: { from: string; to: string }
    }
    expect(meta.kind).toBe("community.post_edited")
    expect(meta.fields).toEqual(["title"])
    expect(meta.title?.from).toBe("[F20v2-QA] pending request")
    expect(meta.title?.to).toBe(newTitle)
    await shot(page, "s6-after-edit")
  })

  test("S7 — No-op edit (same title via API) writes NO audit row", async ({ browser }) => {
    // Snapshot the count; do a same-title PATCH from the authed context;
    // confirm count unchanged.
    const before = psql(
      `SELECT count(*) FROM audit_log
       WHERE actor_id = '${ADMIN_ID}' AND target_id = '${POSTS.expired}'`,
    )

    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin", { waitUntil: "networkidle" })
    // Fetch the current title via the admin list to send back unchanged.
    const result = await page.evaluate(
      async ([postId, title]) => {
        const r = await fetch(
          `/api/v1/admin/community/posts/${encodeURIComponent(postId)}/edit`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: postId, title }),
          },
        )
        return { status: r.status, body: await r.text() }
      },
      [POSTS.expired, "[F20v2-QA] expired request"],
    )
    expect(result.status).toBe(200)

    const after = psql(
      `SELECT count(*) FROM audit_log
       WHERE actor_id = '${ADMIN_ID}' AND target_id = '${POSTS.expired}'`,
    )
    expect(after).toBe(before)
  })

  test("S8 — Delete confirm cascades + writes snapshot audit", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/community?status=approved", { waitUntil: "networkidle" })
    const card = page.locator("ul > li").filter({ hasText: /\[F20v2-QA\] approved request/ })
    await card.getByRole("button", { name: /^Delete$/ }).click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog.getByRole("heading", { name: /Delete request/i })).toBeVisible()
    await expect(dialog).toContainText(/2\s*neighbours?\s*offered to help/i)
    await dialog.getByRole("button", { name: /^Delete$/ }).click()
    // Card removal is the canonical signal — dialog portal artifacts on
    // base-ui can persist in the DOM even after the close.
    await expect(card).toHaveCount(0, { timeout: 10_000 })

    // Post + interests gone via cascade.
    expect(psql(`SELECT count(*) FROM community_post WHERE id = '${POSTS.approved}'`)).toBe("0")
    expect(psql(`SELECT count(*) FROM post_interest WHERE post_id = '${POSTS.approved}'`)).toBe("0")

    // Audit row carries the snapshot.
    const auditMeta = JSON.parse(
      psql(
        `SELECT metadata::text FROM audit_log
         WHERE actor_id = '${ADMIN_ID}' AND target_id = '${POSTS.approved}'
         ORDER BY at DESC LIMIT 1`,
      ),
    ) as {
      kind: string
      title: string
      status: string
      interest_count: number
      author_id: string
    }
    expect(auditMeta.kind).toBe("community.post_deleted")
    expect(auditMeta.title).toBe("[F20v2-QA] approved request")
    expect(auditMeta.status).toBe("approved")
    expect(auditMeta.interest_count).toBe(2)
    await shot(page, "s8-after-delete")
  })

  test("S9 — Edit PATCH with id only returns 400 Nothing to update", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin", { waitUntil: "networkidle" })
    const result = await page.evaluate(async (postId) => {
      const r = await fetch(
        `/api/v1/admin/community/posts/${encodeURIComponent(postId)}/edit`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: postId }),
        },
      )
      return { status: r.status, body: await r.text() }
    }, POSTS.expired)
    expect(result.status).toBe(400)
    expect(result.body).toContain("validation.input")
    expect(result.body).toContain("Nothing to update")
  })

  test("S10 — adminListInterests works for non-author admin", async ({ browser }) => {
    // Admin's user_id !== the post's user_id, so the public listInterests
    // would 403. The admin endpoint must return the rows.
    // Approved post was deleted in S8; use a fresh approved post.
    psql(`
      INSERT INTO community_post (id, user_id, title, body, status, expires_at, interest_count, approved_at, created_at)
      VALUES ('${POSTS.approved}', '00000000-0000-4000-8000-0000000000c3', '[F20v2-QA] approved (s10)', NULL, 'approved', now() + interval '30 days', 0, now(), now())
      ON CONFLICT (id) DO NOTHING
    `)

    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin", { waitUntil: "networkidle" })
    const result = await page.evaluate(async (postId) => {
      const r = await fetch(
        `/api/v1/admin/community/posts/${encodeURIComponent(postId)}/interests`,
        { credentials: "include" },
      )
      const body = (await r.json()) as { items?: unknown[] }
      return { status: r.status, items: body.items }
    }, POSTS.approved)

    expect(result.status).toBe(200)
    expect(Array.isArray(result.items)).toBe(true)
  })
})
