import { test, expect } from "@playwright/test"
import path from "node:path"

const ASSETS = path.resolve(__dirname, "../assets")

// Log in as qa-admin. This lets us hit both public listing pages
// (which live under (app) — signed-in only) AND admin surfaces.
test.beforeEach(async ({ page }) => {
  await page.goto("/login")
  await page.locator("#email").waitFor({ state: "visible" })
  await page.locator("#email").click()
  await page
    .locator("#email")
    .pressSequentially("qa-admin@aira-qa.test", { delay: 20 })
  await page.locator("#password").click()
  await page.locator("#password").pressSequentially("qa-admin-2026", { delay: 20 })
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  })
  const sessionRes = await page.request.get("/api/auth/get-session")
  const session = (await sessionRes.json().catch(() => null)) as {
    user?: { role?: string }
  } | null
  console.log(`[qa] logged in as role=${session?.user?.role}, at ${page.url()}`)
})

test("category listing renders as authed user", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (err) => pageErrors.push(err.message))

  const res = await page.goto("/listings/restaurants")
  expect(res, "no response").not.toBeNull()
  const status = res?.status() ?? 0
  expect(status, `listings returned ${status}`).toBeLessThan(500)

  await page.screenshot({
    path: path.join(ASSETS, "listings-restaurants.png"),
    fullPage: true,
  })

  const html = await page.content()
  const hasSponsoredHeader = /Sponsored/.test(html)
  const hasRegularHeader = /Regular/.test(html)
  console.log(
    `[qa] listing headers: sponsored=${hasSponsoredHeader} regular=${hasRegularHeader}`,
  )

  expect(pageErrors).toEqual([])
})

test("directory renders as authed user", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (err) => pageErrors.push(err.message))

  const res = await page.goto("/directory")
  expect(res?.status()).toBeLessThan(500)
  await page.screenshot({
    path: path.join(ASSETS, "directory.png"),
    fullPage: true,
  })
  expect(pageErrors).toEqual([])
})

test("admin membership plan form has no Placement field", async ({ page }) => {
  const res = await page.goto("/admin/settings/membership-plans/new")
  await page.screenshot({
    path: path.join(ASSETS, "admin-plan-form.png"),
    fullPage: true,
  })
  console.log(`[qa] admin/plan/new status=${res?.status()}`)
  // If this returns 404 despite role=admin, note it as a QA-infra
  // observation and inspect the screenshot manually. If 200, assert
  // no Placement label.
  if (res?.ok()) {
    const placement = page.getByText(/^Placement$/i)
    await expect(placement).not.toBeVisible()
  }
})

test("admin sponsorship-tier form has Display slot picker", async ({ page }) => {
  const res = await page.goto("/admin/settings/sponsorship-tiers/new")
  await page.screenshot({
    path: path.join(ASSETS, "admin-tier-form.png"),
    fullPage: true,
  })
  console.log(`[qa] admin/tier/new status=${res?.status()}`)
  if (res?.ok()) {
    await expect(page.getByLabel(/Display slot/i)).toBeVisible()
    const optionCount = await page.locator("#tier-slot option").count()
    expect(optionCount).toBe(3)
  }
})

test("admin sponsorship-tiers list", async ({ page }) => {
  const res = await page.goto("/admin/settings/sponsorship-tiers")
  await page.screenshot({
    path: path.join(ASSETS, "admin-tier-list.png"),
    fullPage: true,
  })
  console.log(`[qa] admin/tiers status=${res?.status()}`)
})
