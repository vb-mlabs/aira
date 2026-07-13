# Plan: Placement is sponsorship-only (drop membership tier)

**Date:** 2026-07-13
**Slug:** placement-single-axis
**Status:** reviewed
**Author:** framer@millionlabs.co.uk (via /mlabs-plan)
**Reviewed:** [.mstack/reviews/2026-07-13-placement-single-axis.md](../reviews/2026-07-13-placement-single-axis.md)

---

## Problem

Placement on category listing pages is currently controlled by **two overlapping axes**:

1. **Subscription tier** — `membership_plan.tier` (tier1/tier2/tier3) copies through `recomputeBusinessTier` into `businesses.tier`. Applied as a secondary sort key via `TIER_ORDER` in `packages/services/src/businesses/queries.ts:46`. Also drives the 3-section grouping ("Sponsored" / "Sponsored Level 2" / "Regular") on both web + mobile listing pages.
2. **Sponsorship** — per-business row (post the per-business-sponsorship refactor shipped this session) with a dynamic tier catalog (`sponsorship_tier` — admin-created rows with name + priority). Applied as a *primary* sort key via `SPONSORED_FLAG` + `SPONSORED_TIER_PRIORITY`.

Both axes affect the same thing (where a business sorts on the category page). Admins have to reason about "did the customer pay via a tier1 subscription or via sponsorship? which one wins?" — the answer is "sponsorship first, then subscription tier" but that's implicit in the ORDER BY, not obvious anywhere admin-facing. The labels give the game away: `TIER_LABELS = { tier1: "Sponsored", tier2: "Sponsored Level 2", tier3: "Regular" }` — the words "Sponsored"/"Sponsored Level 2" already describe what sponsorship should be, but they're bolted onto the subscription tier.

**Who benefits:**
- **Admins** stop making a Placement decision at plan-creation time. One product per axis: subscription = are they listed, sponsorship = where do they appear.
- **Clients** get a cleaner pricing story ("membership gets you listed, sponsorship gets you featured").
- **Engineers** delete a whole tier subsystem (schema columns, backfill cron, recompute service, tier grouping components on web+mobile, tier validators).

**Success:**
- Admin creates a membership plan → no Placement dropdown, no tier concept anywhere in the flow.
- Business subscribes to a plan → they appear on their category listing pages, sorted alphabetically within the un-sponsored pool.
- Admin buys a sponsorship for a business → they jump to the top section, in the display slot the sponsorship's tier is flagged as (top / mid / regular).
- Listing pages (web + mobile) render 3 sections whose composition is driven entirely by sponsorship.

## Scope

**In:**

