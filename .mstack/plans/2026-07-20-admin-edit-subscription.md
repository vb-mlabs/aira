# Plan: Admin edit subscription (parity with sponsorship Edit)

**Date:** 2026-07-20
**Slug:** 2026-07-20-admin-edit-subscription
**Status:** reviewed
**Author:** framer@millionlabs.co.uk

---

## Problem

Sibling admin gap to the sponsorship Edit feature we just shipped
(commits `7b6d75c` + `97ad6bd`). QA reports there's no Edit action on
subscription rows in the admin listing detail page — admins fixing a
mistyped date, wrong payment status, wrong amount, or missing evidence
have to delete + recreate the row, which loses the audit trail. A
deferred TODO from the sponsorship review already flagged that post-hoc
evidence upload should come to subscriptions too; folded into this
scope.

Who benefits: admin operators doing day-to-day account maintenance.
Success: an Edit control on each subscription row that opens the same
dialog admins already use for Add, plus an inline evidence dropzone in
the Evidence column when evidence is missing.

## Scope

**In:**
- Add a per-row Edit (✎) button on `subscriptions-section.tsx`. Every
  live row shows it — subscription is hard-delete, no cancelled/expired
  state to gate on.
- Refactor `AddSubscriptionDialog` into a unified Add/Edit dialog
  (rename to `SubscriptionDialog`): accepts an optional `subscription`
  prop; when present, pre-fills fields, PATCHes instead of POSTs, title
  flips to "Edit subscription".
- Editable fields: `payment_status`, `start_date`, `end_date`,
  `amount_cents`, `notes` — everything
  `BusinessSubscriptionUpdateInputSchema` already accepts.
- Add `business.subscription_updated` variant to the AuditMeta union +
  KNOWN_AUDIT_ACTIONS + label override + render-detail switch case.
- Emit `business.subscription_updated` from `updateSubscriptionOp` with
  the resolve-first pattern (fetch sub → audit → mutate), mirroring the
  fix landed for `updateSponsorshipOp` in commit `657d54f`.
- **Fold in:** inline dropzone in the Evidence column when
  `payment_evidence_url` is null. Lifts the `EvidenceCell` pattern from
  `sponsorships-section.tsx`. Uses the existing subscription evidence
  route + `processAndStoreEvidence({ domain: "subscription" })` — no
  new backend surface. Closes the deferred TODO from the sponsorship
  review.

**Out (deferred):**
- Editing `plan_id` — schema-locked (create-only), matches existing
  intent that plan choice is fixed at Add time. If we ever change this,
  it's a separate plan.
- Renewal / extension shortcut buttons.
- Bulk edit.
- Cross-field `end_date >= start_date` `.refine()` (already deferred
  from sponsorship review; still worth doing as a shared refinement
  helper).
- Diff-capturing audit payload for `business.subscription_updated`
  (already deferred symmetrically for sponsorship).

## Approach

Same shape as the sponsorship Edit feature — deliberate parallelism so
the two admin sections read the same way. Refactor
`AddSubscriptionDialog` → `SubscriptionDialog` with an optional
`subscription` prop; when present, seed form state from the row, swap
the API call to `apiClient.patch(...)` against the existing
`/api/v1/admin/businesses/[id]/subscriptions/[subId]` PATCH endpoint,
change the title, submit-button label, and success/error copy.

`updateSubscriptionOp` today doesn't emit audit (same gap
`updateSponsorshipOp` had before commit `657d54f`); close it with the
same resolve-first pattern — fetch the subscription first so we have
its `business_id` for the audit target, then audit before mutate.

For evidence upload, lift the `EvidenceCell` component from
`sponsorships-section.tsx` and reuse it — the Evidence column already
renders a "View" link when present; the change is to render a dropzone
instead of the "No evidence" warning when the URL is null. Wired to
`POST /api/v1/admin/businesses/[id]/subscriptions/[subId]/evidence`,
which already exists and now runs through the generalized
`processAndStoreEvidence({ domain: "subscription", ... })`.

**Alternatives considered:**

- Diverge from the sponsorship shape (e.g. dedicated Edit sub-page) —
  rejected. Consistency between the two sibling admin sections is more
  valuable than any local optimization.
- Also unlock `plan_id` in the Edit dialog — rejected. Not asked for,
  and the schema already excludes it. Changing plan mid-cycle is a
  business-model question, not a UI polish.
- Extract a shared `EvidenceCell` into a common admin components
  directory — rejected as a "while I'm here" refactor. Copy-paste the
  ~40 lines for now; extract if a third domain needs it.

## Data model changes

None. Every column, service function, validator, and route needed for
this feature already exists. Audit-meta.ts gets one new union variant
+ one new `KNOWN_AUDIT_ACTIONS` entry, but that's a Zod/TS-only
addition (no DB migration).

## Files to touch

**New:**
- None.

