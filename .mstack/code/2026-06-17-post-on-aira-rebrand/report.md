# Implementation report: Post on AIRA — broaden Community Board

**Status:** complete
**Review:** [2026-06-17-post-on-aira-rebrand](../../reviews/2026-06-17-post-on-aira-rebrand.md)
**Branch:** feat/post-on-aira
**Commits:** 11

---

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 0 | Repair pre-existing 0026/0027 snapshot chain collision | ✓ done | `6c8c6c4` |
| 1 | DB schema + migration for community_post phone/email | ✓ done | `7aaa6bb` |
| 2 | Validators — add phone/email to community schemas | ✓ done | `47feeee` |
| 3 | Service — thread phone/email; rename "request" → "post" | ✓ done | `1492ebe` |
| 4 | Audit meta + editPost — phone/email editing + audit coverage | ✓ done | `f91e761` |
| 5 | Public post-form — rebrand + contact fields | ✓ done | `5370192` |
| 6 | Public post-card + post-detail-modal — contact affordances | ✓ done | `9999c82` |
| 7 | Public board page + standalone detail page — copy | ✓ done | `a9abb3a` |
| 8 | InterestButton + notification-item — "interested" rename | ✓ done | `33b6fad` |
| 9 | Admin community surfaces — edit modal + detail modal + table | ✓ done | `4d931aa` |
| 10 | Verification pass + brand-string-literal fix + final sweep | ✓ done | `e0e1be0` |

## Verification

- `pnpm typecheck` — 10/10 packages green.
- `pnpm test` — 21 web test files (178 tests) + 8 services test files
  (63 tests) all pass.
- `grep "Ask the community" apps/web/src/` → 0 matches.
- `grep "I can help" apps/web/src/` → 0 matches.
- `pnpm db:migrate` — `0028_gray_sasquatch.sql` applied; `community_post`
  has nullable `phone` + `email` columns.
- Lefthook pre-commit ran on every commit; the contrast check passed for
  all 11 commits.

## Lint status

Pre-existing errors only (none introduced by this rebrand):
- 4 × `react-hooks/set-state-in-effect` (post-detail-modal, sponsorships,
  cron/route) — predate this run by commits `f368cf5` / older.
- 4 × `no-restricted-syntax` `process.env` in `instrumentation.ts` —
  predate this run.

The brand-string-literal lint regression I briefly introduced in Tasks
5 and 7 was caught by Task 10's verification and fixed in `e0e1be0`
via `brand.name` imports from `@aira/config`.

## Surprises during the run

1. **Pre-existing snapshot chain corruption.** `pnpm db:generate` failed
   immediately because `meta/0025_snapshot.json` and
   `meta/0026_snapshot.json` shared a UUID. Paused on Task 1, asked the
   user, repaired the chain in a dedicated `fix(db):` commit (Task 0)
   before producing the migration. Continuation of the partial fix at
   `4c63f22`.
2. **Migration name is auto-generated.** Drizzle picked
   `0028_gray_sasquatch` as the file suffix. The plan suggested
   `0028_community_post_contact.sql`, but renaming would require touching
   the journal AND the snapshot tag, so the auto name stays. Filename
   is cosmetic; the SQL content is correct.
3. **Email subject already neutral.** The `/mlabs-review` step
   anticipated this: `apps/web/src/server/operations/community.ts:99`
   reads "Someone responded to your post" — no email-template edit
   needed.
4. **Brand-string lint rule** catches every literal "AIRA". The Task 5/7
   commits flagged this on the verification pass; fix is `brand.name`
   from `@aira/config`. The plan should have flagged this up-front; will
   surface as a learning so future rebrand-style tasks know to design
   labels around `brand.name` from the start.

## Follow-ups

- **Pre-existing lint debt** (4 setState-in-effect + 4 process.env)
  could be a separate `chore(lint)` PR. Out of scope here.
- **Mobile parity:** when the mobile community surface ships, it
  inherits the new shape automatically — phone/email come through the
  shared validators as `string | null` (nullable, so unmounted UI
  remains compatible).
- **Migration filename:** the gray_sasquatch name is harmless but if a
  future migration cleanup wants to rename, the journal + snapshot tag
  must move together.

## Recommended next step

Run `/mlabs-qa` with focus on:
- Public board: post creation with all 4 fields (title + body + phone +
  email), then with title only, then with an invalid email.
- Contact pill on the card renders only when one or both fields are
  populated.
- Detail modal `tel:`/`mailto:` links open the correct app.
- "I'm interested" / "Interested" toggle + notification fire end-to-end.
- Admin edit modal can flip phone-only and email-only, audit row in
  `audit_log` captures `fields: ["phone"]` etc with before/after pairs.
- 1-active-post limit still triggers the 409 on a second submit.
