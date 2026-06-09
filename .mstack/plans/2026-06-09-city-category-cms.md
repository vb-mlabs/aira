# Plan: City scoping + Category tree + Homepage CMS (S2: F4, F6, F24)

**Date:** 2026-06-09
**Slug:** 2026-06-09-city-category-cms
**Status:** reviewed
**Author:** /mlabs-plan

---

## Problem

Three things are currently hardcoded in the codebase that an admin should own:

1. **Categories are a TS const.** `VALID_CATEGORIES` in
   `packages/validators/src/businesses.ts` is the runtime authority for
   which categories exist. Adding "Grocery Stores" requires a code deploy.
   Admin should be able to add, rename, reorder, and deactivate categories
   from a browser — and subcategories underneath them — without touching
   the code.

2. **No city model.** AIRA is described as a city-scoped directory
   ("Atlanta's Indian community directory"). There's no `city` table.
   The directory has no city concept in the DB, which means multi-city
   expansion later requires retrofitting. Establishing the table now —
   seeding Atlanta as the one active city — means future sprints can
   layer city-switcher UI without a disruptive schema change.

3. **Homepage About text is static.** The tagline, paragraph copy, and
   "X businesses · Y members" counts on `/home` are hardcoded in the
   React component. The client should be able to tweak copy and override
   counts without a deploy.

**Beneficiaries:** Admin (gets live-editable category tree + homepage
copy). End-users get subcategory browsing once the matching UI lands
in a future sprint (deferred from this one).

**Success:** Admin opens `/admin/categories`, drags "Restaurants" above
"Shopping", adds a "South Indian" subcategory under "Restaurants",
navigates to `/listings/restaurants`, and sees South Indian listed as a
subcategory chip. Admin edits the homepage About text from the CMS panel
and refreshes `/home` — new copy shows immediately.

---

## Scope

**In:**
- New `city` table — id, name, slug, active, sort_order. Admin CRUD at
  `/admin/cities` (list + create + edit). Seed: Atlanta (slug `atlanta`,
  active).
- New `category` table — id, city_id FK, parent_id self-FK (NULL = root),
  name, slug, level (1 = root, 2 = subcategory), sort_order, active.
  Unique constraint on `(city_id, slug)`. Seed: 7 root categories from
  `VALID_CATEGORIES` under Atlanta, all active.
- New `app_setting` table — key (unique), value (text). Keys seeded:
  `homepage_about_title`, `homepage_about_body`, `homepage_stat_businesses`
  ("auto" = use live DB count, or a numeric override string),
  `homepage_stat_users`.
- Admin category tree manager at `/admin/categories` — flat list grouped
  by root, with drag-reorder via `@dnd-kit/sortable`. Toggle
  active/inactive. Link to create/edit form.
- Admin category create/edit at `/admin/categories/new` and
  `/admin/categories/[id]` — name, parent (dropdown of root categories
  in this city), active toggle.
- Admin city list at `/admin/cities` — table of all cities. Create/edit form.
- Admin homepage CMS panel at `/admin/settings/homepage` — text fields for
  the 4 `app_setting` keys, save via PATCH.
- Admin sidebar nav updated: add **Categories** and **Cities** and
  **Settings** links (Settings reveals the homepage CMS).
- `BusinessCategorySchema` widened from `z.enum(VALID_CATEGORIES)` to
  `z.string().min(1)`. Admin business edit form category dropdown reads
  active root categories from DB (subcategories selectable too).
- Public `/listings/[category]/page.tsx` validates the slug against the DB
  via `getCategoryBySlugOp`; returns 404 if not found or inactive.
- Public `/categories/page.tsx` reads active root categories from DB
  (same data, new source).
- `VALID_CATEGORIES` const **kept** in validators as the seed list +
  for existing tests/migrations; removed from runtime Zod schemas.
- Migration `0016_*.sql` via `pnpm db:generate`.

**Out (deferred):**
- **End-user subcategory browse UI** — `/listings/restaurants` subcategory
  chip/tab filter (F5). Admin owns the tree this sprint; user-facing tree
  navigation is a follow-up once the client validates the tree shape.
