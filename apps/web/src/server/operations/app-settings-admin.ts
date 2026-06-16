import "server-only"

// Super_admin-permission operations for the app settings domain.
//
// Today there's only one runtime-editable setting: reminder_schedule (the
// F17 renewal-reminder cron windows). The generic get-all / update-by-key
// pair that used to live here were deleted alongside the homepage CMS
// (homepage_about_* and homepage_stat_* moved to brand.homepage). If a
// future setting needs runtime editing, give it a dedicated typed pair the
// way reminder-schedule has — strict Zod parsing at the boundary is the
// pattern, not a generic key/value PATCH.

import { appSettings as appSettingsService } from "@aira/services"
import { createAudit } from "@aira/db/audit"
import {
  ReminderScheduleOutputSchema,
  ReminderScheduleSchema,
  ReminderScheduleUpdateInputSchema,
  parseReminderSchedule,
} from "@aira/validators/app_settings"
import { ApiError } from "@aira/api"
import { z } from "zod"
import { defineOperation } from "./index"

const REMINDER_SCHEDULE_KEY = "reminder_schedule"

export const getReminderScheduleOp = defineOperation({
  name: "admin.appSettings.reminderSchedule.get",
  input: z.object({}).strict(),
  output: ReminderScheduleOutputSchema,
  permission: "super_admin",
  handler: async (db) => {
    const setting = await appSettingsService.getAppSetting(db, REMINDER_SCHEDULE_KEY)
    const rawValue = setting?.value ?? "7"
    const windows = parseReminderSchedule(rawValue)
    return { value: rawValue, windows }
  },
})

export const updateReminderScheduleOp = defineOperation({
  name: "admin.appSettings.reminderSchedule.update",
  input: ReminderScheduleUpdateInputSchema,
  output: ReminderScheduleOutputSchema,
  permission: "super_admin",
  handler: async (db, ctx, { value }) => {
    // Strict-parse at the server boundary; the client's inline validation
    // is for fast feedback, this is the guarantee.
    const parsed = ReminderScheduleSchema.safeParse(value)
    if (!parsed.success) {
      throw ApiError.badRequest(
        "validation.input",
        parsed.error.issues[0]?.message ?? "Invalid reminder schedule",
        "value",
      )
    }

    // Snapshot the old value so the audit row carries the before/after.
    const previous = await appSettingsService.getAppSetting(
      db,
      REMINDER_SCHEDULE_KEY,
    )

    // Audit BEFORE the write. A failed audit blocks the change — keeps the
    // log authoritative (same convention as users.ts).
    const audit = createAudit(db)
    await audit({
      actorId: ctx.userId,
      action: "app_setting.updated",
      target: { type: "app_setting", id: REMINDER_SCHEDULE_KEY },
      meta: {
        kind: "app_setting.updated",
        key: REMINDER_SCHEDULE_KEY,
        old: previous?.value ?? null,
        new: value,
      },
      client: ctx.source === "mobile" ? "mobile" : "web",
    })

    await appSettingsService.updateAppSetting(db, REMINDER_SCHEDULE_KEY, value)

    return { value, windows: parsed.data }
  },
})
