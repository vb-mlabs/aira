// Admin types moved to @aira/validators/admin (single source for web RSC,
// web Client Components, mobile, and /api/v1/admin/* routes). This file
// re-exports for source-compat — UI imports under `@/features/admin`
// keep working without churn.

export {
  ADMIN_PAGE_SIZE,
  ADMIN_AUDIT_PAGE_SIZE,
  type AdminAuditRow,
  type AdminUserRow,
  type AdminUsersFilters,
  type UserRole,
} from "@aira/validators/admin"
