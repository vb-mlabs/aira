"use client"

// Archive / Restore button for an admin business edit page.
//
// State is derived from business.deleted_at — null → show Archive,
// non-null → show Restore. Click opens an @base-ui/react/alert-dialog
// confirmation; on confirm, POST to the matching admin endpoint and
// refresh the page so the parent picks up the new server state.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Archive, RotateCcw } from "lucide-react"
import { Button } from "@aira/ui-web/button"
import { ApiError } from "@aira/api"
import { apiClient } from "@/lib/api-client"
import type { Business } from "@/features/listings"

interface ArchiveControlProps {
  business: Business
}

export function ArchiveControl({ business }: ArchiveControlProps) {
  const router = useRouter()
  const archived = business.deleted_at !== null
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function confirm() {
    setError(null)
    startTransition(async () => {
      try {
        const endpoint = archived ? "restore" : "archive"
        await apiClient.post(
          `/api/v1/admin/businesses/${business.id}/${endpoint}`,
          { id: business.id },
        )
        setOpen(false)
        router.refresh()
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not complete the action.",
        )
      }
    })
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger
        render={
          <Button
            type="button"
            variant={archived ? "default" : "destructive"}
            size="sm"
          >
            {archived ? (
              <>
                <RotateCcw className="size-4" aria-hidden />
                Restore
              </>
            ) : (
              <>
                <Archive className="size-4" aria-hidden />
                Archive
              </>
            )}
          </Button>
        }
      />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-[var(--shadow-card-hover)]">
          <AlertDialog.Title className="font-display text-xl text-foreground">
            {archived ? "Restore" : "Archive"} {business.name}?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {archived
              ? "Customers will see this business again on the directory."
              : "Customers will stop seeing this business. You can restore it later from the archived list."}
          </AlertDialog.Description>
          {error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close
              render={
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              }
            />
            <Button
              type="button"
              variant={archived ? "default" : "destructive"}
              size="sm"
              onClick={confirm}
              disabled={pending}
            >
              {pending ? "Saving…" : archived ? "Restore" : "Archive"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
