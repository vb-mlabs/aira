import { businessSubscriptions as subsService, cron as cronService } from "@aira/services"
import { brand } from "@aira/config"
import { env } from "@/config/env"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { sendRenewalReminderEmail } from "@/lib/email/templates"

export const JOB_NAME = "renewal-reminder"

const REMINDER_DAYS = 7

export async function runRenewalReminder(runId: string): Promise<void> {
  try {
    const result = await cronService.claimWithAdvisoryLock(db, JOB_NAME, async () => {
      const rows = await subsService.findRenewingSoon(db, { withinDays: REMINDER_DAYS })
      const expiring = rows.filter((r) => r.payment_status === "paid")

      if (expiring.length > 0) {
        const adminUrl = `${env.BETTER_AUTH_URL ?? "http://localhost:3000"}/admin/businesses?renewing=${REMINDER_DAYS}`
        await sendRenewalReminderEmail({
          to: brand.supportEmail,
          businesses: expiring.map((r) => ({
            businessName: r.business_name,
            planName: r.plan_name,
            endDate: r.end_date,
            daysRemaining: r.days_remaining,
          })),
          adminUrl,
        })
      }

      await cronService.finishRun(
        db,
        runId,
        "succeeded",
        `${expiring.length} paid subscription(s) expiring within ${REMINDER_DAYS} days`,
        undefined,
        expiring.length,
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
