# Debug — AIRA missing from iOS Settings → Notifications on some phones (no lock-screen push there)

**Started:** 2026-08-18 18:00
**Source:** user-report (attempted comment on the notifications issue ticket; posted in-thread instead)
**Env:** production (installed builds on iPhone 16 Pro / iPhone 17 Pro)
**Status:** implemented
**Investigator:** /mlabs-debug

## Symptom

Some users report they see no lock-screen notifications for AIRA. When they open
**Settings → Notifications** on their iPhone, AIRA does not appear in the list
at all. Other users on the same build see AIRA in that list and receive
notifications normally. The report calls out iPhone 16 Pro and iPhone 17 Pro
as the affected devices.

## Repro

1. Install the current production build of AIRA on iOS.
2. Sign in with a verified email for the first time.
3. When the "Stay in the loop" pre-prompt appears, tap **Maybe later** (or
   swipe the modal away).
4. Open **Settings → Notifications** on the phone.

**Expected:** AIRA appears in the list so the user can toggle notifications on
later.

**Actual:** AIRA does not appear in the list. No lock-screen push is ever
delivered, and there is no in-app way to trigger the OS permission request
after this point (the pre-prompt never fires again — see cause).

**Note on the device correlation:** iPhone 16 Pro / 17 Pro are a red herring.
The bug reproduces on every iPhone. Those users happened to tap "Maybe later"
(or their phones were set up in a way that never showed the pre-prompt in the
first place — e.g. no verified-email sign-in yet on that device). Users where
"it works" tapped **Enable notifications** on the pre-prompt at least once.

## Investigation

- `apps/mobile/lib/push.ts:48-86` — `requestPermissionAndRegister()` is the
  only wrapper that ever calls `Notifications.requestPermissionsAsync()` (line
  57). On iOS, that call is what makes the app appear in **Settings →
  Notifications**; without it, the OS has no record of AIRA as a
  notification-capable app.
- `grep` over `apps/mobile/**/*.{ts,tsx}` shows exactly one caller of
  `requestPermissionAndRegister(`:
  `apps/mobile/components/NotificationsPrePrompt.tsx:35`.
