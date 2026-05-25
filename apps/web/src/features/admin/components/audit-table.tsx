import type { AdminAuditRow } from "@/features/admin/types"

interface AuditTableProps {
  rows: AdminAuditRow[]
  emptyMessage?: string
}

export function AuditTable({ rows, emptyMessage }: AuditTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyMessage ?? "No audit entries."}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted-foreground">
            <th className="py-2 pr-4">When</th>
            <th className="py-2 pr-4">Actor</th>
            <th className="py-2 pr-4">Action</th>
            <th className="py-2 pr-4">Target</th>
            <th className="py-2">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60">
              <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                {new Date(row.at).toLocaleString()}
              </td>
              <td className="py-2 pr-4">{row.actor_email ?? "system"}</td>
              <td className="py-2 pr-4 font-mono text-xs">{row.action}</td>
              <td className="py-2 pr-4 font-mono text-xs">
                {row.target_type && row.target_id
                  ? `${row.target_type}:${row.target_id.slice(0, 8)}`
                  : "—"}
              </td>
              <td className="py-2 font-mono text-xs text-muted-foreground">
                {row.metadata ? JSON.stringify(row.metadata) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
