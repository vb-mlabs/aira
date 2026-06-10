# Review: S5 — Renewal Reminder, Homepage Sponsored Sort, Sponsorship Slot Limits

**Date:** 2026-06-10
**Slug:** 2026-06-10-s5-renewal-reminder-homepage-slots
**Plan reviewed:** [2026-06-10-s5-renewal-reminder-homepage-slots.md](../plans/2026-06-10-s5-renewal-reminder-homepage-slots.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** /mlabs-review

---

## Summary

The plan is implementable. Four blockers were identified by reading the actual codebase before review was finalised — all locked below. (1) `findRenewingSoon` already exists in `packages/services/src/business-subscriptions/queries.ts`; the plan's proposed new `getExpiringSoonSubscriptions` is redundant and was dropped — cron handler filters to `paid` only in application code. (2) `listSponsorshipTiersOp` uses `.strict()` so the planned `?category_id=<id>` param would be rejected with 422 before the handler runs — `category_id` must be added to the input schema. (3) `SponsorshipTierSchema` and both create/update input schemas are missing `max_slots` — all three need updating. (4) The F21 approach used a LATERAL JOIN, which Drizzle cannot express via its fluent API; corrected to correlated subqueries matching the existing S4 pattern in `businesses/queries.ts`. Slot count broadened to include `scheduled` sponsorships (a scheduled slot is already committed). No new top-level deps.

---

## Findings

### Blockers (resolved during review)

- **B1 — F20 `findRenewingSoon` already exists.** `packages/services/src/business-subscriptions/queries.ts` exports `findRenewingSoon(db, { withinDays })` returning `RenewingSoonRow[]` (fields: `business_name`, `plan_name`, `end_date`, `days_remaining`, `contact_phone`, `payment_evidence_url`). It queries both `paid` and `overdue`. The plan's new `getExpiringSoonSubscriptions` is dropped; cron handler calls `findRenewingSoon` and filters results to `payment_status === 'paid'` before deciding whether to send email.
  **Decision:** Reuse existing function, filter to `paid` in handler.

- **B2 — F22 `listSponsorshipTiersOp` `.strict()` blocks `category_id`.** Line 17: `input: z.object({ includeInactive: z.coerce.boolean().optional() }).strict()` — the planned `?category_id=<id>` query param will be rejected before the handler runs. `category_id` must be added to the input schema explicitly.
  **Decision:** Add `category_id: z.string().optional()` to `listSponsorshipTiersOp` input, remove `.strict()` from that schema (or keep it with the new key added).

- **B3 — F22 `SponsorshipTierSchema` missing `max_slots`.** `packages/validators/src/sponsorship-tiers.ts` — base `SponsorshipTierSchema`, `SponsorshipTierCreateInputSchema`, and `SponsorshipTierUpdateInputSchema` all lack `max_slots`. The DB column addition is useless without schema support for reads and writes.
  **Decision:** Add `max_slots: z.number().int().positive().nullable().optional()` to all three schemas in T2.

- **B4 — F21 LATERAL JOIN not supported by Drizzle.** The plan's SQL approach (`LEFT JOIN LATERAL (SELECT ... LIMIT 1)`) has no native Drizzle builder equivalent. Existing S4 code in `businesses/queries.ts` uses correlated subqueries inside `.orderBy()` (`sponsoredFlag`, `sponsoredTierPriority`, `sponsoredAmountCents`). Homepage sort must follow the same pattern with category-agnostic variants.
  **Decision:** Add three new correlated-subquery helpers — `homepageSponsoredFlag`, `homepageSponsoredPriority`, `homepageSponsoredAmountCents` — that omit the category filter and query across all active sponsorships for the business. Apply the same ORDER BY shape as S4.

### Concerns (raised, decided, recorded)

- **Concern:** Plan counts only `status = 'active'` sponsorships for slot enforcement. A `scheduled` sponsorship (future start_date, already created) has committed the slot.
  **Decision:** Count `status IN ('active', 'scheduled')` in `countActiveSponsorships`. Prevents overbooking in the window between creation and activation start date.

- **Concern:** `createSponsorshipTier` service currently only passes `city_id`, `name`, `priority` to the Drizzle `.values()` call. Adding `max_slots` to the schema without threading it through the service insert means the column is always `NULL` regardless of what the admin enters.
  **Decision:** Included in T3 — `createSponsorshipTier` and `updateSponsorshipTier` must pass `max_slots` through.

- **Concern:** Renewal reminder email template — the plan mentions `{ businessName, endDate, amountCents }` as template data, but `findRenewingSoon` returns no `amount_cents` field (subscriptions have `price_cents` on the plan, not the row). Also `contact_email: null` is hardcoded (businesses table has no email column).
  **Decision:** Email template data is `{ businessName, planName, endDate, daysRemaining }[]`. No `amountCents` or contact email in the MVP template. The CTA link to `/admin/businesses?renewing=7` provides the drill-down. `REMINDER_DAYS = 7` as a named constant in the cron handler.

### Suggestions (taken or deferred)

- **Taken:** `REMINDER_DAYS = 7` named constant in the renewal-reminder handler (plan Open Questions).
- **Deferred:** `admin_notification_email` AppSetting for a separate ops inbox. `brand.supportEmail` is fine for MVP (plan Open Questions).
- **Deferred:** Homepage slot limits / homepage-specific sponsorship caps — out of scope as per plan (slot limits are per-category).

---

## Decisions locked

1. **Reuse `findRenewingSoon`** — no new service function for F20. Filter to `paid` in the cron handler via `.filter(r => r.payment_status === 'paid')`. Existing `RenewingSoonRow` shape is sufficient for the email template.
2. **Renewal email data shape:** `{ businessName, planName, endDate, daysRemaining }[]`. No `amountCents`, no `contactEmail`.
3. **`REMINDER_DAYS = 7`** as a named constant in `apps/web/src/lib/cron/renewal-reminder.ts`.
4. **F21 uses correlated subqueries**, not LATERAL JOIN. Three new helpers: `homepageSponsoredFlag(businesses.id)`, `homepageSponsoredPriority(businesses.id)`, `homepageSponsoredAmountCents(businesses.id)` — identical shape to S4 variants but without a `categoryId` argument.
5. **Slot count includes `status IN ('active', 'scheduled')`** — prevents overbooking in the scheduled window.
6. **`listSponsorshipTiersOp` input:** add `category_id: z.string().optional()` and remove `.strict()` from input schema.
7. **All three `SponsorshipTier*` schemas** get `max_slots: z.number().int().positive().nullable().optional()`.
8. **`createSponsorshipTier` and `updateSponsorshipTier` services** must pass `max_slots` to Drizzle `.values()`/`.set()`.
9. **Slot display format:** `(X/Y slots)` when under capacity; `(Full — X/X)` when at capacity and disabled. Tiers with `max_slots = null` show nothing (unlimited, no annotation).
10. **Homepage featured tile tier filter** unchanged — tier1 + tier2 only. Sponsored sort works within that existing set.

---

## Implementation plan

### Task 1: DB migration 0018 — `max_slots` on `sponsorship_tier`

- **Files:**
  - `packages/db/src/schema/sponsorship-tiers.ts` (edit)
  - `packages/db/drizzle/migrations/0018_add_sponsorship_tier_max_slots.sql` (generated)
- **What:** Add `max_slots: integer("max_slots").check(sql`max_slots > 0`).default(null)` to the `sponsorshipTier` Drizzle table definition. Run `pnpm db:generate` to produce migration `0018`. Verify the generated SQL matches: `ALTER TABLE sponsorship_tier ADD COLUMN max_slots integer NULL CONSTRAINT sponsorship_tier_max_slots_positive CHECK (max_slots > 0)`.
- **Acceptance:** `pnpm db:generate` produces exactly one new file `0018_*.sql`. `pnpm db:migrate` runs cleanly. `pnpm typecheck` passes. Existing sponsorship_tier rows remain unaffected (`max_slots = NULL` = unlimited).
- **Pause if:** `drizzle-kit` emits any destructive operation (DROP, ALTER TYPE) — flag before applying.

### Task 2: Validators — add `max_slots` to sponsorship-tier schemas

- **Files:**
  - `packages/validators/src/sponsorship-tiers.ts` (edit)
- **What:** Add `max_slots: z.number().int().positive().nullable().optional()` to `SponsorshipTierSchema` (base row shape), `SponsorshipTierCreateInputSchema`, and `SponsorshipTierUpdateInputSchema`. Also add `slots_used: z.number().int().nonnegative().optional()` and `max_slots: z.number().int().positive().nullable().optional()` to `SponsorshipTierSchema` for the annotated list response (slot usage is server-computed, not a DB column). Remove `.strict()` from create and update input schemas now that `max_slots` is a valid key, or confirm they already don't use `.strict()`.
- **Acceptance:** `pnpm typecheck` passes. `SponsorshipTierSchema` can be parsed from an object that includes `max_slots: 2` or `max_slots: null`.

### Task 3: Service layer — slot enforcement + `max_slots` threading

- **Files:**
  - `packages/services/src/sponsorship-tiers/service.ts` (edit)
  - `packages/services/src/sponsorships/queries.ts` (edit)
  - `packages/services/src/sponsorships/service.ts` (edit)
- **What:**
  - `sponsorship-tiers/service.ts`: pass `max_slots` through in `createSponsorshipTier` and `updateSponsorshipTier` Drizzle `.values()`/`.set()` calls.
  - `sponsorships/queries.ts`: add `countActiveSponsorships(db, tierId, categoryId): Promise<number>` — counts rows where `tier_id = tierId AND category_id = categoryId AND status IN ('active', 'scheduled')`.
  - `sponsorships/service.ts`: in `createSponsorship`, after resolving the tier, if `tier.max_slots !== null` call `countActiveSponsorships(db, tierId, categoryId)` within the same transaction. If `count >= tier.max_slots`, throw `ApiError.conflict("sponsorship.tier_slots_full", \`This tier is full for the selected category (${count}/${tier.max_slots} slots used)\`)`.
- **Acceptance:** `pnpm typecheck` passes. Setting `max_slots = 1` on a tier and creating two sponsorships for the same (tier, category) pair: the second creation throws with code `sponsorship.tier_slots_full`. A third attempt after cancelling the first succeeds (slot freed). Slot count includes `scheduled` rows.

### Task 4: Homepage sponsored sort — correlated subqueries in `getFeaturedBusinesses`

- **Files:**
  - `packages/services/src/businesses/queries.ts` (edit)
- **What:** Add three correlated-subquery helpers — `homepageSponsoredFlag(businessId)`, `homepageSponsoredPriority(businessId)`, `homepageSponsoredAmountCents(businessId)` — that query `sponsorship JOIN sponsorship_tier` for the given business across **any** category, filtered to `status = 'active' AND now() BETWEEN start_date AND end_date`, ordered by `priority ASC, amount_cents DESC LIMIT 1`. Apply to `getFeaturedBusinesses`: extend `.orderBy()` to prepend `CASE WHEN homepageSponsoredFlag(...) THEN 0 ELSE 1 END, homepageSponsoredPriority(...) NULLS LAST, homepageSponsoredAmountCents(...) NULLS LAST` before the existing `TIER_ORDER, businesses.name ASC`. The existing `limit = 6` and tier1+tier2 visibility filter are unchanged.
- **Acceptance:** `pnpm typecheck` passes. A tier1 business with an active sponsorship (any category) appears before a tier1 business with no sponsorship in the homepage featured tile. When no active sponsorships exist, sort degrades to `TIER_ORDER + name` (existing behaviour, no regression).

### Task 5: Operation — `listSponsorshipTiersOp` slot annotation

- **Files:**
  - `apps/web/src/server/operations/sponsorship-tiers.ts` (edit)
- **What:** In `listSponsorshipTiersOp`:
  - Change input schema from `z.object({ includeInactive: z.coerce.boolean().optional() }).strict()` to `z.object({ includeInactive: z.coerce.boolean().optional(), category_id: z.string().optional() })` (no `.strict()`).
  - If `category_id` is provided, annotate each tier in the response with `slots_used` (result of `countActiveSponsorships`) and echo back `max_slots`. If `category_id` is absent, omit `slots_used` (set to `undefined`).
  - In `createSponsorshipTierOp` and `updateSponsorshipTierOp`: pass `max_slots` from input through to the service call.
- **Acceptance:** `GET /api/v1/admin/sponsorship-tiers?category_id=<id>` returns each tier with `slots_used` and `max_slots`. `GET /api/v1/admin/sponsorship-tiers` (no `category_id`) returns tiers without `slots_used`. `pnpm typecheck` passes.

### Task 6: UI — slot annotation in Add Sponsorship dialog + Max Slots field in tier form

- **Files:**
  - `apps/web/src/features/admin/components/sponsorships-section.tsx` (edit)
  - `apps/web/src/app/admin/sponsorship-tiers/_components/tier-form.tsx` (edit)
- **What:**
  - `sponsorships-section.tsx` (`AddSponsorshipDialog`): after the admin selects a category, re-fetch `GET /api/v1/admin/sponsorship-tiers?category_id=<id>`. Annotate each tier `<option>` with slot info: if `max_slots != null` and `slots_used < max_slots`, append ` (${slots_used}/${max_slots} slots)`; if at capacity (`slots_used >= max_slots`), append ` (Full — ${slots_used}/${max_slots})` and set `disabled`. Tiers with `max_slots = null` show nothing extra.
  - `tier-form.tsx`: add an optional integer input `#tier-max-slots` (label "Max slots per category", min 1). Helper text: "Leave blank for unlimited. Applies per category — e.g. 1 means only 1 active sponsorship per category at this tier." Bound to `max_slots` field in the form state.
- **Acceptance:** In the Add Sponsorship dialog, selecting a category triggers a tier re-fetch. A tier at capacity is disabled and labelled `(Full — N/N)`. A tier with `max_slots = null` shows no annotation. The tier form saves `max_slots` correctly; the tier list page reflects the new value. `pnpm typecheck` passes.

### Task 7: F20 — Renewal reminder email template + cron handler

- **Files:**
  - `packages/email/src/templates/renewal-reminder.tsx` (new)
  - `packages/email/src/templates/index.ts` (edit — register `sendRenewalReminder`)
  - `apps/web/src/lib/email/templates.ts` (edit — export `sendRenewalReminder`)
  - `apps/web/src/lib/cron/renewal-reminder.ts` (new)
  - `apps/web/src/lib/cron/registry.ts` (edit — schedule at `0 8 * * *`)
- **What:**
  - `renewal-reminder.tsx`: React Email component. `Layout` wrapper, heading "Renewal reminder — N subscription(s) expiring within 7 days", a list row per expiring business showing `businessName`, `planName`, `endDate`, `daysRemaining`. Footer `Button` linking to `/admin/businesses?renewing=7` (text "View renewing businesses"). Follows the `notification.tsx` pattern.
  - `templates/index.ts`: export `sendRenewalReminder({ to, businesses })` from `createTemplates`.
  - `apps/web/src/lib/email/templates.ts`: re-export `sendRenewalReminder`.
  - `renewal-reminder.ts`: `const REMINDER_DAYS = 7`. Handler calls `claimWithAdvisoryLock(db, JOB_NAME, async (tx) => { const rows = await findRenewingSoon(tx, { withinDays: REMINDER_DAYS }); const paid = rows.filter(r => r.payment_status === 'paid'); if (paid.length > 0) { await sendRenewalReminder({ to: brand.supportEmail, businesses: paid.map(...) }); } return { expiring_count: paid.length }; })`. Logs to `cron_run` on success or failure.
  - `registry.ts`: add `cron.schedule("0 8 * * *", renewalReminderHandler)` and register `"renewal-reminder"` in the job registry alongside the two S4 cron handlers.
- **Acceptance:** `GET /admin/cron` shows three job cards: `subscription-status-rollover`, `sponsorship-status-rollover`, `renewal-reminder`. Running `renewal-reminder` with at least one `paid` subscription expiring within 7 days logs `status = 'succeeded'` with `expiring_count > 0`; in dev (consoleDriver) the email renders to stdout with the business list and CTA. Running with no qualifying subscriptions logs `expiring_count = 0` and sends no email. `pnpm typecheck` passes.

---

## Open questions

- **none** — all decisions captured above.
