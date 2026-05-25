// Public surface of features/notifications.
//
// Server logic now lives in @mlabs/services/notifications — pages, dev
// seeds, and operations import from there. The Server Action shim at
// ./server-actions wraps the operations for "use client" callers (the
// notification list + item buttons). This barrel re-exports the UI
// components + shared body types only.

export { NotificationBell } from "./components/notification-bell"
export { NotificationList } from "./components/notification-list"
export type { NotificationBody, NotificationKind } from "./types"
