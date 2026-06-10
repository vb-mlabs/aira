# Plan: F14 — Purge Soft-Deleted Businesses Cron

**Date:** 2026-06-10
**Slug:** 2026-06-10-f14-purge-soft-deleted
**Status:** implemented
**Author:** VB (framer@millionlabs.co.uk)

---

## Problem

Archived businesses (`deleted_at IS NOT NULL`) accumulate in the `businesses` table indefinitely. Without a purge, three things worsen over time:

1. **Index bloat:** the partial index on `(category, tier) WHERE deleted_at IS NULL` stays lean, but the archived rows still consume table storage and bloat sequential scans on unfiltered queries.
2. **PII retention:** archived businesses hold names, addresses, phone numbers, and social links. Keeping them forever is longer than necessary.
3. **Manual overhead:** without automation, admin would have to run raw SQL to reclaim space.

**Who benefits:** admin (automated data hygiene); the platform (leaner DB over time).

---

## Scope

**In:**
- New daily cron job `purge-soft-deleted` that hard-deletes `businesses` rows where `deleted_at IS NOT NULL AND deleted_at < now() - INTERVAL '<PURGE_DAYS> days'`
- `PURGE_DAYS` hardcoded to `180` as a named constant (configurable via `AppSetting` in S6)
- Logs row count to `cron_run` (same pattern as `subscription-status-rollover`)
- Appears as the fourth card on `/admin/cron`
- All child rows (`business_subscriptions`, `sponsorships`, `business_categories`, `business_images`) cascade automatically — no manual cleanup

**Out (deferred):**
- Configurable purge window via `AppSetting` — S6
- Purging other soft-deleted entities (only `businesses` has `deleted_at` currently)
- Per-business pre-purge notification or admin confirmation UI
- Audit log entry per purged business (cron_run summary is sufficient for MVP; individual entries would bloat audit_log)

---

## Approach

New cron handler `apps/web/src/lib/cron/purge-soft-deleted.ts` follows the identical pattern as `subscription-status-rollover.ts`:

1. `JOB_NAME = "purge-soft-deleted"` constant
2. `cronService.claimWithAdvisoryLock` wraps the work (transaction-scoped advisory lock, safe through Neon's pooler)
3. Calls a new service function `purgeArchivedBusinesses(db, { olderThanDays })` in `packages/services/src/businesses/service.ts`
4. Calls `cronService.finishRun` with the deleted count as `rowsAffected`

The service function issues a single `DELETE FROM businesses WHERE deleted_at IS NOT NULL AND deleted_at < now() - INTERVAL '...'` using Drizzle's `lt` operator against an interval expression, returning the count of deleted rows.

Registered in `registry.ts` at `0 3 * * *` (3 AM UTC daily — off-peak, after midnight rollover jobs). Added to `KNOWN_JOBS` in `apps/web/src/app/admin/cron/page.tsx` (lesson from S5: the static list must always be updated alongside the handler).

**Alternatives considered:**

- **Add `AppSetting`-driven purge window now** — rejected. S6 scope; hardcoding 180 days is correct for MVP and avoids the AppSetting admin UI dependency.
- **Manually delete child rows before deleting the business** — rejected. All child tables already have `{ onDelete: "cascade" }` FKs; Postgres handles cascades atomically. Explicit child deletes would be redundant and slower.
- **Soft-delete audit entry per purged business** — rejected. `cron_run.rows_affected` captures the count. Per-row audit entries for automated purge would bloat `audit_log` without adding investigative value (there's no admin action to trace — it's a scheduled cleanup).

---

## Data model changes

None. `businesses.deleted_at` already exists (migration `0015`). No new migration needed.

---

## Files to touch

**New:**
- `apps/web/src/lib/cron/purge-soft-deleted.ts` — cron handler (`JOB_NAME`, `runPurgeSoftDeleted`, `claimWithAdvisoryLock` + `purgeArchivedBusinesses` + `finishRun`)

**Edit:**
- `packages/services/src/businesses/service.ts` — add `purgeArchivedBusinesses(db, { olderThanDays: number }): Promise<{ deleted: number }>` (Drizzle `delete` with `and(isNotNull(deleted_at), lt(deleted_at, sql\`now() - ${olderThanDays} * interval '1 day'\`))`)
- `packages/services/src/businesses/index.ts` — export `purgeArchivedBusinesses`
- `apps/web/src/lib/cron/registry.ts` — dynamic import + `registerRunner` + `scheduleJob` at `0 3 * * *`
- `apps/web/src/app/admin/cron/page.tsx` — add `{ name: "purge-soft-deleted", schedule: "0 3 * * * (daily 03:00 UTC)" }` to `KNOWN_JOBS`

---

## Edge cases

- **Zero rows purged:** normal outcome on a clean system. Handler logs `succeeded` with `rows_affected = 0`. No error thrown.
- **Cascade depth:** businesses with many subscriptions/sponsorships/images could produce a large cascade. At MVP scale (hundreds of businesses) this is fine within a single transaction. If volume grows, the cron's advisory lock ensures only one instance runs at a time.
- **Business restored after long-pending archive:** `restoreBusiness` sets `deleted_at = NULL`. If a business is restored before the 180-day window, it won't be purged — correct behaviour.
- **Drizzle interval expression:** Drizzle's `lt` can compare a `timestamp` column against a SQL expression. The safest form is `sql\`now() - interval '1 day' * ${PURGE_DAYS}\`` using a parameterised integer to avoid SQL injection risk (even though `PURGE_DAYS` is a constant).
- **`cron_run` log on zero-delete run:** still logs as `succeeded` with summary `"Purged 0 archived businesses (older than 180 days)"` — consistent with other handlers.

---

## Acceptance criteria

- [ ] `/admin/cron` shows four job cards: `subscription-status-rollover`, `sponsorship-status-rollover`, `renewal-reminder`, `purge-soft-deleted`.
- [ ] "Run now" on `purge-soft-deleted` completes without error and logs a `cron_run` row with `status = 'succeeded'`.
- [ ] On a system with no businesses archived longer than 180 days, the run logs `rows_affected = 0`.
- [ ] Archiving a business and manually backdating its `deleted_at` to 181 days ago (via SQL in dev), then running the cron, hard-deletes the row and all its child records (subscriptions, sponsorships, images, categories).
- [ ] Active businesses (`deleted_at IS NULL`) and recently archived businesses (`deleted_at` within 180 days) are untouched by the cron.
- [ ] `pnpm typecheck` passes after implementation.

---

## Open questions

- **Purge window default (180 days):** confirm this is the right MVP default. The roadmap says "default 180 days" — locking that in as `const PURGE_DAYS = 180`.
- **Schedule (3 AM UTC):** any preference for a different time? Currently: subscription rollover at 00:05, sponsorship rollover at :00 past each hour, renewal reminder at 08:00, purge at 03:00.
