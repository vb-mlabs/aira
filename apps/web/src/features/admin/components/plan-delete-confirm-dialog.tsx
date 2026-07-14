"use client"

// Hard-delete confirm dialog for a membership plan. Sibling of
// PlanDeactivateConfirmDialog — same base-ui AlertDialog primitive
// and useTransition + inline-error pattern. Diverges in copy
// (permanent, cannot be undone) and endpoint (/hard).
//
// Handles the FK-guard race path: if a subscription was created
// between the list fetch and the Delete click, the server responds
// 400 with code `membership_plan.has_subscriptions`; the caught
// ApiError surfaces a specific "refresh and Deactivate" message
// inline instead of closing the dialog.

import { useState, useTransition } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Trash2 } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { apiClient } from "@/lib/api-client"
import type { MembershipPlan } from "@aira/validators/membership-plans"

interface PlanDeleteConfirmDialogProps {
  plan: MembershipPlan
  open: boolean
  onClose: () => void
  onDeleted: () => void
}

export function PlanDeleteConfirmDialog({
  plan,
  open,
  onClose,
  onDeleted,
}: PlanDeleteConfirmDialogProps) {
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
          `/api/v1/admin/membership-plans/${encodeURIComponent(plan.id)}/hard`,
        )
        onDeleted()
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === "membership_plan.has_subscriptions") {
            setError(
              "A subscription was created after this list was loaded. Refresh and Deactivate instead to retire the plan without losing history.",
            )
            return
          }
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
            <Trash2 className="size-5 text-destructive" aria-hidden />
            Delete plan permanently?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              &ldquo;{plan.name}&rdquo;
            </span>{" "}
            will be removed from the database. This cannot be undone. No
            subscriptions currently reference this plan.
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
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
