import "server-only"

// User preferences operations — surface for /api/v1/profile/preferences.
// Web RSC reads via apiServerFetch(getPreferencesOp); web Client Components
// + mobile mutate via apiClient.patch("/api/v1/profile/preferences", ...).
// Service stays pure (db, ctx, args); this op is the boundary layer that
// hooks the in-process call path into the same auth + Zod pipeline mobile
// uses over HTTP.

import { userPreferences } from "@aira/services"
import {
  GetUserPreferencesInputSchema,
  GetUserPreferencesOutputSchema,
  UpdateUserPreferencesInputSchema,
  UpdateUserPreferencesOutputSchema,
} from "@aira/validators"
import { defineOperation } from "./index"

export const getPreferencesOp = defineOperation({
  name: "userPreferences.get",
  input: GetUserPreferencesInputSchema,
  output: GetUserPreferencesOutputSchema,
  permission: "user",
  handler: async (db, ctx) => userPreferences.getPreferences(db, ctx),
})

export const updatePreferencesOp = defineOperation({
  name: "userPreferences.update",
  input: UpdateUserPreferencesInputSchema,
  output: UpdateUserPreferencesOutputSchema,
  permission: "user",
  handler: async (db, ctx, args) =>
    userPreferences.updatePreferences(db, ctx, args),
})
