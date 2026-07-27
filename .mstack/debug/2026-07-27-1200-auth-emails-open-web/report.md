# Debug — mobile auth emails open the web landing page instead of the app

**Started:** 2026-07-27 12:00
**Source:** user-report (session 2026-07-27, conversation turn after the back-nav fix)
**Env:** Expo Go on device (mobile) + iOS Universal Links / Android App Links against staging web
**Status:** ready-for-fix
**Investigator:** /mstack-debug

## Symptom

A user who signs up on the mobile app receives a verification email.
Tapping the email link on their phone opens Safari (or the Android
browser), Better Auth verifies the token on the server, then the browser
lands on the **web** home page. The user never returns to the mobile app.

Identical failure mode for the **password-reset email**: the emailed link
opens the browser and drops the user on the web reset-password page (or
web home after reset), not the mobile app.

## Repro

**Verify path:**
1. Install the mobile app on a phone with Universal Links / App Links
   verified (staging build against `airabynisarga.com`).
2. Sign up via mobile — `POST /api/auth/sign-up/email` fires from
   `apps/mobile/features/auth/api.ts:58`. No `callbackURL` is sent.
3. Wait for the verify email. Tap the "Verify email" button on the same
   phone.

**Reset path:**
1. Same environment.
2. Tap "Forgot password?" in the mobile login flow, submit an email.
   `forgotPasswordRequest` (`apps/mobile/features/auth/api.ts:103`)
   sends `redirectTo: ${API_BASE_URL}/reset-password`.
3. Wait for the reset email. Tap the button on the same phone.

**Expected:** the mobile app opens (Universal Link intercept), the
mobile screen completes the flow, user ends up in `/(app)`.
**Actual:** the browser opens the API endpoint; the server completes
the flow; the user lands on the web landing (or web `/reset-password`
page).

**Artifacts:**
- `specs/repro.test.ts` — pure vitest spec pinning the URL-shape
  mismatch. Run via `node_modules/.bin/vitest run --dir
  .mstack/debug/2026-07-27-1200-auth-emails-open-web/specs` — today
  it fails 2/6 exactly on the two failure-mode assertions and passes
  4/6 shape sanity checks.

## Investigation

**Better Auth's URL construction** (verified 2026-07-27 against
`node_modules/better-auth/dist/api/routes/`):

- `email-verification.mjs:29` —
  ```
  const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`
  ```
- `password.mjs:72` —
  ```
  const url = `${ctx.context.baseURL}/reset-password/${verificationToken}?callbackURL=${callbackURL}`
  ```

`baseURL` resolves to `<host>/api/auth` (Better Auth's mounted path).
So the actual emitted URLs are:
- Verify: `https://airabynisarga.com/api/auth/verify-email?token=…&callbackURL=/`
- Reset:  `https://airabynisarga.com/api/auth/reset-password/<token>?callbackURL=/reset-password`

**Auth hook wiring** (`packages/auth/src/server.ts`):

- `emailAndPassword.sendResetPassword` at :110 — receives `{user, url}`
  and passes `url` verbatim to `sendPasswordResetEmail({resetUrl: url})`.
- `emailVerification.sendVerificationEmail` at :122 — same pattern,
  passes `url` verbatim into `sendVerifyEmail({verifyUrl: url})`.
- `user.changeEmail.sendChangeEmailConfirmation` at :158 — same pattern,
  passes `url` verbatim into `sendVerifyEmail({verifyUrl: url})`. Fires
  when a user updates their email address; same failure mode.

**Universal Link configuration:**
- iOS `apps/web/public/.well-known/apple-app-site-association`:
  ```
  "paths": ["/verify*", "/reset-password*"]
  ```
  Apple matches these globs against the URL PATH (query stripped).
  `/api/auth/verify-email` doesn't start with `/verify`, so no match.
  `/api/auth/reset-password/<token>` doesn't start with `/reset-password`,
  so no match.
- Android `apps/mobile/app.config.ts:63-75` — `intentFilters` cover all
  paths under `airabynisarga.com` with `autoVerify: true`. Even when
  Android tries to launch the app, expo-router has no route for
  `/api/auth/…`, so it falls back to the browser.

