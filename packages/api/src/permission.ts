// Permission union — three privilege levels. Hierarchy: super_admin ≥ admin
// ≥ user. The second axis (privilege level) is what showed up after the W8
// auth design landed `requireSuperAdmin()` without an api-package side. Don't
// pre-build a third axis (per-tenant scopes, feature flags); add it when a
// real second dimension appears.
//
// Operation definitions declare a `permission` field; defineOperation() gates
// execution by comparing the caller's level to the required level via
// `hasPermission()`. Higher levels satisfy lower required levels — a
// super_admin caller passes any `permission: "admin"` gate, an admin passes
// any `permission: "user"` gate.

export type Permission = "user" | "admin" | "super_admin"

const PERMISSION_LEVEL: Record<Permission, number> = {
  user: 0,
  admin: 1,
  super_admin: 2,
}

/** True when `actual` meets or exceeds `required` in the hierarchy. */
export function hasPermission(
  actual: Permission,
  required: Permission,
): boolean {
  return PERMISSION_LEVEL[actual] >= PERMISSION_LEVEL[required]
}
