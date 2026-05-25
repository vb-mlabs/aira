// Public surface of features/admin. Server entry points stay under
// ./server — keep them out of this barrel so client components don't
// accidentally import them.

export { UserList } from "./components/user-list"
export { UserDetail } from "./components/user-detail"
export { AuditTable } from "./components/audit-table"
export type {
  AdminUserRow,
  AdminAuditRow,
  UserRole,
  AdminUsersFilters,
} from "./types"
