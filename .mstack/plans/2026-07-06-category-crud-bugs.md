# Plan: Category CRUD bugs — group B (#5, #6, #13)

**Date:** 2026-07-06
**Slug:** 2026-07-06-category-crud-bugs
**Status:** shipped
**Author:** claude

---

## Problem

Three linked admin bugs from the 2026-07-06 QA feedback:

- **#5** — Admin cannot rename a category (`Restaurants → Food`). Tried
  moving subcategories to another category first; still blocked.
- **#6** — Admin business detail → "Edit categories" modal shows no
  subcategories in either the primary picker or the additional
  checkboxes.
- **#13** — Businesses can be created/moved under primary (level=1)
  categories. They should only ever live on subcategories (level=2);
  primaries are pure classification (per group A they *feature*
  sponsored businesses; they don't host them).

**Investigation established:**

- **#5 root cause:** `assertSlugRenameAllowed` guard in
  `apps/web/src/server/operations/categories-admin.ts` throws when the
  slug changes AND businesses reference the old slug (via the plain
  text `businesses.category` column). Error message says "Reassign
  them first" — user misread as "reassign subcategories", moved subs
  (no help), and stayed blocked. The form always sends `slug` in the
  PATCH so any slug edit triggers the guard.
- **#6 root cause:** The modal itself is fine — it renders subs
  correctly via `<optgroup>` (fixed on 2026-06-22 by
  `291c5c1 feat(admin): CategoryEditModal renders subcategories`).
  Real cause: **the seed contains zero subcategories**. Migration
  `0016_smiling_nehzno.sql` INSERTs 7 roots and no children. Admin
  has no subs to pick because none exist to begin with.
- **#13:** No enforcement anywhere. Nothing in `BusinessCreateInputSchema`,
  the create form (`business-create-form.tsx`), the edit modal
  (`business-detail.tsx`), or the service layer (`businesses/service.ts`)
  prevents assigning a business to a level-1 slug.

**Success** = admins can freely rename categories (data stays
consistent), the sub picker is populated from day one, and businesses
are guaranteed to live on subcategories only.

## Scope

**In:**

- **#5 — Cascading rename in a transaction.** Replace
  `assertSlugRenameAllowed` with a service-level
  `renameCategoryWithCascade(db, id, nextSlug)` that (a) updates the
  category slug and (b) updates every affected
  `businesses.category` row to match, inside one `db.transaction`.
  Emit one audit event per affected business
  (`business.category_slug_cascaded`) so history is preserved.
- **#6 — Seed subcategories + empty-state affordance.**
  - New migration seeds an initial set of subcategories under each
    root (~3–4 subs per root; exact list in Open questions).
  - In `CategoryEditModal`, when a selected root has no children,
    render a "No subcategories yet. Add one →" link that opens
    `/admin/settings/categories/new?parent=<rootId>` in a new tab.
    Same affordance on the Add Business form.
- **#13 — Sub-only enforcement (service layer + UI filter).**
  - **Service layer:** `createBusiness` and `updateBusiness` in
    `packages/services/src/businesses/service.ts` reject when
    `input.category` resolves to a level-1 slug. Error code
    `businesses.category_must_be_subcategory`.
  - **UI:** primary-category `<select>` on `business-create-form.tsx`
    and `CategoryEditModal` filters out level-1 options — only
    subcategories are selectable.
  - **No data migration** for existing rows. Businesses currently on
    a primary slug stay put until an admin edits them; the form nags
    on save with the same server error. Drift resolves on natural
    touch.
- Audit log new kind `business.category_slug_cascaded` for #5 cascade.

**Out (deferred):**

- Public-side sidebar filtering (an old TODO from the 2026-06-22
  review — inactive subs may leak into the public sidebar; that's a
  separate small plan).
- Bulk-reassign UI for admins who want to relocate many businesses
  from one category to another without a rename. Not asked for.
- One-time migration of existing primary-level businesses into an
  auto-created "General" subcategory (explicitly rejected in favor
  of natural drift resolution on edit).
- Deleting the pending-rename flow entirely — slug remains editable,
  we just make it non-lethal.

## Approach

**#5 cascade — one transaction, `AS_IS_ACCEPTED` audit trail.**

Add a new service function:

```ts
// packages/services/src/categories/service.ts (new file if needed, or
// extend queries.ts).
export async function renameCategoryWithCascade(
  db: Database,
  input: {
    id: string;
    nextName?: string;
    nextSlug: string;
    nextParentId?: string | null;
    nextActive?: boolean;
    actorUserId: string;
  },
): Promise<{ category: Category; affectedBusinessIds: string[] }>
```

Inside a `db.transaction`:

1. `SELECT * FROM category WHERE id = :id FOR UPDATE` — pin the row.
2. If `current.slug === nextSlug`: skip step 4 entirely.
3. `UPDATE category SET ...` with all provided fields.
4. If slug changed:
   `UPDATE businesses SET category = :nextSlug WHERE category = :currentSlug RETURNING id` — collect ids.
5. For each affected id: insert an `audit_log` row of kind
   `business.category_slug_cascaded` with actor = `input.actorUserId`
   and payload `{ from: currentSlug, to: nextSlug }`.

`updateCategoryOp` in `categories-admin.ts` swaps its call from
`categoriesService.updateCategory` + `assertSlugRenameAllowed` throw
path to the new cascade function.

`assertSlugRenameAllowed` gets deleted — it's the entire mechanism
we're replacing.

**#6 seed + empty-state affordance.**

New migration `NNNN_seed_starter_subcategories.sql` (Drizzle will
generate the number). Contains a single `INSERT INTO "category" ...
ON CONFLICT DO NOTHING;` block that seeds subs. Uses stable ids like
`cat-atl-restaurants-south-indian` so re-running the migration is a
no-op after first insert. Every sub has `level: 2`, `active: true`,
`parent_id` pointing at the corresponding root id from migration 0016.

Affordance: in `CategoryEditModal`, when the currently-selected root
has zero subs (or none exists at all), show a small link under the
picker: "No subcategories yet. Add one →" pointing at
`/admin/settings/categories/new?parent=<rootId>`. Same helper on
`business-create-form.tsx` primary picker. Query param preloads the
parent on the new-category form.

**#13 sub-only enforcement.**

Service layer catches the slug lookup once per mutation:

```ts
// packages/services/src/businesses/service.ts — inside createBusiness / updateBusiness
if (input.category !== undefined) {
  const cat = await categoriesService.getCategoryBySlug(db, input.category);
  if (!cat || cat.level !== 2) {
    throw { code: "businesses.category_must_be_subcategory",
            message: "Businesses can only be assigned to subcategories, not primary categories.",
            status: 400 };
  }
}
```

Zod-level enforcement is impossible because `BusinessCategorySchema`
is a raw `string` (per the intentional design decision in
`packages/validators/src/businesses.ts:59`) — Zod can't reach the
runtime category catalog. The service layer is the effective
enforcement point.

UI: both `business-create-form.tsx` and `CategoryEditModal` render
options from `categoryTree`. Change the render loop so that level-1
options are NOT emitted as pickable primaries; they remain as
`<optgroup>` labels only. Additional-categories checkboxes stay as
they are (multi-select is fine at either level — the primary rule is
what matters for the main slot).

## Alternatives considered

- **Slug locked at create.** Simpler, no cascade needed. Rejected —
  URLs freeze forever; admins who mistype have to deactivate and
  recreate.
- **Bulk-reassign UI.** Powerful but 2× the scope. Reserve for a
  future plan; the cascade handles the common case (rename with
  intent, all businesses come along).
- **One-time "General" subcategory migration.** Migrates existing
  primary-level businesses into `<root>-general`. Rejected — invents
  a new UX convention and doesn't handle intent (some businesses
  legitimately want a specific sub, not "General").
