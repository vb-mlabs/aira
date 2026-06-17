"use client"

// Admin-side comment moderation strip embedded in the admin post detail
// modal. Lists every comment on the post (visible + hidden) with
// per-row Hide/Restore + Delete affordances. Re-uses the same list
// endpoint as the public CommentThread — defineOperation forwards the
// admin role flag so the service projects hidden bodies for admin
// viewers.

import { useEffect, useState, useTransition } from "react"
import { EyeOff, MessageSquare, RotateCcw, Trash2 } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { cn } from "@aira/ui-web/utils"
import type {
  CommentRow,
  CommentThreadNode,
} from "@aira/validators/community"
import { apiClient } from "@/lib/api-client"

interface CommentModerationProps {
  postId: string
}

interface ListResponse {
  items: CommentThreadNode[]
}

export function CommentModeration({ postId }: CommentModerationProps) {
  const [items, setItems] = useState<CommentThreadNode[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
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
          setLoadError(
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

  function applyToTree(
    prev: CommentThreadNode[] | null,
    commentId: string,
    update: (r: CommentRow) => CommentRow | null,
  ): CommentThreadNode[] | null {
    if (prev === null) return prev
    return prev.flatMap((node) => {
      if (node.id === commentId) {
        const next = update(node)
        if (next === null) return []
        return [{ ...node, ...next }]
      }
      const replies = node.replies.flatMap((reply) => {
        if (reply.id === commentId) {
          const nextReply = update(reply)
          if (nextReply === null) return []
          return [nextReply]
        }
        return [reply]
      })
      return [{ ...node, replies }]
    })
  }

  function handleModerate(commentId: string, action: "hide" | "restore") {
    setActionError(null)
    startTransition(async () => {
      try {
        await apiClient.patch<{ ok: true; status: "visible" | "hidden" }>(
          `/api/v1/admin/community/comments/${encodeURIComponent(commentId)}`,
          { id: commentId, action },
        )
        setItems((prev) =>
          applyToTree(prev, commentId, (r) => ({
            ...r,
            status: action === "hide" ? "hidden" : "visible",
          })),
        )
      } catch (err) {
        setActionError(
          err instanceof ApiError
            ? err.message
            : "Couldn't moderate that comment.",
        )
      }
    })
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
    <section
      aria-label="Comment moderation"
      className="space-y-3"
    >
      <header className="flex items-center gap-2">
        <MessageSquare
          className="size-4 text-muted-foreground"
          aria-hidden
        />
        <h3 className="font-display text-base">
          {items === null
            ? "Loading comments…"
            : total === 0
              ? "No comments on this post"
              : total === 1
                ? "1 comment"
                : `${total} comments`}
        </h3>
      </header>

      {loadError && (
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((node) => (
            <li
              key={node.id}
              className="rounded-md border border-border bg-background/40 px-3 py-2"
            >
              <CommentRowAdmin
                row={node}
                onModerate={handleModerate}
                onDelete={handleDelete}
                pending={pending}
              />
              {node.replies.length > 0 && (
                <ul className="mt-2 space-y-2 border-l-2 border-border pl-3">
                  {node.replies.map((reply) => (
                    <li key={reply.id} className="pl-1">
                      <CommentRowAdmin
                        row={reply}
                        onModerate={handleModerate}
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
    </section>
  )
}

function CommentRowAdmin({
  row,
  onModerate,
  onDelete,
  pending,
}: {
  row: CommentRow
  onModerate: (id: string, action: "hide" | "restore") => void
  onDelete: (id: string) => void
  pending: boolean
}) {
  const isHidden = row.status === "hidden"
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
        {isHidden && (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
            Hidden
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-1 whitespace-pre-line text-sm leading-relaxed",
          isHidden ? "text-muted-foreground italic" : "text-foreground/85",
        )}
      >
        {row.body}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {isHidden ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onModerate(row.id, "restore")}
            disabled={pending}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className="size-3" aria-hidden />
            Restore
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onModerate(row.id, "hide")}
            disabled={pending}
            className="h-7 px-2 text-xs"
          >
            <EyeOff className="size-3" aria-hidden />
            Hide
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onDelete(row.id)}
          disabled={pending}
          className="h-7 px-2 text-xs text-destructive"
        >
          <Trash2 className="size-3" aria-hidden />
          Delete
        </Button>
      </div>
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
