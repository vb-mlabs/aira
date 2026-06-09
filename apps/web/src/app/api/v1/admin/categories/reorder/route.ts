import { reorderCategoriesOp } from "@/server/operations/categories-admin"

export const runtime = "nodejs"

export const POST = reorderCategoriesOp.runFromRequest
