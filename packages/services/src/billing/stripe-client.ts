import "server-only"

// Lazy Stripe SDK construction. The secret is passed in by the caller —
// no env reads inside this package (AGENTS.md hard rule: env lives in
// apps/web/src/config/env.ts). Web layer wires `env.STRIPE_SECRET_KEY` from
// `@/config/env` and calls getStripe(env.STRIPE_SECRET_KEY).
//
// apiVersion intentionally omitted: the Stripe Node SDK pins its target
// wire version internally and Stripe maintains backward-compat against
// that. Pinning here is double-work that goes stale faster than the SDK.
// See ADR 0008 + the template-hardening 2026-05-23 review.

import Stripe from "stripe"

let _cached: { key: string; client: Stripe } | null = null

export function getStripe(secretKey: string): Stripe {
  if (!secretKey) {
    throw new Error(
      "[billing/stripe-client] STRIPE_SECRET_KEY is empty — Stripe flows require it.",
    )
  }
  if (_cached?.key === secretKey) return _cached.client
  const client = new Stripe(secretKey, {
    typescript: true,
  })
  _cached = { key: secretKey, client }
  return client
}

// Re-export the Stripe namespace for downstream typing (Stripe.Event etc.).
export type { Stripe }
