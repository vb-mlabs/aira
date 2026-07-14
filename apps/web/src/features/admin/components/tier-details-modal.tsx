"use client"

// Read-only summary modal for a single sponsorship tier. Opens from
// the row-click in TierList; hosts Deactivate | Delete | Edit footer
// buttons (order matches PlanDetailsModal).
//
// Edit navigates to /admin/settings/sponsorship-tiers/:id — existing
// intercept-routed AdminFormModal opens on top and hosts TierForm.
// Preserves deep-link URL for the edit surface.
//
// Deactivate opens TierDeactivateConfirmDialog; Delete opens
// TierDeleteConfirmDialog. On success from either: close both modals +
// router.refresh() so the row's Status badge flips (Deactivate) or the
// row disappears (Delete). No toast — web app deliberately avoids
// toast primitives; visible state change is the acknowledgment.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { Button } from "@aira/ui-web/button"
import { AdminBadge } from "../index"
import { TierDeactivateConfirmDialog } from "./tier-deactivate-confirm-dialog"
import { TierDeleteConfirmDialog } from "./tier-delete-confirm-dialog"
import {
  DISPLAY_SLOT_LABELS,
  type SponsorshipTierListItem,
} from "@aira/validators/sponsorship-tiers"

interface TierDetailsModalProps {
  // SponsorshipTierListItem (extends base with sponsorship_count) —
  // needed to decide whether the Delete button renders.
  tier: SponsorshipTierListItem | null
  onClose: () => void
}

export function TierDetailsModal({ tier, onClose }: TierDetailsModalProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  function handleEdit() {
    if (!tier) return
    onClose()
    router.push(`/admin/settings/sponsorship-tiers/${tier.id}`)
  }

  function handleDeactivated() {
    setConfirmOpen(false)
    onClose()
    router.refresh()
  }

  function handleDeleted() {
    setDeleteOpen(false)
    onClose()
    router.refresh()
  }

  const open = tier !== null

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(500px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
            {tier && (
              <>
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
                  <div>
                    <Dialog.Title className="font-display text-xl text-foreground">
                      {tier.name}
                    </Dialog.Title>
                    <div className="mt-1.5">
                      <AdminBadge
                        variant={tier.active ? "active" : "inactive"}
                        label={tier.active ? "Active" : "Inactive"}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Priority
                        </dt>
                        <dd className="mt-1 tabular-nums text-foreground">
                          {tier.priority}
                          <span className="ml-2 text-xs text-muted-foreground">
                            (lower = better placement)
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Slot
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {DISPLAY_SLOT_LABELS[tier.display_slot]}
                        </dd>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          City
                        </dt>
                        <dd className="mt-1 tabular-nums text-foreground">
                          {tier.city_id}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Updated
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {new Date(tier.updated_at).toLocaleDateString()}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>

                {/* Footer button order: Deactivate | Delete | Edit.
                    Deactivate hidden when tier.active === false;
                    Delete hidden when tier.sponsorship_count > 0. */}
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
                  {tier.active && (
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
                  {tier.sponsorship_count === 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteOpen(true)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      Delete
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

      {tier && (
        <>
          <TierDeactivateConfirmDialog
            tier={tier}
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onDeactivated={handleDeactivated}
          />
          <TierDeleteConfirmDialog
            tier={tier}
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onDeleted={handleDeleted}
          />
        </>
      )}
    </>
  )
}
