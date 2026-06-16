# Run log — category-drift-fix

## 2026-06-16

- Pre-flight: working tree is clean (user's prior WIP tsx files no longer
  show as modified — they got committed/stashed/reverted between sessions).
  The Task 4 Pause-if for `business-create-form.tsx` may no longer fire if
  the file matches HEAD; will re-check at Task 4 execution time.
- Branch is `feat/admin-businesses-renewal-urgency-pill` (continuing on it;
  the category fix is admin polish that fits the branch theme).
- Bundling mstack artifacts (plan + review + learnings.jsonl) as one
  kick-off `docs(mstack):` commit before starting Task 1.
- Task 1 done — `a647300` refactor(listings): defensive getCategoryMeta(slug) helper + sweep 9 consumers
- Task 2 done — `136df87` feat(admin): slug-rename guard on updateCategoryOp (with 7-case Vitest)
- Task 3 PAUSED at migration apply. FK pre-check correctly raised:
  7 sponsorship rows attached to Ayurveda Wellness (biz-009) all
  reference category `qa-deactivate-1781028692142` (a level-1 "QA
  Deactivate" row with active=false). All created 2026-06-10 between
  07:21 and 09:00 — leftover test-fixture sponsorships from a prior
  QA run.
- User authorised "delete the 7 stale sponsorship rows in the same
  migration" via AskUserQuestion. Migration extended with a step-2
  DELETE FROM sponsorship before the category delete; defensive
  pre-check kept as a safety net for concurrent inserts. Re-applied
  cleanly — `5016c0c chore(db): migration 0027 — category drift cleanup`.
  All 4 post-conditions verified clean: food-dining=0, qa-*=0,
  Ayurveda joins=0, dangling sponsorships=0.
- Task 4 attempted with full plan (including schema doc-comment).
  Pre-commit lefthook flagged schema/businesses.ts edit. Ran
  `pnpm db:generate` to confirm no real schema diff — discovered a
  pre-existing snapshot chain collision (0025 and 0026 share the
  same top-level id/prevId because someone copied 0025_snapshot.json
  verbatim when shipping 0026). drizzle-kit can't compute the diff
  while that collision exists. Three options assessed: fix upstream
  collision (out of scope), --no-verify (banned by AGENTS.md unless
  user explicitly asks), or revert just the schema doc-comment edit.
  Chose the third — reverted `packages/db/src/schema/businesses.ts`
  to HEAD; the JS/TS form change is the load-bearing piece and lands
  cleanly. The schema doc-comment update is now a documented
  follow-up.
- Also surfaced: my own 0027_snapshot.json had the same
  id-collision-with-0026 issue (because I copied 0026's snapshot
  forward). Fixed in `4c63f22 fix(db): correct snapshot chain
  pointers for 0027` — bumped prevId to 0026.id and gave 0027 a
  fresh uuid. The 0025/0026 collision is still there; this fix at
  least keeps the rot from spreading.
- Task 4 final commit: `5990b00 feat(admin): BusinessCreateForm reads
  categories from DB; delete VALID_CATEGORIES`. Typecheck + tests
  green; no VALID_CATEGORIES references remain anywhere except the
  one explanatory comment in validators/businesses.ts.
