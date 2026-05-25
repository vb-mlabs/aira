import "server-only"

// Generic Stripe webhook event dispatcher.
//
// Forks extend this by adding `case` branches above the `default:` for the
// event types they actually handle (e.g. checkout.session.completed,
// account.updated). The default branch records the event in webhook_event
// and exits — Stripe won't retry an event that 200s, and the audit row
// preserves the payload for replay/debugging if a handler is added later.
//
// Idempotency:
//   webhook_event.id is the Stripe event id (immutable). We INSERT...ON
//   CONFLICT DO NOTHING + RETURNING; zero returned rows means we've
//   already processed this delivery (idempotent re-delivery from Stripe).
//   Forks can layer additional belt-and-braces idempotency at the domain
//   service boundary (e.g. unique reference_id on the credited ledger row).
//
// Error semantics:
//   Errors propagate out of handleStripeEvent. The route handler at
//   apps/web/src/app/api/stripe/webhook/route.ts (added by the fork)
//   should turn them into a 5xx so Stripe retries with exponential
//   backoff. The next delivery hits the idempotency check and exits
//   cleanly if the prior run partially succeeded.
//
// Caller wiring (sketch — lands in fork's webhook route):
//
//   import { handleStripeEvent } from "@mlabs/services/billing"
//   import { getStripe } from "@mlabs/services/billing"
//   import { env } from "@/config/env"
//
//   export async function POST(req: Request) {
//     const sig = req.headers.get("stripe-signature")
//     const body = await req.text()
//     const stripe = getStripe(env.STRIPE_SECRET_KEY!)
//     const event = stripe.webhooks.constructEvent(
//       body, sig!, env.STRIPE_WEBHOOK_SECRET!,
//     )
//     await handleStripeEvent(db, event, stripe)
//     return new Response(null, { status: 200 })
//   }

import type { Database } from "@mlabs/db/client"
import { webhook_event } from "@mlabs/db/schema"
import type { Stripe } from "stripe"

/**
 * Dispatch a Stripe webhook event. Forks add `case` branches above the
 * `default:` for the event types they handle.
 *
 * `stripe` is optional — pass it from the route handler when any case
 * needs to expand objects (balance_transaction, charge details) via the
 * REST API. Cases that don't expand can ignore it.
 */
export async function handleStripeEvent(
  db: Database,
  event: Stripe.Event,
  stripe?: Stripe,
): Promise<void> {
  // Idempotency: record the event id atomically before doing any work.
  // ON CONFLICT DO NOTHING + RETURNING reports whether this is a fresh
  // event (1 row) or a re-delivery (0 rows).
  const inserted = await db
    .insert(webhook_event)
    .values({
      id: event.id,
      event_type: event.type,
      raw_payload: event.data.object as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: webhook_event.id })
    .returning({ id: webhook_event.id })

  if (inserted.length === 0) {
    // Duplicate delivery — already handled. Stripe will see a 2xx and
    // stop retrying.
    return
  }

  switch (event.type) {
    // ── Forks add handlers above this line ───────────────────────────
    //
    // Example shape:
    //
    //   case "checkout.session.completed": {
    //     const session = event.data.object as Stripe.Checkout.Session
    //     await handleCheckoutCompleted(db, session, stripe)
    //     return
    //   }
    //
    // ─────────────────────────────────────────────────────────────────
    default:
      // Recorded above but not actioned. Stripe won't retry (we 200),
      // we won't double-process, and the audit trail is intact for
      // replay if a handler is added later.
      void stripe // mark as intentionally unused in the empty template
      return
  }
}
