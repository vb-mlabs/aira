# Review: Move homepage CMS to brand layer; rename App tab → Renewals

**Date:** 2026-06-15
**Slug:** 2026-06-15-homepage-cms-to-brand-layer
**Plan reviewed:** [2026-06-15-homepage-cms-to-brand-layer.md](../plans/2026-06-15-homepage-cms-to-brand-layer.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Plan is sound. Two pre-existing realities expanded the scope by user
decision during review: (1) the next migration number is `0026`, not the
`0018_*` the plan glanced at (that was the snapshot-index, not the
migration filename), and the hand-authored pure-SQL style established by
`0022_seed_reminder_schedule.sql` is the right pattern; (2) `home/page.tsx`
already bypasses the `/api/v1/*` service-layer rule by importing
`businessesService` + `db` directly — the user opted to fix it in this PR
by introducing `countActiveBusinessesOp`. Dead-code prune of the now-unused
`getAppSettings(db)` service + `AppSettingsOutputSchema` validator also
folded in. Ready for implementation as a 9-task sequence.

## Findings

### Blockers

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan said "0018" was the latest migration. Actually the
  latest is `0025_lucky_gorilla_man.sql` (snapshots run through
  `0025_snapshot.json`).
  **Decision:** Next migration is `0026_purge_homepage_settings.sql`,
  hand-authored pure SQL (matches `0022_seed_reminder_schedule.sql`
  pattern). Confirmed with user.

- **Concern:** `home/page.tsx:14-17,46-48` imports `businesses` from
  `@aira/services` and `db` from `@/lib/db` to call
  `businessesService.countActiveBusinesses(db)` directly. This bypasses
  CLAUDE.md's "no direct service imports from RSCs — go through `/api/v1/*`
  via `apiServerFetch`" rule. Pre-existing, but we're already editing this
  file.
  **Decision:** Fix it in this PR. New `countActiveBusinessesOp`
  (`permission: "user"`) + new route at
  `/api/v1/businesses/count/route.ts` + new `BusinessCountOutputSchema`
  in `@aira/validators/businesses`. `home/page.tsx` calls via
  `apiServerFetch` exactly like it does for `listBusinessesOp`. Confirmed
  with user.

- **Concern:** Plan deferred the dead-code prune of `getAppSettings(db)`
  service and `AppSettingsOutputSchema` validator. Both become genuinely
  dead after this PR (no remaining importers) and the same domain is
  already in the diff.
  **Decision:** Prune in this PR. Edit `packages/services/src/app_settings/{queries.ts,index.ts}`
  to drop `getAppSettings`. Edit `packages/services/src/index.ts` doc
  comment to drop the listed export. Edit
  `packages/validators/src/app_settings.ts` to drop
  `AppSettingsOutputSchema`. Keep `AppSettingSchema`, `getAppSetting`,
  `updateAppSetting` — still used by reminder-schedule. Confirmed with user.

- **Concern:** Plan didn't address Drizzle's `_journal.json` and snapshot
  file for a data-only migration. Looking at the existing
  `0022_seed_reminder_schedule.sql` pattern, both a journal entry AND a
  matching snapshot file exist for data-only migrations
  (`0022_snapshot.json` mirrors `0021_snapshot.json`).
  **Decision:** Task 8 explicitly (a) writes `0026_purge_homepage_settings.sql`,
  (b) appends a `_journal.json` entry for `idx: 26` with the same
  `version, when, tag, breakpoints` shape as siblings, (c) copies
  `0025_snapshot.json` → `0026_snapshot.json` verbatim (no schema change).
  Pause-if triggers escalation if Drizzle's CLI complains after the
  manual journal write.

- **Concern:** The ESLint rule `no-brand-string-literal` (referenced in
  `tooling/eslint-config/src/rules/no-brand-string-literal.mjs` per
  brand.ts's own comment) scans the codebase for the literal value of
  `brand.name`. Plan correctly noted that adding `brand.homepage.*` fields
  doesn't trip it because they aren't the brand-name literal.
  **Decision:** Confirm at typecheck time. No code change needed.

### Suggestions (taken or deferred)

- **Add a regression spec covering the rendered home page** — Deferred to
  `/mlabs-qa`. This PR has no new gate semantics worth spec-locking; the
  visual smoke test of `/home` after the change is what matters and that
  fits QA's mandate, not /mlabs-code's.
- **Audit `KnownAuditTargetType` rendering for orphan homepage_* rows** —
  Deferred. Plan documented this; matches the prior policy of accepting
  audit-log churn after structural moves.
- **Test the new `countActiveBusinessesOp`** — Taken. Task 2's
  Acceptance includes adding a contract test (the existing
  `apps/web/tests/conditional-get-notifications.test.ts` pattern: hit the
  route, assert shape + status) since this is a new public endpoint.

## Decisions locked

Net new decisions made during review:

- **Migration:** `0026_purge_homepage_settings.sql`, hand-authored pure
  SQL. Journal + snapshot updated explicitly (snapshot copy of `0025`).
- **`countActiveBusinessesOp` is added** with a new route at
  `/api/v1/businesses/count`. Permission `"user"` (same as
  `listBusinessesOp`).
- **`AppSettingsOutputSchema` and `getAppSettings(db)` are pruned**
  alongside the homepage CMS removal — same PR, atomic cleanup.
- **`AppSettingSchema`, `getAppSetting`, `updateAppSetting` stay** — still
  reachable through the reminder-schedule path.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (one commit). The codebase stays in a working state between tasks.

### Task 1: Add `brand.homepage` sub-object to packages/config/src/brand.ts

- **Files:** `packages/config/src/brand.ts` (edit)
- **What:** Add a new `homepage: { aboutTitle: string; aboutBody: string;
  communityMembers: string }` sub-object inside the `brand` const. Values
  come *verbatim* from the strings already in
  `packages/db/drizzle/migrations/0016_smiling_nehzno.sql:57-60`:
  - `aboutTitle`: `"A directory of Atlanta's Indian community, curated with care"`
  - `aboutBody`: (the longer body string starting "Every listing is reviewed by a person before it appears…")
  - `communityMembers`: `"—"` (em-dash, matching today's "auto"
    fallback rendering).
  Do not change any pre-existing brand field. Do not change the literal
  `brand.name`.
- **Acceptance:**
  - `pnpm --filter @aira/config typecheck` passes.
  - `import { brand } from "@aira/config"` exposes
    `brand.homepage.aboutTitle`, `brand.homepage.aboutBody`,
    `brand.homepage.communityMembers` as strings.
  - The ESLint `no-brand-string-literal` rule still passes the workspace
    (no warning attributable to the new fields).
- **Pause if:** brand.ts is the rebrand layer — pause if any pre-existing
  field needs to change (e.g. `brand.name`, `brand.tagline`,
  `brand.emailColors`). This task is approved to ADD the `homepage`
  sub-object only.

### Task 2: Add countActiveBusinessesOp + validator + route

- **Files:**
  - `packages/validators/src/businesses.ts` (edit — add
    `BusinessCountOutputSchema` = `z.object({ count: z.number().int().nonnegative() })`
    and its inferred type alias)
  - `apps/web/src/server/operations/businesses.ts` (edit — add
    `countActiveBusinessesOp` with `permission: "user"`, input
    `z.object({}).strict()`, output `BusinessCountOutputSchema`, handler
    calls `businessesService.countActiveBusinesses(db)` and returns
    `{ count }`)
  - `apps/web/src/app/api/v1/businesses/count/route.ts` (new — exports
    `const GET = countActiveBusinessesOp.runFromRequest` and
    `export const runtime = "nodejs"`; mirrors
    `apps/web/src/app/api/v1/businesses/route.ts`)
  - Add a small contract test under `apps/web/tests/` exercising the new
    route (asserts 200 + `{ count: number }` shape for an authed
    fixture, and 401 for unauthed). Follow the existing
    `apps/web/tests/conditional-get-notifications.test.ts` style if it
    fits.
- **What:** Replaces the direct service import in `home/page.tsx`
  (which the next task will rewrite) with a properly-gated REST op. Same
  pattern as `listBusinessesOp` — handler imports
  `businesses as businessesService` from `@aira/services` (inside the op
  file is fine; the rule forbids RSC imports of `@aira/services`, not
  op-file imports).
- **Acceptance:**
  - GET `/api/v1/businesses/count` returns 200 with `{ count: number }`
    for a signed-in user.
  - GET `/api/v1/businesses/count` returns 401 for an unauthed request.
  - `pnpm --filter @aira/web typecheck` passes.
  - `pnpm --filter @aira/web test` passes including the new contract test.

### Task 3: Rewrite home/page.tsx to use brand + countActiveBusinessesOp

- **Files:** `apps/web/src/app/(app)/home/page.tsx` (edit)
- **What:** Drop these imports:
  - `import { getAppSettingsPublicOp } from "@/server/operations/app-settings"`
  - `import { businesses as businessesService } from "@aira/services"`
  - `import { db } from "@/lib/db"`
  Add:
  - `import { countActiveBusinessesOp } from "@/server/operations/businesses"`
  Replace the `Promise.all([listBusinessesOp, getAppSettingsPublicOp])`
  with `Promise.all([listBusinessesOp, countActiveBusinessesOp])`. Read
  `aboutTitle`, `aboutBody` from `brand.homepage` directly (no `??`
  fallback needed — they're typed strings). Stat-card logic collapses:
  - `bizCount` ← `(await countActiveBusinessesOp call).data?.count ?? 0`
  - `bizCountDisplay` ← `bizCount > 0 ? String(bizCount) : "—"`
  - `userCountDisplay` ← `brand.homepage.communityMembers`
  No more `bizCountSetting`/`userCountSetting` branches.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.
  - `home/page.tsx` no longer imports `@aira/services` or `@/lib/db`.
  - Visiting `/home` signed in: renders the About title/body from
    `brand.homepage`, Businesses card shows live count (or "—" when
    empty), Community card shows `brand.homepage.communityMembers`
    ("—" by default).
  - `getAppSettingsPublicOp` and `businessesService` and `db` are no
    longer referenced anywhere in `apps/web/src/app/(app)/home/`.

### Task 4: Rename App tab → Renewals (route move + tabs strip)

- **Files:**
  - new: `apps/web/src/app/admin/settings/renewals/page.tsx`
  - edit: `apps/web/src/app/admin/_components/settings-tabs.tsx`
  - delete: `apps/web/src/app/admin/settings/app/page.tsx` (and its
    parent folder — Next.js's `app/settings/app/` directory)
- **What:** The new `renewals/page.tsx` is the old App page minus the
  Homepage section: imports `getReminderScheduleOp` only, calls
  `apiServerFetch(getReminderScheduleOp, { input: {} })`, renders the
  `RenewalScheduleForm` inside one `<section>` with the existing copy
  ("Renewal schedule", "Days before renewal that the cron emails the
  admin a digest of expiring business subscriptions."). No Homepage
  section, no `getAppSettingsOp` fetch, no `HomepageCmsForm` import. Page
  metadata title becomes `"Admin · Renewals"`. The settings-tabs entry
  for "App" / `/admin/settings/app` becomes "Renewals" /
  `/admin/settings/renewals`. Delete the old `app/page.tsx` and the now-
  empty parent folder.
- **Acceptance:**
  - As super_admin, `/admin/settings/renewals` renders the Renewal
    schedule form with no Homepage section.
  - Tabs strip shows 5 tabs ending in "Renewals" (not "App"). Active tab
    is "Renewals" when on `/admin/settings/renewals`.
  - `/admin/settings/app` returns Next.js 404 (super_admin or plain
    admin — for plain admin the parent layout's `requireSuperAdmin()`
    still wins first).
  - `/admin/settings` redirect from the earlier work still lands on
    `/admin/settings/categories` (the bare path's `redirect()` call is
    untouched).
- **Pause if:** any reference to `/admin/settings/app` exists outside the
  files in this task's edit/delete set (sanity-check with
  `grep -rn "/admin/settings/app" apps/web/src` — should return nothing
  after edits).

### Task 5: Delete HomepageCmsForm component

- **Files:** delete
  `apps/web/src/features/admin/components/homepage-cms-form.tsx`
- **What:** Confirm the file has no remaining importers (Task 4 removed
  the last one — `/admin/settings/app/page.tsx`). Delete it.
- **Acceptance:**
  - File no longer exists.
  - `grep -rn "HomepageCmsForm" apps/web/src` returns nothing.
  - `pnpm --filter @aira/web typecheck` passes.

### Task 6: Delete generic admin app-settings ops + parent route + public ops file

- **Files:**
  - edit: `apps/web/src/server/operations/app-settings-admin.ts` (remove
    `getAppSettingsOp` and `updateAppSettingOp` and the imports of
    `AppSettingUpdateInputSchema` and `AppSettingsOutputSchema` that
    only they used; keep the reminder-schedule pair and its imports)
  - delete: `apps/web/src/server/operations/app-settings.ts` (entire
    file — `getAppSettingsPublicOp` was its only export)
  - delete: `apps/web/src/app/api/v1/admin/app-settings/route.ts` (the
    parent route file with `GET` + `PATCH` handlers)
- **What:** The plumbing behind HomepageCmsForm and `getAppSettingsPublicOp`
  is removed. The nested
  `/api/v1/admin/app-settings/reminder-schedule/route.ts` is untouched
  (Next.js handles each `route.ts` independently).
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.
  - `app-settings-admin.ts` only exports `getReminderScheduleOp` and
    `updateReminderScheduleOp`.
  - `apps/web/src/server/operations/app-settings.ts` does not exist.
  - `apps/web/src/app/api/v1/admin/app-settings/route.ts` does not exist.
  - GET `/api/v1/admin/app-settings/reminder-schedule` still 200s for
    super_admin (smoke check; existing behavior).
  - GET `/api/v1/admin/app-settings` (the bare parent path) returns 404.

### Task 7: Prune dead-code in @aira/services + @aira/validators

- **Files:**
  - edit: `packages/services/src/app_settings/queries.ts` (remove
    `getAppSettings(db)` function)
  - edit: `packages/services/src/app_settings/index.ts` (drop the
    `getAppSettings` re-export; keep `getAppSetting` and
    `updateAppSetting`)
  - edit: `packages/services/src/index.ts` (update the doc comment block
    that lists `@aira/services/app_settings` exports — drop
    `getAppSettings` from the list)
  - edit: `packages/validators/src/app_settings.ts` (remove
    `AppSettingsOutputSchema` and its inferred type alias; keep
    `AppSettingSchema`, `AppSettingUpdateInputSchema`)
- **What:** Dead-code is now removed from the `@aira/services` and
  `@aira/validators` packages. `AppSettingSchema` stays because
  `getAppSetting`/`updateAppSetting` return `AppSetting`. The
  reminder-schedule path doesn't need `AppSettingsOutputSchema` (it has
  its own `ReminderScheduleOutputSchema`).
- **Acceptance:**
  - `pnpm typecheck` passes workspace-wide.
  - `grep -rn "getAppSettings\b\|AppSettingsOutputSchema" packages/services packages/validators apps/web/src`
    returns nothing — confirms nothing else depends on the removed
    symbols.

### Task 8: Add purge migration 0026

- **Files:**
  - new: `packages/db/drizzle/migrations/0026_purge_homepage_settings.sql`
  - edit: `packages/db/drizzle/migrations/meta/_journal.json` (append
    entry: `{"idx":26,"version":"7","when":<unix-ms>,"tag":"0026_purge_homepage_settings","breakpoints":true}`)
  - new: `packages/db/drizzle/migrations/meta/0026_snapshot.json` (copy
    `0025_snapshot.json` verbatim — no schema change, so the snapshot
    stays identical to the previous step)
- **What:** Data-only migration removing the four `homepage_%` keys.
  Header comment notes that values now live in
  `packages/config/src/brand.ts (brand.homepage)`; forks that
  customized DB values should copy them into `brand.ts` before
  migrating. SQL body:
  ```sql
  -- Removes the homepage_* rows seeded in 0016. Their values now live in
  -- packages/config/src/brand.ts (brand.homepage.*). Forks that customized
  -- these values in DB should copy them into brand.ts before migrating.
  DELETE FROM "app_setting"
  WHERE "key" IN (
    'homepage_about_title',
    'homepage_about_body',
    'homepage_stat_businesses',
    'homepage_stat_users'
  );
  ```
  Apply with `pnpm db:migrate`. Verify:
  ```sql
  SELECT key FROM app_setting ORDER BY key;
  -- expected: only 'reminder_schedule' (and any other unrelated keys)
  ```
- **Acceptance:**
  - `pnpm db:migrate` runs to completion.
  - `app_setting` table contains zero rows where key matches `homepage_%`.
  - `reminder_schedule` row still present.
  - No new migration files outside the three listed above.
- **Pause if:** drizzle-kit complains about the manual journal write
  (`pnpm db:generate` afterward might re-emit the snapshot or warn about
  a checksum mismatch — surface, don't silence). If the existing
  hand-authored pattern from `0022_seed_reminder_schedule.sql` doesn't
  replay cleanly here, escalate.

### Task 9: Final verification

- **Files:** none (verification only)
- **What:** Run `pnpm typecheck`, `pnpm lint`, `pnpm test` workspace-wide.
  Manual scenario check:
  - As signed-in user, visit `/home`: About title + body show
    `brand.homepage` strings; Businesses stat card shows live count;
    Community Members stat card shows `"—"`.
  - As super_admin, visit `/admin/settings/categories`: still loads;
    tabs strip ends in "Renewals" (not "App"); clicking Renewals →
    `/admin/settings/renewals` loads the Renewal schedule form alone.
  - As super_admin, GET `/admin/settings/app`: Next.js 404.
  - As super_admin, GET `/api/v1/admin/app-settings`: 404
    (route file deleted).
  - As super_admin, GET `/api/v1/admin/app-settings/reminder-schedule`:
    200 with the schedule body.
  - As any signed-in user, GET `/api/v1/businesses/count`: 200 with
    `{ count: number }`.
- **Acceptance:** Every checkbox above ticks. Any failure becomes its
  own follow-up task (don't ship partial).

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- **Drizzle journal/snapshot handling for hand-authored data migrations.**
  Task 8's Pause-if covers this — `0022_seed_reminder_schedule.sql`'s
  precedent says the pattern works, but if the actual replay flags a
  checksum issue, surface rather than work around.
- **Migration idempotency under re-apply.** `pnpm db:migrate` uses
  `pg_advisory_xact_lock` so concurrent applies are safe; the DELETE is
  idempotent on its own (re-running deletes zero rows the second time).
  No expected issue, but flagged for awareness.
- **`brand.homepage.communityMembers` default.** Locking the default to
  `"—"` (em-dash) preserves current rendering for any fork that didn't
  override the stat. Reviewer can change later if a fork wants a real
  count.