- **Multi-city UI switcher** — end-user city selector (Phase 2). City table
  is established; the selector ships after multi-city content exists.
- **`category_id` FK on businesses** — multi-category attach on `businesses`
  (F13 advanced). A separate `business_category` join table is the
  right move; it lands in a dedicated sprint after S2 unblocks it.
- **Category image / icon** — not in PRD MVP.
- **Bulk category import** — admin can add one at a time for MVP.
- **AppSetting for reminder schedule, purge days, min build numbers** —
  those keys are S5/S6 scope; the table exists here but those keys are not
  seeded or admin-exposed this sprint.

---

## Approach

**Five layers, same shape as every prior feature.**

**1. Schema** — two new tables + one settings table.

`city`: flat table, `sort_order` for future reorder, `active` to
soft-deactivate a city without deletion. Slug is globally unique.

`category`: self-referencing parent FK enables the 2-level tree without
a separate subcategory table. `level` column (1 or 2) is technically
derivable from `parent_id IS NULL`, but storing it avoids a self-join
in every query and enforces the depth constraint at the DB level. A DB
check `level IN (1, 2)` and a check `(level = 1 AND parent_id IS NULL)
OR (level = 2 AND parent_id IS NOT NULL)` enforce the invariant. Slug is
unique per `(city_id, slug)` composite — not globally — so the same
subcategory name can exist under different cities.

`app_setting`: simplest possible key/value with no city scoping in
migration `0016` (city-specific settings can be layered via a
`city_id nullable FK` in a later migration if needed). Unique on `key`.

**2. Services** — `packages/services/src/cities/` and
`packages/services/src/categories/` following the `businesses` pattern
(queries.ts + service.ts + index.ts).

Category queries needed:
- `getCategoriesByCity(db, cityId, { includeInactive })` — flat list,
  ordered by (level, sort_order, name)
- `getCategoryTree(db, cityId)` — same list, assembled into
  `{ root: Category; children: Category[] }[]` by the service layer
  (not in SQL) for simpler type handling
- `getCategoryBySlug(db, slug)` — for public slug validation
- `getRootCategoriesForCity(db, cityId)` — dropdown source in admin
  business form

`reorderCategories(db, cityId, orderedIds[])` — receives the new order
from the DnD commit event, bulk-updates `sort_order` in a transaction.

**3. Validators** — `packages/validators/src/categories.ts` +
`packages/validators/src/cities.ts` + `packages/validators/src/app_settings.ts`.

`BusinessCategorySchema` changes from `z.enum(VALID_CATEGORIES)` to
`z.string().min(1)`. This is the one risky change: existing callers that
pass a hard-typed `BusinessCategory` enum value will now have a looser
type. Mitigated by: (a) the admin form restricts the dropdown to valid
DB slugs; (b) route handlers validate the slug exists in DB via a short
service call before accepting the update.

**4. Ops** — `categories.ts` (public) + `categories-admin.ts` (admin) +
`cities-admin.ts` + `app-settings-admin.ts`.

Public ops: `listCategoriesOp`, `getCategoryBySlugOp`.
Admin ops: `createCategoryOp`, `updateCategoryOp`, `deleteCategoryOp`
(soft-delete via `active=false`, no hard-delete for referential safety),
`reorderCategoriesOp`, `listCitiesOp`, `createCityOp`, `updateCityOp`,
`getAppSettingOp`, `updateAppSettingOp`.

**5. Routes + UI.**

New route files following the PATCH/POST pattern already established
for businesses and archive/restore.

Admin pages are RSC + client form islands (same pattern as
`business-detail.tsx` + `business-edit-form.tsx`):
- `/admin/categories` — RSC fetches tree, renders
  `<CategoryTreeManager>` (client component with @dnd-kit/sortable)
- `/admin/categories/new` and `/admin/categories/[id]` — RSC + form
- `/admin/cities` and `/admin/cities/new` and `/admin/cities/[id]`
- `/admin/settings/homepage` — simple textarea/input form

