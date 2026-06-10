import { createBusinessAdminOp } from "@/server/operations/businesses-admin"

export const runtime = "nodejs"

export const POST = createBusinessAdminOp.runFromRequest
