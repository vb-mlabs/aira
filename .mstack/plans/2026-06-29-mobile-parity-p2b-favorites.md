# Plan: Mobile parity (P2b) — Favorites wiring + /account/favorites

**Date:** 2026-06-29
**Slug:** 2026-06-29-mobile-parity-p2b-favorites
**Status:** reviewed
**Author:** Claude (Opus 4.7) via `/mlabs-plan`

---

## Problem

P1 + P2a shipped the listings browse + Community board chains on
mobile. The `FavoriteHeart` rendered on every `BusinessCard` and
`BusinessHero` is still a visual-only Pressable that does nothing —
tap fires but no API call is made, no state change happens. There's
also no `/account/favorites` screen to see what's been favorited.

Who benefits: any signed-in user who wants to bookmark businesses
they like (to call later, to share with family, to find again next
week). Favorites are the simplest commitment loop in the app and
the easiest "this app is mine" signal — without them, the app is
purely browse-and-bounce.

This is **P2b of the mobile-parity series.** P2 is split into three
ships:

| Phase | Scope | Status |
|---|---|---|
| P2a | Community / Post on AIRA board | ✅ shipped (commit `589d893`) |
| **P2b** (this plan) | Favorites wiring + /account/favorites mini-screen | draft |
| P2c | Account hub redesign + remaining sub-pages + Notifications entry | not started |

Web already ships the full favorites loop — every server op is on the
wire and the web `BusinessCard` reads `isFavorited` from a Set fetched
once per page. This plan ports the same pattern to mobile.

## Scope

**In:**

- **`apps/mobile/features/favorites/`** — new feature folder:
  - `api.ts` wrapping 4 endpoints:
    `POST /api/v1/favorites` (add),
    `DELETE /api/v1/favorites/{business_id}` (remove),
    `GET /api/v1/favorites/mine` (full Business[]),
    `GET /api/v1/favorites/mine/ids` (id Set).
  - `hooks.ts` exposing three TanStack wrappers:
    - `useFavoriteIds()` — `useQuery` keyed by `["favorites", "ids"]`,
      transforms the wire `{ ids: string[] }` into `Set<string>` via
      `select`. O(1) `has` for card render lookup.
    - `useFavorites()` — `useQuery` keyed by `["favorites", "mine"]`,
      returns hydrated `Business[]` for the `/account/favorites`
      screen. Stale time longer than `useFavoriteIds` because the
      detail rows change less often than the membership Set.
    - `useToggleFavorite()` — `useMutation` that branches on the
      current state (calls `add` when not favorited, `remove` when
      already). Optimistic toggle on the `["favorites", "ids"]` Set
      cache (matches the `useCreateComment` shape established in
      P2a). `onSettled` invalidates BOTH `["favorites", "ids"]` and
      `["favorites", "mine"]` so the row list re-fetches on next
      mount.

- **`FavoriteHeart` becomes interactive.** Drops the visual-only
  stub behavior. Props: `businessId: string`, `isFavorited: boolean`.
  Tap fires `useToggleFavorite()` with the businessId + current
  state. Filled red heart when favorited, outline-muted when not.

- **Caller-passes-prop pattern** on every screen that mounts
  `BusinessCard` or `BusinessHero`:
  - `apps/mobile/app/(app)/index.tsx` — Home Featured tile
  - `apps/mobile/app/(app)/listings/[category].tsx` — listings stack
  - `apps/mobile/app/(app)/listings/[category]/[id].tsx` — detail hero
  
  Each screen calls `useFavoriteIds()` once at the screen level and
  passes `isFavorited={favIds.has(business.id)}` down to each card.
  Matches the web pattern in `apps/web/src/app/(app)/home/page.tsx`.
  TanStack dedupes the underlying fetch via the shared cache key
  even when multiple screens are mounted.

