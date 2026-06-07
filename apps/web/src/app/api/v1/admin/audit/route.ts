// GET /api/v1/admin/audit — global audit log with optional date filters +
// pagination. since/until are ISO 8601 strings at the wire (Zod boundary
// converts to Date inside the service).

import { listAuditOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const GET = listAuditOp.runFromRequest
