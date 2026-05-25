// Shared types for features/admin — used by server queries + UI.

export type UserRole = "user" | "admin"

export interface AdminUserRow {
  id: string
  name: string
  email: string
  email_verified: boolean
  image: string | null
  role: UserRole
  banned_at: string | null
  banned_reason: string | null
  created_at: string
}

export interface AdminAuditRow {
  id: string
  actor_id: string | null
  actor_email: string | null
  action: string
  target_type: string | null
  target_id: string | null
  metadata: unknown
  at: string
}

export interface AdminUsersFilters {
  q?: string
  role?: UserRole | "all"
  banned?: "all" | "banned" | "active"
  page?: number
}

export const ADMIN_PAGE_SIZE = 50
export const ADMIN_AUDIT_PAGE_SIZE = 100
