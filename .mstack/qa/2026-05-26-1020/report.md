# QA report — 2026-05-26 10:20

**Focus:** Admin idle-timeout flow (verifying the `feat/auth-rbac-hardening` slice end-to-end)
**Env:** Replit dev preview (https://$REPLIT_DEV_DOMAIN, dev server on port 5000, fresh restart after migrations 0008+0009)
**Status:** clean — 1 critical issue found and fixed in-run (`e2ded62`)
**Tester:** /mlabs-qa
**Branch tested:** feat/auth-rbac-hardening (12 implementation commits + 1 mstack-artifacts commit + 1 QA fix commit)

## Setup

- Migrations 0008 (`session.last_activity_at`) and 0009 (`user_role` pgEnum) applied via `pnpm db:migrate` against the dev Neon branch — clean.
- Dev server killed (PID 274) and restarted; new code is live (verified via /login HTML containing the IdleBanner markup and /admin/users returning 307 → /login).
- Dev DB was empty (zero users); synthetic admin created inline for the integration probe.

## Scenarios run

1. **Marketing landing page renders** — ✓ pass
2. **/login renders WITHOUT IdleBanner** when `?reason` is absent — ✓ pass
3. **/login?reason=idle renders the IdleBanner** with `role=status`, `aria-live=polite`, and the locked microcopy — ✓ pass
4. **/admin/users redirects unauthenticated to /login** with HTTP 307 — ✓ pass
5. **/signup form renders** with email + password fields — ✓ pass
6. **Bearer-authed admin GET /admin/users with fresh session** — ✓ 200 returned (HTTP-layer wiring works)
7. **Bearer-authed admin GET /admin/users after `last_activity_at` fast-forwarded 31 minutes** — ✗ **FAIL**: returned 200 instead of 307. **The idle-timeout never fires.**
8. **`audit_log` row with `reason: "idle_timeout"`** after the fast-forwarded request — ✗ **FAIL**: no row written, matching the failed bounce.

Screenshots: `assets/01-marketing.png`, `assets/02-login-clean.png`, `assets/03-login-idle-banner.png`, `assets/04-signup.png`.

## Issues

### Issue 1: Admin idle-timeout does not fire — Better Auth omits `session.last_activity_at` from the session shape

- **Severity:** **critical** — the whole point of the slice (sliding 30-min idle window on admin sessions) doesn't actually protect anything.
- **Repro:**
  1. With a real admin session (any cookie/bearer transport), visit `/admin/users` → 200.
  2. `UPDATE "session" SET last_activity_at = NOW() - INTERVAL '31 minutes' WHERE id = '<your-session-id>'`.
  3. Visit `/admin/users` again.
- **Expected:** 307 to `/login?reason=idle`, plus an `audit_log` row with `action = "session.revoked"` and `metadata.reason = "idle_timeout"`.
- **Actual:** 200. No audit row written. The session continues to be considered fresh.
- **Screenshot:** N/A (diagnostic is HTTP/JSON; the captured response body is shown in §"Diagnostic evidence" below).
- **Console errors:** none.
- **Suspected cause** (verified): Better Auth's bearer plugin (and likely the cookie path too — needs a second probe to confirm) doesn't surface fields declared in `session.additionalFields` config when it returns the session shape via `/api/auth/get-session`. The current `adminSessionIsStale` (`apps/web/src/lib/auth/server.ts:151`) reads `s.last_activity_at` off the session object, finds it `undefined`, and short-circuits with `return false` (the same branch we use to skip the check for JWT-synthesized sessions). Result: the check is a no-op for every real session.
  - The `user.additionalFields` config DOES surface `banned_at` and `banned_reason` in the user shape (visible in the diag response). So `additionalFields` works for `user` but not `session` — looks like a Better Auth bug or undocumented limitation.
- **Fix plan:** stop relying on Better Auth surfacing the column. Query it directly inside `adminSessionIsStale` via a single Drizzle `SELECT last_activity_at FROM session WHERE id = ?`. One DB read per admin request, same cost as the existing implicit read we thought we were getting. Update the helper's signature to accept `(sessionId: string)` instead of `(session: AuthSession["session"])` since we no longer need the session shape. Update T7's two callers in `requireAdmin`/`requireSuperAdmin` and T8's caller in `apps/web/src/server/operations/index.ts`.
- **Test gap:** the T11 mocked tests for `adminSessionIsStale` injected `last_activity_at` directly into the session stub — they never exercised the real Better Auth → adminSessionIsStale handoff. The fix should add a Vitest that explicitly mocks Better Auth's session shape as it actually returns (no `last_activity_at`) to lock in this regression.
- **Status:** ✓ fixed (commit `e2ded62`). Re-run of `specs/verify-idle-timeout.ts` confirms all 8 steps pass: stale session bounces to `/login?reason=idle` with HTTP 307 and `audit_log` row `metadata = { kind: "session.revoked", client: "web", reason: "idle_timeout" }`.

### Diagnostic evidence (Issue 1)

Raw response from `GET /api/auth/get-session` with `Authorization: Bearer <token>` against a freshly inserted session row whose `last_activity_at` was 31 minutes in the past:

```json
{
  "session": {
    "expiresAt": "2026-06-02T10:39:04.811Z",
    "token": "...",
    "createdAt": "2026-05-26T10:39:04.811Z",
    "updatedAt": "2026-05-26T10:39:04.811Z",
    "ipAddress": null,
    "userAgent": null,
    "userId": "qa-diag-...",
    "id": "..."
  },
  "user": {
    "name": "QA Diag",
    "email": "...@qa.local",
    "emailVerified": true,
    "image": null,
    "createdAt": "...",
    "updatedAt": "...",
    "role": "admin",
    "banned_at": null,
    "banned_reason": null,
    "id": "..."
  }
}
```

Note: `user` includes the additionalFields-declared `role`, `banned_at`, `banned_reason`. `session` does **NOT** include `last_activity_at` even though it's declared identically in `session.additionalFields`.

The probe script lives at `specs/verify-idle-timeout.ts`. Re-run with `pnpm exec tsx .mstack/qa/2026-05-26-1020/specs/verify-idle-timeout.ts` after any fix to confirm. (Same env: needs `DATABASE_URL` and `REPLIT_DEV_DOMAIN` in shell.)

## Summary

8 scenarios run · **1 critical issue (fixed)** · 0 high · 0 medium · 0 low

The visual surface (IdleBanner rendering, `/admin/users` redirecting unauth users, `/signup` and `/login` regression-free after the role-enum migration cascade) is clean. The behavioral guarantee the whole slice exists to provide — **admin sessions get bounced after 30 minutes of idle** — was silently broken because Better Auth's `session.additionalFields` config doesn't surface custom columns in the returned session shape. The fix (`e2ded62`) decouples `adminSessionIsStale` from Better Auth's shape entirely and reads the column directly via Drizzle. Re-verified end-to-end.

**Recommended next step:** ship. The branch is now safe to merge. Suggested verification on the PR reviewer's end: re-run `pnpm exec tsx .mstack/qa/2026-05-26-1020/specs/verify-idle-timeout.ts` against any environment to confirm idle-timeout fires under their config.
