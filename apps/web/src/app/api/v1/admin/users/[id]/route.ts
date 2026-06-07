// GET /api/v1/admin/users/[id] — user detail + scoped audit log entries.
// Returns { user: null, audit: [] } when the id doesn't resolve; admin UI
// renders notFound() on that condition rather than 404'ing the route.

import { getUserDetailOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const GET = getUserDetailOp.runFromRequest
