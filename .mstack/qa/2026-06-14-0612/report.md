# QA report — 2026-06-14 06:12

**Focus:** F17 configurable renewal schedule — admin opens settings, edits
the schedule, audit row + DB row written, server validation rejects bad
input, cron Run-now loops the configured windows and reports in
`cron_run.summary`.

**Env:** `http://localhost:5000` (Replit dev server, Next 16 dev mode)
**Status:** clean — 8/8 pass, no issues required fixes
**Tester:** /mlabs-qa

## Persona

| Role | Email | Notes |
|---|---|---|
| Admin | f17-admin@mlabs.test | role=admin |

## Scenarios run

| # | Scenario | Result | Screenshot |
|---|---|---|---|
| S1 | Sidebar Settings entry points at the hub | ✓ pass | `assets/s1-sidebar-settings.png` |
| S2 | Hub renders both cards + Renewal-schedule link navigates | ✓ pass | `assets/s2-hub.png` |
| S3 | Renewal schedule page prefills "7" with "fires once" preview | ✓ pass | `assets/s3-prefilled.png` |
| S4 | Inline validation rejects 0, dupes, "abc", 366, 11 windows | ✓ pass | `assets/s4a-zero.png`, `s4b-dupes.png`, `s4c-too-many.png` |
| S5 | Save "30, 14, 7" succeeds + preview updates to "fires 3 times" | ✓ pass | `assets/s5a-typed.png`, `s5b-saved.png` |
| S6 | DB row updated AND audit_log entry written with old/new | ✓ pass | (DB-level) |
| S7 | Server rejects PATCH `{ value: "0" }` with 400 `validation.input` | ✓ pass | (API-level) |
| S8 | Cron Run-now loops the configured window and writes "Sent 1 email" to `cron_run.summary` | ✓ pass | `assets/s8-cron-run.png` |

**All 8 scenarios pass.** F17 is end-to-end clean — no fixes required.

## Issues

None.

## Notable — selector friction encountered + fixed in the spec

These didn't surface bugs in the feature; they were spec-side iterations
worth recording so future QA specs avoid the same friction:

1. **`getByRole("alert")` and `getByRole("status")` match Next.js's hidden
   route announcer.** Same gotcha as the F20 run. Solution: scope to inside
   the form via `page.locator("form").locator('[role="alert"]')`. Added
   to the F20-era learning.

2. **`audit_log` column names are `metadata` (jsonb) + `at` (timestamp).**
   Initial spec used `meta` + `created_at` which matched the JSON shape but
   not the SQL. Confirmed in `packages/db/src/schema/audit_log.ts`.

3. **Postgres jsonb serialises with spaces after colons** —
   `"key": "value"` not `"key":"value"`. Assert against the JSON-parsed
   object, not the raw text.

4. **`business_subscription.amount_cents` is NOT NULL** — fixture INSERT in
   the S8 setup originally omitted it; the multi-statement SQL silently
   failed at that row, so the cron found 0 matching subscriptions. Fixed
   by setting `amount_cents = 0` explicitly.

5. **First Next dev render of `/admin/settings/renewal-schedule` is slow
   enough to make `click → expect(URL)` race.** Solution: wrap in
   `Promise.all([waitForURL, click])` with a 20s timeout. Same dev-mode
   JIT pattern surfaced in F20.

## Network sanity

- `PATCH /api/v1/admin/app-settings/reminder-schedule { value: "0" }` → `400 validation.input`
- `PATCH /api/v1/admin/app-settings/reminder-schedule { value: "30, 14, 7" }` → `200` (S5 path)
- `POST /api/v1/admin/cron/<job>/run` for renewal-reminder triggers a run that completes within ~3s, status=succeeded, rows_affected=1, summary contains "Sent 1 email" and "30".

## Summary

**0 issues. 8/8 pass.** F17 is ready to ship.

## Recommended next step

Ship. Mark F17 ✅ in `roadmap.md` (the configurable-schedule remainder is
now closed; per-business-owner emails remain Phase 2 — owner-identity
blocker still pending). Push `feat/rest-api-migration` when ready.
