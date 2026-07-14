# Plan: admin membership-plans — hard-delete when unreferenced

**Date:** 2026-07-14
**Slug:** 2026-07-14-admin-membership-plans-hard-delete
**Status:** implemented
**Author:** /mlabs-plan (framer@millionlabs.co.uk, via /mlabs-auto)

---

## Problem

The row-actions refactor shipped earlier today added Deactivate (soft-delete) to the membership-plans admin list. That covers the common "retire this plan going forward" case. What's still missing is a way to actually **remove** a plan from the DB when it was created by mistake, or as a test, or as a duplicate — plans that have zero subscription history.

Right now those plans just accumulate in the "Include inactive" view forever. Not a functional problem, but every admin will eventually accumulate 3–5 test / mistake plans they can't clean up. Add a hard-delete that removes the row **only when no subscription — past or present — references it**, so historical audit / billing links are never orphaned.

## Scope

**In:**

- **Service:** new `deleteMembershipPlan(db, id)` in `packages/services/src/membership-plans/service.ts`. Counts rows in `business_subscriptions` where `plan_id = id`. If count > 0, throws a domain error the operation layer translates to `ApiError.conflict("membership_plan.has_subscriptions", ...)`. Otherwise executes the `DELETE FROM membership_plans WHERE id = $1` and returns the deleted row (for confirmation, matches the shape of update / deactivate).
- **Query:** extend `listMembershipPlans` in `packages/services/src/membership-plans/queries.ts` to return `MembershipPlan & { subscription_count: number }`. One extra correlated `COUNT(*)` subquery over `business_subscriptions` per row, or a `LEFT JOIN` + `GROUP BY` — whichever Drizzle expresses cleanest. Called once by the admin list op; per-row cost is negligible at expected plan counts (~5–20 plans per city).
- **Validator:** extend `MembershipPlanSchema` in `packages/validators/src/membership-plans.ts` with `subscription_count: z.number().int().nonnegative()`. `MembershipPlanListOutputSchema` picks the change up automatically since it references `MembershipPlanSchema`.
- **Operation:** new `deleteMembershipPlanOp` in `apps/web/src/server/operations/membership-plans.ts`. Same shape as `deactivateMembershipPlanOp` (input `{ id }`, permission `super_admin`, output `{ plan }` — the deleted row). Handler wraps the service call in a try/catch: catches the domain error and rethrows as `ApiError.conflict(...)` with the message the confirm dialog will surface.
- **HTTP route:** new `apps/web/src/app/api/v1/admin/membership-plans/[id]/hard/route.ts` exposing `DELETE` via `deleteMembershipPlanOp.runFromRequest`. Existing `[id]/route.ts` (deactivate) stays untouched. Keeps DELETE-on-parent = safe soft-delete, DELETE-on-`/hard` = irreversible.
- **UI — confirm dialog:** new `apps/web/src/features/admin/components/plan-delete-confirm-dialog.tsx`. Modeled after `PlanDeactivateConfirmDialog` (same base-ui `AlertDialog` primitive, same `useTransition` + inline-error pattern). Copy explicitly states "permanently" and "cannot be undone." Hits `DELETE /api/v1/admin/membership-plans/${plan.id}/hard`. On 409 Conflict (server-side FK check race — subscription created since the list was fetched), surface the server's error message inline instead of closing.
- **UI — details modal:** `apps/web/src/features/admin/components/plan-details-modal.tsx` gets a **Delete** button rendered when `plan.subscription_count === 0`. Sits alongside the existing Deactivate button (Deactivate stays for `plan.active === true` regardless of count). On success: close both modals + `router.refresh()` — same feedback pattern as Deactivate.
- **UI — list:** `apps/web/src/app/admin/settings/membership-plans/_components/plan-list.tsx` accepts the extended `MembershipPlan & { subscription_count }` in its `plans` prop. No JSX change; the count travels through to the modal.

**Out (deferred):**

