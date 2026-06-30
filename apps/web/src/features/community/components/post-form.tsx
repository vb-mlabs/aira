"use client"

// "Post on AIRA" create form. Mounted from the board page as a Dialog.
// Submits to POST /api/v1/community/posts and redirects the author to
// /account/posts?just_posted=1 so they see their new pending row with a
// "Waiting for moderation" banner.
//
// Shares the four field rows with PostEditForm via <PostFields>.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { Plus, X } from "lucide-react"
import { ApiError } from "@aira/api"
import { brand } from "@aira/config"
import { Button } from "@aira/ui-web/button"
import { apiClient } from "@/lib/api-client"
import type { PostRow } from "../types"
import { PostFields } from "./post-fields"

interface PostCreateFormProps {
  /** Optional trigger label; defaults to "Post on <brand>". */
  triggerLabel?: string
}

export function PostCreateForm({
  triggerLabel = `Post on ${brand.name}`,
}: PostCreateFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setTitle("")
    setBody("")
    setPhone("")
    setEmail("")
    setError(null)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError("Please add a short title for your post.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await apiClient.post<{ post: PostRow }>("/api/v1/community/posts", {
          title: trimmedTitle,
          body: body.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        })
        reset()
        setOpen(false)
        // Land on /account/posts so the new pending row is immediately
        // visible — solves the "did my post submit?" gap that prompted
        // this feature.
        router.push("/account/posts?just_posted=1")
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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button
            type="button"
            size="lg"
            className="rounded-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]"
          >
            <Plus aria-hidden />
            {triggerLabel}
          </Button>
        }
      />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(540px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                Post on {brand.name}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Share something with the community — an offer, a request,
                an item, anything. A moderator will review before it goes
                live. You can only have one active post at a time.
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
              idPrefix="community-post"
              title={title}
              body={body}
              phone={phone}
              email={email}
              onTitle={setTitle}
              onBody={setBody}
              onPhone={setPhone}
              onEmail={setEmail}
              autoFocusTitle
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
              <Button
                type="submit"
                disabled={pending || title.trim().length === 0}
                className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]"
              >
                {pending ? "Posting…" : "Post"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Backwards-compat alias — `apps/web/src/app/(app)/community/page.tsx`
// and any other call sites that imported `PostForm` keep working.
export { PostCreateForm as PostForm }
