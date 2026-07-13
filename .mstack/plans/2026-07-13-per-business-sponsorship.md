# Plan: Per-business sponsorship model

**Date:** 2026-07-13
**Slug:** per-business-sponsorship
**Status:** reviewed
**Author:** framer@millionlabs.co.uk (via /mlabs-plan)
**Reviewed:** [.mstack/reviews/2026-07-13-per-business-sponsorship.md](../reviews/2026-07-13-per-business-sponsorship.md)

---

## Problem

The current sponsorship model is *per-category*: every sponsorship row has a `category_id`, and a business appears sponsored only on the listing page for that category. Two consequences hurt admins and clients:

1. **On `/admin/businesses/[id]` → "Add sponsorship"**, the admin has to pick a category from the full category tree — even though the business is already listed in specific categories. If the admin picks a category the business isn't in, the sponsorship silently doesn't render on any listing page. The client paid; nothing shows. There's no server-side validation preventing this and no visible error.

2. **The category question is redundant** — the business's category membership is already the source of truth for "which pages this business can appear on". Asking again in the sponsorship modal introduces a data invariant that must be maintained (sponsorship.category_id ∈ business_category rows), which the current codebase doesn't enforce. Any drift between the two silently breaks sponsorship display.

**Who benefits:** admins (fewer clicks, no invisible-mistake trap), clients (sponsorship shows up where they expect it — everywhere their business is listed), engineers (one less invariant to maintain).

**Success:** admin opens the sponsorship modal, picks tier + dates + amount, submits. Sponsorship displays that business as featured on every category listing page they're a member of. If the business is later added to a new category, the sponsorship automatically extends there (for its remaining term). If removed from a category, the sponsorship display naturally drops from that category — no orphan rows, no admin friction, no "reject this action" dialog.

## Scope

**In:**
- Drop `category_id` NOT NULL FK from `sponsorship` table (schema + migration).
- Data migration: collapse existing per-category sponsorship rows to per-business (dedup rule: for each business, keep the row with the highest tier priority; tie-break by latest end_date, then max amount_cents).
- Drop `max_slots` column from `sponsorship_tier` table + its check constraint (per user decision: drop caps entirely).
- Validators (`packages/validators/src/sponsorships.ts`, `sponsorship-tiers.ts`): remove `category_id` from sponsorship create/update input + output shapes; remove `max_slots` and `slots_used` from tier output.
- Service layer (`packages/services/src/sponsorships/service.ts`): remove the `max_slots`-enforcement block in `createSponsorship`; remove `countActiveSponsorships` query (no longer called).
- Server ops (`apps/web/src/server/operations/sponsorships.ts`): drop `category_id` from audit meta.
- Server ops (`apps/web/src/server/operations/sponsorship-tiers.ts`): remove `category_id` input param + the slot-annotation branch on the list op.
- Admin UI (`apps/web/src/features/admin/components/sponsorships-section.tsx`): remove Category dropdown + the category-driven re-fetch effect; remove tier slot-count annotation (`tierLabel`, "2/3 slots", "Full" disabled state); remove per-row Category column from the list table.
- Admin UI (`apps/web/src/app/admin/settings/sponsorship-tiers/_components/tier-form.tsx`): remove the `max_slots` input.
- Public display queries (`packages/services/src/businesses/queries.ts`): `sponsoredFlag`, `sponsoredTierPriority`, `sponsoredAmountCents`, `hasActiveSponsorshipInCategory`, `HAS_ACTIVE_SPONSORSHIP` — drop the `sp.category_id = (SELECT id FROM category WHERE slug = ...)` filter from each. Sponsored appearance becomes: "business has any active in-window sponsorship" AND "business is in the category being viewed" (the outer `business_category` join already handles the second half).
- One-off audit script (`packages/db/scripts/audit-orphan-sponsorships.ts`): report existing rows where `category_id` is not in the business's `business_category` set — informational only, no mutation. Per user decision: audit only, don't auto-fix.

