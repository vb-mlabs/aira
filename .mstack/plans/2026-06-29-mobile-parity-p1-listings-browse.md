# Plan: Mobile parity (P1) — 4-tab refactor + Home + Categories + Listings + Business detail

**Date:** 2026-06-29
**Slug:** 2026-06-29-mobile-parity-p1-listings-browse
**Status:** implemented
**Author:** Claude (Opus 4.7) via `/mlabs-plan`

---

## Problem

The AIRA mobile app (Expo SDK 54, `apps/mobile/`) ships today with only
scaffolding: an auth flow, a `Messages` screen (deprecated — admin
broadcast lives in `Notifications` now), a `Notifications` screen, and a
placeholder `Profile` tab. None of the user-facing surfaces that make
AIRA actually useful exist on mobile yet — no category browser, no
listings, no business detail, no community board, no favorites, no
account hub. A TestFlight installer sees a directory shell with nothing
inside.

Web (`apps/web/(app)/`) has the full feature set. Every endpoint a
non-admin needs is already on `/api/v1/*` and accessible via the typed
fetch client at `apps/mobile/lib/api/client.ts` (with
`EXPO_PUBLIC_API_BASE_URL` correctly wired across all three bundle
producers — see `apps/mobile/.env.example`). The blocker is purely UI
work on mobile.

