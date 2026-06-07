// GET /api/v1/admin/users — paginated user list with search + role + ban
// filters. Admin-only; the 30-min idle-timeout gate fires for cookie-authed
// admins (via enforceAdminFreshness at the composition root).

import { listUsersOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const GET = listUsersOp.runFromRequest
