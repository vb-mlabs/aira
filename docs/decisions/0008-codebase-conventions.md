# 0008 — Codebase conventions (lifted from the BetFrnd fork)

**Status:** accepted
**Date:** 2026-05-23
**Replaces:** N/A
**Supersedes:** N/A
**Related:** [0006-monorepo.md](./0006-monorepo.md), [0007-service-layer.md](./0007-service-layer.md), [../template/TEMPLATE.md](../template/TEMPLATE.md)

## Context

The first MLabs fork (BetFrnd, 2026-05-13 → 2026-05-23) ran 6 sprints
through the mstack `/mlabs-plan → /mlabs-review → /mlabs-code → /mlabs-qa`
pipeline. Over those sprints, ~70 non-obvious conventions surfaced as
patterns that worked + anti-patterns that didn't. Most don't fit cleanly
into the existing CLAUDE.md / AGENTS.md surfaces (CLAUDE.md is per-fork
overrides; AGENTS.md is hard rules), but they're load-bearing enough
that the next fork should not have to rediscover them.

This ADR records the 11 most-cited conventions so future plan reviewers
+ /mlabs-code runs can reference a single source of truth.

The "BetFrnd" attribution is historical, not normative — these apply to
every MVP forked from this template.

## Decision

### Service + transaction conventions

**1. Service handler signature is `(db, ctx, args)`.**
Auth identifiers (`userId`, `adminId`) come from `ctx.userId`, never
from `args`. The `defineOperation` adapter sets `ctx.userId` from the
authenticated session; services that accept it via `args` bypass the
type system and the audit boundary. Pattern locked in 0007; reaffirmed
across BetFrnd's wallet, bets, signals, purchases services.

**2. Cross-platform pure helpers go under a `<helper>` subpath of the
service package.**
e.g. `@mlabs/services/billing` exports `getStripe`, `handleStripeEvent`.
Forks-shared math (payout calculations, odds-product rounding) goes
under a `<domain>/<helper>` subpath with **no server-only imports** and
**no Drizzle imports**. Both server (write path) and client (display)
import from the same subpath — eliminates the 3-place drift where the
web client displays a different number than the server settles.

**3. `db.batch()` is `neon-http`-only — use `db.transaction(async (tx) =>
{ … })` everywhere.**
The runtime client (post template-hardening 2026-05-23) uses
`neon-serverless` + WebSocket Pool, which doesn't expose `.batch()`.
Transactions are semantically stronger anyway — real Postgres
BEGIN/COMMIT vs neon-http's pseudo-atomic batched HTTP request.

**4. `SELECT FOR UPDATE` does not lock when zero rows match.**
For "at most one X per Y" invariants, use a partial UNIQUE INDEX +
INSERT with try/catch on 23505. The UNIQUE constraint is your
serialization point; `FOR UPDATE` is a no-op on an empty result set,
giving false confidence. Surfaced on BetFrnd's `createSignal` race
(2026-05-21).

**5. Friendly `ApiError` pre-check + UNIQUE as defense-in-depth.**
When a DB UNIQUE column is reachable from a user-facing service, add an
explicit pre-check that throws a domain-specific `ApiError` code BEFORE
the INSERT. The UNIQUE stays in place to catch the concurrent-write
race; the pre-check gives users a friendly message in the
non-concurrent case (instead of "raw Postgres 23505 / duplicate key").

### Auth conventions

**6. BetterAuth `additionalFields` property names MUST be camelCase**
even when the SQL column is snake_case. Drizzle's BetterAuth adapter
looks up additionalFields by JS property name. If `auth.user.additionalFields`
declares `isOver18` but the schema declares `is_over_18: boolean(…)`,
every signup fails with a misleading "field does not exist in schema"
error. Alias the column:

```ts
// ✓ Right — JS key matches additionalFields declaration; SQL column
//   stays snake_case via the column alias.
isOver18: boolean("is_over_18").default(false).notNull(),
```

### Webhook conventions

