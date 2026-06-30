# Implementation report — Expo SDK 55 → 54 downgrade

**Status:** complete
**Started + finished:** 2026-06-23
**Branch:** feat/qa-test-accounts-seed
**Review:** [2026-06-23-expo-sdk-54-downgrade](../../reviews/2026-06-23-expo-sdk-54-downgrade.md)

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Pin expo ~54.0.0 + drop react-native-worklets | ✓ done | `f9627ef` |
| 2 | pnpm install + expo install --fix | ✓ done | `0561838` |
| 3 | Verify app.config.ts is SDK-54-compatible | ✓ done | no commit (byte-identical) |
| 4 | Runbook entry — SDK pin change | ✓ done | `27d2aa9` |
| 5 | Roadmap entry + decision log | ✓ done | `39a2ffb` |
| 6 | FORK_CHECKLIST note | ✓ done | `df7b335` |

5 commits + the precursor; T3 was a no-op verification (the
review allowed byte-identical as an acceptance outcome).

## Commits

Precursor:
- `3296dd1` docs(mstack): SDK 54 downgrade plan + review

Implementation:
- `f9627ef` build(mobile): pin expo to ~54.0.0 + drop react-native-worklets
- `0561838` build(mobile): expo install --fix → SDK 54-aligned peer versions
- `27d2aa9` docs(operations): runbook — SDK 54 pin + version policy
- `39a2ffb` docs(roadmap): SDK 54 downgrade + 3 new decision entries
- `df7b335` chore(checklist): note SDK 54 pin + never-hand-pick rule

## What shipped

`apps/mobile/` is now on Expo SDK 54 end-to-end. `expo install --fix`
rewrote every Expo-curated peer to the SDK 54-aligned version per
`bundledNativeModules.json`:

- `expo: ~54.0.0` (was ~55.0.23)
- `expo-router: ~6.0.24` (was ~55.0.14)
- `@expo/metro-runtime: ~6.1.2` (was ~55.0.11)
- `react: 19.1.0` (was 19.2.0)
- `react-native: 0.81.5` (was 0.83.6)
- Every other `expo-*` peer rolled back to its pre-version-alignment
  release line.
- `expo-notifications` stays on the `~0.32.x` line — which is the
  one SDK 54 actually ships (and what F21 T12 accidentally pinned
  thinking it was SDK 55).
- `react-native-worklets` direct dep dropped; reanimated 4.1.7's
  peer range (0.5 – 0.8) is satisfied by the existing 0.7.4 hoist.
- `app.config.ts` byte-identical — every SDK-sensitive field has
  stable syntax across both majors.
- Workspace types unified via root `pnpm.overrides` forcing
  `@types/react@~19.1.17` + `@types/react-dom@~19.1.11` everywhere.
  `@base-ui/react`'s `^19.2` peer-dep wanted a higher version; the
  override sidesteps it without affecting runtime.

## Verification done

- `pnpm install` completed clean.
- `pnpm --filter @aira/mobile typecheck` — green.
- `pnpm --filter @aira/mobile lint` — green (no new violations from
  the eslint-config-expo `~10.0.0` swap).
- `pnpm --filter @aira/web typecheck` — green after the pnpm.overrides
  for `@types/react`.
- F21 push code (`apps/mobile/lib/push.ts`, the pre-prompt modal,
  the layout gate, the account-hub row) all typecheck against the
  resolved `expo-notifications` version with no API drift.
- Pre-commit hooks (check-contrast, check-migrations,
  check-no-server-actions, check-mobile-tailwind) passed on every
  commit.

## Real finding surfaced during review

F21 T12 (2 hours earlier the same day) manually pinned
`expo-notifications: ~0.32.13` for SDK 55. SDK 55's
`bundledNativeModules.json` actually wants `~55.0.22` — the
version-aligned release where `expo-*` packages adopt the SDK
major as their major. pnpm happily resolved the wrong line; the
F21 code worked because the `~0.32.x` API surface was the same
either way. The downgrade was the natural moment to expose the
mistake: SDK 54 wants `~0.32.x` and so the pin "becomes correct"
without us touching the version string — just because the SDK
caught up to where the line was already pointing.

Locked policy in the decision log + the runbook + the
FORK_CHECKLIST: never hand-pick a peer version; `expo install
--fix` is the only authoritative resolver.

## Deviations from the review

1. **Workspace `@types/react` cohesion via `pnpm.overrides`.** The
   review's T2 anticipated peer-dep moves but didn't anticipate
   `@base-ui/react`'s hard-pinned `@types/react@^19.2` peer
   conflicting with the SDK 54-aligned `~19.1.17`. The override
   was the cleanest fix; web's `@types/react` + `@types/react-dom`
   pins were tightened to match. Captured in the T2 commit message
   + roadmap decision log.

## Operational follow-ups

- **EAS production rebuild + submit (mandatory before push works on
  real devices).** The next `eas build --profile production
  --platform all` + `eas submit` ships both the SDK 54 native
  runtime AND F21's `expo-notifications` config-plugin. The previous
  TestFlight + Play Internal Testing builds (SDK 55) become orphan;
  no real-device user impact since there are no testers on them
  yet.
- **No marketing version bump.** `version` stays at `0.1.0` per the
  locked Q1 decision. The OTA cohort split was unnecessary with
  zero real-device users; the next ship is a clean cut.
- **TODO: dedicated "SDK pin management" doc.** Runbook now has a
  short "SDK pin policy" section; a longer companion doc for the
  next fork's upgrade/downgrade flow is on the deferred list.

## Recommended next step

Reload Expo Go on your phone, scan the QR from `pnpm --filter
@aira/mobile start`, and confirm the welcome / sign-in flow paints
without an "incompatible version" interstitial. After that, the
F21 mobile flows (pre-prompt, registration utility, account-hub
row) are exercisable in Expo Go for everything that doesn't need
the native `expo-notifications` runtime — for which the EAS
production rebuild is the path.
