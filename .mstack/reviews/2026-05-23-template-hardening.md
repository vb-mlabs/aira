# Review: Template hardening from BetFrnd fork learnings

**Date:** 2026-05-23
**Slug:** 2026-05-23-template-hardening
**Plan reviewed:** [2026-05-23-template-hardening.md](../plans/2026-05-23-template-hardening.md)
**Status:** approved
**Reviewer:** Claude (with Vbhadala)

---

## Summary

Plan is approved with **one added task (T15a — auth lib baseUrl fallback)**,
**one reversed decision (Stripe API version: no longer pin)**, and **four
tactical decisions locked** that the plan left open. Net change: 21 → 22
atomic tasks, all executable in one `/mlabs-code` session, one PR to `main`.
The plan's analysis was solid; the review's additions came from reading the
actual `hat-yai` code against BetFrnd's actual code (vs trusting TEMPLATE.md's
narrative). Two non-obvious findings recorded as learnings.

## Findings

### Blockers (must fix before /mlabs-code)

- **Missing task: auth lib `baseUrl` fallback.** `apps/web/src/lib/auth/index.ts`
  in BetFrnd reads `baseUrl: env.BETTER_AUTH_URL ?? (env.REPLIT_DEV_DOMAIN ?
  \`https://${env.REPLIT_DEV_DOMAIN}\` : undefined)`. hat-yai has no
  REPLIT_DEV_DOMAIN reference anywhere in `apps/web/src/lib/auth/`. Without
  this, T8's CORS middleware is a no-op — BetterAuth would still issue cookies
  under `localhost:3000`, the dev preview at `*.replit.dev` would reject them,
  and the entire CORS layer's value is lost. **Resolution:** add T15a between
  T15 and T11 (user direction).

### Concerns (raised, decided, recorded)

- **Concern A:** TEMPLATE.md and learnings.jsonl describe the BetterAuth
  cookie-domain problem extensively (lessons #20, #28, learnings 20, 64, 65,
  121) but never explicitly name `auth/index.ts:40` as the load-bearing line.
  Future template ports must read the cited code path, not just the lesson
  prose.
  **Decision:** add T15a (above). Log as learning so future reviewers grep the
  *referenced files* before trusting lesson text.

- **Concern B:** Decision #5 (pin Stripe API version) contradicts BetFrnd's
  shipped `stripe-client.ts`, which deliberately omits `apiVersion` with the
  comment "SDK uses its packaged default (which Stripe maintains backward-
  compat against within a wire version)".
  **Decision:** REVERSE Decision #5. T13 ships `stripe-client.ts` without an
  `apiVersion` field, matching BetFrnd. The Stripe Node SDK pins its target
  wire version internally; pinning here is double-work that goes stale faster.

- **Concern C:** T13 adds `stripe@22.x` as a top-level dep to
  `packages/services/package.json`. AGENTS.md hard rule: pause on new
  top-level deps.
  **Decision:** APPROVED. Stripe is the planned primitive; not a surprise.
  Note in ADR 0008 that forks not using Stripe should remove it.

- **Concern D:** Plan's T15 updates `apps/web/src/config/env.ts` but never
  mentions `.env.example`. Adding env keys without documenting them in
  `.env.example` leaves the next fork's developer guessing.
  **Decision:** roll `.env.example` updates into T15. Add three new blocks
  (REPLIT_DEV_DOMAIN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) matching the
  existing comment style.

