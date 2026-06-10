import { updateMembershipPlanOp, deactivateMembershipPlanOp } from "@/server/operations/membership-plans"
export const runtime = "nodejs"
export const PATCH = updateMembershipPlanOp.runFromRequest
export const DELETE = deactivateMembershipPlanOp.runFromRequest
