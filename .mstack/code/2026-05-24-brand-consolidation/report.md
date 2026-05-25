# Implementation report: Brand consolidation (Muscat → mlabs)

**Date:** 2026-05-24
**Review:** [.mstack/reviews/2026-05-24-brand-consolidation.md](../../reviews/2026-05-24-brand-consolidation.md)
**Branch:** `Vbhadala/incorporate-fork-learnings`
**Status:** complete

---

## Summary

All 5 tasks from the review landed cleanly. One discovered-during-implementation refinement (a Pause-if didn't fire — the issue was caught by the rewritten completeness test): the `mlabs-mobile` matcher in `rename.ts` had to be loosened from quote-anchored to bare-token so it caught the backticked `` `mlabs-mobile` `` form in CHANGELOG. One micro-cleanup commit (residual historical comment in rename.ts) at the end to satisfy the strict zero-muscat acceptance grep.

Net: the template now has a single brand placeholder identity. Forks search-and-replace one identifier (`mlabs` / `MLabs Template`), and the rename script handles all the anchored contexts cleanly while preserving bare `MLabs` as agency attribution where it belongs.

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Migrate functional source from muscat to mlabs | ✓ done | `21a6901` |
| 2 | Rebase rename.ts + tests + fixture (atomic) | ✓ done | `faa84c7` |
| 3 | Update README + forking-guide + TEMPLATE.md | ✓ done | `888cdef` |
| 4 | Update CHANGELOG.md | ✓ done | `e7229f2` |
| 5 | Update FORK_CHECKLIST.md.template | ✓ done | `5708450` |
| — | Cleanup: residual comment in rename.ts | ✓ done | `956b0e6` |

## Commits (newest first)

- `956b0e6` chore(rename): drop residual muscat reference from in-body comment
- `5708450` docs(fork-checklist): update placeholder + verify-grep for single-brand
- `e7229f2` docs(changelog): consolidate muscat-mobile to mlabs-mobile
- `888cdef` docs(brand): update rename docs for single-brand consolidation
- `faa84c7` refactor(rename): rebase on single-brand placeholder + refresh fixture
- `21a6901` refactor(brand): migrate functional source from muscat to mlabs

Plus two prep commits from before the run:

- `5f77aca` docs(mstack): add brand-consolidation plan + review
- `4f09ac9` fix(mobile): set darkMode:class in generated tailwind config

## Final verification

- ✓ `grep -ri muscat .` (excluding `node_modules`, `.mstack`, `.git`, `.next`, `.turbo`, `.context`, `apps/web/tests/fixtures`, `pnpm-lock.yaml`) returns **0 hits**.
- ✓ `pnpm typecheck` — 10/10 workspaces green.
- ✓ `pnpm --filter @mlabs/web exec vitest run` — 162/162 tests passing.
- ✓ `pnpm --filter @mlabs/web exec vitest run tests/rename.test.ts` — 25/25 tests passing (post-cleanup).
- ✓ `pnpm gen:mobile-tw:check` — in sync.
- ✓ Lefthook pre-commit hook (check-migrations + check-mobile-tailwind + check-contrast) passed on every commit.

## Discovered during implementation (non-blockers)

- **CHANGELOG's backticked `` `mlabs-mobile` `` survived the initial Task 2 run** because the matcher was quote-anchored to `"mlabs-mobile"`. The new completeness assertion (added in this same task) caught it. Fix was to loosen the matcher from quote-anchored to bare-token replacement — safe because `mlabs-mobile` is uniquely-shaped enough that no realistic collision exists. Captured in Task 2's commit and the in-body comment in `rename.ts`.
- **FORK_CHECKLIST.md.template's verification-grep** (`grep -rlE "@mlabs|\bMuscat\b" ...`) was a leftover from the pre-consolidation era. Updated in Task 5 to match the new anchored token patterns the rename script produces. Doesn't change behavior but means forks see a meaningful residue check after rename.

## Follow-ups

None blocking. Optional polish (not in scope of this review):

- The `.context/attachments/mfFW2S/TEMPLATE.md` file showed in the residue grep but is a Conductor workspace attachment, not project source (`.context/` is gitignored). No action needed.

## Recommended next step

Run **`/mlabs-qa`** with focus on the rename flow:

> "Test the pnpm rename script end-to-end. Apply a fresh rename
> to a scratch clone with namespace `@acme`, slug `acme`,
> displayName `ACME App`, deeplink-host `app.acme.com`. Verify
> bundle title, JWT issuer, Maestro URIs, and post-rename
> typecheck + tests all pass."

This is the right verification surface — the test suite covers the script's transform logic against a fixture, but only a real-repo dry-run sanity-checks that nothing else in the template surprises the rename.
