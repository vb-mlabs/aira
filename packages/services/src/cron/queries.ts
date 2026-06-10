import "server-only"

import { eq, desc, lt, and, sql } from "drizzle-orm"
import { cronRuns } from "@aira/db/schema"
import type { Database } from "@aira/db/client"

export interface CronRun {
  id: string
  job_name: string
  status: "running" | "succeeded" | "failed" | "skipped"
  summary: string | null
  error: string | null
  rows_affected: number | null
  started_at: string
  finished_at: string | null
}

function toCronRun(row: typeof cronRuns.$inferSelect): CronRun {
  return {
    ...row,
    summary: row.summary ?? null,
    error: row.error ?? null,
    rows_affected: row.rows_affected ?? null,
    started_at: row.started_at.toISOString(),
    finished_at: row.finished_at?.toISOString() ?? null,
  }
}

export async function listRecentRuns(
  db: Database,
  jobName: string,
  limit = 20,
): Promise<CronRun[]> {
  const rows = await db
    .select()
    .from(cronRuns)
    .where(eq(cronRuns.job_name, jobName))
    .orderBy(desc(cronRuns.started_at))
    .limit(limit)
  return rows.map(toCronRun)
}

export async function startRun(db: Database, jobName: string): Promise<CronRun> {
  const rows = await db
    .insert(cronRuns)
    .values({ job_name: jobName, status: "running" })
    .returning()
  const row = rows[0]
  if (!row) throw new Error("insert cron_run returned no row")
  return toCronRun(row)
}

export async function finishRun(
  db: Database,
  runId: string,
  status: "succeeded" | "failed" | "skipped",
  summary?: string,
  error?: string,
  rowsAffected?: number,
): Promise<void> {
  await db
    .update(cronRuns)
    .set({
      status,
      summary: summary ?? null,
      error: error ?? null,
      rows_affected: rowsAffected ?? null,
      finished_at: new Date(),
    })
    .where(eq(cronRuns.id, runId))
}

/** Boot-time sweep: orphan rows stuck in 'running' longer than 5 min → 'failed'. */
export async function sweepStaleRunningRuns(
  db: Database,
): Promise<{ swept: number }> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  const rows = await db
    .update(cronRuns)
    .set({
      status: "failed",
      error: "orphan_or_crash",
      finished_at: new Date(),
    })
    .where(
      and(
        eq(cronRuns.status, "running"),
        lt(cronRuns.started_at, fiveMinAgo),
      ),
    )
    .returning({ id: cronRuns.id })
  return { swept: rows.length }
}

/**
 * Acquires a transaction-scoped advisory lock keyed on jobName, then runs fn.
 * Returns 'skipped' if the lock is already held (another instance is running).
 * Uses pg_try_advisory_xact_lock (NOT session-level) — safe with connection poolers.
 * fn receives no transaction argument; it should use the outer db via closure.
 */
export async function claimWithAdvisoryLock(
  db: Database,
  jobName: string,
  fn: () => Promise<void>,
): Promise<"ran" | "skipped"> {
  let ran = false
  await db.transaction(async (tx) => {
    const result = await tx.execute(
      sql`SELECT pg_try_advisory_xact_lock(hashtext(${jobName})) AS acquired`,
    )
    const acquired = (result.rows[0] as { acquired: boolean }).acquired
    if (!acquired) return
    ran = true
    await fn()
  })
  return ran ? "ran" : "skipped"
}
