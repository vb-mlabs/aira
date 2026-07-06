# Plan: Mobile — My Profile screen (email + password) + drop avatar crop step

**Date:** 2026-07-06
**Slug:** 2026-07-06-mobile-my-profile-and-avatar-nocrop
**Status:** reviewed
**Author:** Claude (Opus 4.7) via `/mlabs-plan`

---

## Problem

The mobile Account hub today has no way to change email or password. Both
were dropped in P2c as "no-op stubs deferred to P3 polish" (see
[2026-06-29-mobile-parity-p2c-account-hub.md](./2026-06-29-mobile-parity-p2c-account-hub.md)
lines 111–115). Web has both flows at `/profile`
(`AccountSection` + `SecuritySection`). Anyone testing on TestFlight
who wants to rotate their password or move to a new email currently has
to open the web app.

Second, unrelated fit-and-finish issue folded in: the avatar picker
today opens the iOS crop UI after selection (`allowsEditing: true` at
`apps/mobile/features/avatar/api.ts:19`). The extra crop step reads as
friction — a picker that shows the photo, then makes the user re-frame
it. The clean UX is pick → upload → done, one tap fewer.

Who benefits: every signed-in mobile user. Wedge: **close the last two
account-management gaps blocking TestFlight** (email/password rotation
+ avatar pick friction).

## Scope

**In:**

- **Hub row.** New first row in the sub-page card at
  `apps/mobile/app/(app)/account/index.tsx`, above Favorites:
  `person-outline` icon, label "My Profile" → `router.push('/account/profile')`.
  Avatar hero + tap-to-pick behavior unchanged.

- **New screen `/account/profile`.** Single `ScrollView` with four
  `Card`-wrapped sections in this fixed order:
  1. **Avatar** — reuses the existing `usePickAndUploadAvatar` hook
     (same code path as the hub hero tap). Renders `Avatar`
     component + "Change photo" button below it.
  2. **Display name** — controlled `Input`, "Save" button disabled
     until dirty. Calls `useUpdateProfile({ name })`; success toast
     "Name updated"; invalidates `["auth", "me"]` so the hub hero
     re-renders.
  3. **Email** — shows current email as read-only text, plus a "New
     email" input + "Send confirmation" button. Calls a new
     `useRequestEmailChange({ email })` hook. On `changed: true`:
     toast "Check your inbox at *current@x.com* to confirm." On
     `changed: false` (no-op short-circuit): toast "That's already
     your email." User stays on the screen either way.
  4. **Password** — three fields (Current, New, Confirm-new) using
     `PasswordInput`. Client-side gate: new + confirm must match
     and be ≥8 chars before enabling the "Change password" button.
     Calls the existing `useChangePassword` hook. Success toast
     "Password changed. Other devices signed out." Explanatory
     helper text below the button matches the copy on web:
     "Changing your password signs you out on all other devices."

- **API + hook wiring gap.** Add `requestEmailChange({ email })` to
  `apps/mobile/features/profile/api.ts` — thin wrapper around
  `POST /api/v1/profile/email` returning `{ ok, changed }`. Add
  `useRequestEmailChange` to `apps/mobile/features/profile/hooks.ts`
  — a `useMutation` that invalidates `["auth", "me"]` only when
  `changed === true` (avoids a spurious refetch on no-op).

- **Kill the avatar crop step.** Edit
  `apps/mobile/features/avatar/api.ts:17-22`:
  - `allowsEditing: true` → `allowsEditing: false`
  - Drop the `aspect: [1, 1]` line (moot when editing is off).
  Everything else (permission check, size cap, upload, toast) is
  already correct. Zero new code — one `ImagePicker` options flip.

**Out (deferred):**

- **Deep-link back into the app from the email-confirmation URL.**
  When the user taps the confirmation link in their inbox, they
  land in the browser (or Universal Links → web) as they do
  today. Making that link open Expo directly is a Universal
  Links / associated-domains follow-up, separate concern.
- **Server-side center-crop of un-cropped avatars.** Removing
  `allowsEditing` means portrait-oriented photos may appear
  off-center in the circular `Avatar` frame — the user hasn't
  reframed them. If this becomes visible in QA, add a smart-crop
  pass in the `/api/v1/avatar` route later. Not in this plan.
- **MFA / TOTP.** Dropped from MVP per project memory.
- **Danger Zone parity.** Web's `/account/privacy-security` has
  Delete Account; mobile hub already has it as a separate row.
  Not touching that.
