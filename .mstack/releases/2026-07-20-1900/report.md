# Release — ota 2026-07-20 19:00

**App:** AIRA (aira-mobile) · **Platform:** android, ios · **Channel/profile:** production
**Mode:** ota
**Status:** shipped
**Versions:** version 0.1.1 · runtimeVersion 0.1.1 (policy: appVersion) · targets iOS bn 8
**Commit:** 63a231c · **Update group ID:** 336c9ce0-29e9-467e-a75d-cbb0a92c350e
**iOS update:** 019f805a-8d19-7fa2-a798-2e848fd19428
**Android update:** 019f805a-8d19-7083-ba00-019a071bd153
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/336c9ce0-29e9-467e-a75d-cbb0a92c350e

## Preflight

| Check | Result | Evidence |
|---|---|---|
| eas-cli auth | pass | `pnpm dlx eas-cli whoami` → vb-mlabs (Owner), million-labs (Developer) |
| Branch | pass | `feat/landing-explainer-videos` — not main |
| Git tree | pass (after housekeeping commit `63a231c`) | 3 uncommitted mstack docs bundled into `63a231c` before OTA |
| expo-doctor | warn — non-blocking | `expo` 54.0.35 vs expected ~54.0.36; `expo-updates` 29.0.18 vs expected ~29.0.19; `use-sync-external-store` react dedup warning. All patch-level or transitive — OTA within same runtime version 0.1.1 is unaffected. |
| Version coherence | pass | app.config.ts `version: "0.1.1"` + `runtimeVersion: { policy: "appVersion" }` matches production build 0.1.1 (bn 8) shipped 2026-07-14 |
| Secrets | pass | `EXPO_PUBLIC_API_BASE_URL` defined inline in eas.json production build env (points to prod host `https://airabynisarga.com`); no repo-stored secrets |
| Native-diff | pass | `git log --since="10 hours ago" --name-only -- apps/mobile/` returned 9 files, all `.tsx`/`.ts` — no `app.config.*`, no `package.json`, no plugin/permission/native change |
| Store metadata | N/A | OTA mode |
| Monitoring | warn — no rollback signal | `expo.monitoring: none` — no Sentry / crash reporting. Cannot detect crash-free session drop after this OTA. |

## Decision

**OTA per the decision table** — "JS/TS code, styles, assets, copy" row. All 9 changed mobile files are JS/TS/asset; no native modules, plugins, permissions, or SDK version changes.

**Deviation from skill guidance:** skipped preview-channel verification per explicit user direction. The user was shown the preview→production sequence and chose "Skip preview, go straight to production" — noted as a documented deviation, not a silent bypass. Risk mitigated by:
- Native-diff is clean
- Runtime version match with in-hand production build
- Vitest passed for the back-nav fix (3/3)
- Typecheck passed everywhere post-fix (10/10 tasks)

Risk NOT mitigated:
- No on-device visual regression check for the 12px sweep (~7 mobile files) or tier2-texture swap
- No preview-channel canary period
- No Sentry to catch crash spike

## Execution log

```
$ git log --oneline -1
63a231c docs(mstack): update fix SHA + plan status + capture 12px sweep code ledger

$ cd /home/runner/workspace/apps/mobile
$ pnpm dlx eas-cli update --channel production --message "session sweep: sidebar tier2 texture + 12px floor + back-nav fix"

… (Metro export + fingerprint compute + publish)

✔ Published!
Branch             production
Runtime version    0.1.1
Platform           android, ios
Update group ID    336c9ce0-29e9-467e-a75d-cbb0a92c350e
Android update ID  019f805a-8d19-7083-ba00-019a071bd153
iOS update ID      019f805a-8d19-7fa2-a798-2e848fd19428
Commit             63a231c1aa12b954960916afe5552f66c17572bd*
```

## What's in the update

Consolidated changes from this session's mobile-touching commits (all shipped by `63a231c` HEAD):

- `591d6ef` — back-nav fix: Back on business detail returns to `/listings/<sub>` instead of skipping to Home/Post. New `buildBackHref` helper strips route segments.
- `bb7684a` — 12px floor sweep on mobile (tab labels 11→12; NotificationBell 10→12 with lineHeight 12→14; drawer sub-rows 10→12; BusinessCard SponsoredPill 9→12; several text-[Npx] → text-xs).
- `75a3fd2` / `f868cee` — sidebar submenu now uses `tier2-texture.webp` (mid-tier sponsored look).

## Sources

- `node_modules/expo-router/build/hooks.d.ts` — checked 2026-07-20 — useLocalSearchParams merges route segments + query params (informed the back-nav fix).
- OTA decision table (skill doc) — checked 2026-07-20 — "JS/TS code, styles, assets, copy" → OTA safe.

## Follow-ups

- **Wire Sentry** (`@sentry/react-native` via Expo config plugin) — this OTA reached production users without monitoring; cannot detect crash spike. Flip `expo.monitoring` from `none` to `sentry` in mstack config once wired.
- **Patch-bump `expo` 54.0.35→.36 and `expo-updates` 29.0.18→.19** before the next native build. OTA-safe today but the mismatch will bite if we ship another OTA that expects the newer JS API.
- **Device verification for this OTA** — walk through both back-nav scenarios (drawer → main → sub → listing → Back should land on `/listings/<sub>`) and eyeball the sidebar tier2 texture + 12px promotions on a real device. If any regression surfaces, roll back with `pnpm dlx eas-cli update:republish --group <previous-group-id>` (verify current CLI flag against live docs first — the rollback command changes between releases).
- **Skip-preview deviation** — for the next release, resume the preview-then-production sequence unless there's a documented reason to skip.

## Rollback plan

If crash reports arrive or QA finds a regression:
1. Find the previous known-good update group: `pnpm dlx eas-cli update:list --branch production --limit 5`.
2. Republish: `pnpm dlx eas-cli update:republish --group <prior-group-id>` (or use the CLI's current rollback command — flag names change between releases).
3. Verify the new group ID is the one users get by re-listing updates.

Prior good group ID to keep handy — not captured in this run's preflight; grab from `eas update:list` before initiating any rollback.
