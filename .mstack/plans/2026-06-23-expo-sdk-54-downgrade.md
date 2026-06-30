# Plan: Expo SDK 55 → 54 downgrade

**Date:** 2026-06-23
**Slug:** 2026-06-23-expo-sdk-54-downgrade
**Status:** implemented
**Author:** framer@millionlabs.co.uk

---

## Problem

The AIRA mobile app was pinned to Expo SDK 55 during the S0 EAS init
on 2026-06-23. Loading the dev server via Expo Go (the standard
free-iteration client on the App Store / Play Store) now errors with
"incompatible version" because the publicly-published Expo Go ships
SDK 54 today. The team's iteration loop — open dev server, scan QR,
land on a hot-reloaded screen — is broken.

The team prefers staying on the SDK Expo Go ships rather than
building + sideloading a custom Dev Client. Their reasoning, locked
as a feedback memory: "Expo go offer great support while we test
things quickly." The scan-the-QR loop is faster than a Dev Client
rebuild every time a native dep changes, and SDK 54 has no
feature gap blocking AIRA's MVP scope (F21 push broadcasts uses
permission + token APIs that have been stable across SDKs 51–55).

Success: `pnpm --filter @aira/mobile start` boots, the QR loads in
Expo Go, and the app renders the welcome / sign-in flow without an
"incompatible version" interstitial. F21 push registration code
continues to compile and run on SDK 54.

Beneficiary: the AIRA dev team during the S6 / S7 iteration window.
Real-device push testing still requires the EAS production rebuild
that's already in the S0 follow-ups; this plan unblocks day-to-day
development *separately*.

## Scope

**In:**

- Downgrade every `expo` + `expo-*` package in
  `apps/mobile/package.json` to the SDK 54-aligned version that
  `npx expo install --fix` resolves.
- Downgrade `react-native`, `react`, `react-dom`,
  `react-native-gesture-handler`, `react-native-reanimated`,
  `react-native-safe-area-context`, `react-native-screens`,
  `react-native-svg`, `react-native-web`,
  `@expo/metro-runtime`, `@expo/vector-icons`,
  `eslint-config-expo`, `jest-expo`, `@types/react` to the
  SDK 54-compatible versions Expo's expo install resolves to.
- Drop the explicit `react-native-worklets` direct dep — SDK 54's
  reanimated 3.x doesn't peer-dep onto it. Locked Q3 in review prep.
- Keep `whatwg-fetch` direct dep + `apps/mobile/.npmrc` +
  workspace-root `.npmrc` `node-linker=hoisted` workarounds
  untouched — locked Q2 in review prep, low-risk, may still be
  needed.
- Refresh `pnpm-lock.yaml`.
- Verify `pnpm --filter @aira/mobile typecheck` is green.
- Verify the existing F21 mobile code (push utility, pre-prompt
  modal, layout gate, account-hub row) still compiles unchanged.
- Update `apps/mobile/app.config.ts` only if SDK 54 requires a
  different config-plugin syntax for any registered plugin
  (`expo-router`, `expo-font`, `expo-secure-store`,
  `expo-image-picker`, `expo-notifications`). Likely no change.
- Roadmap callout: update the "What's pending" + the off-roadmap
  F21 entry to flag SDK 55 → 54.
- Runbook update at `docs/operations/eas-build-runbook.md`: note
  the SDK pin change so the next person reaching for `eas build`
  ships the right native runtime.

**Out (deferred):**

- Marketing `version` bump (0.1.0 → 0.2.0). Locked Q1 in review
  prep — no real-device users yet, no OTA-cohort split needed.
  Stays on 0.1.0.
- Removing the `whatwg-fetch` direct dep / `.npmrc` hoist config.
  Locked Q2 — low-risk to keep, debug detour to clean-test now.
- EAS production rebuild + submit. Already an S0 follow-up because
  of F21's `expo-notifications` plugin add (a native-code change);
  the user runs `eas build --profile production --platform all` +
  `eas submit` after this downgrade lands. The downgrade
  determines which SDK that rebuild ships; the rebuild itself is
  out of scope for this plan.
- F21 mobile code changes. The push registration utility +
  pre-prompt + layout gate + account-hub row all use API surface
  that's stable across SDKs 51+. No code changes expected.
- Web app (`apps/web`) and packages (`packages/*`) — unaffected by
  the SDK pin.
- React Native New Architecture toggle. SDK 54 + 55 both support
  it, but AIRA hasn't opted in (no `newArchEnabled` in
  `app.config.ts`). Out of scope.

## Approach

**Use `npx expo install --check` + `npx expo install --fix` to drive
the version resolution.** Expo ships a curated list of SDK-version
pairings (the `bundledNativeModules.json` in the Expo CLI) and the
`expo install --fix` command rewrites every Expo-managed dep to the
exact version that ships with the active `expo` major. This is the
standard MLabs-aligned approach to SDK changes — don't hand-pick
versions, defer to the official Expo resolver.

