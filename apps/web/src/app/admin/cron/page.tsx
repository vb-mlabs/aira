import { apiServerFetch } from "@aira/api/server"
import { listCronRunsOp } from "@/server/operations/cron-admin"
import { cn } from "@aira/ui-web/utils"
import { RunNowButton } from "./_components/run-now-button"

export const metadata = { title: "Admin · Cron" }
export const dynamic = "force-dynamic"

const KNOWN_JOBS = [
  { name: "subscription-status-rollover", schedule: "5 0 * * * (daily 00:05 UTC)" },
  { name: "sponsorship-status-rollover", schedule: "0 * * * * (hourly)" },
]

type CronStatus = "running" | "succeeded" | "failed" | "skipped"

const STATUS_STYLES: Record<CronStatus, string> = {
  running: "bg-info/15 text-info",
  succeeded: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
  skipped: "bg-muted text-muted-foreground",
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export default async function AdminCronPage() {
  const jobsWithRuns = await Promise.all(
    KNOWN_JOBS.map(async (job) => {
      const res = await apiServerFetch(listCronRunsOp, {
        input: { job_name: job.name, limit: 20 },
      })
      return { ...job, runs: res.data?.items ?? [] }
    }),
  )

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cron jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scheduled background tasks. "Run now" triggers a run immediately (advisory-locked — only one instance runs at a time).
        </p>
      </header>

      {jobsWithRuns.map((job) => (
        <section key={job.name} className="rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="font-semibold font-mono text-sm">{job.name}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{job.schedule}</p>
            </div>
            <RunNowButton jobName={job.name} />
          </header>

          <div className="px-6 py-5">
            {job.runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Started</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Finished</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {job.runs.map((run: {
                      id: string
                      status: string
                      started_at: string
                      finished_at: string | null
                      summary: string | null
                      error: string | null
                      rows_affected: number | null
                    }) => (
                      <tr key={run.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              STATUS_STYLES[run.status as CronStatus] ??
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {formatDateTime(run.started_at)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {run.finished_at ? formatDateTime(run.finished_at) : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {run.summary ?? run.error ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
