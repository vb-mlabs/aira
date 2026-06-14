"use client"

// F20 v2 — admin community queue.
//
// Status-aware actions on each card:
//   - status === "pending":       Approve / Reject (with reason)
//   - any status:                 Edit (modal) / Delete (confirm)
//                                  Respondent expander when count > 0
//
// Editing never changes the status — approve/reject remain the only
// state-change actions. Deletes are hard, cascade through post_interest,
// and write an audit_log snapshot before the DELETE so the trail can
// reconstruct the row.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Mail, Pencil, Trash2, X } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"
import { EmptyState } from "@/lib/ui"
import type {
  AdminPostRow,
  CommunityPostStatus,
} from "@aira/validators/community"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import { EditPostModal } from "./edit-post-modal"
import { RespondentList } from "./respondent-list"
import type { StatusFilterValue } from "./status-filter"

interface ModerationQueueProps {
  initialItems: AdminPostRow[]
  currentStatus: StatusFilterValue
}

interface ModerateResponse {
  post: AdminPostRow
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
    description:
      "Rejected posts stay here for the record. The user can resubmit if needed.",
  },
}

export function ModerationQueue({
  initialItems,
  currentStatus,
}: ModerationQueueProps) {
  const router = useRouter()
  const [items, setItems] = useState<AdminPostRow[]>(initialItems)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorById, setErrorById] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  if (items.length === 0) {
    const copy = EMPTY_COPY[currentStatus]
    return <EmptyState icon={Mail} title={copy.title} description={copy.description} />
  }

  function clearError(id: string) {
    setErrorById((prev) => {
      if (!(id in prev)) return prev
      const { [id]: _omit, ...rest } = prev
      return rest
    })
  }

  function moderate(id: string, action: "approve" | "reject", reason?: string) {
    clearError(id)
    startTransition(async () => {
      try {
        await apiClient.patch<ModerateResponse>(
          `/api/v1/admin/community/posts/${encodeURIComponent(id)}`,
          {
            id,
            action,
            ...(reason ? { rejected_reason: reason } : {}),
          },
        )
        // The card leaves the current view since its status changed.
        setItems((rows) => rows.filter((r) => r.id !== id))
        setRejectingId(null)
        setRejectReason("")
        router.refresh()
      } catch (err) {
        if (err instanceof ApiError) {
          setErrorById((prev) => ({ ...prev, [id]: err.message }))
          return
        }
        throw err
      }
    })
  }

  function onEdited(updated: AdminPostRow) {
    setItems((rows) => rows.map((r) => (r.id === updated.id ? updated : r)))
    setEditingId(null)
  }

  function onDeleted(id: string) {
    setItems((rows) => rows.filter((r) => r.id !== id))
    setDeletingId(null)
    router.refresh()
  }

  return (
    <ul className="space-y-2">
      {items.map((post) => {
        const isRejecting = rejectingId === post.id
        const rowError = errorById[post.id]
        const isPending = post.status === "pending"
        return (
          <li
            key={post.id}
            className="rounded-lg bg-card px-4 py-3 shadow-[var(--shadow-card)]"
          >
            <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-xs font-bold">{post.author_name}</p>
              {post.author_email && (
                <p className="text-[11px] text-muted-foreground">
                  · {post.author_email}
                </p>
              )}
              {/* suppressHydrationWarning: relativeTime() reads Date.now()
                  so server + client can disagree on minute boundaries, and
                  the >7d fallback hands off to a stable UTC formatter that
                  can still differ from the browser's locale on first
                  paint. React reconciles to the client value either way. */}
              <span
                className="text-[11px] text-muted-foreground"
                suppressHydrationWarning
              >
                · {isPending ? "submitted" : statusLabel(post.status)}{" "}
                {relativeTime(post.created_at)}
              </span>
              {post.rejected_reason && (
                <p className="basis-full text-[11px] italic text-muted-foreground">
                  Rejected: {post.rejected_reason}
                </p>
              )}
            </header>

            <h3 className="mt-1.5 font-display text-[15px] font-semibold leading-snug">
              {post.title}
            </h3>
            {post.body && (
              <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-foreground/85">
                {post.body}
              </p>
            )}

            {post.status === "approved" || post.status === "expired" ? (
              <RespondentList
                postId={post.id}
                interestCount={post.interest_count}
              />
            ) : null}

            {rowError && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {rowError}
              </p>
            )}

            {isRejecting ? (
              <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
                <Label
                  htmlFor={`reject-reason-${post.id}`}
                  className="text-xs"
                >
                  Note for the author (optional)
                </Label>
                <textarea
                  id={`reject-reason-${post.id}`}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className={cn(
                    "block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
                  )}
                  placeholder="Tone is too commercial; please rephrase as a request, not an offer."
                />
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setRejectingId(null)
                      setRejectReason("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    disabled={pending}
                    onClick={() =>
                      moderate(post.id, "reject", rejectReason.trim() || undefined)
                    }
                  >
                    {pending ? "Rejecting…" : "Reject"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5 border-t border-border pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setEditingId(post.id)}
                  disabled={pending}
                >
                  <Pencil aria-hidden />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  onClick={() => setDeletingId(post.id)}
                  disabled={pending}
                >
                  <Trash2 aria-hidden />
                  Delete
                </Button>
                {isPending && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={pending}
                      onClick={() => setRejectingId(post.id)}
                    >
                      <X aria-hidden />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      disabled={pending}
                      onClick={() => moderate(post.id, "approve")}
                      className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]"
                    >
                      <Check aria-hidden />
                      {pending ? "Approving…" : "Approve"}
                    </Button>
                  </>
                )}
              </div>
            )}

            {editingId === post.id && (
              <EditPostModal
                post={post}
                open
                onClose={() => setEditingId(null)}
                onSaved={onEdited}
              />
            )}
            {deletingId === post.id && (
              <DeleteConfirmDialog
                post={post}
                open
                onClose={() => setDeletingId(null)}
                onDeleted={() => onDeleted(post.id)}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

function statusLabel(status: CommunityPostStatus): string {
  switch (status) {
    case "approved":
      return "approved"
    case "expired":
      return "expired"
    case "rejected":
      return "rejected"
    case "pending":
      return "submitted"
  }
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
  // Stable MM/DD/YYYY in UTC — toLocaleDateString() differs between the
  // Node runtime (server) and the browser, triggering a hydration mismatch.
  const dt = new Date(iso)
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(dt.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${dt.getUTCFullYear()}`
}