- **Name-form parity with web's optimistic-update pattern.** Web
  `AccountSection` uses `useRouter().refresh()` after the mutation;
  mobile relies on TanStack Query invalidation. Different but
  equivalent — no change needed.
- **Rate-limit UX for email change.** Better Auth throttles
  repeated `changeEmail` calls; if the server returns 429 the
  existing `ApiError.message` surfaces on the form. No dedicated
  copy for the 429 case in this plan.

## Approach

Two atomic commits. Each leaves the app in a working state.

**T1 — My Profile screen wired end-to-end.**

Adds the hub row, the new stack screen, the missing API wrapper +
hook, and the four sections. Reuses every primitive already in
`apps/mobile/components/ui/` (`Card`, `Input`, `PasswordInput`,
`Button`, `Toast`) — nothing new added to `components/ui`. Reuses
`useMe`, `useUpdateProfile`, `useChangePassword`,
`usePickAndUploadAvatar` from their existing homes. Only new code
paths: `requestEmailChange` API + `useRequestEmailChange` hook.

Rationale for a single-screen layout (not sub-hub): matches web
`/profile` shape 1:1, minimises route surface, and the whole thing
scrolls in one thumb-flick. Locked with the user during
consultation.

Rationale for the row placement (first row of the sub-page card,
above Favorites): user's exact ask ("at the top"). Preserves the
avatar hero as-is above it — no restructure of what's working.

**T2 — Kill the avatar crop step.**

One-line change in
`apps/mobile/features/avatar/api.ts`. Kept as its own commit so it
can be reverted independently if a crop step turns out to be
wanted after user testing. `usePickAndUploadAvatar` is unchanged
— it still uploads whatever asset `pickAvatarFromLibrary` returns,
so removing the editing step just means the returned asset is the
original photo, not a cropped one.

**Alternatives considered:**

- **Mini-hub `/account/profile` → sub-screens
  `/profile/email` + `/profile/password`.** Rejected during
  consultation. More nav depth for zero gain; web ships a single
  scrolling screen and we should too.