- Cascade-delete of subscriptions along with the plan. Never — subscriptions are real user-facing rows with billing implications. If admin wants to nuke a plan with subscription history, they need to manually unsubscribe every business first (or contact eng).
- Bulk hard-delete of multiple plans from the list.
- Restoring a hard-deleted plan (impossible by definition — that's Deactivate's job).
- Extract a shared `ConfirmDialog` primitive from the three consumers (community `DeleteConfirmDialog`, `PlanDeactivateConfirmDialog`, `PlanDeleteConfirmDialog`). Now that the third instance lands, this is a valid follow-up but not blocking.
- Mobile changes — none.

## Approach

**Chosen path — new dedicated `/hard` endpoint + server-side FK count check + UI-side polish hide.**

The endpoint is separate from the existing deactivate `DELETE` so there's no way to confuse the two semantics. The service function does the count check inside a single transaction with the delete, so a subscription created between the check and the delete would either be rolled back (if the count came in fresh) or race to still delete safely (the `onDelete: "set null"` FK config would nullify the fresh subscription's `plan_id`, so no DB integrity error). For belt-and-braces, keep the count check as the primary guard and let the FK config be the fallback.

**Client-side flow:**
1. Admin opens plan details modal from row click.
2. Modal reads `plan.subscription_count` (already loaded via list op — no extra fetch).
3. If count === 0, "Delete" button renders next to "Deactivate".
4. Tap Delete → confirm dialog with permanent-loss copy.
5. Confirm → `apiClient.delete('/api/v1/admin/membership-plans/<id>/hard')`.
6. Success → close both modals, `router.refresh()`, row disappears from list.
7. Failure (409 Conflict because subscription raced) → inline error message in the confirm dialog: "This plan now has X subscriptions. Deactivate instead to retire it without breaking history."

**Alternatives considered:**

- **Repurpose `DELETE /api/v1/admin/membership-plans/[id]` to hard-delete; move deactivate to `POST /.../deactivate`.** *Rejected* — breaks the existing DELETE→deactivate contract shipped today. Small blast radius (only `PlanDeactivateConfirmDialog` calls it), but no upside vs. adding a new endpoint.
- **On-demand `GET /api/v1/admin/membership-plans/[id]/subscription-count` when details modal opens.** *Rejected* — one extra request per modal-open, and the Delete button flashes into existence when the count arrives. Extending the list op is one query at fetch time.
- **Cascade-delete subscriptions.** *Rejected outright* — subscriptions represent real business billing history. Cascading them on plan-delete would be data loss disguised as ergonomics.
- **Rely on DB `onDelete: "set null"` and just let DELETE always succeed.** *Rejected* — an admin clicks Delete on a live plan, three business subscriptions silently lose their `plan_id`, billing history is corrupted. Server MUST refuse.

## Data model changes

None. No schema migration. Existing `business_subscriptions.plan_id` FK config (`onDelete: "set null"`) stays — it's the safety net if the count-check race is ever lost, and it's the reason we won't get FK-violation errors from Drizzle on delete.

## Files to touch

**New:**

- `apps/web/src/features/admin/components/plan-delete-confirm-dialog.tsx` — mirror of `plan-deactivate-confirm-dialog.tsx`, permanent-loss copy, hits the `/hard` endpoint.
- `apps/web/src/app/api/v1/admin/membership-plans/[id]/hard/route.ts` — DELETE handler mounting `deleteMembershipPlanOp.runFromRequest`.

**Edit:**

- `packages/services/src/membership-plans/queries.ts` — `listMembershipPlans` returns plans with `subscription_count`. `toMembershipPlan` accepts the count in its input.
- `packages/services/src/membership-plans/service.ts` — new `deleteMembershipPlan(db, id)` service. Also update the barrel `packages/services/src/membership-plans/index.ts` to export it.
- `packages/validators/src/membership-plans.ts` — extend `MembershipPlanSchema` with `subscription_count: z.number().int().nonnegative()`.
- `apps/web/src/server/operations/membership-plans.ts` — add `deleteMembershipPlanOp`.
- `apps/web/src/features/admin/components/plan-details-modal.tsx` — render Delete button when `plan.subscription_count === 0`; mount `PlanDeleteConfirmDialog`; success path mirrors Deactivate.

**Do not touch:**

