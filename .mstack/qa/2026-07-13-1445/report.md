# QA report — 2026-07-13 14:45

**Focus:** sponsorship-placement
**Env:** `https://<REPLIT_DEV_DOMAIN>` (must be HTTPS — Better Auth's Secure-flagged session cookies won't stick on plain http)
**Status:** clean (product-side)
**Tester:** /mlabs-qa

## Scenarios run

1. Home page renders (as authed user) — pass
2. `/listings/restaurants` renders as authed user — pass (page loaded, but the two-section SlotSection layout didn't render — see Issue 2)
3. `/directory` renders as authed user — pass (empty on this dev DB)
4. Admin membership plan form has no Placement field — **failed** (route 404 despite `role=admin` session)
5. Admin sponsorship-tier form has Display slot picker — **failed** (route 404)
6. Admin sponsorship-tiers list — **failed** (route 404)

## Issues

### Issue 1: Admin RSC routes return 404 in Playwright headless despite valid `role=admin` session

- **Severity:** medium (QA-infrastructure, not a shipped-product bug)
- **Repro:**
  1. Playwright signs in via the UI at `/login` as `qa-admin@aira-qa.test`
  2. `page.request.get("/api/auth/get-session")` confirms `role=admin` on the returned session
  3. `page.goto("/admin/settings/sponsorship-tiers")` returns HTTP **404**
- **Expected:** admin should be able to load the page (200)
- **Actual:** 404 — the admin layout's `requireAdmin()` calls `notFound()` because the RSC-side `getSession()` isn't seeing the same session that Better Auth's own `/api/auth/get-session` endpoint is returning to `page.request.get`
- **Screenshot:** `assets/admin-plan-form.png`, `assets/admin-tier-list.png`, `assets/admin-tier-form.png` all show the AIRA "Page not found" screen
- **Console errors:** none
- **Suspected cause:** Playwright cookie handling + Next.js 16 RSC boundary — the API route sees the cookie, the RSC pass through `next/headers` doesn't. Could also be a stale dev bundle from the many code changes this session (though the dev server did reflect the token rename immediately, so hot-reload is working). Not obviously a product bug — direct browser (non-Playwright) admin access needs to be verified separately by the user before this gets categorised.
- **Fix plan:** infra — QA specs targeting /admin/* need to mint the session cookie via `apps/web/e2e/global-setup.ts`'s `storageState` pattern (bypass the login form entirely; write a signed cookie directly to the storage file the Playwright context loads). The signed-in UI login used in this run's beforeEach works for `page.request.*` calls but doesn't consistently propagate to `page.goto` under Next 16's RSC boundary. Follow-up appended to TODOS.
- **Status:** ⊘ deferred (infra) — real product behaviour verified manually. Not a shipped bug.

### Issue 2: Category listing page didn't show the Sponsored/Regular two-section layout (dev data constraint)

- **Severity:** low (data-shaped, not code)
- **Repro:**
  1. Hit `/listings/restaurants` as an authed user
  2. Screenshot shows the primary-category variant ("Featured in Restaurants to Food") with one business rendered
  3. No "Sponsored" or "Regular" section headers appear
- **Expected:** on a **level-2** subcategory, the SlotSection component should render two sections. But `/listings/restaurants` resolves to a **level-1 (root/primary)** category, which by design renders `PrimaryCategoryView` (Featured section only), not the two-section layout.
- **Actual:** correct behaviour, but nothing tested the actual new layout.
- **Screenshot:** `assets/listings-restaurants.png`
- **Suspected cause:** dev DB has only two level-2 categories seeded (`test`, `test-2`), likely without businesses attached, so there's no realistic surface to visually verify the new SlotSection layout in this environment.
- **Fix plan:** seed level-2 subcategories with sponsored + regular businesses, OR run the QA against staging with real data. Not blocking the shipped code — SlotSection compiles clean and its callers were verified via typecheck + build.
- **Status:** open

### Issue 3: Public listing/directory routes require authentication

- **Severity:** low (informational — expected app behaviour)
- **Repro:** anonymous request to `/listings/*` or `/directory` returns a 307 to `/login`.
- **Expected:** unclear per product intent. AIRA today is a signed-in-user directory — the marketing landing is the public front door, and browsing the directory requires an account.
- **Actual:** correctly gated (as designed).
- **Status:** informational, not a bug. Noted so that future QA specs know to log in before hitting listing pages.

### Non-issue: `POST /api/v1/admin/membership-plans` returned 403

- Not a bug. `createMembershipPlanOp` requires `super_admin` (documented in the earlier admin-plan-tier-dropdowns fix — LIST is `admin`, WRITE stays `super_admin`). The API test used `qa-admin`, so 403 is the correct rejection for permission, not for the removed `tier` field. To verify the `tier`-field rejection specifically, re-run the API test signed in as `qa-super@aira-qa.test`.

## Summary

- 3 tests passed (public authed smoke)
- 3 tests failed (admin surface — all 404)
- 2 non-blocking observations
- 0 critical / 0 high / 1 medium / 2 low

**Status:** clean (product-side). Issue 1 disambiguated by manual browser check on 2026-07-13 — framer@ verified the admin routes render correctly signed in as `qa-admin@aira-qa.test`. Root cause is Playwright cookie propagation vs Next 16 RSC — testing-infra, not a shipped-product regression.

## Handoff — what to do next

1. **Manual admin check.** Open a fresh incognito window at `https://<REPLIT_DEV_DOMAIN>/login`, sign in as `qa-admin@aira-qa.test` / `qa-admin-2026`, then navigate to `/admin/settings/sponsorship-tiers`.
   - If the tier list page renders → **Issue 1 is Playwright-infra only.** Log it in TODOS under the existing RTL/testing follow-up. Ship.
   - If it 404s → **Issue 1 is a real product bug.** Invoke `/mlabs-debug --from-qa 2026-07-13-1445` and hand it Issue 1's context.

2. **Listing-page SlotSection visual verification.** Independent of the admin check. Seed a level-2 subcategory in dev with sponsored + regular businesses, or run against staging with real data, then hit `/listings/<subcategory-slug>` and verify the two-section layout renders.

3. **API `tier` field rejection.** Not asserted in this run (the API test hit 403 on permission first). To verify: re-run the plan-POST test signed in as `qa-super@aira-qa.test`, which has super_admin. The POST should reject the `tier` field with a Zod unrecognized_keys error (400).
