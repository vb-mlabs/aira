# Implementation: Admin — Create Business

**Started:** 2026-06-10 14:00
**Review:** [2026-06-10-admin-create-business](../../reviews/2026-06-10-admin-create-business.md)
**Branch:** feat/rest-api-migration
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** DB schema — add city_id, business_type, years_operating
  - Files: `packages/db/src/schema/businesses.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Validators — BusinessCreateInputSchema + schema updates
  - Files: `packages/validators/src/businesses.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 3:** Service — toBusiness mapper + createBusiness + updateBusiness
  - Files: `packages/services/src/businesses/queries.ts` · `packages/services/src/businesses/service.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 4:** Op — createBusinessAdminOp
  - Files: `apps/web/src/server/operations/businesses-admin.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 5:** Route — POST /api/v1/admin/businesses
  - Files: `apps/web/src/app/api/v1/admin/businesses/route.ts` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 6:** Component — BusinessCreateForm
  - Files: `apps/web/src/features/admin/components/business-create-form.tsx` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 7:** Page — /admin/businesses/new
  - Files: `apps/web/src/app/admin/businesses/new/page.tsx` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 8:** List page — Add business button
  - Files: `apps/web/src/app/admin/businesses/page.tsx`
  - Commit: —
  - Notes: —
