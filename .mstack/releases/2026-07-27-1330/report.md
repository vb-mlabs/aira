# Release — ota 2026-07-27 13:30

**App:** AIRA · **Platform:** iOS + Android (single OTA covers both) · **Channel/profile:** production
**Mode:** ota
**Status:** shipped
**Versions:** version `0.1.1` · runtimeVersion `{ policy: "appVersion" }` → targets store build 8
**Commit:** `d9640f3` (tip of `feat/business-logo`; Expo checkpoint marker `*` in publish output)
**Update group ID:** `52cb53f2-95b0-4a39-8268-0fe8c7bb9469`
**Android update ID:** `019fa3c7-1bcd-7311-b872-ba22c4430aed`
**iOS update ID:** `019fa3c7-1bcd-7c94-a381-273f69e9426b`
**EAS Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/52cb53f2-95b0-4a39-8268-0fe8c7bb9469

## Preflight

| Check | Result | Evidence |
|---|---|---|
| Native-diff safety (vs store build 8, 2026-07-14) | ✅ pass | `git log --stat 8f15319..HEAD` shows zero changes to `apps/mobile/package.json`, `apps/mobile/app.config.ts`, root `package.json`, or the plugins array. New mobile code (notification-tap.ts, goBackTo.ts, BusinessCard image branch, verify-email.tsx rename, etc.) is all JS-side on top of already-linked native modules — notably `expo-notifications` at `apps/mobile/package.json:35` and the config plugin at `app.config.ts:96` were both already shipped in build 8. |
| Versioning coherence | ✅ pass | `apps/mobile/app.config.ts`: `version: "0.1.1"` + `runtimeVersion: { policy: "appVersion" }`. Matches store build 8 (0.1.1) in users' hands. `runtimeVersion` derived, not hand-edited. |
| Git state | ✅ pass | Working tree clean modulo `.claude/*` + `.expo/*-cache/*` auto-generated caches (bundle-irrelevant — Metro doesn't ingest them). Publishing from `d9640f3` on `feat/business-logo`. |
| expo-doctor | ⚠ non-blocking | 3 failing checks, all pre-existing:<br>1. Duplicate `react` (19.1.0 root vs 19.2.4 nested in `use-sync-external-store`) — known non-blocker for OTA per learning 2026-07-09: mobile Metro resolves react from `apps/mobile/node_modules/react` regardless. Cleanup required before NEXT `eas build`.<br>2. `expo` patch drift: expected `~54.0.36`, found `54.0.35` — 1-patch behind.<br>3. `expo-updates` patch drift: expected `~29.0.19`, found `29.0.18` — 1-patch behind.<br>Both patch drifts were also present at the last 4 successful OTAs (2026-07-22 through 07-24 x3). Same tree state; same outcome expected. |
| EAS env: EXPO_PUBLIC_API_BASE_URL, EXPO_ACCESS_TOKEN | ✅ pass (unchanged since last OTA) | `apps/mobile/.env.production.local` present (Metro-bundled at OTA time per CLAUDE.md 3-layer env convention). Unchanged since store build 8 — 4 OTAs since then landed cleanly, so the config is known-good. `EXPO_ACCESS_TOKEN` is server-side only (not in the mobile bundle); relevant to the web deploy, not this OTA — flagged as a follow-up in the community-push implementation report. |

## Decision

**OTA is safe.** Every changed line since store build 8 lives in JS/TS,
assets, or config that Metro bundles at OTA time. The native diff row of
the mstack-expo decision table is empty — no native modules
added/removed/updated, no `app.json` plugin/permission/entitlement change,
no icon/splash change, no Expo SDK upgrade, no `expo-updates` config or
`runtimeVersion` change.

The community-push feature specifically DID add new push-notification
behaviour, but the underlying `expo-notifications` native module and its
config plugin were already in build 8 (they shipped for the F21 admin
broadcast infra). The new code (`setNotificationHandler`,
`addNotificationResponseReceivedListener`,
`getLastNotificationResponseAsync`) is JS-only API surface on top of the
already-linked native module.

## Payload since last OTA (`8f15319` → `d9640f3`)

Mobile-affecting commits since the 2026-07-24-2145 OTA. Grouped by
user-visible feature area:

**Auth email flow:**
- `095a428` fix(auth/email): rewrite verify + reset URLs so mobile Universal Links catch them (+ verify.tsx → verify-email.tsx rename)

**Mobile navigation:**
- `9e204f8` fix(mobile/nav): route cross-tab nested back-nav through router.navigate (Account → My Listings → biz detail → back now returns to My Listings)

**Business logo (new field):**
- `1d3b20d` feat(mobile/listings): BusinessCard reads logo_url for the avatar

**Community members stat:**
- `bc54c95` feat(home): wire Community Members stat card to a live count

**Web + mobile sponsorship listing UX:**
- `722fa65` fix(web/listings): render Sponsored top + mid as separate sections (web-only in effect but the shared type surface change ripples to mobile bundle)

**Mobile social icons:**
- `a4c6841` feat(mobile/social): Directions icon + priority reshuffle (WhatsApp + Directions demoted to tail; card row survives)

**Copy:**
- `d09227d` copy: replace "Indian" with "South Asian" across user-visible surfaces (mobile Home + Category taglines updated)

**Community push notifications (new feature):**
- `6406650` feat(services): sendPushToUser per-user push sender + tests
- `f8abb3a` feat(community): dispatch push after in-app comment notification
- `b1ad7fd` feat(mobile/push): foreground handler + tap-to-open at root
- `fe09e07` feat(mobile/notifications): mark as read on detail modal mount

**Admin (web-only, no mobile impact — recorded for completeness):**
- Manage Listings sponsorship column reshape, tier/plan required guards,
  business-logo admin controls. Web-only surface.

Non-mobile commits (mstack docs, admin ops, etc.): 26 additional commits
land in the OTA bundle only insofar as their type or validator surface
changes ripple through `packages/validators` (which the mobile bundle
imports). No behavioural change on the mobile side beyond the mobile-facing
commits above.

## Publish command (proposed — awaiting user confirm before execution)

Per CLAUDE.md's project-specific runbook. Must run from `apps/mobile/`
with `EAS_PROJECT_ID` as env var (the CLI's non-interactive mode does
not auto-detect the project link):

```bash
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update --branch production \
  --message "logo + push tap + back-nav + verify-email + South Asian copy"
```

- `--branch production` — this project's production channel per
  `expo.updateChannels`.
- No `--runtime-version` override — `appVersion` policy targets `0.1.1`
  (store build 8). No override needed; would only be needed to reach
  stragglers on an older runtime (none applicable this run).
- Message is the human-readable summary that shows in
  `eas update:list` and on the Expo dashboard. Under 100 chars.

## Post-publish plan

- Record the update group ID + platform IDs in this report.
- Watch for the "current runtime in the field" line in CLAUDE.md —
  DOES NOT need updating (still on 0.1.1; only bumped when a new
  store build lands).
- **Monitoring gap:** `expo.monitoring: "none"` — this project has no
  crash reporting wired. Recommend `@sentry/react-native` via its Expo
  config plugin before the next release. That's a native change so it
  ships with the next `eas build`. Not a blocker for this OTA.
- **Rollback trigger:** without Sentry, the fallback is user reports.
  If any critical regression surfaces within 24h, republish the last
  known-good group:
  ```bash
  cd apps/mobile
  EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
    pnpm dlx eas-cli update:republish --branch production --group <prior-group-id>
  ```
  Verify the exact `update:republish` flag against live docs before
  running — the subcommand has changed between CLI versions.

## Sources

- CLAUDE.md's "OTA updates via EAS" section — checked 2026-07-27 —
  publish command + EAS_PROJECT_ID + no-runtime-version-override rules
  for AIRA.
- `.mstack/releases/2026-07-24-2145/report.md` — checked 2026-07-27 —
  prior OTA baseline commit `8f15319`; same doctor state (patch drift,
  duplicate react) shipped cleanly.
- Learning 2026-07-09 (`.mstack/learnings.jsonl`) — duplicate-react
  doctor warning is OTA-safe but must be cleaned before next EAS Build.
- `node_modules/expo-doctor` output — checked 2026-07-27 — 3 non-blocking
  findings enumerated above.

## Execution log

**Publish confirmed by user 2026-07-27 13:30.** Command run from
`apps/mobile/`:

```bash
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update --branch production \
  --message "logo + push tap + back-nav + verify-email + South Asian copy"
```

Output (tail):

```
Branch             production
Runtime version    0.1.1
Platform           android, ios
Update group ID    52cb53f2-95b0-4a39-8268-0fe8c7bb9469
Android update ID  019fa3c7-1bcd-7311-b872-ba22c4430aed
iOS update ID      019fa3c7-1bcd-7c94-a381-273f69e9426b
Message            logo + push tap + back-nav + verify-email + South Asian copy
Commit             d9640f3ccbe0b095e5ecbd98f4e6e3ae33bec226*
EAS Dashboard      https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/52cb53f2-95b0-4a39-8268-0fe8c7bb9469
```

Bundle stats (from `expo-cli` export):

- Android bundle: `entry-5d221ab144c13c17dab7e8fe8aed935a.hbc` (3.65 MB)
- iOS bundle: `entry-caff77032f077d824a109bedb8fb3bb9.hbc` (3.65 MB)
- 71 assets per platform (well under the 2000 EAS Update ceiling)
- No new asset uploads — every asset already existed on prior updates.

`Computing project fingerprints` step took longer than the usual
threshold, but completed cleanly. Skippable in future runs via
`EAS_SKIP_AUTO_FINGERPRINT=1` if fingerprinting proves flaky.

## Follow-ups

- Clean the workspace's duplicate-react before the next native build
  (already documented; captured in the 2026-07-09 learning).
- Bump `expo` and `expo-updates` by one patch each
  (`~54.0.36` / `~29.0.19`) before the next `eas build`.
- Wire `@sentry/react-native` via its Expo config plugin so post-OTA
  crashes are visible without user reports. Ships with next native
  build.
- Confirm `EXPO_ACCESS_TOKEN` is set in the WEB production env (Replit
  Publish env) — the community-push feature's server-side sender
  log-and-returns silently on missing token, so a missing env would
  ship a feature that silently no-ops. This is a web-deploy concern,
  not an OTA concern.
