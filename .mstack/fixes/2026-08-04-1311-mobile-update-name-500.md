# Fix — Mobile "update name" returns generic 500

**Started:** 2026-08-04 13:11
**Source:** user-report (with server logs)
**Status:** in-progress
**Commit:** —

## Symptom / repro
Mobile PATCH `/api/v1/profile` with `{ name }` returns
`{ error: { code: "internal.unhandled", message: "Unexpected server error" } }`
(HTTP 500). The mobile app surfaces this as an "unexpected error" toast.
Server log for the failing request:

```
op: 'users.updateName'
level: 'error'
message: 'operation.unhandled'
stack: 'APIError: Unauthorized'
error: 'Unauthorized'
requestId: '5cdfc976-29be-458e-a878-6a8aca12f5e5'
```

## Root cause
Mobile authenticates every `/api/v1/*` call with a stateless custom JWT
(`Authorization: Bearer <jwt>`). Our `getSessionFromHeaders` decodes that
JWT and returns a synthetic session — so `updateNameOp`'s auth check passes.

But `updateNameOp.handler`
(`apps/web/src/server/operations/users.ts:98`) then delegates the write
to `auth.api.updateUser({ headers: await headers() })`. Better Auth runs
its OWN session lookup via cookies / its bearer-plugin session token,
neither of which matches our custom JWT. It throws Better Auth's
`APIError("UNAUTHORIZED")` (from `better-call`).

The operation adapter's catch
(`packages/api/src/operation.ts:298`) branches on `@aira/api`'s
`ApiError` — a different class. `isApiError()` returns false, the error
falls to the "unhandled" branch, and mobile receives the generic 500.

## Fix
`apps/web/src/server/operations/users.ts` — in `updateNameOp.handler`,
branch on `ctx.source`. For `"mobile"`, update the `user.name` column
directly via Drizzle (no Better Auth involvement). For `"web"`, keep the
existing `auth.api.updateUser` call so Better Auth's cookie-backed
session cache stays fresh (session.user.name would otherwise lag until
next refresh). Both paths still run the "no-op if unchanged"
short-circuit and the pre-write audit.

Not bundled (recorded as follow-ups):
- Same mobile-vs-Better-Auth mismatch in `requestEmailChangeOp` and
  `changePasswordOp` (mobile calls to `/api/v1/profile/email` and
  `/api/v1/profile/password` fail the same way). Confirmed on paper by
  reading the handlers, not reproduced yet.
- `operation.ts`'s catch swallowing Better Auth's `APIError` as
  `operation.unhandled` — should recognize and rethrow as a proper 401
  so future misuses degrade gracefully instead of masking 500s.

## Evidence
- `pnpm --filter @aira/web typecheck` → clean (no output past the tsc
  invocation line — TS accepts the added Drizzle update call and the
  branch)
- Trace-through repro: mobile client sets `X-Client: mobile`
  (`apps/mobile/lib/api/client.ts:194`) → `buildContext` derives
  `ctx.source === "mobile"` (`packages/api/src/operation.ts:132`) →
  new branch runs `db.update(user).set({name})…` and never touches
  `auth.api.updateUser`, so Better Auth's `APIError("UNAUTHORIZED")`
  is no longer reachable on mobile. Web path is byte-identical to the
  pre-fix implementation.
- No test covers `updateNameOp` (`grep -rn "updateNameOp" | wc -l` = 4:
  the export, the route mount, the module comment, and this reference).

## Follow-ups
- `requestEmailChangeOp` — same mobile bearer / Better Auth mismatch
  (`apps/web/src/server/operations/users.ts:187`)
- `changePasswordOp` — same
  (`apps/web/src/server/operations/users.ts:231`)
- Operation adapter catch — teach `defineOperation`'s catch about
  Better Auth's `APIError` so it degrades to a proper 401 instead of a
  masked 500
