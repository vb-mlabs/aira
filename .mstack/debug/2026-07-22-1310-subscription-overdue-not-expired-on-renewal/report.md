---
name: subscription-overdue-not-expired-on-renewal
description: Prior overdue subscription stays labeled "Overdue" after a new subscription is added to the same listing — no supersede logic exists
---

# Debug — Prior overdue subscription doesn't transition to "Expired" when a new subscription is activated on the same listing

**Started:** 2026-07-22 13:10
**Source:** user-report (admin app)
**Env:** localhost (unit-level repro — no dev server required)
**Status:** implemented (see [.mstack/code/2026-07-22-1310-subscription-overdue-not-expired-on-renewal/report.md](../../code/2026-07-22-1310-subscription-overdue-not-expired-on-renewal/report.md); commits `4ffbcf4`, `51c90d4`)
**Investigator:** /mlabs-debug

## Symptom

On a listing's admin detail page, the Subscriptions table shows the prior
6-month subscription with the badge "Overdue" even after a new 1-year
subscription has been added to the same listing. The user expected the prior
row to change to "Expired" once the new subscription is active.

## Repro

1. Listing with an existing 6-month subscription whose `end_date` is in the
   past — the nightly `subscription-status-rollover` cron
   (`apps/web/src/lib/cron/subscription-status-rollover.ts`) has flipped
   `payment_status` from `paid` → `overdue`.
2. Admin opens `/admin/businesses/<id>`, uses **Add subscription** in the
   Subscriptions section to record a new 1-year subscription with
   `payment_status = paid`.
3. Check the Subscriptions table.

**Expected:** the prior 6-month row shows "Expired"; the new 1-year row shows "Active/Paid".
**Actual:** the prior 6-month row still shows "Overdue"; the new 1-year row shows "Paid".

## Investigation

- **Enum has 3 values only.** `payment_status` is a pgEnum defined at
  `packages/db/src/schema/business-subscriptions.ts:14–18` — values are
  `"paid" | "pending" | "overdue"`. There is no `"expired"` value.
- **No supersede logic anywhere.** Grepped all of
  `packages/services/src/business-subscriptions/`,
  `apps/web/src/app/api/v1/admin/businesses/[id]/subscriptions/`, and
  `apps/web/src/server/operations/business-subscriptions.ts`. No code path
  reads a listing's prior subscriptions when creating a new one; each row's
  `payment_status` is set independently.
- **Only transition in code.** `packages/services/src/business-subscriptions/service.ts:71`
  `rolloverExpiredSubscriptions(db)` — called by the nightly cron
  (`apps/web/src/lib/cron/subscription-status-rollover.ts:10`,
  registry entry at `apps/web/src/lib/cron/registry.ts:40–60`, schedule
  `5 0 * * *`). This is the sole transition, and it goes `paid → overdue`
  when `end_date < now()`. Nothing goes further.
- **UI renders the raw value.**
  `apps/web/src/features/admin/components/subscriptions-section.tsx:167–178`
  maps `sub.payment_status` through a 3-key `STATUS_STYLES` record and
  prints it verbatim. No derived state.
- **"Expired" exists elsewhere but not here.** `expired` is a real status
  for `community/posts` (`features/community/components/post-card.tsx:188`,
  `features/admin/community/community-table.tsx`) and for sponsorships
  (`features/admin/components/sponsorships-section.tsx:36`). It has **never**
  been part of the business-subscription model.
- **List view derives "overdue" a second time.**
  `apps/web/src/app/admin/businesses/page.tsx:124–135` computes
  `isOverdue = days !== null && days < 0` from `days_remaining` (independent
  of `payment_status`). So the businesses *list* likely already looks correct
  after a renewal (the newest sub drives the row); the visual bug is
  scoped to the per-business Subscriptions table.

## Root cause

There is no bug in a broken code path. The behavior the user is reporting
requires a feature that has not been built: transitioning a superseded
subscription out of "Overdue" into a terminal "Expired" state (or displaying
it as such) once a newer active subscription exists on the same listing.

The current data model — `payment_status ∈ {paid, pending, overdue}` with no
`supersede`, `superseded_by`, or `expired` concept — treats each subscription
as independent. The Subscriptions table therefore shows the raw stored value
forever, and "Overdue" persists on rows whose `end_date` is well behind the
newest subscription's `start_date`.

**Failing test:**
`.mstack/debug/2026-07-22-1310-subscription-overdue-not-expired-on-renewal/specs/subscription-display-status.repro.test.ts`
— asserts `deriveDisplayStatus(older, [older, newer]) === "expired"`.
Currently fails with `Failed to resolve import "@/features/admin/components/subscription-display-status"`
because the derivation module does not exist. Run via:
`pnpm --filter @aira/web exec vitest run -c .mstack/debug/2026-07-22-1310-subscription-overdue-not-expired-on-renewal/specs/vitest.config.ts`

## Scope decision (resolved — Option A)

Three viable fix shapes, ordered cheapest → most correct:

### Option A — UI-only derived label (recommended)

In `apps/web/src/features/admin/components/subscriptions-section.tsx`,
compute a derived display status per row:

- If a row has an `end_date` earlier than the max `start_date` in the list,
  render the badge as **"Expired"** (regardless of stored `payment_status`).