Drag-reorder: `@dnd-kit/sortable` with `SortableContext` on the flat
list of category rows. On `onDragEnd`, fire `reorderCategoriesOp` with
the new `orderedIds` array. Root categories and their subcategories are
each in their own sortable context (roots sorted among roots, subs
sorted within their parent). Nested DnD (moving a subcategory to a
different parent) is out of scope — use the edit form for reparenting.

**Alternatives considered:**

- **pgEnum for category** — Rejected. Same reason the existing `category`
  text column used a TS const: pgEnum requires a migration for every new
  value. We're moving from TS const to DB table, not to pgEnum.
- **Nested set / materialized path for the tree** — Overkill at 2 levels.
  Self-FK parent_id with a level constraint is trivially queryable for
  depth ≤ 2.
- **Global category slugs (no city scoping)** — Simpler queries, but
  locks us out of city-specific category trees ("Chicago Indian Community"
  might have different subcategories than Atlanta). `(city_id, slug)`
  uniqueness keeps the door open.
- **Up/down sort buttons instead of DnD** — User chose @dnd-kit for
  better admin UX.

---

## Data model changes

**New tables (migration `0016`):**

```sql
-- city
CREATE TABLE city (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO city VALUES ('city-atlanta', 'Atlanta', 'atlanta', true, 0, now(), now());

-- category (2-level, city-scoped)
CREATE TABLE category (
  id            TEXT PRIMARY KEY,
  city_id       TEXT NOT NULL REFERENCES city(id),
  parent_id     TEXT REFERENCES category(id),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  level         INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (city_id, slug),
  CHECK (level IN (1, 2)),
  CHECK (
    (level = 1 AND parent_id IS NULL) OR
    (level = 2 AND parent_id IS NOT NULL)
  )
);
-- Seed 7 root categories under Atlanta (slugs match VALID_CATEGORIES):
-- restaurants, education, events-entertainment, professional-services,
-- health-wellness, real-estate, shopping

-- app_setting
CREATE TABLE app_setting (
  id         TEXT PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  value      TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO app_setting VALUES
  ('as-001', 'homepage_about_title', 'Connecting Atlanta''s Indian Community', now()),
  ('as-002', 'homepage_about_body',  '...', now()),
  ('as-003', 'homepage_stat_businesses', 'auto', now()),
  ('as-004', 'homepage_stat_users',      'auto', now());
```

**Index:** `category_city_level_sort_idx` on `(city_id, level, sort_order)` — the common
admin list query pattern.

**No changes to `businesses` table in this sprint.** `businesses.category`
text column continues to hold category slugs that now match the `category`
table's slugs. The FK relationship is enforced via application-layer
validation, not a DB FK, to avoid a risky `ALTER TABLE` on a live
table mid-sprint. The DB FK (`businesses.category → category.slug`) can
be added in a dedicated migration once the data is confirmed consistent.

---

## Files to touch

**New:**

*Schema:*
- `packages/db/src/schema/cities.ts`
- `packages/db/src/schema/categories.ts`
- `packages/db/src/schema/app_settings.ts`
- `packages/db/drizzle/migrations/0016_*.sql` (generated)

*Validators:*
- `packages/validators/src/cities.ts` — CitySchema, CityCreateInputSchema,
  CityUpdateInputSchema
- `packages/validators/src/categories.ts` — CategorySchema,
  CategoryCreateInputSchema, CategoryUpdateInputSchema,
  CategoryReorderInputSchema
- `packages/validators/src/app_settings.ts` — AppSettingSchema,
  AppSettingUpdateInputSchema

*Services:*
- `packages/services/src/cities/queries.ts`
- `packages/services/src/cities/service.ts`
- `packages/services/src/cities/index.ts`
- `packages/services/src/categories/queries.ts`
- `packages/services/src/categories/service.ts`
- `packages/services/src/categories/index.ts`
- `packages/services/src/app_settings/queries.ts`
- `packages/services/src/app_settings/service.ts`
- `packages/services/src/app_settings/index.ts`

*Ops:*
- `apps/web/src/server/operations/categories.ts` (public: listCategoriesOp,
  getCategoryBySlugOp)
- `apps/web/src/server/operations/categories-admin.ts` (createCategoryOp,
  updateCategoryOp, deactivateCategoryOp, reorderCategoriesOp)
