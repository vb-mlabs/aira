# Implementation Report: City scoping + Category tree + Homepage CMS

**Status:** complete  
**Date:** 2026-06-09  
**Branch:** feat/rest-api-migration  
**Review:** [2026-06-09-city-category-cms](../../reviews/2026-06-09-city-category-cms.md)

---

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| T1 | DB schema — city + category + app_setting tables + migration | ✓ done | 8220846 |
| T2 | Validators — schemas + BusinessCategorySchema widening | ✓ done | a288815 |
| T3 | Services — extend categories + new cities/app_settings | ✓ done | 4d1ea0a |
| T4 | Ops — categories/cities-admin/app-settings-admin | ✓ done | 07c035c |
| T5 | API routes — admin endpoints + public categories | ✓ done | 8ba8cec |
| T6 | Install @dnd-kit deps | ✓ done | b7c5bd0 |
| T7 | Admin categories UI — CategoryTreeManager + CategoryForm | ✓ done | 4386a71 |
| T8 | Admin cities UI + homepage CMS form | ✓ done | 1cfb127 |
| T9 | Admin sidebar nav + business CategorySection | ✓ done | 23e892a |
| T10 | Public surfaces — sidebar/categories/listing from DB | ✓ done | 2fa63ed |
| T11 | Homepage /home reads AppSetting | ✓ done | 0959bb0 |
| T12 | Typecheck + lint pass | ✓ done | 910ed1c |

---

## Commits

1. `8220846` feat(db): city + category + app_setting tables + migration 0016
2. `a288815` feat(validators): city/category/app_setting schemas + BusinessCategorySchema widening
3. `4d1ea0a` feat(services): extend categories + new cities/app_settings + fix isValidCategory
4. `07c035c` feat(ops): extend categories + new categories-admin/cities-admin/app-settings-admin ops
5. `8ba8cec` feat(api): admin categories/cities/app-settings routes + public categories tree
6. `b7c5bd0` chore(deps): install @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities
7. `4386a71` feat(admin): CategoryTreeManager + CategoryForm + categories pages
8. `1cfb127` feat(admin): CityForm + HomepageCmsForm + cities/settings pages
9. `23e892a` feat(admin): sidebar nav + business CategorySection + category update support
10. `2fa63ed` feat(public): sidebar + categories + listing page switch to DB categories
11. `0959bb0` feat(home): homepage reads AppSetting for about text + stat counts
12. `910ed1c` chore(lint): fix pre-existing lint errors for clean S2 baseline

---

## Non-obvious discoveries

- **AppSidebar is `"use client"`** — cannot fetch in the component itself. Layout RSC must fetch `listCategoriesOp` and pass `categories` as a prop through `MobileSidebar` too.
- **`apiClient.post<T>()` returns `T` directly**, not `{ data: T }`. The deactivate op response (`{ affected_businesses }`) must be destructured from the result, not `result.data`.
- **`Button` component lacks `asChild` prop** — the ui-web Button does not support Radix Slot composition. Admin pages that need a link styled as a button must use a `<Link>` with raw button classes.
- **Pre-existing lint errors** — 8 errors existed before S2 in files this sprint never touched (`next.config.mjs`, both mobile sidebars, `business-cta-pair.tsx`). Cleaned in T12 to give S2 a clean baseline.
- **`no-restricted-syntax` fires twice per `process.env` reference** — because the ESLint config registers two selector patterns. One `eslint-disable-next-line` disables both for the line.

---

## Follow-ups

- **Mobile app API bindings** — `@aira/api` client now needs `listCategoriesOp`, `getCategoryBySlugOp`, and `getAppSettingsPublicOp` wired into the Expo app's category browsing flows.
- **Drag-reorder accessibility** — `CategoryTreeManager` uses `PointerSensor` only; keyboard reorder (DndKit `KeyboardSensor`) not wired. Low priority for admin panel MVP.
- **City picker** — `CITY_ID = "city-atlanta"` is hardcoded in categories ops. When multi-city support is needed, a city selector and per-user city preference will be required.
- **Category deactivation cascade** — the `deactivateCategoryOp` returns `affected_businesses` and warns the admin, but does not update those businesses' category fields. Affected businesses will 404 on `/listings/[deactivated-slug]` until manually re-categorised.

---

## Recommended next step

Run `/mlabs-qa` with focus on:
1. Admin categories — create / edit / reorder / deactivate flows
2. Admin cities — create / edit
3. Homepage CMS — update about text, stat overrides, live preview
4. Public sidebar renders DB categories; fallback when empty
5. `/listings/[category]` resolves via DB; unknown slug → 404
