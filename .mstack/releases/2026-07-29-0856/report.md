# Release — ota 2026-07-29 08:56

**App:** aira-mobile · **Platform:** both (iOS + Android) · **Channel/profile:** preview → production
**Mode:** ota
**Status:** shipped
**Versions:** version 0.1.1 · runtimeVersion 0.1.1 (policy: appVersion)
**Commit:** `d8eb916` (working-tree fingerprint at publish; branch `feat/business-logo` HEAD = `4ace2a1` pushed) · **Update group:** `8554c69d-13fd-4813-b5fe-62efbafd85e4`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/8554c69d-13fd-4813-b5fe-62efbafd85e4
**Update IDs:** iOS `019fae5c-bda5-711e-ad39-61662e94c6c9` · Android `019fae5c-bda5-7be8-a6d6-4f45963ef976`

## Scope

Session's mobile-bound work being released:

- **`fix(mobile/auth)`** — sign-out imperative `router.replace('/(auth)/welcome')` alongside the existing `qc.resetQueries()` gate flip. Defeats the cookie-residue + gate-flip-race cause of the reported "signout appears to no-op" bug (previously debugged in `.mstack/fixes/2026-07-14-mobile-signout-modal-noop.md`; recurrence 2026-07-29).
- **`feat(mobile/check-email)`** — Resend cooldown 30s → 60s; `openMail` now walks a platform-aware fallback chain (`message://` → `googlegmail://` → `ms-outlook://` → `ymail://` → `https://mail.google.com` on iOS; Gmail scheme → web on Android). Fixes false "No mail app installed" toast on Android + non-Apple-Mail iOS users.
- **`feat(mobile/nav)`** — Instagram / Facebook / LinkedIn icons added to the drawer Contact strip via `MaterialCommunityIcons`.
- **`feat(mobile/home)`** — Businesses Listed + Community Members stat cards gated behind `brand.homepage.showStatCards` (currently `false`; flip when 100+ listings).
- **`feat(config)`** — new `brand.socials` block (single source of truth for both apps + marketing footer) + `brand.homepage.showStatCards` flag.

Web-only / server-only changes (sharp fix, admin community filter, sidebar socials, home stats, email 2h TTL + copy) are **explicitly excluded** from this OTA per user decision — deferred to a later Replit Publish.

## Preflight

| Check | Result | Evidence |
|---|---|---|
| **1. expo-doctor** | warn (3 findings) | `resolver.disableHierarchicalLookup` monorepo override (expected), duplicate react 19.1.0/19.2.4 via `use-sync-external-store` (introduced by vuln-fix `e2be247`), patch mismatch expo 54.0.35 vs 54.0.36 + expo-updates 29.0.18 vs 29.0.19. None block bundle-build. |
| **2. Git state** | pass | 7 commits on `feat/business-logo`, all pushed to origin, working tree clean (minus `.claude/` harness noise). HEAD `4ace2a1`. |
| **3. Versioning coherence** | pass | `app.config.ts`: version `0.1.1`, runtimeVersion policy `appVersion`. No `eas.json` in repo (no autoIncrement to enforce here; native build numbers managed via EAS). |
| **4. Secrets — EAS env** | warn | `eas env:list --environment production` → "No variables found". Not blocking for OTA (mobile reads `EXPO_PUBLIC_*` from local `.env.production.local` at bundle time, not EAS env). |
| **4b. Secrets — local `.env.production.local`** | **NO-GO** | File missing at `apps/mobile/.env.production.local`. Without it, the OTA bundle bakes in `http://localhost:3000` as `EXPO_PUBLIC_API_BASE_URL` (default at `apps/mobile/lib/api/client.ts:31`). Users would OTA into a bricked app. Per CLAUDE.md: this file is the source of the runtime API host for OTA bundles. |
| **5. Native-diff (OTA safety)** | pass | Since `13abcba` (native build 8, runtime 0.1.1, 2026-07-14): `apps/mobile/package.json` unchanged; `app.config.ts` unchanged (no plugin/permission/entitlement/icon changes); root `package.json` bumped only server-side + JS-only deps in `e2be247` vuln fix (`better-auth`, `next`, `sharp`, `ws`, `postcss`, `brace-expansion`) — no native modules. 175 commits ahead but zero native-relevant. |

## Decision

OTA is safe from a native-code angle. **Blocked by missing `.env.production.local`.** Cannot publish until it exists on the machine running `eas update`.

## Execution log

- Split-committed 7 concerns across working tree (see git log; commits `177ca55` → `4ace2a1`).
- Pushed `feat/business-logo` → origin.
- Full monorepo `pnpm typecheck` → 10/10 pass.
- Preflight → NO-GO (missing `apps/mobile/.env.production.local`).
- User created env file with `EXPO_PUBLIC_API_BASE_URL=https://airabynisarga.com` (apex, per CLAUDE.md apex-only rule).
- Preflight re-verified → GO.
- User approved publish via AskUserQuestion confirm gate.
- First `eas update` attempt failed on auth (`Expo user account required`). User approved reusing the workspace `EXPO_ACCESS_TOKEN` secret as `EXPO_TOKEN` for the CLI.
- Second attempt succeeded:

  ```
  EXPO_TOKEN="$EXPO_ACCESS_TOKEN" EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
    pnpm dlx eas-cli update --branch production --message "mobile UX polish + sign-out fix" --non-interactive
  ```

  Result: iOS + Android bundles uploaded (3.65 MB each), 71 assets/platform (well under the 2000 cap), fingerprint computed, group `8554c69d` published to production branch on runtime 0.1.1.

## Sources

- CLAUDE.md — "Expo API base URL is a separate concern" note, three-layer setup (`.env.local` for Expo Go / `eas.json` env for native builds / `.env.production.local` for OTA).
- CLAUDE.md — "Current runtime in the field (as of 2026-07-22): Build 8 on runtime 0.1.1 (iOS + Android, submitted 2026-07-14)".
- `.mstack/fixes/2026-07-14-mobile-signout-modal-noop.md` — records native build 8 as commit `13abcba`.

## Follow-ups

- **Fix expo/expo-updates patch drift** (expo 54.0.35 → 54.0.36; expo-updates 29.0.18 → 29.0.19) via `npx expo install --check`. Non-blocking; run before next native build.
- **Duplicate React** (19.1.0 + 19.2.4) — worth resolving with a `pnpm.overrides` entry or removing the offending devDep before shipping the next native build. In JS-only OTA it's likely fine (bundle deduplicates), but on native build it'll flag doctor warnings and could cause hook-instance issues.
- **Add EXPO_TOKEN as a Replit secret** — currently we alias EXPO_ACCESS_TOKEN. Same value works today, but a dedicated EXPO_TOKEN secret removes the aliasing tax on future OTAs.
- **Configure EAS env** — even though not required for OTA today, having the same env vars declared in `eas env` would let CI or team members run `eas update` without needing local `.env.production.local`.
- **Monitoring is `none`** — `expo.monitoring` in `.mstack/config.json` says none. Sentry via `@sentry/react-native` recommended before more OTAs go out. Flying blind on crashes without a monitoring signal to trigger rollback.
- **Web-side deferred changes** are still uncommitted-to-prod: sharp fix (`apps/web/next.config.mjs` uncommitted!), admin community filter (committed `177ca55`), sidebar socials (`f9005d1`), home stats (`92005e0`), email 2h TTL (`c182b3e`). Needs Replit Publish. See "Web publish" gap below.
- **Update CLAUDE.md** — bump the "Current runtime in the field" line to reference this OTA (2026-07-29 group `8554c69d`) so future debug reports can trace what shipped when.

