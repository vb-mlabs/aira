// Audit log — every state-changing admin action lands here.
// Write the audit BEFORE the action, so a failed audit blocks
// the action (audit() helper enforces this). Metadata is a typed allowlist
// (see audit.ts) — never free-form strings, so anonymize-in-place stays GDPR-safe.

import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"
import { user } from "./auth"

export const audit_log = pgTable(
  "audit_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actor_id: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    target_type: text("target_type"),
    target_id: text("target_id"),
    // Typed allowlist — see AuditMeta in src/lib/db/audit.ts
    metadata: jsonb("metadata"),
    at: timestamp("at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_actor_idx").on(table.actor_id),
    index("audit_log_target_idx").on(table.target_type, table.target_id),
    index("audit_log_at_idx").on(table.at),
  ],
)
