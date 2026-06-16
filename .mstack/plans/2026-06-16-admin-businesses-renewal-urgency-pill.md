# Plan: Admin businesses — renewal urgency caption + overdue row stripe

**Date:** 2026-06-16
**Slug:** admin-businesses-renewal-urgency-pill
**Status:** reviewed
**Author:** vb-mlabs
**Mockup:** `.mstack/mockups/admin-businesses-renewal-pill/` (winner: v2,
see `FEEDBACK.md`)
**Reviewed:** [.mstack/reviews/2026-06-16-admin-businesses-renewal-urgency-pill.md](../reviews/2026-06-16-admin-businesses-renewal-urgency-pill.md)

---

## Problem

The admin businesses table at `/admin/businesses` shows the latest
payment status (`paid` / `pending` / `overdue`) as an `AdminBadge`, but
nothing about *when* the subscription expires or how far overdue it is.
To find that, the admin has to either:

1. Click into each business detail page, or
2. Switch to `/admin/renewals`, the dedicated follow-up queue (which
   exists specifically for phone-banking, with the FollowupModal +
   contact icons).

The result: the directory is "blind" to renewal urgency. An admin
scrolling `/admin/businesses` can't see that *Tandoori Express* is 3
days overdue or that *Saffron Spice Restaurant* renews in 2 days
without leaving the page or opening each row.

**Who benefits:** the AIRA admin / operator. No end-user behaviour
changes; the public business directory is unaffected.

**Success:** the admin opens `/admin/businesses`, sees a small caption
under each row's payment-status badge — `renews in 25 days`,
`renews in 2 days`, `OVERDUE 3 DAYS` — colour-escalated to indicate
urgency, and can spot overdue rows from across the page thanks to a
3px destructive left-border + faint background tint on those rows. The
existing `paid` / `pending` / `overdue` badge stays untouched so
downstream consumers (CSV export, filters, audit log, the renewals
queue) keep their vocabulary.

**Non-goal:** absorbing the `/admin/renewals` workflow. The phone-bank
follow-up queue (FollowupModal, outcome logging, contact icons) stays
on its own page. This plan is read-only urgency visibility on the
directory.

---

## Scope

**In:**

- Extend `AdminBusinessItemSchema` in
  `apps/web/src/server/operations/businesses-admin.ts` with two new
  fields:
  - `latest_subscription_end_date: string | null` (ISO 8601)
  - `latest_subscription_days_remaining: number | null` (server-computed
    via `Math.ceil((end_date - now) / DAY_MS)`, mirroring the existing
    pattern in `packages/services/src/business-subscriptions/queries.ts:130`
    and `packages/services/src/subscription-followups/queries.ts:151`)
- Update the `SELECT DISTINCT ON` query in `listAllBusinessesAdminOp`
  to return `end_date` alongside `payment_status`, populate the new
  schema fields from the same row.
- Render a stacked caption under the existing `AdminBadge` in the
  Subscription cell of `apps/web/src/app/admin/businesses/page.tsx`:
  - `> 14 days remaining` → `text-muted-foreground`,
    `renews in N days`
  - `4-14 days remaining` → `text-warning`, `renews in N days`
  - `≤ 3 days remaining` → `text-destructive font-semibold`,
    `renews in N days`
  - `overdue` (payment_status = `overdue`) → `text-destructive`,
    `font-bold uppercase tracking-wide`, text `OVERDUE N DAYS`
  - Caption uses `text-[11px] leading-tight mt-0.5` (matches the v2
    mockup measurement).
- Render the caption **whenever a subscription exists** (regardless of
  how far out — locked decision; no threshold). Rows with no
  subscription render `—` in the Subscription cell, as today, with no
  caption.
- Add a 3px destructive left-border + ~4% destructive background tint
  to rows whose `latest_payment_status === "overdue"`. Implementation:
  `box-shadow: inset 3px 0 0 var(--destructive)` + `bg-destructive/[0.04]`
  on the `<tr>`. Bordered rows still inherit the existing row-hover
  treatment.
