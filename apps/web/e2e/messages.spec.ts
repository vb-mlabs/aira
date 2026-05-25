import { test, expect } from "@playwright/test"

// Auth-gated route checks — equivalent to /notifications and /profile.
// The full "A sends, B receives within 3s" two-context E2E is gated
// behind DATABASE_URL because it needs real signup + verify + a Postgres
// to write to. When credentials exist locally it should be turned on as
// part of /qa before shipping.

test("/messages redirects unauthenticated visitors to /login", async ({ page }) => {
  await page.goto("/messages")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible()
})

test("/messages/[id] redirects unauthenticated visitors to /login", async ({ page }) => {
  await page.goto("/messages/conv_anything")
  await expect(page).toHaveURL(/\/login$/)
})

test("GET /api/v1/messages/conversations returns 401 when unauthenticated", async ({
  request,
}) => {
  const res = await request.get("/api/v1/messages/conversations")
  expect(res.status()).toBe(401)
})

test("GET /api/v1/messages/conversations/[id]/messages returns 401 when unauthenticated", async ({
  request,
}) => {
  const res = await request.get(
    "/api/v1/messages/conversations/conv_anything/messages",
  )
  expect(res.status()).toBe(401)
})
