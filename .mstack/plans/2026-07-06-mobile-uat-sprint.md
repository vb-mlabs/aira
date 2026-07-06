# Plan: Mobile UAT sprint — 4 issues from Radha's 2026-07-06 call

**Date:** 2026-07-06
**Slug:** 2026-07-06-mobile-uat-sprint
**Status:** draft
**Author:** claude

---

## Problem

Radha raised four mobile-only issues in the 2026-07-06 UAT call. Two
are bugs blocking real user flows (notifications modal stuck, composer
reload loop), one is a missing-feature gap (no way to edit email or
change password from the app), and one is a small UI polish
(subcategory picker vs verified-filter styling drift).

**Success** = all four resolved on the mobile app in a single sprint;
users can manage their credentials from Account, the notifications
pre-prompt completes cleanly on first launch after login, the Post on
AIRA composer accepts input without re-mounting, and the listings
screen chrome reads as one visually consistent row of controls.

**Investigation findings** (grounded in the code, not guessed):

- **#1 — Account settings:** Web already exposes
  `requestEmailChangeOp` and `changePasswordOp` at `/api/v1/profile/*`
  (see `apps/web/src/server/operations/users.ts:131` and `:186`). Both
  wrap Better Auth's `changeEmail` / `changePassword` request-context
  APIs. Mobile has zero UI screens for either. This is pure UI + hooks
  work — no backend changes.
- **#2 — Notifications modal:** Component at
  `apps/mobile/components/NotificationsPrePrompt.tsx` calls
  `requestPermissionAndRegister()` from `apps/mobile/lib/push.ts`. The
  utility has four error paths:
  1. Permission `canAskAgain: false` → "Notifications are off for AIRA
     in Settings" hint (fine)
  2. Missing EAS `projectId` → "Missing EAS project id — push
     registration unavailable" hint (fine but ugly copy)
  3. `getExpoPushTokenAsync` throws → generic error surface
  4. `apiPost('/api/v1/profile/push-token', ...)` throws → generic
     error surface
  Radha's "stuck and gives errors" symptom is not attributable without
  device logs — this is a real RCA task, not a code-guess task.
- **#3 — Composer reload loop:** Screen at
  `apps/mobile/app/(app)/post/new.tsx`. Two probable causes visible in
  code:
  1. `<Stack.Screen options={{ ... }}>` (line 80-113) is recreated on
     every render — `headerLeft` is an inline arrow function,
     `sheetAllowedDetents` is a fresh array literal. Expo Router
     re-applies options each time; the sheet may re-snap to its
     detent boundary on each keystroke.
  2. `KeyboardAvoidingView behavior="padding"` inside a `formSheet`
     with variable detents (0.5 → 0.99) is a known iOS thrash pattern
     — every keystroke that changes text height forces a layout pass
     that fights the sheet's own snap logic.
  The single-file surface makes this a code-first fix candidate;
  live-device repro is a nice-to-have, not a blocker.
- **#4 — Picker vs chip drift:** Concrete deltas identified:
  - `SubcategoryPicker.tsx:130-131`: `px-3` + `minHeight: 36` + `gap: 6`
    + text `text-sm font-semibold` (14px)
  - `VerifiedFilterChip.tsx:27-28`: `px-3 py-1.5` + `gap: 4` + text
    `text-xs font-semibold` (12px)
  - Result: picker pill sits ~4-6px taller with a heavier label; visual
    weight mismatch.

## Scope

**In:**

- **#1 — Email + password change screens** under
  `apps/mobile/app/(app)/account/`:
  - `edit-email.tsx` — email input + "Send confirmation email" CTA.
    Wires through the existing `POST /api/v1/profile/email` endpoint
    via a new `useRequestEmailChange` TanStack Query mutation hook.
    Shows the "we sent a link to your new email" confirmation state
    on success; surfaces `profile.email_change_failed` on failure.
  - `change-password.tsx` — three fields (current, new, confirm-new)
    + save CTA. Wires through `POST /api/v1/profile/password` via
    `useChangePassword`. Success: toast + `router.back()` (Better
    Auth revokes all other sessions server-side, so no local logout
    is needed for this session). Failure: surfaces
    `profile.password_rejected` in-form.
  - Account index (`apps/mobile/app/(app)/account/index.tsx`) gets
    two new nav rows: "Email" and "Change password", opening the
    screens above. Placed under the existing "Name" row.
