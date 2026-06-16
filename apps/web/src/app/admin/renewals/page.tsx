// /admin/renewals — F23′ admin renewal follow-up queue.
//
// RSC fetches the queue + subtitle counts via apiServerFetch. The
// chips (RSC, plain Link-based) drive ?withinDays= URL state; the
// page re-renders with a fresh queue on each chip click. The table
// itself is client-side because it holds the row-select state for the
// follow-up modal (wired in T9).

import { Suspense } from "react"
import { apiServerFetch } from "@aira/api/server"
import { listFollowupQueueOp } from "@/server/operations/subscription-followups"
import { AdminPageHeader } from "../_components/page-header"
import { RenewalQueueTable } from "@/features/admin/renewals/renewal-queue-table"
import { WindowChips } from "@/features/admin/renewals/window-chips"

export const metadata = { title: "Admin · Renewals" }
export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ withinDays?: string }>
}

const ALLOWED_WINDOWS = [7, 14, 30, 60, 90] as const

function parseWindow(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(parsed)) return 30
  return (ALLOWED_WINDOWS as readonly number[]).includes(parsed) ? parsed : 30
}

export default async function AdminRenewalsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const withinDays = parseWindow(sp.withinDays)

  const res = await apiServerFetch(listFollowupQueueOp, {
    input: { withinDays },
  })
  const result = res.data!
  const items = result.items
  const total = result.total
  const overdue = items.filter((r) => r.days_remaining < 0).length
  const dueSoon = items.length - overdue

  const subtitle =
    items.length === 0
      ? "Nothing due in this window — you're caught up."
      : `${overdue} overdue · ${dueSoon} due in ${withinDays} days${
          total > items.length ? ` · ${total - items.length} hidden` : ""
        }`

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Renewals" subtitle={subtitle} />

      <Suspense>
        <WindowChips current={withinDays} />
      </Suspense>

      <RenewalQueueTable
        items={items}
        total={total}
        withinDays={withinDays}
      />
    </div>
  )
}