Concretely:

1. Edit `apps/mobile/package.json` to set `expo: ~54.0.x` directly
   (pick the latest patch — likely `~54.0.x` from
   <https://github.com/expo/expo/releases>).
2. Drop the `react-native-worklets` direct dep from the same file.
3. Run `pnpm install --filter @aira/mobile` to refresh the lockfile
   with the new Expo major in place.
4. Run `pnpm --filter @aira/mobile exec expo install --fix` —
   this rewrites every `expo-*`, `react-native`, `react`,
   `react-native-*` peer-dep into the SDK 54-aligned version.
5. Re-run `pnpm install` to sync the workspace lockfile.
6. Run `pnpm --filter @aira/mobile typecheck` to verify.
7. Run `pnpm --filter @aira/mobile start` locally to confirm the
   Metro bundle boots; spot-check the welcome / sign-in flow on
   Expo Go.

The `expo-notifications` resolution will go from `~0.32.x`
(SDK 55) to whatever ships with SDK 54 — likely `~0.31.x` based on
the standard one-major-back pattern. The F21 implementation uses
`getPermissionsAsync` / `requestPermissionsAsync` /
`getExpoPushTokenAsync` which have been stable across versions;
no API changes expected.

The `whatwg-fetch` + `.npmrc` workarounds stay because they're a
pnpm-isolated-store quirk, not a SDK-version quirk. If SDK 54
happens to resolve cleanly without them, we discover that during
the EAS production rebuild post-downgrade; not worth a clean-test
detour during the local fix.

**Alternatives considered:**

- **Build a custom Dev Client** (`eas build --profile dev --platform
  android` produces an APK; `pnpm start --dev-client` connects).
  Rejected per user preference — Dev Client adds a build + sideload
  cycle every time a native dep changes, which costs more than the
  one-time downgrade.
- **Use `expo-doctor` to find SDK pinning issues + leave the major
  alone.** Doesn't address the underlying mismatch — Expo Go is
  pinned to one SDK and won't run our app at all on SDK 55. Doctor
  fixes peer-dep issues *within* a SDK, not cross-SDK
  compatibility.
- **Hand-pick each `expo-*` version from npm without the resolver.**
  Slower + error-prone; the Expo resolver knows which patch on each
  package was QA'd against the SDK major. Picking a stray patch
  risks subtle runtime breakage that wouldn't surface until a real
  device run.
- **Migrate to a different mobile stack** (bare React Native, no
  Expo). Not in scope at any conceivable horizon — Expo is locked
  for the AIRA fork. Mentioned only to close it off.

## Data model changes

None. This is a build-toolchain / dep change. No schema, no
migration, no DB columns touched.

## Files to touch

**New:**

- None.

**Edit:**

- `apps/mobile/package.json` — flip `expo` to `~54.0.x`; drop the
  explicit `react-native-worklets` line; let `expo install --fix`
  rewrite every other Expo-curated peer.
- `pnpm-lock.yaml` — regenerated by `pnpm install`.
- `apps/mobile/app.config.ts` — likely no changes; verify
  `plugins[]` entries still resolve under SDK 54. The
  `expo-notifications` plugin entry stays — it works on both
  majors with the same signature.
- `docs/operations/eas-build-runbook.md` — small "SDK pin"
  note. The S0 runbook section says SDK 55; flip to 54 with a
  one-liner explaining the why (Expo Go iteration speed).
- `roadmap.md` —
  - "Last updated" line gains a 2026-06-23 SDK-downgrade callout.
  - New off-roadmap entry "Post-S6 — Expo SDK 54 downgrade
    (2026-06-23)" capturing the reasoning + the linked decision.
  - Decision-log entry: SDK 54 pinned, why, what it costs (no
    SDK 55-only features).
- `FORK_CHECKLIST.md` — the recommended SDK is referenced in the
  S0 follow-ups; small note that the AIRA fork is on 54 deliberately.

## Edge cases

- **`expo install --fix` proposes a non-obvious major bump for a
  peer dep.** Walk the diff; if any peer goes BACKWARDS by more
  than one major from the current pin (e.g. `react-native-svg`
  from 15 → 13), pause and surface to the user. The expected
  flow is a small downgrade (one major or one minor) across all
  peers.
- **`react-native-worklets` removal triggers a runtime warning on
  Metro start.** Reanimated 3.x (SDK 54) initializes its own
  worklets runtime — no separate package needed. If Metro warns
  about a missing dep, it means reanimated 3 wasn't resolved (so
  expo-install failed silently); re-run `expo install --fix`.
- **`expo-notifications` API drift between 0.32 (SDK 55) and 0.31
  (SDK 54).** Reviewer should grep `apps/mobile/lib/push.ts` for
  the three Notifications API calls and verify the function
  signatures in the resolved SDK 54 version match. They've been
  stable since SDK 49; very low risk.
