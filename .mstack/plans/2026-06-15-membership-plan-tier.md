# Plan: Membership-plan-derived placement tier + user-facing labels

**Date:** 2026-06-15
**Slug:** membership-plan-tier
**Status:** implemented
**Author:** mlabs-plan

---

## Problem

Today the placement-tier model has a real gap that confuses admins and
support staff alike:

1. **`businesses.tier`** is a free-form `tier1`/`tier2`/`tier3` column an
   admin sets manually in Core Fields on the business detail page.
2. **`membership_plan`** carries `name`, `price_cents`, `duration_months` —
   **no tier**. It's billing-only.
3. **`business_subscription`** tracks `payment_status` only — it doesn't
   know what placement the customer paid for.

So selling a "Premium" plan requires the admin to remember to bump
`businesses.tier` to `tier1` in a *separate* place. The two values drift,
and support staff can't tell from looking at one what the customer
actually bought. Worse, the dropdown values surfaced in admin UI are
internal codes (`Tier 1` / `Tier 2` / `Tier 3`) that the public app
**never shows** — the public labels are "Sponsored" (tier1),
"Sponsored Level 2" (tier2), and no badge / "Regular" (tier3). There's
also an inconsistency where `business-card.tsx:76` calls tier2 "Featured"
but `tier-section.tsx:12` calls it "Sponsored Level 2".

Net effect: a customer pays for "Premium", the admin forgets to update
the tier, and the listing shows as Regular publicly while the support
staff member sees "Tier 1" in admin and assumes everything is fine. Or
the admin upgrades the tier but the subscription expires and the column
keeps showing the stale value.

Success looks like: each membership plan declares the placement it grants;
selling a plan and activating its subscription propagates the tier
automatically; the admin tier dropdown is removed; every UI surface
(admin + public) speaks the same human label.

---

## Scope

**In:**

- New column on `membership_plan`: `tier` (text, NOT NULL, default
  `'tier3'`), constrained to the existing `VALID_TIERS` union
  (`tier1` | `tier2` | `tier3`). Internal codes stay the same; only the
  UI labels change.
- Migration backfills every existing `membership_plan` row to
  `tier='tier3'` so nobody silently gets an upgrade.
- Subscription-service layer: when a subscription is created or its
  `plan_id` / `payment_status` changes, recompute the owning business's
  effective tier from its **active paid subscriptions** and write it to
  `businesses.tier`. The "active paid" predicate matches the existing
  `IS_PAID_ACTIVE` SQL in `packages/services/src/businesses/queries.ts`.
- Recompute also fires on `deleteSubscription` and on
  `rolloverExpiredSubscriptions` (the daily cron flipping paid → overdue).
- Existing public-read `EFFECTIVE_TIER` logic stays as-is: lapsed
  subscriptions still collapse to `tier3` on the public render even
  though the stored column may still show the last entitled value.
  That's intentional — the column is the **last-granted entitlement**,
  the public display is **the currently-rendered tier**.
- Admin UI changes (`apps/web/src/features/admin/components/business-detail.tsx`):
  - Remove the tier dropdown from the Core Fields edit modal.
  - Remove the `TierBadge` from the Core Fields preview. Tier moves to
    the Subscriptions section preview where it makes sense in context
    (next to the subscription that grants it).
- Admin membership-plan UI (`apps/web/src/app/admin/membership-plans/`):
  - Plan create form gains a tier select with human labels ("Sponsored",
    "Sponsored Level 2", "Regular").
  - Plan edit form gains the same select.
  - Plan list shows the tier as a chip per row.
- Public-facing label normalization: `business-card.tsx:76` switches
  tier2 from "Featured" to "Sponsored Level 2" so it matches
  `tier-section.tsx`.
- A single shared label map (`packages/validators/src/businesses.ts`
  → `TIER_LABELS`) exported alongside `VALID_TIERS`. Every UI surface
  imports from there so the labels can't drift again.
