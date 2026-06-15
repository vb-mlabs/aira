# Plan: Move homepage CMS to brand layer; rename App tab → Renewals

**Date:** 2026-06-15
**Slug:** 2026-06-15-homepage-cms-to-brand-layer
**Status:** implemented
**Author:** framer@millionlabs.co.uk

---

## Problem

The Settings hub we just shipped (commits `78f5d64..672e168`) gave the App
tab two responsibilities: the Homepage CMS (4 string knobs that drive the
About section + two stat cards on `/home`) and the Renewal schedule (cron
windows). The Homepage CMS knobs only feed one screen and are essentially
brand copy — exactly the thing the existing rebrand layer in
`packages/config/src/brand.ts` is for. Keeping them as runtime-editable
`app_setting` rows costs us:

- a public op (`getAppSettingsPublicOp`) hit on every `/home` render,
- a generic admin GET + PATCH (`getAppSettingsOp` /  `updateAppSettingOp`,
  HomepageCmsForm's only caller),
- a 90-line client form (`HomepageCmsForm`),
- 4 seed rows in migration `0016_smiling_nehzno.sql`,
- a tab whose name ("App") becomes misleading the moment Homepage CMS leaves,
- a runtime fetch on what is, for an MVP, compile-time-fixed brand copy.

**Beneficiaries:** template forkers (rebrand in one file the way the rest of
the template intends), platform operators (one form per tab in Settings;
no more half-empty App tab), reviewers (smaller surface area, less for
`/mlabs-debug` to load context on).

## Scope

**In:**
- Add `brand.homepage = { aboutTitle, aboutBody, communityMembers }` to
  `packages/config/src/brand.ts`. Seed values come from migration `0016`'s
  Atlanta copy.
- `apps/web/src/app/(app)/home/page.tsx`: drop the
  `apiServerFetch(getAppSettingsPublicOp, …)` call; read from
  `brand.homepage` directly. Businesses count keeps its live
  `countActiveBusinesses` path (always "auto" semantics — no more knob).
- Delete `apps/web/src/server/operations/app-settings.ts` (the public ops
  file — `getAppSettingsPublicOp` was its only export).
- Remove `getAppSettingsOp` and `updateAppSettingOp` from
  `apps/web/src/server/operations/app-settings-admin.ts`. Reminder-schedule
  pair (`getReminderScheduleOp`, `updateReminderScheduleOp`) stays — it's a
  legitimate runtime knob with dedicated Zod validation.
- Delete `apps/web/src/app/api/v1/admin/app-settings/route.ts` (the parent
  route file). The nested `/api/v1/admin/app-settings/reminder-schedule/`
  route file stays untouched — Next.js handles each `route.ts` independently
  so the sub-route survives the parent's deletion.
- Delete `apps/web/src/features/admin/components/homepage-cms-form.tsx`.
- Rename the App tab to "Renewals" in
  `apps/web/src/app/admin/_components/settings-tabs.tsx`.
- Move `apps/web/src/app/admin/settings/app/page.tsx` →
  `apps/web/src/app/admin/settings/renewals/page.tsx`. Body simplifies to
  just the RenewalScheduleForm section (no Homepage section, no parallel
  apiServerFetch for HomepageCmsForm data).
- New migration that deletes the four `homepage_%` keys from `app_setting`
  by key — leaves the table, leaves `reminder_schedule`, leaves the city
  + categories seed rows that share migration `0016`.
- Update the Setup hub layout's nav order if Renewals lands at a different
  slot (it doesn't — it's the same 5th tab, just renamed).

**Out (deferred):**
- No changes to the `app_setting` *table* or its Drizzle schema — still in
  use by reminder_schedule.
- No changes to `appSettings.getAppSettings(db)` in
  `packages/services/src/app-settings/*` (lists all rows). Becomes unused
  after this; cleanup is a separate small commit later if anyone cares.
- No changes to `AppSettingSchema` / `AppSettingsOutputSchema` in
  `packages/validators/src/app_settings.ts`. They're tiny and might be
  imported by tests or future ops; safe to leave.
- No changes to the audit-meta `KnownAuditTargetType` (still includes
  `"app_setting"` for reminder-schedule writes).
- No changes to the brand layer's ESLint rule
  (`no-brand-string-literal`) — its allowlist already covers `src/config/`
  and the new `brand.homepage` fields aren't `brand.name` literals.
- No re-introduction of the "auto vs literal" community-members live count.
  We hardcode the value in brand instead; a future feature can add a real
  user count if it ever matters.
- No mobile changes — mobile has no `/home` route equivalent today.

## Approach

This is structurally a deletion + a small lift into the rebrand layer.

**Lift.** Add a `homepage` sub-object to `brand.ts` with three string fields.
Two come straight from migration `0016`'s seed values (`aboutTitle`,
`aboutBody`); the third (`communityMembers`) becomes the single source of
truth for the stat card's value. Forks rebrand by editing one file (the
template's promise).

