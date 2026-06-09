# Review: City scoping + Category tree + Homepage CMS (S2: F4, F6, F24)

**Date:** 2026-06-09
**Slug:** 2026-06-09-city-category-cms
**Plan reviewed:** [2026-06-09-city-category-cms.md](../plans/2026-06-09-city-category-cms.md)
**Status:** implemented
**UI-Significant:** yes
**Reviewer:** /mlabs-review

---

## Summary

Plan is approved with four corrections and four open-question resolutions. The
core data model (city, category, app_setting), the service approach, and the
@dnd-kit sortable choice are all sound. Key corrections: (1) `categories.ts`
operations file and `packages/services/src/categories/` service already exist —
extend them; (2) the admin business edit form is `business-detail.tsx` with
inline sections, not `business-edit-form.tsx` — add a `CategorySection` there;
(3) `AppSidebar` is a client component so the `(app)/layout.tsx` RSC must fetch
active categories and pass them as a prop; (4) `isValidCategory` guards in
`businesses/queries.ts` must be removed after `BusinessCategorySchema` widens to
`z.string()` — new DB slugs would otherwise be silently rejected. All four open
questions from the plan are resolved below.

---

## Findings

### Blockers (fixed in this review)

- **`categories.ts` ops file and `services/categories/` already exist.** The
  categories page already calls `listCategoriesWithCountsOp` from an existing
  `apps/web/src/server/operations/categories.ts`. The service already has
  `getBusinessCountsByCategory` in `packages/services/src/categories/queries.ts`.
  These must be extended, not created from scratch.
  **Fix:** Tasks 3 and 4 use "edit" for these files.

- **`business-edit-form.tsx` does not exist.** The real component is
  `apps/web/src/features/admin/components/business-detail.tsx`, which has inline
  section components (`CoreFieldsSection`, `ContactSection`, etc.). There is no
  category editing section today.
  **Fix:** Task 10 adds a `CategorySection` to `business-detail.tsx`, and
  `admin/businesses/[id]/page.tsx` passes the categories list as a prop.

- **`AppSidebar` is `"use client"` and cannot fetch.** The `(app)/layout.tsx`
  does not fetch anything today; it's a pure composition RSC. `AppSidebar` reads
  `CATEGORIES_ORDERED` (static const). To make it DB-driven, the layout must
  fetch active root categories and pass them as a `categories` prop to
  `AppSidebar`. Fallback: if the fetch fails, fall back to `CATEGORIES_ORDERED`.
  **Fix:** Task 11 updates layout + AppSidebar prop signature.

- **`isValidCategory` guards in `businesses/queries.ts` will reject new slugs.**
  `getBusinessesByCategory` and `getBusinessesByCategoryPaged` both call
  `isValidCategory(category)` and return `[]` / `{ items: [], total: 0 }` for
  unknown slugs. After `BusinessCategorySchema` widens to `z.string()`, any
  admin-created category (e.g. "grocery-stores") would silently return no
  results. The `toBusiness()` fallback `category: isValidCategory(row.category)
  ? row.category : "shopping"` is also wrong — it would reclassify rows.
  **Fix:** Task 3 removes the `isValidCategory` guard from these queries and
  changes `toBusiness()` to `category: row.category` (no fallback needed; DB
  is now the authority).

### Concerns (raised, decided, recorded)

- **Concern:** New admin-created categories have no icon in `CATEGORY_META`.
  `AppSidebar` and `CategoryRow` look up `cat.icon` from the static map.
  **Decision:** Keep `CATEGORY_META` as slug→icon map for the existing 7.
  Any slug not in the map gets a default `Store` icon from lucide-react.
  No new schema column needed.

- **Concern:** `@dnd-kit/sortable` requires `@dnd-kit/core` as a peer dep.
  Both must be added to `apps/web/package.json`.
  **Decision:** Approved. Both go into `apps/web` — used only on
  `/admin/categories`. Zero impact on end-user bundle (Next.js code-splits
  the admin route).

- **Concern:** `listCategoriesWithCountsOp` in the existing `categories.ts`
  ops file returns `{ counts: Record<BusinessCategory, number> }`. After
  widening `BusinessCategorySchema` to `z.string()`, the `BusinessCategory`
  type is no longer an enum — the type of the counts object needs to
  change to `Record<string, number>`.
  **Decision:** Update `CategoriesCountsOutputSchema` to use
  `z.record(z.string(), z.number())` and the categories page to accept the
  wider type. Fold into Task 2.

