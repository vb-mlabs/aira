# Review: Mobile welcome screen + root session gate

**Date:** 2026-05-24
**Slug:** 2026-05-24-mobile-welcome-and-session-gate
**Plan reviewed:** [2026-05-24-mobile-welcome-and-session-gate.md](../plans/2026-05-24-mobile-welcome-and-session-gate.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (Opus 4.7)

---

## Summary

Plan is sound in shape (top-level + per-group gates, single-screen welcome,
splash-held cold launch) but three implementation details were wrong in the
plan as drafted: (1) `useMe()` cannot run in `RootLayout()` because it sits
*above* the `QueryClientProvider`, (2) the proposed `(auth)` gate would block
unverified-email users from reaching `check-email.tsx`/`verify.tsx`, and
(3) the "discriminate 401 from network error" open question is already solved
by the existing `ApiError(status)` thrown from `features/auth/api.ts:169`. All
three are resolved below. One real footgun surfaced that the plan didn't
mention: `meRequest()` uses raw `fetch` (not `apiRequest`), so the global
401→refresh-once retry is bypassed, which means an expired access token but
valid refresh token still flips `useMe()` to error and bounces the user to
welcome. Addressed in Task 2. `UI-Significant: no` (heuristic is web-only;
all touches are `apps/mobile/`).

## Findings

### Blockers (must fix before /mlabs-code)

- **`useMe()` placement.** Plan says to extend the splash-hold in
  `app/_layout.tsx`. That file *renders* `<QueryClientProvider>` — anything
  calling `useMe()` from `RootLayout()` itself is outside the provider tree
  and throws "No QueryClient set". **Resolution:** keep `_layout.tsx` waiting
  on fonts only; move the splash-hide-on-session logic into `app/index.tsx`,
  which is rendered as a child of the providers.

- **`(auth)` gate vs unverified users.** Better Auth returns a `user` row
  *before* email verification (`features/auth/api.ts:42-46`). The proposed
  redirect-if-`me.data` would make `check-email.tsx` and `verify.tsx`
  unreachable for the just-signed-up user. **Resolution:** gate on
  `me.data?.emailVerified === true`. Unverified users stay in the auth flow
  and can complete verification.

### Concerns (raised, decided, recorded)

- **Concern:** `meRequest()` (`features/auth/api.ts:158-176`) uses raw `fetch`,
  not the `apiRequest()` wrapper. That bypasses the global 401→refresh-once
  retry (`lib/api/client.ts:251-256`). So a user with valid refresh + expired
  access gets flipped to `me.isError`, and the gate then bounces them to
  welcome — instead of silently refreshing and proceeding to `(app)`.
  **Decision:** Rewrite `meRequest()` to go through `apiRequest()` (with a
  GET helper if needed, since `apiGet` already exists). Adds session-restore
  resilience to the gate "for free" with no extra logic in the layouts.

- **Concern:** Plan called out a "discriminate 401 from network error" open
  question. `ApiError` (`lib/api/client.ts:84-96`) already exposes `.status`.
  **Decision:** No `meRequest()` rewrite needed *for that reason* (the
  rewrite in the concern above happens for a different reason — refresh
  retry). Gate logic just checks
  `error instanceof ApiError && error.status === 401`.

- **Concern:** Plan keeps the explicit `router.replace("/(app)")` calls in
  `login.tsx:49`, `verify.tsx:31`, `reset-password.tsx:51`. With the new gate,
  these create a double-redirect path. **Decision (user, 2026-05-24):** delete
  them. Single source of redirection truth = the gate. Simpler reasoning,
  fewer race conditions. `login.tsx` still needs to await the mutation; once
  it resolves, `useMe()` invalidates, the `(auth)` gate fires `<Redirect/>`,
  and the user lands on `(app)` without an explicit call. `verify.tsx`
  similarly: after successful verification, invalidate `useMe()`, gate handles
  the rest.

- **Concern:** Plan's open question on `brand.shortTagline` (new field in
  `packages/config/src/brand.ts`). AGENTS.md hard rule: edits to
  `src/config/brand.ts` "always pause and ask." **Decision (user, 2026-05-24):**
  use full `brand.tagline` with text wrapping on welcome — no rebrand-layer
  edit. Forks that want a shorter mobile tagline can add the field themselves.