- **#2 — Notifications modal RCA + fix.** Reproduce on a device
  (Expo Go tunnel per CLAUDE.md's Replit runbook, OR ask Radha for the
  specific error text she saw). Root-cause the failure mode, then fix
  the modal to:
  - Surface a clearer error message on the EAS-projectId-missing path
    (common in Expo Go — the copy today is not user-friendly).
  - Guarantee the modal is always dismissable (add a fallback dismiss
    even if `handleLater`'s SecureStore write throws).
  - Log the raw error to a debug channel (console with a tag) so the
    next occurrence is diagnosable without a code trip.
- **#3 — Composer reload-loop fix.** Two mechanical fixes independent
  of live repro:
  - Memoize `<Stack.Screen options>` — wrap in `React.useMemo`
    (dependencies: none — the option shape is static). Extract
    `headerLeft` into a stable function reference. Extract
    `sheetAllowedDetents` into a module-scope `const`.
  - Add `keyboardVerticalOffset` on `KeyboardAvoidingView` and consider
    `behavior="height"` if the padding-based recompute is the trigger.
  - If a live-device repro session shows a *different* cause, escalate
    to `/mstack-debug` from within the code task.
- **#4 — Picker/chip visual parity.** Rewrite the `SubcategoryPicker`
  pill className to match the `VerifiedFilterChip`:
  - Add `py-1.5`, drop `minHeight: 36`
  - Change label to `text-xs font-semibold`
  - Change `gap: 6` → `gap: 4`
  - Shrink chevron `size={18}` → `size={14}` to match the check-decagram
  Ensures both pills share a common vertical rhythm on the listings
  screen filter row.

**Out (deferred):**

- Two-factor / backup codes / passkeys — Better Auth supports these but
  no request from Radha yet.
- A full "Account settings" hub screen with sections. Two flat rows on
  the existing account index is enough for MVP; a hub can come when
  the surface grows.
- Post-composer redesign (rich text, image uploads, etc.). Fix the
  reload; leave the surface as-is otherwise.
- Notification-related UX beyond the pre-prompt: managing notification
  types, per-category preferences, in-app center. All parked.
- Any web changes. Sprint is mobile-only; Better Auth ops on web stay
  as-is.

## Approach

**#1 — Email + password screens: mirror the ID pattern from
`/account/notifications` and `/account/privacy-security`.**

Both existing screens follow this shape:
```
SafeAreaView (bottom edge)
  Stack.Screen options={{ title: "..." }}
  ScrollView
    header text
    <Card>
      <Input .../>
      <Input .../>
      <Button onPress={mutate}>Save</Button>
    </Card>
    <StatusLine feedback={feedback}/>
```

Both new screens follow the same layout. Hooks live in
`apps/mobile/features/auth/hooks.ts` alongside `useMe`,
`useSignIn`, etc. API wrappers live in
`apps/mobile/features/auth/api.ts` calling `apiPost` from
`apps/mobile/lib/api/client`. No new packages, no new deps.

**#2 — Notifications RCA + hardening.**

Read the device-side error first (either reproduce via Expo Go tunnel
or ask Radha for the exact text she saw). Two-line fixes go straight
in:
- `getEasProjectId()` returning undefined: swap the user-facing copy
  from "Missing EAS project id — push registration unavailable" to
  "Notifications aren't available in the preview build — try the
  App Store version." This is more truthful (the underlying cause
  IS the build shape, not a bug we can fix in code).
- Wrap `handleLater` in a try/catch so even a SecureStore write
  failure closes the modal instead of trapping the user.
- Add `console.warn("push-preprompt error", err)` inside every catch
  so the next report has diagnostics.

If those don't fix Radha's symptom, the plan escalates to
`/mstack-debug --from-qa` after a live repro run captures the actual
error.

**#3 — Composer stability.**

Static-analysis-based fix set (no live device needed):
- Extract `SHEET_DETENTS = [0.5, 0.99] as const` to module scope.
- Wrap `HeaderLeftCancel` in a memoized component or a
  `React.useCallback`-produced function; pass as a stable reference to
  `headerLeft`.
- Memoize the whole options object via
  `React.useMemo(() => ({ title: "New post", ... }), [])`.
