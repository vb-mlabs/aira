import { test, expect } from "@playwright/test"
import { brand } from "@mlabs/config"

test("home renders brand wordmark and primary CTAs", async ({ page }) => {
  await page.goto("/")

  // Brand wordmark appears in the marketing nav.
  await expect(page.getByRole("link", { name: brand.name }).first()).toBeVisible()

  // Hero headline derives from brand.tagline (the highlight substring is
  // rendered inside the same heading via a span, so the accessible name
  // contains the full tagline plus a trailing period).
  await expect(
    page.getByRole("heading", { level: 1, name: new RegExp(brand.tagline) }),
  ).toBeVisible()

  // Both primary CTAs from the nav + hero are present.
  await expect(page.getByRole("link", { name: /Get started/ }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible()
})
