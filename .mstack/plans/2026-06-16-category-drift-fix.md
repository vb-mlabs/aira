# Plan: Category source-of-truth fix — admin form reads DB, slug-rename guard, data cleanup

**Date:** 2026-06-16
**Slug:** category-drift-fix
**Status:** implemented
**Author:** vb-mlabs
**Reviewed:** [.mstack/reviews/2026-06-16-category-drift-fix.md](../reviews/2026-06-16-category-drift-fix.md)
**Implemented:** [.mstack/code/2026-06-16-category-drift-fix/report.md](../code/2026-06-16-category-drift-fix/report.md)

---

## Problem

The admin "Add business" form pulls its Category dropdown options from a
hardcoded constant (`VALID_CATEGORIES` in
`packages/validators/src/businesses.ts:52` — 7 strings). Every other
surface (`/admin/sidebar`, `/home`, `/categories`, `/listings/[category]`,
the admin `category` settings page) reads the dynamic `category` DB
table managed via `/admin/settings/categories`. The two sources happen
to align today because both were seeded with the same 7 slugs at MVP
launch — but nothing enforces it. Three concrete failure modes:

1. **Add a category in admin → it's invisible to the business form.**
   Create "Music & Dance" in `/admin/settings/categories`; it shows up
   publicly, but the Add-Business dropdown can't pick it.
2. **Rename a category slug in admin → existing businesses orphan
   silently.** The `category` table row updates; the public listings
   resolve the new slug; but every business still has the OLD slug in
   the `businesses.category` text column (no FK). They vanish from
   listings.
3. **Deactivate a category in admin → admin form still offers it.**
   The form doesn't filter by `category.active`.

Existing data shows the drift already happening:
- 1 orphan: `[F23-QA] Patel Catering` has `category='food-dining'` —
  in **neither** VALID_CATEGORIES nor the `category` table.
- 3 QA junk rows in `category` (`qa-root-1781028433024`,
  `qa-root-1781028692142`, `qa-deactivate-1781028692142`) leftover
  from test fixtures.
- 2 nonsensical `business_category` join rows: Ayurveda Wellness
  (a wellness business) joined to Restaurants + Events &
  Entertainment.

**Who benefits:** the admin / super_admin running the directory. The
public site sees no observable change today (categories happen to
align); the change forecloses a class of future bugs.

**Success:** an admin opens `/admin/businesses/new`, the Category
dropdown shows the same active root categories as the public sidebar.
Adding a new category via `/admin/settings/categories` immediately
makes it pickable in the business form. Renaming a slug with assigned
businesses is rejected with a clear error explaining how many businesses
would orphan and what to do.

---

## Scope

**In:**

- Change `business-create-form.tsx` (the only consumer of
  `VALID_CATEGORIES` in production code) to receive `categories` as a
  prop from its parent RSC, fetched via the existing
  `listCategoriesOp` op (which already returns active root categories
  for `city-atlanta`).
- Add the missing fetch in `apps/web/src/app/admin/businesses/new/page.tsx`
  (the RSC that mounts `BusinessCreateForm`).
- Delete `VALID_CATEGORIES`, the export wiring, and any code-only
  references — including the schema doc comment in
  `packages/db/src/schema/businesses.ts:55` and the re-exports in
  `apps/web/src/features/listings/{index.ts, types.ts}` and
  `category-meta.ts`. Replace with a comment pointing to the `category`
  DB table as the source of truth.
- Add a slug-rename guard inside `updateCategoryOp`
  (`apps/web/src/server/operations/categories-admin.ts:67-78`): if
  `data.slug` is provided AND differs from the current row's slug,
  count `businesses` with `category = oldSlug`; if non-zero, throw
  `ApiError.conflict("categories.rename_would_orphan", …)` with an
  affected-count message. Match the existing
  `deactivateCategoryOp` pattern (it already counts affected businesses
  and returns the number).
- One Drizzle migration that:
  - UPDATEs `businesses SET category = 'restaurants' WHERE id = '<F23-QA Patel Catering id>'`
    (or `slug = 'qa-f23-patel-catering'` — whichever matches; will
    confirm by id during /mlabs-code).
  - DELETEs the 3 QA junk rows from `category` where slug LIKE 'qa-%'.
    Pre-check: `business_category` and `sponsorship` FK joins (cascade
    is `ON DELETE CASCADE` for business_category, `RESTRICT` for
    sponsorship). If any sponsorship row references one of the 3
    qa-rows, abort the migration; manual cleanup needed first.
  - DELETEs the 2 weird `business_category` rows joining Ayurveda
    Wellness to Restaurants + Events & Entertainment.