- Existing `deactivateMembershipPlanOp`, its route (`DELETE /api/v1/admin/membership-plans/[id]`), or `PlanDeactivateConfirmDialog`. Zero regression risk.
- `PlanForm` — unchanged.
- Schema files, migrations, Drizzle FK config.
- Mobile.

## Edge cases

- **Race: subscription created between list fetch and Delete click.** UI shows Delete (count was 0 at fetch time). Admin clicks Delete. Server's count check runs fresh — count is now 1. Server returns 409 Conflict. Confirm dialog shows the error inline; admin can Cancel or refresh.
- **Plan is already inactive AND has no subscriptions.** Delete button renders (count === 0); Deactivate button does not (`plan.active === false`). Details modal only shows Delete + Edit. Correct semantic.
- **Plan is active AND has no subscriptions.** Both Delete and Deactivate render. Admin picks based on whether they want to remove entirely or just retire.
- **Plan is active AND has subscriptions.** Only Deactivate renders. Delete is hidden. Correct.
- **Plan is inactive AND has subscriptions.** Neither Delete nor Deactivate renders — the modal is read-only. The plan sits there as historical reference for existing subscriptions. Correct.
- **Subscription count query performance.** `business_subscriptions` is small-to-medium; correlated `COUNT(*)` per plan × ~20 plans is trivial. If perf ever matters, swap to a single `GROUP BY plan_id` join.
- **Deleted plan still referenced by a business's `payment_evidence_url` note or similar.** No — those are opaque text fields; no derived data breaks.
- **Concurrent admin actions.** Two super_admins delete the same plan. First wins with the row; second gets 404 (row already gone). Rethrow as `ApiError.notFound(...)` in the op handler — no server crash.
- **`listMembershipPlans` output caller other than the admin op.** Verify no other caller reads `MembershipPlanSchema` in a way that would break on the new `subscription_count` field being present. Zod schemas are additive; existing callers will parse fine as long as they don't use `.strict()` on the output. `MembershipPlanListOutputSchema` doesn't strict — safe.

## Acceptance criteria

- [ ] `deleteMembershipPlan(db, id)` service exists; throws when `business_subscriptions.plan_id = id` count > 0; deletes and returns the row otherwise.
- [ ] `listMembershipPlans` output includes `subscription_count: number` per plan.
- [ ] `MembershipPlanSchema` has `subscription_count` field.
- [ ] `deleteMembershipPlanOp` exists in `apps/web/src/server/operations/membership-plans.ts`, permission `super_admin`, wraps the service and re-throws as `ApiError.conflict` on domain error.
- [ ] `DELETE /api/v1/admin/membership-plans/[id]/hard` route exists and calls the op.
- [ ] `PlanDeleteConfirmDialog` component exists; copy makes "permanently" and "cannot be undone" explicit; handles 409 by showing the server error inline without closing.
- [ ] `PlanDetailsModal` renders a Delete button next to Deactivate when `plan.subscription_count === 0`; hidden otherwise.
- [ ] Successful hard-delete closes both modals + refreshes the list; the plan disappears.
- [ ] `pnpm typecheck` and `pnpm lint` both pass across the workspace.
- [ ] `pnpm --filter @aira/web build` succeeds.
- [ ] Existing Deactivate flow untouched (spot-check: click Deactivate on an active plan → row's Status badge flips to Inactive; no regression).
- [ ] No mobile changes (`apps/mobile/*` untouched).
- [ ] No schema migration file generated.

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Route path shape.** `DELETE /api/v1/admin/membership-plans/[id]/hard` vs `DELETE /api/v1/admin/membership-plans/[id]?force=true` vs `POST /api/v1/admin/membership-plans/[id]/delete`. Recommend the `/hard` path segment — most discoverable in logs, no query-param magic, matches admin-section conventions.

2. **Should the shared `ConfirmDialog` primitive be extracted now** (third consumer landing) or deferred? Recommend deferred — this plan is small enough that inlining is faster; extraction can be a fourth commit or a separate cleanup.

3. **Deactivate + Delete button order in the details modal.** Left-to-right: Deactivate then Delete? Delete then Deactivate? Recommend Deactivate first (softer action leftmost), Delete rightmost (destructive-most rightmost); both to the left of Edit which is the primary action.
