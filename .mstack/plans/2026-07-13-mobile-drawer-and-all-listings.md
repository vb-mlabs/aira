# Plan: mobile drawer + all-listings default

**Date:** 2026-07-13
**Slug:** 2026-07-13-mobile-drawer-and-all-listings
**Status:** reviewed
**Author:** /mlabs-plan (framer@millionlabs.co.uk)

---

## Problem

Mobile users navigate the app through a 4-tab bottom bar. Category browsing (root → sub → listings) requires a Categories tab that shows category tiles, then a separate Listings screen. That doesn't match the web app, where every authed screen has a **hamburger → slide-in drawer** with the full category tree, and the mobile landing surface is an actual listing view rather than a category tile grid.

The gap costs users on two axes:

1. **Wayfinding** — new users on mobile don't have a persistent way to see "everything the app contains." The bottom bar is intentionally sparse (Home / Categories / Post / Account); everything else is buried under Account, or reachable only through the Categories tab and a second tap.
2. **Time-to-value** — the first tap after Home lands on a category chooser, not on businesses. Web users hit a categorised business feed within one click of the sidebar; mobile users take two.

Success = the mobile shell reads as a smaller cousin of the web shell:

- A hamburger icon on the top-left of every tab's header opens a left-anchored drawer with the same paper-green texture, wordmark header, category tree, Post row, Admin row (if applicable), and Contact footer.
- What used to be the Categories tab now shows an **All Listings** view — Sponsored/Regular sections identical to `/listings/[category]`, plus a category chip strip that filters in-place. The drawer is the deep-nav surface for sub-category drill-downs.

## Scope

**In:**

- New `AppDrawer` overlay (React Native `Modal` + `Animated` slide-in from left, no new deps).
- New `AppDrawerContent` mirroring web `apps/web/src/app/(app)/_components/app-sidebar.tsx` — logo header, Home row, Post-on-AIRA row, category tree with expandable sub-groups, conditional Admin row, Contact footer.
- Copy `apps/web/public/textures/sidebar-green.webp` → `apps/mobile/assets/textures/sidebar-green.webp` and use it as the drawer background via `<ImageBackground>`.
- New `DrawerProvider` context (mounted in `apps/mobile/app/_layout.tsx`) and `HamburgerButton` component, wired into each tab's `headerLeft` — Home via `Tabs.Screen` options, Categories / Post / Account / Listings via each Stack's `screenOptions.headerLeft` (respecting the locked constraint: no app-level header collapse).
- Repurpose `apps/mobile/app/(app)/categories/index.tsx` into an all-listings default view: `SearchBar` + horizontal root-category chip strip + Sponsored/Regular sections (`SlotSection` reuse from the existing `[category].tsx` implementation).
- Rename the tab label from "Categories" to "Listings" (filesystem route stays `/categories/*` to avoid breaking universal-link / deep-link resolution).
- Extend `apps/mobile/features/listings/hooks.ts::useListings` so that passing `category: undefined` fetches all listings (drop the `enabled: !!params.category` gate — the only current caller always has a slug from the route param, so removing the gate is a pure superset).

**Out (deferred):**

- Multi-facet filtering on All Listings (verified toggle, city, price, etc). Keep the surface to search + single category chip for now.
- Drawer gestures — no swipe-to-open from the screen edge, no swipe-to-close on the drawer body. Tap hamburger to open, tap backdrop / X / Android back to close. Reanimated gestures land in a follow-up if the UX asks for it.
- Sidebar hover / auto-open sub-groups (web has this because of desktop pointers — irrelevant on mobile).
- Tab icon change on the renamed tab (see Open Questions).
- Any change to `/listings/*` sub-category screens — the drill-down page stays as-is.
- No back-end changes. `/api/v1/businesses` already accepts an omitted `category` param and returns paginated all-listings.

## Approach

**Chosen path — Modal-based drawer, per-Stack `headerLeft`, filesystem-stable repurpose of the Categories tab.**

