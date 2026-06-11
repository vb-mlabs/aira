import { EmptyState } from "@/lib/ui"
import type { AdminAuditRow } from "@/features/admin/types"

interface AuditTableProps {
  rows: AdminAuditRow[]
  emptyMessage?: string
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
              <th className="px-4 py-3 text-left font-semibold">Action</th>
              <th className="px-4 py-3 text-left font-semibold">Target</th>
              <th className="px-4 py-3 text-left font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/20">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {new Date(row.at).toLocaleString()}
                </td>
                <td className="px-4 py-3">{row.actor_email ?? "system"}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.action}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {row.target_type && row.target_id
                    ? `${row.target_type}:${row.target_id.slice(0, 8)}`
                    : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {row.metadata ? JSON.stringify(row.metadata) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
