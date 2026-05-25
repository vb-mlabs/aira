// Admin domain — public surface. Cross-domain callers (ops, other services)
// import from here; reaching into ./service directly is blocked by the
// no-restricted-imports rule.

export {
  changeRole,
  banUser,
  unbanUser,
  preparePasswordReset,
  sendAdminNotification,
} from "./service"

export type { AdminResult, PasswordResetTarget } from "./service"
