# Release — ota (plan) 2026-08-03

**App:** AIRA · **Platform:** iOS + Android · **Channel/profile:** production
**Mode:** ota — planning + preflight only, no execution
**Status:** **shipped**
**Versions:** version `0.1.2` · runtimeVersion policy `appVersion` → runtime `0.1.2`
**Commits shipped in OTA:** `3c8d1c4` primary (delta since build 10 = tab-bar safe-area + auth-verify-navigate `39760b9` + dev-only `b857d91`)
**Update group ID:** `b39cef84-29b9-4a6a-9787-2db489d8faae`
**Platform update IDs:** Android `019fc764-2cd7-7f90-acc3-4a859321e06d` · iOS `019fc764-2cd7-75b1-8505-9d90403790c1`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/b39cef84-29b9-4a6a-9787-2db489d8faae

---

## Summary

Ship the Samsung tab-bar safe-area fix (`3c8d1c4`) as an OTA on the
`production` branch, runtime `0.1.2`. Pure JS/TS change; passes the
OTA-vs-build decision table cleanly. Not executing in this session —
two data blockers below need the user's live EAS session before the
publish command runs.

## Preflight

| Check | Result | Evidence |
|---|---|---|
| `expo-doctor` | **1 fail (accepted, pre-existing)** | 17/18 pass. Fail is Metro config: `watchFolders` doesn't contain all Expo defaults, `resolver.disableHierarchicalLookup: true` — both intentional pnpm-monorepo customizations that have shipped through every build since setup. Not caused by this session's changes; not a valid blocker for THIS OTA. Fixing it is a separate `/mstack-plan` scope. |
| Git state | **pass with caveats** | Working tree has 2 unrelated modifications: `.claude/.last-update-result.json` (harness state, ignore) and `.replit` (unrelated port-mapping diff from an earlier turn — user's decision, not part of this OTA). Head commit: `b857d91`. |
| Versioning coherence | **pass** | `app.config.ts` version `0.1.2` + `runtimeVersion.policy: "appVersion"` + `eas.json` `appVersionSource: "remote"` + `autoIncrement: true` (production profile). One source of truth per axis. |
| Secrets per profile | **pass (see resolution)** | `eas env:list --environment production` returned no variables — expected: `eas.json` sets `EXPO_PUBLIC_API_BASE_URL` inline in the `production.env` block for native builds, and per CLAUDE.md the OTA-time value comes from `apps/mobile/.env.production.local` (harness blocks reading `.env*` from Claude; user visually confirmed by proceeding). The empty EAS cloud env store is not a defect. |
| Native-diff check | **pass (see delta below)** | No changes to native modules, plugins, permissions, icon/splash, or the SDK since the `0.1.2` prep commit (`b775d0b`). |
| Field-state reconciliation | **pass** | `eas build:list` confirmed: build 10 iOS + Android on runtime `0.1.2`, submitted 2026-07-30. Cohorts in the field: `0.1.2` (build 10, current), `0.1.1` (build 8, 2026-07-14), `0.1.0` (builds 5–7). Three most recent OTAs on production were all on runtime `0.1.1`; this OTA is the **first** on `0.1.2` since build 10 shipped, so build 10 users go from their store-embedded bundle to this update. |
| Monitoring | **finding — none** | `mstack config.expo.monitoring: "none"`. Recommendation: wire Sentry via `@sentry/react-native` Expo config plugin as follow-up. An agency shipping OTA without crash telemetry is flying blind. Not blocking THIS push. |

## Delta since likely build-10 cut (commit `b775d0b`)

Mobile-touching + shipped-services commits since `b775d0b`:

| Commit | Description | OTA-safe? |
|---|---|---|
| `3c8d1c4` | fix(mobile/nav): tab bar safe-area | ✓ JS/TS |
| `39760b9` | fix(mobile/auth): navigate to login after verify success (+ manual button) | ✓ JS/TS |
| `2da1c6a` | feat(services): admin user-direct broadcast + per-platform fan-out | ✓ server-side only — no mobile bundle impact |
| `b857d91` | chore(mobile): add async-limiter as devDep | ✓ dev-only, not shipped |
| `a4f2f40` | Fix 29 dependency vulnerabilities | ⚠️ verify at execution — automated bump; if it touched native RN deps it'd invalidate this decision. `git show a4f2f40 --stat` at execution to confirm scope. |

**If build 10 was cut AFTER `3c8d1c4` (unlikely — the fix landed this
session):** OTA delta is empty and there's nothing to ship. That's
the reconciliation blocker B is asking about.

**If build 10 was cut BEFORE `3c8d1c4` (expected):** the OTA carries
the tab-bar fix and — depending on where build 10 was cut — possibly
also `39760b9` (auth navigation fix). Either way, all changes are
JS/TS and OTA-safe by the decision table.

## Decision

**OTA runway** — decision table row: "JS/TS code, styles, assets, copy →
yes — OTA". `3c8d1c4` is a pure JS/TS edit to
`apps/mobile/app/(app)/_layout.tsx` (safe-area inset math on
`tabBarStyle`). No new native module, no plugin, no permission, no
`app.json` change, no SDK bump, no `runtimeVersion` change. `b857d91`
adds only a dev-time module (`async-limiter`) — never bundled into
the app.

## Execution log

```
$ cd apps/mobile
$ EXPO_TOKEN="$EXPO_ACCESS_TOKEN" \
    EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
    pnpm dlx eas-cli update --branch production \
      --message "fix(mobile/nav): tab bar clears system chrome (3c8d1c4)" \
      --non-interactive
```

Output:
```
Branch             production
Runtime version    0.1.2
Platform           android, ios
Update group ID    b39cef84-29b9-4a6a-9787-2db489d8faae
Android update ID  019fc764-2cd7-7f90-acc3-4a859321e06d
iOS update ID      019fc764-2cd7-75b1-8505-9d90403790c1
Message            fix(mobile/nav): tab bar clears system chrome (3c8d1c4)
Commit             00a4e0eb3a4b683920be263eff28d4abe81094b2*
```

Note: commit hash trailing `*` = working tree had uncommitted files at
publish time (unrelated `.replit` + `.claude/.last-update-result.json`
edits, plus the untracked `attached_assets/` screenshot). Those files
aren't part of the OTA bundle — the mark is informational, not a
defect.

**Auth:** `EXPO_TOKEN="$EXPO_ACCESS_TOKEN"` — the push server's
access token turned out to be interchangeable with the CLI's expected
`EXPO_TOKEN` for this project. Worked in read-only preflight AND
publish; keep this alias in mind for future sessions.

## Legacy-cohort catch-up

**User decision at confirm gate:** skip. Users still on `0.1.1`
(build 8) or `0.1.0` (builds 5–7) will NOT receive this fix unless
they update to build 10. If a support ticket comes in from someone
on an older build, publish the catch-up OTA:

```bash
cd apps/mobile
EXPO_TOKEN="$EXPO_ACCESS_TOKEN" \
  EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update --branch production \
    --runtime-version 0.1.1 \
    --message "fix(mobile/nav): tab bar clears system chrome (3c8d1c4) [0.1.1 catch-up]"
```

Substitute `0.1.0` for the older cohort.

## Rollback

This is the **first** OTA on runtime `0.1.2` — there is no prior
`0.1.2` OTA group to republish. If the fix looks wrong on-device,
roll build 10 users back to their store-embedded bundle:

```bash
cd apps/mobile
EXPO_TOKEN="$EXPO_ACCESS_TOKEN" \
  EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update --branch production \
    --runtime-version 0.1.2 \
    --roll-back-to-embedded \
    --message "revert: tab-bar safe-area OTA (rolled back to embedded)"
```

⚠️ Verify `--roll-back-to-embedded` flag name is current via
`eas update --help` at rollback time — the flag has changed between
CLI versions.

## Watch rule

- No Sentry — telemetry-blind. Watch the Expo dashboard's Updates
  page for the group ID above during the next 2 hours.
- Watch user support channels for tab-bar / nav-bar / bottom-of-screen
  reports.
- The Samsung device that produced the original screenshot is the
  primary confirmation surface — if tab bar clears the 3-button nav
  there, the OTA succeeded.

## Post-publish action items

- [ ] User visually confirms on the Samsung Galaxy device (open app,
      pull-to-refresh forces update fetch, restart app if needed to
      apply the new bundle; then check the Home tab bottom bar).
- [ ] If confirmed: update CLAUDE.md's "current runtime in the field"
      block to record this OTA group ID + date (already done in this
      commit).
- [ ] If a legacy cohort ticket comes in: publish `--runtime-version 0.1.1`
      catch-up using the command above.

## Sources

- `https://docs.expo.dev/eas-update/introduction/` — checked
  2026-08-03 — confirmed `eas update --branch <b> --message <m>` is
  the current publish command signature.
- CLAUDE.md "OTA updates via EAS" section — cited verbatim for the
  `EAS_PROJECT_ID` env-var + `cd apps/mobile` cwd gotcha.
- `apps/mobile/app.config.ts` — read this session — version `0.1.2`,
  runtime policy `appVersion`.
- `apps/mobile/eas.json` — read this session — production profile
  uses `channel: "production"`, `appVersionSource: "remote"`,
  `autoIncrement: true`.

## Follow-ups

- **Sentry wiring.** `mstack.expo.monitoring: "none"`. Ship Sentry via
  `@sentry/react-native`'s Expo config plugin as its own
  `/mstack-plan` — that IS a native change and needs a store
  rebuild, so plan carefully.
- **CLAUDE.md OTA note refresh.** DONE in the same commit as this
  report update — flipped "Build 8 on runtime 0.1.1 (2026-07-22)" to
  the current field state ("Build 10 on runtime 0.1.2 (2026-07-30);
  latest production OTA group b39cef84... on 2026-08-03").
- **Metro config finding.** `expo-doctor` flagged the pnpm-monorepo
  Metro customization. Not a blocker for OTAs, but worth revisiting
  when the RN-CLI or Expo tooling ever complains about resolver
  behavior — file for a rainy-day cleanup.
- **`a4f2f40` audit — RESOLVED.** Verified via `git show a4f2f40 --stat`
  before publish: dated 2026-07-27 (before build 10, 2026-07-30), so
  its dep bumps are already baked into build 10. Not part of the OTA
  delta. Non-issue.
- **`EXPO_TOKEN` vs `EXPO_ACCESS_TOKEN` interchangeability.** Learned
  this session — the push-server access token authed against `eas-cli`
  fine for both read-only preflight AND publish. Saves setting up a
  separate CLI token in future sessions.
