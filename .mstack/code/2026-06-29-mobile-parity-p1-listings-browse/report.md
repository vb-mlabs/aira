# Implementation report: Mobile parity (P1) — listings browse

**Review:** [2026-06-29-mobile-parity-p1-listings-browse](../../reviews/2026-06-29-mobile-parity-p1-listings-browse.md)
**Branch:** `feat/qa-test-accounts-seed`
**Status:** complete
**Started:** 2026-06-29 17:30
**Completed:** 2026-06-29 18:35

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| T1 | 4-tab refactor + delete Messages + rename Profile → Account | ✓ done | `1aff165` |
| T2 | Mobile Home — brand-led mirror | ✓ done | `4069d33` |
| T3 | Categories tab | ✓ done | `98a78db` |
| T4 | Listings stack screen (paginated + search + verified filter) | ✓ done | `67b20ed` |
| T5 | Business detail stack screen | ✓ done | `d9ebb8d` |

## Commits (chronological)

```
2a8a144  chore(mstack): mobile parity P1 plan + review                    [prep]
1aff165  feat(mobile): 4-tab refactor (Home/Categories/Post/Account); delete Messages
4069d33  feat(mobile): brand-led Home + listings feature scaffold
98a78db  feat(mobile): Categories tab — full category browser
67b20ed  feat(mobile): Listings stack screen — paginated + search + verified filter
d9ebb8d  feat(mobile): Business detail stack screen — hero + cards + gallery
```

## What shipped

Mobile (`apps/mobile/`) now has the core listings browse flow end-to-end:

