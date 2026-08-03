# Implementation: Admin Notify Users

**Started:** 2026-08-03
**Review:** [2026-08-03-admin-notify-users](../../reviews/2026-08-03-admin-notify-users.md)
**Branch:** feat/business-logo
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** Audit action + render-detail branch
  - Files: packages/validators/src/audit-meta.ts, apps/web/src/features/admin/audit/render-detail.tsx
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Validator schemas for user broadcast
  - Files: packages/validators/src/admin.ts
  - Commit: —
  - Notes: —

- [ ] **Task 3:** Service layer + Expo fan-out + test
  - Files: packages/services/src/admin/service.ts, packages/services/src/admin/index.ts, packages/services/src/notifications/push-users.ts (new), packages/services/src/notifications/index.ts, packages/services/src/notifications/__tests__/push-users.test.ts (new)
  - Commit: —
  - Notes: —

- [ ] **Task 4:** Operations + routes
  - Files: apps/web/src/server/operations/admin.ts, apps/web/src/app/api/v1/admin/users/broadcast/route.ts (new), apps/web/src/app/api/v1/admin/users/broadcast/preview/route.ts (new)
  - Commit: —
  - Notes: —

- [ ] **Task 5:** UI UserBroadcastButton component
  - Files: apps/web/src/features/admin/components/user-broadcast-modal.tsx (new)
  - Commit: —
  - Notes: —

- [ ] **Task 6:** Mount + verify
  - Files: apps/web/src/app/admin/users/page.tsx
  - Commit: —
  - Notes: —
