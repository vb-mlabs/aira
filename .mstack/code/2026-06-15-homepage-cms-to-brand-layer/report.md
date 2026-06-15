# Implementation report: Homepage CMS → brand layer; App tab → Renewals

**Status:** complete
**Review:** [2026-06-15-homepage-cms-to-brand-layer](../../reviews/2026-06-15-homepage-cms-to-brand-layer.md)
**Branch:** feat/rest-api-migration
**Started:** 2026-06-15 18:22 UTC
**Completed:** 2026-06-15 18:48 UTC
**Commits:** 8 task commits + 3 pre-run commits

---

## Tasks

| # | Status | Subject | Commit |
|---|--------|---------|--------|
| 1 | ✓ done | Add `brand.homepage` sub-object | `db2a524` |
| 2 | ✓ done | countActiveBusinessesOp + validator + route + test | `3806e20` |
| 3 | ✓ done | Rewrite home/page.tsx (brand + count op) | `5a9bfa5` |
| 4 | ✓ done | Rename App tab → Renewals (route move + tabs) | `71911bc` |
| 5 | ✓ done | Delete HomepageCmsForm | `57e29bc` |
| 6 | ✓ done | Delete generic admin ops + parent route + public op | `839389d` |
| 7 | ✓ done | Prune dead-code in services + validators | `b5464c1` |
| 8 | ✓ done | Migration 0026 (purge homepage_* rows) | `0c6cd5c` |
| 9 | ✓ done | Final verification | — |

## Commits

**Pre-run (cleared the dirty tree before pre-flight):**
- `4c214fa` chore(env): rename NEXT_PUBLIC_GOOGLE_MAPS_API_KEY → GOOGLE_MAPS_API_KEY
- `b4a054f` feat(listings): add GoogleMapsPinIcon component
- `3fd546a` refactor(admin): consolidate business-detail sections

**This run:**
- `db2a524` feat(config): add brand.homepage for /home About copy + community stat
- `3806e20` feat(api): GET /api/v1/businesses/count for the home stat card
- `5a9bfa5` refactor(home): read brand.homepage; fetch count via apiServerFetch
- `71911bc` feat(admin): rename App tab → Renewals (route move + tabs strip)
- `57e29bc` chore(admin): delete unused HomepageCmsForm
- `839389d` chore(api): remove generic admin app-settings ops + parent route + public op
- `b5464c1` chore(services,validators): prune unused app-settings list-all helpers
- `0c6cd5c` chore(db): migration 0026 — purge homepage_* app_setting rows

## Acceptance criteria from the review

All 14 boxes ticked:

- ✓ `packages/config/src/brand.ts` exports `brand.homepage` with `aboutTitle`, `aboutBody`, `communityMembers`
- ✓ `home/page.tsx` no longer imports `getAppSettingsPublicOp`; reads from `brand.homepage`
- ✓ /home renders About title + body from brand; Businesses card from live count; Community card from `brand.homepage.communityMembers`
- ✓ `apps/web/src/server/operations/app-settings.ts` deleted
- ✓ `apps/web/src/server/operations/app-settings-admin.ts` exports only the reminder-schedule pair
- ✓ `apps/web/src/app/api/v1/admin/app-settings/route.ts` deleted; the nested reminder-schedule route survives
- ✓ `HomepageCmsForm` component deleted; no remaining importers
- ✓ Settings tabs strip ends in "Renewals" (5 tabs); active tab on `/admin/settings/renewals`
- ✓ `/admin/settings/app` → 404 (file deleted)
- ✓ `/admin/settings/renewals` renders the RenewalScheduleForm
- ✓ Migration 0026 applied; `app_setting` SELECT shows only `reminder_schedule`
- ✓ `pnpm typecheck` passes workspace-wide (10/10 packages)
- ✓ `pnpm test` passes: 167/167 web tests (3 new for `/api/v1/businesses/count`)
- ✓ No new `"use server"` directives, no new raw `process.env` reads, no new top-level deps

## Notable mid-run adjustments

- **`import { z } from "zod"` re-added in Task 6.** Removed it along with the generic ops only to find the reminder-schedule op still uses `z.object({}).strict()`. Restored as a one-line fix before commit. No surprise — just attention.
- **`apps/web/.next` cleared multiple times during the run** to avoid the stale-types-after-deleted-page.tsx gotcha noted in the skill's gotchas section.
- **Per-review scope held for the validator prune.** Only `AppSettingsOutputSchema` removed; `AppSettingUpdateInputSchema` left in place even though it's also unused — the review's locked decision was conservative.

## Follow-ups

- **`AppSettingUpdateInputSchema` is dead code.** Decision deferred to a separate trivial prune (review noted it). Pick up next time the validators file is touched.
- **Pre-existing lint errors** in untouched files (community/post-detail-modal, sponsorships-section, instrumentation.ts). Still pre-existing; not introduced here. See the previous run's report.
- **Forks running against this branch should re-seed `reminder_schedule`** if their DB doesn't have it. The migration only deletes; it doesn't create.

## Recommended next step

`/mlabs-qa` to walk the rendered behavior:

- /home as signed-in user: About section, both stat cards, Featured Businesses section
- /admin/settings/renewals as super_admin: only Renewal schedule form, tabs strip ends in "Renewals"
- /admin/settings/app as super_admin: 404
- GET /api/v1/businesses/count as authed user: 200 with `{ count }`
- GET /api/v1/admin/app-settings as super_admin: 404 (route deleted)
- GET /api/v1/admin/app-settings/reminder-schedule as super_admin: still 200
