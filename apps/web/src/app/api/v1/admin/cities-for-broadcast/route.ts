// GET /api/v1/admin/cities-for-broadcast
//
// Plain-admin-readable cities list — backs the audience picker in the
// business broadcast modal so admins can scope a broadcast to one city
// without needing super_admin permission. Mutations on cities still
// route through the super-admin /api/v1/admin/cities endpoint.

import { listCitiesForAdminOp } from "@/server/operations/cities-admin"

export const runtime = "nodejs"

export const GET = listCitiesForAdminOp.runFromRequest
