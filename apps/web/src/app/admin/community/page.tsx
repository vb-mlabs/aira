// /admin/community — F20 v2 moderation queue.
//
// Status filter chips drive the list via ?status=. Default: "all" so the
// admin lands on the full picture; pending is one chip click away. Chip
// badges show counts from the same round-trip that fetched the rows.

import { apiServerFetch } from "@aira/api/server"
import { CommunityPostStatusSchema } from "@aira/validators/community"
import { adminListCommunityPostsOp } from "@/server/operations/community"
import { ModerationQueue } from "@/features/admin/community/moderation-queue"
import {
  StatusFilter,
  type StatusFilterValue,
} from "@/features/admin/community/status-filter"
import { AdminPageHeader } from "../_components/page-header"

export const metadata = { title: "Admin · Community" }
export const dynamic = "force-dynamic"

interface AdminCommunityPageProps {
  searchParams: Promise<{ status?: string }>
}

/** Default landing: "all". Pending stays one chip click away. Any
 *  unrecognised ?status= value falls back to "all" silently so a bookmark
 *  with a stale value doesn't break the page. */
function parseStatus(raw: string | undefined): StatusFilterValue {
  if (raw === undefined || raw === "all") return "all"
  const parsed = CommunityPostStatusSchema.safeParse(raw)
  return parsed.success ? parsed.data : "all"
}

export default async function AdminCommunityPage({
  searchParams,
}: AdminCommunityPageProps) {
  const sp = await searchParams
  const status = parseStatus(sp.status)

  const res = await apiServerFetch(adminListCommunityPostsOp, {
    input: {
      status: status === "all" ? undefined : status,
      page: 1,
      pageSize: 50,
    },
  })
  const items = res.data?.items ?? []
  const counts = res.data?.status_counts ?? {
    pending: 0,
    approved: 0,
    expired: 0,
    rejected: 0,
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Community"
        subtitle={`${counts.pending} pending · ${counts.approved} approved · ${counts.expired} expired · ${counts.rejected} rejected`}
      />
      <StatusFilter currentStatus={status} counts={counts} />
      <ModerationQueue initialItems={items} currentStatus={status} />
    </div>
  )
}
