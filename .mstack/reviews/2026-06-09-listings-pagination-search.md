# Review: Listings pagination + scoped search (F7 + F8)

**Date:** 2026-06-09
**Slug:** 2026-06-09-listings-pagination-search
**Plan reviewed:** [2026-06-09-listings-pagination-search.md](../plans/2026-06-09-listings-pagination-search.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** /mlabs-review

---

## Summary

Plan is ready to implement after four review decisions: (1) all
`listBusinessesOp` branches return `total/page/pageSize` so the output
schema stays strict; (2) schema key renamed to `verified` to match the
URL param and `Business.verified`; (3) tier sections render conditionally
(only when the current page contains items in that tier); (4) URL push
on the search input is debounced 300ms — back-button goes through
completed searches, not partial typing. The plan's recommended approach
(server-side pagination via schema widening + URL-driven state) is
sound and consistent with the REST contract rule in CLAUDE.md. One
pre-existing bug surfaced but is explicitly out of scope.

## Findings

### Blockers (must fix before /mlabs-code)

_none_

### Concerns (raised, decided, recorded)

- **Concern:** Plan adds `total/page/pageSize` to `BusinessListOutputSchema`
  but there are 4 existing callers of `listBusinessesOp` (`/home`,
  `/admin`, `/admin/businesses`, `/listings/[category]`). Existing branches
  (featured / category / fallback) don't return those fields — strict
  schema = runtime Zod failures post-deploy.
  **Decision:** All branches synthesize the metadata. Featured + admin
  fallback set `total = items.length, page = 1, pageSize = items.length`.
  Strict schema preserved; one consistent contract for both clients.

- **Concern:** Plan uses `verifiedOnly` as the schema key but `?verified=1`
  as the URL param. Forces a remap layer in the page.tsx.
  **Decision:** Rename schema key to `verified`. Matches the URL param
  and the existing `Business.verified` column.

- **Concern:** Current `ListingView` renders 3 fixed `<TierSection>`
  components. Under server-side pagination, page N might contain items
  from only one tier — fixed sections render empty headers.
  **Decision:** Conditional section headers — render `<TierSection>` only
  when it has ≥1 item on the current page. BusinessCard's tier pill
  still cues each card's tier.

- **Concern:** Plan's open question on whether `?q=` updates on every
  keystroke or only after debounce was not settled.
  **Decision:** Debounce 300ms then push URL. Address bar updates feel
  deliberate; browser history stays usable.

### Suggestions (taken or deferred)

- **Taken:** New service function `getBusinessesByCategoryPaged` (don't
  collapse into the existing `getBusinessesByCategory`). Cleaner — admin
  callers that want the full list keep using the simpler function.
- **Taken:** Two-query approach for `items + total` via `Promise.all`,
  using Drizzle's `count()` helper. Simpler than `COUNT(*) OVER ()`.
- **Taken:** Page size default = 12 (multiple of 2/3/4 for grid; ≥ PRD
  F7 minimum of 10).
- **Taken:** Search clears (✕) button when `q` is non-empty.
- **Taken:** Pagination ellipsis rule: first, last, current ±1.
- **Deferred (not blocking this plan):** `/admin/businesses` currently
  calls `listBusinessesOp({ input: {} })` which hits the no-filter
  fallback returning featured-only. Admin therefore only sees tier1+tier2
  businesses — a pre-existing bug, surfaced here so it doesn't get fixed
  accidentally inside this change. Recommended follow-up: add an `all`
  branch to the op or have admin call a new `listAllBusinessesOp`.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- **Output schema stays strict** with all branches synthesizing
  `total/page/pageSize`.
- **Schema key `verified`** (not `verifiedOnly`).
- **Conditional `<TierSection>` rendering** under pagination — drop
  empty sections.
- **300ms debounce** on URL push from the search input.
- `/admin/businesses` pre-existing fallback bug **explicitly out of
  scope** — file a follow-up after this lands.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each is atomic.

### Task 1: Extend BusinessListInputSchema + BusinessListOutputSchema

- **Files:** `packages/validators/src/businesses.ts` (edit)
- **What:** Add `q`, `page`, `pageSize`, `verified` to the input schema
  with `.coerce` + sensible defaults (`page=1`, `pageSize=12`,
  `pageSize.max=50`). Add `total`, `page`, `pageSize` to the output
  schema as required fields. Keep `.strict()` on input.
- **Acceptance:** `pnpm typecheck` clean. `BusinessListInput` type now
  includes the four new fields (q optional, page/pageSize with defaults,
  verified optional). `BusinessListOutput` includes the three new
  required number fields.

### Task 2: Add getBusinessesByCategoryPaged service function

- **Files:** `packages/services/src/businesses/queries.ts` (edit) ·
  `packages/services/src/businesses/index.ts` (edit, re-export)
- **What:** New exported function `getBusinessesByCategoryPaged(db,
  { category, q?, page, pageSize, verified? })` returning
  `{ items: Business[]; total: number }`. Predicates: `category = ?`,
  optional `verified = true`, optional `(lower(name) LIKE lower(%q%) OR
  lower(description) LIKE lower(%q%) OR lower(address) LIKE lower(%q%))`.
  Order by existing `TIER_ORDER` then `asc(name)`. `LIMIT pageSize OFFSET
  (page - 1) * pageSize`. Use `Promise.all` for the COUNT and SELECT
  queries. Use Drizzle's `count()` helper for the count.
- **Acceptance:** Unit-test-style sanity in a node REPL or unit test:
  empty `q` returns first page of full category; `q=halal` filters; both
  shapes match `{ items, total }`. `pnpm typecheck` clean.

### Task 3: Widen listBusinessesOp handler

- **Files:** `apps/web/src/server/operations/businesses.ts` (edit)
- **What:** Add a new branch BEFORE the featured/category branches that
  triggers when `input.category && (input.q || input.page !== 1 ||
  input.pageSize !== 12 || input.verified !== undefined)`. That branch
  calls `getBusinessesByCategoryPaged` and returns `{ items, total, page:
  input.page, pageSize: input.pageSize }`. The existing featured /
  category / fallback branches MUST also be updated to return
  `total = items.length, page: 1, pageSize: items.length` so the strict
  output schema validates everywhere.
- **Acceptance:** All four existing call sites still work. `/home`
  featured strip unchanged. `/admin` dashboard recent-list unchanged.
  `/admin/businesses` list unchanged. Listings page renders without
  errors. `pnpm typecheck` clean.

### Task 4: Add Pagination component

- **Files:** `apps/web/src/features/listings/components/pagination.tsx`
  (new)
- **What:** Presentational `<Pagination total page pageSize buildHref />`
  component. Renders Prev · 1 · 2 · … · N · Next using `<Link>`s pointing
  at `buildHref(page)`. Truncation: always show first, last, current ±1;
  ellipses fill gaps. Hides itself when `total <= pageSize`. Active page
  visually distinguished (filled `bg-primary`); disabled Prev/Next
  rendered as non-link spans.
- **Acceptance:** Component renders correctly for total=1 (hidden),
  total=10 pageSize=12 (hidden), total=50 pageSize=12 page=3 (Prev · 1 ·
  2 · 3 · 4 · 5 · Next, no ellipsis), total=200 pageSize=12 page=10
  (Prev · 1 · … · 9 · 10 · 11 · … · 17 · Next).

### Task 5: Lift filter state from ListingView to URL searchParams

- **Files:** `apps/web/src/app/(app)/listings/[category]/page.tsx`
  (edit) · `apps/web/src/features/listings/components/listing-view.tsx`
  (edit)
- **What:** RSC page reads `searchParams.q`, `searchParams.page`,
  `searchParams.verified` and passes them through to
  `apiServerFetch(listBusinessesOp, { input: { category, q, page,
  verified } })`. Pass new props (`items`, `total`, `page`, `pageSize`,
  `q`, `verified`) to ListingView. ListingView strips its internal
  `useState`/`useMemo` filter logic and becomes URL-driven: controlled
  `<input>` reads `q` from props, on change schedules a 300ms-debounced
  `router.push` to the URL with the new `q` (preserving `verified`,
  resetting `page` to 1). Verified chip toggles `?verified=1` / removes
  it. Tier sections render conditionally — only when the section has ≥1
  item on the current page. Pagination component rendered below the
  tier sections using `buildHref={(p) => `?${new URLSearchParams({ q,
  verified: verified ? "1" : "", page: String(p) }).toString()}`}` (omit
  empty params). Category-switcher `router.push` continues to navigate
  to plain `/listings/${value}` (drops searchParams — intended).
  Add a clear (✕) button inside the input that pushes the URL without
  `q`.
- **Acceptance:** Every box in the plan's "Acceptance criteria" section
  passes:
  - `/listings/restaurants` first paint ≤ 12 cards
  - Pagination shows iff `total > pageSize`
  - `?q=halal` filters server-side (visible as fresh RSC fetch in
    network panel)
  - `?verified=1` toggle works and `total` reflects filtered count
  - Refresh on `?q=halal&page=2` preserves both
  - Browser back/forward navigates search history
  - Switching category clears searchParams
  - Invalid `?page=abc` falls back to page 1
  - Empty-search-result keeps the existing `<EmptyState>` (with query
    echoed if `q` present)
  - `/home`, `/admin`, `/admin/businesses` continue to work
  - `pnpm typecheck` + `pnpm lint` clean

### Task 6: Smoke test + manual verification

- **Files:** none — purely a verification task
- **What:** Run `pnpm dev`, walk through `/listings/restaurants` →
  type "halal" → verify URL updates after pause → click page 2 → verify
  fresh server render → toggle verified → verify total drops → refresh
  → verify state persists → switch category via dropdown → verify
  clean URL → press browser back → verify history works. Capture one
  screenshot to `.mstack/code/2026-06-09-listings-pagination-search/`
  for the run report.
- **Acceptance:** All flows above behave correctly. No console errors.

## Open questions

_none_ — all four review concerns settled; the plan's five open
questions resolved in the Suggestions section.
