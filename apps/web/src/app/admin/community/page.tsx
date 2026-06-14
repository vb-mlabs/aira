// /admin/community — F20 moderation queue.
//
// Lists PENDING community posts; the ModerationQueue client component
// drives approve/reject from there.

import { apiServerFetch } from "@aira/api/server"
import { adminListCommunityPostsOp } from "@/server/operations/community"
import { ModerationQueue } from "@/features/admin/community/moderation-queue"
import { AdminPageHeader } from "../_components/page-header"

export const metadata = { title: "Admin · Community" }
export const dynamic = "force-dynamic"

export default async function AdminCommunityPage() {
  const res = await apiServerFetch(adminListCommunityPostsOp, {
    input: { status: "pending", page: 1, pageSize: 50 },
  })
  const items = res.data?.items ?? []

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Community"
        subtitle={`Posts awaiting moderation${items.length > 0 ? ` · ${items.length}` : ""}.`}
      />
      <ModerationQueue initialItems={items} />
    </div>
  )
}
