# Implementation report — broadcast modal empty pickers

**Started:** 2026-07-30 07:10
**Finished:** 2026-07-30 07:17
**Source:** [debug report](../../debug/2026-07-30-0705-broadcast-modal-empty-pickers/report.md)
**Branch:** feat/business-logo
**Status:** complete

## Tasks

| # | Status | Task | Commit |
|---|--------|------|--------|
| 1 | ✓ done | Add GET handler to admin businesses route | `971d31c` |

## Commits

- `971d31c` fix(admin/broadcast): expose GET on /api/v1/admin/businesses

## Verification

- Debug repro spec (`.mstack/debug/…/specs/repro.spec.ts`) — was failing,
  now passes.
- `pnpm --filter @aira/web typecheck` — clean.
- Pre-commit hooks (`check-migrations`, `check-no-server-actions`,
  `check-contrast`) — all green.
- Manual re-repro (open Notify business owners modal) still needs a human
  hand — see next step.

## Follow-ups (from the debug report's "Out of scope")

- Silent `catch` in `business-broadcast-modal.tsx:121-124` still hides
  genuine failures forever. A retry UI or toast would be an easy win.
- "Loading…" is derived from `arr.length === 0`, so a failed fetch still
  looks like an in-flight one indefinitely. Better: an explicit
  `loading` / `error` state per picker.
- Both belong in one small follow-up plan — worth doing before another
  batched-picker modal repeats the pattern.

## Recommended next step

`/mlabs-qa focus:admin-broadcast` — drive the modal end-to-end, confirm
all three pickers populate and a broadcast can be sent to a scoped
audience.