- A Vitest covering the rename-guard op handler: setup → category with
  slug "restaurants" + one business with `category='restaurants'` →
  attempt rename to `indian-restaurants` → expect
  `ApiError.conflict` with code `categories.rename_would_orphan` and
  the `affected` count in the message.

**Out (deferred):**

- **Cascade-rename** (atomically update the category row AND
  `businesses.category` for every affected business in one transaction).
  Considered + rejected for this PR — adds audit-log decisions (do we
  write N business-update events or one category-rename event?). Block
  for now, layer cascade in a separate plan once we know rename is
  actually a workflow admins use.
- **Foreign key enforcement** (`businesses.category` → `category.slug`).
  Would require schema-level uniqueness on `category.slug` per-city
  and a real FK column. Bigger change; the rename guard prevents the
  worst case for MVP.
- **Subcategory support in the form.** The DB schema supports L1+L2
  categories; the form will list only L1 roots for now. L2 subcategory
  picking is a separate UX decision.
- **business_category join-table UI exposure.** That table is being
  populated by the user's separate in-progress `business-detail.tsx`
  work for an "extra categories" multi-select feature. Out of scope
  here; this plan only deletes the 2 stale rows, doesn't touch the
  feature.
- **Touching `business-detail.tsx` / `business-create-form.tsx`-adjacent
  files in the user's dirty tree.** The 4 in-progress tsx files
  (`business-detail.tsx`, `business-create-form.tsx`,
  `[id]/page.tsx`, `feature-image-section.tsx`) carry uncommitted user
  work. This plan **does** touch `business-create-form.tsx` because
  that's the file that imports `VALID_CATEGORIES`. **Therefore the
  /mlabs-code task that modifies it must pause and ask the user
  whether their WIP should be committed/stashed/merged first** — see
  the Task's `Pause if` field in the review.
- **Category settings page UX polish** (better error rendering, undo,
  etc.) — only the underlying op gains the guard; the existing
  `category-tree-manager.tsx` UI shows the resulting error verbatim
  via its existing error path.

---

## Approach

### Architecture: form-fetches-from-DB + thin server-side guard

The business create form is currently `"use client"` and imports
`VALID_CATEGORIES` at module load. It must keep its client status (it
manages form state). The clean path:

1. **Parent RSC** (`apps/web/src/app/admin/businesses/new/page.tsx`) is
   already a server component — fetch categories via `apiServerFetch(listCategoriesOp)`
   (which already returns active root categories for Atlanta), pass
   them down as a prop.
2. **`BusinessCreateForm` component** accepts `categories: Category[]`
   as a prop. State initialiser becomes
   `useState(categories[0]?.slug ?? "")`. The `<select>` iterates
   `categories.map(c => <option value={c.slug}>{c.name}</option>)`.
3. **Delete `VALID_CATEGORIES` from `packages/validators/src/businesses.ts`**.
   Cascade-remove references from `features/listings/types.ts`,
   `features/listings/index.ts`, `features/listings/category-meta.ts`,
   and the schema doc comment in
   `packages/db/src/schema/businesses.ts:55`.
4. **Rename guard inside `updateCategoryOp`**: pre-update, fetch the
   current row's slug; if a new slug is being set AND differs, call
   `businessesService.getBusinessesByCategory(db, oldSlug)` (already
   imported in this file for `deactivateCategoryOp`), throw
   `ApiError.conflict(...)` if `.length > 0`. Otherwise proceed to
   the existing `categoriesService.updateCategory` call.
5. **Data migration** (one new file in `drizzle/migrations/`):
   - UPDATE the one orphan business's `category` field to a valid slug.
   - DELETE the 3 QA rows from `category` after the FK pre-check.
   - DELETE the 2 stale `business_category` join rows for Ayurveda
     Wellness.

**Why this approach (vs alternatives):**

- **Alternative A — Cascade-rename.** Most ergonomic for admins
  (rename + auto-update orphans in one transaction). Rejected: audit
  semantics aren't obvious (one event or N?) and there's no current
  user workflow demonstrating rename is needed. Layer in a follow-up
  if admins start asking.
- **Alternative B — Add a real FK.** `businesses.category_id` →
  `category.id`. Properly relational. Rejected for this PR: requires
  a backfill migration (every business needs its text slug mapped to
  a category id), and the change ripples through every service-layer
  query that filters/groups by category. Big surface for what the
  guard-plus-source-of-truth already achieves.
