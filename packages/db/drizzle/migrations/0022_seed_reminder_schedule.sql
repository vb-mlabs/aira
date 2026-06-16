-- F17 — seed default reminder_schedule = "7" so the admin opens
-- /admin/settings/renewal-schedule and immediately sees the current behavior
-- in the input. Cron's parseReminderSchedule still falls back to [7] on
-- null/empty/corrupt rows; this row makes the admin UI honest about state.
--
-- The id column has no SQL DEFAULT (Drizzle's $defaultFn is application-side
-- only), so generate one inline with gen_random_uuid()::text. Same pattern
-- as the F20 posts_expiry_days seed in migration 0021.
INSERT INTO "app_setting" ("id", "key", "value")
VALUES (gen_random_uuid()::text, 'reminder_schedule', '7')
ON CONFLICT ("key") DO NOTHING;
