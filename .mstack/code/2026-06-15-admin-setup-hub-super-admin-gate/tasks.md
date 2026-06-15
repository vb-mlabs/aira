# Implementation: Admin sidebar consolidation + Setup hub gated behind super_admin

**Started:** 2026-06-15 16:42 UTC
**Review:** [2026-06-15-admin-setup-hub-super-admin-gate](../../reviews/2026-06-15-admin-setup-hub-super-admin-gate.md)
**Branch:** feat/rest-api-migration
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** Widen Permission union in @aira/api with hierarchy + freshness fix
  - Files: packages/api/src/permission.ts · operation.ts · __tests__/operation.test.ts
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Stop role-collapse in apps/web composition root + getCallerContext
  - Files: apps/web/src/server/operations/index.ts · lib/auth/server.ts
  - Commit: —
  - Notes: Pause if packages/auth signAccessToken signature breaks

- [ ] **Task 3:** Gate Setup ops on super_admin
  - Files: categories-admin · cities-admin · membership-plans · sponsorship-tiers · app-settings-admin
  - Commit: —
  - Notes: —

- [ ] **Task 4:** Gate audit, cron, and changeRole ops on super_admin
  - Files: admin.ts (listAuditOp, changeRoleOp) · cron-admin.ts (both ops)
  - Commit: —
  - Notes: —

- [ ] **Task 5:** Add requireSuperAdminJSON helper
  - Files: apps/web/src/lib/auth/server.ts
  - Commit: —
  - Notes: —

- [ ] **Task 6:** Move Setup pages under /admin/settings/
  - Files: new /admin/settings/{categories,cities,membership-plans,sponsorship-tiers}/page.tsx · delete old
  - Commit: —
  - Notes: rm -rf .next after delete (per skill gotcha)

- [ ] **Task 7:** Build /admin/settings tabbed hub + App tab
  - Files: settings/layout.tsx · _components/settings-tabs.tsx · settings/page.tsx · settings/app/page.tsx · delete homepage+renewal-schedule folders
  - Commit: —
  - Notes: Pause if HomepageCmsForm + RenewalScheduleForm can't co-render

- [ ] **Task 8:** Page-level super_admin gates + Users role-change UI gate
  - Files: audit/page.tsx · cron/page.tsx · users/[id]/page.tsx · features/admin/components/user-detail.tsx
  - Commit: —
  - Notes: —

- [ ] **Task 9:** Sidebar role-aware grouping + separator treatment
  - Files: _components/admin-sidebar.tsx · admin-mobile-sidebar.tsx · admin/layout.tsx
  - Commit: —
  - Notes: Pause if active-state highlighting interacts badly with /admin/settings/* routes

- [ ] **Task 10:** Smoke-test scenarios + final verification
  - Files: none (verification)
  - Commit: —
  - Notes: typecheck + lint + test all green; scenario matrix from review
</content>
</invoke>