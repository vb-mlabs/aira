"use client"

// Consumer waitlist tab table. Pure presentation — row actions land in
// the placeholder column in T7. Empty state mirrors the EmptyState
// pattern used by the renewal queue table.

import { MailPlus } from "lucide-react"
import { EmptyState } from "@/lib/ui"
import type { WaitlistAdminListItem } from "@aira/validators"
import { SOURCE_LABEL } from "./source-label"
import { formatDateTime } from "./format-date"
import { RowActions } from "./row-actions"

interface ConsumerTableProps {
  items: WaitlistAdminListItem[]
}

export function ConsumerTable({ items }: ConsumerTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={MailPlus}
        title="Nothing here yet."
        description="Consumer signups will appear here once the hero or footer form captures one."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Email</th>
            <th className="px-4 py-3 text-left font-semibold">Source</th>
            <th className="px-4 py-3 text-left font-semibold">Signed up</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((row) => (
            <tr key={row.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">{row.email}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {SOURCE_LABEL[row.source] ?? row.source}
              </td>
              <td
                className="px-4 py-3 text-muted-foreground"
                suppressHydrationWarning
              >
                {formatDateTime(row.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