- **DB CHECK / trigger enforcement for #13.** Most authoritative but
  fights the current design (`businesses.category` is a text
  reference, not an FK). Rejected in favor of service-layer +
  UI-filter defense in depth.
- **Empty seed + admin creates all subs manually.** Simpler migration
  but poor first-time-admin UX. Rejected — the "no subs = broken"
  perception is exactly what triggered #6.

## Data model changes

**New migration:** `NNNN_seed_starter_subcategories.sql`
- Single `INSERT ... ON CONFLICT DO NOTHING` for level-2 subs.
- No schema changes.

**Audit log kinds:** register
`business.category_slug_cascaded` in `packages/validators` (mirror
the existing `business.categories_changed` registration pattern from
the 2026-06-15 audit-log-ui work).

**No schema alterations. No new tables.**

## Files to touch

**New:**
- `packages/db/drizzle/migrations/NNNN_seed_starter_subcategories.sql`
  (Drizzle-generated wrapper — content is the raw INSERT block).

**Edit — services:**
- `packages/services/src/categories/queries.ts` — new
  `renameCategoryWithCascade` function.
- `packages/services/src/businesses/service.ts` — add level=2 guard
  inside `createBusiness` + `updateBusiness`.
- `packages/services/src/index.ts` and
  `packages/services/src/categories/index.ts` — export the new fn.

