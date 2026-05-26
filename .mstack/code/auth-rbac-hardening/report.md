# Implementation report: Auth RBAC hardening

**Date:** 2026-05-26
**Branch:** `feat/auth-rbac-hardening` (12 commits)
**Review:** [.mstack/reviews/2026-05-26-auth-rbac-hardening.md](../../reviews/2026-05-26-auth-rbac-hardening.md)
**Status:** complete

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Add `session.last_activity_at` column | ✓ done | `072b5e2` |
| 2 | Add `user_role` pgEnum + migrate `user.role` | ✓ done | `89a251a` |
| 3 | Extend `AuditMeta` union + fix `getCallerContext` narrowing | ✓ done | `dccc711` |
| 4 | `requireSuperAdmin()` + super_admin in `requireAdmin()` | ✓ done | `44b9c37` |
| 5 | `super-admin-bootstrap` hook + `INITIAL_SUPER_ADMIN_EMAIL` | ✓ done | `d67305b` |
| 6 | Audit-ify both bootstrap hooks | ✓ done | `52b6f43` |
| 7 | `requireAdmin` idle-timeout enforcement | ✓ done | `5b266f0` |
| 8 | `defineOperation` freshness check for cookie auth | ✓ done | `c03426e` |
| 9 | SignOutButton + mobile-shared sign-out audit | ✓ done | `390e55d` |
| 10 | Login page `IdleBanner` | ✓ done | `a8287a5` |
| 11 | Vitest coverage for acceptance criteria (mockable subset) | ✓ done | `c62797a` |
| 12 | Roadmap amendment + TODOs | ✓ done | `bfb025f` |

## Commits

```
bfb025f docs(roadmap): split MFA into Sprint 1.5; record S1 follow-ups
c62797a test(auth): mockable coverage for bootstrap + role + AuditMeta variants
a8287a5 feat(auth): IdleBanner on /login?reason=idle
390e55d feat(auth): write session.revoked audit on sign-out (web + mobile)
c03426e feat(api): enforce admin idle-timeout on cookie operations
5b266f0 feat(auth): enforce 30-min admin idle-timeout in requireAdmin
52b6f43 feat(auth): write user.role_changed audit on bootstrap promotion
d67305b feat(auth): super-admin bootstrap via INITIAL_SUPER_ADMIN_EMAIL
44b9c37 feat(auth): requireAdmin accepts super_admin + new requireSuperAdmin
dccc711 feat(auth): extend AuditMeta union + super_admin in getCallerContext
89a251a feat(db): migrate user.role to user_role pgEnum
072b5e2 feat(db): add session.last_activity_at for admin idle-timeout
```

## What changed

- **DB:** new `user_role` Postgres enum (`end_user` / `admin` / `super_admin`) replacing the free-form `role` text; new `session.last_activity_at` timestamp column for sliding 30-min admin idle-timeout; two new migrations (0008 + 0009) that apply advisory-locked.
- **Server auth:** `requireAdmin()` now accepts both `admin` and `super_admin` and enforces the 30-min idle window — stale sessions are signed out (Better Auth `auth.api.signOut`), get a `session.revoked.reason = "idle_timeout"` audit row, and redirect to `/login?reason=idle`. New `requireSuperAdmin()` mirrors the same gates but restricts to super_admin. `getCallerContext` collapses both roles to Permission `"admin"`.
- **Bootstrap:** new `INITIAL_SUPER_ADMIN_EMAIL` env var + matching `super-admin-bootstrap.ts` hook. Both bootstrap hooks now write a `user.role_changed` audit (actor_id = null per the "system action" convention) before performing the role UPDATE. Env-level refine refuses to boot if both vars are set to the same email.
- **API surface:** `defineOperation` gained an optional `enforceAdminFreshness` dep. The apps/web composition root wires it to a function that reuses `adminSessionIsStale` from `lib/auth/server.ts` and throws `ApiError.unauthorized` when a cookie-authed admin operation is stale. JWT / mobile paths bypass by design.
- **Audit:** `AuditMeta` discriminated union extended with `user.signed_in`, `user.signed_in_failed` (with typed `reason`), `user.signed_up`, and `session.revoked.reason = "idle_timeout"`. Existing expect-type assertions updated to cover the new variants.
- **Logout flow:** the Better Auth catch-all route at `apps/web/src/app/api/auth/[...all]/route.ts` now intercepts `POST /sign-out` and writes a `session.revoked.reason = "logout"` audit row before delegating. Single chokepoint covers both web cookie and mobile JWT sign-outs (mobile already POSTs to the same endpoint via `apps/mobile/features/auth/api.signOutRequest`).
- **UI:** new client component `apps/web/src/app/(auth)/login/_components/idle-banner.tsx`. Renders an inline status banner above the sign-in form when `?reason=idle` is on the URL.
- **Tests:** `packages/auth` gained a Vitest setup (mirroring `packages/api`). New tests for both bootstrap hooks verify audit-before-action ordering, no-op-on-mismatch, case-insensitive email matching, and audit-throws-blocks-update. Added type-level assertions for the new `AuditMeta` variants. Regression test for the changeRole super_admin rejection path. **164/164 apps/web tests pass; 42/42 services tests pass; 10/10 auth tests pass.**
- **Docs:** Sprint 1 status flipped from "Not started" to "In flight" in `roadmap.md` and split into S1 (this slice) + S1.5 (MFA only). TODOS.md gains three new entries: audit-log retention cron, real-Postgres integration test infra, and the missed super_admin narrowing in three API route handlers.

## Follow-ups (carried into TODOS.md)

- **Audit log retention.** `user.signed_in` events will accumulate daily; a `90-day` cleanup cron is needed before public launch.
- **Integration tests.** The enum-violation acceptance criterion (`UPDATE "user" SET role = 'hacker'` raises Postgres error) was unverified at the unit-test layer — no real-Postgres harness exists in the repo. Tracked.
- **Sibling role-narrowing sites.** Three API routes (`conversations/route.ts`, `conversations/[id]/messages/route.ts`, `notifications/unread-count/route.ts`) plus `auth/refresh/route.ts` still narrow with `role === "admin" ? "admin" : "user"` — same bug T3 fixed in `getCallerContext`, missed because the review listed only one file. No-op until super_admin users exist in production.
- **Sprint 1.5 (Admin MFA).** Plan needs to be written (`/mlabs-plan`) before any external admin sign-in.

## Pause events

One genuine pause during the run:

- **T11 — integration test infrastructure.** The review's Pause-If condition triggered ("if existing test setup is pure unit-mock, raise whether to wire integration tests for this slice"). The user chose the "mockable subset now + document the gap" path; integration test infra is in TODOS for a later sprint.

No silent skips, no `--no-verify`, no destructive operations.

## Recommended next step

Run **`/mlabs-qa`** focused on the admin path — sign in, hit `/admin/users`, idle 31+ minutes (or fast-forward), confirm the bounce → IdleBanner round trip works end-to-end on the deployed Replit URL. The mocks here verify the wiring; QA proves the behavior under real Better Auth + real Postgres. Pair with a manual `INITIAL_SUPER_ADMIN_EMAIL` smoke test against a fresh DB to confirm the bootstrap promotion path lands.
