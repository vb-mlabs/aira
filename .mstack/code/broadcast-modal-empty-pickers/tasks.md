# Implementation: broadcast modal empty pickers

**Started:** 2026-07-30 07:10
**Source:** [debug report](../../debug/2026-07-30-0705-broadcast-modal-empty-pickers/report.md)
**Branch:** feat/business-logo
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add GET handler to admin businesses route
  - Files: `apps/web/src/app/api/v1/admin/businesses/route.ts`
  - Commit: `971d31c`
  - Notes: Wired existing `listAllBusinessesAdminOp` — no schema, deps, or brand
    changes. Repro spec + web typecheck both green; pre-commit hooks (migrations,
    server-actions, contrast) all pass.
