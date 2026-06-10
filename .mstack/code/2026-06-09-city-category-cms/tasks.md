# Implementation: City scoping + Category tree + Homepage CMS

**Started:** 2026-06-09 23:00
**Review:** [2026-06-09-city-category-cms](../../reviews/2026-06-09-city-category-cms.md)
**Branch:** feat/rest-api-migration
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** DB schema — city + category + app_setting tables + migration 0016
  - Files: packages/db/src/schema/cities.ts (new) · categories.ts (new) · app_settings.ts (new) · index.ts (edit) · migration 0016
  - Commit: 8220846
  - Notes: Self-referencing FK for 2-level tree; composite unique index (city_id, slug); seeded Atlanta + 7 root categories + 4 app_settings in migration

- [x] **Task 2:** Validators — city/category/app_setting schemas + BusinessCategorySchema widening
  - Files: packages/validators/src/cities.ts (new) · categories.ts (new) · app_settings.ts (new) · businesses.ts (edit)
  - Commit: a288815
  - Notes: BusinessCategorySchema widened from z.enum(VALID_CATEGORIES) to z.string().min(1); added subpath exports to validators/package.json

- [x] **Task 3:** Services — extend categories + new cities + app_settings services
  - Files: packages/services/src/categories/ (edit) · cities/ (new) · app_settings/ (new) · businesses/queries.ts (edit) · index.ts (edit)
  - Commit: 4d1ea0a
  - Notes: Removed isValidCategory guard from businesses queries; added countActiveBusinesses

- [x] **Task 4:** Ops — extend categories.ts + new categories-admin + cities-admin + app-settings-admin
  - Files: server/operations/categories.ts (edit) · categories-admin.ts (new) · cities-admin.ts (new) · app-settings-admin.ts (new)
  - Commit: 07c035c
  - Notes: CITY_ID = "city-atlanta" constant; deactivate op returns affected_businesses count

- [x] **Task 5:** API routes — admin categories, cities, app-settings + public categories update
  - Files: api/v1/categories/route.ts (edit) · admin/categories/* (new) · admin/cities/* (new) · admin/app-settings/route.ts (new)
  - Commit: 8ba8cec
  - Notes: categories/route.ts branches on ?tree=1 query param

- [x] **Task 6:** Install @dnd-kit/core + @dnd-kit/sortable
  - Files: apps/web/package.json (edit)
  - Commit: b7c5bd0
  - Notes: —

- [x] **Task 7:** Admin categories UI — CategoryTreeManager + CategoryForm + pages
  - Files: features/admin/components/category-tree-manager.tsx (new) · category-form.tsx (new) · admin/categories/* pages (new)
  - Commit: 4386a71
  - Notes: apiClient.post<T>() returns T directly (not {data:T}); Button component lacks asChild — styled Link used instead

- [x] **Task 8:** Admin cities UI + admin settings/homepage page
  - Files: features/admin/components/city-form.tsx (new) · homepage-cms-form.tsx (new) · admin/cities/* + admin/settings/homepage (new)
  - Commit: 1cfb127
  - Notes: —

- [x] **Task 9:** Admin sidebar nav update + business CategorySection
  - Files: admin-sidebar.tsx (edit) · business-detail.tsx (edit) · admin/businesses/[id]/page.tsx (edit)
  - Commit: 23e892a
  - Notes: —

- [x] **Task 10:** Public surfaces — sidebar, categories page, listing page switch to DB
  - Files: (app)/layout.tsx (edit) · app-sidebar.tsx (edit) · categories/page.tsx (edit) · listings/[category]/page.tsx (edit)
  - Commit: 2fa63ed
  - Notes: AppSidebar is "use client" — layout RSC fetches categories + passes as prop; fallback to CATEGORIES_ORDERED when empty

- [x] **Task 11:** Homepage /home reads AppSetting
  - Files: (app)/home/page.tsx (edit) · server/operations/app-settings.ts (new public op)
  - Commit: 0959bb0
  - Notes: —

- [x] **Task 12:** Typecheck + lint pass
  - Files: next.config.mjs · mobile-sidebar.tsx · admin-mobile-sidebar.tsx · business-cta-pair.tsx
  - Commit: 910ed1c
  - Notes: All 8 errors were pre-existing (not introduced by S2). Fixed: process.env eslint-disable in next.config.mjs, eslint-disable for setMounted hydration pattern in both mobile sidebars, &apos; escaping in business-cta-pair.tsx