1. **Drawer overlay.** A single `AppDrawer` component is mounted once at the root layout, above the `Tabs`. It reads open state from `DrawerContext`. When open, it renders a full-screen `Modal` with `transparent` + `animationType="none"`; inside, a translucent backdrop `Pressable` calls `closeDrawer` on tap, and a `<Animated.View>` slides from `translateX: -320` to `0` over 220ms (`Animated.timing`, `useNativeDriver: true`). No Reanimated dependency required — built-in `Animated` handles a single-axis translation cleanly.

2. **`AppDrawerContent` mirrors `apps/web/src/app/(app)/_components/app-sidebar.tsx` one-for-one:** logo (`apps/mobile/assets/logo.png`) + wordmark + "by Nisarga" caption; close ✕ button; Home row; Post on AIRA row; category tree via `useCategories()` (already exposes `categories`, `subsByRoot`, `counts`); Admin row conditional on `useMe().data?.role in {admin, super_admin}` — links to a fresh browser tab via `Linking.openURL(brand.url + "/admin")` since mobile has no /admin route (see Open Questions); Contact footer with `mailto:` support link + Nisarga corporate site link + "Operated by" line. Background layer is `<ImageBackground source={require('.../sidebar-green.webp')} resizeMode="cover">` — a single-cover texture is fine since the drawer is 320px wide and the source webp is generously sized (verify during implementation).

3. **`HamburgerButton`** is a small Pressable rendering `MaterialCommunityIcons name="menu"` at 22pt, tinted `#3D2814` (the existing cream-header foreground). It calls `useDrawer().openDrawer()`. It's wired into:
   - `apps/mobile/app/(app)/_layout.tsx` — the Home `Tabs.Screen` gets `options.headerLeft: () => <HamburgerButton />` (Home is the one screen that uses the Tabs-level shared header).
   - `apps/mobile/app/(app)/categories/_layout.tsx`, `.../post/_layout.tsx`, `.../account/_layout.tsx`, `.../listings/_layout.tsx` — each Stack's `screenOptions.headerLeft` gets the same button. Per-tab Stack headers stay owned by their Stacks; the hamburger is a small visual addition inside them.

4. **All-Listings screen.** The Categories tab's `index.tsx` is rewritten. New layout: `<Stack.Screen options={{ title: "Listings", headerLeft: HamburgerButton }} />`, then a `View` with a `SearchBar` (existing component from `features/listings/components/SearchBar`) and a horizontal chip `ScrollView` of root categories (fetched via `useCategories()`), followed by a scroll body that renders `<SlotSection label="Sponsored" ... />` and `<SlotSection label="Regular" ... />` from `bucketBySlot(items)` — identical grouping to the existing `/listings/[category]` level-2 branch. Local state: `selectedCategory: string | null` (null = show all) and `q: string`. The list query is `useListings({ category: selectedCategory ?? undefined, q })`. Tapping a chip flips `selectedCategory`; tapping "All" nulls it. Sub-category drill-down still lives in the drawer (via the category tree) and on `/listings/[category]`.

5. **`useListings` refactor.** Drop `enabled: !!params.category` and always fire. Add a comment explaining that `undefined` category = all-categories query. The tab label swaps from "Categories" (`▦`) to "Listings"; the icon stays for this pass (see Open Questions).

**Alternatives considered:**

- **`@react-navigation/drawer`** — expo-router integrates natively, gives real gesture support, and matches the "cousin of web" mental model without hand-rolled animation. **Rejected because** it forces the drawer to sit at the navigator level, which either collapses the per-tab Stack headers (violates the locked constraint) or requires a nested navigator dance that breaks tab-header ownership. It's also ~40kB of transitive deps for a drawer we can do in ~120 LOC of RN primitives. Revisit if we ever want swipe gestures / native drawer semantics — until then, custom Modal + Animated is the boring pick.
- **Route the "All Listings" screen at a fresh `/(app)/browse/` path** instead of repurposing `/(app)/categories/`. **Rejected because** it's cosmetic churn — moving the tab's filesystem location doesn't buy anything the user or the URL bar can see (native app has no URL bar; deep links point at `/listings/<slug>` which is unaffected). Keeping the folder name minimises diff surface and keeps `git log` on the tab focused.
- **New `useAllListings()` hook** rather than extending `useListings`. **Rejected because** it duplicates the query shape (same server endpoint, same page-param math, same sponsored/regular bucketing on the caller side) with no meaningful separation of concerns. Extending the existing hook to accept an undefined `category` is one deleted line (the `enabled` gate) plus a comment.

