# Implementation: Membership-plan-derived placement tier

**Started:** 2026-06-15
**Review:** [2026-06-15-membership-plan-tier](../../reviews/2026-06-15-membership-plan-tier.md)
**Branch:** feat/rest-api-migration
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add `tier` column to `membership_plan` + migration
  - Files: `packages/db/src/schema/membership-plans.ts`, `packages/db/drizzle/migrations/0025_lucky_gorilla_man.sql`
  - Commit: `b5e266e`
  - Notes: One ADD COLUMN, NOT NULL DEFAULT 'tier3'. Lefthook check-migrations green.

- [x] **Task 2:** Export `TIER_LABELS` from `@aira/validators/businesses`
  - Files: `packages/validators/src/businesses.ts`
  - Commit: `0989762`
  - Notes: Plain const Record with exhaustive BusinessTier keys.

- [x] **Task 3:** Add `tier` to MembershipPlan validators; strip from Business write schemas
  - Files: validators + services edits (queries.ts, service.ts on both businesses + membership-plans)
  - Commit: `3b38df2`
  - Notes: Task 6 absorbed — `createBusiness` and `updateBusiness` payloads also drop `tier` since the schema change forces the issue.

- [x] **Task 4:** Add `findActivePaidPlansForBusiness` + `recomputeBusinessTier` helpers
  - Files: queries.ts, service.ts, recompute-tier.test.ts
  - Commit: `fd43848`
  - Notes: 5 tests cover best-tier, fallback-tier3, multiple subs. TIER_PRIORITY lookup stays inside the service.

- [x] **Task 5:** Wrap subscription mutations + rollover in `db.transaction` + fire recompute
  - Files: service.ts, recompute-wiring.test.ts
  - Commit: `d4dc9c4`
  - Notes: tx cast `as unknown as Database` at recompute call sites (matches messages-service mock convention). 4 wiring tests pass.

- [x] **Task 6:** `createBusiness` drops explicit `tier:` insert column
  - Files: `packages/services/src/businesses/queries.ts`, `service.ts`
  - Commit: `3b38df2` (bundled with Task 3)
  - Notes: Bundled into the validator-tightening commit so the build doesn't go red.

- [x] **Task 7:** Backfill function + `/admin/cron` Run-now button
  - Files: service, barrel export, new `lib/cron/backfill-business-tiers.ts`, registry, admin cron page
  - Commit: `7b9857b`
  - Notes: Registered but NOT scheduled — manual only.

- [x] **Task 8:** Membership plan UI — tier `<select>` + list-page chip
  - Files: `plan-form.tsx`, `page.tsx`
  - Commit: `c54fb3e`
  - Notes: Placement select labeled with TIER_LABELS; chip in list-page Tier column.

- [x] **Task 9:** Admin business detail — drop tier dropdown, surface per-sub tier chip
  - Files: `business-detail.tsx`, `subscriptions-section.tsx`
  - Commit: `630b266`
  - Notes: SubscriptionsSection now fetches plans alongside subs to surface placement chip per row. ESLint set-state-in-effect rule needed an explicit suppression on the existing useEffect.

- [x] **Task 10:** Admin businesses list — tier column via `TIER_LABELS`
  - Files: `apps/web/src/app/admin/businesses/page.tsx`
  - Commit: `24ad3fb`
  - Notes: Cast `b.tier as BusinessTier` to satisfy TIER_LABELS lookup since `Business.tier` is the wire union.

- [x] **Task 11:** Public listings — `TIER_LABELS` everywhere; fix `business-card.tsx` tier2
  - Files: `business-card.tsx`, `tier-section.tsx`
  - Commit: `2425978`
  - Notes: tier-section "Regular Listings" → "Regular" (full consistency with TIER_LABELS). Grep verifies no remaining tier-label literals outside the source map.
