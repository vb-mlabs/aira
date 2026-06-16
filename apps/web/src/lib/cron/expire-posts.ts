import {
  community as communityService,
  cron as cronService,
} from "@aira/services"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export const JOB_NAME = "expire-posts"

/**
 * Hourly sweep — flip approved community_post rows past their expires_at
 * to status='expired'. PENDING posts have a NULL expires_at and are
 * deliberately excluded; admins clean those up via the moderation queue.
 *
 * Expiry window is sourced from app_setting.posts_expiry_days inside
 * community.approvePost (default 30 days, seeded in the F20 migration).
 */
export async function runExpirePosts(runId: string): Promise<void> {
  try {
    const result = await cronService.claimWithAdvisoryLock(db, JOB_NAME, async () => {
      const { rowsAffected } = await communityService.expirePosts(db)
      await cronService.finishRun(
        db,
        runId,
        "succeeded",
        `Expired ${rowsAffected} post${rowsAffected === 1 ? "" : "s"}`,
        undefined,
        rowsAffected,
      )
    })

    if (result === "skipped") {
      await cronService.finishRun(db, runId, "skipped", "Lock held by another instance")
    }
  } catch (err) {
    logger.error("expire-posts failed", { message: String(err) })
    await cronService.finishRun(db, runId, "failed", undefined, String(err)).catch(() => {})
  }
}