**Edit — validators:**
- `packages/validators/src/audit.ts` (or wherever kinds live) —
  register `business.category_slug_cascaded`.

**Edit — operations:**
- `apps/web/src/server/operations/categories-admin.ts` —
  `updateCategoryOp` handler routes through the cascade; delete
  `assertSlugRenameAllowed`.
- `apps/web/src/server/operations/businesses-admin.ts` — no new
  code needed if the service throws (the op layer surfaces the
  `ApiError`), but check the error code is mapped correctly.

**Edit — admin UI:**
- `apps/web/src/features/admin/components/business-detail.tsx` —
  `CategoryEditModal` primary `<select>` filters out level-1
  options; render "No subcategories yet" affordance under the
  picker when the selected root has no active children.
- `apps/web/src/features/admin/components/business-create-form.tsx`
  — same treatment on the create-business primary picker.
- (Optional) `apps/web/src/app/admin/settings/categories/new/page.tsx`
  or its form — accept `?parent=<rootId>` URL param to preselect
  the parent in the new-category form.

**Edit — tests:**
- `apps/web/src/server/operations/__tests__/categories-admin.test.ts`
  (if exists) — replace the guard-throws tests with cascade
  assertions.
- Any tests that reference `assertSlugRenameAllowed` — remove.

## Edge cases

- **Rename to a slug that already exists on another category.** The
  category table has `uniqueIndex("category_city_slug_idx")` on
  `(city_id, slug)`. Insert would fail before we reach the cascade
  — surface a 409 `categories.slug_taken` (the create path already
  emits this).
- **Concurrent renames of the same slug.** The `FOR UPDATE` on the
  category row + PostgreSQL row-level locks serialize the second
  transaction until the first commits. Second transaction sees the
  new slug and no-ops the cascade step.
- **Cascade with tens of thousands of businesses.** Not a concern at
  MVP scale (Atlanta directory has < 500). Single `UPDATE` +
  batched audit inserts stay well inside a transaction. Revisit if
  scale climbs 100×.
- **Business assigned to a slug that gets renamed while the admin's
  edit modal is open.** After save, `router.refresh()` re-reads the
  current row; the new slug appears. No stale-write issue because
  the update targets the business by `id`, not `slug`.
- **Subcategory doesn't exist when admin creates a business.** With
  the sub-only filter, if a root has no subs, the primary picker is
  empty for that root. Empty-state affordance link is the exit.
- **Existing business on a primary slug + admin opens Edit modal.**
  Current slug is level-1. UI filter hides it from the picker — the
  select shows one of the subs instead (or empty). On save the
  service either accepts (sub picked) or throws (level-1 picked via
  API bypass).
- **Sub filter accidentally blocks a business that has NO category at
  all (empty string).** Guard in the service already checks
  `input.category !== undefined`. `""` should be treated as
  undefined; add a `.trim() === ""` short-circuit.
