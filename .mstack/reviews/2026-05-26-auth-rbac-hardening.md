# Review: Auth RBAC hardening (Sprint 1, partial — sans MFA)

**Date:** 2026-05-26
**Slug:** auth-rbac-hardening
**Plan reviewed:** [2026-05-26-auth-rbac-hardening.md](../plans/2026-05-26-auth-rbac-hardening.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (with framer@millionlabs.co.uk as project lead)

---

## Summary

Plan is sound on intent (role enum, super_admin bootstrap, admin idle-timeout, auth audit trail) but had one load-bearing design flaw: the idle-timeout was specified against `session.updatedAt`, which is Better Auth's rotation-timestamp, not a last-activity timestamp — `updateAge` write-coalesces row updates so an active admin's `updatedAt` lags behind "now" by up to `updateAge` minutes, meaning the spec's 30-min threshold detects idle anywhere from 30 to 60 minutes in. Resolved by adding a dedicated `session.last_activity_at` column and updating it inside `requireAdmin()` itself. A handful of other concerns landed as decisions below. Implementation is broken into 12 atomic tasks; UI-Significant: no (only one existing page.tsx modified, and the new IdleBanner is a route-private `_components/` file outside the UI-Significant heuristic).

## Findings

### Blockers (resolved before approval)

- **Idle-timeout mechanism is broken as designed.** Plan reads `session.updatedAt` to detect idle. Better Auth's `updateAge` (currently 1 day, plan proposed 30 min) is *write-coalescing*: `updatedAt` only gets bumped if the time since last bump exceeds `updateAge`. For an active admin, `updatedAt` lags by up to `updateAge` minutes; for an idle admin, idle becomes detectable only after `(updateAge - timeSinceLastBumpBeforeIdleStarted) + 30min`, which is up to 60min total in the worst case. **Resolved:** add a `session.last_activity_at` timestamp column. `requireAdmin()` reads it, checks freshness (`now - last_activity_at > 30min`), and UPDATEs it to `now()` before returning. One extra DB write per admin request — acceptable for an internal admin surface.

- **Permission-union ambiguity.** Plan said "re-use `roleSchema` in `packages/api/src/operation.ts` permission resolution if it currently hard-codes role values" but didn't pick a shape. The current `Permission = "user" | "admin"` union is two values; the new DB enum has three (`end_user`, `admin`, `super_admin`). **Resolved:** keep `Permission` narrow at two values. `getCallerContext()` maps both `admin` and `super_admin` → `"admin"`. The DB enum is the source of truth for actual role; the API permission gate just asks "is this user at least an admin?". Operations that need to enforce super-admin-only (rare — only role-promotion endpoints in S2+) use a layout-level `requireSuperAdmin()` instead of routing through `defineOperation`.

### Concerns (raised, decided, recorded)

- **Concern:** Plan deferred TOTP MFA against the roadmap's stated S1 scope. Shipping an admin dashboard to production without MFA is the kind of decision that should be deliberate, not silent.
  **Decision:** Defer to a new **Sprint 1.5 — Admin MFA** plan slot. Update `roadmap.md` to insert the slot between S1 and S2 with a clear "ships before any external admin sign-in" condition. MFA stays out of this slice but is explicitly tracked as the next auth slice.

- **Concern:** Should `defineOperation` with `permission: "admin"` enforce the same 30-min freshness check as `requireAdmin()`? A stale cookie session that bypasses the layout but hits a Server Action / API route would otherwise have unlimited admin API access.
  **Decision:** Cookie-authed admin operations enforce the freshness check; JWT-authed paths do not. Cookies are the web admin transport; the plan adds the freshness check inside `operation.ts`'s `permission: "admin"` branch when `ctx.source === "web"`. JWT bearer paths bypass — JWTs are short-lived (mobile re-issues every ~15min via the refresh endpoint), there are no admin API routes called from mobile per PRD, and the JWT carries no `session.last_activity_at` to check against.

- **Concern:** Bootstrap audit `actor_id` — null (system) vs self-promoted user-id.
  **Decision:** `actor_id: null`. Matches the existing convention that "system actions" have no actor (the `audit_log.actor_id` column is already nullable, with `onDelete: "set null"` semantics). A future `WHERE actor_id IS NULL` filter cleanly returns all system-generated events; mixing self-id would conflate "user X promoted themselves via env var" with "user X was promoted by some admin", which is misleading.

- **Concern:** Mobile sign-out audit wiring. Web's `<SignOutButton />` is a Server Component invoking a Server Action; mobile signs out through the existing `/api/auth/sign-out` route. The plan suggested Better Auth's `databaseHooks.session.delete.before` but didn't verify the hook exists.
  **Decision:** Instrument the **route handler** at `apps/web/src/app/api/auth/[...all]/route.ts` (or wherever Better Auth's catch-all is mounted) — both web and mobile sign-outs flow through `auth.handler`, so writing the audit at the Server-Action / Server-Component boundary covers both transports in one place. Inspect Better Auth's actual hook surface during T9; if `databaseHooks.session.delete` exists and reliably fires for both web cookie and JWT-bearer sign-outs, prefer that. Otherwise, wrap the sign-out Server Action.

- **Concern:** Idle banner copy + design. Plan asked for reviewer's call.
  **Decision:** "You were signed out after 30 minutes of inactivity. Sign in to continue." Rendered as shadcn `<Alert variant="default">` above the email/password fields. No mockup round-trip — copy aligns with the locked AIRA voice ("never corporate-stiff … full sentences in error states"). UX audit can refine if it lands awkwardly post-ship.

- **Concern:** `getCallerContext()` (apps/web/src/lib/auth/server.ts:118–119) currently does `role === "admin" ? "admin" : "user"` — that hard-codes the string and will silently coerce `super_admin` to `"user"`, which is wrong.
  **Decision:** Explicitly add `apps/web/src/lib/auth/server.ts` (getCallerContext) to the edit list. Map `role === "admin" || role === "super_admin"` → `"admin"`. Captured in Task 3.

- **Concern:** Better Auth's `additionalFields.role.defaultValue: "user"` in `createAuth` will mismatch the new DB default (`"end_user"`) — Better Auth would try to insert `"user"` on new signups and the DB enum would reject it.
  **Decision:** Update `defaultValue` to `"end_user"` in the same task that adds the enum. Captured in T2.

- **Concern:** Session shape returned by `getSession()` doesn't include `last_activity_at` by default. Better Auth needs to be told about additional session columns.
  **Decision:** Add `last_activity_at` to Better Auth's `session.additionalFields` config (input: false so clients can't set it). Captured in T1.

### Suggestions (taken or deferred)

- **Suggested:** Split the migration into two — one purely additive (`last_activity_at`), one type-changing (role enum). **Taken** — T1 adds the column, T2 changes the role type. Lets us deploy T1 with zero risk and validate before T2's higher-risk ALTER COLUMN.
- **Suggested:** Add a Vitest test that verifies the DB enum constraint by directly attempting `UPDATE "user" SET role = 'hacker'` and catching the Postgres error. **Taken** as part of T11. Without this, the "enum is enforced at the DB layer" criterion is unverified.
- **Suggested:** Document the `last_activity_at` column's intent inline in `packages/db/src/schema/auth.ts` so future readers don't try to drop it as an unused field. **Taken** as part of T1.

## Decisions locked

Net new decisions beyond what the plan stated:

- `last_activity_at` is a new column on the `session` table (not on `user`). Sessions can be multiple per user, and idle tracking is per-session, not per-account.
- Bootstrap audit `actor_id` = `null` (system) — not the promoted user's id.
- `Permission` type stays `"user" | "admin"`; `super_admin` maps to `"admin"` at the API boundary; `requireSuperAdmin()` is a layout-level helper that doesn't flow through `Permission`.
- API-layer freshness check (`defineOperation` with `permission: "admin"`) applies only when `ctx.source === "web"` (cookie auth). JWT paths skip.
- MFA is out of this slice and gets its own Sprint 1.5 plan; roadmap.md gets an entry.
- Idle banner copy: "You were signed out after 30 minutes of inactivity. Sign in to continue." in shadcn `<Alert variant="default">`.
- Mobile sign-out audit instruments the shared sign-out route handler (or Better Auth's session.delete hook if it exists), not the mobile client.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is atomic (one commit). The codebase is in a working state after every task.

### Task 1: Add `session.last_activity_at` column

- **Files:** `packages/db/src/schema/auth.ts` (edit) · `packages/db/src/migrations/<timestamp>_session_last_activity.sql` (generated) · `packages/auth/src/server.ts` (edit — Better Auth `session.additionalFields`)
- **What:** Add `last_activity_at: timestamp("last_activity_at").defaultNow().notNull()` to the `session` table schema. Run `pnpm db:generate` to produce the migration. Existing rows backfill via the `defaultNow()`, giving every current session a fresh 30-min window. In `createAuth()`, extend `session.additionalFields` (separate from `user.additionalFields`) with `last_activity_at: { type: "date", required: false, input: false }` so `getSession()` returns it.
- **Acceptance:** `\d session` in psql shows `last_activity_at` with `not null` and `default now()`. `pnpm db:migrate` applies cleanly on a fresh Neon branch AND on a branch with existing session rows. `(await getSession())?.session.last_activity_at` is a Date in app code (typecheck passes).
- **Pause if:** `pnpm db:generate` produces a migration that drops or renames any existing column (it shouldn't — pure additive — but drizzle-kit has been known to emit unwanted ALTERs).

### Task 2: Add `user_role` Postgres enum + migrate `user.role`

- **Files:** `packages/db/src/schema/auth.ts` (edit) · `packages/db/src/migrations/<timestamp>_user_role_enum.sql` (generated, then hand-edited to add pre-flight + data migration) · `packages/auth/src/server.ts` (edit — `additionalFields.role.defaultValue`)
- **What:** Declare `export const userRoleEnum = pgEnum("user_role", ["end_user", "admin", "super_admin"])`. Change `user.role` column to `userRoleEnum("role").default("end_user").notNull()`. The auto-generated migration likely won't include the data migration — hand-edit to add: (a) pre-flight `DO $$ ... IF EXISTS (SELECT 1 FROM "user" WHERE role NOT IN ('user', 'admin')) THEN RAISE EXCEPTION 'unexpected role values'; END IF; $$`, (b) `UPDATE "user" SET role = 'end_user' WHERE role = 'user'`, (c) `ALTER TABLE "user" ALTER COLUMN role TYPE user_role USING role::user_role`, (d) `ALTER TABLE "user" ALTER COLUMN role SET DEFAULT 'end_user'`. Also update `additionalFields.role.defaultValue` from `"user"` to `"end_user"` in createAuth.
- **Acceptance:** Migration applies cleanly on a branch with existing `'user'` and `'admin'` rows (data migration converts `'user'` → `'end_user'`, `'admin'` stays). Directly running `UPDATE "user" SET role = 'hacker'` raises `invalid input value for enum user_role` (verified in T11's Vitest). `pnpm typecheck` green — `user.role` is now typed as `"end_user" | "admin" | "super_admin"`.
- **Pause if:** pre-flight check finds rows with a `role` value other than `'user'` or `'admin'`. Pause if drizzle-kit's generated migration includes any DROP statement.

### Task 3: Extend `AuditMeta` discriminated union + fix `getCallerContext`

- **Files:** `packages/db/src/audit.ts` (edit) · `apps/web/src/lib/auth/server.ts` (edit — `getCallerContext` role narrowing only)
- **What:** Extend `AuditMeta` with `{ kind: "user.signed_in" }`, `{ kind: "user.signed_in_failed"; reason: "bad_password" | "user_not_found" | "banned" | "email_unverified" }`, `{ kind: "user.signed_up" }`. Extend the existing `session.revoked.reason` union with `"idle_timeout"`. In `getCallerContext`, change the role narrowing from `role === "admin" ? "admin" : "user"` to `(role === "admin" || role === "super_admin") ? "admin" : "user"`.
- **Acceptance:** `pnpm typecheck` green. `audit({ action: "user.signed_in", meta: { kind: "user.signed_in" }, ... })` compiles. `audit({ meta: { kind: "session.revoked", reason: "idle_timeout" }, ... })` compiles. `getCallerContext` returns `role: "admin"` for a super_admin user (verified in T11).

### Task 4: Add `requireSuperAdmin()` + super_admin acceptance in `requireAdmin()`

- **Files:** `apps/web/src/lib/auth/server.ts` (edit)
- **What:** Change `requireAdmin()`'s role gate from `if (role !== "admin") notFound()` to `if (role !== "admin" && role !== "super_admin") notFound()`. Add a new `requireSuperAdmin()` that only accepts `super_admin` (returns 404 for both `end_user` and plain `admin`). This task does NOT add the idle-timeout enforcement — that's T7, after T1's column is in place.
- **Acceptance:** Vitest test: `requireAdmin()` returns 404 for `end_user`, returns the user for both `admin` and `super_admin`. `requireSuperAdmin()` returns 404 for `end_user` AND `admin`, returns the user only for `super_admin`.

### Task 5: New `super-admin-bootstrap` hook + `INITIAL_SUPER_ADMIN_EMAIL` env var

- **Files:** `packages/auth/src/hooks/super-admin-bootstrap.ts` (new) · `packages/auth/src/server.ts` (edit — wire alongside admin-bootstrap) · `apps/web/src/config/env.ts` (edit) · `.env.example` (edit)
- **What:** Mirror `admin-bootstrap.ts` exactly — read `INITIAL_SUPER_ADMIN_EMAIL`, on `user.create.after` promote matching email to `super_admin`. In `createAuth`, accept new `initialSuperAdminEmail` option and wire `createSuperAdminBootstrapHook` so BOTH bootstrap hooks fire on `user.create.after` (compose them into a single afterUserCreate callback). In `env.ts`, add `INITIAL_SUPER_ADMIN_EMAIL: z.string().email().optional()`. Add a `.refine()` on the top-level env schema asserting that if both `INITIAL_ADMIN_EMAIL` and `INITIAL_SUPER_ADMIN_EMAIL` are set, they must differ (with a clear error message). Document the new var in `.env.example` mirroring the existing `INITIAL_ADMIN_EMAIL` comment style. **No audit() call yet** — that's T6.
- **Acceptance:** Signing up with the `INITIAL_SUPER_ADMIN_EMAIL` value promotes the user to `role = "super_admin"`. Setting both env vars to the same value causes boot to fail with the refine message. Wrong email is a no-op. `.env.example` includes a documented entry.
- **Pause if:** boot-time `.refine()` validation interacts badly with `@t3-oss/env-nextjs` (it should accept a top-level refinement but verify before proceeding).

### Task 6: Audit-ify both bootstrap hooks

- **Files:** `packages/auth/src/hooks/admin-bootstrap.ts` (edit) · `packages/auth/src/hooks/super-admin-bootstrap.ts` (edit) · `packages/auth/src/server.ts` (edit — pass audit fn in)
- **What:** Both `createAdminBootstrapHook` and `createSuperAdminBootstrapHook` gain an optional `audit?: AuditFn` constructor option (imported as a type from `@aira/db/audit`). After the promotion UPDATE, write a `user.role_changed` row with `actor_id: null`, `target: { type: "user", id: user.id }`, `meta: { kind: "user.role_changed", from: "end_user", to: "admin" | "super_admin" }`. The existing `console.info` becomes a `logger.info` (already injected) so observability stays. In `createAuth`, plumb through a new `audit?: AuditFn` option and pass it to both hook factories. In `apps/web/src/lib/auth/index.ts`, pass `audit` from `@/lib/db/audit`.
- **Acceptance:** Setting `INITIAL_ADMIN_EMAIL=foo@example.com`, signing up as that email, and querying `SELECT * FROM audit_log WHERE actor_id IS NULL AND action = 'user.role_changed' ORDER BY at DESC LIMIT 1` returns a row with `metadata = { kind: "user.role_changed", from: "end_user", to: "admin", client: "web" }`. Same flow for super_admin returns `to: "super_admin"`. Audit-write failure rolls back the role promotion (because `audit()` throws and the hook propagates).
- **Pause if:** the `audit()` helper's transaction semantics interact unexpectedly with Better Auth's user.create.after hook (verify both commit/rollback together; if not, raise the question of whether the bootstrap promotion should be transactional).

### Task 7: `requireAdmin()` idle-timeout enforcement

- **Files:** `apps/web/src/lib/auth/server.ts` (edit) · imports from `@/lib/db` (db client) and `@/lib/db/audit` (audit fn)
- **What:** In `requireAdmin()`, after the role check passes: compute `idleMs = Date.now() - session.last_activity_at.getTime()`. If `idleMs > 30 * 60 * 1000`: call `auth.api.signOut({ headers: await headers() })`, write a `session.revoked` audit row with `meta: { kind: "session.revoked", reason: "idle_timeout" }` and `actor_id: user.id`, then `redirect("/login?reason=idle")`. Otherwise, run a Drizzle UPDATE on the session row to set `last_activity_at = new Date()` (use the session.id from the bearer/cookie session). Same logic added to `requireSuperAdmin()`. Order: revoke → audit → redirect (so a failed audit doesn't leave the user signed in — see plan's accepted-risk discussion).
- **Acceptance:** Vitest: stub a session with `last_activity_at = 31 minutes ago` and an admin user; calling `requireAdmin()` triggers `auth.api.signOut`, inserts an `audit_log` row with `metadata.reason = "idle_timeout"`, and throws Next's `redirect()` to `/login?reason=idle`. Stub a session with `last_activity_at = 5 minutes ago` and an admin user; calling `requireAdmin()` returns the user AND the session's `last_activity_at` in the DB advances to a timestamp within 1 second of `Date.now()` (verifies the bump).
- **Pause if:** end-user idle-timeout test (T11) shows that the bump UPDATE in `requireAdmin()` somehow leaks into `requireUser()` calls (it shouldn't, but the test is the safety net).

### Task 8: `defineOperation` admin freshness check for cookie auth

- **Files:** `packages/api/src/operation.ts` (edit) · `apps/web/src/lib/auth/server.ts` (export a `checkAdminFreshness(session)` helper used by both `requireAdmin` and operation.ts to avoid duplicating the logic)
- **What:** Extract the freshness check from T7 into an exported helper `checkAdminFreshness(session): Promise<void | Response>` — returns `undefined` if fresh, returns a `Response` (the redirect equivalent for an API context: 401 + `WWW-Authenticate` header with a hint) if stale. In `defineOperation`'s permission-check branch, when `meetsPermission(ctx.user.role, "admin")` AND `ctx.source === "web"` (cookie auth), call the helper; if it returns a Response, return that to the caller. JWT paths (`ctx.source === "mobile"` or any non-web) skip the check.
- **Acceptance:** A Vitest covering `defineOperation({ permission: "admin", ... })`: web-cookie call with stale `last_activity_at` returns a 401 (not 200, not 403); web-cookie call with fresh `last_activity_at` succeeds; JWT/mobile call with even older `last_activity_at` succeeds (skip applied). The helper is reused — same function call in `requireAdmin()` and in operation.ts.
- **Pause if:** `ctx.source` discrimination in operation.ts isn't already populated reliably for web Server Actions (would need to be wired through getCallerContext / getSessionFromHeaders).

### Task 9: SignOutButton + mobile-shared sign-out audit

- **Files:** `apps/web/src/app/(app)/_components/sign-out-button.tsx` (edit — if it already calls a Server Action, edit the action) · `apps/web/src/app/api/auth/[...all]/route.ts` (edit — wrap the Better Auth handler to write the audit on POST /api/auth/sign-out)
- **What:** Identify the single chokepoint that both web cookie sign-out and mobile JWT sign-out flow through. If Better Auth exposes `databaseHooks.session.delete.before`, use that and write the `session.revoked` audit (`reason: "logout"`, `actor_id: session.userId`) — covers both transports in one hook. If not, wrap the catch-all `/api/auth/sign-out` POST handler: after a successful sign-out, write the audit (read the user id from the session before deletion).
- **Acceptance:** Web `<SignOutButton />` click writes an `audit_log` row with `metadata = { kind: "session.revoked", reason: "logout", client: "web" }` and `actor_id = <user id>`. Mobile sign-out (via the API client at `apps/mobile/lib/api/auth.ts` or wherever) writes the same row with `client: "mobile"`. Verified by hitting the endpoint in dev and querying audit_log.
- **Pause if:** Better Auth's `databaseHooks.session.delete` doesn't exist in the installed version (`pnpm why better-auth` to check) AND the catch-all route wrap creates an ordering issue (we can't audit AFTER the session is deleted because we lose the user id; have to audit BEFORE and roll back if Better Auth's signOut fails).

### Task 10: Login page `IdleBanner`

- **Files:** `apps/web/src/app/(auth)/login/_components/idle-banner.tsx` (new) · `apps/web/src/app/(auth)/login/page.tsx` (edit)
- **What:** New client component renders a shadcn `<Alert variant="default">` with text "You were signed out after 30 minutes of inactivity. Sign in to continue." In `page.tsx`, accept `searchParams: Promise<{ reason?: string }>` (Next 16 App Router shape) and conditionally render `<IdleBanner />` when `searchParams.reason === "idle"`.
- **Acceptance:** Navigating to `/login?reason=idle` renders the banner above the form. `/login` (no query param) does not. Visually verified in the dev server; no automated test required (banner is presentational).

### Task 11: Vitest coverage for every acceptance criterion

- **Files:** `packages/db/src/__tests__/user-role-enum.test.ts` (new) · `apps/web/src/lib/auth/__tests__/require-admin.test.ts` (new or extend) · `packages/auth/src/hooks/__tests__/bootstrap.test.ts` (new or extend) · `apps/web/src/app/api/auth/__tests__/sign-out.test.ts` (new) · `packages/db/src/__tests__/audit-meta.test-d.ts` (new — typecheck-only)
- **What:** One Vitest test per plan acceptance criterion. Critical cases: (a) direct `UPDATE "user" SET role = 'hacker'` raises Postgres enum error; (b) `requireAdmin()` 404s for end_user, passes for admin and super_admin; (c) `requireSuperAdmin()` 404s for admin, passes for super_admin; (d) admin session stale 31min → signout + audit + redirect; (e) end-user session stale 31min → `requireUser()` returns normally (no signout, no audit); (f) `INITIAL_SUPER_ADMIN_EMAIL` bootstrap promotes + writes audit with `actor_id: null`; (g) both env vars same → boot fails; (h) sign-out writes audit; (i) sign-in success / failure writes audits with correct `reason`. Plus a type-level test that an `audit()` call with an unknown `kind` is a type error.
- **Acceptance:** `pnpm test` green. Every plan acceptance criterion has a corresponding test name; running `grep -r "describe\|it(" packages/ apps/web/src/lib/auth/__tests__` shows the mapping.
- **Pause if:** the existing test infrastructure doesn't provide a way to spin up a real Postgres for the enum-violation test (the plan assumes Vitest can hit Neon test branch; verify the existing test setup pattern in `packages/db/src/__tests__` first — if it's pure unit-mock, raise whether to wire integration tests for this slice).

### Task 12: Roadmap amendment + TODOs

- **Files:** `roadmap.md` (edit) · `TODOS.md` (edit)
- **What:** In `roadmap.md`, insert a new section "Sprint 1.5 — Admin MFA" between S1 and S2 with: Goal ("Admin login requires TOTP after password"), Features (better-auth two-factor plugin, qrcode, recovery codes, admin /setup-mfa, login MFA challenge), Schema additions (Better Auth's two-factor tables, auto-managed), Libs to add (better-auth/two-factor, qrcode). Mark status as ⬜. Update the S1 section to note that S1 ships role enum + RBAC + idle-timeout + audit but NOT MFA; MFA is S1.5. In `TODOS.md`, add an entry: "Audit log retention — Source: 2026-05-26-auth-rbac-hardening review. Item: with sign-in / signed_up / signed_in_failed rows being written daily, `audit_log` will grow unbounded. Trigger: when audit_log table size exceeds ~10MB, or before public launch."
- **Acceptance:** `roadmap.md` has the new S1.5 section. S1's body explicitly references "see Sprint 1.5 for MFA". `TODOS.md` has the new entry with date and source.

## Open questions

For `/mlabs-code` to escalate rather than guess:

- **T6 transaction semantics.** Does the `audit()` helper run inside the same transaction as Better Auth's `user.create.after` hook? If audit fails after Better Auth commits the user but before the role UPDATE, we end up with a created user, no role promotion, and no audit row — which is arguably worse than failing the whole signup. `/mlabs-code` should verify by reading the Better Auth Drizzle adapter source and decide whether to wrap the hook body in `db.transaction(...)` explicitly.
- **T9 Better Auth `session.delete` hook availability.** Not verified during review; the Better Auth version in `package.json` should be inspected and the actual hook surface confirmed via `node_modules/better-auth/dist/*.d.ts` before committing to "hook" vs "route wrap".
- **T11 integration test plumbing.** Some acceptance criteria (DB enum violation, end-to-end audit row insertion) genuinely need a real Postgres. If the existing test setup only supports mocked DB, the integration tests in T11 are blocked until that plumbing exists — escalate rather than skip the test.