- The "due in ≤3 days" critical case gets only the destructive caption,
  **not** the row-border treatment. The border specifically signals
  "this missed its date." (Locked decision.)
- Update the existing whole-row `<Link>` after:* pseudo-element pattern
  (page.tsx:128-138) so the new caption stays clickable as part of the
  row navigation. The link continues to navigate to
  `/admin/businesses/[id]`.

**Out (deferred):**

- Merging `/admin/businesses` with `/admin/renewals`. Explicitly out
  per the prior-turn analysis: different verbs (browse vs phone-bank),
  different click semantics (navigate vs open FollowupModal), different
  column needs. The two pages stay separate.
- Adding a "jump to call" deep-link from the directory row into the
  follow-up modal (variant v4 from the mockup). Considered and
  rejected: phone-icon-that-navigates is a misleading affordance, and
  deep-linking to a specific queue row requires extra plumbing.
- Replacing the existing `AdminBadge` with a combined status+urgency
  pill (variant v3). Considered and rejected: would change the visual
  contract of `AdminBadge` for one table and risks downstream coupling
  (CSV, audit log).
- Sort the admin businesses list by days_remaining ascending. Out —
  the existing `RenewingFilter` (`?renewing=N`) already lets the admin
  narrow + sort by recency. Re-sorting the unfiltered table changes
  the default scroll order, which is its own decision.
- Mobile-specific responsive collapse of the caption. Per the existing
  admin convention ("admin console is desktop-first throughout"), the
  caption stays visible at 375px and may wrap; it does not break the
  layout.
- Storybook entry for the new caption variants. The mockup HTML at
  `.mstack/mockups/admin-businesses-renewal-pill/v2/index.html` is the
  visual reference.
- Tests for the urgency-bucket boundary cases beyond what already
  exists for `listAllBusinessesAdminOp` (an integration test seeded
  with a `paid` sub at `end_date = now() + 2d` is enough; not adding
  exhaustive bucket coverage).

---

## Approach

### Architecture: extend the existing list op, render in RSC

The admin businesses list is already an RSC reading
`listAllBusinessesAdminOp` via `apiServerFetch`. The op already
DISTINCT-ONs the latest subscription per business to populate
`latest_payment_status`. Same query — same row — same join — just
return two more columns (`end_date` already exists in the source
SELECT, we just need to keep it and add a computed `days_remaining`).

Days-remaining is computed **server-side** in the op handler (locked
decision). This mirrors:

- `packages/services/src/business-subscriptions/queries.ts:130` —
  `Math.ceil((r.end_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))`
- `packages/services/src/subscription-followups/queries.ts:151` — same
  formula, used by the renewals queue.

Why server-side over client-side:

1. **Hydration safety.** The renewals queue's `expiryLabel` uses
   `suppressHydrationWarning` to paper over `Date.now()` divergence
   between RSC and client tick — see the comment in
   `apps/web/src/features/admin/renewals/renewal-queue-table.tsx:108`.
   Pre-computing on the server avoids the problem entirely. The
   2026-06-14 hydration lesson noted in that file is exactly this.
2. **Symmetry.** The whole renewals + business-subscriptions surface
   uses precomputed `days_remaining`. Adding a third pattern (raw
   `end_date` + client compute) for one table is a regression.
3. **Cheap.** No extra query — `end_date` is already in the DISTINCT
   ON SELECT.

The caption text + colour bucket is derived in the row component from
`latest_payment_status` + `latest_subscription_days_remaining`. Bucket
rules live inline in `page.tsx` (one helper near the table render).

The overdue row treatment is a CSS-only conditional class on the
`<tr>`. The existing whole-row `<Link>` pseudo-element pattern still
works because the border is rendered via `box-shadow` (no layout shift)
and the row tint is `background-color` (z-index neutral).

**Alternatives considered:**

- **Add `end_date` only; compute `days_remaining` client-side.**
  Rejected: hydration risk (see above), inconsistency with the rest of
  the renewals surface.
