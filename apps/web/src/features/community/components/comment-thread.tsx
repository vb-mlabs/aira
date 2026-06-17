"use client"

// Thread-style comments for a community post. Auto-fetches on mount;
// signed-in viewers can comment + reply; comment authors + admins can
// delete their own rows. Hidden comments render as a tombstone
// "Comment removed by moderator" with no author attribution; replies
// under a tombstone keep rendering normally.

import { useEffect, useState, useTransition } from "react"
import { MessageCircle, Trash2 } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { cn } from "@aira/ui-web/utils"
import type {
  CommentRow,
  CommentThreadNode,
} from "@aira/validators/community"
import { apiClient } from "@/lib/api-client"
import { CommentComposer } from "./comment-composer"

interface CommentThreadProps {
  postId: string
  /** When the post isn't accepting comments (status !== approved), the
   *  composer is replaced with a muted explainer line. */
  acceptsComments: boolean
  /** Drives the "delete my own" affordance. null = anonymous viewer
   *  (composer is hidden; the (app) shell already redirects unauthed
   *  callers to /login). */
  currentUserId: string | null
  /** True when the viewer is admin/super_admin — exposes the Delete
   *  affordance on every row in addition to authors' own rows. */
  isAdmin?: boolean
}

interface ListResponse {
  items: CommentThreadNode[]
}

export function CommentThread({
  postId,
  acceptsComments,
  currentUserId,
  isAdmin = false,
}: CommentThreadProps) {
  const [items, setItems] = useState<CommentThreadNode[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [replyOpen, setReplyOpen] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiClient.get<ListResponse>(
          `/api/v1/community/posts/${encodeURIComponent(postId)}/comments`,
          { query: { id: postId } },
        )
        if (!cancelled) setItems(res.data?.items ?? [])
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Couldn't load the comments.",
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [postId])

  function handlePosted(comment: CommentRow) {
    if (comment.parent_id === null) {
      setItems((prev) =>
        prev === null
          ? [{ ...comment, replies: [] }]
          : [...prev, { ...comment, replies: [] }],
      )
    } else {
      setItems((prev) =>
        prev === null
          ? prev
          : prev.map((node) =>
              node.id === comment.parent_id
                ? { ...node, replies: [...node.replies, comment] }
                : node,
            ),
      )
    }
  }

  function handleDelete(commentId: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await apiClient.delete(
          `/api/v1/community/comments/${encodeURIComponent(commentId)}`,
        )
        // Cascade in the UI: removing a top-level removes its replies.
        setItems((prev) =>
          prev === null
            ? prev
            : prev
                .filter((node) => node.id !== commentId)
                .map((node) => ({
                  ...node,
                  replies: node.replies.filter((r) => r.id !== commentId),
                })),
        )
      } catch (err) {
        setActionError(
          err instanceof ApiError
            ? err.message
            : "Couldn't delete that comment.",
        )
      }
    })
  }

  const total =
    items?.reduce((sum, node) => sum + 1 + node.replies.length, 0) ?? 0

  return (
    // No card wrapper here — the modal / page container already owns
    // the surface. A bg-card section nested inside another bg-card
    // container reads as a stacked card-on-card.
    <section aria-label="Comments" className="space-y-3">
      <header className="flex items-center gap-2 border-t border-border pt-4">
        <MessageCircle
          className="size-4 text-muted-foreground"
          aria-hidden
        />
        <h3 className="font-display text-base">
          {items === null
            ? "Loading comments…"
            : total === 0
              ? "No comments yet"
              : total === 1
                ? "1 comment"
                : `${total} comments`}
        </h3>
      </header>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="divide-y divide-border">
          {items.map((node) => (
            <li key={node.id} className="py-3 first:pt-0 last:pb-0">
              <CommentRowView
                row={node}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                pending={pending}
              />
              {acceptsComments && currentUserId !== null && (
                <div className="mt-2">
                  {replyOpen === node.id ? (
                    <CommentComposer
                      postId={postId}
                      variant="reply"
                      parentId={node.id}
                      replyToName={node.user_name}
                      onPosted={(c) => {
                        handlePosted(c)
                        setReplyOpen(null)
                      }}
                      onCancel={() => setReplyOpen(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReplyOpen(node.id)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Reply
                    </button>
                  )}
                </div>
              )}
              {node.replies.length > 0 && (
                <ul className="mt-3 space-y-3 border-l-2 border-border pl-4">
                  {node.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentRowView
                        row={reply}
                        isAdmin={isAdmin}
                        currentUserId={currentUserId}
                        onDelete={handleDelete}
                        pending={pending}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {acceptsComments && currentUserId !== null ? (
        <CommentComposer postId={postId} onPosted={handlePosted} />
      ) : !acceptsComments ? (
        <p className="text-xs italic text-muted-foreground">
          This post isn&rsquo;t accepting comments yet.
        </p>
      ) : (
        // currentUserId === null shouldn't happen on /community/(authed)
        // routes, but a hard guard keeps the affordance from rendering
        // for unauth viewers if the surrounding layout ever changes.
        <p className="text-xs italic text-muted-foreground">
          Sign in to join the conversation.
        </p>
      )}
    </section>
  )
}

function CommentRowView({
  row,
  isAdmin,
  currentUserId,
  onDelete,
  pending,
}: {
  row: CommentRow
  isAdmin: boolean
  currentUserId: string | null
  onDelete: (id: string) => void
  pending: boolean
}) {
  const isHidden = row.status === "hidden"
  const canDelete =
    !isHidden &&
    ((currentUserId !== null && row.user_id === currentUserId) || isAdmin)

  if (isHidden) {
    return (
      <p className="text-xs italic text-muted-foreground">
        Comment removed by moderator
      </p>
    )
  }
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold leading-tight">
          {row.user_name ?? "Unknown"}
        </span>
        <span
          className="text-[11px] text-muted-foreground"
          suppressHydrationWarning
        >
          {relativeTime(row.created_at)}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
        {row.body}
      </p>
      {canDelete && (
        <div className="mt-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDelete(row.id)}
            disabled={pending}
            className={cn("h-7 px-2 text-xs text-destructive")}
            title="Delete this comment"
          >
            <Trash2 className="size-3" aria-hidden />
            Delete
          </Button>
        </div>
      )}
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
