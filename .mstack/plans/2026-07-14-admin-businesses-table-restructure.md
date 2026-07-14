# Plan: admin businesses table restructure — plan name + due-date column, drop owner/contact

**Date:** 2026-07-14
**Slug:** 2026-07-14-admin-businesses-table-restructure
**Status:** reviewed
**Author:** /mlabs-plan (framer@millionlabs.co.uk, via /mlabs-auto)

---

## Problem

The `/admin/businesses` list table is visually cluttered. The Subscription cell stacks two rows (payment-status badge + due-date line) which pushes rows to double the height of their neighbours; scanning down the table your eye has to zig-zag on those cells. Owner and Contact-person columns are rarely used at scan time — admins go into the detail page when they need those. Meanwhile there's no direct signal of which subscription plan a business is on — you have to click through to find out.

User's ask (confirmed by screenshot at `attached_assets/image_1784025873087.png`): flatten every cell to single-line height, split the due date into its own column, drop Owner and Contact-person columns, and repurpose the Subscription column to show the associated plan NAME. That gives every row consistent height and adds a scan-friendly signal (plan) that admins currently can't get without clicking in.

## Scope

**In:**

- Server: extend the `DISTINCT ON (business_id)` query in `listAllBusinessesAdminOp` (at `apps/web/src/server/operations/businesses-admin.ts`) to `LEFT JOIN membership_plans ON business_subscription.plan_id = membership_plans.id` and select `membership_plans.name` as `plan_name`.
- Validator: add `latest_plan_name: z.string().nullable()` to `AdminBusinessItemSchema` (same file). Null covers both no-subscription and orphaned-plan cases; UI shows "—" for both.
- UI: `apps/web/src/app/admin/businesses/page.tsx` — new column order Name | Category | Subscription | Due date | Verified | Status. Subscription cell renders `{b.latest_plan_name ?? "—"}` in plain foreground text. Due-date cell renders `expiryLabel(days, endDate)` with the existing color coding (isOverdue → red-bold uppercase, isCritical → red-semibold, else muted). Both cells single-line. Owner + Contact-person `<td>`s and their `<th>`s deleted.

**Out (deferred):**

- Removing `owner` or `contact_person` fields from `AdminBusinessItemSchema` / `BusinessAdminSchema`. Fields stay on the response for other consumers (detail page, CSV export, the server-side `?owner=has|none` filter). Only the UI display goes.
- The server-side `?owner=has|none` filter capability. It has no UI surface today; leaving the op input schema intact avoids a breaking-change decision.
- The AdminBadge for payment_status. Superseded by the color-coded Due-date column — same signal, fewer pixels.
- Renewals CSV export (`/api/v1/admin/businesses/renewals.csv?...`) — column shape untouched; download button stays.
- Row-click behaviour and the overdue left-border treatment. Both preserved as-is.
- Detail page (`/admin/businesses/[id]`) — no change; still surfaces owner + contact-person + full subscription history.
- Mobile.

## Approach

**Chosen path — extend the existing DISTINCT ON with a LEFT JOIN, plumb `latest_plan_name` through to the row schema, restructure the two files that render the table.**

Query change is minimal: the current `SELECT DISTINCT ON (business_id) business_id, payment_status, end_date FROM business_subscription ORDER BY business_id, end_date DESC` becomes `SELECT DISTINCT ON (bs.business_id) bs.business_id, bs.payment_status, bs.end_date, mp.name AS plan_name FROM business_subscription bs LEFT JOIN membership_plan mp ON bs.plan_id = mp.id ORDER BY bs.business_id, bs.end_date DESC`. The LEFT JOIN handles both "no plan_id set" (subscription with null FK) and "plan was deleted" (orphaned reference) — both produce `plan_name = null` at the client. UI's `?? "—"` handles both.

UI restructure is a straight column swap: two `<th>` cells removed (Owner, Contact person), two `<td>` blocks removed, one `<th>` added (Due date), one `<td>` added (Due date). The Subscription `<td>` simplifies from the badge + inline expiry-line stack to a plain text node. The color-coding logic (`isOverdue`, `isCritical` from `days`) migrates from the inline expiry span onto the new Due-date `<td>` unchanged.

The payment-status signal that the AdminBadge used to carry survives via the Due-date column's color coding — red-bold-uppercase for overdue, red-semibold for critical (within 3 days), muted for everything else. Same three visual states; fewer pixels; single-line rows.

**Alternatives considered:**

- **Keep the payment-status AdminBadge as a fourth cell in the Subscription column area.** Rejected — perpetuates the "cluttered cell" problem the user is trying to fix.
- **Add a separate payment-status column.** Rejected — two "Status" columns (payment + archive) is confusing and doesn't match the user's ask for a cleaner scan.
- **Drop payment-status entirely.** Rejected — the color-coded due date preserves the signal at effectively zero UI cost.
- **On-demand fetch for plan name when the row is expanded.** Rejected — no expansion mechanism on this table; the list op is the right place to include the field.

## Data model changes

