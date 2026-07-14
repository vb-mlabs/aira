"use client"

// Confirm dialog for the soft-delete (deactivate) action on a membership
// plan. Modeled after the community DeleteConfirmDialog — same base-ui
// AlertDialog primitive, same useTransition + inline-error pattern.
// Not extracted into a shared ConfirmDialog yet: the second consumer is
// still bespoke enough (plan-shape props, explicit reversible-semantic
// copy) that a preemptive extraction would over-generalize.

import { useState, useTransition } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { PowerOff } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { apiClient } from "@/lib/api-client"
import type { MembershipPlan } from "@aira/validators/membership-plans"

interface PlanDeactivateConfirmDialogProps {
  plan: MembershipPlan
  open: boolean
  onClose: () => void
  onDeactivated: () => void
}

export function PlanDeactivateConfirmDialog({
  plan,
  open,
  onClose,
  onDeactivated,
}: PlanDeactivateConfirmDialogProps) {
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
          `/api/v1/admin/membership-plans/${encodeURIComponent(plan.id)}`,
        )
        onDeactivated()
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
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(460px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-[var(--shadow-card-hover)]">
          <AlertDialog.Title className="flex items-center gap-2 font-display text-xl text-foreground">
            <PowerOff className="size-5 text-destructive" aria-hidden />
            Deactivate plan?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              &ldquo;{plan.name}&rdquo;
            </span>{" "}
            will be marked inactive. Existing subscriptions on this plan stay
            active until they expire; new subscriptions can no longer be
            created against it. Reversible by editing the plan and toggling
            Active back on.
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
              variant="destructive"
              size="sm"
              onClick={confirm}
              disabled={pending}
            >
              {pending ? "Deactivating…" : "Deactivate"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
