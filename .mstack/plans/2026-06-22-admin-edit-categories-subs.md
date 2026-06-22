# Plan: Admin Edit categories — subcategory selection

**Date:** 2026-06-22
**Slug:** 2026-06-22-admin-edit-categories-subs
**Status:** reviewed
**Author:** framer@millionlabs.co.uk

---

## Problem

The admin Edit categories modal on `/admin/businesses/[id]` only shows
**root** categories in both the Primary dropdown and the Additional
checkbox grid. Subcategories (level 2 — "Restaurant → Indian", etc.)
exist in the DB and render on the public sidebar, but admins literally
cannot pick them, so they can't re-bucket a listing into a sub once
it's been created. User-reported: "Created one restaurant in main
category, later wanted to move to subcategory but no subcategory is
getting listed."

Root cause is `apps/web/src/server/operations/categories.ts:33` —
`listCategoriesOp` calls `getRootCategoriesForCity`, which has a
hard-coded `level = 1` filter (`packages/services/src/categories/queries.ts:76`).
That op is the source feeding `BusinessAdminDetail` → `CategoryEditModal`.

Benefits of fixing:
- Admins can re-categorise listings into any active node in the
  category hierarchy without DB surgery.
- The DB already supports level-2 categories — this just exposes them
  in the only surface currently blocked.
- Brings the admin Edit modal in line with the user-facing sidebar
  (which uses `listCategoriesTreeOp` and renders both levels).

Success: opening Edit categories on a listing shows both the root and
all its active subcategories as selectable in the Primary dropdown
(grouped under their parent via `<optgroup>`) and the Additional grid
(indented under their parent). Saving correctly writes a sub's slug to
`businesses.category` and/or a sub's id to a `business_category`
join row.

## Scope

**In:**
- Admin business detail page (`apps/web/src/app/admin/businesses/[id]/page.tsx`)
  — swap the data fetched for the Edit categories modal from
  `listCategoriesOp` (roots-only) to `listCategoriesTreeOp` (roots
  + children), flatten the tree into a single ordered list at the
  page level, and pass it down as today.
- `CategoryEditModal` (`apps/web/src/features/admin/components/business-detail.tsx`)
  — accept the flattened list (no shape change to the prop), but
  render:
  - **Primary dropdown** — `<option>` per root, immediately followed by
    `<optgroup label="<root name>">` containing its children. Each
    child option uses the child's slug as `value`.
  - **Additional checkbox grid** — keep the existing grid; indent
    level-2 entries (e.g. `pl-6` + leading "↳ ") so the hierarchy
    reads without ambiguity. Order is root → its children → next
    root → its children.
- `CategoryPreview` (same file) — unchanged in behavior; it already
  resolves names by slug/id from the categories prop, so it just
  starts finding subs.

**Out (deferred):**
- The **Add Business modal** at `/admin/businesses/new`
  (`apps/web/src/app/admin/businesses/new/page.tsx`) has the same bug
  (its Primary dropdown is also fed by `listCategoriesOp`). Per the
  user brief this is out of scope; flag as a follow-up plan.
- Public consumers of `listCategoriesOp` (`apps/web/src/app/(app)/listings/[category]/page.tsx`,
  `apps/web/src/app/(app)/categories/page.tsx`,
  `apps/web/src/app/(app)/directory/page.tsx`) — stay on roots-only.
- Mobile app surfaces.
- Any change to `listCategoriesOp`'s contract or its underlying
  `getRootCategoriesForCity` query — they keep their current "roots
  only" behavior.
- Any new validator schemas, new service functions, or DB migrations.
- Changing the underlying save format (still slug for primary, id
  array for extras).

## Approach

The category tree op already returns exactly what we need —
`listCategoriesTreeOp` → `getCategoryTree(db, cityId)` returns
`{ tree: Array<{ root: Category; children: Category[] }> }` with each
root and its children grouped. Public sidebar already uses it.

The admin detail page currently does:

```tsx
apiServerFetch(listCategoriesOp, { input: {} })   // roots only
```

