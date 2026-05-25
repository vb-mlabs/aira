// In-app notifications. One row per user-visible event. read_at = null is the
// truth for "unread"; we don't carry a separate boolean to avoid drift.
//
// Polling, not realtime. Index supports the two hot queries:
//   - unread count for the bell:        WHERE user_id=$1 AND read_at IS NULL
//   - inbox listing, newest first:      WHERE user_id=$1 ORDER BY created_at DESC

import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"
import { user } from "./auth"
import type { NotificationBody } from "../types"

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Discriminator that mirrors NotificationBody["kind"] — duplicated for
     *  SQL-side filtering (jsonb path queries are clumsy). */
    type: text("type").notNull(),
    /** Typed payload — see NotificationBody in @mlabs/db/types. */
    body: jsonb("body").$type<NotificationBody>().notNull(),
    read_at: timestamp("read_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_read_idx").on(table.user_id, table.read_at),
    index("notifications_user_created_idx").on(table.user_id, table.created_at),
  ],
)
