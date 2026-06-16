"use client"

// "Ask the community" form. Mounted from the board page as a Dialog when
// the user taps "Ask the community". Submits to POST
// /api/v1/community/posts. Surfaces the 1-active-post limit error (409)
// inline so the user understands why their submit was rejected.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { Plus, X } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"
import type { PostRow } from "../types"

const TITLE_MAX = 120
const BODY_MAX = 1000

interface PostFormProps {
  /** Optional trigger label; defaults to "Ask the community". */
  triggerLabel?: string
}

export function PostForm({ triggerLabel = "Ask the community" }: PostFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setTitle("")
    setBody("")
    setError(null)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError("Please add a short title for your request.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await apiClient.post<{ post: PostRow }>("/api/v1/community/posts", {
          title: trimmedTitle,
          body: body.trim() || undefined,
        })
        reset()
        setOpen(false)
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
                Ask the community
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                A moderator will review your request before it goes live.
                You can only have one active request at a time.
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
              <Label htmlFor="community-post-title">What do you need?</Label>
              <Input
                id="community-post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TITLE_MAX}
                placeholder="Looking for a pediatrician near Alpharetta…"
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                {title.length} / {TITLE_MAX}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="community-post-body">Any extra context? (optional)</Label>
              <textarea
                id="community-post-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={BODY_MAX}
                rows={4}
                className={cn(
                  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
                )}
                placeholder="Aetna PPO, weekend availability, anywhere within 20 minutes…"
              />
              <p className="text-xs text-muted-foreground">
                {body.length} / {BODY_MAX}
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
              <Button
                type="submit"
                disabled={pending || title.trim().length === 0}
                className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]"
              >
                {pending ? "Posting…" : "Post request"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