- **Concern:** `getCategoryBySlugOp` needs to work for public listing-page
  validation AND still return 404 for inactive categories. But
  `listCategoriesWithCountsOp` only touches the businesses table (counts by
  text slug). After migration, a category slug that exists in the DB but
  is inactive should 404 on `/listings/[slug]`.
  **Decision:** `getCategoryBySlugOp` checks `active = true`; inactive → `null`
  → listing page calls `notFound()`. The existing `isValidCategory` check in
  the listing page is removed and replaced with a DB lookup.

---

## Decisions locked

1. **Layout passes categories as prop.** `(app)/layout.tsx` fetches active root
   categories via `apiServerFetch(listCategoriesOp, ...)` and passes the result
   to `<AppSidebar categories={categories} />`. `AppSidebar` accepts
   `categories?: Category[]` prop; falls back to `CATEGORIES_ORDERED` if
   undefined/empty (graceful degradation if fetch fails).

2. **`Store` as default icon.** `AppSidebar` and `CategoryRow` import `Store`
   from lucide-react and use it for any slug not present in `CATEGORY_META`.

3. **Category dropdown in admin business form scoped to Atlanta** (`city_id =
   'city-atlanta'` hardcoded). Multi-city dropdown deferred to when a second
   city is activated. Uses `getRootCategoriesForCity` service.

4. **DnD stays within-sibling sort.** Subcategories can be reordered among
   other subcategories of the same parent. Reparenting (moving sub to a
   different root) is done via the edit form only. Two separate
   `SortableContext` blocks — one for roots, one per subcategory group.

5. **Slug auto-generated from name.** Category create form auto-fills the slug
   field using a `slugify(name)` transform as the user types the name. Admin
   can override. Slug field is shown and editable.

6. **`app_setting` edits do NOT write an audit_log entry** in this sprint.
   App settings are low-sensitivity (display copy, stat overrides). Defer
   audit to a future sprint if the client asks for it.

7. **`BusinessCategorySchema` widens to `z.string().min(1)`.** `VALID_CATEGORIES`
   const is kept exported from `packages/validators/src/businesses.ts` for
   seeding and existing tests. `BusinessCategory` type becomes `string`.

8. **No `category_id` FK on businesses this sprint.** `businesses.category`
   remains a text column matching category slugs. Application-layer validation
   (admin form dropdown) ensures only DB slugs are selected. The FK migration
   is a dedicated follow-up.

---

## Implementation plan

### Task 1: DB schema — city, category, app_setting tables + migration 0016

- **Files:**
  `packages/db/src/schema/cities.ts` (new) ·
  `packages/db/src/schema/categories.ts` (new) ·
  `packages/db/src/schema/app_settings.ts` (new) ·
  `packages/db/src/schema/index.ts` (edit) ·
  `packages/db/drizzle/migrations/0016_*.sql` (generated)
- **What:** Create Drizzle table definitions. `city`: id, name, slug (unique),
  active, sort_order, timestamps. `category`: id, city_id FK, parent_id
  self-FK nullable, name, slug, level (1|2) with CHECK constraints, sort_order,
  active, timestamps; composite unique `(city_id, slug)`. `app_setting`: id, key
  (unique), value, updated_at. Add partial index `category_city_level_sort_idx`
  on `(city_id, level, sort_order)`. Run `pnpm db:generate`. Manually append
  seed INSERTs to the generated migration (before it ships):
  - 1 city row: `('city-atlanta', 'Atlanta', 'atlanta', true, 0, now(), now())`
  - 7 category rows under city-atlanta with slugs matching `VALID_CATEGORIES`
  - 4 app_setting rows: homepage_about_title, homepage_about_body,
    homepage_stat_businesses (`"auto"`), homepage_stat_users (`"auto"`)
  Update `packages/db/src/schema/index.ts` to re-export all three new schemas.
- **Acceptance:** `pnpm db:generate` + `pnpm db:migrate` apply cleanly. Tables
  exist with correct columns. `SELECT * FROM city` returns Atlanta.
  `SELECT * FROM category` returns 7 rows. `SELECT * FROM app_setting` returns
  4 rows.
- **Pause if:** Migration conflicts with an existing 0016 file.

---

### Task 2: Validators — city, category, app_setting schemas + BusinessCategorySchema widening

- **Files:**
  `packages/validators/src/cities.ts` (new) ·
  `packages/validators/src/categories.ts` (new) ·
  `packages/validators/src/app_settings.ts` (new) ·
  `packages/validators/src/businesses.ts` (edit) ·
  `packages/validators/src/index.ts` (edit, if it re-exports)
