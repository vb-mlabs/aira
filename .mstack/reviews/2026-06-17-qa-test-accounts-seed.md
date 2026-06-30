# Review: QA test accounts — seedable to any environment

**Date:** 2026-06-17
**Slug:** qa-test-accounts-seed
**Plan reviewed:** [2026-06-17-qa-test-accounts-seed.md](../plans/2026-06-17-qa-test-accounts-seed.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** vb-mlabs

---

## Summary

Plan is tight, scope is correct for a one-time tool, and the chosen
patterns (neon-serverless Pool, `better-auth/crypto.hashPassword`,
`tsx`-as-runner) all line up with what `migrate.ts` and the existing
e2e fixtures already do. One real blocker surfaced during the codebase
read: the `account` table has **no unique constraint** on
`(account_id, provider_id)`, so the plan's `ON CONFLICT` clause would
fail at run time. PM locked the fix as deterministic `account.id` per
persona + `ON CONFLICT (id)` — no schema change needed. Two PM-level
decisions (password format, no prod safety gate) are wider open than
the MLabs default; both are explicitly accepted and documented as
shared-credential risk. Six smaller concerns resolved inline (stale
references to a `docs/qa-accounts.md` that's been dropped from scope,
dry-run skipped, password-hash empty-guard added, edge-case wording
tightened).

## Findings

### Blockers (must fix before /mlabs-code)

None remaining. The account-uniqueness fix below was locked with PM
before approval.

### Concerns (raised, decided, recorded)

- **Concern:** `account` table has no UNIQUE constraint on
  `(account_id, provider_id)` (`packages/db/src/schema/auth.ts:95-117`
  — only an `account_userId_idx` index, no exclusion constraint). The
  plan's `ON CONFLICT (account_id, provider_id) DO UPDATE` would throw
  `there is no unique or exclusion constraint matching the ON CONFLICT
  specification` at first run.
  **Decision:** Assign each persona a deterministic `account.id` from a
  parallel UUID series — `00000000-0000-4000-8000-00000000b001..b004`
  matching the user UUIDs `a001..a004`. Upsert path becomes `ON
  CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, updated_at
  = now()`. No schema change, fully idempotent.

- **Concern:** Passwords are hardcoded constants and PM picked the
  "short and memorable" option (`qa-super-2026`, `qa-admin-2026`,
  `qa-member1-2026`, `qa-member2-2026`).
  **Decision:** Accepted as a documented shared-credential model. Plan
  already flags this as the "staff break-glass" equivalent and the
  cycle suffix (`-2026`) gives a one-time rotation hint. Recommend the
  script's stdout block ends with the line `Rotate these by editing
  packages/db/scripts/seed-qa-accounts.ts and re-running.` so QA hand-
  off is unambiguous.

- **Concern:** Plan's edge-case section still references
  `docs/qa-accounts.md` in the "QA · " collision note even though that
  file is now explicitly out of scope.
  **Decision:** Reword the edge case in the implementation task — the
  mitigation is the rare-character middle dot (`·`, U+00B7) in the name
  prefix, plus the `aira-qa.test` email domain. No in-repo file needed.

- **Concern:** Plan's "Better Auth adapter unique key" open question.
  **Decision:** Resolved by the schema read. The account table has only
  a PK on `id` and an index on `userId` — no natural-key uniqueness.
  Our deterministic-id approach sidesteps the question entirely.

- **Concern:** Open question — "Should we add a check that aborts if
  `account.password` is empty after hashing?"
  **Decision:** Yes. One-line guard after `hashPassword()` returns:
  `if (!hash) throw new Error("hashPassword returned empty — abort")`.
  Cheap insurance against a broken `better-auth/crypto` in CI.

- **Concern:** Open question — `--dry-run` flag.
  **Decision:** Skip. The tool is short-lived; one less branch to
  maintain. The hostname print on the first log line is the
  sanity-check guard. Re-add the flag in a follow-up if operators
  ask.

- **Concern:** No prod safety gate (PM-locked decision).
  **Decision:** Accepted. Mitigations in place: the first log line
  prints `Connected to DB host: <hostname>` before any write. The
  script should ALSO print the same hostname **before** the purge
  branch's `DELETE` runs — extra friction is worth it on the
  destructive path.

### Suggestions (taken or deferred)

- **Suggestion (taken):** The script prints the credentials block at
  the END of the seed run only after every upsert + every verification
  log succeeds, so a partial-failure run doesn't leak credentials
  alongside an unhelpful error. Wrap the credential print in a final
  `success` branch.
- **Suggestion (taken):** When the script's first log line prints the
  resolved `DATABASE_URL` hostname, it should also print whether
  `NODE_ENV === "production"` so the operator gets a second visual
  cue. Even though the plan deliberately doesn't *gate* on this, a
  highlighted `[PRODUCTION]` tag in the log is free.
- **Suggestion (deferred):** "Welcome to QA suite" notification on each
  QA member at seed time. Cheap but the plan deliberately keeps the
  side-effects minimal. Defer unless QA asks.
- **Suggestion (deferred):** A `--list` subcommand that prints the
  fixture UUIDs + emails without writing. Trivial, but `--dry-run` was
  already skipped; consolidating to a single "no side effects" mode if
  ever needed.

## Decisions locked

Net new decisions made during review:

- **Account upsert uses deterministic `account.id` per persona.**
  Series: `00000000-0000-4000-8000-00000000b00X` for X in 1..4.
- **Passwords:**
  - `qa-super@aira-qa.test` → `qa-super-2026`
  - `qa-admin@aira-qa.test` → `qa-admin-2026`
  - `qa-member-1@aira-qa.test` → `qa-member1-2026`
  - `qa-member-2@aira-qa.test` → `qa-member2-2026`
- **`hashPassword` empty-result guard:** required.
- **`--dry-run`:** skipped in v1.
- **Hostname log line:** printed both at script start AND immediately
  before any `DELETE` in purge mode.
- **Edge-case wording fix:** drop the `docs/qa-accounts.md` reference
  in the "QA · " prefix collision note.

## Implementation plan

Ordered tasks for `/mlabs-code`. Single atomic commit covers everything
because the script and the package-json wiring are useless apart.

### Task 1: Add `seed-qa-accounts.ts` + wire the `@aira/db seed:qa` script

- **Files:**
  - `packages/db/scripts/seed-qa-accounts.ts` (new)
  - `packages/db/package.json` (edit — add `seed:qa` script)
- **What:**

  Create the script following `packages/db/scripts/migrate.ts`'s shape
  exactly: `neonConfig.webSocketConstructor = ws`, read
  `DATABASE_URL` from `process.env` with an explicit error on missing,
  open a `Pool`, wrap work in `try { ... } finally { await pool.end() }`.

  Two execution branches based on `process.argv.includes("--purge")`:

  **Seed (default):**
  1. Log:
     `Connected to DB host: <new URL(databaseUrl).hostname>${NODE_ENV === "production" ? " [PRODUCTION]" : ""}`
  2. For each of the 4 personas, run two SQL statements via
     `pool.query(text, params)` (parameterised — no string interpolation
     in SQL):
     - `INSERT INTO "user" (id, name, email, email_verified, role,
       created_at, updated_at) VALUES ($1, $2, $3, true, $4, now(),
       now()) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,
       email = EXCLUDED.email, email_verified = true, role =
       EXCLUDED.role, updated_at = now()`
     - `INSERT INTO account (id, account_id, provider_id, user_id,
       password, created_at, updated_at) VALUES ($1, $2, 'credential',
       $3, $4, now(), now()) ON CONFLICT (id) DO UPDATE SET password
       = EXCLUDED.password, updated_at = now()`
     - Password is `await hashPassword(password)`; before passing,
       guard with `if (!hash) throw new Error("hashPassword returned
       empty — abort")`.
  3. After all 4 personas succeed, print a fenced block to stdout:
     ```
     ───── QA seed credentials ─────
     qa-super@aira-qa.test    qa-super-2026     super_admin
     qa-admin@aira-qa.test    qa-admin-2026     admin
     qa-member-1@aira-qa.test qa-member1-2026   end_user
     qa-member-2@aira-qa.test qa-member2-2026   end_user
     ───────────────────────────────
     Rotate these by editing packages/db/scripts/seed-qa-accounts.ts and re-running.
     ```

  **Purge (`--purge`):**
  1. Same hostname log line as above, but with the line
     `Purging QA personas from this DB.` appended so the operator sees
     the destructive intent before the DELETE fires.
  2. Run a single `DELETE FROM "user" WHERE id = ANY($1::text[])` with
     the 4 fixed UUIDs as a parameterised array.
  3. Use `RETURNING id, email` to know exactly which rows were removed;
     log `Purged N personas: <emails>` (or `Purged 0 — nothing to do.`
     if already clean).

  Add to `packages/db/package.json` scripts:
  `"seed:qa": "tsx scripts/seed-qa-accounts.ts"`. Args (including
  `--purge`) reach the script via `pnpm --filter @aira/db seed:qa --
  --purge`.

- **Acceptance:**
  - On a clean DB: `pnpm --filter @aira/db seed:qa` exits 0, creates 4
    user rows and 4 account rows, prints the credential block.
  - Re-run on the same DB: exits 0, prints the credential block, no
    duplicate-row errors, only `updated_at` (and password if changed in
    source) move.
  - `pnpm --filter @aira/db seed:qa -- --purge` on a seeded DB: exits 0,
    DELETE returns 4 rows, account/session/notification rows cascade-
    gone.
  - `pnpm --filter @aira/db seed:qa -- --purge` on a clean DB: exits 0,
    "Purged 0 — nothing to do."
  - Sign-in via the web login form works for every persona using the
    documented passwords; super_admin can open
    `/admin/businesses/[id]`, plain admin cannot (404), end_users land
    on `/home`.
  - `pnpm typecheck` and `pnpm lint` pass.
  - First log line is the hostname line. On the `--purge` branch the
    hostname line appears BEFORE the DELETE.
- **Pause if:**
  - The `hashPassword` import path differs from
    `import { hashPassword } from "better-auth/crypto"`. (Confirm
    against `apps/web/e2e/global-setup.ts:31` — the existing user.)
  - `tsx` invocation fails because of a module-resolution change since
    `migrate.ts` was last touched. (If so, mirror whatever pattern
    `migrate.ts` uses today.)
  - The plain `admin` persona somehow gets through to
    `/admin/businesses/[id]` (would imply the pre-existing
    super_admin-only constraint on `listCitiesAdminOp` has changed; not
    this task's job to fix — pause and report.)

## Open questions

For `/mlabs-code` to escalate rather than guess.

- If `process.env.NODE_ENV` is undefined (running from a vanilla shell),
  should the `[PRODUCTION]` tag still show? Default: no tag. Production
  deploys set `NODE_ENV=production`.
- If the script is run twice in quick succession (operator double-
  clicks), is the second run guaranteed to succeed without race?
  Postgres `ON CONFLICT` is atomic; should be safe, but flag if you
  hit any anomalous behaviour during manual testing.