Who benefits: the user (persona "Atlanta resident scanning for verified
local Indian businesses") gets a real app to install from TestFlight.
The wedge is **web→mobile parity for everything a non-admin sees**, so
the eventual store submission ships an app worth opening.

This is **P1 of a 3-plan series** (locked during planning consultation):

| Phase | Scope | Status |
|---|---|---|
| **P1** (this plan) | 4-tab refactor + Home + Categories + Listings + Business detail | draft |
| P2 | Community / Post on AIRA + Account hub sub-pages + Favorites | not started |
| P3 | Push deep-links + polish + TestFlight prep | not started |

## Scope

**In:**

- **Bottom-tab refactor.** Convert `apps/mobile/app/(app)/_layout.tsx`
  from the current 4 tabs (Home / Messages / Notifications / Profile) to
  the new 4 tabs (Home / Categories / Post / Account). The `Post` tab
  is the entry to the Community / "Post on AIRA" board (its screen is
  built in P2 — this plan ships an empty Post tab with a "Coming soon"
  placeholder so the layout is locked).
- **Delete `Messages` end-to-end on mobile.** Remove
  `apps/mobile/app/(app)/messages/*`, remove `apps/mobile/features/messages/`,
  remove `useConversations` callers from the layout, remove the
  Messages tab badge logic. Web `Messages` stays untouched.
- **Mobile `Home` screen.** Replace today's "Welcome / Get started"
  placeholder with the real home content — greeting, featured tile
  (calls `featuredBusinessesOp`, mirrors web `getFeaturedBusinesses`),
  categories shortcut row, Post on AIRA preview card with "See all"
  link to the `Post` tab.
- **Categories tab.** Full-screen category browser — list of active
  category roots from `listCategoriesOp` (already exists, used by
  web sidebar). Each tile routes to the listings stack screen for
  that category.
- **Listings stack screen.** New stack route at `(app)/listings/[category].tsx`
  rendering the paginated business list for one category. Mirrors web
  `/listings/[category]/page.tsx` features: pagination (12/page default),
  scoped keyword search with debounce, verified filter toggle.
  Sorting (sponsored-first within category) is inherited from the
  service-side `listBusinessesOp` — no mobile work needed.
- **Business detail stack screen.** New stack route at
  `(app)/listings/[category]/[id].tsx` with hero, About Us, Contact
  card, AIRA Review card, gallery, social links. The favorite heart
  ships in P2 (alongside the rest of favorites wiring); business
  detail in P1 just hides the heart for now (matches the
  `isSignedIn={false}` branch).
- **Account tab placeholder.** Rename `Profile` → `Account`, keep the
  current shape (greeting + sign-out button). The full hub redesign
  with sub-page list is P2's work; P1 just renames + reorders.

**Out (deferred):**

- **Community board** (`(app)/community/*`). P2.
- **Account hub sub-pages** (favorites, listings, posts, notifications,
  privacy-security, terms, about). P2.
- **Favorite heart on BusinessCard.** P2.
- **Notifications as a tab.** Removed from the 4-tab layout; the
  Notifications screen still exists at `(app)/notifications.tsx` and is
  reachable through the existing post-broadcast flow, but no new entry
  point in this plan. The bell-icon-in-header-of-Home pattern (or the
  Account hub mirror) lands in P2.
- **Push deep-links** (taps on a notification → specific screen). P3.
- All `/admin/*` surfaces. Never on mobile.
- **Anonymous browsing.** Mobile stays signin-first — user lands on the
  welcome screen, signs up or in, then sees everything. No anonymous
  fetch branch in P1 (and probably ever for MVP). This matches today's
  mobile behavior and simplifies state management.
- **Force-update dialog** (F26). S7.
- **Universal-link path widening** (currently `/verify*`,
  `/reset-password*` only). F25 / S7.

## Approach

P1 is a **5-task** sequence designed so each task leaves a working,
launchable app on the simulator. Each builds bottom-up on what the
previous task delivered:

1. **Tab refactor first** — gut Messages, restructure `_layout.tsx` to
   the new 4 tabs (Home / Categories / Post / Account). The Categories
   and Post tabs ship as `Coming soon` placeholder screens; that's
   intentional so the layout is locked and visible before any feature
   code lands.
2. **Home screen** with real content — greeting + featured tile +
   categories shortcut row + Post on AIRA preview. This is the single
   highest-leverage screen because it's what the user lands on after
   sign-in; making it real makes the whole app feel real.
3. **Categories tab** — full browser. Routes to listings on tap.
4. **Listings stack** at `/listings/[category]` — paginated + searchable +
   verified-filter.
5. **Business detail stack** at `/listings/[category]/[id]` — full
   detail card stack matching web.

After task 5, the app is TestFlight-able as a v1 of the listings
experience. P2 builds Community + Account on top.

**Why this order over alternatives:**

- **Why not vertical-slice (detail first, navigate backward)?** The
  business detail screen is the deepest in the navigation tree. Building
  it first would mean either hardcoding the params for solo testing
  (wasteful — that scaffolding gets thrown away the moment the listings
  screen exists) or shipping the whole nav chain blind. Bottom-up means
  each screen is exercised through the real nav as soon as it lands.
- **Why not skip the tab refactor?** The current `_layout.tsx` has 4
  tabs including Messages, which the user explicitly wants removed.
  Carrying it forward through 5 feature tasks just delays the inevitable
  delete + makes every screenshot review confusing ("why is Messages
  still there?"). Land the refactor as T1 and the rest of the plan
  ships cleanly into the new layout.
- **Why a placeholder for Post tab?** The Post tab IS the Community
  board (P2's work). Shipping a placeholder gates the tab visibility on
  P1 alone, which is the right unit — if the layout review surfaces a
  "5 tabs would be better" decision, we lose only the placeholder.
  Locking the layout in P1 also makes P2 a content-only ship.

**Reuse from web — what's already on the wire:**

- `listCategoriesOp` / `listCategoriesTreeOp` — categories
- `listBusinessesOp` (with `q`, `page`, `pageSize`, `verified` filters)
  — listings
- `getBusinessOp` (or whatever fetches a single business detail) — detail
- `featuredBusinessesOp` — home featured tile
- All exposed via the existing typed fetch client. Mobile calls them
  through the same `apiRequest` wrapper used by `useMe` /
  `useUnreadCount` today.

**Navigation pattern:**

- Bottom tabs (4) via `expo-router` `Tabs` (already in use).
- Each tab's stack uses `expo-router` file-system routing — e.g.
  `app/(app)/listings/[category].tsx` and
  `app/(app)/listings/[category]/[id].tsx` automatically become a stack
  when navigated from the Home or Categories tab.
- Header on each screen uses `Stack.Screen` `options` to set title +
  back button. Navigation is via `router.push("/listings/restaurants")`
  etc.

**Data fetching:**

- TanStack Query (already used by web RSCs through the `apiClient`
  wrapper and by mobile hooks like `useMe`). Each screen gets a
  feature-folder under `apps/mobile/features/` with `hooks.ts`
  (`useBusinesses`, `useBusinessDetail`, `useCategories`,
  `useFeatured`) and `api.ts` (calling the fetch client).
- Pagination on the listings screen: keep URL-driven on web, but on
  mobile use a single page-state + "Load more" button OR infinite
  scroll via FlatList `onEndReached`. **Choice locked here:** infinite
  scroll via FlatList — matches mobile UX expectation, no
  "Load more" friction. URL state is irrelevant on mobile.
- Pull-to-refresh on listings + home using FlatList's
  `refreshControl`. Required for mobile UX baseline.

**Styling:**

- NativeWind continues — every component uses Tailwind classes that map
  to the generated `tailwind.config.js` from `packages/config`. Same
  tokens as web.
- Reuse existing `apps/mobile/components/ui/*` primitives (`Button`,
  `Skeleton`). Build new shared components under
  `apps/mobile/features/listings/components/` mirroring the web
  structure: `BusinessCard.tsx` (mobile flavor), `CategoryTile.tsx`,
  `RatingPill.tsx`, `SocialIcons.tsx`. Each is a hand-port of the web
  component to RN primitives (no shared cross-platform `<View>` /
  `<Text>` abstraction — that's a known anti-pattern that wastes weeks).

**Alternatives considered:**

- **Single mega-plan with ~30 tasks** — rejected because review surface
  is too big, code skill runs are too long, and bailing mid-way is
  painful. Series of phased plans keeps reviews tight and decisions
  visible.
- **Two plans (read-only first, actions later)** — rejected because
  Favorites belongs naturally with the rest of Account hub work in
  P2; splitting it would just split that work in two.
- **Community in P1** — rejected. The community board is its own UI
  surface (board → post detail → comments → composer modal) and would
  double P1's task count. Adding it later in P2 is risk-free because the
  Post tab is locked in the layout from P1.

## Data model changes

None. Every endpoint required is already on the wire — see the "Reuse
from web" notes above.

## Files to touch

**New:**

- `apps/mobile/app/(app)/categories.tsx` — Categories tab content
- `apps/mobile/app/(app)/post.tsx` — Post tab placeholder (Coming soon
  card), replaced in P2
- `apps/mobile/app/(app)/listings/[category].tsx` — listings stack
  screen
- `apps/mobile/app/(app)/listings/[category]/[id].tsx` — business
  detail stack screen
- `apps/mobile/features/listings/api.ts` — fetch client calls
- `apps/mobile/features/listings/hooks.ts` — `useBusinesses`,
  `useBusinessDetail`, `useCategories`, `useFeatured`
- `apps/mobile/features/listings/components/BusinessCard.tsx`
- `apps/mobile/features/listings/components/CategoryTile.tsx`
- `apps/mobile/features/listings/components/RatingPill.tsx`
- `apps/mobile/features/listings/components/SocialIcons.tsx`
- `apps/mobile/features/listings/components/FeaturedTile.tsx`
- `apps/mobile/features/listings/components/SearchBar.tsx`
- `apps/mobile/features/listings/components/VerifiedFilterChip.tsx`

**Edit:**

- `apps/mobile/app/(app)/_layout.tsx` — gut Messages + Notifications +
  Profile tabs, add Categories + Post + Account tabs, remove
  `useConversations` import + badge logic
- `apps/mobile/app/(app)/index.tsx` — replace placeholder Home with
  real content (greeting + featured + categories + post preview)
- `apps/mobile/app/(app)/profile.tsx` — rename to `account.tsx` and
  keep the existing greeting + sign-out shape (real Account hub
  redesign is P2)

**Delete:**

- `apps/mobile/app/(app)/messages/[id].tsx`
- `apps/mobile/app/(app)/messages/index.tsx`
- `apps/mobile/app/(app)/messages/_layout.tsx`
- `apps/mobile/features/messages/` (entire directory)

## Edge cases

- **Tab badge cleanup.** The current `_layout.tsx` has `Badge` logic
  for `Messages` (unread conversations) + `Notifications` (unread
  count). After the refactor: no badges in the tab bar at all (P2
  decides where notifications-bell-with-badge lands). Make sure the
  badge React component itself isn't deleted yet — P2 may want it on
  a header glyph.
- **Sign-out from Profile/Account.** Today's `apps/mobile/app/(app)/profile.tsx`
  has a sign-out button. After the rename to `account.tsx`, that flow
  must continue working — the auth gate in `_layout.tsx` is the source
  of truth for routing post-sign-out, and the gate logic is unchanged
  by this plan.
- **Auth redirect on cold launch.** `apps/mobile/app/(app)/_layout.tsx`
  redirects to `/(auth)/welcome` when `me.isError || !me.data?.emailVerified`.
  The refactor must preserve that guard. Don't accidentally delete the
  `useMe` call when stripping the Messages-related hooks.
- **Push pre-prompt gate.** `NotificationsPrePrompt` fires on first
  post-login render from `_layout.tsx`. Preserve the
  `prePromptVisible` state machine through the refactor.
- **Listings pagination on slow networks.** Infinite scroll via
  `onEndReached` can fire multiple times before the first response
  lands. Use TanStack Query's `useInfiniteQuery` (already an
  established pattern) — its `isFetchingNextPage` flag prevents the
  double-fire issue.
- **Empty states.** A category with zero active businesses, a search
  with no matches, and a brand-new install with no featured listings
  all need empty states (not "loading forever"). Reuse the `Skeleton`
  primitive for the loading state; build `EmptyState` as a small
  component in the listings feature folder.
- **`isSignedIn` on BusinessCard.** The web component renders the
  favorite heart only when `isSignedIn`. Mobile is always signed-in
  inside `(app)`, so the heart could always be visible — but P1
  defers the favorite wire-up entirely. Hide the heart in P1's
  BusinessCard; P2 turns it on when the favorites feature lands.
- **Image loading on flaky cell connections.** `next/image` works on
  web; mobile uses `<Image>` from `expo-image` or `react-native`'s
  built-in. The featured tile + business detail hero need a
  fallback / placeholder. Default to `react-native`'s `<Image>` with
  `defaultSource` for the placeholder; if perf is bad in TestFlight,
  upgrade to `expo-image` in P3 as a perf pass.
- **Featured listings screenshot drift.** The marketing page's
  PhoneShowcase uses screenshots of the web app at mobile viewport. The
  real mobile app screens will diverge — different padding, RN
  primitives, etc. Plan ahead: after P1 ships, decide whether to swap
  the marketing PhoneShowcase to real Expo screenshots or keep using
  web-at-mobile-viewport (cheaper to maintain). Not a P1 blocker.

## Acceptance criteria

- [ ] `apps/mobile/app/(app)/_layout.tsx` exports 4 tabs in this
  order: Home / Categories / Post / Account.
- [ ] No `Messages` references anywhere in `apps/mobile/` (`git grep`
  clean).
- [ ] No `Notifications` tab in the layout; `(app)/notifications.tsx`
  still exists as a stack route (deletion is P2's call).
- [ ] Tapping the `Categories` tab shows a list of active root
  categories, fetched from `listCategoriesOp`.
- [ ] Tapping a category routes to `/listings/<slug>` and shows the
  paginated business list.
- [ ] The listings screen supports keyword search (debounced) +
  verified-filter chip toggle.
- [ ] Infinite scroll on listings loads page 2 when the user
  approaches the end of the list.
- [ ] Pull-to-refresh on listings + home re-fetches the data.
- [ ] Tapping a business card routes to `/listings/<slug>/<id>` and
  shows the detail screen with hero, About Us, Contact, AIRA Review
  cards.
- [ ] Tapping the `Post` tab shows a placeholder "Coming soon"
  screen (P2 fills it in).
- [ ] Tapping the `Account` tab shows a greeting + sign-out button
  (renamed from `Profile`, behavior preserved).
- [ ] Auth redirect to `/(auth)/welcome` still fires on cold launch
  when not signed in.
- [ ] Push pre-prompt modal still appears on first post-login render.
- [ ] `pnpm typecheck` clean across `@aira/mobile` (and the rest of
  the workspace since types are shared).
- [ ] `pnpm lint` clean across `@aira/mobile`.
- [ ] Verified on Expo Go via the live ws-tunnel against
  `https://airabynisarga.com` (the
  `EXPO_PUBLIC_API_BASE_URL=https://...` env flow from earlier this
  session) — no "Network error" on any of the new screens.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Notifications entry point during P1.** Today the
  `Notifications` tab is the only way into
  `(app)/notifications.tsx`. After the tab is removed in T1, there's
  no entry point on Home / Categories / Post / Account until P2 builds
  a bell-icon-in-header (or the Account hub adds a Notifications
  sub-page). Options for P1:
  1. Leave the notifications screen orphaned (still mounted, no UI
     entry) — clean cut, P2 wires it back. The push-tap deep-link in
     P3 still routes there.
  2. Add a temporary bell icon to the Home header in T2. ~30 min of
     work but means re-doing in P2 if the placement changes.
  3. Add a "Notifications" link to the Account placeholder. Cheapest
     but discoverability-poor.
  Recommendation: **option 1** (orphan the screen during P1), since
  P2 ships immediately after. If TestFlight QA happens between P1 and
  P2, the screen is still reachable via the push-tap flow.

- **`expo-image` adoption** — if perf is bad on first install,
  switching from `react-native` `<Image>` to `expo-image` is a clean
  upgrade. Not a P1 blocker but worth flagging for the reviewer:
  should we adopt now (one-time cost) or defer until P3 polish?

- **`useInfiniteQuery` adoption.** TanStack Query's pattern is
  established but not yet used in `apps/mobile/`. P1 introduces it for
  the listings feed. Acceptable, or should we use a simpler
  `useQuery` + manual page state for the first ship?

- **Empty-state copy.** "No businesses found" vs "Be the first to
  discover…" vs "Try a different category" — locked decision needed
  before T4. Default to short, voice-on-brand sentences ("No
  businesses in this category yet.") and let the reviewer push back if
  it should be more inviting.

- **Mobile-specific Business `image_url` aspect ratios.** Web uses
  `1200×630` JPEGs (from the F13 feature image work). Mobile detail
  hero might need a different crop. Decision needed: stretch the same
  image vs. ask for a `_mobile.jpg` variant. Recommend stretch for
  P1, revisit if visually broken.

- **`Post` tab placeholder copy.** "Coming soon" is a safe default but
  may set the wrong tone if a TestFlight reviewer demos before P2.
  Options: "Post on AIRA is launching soon — check back next week" /
  "Community board (coming in next update)" / leave the tab visible
  but disabled. Locked decision needed.

- **Deviation from the V4 mockup tab lock.** The V4 mockup locked at 3
  tabs. The user's explicit decision in P1 consultation is to ship 4
  tabs (Home / Categories / Post / Account). Recorded as a deliberate
  override here for the audit trail.
