# Brief — Admin businesses renewal urgency pill

**Feature / screen.** Surface renewal urgency directly in the Subscription
cell of the `/admin/businesses` table at
`apps/web/src/app/admin/businesses/page.tsx`. The 6-column table (Name,
Category, Tier, Subscription, Verified, Status) already shows
paid/pending/overdue via `AdminBadge`. We want admins to see *when* a
subscription is about to lapse — or how far overdue it is — without
opening each business detail page or leaving the directory for the
dedicated `/admin/renewals` queue.

**Users.** Admins + super_admins. Primary action while in this table:
"do I need to do anything about renewals this week?" Today they have to
either click into each row or switch to `/admin/renewals` to find out.

**Goal & non-goals.**
- Make renewal urgency visible at-a-glance on `/admin/businesses`.
- Do **not** absorb the `/admin/renewals` workflow (phone-banking +
  follow-up modal + call-outcome logging stays there).
- Keep the existing payment-status semantics (paid / pending / overdue)
  legible — the pill is *additional* signal, not a replacement (except v3,
  which deliberately collapses both into one).

**Variant axis (what they differ on).**
1. **Color treatment of the urgency pill** — destructive vs warning vs
   muted depending on time bucket.
2. **Position relative to the existing payment badge** — beside it,
   stacked under it, or replacing it.
3. **Row-level treatment for overdue rows** — none, thin left border, or
   full subtle row tint.

**Variants.**
- **v1 — Inline soft-escalation pill.** Existing payment badge stays;
  small urgency pill is appended to its right in the same cell. No
  row-level treatment.
- **v2 — Stacked caption + overdue left-border.** Existing payment badge
  stacks vertically with a small "in 5d" / "OVERDUE 3d" caption. Overdue
  rows get a 3px destructive left border so they're scannable from afar.
- **v3 — Single combined badge.** Replaces the existing payment badge
  with one pill that fuses status + urgency: "Paid · in 5d",
  "OVERDUE 3d", "Pending · 5d". Color reflects urgency, not raw status.
- **v4 — Pill + jump-to-call action.** Inline pill like v1 plus a small
  phone icon on critical/overdue rows that deep-links to
  `/admin/renewals?withinDays=7`. Overdue rows get a faint destructive
  row tint.

**Sample data is consistent across all four variants** (7 rows covering
critical / soon / later / short-overdue / long-overdue / pending /
no-subscription) so the comparison is apples-to-apples.

**Brand tokens used.** Olive primary (success), burnt orange (warning),
clay red (destructive), cream surfaces, info blue for verified. All
oklch() values mirror `packages/config/src/design.ts`.
