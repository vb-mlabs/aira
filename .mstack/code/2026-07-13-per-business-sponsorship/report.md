# Implementation report — per-business sponsorship model

**Started:** 2026-07-13 09:30
**Finished:** 2026-07-13 11:15
**Review:** [2026-07-13-per-business-sponsorship](../../reviews/2026-07-13-per-business-sponsorship.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Audit script + pnpm alias + baseline run | ✓ done | `fa8a117` |
| 2 | Dedup CTE test harness | ⊘ skipped | — |
| 3 | Schema drop + migration + backend refactor | ✓ done | `6725631` |
| 4 | Admin sponsorship modal + list cleanup | ✓ done | `3b00a84` |
| 5 | Sponsorship-tier admin cleanup | ✓ done | `f0428b8` |

## Commits (chronological)

```
f0428b8 feat(admin/sponsorship-tiers): explain priority-sorts-no-caps model
3b00a84 feat(admin/sponsorship): show 'Will feature on: …' helper in add-sponsorship dialog
6725631 feat(sponsorship): drop category_id + max_slots — per-business sponsorship model
fa8a117 chore(db): add audit-orphan-sponsorships script
```

Also on this branch (from earlier in the session, referenced by the plan/review):

```
3a14a08 docs(mstack): per-business sponsorship plan + review
617d814 fix(admin): allow admin role to list membership plans and sponsorship tiers
```

## Deviations from the review

- **Task 2 skipped.** Documented Pause if trigger: no `packages/db/tests/` infra existed; other packages' vitest suites use mocked DB objects and can't validate real SQL semantics. User selected the "skip and rely on task 1's audit script" option. Prod deploy plan: run `pnpm --filter @aira/db audit:orphan-sponsorships` on staging + prod before applying the migration, review predicted winners manually, then `pnpm --filter @aira/db audit:orphan-sponsorships --verify` after.
- **Task 3 scope expanded to include Task 4/5 UI deletions.** The schema shrink (drop `category_id`, drop `max_slots`) breaks compile in `sponsorships-section.tsx` and `tier-form.tsx` until the UI files stop reading the removed fields. Bundling those deletes into Task 3 preserves the atomic-per-task rule (each commit compile-clean). Tasks 4/5 shrink to "add-only" — the new "Will feature on" helper line and the tier page helper text.

## Verification

- `pnpm typecheck` → clean across all packages
- `pnpm test` → 172/172 in apps/web, no regressions (other packages cached OK)
- Lint on all touched files → clean
- Lefthook (contrast, migrations, no-server-actions) → all pass on every commit
- Migration 0035 applied against dev DB successfully
- Post-migration `pnpm --filter @aira/db audit:orphan-sponsorships --verify` → 0 residual duplicates

## Follow-ups

- **Prod smoke test after deploy.** As admin, `/admin/businesses/[id]` → "Add sponsorship" → Tier + dates + amount → submit. Verify (a) no Category dropdown appears, (b) "Will feature on: …" line lists the business's current categories, (c) the sponsorship row shows in the list without a Category column, (d) the business is featured on all its category listing pages.
- **Prod migration flow.** Run `pnpm --filter @aira/db audit:orphan-sponsorships` on prod DB before applying migration 0035. Review predicted-winner output for each business with >1 active/scheduled row. Apply migration. Run `--verify` after — must exit 0.
- **RTL infra for regression tests** (carried over from earlier fix TODOS) — still open. Would enable a proper test for the "Will feature on" empty-categories warning branch, among others.
- **Renewal reminders don't currently cover sponsorship expiry** — flagged as an open question in the plan, still deferred. Separate scope.

## Recommended next step

`/mlabs-qa --focus sponsorship-admin` — drive through the admin flow end-to-end with Playwright to catch anything Task 3's minimum-viable-compile UI edits or Task 4's new helper missed. Priority: prod-deploy readiness.
