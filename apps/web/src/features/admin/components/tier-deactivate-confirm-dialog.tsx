"use client"

// Sibling of PlanDeactivateConfirmDialog for sponsorship tiers.
// Copy is tier-specific (sponsorships stay active vs subscriptions
// stay active) but shape and behaviour mirror plan version exactly.

import { useState, useTransition } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { PowerOff } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { apiClient } from "@/lib/api-client"
import type { SponsorshipTier } from "@aira/validators/sponsorship-tiers"

interface TierDeactivateConfirmDialogProps {
  tier: SponsorshipTier
  open: boolean
  onClose: () => void
  onDeactivated: () => void
}

export function TierDeactivateConfirmDialog({
  tier,
  open,
  onClose,
  onDeactivated,
}: TierDeactivateConfirmDialogProps) {
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
          `/api/v1/admin/sponsorship-tiers/${encodeURIComponent(tier.id)}`,
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
            Deactivate tier?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              &ldquo;{tier.name}&rdquo;
            </span>{" "}
            will be marked inactive. Existing sponsorships on this tier stay
            active until they expire; new sponsorships can no longer be
            created against it. Reversible by editing the tier and toggling
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
