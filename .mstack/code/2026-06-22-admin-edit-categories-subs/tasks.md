# Implementation: Admin Edit categories — subcategory selection

**Started:** 2026-06-22 (complete)
**Review:** [2026-06-22-admin-edit-categories-subs](../../reviews/2026-06-22-admin-edit-categories-subs.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Page swaps to tree op + filtered tree pass-down
  - Files: `apps/web/src/app/admin/businesses/[id]/page.tsx` · `apps/web/src/features/admin/components/business-detail.tsx` (optional prop addition only)
  - Commit: `efe07d8`
  - Notes: page derives `categories` (unfiltered flat, for CategoryPreview lookups) + `categoryTree` (active-filtered, branch-level). Component-side picks up `categoryTree?` as optional prop so typecheck stays green mid-pipeline.

- [x] **Task 2:** CategoryEditModal renders tree + indented subs
  - Files: `apps/web/src/features/admin/components/business-detail.tsx`
  - Commit: `291c5c1`
  - Notes: threaded categoryTree through BusinessAdminDetail → CoreFieldsSection → CategoryEditModal; tightened the prop to required; Primary <select> emits root + <optgroup> per branch; Additional grid renders root rows + indented `↳ ` child rows.
