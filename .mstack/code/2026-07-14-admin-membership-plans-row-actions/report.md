# Run report — admin membership-plans row-actions

**Status:** complete
**Review:** [2026-07-14-admin-membership-plans-row-actions](../../reviews/2026-07-14-admin-membership-plans-row-actions.md)
**Branch:** feat/landing-explainer-videos
**Commits:** 3

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | PlanDeactivateConfirmDialog | ✓ | 887b574 |
| 2 | PlanDetailsModal | ✓ | 61849f7 |
| 3 | PlanList + rewire page.tsx | ✓ | 1b5ef45 |

## Commits (in order)

- **887b574** — `feat(admin/plans): PlanDeactivateConfirmDialog`
- **61849f7** — `feat(admin/plans): PlanDetailsModal`
- **1b5ef45** — `feat(admin/plans): row-click details modal + PlanList client component`

## Verification

- `pnpm --filter @aira/web typecheck` — clean after every task.
- `pnpm --filter @aira/web lint` — 0 errors; 16 pre-existing warnings unrelated to this diff.
- Lefthook pre-commit gates (`check-no-server-actions`, `check-contrast`) — passed on every commit.
- No `Pause if` triggers fired.

## Files touched

**New:**
- `apps/web/src/features/admin/components/plan-deactivate-confirm-dialog.tsx`
- `apps/web/src/features/admin/components/plan-details-modal.tsx`
- `apps/web/src/app/admin/settings/membership-plans/_components/plan-list.tsx`

**Edited:**
- `apps/web/src/app/admin/settings/membership-plans/page.tsx` — thinned to a Server Component that fetches + hands off to `PlanList`.

**Deliberately not touched:**
- `apps/web/src/app/admin/settings/membership-plans/[id]/page.tsx` — existing intercept-routed edit modal preserved; Edit button in the new details modal navigates here.
- `apps/web/src/server/operations/membership-plans.ts` — zero server ops changed. Existing `DELETE /api/v1/admin/membership-plans/[id]` route already wired to `deactivateMembershipPlanOp`.
- `PlanForm`, service, validators — untouched.

## Follow-ups (for future work)

- **Hard-delete op.** Plans with no active subscriptions could safely be hard-deleted from the DB. Currently `deactivateMembershipPlanOp` is the only destructive op — soft-delete leaves inactive rows visible in the "Include inactive" list forever. If the deactivated-plan list clogs the admin UI, add a `deleteMembershipPlanOp` that FK-checks `business_subscriptions.plan_id` and refuses when references exist.
- **Extract shared ConfirmDialog.** Two consumers now use the base-ui `AlertDialog.Root` + `useTransition` + inline-error pattern (`DeleteConfirmDialog` for community posts, new `PlanDeactivateConfirmDialog` for plans). A third consumer would justify extracting a shared component under `apps/web/src/features/admin/components/confirm-dialog.tsx`.
- **Row trailing-actions column.** Reviewers noted that some admins might prefer Edit/Deactivate icons directly on the row for one-click access without opening the details modal first. Add as a follow-up if usage data suggests friction with the current two-click flow.
- **Toast primitive.** The whole web app deliberately avoids toasts (every reference is a comment saying so). If a future feature needs cross-page acknowledgement of a mutation, that's the moment to install `sonner` (or similar) at a top-level provider.

## Recommended next step

The interaction is scan-friendly and testable now:
1. `pnpm dev`, visit `/admin/settings/membership-plans` as super_admin.
2. Click a plan row → details modal opens.
3. Click Edit → details closes, edit modal opens on top with the URL updated.
4. Click Deactivate (on an active plan) → confirm dialog appears → confirm → both modals close, row's Status badge flips to "Inactive".
5. Reload — deactivated plan still shows (it's soft-deleted); no Deactivate button on its details modal.

If a Playwright sweep is desired for the row-click + modal interaction, `/mlabs-qa` with the focus argument "admin membership-plans row-click flow" would cover it.
