# Review: Featured business selection logic

**Date:** 2026-07-06
**Slug:** 2026-07-06-featured-business-selection
**Plan reviewed:** [2026-07-06-featured-business-selection.md](../plans/2026-07-06-featured-business-selection.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** claude

---

## Summary

Plan is implementable as written with minor tightening. The two mechanical
edits (home cap 5 + View All → /categories) and the two service query
additions are straightforward. The one place the plan under-specifies is the
primary-vs-subcategory branch in `/listings/[category]` — the review locks
that this route already has all the infrastructure it needs
(`listCategoriesRootsOp` returns roots + subsByRoot; `getCategoryBySlugOp`
returns the `level` field), so no new op is required. All five open
questions from the plan are resolved below.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan doesn't reference `listCategoriesRootsOp`, which already
  exists (`apps/web/src/server/operations/categories.ts:39`) and returns
  `{ categories, counts, subsByRoot }`. Mobile listings/[category].tsx uses
  it today via `useCategories()`. The primary-category view needs subs, and
  writing new plumbing would duplicate this op.
  **Decision:** Use `listCategoriesRootsOp` on both web + mobile. No new op.
  Web `/listings/[category]` currently only fetches `listCategoriesOp` (roots
  only, no subs) — swap to `listCategoriesRootsOp` for the level-1 branch.

- **Concern:** `getFeaturedBusinesses` grep confirms exactly two callers,
  both in `listBusinessesOp` (`apps/web/src/server/operations/businesses.ts`
  lines 99, 116). Plan's open question #2 asked whether to delete it.
  **Decision:** Delete `getFeaturedBusinesses` in the same commit that
  adds `getFeaturedRandom` + `getFeaturedRandomForCategory`. Also remove the
  export from `packages/services/src/businesses/index.ts`. No lingering
  callers.

- **Concern:** `BusinessListInputSchema.featured` field comment is stale —
  says "returns only tier1/tier2 businesses ordered by tier", which was
  already inaccurate (query includes tier3 paid-active). After this change
  the semantics are strict-sponsored-random.
  **Decision:** Rewrite the JSDoc to: "When true, returns a randomised
  selection of businesses with an active sponsorship in scope. Combined
  with `category`, scopes to sponsorships whose category_id matches."

- **Concern:** `ORDER BY random() LIMIT n` across a query that JOINs
  sponsorships can yield duplicate business rows when a business holds
  multiple sponsorships in the target window.
  **Decision:** Use `EXISTS`-style predicate (same shape as the existing
  `homepageSponsoredFlag` helper) rather than a JOIN, so the row set is
  business-unique before `random()` is applied. The pattern already lives
  in the codebase — reuse it verbatim.

- **Concern:** Randomness in tests — asserting "orderings vary" flakes if
  the pool is small.
  **Decision:** Test contract is (a) returned set is a **subset** of
  the active-sponsored pool, and (b) length ≤ limit. Randomness is
  demonstrated by running the query 30 times and asserting the union of
  returned id-sets is strictly larger than any single call (skipped when
  pool ≤ limit). No fixed-seed hooks needed.

- **Concern:** Mobile home does not render a "View All" link at all, so
  the `/directory` re-point is a web-only change. Plan implied a
  cross-app fix — clarifying scope.
  **Decision:** Web-only for View All. Mobile home only needs the
  `FEATURED_LIMIT: 6 → 5` bump in `apps/mobile/features/listings/hooks.ts`.

- **Concern:** `apps/web/src/app/(app)/account/favorites/page.tsx` still
  links to `/directory` in the empty-state action. Plan defers deletion of
  `/directory`.
  **Decision:** Defer as agreed. This review does not touch favorites;
  a follow-up plan can drop `/directory` + rewire favorites CTA to
  `/categories` together.

- **Concern:** Primary-category view when 0 sponsored + 0 subs — empty
  category shell is confusing UX.
  **Decision:** When the category has 0 active subs AND 0 sponsored, show
  an EmptyState (borrow the pattern from mobile's existing
  `EmptyState` component). Copy: "This category is being set up. Check
  back soon." Mirrors mobile's existing "No categories available yet."
  language.

### Suggestions (taken or deferred)

- **Taken:** Add a server-side cap so `limit > 5` on the featured branches
  is clamped to 5. Rationale: the input schema allows up to 100, and callers
  might pass a higher value expecting more. Cap keeps behavior consistent
  with the product spec ("5 randomly selected").
- **Taken:** Tile vs Row for the subcategory grid — reuse
  `CategoryRow` on web (mirrors `/categories`, which is the discovery
  precedent) and `CategoryTile` on mobile (already the mobile pattern).
- **Deferred:** Extract a shared `FeaturedSection` React component
  (web + mobile) to house the "Featured Businesses" heading + list. Would
  reduce duplication but each app already inlines this trivially. Revisit
  if the section gains more affordances.

## Decisions locked

Net new decisions beyond the plan:

- Reuse `listCategoriesRootsOp` for the primary-category subs; no new op.
- Delete `getFeaturedBusinesses` + its `packages/services/src/businesses/index.ts`
  export in the same commit as adding the new queries.
- Cap `limit` to `5` inside the featured branches of `listBusinessesOp` —
  even if a caller passes higher.
- Use `EXISTS`-style predicate for business-uniqueness pre-`random()`.
- Test approach: subset + length + statistical spread over N runs (no
  seeded RNG).
- 0-sub-0-featured category renders an EmptyState, not an empty page.
- `/directory` deletion is a follow-up plan, not part of this change.

## Implementation plan

Ordered atomic tasks for `/mlabs-code`. Each leaves the tree working.

### Task 1: Replace featured selection queries in `@aira/services`

- **Files:**
  - `packages/services/src/businesses/queries.ts` (edit)
  - `packages/services/src/businesses/index.ts` (edit)
  - `packages/services/src/businesses/__tests__/queries.test.ts` (new or edit
    — use whichever pattern the existing test setup follows)
- **What:** Add `getFeaturedRandom(db, limit)` and
  `getFeaturedRandomForCategory(db, categorySlug, limit)`. Both share the
  base predicate `deleted_at IS NULL` + `EXISTS(active sponsorship in scope)`.
  Uniform random via `ORDER BY random() LIMIT :limit`. Use business-unique
  `EXISTS` (not a sponsorship JOIN) so a business with multiple sponsorships
  in-window appears at most once. Delete `getFeaturedBusinesses` and its
  export. Keep the `homepageSponsoredFlag/Priority/AmountCents` helpers only
  if they still have callers (they don't after this task — remove).
- **Acceptance:**
  - `pnpm --filter @aira/services typecheck && pnpm --filter @aira/services test` passes.
  - Grep confirms zero remaining references to `getFeaturedBusinesses`.
  - New tests assert: returned set ⊆ active-sponsored pool; length ≤ limit;
    over 30 calls against a fixture of 8 sponsored businesses with limit=5,
    the union of ids covers ≥ 6 distinct businesses (loose randomness).
- **Pause if:**
  - Randomness test flakes locally (union covers < 6 in a small % of runs) —
    escalate for a decision on threshold rather than silently loosening it.
  - `homepageSponsored*` helpers turn out to have external callers (they
    shouldn't; grep to confirm before deleting).

### Task 2: Rewire `listBusinessesOp` featured branch + update Zod comment

- **Files:**
  - `apps/web/src/server/operations/businesses.ts` (edit)
  - `packages/validators/src/businesses.ts` (edit)
  - Any co-located tests for the op branch (if present)
- **What:** In the `featured` branch of the handler, route to
  `getFeaturedRandom(db, min(input.limit ?? 5, 5))` when `input.category`
  is unset, and `getFeaturedRandomForCategory(db, input.category, min(input.limit ?? 5, 5))`
  when it's set. Same clamp on the fallback "no filter" path (it also uses
  the featured pool). Update the JSDoc on `BusinessListInputSchema.featured`
  to match the new semantics ("randomised selection … active sponsorship
  in scope").
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck && pnpm --filter @aira/web test` passes.
  - Calling the op with `{ featured: true, limit: 20 }` returns ≤ 5 items.
  - Calling with `{ featured: true, category: "food" }` returns only
    businesses with an active sponsorship where
    `sponsorship.category_id = (food category id)`.
  - Existing `packages/api/src/__tests__/client.test.ts` test at line 250
    (which passes `{ featured: true, category: "shopping", limit: undefined }`)
    still passes.
- **Pause if:** the Zod schema needs a real behavior change (add/remove field)
  rather than a JSDoc rewrite.

### Task 3: Home page — cap 5 + repoint "View All"

- **Files:**
  - `apps/web/src/app/(app)/home/page.tsx` (edit)
- **What:** Change `limit: 6` → `limit: 5` on the `listBusinessesOp` call.
  Change `<Link href="/directory">` → `<Link href="/categories">`. Leave the
  `featured.length > 0` guard in place — still the right behavior when the
  sponsored pool is empty.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.
  - Visiting `/home` renders ≤ 5 Featured cards (was 6).
  - Clicking "View All →" lands on `/categories`.
- **Pause if:** the "View All →" text needs different copy (e.g. "Browse
  categories") — that's a copy question outside implementation scope.

### Task 4: Mobile home — `FEATURED_LIMIT` bump

- **Files:**
  - `apps/mobile/features/listings/hooks.ts` (edit)
- **What:** `const FEATURED_LIMIT = 6` → `5`. Update the doc comment on
  `useFeatured` to drop the "tier1+tier2 ordered by tier" description (stale
  after Task 1) and describe the new random sponsored-only behavior.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` passes.
  - Mobile home screen loads ≤ 5 Featured cards.
- **Pause if:** none.

### Task 5: Web primary-category view + level branch

- **Files:**
  - `apps/web/src/features/listings/components/primary-category-view.tsx` (new)
  - `apps/web/src/app/(app)/listings/[category]/page.tsx` (edit)
- **What:** Create `PrimaryCategoryView` (RSC-friendly component, no
  "use client"). Props: `{ category, subs, subCounts, featured, isSignedIn, favIds }`.
  Layout: category name + description → subcategory tiles via `CategoryRow`
  (with counts from `subCounts`) → "Featured in this category" section (only
  when `featured.length > 0`) using `BusinessCard`. When both `subs.length === 0`
  and `featured.length === 0`, render `EmptyState` with copy
  "This category is being set up. Check back soon.".
  In `/listings/[category]/page.tsx`, branch on `catRes.data?.category.level`:
  - `level === 1`: fetch categories via `listCategoriesRootsOp` (not
    `listCategoriesOp`) to get `subsByRoot`; fetch featured via
    `listBusinessesOp({ featured: true, category, limit: 5 })`; skip the
    paginated fetch entirely. Render `<PrimaryCategoryView …>`.
  - Otherwise: unchanged — existing `ListingView` path.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck && pnpm --filter @aira/web lint` passes.
  - Navigating to a level-1 category slug shows the new view — no search
    box, no pagination, no verified filter chip.
  - Navigating to a level-2 subcategory slug is behavior-identical to today.
  - Level-1 category with 0 sponsored hides the featured section (only
    subs + header render).
  - Level-1 category with 0 subs AND 0 sponsored renders the EmptyState copy.
- **Pause if:**
  - `CategoryRow` visual doesn't work at 5 subs on the primary page (feels
    like a copy of `/categories`) — escalate for a design decision before
    switching to `CategoryTile` or building a new grid component. Do NOT
    invent a new pattern silently.

### Task 6: Mobile primary-category view + level branch

- **Files:**
  - `apps/mobile/features/listings/components/PrimaryCategoryView.tsx` (new)
  - `apps/mobile/app/(app)/listings/[category].tsx` (edit)
  - `apps/mobile/features/listings/hooks.ts` (edit — add
    `useFeaturedForCategory(slug)` if not already trivially achievable via
    `useListings` — do NOT reuse `useListings` since that hits the paginated
    branch)
- **What:** Mobile mirror of Task 5. Add `useFeaturedForCategory(slug)` that
  wraps `listBusinesses({ featured: true, category: slug, limit: 5 })` via
  TanStack Query; cache key
  `["listings", "featured", "category", slug]`. Create
  `PrimaryCategoryView` React Native component using `CategoryTile` for
  subs (mobile precedent) and `BusinessCard` for featured. In
  `listings/[category].tsx`, branch on `cat.data?.category.level` and
  render either `PrimaryCategoryView` or the existing paginated
  `ListingView`-style FlatList.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` passes.
  - Tapping a level-1 category tile on mobile renders subs + featured; no
    search bar, no verified chip, no infinite scroll.
  - Tapping a level-2 subcategory tile renders the existing paginated list.
- **Pause if:** Expo dev-tunnel isn't running and you can't verify the
  screen on a real device — do the code change, note verification is
  pending in the task ledger, and move on. Don't invent workarounds for
  ws-tunnel.

## Open questions

Anything `/mlabs-code` should escalate rather than guess:

- If the existing `packages/services/src/businesses/__tests__/` directory
  doesn't exist yet (unit tests live inline elsewhere), pause and pick the
  project convention rather than inventing a new test path.
- If a fixture with ≥ 8 sponsored businesses isn't easily seedable for the
  randomness test, pause and ask before hand-rolling one — the seed script
  may already have this.
