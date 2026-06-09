# Implementation: Listings pagination + scoped search (F7 + F8)

**Started:** 2026-06-09 18:00
**Review:** [2026-06-09-listings-pagination-search](../../reviews/2026-06-09-listings-pagination-search.md)
**Branch:** feat/rest-api-migration
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** Extend BusinessListInputSchema + BusinessListOutputSchema
  - Files: `packages/validators/src/businesses.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Add getBusinessesByCategoryPaged service function
  - Files: `packages/services/src/businesses/queries.ts`, `packages/services/src/businesses/index.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 3:** Widen listBusinessesOp handler
  - Files: `apps/web/src/server/operations/businesses.ts`
  - Commit: —
  - Notes: All branches synthesize total/page/pageSize so strict schema validates

- [ ] **Task 4:** Add Pagination component
  - Files: `apps/web/src/features/listings/components/pagination.tsx` (new)
  - Commit: —
  - Notes: First/last/current±1 truncation; hides when total <= pageSize

- [ ] **Task 5:** Lift filter state from ListingView to URL searchParams
  - Files: `apps/web/src/app/(app)/listings/[category]/page.tsx`, `apps/web/src/features/listings/components/listing-view.tsx`
  - Commit: —
  - Notes: 300ms debounce, conditional TierSection, clear ✕ button

- [ ] **Task 6:** Smoke test + manual verification
  - Files: (verification only)
  - Commit: —
  - Notes: Capture screenshot to .mstack/code/2026-06-09-listings-pagination-search/
