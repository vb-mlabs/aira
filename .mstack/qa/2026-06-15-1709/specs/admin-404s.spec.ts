// Plain admin trying to reach super_admin surfaces (or any role trying old
// pre-move routes) should get the Next.js 404 page.

import { test, expect } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")
const AUTH = path.join(__dirname, "..", ".auth")

test.describe("S6 — plain admin URL-typing super_admin routes → 404", () => {
  test.use({ storageState: path.join(AUTH, "admin.json") })

  for (const route of [
    "/admin/settings",
    "/admin/settings/categories",
    "/admin/audit",
    "/admin/cron",
  ]) {
    test(`${route} → 404`, async ({ page }) => {
      const res = await page.goto(route, { waitUntil: "networkidle" })
      expect(res?.status()).toBe(404)
      // Next.js default 404 page renders "404" + "This page could not be found"
      // — but the project may override it; just check the status code.
    })
  }

  test("plain admin direct API POST → 403", async ({ request }) => {
    const res = await request.post("/api/v1/admin/categories", {
      data: { city_id: "city-atlanta", name: "QA Forbidden" },
    })
    expect(res.status()).toBe(403)
    const body = (await res.json()) as { error?: { code?: string } }
    expect(body.error?.code).toBe("auth.forbidden")
  })

  test("plain admin GET /api/v1/admin/audit → 403", async ({ request }) => {
    const res = await request.get("/api/v1/admin/audit")
    expect(res.status()).toBe(403)
  })
})

test.describe("S7 — old pre-move routes → 404 (super_admin)", () => {
  test.use({ storageState: path.join(AUTH, "super_admin.json") })

  for (const route of [
    "/admin/categories",
    "/admin/cities",
    "/admin/membership-plans",
    "/admin/sponsorship-tiers",
  ]) {
    test(`${route} → 404`, async ({ page }) => {
      const res = await page.goto(route, { waitUntil: "networkidle" })
      expect(res?.status()).toBe(404)
    })
  }
})

test.describe("S8 — super_admin can still reach the new paths", () => {
  test.use({ storageState: path.join(AUTH, "super_admin.json") })

  for (const route of [
    "/admin/settings/categories",
    "/admin/settings/cities",
    "/admin/settings/membership-plans",
    "/admin/settings/sponsorship-tiers",
    "/admin/settings/app",
    "/admin/audit",
    "/admin/cron",
  ]) {
    test(`${route} → 200`, async ({ page }) => {
      const res = await page.goto(route, { waitUntil: "networkidle" })
      expect(res?.status()).toBe(200)
    })
  }
})

test.describe("S9 — assets: plain-admin 404 + super_admin Setup screenshot", () => {
  test("plain admin 404 page screenshot", async ({ page, browser }) => {
    const ctx = await browser.newContext({
      storageState: path.join(AUTH, "admin.json"),
    })
    const p = await ctx.newPage()
    await p.goto("/admin/settings", { waitUntil: "networkidle" })
    await p.screenshot({
      path: path.join(ASSETS, "s9a-plain-admin-settings-404.png"),
      fullPage: true,
    })
    await ctx.close()
  })

  test("super_admin Setup hub screenshot", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: path.join(AUTH, "super_admin.json"),
    })
    const p = await ctx.newPage()
    await p.goto("/admin/settings/categories", { waitUntil: "networkidle" })
    await p.screenshot({
      path: path.join(ASSETS, "s9b-super-admin-categories-tab.png"),
      fullPage: true,
    })
    await ctx.close()
  })
})
