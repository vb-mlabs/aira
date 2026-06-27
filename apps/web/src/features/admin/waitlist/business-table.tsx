"use client"

// Business waitlist tab table. Same shape as the consumer table plus
// name, business, phone, preferred contact, preferred time. Row
// actions land in the placeholder column in T7.

import { MailPlus } from "lucide-react"
import { EmptyState } from "@/lib/ui"
import type { WaitlistAdminListItem } from "@aira/validators"
import { SOURCE_LABEL } from "./source-label"
import { formatDateTime } from "./format-date"

interface BusinessTableProps {
  items: WaitlistAdminListItem[]
}

const CONTACT_LABEL: Record<
  NonNullable<WaitlistAdminListItem["preferred_contact"]>,
  string
> = {
  phone: "Phone",
  whatsapp: "WhatsApp",
  email: "Email",
}

const TIME_LABEL: Record<
  NonNullable<WaitlistAdminListItem["preferred_time"]>,
  string
> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime",
}

export function BusinessTable({ items }: BusinessTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={MailPlus}
        title="Nothing here yet."
        description="Business signups from Get Listed Early will appear here."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Name</th>
            <th className="px-4 py-3 text-left font-semibold">Business</th>
            <th className="px-4 py-3 text-left font-semibold">Email</th>
            <th className="px-4 py-3 text-left font-semibold">Phone</th>
            <th className="px-4 py-3 text-left font-semibold">Contact</th>
            <th className="px-4 py-3 text-left font-semibold">Time</th>
            <th className="px-4 py-3 text-left font-semibold">Source</th>
            <th className="px-4 py-3 text-left font-semibold">Signed up</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((row) => (
            <tr key={row.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">{row.full_name ?? "—"}</td>
              <td className="px-4 py-3">{row.business_name ?? "—"}</td>
              <td className="px-4 py-3">{row.email}</td>
              <td className="px-4 py-3 tabular-nums">{row.phone ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {row.preferred_contact
                  ? CONTACT_LABEL[row.preferred_contact]
                  : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {row.preferred_time ? TIME_LABEL[row.preferred_time] : "—"}
              </td>
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
                {/* T7 — copy / delete buttons land here */}
                <span className="text-xs text-muted-foreground">—</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
