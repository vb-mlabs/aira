# Plan: Admin-managed star rating for businesses (F11)

**Date:** 2026-06-09
**Slug:** 2026-06-09-business-rating
**Status:** implemented
**Author:** /mlabs-plan

---

## Problem

The directory has Verified as one curated quality signal but nothing
else — every listing reads the same to a customer scanning the page.
PRD F11 calls for an admin-managed star rating that complements
Verified: admins set a 0–5 number, customers see it on the listing
card and detail page as a compact `★ 4.5`. Listings without a rating
(null or 0) render exactly as today — no stub, no zero, no skeleton.

Two beneficiaries:

- **End-users** browsing categories get a second trust cue alongside
  Verified. Two cards both verified — one with `★ 4.7`, one with no
  stars — give the customer something to break the tie on.
- **Admins** get an editorial lever. They already curate Verified
  (boolean) and tier (Sponsored / Featured); rating slots in as a
  third axis on the same admin edit page they already use.

**Success:** an admin opens `/admin/businesses/[id]`, picks `4.5` from
a rating dropdown, saves. End-user visits `/listings/restaurants` →
that business's card shows `Name ✓ ★ 4.5`. Visits the detail page →
same compact `★ 4.5` next to the name. Admin clears the rating back to
empty → both surfaces drop the star treatment entirely.

## Scope

**In:**
- New `rating` column on `businesses` (`numeric(2,1)`, nullable, CHECK
  0–5)
- `BusinessSchema` + `BusinessUpdateInputSchema` widened
  (`rating: z.number().min(0).max(5).nullable()`)
- Service layer: `toBusiness` mapper threads the column; `updateBusiness`
  payload propagates `rating`
- Admin form: new "Rating" Section in `business-detail.tsx` admin
  component with a half-star-step `<select>` (0.0 → 5.0 in 0.5
  increments, plus "No rating" for null)
- BusinessCard: inline `★ 4.5` after the verified badge on the same
  row as the name (flex-wrap so narrow widths flow nicely)
- BusinessDetail: same compact treatment in the hero card header
- Hide the rating render entirely when `rating === null || rating === 0`

**Out (deferred):**
- **User-submitted reviews.** This is curated, admin-only.
- **Multi-dimensional ratings** (food/service/ambiance). Single scalar.
- **Rating history / audit trail.** Last-write-wins via the existing
  admin update path (audit_log already captures admin mutations).
- **5-star visual render.** Compact `★ 4.5` only — see the open
  question on this if the reviewer wants the larger treatment.
- **Mobile parity.** Same REST endpoint already returns `rating`;
  mobile renders when its listings screen lands.
- **Sponsored sort tie-break by rating.** S4 (sponsored placement)
  already has its own ordering rules — leaving rating out of the
  sort. Reopen in S4 if needed.
- **Search by rating.** Out of scope; F8 stays as name + description
  + address.

## Approach

Four layers, all incremental on what shipped today (`hours` +
`aira_review` followed exactly the same shape).

**1. Schema** — `packages/db/src/schema/businesses.ts`

Add the column inline with the other curation fields:

```ts
rating: numeric("rating", { precision: 2, scale: 1 }),
```

Plus a CHECK constraint at the table level so the DB rejects out-of-
range values regardless of caller validation:

```ts
(table) => [
  ...existing indexes,
  check("businesses_rating_range", sql`${table.rating} IS NULL OR (${table.rating} >= 0 AND ${table.rating} <= 5)`),
]
```

Run `pnpm db:generate` → migration `0014_*.sql`. Apply via `pnpm
db:migrate`. Migration is additive — safe on production data.

**2. Validator** — `packages/validators/src/businesses.ts`

In `BusinessSchema`:
```ts
rating: z.number().min(0).max(5).nullable(),
```

In `BusinessUpdateInputSchema`:
```ts
rating: z.number().min(0).max(5).nullable().optional(),
```

Note: Drizzle's `numeric` column returns `string` from the driver
(Postgres precision-safe). The service mapper must `Number()` it
when building the Zod-validated DTO. Pattern matches what `aira_review`
and others do (no transform needed for them, but `numeric` is unique
in needing coercion).

**3. Service** — `packages/services/src/businesses/{queries.ts,service.ts}`

`toBusiness()`: coerce `row.rating` (`string | null`) to `number |
null` before returning. The Zod schema would reject a string here.

```ts
rating: row.rating == null ? null : Number(row.rating),
```

`updateBusiness()`: thread `rating` through the same conditional
pattern as the other fields. Drizzle's update accepts `number | null`
on numeric columns and converts.

**4. Admin form** — `apps/web/src/features/admin/components/business-detail.tsx`

New `<RatingSection>` similar to `<EditorialSection>`:
- Half-star `<select>` with options `"" → "No rating"`, then `"0"`
  through `"5"` in 0.5 steps (11 numeric options)
- Local state `rating: string` (empty = no rating)
- On save: `rating: rating === "" ? null : Number(rating)`
- Reused `runUpdate()` helper that's already wired to the admin
  PATCH route

Mounted in the `<BusinessAdminDetail>` section list between Contact
and Social Links — feels right thematically (curation-adjacent).

**5. Card display** — `apps/web/src/features/listings/components/business-card.tsx`

Inline next to the verified badge:

```tsx
{business.verified && (<BadgeCheck … />)}
{business.rating !== null && business.rating > 0 && (
  <RatingPill rating={business.rating} />
)}
```

`<RatingPill>` is a small inline span with the lucide `Star` icon
(filled) + the rating number to 1 decimal. Same parent flex container
as name + verified — `flex-wrap` (added if not already there) so the
row breaks gracefully on narrow widths.

