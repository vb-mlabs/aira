"use client"

// F23′ — admin renewal follow-up queue.
//
// Whole-row click opens the FollowupModal (wired in T9 — the table holds
// the `detailId` state and the modal slot is rendered by this component).
// Phone + WhatsApp icons live in the right action cluster and stop
// propagation so tapping them dials without opening the modal first.
//
// Mirrors features/admin/community/community-table.tsx exactly: row =
// role=button + tabIndex=0 + Enter/Space handlers + cursor-pointer +
// hover/focus chrome. UTC-stable relativeTime per the 2026-06-14
// hydration lesson.

import { useState } from "react"

import { MessageCircle, PhoneCall } from "lucide-react"
import { Button } from "@aira/ui-web/button"
import { AdminBadge, type AdminBadgeVariant } from "@/features/admin"
import { EmptyState } from "@/lib/ui"
import type { FollowupQueueRow } from "@aira/validators/subscription-followups"

interface RenewalQueueTableProps {
  items: FollowupQueueRow[]
  total: number
  withinDays: number
}

const PAYMENT_LABEL: Record<FollowupQueueRow["payment_status"], string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
}

const OUTCOME_LABEL: Record<NonNullable<FollowupQueueRow["last_outcome"]>, string> = {
  called: "Called",
  voicemail: "Voicemail",
  no_answer: "No answer",
  refused: "Refused",
  paid: "Marked paid",
  reschedule: "Rescheduled",
}

export function RenewalQueueTable({
  items,
  total,
  withinDays,
}: RenewalQueueTableProps) {
  // detailId stays here so T9 can render the FollowupModal slot beneath
  // the table without lifting state up. T8 only sets it on row click;
  // the read branch arrives in T9.
  const [, setDetailId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <EmptyState
        icon={PhoneCall}
        title={`No renewals due in the next ${withinDays} days`}
        description="Check back tomorrow — newly due subscriptions surface here automatically."
      />
    )
  }

  const truncated = total > items.length

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Business</th>
              <th className="px-4 py-3 text-left font-semibold">Plan</th>
              <th className="px-4 py-3 text-left font-semibold">Payment</th>
              <th className="px-4 py-3 text-left font-semibold">Expiry</th>
              <th className="px-4 py-3 text-left font-semibold">Last attempt</th>
              <th className="px-4 py-3 text-right font-semibold">Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((row) => {
              const overdue = row.days_remaining < 0
              return (
                <tr
                  key={row.subscription_id}
                  onClick={() => setDetailId(row.subscription_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setDetailId(row.subscription_id)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open ${row.business_name}`}
                  className="cursor-pointer hover:bg-muted/20 focus:bg-muted/30 focus:outline-none"
                >
                  <td className="px-4 py-3 font-medium">{row.business_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.plan_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge
                      variant={row.payment_status as AdminBadgeVariant}
                      label={PAYMENT_LABEL[row.payment_status]}
                    />
                  </td>
                  <td
                    className="px-4 py-3"
                    suppressHydrationWarning
                  >
                    <span
                      className={
                        overdue
                          ? "font-bold text-destructive"
                          : "text-foreground"
                      }
                    >
                      {expiryLabel(row.days_remaining, row.end_date)}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {row.last_outcome
                      ? `${OUTCOME_LABEL[row.last_outcome]} · ${relativeTime(row.last_followup_at)}`
                      : "—"}
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1">
                      <PhoneAction
                        href={
                          row.contact_phone
                            ? `tel:${row.contact_phone}`
                            : null
                        }
                        label={
                          row.contact_phone
                            ? `Call ${row.business_name}`
                            : "No phone on file"
                        }
                        icon={<PhoneCall className="size-4" aria-hidden />}
                      />
                      <PhoneAction
                        href={
                          row.contact_whatsapp
                            ? whatsappUrl(row.contact_whatsapp)
                            : null
                        }
                        label={
                          row.contact_whatsapp
                            ? `WhatsApp ${row.business_name}`
                            : "No WhatsApp on file"
                        }
                        icon={<MessageCircle className="size-4" aria-hidden />}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {truncated && (
        <p className="text-xs text-muted-foreground">
          Showing first {items.length} of {total}. Narrow the window or
          act on the top of the list to surface more.
        </p>
      )}
    </>
  )
}

interface PhoneActionProps {
  href: string | null
  label: string
  icon: React.ReactNode
}

function PhoneAction({ href, label, icon }: PhoneActionProps) {
  if (!href) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled
        aria-label={label}
      >
        {icon}
      </Button>
    )
  }
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
    </a>
  )
}

function whatsappUrl(raw: string): string {
  // Strip non-digits so "(555) 123-4567" becomes 5551234567. wa.me only
  // accepts E.164 without leading +.
  const digits = raw.replace(/\D/g, "")
  return `https://wa.me/${digits}`
}

/** "OVERDUE 2d" / "in 5 days" / "today" — stable UTC for the absolute
 *  fallback (post-7d) per 2026-06-14 hydration lesson. */
function expiryLabel(daysRemaining: number, endDateIso: string): string {
  if (daysRemaining < 0) return `OVERDUE ${Math.abs(daysRemaining)}d`
  if (daysRemaining === 0) return "today"
  if (daysRemaining === 1) return "tomorrow"
  if (daysRemaining <= 7) return `in ${daysRemaining} days`
  const d = new Date(endDateIso)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${d.getUTCFullYear()}`
}

function relativeTime(iso: string | null): string {
  if (!iso) return ""
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  const dt = new Date(iso)
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(dt.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${dt.getUTCFullYear()}`
}
