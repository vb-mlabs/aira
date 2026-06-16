# Implementation: F17 — Configurable renewal-reminder schedule

**Started:** 2026-06-14
**Review:** [2026-06-14-renewal-schedule-config](../../reviews/2026-06-14-renewal-schedule-config.md)
**Branch:** feat/rest-api-migration
**Setup commit:** 0a26134
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **T1:** Validators (schedule schema + parser) — `3d9d49e`
- [x] **T2:** Service: findRenewingExactlyInDays — `6767509`
- [x] **T3:** Migration: seed reminder_schedule — `7a6bf14`
- [x] **T5:** Email template: windowLabel prop — `7c51d9c` (reordered ahead of T4 — see notes)
- [x] **T4:** Cron: read setting + loop windows — `5f29d1f`
- [x] **T6:** Admin REST: dedicated ops + route — `b3e64cf`
- [x] **T7:** Admin UI: hub + renewal-schedule page + form — `322d759`

## Notes

- **T5 ran before T4.** The cron rewrite consumes `windowLabel`; flipping
  the order keeps each commit typecheck-clean. T5 patched the cron's
  legacy call site with a stub `"Expiring in 7 days"` label so the
  monorepo typechecks at that commit; T4 then rewrote the entire cron
  body.
- **`AuditMeta` extended** with an `app_setting.updated` variant in T6 so
  the schedule edit can be audited end-to-end. Same `users.ts` pattern
  (audit BEFORE the write so a failed audit blocks the change).
