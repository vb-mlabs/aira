-- Removes the homepage_* rows seeded in 0016. Their values now live in
-- packages/config/src/brand.ts (brand.homepage.*). Forks that customized
-- these values in DB should copy them into brand.ts before migrating.
--
-- Pattern follows 0022_seed_reminder_schedule.sql: data-only migration,
-- no schema change, _journal entry appended and a snapshot file copied
-- forward from 0025_snapshot.json (since the schema state is identical).

DELETE FROM "app_setting"
WHERE "key" IN (
  'homepage_about_title',
  'homepage_about_body',
  'homepage_stat_businesses',
  'homepage_stat_users'
);
