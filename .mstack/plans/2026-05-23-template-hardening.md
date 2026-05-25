# Plan: Template hardening from BetFrnd fork learnings

**Date:** 2026-05-23
**Slug:** 2026-05-23-template-hardening
**Status:** implemented — see `.mstack/implementations/2026-05-23-template-hardening/report.md`
**Author:** Vbhadala (with Claude)

---

## Problem

The MLabs template was forked once (BetFrnd, 2026-05-13 → 2026-05-23) and the
fork hit a long sequence of avoidable friction points: pnpm version mismatch
in the Replit Nix env, missing Replit hosts in `allowedDevOrigins`, npm-based
deploy commands that can't resolve `workspace:*`, an 8 GiB image-size cap that
the default Next config blew past, a stale `pg_try_advisory_lock` migration
script that bricked deploys, the `neon-http` driver returning `rows: null` and
crashing BetterAuth signup, missing Chromium libs blocking `/mlabs-qa`, and
many smaller cuts. Each was diagnosed, fixed in BetFrnd, and documented in
`TEMPLATE.md` (29 recommendations) + `learnings.jsonl` (~70 usable entries).

The fixes have not been promoted back to this template. The next fork (MVP #2)
will hit the same friction unless we land them here first.

**Who benefits:** every future fork of this template (target ≥3 MVPs over the
next 12 months). Each fork saves ~2–3 days of platform debugging.

**Success looks like:** importing this template into a fresh Replit workspace
boots cleanly on first `pnpm install`, the first `Publish` succeeds without
edits, `/mlabs-qa` runs Chromium without `replit.nix` edits, and the next fork
adopts the BetFrnd patterns (CORS middleware, SecureStore web shim, Stripe
webhook idempotency) without rediscovering them.

## Scope

### In (this plan)

**🟢 Promote-as-code — concrete file changes in template:**

1. Pin `packageManager` to `pnpm@10.26.1` (matches Replit Nix `stable-24_05`)
2. Replace `apps/web/next.config.ts` with standalone-aware version (output:
   "standalone", outputFileTracingRoot, Replit hosts in allowedDevOrigins)
3. Replace `packages/db/scripts/migrate.ts` (drop advisory lock, switch to
   `neon-serverless` + `Pool`, ship the why-no-lock comment)
4. Replace `packages/db/src/client.ts` (switch to `neon-serverless` + `Pool` +
   `globalThis` HMR guard)
5. Add `scripts/deploy-prune.cjs` (generic monorepo-aware prune)
6. Add `replit.nix` (Chromium runtime libs + unzip)
7. Replace `.replit` with full Reserved-VM standalone deploy config (portable
   node binary, migrations-before-build, workflows on port 5000, Expo web on
   8080, e2e workflow with HTTP `BETTER_AUTH_URL`)
8. Add `apps/web/src/middleware.ts` (CORS for `/api/auth/:path*` from Expo web
   preview, gated by `env.REPLIT_DEV_DOMAIN`)
9. Add `apps/web/src/instrumentation.ts` (empty hook + doc comment explaining
   it's the boot point for long-lived workers when needed; no pg-boss)
10. Add `scripts/email-smoke.ts` (already generic in BetFrnd, port as-is)
11. Patch `scripts/rename.ts` (`KNOWN_FILES` set covering `.replit` +
    extensionless config; add `\bMLabs\b` rewrite alongside `\bMuscat\b`)
12. Replace `apps/mobile/lib/api/client.ts` (add `tokenStore` shim with
    `Platform.OS === "web"` → localStorage path)
13. Add Stripe primitives — **generic only**: `packages/services/src/billing/`
    with `stripe-client.ts` (lazy singleton, env-validated) and `webhook.ts`
    (verify signature + dispatch by event type + `webhook_event` idempotency).
    No BetFrnd-specific handlers (no `creditTopUp`, no Connect onboarding) —
    those stay in fork.
14. Add `webhook_event` table to `packages/db/src/schema/` (UNIQUE on Stripe
    event id, generic shape: id text PK from Stripe, type text, processed_at
    timestamptz, payload jsonb)
15. Add `REPLIT_DEV_DOMAIN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` to
    `apps/web/src/config/env.ts` as `.optional()` so the template still boots
    without them
16. Add `pnpm email:smoke` + `pnpm stripe:webhook-setup` (if generalizable)
    scripts to root `package.json`

**🟡 Promote-as-guidance — text changes to AGENTS.md / CLAUDE.md / skill
prompts:**

17. Write `docs/decisions/0008-betfrnd-conventions.md` (ADR-style, matches
    existing `docs/decisions/000{6,7}` precedent). Include these conventions:
    - Two-layer test convention (unit for validation, defer in-txn paths to
      `/mlabs-qa` via `describe.skip`)
    - Service handler signature `(db, ctx, args)` — auth from ctx never args
    - Cross-platform pure helpers go under `@<scope>/services/<domain>/<helper>`
      with no server-only imports
    - Sprint-N-stubs-Sprint-(N+1)-gate pattern (plant column + gate + disabled
      CTA upfront)
    - `SELECT FOR UPDATE` zero-row gotcha → partial UNIQUE INDEX + INSERT
      try/catch for "at most one X per Y"
    - `additionalFields` JS property names MUST be camelCase even if SQL
      column is snake_case (alias the column)
    - One Stripe webhook URL = many event types (single signing secret +
      dedupe via `webhook_event.id` UNIQUE)
    - Workers boot from `instrumentation.ts`, not lazily on first request
    - Verify `engines.node` on npm registry before pinning any worker/runtime
      dep
    - Verify SaaS API quotas via `x-ratelimit-*` response headers, not docs
    - Plan reviewers must read the cited file, not the plan's claim about it
18. Update `/mlabs-plan` SKILL.md anti-patterns section with: "Don't propose
    a session-level advisory lock through a pooler (PgBouncer + session lock
    = stale-lock footgun)."
19. Update `/mlabs-code` SKILL.md with: "After deleting an app-router
    `page.tsx`, run `rm -rf apps/web/.next` before typecheck (stale
    `.next/types/validator.ts` imports the missing file)."

**🟢 Knowledge ingestion:**

20. Save BetFrnd's `TEMPLATE.md` into this repo as `docs/template/TEMPLATE.md`
    (locked path per user direction 2026-05-23 — new subdir under `docs/`).
    Rebrand — replace `@betfrnd` placeholders with `@<scope>` and `BetFrnd`
    with `<scope>` notation; remove BetFrnd-specific recommendations 13/14
    duplication; keep all 29 lessons + monorepo deploy hygiene section.
    Cross-reference in `README.md` ("Learn more" section) and
    `FORK_CHECKLIST.md.template`.
21. Backfill `.mstack/learnings.jsonl` with ~70 cleaned BetFrnd entries via
    `append-learning.sh`. Drop the ~90 malformed `--skill`/`--kind`/`--slug`
    entries. Rebrand any `@betfrnd` → `@<scope>` in text bodies. Use a single
    commit for the backfill.

### Out (deferred / explicitly leave behind in BetFrnd)

- pg-boss queue infrastructure (BetFrnd-only — `instrumentation.ts` in
  template is empty hook)
- Wallet / bet / signal / signal_purchase domain tables and services
- VC (virtual currency) unit, 4dp odds-precision math, payout formula
- odds-api.io ingestion, sports schema, tennis slug ephemerality handling
- Stripe Connect (seller onboarding, transfer retry) — too vertical-specific
- BetFrnd Sprint chronology / sprint-specific patterns
- Promotion of fixes back to the *external* `mlabs-template` GitHub repo
  if this `hat-yai` workspace is itself that repo — confirm in Open Questions.
- Actual implementation: this is **plan only**. Execution goes through
  `/mlabs-review` → `/mlabs-code` per AGENTS.md hard rules.

## Approach

This is an **initiative-level plan** covering ~21 discrete tasks. The
recommended flow:

1. **Land this plan as-is** (one `.mstack/plans/` doc, this file).
2. **`/mlabs-review` it** → reviewer locks scope, may split into phases or
   per-theme review docs.
3. **`/mlabs-code` executes one theme at a time** — one commit per task, no
   `--no-verify`, never amend across tasks (per AGENTS.md).

### Phasing (locked)

**One `/mlabs-review` round covering all 21 tasks → one `/mlabs-code` session
executing 21 atomic commits, one PR to `main`.**

Per user direction 2026-05-23. Rationale: the 21 tasks are tightly
inter-locked (e.g. T11 before T7 for `.replit` rename safety, T15 before T8
for `env.REPLIT_DEV_DOMAIN`, T14 before T13 for `webhook_event` schema before
webhook handler). Splitting into 5 reviews would have meant 4 hand-offs and 5
PRs to coordinate. The reviewer should still apply tight atomic-commit
discipline within the single `/mlabs-code` session (AGENTS.md "one commit per
task" rule unchanged).

### Suggested commit ordering for `/mlabs-code`

Tasks have execution dependencies — `/mlabs-code` should follow this order to
keep typecheck/build green between commits:

| Order | Task | Why this order |
|---|---|---|
| 1 | T1 (`packageManager` pin) | Trivial, no deps |
| 2 | T15 (env.ts adds `REPLIT_DEV_DOMAIN` etc.) | Unblocks T8, T13 |
| 3 | T11 (rename.ts `KNOWN_FILES` + `\bMLabs\b`) | Unblocks T7 (`.replit` rewrite with `@<scope>` placeholders) |
| 4 | T4 (`db/src/client.ts` switch) | Unblocks any downstream svc work |
| 5 | T3 (`db/scripts/migrate.ts` switch + remove lock) | Aligns with T4 driver choice |
| 6 | T14 (`webhook_event` table + migration) | Unblocks T13 |
| 7 | T13 (Stripe primitives) | Depends on T14 + T15 |
| 8 | T2 (`next.config.ts` standalone) | Required before deploy works |
| 9 | T5 (`deploy-prune.cjs`) | Required by T7 deploy build |
| 10 | T6 (`replit.nix`) | Independent |
| 11 | T7 (`.replit` rewrite) | Depends on T11, T5 |
| 12 | T8 (`middleware.ts`) | Depends on T15 |
| 13 | T9 (`instrumentation.ts`) | Independent |
| 14 | T10 (`email-smoke.ts`) | Independent |
| 15 | T16 (root scripts) | Pairs with T10 |
| 16 | T12 (mobile SecureStore shim) | Independent |
| 17 | T17 (ADR 0008 — yellow conventions) | Doc-only |
| 18 | T18 (mlabs-plan SKILL anti-patterns) | Doc-only |
| 19 | T19 (mlabs-code SKILL guidance) | Doc-only |
| 20 | T20 (`docs/template/TEMPLATE.md` + README link) | Doc-only |
| 21 | T21 (learnings.jsonl backfill) | Final commit |

### Alternatives considered

- **One mega-PR with all 21 tasks** — rejected. Too many touchpoints
  (`.replit`, `next.config.ts`, `packages/db/`, mobile, new files) to review
  in one pass. Violates AGENTS.md "one commit per task" spirit.
- **Skip the Stripe primitives until MVP #2 actually needs them** — rejected.
  Generic Stripe (lazy client + webhook handler + idempotency table) is
  ~150 LOC and the shape is uncontested. Adding it now means the next fork's
  Stripe-using sprint has a head start instead of re-inventing.
- **Promote pg-boss as default queue** — rejected per user direction. Leave
  worker choice to fork; ship empty `instrumentation.ts` as a documented
  extension point.
- **Skip `learnings.jsonl` backfill** — rejected. The `.mstack/README.md`
  explicitly says: "Review periodically and promote generic ones up to the
  mlabs-template repo." This IS that repo (per Open Question #2). Backfilling
  preserves cross-MVP memory.

## Data model changes

**New table: `webhook_event` in `packages/db/src/schema/billing.ts`** (or
similar — to be decided in /mlabs-review based on existing schema layout)

```ts
export const webhookEvent = pgTable("webhook_event", {
  id: text("id").primaryKey(),          // Stripe event id (evt_xxx)
  type: text("type").notNull(),         // Stripe event type
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  payload: jsonb("payload").notNull(),  // raw event for replay/debugging
})
```

UNIQUE on `id` is implicit via primary key. Forks add their own
`payment_transaction` / `subscription` / etc. tables alongside.

**Migration:** one Drizzle migration adding the table. No backfill needed —
table starts empty.

## Files to touch

### New

| Path | Source | Notes |
|---|---|---|
| `replit.nix` | betfrnd `replit.nix` | Copy verbatim — already template-ready |
| `scripts/deploy-prune.cjs` | betfrnd `scripts/deploy-prune.cjs` | Replace `apps/mobile` exclusion to be more generic / read `pnpm-workspace.yaml` if reasonable (defer to /mlabs-code) |
| `scripts/email-smoke.ts` | betfrnd `scripts/email-smoke.ts` | Already generic |
| `apps/web/src/middleware.ts` | betfrnd `apps/web/src/middleware.ts` | Copy verbatim — uses `env.REPLIT_DEV_DOMAIN` and `env.NODE_ENV` already |
| `apps/web/src/instrumentation.ts` | new (don't copy BetFrnd's pg-boss version) | Empty hook + doc comment |
| `packages/services/src/billing/stripe-client.ts` | betfrnd `packages/services/src/billing/stripe-client.ts` (audit first) | Lazy singleton, env-driven |
| `packages/services/src/billing/webhook.ts` | betfrnd `packages/services/src/billing/webhook.ts` (strip BetFrnd-specific event handlers) | Signature verification + idempotency + generic dispatch |
| `packages/services/src/billing/index.ts` | new | Re-export public surface |
| `packages/db/src/schema/billing.ts` (or extend existing) | new | `webhook_event` table |
| `packages/db/drizzle/migrations/NNNN_webhook_event.sql` | drizzle-kit generate | Auto-generated |
| `docs/template/TEMPLATE.md` | betfrnd `TEMPLATE.md` (rebranded) | Full runbook, 29 lessons |
| `docs/decisions/0008-betfrnd-conventions.md` | new ADR (yellow-bucket items 17 above) | Codebase conventions lifted from BetFrnd, ADR-style |

### Edit

| Path | Change |
|---|---|
| `package.json` | `packageManager: pnpm@10.26.1`; add `email:smoke` script; add `stripe:webhook-setup` script if applicable |
| `.replit` | Replace with BetFrnd version, rebranded: `@betfrnd` → `@<placeholder>` (rename.ts will substitute at fork time once task 11 lands) |
| `apps/web/next.config.ts` | Add `output: "standalone"`, `outputFileTracingRoot`, expand `allowedDevOrigins` |
| `packages/db/src/client.ts` | Switch to neon-serverless + Pool + HMR guard |
| `packages/db/scripts/migrate.ts` | Switch to neon-serverless + Pool, remove advisory lock, ship the why-no-lock comment |
| `apps/web/src/config/env.ts` | Add `REPLIT_DEV_DOMAIN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (all `.optional()`) |
| `apps/mobile/lib/api/client.ts` | Add `tokenStore` shim with Platform.OS check |
| `scripts/rename.ts` | Add `KNOWN_FILES = new Set([".replit", ".gitignore", ".tool-versions", "Dockerfile"])`; add `\bMLabs\b` rewrite in `transform()` |
| `README.md` | Cross-reference `docs/template/TEMPLATE.md` in "Learn more" section; cross-reference `docs/decisions/0008-betfrnd-conventions.md` alongside existing 0006/0007 references |
| `FORK_CHECKLIST.md.template` | Reference `docs/template/TEMPLATE.md` "Quick start (post-template-hardening)" |
| `.claude/skills/mlabs-plan/SKILL.md` | Anti-patterns section: add advisory-lock-through-pooler warning |
| `.claude/skills/mlabs-code/SKILL.md` | Add `rm -rf .next` after page deletion guidance |

### Files to verify (not yet read)

| Path | Why |
|---|---|
| `apps/web/src/config/env.ts` | Confirm `REPLIT_DEV_DOMAIN` not already declared; confirm `.optional()` pattern |
| `packages/services/src/index.ts` | Confirm export style for new billing submodule |
| Current Drizzle migration count | Sequence next migration number correctly |
| `apps/mobile/lib/api/client.ts` full file | Need to see the refresh-token retry block to make sure `tokenStore` shim doesn't break it |
| BetFrnd `packages/services/src/billing/webhook.ts` full file | Identify the BetFrnd-specific handlers (creditTopUp, Connect) to strip before promotion |

## Edge cases

- **`.replit` rename interaction:** Task 11 (rename.ts fix) and Task 7
  (.replit rewrite with `@<scope>` placeholders) interlock. If we land Task 7
  with literal `@mlabs/web` and the next fork runs the old rename.ts, the
  workflows tasks won't be rewritten. Land Task 11 **before** Task 7, or land
  them together. /mlabs-review should lock the order.
- **Stripe API version pin:** Locked per user direction 2026-05-23 — pin to
  the latest available at `/mlabs-code` execution time. `/mlabs-code` looks up
  the current API version when implementing T13, ships it as a constant in
  `stripe-client.ts`, and notes the date in a comment so future forks know
  when to revisit.
- **Neon driver switch is high-risk:** `db.batch()` callers must convert to
  `db.transaction()`. hat-yai may not have any `.batch()` callers yet (since
  it's a clean template), but verify in /mlabs-code by grepping
  `\.batch\(` before declaring task 3+4 done.
- **`webhook_event` table primary key:** Stripe event ids look like
  `evt_3OxxxXXXX...` — fits in `text`. But if a fork ever processes events
  from a second Stripe account, the id is unique only within an account.
  Document but don't pre-solve.
- **`replit.nix` first-rebuild cost:** Adding ~22 packages means the next
  fork's first workspace start rebuilds the Nix profile (~5–10 min). Document
  in `FORK_CHECKLIST.md.template`.
- **`outputFileTracingRoot` and Vercel:** If a fork ever deploys to Vercel
  instead of Replit, this setting needs review (Vercel auto-detects pnpm
  workspaces differently). Out of scope here — Replit is the primary target.
- **`instrumentation.ts` being empty:** Next.js still loads it on every
  server start. Ensure the empty version doesn't log noise; verify with a
  `pnpm dev` boot smoke after landing Task 9.
- **CORS middleware + BetterAuth in Next.js 16:** Verify the matcher
  `/api/auth/:path*` actually matches BetterAuth's mounted handler path in
  this template (BetterAuth uses `apps/web/src/app/api/auth/[...all]/route.ts`
  shape) — should match, but confirm during /mlabs-code.

## Acceptance criteria

### Per-task (each gets its own checkbox in /mlabs-code)

- [ ] T1: `package.json` has `"packageManager": "pnpm@10.26.1"`
- [ ] T2: `apps/web/next.config.ts` ships `output: "standalone"` +
      `outputFileTracingRoot: path.join(__dirname, "../..")` +
      `allowedDevOrigins` includes `*.replit.dev`, `*.repl.co`,
      `*.worf.replit.dev`
- [ ] T3: `packages/db/scripts/migrate.ts` uses `drizzle-orm/neon-serverless`,
      `Pool`, has no advisory-lock SQL, has the why-no-lock comment block,
      calls `await pool.end()` in `finally`
- [ ] T4: `packages/db/src/client.ts` uses `drizzle-orm/neon-serverless`,
      `Pool`, has `globalThis` HMR guard, sets `neonConfig.webSocketConstructor = ws`
- [ ] T5: `scripts/deploy-prune.cjs` exists, runs cleanly with `node scripts/deploy-prune.cjs` on a built workspace, preserves `apps/web/.next/standalone/`, `apps/web/.next/static/`, `apps/web/public/`
- [ ] T6: `replit.nix` exists with the 22 Chromium runtime libs + unzip
- [ ] T7: `.replit` `[deployment]` block uses pnpm, includes the portable-node
      tarball curl+SHA256 step, runs migrations before build, calls
      `deploy-prune.cjs`; `[[workflows.workflow]]` block boots on port 5000;
      port `localPort = 3000` → `:80` is removed; `localPort = 5000` → `:80`
      is the single web mapping
- [ ] T8: `apps/web/src/middleware.ts` matches `/api/auth/:path*`, returns 204
      with CORS headers for OPTIONS from trusted origins, decorates GET/POST
      with Allow-Origin + Allow-Credentials, no-ops when `REPLIT_DEV_DOMAIN`
      is unset
- [ ] T9: `apps/web/src/instrumentation.ts` exists with empty hook + doc
      comment explaining boot-point semantics; `pnpm dev` boots without
      noise
- [ ] T10: `scripts/email-smoke.ts` exists, runs via `pnpm email:smoke`,
      translates Postmark error codes per BetFrnd version
- [ ] T11: `scripts/rename.ts` rewrites `.replit` after rename; `\bMLabs\b`
      substitution lands alongside `\bMuscat\b`
- [ ] T12: `apps/mobile/lib/api/client.ts` routes web reads/writes to
      `globalThis.localStorage`; native unchanged; refresh-token retry block
      still works
- [ ] T13: `packages/services/src/billing/{stripe-client,webhook}.ts` exist;
      webhook handler verifies Stripe signature; dispatches by `event.type`
      via a registry that forks extend; inserts into `webhook_event` with
      `onConflictDoNothing` for idempotency
- [ ] T14: `webhook_event` table in schema + migration applied;
      `pnpm db:migrate` succeeds against a fresh DB
- [ ] T15: `env.ts` declares `REPLIT_DEV_DOMAIN`, `STRIPE_SECRET_KEY`,
      `STRIPE_WEBHOOK_SECRET` as `.optional()`; template still boots with
      empty `.env.local`
- [ ] T16: Root `package.json` has `email:smoke` and (if generalizable)
      `stripe:webhook-setup` scripts
- [ ] T17: `docs/decisions/0008-betfrnd-conventions.md` exists (ADR-style, 11 conventions listed; cross-referenced from README.md alongside 0006/0007)
- [ ] T18: `/mlabs-plan` SKILL.md anti-patterns updated
- [ ] T19: `/mlabs-code` SKILL.md updated
- [ ] T20: `docs/template/TEMPLATE.md` exists, rebranded, cross-referenced
      from `README.md` and `FORK_CHECKLIST.md.template`
- [ ] T21: `.mstack/learnings.jsonl` has the cleaned BetFrnd entries (~70),
      rebranded (`@betfrnd` → `@<scope>` in text)

### Initiative-level (gate before declaring this plan "done")

- [ ] Fresh clone of template + `pnpm install` succeeds on Replit
      (`stable-24_05` Nix channel) without manual pnpm-version edits
- [ ] `pnpm --filter @<scope>/web dev` boots on port 5000 with no errors
- [ ] First `Publish` from a fresh Replit fork succeeds (image < 500 MB,
      Reserved VM runtime serves homepage)
- [ ] `/mlabs-qa` Playwright Chromium launches without `replit.nix` edits
- [ ] `pnpm db:migrate` against a fresh Neon DB succeeds without
      advisory-lock errors

## Resolved decisions (user direction, 2026-05-23)

1. **Repo target:** `hat-yai` IS the MLabs template (workspace branch
   `Vbhadala/incorporate-fork-learnings`). PR target = this repo's `main`.
2. **Phasing:** one `/mlabs-review` round + one `/mlabs-code` session
   executing 21 atomic commits (see "Suggested commit ordering" above).
3. **`TEMPLATE.md` location:** `docs/template/TEMPLATE.md` (new subdir).
4. **Yellow-bucket conventions location:** `docs/decisions/0008-betfrnd-
   conventions.md` (ADR-style, matches 0006/0007 precedent).
5. **Stripe API version:** pin to the latest available at `/mlabs-code` time,
   with a dated comment in `stripe-client.ts`.
6. **Execution order:** T11 before T7 (rename.ts fix before .replit rewrite);
   T15 before T8 (env.ts adds before middleware reads); T14 before T13
   (webhook_event table before webhook handler); T4 before T3 (client.ts
   driver switch sets the driver choice migrate.ts must align with).
7. **Learnings.jsonl rebranding:** mechanical replace `@betfrnd` → `@<scope>`
   in code-path strings; leave prose mentions of "BetFrnd" intact (historical
   context).

## Open questions

Genuinely open, for `/mlabs-review` to resolve at review time (do not need
user input now):

1. **`scripts/deploy-prune.cjs` exclusion list generalization:** read
   `pnpm-workspace.yaml` to auto-derive excludes, or hardcode `apps/mobile` +
   document that forks edit? Hardcode is simpler but breaks if a fork adds
   `apps/web2`. Reviewer's call — recommend hardcoding for now with a clear
   comment, deferring generalization until the second fork actually adds a
   third app.
2. **`webhook_event` schema location:** new
   `packages/db/src/schema/billing.ts` file, or extend an existing schema
   file? Depends on hat-yai's current schema layout — `/mlabs-code` reads +
   decides at task time.
3. **README.md "Quick start" port-3000 references:** the current README says
   "Web: http://localhost:3000". The new `.replit` workflows run on `:5000`.
   Decide whether README's quick-start stays at `:3000` (local-dev default)
   or moves to `:5000` (Replit-default). Recommend keeping `:3000` for local
   dev clarity and adding a note that Replit binds `:5000`.
4. **Stripe primitives directory:** confirm
   `packages/services/src/billing/` is the right home — alternatives could be
   `packages/services/src/stripe/` or `packages/services/src/payments/`.
   Reviewer's call based on naming preference.

## Source-of-truth references

- BetFrnd repo: `/Users/VB/conductor/workspaces/mlabs/betfrnd-readonly/`
  (cloned readonly, sibling to this workspace)
- BetFrnd `TEMPLATE.md` (29 recommendations): in BetFrnd's repo root
  (also at `.context/attachments/mfFW2S/TEMPLATE.md` in this workspace)
- BetFrnd `learnings.jsonl` (161 lines, ~70 usable):
  `.context/attachments/XU4LsF/learnings.jsonl`
- Sort framework (green/yellow/red) — in conversation transcript leading to
  this plan; the file-level audit results are in the buckets above.
