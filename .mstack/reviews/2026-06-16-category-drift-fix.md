# Review: Category source-of-truth fix — admin form reads DB, slug-rename guard, data cleanup

**Date:** 2026-06-16
**Slug:** category-drift-fix
**Plan reviewed:** [2026-06-16-category-drift-fix.md](../plans/2026-06-16-category-drift-fix.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** vb-mlabs

---

## Summary

Plan is approved with two corrections and one scope addition surfaced
during review:

1. **`ApiError.conflict` doesn't exist** in `packages/api/src/errors.ts` —
   only `unauthorized | idleTimeout | forbidden | notFound | badRequest |
   internal`. Switched to `ApiError.badRequest("categories.rename_would_orphan", …)`.
2. **Migration path is `packages/db/drizzle/migrations/` not `drizzle/migrations/`.**
   Latest migration on this branch is `0026_purge_homepage_settings.sql`,
   so the new file is `0027_category_drift_cleanup.sql`.
3. **`CATEGORY_META` defensive fallback added as Task 1** (new — not in
   the original plan). `CATEGORY_META` is consumed by 10 files (sidebar,
   /categories, /listings/[category], admin dashboard, business-card,
   business-detail, directory-view, listing-view, plus the form
   itself). Once the form switches to DB-fetched categories, an admin
   who creates `"music-and-dance"` would render broken cards (undefined
   icon + label) on every one of those surfaces. Adding a `getCategoryMeta(slug)`
   helper with a `Tag`-icon + slug-as-name fallback closes that
   regression in the same PR.

Net: 4 atomic tasks instead of the plan's looser 3-phase shape. No
schema columns added; one new migration; one new Vitest.

## Findings

### Blockers (must fix before /mlabs-code)

None remain. The `ApiError.conflict` ghost was the only one; resolved.

### Concerns (raised, decided, recorded)

- **Concern:** plan assumed `ApiError.conflict(code, message)` exists.
  It does not — `packages/api/src/errors.ts` only defines
  `unauthorized | idleTimeout | forbidden | notFound | badRequest |
  internal`. Adding a new `conflict()` factory would be semantically
  tighter (HTTP 409) but expands the public ApiError surface.
  **Decision:** Use `ApiError.badRequest("categories.rename_would_orphan",
  message)`. HTTP 400 carries fine for this case; the error code is
  what callers actually switch on.

- **Concern:** plan kept `CATEGORY_META` untouched. The map is read by
  10 surfaces (4 `page.tsx` + 5 `features/*/components/*.tsx` + the
  module itself) for icons, display names, and descriptions. Once the
  form switches to DB-fetched categories, an admin can create a
  category that isn't in the map — every consumer's lookup returns
  `undefined`, silently rendering a broken card.
  **Decision:** Add Task 1 that introduces a `getCategoryMeta(slug)`
  helper in `category-meta.ts` with a fallback (`Tag` icon from
  lucide-react, `displayName = slug`, `description = ""`). Update all
  10 consumers to go through the helper instead of indexing
  `CATEGORY_META` directly. Task 1 lands BEFORE the form switch so
  the regression never reaches `main`.

- **Concern:** plan's migration path was `drizzle/migrations/00NN_…sql`.
  Real path is `packages/db/drizzle/migrations/`; latest committed
  migration here is `0026_purge_homepage_settings.sql`.
  **Decision:** New migration is
  `packages/db/drizzle/migrations/0027_category_drift_cleanup.sql`.
  `/mlabs-code` will double-check no `0027` collision sneaks in via
  `main` before naming.

- **Concern:** `business-create-form.tsx` (in user's dirty tree)
  currently has `CATEGORY_META[c]?.displayName ?? c` for the dropdown
  label. After switching to DB-fetched categories, each row already
  carries `.name` (the human label), so the `CATEGORY_META` lookup
  becomes redundant in this one file.
  **Decision:** Task 4 removes the `CATEGORY_META` import from the
  form entirely, using `category.name` directly. Simplifies the form;
  the other 9 consumers keep the safe helper.

- **Concern:** Ayurveda Wellness migration SQL hinges on the slug
  `ayurveda-wellness`. Verified directly against the DB during review
  (id `biz-009`, slug `ayurveda-wellness`). Migration is safe as
  written.
  **Decision:** No change needed; migration uses the slug join.

### Suggestions (taken or deferred)

- **Suggestion (taken):** the migration's FK pre-check for
  `sponsorship` rows referencing the qa-* category rows should report
  the actual blocking sponsorship ids (not just count) when it
  aborts, so a human can investigate. Folded into Task 3's SQL.
- **Suggestion (deferred):** pull `displayName`, `description`,
  `icon_name` into the `category` DB schema as new columns so admin-
  created categories can carry their own display metadata.
  Deferred — much larger scope (migration + admin form changes); the
  defensive fallback buys time. Track as a follow-up plan candidate.
- **Suggestion (deferred):** add a real FK
  `businesses.category_id → category.id` and backfill. Already noted
  in the plan as out-of-scope; reviewer agrees.

## Decisions locked

Beyond what was in the plan:

- Error helper: `ApiError.badRequest("categories.rename_would_orphan",
  …)` — not `.conflict()`.
- Migration path: `packages/db/drizzle/migrations/0027_category_drift_cleanup.sql`.
- `CATEGORY_META` consumers all migrate to a new
  `getCategoryMeta(slug)` helper with a `Tag` (lucide) fallback. The
  helper is exported from `apps/web/src/features/listings/category-meta.ts`
  alongside the existing `CATEGORY_META` map (which stays exported
  for back-compat but should not be indexed directly in new code).
- Task ordering is 1 (fallback) → 2 (rename guard + test) → 3
  (migration) → 4 (form switch + delete VALID_CATEGORIES). Task 1
  MUST land before Task 4 so the form change can't regress the
  sidebar.
- The Vitest for the rename guard lives at
  `apps/web/tests/categories-rename-guard.test.ts` (matches the
  existing `apps/web/tests/` convention).

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic.

### Task 1: Add defensive getCategoryMeta(slug) fallback + sweep consumers

- **Files:**
  - `apps/web/src/features/listings/category-meta.ts` (edit) — add
    `getCategoryMeta(slug: string): CategoryMeta` that returns
    `CATEGORY_META[slug] ?? { slug, displayName: slug, description: "",
    icon: Tag }`. Import `Tag` from `lucide-react`. Keep `CATEGORY_META`
    + `CATEGORIES_ORDERED` exported for back-compat.
  - `apps/web/src/features/listings/index.ts` (edit) — re-export
    `getCategoryMeta`.
  - `apps/web/src/app/(app)/_components/app-sidebar.tsx` (edit) —
    replace any `CATEGORY_META[slug]` with `getCategoryMeta(slug)`.
  - `apps/web/src/app/(app)/categories/page.tsx` (edit) — same.
  - `apps/web/src/app/(app)/listings/[category]/page.tsx` (edit) — same.
  - `apps/web/src/app/admin/page.tsx` (edit) — same.
  - `apps/web/src/features/listings/components/business-card.tsx` (edit) — same.
  - `apps/web/src/features/listings/components/business-detail.tsx` (edit) — same.
  - `apps/web/src/features/listings/components/directory-view.tsx` (edit) — same.
  - `apps/web/src/features/listings/components/listing-view.tsx` (edit) — same.
- **What:** introduce a safe wrapper for the `CATEGORY_META` lookup so
  admin-created or renamed category slugs render with a generic
  `Tag` icon + slug-as-name rather than `undefined`. Pure refactor —
  every existing-category lookup returns the same object as before
  (the wrapper is identity for known slugs).
- **Acceptance:**
  - `getCategoryMeta` is exported from
    `apps/web/src/features/listings/category-meta.ts` and re-exported
    from `apps/web/src/features/listings/index.ts`.
  - No remaining direct `CATEGORY_META[...]` index access in any
    `apps/web/src/**/*.tsx` consumer (grep verifies; the `category-meta.ts`
    module itself is the only file allowed to read the map directly).
  - For every existing slug (`restaurants`, `education`, etc.),
    `getCategoryMeta(slug)` returns the same `displayName`, `icon`,
    `description` it did before.
  - For an unknown slug (e.g. `"foo-bar"`), `getCategoryMeta` returns
    `{ slug: "foo-bar", displayName: "foo-bar", description: "", icon: Tag }`.
  - `pnpm typecheck` + `pnpm lint` + `pnpm test` pass. No visual
    regression on existing /home, /categories, /listings/[category]
    pages.
- **Pause if:** any consumer's call site computes more than a single
  property off the meta (e.g. ternaries that depend on the meta
  existing). Surface and discuss before refactoring those individually.

### Task 2: Add slug-rename guard to updateCategoryOp + Vitest

- **Files:**
  - `apps/web/src/server/operations/categories-admin.ts` (edit) —
    in `updateCategoryOp`'s handler, before calling
    `categoriesService.updateCategory`, fetch the current category row
    (`getCategoriesByCity` is already imported); if `data.slug !==
    undefined && data.slug !== currentRow.slug`, call
    `businessesService.getBusinessesByCategory(db, currentRow.slug)`
    (already imported for `deactivateCategoryOp`). If the result
    array is non-empty, throw
    `ApiError.badRequest("categories.rename_would_orphan", \`Cannot rename slug: ${affected} business(es) reference the current slug. Reassign them first or contact engineering for a cascade migration.\`)`.
  - `apps/web/tests/categories-rename-guard.test.ts` (new) — Vitest:
    - Seed: insert one category row (slug `restaurants`) + one
      business with `category='restaurants'`.
    - Call `updateCategoryOp.handler` with `{ id: cat.id, slug: 'indian-restaurants' }`.
    - Assert it throws `ApiError`; assert `err.code === "categories.rename_would_orphan"`;
      assert the message mentions "1 business".
    - Negative: call with `{ id: cat.id, slug: cat.slug }` (no-op
      rename) — expect no throw.
    - Negative: call with `{ id: cat.id, name: "Restaurants Renamed" }`
      (name change, slug unchanged) — expect no throw.
- **Acceptance:**
  - Vitest `apps/web/tests/categories-rename-guard.test.ts` passes,
    covering the three cases above.
  - The existing `updateCategoryOp` test path (if any) still passes —
    no regression on name-only updates.
  - `pnpm typecheck` + `pnpm lint` pass.
  - Manual smoke (not automated): hitting
    `PATCH /api/v1/admin/categories/[id]` with a slug change for
    "restaurants" returns 400 with code `categories.rename_would_orphan`.
- **Pause if:** the existing `getBusinessesByCategory` signature
  doesn't accept just a slug string (signature drift since the plan
  was written). Surface to confirm before adapting.

### Task 3: Drizzle migration — data cleanup

- **Files:**
  - `packages/db/drizzle/migrations/0027_category_drift_cleanup.sql`
    (new) — three statements per the plan's SQL block, with one
    addition: the abort error in the FK pre-check now reports the
    blocking sponsorship ids, not just the count.
  - `packages/db/drizzle/migrations/meta/_journal.json` (edit, auto by
    `pnpm db:generate` if used; or hand-edit if writing the SQL
    directly).
- **What:** UPDATE the one `food-dining` orphan business to
  `category='restaurants'`. Pre-check sponsorship FKs on the qa-*
  category rows; DELETE the qa-* rows from `category`. DELETE the 2
  stale `business_category` rows for Ayurveda Wellness (slug
  `ayurveda-wellness`, joined to Restaurants + Events).
  Idempotent — re-running the migration against an already-cleaned DB
  no-ops.
- **Acceptance:**
  - `pnpm db:migrate` applies the migration cleanly.
  - Post-migration DB queries return:
    - `SELECT category FROM businesses WHERE category = 'food-dining';` → 0 rows.
    - `SELECT * FROM category WHERE slug LIKE 'qa-%';` → 0 rows.
    - `SELECT * FROM business_category bc JOIN businesses b ON b.id =
      bc.business_id WHERE b.slug = 'ayurveda-wellness';` → 0 rows.
  - No FK violations during migration. (If sponsorship rows reference
    the qa-* categories, the DO $$ raises — surface to user and pause.)
- **Pause if:** the FK pre-check raises (sponsorship rows reference
  qa-* category ids). Manual investigation needed — those sponsorship
  rows shouldn't exist either, but they take precedence over the
  category delete.
- **Pause if:** `pnpm db:generate` produces a schema diff
  (it shouldn't — the migration is pure data, not schema). Indicates
  someone changed schema files since this branch diverged; rebase
  before proceeding.

### Task 4: Switch BusinessCreateForm to DB-fetched categories + delete VALID_CATEGORIES

- **Files:**
  - `apps/web/src/app/admin/businesses/new/page.tsx` (edit) — add
    `apiServerFetch(listCategoriesOp, { input: {} })` to the existing
    `Promise.all` that fetches cities; pass `categories` prop to
    `<BusinessCreateForm cities={cities} categories={categories} />`.
  - `apps/web/src/features/admin/components/business-create-form.tsx`
    **(IN USER'S DIRTY TREE — PAUSE FIRST)** — accept
    `categories: Category[]` prop alongside the existing `cities`
    prop. Remove `VALID_CATEGORIES` + `CATEGORY_META` imports. Change
    `useState<string>(VALID_CATEGORIES[0])` to
    `useState<string>(categories[0]?.slug ?? "")`. Change the
    `<select>` to iterate `categories.map(c => <option
    value={c.slug}>{c.name}</option>)`. Add an empty-state branch: if
    `categories.length === 0`, render the form with the select
    disabled and an inline message "No categories defined. Create one
    in Settings → Categories first."
  - `packages/validators/src/businesses.ts` (edit) — delete the
    `VALID_CATEGORIES` const. Keep `BusinessCategory = string` type +
    `BusinessCategorySchema = z.string().min(1)` (already type-only).
  - `apps/web/src/features/listings/types.ts` (edit) — remove
    `VALID_CATEGORIES` from the re-export list.
  - `apps/web/src/features/listings/index.ts` (edit) — remove
    `VALID_CATEGORIES` from the re-export list.
  - `apps/web/src/features/listings/category-meta.ts` (edit) — remove
    the comment line "The slug values mirror VALID_CATEGORIES in
    ./types — keep them aligned." Add a comment pointing to the
    `category` DB table as the source of truth.
  - `packages/db/src/schema/businesses.ts` (edit) — update the doc
    comment on the `category` text column from "One of VALID_CATEGORIES
    — validated in query layer" to "Slug of an active row in the
    `category` table for this city. The rename guard in
    `apps/web/src/server/operations/categories-admin.ts`
    prevents drift."
- **What:** the headline change. Form fetches the dropdown options
  from the DB via the existing `listCategoriesOp`; the hardcoded const
  is removed everywhere.
- **Acceptance:**
  - `grep -rn "VALID_CATEGORIES" /home/runner/workspace --include="*.ts"
    --include="*.tsx" | grep -v node_modules` returns zero matches.
  - The "Add business" form opened against the seeded DB shows
    exactly the 7 active root categories (restaurants, education,
    events-entertainment, professional-services, health-wellness,
    real-estate, shopping) in the same order as the public sidebar.
  - Creating a new category via `/admin/settings/categories` then
    re-opening `/admin/businesses/new` shows the new category in the
    dropdown (manual smoke step; not automated).
  - Empty-state branch renders correctly when the `category` table is
    empty (verify by temporarily clearing the table in a test
    environment if comfortable; otherwise note the branch is exercised
    only manually).
  - `pnpm typecheck` + `pnpm lint` + `pnpm test` pass.
- **Pause if:** **`business-create-form.tsx` has uncommitted changes
  in the working tree** (user's WIP carried into this branch). Surface
  the conflict before editing — recommended user resolution: commit
  the WIP as its own commit on this branch first, THEN proceed with
  this task. The plan assumes the WIP is committed before this task
  fires.
- **Pause if:** any cascade-remove of `VALID_CATEGORIES` references
  surfaces in a file not in the Files list above (e.g. a test
  fixture). Surface; might be a stale grep mismatch from `/mlabs-plan`.

## Open questions

None remaining for `/mlabs-code` to escalate. All open questions from
the plan are resolved in this review.