**Edit:**
- `packages/validators/src/audit-meta.ts` — append
  `{ kind: "business.subscription_updated" }` to the `AuditMeta` union,
  append `"business.subscription_updated"` to `KNOWN_AUDIT_ACTIONS`,
  add the label override `"Subscription updated"`.
- `apps/web/src/features/admin/audit/render-detail.tsx` — add
  `case "business.subscription_updated": return <>Updated subscription</>`
  so the exhaustiveness check stays green.
- `apps/web/src/server/operations/business-subscriptions.ts` —
  `updateSubscriptionOp`: resolve via `subsService.getSubscriptionById`
  first, throw 404 if missing, `createAudit` before calling
  `updateSubscription`. Mirrors `updateSponsorshipOp` after commit
  `657d54f`.
- `apps/web/src/features/admin/components/subscriptions-section.tsx`:
  - Rename `AddSubscriptionDialog` → `SubscriptionDialog`; add optional
    `subscription?: BusinessSubscription` prop.
  - When `subscription` present: seed state from row, PATCH via
    `apiClient.patch(...)`, title = "Edit subscription", submit label
    = "Save changes". Skip the evidence-upload step in the Edit submit
    flow (post-hoc upload lives in the row cell now).
  - Track `editingSub` state in `SubscriptionsSection`; ✎ button per
    row calls `openEdit(sub)`.
  - Replace the "No evidence" cell with an `EvidenceCell` subcomponent
    (lifted from `sponsorships-section.tsx`) that renders `View` link
    when present, otherwise a `useDropzone` tile that POSTs to
    `/subscriptions/${subId}/evidence`.

## Edge cases

- **Edit + concurrent cron rollover.** Admin edits a subscription right
  as the daily cron flips `paid → overdue`. Last-write-wins via
  `updated_at`'s `$onUpdate`; not worth a lock for MVP.
- **Editing `end_date` past today on an `overdue` row.** The row stays
  `overdue` until admin also flips `payment_status` back to `paid` (or
  waits for a cron cycle to re-evaluate — but the cron only flips
  `paid → overdue`, not the reverse). Document as expected in the
  dialog helper text? Recommend: no — an admin extending dates should
  reason about payment_status themselves; both are editable in the same
  dialog.
- **Editing a row while an evidence upload is in flight for the same
  row.** Both go through the same `updated_at` refresh path. Last write
  wins; harmless for evidence URL vs field edits since they touch
  different columns.
- **Evidence-cell dropzone in a hard-deleted-row race.** The row can
  disappear between fetch and upload if another admin deletes it
  concurrently. The upload will 404 from `getSubscriptionById`; surface
  the error inline. Same behavior as sponsorship.
- **File validation** (5 MB max, JPEG/PNG/WebP/PDF) — reused from
  existing subscription evidence route; `EvidencePipelineError` maps
  to the same inline error surface as sponsorship.

## Acceptance criteria

- [ ] On `/admin/businesses/[id]`, every live subscription row shows a
      pencil (✎) Edit button alongside the existing Delete action.
- [ ] Clicking Edit opens the subscription dialog with the title
      "Edit subscription", pre-filled with the row's payment status,
      dates, amount, and notes.
- [ ] Saving PATCHes
      `/api/v1/admin/businesses/[id]/subscriptions/[subId]` with the
      full editable field set; the table re-fetches and reflects the
      updated values.
- [ ] `plan_id` is not editable — no plan selector rendered in Edit
      mode (or if rendered, it's read-only).
- [ ] Every subscription row's Evidence cell renders either a "View"
      link (when `payment_evidence_url` is set) or an inline dropzone
      (drag/drop or click) that uploads to the existing evidence
      route.
- [ ] Files > 5 MB rejected with `evidence.too_large`; non-JPEG/PNG/
      WebP/PDF rejected with `evidence.invalid_mime`; both surface
      inline under the row.
- [ ] Each successful edit emits a `business.subscription_updated`
      audit row (actor = admin, target = business).
- [ ] `pnpm typecheck` and `pnpm lint` pass across the monorepo.
- [ ] `/admin/audit` renders the two new-since-audit-meta-extend
      actions with human-readable labels + detail cells (no `never`
      fallback).

## Open questions

For the reviewer (`/mstack-review`) to resolve before implementation.

- **Share the `EvidenceCell` component.** Now that both sponsorship and
  subscription need identical inline dropzone behavior, extract to a
  shared admin component (e.g.
  `apps/web/src/features/admin/components/evidence-cell.tsx`) instead
  of copy-paste? Trade-off: one abstraction now vs "rule of three"
  discipline (this is only the second call site).
- **`plan_id` visibility in Edit dialog.** Show the plan name as a
  read-only field so admins recognize the row, or hide plan entirely?
  The sponsorship Edit dialog handles this ambiguity by showing amount
  as read-only pre-unlock — the analogous move for subscription is
  showing plan as read-only text.
- **`payment_status` UX.** Should there be a subtle helper line ("the
  daily rollover flips `paid` to `overdue` when the end date passes")
  in the dialog so admins understand why their manual override might
  revert? Small copy addition; low risk.
