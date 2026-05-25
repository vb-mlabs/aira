// Reference authed spec — copy this file's structure when adding new
// authed tests. Auth state is loaded from e2e/support/auth.ts
// STORAGE_STATE_PATH automatically by the `authed` Playwright project
// (see playwright.config.ts). Nothing in the spec needs to call signIn —
// `page` is already logged in.
//
// Doubles as the regression canary: if any future BetterAuth, middleware,
// or (app)/layout.tsx change breaks cookie acceptance, this spec fails
// immediately.

import { test, expect } from "@playwright/test"
import { brand } from "@mlabs/config"

test("authed user lands on /notifications without redirect", async ({
  page,
}) => {
  await page.goto("/notifications", { waitUntil: "domcontentloaded" })

  // No redirect to /login — the session cookie was accepted by
  // requireUser() in (app)/layout.tsx.
  await expect(page).toHaveURL(/\/notifications$/)

  // (app)/layout.tsx shell rendered around the page content.
  await expect(
    page.getByRole("link", { name: brand.name }).first(),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: /sign out/i }),
  ).toBeVisible()
})
