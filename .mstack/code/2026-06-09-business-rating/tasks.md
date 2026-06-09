# Implementation: Admin star rating (F11)

**Started:** 2026-06-09 19:30
**Finished:** 2026-06-09 19:55
**Review:** [2026-06-09-business-rating](../../reviews/2026-06-09-business-rating.md)
**Branch:** feat/rest-api-migration
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add rating column + CHECK to schema
  - Files: `packages/db/src/schema/businesses.ts`, `packages/db/drizzle/migrations/0014_nebulous_hercules.sql`
  - Commit: `418e796`
  - Notes: numeric(2,1) mode:"number"; check `businesses_rating_check`

- [x] **Task 2:** Widen Business validators **(combined with T3)**
  - Files: `packages/validators/src/businesses.ts`
  - Commit: `7c945c3`
  - Notes: Combined with T3 because widening Business type forces toBusiness to populate

- [x] **Task 3:** Thread rating through service layer **(combined with T2)**
  - Files: `packages/services/src/businesses/queries.ts`, `service.ts`
  - Commit: `7c945c3`
  - Notes: No Number() coercion needed thanks to mode:"number"

- [x] **Task 4:** RatingPill component
  - Files: `apps/web/src/features/listings/components/rating-pill.tsx`
  - Commit: `f79b3cc`
  - Notes: lucide Star filled, --warning color, always 1 decimal

- [x] **Task 5:** Mount RatingPill on Card + Detail
  - Files: `business-card.tsx`, `business-detail.tsx` (listings)
  - Commit: `3dc57d5`
  - Notes: flex-wrap added on parent so name+badge+pill row breaks gracefully

- [x] **Task 6:** RatingSection on admin form
  - Files: `apps/web/src/features/admin/components/business-detail.tsx`
  - Commit: `37509cf`
  - Notes: 11 numeric options + "No rating"; widened runUpdate to accept numbers

- [x] **Task 7:** API smoke + run report
  - Files: `.mstack/code/2026-06-09-business-rating/`
  - Commit: (pending — final housekeeping)
  - Notes: PATCH 4.5 → 200, GET shows 4.5, PATCH null → cleared, PATCH 7 → 400 + CHECK defends raw SQL
