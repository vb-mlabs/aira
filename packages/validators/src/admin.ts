// Admin console — shared shapes between web RSC, web Client Components,
// mobile (future), and the /api/v1/admin/* route handlers.
//
// "UserRole" here is the admin-UI toggle surface (end_user | admin); the
// full DB enum also includes super_admin, which the listings + detail
// queries bucket under "admin" for display. super_admin promotion is
// bootstrap-env-only today; surfacing it as a flippable role would risk
// accidental demotion. See packages/db/src/schema/auth.ts.

import { z } from "zod";

export const ADMIN_PAGE_SIZE = 50;
export const ADMIN_AUDIT_PAGE_SIZE = 100;

export const UserRoleSchema = z.enum(["end_user", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AdminUserRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  email_verified: z.boolean(),
  image: z.string().nullable(),
  role: UserRoleSchema,
  banned_at: z.string().nullable(),
  banned_reason: z.string().nullable(),
  created_at: z.string(),
});
export type AdminUserRow = z.infer<typeof AdminUserRowSchema>;

export const AdminAuditRowSchema = z.object({
  id: z.string(),
  actor_id: z.string().nullable(),
  actor_email: z.string().nullable(),
  action: z.string(),
  target_type: z.string().nullable(),
  target_id: z.string().nullable(),
  metadata: z.unknown(),
  at: z.string(),
});
export type AdminAuditRow = z.infer<typeof AdminAuditRowSchema>;

export const AdminUsersFiltersSchema = z
  .object({
    q: z.string().optional(),
    role: z.union([UserRoleSchema, z.literal("all")]).optional(),
    banned: z.enum(["all", "banned", "active"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  .strict();
export type AdminUsersFilters = z.infer<typeof AdminUsersFiltersSchema>;

export const ListUsersOutputSchema = z.object({
  items: z.array(AdminUserRowSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type ListUsersOutput = z.infer<typeof ListUsersOutputSchema>;

export const UserDetailInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type UserDetailInput = z.infer<typeof UserDetailInputSchema>;

export const UserDetailOutputSchema = z.object({
  user: AdminUserRowSchema.nullable(),
  audit: z.array(AdminAuditRowSchema),
});
export type UserDetailOutput = z.infer<typeof UserDetailOutputSchema>;

export const ListAuditInputSchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    /** ISO 8601 — inclusive. */
    since: z.string().optional(),
    /** ISO 8601 — exclusive. */
    until: z.string().optional(),
  })
  .strict();
export type ListAuditInput = z.infer<typeof ListAuditInputSchema>;

export const ListAuditOutputSchema = z.object({
  items: z.array(AdminAuditRowSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type ListAuditOutput = z.infer<typeof ListAuditOutputSchema>;
