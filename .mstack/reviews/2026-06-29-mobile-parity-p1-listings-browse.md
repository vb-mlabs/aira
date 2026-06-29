# Review: Mobile parity (P1) — 4-tab refactor + Home + Categories + Listings + Business detail

**Date:** 2026-06-29
**Slug:** 2026-06-29-mobile-parity-p1-listings-browse
**Plan reviewed:** [2026-06-29-mobile-parity-p1-listings-browse.md](../plans/2026-06-29-mobile-parity-p1-listings-browse.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (Opus 4.7) via `/mlabs-review`

---

## Summary

P1 is ready to implement. The plan's structure (5 atomic tasks, bottom-up
sequencing) is sound and respects all MLabs hard rules (REST through
`@aira/api`, no raw `process.env`, NativeWind+tokens, no new top-level
deps). Three material adjustments during review: (1) corrected two
nonexistent API op names that appeared in the plan, (2) locked the
mobile Home shape to mirror web's brand-led layout (logo / about /
stat cards / featured), (3) locked Notifications-orphan-during-P1 and
the Post tab placeholder copy. UI-Significant flag is `no` because the
heuristic targets `apps/web/**` and this plan only touches
`apps/mobile/**` — no `/mlabs-mockup` gate fires.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** The plan referenced two API ops that don't exist —
  `featuredBusinessesOp` and `getBusinessOp`.
  **Decision:** Replace with the real ops. The featured tile uses
  `listBusinessesOp({ featured: true, limit: 6 })` (same op that powers
  category listings, with a `featured` filter input). Detail uses
  `getBusinessByIdOp`. Also added `countActiveBusinessesOp` to the
  feature hooks list — needed for the brand-led Home's "Businesses
  Listed" stat card and missing from the plan entirely. Real op file:
  `apps/web/src/server/operations/businesses.ts` (lines 43, 121, 136).

- **Concern:** The plan's mobile Home shape (greeting + featured tile +
  categories shortcut + Post-on-AIRA preview) diverged from web Home
  (brand-led: logo + tagline + about + stat cards + featured). For a
  parity-focused plan, divergent Home means the parity story slips.
  **Decision:** Mobile Home **mirrors** web Home structurally: AIRA
  tree-of-life logo + wordmark with gold vertical-gradient `bg-clip-text`
  + tagline caption + about title + about body + 2 stat cards
  (Businesses Listed + Community Members) + Featured Businesses list
  (max 6, hidden when empty). The Post-on-AIRA preview and categories
  shortcut are NOT on Home — users find them via the bottom tabs.
  Source of truth to mirror: `apps/web/src/app/(app)/home/page.tsx`.

- **Concern:** The Notifications screen will be orphaned in P1 (no UI
  entry point) until P2 wires a bell-icon-in-header or
  `/account/notifications`.
  **Decision:** Accept the orphan window. `(app)/notifications.tsx`
  stays mounted as a stack route so push-tap deep-links in P3 still
  resolve, but no header/Account entry is added in P1. Between P1 and
  P2 ships, notifications are reachable only via push-tap. P2 task 1
  will be the bell-icon-in-header wire-up.

- **Concern:** The Post tab visibly exists in P1 but its content (the
  community board) is P2's deliverable. Without locked copy, a
  TestFlight reviewer between P1 and P2 sees an empty tab.
  **Decision:** Soft placeholder. Screen renders a centered Post-on-AIRA
  branded card with the headline "Post on AIRA" + subtitle "Coming in
  the next update." Mirrors the marketing rebrand naming. NOT a
  generic "Coming soon" string. NOT hidden — the tab is visible from
  P1 onward so the layout never shifts on the user.

- **Concern:** The plan recommended `expo-image` as a potential P3 perf
  upgrade. Switching is a native config-plugin change requiring an EAS
  rebuild.
  **Decision:** Defer to P3. P1 uses `react-native`'s built-in `Image`
  with a `defaultSource` placeholder. No native rebuild needed for P1.
  Revisit in P3 if TestFlight QA surfaces image-load jank.

