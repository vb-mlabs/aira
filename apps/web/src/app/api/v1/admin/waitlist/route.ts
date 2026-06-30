// GET /api/v1/admin/waitlist?type=consumer|business — admin-only.
// Newest-first list capped at 100, plus an unbounded total count for
// the "Showing N of M" hint on /admin/waitlist.

import { listWaitlistOp } from "@/server/operations/waitlist-admin"

export const runtime = "nodejs"

export const GET = listWaitlistOp.runFromRequest
