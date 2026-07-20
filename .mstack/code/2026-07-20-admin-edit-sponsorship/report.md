# Implementation report — Admin edit sponsorship + payment evidence upload

**Status:** complete
**Review:** [.mstack/reviews/2026-07-20-admin-edit-sponsorship.md](../../reviews/2026-07-20-admin-edit-sponsorship.md)
**Branch:** `feat/landing-explainer-videos`
**Commits:** 8 (task commits) + 1 (housekeeping)

## Tasks

| # | Status | Task | Commit |
|---|--------|------|--------|
| 1 | ✓ done | Schema + migration for `sponsorship.payment_evidence_url` | 6b35062 |
| 2 | ✓ done | Extend sponsorship Zod schemas | f33da5b |
| 3 | ✓ done | Add sponsorship audit variants + render cases | dfa7d09 |
| 4 | ✓ done | Project `payment_evidence_url` in read mapper | 363136b |
| 5 | ✓ done | Emit `business.sponsorship_updated` audit in the op | 657d54f |
| 6 | ✓ done | Generalize `processAndStoreEvidence` with `domain` param | 41734a7 |
| 7 | ✓ done | New evidence upload route for sponsorships | 8abac62 |
| 8 | ✓ done | Add/Edit dialog + Edit button + inline Evidence dropzone | 7b6d75c |

## Commits

- `6b35062` feat(db): add payment_evidence_url column to sponsorship
- `f33da5b` feat(validators): extend sponsorship schemas with payment_evidence_url
- `dfa7d09` feat(audit): add sponsorship_updated + sponsorship_evidence_uploaded actions
- `363136b` feat(services): project payment_evidence_url in toSponsorship mapper
- `657d54f` feat(admin/sponsorships): emit sponsorship_updated audit before mutate
- `41734a7` refactor(admin/evidence): generalize processAndStoreEvidence with domain param
- `8abac62` feat(admin/sponsorships): POST /evidence route with audit emit
- `7b6d75c` feat(admin/sponsorships): edit action, evidence dropzone, add/edit dialog
- (plus `7cb71d1` docs(mstack): housekeeping commit for plan+review artifacts, pre-Task 1)

## Verification evidence (this session)

- **Schema:** `pnpm db:generate` produced a single `ALTER TABLE sponsorship ADD COLUMN payment_evidence_url text` (migration 0037_stale_phantom_reporter.sql). `pnpm --filter @aira/db migrate` exited 0 and `SELECT payment_evidence_url FROM sponsorship LIMIT 1` returned a null column.
- **Typecheck:** `pnpm typecheck` — 10/10 tasks pass on the final tree (final run after task 8).
- **Lint:** `pnpm lint` — 0 errors on the touched file (16 pre-existing warnings elsewhere).
- **Token drift:** `check-token-drift.sh apps/web/src/features/admin/components/sponsorships-section.tsx` — no findings.
- **Pre-commit hook:** every commit passed `check-migrations`, `check-contrast`, `check-no-server-actions`, `check-mobile-tailwind`.

## Follow-ups

None beyond what the review already deferred to the backlog:

- Cross-field `.refine()` end_date ≥ start_date on Sponsorship input schemas
- Post-hoc evidence upload on subscriptions (mirror this pattern)
- Manual "recompute sponsorship status now" admin action
- Diff-capturing audit payload for `business.sponsorship_updated`

Plus one new item raised in **Concerns** below.

## Concerns

- **⚠ Task 6 (split storage-key prefix).** Pre-existing subscription evidence lives under `business-subscriptions/`; new subscription uploads now land at `subscriptions/`. Old URLs remain reachable via the storage driver — no functional breakage — but any operational tooling that enumerates subscription evidence storage keys must check both prefixes going forward. The review's Task 6 explicitly picked this trade-off and the Pause-if scan found no consumers indexing on the literal prefix, so this is a documented split, not a regression. Worth mentioning to QA in case a subscription evidence lookup happens on an older row.

## Recommended next step

Run `/mstack-qa` focused on:

1. Admin business detail → Sponsorships section:
   - Add sponsorship (regression check)
   - Edit sponsorship on a `scheduled` row (fields pre-fill, PATCH succeeds, table refreshes)
   - Edit sponsorship on an `active` row
   - `expired` / `cancelled` rows show no Edit or Cancel button
   - Cancel action still works (regression)
2. Evidence upload on a sponsorship row:
   - Empty row: dropzone accepts drag/drop and click
   - Uploaded row: "View" link opens the file in a new tab
   - Oversized file (>5 MB) surfaces `evidence.too_large` inline
   - Non-image/PDF file surfaces `evidence.invalid_mime` inline
3. Regression check on existing subscription evidence upload flow — the pipeline was refactored, so a fresh subscription create + evidence upload should still work end-to-end.
4. Spot-check `/admin/audit` for the two new action kinds after doing each flow.
