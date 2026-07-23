# Release — ota (shipped) 2026-07-22 18:16

**App:** AIRA (`com.airabynisarga.app`) · **Platform:** both · **Channel/profile:** production
**Mode:** ota
**Status:** shipped
**Versions:** version `0.1.1` · runtime `0.1.1`
**Commit:** `a916fd5` (tip at publish: `2590e02c*` — includes the auto-checkpoint marker Expo adds)
**Update group ID:** `436f4b58-f0c8-4718-842c-54730bb11b62`
**iOS update ID:** `019f8b1f-b77f-7bc6-882f-fca6cf00c428`
**Android update ID:** `019f8b1f-b77f-7dfc-8e05-b1c990382c06`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/436f4b58-f0c8-4718-842c-54730bb11b62

## Preflight — corrected

Initial preflight incorrectly flagged runtime drift after reading only 3 rows
from `eas update:list` (which happened to show the last two `0.1.0`
OTAs) and never checking `eas build:list`. Corrected read of both:

| Native builds | Runtime | Created |
|---|---|---|
| Build 8 (iOS + Android) | **0.1.1** | 2026-07-14 |
| Build 7 iOS / 6 Android | 0.1.0 | 2026-07-06 / 2026-06-30 |

| OTAs on `production` (newest first) | Runtime | When |
|---|---|---|
| session sweep: sidebar tier2 + 12px + back-nav fix | **0.1.1** | 2 days ago |
| TopBar consistency + tree-of-life logo (0.1.0 OTA) | 0.1.0 | 1 week ago |
| drawer + all-listings + origin-aware nav + composer sheet | 0.1.0 | 1 week ago |

Real state: build 8 is the current store build on runtime `0.1.1` and has
already received an OTA on `0.1.1`. The `version: "0.1.1"` in the repo IS
coherent with what users have. No override needed.

| Check | Result | Evidence |
|---|---|---|
| EAS auth | ✅ pass | `vinod@millionlabs.co.uk` (owner: vb-mlabs, dev: million-labs) via `EXPO_TOKEN` |
| Git state | ✅ pass | tree clean |
| Native-diff since last OTA on 0.1.1 | ✅ pass | 4 commits since (`a916fd5`, `ceff44b`, `07526c4`, `2f75373`) — all pure JS |
| Runtime version coherence | ✅ pass | repo `0.1.1` == build 8 runtime `0.1.1` |
| expo-doctor | ⚠️ 3 pre-existing findings | metro config (intentional monorepo override); react duplicated at 19.1.0 + 19.2.4 (transitive via `use-sync-external-store`); patch mismatches (`expo@54.0.35` vs `~54.0.36`, `expo-updates@29.0.18` vs `~29.0.19`). None new since the last OTA landed successfully |

## Decision

OTA on runtime `0.1.1`. Native binaries in users' hands (build 8) are
compatible; the changes are JS-only.

## Execution log

- `pnpm dlx eas-cli update:list --branch production --limit 10` — enumerated
  recent OTAs; confirmed most recent is on `0.1.1`.
- `pnpm dlx eas-cli build:list --status finished --limit 15 --json` —
  confirmed build 8 on runtime `0.1.1` (2026-07-14, both platforms).
- User confirmed OTA-to-0.1.1-only strategy.
- `EAS_PROJECT_ID=21065081-2afd-43d4-aef7-7ce10de55a8b pnpm dlx eas-cli update --branch production --message "category name display + subcategory sheet title + back-nav dismissTo fix (a916fd5)"`
  from `apps/mobile/`. Non-interactive EAS_PROJECT_ID env var was required
  because the CLI in `pnpm dlx` doesn't detect the project link the same way
  interactive-mode does. Ran ~90s (bundle + fingerprint + upload + publish).
- Published as update group `436f4b58-f0c8-4718-842c-54730bb11b62`.

## Sources

- EAS docs — Runtime Version + appVersion policy: https://docs.expo.dev/eas-update/runtime-versions/ — checked 2026-07-22.

## Follow-ups

- **Monitor** — `expo.monitoring: "none"` in mstack config. This OTA
  shipped without Sentry crash reporting. Watch rule is manual: if any
  user reports "app broken" in the next few hours, roll back with
  `eas update:republish` targeting the prior `0.1.1` update group.
- Address pre-existing doctor findings in a follow-up branch: dedupe
  react (pin `use-sync-external-store` resolution), bump `expo` +
  `expo-updates` to the recommended patches, review the metro config
  override comment.
- Users still on native build 6/7 (runtime `0.1.0`) did NOT receive this
  update. Their last OTA was 1 week ago. Consider a second OTA with
  `--runtime-version 0.1.0` if store-adoption data shows a meaningful
  0.1.0 population still active.
- The self-correction on preflight (build-list wasn't queried initially)
  suggests updating the mstack-expo skill's preflight checklist to
  explicitly require `build:list` alongside `update:list` when reasoning
  about runtime coherence. Captured for the skill maintainer.

## Rollback path

If a regression surfaces:
```
cd apps/mobile
EAS_PROJECT_ID=21065081-2afd-43d4-aef7-7ce10de55a8b \
  pnpm dlx eas-cli update:republish \
  --branch production \
  --group 336c9ce0-29e9-467e-a75d-cbb0a92c350e
```
The prior known-good `0.1.1` update group is
`336c9ce0-29e9-467e-a75d-cbb0a92c350e` (2 days ago, "session sweep: sidebar
tier2 texture + 12px floor + back-nav fix"). Verify the exact CLI syntax
against live docs before running — the rollback command has changed
between CLI versions.
