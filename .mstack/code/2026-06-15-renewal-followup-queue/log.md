# Implementation log

- **T1** ✓ (7303bb1) — schema + enum + migration 0023. Side-fix beforehand: 0022_snapshot.json had a broken id/prevId chain (F17 SQL-only seed had reused 0021's id and skipped 0021 in prevId), blocking db:generate. Fixed in standalone commit 21adb61 before T1's commit. Workflow artifacts (plan + review + learnings) pre-committed in 6df81f6.
- **T2** ✓ (eb0053b) — AuditMeta union extended cleanly. Single action kind + outcome-in-metadata per the locked review decision.
- **T3** ✓ (7201f4f) — validators with superRefine. Ran 9-probe runtime sanity check via tsx: enum / called missing note / called empty note / called with note / reschedule no days / reschedule 7d / voicemail with days forbidden / voicemail ok / reschedule cap. All matched expected behaviour.
- **T4** ✓ (1610954) — service queries. Drizzle's `.where()` accepted correlated `sql` fragments + `inArray()` + raw `<=` predicate without complaint. Smoke test via tsx blocked by `import "server-only"` shim outside Next.js — typecheck-only verification, runtime confirmation deferred to /mlabs-qa.
- **T5** ✓ (b1cf318) — transactional mutation. Audit-before-INSERT with pre-generated UUID. No FK conflicts.
- **T6** ✓ (5b23bc1) — three ops including a third (listFollowupHistoryOp) not in the review explicitly — T9's modal needs it. Co-locating GET + POST on the same path stays clean.
- **T7** ✓ (fc7f5ca) — routes are one-liners via `runFromRequest`. Followed existing community route convention.
- **T8** ✓ (cdc7ea8) — page + table + chips. Pre-existing lint errors in 5 unrelated files surfaced when running `pnpm lint` repo-wide; pre-commit hook runs lint-staged on staged files only, so commit went through cleanly. My new files lint clean.
- **T9** ✓ (2b0cabd) — modal + radio + sidebar. Hit `react-hooks/set-state-in-effect` on the form-reset + history-reset effects; refactored to drop both reset effects entirely (parent unmounts modal on close, so every mount starts pristine). Cleaner overall.
