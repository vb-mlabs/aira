import { listCategoriesAdminOp, createCategoryOp } from "@/server/operations/categories-admin"

export const runtime = "nodejs"

export const GET = listCategoriesAdminOp.runFromRequest
export const POST = createCategoryOp.runFromRequest
