// @aira/db — Drizzle schema + Neon client factory.
//
// Subpath imports are the supported surface:
//   - @aira/db/schema  — table definitions (universal, no server-only)
//   - @aira/db/client  — createDb({ databaseUrl }) factory (server-only)
//   - @aira/db/audit   — createAudit(db) + AuditMeta types (server-only)
//   - @aira/db/types   — typed jsonb payload shapes (universal)
//
// The barrel below re-exports the schema for convenience; importing the
// client or audit helper from the barrel is intentionally not supported so
// universal callers can read types without pulling in server-only modules.

export * from "./schema"
export type { NotificationBody, NotificationKind } from "./types"