- Validators: `MembershipPlanSchema`, `MembershipPlanCreateInputSchema`,
  `MembershipPlanUpdateInputSchema` gain a `tier: BusinessTierSchema`
  field (required on create; optional on update).
- Admin businesses list (`apps/web/src/app/admin/businesses/page.tsx`):
  the table currently shows the raw `tier1` / `tier2` / `tier3` value
  in the Tier column — switch to the human label via `TIER_LABELS`.
- Backfill cron / one-shot script: for every business with at least one
  active paid subscription whose plan has a tier higher than `tier3`,
  copy that tier onto the business row. Run once after the migration.

**Out (deferred):**

- Removing `businesses.tier` entirely. The column stays as a denormalised
  cache (write path on subscription mutations, read path unchanged).
  Pure derivation at read time is cleaner but bigger schema risk; revisit
  if drift turns out to still be a problem in practice.
- Manual override / admin escape hatch. The user explicitly chose "fully
  derived, no manual override." Compensating a customer with temporary
  upgraded placement = create a temporary plan + subscription, not a
  one-click override.
- Per-city tier differences. Tier semantics are global — "Sponsored"
  means the same in any city, even though plans themselves are per-city.
- Multi-tier comparison logic: when a business has overlapping active
  paid subscriptions with different tiers, take the **best** (lowest
  numeric tier code). This is the obvious rule; documented inline but
  not surfaced in UI.
- Migrating tier1/2/3 codes in the database. The user explicitly chose
  to keep the internal codes and relabel only in UI.
- Active-paid recompute via Postgres trigger. App-layer recompute fits
  the existing service pattern.
- Sponsorship tiers — totally separate concept (per-category
  sponsorship purchases with their own table). Not touched here.
- Mobile (Expo) admin UI for editing membership plans — admin lives on
  web only today.

---

## Approach

**Chosen: denormalised `businesses.tier` cache, written by the
subscription service when subscriptions mutate.**

The existing public-read pipeline (`getBusinessesByCategory`,
`getFeaturedBusinesses`, `getBusinessById`) already uses an
`EFFECTIVE_TIER` SQL expression that collapses lapsed subscriptions to
`tier3`. That logic stays untouched. What changes is *who writes
`businesses.tier`*:

- **Today:** admin manually edits the dropdown in
  `BusinessAdminDetail` → `runUpdate` → PATCH
  `/api/v1/admin/businesses/[id]` → service write.
- **After:** subscription service recomputes after every mutation that
  could change the active-paid set:
  `createSubscription`, `updateSubscription`, `deleteSubscription`, and
  the `rolloverExpiredSubscriptions` cron. The recompute reads every
  subscription for the business, finds the **best tier** across the
  active-paid set, and writes it to `businesses.tier`. If no
  subscriptions qualify, the column drops to `tier3`.

The "best tier across active paid" function lives in
`packages/services/src/business-subscriptions/service.ts` as a private
helper `recomputeBusinessTier(db, businessId)`. Every public mutation
calls it inside the same transaction so a partial state can't escape.

Why denormalised cache rather than pure derivation:

- The existing `businesses_tier_idx` and `businesses_category_tier_idx`
  composite indexes carry hot listing reads. Removing the column would
  require new compound indexes on
  `business_subscription(business_id, payment_status, end_date)` and a
  more complex subquery in every public read.
- The existing `EFFECTIVE_TIER` SQL already handles the lapsed-sub case;
  no read-side changes are needed.
- The write path is contained to the subscription service (which is
  also where the relevant data lives), so the surface area for drift is
  small and easy to test.

UI changes are mechanical: replace the tier dropdown in
`business-detail.tsx` with a read-only label, add the tier select to
the membership-plan form, normalize the tier2 label, and route
everything through one `TIER_LABELS` map.

### Tier-label mapping (the single source of truth)

