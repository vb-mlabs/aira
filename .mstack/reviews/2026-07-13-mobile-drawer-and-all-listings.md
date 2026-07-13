# Review: mobile drawer + all-listings default

**Date:** 2026-07-13
**Slug:** 2026-07-13-mobile-drawer-and-all-listings
**Plan reviewed:** [2026-07-13-mobile-drawer-and-all-listings.md](../plans/2026-07-13-mobile-drawer-and-all-listings.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** /mlabs-review (framer@millionlabs.co.uk)

---

## Summary

The plan is ready to implement with three substantive changes locked during the review pass: the hamburger's scope is narrowed to tab-root screens only (to avoid clobbering the Account stack's back chevron on sub-screens), the Admin drawer row is dropped entirely on mobile (bearer/cookie session split makes any web hop broken UX), and the polish bundle — tab icon swap, notification bell on Home, universal-link auto-open — is folded into this scope. One plan Open Question turned out already-answered by existing code (`SearchBar` at `features/listings/components/SearchBar.tsx` already debounces at 300ms).

**UI-Significant heuristic:** the plan touches five new files under `apps/mobile/components/nav/` and rewrites `apps/mobile/app/(app)/categories/index.tsx` — but the flag rule is web-scoped (`apps/web/src/app/**/page.tsx`, `apps/web/src/app/**/layout.tsx`, etc.), and nothing under `apps/web/*` moves. Flag = `no`. The mobile UI is significant in intent but the mockup gate (HTML-based) doesn't map to Expo/RN anyway; if a mockup pass is desired, invoke `/mlabs-mockup` manually.

## Findings

### Blockers (must fix before /mlabs-code)

None remaining — all raised concerns have decisions locked below.

### Concerns (raised, decided, recorded)

- **Concern:** Placing `headerLeft: HamburgerButton` at `apps/mobile/app/(app)/account/_layout.tsx`'s `screenOptions` level would clobber the back chevron on Account sub-screens (`/account/favorites`, `/account/profile`, `/account/listings`, `/account/notifications`, `/account/privacy-security`, etc.), regressing the navigation model Radha explicitly asked for during the 2026-07-06 UAT pass (see the `AccountLayout` doc comment). The Categories, Post, and Listings stacks are safe (they hide the chevron already) but the Account stack is not.
  **Decision:** Hamburger scope narrowed to the **four tab-root screens only**. Each root screen gets its own `<Stack.Screen options={{ headerLeft: () => <HamburgerButton /> }} />` (Home wires via `Tabs.Screen options`). Sub-screens keep their existing left slot — empty on categories/post/listings, back chevron on account. Cleanest iOS/Android convention (menu at root, back on drill-down).

- **Concern:** The plan's Admin row for admin/super_admin users has no working mobile target — mobile has no `/admin` route, and mobile's bearer-token session is not shared with web's cookie session. `Linking.openURL(brand.url + "/admin")` would drop the admin into a signed-out browser.
  **Decision:** Drop the Admin row from `AppDrawerContent` entirely on mobile. Admins reach `/admin` from desktop. Zero code path, zero session-sync surprise, one less test case.

- **Concern:** Plan Open Question #4 (search debounce) was already answered before the plan landed — `apps/mobile/features/listings/components/SearchBar.tsx` internally debounces the raw input on a 300ms quiet period, syncing to `onChange` only after the pause. The All-Listings screen reuses this component so it inherits the debounce for free.
  **Decision:** Struck from scope. No debounce work needed. The plan's "add 200ms debounce as part of this plan or defer?" question is moot.

