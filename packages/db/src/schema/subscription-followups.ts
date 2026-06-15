import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { businessSubscriptions } from "./business-subscriptions"
import { user } from "./auth"

// F23′ — one row per admin call/attempt. The renewals queue is a derived
// view computed from business_subscription LEFT JOIN the latest row here
// (correlated subqueries — Drizzle's .orderBy() builder doesn't speak
// LATERAL JOIN per decision log 2026-06-10).
//
// outcome = 'paid' or scheduled_next > now() drops the subscription out of
// the queue. Audit log carries the same per-attempt record independently
// (business.subscription_followup variant).
export const followupOutcomeEnum = pgEnum("followup_outcome", [
  "called",
  "voicemail",
  "no_answer",
  "refused",
  "paid",
  "reschedule",
])

export const subscriptionFollowups = pgTable(
  "subscription_followup",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    subscription_id: text("subscription_id")
      .notNull()
      .references(() => businessSubscriptions.id, { onDelete: "cascade" }),
    actor_id: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    outcome: followupOutcomeEnum("outcome").notNull(),
    note: text("note"),
    // Only set when outcome = 'reschedule'. Drives the queue's "drop until
    // this passes" filter.
    scheduled_next: timestamp("scheduled_next"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // The "latest-per-subscription" correlated subquery in listQueue scans
    // this index.
    index("sf_subscription_created_idx").on(
      table.subscription_id,
      table.created_at,
    ),
    // Partial index — keeps the "due-for-followup" filter fast as the
    // table grows; most rows have scheduled_next IS NULL.
    index("sf_scheduled_next_idx")
      .on(table.scheduled_next)
      .where(sql`${table.scheduled_next} IS NOT NULL`),
  ],
)
