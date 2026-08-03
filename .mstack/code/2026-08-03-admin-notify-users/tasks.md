# Implementation: Admin Notify Users

**Started:** 2026-08-03
**Review:** [2026-08-03-admin-notify-users](../../reviews/2026-08-03-admin-notify-users.md)
**Branch:** feat/business-logo
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Audit action + render-detail branch
  - Files: packages/validators/src/audit-meta.ts, apps/web/src/features/admin/audit/render-detail.tsx
  - Commit: 64e738a
  - Notes: —

- [x] **Task 2:** Validator schemas for user broadcast
  - Files: packages/validators/src/admin.ts
  - Commit: 2f373f4
  - Notes: —

- [x] **Task 3:** Service layer + Expo fan-out + test
  - Files: packages/services/src/admin/service.ts, packages/services/src/admin/index.ts, packages/services/src/notifications/push-users.ts (new), packages/services/src/notifications/index.ts, packages/services/src/notifications/__tests__/push-users.test.ts (new)
  - Commit: 2da1c6a
  - Notes: Fixed TS narrowing on args.target.platform by hoisting into a local; vitest run of full services suite = 76/76 passed.

- [x] **Task 4:** Operations + routes
  - Files: apps/web/src/server/operations/admin.ts, apps/web/src/app/api/v1/admin/users/broadcast/route.ts (new), apps/web/src/app/api/v1/admin/users/broadcast/preview/route.ts (new)
  - Commit: 1e1368e
  - Notes: —

- [x] **Task 5:** UI UserBroadcastButton component
  - Files: apps/web/src/features/admin/components/user-broadcast-modal.tsx (new)
  - Commit: a35147c
  - Notes: Applied the same `react-hooks/set-state-in-effect` eslint-disable as business-broadcast-modal.tsx for the debounced preview loading flag.

- [x] **Task 6:** Mount + verify
  - Files: apps/web/src/app/admin/users/page.tsx
  - Commit: 2d40805
  - Notes: `pnpm typecheck` + `pnpm lint` green across the monorepo. `apps/web/tests/email.test.ts` has 6 pre-existing failures on this branch (confirmed by re-running with the T6 diff stashed) — flagged in follow-ups, not caused by this work.
