# Review: Mobile UAT sprint — 4 issues from Radha's 2026-07-06 call

**Date:** 2026-07-06
**Slug:** 2026-07-06-mobile-uat-sprint
**Plan reviewed:** [2026-07-06-mobile-uat-sprint.md](../plans/2026-07-06-mobile-uat-sprint.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** claude

---

## Summary

Plan is implementable. One structural correction from code inspection:
the plan proposed adding two new rows ("Email", "Change password") to
the mobile Account hub, but that hub has a locked 7-row layout (see the
doc comment on `apps/mobile/app/(app)/account/index.tsx:18-22` — legacy
sections were deliberately dropped in P2c). The right home for both is
`/account/privacy-security` — which is exactly where web puts them
(`SecuritySection` + email change section on the web
`/account/privacy-security` page). New screens live at `/account/edit-email`
and `/account/change-password`; entry points are two new rows added to
Privacy & Security, not the hub.

Second finding: the "stuck" bug in the notifications modal has a
concrete cause the plan under-specified. `handleEnable` sets `busy = true`,
awaits `requestPermissionAndRegister()`, and `handleLater`'s button is
`disabled={busy}`. If the enable request hangs (network stuck), the
user **cannot cancel**. Real fix: (a) 15s timeout on the enable path,
(b) always-enabled "Maybe later", (c) console.warn diagnostics.

## Findings

### Blockers (must fix before /mstack-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan wants to add "Email" and "Change password" rows to
  the Account hub. That contradicts the doc comment at
  `apps/mobile/app/(app)/account/index.tsx:18-22` which locks the hub
  layout ("legacy iOS Settings sections got dropped along with their
  no-op Name/Email/Change-password rows") and mirrors web's flat
  /account layout.
  **Decision:** New screens live at
  `apps/mobile/app/(app)/account/edit-email.tsx` and
  `apps/mobile/app/(app)/account/change-password.tsx` (top-level URLs
  under `/account/`). Entry points are TWO NEW ROWS added to
  `apps/mobile/app/(app)/account/privacy-security.tsx` — mirroring
  web where `SecuritySection` + email change live on
  `/account/privacy-security`. Account hub stays untouched.

- **Concern:** The "stuck" symptom in the notifications pre-prompt is
  under-specified in the plan. Concrete cause: `handleLater` button is
  `disabled={busy}` (line 96 of `NotificationsPrePrompt.tsx`), so a
  hung `handleEnable` request locks the modal.
  **Decision:** Task 6 removes the `disabled={busy}` on the "Maybe
  later" button so users can always dismiss, adds a 15-second timeout
  to `requestPermissionAndRegister()` in `apps/mobile/lib/push.ts`
  (wraps the network work in `Promise.race` with a timeout), and adds
  `console.warn("push-preprompt error", err)` on every catch path. If
  Radha's next report shows a different failure mode after this ships,
  escalate to `/mstack-debug` with device logs.

- **Concern:** Radha's testing environment (Expo Go tunnel vs preview
  EAS build) is unresolved. Different environment means different
  likely root cause for #2 (Expo Go SDK 53+ requires a real device for
  `getExpoPushTokenAsync` to succeed; preview EAS builds have the
  `projectId` baked in).
  **Decision:** Assume Expo Go tunnel for the initial debug pass (per
  CLAUDE.md's Replit runbook: `EXPO_FORCE_WEBCONTAINER_ENV=1
  expo start --tunnel`). The hardening in Task 6 improves both paths;
  if Radha reports the hardened build still errors on a preview EAS
  build, escalate to `/mstack-debug` with a live-device log.

- **Concern:** Plan proposes memoizing `<Stack.Screen options>` in the
  composer via `React.useMemo`. Legitimate (options identity is the
  trigger), but if the reload persists after this static fix the
  cause is elsewhere (Metro fast-refresh, keyboard-avoiding-view
  thrash).
  **Decision:** Task 7's Pause-if trigger covers this: "If reload
  persists after these changes, escalate to `/mstack-debug`."

- **Concern:** Password change UX — Better Auth's `revokeOtherSessions:
  true` invalidates every OTHER session but preserves the current one.
  Mobile uses bearer JWTs; the current-session bearer stays valid.
  **Decision:** As planned — no logout. Show a success toast, navigate
  back to Privacy & Security.

- **Concern:** Email change flow post-submit copy.
  **Decision:** "We sent a confirmation link to `<new email>`. Check
  your inbox to complete the change." (longer, more actionable). Resend
  affordance deferred to TODOs.

- **Concern:** Password validation cap. Web op requires min 8.
  **Decision:** Client-side check mirrors server: min 8, no max.
  Confirm-password field must match new-password client-side.

- **Concern:** Picker vs chip visual parity target.
  **Decision:** Match the VerifiedFilterChip (compact). Concrete
  targets: `py-1.5` (drop `minHeight: 36`), `text-xs font-semibold`,
  `gap: 4`, chevron `size={14}`.

### Suggestions (taken or deferred)

- **Taken:** New API wrappers named `requestEmailChangeRequest` and
  `changePasswordRequest` (`Request` suffix matches sibling
  `loginRequest`, `signOutRequest` naming).
- **Taken:** Hooks named `useRequestEmailChange` and `useChangePassword`
  (matches `useLogin`, `useSignOut`).
- **Taken:** Edit-email screen shows the current email as "Current
  email: <email>" line above the input.
- **Deferred:** "Resend confirmation" button on the post-email-change
  state. TODO logged.
- **Deferred:** 2FA / passkeys — not in scope.
- **Deferred:** Notification-preference management screen — not asked
  for.

## Decisions locked

Net new decisions beyond the plan:

- **New screens under `/account/`** but linked from
  `/account/privacy-security`, NOT the account hub.
- **Composer fix is static** (memoize + module-scope constants); live
  device only if the static fix doesn't hold.
- **Testing environment: Expo Go tunnel** for the initial pass.
- **Password change keeps the current session alive** (no re-sign-in).
- **`Maybe later` button always enabled** in the notifications modal.
- **15-second timeout** on `requestPermissionAndRegister`.
- **Console.warn on every push error path**.
- **Picker matches VerifiedFilterChip** (compact).

## Implementation plan

Ordered atomic tasks for `/mstack-code`.

### Task 1: Auth API wrappers + hooks for email/password change

- **Files:**
  - `apps/mobile/features/auth/api.ts` (edit — add 2 functions)
  - `apps/mobile/features/auth/hooks.ts` (edit — add 2 hooks)
- **What:**
  - `requestEmailChangeRequest(input: { email: string })` POSTs
    `/api/v1/profile/email` via `apiPost`; returns
    `{ ok: true; changed: boolean }`.
  - `changePasswordRequest(input: { currentPassword: string;
    newPassword: string })` POSTs `/api/v1/profile/password`; returns
    `{ ok: true }`.
  - Both surface `ApiError` on failure (existing `apiPost` behavior).
  - Add `useRequestEmailChange()` and `useChangePassword()` mutation
    hooks — no query invalidation needed.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` clean.
  - Grep confirms no direct call to `/api/v1/profile/email` or
    `/api/v1/profile/password` outside these wrappers.

### Task 2: `/account/edit-email` screen

- **Files:**
  - `apps/mobile/app/(app)/account/edit-email.tsx` (new)
- **What:**
  - Structure mirrors `/account/notifications` and
    `/account/privacy-security` (SafeAreaView, Stack.Screen title,
    ScrollView with card sections).
  - Header title: "Change email".
  - Show current email as: "Current email: `<useMe().data.email>`".
  - Single `<Input label="New email" keyboardType="email-address"
    autoCapitalize="none" autoCorrect={false}>` in a Card.
  - Save Button: disabled when new-email trimmed length < 5 OR
    equals current email.
  - On submit → `useRequestEmailChange().mutateAsync({ email })`.
  - Success + `changed: true`: replace form with confirmation card:
    "We sent a confirmation link to `<new email>`. Check your inbox
    to complete the change." + "Done" button navigates back.
  - Success + `changed: false`: inline error "That's already your
    email." — form stays visible.
  - Failure (`ApiError`): surface `err.message` inline.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` clean.
  - Navigation from Privacy & Security → tap "Email" → screen shows
    current email as context.
  - Submitting a valid new email transitions to "check inbox" state.
  - Same-email case shows the "already your email" message.
  - Failure surfaces inline.

### Task 3: `/account/change-password` screen

- **Files:**
  - `apps/mobile/app/(app)/account/change-password.tsx` (new)
- **What:**
  - Same layout skeleton as Task 2.
  - Header: "Change password".
  - Three `secureTextEntry` inputs: `currentPassword`, `newPassword`,
    `confirmNewPassword`.
  - Client-side validation before submit:
    - all three fields non-empty
    - `newPassword.length >= 8`
    - `confirmNewPassword === newPassword`
  - On submit → `useChangePassword().mutateAsync({ currentPassword,
    newPassword })`.
  - Success: `toast.show({ message: "Password updated.", kind: "success" })`
    then `router.back()`.
  - Failure: surface `err.message` inline (server returns generic
    `profile.password_rejected` copy).
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` clean.
  - Wrong current password → field-level error, form stays open.
  - Passwords don't match → client-side error, no network call fired.
  - Successful change → toast + navigation back.

### Task 4: Wire two new rows on `/account/privacy-security`

- **Files:**
  - `apps/mobile/app/(app)/account/privacy-security.tsx` (edit)
- **What:**
  - Above the existing "Enable notifications" row, add a new
    `<View>` section with:
    ```tsx
    <Row icon="email-outline" label="Email"
      onPress={() => router.push("/account/edit-email" as never)} />
    <Row icon="key-outline" label="Change password"
      onPress={() => router.push("/account/change-password" as never)} />
    ```
  - Match the existing Row card grouping pattern (overflow-hidden,
    rounded, hairline dividers).
  - Import `router` from `expo-router` (not currently there).
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` clean.
  - Manually: /account → Privacy & Security → two new rows appear
    above "Enable notifications"; each opens its screen.

### Task 5: Push utility hardening

- **Files:**
  - `apps/mobile/lib/push.ts` (edit)
- **What:**
  - Wrap the `getExpoPushTokenAsync` + `apiPost` block in a
    `Promise.race` with a 15-second timeout:
    ```ts
    const TIMEOUT_MS = 15_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Push registration timed out.")), TIMEOUT_MS)
    );
    ```
  - On every catch path, `console.warn("push-preprompt error", err)`.
  - Improve error text: "Missing EAS project id" → "Notifications
    aren't available in this build. Try again from the App Store
    version."
  - Leave `dismissPushPrePrompt` alone — `setFlag` already swallows
    SecureStore errors.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` clean.
  - Grep confirms no `console.log` was added, only `console.warn`.
  - Timeout wrapper resolves within ~15s in the worst case.