## Data model changes

None. The `/api/v1/businesses` endpoint already treats `category` as an optional query param; omitting it returns paginated all-listings across the whole city. No new tables, no migrations, no server-side work.

## Files to touch

**New:**

- `apps/mobile/components/nav/DrawerProvider.tsx` — React context + provider exposing `{ open, openDrawer, closeDrawer }`.
- `apps/mobile/components/nav/HamburgerButton.tsx` — 44×44 Pressable, `MaterialCommunityIcons name="menu"`, calls `useDrawer().openDrawer()`.
- `apps/mobile/components/nav/AppDrawer.tsx` — Modal + `Animated.View` slide-in; hosts `AppDrawerContent`.
- `apps/mobile/components/nav/AppDrawerContent.tsx` — the drawer body; mirrors `apps/web/src/app/(app)/_components/app-sidebar.tsx` one-for-one.
- `apps/mobile/assets/textures/sidebar-green.webp` — copied verbatim from `apps/web/public/textures/sidebar-green.webp`.

**Edit:**

- `apps/mobile/app/_layout.tsx` — wrap the render tree in `<DrawerProvider>`, and mount `<AppDrawer />` as a sibling of the outer `<Stack>` so it overlays every route.
- `apps/mobile/app/(app)/_layout.tsx` — add `headerLeft: () => <HamburgerButton />` to the Home `Tabs.Screen` options; rename the "categories" tab label from "Categories" to "Listings".
- `apps/mobile/app/(app)/categories/_layout.tsx` — add `headerLeft: () => <HamburgerButton />` to `screenOptions`.
- `apps/mobile/app/(app)/listings/_layout.tsx` — same.
- `apps/mobile/app/(app)/post/_layout.tsx` — same.
- `apps/mobile/app/(app)/account/_layout.tsx` — same.
- `apps/mobile/app/(app)/categories/index.tsx` — full rewrite from category-accordion to all-listings view (SearchBar + chip strip + SlotSection sponsored/regular). Keep filename to avoid a route rename.
- `apps/mobile/features/listings/hooks.ts` — remove `enabled: !!params.category` from `useListings`; add a one-line comment noting that `undefined` = all-categories.

## Edge cases

