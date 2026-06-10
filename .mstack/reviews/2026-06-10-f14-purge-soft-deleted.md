# Review: F14 — Purge Soft-Deleted Businesses Cron

**Date:** 2026-06-10
**Slug:** 2026-06-10-f14-purge-soft-deleted
**Plan reviewed:** [2026-06-10-f14-purge-soft-deleted.md](../plans/2026-06-10-f14-purge-soft-deleted.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (mlabs-review)

---

## Summary

Plan is ready to implement. No blockers. The only adjustment is the interval
expression: the plan proposed a SQL template for the cutoff date; the review
locks in a JS-computed `Date` instead, which matches the existing
`rolloverExpiredSubscriptions` pattern and avoids the SQL template complexity.
Both open questions are answered by the roadmap and closed here.

---

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan proposed `lt(businesses.deleted_at, sql\`now() - interval '1 day' * ${PURGE_DAYS}\``)` for the cutoff. While correct, it diverges from the codebase's existing pattern.
  **Decision:** Use a JS-computed cutoff — `const cutoff = new Date(Date.now() - PURGE_DAYS * 24 * 60 * 60 * 1000)` — and pass it as `lt(businesses.deleted_at, cutoff)`. Matches how `rolloverExpiredSubscriptions` compares `lt(businessSubscriptions.end_date, new Date())`. No SQL template needed.

- **Concern:** Plan said "returning the count" without specifying the Drizzle mechanism.
  **Decision:** Use `.returning({ id: businesses.id })` and return `result.length`. Matches `archiveBusiness` / `restoreBusiness` in the same file.

### Suggestions (taken or deferred)

- Open question "180 days" — locked as `const PURGE_DAYS = 180`. Matches roadmap default. No change needed for S6 when AppSetting-driven config lands.
- Open question "3 AM UTC" — confirmed. Schedule `0 3 * * *`. No conflict with existing jobs (subscription rollover 00:05, sponsorship rollover :00 hourly, renewal reminder 08:00).

---

## Decisions locked

- **Cutoff computation:** JS `Date` — `new Date(Date.now() - PURGE_DAYS * 24 * 60 * 60 * 1000)` — not a SQL interval expression.
- **Delete count:** `.returning({ id: businesses.id })` → `result.length`.
- **`PURGE_DAYS = 180`** — named constant, hardcoded for MVP.
- **Schedule `0 3 * * *`** — 3 AM UTC daily.
- **No audit log entries per purged row** — `cron_run.rows_affected` is the record. Audit log is for human-initiated actions; automated cleanup doesn't need per-row entries.
- **`KNOWN_JOBS` must be updated** alongside the handler (learned from S5 QA).

---

## Implementation plan

### Task 1: Service — purgeArchivedBusinesses

- **Files:** `packages/services/src/businesses/service.ts` (edit) · `packages/services/src/businesses/index.ts` (edit)
- **What:** Add `purgeArchivedBusinesses(db: Database, { olderThanDays }: { olderThanDays: number }): Promise<{ deleted: number }>` to `service.ts`. Compute `const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)`. Delete with `and(isNotNull(businesses.deleted_at), lt(businesses.deleted_at, cutoff))`, use `.returning({ id: businesses.id })`, return `{ deleted: result.length }`. Export from `index.ts`.
- **Acceptance:** `pnpm typecheck` passes. Function signature is exported from `@aira/services` businesses domain.

### Task 2: Cron handler + registry + admin page

- **Files:** `apps/web/src/lib/cron/purge-soft-deleted.ts` (new) · `apps/web/src/lib/cron/registry.ts` (edit) · `apps/web/src/app/admin/cron/page.tsx` (edit)
- **What:** New handler `purge-soft-deleted.ts` — `JOB_NAME = "purge-soft-deleted"`, `runPurgeSoftDeleted(runId)` follows `subscription-status-rollover.ts` exactly: `claimWithAdvisoryLock` → call `businesses.purgeArchivedBusinesses(db, { olderThanDays: PURGE_DAYS })` → `finishRun(db, runId, "succeeded", \`Purged ${deleted} archived businesses older than ${PURGE_DAYS} days\`, undefined, deleted)`. In `registry.ts`: dynamic import + `registerRunner` + `scheduleJob(purgeJob, "0 3 * * *", runPurgeSoftDeleted)`. In `page.tsx`: add `{ name: "purge-soft-deleted", schedule: "0 3 * * * (daily 03:00 UTC)" }` to `KNOWN_JOBS`.
- **Acceptance:** `/admin/cron` shows four job cards. "Run now" on `purge-soft-deleted` completes and logs `cron_run` row with `status = 'succeeded'` and `rows_affected = 0` (no businesses are 180+ days archived in dev). `pnpm typecheck` passes.

---

## Open questions

None — all resolved during review.
