# Debug — admin plan/tier dropdowns empty on `/admin/businesses/[id]`

**Started:** 2026-07-13 08:45
**Source:** user-report
**Env:** both — live prod (airabynisarga.com) and Replit workspace preview
**Status:** ready-for-fix
**Investigator:** /mstack-debug

## Symptom

On `/admin/businesses/[id]`, when the admin opens the "Add subscription" dialog in the Subscriptions card, the **plan dropdown is empty** — the `<select>` renders but shows only the sentinel `— Custom (no plan) —`. Same failure in the "Add sponsorship" dialog in the Sponsorships card: the **tier dropdown is empty**.

## Repro

1. Log in as a user with `role = "admin"` (not `super_admin`)
2. Navigate to `/admin/businesses/[any business id]`
3. Click "Add" in the Subscriptions card → open the "Add subscription" dialog
4. Observe the Plan `<select>`

**Expected:** dropdown lists active membership plans (Basic / Premium / etc.)
**Actual:** dropdown has only the "— Custom (no plan) —" sentinel; no plan options

Same steps for the Sponsorships card's "Add sponsorship" dialog → Tier `<select>` — expected: active sponsorship tiers; actual: empty.

**Both environments (prod + dev)** — rules out env-specific misconfig, seed data drift, or auth token issues.

**Artifact:** structural repro only — the dropdown-population code path was traced by inspection and reproduced by the failing spec below. No screenshot needed; symptom is self-evident from the code path.

## Investigation

- `apps/web/src/features/admin/components/subscriptions-section.tsx:258-262` — the dialog fetches `GET /api/v1/admin/membership-plans?includeInactive=false`. The `.catch(() => {})` at line 261 swallows any failure silently, so a 403 (or 500, or network failure) surfaces as `plans === []`.
- `apps/web/src/app/api/v1/admin/membership-plans/route.ts:3` → `listMembershipPlansOp.runFromRequest`
- `apps/web/src/server/operations/membership-plans.ts:19` — **`permission: "super_admin"`**.
- `apps/web/src/features/admin/components/sponsorships-section.tsx:220-236` — identical shape: fetches `GET /api/v1/admin/sponsorship-tiers?includeInactive=false`, `.catch(() => {})` at line 236 swallows failures.
- `apps/web/src/server/operations/sponsorship-tiers.ts:22` — **`permission: "super_admin"`**.
- `packages/api/src/permission.ts:15-19, 22-27` — permission hierarchy is `super_admin (2) ≥ admin (1) ≥ user (0)`. Higher levels satisfy lower gates; **an `admin` caller does NOT satisfy a `super_admin` gate**.
- `apps/web/src/server/operations/business-subscriptions.ts` and `sponsorships.ts` — the write ops that USE these plans/tiers by id (create/update/delete a business subscription; create/cancel a sponsorship) all declare `permission: "admin"`. So admins can attach a plan to a business, they just can't LIST the available plans to pick one.

## Root cause

Both `listMembershipPlansOp` and `listSponsorshipTiersOp` declare `permission: "super_admin"`. The permission hierarchy in `packages/api/src/permission.ts` correctly rejects an `admin` caller — the op returns 403. The two client dialogs (`subscriptions-section.tsx`, `sponsorships-section.tsx`) both `.catch(() => {})` the fetch, so the 403 surfaces as an empty dropdown with no visible error.

The `super_admin` gate is appropriate for CREATE / UPDATE / DEACTIVATE on plans and tiers (those change the pricing / tier catalog and belong to a higher-privilege role). But **LIST is a read** that regular admins need to consume in normal admin workflows — every admin who attaches a subscription or sponsorship to a business needs to see the catalog first. LIST should be `admin`.

**Failing test:** `specs/repro.test.ts` — asserts `listMembershipPlansOp.schema.permission === "admin"` and same for `listSponsorshipTiersOp`. Currently fails with `expected 'super_admin' to be 'admin'` on both. Passes after the fix.

## Fix plan (for /mstack-fix)

**Files to change (2 source files):**

- `apps/web/src/server/operations/membership-plans.ts` — line 19: `permission: "super_admin"` → `permission: "admin"` on `listMembershipPlansOp` only. Leave `createMembershipPlanOp`, `updateMembershipPlanOp`, `deactivateMembershipPlanOp` at `super_admin` — those manage the catalog and belong to super_admin.
- `apps/web/src/server/operations/sponsorship-tiers.ts` — line 22: same edit on `listSponsorshipTiersOp` only. Leave the three write ops at `super_admin`.

**Why it fixes the cause:** relaxing LIST from `super_admin` to `admin` lets an `admin`-role caller pass `meetsPermission()` at `packages/api/src/operation.ts:197` and return the item list — the client's `.then(...)` populates the `plans` / `baseTiers` state, and the dropdown renders options.

**No write-permission expansion:** the ops that create/update/deactivate plans and tiers stay `super_admin`. The ops that attach a plan/tier to a business (`business-subscriptions.ts`, `sponsorships.ts`) already require `admin` — this fix just makes their input catalog readable by the same role that's allowed to write.

**Hard-rule reminders:** none — this is a permission-value change on two operation definitions. No schema, no migrations, no brand/design tokens.

**Acceptance:**
1. Copy `.mstack/debug/2026-07-13-0745-admin-plan-tier-dropdowns-empty/specs/repro.test.ts` into `apps/web/tests/` (or use `--include`), run `pnpm --filter @aira/web exec vitest run <path>` — must pass (currently fails with `expected 'super_admin' to be 'admin'`).
2. Re-run the manual repro: as a non-super-admin, `/admin/businesses/[id]` → "Add subscription" → Plan dropdown lists active plans; same for "Add sponsorship" → Tier dropdown lists active tiers.

**Out of scope (follow-ups):**

- **Silent `.catch(() => {})` on both dialog fetches** — even after the permission fix, any future breakage (network failure, DB error) will surface as an empty dropdown with no error toast. The comments at both sites already acknowledge this (`// leave empty`). A visible error state would be a small UX improvement but is a separate change, not on the critical path for this bug.
- **Broader admin-role UX audit** — this bug likely isn't the only place where a super_admin gate leaks into an admin workflow. A sweep of `permission: "super_admin"` on read-only LIST ops across `apps/web/src/server/operations/*` would catch similar future issues. Not this fix — that's a plan-scale change.

## External references

None — self-contained investigation in this codebase.
