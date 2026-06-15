# Implementation: Homepage CMS → brand layer; App tab → Renewals

**Started:** 2026-06-15 18:22 UTC
**Review:** [2026-06-15-homepage-cms-to-brand-layer](../../reviews/2026-06-15-homepage-cms-to-brand-layer.md)
**Branch:** feat/rest-api-migration
**Status:** complete
**Completed:** 2026-06-15 18:48 UTC

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add `brand.homepage` sub-object to packages/config/src/brand.ts
  - Files: packages/config/src/brand.ts (edit)
  - Commit: db2a524
  - Notes: ADD-only; no existing fields touched. typecheck + lint pass. ESLint no-brand-string-literal rule didn't trip (new fields are not brand.name literals).

- [x] **Task 2:** Add countActiveBusinessesOp + validator + route + contract test
  - Files: packages/validators/src/businesses.ts · server/operations/businesses.ts · app/api/v1/businesses/count/route.ts · apps/web/tests/businesses-count-route.test.ts
  - Commit: 3806e20
  - Notes: 3/3 contract tests pass (authed 200, unauthed 401, zero-count happy path).

- [x] **Task 3:** Rewrite home/page.tsx to use brand + countActiveBusinessesOp
  - Files: apps/web/src/app/(app)/home/page.tsx
  - Commit: 5a9bfa5
  - Notes: 21 added / 36 removed. No more direct service+db imports.

- [x] **Task 4:** Rename App tab → Renewals (route move + tabs strip)
  - Files: new admin/settings/renewals/page.tsx · edit _components/settings-tabs.tsx · delete admin/settings/app/page.tsx
  - Commit: 71911bc
  - Notes: Grep verified no remaining /admin/settings/app references after edits.

- [x] **Task 5:** Delete HomepageCmsForm component
  - Files: delete features/admin/components/homepage-cms-form.tsx
  - Commit: 57e29bc
  - Notes: —

- [x] **Task 6:** Delete generic admin app-settings ops + parent route + public ops file
  - Files: edit server/operations/app-settings-admin.ts · delete server/operations/app-settings.ts · delete app/api/v1/admin/app-settings/route.ts
  - Commit: 839389d
  - Notes: One fix on the fly — kept `import { z } from "zod"` because the reminder-schedule input still needs `z.object`. Reminder-schedule sub-route intact.

- [x] **Task 7:** Prune dead-code in @aira/services + @aira/validators
  - Files: services/app_settings/{queries,index}.ts · services/index.ts (comment) · validators/app_settings.ts
  - Commit: b5464c1
  - Notes: Per-review scope: only AppSettingsOutputSchema removed from validators (AppSettingUpdateInputSchema kept even though unused).

- [x] **Task 8:** Add purge migration 0026
  - Files: new migrations/0026_purge_homepage_settings.sql · edit meta/_journal.json · new meta/0026_snapshot.json (copy of 0025)
  - Commit: 0c6cd5c
  - Notes: pnpm db:migrate ran clean; post-apply SELECT shows only reminder_schedule remains. No checksum complaints.

- [x] **Task 9:** Final verification
  - Files: none (verification only)
  - Commit: —
  - Notes: typecheck ✓ (10/10 packages), tests ✓ (167/167 web). Manual scenario walk deferred to /mlabs-qa per skill anti-pattern (no e2e in code runs).
