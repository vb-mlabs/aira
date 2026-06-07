// POST /api/v1/admin/users/[id]/reset-password
//
// Triggers Better Auth's request-password-reset flow for the target user.
// The op resolves the target's current email server-side; the request body
// is empty.

import { sendPasswordResetToOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const POST = sendPasswordResetToOp.runFromRequest
