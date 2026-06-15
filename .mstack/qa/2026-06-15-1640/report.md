# QA report — 2026-06-15 16:40

**Focus:** Membership-plan-derived placement tier flow (implemented in `.mstack/code/2026-06-15-membership-plan-tier/`)
**Env:** localhost:5000 (Replit dev, Next.js 16 + Turbopack)
**Status:** clean
**Tester:** /mlabs-qa

---

## Scenarios run

All 9 scenarios (11 sub-tests) pass against the dev server with one
super_admin persona and 3 plans × 3 businesses × 3 subscription rows
seeded via the global setup. Final pass: **11/11 ✓**.

| # | Scenario | Result |
|---|---|---|
| S1 | New plan form Placement select renders TIER_LABELS (Sponsored / Sponsored Level 2 / Regular) | ✓ |
| S2 | Membership plans list page shows tier chip per row using TIER_LABELS (3 chips: Sponsored, Sponsored Level 2, Regular) | ✓ |
| S3 | Admin businesses table Tier column renders human labels; no raw `tier1`/`tier2`/`tier3` text in any cell | ✓ |
| S4 | Core Fields edit modal has NO `#b-tier` dropdown; only name + description + image controls present | ✓ |
| S5 | SubscriptionsSection has a Placement column with `Sponsored` chip on the tier1 sub row | ✓ |
| S6 | `/admin/cron` exposes the `backfill-business-tiers` card with "manual only" copy; Run-now triggers a `cron_run` row | ✓ |
| S6b | Backfill rewrites stale `businesses.tier` to match the active-paid subs (biz_sponsored → tier1, biz_lvl2 → tier2) | ✓ |
| S7 | `PATCH /api/v1/admin/businesses/[id]` with `tier` returns 400 | ✓ |
| S7b | `POST /api/v1/admin/businesses` with `tier` returns 400 | ✓ |
| S8 | Creating a paid tier2 subscription via `/api/v1/admin/businesses/[id]/subscriptions` rewrites `businesses.tier` to `tier2` inside the transaction | ✓ |
| S9 | Public `/listings/restaurants` renders tier badges from TIER_LABELS; the literal `"Featured"` no longer appears anywhere in the listings UI | ✓ |

Assets under `assets/` (s1-…s9-…png).

## Issues

_None._

## Process findings — NOT scenario failures

Two process issues surfaced during the run that aren't bugs in the
shipped code but are worth recording for future runs:

1. **Migration 0025 was not applied to dev before the QA run.** Initial
   spec invocation returned `500 Internal Server Error` on every page
   that queries `membership_plan` (including the public listings page —
   which joins for the `EFFECTIVE_TIER` subquery). Root cause was that
   `pnpm db:generate` produced the migration during the implementation
   session, but `pnpm db:migrate` was never invoked against the dev
   database. The implementation report calls this out as a post-deploy
   step; we missed it for the dev environment too.
2. **Dev server held the old schema after `pnpm db:migrate`.** Even
   after applying the migration, every route returned 500. The
   long-running dev server (PID 355, started at 16:32) needed a hard
   restart to recover. After restart everything worked. Suspected: a
   Drizzle prepared-statement / metadata cache the dev server held.
3. **Admin routes were moved under `/admin/settings/`.** Post-impl
   commits (37d2643, 4f54307, 4026e7f, 72922d0, a1f8bb7) reorganised
   the admin sidebar. `/admin/membership-plans` is now
   `/admin/settings/membership-plans`. The implementation report and
   any downstream documentation should be updated. The QA spec was
   re-pointed mid-run.
4. **`/admin/cron` is now gated on `requireSuperAdmin()`.** The QA
   admin persona was promoted from `admin` → `super_admin` to access
   the backfill button. Plain admins can no longer trigger the
   backfill, which is the new (correct) behaviour after the reorg —
   noted here so future QA runs aren't surprised.

## Summary

11 sub-tests · 0 critical · 0 high · 0 medium · 0 low

The implementation is functionally clean. No code fixes required; the
4 process findings are documented for future runs and the post-impl
admin reorg.
