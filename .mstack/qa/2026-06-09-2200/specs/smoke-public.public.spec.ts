// Public (unauthenticated) smoke — verifies auth-gate redirects work.

import { test, expect } from "@playwright/test"

test.describe("Auth gate — unauthenticated redirects", () => {
  test("/home redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/home")
    await expect(page).toHaveURL(/\/login/)
  })

  test("/listings/restaurants redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/listings/restaurants")
    await expect(page).toHaveURL(/\/login/)
  })

  test("/admin/businesses redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/admin/businesses")
    await expect(page).toHaveURL(/\/login/)
  })

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible({ timeout: 10000 })
  })
})
