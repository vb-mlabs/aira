# Plan: Featured business selection logic

**Date:** 2026-07-06
**Slug:** 2026-07-06-featured-business-selection
**Status:** reviewed
**Author:** claude

---

## Problem

QA feedback flagged four related issues about how "Featured Businesses"
work across the app (items #1, #2, #8, #12 from the 2026-07-06 review):

- **#1** — Home "Featured Businesses" section is good, but "View All →"
  routes to a mixed all-businesses page (`/directory`) that isn't the
  intended browse pattern. The section itself should be 5 randomly
  selected sponsored listings across all categories.
- **#2** — Primary category page should display: category name +
  subcategories + 5 randomly selected sponsored listings **from that
  category only**. It currently shows a paginated list of every
  business in the category (same UI as the subcategory page).
- **#8** — QA asks "what algorithm are we using?". Current: deterministic
  sort (has-active-sponsorship? → sponsored tier priority → sponsored
  amount → business tier → name), pulled from `getFeaturedBusinesses`.
  Not random, and includes paid-active-but-not-sponsored businesses.
- **#12** — Primary category page must not list businesses directly —
  only the 5 featured (per #2).

Success = home + primary category pages surface a small, rotating,
sponsorship-earned set of businesses, and primary categories become
navigation surfaces (name + subs + featured) rather than dumping the
full listing. Regular browse continues to work under subcategories
and via the existing `/listings/[category]` route when that slug is a
subcategory.

## Scope

**In:**

- Replace `getFeaturedBusinesses` selection with a **strict sponsored-only**
  pool + **uniform random** pick, limited to **5**.
- Add a per-category variant: `getFeaturedForCategory(db, categorySlug, limit)`.
  Same shape, scoped to sponsorships whose `category_id` matches.
- Home page (`apps/web/src/app/(app)/home/page.tsx`):
  - Cap featured at 5 (currently 6).
  - Point "View All →" at `/categories` (not `/directory`).
- Primary category page — split the current `/listings/[category]` behavior:
  - If slug is a **root** (`categories.level === 1`): render category name
    + subcategory tiles + 5 featured (this category). **No paginated
    listing.**
  - If slug is a **subcategory** (`categories.level === 2`): keep the
    current `ListingView` (paginated, searchable). Unchanged.
- Mobile parity:
  - `apps/mobile/app/(app)/index.tsx` — cap featured at 5 (currently
    uses `useFeatured` which returns whatever the server sends;
    server-side cap handles it).
  - `apps/mobile/app/(app)/listings/[category].tsx` — same root vs sub
    split as web.
- Update `/api/v1/businesses` input schema + operation to accept the new
  behavior, still validated by Zod round-trip so mobile + web stay in
  step.

**Out (deferred):**

- Removing / redesigning `/directory` route itself. Home stops linking to
  it; the account/favorites empty-state still does. Flagged as follow-up
  cleanup rather than in-scope destruction (see Open questions).
- Redesigning the subcategory listing UI. Behavior stays the same for
  slug-is-level-2.
- Featured-caching (e.g. rotation buckets) — pure per-request random for
  MVP; we can add caching later if load becomes a concern.
- Analytics/impression tracking for featured slots.
- Admin UI to preview "what would be featured now". Not asked for.

## Approach

**Backend — one queryable "featured pool" concept, two callers.**

Add two service queries in `packages/services/src/businesses/queries.ts`
that share the same predicate — "business is active, not deleted, has
an active sponsorship in scope" — and differ only on category filter:

- `getFeaturedRandom(db, limit)` — cross-category. Predicate uses the
  existing `homepageSponsoredFlag` logic minus the ordering. Emits with
  `ORDER BY random()` and `LIMIT $limit`.
- `getFeaturedRandomForCategory(db, categorySlug, limit)` — same, but
  the sponsorship predicate is scoped to that category id.

Randomness is `ORDER BY random() LIMIT n`. This is the classic Postgres
pattern and is fine for the pool sizes we expect (dozens of sponsored
businesses per city, tops). We deliberately don't seed — every page
load can rotate; users expect movement in a "Featured" section, and it
matches the QA wording ("randomly selected"). No performance concern
until sponsored pool grows well past 4-figure count.

Selection is **uniform** across all active sponsorships. Tier still
matters for card styling / detail-page badges, but not for pick
probability. This is a deliberate simplification — tier-weighted odds
was on the table and rejected to keep the algorithm auditable ("did my
sponsored listing get shown? did anyone else's?" becomes trivial).

**Operation layer:**

Extend `listBusinessesOp` (`apps/web/src/server/operations/businesses.ts`)
so the `featured` branch:

- No longer routes through `getFeaturedBusinesses` (the deterministic
  sort).
- Routes through `getFeaturedRandom` when `input.category` is unset.
- Routes through `getFeaturedRandomForCategory(input.category)` when
  `input.category` is set alongside `input.featured: true`.

This keeps the single-endpoint contract for mobile (which already fetches
featured through the same op) and web.

**Frontend — home page:**

Two mechanical edits in `apps/web/src/app/(app)/home/page.tsx`:

- Change `apiServerFetch(listBusinessesOp, { input: { featured: true, limit: 6 } })`
  → `limit: 5`.
- Change the `<Link href="/directory">` → `<Link href="/categories">`.

Mirror on mobile — the shared hook `useFeatured` in
`apps/mobile/features/listings/hooks.ts` needs its `limit` bumped down
to 5 (or the server ignores anything higher).

**Frontend — primary category page:**

The main structural change lives in the same route (`/listings/[category]`
web + `apps/mobile/app/(app)/listings/[category].tsx` mobile). Both need
to:

1. Fetch the category record + `getCategoryTree` (already available via
   `apiServerFetch(getCategoryBySlugOp)` and a
   `getCategoryTreeOp` if not present — check when implementing).
2. Branch on `category.level`:
   - Level 1 (root/primary): render a new `PrimaryCategoryView`. Layout:
     header (name + short description) → subcategory tiles (reuse
     `CategoryRow`/`CategoryTile` — same components `/categories` uses)
     → "Featured in this category" section with 5 random sponsored.
     No search, no pagination.
   - Level 2 (subcategory): render the existing `ListingView`. No behavior
     change beyond the parent-lookup slot in the picker (already works).

`getFeaturedForCategory` request goes through the same op:
`apiServerFetch(listBusinessesOp, { input: { featured: true, category: slug, limit: 5 } })`.

**Data model:** no schema changes needed. Everything hangs off existing
`sponsorships.category_id`, `sponsorships.status`, sponsorship window.

## Alternatives considered

- **Sponsored + paid-active fallback (rejected).** When a category has
  < 5 sponsored, top up with any tier1/tier2 paid-active business.
  Rejected because it dilutes the sponsorship signal — a business paid
  extra to appear here, and mixing in unpaid-featured makes that money
  moot. Empty/short featured sections are a clearer product signal
  ("sponsor this category to appear here") than a padded list.
- **Tier-weighted random (rejected).** Higher-tier sponsors get higher
  odds of appearing. Rejected for auditability + spec-size — we'd need
  to publish weights, defend them under scrutiny, and rebalance when
  new tiers are added. Uniform is easier to reason about and matches
  the QA wording literally.
- **Hourly rotation buckets (rejected).** Cache-friendly, cheaper at
  scale. Rejected because per-request random is trivially cheap at
  current scale + the "same 5 for an hour" behavior surprises users
  hitting refresh. Revisit if load pressure appears.
- **Delete `/directory` in this plan (rejected as scope creep).** The
  route is still linked from the favorites empty-state and, more
  broadly, deleting a route deserves its own conversation. This plan
  removes home's link; separate cleanup can drop the route.

## Data model changes

None. Uses existing `sponsorship` rows + `category.level` (already
present per the [category schema](../../packages/db/src/schema/categories.ts)).

## Files to touch

**New:**

- `apps/web/src/features/listings/components/primary-category-view.tsx`
  — Header + subcategory tiles + featured section, RSC-friendly.
- `apps/mobile/features/listings/components/PrimaryCategoryView.tsx` —
  same shape, React Native.

**Edit:**

- `packages/services/src/businesses/queries.ts` — add
  `getFeaturedRandom(db, limit)` and
  `getFeaturedRandomForCategory(db, slug, limit)`. Leave the existing
  `getFeaturedBusinesses` in place if any other caller uses it (grep
  first) — otherwise delete it in the same change.
- `apps/web/src/server/operations/businesses.ts` — route
  `featured` branches to the new queries. Preserve response shape
  (`{ items, total, page, pageSize }`).
- `apps/web/src/app/(app)/home/page.tsx` — `limit: 6 → 5`,
  `href="/directory" → "/categories"`.
- `apps/web/src/app/(app)/listings/[category]/page.tsx` — level-1
  branch renders `PrimaryCategoryView`; level-2 keeps `ListingView`.
- `apps/mobile/app/(app)/index.tsx` — no code change if the hook
  respects server-side limit; otherwise cap at 5 explicitly.
- `apps/mobile/app/(app)/listings/[category].tsx` — level-1 vs
  level-2 branch.
- `apps/mobile/features/listings/hooks.ts` — new
  `useFeaturedForCategory(slug)` hook if useful, or a param on
  the existing `useListings` / `useFeatured`.
- Tests: `packages/services/src/businesses/*.test.ts` — add cases for
  the two new queries (both `< limit` sponsored and `>= limit`).

## Edge cases

- **Category has < 5 sponsored.** Show whatever exists (could be 0).
  When 0, hide the "Featured in this category" section (matches home's
  existing `featured.length > 0` guard).
- **Sponsorship expires between page load and detail click.** No new
  guard — the detail page already gates on `VISIBLE` (paid or pending
  in window). Featured that vanishes on refresh is expected.
- **Multiple sponsorships for the same business.** Uniform random
  should pick the *business*, not the *sponsorship row*. Query returns
  distinct business rows.
- **Deleted subcategory referenced by URL.** Existing 404 path in
  `/listings/[category]` handles this via `notFound()`. Unchanged.
- **Sponsored business that's soft-deleted / archived.** Excluded via
  `isNull(businesses.deleted_at)` — already the case in
  `getFeaturedBusinesses`, must be preserved in the new queries.
- **`/directory` still reachable via typed URL / favorites CTA.** In
  scope only to unlink from home. Favorites empty-state and the route
  itself are follow-up (see Open questions).
- **Root category with zero active subcategories.** Show category
  header + featured section only. Subcategory tile grid renders nothing.
- **`ORDER BY random()` performance.** At current scale (dozens of
  sponsored per city, single-digit cities) this is fine. Watch when
  sponsored count crosses ~10k in a single scope — plan
  `TABLESAMPLE` / offset-shuffle at that point.

## Acceptance criteria

- [ ] Home Featured Businesses shows 5 items (was 6), all with an
      active sponsorship in some category.
- [ ] Home "View All →" links to `/categories` (not `/directory`).
- [ ] Hitting `/home` twice back-to-back returns different orderings /
      possibly different members when the sponsored pool is > 5.
- [ ] Visiting a **primary** category (`level = 1`) renders: name +
      subcategory tiles + up to 5 featured. No paginated business
      list, no search box, no verified filter chip.
- [ ] Visiting a **subcategory** (`level = 2`) is unchanged: paginated
      `ListingView` with search + verified filter + subcategory picker.
- [ ] Primary category with 0 sponsored hides the "Featured in this
      category" section rather than showing an empty container.
- [ ] Mobile parity: same behavior on home + `listings/[category]`
      root vs sub.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` clean.
- [ ] New service functions unit-tested for both the
      `< limit sponsored` and `>= limit sponsored` cases (assert
      randomness by running the query multiple times against a
      >5-sponsored fixture and asserting orderings vary).

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **`/directory` route fate** — home stops linking here, but the route
   still exists and `account/favorites` empty-state links to it. Do
   we delete the route + component + favorites CTA rewire in this
   plan, or ship the featured changes first and delete `/directory`
   as a follow-up? (Recommendation: follow-up. Keeps this plan small.)
2. **`getFeaturedBusinesses` legacy caller** — grep confirms use in the
   `listBusinessesOp` featured branch and the fallback for empty input.
   Once we replace those, is anything else calling it? Delete the
   function or leave for now?
3. **Randomness seed for tests** — assertion "orderings vary" needs a
   fixture with > 5 sponsored + a way to disable random for
   determinism when testing the *contents* of the pool. Options:
   pass a `_orderBy` opt in tests, or assert the *set* of returned
   ids matches the pool (not the sequence).
4. **`PrimaryCategoryView` — should the tile grid use
   `CategoryRow` (list-with-count) or `CategoryTile` (grid item)?**
   `/categories` uses `CategoryRow`; mobile uses `CategoryTile`. Pick
   the one that visually reads best at 5 subs per screen.
5. **API surface change** — do we need a new op name
   (`listBusinessesOp` was already overloaded — 3 modes), or fold the
   featured-scoped-to-category behavior into the same op via
   `{ featured: true, category }`? (Recommendation: reuse; the op is
   already the switchboard.)
