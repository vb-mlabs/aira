// /admin/waitlist — admin view of pre-launch waitlist signups.
//
// RSC fetches the counts (for the header tiles + tab chip badges) and
// the active tab's list in parallel via apiServerFetch. Tab state lives
// in the URL (?tab=consumer|business) so a refresh after delete keeps
// the same view. Tables are client components — they need the apiClient
// for delete and clipboard APIs for copy.

import { apiServerFetch } from "@aira/api/server"
import {
  getWaitlistCountsOp,
  listWaitlistOp,
} from "@/server/operations/waitlist-admin"
import type { WaitlistType } from "@aira/validators"
import { AdminPageHeader } from "../_components/page-header"
import { WaitlistCountsHeader } from "@/features/admin/waitlist/waitlist-counts-header"
import { WaitlistTabs } from "@/features/admin/waitlist/waitlist-tabs"
import { ConsumerTable } from "@/features/admin/waitlist/consumer-table"
import { BusinessTable } from "@/features/admin/waitlist/business-table"

export const metadata = { title: "Admin · Waitlist" }
export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

function parseTab(raw: string | undefined): WaitlistType {
  return raw === "business" ? "business" : "consumer"
}

export default async function AdminWaitlistPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const tab = parseTab(sp.tab)

  const [countsRes, listRes] = await Promise.all([
    apiServerFetch(getWaitlistCountsOp, { input: {} }),
    apiServerFetch(listWaitlistOp, { input: { type: tab } }),
  ])

  const counts = countsRes.data!
  const { items, total } = listRes.data!

  const subtitle =
    items.length === 0
      ? "Nothing here yet."
      : items.length < total
        ? `Showing ${items.length} of ${total} · older signups hidden`
        : `${items.length} total`

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Waitlist" subtitle={subtitle} />

      <WaitlistCountsHeader counts={counts} />

      <WaitlistTabs current={tab} counts={counts} />

      {tab === "consumer" ? (
        <ConsumerTable items={items} />
      ) : (
        <BusinessTable items={items} />
      )}
    </div>
  )
}