**Drop the runtime fetch.** `home/page.tsx` currently does
`Promise.all([listBusinessesOp, getAppSettingsPublicOp])`. After this, it's
just `listBusinessesOp` and a synchronous read of `brand.homepage.*`. One
less RSC fetch, one less op definition, smaller cold-render cost.

**Shrink the admin surface.** `getAppSettingsOp` + `updateAppSettingOp` were
generic, untyped wrappers around the app_setting table. Their only caller
was HomepageCmsForm, which is going away. Reminder-schedule has its own
strict-Zod pair that stays as-is. Delete the generic pair and the parent
route file; the nested sub-route survives.

**Rename, don't redirect.** App tab → "Renewals" with route move to
`/admin/settings/renewals/`. We just shipped a "break links, no redirects"
policy for the original move (`/admin/categories` → `/admin/settings/categories`
landed as a clean break in commit `37d2643`). Keep the same policy
consistent: `/admin/settings/app` returns 404; the Settings tabs strip
points at `/admin/settings/renewals`. Anything else would re-introduce a
behavior we already explicitly rejected one week ago.

**Migration semantics.** A new sequentially-numbered migration runs
`DELETE FROM app_setting WHERE key IN ('homepage_about_title',
'homepage_about_body', 'homepage_stat_businesses',
'homepage_stat_users')`. Idempotent (DELETE on missing rows is a no-op).
Forks that hand-edited those values in their DB lose the edits — flagged
in the migration's header comment so anyone forking sees it before
`pnpm db:migrate`.

**Alternatives considered:**

- *Keep the App tab name, just remove Homepage section* — rejected. "App" is
  ambiguous when the body is one cron-window form. "Renewals" reads
  immediately.
- *Promote Renewals to its own top-level row (drop Settings tab #5
  entirely)* — rejected. Renewals belongs with the platform-shape config
  thematically; pulling it out of the super_admin Setup gate would require
  rethinking the page-level `requireSuperAdmin()` we just shipped on
  `/admin/settings/layout.tsx`. Not worth it for one form's location.
- *Wire community members to a live count* — rejected per scope. Adding a
  `countUsers()` service + service test is a feature, not a cleanup; brand
  hardcode is the cleanup answer.
- *Leave the generic admin ops in place for future use* — rejected.
  YAGNI: when the next app_setting key arrives it can get its own typed pair
  the way reminder-schedule did. Generic wrappers are exactly the kind of
  thing that grows the API surface invisibly.

## Data model changes

One new migration in `packages/db/drizzle/migrations/`:

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

No schema changes. The `app_setting` table itself stays — reminder_schedule
still uses it. Auto-generated by `pnpm db:generate` after the schema is
left untouched and the SQL is added by hand into the generated file (or
the migration is hand-authored — both legitimate per existing patterns).
The migration runner already advisory-locks
(`pg_advisory_xact_lock` per ADR 0008) so this is safe under parallel
deploys.

