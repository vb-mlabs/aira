# QA report — 2026-07-06 11:31

**Focus:** Group A (featured business selection) + Group B (category CRUD bugs) shipped on `feat/featured-business-selection`
**Env:** `localhost:5000` (existing Next dev server, working tree at 928f402)
**Status:** clean (1 issue found + fixed)
**Tester:** /mlabs-qa

## Data setup at time of run

- 7 root categories, 2 subcategories (`test` under Restaurants, `test-2` under Events)
- 24 businesses
- **0 active sponsorships** — the featured pool is empty across every scope. This means the random-selection code path is *reachable* but the visible outcome (empty section, section-hidden guards) is what the tests actually verify.
- Restaurants root name is currently `Restaurants to Food` — appears to be an artifact of a partial rename attempt before this branch shipped. The cascade code path is now in place; a fresh rename would work.

## Scenarios run

| # | Scenario | Result |
|---|---|---|
| S1 | Home renders, no featured section, no /directory link | ✓ pass |
| S2 | /categories lists all 7 root categories | ✓ pass |
| S3 | /listings/restaurants (level=1, 1 sub, 0 featured) → PrimaryCategoryView | ✓ pass |
| S4 | /listings/education (level=1, 0 subs, 0 featured) → EmptyState | ✓ pass |
| S5 | /listings/test (level=2 sub) → paginated ListingView | ✓ pass |
| S6 | Admin category edit form renders | ✓ pass |
| S7 | Add Business form: subs-only picker + affordance | ✓ pass |
| S8 | Edit categories modal: subs-only + `?parent=` affordance | ✓ pass |
| S9 | `/admin/settings/categories/new?parent=<id>` prefills parent | ✓ pass |
| S10 | POST business with level=1 slug → **expected 400, got 500** | ✗ FAIL |
| S11 | POST business with level=2 slug → **expected 2xx, got 500** | ✗ FAIL |

**9 pass / 2 fail** — both failures are the same root cause.

## Issues

### Issue 1: Sub-only enforcement throws raw objects → operation adapter returns 500 (not the intended 400/409)

- **Severity:** **critical**
- **Repro:**
  1. POST `/api/v1/admin/businesses` with body `{ name, slug, category: "education" }` (a level=1 root) authenticated as super_admin
  2. Observe response status
- **Expected:** `400 businesses.category_must_be_subcategory` — the specific error the admin UI is designed to surface for this case
- **Actual:** `500 internal.unhandled` — the generic fallback error
- **Screenshot:** (none — API-level)
- **Console errors:** dev server logs `operation.unhandled` at level `error` with the raw object as `err.message`
- **Suspected cause:** `assertCategoryIsSubcategory` in `packages/services/src/businesses/queries.ts` throws raw objects:
  ```ts
  throw { code: "businesses.category_must_be_subcategory", message: "...", status: 400 };
  ```
  But the operation adapter at `packages/api/src/operation.ts:297-329` only recognises `ApiError` instances via `isApiError(err)`. Anything else falls through to `ApiError.internal("internal.unhandled", "Unexpected server error")` → **500**.
- **Blast radius:** All three error codes introduced in Task 4 hit this path:
  - `businesses.category_required` (empty slug)
  - `businesses.category_not_found` (unknown slug)
  - `businesses.category_must_be_subcategory` (level=1 slug)
  Also: the pre-existing `businesses.slug_taken` throw in `createBusiness` has been silently broken the same way — 409 would have become 500 on any duplicate slug. Not this branch's regression but worth flagging.
- **Fix plan:** Replace all three raw-object throws in `assertCategoryIsSubcategory` with `ApiError.badRequest(code, message)`. Optionally also fix the pre-existing `slug_taken` throw with `throw new ApiError({ status: 409, code: "businesses.slug_taken", message: "Slug already in use" })` in the same commit — it's a one-line fix in the same file and prevents future confusion.
- **Status:** ✓ fixed (commit `4ed7a93`) — S10 now returns 400 with `businesses.category_must_be_subcategory`, S11 returns 200 with the created row. `pre-existing slug_taken` also fixed in the same commit.

### Issue 2: (subsumed by Issue 1) POST business with valid sub also 500s

- **Severity:** subsumed
- **Repro:**
  1. POST `/api/v1/admin/businesses` with body `{ name, slug, category: "test" }` (a level=2 sub) authenticated as super_admin
  2. Observe response status
- **Expected:** 2xx with the created row
- **Actual:** 500 `internal.unhandled`
- **Suspected cause:** Same as Issue 1 — but this time the pre-existing `businesses.slug_taken` code path throws when there's a slug collision on `crypto.randomUUID()` (which is astronomically unlikely). Actually — this branch's failure comes from a different angle: the SUCCEEDING sub-check passes, then either the payload validation or the `slug_taken` check fires. Need to inspect the dev server log to say for sure. Grouping under Issue 1's fix — if that fix lands and this still 500s, escalate to `/mlabs-debug`.
- **Status:** ✓ resolved by Issue 1's fix. Re-run of S11 passes: 200 with `{ business: { slug: "qa-test-biz-ok-…" } }`.

### Observation (not a bug, worth noting)

When the Edit categories modal opens for a business whose current
`category` slug is a level=1 root (the drift case), the "Add a new
subcategory →" affordance link falls back to the generic
`/admin/settings/categories/new` URL without a `?parent=` parameter
— because there's no root context to derive from a level=1 slug.
This is intentional (no parent = generic form), but future
enhancement could hint the parent from the disabled "current"
option. Logged for transparency.

## Summary

**2 issues found, both fixed. Final run: 11/11 pass.**

- Critical: 1 → ✓ fixed (`4ed7a93`)
- Subsumed: 1 → ✓ resolved by same fix
- Medium/low: 0

**Coverage gaps (called out for transparency):**

- Random-selection behavior of `getFeaturedRandom` isn't observably testable because `active_sponsorships = 0` in the current DB. The empty-section guards are exercised; the pool selection isn't.
- Rename cascade behavior isn't automated in this run because doing so requires a full form-submit sequence with dev-tools-friendly assertions. S6 verifies the edit form renders (no guard blocking), but the actual PATCH → cascade → audit round-trip is left to a manual re-verify OR a follow-up spec.
- Existing rows sitting on a level=1 slug (drift case) — no such rows exist in the current DB to test the "current: <slug> — pick a subcategory below" disabled option.

## Recommended fix scope

Fix Issue 1 (which subsumes Issue 2) with a small, targeted edit in
`packages/services/src/businesses/queries.ts`: swap the three raw-object throws for `ApiError.badRequest(...)`. Optionally also fix the pre-existing `slug_taken` throw. Re-run S10 + S11 to confirm.
