# Implementation report — F17 configurable renewal schedule

**Date:** 2026-06-14
**Review:** [2026-06-14-renewal-schedule-config](../../reviews/2026-06-14-renewal-schedule-config.md)
**Branch:** `feat/rest-api-migration`
**Status:** **complete** — all 7 tasks shipped, full monorepo typecheck clean

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| — | Workflow artifacts setup | ✓ | `0a26134` |
| T1 | Validators (schedule schema + parser) | ✓ done | `3d9d49e` |
| T2 | Service: findRenewingExactlyInDays | ✓ done | `6767509` |
| T3 | Migration: seed reminder_schedule | ✓ done | `7a6bf14` |
| T5 | Email template: windowLabel prop | ✓ done (reordered) | `7c51d9c` |
| T4 | Cron: read setting + loop windows | ✓ done | `5f29d1f` |
| T6 | Admin REST: dedicated ops + route | ✓ done | `b3e64cf` |
| T7 | Admin UI: hub + renewal-schedule page + form | ✓ done | `322d759` |

8 commits, atomic, lefthook clean every time, no `--no-verify`.

## Deviations from the review

1. **T5 ran before T4.** The cron rewrite needed `windowLabel` to be on
   the email template; the template change broke the existing cron site
   immediately. Solved by reordering: T5 first (with a one-line stub
   label on the existing cron call), then T4 (rewriting the entire cron
   body). Each commit typechecks individually.

2. **`AuditMeta` discriminated union extended.** T6 needed an
   `app_setting.updated` variant to audit the schedule edit; the audit
   metadata is a typed allowlist for GDPR/anonymize-on-delete safety,
   so adding the variant in `packages/db/src/audit.ts` was the right
   path (not a workaround). Noted in the review's `Pause if` trigger
   for T6 — the audit helper signature matched what the review
   anticipated, no pause needed.

3. **No new files in the validators package.** Review locked the schedule
   schema into the existing `app_settings.ts` rather than creating a new
   `reminder-schedule.ts`. Cleaner — one less subpath export, one less
   import line at every call site.

## Acceptance criteria — verification

- [x] `reminder_schedule` row materializes via the migration seed
      (`0022_seed_reminder_schedule.sql`); confirmed `value = "7"` after
      `pnpm db:migrate`.
- [x] `GET /api/v1/admin/app-settings/reminder-schedule` returns
      `{ value, windows }` (admin permission via defineOperation).
- [x] `PATCH` validates via `ReminderScheduleSchema` at the server
      boundary; bad input returns `400 validation.input` with field-aware
      message.
- [x] Audit row written BEFORE the AppSetting write; failed audit blocks
      the change (`users.ts` pattern).
- [x] Cron parses the persisted value via `parseReminderSchedule` (silent
      fallback to `[7]`), strict re-parses for telemetry, and loops the
      windows calling `findRenewingExactlyInDays` per window.
- [x] Email subject becomes `"AIRA · Expiring in N days — M business(es)"`
      and the header switches to `windowLabel` (`brand.name` pulled from
      `createTemplates` — no literal brand string in code).
- [x] Admin `/admin/settings` is a hub page; sidebar Settings entry
      points at the hub (not the homepage sub-page).
- [x] `/admin/settings/renewal-schedule` form parses input via
      `ReminderScheduleSchema` on every keystroke, surfaces the first
      issue inline, previews the parsed windows ("Reminders will fire
      3 times: 30, 14, 7 days before"), and disables Save while invalid.
- [x] `pnpm typecheck` passes across all 10 packages.

## Follow-ups

Nothing blocking. Two opportunistic items for later:

- **Wire homepage CMS to also write to audit_log.** The S5 mini-sprint
  shipped the homepage form without audit; F17 now has the pattern.
  Single-file change in `homepage-cms-form.tsx` + the existing generic
  update op.
- **Surface `cron_run.summary` better on `/admin/cron`.** F17's new
  summary string ("Sent 2 email(s) covering 5 subscription(s) across
  windows: 30, 7") is informative but currently rendered as plain text.
  A one-line digest of the last successful run per job would help admin
  scanning.

## Recommended next step

Run `/mlabs-qa` with focus area: **F17 configurable renewal schedule** —
admin opens `/admin/settings`, clicks Renewal schedule, sees `"7"`
prefilled, edits to `"30, 14, 7"`, saves; an `audit_log` row exists;
a cron Run Now triggers labeled emails per non-empty window. Verify the
sidebar Settings entry now points at the hub.

Update **roadmap.md** to mark F17 ✅ in the S5 list whenever you're
ready to push. F17 amendment (configurable schedule) is now fully
closed; per-business-owner emails remain Phase 2 (owner-identity
blocker).
