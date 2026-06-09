# Plan: Listings pagination + scoped search (F7 + F8)

**Date:** 2026-06-09
**Slug:** 2026-06-09-listings-pagination-search
**Status:** reviewed
**Author:** /mlabs-plan

---

## Problem

The `/listings/[category]` page currently fetches every business in the
selected category and runs search + verified filtering **client-side**
(`apps/web/src/features/listings/components/listing-view.tsx`). There is no
pagination at all. Two pains:

1. **Won't scale.** Every visit pulls the full category roster over the
   wire. The PRD (F7) calls for ≥10/page pagination; we're shipping
   all-at-once. As category rosters grow this gets slow and expensive.
2. **Breaks the REST contract.** CLAUDE.md hard rule: web + mobile share
   one `/api/v1/*` contract. Search/filter logic living in the web
   component means mobile would have to re-implement it client-side too,
   or duplicate API work later — exactly the split-codepath outcome the
   monorepo is structured to avoid.

End-users benefit directly (faster page, browser-back-friendly search,
shareable result URLs). Mobile benefits indirectly — its listings screen
(post-launch) consumes the same paginated REST endpoint with zero
client-side filter logic to maintain.

**Success:** end-user opens `/listings/restaurants`, sees 12 cards + page
controls; types "halal" → URL updates to `?q=halal`, results re-render
server-side with a fresh `total`; clicks page 2 → URL becomes
`?q=halal&page=2`; refresh / share / back-button all work as expected.

## Scope

**In:**
- Server-side pagination on `/listings/[category]` (default 12/page)
- Server-side scoped search across `name + description + address`
  (`ILIKE '%q%'`, case-insensitive — PRD F8 "contains/starts-with")
- Server-side `verifiedOnly` toggle (must move with pagination — see
  Approach)
- URL state: `?q=`, `?page=`, `?verified=1` as the source of truth
- New op input fields + output `total` so the page can render "Page X of Y"
- `ListingView` becomes presentational (no internal filter state)

**Out (deferred):**
- **Mobile parity.** Same REST endpoint will serve mobile when the
  listings screen lands; not in this plan.
- **Fuzzy / typo-tolerant search.** PRD says contains/starts-with only;
  plain Postgres `ILIKE`. Algolia / Typesense is Phase 2.
- **Cross-category search.** Stays scoped to the current category.
- **Sort options beyond A–Z within tier.** Sponsored-first sort is S4.
- **`pg_trgm` GIN index.** Unindexed `ILIKE` is fine at MVP roster sizes
  (hundreds per category). Flagged as a future optimization, not a
  blocker.
- **Admin search.** This plan covers end-user `/listings/[category]`
  only. Admin search on `/admin/businesses` is a separate item.

## Approach

Three layers change, in step with the existing operation pipeline
(`@aira/validators` → `@aira/services` → operation → route handler →
RSC page → presentational component).

**1. Validator layer** — `packages/validators/src/businesses.ts`
Extend `BusinessListInputSchema`:
```ts
q: z.string().trim().max(100).optional(),
page: z.coerce.number().int().min(1).default(1),
pageSize: z.coerce.number().int().min(1).max(50).default(12),
verifiedOnly: z.coerce.boolean().optional(),
```
Extend `BusinessListOutputSchema` to add `total: z.number().int()`,
`page: z.number().int()`, `pageSize: z.number().int()`. Existing
single-fetch callers (e.g. featured on `/home`, `/admin/businesses` list,
`/admin` dashboard) pass nothing for the new fields and accept the new
output shape via `.items` — the existing array unwrap continues to work,
they just ignore the new metadata.

**2. Service layer** — `packages/services/src/businesses/queries.ts`
Add `getBusinessesByCategoryPaged(db, { category, q, page, pageSize,
verifiedOnly })` returning `{ items, total }`:
- `WHERE category = ?` + optional `AND (lower(name) LIKE %q% OR
  lower(description) LIKE %q% OR lower(address) LIKE %q%)` + optional
  `AND verified = true`