**Client-side capability already exists:**
- `apps/mobile/app/(auth)/verify.tsx` — reads a `token` URL param and
  posts to `/api/auth/verify-email` on its own (`verifyEmailRequest` in
  `features/auth/api.ts:129`). Fully able to complete verification if
  the Universal Link opens it. File name maps to expo-router path
  `/verify` — NOT `/verify-email`.
- `apps/mobile/app/(auth)/reset-password.tsx:16` — reads a `token` URL
  param and posts to `/api/auth/reset-password`. Header comment
  ("URL: aira://reset-password?token=…") shows the author expected
  deep-link entry. File name maps to path `/reset-password` — already
  matches the Universal Link pattern.
- `apps/web/src/app/(auth)/verify-email/page.tsx` — SDK-driven page
  that completes verification and redirects to `/`. No change needed.
- `apps/web/src/app/(auth)/reset-password/page.tsx` — companion
  page. No change needed.

**Auth stack gate** (`apps/mobile/app/(auth)/_layout.tsx`): when
`me.data?.emailVerified` becomes true, the layout redirects to `/(app)`.
The mobile verify screen invalidates `useMe` on success, so the gate
routes the user into the app for free once verification lands.

**No internal references to `/(auth)/verify` from other mobile files.**
`grep -rn "/(auth)/verify"` yields only a comment in `_layout.tsx`, so
the rename cost is zero code-side.

## Root cause

Better Auth's default email URLs point at its own **API-mounted paths**
(`/api/auth/verify-email…` and `/api/auth/reset-password/<token>…`). The
project's `.well-known` Universal Link patterns (`/verify*`,
`/reset-password*`) are correctly aimed at the **client-facing paths**
(`/verify-email`, `/reset-password`) — but the hook in
`packages/auth/src/server.ts` passes Better Auth's raw URL through to
the email verbatim. Result: the emailed URL's path never satisfies the
Universal Link matcher; Universal Links stay silent; every tap opens
in the browser.

**Failing test:** `specs/repro.test.ts` — two assertions state that
"the URL currently emitted to the email must satisfy at least one
Universal Link path pattern." Today those two assertions fail because
`currentVerifyHookEmittedUrl(...)` and `currentResetHookEmittedUrl(...)`
return the raw Better Auth URL (`/api/auth/…`), which doesn't satisfy
the `/verify*` / `/reset-password*` matcher. Four accompanying sanity
tests pass, confirming the matcher itself is correct and the fix's
target shape (`/verify-email`, `/reset-password`) will make the failing
assertions pass.

## Fix plan (for /mstack-fix)

**Files to change:**

- **`packages/auth/src/server.ts`** — introduce a small pure helper
  `rewriteAuthEmailUrl(rawUrl: string): string` that:
  1. Parses `rawUrl` with `new URL(rawUrl)`.
  2. If the pathname starts with `/api/auth/verify-email`, extracts the
     `token` query param and rebuilds as `<origin>/verify-email?token=<token>`
     (dropping `/api/auth/` prefix and `callbackURL` param).
  3. If the pathname starts with `/api/auth/reset-password/` (token in
     path per Better Auth), extracts the trailing path segment as the
     token and rebuilds as `<origin>/reset-password?token=<token>`
     (moving token from path to query, dropping `callbackURL`).
  4. Pass-through for URLs that don't match either shape — future
     Better Auth changes (or already-rewritten URLs) survive gracefully.
  Then use it inside `sendResetPassword` (:110), `sendVerificationEmail`
  (:122), and `sendChangeEmailConfirmation` (:158) — each hook receives
  Better Auth's raw URL and hands off `rewriteAuthEmailUrl(url)` to the
  email template instead of the raw URL.
- **`apps/mobile/app/(auth)/verify.tsx` → `apps/mobile/app/(auth)/verify-email.tsx`** —
  rename so expo-router serves the mobile verify screen at the same
  path the emailed link now points to (`/verify-email`). The file
  is a self-contained default export; the sole comment reference in
  `_layout.tsx` also updates to `verify-email.tsx` for accuracy but
  is optional. No other refs to update.
