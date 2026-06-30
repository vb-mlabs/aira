# Implementation: Listing Contact Person field

**Started:** 2026-06-22 (complete)
**Review:** [2026-06-22-listing-contact-person](../../reviews/2026-06-22-listing-contact-person.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add `contact_person` column + migration
  - Files: `packages/db/src/schema/businesses.ts` · `packages/db/drizzle/migrations/0031_shiny_anita_blake.sql`
  - Commit: `3c3fb5b`
  - Notes: purely additive migration — `ALTER TABLE businesses ADD COLUMN contact_person text`

- [x] **Task 2:** Register `business.contact_person_changed` audit action
  - Files: `packages/validators/src/audit-meta.ts` · `apps/web/src/features/admin/audit/render-detail.tsx`
  - Commit: `acbc8ac`
  - Notes: 4 coordinated edits — union variant, KNOWN_AUDIT_ACTIONS, label override, render-detail switch

- [x] **Task 3:** Validator schema split + input fields
  - Files: `packages/validators/src/businesses.ts`
  - Commit: `eed3baf`
  - Notes: BusinessAdminSchema extends BusinessSchema; Create/Update inputs add contact_person

- [x] **Task 4:** Query layer — admin row projection
  - Files: `packages/services/src/businesses/queries.ts`
  - Commit: `f5d1354`
  - Notes: toBusinessAdmin mapper + attachRelationsAdmin; widened admin-only query return types

- [x] **Task 5:** Service mutation — `updateBusiness` signature + audit
  - Files: `packages/services/src/businesses/service.ts`
  - Commit: `d069796`
  - Notes: signature now (db, ctx, id, data); audit before mutation; only emits on real diff

- [x] **Task 6:** Op layer — output schemas + pass ctx to updateBusiness
  - Files: `apps/web/src/server/operations/businesses-admin.ts`
  - Commit: `74757a6`
  - Notes: createBusinessAdminOp + updateBusinessOp outputs switched to BusinessAdminSchema; ctx forwarded

- [x] **Task 7:** Add Business modal — input
  - Files: `apps/web/src/features/admin/components/business-create-form.tsx`
  - Commit: `bd4f595`
  - Notes: Contact person Input between Name and Category; trim + null coalesce on submit

- [x] **Task 8:** Core Fields — preview + edit
  - Files: `apps/web/src/features/admin/components/business-detail.tsx`
  - Commit: `b3a9807`
  - Notes: widened props to BusinessAdmin; preview row + edit modal input wired through runUpdate

- [x] **Task 9:** Admin businesses list — Contact person column
  - Files: `apps/web/src/app/admin/businesses/page.tsx`
  - Commit: `75446a0`
  - Notes: column between Owner and Verified; truncate at 150px

- [x] **Task 10:** Verification — leakage check + final type/lint
  - Files: (no source changes)
  - Commit: —
  - Notes: grep of `apps/web/src/features/listings`, `apps/web/src/app/(app)`, `apps/mobile/src` returns 0 matches for contact_person; root `pnpm typecheck` passes 10/10 packages; no new lint errors. Public ops (`listBusinessesOp`, `getBusinessByIdOp`, `countActiveBusinessesOp`) confirmed to use plain BusinessSchema and route through `attachRelations` (not `attachRelationsAdmin`), so the column never reaches a public payload.
