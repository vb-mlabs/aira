import { test, expect } from "@playwright/test"

// requireAdmin's contract: non-admin returns 404 (notFound()) — same
// response as any nonexistent route, no enumeration of /admin/* existence.
// Unauthenticated requests redirect to /login (via requireUser before
// requireAdmin checks role).

test("/admin/users redirects unauthenticated visitors to /login", async ({
  page,
}) => {
  await page.goto("/admin/users")
  await expect(page).toHaveURL(/\/login$/)
})

test("/admin/users/some-id redirects unauthenticated visitors to /login", async ({
  page,
}) => {
  await page.goto("/admin/users/some-id")
  await expect(page).toHaveURL(/\/login$/)
})

test("/admin/audit redirects unauthenticated visitors to /login", async ({
  page,
}) => {
  await page.goto("/admin/audit")
  await expect(page).toHaveURL(/\/login$/)
})
