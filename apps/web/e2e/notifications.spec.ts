import { test, expect } from "@playwright/test"

test("/notifications redirects unauthenticated visitors to /login", async ({
  page,
}) => {
  await page.goto("/notifications")
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome back" }),
  ).toBeVisible()
})

test("/api/v1/notifications/unread-count returns 401 when unauthenticated", async ({
  request,
}) => {
  const res = await request.get("/api/v1/notifications/unread-count")
  expect(res.status()).toBe(401)
})
