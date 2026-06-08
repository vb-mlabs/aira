// Pre-launch waitlist signups from the marketing page.
//
// One table serves both consumer signups (email only) and business signup
// requests (full contact form). The `type` column discriminates the two;
// the composite UNIQUE(email, type) lets the same email appear once as
// 'consumer' and once as 'business'. Business-specific columns are nullable
// and always NULL for consumer rows.
//
// `source` records the capture point (hero form, footer form, business CTA,
// etc.) and is validated by both a Zod enum at the boundary AND a CHECK
// constraint at the DB. `confirmed_at` is reserved for a future double-opt-in
// flow — left nullable, never set in MVP.

import {
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const waitlist = pgTable(
  "waitlist",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** 'consumer' | 'business'. Default 'consumer' so existing rows are unaffected. */
    type: text("type").notNull().default("consumer"),
    email: text("email").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    /** Reserved for future double-opt-in. Never set in MVP. */
    confirmed_at: timestamp("confirmed_at"),
    /** Capture point. New values must be added to the CHECK constraint
     *  AND the matching Zod enum in @aira/validators/waitlist. */
    source: text("source").notNull().default("marketing-hero"),
    // ── Business-signup fields (NULL for consumer rows) ──────────────────
    full_name: text("full_name"),
    business_name: text("business_name"),
    phone: text("phone"),
    /** 'phone' | 'whatsapp' | 'email' */
    preferred_contact: text("preferred_contact"),
    /** 'morning' | 'afternoon' | 'evening' | 'anytime' */
    preferred_time: text("preferred_time"),
  },
  (table) => [
    // Composite unique: same email can appear once as consumer, once as business.
    uniqueIndex("waitlist_email_type_unique").on(table.email, table.type),
    // Explicit index on email for future admin prefix search.
    index("waitlist_email_idx").on(table.email),
    // Admin "recent signups" view — desc on the timestamp.
    index("waitlist_created_idx").on(table.created_at),
    // Defense-in-depth: keep DB and Zod in sync.
    check(
      "waitlist_type_check",
      sql`${table.type} IN ('consumer', 'business')`,
    ),
    check(
      "waitlist_source_check",
      sql`${table.source} IN ('marketing-hero', 'marketing-footer', 'business-mailto', 'business-listing-cta')`,
    ),
    check(
      "waitlist_preferred_contact_check",
      sql`${table.preferred_contact} IS NULL OR ${table.preferred_contact} IN ('phone', 'whatsapp', 'email')`,
    ),
    check(
      "waitlist_preferred_time_check",
      sql`${table.preferred_time} IS NULL OR ${table.preferred_time} IN ('morning', 'afternoon', 'evening', 'anytime')`,
    ),
  ],
)
