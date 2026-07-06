# Report: Mobile — My Profile screen (email + password) + drop avatar crop step

**Date:** 2026-07-06
**Review:** [2026-07-06-mobile-my-profile-and-avatar-nocrop](../../reviews/2026-07-06-mobile-my-profile-and-avatar-nocrop.md)
**Branch:** main
**Status:** complete

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Wire `requestEmailChange` API + `useRequestEmailChange` hook | ✓ done | `512f621` |
| 2 | Add hub row + new `/account/profile` screen | ✓ done | `df096aa` |
| 3 | Drop the avatar crop step | ✓ done | `e149736` |

## Commits

- `512f621` — feat(mobile): wire requestEmailChange API + useRequestEmailChange hook
- `df096aa` — feat(mobile): add /account/profile screen with email + password + name
- `e149736` — fix(mobile): drop the crop step from the avatar picker

## What shipped

- Mobile Account hub now shows "My Profile" as the first row of the
  sub-page card, above Favorites, with the `account-outline` glyph
  and a trailing chevron.
- `/account/profile` renders four Cards: Photo, Display name, Email,
  Password.
  - Photo: reuses the shared `usePickAndUploadAvatar` mutation — the
    same hook the hub avatar hero uses. Success toast "Avatar updated".
  - Display name: seeded from `useMe`, Save disabled until dirty,
    calls `useUpdateProfile`, invalidates `["auth","me"]` so the hub
    hero re-renders after Save.
  - Email: shows the current address with a "Not verified" pill when
    `useMe().data.emailVerified === false`. New-email input +
    "Send confirmation" button calls the new
    `useRequestEmailChange` hook. Distinct toast copy for the
    `changed:true` vs `changed:false` branches.
  - Password: Current + New (`PasswordInput`s with the show/hide eye
    toggle). "Signs you out of other devices" copy lives in
    `CardDescription`. Wrong-password error surfaces the server's
    intentionally-generic message inline under Current — preserves
    the enumeration-oracle guard.
- Avatar picker no longer opens the iOS crop step: one flip in
  `pickAvatarFromLibrary` (`allowsEditing:false`, drop `aspect`).
  Applies to both entry points (hub hero + profile screen).

## Follow-ups

- **Universal Links for the email confirmation URL.** Tapping the
  Better Auth link in the mailbox still lands the user in the
  browser (or on the web app). Deep-linking it back into Expo is
  a separate concern; leave as a P3 item.
- **Server-side avatar smart-crop.** With `allowsEditing:false`,
  portrait-oriented photos may sit off-center in the circular
  `Avatar` frame. Worth checking in QA. If it shows up, add a
  `sharp`-based center-crop pass at `/api/v1/avatar`.
- **Rate-limit / 429 UX on email change.** Better Auth throttles
  repeated `changeEmail` calls. The existing `ApiError.message`
  currently bubbles up via toast; if QA sees frequent 429s a
  dedicated "Try again in Ns" copy can land later.

## Recommended next step

`/mlabs-qa` focused on: (a) the four flows on `/account/profile`
end-to-end, (b) the avatar picker on both entry points to confirm no
crop step remains, (c) the hub row navigation.
