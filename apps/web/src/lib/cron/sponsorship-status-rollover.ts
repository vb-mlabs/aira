import { sponsorships as spService, cron as cronService } from "@aira/services"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export const JOB_NAME = "sponsorship-status-rollover"

export async function runSponsorshipRollover(runId: string): Promise<void> {
  try {
    const result = await cronService.claimWithAdvisoryLock(db, JOB_NAME, async () => {
      const [{ transitioned: toActive }, { transitioned: toExpired }] = await Promise.all([
        spService.transitionSponsorshipsToActive(db),
        spService.transitionSponsorshipsToExpired(db),
      ])
      const summary = `Activated ${toActive}, expired ${toExpired}`
      await cronService.finishRun(db, runId, "succeeded", summary, undefined, toActive + toExpired)
    })
    if (result === "skipped") {
      await cronService.finishRun(db, runId, "skipped", "Lock held by another instance")
    }
  } catch (err) {
    logger.error("sponsorship rollover failed", { message: String(err) })
    await cronService.finishRun(db, runId, "failed", undefined, String(err)).catch(() => {})
  }
}