- **Concern E:** BetFrnd's `deploy-prune.cjs` deletes `tooling/`. hat-yai's
  `tooling/` contains tsconfig/eslint-config/prettier-config/tailwind-config
  shared workspace configs. These are build-time only — `next build` inlines
  the resolved tsconfig and Tailwind is compiled into `.next/static/`. But if
  ANY runtime code import-traces back into `tooling/` (e.g. a config helper
  that gets bundled), the prune deletes a needed file.
  **Decision:** /mlabs-code adds a post-prune smoke step (T5's acceptance):
  run `node apps/web/.next/standalone/apps/web/server.js` locally with a fake
  PORT, hit `/` once, confirm 200. If it fails, narrow the prune list.

- **Concern F:** Plan's T12 (mobile SecureStore shim) says "Replace
  `apps/mobile/lib/api/client.ts`". The actual file has **five** direct
  SecureStore call sites, not four:
  - `getAccessToken` (line 49)
  - `getRefreshToken` (line 53)
  - `setTokens` (line 57)
  - `clearTokens` (line 65)
  - `performRefresh` inline at line 98 (easy to miss)
  **Decision:** T12 acceptance updated below to enumerate all five sites
  explicitly.

- **Concern G:** BetFrnd's `packages/services/src/billing/webhook.ts` is
  deeply tangled with BetFrnd domain (`creditTopUp`, `attemptTransfer`,
  `SIGNAL_PURCHASE_METADATA_KIND`, `signal_purchase`, `payment_transaction`,
  `signal`). Cannot port verbatim.
  **Decision:** T13 builds a NEW generic `webhook.ts` from scratch using
  BetFrnd's only as a structural reference. Generic version: signature
  verification + `webhook_event.id` idempotency UNIQUE + empty switch with a
  default-case logger + JSDoc explaining how forks extend by adding cases.
  Zero domain imports.

- **Concern H:** ADR 0008 naming — original plan said
  `0008-betfrnd-conventions.md`. Existing 0006/0007 use brevity
  ("monorepo", "service-layer").
  **Decision:** rename to `docs/decisions/0008-codebase-conventions.md` (user
  direction).

### Suggestions (taken or deferred)

- **Taken:** T7's `.replit` rewrite must respect the rename script. Sequence
  is T11 (rename.ts adds `KNOWN_FILES`) before T7 (.replit rewrite with
  `@<scope>` placeholders). Captured in commit order below.

- **Taken:** T17 (ADR 0008) lists conventions, but also flags that AGENTS.md's
  Pause-If list mentions `src/config/brand.ts` while the actual file lives at
  `packages/config/src/brand.ts`. T17 adds a one-liner correction note to ADR
  0008.

- **Taken:** T20 (TEMPLATE.md import) — rebrand mechanical replace
  `@betfrnd/*` → `@<scope>/*` and `betfrnd` → `<scope>` in code-path strings;
  leave the literal word "BetFrnd" intact in historical narrative paragraphs
  (it's history, not template content).

- **Deferred:** generalizing `deploy-prune.cjs` to read `pnpm-workspace.yaml`.
  Hardcoded `apps/mobile` is fine for now (BetFrnd shipped that way for 10
  days of deploys without issue). Revisit when a fork adds `apps/web2` or
  similar.

- **Deferred:** `scripts/stripe-webhook-setup.ts` port. BetFrnd's version is
  generic, but adding it now without an actual webhook handler that needs
  provisioning is premature. The first fork that uses Stripe will need it;
  add then.

## Decisions locked

Net new decisions made during review (beyond the plan's resolved-decisions
section):

1. **Add T15a** between T15 (env adds) and T11 (rename) — patch
   `apps/web/src/lib/auth/index.ts` with the BETTER_AUTH_URL → REPLIT_DEV_DOMAIN
   fallback. Independent commit (does not depend on T11 or T8).
2. **Reverse plan-decision #5 — DON'T pin Stripe API version.** T13's
   `stripe-client.ts` omits `apiVersion`, matching BetFrnd's shipped pattern
   and Stripe SDK guidance.
3. **`stripe@22.x` as new top-level dep is APPROVED.** Add to
   `packages/services/package.json` as part of T13.
4. **ADR filename:** `docs/decisions/0008-codebase-conventions.md`.
5. **`.env.example` updates roll into T15.** No separate task.
6. **T13's `webhook.ts` is a NEW empty handler**, not a port. BetFrnd's
   version is too domain-tangled.
7. **`webhook_event` schema goes into a new file**
   `packages/db/src/schema/webhook_event.ts`, matching the existing
   per-table file pattern (`audit_log.ts`, `error_log.ts`, etc.) +
   re-export from `packages/db/src/schema/index.ts`.
8. **Stripe primitives directory:** `packages/services/src/billing/`
   (matches BetFrnd; no naming churn).
9. **README port-3000 reference stays at :3000** for local dev clarity.
   Adding one note under "Quick start" that Replit binds :5000.
10. **deploy-prune smoke step** added to T5's acceptance (Concern E).

## Implementation plan

22 atomic tasks. `/mlabs-code` executes top-to-bottom, one commit per task,
no `--no-verify`, never amend across tasks (AGENTS.md hard rules).

### Task 1: Pin `packageManager` to `pnpm@10.26.1`

- **Files:** `package.json` (edit)
- **What:** Change `"packageManager": "pnpm@10.32.1"` → `"packageManager":
  "pnpm@10.26.1"`. Matches Replit Nix `stable-24_05` shipped pnpm version
  (TEMPLATE.md #1).
- **Acceptance:** `package.json` line shows `pnpm@10.26.1`. `pnpm install`
  completes without "Cannot find module" or self-update loops.

### Task 2: Update env validator + .env.example for Replit/Stripe vars

- **Files:** `apps/web/src/config/env.ts` (edit) · `.env.example` (edit)
- **What:** Add three new `.optional()` server env vars to `env.ts`:
  `REPLIT_DEV_DOMAIN` (string), `STRIPE_SECRET_KEY` (string),
  `STRIPE_WEBHOOK_SECRET` (string). Add corresponding `runtimeEnv` mappings.
  Add matching three sections to `.env.example` with the same comment style
  as existing blocks (what for / where to obtain / what breaks if missing).
- **Acceptance:** `pnpm typecheck` clean. `env.ts` exports the three new keys
  as `string | undefined`. `.env.example` documents all three with comments.

### Task 3: Patch auth lib with BETTER_AUTH_URL → REPLIT_DEV_DOMAIN fallback

- **Files:** `apps/web/src/lib/auth/index.ts` (edit) — possibly `server.ts`
  too if `baseUrl` is set there in this template
- **What:** Where `baseUrl` is currently set from `env.BETTER_AUTH_URL`,
  change to `env.BETTER_AUTH_URL ?? (env.REPLIT_DEV_DOMAIN ?
  \`https://${env.REPLIT_DEV_DOMAIN}\` : undefined)`. Mirror BetFrnd's
  precedent (auth/index.ts:40 there).
- **Acceptance:** `pnpm typecheck` clean. With `BETTER_AUTH_URL` unset and
  `REPLIT_DEV_DOMAIN=foo.replit.dev`, auth config resolves
  `baseUrl='https://foo.replit.dev'`.
- **Pause if:** auth/index.ts already does something more sophisticated than
  reading `BETTER_AUTH_URL` directly — don't overwrite uncovered logic.

### Task 4: Patch rename.ts — `KNOWN_FILES` set + `\bMLabs\b` substitution

- **Files:** `scripts/rename.ts` (edit)
- **What:** Add a `KNOWN_FILES = new Set([".replit", ".gitignore",
  ".tool-versions", "Dockerfile"])` constant. In `shouldRewrite()`, before
  the `if (ext === "") return false` check, add `if
  (KNOWN_FILES.has(path.basename(absPath))) return true`. In `transform()`,
  alongside the existing `out = out.replace(/\bMuscat\b/g, cfg.displayName)`
  line, add `out = out.replace(/\bMLabs\b/g, cfg.displayName)`. (TEMPLATE.md
  #13, #14.)
- **Acceptance:** Manual smoke: create a tmp file `.replit` with
  `@mlabs/web` + "MLabs" in it, run rename.ts dry-run with fake config,
  confirm both get rewritten. Unit test if one fits the existing test
  pattern.
- **Pause if:** existing tests for rename.ts use a different harness shape
  than `tsx scripts/rename.ts --dry-run` — match the existing harness.

### Task 5: Switch DB runtime client to neon-serverless + Pool

- **Files:** `packages/db/src/client.ts` (edit) · `packages/db/package.json`
  (edit — add `ws`)
- **What:** Replace `drizzle-orm/neon-http` + `neon()` with
  `drizzle-orm/neon-serverless` + `Pool` from `@neondatabase/serverless`.
  Add `neonConfig.webSocketConstructor = ws` at module top. Add `ws` to
  deps. Add `globalThis` HMR guard so dev hot-reload doesn't leak Pools.
  (TEMPLATE.md #10, #18.)
- **Acceptance:** `pnpm typecheck` clean. `pnpm dev` boots, the first DB
  query in any route succeeds with the new driver. No HMR warning about
  module reload after a code edit.
- **Pause if:** `db.batch()` callers exist anywhere in `apps/web/` or
  `packages/services/` — they need conversion to `db.transaction()` (the
  WS driver doesn't expose `.batch()`).

### Task 6: Switch DB migrate script to neon-serverless + remove advisory lock

- **Files:** `packages/db/scripts/migrate.ts` (edit)
- **What:** Replace `drizzle-orm/neon-http` + `neon()` with
  `drizzle-orm/neon-serverless` + `Pool` + WS driver. Delete the
  `pg_try_advisory_lock` block and the `pg_advisory_unlock` block. Add
  the why-no-lock comment block (BetFrnd's `packages/db/scripts/migrate.ts`
  lines 1–46 are the source of truth). Add `await pool.end()` in `finally`.
- **Acceptance:** `pnpm typecheck` clean. `pnpm db:migrate` against a
  fresh Neon DB completes without errors. The comment block explains why
  no lock and what topologies would require revisiting.

### Task 7: Add `webhook_event` table schema + migration

- **Files:** `packages/db/src/schema/webhook_event.ts` (new) ·
  `packages/db/src/schema/index.ts` (edit) · new generated SQL migration
- **What:** Define `webhook_event` table — `id text PK` (Stripe event id),
  `event_type text NOT NULL`, `processed_at timestamptz DEFAULT NOW() NOT
  NULL`, `raw_payload jsonb NOT NULL`. Match table-file pattern of
  `audit_log.ts` (snake_case file name + snake_case column names + camelCase
  TS export). Re-export from `index.ts` alongside existing tables. Run
  `pnpm db:generate` to produce the SQL migration (will be `0006_*.sql`).
- **Acceptance:** Migration file appears under `packages/db/drizzle/migrations/`.
  `pnpm db:migrate` against a fresh DB creates the table. Drizzle Studio
  shows the table with the right columns.
- **Pause if:** the schema file naming convention is actually different
  from snake_case (re-check by reading `audit_log.ts` first).

### Task 8: Add Stripe primitives (client + webhook handler)

- **Files:** `packages/services/src/billing/stripe-client.ts` (new) ·
  `packages/services/src/billing/webhook.ts` (new) ·
  `packages/services/src/billing/index.ts` (new) ·
  `packages/services/src/index.ts` (edit — add `export * as billing from
  "./billing"`) · `packages/services/package.json` (edit — add `stripe@^22`
  to deps, add `"./billing": "./src/billing/index.ts"` to exports) ·
  `pnpm-lock.yaml` (regenerated)
- **What:** `stripe-client.ts` — lazy singleton, takes `secretKey: string`,
  cached by key. NO `apiVersion` field (per Concern B decision). Copy
  BetFrnd's `stripe-client.ts` verbatim minus the BetFrnd-specific comments.
  `webhook.ts` — NEW generic handler. Signature: `handleStripeEvent(db,
  event: Stripe.Event, stripe?: Stripe): Promise<void>`. Idempotency:
  insert into `webhook_event` with `onConflictDoNothing({target:
  webhook_event.id})`, return early if zero rows returned. Switch on
  `event.type` — only a `default:` case that logs unknown types. JSDoc
  explains "Forks extend by adding cases above the default". `index.ts`
  re-exports both.
- **Acceptance:** `pnpm typecheck` clean. `pnpm --filter @mlabs/services
  test` passes (or unit test stub: invoke `handleStripeEvent` twice with
  the same event id; second call no-ops). `pnpm install` regenerates the
  lockfile with stripe@22 resolved.
- **Pause if:** stripe@22 has a peer-dep conflict with existing packages
  (escalate the resolution before silently `pnpm dedupe`-ing).

### Task 9: Update next.config.ts for standalone output + Replit hosts

- **Files:** `apps/web/next.config.ts` (edit)
- **What:** Add `output: "standalone"`. Add `outputFileTracingRoot:
  path.join(__dirname, "../..")` with the `path` + `url` imports BetFrnd
  uses. Expand `allowedDevOrigins` to `["127.0.0.1", "*.replit.dev",
  "*.repl.co", "*.worf.replit.dev"]`.
- **Acceptance:** `pnpm --filter @mlabs/web build` produces
  `apps/web/.next/standalone/apps/web/server.js`. `pnpm dev` from a
  `*.replit.dev` origin shows no cross-origin warnings.
- **Pause if:** existing next.config.ts has experimental flags or `webpack`
  hook overrides — preserve them.

### Task 10: Add `scripts/deploy-prune.cjs`

- **Files:** `scripts/deploy-prune.cjs` (new)
- **What:** Copy BetFrnd's `scripts/deploy-prune.cjs` verbatim. Generic
  enough (it removes `apps/mobile` hardcoded — that's expected, per
  deferred decision).
- **Acceptance:** After `pnpm --filter @mlabs/web build` + manual `cp -r
  public + static into standalone`, running `node scripts/deploy-prune.cjs`
  removes the listed paths, preserves
  `apps/web/.next/standalone/{apps/web,node_modules}` +
  `apps/web/.next/standalone/apps/web/{public,.next/static}`. Then `node
  apps/web/.next/standalone/apps/web/server.js` with `PORT=3001
  HOSTNAME=127.0.0.1` boots and responds 200 to `GET /` (Concern E smoke).
- **Pause if:** the post-prune server fails to boot — DO NOT mark T10 done.
  Diagnose which file the prune deleted that runtime needs; narrow the
  prune list and try again.

### Task 11: Add `replit.nix` with Chromium runtime libs

- **Files:** `replit.nix` (new)
- **What:** Copy BetFrnd's `replit.nix` verbatim. Includes `pkgs.unzip` +
  22 Chromium runtime libs. Comment block explains why (TEMPLATE.md #9,
  #15).
- **Acceptance:** File exists. Next workspace start triggers Nix profile
  rebuild without errors. `ldd` against Playwright's
  `chrome-headless-shell` (after `pnpm exec playwright install chromium`)
  reports no missing libraries.

### Task 12: Replace `.replit` with full Reserved-VM standalone deploy config

- **Files:** `.replit` (edit — full rewrite)
- **What:** Replace with BetFrnd's `.replit` rebranded — change every
  `@betfrnd/` → `@mlabs/` (rename.ts will substitute on next fork; until
  then template uses `@mlabs/`), change the header comment from "BetFrnd"
  to "MLabs template", change `entrypoint` to
  `apps/web/src/app/(marketing)/page.tsx` (match BetFrnd's path —
  hat-yai's current `src/app/page.tsx` is also stale per TEMPLATE.md #6
  recommendation). Includes: `[deployment]` block with full standalone +
  portable-node + pre-build migration pipeline; `[workflows]` block with
  Start application, Start application (e2e), Mobile (Expo Web), Expo Go
  Tunnel; `[[ports]]` with 3000:3000, 5000:80, 8080:8080, 8081:8081.
- **Acceptance:** `.replit` parses (no toml syntax error). On a Replit
  workspace, the Start application workflow boots on port 5000 within 30s.
  First `Publish` succeeds (image < 500 MB, runtime serves `/`).
- **Pause if:** the deploy `[env]` section needs additions specific to
  this template (e.g. NEXT_TELEMETRY_DISABLED is already in the existing
  one — verify before overwriting).

### Task 13: Add `apps/web/src/middleware.ts` (CORS for /api/auth/*)

- **Files:** `apps/web/src/middleware.ts` (new)
- **What:** Copy BetFrnd's `apps/web/src/middleware.ts` verbatim. Reads
  `env.REPLIT_DEV_DOMAIN` and `env.NODE_ENV`. Matcher `/api/auth/:path*`.
  Handles OPTIONS preflight + decorates GET/POST responses with CORS
  headers when origin is trusted.
- **Acceptance:** `pnpm typecheck` clean. From a `localhost:8080` origin
  with `NODE_ENV=development`, OPTIONS request to `/api/auth/get-session`
  returns 204 with `Access-Control-Allow-Origin: http://localhost:8080`.
  From an untrusted origin, no CORS headers.

### Task 14: Add `apps/web/src/instrumentation.ts` (empty hook + doc comment)

- **Files:** `apps/web/src/instrumentation.ts` (new)
- **What:** Empty `export async function register() {}` with a doc comment
  explaining: Next.js 16 instrumentation hook, fires once per server start,
  before first request; canonical place to boot long-lived workers
  (pg-boss / BullMQ / etc.) when a fork adds them; gate on
  `process.env.NEXT_RUNTIME === "nodejs"` and `process.env.NEXT_PHASE !==
  "phase-production-build"` before doing any side-effectful work. Template
  ships empty.
- **Acceptance:** `pnpm dev` boots without instrumentation warnings or
  errors. `pnpm build` succeeds.

### Task 15: Add `scripts/email-smoke.ts`

- **Files:** `scripts/email-smoke.ts` (new) · `package.json` (edit — add
  `"email:smoke": "tsx scripts/email-smoke.ts"`)
- **What:** Copy BetFrnd's `scripts/email-smoke.ts` verbatim. Already
  generic: reads `process.env.POSTMARK_*` directly, calls Postmark SDK,
  no `@mlabs/*` imports. Translates Postmark error codes (10, 11, 400,
  405, 412, 1101) into actionable hints. (TEMPLATE.md 2c.1 lesson 21.)
- **Acceptance:** `pnpm email:smoke` runs without `POSTMARK_SERVER_TOKEN`
  → prints clear "MISSING" diagnostic + exits 1. With token + valid
  template, exits 0.

### Task 16: Replace mobile API client with `tokenStore` shim (SecureStore + localStorage)

- **Files:** `apps/mobile/lib/api/client.ts` (edit)
- **What:** Add a `tokenStore` object with `get/set/remove` methods that
  branch on `Platform.OS === "web"` → `globalThis.localStorage`,
  otherwise → `SecureStore.*`. Replace all FIVE direct SecureStore calls:
  lines 49 (`getAccessToken`), 53 (`getRefreshToken`), 57+61
  (`setTokens` — has two calls), 65+66 (`clearTokens` — has two calls),
  98 (`performRefresh` inline). Add `import { Platform } from
  "react-native"`. Match BetFrnd's `tokenStore` shape verbatim.
- **Acceptance:** `pnpm --filter @mlabs/mobile typecheck` clean. Manual
  smoke: Expo web preview at `:8080` — sign in flow completes without
  the `getValueWithKeyAsync is not a function` error. Native Expo Go —
  sign in still works (SecureStore path unchanged).
- **Pause if:** the file has had any non-SecureStore changes since
  BetFrnd's port (e.g. extra cookies, custom headers) — preserve them.

### Task 17: Move TEMPLATE.md into the repo under `docs/template/`

- **Files:** `docs/template/TEMPLATE.md` (new) · `README.md` (edit — add
  link under "Learn more") · `FORK_CHECKLIST.md.template` (edit — link
  the "Quick start (post-template-hardening)" section)
- **What:** Copy `.context/attachments/mfFW2S/TEMPLATE.md` (also visible
  at `/Users/VB/conductor/workspaces/mlabs/betfrnd-readonly/TEMPLATE.md`)
  into `docs/template/TEMPLATE.md`. Rebrand: `@betfrnd/*` → `@<scope>/*`
  in code-path strings, `betfrnd` → `<scope>` in deploy commands.
  LEAVE the literal word "BetFrnd" in historical narrative paragraphs
  (it's history). Drop the BetFrnd-fork-chronology subsection headers
  in favor of date-only ("Discovered 2026-05-13"). Cross-reference in
  README.md "Learn more" + FORK_CHECKLIST.md.template.
- **Acceptance:** File exists. Grep for `@betfrnd` in the new file
  returns zero (only historical `BetFrnd` prose remains). README has a
  link.

### Task 18: Add ADR `docs/decisions/0008-codebase-conventions.md`

- **Files:** `docs/decisions/0008-codebase-conventions.md` (new) ·
  `README.md` (edit — add `0008` to the existing decisions/ list)
- **What:** New ADR matching 0006/0007 style. Lists 11 codebase
  conventions discovered/validated during the BetFrnd fork:
  1. Two-layer test convention (unit for validation, defer in-txn paths
     to `/mlabs-qa` via `describe.skip`)
  2. Service handler shape `(db, ctx, args)` — auth from ctx never args
  3. Cross-platform pure helpers go under `@<scope>/services/<domain>/
     <helper>` subpath, no server-only imports
  4. Sprint-N-stubs-Sprint-(N+1)-gate pattern
  5. `SELECT FOR UPDATE` zero-row gotcha → partial UNIQUE INDEX +
     INSERT try/catch
  6. BetterAuth `additionalFields` JS property names MUST be camelCase
     (alias the SQL column)
  7. One Stripe webhook URL = many event types (single signing secret +
     `webhook_event.id` UNIQUE dedupe)
  8. Workers boot from `instrumentation.ts`, not lazily on first request
  9. Verify `engines.node` on npm registry before pinning any
     worker/runtime dep
  10. Verify SaaS API quotas via `x-ratelimit-*` response headers, not
      docs
  11. Plan reviewers must read the cited file, not the plan's claim
      about it
  Add a closing note: AGENTS.md's Pause-If list references
  `src/config/brand.ts` but the actual path is `packages/config/src/brand.ts`
  — flag for a separate AGENTS.md cleanup.
- **Acceptance:** File exists, 11 conventions documented. README.md
  Learn more section cross-references 0008 alongside 0006/0007.

### Task 19: Update `/mlabs-plan` SKILL.md anti-patterns

- **Files:** `.claude/skills/mlabs-plan/SKILL.md` (edit)
- **What:** Add to the "Anti-patterns" section: "**Don't propose a
  session-level advisory lock through a pooler.** `pg_try_advisory_lock`
  + PgBouncer = stale-lock footgun when the process dies before
  `pg_advisory_unlock`. Use `pg_advisory_xact_lock` (transaction-scoped)
  or trust deploy serialization (Replit Reserved VM serializes per app)."
- **Acceptance:** File contains the new bullet under "Anti-patterns".

### Task 20: Update `/mlabs-code` SKILL.md guidance

- **Files:** `.claude/skills/mlabs-code/SKILL.md` (edit)
- **What:** Add to the relevant guidance section: "**After deleting an
  app-router `page.tsx`,** run `rm -rf apps/web/.next` before
  `pnpm typecheck`. Stale `.next/types/validator.ts` imports the
  now-missing page.js and tsc fails until `.next` is cleared."
- **Acceptance:** File contains the new bullet.

### Task 21: Backfill `.mstack/learnings.jsonl` with BetFrnd entries

- **Files:** `.mstack/learnings.jsonl` (edit — append)
- **What:** Read `.context/attachments/XU4LsF/learnings.jsonl`. Drop
  every line where `skill="--skill"` or `kind="--slug"` or `text="--kind"`
  (malformed entries, ~90 of 161). For each remaining entry, mechanically
  replace `@betfrnd/` → `@<scope>/` in `text` field; leave the literal
  word "BetFrnd" intact in prose. Append each cleaned entry to
  `.mstack/learnings.jsonl`. One commit.
- **Acceptance:** `wc -l .mstack/learnings.jsonl` reports ~70+1 (the
  rename.ts learning already there). `jq .` on each line parses
  without error. Grep for `@betfrnd/` returns zero matches.

### Task 22: Verify initiative-level acceptance

- **Files:** (no edits — final verification commit, doc-only updates if
  any acceptance fails)
- **What:** Run the initiative-level acceptance gates from the plan:
  (a) Fresh `pnpm install` succeeds without manual edits.
  (b) `pnpm --filter @mlabs/web dev` boots on `:5000` with
      `pnpm --filter @mlabs/web dev -p 5000 -H 0.0.0.0` (mimicking the
      Replit workflow).
  (c) `pnpm --filter @mlabs/web build` succeeds with standalone output.
  (d) `pnpm db:migrate` against a fresh Neon DB completes.
  (e) `node scripts/deploy-prune.cjs --dry-run` lists the expected
      removals.
  If any fails, file a follow-up `.mstack/plans/2026-05-23-template-
  hardening-followup.md` with the residual issue and stop.
- **Acceptance:** All five gates pass. Write the implementation report
  to `.mstack/implementations/2026-05-23-template-hardening/report.md`
  per `/mlabs-code` contract.
- **Pause if:** any gate fails — write the followup plan and pause for
  user review.

### Commit ordering (locked)

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14 →
T15 → T16 → T17 → T18 → T19 → T20 → T21 → T22

(Note: this is **new T-numbering** consolidating the original plan's T15a
into a clean linear sequence. Mapping: review-T3 = plan-T15a; review-T8
covers plan-T13+T14+T15+T16 minus the runtime configs; review-T9 = plan-T2;
the rest are re-ordered to respect dependencies.)

## Open questions

For `/mlabs-code` to escalate (not guess):

1. **`apps/web/src/lib/auth/index.ts` structure** — Task 3 assumes a single
   `baseUrl: env.BETTER_AUTH_URL` line. If the file structures the auth
   config differently (e.g. spread from a factory, multiple call sites),
   `/mlabs-code` must read the file first and locate the equivalent line.
   Don't blindly find/replace.
2. **`packages/services/src/index.ts` export style** — Task 8 adds
   `export * as billing from "./billing"`. The existing file uses that
   pattern (`export * as notifications from "./notifications"` etc.). If
   the export style has changed between writing this review and
   `/mlabs-code` execution, match the new convention.
3. **`webhook_event` table column naming convention** — Task 7 assumes
   snake_case columns + camelCase TS export keys (Drizzle's `pgTable`
   second-arg shape). Confirm by reading `audit_log.ts` first.
4. **Stripe peer-dep conflicts** — Task 8 expects clean
   `pnpm install` after adding `stripe@22.x`. If a peer-dep conflict
   surfaces (e.g. with `@types/node`), escalate before adding `.npmrc`
   overrides or `pnpm.overrides`.
5. **`.replit` workflow rename script interaction** — Task 12 rewrites
   `.replit` with `@mlabs/*` references. Task 4 (rename.ts patch) ensures
   future forks rewrite these. Confirm at T12 time that T4 has landed
   and `.replit` is in `KNOWN_FILES`. (Sequence in commit ordering above
   ensures this — T4 lands before T12.)
