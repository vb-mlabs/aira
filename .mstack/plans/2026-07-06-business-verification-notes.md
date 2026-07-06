# Plan: Business verification workflow — notes + audit trail

**Date:** 2026-07-06
**Slug:** 2026-07-06-business-verification-notes
**Status:** implemented
**Author:** claude

---

## Problem

QA feedback #9: admin toggles `verified` on a business today, but there
is no record of *why* the decision was made — no call log, no reference
number, no photo comparison notes. Admin cannot answer "who verified
this, and what did they check?" after the fact. Public users see the
blue-tick badge with no traceability behind it.

Two gaps to close:

1. **Data:** capture free-text `verification_notes` alongside the boolean.
   Admin-only field (PII-adjacent — may mention owners by name).
2. **Audit:** verification decisions currently leave no trail. Toggling
   `verified` writes no audit_log row.

Success = an admin looking at `/admin/businesses/[id]` sees both the
verified state AND the notes admins have accumulated, plus the audit
timeline shows every change with who + when + before/after.

**Investigation findings** (grounded in the code, not guessed):

- The verify toggle already lives inside `AiraReviewEditModal` in
  `apps/web/src/features/admin/components/business-detail.tsx:1382`
  alongside star rating + `aira_review` text. Save flow is single-button:
  `runUpdate(business.id, { rating, aira_review, verified })`. Perfect
  place to add a notes textarea — no new modal or save-per-section
  scaffolding needed.
- The admin list at `/admin/businesses` **already has a "Verified"
  column** (page.tsx:120) rendering a `BadgeCheck` icon when
  `b.verified`. What's missing is:
  - Notes surfacing (currently no notes exist)
  - Un-verified visual (today shows nothing, could show a muted "—" for
    parity with other columns)
- Audit combined-fields precedent exists — `community.post_edited` uses
  `fields: Array<...>` + optional per-field `from/to` pairs. Reuse this
  shape for `business.verification_changed`.

## Scope

**In:**

- **DB:** add nullable `verification_notes text` column to `businesses`.
  Additive migration — no rewrites, no defaults, no data touch.
- **Validators:**
  - Extend `BusinessAdminSchema` in `packages/validators/src/businesses.ts`
    with `verification_notes: z.string().nullable()`.
  - Extend `BusinessUpdateInputSchema` with the same field (nullable,
    optional, `.max(1000)`). Public `BusinessSchema` stays untouched.
- **Audit kind:** register `business.verification_changed` at all four
  touchpoints (AuditMeta union, KNOWN_AUDIT_ACTIONS, LABEL_OVERRIDES,
  `render-detail.tsx` switch case). Shape mirrors `community.post_edited`:
  ```ts
  {
    kind: "business.verification_changed";
    fields: Array<"verified" | "verification_notes">;
    verified?: { from: boolean; to: boolean };
    verification_notes?: { from: string | null; to: string | null };
  }
  ```
- **Service:**
  - `updateBusiness` in `packages/services/src/businesses/service.ts`
    reads `verified` + `verification_notes` before the update, then
    emits the combined audit row when either actually changed.
  - Passthrough for `verification_notes` alongside the existing fields.
- **Admin UI:**
  - `AiraReviewEditModal` — add a "Verification notes" textarea below the
    verify toggle. Shown only when `verified` is being turned on OR
    already true (nested under the checkbox visually, so unchecked
    → hidden). Saved together with everything else in the same button.
  - `/admin/businesses` list — the Verified column keeps the BadgeCheck
    for `verified=true`; when notes are present, add a small tooltip
    (`title` attribute or a shadcn Tooltip) showing the notes on hover.
    For `verified=false`, render a muted "—" for parity.
- **Detail-page read surface:** the existing `AiraReviewSection`
  header shows the verified badge (line 1172). Add a small "notes"
  affordance: when notes exist, render a subtle icon (message-square?)
  next to the badge with the notes as tooltip / expandable text. Or —
  simpler — just show the notes as a `text-muted-foreground` block
  below the verified pill.

**Out (deferred):**

