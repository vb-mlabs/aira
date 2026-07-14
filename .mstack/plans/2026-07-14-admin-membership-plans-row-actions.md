# Plan: admin membership-plans — row-click details modal + edit/deactivate actions

**Date:** 2026-07-14
**Slug:** 2026-07-14-admin-membership-plans-row-actions
**Status:** reviewed
**Author:** /mlabs-plan (framer@millionlabs.co.uk, via /mlabs-auto)

---

## Problem

The admin membership-plans list page has a hard-to-scan interaction and one missing capability:

- The only way to open a plan is to click the plan-name text — a tiny inline link inside a table row. Admins scanning the table often mis-click the row cell (which does nothing) or overshoot to a neighboring cell. Cognitive cost per row is higher than it needs to be.
- There's no delete affordance on the list. To retire a plan, admins have to either dig into the edit form (assuming the form exposes an "active" toggle) or take a back-channel route. `deactivateMembershipPlanOp` exists server-side but is unused from the UI.

The user wants the same three changes web-admin patterns already do everywhere else: **whole row is the tap target**, click reveals a **details modal**, and the modal carries **explicit edit + destructive-action buttons**.

## Scope

**In:**

- Refactor `apps/web/src/app/admin/settings/membership-plans/page.tsx` list-row interaction:
  - `<tr>` becomes the whole tap target (`onClick` on the row, `role="button"`, keyboard-accessible via `tabIndex={0}` + `onKeyDown` for Enter/Space).
  - Plan name is plain text — no `<Link>`, no `text-primary hover:underline`.
  - Row hover state stays; add a `cursor-pointer` and a subtle focus ring.