```ts
// packages/validators/src/businesses.ts
export const TIER_LABELS: Record<BusinessTier, string> = {
  tier1: "Sponsored",
  tier2: "Sponsored Level 2",
  tier3: "Regular",
}
```

Every UI surface (admin tier chip, admin plan form, business card badge,
tier-section header, business detail page) imports from here. The
`business-card.tsx:76` inconsistency where tier2 was called "Featured"
disappears in the same edit.

### Alternatives considered

- **Option B — Remove `businesses.tier` entirely; derive at read time.**
  Rejected for this pass because: existing indexes get reworked, the
  EFFECTIVE_TIER subquery becomes a 3-table correlated subquery (current
  is 1-table), and the change ripples into every public read query +
  `attachRelations`. The denormalised cache gets us to the same product
  outcome with much less churn. Promote to Option A if drift turns out
  to recur even after this fix.
- **Option C — Manual override flag (`tier_override` boolean).**
  Rejected because the user explicitly chose "no manual override". An
  override re-introduces exactly the kind of drift this plan is trying
  to eliminate, traded for a marginal flexibility win (which the
  "create a temporary plan" workflow already covers).
- **Option D — Postgres trigger on `business_subscription` writes.**
  Rejected because no other domain in this codebase uses triggers, the
  recompute logic ("best tier across active-paid subs") is non-trivial
  PL/pgSQL, and trigger logic is harder to test than an app-layer
  function. App-layer recompute fits the existing service pattern
  (e.g. `notifications.createNotification` cross-domain fan-out,
  `messages.sendMessage` participant fan-out).
- **Option E — Heuristic backfill of existing plans by name.**
  Rejected because the existing plan names (e.g. "Premium 12-Month")
  might or might not actually mean Sponsored placement; making a
  string-matching guess could silently grant entitlement the customer
  didn't pay for. All existing plans go to `tier3`; admin manually
  upgrades plans that should grant higher tiers.

---

## Data model changes

### `membership_plan` — new column

```ts
tier: text("tier").notNull().default("tier3"),
```

CHECK constraint via the existing Zod `VALID_TIERS` enforcement at the
service / validator boundary (matching the existing pattern on
`businesses.tier`). Plan rows can never have an unrecognised tier value
because no public surface accepts free text — only `BusinessTierSchema`.

Migration (auto-generated by `pnpm db:generate`):

```sql
ALTER TABLE "membership_plan" ADD COLUMN "tier" text NOT NULL DEFAULT 'tier3';
```

### `businesses` — no schema change

The column stays. Only the write path changes (subscription service
now owns it; the admin PATCH `/api/v1/admin/businesses/[id]` body
schema drops `tier`).

### One-shot backfill

After the migration applies, run a one-shot service function to bring
every existing business in line:

```ts
// packages/services/src/business-subscriptions/service.ts
export async function backfillBusinessTiersFromActivePaidSubscriptions(
  db: Database,
): Promise<{ updated: number }>
```

Iterates every business, recomputes from active-paid subs, writes the
column if it changed. Idempotent. Exposed as an admin "Run now" button
under `/admin/cron` so it can be retriggered if needed.

---

## Files to touch

**New:**

- Migration file under `packages/db/drizzle/migrations/` (auto-generated)
- `packages/services/src/business-subscriptions/__tests__/service.test.ts`
  — extend with recompute + backfill cases (test file may not exist;
  create if so).

**Edit:**

- `packages/db/src/schema/membership-plans.ts` — add the `tier` column.
- `packages/validators/src/businesses.ts` — export `TIER_LABELS`
  alongside `VALID_TIERS` / `BusinessTierSchema`.
- `packages/validators/src/membership-plans.ts` — add
  `tier: BusinessTierSchema` to `MembershipPlanSchema`,
  `MembershipPlanCreateInputSchema` (required), and
  `MembershipPlanUpdateInputSchema` (optional).
- `packages/validators/src/businesses.ts` —
  `BusinessAdminUpdateInputSchema` (or wherever the admin PATCH input
  lives): drop `tier` from the accepted fields so admins can't write to
  the column manually anymore.
