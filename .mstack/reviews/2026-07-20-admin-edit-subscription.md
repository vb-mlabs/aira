# Review: Admin edit subscription (parity with sponsorship Edit)

**Date:** 2026-07-20
**Slug:** 2026-07-20-admin-edit-subscription
**Plan reviewed:** [2026-07-20-admin-edit-subscription.md](../plans/2026-07-20-admin-edit-subscription.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Approved. Small, well-scoped follow-on to the sponsorship Edit feature.
Zero backend surface changes required — `BusinessSubscriptionUpdateInputSchema`,
`updateSubscription`, `updateSubscriptionOp`, and the PATCH route all
exist. Two follow-on decisions locked during review: keep both evidence
upload paths (Add-dialog + row-level dropzone), show `plan_id` as
read-only text in Edit dialog. One "smart form" decision folded in as
a Suggestion: don't auto-shift `end_date` from `plan.duration_months`
in Edit mode — the Add-mode auto-shift stays. Plan's Q1 (extract shared
`EvidenceCell`) decided as "keep copy-paste, revisit at rule-of-three".

## Findings

### Blockers

- None.

### Concerns (raised, decided, recorded)

- **Concern:** Add-Subscription dialog uploads evidence during Create
  via a `useDropzone` inside the dialog (subscriptions-section.tsx:270-284).
  Folding in the row-level post-hoc dropzone creates a second upload
  path.
  **Decision:** Keep both. Admin doing an all-at-once create can attach
  evidence in the same dialog; admin fixing a legacy row without
  evidence uses the row-level dropzone. Both paths POST to the same
  `/evidence` route via the same generalized `processAndStoreEvidence`
  pipeline — no divergent behavior on the server side.

- **Concern:** `plan_id` is excluded from the update schema — it can
  never be edited. If the Edit dialog omits it entirely, the admin
  loses the row identifier mid-edit.
  **Decision:** Render as read-only text `Plan: <name> (locked)`
  inside the Edit dialog. Mirrors the pattern sponsorship used for
  locked amount pre-unlock. Uses the existing `planById` map so the
  name resolves even if the plan was later deactivated.

- **Concern:** The Add dialog's `handleStartDateChange` auto-shifts
  `end_date` by `plan.duration_months` when the admin picks a start
  date. Applying that behavior in Edit mode would fight admins who
  are extending a lapsed subscription (moving the start earlier while
  keeping the end).
  **Decision:** Gate the auto-shift on Add mode only. In Edit mode,
  changing `start_date` leaves `end_date` alone.

