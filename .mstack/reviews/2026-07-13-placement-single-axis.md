# Review: Placement is sponsorship-only (drop membership tier)

**Date:** 2026-07-13
**Slug:** placement-single-axis
**Plan reviewed:** [2026-07-13-placement-single-axis.md](../plans/2026-07-13-placement-single-axis.md)
**Status:** approved
**Gate note:** Client-signoff gate flipped by framer@ on 2026-07-13 with the direction "we refine and test as you implement". `/mlabs-code` proceeds with all 6 tasks. Task 1's audit output is still the artifact for any downstream client conversation.
**UI-Significant:** yes
**Reviewer:** framer@millionlabs.co.uk (via /mlabs-review)

---

## Summary

Plan direction is sound — collapse two overlapping placement axes (subscription tier + sponsorship) into a single sponsorship-driven system. The listing UX gets simpler for end users (two visible sections: Sponsored + Regular) while admins retain full control via a `display_slot` flag on each sponsorship_tier.

Review surfaces one **hard blocker** (client sign-off) that gates /mlabs-code execution, five decision-locks the plan hadn't nailed, and several plan-list gaps (design token rename ripple, mobile Tailwind regen, marketing sweep). `/mlabs-code` should not run until the client sign-off gate is flipped — Task 1 (the audit script) is the artifact that enables that conversation.

UI-Significant is **yes** — 3+ files match the `features/*/components/**/*.tsx` + `app/**/page.tsx` heuristic, and the public listing pages get a real structural rewrite. Recommend `/mlabs-mockup --from-review placement-single-axis` before `/mlabs-code` to lock down the per-slot card color treatment inside the Sponsored section.

## Findings

### Blockers (must fix before /mlabs-code)

