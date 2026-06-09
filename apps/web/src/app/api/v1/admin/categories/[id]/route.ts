import { updateCategoryOp } from "@/server/operations/categories-admin"

export const runtime = "nodejs"

export const PATCH = updateCategoryOp.runFromRequest
