import { businesses as businessesService, cron as cronService } from "@aira/services"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export const JOB_NAME = "purge-soft-deleted"

const PURGE_DAYS = 180

export async function runPurgeSoftDeleted(runId: string): Promise<void> {
  try {
    const result = await cronService.claimWithAdvisoryLock(db, JOB_NAME, async () => {
      const { deleted } = await businessesService.purgeArchivedBusinesses(db, {
        olderThanDays: PURGE_DAYS,
      })

      await cronService.finishRun(
        db,
        runId,
        "succeeded",
        `Purged ${deleted} archived business${deleted === 1 ? "" : "es"} older than ${PURGE_DAYS} days`,
        undefined,
        deleted,
      )
    })

    if (result === "skipped") {
      await cronService.finishRun(db, runId, "skipped", "Lock held by another instance")
    }
  } catch (err) {
    logger.error("purge-soft-deleted failed", { message: String(err) })
    await cronService.finishRun(db, runId, "failed", undefined, String(err)).catch(() => {})
  }
}
