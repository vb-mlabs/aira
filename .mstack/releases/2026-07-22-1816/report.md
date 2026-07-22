# Release — ota (aborted) 2026-07-22 18:16

**App:** AIRA (`com.airabynisarga.app`) · **Platform:** both · **Channel/profile:** production
**Mode:** ota
**Status:** no-go (aborted at preflight, awaiting user decision on runtime coherence)
**Versions:** repo says `version 0.1.1` · users on runtime `0.1.0`
**Commit:** `a916fd5` · **Update IDs:** — (nothing published)

## Preflight

| Check | Result | Evidence |
|---|---|---|
| EAS auth | ✅ pass | `vinod@millionlabs.co.uk` (owner: vb-mlabs, dev: million-labs) |
| Git state | ✅ pass | tree clean apart from untracked screenshot assets |
| Native-diff since last OTA | ✅ pass | 12 mobile-touching commits since `b4d5217`, all JS/TS only; no plugin, permission, entitlement, or Expo SDK change |
| **Runtime version coherence** | 🚫 **fail** | Last two OTAs pushed on runtime `0.1.0` 1 week ago. Current repo has `version: "0.1.1"` at `apps/mobile/app.config.ts:16`, and `runtimeVersion.policy = "appVersion"`. Publishing today would target `0.1.1` — installed apps are on `0.1.0` → nobody receives the update |
| expo-doctor | ⚠️ 3 findings (pre-existing) | metro config (intentional monorepo override); react duplicated at 19.1.0 + 19.2.4 (transitive via `use-sync-external-store`); patch mismatches (`expo@54.0.35` vs `~54.0.36`, `expo-updates@29.0.18` vs `~29.0.19`). Not release-blockers on their own, but worth cleaning up in a follow-up |
| Secrets per profile | not run | preflight aborted before this check |

## Decision

**No-go on OTA push.** The runtime-drift blocker is exactly the scenario the mstack-expo skill's Iron Rule warns about: "drift between them is how OTAs silently stop applying." Pushing here would produce a green terminal + an update group ID + zero user impact.

## Investigation of the 0.1.1 bump

Commit `b4d5217` on 2026-07-14 bumped `version: 0.1.0 → 0.1.1` for a new tree-of-life app icon + cream splash background. Commit message explicitly says "native rebuild required" — the icon (1024×1024 baked into the app) and the splash background color live natively, not in JS.

**What was supposed to happen:** an EAS Build + store submission on 0.1.1, users update from stores, then all future OTAs target 0.1.1.

**What actually happened:**

1. `b4d5217` bumped to 0.1.1 (2026-07-14, 8 days ago).
2. No native EAS Build + store submit for 0.1.1 has landed yet (or none reached users).
3. Meanwhile the last two OTAs (1 week ago) were pushed on runtime `0.1.0` — someone must have used `eas update --runtime-version 0.1.0` explicitly to bypass the repo's `appVersion` policy and reach installed users.
4. 12 mobile-touching commits since the bump haven't reached users at all (the runtime-0.1.0 override wasn't repeated after those two updates). These include:
   - `2f75373` category name resolution across web/mobile
   - `07526c4` SubcategoryPicker "Browse" prefix removal
   - `ceff44b` / `a916fd5` back-nav fixes
   - `591d6ef` back-href route-segment strip
   - `bb7684a` a11y font-size sweep
   - Sidebar texture fixes, listing polish, post detail TopBar, etc.

**Also unshipped since 0.1.1 bumped but before it:** the new native app icon + cream splash bg themselves are still not on any user's phone — they only reach users via a store update.

## Options for the user (recap)

1. **Push OTA with `--runtime-version 0.1.0` override.** Fast; today's changes + all backlogged JS reach every user. Doesn't fix the underlying drift.
2. **Bump repo `version` to `0.1.0` temporarily, push, re-bump.** Same user outcome; noisier git.
3. **Do a proper native EAS Build for `0.1.1` + store submit.** Correct fix. Users get everything (new icon, new splash, all 12+ JS commits) via store update. Takes 20–30 min per platform + Apple review lag.
4. **Bump to `0.1.2` first, native rebuild, submit.** Same as #3 but with a fresh version to signal accumulated changes. Cleaner story if the 0.1.1 rebuild was already promised to someone.

**Recommended next step:** option 3 or 4 — the accumulated backlog of unshipped JS changes plus the unshipped native icon/splash asset make a proper 0.1.x native release worth the ceremony. If speed is more important today, option 1 keeps users unblocked on the JS improvements while the native release gets scheduled.

## Sources

- EAS docs — Runtime Version + appVersion policy: https://docs.expo.dev/eas-update/runtime-versions/ — checked 2026-07-22.

## Follow-ups

- Investigate why the 0.1.1 native release never shipped after the icon bump (was it in progress? blocked on review? deprioritized?).
- Decide on the shipping path (option 1 vs 3 vs 4) and re-run `/mstack-expo` accordingly.
- Consider addressing pre-existing doctor findings in a follow-up branch (dedupe react, bump patches, review metro config comment).
- After the runtime coherence is restored, revisit `expo.monitoring: "none"` — pushing OTAs to production without Sentry is flying blind per the skill's guidance.
