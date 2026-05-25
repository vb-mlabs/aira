// Schema re-export point. Tables added per workstream:
//   W2: Better Auth tables (user, session, account, verification) + audit_log
//   W4: error_log
//   W6: notifications
//   W7: conversations, conversation_participants, messages
//   Template hardening (2026-05-23): webhook_event
//
// Note: Better Auth uses singular table names (user, session, etc.) — that's
// their convention; our own tables follow our convention (plural: audit_log,
// notifications, messages, etc.).

export * from "./auth"
export * from "./audit_log"
export * from "./error_log"
export * from "./notifications"
export * from "./messages"
export * from "./webhook_event"
