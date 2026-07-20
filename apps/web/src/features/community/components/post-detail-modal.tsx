"use client"

// User-facing post detail popup.
//
// Opened when the viewer taps a card in /community. Shows the full body,
// status, author + relative time, optional contact (tel:/mailto:), and
// the comment thread. The pinned comment composer at the top of the
// thread is now the primary engagement signal — the older "I'm
// interested" affordance was removed because comments cover the same
// ground with richer expression.

import { Dialog } from "@base-ui/react/dialog"
import { AtSign, Phone, X } from "lucide-react"
import { Avatar } from "@aira/ui-web/avatar"
import type { PostRow } from "../types"
import { CommentThread } from "./comment-thread"

interface PostDetailModalProps {
  post: PostRow
  open: boolean
  onClose: () => void
  /** Current session user id. Drives the Comment-vs-self distinction on
   *  the surrounding card and the comment-thread's per-row delete
   *  affordance. */
  currentUserId: string | null
}

export function PostDetailModal({
  post,
  open,
  onClose,
  currentUserId,
}: PostDetailModalProps) {

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(560px,94vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                size="md"
                src={post.author_image}
                name={post.author_name}
              />
              <div className="min-w-0">
                <Dialog.Title className="text-sm font-bold leading-tight">
                  {post.author_name}
                </Dialog.Title>
                <Dialog.Description
                  className="text-xs text-muted-foreground"
                  suppressHydrationWarning
                >
                  {relativeTime(post.created_at)}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-5">
            <h2 className="font-display text-2xl leading-tight">
              {post.title}
            </h2>

            {post.body && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                {post.body}
              </p>
            )}

            {(post.phone || post.email) && (
              <section
                aria-labelledby="contact-heading"
                className="space-y-1.5 rounded-md border border-border bg-muted/20 px-4 py-3"
              >
                <h3
                  id="contact-heading"
                  className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Contact
                </h3>
                {post.phone && (
                  <a
                    href={`tel:${post.phone}`}
                    className="flex items-center gap-2 text-sm text-foreground hover:text-primary"
                  >
                    <Phone className="size-4 text-muted-foreground" aria-hidden />
                    {post.phone}
                  </a>
                )}
                {post.email && (
                  <a
                    href={`mailto:${post.email}`}
                    className="flex items-center gap-2 text-sm text-foreground hover:text-primary"
                  >
                    <AtSign className="size-4 text-muted-foreground" aria-hidden />
                    {post.email}
                  </a>
                )}
              </section>
            )}

            <CommentThread
              postId={post.id}
              acceptsComments={post.status === "approved"}
              currentUserId={currentUserId}
            />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  const dt = new Date(iso)
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(dt.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${dt.getUTCFullYear()}`
}
