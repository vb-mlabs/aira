import { businessSubscriptions as subsService, cron as cronService } from "@aira/services"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export const JOB_NAME = "subscription-status-rollover"

export async function runSubscriptionRollover(runId: string): Promise<void> {
  try {
    const result = await cronService.claimWithAdvisoryLock(db, JOB_NAME, async () => {
      const { transitioned } = await subsService.rolloverExpiredSubscriptions(db)
      await cronService.finishRun(db, runId, "succeeded", `Transitioned ${transitioned} subscriptions paid→overdue`, undefined, transitioned)
    })
    if (result === "skipped") {
      await cronService.finishRun(db, runId, "skipped", "Lock held by another instance")
    }
  } catch (err) {
    logger.error("subscription rollover failed", { message: String(err) })
    await cronService.finishRun(db, runId, "failed", undefined, String(err)).catch(() => {})
  }
}
