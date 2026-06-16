# Implementation: category source-of-truth fix

**Started:** 2026-06-16
**Review:** [2026-06-16-category-drift-fix](../../reviews/2026-06-16-category-drift-fix.md)
**Branch:** feat/admin-businesses-renewal-urgency-pill
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** Defensive getCategoryMeta(slug) fallback + sweep 9 consumers
  - Files: `apps/web/src/features/listings/category-meta.ts` (edit), `apps/web/src/features/listings/index.ts` (edit), + 9 consumer files
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Slug-rename guard in updateCategoryOp + Vitest
  - Files: `apps/web/src/server/operations/categories-admin.ts` (edit), `apps/web/tests/categories-rename-guard.test.ts` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 3:** Drizzle migration 0027 — data cleanup
  - Files: `packages/db/drizzle/migrations/0027_category_drift_cleanup.sql` (new), `packages/db/drizzle/migrations/meta/_journal.json` (edit)
  - Commit: —
  - Notes: —

- [ ] **Task 4:** Switch BusinessCreateForm to DB-fetched categories + delete VALID_CATEGORIES
  - Files: `apps/web/src/app/admin/businesses/new/page.tsx` (edit), `apps/web/src/features/admin/components/business-create-form.tsx` (edit — was in user's WIP), `packages/validators/src/businesses.ts` (edit), `apps/web/src/features/listings/{types.ts,index.ts,category-meta.ts}` (edit), `packages/db/src/schema/businesses.ts` (edit, doc comment only)
  - Commit: —
  - Notes: —
