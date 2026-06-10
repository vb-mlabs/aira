# Plan: S5 — Renewal Reminder, Homepage Sponsored Sort, Sponsorship Slot Limits

**Date:** 2026-06-10
**Slug:** 2026-06-10-s5-renewal-reminder-homepage-slots
**Status:** implemented
**Author:** VB (framer@millionlabs.co.uk)

---

## Problem

Three gaps remain after S4 that affect admin operations and public listing quality:

1. **Admin has no proactive renewal signal.** The `/admin/businesses?renewing=7` filter exists, but requires the admin to manually check it. Subscriptions expire silently unless the admin happens to look. A daily email summary removes that dependency.

2. **Homepage featured tile ignores sponsorships.** The category listing pages already float sponsored businesses to the top (S4). The homepage's featured tile still sorts strictly by tier + name — a business that paid for a sponsorship gets no homepage benefit, which undermines the sponsorship value proposition.

3. **Sponsorship tiers have no capacity limits.** A tier meant to convey exclusivity (e.g. "Premier — 1 slot per category") can be sold to unlimited businesses, diluting the tier's value and breaking admin promises to early sponsors.

**Who benefits:**
- **Admin:** proactive renewal alert removes the manual-check burden; slot limits let admin sell exclusive tiers with confidence.
- **End-users browsing the homepage:** sponsored businesses get appropriate visibility on the highest-traffic page.
- **Sponsored businesses:** sponsorship investment translates to homepage placement, not just category pages.

---

## Scope

**In:**
- **F20 — Renewal reminder cron:** New `renewal-reminder` daily job. Queries subscriptions expiring within 7 days with `payment_status = 'paid'`. If any found, sends a summary email to `brand.supportEmail` (admin operational inbox). Logs to `cron_run`. Appears on the `/admin/cron` page automatically via the existing registry.
- **F21 — Homepage sponsored sort:** Extend the S4 sponsored-float sort to `getFeaturedBusinesses`. Businesses with any active sponsorship across any category float to the top, ordered by best tier priority → highest bid → existing TIER_ORDER → name. No change to the tier1+tier2 filter — sort is additive.
- **F22 — Sponsorship slot limits:** Add `max_slots integer NULL` to `sponsorship_tier` (NULL = unlimited). Enforce at create time in the service layer. Surface slot availability in the "Add sponsorship" dialog tier dropdown after a category is selected. Tier admin form gains a "Max slots per category" field.

**Out (deferred):**
- SMS / WhatsApp renewal reminders — messaging infra is out of scope for MVP.
- Configurable reminder window (hardcoded 7 days is fine for MVP; AppSetting-driven is S6).
- Renewal reminder email to individual business owners — admin-only notification for now.
- Multi-currency — USD only.
- Stripe / self-serve payment.
- AppSetting-driven cron schedules (S6).
- Slot limits on the homepage tile (slots are per category sponsorship; homepage sort aggregates across categories without consuming a slot).

---

## Approach

### F20 — Renewal Reminder Cron

New cron handler at `apps/web/src/lib/cron/renewal-reminder.ts`, following the exact same pattern as `subscription-status-rollover.ts`: `JOB_NAME` constant, `pg_advisory_xact_lock` via `cronService.claimWithAdvisoryLock`, log to `cron_run`. Registered in `registry.ts` and scheduled at `0 8 * * *` (8 AM UTC daily — gives admin a morning digest).

The handler calls a new service function `getExpiringSoonSubscriptions(db, { days: 7 })` that returns an array of `{ businessName, endDate, amountCents }`. If the array is non-empty, the handler sends a `renewalReminder` email via the existing `@/lib/email/templates` composition root.

New email template `packages/email/src/templates/renewal-reminder.tsx` follows the existing `notification.tsx` pattern: React Email component, `Layout` + `Text` + optional `Button` (deep-links to `/admin/businesses?renewing=7`), registered in `createTemplates`. The email is sent to `brand.supportEmail` — no new config key needed for MVP.

**Why not an in-app badge?** An email requires no UI work and reaches the admin even if they haven't opened the app that day. The renewing filter already provides the in-app view; the cron adds the push signal.

### F21 — Homepage Sponsored Sort

`getFeaturedBusinesses` in `packages/services/src/businesses/queries.ts` gains a LATERAL subquery that, for each business, finds its best active sponsorship across **any** category:

```sql
LEFT JOIN LATERAL (
  SELECT st.priority, s.amount_cents
  FROM sponsorship s
  JOIN sponsorship_tier st ON st.id = s.tier_id
  WHERE s.business_id = businesses.id
    AND s.status = 'active'
    AND now() BETWEEN s.start_date AND s.end_date
  ORDER BY st.priority ASC, s.amount_cents DESC
  LIMIT 1
) _best_sp ON true
```

