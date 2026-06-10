import cron from "node-cron"
import { cron as cronService } from "@aira/services"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type RunnerFn = (runId: string) => Promise<void>

const runners = new Map<string, RunnerFn>()
const tasks: ReturnType<typeof cron.schedule>[] = []
let initialized = false

export function registerRunner(jobName: string, fn: RunnerFn): void {
  runners.set(jobName, fn)
}

export function getRunner(jobName: string): RunnerFn | undefined {
  return runners.get(jobName)
}

export function getRegisteredJobs(): string[] {
  return Array.from(runners.keys())
}

async function scheduleJob(jobName: string, expression: string, runner: RunnerFn): Promise<void> {
  const task = cron.schedule(expression, async () => {
    const run = await cronService.startRun(db, jobName)
    await runner(run.id)
  })
  tasks.push(task)
  logger.info(`cron: scheduled "${jobName}" (${expression})`)
}

export async function startCrons(): Promise<void> {
  if (initialized) return
  initialized = true

  await cronService.sweepStaleRunningRuns(db)
  logger.info("cron: swept stale running rows")

  const { JOB_NAME: subJob, runSubscriptionRollover } = await import(
    "./subscription-status-rollover"
  )
  const { JOB_NAME: spJob, runSponsorshipRollover } = await import(
    "./sponsorship-status-rollover"
  )

  registerRunner(subJob, runSubscriptionRollover)
  registerRunner(spJob, runSponsorshipRollover)

  await scheduleJob(subJob, "5 0 * * *", runSubscriptionRollover)
  await scheduleJob(spJob, "0 * * * *", runSponsorshipRollover)

  process.on("SIGTERM", () => {
    tasks.forEach((t) => t.stop())
    logger.info("cron: tasks stopped on SIGTERM")
  })
}

// Attach helpers as static properties so cron-admin.ts can do startCrons.getRunner(...)
startCrons.getRunner = getRunner
startCrons.getRegisteredJobs = getRegisteredJobs
