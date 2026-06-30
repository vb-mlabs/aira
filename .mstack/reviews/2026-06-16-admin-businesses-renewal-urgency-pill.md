# Review: Admin businesses — renewal urgency caption + overdue row stripe

**Date:** 2026-06-16
**Slug:** admin-businesses-renewal-urgency-pill
**Plan reviewed:** [2026-06-16-admin-businesses-renewal-urgency-pill.md](../plans/2026-06-16-admin-businesses-renewal-urgency-pill.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** vb-mlabs

---

## Summary

Plan is approved for implementation with three changes locked during
review, all tightening symmetry with the existing renewals queue:

1. The caption helper is **shared** — `expiryLabel` is extracted from
   `apps/web/src/features/admin/renewals/renewal-queue-table.tsx:227`
   into a sibling file and imported by both surfaces, so admins see the
   same dialect on both pages.
2. The caption uses **two colours**, not four. Destructive for
   overdue + critical (≤3d), muted-foreground default for everything
   else. The mockup's burnt-orange `warning` bucket is dropped (sub-AA
   contrast on the 11px caption against the cream background).
3. A paid sub whose `end_date` is already in the past **falls through
   to the overdue treatment** (caption + row border) regardless of
   payment_status, instead of rendering a confusing
   `renews in -3 days` line beside a green `paid` badge.

Net: same scope (3 files to touch), no new deps, no migrations, no
new tests required beyond what the existing op already covers.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** The plan proposed new wording
  (`renews in N days` / `OVERDUE N DAYS`) for the caption, but the
  renewals queue already has `expiryLabel` at
  `renewal-queue-table.tsx:227` that says `today` / `tomorrow` /
  `in N days` / `OVERDUE Nd` / `MM/DD/YYYY` past 7d. Admins move
  between `/admin/businesses` and `/admin/renewals` constantly during
  a chase — two dialects is operational friction.
  **Decision:** Mirror the renewals queue exactly. Extract
  `expiryLabel` from `renewal-queue-table.tsx` into
  `apps/web/src/features/admin/renewals/expiry-label.ts` (new), update
  the renewals-queue import, and import the same helper from the
  admin businesses page. Side benefit: far-out rows render as
  `MM/DD/YYYY` instead of "renews in 240 days", which reads better.

- **Concern:** The mockup's four-bucket colour escalation includes
  burnt orange (`text-warning`, oklch 0.62) for 4-14d remaining. At
  11px on the cream background (oklch 0.90), that's likely sub-4.5:1
  contrast — marginal for AA on small text. The renewals queue uses
  only two colours (default foreground, destructive overdue) and works
  fine.
  **Decision:** Simplify to two colours. Destructive for
  `days_remaining < 0` OR `days_remaining ≤ 3`; muted-foreground for
  everything else. Differentiate the `≤3d` case from `overdue` by
  font-weight (`font-semibold` vs `font-bold uppercase tracking-wide`),
  not colour. No `scripts/check-contrast.ts` exemption needed.