Sort expression mirrors S4's pattern:

```
ORDER BY
  CASE WHEN _best_sp.priority IS NOT NULL THEN 0 ELSE 1 END,
  _best_sp.priority ASC NULLS LAST,
  _best_sp.amount_cents DESC NULLS LAST,
  TIER_ORDER,
  businesses.name ASC
```

No migration. Service-only change. The existing `limit = 6` cap and `tier1+tier2` visibility filter are unchanged — sponsored sort works within the existing set.

**Why LATERAL and not a correlated subquery per ORDER BY clause?** The S4 per-category sort uses three separate correlated subqueries (flag, priority, amount). For a cross-category aggregate, a single LATERAL is cleaner and avoids three separate EXISTS/subselect round-trips per row.

**Why keep the tier1+tier2 filter?** The homepage featured tile communicates "top businesses" — tier3 businesses with sponsorships would look odd here. Sponsored sort within tier1+tier2 lifts paying sponsors without changing the homepage's curated feel.

### F22 — Sponsorship Slot Limits

**DB layer:** `ALTER TABLE sponsorship_tier ADD COLUMN max_slots integer NULL CHECK (max_slots > 0)`. Null = unlimited (existing tiers stay unlimited by default). Migration `0018`.

**Service enforcement:** `createSponsorship` reads the tier's `max_slots`. If non-null, it runs a count of active sponsorships for `(tier_id, category_id)` in the same transaction, before the INSERT. If `count >= max_slots`, throw `ApiError.conflict("sponsorship.tier_slots_full", "This tier is full for the selected category (${count}/${max_slots} slots used)")`.

**Tier dropdown UX:** When the admin selects a category in the "Add sponsorship" dialog, the client re-fetches tiers at `GET /api/v1/admin/sponsorship-tiers?category_id=<id>`. The operation annotates each tier's response with `{ slots_used: number, max_slots: number | null }`. Tiers at capacity show "(Full)" and are disabled in the select; others show `(X/Y slots)` or nothing if unlimited.

**Tier form:** Adds an optional "Max slots per category" integer field (`#tier-max-slots`, min 1). Displayed with a helper: "Leave blank for unlimited. Enforced per category — e.g. setting 1 means only 1 active sponsorship can exist for a given category at this tier."

**Alternatives considered:**

- **Global slot limit (per tier, across all categories)** — rejected. "3 Premier slots" with no category dimension makes little sense when a business sponsors per-category. Per-(tier, category) matches the sponsorship model.
- **Slot limit UI as a hard block before submit** (disable "Add sponsorship" button) — rejected in favour of the current approach (disable tier option in the dropdown after category is selected). The current approach is simpler: one extra fetch after category pick, no state machine needed.
- **Count at list time without locking** — accepted as the right trade-off. The INSERT-with-count is in the same transaction as the service call but NOT advisory-locked; the race condition (two concurrent creates for the last slot) is cosmetically survivable at MVP scale (admin operations, small volume). A unique partial index or serialisable transaction is the S6 fix if contention surfaces.

---

## Data model changes

**Migration `0018`** (single DDL statement):

```sql
ALTER TABLE sponsorship_tier
  ADD COLUMN max_slots integer NULL
  CONSTRAINT sponsorship_tier_max_slots_positive CHECK (max_slots > 0);
```

No seed data — existing tiers remain unlimited (NULL).

---

## Files to touch

**New:**
- `packages/email/src/templates/renewal-reminder.tsx` — React Email component (summary list of expiring businesses + CTA button to admin renewing filter)
- `apps/web/src/lib/cron/renewal-reminder.ts` — cron handler (claimWithAdvisoryLock + sendRenewalReminder + log)
- `packages/db/drizzle/migrations/0018_add_sponsorship_tier_max_slots.sql` — generated via `pnpm db:generate`

