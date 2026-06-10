# QA report — 2026-06-10 S4 full sweep

**Focus:** S4 — Membership Plans, Sponsorship Tiers, Business Subscriptions/Sponsorships, Businesses list, Cron, Public visibility gate
**Env:** Replit dev (REPLIT_DEV_DOMAIN)
**Status:** issues_found → all fixed, 19/19 pass
**Tester:** /mlabs-qa

## Scenarios run

1. Admin sidebar — S4 nav links — **pass**
2. Admin membership plans — list, create, edit, deactivate — **pass**
3. Admin sponsorship tiers — list, create, priority conflict — **pass**
4. Admin business subscriptions — modal opens, create without evidence — **pass**
5. Admin business sponsorships — modal opens, create and cancel — **pass**
6. Admin businesses list — subscription column + renewing filter + CSV — **pass**
7. Admin cron — renders both jobs, Run Now clickable — **pass**
8. Public listings — page loads, API visibility gate — **pass**

## Issues

### Issue 1: `runFromRequest` path-param injection breaks nested subscription routes
- **Severity:** critical
- **Repro:**
  1. Open any business admin detail page
  2. Subscriptions section shows "Loading…" forever
  3. Try to add a subscription via Add dialog — 422 error
  4. Try to delete a subscription — 422/404 error (wrong record targeted)
- **Expected:** Subscriptions section loads and CRUD works
- **Actual:** `runFromRequest` injects URL `[id]` path param into the raw Zod input. `.strict()` schemas reject the injected key; delete op used `id` as schema key which was overwritten by the business ID path param, targeting the wrong record.
- **Console errors:** Zod validation: `Unrecognized key: 'id'`
- **Suspected cause:** `packages/api/src/operation.ts:286-288` + `apps/web/src/server/operations/business-subscriptions.ts`
- **Fix:**
  - `listSubscriptionsOp`: removed `.strict()` so injected `id` is stripped
  - `createSubscriptionOp`: used `.strip()` on input schema
  - `deleteSubscriptionOp`: renamed schema keys to `{ id, subId }` matching actual path params; updated handler
  - `subscriptions-section.tsx`: removed redundant query params from DELETE call
- **Status:** ✓ fixed

### Issue 2: `runFromRequest` path-param injection breaks nested sponsorship routes
- **Severity:** critical
- **Repro:**
  1. Open any business admin detail page
  2. Sponsorships section shows "Loading…" forever
  3. Add/cancel sponsorship — 422/404 error
- **Expected:** Sponsorships section loads and CRUD works
- **Actual:** Same root cause as Issue 1
- **Console errors:** Zod validation: `Unrecognized key: 'id'`
- **Suspected cause:** `apps/web/src/server/operations/sponsorships.ts`
- **Fix:**
  - `listSponsorshipsOp`: removed `.strict()`
  - `createSponsorshipOp`: used `.strip()` on input schema
  - `cancelSponsorshipOp`: renamed schema keys to `{ id, spId }`; updated handler
  - `sponsorships-section.tsx`: removed redundant query params from DELETE call
- **Status:** ✓ fixed

### Issue 3: Sponsorship "Add" dialog fetched wrong categories endpoint
- **Severity:** high
- **Repro:**
  1. Business admin page → Sponsorships → Add
  2. Category select shows only "— Select category —", no categories
- **Expected:** Category dropdown populated with active categories
- **Actual:** `sponsorships-section.tsx` fetched `/api/v1/categories` which returns `{ counts: Record<string,number> }` not a category list. Silent catch swallowed the mismatch.
- **Console errors:** none (swallowed by `catch(() => {})`)
- **Suspected cause:** `apps/web/src/features/admin/components/sponsorships-section.tsx:204`
- **Fix:** Changed to `/api/v1/categories?tree=1`, destructured `{ tree }` response, flattened into Category array
- **Status:** ✓ fixed

### Issue 4: `listCategoriesTreeOp` `.strict()` rejects dispatch param `?tree=1`
- **Severity:** high
- **Repro:**
  1. Any client calls `GET /api/v1/categories?tree=1`
  2. `runFromRequest` reads query params → `{ tree: "1" }`
  3. `listCategoriesTreeOp` validates against `z.object({}).strict()` — rejects `tree` key → 422
  4. Callers with `catch(() => {})` silently get empty categories
- **Expected:** Returns `{ tree: [...] }`
- **Actual:** 422 validation error
- **Suspected cause:** `apps/web/src/server/operations/categories.ts:39` — `.strict()` on empty input
- **Fix:** Removed `.strict()` from `listCategoriesTreeOp` and `listCategoriesOp` inputs
- **Status:** ✓ fixed

## Summary

4 total · 2 critical · 2 high · 0 medium · 0 low  
All fixed. 19/19 Playwright scenarios pass. Typecheck clean.

### Root-cause pattern

Issues 1, 2, and 4 share one root cause: **`runFromRequest` injects URL path/query params unconditionally, but S4 operations used `.strict()` schemas that reject unexpected keys.**

Fix pattern going forward:
- Nested route operations (`/businesses/[id]/...`) must NOT use `.strict()` on list/create inputs
- Delete/cancel ops on nested routes must use actual path-param names (`id`, `subId`, `spId`) as schema keys  
- Query-dispatched GET ops (`?tree=1`) must not use `.strict()` — the dispatch param leaks into the raw input
