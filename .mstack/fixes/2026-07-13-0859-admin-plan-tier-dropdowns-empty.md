# Fix — admin plan/tier dropdowns empty on `/admin/businesses/[id]`

**Started:** 2026-07-13 08:59
**Source:** debug/2026-07-13-0745-admin-plan-tier-dropdowns-empty
**Status:** fixed
**Commit:** (pending)

## Symptom / repro

See `.mstack/debug/2026-07-13-0745-admin-plan-tier-dropdowns-empty/report.md` for full trace. Short version: admin caller → `GET /api/v1/admin/membership-plans` and `/api/v1/admin/sponsorship-tiers` both 403 because both LIST ops declared `permission: "super_admin"`. Client dialogs `.catch(() => {})` the 403, so the dropdowns render empty with no visible error.

## Root cause

`listMembershipPlansOp` and `listSponsorshipTiersOp` were gated `super_admin`, but the ops that USE plans/tiers by id (create/update a business subscription, create a sponsorship) are gated `admin` — an admin can attach a plan to a business but couldn't see the catalog to pick one. LIST is a read admins need in normal workflows; only CREATE/UPDATE/DEACTIVATE (which change the catalog itself) belong to super_admin.

## Fix

Two one-line edits — LIST only, write ops on both files stay `super_admin`:

- `apps/web/src/server/operations/membership-plans.ts:19` — `listMembershipPlansOp.permission` from `"super_admin"` to `"admin"`.
- `apps/web/src/server/operations/sponsorship-tiers.ts:22` — `listSponsorshipTiersOp.permission` from `"super_admin"` to `"admin"`.

## Evidence

- failing spec re-run: `.mstack/debug/2026-07-13-0745-admin-plan-tier-dropdowns-empty/specs/repro.test.ts` copied into `apps/web/tests/`, ran `pnpm --filter @aira/web exec vitest run` → **2/2 passing** where it previously failed with `expected 'super_admin' to be 'admin'` on both. Test file removed after (belongs in `.mstack/debug/`, not the permanent suite).
- typecheck: `pnpm --filter @aira/web exec tsc --noEmit` → clean
- full apps/web vitest suite: `pnpm --filter @aira/web exec vitest run` → all pass (no regressions)
- lint on touched files: `pnpm --filter @aira/web exec eslint <touched>` → clean

**Manual prod-repro verification** requires the live app + admin login and is out of same-session reach. Deferred to prod smoke test: `/admin/businesses/[id]` → "Add subscription" → Plan dropdown lists active plans; same for "Add sponsorship" → Tier dropdown lists active tiers.

## Follow-ups

Enumerated in the debug report's "Out of scope" section — not in this fix, appended to TODOS:

1. Silent `.catch(() => {})` on both dialog fetches — even after this fix, future breakage will surface as an empty dropdown with no error toast. Small UX improvement, separate change.
2. Sweep every `permission: "super_admin"` LIST op across `apps/web/src/server/operations/*` — this bug likely isn't the only place a super_admin gate leaks into an admin workflow.
