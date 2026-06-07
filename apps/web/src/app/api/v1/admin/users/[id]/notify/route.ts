// POST /api/v1/admin/users/[id]/notify  { title, message, href? }
//
// Drops an in-app notification on the target user. Caller is responsible
// for staying under length limits; Zod enforces them at the op boundary.

import { sendAdminNotificationOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const POST = sendAdminNotificationOp.runFromRequest
