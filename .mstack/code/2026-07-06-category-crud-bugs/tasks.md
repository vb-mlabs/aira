# Implementation: Category CRUD bugs (group B)

**Started:** 2026-07-06
**Review:** [2026-07-06-category-crud-bugs](../../reviews/2026-07-06-category-crud-bugs.md)
**Branch:** feat/featured-business-selection
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Register business.category_slug_cascaded audit kind
  - Files: `packages/validators/src/audit-meta.ts`, `apps/web/src/features/admin/audit/render-detail.tsx`
  - Commit: `6f1bcaf`

- [x] **Task 2:** Rename cascade + delete guard + swap tests
  - Files: `packages/services/src/categories/queries.ts`, `packages/services/src/categories/index.ts`, `apps/web/src/server/operations/categories-admin.ts`, delete `apps/web/tests/categories-rename-guard.test.ts`, new `apps/web/tests/categories-rename-cascade.test.ts`
  - Commit: `7af2ae6`

- [-] **Task 3:** Seed starter subcategories migration
  - Skipped per user decision: "affordance only". No SQL migration written; admins create subs via the Add-subcategory affordance from the business admin.

- [x] **Task 4:** Sub-only enforcement in businesses service
  - Files: `packages/services/src/businesses/queries.ts` (new `assertCategoryIsSubcategory` + `createBusiness` gate), `packages/services/src/businesses/service.ts` (`updateBusiness` gate)
  - Commit: `0b86965`

- [x] **Task 5:** UI filter primary picker + affordance
  - Files: `apps/web/src/app/admin/businesses/new/page.tsx`, `apps/web/src/features/admin/components/business-create-form.tsx`, `apps/web/src/features/admin/components/business-detail.tsx`
  - Commit: `2d4fe79`

- [x] **Task 6:** ?parent=<rootId> prefill on new-category form
  - Files: `apps/web/src/app/admin/settings/categories/new/page.tsx`, `apps/web/src/features/admin/components/category-form.tsx`
  - Commit: `3cefaf4`

- [x] **Polish:** Pass `?parent=<rootId>` from the modal affordance
  - Files: `apps/web/src/features/admin/components/business-detail.tsx`
  - Commit: `928f402`
  - Notes: closes the loop between Task 5 (affordance link) and Task 6 (parent prefill receiver) — modal now labels the link "Add a new subcategory under <Root> →" when a sub is selected.
