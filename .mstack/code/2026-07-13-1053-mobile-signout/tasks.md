# Implementation: mobile sign-out redirect fix

**Started:** 2026-07-13 10:53
**Debug report:** [2026-07-13-1053-mobile-signout](../../debug/2026-07-13-1053-mobile-signout/report.md)
**Branch:** feat/landing-explainer-videos
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [~] **Task 1:** Fix `useSignOut()` so the `(app)` gate actually re-renders
  - Files: `apps/mobile/features/auth/hooks.ts`
  - Change: `onSuccess: () => qc.clear()` → `onSettled: () => qc.resetQueries()`
  - Rationale: TanStack Query v5 `queryClient.clear()` destroys queries but does NOT notify active `QueryObserver` subscribers, so `useMe()` in `(app)/_layout.tsx` never sees the change and the `Redirect` to `/(auth)/welcome` never fires. `resetQueries()` dispatches state changes → observers notify → React re-renders → gate condition passes → Redirect fires. `onSettled` (vs `onSuccess`) is belt-and-braces so it also fires when `POST /api/auth/sign-out` throws (offline, unreachable, server 5xx) — `signOutRequest`'s `finally` block already wiped local tokens either way.
  - Acceptance: `node .mstack/debug/2026-07-13-1053-mobile-signout/specs/repro.test.mjs` (with the assertion updated to match the fixed code path) passes; `pnpm typecheck` clean.
  - Commit: —
  - Notes: —
