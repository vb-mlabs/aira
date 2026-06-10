import { listMembershipPlansOp, createMembershipPlanOp } from "@/server/operations/membership-plans"
export const runtime = "nodejs"
export const GET = listMembershipPlansOp.runFromRequest
export const POST = createMembershipPlanOp.runFromRequest