- **What:**
  - `CitySchema`: id, name, slug, active, sort_order, created_at, updated_at.
    `CityCreateInputSchema`: name + optional slug (auto-generated if omitted),
    active (default true). `CityUpdateInputSchema`: same optional fields + id.
  - `CategorySchema`: id, city_id, parent_id nullable, name, slug, level (1|2),
    sort_order, active, timestamps.
    `CategoryCreateInputSchema`: city_id, name, slug (optional, auto-generated),
    parent_id optional (null = root), active (default true).
    `CategoryUpdateInputSchema`: id + optional name/slug/parent_id/active/sort_order.
    `CategoryReorderInputSchema`: `{ city_id: string; ordered_ids: string[] }`.
    `CategoryTreeOutputSchema`: `z.array(z.object({ root: CategorySchema, children: z.array(CategorySchema) }))`.
  - `AppSettingSchema`: id, key, value, updated_at.
    `AppSettingUpdateInputSchema`: `{ key: z.string(); value: z.string() }`.
    `AppSettingsOutputSchema`: `z.object({ settings: z.array(AppSettingSchema) })`.
  - In `businesses.ts`: change `BusinessCategorySchema = z.string().min(1)`.
    Keep `VALID_CATEGORIES` as `as const` export. `BusinessCategory` type
    becomes `string`. Update `CategoriesCountsOutputSchema` in any validators
    file that defines it: `counts: z.record(z.string(), z.number())`.
- **Acceptance:** `pnpm typecheck` clean. `BusinessCategorySchema.parse("grocery-stores")`
  passes. `BusinessCategorySchema.parse("")` throws.

---

### Task 3: Services — extend categories service + new cities + app_settings services

- **Files:**
  `packages/services/src/categories/queries.ts` (edit) ·
  `packages/services/src/categories/index.ts` (edit) ·
  `packages/services/src/cities/queries.ts` (new) ·
  `packages/services/src/cities/service.ts` (new) ·
  `packages/services/src/cities/index.ts` (new) ·
  `packages/services/src/app_settings/queries.ts` (new) ·
  `packages/services/src/app_settings/service.ts` (new) ·
  `packages/services/src/app_settings/index.ts` (new) ·
  `packages/services/src/index.ts` (edit) ·
  `packages/services/src/businesses/queries.ts` (edit)
- **What:**
  **categories service (extend):** Add to `queries.ts`:
  - `getCategoriesByCity(db, cityId, { includeInactive? })` — ordered by
    `(level, sort_order, name)`
  - `getCategoryTree(db, cityId)` — same list assembled in JS into
    `{ root, children[] }[]` (not SQL join)
  - `getCategoryBySlug(db, slug)` — returns category or null; checks
    `active = true`
  - `getRootCategoriesForCity(db, cityId)` — `level = 1 AND active = true`
  - `createCategory(db, input)` — INSERT; auto-slugify if slug omitted
  - `updateCategory(db, id, data)` — PATCH
  - `deactivateCategory(db, id)` — SET active = false
  - `reorderCategories(db, cityId, orderedIds)` — bulk UPDATE sort_order
    in a DB transaction
  Export all from `index.ts`.

  **cities service (new):** `listCities(db)`, `getCityBySlug(db, slug)`,
  `createCity(db, input)`, `updateCity(db, id, data)`. Follow same pattern as
  businesses service.

  **app_settings service (new):** `getAppSettings(db)` (all rows),
  `getAppSetting(db, key)`, `updateAppSetting(db, key, value)`.

  **businesses/queries.ts (edit):** Remove the `isValidCategory(category)` guard
  from `getBusinessesByCategory` and `getBusinessesByCategoryPaged` (return real
  DB results for any text slug). Change `toBusiness()` to `category: row.category`
  with no fallback. Remove `VALID_CATEGORIES` import from this file (service layer
  no longer needs the const).

  Update `packages/services/src/index.ts` to add:
  `export * as cities from "./cities"` and
  `export * as appSettings from "./app_settings"`.
- **Acceptance:** `pnpm typecheck` clean. `getBusinessesByCategory` called with
  `"grocery-stores"` returns `[]` (no rows, but no error). `toBusiness()` no
  longer falls back to "shopping".

---

### Task 4: Ops — extend categories.ts + new categories-admin, cities-admin, app-settings-admin