- **Alternative C — Keep `VALID_CATEGORIES` as a deprecated re-export
  for forks.** Rejected per the user's decision in /mlabs-plan intake
  — keeping the const around re-introduces the drift hazard if anyone
  ever imports it again. Fresh forks can seed the `category` table
  from the migration file's seed data (existing
  `drizzle/migrations/` has a seed pattern).

---

## Data model changes

One new Drizzle SQL migration. **No schema changes** — only data
fixups + the rename guard. Migration filename will be the next number
in `drizzle/migrations/` (current latest is `0026_purge_homepage_app_setting_rows.sql`
per the recent commits — `/mlabs-code` will check and number
accordingly).

```sql
-- migration 00NN_category_drift_cleanup.sql

-- 1. Re-home the F23-QA orphan business. 'food-dining' is in neither
--    VALID_CATEGORIES nor the active category table. Restaurants is
--    the closest semantic match for an Indian catering business.
UPDATE businesses
SET category = 'restaurants', updated_at = now()
WHERE category = 'food-dining';

-- 2. FK pre-check before deleting QA junk categories. If any
--    sponsorship row references them, abort (sponsorship is
--    ON DELETE RESTRICT). business_category is ON DELETE CASCADE so
--    that's safe.
DO $$
DECLARE
  blocking_sponsorships int;
BEGIN
  SELECT count(*) INTO blocking_sponsorships
  FROM sponsorship s
  JOIN category c ON c.id = s.category_id
  WHERE c.slug LIKE 'qa-%';
  IF blocking_sponsorships > 0 THEN
    RAISE EXCEPTION 'category cleanup blocked: % sponsorship row(s) reference qa-* categories', blocking_sponsorships;
  END IF;
END $$;

DELETE FROM category WHERE slug LIKE 'qa-%';

-- 3. Drop the 2 nonsensical Ayurveda Wellness join rows (wellness
--    business joined to Restaurants + Events). Identified by joining
--    on the unique slug.
DELETE FROM business_category bc
USING businesses b
WHERE bc.business_id = b.id
  AND b.slug = 'ayurveda-wellness'
  AND bc.category_id IN (
    SELECT id FROM category WHERE slug IN ('restaurants', 'events-entertainment')
  );
```

Migration is reversible-via-restore (DELETE rows can be re-INSERTed
from a backup); no migration-down required per the
existing convention.

---

## Files to touch

**New:**

- `drizzle/migrations/00NN_category_drift_cleanup.sql` (next number in
  sequence; `/mlabs-code` checks).
- `apps/web/tests/categories-rename-guard.test.ts` — Vitest covering
  the new guard in `updateCategoryOp`.

**Edit:**

- `apps/web/src/app/admin/businesses/new/page.tsx` (RSC) — add
  `apiServerFetch(listCategoriesOp)`, pass `categories` prop to
  `BusinessCreateForm`.
