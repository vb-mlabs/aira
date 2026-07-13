# Fix — sweep the remaining Better Auth callers missing absolute `callbackURL`/`redirectTo`

**Started:** 2026-07-13 07:35
**Source:** follow-ups filed under fix 72ca686 (password reset) and fix cfab4ff (change email). User instruction: "knock out the four adjacent bugs".
**Status:** fixed
**Commits:** see per-fix section below

## Symptom / repro

Four Better Auth callers in the codebase were passing no `callbackURL`/`redirectTo`, so their emailed links had `callbackURL=` empty — same class of bug proven live by the user's paste of the password-reset link (`https://airabynisarga.replit.app/api/auth/reset-password/…?callbackURL=`). See fix 72ca686 for the full trace and root-cause analysis.

Structural repro only — no per-fix live reproduction attempted (each requires real Postmark send + inbox click, out of same-session reach). The four callers were identified by grep sweep in the previous fix's bounded look and confirmed by code inspection here.

## Root cause

Same as 72ca686 and cfab4ff: Better Auth validates `redirectTo`/`callbackURL` against baseURL and `trustedOrigins` (undefined in prod), silently drops relative paths, and emits `callbackURL=` empty in the outbound URL. Every caller must pass an absolute URL.

## Fixes

Each atomic commit stands alone (independently reverible) — bundled here for narrative.

### 1. Admin `sendPasswordResetTo` (web, server-side)

**File:** `apps/web/src/server/operations/admin.ts`
**Change:** pass `redirectTo: buildAuthUrl("/reset-password")` in the `auth.api.requestPasswordReset` body.
**Landing:** `/reset-password` — same as user-initiated forgot-password.
**Commit:** (pending)

### 2. Web signup verify-email (client-side)

**File:** `apps/web/src/app/(auth)/signup/page.tsx`
**Change:** pass `callbackURL: \`${window.location.origin}/\`` in the `signUp.email` call.
**Landing:** `/` — same target the existing `/verify-email` page redirects to on success (verify-email/page.tsx:35). Wiring it as the callbackURL cuts out the intermediate hop for the happy path.
**Commit:** (pending)

### 3. Mobile forgot-password + resend-verify (client-side, mobile)

**File:** `apps/mobile/features/auth/api.ts` (two hunks, bundled — same file, same class)

- `forgotPasswordRequest` → `redirectTo: \`${API_BASE_URL}/reset-password\``
- `resendVerifyRequest` → `callbackURL: \`${API_BASE_URL}/\``

**Landing rationale:** `API_BASE_URL` points at the web apex (airabynisarga.com) via `EXPO_PUBLIC_API_BASE_URL`. Universal links on iOS/Android catch the URL and open the mobile app if installed; browser fallback lands on the web page.
**Commit:** (pending)

## Evidence

- `pnpm --filter @aira/web exec tsc --noEmit` → clean
- `pnpm --filter @aira/mobile exec tsc --noEmit` → clean
- `pnpm --filter @aira/web exec vitest run` → 172/172 pass
- `pnpm --filter @aira/web exec eslint <touched web files>` → clean
- `pnpm --filter @aira/mobile exec eslint features/auth/api.ts` → clean

**End-to-end verification requires prod smoke tests** for each flow (email sent → click → land on expected URL). Enumerated in the prod smoke test list below.

## Prod smoke tests (after deploy)

1. **Admin reset:** as admin, use "Send password reset" on a user in /admin/users → user receives email → link ends `?callbackURL=https%3A%2F%2Fairabynisarga.com%2Freset-password&token=…` → click lands on `/reset-password?token=…`.
2. **Web signup:** sign up with a new email at `/signup` → verify link ends `?callbackURL=https%3A%2F%2Fairabynisarga.com%2F&token=…` → click verifies and lands on `/` signed in.
3. **Mobile forgot-password:** in the Expo app, tap "Forgot password" → resend email → link ends `?callbackURL=<API_BASE_URL>%2Freset-password&token=…`.
4. **Mobile resend-verify:** in the Expo app after signup, tap "Resend verification email" → link ends `?callbackURL=<API_BASE_URL>%2F&token=…`.

## Follow-ups

None — the four adjacent-bug follow-ups filed under fixes 72ca686 and cfab4ff are all resolved by this sweep.
