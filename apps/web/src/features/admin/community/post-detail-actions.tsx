"use client"

// F20 v2 — admin action buttons for /admin/community/[id].
//
// Owns the four confirmation flows (Approve / Reject / Edit / Delete).
// Status-aware: Approve + Reject only on pending; Edit + Delete on every
// status. After delete the admin lands back on the queue; other actions
// stay on the detail page and refresh in place.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Pencil, Trash2, X } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"
import type { AdminPostRow } from "@aira/validators/community"
import { ApproveConfirmDialog } from "./approve-confirm-dialog"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import { EditPostModal } from "./edit-post-modal"

interface PostDetailActionsProps {
  post: AdminPostRow
}

interface ModerateResponse {
  post: AdminPostRow
}

export function PostDetailActions({ post: initialPost }: PostDetailActionsProps) {
  const router = useRouter()
  const [post, setPost] = useState<AdminPostRow>(initialPost)
  const [editing, setEditing] = useState(false)
  const [approving, setApproving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [rejectPending, startRejectTransition] = useTransition()

  const isPending = post.status === "pending"

  function onApproved(updated: AdminPostRow) {
    setPost(updated)
    setApproving(false)
    router.refresh()
  }

  function onEdited(updated: AdminPostRow) {
    setPost(updated)
    setEditing(false)
    router.refresh()
  }

  function onDeleted() {
    setDeleting(false)
    router.push("/admin/community")
    router.refresh()
  }

  function submitReject() {
    setError(null)
    startRejectTransition(async () => {
      try {
        const res = await apiClient.patch<ModerateResponse>(
          `/api/v1/admin/community/posts/${encodeURIComponent(post.id)}`,
          {
            id: post.id,
            action: "reject",
            ...(rejectReason.trim()
              ? { rejected_reason: rejectReason.trim() }
              : {}),
          },
        )
        setPost(res.post)
        setRejecting(false)
        setRejectReason("")
        router.refresh()
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
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {rejecting ? (
        <div className="space-y-2 rounded-lg bg-card p-4 shadow-[var(--shadow-card)]">
          <Label htmlFor="reject-reason" className="text-xs">
            Note for the author (optional)
          </Label>
          <textarea
            id="reject-reason"
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
                setRejecting(false)
                setRejectReason("")
              }}
              disabled={rejectPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={submitReject}
              disabled={rejectPending}
            >
              {rejectPending ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {isPending && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => setApproving(true)}
                className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]"
              >
                <Check aria-hidden />
                Approve
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejecting(true)}
              >
                <X aria-hidden />
                Reject
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil aria-hidden />
            Edit
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleting(true)}
          >
            <Trash2 aria-hidden />
            Delete
          </Button>
        </div>
      )}

      {approving && (
        <ApproveConfirmDialog
          post={post}
          open
          onClose={() => setApproving(false)}
          onApproved={onApproved}
        />
      )}
      {editing && (
        <EditPostModal
          post={post}
          open
          onClose={() => setEditing(false)}
          onSaved={onEdited}
        />
      )}
      {deleting && (
        <DeleteConfirmDialog
          post={post}
          open
          onClose={() => setDeleting(false)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  )
}