- `ORDER BY TIER_ORDER, asc(name)` (existing pattern)
- `LIMIT pageSize OFFSET (page - 1) * pageSize`
- Second query: `SELECT COUNT(*) FROM businesses WHERE <same predicates>`
  for `total`. Two-query approach is simpler than `COUNT(*) OVER ()` and
  Drizzle types it cleanly. Run in parallel via `Promise.all`.

Keep `getBusinessesByCategory` (no-args version) for any caller that
genuinely wants the full list — admin list page can keep using it for
now, migrate later if it grows.

**3. Op + route** — `apps/web/src/server/operations/businesses.ts` +
`apps/web/src/app/api/v1/businesses/route.ts`
`listBusinessesOp` already exists; widen its handler to branch on
`input.category && (input.q || input.page || input.pageSize ||
input.verifiedOnly)` → call paged; else call existing
`getBusinessesByCategory` / `getFeaturedBusinesses`. Route handler
forwards `searchParams` straight to Zod, no changes needed beyond the
schema widening.

**4. Page + view** — RSC reads `searchParams`, passes through
- `apps/web/src/app/(app)/listings/[category]/page.tsx`: add
  `searchParams: Promise<{ q?: string; page?: string; verified?: string }>`,
  parse, pass to `apiServerFetch(listBusinessesOp, { input: { category,
  q, page, verifiedOnly } })`, render `<ListingView items={...}
  total={...} page={...} pageSize={...} q={...} verifiedOnly={...} />`.
- `ListingView` becomes a **client component** still (for the input box's
  controlled state) but no longer holds the filtered array; it pushes URL
  changes via `useRouter().push` and `useTransition()` to keep the UI
  responsive. Search input debounce: 300ms via a small `useDebouncedCallback`
  pattern (no new dep — inline `useEffect` + `setTimeout` is enough).
  Verified toggle pushes `?verified=1` / removes it. Page links are plain
  `<Link href="?q=…&page=N">` so server-side nav works without JS.

**5. Pagination UI**
A small `<Pagination total page pageSize buildHref />` component under
`apps/web/src/features/listings/components/pagination.tsx`:
- Renders `Prev · 1 · 2 · 3 · … · N · Next`
- Truncation rule: always show first, last, current ±1; ellipses between
- Hides itself if `total <= pageSize`
- Each page = a `<Link>` to the URL `buildHref(page)` returns — keeps the
  component reusable.

**Alternatives considered:**

- **Pure client-side pagination over the existing full-fetch** —
  rejected. Cheapest to ship, but locks in the CLAUDE.md violation, and
  the second the mobile listings screen lands we have to re-do all of it
  server-side anyway. Wasted cycles + tech debt.
- **Server pagination + client search** — rejected. Search would only
  match within the visible page (12 items) → looks broken when a user
  searches for something on page 3 from page 1. The verified filter has
  the same problem.
- **Cursor-based pagination (`?after=<id>`)** — rejected for now.
  Cursors are great for infinite scroll but worse for numbered pages
  with "Page X of Y" (need total + offsets anyway). Re-evaluate if we
  later switch to "Load more" UX.

## Data model changes

None for this plan. (Future optimization: `pg_trgm` GIN index on
`businesses(name, description, address)` if ILIKE perf becomes a
bottleneck post-launch. Out of scope here.)

## Files to touch

**New:**
- `apps/web/src/features/listings/components/pagination.tsx` — reusable
  numbered pagination component.

**Edit:**
- `packages/validators/src/businesses.ts` — extend `BusinessListInputSchema`
  + `BusinessListOutputSchema`.
- `packages/services/src/businesses/queries.ts` — add
  `getBusinessesByCategoryPaged()`.
- `apps/web/src/server/operations/businesses.ts` — widen `listBusinessesOp`
  handler to branch into the paged path when search/pagination params are
  present.
- `apps/web/src/app/api/v1/businesses/route.ts` — no logic change; verify
  searchParams forwarding into Zod still passes.
- `apps/web/src/app/(app)/listings/[category]/page.tsx` — read
  `searchParams`, pass through, pass new props.
- `apps/web/src/features/listings/components/listing-view.tsx` — strip
  internal `useState`/`useMemo` filter logic, become URL-driven with
  controlled `<input>` + debounced `router.push`; render new
  `<Pagination>`.