- **Concern:** Chip idiom (plan Open Question #3) — implicit toggle-off is cleaner but less discoverable; users who don't know they can tap the active chip to deselect get stuck on a filter.
  **Decision:** Explicit "All" chip pinned at the front of the horizontal strip, active by default. Tapping a category chip flips it on and "All" off; tapping "All" clears. Matches the mental model in Airbnb / DoorDash / most consumer marketplaces.

### Suggestions (taken or deferred)

- **Taken — tab icon swap.** Rename the "Categories" tab to "Listings" (label) AND swap the icon glyph from `▦` (grid, reads as "categories") to a stacked-list glyph. Wired into Task 10. Concrete glyph choice noted in the task.
- **Taken — notification bell on Home headerRight.** Adds visual parity with web mobile top bar (hamburger left, wordmark center, bell right). Reuses existing `useUnreadCount()` (already called in `(app)/_layout.tsx` per the P1 plan for cache-warm) — this is the consumer that P1 promised but hadn't wired. Tap navigates to `/account/notifications` (existing screen). Wired into Task 4 (component) + Task 10 (integration).
- **Taken — universal-link → drawer peek.** When the app cold-starts via a Universal Link into `/listings/<slug>`, the drawer briefly opens (1s) so the user sees where they landed in the category tree, then auto-closes. Fires only on initial-URL resolution via `Linking.getInitialURL()` — not on every in-app navigation, to avoid annoyance. Wired into Task 11.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- **Hamburger scope:** four tab-root screens only, wired per-screen (not per-stack).
- **Admin row:** dropped from the drawer on mobile — component reads role but hides the row unconditionally on this platform.
- **Chip idiom:** explicit "All" chip pinned at the start of the strip.
- **NotificationBell (new):** mobile parity — component under `components/nav/`, uses existing `useUnreadCount()`, navigates to `/account/notifications` on tap. Rendered as `headerRight` on the Home `Tabs.Screen`.
- **Tab icon swap:** `▦` → `☰` (three-horizontal-lines glyph) for the renamed Listings tab. Small visual change, matches the "feed of listings" semantic. Same 22pt sizing as the other tabs.
- **Universal-link peek scope:** cold-start initial URL only (`Linking.getInitialURL()`), 1s auto-close, no in-app-navigation trigger. Skipped if the initial URL isn't under `/listings/*`.
- **SearchBar debounce:** covered by the existing SearchBar component (300ms). No new work.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is atomic (one commit). Later tasks depend on earlier ones only for the imports they reference; every task compiles standalone.

### Task 1: Copy paper-green texture into mobile assets

- **Files:** `apps/mobile/assets/textures/sidebar-green.webp` (new — binary copy from `apps/web/public/textures/sidebar-green.webp`)
- **What:** `cp apps/web/public/textures/sidebar-green.webp apps/mobile/assets/textures/sidebar-green.webp`. Metro bundles `.webp` assets natively via `require(...)`; no config change needed. This asset is what makes the drawer visually read as the same surface as the web sidebar.
- **Acceptance:** `apps/mobile/assets/textures/sidebar-green.webp` exists and is byte-identical to the web copy (`cmp` returns 0). `pnpm --filter @aira/mobile typecheck` clean (no impact).

### Task 2: DrawerProvider context

- **Files:** `apps/mobile/components/nav/DrawerProvider.tsx` (new)
- **What:** React context with `{ open: boolean; openDrawer(): void; closeDrawer(): void }`. Provider component holds a `useState` and exports a `useDrawer()` hook. Throws (or safely no-ops with a warn) if `useDrawer` is called outside the provider so misuse fails loud in dev.
- **Acceptance:** File compiles under strict TS; `useDrawer()` returns the typed shape; no runtime imports elsewhere yet.

### Task 3: HamburgerButton

- **Files:** `apps/mobile/components/nav/HamburgerButton.tsx` (new)
- **What:** 44×44 Pressable rendering `<MaterialCommunityIcons name="menu" size={22} color="#3D2814" />`. Calls `useDrawer().openDrawer()` on press. Accessibility: `accessibilityRole="button"`, `accessibilityLabel="Open menu"`. Follows the same tint (`#3D2814`) as the cream stack headers.
- **Acceptance:** Component compiles; tapping in a Storybook-less local render (mounted under a `DrawerProvider`) toggles `open` to `true`.

### Task 4: NotificationBell (mobile)

- **Files:** `apps/mobile/components/nav/NotificationBell.tsx` (new)
- **What:** 44×44 Pressable rendering `<MaterialCommunityIcons name="bell-outline" size={22} color="#3D2814" />` plus a red-dot badge (small circle) when `useUnreadCount().data > 0`. Tap navigates via `router.push("/account/notifications" as never)`. If count > 9, badge shows "9+" (existing web parity).
- **Acceptance:** Renders bell icon; badge appears when `useUnreadCount` returns > 0; tapping navigates to `/account/notifications`.

### Task 5: AppDrawerContent

- **Files:** `apps/mobile/components/nav/AppDrawerContent.tsx` (new)
- **What:** Mirrors `apps/web/src/app/(app)/_components/app-sidebar.tsx` one-to-one. `<ImageBackground source={require("../../assets/textures/sidebar-green.webp")} resizeMode="cover" style={{ flex: 1 }}>` wraps everything. Inside: header row (logo + wordmark from `brand.name` + `by ${brand.parentName}` caption + close ✕), scrollable body (Home row, "Post on AIRA" row, category tree via `useCategories()` with expandable sub-groups matching the web `CategoryGroup` behaviour except no hover — tap chevron toggles), and footer (Contact strip: `mailto:${brand.supportEmail}` icon button + Nisarga corporate site button via `Linking.openURL` + "Operated by ${brand.legalEntity}" line). **Admin row is intentionally not rendered** (decision above). Auto-close on nav: `usePathname()` in a ref-guarded effect calls `closeDrawer()` when the pathname changes.
- **Acceptance:** Component compiles; rendering under a `DrawerProvider` + `QueryClientProvider` shows the full row list; tapping any row closes the drawer and calls `router.push(...)`; tapping the ✕ closes without navigating.
- **Pause if:** the `useCategories()` shape has changed since planning and no longer returns `{ categories, counts, subsByRoot }` — surface a diff and ask before adjusting.

### Task 6: AppDrawer (Modal + Animated slide-in)

- **Files:** `apps/mobile/components/nav/AppDrawer.tsx` (new)
- **What:** Renders `<Modal transparent visible={open} animationType="none" onRequestClose={closeDrawer}>`. Inside: a translucent black backdrop `<Pressable className="absolute inset-0 bg-black/40" onPress={closeDrawer} />` and an `<Animated.View style={{ transform: [{ translateX }], width: '85%', maxWidth: 320 }}>` anchored to the left edge with `AppDrawerContent` inside. `translateX` animates from `-320` to `0` over 220ms via `Animated.timing` with `useNativeDriver: true` when `open` flips true; reverses when it flips false. Prevent tap-through on the drawer body with a wrapping `<Pressable onPress={() => {}}>` (no-op).
- **Acceptance:** With `DrawerProvider` state toggled true, drawer slides in from left over ~220ms; backdrop tap closes it; Android hardware back closes it (via `onRequestClose`); tapping drawer body does not close.

### Task 7: Mount DrawerProvider + AppDrawer in root layout

- **Files:** `apps/mobile/app/_layout.tsx` (edit)
- **What:** Wrap the existing provider chain (`SafeAreaProvider > QueryClientProvider > ActionSheetProvider > ToastProvider`) with an additional `<DrawerProvider>` (innermost so it can `useMe()` / `useCategories()` from consumer components). Add `<AppDrawer />` as a sibling of the outer `<Stack>` so it sits above every route.
- **Acceptance:** Drawer components compile; app boots normally; drawer is unreachable yet (no hamburger wired yet — expected until Task 10 / 11).

### Task 8: Extend useListings to accept undefined category

- **Files:** `apps/mobile/features/listings/hooks.ts` (edit)
- **What:** Remove `enabled: !!params.category` from `useListings`. Add a one-line comment above `queryKey` noting that `undefined` category = all-categories query (the server's `/api/v1/businesses` treats an omitted `category` param as "all"). The only current caller (`apps/mobile/app/(app)/listings/[category].tsx`) always has a slug from the route param, so removing the gate is a pure superset — no existing screen changes behavior.
- **Acceptance:** `pnpm --filter @aira/mobile typecheck` clean; grep confirms no other caller relied on the disabled state.

### Task 9: Rewrite the tab into All-Listings screen

- **Files:** `apps/mobile/app/(app)/categories/index.tsx` (rewrite in place — same file, different contents)
- **What:** Replace the current category-accordion component with an All-Listings screen. Structure:
  1. `<Stack.Screen options={{ title: "Listings", headerLeft: () => <HamburgerButton /> }} />`
  2. Local state: `selectedCategory: string | null` (null = All) and `q: string`.
  3. Sticky header block: `<SearchBar value={q} onChange={setQ} />` on top, and below it a `<ScrollView horizontal showsHorizontalScrollIndicator={false}>` chip strip. First chip is "All" (active when `selectedCategory === null`); remaining chips are the root categories from `useCategories()`. Each chip is a Pressable with active-state pill styling (olive background when active, muted otherwise).
  4. Body: `useListings({ category: selectedCategory ?? undefined, q })`. Flatten `data.pages`, `bucketBySlot(items)`, then `<SlotSection label="Sponsored" ... />` + `<SlotSection label="Regular" ... />` — reused from the [category] screen. Reuses `SPONSORED_TEXTURE` / `REGULAR_TEXTURE` requires (import from where [category] does).
  5. Pull-to-refresh (`RefreshControl`) + near-bottom `fetchNextPage()` — mirror `[category].tsx`.
  6. Empty state: reuse `EmptyState` component; different copy for "no results in this filter" vs "no listings at all."
- **Acceptance:** Tab lands on the new screen; category chip filter works; sponsored/regular sections render; pagination works; typecheck clean; the old accordion / RootAccordionRow component code is gone.
- **Pause if:** an unexpected 4xx from `/api/v1/businesses` when `category` is omitted indicates the server needs an update — this plan asserts no back-end change; surface and confirm before touching the server.

### Task 10: Wire Home hamburger + bell + rename tab + swap icon

- **Files:** `apps/mobile/app/(app)/_layout.tsx` (edit)
- **What:**
  - Home `Tabs.Screen name="index"`: add `options.headerLeft: () => <HamburgerButton />` and `options.headerRight: () => <NotificationBell />` (both with proper left/right padding via `contentContainerStyle` or a spacer wrapper).
  - Categories `Tabs.Screen name="categories"`: change `title: "Categories"` → `title: "Listings"`; swap icon from `<TabIcon glyph="▦" />` to `<TabIcon glyph="☰" />` (three-horizontal-lines).
  - No other tab changes.
- **Acceptance:** Home shows hamburger left + bell right; tabs bar reads "Home / Listings / Post / Account"; Listings icon renders as three horizontal lines.

### Task 11: Wire hamburger into Post + Account root screens

- **Files:** `apps/mobile/app/(app)/post/index.tsx` (edit) · `apps/mobile/app/(app)/account/index.tsx` (edit)
- **What:** For each of Post and Account root screens, extend the existing `<Stack.Screen options={{...}} />` to add `headerLeft: () => <HamburgerButton />`. Do NOT edit the corresponding `_layout.tsx` files — the hamburger is per-screen (root only), not stack-wide. Account root already sets `headerBackVisible: false` at its screen level, which stays; the new `headerLeft` renders in the now-vacated left slot. Post root's `Stack.Screen` gets the same treatment.
- **Acceptance:** Tapping Post or Account bottom tab shows the hamburger on the top-left; drilling into `/account/favorites` (or any sub-screen) still shows the back chevron, NOT the hamburger — sub-screen behaviour unchanged.
- **Pause if:** the post/index.tsx or account/index.tsx doesn't currently render a `<Stack.Screen options={{...}} />` element — the fix is to add one, but flag if it's structurally different than expected.

### Task 12: Universal-link → drawer peek on cold-start

- **Files:** `apps/mobile/components/nav/DrawerProvider.tsx` (edit — add cold-start effect) OR `apps/mobile/app/_layout.tsx` (edit — add effect where AppDrawer mounts)
- **What:** In whichever component holds the drawer state at root, add a `React.useEffect` that runs once on mount, calls `await Linking.getInitialURL()`, and if the URL resolves to `/listings/<slug>` (either as a path or a Universal Link matching `brand.url + "/listings/..."`), calls `openDrawer()` immediately, then `setTimeout(closeDrawer, 1000)`. Guard with a "cold-start-only" ref so the effect doesn't fire on subsequent in-app deep-links (there's no such API — one-shot effect on mount is enough).
- **Acceptance:** Manual QA — kill the app, tap a `airabynisarga.com/listings/coffee-shops` link, watch the drawer briefly appear (~1s) then auto-close. In-app navigation to `/listings/*` does not trigger the peek.
- **Pause if:** `Linking.getInitialURL()` returns `null` on Expo Go dev (this is common — Universal Link resolution needs a real build). If so, note the limitation and mark this task as "requires EAS build for end-to-end verification"; the code should still ship since it's a no-op when initial URL is null.

## Open questions

None. All plan Open Questions were resolved during the review.
