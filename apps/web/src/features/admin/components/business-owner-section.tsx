"use client"

// Owner section on /admin/businesses/[id]. Shows the current owner (name +
// email, link to user-detail) or an empty state with an "Assign owner"
// button. Assign opens a picker modal; pick → confirm → submit. Unassign
// is a one-step confirm dialog.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { ArrowRight, X } from "lucide-react"
import Link from "next/link"
import { ApiError } from "@aira/api"
import type { BusinessOwner } from "@aira/validators/businesses"
import { apiClient } from "@/lib/api-client"
import { BusinessOwnerPicker, type PickedUser } from "./business-owner-picker"

type Feedback = { kind: "ok" | "error"; message: string } | null

interface BusinessOwnerSectionProps {
  businessId: string
  businessName: string
  owner: BusinessOwner | null
}

export function BusinessOwnerSection({
  businessId,
  businessName,
  owner,
}: BusinessOwnerSectionProps) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [unassignOpen, setUnassignOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base text-foreground">Owner</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The user who can receive owner-targeted notifications for this
            listing.
          </p>
        </div>
        {owner ? (
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Change
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Assign owner
          </button>
        )}
      </header>

      <div className="mt-4">
        {owner ? (
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/admin/users/${owner.id}`}
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
            >
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground"
              >
                {(owner.name || owner.email)[0]?.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {owner.name || "(no name)"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {owner.email}
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                aria-hidden
              />
            </Link>
            <button
              type="button"
              onClick={() => setUnassignOpen(true)}
              className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
            No owner linked yet.
          </p>
        )}
      </div>

      {feedback && (
        <p
          className={
            feedback.kind === "ok"
              ? "mt-3 text-xs text-success"
              : "mt-3 text-xs text-destructive"
          }
        >
          {feedback.message}
        </p>
      )}

      <AssignOwnerDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        businessId={businessId}
        businessName={businessName}
        currentOwnerId={owner?.id ?? null}
        onSuccess={(msg) => {
          setAssignOpen(false)
          setFeedback({ kind: "ok", message: msg })
        }}
        onError={(msg) =>
          setFeedback({ kind: "error", message: msg })
        }
      />
      <UnassignOwnerDialog
        open={unassignOpen}
        onClose={() => setUnassignOpen(false)}
        businessId={businessId}
        businessName={businessName}
        ownerName={owner?.name || owner?.email || ""}
        onSuccess={(msg) => {
          setUnassignOpen(false)
          setFeedback({ kind: "ok", message: msg })
        }}
        onError={(msg) =>
          setFeedback({ kind: "error", message: msg })
        }
      />
    </section>
  )
}

interface AssignOwnerDialogProps {
  open: boolean
  onClose: () => void
  businessId: string
  businessName: string
  currentOwnerId: string | null
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

function AssignOwnerDialog({
  open,
  onClose,
  businessId,
  businessName,
  currentOwnerId,
  onSuccess,
  onError,
}: AssignOwnerDialogProps) {
  const router = useRouter()
  const [picked, setPicked] = useState<PickedUser | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPicked(null)
      onClose()
    }
  }

  function submit() {
    if (!picked) return
    startTransition(async () => {
      try {
        await apiClient.post(
          `/api/v1/admin/businesses/${encodeURIComponent(businessId)}/owner`,
          { id: businessId, owner_user_id: picked.id },
        )
        const label = picked.name || picked.email
        onSuccess(`Assigned ${label} as owner.`)
        setPicked(null)
        router.refresh()
      } catch (err) {
        onError(
          err instanceof ApiError
            ? err.message
            : "Could not assign owner.",
        )
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(500px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                {picked ? "Confirm owner assignment" : "Assign owner"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {picked
                  ? `Linking a user as owner emails them a notification.`
                  : `Pick a user account to link to ${businessName}.`}
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
            {!picked ? (
              <BusinessOwnerPicker
                excludeUserId={currentOwnerId}
                onPick={setPicked}
              />
            ) : (
              <div className="space-y-4 text-sm">
                <p className="text-foreground">
                  Assign{" "}
                  <span className="font-semibold">
                    {picked.name || "(no name)"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    ({picked.email})
                  </span>{" "}
                  as the owner of{" "}
                  <span className="font-semibold">{businessName}</span>?
                </p>
                {picked.banned && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    Heads up: this user is banned. They&apos;ll still be
                    linked but won&apos;t receive in-app notifications until
                    unbanned.
                  </p>
                )}
                {currentOwnerId && (
                  <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
                    This replaces the current owner. The previous owner
                    keeps their account but won&apos;t receive
                    owner-targeted notifications for this listing.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
            {picked ? (
              <>
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  disabled={pending}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {pending ? "Assigning…" : "Confirm assignment"}
                </button>
              </>
            ) : (
              <Dialog.Close className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </Dialog.Close>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface UnassignOwnerDialogProps {
  open: boolean
  onClose: () => void
  businessId: string
  businessName: string
  ownerName: string
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

function UnassignOwnerDialog({
  open,
  onClose,
  businessId,
  businessName,
  ownerName,
  onSuccess,
  onError,
}: UnassignOwnerDialogProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      try {
        await apiClient.delete(
          `/api/v1/admin/businesses/${encodeURIComponent(businessId)}/owner`,
        )
        onSuccess(`Removed ${ownerName} as owner.`)
        router.refresh()
      } catch (err) {
        onError(
          err instanceof ApiError
            ? err.message
            : "Could not remove owner.",
        )
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={(n) => !n && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <Dialog.Title className="font-display text-xl text-foreground">
              Remove owner?
            </Dialog.Title>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="px-6 py-5 text-sm text-foreground">
            <p>
              Remove <span className="font-semibold">{ownerName}</span> as
              the owner of{" "}
              <span className="font-semibold">{businessName}</span>?
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              They&apos;ll keep their account but won&apos;t receive
              owner-targeted notifications for this listing. No email is
              sent.
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <Dialog.Close
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </Dialog.Close>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
            >
              {pending ? "Removing…" : "Remove owner"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
