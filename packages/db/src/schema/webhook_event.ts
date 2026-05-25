// Generic webhook event log + idempotency layer.
//
// Used by Stripe (and any other webhook-driven integration) to dedupe
// re-deliveries: the upstream provider's immutable event id is the primary
// key; an INSERT ... ON CONFLICT DO NOTHING + RETURNING tells the handler
// whether this is a fresh event or a duplicate.
//
// Pattern (see packages/services/src/billing/webhook.ts):
//
//   const inserted = await db
//     .insert(webhook_event)
//     .values({ id: event.id, event_type: event.type, raw_payload: event.data })
//     .onConflictDoNothing({ target: webhook_event.id })
//     .returning({ id: webhook_event.id })
//   if (inserted.length === 0) return // duplicate — already handled
//   // ...dispatch by event_type
//
// raw_payload is intentionally jsonb (not "event"-typed): the same table
// serves any webhook source. Forks that want strict types can narrow at
// the handler boundary, not at the schema.

import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"

export const webhook_event = pgTable(
  "webhook_event",
  {
    // Upstream provider's event id (Stripe: evt_xxx). Immutable and unique
    // per source, so it doubles as our idempotency key.
    id: text("id").primaryKey(),
    // Event type discriminator (Stripe: "checkout.session.completed",
    // "charge.succeeded", etc.). Indexed for ad-hoc audit queries.
    event_type: text("event_type").notNull(),
    // Wall-clock when we recorded the event. Receipt timestamp, not the
    // provider's `created` field — keeps the audit trail honest.
    processed_at: timestamp("processed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // Raw event payload — preserved for debugging + replay. Free-form jsonb
    // because the same table serves any webhook source.
    raw_payload: jsonb("raw_payload").notNull(),
  },
  (table) => [
    index("webhook_event_event_type_idx").on(table.event_type),
    index("webhook_event_processed_at_idx").on(table.processed_at),
  ],
)
