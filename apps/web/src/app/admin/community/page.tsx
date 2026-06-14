// /admin/community — F20 v2 moderation queue.
//
// Status filter chips drive the list via ?status=. Default: pending (the
// daily workflow). Chip badges show counts from the same round-trip that
// fetched the rows.

import { apiServerFetch } from "@aira/api/server"
import {
  CommunityPostStatusSchema,
  type CommunityPostStatus,
} from "@aira/validators/community"
import { adminListCommunityPostsOp } from "@/server/operations/community"
import { ModerationQueue } from "@/features/admin/community/moderation-queue"
import { StatusFilter } from "@/features/admin/community/status-filter"
import { AdminPageHeader } from "../_components/page-header"

export const metadata = { title: "Admin · Community" }
export const dynamic = "force-dynamic"

interface AdminCommunityPageProps {
  searchParams: Promise<{ status?: string }>
}

function parseStatus(raw: string | undefined): CommunityPostStatus {
  if (raw === undefined) return "pending"
  const parsed = CommunityPostStatusSchema.safeParse(raw)
  return parsed.success ? parsed.data : "pending"
}

export default async function AdminCommunityPage({
  searchParams,
}: AdminCommunityPageProps) {
  const sp = await searchParams
  const status = parseStatus(sp.status)

  const res = await apiServerFetch(adminListCommunityPostsOp, {
    input: { status, page: 1, pageSize: 50 },
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
