# Review: Business verification workflow — notes + audit trail

**Date:** 2026-07-06
**Slug:** 2026-07-06-business-verification-notes
**Plan reviewed:** [2026-07-06-business-verification-notes.md](../plans/2026-07-06-business-verification-notes.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** claude

---

## Summary

Plan is implementable. Investigation confirmed: `AiraReviewEditModal`
already batches rating + aira_review + verified via a single save; the
admin list already has a Verified column (with a BadgeCheck when true,
blank when false); `contact_person_changed` provides the exact read-old
→ diff → audit-before-mutation pattern to mirror. All five plan open
questions are locked below with defaults; reviewer picked the
simplest-viable option in each. UI-Significant flag is **no** (only
two web UI files touched, both edits to existing components, no new
routes), so mockup gate is skipped.

## Findings

### Blockers (must fix before /mstack-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan claims "audit BEFORE the mutation so a failed
  audit blocks the write" for the new
  `business.verification_changed` kind. The existing
  `contact_person_changed` precedent actually emits the audit
  *outside* the `db.transaction(...)` block (service.ts:100-112)
  — audit fires first, mutation second, but they aren't in the
  same tx. A mutation failure after audit success leaves an audit
  row for a change that didn't land.
  **Decision:** Mirror the existing pattern verbatim (not-in-tx
  audit → mutation). This is a documented convention; fixing the
  audit-tx atomicity gap is out-of-scope for this plan. Log the
  inconsistency as a follow-up.

- **Concern:** Plan says extend `BusinessAdminSchema` with
  `verification_notes` — good. But the query-side projection
  (`toBusinessAdmin` in `queries.ts:611`) also needs to append the
  field so admin surfaces actually receive it. Plan lists the
  file but doesn't spell this out.
  **Decision:** Task 3 explicitly edits `toBusinessAdmin` to add
  `verification_notes: row.verification_notes ?? null`. Skipping
  this is the classic "field in schema, silently null forever"
  bug.

- **Concern:** Plan open Q #1 (notes cap 1000 chars) — reviewer
  needs to lock.
  **Decision:** **1000 chars** as proposed. `contact_person` is
  120 because it's a name; verification notes might include
  timestamps, licence numbers, call summaries. 1000 is enough
  headroom without being abusable. Raise later if a real admin
  hits the ceiling.

- **Concern:** Plan open Q #2 (list column tooltip: `title`
  vs shadcn Tooltip).
  **Decision:** **Native `title` attribute** for MVP. Zero JS,
  works on hover + long-press, existing pattern in the same list
  page (e.g. archive controls use `title`). Swap to Tooltip only
  if a QA pass says the design bar demands richer bubbles.

- **Concern:** Plan open Q #3 (notes textarea visibility in
  modal — always-shown vs conditional).
  **Decision:** **Always shown.** Simpler mental model — the
  textarea is present regardless of the verified checkbox state.
  Admins may want to pre-write notes before flipping the toggle
  or preserve notes after un-verifying. The conditional-visibility
  option adds a "why is this field appearing/disappearing?"
  cognitive load for no real benefit.

- **Concern:** Plan open Q #4 (rename `AiraReviewEditModal` to
  something broader like "Editorial + Verification").
  **Decision:** **Keep the current name.** Verification is already
  editorial curation ("did we accept this business as authentic?");
  the modal's existing scope includes rating + review + verified.
  Notes fold in naturally. Renaming is polish, deferred.

