"use client"

// F20 v2 — full-detail popup shown when admin clicks a post row.
//
// Shows author, dates, full body, rejected reason, and the respondent
// list (admin variant — every name + note). For pending posts the
// footer surfaces Approve + Reject controls with INLINE confirmations
// so the whole moderation flow stays inside this one modal.
//
// Edit + Delete live on the table row itself; the modal stays focused
// on "read everything, then approve or reject."

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { AtSign, Check, MessageSquare, Phone, X } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"
import type {
  AdminPostRow,
  InterestRow,
} from "@aira/validators/community"
import { CommentModeration } from "./comment-moderation"

interface PostDetailModalProps {
  post: AdminPostRow
  open: boolean
  onClose: () => void
  onModerated: (post: AdminPostRow) => void
}

interface ModerateResponse {
  post: AdminPostRow
}

type ConfirmStage = "idle" | "confirm-approve" | "confirm-reject"

export function PostDetailModal({
  post,
  open,
  onClose,
  onModerated,
}: PostDetailModalProps) {
  const router = useRouter()
  const [interests, setInterests] = useState<InterestRow[] | null>(null)
  const [interestsError, setInterestsError] = useState<string | null>(null)
  const [stage, setStage] = useState<ConfirmStage>("idle")
  const [rejectReason, setRejectReason] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Lazy-fetch respondents when the modal opens; refetches if the admin
  // closes + reopens to keep state fresh after a backend mutation.
  useEffect(() => {
    if (!open) return
    setInterestsError(null)
    let cancelled = false
    void (async () => {
      try {
        const res = await apiClient.get<{ items: InterestRow[] }>(
          `/api/v1/admin/community/posts/${encodeURIComponent(post.id)}/interests`,
        )
        if (!cancelled) setInterests(res.data?.items ?? [])
      } catch (err) {
        if (!cancelled) {
          setInterestsError(
            err instanceof ApiError
              ? err.message
              : "Couldn't load respondents.",
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, post.id])

  function handleOpenChange(next: boolean) {
    if (!next) {
      setStage("idle")
      setRejectReason("")
      setActionError(null)
      onClose()
    }
  }

  function moderate(action: "approve" | "reject", reason?: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        const res = await apiClient.patch<ModerateResponse>(
          `/api/v1/admin/community/posts/${encodeURIComponent(post.id)}`,
          {
            id: post.id,
            action,
            ...(reason ? { rejected_reason: reason } : {}),
          },
        )
        onModerated(res.post)
        setStage("idle")
        setRejectReason("")
        router.refresh()
      } catch (err) {
        if (err instanceof ApiError) {
          setActionError(err.message)
          return
        }
        throw err
      }
    })
  }

  const isPending = post.status === "pending"

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(640px,94vw)] max-h-[92svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-lg text-foreground">
                Post
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                Submitted {formatDateTime(post.created_at)} ·{" "}
                {statusSentence(post.status)}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <header>
              <p className="text-sm font-bold">{post.author_name}</p>
              {post.author_email && (
                <p className="text-xs text-muted-foreground">{post.author_email}</p>
              )}
            </header>

            <h2 className="font-display text-2xl leading-tight">{post.title}</h2>

            {post.body && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                {post.body}
              </p>
            )}

            {(post.phone || post.email) && (
              <section
                aria-labelledby="admin-contact-heading"
                className="space-y-1.5 rounded-md border border-border bg-muted/20 px-4 py-3"
              >
                <h3
                  id="admin-contact-heading"
                  className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
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

            {post.rejected_reason && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-foreground">
                <span className="font-medium">Rejected reason: </span>
                {post.rejected_reason}
              </p>
            )}

            <dl className="grid grid-cols-2 gap-3 rounded-md bg-background/40 px-4 py-3 text-xs sm:grid-cols-4">
              <Cell label="Status" value={post.status} />
              <Cell
                label="Expires"
                value={post.expires_at ? formatDate(post.expires_at) : "—"}
              />
              <Cell label="Interested" value={String(post.interest_count)} />
              <Cell
                label="Approved"
                value={post.approved_at ? formatDate(post.approved_at) : "—"}
              />
            </dl>

            <section>
              <header className="flex items-center gap-2">
                <MessageSquare
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                <h3 className="font-display text-base">
                  {interests === null
                    ? "Loading respondents…"
                    : interests.length === 0
                      ? "No one has offered to help yet"
                      : interests.length === 1
                        ? "1 neighbour offered to help"
                        : `${interests.length} neighbours offered to help`}
                </h3>
              </header>

              {interestsError && (
                <p
                  role="alert"
                  className="mt-2 text-xs text-destructive"
                >
                  {interestsError}
                </p>
              )}

              {interests !== null && interests.length > 0 && (
                <ul className="mt-3 space-y-2.5">
                  {interests.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-md bg-background/40 px-3 py-2"
                    >
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-bold leading-tight">
                          {r.responder_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          · {formatDateTime(r.created_at)}
                        </p>
                      </div>
                      {r.message ? (
                        <p className="mt-1 text-sm leading-relaxed">
                          {r.message}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          No note attached.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <CommentModeration postId={post.id} />
          </div>

          {isPending && (
            <div className="shrink-0 border-t border-border bg-muted/20 px-6 py-4">
              {actionError && (
                <p
                  role="alert"
                  className="mb-2 text-sm text-destructive"
                >
                  {actionError}
                </p>
              )}

              {stage === "idle" && (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStage("confirm-reject")}
                  >
                    <X aria-hidden />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setStage("confirm-approve")}
                    className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]"
                  >
                    <Check aria-hidden />
                    Approve
                  </Button>
                </div>
              )}

              {stage === "confirm-approve" && (
                <div className="space-y-2">
                  <p className="text-sm">
                    Approve <span className="font-medium">&ldquo;{post.title}&rdquo;</span>?
                    It will go live on the community board and start its expiry
                    window.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStage("idle")}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => moderate("approve")}
                      disabled={pending}
                      className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]"
                    >
                      <Check aria-hidden />
                      {pending ? "Approving…" : "Confirm approve"}
                    </Button>
                  </div>
                </div>
              )}

              {stage === "confirm-reject" && (
                <div className="space-y-2">
                  <Label htmlFor="reject-reason" className="text-xs">
                    Note for the author (optional)
                  </Label>
                  <textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    maxLength={500}
                    className={cn(
                      "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs",
                      "placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
                    )}
                    placeholder="Tone is too commercial; please soften the language before resubmitting."
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStage("idle")
                        setRejectReason("")
                      }}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        moderate("reject", rejectReason.trim() || undefined)
                      }
                      disabled={pending}
                    >
                      <X aria-hidden />
                      {pending ? "Rejecting…" : "Confirm reject"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  )
}

function statusSentence(status: string): string {
  switch (status) {
    case "pending":
      return "awaiting moderation"
    case "approved":
      return "live on the board"
    case "expired":
      return "past expiry"
    case "rejected":
      return "rejected"
    default:
      return status
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${d.getUTCFullYear()}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const min = String(d.getUTCMinutes()).padStart(2, "0")
  return `${mm}/${dd}/${d.getUTCFullYear()} ${hh}:${min} UTC`
}
