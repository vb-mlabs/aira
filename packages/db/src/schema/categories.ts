import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { cities } from "./cities"

export const categories = pgTable(
  "category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    city_id: text("city_id")
      .notNull()
      .references(() => cities.id),
    parent_id: text("parent_id"), // self-FK set below via check; NULL = root
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    level: integer("level").notNull().default(1), // 1 = root, 2 = subcategory
    sort_order: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("category_city_level_sort_idx").on(
      table.city_id,
      table.level,
      table.sort_order,
    ),
    uniqueIndex("category_city_slug_idx").on(table.city_id, table.slug),
    check("category_level_check", sql`${table.level} IN (1, 2)`),
    check(
      "category_parent_level_check",
      sql`(${table.level} = 1 AND ${table.parent_id} IS NULL) OR (${table.level} = 2 AND ${table.parent_id} IS NOT NULL)`,
    ),
  ],
)