- `apps/web/src/features/admin/components/business-create-form.tsx`
  **(IN USER'S DIRTY TREE — pause and ask before editing)** — accept
  `categories: Category[]` prop, remove `VALID_CATEGORIES` import,
  rewire the `<select>` to iterate the prop.
- `apps/web/src/server/operations/categories-admin.ts` — add slug-rename
  guard to `updateCategoryOp`.
- `packages/validators/src/businesses.ts` — delete `VALID_CATEGORIES`
  const + the `BusinessCategory` legacy type comment that references
  it.
- `apps/web/src/features/listings/types.ts` — remove `VALID_CATEGORIES`
  import + the type derived from it (if any usage). Replace any
  consumer that needs a list of categories with a runtime fetch.
- `apps/web/src/features/listings/index.ts` — drop the
  `VALID_CATEGORIES` re-export.
- `apps/web/src/features/listings/category-meta.ts` — remove the
  comment referencing `VALID_CATEGORIES`; if any keyed map uses the
  const, refactor to key by category slug at runtime.
- `packages/db/src/schema/businesses.ts:55` — update the doc comment
  on the `category` text column from "One of VALID_CATEGORIES — validated
  in query layer" to "Slug of an active row in the `category` table for
  this city — soft contract; the rename guard in updateCategoryOp
  prevents drift, see `apps/web/src/server/operations/categories-admin.ts`".

---

## Edge cases

- **Empty `category` table on a fresh fork.** The form would show an
  empty dropdown. The new-business RSC needs to handle
  `categories.length === 0` — render the form with the select
  disabled + an inline message "No categories defined. Create one in
  Settings → Categories first." Same pattern the admin uses elsewhere
  when prerequisites are missing.
- **Slug-rename guard race:** admin A queries "any business uses old
  slug?" (none); admin B inserts a new business with the old slug;
  admin A renames. The business is now orphaned. Window is small (one
  admin pair, milliseconds). For MVP, accept the race — document in
  the audit-log entry that this scenario can happen. A real fix is
  the FK alternative (rejected above).
- **Slug rename in the guard counts BOTH active and archived
  businesses** (because the legacy text column is on `businesses`, not
  on `business_subscription`). That's the right behaviour — archived
  businesses that get restored need a valid slug too.
- **The form's `<select>` defaults to the first category.** If the
  default category is then deactivated server-side before the form
  submits, the existing back-end accepts the deactivated slug.
  Probably fine for MVP — the next list refresh removes the option;
  the orphan business is fixable via the rename-guard pathway.
- **Migration runs against a DB that's already been hand-cleaned.**
  All three DELETE/UPDATE statements are idempotent (UPDATE matches
  nothing, DELETE matches nothing). The DO $$ exception-raise still
  fires correctly if sponsorships reference qa-* — same behaviour
  whether or not the rows still exist.
- **Test seed compatibility.** The QA setup in
  `.mstack/qa/2026-06-16-0755/setup/global-setup.ts` seeds businesses
  with `category='restaurants'` — already valid; no QA-fixture change
  needed. Future tests that want to assert "admin sees N categories"
  should fetch from the op, not import a const.

---

## Acceptance criteria

- [ ] `apps/web/src/features/admin/components/business-create-form.tsx`
      no longer imports `VALID_CATEGORIES`; the `<select>` iterates a
      `categories` prop instead.
- [ ] `apps/web/src/app/admin/businesses/new/page.tsx` fetches active
      root categories via `apiServerFetch(listCategoriesOp)` and passes
      them to `BusinessCreateForm`.
- [ ] `VALID_CATEGORIES` is deleted from `packages/validators/src/businesses.ts`.
      Re-exports from `apps/web/src/features/listings/{index.ts, types.ts}`
      are removed.
- [ ] `updateCategoryOp` throws `ApiError.conflict("categories.rename_would_orphan", …)`
      with the affected business count in the message when a slug
      change is attempted on a category that has assigned businesses.
- [ ] Vitest `apps/web/tests/categories-rename-guard.test.ts` passes —
      seeds the conflict, asserts the throw + the error code.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass.
- [ ] New Drizzle migration applied via `pnpm db:migrate` and
      verified: the orphan business now has
      `category='restaurants'`; the 3 qa-* rows are gone from
      `category`; the 2 Ayurveda Wellness `business_category` rows are
      gone.
- [ ] The admin "Add business" form, opened against a fresh DB after
      the migration, shows exactly the same 7 categories as the public
      `/categories` page (Restaurants, Education, Events &
      Entertainment, Professional Services, Health & Wellness, Real
      Estate, Shopping).
- [ ] Adding a new active category via `/admin/settings/categories`
      makes it immediately pickable in the Add Business form on next
      navigation.

---

## Open questions

For `/mlabs-review` to resolve before implementation.

- **Migration numbering.** The latest migration on `main` is `0026`;
  on this feature branch we haven't added any migrations. Confirm
  during review that `/mlabs-code` will use `0027_category_drift_cleanup.sql`
  and not collide with anything in flight on `main`.
- **Dirty-tree handling for `business-create-form.tsx`.** The file is
  in the user's uncommitted WIP carried into this branch. The
  /mlabs-code task that touches it must pause and ask whether to
  commit/stash/merge the WIP first. Recommended user resolution:
  commit the WIP as its own commit on this branch (since they chose to
  carry it into this branch in the first place), then proceed with the
  category fix.
- **Error code naming.** Proposed `categories.rename_would_orphan`. The
  existing `ApiError` codes use the `<domain>.<reason>` pattern;
  reviewer to confirm "rename_would_orphan" reads right vs.
  "slug_in_use_by_businesses" or similar.
- **Should the form's "No categories defined" empty state link to
  `/admin/settings/categories`?** Probably yes (one click to fix) —
  but only super_admin can access that page. For plain admins the link
  would 404. Recommended: render the message conditionally on
  `callerRole === "super_admin"` if available, else render plain text.
  Need to confirm whether the new-business RSC currently has caller
  role in scope (it does via `requireAdmin()`; passing it down is
  cheap).
