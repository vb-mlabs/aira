# Plan: F17 — Configurable renewal-reminder schedule

**Date:** 2026-06-14
**Slug:** renewal-schedule-config
**Status:** reviewed
**Author:** vb-mlabs

---

## Problem

Today the renewal-reminder cron fires once per day with a hardcoded 7-day
window. By the time a subscription shows up in the digest, the admin has at
most a week to chase it — often less, because they'll miss the first
heads-up and the email summary only repeats while the subscription is still
in the 7-day envelope.

The admin wants **earlier warning windows**. A schedule of e.g. `30, 14, 7`
gives them three discrete touchpoints per renewal — a first heads-up a month
out, a reminder two weeks out, and a final-call seven days out. They can
chase the right business at the right time without manually scanning the
"renewing in 7 days" filter every morning.

**Who benefits:** the AIRA admin operating the directory. No end-user
behavior changes.

**Success:** the admin opens `/admin/settings/renewal-schedule`, enters
`"30, 14, 7"`, saves. The next morning at 08:00 UTC, the cron sends up to
three emails — one per window — each labeled "Expiring in N days" and
listing only the subscriptions whose end_date is exactly N days from today.

---

## Scope

**In:**
- New `reminder_schedule` row in `app_setting` (text, comma-separated days list)
- Validators for the schedule string at boundaries (Zod, applied to both admin write and cron read)
- Service function `findRenewingExactlyInDays(db, { days })` — date-only diff, returns at most one row per subscription
- `renewal-reminder.ts` cron reads the setting (fallback `"7"`), parses, loops windows, sends one labeled email per non-empty window
- `RenewalReminderEmail` template gains a `windowLabel: string` prop ("Expiring in 30 days") that renders in the subject + heading
- New admin route `/admin/settings/renewal-schedule` with a form and inline validation
- Admin sidebar entry under Settings (sibling to existing Homepage settings)
- Operations: `getReminderScheduleOp` (admin GET) + `updateReminderScheduleOp` (admin PATCH)
- REST routes at `/api/v1/admin/app-settings/reminder-schedule`

**Out (deferred):**
- Per-business-owner emails — still blocked on the owner-identity decision (Phase 2)
- Per-window template variants — same template, just relabeled
- On-demand / "send now" trigger for admin
- Multi-recipient (e.g. cc-ing other admin staff) — single recipient = brand.supportEmail
- Audit log entries for schedule edits — `app_setting` writes already audit if/when AppSetting CRUD audit is wired more broadly
- Generic AppSetting admin hub — out of scope; we're adding one focused page

---

## Approach

### Storage + boundary validation

`reminder_schedule` is stored as a comma-separated text value in
`app_setting` (matches the existing `posts_expiry_days`, `homepage_*` keys —
no schema change). Examples:
- `""` or missing — fall back to `"7"` at read time (existing prod behavior)
- `"7"` — single window, identical to today
- `"30,14,7"` — three windows
- `"30, 14, 7"` — same, whitespace tolerated by the parser

A Zod schema in `packages/validators/src/app_settings.ts` (or a new
`reminder-schedule.ts` file co-located) parses the string into
`number[]`, applying these rules:
- Each entry is a positive integer, 1 ≤ n ≤ 365
- No duplicates
- Maximum 10 windows
- Empty array is rejected at the boundary; the cron's read-side coerces
  empty/missing to the default `[7]` so prod stays alive even if the row
  is somehow blank

The same schema is used at the admin PATCH boundary (rejecting bad input)
and as a safety net in the cron (re-parsing the persisted value).

### Service layer

New function `findRenewingExactlyInDays(db, { days })` in
`packages/services/src/business-subscriptions/queries.ts` returns the rows
whose `end_date::date - current_date = days`. Implementation in Drizzle SQL:

```ts
WHERE
  payment_status IN ('paid', 'overdue')
  AND (end_date::date - CURRENT_DATE) = ${days}
```

Returns the same `RenewingSoonRow` shape the existing
`findRenewingSoon` returns, so the email send call site doesn't need a new
mapper. `days_remaining` is set to the same `days` value for clarity in the
email body.

The existing `findRenewingSoon` stays — `/admin/businesses?renewing=N` still
uses it for the inclusive view ("everything expiring in the next N days").

### Cron logic (renewal-reminder.ts)

