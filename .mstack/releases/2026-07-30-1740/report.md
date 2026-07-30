# Release — ota 2026-07-30 17:40

**App:** aira-mobile · **Platform:** both (iOS + Android) · **Channel:** production
**Mode:** ota
**Status:** shipped (mobile side only — server side needs web Publish to complete)
**Versions:** version 0.1.1 · runtimeVersion 0.1.1 (policy: appVersion)
**Commit:** `38c7cf5` (pushed to `origin/feat/business-logo`)
**Update group:** `e1ac05b8-464a-4c3c-a347-6a14414c8365`
**Dashboard:** https://expo.dev/accounts/million-labs/projects/aira-mobile/updates/e1ac05b8-464a-4c3c-a347-6a14414c8365

## Scope

User report: "push notifications delivered, in-app updates show up, but no notification on mobile lock screen / notification tray at all."

Root cause identified in code inspection:

- Server-side `ExpoPushMessage` (both `push-to-user.ts` and `push.ts`) had no `channelId` and no `priority`.
- Client-side had zero `Notifications.setNotificationChannelAsync` calls anywhere.

Since Android 8+ requires notifications to attach to a Notification Channel (or Expo auto-creates one at `IMPORTANCE_DEFAULT`, which suppresses heads-up + lock-screen wake + reliable sound), every Android AIRA user has been receiving degraded pushes since F21 push shipped.

## Changes

- **`apps/mobile/lib/notification-tap.ts`** — added `Notifications.setNotificationChannelAsync("default", {…IMPORTANCE_HIGH, PUBLIC lockscreen, sound, vibration…})` inside `installNotificationHandlers`, gated to `Platform.OS === "android"`. Idempotent.
- **`packages/services/src/notifications/push-to-user.ts`** — per-user push message now carries `priority: "high"` + `channelId: "default"`.
- **`packages/services/src/notifications/push.ts`** — admin broadcast push message same treatment.

## OTA vs web-publish split

- **Mobile channel creation** ships via this OTA (`e1ac05b8`), reaches users on next cold launch (2 launches for Expo Updates' `ON_LOAD` policy).
- **Server-side `channelId` / `priority`** requires the next **Replit Publish** on `apps/web` to take effect. Until then, mobile creates the HIGH channel but server pushes still don't reference it — Android behavior UNCHANGED until web Publish.

**Both need to land** before Android users see the fix. The OTA alone is not sufficient.

## Preflight

| Check | Result |
|---|---|
| Git state | pass — pushed at `38c7cf5` |
| Versioning | pass — version 0.1.1, runtimeVersion policy `appVersion`, matches native build 8 |
| Native-diff since native build 8 | pass — JS-only channel-setup call; no plugin/permission changes |
| Typecheck (mobile + services) | pass |
| Services tests | pass (70/70) |

## Decision

OTA — no native module/permission changes. iOS still needs `NSUserNotificationUsageDescription` etc, all already present from `expo-notifications` plugin in `app.config.ts`. Nothing new on the native side.

## Verification path

Two-step:

1. **This OTA** reaches Android users → mobile creates the HIGH channel on next cold launch.
2. **Next Replit web Publish** ships the `channelId + priority` server-side.

Only after BOTH does the Android fix take effect. Until then, behavior is unchanged (server sends untagged push → Android auto-channel remains DEFAULT).

Post-both-shipped verification:
- Fresh Android install: push arrives, heads-up notification banner appears + lock screen wakes.
- Existing Android install: may need Settings > Apps > AIRA > Notifications > Reset to pick up the HIGH channel (Android preserves user-modified per-channel prefs even when we upgrade importance from the app side).

Server-side log evidence (post-web-publish): Expo delivery tickets should return normally with no new error codes.

## Follow-ups

- **Confirm with the reporting user which platform they're on** — pending answers to the diagnostic message queued earlier. If iOS, this fix doesn't apply to them and we need to check per-user iOS notification settings.
- **Web Publish** carries: this commit's server-side changes (`push-to-user.ts` + `push.ts`) + prior deferred commits (`28f18d3` adapter fix, `7ecb4db` auth-debug logging).
- **After 24-48h**, if Android users report notifications working: remove the auth-debug logging (separate follow-up, backlogged).
- **Existing-install upgrade UX**: consider adding a one-time toast on first launch after this OTA telling Android users to reset notification settings if they're not receiving heads-up alerts. Deferred — probably not worth the friction; most people will notice fine after a few pushes.

## Sources

- `packages/services/src/notifications/push-to-user.ts:80-90` (log for `push_to_user] EXPO_ACCESS_TOKEN missing` — proved delivery pipeline works when token was set earlier this session).
- Expo docs / RN docs on Android notification channels + IMPORTANCE_DEFAULT vs HIGH.
- No prior fixes for this — first time we're addressing Android notification priority.
