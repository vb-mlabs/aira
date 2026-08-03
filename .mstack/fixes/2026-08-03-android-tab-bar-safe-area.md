# Fix — Samsung Android tab bar overlaps system 3-button nav

**Started:** 2026-08-03
**Source:** user-report (screenshot: attached_assets/image_1785744965078.png)
**Status:** fixed
**Commit:** _pending — see final section_

## Symptom / repro

On Samsung One UI (Android) with the 3-button navigation bar showing,
the app's bottom tab bar (Home / Listings / Post / Account) renders
UNDER the system nav overlay — tab labels and icons collide with
the OS Home / Recents / Back controls, making the bottom tabs
partially unusable. iOS on the same build renders correctly.

Reproduced by the user on their Samsung Galaxy device
(screenshot in `attached_assets/`); could not be reproduced in this
session (no Android emulator / device attached). Cause was
identified from source inspection instead — the source-level defect
is directly readable.

## Root cause

`apps/mobile/app/(app)/_layout.tsx` sets `tabBarStyle: { height: 76,
paddingBottom: 8, ... }` on the `Tabs` navigator (pre-fix line
126-132). React Navigation's bottom-tabs applies safe-area padding
automatically ONLY when the caller omits both `height` and
`paddingBottom`; setting either overrides the auto-behavior on both
platforms. iOS masked the bug because the home-indicator inset is
narrow (or zero, on gesture-only iOS builds); Android with 3-button
nav has a 48pt system chrome and z-fights the fixed 76pt tab bar
exactly as the screenshot shows.

The file's own comment at pre-fix line 124-125 claimed the navigator
"adds [the iOS home-indicator safe-area] on top" — that claim was
incorrect (the navigator adds it only when the caller doesn't
override), which is why the drift went unnoticed at author-time.

## Fix

`apps/mobile/app/(app)/_layout.tsx` — one file, three edits:

1. Import `useSafeAreaInsets` from `react-native-safe-area-context`
   (already a project dep; `SafeAreaProvider` is already wired at
   `apps/mobile/app/_layout.tsx:3`, so this hook just reads what
   the provider is already publishing).
2. Call `const insets = useSafeAreaInsets()` inside `AppLayout()`.
3. Change `tabBarStyle` to `height: 76 + insets.bottom` and
   `paddingBottom: 8 + insets.bottom`. The 76pt design body stays
   the same on every device; the inset is additive so gesture-nav,
   3-button-nav, foldables, and Android 15 edge-to-edge each clear
   the system chrome by exactly the amount the OS reserved.

Corrected the stale comment about auto-inset behavior so a future
reader doesn't repeat the same mistake.

Zero new dependencies. Zero migrations. Zero new design tokens.
OTA-safe (no plugin, permission, icon, splash, native code, or
version bump).

## Evidence

- `pnpm --filter @aira/mobile typecheck` → **green** (tsc --noEmit,
  exit 0).
- `bash .../check-token-drift.sh apps/mobile/app/(app)/_layout.tsx`
  → 8 warnings, all pre-existing raw color literals (`#EAE0CB`,
  `#3D2814`, `#4F653B`, `rgba(...)`). Diff added **zero** new
  drift; verified by inspection.
- Cause visible in the pre-fix source at line 126-132 (fixed
  `height` + `paddingBottom` without `useSafeAreaInsets`).
- **Visual on-device confirmation is user-driven** — this dev
  environment has no Android emulator. Recommended flow: run
  `pnpm --filter @aira/mobile start` on the user's Replit
  workspace, scan the Expo Go QR on the same Samsung device that
  produced the original screenshot, land on the Home tab, confirm
  the tab bar clears the system nav.

## Follow-ups

- **OTA push.** This is a pure JS/TS fix on the current runtime
  `0.1.1`. Once on-device confirmation passes, run `/mstack-expo`
  to publish the OTA. If a meaningful `0.1.0` cohort still exists
  (per CLAUDE.md's OTA notes), publish a second OTA with
  `--runtime-version 0.1.0`.
- **Adjacent safe-area audit.** Every other custom-height chrome
  in the mobile app (`TopBar`, per-screen headers, fixed footers)
  is worth grepping for the same anti-pattern — a fixed height
  without an inset addition would repro this bug in a different
  location. Not in scope for this fix; captured to backlog.
- **Token drift on this file** — 8 pre-existing raw color literals
  (mentioned by the drift check). Not caused by this fix; not in
  scope. If the mobile app ever adopts a Tailwind-preset-consuming
  StyleSheet layer, sweep them all at once.
