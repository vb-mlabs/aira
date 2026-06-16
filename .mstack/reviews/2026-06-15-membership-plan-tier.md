# Review: Membership-plan-derived placement tier + user-facing labels

**Date:** 2026-06-15
**Slug:** membership-plan-tier
**Plan reviewed:** [2026-06-15-membership-plan-tier.md](../plans/2026-06-15-membership-plan-tier.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** mlabs-review

---

## Summary

Plan is ready to implement after four scope locks resolved with the user:
(1) tier is **stripped** from both `BusinessUpdateInputSchema` and
`BusinessCreateInputSchema` (admins can no longer write `businesses.tier`
through any HTTP boundary); (2) backfill exposes as a Run-now button
under `/admin/cron`; (3) plan picker uses a native `<select>`; (4)
admin tier chip lives **per-subscription row** in the
SubscriptionsSection (not Core Fields).

Critical technical concerns surfaced and resolved:

- Subscription mutations must wrap their service body + recompute in a
  single `db.transaction(...)`. The current `createSubscription` /
  `updateSubscription` / `deleteSubscription` are bare inserts/updates
  with no transaction; adding an out-of-band recompute would race
  against another concurrent mutation.
- `rolloverExpiredSubscriptions` currently only returns the count of
  flipped rows; we need it to also return the affected `business_id`s
  so the recompute can fire per affected business in a single pass
  after the bulk update.
- `BusinessSchema.tier` (the row shape returned to clients) **stays** —
  it's the denormalised cache. Removing it is a different plan.
- The membership-plans operation hardcodes `CITY_ID = "city-atlanta"`;
  the plan touches `MembershipPlanCreateInputSchema` so we need to
  verify the schema-`.omit({ city_id })` adapter in the create op
  still works after adding `tier` (it does, but spelled out below).

UI-Significant: **yes** (6 UI files edited across admin + listings;
no new routes). Recommended next: `/mlabs-mockup --from-review` if you
want to validate the new tier-chip placement visually before code;
otherwise `/mlabs-code` directly.

---

## Findings

### Blockers (must fix before /mlabs-code)

None remain. All blockers were lifted in the consultation round (see
"Decisions locked" below).

### Concerns (raised, decided, recorded)

- **Concern:** Plan calls for `recomputeBusinessTier` to fire from
  `createSubscription` / `updateSubscription` / `deleteSubscription`
  but doesn't address the fact that those service functions currently
  perform a single bare INSERT / UPDATE / DELETE with no transaction
  wrapper. A naive "do the mutation, then call recompute" sequence
  can race: two concurrent admins each saving a subscription, both
  reading the same active-paid set after their own write but before
  the other's, can land an inconsistent `businesses.tier` value.

  **Decision:** Every public mutation in
  `packages/services/src/business-subscriptions/service.ts` is wrapped
  in `db.transaction(async tx => ...)`. The mutation, the
  `findActivePaidPlansForBusiness(tx, business_id)` query, the
  best-tier computation, and the `UPDATE businesses SET tier = X
  WHERE id = $business_id` all run on `tx`. The recompute helper
  takes `tx` as its first argument (matching the existing
  `(db|tx, ctx, args)` pattern). For neon-serverless WS Pool this
  yields a real BEGIN/COMMIT; for the test mock (per
  `packages/services/src/messages/__tests__/service.test.ts:261`),
  `transaction(cb)` invokes `cb(mockDb)` directly.

- **Concern:** `rolloverExpiredSubscriptions` currently returns
  `{ transitioned: number }` only — the existing
  `.returning({ id: businessSubscriptions.id })` projects
  subscription IDs, not business IDs. To recompute after a batch
  flip we need the affected `business_id`s.

  **Decision:** Extend the projection to
  `.returning({ id: businessSubscriptions.id, business_id:
  businessSubscriptions.business_id })`. After the update, build a
  unique set of `business_id`s and iterate
  `recomputeBusinessTier(tx, business_id)` for each. The bulk flip
  AND every recompute happens inside one `db.transaction(...)`. Return
  shape stays `{ transitioned: number }` — caller (cron) doesn't need
  the per-row breakdown, but the receiving query DOES need it
  internally.

- **Concern:** Plan says strip `tier` from
  `BusinessUpdateInputSchema` and `BusinessCreateInputSchema`. The
  CreateInput's `tier` field is currently **required** — removing it
  means new businesses default to `tier3` at the DB level (the
  column has `.default("tier3")`). Verify nothing else in the
  insert path assumes `tier` is present.

  **Decision:** Verified — `createBusiness` in
  `packages/services/src/businesses/queries.ts:474` passes `tier:
  input.tier` to the insert; with `tier` removed from the validated
  input it falls through to the column default. Update
  `createBusiness` to drop the explicit `tier:` line so Drizzle picks
  up the column default. Acceptance test: insert a business without a
  tier field, confirm row materialises with `tier='tier3'`. Stale
  callers that still POST `tier` get a Zod "unrecognized key" error
  (the schemas are `.strict()`) — surface that as a warn-log only at
  the request boundary; don't change the validator semantics.

- **Concern:** Plan mentions an inline `warn-log` when a stale admin
  request includes a `tier` field. But because both schemas are
  `.strict()`, the request will fail with a 400 BEFORE reaching any
  service code. There's no point at which a `tier` field can pass
  Zod and still be ignorable.

  **Decision:** Drop the warn-log idea from the plan. The
  `.strict()` schemas reject unknown keys with a clean Zod error;
  that IS the boundary feedback. If observability of "client sent
  stale tier" turns out to matter, it lives in the request-layer
  middleware (which we don't have), not in the validator.

- **Concern:** Plan suggests `BusinessSchema.tier` stays in the
  client-facing row shape. But if every UI surface routes tier through
  `TIER_LABELS`, the public API still ships the raw `tier1`/`tier2`/
  `tier3` code, which mobile clients then need to map themselves.

  **Decision:** Stays as-is — `BusinessSchema.tier` ships the
  internal code. Web maps via `TIER_LABELS`. The Expo mobile app
  needs to do the same; mobile already imports from
  `@aira/validators`, so `TIER_LABELS` is available there day one.
  Adding a parallel `tier_label` field on the wire is a violation of
  "schemas are the single source of truth" (it would drift from
  TIER_LABELS the moment someone forgot to update both).

- **Concern:** Plan calls for a one-shot
  `backfillBusinessTiersFromActivePaidSubscriptions(db)` exposed
  under `/admin/cron`. The existing cron-runs table logs `cron_runs`
  with a `job_name`. The backfill isn't really a cron (it shouldn't
  re-run on a schedule) but using the same UI/audit surface is fine.

  **Decision:** Register the backfill under cron job name
  `"backfill_business_tiers_from_active_paid_subs"`. UI button reads
  "Run backfill (one-shot)". The job CAN re-run safely — it's
  idempotent (same active-paid set → same result). Each run writes a
  `cron_runs` row with `rows_affected` so the admin can see what
  changed if it does need to fire again.

- **Concern:** SubscriptionsSection per-row tier chip needs the
  plan's tier to render. Right now `subscriptions-section.tsx`
  imports `MembershipPlan` and shows plan name on rows. After Task 1
  the plan's tier is available; chip mapping is straightforward, but
  the current sub list fetch needs to confirm it returns
  `MembershipPlan.tier` to the row renderer.

  **Decision:** Audit the listSubscriptions and
  listMembershipPlans paths during Task 6 to confirm the new `tier`
  field flows through. If a fetch shape needs to widen, do it inside
  Task 6's commit (not a separate task) so the section commit
  doesn't ship half-functional.

### Suggestions (taken or deferred)

- **Taken:** Test coverage enumeration. The plan said "Vitest
  cases" without listing them. The implementation plan below
  enumerates the cases each task must cover.
- **Taken:** Bundle the public-facing tier2 "Featured" →
  "Sponsored Level 2" relabel in the same PR (the open question #5
  in the plan). Rationale: the single TIER_LABELS map is the source
  of truth; shipping it without applying it to business-card would
  re-introduce the inconsistency the plan calls out.
- **Taken:** Confirm `plan_id=null` contributes `tier3` (plan open
  question #3). Recompute pseudocode: `MIN(tier_numeric)` across the
  set of `(active && paid && plan_id IS NOT NULL)` subscriptions; if
  the set is empty, return `tier3`. A custom one-off contract
  without a plan_id therefore contributes `tier3`, even if the
  payment_status is `paid`.
- **Taken:** `<select>` over radios for the plan tier picker (plan
  open question #4). Matches the existing PlanForm compact layout.
- **Deferred:** Removing `businesses.tier` entirely (Option B in the
  plan's alternatives). Re-evaluate after this ships if drift
  persists.
- **Deferred:** Postgres trigger version (Option D in the plan's
  alternatives). App-layer recompute is the convention in this repo.
- **Deferred:** Adding mobile Expo screens for managing plans. Admin
  is web-only today; mobile admin is a separate plan.
- **Deferred:** Tier-sensitive design tokens (e.g. each tier chip
  using its `tier1`/`tier2`/`tier3` background color from
  `packages/config/src/design.ts`). The plan doesn't call for this;
  if support staff want a glance-by-color signal we can add a follow-up.

---

## Decisions locked

Net new decisions made during review (beyond the plan's locked-in
choices):

1. **API boundary: strip + `.strict()` reject.** `tier` removed from
   `BusinessUpdateInputSchema` and `BusinessCreateInputSchema`. The
   `.strict()` schemas reject stale clients with a Zod
   "unrecognized key" error — that's the only boundary feedback we
   need.
2. **Backfill exposure: `/admin/cron` Run-now button** under job
   name `backfill_business_tiers_from_active_paid_subs`. Idempotent;
   logged in `cron_runs`.
3. **Membership-plan tier picker:** native `<select>` with
   `TIER_LABELS` values. Matches existing PlanForm layout.
4. **Admin tier chip:** per-subscription row in SubscriptionsSection
   (using the plan's tier). Core Fields and the Edit modal lose the
   tier dropdown entirely.
5. **Transaction wrap:** every subscription-service mutation
   (`createSubscription`, `updateSubscription`, `deleteSubscription`,
   `rolloverExpiredSubscriptions`) runs its body + recompute inside
   one `db.transaction(...)`.
6. **`rolloverExpiredSubscriptions`** projects `business_id`
   alongside `id` in `.returning(...)` so the per-business
   recompute can run after the bulk flip.
7. **`recomputeBusinessTier(tx, business_id)`** is the helper
   signature. First arg is the active transaction (or the bare `db`
   for ad-hoc calls). Reads `findActivePaidPlansForBusiness(tx,
   business_id)`, computes `MIN(tier_numeric)` (skipping null
   `plan_id`), and writes `UPDATE businesses SET tier = $best WHERE
   id = $business_id`. If no active-paid subs, writes `tier='tier3'`.
8. **`plan_id IS NULL` contributes `tier3`.** Plan-less custom
   subscriptions don't entitle a business to anything above the
   default tier.
9. **`createBusiness` drops the explicit `tier:` insert column.**
   The DB column default (`tier3`) takes over.
10. **`BusinessSchema.tier`** (the wire shape) ships the internal
    code (`tier1`/`tier2`/`tier3`). Mobile + web map via
    `TIER_LABELS` on the client.
11. **Bundle `business-card.tsx` tier2 "Featured" →
    "Sponsored Level 2"** in the same PR — the TIER_LABELS map is
    the source of truth, and shipping it without applying it
    everywhere re-introduces the inconsistency.
12. **Migration applies `tier='tier3'` default to every existing
    `membership_plan` row.** No heuristics, no upgrades. Admin
    manually upgrades plans that should grant a higher tier.

---

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (one commit) and leaves the codebase build/test green.

### Task 1: Add `tier` column to `membership_plan` schema + migration

- **Files:**
  - `packages/db/src/schema/membership-plans.ts` (edit) — append
    `tier: text("tier").notNull().default("tier3")`
  - Auto-generated migration under
    `packages/db/drizzle/migrations/` (new)
- **What:** Add the tier column. Backfill on existing rows is
  automatic (NOT NULL DEFAULT 'tier3').
- **Acceptance:**
  - `pnpm db:generate` produces a single
    `ALTER TABLE "membership_plan" ADD COLUMN "tier" text NOT NULL
    DEFAULT 'tier3'`.
  - `pnpm db:migrate` applies cleanly.
  - `pnpm typecheck` passes.
- **Pause if:** generated migration includes anything destructive.

### Task 2: Export `TIER_LABELS` from `@aira/validators/businesses`

- **Files:**
  - `packages/validators/src/businesses.ts` (edit) — add
    `TIER_LABELS: Record<BusinessTier, string>` mapping
    `tier1 → "Sponsored"`, `tier2 → "Sponsored Level 2"`,
    `tier3 → "Regular"`
- **What:** Single source of truth for human labels. Plain const
  record next to `VALID_TIERS`. No new tests needed (it's a literal
  mapping; the Record type guarantees coverage of all tier codes).
- **Acceptance:**
  - `TIER_LABELS` importable from `@aira/validators` and
    `@aira/validators/businesses`.
  - TypeScript enforces exhaustive keys; missing a tier yields a
    compile error.

### Task 3: Add `tier` to `MembershipPlan` validators + strip from `Business` admin write schemas

- **Files:**
  - `packages/validators/src/membership-plans.ts` (edit) —
    `MembershipPlanSchema` gains `tier: BusinessTierSchema`;
    `MembershipPlanCreateInputSchema` gains
    `tier: BusinessTierSchema` (required);
    `MembershipPlanUpdateInputSchema` gains
    `tier: BusinessTierSchema.optional()`
  - `packages/validators/src/businesses.ts` (edit) —
    `BusinessUpdateInputSchema`: remove the `tier` line;
    `BusinessCreateInputSchema`: remove the `tier` line.
    `BusinessSchema.tier` (the row shape returned to clients)
    **stays**.
- **What:** Validator surface change. Mobile/web that still send
  `tier` get a Zod `unrecognized_keys` error (schemas are
  `.strict()`); that's the boundary feedback.
- **Acceptance:**
  - `pnpm typecheck` passes everywhere.
  - Any test or call site that constructs a
    `MembershipPlanCreateInput` now requires `tier`.
  - Sending `{ tier: "tier1" }` to PATCH
    `/api/v1/admin/businesses/[id]` returns a 400 Zod error.
- **Pause if:** any call site outside the touched files breaks the
  compile and the fix isn't obvious (e.g. another service constructs
  Business write payloads with tier; surface for triage).

### Task 4: Add `findActivePaidPlansForBusiness` + `recomputeBusinessTier` helpers

- **Files:**
  - `packages/services/src/business-subscriptions/queries.ts`
    (edit) — append
    `findActivePaidPlansForBusiness(db, businessId)` returning
    `Array<{ tier: BusinessTier }>`. SQL shape:
    `SELECT mp.tier FROM business_subscription bs INNER JOIN
    membership_plan mp ON bs.plan_id = mp.id WHERE bs.business_id =
    $1 AND bs.payment_status = 'paid' AND now() BETWEEN
    bs.start_date AND bs.end_date`. Note: the INNER JOIN
    automatically drops `plan_id IS NULL` rows (the locked
    decision).
  - `packages/services/src/business-subscriptions/service.ts`
    (edit) — append
    `recomputeBusinessTier(db, businessId)` that calls the helper,
    computes the minimum tier numeric code, and writes
    `UPDATE businesses SET tier = $best WHERE id = $businessId`.
    Empty active-paid set → write `tier3`. Helper is exported from
    the service barrel so other callers (cron, backfill, tests) can
    use it.
- **What:** Pure read + targeted write. No mutation outside the
  business's own tier column. Both functions take `db` as first arg
  so they're transaction-safe (the active `tx` is interchangeable
  with `db` in Drizzle).
- **Acceptance:**
  - Vitest cases: (a) one active paid sub with `plan.tier='tier1'`
    → business gets tier1; (b) two overlapping active paid subs
    with `tier1` + `tier2` → business gets tier1 (best wins);
    (c) only active sub has `plan_id=null` → business gets tier3
    (INNER JOIN drops it); (d) no active subs → business gets
    tier3; (e) only overdue subs exist → business gets tier3.
  - Service still exports the existing
    `createSubscription` / `updateSubscription` /
    `deleteSubscription` / `rolloverExpiredSubscriptions` and the
    new helpers.

### Task 5: Wrap subscription mutations + rollover in `db.transaction` and fire recompute

- **Files:**
  - `packages/services/src/business-subscriptions/service.ts`
    (edit) — wrap the bodies of `createSubscription`,
    `updateSubscription`, `deleteSubscription`,
    `rolloverExpiredSubscriptions` in `db.transaction(async tx =>
    {...})`. Each calls `recomputeBusinessTier(tx, business_id)`
    AFTER its primary mutation. For the rollover: collect distinct
    `business_id`s from the `.returning(...)` projection and loop
    the recompute. Returned shape from
    `rolloverExpiredSubscriptions` stays `{ transitioned: number }`
    so callers (the cron) don't change.
  - `packages/services/src/business-subscriptions/__tests__/service.test.ts`
    (new or extend if exists) — assert: (a) createSubscription
    triggers recompute; (b) deleteSubscription triggers recompute;
    (c) updateSubscription with status flip paid→overdue triggers
    recompute; (d) rolloverExpiredSubscriptions recomputes for
    every distinct business affected. Use chainable mock pattern
    consistent with `messages/__tests__/recipients-helper.test.ts`
    (or full in-memory store if needed).
- **What:** Transaction-safe propagation of subscription state to
  business tier.
- **Acceptance:**
  - All four mutations are wrapped in `db.transaction(...)`.
  - Recompute fires inside the transaction (same `tx`).
  - All previously-passing tests still pass.
  - New tests covering the 4 cases above pass.
- **Pause if:** the existing mock db can't model the new
  transaction surface and replacing it is non-trivial; surface for
  a decision (extend mock vs. write a separate test file).

### Task 6: Service `createBusiness` drops explicit `tier:` insert column

- **Files:**
  - `packages/services/src/businesses/queries.ts` (edit, around
    line 474) — remove the `tier: input.tier` line from the insert
    `.values({...})`. DB column default (`tier3`) takes over.
  - Any test fixture that constructed a `BusinessCreateInput` with
    `tier` is updated to omit it (the validator change in Task 3
    will surface these at typecheck).
- **What:** Make the insert path consistent with the new model:
  new businesses default to tier3 and rely on subscription
  activation to upgrade.
- **Acceptance:**
  - Inserting a new business via createBusiness produces a row
    with `tier='tier3'`.
  - `pnpm typecheck` + `pnpm test` pass.

### Task 7: Add `backfillBusinessTiersFromActivePaidSubscriptions` + `/admin/cron` button

- **Files:**
  - `packages/services/src/business-subscriptions/service.ts`
    (edit) — append
    `backfillBusinessTiersFromActivePaidSubscriptions(db):
    Promise<{ updated: number }>`. Iterate every business id;
    call `recomputeBusinessTier(db, id)`; track count of writes
    that changed the row. Idempotent.
  - `packages/services/src/cron/service.ts` (edit) — register the
    new job under
    `"backfill_business_tiers_from_active_paid_subs"`. Run it
    inside the cron-runs log just like the other admin-triggered
    jobs.
  - `apps/web/src/app/admin/cron/page.tsx` (edit) — add the new
    job to the visible Run-now list with a description like
    "One-shot: bring every business's `tier` column in line with
    its active paid subscriptions. Idempotent."
- **What:** Repeatable backfill exposed under the existing cron
  surface. Run after deploy; admin can re-trigger from the UI.
- **Acceptance:**
  - "Run now" button under `/admin/cron` for the new job.
  - Triggering it writes a `cron_runs` row with `rows_affected`
    matching the number of businesses whose tier was rewritten.
  - Re-running immediately yields `rows_affected = 0` (idempotent).

### Task 8: Membership plan UI — tier `<select>` + list-page chip

- **Files:**
  - `apps/web/src/app/admin/membership-plans/_components/plan-form.tsx`
    (edit) — add a `<select>` for the tier with options derived
    from `TIER_LABELS`. Default value for new plans: `tier3`.
    Wire into the POST/PATCH body.
  - `apps/web/src/app/admin/membership-plans/page.tsx` (edit) —
    list view shows the tier as a chip using `TIER_LABELS[plan.tier]`.
- **What:** Admin can declare the tier on new plans and edit it on
  existing ones; the list page shows it at a glance.
- **Acceptance:**
  - Create a new plan; the form requires a tier choice.
  - Edit an existing plan; the tier select shows the current
    value and saves on submit.
  - List page renders the tier chip per row using human labels.
  - `pnpm lint` passes (no brand-string violations introduced
    since "Sponsored" etc. are sourced from `TIER_LABELS`, not
    inline literals).

### Task 9: Admin business detail — drop tier dropdown, surface per-sub tier chip

- **Files:**
  - `apps/web/src/features/admin/components/business-detail.tsx`
    (edit) — remove the tier `<select>` from `CoreFieldsEditModal`
    and the `TierBadge` from `CoreFieldsPreview`. Leave the
    section header otherwise unchanged. Remove unused imports.
  - `apps/web/src/features/admin/components/subscriptions-section.tsx`
    (edit) — for each subscription row, surface a chip showing
    `TIER_LABELS[plan.tier]` when the row has an attached plan.
    If `plan_id IS NULL`, show "—" (no chip) so admin knows the
    sub doesn't grant a tier.
- **What:** Core Fields no longer pretends to control tier;
  Subscriptions section makes the linkage between plan and
  granted tier explicit.
- **Acceptance:**
  - `/admin/businesses/[id]` Core Fields modal: no tier select.
  - `/admin/businesses/[id]` Core Fields preview: no tier badge.
  - SubscriptionsSection: each row with a plan shows its tier
    chip using human labels.
  - Subscriptions row without a plan shows "—" for tier.
  - `pnpm lint` passes.
- **Pause if:** the existing `subscriptions-section.tsx` fetch
  shape doesn't include `plan.tier` (audit the data flow as part of
  the same task; if widening is needed, include it).

### Task 10: Admin businesses list table — tier column via `TIER_LABELS`

- **Files:**
  - `apps/web/src/app/admin/businesses/page.tsx` (edit) — replace
    the raw `{b.tier}` cell with
    `{TIER_LABELS[b.tier]}` (or use an `AdminBadge` with the
    label).
- **What:** Replace `tier1`/`tier2`/`tier3` text in the table with
  "Sponsored" / "Sponsored Level 2" / "Regular". Support staff
  see the same language users see.
- **Acceptance:**
  - The Tier column renders human labels.
  - Lint + typecheck pass.

### Task 11: Public listings — `TIER_LABELS` everywhere; fix tier2 "Featured" → "Sponsored Level 2"

- **Files:**
  - `apps/web/src/features/listings/components/business-card.tsx`
    (edit, around line 76) — replace the inline ternary
    `tier === "tier1" ? "Sponsored" : "Featured"` with
    `TIER_LABELS[tier]`. Drop the `"Featured"` literal.
  - `apps/web/src/features/listings/components/tier-section.tsx`
    (edit) — replace the local labels object with imports from
    `TIER_LABELS` everywhere it's used.
- **What:** The public-facing inconsistency (`business-card` says
  "Featured" for tier2; `tier-section` says "Sponsored Level 2")
  collapses to a single label coming from the shared map.
- **Acceptance:**
  - A tier2 business card displays "Sponsored Level 2".
  - No file outside `packages/validators/src/businesses.ts`
    contains the literal `"Sponsored"`, `"Sponsored Level 2"`, or
    `"Regular"` for tier-labeling purposes (other uses of those
    words in marketing copy are fine).
  - Lint + typecheck pass.

---

## Open questions

None blocking — all the plan's open questions and the review's
concerns have been resolved above. Items intentionally deferred and
tracked for later plans:

- Removing `businesses.tier` entirely (pure derivation at read time).
  Re-evaluate after this ships.
- Mobile (Expo) admin UI for editing membership plans.
- Per-tier color signal on chips using design tokens
  (`tier1`/`tier2`/`tier3` colors already exist in
  `packages/config/src/design.ts`).
- Adding a `tier_label` field to `BusinessSchema` on the wire so
  mobile doesn't need to import `TIER_LABELS`. Rejected this pass to
  keep the schema as the single source of truth.
