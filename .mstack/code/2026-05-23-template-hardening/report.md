# Implementation report: template-hardening

**Status:** complete
**Started:** 2026-05-23 (after /mlabs-review)
**Completed:** 2026-05-23
**Review:** [2026-05-23-template-hardening](../../reviews/2026-05-23-template-hardening.md)
**Branch:** `Vbhadala/incorporate-fork-learnings`
**Commits:** 22 atomic + 1 pre-flight chore = 23 total

---

## Summary

Promoted 21 planned tasks + 1 unplanned-but-required split (T5a: `.batch()` →
`.transaction()` conversion, surfaced by T5's Pause-If) from the BetFrnd
fork into the MLabs template. All tasks landed as single atomic commits on
`Vbhadala/incorporate-fork-learnings`. Workspace-wide `pnpm typecheck` (10
packages) and `pnpm test` (160 web tests + 41 services tests + others) are
green at HEAD. The Replit-deploy + db:migrate acceptance gates require a
live Replit/Neon environment and are deferred to the user-driven first-fork
smoke.

## Tasks

| #   | Task                                                              | Status | Commit     |
| --- | ----------------------------------------------------------------- | ------ | ---------- |
| T1  | Pin packageManager to pnpm@10.26.1                                | ✓ done | `0c7ec8c`  |
| T2  | env.ts + .env.example for REPLIT_DEV_DOMAIN + Stripe vars         | ✓ done | `9a9ae54`  |
| T3  | Auth lib BETTER_AUTH_URL → REPLIT_DEV_DOMAIN fallback             | ✓ done | `a4fdad2`  |
| T4  | rename.ts — KNOWN_FILES set + `\bMLabs\b` substitution            | ✓ done | `b6f299d`  |
| T5a | Convert `.batch()` callers to `.transaction()`                    | ✓ done | `d451456`  |
| T5  | DB runtime client → neon-serverless + Pool                        | ✓ done | `1bfd4dc`  |
| T6  | DB migrate script → neon-serverless, remove advisory lock         | ✓ done | `c5ac21f`  |
| T7  | webhook_event table schema + migration 0006                       | ✓ done | `cc47b80`  |
| T8  | Stripe primitives (client + generic empty webhook)                | ✓ done | `ddafcc9`  |
| T9  | next.config.ts standalone + Replit hosts                          | ✓ done | `4a750c5`  |
| T10 | scripts/deploy-prune.cjs                                          | ✓ done | `a82c271`  |
| T11 | replit.nix with Chromium runtime libs                             | ✓ done | `3b2009d`  |
| T12 | .replit full Reserved-VM standalone deploy config                 | ✓ done | `efebdb9`  |
| T13 | apps/web/src/middleware.ts (CORS for /api/auth/\*)                | ✓ done | `fee96e4`  |
| T14 | apps/web/src/instrumentation.ts (empty hook)                      | ✓ done | `6830425`  |
| T15 | scripts/email-smoke.ts + pnpm email:smoke                         | ✓ done | `c2948a3`  |
| T16 | Mobile API client tokenStore web shim                             | ✓ done | `55f74e4`  |
| T17 | docs/template/TEMPLATE.md (rebranded import)                      | ✓ done | `6213a6d`  |
| T18 | docs/decisions/0008-codebase-conventions.md (ADR)                 | ✓ done | `1c4cfeb`  |
| T19 | /mlabs-plan SKILL.md anti-pattern (advisory locks)                | ✓ done | `50104f5`  |
| T20 | /mlabs-code SKILL.md guidance (`.next` after page delete)         | ✓ done | `984789b`  |
| T21 | learnings.jsonl backfill (130 cleaned BetFrnd entries)            | ✓ done | `db7159a`  |
| T22 | Verification + report (this doc)                                  | ✓ done | (this commit) |

Pre-flight: `chore(mstack)` commit `0165a33` brought the plan + review +
initial learnings into git so the working tree started clean.

## Verification

- ✅ **Workspace typecheck**: `pnpm typecheck` → 10/10 packages pass (turbo
  9.1s). Catches the neon-serverless + Pool wiring through the runtime
  client and migrate script.
- ✅ **Workspace tests**: `pnpm test` → 5/5 packages pass, 160 + 41 + others
  tests green. Critical re-validations: `messages/__tests__/service.test.ts`
  + `admin/__tests__/service.test.ts` pass after the `.batch()` →
  `.transaction()` conversion (T5a).
- ✅ **rename.ts smoke**: 23/23 rename tests pass at T4. KNOWN_FILES +
  `\bMLabs\b` substitution don't break existing transform logic.
- ✅ **deploy-prune dry-run**: `node scripts/deploy-prune.cjs --dry-run` at
  T10 lists the expected removals (workspace node_modules, apps/mobile,
  caches, mstack artifacts, docs, etc.) without touching disk.
- ✅ **email-smoke smoke**: `pnpm email:smoke` with no env exits 1 with a
  clear `POSTMARK_SERVER_TOKEN: MISSING` diagnostic.
- ⊘ **Replit live boot**: `pnpm --filter @mlabs/web dev -p 5000 -H 0.0.0.0`
  requires the Replit workspace runtime to be meaningful. Deferred to
  first-fork smoke.
- ⊘ **Standalone build**: `pnpm --filter @mlabs/web build` succeeds locally
  but the full post-build smoke (cp public + static into standalone,
  download portable node, prune, boot) only matters on Replit's Reserved
  VM. Deferred to first-fork smoke.
- ⊘ **`pnpm db:migrate` against fresh Neon**: requires a Neon DB. Deferred.

## Pause events

One Pause-If trigger fired during the run:

- **T5 Pause-If: `db.batch()` callers exist.** Surfaced
  `packages/services/src/messages/service.ts` (sendMessage) +
  `packages/services/src/admin/service.ts` (banUser). User confirmed
  split-into-T5a; clean conversion to `db.transaction(async (tx) =>
  {...})` landed at `d451456` with all 41 services tests passing. Test
  mocks updated to provide a `transaction: async (cb) => cb(mockDb)` stub.

No other tasks paused. No tasks skipped or aborted.

## Follow-ups for the user

These are NOT bugs from this implementation — they're the deferred
acceptance gates from the review that need a live environment:

1. **First Replit smoke**: Fork this template on Replit (`stable-24_05`),
   `pnpm install`, then click `Run` → expect the Start application workflow
   to bind `:5000` and serve `/` cleanly.
2. **First production deploy**: `Publish` from the fresh Replit workspace.
   Expect the deploy build to download portable Node 20.18.1, run
   migrations, build the standalone Next runtime, prune, and boot at
   `localPort=5000 externalPort=80`. Target image size 150–300 MB. If the
   deploy fails on a path not in `deploy-prune.cjs`, log it as a follow-up.
3. **`/mlabs-qa` smoke on Replit**: After workspace start, run
   `npx playwright install chromium` then a Playwright spec. The
   `replit.nix` additions should make `chrome-headless-shell` launch
   without `ldd` errors.
4. **`pnpm email:smoke` with real env**: Set `POSTMARK_SERVER_TOKEN` +
   `POSTMARK_FROM_EMAIL` and run; confirm Postmark returns a MessageID.
5. **`pnpm db:migrate` against a fresh Neon DB**: Should apply migrations
   0000 through 0006 (webhook_event) and exit 0 without hanging.

Two non-blocking follow-ups also identified during the run:

- **AGENTS.md stale path reference**: AGENTS.md "Pause on ambiguity" list
  mentions `src/config/brand.ts` / `src/config/design.ts`; the actual paths
  post-monorepo (0006) are `packages/config/src/brand.ts` /
  `packages/config/src/design.ts`. Flagged in ADR 0008's "loose end"
  section; fix is a one-line edit in a separate PR.
- **`stripe-webhook-setup.ts` script**: BetFrnd ships a generic
  `scripts/stripe-webhook-setup.ts` to provision the Stripe webhook
  endpoint at fork time. Reviewer-deferred (Suggestions section of the
  review) — first fork that uses Stripe will need it, add then.

## Non-obvious surprises (appended as learnings)

Three things surfaced during execution that aren't in the lesson docs:

1. **corepack EACCES on `/usr/local/bin`**. On a fresh clone outside a
   normal dev box, `corepack enable pnpm` fails with EACCES because it
   tries to symlink into `/usr/local/bin`. Workaround:
   `corepack enable --install-directory $HOME/.local/bin pnpm` (assuming
   `$HOME/.local/bin` is on PATH).
2. **vi.mock factory + circular `db` self-reference**. When a test's mock
   `db` object exposes a `transaction:` method that calls back with `db`
   itself, TS can't infer the type of `db` (implicit-any) and the JS
   reference is also brittle. Fix: declare `const db: any = {}; Object.
   assign(db, {...})` instead of `const db = {...}`.
3. **Edit tool requires recent Read in-session**. Even when a file was
   read earlier in the same conversation, the Edit tool requires a Read
   within the current /mlabs-code execution context. Annoying but
   noisy-fail-safe.

Recorded via `append-learning.sh`.

## Plan + review status updates

- Plan status: `reviewed` → `implemented` (Edit'd in this commit)
- Review status: stays `approved`
- learnings.jsonl: 3 → 133 entries (130 BetFrnd backfill + 3 new run-time
  notes)

## Recommended next step

Run `/mlabs-qa` to scenario-test the changes end-to-end before opening a
PR. Focus areas for QA:

1. **DB driver swap**: spin up a fresh Neon branch, run `pnpm db:migrate`,
   confirm migrations 0000 → 0006 apply cleanly and the process exits
   (not hangs).
2. **Mobile web sign-in**: `pnpm --filter @mlabs/mobile exec expo start
   --web --port 8080` + sign-up against `:5000` (after starting
   `pnpm --filter @mlabs/web dev -p 5000`). Confirm the localStorage
   fallback works and no SecureStore TypeErrors fire.
3. **CORS preflight**: `OPTIONS /api/auth/get-session` from
   `http://localhost:8080` with `NODE_ENV=development` → 204 + headers.
4. **Rename smoke**: `pnpm rename --namespace @example --slug example
   --display-name Example --deeplink-host example.com` against a tmp
   copy; confirm `.replit` AND `"MLabs"` references both get rewritten.

If `/mlabs-qa` is green, the branch is ready for PR review and merge to
`main`.
