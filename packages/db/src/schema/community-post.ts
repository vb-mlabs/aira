import { pgTable, pgEnum, text, integer, timestamp, index } from "drizzle-orm/pg-core"
import { user } from "./auth"

export const communityPostStatusEnum = pgEnum("community_post_status", [
  "pending",
  "approved",
  "expired",
  "rejected",
])

export const communityPost = pgTable(
  "community_post",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    /** Optional contact details surfaced on the public board so signed-in
     *  viewers can reach the author directly (Post-on-AIRA rebrand). */
    phone: text("phone"),
    email: text("email"),
    status: communityPostStatusEnum("status").notNull().default("pending"),
    /** Set on approval to now() + posts_expiry_days. NULL while pending/rejected. */
    expires_at: timestamp("expires_at"),
    /** Admin-only context for a rejection. Never exposed in public payloads. */
    rejected_reason: text("rejected_reason"),
    /** Denormalized count of post_interest rows. Maintained in addInterest /
     *  removeInterest so the public board can show "X helping" without a
     *  subquery per row. */
    interest_count: integer("interest_count").notNull().default(0),
    approved_at: timestamp("approved_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("community_post_status_created_idx").on(table.status, table.created_at),
    index("community_post_user_idx").on(table.user_id),
  ],
)
