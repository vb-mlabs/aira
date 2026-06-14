// F20 Community Requests Board — end-to-end QA spec.
//
// Drives three personas (admin / poster / helper) through the full
// submit → moderate → offer help → notification → respondent flow.
// Each top-level test() captures a screenshot used in the QA report.

import { test, expect, type Page } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

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
  // Capture any console errors so the report can surface them.
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`))
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`)
  })
  return { ctx, page, errors }
}

const POST_TITLE = `[F20-QA] Pediatrician near Alpharetta (${Date.now()})`
const POST_BODY = "Aetna PPO, weekend hours, within 20 minutes of Alpharetta."

test.describe.serial("F20 Community Requests Board — end-to-end", () => {
  let postId = ""

  test("S1 — Community entry in (app) sidebar (poster persona)", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "poster")
    await page.goto("/home", { waitUntil: "networkidle" })
    // Sidebar is desktop-only at this viewport, scoped to <aside>.
    const sidebar = page.locator("aside").first()
    await expect(sidebar.getByRole("link", { name: /community/i })).toBeVisible()
    await shot(page, "s1-app-sidebar-community-entry")
  })

  test("S2 — Empty community board renders editorial hero", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "poster")
    await page.goto("/community", { waitUntil: "networkidle" })
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Real people\. Real asks\./i)
    await expect(page.getByRole("button", { name: /Ask the community/i })).toBeVisible()
    await shot(page, "s2-empty-board")
  })

  test("S3 — Poster submits a request via the dialog", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "poster")
    await page.goto("/community", { waitUntil: "networkidle" })
    await page.getByRole("button", { name: /Ask the community/i }).click()
    await expect(page.getByRole("heading", { name: /Ask the community/i })).toBeVisible()
    await page.getByLabel(/What do you need/i).fill(POST_TITLE)
    await page.getByLabel(/extra context/i).fill(POST_BODY)
    await shot(page, "s3a-form-filled")
    await page.getByRole("button", { name: /Post request/i }).click()
    // Dialog closes on success; the row is PENDING so it doesn't appear
    // on the public board — re-loading should still show the empty
    // state for the poster.
    await page.waitForLoadState("networkidle")
    await shot(page, "s3b-after-submit")
  })

  test("S4 — Second submit blocked by the 1-active-post limit", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "poster")
    await page.goto("/community", { waitUntil: "networkidle" })
    await page.getByRole("button", { name: /Ask the community/i }).click()
    await page.getByLabel(/What do you need/i).fill("Another request — should be blocked")
    await page.getByRole("button", { name: /Post request/i }).click()
    // Server returns 409; UI shows inline error inside the dialog.
    const dialog = page.getByRole("dialog")
    await expect(dialog.locator('[role="alert"]')).toContainText(/already have/i, {
      timeout: 5_000,
    })
    await shot(page, "s4-active-post-limit-blocked")
  })

  test("S5 — Admin sees PENDING + approves", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/community", { waitUntil: "networkidle" })
    await expect(page.getByRole("heading", { name: "Community" })).toBeVisible()
    const row = page.locator("li", { hasText: POST_TITLE })
    await expect(row).toBeVisible({ timeout: 10_000 })
    await shot(page, "s5a-admin-pending-queue")
    await row.getByRole("button", { name: /Approve/i }).click()
    // After approval the row is removed optimistically; we should also
    // confirm via reload that admin no longer sees it in PENDING.
    await page.waitForTimeout(800)
    await shot(page, "s5b-after-approve")
  })

  test("S6 — Approved post appears on the board", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "helper")
    await page.goto("/community", { waitUntil: "networkidle" })
    const card = page.locator("article", { hasText: POST_TITLE })
    await expect(card).toBeVisible({ timeout: 5_000 })
    // Capture the post id from the title link so the next steps can
    // navigate directly. The link is /community/[id].
    const href = await card.locator(`a[href^="/community/"]`).first().getAttribute("href")
    postId = href?.split("/").pop() ?? ""
    await expect(card.getByText(/Open/i)).toBeVisible()
    await expect(card.getByRole("button", { name: /I can help/i })).toBeVisible()
    await shot(page, "s6-board-after-approval")
  })

  test("S7 — Helper offers help (interest_count 0 → 1)", async ({ browser }) => {
    if (!postId) test.fail(true, "postId not captured by S6")
    const { page } = await newAuthedPage(browser, "helper")
    await page.goto(`/community/${postId}`, { waitUntil: "networkidle" })
    // Optional message field doesn't exist on the button itself yet
    // (the button POSTs with no body). Tap it.
    const helpBtn = page.getByRole("button", { name: /I can help/i })
    await expect(helpBtn).toBeVisible()
    await helpBtn.click()
    await expect(page.getByRole("button", { name: /Offered to help/i })).toBeVisible({
      timeout: 5_000,
    })
    await expect(page.getByText(/1 neighbour has offered to help/i)).toBeVisible()
    await shot(page, "s7-helper-after-tap")
  })

  test("S8 — post_interest notification reaches the poster bell", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "poster")
    await page.goto("/notifications", { waitUntil: "networkidle" })
    await expect(
      page.getByText(/can help with your request/i),
    ).toBeVisible({ timeout: 5_000 })
    await shot(page, "s8-poster-notifications")
  })

  test("S9 — Author sees respondent list on detail page", async ({ browser }) => {
    if (!postId) test.fail(true, "postId not captured by S6")
    const { page } = await newAuthedPage(browser, "poster")
    await page.goto(`/community/${postId}`, { waitUntil: "networkidle" })
    await expect(page.getByRole("heading", { name: /Neighbours offering to help/i })).toBeVisible()
    await expect(page.getByText("Asha Iyer").first()).toBeVisible()
    await shot(page, "s9-author-respondents")
  })

  test("S10 — Self-interest button suppressed for the author", async ({ browser }) => {
    if (!postId) test.fail(true, "postId not captured by S6")
    const { page } = await newAuthedPage(browser, "poster")
    await page.goto(`/community/${postId}`, { waitUntil: "networkidle" })
    // The post card uses isAuthor to render a count summary instead of
    // the InterestButton — verify the button is absent.
    const cards = page.locator("article")
    await expect(cards.first().getByRole("button", { name: /I can help/i })).toHaveCount(0)
    await shot(page, "s10-author-no-help-button")
  })

  test("S11 — expire-posts cron registered on /admin/cron", async ({ browser }) => {
    const { page } = await newAuthedPage(browser, "admin")
    await page.goto("/admin/cron", { waitUntil: "networkidle" })
    await expect(page.getByText(/expire-posts/i).first()).toBeVisible()
    await shot(page, "s11-admin-cron-expire-posts")
  })
})