Change to:

```tsx
apiServerFetch(listCategoriesTreeOp, { input: {} })
```

Then flatten at the page:

```tsx
const categories = treeRes.data?.tree.flatMap(({ root, children }) =>
  [root, ...children],
) ?? []
```

That `categories: Category[]` is the same prop shape `BusinessAdminDetail`
expects today. No prop-type change. No new validators or ops needed.

Inside `CategoryEditModal`:

- **Primary dropdown.** Replace the single flat `.map()` of `<option>`
  with a nested render: walk the tree (rebuild it locally from the
  flat list, or pass the tree shape down — see Open question Q1).
  Each root becomes an `<option>` plus an `<optgroup label={root.name}>`
  containing its children's `<option>`s. Option `value` is the slug.
- **Additional checkbox grid.** Keep the existing 2-column grid; for
  each row, if `c.level === 2`, prepend "↳ " to the label and apply
  `pl-6` (or similar) on the wrapper. Use the flat ordered list as-is.

`CategoryPreview` already resolves both primary and extras by name
lookup, so it transparently works for subs once subs are in the list.

The `getCategoryTree` query already returns `includeInactive: true`
internally and the consumer filters by `active` field. We need active
only on the admin Edit modal, so we filter `c.active` when building
the dropdown/grid options (or filter the flattened list once at the
page). See Open question Q2 — the current public sidebar likely
shows inactive too and that's a pre-existing question, not ours to
fix here.

**Alternatives considered:**

- **Change `listCategoriesOp` to return all active categories.**
  Rejected — three public surfaces depend on the roots-only contract
  (directory page, categories page, public listings page). Widening
  it would surface subs in those UIs as flat siblings of roots
  without their parent context, which is worse than the bug we're
  fixing.

- **Add a new `listAllCategoriesForCityOp` (admin-only).** Workable
  but heavier than needed — adds a new op, a new validator entry,
  and a new query path when `listCategoriesTreeOp` already returns
  exactly the right shape and is already admin-callable. Keeps the
  service surface tighter to use what exists.

- **Flatten inside `CategoryEditModal` instead of the page.** Loses
  the tree shape at the point we want it for grouping. The page is
  the right place to do the projection because (a) it owns the
  `apiServerFetch`, (b) RSCs are the natural projection layer, and
  (c) keeping the modal's `categories: Category[]` prop unchanged
  means smaller diff.

## Data model changes

None. The category schema already supports level-2 with parent_id.
The fix is UI-side selection of what the schema already permits.

## Files to touch

**New:**
- None.

**Edit:**
- `apps/web/src/app/admin/businesses/[id]/page.tsx`
  - Swap import: `listCategoriesOp` → `listCategoriesTreeOp`.
  - Swap `apiServerFetch` call to the tree op.
  - Flatten the tree response into the `categories` array passed to
    `BusinessAdminDetail`.
- `apps/web/src/features/admin/components/business-detail.tsx`
  - `CategoryEditModal`:
    - Reconstruct the root → children grouping from the flat
      `categories: Category[]` prop (one pass: roots first, then
      group children by `parent_id`). Or accept a second prop with
      the pre-computed grouping — Q1.
    - Render Primary `<select>` with `<option>` (root) followed by
      `<optgroup>` containing children's `<option>`s, per group.
    - Render Additional checkbox grid with indented level-2 rows.

## Edge cases

