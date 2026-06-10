# QA report — 2026-06-10 F14

**Focus:** F14 — purge-soft-deleted cron card + Run now
**Env:** localhost:5000
**Status:** clean
**Tester:** /mlabs-qa

## Scenarios run
1. Four cron cards visible on /admin/cron — pass
2. purge-soft-deleted card shows 03:00 UTC schedule — pass
3. Run now on purge-soft-deleted succeeds, cron_run row appears — pass (after fix)
4. rows_affected = 0 (no 180-day-old archives in dev) — pass

## Issues

### Issue 1: "Run now" on purge-soft-deleted returned "Failed to trigger." — 400 validation error
- **Severity:** high
- **Repro:**
  1. Navigate to /admin/cron
  2. Click "Run now" on the purge-soft-deleted card
  3. Button shows "Failed to trigger." instead of "Triggered."
- **Expected:** Run triggers successfully; after re-navigating the card shows a `succeeded` row
- **Actual:** API returned 400 `validation.input: Unrecognized key: "job"` because the `[job]` route segment was merged as `{ job: "..." }` into the strict Zod input, which only accepts `{ job_name }`.
- **Screenshot:** assets/03-f14-run-now-clicked.png
- **Console errors:** none
- **Root cause:** Route directory `[job]` created a param named `job`, but the Zod schema field is `job_name`. The `.strict()` schema rejected the extra key. Additionally, `triggerCronRunOp` called `startCrons.getRunner()` without first calling `await startCrons()`, leaving runners unregistered after HMR module re-evaluation.
- **Fix plan:** Rename route directory `[job]` → `[job_name]`; switch schema to `.passthrough()`; add `await startCrons()` before `getRunner`.
- **Status:** ✓ fixed (commit c90d6bc)

## Summary
1 total · 0 critical · 1 high · 0 medium · 0 low
Fixed: 1 · Paused: 0 · Deferred: 0
