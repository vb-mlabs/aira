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
  resolveTargetUserIds,
  previewUserBroadcastCounts,
  resolveUserBroadcastAudience,
  sendUserBroadcast,
} from "./service"

export type {
  AdminResult,
  PasswordResetTarget,
  BusinessOwnerBroadcastArgs,
  BusinessOwnerBroadcastResult,
  UserBroadcastArgs,
  UserBroadcastResult,
} from "./service"

export {
  listUsers,
  getUserDetail,
  listAudit,
} from "./queries"