- **Bottom tab bar refactored to 4 tabs:** Home / Categories / Post / Account.
  Messages tab + entire `features/messages/` deleted. Notifications screen
  orphaned (still mounted as a hidden route for push deep-link routing).
  Post tab ships as a soft placeholder ("Post on AIRA" / "Coming in the next
  update.") until P2.
- **Home screen** structurally mirrors web Home — AIRA tree-of-life logo,
  wordmark, tagline, about title + body, 2 stat cards (live Businesses count
  + Community Members), Featured Businesses list (max 6, hidden when empty).
  Pull-to-refresh wired.
- **Categories tab** lists active root categories from `listCategoriesOp`.
  Tap routes to `/listings/<slug>`. Skeleton + EmptyState + pull-to-refresh.
- **Listings stack** at `/listings/[category]`. Paginated infinite scroll via
  `useInfiniteQuery`, debounced search (300ms), verified filter chip toggle.
  Empty + search-empty + loading states. Pull-to-refresh.
- **Business detail stack** at `/listings/[category]/[id]`. Hero (image +
  name + verified + category + AIRA Stars rating), About card, Contact card
  (phone / WhatsApp / website / address / hours rows, each tappable to the
  native intent), AIRA Review card, Gallery (horizontal scroll over up to
  3 images). 404 + loading states. Each card hides when its underlying field
  is empty.

New code structure under `apps/mobile/`:

- `features/listings/api.ts` — `listBusinesses`, `getBusinessCount`,
  `listCategories`, `getCategoryBySlug`, `getBusinessById`
- `features/listings/hooks.ts` — `useFeatured`, `useBusinessCount`,
  `useCategories`, `useCategory`, `useListings` (infinite),
  `useBusinessDetail`
- `features/listings/category-meta.ts` — slug → MaterialCommunityIcons map
  (matches the 7 seeded categories; falls back to `tag` for unknown)
- `features/listings/components/` — `BusinessCard`, `RatingPill`,
  `SocialIcons` (compact action-first 4-icon cap), `StatCard`,
  `FavoriteHeart` (P1 visual stub), `CategoryTile`, `EmptyState`,
  `SearchBar` (debounced), `VerifiedFilterChip`, `BusinessHero`,
  `AboutCard`, `ContactCard`, `AiraReviewCard`, `Gallery`

## Verification status

- `pnpm --filter @aira/mobile typecheck` — ✓ clean after every task
- `pnpm --filter @aira/mobile lint` — ✓ clean after T5 fixup
- Lefthook pre-commit hooks ran on every commit (check-migrations,
  check-contrast) — ✓ all green
- **Verified on Expo Go via the live ws-tunnel** — pending; you should
  re-launch the workflow and exercise the chain end-to-end. The
  `EXPO_PUBLIC_API_BASE_URL=https://airabynisarga.com` setup from the
  earlier session is still in `apps/mobile/.env.local`, so API calls
  hit the live data.

## Follow-ups (carried to P2 / P3)

### P2 — Community + Account hub + Favorites

- **Post tab** — replace the placeholder with the real Community board
  (browse posts + composer + post detail + comments + contact reveal).
- **Account hub redesign** — sub-page list mirroring web `/account/*`
  routes (favorites, listings, posts, notifications, privacy-security,
  terms, about). Today's `account.tsx` is the old Profile content
  preserved byte-for-byte.
- **Favorites wiring** — `FavoriteHeart` is a visual-only stub in P1.
  P2 adds the toggle action, optimistic state, and
  `apiClient.post`-driven mutation against `addFavoriteOp` /
  `removeFavoriteOp`. Also touches BusinessCard + BusinessHero header.
- **Notifications entry point** — wire a bell icon to Home header OR
  add a Notifications row in the Account hub. Today the
  `/notifications` route is reachable only via push-tap.

### P3 — Polish + TestFlight prep

- **Push deep-link routing** — when a notification is tapped, route to
  the specific business / post / etc. instead of the default Home.
- **`expo-image` adoption** — if image-load jank surfaces in TestFlight,
  swap `react-native` `<Image>` → `expo-image` for blur-up + caching.
  Requires a native rebuild (config plugin), so it's a P3 polish ship.
- **AIRA wordmark gradient on Home** — web uses `bg-clip-text` for a
  gold vertical gradient on "AIRA". RN doesn't support that directly.
  P3 decision: add `react-native-linear-gradient` masked by the glyph
  (native rebuild) or accept `text-primary` as the mobile finish.
- **`/listings/[category]` header back-to-categories vs back-to-home** —
  the current Stack-back behavior follows the navigation history. If
  TestFlight reviewers find it surprising, customize the back chevron
  to pop to `/categories` explicitly.
- **Marketing PhoneShowcase screenshots may drift** — the marketing
  page's PhoneShowcase uses web-at-mobile-viewport screenshots. Once
  real mobile screens exist, decide: swap to real Expo screen
  captures (more accurate, requires a recorder pipeline) or keep
  web-at-mobile-viewport (cheaper, visually close enough). Out of P1
  scope.
- **Image perf on cellular** — flagged in plan; revisit if TestFlight
  QA surfaces real jank.

### Open from review — still unresolved

- Notifications screen orphan window — landing as P2 task 1.
- Stack header back-button behavior on iOS vs Android — verify on
  TestFlight.
- `listBusinessesOp` permission gate on mobile — should work given the
  `(app)/_layout.tsx` auth guard, but verify if anyone sees a 401 in
  the wild.

## Recommended next step

`/mlabs-qa` is the obvious next move — it walks the chain on Expo Go
(or simulator) and surfaces visual / interaction bugs. Focus areas:

1. Tab swap behavior — does the layout flicker or shift between P0 and
   P1 builds installed side by side?
2. Featured Businesses list rendering — does the live business count
   match the marketing page's stat card?
3. Search + verified filter on Categories listings — debounce feels
   right? Verified chip toggle is obvious?
4. Infinite scroll on a populated category — does it load page 2
   correctly? Does the footer spinner appear?
5. Business detail back navigation — does the back chevron return to
   the listings screen at the same scroll position?
6. Auth gate — does cold launch when signed-out still redirect to
   `/(auth)/welcome`?
7. Push pre-prompt — does it still fire on first post-login render?

After `/mlabs-qa` lands a clean report, we're ready to plan P2.
