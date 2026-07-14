# Review: admin membership-plans — hard-delete when unreferenced

**Date:** 2026-07-14
**Slug:** 2026-07-14-admin-membership-plans-hard-delete
**Plan reviewed:** [2026-07-14-admin-membership-plans-hard-delete.md](../plans/2026-07-14-admin-membership-plans-hard-delete.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** /mlabs-review (framer@millionlabs.co.uk, via /mlabs-auto)

---

## Summary

Plan is ready to implement. Two technical findings during review changed the shape slightly: `ApiError.conflict` doesn't exist in `packages/api/src/errors.ts` (only `forbidden`, `notFound`, `badRequest`), so the operation-layer error becomes `ApiError.badRequest("membership_plan.has_subscriptions", ...)` — same client-side experience, no new API-package surface. And rather than extending `MembershipPlanSchema` with `subscription_count` and rippling to four existing consumers, a new `MembershipPlanListItemSchema` extends the base schema with the count; only the list op returns it, other callers keep the vanilla `MembershipPlan` type.

All three plan-level open questions locked to their recommended defaults (route path `/hard`, defer shared ConfirmDialog extraction, footer order Deactivate | Delete | Edit).

**UI-Significant heuristic:** Files touched are one new confirm dialog under `apps/web/src/features/admin/components/`, one edited `plan-details-modal.tsx` (same folder), one new route handler (`hard/route.ts`), plus server-side changes. The three `apps/web/src/features/admin/components/*.tsx` files barely qualify but there's no new `page.tsx` and the count is right at the boundary. Flag = `no` — the diff is component/service, not shell UI.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** `ApiError.conflict` was referenced in the plan but doesn't exist in `packages/api/src/errors.ts` (verified: only `static forbidden`, `static notFound`, `static badRequest`). Adding a new static helper is small but unnecessary — the client-side confirm dialog only reads `err.message` and `err.code`, doesn't care about the HTTP status.
  **Decision:** the op re-throws domain-error as `ApiError.badRequest("membership_plan.has_subscriptions", "This plan has N subscription(s). Deactivate it instead to retire without losing history.")`. HTTP 400 instead of the semantically-purer 409, but the message shows correctly inline in the confirm dialog. If a future op benefits from a real 409 differentiation, add `ApiError.conflict` at that point.

- **Concern:** adding `subscription_count` to `MembershipPlanSchema` would break type-safety for four+ existing consumers (`plan-form.tsx`, `subscriptions-section.tsx` in two places, `plan-list.tsx`, `plan-details-modal.tsx`, `plan-deactivate-confirm-dialog.tsx`). Some receive plans from `apiClient.get('/api/v1/admin/membership-plans')` where the server would now include the count, but the type wouldn't reflect it unless every fetch site widens or the base schema changes.
  **Decision:** new `MembershipPlanListItemSchema = MembershipPlanSchema.extend({ subscription_count: z.number().int().nonnegative() })` in `packages/validators/src/membership-plans.ts`. `MembershipPlanListOutputSchema` swaps its `z.array(MembershipPlanSchema)` for `z.array(MembershipPlanListItemSchema)`. Consumers that need the count (`PlanList`, `PlanDetailsModal`, both new confirm dialogs) type against `MembershipPlanListItem`; consumers that don't (`PlanForm`, `subscriptions-section.tsx`) stay on `MembershipPlan`. Both types are structurally compatible in one direction (item ⊃ plan), so passing an item to a `MembershipPlan`-typed prop works without casts.

- **Concern:** `subscriptions-section.tsx` fetches plans via `apiClient.get<{ items: MembershipPlan[] }>("/api/v1/admin/membership-plans...")`. After the list op is upgraded to return `MembershipPlanListItem[]`, that consumer receives rows WITH `subscription_count` at runtime but its type still says `MembershipPlan[]`. Runtime is fine (structurally compatible), type stays honest to what the consumer uses.
  **Decision:** leave `subscriptions-section.tsx` untouched. Its explicit `apiClient.get<{ items: MembershipPlan[] }>` generic is now technically narrower than reality but semantically correct — it only uses `.id` and `.name` from each item, so the extra field is invisible. If future work needs strictness, add `MembershipPlan.strip()` at read.

- **Concern:** `getMembershipPlanById` (in `packages/services/src/membership-plans/queries.ts`) returns the base `MembershipPlan` type today. If we ever surface it through `MembershipPlanListOutputSchema`, the type mismatch would break. Verified: no path goes through that op today. Safe as-is; note as follow-up if a per-plan detail endpoint is added later.
  **Decision:** noted; no change now.

### Suggestions (taken)

- **Taken.** Order tasks so each leaves the app in a working state. Server work first (service → validator → op → route), then UI (confirm dialog → details modal). No "delete button rendered but endpoint 404s" intermediate state.

## Decisions locked

Net decisions made during review, plus the three plan-level open questions:

1. **Route path:** `DELETE /api/v1/admin/membership-plans/[id]/hard`. Existing DELETE endpoint (deactivate) stays.
2. **Shared ConfirmDialog:** deferred. Ship as a new bespoke `PlanDeleteConfirmDialog`; extract if a fourth consumer lands.
3. **Modal footer button order** (left → right): Deactivate | Delete | Edit. Softest destructive leftmost, hardest destructive middle, primary action rightmost.
4. **Domain-error helper:** `ApiError.badRequest("membership_plan.has_subscriptions", "...")`. No new `ApiError.conflict` needed for this cycle.
5. **List schema shape:** new `MembershipPlanListItemSchema` extends `MembershipPlanSchema` with `subscription_count`. `MembershipPlanListOutputSchema` returns the extended shape. Base `MembershipPlanSchema` untouched — other consumers unaffected.
6. **Delete button visibility rule:** `plan.subscription_count === 0`. Both active and inactive plans can be deleted if they have zero subscription history. (Plan is `plan.active === true` for Deactivate; independent axes.)

## Implementation plan

Ordered tasks. Each = one commit. Server foundations first, UI last.

### Task 1: Validator — MembershipPlanListItemSchema

- **Files:** `packages/validators/src/membership-plans.ts` (edit)
- **What:** Add `MembershipPlanListItemSchema = MembershipPlanSchema.extend({ subscription_count: z.number().int().nonnegative() })`. Export `MembershipPlanListItem = z.infer<typeof MembershipPlanListItemSchema>`. Update `MembershipPlanListOutputSchema` to use `z.array(MembershipPlanListItemSchema)` instead of `z.array(MembershipPlanSchema)`.
- **Acceptance:** `pnpm --filter @aira/validators typecheck` clean. No other exports change.

### Task 2: Service — extended list + new deleteMembershipPlan

- **Files:** `packages/services/src/membership-plans/queries.ts` (edit) · `packages/services/src/membership-plans/service.ts` (edit) · `packages/services/src/membership-plans/index.ts` (edit — export new fn)
- **What:**
  - `queries.ts`: `listMembershipPlans` returns `Promise<MembershipPlanListItem[]>`. Add a correlated subquery or LEFT JOIN + GROUP BY to include `subscription_count` per plan from `businessSubscriptions.plan_id`. Update `toMembershipPlan` (or introduce `toMembershipPlanListItem`) accordingly.
  - `service.ts`: new `deleteMembershipPlan(db, id)` — first `SELECT count(*) FROM business_subscriptions WHERE plan_id = $1`. If > 0, throw a `MembershipPlanHasSubscriptionsError` (new local class) carrying the count. Else `DELETE FROM membership_plans WHERE id = $1 RETURNING *`; return the deleted row (as `MembershipPlan`, not list-item — the deleted plan has no meaningful subscription_count post-delete anyway).
  - `index.ts`: add `export { deleteMembershipPlan }` and the error class.
- **Acceptance:** `pnpm --filter @aira/services typecheck` clean. `listMembershipPlans` output includes `subscription_count`.
- **Pause if:** the drizzle `count()` + subquery expression fights the type checker (Drizzle's `sql` builder has known SQLite/PG divergences). Surface the specific TS error and confirm the shape before pushing a workaround.

### Task 3: Operation — deleteMembershipPlanOp

- **Files:** `apps/web/src/server/operations/membership-plans.ts` (edit)
- **What:** New `deleteMembershipPlanOp = defineOperation({ name: "admin.membership-plans.delete", input: z.object({ id: z.string().min(1) }).strict(), output: z.object({ plan: z.any() }), permission: "super_admin", handler: async (db, _ctx, { id }) => { try { const plan = await plansService.deleteMembershipPlan(db, id); if (!plan) throw ApiError.notFound(...); return { plan }; } catch (err) { if (err instanceof plansService.MembershipPlanHasSubscriptionsError) { throw ApiError.badRequest("membership_plan.has_subscriptions", err.message); } throw err; } } })`.
- **Acceptance:** typecheck clean; op exports alongside existing four. `listMembershipPlansOp` output validator still passes with the extended item shape.

### Task 4: HTTP route — DELETE /api/v1/admin/membership-plans/[id]/hard

- **Files:** `apps/web/src/app/api/v1/admin/membership-plans/[id]/hard/route.ts` (new)
- **What:** Mount `deleteMembershipPlanOp.runFromRequest` on DELETE. Same file shape as the existing `[id]/route.ts` — two lines.
- **Acceptance:** typecheck clean; curl-equivalent test (unit or manual) hits the endpoint, returns 200 with plan on success or 400 with `{ error: { code: "membership_plan.has_subscriptions", message: "..." } }` on FK failure.

### Task 5: UI — PlanDeleteConfirmDialog

- **Files:** `apps/web/src/features/admin/components/plan-delete-confirm-dialog.tsx` (new)
- **What:** Mirror of `PlanDeactivateConfirmDialog` — base-ui `AlertDialog.Root`, `useTransition`, `apiClient.delete('/api/v1/admin/membership-plans/${plan.id}/hard')`. Title: "Delete plan permanently?"; body copy: "'${plan.name}' will be removed from the database. This cannot be undone. No subscriptions currently reference this plan." Handles `ApiError` in the catch — if `err.code === "membership_plan.has_subscriptions"`, surface a specific message ("A subscription was created after this list was loaded. Refresh and try Deactivate instead."); otherwise fall through to `err.message`. Button label: "Delete permanently" (matches title emphasis).
- **Acceptance:** typecheck clean; component renders under a stubbed `open={true}` with a fake plan.

### Task 6: UI — details modal Delete button

- **Files:** `apps/web/src/features/admin/components/plan-details-modal.tsx` (edit)
- **What:**
  - Accept `plan: MembershipPlanListItem | null` (widen from `MembershipPlan | null`).
  - Add `const [deleteOpen, setDeleteOpen] = useState(false)` alongside the existing `confirmOpen` (deactivate).
  - Add a Delete button in the footer, rendered ONLY when `plan.subscription_count === 0`. Sits between Deactivate and Edit per locked order (Deactivate | Delete | Edit). Same destructive styling as Deactivate.
  - Mount `<PlanDeleteConfirmDialog plan={plan} open={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={handleDeleted} />` beside the existing deactivate dialog.
  - `handleDeleted`: mirrors `handleDeactivated` — close confirm, close details modal, `router.refresh()`.
  - `PlanList` prop type widens automatically since `PlanDetailsModal` receives a `MembershipPlanListItem` from the already-widened `plans` array (Task 1 flowed through the list output schema).
- **Acceptance:** typecheck clean; Delete button visible on plans with `subscription_count: 0`, hidden otherwise; success path closes both modals + refresh.

## Open questions

None. All three plan-level opens resolved above; the two review-surfaced technical findings (ApiError.conflict absence, schema-widening ripple) also resolved.