- **Concern:** The plan's edge-case #1 said a paid sub past its
  end_date should render as `renews in -3 days` in destructive colour.
  Operationally misleading — a green `paid` badge next to a negative-
  days caption is confusing. The renewal cron eventually flips the
  badge to `overdue`, but the data-quality window between expiry and
  cron-flip would show this state.
  **Decision:** If `days_remaining < 0`, treat as overdue regardless
  of `payment_status`. Caption becomes `OVERDUE Nd` and the row gets
  the destructive left-border + tint. The underlying `AdminBadge`
  still reads `paid` (we don't lie about the recorded payment status),
  but the urgency treatment surfaces the staleness.

### Suggestions (taken or deferred)

- **Suggestion (taken):** The `expiryLabel` helper is worth a small
  unit test now that two consumers depend on it. Added to Task 1's
  acceptance — a Vitest covering overdue, 0, 1, 3, 8, 30, 100 inputs
  to lock the bucket boundaries. Renewals queue picks up the safety
  net for free.
- **Suggestion (deferred):** Sort the admin businesses list by
  days_remaining ascending. Out of scope per the plan; revisit only
  if QA flags scroll-order friction.
- **Suggestion (deferred):** Relocate `AdminBusinessItemSchema` into
  `packages/validators/`. The mobile app doesn't consume the admin
  businesses list today; keep the schema inline in
  `businesses-admin.ts` until it does.

## Decisions locked

Beyond what was in the plan:

- `expiryLabel` is moved out of `renewal-queue-table.tsx` into a new
  sibling file `apps/web/src/features/admin/renewals/expiry-label.ts`.
  Renewals queue + admin businesses page both import from there.
- Caption colour palette is two-colour: destructive for
  overdue-or-≤3d, muted-foreground default. No `text-warning` bucket.
- `days_remaining < 0` triggers the full overdue treatment regardless
  of `payment_status`. The displayed `AdminBadge` status is untouched.
- A small Vitest covers `expiryLabel` for the boundary inputs.
- The plan's wording open question and the `today`/`tomorrow` wording
  question are both resolved (see Concern 1 — mirror the renewals
  queue's existing strings verbatim).

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic.

### Task 1: Extract expiryLabel into a shared helper

- **Files:**
  - `apps/web/src/features/admin/renewals/expiry-label.ts` (new)
  - `apps/web/src/features/admin/renewals/renewal-queue-table.tsx` (edit)
  - `apps/web/src/features/admin/renewals/expiry-label.test.ts` (new)
- **What:** Move the existing `expiryLabel(daysRemaining, endDateIso)`
  function (currently inline at `renewal-queue-table.tsx:227`) into a
  new sibling file. Keep the JSDoc + 2026-06-14 hydration-lesson
  reference. Update `renewal-queue-table.tsx` to import the helper
  from the new file. Add a small Vitest covering boundary inputs:
  `-1` → `OVERDUE 1d`, `0` → `today`, `1` → `tomorrow`, `3` →
  `in 3 days`, `7` → `in 7 days`, `8` → `MM/DD/YYYY` format. Use a
  fixed ISO date string in the test so the absolute-date branch is
  deterministic.
- **Acceptance:**
  - `apps/web/src/features/admin/renewals/expiry-label.ts` exports
    `expiryLabel(daysRemaining: number, endDateIso: string): string`
    with the same body as the current inline function.
  - `renewal-queue-table.tsx` no longer defines the helper inline and
    imports it from the new sibling.
  - Vitest covers the seven boundary inputs above.
  - `pnpm test --filter web -- expiry-label` passes.
  - `pnpm typecheck` + `pnpm lint` pass.
  - No behavior change in `/admin/renewals` (visual regression: the
    queue's Expiry column renders identically).
- **Pause if:** the extracted helper's signature doesn't match what
  the renewals queue currently passes (mismatch implies the queue's
  inline usage has drifted from what the JSDoc claims — surface and
  ask before rewriting either side).

### Task 2: Extend AdminBusinessItemSchema with end_date + days_remaining

- **Files:** `apps/web/src/server/operations/businesses-admin.ts` (edit)
- **What:** Extend `AdminBusinessItemSchema` (currently line 29-31)
  with two new fields:
  ```ts
  latest_subscription_end_date: z.string().nullable(),
  latest_subscription_days_remaining: z.number().int().nullable(),
  ```
  Update the inline `db.execute<{ ... }>` result type for the
  DISTINCT ON query (currently line 105-113) to include
  `end_date: string`. Keep `end_date` in the SELECT (already there).
  In the `items` map (currently line 134-137), populate the new
  fields from `subMap.get(b.id)`, computing `days_remaining` as
  `Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86_400_000)`
  — exact same formula used in
  `packages/services/src/business-subscriptions/queries.ts:130` and
  `packages/services/src/subscription-followups/queries.ts:151`.
- **Acceptance:**
  - `AdminBusinessItemSchema.parse()` accepts the new fields and
    rejects unknown extras.
  - `listAllBusinessesAdminOp` returns both fields for every row that
    has a latest subscription; both fields are `null` for rows with no
    subscription.
  - `pnpm typecheck` passes (no unsafe-access errors in the consumer
    `page.tsx` — Task 3 will use these fields).
  - The existing `?renewing=N` filter logic (currently lines 119-131)
    is untouched and still works (the renewing filter uses
    `payment_status` and `end_date` already in the map; nothing needs
    to change there).
  - No new test required — the existing op contract is exercised by
    the page render in Task 3.
- **Pause if:** the DISTINCT ON typing causes drizzle/zod parse to
  reject the existing data (would indicate a row with NULL end_date
  on a subscription, which violates the schema invariant — surface
  before defaulting).

### Task 3: Render caption + overdue row treatment on /admin/businesses

- **Files:** `apps/web/src/app/admin/businesses/page.tsx` (edit)
- **What:**
  1. Import the shared helper:
     `import { expiryLabel } from "@/features/admin/renewals/expiry-label"`.
  2. Inside the Subscription cell (currently line 145-154), wrap the
     existing `<AdminBadge>` in a `<div>` and append a caption
     `<span>` underneath when
     `b.latest_subscription_days_remaining !== null`. Caption text
     comes from `expiryLabel(daysRemaining, endDateIso)`.
  3. Compute `isOverdue` once per row as
     `b.latest_subscription_days_remaining !== null && b.latest_subscription_days_remaining < 0`
     (fall-through rule — independent of `payment_status`).
  4. Compute `isCritical` as
     `b.latest_subscription_days_remaining !== null && b.latest_subscription_days_remaining >= 0 && b.latest_subscription_days_remaining <= 3`.
  5. Caption className:
     - `isOverdue` →
       `"mt-0.5 block text-[11px] font-bold uppercase tracking-wide text-destructive"`
     - `isCritical` →
       `"mt-0.5 block text-[11px] font-semibold text-destructive"`
     - default →
       `"mt-0.5 block text-[11px] text-muted-foreground"`
  6. Row className adds when `isOverdue`:
     `"shadow-[inset_3px_0_0_var(--destructive)] bg-destructive/[0.04] hover:bg-destructive/[0.08]"`.
     Keep all existing className tokens (cursor-pointer, hover:bg-muted/20,
     opacity-60 for archived). The destructive hover overrides the muted
     hover when both apply.
  7. Whole-row `<Link>` after-pseudo-element pattern (lines 128-138)
     stays untouched — the new caption + border render through it
     without competing for the click target.
- **Acceptance:**
  - Rows with a paid+future sub render `<paid badge>` + caption
    (`today` / `tomorrow` / `in N days` / `MM/DD/YYYY`) in muted
    grey by default, or in destructive `font-semibold` when
    `days_remaining ≤ 3`.
  - Rows with `days_remaining < 0` render `<paid|pending|overdue
    badge>` + caption `OVERDUE Nd` in destructive bold uppercase, plus
    the 3px destructive left-border + ~4% destructive bg tint on the
    `<tr>`.
  - Rows with no subscription still render `—` in the Subscription
    cell with no caption and no border treatment.
  - Whole-row click navigation still works on every row (verify by
    clicking an overdue row and confirming it navigates to
    `/admin/businesses/[id]`).
  - No hydration warnings in the browser console for the Subscription
    column (days_remaining is precomputed server-side; expiryLabel
    only does string formatting + UTC date math).
  - Archived rows (opacity-60) still render correctly when also
    overdue — caption + border are visible through the opacity.
  - `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass.
  - Existing `?renewing=N` chips, archived toggle, CSV download all
    unchanged.
- **Pause if:** Tailwind's arbitrary `shadow-[inset_3px_...]` syntax
  doesn't apply to a `<tr>` due to a `border-collapse` interaction —
  if so, surface and propose the alternative (apply the box-shadow
  to the first `<td>` of the row instead).

## Open questions

None remaining for `/mlabs-code` to escalate. All open questions from
the plan are resolved in this review.
