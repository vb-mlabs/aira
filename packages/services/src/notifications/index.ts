// Notifications domain — public surface. Cross-domain callers (other
// services, operations, contract tests) import from here; reaching into
// ./service directly is blocked by the no-restricted-imports rule in
// tooling/eslint-config (Phase 4 commit 2).

export {
  getFreshness,
  getUnreadCount,
  listInbox,
  markAllRead,
  markRead,
  createNotification,
  INBOX_LIMIT,
} from "./service"

export type {
  NotificationRow,
  MarkResult,
  CreateNotificationArgs,
} from "./service"