- Otherwise render `payment_status` as today.

Zero schema change, zero migration, zero back-fill risk. The stored data
remains truthful (`overdue` still means "past end_date, unpaid at cron
run"), and only the display in this one surface gets the historical
context. Failing test lives in `subscriptions-section.test.tsx`.

**Cost:** ~1 file, ~15 LoC, one test.
**Risk:** near-zero. Doesn't affect renewals queue, cron, or reporting.

### Option B — Add `expired` to the enum + supersede on create

- pgEnum change: add `"expired"` to `payment_status`.
- Migration via `pnpm db:generate` (Replit trap: must `pnpm --filter @aira/db migrate` before commit, per your memory `replit-db-migration-trap.md`).
- In `createSubscription` (`packages/services/src/business-subscriptions/service.ts:13`), inside a transaction: after inserting the new row, `UPDATE business_subscription SET payment_status='expired' WHERE business_id=$1 AND id<>$2 AND payment_status IN ('paid','overdue') AND end_date < $3` (new sub's `start_date`).
- Back-fill migration for the ~N existing overdue rows already superseded.
- Update `PaymentStatusSchema` in `packages/validators/src/business-subscriptions.ts` and every place that switches on the enum (`admin-badge.tsx`, `subscriptions-section.tsx`, `renewal-queue-table.tsx`, `queries.ts:53/81/137`).

**Cost:** ~10 files, migration, back-fill, more tests.
**Risk:** medium. Migration coordination, the renewals queue's `paid+overdue` filter needs to stay correct, and any external system consuming this enum (analytics, exports) needs updating.

### Option C — Derived `display_status` on the server

In `listSubscriptionsByBusiness`, compute per-row `display_status` in the
query (or in `toSubscription`) using the same rule as Option A. UI
consumes `display_status` instead of `payment_status`. Slightly more
correct than A because the derivation lives once, server-side, and can be
reused by any future consumer.

**Cost:** ~3 files, one test.
**Risk:** low. Mostly a naming/plumbing change.

## Fix plan (for /mlabs-code)

**Files to change:**

- `apps/web/src/features/admin/components/subscription-display-status.ts` — **new file**. Export a pure function `deriveDisplayStatus(sub, all)` where `sub` and each element of `all` have `{ payment_status: "paid"|"pending"|"overdue"; start_date: string; end_date: string }`. Rule: if `all.length > 1` and `sub.end_date < max(all.map(s => s.start_date))`, return `"expired"`; else return `sub.payment_status`. Return type is the string union `"paid" | "pending" | "overdue" | "expired"`. No `import "server-only"` — this is a pure client-usable helper.

- `apps/web/src/features/admin/components/subscription-display-status.test.ts` — **new file**. Copy the three test cases from `.mstack/debug/2026-07-22-1310-subscription-overdue-not-expired-on-renewal/specs/subscription-display-status.repro.test.ts` verbatim (they match the existing `expiry-label.test.ts` co-location pattern in `apps/web/src/features/admin/renewals/`).

- `apps/web/src/features/admin/components/subscriptions-section.tsx` — three edits:
  1. Line 28: change `type PaymentStatus = "paid" | "pending" | "overdue"` to `type DisplayStatus = "paid" | "pending" | "overdue" | "expired"`, add `expired: "bg-muted text-muted-foreground"` to `STATUS_STYLES` (line 30–34), matching the sponsorships-section pattern at `sponsorships-section.tsx:41`.
  2. Line 167–178: import `deriveDisplayStatus` and compute `const displayStatus = deriveDisplayStatus(sub, subs)` once per row. Feed `displayStatus` into the badge's className lookup and rendered label (lines 173, 177).
  3. No other logic changes. Do NOT change the edit dialog's `<option value="overdue">Overdue</option>` (line 594) — the admin still needs to record the stored payment status directly; only the *display* on the list gets the derived value.

**Why it fixes the cause:** The failing test asserts a superseded row's derived display status is `"expired"`. Creating the derivation module and wiring `subscriptions-section.tsx` through it makes that assertion pass and gives the user the expected UX. Stored `payment_status` values remain unchanged.

**Hard-rule reminders:** _(none apply — no schema change, no env access, no service-layer change, no Zod boundary, no Server Action.)_

**Acceptance:**

1. `pnpm --filter @aira/web exec vitest run -c .mstack/debug/2026-07-22-1310-subscription-overdue-not-expired-on-renewal/specs/vitest.config.ts` — the three cases in `subscription-display-status.repro.test.ts` pass.
2. Manual repro:
   - Start `pnpm dev`.
   - On a dev listing with an overdue subscription in the past, use the admin **Add** button to create a new subscription whose `start_date` is after the older row's `end_date`.
   - The older row's badge now reads **"Expired"** (muted grey); the new row still reads **"Paid"**.

## Out of scope

## Out of scope

- Renewals queue (`/admin/renewals/`) — the query already filters by
  `end_date > now()`, so superseded subs don't leak in.
- Businesses list page — derives its "overdue" state from `days_remaining`
  of the *newest* subscription; not affected by this bug.
- Adding a `superseded_by` FK column (nice-to-have for audit, but the bug
  report doesn't require it).

## External references

_(none — internal-only bug)_