## Edge cases

- **Empty search** (`q=""` or just whitespace): skip the search predicate,
  return the unfiltered paged result. Validator `.trim()` + `optional()`
  handles this.
- **Invalid `page`** (`?page=abc`, `?page=-5`, `?page=999`): Zod rejects
  non-int / `< 1` → fall back to `page=1` via `.default(1)`. If `page >
  ceil(total/pageSize)`, the result is empty; UI shows "No results on
  page X — go back to page 1" rather than the generic empty state.
- **Search returns 0**: keep the existing `<EmptyState>` copy but inject
  the query string into the title ("No results for 'halal'"). Pagination
  hides itself.
- **Category invalid**: existing `notFound()` flow on the RSC unchanged.
- **Concurrent typing + page navigation**: `useTransition` keeps the UI
  responsive; the debounce timer is cleared on unmount + on each
  keystroke. Pressing a page link mid-typing pushes the URL the link
  encodes (which uses the latest committed `q`), so no race.
- **`verifiedOnly=true` + `page>1`**: `total` reflects the filtered count.
  Clearing the toggle shrinks the page count; `useEffect` on the
  searchParams not needed — Next's RSC re-renders the page automatically.
- **`<select>` category switcher** in `ListingView`: must reset `?q=` +
  `?page=` when navigating to a different category. The existing
  `router.push(\`/listings/${value}\`)` already does this (no
  searchParams carry over) — verify in implementation.
- **SSR + back/forward navigation**: page is RSC, so back/forward will
  re-render with the previous URL's `q` + `page`. The controlled input
  initial value reads from `props.q` (not local state), so the box stays
  in sync.

## Acceptance criteria

- [ ] `/listings/restaurants` renders a max of 12 cards on first paint
  (assuming there are ≥12 in the category).
- [ ] Numbered pagination appears below the cards when `total > 12`.
  Hidden when `total <= 12`.
- [ ] Clicking page 2 navigates to `/listings/restaurants?page=2` and
  renders cards 13–24 server-side (visible in network tab as a fresh
  RSC fetch, not a client filter).
- [ ] Typing "halal" in the search box updates the URL to
  `/listings/restaurants?q=halal` after a 300ms debounce; server returns
  the matched rows; `total` reflects the filtered count.
- [ ] Search matches `name`, `description`, and `address` fields
  case-insensitively. (Example: search "decatur" matches a business whose
  address contains "Decatur" but whose name doesn't.)
- [ ] Toggling Verified updates the URL to `?verified=1`, the server
  returns only `verified=true` rows, and pagination respects the filtered
  count.
- [ ] Refreshing on `?q=halal&page=2` re-renders the same state without
  the search input flashing empty.
- [ ] Browser back/forward navigates through search history correctly.
- [ ] Switching category via the dropdown clears `?q=` + `?page=` (no
  leaking from one category to another).
- [ ] Invalid `?page=abc` falls back to page 1 silently (no 500).
- [ ] Empty results show the existing `<EmptyState>` with the query
  echoed if `q` is present.
- [ ] `/home` featured strip continues to work unchanged (regression
  check — the schema widening is additive).
- [ ] `/admin/businesses` list continues to work unchanged (regression
  check).
- [ ] `/admin` dashboard's "Recent businesses" continues to work
  unchanged (regression check).
- [ ] `pnpm typecheck` + `pnpm lint` clean.

## Open questions

- **Should `?q=` be visible in the address bar while typing, or only
  after the debounce fires?** Recommend "only after debounce fires" so
  browser history isn't spammed by each keystroke. Will implement that
  way unless the reviewer flags it.
- **Should the search input have a clear (✕) button?** Tiny UX nice-to-
  have. Not in PRD. Default: yes, when `q` is non-empty.
- **Pagination ellipsis truncation rule**: confirmed first + last +
  current ±1; reviewer can tighten/loosen.
- **`getBusinessesByCategoryPaged` vs collapse into `getBusinessesByCategory`
  with optional params?** Plan picks the new function for cleanliness; happy
  to collapse if the reviewer prefers fewer exports.
- **Per-page count**: locked at 12. Reviewer can change if 16 / 20 reads
  better against the design.
