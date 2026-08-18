# Implementation log

2026-08-18 18:15 — Pre-flight
- Started from debug report `.mstack/debug/2026-08-18-1800-.../report.md` (Status: ready-for-code).
- User chose new branch off feat/business-logo tip (main is stale) → `fix/mobile-notifications-re-trigger-banner`.
- User chose to commit .mstack/ artifacts first, leave .claude/ alone.
- Chore commit `d4df7b1` landed with debug report, failing spec, and appended learning.

2026-08-18 18:20 — Task 1
- Added `EnablePushBanner` local component in `apps/mobile/app/(app)/account/notifications.tsx`.
- Reads `Notifications.getPermissionsAsync()` on mount and on `useFocusEffect` from expo-router.
- Renders `null` while unknown or when `granted`; otherwise renders a `bg-muted/40` banner with "Enable" button.
- Tap → `requestPermissionAndRegister()`. On the specific iOS `!canAskAgain` error string surfaced by `lib/push.ts`, falls back to `Linking.openSettings()`.
- Placed between `TopBar` and the isLoading/empty/populated branches so it shows in all three states.
- Typecheck: `pnpm --filter @aira/mobile exec tsc --noEmit` → 0 errors.
- Debug spec: green (`1 passed`) — invariant satisfied.
- Committed as `767648e` via lefthook pre-commit (`check-contrast` + `check-migrations` passed).

2026-08-18 18:25 — Wrap-up
- Both tasks completed. Writing report + updating debug-report status → implemented.
