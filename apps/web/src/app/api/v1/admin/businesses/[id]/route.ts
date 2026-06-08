import { updateBusinessOp } from "@/server/operations/businesses-admin"

export const runtime = "nodejs"

export const PATCH = updateBusinessOp.runFromRequest
