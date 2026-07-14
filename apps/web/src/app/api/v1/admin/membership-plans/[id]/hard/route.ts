import { deleteMembershipPlanOp } from "@/server/operations/membership-plans"
export const runtime = "nodejs"
export const DELETE = deleteMembershipPlanOp.runFromRequest
