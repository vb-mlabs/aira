# Review: Admin Edit categories — subcategory selection

**Date:** 2026-06-22
**Slug:** 2026-06-22-admin-edit-categories-subs
**Plan reviewed:** [2026-06-22-admin-edit-categories-subs.md](../plans/2026-06-22-admin-edit-categories-subs.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Plan is approved with all five open questions locked. The fix is a
narrow data-source swap on the admin business detail page
(`listCategoriesOp` → `listCategoriesTreeOp`), pass-through of the
tree shape as a new prop alongside the existing flat list, and a
nested `<optgroup>` + indented checkbox render inside
`CategoryEditModal`. No service / validator / DB changes. Two files
touched, both already in the admin layer. UI-Significant flag is
**no** (only two files, both edits to existing components, no new
routes), so mockup gate is skipped.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Branch handling when a root category is inactive. If a
  level-1 root is `active: false`, we shouldn't render it OR its
  children in the admin Edit modal. The tree op returns inactive
  rows in its response (the underlying `getCategoryTree` calls
  `getCategoriesByCity` with `includeInactive: true`), so the page
  has to filter.

  **Decision:** Page filters inactive **at branch granularity** — if a
  root's `active === false`, drop the root AND its children. If a
  root is active but a specific child is inactive, drop only that
  child. Implementation: build the filtered tree once at the page;
  pass the filtered structure down; the modal renders what it gets.
  The flat `Category[]` prop (still used by `CategoryPreview` for
  name lookups) must keep the unfiltered values so a listing whose
  primary points to a since-deactivated category still resolves to
  a name (no UI gap). Filter on the **edit-modal-facing tree**, not
  on the lookup array.

- **Concern:** Plan's "rebuild groups in modal" path (Q1, Option B)
  would force the modal to do a `Map<string, Category[]>` regroup
  every render. The recommended path (Option A — pass tree shape as
  a new prop) sidesteps the regroup entirely.

  **Decision:** **Pass tree as a new prop.** `BusinessAdminDetail`,
  `CoreFieldsSection`, and `CategoryEditModal` each gain a single
  new prop named `tree: CategoryTreeOutput["tree"]`. The existing
  `categories: Category[]` prop stays unchanged for
  `CategoryPreview`'s name-resolution path. Prop API widens by one
  field; render code stays minimal.

- **Concern:** The plan flagged that `getCategoryTree` returns
  inactive rows. The **public sidebar** (`apps/web/src/app/(app)/_components/app-sidebar.tsx`)
  also renders the tree without an active filter, so inactive subs
  might be visible on the public side today. That's outside the
  brief.

  **Decision:** Out of scope. Document as a follow-up. We do not
  touch the sidebar; we only filter at the admin edit modal's page
  boundary. If the user later confirms the sidebar leak, that's a
  separate small plan.

- **Concern:** The same bug exists on the **Add Business** page
  (`/admin/businesses/new`) and `business-create-form.tsx`. The
  primary-category dropdown there also reads `listCategoriesOp` and
  shows roots only.

  **Decision:** Out of scope per the user brief. Track as an
  immediate follow-up plan slug:
  `2026-06-?-admin-new-business-category-subs`. The fix is the same
  shape — same op swap, same render change — so the path is
  well-trodden once this plan lands.

- **Concern:** Visual treatment of level-2 rows in the Additional
  checkbox grid.

  **Decision:** `pl-6` indent + leading "↳ " prefix on the label.
  Reads as hierarchy without extra chrome. The "↳ " character is
  passed as text content so it ends up in the accessible name —
  acceptable v1 a11y signal until/unless a real tree widget arrives.

### Suggestions (taken or deferred)

- **Suggestion (taken):** When constructing the `<optgroup>` block,
  emit the root as a standalone `<option>` **above** its
  `<optgroup>`, not inside it. Native browsers don't nest options
  inside optgroups well; this layout reads as "Restaurants" (root
  selectable) then a labelled cluster of indented children.
- **Suggestion (taken):** Empty `<optgroup>` elements (root with no
  active children) must be omitted entirely — Safari renders an
  empty labelled cluster as a stray heading.
- **Suggestion (deferred):** Adding `aria-level` / tree-widget
  semantics. Out of scope; the visual indent + character prefix is
  acceptable for an admin-only flow with one level of nesting.

## Decisions locked

Net new decisions made during review:

1. **Data flow:** page fetches `listCategoriesTreeOp`, passes a new
   `tree: CategoryTreeOutput["tree"]` prop down to
   `CategoryEditModal` (alongside the existing flat
   `categories: Category[]` which stays for `CategoryPreview`).
2. **Inactive filtering:** at the page, before passing the tree
   down. Branch-level: if root is inactive, drop the whole branch;
   otherwise drop individually-inactive children. The flat
   `categories` prop for `CategoryPreview` is NOT filtered (so
   stale references still resolve to names).
3. **Visual treatment:** level-2 rows in the Additional grid get
   `pl-6` + leading "↳ ".
4. **Optgroup structure:** root as a standalone `<option>` above its
   `<optgroup>` of children. Empty `<optgroup>` blocks are omitted.
5. **Scope:** Add Business modal stays OUT of scope; follow-up
   plan slug noted above.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Two atomic
commits.

### Task 1: Page swaps to tree op + filtered tree pass-down

- **Files:**
  - `apps/web/src/app/admin/businesses/[id]/page.tsx` (edit)
- **What:**
  - Import: change `listCategoriesOp` → `listCategoriesTreeOp`.
  - Swap the `apiServerFetch` call accordingly.
  - Build two derived values:
    - `categoriesFlat: Category[]` — flattened from the unfiltered
      tree (`tree.flatMap(({ root, children }) => [root, ...children])`).
      Used by `CategoryPreview` so stale-but-still-set primary slugs
      still resolve to a human name.
    - `activeTree: CategoryTreeOutput["tree"]` — filtered:
      `tree
        .filter(({ root }) => root.active)
        .map(({ root, children }) => ({
          root,
          children: children.filter((c) => c.active),
        }))`.
      Used by the modal's options.
  - Pass both into `BusinessAdminDetail` — `categories={categoriesFlat}`
    (unchanged shape) and a new prop `categoryTree={activeTree}`.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.
  - Opening `/admin/businesses/[id]` in dev fetches the tree
    endpoint instead of the roots-only one (verify in the network
    tab or by `console.log`-ing once before removing).
  - `BusinessAdminDetail` receives both props; nothing renders
    differently yet because the modal isn't using `categoryTree`
    until Task 2 (intermediate state is harmless — the prop is
    unused).

### Task 2: CategoryEditModal renders tree + indented subs

- **Files:**
  - `apps/web/src/features/admin/components/business-detail.tsx` (edit)
- **What:**
  - Add `categoryTree: CategoryTreeOutput["tree"]` to:
    - `BusinessAdminDetailProps`
    - `CoreFieldsSection`'s props
    - `CategoryEditModal`'s props
  - Pipe the prop down through the same chain that the existing
    `categories` prop uses.
  - In `CategoryEditModal`:
    - **Primary `<select>` render:** replace the single
      `categories.map(...)` with a loop over `categoryTree`. For
      each `{ root, children }`:
      - Emit `<option key={root.id} value={root.slug}>{root.name}</option>`.
      - If `children.length > 0`, emit
        `<optgroup key={root.id + '-grp'} label={root.name}>` …
        `</optgroup>` containing
        `<option key={child.id} value={child.slug}>{child.name}</option>`
        for each child. Otherwise, no optgroup.
    - **Additional checkbox grid:** replace the single
      `categories.map(...)` with a loop over `categoryTree`. For
      each `{ root, children }`, render:
      - The root row at default indent (unchanged styling).
      - Each child row with `pl-6` on the wrapping `<label>` and a
        leading `"↳ "` prefix in the visible text:
        `<span>↳ {c.name}</span>`.
    - The existing toggle logic (`toggleExtra(id)`) and the
      `cleanedExtras` save path stay unchanged — both work by id, so
      adding subs Just Works.
  - `CategoryPreview` is **not** touched; it continues to use the
    flat `categories` prop for lookups.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.
  - `pnpm --filter @aira/web exec eslint src/features/admin/components/business-detail.tsx`
    reports no new warnings.
  - Manual: open `/admin/businesses/[id]` for any business →
    "Edit categories":
    - Primary dropdown shows roots followed by `<optgroup>` clusters
      of subs.
    - Additional grid shows subs indented with "↳ " prefix under
      their root.
    - Inactive roots and their children do not appear.
    - Selecting a sub as primary and saving persists the sub slug
      (verify by reloading).
    - Checking a sub in additional and saving persists a join row
      (verify by reloading; chip shows in the preview).

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- None. All five plan open questions are resolved in "Decisions
  locked" above.