**6. Detail display** — `apps/web/src/features/listings/components/business-detail.tsx`

Same `<RatingPill>` inside the header `<div>` next to verified, same
hide-when-null-or-zero rule.

The pill component lives in `apps/web/src/features/listings/components/rating-pill.tsx`
so both surfaces use one source of truth.

**Alternatives considered:**

- **Integer rating ×10** (store 45 = 4.5). Avoids `numeric` typing
  noise but every UI render has to remember to divide. Rejected —
  caller pain not worth the savings.
- **`real` / float column.** Avoids the string coercion but introduces
  float-precision risk (4.5 → 4.499999…). Rejected for the same
  reason ratings shouldn't be float anywhere.
- **5-star visual render.** Better for product feel but adds custom
  fractional-fill component work. Out of scope per the question
  answer; reopen later if customer feedback wants it.
- **Free-enter number input** (4.3, 3.7…). Maximum flexibility but
  invites inconsistent precision across listings. Rejected per the
  question answer.

## Data model changes

- **New column** on `businesses`: `rating numeric(2,1) NULL` with
  CHECK `rating IS NULL OR (rating >= 0 AND rating <= 5)`.
- Migration `0014_*.sql` generated via `pnpm db:generate`.
- No new tables, no new indexes (rating isn't a sort key in MVP).

## Files to touch

**New:**
- `apps/web/src/features/listings/components/rating-pill.tsx` —
  `<RatingPill rating={n} />` shared by card + detail.

**Edit:**
- `packages/db/src/schema/businesses.ts` — add column + CHECK
- `packages/db/drizzle/migrations/0014_*.sql` — generated, hand-verify
- `packages/validators/src/businesses.ts` — extend
  `BusinessSchema` + `BusinessUpdateInputSchema`
- `packages/services/src/businesses/queries.ts` — coerce `rating` in
  `toBusiness()`
- `packages/services/src/businesses/service.ts` — thread `rating` in
  `updateBusiness()`
- `apps/web/src/features/admin/components/business-detail.tsx` — new
  `<RatingSection>`
- `apps/web/src/features/listings/components/business-card.tsx` —
  render `<RatingPill>` next to verified
- `apps/web/src/features/listings/components/business-detail.tsx` —
  same in the hero header

## Edge cases

- **rating === 0**: hide the pill. PRD explicit. Treats 0 as "not
  rated" semantically — admin can either leave it null or explicitly
  set 0 and get the same display behavior.
- **rating === 5.0**: render as `★ 5.0`, not `★ 5`. Always 1-decimal
  in display for visual consistency.
- **Drizzle numeric returns string**: the `toBusiness()` mapper has
  to coerce; Zod's `z.number()` would reject the raw row otherwise.
  Spotted from the schema reading (column is `numeric`, driver gives
  string).
- **Concurrent admin save with rating cleared elsewhere**: last
  write wins. Audit log captures both mutations. Out of scope to
  add optimistic-concurrency UI here.
- **Card layout overflow on narrow widths**: name + verified +
  rating in one row. Add `flex-wrap` to the parent if it's not
  already there. Worst case: name on line 1, badge + pill on
  line 2. Still readable.
- **Negative rating somehow lands in DB** (pre-CHECK row, or
  manual SQL): the Zod `min(0).max(5)` at the validator would
  reject; the API call returns a 500 with the row's id. Recovery:
  admin clears it via the form (which sends null) or manual SQL.
  Documented in the migration commit message.
- **Existing rows after migration**: all `rating = NULL` initially.
  Card + detail render exactly as today until admin populates.

## Acceptance criteria

- [ ] Migration `0014_*.sql` is purely `ALTER TABLE … ADD COLUMN
  rating numeric(2,1) NULL` plus the CHECK constraint. No data
  rewrites.
- [ ] `BusinessSchema.rating` is `number | null`; the GET endpoint
  returns the field for every existing business as `null`.
- [ ] Admin can pick "4.5" from the rating dropdown on
  `/admin/businesses/[id]`, click Save, and see "Saved." status.
- [ ] After save, refreshing the admin page shows the selected value
  pre-selected in the dropdown.
- [ ] Admin can pick "No rating" and save → DB row's `rating` is
  NULL → public surfaces drop the rating pill.
- [ ] BusinessCard renders `★ 4.5` immediately after the verified
  badge for a business whose rating is 4.5.
- [ ] BusinessCard does NOT render any rating element when
  `rating IS NULL` or `rating = 0`.
- [ ] Business detail page hero shows the same `★ 4.5` next to the
  name + verified badge.
- [ ] Hover/focus state on the card does not change the rating pill
  (it's not a link).
- [ ] At narrow widths (≤480px viewport), name + verified + rating
  either fit on one row or wrap cleanly without overlapping the
  right-column tier pill.
- [ ] `pnpm typecheck` + `pnpm lint` clean.
- [ ] Regression: `/home` featured strip, `/admin` dashboard, and
  `/admin/businesses` list continue to render with no errors when
  `rating` is null on every row.

## Open questions

- **Display 1 decimal always vs strip trailing zero** (★ 4.0 vs ★ 4)?
  Default: always 1 decimal for grid alignment. Reviewer can flip.
- **Use a select or radio chips for the admin input?** Select is the
  most compact for 11 options. Reviewer can elevate to chips if the
  visual weight matters.
- **Star icon: filled or outline?** Default: filled (`fill="currentColor"`
  on lucide `Star`). Empty/outline reads as a placeholder, which we
  don't want.
- **Render position in detail header**: same line as name + verified,
  or below the category subtitle? Default: same line.
- **5-star visual render**: deferred from scope per the answered
  question, but flagging here in case the reviewer wants to reopen.
