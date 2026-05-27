# Implementation: Auth RBAC hardening

**Started:** 2026-05-26
**Review:** [auth-rbac-hardening](../../reviews/2026-05-26-auth-rbac-hardening.md)
**Branch:** feat/auth-rbac-hardening
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **T1:** Add `session.last_activity_at` column
  - Files: packages/db/src/schema/auth.ts · migrations/0008 · packages/auth/src/server.ts
  - Commit: 072b5e2
  - Notes: Purely additive migration. session.additionalFields exposes the column via getSession().

- [x] **T2:** Add `user_role` Postgres enum + migrate `user.role`
  - Files: schema + migration 0009 + additionalFields.defaultValue + cascading rename across admin UI/service/tests
  - Commit: 89a251a
  - Notes: Migration hand-edited with pre-flight + data step + DROP DEFAULT before USING cast. changeRole rejects super_admin targets. 14/14 admin tests still pass.

- [x] **T3:** Extend `AuditMeta` discriminated union + fix `getCallerContext`
  - Files: packages/db/src/audit.ts · apps/web/src/lib/auth/server.ts (narrowing) · apps/web/tests/audit-meta.type.test.ts
  - Commit: dccc711
  - Notes: Three new variants + idle_timeout reason. Sibling narrowing in API routes carried as a TODO (no super_admin in DB yet, so latent).

- [x] **T4:** `requireSuperAdmin()` + super_admin in `requireAdmin()`
  - Files: apps/web/src/lib/auth/server.ts
  - Commit: 44b9c37
  - Notes: 404-not-403 semantics preserved for super-admin URLs.

- [x] **T5:** `super-admin-bootstrap` hook + `INITIAL_SUPER_ADMIN_EMAIL`
  - Files: packages/auth/src/hooks/super-admin-bootstrap.ts (new) · server.ts · env.ts · index.ts · .env.example
  - Commit: d67305b
  - Notes: env cross-field refine wrapped in typeof window check (t3-env tripped jsdom tests in T11 — fix carried in T11's commit).

- [x] **T6:** Audit-ify both bootstrap hooks
  - Files: packages/auth/src/hooks/admin-bootstrap.ts · super-admin-bootstrap.ts
  - Commit: 52b6f43
  - Notes: audit-before-action ordering; AuditFn injected via constructor option (test-friendly).

- [x] **T7:** `requireAdmin` idle-timeout enforcement
  - Files: apps/web/src/lib/auth/server.ts
  - Commit: 5b266f0
  - Notes: adminSessionIsStale() exported for T8 reuse. JWT path bypasses (no session id / no last_activity_at).

- [x] **T8:** `defineOperation` freshness check for cookie auth
  - Files: packages/api/src/operation.ts · apps/web/src/server/operations/index.ts
  - Commit: c03426e
  - Notes: enforceAdminFreshness wired through OperationDeps; super_admin narrowing fixed in the composition root (T3 carryover).

- [x] **T9:** SignOutButton + mobile-shared sign-out audit
  - Files: apps/web/src/app/api/auth/[...all]/route.ts
  - Commit: 390e55d
  - Notes: Route-wrap chosen over session.delete.before hook to keep "logout" reason cleanly attributed (the hook fires for cascade deletions too).

- [x] **T10:** Login page IdleBanner
  - Files: apps/web/src/app/(auth)/login/_components/idle-banner.tsx (new) · login/page.tsx
  - Commit: a8287a5
  - Notes: Suspense boundary added for useSearchParams; no new shadcn primitive — bare Tailwind on design tokens.

- [x] **T11:** Vitest coverage (mockable subset) + env-validation jsdom fix
  - Files: packages/auth (new vitest setup + 2 test files) · apps/web/tests/audit-meta.type.test.ts · packages/services/src/admin/__tests__/service.test.ts · apps/web/src/config/env.ts · package.json/pnpm-lock.yaml
  - Commit: c62797a
  - Notes: Paused once on the integration-test pause-if; user chose "mockable subset + TODOS gap". 10 new auth tests, 2 new type assertions, 1 new service regression test. Total: 164 web + 42 services + 10 auth = 216 passing.

- [x] **T12:** Roadmap amendment + TODOs
  - Files: roadmap.md · TODOS.md
  - Commit: bfb025f
  - Notes: S1 status → in-flight; new S1.5 (Admin MFA) section; three TODOs entries (audit retention, integration tests, sibling role-narrowing sites).
