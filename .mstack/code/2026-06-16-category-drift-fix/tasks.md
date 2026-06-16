# Implementation: category source-of-truth fix

**Started:** 2026-06-16
**Completed:** 2026-06-16
**Review:** [2026-06-16-category-drift-fix](../../reviews/2026-06-16-category-drift-fix.md)
**Branch:** feat/admin-businesses-renewal-urgency-pill
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Defensive getCategoryMeta(slug) fallback + sweep 9 consumers
  - Files: `apps/web/src/features/listings/category-meta.ts` (edit), `apps/web/src/features/listings/index.ts` (edit), + 9 consumer files
  - Commit: `a647300`
  - Notes: helper is identity for the 7 seeded slugs; unknown slugs get a Tag-icon + slug-as-name fallback. Two unused `Store` icon imports cleaned up incidentally.

- [x] **Task 2:** Slug-rename guard in updateCategoryOp + Vitest
  - Files: `apps/web/src/server/operations/categories-admin.ts` (edit), `apps/web/tests/categories-rename-guard.test.ts` (new)
  - Commit: `136df87`
  - Notes: extracted `assertSlugRenameAllowed` helper for unit-testability. 7 Vitest cases all pass.

- [x] **Task 3:** Drizzle migration 0027 — data cleanup
  - Files: `packages/db/drizzle/migrations/0027_category_drift_cleanup.sql` (new), `_journal.json` (edit), `0027_snapshot.json` (new)
  - Commit: `5016c0c` + snapshot chain fix `4c63f22`
  - Notes: PAUSED at first apply — the FK pre-check correctly raised because 7 stale sponsorship rows referenced `qa-deactivate-1781028692142`. User authorised deletion; migration extended with a step-2 DELETE and re-applied cleanly. All 4 post-conditions verified clean.

- [x] **Task 4:** Switch BusinessCreateForm to DB-fetched categories + delete VALID_CATEGORIES
  - Files: `apps/web/src/app/admin/businesses/new/page.tsx` (edit), `apps/web/src/features/admin/components/business-create-form.tsx` (edit), `packages/validators/src/businesses.ts` (edit), `apps/web/src/features/listings/{types.ts,index.ts}` (edit)
  - Commit: `5990b00`
  - Notes: schema doc-comment update on `packages/db/src/schema/businesses.ts` deferred — the migration-check lefthook flags any schema-file edit, and `db:generate` can't be re-run due to a pre-existing 0025/0026 snapshot collision. The doc-comment fix is a follow-up once the snapshot chain is repaired upstream.
