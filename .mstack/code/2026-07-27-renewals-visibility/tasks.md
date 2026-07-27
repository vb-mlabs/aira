# Implementation: Renewals Visibility

**Started:** 2026-07-27 14:00
**Finished:** 2026-07-27 15:20
**Review:** [2026-07-27-renewals-visibility](../../reviews/2026-07-27-renewals-visibility.md)
**Branch:** feat/business-logo
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** listQueue service includeAll + ordering CASE — `8ab9d08`
- [x] **Task 2:** Guard test for listQueue default parity — `6308cf4`
  - Notes: TypeScript signature drift on drizzle-orm's `and` caught during Task 3's typecheck; fixed inline in that commit.
- [x] **Task 3:** Validator + op includeAll — `8fb3437`
  - Notes: also touched apps/web/src/app/admin/renewals/page.tsx with a placeholder `includeAll: false` so the tree stayed compiling per-task. Removed in Task 6.
- [x] **Task 4:** Toggle chip in window-chips.tsx — `7459e91`
  - Notes: also touched apps/web/src/app/admin/renewals/page.tsx with `showAll={false}` placeholder. Wired in Task 6.
- [x] **Task 5:** Next attempt column + resolved/scheduled row treatment — `fd90b65`
- [x] **Task 6:** Page subtitle counts + showAll wiring — `a1c5d10`
- [x] **Task 7:** Copy pass in outcome-radio-group.tsx — `3baf5b3`
- [x] **Task 8:** Final gate — verify + one lint fix commit `db80baf` (Date.now hoist)

## Prep commit (not part of the task list)
- `388a69f` — `docs(mstack): plan + review for renewals-visibility feature`
