# Implementation: mobile sign-out redirect fix

**Started:** 2026-07-13 10:53
**Debug report:** [2026-07-13-1053-mobile-signout](../../debug/2026-07-13-1053-mobile-signout/report.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Fix `useSignOut()` so the `(app)` gate actually re-renders
  - Files: `apps/mobile/features/auth/hooks.ts`
  - Change: `onSuccess: () => qc.clear()` → `onSettled: () => qc.resetQueries()`
  - Commit: 417694f
  - Notes: acceptance test passes, `pnpm --filter @aira/mobile typecheck` clean.