`runRenewalReminder` is refactored:
1. `claimWithAdvisoryLock` envelope unchanged.
2. Inside the lock: read `app_setting.reminder_schedule`, parse via Zod,
   fall back to `[7]` on miss/error (log a warning, not a failure).
3. For each window `N` in the schedule:
   - Call `findRenewingExactlyInDays(db, { days: N })`.
   - Filter `payment_status = 'paid'` (matching today's behavior).
   - If non-empty, send one email via `sendRenewalReminderEmail` with
     `windowLabel: \`Expiring in ${N} days\`` (subject + heading).
4. `finishRun` with summary "Sent N emails covering M total subscriptions"
   and `rows_affected = M`.

`JOB_NAME` stays `"renewal-reminder"`, schedule stays `"0 8 * * *"` (daily
08:00 UTC). No change in `registry.ts`.

### Email template

`packages/email/src/templates/renewal-reminder.tsx` gains a
`windowLabel: string` prop. The subject line becomes `${windowLabel} — ${N}
business${N === 1 ? "" : "es"}`. The heading reads the same label. The
business list rendering is unchanged. Default behavior when callers don't
pass a label is suppressed — every send site (cron, future tests) provides
one.

The `EmailTemplates.sendRenewalReminderEmail` signature in
`packages/email/src/templates.tsx` adds the required `windowLabel` field
alongside `businesses` and `adminUrl`.

### Admin UI

New route `apps/web/src/app/admin/settings/renewal-schedule/page.tsx` — RSC
that fetches the current value via `apiServerFetch(getReminderScheduleOp)`
and renders a client form. Form is a single text input ("e.g. 30, 14, 7"),
a helper note explaining "We'll email a digest N days before each renewal",
and a Save button. Submits to PATCH
`/api/v1/admin/app-settings/reminder-schedule` via `apiClient.patch`.

Inline validation: as the user types, the form parses the current value
through the same Zod schema and shows the friendly error inline ("Each
number must be between 1 and 365", "No duplicates", "Maximum 10 windows").

Admin sidebar gets a "Renewal schedule" entry under Settings (sibling
positioning to the existing Homepage entry — the current
ADMIN_NAV has a single "Settings" link pointing at `/admin/settings/homepage`;
we'll either swap it for a settings index that lists both sub-pages OR
duplicate the entry — TBD in review).

**Alternatives considered:**

- **B — One daily digest with sections per window** — rejected. Inbox is
  cleaner but the email template grows a per-window grouping prop and the
  cron's batch logic has to gather + group + render once. The wins are
  marginal (1 email vs ≤3) and the template signature change is wider than
  Approach A's single-string addition.
- **C — One email per (subscription × window match)** — rejected. Noisy
  with no benefit; one row per email defeats the digest purpose.

---

## Data model changes

- **No new tables / columns / migrations.** `app_setting.reminder_schedule`
  is a new row in an existing key/value table; it materializes on first
  admin save (or on the seeded default — TBD whether we seed `"7"` on
  migration or rely on the cron's fallback).
- **Option:** include a migration that does
  `INSERT INTO app_setting (id, key, value) VALUES (gen_random_uuid()::text,
  'reminder_schedule', '7') ON CONFLICT (key) DO NOTHING;` so the value is
  visible in the admin UI on first load without requiring a Save. **Locked
  decision deferred to /mlabs-review.**

---

## Files to touch

**New:**
- `packages/validators/src/reminder-schedule.ts` — Zod schema + parse helpers
- `packages/services/src/business-subscriptions/queries.ts` — append `findRenewingExactlyInDays`
- `apps/web/src/server/operations/app-settings-admin.ts` — add `getReminderScheduleOp` + `updateReminderScheduleOp` (operations file already exists)
- `apps/web/src/app/api/v1/admin/app-settings/reminder-schedule/route.ts` — GET + PATCH
- `apps/web/src/app/admin/settings/renewal-schedule/page.tsx` — RSC entry
- `apps/web/src/features/admin/components/renewal-schedule-form.tsx` — client form
- (optional) `packages/db/drizzle/migrations/<timestamp>_seed_reminder_schedule.sql` — seed default `"7"`

**Edit:**
- `apps/web/src/lib/cron/renewal-reminder.ts` — read setting, loop windows, send labeled emails
- `packages/email/src/templates/renewal-reminder.tsx` — add `windowLabel` prop
- `packages/email/src/templates.tsx` — extend `sendRenewalReminderEmail` signature with `windowLabel: string`
- `packages/validators/src/index.ts` — re-export the reminder-schedule schemas
- `packages/validators/package.json` — `./reminder-schedule` subpath export
- `apps/web/src/app/admin/_components/admin-sidebar.tsx` — adjust the Settings nav (resolve in review: single entry → sub-nav, or split into two siblings)

---

## Edge cases

- **Setting absent / blank:** cron reads `null` or empty string → fallback `[7]`, logs `warn` to surface in `cron_run` but doesn't fail.
- **Setting unparseable:** e.g. admin entered "abc" via direct SQL. Zod parse fails → cron logs `warn`, falls back to `[7]`, doesn't email noise. Admin UI never lets bad input through.
- **Schedule includes a window that nothing matches today:** the per-window query returns 0 rows → no email sent for that window. The summary in `cron_run` records `"0 emails for window 30"`.
- **Subscription's end_date is exactly midnight UTC of "today + N":** `::date - CURRENT_DATE = N` matches on the day-of, not the second-of. Tested via fixture date in /mlabs-code.
- **Daylight-savings / timezone drift:** all comparisons are in DB time (`CURRENT_DATE` server-side). Cron fires at 08:00 UTC consistently. Avoid JS `Date` math for the window match.
- **Duplicate run within the same day:** the existing cron is registered once and `claimWithAdvisoryLock` prevents parallel runs. A manual "Run now" from `/admin/cron` would send the same email twice; left in scope to handle when "send now" lands (not in this plan).
- **Schedule has 10 windows + every window non-empty:** at most 10 emails per day. Reasonable cap; Postmark batch limit not relevant at this volume.
- **Subject line length:** the new subject "Expiring in 30 days — 4 businesses" is short enough for Gmail's preview pane (≤78 chars).
- **Admin saves a schedule containing today's already-fired window:** that window's notifications for today were already sent (or not sent if cron hasn't fired yet). Tomorrow's run sees the new schedule. Acceptable.

---

## Acceptance criteria

- [ ] `reminder_schedule` row materializes in `app_setting` on first admin save (or via migration seed if locked in review)
- [ ] Admin can open `/admin/settings/renewal-schedule`, see the current value (or empty for default), enter `"30, 14, 7"`, save, and see a success toast
- [ ] Invalid input ("0", "0,7", "1,1,7", "abc", "30,14,7,3,2,1,…11 items") surfaces an inline Zod error and blocks Save
- [ ] Cron run with schedule `"30,14,7"` and three fixture subscriptions (one at exactly 30 days, one at 14, one at 7) sends three separate emails, each labeled correctly
- [ ] Cron run with schedule `"30,14,7"` and zero matching subscriptions sends zero emails, marks the run `succeeded`, summary says `0 emails sent`
- [ ] Cron run with missing/blank `app_setting.reminder_schedule` defaults to `[7]` and behaves identically to today
- [ ] `pnpm typecheck` passes; `pnpm lint` passes; the QA spec from `.mstack/qa/2026-06-14-0507/` (which doesn't touch renewal-reminder) still passes
- [ ] Subject of each email is `"Expiring in N days — M business(es)"`
- [ ] `cron_run.summary` reads e.g. `"Sent 2 emails covering 5 subscriptions across windows: 30, 7"`

---

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Seed `reminder_schedule = "7"` in a migration, or rely on the cron's fallback?** Seeding means the admin UI shows the current behavior immediately; not seeding means the row only appears after a Save. Lean migration-seed for clarity.
2. **Admin sidebar — single "Settings" entry expanding into sub-pages, or two sibling entries ("Homepage settings", "Renewal schedule")?** The current sidebar has only one Settings link; adding a second makes "Settings" feel like a category, not a destination. Mockup TBD if the answer is "sub-nav."
3. **Should the email subject include the brand name (`"AIRA · Expiring in 30 days — 4 businesses"`)?** Consistent with existing templates.
4. **Validation upper bound — 365 days or 180 days?** PRD `purge_days` caps at 180; subscription terms can be 12+ months. Lean 365 to match human-readable "a year out".
5. **Audit log — should schedule edits land in `audit_log` with the actor/old/new values?** Aligns with the audit-everything-admin convention; small effort, large value when something goes wrong in prod.
