// POST /api/v1/admin/businesses/broadcast/preview { target }
//
// Live recipient count for the audience picker — debounced from the
// admin broadcast modal so admins see the scope of their selection
// before they click Send.

import { previewBroadcastRecipientCountOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const POST = previewBroadcastRecipientCountOp.runFromRequest
