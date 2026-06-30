# Implementation: EAS project init + first builds + .well-known propagation

**Started:** 2026-06-22 (in progress)
**Review:** [2026-06-22-eas-project-init](../../reviews/2026-06-22-eas-project-init.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped
- **[CODE]** autonomous · **[HUMAN]** pauses for user CLI/portal work

## Phase 1 — Pre-init code prep

- [ ] **Task 1 [CODE]:** Draft EAS runbook docs
  - Files: `docs/operations/eas-build-runbook.md` (new) · `docs/operations/eas-keystore-backup.md` (new)
  - Commit: —

- [ ] **Task 2 [CODE]:** Add `production` profile to `eas.json`
  - Files: `apps/mobile/eas.json`
  - Commit: —

- [ ] **Task 3 [CODE]:** Add `expo-updates` + `runtimeVersion` policy
  - Files: `apps/mobile/package.json` · `apps/mobile/app.config.ts` · `pnpm-lock.yaml`
  - Commit: —

## Phase 2 — Human-operated EAS init

- [ ] **Task 4 [HUMAN]:** Run `eas init` from Replit shell
  - Files: `apps/mobile/app.config.ts` (CLI writes `extra.eas.projectId`)
  - Commit: —

## Phase 3 — Post-init code wiring

- [ ] **Task 5 [HUMAN→CODE]:** Wire EAS Update — `updates.url` + channel mapping
  - Files: `apps/mobile/app.config.ts` (`eas update:configure` writes the URL)
  - Commit: —

## Phase 4 — Build pipeline: credentials + builds

- [ ] **Task 6 [HUMAN]:** First simulator iOS build
- [ ] **Task 7 [HUMAN]:** Upload Apple credentials (API key + Push Key)
- [ ] **Task 8 [HUMAN]:** Trigger Android keystore generation + 1Password backup
- [ ] **Task 9 [HUMAN]:** Preview iOS build
- [ ] **Task 10 [HUMAN]:** Production iOS + Android builds

## Phase 5 — Portal app records + first uploads

- [ ] **Task 11 [HUMAN]:** Create App Store Connect app record + TestFlight Internal group
- [ ] **Task 12 [HUMAN]:** Create Play Console app record + upload AAB to Internal Testing

## Phase 6 — Code: value propagation

- [ ] **Task 13 [CODE]:** Substitute Team ID into `apple-app-site-association`
- [ ] **Task 14 [CODE]:** Substitute SHA-256 into `assetlinks.json`
- [ ] **Task 15 [CODE]:** Update derived `FORK_CHECKLIST.md`
- [ ] **Task 16 [CODE]:** Update `roadmap.md`
