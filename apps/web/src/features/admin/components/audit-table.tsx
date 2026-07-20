import { EmptyState } from "@/lib/ui"
import type { AdminAuditRow } from "@/features/admin/types"
import { RenderAuditDetail } from "@/features/admin/audit/render-detail"
import { RenderAuditTarget } from "@/features/admin/audit/render-target"

interface AuditTableProps {
  rows: AdminAuditRow[]
  emptyMessage?: string
}

/** Stable UTC formatter for the When column — `toLocaleString()`
 *  produces different text between Node and the browser, which trips
 *  React 19 hydration warnings (2026-06-14 lesson). Stable
 *  YYYY-MM-DD HH:MM UTC keeps the values byte-identical. */
function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mi = String(d.getUTCMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

export function AuditTable({ rows, emptyMessage }: AuditTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyMessage ?? "No audit entries"}
        description="Actions will appear here once admins make changes."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">When</th>
              <th className="px-4 py-3 text-left font-semibold">Actor</th>
              <th className="px-4 py-3 text-left font-semibold">Target</th>
              <th className="px-4 py-3 text-left font-semibold">What happened</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/20">
                <td
                  className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground"
                  suppressHydrationWarning
                >
                  {formatWhen(row.at)}
                </td>
                <td className="px-4 py-3">
                  {row.actor_email ?? (
                    <span className="text-muted-foreground">system</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {row.target_type ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {row.target_type}
                      </span>
                      <RenderAuditTarget row={row} />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <RenderAuditDetail
                    action={row.action}
                    metadata={row.metadata}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
