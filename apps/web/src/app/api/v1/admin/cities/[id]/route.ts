import { updateCityOp } from "@/server/operations/cities-admin"

export const runtime = "nodejs"

export const PATCH = updateCityOp.runFromRequest
