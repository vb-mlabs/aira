"use client"

// Read-only summary modal for a single membership plan. Opens from
// the row-click in PlanList; hosts Edit + Deactivate footer buttons.
//
// Edit navigates to /admin/settings/membership-plans/:id — the
// existing intercept-routed AdminFormModal opens on top and hosts
// PlanForm. Keeps the edit URL deep-linkable.
//
// Deactivate opens a nested PlanDeactivateConfirmDialog; on confirm
// success, closes both modals + router.refresh() so the row's Status
// badge flips from Active to Inactive as direct visible feedback (no
// toast — web app deliberately avoids toast primitives).

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { Button } from "@aira/ui-web/button"
import { AdminBadge } from "../index"
import { PlanDeactivateConfirmDialog } from "./plan-deactivate-confirm-dialog"
import type { MembershipPlan } from "@aira/validators/membership-plans"

interface PlanDetailsModalProps {
  plan: MembershipPlan | null
  onClose: () => void
}

export function PlanDetailsModal({ plan, onClose }: PlanDetailsModalProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  function handleEdit() {
    if (!plan) return
    // Close details first so the intercept-routed edit modal opens
    // cleanly on top; avoids the double-modal-in-flight micro-glitch
    // some browsers show when two open Dialogs race.
    onClose()
    router.push(`/admin/settings/membership-plans/${plan.id}`)
  }

  function handleDeactivated() {
    setConfirmOpen(false)
    onClose()
    router.refresh()
  }

  const open = plan !== null

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(500px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
            {plan && (
              <>
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
                  <div>
                    <Dialog.Title className="font-display text-xl text-foreground">
                      {plan.name}
                    </Dialog.Title>
                    <div className="mt-1.5">
                      <AdminBadge
                        variant={plan.active ? "active" : "inactive"}
                        label={plan.active ? "Active" : "Inactive"}
                      />
                    </div>
                  </div>
                  <Dialog.Close
                    className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label="Close"
                  >
                    <X className="size-4" aria-hidden />
                  </Dialog.Close>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                  <dl className="space-y-4 text-sm">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Description
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {plan.description ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Price
                        </dt>
                        <dd className="mt-1 tabular-nums text-foreground">
                          ${(plan.price_cents / 100).toFixed(2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Duration
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {plan.duration_months}{" "}
                          {plan.duration_months === 1 ? "month" : "months"}
                        </dd>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          City
                        </dt>
                        <dd className="mt-1 tabular-nums text-foreground">
                          {plan.city_id}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Updated
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {new Date(plan.updated_at).toLocaleDateString()}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
                  {plan.active && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmOpen(true)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      Deactivate
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleEdit}
                  >
                    Edit
                  </Button>
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {plan && (
        <PlanDeactivateConfirmDialog
          plan={plan}
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onDeactivated={handleDeactivated}
        />
      )}
    </>
  )
}
