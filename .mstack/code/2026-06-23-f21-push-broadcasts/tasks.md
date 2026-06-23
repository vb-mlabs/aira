# Implementation: F21 — push broadcasts to business owners

**Started:** 2026-06-23
**Review:** [2026-06-23-f21-push-broadcasts](../../reviews/2026-06-23-f21-push-broadcasts.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

### Phase 1 — Schema + validators

- [ ] **Task 1:** Add `user_device` + `notification_delivery` tables
  - Files: `packages/db/src/schema/user-device.ts`, `notification-delivery.ts`, `index.ts`, generated migration
  - Commit: —
  - Notes: Pause if generated migration is not purely additive.

- [ ] **Task 2:** Validators for devices + extended broadcast input
  - Files: `packages/validators/src/devices.ts` (new), `admin.ts`, `index.ts`
  - Commit: —

### Phase 2 — Service layer

- [ ] **Task 3:** Add `expo-server-sdk` dependency
  - Files: `packages/services/package.json`, `pnpm-lock.yaml`
  - Commit: —

- [ ] **Task 4:** Extract `resolveTargetUserIds` from `sendBusinessOwnerBroadcast`
  - Files: `packages/services/src/admin/service.ts`
  - Commit: —

- [ ] **Task 5:** Devices service queries
  - Files: `packages/services/src/devices/queries.ts`, `index.ts`, services barrel
  - Commit: —

- [ ] **Task 6:** Push broadcast orchestrator
  - Files: `packages/services/src/notifications/push.ts`, `index.ts`
  - Commit: —
  - Notes: Pause if Drizzle blocks returning inserted ids in bulk insert.

### Phase 3 — API ops + routes (web)

- [ ] **Task 7:** Register/unregister push token ops
  - Files: `apps/web/src/server/operations/profile.ts`
  - Commit: —

- [ ] **Task 8:** API route handler
  - Files: `apps/web/src/app/api/v1/profile/push-token/route.ts`
  - Commit: —

- [ ] **Task 9:** Update broadcast op to use `sendPushBroadcast` + accept `target`
  - Files: `apps/web/src/server/operations/admin.ts`
  - Commit: —

- [ ] **Task 10:** `EXPO_ACCESS_TOKEN` env declaration + docs
  - Files: `apps/web/src/config/env.ts`, `.env.example`
  - Commit: —

### Phase 4 — Admin UI

- [ ] **Task 11:** Extend broadcast modal with audience picker + partial-success display
  - Files: `apps/web/src/features/admin/components/business-broadcast-modal.tsx`
  - Commit: —

### Phase 5 — Mobile

- [ ] **Task 12:** `expo-notifications` dep + config plugin
  - Files: `apps/mobile/package.json`, `app.config.ts`, `pnpm-lock.yaml`
  - Commit: —
  - Notes: **MANDATORY PAUSE** — EAS rebuild required for push on real devices.

- [ ] **Task 13:** Push registration utility
  - Files: `apps/mobile/lib/push.ts`
  - Commit: —

- [ ] **Task 14:** Pre-prompt screen
  - Files: `apps/mobile/components/notifications-pre-prompt-modal.tsx` (or `(auth)` route)
  - Commit: —

- [ ] **Task 15:** Post-login flow gating
  - Files: `apps/mobile/app/(app)/_layout.tsx` (or post-auth redirect)
  - Commit: —

- [ ] **Task 16:** Account-hub "Enable notifications" row
  - Files: `apps/mobile/app/(app)/account.tsx`
  - Commit: —

### Phase 6 — Docs

- [ ] **Task 17:** FORK_CHECKLIST + roadmap updates
  - Files: `FORK_CHECKLIST.md`, `roadmap.md`
  - Commit: —
