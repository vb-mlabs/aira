import { apiServerFetch } from "@aira/api/server"
import { listCronRunsOp } from "@/server/operations/cron-admin"
import { AdminBadge } from "@/features/admin"
import { AdminPageHeader } from "../_components/page-header"
import { RunNowButton } from "./_components/run-now-button"

export const metadata = { title: "Admin · Cron" }
export const dynamic = "force-dynamic"

const KNOWN_JOBS = [
  { name: "subscription-status-rollover", schedule: "5 0 * * * (daily 00:05 UTC)" },
  { name: "sponsorship-status-rollover", schedule: "0 * * * * (hourly)" },
  { name: "renewal-reminder", schedule: "0 8 * * * (daily 08:00 UTC)" },
  { name: "purge-soft-deleted", schedule: "0 3 * * * (daily 03:00 UTC)" },
]

type CronStatus = "running" | "succeeded" | "failed" | "skipped"

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
    <div className="space-y-6">
      <AdminPageHeader
        title="Cron jobs"
        subtitle='Scheduled background tasks. "Run now" triggers a run immediately — advisory-locked, so only one instance runs at a time.'
      />

      <div className="space-y-4">
        {jobsWithRuns.map((job) => (
          <section key={job.name} className="rounded-lg border border-border bg-card">
            <header className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-mono text-sm font-semibold">{job.name}</h2>
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
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Started</th>
                        <th className="px-4 py-3 text-left font-semibold">Finished</th>
                        <th className="px-4 py-3 text-left font-semibold">Summary</th>
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
                          <td className="px-4 py-3">
                            <AdminBadge
                              variant={run.status as CronStatus}
                              label={run.status}
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDateTime(run.started_at)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {run.finished_at ? formatDateTime(run.finished_at) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
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
    </div>
  )
}