None. No schema migration. The JOIN reads from `business_subscription.plan_id` (`.references(() => membershipPlans.id, { onDelete: "set null" })` — already exists) and returns `membership_plans.name` (already exists).

## Files to touch

**Edit:**

- `apps/web/src/server/operations/businesses-admin.ts` — two changes: (1) extend the raw `sql\`\`` DISTINCT ON query to add the JOIN + `plan_name` alias; (2) extend `AdminBusinessItemSchema` with `latest_plan_name: z.string().nullable()` and thread it through the `.map()` at line ~168.
- `apps/web/src/app/admin/businesses/page.tsx` — restructure the table: drop two column heads + two `<td>`s, add one column head + one `<td>` (Due date), change the Subscription `<td>` to plain plan name + "—" fallback.

**Do not touch:**

- `packages/services/src/businesses/*` — the query lives inline in the op handler, no service function to extend.
- `packages/validators/src/businesses.ts` — `BusinessAdminSchema` is extended at the op layer, not at the base validator. Base schema unchanged.
- Schema files, migrations, FK config, `membership-plans` service.
- `getBusinessByIdAdminOp` (detail page) — separate op with its own owner fetch.
- Renewals CSV route.
- Any `[id]` edit-modal or subscription-section code.
- Mobile.

## Edge cases

- **Business with no subscription at all.** All `latest_*` fields including `latest_plan_name` are `null`. Subscription cell renders "—", Due date cell renders nothing (currently already conditional on `endDate !== null`). No visual regression.
- **Subscription with `plan_id: null`** (subscription rows can have null plan since the FK is `onDelete: "set null"` — a plan was deleted from under it). LEFT JOIN returns `plan_name: null`. Cell renders "—". Same as "no subscription" from the admin's scan perspective; if they need to know which plan it WAS, that's a detail-page concern.
- **Business with multiple subscription rows.** DISTINCT ON keeps only the one with the latest `end_date` — behaviour unchanged. The JOIN uses that row's `plan_id`.
- **Overdue row treatment.** Row still gets the destructive left-border shadow when `isOverdue` — that logic is preserved on the `<tr>`, unchanged.
- **Renewing filter (`?renewing=N`).** Filters run on `subMap` (which now includes `plan_name` too) — no filter-logic change needed.
- **CSV download button.** Renders when `renewing` is set. Points at the untouched CSV route. No change.
- **Owner-filter server-side (`?owner=has|none`).** No UI change; still works if a URL param is passed manually.
- **Long plan names.** No fixed column width; the browser wraps if needed. If wrapping becomes an issue, add `max-w-[Xpx]` + `truncate` in a follow-up. Not needed for MVP given plan-name conventions are short ("Basic", "Standard", "Premium").
- **CategoryLine text length.** Same behaviour as today; unchanged.
- **Runtime output validation.** `AdminBusinessListOutputSchema` re-validates every response against the extended schema — every row must have `latest_plan_name` present (even if null). The server code must always include the key. Verified: the `.map()` in `listAllBusinessesAdminOp`'s handler is the single point of transformation; adding the field there covers every row.

## Acceptance criteria

- [ ] `latest_plan_name: z.string().nullable()` added to `AdminBusinessItemSchema`.
- [ ] The `DISTINCT ON` raw-SQL query in `listAllBusinessesAdminOp` includes `LEFT JOIN membership_plan mp ON bs.plan_id = mp.id` and selects `mp.name AS plan_name`.
- [ ] The handler's `.map()` populates `latest_plan_name: sub?.plan_name ?? null` on every row.
- [ ] The admin businesses table renders: **Name | Category | Subscription | Due date | Verified | Status** (six columns).
- [ ] Subscription cell shows the plan name in plain foreground text, or "—" when null.
- [ ] Due date cell shows `expiryLabel(days, endDate)` with the existing color-coding (isOverdue → destructive bold uppercase, isCritical → destructive semibold, else muted).
- [ ] Every cell renders in a single line — no more vertical stacking within a cell.
- [ ] Owner and Contact-person columns are gone from the table.
- [ ] Row-click still navigates to the detail page (link overlay preserved).
- [ ] Overdue rows still get the red-tint background + red left-border treatment.
- [ ] Renewals CSV download button still appears when `?renewing=N` is set.
- [ ] `pnpm --filter @aira/web typecheck` clean.
- [ ] `pnpm --filter @aira/web lint` — 0 errors.
- [ ] `pnpm --filter @aira/web build` succeeds.
- [ ] No mobile changes, no schema migration.

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Payment-status signal preservation.** Recommend (a) — plan name in Subscription cell, color-coded Due date carries the payment-status signal. Alternatives (add a Status(payment) column or drop the signal entirely) both worse. Lock.

2. **Fallback text for null plan name.** "—" (matches existing convention for missing Owner / Contact-person / Verified cells). Alternatives ("Unassigned", "No plan", "(deleted plan)") add noise. Recommend "—".

3. **Column width hints.** Some plan names could be long; some are short. Recommend no explicit `max-w-*` — let the browser flow and see if wrapping becomes a problem. Add `truncate` in a follow-up if scan-friendliness suffers. Adding truncate now is speculative width management.
