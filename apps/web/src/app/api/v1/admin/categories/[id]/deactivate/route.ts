import { deactivateCategoryOp } from "@/server/operations/categories-admin"

export const runtime = "nodejs"

export const POST = deactivateCategoryOp.runFromRequest
