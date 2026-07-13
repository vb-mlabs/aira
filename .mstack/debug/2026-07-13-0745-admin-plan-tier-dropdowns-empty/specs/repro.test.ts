// @vitest-environment node
//
// Failing spec — pins the root cause of the admin plan/tier dropdown bug.
//
// Bug: on /admin/businesses/[id], the "Add subscription" dialog's plan
// dropdown and the "Add sponsorship" dialog's tier dropdown both render
// with zero options for admins. The dialog components silently swallow
// the fetch error (subscriptions-section.tsx:261, sponsorships-section.tsx:236),
// so the failure surfaces as an empty <select> instead of an error toast.
//
// Root cause: listMembershipPlansOp and listSponsorshipTiersOp both declare
// `permission: "super_admin"`. Every other admin op in
// apps/web/src/server/operations/businesses-admin.ts uses `permission:
// "admin"`. The permission hierarchy is super_admin ≥ admin ≥ user
// (packages/api/src/permission.ts:15-19), so an admin caller cannot reach
// a super_admin-gated op — the op returns 403 and the client swallows it.
//
// The two write ops per file (create/update/deactivate) legitimately want
// super_admin — they change what plans/tiers exist. But LIST is a read
// admins need to consume in normal admin workflows (attach an existing
// plan to a business). LIST should be `admin`.
//
// This spec asserts the *intended* permission level on both LIST ops.
// Currently fails; passes after the fix.

import { describe, expect, it } from "vitest"
import { listMembershipPlansOp } from "@/server/operations/membership-plans"
import { listSponsorshipTiersOp } from "@/server/operations/sponsorship-tiers"

describe("admin can list plans and tiers to attach them to businesses", () => {
  it("listMembershipPlansOp is admin-gated, not super_admin-gated", () => {
    // Fails as of this debug run — currently "super_admin", which locks
    // regular admins out of the plan dropdown on /admin/businesses/[id].
    expect(listMembershipPlansOp.schema.permission).toBe("admin")
  })

  it("listSponsorshipTiersOp is admin-gated, not super_admin-gated", () => {
    // Same failure mode for the tier dropdown in the sponsorship card.
    expect(listSponsorshipTiersOp.schema.permission).toBe("admin")
  })
})
