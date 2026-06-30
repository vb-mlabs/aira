import "server-only"

// Push-token registration ops.
//
// Live at /api/v1/profile/push-token per F21 review decision 1 — the
// existing /api/v1/profile/* namespace is the home for current-user
// resource mutations (password, email, preferences). Routing here keeps
// /profile/* coherent rather than introducing a sibling /me/* namespace
// for one endpoint.

import { devices as devicesService } from "@aira/services"
import {
  RegisterPushTokenInputSchema,
  UnregisterPushTokenInputSchema,
  PushTokenMutationOutputSchema,
  type RegisterPushTokenInput,
  type UnregisterPushTokenInput,
} from "@aira/validators"
import { defineOperation } from "./index"

export const registerPushTokenOp = defineOperation({
  name: "profile.pushToken.register",
  input: RegisterPushTokenInputSchema,
  output: PushTokenMutationOutputSchema,
  permission: "user",
  handler: async (db, ctx, input: RegisterPushTokenInput) => {
    await devicesService.registerDevice(
      db,
      ctx.userId,
      input.expo_push_token,
      input.platform,
    )
    return { ok: true as const }
  },
})

export const unregisterPushTokenOp = defineOperation({
  name: "profile.pushToken.unregister",
  input: UnregisterPushTokenInputSchema,
  output: PushTokenMutationOutputSchema,
  permission: "user",
  handler: async (db, ctx, input: UnregisterPushTokenInput) => {
    await devicesService.unregisterDevice(db, ctx.userId, input.expo_push_token)
    return { ok: true as const }
  },
})
