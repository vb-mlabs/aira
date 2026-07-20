# Fix — Unlock Amount field in the sponsorship Edit dialog

**Started:** 2026-07-20 14:30
**Source:** user-report (decision reversal from review
2026-07-20-admin-edit-sponsorship)
**Status:** fixed
**Commit:** _pending_

## Symptom / repro

The Add/Edit sponsorship dialog shipped in commit 7b6d75c renders
Amount as `$<value> (locked)` when opened for Edit — matching the
review's locked decision that Amount is not editable post-Add. User has
reversed that decision and wants Amount editable in Edit mode too.

Reproduced by reading `sponsorships-section.tsx` — the isEdit branch at
the Amount field renders the read-only paragraph instead of the Input;
the Edit branch of `handleSubmit` omits `amount_cents` from the PATCH
body.

## Root cause

Not a bug — a locked design decision from
`.mstack/reviews/2026-07-20-admin-edit-sponsorship.md` ("Locked-amount
displayed in the Edit dialog for row confirmation"). The backend has
always supported the update: `SponsorshipUpdateInputSchema` already
allows `amount_cents: z.number().int().nonnegative().optional()`, and
`updateSponsorship` in the service layer forwards it via the generic
`...rest` spread.

## Fix

`apps/web/src/features/admin/components/sponsorships-section.tsx`:

- Amount field in `SponsorshipDialog` now renders the editable `$`-prefixed
  Input in both Add and Edit modes (dropped the `isEdit` ternary that
  showed `$<value> (locked)`).
- `handleSubmit`'s Edit branch now parses `amountDollars` and includes
  `amount_cents` in the PATCH body — with the same NaN + negative check
  the Add branch already uses. The check was hoisted above the
  branch so both flows enforce it uniformly.

Two-line net effect for the user: same input control, PATCH now carries
`amount_cents`. Backend accepted the field all along.

## Evidence

- `pnpm typecheck` → passes (10/10 tasks).
- `pnpm lint` → 0 errors on the touched file.
- Repro re-read of the file post-edit: the Amount field's `isEdit`
  branch is gone; PATCH body includes `amount_cents`.

## Follow-ups

- Update the review's decision note to reflect the reversal — done as
  part of this commit's ledger.
- Reviewer-recorded decision "amount changes post-payment are a financial
  event, not a UI typo fix" is no longer enforced in the UI. If auditors
  ever ask for that back, they'd want either a per-field audit diff
  (already on the backlog) or a soft confirm on save.
