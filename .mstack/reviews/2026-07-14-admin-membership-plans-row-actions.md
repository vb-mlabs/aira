# Review: admin membership-plans — row-click details modal + edit/deactivate actions

**Date:** 2026-07-14
**Slug:** 2026-07-14-admin-membership-plans-row-actions
**Plan reviewed:** [2026-07-14-admin-membership-plans-row-actions.md](../plans/2026-07-14-admin-membership-plans-row-actions.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** /mlabs-review (framer@millionlabs.co.uk, via /mlabs-auto)

---

## Summary

Plan is ready to implement with all four open questions locked to their recommended defaults. Discovery during review turned up one important detail the plan hedged on: the `DELETE /api/v1/admin/membership-plans/[id]` HTTP route already exists and is wired to `deactivateMembershipPlanOp`, so zero server work is needed. Client just calls `apiClient.delete(...)`. Also verified: no toast primitive exists anywhere in `apps/web/*` — every reference is a comment explicitly declining to use one. Success feedback stays as close-modals + `router.refresh()`, matching established convention.

**UI-Significant heuristic:** Two new files (`plan-details-modal.tsx` under `apps/web/src/features/admin/components/`, `plan-list.tsx` under `apps/web/src/app/admin/settings/membership-plans/_components/`) + one edited `page.tsx`. The heuristic ANDs "files touched ≥ 3 OR any new `page.tsx`" — we have 3 files (2 new components + 1 edited page.tsx) matching the union of qualifying paths. **Flag = yes.** That said, this is admin polish, not a public-facing surface — a mockup pass would be overhead. Recommend proceeding straight to code but noting the flag so `/mlabs-auto`'s Gate C is honest.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** the existing `DeleteConfirmDialog` at `apps/web/src/features/admin/community/delete-confirm-dialog.tsx` is tightly coupled to `AdminPostRow` (typed post prop, hardcoded DELETE URL to `/api/v1/admin/community/posts/:id`) — it's a reference pattern, not a reusable primitive. Extracting a shared confirm dialog would double the surface of this plan.
  **Decision:** build a new plan-specific `PlanDeactivateConfirmDialog` next to the details modal, modeled on `DeleteConfirmDialog`'s shape (base-ui `AlertDialog.Root`, `useTransition` pattern, inline error surfacing without auto-close). Extract into a shared `ConfirmDialog` component only when the third consumer lands.

- **Concern:** the plan mentioned `apiClient.op(...)` which doesn't exist — `apiClient` exposes HTTP verbs (`.get / .post / .patch / .delete`) not typed op invocations. The correct call is `apiClient.delete(`/api/v1/admin/membership-plans/${plan.id}`)`.
  **Decision:** review + implementation use `apiClient.delete(...)`. Same shape as `DeleteConfirmDialog`'s `apiClient.delete` in the community section.

- **Concern:** the web codebase has no toast primitive. Every `toast` reference in the source is a comment explaining why one wasn't used. Installing sonner (or similar) for a single admin action would diverge from established convention.
  **Decision:** on successful deactivate, close both modals and call `router.refresh()`. The row's Status badge flips from Active to Inactive — direct visible confirmation. No toast, no new dep. If the pattern doesn't feel like enough acknowledgment during QA, add an inline banner inside the confirm dialog before closing.

- **Concern:** destructive-action button label. "Delete" matches user expectation but is dishonest (plan row isn't removed, subscriptions still reference it, action is reversible). "Deactivate" is honest and matches the operation name.
  **Decision:** "Deactivate". The description column in the confirm dialog spells out the semantic explicitly ("Existing subscriptions on this plan stay active; new subscriptions cannot be created against it. Reversible by editing the plan and toggling Active back on.").

- **Concern:** edit button in the details modal — navigate to `/[id]` (existing intercept route) vs render `PlanForm` in place.
  **Decision:** navigate to `/[id]`. Preserves deep-link URL for admins using bookmarks / URL sharing. Existing intercept-routed edit modal opens on top of the list.

### Suggestions (taken)

- **Taken.** Order the task commits so each leaves the app in a working state: build the new components first (no visible change to the page), then rewire the page once in a single commit. Sequenced under "Implementation plan" below.

## Decisions locked

Net decisions made during review:

1. **Button label:** "Deactivate".
2. **Success feedback:** close both modals + `router.refresh()`. No toast, no new dep.
3. **Confirm dialog:** new plan-specific `PlanDeactivateConfirmDialog` component modeled after community's `DeleteConfirmDialog`. No preemptive shared extraction.
4. **Edit button:** close details modal + `router.push('/admin/settings/membership-plans/<id>')`. Existing intercept-routed edit modal handles the rest.
5. **Client op call shape:** `apiClient.delete(`/api/v1/admin/membership-plans/${plan.id}`)`, since `apiClient` is HTTP-verb-based not op-typed.
6. **Deactivate button visibility:** hidden when `plan.active === false`; details modal shows a small "Inactive" note in that state.

## Implementation plan

Ordered tasks. Each is one atomic commit. First two tasks are additive (no visible change until Task 3 wires them in).

### Task 1: PlanDeactivateConfirmDialog component

- **Files:** `apps/web/src/features/admin/components/plan-deactivate-confirm-dialog.tsx` (new)
- **What:** Client component modeled after `apps/web/src/features/admin/community/delete-confirm-dialog.tsx`. Uses `AlertDialog.Root` from `@base-ui/react/alert-dialog`. Props:
  ```ts
  interface Props {
    plan: MembershipPlan;
    open: boolean;
    onClose: () => void;
    onDeactivated: () => void;
  }
  ```
  Title: `Deactivate {plan.name}?`. Description explains the soft-delete semantic (subscriptions stay active, new ones can't be created, reversible via edit). Two footer buttons: Cancel (secondary, closes) and Deactivate (destructive/red, fires the mutation). On confirm: `useTransition` + `await apiClient.delete(`/api/v1/admin/membership-plans/${plan.id}`)`; on success calls `onDeactivated()` which is expected to close + refresh from the parent; on `ApiError`, surface `err.message` inline without auto-close; on other errors, re-throw so the error boundary catches.
- **Acceptance:** file compiles under strict TS; component can be rendered in isolation with a fake plan; typecheck + lint clean.

### Task 2: PlanDetailsModal component

- **Files:** `apps/web/src/features/admin/components/plan-details-modal.tsx` (new)
- **What:** Client component. Uses `Dialog.Root` from `@base-ui/react/dialog` (or the same primitive the admin section already uses — verify by grepping the community post-detail-modal). Props:
  ```ts
  interface Props {
    plan: MembershipPlan | null;   // null = closed
    onClose: () => void;
  }
  ```
  Renders when `plan !== null`. Body: name as heading; description as paragraph (or "—" placeholder); price formatted `$XX.XX` from `price_cents`; duration in months with singular/plural handling; city id; status via `<AdminBadge variant={plan.active ? "active" : "inactive"} />`; created_at / updated_at as short relative or formatted dates. Footer:
  - **Edit** (secondary button) — on click: `onClose(); router.push(`/admin/settings/membership-plans/${plan.id}`)`. Ordered so the details modal closes before the intercept-routed edit modal opens on top.
  - **Deactivate** (destructive button) — rendered only when `plan.active === true`. On click: opens the local `PlanDeactivateConfirmDialog` (Task 1) with a `useState<boolean>` toggle. When the confirm's `onDeactivated` fires, close the confirm, then call `onClose()` on the details modal, then `router.refresh()` from `next/navigation`.
- **Acceptance:** component compiles; renders correctly under a `Dialog.Provider` if the primitive needs one; conditional deactivate button honors `plan.active`; typecheck + lint clean.
- **Pause if:** the admin section is inconsistent about which Dialog primitive it uses (base-ui vs shadcn vs raw Radix) — surface the choices and confirm the target primitive before locking.

### Task 3: PlanList client component + list-page rewire

- **Files:** `apps/web/src/app/admin/settings/membership-plans/_components/plan-list.tsx` (new) · `apps/web/src/app/admin/settings/membership-plans/page.tsx` (edit)
- **What:**
  - New `PlanList` Client Component (`"use client"`). Accepts `plans: MembershipPlan[]` as prop. Owns `const [openId, setOpenId] = useState<string | null>(null)`. Renders the exact same `<table>` markup that currently lives in `page.tsx`, with three interaction changes:
    - `<tr>` gets `onClick={() => setOpenId(plan.id)}`, `role="button"`, `tabIndex={0}`, `onKeyDown` that fires `setOpenId` on Enter or Space, plus `className="cursor-pointer hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`.
    - Plan name is plain `<span className="font-medium">{plan.name}</span>` — no `<Link>`, no `text-primary hover:underline`.
    - Below the table, mount `<PlanDetailsModal plan={plans.find((p) => p.id === openId) ?? null} onClose={() => setOpenId(null)} />`.
  - Edit `page.tsx` to a thin Server Component: keep the header (title + New-plan button), keep the empty-state branch, replace the current table with `<PlanList plans={plans} />`. Drop the `<Link>` import (no longer used on the page level).
- **Acceptance:** clicking anywhere on a plan row opens the details modal for that plan; keyboard Tab lands focus on rows, Enter/Space opens the modal, Escape closes it; plan-name text in the row is no longer styled as a link and clicking it doesn't navigate; empty state (no plans) still renders correctly. `pnpm typecheck`, `pnpm lint`, `pnpm --filter @aira/web build` all clean.

## Open questions

None. All four plan Open Questions resolved above.
