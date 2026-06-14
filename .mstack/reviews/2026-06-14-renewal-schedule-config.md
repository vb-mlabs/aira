# Review: F17 — Configurable renewal-reminder schedule

**Date:** 2026-06-14
**Slug:** renewal-schedule-config
**Plan reviewed:** [2026-06-14-renewal-schedule-config.md](../plans/2026-06-14-renewal-schedule-config.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** claude-sonnet-4-6

---

## Summary

Plan is sound. Five open questions resolved. Two correctness fixes folded
in (paid-only filter inside the new query, migration seed shape), and one
small file-list correction (the operations file already exists — extend it,
don't create it). Six implementation tasks, in order.

---

## Findings

### Blockers (must fix before /mlabs-code)

- **Operations file already exists.** Plan listed
  `apps/web/src/server/operations/app-settings-admin.ts` as new. It exists
  with `getAppSettingsOp` and `updateAppSettingOp`. Action: **extend** that
  file with two new ops (`getReminderScheduleOp`, `updateReminderScheduleOp`),
  not replace.

- **Migration seed shape.** The plan's seed SQL uses `gen_random_uuid()::text`
  — correct, this is the same fix from the F20 learning (Drizzle `$defaultFn`
  is application-side, not a SQL `DEFAULT`). Carrying it forward explicitly
  so /mlabs-code doesn't repeat the F20 mistake.

### Concerns (raised, decided, recorded)

- **Concern:** Plan said the new `findRenewingExactlyInDays` returns rows
  with `payment_status IN ('paid', 'overdue')` then the cron filters to
  `'paid'`. Double filtering, two sources of truth.
  **Decision:** Inline-filter to `payment_status = 'paid'` inside the new
  query. The legacy `findRenewingSoon` keeps its inclusive shape because
  `/admin/businesses?renewing=N` wants to see both statuses. The cron's
  intent is paid-only — codify it.

- **Concern:** The existing `updateAppSettingOp` has
  `output: z.object({ setting: z.any() })`. Could we route this through the
  existing op with a key-keyed validator map?
  **Decision:** No — add dedicated `getReminderScheduleOp` /
  `updateReminderScheduleOp` so the schedule string passes through the same
  Zod parser at the boundary, server-side. The generic ops keep their loose
  shape because they're used by HomepageCmsForm with client-side validation
  only. Dedicated ops are the right pattern when a setting has real
  semantics.

- **Concern:** Plan suggested the dedicated REST route at
  `/api/v1/admin/app-settings/reminder-schedule`. That's a sub-path on a
  resource — fine — but could also have been added as a separate top-level
  route.
  **Decision:** Keep the sub-path. Matches the conceptual grouping
  (everything under app-settings/* is admin AppSetting traffic).

- **Concern:** Plan listed audit_log integration as an Open Question.
  Existing `updateAppSetting` service doesn't audit. Adding one-off audit
  only for this setting introduces inconsistency.
  **Decision (reviewer + user):** Audit YES. Wrap the dedicated update op
  with an `audit.log` call: `actor_user_id = ctx.userId`,
  `entity_type = "app_setting"`, `entity_id = "reminder_schedule"`,
  `action = "updated"`, `changes_json = { old, new }`. Acceptable to
  back-fill the homepage settings later — F17's cron failure mode is
  operationally serious enough to justify per-setting audit now.

- **Concern:** Plan's subject line was `"Expiring in N days — M businesses"`
  without a brand prefix. The existing email templates (Verify,
  PasswordReset, Notification, RenewalReminder) all carry the brand in the
  subject upstream.
  **Decision (reviewer):** Subject becomes `"AIRA · Expiring in N days
  — M business${M === 1 ? "" : "es"}"`. Brand name from
  `brand.name` (no string literal in code; ESLint rule enforces this).

### Suggestions (taken or deferred)

- **Suggestion:** Keep the new Zod schema in `packages/validators/src/app_settings.ts` instead of carving out a separate `reminder-schedule.ts` file. The schema is tiny (one parse helper + one input schema) and the AppSetting domain already lives in `app_settings.ts`. **Taken** — avoids a new `package.json` exports entry and one extra import line.
- **Suggestion:** Use the new `/admin/settings/` hub page to also link the future Renewal-schedule sub-page and the existing Homepage settings page. **Taken** — covered by Task 5.

---

## Decisions locked

1. **Seed `reminder_schedule = "7"` via migration** using the
   `gen_random_uuid()::text` ID pattern. Cron's fallback to `[7]` becomes
   belt-and-suspenders.

2. **Admin sidebar:** keep ONE `Settings` row pointing at `/admin/settings`.
   New `/admin/settings/page.tsx` is a hub listing Homepage + Renewal
   schedule sub-pages.

3. **Validation cap:** each window is `1 ≤ n ≤ 365` days. Schedule has
   `1 ≤ count ≤ 10` windows, no duplicates, all positive integers, no
   empty list at the boundary.

4. **Audit log:** schedule edits write an `audit_log` row with old/new
   values via `audit.log`. Single-setting audit, back-fill homepage later.

5. **Email subject:** `"AIRA · Expiring in N days — M business(es)"` —
   brand pulled from `brand.name`. Body template gains
   `windowLabel: string`.

6. **Service:** new `findRenewingExactlyInDays` query inline-filters to
   `payment_status = 'paid'`. Legacy `findRenewingSoon` keeps its
   paid+overdue inclusive shape.

7. **Validators:** the schedule Zod schema lives in
   `packages/validators/src/app_settings.ts` (no new file, no new subpath
   export).

---

## Implementation plan

### Task 1: Validators — schedule schema + parse helpers

- **Files:**
  - `packages/validators/src/app_settings.ts` (edit)
- **What:** Add `ReminderScheduleSchema` (Zod) that parses a
  comma-separated string into `number[]`. Rules: each entry positive int,
  `1 ≤ n ≤ 365`, no dupes, `1 ≤ count ≤ 10`. Reject empty list at the
  boundary. Export a `parseReminderSchedule(value: string | null) :
  number[]` helper that returns `[7]` for `null`/empty (cron's fallback
  path). Add `ReminderScheduleUpdateInputSchema` (`{ value: string }`) and
  `ReminderScheduleOutputSchema` (`{ value: string, windows: number[] }`)
  for the dedicated ops.
- **Acceptance:** `pnpm --filter @aira/validators typecheck` clean;
  `ReminderScheduleSchema.parse("30, 14, 7")` returns `[30, 14, 7]`;
  `.parse("30,30,7")` throws on duplicates; `.parse("0")` throws;
  `.parse("366")` throws; `parseReminderSchedule(null)` returns `[7]`.

---

### Task 2: Service — findRenewingExactlyInDays

- **Files:**
  - `packages/services/src/business-subscriptions/queries.ts` (edit)
  - `packages/services/src/business-subscriptions/index.ts` (edit — re-export)
- **What:** Add `findRenewingExactlyInDays(db, { days })` returning the
  same `RenewingSoonRow` shape. Inline-filter
  `payment_status = 'paid'`. Predicate is
  `(end_date::date - CURRENT_DATE) = ${days}` — date-only diff. Set
  `days_remaining = days` in the returned mapper. Re-export from
  `index.ts`.
- **Acceptance:** `pnpm --filter @aira/services typecheck` clean. Inserting
  a fixture sub with `end_date = now() + interval '7 days'` and
  `payment_status='paid'` returns it from `findRenewingExactlyInDays(db, {
  days: 7 })`; the same fixture is NOT returned by `findRenewingExactlyInDays(db, { days: 14 })`.

---

### Task 3: Migration — seed reminder_schedule

- **Files:**
  - `packages/db/drizzle/migrations/<timestamp>_seed_reminder_schedule.sql` (new — generated via custom migration; **not** `pnpm db:generate` since there's no schema diff)
  - `packages/db/drizzle/migrations/meta/<timestamp>_snapshot.json` (regenerated)
- **What:** Hand-write a single-statement migration that seeds the row:
  ```sql
  INSERT INTO "app_setting" ("id", "key", "value")
  VALUES (gen_random_uuid()::text, 'reminder_schedule', '7')
  ON CONFLICT ("key") DO NOTHING;
  ```
  Use a numeric prefix one above the latest migration (will be `0022`).
- **Acceptance:** `pnpm db:migrate` applies cleanly on a DB that already
  has the F20 migrations (`0021`). Re-running is idempotent (`ON CONFLICT
  DO NOTHING`). `psql -c "SELECT value FROM app_setting WHERE key='reminder_schedule'"` returns `"7"`.
- **Pause if:** `pnpm db:generate` produces a destructive diff for any
  reason (no schema change in this task; if anything tries to drop a
  column, stop and ask).

---

### Task 4: Cron — read setting, loop windows

- **Files:**
  - `apps/web/src/lib/cron/renewal-reminder.ts` (edit)
- **What:** Replace `REMINDER_DAYS = 7` with a runtime read of
  `app_setting.reminder_schedule` via
  `appSettings.getAppSetting(db, "reminder_schedule")`. Parse via
  `parseReminderSchedule` (returns `[7]` on null/empty/parse error;
  log a warn on parse error). For each `N` in the parsed schedule, call
  `findRenewingExactlyInDays(db, { days: N })` and send the email with
  `windowLabel: \`Expiring in ${N} days\``. Track total emails and total
  rows for the `finishRun` summary:
  `"Sent X email(s) covering Y subscription(s) across windows: 30, 14, 7"`.
- **Acceptance:** Cron with seed `"7"` and one paid sub expiring in
  exactly 7 days sends exactly 1 email. With AppSetting set to `"30,14,7"`
  and three paid subs at 30/14/7 days each, sends 3 emails. With no
  matching subs, sends 0 emails, `finishRun` status = `succeeded`.

---

### Task 5: Email template — windowLabel prop

- **Files:**
  - `packages/email/src/templates/renewal-reminder.tsx` (edit)
  - `packages/email/src/templates.tsx` (edit — extend `sendRenewalReminderEmail` signature)
- **What:** Add `windowLabel: string` to `RenewalReminderEmailProps`. The
  `Layout` preview text + the `Heading` text use this label. Subject in
  `sendRenewalReminderEmail` becomes `\`${brandName} · ${windowLabel} — ${count} business${count === 1 ? "" : "es"}\``.
  `brandName` is already a `createTemplates` dep. Body copy under the
  heading updates to `"${count} subscription${count === 1 ? "" : "s"}
  ${windowLabel.toLowerCase()}."` (e.g. "4 subscriptions expiring in 30
  days.").
- **Acceptance:** `pnpm --filter @aira/email typecheck` clean. Existing
  console-driver render snapshot updates accordingly; no runtime errors
  on send.

---

### Task 6: Admin REST — dedicated reminder-schedule ops + route

- **Files:**
  - `apps/web/src/server/operations/app-settings-admin.ts` (edit — append new ops)
  - `apps/web/src/app/api/v1/admin/app-settings/reminder-schedule/route.ts` (new)
- **What:**
  - `getReminderScheduleOp` — GET, admin permission, returns
    `{ value: string, windows: number[] }`. Reads via
    `appSettings.getAppSetting(db, "reminder_schedule")`. Falls back to
    `"7"` / `[7]` on null. No throw.
  - `updateReminderScheduleOp` — PATCH, admin permission, input
    `ReminderScheduleUpdateInputSchema` ({ value: string }). Validates via
    `ReminderScheduleSchema.parse(input.value)` — Zod throws a `ZodError`
    which `defineOperation` maps to a 400 with the first field message.
    Reads the previous value, writes the new one via
    `appSettings.updateAppSetting`, then writes an `audit.log` row
    (`entity_type = "app_setting"`, `entity_id = "reminder_schedule"`,
    `action = "updated"`, `changes_json = { old, new }`).
  - Route handler exports `GET = getReminderScheduleOp.runFromRequest;
    PATCH = updateReminderScheduleOp.runFromRequest`.
- **Acceptance:** `pnpm --filter @aira/web typecheck` clean. `curl` GET
  with admin cookie returns `{ value: "7", windows: [7] }`. PATCH with
  body `{ "value": "30, 14, 7" }` returns 200; `psql` confirms the row
  was updated; an `audit_log` row exists with the old/new values. PATCH
  with body `{ "value": "0" }` returns 400 with code
  `validation.input` and field-aware message.
- **Pause if:** `audit.log` helper doesn't exist or has a different
  signature than `(db, { actor_user_id, entity_type, entity_id, action,
  changes_json })` — stop and ask before improvising.

---

### Task 7: Admin UI — settings hub + renewal-schedule page + form

- **Files:**
  - `apps/web/src/app/admin/settings/page.tsx` (new — hub index)
  - `apps/web/src/app/admin/settings/renewal-schedule/page.tsx` (new — RSC)
  - `apps/web/src/features/admin/components/renewal-schedule-form.tsx` (new — client form)
  - `apps/web/src/app/admin/_components/admin-sidebar.tsx` (edit — change Settings href from `/admin/settings/homepage` to `/admin/settings`)
- **What:**
  - **Hub** (`/admin/settings/page.tsx`): RSC, requires admin (layout does
    that). Renders a simple grid of two cards: "Homepage settings" → link
    `/admin/settings/homepage`, "Renewal schedule" → link
    `/admin/settings/renewal-schedule`. Each card has a Lucide icon,
    title, and one-line description. Uses the existing
    `AdminPageHeader`.
  - **Renewal page** (`/admin/settings/renewal-schedule/page.tsx`): RSC,
    `apiServerFetch(getReminderScheduleOp)`, renders
    `<RenewalScheduleForm initialValue={...} />` wrapped in
    `AdminPageHeader`.
  - **Form** (`renewal-schedule-form.tsx`): client component. Single text
    input ("e.g. 30, 14, 7"), helper paragraph explaining the windows,
    Save button. On input change, parse the current value through
    `ReminderScheduleSchema` and surface the first Zod error inline (or
    "Valid: 30, 14, 7" once it parses cleanly). On submit, call
    `apiClient.patch("/api/v1/admin/app-settings/reminder-schedule", {
    value })`. Server-side validation is the ultimate guard; client-side
    is for fast feedback.
  - **Sidebar:** change the `Settings` ADMIN_NAV entry's `href` from
    `/admin/settings/homepage` to `/admin/settings`. No icon change.
- **Acceptance:**
  - `/admin/settings` renders both cards; each card link navigates to the
    sub-page.
  - `/admin/settings/renewal-schedule` shows `"7"` (or whatever is
    persisted) in the input.
  - Typing `"30, 14, 7"` clears any error and enables Save.
  - Typing `"0"` surfaces inline "Each window must be between 1 and 365
    days" and disables Save.
  - Save success → toast + the page re-fetches the value via `router.refresh()`.
  - `pnpm --filter @aira/web typecheck` clean; `pnpm --filter @aira/web lint` clean.

---

## Open questions

None remain — all five resolved + reviewer added subject prefix + schedule
storage location decisions.
