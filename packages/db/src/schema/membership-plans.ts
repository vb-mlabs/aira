import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { cities } from "./cities"

export const membershipPlans = pgTable(
  "membership_plan",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    city_id: text("city_id")
      .notNull()
      .references(() => cities.id),
    name: text("name").notNull(),
    description: text("description"),
    price_cents: integer("price_cents").notNull(),
    duration_months: integer("duration_months").notNull(),
    active: boolean("active").notNull().default(true),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("mp_city_active_idx")
      .on(table.city_id)
      .where(sql`${table.active} = true`),
    check("mp_price_cents_check", sql`${table.price_cents} >= 0`),
    check("mp_duration_months_check", sql`${table.duration_months} > 0`),
  ],
)
