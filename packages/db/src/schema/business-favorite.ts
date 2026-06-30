// Personal favorites join: a signed-in user marks a business as one
// they want to revisit. (business_id, user_id) is unique, so re-favoriting
// is a no-op via ON CONFLICT DO NOTHING at the service layer. Secondary
// index on (user_id, created_at) powers the "most recent first" sort on
// /account/favorites.
//
// Cascade on both FKs: hard-deleting a business or anonymising a user
// removes their related fav rows automatically — no manual cleanup path
// needed.

import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"
import { user } from "./auth"
import { businesses } from "./businesses"

export const businessFavorite = pgTable(
  "business_favorite",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("business_favorite_uq").on(table.business_id, table.user_id),
    index("business_favorite_user_idx").on(table.user_id, table.created_at),
  ],
)
