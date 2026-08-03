// POST /api/v1/admin/users/broadcast/preview { target }
//
// Live audience count for the "Notify users" modal — user + device
// totals plus per-platform split. Debounced from the compose step so
// admins see the scope of the audience before Send.

import { previewUserBroadcastRecipientCountOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const POST = previewUserBroadcastRecipientCountOp.runFromRequest
