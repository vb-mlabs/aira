import { archiveBusinessOp } from "@/server/operations/businesses-admin"

export const runtime = "nodejs"

export const POST = archiveBusinessOp.runFromRequest
