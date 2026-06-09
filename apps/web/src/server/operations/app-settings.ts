import "server-only"

// Public (user-permission) operations for the app settings domain.
// Returns only the homepage display keys — no sensitive admin settings.

import { appSettings as appSettingsService } from "@aira/services"
import { AppSettingsOutputSchema } from "@aira/validators/app_settings"
import { z } from "zod"
import { defineOperation } from "./index"

const HOMEPAGE_KEYS = [
  "homepage_about_title",
  "homepage_about_body",
  "homepage_stat_businesses",
  "homepage_stat_users",
]

export const getAppSettingsPublicOp = defineOperation({
  name: "appSettings.getPublic",
  input: z.object({}).strict(),
  output: AppSettingsOutputSchema,
  permission: "user",
  handler: async (db) => {
    const all = await appSettingsService.getAppSettings(db)
    const settings = all.filter((s) => HOMEPAGE_KEYS.includes(s.key))
    return { settings }
  },
})