- **TypeScript compile drift from React 19 → React 18.x.** SDK 54
  ships with React 18.3.x, SDK 55 ships with 19.x. If a custom
  hook or component in `apps/mobile/` uses a React 19-only API
  (`use(...)`, action transitions in the new form), the
  typecheck will catch it. AIRA's mobile code is small enough
  that walking the typecheck failures is fast.
- **`react-native-gesture-handler` major change.** SDK 54 ships
  `~2.20.x` vs SDK 55's `~2.30.x`. Internal API differences are
  rare at the `~2.x` level; the consumers in
  `apps/mobile/components/` use the public `GestureHandlerRootView`
  + `gestureHandlerRootHOC` surface which is stable. Verify on
  typecheck.
- **`react-native-reanimated` major change** (4.x → 3.x). Used
  inside `nativewind`'s style derivation. Nativewind 4.1.23
  declares peer support for reanimated 2 + 3 + 4, so the downgrade
  is safe. Re-test the styled components after the typecheck.
- **`@expo/metro-runtime` resolution still needs `whatwg-fetch` +
  `.npmrc` hoist on SDK 54.** Acceptable if so; both workarounds
  stay. If SDK 54 resolves cleanly without them, that's a free
  win discovered during the EAS production rebuild — not a
  blocker for this plan.
- **`jest-expo` major version mismatch.** Jest itself doesn't run
  in CI for the mobile module (`test` script just echoes); the
  mismatch is cosmetic but `expo install --fix` will sync it
  anyway.
- **`eslint-config-expo` rule changes.** SDK 54's lint config may
  flag patterns SDK 55's didn't (or vice versa). Run
  `pnpm --filter @aira/mobile lint` after the downgrade; if a
  new rule fires on existing code, decide per-rule whether to
  disable or fix.

## Acceptance criteria

- [ ] `apps/mobile/package.json` shows `expo: ~54.0.x` and every
      `expo-*` peer on a SDK 54-aligned version.
- [ ] `react-native-worklets` is no longer listed in
      `apps/mobile/package.json` dependencies.
- [ ] `whatwg-fetch` direct dep + `.npmrc` `node-linker=hoisted`
      workaround are unchanged.
- [ ] `apps/mobile/app.config.ts` has no functional changes
      (plugins[], runtimeVersion, ios/android blocks all
      identical) — or each change is justified inline in the
      review.
- [ ] `pnpm install` completes clean (no resolution errors, no
      unmet peer-dep warnings beyond what was present pre-change).
- [ ] `pnpm --filter @aira/mobile typecheck` passes.
- [ ] `pnpm --filter @aira/mobile lint` passes (or new violations
      surfaced + resolved during the run).
- [ ] `pnpm --filter @aira/mobile start` boots Metro without
      error. The QR loads in Expo Go without an "incompatible
      version" interstitial.
- [ ] The F21 push registration code at `apps/mobile/lib/push.ts`,
      `apps/mobile/components/NotificationsPrePrompt.tsx`,
      `apps/mobile/app/(app)/_layout.tsx`,
      `apps/mobile/app/(app)/profile.tsx` typechecks against the
      downgraded `expo-notifications` version.
- [ ] `roadmap.md` carries a callout noting the SDK 55 → 54 change
      and the decision rationale; decision log gains a new entry.
- [ ] `docs/operations/eas-build-runbook.md` and
      `FORK_CHECKLIST.md` reference SDK 54.

## Open questions

For `/mlabs-review` to resolve before implementation:

- **Q1 (LOCKED in pre-review consultation):** Marketing version
  stays `0.1.0` (no 0.2.0 bump). User answer: no real-device
  users yet, OTA cohort split is unnecessary.
- **Q2 (LOCKED in pre-review consultation):** `whatwg-fetch` +
  `.npmrc` workarounds remain untouched. User answer: keep both,
  avoid Metro-debug detour.
- **Q3 (LOCKED in pre-review consultation):** `react-native-worklets`
  direct dep gets dropped. User answer: it was a SDK 55-specific
  reanimated 4 peer; reanimated 3 (SDK 54) doesn't need it.
- **Q4 — Should the `dev` build profile in `apps/mobile/eas.json`
  reference a different EAS Update channel after the SDK change?**
  Currently `channel: "dev"`. Probably no — channels are
  orthogonal to SDK majors; the same `dev` channel serves SDK 54
  development builds going forward. Reviewer confirms.
- **Q5 — Does `npx expo install --fix` produce a clean diff, or
  does it propose a peer-dep bump that doesn't align with one of
  the workspace's other constraints?** Reviewer should walk the
  `expo install --fix` output before approving the implementation
  plan. If a peer goes more than one major backwards, surface as
  a Concern.
- **Q6 — Does the runbook need a "how to downgrade SDK" section
  for the next fork?** Probably a one-paragraph addendum is enough;
  the answer is "edit expo + run expo install --fix." Reviewer
  decides scope.
