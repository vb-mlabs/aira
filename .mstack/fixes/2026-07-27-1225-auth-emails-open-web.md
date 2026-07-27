# Fix — mobile auth emails open the web landing page instead of the app

**Started:** 2026-07-27 12:25
**Source:** debug/2026-07-27-1200-auth-emails-open-web
**Status:** fixed
**Commit:** 095a428

## Symptom / repro

Mobile user signs up → verification email opens the browser and lands
on the web home page; user never returns to the app. Identical
failure for the password-reset email. Reproduced pre-fix by the debug
run's spec at
`.mstack/debug/2026-07-27-1200-auth-emails-open-web/specs/repro.test.ts`
— 2 assertions failing (verify + reset shape checks), 4 sanity
assertions passing.

## Root cause

Better Auth's default URLs point at its own API-mounted paths
(`<origin>/api/auth/verify-email?token=…&callbackURL=…` and
`<origin>/api/auth/reset-password/<token>?callbackURL=…`, verified
against `node_modules/better-auth/dist/api/routes/{email-verification,
password}.mjs`). iOS Universal Link path patterns configured in
`apps/web/public/.well-known/apple-app-site-association` target the
client-facing paths (`/verify*`, `/reset-password*`) — matched against
URL PATH only, and `/api/auth/...` doesn't start with `/verify` or
`/reset-password`. So the pattern misses; the tap opens in Safari;
Better Auth completes the flow on the server; the browser lands on
the web page. Only surfaced when a mobile user opens the email on the
same phone as the app is installed on.

## Fix

**Files touched:**

- `packages/auth/src/rewrite-auth-email-url.ts` — new pure helper.
  Parses the raw URL, extracts the token (from the query for verify,
  from a trailing path segment for reset — Better Auth's two shapes),
  and rebuilds as `<origin>/verify-email?token=…` or
  `<origin>/reset-password?token=…`. Passes through already-rewritten
  or unknown-shape URLs unchanged so future Better Auth changes
  degrade gracefully. Marked `import "server-only"` since it lives on
  the auth server side.
- `packages/auth/src/server.ts` — imports the helper and wires it
  into three Better Auth hooks: `sendResetPassword` (:110),
  `sendVerificationEmail` (:122), and
  `user.changeEmail.sendChangeEmailConfirmation` (:158). Each now
  hands `rewriteAuthEmailUrl(url)` to the email template instead of
  Better Auth's raw URL.
- `apps/mobile/app/(auth)/verify.tsx` → `verify-email.tsx` — rename
  via `git mv` so expo-router serves the mobile verify screen at the
  same path the emailed link now targets. reset-password.tsx already
  sits at the matching path; no rename needed. Updated the sole
  comment reference in `_layout.tsx`.
- `packages/auth/src/__tests__/rewrite-auth-email-url.test.ts` —
  co-located regression coverage for both shapes (verify + reset),
  Universal Link pattern satisfaction, defensive passthroughs, and
  idempotency. 12 assertions.
- `.mstack/debug/2026-07-27-1200-auth-emails-open-web/specs/repro.test.ts`
  + `vitest.config.ts` — swapped the local passthrough helpers for
  the real rewriter import and aliased `server-only` so the standalone
  vitest run resolves the auth package's cross-boundary import. The
  spec now passes end-to-end and serves as the durable acceptance
  gate for the fix.

**Web + mobile round-trip preserved:** the rewriter emits an
`https://…/verify-email?token=…` URL that works on BOTH surfaces —
Universal Links intercept on-device, expo-router opens the mobile
verify screen which posts to `/api/auth/verify-email`; on any other
device the browser opens the existing web `/verify-email/page.tsx`
which completes the flow via the Better Auth SDK client. Same shape
for reset.

## Evidence

- **Debug repro spec (acceptance criterion #1):**
  `cd .mstack/debug/2026-07-27-1200-auth-emails-open-web/specs && /home/runner/workspace/node_modules/.bin/vitest run`
  → `Test Files  1 passed (1) · Tests  6 passed (6)` (was 2 failing
  before the fix landed in this same session).
- **Auth package tests:** `pnpm --filter @aira/auth test`
  → `Test Files  3 passed (3) · Tests  21 passed (21)` (12 new
  assertions in `rewrite-auth-email-url.test.ts` + the pre-existing
  admin-bootstrap / super-admin-bootstrap tests kept green).
- **Workspace typecheck:** `pnpm typecheck` from repo root
  → `Tasks: 10 successful, 10 total` (7 cached, 3 fresh).
- **Workspace lint:** `pnpm lint` from repo root
  → `Tasks: 3 successful, 3 total`.
- **Lefthook pre-commit** on commit 095a428: check-migrations +
  check-contrast passed without bypass.
- **Manual repro (acceptance criterion #2):** deferred — requires a
  device with Universal Links verified against staging Better Auth.
  QA follow-up on Expo Go.

## Follow-ups

Captured in TODOS.md via `append-todo.sh`:
- Real-device smoke: mobile signup → tap verify email on the same
  device → app opens → mobile verify screen completes → land in
  `/(app)`. Repeat for password reset. Same test rig for change-email
  is nice-to-have but lower priority (no dedicated mobile screen yet).

No adjacent bugs surfaced during the bounded look. The three Better
Auth hooks in `server.ts` were the complete surface — no other
`send…Email` callbacks in the auth package.