- **Seed re-run on an environment where an admin already created
  subs manually with different names.** `ON CONFLICT DO NOTHING` on
  the `id` column means each seeded row is idempotent. Manually
  created subs are untouched. If an admin manually created a sub
  with the same slug as one we seed, `category_city_slug_idx`
  blocks it — but this migration would run before the manual insert
  in any normal flow.
- **Rename cascade + `updateCategory` being called for name-only
  change.** `nextSlug === currentSlug` short-circuits the cascade.
  Free rename of the display name at any time.

## Acceptance criteria

- [ ] Admin can rename a category (e.g. Restaurants → Food, slug
      `restaurants` → `food`) and all businesses previously assigned
      to `restaurants` are updated to `food` in the same transaction.
- [ ] Post-rename, `/listings/food` renders the migrated businesses;
      `/listings/restaurants` 404s.
- [ ] Audit log shows one
      `business.category_slug_cascaded` entry per affected business.
- [ ] Renaming the display name only (not the slug) does not trigger
      any cascade and completes instantly.
- [ ] Admin business "Edit categories" modal shows subcategories
      grouped under their root (unchanged from the 2026-06-22 fix)
      AND, when the seed migration has run, at least one sub is
      selectable under each root.
- [ ] "No subcategories yet. Add one →" link appears in the modal
      when the currently-selected root has no active children and
      routes to `/admin/settings/categories/new?parent=<rootId>` with
      the parent preselected.
- [ ] Admin Add Business form primary picker only lists level-2
      (sub) options; level-1 rows appear as `<optgroup>` labels only.
- [ ] Attempting to save a business with `category` pointing to a
      level-1 slug (via API) returns a 400 with error code
      `businesses.category_must_be_subcategory`.
- [ ] Existing businesses already assigned to a level-1 slug are
      untouched by the migration; they can be viewed, but the first
      edit-and-save requires the admin to pick a valid sub.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` clean at the end of
      the branch.
- [ ] Category service tests cover: name-only rename (no cascade),
      slug rename with 0 affected businesses, slug rename with N
      affected businesses (assert both category row + business rows
      updated + N audit entries).

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Exact list of seeded subcategories.** Proposed starter set (3–5
   per root):
   - Restaurants → South Indian, North Indian, Street Food, Sweets & Bakery
   - Education → Language & Culture, Academic Tutoring, Music, Dance
   - Events & Entertainment → Weddings, DJs & Music, Kids' Parties, Cultural
   - Professional Services → Legal, Accounting, Real Estate Agents, Insurance
   - Health & Wellness → Ayurveda, Yoga & Fitness, Clinics, Salon & Spa
   - Real Estate → Buy/Sell, Rentals, Property Management
   - Shopping → Grocery, Clothing & Jewelry, Home Goods, Gifts

   Reviewer / user should sign off or trim/rename before code lands.

2. **Do we retro-migrate existing businesses to a "General" sub anyway?**
   Locked to "no" in consultation, but if the current DB actually has
   many primary-level businesses, the drift period could feel messy.
   Should we add a one-liner admin dashboard warning ("N businesses
   still on primary-only categories") to make the drift visible?

3. **Audit event payload shape.** `business.category_slug_cascaded`
   payload: `{ from: string, to: string }` seems obvious. Should we
   also record the acting category id so the audit-log-ui timeline
   can link back to the category row?

4. **`?parent=<rootId>` on the new-category form** — is the existing
   form component set up to accept URL prefills, or does that need
   additional wiring? Check before locking as a task; may need to
   downgrade to "just link to the create page and admin fills parent
   manually" if pre-fill is nontrivial.

5. **Level filter breaks the "Additional categories" checkbox
   semantics?** Right now the checklist allows both level-1 and
   level-2. Do we keep that (extra categories still permitted at any
   level) or push extras to level-2 only for consistency? Suggest
   keeping both allowed — additional categories are informational
   labels, not the primary listing slot.
