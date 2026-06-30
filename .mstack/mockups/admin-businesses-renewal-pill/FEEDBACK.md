# Feedback — Admin businesses renewal urgency pill

**Winner: v2 — Stacked caption + overdue left-border.**

## Why this variant won

- Renewal urgency reads from anywhere on the row, not just the
  Subscription column, thanks to the 3px destructive left-border + faint
  tint on overdue rows. That's the core operational ask: admins want to
  *spot* overdue rows while scrolling, not hunt for them by column.
- Keeps the existing `paid` / `pending` / `overdue` `AdminBadge` intact
  so the raw payment-status semantic is preserved (CSV export, audit log,
  filters, the renewals queue all keep their current vocabulary).
- The stacked caption under the badge avoids growing the Subscription
  column horizontally — important because the table already has 6
  columns and any width budget at desktop is tight.

## Variants considered and dropped

- **v1** — too calm. Overdue rows don't pop unless you're already
  looking at the Subscription column.
- **v3** — too risky. Collapsing the standalone payment-status badge
  changes the visual contract for `AdminBadge` and breaks anything
  downstream that reads it.
- **v4** — phone-icon metaphor is misleading (it navigates, doesn't
  dial) and the full-row tint competes with table legibility.

## Decisions locked for /mlabs-plan

1. **Render the urgency caption only when there *is* a current
   subscription.** "Dosa Hut" style rows (no subscription) stay as `—`
   in the Subscription cell with no caption.
2. **Caption color escalation** matches the mockup:
   - `> 14 days remaining` → muted (`text-muted-foreground`)
   - `4-14 days remaining` → warning (burnt orange)
   - `≤ 3 days remaining` → destructive (red, semibold)
   - `overdue` → destructive (red, bold, uppercase, letter-spaced)
3. **Row left-border treatment fires only on overdue rows**, not on
   "due in ≤ 3 days" rows. The signal is "this missed its date,"
   not "this is close to its date."
4. **Caption text format** matches the mockup verbatim:
   - `renews in N days` (paid + future)
   - `due in N days` (pending + future)
   - `OVERDUE N DAYS` (overdue)
5. **Hydration-safe day counts** — compute days-remaining server-side in
   the admin businesses op (it already DISTINCT-ONs the latest
   subscription per business) so the caption text comes from the RSC,
   not from client `Date.now()`. Same lesson as the renewals queue
   `expiryLabel`.
6. **No new design tokens** — destructive + warning + muted-foreground
   already cover what we need. The `box-shadow` row left-border is
   inline CSS (or a single Tailwind arbitrary value) on the row.

## Open question for /mlabs-plan

Whether to extend `AdminBusinessItemSchema` in
`apps/web/src/server/operations/businesses-admin.ts` with two new fields
(`latest_subscription_end_date`, `latest_subscription_days_remaining`)
or compute days-remaining client-side from a single ISO end-date field.
The renewals queue uses `days_remaining` precomputed in the service
layer — symmetry argues for the same pattern here.

## Source files the plan will touch

- `apps/web/src/app/admin/businesses/page.tsx` — table row rendering.
- `apps/web/src/server/operations/businesses-admin.ts` — extend
  `AdminBusinessItemSchema` + the DISTINCT ON query in
  `listAllBusinessesAdminOp`.
- Possibly `packages/validators/businesses.ts` — if the new fields
  surface through any shared schema.
- No changes to `AdminBadge` (deliberate — that decision is what makes
  v2 lower-risk than v3).
