"use client"

// Author-side edit form for a community post. Drawn as a controlled
// Dialog by the parent (typically <MyPostsList>). Submits PATCH to
// /api/v1/community/posts/[id] and calls onSaved with the refreshed
// AdminPostRow. When the source row is approved, a yellow banner
// surfaces that saving will send the post back for re-moderation.

import { useMemo, useState, useTransition } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { apiClient } from "@/lib/api-client"
import type { AdminPostRow } from "@aira/validators/community"
import { PostFields } from "./post-fields"

interface PostEditFormProps {
  post: AdminPostRow
  open: boolean
  onClose: () => void
  onSaved: (post: AdminPostRow) => void
}

export function PostEditForm({
  post,
  open,
  onClose,
  onSaved,
}: PostEditFormProps) {
  const [title, setTitle] = useState(post.title)
  const [body, setBody] = useState(post.body ?? "")
  const [phone, setPhone] = useState(post.phone ?? "")
  const [email, setEmail] = useState(post.email ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // MyPostsList only mounts this form when a row is being edited (and
  // unmounts it on close), so useState defaults capture the right
  // initial values without an effect-driven reset. Switching rows
  // unmounts/remounts the component because the conditional render
  // toggles on `editing`.

  const titleChanged = title.trim() !== post.title.trim()
  const bodyChanged = useMemo(() => {
    const next = body.trim().length === 0 ? null : body.trim()
    return next !== (post.body ?? null)
  }, [body, post.body])
  const phoneChanged = useMemo(() => {
    const next = phone.trim().length === 0 ? null : phone.trim()
    return next !== (post.phone ?? null)
  }, [phone, post.phone])
  const emailChanged = useMemo(() => {
    const next = email.trim().length === 0 ? null : email.trim()
    return next !== (post.email ?? null)
  }, [email, post.email])

  const canSave =
    !pending &&
    title.trim().length > 0 &&
    (titleChanged || bodyChanged || phoneChanged || emailChanged)

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setError(null)

    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()
    const trimmedPhone = phone.trim()
    const trimmedEmail = email.trim()
    const update: {
      id: string
      title?: string
      body?: string | null
      phone?: string | null
      email?: string | null
    } = { id: post.id }
    if (titleChanged) update.title = trimmedTitle
    if (bodyChanged) update.body = trimmedBody.length === 0 ? null : trimmedBody
    if (phoneChanged)
      update.phone = trimmedPhone.length === 0 ? null : trimmedPhone
    if (emailChanged)
      update.email = trimmedEmail.length === 0 ? null : trimmedEmail

    startTransition(async () => {
      try {
        const res = await apiClient.patch<{ post: AdminPostRow }>(
          `/api/v1/community/posts/${encodeURIComponent(post.id)}`,
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

  const isApproved = post.status === "approved"

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(540px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                Edit your post
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Update the title, description, or contact details.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="space-y-5 overflow-y-auto px-6 py-5"
          >
            <PostFields
              idPrefix={`edit-${post.id}`}
              title={title}
              body={body}
              phone={phone}
              email={email}
              onTitle={setTitle}
              onBody={setBody}
              onPhone={setPhone}
              onEmail={setEmail}
              showApprovedWarning={isApproved}
            />

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