**7. One webhook URL = many event types.**
A single Stripe webhook endpoint subscribes to N event types; the
template's `webhook_event.id` UNIQUE handles idempotency for all of
them. Don't add a second endpoint per concern — doubles the config
surface (signing secret, idempotency table, dashboard row) for no
behavioral benefit. Stripe Connect is the exception in some Dashboard
configurations; verify before adding a second endpoint. (See
docs/template/TEMPLATE.md "Stripe webhook endpoints" section.)

### Background-work conventions

**8. Boot long-lived workers from `apps/web/src/instrumentation.ts`.**
Not lazily on first request, not from a route handler, not from a
`once()` guard in some imported module. `register()` fires once per
server start, before the first request. Dynamic-import the worker so
the edge bundle stays clean. Gate on `NEXT_RUNTIME === "nodejs"` and
`NEXT_PHASE !== "phase-production-build"`.

### Dependency conventions

**9. Verify `engines.node` on the npm registry before pinning any
worker/runtime dep.**
Silent Node-version creep is real (BetFrnd hit this on pg-boss: minimum
bumped Node 16 → 20 → 22 within a year). The Replit deploy pins Node
20.18.1; a "latest" install can ship a broken deploy. Check via
`pnpm view <pkg> engines` against each major before bumping.

**10. Verify SaaS API quotas via `x-ratelimit-*` response headers, not
docs.**
BetFrnd's odds-api integration showed the docs intro page disagreed
with the marketing pricing page about quotas. The actual response
headers from a real request are the only source of truth. Verify
before locking polling cadence in a plan.

### Plan-review conventions

**11. Plan reviewers must read the cited file, not the plan's claim
about it.**
A plan saying "matches existing pattern X in file Y" is a hypothesis,
not a fact. The reviewer's job is to verify. BetFrnd's sports-3a plan
claimed "no CHECK on kind, same as wallet" but `wallet.ts:86-89`
actually did have a CHECK constraint on `wallet_transaction.kind`.
Cheap to mis-state, cheap to verify; verify.

## Testing conventions

**Two-layer test convention** (also worth knowing, not numbered above):

- **Unit tests** in `__tests__/` cover pre-transaction validation,
  authorization checks, input-shape parsing, and any branch that doesn't
  touch a real DB transaction. Mock-friendly. Run via `pnpm test`.
- **`/mlabs-qa`** runs the in-transaction success paths and any spec
  that requires real Postgres (FOR UPDATE timing, partial UNIQUE INDEX
  contention, raw SQL semantics). Mark these in service tests with a
  `describe.skip("[deferred to /mlabs-qa]", ...)` block enumerating
  scenario names — they're documentation of the test surface even when
  unit-skipped.

Pattern reaffirmed across BetFrnd Sprints 3c, 4a, 4b, 5b.

## Sprint-planning conventions

**Sprint-N-stubs-Sprint-(N+1)-gate pattern** (also worth knowing, not
numbered above):

When a feature's release order requires a precondition the next sprint
will own (e.g. "Sprint 6 fills in Stripe Connect OAuth → Sprint 5b's
seller signal-creation needs the onboarded boolean to exist"), the
earlier sprint plants:
  - the schema column (`user.stripe_connect_onboarded boolean DEFAULT false`)
  - the gate (service throws `signals.connect_not_onboarded` if false)
  - a UI placeholder (disabled CTA labeled "Connect Stripe (Sprint 6)")

Sprint N+1 then fills the gate without a service-signature refactor.
Companion: `scripts/dev-flip-<feature>.ts` for QA-time toggling until
the real seam exists.

## A loose end

AGENTS.md's "pause on ambiguity" list mentions
`src/config/brand.ts` / `src/config/design.ts` as the rebrand layer
paths. Post-monorepo (0006), the actual files are at
`packages/config/src/brand.ts` and `packages/config/src/design.ts`.
The behavior is unchanged (those files ARE the rebrand layer); the
path in AGENTS.md is stale. Worth a one-line fix in a follow-up PR;
not addressed here to keep this ADR focused.

## Sources

These conventions were extracted from BetFrnd's `learnings.jsonl`
(2026-05-13 → 2026-05-23, ~70 usable entries) and
`docs/template/TEMPLATE.md` (29 recommendations). The full extraction
log is in `.mstack/reviews/2026-05-23-template-hardening.md`.