- **Schema drops:** `membership_plan.tier`, `businesses.tier` (+ indexes `businesses_category_tier_idx`, `businesses_tier_idx`, plus the `.on(category, tier)` unique-index reference).
- **Schema add:** `sponsorship_tier.display_slot` — a new column, enum `'top' | 'mid' | 'regular'`, NOT NULL, no default at the schema level (admin decides per tier; migration seeds existing rows via a hand-augmented step — see Data Model).
- **Validators:** remove `VALID_TIERS`, `TIER_LABELS`, `BusinessTier`, `BusinessTierSchema` from `packages/validators/src/businesses.ts`. Add `DISPLAY_SLOTS` (`['top', 'mid', 'regular']`) and `DisplaySlot` + label map (`Top / Mid / Regular` or whatever the admin wants — see Open Questions) to `packages/validators/src/sponsorship-tiers.ts`. Update `SponsorshipTierSchema` / `Create` / `Update` to include `display_slot`.
- **Services:** delete `recomputeBusinessTier` + `backfillBusinessTiersFromActivePaidSubscriptions` + `findActivePaidPlansForBusiness` (or trim `tier` off it if still used elsewhere) from `packages/services/src/business-subscriptions/service.ts` and `queries.ts`. Delete every call site (subscription create/update/delete). Update `packages/services/src/membership-plans/service.ts` + `queries.ts` — drop `tier` from insert values, output shape. Update `packages/services/src/sponsorship-tiers/service.ts` — accept `display_slot` on create/update.
- **`businesses/queries.ts` rewrite:** delete `IS_PAID_ACTIVE`, `EFFECTIVE_TIER`, `TIER_ORDER` (`VISIBLE` stays — still gates "am I listed"). New sort: `SPONSORED_FLAG` (0/1), sort within sponsored by the display slot precedence (top → mid → regular), then within-slot by `SPONSORED_TIER_PRIORITY`, then `desc(SPONSORED_AMOUNT_CENTS)`, then `asc(businesses.name)`.
- **Listing-page structure (web):** rewrite `apps/web/src/features/listings/components/{listing-view,directory-view,tier-section,business-card}.tsx`. **User-facing structure is TWO sections: "Sponsored" and "Regular".** The three admin-side slots (Top / Mid / Regular) drive **within-section ordering + visual differentiation**, not separate section headers.
  - **Sponsored section header** contains: businesses whose sponsorship's tier has `display_slot = 'top'` first (rendered with the top-slot visual treatment — see design token note below), then `display_slot = 'mid'` (rendered with the mid-slot visual treatment).
  - **Regular section header** contains: businesses whose sponsorship's tier has `display_slot = 'regular'` (sponsored — appear first inside the section, no distinguishing color) then all unsponsored (alphabetical).
  - Users never see the words "Level 2" or "Top" or "Mid" — those are admin/pricing plumbing. The subtle color difference inside Sponsored is the only surface hint that there's a hierarchy.
  - Design tokens for the two Sponsored sub-treatments need to be picked (or existing tier tokens repurposed) — see Open Questions.
- **Listing-page structure (mobile):** matching changes in `apps/mobile/app/(app)/listings/[category].tsx`, `apps/mobile/features/listings/components/{TierPill,TierSection}.tsx`. Same TWO-section user model + within-Sponsored color differentiation.
- **Admin plan form + list:** remove Placement dropdown from `apps/web/src/app/admin/settings/membership-plans/_components/plan-form.tsx`. Remove Placement column from `apps/web/src/app/admin/settings/membership-plans/page.tsx`.
- **Admin sponsorship-tier form:** add `display_slot` `<select>` — three options (Top / Mid / Regular). Update `apps/web/src/app/admin/settings/sponsorship-tiers/_components/tier-form.tsx` + the tier-list page to show the slot column.
- **Admin businesses list:** drop the tier badge column from `apps/web/src/app/admin/businesses/page.tsx`.
- **Admin subscriptions section:** drop the "Placement" chip column from `apps/web/src/features/admin/components/subscriptions-section.tsx` (row rendering only — the underlying `sub.plan_id` still exists, we just stop reading `.tier`).
- **Admin dashboard stat (`apps/web/src/app/admin/page.tsx:63-65`):** replace `tier1/tier2/tier3` counts with slot-driven counts computed the same way the listing page does (Top / Mid / Regular). Same three cards, new axis.
- **Cron:** remove `apps/web/src/lib/cron/backfill-business-tiers.ts` + its registration in `apps/web/src/lib/cron/registry.ts`.
- **Audit script:** new `packages/db/scripts/audit-subscription-tier-holders.ts` — reports every business whose *currently active + paid* subscription plan has `tier IN ('tier1', 'tier2')`. Output: business name, current subscription plan name, plan's tier, subscription end date. Feeds the client conversation ("these customers are losing their subscription-derived placement — reach out and offer a courtesy sponsorship if you want to preserve their experience"). Read-only; no mutation.

**Out (deferred):**

