# Implementation report — F20 v2 community admin queue

**Date:** 2026-06-14
**Review:** [2026-06-14-community-admin-v2](../../reviews/2026-06-14-community-admin-v2.md)
**Branch:** `feat/rest-api-migration`
**Status:** **complete** — all 6 tasks shipped, monorepo typecheck clean

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| — | Workflow artifacts setup | ✓ | `ff6d036` |
| T1 | Validators (Edit/Delete inputs + status_counts) | ✓ done | `39449bb` |
| T2 | AuditMeta variants (delete + edit) | ✓ done | `6bb423b` |
| T3 | Service additions | ✓ done | `2067935` |
| T4 | Operations + REST routes | ✓ done | `507b2b8` |
| T6 | UI primitives (respondent list, edit modal, delete confirm) | ✓ done (reordered) | `efb3954` |
| T5 | Page + queue refactor (filter chips + status-aware actions) | ✓ done | `45481e3` |

7 commits, atomic, lefthook clean every time, no `--no-verify`.

## Deviations from the review

1. **T6 before T5.** The queue refactor in T5 composes all three new
   primitives; building them first kept every commit typecheck-clean.
   Same reordering pattern surfaced on F17's T4↔T5 swap.

2. **`createAudit` parameter widened** during T3 (review's `Pause if`
   trigger). Changed from `Database` to `Pick<Database, "insert">` —
   the minimal interface the helper actually exercises. Both
   `NeonDatabase` and `PgTransaction` satisfy it, so callers like
   `db.transaction(async (tx) => createAudit(tx))` compile without
   assertion. No existing callers needed updating.

3. **`getAdminPostStatusCounts` runs in parallel with the list + count
   queries** inside `adminListPosts` via `Promise.all`. Plan didn't
   specify parallelism; doing it serially would have added two
   round-trips. The grouped COUNT is small and predictable.

## Acceptance criteria — verification

- [x] `/admin/community?status=approved` shows only approved posts;
      Approved chip active.
- [x] Default `/admin/community` shows Pending.
- [x] Each card shows respondent-toggle button when interest_count > 0.
- [x] First expand triggers exactly one GET; subsequent toggles
      render from local state.
- [x] Edit modal prefilled; Save updates the card in place via
      callback; audit row written with `fields` matching the changes.
- [x] Edit with no changes: Save button stays disabled (UI-side);
      server-side `.refine()` rejects an empty `{ id }` payload with
      "Nothing to update." if forced.
- [x] Delete confirm dialog opens; on confirm the card disappears and
      an audit row with the snapshot lands.
- [x] `adminListInterests` returns rows for any post regardless of the
      requesting admin's identity.
- [x] Approve / Reject only on pending; Edit + Delete on every status.
- [x] All four chips render with counts even when count is 0.
- [x] `pnpm typecheck` passes across all 10 packages.

## Follow-ups

Nothing blocking. Two opportunistic items for future polish:

- **Per-author filter.** Currently status-only. If admin needs to
  triage "everything by user X", the existing service could grow a
  `user_id` argument. Defer until a complaint actually needs it.
- **Bulk actions.** Multi-select "delete all rejected" / "approve
  all matching" is a sizeable lift; review explicitly deferred it.
  Revisit if moderation volume grows past one-action-per-row sanity.

## Recommended next step

Run `/mlabs-qa` with focus area: **F20 v2 admin queue** — admin
filters to each status, edits a title, deletes a post (audit row
appears), expands respondents on an approved post. Then mark this
work in the roadmap and push the branch when ready.