- **Concern:** `useInfiniteQuery` is established in TanStack Query but
  hasn't been used in `apps/mobile/` yet (only `useQuery` +
  `useMutation` are present today, per the `features/auth/hooks.ts`
  pattern).
  **Decision:** Adopt `useInfiniteQuery` in T4 for the listings feed.
  No new dep — it ships in the existing `@tanstack/react-query`. Same
  package import, just a different hook.

- **Concern:** The plan deviates from the V4 mockup's 3-tab lock by
  shipping 4 tabs (Home / Categories / Post / Account).
  **Decision:** Locked deviation. Explicit user decision during the
  planning consultation. Recorded as a learning so future agents
  don't try to re-enforce 3 tabs. Acknowledged in the plan's "Open
  questions" section AND in `.mstack/learnings.jsonl`.

### Suggestions (taken or deferred)

- **Suggestion:** Reuse `apps/mobile/components/ui/Card.tsx` as the base
  for the mobile `BusinessCard` instead of rebuilding the card chrome.
  **Taken** — `BusinessCard.tsx` composes `Card` as its outer
  container; only the card *contents* (name, category, social icons,
  rating pill, More Info pill) are hand-ported from web.

- **Suggestion:** Add empty-state + loading-skeleton acceptance
  criteria explicitly to each task (listings empty, search no-match,
  detail 404).
  **Taken** — added to the per-task Acceptance fields below.

- **Suggestion:** Lock empty-state copy now to avoid `/mlabs-code`
  asking.
  **Deferred** — defaults captured in the implementation plan:
  "No businesses in this category yet." (listings empty),
  "No matches for that search." (search no-match), "Business not
  found." (detail 404). `/mlabs-code` can ship these; the reviewer
  can push back if they read off-brand.

- **Suggestion:** Add an explicit `BusinessSchema` type assertion in
  the mobile API client so any wire-shape drift between web and mobile
  fails at compile time, not runtime.
  **Taken** — listings api.ts imports `BusinessSchema` from
  `@aira/validators` and types its return as
  `z.infer<typeof BusinessListOutputSchema>`. Same pattern as web's
  `apiServerFetch`.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- Mobile Home **structurally mirrors** web Home — logo + about + stat
  cards + featured. No mobile-specific extras on Home.
- API ops: `listBusinessesOp({ featured: true, limit: 6 })` (featured),
  `listBusinessesOp({ category: <slug>, q, page, pageSize, verified })`
  (category listings), `getBusinessByIdOp` (detail),
  `countActiveBusinessesOp` (stat card), `listCategoriesOp`
  (Categories tab), `getCategoryBySlugOp` (listings screen header).
- Notifications screen **orphaned** during P1; no UI entry point.
  Push-tap deep-link still resolves to `/notifications` route.
- Post tab placeholder copy: headline "Post on AIRA", subtitle "Coming
  in the next update." Soft placeholder card, no generic "Coming soon"
  string.
- `expo-image` adoption **deferred to P3**. P1 ships with RN built-in
  `<Image>` + `defaultSource` placeholder.
- `useInfiniteQuery` **adopted in T4** for listings infinite scroll.
- Mobile BusinessCard **composes the existing `Card.tsx` primitive**
  rather than rebuilding the card chrome.
- 4-tab layout (deviation from V4's 3-tab lock) is the **locked
  decision** for P1+ on mobile. Logged in `.mstack/learnings.jsonl`.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit). `/mlabs-code` runs autonomously
but pauses if a task lists a **Pause if** trigger that matches the
situation.

### Task 1: 4-tab refactor + delete Messages + rename Profile → Account

- **Files:**
  - `apps/mobile/app/(app)/_layout.tsx` (edit)
  - `apps/mobile/app/(app)/profile.tsx` (rename → `account.tsx`)
  - `apps/mobile/app/(app)/categories.tsx` (new — placeholder)
  - `apps/mobile/app/(app)/post.tsx` (new — soft placeholder)
  - `apps/mobile/app/(app)/messages/[id].tsx` (delete)
  - `apps/mobile/app/(app)/messages/index.tsx` (delete)
  - `apps/mobile/app/(app)/messages/_layout.tsx` (delete)
  - `apps/mobile/features/messages/` (delete the directory)
