# Fix — mobile sign-out modal appears to no-op

**Started:** 2026-07-14 (session-continuation)
**Source:** user-report
**Status:** aborted (no code fix needed — device state, not a bug in current source)
**Commit:** —

## Symptom / repro

User reports: on `apps/mobile` /account, tapping "Sign out" opens the confirmation modal → tap confirm → modal closes → user stays on the account screen and remains logged in. Same symptom class as the bug fixed on 2026-07-13 (commit `417694f`).

## Root cause

**Not a code bug.** The current source tree has the correct fix. Investigation:

1. **The hook is correctly wired.** `apps/mobile/features/auth/hooks.ts:54-67` uses `onSettled: () => qc.resetQueries()` — the exact pattern from the 2026-07-13 RCA (queryClient.clear was destroying queries silently, leaving observers with stale snapshots; resetQueries dispatches state changes so the useMe observer in `(app)/_layout.tsx` notifies and the gate re-renders to Redirect).
2. **The confirmation-modal handler is correct.** `apps/mobile/app/(app)/account/index.tsx:240-245` awaits `signOut.mutateAsync()`; the Dialog primitive at `apps/mobile/components/ui/Dialog.tsx:67-77` correctly awaits `onConfirm` before running `finally { onClose() }` (per commit `07b62a3`, "Dialog awaits onConfirm before dismissing").
3. **`signOutRequest` always wipes tokens.** `apps/mobile/features/auth/api.ts:149-165` calls `clearTokens()` in a `finally` so tokens are gone regardless of network outcome.
4. **The auth gate is correct.** `apps/mobile/app/(app)/_layout.tsx:71-74` renders `<Redirect href="/(auth)/welcome" />` on `me.isError || !me.data?.emailVerified`. After `qc.resetQueries()` completes, `useMe`'s refetch hits `/api/auth/get-session` with no bearer → server returns no user → `meRequest` throws → gate flips.

**What's happening on the user's phone:**

- Latest **native production build** (0.1.0) was cut from commit `81973c3` on 6/30, **before** the sign-out fix landed (`417694f` on 7/13). Verified via `git merge-base --is-ancestor 417694f 81973c3` → not an ancestor.
- The fix has been shipped in **two production-channel OTAs**: update group `5cf10c0e` and `50e60d16` (published 5-7 hours ago at runtime 0.1.0). Both include commit `417694f` in their JS bundle.
- Expo's default `checkAutomatically: "ON_LOAD"` means the app checks for updates on launch and applies them on the **next** launch, not the current one. If the user hasn't fully closed the app (swipe out of recents on iOS, force-stop on Android) since the OTA published, they're still running the pre-fix bundle from the 0.1.0 native install.
- The **0.1.1 native build** submitted minutes ago (commit `13abcba`) embeds the fixed bundle directly — no OTA hop needed. Currently processing at Apple/Google.

## Fix

None applied to source. Handoff:

- **Immediate user action:** fully close the mobile app (swipe out of recents on iOS, force-stop on Android) and reopen. The pre-downloaded OTA bundle will apply on the next cold launch, and sign-out will work.
- **Longer-term:** once the 0.1.1 native build clears TestFlight processing (~5-10 min) and Play internal (already live), any tester on 0.1.1 has the fix embedded.

## Evidence

- Read hook — `apps/mobile/features/auth/hooks.ts:54-67` — uses `onSettled: () => qc.resetQueries()` ✓
- Read confirm handler — `apps/mobile/app/(app)/account/index.tsx:240-245` — awaits `signOut.mutateAsync()` ✓
- Read Dialog primitive — `apps/mobile/components/ui/Dialog.tsx:67-77` — awaits `onConfirm` before `onClose` ✓
- Read signOutRequest — `apps/mobile/features/auth/api.ts:149-165` — `clearTokens()` in finally ✓
- Read auth gate — `apps/mobile/app/(app)/_layout.tsx:71-74` — correct Redirect condition ✓
- `git merge-base --is-ancestor 417694f 81973c3` → not an ancestor (fix NOT in 0.1.0 native build)
- `git merge-base --is-ancestor 417694f 18ae33f` (last OTA's cutting commit) → ancestor (fix IS in latest OTAs)
- `npx eas-cli@latest update:list --branch production --limit 3` — confirmed two production OTAs cut post-fix

## Follow-ups

- **Cleanup (not blocking):** Update the stale comment at `apps/mobile/app/(app)/account/index.tsx:242-244` which still references `useSignOut's onSuccess calls qc.clear()` — the actual hook now uses `onSettled + resetQueries`. Doc drift only, no behavior impact. Deferred as a separate polish pass.
