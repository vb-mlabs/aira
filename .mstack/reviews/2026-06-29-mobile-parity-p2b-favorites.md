# Review: Mobile parity (P2b) — Favorites wiring + /account/favorites

**Date:** 2026-06-29
**Slug:** 2026-06-29-mobile-parity-p2b-favorites
**Plan reviewed:** [2026-06-29-mobile-parity-p2b-favorites.md](../plans/2026-06-29-mobile-parity-p2b-favorites.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (Opus 4.7) via `/mlabs-review`

---

## Summary

P2b is ready to implement. Plan structure (3 atomic tasks, scaffold →
heart wiring → account screen) is sound. Codebase audit confirmed
every URL + schema field name. Two refinements during review: (1) lock
the three open questions at recommended (useToggleFavorite takes
state as arg, no "My collections" section header, account index
preserved byte-for-byte); (2) include the `FavoriteHeart` outline-color
drift fix (`#735239` → `#66503f`) in T2 since we're touching the
component anyway. UI-Significant: `no` — task list touches only
`apps/mobile/**`.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan said "POST /api/v1/favorites with body
  `{ business_id }`" without explicit confirmation of the
  field-name casing.
  **Decision:** Verified `AddFavoriteInputSchema` =
  `{ business_id: z.string().min(1) }` — snake_case is correct.
  Same for `RemoveFavoriteInputSchema`. URLs confirmed:
  - POST `/api/v1/favorites` body `{ business_id }` (add)
  - DELETE `/api/v1/favorites/{business_id}` (remove)
  - GET `/api/v1/favorites/mine` → `{ items: Business[] }`
  - GET `/api/v1/favorites/mine/ids` → `{ ids: string[] }`

- **Concern:** Plan didn't address that `FavoriteHeart`'s outline
  color is currently hardcoded at `#735239` — the same drift
  constant we already caught + fixed on `BusinessCard`'s category
  icon (commit `55133d8`) and on `BusinessHero` (commit `a02b05d`).
  Current value doesn't match the regenerated `mutedForeground`
  token (`#66503f`).
  **Decision:** Fold the drift fix into T2 (we're touching the
  component anyway). Outline color goes from `#735239` →
  `#66503f`. Filled red `#dc2626` stays unchanged (matches the
  destructive token closely enough; no design pressure to swap).

- **Concern:** The three open questions in the plan.
  **Decision:** All three locked at recommended:
  1. **`useToggleFavorite` signature:** `useToggleFavorite()`
     returns a mutate that takes
     `{ businessId, currentlyFavorited }`. Caller reads from the
     ids Set + passes the boolean. Cleaner than the cache-read-
     inside-hook alternative (which is fragile when the Set
     hasn't loaded yet — would toggle off an undefined state).
  2. **Section header naming:** drop the section header entirely.
     The new "Favorites" row renders as a standalone row above
     the existing "Profile" section. P2c can add a section
     header later if sibling rows (my-listings, my-posts)
     warrant it. Avoids dead semantic weight in P2b.
  3. **Account index preservation:** byte-for-byte. P2b just
     inserts one new row; no visual redesign. P2c handles the
     full hub reshape.

- **Concern:** TanStack `select` re-runs on every render and
  recreates the Set each time, causing referential equality
  changes that could re-render every BusinessCard.
  **Decision:** Accept the cost for MVP. For typical favorite
  counts (≤ 100), Set construction is sub-microsecond and the
  re-renders are limited to mounted cards (which already re-render
  on TanStack's own staleness flow anyway). If TestFlight QA
  surfaces a perf issue with thousands of favorites, P3 can swap
  to a memoized `select` with `structuralSharing: false` or move
  the Set transform to a `useMemo` at the call site.

### Suggestions (taken or deferred)

- **Suggestion:** Add a `BusinessHero` isFavorited prop with the
  default `false`, so detail-screen callers that don't yet pipe
  through the Set continue rendering the heart as outline.
  **Taken** — `BusinessHero` already has the `interactive` prop
  pattern from P1. Adding `isFavorited?: boolean` defaulting
  `false` follows the same shape.

- **Suggestion:** Show a small disabled state on the heart during
  the in-flight mutation so a panicked double-tap doesn't fire
  the opposite mutation mid-flight.
  **Deferred** — TanStack mutations queue by default and the ops
  are idempotent server-side. P3 polish can add the disabled state
  if TestFlight QA flags it. Locked acceptance criterion:
  "rapid double-tap doesn't break server state" (which it can't,
  given idempotency).

- **Suggestion:** Empty-state copy for `/account/favorites`.
  **Locked** — "No favorites yet. Tap the heart on any business
  to save it here." + a "Browse the directory" CTA pushing
  `/categories`.

- **Suggestion:** Pull-to-refresh on `/account/favorites`.
  **Locked** — yes, FlatList `refreshControl` wired to
  `useFavorites().refetch`.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- REST shape confirmed: POST `/api/v1/favorites` body
  `{ business_id }`; DELETE
  `/api/v1/favorites/{business_id}`; GET `/api/v1/favorites/mine`
  + `/mine/ids`.
- `useToggleFavorite()` returns a mutate that accepts
  `{ businessId, currentlyFavorited }`. Caller is the source of
  truth for current state.
- `FavoriteHeart` outline color drift fix included in T2:
  `#735239` → `#66503f`.
- No section header in the Account screen — single "Favorites"
  row above the existing Profile section.
- Account `index.tsx` content preserved byte-for-byte; only
  addition is the Favorites row at top.
- `BusinessHero` gains an `isFavorited?: boolean` prop defaulting
  `false`. Detail screen calls `useFavoriteIds()` and passes the
  resolved boolean.
- Acceptance criterion explicitly covers idempotency: "rapid
  double-tap doesn't break server state (server ops are
  idempotent)".

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit). `/mlabs-code` runs autonomously
but pauses if a task lists a **Pause if** trigger that matches the
situation.

### Task 1: Favorites feature scaffold (api + hooks)

- **Files:**
  - `apps/mobile/features/favorites/api.ts` (new)
  - `apps/mobile/features/favorites/hooks.ts` (new)
- **What:** Build the data layer.

  `api.ts` exports:
  - `addFavorite(businessId: string)` → `POST /api/v1/favorites`
    via `apiPost` with body `{ business_id }`. Returns
    `FavoriteMutationOutput`.
  - `removeFavorite(businessId: string)` → `DELETE
    /api/v1/favorites/{business_id}` via `apiDelete`.
  - `listMyFavorites()` → `GET /api/v1/favorites/mine` via
    `apiGet`. Returns `{ items: Business[] }`.
  - `listMyFavoriteIds()` → `GET /api/v1/favorites/mine/ids` via
    `apiGet`. Returns `{ ids: string[] }`.

  `hooks.ts` exports:
  - `useFavoriteIds()` → `useQuery` keyed by `["favorites", "ids"]`.
    `select: (data) => new Set(data.ids)` transforms the wire
    array into a Set. `staleTime: 60_000` (one-minute cache, warm
    during a browse session). Enabled unconditionally — mobile is
    signin-first inside `(app)` so callers always have a session.
  - `useFavorites()` → `useQuery` keyed by
    `["favorites", "mine"]`. `staleTime: 60_000`. Returns
    `Business[]` via `data?.items ?? []`.
  - `useToggleFavorite()` → `useMutation`. Accepts
    `{ businessId: string, currentlyFavorited: boolean }`.
    Branches on `currentlyFavorited` to `addFavorite` vs
    `removeFavorite`. Optimistic flow:
    - `onMutate`: cancel `["favorites", "ids"]` queries, snapshot
      the cache, flip the businessId in the Set (add when
      currentlyFavorited=false, remove when true).
    - `onError`: roll back to the snapshot.
    - `onSettled`: invalidate BOTH `["favorites", "ids"]` and
      `["favorites", "mine"]`.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
  - `useFavoriteIds().data` returns `Set<string>` (verifiable via
    typecheck on `.has(string)` calls in T2).
  - `useFavorites().data` returns the wire shape
    `{ items: Business[] } | undefined`.
- **Pause if:**
  - `apiDelete` signature differs from `(path: string) =>
    Promise<void>` (verified during review; should be stable).

### Task 2: Wire FavoriteHeart toggle + caller-passes-prop on every browse screen

- **Files:**
  - `apps/mobile/features/listings/components/FavoriteHeart.tsx` (edit)
  - `apps/mobile/features/listings/components/BusinessCard.tsx` (edit)
  - `apps/mobile/features/listings/components/BusinessHero.tsx` (edit)
  - `apps/mobile/app/(app)/index.tsx` (edit)
  - `apps/mobile/app/(app)/listings/[category].tsx` (edit)
  - `apps/mobile/app/(app)/listings/[category]/[id].tsx` (edit)
- **What:**

  **`FavoriteHeart`** — accept `businessId: string` + `isFavorited:
  boolean` props. Drop the visual-only stub. On tap, fire
  `useToggleFavorite().mutate({ businessId, currentlyFavorited:
  isFavorited })`. Render filled `heart` (red, `#dc2626`) when
  `isFavorited`, outline `heart-outline` (muted-foreground,
  **`#66503f`** per the drift fix) otherwise. Accessibility label
  reflects the action: "Unfavorite" vs "Favorite". No disabled
  state during mutation (idempotency covers double-tap; TanStack
  queues serial calls).

  **`BusinessCard`** — pass `businessId={business.id}` and the
  existing `isFavorited` prop down to `FavoriteHeart`. No change
  to BusinessCard's own props (already accepts `isFavorited?:
  boolean` from P1).

  **`BusinessHero`** — add `isFavorited?: boolean` prop (default
  `false`). Pass `businessId={business.id}` and `isFavorited` to
  `FavoriteHeart`.

  **`(app)/index.tsx` (Home)** — call `useFavoriteIds()` at the
  top of the component. Pass `isFavorited={favIds.has(b.id)}` to
  each `BusinessCard` in the Featured Businesses list. If
  `useFavoriteIds().data` is undefined (initial load), pass `false`
  so hearts render as outline until the Set arrives.

  **`(app)/listings/[category].tsx`** — same pattern. Call
  `useFavoriteIds()` at the screen level. Pass `isFavorited` to
  each `BusinessCard` in the FlatList renderItem.

  **`(app)/listings/[category]/[id].tsx`** — call
  `useFavoriteIds()`. Pass `isFavorited={favIds.has(business.id)}`
  to `BusinessHero`.

- **Acceptance:**
  - Tapping the heart on a `BusinessCard` flips the icon
    immediately (optimistic).
  - On network failure, the heart reverts to its prior state (no
    toast, silent revert).
  - Tapping a heart on Home → opening that business's detail
    screen → the heart on the hero is filled.
  - Tapping a heart on Detail → returning to Home → the same
    business's card heart is filled.
  - Rapid double-tap doesn't break server state (idempotent ops).
  - `FavoriteHeart` outline color is `#66503f` (regenerated
    `mutedForeground` token).
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
- **Pause if:**
  - The shared `BusinessCard` prop interface changes require
    edits in callers outside the 3 screens listed (e.g., the
    marketing-page preview `business-panel.tsx` on the web side)
    — surface for review.

