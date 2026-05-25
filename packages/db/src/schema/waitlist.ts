// Pre-launch waitlist signups from the marketing page.
//
// One row per signup. (email) is unique — `ON CONFLICT (email) DO NOTHING`
// in the route handler is the truth for "already on the list". `source`
// records which capture point converted them (hero form, footer form,
// business mailto, etc.) and is validated by both a Zod enum at the
// boundary AND a CHECK constraint at the DB. `confirmed_at` is reserved
// for a future double-opt-in flow — left nullable, never set in MVP.

import { pgTable, text, timestamp, index, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const waitlist = pgTable(
  "waitlist",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    /** Reserved for future double-opt-in. Never set in MVP. */
    confirmed_at: timestamp("confirmed_at"),
    /** Capture point. New values must be added to the CHECK constraint
     *  AND the matching Zod enum in @aira/validators/waitlist. */
    source: text("source").notNull().default("marketing-hero"),
  },
  (table) => [
    // Unique constraint covers email lookups, but an explicit index documents
    // intent for future admin search (LIKE prefix, etc.).
    index("waitlist_email_idx").on(table.email),
    // Admin "recent signups" view — desc on the timestamp.
    index("waitlist_created_idx").on(table.created_at),
    // Defense-in-depth: keep DB and Zod in sync. Cheaper to fail at INSERT
    // than to debug a corrupted `source` value six months in.
    check(
      "waitlist_source_check",
      sql`${table.source} IN ('marketing-hero', 'marketing-footer', 'business-mailto')`,
    ),
  ],
)
