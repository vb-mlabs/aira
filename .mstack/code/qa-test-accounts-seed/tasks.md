# Implementation: QA test accounts seed

**Started:** 2026-06-17
**Review:** [2026-06-17-qa-test-accounts-seed](../../reviews/2026-06-17-qa-test-accounts-seed.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add `seed-qa-accounts.ts` + wire the `@aira/db seed:qa` script
  - Files: `packages/db/scripts/seed-qa-accounts.ts` (new), `packages/db/package.json` (edit)
  - Commit: `8a9d8a2`
  - Notes: Smoke-tested locally — purge (0 rows on clean DB), seed (4 user + 4 account rows, hashed password, email_verified=true), re-seed (idempotent), purge (4 rows + cascade). Account natural-key uniqueness sidestep using deterministic account.id worked first try.
