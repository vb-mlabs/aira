// Public surface of features/admin. Server entry points stay under
// ./server — keep them out of this barrel so client components don't
// accidentally import them.

export { AdminBadge } from "./components/admin-badge"
export type { AdminBadgeVariant } from "./components/admin-badge"
export { UserList } from "./components/user-list"
export { UserDetail } from "./components/user-detail"
export { AuditTable } from "./components/audit-table"
export { FilterBar } from "./audit"
export type {
  AdminUserRow,
  AdminAuditRow,
  UserRole,
  AdminUsersFilters,
} from "./types"
