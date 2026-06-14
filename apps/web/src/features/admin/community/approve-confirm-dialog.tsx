"use client"

// F20 v2 — approve confirm. Mirrors the delete confirm pattern so
// admin-side moderation actions share one mental model: every
// state-change requires an explicit confirm.

import { useState, useTransition } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Check } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { apiClient } from "@/lib/api-client"
import type { AdminPostRow } from "@aira/validators/community"

interface ApproveConfirmDialogProps {
  post: AdminPostRow
  open: boolean
  onClose: () => void
  onApproved: (post: AdminPostRow) => void
}

interface ModerateResponse {
  post: AdminPostRow
}

export function ApproveConfirmDialog({
  post,
  open,
  onClose,
  onApproved,
}: ApproveConfirmDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  function confirm() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await apiClient.patch<ModerateResponse>(
          `/api/v1/admin/community/posts/${encodeURIComponent(post.id)}`,
          { id: post.id, action: "approve" },
        )
        onApproved(res.post)
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
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-[var(--shadow-card-hover)]">
          <AlertDialog.Title className="flex items-center gap-2 font-display text-xl text-foreground">
            <Check className="size-5 text-primary" aria-hidden />
            Approve request?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">&ldquo;{post.title}&rdquo;</span>{" "}
            will go live on the community board and start its expiry window.
          </AlertDialog.Description>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onClose()}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirm}
              disabled={pending}
              className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]"
            >
              {pending ? "Approving…" : "Approve"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