- **No auto-mint of courtesy sponsorships** for existing tier1/tier2 subscribers. Per user decision: audit-and-notify only. The client decides per-customer.
- **No visual redesign of business cards.** The tier-derived badge disappears; the sponsorship badge stays as-is. Card layout, typography, spacing unchanged.
- **No renaming of `sponsorship_tier` to something else.** It's still an admin-editable catalog of named tiers with priority — the only addition is `display_slot`. If a future plan wants to collapse it to a fixed 3-item enum (as one AskUserQuestion option floated), that's a separate scope.
- **No changes to the sponsorship modal itself** — the Add-Sponsorship dialog shipped this morning (task 4 of the per-business-sponsorship review) continues to work; the tier picker still lists the admin-created tiers, which now carry an implicit slot flag but the modal doesn't need to render it.
- **No stripe / billing changes.** Neither product's price is affected. Existing paid subscriptions keep their current price; the client's outreach can decide whether to comp / discount / do nothing on a case-by-case basis.
- **No touching `businesses.category` (primary category slug) or `business_category` (extras join).** Category membership is orthogonal to placement — placement drops don't affect who appears on which category page.

## Approach

**Chosen: single coordinated schema+code change, ship in a stack of atomic commits behind a plan/review/code/QA pass.** Same pattern as the per-business-sponsorship refactor shipped this morning. The schema shrink (drop `membership_plan.tier`, drop `businesses.tier`, add `sponsorship_tier.display_slot`) and the code changes that consume those fields must land together to compile — a dual-model transition period doesn't buy anything for an MVP with low row counts and a single deployment target.

Task ordering (skeleton for the reviewer to firm up):

