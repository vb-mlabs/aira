# Mockup brief: S4 business-edit Subscriptions + Sponsorships sections

**Source:** `/mlabs-mockup --from-review 2026-06-10-s4-membership-sponsorship`
**Review:** [.mstack/reviews/2026-06-10-s4-membership-sponsorship.md](../../reviews/2026-06-10-s4-membership-sponsorship.md)

## Feature

Two new sections that mount inside `/admin/businesses/[id]` (file: `apps/web/src/features/admin/components/business-detail.tsx`):

1. **Subscriptions section** — lists all `business_subscription` rows for this business sorted by `end_date DESC`. Each row shows: plan name, period (start → end), payment status pill, payment evidence chip ("No evidence on file" warning when null), notes, amount, recorded-by. Inline "Add subscription" form picks a plan (auto-fills end_date from plan duration_months), payment_status, evidence upload (react-dropzone reuse), notes.
2. **Sponsorships section** — lists all `sponsorship` rows for this business. Each row shows: category, tier name + priority, period (start → end), status pill (scheduled/active/expired/cancelled), amount, notes. Inline "Add sponsorship" form picks category + tier + dates + amount.

Both sections live below the existing Gallery / Editorial / Rating sections in the flat-layout admin shell. No modals.

## Users

Nisarga Group admins reconciling manual payments + assigning sponsorships. Primary actions: record a payment (with evidence screenshot), check whether a business is currently visible (paid subscription covering today), assign a sponsorship slot. They scan multiple rows quickly during a renewals push.

## Variant axis

**Layout density.** All three variants render the same data and use the same brand tokens (olive primary, cream card, warm parchment background, Lato + Cormorant). They differ in how dense each row is and how the eye scans the section.

- **v1 — Stacked cards.** Each row is a full-width card with all fields visible at once. Spacious. Best for careful per-row reading; worst for scanning lots of rows.
- **v2 — Compact table.** Each row is a single table line with status / period / amount as inline columns. Densest; best for scanning many rows; "Add" form pulls down inline below the table.
- **v3 — Hybrid summary + expand.** Each row collapses to a one-line summary (status + plan + period + amount); click to expand the full detail (notes, evidence, recorded-by). Balances scan density with depth.

## Number of variants

3.

## Constraints honored

- Uses the existing section pattern: `rounded-lg border border-border bg-card`, bordered-bottom header (px-6 py-4), content area space-y-4 px-6 py-5. Save / status patterns reuse the existing convention.
- Status chips reuse the pill shape from `/admin/businesses` (rounded-full px-2 py-0.5 text-xs font-medium) with semantic foreground/background pairs.
- Tier pills (sponsorship_tier name) reuse the small uppercase tier badge style from `business-card.tsx`.
- Real data: Spice Garden as the host business; 3 subscriptions across paid/overdue, 3 sponsorships across active/scheduled/expired/cancelled.
