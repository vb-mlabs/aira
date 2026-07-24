# Release — ota (shipped) 2026-07-24 09:21

**App:** AIRA (`com.airabynisarga.app`) · **Platform:** both · **Channel/profile:** production
**Mode:** ota
**Status:** shipped
**Versions:** version `0.1.1` · runtime `0.1.1`
**Commit:** `a8a5658` (tip; Expo checkpoint marker `*` in output)
**Update group ID:** `0be52a62-e88b-4d50-b654-210642c7603e`
**iOS update ID:** `019f9371-eb76-7ca2-816e-6ce284c8c63c`
**Android update ID:** `019f9371-eb76-7c41-b5f0-c271d7a95dae`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/0be52a62-e88b-4d50-b654-210642c7603e

## Preflight

| Check | Result | Evidence |
|---|---|---|
| EAS auth | ✅ pass | `vinod@millionlabs.co.uk` via `EXPO_TOKEN` (session-cached) |
| Git state | ✅ pass | Tree clean apart from `.claude/*` cache noise (untracked, not source) |
| Native-diff since last OTA (`436f4b58` / tip `a916fd5`) | ✅ pass | 5 mobile app files + shared validators/services + generated tailwind. Zero changes to `app.config.ts`, `apps/mobile/package.json`, `apps/mobile/assets/`, or any `packages/*/package.json` |
| Runtime version coherence | ✅ pass | Repo `version: "0.1.1"` in `app.config.ts` == store build 8 runtime `0.1.1` (iOS + Android, submitted 2026-07-14) |
| expo-doctor | ⚠️ 3 pre-existing findings | metro monorepo override (intentional); react duplicate 19.1.0 + 19.2.4 (transitive via use-sync-external-store); expo@54.0.35 vs `~54.0.36` and expo-updates@29.0.18 vs `~29.0.19` patch lag. Same conditions as previous OTA which shipped clean; not release-blockers |

## Decision

OTA on runtime `0.1.1`. All changes are JS/TS + assets + generated
config — no native modules changed, no plugin/permission edits, no
Expo SDK upgrade. Fits the "yes — OTA" row of the decision table.

## Payload (mobile-affecting commits since last OTA)

| Commit | Scope | What |
|---|---|---|
| `b4ac0d3` | mobile | `useMyPostLimits` hook + cap-reached CTA on board + composer screen gate |
| `b72e562` | mobile | Notifications: "Mark all read" label + tappable rows with per-kind routing (`/post/[id]`, `/account/listings`) |
| `84c2128` | web + mobile | Community empty-state prompts + composer copy alignment |
| `a8a5658` | web + mobile | Typography scale bumped one step (`packages/config/src/design.ts` type tokens; mobile picks up via regenerated `apps/mobile/tailwind.config.js`) |
| `efb4e51` | shared validator | `MAX_ACTIVE_POSTS_PER_USER` + `POST_CAP_REACHED_CAPTION` + limits schema — mobile bundles via `@aira/validators` |
| `21c640f` | shared validator | URL + digit-only checks on social fields — mobile bundles via `@aira/validators` |
| `097b099` | shared service | Count-based active-post cap + `getMyPostLimits` — surfaced via server ops the mobile client hits |
| `ac8d884` | server op | New `GET /api/v1/community/posts/limits` endpoint the mobile hook consumes |

Non-mobile commits since last OTA (`8665df7`, `88d2980`, `9e0717e`,
`ac8d884` route-only, plus docs/mstack housekeeping) affect web
only; they bundle transparently into the JS but don't change mobile
behavior.

## Execution log

- `bash resolve-config.sh` — gate `hasExpo: true`, policy `appVersion`, channels `production` + `preview`.
- `pnpm dlx expo-doctor` — 15/18 pass, 3 pre-existing findings (see Preflight table).
- `git log --name-only a916fd5..HEAD | grep mobile` — 5 mobile files + shared package files, no native.
- `pnpm dlx eas-cli build:list --limit 5 --json` (from `apps/mobile/` with `EAS_PROJECT_ID` env) — confirmed build 8 on runtime `0.1.1`.
- User confirmed straight-to-production channel (matches previous release pattern).
- `EAS_PROJECT_ID=… pnpm dlx eas-cli update --branch production --message "…"` from `apps/mobile/` — ran ~90s (bundle + fingerprint + upload + publish). Published as group `0be52a62-e88b-4d50-b654-210642c7603e`.

## Sources

- EAS docs — Runtime Version + appVersion policy: https://docs.expo.dev/eas-update/runtime-versions/ — checked 2026-07-22 (previous release; unchanged).

## Follow-ups

- **Monitor manually** — `expo.monitoring` is still `none`. Watch informal channels for the next few hours. Rollback if any user reports app-broken behavior; the prior known-good group `436f4b58-f0c8-4718-842c-54730bb11b62` (the earlier OTA today) is the target for `eas update:republish`.
- **Type-scale QA on-device** — the typography bump (`a8a5658`) is the largest visible change in this OTA. First-open experience on real devices: check the mobile home tab hero text, listings cards, and account screens for anything that looks jarring at the new sizes. Row heights on `/account/posts` may reflow slightly.
- **Doctor's 3 findings** — pre-existing; carry forward to the next backlog cleanup (add expo/expo-updates patch bump to your dedupe branch when ready). None blocking OTA today.
- **Wire Sentry (still open from prior release)** — TODOS line "Wire Sentry (@sentry/react-native via Expo config plugin) before next native build" hasn't landed. Manual eyes-on stays the only signal until it does.

## Rollback path

If a regression surfaces, republish the last known-good group:

```
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update:republish --branch production \
  --group 436f4b58-f0c8-4718-842c-54730bb11b62
```

Verify the exact CLI syntax against live docs before running — the rollback subcommand has changed between CLI versions.