**Out (deferred):**
- No changes to the mobile app (sponsorship admin isn't exposed there today).
- No pricing recalculation flow — the amount stored on the row stands as-is; the interpretation shifts (was "this category", becomes "all categories"), but no financial reconciliation is required for this plan. If the client wants to explicitly reprice the collapsed rows, that's a follow-up.
- No changes to `audit_log` history — old audit rows retain their `category_id` metadata; new writes just omit it. Audit is append-only.
- No rework of the sponsorship-tier CRUD UI beyond removing the `max_slots` input — tier priority + name stay unchanged.
- Sponsorship modal doesn't add new fields (e.g. an "applies to categories" multi-select for edge cases where the admin wants to sponsor in fewer categories than the business is in). If a client needs that, it's a separate plan.

## Approach

**Chosen: single-migration schema change with a follow-up data-audit script.** The schema change and code changes ship together in one review/code pass. Existing sponsorship rows are collapsed by a `pnpm db:generate`-generated migration that runs an aggregation query BEFORE the FK column is dropped. The audit script runs post-deploy to report any legacy rows we didn't collapse cleanly (should be zero if the migration works).

Structurally, this is a schema simplification + query rewrite + UI removal. The heaviest work is the migration's dedup step and the query rewrites in `businesses/queries.ts` — everything else is deletion. The change is coherent enough that a phased rollout (nullable column first, then drop) adds risk instead of removing it: leaving the app in a dual-model state where new rows are per-business and old rows are per-category multiplies the query complexity for the transition period, and the codebase isn't currently protected by feature flags for this surface.

Follows existing patterns:
- Drizzle schema + `pnpm db:generate` for migrations (per `CLAUDE.md` conventions).
- `packages/services/` for business logic (per ADR 0007) — `createSponsorship` stays in the service layer with the check removed; no validation moves up to the op layer.
- Zod schemas in `packages/validators/` are the boundary — updating them ripples through both `apps/web` (existing consumer) and any future mobile consumer.
- Public display queries stay in `packages/services/src/businesses/queries.ts` — no move.

**Alternatives considered:**

- **Option B — dual-model transition (make `category_id` nullable, keep both interpretations):** rejected. New per-business rows would have `category_id = NULL`; legacy per-category rows keep it. Display queries would need to handle both cases (`if category_id IS NULL, show sponsored in all business's categories; else, only in that category`). Doubles the query complexity for the transition period. Only worth it if we couldn't afford a coordinated deploy — we can, this is an MVP with low sponsorship row volume and a single deploy target.

- **Option C — keep the schema, treat `category_id` as vestigial metadata:** rejected. Change queries to ignore `category_id` (sponsored display looks up by business_id + status only), leave the column populated by legacy writes, stop writing it on new rows (or auto-fill from first business category). Simplest to ship in one PR but leaves dead data in the schema, an unclear-purpose FK, and a "just ignore this column" comment that will confuse the next person. Bad debt.

- **Option D — reject category removal when active sponsorship exists (the original edge-case plan):** rejected in favor of Reading A per user decision. Would preserve the current per-category model but forbid removing a business from a category it's currently sponsored in. Solves the invisible-mistake bug but keeps the redundant category question in the sponsorship modal and the maintenance burden of the invariant. User opted for the cleaner model.

## Data model changes

**`sponsorship` table** (`packages/db/src/schema/sponsorships.ts`):
- **Drop** `category_id` column + its FK to `category`
- **Drop** the `sp_cat_status_dates_idx` index (was `(category_id, status, start_date, end_date)`)
- **Add** replacement `sp_business_status_dates_idx` on `(business_id, status, start_date, end_date)` — supports the new "is this business sponsored" query.
- `sp_business_idx` (already exists on `business_id`) is preserved.

**`sponsorship_tier` table** (`packages/db/src/schema/sponsorship-tiers.ts`):
- **Drop** `max_slots` column
- **Drop** `st_max_slots_check` constraint

**Migration** (`packages/db/drizzle/migrations/00XX_per_business_sponsorship.sql`, generated + hand-augmented):

The generated migration will produce the DROP COLUMN statements. Before the `category_id` DROP, insert a dedup step:

```sql
-- Collapse per-category sponsorship rows to per-business.
-- Rule: for each business, keep the row with highest tier priority;
-- tie-break by latest end_date, then max amount_cents. Deletes the rest.
WITH ranked AS (
  SELECT
    s.id,
    s.business_id,
    ROW_NUMBER() OVER (
      PARTITION BY s.business_id
      ORDER BY
        COALESCE(st.priority, 999999) ASC,  -- lower priority number = higher tier
        s.end_date DESC,
        s.amount_cents DESC,
        s.id ASC  -- deterministic final tie-break
    ) AS rn
  FROM sponsorship s
  LEFT JOIN sponsorship_tier st ON st.id = s.tier_id
  WHERE s.status IN ('active', 'scheduled')  -- only dedup live rows
)
DELETE FROM sponsorship
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

**Note on the migration's dedup:** `active` and `scheduled` are collapsed. `expired` and `cancelled` rows are left untouched — they're historical, keep them per-category for the audit trail. Once `category_id` drops, those historical rows will have their column removed too, but their status prevents them from affecting display queries either way.

## Files to touch

**New:**
- `packages/db/scripts/audit-orphan-sponsorships.ts` — one-off audit script (report only, no mutation)

**Edit:**

*Schema + migration:*
- `packages/db/src/schema/sponsorships.ts` — drop `category_id`, swap index
- `packages/db/src/schema/sponsorship-tiers.ts` — drop `max_slots` + check
- `packages/db/drizzle/migrations/00XX_...sql` — generated + hand-augmented with dedup CTE

*Validators:*
- `packages/validators/src/sponsorships.ts` — remove `category_id` from create/update input + output schemas
- `packages/validators/src/sponsorship-tiers.ts` — remove `max_slots` + `slots_used` from tier output

*Services:*
- `packages/services/src/sponsorships/service.ts` — remove max_slots enforcement block in `createSponsorship`; remove `category_id` from insert values
- `packages/services/src/sponsorships/queries.ts` — remove `countActiveSponsorships` (no longer called); remove `category_id` from `toSponsorship` mapping if present
- `packages/services/src/businesses/queries.ts` — rewrite `sponsoredFlag`, `sponsoredTierPriority`, `sponsoredAmountCents`, `hasActiveSponsorshipInCategory`, `HAS_ACTIVE_SPONSORSHIP` to drop `sp.category_id = (...)` filters. The category-restriction is now implicit via the outer `business_category` join that already filters the listings query.

*Server ops:*
- `apps/web/src/server/operations/sponsorships.ts` — drop `category_id` from `business.sponsorship_assigned` audit meta
- `apps/web/src/server/operations/sponsorship-tiers.ts` — remove `category_id` from list input schema + the slot-annotation branch of the handler

*Admin UI:*
- `apps/web/src/features/admin/components/sponsorships-section.tsx` — remove Category `<select>` + label + `categoryId` state + `categories`/`baseTiers`/`annotatedTiers` distinction (one tier list now); remove `tierLabel` slot annotations + `isFull` disabled state; remove Category column from the row table
- `apps/web/src/app/admin/settings/sponsorship-tiers/_components/tier-form.tsx` — remove `max_slots` input + validation

**Not touched (verified during scoping):**
- `apps/mobile/*` — no sponsorship admin surface on mobile.
- `apps/web/src/app/api/v1/admin/sponsorship-tiers/*` — route files just delegate to ops; the op change is enough.
- Public `/listings/[category]/page.tsx` — consumes the `businesses/queries.ts` output; query rewrite is transparent to it.
- `packages/services/src/audit-log/*` — old audit rows keep their `category_id` meta as-is (append-only).

## Edge cases

- **Business in zero categories** — a sponsorship exists on a business that has been removed from every category. Under this model, the sponsorship appears nowhere (correctly — there's no listing page to feature them on). Not a bug: the sponsorship is inert until the business is added to at least one category. Consider adding a Renewals-page indicator "This business has an active sponsorship but is in 0 categories — will not display until you add a category" as a future UX polish (out of scope for this plan).

- **Business added to a new category mid-sponsorship** — sponsorship immediately extends to the new category (for its remaining term). This is a *feature*, not an edge case, but the client should be told about it because it affects perceived value ("if I add my restaurant to Catering too, I get sponsored there for free until my Gold expires").

- **Existing per-category rows with same business but conflicting attributes** — the dedup query picks one row and drops the rest, losing information (notes, amount, tier can differ across the dropped rows). Mitigation: the audit script runs BEFORE the migration in prod and reports the exact rows about to be collapsed, so admins can review + reprice if needed. The dedup CTE is deterministic (highest tier, latest end, max amount, then id) so the outcome is predictable.

- **Sponsorship display query performance** — dropping the `sp.category_id = (SELECT id FROM category WHERE slug=...)` filter makes each per-listing-page query touch more sponsorship rows. Cardinality is low today (a few dozen active sponsorships across the app); if it grows, the new `sp_business_status_dates_idx` should keep lookups fast. Monitor via Neon's slow query log after deploy.

- **Tier deactivation with active sponsorships** — pre-existing edge case, not touched by this plan. Deactivating a tier with active sponsorships still hides it from future picks (Tier admin flag `active = false`) but doesn't invalidate live rows. Same behavior post-change.

- **Cron rollover unchanged** — `transitionSponsorshipsToActive` / `transitionSponsorshipsToExpired` operate on `status` + date columns, unaffected by the `category_id` drop.

## Acceptance criteria

- [ ] Schema migration applied cleanly against dev and prod Neon branches; no orphan `category_id` references remain on the `sponsorship` table.
- [ ] Dedup step in the migration reduces multi-row per-business active/scheduled rows to one row per business; verified by comparing pre/post counts on staging (audit script output before, `SELECT COUNT(*) FROM sponsorship WHERE status IN ('active','scheduled') GROUP BY business_id HAVING COUNT(*) > 1` returns zero rows after).
- [ ] `max_slots` column and check constraint no longer exist on `sponsorship_tier`; the tier admin form has no "Max slots" input.
- [ ] On `/admin/businesses/[id]` → "Add sponsorship" modal:
  - No Category field visible or requested.
  - Tier dropdown shows tier name + priority (no "2/3 slots" / "Full" annotation).
  - Submitting with tier + dates + amount creates a sponsorship row with no `category_id`.
- [ ] On any category listing page `/listings/<slug>`, businesses with active sponsorships appear in the sponsored/featured section IFF they're in that category via `business_category`. Verified against 2+ businesses: one sponsored + in the category (should appear), one sponsored but NOT in the category (should NOT appear).
- [ ] A business added to a new category after its sponsorship starts appears sponsored on that new category's listing page without a new sponsorship being created (test manually + `hasActiveSponsorshipInCategory` returns `true`).
- [ ] Removing a business from a category succeeds without any confirmation dialog or blocking error, even when an active sponsorship exists (the sponsorship survives, just stops displaying on that category's page).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all clean.
- [ ] Audit script `pnpm db:audit-orphan-sponsorships` runs against staging and returns "0 orphans" (or reports any residual, to be investigated before prod deploy).

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation:

- **Tier admin form UX after removing `max_slots`** — is `name + priority + active` enough, or should the tier form communicate the new "priority sorts, no caps" model somewhere (e.g., a helper text under the tier list on `/admin/settings/sponsorship-tiers`)?

- **Migration ordering vs staging deploy** — the dev environment likely has test/seed rows that will be collapsed by the dedup. Do we want the audit script run BEFORE the migration on staging (so we can eyeball what's about to be dropped), or is the dedup CTE trusted enough to run direct? Recommendation: run audit on staging first, sanity-check, then apply migration. Prod row count is currently low so the risk is small either way.

- **Should the sponsorship modal show which categories this sponsorship will appear on?** After removing the category field, admins won't have a direct visual link between "attaching a sponsorship" and "which listing pages this affects". A read-only helper line — e.g., "This sponsorship will feature the business on: Restaurants, Catering (based on the business's current categories)" — would keep that context visible. Recommendation: include. Add to the plan explicitly during review if agreed.

- **Handling of the `sp.category_id` in `audit_log.meta`** — legacy audit rows have `category_id` in their JSON meta. New audits omit it. Do we care about consistency in the audit rendering UI, or is "old rows have extra keys, new rows don't" acceptable? Recommendation: acceptable — audit is append-only and the meta shape has always been flexible per-action.

- **Renewal-reminder implications** — the renewal reminder cron currently iterates business subscriptions, not sponsorships, but confirm sponsorship expiry is also surfaced somewhere so admins get warned before a Gold sponsorship silently expires. If not, that's a separate plan (out of scope here).
