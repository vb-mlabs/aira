import { test, expect } from "@playwright/test"

// QA: admin idle-timeout flow — visual + HTTP-behavior checks.
// Focus per .mstack/qa/2026-05-26-1020/report.md: verify the IdleBanner
// renders on /login?reason=idle, /admin/users redirects unauthenticated,
// and the auth surface didn't regress after the role enum migration.
//
// Full E2E of "sign in as admin → idle 31min → bounce → IdleBanner" needs
// either INITIAL_ADMIN_EMAIL set on the dev server OR direct DB writes;
// out of scope for this Playwright pass — covered by the supplementary
// HTTP/DB checks in the QA report's "Live HTTP probes" section.

const ASSETS = ".mstack/qa/2026-05-26-1020/assets"
const shot = (name: string) => `${ASSETS}/${name}`

// Replit's preview proxy doesn't forward Next.js's _next/webpack-hmr
// WebSocket, so dev-mode HMR fails with a 502 console error. Harmless;
// filter it out so the assertion stays meaningful for real regressions.
const isHmrNoise = (msg: string) =>
  msg.includes("_next/webpack-hmr") || msg.includes("WebSocket connection to")

test("marketing landing page renders without console errors", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`))
  page.on("console", (msg) => {
    if (msg.type() !== "error") return
    const text = msg.text()
    if (isHmrNoise(text)) return
    errors.push(`console: ${text}`)
  })
  await page.goto("/")
  await expect(page).toHaveTitle(/AIRA/)
  await page.screenshot({ path: shot("01-marketing.png"), fullPage: true })
  expect(errors).toEqual([])
})

test("/login renders without idle banner when ?reason is absent", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
  // IdleBanner should NOT be present
  await expect(
    page.getByText(/Signed out for inactivity/),
  ).toHaveCount(0)
  await page.screenshot({ path: shot("02-login-clean.png"), fullPage: true })
})

test("/login?reason=idle renders the IdleBanner", async ({ page }) => {
  await page.goto("/login?reason=idle")
  const banner = page.getByRole("status").filter({ hasText: /Signed out for inactivity/ })
  await expect(banner).toBeVisible()
  await expect(banner).toContainText(
    "You were signed out after 30 minutes of inactivity",
  )
  // ARIA live region for screen readers
  await expect(banner).toHaveAttribute("aria-live", "polite")
  await page.screenshot({ path: shot("03-login-idle-banner.png"), fullPage: true })
})

test("/admin/users redirects unauthenticated to /login", async ({ page }) => {
  // Disable auto-follow so we can assert the 307 + Location header. Playwright
  // follows redirects by default; using context.request gives raw control.
  const ctx = page.context()
  const res = await ctx.request.get("/admin/users", {
    maxRedirects: 0,
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(307)
  expect(res.headers()["location"]).toBe("/login")
})

test("/signup form renders with required fields", async ({ page }) => {
  await page.goto("/signup")
  await expect(
    page.getByRole("heading", { name: /create|sign up|create one|create your/i }),
  ).toBeVisible({ timeout: 5000 })
  // The form should have email + password inputs at minimum.
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await page.screenshot({ path: shot("04-signup.png"), fullPage: true })
})
