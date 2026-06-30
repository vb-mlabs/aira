// POST /api/v1/admin/businesses/broadcast  { title, message }
//
// Admin-only. Fan-out in-app notification to every linked, non-banned
// owner of an active business. Empty recipient sets still leave an audit
// row (recipient_count: 0). In-app delivery only — no email in G1.

import { sendBusinessOwnerBroadcastOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const POST = sendBusinessOwnerBroadcastOp.runFromRequest
