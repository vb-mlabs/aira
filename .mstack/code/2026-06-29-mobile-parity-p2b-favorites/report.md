# Implementation report: Mobile parity (P2b) — Favorites

**Review:** [2026-06-29-mobile-parity-p2b-favorites](../../reviews/2026-06-29-mobile-parity-p2b-favorites.md)
**Branch:** `feat/qa-test-accounts-seed`
**Status:** complete
**Started:** 2026-06-29
**Completed:** 2026-06-29

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| T1 | Favorites feature scaffold (api + hooks) | ✓ done | `f1688d1` |
| T2 | Wire FavoriteHeart + caller-passes-prop + drift fix | ✓ done | `dbd47ce` |
| T3 | Account directory restructure + /account/favorites screen | ✓ done | `c246628` |

## Commits (chronological)

```
dd25ab8  chore(mstack): mobile parity P2b plan + review               [prep]
f1688d1  feat(mobile): favorites feature scaffold — api + TanStack hooks
dbd47ce  feat(mobile): wire FavoriteHeart toggle + caller-passes-prop on browse screens
c246628  feat(mobile): Account directory restructure + /account/favorites screen
```

## What shipped

Favorites loop end-to-end on mobile:

- **Tap heart on any BusinessCard / BusinessHero** → optimistic
  fill, server `addFavorite` or `removeFavorite` round-trip, cache
  reconciles `onSettled`. Idempotent server ops mean rapid
  double-tap is safe; no disabled state needed.
- **Cross-screen sync** via the shared `["favorites", "ids"]`
  TanStack cache. Toggle on Home Featured → open Detail → see
  filled heart. Toggle on Detail → back to Home → see filled card
  heart.
- **Account hub** gains a standalone "Favorites" row above the
  Profile section. Account flat file `account.tsx` restructured
  to `account/{_layout,index,favorites}.tsx` directory — same
  pattern as P2a's `post.tsx` → `post/` swap. Tab resolution via
  expo-router's directory-as-tab semantics; no JSX change in
  `(app)/_layout.tsx`.
- **`/account/favorites` mini-screen** — FlatList of BusinessCards
  driven by `useFavorites()` (full rows). Pull-to-refresh.
  EmptyState with "No favorites yet. Tap the heart on any
  business to save it here." + "Browse the directory" CTA pushing
  `/categories`. Each card retains the inline heart toggle so the
  user can unfavorite without leaving the screen.
- **Drift fix** caught + applied: `FavoriteHeart` outline color
  `#735239` → `#66503f` (the third drift fix in this constant
  pre-dating the oklch→hex regen, joining BusinessCard's category
  icon and BusinessHero's placeholder bg).

New code structure under `apps/mobile/`:
- `features/favorites/api.ts` — 4 wrappers
- `features/favorites/hooks.ts` — `useFavoriteIds`, `useFavorites`,
  `useToggleFavorite`
- `app/(app)/account/_layout.tsx` (Stack)
- `app/(app)/account/index.tsx` (the hub, byte-for-byte preserved
  + Favorites row)
- `app/(app)/account/favorites.tsx`

Edited:
- `features/listings/components/FavoriteHeart.tsx` (real toggle +
  drift fix)
- `features/listings/components/BusinessCard.tsx` (passes businessId
  to FavoriteHeart)
- `features/listings/components/BusinessHero.tsx` (gains
  isFavorited prop, passes businessId to FavoriteHeart)
- `app/(app)/index.tsx` (Home calls useFavoriteIds)
- `app/(app)/listings/[category].tsx` (Listings calls useFavoriteIds)
- `app/(app)/listings/[category]/[id].tsx` (Detail calls
  useFavoriteIds)

Deleted:
- `app/(app)/account.tsx` (renamed to `account/index.tsx`)

## Verification status

- `pnpm --filter @aira/mobile typecheck` — ✓ clean after every task
- `pnpm --filter @aira/mobile lint` — ✓ clean after every task
- Lefthook pre-commit hooks ran on every commit (check-migrations,
  check-contrast) — ✓ all green
- **Verified on Expo Go** — pending; you should re-launch the
  workflow and exercise the loop end-to-end.

## Follow-ups (carried to P2c / P3)

### P2c — Account hub redesign + remaining sub-pages + Notifications entry

- The Account hub today has a single "Favorites" row above the
  Profile section. P2c expands this with siblings (my-listings,
  my-posts, notifications, privacy-security, terms, about) and
  may regroup them under a "My collections" section header once
  three+ rows sit in the same group.
- The Notifications screen orphaned in P1 gets its entry-point
  here as `/account/notifications` (locked review decision).
- Edit/delete your own community post from `/account/posts`
  (deferred from P2a; the Account directory restructure here
  unblocks that work).

### P3 — Polish + TestFlight prep

- **Heart disabled state during in-flight** — current behavior is
  no visible disable; TanStack queues mutations + idempotent ops
  cover correctness. If TestFlight QA flags rapid-tap confusion,
  P3 adds a brief disabled state.
- **`/account/favorites` optimistic splice** — current behavior
  invalidates the rows cache `onSettled` so the favorites screen
  re-fetches when next mounted. If a user toggles + immediately
  opens /account/favorites, they see a brief loading state. P3
  may splice the rows array optimistically too (requires reading
  the full Business object from another cache).
- **`useFavoriteIds` Set re-creation on every render** — TanStack
  `select` runs on every render so the Set is rebuilt each time.
  Negligible for ≤100 favorites; if TestFlight QA flags perf on
  power users with thousands of favorites, P3 swaps to a memoized
  select or moves the Set transform out.

## Recommended next step

Open Expo Go and walk the loop:
1. Tap Categories → pick a category → tap heart on a card → see
   optimistic fill
2. Tap into the business detail → confirm heart is filled there
3. Toggle off on detail → back to listings → confirm heart is now
   outline on the card
4. Tap Account tab → see the new "Favorites" row above Profile
5. Tap Favorites → see the businesses you favorited as cards
6. Tap heart on a row inside /account/favorites → confirm the
   business disappears on the next refresh (or stays with an
   outline heart if optimistic-splice isn't wired yet — current
   P2b behavior)

After QA lands a clean report, plan **P2c** (Account hub redesign +
remaining sub-pages + Notifications entry) to close the P2 series.