### Task 6: NotificationsPrePrompt — always-dismissable + defensive busy reset

- **Files:**
  - `apps/mobile/components/NotificationsPrePrompt.tsx` (edit)
- **What:**
  - Remove `disabled={busy}` from the "Maybe later" `Pressable` at
    line 96. Users must always be able to dismiss.
  - Wrap `handleEnable`'s try in a try/finally that always resets
    `setBusy(false)`, defending against unhandled throws.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` clean.
  - Grep for `disabled={busy}` returns 1 match (Enable button only).
- **Pause if:**
  - If Radha reports the modal is STILL stuck after this + Task 5,
    escalate to `/mstack-debug --from-qa` with her device logs.

### Task 7: Composer stability

- **Files:**
  - `apps/mobile/app/(app)/post/new.tsx` (edit)
- **What:**
  - Extract `const SHEET_DETENTS = [0.5, 0.99] as const` to module
    scope.
  - Extract `HeaderCancelButton` component (or a stable `useCallback`)
    outside the component so its identity is stable.
  - Wrap the entire `<Stack.Screen options>` object in
    `React.useMemo(() => ({ ... }), [])`.
  - Add `keyboardVerticalOffset={80}` to `KeyboardAvoidingView` (tune
    during implementation).
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` clean.
  - Manually (if Radha reports back): typing 5+ characters into the
    Title field on iOS Expo Go does not cause a visible sheet re-snap.