### Task 3: Account directory restructure + /account/favorites screen

- **Files:**
  - `apps/mobile/app/(app)/account.tsx` (delete)
  - `apps/mobile/app/(app)/account/_layout.tsx` (new)
  - `apps/mobile/app/(app)/account/index.tsx` (new — content
    preserved byte-for-byte from the deleted `account.tsx`, plus a
    new "Favorites" row above the existing Profile section)
  - `apps/mobile/app/(app)/account/favorites.tsx` (new)
- **What:**

  Convert `account.tsx` flat file to `account/` directory. The
  Tabs.Screen `name="account"` registration in
  `(app)/_layout.tsx` already resolves to `account/index.tsx` via
  expo-router's directory-as-tab semantics — same pattern as
  P2a's `post/` directory swap (commit `f3ef186`).

  **`account/_layout.tsx`** — `<Stack>` wrapper with the same
  header style as `listings/_layout.tsx` and `post/_layout.tsx`
  (paper-cream backgroundColor `#EAE0CB`, foreground
  `#3D2814`). Sets `headerShown: false` on the index screen so
  the Account tab landing matches today's UX (no header on the
  primary tab landing); sub-screens get the default Stack header
  with back chevron.

  **`account/index.tsx`** — same content as today's
  `account.tsx`, byte-for-byte. ONE addition: a "Favorites" row
  above the existing "Profile" section. The row uses the existing
  `Row` helper component already defined in account.tsx
  (label + chevron right). Tap pushes `/account/favorites`.

  **`account/favorites.tsx`** — new stack screen. Calls
  `useFavorites()`. Renders results as a `FlatList` of
  `BusinessCard` rows. EmptyState component reused from
  `features/listings/components/EmptyState`. Pull-to-refresh
  wired via FlatList `refreshControl`. Stack header title:
  "Favorites".

  Empty state copy: "No favorites yet. Tap the heart on any
  business to save it here." + "Browse the directory" button
  pushing `/categories`.

