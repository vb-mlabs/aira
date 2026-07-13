# Fix — change-email confirmation link has empty `callbackURL=`

**Started:** 2026-07-13 07:26
**Source:** user request after review of the change-email flow (follow-on to fix 72ca686 which addressed the same class of bug in password reset)
**Status:** fixed
**Commit:** (pending)

## Symptom / repro

The change-email confirmation email (sent to the CURRENT verified address per `packages/auth/src/server.ts:158`) links to Better Auth's change-email callback endpoint. Bounded look via code inspection — the server-side call at `apps/web/src/server/operations/users.ts:167` was:

```ts
await auth.api.changeEmail({
  body: { newEmail },
  headers: await headers(),
})
```

No `callbackURL` in the body → Better Auth emits the confirmation link with an empty callbackURL — same shape as the password-reset link in the user's paste from earlier in this session. After the user clicks and Better Auth completes the DB swap, the 302 lands nowhere useful.

No live email-and-click reproduction attempted (out of same-session reach — needs real Postmark send + inbox). The structural cause is identical to the verified password-reset case (fix 72ca686): Better Auth requires an absolute URL that passes baseURL/trustedOrigins validation, or it emits empty.

## Root cause

`auth.api.changeEmail` does not receive a `callbackURL` from the op handler. Better Auth then serializes the confirmation link with `callbackURL=` empty, so the 302 after successful token verification has no destination. User sees a broken landing even though the DB swap may have succeeded.

## Fix

`apps/web/src/server/operations/users.ts` — pass `callbackURL: buildAuthUrl("/account")` in the `changeEmail` body. Server-side call so we can't use `window.location.origin`; `buildAuthUrl` from `@/lib/email/url` builds an absolute URL from `BETTER_AUTH_URL` (falling back through the chain landed in commit 533da21), which is the same origin as Better Auth's baseURL — passes validation.

Landing target: `/account` — user sees the new email applied on the settings page.

## Evidence

- typecheck: `pnpm --filter @aira/web exec tsc --noEmit` → clean
- full apps/web vitest suite: `pnpm --filter @aira/web exec vitest run` → all pass
- lint on touched file: `pnpm --filter @aira/web exec eslint <touched>` → clean
- structural parity with fix 72ca686 (password reset) which had a live reproduction from the user

**End-to-end verification requires a prod smoke test** — request an email change, receive confirmation at CURRENT address, click, verify the URL ends with `?callbackURL=https%3A%2F%2Fairabynisarga.com%2Faccount&token=…` and lands on `/account` with the new email applied.

## Follow-ups

Adjacent bugs discovered during the bounded look — all same class (missing `callbackURL` / `redirectTo` on Better Auth call), out of this fix's scope. Appended to TODOS:

1. **Web signup** — `apps/web/src/app/(auth)/signup/page.tsx:39` calls `signUp.email({ email, password, name })` with no `redirectTo`. The verify-email link sent on signup has the same empty-callbackURL bug.
2. **Mobile resend-verify** — `apps/mobile/features/auth/api.ts:136` POSTs `{ email }` only to `/api/auth/send-verification-email`. Same bug — verify link has empty callbackURL.

(Plus the two already filed under fix 2026-07-13-0654: admin `sendPasswordResetTo`, mobile `forgotPasswordRequest`.)
