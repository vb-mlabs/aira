# Implementation: F21 — push broadcasts to business owners

**Started:** 2026-06-23
**Finished:** 2026-06-23
**Review:** [2026-06-23-f21-push-broadcasts](../../reviews/2026-06-23-f21-push-broadcasts.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

### Phase 1 — Schema + validators

- [x] **Task 1:** user_device + notification_delivery tables — `d2e5c12`
- [x] **Task 2:** validators (devices + broadcast target + counters) — `75e398c`

### Phase 2 — Service layer

- [x] **Task 3:** expo-server-sdk dep — `090082b`
- [x] **Task 4:** resolveTargetUserIds extracted + broadcast accepts target — `d08fdc9`
- [x] **Task 5:** devices service queries — `da5e181`
- [x] **Task 6:** sendPushBroadcast orchestrator — `c93e1bc`

### Phase 3 — API ops + routes (web)

- [x] **Task 7:** push-token ops — `5cd8780`
- [x] **Task 8:** /api/v1/profile/push-token route — `d1ae84d`
- [x] **Task 9:** broadcast op wired to sendPushBroadcast — `505626d`
- [x] **Task 10:** EXPO_ACCESS_TOKEN env + .env.example — `d5090c1`

### Phase 4 — Admin UI

- [x] **Task 11:** broadcast modal audience picker — `5c32670`

### Phase 5 — Mobile

- [x] **Task 12:** expo-notifications + config plugin — `8e03c8e` (mandatory pause acknowledged)
- [x] **Task 13:** requestPermissionAndRegister utility — `8523802`
- [x] **Task 14:** NotificationsPrePrompt modal — `6475213`
- [x] **Task 15:** post-login pre-prompt gating — `ab84958`
- [x] **Task 16:** account-hub "Enable notifications" row — `58d0b2e`

### Phase 6 — Docs

- [x] **Task 17:** FORK_CHECKLIST + roadmap updates — `b71c631`
