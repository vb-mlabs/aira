# Implementation log: template-hardening

Append-only, one line per significant event.

- 2026-05-23: pre-flight done; .mstack/ artifacts committed at 0165a33
- 2026-05-23 T1: pin pnpm@10.26.1 — commit 0c7ec8c
- 2026-05-23 T2: env vars (REPLIT_DEV_DOMAIN, STRIPE_*) — commit 9a9ae54
- 2026-05-23 T3: auth lib baseUrl fallback — commit a4fdad2
- 2026-05-23 T4: rename.ts KNOWN_FILES + \bMLabs\b — commit b6f299d
- 2026-05-23 T5 PAUSE: db.batch() callers found in
  packages/services/src/messages/service.ts and
  packages/services/src/admin/service.ts. neon-serverless WS Pool doesn't
  expose .batch() — switching driver without converting these breaks them.
  Asked user how to proceed.
- 2026-05-23 T5 RESUMED: user chose split into T5a (convert .batch → .transaction)
  + T5 (driver switch). Both landed cleanly.
- 2026-05-23 T5a: convert .batch() → .transaction() — commit d451456
- 2026-05-23 T5: db client driver switch — commit 1bfd4dc
- 2026-05-23 T6: migrate script driver switch + remove lock — commit c5ac21f
- 2026-05-23 T7: webhook_event schema + migration 0006 — commit cc47b80
- 2026-05-23 T8: Stripe primitives — commit ddafcc9
- 2026-05-23 T9: next.config.ts standalone — commit 4a750c5
- 2026-05-23 T10: deploy-prune.cjs — commit a82c271
- 2026-05-23 T11: replit.nix — commit 3b2009d
- 2026-05-23 T12: .replit full rewrite — commit efebdb9
- 2026-05-23 T13: CORS middleware — commit fee96e4
- 2026-05-23 T14: instrumentation hook — commit 6830425
- 2026-05-23 T15: email-smoke + pnpm script — commit c2948a3
- 2026-05-23 T16: mobile tokenStore shim — commit 55f74e4
- 2026-05-23 T17: docs/template/TEMPLATE.md — commit 6213a6d
- 2026-05-23 T18: ADR 0008 codebase-conventions — commit 1c4cfeb
- 2026-05-23 T19: /mlabs-plan SKILL anti-pattern — commit 50104f5
- 2026-05-23 T20: /mlabs-code SKILL guidance — commit 984789b
- 2026-05-23 T21: learnings.jsonl backfill (130 entries) — commit db7159a
- 2026-05-23 T22: verification gates + report — this commit
- 2026-05-23 RUN COMPLETE: 22 atomic commits + 1 pre-flight chore. All
  acceptance gates that don't require Replit/Neon live env are green.
