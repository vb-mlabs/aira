"use client"

// Admin moderation queue for F20 Community Requests.
//
// Renders the server-fetched PENDING list and gives each row Approve /
// Reject (with reason) controls. Calls PATCH
// /api/v1/admin/community/posts/[id] and removes the row on success so
// the moderator gets immediate feedback.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"
import { EmptyState } from "@/lib/ui"
import { Mail } from "lucide-react"
import type { AdminPostRow } from "@aira/validators/community"

interface ModerationQueueProps {
  initialItems: AdminPostRow[]
}

interface ModerateResponse {
  post: AdminPostRow
}

export function ModerationQueue({ initialItems }: ModerationQueueProps) {
  const router = useRouter()
  const [items, setItems] = useState<AdminPostRow[]>(initialItems)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [errorById, setErrorById] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="Nothing waiting for review"
        description="When a community member submits a request, it shows up here for moderation."
      />
    )
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

  return (
    <ul className="space-y-4">
      {items.map((post) => {
        const isRejecting = rejectingId === post.id
        const rowError = errorById[post.id]
        return (
          <li
            key={post.id}
            className="rounded-xl bg-card px-6 py-5 shadow-[var(--shadow-card)]"
          >
            <header className="flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-bold">{post.author_name}</p>
              {post.author_email && (
                <p className="text-xs text-muted-foreground">
                  · {post.author_email}
                </p>
              )}
              <span className="text-xs text-muted-foreground">
                · submitted {relativeTime(post.created_at)}
              </span>
            </header>

            <h3 className="mt-3 font-display text-xl leading-snug">
              {post.title}
            </h3>
            {post.body && (
              <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                {post.body}
              </p>
            )}

            {rowError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {rowError}
              </p>
            )}

            {isRejecting ? (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <Label htmlFor={`reject-reason-${post.id}`}>
                  Note for the author (optional)
                </Label>
                <textarea
                  id={`reject-reason-${post.id}`}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className={cn(
                    "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
                  )}
                  placeholder="Tone is too commercial; please rephrase as a request, not an offer."
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
                    size="sm"
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
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setRejectingId(post.id)}
                >
                  <X aria-hidden />
                  Reject
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => moderate(post.id, "approve")}
                  className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]"
                >
                  <Check aria-hidden />
                  {pending ? "Approving…" : "Approve"}
                </Button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
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
  return new Date(iso).toLocaleDateString()
}
