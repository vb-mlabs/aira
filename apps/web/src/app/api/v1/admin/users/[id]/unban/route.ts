// POST /api/v1/admin/users/[id]/unban

import { unbanUserOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const POST = unbanUserOp.runFromRequest