- New `PlanDetailsModal` component under `apps/web/src/features/admin/components/plan-details-modal.tsx` — read-only summary of the plan: name (heading), description (paragraph or "—"), price, duration, city, status, created / updated timestamps. Footer holds two buttons: **Edit** (secondary, opens the existing edit modal via `router.push('/admin/settings/membership-plans/<id>')`) and **Deactivate** (destructive, opens confirm dialog).
- Wire a **confirm dialog** for the Deactivate action. Reuse the existing `@base-ui/react/alert-dialog` pattern (see `apps/web/src/features/admin/community/delete-confirm-dialog.tsx` for the shape). Confirm copy makes the semantic explicit: "Deactivate '<plan name>'? Existing subscriptions on this plan stay active; new subscriptions cannot be created against it. This can be reversed by editing the plan and toggling Active back on."
- Client-side calls: `apiClient.op(deactivateMembershipPlanOp, { input: { id } })` on confirm; on success `router.refresh()` so the list picks up the new `active: false` state (row's Status badge flips from Active to Inactive).
- The existing `[id]/page.tsx` intercept-route (edit modal via `AdminFormModal`) stays untouched. Edit button in the new details modal just navigates to that URL — no new edit surface built. Deep links to `/admin/settings/membership-plans/<id>` continue to open the edit modal.

**Out (deferred):**

- Hard-delete of membership plans (row-level DB removal). No such op exists today. Membership plans are referenced by `business_subscriptions.plan_id` — hard-deletion would need cascade decisions we shouldn't invent under the guise of a UX polish. If needed later, split into its own plan.
- Row-level trailing "actions" column (edit / deactivate icons per row for one-click access). Recommended as follow-up if admins ask for it; not needed for the MVP where the row-click → details → action flow is only two clicks.
- Any change to `PlanForm` or the create/edit flows. Those already work; we're just adding a details-view + destructive action.
- Any change to server operations. All four ops (list, create, update, deactivate) already exist with the right permission gates (admin for list, super_admin for the rest). Delete-op is intentionally omitted per above.
- Any change to the plan schema, columns, or validators.

## Approach

**Chosen path — details modal + reuse existing edit flow + confirm-guarded deactivate.**

The details modal is a lightweight read-only summary (a `<Dialog>` from the same primitive family as `AdminFormModal`, no `PlanForm` inside). The list page holds a small piece of client state: `const [openId, setOpenId] = useState<string | null>(null)`. Row click sets `openId`; the modal reads the plan for that id from a memo over the same server-fetched plans list (no re-fetch). Closing sets `openId` back to null.

Footer buttons:
- **Edit** — `router.push('/admin/settings/membership-plans/<id>')`. Existing intercept route opens the edit modal on top. Details modal closes as the intercept mounts (or we explicitly close it via `setOpenId(null)` before the push — cleaner).
- **Deactivate** — opens a nested `AlertDialog` for confirmation. On confirm, fires the mutation via `apiClient`, closes both modals on success, calls `router.refresh()`.

The list-page component becomes a Client Component because it now owns state and the modal. The current `page.tsx` is a Server Component that fetches once via `apiServerFetch` and hands `plans` to the JSX. Refactor: keep the Server Component thin (fetch + auth), pass `plans` as a prop to a new `<PlanList>` Client Component that owns the row-click + modal state.

**Alternatives considered:**

- **Combine details + edit into one modal.** Row click opens the edit form directly (skip the details step). *Rejected* — the details modal is the affordance for "let me confirm what I'm looking at before I mutate," and edit is a rarer path than "just look up the price for a plan." Details-first also gives room for the destructive action to live away from the form.
- **Row-level trailing icons** (Edit / Deactivate) as the primary interaction. *Rejected as MVP* — matches other admin sections in this codebase but adds two columns to a narrow table and doesn't give the details view a home. Row-click → details → action is the more scan-friendly pattern for a rare-use catalog screen. Trailing icons can layer on if usage shows admins want faster access.
- **Add a hard-delete server op.** *Rejected* — plan is referenced by subscriptions; cascade semantics are a real product decision, not incidental to this UX change. Ship soft-delete via existing `deactivateMembershipPlanOp` now, revisit hard-delete separately if the deactivated-plan list gets clogged.

## Data model changes

None.

## Files to touch

**New:**

- `apps/web/src/features/admin/components/plan-details-modal.tsx` — `Dialog`-based modal, read-only plan summary + Edit/Deactivate footer.
- `apps/web/src/app/admin/settings/membership-plans/_components/plan-list.tsx` — Client Component owning row-click + modal state. Accepts `plans` as prop.

**Edit:**

- `apps/web/src/app/admin/settings/membership-plans/page.tsx` — thinned to fetch + render `<PlanList plans={plans} />`; the JSX table markup moves to the new `PlanList` client component. `<Link>` on plan name is removed there.

**Do not touch:**

- `apps/web/src/app/admin/settings/membership-plans/[id]/page.tsx` — the edit intercept route stays. Edit button in the details modal just navigates to this URL.
- `apps/web/src/app/admin/settings/membership-plans/new/page.tsx` — new-plan flow unchanged.
- `apps/web/src/app/admin/settings/membership-plans/_components/plan-form.tsx` — form unchanged.
- `apps/web/src/server/operations/membership-plans.ts` — all four ops already exist, no changes.
- Any service, validator, or schema code.

## Edge cases

- **Deactivating an already-inactive plan.** Server op sets `active: false` regardless. UX: hide the Deactivate button in the details modal when `plan.active === false`; show a small "Inactive since ..." note instead. Prevents no-op destructive clicks.
- **Concurrent edits.** Admin A opens details for plan X, admin B updates it. On A's screen the modal shows stale data. Acceptable for MVP — admin roles are small and race is rare. If A hits Deactivate, the mutation still fires against the current server row (id-based), just applied on top of B's change.
- **Row keyboard interaction.** `<tr role="button" tabIndex={0}>` needs `onKeyDown` for Enter and Space to open the modal (matching mouse click semantics). Escape closes the modal (base-ui `Dialog` handles this automatically).
- **Focus management.** When the details modal closes after a successful deactivate, focus should return to the triggering row for keyboard users. base-ui `Dialog` handles focus-return by default when triggered by a focused element — should Just Work; verify.
- **Toast on success.** After deactivate succeeds, surface a small toast: "'<plan name>' deactivated." Uses whatever toast primitive the admin section already ships (check for `useToast` or similar; if none exists in the admin section specifically, fall back to `sonner`-style if it's installed, or a lightweight inline banner).
- **Error handling.** If deactivate fails (network, 403, 404), show the error message in the confirm dialog inline (don't close the dialog on error). Common pattern.
- **Row click while hovering the plan-name text.** Row `onClick` fires regardless of which cell the click lands on — no need for `stopPropagation`. But make sure the Description-cell click doesn't do anything unexpected (it's just text; fine).
- **Existing `[id]/page.tsx` intercept route on direct-URL arrival.** A user landing on `/admin/settings/membership-plans/<id>` directly (from a bookmark) still sees the edit modal per the intercept route. Details modal is only reachable via row click from the list. Two entry points to editing, both fine.

## Acceptance criteria

- [ ] `apps/web/src/features/admin/components/plan-details-modal.tsx` exists and renders a read-only summary of a plan (name, description, price, duration, status, timestamps).
- [ ] `apps/web/src/app/admin/settings/membership-plans/_components/plan-list.tsx` exists as a Client Component, receives `plans` prop, renders the table.
- [ ] Clicking anywhere on a plan row opens the details modal for that plan.
- [ ] The plan-name text in the row is no longer a link — plain text (no `text-primary hover:underline`).
- [ ] Details modal has an **Edit** button that closes the modal and navigates to `/admin/settings/membership-plans/<id>` (opens the existing edit form modal).
- [ ] Details modal has a **Deactivate** button (only when `plan.active === true`) that opens a confirm dialog.
- [ ] Confirm dialog copy explicitly states the deactivate semantics (subscriptions stay active; reversible via edit).
- [ ] Confirming deactivate fires `apiClient.op(deactivateMembershipPlanOp, { input: { id } })`, closes both modals on success, refreshes the list.
- [ ] Row is keyboard-accessible: `tabIndex={0}`, Enter/Space open the modal, Escape closes it.
- [ ] `pnpm typecheck` and `pnpm lint` both pass.
- [ ] `pnpm --filter @aira/web build` succeeds.
- [ ] No mobile changes (`apps/mobile/*` untouched).
- [ ] No server operation changes.

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Deactivate button label.** "Deactivate" is honest to the soft-delete semantic but longer than "Delete". Options: (a) "Deactivate" (recommended — matches the reversible action), (b) "Delete" (matches user's mental model but misleading — deactivated plans stay in the DB), (c) "Archive" (softer, admin-friendly middle ground). Lock the label before UX ships.

2. **Toast primitive.** Admin section doesn't have an obvious existing toast. Options: (a) Use inline banner inside the details modal ("Plan deactivated" for 3s, then close), (b) install/use `sonner` (adds a top-level provider), (c) skip the toast and rely on the list refresh to communicate success. Recommend (a) — no new dep, matches admin patterns.

3. **Confirm dialog primitive.** Two candidates in the repo: `apps/web/src/features/admin/community/delete-confirm-dialog.tsx` (base-ui AlertDialog wrapper) and inline `AlertDialog.Root` (used in `category-form.tsx`). Recommend reusing `DeleteConfirmDialog` — it's already generalized and reduces new-component surface.

4. **Details modal edit-button behaviour.** Two options: (a) Close details modal, then `router.push` to `[id]` route (edit modal opens via intercept). (b) Directly render edit form inside the same modal (skip the URL change). Recommend (a) — preserves the deep-link URL for edit, matches existing UX for admins who already use bookmarks.
