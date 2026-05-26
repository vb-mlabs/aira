# Plan: Auth RBAC hardening (Sprint 1, partial — sans MFA)

**Date:** 2026-05-26
**Slug:** auth-rbac-hardening
**Status:** reviewed
**Author:** Claude (with framer@millionlabs.co.uk as project lead)
**Reviewed:** [../reviews/2026-05-26-auth-rbac-hardening.md](../reviews/2026-05-26-auth-rbac-hardening.md) (UI-Significant: no)

---

## Problem

The current admin shell at `/admin/*` is gated by `requireAdmin()` (apps/web/src/lib/auth/server.ts:142), which checks one thing — that the session user's `role` column equals the literal string `"admin"`. The protection holds as far as it goes, but three concrete gaps mean a leaked admin password (or even a stale browser tab) gives a hostile actor essentially unlimited time and freedom inside the dashboard:

1. **`role` is free-form text.** `user.role` is `text default "user"` with no DB constraint and no app-level enum. A buggy migration or a direct DB write that sets `role = "Admin"` (capital A) or `role = "superadmin"` quietly bypasses the equality check. There is also no concept of `super_admin` in the schema today — but the PRD/roadmap explicitly distinguishes the role (only super_admin can promote/demote other admins).
2. **No idle-timeout on admin sessions.** Better Auth keeps the session valid for whatever default it ships with. An admin who walks away from a laptop for hours can be impersonated by anyone who sits down at it; the route guard cares about *role*, not *recency*.
3. **No structured audit of authentication events.** `audit_log` + `audit()` (apps/web/src/lib/db/audit.ts) and the typed `AuditMeta` allowlist (packages/db/src/audit.ts) already exist and are wired into a handful of admin actions (`user.role_changed`, `user.banned`, etc.). But sign-in itself, the initial admin/super-admin bootstrap, and forced timeouts are not recorded. Without those rows, post-incident "who logged in from where, and when" is impossible.

**Primary persona:** AIRA admin / super_admin (internal staff). **Wedge:** the gap between "we have role-gated routes" and "we'd survive a compromised admin password". Success looks like: every admin route checks a typed enum role, every admin session bounces after 30min of idle, every sign-in / role change / timeout writes a typed audit row, and `super_admin` is a real concept (not a string convention).

Out of scope for this plan: TOTP MFA (deferred — was offered in the scope question, you declined), phone OTP (Sprint 1.5), social auth (Phase 2+), passkey/WebAuthn, self-serve admin invite flows.

## Scope

**In:**