- **Concern:** Cron rollover `paid → overdue` could surprise an admin
  who just manually set `paid` on an already-past-end-date row —
  next cron cycle would flip it back to overdue.
  **Decision:** Skip the helper-line copy for MVP (plan's Q3). The
  audit trail will show the manual flip; if this becomes a real pain
  point, add copy then. Filed to backlog as a follow-up.

### Suggestions (taken or deferred)

- **Taken:** Wire `business.subscription_updated` audit emission via
  the resolve-first pattern (`getSubscriptionById` → `createAudit` →
  `updateSubscription`), matching the fix in commit `657d54f` on
  `updateSponsorshipOp`.
- **Taken:** Copy-paste the `EvidenceCell` shape from
  `sponsorships-section.tsx` into `subscriptions-section.tsx` rather
  than extracting a shared component. Two sites is not yet the rule
  of three; extraction stays a follow-up. Filed to backlog.
- **Deferred:** Helper-line copy explaining the `paid → overdue` cron
  rollover — filed.
- **Deferred:** Shared `<EvidenceCell />` extraction — filed.
- **Deferred (pre-existing, symmetric):** Diff-capturing audit payload
  for `business.subscription_updated` — mirrors the sponsorship
  deferral; if we do it for one, do it for both.

## Decisions locked

- Editable fields in Edit mode: `payment_status`, `start_date`,
  `end_date`, `amount_cents`, `notes`. `plan_id` locked
  (schema-level).
- `plan_id` rendered as read-only text `Plan: <name> (locked)` inside
  the Edit dialog.
- Add-mode auto-shift of `end_date` from `plan.duration_months` stays;
  Edit-mode does NOT auto-shift.
- Both evidence upload paths (Add-dialog dropzone + row-level dropzone)
  coexist.
- Edit button appears on every subscription row (subscription is
  hard-delete; no terminal states to gate on).
- `updateSubscriptionOp` resolves via `getSubscriptionById` first, then
  emits `business.subscription_updated` audit before the mutation.

## Implementation plan

Ordered tasks for `/mstack-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit).

### Task 1: Add `business.subscription_updated` audit variant + render case

- **Files:** `packages/validators/src/audit-meta.ts` (edit) ·
  `apps/web/src/features/admin/audit/render-detail.tsx` (edit)
- **What:** Append `{ kind: "business.subscription_updated" }` to the
  `AuditMeta` union next to the existing `subscription_recorded` /
  `subscription_voided` variants. Append
  `"business.subscription_updated"` to `KNOWN_AUDIT_ACTIONS`. Add
  `"business.subscription_updated": "Subscription updated"` to
  `AUDIT_ACTION_LABEL_OVERRIDES`. Add a switch case in `render-detail.tsx`
  returning `<>Updated subscription</>`.
- **Acceptance:** `pnpm typecheck` passes — the `_ActionsCoverage` and
  render-detail exhaustiveness gates fail otherwise.

### Task 2: Emit audit in `updateSubscriptionOp` with resolve-first pattern

- **Files:** `apps/web/src/server/operations/business-subscriptions.ts`
  (edit)
- **What:** In `updateSubscriptionOp`, before calling
  `subsService.updateSubscription`, resolve the target with
  `subsService.getSubscriptionById(db, input.id)`. If null, throw
  `ApiError.notFound("subscription.not_found", "Subscription not found")`.
  Otherwise, emit `createAudit(db)({ actorId: ctx.userId, action:
  "business.subscription_updated", target: { type: "business", id:
  existing.business_id }, meta: { kind: "business.subscription_updated" } })`
  and then run the update as today. Matches the shape landed in commit
  `657d54f` on `updateSponsorshipOp`.
- **Acceptance:** `pnpm typecheck` passes. PATCH a subscription via
  `curl` (or via the UI in Task 3) and confirm a new `audit_log` row
  appears with `action = 'business.subscription_updated'` and correct
  `target_id`.

### Task 3: Add/Edit dialog + Edit button + row-level Evidence dropzone

- **Files:** `apps/web/src/features/admin/components/subscriptions-section.tsx`
  (edit)
- **What:**
  1. Rename `AddSubscriptionDialog` → `SubscriptionDialog` (Add + Edit).
     Add optional `subscription?: BusinessSubscription` prop and pass
     `planById` so Edit mode can render the locked plan name.
     - When `subscription` is null (Add): existing behavior unchanged.
       Keep the in-dialog evidence dropzone.
     - When `subscription` is non-null (Edit): seed state from the row
       (payment_status, start_date, end_date, amount, notes). Do NOT
       call `handlePlanChange` / auto-shift `end_date` when start_date
       changes. Render `Plan: <name> (locked)` as read-only text
       instead of the plan select. `handleSubmit` PATCHes via
       `apiClient.patch(...)` against `/subscriptions/${sub.id}` and
       skips the evidence-upload branch (post-hoc upload lives in the
       row cell now). Title = "Edit subscription", submit label =
       "Save changes".
     - Wrap the seed logic in a named local function called from the
       `useEffect` so the existing
       `eslint-disable-next-line react-hooks/exhaustive-deps,
       react-hooks/set-state-in-effect` covers it — matches the fix
       used in `sponsorships-section.tsx`'s `loadAndSeed`.
  2. In `SubscriptionsSection`: add `editingSub` state; add
     `openAdd` / `openEdit(sub)` helpers; render a pencil (✎ from
     `lucide-react`) Edit button next to the existing Delete button
     on every row. On close, reset `editingSub` and re-fetch subs.
  3. Replace the current Evidence cell (View link OR
     `AlertTriangle "No evidence"`) with an inline `EvidenceCell`
     subcomponent lifted from `sponsorships-section.tsx`. When
     `sub.payment_evidence_url` is set: `<a href target="_blank"
     rel="noopener noreferrer" class="text-xs text-primary
     hover:underline">View</a>`. Otherwise a `useDropzone` tile that
     POSTs to `/api/v1/admin/businesses/${businessId}/subscriptions/${sub.id}/evidence`
     via `FormData` + `fetch`; on success call the existing
     `fetchSubs()` + `router.refresh()`. Inline error state under the
     row (mirrors the sponsorship implementation exactly).
- **Acceptance:**
  - Every row shows both ✎ (Edit) and 🗑 (Delete) buttons.
  - Clicking ✎ opens the dialog pre-filled with the row's values;
    `Plan: <name> (locked)` visible; PATCH via Save updates only the
    editable fields; table re-fetches on close.
  - Row Evidence cell renders `View` link when populated OR an inline
    dropzone when empty; upload writes back to
    `payment_evidence_url` via the existing evidence route; oversized
    / invalid-MIME files surface inline errors.
  - Add flow unchanged: dialog still uploads evidence during Create
    when a file is dropped in the dialog dropzone.
  - `pnpm typecheck` + `pnpm lint` pass.
- **Pause if:** Refactor sprawls beyond this file (e.g. extracting a
  shared `EvidenceCell` component to a new location). Rule-of-three
  discipline says keep the copy-paste for now; if the diff pushes
  toward extraction, pause and confirm.

## Open questions

None left blocking. The follow-ups (helper-line copy, shared
`EvidenceCell` extraction, diff-payload audit meta) are captured in
the backlog, not left dangling on this plan.
