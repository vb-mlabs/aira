"use client"

// Confirm dialog for deleting a waitlist row. Mirrors the AlertDialog
// shape in features/admin/components/user-detail.tsx (same backdrop +
// popup primitives from @base-ui/react/alert-dialog) so admin
// confirmation flows feel uniform.
//
// The dialog itself doesn't talk to the API — RowActions owns the
// pending/error state and calls onConfirm to invoke apiClient.delete.
// Keeps this component a pure presentational shell.

import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Button } from "@aira/ui-web/button"

interface DeleteWaitlistDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  email: string
  pending: boolean
  onConfirm: () => void
}

export function DeleteWaitlistDialog({
  open,
  onOpenChange,
  email,
  pending,
  onConfirm,
}: DeleteWaitlistDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-[var(--shadow-card-hover)]">
          <AlertDialog.Title className="font-display text-xl text-foreground">
            Delete waitlist entry
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            This permanently removes the row for{" "}
            <code className="font-mono text-foreground">{email}</code>. The
            action is recorded in the audit log.
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onConfirm}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete entry"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
