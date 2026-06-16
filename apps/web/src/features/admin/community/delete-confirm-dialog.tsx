"use client"

// F20 v2 — delete confirm using @base-ui/react/alert-dialog. Same pattern
// as ArchiveControl. Hard delete is irreversible; the dialog body always
// surfaces that, plus a soft warning when the post has respondents.

import { useState, useTransition } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Trash2 } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { apiClient } from "@/lib/api-client"
import type { AdminPostRow } from "@aira/validators/community"

interface DeleteConfirmDialogProps {
  post: AdminPostRow
  open: boolean
  onClose: () => void
  onDeleted: () => void
}

export function DeleteConfirmDialog({
  post,
  open,
  onClose,
  onDeleted,
}: DeleteConfirmDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  function confirm() {
    setError(null)
    startTransition(async () => {
      try {
        await apiClient.delete(
          `/api/v1/admin/community/posts/${encodeURIComponent(post.id)}`,
        )
        onDeleted()
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
          return
        }
        throw err
      }
    })
  }

  const hasRespondents = post.interest_count > 0

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-[var(--shadow-card-hover)]">
          <AlertDialog.Title className="flex items-center gap-2 font-display text-xl text-foreground">
            <Trash2 className="size-5 text-destructive" aria-hidden />
            Delete request?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">&ldquo;{post.title}&rdquo;</span>{" "}
            will be removed permanently. This cannot be undone.
          </AlertDialog.Description>
          {hasRespondents && (
            <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-xs text-foreground">
              {post.interest_count}{" "}
              {post.interest_count === 1 ? "neighbour" : "neighbours"} offered
              to help — they won&rsquo;t be notified.
            </p>
          )}
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
              variant="destructive"
              size="sm"
              onClick={confirm}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
