# Review: mobile top-bar consistency (shared TopBar component)

**Date:** 2026-07-14
**Slug:** 2026-07-14-mobile-topbar-consistency
**Plan reviewed:** [2026-07-14-mobile-topbar-consistency.md](../plans/2026-07-14-mobile-topbar-consistency.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** /mlabs-review (framer@millionlabs.co.uk, via /mlabs-auto)

---

## Summary

Plan is ready to implement with all three plan-level open questions locked to their recommended defaults. Spot-checked five of the fifteen target screens (`account/about.tsx`, `account/profile.tsx`, `account/privacy-security.tsx`, `post/[id].tsx`, `account/posts/edit/[id].tsx`) and confirmed the mechanical pattern is identical everywhere — each screen currently has a single `<Stack.Screen options={{ title: "…" }} />` at the top of its `SafeAreaView`, which becomes `<TopBar title="…" left={<BackButton />} />`. No structural surprises. No new deps. Pure JS/TS. OTA-shippable.

**UI-Significant heuristic:** the diff surface is entirely under `apps/mobile/*`. The flag's rule is web-scoped (`apps/web/src/app/**/page.tsx`, `apps/web/src/app/**/layout.tsx`, `apps/web/src/features/*/components/**/*.tsx`, `apps/web/src/components/**/*.tsx`). Nothing under those paths moves. Flag = `no`. The mobile UI is significant in intent — this touches sixteen files — but mockups are a web-mockup gate that doesn't map to Expo/RN. If desired, invoke `/mlabs-mockup` manually with a bespoke mobile-styled HTML.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** three open questions from the plan were left "recommended default" without a lock. Anything the reviewer surfaces mid-implementation as ambiguous would slow `/mlabs-code`.
  **Decision:** all three locked below.

- **Concern:** Stack.Screen options that ONLY carry `title` become no-ops once `headerShown: false` is set at the layout level. Screens might have leftover `<Stack.Screen options={{ title: "…" }} />` calls that render nothing but visually clutter the JSX. Also: the `title` string might be used by react-navigation internally for state serialization / accessibility.
  **Decision:** drop `<Stack.Screen>` from screens that only used it to set the header title (13 of the 15 target screens). Keep it on the two screens where it also carries functional options: `post/new.tsx` (presentation `pageSheet` + detent config) and any screen where a specific Stack.Screen option must survive. Accessibility comes from TopBar's own `<Text accessibilityRole="header">` — no regression.

- **Concern:** the post composer's `HeaderCancel` is a local function defined inline in `post/new.tsx` (renders a text "Cancel" that calls `router.back()`). If TopBar's `left` slot needs a component reference, we'd have to lift `HeaderCancel` out of the file OR pass it inline.
  **Decision:** pass it inline — TopBar takes `React.ReactNode`, so `<TopBar left={<HeaderCancel />} />` where `HeaderCancel` stays defined in `post/new.tsx` works with zero refactor. No extraction needed.

- **Concern:** every screen has multiple render states (loading skeleton / not-found / main). Each state currently declares its own `<Stack.Screen options={{ title: "…" }} />` with a different title ("Loading…" / "Not found" / the real title). With TopBar taking over, each state needs a TopBar with the corresponding title.
  **Decision:** for the plan's 15 screens, mechanically render `<TopBar />` at the top of every render-state branch. Titles per state are preserved (`"Loading…"`, `"Not found"`, real title). Small duplication, but keeps each branch self-contained and matches the current Stack.Screen pattern one-for-one.

### Suggestions (taken)

- **Taken.** Order the task commits so each one leaves the app in a working state — never a temporary "no header at all" or "double header" render. Convert one full stack at a time: hide-native-header + rewrite-all-screens-in-that-stack in a single commit per stack. Sequenced under "Implementation plan" below.

## Decisions locked

Net decisions made during review, plus the three plan-level open questions:

1. **Right slot shape:** flexible `right?: React.ReactNode`. TopBar's right prop accepts any React node. Post root passes the `+` Pressable; other screens pass nothing today; business detail / future screens can pass share buttons, etc., without needing a new prop.
2. **Title font:** Lato-semibold. Match today's native header exactly — `<Text className="font-semibold text-foreground">` with the app's default font family (Lato via the tailwind `sans` mapping). No `font-display` on titles. Opting into Cormorant is a separate design pass.
3. **Post composer sheet grabber:** kept. `sheetGrabberVisible: true` stays. Two horizontal top affordances on the composer (grabber above TopBar) is standard iOS sheet composition. Matches Music / Maps / Photos.
4. **Stack.Screen cleanup:** drop `<Stack.Screen options={{ title }} />` from screens where title is the only option. Keep Stack.Screen on `post/new.tsx` for its sheet presentation options.
5. **HeaderCancel scope:** stays inline in `post/new.tsx`. Passed as `<HeaderCancel />` to TopBar's `left` slot.
6. **Multi-state rendering:** every render-state branch (loading / not-found / main) declares its own TopBar with its own title string.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is one commit and leaves the app in a working state (no intermediate "missing header" or "double header" state).

### Task 1: Add shared TopBar component

- **Files:** `apps/mobile/components/nav/TopBar.tsx` (new)
- **What:** New JS-rendered top bar. Cream background (`#EAE0CB`) that extends through the safe-area top region via `useSafeAreaInsets()` + a `paddingTop: insets.top`. Content row 44pt tall: 44×44 slot on the left, absolute-positioned centered title (so it doesn't shift when slots come and go), 44×44 slot on the right. Title is `<Text className="font-semibold text-foreground" numberOfLines={1} accessibilityRole="header">`. Props:
  ```ts
  interface TopBarProps {
    title: string;
    left?: React.ReactNode;
    right?: React.ReactNode;
  }
  ```
  No border-bottom (matches Home tab's bottom-tabs header default). Both slots occupy 44pt even when empty so title stays centered.
- **Acceptance:** file compiles; component can be rendered under `<SafeAreaProvider>` with any combination of `left` / `right` / neither and lays out correctly at all three states.

### Task 2: Convert Categories stack (1 screen)

- **Files:** `apps/mobile/app/(app)/categories/_layout.tsx` · `apps/mobile/app/(app)/categories/index.tsx`
- **What:**
  - Layout: set `screenOptions.headerShown: false`; drop the `BackButton` import + `headerLeft`/`headerBackVisible` options (no longer applies).
  - `categories/index.tsx`: render `<TopBar title="Listings" left={<HamburgerButton />} />` as the first child inside the `<SafeAreaView>`. Drop the `<Stack.Screen options={{ title, headerLeft }} />` line. Import `TopBar` from `../../../components/nav/TopBar`.
- **Acceptance:** typecheck clean; on iOS 26 the All-Listings tab renders a flat cream top bar with hamburger left + centered "Listings" title, matching Home visually.

### Task 3: Convert Listings stack (2 screens)

- **Files:** `apps/mobile/app/(app)/listings/_layout.tsx` · `apps/mobile/app/(app)/listings/[category]/index.tsx` · `apps/mobile/app/(app)/listings/[category]/[id].tsx`
- **What:**
  - Layout: `screenOptions.headerShown: false`; drop `BackButton` import + `headerLeft` + `headerBackVisible`.
  - `[category]/index.tsx`: render `<TopBar title={headerTitle} left={<BackButton />} />` in every render-state branch (loading, empty, main). Drop the `<Stack.Screen>` calls that only carried title. Import TopBar + BackButton.
  - `[category]/[id].tsx`: same treatment — render TopBar in loading / not-found / detail branches. `useOriginAwareBack()` continues to intercept OS back gestures via `?from`; unchanged. The bottom "Go back" button stays as an additional affordance.
- **Acceptance:** typecheck clean; category-listing and business-detail pages render flat cream top bar with back arrow left; origin-aware back still returns to `?from` origin on both header BackButton and OS gestures.

### Task 4: Convert Post stack (3 screens)

- **Files:** `apps/mobile/app/(app)/post/_layout.tsx` · `apps/mobile/app/(app)/post/index.tsx` · `apps/mobile/app/(app)/post/[id].tsx` · `apps/mobile/app/(app)/post/new.tsx`
- **What:**
  - Layout: `screenOptions.headerShown: false`; drop `BackButton` import + `headerLeft`.
  - `post/index.tsx` (root): render `<TopBar title={"Post on " + brand.name} left={<HamburgerButton />} right={<PlusButton />} />`. The existing "+" Pressable becomes either a small `PlusButton` local component or inline JSX in the right slot — keep whichever reads cleaner.
  - `post/[id].tsx`: render `<TopBar title={headerTitle} left={<BackButton />} />` in every render-state branch (loading / not-found / detail).
  - `post/new.tsx`: KEEP `<Stack.Screen options={SCREEN_OPTIONS} />` for sheet presentation (`presentation: "pageSheet"`, `sheetAllowedDetents`, `sheetGrabberVisible`, `sheetCornerRadius`, `sheetInitialDetentIndex`). Remove `title` and `headerLeft` fields from SCREEN_OPTIONS (they're moot with headerShown false). Render `<TopBar title="New post" left={<HeaderCancel />} />` at the top of the composer's JSX. HeaderCancel stays defined inline as it is today.
- **Acceptance:** typecheck clean; Post root shows hamburger left + `+` right; Post detail shows back arrow left; New-post composer opens as bottom sheet (grabber still visible above TopBar) with Cancel text-left and "New post" centered title.

### Task 5: Convert Account stack (10 screens)

- **Files:** `apps/mobile/app/(app)/account/_layout.tsx` · `apps/mobile/app/(app)/account/index.tsx` · `apps/mobile/app/(app)/account/about.tsx` · `apps/mobile/app/(app)/account/favorites.tsx` · `apps/mobile/app/(app)/account/listings.tsx` · `apps/mobile/app/(app)/account/notifications.tsx` · `apps/mobile/app/(app)/account/posts.tsx` · `apps/mobile/app/(app)/account/privacy-security.tsx` · `apps/mobile/app/(app)/account/profile.tsx` · `apps/mobile/app/(app)/account/terms.tsx` · `apps/mobile/app/(app)/account/posts/edit/[id].tsx`
- **What:**
  - Layout: `screenOptions.headerShown: false`; drop `BackButton` import + `headerLeft`; drop the doc comment about `headerBackVisible` (no longer relevant).
  - `account/index.tsx` (root): render `<TopBar title="Account" left={<HamburgerButton />} />`; drop the `<Stack.Screen options={{ title, headerBackVisible, headerLeft }} />`.
  - Every sub-screen: render `<TopBar title="…" left={<BackButton />} />` with the current title string. Drop the `<Stack.Screen options={{ title }} />` in every render-state branch. Sub-screens with loading / not-found states: render TopBar per branch, same pattern as Task 3 / Task 4.
- **Acceptance:** typecheck clean; account hub shows hamburger left; all account sub-screens (favorites, profile, notifications, posts, edit-post, privacy-security, terms, about, listings) show back arrow left with the correct title centered; nothing else changes about their content.
- **Pause if:** any account sub-screen turns out to have a Stack.Screen option other than plain `title` (e.g. custom `headerRight`, `presentation`, `headerStatusBarHeight`) — surface a diff and confirm the treatment for that screen.

## Open questions

None. All three plan-level opens were resolved above.
