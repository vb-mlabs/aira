# Release — release 2026-07-30 19:43

**App:** aira-mobile · **Platform:** both (iOS + Android) · **Profile:** production
**Mode:** release (native build + submit)
**Status:** preflight passed — awaiting user confirm on `eas build`
**Versions:** version `0.1.2` · runtimeVersion `0.1.2` (policy: appVersion) · build number → EAS Remote auto-increment
**Commit:** `b775d0b` (pushed to `origin/feat/business-logo`)

## Scope — what changes go into build 9 (0.1.2)

Since native build 8 (2026-07-14, commit `13abcba`), this release bundles:

**Push notification fixes (the actual reason we're rebuilding):**
- **`google-services.json` + `googleServicesFile` config** (commit `796c5a8`) — Firebase config for Android FCM. Without this, `Notifications.getExpoPushTokenAsync` fails at runtime with "Default FirebaseApp is not initialised" — the smoking gun of every Android push report this session. FCM V1 service account key uploaded to EAS via dashboard (paired credential).
- **Notification channel + priority** (OTAs #5–#7, now baked into native) — `aira_alerts_v1` channel at `IMPORTANCE_HIGH`, server-side `channelId` + `priority: "high"` on every push message.

**Auth/UX fixes (5+ OTAs consolidated into native):**
- Sign-out `Updates.reloadAsync()` — actual root cause was iOS `NSURLSession` cookie residue, fixed by `credentials: "omit"` on every mobile fetch (OTA #3). Nuclear-option reload retained as belt-and-braces.
- Unverified sign-in routes to `/(auth)/check-email` instead of showing "wrong password".
- Verify-email link uses GET (Better Auth's actual contract) instead of POST.
- Email link TTL 1h → 2h, wired through the adapter.
- Resend cooldown 30s → 60s → 300s with `m:ss` display.

**Android Open-Mail (this rebuild specifically):**
- **`expo-intent-launcher ~13.0.8`** installed + wired into `openMail`. Android now fires `Intent.ACTION_MAIN` + `CATEGORY_APP_EMAIL` (Android's mail-app chooser) instead of the browser fallback that OTA #4 shipped as a copy-only workaround. Button label unified back to "Open Mail" since Android now honestly opens a mail app.

**Doctor cleanup:**
- `expo 54.0.35 → ~54.0.36`, `expo-updates 29.0.18 → ~29.0.19` — patch alignment per bundledNativeModules.
- React dedup — `pnpm.overrides` pinning `react: 19.1.0` + `react-dom: 19.1.0`. Vuln fix (2026-07-27) had introduced 19.2.4 alongside 19.1.0 via `use-sync-external-store`.

**UI polish (from OTAs, now embedded):**
- Admin community filter fix, email 2h TTL copy, social icons in sidebar/drawer, home stats hidden behind config flag, various others (see git log `13abcba..b775d0b`).

**Deferred:**
- Sentry (`@sentry/react-native`) — needs Sentry account + DSN setup. Backlogged for next rebuild.

## Preflight

| Check | Result | Evidence |
|---|---|---|
| **1. expo-doctor** | pass (with one non-blocking warning) | The only remaining warning is Metro config's `resolver.disableHierarchicalLookup: true` + custom `watchFolders` — both are required overrides for the pnpm monorepo (documented in eas-build-runbook.md), not real issues. All version alignment issues resolved: `expo ~54.0.36`, `expo-updates ~29.0.19`, React duplication resolved via workspace pnpm.overrides. |
| **2. Git state** | pass | HEAD `b775d0b` matches origin. Working tree changes limited to `.claude/*` harness files + `.expo/` cache — neither ships with the build. |
| **3. Versioning coherence** | pass | `app.config.ts`: `version: "0.1.2"`, `runtimeVersion.policy: "appVersion"` → runtimeVersion resolves to `"0.1.2"` at build time. `eas.json` production profile: `autoIncrement: true` (bumps native buildNumber/versionCode), root `appVersionSource: "remote"` (EAS holds the counter authoritatively). Triangle intact. Build 9 will result. |
| **4. Secrets — EAS env production** | empty (not blocking) | `eas env:list --environment production` returns no vars. Runtime API URL comes via `eas.json` build.production.env.EXPO_PUBLIC_API_BASE_URL = `https://airabynisarga.com` — one of the valid patterns per Expo docs. |
| **5. Native-diff** | n/a (release mode) | Skipped per skill spec — check applies to OTA mode only. |
| **6. Store metadata** | pass (updates only, listings exist) | iOS: App Store Connect `6783242682` "AIRA by Nisarga" already published to TestFlight Internal; new build auto-processes into same track. Android: Play Console listing exists on Internal Testing track. No new metadata required for a version bump. |
| **7. `.easignore` present** | pass | File exists at workspace root — required per S0 EAS init runbook to keep `.pnpm-store/`, `.cache/`, and other Replit-clutter out of the EAS Build tarball. |
| **8. Firebase (FCM V1) credentials** | pass | User confirmed via dashboard: FCM V1 service account key uploaded to EAS credentials → Android. Paired with `google-services.json` at `apps/mobile/google-services.json` (committed `796c5a8`, package_name matches `com.airabynisarga.app`). |

## Decision

**Native build required** — this release is composed of Firebase config addition, plugin install (`expo-intent-launcher`), Expo SDK patch bumps, React dedup at native level, and a version bump. Every one triggers "native build required" per the decision table. No path is OTA-eligible.

## Execution plan (awaiting confirm)

Two `eas` commands, both cost real money and reach users — each behind its own confirm gate per skill rules:

**Command 1 — build (both platforms):**
```bash
cd /home/runner/workspace/apps/mobile
EXPO_TOKEN="$EXPO_ACCESS_TOKEN" \
  EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli build --profile production --platform all --non-interactive
```

Cost: EAS Build minutes (both platforms in parallel; typical ~15-25 min each). Charged against your Expo plan (free tier includes some builds; paid tiers have larger allowances).

**Command 2 — submit (after build succeeds):**
```bash
cd /home/runner/workspace/apps/mobile
EXPO_TOKEN="$EXPO_ACCESS_TOKEN" \
  EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli submit --profile production --platform all --non-interactive
```

Cost: nothing (submission is free; Apple/Google fees are separate ongoing). Uploads to App Store Connect TestFlight (iOS review typically 24-48h for first version, shorter for updates) and Play Console Internal Testing (usually < 1h).

## Sources

- CLAUDE.md — "The command that actually publishes" runbook note (mobile dir + EAS_PROJECT_ID env var required for non-interactive).
- `docs/operations/eas-build-runbook.md` — S0 EAS init runbook (all the Replit + pnpm gotchas already handled via `.easignore` + `.npmrc`).
- `.mstack/releases/2026-07-29-0856/report.md` through `2026-07-30-1740/report.md` — 7 OTAs shipped this session, all now embedded in build 9.
- Roadmap line 20 (Sprint 0 open item, "EAS production rebuild required after F21's expo-notifications config-plugin add") — CLOSING with this release.

## Follow-ups (to backlog after build ships)

- **Wire Sentry** (`@sentry/react-native` + config plugin) — deferred from this bundle per user decision. Requires DSN from a Sentry project. Next-rebuild candidate.
- **Update CLAUDE.md's "Current runtime in the field"** line to `0.1.2` on build 9 once native lands.
- **Update roadmap** to close Sprint 0's EAS-rebuild item and add the missing Firebase setup step to the runbook.
- **Reset expo-doctor's Metro warning** — worth checking if Expo has since offered a supported way to express monorepo `watchFolders` without tripping the check; if not, add `expo.doctor.reactNativeDirectoryCheck` config to silence.
- **Remove auth-debug + push-debug logging** in `apps/web/src/app/api/auth/[...all]/route.ts` + `packages/services/src/notifications/push-to-user.ts` after 24-48h of clean push + sign-out reports.
