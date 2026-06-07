// POST /api/v1/admin/users/[id]/role  { role: "end_user" | "admin" }
//
// changeRoleOp rejects super_admin targets (T5 review decision) and
// records the role change to audit_log.

import { changeRoleOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const POST = changeRoleOp.runFromRequest
