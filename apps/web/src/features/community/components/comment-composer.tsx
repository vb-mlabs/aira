"use client"

// Composer for a new top-level comment or a reply. Owns its own
// textarea state + submit; calls onPosted(comment) on success so the
// parent thread can append the new row without refetching.
//
// `variant="reply"` renders an "@<parent author>" prefix + a Cancel
// button next to the post button. Only top-level comments expose a
// "Reply" affordance in the thread (locked review decision), so a
// composer-in-reply-mode never spawns another nested composer.

import { useState, useTransition } from "react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"
import {
  COMMUNITY_COMMENT_BODY_MAX,
  type CommentRow,
} from "@aira/validators/community"
import { apiClient } from "@/lib/api-client"

interface CommentComposerProps {
  postId: string
  variant?: "topLevel" | "reply"
  /** When variant === "reply", the @<name> handle to prefix into the
   *  empty textarea (purely cosmetic; the body is sent verbatim). */
  replyToName?: string | null
  /** When variant === "reply", the id of the top-level comment we're
   *  replying to. */
  parentId?: string
  /** Called with the newly-created comment on success. The thread
   *  prepends/appends based on context. */
  onPosted: (comment: CommentRow) => void
  /** Reply variant only — closes the inline composer. */
  onCancel?: () => void
}

export function CommentComposer({
  postId,
  variant = "topLevel",
  replyToName,
  parentId,
  onPosted,
  onCancel,
}: CommentComposerProps) {
  const isReply = variant === "reply"
  const initial = isReply && replyToName ? `@${replyToName} ` : ""
  const [body, setBody] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (trimmed.length === 0) {
      setError("Add a comment before posting.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const res = await apiClient.post<{ comment: CommentRow }>(
          `/api/v1/community/posts/${encodeURIComponent(postId)}/comments`,
          {
            id: postId,
            body: trimmed,
            parent_id: isReply ? parentId : undefined,
          },
        )
        setBody(initial)
        onPosted(res.comment)
        if (isReply && onCancel) onCancel()
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Couldn't post your comment.",
        )
      }
    })
  }

  const fieldId = isReply ? `reply-${parentId ?? "x"}` : `comment-${postId}`

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Label htmlFor={fieldId} className="sr-only">
        {isReply ? "Reply" : "Add a comment"}
      </Label>
      <textarea
        id={fieldId}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={COMMUNITY_COMMENT_BODY_MAX}
        rows={isReply ? 2 : 3}
        placeholder={
          isReply ? "Write a reply…" : "Share your thoughts or ask a question…"
        }
        className={cn(
          // Mirror the <Input> primitive (rounded-2xl, transparent bg,
          // border-input, ring-ring/50 focus) so the composer reads as
          // the same input family as every other field in the app.
          "block w-full min-w-0 rounded-2xl border border-input bg-transparent px-3 py-2 text-sm transition-colors",
          "placeholder:text-muted-foreground md:text-sm dark:border-input/30",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
        )}
        autoFocus={isReply}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {body.length} / {COMMUNITY_COMMENT_BODY_MAX}
        </p>
        <div className="flex items-center gap-2">
          {isReply && onCancel && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={pending || body.trim().length === 0}
          >
            {pending ? "Posting…" : isReply ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
