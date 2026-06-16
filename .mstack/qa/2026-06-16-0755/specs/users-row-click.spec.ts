import { test, expect } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ASSETS = path.join(__dirname, "..", "assets")

// Verify the just-shipped admin/users row-click change:
//  - Name is no longer styled as a hyperlink (no text-primary, no underline)
//  - The row itself is the click target (clicking any cell navigates)
//  - The keyboard <Link> is still in the DOM so Tab + Enter still navigates

test("admin/users — whole-row click navigates to detail page (clicking on Email cell, not Name)", async ({ page }) => {
  await page.goto("/admin/users")
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible()

  await page.screenshot({
    path: path.join(ASSETS, "05-admin-users-table.png"),
    fullPage: true,
  })

  // Pick the first user row and click the EMAIL cell — not the name.
  // Pre-fix this was a no-op; post-fix it should navigate.
  const firstRow = page.locator("tbody tr").first()
  await expect(firstRow).toBeVisible()

  // Capture the row's nameLink href so we can assert the navigation
  // destination matches it regardless of which seed user is first.
  const nameLink = firstRow.locator("a").first()
  const expectedHref = await nameLink.getAttribute("href")
  expect(expectedHref).toMatch(/^\/admin\/users\/.+/)

  // Confirm the name is no longer styled as a hyperlink.
  const nameClass = await nameLink.getAttribute("class")
  expect(nameClass).toMatch(/text-foreground/)
  expect(nameClass).not.toMatch(/text-primary/)
  expect(nameClass).not.toMatch(/hover:underline/)

  // Confirm the row carries the cursor-pointer + relative classes that
  // make the after:* pseudo-element overlay work.
  const rowClass = await firstRow.getAttribute("class")
  expect(rowClass).toMatch(/relative/)
  expect(rowClass).toMatch(/cursor-pointer/)

  // Click the EMAIL cell (2nd td) — confirms the click extends beyond
  // the name cell. force: true bypasses Playwright's "subtree intercepts
  // pointer events" guard; the interception IS the feature — the after:*
  // overlay catches the click and follows the Link.
  const emailCell = firstRow.locator("td").nth(1)
  await emailCell.click({ force: true })
  await expect(page).toHaveURL(new RegExp(`${expectedHref}$`))
})
