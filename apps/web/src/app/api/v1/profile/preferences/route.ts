// /api/v1/profile/preferences — per-user notification preference toggles.
//
// GET   → current preferences for the authed user
// PATCH → partial update (any subset of the boolean columns)
//
// Web RSC reads via apiServerFetch(getPreferencesOp); web Client Components
// PATCH via apiClient.patch; mobile hits the same routes through
// @aira/api/client. The op layer handles auth + Zod + service dispatch.

import {
  getPreferencesOp,
  updatePreferencesOp,
} from "@/server/operations/user-preferences"

export const runtime = "nodejs"

export const GET = getPreferencesOp.runFromRequest

export const PATCH = updatePreferencesOp.runFromRequest