## Files to touch

**New:**
- `packages/db/drizzle/migrations/<next>_<adj>_<noun>.sql` — DELETE statement
  above. Filename follows the existing Drizzle convention; reviewer picks
  the next sequential number.
- `apps/web/src/app/admin/settings/renewals/page.tsx` — moved + simplified
  body from the old `app/page.tsx`. Only Renewal schedule section.

**Edit:**
- `packages/config/src/brand.ts` — add `homepage: { aboutTitle, aboutBody,
  communityMembers }` sub-object.
- `apps/web/src/app/(app)/home/page.tsx` — drop
  `getAppSettingsPublicOp` import + fetch; read `brand.homepage.*` directly;
  collapse the `bizCountSetting`/`userCountSetting` logic into a single
  always-live `countActiveBusinesses` call for the businesses card and a
  literal `brand.homepage.communityMembers` for the members card.
- `apps/web/src/server/operations/app-settings-admin.ts` — remove the two
  generic ops + their imports of `AppSettingUpdateInputSchema` and
  `AppSettingsOutputSchema`. Reminder-schedule pair stays.
- `apps/web/src/app/admin/_components/settings-tabs.tsx` — rename the 5th
  TAB entry: label "App" → "Renewals", href `/admin/settings/app` →
  `/admin/settings/renewals`.

**Delete:**
- `apps/web/src/server/operations/app-settings.ts` (whole file —
  `getAppSettingsPublicOp` was its only export).
- `apps/web/src/app/api/v1/admin/app-settings/route.ts`. The
  `reminder-schedule/route.ts` sibling stays.
- `apps/web/src/features/admin/components/homepage-cms-form.tsx`.
- `apps/web/src/app/admin/settings/app/page.tsx` and its parent folder.

## Edge cases

- **`(app)/home/page.tsx` is the only `getAppSettingsPublicOp` caller.**
  Confirmed by grep — no mobile path imports it; no other RSC does. Safe
  to delete the public op + its file in one commit.
- **Audit log already has rows pointing at homepage_* keys.** From earlier
  CMS edits via the now-deleted form. The audit rows render via
  `features/admin/audit/render-detail.tsx` which switches on the `kind`
  field — keys it doesn't know render as raw JSON. Old entries become
  faintly less readable but stay queryable. Acceptable.
- **Migration is non-reversible without a down migration.** We don't ship
  downs; the seed rows are gone after `pnpm db:migrate`. If a fork wants
  them back, they re-INSERT manually or, better, switch back to seeded
  brand values. Worth a header comment in the migration file.
- **Forks that customized the values in DB lose the edits.** Documented in
  the migration's header. If a fork has any production DB with custom
  values, they should `SELECT key, value FROM app_setting WHERE key LIKE
  'homepage_%'` first and copy into their `brand.ts`. Template's MVP
  posture: this is a fork-time refactor, not a prod-data migration.
- **`/admin/settings/app` 404 after the move.** Consistent with how we
  handled `/admin/categories` → `/admin/settings/categories` in the
  original Settings hub move — clean break, no redirects. Bookmarks
  break; sidebar already points at the renamed tab.
- **`bizCountSetting === "auto"` logic disappears.** Today, an admin could
  in theory PATCH `homepage_stat_businesses` to `"50000"` and the page would
  show "50000" instead of the live count. After this, businesses always
  reads from the live count. No DB row, no override knob. The visible value
  changes for any fork that had overridden it — confirm "no one's overridden
  it in this template" by reading the migration seed (`'auto'`) and noting
  forks that override are explicitly rebranding.
- **Type drift via `AppSettingsOutputSchema`.** Output schema of the
  removed `getAppSettingsOp` is no longer used by any op, but stays in
  `packages/validators/src/app_settings.ts`. Dead but harmless; reviewer
  can prune in a follow-up.