- **Inactive subs.** `getCategoryTree` includes inactive (per the
  service's `includeInactive: true` internal call). The admin Edit
  modal should still filter to active in the dropdown + grid — admins
  shouldn't be able to assign a listing to a category they've
  deactivated. Apply `categories.filter(c => c.active)` at the page
  (or in the modal). The public sidebar's current behaviour is a
  separate question (Q2).
- **A sub whose root is inactive.** The tree still nests it under the
  root entry. We should treat the whole branch as inactive in the
  admin modal — filter both root and its subs out.
- **Primary already set to a sub.** When the modal opens, the
  `<select value={category}>` must match an option even if the
  business's current category is a sub. The new render does include
  sub options, so this works automatically — but verify on real
  data with a manually-edited business that already has a sub slug.
- **Primary appearing in extras.** The existing save logic strips the
  primary's id from `cleanedExtras` to avoid a redundant join row.
  That logic still works because it uses id lookup, not slug.
- **Optgroup ordering.** Children inside an optgroup follow the
  `getCategoryTree` order (sort_order, then name). Same source.
- **Pre-existing data integrity.** If a business already lives in
  an extra that's now level 2 (manually inserted), this fix makes
  it visible/editable for the first time. No backfill needed.
- **Empty subs.** If a root has no children, the `<optgroup>` should
  be omitted (an empty optgroup renders as a stray label with no
  options under it on some browsers).
- **A11y.** Indentation via `pl-6` is visual only. The "↳ " prefix
  provides screen-reader hint that the row is a child. Acceptable
  for v1; a proper `aria-level` would need a tree widget.

## Acceptance criteria

- [ ] On `/admin/businesses/[id]`, opening the Edit categories modal
      shows the Primary dropdown with `<optgroup>` sections — one
      per root — that contain each root's active children.
- [ ] On the same modal, the Additional categories checkbox grid
      lists every active category (roots + subs); level-2 rows are
      visually indented and prefixed with "↳ ".
- [ ] Selecting a sub as Primary and saving writes the sub's slug to
      `businesses.category`. Verify by reloading the page and seeing
      the sub as the primary.
- [ ] Checking a sub in Additional, saving, and reloading produces a
      `business_category` join row pointing to the sub's id.
- [ ] Inactive categories (root or sub) do not appear in either
      control.
- [ ] The CategoryPreview chip strip continues to render the correct
      primary + extras with sub names rendered as for roots.
- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] No regression on `/admin/businesses/new` (still uses
      `listCategoriesOp` and still shows roots-only — that's the
      out-of-scope follow-up, not regressed by this change).
- [ ] Public sidebar (`(app)/layout.tsx`) renders unchanged — still
      consuming `listCategoriesTreeOp` directly, untouched.
- [ ] No change to public consumers of `listCategoriesOp`
      (`/listings/[category]`, `/categories`, `/directory`).

## Open questions

For `/mlabs-review` to resolve before implementation:

- **Q1 — Pass tree shape or flatten?** The plan flattens at the page
  for prop-shape minimalism, then has the modal rebuild root/children
  groups locally for the `<optgroup>` render. Alternative: pass the
  pre-grouped tree shape as a second prop (`tree: CategoryTreeOutput["tree"]`)
  alongside the flat list. The latter avoids the second pass inside
  the modal but expands the prop API on `BusinessAdminDetail`. Plan
  recommendation: flatten at page, regroup in modal — kept tight,
  10 lines of `Map<string, Category[]>` build. Reviewer picks.

- **Q2 — Inactive subs in public sidebar.** `getCategoryTree` calls
  `getCategoriesByCity` with `includeInactive: true`, which means
  the public sidebar may render inactive subs. That's not introduced
  by this change but is worth noting as a separate concern. Confirm
  this plan does NOT touch that code path; if the reviewer wants to
  fix it, that's a follow-up plan.

- **Q3 — Add Business modal scope.** Same bug exists in
  `/admin/businesses/new`. Per user brief it's out of scope, but it
  is the same one-line swap (`listCategoriesOp` → `listCategoriesTreeOp`
  + flatten). Reviewer can promote it into scope if they think the
  user meant "every admin category picker" rather than literally
  the Edit modal.

- **Q4 — Should we also add `<optgroup>` to the
  `business-create-form.tsx` category picker?** Same answer as Q3;
  depends on whether scope expands. Out of scope per plan.

- **Q5 — Visual treatment of nested rows.** Plan suggests `pl-6` +
  "↳ ". Alternatives: `pl-8` with a slim left border, or a small
  chevron icon. Defer to reviewer; the indentation level needs to
  read clearly in a 2-column grid.