- **Route change while drawer open** — mirror web `MobileSidebar`'s pattern: an effect subscribed to `router` / current pathname closes the drawer when it changes. In expo-router, `useSegments()` returns the current route segments; a ref-guarded effect (`if (lastSegments === current) return`) prevents redundant setState per render.
- **Android hardware back** — RN `Modal`'s `onRequestClose` fires on Android back. Wire it to `closeDrawer`. iOS swipe-to-dismiss isn't relevant here because we use a Modal (not a Stack) and the drawer isn't a full-screen sheet.
- **Nested Modals** — if a Dialog (e.g. sign-out confirm from `/account`) is open when the drawer opens, RN allows nested Modals but z-order is platform-dependent. The drawer should NOT open over an active Dialog — best-effort: if a Dialog is open, opening the drawer is a no-op (the hamburger is inside the header, and the Dialog's backdrop is above it, so this should self-resolve without extra guard code).
- **Deep link into `/listings/<slug>` from a notification** — drawer should stay closed. Since the drawer state defaults to `open: false` and no code path auto-opens it on route arrival, this is free.
- **Fresh install / offline** — categories haven't loaded yet. Drawer tree renders a skeleton; chip strip shows only the "All" chip. Both should degrade gracefully — reuse the existing `useCategories().isLoading` branches.
- **Category chip strip overflow** — 20+ chips likely won't fit horizontally. Wrap in a `ScrollView horizontal showsHorizontalScrollIndicator={false}` and let it scroll. Snap-to-item optional.
- **All-Listings pagination cost** — the biggest single query the app makes. Reuse the existing `useInfiniteQuery` pagination in `useListings` (page size 12); load-more-on-scroll already works via the [category].tsx pattern. The initial page is only 12 items, so first-paint cost is unchanged.
- **Chip active state during search** — search + selected chip stack (both narrow results). Selecting a chip does NOT clear the search input, but it does trigger a refetch. Empty state shows both filters so the user knows why.
- **Admin row target on mobile** — mobile app has no `/admin` route (admin is web-only per project structure). See Open Questions.
- **Texture asset filesize** — `sidebar-green.webp` on web is ~50-100kB. Bundling into mobile inflates the JS bundle slightly. Acceptable for a single texture.
- **`<ImageBackground>` tile-vs-cover** — web tiles the texture via CSS `background-image: url()`. RN can `resizeMode="repeat"` but the source needs to be a small tileable pattern. If `sidebar-green.webp` is a large gradient texture, `resizeMode="cover"` is closer to web's visual result. Verify with a screenshot during implementation and fall back to `repeat` if seams show.

## Acceptance criteria

- [ ] Hamburger icon renders on the top-left of every authed screen's header — Home / Listings / Post / Account root, plus every Listings sub-screen and every Account sub-screen.
- [ ] Tapping the hamburger opens a left-anchored drawer (85vw wide, max 320pt); a translucent backdrop appears behind it.
- [ ] The drawer's background is the paper-green texture (`sidebar-green.webp`); the visual reads as the same surface as the web `AppSidebar`.
- [ ] Drawer contents match the web sidebar row list: logo header with wordmark + close ✕, Home row, Post on AIRA row, root categories with expandable sub-groups (chevron), Admin row visible only when `useMe().data.role === 'admin' | 'super_admin'`, Contact footer with mailto + Nisarga link + "Operated by" line.
- [ ] Tapping any drawer nav row closes the drawer AND navigates to the corresponding route.
- [ ] Tapping the backdrop, tapping the close ✕, or pressing Android hardware back closes the drawer without navigating.
- [ ] The bottom-tab label previously "Categories" now reads "Listings"; tapping it lands on the new all-listings screen.
- [ ] All-Listings screen renders: SearchBar, a horizontal chip strip with an "All" chip first plus one chip per root category, and a scroll body with `Sponsored` and `Regular` textured sections below.
- [ ] Tapping a category chip filters the list to that root category (chip goes active-state); tapping "All" clears the filter.
- [ ] Search bar filtering works on the all-listings screen; empty state renders when no results match.
- [ ] Pull-to-refresh works; `useInfiniteQuery` pagination continues to load subsequent pages on near-bottom scroll.
- [ ] Deep link to `/listings/<slug>` still resolves to the existing Category screen (unchanged).
- [ ] `pnpm --filter @aira/mobile typecheck` — clean.
- [ ] `pnpm lint` — clean.

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Admin row target.** Mobile has no `/admin` route. Options: (a) hide the row entirely on mobile even for admins; (b) open web `/admin` in the system browser via `Linking.openURL(brand.url + "/admin")`; (c) keep it visible but no-op with a toast ("Admin controls live on the web"). Preference?

2. **Tab icon for the renamed tab.** Current icon is `▦` (grid glyph — reads as "categories"). "Listings" would read more naturally as a stacked-list glyph like `☰` or `▤`. Change now, or defer to a UX pass?

3. **"All" chip vs no-chip default.** Two idioms: (a) the chip strip always includes an explicit "All" chip at the front, active when no category is selected; (b) no explicit "All" chip — instead, the currently-active chip is highlighted, and tapping it again deselects. (a) is more discoverable, (b) is cleaner. Preference?

4. **Search debounce.** Current `[category].tsx` doesn't debounce — every keystroke fires a query. Fine on a category-scoped list, potentially expensive on all-listings. Add a 200ms debounce in `useListings` (or the caller) as part of this plan, or defer?

5. **Universal-link vs drawer.** If a Universal Link takes a user to `/listings/<slug>`, do we want the drawer to auto-open showing that category as active (so they can see where they are)? Or leave it closed (matches the "notification arrival = zero UI chrome" convention)?

6. **Home tab hamburger vs bell.** Home currently has no header icon on the right; web has a `NotificationBell`. This plan adds a left-hamburger to Home. Do we want to also add the notification bell on the right for parity, or defer that to F21 push-broadcast work?
