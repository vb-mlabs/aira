# Implementation: F20 v2 — Community admin queue

**Started:** 2026-06-14
**Review:** [2026-06-14-community-admin-v2](../../reviews/2026-06-14-community-admin-v2.md)
**Branch:** feat/rest-api-migration
**Setup commit:** ff6d036
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **T1:** Validators (Edit/Delete inputs + status_counts) — `39449bb`
- [x] **T2:** AuditMeta variants (delete + edit) — `6bb423b`
- [x] **T3:** Service additions — `2067935`
- [x] **T4:** Operations + REST routes — `507b2b8`
- [x] **T6:** New UI primitives (respondent list, edit modal, delete confirm) — `efb3954` (reordered ahead of T5 — see notes)
- [x] **T5:** Page + queue refactor (filter chips + status-aware actions) — `45481e3`

## Notes

- **T6 ran before T5.** T5's queue refactor consumes the three new
  primitives; building them first kept each commit typecheck-clean
  (same reordering pattern as F17's T4↔T5 swap).
- **`createAudit` was widened** during T3 from `Database` to
  `Pick<Database, "insert">` so a Drizzle `PgTransaction` handle
  satisfies the contract. Required because `deletePost` and `editPost`
  write audit + mutation in one `db.transaction(async (tx) => …)` so a
  failed audit rolls back the change. Existing `Database` callers
  compile unchanged.
- **No-op edits return without writing an audit row.** If the admin
  opens the edit modal and saves without changing anything, `editPost`
  recognises the equality and short-circuits. Saves audit volume; the
  Save button is also disabled until at least one field is dirty so
  this path is rare.
