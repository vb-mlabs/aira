# Implementation report — Admin Edit categories subcategory selection

**Status:** complete
**Started:** 2026-06-22
**Branch:** feat/qa-test-accounts-seed
**Review:** [2026-06-22-admin-edit-categories-subs](../../reviews/2026-06-22-admin-edit-categories-subs.md)

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | tree op + filtered pass-down | ✓ done | `efe07d8` |
| 2 | CategoryEditModal subs render | ✓ done | `291c5c1` |

## Commits

Precursor (clean-tree before /mlabs-code):

- `c17a494` chore(admin): remove Owner has/none filter from businesses list
- `1a6156f` chore(admin): restore Owner section and reorder after Core Fields
- `66b20ed` docs(mstack): plan + review for admin edit categories subs

Implementation:

- `efe07d8` feat(admin): fetch full category tree on business detail page
- `291c5c1` feat(admin): CategoryEditModal renders subcategories

## What shipped

The admin Edit categories modal at `/admin/businesses/[id]` now
surfaces level-2 subcategories in both the Primary dropdown and the
Additional checkbox grid:

- **Data flow.** The page swapped from the roots-only
  `listCategoriesOp` to `listCategoriesTreeOp`, deriving a flat list
  (used by `CategoryPreview` for slug→name lookup, so a listing whose
  primary points at a since-deactivated category still resolves to
  a name) and an active-filtered tree (passed to the modal). Inactive
  branches are dropped wholesale; otherwise individually-inactive
  children get dropped from their branch.
- **Primary dropdown.** Each root renders as a standalone `<option>`
  immediately followed by an `<optgroup label={root.name}>` of its
  active children. Empty optgroups are omitted (Safari would render
  the labelled cluster otherwise).
- **Additional grid.** Each branch renders the root row at default
  indent, then each child row at `pl-6` with a leading `↳ ` prefix
  in the visible text — both indentation and prefix communicate the
  hierarchy.
- **Save path.** Unchanged. The existing toggle/cleanedExtras logic
  works by id; switching primary to a sub slug writes the sub's slug
  to `businesses.category`; checking a sub adds a `business_category`
  join row pointing at the sub's id.

## Verification done

- `pnpm --filter @aira/web typecheck` — green after T1 (with the
  optional prop kept loose) and after T2 (with the prop tightened to
  required).
- ESLint on the touched file — no new warnings.
- `CategoryPreview` is untouched; it still resolves both primary and
  extras from the unfiltered `categories` prop, so listings showing
  a sub as primary already render the right label.

## Follow-ups (not done — explicit out-of-scope per plan)

- **Add Business modal at `/admin/businesses/new` has the same bug.**
  Same one-line op swap (`listCategoriesOp` → `listCategoriesTreeOp`
  + flatten) plus the same nested render in
  `apps/web/src/features/admin/components/business-create-form.tsx`.
  Tracked as a separate follow-up plan. Run /mlabs-plan when you want
  it shipped.
- **Public sidebar's inactive-row rendering.** `getCategoryTree`
  passes `includeInactive: true` to `getCategoriesByCity`, and the
  sidebar at `apps/web/src/app/(app)/_components/app-sidebar.tsx`
  doesn't filter active before rendering. Pre-existing issue — out
  of scope here. Document or fix in a separate plan if a real user
  hits it.
- **No live exercise.** I didn't drive Playwright through the
  primary-select-then-save flow or check that a sub-as-primary
  round-trips. Code-path inspection covers the change but
  `/mlabs-qa` is the right next step to actually exercise it on a
  running app.

## Recommended next step

`/mlabs-qa --focus "admin edit categories: primary and additional with subs"` to:

1. Open `/admin/businesses/[id]` for any business with the new tree.
2. Confirm Primary dropdown shows `<optgroup>` clusters.
3. Confirm Additional grid shows indented `↳ ` rows.
4. Set a sub as primary, save, reload, and confirm it persists.
5. Check a sub in additional, save, reload, and confirm the chip
   shows in the preview.
6. (Optional) Verify inactive categories don't appear in either
   control.