- **Concern:** Plan open Q #5 (detail-page notes affordance:
  always-visible vs click-to-reveal).
  **Decision:** **Always visible when present.** Notes are
  admin-only PII (they're at `/admin/*`, not a public route),
  short (≤1000 chars), and the primary consumption use case is
  admin scanning the detail page. Hiding them would add friction
  for zero privacy gain.

- **Concern:** Plan mentions "Verification changes emit exactly one
  `business.verification_changed` audit row" — but currently
  `verified` changes are NOT audited at all (the modal fires
  `runUpdate` which reaches `updateBusiness`; there's no
  `verified_changed` branch there). So this is both a new feature
  AND a bug fix: verification decisions were previously invisible
  in the audit trail.
  **Decision:** Task 3 includes the diff branch even when *only*
  `verified` changes (notes may stay null). Acceptance criterion
  covers this explicitly. The lack of prior audit is documented
  as a "pre-existing gap that this plan closes" rather than a
  separate follow-up.

- **Concern:** `pnpm db:generate` may produce more than "just ADD
  COLUMN" — Drizzle sometimes updates the snapshot metadata
  files alongside. Plan's acceptance criterion "exactly one new
  migration file containing only the ADD COLUMN statement" is
  too strict.
  **Decision:** Relax acceptance to: "one new numbered migration
  file whose SQL body is just the ADD COLUMN statement, plus the
  snapshot metadata Drizzle auto-updates." Snapshot files always
  ride the same commit; the criterion isn't about count of files
  but shape of the SQL.

### Suggestions (taken or deferred)

- **Taken:** Task 3 also updates the `businesses` DB schema
  file's header comment (`packages/db/src/schema/businesses.ts:1-45`)
  to document `verification_notes` next to `verified`. Small
  documentation quality-of-life; costs nothing at the migration
  hook because we're already touching the file.
- **Taken:** New audit kind emits `client: auditClient(ctx)` per
  the `contact_person_changed` precedent so mobile vs web is
  captured. The verification workflow is admin-only (web today),
  but the audit convention stays consistent.
- **Deferred:** Public-facing verification metadata ("Verified 3
  months ago"). Out-of-scope per the plan; captured to TODOs.
- **Deferred:** `verified_by_user_id` denormalised FK. Actor is
  reconstructable from `audit_log`; only add the column when a
  UI needs to sort by it. Captured to TODOs.
- **Deferred:** Audit-in-transaction atomicity fix (Concern #1).
  Captured to TODOs — same pattern gap affects `contact_person_changed`,
  worth a small standalone plan.

## Decisions locked

Net new decisions beyond the plan:

- Task 3 explicitly edits both `toBusinessAdmin` (query projection)
  and the `updateBusiness` service (diff + audit + passthrough).
- Notes textarea in the modal is **always visible** (not
  conditional on verified state).
- Notes on the detail page are **always visible** when non-null
  (rendered as muted-foreground block under the badge).
- List column tooltip uses **native `title` attribute** — no
  shadcn Tooltip component swap.
- Notes cap: **1000 chars**, enforced via
  `z.string().max(1000).nullable().optional()` at the input
  boundary.
- `AiraReviewEditModal` keeps its current name.
- Migration acceptance loosened: SQL body must be just ADD COLUMN;
  Drizzle snapshot metadata rides the same commit.

## Implementation plan

Ordered atomic tasks for `/mstack-code`.

### Task 1: Register `business.verification_changed` audit kind

- **Files:**
  - `packages/validators/src/audit-meta.ts` (edit)
  - `apps/web/src/features/admin/audit/render-detail.tsx` (edit)
- **What:**
  - Add to the `AuditMeta` discriminated union:
    ```ts
    | {
        kind: "business.verification_changed";
        fields: Array<"verified" | "verification_notes">;
        verified?: { from: boolean; to: boolean };
        verification_notes?: { from: string | null; to: string | null };
      }
    ```
  - Add `"business.verification_changed"` to `KNOWN_AUDIT_ACTIONS`.
  - Add `"business.verification_changed": "Verification changed"`
    to `AUDIT_ACTION_LABEL_OVERRIDES`.
  - Add a case to the switch in `render-detail.tsx` rendering a
    diff-style summary. Copy shape from
    `community.post_edited` (which uses the same fields-array
    pattern). Render each changed field on its own line with
    from → to (booleans as "Verified/Not verified"; notes
    truncated via the existing `truncate()` helper at 60 chars).
- **Acceptance:**
  - `pnpm --filter @aira/validators typecheck` clean.
  - `pnpm --filter @aira/web typecheck` clean (the exhaustive
    switch's `never` default doesn't fire).
  - The `_ActionsCoverage` assertion still emits
    `[true, true]` — verify no red squiggle in the file after
    editing.
  - `KnownAuditActionSchema.parse("business.verification_changed")`
    would resolve (implicit — the enum contains the literal).

### Task 2: Schema — add `verification_notes` column + migration

- **Files:**
  - `packages/db/src/schema/businesses.ts` (edit)
  - `packages/db/drizzle/migrations/NNNN_*.sql` (new, generated)
  - `packages/db/drizzle/migrations/meta/*` (auto-updated by
    `db:generate`)
- **What:**
  - In `businesses.ts`, add a nullable text column right after
    `verified`:
    ```ts
    /** Admin-only free-text log of the verification decision —
     *  call refs, licence numbers, photo comparison notes.
     *  Nullable; capped at 1000 chars in Zod (DB is unbounded
     *  text). NEVER surfaced on the public BusinessSchema or
     *  /api/v1/businesses. */
    verification_notes: text("verification_notes"),
    ```
  - Also update the file's header comment block (top of file,
    numbered decisions list) to document the field next to the
    `verified` entry — small quality-of-life polish that costs
    nothing on this same-file diff.
  - Run `pnpm db:generate`. Confirm the generated SQL body is a
    single `ALTER TABLE ADD COLUMN` (no unexpected drops / renames).
  - Stage the schema file, the new numbered migration file, AND
    the auto-updated snapshot metadata — all ride this commit.
- **Acceptance:**
  - `pnpm db:generate` produces exactly one new
    `NNNN_*.sql` file in `packages/db/drizzle/migrations/`.
  - The migration's SQL body contains
    `ADD COLUMN "verification_notes" text` and nothing else that
    would touch existing data.
  - `pnpm --filter @aira/db typecheck` clean.
  - Pre-commit `check-migrations` hook passes (schema-file
    change + matching migration).
- **Pause if:**
  - `pnpm db:generate` produces multiple migration files, OR
    any DROP / RENAME / ALTER TYPE statements. That means Drizzle
    detected a drift outside our intended change — escalate
    rather than silently commit.

### Task 3: Validators + service diff/audit + admin projection

- **Files:**
  - `packages/validators/src/businesses.ts` (edit)
  - `packages/services/src/businesses/queries.ts` (edit —
    `toBusinessAdmin` only)
  - `packages/services/src/businesses/service.ts` (edit —
    `updateBusiness`)
- **What:**
  - **Validators:**
    - Extend `BusinessAdminSchema`:
      ```ts
      export const BusinessAdminSchema = BusinessSchema.extend({
        contact_person: z.string().nullable(),
        verification_notes: z.string().nullable(),
      });
      ```
    - Extend `BusinessUpdateInputSchema` (the `.strict()` one at
      line 164) with:
      ```ts
      verification_notes: z
        .string()
        .trim()
        .max(1000)
        .nullable()
        .optional(),
      ```
    - Public `BusinessSchema` **untouched**.
  - **Query projection:** In `toBusinessAdmin` (line 611–620),
    add `verification_notes: row.verification_notes ?? null`
    alongside `contact_person`. The public `toBusiness` mapper
    stays as-is (no leak).
  - **Service diff + audit + passthrough:** In `updateBusiness`
    (service.ts:41+):
    1. Add `if (data.verification_notes !== undefined)
       updatePayload.verification_notes = data.verification_notes;`
       to the payload-building block.
    2. Before the transaction, add a "verification diff"
       block that:
       - When either `data.verified !== undefined` OR
         `data.verification_notes !== undefined`, reads the old
         values from the DB (`SELECT verified, verification_notes
         FROM businesses WHERE id`).
       - Computes `verifiedChanged`, `notesChanged`.
       - If **any** changed, calls
         `createAudit(db)` with `action:
         "business.verification_changed"`, meta as per Task 1's
         shape, `client: auditClient(ctx)`.
       - Skips the audit entirely if nothing actually changed
         (idempotent save).
    - Emit the audit **outside** the `db.transaction` block —
      matches the `contact_person_changed` precedent (Concern #1).
- **Acceptance:**
  - `pnpm --filter @aira/services typecheck && test` clean.
  - `pnpm --filter @aira/web typecheck` clean.
  - Zod rejects a `verification_notes` string > 1000 chars with a
    validation error at the op boundary (verify by hand
    once — `curl` against `/api/v1/admin/businesses/:id` with a
    1001-char string; expect the standard 400 shape from
    `defineOperation`'s Zod error mapper).
  - Manual: hit `/api/v1/admin/businesses/:id` with a PATCH that
    changes just `verified` → after the call, `audit_log` has
    exactly one new row with `action =
    "business.verification_changed"` and `fields = ["verified"]`.
  - Same test with only `verification_notes` change → one row
    with `fields = ["verification_notes"]`.
  - Both together → one row with both entries in `fields`.
  - No-op save (rating change only) → 0 new
    verification_changed rows.
- **Pause if:**
  - The service's existing `updatePayload` shape has changed
    since this plan was written (someone added another field
    with its own diff-audit branch). Re-read the surrounding
    code and preserve the pattern rather than blindly inserting.

### Task 4: Admin detail UI — notes textarea + read section

- **Files:**
  - `apps/web/src/features/admin/components/business-detail.tsx`
    (edit)
- **What:**
  - **`AiraReviewEditModal`:**
    - Add state: `const [verificationNotes, setVerificationNotes]
      = useState(business.verification_notes ?? "")`.
    - Include in save payload:
      ```ts
      verification_notes: verificationNotes.trim() || null,
      ```
    - Add a new form field below the verified checkbox
      (line ~1457):
      - Label: "Verification notes" with helper text
        "Internal record — call refs, licence numbers, what
        was checked. Not shown publicly. Max 1000 chars."
      - `<textarea>` styled to match the existing
        `aira_review` textarea in the same modal (grep for
        the existing textarea's className and reuse).
      - `maxLength={1000}` on the element.
      - **Always visible** (not gated on verified toggle
        state).
  - **`AiraReviewSection` (the read surface):**
    - After the section's header, when
      `business.verification_notes` is non-null and non-empty,
      render a small block:
      ```tsx
      {business.verification_notes && (
        <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
          <span className="font-medium">Verification notes:</span>{" "}
          <span className="whitespace-pre-line">
            {business.verification_notes}
          </span>
        </div>
      )}
      ```
    - Add this block between `<header>` and the existing content
      div (or between the content div and the closing tag — pick
      whichever reads better in the layout; the specific
      position isn't load-bearing).
  - **`Business` type import:** Confirm the modal's `business`
    prop is typed against `BusinessAdmin` (needs to be, otherwise
    `verification_notes` won't be accessible). If it's typed
    against public `Business`, widen the prop to `BusinessAdmin`
    (that's what the page already passes down — see
    `apps/web/src/app/admin/businesses/[id]/page.tsx` and its
    `getBusinessByIdAdminOp` fetch).
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck && lint` clean.
  - Manually: on `/admin/businesses/:id`, open the AIRA Review
    modal → textarea labeled "Verification notes" is present
    and editable regardless of the verified checkbox state.
  - Typing > 1000 chars is prevented by the browser via
    `maxLength`.
  - Saving with a value persists it — refresh the page and the
    same value appears in the textarea when reopening the modal.
  - The section body renders the notes as a muted block below
    the header when notes exist; hides the block when null/empty.
- **Pause if:**
  - The modal's `business` prop type turns out to be public
    `Business` (not `BusinessAdmin`), and widening the type
    breaks a callsite that passes a non-admin projection.
    Escalate rather than casting.

### Task 5: Admin list polish — un-verified `—` + notes tooltip

- **Files:**
  - `apps/web/src/app/admin/businesses/page.tsx` (edit)
- **What:**
  - In the Verified column cell (line ~206–213), replace the
    current conditional `{b.verified && <BadgeCheck />}` with:
    ```tsx
    {b.verified ? (
      <BadgeCheck
        className="size-4 fill-info text-info-foreground"
        aria-label="Verified"
        title={b.verification_notes ?? undefined}
      />
    ) : (
      <span className="text-muted-foreground/60">—</span>
    )}
    ```
  - The `title` attribute surfaces notes on hover / long-press
    when they exist. Undefined when notes are null → no tooltip
    (matches native browser behavior).
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` clean.
  - Manually: on `/admin/businesses`, un-verified rows show `—`
    in the Verified column.
  - Verified rows with non-null notes show a native browser
    tooltip on hover of the badge; content is the notes text.
  - Verified rows with null notes still show the badge with no
    tooltip (title attribute absent).
- **Pause if:**
  - The row's item type on the list page doesn't include
    `verification_notes`. This means `AdminBusinessItemSchema`
    (`apps/web/src/server/operations/businesses-admin.ts:36`)
    also needs extending — Task 3 should have handled it via
    the `BusinessAdminSchema.extend()` chain, so if it's
    missing here re-check Task 3.

## Open questions

Anything `/mstack-code` should escalate rather than guess:

- If the modal's `business` prop turns out to be typed against
  public `Business` (not `BusinessAdmin`), pause — casting
  the prop is a bug-prone shortcut.
- If `pnpm db:generate` in Task 2 produces unexpected drift
  (extra migration files, DROP / RENAME statements), pause and
  ask before committing.
- If the `AdminBusinessItemSchema` doesn't automatically inherit
  `verification_notes` via `BusinessAdminSchema.extend`, Task 5
  pauses to re-check Task 3's schema extension chain.
