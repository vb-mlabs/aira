# Implementation: Per-business sponsorship model

**Started:** 2026-07-13 09:30
**Review:** [2026-07-13-per-business-sponsorship](../../reviews/2026-07-13-per-business-sponsorship.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Audit script + pnpm alias + baseline run
  - Commit: fa8a117
  - Notes: dev DB baseline 0 orphans, 0 duplicates

- [-] **Task 2:** Dedup CTE test harness
  - Commit: — (skipped)
  - Notes: Pause if trigger fired (no packages/db/tests/ infra). User elected to rely on task 1's audit script + manual staging review before applying dedup to prod.

- [x] **Task 3:** Schema drop + migration + backend refactor
  - Commit: 6725631
  - Notes: Scope expanded to include the minimum UI deletions from tasks 4+5 to keep the commit compile-clean. New-UX additions (helper line, tier page helper text) shipped in tasks 4+5. Migration 0035 applied on dev, `--verify` OK.

- [x] **Task 4:** Add 'Will feature on: …' helper line to Add-Sponsorship dialog
  - Commit: 3b00a84
  - Notes: Parent BusinessAdminDetail derives category names from `business.category` + `business.extra_category_ids` — no new API call. Empty-categories case handled with explicit warning copy.

- [x] **Task 5:** Add 'priority sorts, no caps' helper text on tier list page
  - Commit: f0428b8
  - Notes: —
