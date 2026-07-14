# Run report — mobile top-bar consistency

**Status:** complete
**Review:** [2026-07-14-mobile-topbar-consistency](../../reviews/2026-07-14-mobile-topbar-consistency.md)
**Branch:** feat/landing-explainer-videos
**Commits:** 5

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Add shared TopBar component | ✓ | 764d297 |
| 2 | Convert Categories stack (1 screen) | ✓ | 8fe3c24 |
| 3 | Convert Listings stack (2 screens) | ✓ | 1544304 |
| 4 | Convert Post stack (3 screens) | ✓ | d7b7230 |
| 5 | Convert Account stack (10 screens) | ✓ | d104a7a |

## Commits (in order)

- **764d297** — `feat(mobile/nav): shared TopBar component`
- **8fe3c24** — `feat(mobile/listings): convert Categories tab to shared TopBar`
- **1544304** — `feat(mobile/listings): convert Listings stack to shared TopBar`
- **d7b7230** — `feat(mobile/post): convert Post stack to shared TopBar`
- **d104a7a** — `feat(mobile/account): convert Account stack to shared TopBar`

## Verification

- `pnpm --filter @aira/mobile typecheck` — clean after every task.
- Lefthook pre-commit gates (`check-migrations` + `check-contrast`) — passed on every commit.
- No `Pause if` triggers fired. The one screen the review anticipated might trigger a pause — `account/notifications.tsx` with its `headerRight` "Mark all" affordance — turned out to fit the TopBar right slot cleanly (same treatment as `post/index.tsx`'s `+` button), so no confirmation was needed.

## Files touched

**New:**
- `apps/mobile/components/nav/TopBar.tsx`

**Edited (16 files):**
- 4 stack layouts flipped to `headerShown: false`: `categories/_layout.tsx`, `listings/_layout.tsx`, `post/_layout.tsx`, `account/_layout.tsx`
- 15 screens converted to render `<TopBar />`:
  - `categories/index.tsx`
  - `listings/[category]/index.tsx`
  - `listings/[category]/[id].tsx`
  - `post/index.tsx`
  - `post/[id].tsx`
  - `post/new.tsx`
  - `account/index.tsx`
  - `account/about.tsx`
  - `account/favorites.tsx`
  - `account/listings.tsx`
  - `account/notifications.tsx`
  - `account/posts.tsx`
  - `account/posts/edit/[id].tsx`
  - `account/privacy-security.tsx`
  - `account/profile.tsx`
  - `account/terms.tsx`

**Deliberately not touched:**
- `apps/mobile/app/(app)/index.tsx` (Home tab) — already correct via bottom-tabs.
- `apps/mobile/app/(app)/_layout.tsx` (Tabs) — Home Tabs.Screen options unchanged.
- `apps/mobile/app/(app)/listings/index.tsx` — a `<Redirect />` only, no visible UI.
- `apps/mobile/components/nav/HamburgerButton.tsx` / `BackButton.tsx` / `NotificationBell.tsx` — reused as TopBar slot content.

## Deviations from the review

None. Ordering matched the plan exactly (one stack per commit, no intermediate "no header" or "double header" state at any point). The `account/notifications.tsx` headerRight was noted as a possible pause trigger; on inspection it dropped into TopBar's `right` slot cleanly with only a small styling adjustment (added explicit 44×44 dimensions for tap consistency), so no user confirmation was needed.

## Follow-ups (for future work)

- **Verify on iOS 26 device.** The whole point of this refactor was to kill the Liquid Glass bar-button capsule. That needs eyes-on-device confirmation. Ship the OTA and check every screen.
- **Consider TopBar for the Home tab too.** Currently Home uses bottom-tabs' JS-rendered header, which already looks fine. But long-term, converging on one header component across the whole app (including Home) would simplify future styling changes. Small refactor, not urgent.
- **`sheetGrabberVisible` + TopBar composition on the composer.** The plan considered hiding the grabber since TopBar provides a Cancel affordance. Kept the grabber per iOS convention. Watch for user feedback that the two-affordance stack (grabber above TopBar) feels crowded — hide the grabber if so.
- **Bell + hamburger on nested screens.** Only tab-root screens get the hamburger today. If we ever want the drawer reachable from nested screens too (e.g. Account → Favorites → tap hamburger), TopBar's `left` slot supports it — just wire a per-screen decision or add a nested-screen policy.

## Recommended next step

Ship the OTA (`/mstack-expo` → OTA mode targeting production) so the Liquid Glass capsule finally disappears on installed devices. Verify on your iPhone across all four tabs + at least one sub-screen per stack (Account/Favorites, Post detail, Business detail). Then `/mlabs-qa` if you want systematic Playwright coverage — but this is primarily a native-render fix that Playwright can't fully verify (Playwright driving Expo Web won't hit the iOS 26 UINavigationBar behavior anyway).
