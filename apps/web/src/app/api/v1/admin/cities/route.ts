import { listCitiesAdminOp, createCityOp } from "@/server/operations/cities-admin"

export const runtime = "nodejs"

export const GET = listCitiesAdminOp.runFromRequest
export const POST = createCityOp.runFromRequest
