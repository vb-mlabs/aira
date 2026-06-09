import { pgTable, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { businesses } from "./businesses"

export const businessImages = pgTable(
  "business_image",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bi_sort_idx").on(table.business_id, table.sort_order),
    index("bi_business_idx").on(table.business_id),
  ],
)