- **What:** Restructure the bottom-tab layout from the current 4
  tabs (Home / Messages / Notifications / Profile) to the new 4 tabs
  (Home / Categories / Post / Account). Order: Home (existing
  placeholder kept for now — T2 fills it in), Categories (new placeholder
  screen with a centered "Categories" header), Post (new placeholder
  card: "Post on AIRA" headline + "Coming in the next update."
  subtitle), Account (renamed from `profile.tsx`, content preserved
  byte-for-byte). Delete the entire `messages/` route directory and the
  `features/messages/` directory. Remove `useConversations` import and
  the unread-conversations Badge logic from `_layout.tsx`. Preserve the
  `useMe` auth-gate, the `NotificationsPrePrompt` modal, and the
  `useUnreadCount` query (still needed for the bell badge in P2). The
  `notifications.tsx` screen stays mounted as a stack route even
  though no tab points to it.
- **Acceptance:**
  - `apps/mobile/app/(app)/_layout.tsx` exports a `Tabs` element with
    exactly 4 `Tabs.Screen` children, in this order: `index`
    (Home), `categories`, `post`, `account`.
  - `git grep -lE "(messages|Messages)" apps/mobile/` returns
    nothing (or only matches inside comments / unrelated strings —
    no imports, no routes).
  - `apps/mobile/app/(app)/profile.tsx` no longer exists; the
    equivalent screen is at `apps/mobile/app/(app)/account.tsx`
    with the same sign-out flow and greeting.
  - `apps/mobile/features/messages/` no longer exists.
  - Tapping the `Categories` tab on Expo Go shows the placeholder
    screen without errors.
  - Tapping the `Post` tab shows the soft-placeholder card with the
    exact copy "Post on AIRA" + "Coming in the next update."
  - Tapping the `Account` tab shows the greeting + sign-out button
    (functionally identical to today's Profile tab).
  - Cold launch when signed-out still redirects to `/(auth)/welcome`
    (the `useMe` guard logic is preserved).
  - First-post-login render still triggers `NotificationsPrePrompt`
    (the F21 push pre-prompt gate is preserved).
  - `pnpm --filter @aira/mobile typecheck` clean.
- **Pause if:**
  - `pnpm typecheck` surfaces a reference to `features/messages/`
    from a file outside `apps/mobile/app/(app)/messages/` or
    `apps/mobile/features/messages/` itself — could indicate a
    cross-feature leak that needs human review.
  - `expo-router`'s typed-routes feature
    (`experiments.typedRoutes: true` in `app.config.ts`) complains
    about removed routes — may need a Metro cache clear.

### Task 2: Mobile Home — brand-led mirror of web Home

- **Files:**
  - `apps/mobile/features/listings/api.ts` (new — featured + count fetches)
  - `apps/mobile/features/listings/hooks.ts` (new — `useFeatured`, `useBusinessCount`)
  - `apps/mobile/features/listings/components/BusinessCard.tsx` (new)
  - `apps/mobile/features/listings/components/RatingPill.tsx` (new)
  - `apps/mobile/features/listings/components/SocialIcons.tsx` (new — phone, WhatsApp, website, instagram/facebook; compact 4-icon cap mirroring web's recent ship)
  - `apps/mobile/features/listings/components/StatCard.tsx` (new)
  - `apps/mobile/features/listings/components/FavoriteHeart.tsx` (new — visual-only stub for P1; P2 wires action + state)
  - `apps/mobile/app/(app)/index.tsx` (edit — replace placeholder Welcome with brand-led layout)
- **What:** Build the mobile Home screen as a structural mirror of
  `apps/web/src/app/(app)/home/page.tsx`. Layout from top: AIRA
  tree-of-life logo (140×140 centred, reuse the asset at
  `apps/mobile/assets/logo.png`) → AIRA wordmark with a gold
  vertical-gradient applied via NativeWind tokens (or a simple
  `text-primary` if gradient text proves painful on RN — flag in
  Pause if) → tagline caption ("ROOTS · REACH") → about title and
  body from `brand.homepage.aboutTitle` / `aboutBody` → 2 stat cards
  side-by-side: Businesses Listed (live count from
  `countActiveBusinessesOp`, rendered as "N+") + Community Members
  (`brand.homepage.communityMembers`, em-dash if unset) → Featured
  Businesses list (call `listBusinessesOp({ featured: true, limit: 6 })`,
  render as a stack of mobile-flavored `BusinessCard`s, hide the
  whole section when empty). The `FavoriteHeart` is a visual-only
  stub in P1 (renders the outline-heart glyph but does nothing
  on tap); P2 wires it through. The mobile `BusinessCard` composes
  the existing `components/ui/Card.tsx` primitive as its outer
  container — only the inner contents (name, category, social
  icons, rating pill, More Info pill, favorite heart) are hand-ported
  from web. Pull-to-refresh via FlatList `refreshControl` is set up
  on the Featured Businesses list. The data fetches use TanStack
  Query — `useFeatured` and `useBusinessCount` hooks live in
  `features/listings/hooks.ts` and call the typed fetch client.
- **Acceptance:**
  - Mobile Home renders the AIRA logo, wordmark, tagline, about
    title, about body, both stat cards, and the Featured Businesses
    section (when the API returns ≥1 result).
  - "Businesses Listed" shows the live count from
    `countActiveBusinessesOp`, formatted as "N+" when N > 0 and as
    "—" when N = 0.
  - "Community Members" shows `brand.homepage.communityMembers`
    (currently "—").
  - Featured Businesses section calls
    `listBusinessesOp({ featured: true, limit: 6 })` and renders up
    to 6 cards. Empty state: section hidden entirely (matches web).
  - The mobile `BusinessCard` shows name, category label, AIRA Stars
    rating row (when rating > 0), compact 4-icon social row (Phone /
    WhatsApp / Website / Instagram-or-Facebook, no map pin), and a
    visual-only outline heart in the top-right.
  - Pull-to-refresh on Home re-fetches both featured + count.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
  - Verified on Expo Go via the ws-tunnel against the live API
    (`EXPO_PUBLIC_API_BASE_URL=https://airabynisarga.com`): Home
    renders at least one real business card, count is a real number.
- **Pause if:**
  - Wordmark gradient (`bg-clip-text` analogue on RN) is non-trivial
    or requires a new dep — fall back to `text-primary` and surface
    for review. Don't add a gradient lib without buy-in.
  - The web `BusinessCard` references a util that doesn't have a RN
    analogue (e.g., a `cn()` helper, `next/image`, `next/link`) and
    the port requires more than a one-line swap — surface for review.

### Task 3: Categories tab

- **Files:**
  - `apps/mobile/features/listings/api.ts` (edit — add `listCategories` fetch)
  - `apps/mobile/features/listings/hooks.ts` (edit — add `useCategories`)
  - `apps/mobile/features/listings/components/CategoryTile.tsx` (new)
  - `apps/mobile/features/listings/components/EmptyState.tsx` (new — shared empty state primitive)
  - `apps/mobile/app/(app)/categories.tsx` (edit — replace placeholder with real grid)
- **What:** Build the Categories tab as a vertical list (or 2-column
  grid on tablet, fine to ship 1-column always for P1) of active root
  categories from `listCategoriesOp`. Each `CategoryTile` renders the
  category's icon + name and routes to `/listings/<slug>` on tap via
  `router.push`. Use TanStack Query's `useQuery` (not infinite — the
  category list is short and bounded). Show a `Skeleton`-based
  loading state during the initial fetch. Empty state: "No
  categories available yet." (shouldn't happen in prod but harmless).
  Pull-to-refresh via FlatList `refreshControl`.
- **Acceptance:**
  - Categories tab fetches `listCategoriesOp` on mount.
  - Each active root category renders as a tappable tile with its
    icon + name (icon resolution: a category-meta map, mirroring web's
    `getCategoryMeta`).
  - Tapping a tile routes to `/listings/<slug>` via `router.push`.
  - Skeleton renders during initial loading.
  - Empty state renders when `listCategoriesOp` returns zero items.
  - Pull-to-refresh re-fetches the category list.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
- **Pause if:**
  - Web's `getCategoryMeta` resolver does icon mapping by slug
    string — porting requires a static-import map that has to match
    the live DB slugs. If a mismatch is suspected, surface for
    review (the category-drift fix from 2026-06-16 is the relevant
    precedent).

### Task 4: Listings stack screen

- **Files:**
  - `apps/mobile/features/listings/api.ts` (edit — add listings fetch with `q`, `page`, `pageSize`, `verified`, `category` inputs)
  - `apps/mobile/features/listings/hooks.ts` (edit — add `useListings` with `useInfiniteQuery`)
  - `apps/mobile/features/listings/components/SearchBar.tsx` (new — debounced TextInput)
  - `apps/mobile/features/listings/components/VerifiedFilterChip.tsx` (new — pill toggle)
  - `apps/mobile/app/(app)/listings/[category].tsx` (new — stack screen)
- **What:** Build the listings stack screen at `(app)/listings/[category].tsx`.
  Reads the `category` slug from the route param. Header shows the
  category name (fetched via `getCategoryBySlugOp` once, cached) and a
  back button (provided by `expo-router` Stack default). Below the
  header: a `SearchBar` (300ms debounced TextInput) and a
  `VerifiedFilterChip` (pill that toggles the `verified` filter).
  Below the controls: a `FlatList` rendering `BusinessCard`s, with
  TanStack Query's `useInfiniteQuery` driving pagination via
  `pageSize: 12` + `onEndReached` triggering `fetchNextPage`. Empty
  states: "No businesses in this category yet." (zero results, no
  search), "No matches for that search." (zero results, with search).
  Loading state: skeleton list during initial fetch.
  Pull-to-refresh via FlatList `refreshControl`.
- **Acceptance:**
  - `/listings/<slug>` route resolves and renders the page.
  - Header shows the category name from `getCategoryBySlugOp`.
  - 404 redirect or "Category not found" empty state when slug
    doesn't resolve.
  - Listings render as `BusinessCard`s in a vertical list.
  - Search input is debounced (300ms) and re-fetches the listings on
    change.
  - Verified filter chip toggles between filtered and unfiltered
    results.
  - Infinite scroll: scrolling to the end fetches the next page;
    `isFetchingNextPage` is checked to prevent double-fires.
  - Pull-to-refresh re-fetches from page 1.
  - Empty + search-empty + loading states all render with the
    decided copy.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
  - Verified on Expo Go: navigating from Categories tab to a real
    category renders real businesses; scrolling to bottom loads page
    2 (when there are >12 items in the category).
- **Pause if:**
  - The `useInfiniteQuery` pagination contract requires fields
    (`getNextPageParam`, `pageSize`, etc.) that don't map cleanly to
    the `listBusinessesOp` output shape — surface the mismatch for
    review.

### Task 5: Business detail stack screen

- **Files:**
  - `apps/mobile/features/listings/api.ts` (edit — add `getBusinessByIdOp` fetch)
  - `apps/mobile/features/listings/hooks.ts` (edit — add `useBusinessDetail`)
  - `apps/mobile/features/listings/components/BusinessHero.tsx` (new)
  - `apps/mobile/features/listings/components/AboutCard.tsx` (new)
  - `apps/mobile/features/listings/components/ContactCard.tsx` (new)
  - `apps/mobile/features/listings/components/AiraReviewCard.tsx` (new)
  - `apps/mobile/features/listings/components/Gallery.tsx` (new — horizontal scroll for ≤3 images)
  - `apps/mobile/app/(app)/listings/[category]/[id].tsx` (new — stack screen)
- **What:** Build the business detail stack screen at
  `(app)/listings/[category]/[id].tsx`. Reads the business `id` from
  the route param. Fetches via `getBusinessByIdOp` using
  TanStack Query (`useQuery`, not infinite). Renders a scrollable
  ScrollView with: `BusinessHero` (image, name, verified badge,
  category, rating) → `AboutCard` (about text or hidden when empty) →
  `ContactCard` (phone + WhatsApp + website + address rows, all
  tappable to dial/message/open) → `AiraReviewCard` (review text or
  hidden) → `Gallery` (horizontal scroll of up to 3 images, hidden
  when empty). Back button via `expo-router` Stack default. Loading
  skeleton during fetch. Empty state: "Business not found." when the
  op returns null (404). Favorite heart in the header is the same
  visual-only stub as the BusinessCard's — P2 will wire it.
- **Acceptance:**
  - `/listings/<slug>/<id>` route resolves and renders the page.
  - Hero shows the image_url (or fallback), business name, verified
    badge (when verified), category name, rating (when > 0).
  - About card hidden when description is empty; rendered otherwise.
  - Contact card rows: phone (tap → dial), WhatsApp (tap → wa.me),
    website (tap → external browser), address (tap → maps app).
    Each row hidden when its field is null.
  - AIRA Review card hidden when `aira_review` is empty; rendered
    otherwise.
  - Gallery hidden when no images; rendered as horizontal-scroll
    list otherwise.
  - Loading skeleton during initial fetch.
  - 404 / not-found shows the empty-state message.
  - Back navigation returns to the listings stack screen.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
  - Verified on Expo Go: tapping a business card from the listings
    stack opens the detail screen with real content; back button
    returns to the listings list at the same scroll position.
- **Pause if:**
  - The web `business-detail.tsx` component composes a complex card
    pattern (e.g., `<BusinessDetailHero>` references a util that's
    deeply web-specific) and the port requires reaching outside
    `features/listings/` — surface for review.
  - `getBusinessByIdOp`'s output shape includes fields that need
    deserialization (e.g., dates) and the mobile renderer mishandles
    them — surface for review.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- **Wordmark gradient on RN.** Web uses
  `bg-[linear-gradient(180deg,oklch(0.42_0.09_80)_0%,oklch(0.66_0.10_80)_100%)] bg-clip-text text-transparent`
  to render the "AIRA" wordmark in a vertical gold gradient. NativeWind
  doesn't support `bg-clip-text` directly. Two paths:
  1. Use `text-primary` (solid olive green) as a degraded fallback —
     visually different from web but no new dep.
  2. Use `react-native-linear-gradient` masked by the text glyph —
     adds a dep + needs config-plugin entry in `app.config.ts`,
     which is a native rebuild.
  Recommendation: option 1 for P1, revisit in P3 polish if the
  reviewer pushes back. `/mlabs-code` should pause if it discovers a
  third path that requires unusual scaffolding.

- **Mobile `getCategoryMeta` icon map.** Web has a static map at
  `apps/web/src/features/listings/category-meta.ts` keyed by category
  slug. Mobile needs the same map (or imports it from a shared
  package if there's room). Most natural location:
  `apps/mobile/features/listings/category-meta.ts` as a copy.
  `/mlabs-code` should pause if it discovers the web map is
  cross-imported into web routes in a way that would break the copy
  (e.g., uses `lucide-react` which won't work on mobile — switch to
  `lucide-react-native` for the mobile copy).

- **Stack header back-button behavior on iOS vs Android.**
  `expo-router`'s `Stack` provides a default back button in the
  header. iOS uses chevron + back-text, Android uses arrow. Both
  acceptable for P1; verify on Expo Go.

- **`listBusinessesOp` permission gate.** The op has
  `permission: "user"` (line 47 of
  `apps/web/src/server/operations/businesses.ts`). Mobile always
  calls within an authed session (the `(app)/_layout.tsx` guard), so
  this should work. If `/mlabs-code` encounters a 401 in dev,
  verify the session-token shipping behavior in
  `apps/mobile/lib/api/client.ts` (it reads from SecureStore).

- **Marketing-page screenshot drift after P1 ships.** Once real mobile
  Home + Listings screens exist on Expo Go, the
  `phone-showcase.tsx` images on the marketing page will be
  technically wrong (they're web-at-mobile-viewport). Decide post-P1
  whether to:
  1. Swap to real Expo screenshots (requires a screen-recorder
     pipeline).
  2. Keep using web-at-mobile-viewport (cheaper to maintain;
     visually close enough since both render the same JSX-y card
     shape).
  Out of scope for P1; flagging for the post-P1 review.
