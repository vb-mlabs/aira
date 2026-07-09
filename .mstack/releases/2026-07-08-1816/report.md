# Release — ota 2026-07-08 18:16 UTC

**App:** AIRA (`aira-mobile`) · **Platform:** iOS + Android · **Branch/channel:** production
**Mode:** ota
**Status:** shipped
**Versions:** version 0.1.0 · runtimeVersion 0.1.0 (policy: appVersion)
**Commit:** c9d4287 (origin/main tip)

**Update group ID:** `c36b46f6-39b9-415e-a0f8-eea5df5117d0`
· iOS update: `019f450a-5107-7431-85fd-c193980cc44e`
· Android update: `019f450a-5107-79b2-a003-642f1286d8b3`
· [EAS Dashboard](https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/c36b46f6-39b9-415e-a0f8-eea5df5117d0)

## Preflight

| Check | Result | Evidence |
|---|---|---|
| 1. expo-doctor | 2 findings (non-blocking) | 16/18 checks pass; failures pre-existing / dev-only |
| 2. Git state | ✓ | On `main`, clean, in sync with origin (`c9d4287`), 0 ahead / 0 behind |
| 3. Versioning coherence | ✓ | `app.config.ts` version=`0.1.0`, runtimeVersion=`{policy: "appVersion"}`; matches build 7's runtimeVersion `0.1.0` |
| 4. Secrets per profile | ✓ (via eas.json literal) | `EXPO_PUBLIC_API_BASE_URL="https://airabynisarga.com"` in `eas.json` `preview`/`production` envs. EAS environment vars empty for both — not required; value is a public URL baked at build time, not a secret. |
| 5. Native-diff | ✓ OTA-safe | Only 4 JS/TS files changed since build 7 (`c4d4312`): `apps/mobile/app/(app)/{_layout.tsx,account/_layout.tsx,account/index.tsx,post/new.tsx}`. No `app.config.ts`, no `apps/mobile/package.json`, no `eas.json`, no Expo SDK change. |
| 6. Store metadata | N/A | OTA mode |

### expo-doctor findings (non-blocking)

**Finding 1 — Metro config overrides.**
`apps/mobile/metro.config.js` has `resolver.disableHierarchicalLookup: true` and non-default `watchFolders`. Intentional monorepo setup (pnpm workspace + Expo autolinking); present at build 7 which shipped fine. Not a regression.

**Finding 2 — Duplicate `react`.**
Top-level `node_modules/react@19.1.0` vs nested `node_modules/use-sync-external-store/node_modules/react@19.2.4`. Introduced this session by `packages/ui-web`'s devDeps (added when scaffolding vitest for the Avatar primitive; test itself was dropped due to a hoisted-pnpm React 19 dedupe wall). **Dev-only.** `packages/ui-web` is web-only; the mobile Metro bundle resolves react from `apps/mobile/node_modules/react@19.1.0`, matching build 7. No runtime effect on the OTA payload. **Must be cleaned up before the next native build** — captured as a follow-up.

## Decision

**OTA safe.** Decision-table row: "JS/TS code, styles, assets, copy → yes — OTA."

User skipped the preview-first safety step and went straight to production (2026-07-08 18:19 UTC) — confirmed via second confirm gate. Production users on build 7 receive the update on next app open.

## Execution log

**Preflight (18:16–18:21 UTC):**
- `git status --short` → clean
- `git rev-list --count HEAD..origin/main` → 0
- `expo-doctor` → 16/18 pass (2 findings above)
- `eas whoami` → `vinod@millionlabs.co.uk` (Owner `vb-mlabs`, Developer `million-labs`)
- `eas build:list --platform ios --limit 15` → build 7 confirmed at `c4d4312` (SDK 54.0.0, appVersion 0.1.0, runtimeVersion 0.1.0, channel production, FINISHED 2026-07-06T19:35Z)
- `eas branch:list` → `production` has updates (last on `cccedbd`), `preview` empty
- `git diff --stat c4d4312..c9d4287 -- apps/mobile/` → 4 JS/TS files, no native changes
- `eas env:list production/preview` → empty (env literal in eas.json, not stored in EAS)

**Publish (18:23 UTC):**
```
cd apps/mobile
npx eas-cli@latest update \
  --branch production \
  --message "mobile account nav: back chevron on account sub-screens + tab-tap reset on Account/Categories/Post" \
  --platform all \
  --non-interactive
```
Result: `✔ Published!` — group `c36b46f6-39b9-415e-a0f8-eea5df5117d0`, runtime 0.1.0, iOS + Android bundles emitted (Hermes bytecode ~3.6 MB each).

## Rollback

Previous known-good update group on the production branch:
- **Group ID:** `28a5a219-4996-4584-88b0-c6d1c6a03109`
- **Message:** "Fix Post composer reload + iOS bottom-sheet presentation" (2026-07-06)
- **Runtime:** 0.1.0 (same as this release — rollback compatible)

Rollback command (verified via `eas update:republish --help`, eas-cli 20.5.1, 2026-07-08):
```
npx eas-cli@latest update:republish \
  --group 28a5a219-4996-4584-88b0-c6d1c6a03109 \
  --branch production \
  --message "rollback: revert account nav OTA" \
  --non-interactive
```

## Watch rule

`expo.monitoring: none` in mstack config — no automated crash-free-sessions signal today. Manual watch: if end-user reports come in within the first hours (broken navigation, app freezes, tab-bar unresponsive on iOS/Android), execute the rollback above. General rule of thumb per skill: crash-free sessions dropping below ~99% in the first hours is the rollback trigger; without monitoring, user-report volume + severity is the proxy signal.

## Sources

- `eas update --help` (eas-cli 20.5.1, checked 2026-07-08): `--branch`/`--message`/`--platform` syntax.
- `eas update:republish --help` (eas-cli 20.5.1, checked 2026-07-08): `--group` selects a specific update group to republish; `--branch` sets destination.
- `eas build:list` + `eas branch:list` + `eas update:list` (checked 2026-07-08): build 7 and previous-update-group metadata.

## Follow-ups

- Clean up `packages/ui-web`'s react@19.2.4 devDep before the next native build (also unlocks the ui-web unit test infra that was deferred in the avatar consolidation).
- Wire Sentry (`@sentry/react-native` via its Expo config plugin) before next native build so post-OTA crash-free sessions can be watched.
- Consider issuing a preview-channel EAS build so future OTAs have a dedicated internal-QA target (currently `preview` branch is empty).
- Radha UAT re-consult: the mobile nav plan reversed part of her 2026-07-06 UAT decision. Confirm the account-only back-chevron restoration is the right call once the OTA reaches her device.
