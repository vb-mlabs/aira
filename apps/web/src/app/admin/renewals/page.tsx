// /admin/renewals — F23′ admin renewal follow-up queue.
//
// RSC fetches the queue + subtitle counts via apiServerFetch. The
// chips (RSC, plain Link-based) drive ?withinDays= + ?showAll= URL
// state; the page re-renders with a fresh queue on each chip click.
// The table itself is client-side because it holds the row-select
// state for the follow-up modal.
//
// showAll toggle: default false hides resolved (paid/refused) and
// scheduled-future rows via the service's inActiveQueue filter.
// ?showAll=1 flips includeAll on the op input so the resolved tail
// comes through with the "Resolved" / "Scheduled" badges rendered by
// RenewalQueueTable. Subtitle math surfaces the extra bucket counts
// when they're > 0 so the header still tells the admin what they're
// looking at.

import { Suspense } from "react"
import { apiServerFetch } from "@aira/api/server"
import { listFollowupQueueOp } from "@/server/operations/subscription-followups"
import { AdminPageHeader } from "../_components/page-header"
import { RenewalQueueTable } from "@/features/admin/renewals/renewal-queue-table"
import { WindowChips } from "@/features/admin/renewals/window-chips"

export const metadata = { title: "Admin · Renewals" }
export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ withinDays?: string; showAll?: string }>
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
  // Exact-1 accept — same convention the ?archived=1 flag uses on
  // /admin/businesses. z.enum in the validator will silently drop
  // anything else, but the page can safely short-circuit here.
  const showAll = sp.showAll === "1"

  const res = await apiServerFetch(listFollowupQueueOp, {
    input: { withinDays, includeAll: showAll },
  })
  const result = res.data!
  const items = result.items
  const total = result.total
  const overdue = items.filter((r) => r.days_remaining < 0).length
  // "Due soon" is intentionally the active tail — not-overdue AND not
  // resolved / scheduled. In showAll mode the resolved/scheduled
  // buckets are broken out separately so the subtitle math stays
  // honest.
  const resolved = showAll
    ? items.filter(
        (r) => r.last_outcome === "paid" || r.last_outcome === "refused",
      ).length
    : 0
  const scheduled = showAll
    ? items.filter(
        (r) =>
          r.last_outcome !== "paid" &&
          r.last_outcome !== "refused" &&
          r.scheduled_next !== null &&
          new Date(r.scheduled_next).getTime() > Date.now(),
      ).length
    : 0
  const dueSoon = items.length - overdue - resolved - scheduled

  const subtitle =
    items.length === 0
      ? "Nothing due in this window — you're caught up."
      : `${overdue} overdue · ${dueSoon} due in ${withinDays} days${
          scheduled > 0 ? ` · ${scheduled} scheduled` : ""
        }${resolved > 0 ? ` · ${resolved} resolved` : ""}${
          total > items.length ? ` · ${total - items.length} hidden` : ""
        }`

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Renewals" subtitle={subtitle} />

      <Suspense>
        <WindowChips current={withinDays} showAll={showAll} />
      </Suspense>

      <RenewalQueueTable
        items={items}
        total={total}
        withinDays={withinDays}
      />
    </div>
  )
}
