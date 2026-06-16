import { apiServerFetch } from "@aira/api/server"
import {
  KnownAuditActionSchema,
  KnownAuditTargetTypeSchema,
} from "@aira/validators/audit-meta"
import type {
  KnownAuditAction,
  KnownAuditTargetType,
} from "@aira/validators/audit-meta"
import { requireSuperAdmin } from "@/lib/auth/server"
import { listAuditOp, listUsersOp } from "@/server/operations/admin"
import { AuditTable, FilterBar } from "@/features/admin"
import { AdminPageHeader } from "../_components/page-header"
import { ADMIN_AUDIT_PAGE_SIZE } from "@/features/admin/types"

export const metadata = { title: "Admin · Audit log" }
export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    since?: string
    until?: string
    page?: string
    actor_id?: string
    target_type?: string
    action?: string
  }>
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

function parseTargetType(s: string | undefined): KnownAuditTargetType | null {
  if (!s) return null
  const parsed = KnownAuditTargetTypeSchema.safeParse(s)
  return parsed.success ? parsed.data : null
}

function parseAction(s: string | undefined): KnownAuditAction | null {
  if (!s) return null
  const parsed = KnownAuditActionSchema.safeParse(s)
  return parsed.success ? parsed.data : null
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  // Audit visibility is super_admin-only — gate at the page so plain admins
  // get notFound() instead of hitting apiServerFetch and surfacing a 403.
  // The op-level permission: "super_admin" is the API source of truth.
  await requireSuperAdmin()

  const params = await searchParams
  const since = parseDate(params.since)
  const until = parseDate(params.until)
  const targetType = parseTargetType(params.target_type)
  const action = parseAction(params.action)
  const actorId = params.actor_id?.trim() ? params.actor_id.trim() : null
  const pageNum = Number.parseInt(params.page ?? "1", 10)
  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1

  // Resolve the locked actor (if any) to a display label without an extra
  // round-trip — listUsersOp with q=<email or partial> returns the row.
  // We use the actor's email as the q, joining back via id match. A tiny
  // wasted query when actor_id is set, but avoids a second op endpoint
  // just to look up a user by id.
  let initialActor: { id: string; name: string; email: string } | null = null
  if (actorId) {
    try {
      const lookup = await apiServerFetch(listUsersOp, {
        input: { q: undefined },
      })
      const match = lookup.data?.items?.find((u) => u.id === actorId)
      if (match) {
        initialActor = { id: match.id, name: match.name, email: match.email }
      }
    } catch {
      // Silent — typeahead just renders id text until the operator types.
    }
  }

  const res = await apiServerFetch(listAuditOp, {
    input: {
      since: since?.toISOString(),
      until: until?.toISOString(),
      page,
      actor_id: actorId ?? undefined,
      target_type: targetType ?? undefined,
      action: action ?? undefined,
    },
  })
  const result = res.data!
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_AUDIT_PAGE_SIZE))

  const hasActiveFilter =
    since !== null ||
    until !== null ||
    actorId !== null ||
    targetType !== null ||
    action !== null

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit log"
        subtitle={`${result.total} ${
          result.total === 1 ? "entry" : "entries"
        }${hasActiveFilter ? " match these filters" : ""}, newest first.`}
      />

      <FilterBar
        initialActor={initialActor}
        currentSince={
          since
            ? `${since.getUTCFullYear()}-${String(
                since.getUTCMonth() + 1,
              ).padStart(2, "0")}-${String(since.getUTCDate()).padStart(2, "0")}`
            : null
        }
        currentUntil={
          until
            ? `${until.getUTCFullYear()}-${String(
                until.getUTCMonth() + 1,
              ).padStart(2, "0")}-${String(until.getUTCDate()).padStart(2, "0")}`
            : null
        }
        currentTargetType={targetType}
        currentAction={action}
      />

      <AuditTable
        rows={result.items}
        emptyMessage={
          hasActiveFilter
            ? "No audit entries match these filters — clear filters or expand the date range."
            : "No audit entries yet."
        }
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
  params: {
    since?: string
    until?: string
    actor_id?: string
    target_type?: string
    action?: string
  }
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
  if (params.actor_id) qs.set("actor_id", params.actor_id)
  if (params.target_type) qs.set("target_type", params.target_type)
  if (params.action) qs.set("action", params.action)
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
