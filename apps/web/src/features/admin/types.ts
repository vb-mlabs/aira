// Shared types for features/admin — used by server queries + UI.

// UserRole is the admin-UI toggle surface — what the admin staff see and
// flip between in the user-management screen. The full DB role enum
// (packages/db/src/schema/auth.ts) also includes "super_admin", which is
// not exposed via this UI (super_admin promotion is bootstrap-env-only
// today). queries.ts buckets super_admin rows under "admin" for display
// purposes; the actual changeRole service rejects targets whose DB role is
// super_admin (see T5+ once super_admin exists).
export type UserRole = "end_user" | "admin"

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