- **Files:**
  `apps/web/src/server/operations/categories.ts` (edit) ·
  `apps/web/src/server/operations/categories-admin.ts` (new) ·
  `apps/web/src/server/operations/cities-admin.ts` (new) ·
  `apps/web/src/server/operations/app-settings-admin.ts` (new)
- **What:**
  **categories.ts (extend):** Add two ops alongside the existing
  `listCategoriesWithCountsOp`:
  - `listCategoriesOp` — `permission: "user"`, returns active root categories
    flat list (for AppSidebar)
  - `listCategoriesTreeOp` — `permission: "user"`, returns tree
    `{ root, children[] }[]` for admin tree manager
  - `getCategoryBySlugOp` — `permission: "user"`, returns category or null

  **categories-admin.ts (new):**
  - `listCategoriesAdminOp` — `permission: "admin"`, `{ includeInactive? }`
  - `createCategoryOp` — `permission: "admin"`
  - `updateCategoryOp` — `permission: "admin"`
  - `deactivateCategoryOp` — `permission: "admin"`, returns category with
    `affected_businesses: number` in output for the confirmation dialog
  - `reorderCategoriesOp` — `permission: "admin"`

  **cities-admin.ts (new):**
  - `listCitiesAdminOp`, `createCityOp`, `updateCityOp` — all
    `permission: "admin"`

  **app-settings-admin.ts (new):**
  - `getAppSettingsOp` — `permission: "admin"`, returns all settings
  - `updateAppSettingOp` — `permission: "admin"`, `{ key, value }`
- **Acceptance:** `pnpm typecheck` clean. Ops follow the `defineOperation`
  pattern from `./index`. Correct permission levels.

---

### Task 5: API routes — admin categories, cities, app-settings + public categories update

- **Files:**
  `apps/web/src/app/api/v1/categories/route.ts` (edit — add tree endpoint) ·
  `apps/web/src/app/api/v1/admin/categories/route.ts` (new) ·
  `apps/web/src/app/api/v1/admin/categories/[id]/route.ts` (new) ·
  `apps/web/src/app/api/v1/admin/categories/[id]/deactivate/route.ts` (new) ·
  `apps/web/src/app/api/v1/admin/categories/reorder/route.ts` (new) ·
  `apps/web/src/app/api/v1/admin/cities/route.ts` (new) ·
  `apps/web/src/app/api/v1/admin/cities/[id]/route.ts` (new) ·
  `apps/web/src/app/api/v1/admin/app-settings/route.ts` (new)
- **What:** All routes follow the `export const GET/POST/PATCH = op.runFromRequest`
  pattern from existing routes. Public `GET /api/v1/categories` gains a second
  export `POST` is not needed — only `GET`. Admin routes: list (GET) + create
  (POST) on collection; update (PATCH) on `[id]`; deactivate (POST) and reorder
  (POST) as action sub-routes.
- **Acceptance:** `curl /api/v1/categories` returns active categories. Admin
  routes return 403 when called without auth. Correct HTTP status codes (201 on
  create, 200 on update).

---

### Task 6: Install @dnd-kit packages

- **Files:** `apps/web/package.json` (edit) · `pnpm-lock.yaml` (auto-updated)
- **What:** `pnpm add @dnd-kit/core @dnd-kit/sortable --filter @aira/web`. Verify
  both appear in `apps/web/package.json` dependencies.
- **Acceptance:** `pnpm install` clean. `import { DndContext } from "@dnd-kit/core"`
  resolves in `apps/web`. `pnpm typecheck` clean.

---

### Task 7: Admin categories UI — CategoryTreeManager + CategoryForm + pages

- **Files:**
  `apps/web/src/features/admin/components/category-tree-manager.tsx` (new) ·
  `apps/web/src/features/admin/components/category-form.tsx` (new) ·
  `apps/web/src/app/admin/categories/page.tsx` (new) ·
  `apps/web/src/app/admin/categories/new/page.tsx` (new) ·
  `apps/web/src/app/admin/categories/[id]/page.tsx` (new)
