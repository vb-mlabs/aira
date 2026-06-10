// QA spec — Business soft-delete + restore (F13 partial).
//
// Covers commits 92db3a6..eeca5f2:
// - Admin opens edit page → clicks Archive → confirms dialog → row goes
//   away from public surfaces (home featured, category listing, detail
//   deep-link)
// - Admin list reflects status with the chip; "Show archived" toggle
//   filters
// - Restore reverses everything
// - Cancel on the dialog leaves state untouched
// - Regression: /admin/businesses now shows ALL active businesses (not
//   just featured tier1+tier2) — fixes the long-standing no-filter bug

import { test, expect, type Page } from "@playwright/test"
import path from "path"

const E2E_USER_ID = "00000000-0000-4000-8000-000000000001"
const TARGET_ID = "biz-001" // Spice Garden — tier1, verified
const TARGET_NAME = "Spice Garden"
const ASSETS_DIR = path.resolve(__dirname, "../assets")

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(ASSETS_DIR, `${name}.png`),
    fullPage: true,
  })
}

async function withPool<T>(
  fn: (
    pool: import("@neondatabase/serverless").Pool,
  ) => Promise<T>,
): Promise<T> {
  const { Pool, neonConfig } = await import("@neondatabase/serverless")
  const wsMod = await import("ws")
  neonConfig.webSocketConstructor =
    (wsMod as { default?: unknown }).default ?? wsMod
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL not set")
  const pool = new Pool({ connectionString: databaseUrl })
  try {
    return await fn(pool)
  } finally {
    await pool.end()
  }
}

test.describe("Business soft-delete (F13)", () => {
  test.beforeAll(async () => {
    await withPool(async (pool) => {
      await pool.query(`UPDATE "user" SET role = 'admin' WHERE id = $1`, [
        E2E_USER_ID,
      ])
      // Restore to clean state regardless of prior run.
      await pool.query(
        `UPDATE businesses SET deleted_at = NULL WHERE id = $1`,
        [TARGET_ID],
      )
    })
  })

  test.afterAll(async () => {
    await withPool(async (pool) => {
      await pool.query(`UPDATE "user" SET role = 'end_user' WHERE id = $1`, [
        E2E_USER_ID,
      ])
      await pool.query(
        `UPDATE businesses SET deleted_at = NULL WHERE id = $1`,
        [TARGET_ID],
      )
    })
  })

  test("S1: admin edit page shows Archive button + active chip absent", async ({
    page,
  }) => {
    await page.goto(`/admin/businesses/${TARGET_ID}`)
    await expect(page.getByRole("button", { name: "Archive" })).toBeVisible()
    await expect(page.getByText("Archived", { exact: true })).toHaveCount(0)
    await shot(page, "s1-admin-active")
  })

  test("S2: archive flow — open dialog, confirm, button flips to Restore", async ({
    page,
  }) => {
    await page.goto(`/admin/businesses/${TARGET_ID}`)
    await page.getByRole("button", { name: "Archive" }).click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByText(`Archive ${TARGET_NAME}?`),
    ).toBeVisible()
    await shot(page, "s2-archive-dialog-open")

    await dialog.getByRole("button", { name: "Archive", exact: true }).click()

    await expect(page.getByRole("button", { name: "Restore" })).toBeVisible()
    await expect(page.getByText("Archived", { exact: true })).toBeVisible()
    await shot(page, "s2-archive-confirmed")
  })

  test("S3: archived row absent from category listing", async ({ page }) => {
    await withPool(async (pool) => {
      await pool.query(
        `UPDATE businesses SET deleted_at = NOW() WHERE id = $1`,
        [TARGET_ID],
      )
    })
    await page.goto("/listings/restaurants")
    await expect(page.getByText(TARGET_NAME)).toHaveCount(0)
    await shot(page, "s3-public-category")
  })

  test("S4: archived row absent from /home featured strip", async ({ page }) => {
    await withPool(async (pool) => {
      await pool.query(
        `UPDATE businesses SET deleted_at = NOW() WHERE id = $1`,
        [TARGET_ID],
      )
    })
    await page.goto("/home")
    await expect(page.getByText(TARGET_NAME)).toHaveCount(0)
    await shot(page, "s4-public-home")
  })

  test("S5: public deep-link to archived row → 404", async ({ page }) => {
    await withPool(async (pool) => {
      await pool.query(
        `UPDATE businesses SET deleted_at = NOW() WHERE id = $1`,
        [TARGET_ID],
      )
    })
    const res = await page.goto(`/listings/restaurants/${TARGET_ID}`)
    expect(res?.status()).toBe(404)
    await shot(page, "s5-public-deep-link")
  })

  test("S6: admin list — 'Active only' (default) hides archived; Show archived reveals", async ({
    page,
  }) => {
    await withPool(async (pool) => {
      await pool.query(
        `UPDATE businesses SET deleted_at = NOW() WHERE id = $1`,
        [TARGET_ID],
      )
    })
    await page.goto("/admin/businesses")
    // biz-001 is archived → should NOT appear in the default Active view
    await expect(
      page.getByRole("link", { name: TARGET_NAME, exact: true }),
    ).toHaveCount(0)
    await shot(page, "s6a-admin-active-only")

    await page.getByRole("link", { name: "Show archived" }).click()
    await expect(page).toHaveURL(/[?&]archived=1/)
    // Now biz-001 should appear with the Archived chip
    await expect(
      page.getByRole("link", { name: TARGET_NAME, exact: true }),
    ).toBeVisible()
    await expect(page.getByText("Archived", { exact: true })).toBeVisible()
    await shot(page, "s6b-admin-show-archived")
  })

  test("S7: restore flow — dialog, confirm, button flips to Archive", async ({
    page,
  }) => {
    await withPool(async (pool) => {
      await pool.query(
        `UPDATE businesses SET deleted_at = NOW() WHERE id = $1`,
        [TARGET_ID],
      )
    })
    await page.goto(`/admin/businesses/${TARGET_ID}`)
    await expect(page.getByRole("button", { name: "Restore" })).toBeVisible()
    await page.getByRole("button", { name: "Restore" }).click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByText(`Restore ${TARGET_NAME}?`),
    ).toBeVisible()

    await dialog.getByRole("button", { name: "Restore", exact: true }).click()

    await expect(page.getByRole("button", { name: "Archive" })).toBeVisible()
    await expect(page.getByText("Archived", { exact: true })).toHaveCount(0)
    await shot(page, "s7-restore-confirmed")
  })

  test("S8: Cancel on the dialog leaves state untouched", async ({ page }) => {
    await page.goto(`/admin/businesses/${TARGET_ID}`)
    // biz-001 should be active here (S7 restored it)
    await page.getByRole("button", { name: "Archive" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click()
    // Button still says Archive — no state change.
    await expect(page.getByRole("button", { name: "Archive" })).toBeVisible()
    await expect(page.getByText("Archived", { exact: true })).toHaveCount(0)
    await shot(page, "s8-cancel")
  })

  test("S9: regression — admin list shows ALL active businesses, not just featured", async ({
    page,
  }) => {
    await page.goto("/admin/businesses")
    // 11 active businesses in the seed (biz-001 through biz-011 minus
    // any in non-active state); we only need to confirm at least one
    // tier3 row is present, which would not be the case under the
    // old no-filter=featured fallback.
    // Thali House is tier3 in the seed.
    await expect(
      page.getByRole("link", { name: "Thali House", exact: true }),
    ).toBeVisible()
    await shot(page, "s9-admin-list-all")
  })
})