- Move the `KeyboardAvoidingView`'s `keyboardVerticalOffset` up so the
  sheet doesn't collide with the keyboard chrome.
- Consider `presentation: "modal"` on Android (where formSheet is
  already a plain modal) to keep the code branch small.

If the reload persists after these changes, it's not a render-loop
issue — escalate to `/mstack-debug` with a live-device Expo Go session
following the CLAUDE.md runbook.

**#4 — Picker vs chip: one file, four lines.**

Edit `SubcategoryPicker.tsx:130-131` only. No design-system token
additions; the tokens (`bg-card`, `border-border`, `text-foreground`,
`text-xs`) already exist and are used by `VerifiedFilterChip`.

## Alternatives considered

- **#1 — Password change via reset email (rejected).** Simpler for
  the client but a worse UX — logs the user out of the current session
  and requires opening an email. Web's `changePasswordOp` already uses
  the in-place `currentPassword + newPassword` flow; mobile matching
  is consistent.
- **#1 — Combined "Change email or password" screen (rejected).**
  Modal complexity + form-state collision. Two dedicated screens is
  simpler and matches how iOS Settings.app handles it.
- **#2 — Kill the pre-prompt entirely (rejected).** The pre-prompt is
  a documented industry pattern for push permission grants
  (`.mstack/plans/2026-06-23-f21-push-broadcasts.md`). The issue is
  the failure surface, not the pre-prompt itself.
- **#2 — Fire the OS permission prompt directly on first launch
  (rejected).** Removes the pre-prompt but also removes the ability
  to explain WHY we want the permission — which is the pre-prompt's
  entire reason to exist.
- **#3 — Rewrite composer without a bottom sheet (rejected).** The
  sheet UX is a deliberate UX choice from the P2c community-parity
  review. Fix the render loop; don't retreat.
- **#4 — Rewrite both picker and chip together (rejected).** More
  scope, more risk. Adjust the outlier (picker) to match the newer
  pattern (chip) which was deliberately compact.

## Data model changes

None. All four issues are UI + API-glue work; the web endpoints for
#1 already exist.

## Files to touch

**New:**
- `apps/mobile/app/(app)/account/edit-email.tsx` — email change screen
- `apps/mobile/app/(app)/account/change-password.tsx` — password change screen

**Edit:**
- `apps/mobile/features/auth/api.ts` — add `requestEmailChange(body)` +
  `changePassword(body)` API wrappers
- `apps/mobile/features/auth/hooks.ts` — add `useRequestEmailChange` +
  `useChangePassword` TanStack mutation hooks
- `apps/mobile/app/(app)/account/index.tsx` — add two nav rows linking
  to the new screens
- `apps/mobile/components/NotificationsPrePrompt.tsx` — hint copy,
  fallback dismiss, console.warn diagnostics
- `apps/mobile/lib/push.ts` — improve error taxonomy (return a typed
  error code instead of a raw string; UI maps it to human copy)
- `apps/mobile/app/(app)/post/new.tsx` — memoize `<Stack.Screen>`
  options + extract detents to module scope + refactor headerLeft as
  a stable callback + tune `keyboardVerticalOffset`
- `apps/mobile/features/listings/components/SubcategoryPicker.tsx` —
  pill className tweaks to match `VerifiedFilterChip`

**No web changes. No new deps. No mobile parity screens beyond the two
new account entries.**

## Edge cases

- **#1 email change to the same email:** `requestEmailChangeOp`
  returns `{ ok: true, changed: false }`. UI must show "that's already
  your email" — not "we sent a confirmation link".
- **#1 email confirmation flow:** Better Auth sends a verification
  link to the *new* email. The user has to click it. Mobile screen
  shows "check your inbox at <new email>" and offers a resend after
  60s (out of scope for MVP — flag as follow-up).
- **#1 password change while other sessions are active:** Better Auth
  revokes all other sessions. Current mobile session stays valid (we
  passed the current password). No local logout / re-auth needed.
- **#1 password change rejected (wrong current):** Server returns
  `profile.password_rejected`. Field-level error, not a toast.
- **#2 modal dismissal on error:** Even if `dismissPushPrePrompt`
  throws (SecureStore is finicky on Expo web preview), `onClose` MUST
  fire so the user can proceed to the app.
