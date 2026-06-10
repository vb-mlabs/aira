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
import { membershipPlans } from "./membership-plans"

export const paymentStatusEnum = pgEnum("payment_status", [
  "paid",
  "pending",
  "overdue",
])

export const businessSubscriptions = pgTable(
  "business_subscription",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    plan_id: text("plan_id").references(() => membershipPlans.id, {
      onDelete: "set null",
    }),
    payment_status: paymentStatusEnum("payment_status").notNull().default("pending"),
    start_date: timestamp("start_date").notNull(),
    end_date: timestamp("end_date").notNull(),
    amount_cents: integer("amount_cents").notNull(),
    payment_evidence_url: text("payment_evidence_url"),
    notes: text("notes"),
    recorded_by: text("recorded_by"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("bs_business_end_idx").on(table.business_id, table.end_date),
    index("bs_paid_end_idx")
      .on(table.payment_status, table.end_date)
      .where(sql`${table.payment_status} = 'paid'`),
    check("bs_date_order_check", sql`${table.end_date} >= ${table.start_date}`),
    check("bs_amount_check", sql`${table.amount_cents} >= 0`),
  ],
)