- **Concern:** CTA primary/secondary ordering. **Decision (user, 2026-05-24):**
  "Create account" primary (`variant="primary"`), "Sign in" outlined
  (`variant="secondary"` — which renders `bg-secondary border border-border`
  per `Button.tsx:27`, the closest analogue to an outline variant). Signup-first.

- **Concern:** `Button.tsx` has no `outline` variant — only
  `primary | secondary | ghost | destructive` (`Button.tsx:11`). **Decision:**
  use `secondary` for the Sign-in CTA. It's bordered and lower-emphasis,
  which is the intent. No new Button variant to add.

- **Concern:** Web preview behavior (`pnpm --filter @mlabs/mobile web`).
  SecureStore is shimmed to `localStorage` (`lib/api/client.ts:44-79`), so
  tokens persist. The gate works on web identically to native. `SplashScreen`
  is a no-op on web — brief blank frame is acceptable on web preview only.
  **Decision:** ship as-is; web is a dev QA surface, not a shipping target.

### Suggestions (taken or deferred)

- **Taken:** Make `meRequest()` go through `apiRequest()` so the refresh-once
  retry is applied. Moved into Task 2.
- **Taken:** Add a `// FIXME: pending-intent loss` comment in
  `(app)/_layout.tsx` next to the deep-link redirect, so it's obvious where
  to add intent preservation later. Moved into Task 6.
- **Deferred:** Intent preservation on deep-link-expired-session (user lands
  on welcome with no breadcrumb back to the deep-linked screen). Plan
  explicitly out-of-scope; comment marks the spot.
- **Deferred:** Maestro flow for the rare "signed-in user manually navigates
  to `/login`" → bounced-to-(app) path. Covered by 11/12 flows in practice
  if we're being honest about coverage.
- **Deferred:** Loading skeleton in `(app)/_layout.tsx` during `me.isPending`
  on refetch. Cold launch is splash-covered; refetches are rare enough that
  a blank frame is acceptable. Add later if QA flags it.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- **Splash-hide-on-session lives in `app/index.tsx`**, not in `_layout.tsx`
  (provider ordering blocker).
- **`(auth)` gate uses `me.data?.emailVerified === true`**, not raw
  `me.data` presence (unverified-user blocker).
- **`meRequest()` rewritten to use `apiGet`** (resilience: refresh-once on
  expired access token, no false-positive welcome redirect).
- **Explicit `router.replace` calls deleted from `login.tsx`, `verify.tsx`,
  `reset-password.tsx`** — gate is the single source of redirection truth.
- **CTAs: "Create account" primary, "Sign in" secondary** (Button.tsx
  `variant="secondary"` renders as bordered/outlined).
- **No `brand.shortTagline` field** — welcome uses full `brand.tagline` with
  wrapping.