- `NotificationsPrePrompt.tsx:32-44` — `handleEnable()` (the "Enable
  notifications" button) awaits `requestPermissionAndRegister()`, which does
  reach the OS request.
- `NotificationsPrePrompt.tsx:46-49` — `handleLater()` (the "Maybe later"
  button) awaits `dismissPushPrePrompt()`, which sets a SecureStore flag and
  **never touches the Notifications API**.
- `apps/mobile/app/(app)/_layout.tsx:70-80` — the pre-prompt only mounts when
  `hasSeenPushPrePrompt()` returns false. `hasSeenPushPrePrompt()` returns
  true if either the "completed" or "dismissed" flag is set
  (`apps/mobile/lib/push.ts:92-102`). So the pre-prompt is a strict one-shot:
  once dismissed, it never fires again.
- `apps/mobile/app/(app)/account/index.tsx:22-26` — hub comment says the
  "Enable notifications" re-prompt row *moved to* `/account/privacy-security`
  in T6. Reading that screen
  (`apps/mobile/app/(app)/account/privacy-security.tsx`) shows only four
  external legal-link rows. There is no "Enable notifications" row and no
  import of `requestPermissionAndRegister`.
- `git show c9e43c0` (2026-08-04, "feat(mobile/privacy): summary + external
  legal links, drop in-app copy") is the commit that removed it. Its own
  message flags the regression:
  > Note: the "Enable notifications" push-permission row that lived on this
  > screen (relocated here in T6 from the Account hub) has been removed as
  > part of the content swap. **Follow-up needed to place it somewhere
  > sensible — most natural home is the /account/notifications inbox as a
  > "notifications aren't enabled — turn them on" banner.**

  The follow-up never landed. Nothing between 2026-08-04 and today adds a new
  caller.
- `grep` for `Linking.openSettings` / `openURL('app-settings:')` across the
  mobile app returns **no matches**, so there is not even a "deep link to iOS
  Settings" fallback for users who wandered off the pre-prompt.
- `apps/mobile/app.config.ts:92-109` — the `expo-notifications` plugin is
  registered, and the current in-field build is build 10 on runtime `0.1.2`
  (per CLAUDE.md), which was built after the plugin was added. So the plugin
  is definitely present in shipped binaries; this is not the "no push
  entitlement" regression from build 8.

## Root cause

**Since commit `c9e43c0` (2026-08-04), the AIRA mobile app has exactly one
code path — the first-run pre-prompt's "Enable notifications" button — that
ever calls `Notifications.requestPermissionsAsync()`, and that path fires at
most once per install.** Any user who tapped "Maybe later" (or dismissed the
modal), or who has not yet reached a verified-email session on their iPhone,
never causes iOS to register AIRA as a notification-capable app. As a direct
consequence, AIRA is absent from **Settings → Notifications**, and — because
APNs will refuse to deliver alerts to an app the user has not authorised —
no lock-screen pushes ever arrive. The removal was flagged as needing a
follow-up in the same commit message; the follow-up was never done.

The report singles out iPhone 16 Pro / iPhone 17 Pro, but the model is
incidental: the bug reproduces on every iOS device where the user did not
tap "Enable notifications" on the one-shot pre-prompt.

**Failing test:** `specs/repro.spec.ts` — asserts that at least one file
outside `lib/push.ts` and `NotificationsPrePrompt.tsx` references
`requestPermissionAndRegister(`. It fails today because grep returns zero
such files, which is the exact condition that leaves users stuck.

## Fix plan (for /mlabs-code)

**Approach:** Restore a manual re-trigger surface so users who did not opt in
on the pre-prompt can still enable notifications from inside the app. Do the
minimum needed to close the gap; do not redesign the pre-prompt or the
notifications feature.

The commit that removed the row proposed a banner on the notifications
inbox. That is the natural home because (a) it is the screen users open
when they wonder "why am I not getting notifications?", and (b) it already
sits under the Account hub's "Notifications" row.

**Files to change:**

- `apps/mobile/app/(app)/account/notifications.tsx` — at the top of the
  screen (above the `FlatList`, visible in both the loading and populated
  states, and inside the empty state), render an "Enable notifications"
  banner **iff** the OS permission is not currently `granted`. The banner:
  - Reads `Notifications.getPermissionsAsync()` on mount (and re-checks on
    focus via `useFocusEffect` from `expo-router`, so it disappears once the
    user grants permission in Settings and returns to the app).
  - Shows a short line ("Turn on lock-screen notifications to get updates
    about your listings and posts") and an **Enable** button.
  - **Enable** calls `requestPermissionAndRegister()` from
    `apps/mobile/lib/push.ts`. If the returned `RegisterResult` has
    `error === "Notifications are off for AIRA in Settings."` (i.e. iOS
    reports `!canAskAgain` — the user previously denied the system prompt so
    iOS won't re-ask), fall back to `Linking.openSettings()` so the user
    lands on AIRA's Settings page and can flip the toggle themselves.
  - If `granted` is true, render nothing (no banner).
  - Use existing colours from `useThemeColors()` / the tailwind preset — do
    not add new tokens. Keep it single-file; no new shared component.

**Why it fixes the cause:** Adds a second, always-reachable code path that
calls `Notifications.requestPermissionsAsync()` (via
`requestPermissionAndRegister`) for any signed-in user whose current OS
permission is not `granted`. On the first tap, iOS shows its permission
sheet and — regardless of allow/deny — registers AIRA in
**Settings → Notifications**, which is the missing prerequisite for
lock-screen delivery. For users who previously denied and can no longer be
re-asked in-app, `Linking.openSettings()` takes them one tap from the
correct Settings page.

**Hard-rule reminders:**

- No raw `process.env` — none needed here.
- No `apps/mobile` service imports — this is a pure mobile-app change; the
  push wrapper (`lib/push.ts`) already hits `/api/v1/profile/push-token`, so
  the client boundary is unchanged.
- Do not add a new dependency. `expo-notifications`, `expo-router`, and
  `react-native`'s `Linking` are already in `apps/mobile/package.json`.
- Not a native-code change (no `app.config.ts` edit, no plugin change, no
  entitlement change). Ships via **OTA** on runtime `0.1.2` per CLAUDE.md's
  EAS section — no store rebuild required.

**Acceptance:**

1. `cd .mstack/debug/2026-08-18-1800-ios-notifications-app-missing-from-settings/specs && npx vitest run`
   passes.
2. Manual repro on a phone that previously tapped "Maybe later": open the
   app → Account → Notifications → the "Enable notifications" banner is
   visible → tap **Enable** → iOS shows the system prompt → after
   allow/deny, open **Settings → Notifications** on the phone and confirm
   AIRA is listed. Original symptom no longer reproduces.

**Out of scope:**

- Reworking the pre-prompt copy or timing (the "Maybe later" behaviour is
  fine once a re-trigger surface exists).
- Adding a similar banner on Android (Android's notification model is
  different — the app appears in Settings from install; the `aira_alerts_v1`
  channel work at `lib/notification-tap.ts:96-111` already handles the
  Android-specific concern).
- Backfilling users who already denied the OS prompt at some point in the
  past — `Linking.openSettings()` is the only path iOS gives us; we surface
  it, users act on it.
- Any /account UX polish beyond the banner itself.

## External references

None — root cause is fully derivable from repo state and standard iOS
`UNUserNotificationCenter` behaviour that is already reflected in the
existing `lib/push.ts` implementation.
