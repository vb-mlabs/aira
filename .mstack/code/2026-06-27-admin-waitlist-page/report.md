# Implementation report — admin-waitlist-page

**Status:** complete
**Branch:** `feat/qa-test-accounts-seed`
**Review:** [.mstack/reviews/2026-06-27-admin-waitlist-page.md](../../reviews/2026-06-27-admin-waitlist-page.md)
**Plan:** [.mstack/plans/2026-06-27-admin-waitlist-page.md](../../plans/2026-06-27-admin-waitlist-page.md)
**Started:** 2026-06-27 01:25
**Finished:** 2026-06-27 02:18

## Tasks

| #  | Task                                                  | Status     | Commit    |
|----|-------------------------------------------------------|------------|-----------|
| 1  | Audit registry — waitlist.delete + waitlist target     | ✓ done     | `639b8df` |
| 2  | Validators — admin list/count schemas                  | ✓ done     | `a83fb4d` |
| 3  | Waitlist admin service                                 | ✓ done     | `4da323d` |
| 8  | Audit-log renderer (pulled forward)                    | ✓ done     | `ab24225` |
| 4  | Ops + API routes                                       | ✓ done     | `af45082` |
| 6  | Consumer + business tables (pulled forward)            | ✓ done     | `7951a5b` |
| 5  | Page + sidebar entry                                   | ✓ done     | `de33747` |
| 7  | Row actions (copy + delete confirm)                    | ✓ done     | `dd92890` |
| 9  | Playwright happy-path spec                             | ⊘ skipped  | —         |

T8 was pulled ahead of T4 because the AuditMeta exhaustiveness gate in
`render-detail.tsx` fails tsc the moment the union gains a new variant —
moving T8 forward keeps every commit landing on a green typecheck.
T6 was pulled ahead of T5 for the same reason: T5's page imports
`ConsumerTable` + `BusinessTable` from T6, so committing the page before
the tables would have failed compilation. Net effect: identical
implementation, every commit compiles, two task orderings flipped.

T9 (Playwright) was skipped per the `/mlabs-code` anti-pattern:
> Don't run e2e/Playwright tests. That's `/mlabs-qa`'s job.

## Commits

Pre-implementation cleanup:

- `ae0a1f3` `fix(marketing): correct business-waitlist apiClient.post body shape`
- `716ba62` `chore(mstack): add admin-waitlist-page plan + review`

Implementation:

- `639b8df` `feat(validators): register waitlist.delete audit kind + waitlist target`
- `a83fb4d` `feat(validators): admin list/count schemas for waitlist`
- `4da323d` `feat(services): waitlist admin reads + delete-with-audit`
- `ab24225` `feat(admin): render waitlist.delete in audit log + waitlist target`
- `af45082` `feat(api): admin ops + routes for waitlist list/counts/delete`
- `7951a5b` `feat(admin): consumer + business waitlist tables (no row actions yet)`
- `de33747` `feat(admin): /admin/waitlist page + sidebar entry`
- `dd92890` `feat(admin): row actions for waitlist tables (copy + delete confirm)`

8 implementation commits on top of the 2 pre-flight commits.

## Acceptance

- `pnpm typecheck` — **green** across all 10 workspaces.
- `pnpm --filter @aira/web typecheck` — **green** after every commit.
- New files lint cleanly (`apps/web/src/features/admin/waitlist/*`,
  `apps/web/src/server/operations/waitlist-admin.ts`,
  `apps/web/src/app/api/v1/admin/waitlist/**`,
  `packages/services/src/waitlist/*`, validator + audit-meta edits).
- Pre-commit `check-no-server-actions` + `check-contrast` +
  `check-migrations` pass on every implementation commit.
- All review acceptance criteria reached except the e2e Playwright spec
  (deferred to `/mlabs-qa`).

## Follow-ups

- **Playwright happy-path coverage.** Skipped here. Recommended next run:
  `/mlabs-qa` focused on `/admin/waitlist` — tab switching, copy
  affordances, delete-with-confirm, audit row appears.
- **Pre-existing lint errors** in unrelated files surfaced during the
  run (`apps/web/src/instrumentation.ts` raw `process.env`,
  `business-broadcast-modal.tsx` and `sponsorships-section.tsx`
  set-state-in-effect). Untouched by this work; flagging here so they
  don't blindside the next person who runs `pnpm lint`.
- **Pre-existing services test failure** in
  `packages/services/src/messages/__tests__/service.test.ts` (vitest
  `relations` mock setup). Unrelated to waitlist; last touched in the
  fork-rename commit `a68431b`. Worth a small cleanup pass.
- **Validator subpath.** `@aira/validators/waitlist` was considered for
  the package.json exports map for consistency with `./community`,
  `./businesses`, etc., but skipped to keep this PR focused. Add it
  when the next feature wants the subpath.

## Recommended next step

Run `/mlabs-qa` with focus on `/admin/waitlist`:

- Tab switching keeps URL state (`?tab=consumer|business`).
- Counts header tiles match each tab's row count.
- Copy email / Copy phone both succeed (verify clipboard mock).
- Delete row → AlertDialog → confirm → row disappears + audit row
  appears at `/admin/audit`.
- 404 race path: delete a row, then click delete on the same row in a
  second tab — second delete should soft-handle.
