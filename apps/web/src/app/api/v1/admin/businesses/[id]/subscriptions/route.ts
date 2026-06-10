import { listSubscriptionsOp, createSubscriptionOp } from "@/server/operations/business-subscriptions"
export const runtime = "nodejs"
export const GET = listSubscriptionsOp.runFromRequest
export const POST = createSubscriptionOp.runFromRequest
