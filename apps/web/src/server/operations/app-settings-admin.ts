import "server-only"

// Admin-permission operations for the app settings domain.

import { appSettings as appSettingsService } from "@aira/services"
import {
  AppSettingUpdateInputSchema,
  AppSettingsOutputSchema,
} from "@aira/validators/app_settings"
import { z } from "zod"
import { defineOperation } from "./index"

export const getAppSettingsOp = defineOperation({
  name: "admin.appSettings.get",
  input: z.object({}).strict(),
  output: AppSettingsOutputSchema,
  permission: "admin",
  handler: async (db) => {
    const settings = await appSettingsService.getAppSettings(db)
    return { settings }
  },
})

export const updateAppSettingOp = defineOperation({
  name: "admin.appSettings.update",
  input: AppSettingUpdateInputSchema,
  output: z.object({ setting: z.any() }),
  permission: "admin",
  handler: async (db, _ctx, { key, value }) => {
    const setting = await appSettingsService.updateAppSetting(db, key, value)
    return { setting }
  },
})
