import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { cities } from "./cities"

export const sponsorshipTiers = pgTable(
  "sponsorship_tier",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    city_id: text("city_id")
      .notNull()
      .references(() => cities.id),
    name: text("name").notNull(),
    priority: integer("priority").notNull(),
    /** Maps this tier to one of three fixed listing-page display slots.
     *  Values: 'top' | 'mid' | 'regular'. Enforced by CHECK constraint
     *  (see below). Admins pick per tier; the migration seeded every
     *  existing row to 'regular' so admins must re-classify post-deploy. */
    display_slot: text("display_slot").notNull(),
    active: boolean("active").notNull().default(true),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("st_city_priority_idx").on(table.city_id, table.priority),
    check("st_priority_check", sql`${table.priority} > 0`),
    check(
      "st_display_slot_check",
      sql`${table.display_slot} IN ('top', 'mid', 'regular')`,
    ),
  ],
)
