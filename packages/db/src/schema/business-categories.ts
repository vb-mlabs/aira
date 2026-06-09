import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { businesses } from "./businesses"
import { categories } from "./categories"

export const businessCategories = pgTable(
  "business_category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    category_id: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bc_business_category_idx").on(table.business_id, table.category_id),
    index("bc_business_idx").on(table.business_id),
    index("bc_category_idx").on(table.category_id),
  ],
)