- **Filter the table by default to "renewing in 30d" so the caption
  matters more.** Rejected: changes default scroll order on a screen
  admins already use for browsing; out of scope per the v2 mockup
  decision.
- **Render the caption only for subscriptions ≤ 90 days out
  (suppressed-when-far-away rule).** Considered, rejected during the
  Phase-2 question batch — "always show when a subscription exists"
  was preferred for rule simplicity ("you never wonder why the caption
  is missing"). Far-out captions in muted gray simply recede.
- **Combined status+urgency badge replacing AdminBadge (mockup v3).**
  Rejected during mockup feedback: changes the visual contract of
  `AdminBadge`, breaks downstream consumers, no compensating benefit.
- **Phone-icon deep-link to /admin/renewals (mockup v4).** Rejected
  during mockup feedback: misleading affordance + extra plumbing for
  marginal value.

---

## Data model changes

**None.** No migrations, no new tables, no new columns.

The existing `business_subscription` row already carries `end_date` +
`payment_status`. The `DISTINCT ON (business_id) ... ORDER BY
business_id, end_date DESC` query in `listAllBusinessesAdminOp`
already reads them; we just stop discarding `end_date` and add a
derived `days_remaining`.

The schema delta lives in TypeScript only:
`AdminBusinessItemSchema` (lines 29-31 of `businesses-admin.ts`) gains
two fields. Both have only two consumers in the entire repo:

- `apps/web/src/server/operations/businesses-admin.ts` (the op
  handler)
- `apps/web/src/app/admin/businesses/page.tsx` (the table)

Verified via `grep -rn "AdminBusinessItemSchema|latest_payment_status"
--include="*.ts" --include="*.tsx"`.

---

## Files to touch

**New:**

- None.

**Edit:**

- `apps/web/src/server/operations/businesses-admin.ts`
  - Extend `AdminBusinessItemSchema` with
    `latest_subscription_end_date: z.string().nullable()` and
    `latest_subscription_days_remaining: z.number().int().nullable()`.
  - Update the inline `execute<{ ... }>` typing for the DISTINCT ON
    query to include `end_date` (already in the SELECT — just keep it).
  - In the `items` map, populate the new fields from `subMap.get(b.id)`,
    computing `days_remaining` as
    `Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86_400_000)`.
- `apps/web/src/app/admin/businesses/page.tsx`
  - Add a `urgencyCaption(item)` helper near the top of the file (or
    inline in the JSX) that returns `{ text, className } | null` based
    on `latest_payment_status` + `latest_subscription_days_remaining`.
  - Wrap the existing `<AdminBadge>` in a small `<div>` inside the
    Subscription cell, append the caption `<span>` underneath.
  - Add `latest_payment_status === "overdue"` conditional classes to
    the `<tr>`:
    `"shadow-[inset_3px_0_0_var(--destructive)] bg-destructive/[0.04] hover:bg-destructive/[0.08]"`
    (Tailwind arbitrary value syntax for the inset box-shadow).

That's it. No service-layer change, no validator change, no test fixture
change.

---

## Edge cases

- **Subscription exists but `end_date` is in the past AND
  `payment_status === "paid"`.** Should the caption say `renews in -3
  days` (red, weird) or `OVERDUE 3 DAYS` (suggests payment is missing,
  which it isn't)? Decision: the caption keys off `payment_status`,
  not `days_remaining` sign. A paid sub past its end_date renders as
  `renews in -3 days` in destructive colour — semantically truthful
  (still "paid", but stale). This is a data-quality state that
  shouldn't exist in practice (the renewal cron flips it to overdue);
  the caption surfaces it without lying about the payment status.
- **`days_remaining = 0` (renews today).** Caption: `renews in 0 days`
  in destructive colour. The renewals queue uses `"today"` here via
  `expiryLabel`; matching that wording is nice-to-have but not load-
  bearing. Decision: keep `renews in N days` for code simplicity; revisit
  if it reads badly in QA.
- **No `latest_subscription_end_date` but `latest_payment_status` is
  set.** Shouldn't happen (the DISTINCT ON returns both or neither), but
  the schema makes both nullable independently. Guard:
  `if (days === null) return null` in the caption helper; render the
  existing badge alone.
- **Archived rows** (`deleted_at !== null`) inherit the existing 60%
  opacity treatment. The caption + border render through that opacity,
  which is correct — archived overdue rows still warrant visibility,
  just dimmed.
- **Whole-row link.** The `after:absolute after:inset-0` pseudo-element
  on the Name cell's `<Link>` makes the whole row clickable. Verified:
  the box-shadow border and background tint do not interfere — the
  pseudo-element is positioned absolutely and stays the topmost layer
  for click targeting.
- **Sub on a row with `payment_status === "pending"`.** Pending is the
  "we haven't recorded payment yet" state; days_remaining is still
  meaningful (the admin needs to chase the payment before the date
  passes). Caption renders with the normal bucket colours
  (muted/warning/destructive). Pending rows do NOT get the row-border
  treatment — that's reserved for `overdue` (locked decision).

---

## Acceptance criteria

- [ ] `AdminBusinessItemSchema` has two new fields,
      `latest_subscription_end_date` and
      `latest_subscription_days_remaining`, both nullable.
- [ ] `listAllBusinessesAdminOp` returns both fields, populated from
      the latest subscription's `end_date` (DISTINCT ON-selected row),
      with `days_remaining` computed via the same formula used by the
      renewals queue.
- [ ] `/admin/businesses` renders a caption under the existing payment
      badge for every row with a subscription. No caption for rows
      with no subscription (the `—` rendering stays as-is).
- [ ] Caption colour follows the four-bucket rule: muted (>14d),
      warning (4-14d), destructive semibold (≤3d), destructive bold
      uppercase (`OVERDUE N DAYS`) when `payment_status === "overdue"`.
- [ ] Rows with `latest_payment_status === "overdue"` get the 3px
      destructive left-border (inset box-shadow) + ~4% destructive
      background tint. Hover state stays compatible.
- [ ] Rows with `latest_payment_status === "paid"` but
      `days_remaining ≤ 3` do NOT get the row-border treatment — only
      the destructive caption.
- [ ] No hydration warnings in the browser console for the Subscription
      cell (verified by precomputing on the server).
- [ ] Existing whole-row click navigation to
      `/admin/businesses/[id]` still works on every row, including
      overdue rows with the new border treatment.
- [ ] Existing `?renewing=N` filter chips, archived toggle, and CSV
      download continue to work unchanged.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass.

---

## Open questions

For `/mlabs-review` to resolve before implementation.

- **`text-warning` vs custom hex.** The design system's `--warning`
  token is burnt orange (`oklch(0.62 0.13 55)`). On the cream
  background, that reads acceptably for the 4-14d caption, but the
  mockup used `oklch(0.42 0.13 55)` (darker) for contrast. Should the
  caption use the token (consistent with the design system) or a darker
  derived shade (consistent with the mockup)? Recommended: use the
  token, accept that the rendered colour will be slightly brighter
  than the mockup, and revisit only if QA flags it.
- **Caption wording when `days_remaining === 0`.** "renews in 0 days"
  is technically right but reads awkwardly. The renewals queue uses
  `"today"` / `"tomorrow"` for the 0/1 buckets. Worth mirroring, or
  is the consistency cost too high? Recommended: mirror the renewals
  queue (`"today"`, `"tomorrow"`, then `"in N days"`) — it's 4 extra
  lines of helper code and keeps the two surfaces talking the same
  way to the admin.
- **Should the new fields surface through any cross-package validator?**
  Right now `AdminBusinessItemSchema` is private to
  `businesses-admin.ts`. If the mobile app eventually needs the admin
  businesses list, do we want the schema in
  `packages/validators/src/businesses-admin.ts` from day one?
  Recommended: keep it inline for now — YAGNI, and the schema is
  trivially relocatable later if mobile ever consumes it.
