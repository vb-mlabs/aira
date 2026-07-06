# Review: Mobile — My Profile screen (email + password) + drop avatar crop step

**Date:** 2026-07-06
**Slug:** 2026-07-06-mobile-my-profile-and-avatar-nocrop
**Plan reviewed:** [2026-07-06-mobile-my-profile-and-avatar-nocrop.md](../plans/2026-07-06-mobile-my-profile-and-avatar-nocrop.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (Opus 4.7) via `/mlabs-review`

---

## Summary

Plan is ready to implement with five recorded corrections. Three were
correctness issues surfaced by reading the actual op code and mobile
primitives: the icon name `person-outline` doesn't exist in
MaterialCommunityIcons (fixed to `account-outline`), the password op
throws `profile.password_rejected` not `password.wrong_current`, and the
op's error message is intentionally generic as an enumeration-oracle
guard — so mobile surfaces `ApiError.message` verbatim rather than
rewriting the copy. Two were scope tightenings: dropping the
Confirm-New-Password field for web parity (the existing `PasswordInput`
show/hide toggle already mitigates the mobile-typo risk that motivated
it), and adding the near-free "Not verified" chip since `useMe` already
returns `emailVerified`. No new deps. Zero web-side files touched, so
`UI-Significant: no`.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan uses `person-outline` for the hub row icon. That
  glyph name doesn't exist in `MaterialCommunityIcons` — it's an
  Ionicons / Feather naming, not MCI.
  **Decision:** Use `account-outline`. Matches MCI naming + the flat
  outlined weight of the other hub row icons (`heart-outline`,
  `store-outline`, `bell-outline`, etc.).

- **Concern:** Plan says surface `password.wrong_current` inline. The
  actual op at `apps/web/src/server/operations/users.ts:224` throws
  `ApiError.badRequest("profile.password_rejected", ...)`. The op's
  code comment at :219 makes the intent explicit: "Keep the message
  generic to avoid an enumeration oracle."
  **Decision:** Match the op's error code (`profile.password_rejected`)
  and surface `ApiError.message` **verbatim** inline under the Current
  Password field. Do not rewrite the copy on the client. Preserves the
  server-side security guard.

- **Concern:** Plan puts the "Changing your password signs you out
  everywhere else" copy below the button. Web `SecuritySection` puts
  it as the `SectionCard` *description* at the top of the section
  (see `apps/web/src/features/profile/components/security-section.tsx:20`).
  **Decision:** Put the copy as the mobile section's `CardDescription`
  at the top of the Password Card. 1:1 with web.

- **Concern:** Plan adds a Confirm-New-Password field not on web. The
  existing `PasswordInput` component
  (`apps/mobile/components/ui/PasswordInput.tsx`) already renders a
  show/hide eye toggle — the typo-risk motivation for the confirm
  field is mitigated.
  **Decision:** Drop the Confirm field. Password Card renders two
  `PasswordInput`s (Current + New) plus the "Change password" button.
  Client-side gate: New must be ≥8 chars before enabling the button.

- **Concern:** Plan defers the "Not verified" chip to a follow-up.
  `useMe` already returns `emailVerified` (verified at
  `apps/mobile/features/auth/api.ts:31`), so the chip is
  approximately three lines of JSX.
  **Decision:** Include it. Render a small "Not verified" pill next
  to the current-email text when `emailVerified === false`. No chip
  when verified — matches web's "quiet when it's fine" pattern.

### Suggestions (taken or deferred)

- **Taken** — Mirror web's `SectionCard` shape via mobile `Card` +
  `CardHeader` + `CardDescription` + `CardContent` for each of the
  four sections. `Card.tsx` already exports these primitives; using
  them keeps the visual rhythm consistent with the profile-hero-then-
  cards pattern the plan already implies.

- **Deferred** — Server-side square-crop of avatars (called out in
  the plan's "Out" list). Verify in QA after T2 lands whether
  portrait-oriented uploads look off-center in the circular
  `Avatar` frame; if yes, open a follow-up plan for a smart-crop
  pass at `/api/v1/avatar`.

- **Deferred** — Rate-limit copy for `changeEmail`. Better Auth
  throttles repeated requests; existing `ApiError.message` bubbles
  up via toast. If 429s become common in QA, a dedicated "Try again
  in N seconds" toast can land as a follow-up.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- Hub row icon: `account-outline`.
- Password error: surface `ApiError.message` **verbatim** inline
  under the Current Password field. Do not rewrite copy on the client.
- Password Card layout: two fields (Current + New), no Confirm.
  "Signs out other devices" copy goes in `CardDescription`, not
  below the button.
- Email Card: render "Not verified" pill next to current-email text
  when `useMe().data.emailVerified === false`; render nothing when
  verified.
- Sections wrapped as `Card` + `CardHeader` (with `CardTitle` +
  optional `CardDescription`) + `CardContent`.
- Toast copy locked (subject to reviewer nit later):
  - Avatar upload success: "Avatar updated" (existing).
  - Name save success: "Name updated".
  - Email change → `changed: true`: "Check your inbox at
    *&lt;currentEmail&gt;* to confirm the change."
  - Email change → `changed: false`: "That's already your email."
  - Password change success: "Password changed. Other devices signed
    out."

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit).

### Task 1: Wire `requestEmailChange` API + hook

- **Files:**
  - `apps/mobile/features/profile/api.ts` (edit — add
    `requestEmailChange({ email })`)
  - `apps/mobile/features/profile/hooks.ts` (edit — add
    `useRequestEmailChange`)
- **What:** Add a thin `apiPost` wrapper for `POST /api/v1/profile/email`
  returning `{ ok: true; changed: boolean }` (matches the op's output
  schema at `apps/web/src/server/operations/users.ts:136-142`). Export
  a `useRequestEmailChange` mutation that invalidates
  `["auth", "me"]` only when the response's `changed === true`
  (avoids a spurious refetch on the no-op branch).
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` clean.
  - `pnpm --filter @aira/mobile lint` clean.
  - `useRequestEmailChange` importable from
    `apps/mobile/features/profile/hooks`.

### Task 2: Add hub row + new `/account/profile` screen

- **Files:**
  - `apps/mobile/app/(app)/account/index.tsx` (edit — insert new first
    `HubRow` above Favorites with icon `account-outline`, label
    "My Profile", `onPress` → `router.push('/account/profile')`)
  - `apps/mobile/app/(app)/account/profile.tsx` (new — the screen)
- **What:** Insert the "My Profile" row as the first row of the
  sub-page card in `account/index.tsx`. Create `profile.tsx` — a
  stack screen with `Stack.Screen options={{ title: "My Profile" }}`,
  wrapped in `SafeAreaView edges={["bottom"]}` and a `ScrollView`
  matching the sibling stack screens' pattern (see
  `apps/mobile/app/(app)/account/favorites.tsx` and `.../privacy-security.tsx`
  for reference). The screen renders four `Card` sections in this
  order:
  1. **Avatar Card** — `Avatar` component + "Change photo" `Button`
     that calls `usePickAndUploadAvatar` and shows toast
     "Avatar updated" / error message via existing pattern.
  2. **Display Name Card** — controlled `Input` seeded from
     `useMe().data.name`. "Save" `Button` disabled until value
     differs from current; calls `useUpdateProfile({ name })`;
     success toast "Name updated".
  3. **Email Card** — read-only current email text. Show a small
     "Not verified" pill next to the email when
     `useMe().data.emailVerified === false`. Below: `Input`
     (`keyboardType="email-address"`, `autoCapitalize="none"`) +
     "Send confirmation" `Button` calling
     `useRequestEmailChange({ email })`. On `changed: true` → toast
     "Check your inbox at *<current>* to confirm the change." + clear
     the new-email field. On `changed: false` → toast
     "That's already your email." (no clear). On `ApiError` → toast
     with `err.message`.
  4. **Password Card** — `CardDescription`: "Changing your password
     signs you out on all other devices." Two `PasswordInput`s
     (Current, New). "Change password" `Button` disabled until New is
     ≥8 chars. On submit calls `useChangePassword({ currentPassword,
     newPassword })`. On success → toast "Password changed. Other
     devices signed out." + clear both fields. On `ApiError` → set
     inline error on the Current Password field via
     `PasswordInput`'s `error` prop, surfacing `err.message` verbatim.
- **Acceptance:**
  - Hub renders the new row as the first row of the sub-page card.
  - Tapping it pushes the profile screen with header "My Profile".
  - All four Cards render in the specified order.
  - All four success/error paths fire the correct toast or inline
    error copy per the "Decisions locked" section.
  - `pnpm --filter @aira/mobile typecheck` clean.
  - `pnpm --filter @aira/mobile lint` clean.
- **Pause if:**
  - `changePasswordOp`'s error code differs from
    `profile.password_rejected` when actually hit — bubble up the
    real code + message and ask before rewriting client copy.
  - Turns out the "Not verified" chip needs a design primitive we
    don't have — pause rather than inventing a new UI shape.

### Task 3: Drop the avatar crop step

- **Files:**
  - `apps/mobile/features/avatar/api.ts` (edit)
- **What:** In `pickAvatarFromLibrary`
  (`apps/mobile/features/avatar/api.ts:17-22`) set
  `allowsEditing: false` and delete the `aspect: [1, 1]` line. Keep
  everything else (permission check, size cap, upload). No other
  files change.
- **Acceptance:**
  - Tapping the avatar (from either the hub hero or the profile
    screen's Avatar Card) picks a photo and immediately uploads —
    no iOS crop step in between.
  - Success toast "Avatar updated" still fires from the calling
    screen's mutation handler.
  - Permission-denied path unchanged.
  - Size-limit path unchanged.
  - `pnpm --filter @aira/mobile typecheck` clean.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- None. All plan open-questions were resolved during review. Server-
  side avatar smart-crop is intentionally deferred to a follow-up
  after post-T3 QA.
