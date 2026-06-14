import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { communityPost } from "./community-post"

export const postInterest = pgTable(
  "post_interest",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    post_id: text("post_id")
      .notNull()
      .references(() => communityPost.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Optional short note from the responder, ≤300 chars enforced by Zod
     *  at the boundary. The post author sees this verbatim. */
    message: text("message"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("post_interest_uq").on(table.post_id, table.user_id),
    index("post_interest_post_idx").on(table.post_id, table.created_at),
  ],
)
