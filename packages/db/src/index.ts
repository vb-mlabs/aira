// @mlabs/db — Drizzle schema + Neon client factory.
//
// Subpath imports are the supported surface:
//   - @mlabs/db/schema  — table definitions (universal, no server-only)
//   - @mlabs/db/client  — createDb({ databaseUrl }) factory (server-only)
//   - @mlabs/db/audit   — createAudit(db) + AuditMeta types (server-only)
//   - @mlabs/db/types   — typed jsonb payload shapes (universal)
//
// The barrel below re-exports the schema for convenience; importing the
// client or audit helper from the barrel is intentionally not supported so
// universal callers can read types without pulling in server-only modules.

export * from "./schema"
export type { NotificationBody, NotificationKind } from "./types"