- **#2 first-launch race:** The `useEffect` at layout.tsx:57 fires on
  `me.data?.emailVerified` — if the query is still hydrating during
  first paint, the modal may pop up late (after home has rendered).
  Acceptable as long as it doesn't loop.
- **#3 keyboard-avoiding while sheet is at 0.5 detent:** on iOS the
  sheet may auto-snap to 0.99 when the keyboard opens. That's expected
  behavior — the fix is not to prevent snapping but to prevent the
  screen from re-mounting during the snap.
- **#3 fast typing with slow render:** even after memoization, if the
  device is old, keystrokes can queue. Not our problem to solve — the
  `title` state is a plain string, the counter is `title.length`, no
  expensive derived state.
- **#4 subcategory picker with very long labels:** the pill has
  `self-start` so it hugs content; matching the compact chip may make
  long labels feel cramped. `numberOfLines={1}` already caps at one
  line; ellipsis would kick in.

## Acceptance criteria

- [ ] Account tab shows "Email" and "Change password" rows. Tapping
      each opens the respective screen with a back-nav header.
- [ ] Email change form: submitting a valid new email hits
      `POST /api/v1/profile/email` and shows a success confirmation
      state; the same-email case shows the "already your email"
      message; server errors surface inline.
- [ ] Password change form: `currentPassword + newPassword +
      confirmNewPassword` fields with client-side confirm-match
      validation. Submit hits `POST /api/v1/profile/password`;
      success toasts + navigates back; wrong-current returns a
      field-level error.
- [ ] Notifications pre-prompt: on first login, modal appears once.
      Enable → OS prompt → device token registered → modal closes.
      Deny → hint text renders → user can still tap "Maybe later" to
      dismiss. In every error branch, the modal is dismissable.
- [ ] Console.warn diagnostic surfaces the error text on every push-
      registration failure path (checkable via Metro logs).
- [ ] Post on AIRA composer: typing in the Title field does not cause
      the screen to reload / re-mount / re-render its Stack.Screen
      options. Verified by opening the composer, typing 5+ characters
      rapidly, and observing no visible sheet re-snap.
- [ ] Composer submits successfully on valid input; error path
      unchanged.
- [ ] SubcategoryPicker pill matches the VerifiedFilterChip pill
      visually side-by-side on the listings screen — same vertical
      height, same text size, same gap between icon and label.
- [ ] `pnpm --filter @aira/mobile typecheck && lint` clean at the end.
- [ ] No web files touched.

## Open questions

For `/mstack-review` to resolve before implementation:

1. **#2 — Which build is Radha testing on?** Expo Go via tunnel, an
   internal preview EAS build, or the App Store production build?
   The likely root cause differs per environment (Expo Go = no
   projectId + no push in SDK 53+; EAS build = network / server-side
   issue). Reviewer should confirm before we commit to the RCA
   direction.

2. **#3 — Do we want a live-device repro pass before shipping?** The
   plan proposes a static-analysis fix (memoize options, tune
   keyboardVerticalOffset). If the reload symptom persists after
   those, it's a different cause and needs `/mstack-debug` with a
   live Expo Go tunnel session. Reviewer decides whether to book that
   time now or ship the mechanical fix and re-verify with Radha.

3. **#1 — Email change: post-submit copy.** Plan proposes "check your
   inbox at <new-email>". Alternate: "we sent a confirmation link to
   <new-email>. Check your inbox to complete the change." Slightly
   longer but more actionable. Which reads better?

4. **#1 — Password change: do we log the user out after success?**
   Better Auth's `revokeOtherSessions: true` invalidates every OTHER
   session but keeps the current one. Plan proposes: no logout, just
   toast + back-nav. Alternative: log out and force re-sign-in to
   confirm the new password works. The alternative is safer but
   worse UX.

5. **#4 — Which pill is the "canonical" style?** Plan says match the
   VerifiedFilterChip's compact treatment. Alternative: match the
   SubcategoryPicker's roomier treatment (both bump up to `text-sm` +
   `minHeight: 36`). Reviewer picks.

6. **#1 — Should we surface the current email on the edit-email
   screen?** Plan implies yes (helpful context). Explicit confirmation
   would keep the UI tidy: "Current email: <email>" as a subtle line
   above the input.
