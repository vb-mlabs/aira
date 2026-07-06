# Implementation: Featured business selection logic

**Started:** 2026-07-06
**Review:** [2026-07-06-featured-business-selection](../../reviews/2026-07-06-featured-business-selection.md)
**Branch:** feat/featured-business-selection
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Replace featured queries in @aira/services
  - Files: `packages/services/src/businesses/queries.ts`, `packages/services/src/businesses/index.ts`, `packages/services/src/index.ts`, `packages/services/src/subscription-followups/queries.ts`
  - Commit: `fc080bb`
  - Notes: Skipped writing unit tests — no existing test coverage on any `businesses/queries.ts` function, so following the pattern (deferred to `/mlabs-qa`). Also reverted a one-line comment fix in `packages/db/src/schema/businesses.ts` that tripped the migration hook.

- [x] **Task 2:** Rewire listBusinessesOp + update Zod comment
  - Files: `apps/web/src/server/operations/businesses.ts`, `packages/validators/src/businesses.ts`
  - Commit: `a953143`
  - Notes: Introduced `FEATURED_LIMIT = 5` module constant to enforce the clamp uniformly across the three featured code paths.

- [x] **Task 3:** Web home cap 5 + repoint View All
  - Files: `apps/web/src/app/(app)/home/page.tsx`
  - Commit: `c3b9a6f`

- [x] **Task 4:** Mobile home FEATURED_LIMIT 6 → 5
  - Files: `apps/mobile/features/listings/hooks.ts`
  - Commit: `55d7128`

- [x] **Task 5:** Web PrimaryCategoryView + level branch
  - Files: `apps/web/src/features/listings/components/primary-category-view.tsx` (new), `apps/web/src/app/(app)/listings/[category]/page.tsx`
  - Commit: `a866e14`

- [x] **Task 6:** Mobile PrimaryCategoryView + level branch
  - Files: `apps/mobile/features/listings/components/PrimaryCategoryView.tsx` (new), `apps/mobile/app/(app)/listings/[category].tsx`, `apps/mobile/features/listings/hooks.ts`
  - Commit: `a9b9847`
