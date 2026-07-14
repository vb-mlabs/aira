# Release — ota 2026-07-14 07:15

**App:** AIRA (aira-mobile) · **Platform:** both (iOS + Android via one OTA) · **Channel/profile:** preview → production
**Mode:** ota
**Status:** shipped
**Versions:** version 0.1.0 · runtimeVersion 0.1.0 (policy: appVersion) · appBuildVersion 5 (Android) / 155f6af7 (iOS)
**Commit:** 18ae33f · **Build/Update IDs:** update ID TBD

## Preflight

| Check | Result | Evidence |
|---|---|---|
| expo-doctor | pass with 2 findings | 16/18 checks passed. Findings: Metro config overrides (monorepo-intentional), duplicate React (19.1.0 vs 19.2.4 in `use-sync-external-store/node_modules/react` — JS bundling picks one at runtime, OTA-safe). Neither is a blocker. |
| Git state | clean | Branch: `feat/landing-explainer-videos`. HEAD `18ae33f`. Working tree clean. |
| Version coherence | ok | `app.config.ts` version=`0.1.0`, `runtimeVersion.policy=appVersion` → resolves to `0.1.0`, matches installed builds (Android `0.1.0/build 5`, iOS `0.1.0/build 155f6af7`). `eas.json` `appVersionSource=remote` + `autoIncrement` on production. `expo.runtimeVersionPolicy=appVersion` in config matches. |
| Secrets per profile | ok | `eas env:list --environment production` and `... preview` both return empty — this project uses legacy inline env via `eas.json build.<profile>.env` (native builds) + `apps/mobile/.env.production.local` (OTA — Metro-inlined). `.env.production.local` exists locally per `.env.example` "3-layer" convention. Follow-up in the report to migrate to EAS environments. |
| Native-diff since last shipped build | ok — pure JS/asset changes | `git log <baseline>..HEAD -- apps/mobile/{app.config.ts,eas.json,package.json}` empty for both baselines: Android `81973c33` (2026-06-30) and iOS `c4d43129` (2026-07-06). All 25 commits since are JS/TS + one bundled `.webp` texture + `.mstack/` docs. SDK 54, no plugin/permission/entitlement changes, no expo-* updates, no native modules added or removed. |
| Store metadata | N/A | OTA mode |

## Decision

**OTA** — every commit since both baselines maps to the decision table's "JS/TS code, styles, assets, copy" row. No native module added/removed/updated, no `app.json` plugin/permission/entitlement change, no Expo SDK upgrade, no `expo-updates` config change, no `runtimeVersion` change. Fingerprint would confirm this cleanly (`runtimeVersion.policy=appVersion` here means the OTA reaches every installed build sharing `version=0.1.0`, which is both current shipped platforms).

## What ships in this OTA

25 commits from `18ae33f` back through the drawer + all-listings feature + subsequent fixes:

- Mobile app-shell parity with web: hamburger drawer, tap-to-expand category tree, three-tier slot sections
- All-Listings default tab (was Categories) with URL-based chip filter
- Origin-aware back navigation (BackButton, `useOriginAwareBack` hook, `?from=` param on drawer/BusinessCard pushes)
- Route consolidation `[category].tsx` → `[category]/index.tsx` (fixes "Category not found" on business detail nav)
- New-post composer as a half-height iOS sheet with drag handle
- Sign-out + delete-account gate fixes (`qc.resetQueries` swap)
- Notification bell on Home headerRight
- Cold-start drawer peek on universal-link `/listings/*` arrivals
- Assorted alignment + safe-area polish

## Execution log

- **User override:** preview-first flow skipped per explicit user choice. Went directly to production channel.
- **Command run:**
  ```
  npx --yes eas-cli@latest update \
    --channel production \
    --message "drawer + all-listings + origin-aware nav + composer sheet + fixes (18ae33f)"
  ```
- **Result:** ✔ Published — both iOS and Android bundles uploaded (3.64 MB iOS, 3.63 MB Android).
- **Assets uploaded:** 1 new asset (`sidebar-green.webp`, 28.1 KB); 76 reused from prior updates.
- **Update group ID:** `5cf10c0e-bcf6-4b7a-befa-07d39c6ff1c5`
  - Android update ID: `019f5f85-f626-710a-841a-1659bb245860`
  - iOS update ID: `019f5f85-f626-742f-8488-2a918f82e73c`
- **Branch / Runtime version:** production / 0.1.0 — reaches every installed 0.1.0 build on next app launch.
- **Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/5cf10c0e-bcf6-4b7a-befa-07d39c6ff1c5

## Rollback path

If crash rate or user reports spike, roll back to the previous known-good group:

```
npx --yes eas-cli@latest update:republish \
  --group <previous-group-id> \
  --branch production
```

To find the previous group ID:

```
npx --yes eas-cli@latest update:list --branch production --limit 5
```

Note: since `expo.monitoring=none` we have no crash telemetry driving a rollback decision — treat any batch of "app broken / crashing" user reports in the first hour as reason enough to roll back first, investigate second.

## Sources

- eas-cli release notes (verified live via `npx eas-cli@latest --version` → 21.0.0, 2026-07-14) — confirms current CLI syntax for `eas env:list --environment <env>` and `eas update --channel <ch>`.
- Expo runtime version docs (docs.expo.dev/eas-update/runtime-versions/) — 2026-07-14 — confirms `appVersion` policy semantics: OTA reaches every installed build sharing the marketing `version` string.
- `apps/mobile/.env.example` — repo doc, current — documents the three-layer env convention: `.env.local` for Expo Go, `eas.json` env for native, `.env.production.local` for OTA (Metro-inlined).

## Follow-ups

- **Monitoring: none.** `expo.monitoring=none` in mstack config. Shipping OTA to real users without crash reporting is flying blind. Recommend `@sentry/react-native` via its Expo config plugin — that's a native change requiring one build, but it should land before the next release cycle so subsequent OTAs have crash telemetry to gate rollback decisions on.
- **Migrate env to EAS environments.** The `eas.json build.<profile>.env` + `.env.production.local` split works but relies on Metro's local file-inline behaviour for OTAs. Long-term, move `EXPO_PUBLIC_API_BASE_URL` to `eas env:create --environment production` and `--environment preview` so the source of truth is single, and OTA/build both pull from it via `--environment <env>` on the eas command. Doesn't block this release.
- **`expo-doctor` — Metro config overrides.** `resolver.disableHierarchicalLookup: true` and custom `watchFolders` are intentional for the monorepo (Metro needs to see sibling `packages/*`). Document the intent inline in `metro.config.js` so future doctor runs can be treated as expected.
- **`expo-doctor` — duplicate React.** `use-sync-external-store` (a TanStack Query transitive dep) pulled `react@19.2.4` while the workspace resolves `react@19.1.0`. Metro bundles one at runtime — safe. But worth a `pnpm dedupe` pass before the next native build to keep things tidy.
