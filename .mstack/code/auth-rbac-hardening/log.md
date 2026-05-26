# Run log — auth-rbac-hardening

2026-05-26 — Run started on `feat/auth-rbac-hardening`. Pre-flight clean.

T1 ✓ 072b5e2 — `feat(db): add session.last_activity_at for admin idle-timeout`. Migration 0008 is a single additive ALTER COLUMN. Better Auth session.additionalFields gives getSession() callers typed access to the new column.

T2 ✓ 89a251a — `feat(db): migrate user.role to user_role pgEnum`. Migration 0009 hand-edited with pre-flight + data step. drizzle-kit's generated SQL set the new default before the type change — replaced with: DROP DEFAULT → SET DATA TYPE USING role::user_role → SET DEFAULT. Cascading rename of "user" → "end_user" across admin UI/service/tests; rejected super_admin targets in changeRole. The conversations / messages API routes still narrow `role === "admin"` without super_admin — semantically a T3 issue, deferred. 14/14 admin service tests still pass.

T3 ✓ dccc711 — `feat(auth): extend AuditMeta union + super_admin in getCallerContext`. AuditMeta gains user.signed_in / user.signed_in_failed / user.signed_up + idle_timeout reason. Existing expect-type assertion updated.

T4 ✓ 44b9c37 — `feat(auth): requireAdmin accepts super_admin + new requireSuperAdmin`. 404-not-403 semantics preserved.

T5 ✓ d67305b — `feat(auth): super-admin bootstrap via INITIAL_SUPER_ADMIN_EMAIL`. Two single-purpose hooks composed; env refine asserts emails differ. (Refine later wrapped in typeof window guard during T11 — see below.)

T6 ✓ 52b6f43 — `feat(auth): write user.role_changed audit on bootstrap promotion`. audit-before-action; AuditFn injected via constructor option for tests.

T7 ✓ 5b266f0 — `feat(auth): enforce 30-min admin idle-timeout in requireAdmin`. Sliding window via session.last_activity_at; bounceStaleAdmin signs out + audits + redirects.

T8 ✓ c03426e — `feat(api): enforce admin idle-timeout on cookie operations`. defineOperation gains enforceAdminFreshness dep; web composition root wires it. Also fixed super_admin narrowing in the composition root (T3 sibling).

T9 ✓ 390e55d — `feat(auth): write session.revoked audit on sign-out (web + mobile)`. Wrapped the Better Auth catch-all route instead of using session.delete.before — keeps reason: "logout" cleanly attributed.

T10 ✓ a8287a5 — `feat(auth): IdleBanner on /login?reason=idle`. Suspense boundary for useSearchParams; bare Tailwind on design tokens (no new shadcn primitive).

T11 ⏸→✓ c62797a — `test(auth): mockable coverage`. Paused on the review's Pause-If (no real-Postgres integration test infra); user chose mockable subset + TODOS gap. Added: packages/auth vitest setup, 10 bootstrap hook tests (audit-before-action, case-insensitive match, no-op on mismatch, audit-throws-blocks-update), 2 type-only assertions for new AuditMeta variants, 1 changeRole-rejects-super_admin regression test. Total: 164 web + 42 services + 10 auth = 216 passing. Collateral fix: t3-env's createEnv throws on server-key access in jsdom; wrapped T5's cross-field check in typeof window === "undefined" so test imports don't trip it.

T12 ✓ bfb025f — `docs(roadmap): split MFA into Sprint 1.5; record S1 follow-ups`. S1 status → in-flight; new S1.5 section; three TODOS entries (retention cron, integration tests, sibling role-narrowing sites).

---

Run complete. 12/12 tasks done. 12 commits on `feat/auth-rbac-hardening`. Three learnings recorded. Plan + review + report committed in earlier mstack commits on main. Recommended next: `/mlabs-qa` focused on the admin idle-timeout path.
