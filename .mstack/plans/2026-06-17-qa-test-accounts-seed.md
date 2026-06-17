# Plan: QA test accounts — seedable to any environment

**Date:** 2026-06-17
**Slug:** qa-test-accounts-seed
**Status:** reviewed
**Author:** vb-mlabs

---

## Problem

The QA team can't currently log in to a deployed environment (staging or
prod) without one of the following:

- An existing real user account (creates noise, and isn't repeatable).
- A one-shot signup flow that still requires an inbox to receive the
  verification link (can't be done from a shared keyboard or a
  passwordless QA workflow).
- The Playwright `globalSetup.ts` machinery, which is gated behind a
  workstation-only psql connection and isn't safe to point at prod.

The `INITIAL_ADMIN_EMAIL` bootstrap (Better Auth `user.create.after`)
fires once on the first matching signup and promotes a single user to
`admin` (not `super_admin`). It can't produce the four-persona suite QA
actually needs.

**Who benefits:** the QA team (can finally drive prod and staging from
the UI with shared, deterministic credentials); the platform (we get
QA coverage on production without manual seeding rituals).

**Success looks like:** a single `pnpm --filter @aira/db seed:qa` command
idempotently upserts a known set of QA personas into any environment, prints
the credentials to stdout for the operator to share with QA, and a matching
`--purge` flag removes them in one shot when the QA cycle ends.

**Lifetime:** this is a **one-time / cycle-scoped tool**. The script lives
in the repo but is invoked manually a handful of times (once per QA cycle
per environment). When the cycle ends, the operator runs the purge — or
just `DELETE FROM "user" WHERE id IN (...)` directly — and the rows are
gone. No CI integration, no scheduled job, no admin UI surface.

## Scope

**In:**
- A new Node script at `packages/db/scripts/seed-qa-accounts.ts` that
  upserts 4 QA personas via the existing `neon-serverless` Pool pattern
  (same shape as `migrate.ts`)
- Personas (locked):
  - **QA · Super Admin** — `qa-super@aira-qa.test`, role `super_admin`,
    UUID `00000000-0000-4000-8000-00000000a001`
  - **QA · Admin** — `qa-admin@aira-qa.test`, role `admin`, UUID
    `00000000-0000-4000-8000-00000000a002`
  - **QA · Member One** — `qa-member-1@aira-qa.test`, role `end_user`,
    UUID `00000000-0000-4000-8000-00000000a003`
  - **QA · Member Two** — `qa-member-2@aira-qa.test`, role `end_user`,
    UUID `00000000-0000-4000-8000-00000000a004`
- All four have `email_verified = true` so they skip the verify-email
  flow on first login.
- Passwords are **hardcoded constants** in the seed script (decision
  locked with PM — see Risks below).
- A `--purge` flag on the same script that `DELETE`s the fixed UUID
  set; user → cascade wipes `account`, `session`, `notifications`, and
  any author rows that have ON DELETE CASCADE. FKs with `ON DELETE SET
  NULL` (e.g. `businesses.owner_user_id`, audit `actor_id`) are
  tolerated — the rows survive with NULL references.
- The seed run **prints the four sets of credentials to stdout** in a
  clearly-fenced block ("share with QA, then close this terminal").
  This is the operator's source-of-truth for what to forward; no
  in-repo docs file.
- One new package.json script in `@aira/db` only: `seed:qa` that runs
  the script via `tsx`. The `--purge` flag is passed through. No root-
  level passthrough, no `db:seed:qa` shortcut on the root package.json
  — keeping invocation explicit reinforces "this is a tool, not a
  workflow step."

**Out (deferred):**
- A prod safety gate (env var, --allow-prod flag, TTY confirmation) —
  PM explicitly opted out; operator carries the risk of pointing the
  script at the wrong DATABASE_URL.
- An in-repo `docs/qa-accounts.md` — credentials are printed at seed
  time; operator forwards them to QA via whatever channel is
  appropriate (Slack DM, 1Password share, email). Reduces git
  footprint and the "where do the docs live?" question.
- A root-level `pnpm db:seed:qa` shortcut. Stay with `pnpm --filter
  @aira/db seed:qa` so the invocation is explicit and matches the tool's
  one-shot nature.
- An automated test of the script. Idempotency is verified by re-running
  during the QA cycle, not by a vitest.
- Auto-expiry of QA accounts (no `banned_at` cron, no expires_at
  column). When QA cycles end, run the purge — or raw SQL DELETE — and
  the rows are gone.
- Bundling QA business/owner-link fixtures with the account seed —
  separate concern; QA creates fixtures via the admin UI.
- A "QA badge" anywhere in the UI — the `"QA · "` name prefix is the
  identifier; no badge component.
- Per-developer ephemeral accounts (already covered by Playwright
  globalSetup).
- An admin-UI for managing QA accounts.
- Audit-log rows recording the seed action itself. The script is
  short-lived tooling; one less row to explain on the audit page.

## Approach

Follow `packages/db/scripts/migrate.ts` line-for-line as the shape
reference. Boot a `neon-serverless` Pool against `DATABASE_URL`, run an
upsert against `user` + `account` for each persona in a single
transaction, then `pool.end()`. No advisory locks (same reasoning as
migrate.ts — Reserved VM + single-owner DB).

Password hashing reuses `better-auth/crypto`'s `hashPassword` — the exact
helper the existing `e2e/global-setup.ts` already uses. No new dep, no
new pattern.

The upsert path:

```ts
INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
VALUES (...)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      email = EXCLUDED.email,
      email_verified = EXCLUDED.email_verified,
      role = EXCLUDED.role,
      updated_at = now();

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES (...)
ON CONFLICT (account_id, provider_id) DO UPDATE
  SET password = EXCLUDED.password,
      updated_at = now();
```

The UNIQUE constraint on (`account_id`, `provider_id`) is present in
the Better Auth schema (account row uniqueness is (provider, providerAccountId)
in the official BA schema; in this repo's adapter it's a unique on
`account_id` — confirm in review). Worst case, the purge mode runs first
and the upsert simplifies to plain INSERT.

The `--purge` flag (or a second script entry) runs:

```ts
DELETE FROM "user" WHERE id IN ('uuid1', 'uuid2', 'uuid3', 'uuid4');
```

Cascade does the rest. Audit + business FK behavior follows the
`ON DELETE SET NULL` rules already in the schema.

The script DOES NOT touch Better Auth's `user.create.after` hook flow —
direct drizzle writes bypass `databaseHooks` (those fire only when
signups go through Better Auth's API). So `admin-bootstrap` won't
re-promote our QA admin, and `super-admin-bootstrap` won't fight us.

**Alternatives considered:**

- **Drizzle Seed library / SQL seed file** — rejected: introduces a new
  dep + new pattern just for 4 rows. The codebase already uses
  hand-written scripts in `packages/db/scripts/` for one-shot
  operations (`migrate.ts`, `recent-errors.ts`); a third one fits.
- **Better Auth `user.create.after` hook to bulk-promote a list of
  emails** — rejected: only fires on signup; can't pre-create a user
  with `email_verified = true` without the matching account row, which
  the hook doesn't manage.
- **CSV/JSON input file + generic seeder** — rejected: the personas are
  small + fixed; over-engineering. If we ever need 50+ QA accounts,
  refactor then.
- **Admin UI for QA-account management** — rejected: explicit PM
  out-of-scope. CLI is fine; admins can already ban / unban / change
  role of the seeded users through the existing `/admin/users/[id]`
  detail page if they need fine-grained control.
- **`.test` domain alternatives (`example.com`, `airabynisarga.com`
  subdomain)** — rejected: `.test` is RFC 2606 reserved and can't
  resolve in DNS, so any accidental outbound email to these addresses
  will fail loudly at the SMTP layer rather than silently delivering.

## Data model changes

**None.** All four columns this seed touches (`user.email_verified`,
`user.role`, `account.password`, etc.) already exist. No migration, no
new index, no new enum value.

## Files to touch

**New:**

- `packages/db/scripts/seed-qa-accounts.ts` — the seed/purge script. One
  file, ~150 lines. `--purge` flag toggles modes. Prints credentials
  to stdout at the end of a seed run; prints "purged N personas" at
  the end of a purge run.

**Edit:**

- `packages/db/package.json` — add one `seed:qa` script that invokes
  `tsx scripts/seed-qa-accounts.ts` and forwards CLI args (so the
  `--purge` mode is reachable via `pnpm --filter @aira/db seed:qa --
  --purge`).

**Not touched** (deliberately):
- Root `package.json` — no shortcut. Explicit `--filter @aira/db`
  invocation reinforces the tool's one-shot nature.
- `.env.example` — no env vars added (passwords hardcoded).
- `docs/` — no committed credential reference.

## Edge cases

- **Re-running the seed against a DB where one of the fixed UUIDs is
  already in use by a real user.** Almost impossible (the UUID prefix
  `00000000-0000-4000-8000-00000000a00X` won't be generated by
  `crypto.randomUUID()`), but the ON CONFLICT path would overwrite the
  real user. Mitigation: the script logs the email of every row it
  touched; if anything other than `qa-*@aira-qa.test` comes out, the
  operator sees it immediately. Belt-and-braces: the upsert's
  email column is included in EXCLUDED, so re-running rewrites the email
  back to the QA-test value if a collision ever happened.

- **Purge runs against a DB where a QA member has been linked as
  business owner.** `businesses.owner_user_id` is ON DELETE SET NULL —
  the business survives the purge with a NULL FK. The admin sees "No
  owner linked yet" on next page load. The purge logs which businesses
  lost their owner so QA can re-assign if they want.

- **`account` table's unique constraint.** This repo's Better Auth
  adapter uses (provider_id, account_id) as the natural key — confirm
  in review that ON CONFLICT (account_id, provider_id) hits the right
  index. If not, the upsert path needs to be DELETE-then-INSERT inside
  the same transaction (still idempotent, slightly more code).

- **The "QA · " name prefix collides with a real user named "QA …"**.
  Extremely unlikely; the prefix has a middle dot (`·`, U+00B7) that's
  vanishingly rare in genuine names. Documented in `docs/qa-accounts.md`
  so anyone naming things "QA" in the future knows to pick a different
  prefix.

- **Better Auth session_max_age.** Seeded users have email_verified =
  true but no active session. They sign in via the normal login form;
  the session row is created by Better Auth at that point. No special
  handling needed.

- **No audit_log entry on seed/purge.** Locked decision (out-of-scope).
  This is a tool, not a feature; the rows do their own self-identifying
  via the `"QA · "` name prefix and the `aira-qa.test` email domain,
  which is sufficient for forensic traceability without polluting the
  audit page.

- **Concurrent seed runs.** Per `migrate.ts`'s notes, the Reserved VM
  topology serializes deploys/scripts per app. The seed is short
  enough (~4 INSERTs) that a race is academic, but Postgres'
  ON CONFLICT handles it correctly anyway.

- **Operator forgets to purge.** Accepted — the rows linger with their
  `"QA · "` name prefix, easily spotted on `/admin/users`. Any future
  cleanup is one purge command or one SQL DELETE away.

## Acceptance criteria

- [ ] `pnpm --filter @aira/db seed:qa` against a clean local DB creates
      four user rows and four account rows; each user has
      `email_verified = true` and the expected role.
- [ ] The seed run prints a clearly-fenced block to stdout listing the
      four sets of credentials (email, password, role) ready to copy
      into a QA hand-off note.
- [ ] Re-running the seed is a no-op for everything except `updated_at`
      (and the password, if changed in the script). No errors.
- [ ] Each QA user can sign in via the login form using the printed
      credentials and lands on `/home` (or `/admin` for the two admin
      roles).
- [ ] `qa-super@aira-qa.test` can open `/admin/businesses/[id]` (which
      requires `super_admin` per the QA-run finding from 2026-06-17).
- [ ] `qa-admin@aira-qa.test` can open `/admin/users` and the audit log
      but is rejected with 404 from any `super_admin`-only routes.
- [ ] `qa-member-1` and `qa-member-2` see the same end_user surfaces as
      a fresh signup (community posts, directory browse, profile).
- [ ] `pnpm --filter @aira/db seed:qa -- --purge` removes all four
      users; the cascade wipes sessions, accounts, and any
      notifications. `audit_log` rows remain with `actor_id = NULL`
      (ON DELETE SET NULL); a business previously linked to a QA
      member is unaffected except its `owner_user_id` becomes NULL.
- [ ] Running the purge against a DB with no QA users present is a
      no-op success (zero rows deleted, exit code 0).
- [ ] First log line on every invocation prints the resolved
      `DATABASE_URL` hostname so the operator can sanity-check before
      changes commit.
- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] `psql` is NOT a dependency of the script — it uses
      `@neondatabase/serverless` Pool, same as `migrate.ts`, so it
      works against any DATABASE_URL Neon-or-otherwise.

## Risks (PM-acknowledged)

These are recorded explicitly because the locked decisions widen them
beyond the MLabs default posture. Anyone reading the plan should be
able to see them at a glance.

- **Hardcoded passwords in git history.** Anyone with repo read access
  can sign in to any environment as super_admin. Mitigation: pick
  passwords long enough that they're not trivially guessable on prod,
  document the rotation runbook (edit the script + re-run seed), and
  rely on the purge script for emergency revocation. The
  `qa-super@aira-qa.test` super_admin account on prod is functionally
  equivalent to a shared admin credential — treat it like the staff
  break-glass password.
- **No prod-safety gate.** The script runs against whatever
  `DATABASE_URL` points at. Pointing at prod by accident creates four
  rows; pointing the purge at prod by accident deletes them. Neither
  is catastrophic (the rows are isolated to the fixed UUIDs), but a
  developer running the seed from a laptop with `DATABASE_URL` left
  pointing at prod from an earlier `db:studio` session is a real
  failure mode. Mitigation: the script's first log line MUST print the
  resolved DATABASE_URL hostname before doing anything else, and the
  documentation must lead with "verify the hostname before pressing
  enter."
- **`.test` TLD addresses look weird in screenshots.** The QA team is
  fine with this; if marketing ever wants to demo a QA-account screen
  recording, they need to know to redact the email.

## Open questions

For `/mlabs-review` to resolve before implementation.

- Exact passwords (length, character classes, whether prefixed with
  cycle identifier so a single rotation cleans up everything for that
  cycle). Reviewer should propose a generation rule rather than
  rubber-stamping the first thing typed.
- Does this repo's Better Auth adapter use `(account_id, provider_id)`
  as the natural key on `account`, or a different combination? The
  upsert needs the right ON CONFLICT target.
- Should we add a check that aborts if `account.password` is empty
  after hashing (defense against a broken hash function in CI)?
- Should the script also accept `--dry-run` so the operator can
  preview against prod without writing? Cheap; reviewer's call on
  whether it's worth the extra path.
