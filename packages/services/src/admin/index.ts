// Admin domain — public surface. Cross-domain callers (ops, other services)
// import from here; reaching into ./service directly is blocked by the
// no-restricted-imports rule.

export {
  changeRole,
  banUser,
  unbanUser,
  preparePasswordReset,
  sendAdminNotification,
  sendBusinessOwnerBroadcast,
} from "./service"

export type {
  AdminResult,
  PasswordResetTarget,
  BusinessOwnerBroadcastArgs,
  BusinessOwnerBroadcastResult,
} from "./service"

export {
  listUsers,
  getUserDetail,
  listAudit,
} from "./queries"
