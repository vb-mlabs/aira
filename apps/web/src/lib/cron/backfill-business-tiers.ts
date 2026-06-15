import { businessSubscriptions as subsService, cron as cronService } from "@aira/services"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export const JOB_NAME = "backfill-business-tiers"

/**
 * One-shot manual backfill that brings every business's `tier` column in
 * line with its active-paid subscription set. Registered with the cron
 * runner so the admin gets a Run-now button and a cron_runs audit row,
 * but NOT scheduled — there's no recurring cadence. Idempotent; the
 * second invocation reports `updated: 0`.
 */
export async function runBackfillBusinessTiers(runId: string): Promise<void> {
  try {
    const result = await cronService.claimWithAdvisoryLock(db, JOB_NAME, async () => {
      const { updated } = await subsService.backfillBusinessTiersFromActivePaidSubscriptions(db)
      await cronService.finishRun(
        db,
        runId,
        "succeeded",
        `Updated ${updated} business${updated === 1 ? "" : "es"}' tier column`,
        undefined,
        updated,
      )
    })
    if (result === "skipped") {
      await cronService.finishRun(db, runId, "skipped", "Lock held by another instance")
    }
  } catch (err) {
    logger.error("backfill-business-tiers failed", { message: String(err) })
    await cronService.finishRun(db, runId, "failed", undefined, String(err)).catch(() => {})
  }
}
