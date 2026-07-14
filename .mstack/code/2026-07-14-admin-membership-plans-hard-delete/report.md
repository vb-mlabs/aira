# Run report — admin membership-plans hard-delete

**Status:** complete
**Review:** [2026-07-14-admin-membership-plans-hard-delete](../../reviews/2026-07-14-admin-membership-plans-hard-delete.md)
**Branch:** feat/landing-explainer-videos
**Commits:** 6

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | MembershipPlanListItemSchema | ✓ | c9694db |
| 2 | deleteMembershipPlan service + list count | ✓ | e875277 |
| 3 | deleteMembershipPlanOp | ✓ | 492a617 |
| 4 | DELETE /hard route | ✓ | 06cf200 |
| 5 | PlanDeleteConfirmDialog | ✓ | 8662835 |
| 6 | PlanDetailsModal Delete button | ✓ | dfa140d |

## Commits (in order)

- **c9694db** — `feat(validators): MembershipPlanListItemSchema for admin list`
- **e875277** — `feat(services): deleteMembershipPlan + subscription_count on list`
- **492a617** — `feat(admin/plans): deleteMembershipPlanOp`
- **06cf200** — `feat(admin/plans): DELETE /api/v1/admin/membership-plans/[id]/hard route`
- **8662835** — `feat(admin/plans): PlanDeleteConfirmDialog`
- **dfa140d** — `feat(admin/plans): Delete button in details modal footer`

## Verification

- `pnpm --filter @aira/validators typecheck` — clean after T1.
- `pnpm --filter @aira/services typecheck` — clean after T2.
- `pnpm --filter @aira/web typecheck` — clean after each subsequent task.
- Lefthook pre-commit gates (`check-migrations`, `check-no-server-actions`, `check-contrast`) — passed on every commit.
- No `Pause if` triggers fired. Drizzle's `sql` builder handled the correlated `COUNT(*)::int` subquery cleanly.

## One deviation from the review

- T6 caught a spillover the review's `PlanList` acceptance criterion had glossed over: widening `PlanDetailsModal`'s `plan` prop from `MembershipPlan | null` to `MembershipPlanListItem | null` forced `PlanList`'s `plans` prop to widen too (typecheck failure on line 88 of `plan-list.tsx`). Fix was a two-line import + type swap in `plan-list.tsx`. Bundled into the T6 commit since the two are one logical change. Noted here for the review's completeness.

## Files touched

**New:**
- `apps/web/src/features/admin/components/plan-delete-confirm-dialog.tsx`
- `apps/web/src/app/api/v1/admin/membership-plans/[id]/hard/route.ts`

**Edited:**
- `packages/validators/src/membership-plans.ts` — added `MembershipPlanListItemSchema` + `MembershipPlanListItem` type; swapped `MembershipPlanListOutputSchema.items` element to the new item shape.
- `packages/services/src/membership-plans/queries.ts` — `listMembershipPlans` returns list-items with `subscription_count` via correlated COUNT subquery.
- `packages/services/src/membership-plans/service.ts` — new `deleteMembershipPlan` service + `MembershipPlanHasSubscriptionsError` domain error class.
- `packages/services/src/membership-plans/index.ts` — export the new function + error class.
- `apps/web/src/server/operations/membership-plans.ts` — new `deleteMembershipPlanOp` (translates the domain error to `ApiError.badRequest`).
- `apps/web/src/features/admin/components/plan-details-modal.tsx` — added Delete button; widened plan prop type.
- `apps/web/src/app/admin/settings/membership-plans/_components/plan-list.tsx` — widened plans prop type to match.

**Deliberately not touched:**
- `deactivateMembershipPlanOp`, its route (`DELETE /api/v1/admin/membership-plans/[id]`), `PlanDeactivateConfirmDialog` — zero regression to the just-shipped soft-delete flow.
- `MembershipPlanSchema` — base type stays as-is. Consumers that only need base plan fields (`PlanForm`, `subscriptions-section.tsx`, single-plan fetches) untouched.
- `getMembershipPlanById` — still returns base `MembershipPlan`. If a per-plan detail endpoint is added later that needs `subscription_count`, extend that query at that time.
- Any schema migration file — none needed; existing FK `onDelete: "set null"` is the safety net for the service-side count-check race.

## Follow-ups (for future work)

- **Extract shared `ConfirmDialog` primitive.** Now three consumers use the base-ui `AlertDialog.Root` + `useTransition` + inline-error pattern: `DeleteConfirmDialog` (community posts), `PlanDeactivateConfirmDialog`, `PlanDeleteConfirmDialog`. A fourth consumer justifies extracting a shared `components/admin/confirm-dialog.tsx` that all four use as thin wrappers. Note: the third instance was intentionally kept bespoke per the review's decision.
- **Trailing row-actions column on the plans list.** Would allow admins to Delete / Deactivate without opening the details modal first. Currently a two-click flow (row → modal → action). Add if usage data suggests admins want faster access.
- **Show subscription count in the plan list.** The list op now returns it — could display "3 subscriptions" as a muted cell so admins see references at a glance without opening the details modal. Small UX polish, easy follow-up.
- **`ApiError.conflict` helper.** Not added this cycle (used `badRequest` instead). If a future op benefits from a real 409-vs-400 differentiation, add the helper then.

## Recommended next step

Manual QA is the fastest path:
1. `pnpm dev` → visit `/admin/settings/membership-plans` as super_admin.
2. Create a fresh test plan (via New plan) that has never been subscribed to.
3. Click its row → details modal opens with all three footer buttons (Deactivate, Delete, Edit).
4. Click Delete → confirm dialog with "permanent" copy → confirm → row disappears from list.
5. On a plan that HAS subscriptions (attach one via `/admin/businesses/<id>` if none exists), open its details modal — Delete button should be hidden.
6. Race check: two browser tabs; open details for a plan with 0 subscriptions in tab A; in tab B, add a subscription via `/admin/businesses/<id>`; back in tab A click Delete → confirm dialog surfaces the inline "A subscription was created..." message without closing.

If a Playwright sweep is desired, `/mlabs-qa` with focus "admin membership-plans delete flow with FK race" would exercise the interesting paths.