- **`welcome.tsx` lives in `(auth)/`** (confirmed from plan recommendation —
  it's part of the unauthenticated flow).

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is atomic
(reviewable as a single commit). `/mlabs-code` runs autonomously but pauses if
a task lists a **Pause if** trigger that matches the situation.

### Task 1: Add welcome screen

- **Files:** `apps/mobile/app/(auth)/welcome.tsx` (new)
- **What:** Single-screen welcome. `SafeAreaView` wrapper, centered column.
  Wordmark (`brand.name` from `@mlabs/config`, large heading text — match the
  type scale used in `login.tsx`'s wordmark). Below: full `brand.tagline`
  (allow wrapping, no truncation). Below: stacked CTAs — `<Button
  variant="primary" fullWidth size="lg" onPress={() => router.push("/(auth)/sign-up")}>Create
  account</Button>` then `<Button variant="secondary" fullWidth size="lg"
  onPress={() => router.push("/(auth)/login")}>Sign in</Button>`. No new
  components, no new deps. Brand strings via `brand.*` only — no literals.
- **Acceptance:** File exists. Renders wordmark + tagline + 2 buttons.
  Tapping "Create account" navigates to `/(auth)/sign-up`; tapping "Sign in"
  navigates to `/(auth)/login`. `pnpm --filter @mlabs/mobile lint` passes
  (no `no-brand-string-literal` violations).

### Task 2: Make `meRequest()` use `apiRequest` so refresh-once retry applies

- **Files:** `apps/mobile/features/auth/api.ts` (edit)
- **What:** Replace the raw `fetch` in `meRequest()` (lines 158-176) with
  `apiGet<{ user: User }>("/api/auth/get-session")`. Import `apiGet` from
  `../../lib/api/client`. Keep the same error shape: throw
  `ApiError(401, "auth.no_session", ...)` when `data?.user` is missing or
  the request 401s after refresh failure (apiRequest already throws via
  `parseError`; just rethrow). Net behavior: an expired access token with a
  valid refresh token transparently refreshes and returns the user, instead
  of bouncing the session gate.
- **Acceptance:** `meRequest()` no longer calls `fetch` directly. Manual
  verification: with valid refresh token but stale (expired) access token,
  `useMe()` resolves successfully (does not flip to error). Existing Maestro
  flow `08-cold-launch-session-restore.yaml` still passes.
- **Pause if:** the existing `parseError` path returns a 401 with a different
  code than `auth.no_session` — confirm the gate logic in Task 4 still
  treats it as unauthenticated.

### Task 3: Add top-level session gate at `app/index.tsx`

- **Files:** `apps/mobile/app/index.tsx` (new)
- **What:** New file. Default export uses `useMe()` and `useEffect` to call
  `SplashScreen.hideAsync()` once `!me.isPending`. Returns:
  - `null` while `me.isPending` (splash still up)
  - `<Redirect href="/(app)" />` if `me.data?.emailVerified === true`
  - `<Redirect href="/(auth)/welcome" />` otherwise (no session, network
    error, unverified email — all routed through welcome; unverified will
    then continue to check-email if they tap sign-up, or login if they
    return)
- **Acceptance:** Cold launch with no tokens → splash → welcome (no flash of
  login). Cold launch with valid verified session → splash → (app) home
  (no flash of welcome). File typechecks. `<Redirect>` is the
  `expo-router` named export.
- **Pause if:** `SplashScreen.hideAsync()` errors at runtime in dev — the
  existing pattern in `_layout.tsx:33-37` catches and ignores; mirror that.

### Task 4: Add `(app)` group gate with 401 + verification guard

- **Files:** `apps/mobile/app/(app)/_layout.tsx` (edit)
- **What:** At top of `AppLayout()` (before `useUnreadCount`/`useConversations`),
  add `const me = useMe();`. If `me.isPending && !me.isFetched`, return
  `null` (cold-launch case, splash covers). If
  `me.isError || !me.data?.emailVerified`, return
  `<Redirect href="/(auth)/welcome" />`. Otherwise render the existing
  `<Tabs>`. Add a one-line comment near the redirect:
  `// FIXME: deep-link intent loss — pending-target preservation is out of scope`.
  Reorder the existing hooks so the `useMe()` redirect happens *before*
  `useUnreadCount`/`useConversations` fire (avoid wasted requests when about
  to redirect).
- **Acceptance:** Deep-link to `/(app)/messages/foo` from an
  unauthenticated state → welcome screen (not crash, not 401 loop).
  Authenticated cold launch → tabs render normally with badges.
  Mid-session 401 (simulated by clearing tokens via dev hook or signing out)
  → next tab tap redirects to welcome.

### Task 5: Add `(auth)` group gate that bounces verified users to `(app)`

- **Files:** `apps/mobile/app/(auth)/_layout.tsx` (edit)
- **What:** At top of `AuthLayout()`, add `const me = useMe();`. If
  `me.isPending`, render the `<Stack>` as today (don't return null — welcome
  is a safe default to paint while session resolves; avoids blank frame on
  refetch). If `me.data?.emailVerified === true`, return
  `<Redirect href="/(app)" />`. Otherwise render the existing `<Stack>`.
  This means unverified users (`me.data` present but
  `emailVerified === false`) stay in the auth stack and can reach
  `check-email.tsx` / `verify.tsx`.
- **Acceptance:** Signed-in verified user manually navigating to `/login` is
  bounced to `(app)`. Signed-up-but-unverified user can reach
  `check-email.tsx` and `verify.tsx` without being bounced.

### Task 6: Remove explicit `router.replace` from login/verify/reset-password

- **Files:** `apps/mobile/app/(auth)/login.tsx` (edit) ·
  `apps/mobile/app/(auth)/verify.tsx` (edit) ·
  `apps/mobile/app/(auth)/reset-password.tsx` (edit)
- **What:** Delete the explicit `router.replace("/(app)")` call in
  `login.tsx:49` and `verify.tsx:31` (the `setTimeout` wrapper) and the
  `router.replace("/(auth)/login")` in `reset-password.tsx:51`. Instead, the
  mutations should call `qc.invalidateQueries({ queryKey: ["auth", "me"] })`
  (already done in `useLogin` / `useVerifyEmail`'s `onSuccess`); the
  `(auth)` gate (Task 5) sees the verified session and redirects to `(app)`.
  For `reset-password`, after success the user is unauthenticated by design,
  so just `router.replace("/(auth)/login")` is fine to keep — confirm the
  gate doesn't fight it. Net: a *single* source of redirect truth for the
  authenticated transition; `reset-password → login` stays explicit since
  it's a within-auth navigation, not a gate-driven one.
- **Acceptance:** Login → home tab visible (gate-driven, no double-redirect
  console warnings). Verify-email tap → home (no `setTimeout` flash of
  verify screen). Existing Maestro flows `01`, `04`, `08` still pass
  without modification.
- **Pause if:** removing the `setTimeout(700ms)` in verify.tsx breaks the
  "success message visible" UX (700ms was intentional dwell time). If yes,
  keep the timeout but change its body from `router.replace` to just
  `qc.invalidateQueries`.

### Task 7: Remove sign-out `router.replace` from `profile.tsx`

- **Files:** `apps/mobile/app/(app)/profile.tsx` (edit)
- **What:** Delete the `router.replace("/(auth)/login")` calls at lines 183
  and 196 (both branches of the sign-out handler). `useSignOut().onSuccess`
  already calls `qc.clear()` (`features/auth/hooks.ts:55`), which
  invalidates `useMe()`. The `(app)/_layout.tsx` gate (Task 4) then
  redirects to welcome. One source of truth.
- **Acceptance:** Sign-out from profile → welcome screen visible. No
  double-redirect. Maestro flow `09-sign-out-clears-store.yaml` still passes
  (may need to update the assertion target from `login` to `welcome`).
- **Pause if:** Maestro flow `09` asserts a specific final route name — update
  the assertion to match the new flow (welcome, not login) as part of this
  task.

### Task 8: Add Maestro flow — welcome cold launch

- **Files:** `apps/mobile/.maestro/11-welcome-cold-launch.yaml` (new)
- **What:** Launch app with no stored tokens. Assert welcome screen visible
  (wordmark text matches `brand.name`, two buttons visible). Tap "Sign in",
  assert login screen visible. Return to welcome, tap "Create account",
  assert sign-up screen visible.
- **Acceptance:** `maestro test apps/mobile/.maestro/11-welcome-cold-launch.yaml`
  passes locally against a fresh-install simulator.

### Task 9: Add Maestro flow — deep link with expired session

- **Files:** `apps/mobile/.maestro/12-deep-link-expired-session.yaml` (new)
- **What:** Seed SecureStore with a stale/invalid refresh token (use the
  same launch-args / env-injection pattern as existing flows — check how
  `08-cold-launch-session-restore.yaml` seeds tokens; mirror that). Open
  a deep link to `/(app)/messages/test-id`. Assert welcome screen visible
  within 3s (gate redirected). Assert no crash, no `messages` screen
  flash.
- **Acceptance:** Flow passes. If seeding stale tokens isn't possible with
  existing infra, replace with a launch-and-clear-tokens-mid-session flow
  instead and document the deviation in `.mstack/learnings.jsonl`.
- **Pause if:** Maestro can't deep-link into Expo Router routes without
  extra setup (custom URL scheme registration in `app.config.ts`) — pause
  and ask whether to wire up the scheme or simplify the test.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- **Maestro deep-link mechanics (Task 9).** If deep linking into
  `/(app)/messages/<id>` from Maestro requires `app.config.ts` URL scheme
  registration that doesn't exist yet, escalate rather than registering a
  new scheme silently.
- **`verify.tsx` 700ms success-dwell (Task 6).** If removing the `setTimeout`
  wrapper makes the "verified!" message disappear too fast for QA, keep the
  timeout and just swap the redirect call for `qc.invalidateQueries`.
- **`reset-password.tsx` post-success route.** Plan keeps the explicit
  `router.replace("/(auth)/login")` because reset-success leaves the user
  unauthenticated (gate would route them to welcome, not login). Confirm
  during implementation that this is the desired UX — alternative is "after
  reset, land on welcome and let them choose Sign in." Defaulting to login
  (current behavior) as the lower-friction path.
