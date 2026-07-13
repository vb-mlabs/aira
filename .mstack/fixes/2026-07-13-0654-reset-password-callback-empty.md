# Fix — password reset email link has empty `callbackURL=`, token appears broken on click

**Started:** 2026-07-13 06:54
**Source:** user report (real emailed link pasted in conversation)
**Status:** fixed
**Commit:** (pending)

## Symptom / repro

Real reset-password email link received by a user:

```
https://airabynisarga.replit.app/api/auth/reset-password/yLe0crxFgefSFWZtC8gJmVK6?callbackURL=
```

Two independent defects visible in the URL:

1. **Host is `airabynisarga.replit.app` (Replit publish subdomain), not the apex `airabynisarga.com`.** Deployment env issue — addressed separately by fixing `BETTER_AUTH_URL` deployment secret. Not this fix's scope.
2. **`callbackURL=` is empty.** On click, Better Auth's GET handler validates the token then 302s to `${callbackURL}?token=…` — an empty callbackURL makes that redirect land nowhere useful, so the client-side `/reset-password` page never runs and the user sees "the token is broken". **This fix's scope.**

## Root cause

`apps/web/src/app/(auth)/forgot-password/page.tsx:33`:

```ts
await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })
```

`redirectTo` is a **relative** path. Better Auth normalizes `redirectTo` to an absolute URL, validating it against baseURL/`trustedOrigins`. In production, `trustedOrigins` is `undefined` (see `apps/web/src/lib/auth/index.ts:31-40` — the non-prod branch), so the relative path is dropped and Better Auth emits an empty `callbackURL=` in the email link. Absolute same-origin URLs are always accepted.

## Fix

`apps/web/src/app/(auth)/forgot-password/page.tsx` — build the redirect from `window.location.origin` so it's an absolute same-origin URL that matches Better Auth's baseURL. One-line change.

## Evidence

- typecheck: `pnpm --filter @aira/web exec tsc --noEmit` → clean
- full apps/web vitest suite: `pnpm --filter @aira/web exec vitest run` → 172/172 pass (no regressions in the touched call site's surrounding code)
- lint on touched files: `pnpm --filter @aira/web exec eslint <touched>` → clean
- structural: same-origin absolute URL always passes Better Auth's callbackURL validation; the current relative path is the demonstrated cause of the empty query param.

**Regression test attempted, deferred.** Wrote a React Testing Library test to assert `requestPasswordReset` receives an absolute `redirectTo`. It fails with "Invalid hook call / multiple copies of React" because no other test in `apps/web/tests/` renders React components — RTL isn't set up (no react dedupe alias in vitest.config, no established pattern). Standing up that infra is a separate scope-gate escalation. Removed the test and filed a follow-up.

**End-to-end verification requires prod smoke test** — email sent → click → land on `/reset-password?token=…` is out of same-session reach (needs real Postmark send + real inbox).

## Follow-ups

Appended to TODOS:

1. `apps/web/src/server/operations/admin.ts:121` — admin `sendPasswordResetTo` calls `auth.api.requestPasswordReset({ body: { email } })` without any `redirectTo`. Same symptom will hit admin-initiated resets.
2. `apps/mobile/features/auth/api.ts:107` — mobile `forgotPasswordRequest` POSTs `{ email }` only, no `redirectTo`. Mobile users get the same broken link. Fix shape differs from web (needs a web URL that universal links can catch).
3. Stand up React Testing Library in `apps/web/tests/` — dedupe React in vitest.config, add a working RTL example so component tests are viable. Then port the regression test for this fix.
