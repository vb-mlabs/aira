# Implementation: Darken brand primary for WCAG AA

**Started:** 2026-06-10 (resumed)
**Review:** [2026-05-24-primary-color-darken](../../reviews/2026-05-24-primary-color-darken.md)
**Branch:** feat/rest-api-migration
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** Shift primary + ring tokens in design.ts
  - Files: packages/config/src/design.ts
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Mirror token changes into globals.css
  - Files: apps/web/src/app/globals.css
  - Commit: —
  - Notes: —

- [ ] **Task 3:** Update email hex mirror in brand.ts
  - Files: packages/config/src/brand.ts
  - Commit: —
  - Notes: —

- [ ] **Task 4:** Regenerate mobile tailwind.config.js
  - Files: apps/mobile/tailwind.config.js
  - Commit: —
  - Notes: —

- [ ] **Task 5:** Add primary-vs-background pair to check-contrast.ts
  - Files: scripts/check-contrast.ts
  - Commit: —
  - Notes: —

- [ ] **Task 6:** Sync DESIGN.md
  - Files: DESIGN.md
  - Commit: —
  - Notes: —

- [ ] **Task 7:** Single atomic commit + hook verification
  - Files: all six above
  - Commit: —
  - Notes: —
