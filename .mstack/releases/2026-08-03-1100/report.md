# Release — ota (plan) 2026-08-03

**App:** AIRA · **Platform:** iOS + Android · **Channel/profile:** production
**Mode:** ota — planning + preflight only, no execution
**Status:** **conditional go** — plan approved locally; two blockers must clear before publish
**Versions (per `apps/mobile/app.config.ts`):** version `0.1.2` · runtimeVersion policy `appVersion` → runtime `0.1.2`
**Commits headed for the OTA:** `3c8d1c4` primary (plus incidental catch-up — see delta below)
**Build/Update IDs:** — (not yet published)

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
| Secrets per profile | **UNVERIFIED (blocker A)** | `eas env:list --environment production` requires a logged-in EAS session; this dev environment has neither `eas login` nor `EXPO_TOKEN`. Must run before publish. |
| Native-diff check | **pass (see delta below)** | No changes to native modules, plugins, permissions, icon/splash, or the SDK since the `0.1.2` prep commit (`b775d0b`). |
| Field-state reconciliation | **UNVERIFIED (blocker B)** | User says field is on build 10; CLAUDE.md's OTA note (2026-07-22) recorded build 8 on `0.1.1`. Between then and now, `b775d0b chore(mobile): prep 0.1.2 native rebuild` bumped `version` to `0.1.2` and added `expo-intent-launcher` (native), so at least one store submission on `0.1.2` happened. Exact build number + its runtime need `eas build:list --status finished --limit 8`. |
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

## Execution plan (do NOT run without the two blockers resolved first)

**Prerequisite step 0 — one-time:**

```bash
# In the Replit shell (interactive):
!eas login
# OR set EXPO_TOKEN in Replit Secrets and export at the start of the shell.
```

**Preflight step 1 — verify field state (blocker B):**

```bash
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli build:list --status finished --limit 8 --json \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d).forEach(b=>console.log(b.appBuildVersion,b.platform,'rt:'+b.runtimeVersion,'v:'+b.appVersion,b.createdAt.slice(0,10))))"

EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update:list --branch production --limit 5
```

**Interpret:** confirm the newest `finished` build's `appBuildVersion == 10`
and `runtimeVersion == 0.1.2`. If it's not — stop and reconsider (see
"If reconciliation surprises you" below).

**Preflight step 2 — verify secrets (blocker A):**

```bash
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli env:list --environment production
```

**Interpret:** the app reads `EXPO_PUBLIC_API_BASE_URL` (already
pinned to `https://airabynisarga.com` in `eas.json`); confirm it's set
in the production environment. No other `EXPO_PUBLIC_*` vars are read
at bundle time in the mobile code path being shipped.

**Preview publish (mandatory — the skill's "publish to preview first" rule):**

```bash
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update --branch preview --message "tab-bar safe-area fix — Samsung One UI 3-button nav"
```

Verify on a device or simulator build pointed at `preview`. Confirm
the Samsung One UI reproduction (or, if no Samsung is available, any
Android with 3-button nav enabled in Settings → Display → Navigation
bar). Tab bar must clear the system nav. Once confirmed:

**Production publish — the confirm gate:**

```bash
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update --branch production --message "fix(mobile/nav): tab bar clears system chrome (3c8d1c4)"
```

**Legacy-cohort catch-up (only if adoption data justifies):**

Per CLAUDE.md's OTA notes, users on build 8 (runtime `0.1.1`) or
builds 6/7 (runtime `0.1.0`) don't receive this OTA. If either
cohort is non-trivial in your Expo dashboard's runtime adoption
graph, publish additional OTAs:

```bash
# For 0.1.1 users (build 8 native lineage):
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update --branch production \
  --runtime-version 0.1.1 \
  --message "fix(mobile/nav): tab bar clears system chrome (3c8d1c4)"

# For 0.1.0 users (builds 6/7 native lineage) — only if any exist:
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update --branch production \
  --runtime-version 0.1.0 \
  --message "fix(mobile/nav): tab bar clears system chrome (3c8d1c4)"
```

**Watch rule (post-publish, first 2h):**

Even without Sentry, keep an eye on the Expo dashboard's Update page
for the group ID. If user reports spike or crash-free session data
(if any client-side telemetry exists) drops noticeably, roll back
first, investigate second:

```bash
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update:republish --branch production --group <prior-known-good-group-id>
```

⚠️ CLAUDE.md flags that the exact rollback subcommand has changed
between CLI versions — **verify against `eas update --help` at the
moment of rollback**, don't take this command as canon.

## If reconciliation surprises you

- **`appVersion` on the newest build isn't `0.1.2`** → someone else
  bumped the marketing version further. Re-run this preflight — the
  target runtime + `app.config.ts` need to align. Abort and re-plan.
- **`runtimeVersion` on the newest build isn't `0.1.2`** → the
  runtime policy was changed since the build was cut. This is a
  no-go — do not publish. Route to `/mstack-plan` to decide the fix.
- **Delta since the last shipped commit includes ANY native change**
  (checking `git show a4f2f40 --stat` reveals a RN dep, or another
  commit surfaces that this preflight missed) → the OTA becomes
  unsafe; the runway shifts to `release` mode and needs a fresh
  native build.

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
- **CLAUDE.md OTA note refresh.** Once this OTA lands, update the
  "current runtime in the field" line in CLAUDE.md from
  "Build 8 on runtime 0.1.1 (2026-07-22)" to whatever build 10 turns
  out to be, and stamp today's date.
- **Metro config finding.** `expo-doctor` flagged the pnpm-monorepo
  Metro customization. Not a blocker for OTAs, but worth revisiting
  when the RN-CLI or Expo tooling ever complains about resolver
  behavior — file for a rainy-day cleanup.
- **`a4f2f40` audit.** If the delta-since-build-10 audit surfaces
  that this automated vulnerability-fix commit touched a native RN
  dep after the build 10 cut, this whole plan needs to shift from
  `ota` to `release`. Verify at execution time with `git show a4f2f40 --stat`.
