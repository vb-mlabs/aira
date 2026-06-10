import { updateSubscriptionOp, deleteSubscriptionOp } from "@/server/operations/business-subscriptions"
export const runtime = "nodejs"
export const PATCH = updateSubscriptionOp.runFromRequest
export const DELETE = deleteSubscriptionOp.runFromRequest