- **Pause if:**
  - If the reload symptom persists after these changes on a real
    device, escalate to `/mstack-debug` with an Expo Go tunnel session.

### Task 8: Subcategory picker style parity with verified chip

- **Files:**
  - `apps/mobile/features/listings/components/SubcategoryPicker.tsx`
    (edit)
- **What:**
  - Line 130-131 currently:
    `className="flex-row items-center self-start rounded-full border border-border bg-card px-3"`
    `style={{ minHeight: 36, gap: 6 }}`.
  - Change to:
    `className="flex-row items-center self-start rounded-full border border-border bg-card px-3 py-1.5"`
    `style={{ gap: 4 }}` (drop `minHeight: 36`).
  - Line 133-135: label className `text-sm font-semibold` → `text-xs
    font-semibold`.
  - Line 136: chevron `size={18}` → `size={14}`.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` clean.
  - Manually: picker + verified chip at the same vertical height with
    matching label weight side-by-side.

## Open questions

Anything `/mstack-code` should escalate rather than guess:

- If Task 5's timeout Promise.race pattern is already present in
  `apps/mobile/lib/` in some form, reuse the existing helper rather
  than inlining. Grep for `Promise.race` in the mobile package before
  writing.
- If Task 4's card-group styling doesn't visually match the
  privacy-security page's existing pattern (which currently doesn't
  use rounded cards for the Enable notifications row), adjust to match
  rather than introducing a new pattern.
- If Radha's device logs (post-Task 5) point at a specific
  expo-notifications version mismatch, escalate to `/mstack-debug`
  with the log.
