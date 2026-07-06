# Review: Category CRUD bugs — group B (#5, #6, #13)

**Date:** 2026-07-06
**Slug:** 2026-07-06-category-crud-bugs
**Plan reviewed:** [2026-07-06-category-crud-bugs.md](../plans/2026-07-06-category-crud-bugs.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** claude

---

## Summary

Plan is implementable. Investigation confirms all three root causes as
diagnosed. Several tightenings surfaced during review: (a) the business
create form fetches roots only and needs the same tree-op swap the
`CategoryEditModal` got on 2026-06-22; (b) registering the new audit kind
touches four sites, not one (discriminated union, KNOWN_AUDIT_ACTIONS,
label overrides, and the exhaustive switch in `render-detail.tsx`); (c)
there's an existing test file `apps/web/tests/categories-rename-guard.test.ts`
that must be replaced when we delete `assertSlugRenameAllowed`. All plan
open questions are locked below.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan puts the level=2 enforcement in "createBusiness /
  updateBusiness in @aira/services". But `createBusiness` isn't a
  service function — it lives in
  `packages/services/src/businesses/queries.ts` as a query and is re-
  exported from `service.ts`. `updateBusiness` IS in `service.ts`.
  **Decision:** Add the check inside `createBusiness` (the query)
  itself — it's fine for a query to enforce a business rule since the
  input is already Zod-validated. `updateBusiness` in `service.ts`
  gets the same check at the start of its handler, right after the
  `updatePayload.category = data.category` line. Two checkpoints
  keeps defense-in-depth without moving `createBusiness` around.

- **Concern:** Business create form (`business-create-form.tsx`)
  currently consumes `Category[]` (roots only) fetched via
  `listCategoriesOp`. To let admins pick subs as the primary, the
  containing page (`apps/web/src/app/admin/businesses/new/page.tsx`)
  needs the same tree-op swap that the business-detail page got on
  2026-06-22 — swap `listCategoriesOp` → `listCategoriesTreeOp`, pass
  the tree down, and render the primary picker using the same
  `<optgroup>` shape. Plan's "Files to touch" listed the form but not
  the page.
  **Decision:** Task 4 explicitly touches BOTH
  `apps/web/src/app/admin/businesses/new/page.tsx` (fetch swap +
  passing tree prop) AND `business-create-form.tsx` (accept the new
  `categoryTree` prop, render primary picker with subs). Same
  filtered-active-tree shape used by the edit modal.

- **Concern:** Audit kind registration is 4 touchpoints, not 1. The
  discriminated union in `packages/validators/src/audit-meta.ts` has
  a `_ActionsCoverage` compile-time assertion that fails when
  `AuditMeta.kind` and `KNOWN_AUDIT_ACTIONS` fall out of sync. Also,
  `render-detail.tsx` has an exhaustive `switch (m.kind)` whose
  `never`-typed default fires tsc if a new kind is unhandled.
  **Decision:** Task 1 registers the kind in all four sites
  atomically: AuditMeta union, KNOWN_AUDIT_ACTIONS array,
  AUDIT_ACTION_LABEL_OVERRIDES ("Category renamed"), and a new case in
  `render-detail.tsx` that shows "from → to". Ships as one commit;
  cascade cannot compile until this task lands, which naturally
  orders it first.

- **Concern:** `apps/web/tests/categories-rename-guard.test.ts`
  exists and exercises `assertSlugRenameAllowed` — the very function
  the plan deletes. Not removing it would break tsc.
  **Decision:** Task 2 deletes this file and replaces it with
  `apps/web/tests/categories-rename-cascade.test.ts` covering:
  (a) name-only rename → no cascade, no audit rows;
  (b) slug rename with 0 affected businesses → 0 audit rows;
  (c) slug rename with N affected businesses → N audit rows,
     businesses.category rows all updated, category slug updated;
  (d) slug rename where target slug already exists on another
      category → surfaces 409 `categories.slug_taken` (or whatever
      the existing unique-slug error code is).

- **Concern:** `FOR UPDATE` on the category row. Drizzle's typed
  builder doesn't have first-class row locking; the common approach
  is `db.select(...).from(...).for("update")` if available in this
  version, or fall back to raw SQL with `sql.raw`.
  **Decision:** Use `.for("update")` if drizzle-orm@0.45.2 supports
  it (it does — the `.for()` builder is present since 0.28). Verify
  at implementation. If it doesn't compile, escalate — do NOT skip
  the lock silently. Concurrent renames aren't hypothetical: two
  admins in different tabs could hit save at the same time.

- **Concern:** Seed list — the plan proposed 3–5 subs per root (~28
  total) but flagged it as "reviewer signs off". Rather than lock a
  final list in this review, I'll ship the plan's proposed set
  verbatim as the initial migration content and have `/mlabs-code`
  hold a review flag on Task 3 so `framer@` can trim/rename in the
  same commit before it lands.
  **Decision:** Task 3 uses the plan's proposed set VERBATIM.
  `/mlabs-code` pauses on Task 3 with "Confirm seed list before
  committing?" so the user can edit the SQL before the commit fires.
  Idempotent via `ON CONFLICT (id) DO NOTHING` — safe to iterate.

- **Concern:** Empty-state affordance on `business-create-form.tsx`
  primary picker — when NO subs exist for ANY root (initial state
  before seed migration runs), the select would be entirely empty.
  Plan mentioned the affordance per-root but the create form doesn't
  have a natural "selected root" concept (unlike the modal which
  branches by primary selection).
  **Decision:** On the create form, render a global affordance link
  above the picker when the flattened sub count is 0: "No
  subcategories exist yet. Add one → /admin/settings/categories/new".
  On the edit modal, the affordance is per-selected-root (matches
  the plan). Both link to the new-category page.

- **Concern:** `?parent=<rootId>` URL prefill on the new-category
  form. `CategoryForm` already has `useState<string>(category?.parent_id ?? "")`
  so the state model supports a default. But the page
  (`apps/web/src/app/admin/settings/categories/new/page.tsx`) is an
  RSC and needs to read `searchParams`, resolve the parent id to a
  valid root, and pass it as a new prop.
  **Decision:** Task 6 (a) makes `new/page.tsx` accept
  `searchParams: Promise<{ parent?: string }>`, resolves the id
  against the fetched roots list, and passes `defaultParentId={parentId}`
  to `CategoryForm`. (b) `CategoryForm` gets a new prop
  `defaultParentId?: string` used as the initial value for the
  `parentId` useState. Ignored when a `category` prop is present
  (edit mode already has its own default).

- **Concern:** Additional-categories checklist — should it also
  filter to level-2 only?
  **Decision:** No. Additional categories are informational labels
  (a business can appear on multiple category pages) and permitting
  both levels here matches the current shape. Only the *primary*
  slot enforces sub-only.

### Suggestions (taken or deferred)

- **Taken:** Add `businesses.category_must_be_subcategory` to the
  ApiError code catalog if such a catalog exists at
  `packages/api/src/errors.ts` (or wherever). Verify at
  implementation; if no catalog, throw a plain `ApiError` with the
  code inline like the sibling errors.
- **Taken:** The new-category form should keep the parent
  `<select>` interactive even when prefilled — admins may reconsider
  after landing on the page.
- **Deferred:** "N businesses still on primary categories" admin
  dashboard warning card. Useful drift-visibility signal but
  materially expands scope. Track as a follow-up.
- **Deferred:** Bulk-reassign UI (move all businesses from category
  A to category B without a rename). Cascade handles rename intent;
  a dedicated bulk-move flow is a future feature.
- **Deferred:** Public sidebar filtering to hide inactive subs
  (existing bug from the 2026-06-22 review). Still not in scope
  here.

## Decisions locked

Net new decisions beyond the plan:

- Level=2 enforcement lives in BOTH `createBusiness` (queries.ts) and
  `updateBusiness` (service.ts) at the top of each handler.
- Rename cascade uses `.for("update")` in Drizzle for row locking;
  if that doesn't compile, pause and escalate.
- Audit kind registration is atomic across 4 sites (union, actions
  array, label overrides, switch case).
- Existing `categories-rename-guard.test.ts` deleted in same commit
  as `assertSlugRenameAllowed`; new `categories-rename-cascade.test.ts`
  added.
- Seed list ships as the plan's proposed set verbatim; `/mlabs-code`
  pauses on Task 3 for framer@ sign-off before committing.
- Business create form gets a global "No subs exist yet" affordance;
  edit modal gets a per-selected-root affordance.
- `?parent=<rootId>` prefill implemented via a `defaultParentId`
  prop on `CategoryForm` + searchParams read on `new/page.tsx`.
- Additional-categories checklist is NOT filtered to subs — it
  remains multi-level.

## Implementation plan

Ordered atomic tasks for `/mlabs-code`.

### Task 1: Register `business.category_slug_cascaded` audit kind

- **Files:**
  - `packages/validators/src/audit-meta.ts` (edit)
  - `apps/web/src/features/admin/audit/render-detail.tsx` (edit)
- **What:**
  - Add to the `AuditMeta` discriminated union:
    `| { kind: "business.category_slug_cascaded"; from: string; to: string }`
  - Add `"business.category_slug_cascaded"` to `KNOWN_AUDIT_ACTIONS`.
  - Add `"business.category_slug_cascaded": "Category renamed"` to
    `AUDIT_ACTION_LABEL_OVERRIDES`.
  - Add a `case` to the switch in `render-detail.tsx` rendering
    something like `<span>{m.from} → {m.to}</span>` (match sibling
    cases' JSX shape).
- **Acceptance:**
  - `pnpm --filter @aira/validators typecheck && pnpm --filter @aira/web typecheck` clean.
  - The `_ActionsCoverage` assertion still passes (assert `[true, true]`).
  - `KnownAuditActionSchema.parse("business.category_slug_cascaded")`
    resolves without error.

### Task 2: Rename cascade — service + op + tests

- **Files:**
  - `packages/services/src/categories/queries.ts` (edit — new
    `renameCategoryWithCascade`, extend or replace `updateCategory`)
  - `packages/services/src/categories/index.ts` (edit if it exists;
    otherwise `packages/services/src/index.ts` exports)
  - `apps/web/src/server/operations/categories-admin.ts` (edit —
    swap handler to cascade; delete `assertSlugRenameAllowed`)
  - `apps/web/tests/categories-rename-guard.test.ts` (delete)
  - `apps/web/tests/categories-rename-cascade.test.ts` (new)
- **What:**
  - New service function
    `renameCategoryWithCascade(db, { id, data: Partial<Update>, actorUserId })`:
    - `db.transaction`
    - `SELECT ... FROM category WHERE id = :id` with `.for("update")`
    - `UPDATE category SET ...` with the provided fields (delegating
      the level-recompute logic from the existing `updateCategory`)
    - If slug changed:
      `UPDATE businesses SET category = :next WHERE category = :current RETURNING id`
    - For each returned id, call `createAudit` with kind
      `business.category_slug_cascaded`, actor = ctx.userId,
      target = `{ type: "business", id }`, meta =
      `{ kind: ..., from: currentSlug, to: nextSlug }`.
    - Returns
      `{ category: Category, affectedBusinessIds: string[] }`.
  - `updateCategoryOp` handler swaps to the cascade function and
    passes `actorUserId: ctx.userId`. Delete `assertSlugRenameAllowed`
    and its export.
  - New test file mirrors the deleted one's mock-Db pattern; assert
    all four cases from the Concerns decision.
- **Acceptance:**
  - `pnpm --filter @aira/services test && pnpm --filter @aira/web test`
    both pass.
  - `grep -rn "assertSlugRenameAllowed" apps/ packages/` returns
    nothing.
- **Pause if:**
  - `.for("update")` fails to compile against drizzle-orm@0.45.2
    (verify at implementation time). If so, escalate rather than
    silently drop the row lock.

### Task 3: Seed starter subcategories migration

- **Files:**
  - `packages/db/drizzle/migrations/NNNN_seed_starter_subcategories.sql`
    (new — Drizzle will pick the next number; content is the raw
    INSERT block below)
- **What:** Add a hand-written migration file (mirrors
  `0027_category_drift_cleanup.sql` precedent). Single INSERT with
  `ON CONFLICT (id) DO NOTHING`. Stable ids
  `cat-atl-<root>-<sub-slug>`. Seed the plan's proposed set (edit
  before committing per Pause if):
  - Restaurants: `south-indian`, `north-indian`, `street-food`, `sweets-bakery`
  - Education: `language-culture`, `academic-tutoring`, `music`, `dance`
  - Events & Entertainment: `weddings`, `djs-music`, `kids-parties`, `cultural`
  - Professional Services: `legal`, `accounting`, `real-estate-agents`, `insurance`
  - Health & Wellness: `ayurveda`, `yoga-fitness`, `clinics`, `salon-spa`
  - Real Estate: `buy-sell`, `rentals`, `property-management`
  - Shopping: `grocery`, `clothing-jewelry`, `home-goods`, `gifts`
  Each row: `city_id='city-atlanta'`, `level=2`, `parent_id` = the
  matching root id from migration 0016, `active=true`, `sort_order`
  ordered within each root.
- **Acceptance:**
  - Running `pnpm db:migrate` on a fresh DB inserts the rows exactly
    once; re-running is a no-op.
  - `SELECT count(*) FROM category WHERE level=2` returns the seeded
    count.
  - Admin business detail → "Edit categories" now shows subs under
    each root in the picker.
- **Pause if:**
  - **Before writing the SQL file:** confirm the seed list with the
    user. framer@ should have final say on names/slugs since these
    become part of the app's UX vocabulary. Present the list, get
    yes/no/edit response, THEN write the SQL.

### Task 4: Sub-only enforcement in service layer

- **Files:**
  - `packages/services/src/businesses/queries.ts` (edit — add check
    inside `createBusiness`)
  - `packages/services/src/businesses/service.ts` (edit — add check
    inside `updateBusiness` at the top of the `data.category !==
    undefined` branch)
- **What:** Inside each handler, when `input.category` (create) or
  `data.category` (update) is set to a non-empty string:
  ```ts
  const cat = await categoriesService.getCategoryBySlug(db, slug);
  if (!cat || cat.level !== 2) {
    throw ApiError.badRequest(
      "businesses.category_must_be_subcategory",
      "Businesses can only be assigned to subcategories, not primary categories."
    );
  }
  ```
  Requires importing `categoriesService` (or destructuring
  `getCategoryBySlug`) in both files. In `createBusiness`, the check
  fires before the `businesses` insert. In `updateBusiness`, fires
  before the transaction. If `data.category === ""` treat as
  undefined (short-circuit).
- **Acceptance:**
  - `pnpm --filter @aira/services test` passes.
  - Manual `curl` (or a new test) confirms a POST to
    `/api/v1/admin/businesses` with `category: "restaurants"` (a
    level-1 slug) returns 400 with code
    `businesses.category_must_be_subcategory`.
  - Same POST with a valid sub slug creates successfully.

### Task 5: UI filter primary picker to subs only + affordance

- **Files:**
  - `apps/web/src/app/admin/businesses/new/page.tsx` (edit — swap
    `listCategoriesOp` → `listCategoriesTreeOp`, pass tree down)
  - `apps/web/src/features/admin/components/business-create-form.tsx`
    (edit — accept `categoryTree` prop, render primary picker with
    optgroups + subs-only options, add global affordance link)
  - `apps/web/src/features/admin/components/business-detail.tsx`
    (edit — filter `CategoryEditModal` primary select to render
    level-1 rows as `<optgroup>` **labels** only, not as pickable
    options; add per-selected-root affordance link)
- **What:**
  - `apps/web/src/app/admin/businesses/new/page.tsx`: mirror the
    2026-06-22 pattern — build a `categoryTree` from the tree-op
    response (filter to active roots + active children), keep the
    flat `categories` for any lookup usage, pass both into the form.
  - `business-create-form.tsx`:
    - New prop `categoryTree: CategoryTreeOutput["tree"]`
      alongside the existing `categories: Category[]`.
    - Primary picker `<select>` render:
      - No standalone `<option value={root.slug}>` for roots.
      - For each `{ root, children }` with children present, emit
        `<optgroup label={root.name}>` containing child options.
      - Roots with no children contribute nothing.
    - Global affordance: if the total sub count is 0, render
      `<Link href="/admin/settings/categories/new">No subcategories
      exist yet. Add one →</Link>` above the picker.
    - Initial `category` state defaults to the first available sub
      slug (rather than `categories[0]?.slug ?? ""`).
  - `business-detail.tsx` (`CategoryEditModal`):
    - In the primary `<select>` loop, drop the standalone
      `<option value={root.slug}>` line and keep only the
      `<optgroup>` block.
    - Add a per-root affordance: when the currently-selected primary
      is a root or when a root has no children, render a small
      helper link under the picker pointing at
      `/admin/settings/categories/new?parent=<rootId>`.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck && lint` clean.
  - Manually opening `/admin/businesses/new` on a DB with the seeded
    subs shows a picker of subs grouped under their parent roots; no
    root is selectable as primary.
  - The Edit categories modal shows subs only in the primary select;
    when a root has no active children, the affordance link renders.
- **Pause if:**
  - The visual result of "roots as optgroup labels only" looks
    broken on Safari (empty labelled groups). Test in dev browser
    first. If broken, escalate for a design decision — falling back
    to a bulleted subheading pattern is one alternative.

### Task 6: `?parent=<rootId>` prefill on new-category form

- **Files:**
  - `apps/web/src/app/admin/settings/categories/new/page.tsx` (edit
    — read searchParams, resolve parent id, pass as prop)
  - `apps/web/src/features/admin/components/category-form.tsx`
    (edit — add `defaultParentId?: string` prop, initialize
    `parentId` state from it)
- **What:**
  - `new/page.tsx` becomes:
    ```tsx
    interface PageProps { searchParams: Promise<{ parent?: string }> }
    export default async function NewCategoryPage({ searchParams }: PageProps) {
      const sp = await searchParams
      const res = await apiServerFetch(listCategoriesAdminOp, { input: {} })
      const roots = res.data?.tree.map(n => n.root) ?? []
      const validParent = sp.parent && roots.some(r => r.id === sp.parent) ? sp.parent : undefined
      return (
        <AdminFormModal title="New category" backHref="/admin/settings/categories">
          <CategoryForm roots={roots} defaultParentId={validParent} />
        </AdminFormModal>
      )
    }
    ```
  - `CategoryForm`:
    - Add prop `defaultParentId?: string`.
    - `useState<string>(category?.parent_id ?? defaultParentId ?? "")`
      — edit-mode wins over URL prefill (edit already has its own
      default), create-mode uses the URL prefill.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` clean.
  - Visiting `/admin/settings/categories/new?parent=cat-atl-restaurants`
    lands with the Parent category select pre-populated to
    Restaurants. Invalid/unknown parent id is ignored (falls back to
    "None").
  - Visiting `/admin/settings/categories/new` (no query) behaves
    unchanged.

## Open questions

Anything `/mlabs-code` should escalate rather than guess:

- Task 2's `.for("update")` compilation against drizzle-orm@0.45.2 —
  if it fails, pause and ask before dropping the row lock.
- Task 3's seed list — pause and confirm the exact names/slugs with
  the user BEFORE writing the SQL file. Don't guess.
- Task 5's Safari behavior with empty `<optgroup>` — verify manually
  before committing; pause if broken.
- If `ApiError` doesn't expose a `.badRequest(code, message)` static
  helper (the plan assumes it does), use the plain-object throw
  pattern used elsewhere in `businesses/queries.ts`:
  `throw { code: "businesses.category_must_be_subcategory", message: "...", status: 400 }`.
