# Implementation: Business Feature Image

**Started:** 2026-06-15 13:00
**Review:** [2026-06-15-feature-image](../../reviews/2026-06-15-feature-image.md)
**Branch:** feat/rest-api-migration
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** Service — setBusinessFeatureImage + clearBusinessFeatureImage
  - Files: `packages/services/src/businesses/service.ts` · `packages/services/src/businesses/index.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Pipeline — processAndStoreFeatureImage
  - Files: `apps/web/src/features/admin/server/business-image-pipeline.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 3:** API route — POST + DELETE /feature-image
  - Files: `apps/web/src/app/api/v1/admin/businesses/[id]/feature-image/route.ts` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 4:** Admin UI — FeatureImageSection component
  - Files: `apps/web/src/features/admin/components/feature-image-section.tsx` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 5:** Wire FeatureImageSection into admin BusinessAdminDetail
  - Files: `apps/web/src/features/admin/components/business-detail.tsx`
  - Commit: —
  - Notes: —

- [ ] **Task 6:** Public detail page — remove avatar circle + simplify wrapper
  - Files: `apps/web/src/features/listings/components/business-detail.tsx`
  - Commit: —
  - Notes: —