- `apps/web/src/server/operations/cities-admin.ts` (listCitiesOp,
  createCityOp, updateCityOp)
- `apps/web/src/server/operations/app-settings-admin.ts`
  (getAppSettingsOp, updateAppSettingOp)

*Routes:*
- `apps/web/src/app/api/v1/categories/route.ts` (GET — public list)
- `apps/web/src/app/api/v1/admin/categories/route.ts` (GET list, POST create)
- `apps/web/src/app/api/v1/admin/categories/[id]/route.ts` (PATCH update)
- `apps/web/src/app/api/v1/admin/categories/[id]/deactivate/route.ts` (POST)
- `apps/web/src/app/api/v1/admin/categories/reorder/route.ts` (POST batch)
- `apps/web/src/app/api/v1/admin/cities/route.ts` (GET list, POST create)
- `apps/web/src/app/api/v1/admin/cities/[id]/route.ts` (PATCH update)
- `apps/web/src/app/api/v1/admin/app-settings/route.ts` (GET, PATCH)

*Admin pages:*
- `apps/web/src/app/admin/categories/page.tsx` (RSC tree view)
- `apps/web/src/app/admin/categories/new/page.tsx`
- `apps/web/src/app/admin/categories/[id]/page.tsx`
- `apps/web/src/app/admin/cities/page.tsx`
- `apps/web/src/app/admin/cities/new/page.tsx`
- `apps/web/src/app/admin/cities/[id]/page.tsx`
- `apps/web/src/app/admin/settings/homepage/page.tsx`

*Feature components:*
- `apps/web/src/features/admin/components/category-tree-manager.tsx`
  (client, @dnd-kit/sortable)
- `apps/web/src/features/admin/components/category-form.tsx`
- `apps/web/src/features/admin/components/city-form.tsx`
- `apps/web/src/features/admin/components/homepage-cms-form.tsx`

**Edit:**

- `packages/db/src/schema/index.ts` — add city/category/app_setting exports
- `packages/validators/src/businesses.ts` — `BusinessCategorySchema`:
  `z.enum(VALID_CATEGORIES)` → `z.string().min(1)`; keep `VALID_CATEGORIES`
  exported for seeding/tests
- `packages/services/src/index.ts` (if it exists) — re-export cities,
  categories, appSettings services
- `apps/web/src/app/(app)/listings/[category]/page.tsx` — validate
  category slug against DB (`getCategoryBySlugOp`); show 404 if inactive
- `apps/web/src/app/(app)/categories/page.tsx` — read active root
  categories from DB instead of hardcoded list
- `apps/web/src/features/admin/components/business-edit-form.tsx` —
  category `<select>` reads from `listCategoriesOp` (RSC passes list as
  prop)
- `apps/web/src/app/admin/businesses/[id]/page.tsx` — pass active
  categories list to `<BusinessAdminDetail>` / `<BusinessEditForm>`
- `apps/web/src/app/admin/_components/admin-sidebar.tsx` — add
  Categories, Cities, Settings nav entries
- `apps/web/src/app/(app)/_components/sidebar.tsx` (or equivalent) —
  if category list is rendered here, switch to DB source

---

## Edge cases

- **Deactivate a category that has active businesses** — `deactivateCategoryOp`
  should warn (return a count of affected businesses in the response) but
  not block the deactivation. The businesses remain; they just won't appear
  in the live category dropdown. Admin sees a confirmation dialog:
  "X businesses are in this category. Deactivating hides them from the
  public listing until the category is reactivated or they are recategorised."
- **Delete vs deactivate** — no hard-delete route for categories in this
  sprint. `active=false` is the only removal path. Avoids orphaned businesses.
- **Slug collision on category create** — `(city_id, slug)` unique constraint
  catches it at the DB level; op returns a user-friendly "A category with
  that slug already exists in this city" error.
- **Parent_id cycle** — prevented by the `level IN (1, 2)` check: a level-2
  category can't itself be a parent (level would need to be 3). No
  recursive cycle is possible at depth ≤ 2.
