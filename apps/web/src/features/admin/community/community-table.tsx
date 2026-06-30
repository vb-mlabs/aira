"use client"

// F20 v2 — admin community queue table.
//
// The whole row is the click target; opening PostDetailModal carries the
// full body + respondents + Approve/Reject flow. Edit + Delete sit on the
// right of each row as icon buttons that stop propagation, opening their
// own dialogs without triggering the row click.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Pencil, Trash2 } from "lucide-react"
import { Button } from "@aira/ui-web/button"
import { AdminBadge, type AdminBadgeVariant } from "@/features/admin"
import { EmptyState } from "@/lib/ui"
import type {
  AdminPostRow,
  CommunityPostStatus,
} from "@aira/validators/community"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import { EditPostModal } from "./edit-post-modal"
import { PostDetailModal } from "./post-detail-modal"
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
    title: "No posts yet",
    description:
      "When a community member submits a post, it shows up here for moderation.",
  },
  pending: {
    title: "Nothing waiting for review",
    description:
      "When a community member submits a post, it shows up here for moderation.",
  },
  approved: {
    title: "No approved posts",
    description: "Approve a pending post to see it land here.",
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

export function CommunityTable({
  items: initialItems,
  currentStatus,
}: CommunityTableProps) {
  const router = useRouter()
  const [items, setItems] = useState<AdminPostRow[]>(initialItems)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function onPostMutated(updated: AdminPostRow) {
    setItems((rows) =>
      rows.map((r) => (r.id === updated.id ? updated : r)),
    )
  }

  function onPostDeleted(id: string) {
    setItems((rows) => rows.filter((r) => r.id !== id))
    setDeletingId(null)
    router.refresh()
  }

  if (items.length === 0) {
    const copy = EMPTY_COPY[currentStatus]
    return <EmptyState icon={Mail} title={copy.title} description={copy.description} />
  }

  const detailPost = items.find((p) => p.id === detailId) ?? null
  const editingPost = items.find((p) => p.id === editingId) ?? null
  const deletingPost = items.find((p) => p.id === deletingId) ?? null

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">User</th>
              <th className="px-4 py-3 text-left font-semibold">Post</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Created</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((post) => (
              <tr
                key={post.id}
                onClick={() => setDetailId(post.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setDetailId(post.id)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View post ${post.title}`}
                className="cursor-pointer hover:bg-muted/20 focus:bg-muted/30 focus:outline-none"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{post.author_name}</p>
                  {post.author_email && (
                    <p className="text-xs text-muted-foreground">
                      {post.author_email}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{post.title}</p>
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
                <td
                  className="px-4 py-3 text-muted-foreground"
                  suppressHydrationWarning
                >
                  {relativeTime(post.created_at)}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  // Stop propagation so clicking the action buttons doesn't
                  // also fire the row's onClick → PostDetailModal.
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingId(post.id)}
                      aria-label={`Edit ${post.title}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeletingId(post.id)}
                      aria-label={`Delete ${post.title}`}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailPost && (
        <PostDetailModal
          post={detailPost}
          open
          onClose={() => setDetailId(null)}
          onModerated={onPostMutated}
        />
      )}

      {editingPost && (
        <EditPostModal
          post={editingPost}
          open
          onClose={() => setEditingId(null)}
          onSaved={onPostMutated}
        />
      )}

      {deletingPost && (
        <DeleteConfirmDialog
          post={deletingPost}
          open
          onClose={() => setDeletingId(null)}
          onDeleted={() => onPostDeleted(deletingPost.id)}
        />
      )}
    </>
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