1. **Audit script + baseline** — read-only; identifies current tier1/tier2 paid subscribers to feed the client conversation.
2. **Schema + migration + backend refactor** — drop the two `tier` columns, add `display_slot`, hand-augment migration to seed `display_slot` on existing sponsorship_tier rows (default `'regular'`; admin re-classifies post-deploy). Update validators, services, ops, `businesses/queries.ts`. Delete `recomputeBusinessTier`, the backfill cron, `findActivePaidPlansForBusiness` (or trim). Minimum UI edits in the same commit to keep compile passing (same pattern as the previous refactor's Task 3).
3. **Admin UI additions** — display_slot picker on sponsorship-tier form; slot column on tier list; dashboard stat re-derives from slot; audit script wired to a pnpm alias.
4. **Public listing pages (web)** — rewrite `listing-view`, `directory-view`, `tier-section`, `business-card` to render 3 slot-driven sections. Drop the tier badge.
5. **Public listing pages (mobile)** — matching rewrite of `[category].tsx`, `TierPill`, `TierSection`.

Follows existing conventions:

- **`packages/config/` untouched.** Placement isn't brand or design token layer — this is a data model + product structure change.
- **Drizzle generate-then-apply** for the migration (per `CLAUDE.md`). Hand-augment SQL for the display_slot seed step (existing rows can't have a NULL column).
- **Services stay pure** — no auth.api reads sneak into business-subscriptions or membership-plans. The removed `recomputeBusinessTier` was a pure-DB write; removing it is a straight service-layer contract shrink.
- **Zod at the boundary** — validators updated; op layer input schemas re-derive from the new shape.

**Alternatives considered:**

- **Alt B — keep membership `tier`, just rename the labels to eliminate the "Sponsored" collision.** Rejected: the naming was a symptom, not the disease. Two overlapping placement axes is what makes the admin decision ambiguous. Renaming labels leaves the ambiguity intact.

- **Alt C — collapse sponsorship_tier catalog to a fixed 3-item enum (`top | mid | regular`) directly on the sponsorship row.** Rejected per user Q5 answer — the admin catalog stays flexible (admins can still create Gold/Silver/Bronze/Platinum), the new `display_slot` field is what maps each tier to a listing section. Preserves flexibility for the client to name products however they want; costs a small extra field.

- **Alt D — auto-mint courtesy sponsorships for existing tier1/tier2 subscribers as part of the migration.** Rejected per user Q2 answer — audit-and-notify only. Rationale: same as the sponsorship-orphan audit shipped this morning. Don't touch paid rows without human review.

- **Alt E — keep both axes but make the "which wins" rule visible in the admin UI (a warning if a plan and a sponsorship both grant placement).** Rejected: this treats the symptom (admin confusion) without fixing the underlying data-model duplication. Admins still have to reason about two products doing the same job.

## Data model changes

**`membership_plan` table** (`packages/db/src/schema/membership-plans.ts`):

- **Drop** `tier` column (added by migration `0025_lucky_gorilla_man.sql`).

**`businesses` table** (`packages/db/src/schema/businesses.ts`):

- **Drop** `tier` column.
- **Drop** indexes: `businesses_category_tier_idx`, `businesses_tier_idx`.
- **Drop** the composite unique that references `(category, tier)` — check whether it's a UNIQUE or a INDEX; likely just an INDEX (verify at implementation time; if it's a UNIQUE with a `.on(category, tier)`, the semantics were "one business per (category, tier)" which doesn't survive without tier — dropping the constraint is fine here).

**`sponsorship_tier` table** (`packages/db/src/schema/sponsorship-tiers.ts`):

- **Add** `display_slot text NOT NULL` column. Values constrained to `'top' | 'mid' | 'regular'` via CHECK constraint (`display_slot IN ('top', 'mid', 'regular')`). No default at the schema level — admin sets it explicitly per tier. Existing rows get `'regular'` via the migration seed step.

**Migration** (`packages/db/drizzle/migrations/00XX_placement_single_axis.sql`, generated + hand-augmented):

Generated portion will produce the DROP COLUMN + DROP INDEX statements + the ADD COLUMN for `display_slot`. Hand-augment order:

```sql
-- 1. Add display_slot with a temporary DEFAULT so existing rows can be
--    backfilled without violating NOT NULL. Then drop the default so
--    every new row must set it explicitly.
ALTER TABLE "sponsorship_tier"
  ADD COLUMN "display_slot" text NOT NULL DEFAULT 'regular'
  CHECK (display_slot IN ('top', 'mid', 'regular'));
ALTER TABLE "sponsorship_tier" ALTER COLUMN "display_slot" DROP DEFAULT;

-- 2. Drop membership_plan.tier
ALTER TABLE "membership_plan" DROP COLUMN "tier";

-- 3. Drop businesses.tier + associated indexes
DROP INDEX IF EXISTS "businesses_category_tier_idx";
DROP INDEX IF EXISTS "businesses_tier_idx";
ALTER TABLE "businesses" DROP COLUMN "tier";
```

## Files to touch

**New:**

- `packages/db/scripts/audit-subscription-tier-holders.ts` — read-only audit script (see Scope for behavior).

**Edit:**

*Schema + migration:*
- `packages/db/src/schema/membership-plans.ts` — drop `tier`
- `packages/db/src/schema/businesses.ts` — drop `tier` + two indexes
- `packages/db/src/schema/sponsorship-tiers.ts` — add `display_slot` + CHECK
- `packages/db/drizzle/migrations/00XX_placement_single_axis.sql` — generated + hand-augmented per above
- `packages/db/drizzle/migrations/meta/*.json` — regenerated
- `packages/db/package.json` — add `"audit:subscription-tier-holders"` script alias

*Validators:*
- `packages/validators/src/businesses.ts` — remove `VALID_TIERS`, `TIER_LABELS`, `BusinessTier`, `BusinessTierSchema`; remove `tier` from Business shapes (currently in BusinessSchema — check `packages/validators/src/businesses.ts` for the exact removals)
- `packages/validators/src/membership-plans.ts` — remove `tier` from MembershipPlan schema + Create/Update inputs
- `packages/validators/src/sponsorship-tiers.ts` — add `display_slot: 'top' | 'mid' | 'regular'` to SponsorshipTierSchema + Create + Update; add `DISPLAY_SLOTS` + `DISPLAY_SLOT_LABELS`

*Services:*
- `packages/services/src/business-subscriptions/service.ts` — remove `recomputeBusinessTier`, remove all recompute calls in createSubscription/updateSubscription/cancelSubscription, remove `backfillBusinessTiersFromActivePaidSubscriptions`
- `packages/services/src/business-subscriptions/queries.ts` — remove/trim `findActivePaidPlansForBusiness` (it currently selects `.tier` off membership_plan)
- `packages/services/src/business-subscriptions/index.ts` — drop dead exports
- `packages/services/src/membership-plans/service.ts` + `queries.ts` — remove `tier` from insert values, output mapping
- `packages/services/src/sponsorship-tiers/service.ts` + `queries.ts` — accept + persist `display_slot`
- `packages/services/src/businesses/queries.ts` — delete `IS_PAID_ACTIVE`, `EFFECTIVE_TIER`, `TIER_ORDER`, rewrite listing sort (see Scope). `isValidTier` + `storedTier` fallback at line 609 also removed (business no longer has a `tier` field).

*Server ops:*
- `apps/web/src/server/operations/membership-plans.ts` — validators shift ripples through op input/output schemas automatically; verify no other tier references
- `apps/web/src/server/operations/sponsorship-tiers.ts` — pass display_slot through create/update

*Admin UI:*
- `apps/web/src/app/admin/settings/membership-plans/_components/plan-form.tsx` — remove Placement `<select>` + `tier` state + `tier` in API payloads
- `apps/web/src/app/admin/settings/membership-plans/page.tsx` — remove Placement column from tier list
- `apps/web/src/app/admin/settings/sponsorship-tiers/_components/tier-form.tsx` — add display_slot `<select>` (Top / Mid / Regular) + validation
- `apps/web/src/app/admin/settings/sponsorship-tiers/page.tsx` — add slot column to tier list, update helper text (currently says "Tiers determine sort priority on category listing pages — lower number wins. No slot caps." — extend to explain display_slot mapping)
- `apps/web/src/app/admin/businesses/page.tsx` — remove tier column (line 160 area)
- `apps/web/src/app/admin/page.tsx` — replace `tier1/tier2/tier3` stat cards with `top/mid/regular` slot counts
- `apps/web/src/features/admin/components/subscriptions-section.tsx` — drop the "Placement" chip column from the row rendering (line 168-175 area)
- `apps/web/src/features/admin/components/business-detail.tsx` — remove tier badge / column if any (verify at implementation time)

*Public listing UI (web):*
- `apps/web/src/features/listings/components/listing-view.tsx` — rewrite tier grouping to slot grouping
- `apps/web/src/features/listings/components/directory-view.tsx` — same
- `apps/web/src/features/listings/components/tier-section.tsx` — rename to `slot-section.tsx` (or keep name but change semantics — decide during code); adjust icon/texture mapping
- `apps/web/src/features/listings/components/business-card.tsx` — drop the tier badge (line 128 + 161 area); keep sponsorship badge
- `apps/web/src/features/listings/types.ts` — drop `BusinessTier`/`VALID_TIERS` re-exports; add `DisplaySlot` if downstream consumers need it
- `apps/web/src/features/listings/index.ts` — same

*Mobile UI:*
- `apps/mobile/app/(app)/listings/[category].tsx` — rewrite tier grouping to slot grouping (lines 294, 302)
- `apps/mobile/features/listings/components/TierPill.tsx` — drop entirely (business no longer has a tier badge); OR repurpose as a sponsorship-tier badge if design wants that
- `apps/mobile/features/listings/components/TierSection.tsx` — rewrite to slot grouping OR delete + reimplement

*Cron:*
- `apps/web/src/lib/cron/backfill-business-tiers.ts` — delete
- `apps/web/src/lib/cron/registry.ts` — remove backfillTiersJob registration (line 49, 62)

**Not touched (verified during scoping):**

- `apps/web/src/app/api/v1/admin/{membership-plans,sponsorship-tiers}/*` route files — thin delegates to ops; op change is enough
- Public `/listings/[category]/page.tsx` and other route entry points — they consume the listings-feature components; component-level rewrite is transparent to the routes
- Stripe / billing surfaces — no price changes
- Audit log renderer for `subscription_recorded` — old audit rows keep their `tier` in meta (same append-only pattern as sponsorship-assigned's `category_id` drift); no cleanup

## Edge cases

- **Existing tier1/tier2 paid subscribers.** Per user decision, audit-and-notify only. Audit script output is the entire artifact; no auto-remediation. First month post-deploy: those businesses lose their placement boost. Client's outreach fixes it per-customer. Migration doesn't touch any paid subscription row.

- **sponsorship_tier rows without a display_slot assignment post-deploy.** Migration seeds all existing rows to `'regular'`. Admin has to re-classify them via the tier admin form. Until they do, no sponsored business appears in the Top or Mid section on any listing page. **This is a load-bearing manual step** — flag it prominently in the deploy plan; consider a post-deploy checklist that fails CI if any tier's `display_slot = 'regular'` where the tier's priority is < 5 (or some sane heuristic). See Open Questions.

- **Admin creates a sponsorship_tier with display_slot = 'top' and priority = 999 (super low).** The tier is still in the "top" listing section. Priority is the *within-slot* sort key; slot is the section. So a Gold tier at priority 1 sorts above a Titanium tier at priority 999, but both go in the Top section. Documented in the tier form's help text.

- **Business is sponsored but their sponsorship tier is `'regular'` slot.** They appear in the Regular section alongside unsponsored businesses, but sorted first (because SPONSORED_FLAG = 0 puts them ahead of the SPONSORED_FLAG = 1 crowd within the same section's ORDER BY). Documented; feels right.

- **Business has multiple sponsorship rows across `status` values.** Dedup was already done in the per-business-sponsorship migration; each business has at most one active/scheduled sponsorship row. Not a concern here.

- **A listing page has zero businesses in the Top or Mid section.** Section headers hide (existing behavior — `TierSection` already drops empty sections). Verify the rewrite preserves this.

- **Mobile app is on an older OTA build without this schema change.** The mobile app fetches businesses via the same `/api/v1/*` REST endpoints; the response payload drops `tier` from the Business shape. Older mobile clients trying to read `.tier` on the response get `undefined`. Mitigation: the TierPill / TierSection components on the OLDER mobile bundle will render `undefined` labels or throw. Deploy plan needs a coordinated OTA push, OR the API needs to keep returning `tier: null` for one release cycle then drop. See Open Questions.

- **Businesses without a category slug.** `businesses.category` is required; not a real concern. But listing sort doesn't rely on tier anymore, so a business with a valid category slug appears on that listing page regardless of any previous tier state.

- **Cron rollover for sponsorship transitions.** Unaffected — `transitionSponsorshipsToActive` / `Expired` still operate on `status` + dates.

- **What if the audit surfaces surprises (e.g., 50 tier1 subscribers)?** Pause on-plan. This plan assumes a small MVP customer base. If the audit shows non-trivial numbers, escalate to a bigger conversation with the client BEFORE running the drop migration on prod.

## Acceptance criteria

- [ ] Schema migration applies cleanly against dev + prod. `\d membership_plan` shows no `tier` column; `\d businesses` shows no `tier` column; `\d sponsorship_tier` shows a `display_slot` column with a CHECK constraint.
- [ ] Every existing `sponsorship_tier` row has `display_slot IN ('top', 'mid', 'regular')`; the seed step set them all to `'regular'`. Admin has re-classified any that should be Top/Mid before user-facing verification.
- [ ] Admin plan form has NO Placement dropdown; creating a plan succeeds with just `{ name, description, price_cents, duration_months }`.
- [ ] Admin sponsorship-tier form has a Display slot `<select>` with three options (Top / Mid / Regular); creating a tier with each value round-trips.
- [ ] Category listing page (web) renders three sections named per the slot they represent. Businesses appear in the section their sponsorship's tier's slot maps to; unsponsored businesses appear in Regular. Sort within each section: sponsored flag (top of section) → tier priority → amount → name.
- [ ] Same behavior on mobile (`apps/mobile/app/(app)/listings/[category].tsx`) — verified via the mobile QA flow.
- [ ] Business card (web + mobile) renders the Sponsorship badge for sponsored businesses; no tier badge.
- [ ] Admin dashboard shows Top / Mid / Regular business counts (or however the reviewer lands on the exact labels).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all clean.
- [ ] `pnpm --filter @aira/db audit:subscription-tier-holders` runs and produces the report (baseline captured in the code run's report; empty output is fine, non-empty output becomes the client conversation input).
- [ ] Delete: `apps/web/src/lib/cron/backfill-business-tiers.ts` is gone from the tree; cron registry no longer references it; cron dashboard doesn't list the job.

## Open questions

For `/mlabs-review` to resolve before implementation:

- **Client sign-off.** This plan changes the shape of a paid product (tier1/tier2 subscribers lose their subscription-derived placement boost). The audit script identifies who's affected, but the plan assumes the client is comfortable with the change and will handle outreach. **This is a plan-level gate — the review should require confirmation from the client before /mlabs-code runs.**

- **Sort ordering across slots.** The plan says "Top section, then Mid, then Regular." But should sponsored businesses in the Regular slot appear *at the top of the Regular section* (as their `SPONSORED_FLAG = 0` would put them), or is it fine for a sponsored-but-regular-slot business to just sit alphabetically among unsponsored? Recommendation: sponsored-first-within-section, matches the existing pattern for how tier sort worked. Confirm during review.

- **Mobile OTA / API compatibility strategy.** Old mobile clients still request `Business` payloads and read `.tier`. Options: (a) drop `tier` from the API response and require a coordinated mobile OTA push before the web deploy — brittle; (b) return `tier: null` for one release cycle, then drop — safer, small extra step in Task 2; (c) old mobile clients degrade silently (TierPill returns null, TierSection drops the section) — simpler if the mobile code handles null defensively. Recommendation: (b) with a documented follow-up to drop the field entirely once mobile has cut over.

- ~~**Display slot labels + copy.**~~ **RESOLVED.** Admin-facing slot labels: "Top" / "Mid" / "Regular" (internal, on the tier form). User-facing section headers on the listing page: just two — "Sponsored" and "Regular" (no "Level 2" surfaced anywhere users see). Within-Sponsored differentiation is visual (color) only.

- **Post-migration deploy-checklist automation.** Every sponsorship_tier row starts at `display_slot = 'regular'` after the migration. If the admin doesn't re-classify, no sponsored business appears in Top or Mid. Recommendation: audit script (Task 1) has a `--verify-slots` mode that returns non-zero if any tier's priority is < 5 AND display_slot = 'regular' (heuristic-based warning). Deploy playbook lists it as a required post-migration step.

- **`sponsorship_tier` renaming?** Post-refactor, the column is called `sponsorship_tier` — but the *only* thing left in the model that's "tier"-shaped is this one. Consider renaming to `placement_tier` for clarity, or leaving `sponsorship_tier` (matches everything else that references the sponsorship product). Not a blocker; call it during review.

- ~~**Business-card sponsorship badge design.**~~ **RESOLVED.** Generic "Sponsored" pill for all sponsored businesses regardless of slot. Slot-driven visual differentiation lives in the row / section chrome, not on the badge itself.

- **New: color tokens for the top vs mid sponsored treatment.** The plan calls for a subtle visual difference between top-slot businesses (first inside Sponsored) and mid-slot businesses (second inside Sponsored). Design tokens: reuse the existing `tier1`/`tier2`/`tier3` foreground+background pair from `packages/config/src/design.ts` (they map to sponsored / sponsored-level-2 / regular in that exact order — the token *names* survive; only the *product-side concept* they represent shifts from subscription-tier to sponsorship-slot). Alternative: rename tokens to `slotTop` / `slotMid` / `slotRegular` for clarity. Recommendation: rename during code so token names track the new product model. Verify `check-contrast` still passes on the renamed tokens — same colors, same contrast — so the migration is cosmetic.
