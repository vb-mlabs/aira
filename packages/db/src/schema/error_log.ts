// Persisted error log — every logger.error() also writes a row here so
// post-incident analysis survives Replit's ephemeral logs.
//
// Per outside-voice critique: Replit logs are ephemeral, so
// without persistence we lose evidence the moment the VM restarts.

import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"

export const error_log = pgTable(
  "error_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    level: text("level").notNull(), // "error" | "warn" — info doesn't persist
    message: text("message").notNull(),
    /** Optional context blob — stack trace, user ID, request ID, etc. */
    meta: jsonb("meta"),
    /** ISO-format timestamp; indexed for "errors in the last hour" queries. */
    at: timestamp("at").defaultNow().notNull(),
  },
  (table) => [
    index("error_log_level_idx").on(table.level),
    index("error_log_at_idx").on(table.at),
  ],
)
