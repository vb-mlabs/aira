# Debug — Back on business detail skips listings screen, lands on Home/Post

**Started:** 2026-07-20 18:10
**Source:** user-report (mstack-fix session earlier today escalated after the bounded look — the fix report file wasn't persisted to `.mstack/fixes/`, but the trace + hypotheses were the head start for this run)
**Env:** static analysis + vitest (mobile runtime unavailable in this environment)
**Status:** ready-for-fix
**Investigator:** /mstack-debug

## Symptom

Mobile Expo app: tapping Back on the business-detail screen skips over
the intermediate `/listings/<sub>` screen and lands on Home (Scenario 1)
or on Post-on-AIRA (Scenario 2 — whichever screen was previously
underneath in the stack).

## Repro

**Scenario 1**
1. Open the app on Home.
2. Open the drawer.
3. Select a main category, then a subcategory.
4. Tap any listing card on the resulting `/listings/<sub>` screen.
5. Tap Back (either the header chevron or the bottom "Go back"
   button) on the business-detail screen.

**Expected:** land on `/listings/<sub>` — the listings screen the user
just came from, with the drawer's context (highlight state) preserved.
**Actual:** land on Home.

**Scenario 2**
1. Open the app on Home.
2. Open the drawer → tap Post on AIRA (navigates to `/post`).
3. Open the drawer again → select a main category, then a subcategory.
4. Tap any listing card.
5. Tap Back.

**Expected:** land on `/listings/<sub>`.
**Actual:** land on `/post`.

**Artifact:** repro spec at `specs/repro.spec.ts` — three cases, all
fail against the current code.

## Investigation

Static trace of the drawer → listings → business-detail chain:

- **Drawer sub-row tap** — `apps/mobile/components/nav/AppDrawerContent.tsx:357-361`
  pushes `/listings/[category]` with `{ category: <sub.slug>, from }`.
  The drawer's `from` is computed at lines 69-77 as `pathname + preserved
  non-from search params` (in this flow that's just the pathname where
  the drawer was opened, e.g. `/` or `/post`).
- **Listings screen** — `apps/mobile/app/(app)/listings/[category]/index.tsx`
  activates `useOriginAwareBack()` (line ~59) which reads `?from=`
  from the URL params and intercepts OS back to `router.replace(from)`.
- **BusinessCard tap** — `apps/mobile/features/listings/components/BusinessCard.tsx:58-83`
  computes its own `from` for the business-detail screen via
  `useMemo`, then pushes `/listings/[category]/[id]` with
  `{ category, id, from }`. The from-computation loop (lines 58-68)
  reads `useLocalSearchParams()` and preserves every param except the
  incoming `from`.
- **Business detail** — `apps/mobile/app/(app)/listings/[category]/[id].tsx:41,55-65`
  reads `from` from URL params, and both the header BackButton and
  the bottom "Go back" button call `router.replace(from)`.

**Key discovery** — expo-router's `useLocalSearchParams()` returns
**both route segments and query params** for the current route (verified
in `node_modules/expo-router/build/hooks.d.ts`: "For dynamic routes,
both the route parameters and the search parameters are returned").

That means on the listings screen at
`/listings/restaurants?from=/`, `useLocalSearchParams()` returns
`{ category: "restaurants", from: "/" }`.

BusinessCard's from-computation loop strips the incoming `from` but
preserves `category` — because it can't tell the route segment apart
from a real query param. The resulting `from` handed to the
business-detail screen is `/listings/restaurants?category=restaurants`
— the route segment `restaurants` re-serialized as a query string on
top of the pathname that already encodes it.

When Back on business-detail does
`router.replace("/listings/restaurants?category=restaurants")`, this
malformed URL (segment + query duplicate) fails to route reliably to
the listings screen. Empirically (per user report) it falls back to
the ancestor stack entry — Home in Scenario 1, Post in Scenario 2 —
which matches what the user sees.

The `?from=` drawer-origin plumbing works correctly on the LISTINGS
screen itself (the `useOriginAwareBack` interceptor there fires
`router.replace("/")` on back, which is the intended behavior for
that screen). The bug is one level deeper: BusinessCard's
from-computation mangles the URL it hands to the detail screen.

## Root cause

**BusinessCard's `from`-computation loop preserves every param
returned by `useLocalSearchParams()` except `from` — but
`useLocalSearchParams()` returns route segments (like `category`)
alongside genuine query params. Route segments end up re-serialized
as query params on the back-URL, producing `/listings/<slug>?category=<slug>`
where `<slug>` is duplicated across pathname AND query.**

The proper set to preserve is `useLocalSearchParams()` **minus route
segments and minus `from`** — i.e. only genuine query params like `q`
(search text) or `verified` (filter).

**Failing test:** `specs/repro.spec.ts` — three cases:
- **Scenario 1** — asserts `computeBackHref("/listings/restaurants", { category: "restaurants", from: "/" })` returns `/listings/restaurants`. Currently returns `/listings/restaurants?category=restaurants`. Fails.
- **Scenario 2** — same shape with `from: "/post"`. Same failure.
- **Regression guard** — asserts that on a searched/filtered listings page (`{ category, q, verified, from }`), the back-URL preserves `q` and `verified` but strips `category` and `from`. Currently preserves ALL non-`from` params including `category`. Fails.

Run: `pnpm vitest run .mstack/debug/2026-07-20-1810-back-nav-skips-listings/specs/repro.spec.ts` → 3/3 fail as of 2026-07-20 18:15.

## Fix plan (for /mstack-fix)

**Files to change:**

- `apps/mobile/features/listings/components/BusinessCard.tsx:58-68` —
  update the from-computation loop to strip route-segment param names
  in addition to `from`. The screens we push into here have known
  route segments: `category` (the `/listings/[category]/[id]` route
  under this component uses `[category]` + `[id]`; `id` is only ever
  set post-push, so it can't appear in the current screen's
  searchParams — but include it defensively).

  Concrete shape:
  ```
  // Route-segment param names — expo-router's useLocalSearchParams
  // merges these with query params, so we must exclude them here
  // (they're already encoded in `pathname`). Adding a route segment
  // name to the back-URL query duplicates it and breaks router.replace
  // matching on that URL — see .mstack/debug/2026-07-20-1810-back-nav-skips-listings/
  const ROUTE_SEGMENT_PARAMS = new Set(["category", "id"])
  // …
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === "from" || ROUTE_SEGMENT_PARAMS.has(k)) continue
    if (typeof v === "string" && v.length > 0) qs.set(k, v)
  }
  ```

- `apps/mobile/components/nav/AppDrawerContent.tsx:69-77` — apply the
  SAME strip to the drawer's `from` computation. The drawer opens
  from screens like `/listings/[category]` too (if a user re-opens the
  drawer while browsing a listings screen, the same trap applies).
  Same `ROUTE_SEGMENT_PARAMS` set + same guard.

  A small helper in `apps/mobile/lib/nav/` (e.g.
  `buildBackHref.ts`) that both call sites import would be cleanest —
  keeps the ROUTE_SEGMENT_PARAMS set in one place. `/mstack-fix` can
  decide whether to extract the helper or copy-paste (rule-of-three
  discipline — this is the second site).

**Why it fixes the cause:** with route segments stripped, the back-URL
becomes the clean `/listings/restaurants` (or `/listings/restaurants?q=coffee&verified=1`
when genuine filters are active). `router.replace` on that URL
unambiguously matches the `/listings/[category]` route with
`category` inferred from the pathname segment, no query collision.

**Hard-rule reminders:**
- Mobile UI change only — the sweep applies to two `.tsx` files under
  `apps/mobile/`. No schema, no deps, no design tokens.
- `commands.typecheck` (`pnpm typecheck`) must pass; no lint errors
  on the touched files.
- Don't touch the web app — the report is mobile-only.

**Acceptance:**
1. `pnpm vitest run .mstack/debug/2026-07-20-1810-back-nav-skips-listings/specs/repro.spec.ts` → 3/3 pass.
2. Original repro (both scenarios) — run in Expo Go / device: Back on
   business detail lands on `/listings/<sub>` with drawer state
   preserved. Since this env can't run the mobile app, `/mstack-fix`
   should note the vitest passes and hand off to `/mstack-qa` for
   device-side verification.

**Out of scope:**
- The `category-tree-manager.tsx` ActiveBadge `small` prop no-op left
  by the earlier 12px-floor sweep — already noted in that code run's
  report, unrelated.
- Any refactor of `useOriginAwareBack` itself — the hook is correct
  for what it does; the bug is upstream, in how `from` is
  constructed.
- Consolidating the from-helper across all `router.push`-with-from
  call sites (drawer + BusinessCard + potentially any other) — worth
  doing as a follow-up if a third site appears.

## External references

- `node_modules/expo-router/build/hooks.d.ts` — checked 2026-07-20 —
  useLocalSearchParams JSDoc: "For dynamic routes, both the route
  parameters and the search parameters are returned."
