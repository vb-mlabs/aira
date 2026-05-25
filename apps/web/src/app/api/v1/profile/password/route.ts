// POST /api/profile/password { currentPassword, newPassword }
//
// Op handles auth + input validation + audit + the auth.api.changePassword
// call (with revokeOtherSessions: true) + wrong-password mapping. See
// @/server/operations/users for the handler body.

import { changePasswordOp } from "@/server/operations/users"

export const runtime = "nodejs"

export const POST = changePasswordOp.runFromRequest
