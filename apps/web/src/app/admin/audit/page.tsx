import { apiServerFetch } from "@aira/api/server"
import { listAuditOp } from "@/server/operations/admin"
import { AuditTable } from "@/features/admin"
import { AdminPageHeader } from "../_components/page-header"
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

  const res = await apiServerFetch(listAuditOp, {
    input: {
      since: since?.toISOString(),
      until: until?.toISOString(),
      page,
    },
  })
  const result = res.data!
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_AUDIT_PAGE_SIZE))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit log"
        subtitle="Every state-changing admin action, newest first."
      />

      <form
        method="get"
        action="/admin/audit"
        className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-4"
      >
        <div className="space-y-1">
          <label htmlFor="since" className="text-xs text-muted-foreground">
            From
          </label>
          <input
            id="since"
            name="since"
            type="date"
            defaultValue={since ? since.toISOString().slice(0, 10) : ""}
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
            defaultValue={until ? until.toISOString().slice(0, 10) : ""}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filter
        </button>
      </form>

      <AuditTable
        rows={result.items}
        emptyMessage="No audit entries match this date range."
      />

      {totalPages > 1 && (
        <nav className="flex items-center justify-between">
          <PaginationLink page={page - 1} disabled={page <= 1} params={params}>
            Previous
          </PaginationLink>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <PaginationLink
            page={page + 1}
            disabled={page >= totalPages}
            params={params}
          >
            Next
          </PaginationLink>
        </nav>
      )}
    </div>
  )
}

const btnBase =
  "inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors"

function PaginationLink({
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
    return (
      <span className={`${btnBase} cursor-not-allowed text-muted-foreground/50`}>
        {children}
      </span>
    )
  }
  const qs = new URLSearchParams()
  if (params.since) qs.set("since", params.since)
  if (params.until) qs.set("until", params.until)
  if (page > 1) qs.set("page", String(page))
  return (
    <a
      href={`/admin/audit?${qs.toString()}`}
      className={`${btnBase} bg-card text-foreground hover:bg-muted`}
    >
      {children}
    </a>
  )
}
