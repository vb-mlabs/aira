# Release — ota 2026-08-04 17:15

**App:** aira-mobile · **Platform:** both · **Channel/profile:** production
**Mode:** ota
**Status:** shipped
**Versions:** version 0.1.2 · build 10 (field) · runtimeVersion `appVersion: 0.1.2`
**Commit:** cd8064b (working tree HEAD at publish time)
**Update Group ID:** `d2d77167-9eb1-45c6-8646-9fddb13b0d34`
**iOS Update ID:** `019fcdcc-36e4-7e43-8c0c-dbba4e8aa2cd`
**Android Update ID:** `019fcdcc-36e4-7b44-a190-47c75b75d9af`
**EAS Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/d2d77167-9eb1-45c6-8646-9fddb13b0d34

## Preflight
| Check | Result | Evidence |
|---|---|---|
| expo-doctor | pass (1 known-benign warning) | 17/18 checks passed. The failure is `metro.config.js` custom `watchFolders` + `resolver.disableHierarchicalLookup: true` — required for pnpm monorepo resolution (documented in the file's own header comment). Unchanged this session and this same config has shipped the last several OTAs. |
| git state | warning: on `feat/business-logo`, 26 commits ahead of `origin/feat/business-logo`, not merged to main | Working tree is clean re. `apps/mobile/` source (only `.claude/`, `.expo/`, `.replit` scratch files modified — none ship in the bundle). User explicitly accepted "OTA now, patch web later" — see Decision below. |
| versioning coherence | pass | `version: "0.1.2"`, `runtimeVersion: { policy: "appVersion" }`, `eas.json.appVersionSource: "remote"`, iOS + Android `autoIncrement: true`. Matches build 10 currently in the field per CLAUDE.md field-state line. OTA will target runtime `0.1.2` by default. |
| secrets per profile | assumed-pass (not re-verified) | Deferred to existing EAS setup. Last OTA (b39cef84, 2026-08-03) shipped successfully with these secrets; nothing this session added a new `EXPO_PUBLIC_*` variable. `.env.production.local` present. Re-verify with `eas env:list --environment production` if any doubt. |
| native-diff check | pass | Delta since last OTA (3c8d1c4 → HEAD) touches only 7 files under `apps/mobile/app/(app)/account/` + `apps/mobile/components/ui/Dialog.tsx` + a devDep line in `apps/mobile/package.json` (`async-limiter` — JS-only workaround for a Metro startup issue, doesn't ship in the bundle). Zero native modules, zero `app.config.ts` changes, zero plugin/permission/entitlement/icon/splash edits, no Expo SDK bump. |
| store metadata | n/a | OTA mode |

## Decision
**OTA safe** per the decision table:
- All 5 payload commits (ed66bbf, c9e43c0, 2b18667, 389b75a, f72604a) are pure JS/TS UI changes in `apps/mobile/app/(app)/account/*` + one primitive extension in `components/ui/Dialog.tsx`.
- `async-limiter` (b857d91) is a devDep for Metro's bundler — not included in the shipped bundle.
- Runtime `0.1.2` matches current build 10 in the field → the OTA will reach every user on that native build.

## Known risk accepted by user
The mobile changes hardcode outbound links to `airabynisarga.com/legal#privacy`, `/legal#terms`, `/legal#deletion`, etc. That `/legal` page lives in commit e8c3366 (this same branch), **not deployed to production web**. Until web ships, users tapping those links get a 404 from the marketing site.

User was surfaced this and chose "OTA now, patch links later." Follow-up: ship web (Vercel deploy of the feat/business-logo merge) as soon as possible after this OTA.

## Payload — commits since last OTA (3c8d1c4)
```
f72604a feat(mobile/account): rich Delete-account dialog with policy link
389b75a feat(mobile/about): platform summary + operator disclaimer + links card
2b18667 feat(mobile/legal): summary + 9 external legal links, drop in-app terms copy
c9e43c0 feat(mobile/privacy): summary + external legal links, drop in-app copy
ed66bbf feat(mobile/account): rename hub labels + add Safety and Help sub-pages
b857d91 chore(mobile): add async-limiter as devDep to unblock expo start
```
(Web-only commits — a5df16d, 89a52e1, 83ead0a, e8c3366, cd8064b — are NOT in the OTA payload; they ship via web deploy separately.)

## Execution log

1. Preflight (see table above) — GO with two accepted risks recorded (branch not on main; web /legal not yet deployed).
2. User confirmed straight-to-production (skipped preview channel).
3. User confirmed the exact command via a final gate.
4. Ran:
   ```
   cd apps/mobile
   EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
     pnpm dlx eas-cli update --branch production \
       --message "feat(mobile/account): labels + Safety/Help sub-pages + external legal links + delete-account dialog" \
       --non-interactive
   ```
5. Result: two Hermes bundles (~3.69 MB each) + 71 assets per platform. 0 new assets to upload. Fingerprint computed cleanly.
6. Published to production branch, runtime `0.1.2`, both platforms.

## Rollback
Prior known-good group: `b39cef84-29b9-4a6a-9787-2db489d8faae` (shipped 2026-08-03, "fix(mobile/nav): tab bar clears system chrome"). To roll back:
```
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update:republish --branch production \
    --group b39cef84-29b9-4a6a-9787-2db489d8faae
```
Verify the exact rollback subcommand flag against live docs before invoking (CLI flags change).

## Monitoring
`expo.monitoring: "none"` per config — no Sentry, no crash-free-sessions dashboard to watch. **Follow-up: wire Sentry via `@sentry/react-native` Expo config plugin.** Until then, the only signal is user reports.

## Sources
_(this preflight relies on the CLAUDE.md field-state line + last-OTA report for what's currently in users' hands. If it's been >7 days since the last release, re-verify with `pnpm dlx eas-cli update:list --branch production` + `build:list` per the CLAUDE.md preflight recipe.)_

## Follow-ups
- Ship web (`/mstack-ship` for the whole branch, then Vercel auto-deploy) — the `/legal` page must be live at `airabynisarga.com/legal` or the new mobile privacy/legal/about screens' external links 404.
- Verify auth-side fixes (a5df16d, 89a52e1) land in the same web deploy — mobile users on OTA'd bundle still hit the current-prod broken `updateName`/`changeEmail`/`changePassword` endpoints until web is out.
