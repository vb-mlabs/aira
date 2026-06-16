"use client"

// F20 v2 — admin edit modal.
//
// Lets the admin fix the title/body of any post regardless of status.
// Status never changes on edit (locked review decision). Only the changed
// fields go to the server; the validator's .refine() rejects a no-op PATCH.

import { useMemo, useState, useTransition } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"
import {
  COMMUNITY_POST_BODY_MAX,
  COMMUNITY_POST_TITLE_MAX,
  type AdminPostRow,
} from "@aira/validators/community"
import { apiClient } from "@/lib/api-client"

interface EditPostModalProps {
  post: AdminPostRow
  open: boolean
  onClose: () => void
  onSaved: (post: AdminPostRow) => void
}

export function EditPostModal({
  post,
  open,
  onClose,
  onSaved,
}: EditPostModalProps) {
  const [title, setTitle] = useState(post.title)
  const [body, setBody] = useState(post.body ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const titleChanged = title.trim() !== post.title.trim()
  const bodyChanged = useMemo(() => {
    const next = body.trim().length === 0 ? null : body.trim()
    return next !== (post.body ?? null)
  }, [body, post.body])

  const canSave =
    !pending && (titleChanged || bodyChanged) && title.trim().length > 0

  function handleOpenChange(next: boolean) {
    if (!next) {
      onClose()
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setError(null)
    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()
    const update: { id: string; title?: string; body?: string | null } = {
      id: post.id,
    }
    if (titleChanged) update.title = trimmedTitle
    if (bodyChanged) update.body = trimmedBody.length === 0 ? null : trimmedBody

    startTransition(async () => {
      try {
        const res = await apiClient.patch<{ post: AdminPostRow }>(
          `/api/v1/admin/community/posts/${encodeURIComponent(post.id)}/edit`,
          update,
        )
        onSaved(res.post)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
          return
        }
        throw err
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(540px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                Edit request
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Status stays {post.status}. The author won&rsquo;t be notified.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-title-${post.id}`}>Title</Label>
              <Input
                id={`edit-title-${post.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={COMMUNITY_POST_TITLE_MAX}
                required
              />
              <p className="text-xs text-muted-foreground">
                {title.length} / {COMMUNITY_POST_TITLE_MAX}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-body-${post.id}`}>Body</Label>
              <textarea
                id={`edit-body-${post.id}`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={COMMUNITY_POST_BODY_MAX}
                rows={4}
                className={cn(
                  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
                )}
                placeholder="Leave empty to clear the body."
              />
              <p className="text-xs text-muted-foreground">
                {body.length} / {COMMUNITY_POST_BODY_MAX}
              </p>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" disabled={!canSave}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
