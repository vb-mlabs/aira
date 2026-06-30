import { test, expect } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")

// Seeded businesses + expected caption text/treatment. End-date formatting
// for the absolute fallback follows expiryLabel's UTC MM/DD/YYYY rule.
// We accept any /^\d{2}\/\d{2}\/\d{4}$/ because the exact day depends on
// when the run executes — but the row-level treatment is deterministic.

const ROWS = [
  // name                            captionRegex                 critical  overdue
  { name: "Saffron Spice Restaurant", caption: /^in 2 days$/,      crit: true,  over: false },
  { name: "Patel Brothers Grocery",   caption: /^\d{2}\/\d{2}\/\d{4}$/, crit: false, over: false },
  { name: "Krishna Yoga Studio",      caption: /^\d{2}\/\d{2}\/\d{4}$/, crit: false, over: false },
  { name: "Tandoori Express",         caption: /^OVERDUE 3d$/,     crit: false, over: true  },
  { name: "Mumbai Tiffin Service",    caption: /^OVERDUE 12d$/,    crit: false, over: true  },
  { name: "Bharatanatyam Academy",    caption: /^in 5 days$/,      crit: false, over: false },
  // Dosa Hut: no subscription → no caption at all (asserted separately)
  { name: "Stale Paid Tea House",     caption: /^OVERDUE 5d$/,     crit: false, over: true  },
] as const

test.describe("admin businesses — renewal urgency caption + overdue row stripe", () => {
  test("desktop @ 1440x900 — table renders all seeded rows with correct caption + row treatment", async ({ page }) => {
    await page.goto("/admin/businesses")
    await expect(page.getByRole("heading", { name: "Businesses" })).toBeVisible()

    await page.screenshot({
      path: path.join(ASSETS, "01-desktop-businesses-table.png"),
      fullPage: true,
    })

    for (const row of ROWS) {
      const linkLocator = page.getByRole("link", { name: row.name })
      const trLocator = linkLocator.locator("xpath=ancestor::tr")

      // Caption sits in the Subscription cell (4th td), under the AdminBadge.
      const subscriptionCell = trLocator.locator("td").nth(3)
      const caption = subscriptionCell.locator("span.block.text-\\[11px\\]")
      await expect(caption, `caption visible for ${row.name}`).toBeVisible()
      await expect(caption, `caption text for ${row.name}`).toHaveText(row.caption)

      // Class-based assertions for color escalation.
      const captionClass = await caption.getAttribute("class")
      if (row.over) {
        expect(captionClass, `${row.name} caption should be destructive bold uppercase`).toMatch(/text-destructive/)
        expect(captionClass).toMatch(/font-bold/)
        expect(captionClass).toMatch(/uppercase/)
      } else if (row.crit) {
        expect(captionClass, `${row.name} caption should be destructive semibold`).toMatch(/text-destructive/)
        expect(captionClass).toMatch(/font-semibold/)
        expect(captionClass).not.toMatch(/uppercase/)
      } else {
        expect(captionClass, `${row.name} caption should be muted`).toMatch(/text-muted-foreground/)
        expect(captionClass).not.toMatch(/text-destructive/)
      }

      // Row-border treatment is keyed on the box-shadow inset class.
      const rowClass = await trLocator.getAttribute("class")
      if (row.over) {
        expect(rowClass, `${row.name} row should carry destructive bg + border`).toMatch(/shadow-\[inset_3px/)
        expect(rowClass).toMatch(/bg-destructive\/\[0\.04\]/)
      } else {
        expect(rowClass, `${row.name} row should NOT carry destructive treatment`).not.toMatch(/shadow-\[inset_3px/)
      }
    }
  })

  test("Dosa Hut (no subscription) — em-dash in cell, no caption, no border", async ({ page }) => {
    await page.goto("/admin/businesses")
    const linkLocator = page.getByRole("link", { name: "Dosa Hut" })
    const trLocator = linkLocator.locator("xpath=ancestor::tr")
    const subscriptionCell = trLocator.locator("td").nth(3)

    await expect(subscriptionCell).toHaveText("—")
    await expect(subscriptionCell.locator("span.block.text-\\[11px\\]")).toHaveCount(0)

    const rowClass = await trLocator.getAttribute("class")
    expect(rowClass).not.toMatch(/shadow-\[inset_3px/)
  })

  test("mobile @ 375x812 — caption still renders, table is horizontally scrollable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/admin/businesses")
    await page.screenshot({
      path: path.join(ASSETS, "02-mobile-businesses-table.png"),
      fullPage: true,
    })

    // Spot-check one critical row + one overdue row to confirm caption +
    // treatment survive the narrow viewport.
    const saffron = page.getByRole("link", { name: "Saffron Spice Restaurant" }).locator("xpath=ancestor::tr")
    await expect(saffron.locator("span.block.text-\\[11px\\]")).toHaveText("in 2 days")

    const tandoori = page.getByRole("link", { name: "Tandoori Express" }).locator("xpath=ancestor::tr")
    await expect(tandoori.locator("span.block.text-\\[11px\\]")).toHaveText("OVERDUE 3d")
    const tandooriClass = await tandoori.getAttribute("class")
    expect(tandooriClass).toMatch(/shadow-\[inset_3px/)

    // QA Issue #2 fix verification — the table wrapper must allow horizontal
    // scroll so admins on narrow viewports can reach the Subscription /
    // Verified / Status columns. Pre-fix this used overflow-hidden which
    // clipped those columns entirely.
    const tableWrapper = page.locator("div.overflow-x-auto").filter({ has: page.locator("table") }).first()
    await expect(tableWrapper).toBeVisible()

    // Scroll the Subscription cell into view and confirm the caption is
    // visible after the scroll. Using scrollIntoViewIfNeeded() exercises
    // the scrollable wrapper.
    const tandooriCaption = tandoori.locator("span.block.text-\\[11px\\]")
    await tandooriCaption.scrollIntoViewIfNeeded()
    await expect(tandooriCaption).toBeInViewport()

    await page.screenshot({
      path: path.join(ASSETS, "02b-mobile-scrolled-to-subscription.png"),
      fullPage: false,
    })
  })

  test("clicking an overdue row still navigates to the detail page", async ({ page }) => {
    await page.goto("/admin/businesses")
    const tandoori = page.getByRole("link", { name: "Tandoori Express" })
    await tandoori.click()
    // Detail page URL is /admin/businesses/<id> — the seeded UUID is fixed.
    await expect(page).toHaveURL(/\/admin\/businesses\/00000000-0000-4000-8000-000000001604/)
    await page.screenshot({
      path: path.join(ASSETS, "03-detail-page-from-overdue-click.png"),
      fullPage: true,
    })
  })

  test("regression: /admin/renewals still renders the Expiry column after expiryLabel extraction", async ({ page }) => {
    await page.goto("/admin/renewals")
    await expect(page.getByRole("heading", { name: "Renewals" })).toBeVisible()
    await page.screenshot({
      path: path.join(ASSETS, "04-renewals-queue-regression.png"),
      fullPage: true,
    })

    // The queue should include our overdue seeds since they fall within
    // the default 30-day window. Spot-check Tandoori Express's expiry cell
    // text — same expiryLabel wording the businesses page now uses.
    const tandoori = page.getByText("Tandoori Express", { exact: true })
    await expect(tandoori).toBeVisible()
    // The whole row contains "OVERDUE 3d" somewhere in the Expiry column.
    const tandooriRow = tandoori.locator("xpath=ancestor::tr")
    await expect(tandooriRow).toContainText("OVERDUE 3d")
  })
})
