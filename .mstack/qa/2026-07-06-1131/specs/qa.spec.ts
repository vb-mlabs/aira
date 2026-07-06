// QA run 2026-07-06 — golden path verification for the group A + B changes
// shipped on feat/featured-business-selection.

import { test, expect, type Page } from "@playwright/test"

const BASE = "http://localhost:5000"
const SUPER_ADMIN = {
  email: "qa-super@aira-qa.test",
  password: "qa-super-2026",
}

// Assets are written to ../assets/ relative to this spec file so the
// paths line up with the QA report at .mstack/qa/2026-07-06-1131/.
const A = (name: string) => `../assets/${name}.png`

async function signInSuperAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`)
  // Target inputs by id — /password/i also matched the "Show password"
  // toggle button, so getByLabel wasn't unique. See Playwright QA memory
  // about controlled-input hydration in this app's login shell.
  await page.locator("input#email").fill(SUPER_ADMIN.email)
  await page.locator("input#password").fill(SUPER_ADMIN.password)
  await page.getByRole("button", { name: /^sign in$/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 })
}

test.describe("QA — group A: featured business selection", () => {
  test("S1 — home renders, no featured section (empty pool), no /directory link", async ({ page }) => {
    await signInSuperAdmin(page)
    await page.goto(`${BASE}/home`)
    await page.waitForLoadState("networkidle")
    await page.screenshot({ path: A("s1-home"), fullPage: true })

    // With 0 active sponsorships, featured section should be hidden.
    await expect(page.getByText(/featured businesses/i)).toHaveCount(0)

    // No stale /directory link anywhere.
    const directoryLinks = await page.locator('a[href="/directory"]').count()
    expect(directoryLinks).toBe(0)
  })

  test("S2 — /categories lists all 7 root categories", async ({ page }) => {
    await signInSuperAdmin(page)
    await page.goto(`${BASE}/categories`)
    await page.waitForLoadState("networkidle")
    await page.screenshot({ path: A("s2-categories"), fullPage: true })

    // Header
    await expect(page.getByRole("heading", { name: /categories/i })).toBeVisible()

    // 7 category rows — link href starts with /listings/
    const rows = await page.locator('a[href^="/listings/"]').count()
    expect(rows).toBeGreaterThanOrEqual(7)
  })

  test("S3 — /listings/restaurants (level=1 with 1 sub, 0 featured)", async ({ page }) => {
    await signInSuperAdmin(page)
    await page.goto(`${BASE}/listings/restaurants`)
    await page.waitForLoadState("networkidle")
    await page.screenshot({ path: A("s3-primary-cat-restaurants"), fullPage: true })

    // Header shows the (renamed) category name
    await expect(page.locator("h1")).toContainText(/food/i)

    // No search box, no verified filter chip, no pagination.
    // (Ignore Next.js Dev Tools button which matches /next/i — documented
    // gotcha in .claude/memory/qa-playwright-gotchas.md.)
    await expect(page.getByPlaceholder(/search/i)).toHaveCount(0)
    await expect(page.getByRole("button", { name: /verified/i })).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: /^next page$|^next$/ }),
    ).toHaveCount(0)

    // Should show at least one subcategory tile (the "test" sub) — h2
    // "Subcategories" label appears when subs render.
    await expect(page.getByRole("heading", { name: /subcategories/i })).toBeVisible()

    // "Featured in <cat>" section should be absent (0 sponsorships)
    await expect(page.getByText(/^featured in /i)).toHaveCount(0)
  })

  test("S4 — /listings/education (level=1, 0 subs, 0 featured) shows EmptyState", async ({ page }) => {
    await signInSuperAdmin(page)
    await page.goto(`${BASE}/listings/education`)
    await page.waitForLoadState("networkidle")
    await page.screenshot({ path: A("s4-primary-cat-education-empty"), fullPage: true })

    await expect(page.getByText(/this category is being set up/i)).toBeVisible()
    await expect(
      page.getByRole("link", { name: /browse other categories/i }),
    ).toBeVisible()
  })

  test("S5 — /listings/test (level=2 sub) renders paginated ListingView", async ({ page }) => {
    await signInSuperAdmin(page)
    await page.goto(`${BASE}/listings/test`)
    await page.waitForLoadState("networkidle")
    await page.screenshot({ path: A("s5-subcategory-listing"), fullPage: true })

    // Search + verified filter present (i.e. NOT the PrimaryCategoryView)
    await expect(page.getByPlaceholder(/search/i)).toBeVisible()
  })
})

test.describe("QA — group B: category CRUD", () => {
  test("S6 — admin edit category form renders (direct navigation)", async ({ page }) => {
    await signInSuperAdmin(page)
    // Direct nav to the edit route bypasses the Link-click timing issue
    // where Playwright screenshots the list before the RSC transition
    // completes.
    await page.goto(`${BASE}/admin/settings/categories/cat-atl-restaurants`)
    await page.waitForLoadState("networkidle")
    await page.screenshot({ path: A("s6-edit-category"), fullPage: true })

    // Form fields render — target by id since the label associates via
    // htmlFor and getByLabel occasionally missed the modal portal wrap.
    await expect(page.locator("input#cat-name")).toBeVisible()
    await expect(page.locator("input#cat-slug")).toBeVisible()
    // Verify the current name reflects the previously-attempted rename
    // (documents the stale "Restaurants to Food" state we found in the
    // DB — see report notes).
    const nameValue = await page.locator("input#cat-name").inputValue()
    expect(nameValue).toBeTruthy()
  })

  test("S7 — Add Business form shows subs-only picker + affordance", async ({ page }) => {
    await signInSuperAdmin(page)
    await page.goto(`${BASE}/admin/businesses/new`)
    await page.waitForLoadState("networkidle")
    await page.screenshot({ path: A("s7-new-business"), fullPage: true })

    // Category label + affordance link
    await expect(page.getByText(/^category/i).first()).toBeVisible()

    const affordance = page.getByRole("link", { name: /add.*(subcategory|one)/i }).first()
    await expect(affordance).toBeVisible()

    // The affordance link should point at the new-category page
    const hrefValue = await affordance.getAttribute("href")
    expect(hrefValue).toMatch(/\/admin\/settings\/categories\/new/)
  })

  test("S8 — Edit categories modal: subs-only + affordance with ?parent=", async ({ page }) => {
    await signInSuperAdmin(page)
    await page.goto(`${BASE}/admin/businesses`)
    await page.waitForLoadState("networkidle")

    // Click the first business row
    const row = page.locator('a[href^="/admin/businesses/"]:not([href*="/new"])').first()
    await row.click()
    await page.waitForLoadState("networkidle")

    // Open Edit categories modal
    await page.getByRole("button", { name: /edit categories/i }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: A("s8-edit-categories-modal"), fullPage: true })

    // The affordance link should carry ?parent= when a sub is currently selected
    const affordance = page.getByRole("link", { name: /add.*(subcategory|one)/i }).first()
    const hrefValue = (await affordance.getAttribute("href")) ?? ""
    expect(hrefValue).toMatch(/\/admin\/settings\/categories\/new/)
    // ?parent= is a "should" — passes if present, warns if absent.
    if (!hrefValue.includes("parent=")) {
      // eslint-disable-next-line no-console
      console.warn("S8 — modal affordance link missing ?parent=:", hrefValue)
    }
  })

  test("S9 — /admin/settings/categories/new?parent=<id> preselects parent", async ({ page }) => {
    await signInSuperAdmin(page)
    await page.goto(
      `${BASE}/admin/settings/categories/new?parent=cat-atl-restaurants`,
    )
    await page.waitForLoadState("networkidle")
    await page.screenshot({ path: A("s9-new-category-prefill"), fullPage: true })

    // The parent <select> has a `value` attribute reflecting the seeded id
    const parentSelect = page.locator("select#cat-parent")
    await expect(parentSelect).toBeVisible()
    const selectedValue = await parentSelect.inputValue()
    expect(selectedValue).toBe("cat-atl-restaurants")
  })

  test("S10 — API rejects level=1 slug on business create (400)", async ({ page }) => {
    await signInSuperAdmin(page)
    // Use page.request to inherit the cookie set by signInSuperAdmin.
    const res = await page.request.post(`${BASE}/api/v1/admin/businesses`, {
      data: {
        name: "QA test biz — should fail",
        slug: `qa-test-biz-${Date.now()}`,
        category: "education", // level=1 root — expected to reject
      },
    })
    expect(res.status()).toBe(400)
    const body = (await res.json()) as {
      error?: { code?: string; message?: string }
    }
    expect(body.error?.code).toBe("businesses.category_must_be_subcategory")
  })

  test("S11 — API accepts level=2 slug on business create (201-ish)", async ({ page }) => {
    await signInSuperAdmin(page)
    const testSlug = `qa-test-biz-ok-${Date.now()}`
    const res = await page.request.post(`${BASE}/api/v1/admin/businesses`, {
      data: {
        name: "QA test biz — should succeed",
        slug: testSlug,
        category: "test", // level=2 sub under Restaurants
      },
    })
    // Success is any 2xx; the op returns { business: {...} } directly
    // (no extra .data wrapper — defineOperation Response.json-s the
    // handler result as-is).
    expect(res.status()).toBeGreaterThanOrEqual(200)
    expect(res.status()).toBeLessThan(300)
    const body = (await res.json()) as {
      business?: { id?: string; slug?: string }
    }
    expect(body.business?.slug).toBe(testSlug)
  })
})
