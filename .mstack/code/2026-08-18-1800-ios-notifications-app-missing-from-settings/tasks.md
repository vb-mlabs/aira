# Implementation: iOS notifications re-trigger banner on /account/notifications

**Started:** 2026-08-18 18:15
**Debug report:** [../../debug/2026-08-18-1800-ios-notifications-app-missing-from-settings/report.md](../../debug/2026-08-18-1800-ios-notifications-app-missing-from-settings/report.md)
**Branch:** fix/mobile-notifications-re-trigger-banner
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add "Enable notifications" banner on /account/notifications
  - Files: `apps/mobile/app/(app)/account/notifications.tsx`
  - Commit: `767648e`
  - Notes: typecheck clean; debug spec now green.

- [x] **Task 2:** Verify — run the failing debug spec, confirm it passes
  - Files: `.mstack/debug/2026-08-18-1800-ios-notifications-app-missing-from-settings/specs/repro.spec.ts`
  - Commit: — (verification only)
  - Notes: `1 passed` after fix.
