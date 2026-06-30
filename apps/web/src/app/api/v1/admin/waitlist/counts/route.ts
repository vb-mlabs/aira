// GET /api/v1/admin/waitlist/counts — admin-only. One grouped query
// returning { consumer, business } counts for the page header tiles.

import { getWaitlistCountsOp } from "@/server/operations/waitlist-admin"

export const runtime = "nodejs"

export const GET = getWaitlistCountsOp.runFromRequest
