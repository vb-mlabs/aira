# Review: Per-business sponsorship model

**Date:** 2026-07-13
**Slug:** per-business-sponsorship
**Plan reviewed:** [2026-07-13-per-business-sponsorship.md](../plans/2026-07-13-per-business-sponsorship.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk (via /mlabs-review)

---

## Summary

Plan is ready to implement. The direction is sound: dropping `category_id` from `sponsorship` + `max_slots` from `sponsorship_tier` collapses a leaky per-category invariant into a simpler per-business model that follows category membership automatically. Review surfaced two missing files in the edit list (silently added), locked four UX/QA decisions from the plan's Open Questions, and confirmed no mobile impact.

UI-Significant flag is **no** — this is a mechanical removal (one dropdown + one form input) plus one small helper line and one page-level explanatory sentence. No new pages, no new components, no design language calls; existing layout absorbs the changes. `/mlabs-mockup` would not add value.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern C1:** Plan lists `packages/services/src/sponsorships/queries.ts` for removing `countActiveSponsorships`, but the export in `packages/services/src/sponsorships/index.ts` (line 4) is what makes it public API. Same file also exports `listActiveSponsorshipsForCategory` (queries.ts line 77) which has **zero consumers** in the codebase — dead export.
  **Decision:** Add `packages/services/src/sponsorships/index.ts` to the edit list. Drop both `countActiveSponsorships` AND `listActiveSponsorshipsForCategory` from queries.ts + index.ts.

- **Concern C2:** New audit script `packages/db/scripts/audit-orphan-sponsorships.ts` needs a `pnpm run` alias to satisfy the acceptance criterion `pnpm db:audit-orphan-sponsorships`. Existing pattern: `packages/db/package.json` has `"migrate": "tsx scripts/migrate.ts"` and `"seed:qa": "tsx scripts/seed-qa-accounts.ts"`.
  **Decision:** Add `packages/db/package.json` to the edit list. New script alias: `"audit:orphan-sponsorships": "tsx scripts/audit-orphan-sponsorships.ts"`.

- **Concern C3:** Migration dedup CTE picks a "winner" among competing per-business sponsorship rows. If the rule is right in principle but wrong for a specific paid row, that's a silent product change with no test to catch it.
  **Decision:** Add a migration-test harness (new file, task 2 below) that seeds 3 scenarios into a scratch schema (single row, 2 rows same priority, 3 rows different tiers), runs the CTE, asserts the surviving row matches the documented rule. Plus: audit script gets a post-migration verification mode.

- **Concern C4:** After removing the Category dropdown from the sponsorship modal, admins lose the visual link between "attaching a sponsorship" and "which listing pages this affects".
  **Decision:** Include a read-only "Will feature on: Restaurants, Catering" line beneath the tier picker in the modal. Handle the empty-categories case explicitly ("This business is in 0 categories — the sponsorship will not display anywhere until you add one"). Small addition, keeps context visible.

- **Concern C5:** After removing the "Max slots per category" input from the tier form, the sponsorship-tiers admin list page loses any indication of the model shift.
  **Decision:** Add a one-line helper text below the tier list on `/admin/settings/sponsorship-tiers`: "Tiers determine sort priority on category listing pages — lower number wins. No slot caps." Explicit for admins who remember the old model.

- **Concern C6:** Legacy `audit_log.meta` rows written before this change carry `category_id`; new writes will omit it.
  **Decision:** Accept the shape drift. Audit log is append-only, per-action meta shape is already flexible, and the historical trail is more valuable than cosmetic consistency. No cleanup, no rendering change.

### Suggestions (taken or deferred)

- **S1 (taken):** `listActiveSponsorshipsForCategory` in `packages/services/src/sponsorships/queries.ts` has zero consumers. Drop it alongside `countActiveSponsorships` — folded into C1's decision.

- **S2 (deferred):** `SponsorshipCreateInputSchema` uses `.strict()` — a stale mobile client sending `category_id` in the future would 400. Non-issue today (mobile doesn't use this API), skip.

- **S3 (deferred):** Rollback path — git revert + a follow-up `pnpm db:generate` reverse migration would work if we needed to back out. Explicit rollback script not required for a low-row-count MVP.

- **S4 (confirmed non-issue):** Mobile `TierPill` + `PrimaryCategoryView` consume the `sponsored` flag on business rows returned by `businesses/queries.ts`. The plan preserves this flag's semantics (a business is `sponsored` on a category page IFF it has an active sponsorship AND is in that category via `business_category`). No mobile changes needed.

## Decisions locked

Net-new decisions made during review, beyond the plan:

1. **Add `packages/services/src/sponsorships/index.ts` to edit list.** Drop both `countActiveSponsorships` and `listActiveSponsorshipsForCategory` exports.
2. **Add `packages/db/package.json` to edit list.** New script alias `audit:orphan-sponsorships`.
3. **Migration-test harness added as a separate task** (task 2 below). Assertions cover the documented dedup rule against 3 seeded scenarios.
4. **Modal helper line "Will feature on: X, Y" included** in the sponsorships modal (task 4).
5. **Tier-list helper text included** on `/admin/settings/sponsorship-tiers/page.tsx` (task 5).
6. **Audit script has two modes:** `--report` (default, run before migration on staging + prod → lists orphans + duplicates) and `--verify` (run after migration → assert zero residual duplicates). Baked into the acceptance criteria for task 3.
7. **Legacy `audit_log.meta` rows keep their `category_id` key.** No cleanup script. Renderer unchanged.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each is atomic (single commit). Task 1 and 2 land pre-migration so the migration in task 3 has both a data snapshot (from the audit) and a passing test harness before it runs against real data.

### Task 1: Audit script + pnpm alias + baseline run

- **Files:**
  - `packages/db/scripts/audit-orphan-sponsorships.ts` (new)
  - `packages/db/package.json` (edit — add `"audit:orphan-sponsorships"` script)
- **What:** New TS script following the pattern of `packages/db/scripts/recent-errors.ts` + `seed-qa-accounts.ts`. Two modes via CLI flag:
  - `--report` (default): report (a) sponsorships where `category_id` is NOT in the business's `business_category` set (orphans that don't render today), (b) businesses with >1 active/scheduled sponsorship row (candidates the dedup CTE will collapse — preview which id survives per the documented rule).
  - `--verify`: assert zero rows match `SELECT business_id FROM sponsorship WHERE status IN ('active','scheduled') GROUP BY business_id HAVING COUNT(*) > 1`. Exits non-zero if any found.
  Register in `packages/db/package.json` scripts.
- **Acceptance:**
  - `pnpm --filter @aira/db audit:orphan-sponsorships` runs cleanly against local dev DB.
  - Output lists exact IDs, business names, and the dedup rule's predicted winner per business.
  - Commit message includes the dev-DB baseline: N orphans, M businesses with duplicates.
- **Pause if:** the baseline count on dev DB is unexpectedly large (>50 rows in either category) — surface for a manual sanity check before continuing.

### Task 2: Dedup CTE test harness

- **Files:**
  - `packages/db/tests/sponsorship-dedup.test.ts` (new)
- **What:** Vitest that programmatically seeds 3 scenarios into a scratch schema (use a transaction + rollback pattern, or a per-test DB via the existing test infra — check `packages/db/tests/*` for the pattern; if there isn't one yet, **pause**):
  1. Single active row for a business → survives (baseline).
  2. Two active rows, same tier priority, different end_dates → later end_date wins.
  3. Three rows across tiers, one expired, two active with different amounts → highest priority (lowest priority number) wins; expired row untouched.
  Import the CTE from the migration SQL file (either read + exec the raw string, or transcribe the CTE into the test — first is preferred so the test tracks the actual migration).
- **Acceptance:**
  - `pnpm --filter @aira/db test tests/sponsorship-dedup.test.ts` passes 3/3.
  - Assertions name the exact surviving row's `id` per scenario.
- **Pause if:**
  - No existing `packages/db/tests/` infrastructure (no vitest config in packages/db) — bail and escalate; setting up test infra is a separate scope.
  - Cannot reference the CTE SQL from the test without duplication — flag and propose an approach.

### Task 3: Schema drop + generated migration (with dedup CTE) + validators + services + ops

**⚠ This is the largest task — one atomic commit covering all server-side changes that must ship together to compile.**

- **Files:**
  - `packages/db/src/schema/sponsorships.ts` (edit — drop `category_id` column + FK; drop `sp_cat_status_dates_idx`; add `sp_business_status_dates_idx` on `(business_id, status, start_date, end_date)`)
  - `packages/db/src/schema/sponsorship-tiers.ts` (edit — drop `max_slots` column; drop `st_max_slots_check`)
  - `packages/db/drizzle/migrations/00XX_per_business_sponsorship.sql` (new — generated via `pnpm db:generate`, then hand-augmented with the dedup CTE **before** the `ALTER TABLE ... DROP COLUMN category_id` statement)
  - `packages/db/drizzle/migrations/meta/*.json` (regenerated)
  - `packages/validators/src/sponsorships.ts` (edit — remove `category_id` from `SponsorshipSchema`, `SponsorshipCreateInputSchema`, `SponsorshipUpdateInputSchema`)
  - `packages/validators/src/sponsorship-tiers.ts` (edit — remove `max_slots` from `SponsorshipTierSchema` + `SponsorshipTierCreateInputSchema` + `SponsorshipTierUpdateInputSchema`; remove `slots_used`)
  - `packages/services/src/sponsorships/service.ts` (edit — remove the `max_slots`-enforcement block in `createSponsorship`; drop `category_id` from insert values)
  - `packages/services/src/sponsorships/queries.ts` (edit — remove `countActiveSponsorships` + `listActiveSponsorshipsForCategory` entirely; update `toSponsorship` if it references category_id)
  - `packages/services/src/sponsorships/index.ts` (edit — remove exports for `countActiveSponsorships` + `listActiveSponsorshipsForCategory`)
  - `packages/services/src/businesses/queries.ts` (edit — rewrite `sponsoredFlag`, `sponsoredTierPriority`, `sponsoredAmountCents`, `hasActiveSponsorshipInCategory`, `HAS_ACTIVE_SPONSORSHIP` to drop the `sp.category_id = (SELECT id FROM category WHERE slug=...)` filters; sponsored appearance now depends on active-sponsorship-exists + outer `business_category` join)
  - `apps/web/src/server/operations/sponsorships.ts` (edit — drop `category_id` from `business.sponsorship_assigned` audit meta object)
  - `apps/web/src/server/operations/sponsorship-tiers.ts` (edit — remove `category_id` from list input schema; remove the slot-annotation branch of the handler)
- **What:** Generate the migration with `pnpm db:generate`. Hand-augment the generated SQL to insert the dedup CTE (see plan doc for exact SQL) BEFORE any `DROP COLUMN category_id` statement. Update all validators, services, and ops as listed to compile against the new schema.
- **Acceptance:**
  - `pnpm typecheck` clean across all packages.
  - `pnpm lint` clean.
  - `pnpm test` — task 2's dedup test passes; nothing else broken.
  - `pnpm --filter @aira/db migrate` applies cleanly against a fresh dev DB.
  - Post-migration: `pnpm --filter @aira/db audit:orphan-sponsorships --verify` exits 0.
  - Schema check: `\d sponsorship` in psql shows no `category_id` column; `\d sponsorship_tier` shows no `max_slots` column.
- **Pause if:**
  - The generated migration proposes to drop `category_id` before the dedup CTE runs (Drizzle-Kit sometimes reorders) — hand-augment is required; escalate if the tool actively fights the desired ordering.
  - Any existing sponsorship row can't be classified by the dedup rule (e.g., all NULL tier_ids on multiple rows for a business, no clean tie-break) — pause and surface the row IDs for manual review.
  - Prod DB row count for orphan/duplicate categories differs significantly from dev baseline captured in task 1 — pause before applying to prod.
  - `pnpm db:generate` produces a migration that touches unrelated tables — investigate before staging.

### Task 4: Admin sponsorship modal + list cleanup (remove Category field, add helper line)

- **Files:**
  - `apps/web/src/features/admin/components/sponsorships-section.tsx` (edit)
- **What:**
  - Remove the Category `<select>`, its label, its `categoryId` state, the `categories` state, the category-driven re-fetch effect at lines 239-256, and the `annotatedTiers` distinction (one tier list now, no per-category annotation).
  - Remove `tierLabel` slot annotations, `isFull` computed flag, and the `disabled={isFull}` state on tier options — tiers show just `name (priority N)` now.
  - Remove the Category column from the sponsorship list table (per-row category_id truncation display).
  - Add a read-only summary line below the tier picker: `Will feature on: {business.categories.join(", ")}`. Fetch the business's categories on modal open (add to the existing `Promise.all` at line 221). Handle empty state explicitly: "This business is in 0 categories — the sponsorship will not display anywhere until you add one."
  - Remove `handleSubmit`'s `if (!categoryId) { setError("Select a category."); return }` guard (line 278) — no longer needed.
  - Drop `category_id` from the POST body payload (line 298).
- **Acceptance:**
  - Modal renders with Tier + Dates + Amount + Notes only; no Category field.
  - "Will feature on: …" line displays the business's current categories.
  - Empty-categories state renders the explicit copy.
  - Submitting successfully creates a sponsorship row with no `category_id` (the schema drop from task 3 makes this automatic).
  - No slot annotations on tier options; no disabled Full states.
  - Type check + lint clean on the touched file.
- **Pause if:** the business-categories fetch needs a new endpoint (it should be reachable via the existing business detail endpoint that /admin/businesses/[id] already loads — check before adding one).

### Task 5: Sponsorship-tier admin cleanup (remove max_slots input, add page helper text)

- **Files:**
  - `apps/web/src/app/admin/settings/sponsorship-tiers/_components/tier-form.tsx` (edit)
  - `apps/web/src/app/admin/settings/sponsorship-tiers/page.tsx` (edit)
- **What:**
  - `tier-form.tsx`: remove the "Max slots per category" `<Input>` block (lines 98-111), remove `maxSlots` state (line 22), remove `maxSlotsNum` validation (lines 36-40), drop `max_slots` from both API payloads (lines 49, 56).
  - `page.tsx`: add a one-line helper text below the tier list: `Tiers determine sort priority on category listing pages — lower number wins. No slot caps.` Style with `text-xs text-muted-foreground` to match the existing per-field helper style in the form.
- **Acceptance:**
  - Tier form has Name + Priority + Active only; no Max slots input.
  - Creating/editing a tier via the form succeeds; no `max_slots` in the request body.
  - `/admin/settings/sponsorship-tiers` renders the helper text below the list.
  - Type check + lint clean.

## Open questions

None remaining — all four plan-doc Open Questions locked above.

If `/mlabs-code` finds ambiguity mid-implementation (especially around Task 3's migration ordering or Task 2's test infra), pause per the task's **Pause if** trigger.
