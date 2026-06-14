// F20 v2 — admin community queue table. Pure list surface; click any
// title to drill into /admin/community/[id] for the body, rejected
// reason, respondent details, and all action buttons.
//
// Server component — no client state, no inline actions. Matches the
// /admin/businesses table pattern.

import Link from "next/link"
import { Mail } from "lucide-react"
import { cn } from "@aira/ui-web/utils"
import { AdminBadge, type AdminBadgeVariant } from "@/features/admin"
import { EmptyState } from "@/lib/ui"
import type {
  AdminPostRow,
  CommunityPostStatus,
} from "@aira/validators/community"
import type { StatusFilterValue } from "./status-filter"

interface CommunityTableProps {
  items: AdminPostRow[]
  currentStatus: StatusFilterValue
}

const EMPTY_COPY: Record<
  StatusFilterValue,
  { title: string; description: string }
> = {
  all: {
    title: "No requests yet",
    description:
      "When a community member submits a request, it shows up here for moderation.",
  },
  pending: {
    title: "Nothing waiting for review",
    description:
      "When a community member submits a request, it shows up here for moderation.",
  },
  approved: {
    title: "No approved posts",
    description: "Approve a pending request to see it land here.",
  },
  expired: {
    title: "No expired posts yet",
    description:
      "Posts expire automatically after their schedule; expired rows surface here for cleanup.",
  },
  rejected: {
    title: "No rejected posts",
    description: "Rejected posts stay here for the record.",
  },
}

const STATUS_VARIANT: Record<CommunityPostStatus, AdminBadgeVariant> = {
  pending: "pending",
  approved: "active",
  expired: "inactive",
  rejected: "failed",
}

const STATUS_LABEL: Record<CommunityPostStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  expired: "Expired",
  rejected: "Rejected",
}

export function CommunityTable({ items, currentStatus }: CommunityTableProps) {
  if (items.length === 0) {
    const copy = EMPTY_COPY[currentStatus]
    return <EmptyState icon={Mail} title={copy.title} description={copy.description} />
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">User</th>
            <th className="px-4 py-3 text-left font-semibold">Request</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Helpers</th>
            <th className="px-4 py-3 text-left font-semibold">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((post) => (
            <tr key={post.id} className={cn("hover:bg-muted/20")}>
              <td className="px-4 py-3">
                <p className="font-medium">{post.author_name}</p>
                {post.author_email && (
                  <p className="text-xs text-muted-foreground">
                    {post.author_email}
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/community/${post.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {post.title}
                </Link>
                {post.body && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {post.body}
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                <AdminBadge
                  variant={STATUS_VARIANT[post.status]}
                  label={STATUS_LABEL[post.status]}
                />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {post.interest_count}
              </td>
              <td className="px-4 py-3 text-muted-foreground" suppressHydrationWarning>
                {relativeTime(post.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function relativeTime(iso: string): string {
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
