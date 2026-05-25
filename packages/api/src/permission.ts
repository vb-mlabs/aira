// Permission union — kept minimal on purpose. The current product surface
// only needs to distinguish "any authed user" from "admin"; growing this
// into a full string-keyed ACL is straightforward when the second axis
// appears (e.g. per-tenant scopes, feature flags). Don't pre-build it.
//
// Operation definitions declare a `permission` field; defineOperation()
// gates execution by comparing the caller's role to the required permission.

export type Permission = "user" | "admin"
