# Review: Expo SDK 55 → 54 downgrade

**Date:** 2026-06-23
**Slug:** 2026-06-23-expo-sdk-54-downgrade
**Plan reviewed:** [2026-06-23-expo-sdk-54-downgrade.md](../plans/2026-06-23-expo-sdk-54-downgrade.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Plan approved. Approach is sound: defer the version resolution to
`npx expo install --fix` against an SDK 54-pinned `expo`, rather than
hand-picking peer versions. Three Q&A locked during pre-review
consultation (no marketing version bump; keep `whatwg-fetch` +
`.npmrc` workarounds; drop the explicit `react-native-worklets`
dep). Review surfaced one real finding worth flagging — the current
`expo-notifications: ~0.32.13` pin does NOT match SDK 55's bundled
expected version (`~55.0.22`), meaning F21 T12 installed the
pre-version-alignment release. The downgrade is the natural moment
to let `expo install --fix` re-align to whatever SDK 54 actually
bundles. Six tasks, ordered so each commit leaves the tree green.
UI-Significant **no** — every file touched is package config,
runbook, or doc.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** F21 T12 added `expo-notifications: ~0.32.13` to
  `apps/mobile/package.json` for SDK 55. Verified via
  `node_modules/expo/bundledNativeModules.json` that SDK 55 actually
  bundles `expo-notifications: ~55.0.22` (the version-aligned
  release where `expo-*` packages adopt the SDK major as their major).
  The current `~0.32.x` pin is from the pre-alignment release line.
  pnpm resolved it to `0.32.17` and the F21 code happens to work
  there, but it was never the version SDK 55 wanted.

  **Decision:** Don't try to "fix it forward" by manually picking
  the SDK 55 version. Just let `expo install --fix` resolve to the
  SDK 54-aligned version after the `expo` downgrade lands. The same
  reasoning applies — defer to the Expo resolver. Log the finding
  in the implementation report so we don't repeat the same picking
  error on the next dep.

- **Concern:** SDK 55's `bundledNativeModules.json` lists
  `react-native-worklets: 0.7.4`, meaning SDK 55 explicitly bundles
  it (because reanimated 4.x peer-deps onto it). If SDK 54 ALSO
  bundles it (reanimated 4 landed before SDK 54 was finalized),
  the plan's instruction to drop the dep would be wrong — `expo
  install --fix` would silently re-add it.

  **Decision:** Drop the explicit pin as the plan states. Run
  `expo install --fix` afterwards. If `--fix` re-adds
  `react-native-worklets` (which means SDK 54 needs it), accept
  the re-added version and note it in the commit message. T2's
  acceptance criterion checks for both states — re-added is fine,
  silently kept at the old `^0.7.4` would be wrong.

- **Concern:** Plan's Q5 ("does `expo install --fix` produce a
  clean diff?") is a code-time check, not a planning-time decision.
  Hoisting it to a planning question over-asks the reviewer.

  **Decision:** Move Q5 to T2's **Pause if** trigger: if `expo
  install --fix` proposes a peer-dep change MORE than one major
  backwards (e.g. `react-native-svg` 15.x → 13.x), pause and
  surface the diff before continuing. Single-major moves are
  expected and continue without interruption.

### Suggestions (taken or deferred)

- **Suggestion (taken):** Reorder the tasks so the runbook +
  roadmap doc updates land AFTER the package change + lockfile
  refresh, not interleaved with them. Reasoning: the docs should
  reference the actual landed versions (visible in `package.json`
  after T2), not the planned versions. Plan ordered them roughly
  right; explicit task numbers below confirm.
- **Suggestion (taken):** Add `pnpm --filter @aira/mobile lint` to
  the acceptance gate. SDK 54 ships a different
  `eslint-config-expo` major; new lint rules might fire on
  existing F21 code. T2's acceptance now includes lint.
- **Suggestion (deferred):** Q6 — "should the runbook gain a
  'how to downgrade SDK' section for future forks?" Defer to a
  small follow-up. The runbook already has the build steps; a
  separate "SDK pin management" section would be a clean addition
  but isn't urgent. Captured as a TODO line in the runbook update
  (T5).
- **Suggestion (deferred):** Q4 — "should the EAS `dev` channel
  rename after the SDK change?" No — EAS Update channels are
  SDK-independent. The same `dev` channel serves both SDK 54
  and any future SDK 55 builds without overlap. No change needed.
- **Suggestion (taken):** Add an explicit "verify F21 push code
  still compiles" gate. T2's typecheck covers this implicitly,
  but a separate acceptance line on T3 ("F21 push code at
  `apps/mobile/lib/push.ts` + components typechecks against the
  resolved `expo-notifications` version") makes the regression
  signal explicit.

## Decisions locked

Net new decisions made during review (beyond the plan's
pre-locked Q1/Q2/Q3):

1. **`expo-notifications` version policy** — never hand-pick;
   always defer to `expo install --fix`. The current SDK 55 pin
   was wrong; the SDK 54 pin will be whatever `--fix` proposes.
2. **`react-native-worklets` drop is best-effort** — drop
   explicitly, let `--fix` re-add if SDK 54 actually needs it.
3. **`expo install --fix` peer-dep moves** — single-major
   backwards is automatic; more-than-one-major is a Pause-if
   trigger.
4. **EAS Update `dev` channel** — unchanged. Channels are
   SDK-independent.
5. **Runbook "SDK pin management" section** — deferred to a
   follow-up; T5 leaves a TODO line referencing this decision.

## Implementation plan

Six atomic tasks. Order leaves the codebase in a working state
between tasks.

### Task 1: Pin expo to ~54.0.x + drop react-native-worklets

- **Files:**
  - `apps/mobile/package.json` (edit)
- **What:** Edit two lines:
  - `expo: ~55.0.23` → `expo: ~54.0.0` (the latest patch on the
    54 major; `expo install --fix` in T2 will resolve to the
    actual current patch).
  - Remove the `react-native-worklets: ^0.7.4` line entirely
    from `dependencies`. Don't touch any other line.
- **Acceptance:**
  - Diff is exactly two lines (one edit, one delete).
  - Every other `expo-*` package, every `react-native*` package,
    and every other dep line is byte-identical to the pre-edit
    state.
  - File is still valid JSON.

### Task 2: pnpm install + expo install --fix

- **Files:**
  - `apps/mobile/package.json` (edit — rewritten by `expo install --fix`)
  - `pnpm-lock.yaml` (edit — regenerated)
- **What:**
  1. Run `pnpm install --filter @aira/mobile` to bring in the
     SDK 54 base.
  2. Run `pnpm --filter @aira/mobile exec expo install --fix`.
     This rewrites every Expo-curated peer to the SDK 54-aligned
     version per `bundledNativeModules.json`. Includes
     `react-native`, `react`, `react-dom`,
     `@expo/metro-runtime`, `@expo/vector-icons`,
     `expo-notifications` (the version-aligned release this
     time), `expo-router`, every other `expo-*`, every
     `react-native-*` peer, and `react-native-worklets` IF SDK 54
     bundles it.
  3. Re-run `pnpm install` to sync the workspace lockfile.
  4. Walk the `package.json` diff and the lockfile change summary;
     spot-check no peer moved more than one major backwards.
- **Acceptance:**
  - `pnpm install` completes with no resolution errors.
  - `pnpm --filter @aira/mobile typecheck` passes.
  - `pnpm --filter @aira/mobile lint` passes (or new lint
    violations are addressed in-task).
  - F21 push code at `apps/mobile/lib/push.ts`,
    `apps/mobile/components/NotificationsPrePrompt.tsx`,
    `apps/mobile/app/(app)/_layout.tsx`,
    `apps/mobile/app/(app)/profile.tsx` typechecks against the
    resolved `expo-notifications` version. Any compile errors
    from `expo-notifications` API drift are fixed in this task.
  - `whatwg-fetch` direct dep + `apps/mobile/.npmrc` + workspace
    root `.npmrc` `node-linker=hoisted` workaround all
    untouched.
- **Pause if:**
  - Any peer `react-native-*` dep moves MORE than one major
    backwards (e.g. `react-native-svg` 15 → 13). Surface the diff
    and ask before proceeding.
  - `react-native-worklets` reappears with a major-version change
    away from the dropped `^0.7.4` (e.g. drops to `0.5.x`). Note
    in the commit message + continue; not a true pause but call
    it out.
  - `pnpm --filter @aira/mobile lint` surfaces NEW violations
    in F21-shipped code (not pre-existing). Fix in-task; if a
    violation can't be resolved without restructuring, pause.
  - `expo-notifications` API used by `lib/push.ts` changed
    signature between the installed version and SDK 54's
    bundled version. Surface the API delta and decide whether
    to adjust `lib/push.ts` or pin to an SDK 54 patch that
    matches.

### Task 3: Verify app.config.ts is SDK-54-compatible

- **Files:**
  - `apps/mobile/app.config.ts` (read; edit only if needed)
- **What:** Walk the file looking for SDK-version-sensitive
  config. Specifically check:
  - `runtimeVersion: { policy: "appVersion" }` — policy syntax
    unchanged between SDK 54 and 55.
  - Every entry in `plugins[]` — each entry is the
    `expo-<name>` plugin which Expo resolves at build time; no
    SDK-pinned syntax in any of them.
  - `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` —
    stable across SDKs.
  - `android.intentFilters` — Universal Link config unchanged.
  - `extra.eas.projectId` — unchanged.
- **Acceptance:**
  - Either the file is byte-identical to its current state
    (most likely outcome), OR each change is justified inline in
    the commit message with the SDK 54 doc reference that
    forced it.

### Task 4: Runbook entry — SDK pin change

- **Files:**
  - `docs/operations/eas-build-runbook.md` (edit)
- **What:** Add a short section noting:
  - 2026-06-23 — SDK pinned to 54 (was 55) to align with the
    publicly-shipped Expo Go iteration loop. User preference;
    reason captured in the feedback memory.
  - All `expo install --fix` outputs the SDK 54-bundled versions
    automatically — never hand-pick a peer-dep version.
  - The next EAS production build pipeline (`eas build --profile
    production --platform all` + `eas submit`) will ship SDK 54
    natively; the SDK 55 production builds already on TestFlight +
    Play Internal Testing become orphaned. No user impact (no
    real-device testers yet).
  - TODO: "SDK pin management" section — how to downgrade /
    upgrade an SDK across the workspace, in one place. Deferred
    to a small follow-up.
- **Acceptance:**
  - Section appears under the existing runbook structure.
  - References the feedback memory by filename.
  - References the deferred "SDK pin management" follow-up.

### Task 5: Roadmap entry + decision log

- **Files:**
  - `roadmap.md` (edit)
- **What:** Three additions:
  - "Last updated" header gains a 2026-06-23 SDK-downgrade
    callout.
  - New off-roadmap entry under the existing 2026-06-23 cluster:
    "Post-S6 — Expo SDK 54 downgrade (2026-06-23)" explaining
    the why (Expo Go iteration speed), what changed (every
    `expo-*` peer dropped one major; `react-native-worklets`
    removed; `expo-notifications` re-aligned to SDK 54's bundled
    version), and the EAS-rebuild-required note.
  - Decision-log entry: "AIRA mobile pinned to Expo SDK 54
    (not 55). *Why:* the publicly-shipped Expo Go on App
    Store + Play Store tracks one SDK; matching that SDK is
    the fastest iteration loop. User explicitly preferred this
    over a custom Dev Client. Trade-off: AIRA misses any SDK
    55-only feature (currently none affecting MVP scope).
    Re-evaluate when SDK 56 ships and Expo Go updates."
- **Acceptance:**
  - All three appear; no other roadmap content rewritten.

### Task 6: FORK_CHECKLIST note

- **Files:**
  - `FORK_CHECKLIST.md` (edit)
- **What:** Short addition under the S0 / EAS section noting the
  AIRA fork is on SDK 54 deliberately, and that future forks
  should match the Expo Go-shipping SDK (currently 54) unless
  there's a specific feature need from a higher SDK. Cross-link
  to the runbook + decision log.
- **Acceptance:**
  - One short addition (≤3 lines or one bullet) lands in the
    relevant section.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not
guess.

- None. Q1–Q3 locked in pre-review consultation; Q4–Q6 locked
  during review. The single live ambiguity (peer-dep moves >1
  major backwards) is captured as T2's `Pause if` trigger.
