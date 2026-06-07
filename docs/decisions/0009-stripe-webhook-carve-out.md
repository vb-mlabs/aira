# 0009 — Stripe webhook URL carve-out

**Status:** accepted
**Date:** 2026-06-07
**Related:** [0007-service-layer.md](./0007-service-layer.md), [docs/api-versioning.md](../api-versioning.md), [.mstack/reviews/2026-06-07-rest-api-migration.md](../../.mstack/reviews/2026-06-07-rest-api-migration.md)

## Context

The 2026-06-07 REST API migration locked the rule "every feature is reachable over `/api/v1/*` so web and mobile consume one contract" ([CLAUDE.md](../../CLAUDE.md) "API surface"). One existing endpoint can't follow that rule:

- **`POST /api/stripe/webhook`** — Stripe's dashboard pins this URL inside the Stripe account. Moving the route to `/api/v1/stripe/webhook` (or any other path) is a vendor reconfiguration, not a refactor — every running deploy of every fork would 404 webhooks until each Stripe project's URL was updated by hand. Versioning here would also mean breaking every integration on every `/api/v2/*` rollout, which defeats Stripe's expectation of a stable webhook target.

## Decision

`POST /api/stripe/webhook` lives outside `/api/v1/*` and is **exempt from the versioning rule**. It still complies with everything else the migration locked in:

- **Service-layer rule preserved.** `apps/web/src/app/api/stripe/webhook/route.ts` is the only file outside `apps/web/src/server/operations/` and `apps/web/src/app/api/v1/` that imports from `@aira/services`. The handler stays a thin adapter — signature verification + lookup + delegation to a service function — same as any `/api/v1/*` route. The "no business logic outside services" half of [ADR 0007](./0007-service-layer.md) is fully honored.
- **No Server Actions, no `runFromAction`.** The webhook receives a `POST` from Stripe and returns a status response; there is no client-side caller, no Server Action surface, no Server Action plumbing in `packages/api`.
- **Only one route exempt.** Future webhook receivers (Twilio, Postmark inbound, etc.) follow the same shape: a single `/api/<vendor>/<event>` route, vendor-owned URL, importing from `@aira/services`, no other carve-outs from the migration's rules.

## Consequences

### Positive

- Stripe webhook URL stability for forks and deploys — no broken integrations on the v1 → v2 rollout.
- Pattern documented once so future vendor webhooks don't need a fresh decision.

### Negative

- The CLAUDE.md "one REST API" rule is no longer absolute; the carve-out has to be explained in onboarding. The size of the carve-out (one route, vendor-owned URL) makes this acceptable.
- A future contributor might add a non-webhook route under `/api/<vendor>/` looking for the carve-out — review must catch that. The lefthook `check-no-server-actions` hook does NOT cover this path expansion; PR review is the only gate.

## Operational notes

- When adding a new vendor webhook receiver: place the route at `/api/<vendor>/<event>/route.ts`. Document the inbound URL in `docs/api-versioning.md` alongside the `/api/v1/*` table. Mention the carve-out in the ADR for that integration so future readers know which rule it lives under.
- When changing the Stripe webhook's body shape: do NOT version the URL. Coordinate with Stripe (event versioning is Stripe-side); the route accepts the new shape additively.
