// POST   /api/v1/profile/push-token { expo_push_token, platform }
// DELETE /api/v1/profile/push-token { expo_push_token }
//
// Mobile-side registration utility (apps/mobile/lib/push.ts) hits this on
// permission grant + on token rotation. The op handlers enforce auth +
// run the input through the registerDevice / unregisterDevice upserts.

import {
  registerPushTokenOp,
  unregisterPushTokenOp,
} from "@/server/operations/devices"

export const runtime = "nodejs"

export const POST = registerPushTokenOp.runFromRequest

export const DELETE = unregisterPushTokenOp.runFromRequest
