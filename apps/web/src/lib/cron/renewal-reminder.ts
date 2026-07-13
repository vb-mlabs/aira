import {
  appSettings as appSettingsService,
  businessSubscriptions as subsService,
  cron as cronService,
} from "@aira/services"
import { brand } from "@aira/config"
import {
  ReminderScheduleSchema,
  parseReminderSchedule,
} from "@aira/validators/app_settings"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
  buildAuthUrl,
  sendRenewalReminderEmail,
} from "@/lib/email/templates"

export const JOB_NAME = "renewal-reminder"

const SETTING_KEY = "reminder_schedule"

/**
 * Daily 08:00 UTC. Reads `app_setting.reminder_schedule`, loops the parsed
 * windows, and sends one labeled email per non-empty window. A corrupt row
 * degrades to the historical 7-day behavior (parseReminderSchedule's
 * fallback) and a warning lands in `cron_run` so the admin can see why.
 */
export async function runRenewalReminder(runId: string): Promise<void> {
  try {
    const result = await cronService.claimWithAdvisoryLock(db, JOB_NAME, async () => {
      const setting = await appSettingsService.getAppSetting(db, SETTING_KEY)
      const rawValue = setting?.value ?? null

      // Strict re-parse only to surface corruption to the logs. The actual
      // windows come from parseReminderSchedule which is silent-fallback.
      if (rawValue && rawValue.trim().length > 0) {
        const strict = ReminderScheduleSchema.safeParse(rawValue)
        if (!strict.success) {
          logger.warn(
            "renewal-reminder: reminder_schedule failed strict parse — falling back to default",
            {
              rawValue,
              issue: strict.error.issues[0]?.message,
            },
          )
        }
      }

      const windows = parseReminderSchedule(rawValue)

      let totalEmails = 0
      let totalRows = 0
      const windowsHit: number[] = []

      for (const days of windows) {
        const rows = await subsService.findRenewingExactlyInDays(db, { days })
        if (rows.length === 0) continue

        const adminUrl = buildAuthUrl("/admin/businesses", { renewing: days })
        await sendRenewalReminderEmail({
          to: brand.supportEmail,
          businesses: rows.map((r) => ({
            businessName: r.business_name,
            planName: r.plan_name,
            endDate: r.end_date,
            daysRemaining: r.days_remaining,
          })),
          adminUrl,
          windowLabel: `Expiring in ${days} days`,
        })

        totalEmails += 1
        totalRows += rows.length
        windowsHit.push(days)
      }

      const summary =
        totalEmails === 0
          ? `No subscriptions matched windows: ${windows.join(", ")}`
          : `Sent ${totalEmails} email${totalEmails === 1 ? "" : "s"} covering ${totalRows} subscription${totalRows === 1 ? "" : "s"} across windows: ${windowsHit.join(", ")}`

      await cronService.finishRun(
        db,
        runId,
        "succeeded",
        summary,
        undefined,
        totalRows,
      )
    })

    if (result === "skipped") {
      await cronService.finishRun(db, runId, "skipped", "Lock held by another instance")
    }
  } catch (err) {
    logger.error("renewal reminder failed", { message: String(err) })
    await cronService.finishRun(db, runId, "failed", undefined, String(err)).catch(() => {})
  }
}
