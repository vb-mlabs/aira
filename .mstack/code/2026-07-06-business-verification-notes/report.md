# Implementation report — Business verification workflow

**Status:** complete
**Review:** [2026-07-06-business-verification-notes](../../reviews/2026-07-06-business-verification-notes.md)
**Branch:** `feat/featured-business-selection` (now holds groups A + B + C polish + verification workflow)

---

## Tasks

| Task | Result | Commit |
|---|---|---|
| Pre-task: plan + review + config + TODOs | ✓ | `bbd7fbe` |
| 1. Register `business.verification_changed` audit kind | ✓ | `91d122b` |
| 2. Schema + migration for `verification_notes` | ✓ | `222243b` |
| 3. Validators + service diff/audit + admin projection | ✓ | `3348d51` |
| 4. Admin detail UI (modal textarea + read section) | ✓ | `ec47da4` |
| 5. Admin list polish (— + notes tooltip) | ✓ | `6a9054c` |

## Commits

```
6a9054c feat(admin): verified column — muted dash for unverified + notes tooltip
ec47da4 feat(admin): verification notes textarea in AIRA Review modal + section
3348d51 feat(services): verification_notes end-to-end wiring + diff audit
222243b feat(db): add businesses.verification_notes column
91d122b feat(audit): register business.verification_changed kind
bbd7fbe chore(mstack): plan + review for business verification notes
```

## What changed, in one paragraph

Admin can now record free-text notes alongside each verified/not-verified
decision on a business. The `verification_notes` column (nullable text)
is admin-only — it never appears on the public `BusinessSchema` or the
`/api/v1/businesses` payload, gated by keeping the field off the
`toBusiness` projection and adding it to `toBusinessAdmin` only. Notes
edit via a textarea in the existing AIRA Review modal (max 1000
chars), and the notes render as a muted block on the admin detail
page's AIRA Review section when non-empty. The admin listing table
picks up two polishes on the existing Verified column: a muted "—"
for unverified rows (visual parity with siblings) and a native
`title` tooltip on the badge for verified rows that carry notes.
Every save that changes `verified` and/or `verification_notes` emits
exactly one `business.verification_changed` audit row with a
`fields` array capturing only the fields that actually changed and
per-field from/to entries — a "flip verified" only save yields
`fields: ["verified"]`; a "notes only" save yields
`fields: ["verification_notes"]`; a "both" save yields one row with
both entries. No-op saves emit no audit.

## Deviations from the review

- **Task 4 widened two component prop types from `Business` →
  `BusinessAdmin`.** The review flagged this via a Pause-if:
  "widening breaks non-admin callers." Grep confirmed
  `AiraReviewSection` and `AiraReviewEditModal` have exactly one
  caller each, both already passing `BusinessAdmin`. Not a real
  pause condition, just a prop-signature cleanup; documented in the
  task's Notes.
- **Task 5 needed one retry.** First attempt put the `title`
  attribute directly on Lucide's `BadgeCheck`, which doesn't expose
  it. Second attempt wrapped the icon in a `<span title={notes}>`.
  Within the "one retry max" budget; recorded in log.

## Follow-ups

None. Deferrals from the review already live in `TODOS.md`
(audit-in-transaction atomicity, public verification metadata,
`verified_by_user_id` FK).

## Recommended next step

Run **`/mstack-qa`** with focus on the admin verification flow:

- Toggle verified via the AIRA Review modal; confirm the badge
  appears on `/admin/businesses` and the audit log shows one
  `business.verification_changed` row with `fields: ["verified"]`.
- Add notes then save (verified stays same); expect a second audit
  row with `fields: ["verification_notes"]` and a from/to diff.
- Save both at once; expect one combined audit row with both fields.
- Save with no changes; expect zero new audit rows.
- Curl `/api/v1/businesses` (public endpoint) and confirm the
  response body does NOT include `verification_notes` (schema-guard
  proof, not just documentation).
- Notes tooltip on the admin list: hover a verified row that has
  notes; expect the browser tooltip.
- Muted "—" on unverified rows: quick visual regression check.
