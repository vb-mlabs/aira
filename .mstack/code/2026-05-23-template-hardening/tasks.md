# Implementation: template-hardening

**Started:** 2026-05-23
**Review:** [2026-05-23-template-hardening](../../reviews/2026-05-23-template-hardening.md)
**Branch:** Vbhadala/incorporate-fork-learnings
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **T1:** Pin `packageManager` to `pnpm@10.26.1`
  - Files: `package.json`
  - Commit: `0c7ec8c`

- [x] **T2:** Update env validator + .env.example for Replit/Stripe vars
  - Files: `apps/web/src/config/env.ts`, `.env.example`
  - Commit: T2 (will fill SHA from git log)

- [ ] **T3:** Patch auth lib with BETTER_AUTH_URL → REPLIT_DEV_DOMAIN fallback
  - Files: `apps/web/src/lib/auth/index.ts` (+ siblings if needed)
  - Commit: see report.md

- [ ] **T4:** Patch rename.ts — `KNOWN_FILES` set + `\bMLabs\b` substitution
  - Files: `scripts/rename.ts`
  - Commit: see report.md

- [!] **T5:** Switch DB runtime client to neon-serverless + Pool
  - Files: `packages/db/src/client.ts`, `packages/db/package.json`
  - Commit: see report.md
  - **Pause reason:** db.batch() callers in messages/service.ts + admin/service.ts. WS driver doesn't expose .batch(). Awaiting decision.

- [ ] **T6:** Switch DB migrate script to neon-serverless + remove advisory lock
  - Files: `packages/db/scripts/migrate.ts`
  - Commit: see report.md

- [ ] **T7:** Add `webhook_event` table schema + migration
  - Files: `packages/db/src/schema/webhook_event.ts`, `packages/db/src/schema/index.ts`, new SQL migration
  - Commit: see report.md

- [ ] **T8:** Add Stripe primitives (client + webhook handler)
  - Files: `packages/services/src/billing/{stripe-client,webhook,index}.ts`, `packages/services/src/index.ts`, `packages/services/package.json`
  - Commit: see report.md

- [ ] **T9:** Update next.config.ts for standalone output + Replit hosts
  - Files: `apps/web/next.config.ts`
  - Commit: see report.md

- [ ] **T10:** Add `scripts/deploy-prune.cjs` + post-prune smoke
  - Files: `scripts/deploy-prune.cjs`
  - Commit: see report.md

- [ ] **T11:** Add `replit.nix` with Chromium runtime libs
  - Files: `replit.nix`
  - Commit: see report.md

- [ ] **T12:** Replace `.replit` with full Reserved-VM standalone deploy config
  - Files: `.replit`
  - Commit: see report.md

- [ ] **T13:** Add `apps/web/src/middleware.ts` (CORS for /api/auth/*)
  - Files: `apps/web/src/middleware.ts`
  - Commit: see report.md

- [ ] **T14:** Add `apps/web/src/instrumentation.ts` (empty hook + doc comment)
  - Files: `apps/web/src/instrumentation.ts`
  - Commit: see report.md

- [ ] **T15:** Add `scripts/email-smoke.ts` + `pnpm email:smoke` script
  - Files: `scripts/email-smoke.ts`, `package.json`
  - Commit: see report.md

- [ ] **T16:** Replace mobile API client with `tokenStore` shim
  - Files: `apps/mobile/lib/api/client.ts`
  - Commit: see report.md

- [ ] **T17:** Move TEMPLATE.md into the repo under `docs/template/`
  - Files: `docs/template/TEMPLATE.md`, `README.md`, `FORK_CHECKLIST.md.template`
  - Commit: see report.md

- [ ] **T18:** Add ADR `docs/decisions/0008-codebase-conventions.md`
  - Files: `docs/decisions/0008-codebase-conventions.md`, `README.md`
  - Commit: see report.md

- [ ] **T19:** Update `/mlabs-plan` SKILL.md anti-patterns
  - Files: `.claude/skills/mlabs-plan/SKILL.md`
  - Commit: see report.md

- [ ] **T20:** Update `/mlabs-code` SKILL.md guidance
  - Files: `.claude/skills/mlabs-code/SKILL.md`
  - Commit: see report.md

- [ ] **T21:** Backfill `.mstack/learnings.jsonl` with BetFrnd entries
  - Files: `.mstack/learnings.jsonl`
  - Commit: see report.md

- [ ] **T22:** Verify initiative-level acceptance + write report
  - Files: `.mstack/implementations/2026-05-23-template-hardening/report.md`
  - Commit: see report.md