- **Postgres enum + Drizzle `pgEnum`** for `user.role` with values `{end_user, admin, super_admin}`. Migration that maps existing `"user"` rows → `"end_user"` (in-place, advisory-locked).
- **Helper rename + super_admin addition** in `apps/web/src/lib/auth/server.ts`: `requireAdmin()` accepts both `admin` and `super_admin` (super covers admin), and a new `requireSuperAdmin()` for super-admin-only operations. Both also enforce the freshness check (below).
- **Idle-timeout on admin requests.** Configure Better Auth with `expiresIn: 7d`, `updateAge: 30min` (session is rotated on activity, no DB write more often than every 30 min). `requireAdmin()` then rejects when `now - session.updatedAt > 30 min` — revokes the session, writes a `session.revoked` audit with reason `"idle_timeout"` (new enum value), and redirects to `/login?reason=idle`. End-user routes inherit the 7d Better Auth default with no extra check; they just need a valid session.
- **Super_admin bootstrap.** New env var `INITIAL_SUPER_ADMIN_EMAIL`. Extend `packages/auth/src/hooks/admin-bootstrap.ts` (or add `super-admin-bootstrap.ts` mirroring the pattern) so the first user signing up with that email is promoted directly to `super_admin`. INITIAL_ADMIN_EMAIL keeps its current behaviour (promotes to `admin`); the two env vars must be different emails (validated at boot in `apps/web/src/config/env.ts`).
- **Audit promotions.** Both bootstrap hooks write a `user.role_changed` row with `from: "end_user"`, `to: "admin" | "super_admin"`, and a new `actor_id: null` convention meaning "system promotion via bootstrap env var". `actor_id` is already nullable on `audit_log` so no schema change required.
- **Audit sign-ins.** Better Auth lifecycle hooks (`session.create`, equivalent for verify-email + password-reset-complete) call `audit()` with new typed `AuditMeta` variants: `user.signed_in`, `user.signed_in_failed`, `user.signed_up`. The `failed` variant uses `actor_id: null` (we don't always know who tried).
- **Logout flows hardened.** Existing `SignOutButton` already revokes the session via Better Auth. Wire it to also write a `session.revoked` audit (`reason: "logout"`) — `AuditMeta` already supports this. Same on mobile (`useSignOut()` hook).
- **`role` Zod schema** in `packages/validators/src/auth.ts` (or wherever the user schema lives) — re-uses the DB enum literals so the source of truth is the enum.

**Out (deferred):**

- TOTP MFA. The Better Auth two-factor plugin + `qrcode` lib are roadmap-noted for S1 but you explicitly declined them this slice. **Open question for the reviewer:** is MFA a separate plan doc, or are we deferring entirely to a Phase 2 hardening pass? If the latter, the roadmap entry needs a note.
- Phone OTP, social auth, passkey, self-serve invite (all confirmed out per scope question).
- Audit-log retention/cleanup. The table will start accumulating sign-in rows daily; a separate `audit_log_retention` cron is out of scope for this sprint but flagged in [TODOS.md](../../TODOS.md) as a follow-up.
- Mobile equivalent of the 30min idle-timeout. There are no admin screens on mobile (admin is web-only by design per PRD), so the mobile JWT keeps the longer expiry. If we ever add mobile-admin, the freshness check moves into the bearer-verification path.

## Approach

**Chosen: single Better Auth session config + app-layer freshness check + Drizzle `pgEnum`.**

The two genuinely contested decisions are (a) how to represent the role and (b) how to enforce per-role idle-timeout when Better Auth only has one global `expiresIn` / `updateAge`.

For role, a Postgres enum (`pgEnum("user_role", ["end_user", "admin", "super_admin"])`) is the right tool: the set is small, stable, and the DB-level constraint is exactly the protection we wanted. Drizzle's `pgEnum` generates a proper SQL `CREATE TYPE`, and any later additions go through a migration (which is the discipline we want anyway — adding `business_admin` later should not be a casual change). We migrate existing `"user"` rows to `"end_user"` in the same migration, advisory-locked via the existing `pnpm db:migrate` script.

For the timeout, Better Auth's `expiresIn` + `updateAge` are global — they govern *all* sessions, not per-role. Rather than running two Better Auth instances (one short-lived for admin, one long-lived for end-user — heavy, requires two cookie scopes, complicates the shared bearer/JWT path), we configure one instance with `expiresIn: 7d` + `updateAge: 30min` and put a per-role freshness check in the request-time guard:

```ts
// apps/web/src/lib/auth/server.ts
export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== "admin" && user.role !== "super_admin") notFound()
  const session = ... // already on getSession() return
  const idleMs = Date.now() - session.updatedAt.getTime()
  if (idleMs > 30 * 60 * 1000) {
    await auth.api.signOut({ headers: await headers() })
    await audit({ actorId: user.id, action: "session.revoked",
                  meta: { kind: "session.revoked", reason: "idle_timeout" }, client: "web" })
    redirect("/login?reason=idle")
  }
  return user
}
```

This relies on Better Auth rotating `session.updatedAt` on every authenticated request (which `updateAge: 30min` does — it rotates whenever the session is older than 30 min, *but* every request still touches the session; the freshness check works because we read `updatedAt` directly). End-user routes get the 7d expiry with no extra check.

`audit_log` is already wired and the `AuditMeta` discriminated union is the only safe place to add new variants — anything not in that union is a type error at the `audit()` call site, which is exactly the GDPR-safety mechanism the file's comment describes. The new variants (`user.signed_in`, `user.signed_in_failed`, `user.signed_up`, plus the `idle_timeout` reason on `session.revoked`) extend the union; no schema change.

The super_admin bootstrap mirrors `admin-bootstrap.ts` exactly. Reusing the file is tempting, but a separate `super-admin-bootstrap.ts` keeps each hook single-purpose and means the test fixtures don't have to mock both env vars at once. Both hooks gain an `audit()` call replacing the current `console.info`.

**Alternatives considered:**

- **Option B — `role: text` + Zod-validated CHECK constraint instead of `pgEnum`.** Easier to add values later (just update CHECK + Zod). Rejected because the role set really *is* small and stable for MVP, and `pgEnum` gives proper Drizzle-side type narrowing on `user.role` (the field becomes `"end_user" | "admin" | "super_admin"`, not `string`) — that propagates through to `requireAdmin()` and route handlers without a manual cast. CHECK constraints don't.
- **Option C — Two Better Auth instances** (one with 30 min expiry for admin login at `/admin/login`, one with 7d for `/login`). Rejected: doubles the cookie domain logic, complicates the shared bearer/JWT path that mobile relies on, and forces admins onto a different sign-up flow. The app-layer check is a one-screen function and reads exactly like the security invariant we want to enforce ("admin session must be < 30 min idle").
- **Option D — Edge middleware-based guard.** Next.js middleware (`apps/web/src/middleware.ts`) could check the session cookie and reject early. Rejected because (a) we're on Replit VM, not edge — there's no perf win; (b) the existing layout-level `requireAdmin()` already runs before any admin page renders and returns `notFound()`, which is the desired UX (don't leak the existence of admin URLs to non-admins); (c) we don't want to scatter auth logic between middleware and layout.

## Data model changes

- **New Postgres enum** `user_role` with values `end_user`, `admin`, `super_admin`. Declared via `pgEnum` in `packages/db/src/schema/auth.ts`.
- **Alter `user.role`** from `text default "user"` to `user_role default "end_user"`. Migration includes:
  - `CREATE TYPE user_role AS ENUM ('end_user', 'admin', 'super_admin');`
  - `UPDATE "user" SET role = 'end_user' WHERE role = 'user';` (data migration, advisory-locked)
  - `ALTER TABLE "user" ALTER COLUMN role TYPE user_role USING role::user_role;`
  - `ALTER TABLE "user" ALTER COLUMN role SET DEFAULT 'end_user';`
- **No new tables.** `audit_log` exists; `session` is managed by Better Auth and doesn't change.
- **Extend `AuditMeta` discriminated union** in `packages/db/src/audit.ts` (TypeScript types only — no schema migration needed since metadata is jsonb):
  - `{ kind: "user.signed_in" }`
  - `{ kind: "user.signed_in_failed"; reason: "bad_password" | "user_not_found" | "banned" | "email_unverified" }`
  - `{ kind: "user.signed_up" }`
  - Extend `session.revoked.reason` union to add `"idle_timeout"`.

## Files to touch

**New:**

- `packages/auth/src/hooks/super-admin-bootstrap.ts` — mirrors `admin-bootstrap.ts`. Reads `INITIAL_SUPER_ADMIN_EMAIL`, promotes first-signup match to `super_admin`. Writes `user.role_changed` audit.
- `apps/web/src/app/(auth)/login/_components/idle-banner.tsx` — small client banner shown when `?reason=idle` is on the URL ("Signed out after 30 minutes of inactivity"). Single dependency; not a feature on its own.

**Edit:**

- `packages/db/src/schema/auth.ts` — declare `userRoleEnum` via `pgEnum`; change `user.role` column to use it with default `"end_user"`.
- `packages/db/src/audit.ts` — extend `AuditMeta` with the three new variants + `idle_timeout` reason.
- `packages/auth/src/hooks/admin-bootstrap.ts` — replace `console.info` with `audit()` call (`user.role_changed`, actor_id: null, from: "end_user", to: "admin"). Accept the audit fn as a constructor option so the hook stays db-agnostic.
- `packages/auth/src/server.ts` — wire `super-admin-bootstrap.ts` alongside `admin-bootstrap.ts` (both run on `user.afterCreate`). Add Better Auth `session.create` / `signIn.success` / `signIn.failure` hooks that call audit().
- `apps/web/src/config/env.ts` — add `INITIAL_SUPER_ADMIN_EMAIL` (optional, string, lowercase-validated). Boot-time assertion: if both `INITIAL_ADMIN_EMAIL` and `INITIAL_SUPER_ADMIN_EMAIL` are set, they must differ.
- `.env.example` — document `INITIAL_SUPER_ADMIN_EMAIL`.
- `apps/web/src/lib/auth/server.ts` — change `requireAdmin()` to accept both `admin` and `super_admin`; add 30-min freshness check + redirect-on-stale. Add new `requireSuperAdmin()` that mirrors but only accepts `super_admin`.
- `apps/web/src/lib/auth/index.ts` (or wherever `createAuth({...})` is invoked) — pass `session: { expiresIn: 7d, updateAge: 30min }` to Better Auth.
- `apps/web/src/app/(auth)/login/page.tsx` — render `<IdleBanner />` when `searchParams.reason === "idle"`.
- `apps/web/src/app/(app)/_components/sign-out-button.tsx` (and mobile equivalent in `apps/mobile/`) — after signOut, write `session.revoked` audit (`reason: "logout"`). Already lives in `AuditMeta`; just needs the call.
- `packages/validators/src/auth.ts` (create if missing) — export `roleSchema = z.enum(["end_user", "admin", "super_admin"])`. Re-use in `packages/api/src/operation.ts` permission resolution if it currently hard-codes role values.
- `packages/db/src/migrations/<timestamp>_user_role_enum.sql` (auto-generated by `pnpm db:generate`).

## Edge cases

- **A user is already `role = "admin"` when the migration runs.** Data migration only rewrites `"user"` → `"end_user"`; `"admin"` stays `"admin"` which is a valid enum value. Existing super_admins (none today) would also pass through. We just need to confirm in the migration's pre-flight query that no rows have unexpected role values (`SELECT DISTINCT role FROM "user"`); if anything other than `'user'` or `'admin'` shows up, the migration aborts with a clear error.
- **Better Auth rotates `session.updatedAt` more often than expected.** If `updateAge: 30min` rotates on every request beyond 30 min, then a busy admin's session keeps refreshing forever — which is the correct sliding-window behaviour. The freshness check (`now - updatedAt > 30min`) returns true *only* when the admin actually idled for the full window.
- **Admin closes the laptop lid mid-session.** When they reopen, the Server Component renders, `requireAdmin()` reads `session.updatedAt`, sees the gap, signs them out, redirects to `/login?reason=idle`. Banner explains. Re-login from there.
- **Bootstrap env var changes after first admin exists.** `INITIAL_ADMIN_EMAIL` / `INITIAL_SUPER_ADMIN_EMAIL` are first-signup-only by design (the hooks check `user.email === target` at signup time). Changing the env var after deployment is a no-op — there's no migration that retroactively promotes; promotions after bootstrap go through the admin UI (a separate `/admin/users/[id]/promote` route, already planned but not in this slice).
- **Concurrent boot during migration.** `pnpm db:migrate` already uses `pg_advisory_xact_lock` per the migrate script — the new migration inherits that. Two pods booting at once won't race the `ALTER COLUMN`.
- **Audit log row write fails inside `requireAdmin()`'s freshness path.** The current `audit()` helper does the write *before* the action, throwing on failure. In the freshness path, the order is: revoke session → write audit → redirect. If the audit fails, we've already revoked the session — the redirect still happens, but the audit row is missing. **Accepted risk:** the user is signed out either way (the protection holds), and the missing row affects only forensic visibility. An alternative is to write the audit first, then revoke — but if revocation fails after a successful audit row, the audit lies. Pick "fail closed on user state" over "fail open on audit fidelity".
- **`super_admin` user tries to sign in with idle-timeout already exceeded.** Same flow as admin — signed out, redirected, audited. No special-casing.

## Acceptance criteria

- [ ] `user.role` column type is the `user_role` Postgres enum; `\d "user"` in psql shows `user_role` as the column type.
- [ ] A direct `UPDATE "user" SET role = 'hacker' WHERE id = ...` query against the DB raises a Postgres-level error (`invalid input value for enum user_role`).
- [ ] `requireAdmin()` returns 404 for `end_user`, returns the user for `admin` and for `super_admin`.
- [ ] `requireSuperAdmin()` returns 404 for `end_user` *and* `admin`; returns the user only for `super_admin`.
- [ ] After 31 minutes of admin idle (simulated by `Date.now` mock in Vitest, or by fast-forwarding `session.updatedAt`), the next `/admin/users` request signs the user out, writes a `session.revoked` row with `metadata.kind = "session.revoked"` and `metadata.reason = "idle_timeout"`, and redirects to `/login?reason=idle`.
- [ ] End-user (`role: "end_user"`) sessions are *not* affected by the 30-min check; the 7d Better Auth default applies. Validated by a Vitest test that calls `requireUser()` (not `requireAdmin()`) after 31 min idle and confirms no signout.
- [ ] `INITIAL_SUPER_ADMIN_EMAIL` env var: when set and a matching email signs up, the user lands at `role = "super_admin"`; the bootstrap writes a `user.role_changed` audit row with `from = "end_user"`, `to = "super_admin"`, `actor_id = null`.
- [ ] If both `INITIAL_ADMIN_EMAIL` and `INITIAL_SUPER_ADMIN_EMAIL` are set to the same value, `apps/web/src/config/env.ts` boot-time validation throws with a clear message.
- [ ] `<SignOutButton />` click writes a `session.revoked` row with `reason: "logout"` before the redirect.
- [ ] Successful sign-in writes a `user.signed_in` audit row. Failed sign-in (bad password) writes a `user.signed_in_failed` row with `reason: "bad_password"` and `actor_id: null`.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all green in CI. Migration applies cleanly against a fresh Neon branch + against a branch with existing `"user"` and `"admin"` rows.
- [ ] `/login?reason=idle` renders the IdleBanner ("You were signed out after 30 minutes of inactivity").
- [ ] `.env.example` documents `INITIAL_SUPER_ADMIN_EMAIL` with the same comment style as `INITIAL_ADMIN_EMAIL`.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation:

- **MFA placement.** The roadmap's Sprint 1 explicitly lists `better-auth/two-factor` + `qrcode` as libs to add. This plan defers MFA (your scope choice). Should the roadmap entry be amended to reference a separate "S1.5 — Admin MFA" plan slot, or is MFA quietly out of MVP entirely? If the latter, what's the threat-model justification for shipping an admin dashboard to production without MFA?
- **Idle-timeout for `/api/v1/*` routes.** This plan applies the freshness check at the layout level (Server Components). API routes called from a fetch (mobile, programmatic) currently auth via `getSession()` / JWT and don't pass through `requireAdmin()`. Should `defineOperation`'s `permission: "admin"` path also enforce the 30-min check? Argument for: a stolen access token shouldn't grant unlimited admin API access. Argument against: mobile is end-user-only and JWTs already have a short expiry independent of session.updatedAt.
- **Bootstrap audit `actor_id`.** Currently nullable. The bootstrap hook writes `actor_id: null` ("system promotion"). Alternative: write the promoted user's own id (self-promotion via env var). Argument for null: matches the convention that "system actions" don't have an actor. Argument for self-id: a `WHERE actor_id IS NULL` filter to find system events stays distinct from a "find role-change history for user X" query. Reviewer's call.
- **Idle banner copy + design.** Reviewer should confirm tone (`/mlabs-ux-audit`-style microcopy review) — "You were signed out after 30 minutes of inactivity" vs "Session expired. Please sign in again." The locked design system (CormorantHero/Lato body) doesn't dictate banner shape; needs a quick mockup vote or just go with shadcn `<Alert variant="default">`.
- **Mobile sign-out audit.** Web's `SignOutButton` is easy to wire to `audit()` because it's a Server Component invoking a Server Action. Mobile signs out through the API client. Does the existing `/api/auth/sign-out` route on apps/web write the audit, or does the mobile client need a separate hook? Likely just instrument the Better Auth `session.delete` lifecycle hook so both flows are covered in one place.
