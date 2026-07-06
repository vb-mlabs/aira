# Implementation report — Category CRUD bugs (group B)

**Status:** complete (5 done, 1 skipped by user choice, 1 polish)
**Review:** [2026-07-06-category-crud-bugs](../../reviews/2026-07-06-category-crud-bugs.md)
**Branch:** `feat/featured-business-selection` (now holds both group A + group B)

---

## Tasks

| Task | Result | Commit |
|---|---|---|
| Pre-task: plan + review + learnings | ✓ | `9d8c8cc` |
| 1. Register audit kind | ✓ | `6f1bcaf` |
| 2. Rename cascade + delete guard + swap tests | ✓ | `7af2ae6` |
| 3. Seed starter subcategories | ⊘ skipped (user picked "affordance only") | — |
| 4. Sub-only enforcement in service layer | ✓ | `0b86965` |
| 5. UI filter primary picker + affordance | ✓ | `2d4fe79` |
| 6. `?parent=<rootId>` prefill on new-category form | ✓ | `3cefaf4` |
| Polish: pass `?parent=` from modal affordance | ✓ | `928f402` |

## Commits

```
928f402 fix(admin): pass ?parent= to modal affordance link
3cefaf4 feat(admin): ?parent=<rootId> prefill on new-category page
2d4fe79 feat(admin): sub-only primary picker + Add-subcategory affordance
0b86965 feat(services): enforce sub-only category on business create + update
7af2ae6 feat(services): slug-rename cascade replaces assertSlugRenameAllowed
6f1bcaf feat(audit): register business.category_slug_cascaded kind
9d8c8cc chore(mstack): plan + review for category CRUD bugs (group B)
```

## What changed, in one paragraph

Admin can now rename any category freely — the old
`assertSlugRenameAllowed` guard (which threw as soon as any business
referenced the old slug, the entire cause of QA feedback #5) is gone,
replaced by a single-transaction cascade that renames the category
row AND every `businesses.category` text-column reference in one go,
writing one `business.category_slug_cascaded` audit row per affected
business. Businesses can only ever live on subcategories now (#13):
service-layer check rejects level-1 slugs on create + update, and the
admin picker filters primaries out with an "Add a new subcategory
under <Root> →" affordance link that opens the new-category page
with the parent already selected. #6 (no subs in picker) resolves the
moment the affordance link produces its first sub — no seeded starter
set was written per the user's "affordance only" choice.

## Deviations from the review

- **Task 3 skipped by user choice.** Review proposed 27 seeded subs
  with a review-time pause; user picked "affordance only" so admins
  build their own taxonomy from scratch. The UI already handles the
  zero-subs empty state on both create form and edit modal.
- **Extra polish commit (928f402)** for wiring `?parent=<rootId>`
  through the modal affordance link. Not called out as a standalone
  task in the review but closes the Task 5 ↔ Task 6 loop (Task 6's
  receiver would have been unreached from the natural entry point
  without it).

## Follow-ups (not in this branch)

1. **Admin dashboard warning for drift.** "N businesses still on
   primary-only categories" indicator — deferred in the review. Would
   make the natural-drift-on-edit resolution visible.
2. **Bulk-reassign UI.** For admins who want to move many businesses
   from category A to category B without renaming A. Not asked for.
3. **Public sidebar inactive-sub leak.** Pre-existing bug from the
   2026-06-22 review — still not addressed.
4. **Test coverage for `assertCategoryIsSubcategory`.** The new
   service guard added in Task 4 isn't unit-tested. Follows the
   existing pattern for `businesses/queries.ts` (no unit tests on
   that file), but a unit test targeting just this guard would be a
   fast win for `/mlabs-qa` to add.
5. **Address remaining QA items.** Groups C–F still open (mobile
   listing UI polish, external link fix, verification workflow,
   content management + test env).

## Recommended next step

Run **`/mlabs-qa`** with focus on the category admin flow:

- Rename `Restaurants` → `Food` with businesses assigned. Confirm all
  businesses now render at `/listings/food` (subcategory of the new
  root) or wherever the admin routes them, and that the audit log
  timeline shows one row per affected biz.
- Attempt to create a business with `category` = a level-1 slug via
  the API (curl). Should 400 with `businesses.category_must_be_subcategory`.
- Admin flow: create a new sub via the modal affordance, then assign
  a business to it. Full round-trip.
- Empty-state: on a fresh admin session with 0 subs anywhere, confirm
  the create form shows the "No subcategories exist yet. Add one →"
  affordance instead of an empty picker.
