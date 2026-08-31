# Implementation: sidebar-categories (inactive-leak + rename-stale-404)

**Started:** 2026-08-31 13:34
**Debug doc:** [../../debug/2026-08-31-1324-sidebar-categories/report.md](../../debug/2026-08-31-1324-sidebar-categories/report.md)
**Branch:** fix/mobile-notifications-re-trigger-banner
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Default `getCategoryTree` to active-only + filter children
  - Files: `packages/services/src/categories/queries.ts`
  - Commit: `17940cb`
  - Notes: Added optional `{ includeInactive?: boolean } = {}` (default `false`). Kept a JS-level `filter(c => c.active)` alongside the DB-level filter so the invariant survives future query-shape changes.

- [x] **Task 2:** Invalidate the `(app)` layout after category admin mutations
  - Files: `apps/web/src/server/operations/categories-admin.ts`
  - Commit: `5ac13d0`
  - Notes: New `invalidateSidebar()` helper calls `revalidatePath("/", "layout")`. Wired into `createCategoryOp`, `updateCategoryOp`, `deactivateCategoryOp`, `reorderCategoriesOp`.