- `packages/services/src/business-subscriptions/service.ts` — add
  `recomputeBusinessTier(db, businessId)` private helper; wire it into
  `createSubscription`, `updateSubscription`, `deleteSubscription`,
  `rolloverExpiredSubscriptions`. Add the public-facing
  `backfillBusinessTiersFromActivePaidSubscriptions(db)`.
- `packages/services/src/business-subscriptions/queries.ts` — new
  helper `findActivePaidPlansForBusiness(db, businessId)` returning
  `Array<{ tier: BusinessTier }>` for the recompute.
- `apps/web/src/features/admin/components/business-detail.tsx` —
  remove tier dropdown from `CoreFieldsEditModal`; remove the
  `TierBadge` from `CoreFieldsPreview` (move to a small chip inside
  the Subscriptions section preview, sourced from
  `business.tier` via `TIER_LABELS`).
- `apps/web/src/features/admin/components/subscriptions-section.tsx`
  — surface the active plan's tier inline (a chip near each
  subscription row) so admin sees the linkage.
- `apps/web/src/app/admin/businesses/page.tsx` — list table Tier
  column: replace the raw `tier1`/`tier2`/`tier3` text with
  `TIER_LABELS[b.tier]`.
- `apps/web/src/app/admin/businesses/new/page.tsx` (and the form
  component): remove the tier field from the create form. New
  businesses default to `tier3`; subscription activation upgrades them.
- `apps/web/src/app/admin/membership-plans/new/page.tsx` and
  `apps/web/src/app/admin/membership-plans/[id]/page.tsx` — add a tier
  select (with `TIER_LABELS` values shown).
- `apps/web/src/app/admin/membership-plans/page.tsx` — list shows the
  plan's tier as a chip.
- `apps/web/src/features/listings/components/business-card.tsx:76` —
  swap the inline `"Sponsored"` / `"Featured"` ternary for
  `TIER_LABELS[tier]`.
- `apps/web/src/features/listings/components/tier-section.tsx` —
  drop the inline labels object; pull from `TIER_LABELS`.

---

## Edge cases

- **Subscription created with `plan_id = null`** (custom one-off
  contract). No plan → no tier signal → recompute treats it as
  contributing `tier3`. If it's the only sub, the business sits at
  `tier3`. Document inline.
- **Multiple overlapping active-paid subscriptions with different
  tiers.** Take the best (lowest numeric tier code). Document and test.
- **Subscription `payment_status` flipped paid → overdue by the cron.**
  Cron now calls `recomputeBusinessTier` for every business whose sub
  was transitioned. Batch-friendly: the cron returns the affected
  business_ids, then a single pass recomputes each.
- **Subscription end_date extended forward** (admin extends a paid
  sub). Recompute fires from `updateSubscription`. Result: column may
  not change but the recompute is cheap and idempotent.
- **Subscription deleted while business still has another active
  paid sub.** Recompute picks up the remaining active-paid set.
- **Last subscription deleted.** Recompute writes `tier3`.
- **Migration adds `tier='tier3'` default to every existing plan.**
  Existing subscriptions for those plans recompute to `tier3` after
  backfill. No business gets a silent upgrade.
- **Admin PATCH body still contains `tier`.** Validator strips it (the
  field is dropped from the accepted union); the PATCH succeeds and
  the column is unchanged. Acceptable, but log a warn so we can spot
  stale clients.
- **Subscription create races a subscription update for the same
  business.** Recompute reads the current set after its own write
  inside the same transaction; the last commit wins for the column
  write, which is fine because the read is always "best across all
  active-paid".
- **Sponsorship tiers are unrelated.** Confirmed; this plan does not
  touch `sponsorship_tier` or `sponsorship` tables.
- **Public listings cache.** The existing `EFFECTIVE_TIER` SQL already
  uses the live `businesses.tier` value. After this change it still
  does. No cache invalidation needed.