- **What:**
  `CategoryTreeManager` is a `"use client"` component receiving the tree as a
  prop. Uses `@dnd-kit/core` `DndContext` + `@dnd-kit/sortable` `SortableContext`.
  Two sortable contexts: one for root categories, one per subcategory group (keyed
  by parent id). Each row has a drag handle (grip icon), the category name, an
  active/inactive badge, and an edit link. On `onDragEnd`, fires `PATCH
  /api/v1/admin/categories/reorder` with the new ordered_ids array. Optimistic UI
  (reorder locally, then sync).

  `CategoryForm` is a client component for both create and edit. Fields:
  - Name (required) — onChange auto-fills slug field via `slugify(name)`
  - Slug (shown, editable, required)
  - Parent category (dropdown of root categories from Atlanta, or "None = root
    category")
  - Active toggle (default true)
  On submit: POST to create, PATCH to update.

  Admin pages are RSC + client component islands following the existing
  admin detail page pattern.

  `deactivate` triggers a confirmation AlertDialog (same pattern as
  `ArchiveControl`) showing the `affected_businesses` count from
  `deactivateCategoryOp` response.
- **Acceptance:** `/admin/categories` renders the tree. Drag a root category and
  release — refresh shows new order. Create "Grocery Stores" — appears in tree.
  Create subcategory "South Indian" under "Restaurants" — appears indented. Edit
  form pre-fills existing values. Deactivating shows the affected-businesses
  count.
- **Pause if:** `@dnd-kit/sortable` API has changed from the version installed —
  check docs for `useSortable` and `SortableContext` signatures.

---

### Task 8: Admin cities UI + admin settings/homepage page

- **Files:**
  `apps/web/src/features/admin/components/city-form.tsx` (new) ·
  `apps/web/src/features/admin/components/homepage-cms-form.tsx` (new) ·
  `apps/web/src/app/admin/cities/page.tsx` (new) ·
  `apps/web/src/app/admin/cities/new/page.tsx` (new) ·
  `apps/web/src/app/admin/cities/[id]/page.tsx` (new) ·
  `apps/web/src/app/admin/settings/homepage/page.tsx` (new)
- **What:**
  `CityForm`: name (required), slug (auto-generated, editable), active toggle.
  Cities list at `/admin/cities`: table with Name, Slug, Active chip, Edit link.
  `HomepageCmsForm`: four inputs mapping to app_setting keys:
  `homepage_about_title` (text input), `homepage_about_body` (textarea),
  `homepage_stat_businesses` ("auto" or integer override — label "Active
  businesses count (leave blank for live count)"), `homepage_stat_users`
  (same pattern). Save fires `PATCH /api/v1/admin/app-settings` once per
  changed key. Each key save is independent — partial saves are OK.
- **Acceptance:** `/admin/cities` lists Atlanta. Create "Birmingham" → appears
  in list. Edit Atlanta name → saves. `/admin/settings/homepage` renders all 4
  fields. Change About title → save → reload `/home` → new title visible.

---

### Task 9: Admin sidebar nav update + business CategorySection

- **Files:**
  `apps/web/src/app/admin/_components/admin-sidebar.tsx` (edit) ·
  `apps/web/src/features/admin/components/business-detail.tsx` (edit) ·
  `apps/web/src/app/admin/businesses/[id]/page.tsx` (edit)
- **What:**
  Admin sidebar: add to `ADMIN_NAV` array (after Businesses, before Users):
  - `{ href: "/admin/categories", label: "Categories", icon: Tag }` (Tag from lucide)
  - `{ href: "/admin/cities", label: "Cities", icon: MapPin }` (MapPin from lucide)
  - `{ href: "/admin/settings", label: "Settings", icon: Settings2 }` (Settings2 from lucide)

  `business-detail.tsx`: add a `CategorySection` (same pattern as other sections —
  card with header, client component with `useState` + save button). The select
  shows root categories fetched from DB via prop. The section saves via
  `PATCH /api/v1/admin/businesses/[id]` with `{ id, category: slug }`.

  `admin/businesses/[id]/page.tsx` (RSC): fetch active root categories via
  `apiServerFetch(listCategoriesOp, { input: { cityId: "city-atlanta" } })` and
  pass as `categories` prop to `<BusinessAdminDetail>`. Add `categories` prop to
  `BusinessAdminDetailProps`.
- **Acceptance:** Admin sidebar shows Categories, Cities, Settings links.
  `/admin/businesses/{id}` shows a Category section with a dropdown of active DB
  categories. Changing category and saving persists the new slug. Admin can
  change Spice Garden from "restaurants" to a new "grocery-stores" category if
  one exists.

---

### Task 10: Public surfaces — sidebar, categories page, listing page switch to DB

- **Files:**
  `apps/web/src/app/(app)/layout.tsx` (edit) ·
  `apps/web/src/app/(app)/_components/app-sidebar.tsx` (edit) ·
  `apps/web/src/app/(app)/categories/page.tsx` (edit) ·
  `apps/web/src/app/(app)/listings/[category]/page.tsx` (edit)
- **What:**
  **Layout:** Add `const categoriesRes = await apiServerFetch(listCategoriesOp, {
  input: { cityId: "city-atlanta" } })` at the top of the RSC; pass
  `categories={categoriesRes.data?.items ?? []}` to `<AppSidebar>`.

  **AppSidebar:** Add prop `categories?: Category[]`. When non-empty, render from
  prop (use slug as href, name as label, look up icon from CATEGORY_META by slug —
  fall back to `Store` icon). When empty, fall back to `CATEGORIES_ORDERED`.
  Remove the `import { CATEGORIES_ORDERED }` (or keep as fallback import only).

  **Categories page:** Replace `CATEGORIES_ORDERED.map(...)` with `items.map(...)` on
  the DB-fetched list. Keep using `counts` from `listCategoriesWithCountsOp` for
  the count badges. The icon lookup in `CategoryRow` follows the same
  CATEGORY_META + Store fallback pattern.

  **Listing page:** Replace `if (!isValidCategory(category)) notFound()` with a DB
  lookup: `const catRes = await apiServerFetch(getCategoryBySlugOp, { input: {
  slug: category } })`. If `catRes.data?.category == null`, call `notFound()`.
  Remove the `VALID_CATEGORIES` import and `isValidCategory` function from this
  file. `generateMetadata` similarly needs the DB lookup (use the category's
  `name` field for the title).
- **Acceptance:** `/listings/restaurants` works as before. After admin creates
  "Grocery Stores" category, `/listings/grocery-stores` returns an empty listing
  page (not 404). After admin deactivates "Events & Entertainment",
  `/listings/events-entertainment` returns 404. The sidebar lists DB categories in
  the DB sort_order.

---

### Task 11: Homepage /home reads AppSetting for about text + stats

- **Files:**
  `apps/web/src/app/(app)/home/page.tsx` (edit — or wherever the homepage RSC is)
- **What:** In the RSC, call `apiServerFetch(getAppSettingsOp, { input: {} })` (admin
  op — but `/home` is a user-facing page, so use a **public** `getAppSettingsPublicOp`
  with `permission: "user"` instead). Add a `getAppSettingsPublicOp` in
  `apps/web/src/server/operations/app-settings.ts` (new public file, parallel to
  `-admin.ts`). The public op returns only the homepage keys.

  In the page: read `homepage_about_title`, `homepage_about_body`,
  `homepage_stat_businesses`, `homepage_stat_users` from the returned settings.
  If `homepage_stat_businesses === "auto"`, call a service function
  `countActiveBusinesses(db)` (add to businesses queries — `SELECT COUNT(*)
  WHERE deleted_at IS NULL`). Render the results in the hero section replacing
  any hardcoded strings.
- **Acceptance:** Change `homepage_about_title` to "Hello World" in
  `/admin/settings/homepage`, refresh `/home` → "Hello World" appears.
  With stat set to "auto", the displayed count matches the actual
  `SELECT COUNT(*) FROM businesses WHERE deleted_at IS NULL`.
- **Pause if:** The `/home` RSC uses a different file path than
  `apps/web/src/app/(app)/home/page.tsx` — locate and update the correct file.

---

### Task 12: Typecheck + lint pass

- **Files:** none (read-only verification)
- **What:** `pnpm typecheck` + `pnpm lint` must be clean across all packages.
  Fix any type errors introduced by the `BusinessCategorySchema` widening
  (`BusinessCategory` is now `string` — any `switch`/`if` on it that exhausted
  the 7-member union may produce TS warnings).
- **Acceptance:** Both commands exit 0 with no errors. If warnings remain,
  document each one — don't suppress with `eslint-disable`.

---

## Open questions

All four questions from the plan are resolved:

1. **Which city for dropdown?** → Hard-code `city_id = "city-atlanta"` in the
   admin business form category dropdown query for MVP. Deferred: dynamic
   city selector when a second city is activated.

2. **Subcategory DnD across parents?** → Edit form only for reparenting.
   DnD stays within-sibling. Two separate `SortableContext` blocks.

3. **Slug auto-generation?** → Yes. Category form auto-fills slug from name
   as user types. Slug field is visible and editable (can be overridden).

4. **`app_setting` audit log?** → No for this sprint. App settings are
   display-only copy; audit deferred until client requests it.
