// POST /api/v1/admin/users/broadcast  { title, message, target }
//
// Admin-only. Fans out an in-app notification + Expo push to end-user
// devices matching the audience. Returns per-platform push counters
// (iOS + Android buckets of attempted/completed/pending) plus an
// error_code_counts map so the Sent step surfaces the shape of any
// failures. Primary use is triaging push delivery loops.

import { sendUserBroadcastOp } from "@/server/operations/admin"

export const runtime = "nodejs"

export const POST = sendUserBroadcastOp.runFromRequest
