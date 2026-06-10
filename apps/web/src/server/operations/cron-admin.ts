import "server-only"

import { cron as cronService } from "@aira/services"
import { z } from "zod"
import { ApiError } from "@aira/api"
import { defineOperation } from "./index"

export const listCronRunsOp = defineOperation({
  name: "admin.cron.list-runs",
  input: z.object({ job_name: z.string().min(1), limit: z.coerce.number().int().min(1).max(100).optional() }).strict(),
  output: z.object({ items: z.array(z.any()) }),
  permission: "admin",
  handler: async (db, _ctx, { job_name, limit }) => {
    const items = await cronService.listRecentRuns(db, job_name, limit ?? 20)
    return { items }
  },
})

export const triggerCronRunOp = defineOperation({
  name: "admin.cron.trigger",
  input: z.object({ job_name: z.string().min(1) }).passthrough(),
  output: z.object({ run: z.any() }),
  permission: "admin",
  handler: async (db, _ctx, { job_name }) => {
    const { startCrons } = await import("@/lib/cron/registry")
    await startCrons()
    const runner = startCrons.getRunner(job_name)
    if (!runner) throw ApiError.notFound("cron.not_found", `No job named "${job_name}"`)
    const run = await cronService.startRun(db, job_name)
    runner(run.id).catch(() => {})
    return { run }
  },
})