- **Fold Delete Account into the new profile screen** (matching
  web's `/account/privacy-security`). Rejected — mobile hub
  already exposes Delete Account as a first-class destructive
  row, no reason to duplicate.
- **Add an email-verification-pending banner to the hub hero.**
  Rejected — cleaner to keep the state ephemeral (toast on
  submit, user acts in their inbox). A persistent banner would
  need a server-side pending flag we don't have.
- **Add a server-side square-crop pass to `/api/v1/avatar` at
  the same time as T2** (to close the loop on the "off-center
  portrait photo" edge case). Rejected as premature — remove
  the crop UI first, see if it actually shows up in QA. Adds
  server work + a new dep (sharp/image-processing) if we go
  down that path.

## Data model changes

None. All ops + schemas exist on the wire
(`requestEmailChangeOp` and `changePasswordOp` at
`apps/web/src/server/operations/users.ts:131` and `:186`;
avatar upload at `/api/v1/avatar`).

## Files to touch

**New:**

- `apps/mobile/app/(app)/account/profile.tsx` (T1 — the new screen)

**Edit:**

- `apps/mobile/app/(app)/account/index.tsx` (T1 — insert `person-outline`
  "My Profile" as the first row of the sub-page card)
- `apps/mobile/features/profile/api.ts` (T1 — add `requestEmailChange`)
- `apps/mobile/features/profile/hooks.ts` (T1 — add `useRequestEmailChange`)
- `apps/mobile/features/avatar/api.ts` (T2 — flip `allowsEditing: false`,
  drop `aspect`)

## Edge cases

- **`changed: false` no-op.** User types their current email and
  submits. Server returns `{ ok: true, changed: false }`. UI
  surfaces a distinct toast ("That's already your email") and
  does NOT show the "check your inbox" copy — matches web's
  behavior at `AccountSection.EmailForm`. Confirmed by
  reading the op body at
  `apps/web/src/server/operations/users.ts:146-148`.
- **`password.wrong_current`.** `changePasswordOp` throws with
  code `auth.wrong_password` when Better Auth rejects the current
  password. Surface `ApiError.message` inline under the Current
  Password field, not as a toast. Preserves web parity — web
  `SecuritySection` puts the error inline via the `feedback` state
  at line 78.
- **Rate limit / Better Auth throttling on `changeEmail`.** If
  the server returns 429, catch the `ApiError` and surface its
  message via toast. No client-side retry.
- **Password confirm mismatch.** Client-side check — button
  disabled until New === Confirm. No server round-trip needed.
- **Signed-out-mid-form scenario.** If the auth session expires
  while the user is filling in either form, the underlying
  `apiRequest` returns 401 → the mobile `apiRequest` wrapper
  already routes to `/(auth)/welcome`. No special handling
  needed on the profile screen.
- **Avatar tap without library permission.** Existing behavior
  preserved by T2: `pickAvatarFromLibrary` still throws a
  `permission_denied` `ApiError` and the hub toast catches it.
  T2 doesn't touch the permission path.
- **Portrait / landscape avatar with editing off.** Aspect-ratio
  mismatch is CSS-clipped by `Avatar`'s circular frame — the
  center of the photo is what shows. Acceptable per the plan's
  scope. Flagged for QA to visually confirm.
- **Hub hero doesn't refresh after Name save.** `useUpdateProfile`
  already invalidates `["auth", "me"]`, and the hub reads via
  `useMe()`. Verified in the existing `useUpdateProfile` at
  `apps/mobile/features/profile/hooks.ts:4-10`.
- **Two rapid submits on the email form.** TanStack mutation
  gates concurrent runs; second click while first pends is a
  no-op. No debounce needed.
- **`emailVerified` state on the hub or profile.** Web's
  `AccountSection` shows a "Not verified" chip next to the
  current email. Mobile doesn't today. NOT adding it in this
  plan — separate concern, leave for a follow-up. Flag as
  open question for reviewer.

## Acceptance criteria

- [ ] The Account hub shows "My Profile" as the first row of the
  sub-page card, above Favorites, with the `person-outline` icon
  and a trailing chevron.
- [ ] Tapping "My Profile" pushes a stack screen titled "My Profile".
- [ ] The profile screen renders four sections in order: Avatar,
  Display name, Email, Password.
- [ ] Tapping the Avatar section's "Change photo" button picks a
  photo and uploads it without opening the crop step. The hub
  hero + profile screen avatar both update on success.
- [ ] Editing the Display name and tapping Save updates the name
  server-side; success toast fires; hub hero re-renders with the
  new name after `["auth", "me"]` invalidation.
- [ ] Submitting the Email form with a new address fires a toast
  "Check your inbox at *current@x.com* to confirm" and keeps
  the user on the screen. The form clears the new-email field.
- [ ] Submitting the Email form with the current address fires
  a distinct toast "That's already your email" and does NOT show
  the "check inbox" copy.
- [ ] Submitting the Password form with a valid current +
  matching new + confirm rotates the password, fires success
  toast, and (validated separately) signs out other sessions
  server-side.
- [ ] Submitting the Password form with a wrong current password
  surfaces an inline error under the Current Password field.
- [ ] `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean
  after each of T1 and T2.
- [ ] Verified on Expo Go: full walkthrough of avatar pick →
  no crop → uploaded; name save; email change request; wrong-
  password error; successful password change.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Hub row icon.** `person-outline` is the natural pick from
  `MaterialCommunityIcons` and reads as "you". Alternatives:
  `account-outline`, `account-circle-outline`. Reviewer locks.
- **`emailVerified` chip on the profile screen.** Web shows
  "Not verified" next to the current email. Mobile doesn't
  today. Recommendation: skip in this plan — one more thing to
  wire (`useMe` already returns `emailVerified`) but the wedge
  is "let me change my email/password", not verification-state
  visibility. Reviewer can push to include.
- **New-password strength meter.** Web has none — just
  `minLength=8`. Mobile matches for parity. Reviewer can push
  to add a meter, but that'd need a new primitive.
- **Toast copy for the confirmation email.** Recommended:
  "Check your inbox at *current@x.com* to confirm the change."
  Interpolates the current email so the user knows which inbox
  to open (their old one, not the new one). Reviewer locks
  exact copy.
- **Confirm-new-password field.** Web `SecuritySection` doesn't
  have one — just Current + New. Mobile plan adds a third field
  because a typo on mobile keyboards is easier than on web. If
  reviewer wants exact web parity, drop the field (small T1
  scope reduction).
- **Split T1 further?** T1 could split into "hub row + skeleton
  screen" and "wire each section". Recommendation: keep as one
  commit — the sections are small and the screen isn't useful
  half-wired. Reviewer can push to split.
