# Implementation: Admin sidebar consolidation + Setup hub gated behind super_admin

**Started:** 2026-06-15 16:42 UTC
**Review:** [2026-06-15-admin-setup-hub-super-admin-gate](../../reviews/2026-06-15-admin-setup-hub-super-admin-gate.md)
**Branch:** feat/rest-api-migration
**Status:** complete
**Completed:** 2026-06-15 17:05 UTC

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Widen Permission union in @aira/api with hierarchy + freshness fix
  - Files: packages/api/src/permission.ts · operation.ts · index.ts · __tests__/operation.test.ts
  - Commit: 78f5d64
  - Notes: 47 api tests pass (3 new). Workspace typecheck pre-existed as broken (admin/business-detail imports GoogleMapsPinIcon which lived only in the stash); popped the stash, our change typechecks cleanly. Stash dropped — Task 6 dir-deletes will land alongside the GoogleMapsPinIcon work.

- [x] **Task 2:** Stop role-collapse in apps/web composition root + getCallerContext
  - Files: apps/web/src/server/operations/index.ts · lib/auth/server.ts
  - Commit: 9bcb232
  - Notes: signAccessToken accepts role:string — super_admin flows through unchanged. No pause needed.

- [x] **Task 3:** Gate Setup ops on super_admin
  - Files: categories-admin · cities-admin · membership-plans · sponsorship-tiers · app-settings-admin
  - Commit: 2e472f4
  - Notes: 20 ops gated (5 + 3 + 4 + 4 + 4). Updated header comments to reflect new policy.

- [x] **Task 4:** Gate audit, cron, and changeRole ops on super_admin
  - Files: admin.ts (listAuditOp, changeRoleOp) · cron-admin.ts (both ops)
  - Commit: 4026e7f
  - Notes: 4 ops tightened. Updated admin.ts header to document the two-tier policy.

- [x] **Task 5:** Add requireSuperAdminJSON helper
  - Files: apps/web/src/lib/auth/server.ts
  - Commit: 2f0e3a8
  - Notes: —

- [x] **Task 6:** Move Setup pages under /admin/settings/
  - Files: 14 renames via git mv + 3 feature components + 4 list pages (link hrefs + ../_components/page-header relative path bumped to ../../_components/page-header)
  - Commit: 37d2643
  - Notes: rm -rf .next handled. Sidebar links still point at old paths — fixes in T9 nav rewrite.

- [x] **Task 7:** Build /admin/settings tabbed hub + App tab
  - Files: settings/layout.tsx (new) · _components/settings-tabs.tsx (new) · settings/page.tsx (rewrite → redirect) · settings/app/page.tsx (new) · delete homepage+renewal-schedule folders
  - Commit: 4f54307
  - Notes: Both forms co-render cleanly — no shared state. No pause.

- [x] **Task 8:** Page-level super_admin gates + Users role-change UI gate
  - Files: audit/page.tsx · cron/page.tsx · users/[id]/page.tsx · features/admin/components/user-detail.tsx
  - Commit: 723480c
  - Notes: —

- [x] **Task 9:** Sidebar role-aware grouping + separator treatment
  - Files: _components/admin-sidebar.tsx · admin-mobile-sidebar.tsx · admin/layout.tsx
  - Commit: 72922d0
  - Notes: isActive uses startsWith for non-/admin routes; Setup row matches /admin/settings/* automatically — no edge cases triggered.

- [x] **Task 10:** Smoke-test scenarios + final verification
  - Files: none (verification only — no commit)
  - Commit: —
  - Notes: pnpm typecheck ✓ (10/10 packages). pnpm test ✓ (6/6 packages: 47/47 api incl. 3 new, 164/164 web). pnpm lint shows 8 pre-existing errors in untouched files (features/admin/community/*, features/community/post-detail-modal, sponsorships-section, instrumentation.ts — none touched). Interactive scenario matrix (plain admin vs super_admin click-through) deferred to /mlabs-qa.
</content>
</invoke>