- **`/account/favorites` mini-screen** — new stack route under the
  Account tab. Renders `useFavorites()` results as a `FlatList` of
  `BusinessCard` rows. EmptyState ("No favorites yet. Tap the heart
  on any business to save it here.") with a CTA pushing
  `/categories`. Pull-to-refresh. Loading skeleton.

- **Account tab restructure** — convert
  `apps/mobile/app/(app)/account.tsx` (flat file) to
  `apps/mobile/app/(app)/account/` (directory) with:
  - `_layout.tsx` (Stack wrapper, paper-cream header matching
    listings/_layout.tsx and post/_layout.tsx)
  - `index.tsx` (the existing Account screen content,
    byte-for-byte preserved; the directory restructure preserves
    the tab landing screen)
  - `favorites.tsx` (the new mini-screen above)
  
  Account hub gains a "Favorites" row above the existing sections;
  tap pushes `/account/favorites`. P2c will continue building out
  the same directory with more sub-pages (listings, posts,
  notifications, etc.).

**Out (deferred):**

- **Account hub full redesign with sub-page row list** — P2c. P2b
  adds a single "Favorites" row to the existing Account screen
  content; the wholesale redesign (web-parity sub-pages list) lands
  in P2c.
- **`/account/listings`, `/account/posts`, `/account/notifications`,
  etc.** — P2c.
- **Optimistic splice of the `/account/favorites` rows cache on
  toggle.** Locked in consultation: only the ids Set flips
  optimistically; the rows list invalidates and re-fetches on next
  mount. (Risk: user toggles a favorite on Home, immediately opens
  /account/favorites, sees a brief loading state. Acceptable; the
  fetch is fast.)
- **Anonymous-user heart hiding.** Mobile is signin-first inside
  `(app)`, so every viewer is signed in by construction. No
  `isSignedIn` branch needed on mobile (web has one because its
  marketing pages can mount BusinessCard anonymously).
- **Failure indication beyond a silent revert.** Web has a tiny
  red-dot indicator when the toggle fails; mobile defers that
  affordance to P3 polish. P2b: silent revert, no toast.
- **Push notification when someone else favorites your business** —
  never planned.

## Approach

Three atomic tasks. Each leaves the app working.

1. **`features/favorites/` scaffold** — `api.ts` (4 wrappers) +
   `hooks.ts` (3 TanStack hooks). Pure data layer. No UI change.
2. **Wire `FavoriteHeart` + caller-passes-prop on every screen.**
   Updates 3 screens (Home, Listings, Detail) + 1 component
   (`FavoriteHeart`). No new routes.
3. **Account directory restructure + `/account/favorites`
   screen.** Convert `account.tsx` → `account/{_layout,index}.tsx`,
   add `favorites.tsx`, add the "Favorites" row that pushes the
   stack screen.

**Why this order:**

- T1 is the foundation everything else uses. Building it first
  means T2 and T3 are pure UI work.
- T2 before T3 because the heart toggle is the highest-leverage
  user-visible change (every browse surface lights up). T3 polishes
  the loop by giving favorites a home.
- T3 includes the account directory restructure that P2c will
  inherit — landing it here means P2c is purely "add more screens
  to the existing Stack", not "restructure the routing".

**Hook design (locked in consultation):**

- `useFavoriteIds()` returns `Set<string>` via TanStack's `select`
  transform. Re-renders only fire when the underlying ids array
  changes (TanStack's structural sharing handles this).
- `useFavorites()` is a separate hook for the rows. Two caches
  keyed independently so a heart toggle doesn't invalidate the rows
  unless the user opens the favorites screen next.
- `useToggleFavorite()` reads the current state from the cache so
  the caller passes only `businessId` + `currentlyFavorited`. The
  hook branches internally to `addFavorite` vs `removeFavorite`.

**Optimistic shape (locked in consultation):**

- `onMutate`: cancel in-flight queries for `["favorites", "ids"]`,
  snapshot the cache, optimistically flip the businessId in the Set.
- `onError`: roll back to the snapshot.
- `onSettled`: invalidate BOTH `["favorites", "ids"]` AND
  `["favorites", "mine"]` so the favorites screen reflects the
  change on next mount.

**Where the fetch happens (locked in consultation):**

- Caller-passes-prop. Home, Listings stack, Detail each call
  `useFavoriteIds()` at the screen level and pass `isFavorited` as
  a prop. Matches the web pattern and the `BusinessCard`'s P1 prop
  shape (`isFavorited?: boolean`).

**Alternatives considered:**

- **BusinessCard self-fetches the Set** — simpler caller API but
  introduces a 50-100ms heart-flicker on initial render if the
  fetch hasn't resolved. The caller-passes pattern wins for
  perceived smoothness.
- **Lift to a `FavoritesProvider` context** — solves the
  duplicate-call concern definitively. TanStack dedupes the fetch
  via shared cache key anyway, so a Provider is overhead for a
  problem that doesn't exist.
- **Single `useFavorites` returning both rows + Set** — couples
  two fetches that have different access patterns. Browsing a
  category should be cheap (Set only); only the
  `/account/favorites` screen needs the rows.
- **Splice rows cache optimistically on toggle** — would require
  reading the full Business object from another cache or refetching
  one row. More code for a marginal win.

## Data model changes

None. Every endpoint required is already on the wire.

## Files to touch

**New:**

- `apps/mobile/features/favorites/api.ts`
- `apps/mobile/features/favorites/hooks.ts`
- `apps/mobile/app/(app)/account/_layout.tsx`
- `apps/mobile/app/(app)/account/index.tsx` (renamed from `account.tsx`
  content; functionally a move, content preserved byte-for-byte
  modulo the added Favorites row)
- `apps/mobile/app/(app)/account/favorites.tsx`

**Edit:**

- `apps/mobile/features/listings/components/FavoriteHeart.tsx` — drop
  the visual-only stub, add real toggle behavior with optimistic
  state from `useFavoriteIds` + `useToggleFavorite`.
- `apps/mobile/features/listings/components/BusinessCard.tsx` —
  pass `businessId` + `isFavorited` to `FavoriteHeart` (today
  passes only `isFavorited`).
- `apps/mobile/features/listings/components/BusinessHero.tsx` —
  same, plus accept `isFavorited` as a prop from the detail screen.
- `apps/mobile/app/(app)/index.tsx` — call `useFavoriteIds()`, pass
  `isFavorited={favIds.has(b.id)}` to each `BusinessCard`.
- `apps/mobile/app/(app)/listings/[category].tsx` — same for the
  listings FlatList.
- `apps/mobile/app/(app)/listings/[category]/[id].tsx` — call
  `useFavoriteIds()`, pass `isFavorited={favIds.has(post.id)}` to
  `BusinessHero`.
- `apps/mobile/app/(app)/_layout.tsx` — no JSX change needed; the
  `Tabs.Screen name="account"` registration still resolves to the
  new `account/` directory. Verify nothing breaks here (same
  pattern as the `post.tsx` → `post/` directory swap in P2a).

**Delete:**

- `apps/mobile/app/(app)/account.tsx` — replaced by
  `apps/mobile/app/(app)/account/index.tsx`.

## Edge cases

- **Heart tapped while another mutation is in flight.** The mutation
  hook serializes per businessId via TanStack's mutation queue
  (default behavior). Rapid double-tap → second call reads the
  updated optimistic state, fires the opposite mutation.
  Acceptable for MVP; race on the server side because the ops are
  idempotent (`addFavorite` is `ON CONFLICT DO NOTHING`,
  `removeFavorite` is `DELETE ... WHERE`).
- **Heart tapped on a card whose business id isn't in the
  `["favorites", "ids"]` cache yet** (e.g., page just loaded, fetch
  in flight). The card receives `isFavorited={false}` until the
  fetch resolves, then the props re-flow. Tapping during this window
  optimistically adds → server-side add succeeds → cache reconciles.
  No bug.
- **/account/favorites lands during an in-flight toggle.** The
  rows cache might be stale (the toggle hasn't invalidated it yet
  if the toggle just started). User sees the pre-toggle state for
  ~500ms, then `onSettled` invalidates and the screen re-renders
  with the new row. Acceptable.
- **No favorites + empty state copy.** "No favorites yet. Tap the
  heart on any business to save it here." plus a "Browse the
  directory" CTA pushing `/categories`.
- **Network failure mid-toggle.** `onError` rolls back the Set; the
  heart flips back to its prior state. No toast. User can retry.
- **`useFavoriteIds()` returns an empty result before sign-in
  completes.** Mobile is signin-first per the (app) auth gate, so
  this shouldn't happen. If it does (race in dev), the cards just
  show all hearts as outline; the toggle still works once the
  session lands.
- **The Account tab restructure breaking the Auth flow.** The
  existing `account.tsx` content (including sign-out, delete
  account, push permission re-prompt) must move to
  `account/index.tsx` byte-for-byte. No behavior change.
- **Adding "Favorites" row above existing Account content** — the
  current `account.tsx` uses an iOS-Settings-style row layout. The
  new "Favorites" row follows the same pattern + sits in a new
  "My collections" section above "Profile" / "Notifications" /
  "Security" / "Danger Zone".

## Acceptance criteria

- [ ] `apps/mobile/features/favorites/api.ts` exports
  `addFavorite(businessId)`, `removeFavorite(businessId)`,
  `listMyFavorites()`, `listMyFavoriteIds()` — all returning typed
  payloads from `@aira/validators`.
- [ ] `apps/mobile/features/favorites/hooks.ts` exports
  `useFavoriteIds()` (returns `Set<string>` via `select` transform),
  `useFavorites()` (returns hydrated rows), `useToggleFavorite()`
  (optimistic).
- [ ] `FavoriteHeart` accepts `businessId` + `isFavorited` props
  and fires the toggle mutation on tap.
- [ ] Tapping the heart on a `BusinessCard` flips the icon
  immediately (optimistic), even before the server responds.
- [ ] On network failure, the heart reverts to its prior state.
- [ ] Tapping a heart on Home → opening that business's detail
  screen shows the heart as filled (cross-screen sync works via
  shared TanStack cache).
- [ ] Tapping a heart on Detail → returning to Home shows the
  same business's card heart as filled.
- [ ] `apps/mobile/app/(app)/account.tsx` is deleted; the route is
  now `apps/mobile/app/(app)/account/index.tsx` with byte-for-byte
  preserved content + one new "Favorites" row.
- [ ] Account tab still renders, tab icon unchanged, sign-out
  still works.
- [ ] Tapping "Favorites" on the Account screen pushes
  `/account/favorites`.
- [ ] `/account/favorites` renders `useFavorites()` results as a
  `FlatList` of `BusinessCard` rows.
- [ ] Empty state renders the locked copy when zero favorites.
- [ ] Pull-to-refresh re-fetches.
- [ ] `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
- [ ] Verified on Expo Go via the ws-tunnel against the live API:
  toggle a heart on Home → see it fill instantly → open
  /account/favorites → confirm the business appears.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **REST URL shape for add vs remove.** Web has:
  - `POST /api/v1/favorites` with body `{ business_id }` (add)
  - `DELETE /api/v1/favorites/{business_id}` (remove)
  
  Mobile mirrors. The `apiPost` wrapper handles POST cleanly;
  `apiDelete` (already in `lib/api/client.ts`) handles DELETE. Wire
  the api.ts wrappers accordingly.

- **`useToggleFavorite` signature.** Two options:
  1. `useToggleFavorite()` returns a mutate that takes
     `{ businessId, currentlyFavorited }`. Caller reads from the
     Set + passes the boolean.
  2. `useToggleFavorite(businessId)` returns a mutate that reads
     the current state from the cache internally.
  
  Option 1 keeps the hook stateless (cleaner), option 2 keeps the
  caller API tighter. Recommendation: option 1; the cache read
  inside the hook is fragile if the Set hasn't loaded yet.

- **"My collections" vs "Collections" vs just "Favorites" as the
  Account section header.** Locked at "My collections" so when P2c
  adds "My listings" and "My posts" rows, they sit in the same
  semantic group. Reviewer may rename; one-line change.

- **Account `_layout.tsx` Stack header style.** Match the existing
  `listings/_layout.tsx` and `post/_layout.tsx` (paper-cream
  backgroundColor `#EAE0CB`, foreground `#3D2814`). Locked.

- **Verify the `Tabs.Screen name="account"` registration in
  `(app)/_layout.tsx` still resolves correctly after the directory
  swap.** Same as the `post.tsx` → `post/` directory swap in P2a's
  T2. Should work via expo-router's directory-as-tab resolution
  (the `post/` tab works fine), but worth a Metro cache check after
  T3.

- **Account index screen retains its existing sign-out / delete /
  push-permission rows.** P2c will redesign the full hub; P2b just
  inserts a new "Favorites" row above the existing layout. Reviewer
  may push back if the visual hierarchy looks off — but the
  alternative (delaying the redesign to P2c) means P2b ships with
  no entry point to the favorites screen.