- **`appSettings.getAppSettings(db)` in services becomes unused.** Same as
  above — dead-code follow-up, not in scope here.

## Acceptance criteria

- [ ] `packages/config/src/brand.ts` exports `brand.homepage` with
      `aboutTitle`, `aboutBody`, `communityMembers` (all strings,
      copy-paste-fidelity from migration `0016` for the two About fields).
- [ ] `apps/web/src/app/(app)/home/page.tsx` no longer imports or calls
      `getAppSettingsPublicOp`; reads from `brand.homepage`. Single
      `apiServerFetch` in the page (the existing `listBusinessesOp`
      call, retained).
- [ ] `/home` (signed in) renders with the same About + stat cards
      layout; About title + body show `brand.homepage.aboutTitle` /
      `aboutBody`; Businesses card shows live count; Community card shows
      `brand.homepage.communityMembers`.
- [ ] `apps/web/src/server/operations/app-settings.ts` deleted.
- [ ] `apps/web/src/server/operations/app-settings-admin.ts` exports only
      `getReminderScheduleOp` and `updateReminderScheduleOp` (the two
      generic ops removed).
- [ ] `apps/web/src/app/api/v1/admin/app-settings/route.ts` deleted;
      `/api/v1/admin/app-settings/reminder-schedule/route.ts` still 200s
      for super_admin.
- [ ] `apps/web/src/features/admin/components/homepage-cms-form.tsx`
      deleted; no remaining importers (grep `HomepageCmsForm` returns
      zero matches outside `.mstack/`).
- [ ] Settings tabs strip renders 5 tabs ending in "Renewals" (not "App").
      Active tab on `/admin/settings/renewals` is "Renewals".
- [ ] `/admin/settings/app` returns Next.js 404; old route file is gone.
- [ ] `/admin/settings/renewals` renders the RenewalScheduleForm; super_admin
      gate from the parent layout still applies.
- [ ] New migration file added in `packages/db/drizzle/migrations/` with
      the DELETE statement; `pnpm db:migrate` applies cleanly; the four
      `homepage_%` rows are gone from `app_setting`; reminder_schedule
      row is untouched.
- [ ] `pnpm typecheck` passes workspace-wide.
- [ ] `pnpm lint` shows no new errors attributable to this change
      (pre-existing errors in untouched files are fine).
- [ ] `pnpm test` passes (api + web).
- [ ] No new `"use server"` directives; no new raw `process.env` reads;
      no new top-level deps.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Migration filename.** Drizzle generates numbered + adjective+noun
  filenames automatically (most recent is `0018_*` based on
  `packages/db/drizzle/migrations/meta/0018_snapshot.json`). Reviewer
  picks the next sequential number; the SQL body is hand-authored above.
  Confirm hand-authored DELETE migrations are accepted here (existing
  template practice) or if we need to wrap it through `pnpm db:generate`
  with a schema-comment hack.
- **Should `appSettings.getAppSettings(db)` (the list-all service) be
  removed in this PR too?** Becomes unused after this. Recommend: leave it
  alone, separate trivial cleanup commit when convenient. Reviewer can
  flip.
- **`AppSettingsOutputSchema` / `AppSettingSchema`** in validators are
  similarly unused after this. Same recommendation — leave for a follow-up
  prune.
- **Existing audit rows reference deleted keys.** No code change handles
  this; the audit log still renders them. Confirm acceptable (matches the
  policy from the previous Settings move, where we explicitly decided
  pre-move URLs in audit log were allowed to 404).
- **Brand.ts ESLint rule sanity.** The `no-brand-string-literal` rule
  reads `brand.name`; new fields under `brand.homepage` shouldn't trip it
  but verify the rule's allowlist still covers
  `apps/web/src/app/(app)/home/page.tsx` reading from
  `@aira/config`. Recommend: it will — it allows any non-`brand.name`
  literal everywhere, and `brand.homepage.aboutTitle` is an *import*
  reference, not a brand-name string literal.
