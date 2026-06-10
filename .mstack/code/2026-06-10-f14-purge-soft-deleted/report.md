# Implementation report: F14 — Purge Soft-Deleted Businesses Cron

**Status:** complete
**Started:** 2026-06-10
**Review:** [2026-06-10-f14-purge-soft-deleted](../../reviews/2026-06-10-f14-purge-soft-deleted.md)

## Tasks

| Task | Status | Commit | Note |
|---|---|---|---|
| T1: Service — purgeArchivedBusinesses | ✓ done | 836a4ee | JS-computed cutoff, .returning({ id }) for count |
| T2: Cron handler + registry + admin page | ✓ done | df7225f | KNOWN_JOBS updated alongside handler |

## Commits

- `836a4ee` feat(services): purgeArchivedBusinesses — hard-delete aged soft-deleted rows
- `df7225f` feat(cron): purge-soft-deleted daily job (F14)

## Follow-ups

- None. No migration, no new deps, no open questions.

## Recommended next step

`/mlabs-qa` — focus areas:
1. `/admin/cron` shows four job cards (subscription-status-rollover, sponsorship-status-rollover, renewal-reminder, purge-soft-deleted)
2. "Run now" on `purge-soft-deleted` completes, logs `cron_run` row with `status = succeeded` and `rows_affected = 0`
