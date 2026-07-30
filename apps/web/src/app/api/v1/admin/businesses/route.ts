import {
  createBusinessAdminOp,
  listAllBusinessesAdminOp,
} from "@/server/operations/businesses-admin"

export const runtime = "nodejs"

export const GET = listAllBusinessesAdminOp.runFromRequest
export const POST = createBusinessAdminOp.runFromRequest
