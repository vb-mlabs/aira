// /admin/audit — global audit log with date filter + pagination.

import { listAudit } from "@/features/admin/server/queries"
import { AuditTable } from "@/features/admin"
import { ADMIN_AUDIT_PAGE_SIZE } from "@/features/admin/types"

export const metadata = { title: "Admin · Audit log" }
export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    since?: string
    until?: string
    page?: string
  }>
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const params = await searchParams
  const since = parseDate(params.since)
  const until = parseDate(params.until)
  const pageNum = Number.parseInt(params.page ?? "1", 10)
  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1

  const result = await listAudit({ since, until, page })
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_AUDIT_PAGE_SIZE))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every state-changing admin action, newest first.
        </p>
      </header>

      <form
        method="get"
        action="/admin/audit"
        className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-4"
      >
        <div className="space-y-1">
          <label htmlFor="since" className="text-xs text-muted-foreground">
            From
          </label>
          <input
            id="since"
            name="since"
            type="date"
            defaultValue={
              since ? since.toISOString().slice(0, 10) : ""
            }
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="until" className="text-xs text-muted-foreground">
            To
          </label>
          <input
            id="until"
            name="until"
            type="date"
            defaultValue={
              until ? until.toISOString().slice(0, 10) : ""
            }
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Filter
        </button>
      </form>

      <AuditTable
        rows={result.items}
        emptyMessage="No audit entries match this date range."
      />

      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          <PageLink page={page - 1} disabled={page <= 1} params={params}>
            ← Previous
          </PageLink>
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <PageLink
            page={page + 1}
            disabled={page >= totalPages}
            params={params}
          >
            Next →
          </PageLink>
        </nav>
      )}
    </div>
  )
}

function PageLink({
  page,
  disabled,
  params,
  children,
}: {
  page: number
  disabled: boolean
  params: { since?: string; until?: string }
  children: React.ReactNode
}) {
  if (disabled) {
    return <span className="text-muted-foreground/60">{children}</span>
  }
  const qs = new URLSearchParams()
  if (params.since) qs.set("since", params.since)
  if (params.until) qs.set("until", params.until)
  if (page > 1) qs.set("page", String(page))
  return (
    <a
      href={`/admin/audit?${qs.toString()}`}
      className="rounded-md border border-border px-3 py-1 text-muted-foreground hover:text-foreground"
    >
      {children}
    </a>
  )
}
