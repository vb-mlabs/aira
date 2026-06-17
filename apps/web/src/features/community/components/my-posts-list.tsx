"use client"

// Author's own posts across all statuses (pending + approved + expired
// + rejected). Edit opens PostEditForm; Delete shows an inline confirm.
// When the page URL carries ?just_posted=1, render a one-shot "Your
// post is waiting for moderation" banner above the list.

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Pencil,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react"
import { ApiError } from "@aira/api"
import { brand } from "@aira/config"
import { Button } from "@aira/ui-web/button"
import { cn } from "@aira/ui-web/utils"
import type {
  AdminPostRow,
  CommunityPostStatus,
} from "@aira/validators/community"
import { apiClient } from "@/lib/api-client"
import { EmptyState } from "@/lib/ui"
import { PostEditForm } from "./post-edit-form"

interface MyPostsListProps {
  initialItems: AdminPostRow[]
}

export function MyPostsList({ initialItems }: MyPostsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justPosted = searchParams.get("just_posted") === "1"

  const [items, setItems] = useState<AdminPostRow[]>(initialItems)
  const [editing, setEditing] = useState<AdminPostRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showBanner, setShowBanner] = useState(justPosted)

  // Clear the ?just_posted=1 query after the banner mounts so a refresh
  // doesn't keep showing it. router.replace + scroll: false keeps the
  // viewport steady.
  useEffect(() => {
    if (!justPosted) return
    const next = new URL(window.location.href)
    next.searchParams.delete("just_posted")
    window.history.replaceState(null, "", next.toString())
  }, [justPosted])

  function handleSaved(updated: AdminPostRow) {
    setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setEditing(null)
    router.refresh()
  }

  function handleDelete(id: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await apiClient.delete(`/api/v1/community/posts/${encodeURIComponent(id)}`)
        setItems((prev) => prev.filter((p) => p.id !== id))
        setConfirmDelete(null)
        router.refresh()
      } catch (err) {
        setActionError(
          err instanceof ApiError ? err.message : "Could not delete that post.",
        )
      }
    })
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No posts yet"
        description={`Share a room, a question, an item, anything — your post will appear here.`}
        action={{ label: `Post on ${brand.name}`, href: "/community" }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {showBanner && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
        >
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden
          />
          <div className="flex-1">
            <p className="font-medium">Your post is waiting for moderation.</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A moderator will review it shortly. It&rsquo;ll appear on
              the board once approved.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((post) => (
          <li
            key={post.id}
            className="rounded-xl bg-card p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/community/${post.id}`}
                  className="font-display text-lg leading-tight text-foreground hover:underline"
                >
                  {post.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <StatusPill status={post.status} />
                  <span suppressHydrationWarning>
                    {relativeTime(post.created_at)}
                  </span>
                  {post.interest_count > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <HeartHandshake className="size-3" aria-hidden />
                      {post.interest_count}{" "}
                      {post.interest_count === 1 ? "interested" : "interested"}
                    </span>
                  )}
                </div>
                {post.body && (
                  <p className="mt-2 line-clamp-2 text-sm text-foreground/85">
                    {post.body}
                  </p>
                )}
                {post.status === "rejected" && post.rejected_reason && (
                  <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-foreground">
                    <span className="font-medium">Moderator note: </span>
                    {post.rejected_reason}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(post)}
                  disabled={post.status === "expired" || post.status === "rejected"}
                  title={
                    post.status === "expired" || post.status === "rejected"
                      ? `${post.status === "expired" ? "Expired" : "Rejected"} posts can't be edited`
                      : undefined
                  }
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(post.id)}
                  disabled={pending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete
                </Button>
              </div>
            </div>

            {confirmDelete === post.id && (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="mr-auto text-xs text-foreground">
                  Delete this post? Replies, comments, and interest will
                  all be removed.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete(null)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(post.id)}
                  disabled={pending}
                >
                  {pending ? "Deleting…" : "Delete"}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <PostEditForm
          post={editing}
          open
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

function StatusPill({ status }: { status: CommunityPostStatus }) {
  const map: Record<
    CommunityPostStatus,
    { label: string; cls: string; Icon: typeof Clock }
  > = {
    pending: {
      label: "Pending review",
      cls: "border-warning/40 bg-warning/10 text-warning-foreground",
      Icon: Clock,
    },
    approved: {
      label: "Live",
      cls: "border-primary/30 bg-primary/10 text-primary",
      Icon: CheckCircle2,
    },
    expired: {
      label: "Expired",
      cls: "border-border bg-muted text-muted-foreground",
      Icon: CalendarClock,
    },
    rejected: {
      label: "Not approved",
      cls: "border-destructive/30 bg-destructive/10 text-destructive",
      Icon: XCircle,
    },
  }
  const { label, cls, Icon } = map[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        cls,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
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
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  const dt = new Date(iso)
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(dt.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${dt.getUTCFullYear()}`
}
