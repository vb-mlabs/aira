import { restoreBusinessOp } from "@/server/operations/businesses-admin"

export const runtime = "nodejs"

export const POST = restoreBusinessOp.runFromRequest
