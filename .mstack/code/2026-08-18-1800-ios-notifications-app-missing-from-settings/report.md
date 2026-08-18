# Implementation report — iOS notifications re-trigger banner

**Status:** complete
**Branch:** `fix/mobile-notifications-re-trigger-banner` (off `feat/business-logo` tip)
**Debug source:** [../../debug/2026-08-18-1800-ios-notifications-app-missing-from-settings/report.md](../../debug/2026-08-18-1800-ios-notifications-app-missing-from-settings/report.md)

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Add Enable-notifications banner on /account/notifications | ✓ done | `767648e` |
| 2 | Verify — run the failing debug spec, confirm it passes | ✓ done | — (verification) |

## Commits (this run)

- `d4df7b1` chore(mstack): debug report + learning for iOS notifications missing-from-settings
- `767648e` fix(mobile/push): Enable-notifications banner on /account/notifications

## Verification

- `pnpm --filter @aira/mobile exec tsc --noEmit` → 0 errors
- `cd .mstack/debug/2026-08-18-1800-.../specs && npx vitest run` → 1 passed
- lefthook `check-contrast` + `check-migrations` passed on the fix commit

## Follow-ups

- **Manual on-device confirmation** (Android + iOS): install the resulting
  OTA on a phone that previously tapped "Maybe later"; open the app →
  Account → Notifications → confirm the banner appears → tap **Enable** →
  iOS system prompt fires → after allow/deny, open Settings →
  Notifications and confirm AIRA is listed.
- **Consider raising the pre-prompt's floor.** The pre-prompt still exists
  and its "Maybe later" branch still skips the OS call. That is fine now
  because the banner provides a permanent re-trigger path, but a future
  UX pass could tweak the pre-prompt copy or drop it in favour of a
  permission-request tied to the first meaningful action.
- **Android parity.** On Android 13+ the notification permission also
  requires an OS request; the banner will fire for Android too since it
  reads `Notifications.getPermissionsAsync()` (platform-agnostic). No
  Android-specific code needed, but worth a manual check.

## Recommended next step

Ship it as an OTA on runtime `0.1.2`:

```
cd apps/mobile
EAS_PROJECT_ID="21065081-2afd-43d4-aef7-7ce10de55a8b" \
  pnpm dlx eas-cli update --branch production \
  --message "fix(mobile/push): enable-notifications banner on /account/notifications"
```

After the OTA lands, update the "Current runtime in the field" line in
`CLAUDE.md` per the repo's convention.

Optionally run `/mlabs-qa` focused on the notifications flow to
scenario-test the banner before publishing.