- **`apps/mobile/app/(auth)/reset-password.tsx`** — no rename needed;
  file already sits at the matching path. Sanity-check the file's
  header comment (`URL: aira://reset-password?token=…`) still makes
  sense — it does; add a one-liner noting the same route is also the
  Universal Link target for the emailed `https://…/reset-password?token=…`.
- **`packages/auth/src/server.ts`** — add a small unit test file at
  `packages/auth/src/__tests__/rewrite-auth-email-url.test.ts` that
  covers verify (query-token), reset (path-token), passthrough for
  unknown shapes, and the Universal-Link-shape assertion. Same
  behavioural contract as `specs/repro.test.ts`, but living with the
  code so future auth-hook refactors re-run it. Runs via the workspace
  vitest binary standalone until the `packages/auth` package gets a
  proper `test` script wired.

**Why it fixes the cause:** the failing assertion in
`specs/repro.test.ts` states that the emailed URL's path must satisfy a
Universal Link pattern. The rewriter's output for both verify and reset
begins with `/verify-email` and `/reset-password` respectively — both
match. Once the emitted URL matches, iOS Universal Links + Android App
Links intercept the tap, expo-router opens the corresponding mobile
screen (which already knows how to complete the flow), and the user
lands in `/(app)` via the auth stack gate.

**Hard-rule reminders:**

- **`import "server-only"`** — the URL rewriter lives inside
  `packages/auth/src/server.ts`, a `"server-only"`-marked module. Keep
  it there; do NOT expose the rewriter through `packages/auth`'s
  public index. Pure `URL`-parsing helper — no server-only APIs used
  by the rewriter itself, but the caller lives on the server, so the
  file boundary is correct.
- **No brand-string literals**; the rewriter operates on the URL it
  receives, never hard-codes host or brand copy.
- **No new dep.** `URL` is a Node built-in.
- **Do not modify `.well-known` files.** `/verify*` and `/reset-password*`
  already cover the target paths.
- **Do not touch Better Auth's version or plugin list.** The rewriter
  is a hook-level string transform; nothing about Better Auth's own
  server routes changes.

**Acceptance:**

1. `node_modules/.bin/vitest run --dir .mstack/debug/2026-07-27-1200-auth-emails-open-web/specs`
   → all 6 tests pass. (Today: 2 failing, 4 passing.)
2. Manual repro on Expo Go against a staging Better Auth: sign up →
   tap verify email on-device → mobile app opens → `/(app)` after
   verification. Same for password reset.

**Out of scope:**

- **Password reset from the WEB flow** already works: web
  `forgot-password/page.tsx` passes `redirectTo: `${window.location.origin}/reset-password`` and, once the URL rewriter is in place, the same
  rewritten URL is emailed regardless of client origin — web users
  land on the web reset page (Universal Links only match on the app-
  installed device), mobile users land in the app.
- **`autoSignInAfterVerification: true`** on Better Auth: the mobile
  verify screen already invalidates `useMe`, so post-verify sign-in
  works client-side too. No change needed for either surface.
- **Change-email confirmation** is *in* scope for the rewriter (same
  file, same hook shape) but out of scope for the mobile route
  investigation — the current change-email flow completes on the web
  regardless, and mobile doesn't have a dedicated screen for it yet.
  Rewriter applies to be consistent; QA doesn't need to test that path
  as part of this fix.

## External references

- `node_modules/better-auth/dist/api/routes/email-verification.mjs:29` —
  checked 2026-07-27 — confirms `${baseURL}/verify-email?token=…&callbackURL=…` shape.
- `node_modules/better-auth/dist/api/routes/password.mjs:72` —
  checked 2026-07-27 — confirms `${baseURL}/reset-password/${token}?callbackURL=…` shape (token in path, not query).
- Apple's Universal Links `paths` glob docs (behavior described in
  `.claude/memory/…` notes historically referenced) — Apple matches
  path patterns against the URL's PATH portion only, query is ignored.
  Verified via the failing spec's own path-only matcher which
  independently validates the four sanity assertions.
