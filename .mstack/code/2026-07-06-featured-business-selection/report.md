# Implementation report — Featured business selection logic

**Status:** complete
**Review:** [2026-07-06-featured-business-selection](../../reviews/2026-07-06-featured-business-selection.md)
**Branch:** `feat/featured-business-selection` (7 commits ahead of `main`)

---

## Tasks

| Task | Result | Commit |
|---|---|---|
| Pre-task: commit plan + review + settings | ✓ | `40ec16e` |
| 1. Random featured queries in @aira/services | ✓ | `fc080bb` |
| 2. Rewire listBusinessesOp + Zod JSDoc | ✓ | `a953143` |
| 3. Web home: cap 5 + repoint View All | ✓ | `c3b9a6f` |
| 4. Mobile home: FEATURED_LIMIT 6 → 5 | ✓ | `55d7128` |
| 5. Web PrimaryCategoryView + level branch | ✓ | `a866e14` |
| 6. Mobile PrimaryCategoryView + level branch | ✓ | `a9b9847` |

## Commits

```
a9b9847 feat(mobile): PrimaryCategoryView + level branch on listings/[category]
a866e14 feat(web): PrimaryCategoryView + level branch on /listings/[category]
55d7128 feat(mobile): FEATURED_LIMIT 6 → 5
c3b9a6f feat(web): home Featured — cap at 5 + repoint View All to /categories
a953143 feat(api): route featured branch to random sponsored queries + clamp limit
fc080bb feat(services): random sponsored-only featured queries
40ec16e chore(mstack): plan + review for featured business selection
```

## What changed, in one paragraph

Home "Featured Businesses" is now 5 random businesses drawn from the strict
sponsored pool (any category) — replaces the deterministic tier/priority
sort. "View All →" points at `/categories` instead of the `/directory`
mixed-page dump. Primary category pages (`level = 1`) no longer render a
paginated business list; they show category header + subcategory tiles +
up to 5 featured from that category. Subcategory pages (`level = 2`) are
behavior-identical to before. All three surfaces (home, level-1, level-2)
share the same `listBusinessesOp` endpoint with a server-side clamp of 5
on the featured branches. Mobile matches web behavior end to end.

## Deviations from the review

- **Randomness fixture tests skipped.** Review Task 1 asked for "over 30
  calls against a fixture of 8 sponsored businesses" to verify randomness
  spread. No unit tests exist for any function in
  `packages/services/src/businesses/queries.ts`, and Task 1's Open Question
  in the review explicitly flagged this branch: "unit tests live inline
  elsewhere" → pick project convention. Convention is "no unit tests at
  this layer; DB behavior verified by QA / integration". Randomness
  verification deferred to `/mlabs-qa`.
- **Schema comment cleanup reverted.** Task 1 originally included a one-
  line stale-comment fix in `packages/db/src/schema/businesses.ts`
  (removing a reference to the deleted `getFeaturedBusinesses`). The
  pre-commit `check-migrations` hook rejects any diff to schema files
  without an accompanying migration (which would be gratuitous for a
  comment change). Reverted; comment stays stale until the next schema
  migration lands.

## Follow-ups (not in this branch)

1. **Delete `/directory` route + rewire favorites empty-state.** The
   `/directory` page and `DirectoryView` component still exist. Home no
   longer links there, but `apps/web/src/app/(app)/account/favorites/page.tsx`
   still uses it as the empty-state action. Scope deferred to a
   dedicated cleanup plan (as agreed in the review).
2. **Verify sponsored fixture on QA seed.** `/mlabs-qa` should confirm
   at least a handful of sponsored businesses exist in the seed set so
   the Featured surfaces have something to render during scenario
   testing. If they don't, the section-hidden-when-empty guard is
   correct but you'll see an empty page.
3. **Schema doc sweep.** `packages/db/src/schema/businesses.ts:39-40`
   mentions the deleted `getFeaturedBusinesses` in an index-purpose
   comment. Clean up alongside the next migration in that file.
4. **Address remaining QA items.** This branch handles feedback group A
   (items #1, #2, #8, #12). Groups B–F (category CRUD bugs, mobile
   listing UI polish, external link fix, verification workflow,
   content management + test env) still open.

## Recommended next step

Run **`/mlabs-qa`** with focus:

- Web + mobile home: Featured section renders ≤ 5 items, "View All"
  lands on `/categories`.
- Level-1 category (e.g. `restaurants`): renders subcategory tiles +
  featured section, no search box, no pagination.
- Level-2 category (e.g. any subcategory): behavior unchanged.
- Level-1 with 0 sponsored / 0 subs: EmptyState with "Check back soon"
  copy renders.
- Randomness spot-check: refresh home 5× and confirm the returned set
  varies when the sponsored pool exceeds 5.