- Public-facing verification info (e.g. "verified 3 months ago by
  AIRA"). Notes are admin-only.
- A separate "who verified" `verified_by_user_id` FK. The audit_log row
  captures `actor_id` — reconstructable from audit. Only bake into a
  denormalised column if admin surfaces need to sort/filter by it.
- Verification workflow states beyond boolean (e.g. "pending review",
  "rejected"). Boolean + notes is enough for MVP; a state machine can
  come later if the workflow grows.
- Bulk verification actions on the list (e.g. "verify selected"). Not
  asked for.
- Notes rich-text / markdown. Plain text with a length cap is enough.

## Approach

**Single-modal save flow, combined audit row.**

The `AiraReviewEditModal` already batches three fields (rating,
aira_review, verified) into one save. Adding `verification_notes` as
a fourth is the minimum-friction path — no new save button, no
new modal, no split UX. The textarea sits nested under the verified
checkbox visually so the two feel like one decision. This matches
the plan-doc's "save-per-section" pattern the arg text asked for.

**Combined audit row** (one row per save that touched verification):
```ts
audit({
  actorId: ctx.userId,
  action: "business.verification_changed",
  target: { type: "business", id },
  meta: {
    kind: "business.verification_changed",
    fields: /* array of ["verified", "verification_notes"] that changed */,
    verified: verifiedChanged ? { from: oldVerified, to: newVerified } : undefined,
    verification_notes: notesChanged
      ? { from: oldNotes, to: newNotes }
      : undefined,
  },
  client: auditClient(ctx),
})
```

The `contact_person_changed` audit (in the same `updateBusiness`
function) provides the "read old value before mutation, diff-then-emit"
pattern to mirror. Emit BEFORE the mutation for the same reason —
failed audit blocks the write.

**List column: existing infra, minor polish.**

The Verified column already exists. Enhancement path:
1. Show `—` for `verified=false` (visual parity with other columns).
2. When `b.verification_notes` is present, wrap the BadgeCheck in a
   `title` attribute containing the notes (native browser tooltip —
   zero JS, works on hover + long-press).
3. Optional stretch: swap `title` for a shadcn Tooltip for better
   styling. Not blocking for MVP.

**Notes on the detail-page read surface.**

The `AiraReviewSection` renders the badge but not the notes today.
Simplest addition: below the badge, when notes exist, render a small
`text-muted-foreground` block with a "Verification notes:" label and
the note text. No hover / expand — admin sees notes directly. This is
the primary consumption surface for admin ops.

## Alternatives considered

- **Two audit kinds** (`business.verification_toggled` +
  `business.verification_notes_changed`). Rejected — same actor / same
  submit / same intent → one row. `community.post_edited` already
  established the combined-fields pattern; adding a variant for parity
  would double the audit table for no gain.
- **Separate "Save verification" button below the toggle.** Rejected
  because it splits the AIRA Review modal into two save flows and forces
  the admin to think about them as separate operations. The current
  modal groups editorial decisions (rating, review, verified) — notes
  belongs in the same batch.
- **Rich-text notes.** Rejected. Notes are internal call/reference
  logs — plain text with a `\n` respected is enough. Adding markdown or
  a WYSIWYG doubles the surface area (rendering, sanitisation, migration
  if we ever go public with notes).
- **Show notes on `/admin/businesses` list inline (not tooltip).**
  Rejected — the table is already 8 columns wide; a notes column at
  full width would push the table into horizontal scroll on the common
  admin viewport. Tooltip is the right density trade-off.

## Data model changes

**New migration** generated via `pnpm db:generate` after the schema edit:
- `packages/db/src/schema/businesses.ts` — add:
  ```ts
  /** Admin-only free-text log of the verification decision — call
   *  refs, licence numbers, photo comparison notes. Nullable; capped
   *  at 1000 chars in Zod (DB is unbounded text). NEVER surfaced on
   *  the public BusinessSchema or /api/v1/businesses. */
  verification_notes: text("verification_notes"),
  ```

Non-destructive additive column. No default, no data touch. Existing
rows land as `NULL`.

**Audit kind registration** at the four sites:
- `packages/validators/src/audit-meta.ts` — new AuditMeta variant +
  KNOWN_AUDIT_ACTIONS entry + AUDIT_ACTION_LABEL_OVERRIDES
  (`"Verification changed"`).
- `apps/web/src/features/admin/audit/render-detail.tsx` — new case
  in the exhaustive switch (per-field renderer showing the diff).

## Files to touch

**Schema + migration:**
- `packages/db/src/schema/businesses.ts` (edit)
- `packages/db/drizzle/migrations/NNNN_*.sql` (new, generated)

**Validators + audit:**
- `packages/validators/src/businesses.ts` (edit —
  `BusinessAdminSchema` + `BusinessUpdateInputSchema`)
- `packages/validators/src/audit-meta.ts` (edit — 3 additions)

**Service:**
- `packages/services/src/businesses/service.ts` (edit —
  `updateBusiness` reads old values, diffs, emits combined audit)
- `packages/services/src/businesses/queries.ts` (edit — `toBusinessAdmin`
  projection so `verification_notes` reaches admin surfaces)

**Admin ops:**
- `apps/web/src/server/operations/businesses-admin.ts` — no code
  change required (the passthrough via updateBusiness is enough);
  verify the strict output shape still validates.

**Admin UI:**
- `apps/web/src/features/admin/components/business-detail.tsx` (edit)
  - `AiraReviewEditModal`: new state + textarea; include in save
    payload.
  - `AiraReviewSection`: render notes under the verified badge when
    present.
- `apps/web/src/app/admin/businesses/page.tsx` (edit)
  - Verified column: `—` for false + `title` attribute for notes on
    the badge.
- `apps/web/src/features/admin/audit/render-detail.tsx` (edit — see
  above).

**No mobile changes.** Verification workflow is admin-only.

## Edge cases

- **Empty string vs null on notes.** Trim + coerce empty string to
  `null` at the modal boundary (matches the existing
  `airaReview.trim() || null` pattern). Consistent nullability
  simplifies the diff.
- **Notes longer than the DB column.** DB is unbounded `text`; Zod
  caps at 1000 at the input boundary. Server rejects with a Zod
  validation error before the DB write.
- **Toggling verified off with notes still populated.** Keep the
  notes. Admins may want to preserve the audit context ("we verified,
  then found this discrepancy, un-verifying"). The notes textarea
  stays visible when verified is either true OR has non-null notes.
- **Audit emitted with 0 fields** — impossible if we guard on
  `fields.length > 0` before calling audit. When both old and new
  match, skip the audit entirely.
- **Concurrent edits** — no new locking beyond the existing
  updateBusiness transaction shape. Last-write-wins on both
  `verified` and `verification_notes`; audit trail preserves the
  history.
- **Migration ordering** — additive column only. `pnpm db:migrate`
  runs cleanly on prod. Old rows land as NULL, which is what we
  want.
- **Existing verified=true rows without notes** — no data
  migration. `NULL` notes is a valid state ("verified before we
  started capturing notes"). List tooltip only appears when notes
  are non-null.

## Acceptance criteria

- [ ] Admin can edit "Verification notes" from the AIRA Review modal
      on `/admin/businesses/[id]`. Save button applies all four
      fields (rating, review, verified, notes) atomically.
- [ ] Notes are surfaced on the detail page under the verified
      badge when non-null.
- [ ] Admin list `/admin/businesses`:
      - Un-verified rows show a muted `—` in the Verified column
        (visual parity).
      - Verified rows with notes show the notes as a hover tooltip
        (`title` attribute or Tooltip component) on the badge.
- [ ] Verification changes emit exactly one
      `business.verification_changed` audit row. `fields` array
      reflects only the fields that actually changed. Skipped when
      neither changed.
- [ ] Audit log timeline renders the change with a diff view
      ("Verified: false → true; Notes: '' → 'confirmed licence
      ATL-4823'").
- [ ] Public `BusinessSchema` and `/api/v1/businesses` do NOT
      include `verification_notes` (grep to confirm; extend
      contract test if trivial).
- [ ] `pnpm typecheck && pnpm lint && pnpm test` clean at the end
      of the branch.
- [ ] The `_ActionsCoverage` assertion in audit-meta.ts still
      compiles (both directions of the coverage check pass).
- [ ] Zod rejects a `verification_notes` string > 1000 chars with a
      standard validation error at the op boundary.
- [ ] `pnpm db:generate` produces exactly one new migration file
      containing only the ADD COLUMN statement.

## Open questions

For `/mstack-review` to resolve before implementation:

1. **Notes character cap** — 1000 chars proposed. `contact_person`
   is 120. Community post `body` has no cap. What's the right
   number here? Reviewer / user should sign off; can go higher
   without changing the DB (it's `text`).

2. **List column tooltip: native `title` or shadcn Tooltip?** The
   plan proposes `title` for simplicity. If the design bar is
   higher (styled bubble, richer content), swap to the Tooltip
   primitive that already exists elsewhere in the admin.

3. **Notes visibility when verified=false.** Plan says: hide the
   textarea when `verified` is off AND notes are empty; show when
   `verified` is on OR notes are non-empty. Alternative: always
   show. The former reduces noise, the latter lets admin pre-write
   notes then verify. Which is preferred?

4. **`AiraReviewEditModal` naming.** Adding verification notes
   arguably takes this modal beyond "AIRA Review" into
   "editorial + verification". Rename to something broader (e.g.
   "Editorial + Verification") or keep the current name since the
   notes are still a curation decision? Plan proposes to keep,
   reviewer may push back.

5. **Detail-page notes affordance.** Plan says: render notes as
   `text-muted-foreground` under the badge, always visible when
   present. Alternative: click-to-reveal / hidden by default. Which
   fits the admin flow better?