**Edit:**
- `packages/db/src/schema/sponsorship-tiers.ts` — add `max_slots` column
- `packages/validators/src/sponsorship-tiers.ts` — add `max_slots: z.number().int().positive().nullable().optional()` to create + update schemas
- `packages/services/src/businesses/queries.ts` — add LATERAL join + sponsored sort to `getFeaturedBusinesses`
- `packages/services/src/sponsorships/service.ts` — slot check in `createSponsorship`
- `packages/services/src/sponsorships/queries.ts` — new `countActiveSponsorships(db, tierId, categoryId)` helper
- `packages/email/src/templates/index.ts` — register `sendRenewalReminder` in `createTemplates`
- `apps/web/src/lib/email/templates.ts` — export `sendRenewalReminder`
- `apps/web/src/lib/cron/registry.ts` — register and schedule `renewal-reminder` at `0 8 * * *`
- `apps/web/src/server/operations/sponsorship-tiers.ts` — `listSponsorshipTiersOp` accepts optional `category_id` and annotates response with slot usage; `createSponsorshipTierOp` + `updateSponsorshipTierOp` handle `max_slots`
- `apps/web/src/app/api/v1/admin/sponsorship-tiers/route.ts` — already passes through to op; no change needed if op handles the param
- `apps/web/src/features/admin/components/sponsorships-section.tsx` — `AddSponsorshipDialog`: after category selection, re-fetch tiers with `category_id`; annotate tier options with slot info; disable full tiers
- `apps/web/src/app/admin/sponsorship-tiers/_components/tier-form.tsx` — add `#tier-max-slots` field
- `packages/validators/src/sponsorships.ts` — no change needed (slot error is thrown at service layer, not schema)

---

## Edge cases

- **Slot race condition:** two admin sessions submit the last slot simultaneously. Both pass the count check and both INSERTs succeed, briefly exceeding max_slots by 1. Acceptable at MVP scale (admin-only, low concurrency). Document in code; add a unique partial index in S6 if needed.
- **Tier deactivated after slots are sold:** `max_slots` check only runs for new creations. Existing over-limit rows remain valid; deactivating a tier doesn't void existing sponsorships.
- **category_id not found in tier slot fetch:** if the supplied `category_id` doesn't exist, the slot count query returns 0 for all tiers — effectively "unlimited" display. No error thrown (the category validation runs at sponsorship create time).
- **Renewal reminder with zero expiring subscriptions:** cron runs, finds none, skips email send, logs `cron_run` with `{ expiring_count: 0 }` as succeeded. No email sent.
- **Email driver not configured (dev / test):** falls back to `consoleDriver` (stdout), same as all other transactional emails. No error thrown.
- **Homepage featured tile: no active sponsorships at all:** LATERAL join returns NULL for all businesses → sort degrades to TIER_ORDER + name, same as current behaviour. Fully backwards-compatible.
- **`getFeaturedBusinesses` with limit 6 and all 6 sponsored:** LATERAL join adds one subquery per row in the result set, not the whole table. At limit=6 the overhead is negligible.

---

## Acceptance criteria

- [ ] `GET /admin/cron` shows three job cards: `subscription-status-rollover`, `sponsorship-status-rollover`, `renewal-reminder`. "Run now" works for all three.
- [ ] Running `renewal-reminder` with at least one subscription expiring within 7 days logs a `cron_run` row with `status = 'succeeded'` and `summary` containing `expiring_count > 0`.
- [ ] Running `renewal-reminder` with no expiring subscriptions logs `status = 'succeeded'` and `expiring_count = 0`; no email is sent.
- [ ] In dev (consoleDriver), the renewal reminder email renders to stdout with a list of expiring businesses and a CTA link to `/admin/businesses?renewing=7`.
- [ ] Homepage (`/`) shows tier1+tier2 businesses with any active sponsorship appearing before unsponsored tier1+tier2 businesses.
- [ ] A business with an active sponsorship in any category sorts higher on the homepage than the same-tier business with no sponsorship.
- [ ] Creating a `sponsorship_tier` with `max_slots = 1` via admin form saves the value; the tier list page reflects it.
- [ ] Creating a sponsorship for a tier with `max_slots = 1` that already has 1 active sponsorship in that category returns an error with code `sponsorship.tier_slots_full` and does not create the row.
- [ ] The "Add sponsorship" dialog tier dropdown shows "(1/1 slots)" for a full tier and disables it; after selecting a different category the slot count refreshes.
- [ ] `pnpm typecheck` and `pnpm check-contrast` both pass after implementation.

---

## Open questions

- **Renewal reminder window (7 days):** hardcoded for now. Should the reviewer lock this as a named constant in the handler, or is it fine as a magic number with a comment? Lean toward a named constant (`const REMINDER_DAYS = 7`) for readability.
- **Renewal reminder email recipient:** currently `brand.supportEmail`. If the admin needs a separate ops email, that's an `admin_notification_email` AppSetting in S6. Confirm this deferral is acceptable.
- **Homepage tier filter:** keeping tier1+tier2 filter. If a tier3 business has an active sponsorship, it does NOT appear in the homepage featured tile — only on the relevant category listing page. Confirm this is the desired behaviour.
- **Slot count enforcement at homepage level:** a business with, say, 3 active sponsorships in different categories counts as 1 entity in the homepage sort (best sponsorship wins). There is no "homepage slot limit." Confirm.