---

## Acceptance criteria

- [ ] `membership_plan` has a `tier` text column; migration applies via
      `pnpm db:migrate`; existing rows backfilled to `tier='tier3'`.
- [ ] `MembershipPlanSchema`, `MembershipPlanCreateInputSchema`,
      `MembershipPlanUpdateInputSchema` include the `tier` field.
- [ ] Creating a membership plan via `/admin/membership-plans/new`
      requires a tier choice; the form shows "Sponsored", "Sponsored
      Level 2", "Regular" as options (no "Tier 1/2/3").
- [ ] Editing an existing plan can change the tier via
      `/admin/membership-plans/[id]`.
- [ ] After creating a subscription with `payment_status='paid'`
      pointing at a plan with `tier='tier1'`, the owning business's
      `tier` column updates to `tier1` automatically.
- [ ] Setting that subscription to `payment_status='overdue'` (or
      letting the cron do it) drops the business's `tier` back to
      `tier3` (or to the best of the remaining active-paid subs).
- [ ] Deleting the only active-paid subscription drops the column to
      `tier3`.
- [ ] Admin business detail Core Fields modal has NO tier dropdown.
- [ ] Admin business detail Core Fields preview has NO tier badge.
- [ ] Admin Subscriptions section shows the plan's tier as a chip on
      each subscription row using human labels.
- [ ] Admin businesses list table renders "Sponsored" / "Sponsored
      Level 2" / "Regular" (not `tier1`/`tier2`/`tier3`).
- [ ] Public business-card badge for tier2 reads "Sponsored Level 2"
      (not "Featured"), consistent with `tier-section.tsx`.
- [ ] `TIER_LABELS` is exported from `packages/validators` and is the
      sole source of label text used by every UI surface (verified via
      grep: no other file contains the string `"Sponsored"` /
      `"Sponsored Level 2"` / `"Regular"` for tier purposes).
- [ ] One-shot
      `backfillBusinessTiersFromActivePaidSubscriptions(db)` runs after
      the deploy and brings every business in line with its active
      paid subs.
- [ ] PATCH `/api/v1/admin/businesses/[id]` no longer accepts a `tier`
      field; sending one yields a Zod validation error (or is silently
      stripped — reviewer to decide on the boundary behavior).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass.
- [ ] Lefthook hooks (`check-migrations`, `check-no-server-actions`,
      `check-contrast`) green on every commit.

---

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Strip vs reject** when an admin PATCH body still includes `tier`.
   Plan defaults to strip + warn (so stale mobile clients don't break);
   reviewer can flip to reject if security-by-contract is preferred.
2. **`backfillBusinessTiersFromActivePaidSubscriptions` exposure.**
   Plan suggests exposing it as a "Run now" button under `/admin/cron`.
   Alternatively: run it inline as part of the migration / deploy
   script and not expose any UI. Reviewer to pick.
3. **Subscription create with `plan_id=null`** — confirm the rule that
   such a sub contributes `tier3` to the recompute (i.e. existence of
   any plan-less paid sub does NOT upgrade the business beyond
   `tier3`). Reviewer to confirm.
4. **Membership-plan tier UI affordance.** Plan calls for a `<select>`
   with `TIER_LABELS` values. Alternative: three radio buttons with a
   small descriptor under each ("Top placement", "Mid placement",
   "Standard listing"). Reviewer to pick the affordance.
5. **Should the public business-card "Featured" → "Sponsored Level 2"
   relabel ship in the same PR?** It's a public-facing label change.
   Reviewer to decide whether to bundle it (simpler PR) or split it
   off (lower-risk admin-only shipping).
6. **Does `BusinessCreateInput` need to keep accepting `tier`?** New
   businesses default to `tier3`; subscription activation upgrades them.
   If `tier` is removed from the create input, the admin can't seed a
   business with a non-`tier3` value (which is correct per the new
   model). Reviewer to confirm.
