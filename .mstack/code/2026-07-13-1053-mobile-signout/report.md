# Run report — mobile sign-out redirect fix

**Status:** complete
**Debug report:** [2026-07-13-1053-mobile-signout](../../debug/2026-07-13-1053-mobile-signout/report.md)
**Branch:** feat/landing-explainer-videos
**Commits:** 1

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Fix `useSignOut()` — `qc.clear()` → `qc.resetQueries()`, `onSuccess` → `onSettled` | ✓ done | 417694f |

## Commits

- **417694f** — `fix(mobile/auth): redirect off (app) tabs after sign-out`

## Verification

- `node .mstack/debug/2026-07-13-1053-mobile-signout/specs/repro.test.mjs` — passes (`✅ Fix verified: sign-out flips the gate observer.`). The same test failed before the change with the assertion `"the (app) gate's useMe observer still reports emailVerified=true"`.
- `pnpm --filter @aira/mobile typecheck` — clean.
- Lefthook pre-commit gates (`check-migrations`, `check-contrast`) — passed.

## Follow-ups (not implemented — flagged for user)

- **Same bug in `useDeleteAccount()`** at `apps/mobile/features/profile/hooks.ts:35-40`. Identical `onSuccess: () => qc.clear()` pattern; same TanStack Query v5 behavior applies. If a user deletes their account, the `(app)` gate will not re-render either. Recommended: apply the same swap (`onSettled: () => qc.resetQueries()`).
- **`deleteAccount()` leaks tokens** at `apps/mobile/features/profile/api.ts:36-38` — never calls `clearTokens()` after the DELETE succeeds. Server-side tokens are already invalidated, so it's not a security hole, but SecureStore stays populated until the app is reinstalled.
- **`Dialog` fires `onConfirm?.()` unawaited** at `apps/mobile/components/ui/Dialog.tsx:67-70`. Any async work in `onConfirm` races with `onClose()`. Not the cause of this bug (the dialog dismissing early is a UX quirk, not a correctness issue), but worth cleaning up when the Dialog gets touched again.

## Recommended next step

Manual QA on Expo Go: sign in → Account → Sign out → confirm → verify the app navigates to `/(auth)/welcome`. If confirmed, consider triaging the two follow-ups above into a small `/mlabs-plan` batch, or bundle the `useDeleteAccount` swap into this branch as a one-liner.
