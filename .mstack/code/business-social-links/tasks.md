# Implementation: Business Social Links

**Started:** 2026-06-08 
**Review:** [business-social-links](../../reviews/2026-06-08-business-social-links.md)
**Branch:** feat/rest-api-migration
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** DB schema — add social columns
  - Files: `packages/db/src/schema/businesses.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Validator — extend BusinessSchema + add update schemas
  - Files: `packages/validators/src/businesses.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 3:** Services read — update toBusiness mapper + index
  - Files: `packages/services/src/businesses/queries.ts`, `packages/services/src/businesses/index.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 4:** Services write — updateBusiness()
  - Files: `packages/services/src/businesses/service.ts` (new), `packages/services/src/businesses/index.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 5:** Admin operation — updateBusinessOp
  - Files: `apps/web/src/server/operations/businesses-admin.ts` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 6:** Admin PATCH route
  - Files: `apps/web/src/app/api/v1/admin/businesses/[id]/route.ts` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 7:** Social icons component
  - Files: `apps/web/src/features/listings/components/social-icons.tsx` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 8:** BusinessCard — social icon row
  - Files: `apps/web/src/features/listings/components/business-card.tsx`
  - Commit: —
  - Notes: —

- [ ] **Task 9:** BusinessDetail — social links section
  - Files: `apps/web/src/features/listings/components/business-detail.tsx`
  - Commit: —
  - Notes: —

- [ ] **Task 10:** Listings index — re-export SocialLinks
  - Files: `apps/web/src/features/listings/index.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 11:** Admin businesses list page
  - Files: `apps/web/src/app/admin/businesses/page.tsx` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 12:** Admin business edit page + component
  - Files: `apps/web/src/app/admin/businesses/[id]/page.tsx` (new), `apps/web/src/features/admin/components/business-detail.tsx` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 13:** Admin layout nav — Businesses link
  - Files: `apps/web/src/app/admin/layout.tsx`
  - Commit: —
  - Notes: —