- **B1. Client sign-off gate.** This plan changes the shape of a paid product — existing tier1/tier2 paid subscribers currently receive a placement boost that disappears under the new model. The audit script (Task 1) identifies exactly who's affected, but the client has to sanction the change before Tasks 2–6 run. **Decision:** review is `approved-pending-client-signoff`; `/mlabs-code` refuses to run until the plan doc's status manually flips to `approved` (i.e., the client has been consulted with Task 1's audit output and greenlit the change). Task 1 (audit script) is the only task that can run before the gate.

### Concerns (raised, decided, recorded)

- **Concern C1: Section rendering model needs a fresh component shape.** Current `TierSection` renders one header per tier (with tier-specific texture + label). New model requires ONE "Sponsored" section that contains two color-differentiated cohorts (top-slot first, mid-slot after) plus a "Regular" section that mixes sponsored-with-regular-slot businesses (first) and unsponsored businesses (alphabetical). The plan called for "rewrite" but didn't specify the composition shape.
  **Decision:** the "Sponsored" section header **reuses the existing tier1 texture** with label "Sponsored" (which it already displays via TIER_LABELS.tier1 today — the label is preserved even after TIER_LABELS is removed). Card-level color differentiation handles the within-section top-vs-mid distinction: top-slot cards use the `sponsoredTop` design token pair (was `tier1`), mid-slot cards use the `sponsoredMid` pair (was `tier2`). Regular section uses tier3 texture as it does today (renamed token `regular`).

- **Concern C2: Design token rename ripples beyond `design.ts`.** The plan's Open Question #6 suggested a rename but didn't enumerate impact.
  **Decision:** rename tokens `tier1 → sponsoredTop`, `tier2 → sponsoredMid`, `tier3 → regular` (+ their `*Foreground` variants). Ripple sites confirmed by grep:
  - `packages/config/src/design.ts` (values, comments)
  - `apps/web/src/app/globals.css` (`--color-tier{1,2,3}` custom props)
  - `apps/mobile/tailwind.config.js` (regenerated via `pnpm gen:mobile-tw` after design.ts edit — mandatory per CLAUDE.md)
  - `apps/web/src/features/listings/components/business-card.tsx:153` — `bg-tier1` / `text-tier1-foreground` / `bg-tier2` / `text-tier2-foreground`
  - `apps/mobile/features/listings/components/TierPill.tsx:36-42` — mobile Tailwind classes
  - `scripts/check-contrast.ts` — token reference names in the allowlist + assertions
  Ships in Task 2 (below) as a standalone atomic commit — cosmetic-only, no data-model implications, gets the token names in place before Task 3's product-model shift.

- **Concern C3: Physical texture files.** `apps/web/public/textures/tier{1,2,3}-texture.webp` and `apps/mobile/assets/textures/tier{1,2,3}-texture.webp` are 6 files with "tier" in the filename.
  **Decision:** **keep filenames as-is.** "tier" in the filename is legacy naming with no product-model implication — the assets are just image files. Renaming would touch 6 file paths + imports for zero user-facing benefit. Any code reference to these paths (TierSection presentation maps at `apps/web/src/features/listings/components/tier-section.tsx:9-22` and `apps/mobile/features/listings/components/TierSection.tsx:24-40`) just gets a variable-name refresh, filename stays.

- **Concern C4: Mobile Tailwind regen is a required step, missing from plan's acceptance criteria.** Editing `packages/config/src/design.ts` requires `pnpm gen:mobile-tw` per CLAUDE.md, or the mobile app's Tailwind config falls out of sync.
  **Decision:** Task 2's acceptance includes running the regen and confirming `apps/mobile/tailwind.config.js` picks up the new token names. Verified via a diff on that file.

- **Concern C5: Marketing components need a tier sweep.** Recent session added landing explainer video wiring in `apps/web/src/components/marketing/*` (BusinessPanel, WaitlistCard). Copy or design that references "tier1/tier2/tier3" or "Sponsored / Sponsored Level 2 / Regular" needs an audit.
  **Decision:** Task 5 (public listings web rewrite) includes a marketing-directory grep for any tier references and updates copy/props to match the new model. If nothing is found, log a one-line "sweep clean" note in the commit.

- **Concern C6: Order-of-operations inside Task 3.** Drizzle Kit generates the migration from the schema TS diff. If the code that references `businesses.tier` (recomputeBusinessTier, findActivePaidPlansForBusiness) still exists when the migration runs, dev boot succeeds but subscription writes will fail at runtime with "column doesn't exist". Task 3 must ship the schema edit AND the code-that-references-it edits in the same commit.
  **Decision:** Task 3 is a single atomic commit spanning schema + validators + services + ops + minimum UI. Same pattern as the per-business-sponsorship refactor's Task 3. Explicit in the Task 3 spec below.

### Suggestions (taken or deferred)

- **S1 (taken):** Task 1 audit script gets a `--verify` mode (mirrors the sponsorship-orphan pattern): runs post-migration to assert `businesses.tier` and `membership_plan.tier` columns are gone (via information_schema query). Cheap safety net.

- **S2 (deferred):** Explicit "post-migration admin checklist" reminder — after Task 3 lands, admins must re-classify existing sponsorship_tiers into Top/Mid/Regular slots via the tier form (Task 4). Until they do, no sponsored business appears in the Sponsored section on any listing page. Ships as a bullet in the code run's report and as a one-line banner on `/admin/settings/sponsorship-tiers` (via Task 4 helper text extension), not as a separate task.

- **S3 (deferred):** Rename `sponsorship_tier` table to `placement_tier`. Plan floated this as Open Question #7. Deferred — table name is admin/plumbing surface, low benefit. Costs a migration + code sweep, buys clarity that isn't currently a source of confusion.

- **S4 (confirmed non-issue):** `audit-meta.ts` has no `tier` field on `subscription_recorded` — grepped and verified. No audit-log renderer breakage. `sponsorship_assigned` audit meta was already cleaned up in the per-business-sponsorship refactor.

## Decisions locked

Net-new decisions made during review, beyond the plan:

1. **Client sign-off gate** — review status is `approved-pending-client-signoff`. `/mlabs-code` won't run until the plan doc's status manually flips to `approved` after client conversation informed by Task 1's audit output.
2. **Sponsored section rendering** — one section header, reuses tier1 texture + "Sponsored" label. Within-section top-vs-mid distinction is card-level, driven by `sponsoredTop` / `sponsoredMid` design tokens.
3. **Design token names** — `tier1 → sponsoredTop`, `tier2 → sponsoredMid`, `tier3 → regular` (+ `*Foreground` variants). Task 2 owns this rename end-to-end.
4. **Texture asset filenames** — unchanged. "tier" in filenames is legacy naming, no product implication.
5. **Mobile Tailwind regen** — mandatory step in Task 2's acceptance.
6. **Marketing components sweep** — folded into Task 5's scope.
7. **Task 3 atomicity** — single commit spanning schema + validators + services + ops + minimum UI, matching the pattern of the per-business-sponsorship Task 3.
8. **Post-migration admin checklist** — surfaced in the code run's report + a one-line banner on `/admin/settings/sponsorship-tiers`, not a separate task.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Task 1 runs before the client sign-off gate; Tasks 2–6 only run after the gate is flipped.

### Task 1: Audit script + pnpm alias + baseline (ships BEFORE client gate)

- **Files:**
  - `packages/db/scripts/audit-subscription-tier-holders.ts` (new)
  - `packages/db/package.json` (edit — add `"audit:subscription-tier-holders": "tsx scripts/audit-subscription-tier-holders.ts"`)
- **What:** Read-only script with two modes:
  - `--report` (default): For every business currently listed (VISIBLE gate — active + paid subscription, non-deleted), report business name + current subscription plan name + plan's `tier` + subscription end date, FILTERED to `tier IN ('tier1', 'tier2')`. This is the client conversation input.
  - `--verify`: Query `information_schema.columns` to assert `businesses.tier` and `membership_plan.tier` no longer exist. Also assert every `sponsorship_tier` row has a non-null `display_slot`. Exits non-zero if any check fails.
- **Acceptance:**
  - `pnpm --filter @aira/db audit:subscription-tier-holders` runs cleanly against dev DB.
  - Output includes exact IDs, names, tier values, end dates.
  - Commit message records the dev-DB baseline count.
- **Pause if:** dev baseline is unexpectedly large (>20 tier1/tier2 subscribers) — surface for a manual sanity check.

### 🚦 CLIENT SIGN-OFF GATE

**All tasks below are blocked until the plan doc's status flips from `approved-pending-client-signoff` to `approved`.** Framer needs to share Task 1's output with the client, confirm the change is sanctioned, then edit the plan doc's status field.

### Task 2: Design token rename + mobile Tailwind regen + classname sweep

- **Files:**
  - `packages/config/src/design.ts` (edit — rename tier1→sponsoredTop, tier2→sponsoredMid, tier3→regular + `*Foreground` variants; update comments; light+dark modes both)
  - `apps/web/src/app/globals.css` (edit — rename `--color-tier1` → `--color-sponsored-top` etc. Match kebab-case CSS convention.)
  - `apps/mobile/tailwind.config.js` (regenerated via `pnpm gen:mobile-tw` — do NOT hand-edit)
  - `apps/web/src/features/listings/components/business-card.tsx` (edit line 153: `bg-tier1` → `bg-sponsored-top`, `text-tier1-foreground` → `text-sponsored-top-foreground`, `bg-tier2` → `bg-sponsored-mid`, `text-tier2-foreground` → `text-sponsored-mid-foreground`)
  - `apps/mobile/features/listings/components/TierPill.tsx` (edit lines 36-42: same class renames using camelCase for the mobile Tailwind convention — `bg-sponsoredTop`, `text-sponsoredTopForeground`, `bg-sponsoredMid`, `text-sponsoredMidForeground`)
  - `scripts/check-contrast.ts` (edit — update token reference names in the allowlist + assertion strings)
- **What:** Rename design tokens end-to-end, regenerate mobile config, sweep all classname consumers. Zero functional change; token values (OKLCH triplets) stay identical. Same colors, new names.
- **Acceptance:**
  - `pnpm --filter @aira/config typecheck` clean.
  - `pnpm gen:mobile-tw` runs; diff on `apps/mobile/tailwind.config.js` shows only the renamed keys.
  - `pnpm --filter @aira/web exec tsc --noEmit` clean.
  - `pnpm check-contrast` (or the equivalent script command per repo convention) passes with the new token names.
  - Grep for `bg-tier1`, `text-tier1-foreground`, `bg-tier2`, `text-tier2-foreground`, `bg-tier3`, `text-tier3-foreground` across `apps/` returns zero non-test hits.
- **Pause if:** `pnpm gen:mobile-tw` produces unexpected changes beyond the renamed keys — investigate before committing.

### Task 3: Schema drop + migration + backend refactor + cron delete + minimum UI edits

**⚠ Single atomic commit. Same pattern as the per-business-sponsorship refactor's Task 3.**

- **Files:**
  - `packages/db/src/schema/membership-plans.ts` (edit — drop `tier` column)
  - `packages/db/src/schema/businesses.ts` (edit — drop `tier` column + `businesses_category_tier_idx` + `businesses_tier_idx` indexes)
  - `packages/db/src/schema/sponsorship-tiers.ts` (edit — add `display_slot text NOT NULL` column + CHECK constraint `display_slot IN ('top', 'mid', 'regular')`)
  - `packages/db/drizzle/migrations/00XX_placement_single_axis.sql` (new — generated via `pnpm db:generate`, hand-augmented per plan Data Model section:
    1. ADD COLUMN `display_slot` with temporary `DEFAULT 'regular'` for backfill,
    2. `ALTER COLUMN display_slot DROP DEFAULT`,
    3. DROP `membership_plan.tier`,
    4. DROP `businesses.tier` + associated indexes)
  - `packages/db/drizzle/migrations/meta/*.json` (regenerated)
  - `packages/validators/src/businesses.ts` (edit — remove `VALID_TIERS`, `TIER_LABELS`, `BusinessTier`, `BusinessTierSchema`; remove `tier` from Business shape)
  - `packages/validators/src/membership-plans.ts` (edit — remove `tier` from MembershipPlan schema + Create + Update inputs)
  - `packages/validators/src/sponsorship-tiers.ts` (edit — add `display_slot: z.enum(['top', 'mid', 'regular'])` to SponsorshipTierSchema + Create + Update; add `DISPLAY_SLOTS` const array + `DISPLAY_SLOT_LABELS` map for admin form)
  - `packages/services/src/business-subscriptions/service.ts` (edit — delete `recomputeBusinessTier`; delete all recompute call sites in create/update/cancel; delete `backfillBusinessTiersFromActivePaidSubscriptions`)
  - `packages/services/src/business-subscriptions/queries.ts` (edit — delete `findActivePaidPlansForBusiness`; if only used by recomputeBusinessTier, remove entirely)
  - `packages/services/src/business-subscriptions/index.ts` (edit — remove dead exports)
  - `packages/services/src/membership-plans/service.ts` + `queries.ts` (edit — remove `tier` from insert values + output mapping)
  - `packages/services/src/sponsorship-tiers/service.ts` + `queries.ts` (edit — persist + read `display_slot`)
  - `packages/services/src/businesses/queries.ts` (edit — delete `IS_PAID_ACTIVE`, `EFFECTIVE_TIER`, `TIER_ORDER`, `isValidTier` + line-609 tier fallback; rewrite listing sort to: `SPONSORED_FLAG` → within-sponsored: order by display_slot precedence (`CASE display_slot WHEN 'top' THEN 1 WHEN 'mid' THEN 2 ELSE 3 END`) → `SPONSORED_TIER_PRIORITY` within-slot → `desc(SPONSORED_AMOUNT_CENTS)` → `asc(businesses.name)`)
  - `apps/web/src/server/operations/membership-plans.ts` (edit — verify no lingering tier references after validator shift)
  - `apps/web/src/server/operations/sponsorship-tiers.ts` (edit — pass display_slot through create/update input/output)
  - `apps/web/src/lib/cron/backfill-business-tiers.ts` (delete)
  - `apps/web/src/lib/cron/registry.ts` (edit — remove backfillTiersJob registration at lines 49, 62)
  - **Minimum UI edits (bundled to keep compile passing):**
    - `apps/web/src/app/admin/settings/membership-plans/_components/plan-form.tsx` (edit — remove Placement `<select>` + `tier` state + `tier` in API payloads)
    - `apps/web/src/app/admin/settings/membership-plans/page.tsx` (edit — remove Placement column at line 70)
    - `apps/web/src/app/admin/businesses/page.tsx` (edit — remove tier column at line 160)
    - `apps/web/src/app/admin/page.tsx` (edit — the tier1/tier2/tier3 stat calculation at lines 63-65 becomes stubbed to zeros; Task 4 replaces with slot-driven counts)
    - `apps/web/src/features/admin/components/subscriptions-section.tsx` (edit — remove Placement chip column at line 170)
- **What:** Ships schema + validators + services + ops in one atomic commit so compile stays clean. Minimum UI edits handle the immediate compile fallout; Task 4 adds the new UX (slot picker, dashboard stat re-derivation).
- **Acceptance:**
  - `pnpm typecheck` clean across all packages.
  - `pnpm lint` clean.
  - `pnpm test` — no regressions.
  - `pnpm --filter @aira/db migrate` applies cleanly on dev DB.
  - Post-migration: `pnpm --filter @aira/db audit:subscription-tier-holders --verify` exits 0 (columns dropped, all sponsorship_tier rows have `display_slot`).
  - `\d membership_plan` and `\d businesses` show no `tier` column; `\d sponsorship_tier` shows `display_slot` with CHECK constraint.
- **Pause if:**
  - Drizzle Kit generates the DROP COLUMN before the ADD COLUMN + DROP DEFAULT sequence — hand-augment must fix ordering; escalate if the tool actively fights it.
  - Any generated migration statement touches unrelated tables — investigate before applying.
  - Prod row count for `sponsorship_tier` differs materially from dev baseline (indicates dev/prod drift on tier catalog).

### Task 4: Admin UI additions — display_slot picker + tier list slot column + dashboard stat + banner

- **Files:**
  - `apps/web/src/app/admin/settings/sponsorship-tiers/_components/tier-form.tsx` (edit — add Display slot `<select>` with three options `Top / Mid / Regular` sourced from `DISPLAY_SLOT_LABELS`; state + payload wiring; required field)
  - `apps/web/src/app/admin/settings/sponsorship-tiers/page.tsx` (edit — add slot column to tier list table; extend the helper text below the list to name display_slot behavior explicitly. Add a one-line banner at the TOP of the page listing any tiers currently at `display_slot = 'regular'` that have priority < 5 — post-migration reminder that admin needs to re-classify.)
  - `apps/web/src/app/admin/page.tsx` (edit — replace tier1/2/3 stat calculation with slot-driven counts computed same way listing pages do: sponsored businesses whose tier's slot is 'top' / 'mid', vs everyone else — 'regular')
- **What:** Fills in the new admin UX after Task 3's minimum UI edits.
- **Acceptance:**
  - Sponsorship-tier form has a Display slot select. Creating a tier with each value round-trips through the API.
  - Tier list shows the slot column. Banner appears when priority-1 tier is still at `regular`; disappears when re-classified to top.
  - Admin dashboard's three stat cards show top/mid/regular counts.

### Task 5: Public listings web rewrite

- **Files:**
  - `apps/web/src/features/listings/components/tier-section.tsx` (edit — rename intent, restructure: instead of one section per tier, this component now renders one "Sponsored" section that iterates top-slot businesses first (using `sponsoredTop` token pair for card chrome) then mid-slot businesses (using `sponsoredMid`), and a separate "Regular" section for the rest. Rename file to `slot-section.tsx` — updates all imports.)
  - `apps/web/src/features/listings/components/listing-view.tsx` (edit — replace `VALID_TIERS.map` grouping (line 125) with slot-based grouping. Callers pass slot-derived business arrays instead of tier-derived ones.)
  - `apps/web/src/features/listings/components/directory-view.tsx` (edit — same grouping shift at line 111)
  - `apps/web/src/features/listings/components/business-card.tsx` (edit — drop the tier badge rendering entirely at line 128 + 161; card no longer needs a `tier` prop; sponsored businesses show a "Sponsored" pill sourced from the sponsorship model, not the tier)
  - `apps/web/src/features/listings/types.ts` + `index.ts` (edit — drop `BusinessTier` + `VALID_TIERS` re-exports; add `DisplaySlot` re-export if downstream needs it)
  - Marketing sweep: `grep -r "tier1\|tier2\|tier3\|TIER_LABELS\|Sponsored Level 2" apps/web/src/components/marketing/` — remove or update any hits. If nothing found, log "marketing sweep clean" in the commit body.
- **What:** Two-section listing UI (Sponsored + Regular) with in-section per-slot color coding on the sponsored section, driven by the new design tokens.
- **Acceptance:**
  - `/listings/[category]` renders two section headers: "Sponsored" (reusing the existing tier1-texture.webp) and "Regular" (reusing tier3-texture.webp).
  - Sponsored section: top-slot businesses first with `sponsoredTop` styling, mid-slot businesses after with `sponsoredMid` styling.
  - Regular section: sponsored-regular-slot businesses first (no distinguishing color), then unsponsored alphabetically.
  - Business card shows Sponsored pill only when the business is sponsored (any slot); no tier badge.
  - Grep for the removed tokens (`bg-tier`, `text-tier`) across `apps/web/src` returns zero non-test hits.
- **Pause if:** the marketing sweep surfaces copy that uses tier-based branding (e.g., "Sponsored Level 2" as marketing copy) — surface for a copy decision before deleting.

### Task 6: Public listings mobile rewrite

- **Files:**
  - `apps/mobile/features/listings/components/TierSection.tsx` (edit — same restructure as web: single "Sponsored" section iterating top+mid slots with distinct card treatments, single "Regular" section for the rest. Rename to `SlotSection.tsx` — updates all imports.)
  - `apps/mobile/app/(app)/listings/[category].tsx` (edit — replace `VALID_TIERS.map` grouping at lines 294, 302 with slot grouping. Same shape as web.)
  - `apps/mobile/features/listings/components/TierPill.tsx` (edit — drop the tier-based pill entirely; card now shows only the sponsorship pill when applicable. Rename component or delete — if no callers remain, delete outright)
  - `apps/mobile/features/listings/components/BusinessCard.tsx` (edit — drop tier badge rendering, keep sponsorship badge)
- **What:** Mobile parity for Task 5's structural rewrite.
- **Acceptance:**
  - `pnpm --filter @aira/mobile exec tsc --noEmit` clean.
  - Grep for `bg-tier`, `text-tier` in `apps/mobile` returns zero hits.
  - Manual QA (`/mlabs-qa --focus mobile-listings`) confirms two-section layout on device.
- **Pause if:** any consumer of `BusinessTier` type outside features/listings/* is discovered (mobile validator imports, screens beyond listings) — surface for scope decision.

## Open questions

None remaining — all six plan-level Open Questions locked above.

If `/mlabs-code` finds ambiguity mid-implementation (especially around Task 3's migration ordering or Task 5's marketing sweep), pause per the task's **Pause if** trigger.
