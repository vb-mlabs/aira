import "server-only"

// Admin-permission operations for the app settings domain.

import { appSettings as appSettingsService } from "@aira/services"
import { createAudit } from "@aira/db/audit"
import {
  AppSettingUpdateInputSchema,
  AppSettingsOutputSchema,
  ReminderScheduleOutputSchema,
  ReminderScheduleSchema,
  ReminderScheduleUpdateInputSchema,
  parseReminderSchedule,
} from "@aira/validators/app_settings"
import { ApiError } from "@aira/api"
import { z } from "zod"
import { defineOperation } from "./index"

const REMINDER_SCHEDULE_KEY = "reminder_schedule"

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

// ─── Dedicated reminder-schedule ops (F17) ──────────────────────────────────
//
// These exist alongside the generic update op because the schedule value has
// real semantics (windows, integers, range) that need Zod parsing at the
// server boundary. The generic op accepts any string and lets the client
// validate — fine for homepage copy, dangerous for cron config.

export const getReminderScheduleOp = defineOperation({
  name: "admin.appSettings.reminderSchedule.get",
  input: z.object({}).strict(),
  output: ReminderScheduleOutputSchema,
  permission: "admin",
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
  permission: "admin",
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
