# Plan: mobile top-bar consistency (shared TopBar component)

**Date:** 2026-07-14
**Slug:** 2026-07-14-mobile-topbar-consistency
**Status:** reviewed
**Author:** /mlabs-plan (framer@millionlabs.co.uk, via /mlabs-auto)

---

## Problem

On iOS 26, `@react-navigation/native-stack` delegates the header to the native `UINavigationBar`, which now wraps every custom `headerLeft` / `headerRight` view in a translucent "Liquid Glass" capsule by default. That styling is applied at the UIKit level and can't be reliably disabled through any react-navigation JS option we have available.

The Home tab is the exception. It uses `@react-navigation/bottom-tabs`, whose header is rendered entirely in JavaScript — custom icons sit flat on the cream bar with nothing wrapping them.

The result across the app today:
- **Home tab**: hamburger + notification bell render flat on cream. Correct.
- **Listings / Post / Account tabs** and every nested screen: hamburger, back arrow, "+", notification bell, "Cancel" all sit inside rounded light capsules. Inconsistent chrome, drops the perceived polish level.

User caught this after the OTA landed and screenshotted both cases. The fix agreed with them is Option B from the discussion: build a shared JS-rendered top bar and hide the native header everywhere the capsule appears.

## Scope

**In:**

- New component `apps/mobile/components/nav/TopBar.tsx` — cream background matching the Home tab's `headerStyle.backgroundColor` (`#EAE0CB`), safe-area top inset via `useSafeAreaInsets()`, foreground tint `#3D2814`. Slotted API:
  - `title: string` — centered, single line, truncated at end if long.
  - `left?: React.ReactNode` — optional; typical callers pass `<HamburgerButton />` (tab roots), `<BackButton />` (nested), or `<HeaderCancel />` (composer sheet).
  - `right?: React.ReactNode` — optional; typical callers pass `<NotificationBell />` (Home would too, but Home stays on bottom-tabs and isn't affected), the `+` post trigger (Post root), or nothing.
- Hide the native header on the four non-Home stacks by setting `screenOptions.headerShown: false` at the layout level:
  - `apps/mobile/app/(app)/categories/_layout.tsx`
  - `apps/mobile/app/(app)/listings/_layout.tsx`
  - `apps/mobile/app/(app)/post/_layout.tsx`
  - `apps/mobile/app/(app)/account/_layout.tsx`
- Rewrite every screen inside those four stacks to render `<TopBar />` at the top of its JSX. Fifteen screens in total (list under Files to touch).

**Out (deferred):**

- Home tab. `apps/mobile/app/(app)/_layout.tsx`'s Tabs.Screen for `name="index"` stays exactly as-is — it already renders correctly via bottom-tabs.
- Route filesystem structure. No file moves; no path changes.
- Post composer's bottom-sheet presentation. `sheetAllowedDetents`, `sheetGrabberVisible`, `sheetCornerRadius`, `presentation: "pageSheet"` all remain on the Stack.Screen options. TopBar becomes the sheet's content header — the sheet still slides up and snaps to detents, just with our custom bar inside.
- Deletion of `HamburgerButton`, `BackButton`, `NotificationBell` — they get reused as slot content inside TopBar.
- Any redesign of icon sizing, tint, hitSlop — the existing button components already match Home visually.
- Any change to origin-aware back logic. `BackButton` + `useOriginAwareBack` + `?from=` all keep working — TopBar's `left` slot just hosts the existing BackButton unchanged.

## Approach

**Chosen path — shared JS-rendered TopBar hosted at the top of every screen's JSX, native header hidden at the stack level.**

The component is small and unopinionated. Layout:

```
┌─────────────────────────────────────────────────┐
│  <safe-area top inset — cream extends through>  │
├─────────────────────────────────────────────────┤
│  [left slot 44x44]  <title centered>  [right]   │
└─────────────────────────────────────────────────┘
```

- The cream background paints from `insets.top: 0` down through the content area — matches how `bottom-tabs` extends its header background under the safe area.
- Content area height is 44pt (matches iOS default, matches bottom-tabs default). Slot children (`HamburgerButton`, `BackButton`, `NotificationBell`) are already 44×44 Pressables — they drop into the slot at native size without any additional wrapping.
- Title is `Text` with `font-display font-semibold text-foreground` and `numberOfLines={1}` for graceful truncation. Centered via `position: absolute` overlay so it doesn't shift as slots come and go.

**Wiring per stack**:
- Stack `_layout.tsx` gets `screenOptions.headerShown: false` — removes the entire native bar. Also drop the stack-level `headerLeft: BackButton` (moved into per-screen TopBar) and `headerBackVisible: false` (moot when header is hidden).
- Every screen (`.tsx` file) inside the stack renders `<TopBar title="…" left={…} right={…} />` as the first child of its root View/SafeAreaView.
- Screens should NOT wrap TopBar in a top-inset SafeAreaView — TopBar owns its own inset. But bottom insets stay on the screen's SafeAreaView (`edges={["bottom"]}`).

**Alternatives considered:**

- **Override react-navigation's native-stack options** (`headerLeftContainerStyle`, custom `headerBackground`). *Rejected* — no combination reliably suppresses iOS 26's `UIBarButtonItem` glass wrapping; that styling is applied inside UIKit after our JS renders. Coin-flip against Apple's default appearance.
- **Switch all four tabs from native-stack to `@react-navigation/stack` (JS stack)**. *Rejected* — heavier change, loses native iOS gesture semantics and animation performance, breaks the biz-detail bottom-sheet presentation (formSheet/pageSheet are native-only options).
- **Keep native header, wrap icons in a solid cream `View` that visually "fills" the glass capsule so it disappears against the bar**. *Rejected* — brittle hack, would need per-device tuning of the fill radius, breaks the moment Apple tweaks the appearance in a point release.

## Data model changes

None.

## Files to touch

**New:**

- `apps/mobile/components/nav/TopBar.tsx`

**Edit (stack layouts — hide native header):**

- `apps/mobile/app/(app)/categories/_layout.tsx` — set `headerShown: false`; drop the now-unused `BackButton` import + `headerLeft` option.
- `apps/mobile/app/(app)/listings/_layout.tsx` — same.
- `apps/mobile/app/(app)/post/_layout.tsx` — same.
- `apps/mobile/app/(app)/account/_layout.tsx` — same; also drop the layout comment about `headerBackVisible` divergence (no longer relevant).

**Edit (screens — render TopBar):**

- `apps/mobile/app/(app)/categories/index.tsx` — root screen; `<TopBar title="Listings" left={<HamburgerButton />} />`. Drop the current `<Stack.Screen options={{ title, headerLeft }} />`.
- `apps/mobile/app/(app)/listings/[category]/index.tsx` — nested; `<TopBar title={headerTitle} left={<BackButton />} />`. Drop the current `<Stack.Screen options={{ title }} />` calls in both the not-found early return and the main render.
- `apps/mobile/app/(app)/listings/[category]/[id].tsx` — biz detail; `<TopBar title={headerTitle} left={<BackButton />} />` in both the not-found early return and the detail render. `useOriginAwareBack()` continues to gate OS-level back via `?from=`, unchanged.
- `apps/mobile/app/(app)/post/index.tsx` — root; `<TopBar title="Post on {brand.name}" left={<HamburgerButton />} right={<PlusButton />} />`. The existing "+" Pressable becomes a small `PlusButton` local component (or inline JSX) rendered in the `right` slot.
- `apps/mobile/app/(app)/post/[id].tsx` — nested; `<TopBar title="…" left={<BackButton />} />`.
- `apps/mobile/app/(app)/post/new.tsx` — nested (bottom sheet); `<TopBar title="New post" left={<HeaderCancel />} />`. Preserve the existing `HeaderCancel` component that renders "Cancel" text on the left. The sheet presentation options on the Stack.Screen stay untouched.
- `apps/mobile/app/(app)/account/index.tsx` — root; `<TopBar title="Account" left={<HamburgerButton />} />`. Drop the current `<Stack.Screen options={{ headerBackVisible, headerLeft }} />`.
- `apps/mobile/app/(app)/account/about.tsx` — nested; `<TopBar title="About" left={<BackButton />} />`.
- `apps/mobile/app/(app)/account/favorites.tsx` — nested; `<TopBar title="Favorites" left={<BackButton />} />`.
- `apps/mobile/app/(app)/account/listings.tsx` — nested; `<TopBar title="My Listings" left={<BackButton />} />`.
- `apps/mobile/app/(app)/account/notifications.tsx` — nested; `<TopBar title="Notifications" left={<BackButton />} />`.
- `apps/mobile/app/(app)/account/posts.tsx` — nested; `<TopBar title="My Posts" left={<BackButton />} />`.
- `apps/mobile/app/(app)/account/posts/edit/[id].tsx` — nested; `<TopBar title="Edit post" left={<BackButton />} />`.
- `apps/mobile/app/(app)/account/privacy-security.tsx` — nested; `<TopBar title="Privacy & Security" left={<BackButton />} />`.
- `apps/mobile/app/(app)/account/profile.tsx` — nested; `<TopBar title="My Profile" left={<BackButton />} />`.
- `apps/mobile/app/(app)/account/terms.tsx` — nested; `<TopBar title="Terms" left={<BackButton />} />`.

**Do not touch:**

- `apps/mobile/app/(app)/index.tsx` (Home tab) — bottom-tabs already correct.
- `apps/mobile/app/(app)/_layout.tsx` (Tabs) — Home Tabs.Screen options stay as-is.
- `apps/mobile/app/(app)/listings/index.tsx` (`<Redirect />` only, no visible UI).
- `apps/mobile/components/nav/{HamburgerButton,BackButton,NotificationBell}.tsx` — reused as slot content.

## Edge cases

- **Bottom-sheet composer (`post/new.tsx`)**. Presentation stays `pageSheet` with detents + grabber. The TopBar renders inside the sheet's content area — the sheet's own drag handle sits ABOVE our bar. Two horizontal "top" affordances (grabber + our bar) is standard iOS sheet composition (see Apple Maps' place-detail sheet). If it feels crowded, TopBar's height (44pt) is small enough that this shouldn't be a real issue — but flag for QA.
- **Modal Dialogs opened over a TopBar screen**. Sign-out confirm Dialog uses React Native's `Modal`. Modal overlays everything including our TopBar — no z-order issues expected.
- **Universal-link cold-start peek** (drawer briefly opens on `/listings/*` arrival). TopBar sits below the drawer overlay; drawer covers it. No interaction issue.
- **Long titles**. Categories with long names (e.g. "Health & Wellness") + a right slot could crowd the center title. Title uses `numberOfLines={1}` and `flex: 1`, and slot widths are fixed at 44pt, so title has ~ `width - 88pt - horizontal padding` to work with. On a 375pt-wide phone that's ~275pt of title space — comfortable for anything except pathological titles.
- **Android hardware back on stack roots**. Currently intercepted by the tab-press listeners at the (app) Tabs level. TopBar doesn't affect this path.
- **iOS edge-swipe gesture on nested screens**. Native-stack's `gestureEnabled: true` is what powers the swipe — that's unaffected by hiding the header (gesture is a screen-level property, not a header one). Origin-aware back via `useOriginAwareBack()` continues to intercept.
- **Screen-scoped SafeAreaView with `edges={["bottom"]}`**. Existing pattern on ~all nested screens. Untouched — TopBar handles top inset, bottom SafeAreaView handles the tab bar / gesture area.
- **Cream extending under the notch**. TopBar renders cream from the top of the screen down through `insets.top + 44pt`. On phones with a Dynamic Island / notch the cream fills the ears (matches how bottom-tabs and native-stack both extend header background into the safe area today).
- **NotificationBell + tab bar unread count**. `useUnreadCount()` is called once at the (app) Tabs level for cache warming; NotificationBell reads from the same cache. No behavior change.

## Acceptance criteria

- [ ] `apps/mobile/components/nav/TopBar.tsx` exists and exports `TopBar` with props `{ title, left?, right? }`.
- [ ] All four non-Home stack `_layout.tsx` files set `screenOptions.headerShown: false` (and drop the stack-level `BackButton` wiring).
- [ ] All 15 target screens render `<TopBar />` at the top of their JSX; none of them still declare `<Stack.Screen options={{ title, headerLeft, headerRight, headerBackVisible }} />` for header purposes (Stack.Screen options for presentation / sheet detents stay).
- [ ] Home tab (`apps/mobile/app/(app)/index.tsx` + its Tabs.Screen entry) is unchanged. Home still uses bottom-tabs' JS-rendered header.
- [ ] On iOS 26, all icons across every non-Home screen render **flat** on the cream bar — no translucent capsule / rounded background behind hamburger, back arrow, `+`, notification bell, or Cancel text.
- [ ] Cream color, foreground tint, icon size, and total top-bar height (safe-area + 44pt) match the Home tab pixel-for-pixel.
- [ ] Every screen keeps its current title text.
- [ ] Origin-aware back (`BackButton` reading `?from=`) still works from the header slot on biz detail — tapping back goes to the origin, not a URL-hierarchical parent.
- [ ] OS back gestures (iOS edge-swipe, Android hardware back) on biz detail still honor `?from=` via `useOriginAwareBack()`.
- [ ] Post composer (`post/new.tsx`) still presents as a bottom sheet with drag grabber and detents; TopBar renders inside the sheet with Cancel on the left.
- [ ] `pnpm --filter @aira/mobile typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] Diff surface is JS/TS only — no `app.config.ts`, `eas.json`, `package.json`, or plugin config touched. OTA-shippable.

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Right slot shape.** Confirmed with user in the pre-invocation brief: flexible `right?: React.ReactNode` (recommended) so business detail can add a share button later without another PR. Lock this vs a fixed `bell?: boolean` prop.

2. **Title font styling.** Current native headers use `headerTitleStyle: { fontWeight: "600" }`. Home tab bottom-tabs uses the same. Should TopBar's title also apply `className="font-display"` (Cormorant Garamond) or just Lato-semibold? The current native headers apparently render Lato (system default). Recommend keeping title in Lato-semibold to match today's behavior; opting into Cormorant would be a separate design pass.

3. **Post composer TopBar + sheet grabber composition.** The sheet's native drag handle sits above the sheet's content. Our TopBar goes at the top of the content, so the visual stack becomes: [grabber] [our cream TopBar]. Is that acceptable, or do we want to suppress `sheetGrabberVisible: false` on the composer since TopBar provides its own "Cancel" affordance? Recommend keeping the grabber (dismiss via swipe is more discoverable than Cancel text on iOS).
