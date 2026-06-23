# Implementation: Expo SDK 55 → 54 downgrade

**Started:** 2026-06-23
**Review:** [2026-06-23-expo-sdk-54-downgrade](../../reviews/2026-06-23-expo-sdk-54-downgrade.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** Pin expo to ~54.0.0 + drop react-native-worklets
  - Files: `apps/mobile/package.json`
  - Commit: —

- [ ] **Task 2:** pnpm install + expo install --fix
  - Files: `apps/mobile/package.json`, `pnpm-lock.yaml`
  - Commit: —
  - Notes: Pause-if for peer-dep >1 major regressions; lint break in F21 code; expo-notifications API drift.

- [ ] **Task 3:** Verify app.config.ts SDK-54-compatible
  - Files: `apps/mobile/app.config.ts`
  - Commit: —

- [ ] **Task 4:** Runbook entry — SDK pin change
  - Files: `docs/operations/eas-build-runbook.md`
  - Commit: —

- [ ] **Task 5:** Roadmap entry + decision log
  - Files: `roadmap.md`
  - Commit: —

- [ ] **Task 6:** FORK_CHECKLIST note
  - Files: `FORK_CHECKLIST.md`
  - Commit: —
