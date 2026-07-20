# Fix — Listings without an active membership are visible via count/stat surfaces

**Started:** 2026-07-20 12:00
**Source:** user-report
**Status:** fixed
**Commit:** _pending_

## Symptom / repro

Report: "Listings without a valid membership should not be displayed to users
on the app." Repro: create a listing in Admin → Manage Listings with no
subscription, then open the user app.

Verified via SQL against the dev DB:

- Category `restaurants`: `getBusinessCountsByCategory` returns **15**;
  actual `/listings/restaurants` page (which uses the VISIBLE-gated
  `getBusinessesByCategoryPaged`) renders **4**. The tile on `/categories`
  and the subcategory tiles on primary `/listings/[root]` therefore
  advertise 11 phantom listings.
- Global: `countActiveBusinesses` returns **27**; VISIBLE-filtered total is
  **9**. The "Businesses Listed" stat card on `/home` displays `27+` to
  every signed-in user.

The paginated browse queries (`getBusinessesByCategory`,
`getBusinessesByCategoryPaged`, `getAllBusinessesPaged`, `getBusinessById`)
already apply the VISIBLE gate correctly — this is a counts-only leak.

## Root cause

The VISIBLE gate — `EXISTS (SELECT 1 FROM business_subscription WHERE
payment_status IN ('paid','pending') AND now() BETWEEN start_date AND
end_date)` — is applied inline inside every browse query in
`packages/services/src/businesses/queries.ts` but was not carried over to:

1. `getBusinessCountsByCategory` in
   `packages/services/src/categories/queries.ts:12-24` — no WHERE clause
   at all; even soft-deleted rows count.
2. `countActiveBusinesses` in
   `packages/services/src/businesses/queries.ts:530-536` — filters on
   `deleted_at IS NULL` only.

The `primary-category-view.tsx:25` comment describes the payload as
"visible-business counts", so the intent was always subscription-gated —
the query just lagged the intent. The Featured queries
(`getFeaturedRandom`, `getFeaturedRandomForCategory`) intentionally use
`HAS_ACTIVE_SPONSORSHIP` only per the 2026-07-13 placement-single-axis
refactor and are not part of this fix; verified there are 0 rows with an
active sponsorship but no visible subscription, so no user-visible leak
via that path today.

## Fix

- `packages/services/src/businesses/queries.ts:530` — `countActiveBusinesses`
  now includes the module-local `VISIBLE` predicate.
- `packages/services/src/categories/queries.ts:12` — `getBusinessCountsByCategory`
  now filters on `deleted_at IS NULL` AND an inline copy of the same
  VISIBLE predicate. Inlined (rather than exported/imported) to match the
  `favorites/queries.ts` precedent of module independence.

## Evidence

- Repro re-run against dev DB before/after: see numbers above; after the
  fix, both counts collapse to the VISIBLE-gated totals (`9` global,
  `4` for restaurants) that match what the listing pages already render.
- Typecheck: `pnpm typecheck` → passes.
- Test: `pnpm --filter @aira/web test businesses-count-route` → passes
  (the route test mocks the service function, so it isn't sensitive to
  the semantic change, but confirms the op wiring still holds).

## Follow-ups

- Extracting a shared VISIBLE helper (currently inlined in 3 modules:
  businesses/queries, favorites/queries variant, and now categories/queries)
  is a refactor worth considering if a fourth site appears — not scoped
  into this fix.
