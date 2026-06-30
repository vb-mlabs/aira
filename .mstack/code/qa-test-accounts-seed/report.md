# Implementation Report — QA test accounts seed

**Status:** complete
**Branch:** `feat/qa-test-accounts-seed` (off `feat/business-owner-reachability`)
**Plan:** [.mstack/plans/2026-06-17-qa-test-accounts-seed.md](../../plans/2026-06-17-qa-test-accounts-seed.md)
**Review:** [.mstack/reviews/2026-06-17-qa-test-accounts-seed.md](../../reviews/2026-06-17-qa-test-accounts-seed.md)
**Commits:** 2 (1 docs + 1 feature)

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| docs | Plan + review docs | ✓ | `9b5994d` |
| T1 | Seed script + `@aira/db seed:qa` wiring | ✓ | `8a9d8a2` |

Zero paused, zero skipped.

## Commits

```
8a9d8a2 feat(db): one-time QA accounts seed script
9b5994d docs(mstack): plan + review for QA test accounts seed
```

## Verification

- `pnpm typecheck` — **green** across all 10 packages
- All lefthook pre-commit hooks (check-migrations, check-contrast,
  check-no-server-actions, check-mobile-tailwind) passed on both
  commits. No `--no-verify`.
- **End-to-end smoke test against the local DB:**
  1. `pnpm --filter @aira/db seed:qa -- --purge` on a clean DB →
     `Purged 0 — nothing to do.` ✓
  2. `pnpm --filter @aira/db seed:qa` → 4 user rows + 4 account rows
     created with deterministic UUIDs (`a001..a004` for user.id,
     `b001..b004` for account.id), `email_verified = true`, password
     hashed, credential block printed to stdout. ✓
  3. Re-run seed → idempotent; only `updated_at` and the password
     rewrite (both expected). Credential block printed again. ✓
  4. `pnpm --filter @aira/db seed:qa -- --purge` →
     `Purged 4 personas: qa-super@..., qa-admin@..., qa-member-1@...,
     qa-member-2@...`; user count = 0 after. ✓
- `Connected to DB host: <hostname>` is the first line on every
  invocation. `Purging QA personas from this DB.` precedes the DELETE
  on the purge branch.

## Hand-off notes for QA

When the operator runs the seed against a non-local environment:

1. Verify `DATABASE_URL` is the intended target (run `echo $DATABASE_URL` first).
2. `pnpm --filter @aira/db seed:qa` — the first log line confirms the host;
   if it doesn't match the expected hostname, abort with `Ctrl+C` before
   anything is written.
3. The printed credential block is the only source-of-truth — forward to
   the QA team via the appropriate channel (Slack DM, 1Password share, etc.).
   No in-repo docs file.
4. When the cycle ends:
   `pnpm --filter @aira/db seed:qa -- --purge`. Same hostname guard applies.

## Plan deviations

None substantive. The implementation follows the review's task spec
verbatim, including:

- Deterministic `account.id` per persona to sidestep the missing
  `(account_id, provider_id)` UNIQUE constraint
- `hashPassword` empty-result guard before any INSERT
- Hostname line printed at script start AND before any DELETE
- Credential block printed only after every upsert succeeds (no
  leaked credentials on partial-failure runs)
- `[PRODUCTION]` tag appended to the hostname line when
  `NODE_ENV === "production"`

## Follow-ups (out of scope by design)

- A prod safety gate (env var / `--allow-prod` flag / TTY confirm) —
  PM opted out; operator carries the risk.
- A repo-committed credential reference — credentials are printed at
  seed time; operator forwards out-of-band.
- Auto-expiry of QA accounts — manual purge is the lifecycle.
- Service-level tests of the script — idempotency is verified by
  re-running, not by a unit test.

## Recommended next step

Run `/mlabs-qa --focus qa-test-accounts-seed` to drive Playwright
through:

1. Sign-in as each of the 4 QA personas (admin/super_admin → /admin;
   end_user → /home).
2. `qa-super@aira-qa.test` opens `/admin/businesses/[id]` (the route
   that requires super_admin).
3. `qa-admin@aira-qa.test` opens `/admin/users` and the audit log but
   is rejected with 404 from any super_admin-only route.
4. End-users see the same surfaces as a fresh signup (community posts,
   directory browse, profile).

Alternatively, **skip the QA step** and let the human QA team verify
in real environments using the printed credentials — that's the whole
point of the tool, after all.
