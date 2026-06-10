import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { businesses } from "./businesses"
import { categories } from "./categories"
import { sponsorshipTiers } from "./sponsorship-tiers"

export const sponsorshipStatusEnum = pgEnum("sponsorship_status", [
  "scheduled",
  "active",
  "expired",
  "cancelled",
])

export const sponsorships = pgTable(
  "sponsorship",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    category_id: text("category_id")
      .notNull()
      .references(() => categories.id),
    tier_id: text("tier_id").references(() => sponsorshipTiers.id, {
      onDelete: "set null",
    }),
    status: sponsorshipStatusEnum("status").notNull().default("scheduled"),
    start_date: timestamp("start_date").notNull(),
    end_date: timestamp("end_date").notNull(),
    amount_cents: integer("amount_cents").notNull(),
    notes: text("notes"),
    recorded_by: text("recorded_by"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("sp_cat_status_dates_idx").on(
      table.category_id,
      table.status,
      table.start_date,
      table.end_date,
    ),
    index("sp_business_idx").on(table.business_id),
    index("sp_status_end_idx").on(table.status, table.end_date),
    check("sp_date_order_check", sql`${table.end_date} >= ${table.start_date}`),
    check("sp_amount_check", sql`${table.amount_cents} >= 0`),
  ],
)
