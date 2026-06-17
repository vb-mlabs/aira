"use client"

// Notify all business owners — two-step modal: compose → confirm + count.
// Submit POSTs /api/v1/admin/businesses/broadcast and surfaces the
// recipient count returned by the broadcast op so admins can tell at a
// glance how many people got the bell row.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { Send, X } from "lucide-react"
import { ApiError } from "@aira/api"
import { apiClient } from "@/lib/api-client"

const TITLE_MAX = 120
const MESSAGE_MAX = 2000

interface BroadcastResponse {
  ok: true
  recipient_count: number
}

export function BusinessBroadcastButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Send className="size-4" aria-hidden />
        Notify all business owners
      </button>
      <BroadcastModal open={open} onOpenChange={setOpen} />
    </>
  )
}

interface BroadcastModalProps {
  open: boolean
  onOpenChange: (next: boolean) => void
}

type Step = "compose" | "confirm" | "sent"

function BroadcastModal({ open, onOpenChange }: BroadcastModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("compose")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [sentCount, setSentCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setStep("compose")
    setTitle("")
    setMessage("")
    setSentCount(null)
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await apiClient.post<BroadcastResponse>(
          "/api/v1/admin/businesses/broadcast",
          { title: title.trim(), message: message.trim() },
        )
        setSentCount(res.recipient_count)
        setStep("sent")
        router.refresh()
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not send broadcast.",
        )
      }
    })
  }

  const titleRemaining = TITLE_MAX - title.length
  const messageRemaining = MESSAGE_MAX - message.length
  const composeValid =
    title.trim().length > 0 && message.trim().length > 0

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(560px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                {step === "sent"
                  ? "Broadcast sent"
                  : step === "confirm"
                    ? "Confirm broadcast"
                    : "Notify all business owners"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {step === "sent"
                  ? "Recipients will see this in their notifications inbox."
                  : step === "confirm"
                    ? "Review the message before it goes out."
                    : "Sends an in-app notification to every linked, non-banned owner."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-6 py-5">
            {step === "compose" && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="broadcast-title"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Title
                  </label>
                  <input
                    id="broadcast-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={TITLE_MAX}
                    placeholder="Short headline (shown in the bell)"
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {titleRemaining} chars left
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="broadcast-message"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Message
                  </label>
                  <textarea
                    id="broadcast-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={MESSAGE_MAX}
                    rows={6}
                    placeholder="What do you want to say?"
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {messageRemaining} chars left
                  </p>
                </div>
              </div>
            )}
            {step === "confirm" && (
              <div className="space-y-4 text-sm">
                <p className="text-foreground">
                  This will send to every linked business owner whose
                  account isn&apos;t banned. The recipient count appears in
                  the next step once the server confirms it.
                </p>
                <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {title.trim()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {message.trim()}
                  </p>
                </div>
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
            )}
            {step === "sent" && sentCount !== null && (
              <div className="space-y-3 text-sm">
                <p className="text-foreground">
                  {sentCount === 0
                    ? "No linked owners to notify yet — your broadcast was logged but no notifications were sent."
                    : `Sent to ${sentCount} business ${sentCount === 1 ? "owner" : "owners"}.`}
                </p>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
            {step === "compose" && (
              <>
                <Dialog.Close className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  onClick={() => setStep("confirm")}
                  disabled={!composeValid}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  Continue
                </button>
              </>
            )}
            {step === "confirm" && (
              <>
                <button
                  type="button"
                  onClick={() => setStep("compose")}
                  disabled={pending}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Send broadcast"}
                </button>
              </>
            )}
            {step === "sent" && (
              <Dialog.Close className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Done
              </Dialog.Close>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
