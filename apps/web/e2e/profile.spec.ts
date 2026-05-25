import { test, expect } from "@playwright/test"

// /profile is gated by requireUser(). An anonymous request must redirect to
// /login. This is the smallest E2E that exercises the (app) layout's auth
// guard end-to-end (real cookies, real middleware, real redirect).
test("/profile redirects unauthenticated visitors to /login", async ({ page }) => {
  await page.goto("/profile")
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeVisible()
})