- **Acceptance:**
  - `apps/mobile/app/(app)/account.tsx` is deleted; route
    resolves to `account/index.tsx`.
  - Account tab still renders, tab icon unchanged, sign-out
    still works, delete account still works, push permission
    re-prompt still works (the existing iOS Settings rows are
    preserved).
  - A "Favorites" row appears above the existing Profile section
    on the Account screen.
  - Tapping the Favorites row pushes `/account/favorites`.
  - `/account/favorites` renders the user's favorited
    businesses as `BusinessCard` rows.
  - Empty state renders the locked copy when zero favorites.
  - Pull-to-refresh re-fetches via `useFavorites().refetch`.
  - Stack header on `/account/favorites` shows "Favorites" with
    a back chevron returning to the Account hub.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
- **Pause if:**
  - expo-router complains about the `name="account"` tab now
    resolving to a directory — may need a Metro cache clear
    (same situation as P2a T2).
  - The existing `account.tsx` content has cross-file imports
    that break when relocated to a subdirectory (e.g., `../../`
    paths need to become `../../../`). Adjust paths during the
    move; if anything other than path adjustments is needed,
    surface for review.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not
guess.

- **Heart pressed during a slow network on Detail screen.** The
  hero heart is the prominent CTA on the detail screen; if the
  toggle takes 500ms+ to round-trip, the user might tap a second
  time before the optimistic state flips. TanStack's mutation
  queue serializes the calls in order, so the second tap fires
  the opposite mutation. End state: original. Acceptable; the
  user gets visual feedback (heart flipped twice) and the server
  ends in the right state. If TestFlight QA flags this as
  confusing, P3 adds a disabled state during in-flight.

- **`/account/favorites` initial-mount loading state.** Locked at
  a Skeleton list (4 placeholder cards) during the first fetch.
  Same pattern as Listings stack from P1.

- **`useFavoriteIds()` enabled flag.** Plan says "enabled
  unconditionally — mobile is signin-first." The (app) auth gate
  redirects to `/(auth)/welcome` before any (app) screen mounts
  if the user is signed out. But if the redirect race is slow
  (cold launch), the hook may fire briefly before the redirect
  resolves and 401. `apiClient` swallows 401s gracefully (returns
  no data), so the Set will be empty in that window. No bug. If
  `/mlabs-code` sees a weird 401-loop in dev, that's a different
  issue — surface for review.
