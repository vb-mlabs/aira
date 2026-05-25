// Stripe → app webhook. Bypasses auth (Stripe is server-to-server).
//
// Reads the raw request body for HMAC signature validation; constructEvent
// throws on mismatch and we return 400 — Stripe won't retry 4xx.
//
// Successful processing → 200. Any uncaught error → 500, which causes Stripe
// to retry with backoff. The next delivery hits webhook_event.id UNIQUE +
// onConflictDoNothing → returns 200 with no side effects. Two-layer
// idempotency.
//
// Local dev: this route is only reachable from Stripe's IPs in prod. For
// local testing run:
//   stripe listen --forward-to http://localhost:5000/api/stripe/webhook
// and copy the printed `whsec_…` into STRIPE_WEBHOOK_SECRET.
//
// runtime="nodejs" is explicit because this route uses the Stripe SDK's
// HMAC verification + the WebSocket Pool db client, both of which are
// Node-only. Next 16's auto-runtime-detection can wrongly land on edge
// for routes that look lightweight — pinning here is cheap insurance.
export const runtime = "nodejs"

import { getStripe, handleStripeEvent } from "@mlabs/services/billing"
import { db } from "@/lib/db"
import { env } from "@/config/env"
import { logger } from "@/lib/logger"

export async function POST(req: Request): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    logger.error("[stripe-webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing")
    return new Response("stripe not configured", { status: 500 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return new Response("missing signature", { status: 400 })
  }

  // Raw body for signature validation. Do NOT parse JSON first — the
  // signed payload includes whitespace that JSON.parse() would normalise.
  const body = await req.text()

  const stripe = getStripe(env.STRIPE_SECRET_KEY)

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    logger.warn("[stripe-webhook] signature mismatch", {
      err: err instanceof Error ? err.message : String(err),
    })
    return new Response("bad signature", { status: 400 })
  }

  try {
    await handleStripeEvent(db, event, stripe)
  } catch (err) {
    logger.error("[stripe-webhook] handler failed; Stripe will retry", {
      event_id: event.id,
      event_type: event.type,
      err: err instanceof Error ? err.message : String(err),
    })
    return new Response("processing error", { status: 500 })
  }

  return new Response(null, { status: 200 })
}