- **Reorder race: two admins drag simultaneously** — the batch
  `reorderCategories` mutation overwrites sort_order for all provided IDs
  atomically. Last writer wins. Acceptable for MVP admin scale.
- **Business with a category slug that's been deactivated** — the business
  still exists and is visible on its detail page. The public category
  listing page for that slug returns 404 (category inactive → not found).
  Admin can reactivate the category or recategorise the businesses.
- **Category slug mismatch during migration** — existing businesses use slugs
  from `VALID_CATEGORIES` (e.g. "restaurants"). The seed data uses those
  exact slugs. If any business has a slug that wasn't in the seed (shouldn't
  happen), it becomes "uncategorised" and the admin form will warn.
- **`app_setting` "auto" value for stats** — the homepage reads
  `homepage_stat_businesses`. If value is `"auto"`, the RSC queries the
  live `businesses` count. If it's a number string like `"142"`, it
  renders that without a DB query. Parsing: `parseInt(value, 10) || "auto"`.
- **Empty category tree** — if all categories are deactivated or the
  city has no categories, `/categories` shows an empty state ("No categories
  yet") rather than crashing.

---

## Acceptance criteria

- [ ] Migration `0016_*.sql` applies cleanly from the current DB state;
  Atlanta city row exists; all 7 root category rows exist with slugs
  matching `VALID_CATEGORIES`.
- [ ] `GET /api/v1/categories` returns the active root categories for Atlanta.
- [ ] `/admin/categories` renders the full tree (root + any subcategories),
  reorderable by drag handle via @dnd-kit/sortable.
- [ ] Dragging a root category and releasing persists the new `sort_order`
  to the DB. Refreshing the page shows the new order.
- [ ] Admin creates a new root category "Grocery Stores" with slug
  `grocery-stores` — it appears in the tree and in the admin business form
  category dropdown without a code deploy.
- [ ] Admin creates a subcategory "South Indian" under "Restaurants" — it
  appears indented under Restaurants in the tree.
- [ ] Admin deactivates "Events & Entertainment" — it disappears from the
  public `/categories` page and the `/listings/events-entertainment` route
  returns 404. Businesses in that category still exist in admin.
- [ ] Admin reactivates "Events & Entertainment" — it reappears on the
  public listing page.
- [ ] Admin edits a business; category dropdown shows only active categories
  from the DB (not the hard-coded `VALID_CATEGORIES` enum).
- [ ] Selecting a new DB-sourced category and saving the business persists
  the new category slug.
- [ ] `/listings/restaurants` still works (slug matches seed row).
- [ ] `/admin/cities` lists Atlanta. Admin creates a new city "Birmingham"
  with slug `birmingham` — it appears in the list.
- [ ] `/admin/settings/homepage` renders 4 editable fields; saving updates
  the `app_setting` rows; reloading `/home` shows the new About text.
- [ ] `homepage_stat_businesses = "auto"` on `/home` shows the live DB
  count of active businesses.
- [ ] Admin sidebar shows Categories, Cities, Settings nav links.
- [ ] `pnpm typecheck` + `pnpm lint` clean after `BusinessCategorySchema`
  widening — no downstream type errors.

---

## Open questions

- **Which city do we scope the category dropdown to in the admin business
  form?** For now, Atlanta is the only city. Should we hard-code `city_id =
  'city-atlanta'` in the dropdown query, or read from a "current city"
  context (e.g. an `AppSetting('active_city')`)? For MVP with one city,
  hard-coding is fine. Reviewer to decide.
- **Subcategory DnD across parents** — should a subcategory be draggable
  to a different parent in the tree UI, or is reparenting done only via the
  edit form? Recommended: edit form only (DnD stays within-sibling sort).
  Reviewer to confirm.
- **Slug generation** — should the category create form auto-generate the
  slug from the name (e.g. "South Indian" → `south-indian`) and let admin
  override? Yes is the obvious answer; confirming scope.
- **`app_setting` audit log** — should edits to `app_setting` write an
  `audit_log` entry? The existing audit pattern supports this (same
  `AuditMeta` discriminated union). If yes, add `app_setting.updated` kind
  to `AuditMeta`. Reviewer to confirm.
