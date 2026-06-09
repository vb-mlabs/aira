# Implementation: Listings pagination + scoped search (F7 + F8)

**Started:** 2026-06-09 18:00
**Finished:** 2026-06-09 18:50
**Review:** [2026-06-09-listings-pagination-search](../../reviews/2026-06-09-listings-pagination-search.md)
**Branch:** feat/rest-api-migration
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Extend BusinessListInputSchema
  - Files: `packages/validators/src/businesses.ts`
  - Commit: `d702bfc`
  - Notes: Output schema widening pushed into T3 (coupled with handler update)

- [x] **Task 2:** Add getBusinessesByCategoryPaged service fn
  - Files: `packages/services/src/businesses/queries.ts`, `index.ts`
  - Commit: `e9d0ea3`
  - Notes: Promise.all on items + COUNT; ILIKE %q% over name/description/address

- [x] **Task 3:** Widen listBusinessesOp handler + output schema
  - Files: `packages/validators/src/businesses.ts`, `apps/web/src/server/operations/businesses.ts`
  - Commit: `7213ad0`
  - Notes: withFullPageMeta() synthesizes total/page/pageSize on existing branches so the strict output schema validates uniformly

- [x] **Task 4:** Pagination component
  - Files: `apps/web/src/features/listings/components/pagination.tsx`
  - Commit: `76dd490`
  - Notes: First/last/current±1 truncation; hides when totalPages ≤ 1

- [x] **Task 5:** Lift filter state to URL searchParams
  - Files: `apps/web/src/app/(app)/listings/[category]/page.tsx`, `apps/web/src/features/listings/components/listing-view.tsx`
  - Commit: `5570246`
  - Notes: 300ms debounce, conditional TierSection (already), clear ✕ button, useTransition fade; React 19 derived-state pattern for prop sync

- [x] **Task 6:** Smoke test + run report
  - Files: `.mstack/code/2026-06-09-listings-pagination-search/`
  - Commit: `3099560`
  - Notes: API-level smoke (curl with session cookie) covered all 6 paths cleanly; browser screenshot skipped due to Replit-domain cookie/localhost mismatch
