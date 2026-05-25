// User-to-user direct messages.
//
// Schema decisions (locked by /plan-eng-review on W7):
//
// 1. conversations.pair_key — deterministic "sorted(userA, userB).join('::')"
//    for 1:1 conversations. UNIQUE index gives us race-safe dedup via
//    INSERT ... ON CONFLICT DO NOTHING. Nullable so group conversations
//    (post-v1) can leave it unset.
//
// 2. conversations.last_message_at + last_message_preview — denormalized
//    inside the send transaction. Inbox listing is a single index scan with
//    no lateral join (kills the N+1 on per-row "latest message" lookup).
//
// 3. messages.sender_id ON DELETE SET NULL — Better Auth's anonymize-in-place
//    flow (W5 deleteAccount) doesn't actually DELETE the user row, so the
//    SET NULL clause is belt-and-suspenders: if a fork ever switches to row
//    deletion, message history survives with sender = "Deleted user".
//
// Polling cadence (no realtime):
//   /api/messages/conversations             — inbox list, 10s
//   /api/messages/conversations/[id]/messages — thread, 2s (cursor by ?after=)

import { pgTable, text, timestamp, index, primaryKey } from "drizzle-orm/pg-core"
import { user } from "./auth"

export const conversations = pgTable(
  "conversations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** sorted user-id pair joined by "::" for 1:1; null for groups (v2). */
    pair_key: text("pair_key").unique(),
    last_message_at: timestamp("last_message_at"),
    /** ≤200 chars; updated atomically inside the send transaction. */
    last_message_preview: text("last_message_preview"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("conversations_last_message_idx").on(table.last_message_at)],
)

export const conversation_participants = pgTable(
  "conversation_participants",
  {
    conversation_id: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joined_at: timestamp("joined_at").defaultNow().notNull(),
    /** null = never opened the conversation. Drives the unread count. */
    last_read_at: timestamp("last_read_at"),
  },
  (table) => [
    primaryKey({ columns: [table.conversation_id, table.user_id] }),
    index("conv_participants_user_idx").on(table.user_id, table.conversation_id),
  ],
)

export const messages = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    conversation_id: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sender_id: text("sender_id").references(() => user.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Composite for thread paging + cursor (created_at, id) ordering.
    index("messages_conv_created_idx").on(
      table.conversation_id,
      table.created_at,
    ),
  ],
)
