# Review: Admin-managed star rating for businesses (F11)

**Date:** 2026-06-09
**Slug:** 2026-06-09-business-rating
**Plan reviewed:** [2026-06-09-business-rating.md](../plans/2026-06-09-business-rating.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** /mlabs-review

---

## Summary

Plan is ready to implement after one material refinement (use Drizzle's
`numeric({ mode: "number" })` to skip the `Number()` coercion the plan
proposed in `toBusiness()`) and one small naming alignment (CHECK
constraint `_check` suffix to match the existing waitlist convention).
The plan's approach — additive schema + validator widening + shared
RatingPill component + new admin form section — mirrors the `hours` +
`aira_review` shape that landed two commits ago, so the implementation
trail is well-paved.

## Findings

### Blockers (must fix before /mlabs-code)

_none_

### Concerns (raised, decided, recorded)

- **Concern:** Plan proposed manual `Number()` coercion in `toBusiness()`
  because Drizzle's default `numeric` returns string from the driver.
  Drizzle actually supports `{ mode: "number" }` which auto-coerces.
  **Decision:** Declare the column as
  `numeric("rating", { precision: 2, scale: 1, mode: "number" })`. The
  field types as `number | null` at the row level — no mapper change
  beyond spreading the new field into the returned object.

- **Concern:** Plan's CHECK constraint name was `businesses_rating_range`.
  Existing convention in `packages/db/src/schema/waitlist.ts` uses
  `<table>_<col>_check`.
  **Decision:** Rename to `businesses_rating_check`. Cosmetic but worth
  consistency.

- **Concern:** API validator strictness — should `z.number()` enforce
  multiples of 0.5 to mirror the admin UI's step, or stay permissive?
  **Decision:** Stay permissive: `z.number().min(0).max(5).nullable()`.
  The admin `<select>` enforces the step on the UI side; the API
  contract trusts the boundary (matches existing pattern for `slug`,
  `address`, etc.). Future mobile-admin or direct API edits get
  flexibility.

### Suggestions (taken or deferred)

- **Taken:** All five of the plan's open questions resolved to plan
  defaults — always 1-decimal display (★ 4.0, not ★ 4), `<select>` not
  radio chips, filled lucide `Star` icon (not outline), same-line as
  name + verified in detail header, 5-star visual render stays out of
  scope for this pass.
- **Taken:** RatingPill lives at `apps/web/src/features/listings/components/rating-pill.tsx`
  — sibling of `social-icons.tsx`, single source of truth shared by
  BusinessCard + BusinessDetail.
- **Taken:** Admin form Section sits between Contact and Social Links
  (curation-adjacent positioning).
- **Deferred (out of scope):** Rating-based sort for the sponsored
  ordering rules — leave to S4 if it ever becomes relevant.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- **Drizzle `numeric` mode locked to `"number"`** — no `Number()` in
  `toBusiness()`.
- **CHECK constraint name locked to `businesses_rating_check`** to
  match the waitlist convention.
- **API validator stays permissive** — UI enforces step, API does
  not.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each is
atomic.

### Task 1: Add rating column + CHECK constraint to schema

- **Files:** `packages/db/src/schema/businesses.ts` (edit) ·
  `packages/db/drizzle/migrations/0014_*.sql` (generated)
- **What:**
  - Import `numeric` and `check` from `drizzle-orm/pg-core`, `sql`
    from `drizzle-orm`
  - Add column:
    `rating: numeric("rating", { precision: 2, scale: 1, mode: "number" })`
  - Add a third entry to the table-level array returned by the
    `(table) => [...]` callback:
    `check("businesses_rating_check", sql\`${table.rating} IS NULL OR (${table.rating} >= 0 AND ${table.rating} <= 5)\`)`
  - Run `pnpm db:generate`; verify the migration is a single
    `ALTER TABLE … ADD COLUMN rating numeric(2, 1)` + the CHECK
    constraint. No data rewrites, no destructive ops.
  - Run `pnpm db:migrate` to apply.
- **Acceptance:** Migration `0014_*.sql` generated and applied
  cleanly; `\d businesses` in psql shows the column + constraint.
  `pnpm typecheck` clean.
- **Pause if:** the generator produces anything beyond the additive
  ALTER + CHECK (e.g. table rebuild, data backfill, drop constraints
  on other columns).

### Task 2: Widen validator schemas

- **Files:** `packages/validators/src/businesses.ts` (edit)
- **What:**
  - Add `rating: z.number().min(0).max(5).nullable()` to
    `BusinessSchema`
  - Add `rating: z.number().min(0).max(5).nullable().optional()` to
    `BusinessUpdateInputSchema`
- **Acceptance:** `pnpm typecheck` clean. `Business` and
  `BusinessUpdateInput` types include `rating`.

### Task 3: Thread rating through service layer

- **Files:** `packages/services/src/businesses/queries.ts` (edit) ·
  `packages/services/src/businesses/service.ts` (edit)
- **What:**
  - `toBusiness()`: add `rating: row.rating ?? null` (no coercion
    needed since the column uses `mode: "number"`).
  - `updateBusiness()`: add the standard conditional thread —
    `if (data.rating !== undefined) updatePayload.rating = data.rating;`
- **Acceptance:** `pnpm typecheck` clean. GET endpoint returns
  `rating: null` for every existing row (verified via curl with
  session cookie).

### Task 4: Add RatingPill component

- **Files:** `apps/web/src/features/listings/components/rating-pill.tsx`
  (new)
- **What:**
  - Presentational `<RatingPill rating={number} />` component
  - Renders the lucide `Star` icon with `fill="currentColor"` (filled)
    + the number to 1 decimal (`rating.toFixed(1)`)
  - Visually small + flex-shrink-0 so it sits inline next to the
    verified badge without forcing the row to grow
  - Returns `null` if `rating <= 0` so callers can render it
    unconditionally — but callers should still guard with
    `rating !== null && rating > 0` for clarity
- **Acceptance:** Component renders for `rating={4.5}` → `★ 4.5`.
  Renders for `rating={5}` → `★ 5.0` (always 1 decimal).
  Renders nothing for `rating={0}`.

### Task 5: Render RatingPill on BusinessCard + BusinessDetail

- **Files:** `apps/web/src/features/listings/components/business-card.tsx`
  (edit) · `apps/web/src/features/listings/components/business-detail.tsx`
  (edit)
- **What:**
  - In BusinessCard, after the `{business.verified && <BadgeCheck …>}`
    line, add:
    ```tsx
    {business.rating !== null && business.rating > 0 && (
      <RatingPill rating={business.rating} />
    )}
    ```
  - In BusinessDetail's hero header (same flex row as name + verified),
    add the same block.
  - Verify the parent flex container has `flex-wrap` (or add it) so
    narrow widths flow gracefully — name on row 1, badge + pill on
    row 2 if necessary.
- **Acceptance:**
  - Card with rating 4.5: `★ 4.5` appears immediately after the
    verified badge
  - Card with rating null: no rating element
  - Card with rating 0: no rating element
  - Detail page mirrors the card behavior
  - At narrow widths (≤480px), name + verified + rating either fit
    in one row or wrap cleanly without overlapping the right column
    (tier pill / phone button)

### Task 6: Add RatingSection to admin form

- **Files:** `apps/web/src/features/admin/components/business-detail.tsx`
  (edit)
- **What:**
  - Mount `<RatingSection business={business} />` between
    `<ContactSection>` and `<SocialLinksSection>` in
    `<BusinessAdminDetail>`
  - `<RatingSection>` mirrors the existing `<EditorialSection>` shape:
    - Local state `rating: string` (empty string = "No rating")
    - Initial: `business.rating === null ? "" : business.rating.toString()`
    - `<select>` with options: `""` ("No rating"), then `"0"`, `"0.5"`,
      `"1"`, `"1.5"`, …, `"5"` (11 numeric values)
    - On save: `rating: rating === "" ? null : Number(rating)`
    - Reuse `runUpdate()` and `<StatusLine />`
- **Acceptance:**
  - `/admin/businesses/[id]` shows a Rating section between Contact
    and Social Links
  - Selecting "4.5" + Save → reload shows "4.5" pre-selected and the
    public surfaces display `★ 4.5`
  - Selecting "No rating" + Save → reload shows "No rating" pre-
    selected and the public surfaces drop the rating pill
  - `pnpm typecheck` + `pnpm lint` clean

### Task 7: Smoke test + run report

- **Files:** `.mstack/code/2026-06-09-business-rating/` (new)
- **What:**
  - API-level smoke via curl with session cookie:
    `PATCH /api/v1/admin/businesses/<id>` body `{ "id": "<id>", "rating": 4.5 }`
    → 200; subsequent `GET /api/v1/businesses?category=…` returns the
    business with `rating: 4.5`.
  - Then `PATCH` with `rating: null` → 200; GET returns `rating: null`.
  - Then `PATCH` with `rating: 7` → 400 (range validator).
  - Optional Playwright screenshot of one card + one detail page
    before/after a rating set.
- **Acceptance:** All API flows pass; report captures the curl
  output and a brief follow-up list.

## Open questions

_none_ — all three review concerns settled; five plan open questions
resolved inline; one pre-existing item (admin no-filter bug on
`/admin/businesses`) is still flagged from the prior review and is
unrelated to this change.
